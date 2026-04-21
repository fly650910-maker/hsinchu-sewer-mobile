'use client';

import { useEffect, useState } from 'react';
import FloodPillarsOverlay, { FloodHotspot } from './FloodPillarsOverlay';

interface Props {
  enabled?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  apiPath?: string;
  refreshInterval?: number;
}

export default function FloodPillarsAutoOverlay({
  enabled = true,
  showLabels = true,
  interactive = true,
  apiPath = '/api/gis/flood-hotspots',
  refreshInterval,
}: Props) {
  const [points, setPoints] = useState<FloodHotspot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(apiPath);
        if (!r.ok) {
          console.warn('[FloodPillarsAutoOverlay] fetch failed:', r.status);
          return;
        }
        const data = await r.json();
        const arr: FloodHotspot[] = Array.isArray(data)
          ? data
          : data.data || data.items || data.hotspots || [];
        if (!cancelled) {
          setPoints(arr);
          setLoaded(true);
        }
      } catch (e) {
        console.warn('[FloodPillarsAutoOverlay] fetch error:', e);
      }
    };
    load();
    if (refreshInterval && refreshInterval > 0) {
      const iv = setInterval(load, refreshInterval);
      return () => {
        cancelled = true;
        clearInterval(iv);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [enabled, apiPath, refreshInterval]);

  if (!loaded) return null;

  return (
    <FloodPillarsOverlay
      points={points}
      enabled={enabled}
      showLabels={showLabels}
      interactive={interactive}
    />
  );
}
