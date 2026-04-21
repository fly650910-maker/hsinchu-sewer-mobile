import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Find nearby manholes
 * Query params:
 * - lat: latitude
 * - lng: longitude
 * - radius: distance in degrees (roughly 1 degree = 111 km)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '0.05'); // roughly 5.5 km

    if (lat === 0 || lng === 0) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Convert TWD97 coordinates to WGS84 (approx)
    // TWD97: add ~13000 to x (lng), subtract ~200000 from y (lat)
    // This is a simplified conversion for the nearby search

    // Query for nearby manholes within radius
    const query = `
      SELECT id, manhole_no, x, y, manhole_type, location, depth, area, system_type
      FROM manholes
      WHERE system_type = '污水'
        AND ABS(x - ?) < ?
        AND ABS(y - ?) < ?
      LIMIT 50
    `;

    const params = [lng, radius, lat, radius];
    const manholes = await db.all(query, params);

    // Convert to WGS84 for display
    const convertedManholes = manholes.map((m: any) => ({
      ...m,
      lat: m.y,
      lng: m.x
    }));

    return NextResponse.json({
      nearby: convertedManholes,
      count: convertedManholes.length
    });
  } catch (error) {
    console.error('Failed to find nearby manholes:', error);
    return NextResponse.json(
      { error: 'Failed to find nearby manholes' },
      { status: 500 }
    );
  }
}
