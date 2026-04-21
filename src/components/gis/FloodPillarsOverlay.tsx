'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

export type FloodHotspot = {
  id: number | string;
  location: string;
  town?: string;
  lat: number;
  lng: number;
  description?: string;
  years?: string;
  event_count?: number;
  source?: string;
};

type ScreenPos = { x: number; y: number; visible: boolean };

interface Props {
  points: FloodHotspot[];
  enabled?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
}

export default function FloodPillarsOverlay({
  points,
  enabled = true,
  showLabels = true,
  interactive = true,
}: Props) {
  const map = useMap();
  const [positions, setPositions] = useState<Record<string, ScreenPos>>({});
  const [selected, setSelected] = useState<FloodHotspot | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentYear = new Date().getFullYear();

  const styled = useMemo(() => {
    return points.map((p) => {
      const count = Math.max(1, p.event_count ?? 1);
      const height = Math.min(120, 40 + count * 9);
      let latestYear = 0;
      if (p.years) {
        const yrs = p.years.split(/[,，、;；\s]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 1900);
        latestYear = Math.max(0, ...yrs);
      }
      const yearsAgo = latestYear ? currentYear - latestYear : 99;
      let color: string;
      if (yearsAgo <= 1) color = '#EF4444';
      else if (yearsAgo <= 2) color = '#F97316';
      else if (yearsAgo <= 4) color = '#F59E0B';
      else color = '#FCD34D';
      return { point: p, height, color, latestYear, yearsAgo };
    });
  }, [points, currentYear]);

  const recompute = () => {
    if (!map) return;
    const next: Record<string, ScreenPos> = {};
    const bounds = map.getBounds();
    styled.forEach(({ point: p }) => {
      const inBounds = bounds.contains([p.lat, p.lng]);
      const pt = map.latLngToContainerPoint([p.lat, p.lng]);
      next[String(p.id)] = { x: pt.x, y: pt.y, visible: inBounds };
    });
    setPositions(next);
  };

  const scheduleRecompute = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      recompute();
      rafRef.current = null;
    });
  };

  useEffect(() => {
    if (!map || !enabled) return;
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled, styled]);

  useMapEvents({
    move: scheduleRecompute,
    zoom: scheduleRecompute,
    zoomend: scheduleRecompute,
    moveend: scheduleRecompute,
    resize: scheduleRecompute,
  });

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!enabled || !map) return null;

  const container = map.getContainer();
  const width = container.offsetWidth;
  const height = container.offsetHeight;

  return (
    <>
      <style jsx global>{`
        .fpo-layer { position: absolute; inset: 0; z-index: 450; overflow: hidden; pointer-events: none; }
        .fpo-pillar { position: absolute; transform: translate(-50%, -50%); pointer-events: ${interactive ? 'auto' : 'none'}; cursor: ${interactive ? 'pointer' : 'default'}; will-change: transform; transition: filter 0.18s ease; }
        .fpo-pillar:hover { filter: brightness(1.15); }
        .fpo-base { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; transform: translate(-50%, -50%); background: radial-gradient(circle, var(--fpo-a) 0%, transparent 60%); border-radius: 50%; opacity: 0.55; animation: fpo-ring 2.6s ease-in-out infinite; }
        .fpo-column { position: absolute; left: 50%; top: 50%; width: 14px; height: var(--fpo-h); transform: translate(-50%, calc(-100% + 4px)); background: linear-gradient(180deg, var(--fpo-c) 0%, var(--fpo-b) 45%, transparent 100%); border-radius: 7px 7px 2px 2px; box-shadow: 0 0 calc(var(--fpo-h) * 0.3) var(--fpo-b); animation: fpo-pulse 2.4s ease-in-out infinite; }
        .fpo-column::before { content: ''; position: absolute; top: -3px; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; background: var(--fpo-c); border-radius: 50%; box-shadow: 0 0 12px var(--fpo-c); }
        .fpo-badge { position: absolute; top: -10px; right: -8px; min-width: 18px; height: 18px; padding: 0 5px; display: flex; align-items: center; justify-content: center; background: var(--fpo-c); color: #fff; font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace; font-size: 10px; font-weight: 700; border-radius: 9px; box-shadow: 0 0 8px var(--fpo-b); border: 1.5px solid rgba(255,255,255,0.9); }
        .fpo-label { position: absolute; left: 50%; bottom: calc(var(--fpo-h) + 14px); transform: translateX(-50%); padding: 3px 8px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(6px); color: #fff; font-family: -apple-system, 'Noto Sans TC', system-ui, sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 0.01em; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); pointer-events: none; }
        .fpo-label::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 4px solid transparent; border-top-color: rgba(15, 23, 42, 0.88); }
        @keyframes fpo-pulse { 0%, 100% { box-shadow: 0 0 calc(var(--fpo-h) * 0.3) var(--fpo-b); transform: translate(-50%, calc(-100% + 4px)) scaleY(1); } 50% { box-shadow: 0 0 calc(var(--fpo-h) * 0.55) var(--fpo-c); transform: translate(-50%, calc(-100% + 4px)) scaleY(1.05); } }
        @keyframes fpo-ring { 0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.75; transform: translate(-50%, -50%) scale(1.3); } }
        .fpo-popup { position: absolute; z-index: 600; min-width: 240px; max-width: 320px; background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(14px) saturate(180%); color: #F1F5F9; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,0.45); padding: 14px 16px; font-family: -apple-system, 'Noto Sans TC', system-ui, sans-serif; font-size: 12px; pointer-events: auto; animation: fpo-popin 0.18s cubic-bezier(0.32, 0.72, 0, 1); }
        @keyframes fpo-popin { from { opacity: 0; transform: translate(-50%, calc(-100% - 10px)) scale(0.92); } to { opacity: 1; transform: translate(-50%, calc(-100% - 16px)) scale(1); } }
        .fpo-popup-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .fpo-popup-title { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: #F1F5F9; }
        .fpo-popup-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--fpo-c); box-shadow: 0 0 6px var(--fpo-b); }
        .fpo-popup-close { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: #94A3B8; font-size: 16px; border-radius: 4px; cursor: pointer; }
        .fpo-popup-close:hover { background: rgba(148,163,184,0.15); color: #F1F5F9; }
        .fpo-popup-row { display: flex; gap: 8px; padding: 4px 0; font-size: 11.5px; line-height: 1.4; }
        .fpo-popup-k { min-width: 48px; color: #64748B; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; padding-top: 1px; }
        .fpo-popup-v { color: #E2E8F0; flex: 1; }
        .fpo-popup-years { display: inline-flex; flex-wrap: wrap; gap: 4px; }
        .fpo-popup-year-chip { padding: 1px 6px; background: rgba(148, 163, 184, 0.15); border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #CBD5E1; }
        .fpo-popup-year-chip.recent { background: var(--fpo-b); color: #fff; font-weight: 600; }
      `}</style>

      <div className="fpo-layer" style={{ width, height }} aria-hidden>
        {styled.map(({ point: p, height: h, color }) => {
          const pos = positions[String(p.id)];
          if (!pos || !pos.visible) return null;
          const a = hexToRgba(color, 0.35);
          const b = hexToRgba(color, 0.7);
          return (
            <div
              key={p.id}
              className="fpo-pillar"
              style={{ left: `${pos.x}px`, top: `${pos.y}px`, '--fpo-c': color, '--fpo-a': a, '--fpo-b': b, '--fpo-h': `${h}px` } as React.CSSProperties}
              onClick={(e) => { if (!interactive) return; e.stopPropagation(); setSelected(selected?.id === p.id ? null : p); }}
              title={`${p.location} (${p.event_count ?? '?'} 次)`}
            >
              <div className="fpo-base" />
              <div className="fpo-column">
                {(p.event_count ?? 0) > 1 && <div className="fpo-badge">{p.event_count}</div>}
              </div>
              {showLabels && <div className="fpo-label">{p.location}</div>}
            </div>
          );
        })}

        {selected && positions[String(selected.id)]?.visible && (
          <FloodPopup
            point={selected}
            pos={positions[String(selected.id)]}
            style={styled.find((s) => s.point.id === selected.id)!}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </>
  );
}

function FloodPopup({ point, pos, style, onClose }: { point: FloodHotspot; pos: ScreenPos; style: { color: string; height: number }; onClose: () => void; }) {
  const years = (point.years || '').split(/[,，、;；\s]+/).map((y) => parseInt(y.trim(), 10)).filter((n) => !isNaN(n)).sort((a, b) => b - a);
  const b = hexToRgba(style.color, 0.7);
  return (
    <div
      className="fpo-popup"
      style={{ left: `${pos.x}px`, top: `${pos.y - style.height - 16}px`, transform: 'translate(-50%, calc(-100% - 16px))', '--fpo-c': style.color, '--fpo-b': b } as React.CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="fpo-popup-head">
        <div className="fpo-popup-title">
          <span className="fpo-popup-dot" />
          <span>{point.location}</span>
        </div>
        <button className="fpo-popup-close" onClick={onClose} aria-label="關閉">×</button>
      </div>
      {point.town && (<div className="fpo-popup-row"><span className="fpo-popup-k">區域</span><span className="fpo-popup-v">{point.town}</span></div>)}
      {point.description && (<div className="fpo-popup-row"><span className="fpo-popup-k">說明</span><span className="fpo-popup-v">{point.description}</span></div>)}
      {years.length > 0 && (
        <div className="fpo-popup-row">
          <span className="fpo-popup-k">歷年</span>
          <span className="fpo-popup-v fpo-popup-years">
            {years.map((y, i) => (<span key={y} className={`fpo-popup-year-chip${i === 0 ? ' recent' : ''}`}>{y}</span>))}
          </span>
        </div>
      )}
      {point.event_count != null && (<div className="fpo-popup-row"><span className="fpo-popup-k">次數</span><span className="fpo-popup-v">{point.event_count} 次淹水事件</span></div>)}
      {point.source && (<div className="fpo-popup-row"><span className="fpo-popup-k">來源</span><span className="fpo-popup-v" style={{ color: '#94A3B8', fontSize: 10 }}>{point.source}</span></div>)}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
