import { NextResponse } from 'next/server';
import https from 'https';

export const dynamic = 'force-dynamic';

async function fetchRaw(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false, timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ raw: body.slice(0, 2000) }); }
      });
    }).on('error', reject);
  });
}

export async function GET() {
  const key = process.env.CWA_API_KEY || 'CWA-3EC3C58C-6E22-40F9-AE21-93C94591658E';
  const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0002-001?Authorization=${key}&CountyName=%E6%96%B0%E7%AB%B9%E7%B8%A3&format=JSON&limit=2`;
  try {
    const data = await fetchRaw(url);
    const stations = data?.records?.Station ?? [];
    // 回傳第一個站的完整結構
    return NextResponse.json({
      totalStations: stations.length,
      firstStation: stations[0] ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
