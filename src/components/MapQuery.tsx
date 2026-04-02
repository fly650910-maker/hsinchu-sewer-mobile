'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import zonesData from '@/data/redevelopmentZones.json';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const manholeIconRed = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const manholeIconBlue = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter map when location changes
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface MapQueryProps {
  address: string;
}

export default function MapQuery({ address }: MapQueryProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [manholes, setManholes] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStreetView, setSelectedStreetView] = useState<[number, number] | null>(null);
  const radius = 150; // default 150m radius

  useEffect(() => {
    if (!address) return;

    const fetchLocationData = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Geocode the address using Nominatim (Fuzzy search)
        // First attempt: address + 新竹縣
        let geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ' 新竹縣')}`);
        let geoData = await geoRes.json();
        
        if (!geoData || geoData.length === 0) {
          // Second attempt: raw address
          geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
          geoData = await geoRes.json();
          
          if (!geoData || geoData.length === 0) {
            // Third attempt: extract road names for intersection (fuzzy)
            const roads = address.split(/與|和|交叉口|街口|路口/).map(s => s.trim()).filter(Boolean);
            if (roads.length > 1) {
               geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(roads[0] + ' ' + roads[1] + ' 新竹縣')}`);
               geoData = await geoRes.json();
            }

            if (!geoData || geoData.length === 0) {
              setError('地圖模糊查詢找不到該地點的坐標，請嘗試輸入更完整的路名或地標。');
              setLoading(false);
              return;
            }
          }
        }

        const lat = parseFloat(geoData[0].lat);
        const lon = parseFloat(geoData[0].lon);
        setPosition([lat, lon]);

        // 2. Fetch nearby manholes and pipelines from our API
        const manholeRes = await fetch(`/api/gis/nearby?lat=${lat}&lng=${lon}&radius=${radius}`);
        if (manholeRes.ok) {
          const mData = await manholeRes.json();
          setManholes(mData.manholes || []);
          setPipelines(mData.pipelines || []);
        }
      } catch (err: any) {
        setError('取得地圖或管線資料失敗: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchLocationData();
    }, 800); // debounce API calls

    return () => clearTimeout(timer);
  }, [address]);

  if (loading) {
    return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>載入地圖及設施資料中...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>{error}</div>;
  }

  if (!position) {
    return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)' }}>請輸入陳情地址或交叉路口以顯示地圖</div>;
  }

  return (
    <div>
      <div style={{ position: 'relative', height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
        <MapContainer center={position} zoom={18} style={{ height: '100%', width: '100%' }}>
        <ChangeView center={position} zoom={18} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User Search Position Marker */}
        <Marker position={position} eventHandlers={{ click: () => setSelectedStreetView(position) }}>
          <Popup>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>查詢地點</div>
            <button 
              onClick={() => setSelectedStreetView(position)}
              style={{ display: 'inline-block', backgroundColor: '#4285F4', color: 'white', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}
            >
              在下方顯示 Google 街景
            </button>
            <br/><br/>
            <a 
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position[0]},${position[1]}`}
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontSize: '0.8rem', color: '#666' }}
            >
              或在新分頁開啟
            </a>
          </Popup>
        </Marker>

        {/* Radius Circle */}
        <Circle center={position} radius={radius} pathOptions={{ color: '#8b5cf6', weight: 1, fillOpacity: 0.1 }} />

        {/* Redevelopment Zones Overlay
        {zonesData.map((z, idx) => (
          <Circle 
            key={`zone-${idx}`} 
            center={[z.lat, z.lng]} 
            radius={z.radius} 
            pathOptions={{ color: '#f59e0b', weight: 2, fillOpacity: 0.1, dashArray: '4' }}
          >
            <Popup>
              <div style={{ fontSize: '0.9rem' }}>
                <strong style={{ color: '#d97706', fontSize: '1.05rem', display: 'block', marginBottom: '8px' }}>
                  🏘️ {z.name} 預估範圍
                </strong>
                <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>
                  本區域之詳細污水管線配置，請參考以下離線檔案：
                </p>
                <div style={{ padding: '8px', backgroundColor: 'var(--glass-bg)', borderRadius: '4px', wordBreak: 'break-all', fontSize: '0.85rem' }}>
                  📄 <a href={`/api/local-files?file=${encodeURIComponent(z.files)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold' }}>{z.files}</a>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}
        */}

        {/* Nearby Pipelines */}
        {pipelines.map((p, idx) => (
          <Polyline 
            key={`pipe-${idx}`} 
            positions={p.coords}
            pathOptions={{
              color: p.system_type === '污水' ? '#3b82f6' : '#0ea5e9',
              weight: 3,
              opacity: 0.8
            }}
          >
            <Popup>
              <div style={{ fontSize: '0.9rem' }}>
                <strong style={{ color: p.system_type === '污水' ? '#3b82f6' : '#0ea5e9', display: 'block', marginBottom: '4px' }}>
                  {p.system_type}管線: {p.sewer_no}
                </strong>
                <div><strong>節點:</strong> {p.upstream_node} ➔ {p.downstream_node}</div>
                <div><strong>材質/管徑:</strong> {p.material} / {p.diameter}mm</div>
                <div><strong>長度:</strong> {p.length?.toFixed(2)}m (坡度: {p.slope?.toFixed(2)}‰)</div>
                <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'gray' }}>{p.project_name}</div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Nearby Manholes */}
        {manholes.map((m, idx) => (
          <Marker 
            key={idx} 
            position={[m.lat, m.lng]} 
            icon={m.system_type === '雨水' ? manholeIconBlue : manholeIconRed}
            eventHandlers={{ click: () => setSelectedStreetView([m.lat, m.lng]) }}
          >
            <Popup>
              <div style={{ fontSize: '0.9rem' }}>
                <strong style={{ color: m.system_type === '雨水' ? '#0ea5e9' : 'var(--danger)', fontSize: '1.05rem', display: 'block', marginBottom: '8px' }}>
                  {m.system_type === '雨水' ? '雨水設施' : '污水設施'}: {m.manhole_type}
                </strong>
                <div style={{ marginBottom: '4px' }}><strong>編號:</strong> {m.manhole_no}</div>
                <div style={{ marginBottom: '4px' }}><strong>位置:</strong> {m.location}</div>
                <div style={{ marginBottom: '4px' }}><strong>深度:</strong> {m.depth?.toFixed(2)} m</div>
                <div style={{ marginBottom: '4px' }}><strong>距離:</strong> {m.distance?.toFixed(1)} m</div>
                {m.project_name && (
                  <div style={{ marginBottom: '4px', maxWidth: '220px', whiteSpace: 'normal', lineHeight: '1.4' }}>
                    <strong>建置期別:</strong> {m.project_name}
                  </div>
                )}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ccc' }}>
                  <button 
                    onClick={() => setSelectedStreetView([m.lat, m.lng])}
                    style={{ display: 'block', width: '100%', marginBottom: '4px', padding: '6px 0', backgroundColor: '#4285F4', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    在下方顯示街景
                  </button>
                  <a 
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${m.lat},${m.lng}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#666', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.8rem' }}
                  >
                    或在新視窗開啟
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Overlay Stats */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 400, backgroundColor: 'white', padding: '10px 16px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', maxWidth: '300px', maxHeight: '350px', overflowY: 'auto' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>周遭分析結果</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          半徑 {radius}m 內找到 <strong style={{ color: 'var(--danger)' }}>{manholes.filter((m: any) => m.system_type !== '雨水').length}</strong> 座污水、<strong style={{ color: '#0ea5e9' }}>{manholes.filter((m: any) => m.system_type === '雨水').length}</strong> 座雨水設施
          <br />以及 <strong>{pipelines.length}</strong> 條連結管線
        </div>
        
        {(() => {
          const R = 6371e3; // metres
          
          // Check Redevelopment Zones (Sewage)
          const matchingZones = zonesData.filter(z => {
            const φ1 = position[0] * Math.PI/180;
            const φ2 = z.lat * Math.PI/180;
            const Δφ = (z.lat-position[0]) * Math.PI/180;
            const Δλ = (z.lng-position[1]) * Math.PI/180;
            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c; 
            return d <= z.radius;
          });

          // Infer Town for Rainwater CAD reference based on coordinates
          let town = '';
          const pLat = position[0], pLng = position[1];
          if (pLat > 24.79 && pLng < 121.05) town = '竹北';
          else if (pLat > 24.85 && pLng < 121.01) town = '新豐';
          else if (pLat > 24.87 && pLng > 121.02) town = '湖口';
          else if (pLat > 24.80 && pLng > 121.05 && pLat < 24.86) town = '新埔';
          else if (pLat > 24.77 && pLng > 121.15) town = '關西';
          else if (pLat < 24.79 && pLat > 24.70 && pLng > 121.06 && pLng < 121.13) town = '竹東';
          else if (pLat < 24.78 && pLat > 24.73 && pLng > 121.06 && pLng < 121.13) town = '芎林';
          else if (pLat < 24.73 && pLng > 121.11) town = '橫山';
          else if (pLat < 24.71 && pLng > 121.05 && pLng < 121.07) town = '北埔';

          const rainCadMap: Record<string, string> = {
            '竹北': '下水道台帳圖規劃報告數化竹北地區.dwg',
            '新豐': '下水道台帳圖規劃報告數化新豐鄉.DWG',
            '湖口': '下水道台帳圖規劃報告數化湖口鄉.dwg',
            '新埔': '下水道台帳圖規劃報告數化新埔鎮.dwg',
            '關西': '下水道台帳圖規劃報告數化關西鎮.dwg',
            '竹東': '下水道台帳圖規劃報告數化竹東鎮.dwg',
            '芎林': '下水道台帳圖規劃報告數化芎林鄉.dwg',
            '橫山': '下水道台帳圖規劃報告數化橫山鄉.dwg',
            '北埔': '下水道台帳圖規劃報告數化北埔鄉.dwg'
          };

          return (
            <>
              {matchingZones.length > 0 && (
                <div style={{ padding: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    ⚠️ 污水圖資：重劃區範圍
                  </strong>
                  本區域可能有污水竣工圖未匯入 GIS：<br/>
                  {matchingZones.map((z, i) => (
                    <div key={i} style={{ marginTop: '4px', color: '#b45309', wordBreak: 'break-all' }}>
                      <strong>{z.name}</strong><br/>
                      <a href={`/api/local-files?file=${encodeURIComponent(z.files.split('/').pop() || z.files)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold' }}>
                        📄 {z.files.split('/').pop() || z.files}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {town && rainCadMap[town] && (
                <div style={{ padding: '8px', backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    🌧️ 雨水圖資：區域 CAD 下載
                  </strong>
                  系統判斷此處位於 <strong>{town}</strong>。<br/>
                  如需查詢詳細雨水下水道配置，請下載對應的 AutoCAD 圖資 (.dwg)：<br/>
                  <a href={`/api/local-files?file=${encodeURIComponent(rainCadMap[town])}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', marginTop: '4px', wordBreak: 'break-all' }}>
                    💾 {rainCadMap[town]}
                  </a>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>

      {/* Street View Panel (moved below the map) */}
      {selectedStreetView && (
        <div style={{ marginTop: '20px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)' }}>
          <div style={{ padding: '12px 20px', backgroundColor: 'var(--glass-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)' }}>📍 設施街景預覽</span>
            <button onClick={() => setSelectedStreetView(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.5rem', lineHeight: '1' }}>&times;</button>
          </div>
          <iframe
            width="100%"
            height="350"
            style={{ border: 0, display: 'block' }}
            loading="lazy"
            allowFullScreen
            src={`https://www.google.com/maps?q=&layer=c&cbll=${selectedStreetView[0]},${selectedStreetView[1]}&cbp=11,0,0,0,0&output=svembed`}
          ></iframe>
        </div>
      )}
    </div>
  );
}
