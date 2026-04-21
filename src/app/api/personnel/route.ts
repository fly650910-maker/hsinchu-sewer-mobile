import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const personnel = await db.all('SELECT * FROM personnel ORDER BY created_at DESC');
    return NextResponse.json(personnel);
  } catch (error) {
    console.error('Failed to fetch personnel:', error);
    return NextResponse.json({ error: 'Failed to fetch personnel' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, title, responsibilities, phone_ext } = body;
    
    if (!name || !title || !responsibilities) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO personnel (name, title, responsibilities, phone_ext) VALUES (?, ?, ?, ?)',
      [name, title, responsibilities, phone_ext || '']
    );

    const newPerson = await db.get('SELECT * FROM personnel WHERE id = ?', result.lastID);
    return NextResponse.json(newPerson, { status: 201 });
  } catch (error) {
    console.error('Failed to create personnel:', error);
    return NextResponse.json({ error: 'Failed to create personnel' }, { status: 500 });
  }
}
