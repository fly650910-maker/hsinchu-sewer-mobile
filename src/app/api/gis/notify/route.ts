import { NextResponse } from 'next/server';
import { sendTelegramMessage, formatAlertMessage } from '@/lib/telegram';
import { fetchAllWeatherData } from '@/lib/cwa';

export const dynamic = 'force-dynamic';

// ── 防重複發送：記錄各等級上次通知時間（in-memory，重啟後重置）──
const lastNotified: Record<string, number> = {};
const DEDUP_WINDOW_MS: Record<string, number> = {
  emergency: 30 * 60 * 1000,  // 緊急：30 分鐘內不重複
  warning:   60 * 60 * 1000,  // 預警：60 分鐘內不重複
  clear:     24 * 60 * 60 * 1000, // 解除：每天最多一次
};

// 高風險管段（與現況看板同步）
const HIGH_RISK_SEGMENTS = [
  '竹東-大同路暨公正街排水箱涵',
  '竹東-康寧街及周邊支線',
  '竹北-嘉豐地區雨水主幹管',
  '竹東-沿河街北排水系統',
  '竹北-中和街地下道上下游箱涵',
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // 前端可直接傳入已知的 weatherData，或讓 API 自行抓取
    let rainfallStations = body.rainfallStations ?? null;
    let redOutlets: string[] = body.redOutlets ?? [];

    if (!rainfallStations) {
      const wd = await fetchAllWeatherData().catch(() => null);
      rainfallStations = wd?.rainfallStations ?? [];
    }

    const stations: any[] = rainfallStations ?? [];
    const max1hr  = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall1hr  ?? 0)) : 0;
    const max3hr  = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall3hr  ?? 0)) : 0;
    const topSt   = stations.reduce((a: any, b: any) =>
      (b.rainfall1hr ?? 0) > (a.rainfall1hr ?? 0) ? b : a, stations[0] ?? {});

    const now = Date.now();

    // ── 判斷等級並發送 ──
    if (max1hr >= 40 || max3hr >= 100) {
      if (!lastNotified.emergency || now - lastNotified.emergency > DEDUP_WINDOW_MS.emergency) {
        lastNotified.emergency = now;
        const msg = formatAlertMessage({
          level: 'emergency',
          max1hr, max3hr,
          topStation: topSt?.stationName ?? '—',
          segments: HIGH_RISK_SEGMENTS.slice(0, 4),
          redOutlets,
        });
        await sendTelegramMessage(msg);
        return NextResponse.json({ sent: true, level: 'emergency' });
      }
      return NextResponse.json({ sent: false, reason: '30分鐘內已通知', level: 'emergency' });

    } else if (max1hr >= 15) {
      if (!lastNotified.warning || now - lastNotified.warning > DEDUP_WINDOW_MS.warning) {
        lastNotified.warning = now;
        const msg = formatAlertMessage({
          level: 'warning',
          max1hr, max3hr,
          topStation: topSt?.stationName ?? '—',
          segments: HIGH_RISK_SEGMENTS.slice(0, 3),
          redOutlets,
        });
        await sendTelegramMessage(msg);
        return NextResponse.json({ sent: true, level: 'warning' });
      }
      return NextResponse.json({ sent: false, reason: '60分鐘內已通知', level: 'warning' });
    }

    return NextResponse.json({ sent: false, reason: '未達通知門檻', max1hr, max3hr });

  } catch (err: any) {
    console.error('[notify] error:', err);
    return NextResponse.json({ error: err?.message ?? '未知錯誤' }, { status: 500 });
  }
}
