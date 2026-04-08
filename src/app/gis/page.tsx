'use client';
// v2.1
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Search, ChevronLeft, ChevronRight, Map, Layers, MessageSquareWarning, Plus, Trash2, CheckCircle, CheckCircle2, CircleDot, Clock, MapPin, X, Download, ShieldAlert, Briefcase, Wrench, Home, Waves, GitBranch, Cloud, AlertTriangle, Activity } from 'lucide-react';
import { mapToEmicStatus } from '@/lib/cwa';

interface Pipeline {
  id: number; sewer_no: string; upstream_node: string; downstream_node: string;
  pipe_type: string; material: string; diameter: string; length: number;
  slope: number; upstream_elevation: number; downstream_elevation: number;
  project_id: string; project_name: string; contractor: string; area: string; source_file: string;
}

interface Manhole {
  id: number; manhole_no: string; x: number; y: number;
  manhole_type: string; location: string; ground_level: number; depth: number;
  project_id: string; project_name: string; contractor: string; area: string; source_file: string;
}

interface ProjectScope {
  id: number; name: string; type: string; status: string; progress_percent: number;
  bbox_min_x: number | null; bbox_min_y: number | null; bbox_max_x: number | null; bbox_max_y: number | null;
}

interface Complaint {
  id: number;
  reporter_name: string;
  phone: string;
  address: string;
  description: string;
  status: string;
  resolution_notes: string;
  reported_at: string;
  resolved_at: string | null;
  lat?: number;
  lng?: number;
}

interface MapManhole {
  id: number; manhole_no: string; lat: number; lng: number;
  manhole_type: string; location: string; depth: number; project_name: string; area?: string; system_type: string; source?: string;
}

interface MapPipeline {
  id: number; sewer_no: string; upstream_node: string; downstream_node: string;
  pipe_type: string; material: string;
  diameter: string; length: number; slope?: number; area?: string; project_name: string; system_type: string; source?: string;
  coords: [[number, number], [number, number]];
}

interface PipelineCondition {
  p_no: string; town: string; max_grade: number;
  has_damage: boolean; has_sedimentation: boolean; has_crossing: boolean;
  has_cable: boolean; has_other: boolean; cannot_survey: boolean;
  issue_count: number;
  issues: Array<{ type: string; grade: number | null; desc: string | null }>;
}

interface ConditionLine extends PipelineCondition {
  id: number;
  coords: [[number, number], [number, number]];
}

interface FloodHotspot {
  id: number; location: string; town: string;
  lat: number; lng: number; description: string;
  years: string; event_count: number; source: string;
}

interface WaterMonitor {
  id: number; seq: number; district: string;
  manhole_no: string; station_id: string;
  lat: number; lng: number; location: string; diameter: number | null;
}

interface InspectionSite {
  id: number; seq: number; district: string; name: string;
  site_type: string; lat: number; lng: number;
  address: string; depth: number | null; year: string;
}

interface WaterBankNode {
  id: number; name: string; town: string; segment: string; village: string;
  lat: number; lng: number;
  existing_buildings: number; existing_households: number; existing_storage_m3: number;
  recommended_add_m3: number; total_capacity_m3: number;
  priority: number; node_type: string; land_status: string;
  nearby_flood_hotspot: string; note: string;
}

interface GateStation {
  sensorid: string; observatoryname: string; sensorname: string;
  townname: string; latitude: number; longitude: number; isenable: boolean;
  value?: number; unit?: string; observationtime?: string;
}

interface PipeReport {
  id: number;
  report_date: string;
  address: string;
  issue_type: string;
  resolution: string;
  year: string;
  sheet: string;
  lat: number;
  lng: number;
}

import loadDynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = loadDynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = loadDynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Rectangle = loadDynamic(() => import('react-leaflet').then(m => m.Rectangle), { ssr: false });
const CircleMarker = loadDynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Polyline = loadDynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Polygon = loadDynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const Popup = loadDynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Tooltip = loadDynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false });
const ImageOverlay = loadDynamic(() => import('react-leaflet').then(m => m.ImageOverlay), { ssr: false });

// Inner component for map event handling — must be a child of MapContainer
// useMapEvents is a hook so it must be called inside a functional component that is a Leaflet child
const MapBoundsHandlerInner = loadDynamic(
  () => import('react-leaflet').then(module => {
    const { useMapEvents } = module;
    function BoundsHandler({ onBoundsChange }: { onBoundsChange: (b: any) => void }) {
      useMapEvents({
        moveend: (e: any) => {
          const b = e.target.getBounds();
          onBoundsChange({ min_lat: b.getSouth(), max_lat: b.getNorth(), min_lng: b.getWest(), max_lng: b.getEast() });
        },
        zoomend: (e: any) => {
          const b = e.target.getBounds();
          onBoundsChange({ min_lat: b.getSouth(), max_lat: b.getNorth(), min_lng: b.getWest(), max_lng: b.getEast() });
        },
      });
      return null;
    }
    return { default: BoundsHandler };
  }),
  { ssr: false }
);

function MapBoundsHandler({ onBoundsChange }: { onBoundsChange: (bounds: any) => void }) {
  return <MapBoundsHandlerInner onBoundsChange={onBoundsChange} />;
}

// Inner component for map flyTo (must be a child of MapContainer)
const MapFlyToInner = loadDynamic(
  () => import('react-leaflet').then(module => {
    const { useMap } = module;
    function FlyTo({ center }: { center: [number, number] }) {
      const map = useMap();
      useEffect(() => {
        map.flyTo(center, 16);
      }, [center, map]);
      return null;
    }
    return { default: FlyTo };
  }),
  { ssr: false }
);

function MapFlyTo({ center }: { center: [number, number] }) {
  return <MapFlyToInner center={center} />;
}

const MapClickHandlerInner = loadDynamic(
  () => import('react-leaflet').then(module => {
    const { useMapEvents } = module;
    function ClickHandler({ onClick }: { onClick: (latlng: any) => void }) {
      useMapEvents({
        click: (e) => onClick(e.latlng),
      });
      return null;
    }
    return { default: ClickHandler };
  }),
  { ssr: false }
);

function MapClickHandler({ onClick }: { onClick: (latlng: any) => void }) {
  return <MapClickHandlerInner onClick={onClick} />;
}

// Close-popup button that lives INSIDE a Popup — uses useMap() to call map.closePopup()
const ClosePopupBtnInner = loadDynamic(
  () => import('react-leaflet').then(module => {
    const { useMap } = module;
    function CloseBtn() {
      const map = useMap();
      return (
        <button
          onClick={(e) => { e.stopPropagation(); map.closePopup(); }}
          title="關閉"
          style={{ position: 'absolute', top: '6px', right: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#64748b', zIndex: 10, lineHeight: 1, padding: 0 }}
        >✕</button>
      );
    }
    return { default: CloseBtn };
  }),
  { ssr: false }
);
function ClosePopupBtn() { return <ClosePopupBtnInner />; }

// 輿情/新聞面板 — 定義在主元件外部，避免每秒時鐘 re-render 時因 function reference 改變
// 導致整個面板被 unmount/remount，使 slideInRight 動畫每秒觸發（閃爍）
interface SentimentPanelProps {
  showNewsPanel: boolean;
  showFloodNews: boolean;
  showFloodOpinion: boolean;
  isFetchingSentiment: boolean;
  sentimentData: { posts: any[]; news: any[] } | null;
  onClose: () => void;
}
function SentimentPanel({ showNewsPanel, showFloodNews, showFloodOpinion, isFetchingSentiment, sentimentData, onClose }: SentimentPanelProps) {
  if (!showNewsPanel) return null;
  const hasNews = showFloodNews;
  const hasPosts = showFloodOpinion;
  const panelTitle = hasNews && hasPosts ? '📰 新聞 & 💬 輿情' : hasNews ? '📰 歷史新聞回顧' : '💬 輿情蒐集';
  return (
    <div style={{
      position: 'fixed', top: '170px', right: '300px', width: '320px', maxHeight: 'calc(100vh - 200px)',
      backgroundColor: 'rgba(255, 255, 255, 0.97)', backdropFilter: 'blur(14px)', border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', zIndex: 9000, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.02), transparent)' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
          {panelTitle}
        </h3>
        <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: '#64748b', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}><X size={16} /></button>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {isFetchingSentiment && (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>正在載入資料...</div>
          </div>
        )}
        {!isFetchingSentiment && sentimentData && (
          <>
            {hasPosts && sentimentData.posts.length > 0 && (
              <>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 2px' }}>💬 社群輿情</div>
                {sentimentData.posts.map((p: any, i: number) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '12px', backgroundColor: 'white', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';}} onMouseLeave={e => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ec4899', backgroundColor: 'rgba(236,72,153,0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(236,72,153,0.2)' }}>{p.source}</span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>{p.time}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px', color: '#1e293b', lineHeight: '1.4' }}>{p.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', lineHeight: '1.5' }}>{p.summary}</div>
                  </a>
                ))}
              </>
            )}
            {hasNews && sentimentData.news.length > 0 && (
              <>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 2px', marginTop: hasPosts ? '6px' : 0 }}>📰 歷史新聞</div>
                {sentimentData.news.map((n: any, i: number) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '12px', backgroundColor: 'white', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';}} onMouseLeave={e => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(14,165,233,0.2)' }}>{n.source}</span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>{n.date}</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', lineHeight: '1.4', marginBottom: '4px' }}>{n.title}</div>
                    {n.summary && <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: '1.5' }}>{n.summary}</div>}
                  </a>
                ))}
              </>
            )}
            {!hasNews && !hasPosts && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '0.9rem' }}>
                請在左側勾選「歷史新聞」或「輿情蒐集」
              </div>
            )}
          </>
        )}
        {!isFetchingSentiment && !sentimentData && (
          <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '3rem', opacity: 0.2 }}>📭</div>
            <div style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500 }}>目前暫無相關資料</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GisQueryPage() {
  const [type, setType] = useState<'pipelines' | 'manholes'>('pipelines');
  const [systemType, setSystemType] = useState<'污水' | '雨水'>('污水');
  const [data, setData] = useState<(Pipeline | Manhole)[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'table' | 'map'>('map');
  const [projectScopes, setProjectScopes] = useState<ProjectScope[]>([]);

  // 🎯 工作模式選擇器 (Work Mode)
  type WorkMode = 'risk' | 'monitoring' | 'maintenance' | 'planning';
  const [workMode, setWorkMode] = useState<WorkMode>('risk');

  // 工作模式自動切換圖層邏輯
  const applyWorkModePreset = (mode: WorkMode) => {
    setWorkMode(mode);
    switch(mode) {
      case 'risk':
        // 風險評估：潮汐倒灌、淹水熱點、水位監測
        setShowTidalRisk(true);
        setShowFloodHotspots(true); setShowFloodNews(true);
        setShowWaterMonitors(true); setShowWraStn(true); setShowCountyStn(true); setShowLocal70(true);
        setShowPipelines(false);
        setShowManholes(false);
        setShowDredging(false);
        setShowWaterBank(false);
        break;
      case 'monitoring':
        // 數據監控：降雨、河川水位
        setShowWeatherPanel(true);
        setShowRainfallStations(true);
        setShowWaterMonitors(true); setShowWraStn(true); setShowCountyStn(true); setShowLocal70(true);
        setShowPipelines(false);
        setShowFloodHotspots(false);
        setShowTidalRisk(false);
        break;
      case 'maintenance':
        // 巡檢維護：管線、人孔、淤積、通報
        setShowPipelines(true);
        setShowManholes(true);
        setShowSedimentation(true);
        setShowPipelineConditions(true);
        setShowTidalRisk(false);
        setShowWaterBank(false);
        setShowDredging(false);
        break;
      case 'planning':
        // 規劃優化：水資源銀行、清淤、訪評
        setShowWaterBank(true);
        setShowDredging(true);
        setShowInspectionSites(true);
        setShowPipelines(false);
        setShowTidalRisk(false);
        setShowFloodHotspots(false);
        break;
    }
  };

  // Complaints State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [showComplaintsSidebar, setShowComplaintsSidebar] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    reporter_name: '', phone: '', address: '', description: '', status: 'pending' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ status: '', resolution_notes: '' });
  const [filterStatus, setFilterStatus] = useState('全部');
  const [compSearchTerm, setCompSearchTerm] = useState('');

  // Map area filter (for filtering visible manholes/pipelines by area)
  const [mapAreaFilter, setMapAreaFilter] = useState<string>('');

  // New: GIS data for manholes/pipelines on map
  const [mapManholes, setMapManholes] = useState<MapManhole[]>([]);
  const [mapPipelines, setMapPipelines] = useState<MapPipeline[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showManholes, setShowManholes] = useState(true);
  const [showPipelines, setShowPipelines] = useState(false);
  const [showCatchBasins, setShowCatchBasins] = useState(false);
  // 污水專用 5 圖層
  const [showSewageManholes, setShowSewageManholes] = useState(true);   // 污水竣工人孔
  const [showYinJing, setShowYinJing] = useState(true);                 // 陰井
  const [showSewagePipelines, setShowSewagePipelines] = useState(false); // 污水竣工管線
  const [showAlleyPipelines, setShowAlleyPipelines] = useState(false);   // 巷道連接管
  const [showProjectScopes, setShowProjectScopes] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [showHistoryReports, setShowHistoryReports] = useState(false);
  const [showHouseholds, setShowHouseholds] = useState(false);
  const [mapHouseholds, setMapHouseholds] = useState<any[]>([]);
  const [householdStats, setHouseholdStats] = useState<{total:number,geocoded:number,pending?:number} | null>(null);
  const [isGeocodingHouseholds, setIsGeocodingHouseholds] = useState(false);
  const geocodingLoopActiveRef = useRef(false);
  const currentBoundsRef = useRef<any>(null);

  // Pipeline conditions (縱走管況)
  const [showPipelineConditions, setShowPipelineConditions] = useState(false);
  const [pipelineConditions, setPipelineConditions] = useState<PipelineCondition[]>([]);
  const [conditionLines, setConditionLines] = useState<ConditionLine[]>([]);
  const [conditionMap, setConditionMap] = useState<Record<string, PipelineCondition>>({});

  // 淤積管段圖層
  const [showSedimentation, setShowSedimentation] = useState(false);
  // 雨水縱走淤積圖層（GIS縱走資料，貼合管段）
  interface SedSurveyRecord {
    id: number; p_no: string; district: string;
    us_mh: string; ds_mh: string;
    coords: [[number, number], [number, number]];
    sedi_dh: number; fd_depth: number; cls: number;
    count: number; inv_date: string; memo: string;
  }
  const [showSedSurvey, setShowSedSurvey] = useState(false);
  const [sedSurveyLines, setSedSurveyLines] = useState<SedSurveyRecord[]>([]);

  // Flood hotspots (淹水熱區)
  const [showFloodHotspots, setShowFloodHotspots] = useState(false);
  const [floodHotspots, setFloodHotspots] = useState<FloodHotspot[]>([]);
  const [showFloodOpinion, setShowFloodOpinion] = useState(false); // 輿情蒐集（PTT/媒體）

  // Water monitors (水情監測站)
  const [showWaterMonitors, setShowWaterMonitors] = useState(false);
  const [waterMonitors, setWaterMonitors] = useState<WaterMonitor[]>([]);
  const [wraStations, setWraStations] = useState<any[]>([]);
  const [wraInundation, setWraInundation] = useState<any[]>([]);
  const [wraCctv, setWraCctv] = useState<any[]>([]);
  // 水情監測子選項
  const [showWraStn, setShowWraStn] = useState(false);       // 水利署測站
  const [showCountyStn, setShowCountyStn] = useState(false); // 新竹縣市政府測站
  const [showLocal70, setShowLocal70] = useState(false);     // 縣府70處水情監測站
  const [isFetchingWra, setIsFetchingWra] = useState(false);
  const [showCctv, setShowCctv] = useState(false);
  const [cctvData, setCctvData] = useState<any[]>([]);
  const [cctvFetchedAt, setCctvFetchedAt] = useState<string | null>(null);

  // Inspection sites (訪評受評地點)
  const [showInspectionSites, setShowInspectionSites] = useState(false);
  const [inspectionSites, setInspectionSites] = useState<InspectionSite[]>([]);

  // 水資源銀行節點 (Water Bank Nodes)
  const [showWaterBank, setShowWaterBank] = useState(false);
  const [waterBankNodes, setWaterBankNodes] = useState<WaterBankNode[]>([]);

  // 水利署 IoW 閘門監測
  const [showGates, setShowGates] = useState(false);
  const [gateStations, setGateStations] = useState<GateStation[]>([]);

  // 🌊 潮汐倒灌預警 (Tidal Backflow Risk)
  const [showTidalRisk, setShowTidalRisk] = useState(false);
  const [showPredictive, setShowPredictive] = useState(false);
  const [tidalRiskData, setTidalRiskData] = useState<TidalRiskResponse | null>(null);

  // 輿情與新聞 (Sentiment & News)
  const [showFloodNews, setShowFloodNews] = useState(false);
  const [showSentiment, setShowSentiment] = useState(false);
  const [showNewsPanel, setShowNewsPanel] = useState(false); // 控制輿情面板顯示（獨立於地圖圖層）
  const [sentimentData, setSentimentData] = useState<{ posts: any[], news: any[] } | null>(null);
  const [isFetchingSentiment, setIsFetchingSentiment] = useState(false);

  // 圖層分組展開狀態 (Layer Group Expansion)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['維運管理', '防汛預警']);

  const fetchSentiment = async () => {
    setIsFetchingSentiment(true);
    try {
      const res = await fetch('/api/gis/flood-sentiment');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.posts || data.news) {
        setSentimentData(data);
      }
    } catch (err) {
      console.error('Fetch sentiment error:', err);
    } finally {
      setIsFetchingSentiment(false);
    }
  };


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
  interface TidalRiskResponse {
    success: boolean;
    statistics: { totalOutlets: number; redRiskCount: number; yellowRiskCount: number; greenRiskCount: number; overallRiskLevel: string };
    tidalData: Array<{ stationName: string; stationId: string; lat: number; lng: number; currentHeight: number; trend: string }>;
    weatherData: { rainfall1hr: number; rainfall3hr: number; temperature: number };
    assessments: TidalRiskAssessment[];
  }
  const [tidalRiskLoading, setTidalRiskLoading] = useState(false);
  const [tidalRiskError, setTidalRiskError] = useState('');
  const [selectedTidalOutlet, setSelectedTidalOutlet] = useState<TidalRiskAssessment | null>(null);

  // 潮汐數據自動刷新 — 頁面載入即抓，不依賴 showTidalRisk
  useEffect(() => {
    const fetchTidalRisk = async () => {
      setTidalRiskLoading(true);
      setTidalRiskError('');
      try {
        const res = await fetch('/api/gis/tidal-risk');
        if (!res.ok) throw new Error('Failed to fetch tidal risk data');
        const data: TidalRiskResponse = await res.json();
        setTidalRiskData(data);
      } catch (error) {
        setTidalRiskError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setTidalRiskLoading(false);
      }
    };

    fetchTidalRisk();
    const interval = setInterval(fetchTidalRisk, 300000); // 每5分鐘刷新一次
    return () => clearInterval(interval);
  }, []); // 移除 showTidalRisk 依賴，改為 mount 時自動抓取

  // 天氣預報 & AI 警示
  interface AiAlert {
    level: 'critical' | 'warning' | 'info' | 'safe';
    icon: string;
    title: string;
    message: string;
    action: string;
    layerKey: string | null;
  }
  interface WeatherForecast { area: string; pop6h: number|null; pop12h: number|null; weatherDesc: string; riskLevel: string; }
  interface RainfallStation { stationId: string; stationName: string; area: string; lat: number|null; lng: number|null; rainfall10min: number|null; rainfall1hr: number|null; rainfall3hr: number|null; rainfall24hr: number|null; }
  interface WeatherState {
    overallRisk: string; hasActiveWarning: boolean; fetchedAt: string;
    forecasts: WeatherForecast[]; rainfallStations: RainfallStation[];
    warnings: {phenomenonName: string; content: string}[];
    aiAlerts: AiAlert[];
  }
  const [showWeatherPanel, setShowWeatherPanel] = useState(false);
  const [showRainfallStations, setShowRainfallStations] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherState | null>(null);
  // 雷達回波
  const [showRadar, setShowRadar] = useState(false);
  const [radarTs, setRadarTs] = useState<number>(0); // 用於 cache busting，每次更新時遞增
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // 年度清淤
  interface DredgingRoute {
    id: number; year: string; work_date: string; district: string;
    road_name: string; total_length: number; manhole_count: number;
    cistern_count: number; culvert_types: string; lat: number; lng: number;
    polyline: [number, number][] | null;
    details: Array<{ culvert_type: string; length_m: number; pipe_ids: string }>;
  }
  // 都市計畫區範圍（永久顯示，不列圖層）
  const [urbanPlanZones, setUrbanPlanZones] = useState<Array<{ properties: { code: string; name: string; short: string }; geometry: { coordinates: number[][][] } }>>([]);
  useEffect(() => {
    fetch('/api/gis/urban-plan')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.features) setUrbanPlanZones(d.features); })
      .catch(() => {});
  }, []);

  const [showDredging, setShowDredging] = useState(false);
  const [showDredging113, setShowDredging113] = useState(false);
  const [showDredging114, setShowDredging114] = useState(false);
  const [showDredging115Rain, setShowDredging115Rain] = useState(false);
  const [showDredging114Sewage, setShowDredging114Sewage] = useState(false);
  const [showDredging115Sewage, setShowDredging115Sewage] = useState(false);
  const [dredgingYear, setDredgingYear] = useState<string>('all');
  const [dredgingRoutes, setDredgingRoutes] = useState<DredgingRoute[]>([]);
  const [dredging115Rain, setDredging115Rain] = useState<DredgingRoute[]>([]);
  const [dredging114Sewage, setDredging114Sewage] = useState<DredgingRoute[]>([]);
  const [dredging115Sewage, setDredging115Sewage] = useState<DredgingRoute[]>([]);
  const [dredgingSummary, setDredgingSummary] = useState<any>(null);

  // 未來建議清淤管段（115年規劃）
  const [showDredgingFuture, setShowDredgingFuture] = useState(false);
  const [dredgingSuggestions, setDredgingSuggestions] = useState<any[]>([]);
  const [dredgingSuggestionsLoaded, setDredgingSuggestionsLoaded] = useState(false);
  const [dredgingMeta, setDredgingMeta] = useState<{ budget_total_wan: number; budget_used_wan: number; budget_remaining_wan: number; total_length_m: number } | null>(null);

  // 115年污水建議清淤管段（依塞管熱點分析）
  const [showSewageDredgingFuture, setShowSewageDredgingFuture] = useState(false);
  const [sewageDredgingSuggestions, setSewageDredgingSuggestions] = useState<any[]>([]);
  const [sewageDredgingMeta, setSewageDredgingMeta] = useState<{ budget_total_wan: number; budget_used_wan: number; budget_remaining_wan: number; total_length_m: number } | null>(null);

  // 115年污水巡檢路段
  const [showInspectionPanel, setShowInspectionPanel] = useState(false);
  const [inspectionRoutes115, setInspectionRoutes115] = useState<any[]>([]);
  const [inspectionProgress, setInspectionProgress] = useState<{ total: number; completed: number; progress_pct: number } | null>(null);
  const [inspectionUpdating, setInspectionUpdating] = useState<string | null>(null);

  // 塞管通報（開口契約歷史紀錄）
  const [pipeReports, setPipeReports] = useState<PipeReport[]>([]);
  const [pipeReportFilter, setPipeReportFilter] = useState<string>('all');
  const [complaintTab, setComplaintTab] = useState<'current' | 'history'>('current');
  const [historySearch, setHistorySearch] = useState('');
  // 人孔附近塞管通報
  const [manholeNearbyReports, setManholeNearbyReports] = useState<Record<number, PipeReport[]>>({});

  // Connection check state (GIS search bar)
  const [connectionResult, setConnectionResult] = useState<{connected:boolean,count:number,records:any[],query:string,total:number,input:string} | null>(null);
  const [connExpanded, setConnExpanded] = useState(false); // 接管結果面板展開/收合
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  // Connection check state (complaint form)
  const [formConnectionResult, setFormConnectionResult] = useState<{connected:boolean,count:number,records:any[],query:string,total:number} | null>(null);
  const [isCheckingFormConnection, setIsCheckingFormConnection] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<[number, number] | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showMobileLayers, setShowMobileLayers] = useState(false);
  const mapRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [alertCounts, setAlertCounts] = useState({ red: 0, yellow: 0, green: 0 });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Real-time clock
  useEffect(() => {
    const update = () => setCurrentTime(
      new Date().toLocaleString('zh-TW', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Sync alert counts from tidal risk data
  useEffect(() => {
    if (tidalRiskData?.statistics) {
      setAlertCounts({
        red: tidalRiskData.statistics.redRiskCount,
        yellow: tidalRiskData.statistics.yellowRiskCount,
        green: tidalRiskData.statistics.greenRiskCount,
      });
    }
  }, [tidalRiskData]);

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setGpsLocation(coords);
        setMapCenter(coords);
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); alert('無法取得位置，請確認已開啟定位權限'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // New: Address Search, Street View & Selection State
  const [mapCenter, setMapCenter] = useState<[number, number]>([24.83, 121.03]);
  const [addressSearch, setAddressSearch] = useState(''); // debounced value, for suggestions
  const [inputHasValue, setInputHasValue] = useState(false); // tracks whether input is non-empty (for button enable)
  const inputRef = useRef<HTMLInputElement>(null);
  const addrDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);
  const [streetViewCoords, setStreetViewCoords] = useState<[number, number] | null>(null);
  const [clickCoords, setClickCoords] = useState<[number, number] | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ── Night mode ──
  const [nightMode, setNightMode] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('gis-night-mode');
    if (saved === '1') setNightMode(true);
  }, []);
  const toggleNight = () => {
    setNightMode(prev => {
      localStorage.setItem('gis-night-mode', !prev ? '1' : '0');
      return !prev;
    });
  };

  // Autocomplete Suggestions logic
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (addressSearch.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch(`/api/gis/search-suggestions?q=${encodeURIComponent(addressSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (e) { console.error(e); }
      finally { setIsFetchingSuggestions(false); }
    }, 400);

    return () => clearTimeout(handler);
  }, [addressSearch]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (s: any) => {
    setAddressSearch(s.title);
    setInputHasValue(true);
    if (inputRef.current) inputRef.current.value = s.title; // sync uncontrolled input
    setMapCenter([s.lat, s.lng]);
    setClickCoords([s.lat, s.lng]);
    setShowSuggestions(false);
    if (s.type === 'asset') {
      // If it's a specific asset, we could potentially select it here, 
      // but for now just positioning is a great start.
    }
  };

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // Read from the actual DOM input (uncontrolled) so we always get the latest typed value
    const currentVal = (inputRef.current?.value ?? addressSearch).trim();
    if (!currentVal) return;
    setIsSearchingAddress(true);

    // Auto-complete with Hsinchu County if not present to improve local search reliability
    let query = currentVal;
    if (!query.includes('新竹') && !query.includes('竹北') && !query.includes('竹東')) {
      query = '新竹縣' + query;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=tw&limit=1`, {
        headers: { 
          'Accept-Language': 'zh-TW',
          'User-Agent': 'SewerageManagementSystem/1.0 (fly@example.com)'
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]);
        setClickCoords([lat, lon]); // Drop a temporary marker at search result
      } else {
        alert('找不到該地址，請嘗試輸入更完整的地址。如果是路段請包含鄉鎮市名稱，例如：竹北市光明六路');
      }
    } catch (e) {
      console.error('Geocoding error:', e);
      alert('地圖定位服務暫時無法連線。');
    } finally {
      setIsSearchingAddress(false);
    }
    // Also check connection status (runs in parallel, no await)
    checkConnection(currentVal);
  };

  const openStreetView = useCallback((lat: number, lng: number) => {
    const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
    if (isNaN(latNum) || isNaN(lngNum)) return;
    setStreetViewCoords([latNum, lngNum]);
    setShowStreetView(true);
  }, []);

  const checkConnection = async (addr: string) => {
    if (!addr || addr.trim().length < 3) return;
    setIsCheckingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch(`/api/gis/check-connection?addr=${encodeURIComponent(addr.trim())}`);
      if (res.ok) { setConnectionResult(await res.json()); setConnExpanded(true); }
    } catch (e) { console.error(e); }
    finally { setIsCheckingConnection(false); }
  };

  const checkFormConnection = async (addr: string) => {
    if (!addr || addr.trim().length < 4) { setFormConnectionResult(null); return; }
    setIsCheckingFormConnection(true);
    setFormConnectionResult(null);
    try {
      const res = await fetch(`/api/gis/check-connection?addr=${encodeURIComponent(addr.trim())}`);
      if (res.ok) setFormConnectionResult(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsCheckingFormConnection(false); }
  };

  const fetchMapData = useCallback(async (bounds?: any) => {
    const b = bounds || currentBoundsRef.current;
    if (!b) return;
    currentBoundsRef.current = b;
    setMapLoading(true);
    try {
      const params = new URLSearchParams({
        system_type: systemType,
        min_lat: String(b.min_lat), max_lat: String(b.max_lat),
        min_lng: String(b.min_lng), max_lng: String(b.max_lng),
      });
      const res = await fetch(`/api/gis/map-data?${params}`);
      if (res.ok) {
        const d = await res.json();
        setMapManholes(d.manholes || []);
        setMapPipelines(d.pipelines || []);
        setMapError(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setMapError(`API 錯誤 ${res.status}: ${errData.details || errData.error || '未知錯誤'}`);
      }
    } catch (e: any) {
      console.error(e);
      setMapError(`連線錯誤: ${e?.message || String(e)}`);
    }
    finally { setMapLoading(false); }
  }, [systemType]);

  const fetchHouseholds = useCallback(async (bounds?: any) => {
    const b = bounds || currentBoundsRef.current;
    if (!b) return;
    try {
      const params = new URLSearchParams({
        min_lat: String(b.min_lat), max_lat: String(b.max_lat),
        min_lng: String(b.min_lng), max_lng: String(b.max_lng),
      });
      const res = await fetch(`/api/gis/household-connections?${params}`);
      if (res.ok) {
        const d = await res.json();
        setMapHouseholds(d.households || []);
        if (d.stats) setHouseholdStats(d.stats);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchPipelineConditions = useCallback(async (bounds?: any) => {
    try {
      // 1. Fetch summary stats (for the status bar count)
      const res = await fetch('/api/gis/pipeline-conditions');
      if (res.ok) {
        const d = await res.json();
        const conditions: PipelineCondition[] = d.conditions || [];
        setPipelineConditions(conditions);
        const m: Record<string, PipelineCondition> = {};
        conditions.forEach(c => { m[c.p_no] = c; });
        setConditionMap(m);
      }
    } catch (e) { console.error('fetchPipelineConditions error:', e); }

    // 2. Fetch condition lines with coordinates (bbox-aware)
    try {
      const b = bounds || currentBoundsRef.current;
      const bParams = b
        ? `&min_lat=${b.min_lat}&max_lat=${b.max_lat}&min_lng=${b.min_lng}&max_lng=${b.max_lng}`
        : '';
      const res2 = await fetch(`/api/gis/pipeline-conditions-map?dummy=1${bParams}`);
      if (res2.ok) {
        const d2 = await res2.json();
        setConditionLines(d2.conditions || []);
      }
    } catch (e) { console.error('fetchConditionLines error:', e); }
  }, []);

  const fetchSedSurvey = useCallback(async (bounds?: any) => {
    try {
      const b = bounds || currentBoundsRef.current;
      const bParams = b
        ? `?min_lat=${b.min_lat}&max_lat=${b.max_lat}&min_lng=${b.min_lng}&max_lng=${b.max_lng}`
        : '';
      const res = await fetch(`/api/gis/sedimentation-survey${bParams}`);
      if (res.ok) {
        const d = await res.json();
        const recs = d.records || [];
        setSedSurveyLines(recs);
        // Fit map to show all records when first loaded
        if (recs.length > 0 && bParams === '') {
          setTimeout(() => {
            if (!mapRef.current) return;
            const pts: [number, number][] = [];
            for (const r of recs) {
              if (r.coords?.[0]) pts.push(r.coords[0]);
              if (r.coords?.[1]) pts.push(r.coords[1]);
            }
            if (pts.length > 0) {
              const minLat = Math.min(...pts.map(p => p[0]));
              const maxLat = Math.max(...pts.map(p => p[0]));
              const minLng = Math.min(...pts.map(p => p[1]));
              const maxLng = Math.max(...pts.map(p => p[1]));
              mapRef.current.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [40, 40], maxZoom: 13, animate: true });
            }
          }, 80);
        }
      }
    } catch (e) { console.error('fetchSedSurvey error:', e); }
  }, []);

  const fetchFloodHotspots = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/flood-hotspots');
      if (res.ok) {
        const d = await res.json();
        setFloodHotspots(d.hotspots || []);
      }
    } catch (e) { console.error('fetchFloodHotspots error:', e); }
  }, []);

  const fetchWaterMonitors = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/water-monitors');
      if (res.ok) {
        const d = await res.json();
        setWaterMonitors(d.monitors || []);
      }
    } catch (e) { console.error('fetchWaterMonitors error:', e); }

    // Also fetch WRA IoT Stations
    setIsFetchingWra(true);
    try {
      const res = await fetch('/api/wra-iot/stations');
      if (res.ok) {
        const d = await res.json();
        setWraStations(d.riverStations || []);
        setWraInundation(d.inundationStations || []);
        setWraCctv(d.cctvStations || []);
      }
    } catch (e) { console.error('fetchWraStations error:', e); }
    finally { setIsFetchingWra(false); }
  }, []);

  const fetchCctv = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/cctv');
      if (res.ok) {
        const d = await res.json();
        setCctvData(d.cameras || []);
        setCctvFetchedAt(d.fetchedAt || null);
      }
    } catch (e) { console.error('fetchCctv error:', e); }
  }, []);

  // 自動輪詢：showCctv 啟用時每 60 秒更新一次
  useEffect(() => {
    if (!showCctv) return;
    fetchCctv();
    const timer = setInterval(fetchCctv, 60_000);
    return () => clearInterval(timer);
  }, [showCctv, fetchCctv]);

  const fetchGates = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/gates');
      if (res.ok) {
        const d = await res.json();
        setGateStations(d.gates || []);
      }
    } catch (e) { console.error('fetchGates error:', e); }
  }, []);

  const fetchInspectionSites = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/inspection-sites');
      if (res.ok) {
        const d = await res.json();
        setInspectionSites(d.sites || []);
      }
    } catch (e) { console.error('fetchInspectionSites error:', e); }
  }, []);

  const fetchWaterBankNodes = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/water-bank-nodes');
      if (res.ok) {
        const d = await res.json();
        setWaterBankNodes(d.nodes || []);
      }
    } catch (e) { console.error('fetchWaterBankNodes error:', e); }
  }, []);

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const res = await fetch('/api/gis/weather');
      if (!res.ok) throw new Error('風險資料取得失敗');
      const data = await res.json();
      setWeatherData(data);

      // 每次天氣刷新後，自動觸發 Telegram 通知（API 端有防重複邏輯）
      const stations: any[] = data.rainfallStations ?? [];
      const max1hr = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall1hr ?? 0)) : 0;
      if (max1hr >= 15) {
        // 取出當前潮汐紅色警示出水口名稱，附在通知裡
        fetch('/api/gis/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rainfallStations: stations }),
        }).catch(() => {}); // 靜默失敗，不影響主畫面
      }
    } catch (err: any) {
      setWeatherError(err.message);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // 頁面載入時自動抓取天氣，並每 5 分鐘刷新一次
  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  // 頁面載入時預先抓取淹水熱點，避免使用者勾選時才 fetch 造成畫面跳動
  useEffect(() => { fetchFloodHotspots(); }, [fetchFloodHotspots]);

  // 雷達回波：透過 /api/cwa-radar 代理 CWA 中央氣象署雷達合成圖
  // 每次呼叫時遞增 radarTs，讓 ImageOverlay 強制重新載入圖片
  const refreshRadar = useCallback(() => {
    setRadarTs(Date.now());
  }, []);

  useEffect(() => {
    if (!showRadar) return;
    refreshRadar(); // 立即載入
    const interval = setInterval(refreshRadar, 300000); // 每5分鐘更新
    return () => clearInterval(interval);
  }, [showRadar, refreshRadar]);

  const handleAiAlertClick = (alert: AiAlert) => {
    if (!alert.layerKey) return;
    
    // Toggle relevant layers based on AI recommendation
    if (alert.layerKey === 'watermonitor') {
      setShowWaterMonitors(true); setShowWraStn(true); setShowCountyStn(true); setShowLocal70(true);
      if (wraStations.length === 0) fetchWaterMonitors();
    } else if (alert.layerKey === 'floods') {
      setShowFloodHotspots(true); setShowFloodNews(true);
      if (floodHotspots.length === 0) fetchFloodHotspots();
    } else if (alert.layerKey === 'tidalrisk') {
      setShowTidalRisk(true);
    }
    
    // Auto-expand the prevention group if it's not expanded
    if (!expandedGroups.includes('🌊 防汛預警')) {
      setExpandedGroups(prev => [...prev, '🌊 防汛預警']);
    }
  };

  const fetchPipeReports = useCallback(async (type: string = 'all') => {
    try {
      const res = await fetch(`/api/gis/pipe-reports?type=${encodeURIComponent(type)}`);
      if (res.ok) {
        const d = await res.json();
        setPipeReports(d.reports || []);
      }
    } catch (e) { console.error('fetchPipeReports error:', e); }
  }, []);

  const fetchDredgingSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/dredging-suggestion');
      if (res.ok) {
        const d = await res.json();
        setDredgingSuggestions(d.suggestions || []);
        setDredgingMeta({
          budget_total_wan: d.budget_total_wan ?? 1800,
          budget_used_wan: d.budget_used_wan ?? 0,
          budget_remaining_wan: d.budget_remaining_wan ?? 0,
          total_length_m: d.total_length_m ?? 0,
        });
      }
    } catch (e) { console.error('fetchDredgingSuggestions error:', e); }
    finally { setDredgingSuggestionsLoaded(true); }
  }, []);

  const fetchSewageDredgingSuggestions = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/sewage-dredging-suggestion');
      if (res.ok) {
        const d = await res.json();
        setSewageDredgingSuggestions(d.suggestions || []);
        setSewageDredgingMeta({
          budget_total_wan: d.budget_total_wan ?? 800,
          budget_used_wan: d.budget_used_wan ?? 0,
          budget_remaining_wan: d.budget_remaining_wan ?? 0,
          total_length_m: d.total_length_m ?? 0,
        });
      }
    } catch (e) { console.error('fetchSewageDredgingSuggestions error:', e); }
  }, []);

  // 頁面載入時預先抓取建議清淤管段，供現況看板使用
  useEffect(() => {
    fetchDredgingSuggestions();
  }, [fetchDredgingSuggestions]);

  const fetchDredgingRoutes = useCallback(async (year?: string) => {
    try {
      const yr = year ?? dredgingYear;
      const url = yr === 'all' ? '/api/gis/dredging-routes' : `/api/gis/dredging-routes?year=${yr}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        const routes: DredgingRoute[] = d.routes || [];
        setDredgingRoutes(routes);
        setDredgingSummary(d.summary || null);
        // Fit map bounds to all dredging routes so Leaflet re-projects every polyline path.
        // Without this, paths outside the current viewport are culled to "M0 0" by Leaflet.
        if (routes.length > 0) {
          setTimeout(() => {
            if (!mapRef.current) return;
            const pts: [number, number][] = [];
            for (const r of routes) {
              if (r.polyline && r.polyline.length > 0) {
                for (const p of r.polyline) pts.push(p as [number, number]);
              } else if (r.lat && r.lng) {
                pts.push([r.lat, r.lng]);
              }
            }
            if (pts.length > 0) {
              const minLat = Math.min(...pts.map(p => p[0]));
              const maxLat = Math.max(...pts.map(p => p[0]));
              const minLng = Math.min(...pts.map(p => p[1]));
              const maxLng = Math.max(...pts.map(p => p[1]));
              mapRef.current.fitBounds(
                [[minLat, minLng], [maxLat, maxLng]],
                { padding: [40, 40], maxZoom: 13, animate: true }
              );
            }
          }, 80);
        }
      }
    } catch (e) { console.error('fetchDredgingRoutes error:', e); }
  }, [dredgingYear]);

  const fetchInspectionRoutes115 = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/sewage-inspection-115');
      if (res.ok) {
        const d = await res.json();
        setInspectionRoutes115(d.routes || []);
        setInspectionProgress({ total: d.total, completed: d.completed, progress_pct: d.progress_pct });
      }
    } catch (e) { console.error('fetchInspectionRoutes115 error:', e); }
  }, []);

  const toggleInspectionStatus = useCallback(async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setInspectionUpdating(id);
    try {
      const res = await fetch('/api/gis/sewage-inspection-115', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        const d = await res.json();
        setInspectionRoutes115(prev =>
          prev.map(r => r.id === id ? { ...r, ...d.route } : r)
        );
        // 更新進度
        setInspectionRoutes115(prev => {
          const completed = prev.filter(r => r.id === id ? newStatus === 'completed' : r.status === 'completed').length;
          setInspectionProgress({ total: prev.length, completed, progress_pct: Math.round((completed / prev.length) * 100) });
          return prev;
        });
      }
    } catch (e) { console.error('toggleInspectionStatus error:', e); }
    finally { setInspectionUpdating(null); }
  }, []);

  const fetchDredging115Rain = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/dredging-routes?year=115&sewer_type=雨水');
      if (res.ok) {
        const d = await res.json();
        setDredging115Rain(d.routes || []);
      }
    } catch (e) { console.error('fetchDredging115Rain error:', e); }
  }, []);

  const fetchDredging114Sewage = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/dredging-routes?year=114&sewer_type=污水');
      if (res.ok) {
        const d = await res.json();
        setDredging114Sewage(d.routes || []);
      }
    } catch (e) { console.error('fetchDredging114Sewage error:', e); }
  }, []);

  const fetchDredging115Sewage = useCallback(async () => {
    try {
      const res = await fetch('/api/gis/dredging-routes?year=115&sewer_type=污水');
      if (res.ok) {
        const d = await res.json();
        setDredging115Sewage(d.routes || []);
      }
    } catch (e) { console.error('fetchDredging115Sewage error:', e); }
  }, []);

  const fetchNearbyReports = useCallback(async (manholeId: number, lat: number, lng: number) => {
    if (manholeNearbyReports[manholeId]) return; // 已載入過
    try {
      const res = await fetch(`/api/gis/pipe-reports/nearby?lat=${lat}&lng=${lng}&radius=0.00063`);
      if (res.ok) {
        const d = await res.json();
        setManholeNearbyReports(prev => ({ ...prev, [manholeId]: d.reports || [] }));
      }
    } catch (e) { console.error('fetchNearbyReports error:', e); }
  }, [manholeNearbyReports]);

  const startAutoGeocode = useCallback(async () => {
    // Prevent multiple loops running simultaneously
    if (geocodingLoopActiveRef.current) return;
    geocodingLoopActiveRef.current = true;
    setIsGeocodingHouseholds(true);
    try {
      while (geocodingLoopActiveRef.current) {
        const res = await fetch('/api/gis/geocode-households', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 30 }),
        });
        if (!res.ok) break;
        const d = await res.json();
        if (d.stats) setHouseholdStats(d.stats);
        // Refresh map markers after each batch
        await fetchHouseholds();
        // Stop when nothing left to process
        if (d.processed === 0) break;
        // Small pause between batches so UI stays responsive
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) { console.error('Geocoding loop error:', e); }
    finally {
      geocodingLoopActiveRef.current = false;
      setIsGeocodingHouseholds(false);
      // Final refresh
      fetchHouseholds();
    }
  }, [fetchHouseholds]);

  const fetchProjectScopes = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/scopes');
      if (res.ok) setProjectScopes(await res.json());
    } catch(e) { console.error(e); }
  }, []);

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await fetch('/api/complaints');
      if (res.ok) {
        const d = await res.json();
        // Keep all for the list, but filter for map
        setComplaints(d);
      }
    } catch(e) { console.error(e); }
  }, []);

  const handleCompInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingId !== null) {
      setEditData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCompSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId !== null) {
        const res = await fetch(`/api/complaints/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editData)
        });
        if (res.ok) {
          setEditingId(null);
          fetchComplaints();
        }
      } else {
        const res = await fetch('/api/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setFormData({ reporter_name: '', phone: '', address: '', description: '', status: 'pending' });
          setIsFormOpen(false);
          fetchComplaints();
        }
      }
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompDelete = async (id: number) => {
    if (!confirm('確定要刪除此陳情紀錄嗎？')) return;
    try {
      const res = await fetch(`/api/complaints/${id}`, { method: 'DELETE' });
      if (res.ok) fetchComplaints();
    } catch (error) {
      console.error('Failed to delete complaint:', error);
    }
  };

  const handleExportEmic = (comp: Complaint) => {
    const emicData = {
      CaseNo: `SEW-${comp.id}-${new Date(comp.reported_at).getTime()}`,
      CaseType: "下水道阻塞/溢流",
      Location: comp.address,
      Coordinates: { lat: comp.lat || null, lng: comp.lng || null },
      Reporter: comp.reporter_name,
      Contact: comp.phone,
      Description: comp.description,
      Status: mapToEmicStatus(comp.status),
      ReportTime: comp.reported_at,
      Resolution: comp.resolution_notes || ""
    };
    
    const blob = new Blob([JSON.stringify(emicData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EMIC_Report_${comp.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startCompEditing = (complaint: Complaint) => {
    setEditingId(complaint.id);
    setEditData({ status: complaint.status, resolution_notes: complaint.resolution_notes || '' });
    setIsFormOpen(true);
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending': return { label: '待處理', color: 'var(--danger)', icon: Clock };
      case 'processing': return { label: '處理中', color: '#f59e0b', icon: Clock };
      case 'resolved': return { label: '已解決', color: 'var(--success)', icon: CheckCircle };
      default: return { label: status, color: 'var(--text-muted)', icon: Clock };
    }
  };

  const filteredComplaintsList = complaints.filter(c => {
    const matchStatus = filterStatus === '全部' || 
                       (filterStatus === '待處理' && c.status === 'pending') ||
                       (filterStatus === '處理中' && c.status === 'processing') ||
                       (filterStatus === '已解決' && c.status === 'resolved');
    const matchSearch = c.address.includes(compSearchTerm) || c.reporter_name.includes(compSearchTerm);
    return matchStatus && matchSearch;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, systemType, page: String(page) });
      if (searchTerm) params.set('q', searchTerm);
      if (areaFilter) params.set('area', areaFilter);
      const res = await fetch(`/api/gis?${params}`);
      if (res.ok) {
        const d = await res.json();
        setData(d.data);
        setTotal(d.total);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [type, systemType, page, searchTerm, areaFilter]);

  useEffect(() => {
    if (viewMode === 'table') fetchData();
    else {
      fetchProjectScopes();
      fetchComplaints();
      // Load household stats (without geocoded points until layer is toggled on)
      fetch('/api/gis/geocode-households').then(r => r.json()).then(d => setHouseholdStats(d)).catch(() => {});
      // Trigger initial map load with Zhubei default bounds
      const defaultBounds = { min_lat: 24.78, max_lat: 24.88, min_lng: 120.98, max_lng: 121.08 };
      fetchMapData(defaultBounds);
    }
  }, [fetchData, fetchProjectScopes, fetchComplaints, viewMode, fetchMapData]);

  // Re-fetch when systemType changes in map mode
  useEffect(() => {
    if (viewMode === 'map') fetchMapData();
  }, [systemType, viewMode, fetchMapData]);

  const totalPages = Math.ceil(total / 50);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const materialLabel = (m: string) => {
    const map: Record<string, string> = {
      'PVCP': 'PVC管', 'RCP': '鋼筋混凝土管', 'DIP': '延性鑄鐵管',
      'DICP': '延性鑄鐵管', 'PE': 'PE管', 'HDPE': 'HDPE管', 'VCP': '陶管'
    };
    return map[m] || m;
  };


  // 淹水熱區圓點 — 以 useMemo 隔離，避免每秒時鐘更新導致 pathOptions 重建而關閉彈窗
  // 必須在所有早返（early return）之前呼叫，符合 Rules of Hooks
  const floodHotspotMarkers = useMemo(() => {
    if (!showFloodNews && !showFloodOpinion) return null;
    const isOpinionOnly = showFloodOpinion && !showFloodNews;
    return floodHotspots.map((hs: FloodHotspot) => {
      const radius = Math.min(8 + hs.event_count * 4, 28);
      const opacity = Math.min(0.45 + hs.event_count * 0.08, 0.75);
      return (
        <CircleMarker
          key={`flood-${hs.id}`}
          center={[hs.lat, hs.lng]}
          radius={radius}
          pathOptions={{ color: isOpinionOnly ? '#7c3aed' : '#0369a1', fillColor: isOpinionOnly ? '#a78bfa' : '#38bdf8', fillOpacity: opacity, weight: 2, dashArray: '4,3' }}
        >
          <Popup>
            <div style={{ minWidth: '210px', lineHeight: '1.8' }}>
              <strong style={{ color: '#0369a1', fontSize: '1rem' }}>🌊 {hs.location}</strong><br />
              🏙️ {hs.town}<br />
              📅 年份：{hs.years}<br />
              🔢 事件次數：<strong style={{ color: '#dc2626' }}>{hs.event_count}</strong> 次<br />
              📝 {hs.description}<br />
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>來源：{hs.source}</span>
              <div style={{ marginTop: '8px' }}>
                <button onClick={() => openStreetView(hs.lat, hs.lng)} style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
                  📷 Google 街景
                </button>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      );
    });
  }, [floodHotspots, showFloodNews, showFloodOpinion, openStreetView]);

  if (!isMounted) return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>;

  return (
    <>
    <style>{`
      @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      html, body { overflow: hidden; }
      .gis-map-container { position: relative; overflow: hidden; height: 100%; }
      @media (max-width: 1200px) {
        .gis-three-col { grid-template-columns: 180px 1fr 0 !important; }
        .gis-right-panel { display: none !important; }
      }
      @media (max-width: 768px) {
        .gis-three-col { grid-template-columns: 1fr !important; }
        .gis-left-panel { display: none !important; }
      }
      .leaflet-popup-content-wrapper { max-width: 85vw !important; }
      /* 放大 Leaflet popup 原生關閉鈕，讓使用者容易找到 */
      .leaflet-popup-close-button {
        width: 28px !important; height: 28px !important;
        font-size: 22px !important; line-height: 26px !important;
        text-align: center !important;
        right: 6px !important; top: 6px !important;
        background: #f1f5f9 !important; border-radius: 50% !important;
        border: 1px solid #cbd5e1 !important; color: #475569 !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
      }
      .leaflet-popup-close-button:hover { background: #e2e8f0 !important; color: #1e293b !important; }
    `}</style>

    {/* Night mode global style */}
    {nightMode && (
      <style>{`
        .gis-night-map .leaflet-container {
          filter: invert(1) hue-rotate(180deg) saturate(1.1) brightness(0.95) !important;
        }
        .gis-night-map .leaflet-popup-content-wrapper,
        .gis-night-map .leaflet-popup-tip {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `}</style>
    )}

    {/* Full-Screen Container */}
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: nightMode ? '#0a0e1a' : '#f1f5f9', filter: nightMode ? 'invert(1) hue-rotate(180deg) saturate(0.9) brightness(0.92)' : 'none', transition: 'filter 0.4s ease' }}>

      {/* ── HEADER BAR ─────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(90deg, #0f2756, #1a3a7c, #2563eb)',
        color: 'white', padding: '0 16px', height: '52px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.3px' }}>🗺️ 新竹縣下水道管理系統 GIS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { setShowWeatherPanel(!showWeatherPanel); if (!weatherData) fetchWeather(); }}
            style={{ padding: '5px 12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: showWeatherPanel ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
          >
            <Cloud size={14} />
            {weatherLoading && <span style={{ opacity: 0.7 }}>載入中…</span>}
            {!weatherLoading && !weatherData && <span>天氣</span>}
            {!weatherLoading && weatherData && (() => {
              const stations = weatherData.rainfallStations ?? [];
              const r1  = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall1hr  ?? 0)) : null;
              const r3  = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall3hr  ?? 0)) : null;
              const r24 = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall24hr ?? 0)) : null;
              const riskColor = (weatherData.overallRisk === '極高' || weatherData.overallRisk === '高') ? '#fca5a5'
                              : weatherData.overallRisk === '中' ? '#fcd34d'
                              : '#86efac';
              return (
                <>
                  <span style={{ color: riskColor, fontWeight: 700, fontSize: '0.75rem' }}>
                    {weatherData.hasActiveWarning ? '🚨' : weatherData.overallRisk === '極高' || weatherData.overallRisk === '高' ? '⚠️' : '✅'}
                    {' '}{weatherData.overallRisk}
                  </span>
                  <span style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
                  {[
                    { label: '1h', val: r1 },
                    { label: '3h', val: r3 },
                    { label: '24h', val: r24 },
                  ].map(({ label, val }) => (
                    <span key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                      <span style={{ fontSize: '0.62rem', opacity: 0.65 }}>{label}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: (val ?? 0) >= 30 ? '#fca5a5' : (val ?? 0) >= 10 ? '#fcd34d' : 'white' }}>
                        {val != null ? `${val.toFixed(1)}` : '—'}
                        <span style={{ fontSize: '0.58rem', fontWeight: 400, opacity: 0.7 }}>mm</span>
                      </span>
                    </span>
                  ))}
                </>
              );
            })()}
          </button>
          <span style={{ fontSize: '0.8rem', opacity: 0.8, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{currentTime}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '16px', backgroundColor: alertCounts.red > 0 ? 'rgba(220,38,38,0.75)' : 'rgba(16,185,129,0.75)', fontSize: '0.8rem', fontWeight: '700' }}>
            <AlertTriangle size={13} />
            <span>{alertCounts.red} 紅警 · {alertCounts.yellow} 黃警</span>
          </div>
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
            <button onClick={() => setViewMode('map')} style={{ padding: '5px 14px', border: 'none', backgroundColor: viewMode === 'map' ? 'rgba(255,255,255,0.22)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: viewMode === 'map' ? '700' : '400' }}>
              🗺️ 地圖
            </button>
            <button onClick={() => setViewMode('table')} style={{ padding: '5px 14px', border: 'none', backgroundColor: viewMode === 'table' ? 'rgba(255,255,255,0.22)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: viewMode === 'table' ? '700' : '400' }}>
              📊 表格
            </button>
          </div>
          <button onClick={toggleNight} title={nightMode ? '切換日間模式' : '切換夜間模式'} style={{ padding: '5px 12px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', backgroundColor: nightMode ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}>
            {nightMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* ── MAP MODE ──────────────────────────────────────────── */}
      {viewMode === 'map' && typeof window !== 'undefined' ? (
        <>
          {/* ── AI 三段式預警：災前準備 / 災中應變 / 災後復原 ── */}
          {(() => {
            const maxRainfall1hr = weatherData ? Math.max(0, ...weatherData.rainfallStations.map((s: any) => s.rainfall1hr ?? 0)) : 0;
            const maxPop6h = weatherData ? Math.max(0, ...(weatherData.forecasts ?? []).map((f: any) => f.pop6h ?? 0)) : 0;
            const overallRisk = weatherData?.overallRisk || '—';
            const hasWarning = weatherData?.hasActiveWarning || false;

            // 災前：預報 + 整體風險
            const preLevel = hasWarning ? 3 : overallRisk === '極高' ? 3 : overallRisk === '高' ? 2 : overallRisk === '中' ? 1 : 0;
            const preColor  = preLevel === 3 ? '#dc2626' : preLevel === 2 ? '#f59e0b' : preLevel === 1 ? '#3b82f6' : '#10b981';
            const preBadge  = hasWarning ? '🚨 警特報發布' : overallRisk === '極高' ? '⚠️ 高度警戒' : overallRisk === '高' ? '⚠️ 注意備勤' : overallRisk === '中' ? '🔵 輕度注意' : '✅ 狀況穩定';
            const preMetric = maxPop6h > 0 ? `未來降雨機率 ${maxPop6h}%` : `整體風險：${overallRisk || '—'}`;
            const preAction = hasWarning ? '確認防汛部署，通知值班人員緊急待命' : maxPop6h >= 60 ? `降雨機率偏高，預置移動式抽水機於熱點` : maxPop6h >= 30 ? '例行備勤，確認閘門及抽水站功能正常' : '維持例行維護，定期巡視管線通水狀況';

            // 災中：即時感測器 + 潮汐警示
            const durLevel = alertCounts.red > 0 ? 3 : (maxRainfall1hr >= 30 || alertCounts.yellow >= 3) ? 3 : (maxRainfall1hr >= 15 || alertCounts.yellow >= 1) ? 2 : maxRainfall1hr >= 5 ? 1 : 0;
            const durColor  = durLevel === 3 ? '#dc2626' : durLevel === 2 ? '#f59e0b' : durLevel === 1 ? '#3b82f6' : '#10b981';
            const durBadge  = alertCounts.red > 0 ? `🔴 倒灌紅警 ${alertCounts.red} 處` : maxRainfall1hr >= 30 ? `🟠 強降雨 ${maxRainfall1hr.toFixed(0)}mm/hr` : maxRainfall1hr >= 5 ? `🔵 降雨中 ${maxRainfall1hr.toFixed(1)}mm/hr` : '✅ 晴穩無異常';
            const durMetric = alertCounts.yellow > 0 ? `黃警 ${alertCounts.yellow} 處 · 監測中` : wraStations.length > 0 ? `${wraStations.length} 站河川水位正常` : '即時監測中';
            const durAction = alertCounts.red > 0 ? '立即關閉防潮閘門，啟動排水泵站，通報里民' : maxRainfall1hr >= 30 ? '緊急派員巡查低窪地區，調派移動式抽水機' : maxRainfall1hr >= 5 ? '加強巡視管網通水情況，監控水位變化' : '持續例行監測，無需緊急行動';

            // 災後：復原 + 通報追蹤
            const postActive = alertCounts.red === 0 && maxRainfall1hr < 5;
            const postColor  = '#10b981';
            const postBadge  = postActive ? '🔧 可執行復原' : '⏸️ 待災情穩定';
            const postMetric = postActive ? '管線清疏、設施巡視可安排' : '等待降雨停止及水位回落';
            const postAction = postActive ? '安排路面巡查，追蹤開口契約待辦通報，評估受損管段' : '待水位回落後啟動路面修復與管線 TV 檢測';

            const phases = [
              { key: 'pre',   icon: '🛡️', phase: '災前準備', badge: preBadge,  metric: preMetric,  action: preAction,  color: preColor,  },
              { key: 'dur',   icon: '⚡', phase: '災中應變', badge: durBadge,  metric: durMetric,  action: durAction,  color: durColor,  },
              { key: 'post',  icon: '🔧', phase: '災後復原', badge: postBadge, metric: postMetric, action: postAction, color: postColor, },
            ];

            return (
              <div style={{ display: 'flex', backgroundColor: 'white', borderBottom: '2px solid #e2e8f0', flexShrink: 0 }}>
                {phases.map(({ key, icon, phase, badge, metric, action, color }, i) => (
                  <div key={key} style={{
                    flex: 1, padding: '9px 14px 8px',
                    borderRight: i < 2 ? '1px solid #e2e8f0' : 'none',
                    borderBottom: `3px solid ${color}`,
                    backgroundColor: `${color}09`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#6b7280', letterSpacing: '0.4px' }}>{icon} {phase}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color, backgroundColor: `${color}18`, padding: '1px 8px', borderRadius: '10px', border: `1px solid ${color}35`, whiteSpace: 'nowrap' }}>{badge}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginBottom: '3px' }}>{metric}</div>
                    <div style={{ fontSize: '0.72rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.4 }}>→ {action}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── 三大監測指標卡 ── */}
          {(() => {
            const maxRainfall1hr = weatherData ? Math.max(0, ...weatherData.rainfallStations.map((s: any) => s.rainfall1hr ?? 0)) : 0;
            const highRainfall = maxRainfall1hr >= 30 || weatherData?.overallRisk === '極高' || weatherData?.overallRisk === '高';
            const sentimentFlood = sentimentData ? sentimentData.posts.filter((p: any) => /淹水|積水|倒灌|暴雨/.test(p.title + p.summary)).length : 0;
            type CardId = 'tidal' | 'flood' | 'water';
            let aiCard: CardId = 'water';
            if (alertCounts.red > 0) aiCard = 'tidal';
            else if (highRainfall || floodHotspots.length > 2 || sentimentFlood >= 2) aiCard = 'flood';

            const cards = [
              { id: 'tidal' as CardId, value: alertCounts.red, mainLabel: '潮汐倒灌', subLabel: '危急警告', color: '#dc2626', bg: 'linear-gradient(135deg,#fee2e2,#fecaca)', onClick: () => { setShowTidalRisk(true); } },
              { id: 'flood' as CardId, value: floodHotspots.length, mainLabel: '淹水熱點', subLabel: '積淹水區域', color: '#f59e0b', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', onClick: () => { setShowFloodHotspots(true); setShowFloodNews(true); if (floodHotspots.length === 0) fetchFloodHotspots(); } },
              { id: 'water' as CardId, value: wraStations.length, mainLabel: '河川水位', subLabel: 'WRA 監測站', color: '#0ea5e9', bg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', onClick: () => { setShowWaterMonitors(true); setShowWraStn(true); } },
            ];
            return (
              <div style={{ display: 'flex', gap: '8px', padding: '7px 12px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                {cards.map(({ id, value, mainLabel, subLabel, color, bg, onClick }) => {
                  const isActive = id === aiCard;
                  return (
                    <div key={id} onClick={onClick} style={{
                      flex: 1, background: bg, border: `2px solid ${isActive ? color : `${color}55`}`,
                      borderRadius: '10px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '10px',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      boxShadow: isActive ? `0 0 0 3px ${color}28, 0 3px 10px ${color}20` : '0 1px 4px rgba(0,0,0,0.06)',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    }}>
                      <div style={{ fontSize: '1.55rem', fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '800', color }}>{mainLabel}</div>
                        <div style={{ fontSize: '0.65rem', color: `${color}bb`, fontWeight: 500 }}>{subLabel}</div>
                      </div>
                      {isActive && <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 6px ${color}`, animation: 'pulse 1.5s ease-in-out infinite' }} />}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* 3-COLUMN MAIN LAYOUT */}
          <div className="gis-three-col" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 300px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* LEFT SIDEBAR */}
            <div className="gis-left-panel" style={{ backgroundColor: 'white', borderRight: '1px solid #e2e8f0', overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* 系統類型 — 最上方，永遠可見 */}
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${systemType === '污水' ? '#3b82f6' : '#0ea5e9'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', marginBottom: '6px', flexShrink: 0 }}>
                <button onClick={() => { setSystemType('污水'); setPage(1); setSelectedAsset(null); setShowStreetView(false); }} style={{ flex: 1, minHeight: '36px', padding: '0 4px', border: 'none', backgroundColor: systemType === '污水' ? '#3b82f6' : '#f8fafc', color: systemType === '污水' ? 'white' : '#64748b', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>🔵 污水</button>
                <button onClick={() => { setSystemType('雨水'); setPage(1); setSelectedAsset(null); setShowStreetView(false); }} style={{ flex: 1, minHeight: '36px', padding: '0 4px', border: 'none', backgroundColor: systemType === '雨水' ? '#0ea5e9' : '#f8fafc', color: systemType === '雨水' ? 'white' : '#64748b', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>🌧️ 雨水</button>
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 0' }}>
                <Layers size={13} /> 圖層控制
                <button title="關閉所有圖層並重設選取" onClick={() => { setShowManholes(false); setShowPipelines(false); setShowCatchBasins(false); setShowHouseholds(false); setShowPipelineConditions(false); setShowSedimentation(false); setShowFloodHotspots(false); setShowFloodNews(false); setShowFloodOpinion(false); setShowWaterMonitors(false); setShowWraStn(false); setShowCountyStn(false); setShowLocal70(false); setShowCctv(false); setShowTidalRisk(false); setShowWaterBank(false); setShowGates(false); setShowDredging(false); setShowDredging113(false); setShowDredging114(false); setShowDredgingFuture(false); setShowInspectionSites(false); setShowComplaints(false); setShowHistoryReports(false); setMapAreaFilter(''); setSelectedAsset(null); setShowStreetView(false); }} style={{ marginLeft: 'auto', padding: '2px 7px', border: '1px solid #e5e7eb', borderRadius: '5px', backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '700' }}>全清除</button>
              </div>
              {/* 地區篩選（影響人孔/管線地圖顯示） */}
              <select value={mapAreaFilter} onChange={(e) => setMapAreaFilter(e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#374151', backgroundColor: mapAreaFilter ? '#f0f9ff' : 'white', marginBottom: '4px' }}>
                <option value="">🗂️ 全部地區</option>
                <option value="竹北一期">竹北一期</option>
                <option value="竹北二期">竹北二期</option>
                <option value="竹東二期">竹東二期</option>
                <option value="竹東(台泥重劃區)">竹東(台泥重劃區)</option>
                <option value="關西鎮">關西鎮</option>
              </select>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 2px', padding: '0 4px' }}>基礎設施</div>
              {(systemType === '污水' ? [
                { checked: showSewageManholes, onChange: (v: boolean) => { setShowSewageManholes(v); if (!v && selectedAsset?.type === 'manhole') { setSelectedAsset(null); setShowStreetView(false); } }, label: '🟣 污水竣工人孔', color: '#8b5cf6' },
                { checked: showYinJing, onChange: (v: boolean) => { setShowYinJing(v); if (!v && selectedAsset?.type === 'manhole') { setSelectedAsset(null); setShowStreetView(false); } }, label: '🟢 陰井', color: '#10b981' },
                { checked: showSewagePipelines, onChange: (v: boolean) => { setShowSewagePipelines(v); if (!v && selectedAsset?.type === 'pipeline') { setSelectedAsset(null); setShowStreetView(false); } }, label: '🔵 污水竣工管線', color: '#3b82f6' },
                { checked: showAlleyPipelines, onChange: (v: boolean) => { setShowAlleyPipelines(v); if (!v && selectedAsset?.type === 'pipeline') { setSelectedAsset(null); setShowStreetView(false); } }, label: '🔷 巷道連接管', color: '#06b6d4' },
                { checked: showHouseholds, onChange: (v: boolean) => { setShowHouseholds(v); if (v && mapHouseholds.length === 0) fetchHouseholds(); }, label: '🏠 用戶接管資料', color: '#eab308' },
              ] : [
                { checked: showManholes, onChange: (v: boolean) => { setShowManholes(v); if (!v && selectedAsset?.type === 'manhole') { setSelectedAsset(null); setShowStreetView(false); } }, label: '🟣 人孔 / 陰井', color: '#8b5cf6' },
                { checked: showPipelines, onChange: (v: boolean) => { setShowPipelines(v); if (!v && selectedAsset?.type === 'pipeline') { setSelectedAsset(null); setShowStreetView(false); } }, label: '🔵 管線網絡', color: '#3b82f6' },
                { checked: showCatchBasins, onChange: (v: boolean) => setShowCatchBasins(v), label: '🟡 集水井', color: '#d97706' },
              ]).map(({ checked, onChange, label, color }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b', backgroundColor: checked ? `${color}22` : 'transparent', transition: 'background 0.15s' }}>
                  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
                  <span>{label}</span>
                </label>
              ))}
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '6px 0 2px', padding: '0 4px' }}>風險監測</div>
              {/* 淹水熱區（含子選項） */}
              <div style={{ borderRadius: '6px', marginBottom: '1px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 6px', fontSize: '0.88rem', color: '#1e293b', fontWeight: '600' }}>
                  <span style={{ flex: 1 }}>🌊 淹水熱區</span>
                </div>
                <div style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {[
                    { checked: showFloodNews, onChange: (v: boolean) => { setShowFloodNews(v); if (v) { setShowNewsPanel(true); if (!sentimentData) fetchSentiment(); } }, label: '📰 歷史新聞', color: '#3b82f6' },
                    { checked: showFloodOpinion, onChange: (v: boolean) => { setShowFloodOpinion(v); if (v) { setShowNewsPanel(true); if (!sentimentData) fetchSentiment(); } }, label: '💬 輿情蒐集', color: '#7c3aed' },
                  ].map(({ checked, onChange, label, color }) => (
                    <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 6px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', color: '#1e293b', backgroundColor: checked ? `${color}22` : 'transparent', transition: 'background 0.15s' }}>
                      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
                      <span style={{ flex: 1 }}>{label}</span>
                    </label>
                  ))}
                  {/* 查看面板按鈕 — 常駐顯示避免版面跳動，未勾選時呈灰色禁用外觀 */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={() => { if (showFloodNews || showFloodOpinion) { setShowNewsPanel(true); if (!sentimentData) fetchSentiment(); } }}
                        style={{
                          width: '100%', margin: '2px 0', padding: '5px 10px', borderRadius: '7px',
                          cursor: (showFloodNews || showFloodOpinion) ? 'pointer' : 'default',
                          fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', border: 'none',
                          opacity: (showFloodNews || showFloodOpinion) ? 1 : 0.35,
                          background: (!showFloodNews && !showFloodOpinion)
                            ? 'rgba(0,0,0,0.06)'
                            : showNewsPanel
                            ? 'rgba(99,102,241,0.12)'
                            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: (!showFloodNews && !showFloodOpinion) ? '#9ca3af' : showNewsPanel ? '#6366f1' : 'white',
                          boxShadow: (!showFloodNews && !showFloodOpinion) || showNewsPanel ? 'none' : '0 2px 6px rgba(99,102,241,0.35)',
                          transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}>
                        {showNewsPanel ? '📋 面板已開啟' : '📋 查看新聞 & 輿情'}
                      </button>
                  </div>
                </div>
              </div>
              {[
                { checked: showTidalRisk, onChange: (v: boolean) => setShowTidalRisk(v), label: '🌊 潮汐警告', color: '#dc2626' },
              ].map(({ checked, onChange, label, color }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b', backgroundColor: checked ? `${color}22` : 'transparent', transition: 'background 0.15s' }}>
                  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
                  <span>{label}</span>
                </label>
              ))}
              {/* 水情監測（含子選項） */}
              <div style={{ borderRadius: '6px', marginBottom: '1px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 6px', fontSize: '0.88rem', color: '#1e293b', fontWeight: '600' }}>
                  <span>📡 水情監測</span>
                </div>
                <div style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {[
                    { checked: showWraStn, onChange: (v: boolean) => { setShowWraStn(v); if (v && wraStations.length === 0) fetchWaterMonitors(); }, label: '🌊 水利署測站', color: '#1d4ed8' },
                    { checked: showRainfallStations, onChange: (v: boolean) => { setShowRainfallStations(v); if (v && !weatherData) fetchWeather(); }, label: '🌧️ 雨量站（氣象署）', color: '#0ea5e9' },
                    { checked: showLocal70, onChange: (v: boolean) => { setShowLocal70(v); if (v && waterMonitors.length === 0) fetchWaterMonitors(); }, label: '📍 縣府70處監測站', color: '#0ea5e9' },
                    { checked: showCctv, onChange: (v: boolean) => setShowCctv(v), label: `📹 水利署 CCTV${cctvData.length > 0 ? `（${cctvData.length}）` : ''}`, color: '#92400e' },
                    { checked: showGates, onChange: (v: boolean) => { setShowGates(v); if (v && gateStations.length === 0) fetchGates(); }, label: `🚧 IoW 閘門監測${gateStations.length > 0 ? `（${gateStations.length}）` : ''}`, color: '#b45309' },
                    { checked: showRadar, onChange: (v: boolean) => setShowRadar(v), label: '🌩️ 雷達回波', color: '#7c3aed' },
                  ].map(({ checked, onChange, label, color }) => (
                    <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 6px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', color: '#1e293b', backgroundColor: checked ? `${color}22` : 'transparent', transition: 'background 0.15s' }}>
                      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* ── 巡檢維護 ── */}
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '6px 0 2px', padding: '0 4px' }}>巡檢維護</div>
              {[
                ...(systemType === '污水' ? [{ checked: showComplaints || showHistoryReports, onChange: (v: boolean) => { setShowComplaints(v); setShowHistoryReports(v); if (v && pipeReports.length === 0) fetchPipeReports('all'); }, label: '🔴 塞管通報', color: '#ef4444' }] : []),
                { checked: showSedSurvey, onChange: (v: boolean) => { setShowSedSurvey(v); if (v) fetchSedSurvey(); }, label: `🟤 管線淤積（縱走${sedSurveyLines.length > 0 ? `·${sedSurveyLines.length}管段` : ''}）`, color: '#b45309' },
              ].map(({ checked, onChange, label, color }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b', backgroundColor: checked ? `${color}22` : 'transparent', transition: 'background 0.15s' }}>
                  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
                  <span>{label}</span>
                </label>
              ))}

              {/* 清淤路線（含年度子選項） */}
              <div style={{ borderRadius: '6px', marginBottom: '1px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 6px', fontSize: '0.88rem', color: '#1e293b', fontWeight: '600' }}>
                  <span>🚿 清淤路線</span>
                </div>
                <div style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {[
                    { checked: showDredging113, onChange: (v: boolean) => { setShowDredging113(v); setShowDredging(v || showDredging114); if (v) fetchDredgingRoutes('all'); }, label: '📅 113年雨水已清淤管段', color: '#15803d' },
                    { checked: showDredging114, onChange: (v: boolean) => { setShowDredging114(v); setShowDredging(showDredging113 || v); if (v) fetchDredgingRoutes('all'); }, label: '📅 114年雨水已清淤管段', color: '#0d9488' },
                    { checked: showDredging115Rain, onChange: (v: boolean) => { setShowDredging115Rain(v); if (v && dredging115Rain.length === 0) fetchDredging115Rain(); }, label: '📅 115年雨水清淤路段', color: '#0891b2' },
                    { checked: showDredging114Sewage, onChange: (v: boolean) => { setShowDredging114Sewage(v); if (v && dredging114Sewage.length === 0) fetchDredging114Sewage(); }, label: '🚿 114年污水清淤路段', color: '#7c3aed' },
                    { checked: showDredging115Sewage, onChange: (v: boolean) => { setShowDredging115Sewage(v); if (v && dredging115Sewage.length === 0) fetchDredging115Sewage(); }, label: '🚿 115年污水清淤路段', color: '#9333ea' },
                  ].map(({ checked, onChange, label, color }) => (
                    <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '3px 6px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.85rem', color: '#1e293b', backgroundColor: checked ? `${color}22` : 'transparent', transition: 'background 0.15s' }}>
                      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── 規劃建議 ── */}
              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '8px 0 2px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0d9488' }} />
                規劃建議
              </div>
              {[
                { checked: showWaterBank, onChange: (v: boolean) => { setShowWaterBank(v); if (v && waterBankNodes.length === 0) fetchWaterBankNodes(); }, label: '💧 水銀行節點', color: '#0ea5e9' },
                { checked: showInspectionSites, onChange: (v: boolean) => { setShowInspectionSites(v); if (v && inspectionSites.length === 0) fetchInspectionSites(); }, label: '📋 評鑑地點', color: '#7c3aed' },
                { checked: showDredgingFuture, onChange: (v: boolean) => { setShowDredgingFuture(v); if (v && dredgingSuggestions.length === 0) fetchDredgingSuggestions(); }, label: '🔮 115年雨水建議清淤管段', color: '#f97316' },
                { checked: showSewageDredgingFuture, onChange: (v: boolean) => { setShowSewageDredgingFuture(v); if (v && sewageDredgingSuggestions.length === 0) fetchSewageDredgingSuggestions(); }, label: '🚿 115年污水建議清淤管段', color: '#7c3aed' },
              ].map(({ checked, onChange, label, color }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b', backgroundColor: checked ? `${color}22` : 'transparent', transition: 'background 0.15s' }}>
                  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
                  <span>{label}</span>
                </label>
              ))}
              {/* 115年雨水清淤預算資訊 */}
              {showDredgingFuture && dredgingMeta && (
                <div style={{ padding: '8px 8px 6px', margin: '2px 0', backgroundColor: 'rgba(249,115,22,0.07)', borderRadius: '8px', border: '1px solid rgba(249,115,22,0.2)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#ea580c', marginBottom: '5px' }}>💰 115年雨水清淤預算規劃</div>
                  <div style={{ fontSize: '0.72rem', color: '#78350f', lineHeight: '1.7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>總預算</span><strong>{dredgingMeta.budget_total_wan.toLocaleString()} 萬</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>規劃使用</span><strong style={{ color: '#dc2626' }}>{dredgingMeta.budget_used_wan.toLocaleString()} 萬</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>預計清淤</span><strong>{(dredgingMeta.total_length_m / 1000).toFixed(1)} km</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>路段數</span><strong>{dredgingSuggestions.length} 條</strong>
                    </div>
                  </div>
                  <div style={{ marginTop: '6px', height: '6px', borderRadius: '3px', backgroundColor: 'rgba(249,115,22,0.15)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '3px', backgroundColor: '#f97316', width: `${Math.min(100, (dredgingMeta.budget_used_wan / dredgingMeta.budget_total_wan) * 100)}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '3px', textAlign: 'right' }}>
                    {((dredgingMeta.budget_used_wan / dredgingMeta.budget_total_wan) * 100).toFixed(0)}% 已分配
                  </div>
                </div>
              )}
              {/* 115年污水清淤預算資訊 */}
              {showSewageDredgingFuture && sewageDredgingMeta && (
                <div style={{ padding: '8px 8px 6px', margin: '2px 0', backgroundColor: 'rgba(124,58,237,0.07)', borderRadius: '8px', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#7c3aed', marginBottom: '5px' }}>💰 115年污水清淤預算規劃</div>
                  <div style={{ fontSize: '0.72rem', color: '#4c1d95', lineHeight: '1.7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>總預算</span><strong>{sewageDredgingMeta.budget_total_wan.toLocaleString()} 萬</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>規劃使用</span><strong style={{ color: '#dc2626' }}>{sewageDredgingMeta.budget_used_wan.toLocaleString()} 萬</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>預計清淤</span><strong>{(sewageDredgingMeta.total_length_m / 1000).toFixed(1)} km</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>熱點路段</span><strong>{sewageDredgingSuggestions.length} 條</strong>
                    </div>
                  </div>
                  <div style={{ marginTop: '6px', height: '6px', borderRadius: '3px', backgroundColor: 'rgba(124,58,237,0.15)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '3px', backgroundColor: '#7c3aed', width: `${Math.min(100, (sewageDredgingMeta.budget_used_wan / sewageDredgingMeta.budget_total_wan) * 100)}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '3px', textAlign: 'right' }}>
                    {((sewageDredgingMeta.budget_used_wan / sewageDredgingMeta.budget_total_wan) * 100).toFixed(0)}% 已分配
                  </div>
                </div>
              )}
              <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
              <button onClick={() => setShowComplaintsSidebar(!showComplaintsSidebar)}
                style={{ width: '100%', padding: '7px', borderRadius: '7px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <MessageSquareWarning size={13} /> 通報管理
              </button>
              <button onClick={() => { setEditingId(null); setFormData({ reporter_name: '', phone: '', address: '', description: '', status: 'pending' }); setIsFormOpen(true); }}
                style={{ width: '100%', padding: '7px', borderRadius: '7px', backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #dc2626', fontWeight: '600', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                ＋ 新增通報
              </button>
            </div>

            {/* CENTER: MAP */}
            <div className="gis-map-container">

              {/* Floating Address Search Bar — moved to TOP */}
              <form onSubmit={handleAddressSearch} style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 1000, display: 'flex', gap: '5px' }}>
                <div style={{ flexGrow: 1, position: 'relative' }}>
                  <Search size={15} color="#6b7280" style={{ position: 'absolute', left: '11px', top: '9px', zIndex: 10 }} />
                  {/* Uncontrolled input — no value prop, uses ref. onChange only updates debounced state for suggestions. */}
                  <input className="gis-search-input" type="text"
                    ref={inputRef}
                    placeholder="搜尋路名、人孔位置或地址..."
                    autoComplete="off"
                    onChange={(e) => {
                      const val = e.target.value;
                      const hasVal = !!val.trim();
                      setInputHasValue(hasVal); // minimal re-render: only on empty↔non-empty flip
                      if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current);
                      addrDebounceRef.current = setTimeout(() => setAddressSearch(val), 300);
                      setShowSuggestions(hasVal);
                    }}
                    onFocus={() => { if (inputRef.current?.value.trim()) setShowSuggestions(true); }}
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', backgroundColor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', fontSize: '0.88rem', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
                  {showSuggestions && addressSearch.trim().length >= 2 && (
                    <div ref={suggestionsRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 3000, overflow: 'hidden' }}>
                      {isFetchingSuggestions && <div style={{ padding: '12px', fontSize: '0.84rem', color: '#6b7280' }}>搜尋建議中...</div>}
                      {!isFetchingSuggestions && suggestions.length === 0 && <div style={{ padding: '12px', fontSize: '0.84rem', color: '#6b7280', textAlign: 'center' }}>找不到相符建議</div>}
                      {!isFetchingSuggestions && suggestions.map((s, idx) => (
                        <div key={idx} onClick={() => handleSelectSuggestion(s)}
                          style={{ padding: '9px 13px', cursor: 'pointer', borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid #f1f5f9', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '9px' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <span style={{ color: s.type === 'asset' ? '#8b5cf6' : '#6b7280' }}>{s.type === 'asset' ? <Database size={13} /> : <MapPin size={13} />}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{s.title}</div>
                            {s.subtitle && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.subtitle}</div>}
                          </div>
                          <span style={{ fontSize: '0.66rem', backgroundColor: s.type === 'asset' ? 'rgba(139,92,246,0.1)' : '#f1f5f9', color: s.type === 'asset' ? '#8b5cf6' : '#6b7280', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>{s.type === 'asset' ? '設施' : '地址'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button disabled={isSearchingAddress} type="submit"
                  style={{ padding: '7px 12px', borderRadius: '8px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', fontWeight: '600', cursor: isSearchingAddress ? 'wait' : 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                  {isSearchingAddress ? '定位中...' : '📍 定位'}
                </button>
                <button type="button" disabled={isCheckingConnection || !inputHasValue}
                  onClick={() => checkConnection(inputRef.current?.value.trim() || '')}
                  style={{ padding: '7px 12px', borderRadius: '8px', backgroundColor: '#10b981', color: 'white', border: 'none', fontWeight: '600', cursor: (isCheckingConnection || !inputHasValue) ? 'not-allowed' : 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', opacity: !inputHasValue ? 0.6 : 1 }}>
                  {isCheckingConnection ? '查詢中...' : '🏠 查接管'}
                </button>
              </form>

              {/* Connection Check Result — collapsible, below search bar */}
              {(isCheckingConnection || connectionResult) && (
                <div style={{ position: 'absolute', top: '52px', left: '10px', right: '10px', zIndex: 999, borderRadius: '8px', border: `1.5px solid ${connectionResult?.connected ? '#10b981' : connectionResult ? '#ef4444' : '#d1d5db'}`, backgroundColor: connectionResult?.connected ? '#f0fdf4' : connectionResult ? '#fff1f2' : '#f9fafb', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                  {/* 標題列（永遠可見） */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', cursor: connectionResult ? 'pointer' : 'default' }}
                    onClick={() => connectionResult && setConnExpanded(p => !p)}>
                    {isCheckingConnection
                      ? <><div style={{ width: '12px', height: '12px', border: '2px solid #d1d5db', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} /><span style={{ fontSize: '0.84rem', color: '#6b7280' }}>查詢接管資料中...</span></>
                      : <><span style={{ fontSize: '0.95rem' }}>{connectionResult?.connected ? '✅' : '❌'}</span>
                          <strong style={{ fontSize: '0.84rem', color: connectionResult?.connected ? '#065f46' : '#991b1b', flex: 1 }}>
                            {connectionResult?.connected ? `已接管（共 ${connectionResult.total} 筆）` : `查無接管資料「${connectionResult?.input}」`}
                          </strong>
                          {connectionResult?.connected && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{connExpanded ? '▲' : '▼'}</span>}
                        </>
                    }
                    <button onClick={(e) => { e.stopPropagation(); setConnectionResult(null); setConnExpanded(false); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>✕</button>
                  </div>
                  {/* 展開後的記錄清單 */}
                  {connExpanded && !isCheckingConnection && connectionResult?.connected && (
                    <div style={{ borderTop: '1px solid #bbf7d0', maxHeight: '180px', overflowY: 'auto' }}>
                      {connectionResult.records.slice(0, 5).map((rec: any, i: number) => (
                        <div key={rec.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderBottom: i < Math.min(connectionResult.records.length, 5) - 1 ? '1px solid #d1fae5' : 'none', fontSize: '0.78rem' }}>
                          <MapPin size={11} color="#10b981" style={{ flexShrink: 0 }} />
                          <span style={{ flex: 1, color: '#064e3b', fontWeight: 500 }}>{rec.usage_addr || rec.delivery_addr || '—'}</span>
                          {rec.water_no && <span style={{ color: '#6b7280', flexShrink: 0 }}>水號 {rec.water_no}</span>}
                        </div>
                      ))}
                      {connectionResult.total > 5 && (
                        <div style={{ padding: '5px 12px', fontSize: '0.73rem', color: '#6b7280', textAlign: 'center' }}>
                          另有 {connectionResult.total - 5} 筆，<a href={`/connection?addr=${encodeURIComponent(connectionResult.input)}`} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9' }}>查看全部</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* GPS Button */}
              <button onClick={handleGPS} title="取得我的位置"
                style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 1000, width: '42px', height: '42px', borderRadius: '8px', backgroundColor: gpsLocation ? '#10b981' : 'white', border: '2px solid rgba(0,0,0,0.2)', color: gpsLocation ? 'white' : '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                {gpsLoading ? '⏳' : '📍'}
              </button>

              {/* 地圖資料計數浮動列 */}
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {mapLoading && (
                  <div style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                    <div style={{ width: '10px', height: '10px', border: '2px solid #d1d5db', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    地圖資料載入中…
                  </div>
                )}
                {mapError && !mapLoading && (
                  <div style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', fontSize: '0.72rem', color: '#dc2626', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                    ⚠️ {mapError}
                  </div>
                )}
                {!mapLoading && !mapError && (showManholes || showPipelines || showCatchBasins || showSewageManholes || showYinJing || showSewagePipelines || showAlleyPipelines) && (
                  <div style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                    {systemType === '污水' ? (<>
                      {showSewageManholes && <span style={{ color: '#8b5cf6', fontWeight: 700 }}>🟣 {mapManholes.filter(m => m.source === '竣工人孔' && (!mapAreaFilter || m.area === mapAreaFilter)).length} 竣工人孔</span>}
                      {showYinJing && <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 {mapManholes.filter(m => m.source === '陰井' && (!mapAreaFilter || m.area === mapAreaFilter)).length} 陰井</span>}
                      {showSewagePipelines && <span style={{ color: '#3b82f6', fontWeight: 700 }}>🔵 {mapPipelines.filter(p => p.source === '竣工管線' && (!mapAreaFilter || p.area === mapAreaFilter)).length} 竣工管線</span>}
                      {showAlleyPipelines && <span style={{ color: '#06b6d4', fontWeight: 700 }}>🔷 {mapPipelines.filter(p => p.source === '巷道連接管' && (!mapAreaFilter || p.area === mapAreaFilter)).length} 巷道連接管</span>}
                    </>) : (<>
                      {showManholes && <span style={{ color: '#8b5cf6', fontWeight: 700 }}>🟣 {mapManholes.filter(m => m.manhole_type !== '集水井' && (!mapAreaFilter || m.area === mapAreaFilter)).length} 人孔</span>}
                      {showCatchBasins && <span style={{ color: '#d97706', fontWeight: 700 }}>🟡 {mapManholes.filter(m => m.manhole_type === '集水井' && (!mapAreaFilter || m.area === mapAreaFilter)).length} 集水井</span>}
                      {showPipelines && <span style={{ color: '#3b82f6', fontWeight: 700 }}>🔵 {mapPipelines.filter(p => !mapAreaFilter || p.area === mapAreaFilter).length} 管段</span>}
                    </>)}
                    {mapAreaFilter && <span style={{ color: '#0ea5e9', fontSize: '0.68rem', background: '#e0f2fe', padding: '1px 6px', borderRadius: '8px' }}>篩選：{mapAreaFilter}</span>}
                    {!mapAreaFilter && <span style={{ color: '#9ca3af' }}>（視窗範圍內）</span>}
                  </div>
                )}
              </div>

              {showComplaintsSidebar && (
                <div className="gis-sidebar" style={{ position: 'absolute', top: 0, right: 0, width: '420px', height: '100%', backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', zIndex: 1000, borderLeft: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)' }}>
                  {/* 標題 */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquareWarning size={20} /> 塞管通報管理
                    </h3>
                    <button onClick={() => setShowComplaintsSidebar(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <X size={24} />
                    </button>
                  </div>

                  {/* 分頁標籤 */}
                  <div style={{ display: 'flex', borderBottom: '2px solid var(--glass-border)', flexShrink: 0 }}>
                    <button onClick={() => setComplaintTab('current')} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', border: 'none', borderBottom: complaintTab === 'current' ? '2px solid var(--danger)' : '2px solid transparent', marginBottom: '-2px', backgroundColor: 'transparent', color: complaintTab === 'current' ? 'var(--danger)' : 'var(--text-muted)', fontWeight: complaintTab === 'current' ? 'bold' : 'normal', cursor: 'pointer' }}>
                      📋 即時通報 ({complaints.length})
                    </button>
                    <button onClick={() => { setComplaintTab('history'); if (pipeReports.length === 0) fetchPipeReports('all'); }} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', border: 'none', borderBottom: complaintTab === 'history' ? '2px solid #b91c1c' : '2px solid transparent', marginBottom: '-2px', backgroundColor: 'transparent', color: complaintTab === 'history' ? '#b91c1c' : 'var(--text-muted)', fontWeight: complaintTab === 'history' ? 'bold' : 'normal', cursor: 'pointer' }}>
                      📂 歷史紀錄 ({pipeReports.length > 0 ? pipeReports.length : '1,727'})
                    </button>
                  </div>

                  {/* 即時通報頁 */}
                  {complaintTab === 'current' && (
                    <>
                      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          {['全部', '待處理', '已解決'].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)} style={{ flex: 1, padding: '5px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid var(--glass-border)', backgroundColor: filterStatus === s ? 'var(--danger)' : 'white', color: filterStatus === s ? 'white' : 'var(--text-main)', cursor: 'pointer' }}>{s}</button>
                          ))}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
                          <input type="text" placeholder="搜尋地址或通報人..." value={compSearchTerm} onChange={e => setCompSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '7px 8px 7px 32px', borderRadius: '6px', border: '1px solid var(--glass-border)', fontSize: '0.88rem' }} />
                        </div>
                      </div>
                      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
                        {filteredComplaintsList.map(comp => (
                          <div key={comp.id} style={{ padding: '12px', border: '1px solid var(--glass-border)', borderRadius: '8px', marginBottom: '10px', backgroundColor: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(comp.reported_at).toLocaleDateString()}</span>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: comp.status === 'pending' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: comp.status === 'pending' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                {comp.status === 'pending' ? '待處理' : '已解決'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.93rem', fontWeight: 'bold', marginBottom: '3px' }}>{comp.address}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>通報人: {comp.reporter_name}</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {comp.lat && comp.lng && (
                                <button onClick={() => setMapCenter([comp.lat!, comp.lng!])} style={{ flex: 1, padding: '5px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--glass-border)', backgroundColor: 'rgba(59,130,246,0.05)', color: '#3b82f6', cursor: 'pointer' }}>📍 定位</button>
                              )}
                              <button 
                                onClick={() => handleExportEmic(comp)} 
                                title="匯出 EMIC 案件格式"
                                style={{ padding: '5px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #dc2626', backgroundColor: 'rgba(220,38,38,0.05)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <ShieldAlert size={14} /> EMIC
                              </button>
                              <button onClick={() => startCompEditing(comp)} style={{ flex: 1, padding: '5px', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--glass-border)', backgroundColor: 'transparent', cursor: 'pointer' }}>編輯</button>
                              <button onClick={() => handleCompDelete(comp.id)} style={{ padding: '5px', color: 'var(--danger)', border: 'none', background: 'transparent' }}><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* 歷史紀錄頁 */}
                  {complaintTab === 'history' && (
                    <>
                      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                          {[['all','全部'], ['塞管','塞管'], ['冒水','冒水'], ['聲響','聲響'], ['堵塞','堵塞'], ['積水','積水'], ['人孔','人孔']].map(([val, label]) => (
                            <button key={val} onClick={() => { setPipeReportFilter(val); fetchPipeReports(val); }} style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '12px', border: `1px solid ${pipeReportFilter === val ? '#dc2626' : 'var(--glass-border)'}`, backgroundColor: pipeReportFilter === val ? '#dc2626' : 'white', color: pipeReportFilter === val ? 'white' : 'var(--text-main)', cursor: 'pointer' }}>{label}</button>
                          ))}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
                          <input type="text" placeholder="搜尋地址或問題類型..." value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                            style={{ width: '100%', padding: '7px 8px 7px 32px', borderRadius: '6px', border: '1px solid var(--glass-border)', fontSize: '0.88rem' }} />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                          共 {pipeReports.filter(r => !historySearch || r.address.includes(historySearch) || r.issue_type.includes(historySearch)).length} 筆（110-115年開口契約）
                        </div>
                      </div>
                      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
                        {pipeReports
                          .filter(r => !historySearch || r.address.includes(historySearch) || r.issue_type.includes(historySearch))
                          .map(rpt => (
                          <div key={rpt.id} style={{ padding: '10px 12px', border: '1px solid var(--glass-border)', borderRadius: '8px', marginBottom: '8px', backgroundColor: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rpt.report_date || '日期不詳'}</span>
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626', fontWeight: 'bold' }}>
                                {rpt.issue_type}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 'bold', marginBottom: '3px' }}>{rpt.address}</div>
                            <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '6px' }}>✅ {rpt.resolution || '未記錄'}</div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {rpt.lat && rpt.lng && (
                                <button onClick={() => setMapCenter([rpt.lat, rpt.lng])} style={{ padding: '4px 8px', fontSize: '0.77rem', borderRadius: '4px', border: '1px solid var(--glass-border)', backgroundColor: 'rgba(59,130,246,0.05)', color: '#3b82f6', cursor: 'pointer' }}>📍 定位</button>
                              )}
                              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '8px', backgroundColor: 'rgba(107,114,128,0.1)', color: '#6b7280' }}>{rpt.sheet || `${rpt.year}年`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}


              {isFormOpen && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                  <form onSubmit={handleCompSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }}>
                    <button type="button" onClick={() => { setIsFormOpen(false); setFormConnectionResult(null); }} style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={24} /></button>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', color: editingId ? 'var(--primary)' : 'var(--danger)' }}>{editingId ? '編輯陳情紀錄' : '新增塞管通報'}</h2>
                    
                    {!editingId ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>通報人姓名 *</label>
                          <input required name="reporter_name" value={formData.reporter_name} onChange={handleCompInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>發生地址 *</label>
                          <input
                            required name="address" value={formData.address}
                            onChange={(e) => {
                              handleCompInputChange(e);
                              // Debounce connection check
                              const val = e.target.value;
                              clearTimeout((window as any)._connCheckTimer);
                              (window as any)._connCheckTimer = setTimeout(() => checkFormConnection(val), 600);
                            }}
                            placeholder="輸入地址後自動查詢接管狀態"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${formConnectionResult ? (formConnectionResult.connected ? '#10b981' : '#ef4444') : 'var(--glass-border)'}` }}
                          />
                          {/* Connection status badge */}
                          {(isCheckingFormConnection || formConnectionResult) && (
                            <div style={{ marginTop: '6px', padding: '8px 12px', borderRadius: '6px', fontSize: '0.83rem', backgroundColor: isCheckingFormConnection ? '#f9fafb' : formConnectionResult?.connected ? '#f0fdf4' : '#fff1f2', border: `1px solid ${isCheckingFormConnection ? '#d1d5db' : formConnectionResult?.connected ? '#6ee7b7' : '#fca5a5'}`, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              {isCheckingFormConnection ? (
                                <><div style={{ width: '12px', height: '12px', border: '2px solid #d1d5db', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginTop: '1px', flexShrink: 0 }} /><span style={{ color: '#6b7280' }}>查詢接管資料中...</span></>
                              ) : formConnectionResult?.connected ? (
                                <div style={{ width: '100%' }}>
                                  <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>✅ 已接管 — 找到 {formConnectionResult.count} 筆</div>
                                  <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                    {formConnectionResult.records.slice(0, 5).map((r: any, i: number) => (
                                      <div key={i} style={{ color: '#374151', borderBottom: i < formConnectionResult.records.length - 1 ? '1px solid #d1fae5' : 'none', padding: '2px 0' }}>
                                        💧 <span style={{ fontFamily: 'monospace', color: '#059669' }}>{r.water_no}</span> — {r.usage_addr}
                                      </div>
                                    ))}
                                    {formConnectionResult.total > 5 && <div style={{ color: '#6b7280', fontStyle: 'italic', marginTop: '2px' }}>（還有 {formConnectionResult.total - 5} 筆...）</div>}
                                  </div>
                                </div>
                              ) : (
                                <><span style={{ color: '#991b1b', fontWeight: 600 }}>❌ 查無接管記錄</span><span style={{ color: '#6b7280' }}> — 此地址可能尚未接管</span></>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>狀況描述</label>
                          <textarea name="description" value={formData.description} onChange={handleCompInputChange} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>處理狀態</label>
                          <select name="status" value={editData.status} onChange={handleCompInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <option value="pending">待處理</option>
                            <option value="processing">處理中</option>
                            <option value="resolved">已解決</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>處理紀錄</label>
                          <textarea name="resolution_notes" value={editData.resolution_notes} onChange={handleCompInputChange} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                      <button type="button" onClick={() => setIsFormOpen(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent' }}>取消</button>
                      <button type="submit" disabled={submitting} className="btn-primary" style={{ backgroundColor: editingId ? 'var(--primary)' : 'var(--danger)' }}>
                        {submitting ? '儲存中...' : '確認儲存'}
                      </button>
                    </div>
                  </form>
                </div>
              )}


              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                className={nightMode ? 'gis-night-map' : ''}
                ref={mapRef}
              >
                {nightMode ? (
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                ) : (
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                )}
                <MapBoundsHandler onBoundsChange={(b) => { fetchMapData(b); if (showHouseholds) fetchHouseholds(b); if (showPipelineConditions || showSedimentation) fetchPipelineConditions(b); }} />
<MapFlyTo center={mapCenter} />

                {/* 雷達回波疊加層（中央氣象署 CWA O-A0058-001，每5分鐘更新） */}
                {showRadar && radarTs > 0 && (
                  <ImageOverlay
                    url={`https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Observation/O-A0058-001.png?t=${radarTs}`}
                    bounds={[[17.75, 115.0], [29.25, 126.5]]}
                    opacity={0.55}
                    zIndex={10}
                  />
                )}

                {/* Pipeline Polylines */}
                {mapPipelines
                  .filter((pipe: MapPipeline) => {
                    if (mapAreaFilter && pipe.area !== mapAreaFilter && !pipe.project_name?.includes(mapAreaFilter)) return false;
                    if (systemType === '污水') {
                      if (pipe.source === '竣工管線' && showSewagePipelines) return true;
                      if (pipe.source === '巷道連接管' && showAlleyPipelines) return true;
                      return false;
                    }
                    return showPipelines;
                  })
                  .map((pipe: MapPipeline) => (
                  <Polyline
                    key={pipe.id}
                    positions={pipe.coords}
                    eventHandlers={{
                      click: (e: any) => {
                        setSelectedAsset({ type: 'pipeline', data: pipe });
                      }
                    }}
                    pathOptions={{
                      color: pipe.source === '巷道連接管' ? '#06b6d4' : (systemType === '污水' ? '#3b82f6' : '#0ea5e9'),
                      weight: pipe.source === '巷道連接管' ? 3 : 4,
                      opacity: selectedAsset?.data?.id === pipe.id ? 1 : 0.75,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '210px', lineHeight: '1.7', fontSize: '0.88rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ color: pipe.source === '巷道連接管' ? '#06b6d4' : '#3b82f6', fontSize: '1rem' }}>{pipe.source === '巷道連接管' ? '🔷' : '🔵'} {pipe.sewer_no || pipe.source || '管線'}</strong>
                          <button onClick={() => { navigator.clipboard?.writeText(pipe.sewer_no || ''); }} title="複製編號" style={{ padding: '1px 6px', border: '1px solid #93c5fd', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', color: '#3b82f6', background: '#eff6ff' }}>複製</button>
                        </div>
                        🔼 上游：{pipe.upstream_node || '—'} → 下游：{pipe.downstream_node || '—'}<br />
                        🏗️ {pipe.project_name || '—'}<br />
                        📏 管徑：{pipe.diameter ? `${pipe.diameter} mm` : '—'} | 長度：{pipe.length ? `${pipe.length.toFixed(0)} m` : '—'}<br />
                        🛣️ 材質：{materialLabel(pipe.material)}<br />
                        📐 坡度：{pipe.slope ? `${pipe.slope} ‰` : '—'}
                        <div style={{ marginTop: '8px' }}>
                          <button onClick={() => { setSelectedAsset({ type: 'pipeline', data: pipe }); openStreetView(pipe.coords[0][0], pipe.coords[0][1]); }} style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
                            📷 Google 街景
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                ))}

                {/* Catch Basin Markers */}
                {showCatchBasins && mapManholes
                  .filter((mh: MapManhole) => mh.manhole_type === '集水井')
                  .map((mh: MapManhole) => (
                  <CircleMarker
                    key={`cb-${mh.id}`}
                    center={[mh.lat, mh.lng]}
                    radius={4}
                    pathOptions={{ color: '#d97706', fillColor: '#fbbf24', fillOpacity: 0.9, weight: 1.5 }}
                    eventHandlers={{ click: () => openStreetView(mh.lat, mh.lng) }}
                  >
                    <Popup>
                      <div style={{ minWidth: '170px', lineHeight: '1.6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong style={{ color: '#d97706' }}>🟡 集水井 {mh.manhole_no}</strong>
                        </div>
                        📏 深度：{mh.depth ? `${mh.depth} m` : '—'}<br />
                        🔄 系統：{mh.system_type || '—'}
                        <div style={{ marginTop: '8px' }}>
                          <button onClick={() => { setSelectedAsset({ type: 'manhole', data: mh }); openStreetView(mh.lat, mh.lng); }} style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
                            📷 Google 街景
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Manhole Markers */}
                {mapManholes
                  .filter((mh: MapManhole) => {
                    if (mapAreaFilter && mh.area !== mapAreaFilter && !mh.project_name?.includes(mapAreaFilter)) return false;
                    if (systemType === '污水') {
                      if (mh.source === '竣工人孔' && showSewageManholes) return true;
                      if (mh.source === '陰井' && showYinJing) return true;
                      return false;
                    }
                    return showManholes && mh.manhole_type !== '集水井';
                  })
                  .map((mh: MapManhole) => (
                  <CircleMarker
                    key={`mh-${mh.id ?? mh.manhole_no}`}
                    center={[mh.lat, mh.lng]}
                    radius={6}
                    eventHandlers={{
                      click: () => {
                        // openStreetView only sets streetViewCoords + showStreetView — does NOT touch
                        // CircleMarker's radius/weight, so popup stays open.
                        // Do NOT call setSelectedAsset here (changes radius/weight → re-render → popup closes).
                        openStreetView(mh.lat, mh.lng);
                        if (systemType === '污水') fetchNearbyReports(mh.id, mh.lat, mh.lng);
                        // Pan map so manhole sits in lower portion of viewport,
                        // giving the popup enough room above it (not hidden by top bar).
                        if (mapRef.current) {
                          const map = mapRef.current;
                          const pt = map.latLngToContainerPoint([mh.lat, mh.lng]);
                          const h = map.getContainer().offsetHeight;
                          const targetY = h * 0.68; // aim for 68% from top
                          if (pt.y < targetY - 20) {
                            map.panBy([0, pt.y - targetY], { animate: false });
                          }
                        }
                      }
                    }}
                    pathOptions={{
                      color: mh.source === '陰井' ? '#10b981' : (mh.system_type === '污水' ? '#8b5cf6' : '#0ea5e9'),
                      fillColor: manholeNearbyReports[mh.id]?.length > 0 ? '#ef4444' : (mh.source === '陰井' ? '#34d399' : (mh.system_type === '污水' ? '#a78bfa' : '#38bdf8')),
                      fillOpacity: 0.85,
                      weight: 1.5
                    }}
                  >
                    <Popup maxWidth={290}>
                      <div style={{ minWidth: '250px', lineHeight: '1.7', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ color: mh.system_type === '污水' ? '#8b5cf6' : '#0ea5e9', fontSize: '1rem' }}>{mh.manhole_no}</strong>
                          <button onClick={() => { navigator.clipboard?.writeText(mh.manhole_no || ''); }} title="複製編號" style={{ padding: '1px 6px', border: `1px solid ${mh.system_type === '污水' ? '#c4b5fd' : '#7dd3fc'}`, borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', color: mh.system_type === '污水' ? '#8b5cf6' : '#0ea5e9', background: mh.system_type === '污水' ? '#f5f3ff' : '#f0f9ff' }}>複製</button>
                        </div>
                        📍 {mh.location || '—'}<br />
                        🗂️ {mh.area || mh.project_name || '—'}<br />
                        📏 深度：{mh.depth ? `${mh.depth} m` : '—'}<br />
                        🏷️ 型式：{mh.manhole_type || '—'}<br />
                        🔄 系統：{mh.system_type || '—'}

                        {/* 污水系統：顯示附近塞管通報 */}
                        {systemType === '污水' && (
                          <div style={{ marginTop: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                              🚨 附近塞管通報
                              {manholeNearbyReports[mh.id] ? `（${manholeNearbyReports[mh.id].length} 筆）` : ''}
                            </strong>
                            {!manholeNearbyReports[mh.id] && (
                              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>載入中...</div>
                            )}
                            {manholeNearbyReports[mh.id]?.length === 0 && (
                              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>附近無通報紀錄</div>
                            )}
                            {manholeNearbyReports[mh.id]?.slice(0, 5).map(rpt => (
                              <div key={rpt.id} style={{ fontSize: '0.78rem', backgroundColor: '#fef2f2', borderRadius: '4px', padding: '4px 6px', marginTop: '4px', borderLeft: '3px solid #ef4444' }}>
                                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{rpt.issue_type}</span>
                                <span style={{ color: '#6b7280', marginLeft: '4px' }}>{rpt.report_date}</span><br />
                                <span style={{ color: '#374151' }}>{rpt.address.slice(0, 30)}{rpt.address.length > 30 ? '...' : ''}</span>
                              </div>
                            ))}
                            {(manholeNearbyReports[mh.id]?.length || 0) > 5 && (
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                                另有 {manholeNearbyReports[mh.id].length - 5} 筆，請至側邊欄查看完整紀錄
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setSelectedAsset({ type: 'manhole', data: mh }); openStreetView(mh.lat, mh.lng); }} style={{ flex: 1, padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                            📷 Google 街景
                          </button>
                          <button onClick={(e) => { const popup = (e.target as HTMLElement).closest('.leaflet-popup'); const btn = popup?.querySelector('.leaflet-popup-close-button') as HTMLElement; btn?.click(); }} style={{ padding: '5px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                            ✕ 關閉
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Household Connection Markers */}
                {showHouseholds && mapHouseholds.map((hh: any) => (
                  <CircleMarker
                    key={`hh-${hh.id}`}
                    center={[hh.lat, hh.lng]}
                    radius={4}
                    pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.75, weight: 1 }}
                  >
                    <Popup>
                      <div style={{ minWidth: '190px', lineHeight: '1.7' }}>
                        <strong style={{ color: '#059669', fontSize: '0.95rem' }}>🏠 接管戶</strong><br />
                        💧 水號：{hh.water_no || '—'}<br />
                        📍 {hh.usage_addr || '—'}<br />
                        🏷️ 來源：{hh.source || '—'}
                        <div style={{ marginTop: '8px' }}>
                          <button onClick={() => openStreetView(hh.lat, hh.lng)} style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
                            📷 Google 街景
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* 淤積管段圖層 — 從縱走資料中篩選有淤積的管段 */}
                {showSedimentation && conditionLines
                  .filter((cond: ConditionLine) => cond.has_sedimentation)
                  .map((cond: ConditionLine) => {
                    const sedIssues = cond.issues.filter(i => i.type === '淤積');
                    const sedGrade = Math.max(...sedIssues.map(i => i.grade ?? 1));
                    const sedColor = sedGrade >= 2 ? '#92400e' : '#d97706';
                    const sedWeight = sedGrade >= 2 ? 7 : 5;
                    return (
                      <Polyline
                        key={`sed-${cond.id}`}
                        positions={cond.coords}
                        pathOptions={{ color: sedColor, weight: sedWeight, opacity: 0.95, dashArray: '8,4' }}
                      >
                        <Popup>
                          <div style={{ minWidth: '210px', lineHeight: '1.8' }}>
                            <strong style={{ color: sedColor, fontSize: '1rem' }}>🟫 淤積管段</strong><br />
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{cond.p_no}</span><br />
                            🏙️ 鄉鎮：{cond.town}<br />
                            📊 淤積等級：<strong style={{ color: sedColor }}>{sedGrade === 2 ? '中度' : '輕微'}</strong><br />
                            {sedIssues.map((i, idx) => i.desc && (
                              <span key={idx} style={{ fontSize: '0.82rem', color: '#6b7280' }}>📝 {i.desc}<br /></span>
                            ))}
                            📋 管段整體缺失：{cond.issue_count} 筆
                            {cond.has_damage && <><br /><span style={{ color: '#dc2626', fontSize: '0.82rem' }}>⚠️ 同時有破損</span></>}
                          </div>
                        </Popup>
                      </Polyline>
                    );
                  })
                }

                {/* 雨水縱走淤積圖層 — 使用 GIS建置規範 人孔座標貼合管段 */}
                {showSedSurvey && sedSurveyLines.map((r: SedSurveyRecord) => {
                  const clsColor = r.cls >= 2 ? '#92400e' : '#d97706';
                  const clsLabel = r.cls >= 2 ? '中度淤積' : '輕微淤積';
                  const clsWeight = r.cls >= 2 ? 7 : 5;
                  return (
                    <Polyline
                      key={`sed-survey-${r.id}`}
                      positions={r.coords}
                      pathOptions={{ color: clsColor, weight: clsWeight, opacity: 0.92, dashArray: '10,4' }}
                    >
                      <Popup>
                        <div style={{ minWidth: '230px', lineHeight: '1.8' }}>
                          <strong style={{ color: clsColor, fontSize: '1rem' }}>🟤 {clsLabel}</strong><br />
                          <span style={{ fontSize: '0.82rem', color: '#666' }}>管段：{r.p_no}</span><br />
                          🏙️ 鄉鎮：{r.district}<br />
                          🔼 上游人孔：{r.us_mh}<br />
                          🔽 下游人孔：{r.ds_mh}<br />
                          📏 淤積深：<strong>{r.sedi_dh} m</strong>
                          {r.fd_depth > 0 && <>&nbsp;｜積水深：{r.fd_depth} m</>}<br />
                          📋 紀錄筆數：{r.count}<br />
                          {r.inv_date && <>📅 調查時間：{r.inv_date}<br /></>}
                          {r.memo && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>📝 {r.memo}</span>}
                          <div style={{ marginTop: '8px' }}>
                            <button onClick={() => openStreetView(r.coords[0][0], r.coords[0][1])} style={{ padding: '4px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
                              📷 Google 街景
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Polyline>
                  );
                })}

                {/* Pipeline Condition Layer (縱走管況) — 獨立圖層，不依賴管線路徑 */}
                {showPipelineConditions && conditionLines.map((cond: ConditionLine) => {
                  const gradeColor = cond.max_grade === 3 ? '#dc2626' : cond.max_grade === 2 ? '#f97316' : cond.max_grade === 1 ? '#eab308' : '#9ca3af';
                  const gradeLabel = cond.max_grade === 3 ? '嚴重' : cond.max_grade === 2 ? '中度' : cond.max_grade === 1 ? '輕微' : '無等級';
                  return (
                    <Polyline
                      key={`cond-${cond.id}`}
                      positions={cond.coords}
                      pathOptions={{ color: gradeColor, weight: 5, opacity: 0.9 }}
                    >
                      <Popup>
                        <div style={{ minWidth: '200px', lineHeight: '1.8' }}>
                          <strong style={{ color: gradeColor, fontSize: '1rem' }}>🔍 縱走管況：{gradeLabel}</strong><br />
                          <span style={{ fontSize: '0.85rem', color: '#666' }}>{cond.p_no}</span><br />
                          🏙️ 鄉鎮：{cond.town}<br />
                          📋 缺失總數：{cond.issue_count} 筆<br />
                          {cond.has_damage && <span style={{ color: '#dc2626' }}>⚠️ 破損&nbsp;</span>}
                          {cond.has_sedimentation && <span style={{ color: '#b45309' }}>🟫 淤積&nbsp;</span>}
                          {cond.has_crossing && <span style={{ color: '#7c3aed' }}>❌ 橫越管&nbsp;</span>}
                          {cond.has_cable && <span style={{ color: '#0369a1' }}>🔌 纜線附掛&nbsp;</span>}
                          {cond.cannot_survey && <span style={{ color: '#9ca3af' }}>🚫 無法縱走&nbsp;</span>}
                        </div>
                      </Popup>
                    </Polyline>
                  );
                })}

                {/* Flood Hotspot Markers (淹水熱區) */}
                {floodHotspotMarkers}

                {/* 都市計畫區範圍（永久顯示，資料來源：全國土地使用分區查詢系統） */}
                {urbanPlanZones.flatMap((zone) => {
                  // Normalise both Polygon and MultiPolygon to a list of rings
                  // Polygon: coordinates = [ring]
                  // MultiPolygon: coordinates = [[ring], [ring], ...]
                  const geometry = zone.geometry as { type: string; coordinates: unknown };
                  const isMulti = geometry.type === 'MultiPolygon';
                  const rings: number[][][] = isMulti
                    ? (geometry.coordinates as number[][][][]).map(poly => poly[0])
                    : [(geometry.coordinates as number[][][])[0]];
                  const pathOptions = {
                    color: '#7c3aed', weight: 2, fill: true,
                    fillColor: '#7c3aed', fillOpacity: 0.04,
                    opacity: 0.75, dashArray: '6,3',
                  };
                  return rings.map((ring, ri) => {
                    const positions = ring.map(
                      ([lng, lat]: number[]) => [lat, lng] as [number, number]
                    );
                    return (
                      <Polygon
                        key={`${zone.properties.code}-${ri}`}
                        positions={positions}
                        pathOptions={pathOptions}
                      />
                    );
                  });
                })}

                {/* Dredging Route Polylines (年度清淤) */}
                {(showDredging113 || showDredging114 || showDredging) && dredgingRoutes
                  .filter(dr => {
                    if (showDredging113 && String(dr.year) === '113') return true;
                    if (showDredging114 && String(dr.year) === '114') return true;
                    if (showDredging && !showDredging113 && !showDredging114) return true;
                    return false;
                  })
                  .map((dr) => {
                  const lineColor = String(dr.year) === '114' ? '#0d9488' : '#15803d';
                  const popup = (
                    <Popup>
                      <div style={{ minWidth: '240px', lineHeight: '1.7' }}>
                        <strong style={{ color: '#15803d', fontSize: '1rem' }}>🚿 {dr.road_name}</strong><br />
                        📅 施作日期：{dr.work_date}<br />
                        📏 總清淤長度：<strong>{dr.total_length.toLocaleString()} m</strong><br />
                        🏗️ 箱涵種類：{dr.culvert_types}<br />
                        {dr.manhole_count > 0 && <>👁️ 人孔清淤：{dr.manhole_count} 座<br /></>}
                        {dr.cistern_count > 0 && <>🪣 集水井：{dr.cistern_count} 座<br /></>}
                        {dr.details && dr.details.length > 1 && (
                          <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#374151' }}>
                            {dr.details.map((d, i) => (
                              <div key={i}>• {d.culvert_type}：{d.length_m} m</div>
                            ))}
                          </div>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{dr.year}年度開口契約</span>
                        <div style={{ marginTop: '8px' }}>
                          <button onClick={() => openStreetView(dr.lat, dr.lng)} style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
                            📷 Google 街景
                          </button>
                        </div>
                      </div>
                    </Popup>
                  );
                  if (dr.polyline && dr.polyline.length >= 2) {
                    return (
                      <Polyline
                        key={`dr-${dr.id}`}
                        positions={dr.polyline as [number, number][]}
                        pathOptions={{ color: lineColor, weight: 6, opacity: 0.85 }}
                      >
                        {popup}
                      </Polyline>
                    );
                  }
                  // Fallback: single point marker
                  return (
                    <CircleMarker
                      key={`dr-${dr.id}`}
                      center={[dr.lat, dr.lng]}
                      radius={10}
                      pathOptions={{ color: lineColor, fillColor: String(dr.year) === '114' ? '#2dd4bf' : '#22c55e', fillOpacity: 0.85, weight: 2 }}
                    >
                      {popup}
                    </CircleMarker>
                  );
                })}

                {/* 115年雨水清淤路段 */}
                {showDredging115Rain && dredging115Rain.map((dr) => {
                  const popup = (
                    <Popup>
                      <div style={{ minWidth: '240px', lineHeight: '1.7' }}>
                        <strong style={{ color: '#0891b2', fontSize: '1rem' }}>💧 {dr.road_name}</strong><br />
                        📅 預計施作：{dr.work_date?.substring(0, 7)}<br />
                        📏 預計清淤：<strong>{dr.total_length?.toLocaleString()} m</strong><br />
                        🏗️ 管渠種類：{dr.culvert_types}<br />
                        {dr.manhole_count > 0 && <>👁️ 預估人孔：{dr.manhole_count} 座<br /></>}
                        <span style={{ fontSize: '0.75rem', color: '#0891b2' }}>115年度雨水清淤計畫</span>
                      </div>
                    </Popup>
                  );
                  if (dr.polyline && dr.polyline.length >= 2) {
                    return (
                      <Polyline key={`dr115r-${dr.id}`} positions={dr.polyline as [number, number][]} pathOptions={{ color: '#0891b2', weight: 5, opacity: 0.85, dashArray: '8 4' }}>
                        {popup}
                      </Polyline>
                    );
                  }
                  return (
                    <CircleMarker key={`dr115r-${dr.id}`} center={[dr.lat, dr.lng]} radius={9} pathOptions={{ color: '#0891b2', fillColor: '#67e8f9', fillOpacity: 0.85, weight: 2 }}>
                      {popup}
                    </CircleMarker>
                  );
                })}

                {/* 114年污水清淤路段 */}
                {showDredging114Sewage && dredging114Sewage.map((dr) => {
                  const popup = (
                    <Popup>
                      <div style={{ minWidth: '240px', lineHeight: '1.7' }}>
                        <strong style={{ color: '#7c3aed', fontSize: '1rem' }}>🚿 {dr.road_name}</strong><br />
                        📅 施作日期：{dr.work_date?.substring(0, 7)}<br />
                        📏 清淤長度：<strong>{dr.total_length?.toLocaleString()} m</strong><br />
                        🏗️ 管種：{dr.culvert_types}<br />
                        {dr.manhole_count > 0 && <>👁️ 人孔清淤：{dr.manhole_count} 座<br /></>}
                        <span style={{ fontSize: '0.75rem', color: '#7c3aed' }}>114年度污水清淤</span>
                      </div>
                    </Popup>
                  );
                  if (dr.polyline && dr.polyline.length >= 2) {
                    return (
                      <Polyline key={`dr114sw-${dr.id}`} positions={dr.polyline as [number, number][]} pathOptions={{ color: '#7c3aed', weight: 5, opacity: 0.85 }}>
                        {popup}
                      </Polyline>
                    );
                  }
                  return (
                    <CircleMarker key={`dr114sw-${dr.id}`} center={[dr.lat, dr.lng]} radius={9} pathOptions={{ color: '#7c3aed', fillColor: '#c4b5fd', fillOpacity: 0.85, weight: 2 }}>
                      {popup}
                    </CircleMarker>
                  );
                })}

                {/* 115年污水清淤路段 */}
                {showDredging115Sewage && dredging115Sewage.map((dr) => {
                  const popup = (
                    <Popup>
                      <div style={{ minWidth: '240px', lineHeight: '1.7' }}>
                        <strong style={{ color: '#9333ea', fontSize: '1rem' }}>🚿 {dr.road_name}</strong><br />
                        📅 預計施作：{dr.work_date?.substring(0, 7)}<br />
                        📏 預計清淤：<strong>{dr.total_length?.toLocaleString()} m</strong><br />
                        🏗️ 管種：{dr.culvert_types}<br />
                        {dr.manhole_count > 0 && <>👁️ 預估人孔：{dr.manhole_count} 座<br /></>}
                        <span style={{ fontSize: '0.75rem', color: '#9333ea' }}>115年度污水清淤計畫</span>
                      </div>
                    </Popup>
                  );
                  if (dr.polyline && dr.polyline.length >= 2) {
                    return (
                      <Polyline key={`dr115sw-${dr.id}`} positions={dr.polyline as [number, number][]} pathOptions={{ color: '#9333ea', weight: 5, opacity: 0.85, dashArray: '8 4' }}>
                        {popup}
                      </Polyline>
                    );
                  }
                  return (
                    <CircleMarker key={`dr115sw-${dr.id}`} center={[dr.lat, dr.lng]} radius={9} pathOptions={{ color: '#9333ea', fillColor: '#d8b4fe', fillOpacity: 0.85, weight: 2 }}>
                      {popup}
                    </CircleMarker>
                  );
                })}

                {/* 115年建議清淤管段 — dashed polylines by priority */}
                {showDredgingFuture && dredgingSuggestions.map((sg) => {
                  const priorityColor = sg.priority === 'high' ? '#ef4444' : sg.priority === 'medium' ? '#f97316' : '#eab308';
                  const priorityLabel = sg.priority === 'high' ? '高優先' : sg.priority === 'medium' ? '中優先' : '低優先';
                  const culvertEmoji = sg.culvert_type === '箱涵' ? '⬛' : sg.culvert_type === '涵管' ? '⭕' : '🔩';
                  const popup = (
                    <Popup>
                      <div style={{ minWidth: '280px', lineHeight: '1.8', fontFamily: 'system-ui, sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ color: priorityColor, fontSize: '0.95rem' }}>🔮 {sg.road_name}</strong>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', backgroundColor: `${priorityColor}22`, color: priorityColor, border: `1px solid ${priorityColor}44` }}>{priorityLabel}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#374151', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 12px' }}>
                          <span style={{ color: '#6b7280' }}>地區</span><strong>{sg.district}</strong>
                          <span style={{ color: '#6b7280' }}>管種</span><span>{culvertEmoji} {sg.culvert_type}</span>
                          <span style={{ color: '#6b7280' }}>清淤長度</span><strong>{sg.estimated_length_m.toLocaleString()} m</strong>
                          <span style={{ color: '#6b7280' }}>人孔清淤</span><span>{sg.manhole_count} 座</span>
                          <span style={{ color: '#6b7280' }}>估算費用</span><strong style={{ color: '#dc2626' }}>{sg.total_cost} 萬元</strong>
                          <span style={{ color: '#6b7280' }}>累計預算</span><span>{sg.cumulative_cost} 萬 / 1,100 萬</span>
                        </div>
                        {sg.basis && sg.basis.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '8px 0 4px' }}>
                            {sg.basis.map((b: string, i: number) => (
                              <span key={i} style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>{b}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ marginTop: '6px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '0.79rem', color: '#92400e', lineHeight: '1.55' }}>
                          💡 {sg.reason}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#9ca3af' }}>優先評分：{sg.score} 分 · 115年度規劃建議</div>
                      </div>
                    </Popup>
                  );
                  return (
                    <CircleMarker
                      key={`dsug-${sg.id}`}
                      center={[sg.lat, sg.lng]}
                      radius={12}
                      pathOptions={{ color: priorityColor, fillColor: priorityColor, fillOpacity: 0.75, weight: 2.5 }}
                    >
                      {popup}
                      <Tooltip sticky direction="top" offset={[0, -10]}>
                        <span style={{ fontWeight: 700, color: priorityColor }}>{sg.road_name}</span><br />
                        <span style={{ fontSize: '0.78rem' }}>{sg.district} · {sg.culvert_type} · {sg.estimated_length_m}m · <strong>{sg.total_cost}萬</strong></span>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}

                {/* 115年污水巡檢路段 — 已完成者顯示綠色 */}
                {showInspectionPanel && inspectionRoutes115.filter(r => r.status === 'completed').map((r) => (
                  <CircleMarker
                    key={`insp-${r.id}`}
                    center={[r.lat, r.lng]}
                    radius={12}
                    pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.88, weight: 2.5 }}
                  >
                    <Popup>
                      <div style={{ minWidth: '220px', lineHeight: '1.8' }}>
                        <strong style={{ color: '#16a34a', fontSize: '1rem' }}>✅ {r.road_name}</strong><br />
                        <span style={{ fontSize: '0.82rem', color: '#374151' }}>
                          📍 {r.address}<br />
                          📅 完成日期：{r.completed_date || '—'}<br />
                          🔁 歷年通報：{r.repeat_count} 次
                        </span>
                        <div style={{ marginTop: '6px', fontSize: '0.7rem', padding: '3px 7px', backgroundColor: '#f0fdf4', borderRadius: '4px', color: '#15803d', border: '1px solid #bbf7d0' }}>
                          115年巡檢已完成
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* 115年污水建議清淤管段 — 依塞管熱點分析 */}
                {showSewageDredgingFuture && sewageDredgingSuggestions.map((sg) => {
                  const priorityColor = sg.priority === 'high' ? '#7c3aed' : sg.priority === 'medium' ? '#a855f7' : '#c084fc';
                  const priorityLabel = sg.priority === 'high' ? '高優先' : sg.priority === 'medium' ? '中優先' : '低優先';
                  const popup = (
                    <Popup>
                      <div style={{ minWidth: '290px', lineHeight: '1.8', fontFamily: 'system-ui, sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ color: priorityColor, fontSize: '0.95rem' }}>🚿 {sg.road_name}</strong>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', backgroundColor: `${priorityColor}22`, color: priorityColor, border: `1px solid ${priorityColor}44` }}>{priorityLabel}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#374151', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 12px' }}>
                          <span style={{ color: '#6b7280' }}>地區</span><strong>{sg.district}</strong>
                          <span style={{ color: '#6b7280' }}>管種</span><span>{sg.pipe_type}</span>
                          <span style={{ color: '#6b7280' }}>清疏長度</span><strong>{sg.estimated_length_m.toLocaleString()} m</strong>
                          <span style={{ color: '#6b7280' }}>人孔清疏</span><span>{sg.manhole_count} 座</span>
                          <span style={{ color: '#6b7280' }}>歷年通報</span><strong style={{ color: '#dc2626' }}>{sg.repeat_count} 次</strong>
                          <span style={{ color: '#6b7280' }}>估算費用</span><strong style={{ color: '#dc2626' }}>{sg.total_cost} 萬元</strong>
                          <span style={{ color: '#6b7280' }}>累計預算</span><span>{sg.cumulative_cost} 萬 / 800 萬</span>
                        </div>
                        {sg.basis && sg.basis.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '8px 0 4px' }}>
                            {sg.basis.map((b: string, i: number) => (
                              <span key={i} style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '6px', backgroundColor: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>{b}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ marginTop: '6px', padding: '8px', backgroundColor: '#faf5ff', borderRadius: '8px', fontSize: '0.79rem', color: '#4c1d95', lineHeight: '1.55' }}>
                          💡 {sg.reason}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#9ca3af' }}>優先評分：{sg.score} 分 · 依110～114年塞管熱點分析</div>
                      </div>
                    </Popup>
                  );
                  return (
                    <CircleMarker
                      key={`swsug-${sg.id}`}
                      center={[sg.lat, sg.lng]}
                      radius={11}
                      pathOptions={{ color: priorityColor, fillColor: priorityColor, fillOpacity: 0.7, weight: 2.5, dashArray: '4 3' }}
                    >
                      {popup}
                      <Tooltip sticky direction="top" offset={[0, -10]}>
                        <span style={{ fontWeight: 700, color: priorityColor }}>{sg.road_name}</span><br />
                        <span style={{ fontSize: '0.78rem' }}>{sg.district} · {sg.pipe_type} · 通報{sg.repeat_count}次 · <strong>{sg.total_cost}萬</strong></span>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}

                {/* Pipe Report Markers (歷史塞管通報，僅污水系統) */}
                {showHistoryReports && systemType === '污水' && pipeReports.map((rpt) => (
                  <CircleMarker
                    key={`rpt-${rpt.id}`}
                    center={[rpt.lat, rpt.lng]}
                    radius={7}
                    pathOptions={{ color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.75, weight: 1.5 }}
                  >
                    <Popup>
                      <div style={{ minWidth: '220px', lineHeight: '1.8' }}>
                        <strong style={{ color: '#991b1b', fontSize: '1rem' }}>🚨 {rpt.issue_type}</strong><br />
                        📍 {rpt.address}<br />
                        📅 通報日期：{rpt.report_date || '不詳'}<br />
                        ✅ 處理結果：{rpt.resolution || '未記錄'}<br />
                        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>來源：{rpt.sheet || `${rpt.year}年開口契約`}</span>
                        <div style={{ marginTop: '8px' }}>
                          <button onClick={() => openStreetView(rpt.lat, rpt.lng)} style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
                            📷 Google 街景
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Complaint Markers */}
                {showComplaints && complaints.map(comp => (
                  (comp.lat && comp.lng) ? (
                    <CircleMarker
                      key={`comp-${comp.id}`}
                      center={[comp.lat, comp.lng]}
                      radius={8}
                      pathOptions={{
                        color: comp.status === 'resolved' ? '#10b981' : '#ef4444',
                        fillColor: comp.status === 'resolved' ? '#10b981' : '#ef4444',
                        fillOpacity: 0.7, weight: 2
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: '180px', lineHeight: '1.6' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ color: comp.status === 'resolved' ? '#10b981' : '#ef4444' }}>🚨 塞管通報</strong>
                            <button onClick={() => openStreetView(comp.lat!, comp.lng!)} style={{ padding: '4px 8px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} /> 街景
                            </button>
                          </div>
                          📍 {comp.address}<br />
                          狀態：<strong>{comp.status === 'pending' ? '待處理' : comp.status === 'processing' ? '處理中' : '已解決'}</strong><br />
                          👤 通報人：{comp.reporter_name}<br />
                          <button onClick={() => startCompEditing(comp)} style={{ marginTop: '8px', width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', fontSize: '0.8rem' }}>編輯案件</button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ) : null
                ))}

                {/* Search / Click Location Marker */}
                {clickCoords && (
                  <CircleMarker center={clickCoords} radius={8} pathOptions={{ color: '#ec4899', fillColor: '#f472b6', fillOpacity: 0.6 }}>
                    <Popup>
                      <div style={{ textAlign: 'center', padding: '8px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>選取位置</div>
                        <button onClick={() => openStreetView(clickCoords[0], clickCoords[1])} style={{ padding: '8px 16px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
                          <MapPin size={16} /> 查看 Google 街景
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                )}

                {/* Water Monitor Stations — 縣府70處 */}
                {(showLocal70 || showWaterMonitors) && waterMonitors.map((wm: WaterMonitor) => (
                  <CircleMarker
                    key={`wm-${wm.id}`}
                    center={[wm.lat, wm.lng]}
                    radius={10}
                    pathOptions={{ color: '#0369a1', fillColor: '#0ea5e9', fillOpacity: 0.9, weight: 2.5 }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{wm.station_id}</span>
                    </Tooltip>
                    <Popup>
                      <div style={{ minWidth: '220px', lineHeight: '1.9' }}>
                        <strong style={{ color: '#0369a1', fontSize: '1rem' }}>💧 地方端監測站</strong><br />
                        <span style={{ fontSize: '0.85rem', color: '#555' }}>{wm.station_id}</span><br />
                        🏙️ 行政區：{wm.district}<br />
                        🔩 人孔編號：{wm.manhole_no}<br />
                        {wm.diameter && <span>⭕ 人孔直徑：{wm.diameter} cm<br /></span>}
                        📍 位置：{wm.location}<br />
                        <div style={{ marginTop: '8px' }}>
                          <button
                            onClick={() => openStreetView(wm.lat, wm.lng)}
                            style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}
                          >📷 Google 街景</button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* WRA IoT River Stations — 水利署測站 */}
                {(showWraStn || showWaterMonitors) && wraStations.map((s, i) => (
                  <CircleMarker
                    key={`wra-river-${i}`}
                    center={[s.Latitude, s.Longtiude]}
                    radius={10}
                    pathOptions={{ color: '#1e40af', fillColor: '#3b82f6', fillOpacity: 1, weight: 3, dashArray: '5, 5' }}
                  >
                    <Popup maxWidth={300}>
                      <div style={{ minWidth: '220px', lineHeight: '1.7', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
                          <strong style={{ color: '#1e40af', fontSize: '1rem' }}>🌊 WRA 河川監測</strong>
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>實時數據</span>
                        </div>
                        📍 {s.Name}<br />
                        🏠 {s.CountyName} {s.TownName}<br />
                        {s.Measurements?.map((m: any, j: number) => (
                          <div key={j} style={{ marginTop: '8px', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontWeight: 'bold', color: '#334155' }}>{m.Name}</span>
                              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#2563eb' }}>{m.Value} <small style={{ fontSize: '0.8rem', fontWeight: '400' }}>{m.SIUnit}</small></span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={10} /> {new Date(m.TimeStamp).toLocaleString('zh-TW')}
                            </div>
                          </div>
                        ))}
                        <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          數據來源：經濟部水利署水資源物聯網
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* WRA IoW 閘門監測站 */}
                {showGates && gateStations.map((g, i) => {
                  const openPct = g.value ?? null;
                  const isOpen = openPct !== null && openPct > 0;
                  const dotColor = !g.isenable ? '#94a3b8' : isOpen ? '#f97316' : '#22c55e';
                  return (
                    <CircleMarker
                      key={`gate-${i}`}
                      center={[g.latitude, g.longitude]}
                      radius={11}
                      pathOptions={{ color: '#92400e', fillColor: dotColor, fillOpacity: 1, weight: 2 }}
                    >
                      <Popup maxWidth={280}>
                        <div style={{ minWidth: '210px', lineHeight: '1.7', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #fde68a', paddingBottom: '4px' }}>
                            <strong style={{ color: '#92400e', fontSize: '1rem' }}>🚧 IoW 閘門監測</strong>
                            <span style={{ fontSize: '0.7rem', backgroundColor: g.isenable ? '#fef3c7' : '#f1f5f9', color: g.isenable ? '#b45309' : '#94a3b8', padding: '2px 6px', borderRadius: '4px' }}>
                              {g.isenable ? '啟用中' : '停用'}
                            </span>
                          </div>
                          📍 {g.observatoryname}<br />
                          🏘️ {g.townname}<br />
                          📊 {g.sensorname}<br />
                          {openPct !== null ? (
                            <div style={{ marginTop: '8px', backgroundColor: '#fefce8', padding: '8px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: 'bold', color: '#78350f' }}>閘門開度</span>
                                <span style={{ fontSize: '1.3rem', fontWeight: '800', color: isOpen ? '#ea580c' : '#16a34a' }}>{openPct}%</span>
                              </div>
                              {g.observationtime && (
                                <div style={{ fontSize: '0.72rem', color: '#92400e', marginTop: '4px' }}>
                                  更新：{new Date(g.observationtime).toLocaleString('zh-TW')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#a16207' }}>（即時開度資料更新中）</div>
                          )}
                          <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            數據來源：水利署開放資料平台 IoW
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {/* WRA IoT Inundation Stations — 縣市政府測站 */}
                {(showCountyStn || showWaterMonitors) && wraInundation.map((s, i) => (
                  <CircleMarker
                    key={`wra-flood-${i}`}
                    center={[s.Latitude, s.Longtiude]}
                    radius={10}
                    pathOptions={{ color: '#991b1b', fillColor: '#ef4444', fillOpacity: 0.9, weight: 3 }}
                  >
                    <Popup maxWidth={280}>
                      <div style={{ minWidth: '220px', lineHeight: '1.7', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #fee2e2', paddingBottom: '4px' }}>
                          <strong style={{ color: '#991b1b', fontSize: '1rem' }}>🚨 WRA 路面淹水</strong>
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px' }}>感測器</span>
                        </div>
                        📍 {s.Name}<br />
                        🏠 {s.CountyName} {s.TownName}<br />
                        {s.Measurements?.map((m: any, j: number) => (
                          <div key={j} style={{ marginTop: '8px', backgroundColor: '#fef2f2', padding: '8px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontWeight: 'bold', color: '#7f1d1d' }}>{m.Name}</span>
                              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#dc2626' }}>{m.Value} <small style={{ fontSize: '0.8rem', fontWeight: '400' }}>{m.SIUnit}</small></span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#991b1b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={10} /> {new Date(m.TimeStamp).toLocaleString('zh-TW')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* CWA 雨量站（新竹縣，氣象署開放資料） */}
                {showRainfallStations && weatherData?.rainfallStations.filter(s => s.lat && s.lng).map((s, i) => {
                  const r1 = s.rainfall1hr ?? 0;
                  const isHeavy = r1 >= 40;
                  const isMod   = r1 >= 15;
                  const fill = isHeavy ? '#dc2626' : isMod ? '#f97316' : '#0ea5e9';
                  const border = isHeavy ? '#991b1b' : isMod ? '#c2410c' : '#0369a1';
                  return (
                    <CircleMarker
                      key={`cwa-rain-${i}`}
                      center={[s.lat!, s.lng!]}
                      radius={9}
                      pathOptions={{ color: border, fillColor: fill, fillOpacity: 0.85, weight: 2 }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>🌧️ {s.stationName}　{r1 > 0 ? `${r1} mm/hr` : '無雨'}</span>
                      </Tooltip>
                      <Popup maxWidth={260}>
                        <div style={{ minWidth: '210px', lineHeight: '1.8', fontSize: '0.88rem' }}>
                          <strong style={{ color: '#0369a1', fontSize: '1rem' }}>🌧️ {s.stationName}</strong><br />
                          🏙️ {s.area}<br />
                          📡 站號：{s.stationId}<br />
                          <div style={{ marginTop: '8px', backgroundColor: '#f0f9ff', padding: '8px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                            <div>⏱️ 10分鐘：<strong>{s.rainfall10min ?? '—'} mm</strong></div>
                            <div>🕐 1小時：<strong style={{ color: isHeavy ? '#dc2626' : isMod ? '#f97316' : '#0369a1' }}>{s.rainfall1hr ?? '—'} mm</strong></div>
                            <div>🕒 3小時：<strong>{s.rainfall3hr ?? '—'} mm</strong></div>
                            <div>🌅 24小時：<strong>{s.rainfall24hr ?? '—'} mm</strong></div>
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>資料來源：中央氣象署開放資料平台</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {/* Colife CCTV Stations — 水利署（與縣市政府合建），60秒自動更新 */}
                {showCctv && cctvData.map((s, i) => (
                  <CircleMarker
                    key={`colife-cctv-${s.id ?? i}`}
                    center={[s.Latitude, s.Longtiude]}
                    radius={8}
                    pathOptions={{ color: '#92400e', fillColor: '#fbbf24', fillOpacity: 0.85, weight: 2 }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>📹 {s.Name}</span>
                    </Tooltip>
                    <Popup maxWidth={340}>
                      <div style={{ minWidth: '270px', lineHeight: '1.7', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #fef3c7', paddingBottom: '4px' }}>
                          <strong style={{ color: '#92400e', fontSize: '1rem' }}>📷 水利署 CCTV</strong>
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px' }}>即時影像</span>
                        </div>
                        📍 {s.Name}<br />
                        🏛️ {s.Authority}<br />
                        🗺️ {s.CountyName} {s.TownName}<br />
                        {s.ObsTime && <span style={{ fontSize: '0.75rem', color: '#78716c' }}>🕐 {new Date(s.ObsTime).toLocaleString('zh-TW')}<br /></span>}
                        <div style={{ marginTop: '10px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                          <img
                            src={s.StreamUrl}
                            style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '200px', objectFit: 'contain' }}
                            alt="CCTV"
                            onError={(e) => { e.currentTarget.src = 'https://images.wra.gov.tw/NoImage.jpg'; }}
                          />
                        </div>
                        <div style={{ marginTop: '6px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <a href={s.StreamUrl} target="_blank" rel="noreferrer"
                            style={{ color: '#d97706', fontSize: '0.8rem', textDecoration: 'underline' }}>
                            🔗 原始連結
                          </a>
                          <button onClick={() => openStreetView(s.Latitude, s.Longtiude)}
                            style={{ padding: '3px 10px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                            📷 街景
                          </button>
                        </div>
                        {cctvFetchedAt && <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#a8a29e', textAlign: 'center' }}>資料更新：{new Date(cctvFetchedAt).toLocaleTimeString('zh-TW')}</div>}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Inspection Sites (訪評受評地點) */}
                {showInspectionSites && inspectionSites.map((site: InspectionSite) => {
                  const isFacility = site.site_type === 'facility';
                  const color = isFacility ? '#be185d' : '#7c3aed';
                  const fillColor = isFacility ? '#ec4899' : '#a855f7';
                  return (
                    <CircleMarker
                      key={`insp-${site.id}`}
                      center={[site.lat, site.lng]}
                      radius={isFacility ? 12 : 9}
                      pathOptions={{ color, fillColor, fillOpacity: 0.9, weight: 2.5 }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {isFacility ? '🏛️' : '🔩'} {site.name}
                        </span>
                      </Tooltip>
                      <Popup>
                        <div style={{ minWidth: '220px', lineHeight: '1.9' }}>
                          <strong style={{ color, fontSize: '1rem' }}>
                            {isFacility ? '🏛️ 訪評設施' : '🔩 訪評人孔'} 【{site.year}年】
                          </strong><br />
                          <strong>{site.name}</strong><br />
                          🏙️ 行政區：{site.district}<br />
                          📍 地址：{site.address}<br />
                          {site.depth != null && <span>📏 人孔深度：{site.depth} m<br /></span>}
                          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>項次 {site.seq}</span>
                          <div style={{ marginTop: '8px' }}>
                            <button
                              onClick={() => openStreetView(site.lat, site.lng)}
                              style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}
                            >📷 Google 街景</button>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {/* 水資源銀行節點 (Water Bank Nodes) */}
                {showWaterBank && waterBankNodes.map((node: WaterBankNode) => {
                  const priorityColors: Record<number, { border: string; fill: string }> = {
                    3: { border: '#064e3b', fill: '#10b981' },
                    2: { border: '#047857', fill: '#34d399' },
                    1: { border: '#059669', fill: '#6ee7b7' },
                  };
                  const colors = priorityColors[node.priority] || priorityColors[2];
                  // Circle size driven by total_capacity_m3
                  const radius = 8 + node.total_capacity_m3 / 120;
                  const stars = '★'.repeat(node.priority);
                  // Gauge bar: proportion already covered vs recommended add
                  const existPct = node.total_capacity_m3 > 0 ? Math.round((node.existing_storage_m3 / node.total_capacity_m3) * 100) : 0;
                  return (
                    <CircleMarker
                      key={`wb-${node.id}`}
                      center={[node.lat, node.lng]}
                      radius={radius}
                      pathOptions={{ color: colors.border, fillColor: colors.fill, fillOpacity: 0.72, weight: 2.5, dashArray: node.existing_households > 0 ? '' : '5,4' }}
                    >
                      <Popup>
                        <div style={{ minWidth: '250px', lineHeight: '1.85', fontFamily: 'sans-serif' }}>
                          <strong style={{ color: '#064e3b', fontSize: '1rem' }}>🏦 {node.segment} 水資源節點</strong><br />
                          🏙️ {node.town}　{node.village && <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{node.village}</span>}<br />
                          <div style={{ margin: '6px 0 4px', borderTop: '1px solid #d1fae5', paddingTop: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#065f46' }}>現有建案蓄水</span><br />
                            🏗️ 建案數：{node.existing_buildings} 件　👥 戶數：{node.existing_households} 戶<br />
                            💧 現有7日儲水：<strong style={{ color: '#059669' }}>{node.existing_storage_m3} m³</strong>
                          </div>
                          <div style={{ margin: '6px 0 4px', borderTop: '1px solid #d1fae5', paddingTop: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#065f46' }}>建議增設空地蓄水</span><br />
                            ➕ 建議增設：<strong style={{ color: '#b45309' }}>{node.recommended_add_m3} m³</strong><br />
                            🎯 節點總容量：<strong style={{ color: '#064e3b', fontSize: '1.05rem' }}>{node.total_capacity_m3} m³</strong>
                          </div>
                          {/* Capacity bar */}
                          <div style={{ margin: '6px 0', background: '#d1fae5', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${existPct}%`, background: '#059669', height: '100%', borderRadius: '6px' }} />
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#6b7280', marginBottom: '4px' }}>
                            現有建案已覆蓋 {existPct}%，空地補充 {100 - existPct}%
                          </div>
                          <div style={{ borderTop: '1px solid #d1fae5', paddingTop: '4px' }}>
                            🏛️ 土地狀態：{node.land_status}<br />
                            🏗️ 建議型態：{node.node_type}<br />
                            ⭐ 優先等級：<strong>{stars}</strong>
                          </div>
                          <div style={{ marginTop: '8px' }}>
                            <button onClick={() => openStreetView(node.lat, node.lng)} style={{ padding: '5px 12px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
                              📷 Google 街景確認地點
                            </button>
                          </div>
                        </div>
                      </Popup>
                      <Tooltip>🏦 {node.segment}｜總容量 {node.total_capacity_m3}m³（現有{node.existing_storage_m3}＋增設{node.recommended_add_m3}）</Tooltip>
                    </CircleMarker>
                  );
                })}

                {/* 🌊 潮汐倒灌預警 (Tidal Backflow Risk) */}
                {showTidalRisk && tidalRiskData && tidalRiskData.assessments.map((assessment: TidalRiskAssessment) => {
                  const riskColors = {
                    red: { circle: '#dc2626', label: '🔴 危急', bg: '#fee2e2' },
                    yellow: { circle: '#f59e0b', label: '🟡 警告', bg: '#fef3c7' },
                    green: { circle: '#10b981', label: '🟢 正常', bg: '#ecfdf5' },
                  };
                  
                  // 預測模式下的顏色
                  const predColors = {
                    high: { circle: '#7c3aed', label: '🔮 預測危急', bg: '#f3e8ff' },
                    medium: { circle: '#a855f7', label: '🔮 預測警告', bg: '#faf5ff' },
                    low: { circle: '#10b981', label: '🟢 預測正常', bg: '#ecfdf5' },
                  };

                  const currentRisk = riskColors[assessment.riskLevel];
                  const predRisk = predColors[assessment.predictiveRisk];
                  
                  const activeRisk = showPredictive ? predRisk : currentRisk;
                  const radius = (showPredictive ? (assessment.predictiveRisk === 'high' ? 14 : 10) : (assessment.riskLevel === 'red' ? 12 : 9));

                  return (
                    <CircleMarker
                      key={`tidal-${assessment.outletId}`}
                      center={[assessment.lat, assessment.lng]}
                      radius={radius}
                      pathOptions={{ 
                        color: activeRisk.circle, 
                        fillColor: activeRisk.circle, 
                        fillOpacity: showPredictive ? 0.8 : 0.65, 
                        weight: 2.5,
                        dashArray: showPredictive ? '5,5' : '' 
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: '300px', lineHeight: '1.8', fontFamily: 'sans-serif' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <strong style={{ color: activeRisk.circle, fontSize: '1.1rem' }}>
                              {showPredictive ? '🔮 2h 預測：' : ''}{activeRisk.label}
                            </strong>
                            <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{assessment.location}</span>
                          </div>

                          {showPredictive ? (
                            <div style={{ backgroundColor: '#f3e8ff', padding: '10px', borderRadius: '8px', border: '1px solid #c084fc', marginBottom: '10px' }}>
                              <strong style={{ color: '#7c3aed' }}>🔮 AI 預測分析 (未來 2 小時)</strong><br />
                              <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{assessment.predictiveReason}</span><br />
                              <div style={{ marginTop: '6px', fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                <span>🌊 預期潮位：<strong>{assessment.futureTidalHeight2h?.toFixed(2)}m</strong></span>
                                <span>🌧️ 降雨機率：<strong>{assessment.futureRainProb}%</strong></span>
                              </div>
                            </div>
                          ) : (
                            <div style={{ borderTop: '1px solid #d1d5db', margin: '6px 0', paddingTop: '6px' }}>
                              <strong style={{ color: '#4b5563' }}>⏱️ 當前觀測</strong><br />
                              當前潮位：<strong style={{ color: activeRisk.circle }}>{assessment.currentTidalHeight.toFixed(2)} m</strong> ({assessment.trend === 'rising' ? '🔼 漲潮' : assessment.trend === 'falling' ? '🔽 退潮' : '➡️ 靜止'})<br />
                              過去1hr雨量：{assessment.currentRainfall1hr.toFixed(1)} mm
                            </div>
                          )}

                          <div style={{ borderTop: '1px solid #d1d5db', margin: '6px 0', paddingTop: '6px', backgroundColor: activeRisk.bg, padding: '8px', borderRadius: '4px' }}>
                            <strong style={{ color: activeRisk.circle }}>{showPredictive ? '預測建議措施' : '當前建議措施'}</strong><br />
                            <span style={{ fontSize: '0.88rem' }}>{showPredictive ? (assessment.predictiveRisk === 'high' ? '建議提前啟動抽水站並通知巡查組人員待命' : '維持例行監控') : assessment.recommendedAction}</span>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '6px', textAlign: 'right' }}>
                            🕐 更新：{new Date(assessment.assessedAt).toLocaleTimeString('zh-TW')}
                          </div>
                        </div>
                      </Popup>
                      <Tooltip permanent={showPredictive && assessment.predictiveRisk === 'high'}>
                        {showPredictive ? `🔮 預測: ${assessment.predictiveRisk === 'high' ? '危急' : '穩定'}` : `${assessment.location}: ${assessment.riskLevel}`}
                      </Tooltip>
                    </CircleMarker>
                  );
                })}

                {/* GPS location marker */}
                {gpsLocation && (
                  <CircleMarker center={gpsLocation} radius={10}
                    pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.85, weight: 3 }}>
                    <Popup>
                      <div style={{ textAlign: 'center', padding: '6px' }}>
                        <div style={{ fontWeight: 'bold' }}>📍 您目前的位置</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                          {gpsLocation[0].toFixed(5)}, {gpsLocation[1].toFixed(5)}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )}

                <MapClickHandler onClick={(ll) => { setClickCoords([ll.lat, ll.lng]); setMapCenter([ll.lat, ll.lng]); }} />
              </MapContainer>


            </div>

            {/* RIGHT PANEL - 現況看板 */}
            <div className="gis-right-panel" style={{ backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} color="#0ea5e9" /> 現況看板
              </div>

              {/* ── 115年污水巡檢路段 ── */}
              <div style={{ border: '1.5px solid #7c3aed', borderRadius: '8px', overflow: 'hidden' }}>
                {/* 標題列（點擊展開/收合）*/}
                <div
                  onClick={() => { setShowInspectionPanel(v => !v); if (!showInspectionPanel && inspectionRoutes115.length === 0) fetchInspectionRoutes115(); }}
                  style={{ backgroundColor: showInspectionPanel ? '#7c3aed' : '#f5f3ff', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem' }}>🚿</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: showInspectionPanel ? 'white' : '#7c3aed' }}>115年污水預計巡檢路段</span>
                    {inspectionProgress && (
                      <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '8px', backgroundColor: inspectionProgress.completed === inspectionProgress.total ? '#22c55e' : '#e9d5ff', color: inspectionProgress.completed === inspectionProgress.total ? 'white' : '#7c3aed', fontWeight: '700' }}>
                        {inspectionProgress.completed}/{inspectionProgress.total}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: showInspectionPanel ? 'white' : '#7c3aed' }}>{showInspectionPanel ? '▲' : '▼'}</span>
                </div>

                {showInspectionPanel && (
                  <div style={{ padding: '0' }}>
                    {/* 進度條 */}
                    {inspectionProgress && (
                      <div style={{ padding: '6px 10px 4px', backgroundColor: '#faf5ff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#7c3aed', marginBottom: '3px' }}>
                          <span>巡檢進度</span>
                          <strong>{inspectionProgress.progress_pct}%（{inspectionProgress.completed}/{inspectionProgress.total} 條）</strong>
                        </div>
                        <div style={{ height: '5px', backgroundColor: '#e9d5ff', borderRadius: '3px' }}>
                          <div style={{ height: '100%', borderRadius: '3px', backgroundColor: inspectionProgress.completed === inspectionProgress.total ? '#22c55e' : '#7c3aed', width: `${inspectionProgress.progress_pct}%`, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )}

                    {/* 巡檢清單表格 */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f3e8ff' }}>
                            <th style={{ padding: '5px 6px', textAlign: 'left', color: '#6b21a8', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '1px solid #e9d5ff' }}>地區</th>
                            <th style={{ padding: '5px 6px', textAlign: 'left', color: '#6b21a8', fontWeight: '700', borderBottom: '1px solid #e9d5ff' }}>路段</th>
                            <th style={{ padding: '5px 4px', textAlign: 'center', color: '#6b21a8', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '1px solid #e9d5ff' }}>通報</th>
                            <th style={{ padding: '5px 4px', textAlign: 'center', color: '#6b21a8', fontWeight: '700', borderBottom: '1px solid #e9d5ff' }}>完成</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspectionRoutes115.map((r, idx) => {
                            const isDone = r.status === 'completed';
                            const isUpdating = inspectionUpdating === r.id;
                            return (
                              <tr key={r.id} style={{ backgroundColor: isDone ? '#f0fdf4' : idx % 2 === 0 ? 'white' : '#faf5ff', borderBottom: '1px solid #f3e8ff' }}>
                                <td style={{ padding: '5px 6px', color: '#374151', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: r.district === '竹東' ? '#fef3c7' : '#e0f2fe', color: r.district === '竹東' ? '#92400e' : '#0369a1', fontWeight: '600' }}>{r.district}</span>
                                </td>
                                <td style={{ padding: '5px 6px', color: isDone ? '#15803d' : '#374151' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {isDone && <span style={{ color: '#22c55e', fontWeight: '700' }}>✓</span>}
                                    <button
                                      onClick={() => { setMapCenter([r.lat, r.lng]); setClickCoords([r.lat, r.lng]); }}
                                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: isDone ? '#15803d' : '#7c3aed', textAlign: 'left', fontWeight: isDone ? '600' : '400', textDecoration: isDone ? 'none' : 'underline', fontSize: '0.72rem' }}
                                      title="點擊定位到地圖"
                                    >
                                      {r.road_name.replace(/^竹[東北]-/, '')}
                                    </button>
                                  </div>
                                  {isDone && r.completed_date && (
                                    <div style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: '1px' }}>{r.completed_date}</div>
                                  )}
                                </td>
                                <td style={{ padding: '5px 4px', textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>{r.repeat_count}次</td>
                                <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => toggleInspectionStatus(r.id, r.status)}
                                    disabled={isUpdating}
                                    title={isDone ? '點擊取消完成' : '點擊標記為已完成'}
                                    style={{
                                      width: '22px', height: '22px', borderRadius: '4px', border: isDone ? '2px solid #22c55e' : '2px solid #d1d5db',
                                      backgroundColor: isDone ? '#22c55e' : 'white', color: isDone ? 'white' : '#9ca3af',
                                      cursor: isUpdating ? 'wait' : 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      transition: 'all 0.2s',
                                    }}
                                  >
                                    {isUpdating ? '…' : isDone ? '✓' : ''}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {inspectionRoutes115.length === 0 && (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.72rem' }}>載入中…</div>
                    )}
                  </div>
                )}
              </div>

              {/* ── 雨量超標即時警報（當雨量超門檻時才顯示）── */}
              {weatherData && (() => {
                const stations = weatherData.rainfallStations ?? [];
                const max1hr  = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall1hr  ?? 0)) : 0;
                const max10m  = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall10min ?? 0)) : 0;
                const max3hr  = stations.length ? Math.max(0, ...stations.map((s: any) => s.rainfall3hr  ?? 0)) : 0;
                const topSt   = stations.reduce((a: any, b: any) => ((b.rainfall1hr ?? 0) > (a.rainfall1hr ?? 0) ? b : a), stations[0]);

                if (max1hr >= 40 || max3hr >= 100) {
                  return (
                    <div style={{ backgroundColor: '#fef2f2', border: '2px solid #dc2626', borderRadius: '8px', padding: '8px 10px', fontSize: '0.72rem', animation: 'pulse 1.2s ease-in-out infinite' }}>
                      <div style={{ color: '#dc2626', fontWeight: '800', fontSize: '0.78rem', marginBottom: '3px' }}>🚨 雨量超標！立即注意</div>
                      <div style={{ color: '#7f1d1d', lineHeight: '1.5', marginBottom: '6px' }}>
                        最大1小時雨量 <strong>{max1hr.toFixed(0)} mm/hr</strong>（{topSt?.stationName ?? '—'}）<br />
                        上方管段可能<strong>已積水或倒灌</strong>，請即時巡查！
                      </div>
                      {topSt?.lat && topSt?.lng && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => { setMapCenter([topSt.lat, topSt.lng]); setClickCoords([topSt.lat, topSt.lng]); }} style={{ flex: 1, padding: '3px', borderRadius: '4px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '600' }}>🗺️ 定位雨量站</button>
                          <button onClick={() => openStreetView(topSt.lat, topSt.lng)} style={{ flex: 1, padding: '3px', borderRadius: '4px', backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #dc2626', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '600' }}>📷 街景</button>
                        </div>
                      )}
                    </div>
                  );
                } else if (max1hr >= 15 || max10m >= 5) {
                  return (
                    <div style={{ backgroundColor: '#fefce8', border: '2px solid #eab308', borderRadius: '8px', padding: '8px 10px', fontSize: '0.72rem' }}>
                      <div style={{ color: '#a16207', fontWeight: '700', marginBottom: '3px' }}>⚠️ 雨量偏高，請留意管段</div>
                      <div style={{ color: '#713f12', lineHeight: '1.5', marginBottom: '6px' }}>
                        1小時 <strong>{max1hr.toFixed(0)} mm</strong>（{topSt?.stationName ?? '—'}）<br />
                        以下高風險管段<strong>可能開始積水</strong>，建議備勤。
                      </div>
                      {topSt?.lat && topSt?.lng && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => { setMapCenter([topSt.lat, topSt.lng]); setClickCoords([topSt.lat, topSt.lng]); }} style={{ flex: 1, padding: '3px', borderRadius: '4px', backgroundColor: '#eab308', color: 'white', border: 'none', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '600' }}>🗺️ 定位雨量站</button>
                          <button onClick={() => openStreetView(topSt.lat, topSt.lng)} style={{ flex: 1, padding: '3px', borderRadius: '4px', backgroundColor: 'transparent', color: '#a16207', border: '1px solid #eab308', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '600' }}>📷 街景</button>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* ── 管段風險提示 ── */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', letterSpacing: '0.04em', paddingBottom: '3px', borderBottom: '1px solid #e5e7eb' }}>
                  📍 管段風險提示
                </div>
                <div style={{ fontSize: '0.64rem', color: '#9ca3af', marginTop: '3px', marginBottom: '2px' }}>
                  汛前需優先清疏，雨量超標時最容易出問題
                </div>
              </div>

              {!dredgingSuggestionsLoaded ? (
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center', padding: '6px 0' }}>載入中…</div>
              ) : dredgingSuggestions.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center', padding: '6px 0' }}>暫無風險管段資料</div>
              ) : (
                dredgingSuggestions
                  .filter((sg: any) => sg.priority === 'high' || sg.priority === 'medium')
                  .slice(0, 4)
                  .map((sg: any) => {
                    const isHigh = sg.priority === 'high';
                    const tagBg = isHigh ? '#ef4444' : '#f97316';
                    const cardBg = isHigh ? '#fff7ed' : '#fffbeb';
                    const cardBorder = isHigh ? '#fdba74' : '#fde68a';
                    const titleColor = isHigh ? '#c2410c' : '#b45309';
                    const subColor = isHigh ? '#92400e' : '#a16207';
                    const reasonColor = isHigh ? '#78350f' : '#92400e';
                    const segName = sg.road_name.replace(sg.district + '-', '');
                    return (
                      <div key={sg.id} style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '7px', padding: '7px 9px', fontSize: '0.74rem' }}>
                        <div style={{ fontWeight: '700', color: titleColor, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <span style={{ background: tagBg, color: 'white', borderRadius: '4px', padding: '0px 5px', fontSize: '0.63rem', fontWeight: '700', flexShrink: 0 }}>{isHigh ? '高風險' : '中風險'}</span>
                          <span>{segName}</span>
                        </div>
                        <div style={{ color: subColor, fontSize: '0.67rem', marginBottom: '3px' }}>{sg.district} · {sg.culvert_type} · 約 {sg.estimated_length_m}m</div>
                        <div style={{ color: reasonColor, fontSize: '0.65rem', lineHeight: '1.45' }}>
                          {sg.reason.length > 55 ? sg.reason.slice(0, 55) + '…' : sg.reason}
                        </div>
                        <div style={{ marginTop: '5px' }}>
                          <button
                            onClick={() => { setMapCenter([sg.lat, sg.lng]); setClickCoords([sg.lat, sg.lng]); }}
                            style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: tagBg, color: 'white', border: 'none', fontSize: '0.63rem', cursor: 'pointer', fontWeight: '600' }}
                          >🗺️ 在地圖標記位置</button>
                        </div>
                      </div>
                    );
                  })
              )}

              {/* ── 出水口即時警示 ── */}
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6b7280', letterSpacing: '0.04em', paddingBottom: '4px', borderBottom: '1px solid #e5e7eb', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <AlertTriangle size={11} color="#dc2626" /> 出水口即時警示
                {!tidalRiskData && <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: '400' }}>更新中...</span>}
              </div>

              {tidalRiskData?.assessments && tidalRiskData?.assessments.filter((a: TidalRiskAssessment) => a.riskLevel !== 'green').map((assessment: TidalRiskAssessment, i: number) => {
                const isRed = assessment.riskLevel === 'red';
                const isYellow = assessment.riskLevel === 'yellow';
                const bg = isRed ? '#fee2e2' : isYellow ? '#fef3c7' : '#eff6ff';
                const border = isRed ? '#dc2626' : isYellow ? '#f59e0b' : '#3b82f6';
                const textDark = isRed ? '#991b1b' : isYellow ? '#92400e' : '#1e40af';
                const textLight = isRed ? '#7f1d1d' : isYellow ? '#78350f' : '#1d4ed8';
                const icon = isRed ? '🔴' : isYellow ? '🟡' : '🔵';
                return (
                  <div key={i} style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '8px', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: '700', color: textDark, marginBottom: '2px' }}>{icon} {assessment.location}</div>
                    <div style={{ color: textLight, fontSize: '0.68rem', marginBottom: '5px' }}>{assessment.town} | 潮位 {assessment.currentTidalHeight?.toFixed(2) ?? '—'}m</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => { setMapCenter([assessment.lat, assessment.lng]); setClickCoords([assessment.lat, assessment.lng]); }} style={{ flex: 1, padding: '3px', borderRadius: '4px', backgroundColor: border, color: 'white', border: 'none', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '600' }}>🗺️ 定位</button>
                      <button onClick={() => openStreetView(assessment.lat, assessment.lng)} style={{ flex: 1, padding: '3px', borderRadius: '4px', backgroundColor: 'transparent', color: border, border: `1px solid ${border}`, fontSize: '0.65rem', cursor: 'pointer', fontWeight: '600' }}>📷 街景</button>
                    </div>
                  </div>
                );
              })}

              {(!tidalRiskData?.assessments || tidalRiskData?.assessments.filter((a: TidalRiskAssessment) => a.riskLevel !== 'green').length === 0) && tidalRiskData && (
                <div style={{ textAlign: 'center', padding: '10px 10px', color: '#10b981' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>✅</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600' }}>出水口目前無警告</div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>所有監測點正常</div>
                </div>
              )}

              <div style={{ flex: 1 }} />
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '8px', textAlign: 'center' }}>
                🔄 自動更新：5分鐘
              </div>
            </div>
          </div>

          {/* Weather Toggle + Panel */}
            {/* 天氣預報 & AI 警示按鈕 — header 已有，此處隱藏 */}
            <div style={{ marginBottom: '12px', display: 'none' }}>
              <button
                onClick={() => { setShowWeatherPanel(!showWeatherPanel); if (!weatherData && !weatherLoading) fetchWeather(); }}
                style={{
                  padding: '8px 18px', borderRadius: '20px', border: '2px solid #0ea5e9',
                  background: showWeatherPanel ? '#0ea5e9' : 'transparent',
                  color: showWeatherPanel ? '#fff' : '#0ea5e9',
                  fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                🌤️ 天氣預報 &amp; AI 風險警示
                {weatherData && (
                  <span style={{
                    background: weatherData.overallRisk === '極高' ? '#dc2626' : weatherData.overallRisk === '高' ? '#f97316' : weatherData.overallRisk === '中' ? '#eab308' : '#22c55e',
                    color: '#fff', borderRadius: '10px', padding: '1px 8px', fontSize: '0.78rem',
                  }}>
                    {weatherData.overallRisk}風險
                  </span>
                )}
              </button>
              {weatherLoading && <span style={{ marginLeft: '10px', color: '#6b7280', fontSize: '0.85rem' }}>載入中…</span>}
              {weatherError && <span style={{ marginLeft: '10px', color: '#dc2626', fontSize: '0.85rem' }}>{weatherError}</span>}
            </div>

            {/* 天氣預報面板 */}
            {showWeatherPanel && weatherData && (
              <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '18px', marginBottom: '16px', backdropFilter: 'blur(8px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0ea5e9' }}>🌤️ 天氣預報 &amp; AI 風險警示</h3>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>更新：{new Date(weatherData.fetchedAt).toLocaleString('zh-TW', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                </div>

                {/* 應變階段指示器 */}
                {(() => {
                  const max1hr  = Math.max(0, ...weatherData.rainfallStations.map((s: any) => s.rainfall1hr  ?? 0));
                  const max3hr  = Math.max(0, ...weatherData.rainfallStations.map((s: any) => s.rainfall3hr  ?? 0));
                  const max24hr = Math.max(0, ...weatherData.rainfallStations.map((s: any) => s.rainfall24hr ?? 0));
                  const max10m  = Math.max(0, ...weatherData.rainfallStations.map((s: any) => s.rainfall10min ?? 0));

                  type Phase = { label: string; icon: string; bg: string; color: string; border: string; actions: string[] };
                  let phase: Phase;
                  if (weatherData.hasActiveWarning || max1hr >= 80 || max3hr >= 100 || max24hr >= 200) {
                    phase = { label: '災中搶救　🔴 紅色警戒', icon: '🚨', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5',
                      actions: ['全員出動，協調消防與警政', '通報縣府緊急應變中心(EOC)', '積水≥30cm 通知警政疏散居民', '嚴禁人員進入人孔（毒氣/水流危險）', '確認新豐/竹北海岸閘門防海水倒灌'] };
                  } else if (max1hr >= 40) {
                    phase = { label: '災中搶救　🟠 橙色警戒', icon: '⚠️', bg: '#fff7ed', color: '#ea580c', border: '#fdba74',
                      actions: ['啟動應變小組', '巡查竹北、新豐、湖口低窪地區', '備妥行動抽水機', '確認排水閘門是否關閉'] };
                  } else if (max1hr >= 15 || weatherData.overallRisk === '高' || weatherData.overallRisk === '極高') {
                    phase = { label: '災前預防　🟡 黃色預警', icon: '⚡', bg: '#fefce8', color: '#ca8a04', border: '#fde047',
                      actions: ['科內待命', '巡查易淹水路段', '備妥砂包及防水閘板', '確認行動抽水機可正常啟動'] };
                  } else if (max10m >= 5 || weatherData.overallRisk === '中') {
                    phase = { label: '災前預防　🔵 橙色預警', icon: '🔔', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe',
                      actions: ['密切監看雨量變化（每30分鐘）', '確認各排水設施正常運作', '備妥應急物資清單'] };
                  } else {
                    phase = { label: '災前預防　🟢 平時巡管', icon: '✅', bg: '#f0fdf4', color: '#16a34a', border: '#86efac',
                      actions: ['定期清疏管網，4月底前完成汛前清疏', '盤點砂包、防水閘板庫存', '確認管線資料更新情況'] };
                  }

                  const thresholds = [
                    { label: '10分鐘', value: max10m,  warn: 5,   unit: 'mm',    hint: '橙色預警' },
                    { label: '1小時',  value: max1hr,  warn: 40,  unit: 'mm/hr', hint: '緊急應變' },
                    { label: '3小時',  value: max3hr,  warn: 100, unit: 'mm',    hint: '請求消防' },
                    { label: '24小時', value: max24hr, warn: 200, unit: 'mm',    hint: '啟動EOC' },
                  ];

                  return (
                    <>
                      {/* Phase banner */}
                      <div style={{ background: phase.bg, border: `2px solid ${phase.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ fontSize: '2rem', lineHeight: 1, marginTop: '2px' }}>{phase.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: phase.color, marginBottom: '8px' }}>{phase.label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {phase.actions.map((a, ai) => (
                              <span key={ai} style={{ background: '#fff', border: `1px solid ${phase.border}`, borderRadius: '6px', padding: '2px 8px', fontSize: '0.77rem', color: phase.color, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                ▶ {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Rainfall threshold status bars */}
                      {weatherData.rainfallStations.length > 0 && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>📊 雨量門檻狀態（最大站值）</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            {thresholds.map((t, ti) => {
                              const ratio = t.warn > 0 ? Math.min(t.value / t.warn, 1) : 0;
                              const barColor = t.value >= t.warn ? '#dc2626' : t.value >= t.warn * 0.7 ? '#f97316' : t.value >= t.warn * 0.3 ? '#eab308' : '#22c55e';
                              const exceeded = t.value >= t.warn;
                              return (
                                <div key={ti} style={{ textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '8px 6px', border: `1px solid ${exceeded ? '#fca5a5' : '#e2e8f0'}` }}>
                                  <div style={{ fontSize: '0.74rem', color: '#6b7280', marginBottom: '3px' }}>{t.label}</div>
                                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: barColor, lineHeight: 1.1 }}>
                                    {t.value > 0 ? t.value.toFixed(1) : '—'}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{t.unit}</div>
                                  <div style={{ margin: '5px 0 3px', height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${ratio * 100}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.5s' }} />
                                  </div>
                                  <div style={{ fontSize: '0.67rem', color: exceeded ? '#dc2626' : '#9ca3af', fontWeight: exceeded ? 700 : 400 }}>
                                    {exceeded ? `⚡ 超過門檻` : `門檻 ${t.warn}${t.unit}`}
                                  </div>
                                  {exceeded && <div style={{ fontSize: '0.66rem', color: '#dc2626', marginTop: '1px' }}>{t.hint}</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* AI 警示 */}
                <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {weatherData.aiAlerts.map((alert, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleAiAlertClick(alert)}
                      style={{
                        borderRadius: '10px', padding: '10px 14px',
                        background: alert.level === 'critical' ? '#fef2f2' : alert.level === 'warning' ? '#fffbeb' : alert.level === 'info' ? '#eff6ff' : '#f0fdf4',
                        borderLeft: `4px solid ${alert.level === 'critical' ? '#dc2626' : alert.level === 'warning' ? '#f59e0b' : alert.level === 'info' ? '#3b82f6' : '#22c55e'}`,
                        cursor: alert.layerKey ? 'pointer' : 'default',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => alert.layerKey && (e.currentTarget.style.transform = 'translateX(4px)')}
                      onMouseLeave={(e) => alert.layerKey && (e.currentTarget.style.transform = 'translateX(0)')}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {alert.icon} {alert.title}
                        {alert.layerKey && <span style={{ fontSize: '0.65rem', color: '#6366f1', marginLeft: 'auto', background: '#e0e7ff', padding: '1px 6px', borderRadius: '4px' }}>📍 定位</span>}
                      </div>
                      <div style={{ fontSize: '0.83rem', color: '#374151', marginBottom: '4px' }}>{alert.message}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>📌 建議：{alert.action}</div>
                    </div>
                  ))}
                </div>

                {/* 鄉鎮預報 */}
                {weatherData.forecasts.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>📡 鄉鎮天氣預報</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                      {weatherData.forecasts.map((f, i) => (
                        <div key={i} style={{
                          background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                          padding: '8px 12px', minWidth: '100px', textAlign: 'center',
                        }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e40af', marginBottom: '4px' }}>{f.area}</div>
                          <div style={{ fontSize: '0.78rem', color: '#374151' }}>{f.weatherDesc}</div>
                          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                            降雨機率：{f.pop6h !== null ? `${f.pop6h}%` : f.pop12h !== null ? `${f.pop12h}%` : '—'}
                          </div>
                          <div style={{
                            marginTop: '4px', display: 'inline-block', padding: '1px 8px', borderRadius: '8px', fontSize: '0.75rem',
                            background: f.riskLevel === '高' || f.riskLevel === '極高' ? '#fee2e2' : f.riskLevel === '中' ? '#fef3c7' : '#dcfce7',
                            color: f.riskLevel === '高' || f.riskLevel === '極高' ? '#dc2626' : f.riskLevel === '中' ? '#92400e' : '#166534',
                          }}>
                            {f.riskLevel}風險
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 即時雨量站（可收合） */}
                {weatherData.rainfallStations.length > 0 && (
                  <div style={{ marginBottom: '4px' }}>
                    <button
                      onClick={() => setShowRainfallStations(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                        background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px',
                        padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                        color: '#374151', textAlign: 'left', marginBottom: showRainfallStations ? '8px' : '0',
                      }}
                    >
                      🌧️ 即時雨量站（{weatherData.rainfallStations.length} 站）
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>
                        {showRainfallStations ? '▲ 收合' : '▼ 展開'}
                      </span>
                    </button>
                    {showRainfallStations && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {weatherData.rainfallStations.map((s, i) => {
                          const isExtreme = (s.rainfall1hr || 0) >= 40;
                          const isHigh = (s.rainfall1hr || 0) >= 15;
                          return (
                            <div key={i} style={{
                              background: isExtreme ? '#fef2f2' : isHigh ? '#fffbeb' : '#f0f9ff',
                              border: `1px solid ${isExtreme ? '#fca5a5' : isHigh ? '#fcd34d' : '#bae6fd'}`,
                              borderRadius: '8px', padding: '6px 10px', fontSize: '0.78rem',
                              animation: isExtreme ? 'pulse 2s infinite' : 'none'
                            }}>
                              <div style={{ fontWeight: 600, color: isExtreme ? '#dc2626' : isHigh ? '#92400e' : '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {s.stationName} {isExtreme && '🚨'} {isHigh && !isExtreme && '⚠️'}
                              </div>
                              <div style={{ color: isExtreme ? '#b91c1c' : '#374151' }}>1hr：{s.rainfall1hr !== null ? `${s.rainfall1hr} mm` : '—'}</div>
                              <div style={{ color: isExtreme ? '#b91c1c' : '#374151' }}>3hr：{s.rainfall3hr !== null ? `${s.rainfall3hr} mm` : '—'}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={fetchWeather} style={{ marginTop: '12px', padding: '5px 14px', borderRadius: '8px', background: '#0ea5e9', color: '#fff', border: 'none', fontSize: '0.82rem', cursor: 'pointer' }}>
                  🔄 重新整理
                </button>
              </div>
            )}


          {/* Street View Side Panel */}
            {showStreetView && streetViewCoords && (
              <div 
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed', bottom: '20px', right: '20px',
                  width: '620px', height: '520px',
                  backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
                  zIndex: 4100, display: 'flex', flexDirection: 'column',
                  borderRadius: '16px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                  border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden',
                  animation: 'slideInRight 0.3s ease-out',
                  filter: nightMode ? 'invert(1) hue-rotate(180deg)' : 'none',
                }}
              >
                {/* Header */}
                <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedAsset ? (
                      <>
                        <span style={{ backgroundColor: selectedAsset.type === 'manhole' ? '#8b5cf6' : '#3b82f6', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {selectedAsset.type === 'manhole' ? (selectedAsset.data.manhole_type === '集水井' ? '集水井' : '人孔') : '管線'}
                        </span>
                        <strong style={{ fontSize: '1rem', color: '#1e293b' }}>
                          {selectedAsset.type === 'manhole' ? selectedAsset.data.manhole_no : selectedAsset.data.sewer_no}
                        </strong>
                      </>
                    ) : (
                      <>
                        <span style={{ backgroundColor: '#059669', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>📷 街景</span>
                        <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{streetViewCoords[0].toFixed(5)}, {streetViewCoords[1].toFixed(5)}</strong>
                      </>
                    )}
                  </div>
                  <button onClick={() => { setShowStreetView(false); setSelectedAsset(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={22} /></button>
                </div>
                {/* Info — only when selectedAsset is set */}
                {selectedAsset && (
                  <div style={{ padding: '12px 18px', fontSize: '0.85rem', color: '#475569', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {selectedAsset.type === 'manhole' ? (<>
                      <div>📍 {selectedAsset.data.location || '—'}</div>
                      <div>🗂️ {selectedAsset.data.area || selectedAsset.data.project_name || '—'}</div>
                      <div>📏 深度：{selectedAsset.data.depth ? `${selectedAsset.data.depth} m` : '—'}</div>
                      <div>🏷️ 型式：{selectedAsset.data.manhole_type || '—'}</div>
                      <div>🔄 系統：{selectedAsset.data.system_type || '—'}</div>
                    </>) : (<>
                      <div>🗂️ {selectedAsset.data.area || selectedAsset.data.project_name || '—'}</div>
                      <div>📏 管徑：{selectedAsset.data.diameter ? `${selectedAsset.data.diameter} mm` : '—'} | {selectedAsset.data.length ? `${Number(selectedAsset.data.length).toFixed(0)}m` : '—'}</div>
                      <div>🛣️ {materialLabel(selectedAsset.data.material)}</div>
                      <div>📐 坡度：{selectedAsset.data.slope ? `${selectedAsset.data.slope} ‰` : '—'}</div>
                      <div>🔼 {selectedAsset.data.upstream_node || '—'} → {selectedAsset.data.downstream_node || '—'}</div>
                    </>)}
                  </div>
                )}
                {/* Street View iframe */}
                <div style={{ flexGrow: 1, position: 'relative', backgroundColor: '#e2e8f0' }}>
                  <iframe
                    key={`sv-${streetViewCoords[0]}-${streetViewCoords[1]}`}
                    width="100%" height="100%"
                    style={{ border: 0 }}
                    src={`https://maps.google.com/maps?layer=c&cbll=${streetViewCoords[0]},${streetViewCoords[1]}&cbp=11,0,0,0,0&output=svembed`}
                    allowFullScreen title="Street View"
                  />
                  <button onClick={() => { const c = streetViewCoords; setStreetViewCoords(null); setTimeout(() => setStreetViewCoords(c), 50); }}
                    style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>
                    重新載入
                  </button>
                </div>
              </div>
            )}


          <p style={{ marginTop: '8px', fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center' }}>
            💡 點擊地圖任何位置可查看該處「Google 街景」
          </p>
          <SentimentPanel
            showNewsPanel={showNewsPanel}
            showFloodNews={showFloodNews}
            showFloodOpinion={showFloodOpinion}
            isFetchingSentiment={isFetchingSentiment}
            sentimentData={sentimentData}
            onClose={() => setShowNewsPanel(false)}
          />
        </>
      ) : viewMode === 'table' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', backgroundColor: '#f8fafc' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <button onClick={() => { setSystemType('污水'); setPage(1); }} style={{ padding: '9px 20px', backgroundColor: systemType === '污水' ? '#3b82f6' : 'transparent', color: systemType === '污水' ? 'white' : '#374151', fontWeight: systemType === '污水' ? '600' : '400', border: 'none', cursor: 'pointer' }}>污水系統</button>
                <button onClick={() => { setSystemType('雨水'); setPage(1); }} style={{ padding: '9px 20px', backgroundColor: systemType === '雨水' ? '#0ea5e9' : 'transparent', color: systemType === '雨水' ? 'white' : '#374151', fontWeight: systemType === '雨水' ? '600' : '400', border: 'none', cursor: 'pointer' }}>雨水系統</button>
              </div>
              <div style={{ display: 'flex', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <button onClick={() => { setType('pipelines'); setPage(1); }} style={{ padding: '9px 20px', backgroundColor: type === 'pipelines' ? '#8b5cf6' : 'transparent', color: type === 'pipelines' ? 'white' : '#374151', fontWeight: type === 'pipelines' ? '600' : '400', border: 'none', cursor: 'pointer' }}>管線資料</button>
                <button onClick={() => { setType('manholes'); setPage(1); }} style={{ padding: '9px 20px', backgroundColor: type === 'manholes' ? '#8b5cf6' : 'transparent', color: type === 'manholes' ? 'white' : '#374151', fontWeight: type === 'manholes' ? '600' : '400', border: 'none', cursor: 'pointer' }}>人孔/陰井資料</button>
              </div>
              <select value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }} style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '0.95rem' }}>
                <option value="">全部區域</option>
                <option value="竹北一期">竹北一期</option>
                <option value="竹北二期">竹北二期</option>
                <option value="竹東二期">竹東二期</option>
                <option value="竹東(台泥重劃區)">竹東(台泥重劃區)</option>
              </select>
              <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '8px', padding: '6px 14px', border: '1px solid #e2e8f0', flexGrow: 1 }}>
                <Search size={18} color="#9ca3af" style={{ marginRight: '10px' }} />
                <input type="text"
                  placeholder={type === 'pipelines' ? '搜尋管線編號、工程名稱、材質...' : '搜尋人孔編號、位置、工程名稱...'}
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }} />
                <button type="submit" style={{ padding: '6px 14px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>搜尋</button>
              </form>
            </div>

            {/* Data Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>查詢中...</div>
            ) : data.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>無符合條件的資料</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                {type === 'pipelines' ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(139,92,246,0.08)', borderBottom: '2px solid var(--glass-border)' }}>
                        {['管線編號', '上游節點', '下游節點', '材質', '管徑(mm)', '長度(m)', '坡度(‰)', '工程名稱', '區域', '廠商'].map(h => (
                          <th key={h} style={{ padding: '12px 10px', textAlign: 'left', color: '#8b5cf6', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data as Pipeline[]).map((row, ri) => (
                        <tr key={`pipe-${row.id ?? ri}`} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background-color 0.15s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.03)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={{ padding: '10px', fontWeight: '500', color: 'var(--primary)' }}>{row.sewer_no}</td>
                          <td style={{ padding: '10px' }}>{row.upstream_node}</td>
                          <td style={{ padding: '10px' }}>{row.downstream_node}</td>
                          <td style={{ padding: '10px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(139,92,246,0.1)', fontSize: '0.85rem' }}>{materialLabel(row.material)}</span></td>
                          <td style={{ padding: '10px' }}>{row.diameter}</td>
                          <td style={{ padding: '10px' }}>{row.length?.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>{row.slope?.toFixed(3)}</td>
                          <td style={{ padding: '10px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.project_name}>{row.project_name}</td>
                          <td style={{ padding: '10px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary)', fontSize: '0.85rem' }}>{row.area}</span></td>
                          <td style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.contractor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(139,92,246,0.08)', borderBottom: '2px solid var(--glass-border)' }}>
                        {['人孔編號', 'X座標', 'Y座標', '型式', '位置', '地面高程', '深度(m)', '工程名稱', '區域', '廠商'].map(h => (
                          <th key={h} style={{ padding: '12px 10px', textAlign: 'left', color: '#8b5cf6', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data as Manhole[]).map((row, ri) => (
                        <tr key={`mhr-${row.id ?? ri}`} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background-color 0.15s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.03)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={{ padding: '10px', fontWeight: '500', color: 'var(--primary)' }}>{row.manhole_no}</td>
                          <td style={{ padding: '10px' }}>{row.x?.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>{row.y?.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>{row.manhole_type}</td>
                          <td style={{ padding: '10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.location}>{row.location}</td>
                          <td style={{ padding: '10px' }}>{row.ground_level?.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>{row.depth?.toFixed(2)}</td>
                          <td style={{ padding: '10px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.project_name}>{row.project_name}</td>
                          <td style={{ padding: '10px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary)', fontSize: '0.85rem' }}>{row.area}</span></td>
                          <td style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.contractor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', padding: '16px 0', borderTop: '1px solid var(--glass-border)' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: page === 1 ? 'transparent' : 'var(--bg-color)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ChevronLeft size={16} /> 上一頁
                </button>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  第 <strong style={{ color: 'var(--text-main)' }}>{page}</strong> / {totalPages} 頁
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: page === totalPages ? 'transparent' : 'var(--bg-color)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-main)', cursor: page === totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  下一頁 <ChevronRight size={16} />
                </button>
              </div>
            )}


          </div>
        </div>
      ) : null}
    </div>
    </>
  );
}
