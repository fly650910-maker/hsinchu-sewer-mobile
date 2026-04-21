/**
 * 除錯端點 — 直接回傳 CWA 原始 API 回應
 * 用途：確認 API 金鑰有效、了解實際回傳的資料結構
 * 存取：http://localhost:3000/api/weather/debug?dataset=W-C0033-001
 */
import { NextResponse } from 'next/server';

const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

export const dynamic = 'force-dynamic';

async function httpsGetRaw(urlStr: string, depth = 0): Promise<string> {
  if (depth > 5) throw new Error('重新導向次數過多');

  const https = await import('https');

  return new Promise((resolve, reject) => {
    const req = https.get(
      urlStr,
      { rejectUnauthorized: false, timeout: 15000, headers: { 'Accept': 'application/json' } },
      async (res) => {
        try {
          if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, urlStr).toString();
            const data = await httpsGetRaw(redirectUrl, depth + 1);
            resolve(data);
            return;
          }
          let body = '';
          res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          res.on('end', () => resolve(body));
        } catch (err) {
          reject(err);
        }
      }
    );

    req.on('error', (err) => reject(new Error(`HTTPS 請求失敗: ${err.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTPS 請求逾時'));
    });
    req.end();
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataset = searchParams.get('dataset') || 'W-C0033-001';
  const API_KEY = process.env.CWA_API_KEY || 'CWA-3EC3C58C-6E22-40F9-AE21-93C94591658E';


  const url = new URL(`${CWA_BASE}/${dataset}`);
  url.searchParams.set('Authorization', API_KEY);
  url.searchParams.set('format', 'JSON');

  if (dataset === 'F-D0047-011') {
    url.searchParams.set('locationName', '竹北市');
    url.searchParams.set('elementName', 'PoP6h,PoP12h,Wx');
  }
  if (dataset === 'O-A0002-001') {
    url.searchParams.set('CountyName', '新竹縣');
  }

  try {
    const text = await httpsGetRaw(url.toString());
    let data: any;
    try { data = JSON.parse(text); } catch { data = null; }

    return NextResponse.json({
      dataset,
      finalUrl: url.toString().replace(API_KEY, 'REDACTED'),
      parsedOk: !!data?.records,
      rawPreview: text.slice(0, 3000),
      topKeys: data ? Object.keys(data) : [],
      recordsKeys: data?.records ? Object.keys(data.records) : [],
      success: data?.success,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5),
    }, { status: 500 });
  }
}
