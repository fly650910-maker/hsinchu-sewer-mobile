import { NextResponse } from 'next/server';
import { fetchAllWeatherData, fetchTidalForecast } from '@/lib/cwa';
import { fetchHsinchuWaterStations, fetchHsinchuInundation } from '@/lib/wra-iot';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 各資料源獨立容錯：任一失敗不影響其他，回傳空值繼續運作
  const [weatherResult, riverResult, inundationResult, tidalResult] = await Promise.allSettled([
    fetchAllWeatherData(),
    fetchHsinchuWaterStations(),
    fetchHsinchuInundation(),
    fetchTidalForecast()
  ]);

  const weatherData = weatherResult.status === 'fulfilled'
    ? weatherResult.value
    : { fetchedAt: new Date().toISOString(), warnings: [], forecasts: [], rainfallStations: [], overallRisk: '未知' as const, hasActiveWarning: false, _error: '氣象署暫時無回應' };

  const wraRiverStations = riverResult.status === 'fulfilled' ? riverResult.value : [];
  const wraInundation    = inundationResult.status === 'fulfilled' ? inundationResult.value : [];
  const tidalForecasts   = tidalResult.status === 'fulfilled' ? tidalResult.value : [];

  // 記錄哪些資料源失敗，方便 debug
  const sourceStatus = {
    weather:    weatherResult.status === 'fulfilled' ? 'ok' : `error: ${(weatherResult.reason as Error)?.message ?? '未知'}`,
    river:      riverResult.status === 'fulfilled'   ? 'ok' : `error: ${(riverResult.reason as Error)?.message ?? '未知'}`,
    inundation: inundationResult.status === 'fulfilled' ? 'ok' : `error: ${(inundationResult.reason as Error)?.message ?? '未知'}`,
    tidal:      tidalResult.status === 'fulfilled'   ? 'ok' : `error: ${(tidalResult.reason as Error)?.message ?? '未知'}`,
  };
  const hasAnyError = Object.values(sourceStatus).some(s => s !== 'ok');
  if (hasAnyError) console.warn('[API] /api/gis/weather 部分資料源失敗：', sourceStatus);

  const aiAlerts = generateAiAlerts(weatherData, wraRiverStations, wraInundation, tidalForecasts);

  return NextResponse.json({
    ...weatherData,
    aiAlerts,
    sensorSummary: {
      riverCount: wraRiverStations.length,
      inundationCount: wraInundation.length,
      tidalCount: tidalForecasts.length
    },
    sourceStatus,  // 前端可顯示哪些資料是最新的、哪些暫時無法取得
  });
}

function generateAiAlerts(data: any, riverStations: any[], inundation: any[], tides: any[]): AiAlert[] {
  const alerts: AiAlert[] = [];
  const { forecasts, rainfallStations, warnings, hasActiveWarning } = data;

  // 1. 氣象警特報 (優先度最高)
  if (hasActiveWarning && warnings.length > 0) {
    alerts.push({
      level: 'critical',
      icon: '🚨',
      title: '氣象署：警特報發布中',
      message: warnings.map((w: any) => w.phenomenonName).join('、'),
      action: '立即啟動緊急應變機制，派員巡查各重要幹管與抽水站',
      layerKey: 'watermonitor'
    });
  }

  // 2. 即時物理測站分析 (水位與淹水)
  const highRiver = riverStations.filter((s: any) => {
    const val = s.Measurements?.[0]?.Value || s.Value || 0;
    return val > 2.0; 
  });

  if (highRiver.length > 0) {
    alerts.push({
      level: 'critical',
      icon: '🌊',
      title: '河川水位警示',
      message: `${highRiver[0].StationName || highRiver[0].Name || '測站'} 等 ${highRiver.length} 處水位站偵測到水位上升`,
      action: '查看「水情監測」圖層，並對應 CCTV 確認即時影像',
      layerKey: 'watermonitor'
    });
  }

  // 3. 淹水感知器即時回報
  const activeInundation = inundation.filter((s: any) => {
    const val = s.Measurements?.[0]?.Value || s.Value || 0;
    return val > 5;
  });

  if (activeInundation.length > 0) {
    const mainStation = activeInundation[0];
    const val = mainStation.Measurements?.[0]?.Value || mainStation.Value || 0;
    alerts.push({
      level: 'critical',
      icon: '🆘',
      title: '即時積淹水通報',
      message: `${mainStation.StationName || mainStation.Name || '感知器'} 偵測到積水 ${val} cm`,
      action: '立即前往「淹水熱區」調派移動式抽水機',
      layerKey: 'floods'
    });
  }

  // 4. 即時雨量分析
  const max1hr = Math.max(0, ...rainfallStations.map((s: any) => s.rainfall1hr ?? 0));
  if (max1hr >= 40) {
    alerts.push({
      level: 'critical',
      icon: '🌧️',
      title: '強降雨警戒',
      message: `即時雨量 ${max1hr.toFixed(1)} mm/hr，極易引發市區積水`,
      action: '緊急巡查低窪地區（竹北、新豐），確保閘門正常運作',
      layerKey: 'floods'
    });
  } else if (max1hr >= 20) {
    alerts.push({
      level: 'warning',
      icon: '🌦️',
      title: '雨量偏高提醒',
      message: `當前雨量 ${max1hr.toFixed(1)} mm/hr，管線負擔增加中`,
      action: '加強巡視管網通水情況',
      layerKey: 'watermonitor'
    });
  }

  // 5. 潮汐倒灌預測 (結合降雨與潮位)
  const now = new Date();
  const hsinchuTides = tides.find((t: any) => t.locationName?.includes('新竹') || t.locationName?.includes('新豐'));
  const todayTides = hsinchuTides?.daily?.find((d: any) => d.date === now.toISOString().split('T')[0]);
  const isRising = todayTides?.times?.some((t: any) => t.tide === '滿潮' && Math.abs(new Date(t.dateTime).getTime() - now.getTime()) < 3 * 3600000);
  
  if (isRising && max1hr > 5) {
    alerts.push({
      level: 'warning',
      icon: '🚢',
      title: 'AI 預警：內澇倒灌風險',
      message: '預測：未來 3 小時遇漲潮且降雨持續，下游幹管排水受阻',
      action: '建議配合「潮汐倒灌預警」圖層，預先準備閘門防堵',
      layerKey: 'tidalrisk'
    });
  }

  // 6. 無預警提示
  if (alerts.length === 0) {
    alerts.push({
      level: 'safe',
      icon: '✅',
      title: '智慧分析：狀況良好',
      message: '氣象預報穩定且各地水位感測器數據正常。',
      action: '維持例行維護與管線清疏作業',
      layerKey: null
    });
  }

  return alerts;
}

export interface AiAlert {
  level: 'critical' | 'warning' | 'info' | 'safe';
  icon: string;
  title: string;
  message: string;
  action: string;
  layerKey: string | null;
}
