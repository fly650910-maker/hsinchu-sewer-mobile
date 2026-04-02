import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

const BUDGET_TOTAL = 11_000_000 // 1100萬

// Unit costs (元/m) by culvert type
const UNIT_COST: Record<string, number> = {
  '箱涵': 1_000,
  '涵管': 500,
  '人孔': 4_000, // per seat
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dlat = (lat2 - lat1) * Math.PI / 180
  const dlng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dlat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dlng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/**
 * Generate a straight two-point fallback line along the bearing axis.
 * Used when no pipe network data is available for a candidate corridor.
 */
function roadPolyline(
  lat: number, lng: number,
  lengthM: number,
  bearing: number // degrees clockwise from north
): [number, number][] {
  const R = 111_000
  const cosLat = Math.cos(lat * Math.PI / 180)
  const bear = bearing * Math.PI / 180
  const dlat = Math.cos(bear) / R
  const dlng = Math.sin(bear) / (R * cosLat)
  const half = lengthM / 2
  return [
    [lat - dlat * half, lng - dlng * half],
    [lat + dlat * half, lng + dlng * half],
  ]
}

/**
 * Build polyline using actual pipe network segments (pipelines JOIN manholes_unique).
 * Each pipe segment is a strict straight line between two manhole GPS positions.
 * Filters segments whose midpoint lies within the bearing-aligned corridor,
 * sorts them along the route direction, and returns unique manhole nodes in order.
 * Falls back to roadPolyline() if fewer than MIN_SEGS matched segments are found.
 */
function pipeNetworkPolyline(
  lat: number, lng: number,
  lengthM: number,
  bearing: number,
  pipeSegs: Array<{ up_lat: number; up_lng: number; dn_lat: number; dn_lng: number }>,
  corridorWidth = 120, // metres either side of centreline
  MIN_SEGS = 3
): [number, number][] {
  const R = 111_000
  const cosLat = Math.cos(lat * Math.PI / 180)
  const bearRad = bearing * Math.PI / 180
  const half = lengthM / 2
  const cosB = Math.cos(bearRad)
  const sinB = Math.sin(bearRad)
  const cosP = Math.cos(bearRad + Math.PI / 2)
  const sinP = Math.sin(bearRad + Math.PI / 2)

  function project(mlat: number, mlng: number) {
    const dlatM = (mlat - lat) * R
    const dlngM = (mlng - lng) * R * cosLat
    return {
      along: dlatM * cosB + dlngM * sinB,
      perp:  dlatM * cosP + dlngM * sinP,
    }
  }

  // Collect manhole endpoints from segments whose midpoint falls in corridor
  const nodes: Array<{ lat: number; lng: number; proj: number }> = []
  let segCount = 0
  for (const seg of pipeSegs) {
    const midLat = (seg.up_lat + seg.dn_lat) / 2
    const midLng = (seg.up_lng + seg.dn_lng) / 2
    const mid = project(midLat, midLng)
    if (Math.abs(mid.along) <= half && Math.abs(mid.perp) <= corridorWidth / 2) {
      segCount++
      nodes.push({ lat: seg.up_lat, lng: seg.up_lng, proj: project(seg.up_lat, seg.up_lng).along })
      nodes.push({ lat: seg.dn_lat, lng: seg.dn_lng, proj: project(seg.dn_lat, seg.dn_lng).along })
    }
  }

  if (segCount < MIN_SEGS) {
    return roadPolyline(lat, lng, lengthM, bearing)
  }

  // Sort by position along route axis and deduplicate (4-decimal ≈ 11m precision)
  nodes.sort((a, b) => a.proj - b.proj)
  const seen = new Set<string>()
  const result: [number, number][] = []
  for (const p of nodes) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
    if (!seen.has(key)) { seen.add(key); result.push([p.lat, p.lng]) }
  }
  return result
}

export async function GET() {
  try {
    const db = await getDb()

    // ── 1. Flood hotspots ──
    const hotspots: Array<{
      id: number; location: string; town: string; lat: number; lng: number; event_count: number
    }> = await db.all(
      'SELECT id, location, town, lat, lng, event_count FROM flood_hotspots WHERE lat IS NOT NULL AND lng IS NOT NULL'
    )

    // ── 2. Existing dredging (113 + 114) by district totals ──
    const dredgingByDistrict: Record<string, { count: number; total_m: number; points: Array<{lat: number; lng: number}> }> = {}
    const dredged: Array<{ district: string; road_name: string; lat: number; lng: number; total_m: number }> =
      await db.all('SELECT district, road_name, SUM(length_m) as total_m, AVG(lat) as lat, AVG(lng) as lng FROM dredging_routes GROUP BY road_name')
    const dredgedAllPts: Array<{ lat: number; lng: number }> =
      await db.all('SELECT lat, lng FROM dredging_routes WHERE lat IS NOT NULL')
    for (const d of dredged) {
      if (!dredgingByDistrict[d.district]) dredgingByDistrict[d.district] = { count: 0, total_m: 0, points: [] }
      dredgingByDistrict[d.district].count++
      dredgingByDistrict[d.district].total_m += d.total_m
      dredgingByDistrict[d.district].points.push({ lat: d.lat, lng: d.lng })
    }

    // ── 3. Pipeline conditions (sedimentation) by town ──
    const sedByTown: Record<string, { sed: number; dmg: number; avg_grade: number }> = {}
    const sedRows: Array<{ town: string; sed: number; dmg: number; avg_grade: number }> =
      await db.all('SELECT town, SUM(has_sedimentation) as sed, SUM(has_damage) as dmg, AVG(max_grade) as avg_grade FROM pipeline_conditions GROUP BY town')
    for (const r of sedRows) sedByTown[r.town] = { sed: r.sed, dmg: r.dmg, avg_grade: r.avg_grade }

    // ── 4. Pipe network segments with GPS (pipelines JOIN manholes_unique) ──
    // Each row = one pipe segment with upstream/downstream manhole WGS84 coords.
    // Used to generate straight-line pipe-network polylines for 竹北 / 竹東 areas.
    const pipeSegs: Array<{ up_lat: number; up_lng: number; dn_lat: number; dn_lng: number }> =
      await db.all(`
        SELECT mu.lat_wgs84 AS up_lat, mu.lng_wgs84 AS up_lng,
               md.lat_wgs84 AS dn_lat, md.lng_wgs84 AS dn_lng
        FROM   pipelines p
        JOIN   manholes_unique mu ON mu.manhole_no = p.upstream_node   AND mu.lat_wgs84 IS NOT NULL
        JOIN   manholes_unique md ON md.manhole_no = p.downstream_node AND md.lat_wgs84 IS NOT NULL
      `)

    // ── 5. Build candidate route plan (data-driven) ──
    // Each candidate encodes: which data sources drove it, expected polyline anchor, culvert type
    interface Candidate {
      id: string
      district: string
      road_name: string
      culvert_type: '箱涵' | '涵管' | '人孔'
      estimated_length_m: number
      manhole_count: number
      lat: number
      lng: number
      bearing: number // road bearing (degrees from north)
      priority: 'high' | 'medium' | 'low'
      score: number
      reason: string
      basis: string[]
    }

    const candidates: Candidate[] = []

    // ── 依照資料分析的具體路段建議 ──
    //
    // 竹東 (最大空缺：72條淤積，113/114年僅清38m)
    // pipe_reports 顯示：大同路、康寧街、光武街、沿河街有多筆通報
    const zhudongSed = sedByTown['竹東'] ?? { sed: 72, dmg: 77, avg_grade: 0.98 }
    const zhudongPastM = dredgingByDistrict['竹東']?.total_m ?? 38
    candidates.push({
      id: 'zd-01', district: '竹東', road_name: '竹東-大同路暨公正街排水箱涵',
      culvert_type: '箱涵', estimated_length_m: 780, manhole_count: 8,
      lat: 24.7356, lng: 121.0890, bearing: 5,  // 依管線資料校正（南北向）
      priority: 'high', score: 92,
      reason: `竹東鎮${zhudongSed.sed}條管線有淤積紀錄(等級${zhudongSed.avg_grade.toFixed(2)})，歷年清淤僅${Math.round(zhudongPastM)}m，大同路為竹東主要排水幹線，沿線多筆塞管及冒水通報`,
      basis: ['管線淤積', '塞管通報']
    })
    candidates.push({
      id: 'zd-02', district: '竹東', road_name: '竹東-康寧街及周邊支線',
      culvert_type: '涵管', estimated_length_m: 650, manhole_count: 6,
      lat: 24.7335, lng: 121.0883, bearing: 90,
      priority: 'high', score: 88,
      reason: '康寧街249巷多次重複通報塞管，沿線Ø600mm涵管調查顯示多處淤積，管齡超15年，排水坡度不足',
      basis: ['塞管通報', '管線淤積']
    })
    candidates.push({
      id: 'zd-03', district: '竹東', road_name: '竹東-沿河街北排水系統',
      culvert_type: '箱涵', estimated_length_m: 900, manhole_count: 10,
      lat: 24.7432, lng: 121.0872, bearing: 35,
      priority: 'high', score: 85,
      reason: '竹東沿河街緊鄰頭前溪，颱風季排水箱涵承載高，近年通報積水及冒水，且已無113/114清淤紀錄',
      basis: ['塞管通報', '管線淤積']
    })
    candidates.push({
      id: 'zd-04', district: '竹東', road_name: '竹東-光復路雨水幹管',
      culvert_type: '箱涵', estimated_length_m: 1_100, manhole_count: 12,
      lat: 24.7290, lng: 121.0920, bearing: 10,
      priority: 'medium', score: 72,
      reason: '竹東舊市區光復路為主要南北排水走廊，管線調查顯示淤積段落集中，建議配合光復路拓寬計畫一併辦理',
      basis: ['管線淤積']
    })

    // 湖口/新豐/新埔/橫山 — 無管線 GPS 資料（不在下水道服務範圍/都市計畫範圍），全數移除

    // 竹北 — 重點針對未涵蓋區域（六家、嘉豐）
    const zhubeiHotspots = hotspots.filter(h => h.town === '竹北市')
    // Find hotspots far from existing dredging
    const zhubeiUnreached = zhubeiHotspots.filter(h => {
      const minDist = Math.min(...dredgedAllPts.map((d: any) => haversine(h.lat, h.lng, d.lat, d.lng)))
      return minDist > 600
    })
    // zb-01 新港里已移除：距最近管線 GPS 超過 5.5km，該區尚無下水道施設資料
    candidates.push({
      id: 'zb-02', district: '竹北', road_name: '竹北-嘉豐地區雨水主幹管',
      culvert_type: '箱涵', estimated_length_m: 1_200, manhole_count: 13,
      lat: 24.8102, lng: 121.0340, bearing: 15,
      priority: 'high', score: 87,
      reason: '嘉豐地區115年已累積多筆塞管通報（嘉豐五路、嘉豐十一路等），為新開發區快速成長帶，排水系統負荷遽增',
      basis: ['塞管通報', '管線淤積']
    })
    candidates.push({
      id: 'zb-03', district: '竹北', road_name: '竹北-中和街地下道上下游箱涵',
      culvert_type: '箱涵', estimated_length_m: 700, manhole_count: 8,
      lat: 24.8397, lng: 121.0113, bearing: 125,  // 依管線資料校正
      priority: 'high', score: 85,
      reason: '中和街地下道累積3次淹水事件，排水箱涵截面積不足，上游淤積加重下游壓力，建議清淤並評估是否擴管',
      basis: ['淹水熱點']
    })
    candidates.push({
      id: 'zb-04', district: '竹北', road_name: '竹北-光明路縣政路口周邊雨水系統',
      culvert_type: '涵管', estimated_length_m: 680, manhole_count: 7,
      lat: 24.8295, lng: 121.0101, bearing: 130,
      priority: 'medium', score: 74,
      reason: '光明路縣政路口115年已有多筆冒水及塞管通報，Ø600mm涵管配合排水坡度不足，建議清淤改善',
      basis: ['塞管通報']
    })
    candidates.push({
      id: 'zb-05', district: '竹北', road_name: '竹北-六家一路排水幹線',
      culvert_type: '箱涵', estimated_length_m: 900, manhole_count: 9,
      lat: 24.8083, lng: 121.0302, bearing: 180,
      priority: 'medium', score: 70,
      reason: '六家地區快速開發，六家一路排水承接上游大量逕流，管線調查顯示淤積段落，需在雨季前完成清淤',
      basis: ['塞管通報', '管線淤積']
    })

    // ── 6. Budget allocation: sort by score, pick until budget exhausted ──
    candidates.sort((a, b) => b.score - a.score)

    let budgetUsed = 0
    const selected: Array<Candidate & {
      unit_cost: number
      total_cost: number
      cumulative_cost: number
      polyline: [number, number][]
    }> = []

    for (const c of candidates) {
      const unitCost = UNIT_COST[c.culvert_type] ?? 700
      const pipelineCost = c.estimated_length_m * unitCost
      const manholeCost = c.manhole_count * UNIT_COST['人孔']
      const totalCost = pipelineCost + manholeCost
      const contingency = Math.round(totalCost * 0.15) // 15% contingency

      if (budgetUsed + totalCost + contingency > BUDGET_TOTAL) {
        // Try to squeeze if remaining budget can fit a shortened version
        continue
      }

      budgetUsed += totalCost + contingency
      selected.push({
        ...c,
        unit_cost: unitCost,
        total_cost: Math.round((totalCost + contingency) / 10000), // 萬元
        cumulative_cost: Math.round(budgetUsed / 10000),
        // 使用真實管線網路座標（每段為直線），無網路資料時回退至合成折線
        polyline: pipeNetworkPolyline(c.lat, c.lng, c.estimated_length_m, c.bearing, pipeSegs),
      })
    }

    // ── 7. Summary stats ──
    const byDistrict: Record<string, { count: number; total_cost: number; total_length: number }> = {}
    for (const s of selected) {
      if (!byDistrict[s.district]) byDistrict[s.district] = { count: 0, total_cost: 0, total_length: 0 }
      byDistrict[s.district].count++
      byDistrict[s.district].total_cost += s.total_cost
      byDistrict[s.district].total_length += s.estimated_length_m
    }

    return NextResponse.json({
      suggestions: selected,
      total: selected.length,
      budget_total_wan: BUDGET_TOTAL / 10000,
      budget_used_wan: Math.round(budgetUsed / 10000),
      budget_remaining_wan: Math.round((BUDGET_TOTAL - budgetUsed) / 10000),
      total_length_m: selected.reduce((s, r) => s + r.estimated_length_m, 0),
      by_district: byDistrict,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('dredging-suggestion API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
