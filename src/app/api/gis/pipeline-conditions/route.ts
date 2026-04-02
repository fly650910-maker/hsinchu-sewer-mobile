import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// 竹北市道路近似座標表（WGS84）
const ROAD_COORDS: Record<string, [number, number, number, number]> = {
  // [lat1, lng1, lat2, lng2]  — 以路的兩端或中點+偏移估計
  '光明六路東二段': [24.8315, 120.9998, 24.8315, 121.0085],
  '光明六路':       [24.8330, 121.0040, 24.8330, 121.0110],
  '光明五街':       [24.8380, 121.0072, 24.8380, 121.0120],
  '中華路':         [24.8370, 120.9958, 24.8370, 121.0010],
  '中華路977巷':    [24.8355, 120.9968, 24.8355, 120.9998],
  '中華路957巷':    [24.8345, 120.9960, 24.8345, 120.9992],
  '中華路676巷':    [24.8320, 120.9952, 24.8320, 120.9975],
  '中正東路':       [24.8382, 120.9960, 24.8382, 121.0005],
  '中正東路335巷':  [24.8385, 120.9990, 24.8385, 121.0015],
  '興隆路一段':     [24.8448, 121.0098, 24.8448, 121.0165],
  '興隆路五段':     [24.8470, 121.0180, 24.8470, 121.0240],
  '嘉興路':         [24.8265, 121.0330, 24.8265, 121.0390],
  '嘉豐南路一段':   [24.8258, 121.0275, 24.8258, 121.0340],
  '嘉豐南路二段':   [24.8250, 121.0310, 24.8250, 121.0368],
  '嘉豐二街一段':   [24.8245, 121.0285, 24.8245, 121.0330],
  '嘉豐五路一段':   [24.8242, 121.0295, 24.8242, 121.0352],
  '嘉豐五路二段':   [24.8235, 121.0300, 24.8235, 121.0355],
  '嘉豐六路一段':   [24.8238, 121.0305, 24.8238, 121.0360],
  '嘉豐北街':       [24.8260, 121.0295, 24.8260, 121.0335],
  '嘉政九街':       [24.8248, 121.0315, 24.8248, 121.0355],
  '嘉勤南路':       [24.8255, 121.0340, 24.8255, 121.0378],
  '環北路一段':     [24.8468, 121.0058, 24.8468, 121.0130],
  '莊敬三路':       [24.8452, 121.0125, 24.8452, 121.0175],
  '莊敬五街':       [24.8445, 121.0108, 24.8445, 121.0155],
  '莊敬六街':       [24.8440, 121.0100, 24.8440, 121.0148],
  '莊敬七街':       [24.8435, 121.0095, 24.8435, 121.0140],
  '莊敬南路':       [24.8425, 121.0088, 24.8425, 121.0130],
  '成功六街':       [24.8340, 121.0035, 24.8340, 121.0095],
  '成功三路':       [24.8355, 121.0020, 24.8355, 121.0075],
  '成功八路':       [24.8370, 121.0050, 24.8370, 121.0112],
  '自強北路':       [24.8388, 121.0010, 24.8388, 121.0060],
  '自強南路':       [24.8328, 121.0008, 24.8328, 121.0055],
  '自強五路':       [24.8352, 121.0042, 24.8352, 121.0088],
  '自強六街':       [24.8345, 121.0038, 24.8345, 121.0080],
  '自強一街':       [24.8340, 121.0030, 24.8340, 121.0068],
  '縣政二路':       [24.8348, 121.0018, 24.8348, 121.0062],
  '縣政九路':       [24.8360, 121.0025, 24.8360, 121.0075],
  '仁孝街':         [24.8402, 121.0060, 24.8402, 121.0108],
  '博愛街':         [24.8418, 121.0042, 24.8418, 121.0088],
  '博愛南路':       [24.8410, 121.0038, 24.8410, 121.0082],
  '泰和路':         [24.8425, 121.0150, 24.8425, 121.0198],
  '文興路一段':     [24.8398, 121.0098, 24.8398, 121.0145],
  '文興路二段':     [24.8390, 121.0110, 24.8390, 121.0158],
  '隘口二路':       [24.8455, 121.0138, 24.8455, 121.0185],
  '隘口三街':       [24.8458, 121.0142, 24.8458, 121.0188],
  '十興路一段':     [24.8442, 121.0068, 24.8442, 121.0118],
  '復興三路':       [24.8412, 121.0072, 24.8412, 121.0118],
  '復興三路二段':   [24.8408, 121.0078, 24.8408, 121.0122],
  '福興一路':       [24.8382, 121.0148, 24.8382, 121.0192],
  '福興路755巷8弄': [24.8378, 121.0155, 24.8378, 121.0185],
  '游泳館旁泥土路': [24.8332, 121.0025, 24.8332, 121.0058],
}

function getRoadCoords(road: string): { lat: number; lng: number; lat2: number; lng2: number } | null {
  const c = ROAD_COORDS[road]
  if (c) return { lat: c[0], lng: c[1], lat2: c[2], lng2: c[3] }
  // Try prefix match
  for (const [key, val] of Object.entries(ROAD_COORDS)) {
    if (road.startsWith(key.substring(0, Math.min(key.length, 4)))) {
      return { lat: val[0], lng: val[1], lat2: val[2], lng2: val[3] }
    }
  }
  return null
}

export async function POST() {
  try {
    const db = await getDb()

    // 建立含 lat/lng 欄位的資料表
    await db.run(`
      CREATE TABLE IF NOT EXISTS pipeline_conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        p_no TEXT,
        town TEXT DEFAULT '竹北市',
        road_name TEXT,
        max_grade INTEGER DEFAULT 1,
        has_damage INTEGER DEFAULT 0,
        has_sedimentation INTEGER DEFAULT 0,
        has_crossing INTEGER DEFAULT 0,
        has_cable INTEGER DEFAULT 0,
        has_other INTEGER DEFAULT 0,
        cannot_survey INTEGER DEFAULT 0,
        issue_count INTEGER DEFAULT 0,
        issues_json TEXT,
        lat REAL,
        lng REAL,
        lat2 REAL,
        lng2 REAL,
        photo_count INTEGER DEFAULT 0,
        source TEXT DEFAULT '竹北縱走調查111年度'
      )
    `)
    await db.run('DELETE FROM pipeline_conditions')

    // 竹北縱走資料（從 xlsx 彙整後的結果）
    const roadData: Array<{
      road: string; damage: number; sediment: number; crossing: number;
      blocked: number; noSurvey: number; count: number
    }> = [
      { road: '光明六路東二段', damage: 4, sediment: 29, crossing: 31, blocked: 29, noSurvey: 0, count: 89 },
      { road: '中華路977巷', damage: 8, sediment: 20, crossing: 3, blocked: 10, noSurvey: 0, count: 29 },
      { road: '中正東路335巷', damage: 1, sediment: 26, crossing: 0, blocked: 2, noSurvey: 0, count: 27 },
      { road: '中華路', damage: 4, sediment: 22, crossing: 8, blocked: 3, noSurvey: 0, count: 22 },
      { road: '興隆路一段', damage: 2, sediment: 20, crossing: 16, blocked: 10, noSurvey: 0, count: 48 },
      { road: '嘉興路', damage: 2, sediment: 19, crossing: 3, blocked: 10, noSurvey: 0, count: 26 },
      { road: '光明六路', damage: 1, sediment: 14, crossing: 9, blocked: 19, noSurvey: 0, count: 31 },
      { road: '仁孝街', damage: 0, sediment: 15, crossing: 1, blocked: 8, noSurvey: 0, count: 18 },
      { road: '莊敬五街', damage: 0, sediment: 14, crossing: 2, blocked: 12, noSurvey: 0, count: 14 },
      { road: '莊敬三路', damage: 0, sediment: 14, crossing: 0, blocked: 6, noSurvey: 0, count: 14 },
      { road: '環北路一段', damage: 1, sediment: 12, crossing: 11, blocked: 11, noSurvey: 0, count: 45 },
      { road: '成功六街', damage: 1, sediment: 12, crossing: 3, blocked: 6, noSurvey: 0, count: 16 },
      { road: '莊敬六街', damage: 0, sediment: 10, crossing: 1, blocked: 8, noSurvey: 0, count: 14 },
      { road: '中華路957巷', damage: 0, sediment: 9, crossing: 0, blocked: 3, noSurvey: 0, count: 12 },
      { road: '嘉豐南路二段', damage: 1, sediment: 7, crossing: 0, blocked: 3, noSurvey: 0, count: 8 },
      { road: '博愛街', damage: 0, sediment: 7, crossing: 2, blocked: 4, noSurvey: 0, count: 17 },
      { road: '中正東路', damage: 1, sediment: 6, crossing: 1, blocked: 2, noSurvey: 0, count: 6 },
      { road: '成功八路', damage: 0, sediment: 6, crossing: 8, blocked: 3, noSurvey: 0, count: 33 },
      { road: '中華路676巷', damage: 0, sediment: 5, crossing: 0, blocked: 2, noSurvey: 0, count: 5 },
      { road: '自強北路', damage: 0, sediment: 5, crossing: 3, blocked: 2, noSurvey: 0, count: 16 },
      { road: '文興路一段', damage: 0, sediment: 5, crossing: 0, blocked: 0, noSurvey: 0, count: 14 },
      { road: '興隆路五段', damage: 0, sediment: 5, crossing: 1, blocked: 2, noSurvey: 0, count: 7 },
      { road: '莊敬七街', damage: 0, sediment: 4, crossing: 0, blocked: 6, noSurvey: 0, count: 8 },
      { road: '嘉政九街', damage: 1, sediment: 3, crossing: 0, blocked: 1, noSurvey: 0, count: 3 },
      { road: '嘉豐二街一段', damage: 0, sediment: 3, crossing: 0, blocked: 0, noSurvey: 0, count: 6 },
      { road: '嘉豐五路一段', damage: 0, sediment: 3, crossing: 1, blocked: 5, noSurvey: 0, count: 9 },
      { road: '縣政九路', damage: 0, sediment: 3, crossing: 2, blocked: 8, noSurvey: 0, count: 12 },
      { road: '成功三路', damage: 0, sediment: 3, crossing: 7, blocked: 13, noSurvey: 0, count: 25 },
      { road: '自強六街', damage: 0, sediment: 3, crossing: 0, blocked: 5, noSurvey: 0, count: 5 },
      { road: '自強五路', damage: 0, sediment: 3, crossing: 0, blocked: 4, noSurvey: 0, count: 9 },
      { road: '莊敬南路', damage: 0, sediment: 3, crossing: 0, blocked: 4, noSurvey: 0, count: 6 },
      { road: '隘口三街', damage: 0, sediment: 3, crossing: 0, blocked: 1, noSurvey: 0, count: 21 },
      { road: '復興三路', damage: 0, sediment: 3, crossing: 1, blocked: 3, noSurvey: 0, count: 11 },
      { road: '福興路755巷8弄', damage: 0, sediment: 2, crossing: 1, blocked: 4, noSurvey: 0, count: 9 },
      { road: '十興路一段', damage: 0, sediment: 2, crossing: 0, blocked: 0, noSurvey: 0, count: 12 },
      { road: '博愛南路', damage: 0, sediment: 2, crossing: 0, blocked: 1, noSurvey: 0, count: 2 },
      { road: '嘉豐六路一段', damage: 0, sediment: 2, crossing: 1, blocked: 4, noSurvey: 0, count: 11 },
      { road: '嘉豐五路二段', damage: 0, sediment: 2, crossing: 0, blocked: 0, noSurvey: 0, count: 4 },
      { road: '自強一街', damage: 2, sediment: 0, crossing: 0, blocked: 0, noSurvey: 0, count: 4 },
      { road: '嘉勤南路', damage: 0, sediment: 2, crossing: 0, blocked: 0, noSurvey: 0, count: 2 },
      { road: '游泳館旁泥土路', damage: 0, sediment: 2, crossing: 0, blocked: 0, noSurvey: 0, count: 3 },
      { road: '縣政二路', damage: 0, sediment: 1, crossing: 0, blocked: 4, noSurvey: 0, count: 4 },
      { road: '復興三路二段', damage: 0, sediment: 1, crossing: 0, blocked: 3, noSurvey: 0, count: 7 },
      { road: '嘉豐南路一段', damage: 0, sediment: 1, crossing: 0, blocked: 0, noSurvey: 0, count: 1 },
      { road: '自強南路', damage: 0, sediment: 1, crossing: 1, blocked: 4, noSurvey: 0, count: 6 },
      { road: '隘口二路', damage: 0, sediment: 1, crossing: 0, blocked: 0, noSurvey: 0, count: 25 },
      { road: '嘉豐北街', damage: 0, sediment: 1, crossing: 0, blocked: 0, noSurvey: 0, count: 1 },
      { road: '光明五街', damage: 5, sediment: 1, crossing: 5, blocked: 9, noSurvey: 0, count: 20 },
      { road: '文興路二段', damage: 1, sediment: 0, crossing: 0, blocked: 1, noSurvey: 0, count: 20 },
      { road: '泰和路', damage: 0, sediment: 0, crossing: 5, blocked: 0, noSurvey: 0, count: 10 },
      { road: '成功六街自強五路路口', damage: 0, sediment: 1, crossing: 0, blocked: 2, noSurvey: 0, count: 3 },
    ]

    let inserted = 0
    let noCoord = 0
    for (const r of roadData) {
      const coords = getRoadCoords(r.road)
      if (!coords) { noCoord++; continue }

      const totalIssues = r.damage + r.sediment + r.crossing + r.blocked + r.noSurvey
      // Grade: 3=嚴重(sediment>15 or damage>5), 2=中度, 1=輕微
      const grade = (r.sediment >= 15 || r.damage >= 5) ? 3 : (r.sediment >= 5 || r.damage >= 2) ? 2 : 1

      const issues = []
      if (r.sediment > 0) issues.push({ type: '淤積', count: r.sediment, grade: grade >= 3 ? 2 : 1 })
      if (r.damage > 0) issues.push({ type: '破損', count: r.damage, grade: grade >= 3 ? 2 : 1 })
      if (r.crossing > 0) issues.push({ type: '管線橫跨', count: r.crossing, grade: 1 })
      if (r.blocked > 0) issues.push({ type: '阻塞障礙', count: r.blocked, grade: 1 })

      await db.run(`
        INSERT INTO pipeline_conditions
          (p_no, town, road_name, max_grade, has_damage, has_sedimentation, has_crossing,
           has_cable, has_other, cannot_survey, issue_count, issues_json,
           lat, lng, lat2, lng2, photo_count)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `, [
        `竹北-${r.road}`, '竹北市', r.road, grade,
        r.damage > 0 ? 1 : 0,
        r.sediment > 0 ? 1 : 0,
        r.crossing > 0 ? 1 : 0,
        0, r.blocked > 0 ? 1 : 0, r.noSurvey > 0 ? 1 : 0,
        totalIssues, JSON.stringify(issues),
        coords.lat, coords.lng, coords.lat2, coords.lng2,
        r.count
      ])
      inserted++
    }

    const cnt = await db.get('SELECT COUNT(*) as n FROM pipeline_conditions') as any
    return NextResponse.json({ success: true, inserted, no_coords: noCoord, total: cnt.n })
  } catch (err) {
    console.error('pipeline-conditions POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = await getDb()

    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pipeline_conditions'"
    )

    if (!tableExists) {
      return NextResponse.json({ conditions: [], total: 0 })
    }

    const rows = await db.all(`
      SELECT p_no, town, road_name, max_grade,
             has_damage, has_sedimentation, has_crossing, has_cable,
             has_other, cannot_survey, issue_count, issues_json
      FROM pipeline_conditions
    `) as any[]

    const conditions = rows.map((r: any) => ({
      p_no: r.p_no,
      town: r.town,
      road_name: r.road_name,
      max_grade: r.max_grade,
      has_damage: r.has_damage === 1,
      has_sedimentation: r.has_sedimentation === 1,
      has_crossing: r.has_crossing === 1,
      has_cable: r.has_cable === 1,
      has_other: r.has_other === 1,
      cannot_survey: r.cannot_survey === 1,
      issue_count: r.issue_count,
      issues: r.issues_json ? JSON.parse(r.issues_json) : [],
    }))

    return NextResponse.json({ conditions, total: conditions.length })
  } catch (err) {
    console.error('pipeline-conditions API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
