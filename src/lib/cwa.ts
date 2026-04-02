/**
 * 中央氣象署（CWA）開放資料平台 API 服務層
 * https://opendata.cwa.gov.tw
 */

const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
const API_KEY = process.env.CWA_API_KEY || 'CWA-3EC3C58C-6E22-40F9-AE21-93C94591658E';

/** 監控鄉鎮 */
export const MONITORED_AREAS = [
  '竹北市', '竹東鎮', '新埔鎮', '關西鎮', '湖口鄉', '新豐鄉',
  '芎林鄉', '橫山鄉', '北埔鄉', '寶山鄉', '峨眉鄉', '尖石鄉', '五峰鄉',
] as const;
export type MonitoredArea = typeof MONITORED_AREAS[number];

/** 風險等級 */
export type RiskLevel = '極高' | '高' | '中' | '低' | '未知';

export interface AreaForecast {
  area: string;
  pop6h: number | null;
  pop12h: number | null;
  weatherDesc: string;
  riskLevel: RiskLevel;
}

export interface RainfallStation {
  stationId: string;
  stationName: string;
  area: string;
  lat: number | null;
  lng: number | null;
  rainfall10min: number | null;
  rainfall1hr: number | null;
  rainfall3hr: number | null;
  rainfall24hr: number | null;
}

export interface WeatherWarning {
  phenomenonName: string;
  content: string;
  startTime: string;
  endTime: string;
  areas: string[];
}

export interface WeatherData {
  fetchedAt: string;
  warnings: WeatherWarning[];
  forecasts: AreaForecast[];
  rainfallStations: RainfallStation[];
  overallRisk: RiskLevel;
  hasActiveWarning: boolean;
}

export interface TidalStation {
  stationName: string;
  stationId: string;
  lat: number;
  lng: number;
}

export interface TideTime {
  dateTime: string;
  tide: '滿潮' | '乾潮' | string;
  heightTWVD: number;
}

export interface TidalForecast {
  locationName: string;
  daily: Array<{
    date: string;
    times: TideTime[];
  }>;
}

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
        } catch (err) { reject(err); }
      }
    );
    req.on('error', (err) => reject(new Error(`HTTPS 請求失敗: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('HTTPS 請求逾時（15秒）')); });
    req.end();
  });
}

async function fetchCWA(dataset: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${CWA_BASE}/${dataset}`);
  url.searchParams.set('Authorization', API_KEY);
  url.searchParams.set('format', 'JSON');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const text = await httpsGetRaw(url.toString());
  try { return JSON.parse(text); }
  catch { throw new Error(`CWA API ${dataset} 回傳非 JSON 內容：${text.slice(0, 300)}`); }
}

function calcRisk(pop6h: number | null, pop12h: number | null): RiskLevel {
  const pop = pop6h ?? pop12h ?? 0;
  if (pop >= 80) return '極高';
  if (pop >= 60) return '高';
  if (pop >= 40) return '中';
  return '低';
}

/**
 * 依據降雨實測值計算風險等級 (符合消防署 EMT 標準)
 * - 24hr >= 200mm 或 3hr >= 100mm (大豪雨) => 極高
 * - 1hr >= 40mm (強降雨) => 極高
 * - 1hr >= 15mm (大雨) => 高
 */
function calcOverallRisk(hasWarning: boolean, forecasts: AreaForecast[], rainfallStations: RainfallStation[]): RiskLevel {
  if (hasWarning) return '極高';
  
  const max1hr = Math.max(...rainfallStations.map(s => s.rainfall1hr ?? 0));
  const max24hr = Math.max(...rainfallStations.map(s => s.rainfall24hr ?? 0));
  const max3hr = Math.max(...rainfallStations.map(s => s.rainfall3hr ?? 0));

  if (max1hr >= 40 || max3hr >= 100 || max24hr >= 200) return '極高';
  if (max1hr >= 20 || max24hr >= 80) return '高';
  if (max1hr >= 10) return '中';

  const maxPop = Math.max(...forecasts.map(f => f.pop6h ?? f.pop12h ?? 0));
  if (maxPop >= 80) return '高';
  if (maxPop >= 50) return '中';
  return '低';
}

/**
 * 轉換內部狀態為 EMIC 災情分類
 */
export function mapToEmicStatus(status: string): string {
  const map: Record<string, string> = {
    'pending': '受理中',
    'processing': '處理中',
    'resolved': '結案'
  };
  return map[status] || '受理中';
}

export async function fetchWarnings(): Promise<WeatherWarning[]> {
  try {
    const data = await fetchCWA('W-C0033-001');
    const records = data?.records?.record ?? [];
    return records
      .filter((r: any) => { const areas: string[] = r.affects?.locationName ?? []; return areas.some((a: string) => a.includes('新竹')); })
      .map((r: any) => ({ phenomenonName: r.phenomena ?? '', content: r.content ?? '', startTime: r.startTime ?? '', endTime: r.endTime ?? '', areas: r.affects?.locationName ?? [] }));
  } catch (err) { console.error('[CWA] 警特報取得失敗：', err); return []; }
}

export async function fetchForecasts(): Promise<AreaForecast[]> {
  try {
    const data = await fetchCWA('F-D0047-011', { locationName: MONITORED_AREAS.join(','), elementName: 'PoP6h,PoP12h,Wx' });
    const locations: any[] = data?.records?.locations?.[0]?.Location ?? [];
    return locations.map((loc: any) => {
      const elements: any[] = loc.weatherElement ?? [];
      const getFirst = (name: string) => elements.find((e: any) => e.elementName === name)?.time?.[0]?.elementValue?.[0]?.value ?? null;
      const pop6h = getFirst('PoP6h') !== null ? Number(getFirst('PoP6h')) : null;
      const pop12h = getFirst('PoP12h') !== null ? Number(getFirst('PoP12h')) : null;
      return { area: loc.locationName, pop6h, pop12h, weatherDesc: getFirst('Wx') ?? '無資料', riskLevel: calcRisk(pop6h, pop12h) };
    });
  } catch (err) {
    console.error('[CWA] 鄉鎮預報取得失敗：', err);
    return MONITORED_AREAS.map(area => ({ area, pop6h: null, pop12h: null, weatherDesc: '無法取得', riskLevel: '未知' as RiskLevel }));
  }
}

export async function fetchRainfallStations(): Promise<RainfallStation[]> {
  const toVal = (v: any): number | null => {
    if (v === undefined || v === null || v === '' || v === '-') return null;
    const n = Number(v);
    return (isNaN(n) || n < -90) ? null : n;
  };
  try {
    const data = await fetchCWA('O-A0002-001');
    const stations: any[] = data?.records?.Station ?? [];
    return stations
      .filter((s: any) => (s.GeoInfo?.CountyName ?? '').includes('新竹縣'))
      .map((s: any) => {
        const re = s.RainfallElement ?? {};
        const coords: any[] = s.GeoInfo?.Coordinates ?? [];
        const wgs = coords.find((c: any) => c.CoordinateName === 'WGS84') ?? coords[0] ?? {};
        const lat = toVal(wgs.StationLatitude);
        const lng = toVal(wgs.StationLongitude);
        return {
          stationId:    s.StationId ?? '',
          stationName:  s.StationName ?? '',
          area:         s.GeoInfo?.TownName ?? '',
          lat,
          lng,
          rainfall10min: toVal(re.Past10Min?.Precipitation),
          rainfall1hr:   toVal(re.Past1hr?.Precipitation),
          rainfall3hr:   toVal(re.Past3hr?.Precipitation),
          rainfall24hr:  toVal(re.Past24hr?.Precipitation),
        };
      }).filter(s => s.stationName !== '');
  } catch (err) { console.error('[CWA] 雨量站資料取得失敗：', err); return []; }
}

export async function fetchAllWeatherData(): Promise<WeatherData> {
  const [warnings, forecasts, rainfallStations] = await Promise.all([fetchWarnings(), fetchForecasts(), fetchRainfallStations()]);
  const hasActiveWarning = warnings.length > 0;
  return { fetchedAt: new Date().toISOString(), warnings, forecasts, rainfallStations, overallRisk: calcOverallRisk(hasActiveWarning, forecasts, rainfallStations), hasActiveWarning };
}

export async function fetchTidalForecast(): Promise<TidalForecast[]> {
  try {
    const data = await fetchCWA('F-A0021-001');
    const records = data?.records?.TideForecasts ?? [];
    
    // 篩選新竹地區（包含新竹市、新竹縣、新豐、竹北、漁港等）
    const hsinchuLocs = records.filter((loc: any) => 
      loc.Location?.LocationName?.includes('新竹') || 
      loc.Location?.LocationName?.includes('新豐') ||
      loc.Location?.LocationName?.includes('漁港')
    );

    return hsinchuLocs.map((loc: any) => {
      const daily = (loc.Location?.TimePeriods?.Daily ?? []).map((d: any) => ({
        date: d.Date,
        times: (d.Time ?? []).map((t: any) => ({
          dateTime: t.DateTime,
          tide: t.Tide,
          heightTWVD: Number(t.TideHeights?.AboveTWVD ?? 0)
        }))
      }));
      return {
        locationName: loc.Location?.LocationName,
        daily
      };
    });
  } catch (err) {
    console.error('[CWA] 潮汐預報取得失敗：', err);
    return [];
  }
}
