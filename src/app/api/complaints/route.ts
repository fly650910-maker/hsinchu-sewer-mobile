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

    // 座標設為 NULL，待後續透過真實地理編碼服務取得正確位置
    // TODO: 可串接政府開放資料地址解析 API（如 NLSC 內政部地理編碼）取得實際座標
    const lat = null;
    const lng = null;

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
