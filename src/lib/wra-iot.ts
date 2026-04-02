// WRA IoT API Utility
// Handles authentication and data fetching from iot.wra.gov.tw

const WRA_AUTH_ID = process.env.WRA_AUTH_ID || 'sIQWjW2cMLBfAt9TMXo2Vhjyup/fHdwLJFaavROw814=';
const WRA_AUTH_SECRET = process.env.WRA_AUTH_SECRET || '8kzpTBxYPGcogGgYPyilmS9KbR1xz5MopjLktF3lDXo=';

let currentToken: string | null = process.env.WRA_INITIAL_TOKEN || null;

/** 從 JWT payload 解析 exp 欄位，判斷 token 是否還有效（含 60 秒緩衝） */
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
    return payload.exp * 1000 > Date.now() + 60_000;
  } catch { return false; }
}

/** fetch with timeout，避免 WRA API 無回應時一直 hang */
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function getWraAccessToken(): Promise<string | null> {
  if (isTokenValid(currentToken)) return currentToken;

  try {
    console.log('[WRA IoT] Token expired or missing, re-authenticating...');
    const res = await fetchWithTimeout('https://iot.wra.gov.tw/api/v1/Auth/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({ ClientId: WRA_AUTH_ID, ClientSecret: WRA_AUTH_SECRET }),
    }, 8000);

    if (res.ok) {
      const data = await res.json();
      if (data.AccessToken) {
        currentToken = data.AccessToken;
        console.log('[WRA IoT] Authentication successful.');
        return currentToken;
      }
    }
    console.error(`[WRA IoT] Authentication failed: ${res.status}`);
  } catch (err: any) {
    // AbortError 代表超時，其他是網路錯誤（例如 HF Space proxy 阻擋）
    console.error(`[WRA IoT] Auth error (${err?.name ?? 'unknown'}):`, err?.message ?? err);
  }
  return null; // 無法取得 token，呼叫端應回傳空陣列
}

export async function fetchHsinchuWaterStations() {
  const token = await getWraAccessToken();
  if (!token) { console.warn('[WRA IoT] No valid token, skipping river stations.'); return []; }
  try {
    const res = await fetchWithTimeout('https://iot.wra.gov.tw/river/stations', {
      headers: { 'Authorization': `Bearer ${token}`, 'accept': 'application/json' },
    }, 8000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data.filter((s: any) => s.CountyName?.includes('新竹'));
    } else {
      console.error(`[WRA IoT] River stations fetch failed: ${res.status}`);
    }
  } catch (err: any) {
    console.error(`[WRA IoT] fetchHsinchuWaterStations error (${err?.name}):`, err?.message);
  }
  return [];
}

export async function fetchHsinchuInundation() {
  const token = await getWraAccessToken();
  if (!token) { console.warn('[WRA IoT] No valid token, skipping inundation.'); return []; }
  try {
    const res = await fetchWithTimeout('https://iot.wra.gov.tw/uswg/stations', {
      headers: { 'Authorization': `Bearer ${token}`, 'accept': 'application/json' },
    }, 8000);
    if (res.ok) {
      const data = await res.json();
      return data.filter((s: any) => s.CountyName?.includes('新竹'));
    }
  } catch (err: any) {
    console.error(`[WRA IoT] fetchHsinchuInundation error (${err?.name}):`, err?.message);
  }
  return [];
}

/**
 * Fetch CCTV from Civil IoT Taiwan (Colife) — Datastreams endpoint
 * Source: https://sta.colife.org.tw/STA_CCTV/v1.0/Datastreams
 * Filter: authority = 水利署（與縣市政府合建）, then client-side filter for Hsinchu
 */
export async function fetchColifeCctv() {
  const allCameras: any[] = [];
  const HS_KEYWORDS = ['新竹市', '新竹縣', '新竹'];
  const batches = [0, 1000];

  for (const skip of batches) {
    const url = `https://sta.colife.org.tw/STA_CCTV/v1.0/Datastreams` +
      `?$expand=Thing($expand=Locations),Observations($top=1;$orderby=phenomenonTime desc)` +
      `&$filter=Thing/properties/authority eq '水利署（與縣市政府合建）'` +
      `&$top=1000&$skip=${skip}&$count=true`;
    try {
      const res = await fetch(encodeURI(url), {
        headers: { 'accept': 'application/json' },
        next: { revalidate: 0 }
      } as RequestInit);
      if (!res.ok) { console.error(`[Colife] CCTV Datastreams ${res.status}`); break; }
      const data = await res.json();
      const items: any[] = data.value || [];

      const hsinchuItems = items.filter((ds: any) => {
        const props = ds.Thing?.properties || {};
        const org   = props.OrgName || '';
        const sName = props.stationName || ds.Thing?.name || '';
        const desc  = ds.Thing?.description || '';
        return HS_KEYWORDS.some(k => org.includes(k) || sName.includes(k) || desc.includes(k));
      });

      const now = new Date();
      const mapped = hsinchuItems.map((ds: any) => {
        const thing = ds.Thing || {};
        const props = thing.properties || {};
        const loc   = thing.Locations?.[0]?.location?.coordinates;
        const streamUrl = ds.Observations?.[0]?.result;
        const rawObsTime = ds.Observations?.[0]?.phenomenonTime;
        // Colife CCTV 串流的 phenomenonTime 有時是 2099 等遠未來日期（表示「持續有效」）
        // 凡是超過現在時間 1 天以上的都視為無效，改用實際抓取時間
        let obsTime: string = now.toISOString();
        if (rawObsTime) {
          const parsed = new Date(rawObsTime);
          if (!isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime() + 86_400_000) {
            obsTime = parsed.toISOString();
          }
        }
        return {
          id:         ds['@iot.id'],
          Name:       props.stationName || thing.name || ds.name,
          CountyName: props.OrgName?.includes('新竹縣') ? '新竹縣' : '新竹市',
          TownName:   props.town || '',
          Authority:  props.authority || '',
          Latitude:   loc?.[1],
          Longtiude:  loc?.[0],
          Longitude:  loc?.[0],
          StreamUrl:  streamUrl,
          ObsTime:    obsTime,
        };
      }).filter((s: any) => s.Latitude && s.Longitude && s.StreamUrl);

      allCameras.push(...mapped);

      // If total count ≤ first batch size, no need for second batch
      if ((data['@iot.count'] ?? items.length) <= 1000 && skip === 0) break;
    } catch (err) {
      console.error(`[Colife] CCTV fetch error (skip ${skip}):`, err);
    }
  }
  return allCameras;
}

/**
 * 水利署開放資料：新竹縣 IoW 閘門監測站
 * Source: https://opendata.wra.gov.tw/api/v2/d82e29eb-22f8-4e94-8d27-be27ac601d5e（基本資料）
 *         https://opendata.wra.gov.tw/api/v2/3e9e4c4d-9758-49fe-8a65-90c88e11ea54（即時資料）
 * 不需要 token，公開 API
 */
export interface GateStation {
  sensorid: string;
  observatoryname: string;
  sensorname: string;
  townname: string;
  latitude: number;
  longitude: number;
  isenable: boolean;
  // 即時資料（若有）
  value?: number;      // 閘門開度 %
  unit?: string;
  observationtime?: string;
}

export async function fetchHsinchuGates(): Promise<GateStation[]> {
  try {
    // 基本資料（含座標）
    const baseRes = await fetchWithTimeout(
      'https://opendata.wra.gov.tw/api/v2/d82e29eb-22f8-4e94-8d27-be27ac601d5e',
      {}, 8000
    );
    if (!baseRes.ok) throw new Error(`基本資料 HTTP ${baseRes.status}`);
    const baseData: any[] = await baseRes.json();
    const hcStations = baseData.filter(s => s.countycode === '10004' || s.countyname === '新竹縣');

    // 即時資料（閘門開度）
    let realtimeMap: Record<string, { value: number; unit: string; time: string }> = {};
    try {
      const rtRes = await fetchWithTimeout(
        'https://opendata.wra.gov.tw/api/v2/3e9e4c4d-9758-49fe-8a65-90c88e11ea54',
        {}, 8000
      );
      if (rtRes.ok) {
        const rtData: any[] = await rtRes.json();
        const hcRt = rtData.filter(s => s.countycode === '10004' || s.countyname === '新竹縣');
        for (const r of hcRt) {
          if (r.sensorid) {
            realtimeMap[r.sensorid] = {
              value: parseFloat(r.value ?? r.sensorvalue ?? '0'),
              unit: r.unit ?? '%',
              time: r.observationtime ?? r.datatime ?? '',
            };
          }
        }
      }
    } catch (e) {
      console.warn('[WRA Gates] 即時資料取得失敗，僅顯示站點位置');
    }

    return hcStations.map(s => ({
      sensorid: s.sensorid,
      observatoryname: s.observatoryname,
      sensorname: s.sensorname,
      townname: s.townname,
      latitude: parseFloat(s.latitude),
      longitude: parseFloat(s.longitude),
      isenable: s.isenable === 'true' || s.isenable === true,
      ...(realtimeMap[s.sensorid] ?? {}),
    }));
  } catch (err: any) {
    console.error('[WRA Gates] fetchHsinchuGates error:', err?.message);
    return [];
  }
}
