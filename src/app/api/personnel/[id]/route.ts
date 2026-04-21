import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const db = await getDb();

    const existing = await db.get('SELECT id FROM personnel WHERE id = ?', id);
    if (!existing) {
      return NextResponse.json({ error: 'Personnel not found' }, { status: 404 });
    }

    await db.run('DELETE FROM personnel WHERE id = ?', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete personnel:', error);
    return NextResponse.json({ error: 'Failed to delete personnel' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { name, title, responsibilities, phone_ext } = body;

    if (!name || !title || !responsibilities) {
      return NextResponse.json({ error: 'Missing required fields: name, title, responsibilities' }, { status: 400 });
    }

    const db = await getDb();

    const existing = await db.get('SELECT id FROM personnel WHERE id = ?', id);
    if (!existing) {
      return NextResponse.json({ error: 'Personnel not found' }, { status: 404 });
    }

    await db.run(
      'UPDATE personnel SET name = ?, title = ?, responsibilities = ?, phone_ext = ? WHERE id = ?',
      [name, title, responsibilities, phone_ext || '', id]
    );

    const updatedPerson = await db.get('SELECT * FROM personnel WHERE id = ?', id);
    return NextResponse.json(updatedPerson);
  } catch (error) {
    console.error('Failed to update personnel:', error);
    return NextResponse.json({ error: 'Failed to update personnel' }, { status: 500 });
  }
}
