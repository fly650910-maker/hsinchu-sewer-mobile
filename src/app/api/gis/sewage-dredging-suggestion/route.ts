import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

const BUDGET_TOTAL = 8_000_000 // 800萬（污水清疏預算）

// 污水清疏單價（元）
const UNIT_COST: Record<string, number> = {
  '污水主管': 600,   // 元/m (高壓清洗)
  '污水支管': 400,   // 元/m
  '人孔':     3_000, // 元/座
}

/**
 * 115年污水建議清淤管段
 * 依據：110~114年工作通知單塞管熱點分析（重複通報 ≥3 次路段）
 * 以及管線 TV 淤積調查資料輔助排序
 */
const SEWAGE_CANDIDATES = [
  // ── 竹東 ──
  {
    id: 'sw-zd-01',
    district: '竹東',
    road_name: '竹東-大同路污水主管',
    pipe_type: '污水主管' as const,
    estimated_length_m: 520,
    manhole_count: 6,
    lat: 24.7368, lng: 121.0895,
    priority: 'high' as const,
    score: 95,
    repeat_count: 6,
    reason: '大同路61號重複通報塞管6次（五年最高），為竹東污水主幹管沿線，管齡逾15年，高壓清洗後應安排CCTV健檢評估是否需換管',
    basis: ['塞管熱點(6次)', '管線淤積'],
  },
  {
    id: 'sw-zd-02',
    district: '竹東',
    road_name: '竹東-大明路污水支管',
    pipe_type: '污水支管' as const,
    estimated_length_m: 380,
    manhole_count: 4,
    lat: 24.7302, lng: 121.0945,
    priority: 'high' as const,
    score: 88,
    repeat_count: 4,
    reason: '大明路233號重複通報4次（110～112年均有），沿線支管油脂累積嚴重，建議優先列入汛前清疏',
    basis: ['塞管熱點(4次)'],
  },
  {
    id: 'sw-zd-03',
    district: '竹東',
    road_name: '竹東-光武街污水支管',
    pipe_type: '污水支管' as const,
    estimated_length_m: 320,
    manhole_count: 4,
    lat: 24.7342, lng: 121.0848,
    priority: 'high' as const,
    score: 82,
    repeat_count: 3,
    reason: '光武街74號重複通報3次（110、112、113年），管線坡度不足，油脂沉積後加速堵塞',
    basis: ['塞管熱點(3次)'],
  },
  {
    id: 'sw-zd-04',
    district: '竹東',
    road_name: '竹東-興農街污水支管',
    pipe_type: '污水支管' as const,
    estimated_length_m: 280,
    manhole_count: 3,
    lat: 24.7256, lng: 121.0912,
    priority: 'medium' as const,
    score: 75,
    repeat_count: 3,
    reason: '興農街121巷重複通報3次（112、113、114年），近年件數增加，應於115年汛前完成清疏',
    basis: ['塞管熱點(3次)'],
  },
  // ── 竹北 ──
  {
    id: 'sw-zb-01',
    district: '竹北',
    road_name: '竹北-縣政三街污水主管',
    pipe_type: '污水主管' as const,
    estimated_length_m: 460,
    manhole_count: 5,
    lat: 24.8338, lng: 121.0108,
    priority: 'high' as const,
    score: 90,
    repeat_count: 4,
    reason: '縣政三街26號重複通報4次（111～113年），位於縣政特區核心，沿線餐飲業密集，油脂截流不足為主因，建議清疏並同步稽查截油槽',
    basis: ['塞管熱點(4次)', '餐飲截油槽'],
  },
  {
    id: 'sw-zb-02',
    district: '竹北',
    road_name: '竹北-自強南路污水主管',
    pipe_type: '污水主管' as const,
    estimated_length_m: 550,
    manhole_count: 6,
    lat: 24.8318, lng: 121.0092,
    priority: 'high' as const,
    score: 87,
    repeat_count: 4,
    reason: '自強南路141號(東林炒羊肉)重複通報4次（111、112年），為餐飲業密集路段，油脂長期累積於主管，需高壓清洗並要求業者清掏截油槽',
    basis: ['塞管熱點(4次)', '餐飲油脂'],
  },
  {
    id: 'sw-zb-03',
    district: '竹北',
    road_name: '竹北-仁德街污水支管',
    pipe_type: '污水支管' as const,
    estimated_length_m: 350,
    manhole_count: 4,
    lat: 24.8401, lng: 121.0048,
    priority: 'high' as const,
    score: 85,
    repeat_count: 4,
    reason: '仁德街11號重複通報4次（112、113年），為老舊社區，管線接頭鬆脫加上油脂累積，建議清疏後安排CCTV複查',
    basis: ['塞管熱點(4次)', '管線老化'],
  },
  {
    id: 'sw-zb-04',
    district: '竹北',
    road_name: '竹北-四維街污水支管',
    pipe_type: '污水支管' as const,
    estimated_length_m: 290,
    manhole_count: 3,
    lat: 24.8365, lng: 121.0082,
    priority: 'medium' as const,
    score: 76,
    repeat_count: 3,
    reason: '四維街229號重複通報3次（112、113、114年），管線老化，近年件數持續，建議納入115年清疏計畫',
    basis: ['塞管熱點(3次)'],
  },
  {
    id: 'sw-zb-05',
    district: '竹北',
    road_name: '竹北-福興路污水支管',
    pipe_type: '污水支管' as const,
    estimated_length_m: 310,
    manhole_count: 3,
    lat: 24.8432, lng: 121.0058,
    priority: 'medium' as const,
    score: 73,
    repeat_count: 3,
    reason: '福興路748號前重複通報3次（112、113、114年），沿線住宅區，生活油脂為主要原因，建議定期清疏並配合宣導',
    basis: ['塞管熱點(3次)'],
  },
  {
    id: 'sw-zb-06',
    district: '竹北',
    road_name: '竹北-光明一路污水主管',
    pipe_type: '污水主管' as const,
    estimated_length_m: 480,
    manhole_count: 5,
    lat: 24.8285, lng: 121.0095,
    priority: 'medium' as const,
    score: 70,
    repeat_count: 3,
    reason: '光明一路沿線燒肉店、牛排館密集（大股燒肉、開飯食堂、飯飯燒肉等），歷年油脂塞管通報集中，為餐飲業截油槽稽查重點路段',
    basis: ['餐飲油脂', '塞管熱點(3次)'],
  },
  {
    id: 'sw-zb-07',
    district: '竹北',
    road_name: '竹北-成功十街污水支管',
    pipe_type: '污水支管' as const,
    estimated_length_m: 260,
    manhole_count: 3,
    lat: 24.8312, lng: 121.0145,
    priority: 'medium' as const,
    score: 67,
    repeat_count: 3,
    reason: '成功十街1號重複通報3次（112、113、114年），連續三年均有通報，管線應已有沉積，建議納入汛前清疏',
    basis: ['塞管熱點(3次)'],
  },
]

export async function GET() {
  try {
    const db = await getDb()

    // 嘗試取得鄰近管線資料供座標校正（非必要，失敗不影響結果）
    let pipeSegs: Array<{ up_lat: number; up_lng: number; dn_lat: number; dn_lng: number }> = []
    try {
      pipeSegs = await db.all(`
        SELECT mu.lat_wgs84 AS up_lat, mu.lng_wgs84 AS up_lng,
               md.lat_wgs84 AS dn_lat, md.lng_wgs84 AS dn_lng
        FROM   pipelines p
        JOIN   manholes_unique mu ON mu.manhole_no = p.upstream_node   AND mu.lat_wgs84 IS NOT NULL
        JOIN   manholes_unique md ON md.manhole_no = p.downstream_node AND md.lat_wgs84 IS NOT NULL
      `)
    } catch { /* 無管線資料時跳過 */ }

    // 預算分配：依優先分數排序，直到額度用完
    const sorted = [...SEWAGE_CANDIDATES].sort((a, b) => b.score - a.score)
    let budgetUsed = 0
    const selected: Array<typeof SEWAGE_CANDIDATES[number] & {
      unit_cost: number; total_cost: number; cumulative_cost: number
    }> = []

    for (const c of sorted) {
      const unitCost = UNIT_COST[c.pipe_type] ?? 500
      const pipeCost = c.estimated_length_m * unitCost
      const manholeCost = c.manhole_count * UNIT_COST['人孔']
      const total = Math.round((pipeCost + manholeCost) * 1.15) // 含15%備用金

      if (budgetUsed + total > BUDGET_TOTAL) continue

      budgetUsed += total
      selected.push({
        ...c,
        unit_cost: unitCost,
        total_cost: Math.round(total / 10000),         // 萬元
        cumulative_cost: Math.round(budgetUsed / 10000),
      })
    }

    return NextResponse.json({
      suggestions: selected,
      total: selected.length,
      budget_total_wan: BUDGET_TOTAL / 10000,
      budget_used_wan: Math.round(budgetUsed / 10000),
      budget_remaining_wan: Math.round((BUDGET_TOTAL - budgetUsed) / 10000),
      total_length_m: selected.reduce((s, r) => s + r.estimated_length_m, 0),
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[sewage-dredging-suggestion]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
