import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import proj4 from 'proj4'

export const dynamic = 'force-dynamic'

proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs')

function twd97ToWgs84(x: number, y: number): [number, number] {
  const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [x, y])
  return [lat, lng]
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const minLat = parseFloat(params.get('min_lat') || '24.6')
  const maxLat = parseFloat(params.get('max_lat') || '25.0')
  const minLng = parseFloat(params.get('min_lng') || '120.8')
  const maxLng = parseFloat(params.get('max_lng') || '121.2')

  try {
    const db = await getDb()

    const tableCheck = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pipeline_conditions'"
    ) as any
    if (!tableCheck) return NextResponse.json({ conditions: [], total: 0 })

    // Check if pipeline_conditions has lat/lng columns (direct coords approach)
    const colCheck = await db.all("PRAGMA table_info(pipeline_conditions)") as any[]
    const hasLatLng = colCheck.some((c: any) => c.name === 'lat')

    let features: any[] = []

    if (hasLatLng) {
      // 直接使用 lat/lng（縱走資料匯入方式）
      const rows = await db.all(`
        SELECT id, p_no, town, road_name, max_grade,
               has_damage, has_sedimentation, has_crossing,
               has_cable, has_other, cannot_survey, issue_count,
               issues_json, lat, lng, lat2, lng2
        FROM pipeline_conditions
        WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
        ORDER BY max_grade DESC
        LIMIT 2000
      `, [minLat, maxLat, minLng, maxLng]) as any[]

      features = rows.map((r: any) => ({
        id: r.id,
        p_no: r.p_no,
        town: r.town,
        road_name: r.road_name || '',
        max_grade: r.max_grade,
        has_damage: r.has_damage === 1,
        has_sedimentation: r.has_sedimentation === 1,
        has_crossing: r.has_crossing === 1,
        has_cable: r.has_cable === 1,
        has_other: r.has_other === 1,
        cannot_survey: r.cannot_survey === 1,
        issue_count: r.issue_count,
        issues: r.issues_json ? JSON.parse(r.issues_json) : [],
        coords: (r.lat2 && r.lng2)
          ? [[r.lat, r.lng], [r.lat2, r.lng2]] as [[number,number],[number,number]]
          : [[r.lat, r.lng], [r.lat + 0.0001, r.lng + 0.0001]] as [[number,number],[number,number]],
      }))
    } else {
      // 舊版 JOIN 查詢（依賴 pipelines_unique + manholes_unique）
      const [tlX, tlY] = proj4('EPSG:4326', 'EPSG:3826', [minLng, minLat])
      const [brX, brY] = proj4('EPSG:4326', 'EPSG:3826', [maxLng, maxLat])
      const xMin = Math.min(tlX, brX), xMax = Math.max(tlX, brX)
      const yMin = Math.min(tlY, brY), yMax = Math.max(tlY, brY)

      const rows = await db.all(`
        SELECT pc.id, pc.p_no, pc.town, pc.max_grade,
               pc.has_damage, pc.has_sedimentation, pc.has_crossing,
               pc.has_cable, pc.has_other, pc.cannot_survey, pc.issue_count,
               pc.issues_json,
               m1.x AS up_x, m1.y AS up_y,
               m2.x AS dn_x, m2.y AS dn_y
        FROM pipeline_conditions pc
        JOIN pipelines_unique pu
          ON pu.upstream_node || '-' || pu.downstream_node = pc.p_no
          AND pu.system_type = '雨水'
        JOIN manholes_unique m1
          ON m1.manhole_no = pu.upstream_node
          AND m1.system_type = '雨水'
          AND m1.project_name = pu.project_name
        JOIN manholes_unique m2
          ON m2.manhole_no = pu.downstream_node
          AND m2.system_type = '雨水'
          AND m2.project_name = pu.project_name
        WHERE (
          (m1.x BETWEEN ? AND ? AND m1.y BETWEEN ? AND ?)
          OR (m2.x BETWEEN ? AND ? AND m2.y BETWEEN ? AND ?)
        )
        LIMIT 3000
      `, [xMin, xMax, yMin, yMax, xMin, xMax, yMin, yMax]) as any[]

      features = rows.map((r: any) => {
        const [upLat, upLng] = twd97ToWgs84(r.up_x, r.up_y)
        const [dnLat, dnLng] = twd97ToWgs84(r.dn_x, r.dn_y)
        return {
          id: r.id, p_no: r.p_no, town: r.town, road_name: '', max_grade: r.max_grade,
          has_damage: r.has_damage === 1, has_sedimentation: r.has_sedimentation === 1,
          has_crossing: r.has_crossing === 1, has_cable: r.has_cable === 1,
          has_other: r.has_other === 1, cannot_survey: r.cannot_survey === 1,
          issue_count: r.issue_count, issues: r.issues_json ? JSON.parse(r.issues_json) : [],
          coords: [[upLat, upLng], [dnLat, dnLng]] as [[number,number],[number,number]],
        }
      })
    }

    return NextResponse.json({ conditions: features, total: features.length })
  } catch (err) {
    console.error('pipeline-conditions-map API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
