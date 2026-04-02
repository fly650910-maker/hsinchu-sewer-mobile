'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Briefcase, Database, MessageSquareWarning, GitBranch,
  FolderOpen, CircleDot, AlertTriangle, CalendarCheck, CheckCircle2, AlertCircle, PieChart as PieChartIcon,
  Waves, CloudRain, Wind, Thermometer, MapPin, RefreshCw, Home as HomeIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const RISK_COLOR: Record<string, string> = {
  '極高': '#dc2626', '高': '#ea580c', '中': '#d97706', '低': '#16a34a', '未知': '#6b7280',
};
const RISK_BG: Record<string, string> = {
  '極高': 'rgba(220,38,38,0.08)', '高': 'rgba(234,88,12,0.08)', '中': 'rgba(217,119,6,0.08)',
  '低': 'rgba(22,163,74,0.08)', '未知': 'rgba(107,114,128,0.08)',
};

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    }).format(new Date()));
  }, []);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  const loadWeather = () => {
    setWeatherLoading(true);
    setWeatherError(false);
    fetch('/api/weather')
      .then(res => res.json())
      .then(d => {
        if (d.error) { setWeatherError(true); }
        else {
          setWeather(d);
          setWeatherUpdatedAt(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }));
        }
        setWeatherLoading(false);
      })
      .catch(() => { setWeatherError(true); setWeatherLoading(false); });
  };

  useEffect(() => { loadWeather(); }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data.results || []);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);


  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px' }}>
      
      {/* 🔝 頂部推播與全域搜尋 (New Enhancement) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: '1', minWidth: '300px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-muted)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <input 
            type="text" 
            placeholder="全域搜尋 (支援標案名稱、人員、路段...)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
              setShowResults(true);
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = 'none';
              setTimeout(() => setShowResults(false), 200);
            }}
            style={{ 
              width: '100%', padding: '12px 16px 12px 48px', 
              borderRadius: '24px', border: '1px solid var(--glass-border)', 
              backgroundColor: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)',
              fontSize: '1rem', color: 'var(--text-main)', outline: 'none', transition: 'all 0.2s'
            }}
          />
          {showResults && searchQuery.trim().length >= 2 && (
            <div style={{ 
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', 
              backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--glass-border)', zIndex: 50, maxHeight: '400px', overflowY: 'auto'
            }}>
              {isSearching ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>搜尋中...</div>
              ) : searchResults.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {searchResults.map((res: any, idx: number) => (
                    <li key={`${res.type}-${res.id}-${idx}`} style={{ borderBottom: idx !== searchResults.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                      <Link href={res.link} style={{ display: 'block', padding: '12px 16px', textDecoration: 'none', color: 'inherit', transition: 'background-color 0.2s' }} onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = 'transparent'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '8px', backgroundColor: res.type === 'project' ? 'rgba(59, 130, 246, 0.1)' : res.type === 'personnel' ? 'rgba(139, 92, 246, 0.1)' : res.type === 'complaint' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: res.type === 'project' ? '#3b82f6' : res.type === 'personnel' ? '#8b5cf6' : res.type === 'complaint' ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                            {res.type === 'project' ? '標案' : res.type === 'personnel' ? '人員' : res.type === 'complaint' ? '通報' : 'GIS'}
                          </span>
                          <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1rem' }}>{res.title}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{res.desc}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>找不到相關結果</div>
              )}
            </div>
          )}
        </div>
        
        {!loading && data?.stats?.pendingComplaints > 0 && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '12px 24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '8px',
            color: '#ef4444', fontWeight: '600'
          }}>
            <AlertTriangle size={20} />
            <span>目前有 {data.stats.pendingComplaints} 件塞管通報待處理！</span>
            <Link href="/gis" style={{ marginLeft: '12px', padding: '4px 12px', backgroundColor: '#ef4444', color: 'white', borderRadius: '12px', textDecoration: 'none', fontSize: '0.85rem' }}>
              立即處理
            </Link>
          </div>
        )}

        {/* 🆘 應變模式切換 (EMIC Integration) */}
        <div 
          onClick={() => setIsEmergencyMode(!isEmergencyMode)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', 
            borderRadius: '24px', cursor: 'pointer', transition: 'all 0.3s',
            backgroundColor: isEmergencyMode ? 'rgba(220, 38, 38, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            border: `1px solid ${isEmergencyMode ? '#dc2626' : 'var(--glass-border)'}`,
            boxShadow: isEmergencyMode ? '0 0 15px rgba(220, 38, 38, 0.2)' : 'none'
          }}
        >
          <div style={{ 
            width: '40px', height: '22px', borderRadius: '11px', backgroundColor: isEmergencyMode ? '#dc2626' : '#d1d5db', 
            position: 'relative', transition: 'background-color 0.3s' 
          }}>
            <div style={{ 
              width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white',
              position: 'absolute', top: '2px', left: isEmergencyMode ? '20px' : '2px',
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isEmergencyMode ? '#dc2626' : 'var(--text-muted)' }}>
            {isEmergencyMode ? '🚨 應變模式已啟動 (進入 EMIC 狀態)' : '🛡️ 平時模式'}
          </span>
        </div>
      </div>

      {/* Header */}
      <header style={{ marginBottom: '32px', position: 'relative' }}>
        <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: '8px', textAlign: 'left', color: isEmergencyMode ? '#dc2626' : 'inherit' }}>
          {isEmergencyMode ? '🚨 下水道應變指揮中心' : '☕ 早安，科長 👋'}
        </h1>
        <p suppressHydrationWarning style={{ color: isEmergencyMode ? '#ef4444' : 'var(--text-muted)', fontSize: '1.1rem', fontWeight: isEmergencyMode ? '700' : '400' }}>
          {isEmergencyMode ? '目前全縣啟動災情監測與 EMIC 特約案件追蹤' : `今日是 ${today}，以下是各項業務的即時摘要。`}
        </p>
        {isEmergencyMode && (
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', borderRadius: '8px', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>
            EMIC 連線中
          </div>
        )}
      </header>
      
      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ borderLeft: '6px solid var(--primary)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>執行中總標案數</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1' }}>
                {loading ? '-' : data?.stats?.activeProjects}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>件</span>
            </div>
          </div>
          <div style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary)', padding: '16px', borderRadius: '12px' }}>
            <FolderOpen size={32} />
          </div>
        </div>

        <div className="glass-panel" style={{ borderLeft: '6px solid var(--warning)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>待處理塞管通報</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--warning)', lineHeight: '1' }}>
                {loading ? '-' : data?.stats?.pendingBlockages}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>件</span>
            </div>
            {data?.stats?.pendingBlockages > 0 && <p style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '8px', fontWeight: '600' }}><AlertTriangle size={14} style={{display:'inline', marginBottom:'-2px'}}/> 需儘速指派人員清理</p>}
          </div>
          <div style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning)', padding: '16px', borderRadius: '12px' }}>
            <AlertCircle size={32} />
          </div>
        </div>

        <div className="glass-panel" style={{ borderLeft: '6px solid var(--success)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' }}>大新竹管網總資料庫</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--success)', lineHeight: '1' }}>
                {loading ? '-' : data?.stats?.totalPipelines?.toLocaleString()}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>筆圖資</span>
            </div>
          </div>
          <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--success)', padding: '16px', borderRadius: '12px' }}>
            <CircleDot size={32} />
          </div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🚀 快速導航
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <Link href="/personnel" className="glass-panel" style={{ padding: '20px', textDecoration: 'none', borderTop: '4px solid #8b5cf6', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ color: '#8b5cf6', marginBottom: '12px' }}><Users size={32} /></div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>人員管理</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>同仁業務分工一覽</p>
        </Link>
        <Link href="/database" className="glass-panel" style={{ padding: '20px', textDecoration: 'none', borderTop: '4px solid #0891b2', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ color: '#0891b2', marginBottom: '12px' }}><Database size={32} /></div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>下水道資料庫</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>工程卷宗與歷史檔案</p>
        </Link>
        <Link href="/progress" className="glass-panel" style={{ padding: '20px', textDecoration: 'none', borderTop: '4px solid #3b82f6', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ color: '#3b82f6', marginBottom: '12px' }}><Briefcase size={32} /></div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>案件進度</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>工程標案進度追蹤</p>
        </Link>
        <Link href="/stats" className="glass-panel" style={{ padding: '20px', textDecoration: 'none', borderTop: '4px solid #7c3aed', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ color: '#7c3aed', marginBottom: '12px' }}><PieChartIcon size={32} /></div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>管段統計總覽</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>各鄉鎮管線長度圖表分析</p>
        </Link>
        <Link href="/connection" className="glass-panel" style={{ padding: '20px', textDecoration: 'none', borderTop: '4px solid #0ea5e9', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ color: '#0ea5e9', marginBottom: '12px' }}><HomeIcon size={32} /></div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>污水接管查詢</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>依地址查詢是否完成污水下水道接管</p>
        </Link>
        <Link href="/gis" className="glass-panel" style={{ padding: '20px', textDecoration: 'none', borderTop: '4px solid #10b981', transition: 'transform 0.2s', cursor: 'pointer', gridColumn: 'span 2' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ color: '#10b981', marginBottom: '12px' }}><GitBranch size={32} /></div>
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>整合通報功能</div>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>管網與通報圖台 (GIS)</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>整合管線人孔圖資與民眾塞管通報，一鍵定位快速追蹤</p>
        </Link>
      </div>

      {/* Middle Section: Chart and Reminders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '40px', alignItems: 'stretch' }}>
        
        {/* Chart */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChartIcon size={20} color="var(--primary)"/> 標案狀態分佈
          </h3>
          <div style={{ minHeight: '300px' }}>
            {loading ? <p style={{textAlign: 'center', marginTop: '100px', color: 'var(--text-muted)'}}>載入中...</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data?.chartData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(data?.chartData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'var(--text-main)', fontWeight: '600' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.9rem', fontWeight: '500' }}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Reminders list */}
        <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', backgroundColor: 'rgba(255,255,255,0.4)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarCheck size={20} color="var(--warning)"/> 近期防呆與里程碑提醒
            </h3>
            <Link href="/progress" style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
              查看完整標案 &raquo;
            </Link>
          </div>
          <div style={{ padding: '16px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {loading ? <p style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>載入中...</p> : 
              data?.reminders?.map((rem: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', padding: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '12px', backgroundColor: idx === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: idx === 0 ? 'var(--danger)' : 'var(--warning)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: '16px', border: `1px solid ${idx === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '600' }}>注意</span>
                    <AlertCircle size={16} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h4 style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1.05rem' }}>{rem.name}</h4>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary)', fontWeight: '600' }}>{rem.status}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      提醒項目：<span style={{ fontWeight: '700', color: idx === 0 ? 'var(--danger)' : 'var(--warning)' }}>標案進行追蹤中</span>
                    </p>
                  </div>
                  <button style={{ marginLeft: '16px', alignSelf: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--glass-border)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }} title="標示已閱">
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              ))
            }
            {!loading && (!data?.reminders || data.reminders.length === 0) && (
              <p style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>目前無近期防呆事項</p>
            )}
          </div>
        </div>
      </div>

      {/* ☁️ 即時天氣預警區塊 */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <CloudRain size={24} color="#3b82f6" /> 即時天氣預警
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '400' }}>竹北市・新豐鄉・湖口鄉</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {weatherUpdatedAt && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>更新於 {weatherUpdatedAt}</span>}
            <button
              onClick={loadWeather}
              disabled={weatherLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}
            >
              <RefreshCw size={14} style={{ animation: weatherLoading ? 'spin 1s linear infinite' : 'none' }} />
              重新整理
            </button>
          </div>
        </div>

        {weatherLoading && (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            正在向氣象署取得最新資料...
          </div>
        )}

        {weatherError && !weatherLoading && (
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '6px solid #6b7280', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <AlertCircle size={32} color="#6b7280" />
            <div>
              <p style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>無法取得天氣資料</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>請確認 .env.local 中的 CWA_API_KEY 是否設定正確，或稍後再試。</p>
            </div>
          </div>
        )}

        {weather && !weatherLoading && !weatherError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 官方警特報 */}
            {weather.warnings?.length > 0 && (
              <div style={{ padding: '16px 20px', borderRadius: '16px', backgroundColor: 'rgba(220,38,38,0.1)', border: '2px solid #dc2626', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: '800', color: '#dc2626', fontSize: '1.05rem', marginBottom: '6px' }}>⚠️ 中央氣象署已發布警特報</p>
                  {weather.warnings.map((w: any, i: number) => (
                    <div key={i} style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      <strong>{w.phenomenonName}</strong>：{w.content}
                      {w.endTime && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>（有效至 {new Date(w.endTime).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}）</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 整體風險 + 各地區預報 */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', borderLeft: `6px solid ${RISK_COLOR[weather.overallRisk] ?? '#6b7280'}` }}>
              {/* 整體風險標題 */}
              <div style={{ padding: '16px 24px', backgroundColor: RISK_BG[weather.overallRisk] ?? 'transparent', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2px' }}>整體風險</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: RISK_COLOR[weather.overallRisk] ?? '#6b7280' }}>
                    {weather.overallRisk}
                  </div>
                </div>
                <div style={{ height: '48px', width: '1px', backgroundColor: 'var(--glass-border)' }} />
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  {weather.overallRisk === '低' && '目前無明顯降雨，適合安排清淤巡檢作業。'}
                  {weather.overallRisk === '中' && '有降雨機率，建議確認各地下道排水幫浦狀態正常。'}
                  {weather.overallRisk === '高' && '⚡ 降雨機率偏高，請立即確認竹北福興、中和街、湖口大同地下道幫浦運作狀況。'}
                  {weather.overallRisk === '極高' && '🚨 警報等級！請立即啟動防汛應變，重點檢查各地下道與低窪區段，並通知相關人員待命。'}
                  {weather.overallRisk === '未知' && '氣象資料取得中，請稍後重新整理。'}
                </div>
              </div>

              {/* 各地區預報 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0' }}>
                {weather.forecasts?.map((f: any, i: number) => (
                  <div key={i} style={{ padding: '20px', borderRight: i < weather.forecasts.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <MapPin size={14} color="var(--text-muted)" />
                      <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{f.area}</span>
                      <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: RISK_BG[f.riskLevel] ?? 'transparent', color: RISK_COLOR[f.riskLevel] ?? '#6b7280' }}>
                        {f.riskLevel}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <CloudRain size={12} style={{ display: 'inline', marginRight: '4px', marginBottom: '-1px' }} />
                      天氣：{f.weatherDesc}
                    </div>
                    {f.pop6h !== null && (
                      <div style={{ fontSize: '0.85rem', color: f.pop6h >= 60 ? RISK_COLOR['高'] : 'var(--text-muted)' }}>
                        6小時降雨機率：<strong>{f.pop6h}%</strong>
                      </div>
                    )}
                    {f.pop12h !== null && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        12小時降雨機率：<strong>{f.pop12h}%</strong>
                      </div>
                    )}
                    {f.pop6h === null && f.pop12h === null && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>預報資料取得中</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 即時雨量站 */}
            {weather.rainfallStations?.length > 0 && (
              <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', backgroundColor: 'rgba(255,255,255,0.4)', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Waves size={16} color="#3b82f6" />
                  <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>即時雨量觀測站</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                        {['觀測站', '所在鄉鎮', '10分鐘(mm)', '1小時(mm)', '3小時(mm)', '24小時(mm)'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weather.rainfallStations.map((s: any, i: number) => (
                        <tr key={i} style={{ 
                          borderTop: '1px solid var(--glass-border)',
                          backgroundColor: s.rainfall1hr >= 40 ? 'rgba(220, 38, 38, 0.05)' : s.rainfall1hr >= 15 ? 'rgba(245, 158, 11, 0.05)' : 'transparent'
                        }}>
                          <td style={{ padding: '10px 16px', fontWeight: '600', color: 'var(--text-main)' }}>{s.stationName}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{s.area}</td>
                          {[s.rainfall10min, s.rainfall1hr, s.rainfall3hr, s.rainfall24hr].map((v: any, j: number) => {
                            const isExtreme = j === 1 && v >= 40; // 1hr extreme
                            const isHigh = (j === 1 && v >= 15) || (j === 3 && v >= 80); // 1hr high or 24hr high
                            return (
                              <td key={j} style={{ 
                                padding: '10px 16px', 
                                color: isExtreme ? '#dc2626' : isHigh ? '#ea580c' : 'var(--text-main)', 
                                fontWeight: (isExtreme || isHigh) ? '800' : '400',
                                backgroundColor: isExtreme ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
                                borderRadius: isExtreme ? '4px' : '0'
                              }}>
                                {v !== null ? v.toFixed(1) : '-'}
                                {isExtreme && <span style={{ marginLeft: '4px' }}>🚨</span>}
                                {isHigh && !isExtreme && <span style={{ marginLeft: '4px' }}>⚠️</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 歷史淹水熱點提示（高風險時才顯示） */}
            {weather.triggeredHotspots?.length > 0 && (
              <div style={{ padding: '16px 20px', borderRadius: '16px', backgroundColor: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.3)' }}>
                <p style={{ fontWeight: '700', color: '#ea580c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} /> 歷史淹水熱點提醒（請優先巡查）
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {weather.triggeredHotspots.map((h: any, i: number) => (
                    <span key={i} style={{ padding: '4px 12px', borderRadius: '20px', backgroundColor: 'rgba(234,88,12,0.12)', color: '#ea580c', fontSize: '0.85rem', fontWeight: '600', border: '1px solid rgba(234,88,12,0.25)' }}>
                      {h.location}（歷史 {h.event_count} 次）
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      {/* ─────────────────────────────────────────── */}

      {/* Critical Projects List */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📋 列管標案總表 (摘要)
      </h2>
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.4)', borderBottom: '2px solid var(--glass-border)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: '600' }}>主標案名稱 / 附屬合約</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: '600' }}>承辦人</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: '600' }}>目前狀態</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: '600' }}>里程碑</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>載入中...</td></tr>
              ) : data?.criticalProjects?.map((proj: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>{proj.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>廠商：{proj.contractor}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', border: '1px solid var(--glass-border)' }}>
                        {proj.personnel_name ? proj.personnel_name[0] : '？'}
                      </div>
                      <span style={{ fontWeight: '500', color: 'var(--text-main)', fontSize: '0.95rem' }}>{proj.personnel_name || '未指派'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600',
                      backgroundColor: proj.status === '異常' ? 'rgba(239,68,68,0.1)' : proj.status === '保固中' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                      color: proj.status === '異常' ? 'var(--danger)' : proj.status === '保固中' ? 'var(--success)' : 'var(--primary)'
                    }}>{proj.status}</span>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {idx === 0 ? '注意進度落後' : '正常執行中'}
                  </td>
                </tr>
              ))}
              {!loading && (!data?.criticalProjects || data.criticalProjects.length === 0) && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>無列管標案</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <Link href="/progress" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none', fontSize: '0.95rem' }}>查看全部執行中標案 &raquo;</Link>
        </div>
      </div>

    </main>
  );
}
