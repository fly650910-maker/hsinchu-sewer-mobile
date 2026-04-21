'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Folder, File, Search, ChevronRight, Home as HomeIcon, Database } from 'lucide-react';

interface FileItem {
  name: string;
  isDir: boolean;
  path: string;
  size?: number;
}

export default function DatabasePage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDirectory(currentPath);
  }, [currentPath]);

  const fetchDirectory = async (dirPath: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/database?dir=${encodeURIComponent(dirPath)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      } else {
        const errData = await res.json();
        setError(errData.error || '無法讀取資料夾');
      }
    } catch (err) {
      console.error(err);
      setError('發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (newPath: string) => {
    setCurrentPath(newPath);
    setSearchTerm('');
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    handleNavigate(parts.join('/'));
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBreadcrumbs = () => {
    if (!currentPath) return [];
    const parts = currentPath.split('/').filter(Boolean);
    return parts.map((part, index) => ({
      name: part,
      path: parts.slice(0, index + 1).join('/')
    }));
  };

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ padding: '8px', backgroundColor: 'var(--glass-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
            <ArrowLeft size={24} color="var(--primary)" />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#f59e0b', padding: '10px', borderRadius: '12px', color: 'white' }}>
              <Database size={28} />
            </div>
            <h1 className="page-title" style={{ margin: 0, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              資料庫暨圖資查詢
            </h1>
          </div>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-color)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--glass-border)', flexGrow: 1, overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <button onClick={() => handleNavigate('')} style={{ color: !currentPath ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = !currentPath ? 'var(--primary)' : 'var(--text-muted)'}>
              <HomeIcon size={18} />
            </button>
            {getBreadcrumbs().map((bc, index) => (
              <div key={bc.path} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronRight size={16} color="var(--text-muted)" />
                <button 
                  onClick={() => handleNavigate(bc.path)}
                  style={{ 
                    color: index === getBreadcrumbs().length - 1 ? 'var(--primary)' : 'var(--text-muted)', 
                    fontWeight: index === getBreadcrumbs().length - 1 ? '600' : '400',
                    transition: 'color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} 
                  onMouseOut={e => e.currentTarget.style.color = index === getBreadcrumbs().length - 1 ? 'var(--primary)' : 'var(--text-muted)'}
                >
                  {bc.name}
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '12px', padding: '11px 16px', border: '1px solid var(--glass-border)', width: '300px' }}>
            <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px' }} />
            <input 
              type="text" 
              placeholder="過濾當前目錄檔案..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '1rem', color: 'var(--text-main)' }}
            />
          </div>
        </div>

        {error ? (
          <div style={{ padding: '20px', color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
            {error}
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>讀取資料夾內容中...</div>
        ) : (
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-color)' }}>
            {currentPath && (
              <div 
                onClick={navigateUp}
                style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Folder size={24} color="var(--text-muted)" fill="var(--text-muted)" fillOpacity={0.2} />
                <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>.. (回上一層)</span>
              </div>
            )}
            
            {filteredItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>目錄為空或沒有符合的檔案</div>
            ) : (
              filteredItems.map((item, idx) => (
                <div 
                  key={item.path}
                  onClick={() => item.isDir && handleNavigate(item.path)}
                  style={{ 
                    padding: '16px 24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: idx === filteredItems.length - 1 ? 'none' : '1px solid var(--glass-border)', 
                    cursor: item.isDir ? 'pointer' : 'default',
                    transition: 'background-color 0.2s' 
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {item.isDir ? (
                      <Folder size={24} color="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                    ) : (
                      <File size={24} color="var(--text-muted)" />
                    )}
                    <span style={{ fontWeight: item.isDir ? '600' : '400', color: 'var(--text-main)' }}>{item.name}</span>
                  </div>
                  {!item.isDir && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatSize(item.size)}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
