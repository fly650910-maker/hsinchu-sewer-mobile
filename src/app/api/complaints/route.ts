import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const complaints = await db.all('SELECT * FROM complaints ORDER BY reported_at DESC');
    return NextResponse.json(complaints);
  } catch (error) {
    console.error('Failed to fetch complaints:', error);
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reporter_name, phone, address, description, status } = body;
    
    if (!reporter_name || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    
    // Simulate Geocoding: assign a random location in Zhubei Area
    const lat = 24.81 + Math.random() * 0.04;
    const lng = 121.00 + Math.random() * 0.05;

    const result = await db.run(
      'INSERT INTO complaints (reporter_name, phone, address, description, status, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [reporter_name, phone || '', address, description || '', status || 'pending', lat, lng]
    );

    const newComplaint = await db.get('SELECT * FROM complaints WHERE id = ?', result.lastID);
    return NextResponse.json(newComplaint, { status: 201 });
  } catch (error) {
    console.error('Failed to create complaint:', error);
    return NextResponse.json({ error: 'Failed to create complaint' }, { status: 500 });
  }
}
