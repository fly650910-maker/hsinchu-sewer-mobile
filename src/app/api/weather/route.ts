import { NextResponse } from 'next/server';
import { fetchAllWeatherData } from '@/lib/cwa';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 同時取得天氣資料與歷史淹水熱點
    const [weatherData, db] = await Promise.all([
      fetchAllWeatherData(),
      getDb(),
    ]);

    // 從資料庫取得歷史淹水熱點（事件次數多的優先）
    const floodHotspots = await db.all(`
      SELECT location, town, description, years, event_count
      FROM flood_hotspots
      ORDER BY event_count DESC
      LIMIT 6
    `);

    // 若當前為高風險，標示歷史熱點作為預警
    const triggeredHotspots =
      (weatherData.overallRisk === '高' || weatherData.overallRisk === '極高')
        ? floodHotspots
        : [];

    return NextResponse.json({
      ...weatherData,
      floodHotspots,
      triggeredHotspots,
    });
  } catch (error) {
    console.error('[API] /api/weather 錯誤：', error);
    return NextResponse.json(
      { error: '無法取得天氣資料，請確認 CWA_API_KEY 設定正確' },
      { status: 500 }
    );
  }
}
