import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const db = await getDb()

    // 建立資料表
    await db.run(`
      CREATE TABLE IF NOT EXISTS water_bank_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, town TEXT DEFAULT '竹北市',
        segment TEXT, village TEXT,
        lat REAL NOT NULL, lng REAL NOT NULL,
        existing_buildings INTEGER DEFAULT 0,
        existing_households INTEGER DEFAULT 0,
        existing_storage_m3 INTEGER DEFAULT 0,
        recommended_add_m3 INTEGER DEFAULT 0,
        total_capacity_m3 INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 2,
        node_type TEXT, land_status TEXT,
        nearby_flood_hotspot TEXT, note TEXT,
        source TEXT DEFAULT '都市計畫審議計畫書(91-101年度)',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // 清除舊資料
    await db.run('DELETE FROM water_bank_nodes')

    const nodes = [
      { name: '竹北市公園段體育公園地下調蓄池', segment: '公園段', village: '中正里', lat: 24.8353, lng: 121.0085, existing_buildings: 3, existing_households: 0, existing_storage_m3: 0, recommended_add_m3: 5000, total_capacity_m3: 5000, priority: 3, node_type: '地下調蓄池＋地面滯洪草溝', land_status: '公有地（縣政府）', nearby_flood_hotspot: '成功六街、光明六路', note: '面積160,857m²，竹北最大公有開放空間。緊鄰DD幹線，設5000m³地下調蓄池最優先。' },
      { name: '竹北六家台科大特定區截流節點', segment: '台科段/大學段', village: '六家里', lat: 24.8368, lng: 121.0272, existing_buildings: 15, existing_households: 1200, existing_storage_m3: 360, recommended_add_m3: 2500, total_capacity_m3: 2860, priority: 3, node_type: '分散型地下儲水桶＋透水鋪面', land_status: '建案開放空間（審議義務）', nearby_flood_hotspot: '自強南路DD系統上游', note: '91-101年度審議15件第一種住宅區集中於此。新建案強制設置雨水儲留設施。' },
      { name: '竹北高鐵特定區站前調蓄節點', segment: '永興段/家興段', village: '篤行里', lat: 24.8422, lng: 121.0185, existing_buildings: 12, existing_households: 980, existing_storage_m3: 294, recommended_add_m3: 2000, total_capacity_m3: 2294, priority: 3, node_type: '站前廣場地下調蓄池', land_status: '公有（高鐵站區）＋私有建案', nearby_flood_hotspot: '成功六街109年度改善區段', note: '高鐵站前廣場大面積不透水鋪面，峰值逕流量大。設2000m³截流型調蓄池。' },
      { name: '竹北縣政廊道自強路截流節點', segment: '自強段/翰林段', village: '縣政里', lat: 24.8335, lng: 121.0062, existing_buildings: 11, existing_households: 860, existing_storage_m3: 258, recommended_add_m3: 1500, total_capacity_m3: 1758, priority: 2, node_type: '線型截流設施＋透水人行道', land_status: '道路用地（縣政府）', nearby_flood_hotspot: '自強南路DD28-DD33', note: '111-112年度DD幹線施工廊道。配合施工同步設線型截流設施。' },
      { name: '竹北世興生醫園區雨水回收示範節點', segment: '世興段', village: '新社里', lat: 24.8292, lng: 121.0282, existing_buildings: 1, existing_households: 0, existing_storage_m3: 0, recommended_add_m3: 1800, total_capacity_m3: 1800, priority: 2, node_type: '屋頂集水系統＋地面滲透花園', land_status: '機構用地（準公有）', nearby_flood_hotspot: '縣政二路110年度改善區段', note: '生醫科技研究中心基地33,020m²。大型屋頂集水供實驗室緩衝冷卻水及景觀澆灌。' },
      { name: '竹北水瀧段工業區離線滯洪池', segment: '水瀧段', village: '嘉興里', lat: 24.8248, lng: 121.0358, existing_buildings: 2, existing_households: 0, existing_storage_m3: 0, recommended_add_m3: 3000, total_capacity_m3: 3000, priority: 2, node_type: '離線開放式調蓄滯洪池', land_status: '私有（工業區）', nearby_flood_hotspot: '頭前溪北岸低漥地區', note: '水瀧段歷史低漥，工業廠房屋頂面積42,412m²。離線滯洪池保護頭前溪沿岸。' },
      { name: '竹北莊敬翰林段住宅分散型節點', segment: '莊敬段/翰林段', village: '竹仁里', lat: 24.8478, lng: 121.0108, existing_buildings: 14, existing_households: 1050, existing_storage_m3: 315, recommended_add_m3: 1200, total_capacity_m3: 1515, priority: 1, node_type: '分散型屋頂雨水桶＋社區植草溝', land_status: '建案義務設置', nearby_flood_hotspot: '竹北市北側規劃幹線沿線', note: '莊敬段、翰林段近年快速發展。審議條件納入每棟≥5噸屋頂雨水桶。' },
    ]

    for (const n of nodes) {
      await db.run(`
        INSERT INTO water_bank_nodes
          (name,town,segment,village,lat,lng,
           existing_buildings,existing_households,existing_storage_m3,
           recommended_add_m3,total_capacity_m3,
           priority,node_type,land_status,nearby_flood_hotspot,note)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [n.name, '竹北市', n.segment, n.village, n.lat, n.lng,
          n.existing_buildings, n.existing_households, n.existing_storage_m3,
          n.recommended_add_m3, n.total_capacity_m3,
          n.priority, n.node_type, n.land_status, n.nearby_flood_hotspot, n.note])
    }

    const countResult = await db.get('SELECT COUNT(*) as cnt FROM water_bank_nodes') as { cnt: number }
    return NextResponse.json({ success: true, inserted: nodes.length, total: countResult.cnt })
  } catch (err) {
    console.error('water-bank-nodes POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = await getDb()

    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='water_bank_nodes'"
    )

    if (!tableExists) {
      return NextResponse.json({ nodes: [], total: 0 })
    }

    const rows = await db.all(`
      SELECT id, name, town, segment, village, lat, lng,
             existing_buildings, existing_households, existing_storage_m3,
             recommended_add_m3, total_capacity_m3,
             priority, node_type, land_status,
             nearby_flood_hotspot, note
      FROM water_bank_nodes
      WHERE lat IS NOT NULL AND lng IS NOT NULL
      ORDER BY priority DESC, total_capacity_m3 DESC
    `) as Array<{
      id: number; name: string; town: string; segment: string; village: string
      lat: number; lng: number
      existing_buildings: number; existing_households: number; existing_storage_m3: number
      recommended_add_m3: number; total_capacity_m3: number
      priority: number; node_type: string; land_status: string
      nearby_flood_hotspot: string; note: string
    }>

    return NextResponse.json({ nodes: rows, total: rows.length })
  } catch (err) {
    console.error('water-bank-nodes API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
