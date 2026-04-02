import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** 去除樓層/室後綴，只保留到「號」 */
function normalizeAddress(addr: string): string {
  if (!addr) return addr;
  const m = addr.match(/號/);
  if (m && m.index !== undefined) return addr.slice(0, m.index + 1);
  return addr.trim();
}

/** 使用 Nominatim 定位，回傳 [lat, lng] 或 null */
async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const base = normalizeAddress(address);
  try {
    const query = base.includes('新竹') ? base : '新竹縣' + base;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=tw&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SewerageGIS/1.0 (fly@hsinchu.gov.tw)',
        'Accept-Language': 'zh-TW',
      },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (lat > 20 && lat < 27 && lng > 118 && lng < 123) {
        return [lat, lng];
      }
    }
  } catch (e) {
    console.error('Geocode error for', address, e);
  }
  return null;
}

// Sleep helper
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const { batchSize = 30 } = await req.json().catch(() => ({}));
  const db = await getDb();

  // Get un-geocoded records — group by NORMALIZED address (without floor numbers)
  // to avoid re-querying the same building multiple times
  const allPending = await db.all(
    `SELECT DISTINCT usage_addr
     FROM household_connections
     WHERE lat IS NULL AND usage_addr != '' AND usage_addr IS NOT NULL
       AND (geocoded_at IS NULL OR geocoded_at NOT LIKE '%_failed')
     ORDER BY usage_addr`,
    []
  );

  // Deduplicate by normalized (floor-stripped) address in JS
  const seen = new Map<string, string>();
  for (const row of allPending) {
    const base = normalizeAddress(row.usage_addr);
    if (!seen.has(base)) seen.set(base, row.usage_addr);
  }
  const pending = Array.from(seen.values()).slice(0, batchSize);

  if (pending.length === 0) {
    const stats = await db.get(
      `SELECT COUNT(*) as total, SUM(CASE WHEN lat IS NOT NULL THEN 1 ELSE 0 END) as geocoded
       FROM household_connections`
    );
    return NextResponse.json({ message: 'All geocoded', processed: 0, stats });
  }

  let successCount = 0;
  const now = new Date().toISOString();

  for (const usage_addr of pending) {
    const base = normalizeAddress(usage_addr);
    const coords = await geocodeAddress(usage_addr);
    if (coords) {
      // Update ALL records whose address starts with the normalized base
      await db.run(
        `UPDATE household_connections
         SET lat = ?, lng = ?, geocoded_at = ?
         WHERE lat IS NULL AND (usage_addr = ? OR usage_addr LIKE ?)`,
        [coords[0], coords[1], now, base, base + '%']
      );
      successCount++;
    } else {
      // Mark as attempted so we don't keep retrying
      await db.run(
        `UPDATE household_connections SET geocoded_at = ?
         WHERE lat IS NULL AND (usage_addr = ? OR usage_addr LIKE ?)`,
        [now + '_failed', base, base + '%']
      );
    }
    // Nominatim rate limit: 1 request per second
    await sleep(1100);
  }

  const stats = await db.get(
    `SELECT COUNT(*) as total, SUM(CASE WHEN lat IS NOT NULL THEN 1 ELSE 0 END) as geocoded
     FROM household_connections`
  );

  return NextResponse.json({
    processed: pending.length,
    success: successCount,
    stats,
  });
}

export async function GET() {
  const db = await getDb();
  const stats = await db.get(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN lat IS NOT NULL THEN 1 ELSE 0 END) as geocoded,
            COUNT(DISTINCT usage_addr) as unique_addrs,
            SUM(CASE WHEN lat IS NULL AND geocoded_at IS NULL THEN 1 ELSE 0 END) as pending
     FROM household_connections`
  );
  return NextResponse.json(stats);
}
