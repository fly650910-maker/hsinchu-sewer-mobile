/**
 * CWA 雷達回波代理 API
 *
 * 從中央氣象署 Open Data 取得最新雷達合成圖並代理回傳，
 * 避免瀏覽器 CORS 限制。
 *
 * 使用產品：O-A0058-001（全台雷達回波合成圖）
 * 官方文件：https://opendata.cwa.gov.tw
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.CWA_API_KEY || 'CWA-3EC3C58C-6E22-40F9-AE21-93C94591658E';

// CWA 全台合成雷達圖固定涵蓋範圍（WGS84）
// 可依實際產品說明調整
export const RADAR_BOUNDS = {
  minLat: 16.0,
  maxLat: 28.0,
  minLng: 113.5,
  maxLng: 127.0,
};

// 嘗試多個產品 ID（CWA 版本更新後 ID 可能不同）
const PRODUCT_IDS = [
  'O-A0058-001', // 雷達定量降水 / 合成回波
  'O-A0059-001', // 備用
  'B-A0024-001', // 舊版雷達回波
];

async function fetchRadarImageUrl(): Promise<{ url: string; timestamp: string }> {
  for (const productId of PRODUCT_IDS) {
    try {
      const metaUrl = `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/${productId}?Authorization=${API_KEY}&downloadType=WEB&format=JSON`;
      const res = await fetch(metaUrl, { cache: 'no-store' });

      if (!res.ok) continue;

      const data = await res.json();
      if (data?.success !== 'true' && data?.success !== true) continue;

      // 嘗試多種回應格式
      const fileInfos =
        data?.result?.dataset_info?.FileInfos?.FileInfo ??
        data?.result?.FileInfos?.FileInfo ??
        [];

      const arr = Array.isArray(fileInfos) ? fileInfos : [fileInfos];
      if (!arr.length) continue;

      // 取最新一筆（通常在陣列最後）
      const latest = arr[arr.length - 1];
      const imageUrl =
        latest?.DownloadLink ??
        latest?.DataURL ??
        latest?.Link ??
        latest?.downloadLink;

      if (!imageUrl) continue;

      return {
        url: imageUrl,
        timestamp: latest?.DateTime ?? new Date().toISOString(),
      };
    } catch {
      // 繼續試下一個產品 ID
    }
  }

  throw new Error('CWA 所有雷達產品 ID 均無法取得圖片 URL');
}

export async function GET() {
  try {
    const { url: imageUrl, timestamp } = await fetchRadarImageUrl();

    // 代理圖片本體（避免瀏覽器 CORS 問題）
    const imgRes = await fetch(imageUrl, { cache: 'no-store' });
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
        'X-Radar-Timestamp': timestamp,
        'X-Radar-Bounds': JSON.stringify(RADAR_BOUNDS),
      },
    });
  } catch (error) {
    console.error('[CWA Radar API]', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
