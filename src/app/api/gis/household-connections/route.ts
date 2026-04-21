import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const minLat = parseFloat(params.get('min_lat') || '24.6');
  const maxLat = parseFloat(params.get('max_lat') || '25.0');
  const minLng = parseFloat(params.get('min_lng') || '120.8');
  const maxLng = parseFloat(params.get('max_lng') || '121.2');

  try {
    const db = await getDb();

    // Fetch geocoded household connections in current viewport
    const rows = await db.all(
      `SELECT id, water_no, source, usage_addr, sheet, lat, lng
       FROM household_connections
       WHERE lat IS NOT NULL AND lng IS NOT NULL
         AND lat BETWEEN ? AND ?
         AND lng BETWEEN ? AND ?
       LIMIT 3000`,
      [minLat, maxLat, minLng, maxLng]
    );

    // Also return stats
    const stats = await db.get(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN lat IS NOT NULL THEN 1 ELSE 0 END) as geocoded
       FROM household_connections`
    );

    return NextResponse.json({ households: rows, stats });
  } catch (error) {
    console.error('Household connections error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
