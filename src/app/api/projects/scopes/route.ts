import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    
    // Fetch all projects that have a valid bounding box
    const projects = await db.all(`
      SELECT id, name, type, status, progress_percent, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y
      FROM projects
      WHERE bbox_min_x IS NOT NULL AND bbox_max_x IS NOT NULL AND bbox_min_y IS NOT NULL AND bbox_max_y IS NOT NULL
    `);

    return NextResponse.json(projects);
  } catch (error: any) {
    // projects 表尚未建立 → 回空陣列讓前端正常渲染,不要吐 500
    if (String(error).includes('no such table')) {
      return NextResponse.json([]);
    }
    console.error('Failed to parse scopes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
