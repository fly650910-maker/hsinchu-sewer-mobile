import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── 記憶體快取 ─────────────────────────────────────────────
// 第一次查詢時從 DB 載入所有接管記錄，之後純記憶體搜尋
interface CachedRecord {
  id: number;
  water_no: string;
  source: string;
  usage_addr: string;
  delivery_addr: string;
  sheet: string;
  postal_code: string;
  _combined: string; // usage_addr + delivery_addr 合併，搜尋用
}

let cache: CachedRecord[] | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小時後重新載入

async function getCache(): Promise<CachedRecord[]> {
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;

  const db = await getDb();
  const rows: any[] = await db.all(
    `SELECT id, water_no, source, usage_addr, delivery_addr, sheet, postal_code
     FROM household_connections
     ORDER BY usage_addr`,
    []
  );

  cache = rows.map((r: any) => ({
    id: Number(r.id),
    water_no: r.water_no ?? '',
    source: r.source ?? '',
    usage_addr: r.usage_addr ?? '',
    delivery_addr: r.delivery_addr ?? '',
    sheet: r.sheet ?? '',
    postal_code: r.postal_code ?? '',
    _combined: `${r.usage_addr ?? ''}|${r.delivery_addr ?? ''}`,
  }));
  cacheLoadedAt = now;

  console.log(`[check-connection] 快取已載入 ${cache.length} 筆接管記錄`);
  return cache;
}

export async function GET(req: NextRequest) {
  const addr = req.nextUrl.searchParams.get('addr')?.trim();
  if (!addr || addr.length < 3) {
    return NextResponse.json({ error: '請輸入至少 3 個字的地址' }, { status: 400 });
  }

  const records = await getCache();

  // 產生關鍵字列表（由精確到模糊）
  const keywords = buildKeywords(addr);

  let matched: CachedRecord[] = [];
  let usedKeyword = '';

  for (const kw of keywords) {
    const hits = records.filter(r => r._combined.includes(kw));
    if (hits.length > 0) {
      matched = hits;
      usedKeyword = kw;
      break;
    }
  }

  return NextResponse.json({
    connected: matched.length > 0,
    count: matched.length,
    records: matched.slice(0, 20),
    total: matched.length,
    query: usedKeyword,
    input: addr,
  });
}

/**
 * 從地址產生多種查詢關鍵字，由精確到模糊
 * 例：新竹縣竹北市縣政二路237號 → ["縣政二路237號", "縣政二路237", "縣政二路"]
 */
function buildKeywords(addr: string): string[] {
  const results: string[] = [];

  // 1. 路名 + 門牌號碼（最精確）
  const roadWithNo = addr.match(/([^\s縣市鄉鎮區里鄰]{2,}(?:路|街|道|巷|弄)\w*\d+號)/);
  if (roadWithNo) {
    const base = roadWithNo[1].replace(/\d+[樓層F].*$/, '').replace(/[之-]\d+[號]?$/, '');
    if (base.length >= 3) results.push(base);
  }

  // 2. 路名 + 數字（不含號）
  const roadWithNum = addr.match(/([^\s縣市鄉鎮區里鄰]{2,}(?:路|街|道|巷|弄)\w*\d+)/);
  if (roadWithNum && !results.includes(roadWithNum[1])) {
    results.push(roadWithNum[1]);
  }

  // 3. 路名
  const roadOnly = addr.match(/([^\s縣市鄉鎮區里鄰]{2,}(?:路|街|道|巷|弄)[一二三四五六七八九十段]*)/);
  if (roadOnly) {
    const rn = roadOnly[1];
    if (rn.length >= 3 && !results.includes(rn)) results.push(rn);
  }

  // 4. 去縣市鄉鎮後的地址
  const stripped = addr
    .replace(/^(台灣|臺灣)?[\u4e00-\u9fa5]{2,3}[縣市]/, '')
    .replace(/^[\u4e00-\u9fa5]{2,4}[鄉鎮市區]/, '')
    .replace(/^[\u4e00-\u9fa5]{1,4}[里鄰]/, '')
    .trim();
  if (stripped.length >= 3 && !results.includes(stripped)) results.push(stripped);

  // 5. 原始輸入備用
  if (!results.includes(addr)) results.push(addr);

  return results.filter(k => k.length >= 3);
}
