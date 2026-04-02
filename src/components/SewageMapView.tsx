'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Manhole {
  id: number; manhole_no: string; lat: number; lng: number;
  manhole_type: string; location: string; depth: number;
  project_name: string; system_type: string; source: string;
}
interface Pipeline {
  id: number; sewer_no: string; pipe_type: string; material: string;
  diameter: string; length: number; project_name: string;
  system_type: string; source: string;
  coords: [number, number][];
}

// Source → color mapping
const SOURCE_COLOR: Record<string, string> = {
  '竣工人孔':   '#7c3aed',
  '陰井':       '#d97706',
  '用戶接管':   '#16a34a',
  '竣工管線':   '#2563eb',
  '巷道連接管': '#0891b2',
  'legacy':     '#6b7280',
};

// Layer key → source
const SOURCE_LAYER: Record<string, string> = {
  mh_main:  '竣工人孔',
  mh_inlet: '陰井',
  mh_user:  '用戶接管',
  pl_main:  '竣工管線',
  pl_lane:  '巷道連接管',
};

// Manhole circle radius by source
const MH_RADIUS: Record<string, number> = {
  '竣工人孔': 5,
  '陰井':     4,
  '用戶接管': 3,
};

interface Props {
  layers: Record<string, boolean>;
  activeTab: 'sewage' | 'rain';
}

function MapDataLoader({ layers, activeTab, onData }: Props & {
  onData: (manholes: Manhole[], pipelines: Pipeline[]) => void
}) {
  const timeoutRef = useRef<any>(null);

  const map = useMapEvents({
    moveend() { scheduleLoad(); },
    zoomend() { scheduleLoad(); },
  });

  const scheduleLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(loadData, 400);
  }, [layers, activeTab]);

  const loadData = useCallback(async () => {
    const bounds = map.getBounds();
    const zoom   = map.getZoom();
    if (zoom < 13) { onData([], []); return; }  // Don't load at country-level zoom

    const systemType = activeTab === 'sewage' ? '污水' : '雨水';
    try {
      const res = await fetch(
        `/api/gis/map-data?system_type=${encodeURIComponent(systemType)}` +
        `&min_lat=${bounds.getSouth()}&max_lat=${bounds.getNorth()}` +
        `&min_lng=${bounds.getWest()}&max_lng=${bounds.getEast()}`
      );
      if (!res.ok) return;
      const data = await res.json();
      onData(data.manholes || [], data.pipelines || []);
    } catch {}
  }, [map, layers, activeTab]);

  useEffect(() => { scheduleLoad(); }, [activeTab, layers]);
  useEffect(() => { scheduleLoad(); return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }; }, []);

  return null;
}

export default function SewageMapView({ layers, activeTab }: Props) {
  const [manholes,  setManholes]  = useState<Manhole[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  // Filter by active layers
  const visibleManholes  = manholes.filter(m => {
    const layerKey = Object.entries(SOURCE_LAYER).find(([, s]) => s === m.source)?.[0];
    return layerKey ? layers[layerKey] : layers['mh_main'];
  });

  const visiblePipelines = pipelines.filter(p => {
    const layerKey = Object.entries(SOURCE_LAYER).find(([, s]) => s === p.source)?.[0];
    if (!layerKey) return layers['pl_main'];
    return layers[layerKey];
  });

  return (
    <MapContainer
      center={[24.826, 121.026]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapDataLoader
        layers={layers}
        activeTab={activeTab}
        onData={(mh, pl) => { setManholes(mh); setPipelines(pl); }}
      />

      {/* Manholes */}
      {visibleManholes.map(m => (
        <Circle
          key={`mh-${m.id}`}
          center={[m.lat, m.lng]}
          radius={MH_RADIUS[m.source] ?? 5}
          pathOptions={{
            color: SOURCE_COLOR[m.source] ?? '#6b7280',
            fillColor: SOURCE_COLOR[m.source] ?? '#6b7280',
            fillOpacity: 0.75, weight: 1
          }}
        >
          <Popup>
            <div style={{ fontSize: '0.88rem', minWidth: 180 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: SOURCE_COLOR[m.source] }}>
                {m.source} — {m.manhole_no}
              </div>
              {m.manhole_type && <div><b>類型：</b>{m.manhole_type}</div>}
              {m.depth > 0    && <div><b>深度：</b>{m.depth} m</div>}
              {m.location     && <div style={{ marginTop: 4, fontSize: '0.82rem', color: '#64748b' }}>{m.location}</div>}
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Pipelines */}
      {visiblePipelines.map(p => (
        <Polyline
          key={`pl-${p.id}`}
          positions={p.coords}
          pathOptions={{
            color: SOURCE_COLOR[p.source] ?? '#3b82f6',
            weight: p.source === '巷道連接管' ? 2 : 3,
            opacity: 0.8,
            dashArray: p.source === '巷道連接管' ? '4 3' : undefined,
          }}
        >
          <Popup>
            <div style={{ fontSize: '0.88rem', minWidth: 180 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: SOURCE_COLOR[p.source] }}>
                {p.source} — {p.sewer_no}
              </div>
              {p.material  && <div><b>材質：</b>{p.material}</div>}
              {p.diameter  && <div><b>管徑：</b>{p.diameter} mm</div>}
              {p.length > 0 && <div><b>長度：</b>{p.length} m</div>}
            </div>
          </Popup>
        </Polyline>
      ))}
    </MapContainer>
  );
}
