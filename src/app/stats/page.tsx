'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, GitBranch, Ruler, Map, Layers, Package
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList
} from 'recharts';

interface AreaRow {
  area: string;
  system_type: string;
  pipe_count: number;
  total_km: number;
  avg_m: number;
}
interface Summary {
  total_pipes: number;
  total_km: number;
  area_count: number;
  material_count: number;
  avg_length_m: number;
}
interface Material { material: string; cnt: number; km: number; }
interface Diameter { range: string; cnt: number; km: number; }

const AREA_COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2'];
const TYPE_COLORS: Record<string, string> = { '污水': '#2563eb', '雨水': '#16a34a' };

// 小型橫向進度條（表格內用）
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 10, backgroundColor: 'var(--glass-border)', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 5, transition: 'width 0.6s ease-out' }} />
      </div>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 48, textAlign: 'right' }}>{value} km</span>
    </div>
  );
}

// 摘要卡片
function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ backgroundColor: color, padding: 12, borderRadius: 12, color: 'white', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [rows, setRows] = useState<AreaRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [diameters, setDiameters] = useState<Diameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'bar' | 'table'>('bar');

  useEffect(() => {
    fetch('/api/stats/pipelines')
      .then(r => r.json())
      .then(d => {
        setRows(d.rows || []);
        setSummary(d.summary || null);
        setMaterials(d.materials || []);
        setDiameters(d.diameters || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 合併各 area 的 km（不分 system_type）for bar chart
  const areaAgg = rows.reduce<Record<string, { total_km: number; pipe_count: number; 污水: number; 雨水: number }>>((acc, r) => {
    if (!acc[r.area]) acc[r.area] = { total_km: 0, pipe_count: 0, 污水: 0, 雨水: 0 };
    acc[r.area].total_km = +(acc[r.area].total_km + r.total_km).toFixed(2);
    acc[r.area].pipe_count += r.pipe_count;
    if (r.system_type === '污水') acc[r.area].污水 = r.total_km;
    if (r.system_type === '雨水') acc[r.area].雨水 = r.total_km;
    return acc;
  }, {});
  const barData = Object.entries(areaAgg)
    .map(([area, v]) => ({ area, ...v }))
    .sort((a, b) => b.total_km - a.total_km);

  const maxKm = barData[0]?.total_km ?? 1;

  // 污水 vs 雨水 for pie
  const typeAgg = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.system_type] = (acc[r.system_type] ?? 0) + r.total_km;
    return acc;
  }, {});
  const pieData = Object.entries(typeAgg).map(([name, value]) => ({ name, value: +value.toFixed(2) }));

  const matMax = materials[0]?.km ?? 1;
  const diaMax = diameters.reduce((s, d) => s + d.km, 0);

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

      {/* 頁首 */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Link href="/" style={{ padding: 8, backgroundColor: 'var(--glass-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
          <ArrowLeft size={24} color="var(--primary)" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ backgroundColor: '#7c3aed', padding: 10, borderRadius: 12, color: 'white' }}>
            <GitBranch size={28} />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              管段統計總覽
            </h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>各管區長度分析 · 全縣下水道管線統計</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>資料載入中...</div>
      ) : (
        <>
          {/* ── 摘要卡片 ── */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
              <StatCard icon={<GitBranch size={24}/>} label="全縣管段總數" value={summary.total_pipes.toLocaleString()} sub="條管段" color="#2563eb" />
              <StatCard icon={<Ruler size={24}/>} label="全縣管線總長" value={`${summary.total_km.toLocaleString()} km`} sub={`平均每段 ${summary.avg_length_m} m`} color="#7c3aed" />
              <StatCard icon={<Map size={24}/>} label="管區數量" value={`${summary.area_count} 個`} sub="管理分區" color="#d97706" />
              <StatCard icon={<Package size={24}/>} label="管材種類" value={`${summary.material_count} 種`} sub="不同管材" color="#16a34a" />
            </div>
          )}

          {/* ── 主圖區：長條圖 + 圓餅圖 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>

            {/* 橫向長條圖：各管區長度 */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="#7c3aed" /> 各管區管線長度（km）
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} layout="vertical" margin={{ left: 16, right: 40, top: 4, bottom: 4 }}>
                  <XAxis type="number" unit=" km" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="area" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} km`, '管線長度']} />
                  <Bar dataKey="total_km" radius={[0, 6, 6, 0]} barSize={24}>
                    <LabelList dataKey="total_km" position="right" formatter={(v) => `${v} km`} style={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    {barData.map((_, i) => (
                      <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 圓餅圖：污水 vs 雨水 */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="#2563eb" /> 系統類型佔比
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={TYPE_COLORS[entry.name] ?? '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} km`, '管線長度']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              {/* 文字補充 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ textAlign: 'center', padding: '8px', borderRadius: 8, backgroundColor: 'var(--bg-color)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.name}下水道</div>
                    <div style={{ fontWeight: 700, color: TYPE_COLORS[d.name] ?? '#6b7280' }}>{d.value} km</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 切換：詳細表格 / 管材統計 ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['bar', 'table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--glass-border)', backgroundColor: view === v ? '#7c3aed' : 'transparent', color: view === v ? 'white' : 'var(--text-main)', fontWeight: view === v ? 600 : 400, cursor: 'pointer' }}>
                {v === 'bar' ? '📊 管材分析' : '📋 管區明細表'}
              </button>
            ))}
          </div>

          {view === 'table' ? (
            /* ── 管區明細表（含內嵌進度條）── */
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(124,58,237,0.06)', borderBottom: '2px solid var(--glass-border)' }}>
                      {['管區', '類型', '管段數', '總長（km）', '佔全縣比例', '平均段長（m）'].map(h => (
                        <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}
                        onMouseOver={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)')}
                        onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: AREA_COLORS[i % AREA_COLORS.length], marginRight: 8 }} />
                          {r.area}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, backgroundColor: TYPE_COLORS[r.system_type] ? TYPE_COLORS[r.system_type] + '20' : '#6b728020', color: TYPE_COLORS[r.system_type] ?? '#6b7280' }}>
                            {r.system_type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-main)' }}>{r.pipe_count.toLocaleString()}</td>
                        <td style={{ padding: '14px 20px', minWidth: 200 }}>
                          <MiniBar value={r.total_km} max={maxKm} color={AREA_COLORS[i % AREA_COLORS.length]} />
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                          {summary ? `${((r.total_km / summary.total_km) * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{r.avg_m} m</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* 全縣合計列 */}
                  {summary && (
                    <tfoot>
                      <tr style={{ backgroundColor: 'rgba(124,58,237,0.06)', borderTop: '2px solid #7c3aed' }}>
                        <td colSpan={2} style={{ padding: '14px 20px', fontWeight: 700, color: '#7c3aed' }}>🏳️ 全縣合計</td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: '#7c3aed' }}>{summary.total_pipes.toLocaleString()}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 10, backgroundColor: '#7c3aed22', borderRadius: 5 }}>
                              <div style={{ height: '100%', width: '100%', backgroundColor: '#7c3aed', borderRadius: 5 }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', minWidth: 60 }}>{summary.total_km} km</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: '#7c3aed' }}>100%</td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{summary.avg_length_m} m</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            /* ── 管材 + 管徑 分析 ── */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

              {/* 管材分析 */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={18} color="#d97706" /> 管材種類分佈（km）
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {materials.map((m, i) => (
                    <div key={m.material}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.material || '未標示'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{m.cnt.toLocaleString()} 條 · {m.km} km</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: 'var(--glass-border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(m.km / matMax) * 100}%`, backgroundColor: AREA_COLORS[i % AREA_COLORS.length], borderRadius: 4, transition: 'width 0.6s ease-out' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 管徑分佈 */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ruler size={18} color="#dc2626" /> 管徑等級分佈（km）
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {diameters.map((d, i) => {
                    const pct = diaMax > 0 ? (d.km / diaMax) * 100 : 0;
                    return (
                      <div key={d.range} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 130, fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500 }}>{d.range}</div>
                        <div style={{ flex: 1, height: 22, backgroundColor: 'var(--glass-border)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: ['#2563eb','#16a34a','#d97706','#dc2626'][i] ?? '#6b7280', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, transition: 'width 0.6s ease-out' }}>
                            {pct > 15 && <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>{d.km} km</span>}
                          </div>
                          {pct <= 15 && <span style={{ position: 'absolute', left: `${pct + 2}%`, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.km} km</span>}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: 50 }}>{d.cnt.toLocaleString()} 條</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 20, padding: '12px 16px', backgroundColor: 'var(--bg-color)', borderRadius: 8, border: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  全縣管徑分佈總計 <strong style={{ color: 'var(--text-main)' }}>{diaMax.toFixed(2)} km</strong>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
