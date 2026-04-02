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
    
    await db.run('DELETE FROM complaints WHERE id = ?', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete complaint:', error);
    return NextResponse.json({ error: 'Failed to delete complaint' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { status, resolution_notes } = await request.json();
    const db = await getDb();
    
    const resolved_at = status === 'resolved' ? new Date().toISOString() : null;

    await db.run(
      'UPDATE complaints SET status = ?, resolution_notes = ?, resolved_at = ? WHERE id = ?',
      [status, resolution_notes || '', resolved_at, id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update complaint:', error);
    return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
  }
}
