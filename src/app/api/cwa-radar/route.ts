/**
 * CWA 雷達回波代理 API
 *
 * 直接代理中央氣象署 S3 雷達圖片（O-A0058-001），避免瀏覽器 CORS 限制。
 * CWA 每 10 分鐘在同一 URL 覆寫最新圖片，不需要先打 metadata API。
 *
 * 涵蓋範圍（來自 API debug）：lat 17.75–29.25，lon 115.0–126.5
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// CWA 雷達圖 S3 固定網址（每次更新都覆寫同一個 URL）
const RADAR_IMAGE_URL =
  'https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Observation/O-A0058-001.png';

export async function GET() {
  try {
    const imgRes = await fetch(RADAR_IMAGE_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SewerageGIS/1.0)' },
    });

    if (!imgRes.ok) {
      throw new Error(`CWA 圖片下載失敗：${imgRes.status} ${imgRes.statusText}`);
    }

    const imgBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/png';

    return new NextResponse(imgBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Radar-Source': 'CWA-O-A0058-001',
      },
    });
  } catch (error) {
    console.error('[CWA Radar API]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
