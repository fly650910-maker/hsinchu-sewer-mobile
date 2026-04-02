import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'pipelines'; // pipelines or manholes
    const q = searchParams.get('q') || '';
    const area = searchParams.get('area') || '';
    const systemType = searchParams.get('systemType') || '污水'; // 污水 or 雨水
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    const db = await getDb();

    if (type === 'manholes') {
      let where = 'system_type = ?';
      const params: string[] = [systemType];
      if (q) {
        where += ' AND (manhole_no LIKE ? OR location LIKE ? OR project_name LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      if (area) {
        where += ' AND area = ?';
        params.push(area);
      }

      const countResult = await db.get(`SELECT COUNT(*) as total FROM manholes WHERE ${where}`, params);
      const rows = await db.all(`SELECT * FROM manholes WHERE ${where} ORDER BY id LIMIT ? OFFSET ?`, [...params, limit, offset]);
      return NextResponse.json({ total: countResult.total, data: rows, page, limit });
    } else {
      let where = 'system_type = ?';
      const params: string[] = [systemType];
      if (q) {
        where += ' AND (sewer_no LIKE ? OR project_name LIKE ? OR material LIKE ? OR contractor LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }
      if (area) {
        where += ' AND area = ?';
        params.push(area);
      }

      const countResult = await db.get(`SELECT COUNT(*) as total FROM pipelines WHERE ${where}`, params);
      const rows = await db.all(`SELECT * FROM pipelines WHERE ${where} ORDER BY id LIMIT ? OFFSET ?`, [...params, limit, offset]);
      return NextResponse.json({ total: countResult.total, data: rows, page, limit });
    }
  } catch (error) {
    console.error('Failed to query GIS data:', error);
    return NextResponse.json({ error: 'Failed to query GIS data' }, { status: 500 });
  }
}
