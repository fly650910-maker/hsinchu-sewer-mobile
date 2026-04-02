import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import proj4 from 'proj4';

export const dynamic = 'force-dynamic';

// EPSG:3826 = TWD97 / TM2 zone 121
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');

function twd97ToWgs84(x: number, y: number): [number, number] {
  const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [x, y]);
  return [lat, lng]; // Leaflet uses [lat, lng]
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const systemType = params.get('system_type') || '污水';

  // Bounding box in WGS84 degrees (from Leaflet map bounds)
  const minLat = parseFloat(params.get('min_lat') || '24.6');
  const maxLat = parseFloat(params.get('max_lat') || '25.0');
  const minLng = parseFloat(params.get('min_lng') || '120.8');
  const maxLng = parseFloat(params.get('max_lng') || '121.2');

  // Convert WGS84 bbox to TWD97 for point queries
  const [tlX, tlY] = proj4('EPSG:4326', 'EPSG:3826', [minLng, minLat]);
  const [brX, brY] = proj4('EPSG:4326', 'EPSG:3826', [maxLng, maxLat]);
  const xMin = Math.min(tlX, brX);
  const xMax = Math.max(tlX, brX);
  const yMin = Math.min(tlY, brY);
  const yMax = Math.max(tlY, brY);

  try {
    const db = await getDb();

    // ── Manholes ────────────────────────────────────────────────
    const manholes = await db.all(
      `SELECT COALESCE(id, rowid) as id, manhole_no, x, y, manhole_type,
              location, depth, project_name, area, system_type, source
       FROM manholes_unique
       WHERE x BETWEEN ? AND ? AND y BETWEEN ? AND ?
         AND system_type = ?
       GROUP BY x, y, manhole_no
       LIMIT 3000`,
      [xMin, xMax, yMin, yMax, systemType]
    );

    const manholeFeatures = manholes.map((m: any) => {
      const [lat, lng] = twd97ToWgs84(m.x, m.y);
      return {
        id: m.id,
        manhole_no: m.manhole_no,
        lat,
        lng,
        manhole_type: m.manhole_type,
        location: m.location,
        depth: m.depth,
        project_name: m.project_name,
        area: m.area,
        system_type: m.system_type,
        source: m.source || '',
      };
    });

    // ── Pipelines ───────────────────────────────────────────────
    let pipelineFeatures: any[] = [];
    try {
      // ① 新式：直接用 wgs84_coords + bbox 欄位查詢（國土署 Shapefile 資料）
      const pipelinesNew = await db.all(
        `SELECT COALESCE(id, rowid) as id, sewer_no, upstream_node, downstream_node,
                pipe_type, material, diameter, length, slope, area,
                project_name, system_type, source, wgs84_coords
         FROM pipelines_unique
         WHERE wgs84_coords IS NOT NULL AND wgs84_coords != ''
           AND system_type = ?
           AND bbox_min_lat BETWEEN ? AND ?
           AND bbox_min_lng BETWEEN ? AND ?
         LIMIT 4000`,
        [systemType, minLat - 0.01, maxLat + 0.01, minLng - 0.01, maxLng + 0.01]
      );

      for (const p of pipelinesNew) {
        let coords: [number, number][] = [];
        try { coords = JSON.parse(p.wgs84_coords); } catch {}
        if (coords.length < 2) continue;
        pipelineFeatures.push({
          id: p.id,
          sewer_no: p.sewer_no,
          upstream_node: p.upstream_node,
          downstream_node: p.downstream_node,
          pipe_type: p.pipe_type,
          material: p.material,
          diameter: p.diameter,
          length: p.length,
          slope: p.slope,
          area: p.area,
          project_name: p.project_name,
          system_type: p.system_type,
          source: p.source,
          coords,
        });
      }

      // ② 舊式：JOIN 人孔座標（雨水等尚未更新的資料保持可用）
      if (pipelinesNew.length === 0) {
        const pipelinesLegacy = await db.all(
          `SELECT MIN(p.id) as id, MIN(p.sewer_no) as sewer_no,
                  p.upstream_node, p.downstream_node,
                  MIN(p.pipe_type) as pipe_type, MIN(p.material) as material,
                  MIN(p.diameter) as diameter, MIN(p.length) as length,
                  MIN(p.slope) as slope, MIN(p.area) as area,
                  p.project_name, p.system_type,
                  m1.x as up_x, m1.y as up_y,
                  m2.x as dn_x, m2.y as dn_y
           FROM pipelines_unique p
           JOIN manholes_unique m1 ON p.upstream_node = m1.manhole_no
                                   AND p.system_type = m1.system_type
           JOIN manholes_unique m2 ON p.downstream_node = m2.manhole_no
                                   AND p.system_type = m2.system_type
           WHERE (p.wgs84_coords IS NULL OR p.wgs84_coords = '')
             AND m1.x BETWEEN ? AND ? AND m1.y BETWEEN ? AND ?
             AND m1.x BETWEEN 100000 AND 400000 AND m1.y BETWEEN 2000000 AND 3000000
             AND m2.x BETWEEN 100000 AND 400000 AND m2.y BETWEEN 2000000 AND 3000000
             AND p.system_type = ?
           GROUP BY p.upstream_node, p.downstream_node, p.system_type
           LIMIT 3000`,
          [xMin, xMax, yMin, yMax, systemType]
        );

        for (const p of pipelinesLegacy) {
          const [upLat, upLng] = twd97ToWgs84(p.up_x, p.up_y);
          const [dnLat, dnLng] = twd97ToWgs84(p.dn_x, p.dn_y);
          pipelineFeatures.push({
            id: p.id,
            sewer_no: p.sewer_no,
            upstream_node: p.upstream_node,
            downstream_node: p.downstream_node,
            pipe_type: p.pipe_type,
            material: p.material,
            diameter: p.diameter,
            length: p.length,
            slope: p.slope,
            area: p.area,
            project_name: p.project_name,
            system_type: p.system_type,
            source: 'legacy',
            coords: [[upLat, upLng], [dnLat, dnLng]],
          });
        }
      }
    } catch (pipelineErr) {
      console.error('GIS pipeline query error (non-fatal):', pipelineErr);
    }

    return NextResponse.json({
      manholes: manholeFeatures,
      pipelines: pipelineFeatures,
    });
  } catch (error) {
    console.error('GIS map-data error:', error);
    return NextResponse.json({ error: 'Failed to load map data', details: String(error) }, { status: 500 });
  }
}
