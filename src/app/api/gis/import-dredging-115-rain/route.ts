import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// 115年雨水下水道清淤路段 — 來源：115年度雨水下水道清淤疏濬計畫
// 預算：新臺幣 11,000,000 元；預計清淤 9,130 公尺
const ROUTES_115_RAIN: {
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
  sewer_type: string
}[] = [
  // ── 竹北市（東興圳系統）4–5月 ─────────────────────────────────────────
  {
    road_name: '竹北-成功三街',
    district: '竹北',
    work_date: '2025-04-01',
    culvert_type: '箱涵/涵管',
    length_m: 1200.00,
    manhole_count: 15,
    cistern_count: 15,
    pipe_ids: 'DD13系列（延續114年）',
    lat: 24.8398,
    lng: 121.0072,
    polyline_json: JSON.stringify([
      [24.8380, 121.0055],
      [24.8415, 121.0090],
    ]),
    sewer_type: '雨水',
  },
  {
    road_name: '竹北-成功八路',
    district: '竹北',
    work_date: '2025-04-01',
    culvert_type: '箱涵',
    length_m: 900.00,
    manhole_count: 18,
    cistern_count: 18,
    pipe_ids: 'TD3～TD19系列（延續114年）',
    lat: 24.8355,
    lng: 121.0100,
    polyline_json: JSON.stringify([
      [24.8330, 121.0075],
      [24.8380, 121.0125],
    ]),
    sewer_type: '雨水',
  },
  {
    road_name: '竹北-成功六街',
    district: '竹北',
    work_date: '2025-05-01',
    culvert_type: '箱涵/涵管',
    length_m: 1400.00,
    manhole_count: 23,
    cistern_count: 23,
    pipe_ids: 'TD4系列（延續114年）',
    lat: 24.8370,
    lng: 121.0110,
    polyline_json: JSON.stringify([
      [24.8340, 121.0080],
      [24.8400, 121.0140],
    ]),
    sewer_type: '雨水',
  },
  // ── 竹北市（TA/TB/TC 系統）6月 ───────────────────────────────────────
  {
    road_name: '竹北-自強三路',
    district: '竹北',
    work_date: '2025-06-01',
    culvert_type: '箱涵',
    length_m: 210.00,
    manhole_count: 7,
    cistern_count: 7,
    pipe_ids: 'TA1～TC6系列（延續114年）',
    lat: 24.8169,
    lng: 121.0176,
    polyline_json: JSON.stringify([
      [24.8143, 121.0163],
      [24.8196, 121.0200],
    ]),
    sewer_type: '雨水',
  },
  {
    road_name: '竹北-莊敬南路',
    district: '竹北',
    work_date: '2025-06-01',
    culvert_type: '箱涵',
    length_m: 200.00,
    manhole_count: 4,
    cistern_count: 4,
    pipe_ids: 'TB1～TB3系列（延續114年）',
    lat: 24.8175,
    lng: 121.0201,
    polyline_json: JSON.stringify([
      [24.8126, 121.0181],
      [24.8224, 121.0221],
    ]),
    sewer_type: '雨水',
  },
  {
    road_name: '竹北-自強五路',
    district: '竹北',
    work_date: '2025-06-01',
    culvert_type: '箱涵',
    length_m: 240.00,
    manhole_count: 4,
    cistern_count: 4,
    pipe_ids: 'TA1～TA3系列（延續114年）',
    lat: 24.8149,
    lng: 121.0215,
    polyline_json: JSON.stringify([
      [24.8111, 121.0196],
      [24.8187, 121.0234],
    ]),
    sewer_type: '雨水',
  },
  // ── 竹北市縣政三路（115年新建段）施工前後 ────────────────────────────
  {
    road_name: '竹北-縣政三路',
    district: '竹北',
    work_date: '2025-04-01',
    culvert_type: '幹管',
    length_m: 500.00,
    manhole_count: 8,
    cistern_count: 8,
    pipe_ids: '縣政系列幹管（115年新建段）',
    lat: 24.8390,
    lng: 121.0148,
    polyline_json: JSON.stringify([
      [24.8365, 121.0115],
      [24.8415, 121.0181],
    ]),
    sewer_type: '雨水',
  },
  // ── 新豐鄉新興路 C 幹線 7月 ──────────────────────────────────────────
  {
    road_name: '新豐-新興路',
    district: '新豐',
    work_date: '2025-07-01',
    culvert_type: '箱涵/涵管',
    length_m: 700.00,
    manhole_count: 8,
    cistern_count: 8,
    pipe_ids: 'N1075~N1076系列（延續114年）',
    lat: 24.9182,
    lng: 121.0008,
    polyline_json: JSON.stringify([
      [24.9150, 120.9980],
      [24.9214, 121.0036],
    ]),
    sewer_type: '雨水',
  },
  // ── 新埔鎮廣和路 9月 ─────────────────────────────────────────────────
  {
    road_name: '新埔-廣和路',
    district: '新埔',
    work_date: '2025-09-01',
    culvert_type: '箱涵',
    length_m: 280.00,
    manhole_count: 4,
    cistern_count: 4,
    pipe_ids: 'N2069-F02~N2068-028（延續114年）',
    lat: 24.8440,
    lng: 121.0730,
    polyline_json: JSON.stringify([
      [24.8415, 121.0710],
      [24.8465, 121.0750],
    ]),
    sewer_type: '雨水',
  },
  // ── 湖口鄉中正路（115年新建段 HK1~HK5）施工前後 ─────────────────────
  {
    road_name: '湖口-中正路',
    district: '湖口',
    work_date: '2025-08-01',
    culvert_type: '箱涵/涵管',
    length_m: 400.00,
    manhole_count: 6,
    cistern_count: 6,
    pipe_ids: 'HK1~HK5（115年新建段）',
    lat: 24.9165,
    lng: 121.0190,
    polyline_json: JSON.stringify([
      [24.9140, 121.0160],
      [24.9190, 121.0220],
    ]),
    sewer_type: '雨水',
  },
  // ── 湖口鄉光復路既有幹管 8月 ─────────────────────────────────────────
  {
    road_name: '湖口-光復路',
    district: '湖口',
    work_date: '2025-08-01',
    culvert_type: '既有箱涵',
    length_m: 2500.00,
    manhole_count: 28,
    cistern_count: 28,
    pipe_ids: '既有HK系列',
    lat: 24.9218,
    lng: 121.0162,
    polyline_json: JSON.stringify([
      [24.9130, 121.0090],
      [24.9210, 121.0155],
      [24.9280, 121.0230],
    ]),
    sewer_type: '雨水',
  },
  // ── 全縣汛期前重點易積水路段（4月優先）─────────────────────────────
  {
    road_name: '竹北-汛期前重點路段',
    district: '竹北',
    work_date: '2025-04-01',
    culvert_type: '各類管渠',
    length_m: 500.00,
    manhole_count: 10,
    cistern_count: 10,
    pipe_ids: '各鄉鎮市重點路段（汛期前清疏）',
    lat: 24.8265,
    lng: 121.0105,
    polyline_json: JSON.stringify([
      [24.8240, 121.0080],
      [24.8290, 121.0130],
    ]),
    sewer_type: '雨水',
  },
  {
    road_name: '湖口-汛期前重點路段',
    district: '湖口',
    work_date: '2025-04-01',
    culvert_type: '各類管渠',
    length_m: 500.00,
    manhole_count: 8,
    cistern_count: 8,
    pipe_ids: '湖口重點路段（汛期前清疏）',
    lat: 24.9190,
    lng: 121.0175,
    polyline_json: JSON.stringify([
      [24.9165, 121.0150],
      [24.9215, 121.0200],
    ]),
    sewer_type: '雨水',
  },
]

export async function POST() {
  try {
    const db = await getDb()

    // 確認資料表存在
    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='dredging_routes'"
    )
    if (!tableExists) {
      return NextResponse.json({ error: 'dredging_routes 資料表不存在，請先執行其他初始化' }, { status: 400 })
    }

    // 確保 sewer_type 欄位存在
    try {
      await db.run("ALTER TABLE dredging_routes ADD COLUMN sewer_type TEXT DEFAULT '雨水'")
    } catch (_) { /* 欄位已存在 */ }

    // 更新舊有 113/114 年資料為 sewer_type='雨水'
    await db.run("UPDATE dredging_routes SET sewer_type = '雨水' WHERE sewer_type IS NULL OR sewer_type = ''")

    // 刪除舊的 115年雨水資料（避免重複）
    await db.run("DELETE FROM dredging_routes WHERE year = '115' AND COALESCE(sewer_type, '雨水') = '雨水'")

    // 插入全部 115年雨水資料
    let inserted = 0
    for (const r of ROUTES_115_RAIN) {
      await db.run(
        `INSERT INTO dredging_routes
           (year, work_date, district, road_name, culvert_type,
            length_m, manhole_count, cistern_count, pipe_ids,
            lat, lng, polyline_json, sewer_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          '115', r.work_date, r.district, r.road_name, r.culvert_type,
          r.length_m, r.manhole_count, r.cistern_count, r.pipe_ids,
          r.lat, r.lng, r.polyline_json, r.sewer_type,
        ]
      )
      inserted++
    }

    const count115 = await db.get(
      "SELECT COUNT(*) as cnt FROM dredging_routes WHERE year = '115'"
    ) as { cnt: number }

    return NextResponse.json({
      success: true,
      message: `已成功匯入 115年雨水清淤路段 ${inserted} 條`,
      count_115: count115.cnt,
      total_length_m: ROUTES_115_RAIN.reduce((s, r) => s + r.length_m, 0),
      routes: ROUTES_115_RAIN.map(r => ({ road: r.road_name, district: r.district, length_m: r.length_m })),
    })
  } catch (error) {
    console.error('import-dredging-115-rain error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
