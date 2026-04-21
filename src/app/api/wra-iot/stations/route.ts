import { NextResponse } from 'next/server';
import { fetchHsinchuWaterStations, fetchHsinchuInundation, fetchColifeCctv } from '@/lib/wra-iot';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 各資料源獨立容錯，任一失敗不影響其他
  const [riverResult, inundationResult, cctvResult] = await Promise.allSettled([
    fetchHsinchuWaterStations(),
    fetchHsinchuInundation(),
    fetchColifeCctv(),
  ]);

  const riverStations      = riverResult.status      === 'fulfilled' ? riverResult.value      : [];
  const inundationStations = inundationResult.status === 'fulfilled' ? inundationResult.value : [];
  const cctvStations       = cctvResult.status       === 'fulfilled' ? cctvResult.value       : [];

  const sourceStatus = {
    river:      riverResult.status      === 'fulfilled' ? 'ok' : `error: ${(riverResult.reason as Error)?.message ?? '未知'}`,
    inundation: inundationResult.status === 'fulfilled' ? 'ok' : `error: ${(inundationResult.reason as Error)?.message ?? '未知'}`,
    cctv:       cctvResult.status       === 'fulfilled' ? 'ok' : `error: ${(cctvResult.reason as Error)?.message ?? '未知'}`,
  };
  if (Object.values(sourceStatus).some(s => s !== 'ok')) {
    console.warn('[wra-iot/stations] 部分資料源失敗：', sourceStatus);
  }

  return NextResponse.json({
    success: true,
    riverStations,
    inundationStations,
    cctvStations,
    sourceStatus,
    fetchedAt: new Date().toISOString(),
  });
}
