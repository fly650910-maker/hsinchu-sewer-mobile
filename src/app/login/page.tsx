'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'GIS_PASSWORD' && password === 'hchg2620') {
      // 簡單的 Cookie 設定
      document.cookie = "sewer_session=active_session; path=/; max-age=86400";
      router.push('/');
      router.refresh();
    } else {
      setError('帳號或密碼錯誤');
    }
  };

  return (
    <div style={{ 
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '40px', borderRadius: '24px', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', width: '100%', maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '1.8rem', color: '#1e3a8a', marginBottom: '8px' }}>🍎 小蘋果</h1>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>下水道管理系統 (手機版)</p>
        
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="請輸入使用者名稱" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ 
              width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0',
              fontSize: '1.1rem', marginBottom: '16px', textAlign: 'center', outline: 'none'
            }}
          />
          <input 
            type="password" 
            placeholder="請輸入密碼" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0',
              fontSize: '1.1rem', marginBottom: '16px', textAlign: 'center', outline: 'none'
            }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>}
          <button 
            type="submit"
            style={{ 
              width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: '#2563eb',
              color: 'white', border: 'none', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer'
            }}
          >
            登入系統
          </button>
        </form>
        <p style={{ marginTop: '24px', fontSize: '0.8rem', color: '#94a3b8' }}>
          本系統僅供新竹縣政府下水道科內部使用
        </p>
      </div>
    </div>
  );
}
