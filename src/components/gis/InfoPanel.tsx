'use client';

/**
 * InfoPanel
 *
 * 右側 320px 資訊密度面板。包含 4 個區塊:
 *   1. 視窗內統計 (人孔/管線/淹水熱區/待處理通報)
 *   2. 最近通報 (5 筆最新,連到通報系統)
 *   3. 7 個月趨勢 (長條圖)
 *   4. 快速動作 (新增通報/定位/查接管/截圖)
 *
 * 所有資料從 /api/gis/flood-hotspots + /api/reports + /api/gis/stats 抓取。
 * 如果這些 API 不存在,會 gracefully 顯示 "-"。
 *
 * Usage:
 *   <InfoPanel />    // 加在 page.tsx 任何位置即可 (不必在 MapContainer 內)
 *
 * 移除: 刪掉那一行 JSX,恢復原本全寬地圖。
 */

import { useEffect, useRef, useState } from 'react';

type Report = {
  id: number;
  description?: string;
  address?: string;
  status?: string;
  reported_at?: string;
};

interface Props {
  enabled?: boolean;
  /** top offset in px, 預設 252 避開「定位 / 查接管」按鈕。大螢幕可以設 160 以上 */
  topOffset?: number;
}

export default function InfoPanel({ enabled = true, topOffset = 252 }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [floodCount, setFloodCount] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const triggeredResize = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 拉通報資料 (若 API 不存在, reports 保持空陣列 → 顯示 "-")
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const candidates = ['/api/reports', '/api/gis/reports', '/api/notifications'];
    (async () => {
      for (const url of candidates) {
        try {
          const r = await fetch(url, { signal: controller.signal });
          if (!r.ok) continue;
          const data = await r.json();
          const arr: Report[] = Array.isArray(data) ? data : (data.reports || data.data || data.items || []);
          if (arr.length > 0) {
            setReports(arr);
            return;
          }
        } catch {}
      }
    })();
    return () => controller.abort();
  }, [enabled]);

  // 拉淹水熱區數
  useEffect(() => {
    if (!enabled) return;
    fetch('/api/gis/flood-hotspots')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const arr = Array.isArray(data) ? data : (data.hotspots || data.data || data.items || []);
        setFloodCount(arr.length);
      })
      .catch(() => {});
  }, [enabled]);

  // panel 顯示後,觸發 window resize 讓 Leaflet 重新計算 map 寬度
  useEffect(() => {
    if (!enabled || !mounted) return;
    if (triggeredResize.current) return;
    triggeredResize.current = true;
    const t1 = setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    const t2 = setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [enabled, mounted]);

  if (!enabled || !mounted) return null;

  // ─── 計算 ───
  const pending = reports.filter((r) => r.status === '待處理' || r.status === 'pending').length;
  const sortedReports = [...reports].sort((a, b) => (b.reported_at || '').localeCompare(a.reported_at || ''));
  const recent5 = sortedReports.slice(0, 5);

  // 最近 7 個月趨勢
  const monthCounts: Record<string, number> = {};
  reports.forEach((r) => {
    if (r.reported_at) {
      const ym = r.reported_at.slice(0, 7);
      monthCounts[ym] = (monthCounts[ym] || 0) + 1;
    }
  });
  const months = Object.keys(monthCounts).sort();
  const last7months = months.slice(-7);
  const trendData = last7months.map((m) => ({ month: m, count: monthCounts[m] }));
  const maxCount = Math.max(...trendData.map((d) => d.count), 1);

  // 視窗內統計 - 沒有專用 API,這裡用預估
  // 可以進階方式: 透過 window.__GIS_STATS__ 讓 page.tsx 主動曝露真實 state (未實作)
  const manholeCount = (window as any).__GIS_MANHOLE_COUNT__ ?? '-';
  const pipelineCount = (window as any).__GIS_PIPELINE_COUNT__ ?? '-';

  const statusKind = (s?: string) => (s === '待處理' || s === 'pending' ? 'pending' : 'done');
  const statusLabel = (s?: string) => (s === '待處理' || s === 'pending' ? '待處理' : '已完成');
  const formatDate = (s?: string) => (s ? s.slice(5, 10).replace('-', '/') : '-');

  return (
    <>
      <style jsx global>{`
        :root {
          --ip-bg: #FFFFFF;
          --ip-bg-soft: #F8FAFC;
          --ip-bg-sunken: #F1F5F9;
          --ip-border: #E2E8F0;
          --ip-border-soft: #EFF2F6;
          --ip-tx-0: #0F172A;
          --ip-tx-1: #475569;
          --ip-tx-2: #94A3B8;
          --ip-tx-3: #CBD5E1;
          --ip-accent: #5E6AD2;
          --ip-accent-tint: #EEF0FE;
          --ip-ok: #10B981;
          --ip-warn: #F59E0B;
          --ip-alert: #EF4444;
          --ip-info: #3B82F6;
          --ip-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
        }
        body.infopanel-open .leaflet-container {
          width: calc(100% - 320px) !important;
        }
        #ip-root {
          position: fixed;
          right: 0;
          top: var(--ip-top);
          bottom: 0;
          width: 320px;
          background: var(--ip-bg);
          border-left: 1px solid var(--ip-border);
          overflow-y: auto;
          overflow-x: hidden;
          font-family: -apple-system, 'Noto Sans TC', system-ui, sans-serif;
          color: var(--ip-tx-0);
          z-index: 500;
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
        }
        #ip-root::-webkit-scrollbar { width: 6px; }
        #ip-root::-webkit-scrollbar-thumb { background: var(--ip-tx-3); border-radius: 3px; }
        .ip-section {
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--ip-border-soft);
        }
        .ip-section:last-child { border-bottom: none; }
        .ip-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .ip-section-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 600;
          color: var(--ip-tx-1);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ip-section-title-icon { opacity: 0.7; display: flex; }
        .ip-section-action {
          font-size: 11px;
          color: var(--ip-tx-2);
          padding: 2px 8px;
          border-radius: 4px;
          cursor: pointer;
          background: transparent;
          border: none;
          font-family: inherit;
        }
        .ip-section-action:hover { background: var(--ip-bg-sunken); color: var(--ip-tx-0); }
        .ip-stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .ip-stat-card {
          padding: 10px 12px;
          background: var(--ip-bg-soft);
          border: 1px solid var(--ip-border-soft);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ip-stat-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .ip-stat-n {
          font-family: var(--ip-mono);
          font-size: 22px;
          font-weight: 700;
          color: var(--ip-tx-0);
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .ip-stat-unit {
          font-size: 10px;
          color: var(--ip-tx-2);
        }
        .ip-stat-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--ip-tx-1);
        }
        .ip-stat-dot { width: 7px; height: 7px; border-radius: 50%; }
        .ip-report {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 9px 10px;
          border-left: 3px solid var(--rc);
          background: var(--rc-bg);
          border-radius: 6px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ip-report:hover { transform: translateX(2px); }
        .ip-report:last-child { margin-bottom: 0; }
        .ip-report[data-s="pending"] { --rc: var(--ip-warn); --rc-bg: #FFFBEB; }
        .ip-report[data-s="done"] { --rc: var(--ip-ok); --rc-bg: #F0FDF4; }
        .ip-report-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .ip-report-desc {
          font-size: 13px;
          font-weight: 500;
          color: var(--ip-tx-0);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }
        .ip-report-status {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: 10px;
          flex-shrink: 0;
          background: var(--rc);
          color: #fff;
        }
        .ip-report[data-s="done"] .ip-report-status { opacity: 0.75; }
        .ip-report-addr {
          font-size: 11px;
          color: var(--ip-tx-1);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ip-report-meta {
          display: flex;
          justify-content: space-between;
          font-family: var(--ip-mono);
          font-size: 10px;
          color: var(--ip-tx-2);
          margin-top: 1px;
        }
        .ip-trend-wrap { padding: 6px 2px 2px; }
        .ip-trend-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--ip-mono);
          font-size: 10px;
          color: var(--ip-tx-2);
          margin-bottom: 6px;
        }
        .ip-trend-row-l { color: var(--ip-tx-1); font-weight: 500; }
        .ip-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 52px;
          padding: 2px;
          margin-bottom: 6px;
        }
        .ip-bar {
          flex: 1;
          background: var(--ip-accent-tint);
          border-radius: 2px 2px 0 0;
          position: relative;
          transition: all 0.15s;
          min-height: 4px;
        }
        .ip-bar.max { background: var(--ip-accent); }
        .ip-bar:hover { background: var(--ip-accent); }
        .ip-bars-labels {
          display: flex;
          justify-content: space-between;
          font-family: var(--ip-mono);
          font-size: 9px;
          color: var(--ip-tx-2);
        }
        .ip-quick-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .ip-quick-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          background: var(--ip-bg-soft);
          border: 1px solid var(--ip-border-soft);
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
          color: var(--ip-tx-0);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.12s;
        }
        .ip-quick-btn:hover {
          background: var(--ip-accent-tint);
          border-color: var(--ip-accent);
          color: var(--ip-accent);
        }
        .ip-quick-btn.primary {
          background: var(--ip-accent);
          color: #fff;
          border-color: var(--ip-accent);
        }
        .ip-quick-btn.primary:hover { background: #4F5AC0; }
        .ip-quick-icon { display: flex; flex-shrink: 0; }
        .ip-empty {
          padding: 20px 0;
          text-align: center;
          font-size: 12px;
          color: var(--ip-tx-2);
        }
      `}</style>

      <BodyClassToggle />
      <div id="ip-root" style={{ ['--ip-top' as any]: `${topOffset}px` } as any}>
        {/* ─── 區塊 1: 視窗內統計 ─── */}
        <div className="ip-section">
          <div className="ip-section-head">
            <div className="ip-section-title">
              <span className="ip-section-title-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M7 15l4-4 4 4 6-6" />
                </svg>
              </span>
              視窗內統計
            </div>
          </div>
          <div className="ip-stat-grid">
            <StatCard value={manholeCount} unit="座" label="人孔" dotColor="#8B5CF6" />
            <StatCard value={pipelineCount} unit="段" label="管線" dotColor="#3B82F6" />
            <StatCard value={floodCount} unit="處" label="淹水熱區" dotColor="#F59E0B" />
            <StatCard value={pending} unit="筆" label="待處理通報" dotColor="var(--ip-warn)" valueColor="var(--ip-warn)" />
          </div>
        </div>

        {/* ─── 區塊 2: 最近通報 ─── */}
        <div className="ip-section">
          <div className="ip-section-head">
            <div className="ip-section-title">
              <span className="ip-section-title-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </span>
              最近通報 · {reports.length.toLocaleString()} 筆
            </div>
            <button className="ip-section-action">看全部</button>
          </div>
          {recent5.length === 0 ? (
            <div className="ip-empty">尚無通報資料</div>
          ) : (
            recent5.map((r) => (
              <div key={r.id} className="ip-report" data-s={statusKind(r.status)}>
                <div className="ip-report-top">
                  <span className="ip-report-desc">{(r.description || '(無描述)').slice(0, 24)}</span>
                  <span className="ip-report-status">{statusLabel(r.status)}</span>
                </div>
                <div className="ip-report-addr">📍 {(r.address || '-').slice(0, 22)}</div>
                <div className="ip-report-meta">
                  <span>{formatDate(r.reported_at)}</span>
                  <span>#{r.id}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ─── 區塊 3: 7 個月趨勢 ─── */}
        <div className="ip-section">
          <div className="ip-section-head">
            <div className="ip-section-title">
              <span className="ip-section-title-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </span>
              7 個月趨勢
            </div>
          </div>
          {trendData.length === 0 ? (
            <div className="ip-empty">無月份資料</div>
          ) : (
            <div className="ip-trend-wrap">
              <div className="ip-trend-row">
                <span className="ip-trend-row-l">通報數 (最高 {maxCount})</span>
                <span>總 {reports.length}</span>
              </div>
              <div className="ip-bars">
                {trendData.map((d) => (
                  <div
                    key={d.month}
                    className={`ip-bar${d.count === maxCount ? ' max' : ''}`}
                    style={{ height: `${Math.max(4, (d.count / maxCount) * 52)}px` }}
                    title={`${d.month}: ${d.count} 筆`}
                  />
                ))}
              </div>
              <div className="ip-bars-labels">
                {trendData.map((d) => (
                  <span key={d.month}>{d.month.slice(5)}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── 區塊 4: 快速動作 ─── */}
        <div className="ip-section">
          <div className="ip-section-head">
            <div className="ip-section-title">
              <span className="ip-section-title-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </span>
              快速動作
            </div>
          </div>
          <div className="ip-quick-grid">
            <button className="ip-quick-btn primary">
              <span className="ip-quick-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              新增通報
            </button>
            <button className="ip-quick-btn">
              <span className="ip-quick-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              定位
            </button>
            <button className="ip-quick-btn">
              <span className="ip-quick-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </span>
              查接管
            </button>
            <button className="ip-quick-btn">
              <span className="ip-quick-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
              截圖
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({
  value,
  unit,
  label,
  dotColor,
  valueColor,
}: {
  value: number | string;
  unit: string;
  label: string;
  dotColor: string;
  valueColor?: string;
}) {
  const displayValue =
    typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div className="ip-stat-card">
      <div className="ip-stat-row">
        <span className="ip-stat-n" style={valueColor ? { color: valueColor } : undefined}>
          {displayValue}
        </span>
        <span className="ip-stat-unit">{unit}</span>
      </div>
      <div className="ip-stat-label">
        <span className="ip-stat-dot" style={{ background: dotColor }} />
        {label}
      </div>
    </div>
  );
}

// 切換 body 的 .infopanel-open class,讓 CSS 可以縮窄地圖
function BodyClassToggle() {
  useEffect(() => {
    document.body.classList.add('infopanel-open');
    return () => {
      document.body.classList.remove('infopanel-open');
    };
  }, []);
  return null;
}
