import { NextResponse } from 'next/server';
import { fetchColifeCctv } from '@/lib/wra-iot';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cameras = await fetchColifeCctv();
    return NextResponse.json({
      success: true,
      cameras,
      count: cameras.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] /api/gis/cctv 錯誤：', error);
    return NextResponse.json({ success: false, error: '無法取得 CCTV 資料' }, { status: 500 });
  }
}
