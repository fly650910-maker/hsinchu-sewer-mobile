import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// 污水清淤工作通知單資料
// 資料來源：污水下水道清淤工作通知單（114年、115年）
// 此檔案預留框架，資料待實際工作通知單匯入後填充
const ROUTES_SEWAGE: {
  road_name: string
  district: string
  work_date: string
  culvert_type: string
  length_m: number
  manhole_count: number
  cistern_count: number
  pipe_ids: string
  lat: number
  lng: number
  polyline_json: string
  year: string
  sewer_type: string
}[] = [
  // ── 114年污水清淤（依塞管通報熱點推估施工路段）───────────────────────
  {
    road_name: '竹東-大同路',
    district: '竹東',
    work_date: '2025-03-01',
    culvert_type: '污水主管',
    length_m: 520.00,
    manhole_count: 6,
    cistern_count: 0,
    pipe_ids: '大同路61號沿線',
    lat: 24.737537,
    lng: 121.093362,
    polyline_json: JSON.stringify([
      [24.7355, 121.0915],
      [24.7395, 121.0952],
    ]),
    year: '114',
    sewer_type: '污水',
  },
  {
    road_name: '竹北-縣政三街',
    district: '竹北',
    work_date: '2025-03-01',
    culvert_type: '污水主管',
    length_m: 460.00,
    manhole_count: 5,
    cistern_count: 0,
    pipe_ids: '縣政三街26號沿線',
    lat: 24.823795,
    lng: 121.013161,
    polyline_json: JSON.stringify([
      [24.8218, 121.0112],
      [24.8258, 121.0152],
    ]),
    year: '114',
    sewer_type: '污水',
  },
  {
    road_name: '竹北-仁德街',
    district: '竹北',
    work_date: '2025-03-01',
    culvert_type: '污水支管',
    length_m: 350.00,
    manhole_count: 4,
    cistern_count: 0,
    pipe_ids: '仁德街11號沿線',
    lat: 24.836407,
    lng: 121.011335,
    polyline_json: JSON.stringify([
      [24.8344, 121.0093],
      [24.8384, 121.0133],
    ]),
    year: '114',
    sewer_type: '污水',
  },
  // ── 115年污水清淤（依115年計畫熱點路段）─────────────────────────────
  {
    road_name: '竹東-大明路',
    district: '竹東',
    work_date: '2025-05-01',
    culvert_type: '污水支管',
    length_m: 380.00,
    manhole_count: 4,
    cistern_count: 0,
    pipe_ids: '大明路233號沿線',
    lat: 24.734984,
    lng: 121.096690,
    polyline_json: JSON.stringify([
      [24.7330, 121.0947],
      [24.7370, 121.0987],
    ]),
    year: '115',
    sewer_type: '污水',
  },
  {
    road_name: '竹東-興農街',
    district: '竹東',
    work_date: '2025-05-01',
    culvert_type: '污水支管',
    length_m: 280.00,
    manhole_count: 3,
    cistern_count: 0,
    pipe_ids: '興農街121巷沿線',
    lat: 24.741671,
    lng: 121.088492,
    polyline_json: JSON.stringify([
      [24.7397, 121.0865],
      [24.7437, 121.0905],
    ]),
    year: '115',
    sewer_type: '污水',
  },
  {
    road_name: '竹北-自強南路',
    district: '竹北',
    work_date: '2025-05-01',
    culvert_type: '污水主管',
    length_m: 550.00,
    manhole_count: 6,
    cistern_count: 0,
    pipe_ids: '自強南路141號沿線',
    lat: 24.815151,
    lng: 121.024766,
    polyline_json: JSON.stringify([
      [24.8122, 121.0218],
      [24.8182, 121.0278],
    ]),
    year: '115',
    sewer_type: '污水',
  },
  {
    road_name: '竹北-光明一路',
    district: '竹北',
    work_date: '2025-05-01',
    culvert_type: '污水主管',
    length_m: 480.00,
    manhole_count: 5,
    cistern_count: 0,
    pipe_ids: '光明一路276號沿線',
    lat: 24.830720,
    lng: 121.014260,
    polyline_json: JSON.stringify([
      [24.8287, 121.0123],
      [24.8327, 121.0163],
    ]),
    year: '115',
    sewer_type: '污水',
  },
]

export async function POST() {
  try {
    const db = await getDb()

    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='dredging_routes'"
    )
    if (!tableExists) {
      return NextResponse.json({ error: 'dredging_routes 資料表不存在' }, { status: 400 })
    }

    // 確保 sewer_type 欄位存在
    try {
      await db.run("ALTER TABLE dredging_routes ADD COLUMN sewer_type TEXT DEFAULT '雨水'")
    } catch (_) { /* 欄位已存在 */ }

    // 刪除舊污水資料
    await db.run("DELETE FROM dredging_routes WHERE sewer_type = '污水'")

    let inserted = 0
    for (const r of ROUTES_SEWAGE) {
      await db.run(
        `INSERT INTO dredging_routes
           (year, work_date, district, road_name, culvert_type,
            length_m, manhole_count, cistern_count, pipe_ids,
            lat, lng, polyline_json, sewer_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.year, r.work_date, r.district, r.road_name, r.culvert_type,
          r.length_m, r.manhole_count, r.cistern_count, r.pipe_ids,
          r.lat, r.lng, r.polyline_json, r.sewer_type,
        ]
      )
      inserted++
    }

    const stats = await db.all(
      "SELECT year, COUNT(*) as cnt FROM dredging_routes WHERE sewer_type='污水' GROUP BY year"
    ) as { year: string; cnt: number }[]

    return NextResponse.json({
      success: true,
      message: `已成功匯入污水清淤路段 ${inserted} 條`,
      by_year: stats,
      routes: ROUTES_SEWAGE.map(r => ({ road: r.road_name, year: r.year, length_m: r.length_m })),
    })
  } catch (error) {
    console.error('import-sewage-dredging error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
