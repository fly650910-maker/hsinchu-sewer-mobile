import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// 115年污水預計巡檢路段（依塞管熱點分析，共11條）
const INITIAL_ROUTES = [
  { id: 'sw-zd-01', district: '竹東', road_name: '竹東-大同路', address: '大同路61號', lat: 24.737537, lng: 121.093362, priority: 'high', repeat_count: 6, reason: '重複通報6次（五年最高）' },
  { id: 'sw-zd-02', district: '竹東', road_name: '竹東-大明路', address: '大明路233號', lat: 24.734984, lng: 121.096690, priority: 'high', repeat_count: 4, reason: '110–112年連續通報' },
  { id: 'sw-zd-03', district: '竹東', road_name: '竹東-光武街', address: '光武街74號', lat: 24.722040, lng: 121.093374, priority: 'high', repeat_count: 3, reason: '110/112/113年通報' },
  { id: 'sw-zd-04', district: '竹東', road_name: '竹東-興農街', address: '興農街121巷', lat: 24.741671, lng: 121.088492, priority: 'medium', repeat_count: 3, reason: '112–114年通報' },
  { id: 'sw-zb-01', district: '竹北', road_name: '竹北-縣政三街', address: '縣政三街26號', lat: 24.823795, lng: 121.013161, priority: 'high', repeat_count: 4, reason: '餐飲業密集，截油槽不足' },
  { id: 'sw-zb-02', district: '竹北', road_name: '竹北-自強南路', address: '自強南路141號', lat: 24.815151, lng: 121.024766, priority: 'high', repeat_count: 4, reason: '餐飲業油脂長期累積' },
  { id: 'sw-zb-03', district: '竹北', road_name: '竹北-仁德街', address: '仁德街11號', lat: 24.836407, lng: 121.011335, priority: 'high', repeat_count: 4, reason: '老舊社區，管線老化' },
  { id: 'sw-zb-04', district: '竹北', road_name: '竹北-四維街', address: '四維街229號', lat: 24.834518, lng: 121.012191, priority: 'medium', repeat_count: 3, reason: '連續三年通報' },
  { id: 'sw-zb-05', district: '竹北', road_name: '竹北-福興路', address: '福興路748號', lat: 24.824862, lng: 121.007938, priority: 'medium', repeat_count: 3, reason: '生活油脂累積' },
  { id: 'sw-zb-06', district: '竹北', road_name: '竹北-光明一路', address: '光明一路276號', lat: 24.830720, lng: 121.014260, priority: 'medium', repeat_count: 3, reason: '餐飲業密集路段' },
  { id: 'sw-zb-07', district: '竹北', road_name: '竹北-成功十街', address: '成功十街1號', lat: 24.816432, lng: 121.020332, priority: 'medium', repeat_count: 3, reason: '連續三年通報' },
]

async function ensureTable(db: any) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS sewage_inspection_115 (
      id TEXT PRIMARY KEY,
      district TEXT NOT NULL,
      road_name TEXT NOT NULL,
      address TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      priority TEXT DEFAULT 'medium',
      repeat_count INTEGER DEFAULT 0,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      completed_date TEXT,
      completed_note TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `)
  // 若資料表為空，自動初始化
  const count = await db.get('SELECT COUNT(*) as cnt FROM sewage_inspection_115') as { cnt: number }
  if (count.cnt === 0) {
    for (let i = 0; i < INITIAL_ROUTES.length; i++) {
      const r = INITIAL_ROUTES[i]
      await db.run(
        `INSERT OR IGNORE INTO sewage_inspection_115
           (id, district, road_name, address, lat, lng, priority, repeat_count, reason, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [r.id, r.district, r.road_name, r.address, r.lat, r.lng, r.priority, r.repeat_count, r.reason, i + 1]
      )
    }
  }
}

// GET — 取得所有巡檢路段
export async function GET() {
  try {
    const db = await getDb()
    await ensureTable(db)
    const rows = await db.all(
      'SELECT * FROM sewage_inspection_115 ORDER BY sort_order, id'
    ) as any[]

    // 查詢每條路段附近的實際污水管線幾何（半徑約 300m ≈ 0.003 度）
    const RADIUS = 0.003
    const pipelines_table_exists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pipelines_unique'"
    )

    const routesWithPipes = await Promise.all(rows.map(async (r: any) => {
      if (!pipelines_table_exists) return { ...r, nearby_pipes: [] }
      try {
        const pipes = await db.all(`
          SELECT sewer_no, upstream_node, downstream_node, wgs84_coords, diameter, length
          FROM pipelines_unique
          WHERE wgs84_coords IS NOT NULL AND wgs84_coords != ''
            AND system_type = '污水'
            AND bbox_min_lat <= ? AND bbox_max_lat >= ?
            AND bbox_min_lng <= ? AND bbox_max_lng >= ?
          LIMIT 60
        `, [
          r.lat + RADIUS, r.lat - RADIUS,
          r.lng + RADIUS, r.lng - RADIUS,
        ]) as any[]

        const nearby_pipes = pipes
          .map((p: any) => {
            try {
              const coords: [number, number][] = JSON.parse(p.wgs84_coords)
              return { sewer_no: p.sewer_no, upstream_node: p.upstream_node, downstream_node: p.downstream_node, diameter: p.diameter, length: p.length, coords }
            } catch { return null }
          })
          .filter(Boolean)

        return { ...r, nearby_pipes }
      } catch { return { ...r, nearby_pipes: [] } }
    }))

    const total = rows.length
    const completed = rows.filter((r: any) => r.status === 'completed').length

    return NextResponse.json({
      routes: routesWithPipes,
      total,
      completed,
      pending: total - completed,
      progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PATCH — 更新巡檢狀態（切換 pending ↔ completed）
export async function PATCH(request: Request) {
  try {
    const { id, status, note } = await request.json() as {
      id: string
      status: 'pending' | 'completed'
      note?: string
    }
    if (!id || !status) {
      return NextResponse.json({ error: '缺少 id 或 status' }, { status: 400 })
    }

    const db = await getDb()
    await ensureTable(db)

    const completedDate = status === 'completed'
      ? new Date().toISOString().slice(0, 10)
      : null

    await db.run(
      `UPDATE sewage_inspection_115
       SET status = ?, completed_date = ?, completed_note = ?
       WHERE id = ?`,
      [status, completedDate, note ?? null, id]
    )

    const updated = await db.get(
      'SELECT * FROM sewage_inspection_115 WHERE id = ?', [id]
    )

    return NextResponse.json({ success: true, route: updated })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST — 重置所有巡檢狀態（重新開始）
export async function POST() {
  try {
    const db = await getDb()
    await ensureTable(db)
    await db.run("UPDATE sewage_inspection_115 SET status = 'pending', completed_date = NULL, completed_note = NULL")
    return NextResponse.json({ success: true, message: '已重置所有巡檢狀態' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
