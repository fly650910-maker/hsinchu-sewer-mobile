import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year  = searchParams.get('year')  || 'all'
    const district = searchParams.get('district') || 'all'

    const db = await getDb()

    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='dredging_routes'"
    )
    if (!tableExists) {
      return NextResponse.json({ routes: [], total: 0, summary: {} })
    }

    let sql = `
      SELECT id, year, work_date, district, road_name, culvert_type,
             length_m, manhole_count, cistern_count, pipe_ids, lat, lng, polyline_json
      FROM dredging_routes
      WHERE lat IS NOT NULL`
    const params: any[] = []

    if (year !== 'all') {
      sql += ` AND year = ?`
      params.push(year)
    }
    if (district !== 'all') {
      sql += ` AND district = ?`
      params.push(district)
    }

    sql += ` ORDER BY work_date, road_name`

    const rows = await db.all(sql, params) as Array<{
      id: number
      year: string
      work_date: string
      district: string
      road_name: string
      culvert_type: string
      length_m: number
      manhole_count: number
      cistern_count: number
      pipe_ids: string
      lat: number
      lng: number
      polyline_json: string | null
    }>

    // Aggregate by road (sum length across culvert types)
    const roadMap = new Map<string, {
      id: number; year: string; work_date: string; district: string
      road_name: string; total_length: number; manhole_count: number
      cistern_count: number; culvert_types: string[]; lat: number; lng: number
      allPolylinePoints: number[][]
      details: typeof rows
    }>()

    for (const r of rows) {
      const key = `${r.road_name}|${r.work_date}`
      if (!roadMap.has(key)) {
        roadMap.set(key, {
          id: r.id, year: r.year, work_date: r.work_date,
          district: r.district, road_name: r.road_name,
          total_length: 0, manhole_count: 0, cistern_count: 0,
          culvert_types: [], lat: r.lat, lng: r.lng,
          allPolylinePoints: [],
          details: []
        })
      }
      const entry = roadMap.get(key)!
      entry.total_length = Math.round((entry.total_length + r.length_m) * 100) / 100
      entry.manhole_count += r.manhole_count
      entry.cistern_count += r.cistern_count
      if (!entry.culvert_types.includes(r.culvert_type)) entry.culvert_types.push(r.culvert_type)
      entry.details.push(r)
      // Merge polyline points (deduplicate by coordinate key)
      if (r.polyline_json) {
        const pts: number[][] = JSON.parse(r.polyline_json)
        for (const pt of pts) {
          const ptKey = `${pt[0].toFixed(5)},${pt[1].toFixed(5)}`
          if (!entry.allPolylinePoints.some(p => `${p[0].toFixed(5)},${p[1].toFixed(5)}` === ptKey)) {
            entry.allPolylinePoints.push(pt)
          }
        }
      }
    }

    // Sort merged polyline points along principal axis
    function sortPolyline(pts: number[][]): number[][] {
      if (pts.length <= 2) return pts
      const cx = pts.reduce((s,p)=>s+p[0],0)/pts.length
      const cy = pts.reduce((s,p)=>s+p[1],0)/pts.length
      const sxx = pts.reduce((s,p)=>s+(p[0]-cx)**2,0)
      const syy = pts.reduce((s,p)=>s+(p[1]-cy)**2,0)
      return sxx >= syy ? [...pts].sort((a,b)=>a[0]-b[0]) : [...pts].sort((a,b)=>a[1]-b[1])
    }

    const routes = Array.from(roadMap.values()).map((r: any) => ({
      ...r,
      culvert_types: r.culvert_types.join('、'),
      polyline: r.allPolylinePoints.length >= 2 ? sortPolyline(r.allPolylinePoints) : (r.allPolylinePoints.length === 1 ? r.allPolylinePoints : null),
      allPolylinePoints: undefined,
    }))

    // Summary stats
    const totalLength = routes.reduce((s, r) => s + r.total_length, 0)
    const totalManholes = routes.reduce((s, r) => s + r.manhole_count, 0)

    const districtStats: Record<string, { count: number; length: number }> = {}
    for (const r of routes) {
      if (!districtStats[r.district]) districtStats[r.district] = { count: 0, length: 0 }
      districtStats[r.district].count++
      districtStats[r.district].length = Math.round((districtStats[r.district].length + r.total_length) * 10) / 10
    }

    return NextResponse.json({
      routes,
      total: routes.length,
      summary: {
        total_length: Math.round(totalLength),
        total_manholes: totalManholes,
        district_stats: districtStats,
      }
    })
  } catch (error) {
    console.error('dredging-routes API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
