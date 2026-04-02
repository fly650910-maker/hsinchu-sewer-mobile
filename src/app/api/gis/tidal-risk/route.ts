import { NextRequest, NextResponse } from 'next/server';
import { fetchTidalForecast, fetchAllWeatherData } from '@/lib/cwa';

/**
 * 倒灌風險評估介面
 */
interface TidalRiskAssessment {
  outletId: number;
  location: string;
  town: string;
  lat: number;
  lng: number;
  currentTidalHeight: number;
  currentRainfall1hr: number;
  currentRainfall3hr: number;
  riskLevel: 'red' | 'yellow' | 'green';
  trend: 'rising' | 'falling' | 'slack';
  canDischarge: boolean;
  reason: string;
  warningDurationHours: number;
  recommendedAction: string;
  assessedAt: string;
  // 預測欄位
  predictiveRisk: 'high' | 'medium' | 'low';
  futureTidalHeight2h: number;
  futureRainProb: number;
  predictiveReason: string;
}

/**
 * 找出最近的潮汐預報站點數據 (增加未來預測)
 */
function getTidalInfo(lat: number, lng: number, tidalForecasts: any[]): { current: number; future2h: number; trend: string; name: string } {
  if (tidalForecasts.length === 0) return { current: 0, future2h: 0, trend: 'slack', name: '無測站數據' };

  const stCoords: Record<string, [number, number]> = {
    '新竹縣新豐鄉': [24.8950, 120.9750],
    '新竹縣竹北市': [24.8386, 120.9962],
    '新竹市北區': [24.8468, 120.9272],
    '漁港新竹': [24.8468, 120.9272],
    '新竹市香山區': [24.7865, 120.9145],
  };

  let nearest = tidalForecasts[0];
  let minDist = Number.MAX_VALUE;
  tidalForecasts.forEach(f => {
    const coords = stCoords[f.locationName] || [24.83, 121.0];
    const dist = Math.sqrt(Math.pow(coords[0] - lat, 2) + Math.pow(coords[1] - lng, 2));
    if (dist < minDist) { minDist = dist; nearest = f; }
  });

  const now = new Date();
  const future2 = new Date(now.getTime() + 2 * 3600000);
  const todayForecast = nearest.daily.find((d: any) => d.date === now.toISOString().split('T')[0]) || nearest.daily[0];
  
  if (!todayForecast) return { current: 0, future2h: 0, trend: 'slack', name: nearest.locationName };

  const pastTimes = todayForecast.times.filter((t: any) => new Date(t.dateTime) <= now);
  const lastEvent = pastTimes[pastTimes.length - 1];
  const currentHeight = (lastEvent ? lastEvent.heightTWVD : 0) / 100;

  const futureTimes = todayForecast.times.filter((t: any) => new Date(t.dateTime) > now);
  const nextEvent = futureTimes[0];
  const next2hEvent = futureTimes.find((t: any) => new Date(t.dateTime) >= future2) || futureTimes[0];
  const future2hHeight = (next2hEvent ? next2hEvent.heightTWVD : currentHeight * 100) / 100;

  let trend = 'slack';
  if (nextEvent) {
    if (nextEvent.tide === '滿潮') trend = 'rising';
    else if (nextEvent.tide === '乾潮') trend = 'falling';
  }

  return { current: currentHeight, future2h: future2hHeight, trend, name: nearest.locationName };
}

/**
 * 計算倒灌風險 (增加預測性預警)
 */
function assessTidalRisk(
  outlet: any,
  tidal: { current: number; future2h: number; trend: string },
  rainfall1hr: number,
  rainProb: number
): TidalRiskAssessment {
  let riskLevel: 'red' | 'yellow' | 'green' = 'green';
  let reason = '退潮中，正常排放';
  let canDischarge = true;
  let recommendedAction = '正常排放';

  // 現況判定
  if (tidal.current > 0.5 && rainfall1hr >= 15) {
    riskLevel = 'red';
    reason = `🔴 危急：當前潮位 (${tidal.current.toFixed(2)}m) + 大雨 (${rainfall1hr.toFixed(1)}mm) = 排不出去`;
    canDischarge = false;
    recommendedAction = '啟動應急排水機制，嚴防海水倒灌';
  } else if (tidal.trend === 'rising') {
    riskLevel = 'yellow';
    reason = `🟡 警告：漲潮中，建議暫停雨污放流 (潮位 ${tidal.current.toFixed(2)}m)`;
    recommendedAction = '建議暫停非必要排放，加強監看';
  } else {
    reason = `🟢 正常：退潮中 (或潮位低)，正常排放`;
  }

  // 預測判定 (未來 2 小時)
  let predictiveRisk: 'high' | 'medium' | 'low' = 'low';
  let predictiveReason = '未來 2 小時風險低';
  
  if (tidal.future2h > 0.5 && rainProb >= 60) {
    predictiveRisk = 'high';
    predictiveReason = `🚨 預測：未來 2 小時內將遇回漲潮位 (${tidal.future2h.toFixed(2)}m) 且降雨機率高 (${rainProb}%)，可能發生倒灌！`;
  } else if (tidal.future2h > 0.2 && rainProb >= 40) {
    predictiveRisk = 'medium';
    predictiveReason = `⚠️ 提醒：未來 2 小時潮位將回升，且有降雨機率 (${rainProb}%)，請持續監控。`;
  }

  return {
    outletId: outlet.id,
    location: outlet.location,
    town: outlet.town,
    lat: outlet.lat,
    lng: outlet.lng,
    currentTidalHeight: tidal.current,
    currentRainfall1hr: rainfall1hr,
    currentRainfall3hr: 0, // 簡化
    riskLevel,
    trend: tidal.trend as 'rising' | 'falling' | 'slack',
    canDischarge,
    reason,
    warningDurationHours: riskLevel === 'red' ? 3 : (riskLevel === 'yellow' ? 1 : 0),
    recommendedAction,
    assessedAt: new Date().toISOString(),
    predictiveRisk,
    futureTidalHeight2h: tidal.future2h,
    futureRainProb: rainProb,
    predictiveReason
  };
}

export async function GET(request: NextRequest) {
  try {
    const outlets = [
      { id: 1, location: '康樂路德昌街口', town: '新豐鄉', lat: 24.9213, lng: 120.9963 },
      { id: 2, location: '松柏地區', town: '新豐鄉', lat: 24.8722, lng: 120.9883 },
      { id: 3, location: '鳳坑村坑子口', town: '新豐鄉', lat: 24.8969, lng: 120.9713 },
      { id: 4, location: '大同地下道', town: '湖口鄉', lat: 24.8708, lng: 120.9980 },
      { id: 14, location: '新港里', town: '竹北市', lat: 24.8504, lng: 120.9445 },
      { id: 16, location: '福興路地下道', town: '竹北市', lat: 24.8287, lng: 121.0001 },
      { id: 17, location: '興隆路一段鐵道路橋下', town: '竹北市', lat: 24.8252, lng: 120.9975 },
      { id: 18, location: '西濱路一段69巷', town: '竹北市', lat: 24.8532, lng: 120.9392 },
    ];

    // 1–3. 各資料源獨立容錯，任一失敗不影響其他
    const { fetchHsinchuWaterStations } = await import('@/lib/wra-iot');
    const [tidalResult, riverResult, weatherResult] = await Promise.allSettled([
      fetchTidalForecast(),
      fetchHsinchuWaterStations(),
      fetchAllWeatherData(),
    ]);

    const tidalForecasts = tidalResult.status === 'fulfilled'  ? tidalResult.value  : [];
    const wraStations    = riverResult.status === 'fulfilled'  ? riverResult.value  : [];
    const weatherData    = weatherResult.status === 'fulfilled'
      ? weatherResult.value
      : { rainfallStations: [], forecasts: [], warnings: [], hasActiveWarning: false, overallRisk: '未知', fetchedAt: new Date().toISOString() };

    if (tidalResult.status   === 'rejected') console.warn('[tidal-risk] 潮汐預報失敗：', tidalResult.reason);
    if (riverResult.status   === 'rejected') console.warn('[tidal-risk] WRA水位失敗：',   riverResult.reason);
    if (weatherResult.status === 'rejected') console.warn('[tidal-risk] 氣象雨量失敗：', weatherResult.reason);

    const rainfall1hr = Math.max(0, ...weatherData.rainfallStations.map((s: any) => s.rainfall1hr ?? 0));

    // 取得平均降雨機率 (Future 6h)
    const rainProb = Math.max(0, ...weatherData.forecasts.map((f: any) => f.pop6h ?? 0));

    // 4. 評估各出口風險
    const riskAssessments = outlets.map((outlet: any) => {
      const tidalInfo = getTidalInfo(outlet.lat, outlet.lng, tidalForecasts);
      
      // 找出最近的 WRA 水位站
      let riverLevel = 0;
      if (wraStations.length > 0) {
        let minDist = Number.MAX_VALUE;
        wraStations.forEach((s: any) => {
          const dist = Math.sqrt(Math.pow(s.Latitude - outlet.lat, 2) + Math.pow(s.Longtiude - outlet.lng, 2));
          if (dist < minDist) {
            minDist = dist;
            // 取第一個 Measurement 的 Value (通常是水位)
            riverLevel = s.Measurements?.[0]?.Value || 0;
          }
        });
      }

      // 增強評估邏輯：加入河川水位影響
      let assessment = assessTidalRisk(outlet, tidalInfo, rainfall1hr, rainProb);
      
      if (riverLevel > 1.5 && assessment.riskLevel !== 'red') {
       assessment.riskLevel = 'yellow';
       assessment.reason += ` (⚠️ 鄰近河川水位高: ${riverLevel.toFixed(2)}m)`;
       assessment.predictiveRisk = 'medium';
      }

      return assessment;
    });

    const statistics = {
      totalOutlets: outlets.length,
      redRiskCount: riskAssessments.filter(r => r.riskLevel === 'red').length,
      yellowRiskCount: riskAssessments.filter(r => r.riskLevel === 'yellow').length,
      greenRiskCount: riskAssessments.filter(r => r.riskLevel === 'green').length,
      highPredictiveRiskCount: riskAssessments.filter(r => r.predictiveRisk === 'high').length,
      overallRiskLevel: riskAssessments.some(r => r.riskLevel === 'red') ? 'red' :
                       riskAssessments.some(r => r.riskLevel === 'yellow') ? 'yellow' : 'green',
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      statistics,
      weatherData: { rainfall1hr, rainProb },
      assessments: riskAssessments,
    });
  } catch (error) {
    console.error('Error fetching tidal risk data:', error);
    return NextResponse.json({ success: false, error: '無法取得潮汐風險數據' }, { status: 500 });
  }
}
