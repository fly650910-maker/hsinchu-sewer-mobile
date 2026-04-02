import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// 114年清淤資料 — 來源：年度清淤資料夾各 PDF 明細表
// 包含：114年清淤東興圳-明細表.pdf, 114年度清淤新豐C幹線-明細表.pdf, 114年度清淤新埔-明細表.pdf
const ROUTES_114: {
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
}[] = [
  // ── 114年11月05日 工作通知單(竹北) — 東興圳沿線 ──────────────────────────
  {
    road_name: '竹北-成功三街',
    district: '竹北',
    work_date: '2025-11-05',
    culvert_type: '箱涵/涵管',
    // DD13-1～DD13-8 共14座，各段長度加總
    length_m: 1081.69,
    manhole_count: 14,
    cistern_count: 14,
    pipe_ids: 'DD13-1~DD13-8(DD13系列)',
    lat: 24.8398,
    lng: 121.0072,
    polyline_json: JSON.stringify([
      [24.8380, 121.0055],
      [24.8415, 121.0090],
    ]),
  },
  {
    road_name: '竹北-成功八路',
    district: '竹北',
    work_date: '2025-11-05',
    culvert_type: '箱涵',
    // TD3-TD2 ~ TD19-TD18 共18座
    length_m: 798.67,
    manhole_count: 18,
    cistern_count: 18,
    pipe_ids: 'TD3-TD2~TD19-TD18',
    lat: 24.8355,
    lng: 121.0100,
    polyline_json: JSON.stringify([
      [24.8330, 121.0075],
      [24.8380, 121.0125],
    ]),
  },
  {
    road_name: '竹北-成功六街',
    district: '竹北',
    work_date: '2025-11-05',
    culvert_type: '箱涵',
    // TD4-1~TD4-19 共23座，各段長度加總
    length_m: 1340.11,
    manhole_count: 23,
    cistern_count: 23,
    pipe_ids: 'TD4-1~TD4-19(TD4系列)',
    lat: 24.8370,
    lng: 121.0110,
    polyline_json: JSON.stringify([
      [24.8340, 121.0080],
      [24.8400, 121.0140],
    ]),
  },
  {
    road_name: '竹北-自強三路',
    district: '竹北',
    work_date: '2025-11-05',
    culvert_type: '涵管(含1.5M涵管)清淤疏通',
    // TC6-TC5~TC1-TC-OUT 共7座
    length_m: 207.24,
    manhole_count: 7,
    cistern_count: 7,
    pipe_ids: 'TC6-TC5~TC1-TC-OUT',
    lat: 24.8169,
    lng: 121.0176,
    polyline_json: JSON.stringify([
      [24.8143, 121.0163],
      [24.8196, 121.0200],
    ]),
  },
  {
    road_name: '竹北-莊敬南路',
    district: '竹北',
    work_date: '2025-11-05',
    culvert_type: '涵管(含1.5M涵管)清淤疏通',
    // TB3-TB2~TB1-TB-OUT 共4座
    length_m: 199.67,
    manhole_count: 4,
    cistern_count: 4,
    pipe_ids: 'TB3-TB2~TB1-TB-OUT',
    lat: 24.8175,
    lng: 121.0201,
    polyline_json: JSON.stringify([
      [24.8126, 121.0181],
      [24.8224, 121.0221],
    ]),
  },
  {
    road_name: '竹北-自強五路',
    district: '竹北',
    work_date: '2025-11-05',
    culvert_type: '涵管(含1.5M涵管)清淤疏通',
    // TA3-TA2~TA1-TA-OUT 共4座
    length_m: 224.69,
    manhole_count: 4,
    cistern_count: 4,
    pipe_ids: 'TA3-TA2~TA1-TA-OUT',
    lat: 24.8149,
    lng: 121.0215,
    polyline_json: JSON.stringify([
      [24.8111, 121.0196],
      [24.8187, 121.0234],
    ]),
  },

  // ── 114年10月20日 工作通知單(新豐) — 新豐C幹線 ─────────────────────────
  {
    road_name: '新豐-新興路',
    district: '新豐',
    work_date: '2025-10-20',
    culvert_type: '涵管/箱涵清淤疏通',
    // N1075-002-001 ~ N1076-001-R02 共7座，各段長度加總
    length_m: 686.10,
    manhole_count: 7,
    cistern_count: 7,
    pipe_ids: 'N1075-002-001~N1076-001-R02',
    lat: 24.9182,
    lng: 121.0008,
    polyline_json: JSON.stringify([
      [24.9150, 120.9980],
      [24.9214, 121.0036],
    ]),
  },

  // ── 114年11月06日 工作通知單(新埔) ──────────────────────────────────────
  {
    road_name: '新埔-廣和路',
    district: '新埔',
    work_date: '2025-11-06',
    culvert_type: '箱涵清淤疏通(含1.3M涵管)',
    // N2069-F02-2068-025 ~ N2068-028-F02 共8段，4座箱涵
    length_m: 272.00,
    manhole_count: 4,
    cistern_count: 4,
    pipe_ids: 'N2069-F02~N2068-028-F02',
    lat: 24.8440,
    lng: 121.0730,
    polyline_json: JSON.stringify([
      [24.8415, 121.0710],
      [24.8465, 121.0750],
    ]),
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

    // 刪除舊的 114年資料（避免重複）
    await db.run("DELETE FROM dredging_routes WHERE year = '114'")

    // 插入全部 114年資料
    let inserted = 0
    for (const r of ROUTES_114) {
      await db.run(
        `INSERT INTO dredging_routes
           (year, work_date, district, road_name, culvert_type,
            length_m, manhole_count, cistern_count, pipe_ids,
            lat, lng, polyline_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          '114', r.work_date, r.district, r.road_name, r.culvert_type,
          r.length_m, r.manhole_count, r.cistern_count, r.pipe_ids,
          r.lat, r.lng, r.polyline_json,
        ]
      )
      inserted++
    }

    // 驗證
    const count114 = await db.get(
      "SELECT COUNT(*) as cnt FROM dredging_routes WHERE year = '114'"
    ) as { cnt: number }

    return NextResponse.json({
      success: true,
      message: `已成功匯入 114年清淤路段 ${inserted} 條`,
      count_114: count114.cnt,
      routes: ROUTES_114.map(r => ({ road: r.road_name, district: r.district, length_m: r.length_m })),
    })
  } catch (error) {
    console.error('import-dredging-114 error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
