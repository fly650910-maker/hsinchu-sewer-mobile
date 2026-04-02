/**
 * Telegram Bot 通知服務
 * Bot: @Durian_sewerage_bot
 */

const TG_TOKEN  = process.env.TG_BOT_TOKEN  || '8788132328:AAHg8eAi-69WZLyOmpyoMzojiydD164zl8o';
const TG_CHAT_ID = process.env.TG_CHAT_ID   || '5874944747';

export async function sendTelegramMessage(text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, parse_mode: 'HTML', text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('[Telegram] sendMessage failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[Telegram] sendMessage error:', err?.message ?? err);
    return false;
  }
}

/** 格式化預警訊息 */
export function formatAlertMessage(params: {
  level: 'emergency' | 'warning';
  max1hr: number;
  max3hr: number;
  topStation: string;
  segments: string[];
  redOutlets: string[];
}): string {
  const { level, max1hr, max3hr, topStation, segments, redOutlets } = params;
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const header = level === 'emergency'
    ? '🚨 <b>緊急警報｜雨量嚴重超標</b>'
    : '⚠️ <b>預警通知｜雨量偏高</b>';

  const rainfallLine = max1hr > 0
    ? `📡 最大1小時雨量：<b>${max1hr.toFixed(0)} mm/hr</b>（${topStation}）`
    : `📡 最大3小時累積：<b>${max3hr.toFixed(0)} mm</b>（${topStation}）`;

  const segLines = segments.length > 0
    ? `\n⚠️ <b>請立即巡查高風險管段：</b>\n` + segments.map(s => `  • ${s}`).join('\n')
    : '';

  const outletLines = redOutlets.length > 0
    ? `\n🔴 <b>出水口倒灌風險：</b>\n` + redOutlets.map(s => `  • ${s}`).join('\n')
    : '';

  const footer = `\n🕐 ${now}　｜　新竹縣下水道科管理系統`;

  return `${header}\n\n${rainfallLine}${segLines}${outletLines}${footer}`;
}
