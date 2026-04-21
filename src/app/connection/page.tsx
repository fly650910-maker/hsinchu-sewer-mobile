'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, CheckCircle2, XCircle, MapPin, Home, Loader2, ClipboardList } from 'lucide-react';

interface ConnectionRecord {
  id: number;
  water_no: string;
  source: string;
  usage_addr: string;
  delivery_addr: string;
  sheet: string;
  postal_code: string;
}

interface QueryResult {
  connected: boolean;
  count: number;
  total: number;
  records: ConnectionRecord[];
  query: string;
  input: string;
}

export default function ConnectionPage() {
  const [addr, setAddr] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const doSearch = useCallback(async (value: string) => {
    if (value.trim().length < 3) { setResult(null); setError(''); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/gis/check-connection?addr=${encodeURIComponent(value.trim())}`);
      if (!res.ok) throw new Error('查詢失敗');
      const data: QueryResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? '查詢失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (v: string) => {
    setAddr(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(addr);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f9ff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <Home size={20} color="white" />
        <div>
          <div style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>污水下水道接管查詢</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>新竹縣下水道科管理系統</div>
        </div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 16px' }}>

        {/* 說明 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e0f2fe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ClipboardList size={18} color="#0ea5e9" />
            <span style={{ fontWeight: '700', color: '#0c4a6e', fontSize: '0.95rem' }}>如何查詢？</span>
          </div>
          <div style={{ color: '#475569', fontSize: '0.85rem', lineHeight: '1.7' }}>
            輸入完整或部分地址（至少 3 個字），系統會自動比對接管資料庫。<br />
            例如：<span style={{ background: '#f0f9ff', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', color: '#0369a1' }}>縣政二路237號</span>　或　<span style={{ background: '#f0f9ff', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', color: '#0369a1' }}>嘉豐五路</span>
          </div>
        </div>

        {/* 搜尋框 */}
        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={addr}
              onChange={e => handleChange(e.target.value)}
              placeholder="輸入地址查詢接管狀況…"
              autoFocus
              style={{
                width: '100%', padding: '16px 120px 16px 48px', borderRadius: '14px',
                border: '2px solid #bae6fd', fontSize: '1rem', outline: 'none',
                boxSizing: 'border-box', background: 'white',
                boxShadow: '0 4px 16px rgba(14,165,233,0.1)',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#bae6fd'; }}
            />
            <button
              type="submit"
              disabled={loading || addr.trim().length < 3}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                padding: '8px 18px', borderRadius: '10px', border: 'none',
                backgroundColor: addr.trim().length >= 3 ? '#0ea5e9' : '#cbd5e1',
                color: 'white', fontWeight: '700', fontSize: '0.88rem', cursor: addr.trim().length >= 3 ? 'pointer' : 'default',
                transition: 'background 0.2s',
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : '查詢'}
            </button>
          </div>
        </form>

        {/* 結果區 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
            <Loader2 size={32} color="#0ea5e9" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <div style={{ fontSize: '0.9rem' }}>查詢中…</div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', color: '#dc2626', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && result && (
          <>
            {/* 主要結果卡 */}
            <div style={{
              background: result.connected ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: `2px solid ${result.connected ? '#86efac' : '#fca5a5'}`,
              borderRadius: '16px', padding: '24px', marginBottom: '20px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                {result.connected
                  ? <CheckCircle2 size={32} color="#16a34a" />
                  : <XCircle size={32} color="#dc2626" />
                }
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1.25rem', color: result.connected ? '#14532d' : '#7f1d1d' }}>
                    {result.connected ? '✅ 已接管' : '❌ 查無接管記錄'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: result.connected ? '#166534' : '#991b1b', marginTop: '2px' }}>
                    {result.connected
                      ? `找到 ${result.total} 筆符合記錄，查詢關鍵字：「${result.query}」`
                      : `查無符合「${result.input}」的接管資料`
                    }
                  </div>
                </div>
              </div>
              {!result.connected && (
                <div style={{ fontSize: '0.82rem', color: '#b91c1c', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #fecaca' }}>
                  若確認地址正確仍查無資料，可能尚未完成接管申請或資料尚未建檔，請洽下水道科窗口確認。
                </div>
              )}
            </div>

            {/* 詳細記錄清單 */}
            {result.records.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  📋 接管記錄明細（顯示 {result.records.length} / {result.total} 筆）
                </div>
                {result.records.map((rec, i) => (
                  <div key={rec.id} style={{
                    background: 'white', borderRadius: '12px', padding: '14px 16px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ background: '#0ea5e9', color: 'white', borderRadius: '6px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: '700' }}>
                            {rec.source || '接管'}
                          </span>
                          {rec.water_no && (
                            <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: '6px', padding: '1px 8px', fontSize: '0.72rem' }}>
                              水號：{rec.water_no}
                            </span>
                          )}
                          {rec.sheet && (
                            <span style={{ background: '#f8fafc', color: '#94a3b8', borderRadius: '6px', padding: '1px 8px', fontSize: '0.68rem' }}>
                              圖幅：{rec.sheet}
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem', marginBottom: rec.delivery_addr ? '2px' : 0 }}>
                          <MapPin size={13} color="#0ea5e9" style={{ display: 'inline', marginBottom: '-2px', marginRight: '3px' }} />
                          {rec.usage_addr || '—'}
                        </div>
                        {rec.delivery_addr && rec.delivery_addr !== rec.usage_addr && (
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            送達地址：{rec.delivery_addr}
                          </div>
                        )}
                      </div>
                      <a
                        href={`/gis?addr=${encodeURIComponent(rec.usage_addr || '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flexShrink: 0, padding: '5px 10px', borderRadius: '8px',
                          background: '#f0f9ff', color: '#0ea5e9', border: '1px solid #bae6fd',
                          fontSize: '0.72rem', fontWeight: '600', textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: '3px',
                        }}
                      >
                        <MapPin size={11} /> 地圖
                      </a>
                    </div>
                  </div>
                ))}
                {result.total > result.records.length && (
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', padding: '8px' }}>
                    尚有 {result.total - result.records.length} 筆未顯示，請縮小搜尋範圍
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 空狀態 */}
        {!loading && !result && !error && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
            <Home size={48} color="#bae6fd" style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>輸入地址開始查詢</div>
            <div style={{ fontSize: '0.82rem' }}>系統會自動比對接管資料庫，至少輸入 3 個字</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
