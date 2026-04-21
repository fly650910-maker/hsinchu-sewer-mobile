import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import proj4 from 'proj4';

// Define TWD97 coordinate system
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius') || '150'; // default 150 meters

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: 'Missing lat or lng' }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radius = parseFloat(radiusStr);

    // Convert WGS84 (lng, lat) to TWD97 (x, y)
    // Note: proj4 expects [longitude, latitude]
    const [twd97X, twd97Y] = proj4('EPSG:4326', 'EPSG:3826', [lng, lat]);

    const db = await getDb();

    // Query manholes within bounding box
    const minX = twd97X - radius;
    const maxX = twd97X + radius;
    const minY = twd97Y - radius;
    const maxY = twd97Y + radius;

    // We can fetch both 污水 and 雨水 and let the frontend color them differently
    const rows = await db.all(
      `SELECT * FROM manholes WHERE x BETWEEN ? AND ? AND y BETWEEN ? AND ?`,
      [minX, maxX, minY, maxY]
    );

    // Filter by true distance (circle) and convert their coordinates back to WGS84 for the map
    const results = rows.map((row: any) => {
      const dbX = row.x;
      const dbY = row.y;
      const distance = Math.sqrt(Math.pow(dbX - twd97X, 2) + Math.pow(dbY - twd97Y, 2));
      
      const [wgs84Lng, wgs84Lat] = proj4('EPSG:3826', 'EPSG:4326', [dbX, dbY]);
      
      return {
        ...row,
        distance,
        lat: wgs84Lat,
        lng: wgs84Lng
      };
    }).filter((row: any) => row.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance);

    // Find nearby pipelines by joining upstream/downstream manholes
    // This is an approximation: if any attached manhole is within radius, include the pipeline
    // Find nearby pipelines using UNION for much faster index lookups
    const pipelineRows = await db.all(
      `SELECT p.*,
        u.x as u_x, u.y as u_y,
        d.x as d_x, d.y as d_y
       FROM pipelines p
       JOIN manholes_unique u ON p.upstream_node = u.manhole_no AND p.system_type = u.system_type AND p.project_name = u.project_name
       JOIN manholes_unique d ON p.downstream_node = d.manhole_no AND p.system_type = d.system_type AND p.project_name = d.project_name
       WHERE u.x BETWEEN ? AND ? AND u.y BETWEEN ? AND ?
       UNION
       SELECT p.*,
        u.x as u_x, u.y as u_y,
        d.x as d_x, d.y as d_y
       FROM pipelines p
       JOIN manholes_unique u ON p.upstream_node = u.manhole_no AND p.system_type = u.system_type AND p.project_name = u.project_name
       JOIN manholes_unique d ON p.downstream_node = d.manhole_no AND p.system_type = d.system_type AND p.project_name = d.project_name
       WHERE d.x BETWEEN ? AND ? AND d.y BETWEEN ? AND ?`,
      [minX, maxX, minY, maxY, minX, maxX, minY, maxY]
    );

    const pipelines = pipelineRows.map((row: any) => {
      const coords = [];
      if (row.u_x && row.u_y) {
        const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [row.u_x, row.u_y]);
        coords.push([lat, lng]);
      }
      if (row.d_x && row.d_y) {
        const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [row.d_x, row.d_y]);
        coords.push([lat, lng]);
      }
      return { ...row, coords };
    }).filter((row: any) => row.coords.length === 2);

    const uniquePipelines = Array.from(new Map(pipelines.map((p: any) => [p.id, p])).values());

    return NextResponse.json({
      target: { lat, lng, twd97X, twd97Y },
      radius,
      manholes: results,
      pipelines: uniquePipelines
    });

  } catch (error) {
    console.error('Failed to query nearby manholes:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
