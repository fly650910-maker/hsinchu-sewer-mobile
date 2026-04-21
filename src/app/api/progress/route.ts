import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const projects = await db.all('SELECT * FROM projects ORDER BY created_at DESC');
    return NextResponse.json(projects);
  } catch (error: any) {
    // projects 表尚未建立 → 回空陣列
    if (String(error).includes('no such table')) {
      return NextResponse.json([]);
    }
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, status, progress_percent, contractor, start_date, end_date, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y } = body;
    
    if (!name || !type || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO projects (name, type, status, progress_percent, contractor, start_date, end_date, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, type, status, progress_percent || 0, contractor || '', start_date || null, end_date || null, bbox_min_x || null, bbox_min_y || null, bbox_max_x || null, bbox_max_y || null]
    );

    const newProject = await db.get('SELECT * FROM projects WHERE id = ?', result.lastID);
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
