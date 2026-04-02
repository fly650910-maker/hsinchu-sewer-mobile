import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import proj4 from 'proj4';

export const dynamic = 'force-dynamic';

// EPSG:3826 = TWD97 / TM2 zone 121
proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get('q') || '';

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const db = await getDb();
    
    const twd97ToWgs84 = (x: number, y: number): [number, number] => {
      const [lng, lat] = proj4('EPSG:3826', 'EPSG:4326', [x, y]);
      return [lat, lng];
    };

    // 1. Search local assets (manholes) by location description
    let localMatches: any[] = [];
    try {
      const rawLocalMatches = await db.all(
        `SELECT DISTINCT location as title, x, y, 'asset' as type
         FROM manholes_unique 
         WHERE location LIKE ? AND location IS NOT NULL AND location != ''
         LIMIT 10`,
        [`%${q}%`]
      );

      localMatches = rawLocalMatches.map(m => {
        const [lat, lng] = twd97ToWgs84(m.x, m.y);
        return { title: m.title, lat, lng, type: 'asset' };
      });
    } catch (e) {
      console.error('Local asset search error:', e);
    }

    // 2. Fetch external suggestions from Nominatim (OpenStreetMap)
    let osmMatches: any[] = [];
    try {
      const osmQuery = q.includes('新竹') ? q : `${q}, 新竹, 台灣`;
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(osmQuery)}&countrycodes=tw&limit=5`,
        {
          headers: {
            'Accept-Language': 'zh-TW',
            'User-Agent': 'SewerageManagementSystem/1.0'
          },
          signal: AbortSignal.timeout(3000) // 3s timeout
        }
      );
      
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        osmMatches = osmData.map((item: any) => ({
          title: item.display_name.split(',')[0],
          subtitle: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: 'address'
        }));
      }
    } catch (e) {
      console.error('OSM suggestions error:', e);
    }

    // Combine and return
    const combined = [...localMatches, ...osmMatches];
    return NextResponse.json(combined);
  } catch (error) {
    console.error('Search suggestions top-level error:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
