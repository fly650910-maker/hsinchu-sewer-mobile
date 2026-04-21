'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Trash2, Edit2, Search, Users, AlertTriangle } from 'lucide-react';

interface Person {
  id: number;
  name: string;
  title: string;
  responsibilities: string;
  phone_ext: string;
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', title: '', responsibilities: '', phone_ext: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Edit & Delete mode state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const fetchPersonnel = async () => {
    try {
      const res = await fetch('/api/personnel');
      if (res.ok) {
        const data = await res.json();
        setPersonnel(data);
      }
    } catch (error) {
      console.error('Failed to fetch personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId !== null) {
        const res = await fetch(`/api/personnel/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setEditingId(null);
          setFormData({ name: '', title: '', responsibilities: '', phone_ext: '' });
          setIsFormOpen(false);
          fetchPersonnel();
        }
      } else {
        const res = await fetch('/api/personnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setFormData({ name: '', title: '', responsibilities: '', phone_ext: '' });
          setIsFormOpen(false);
          fetchPersonnel();
        }
      }
    } catch (error) {
      console.error('Failed to add person:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!personToDelete) return;
    try {
      const res = await fetch(`/api/personnel/${personToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPersonToDelete(null);
        fetchPersonnel();
      }
    } catch (error) {
      console.error('Failed to delete person:', error);
    }
  };

  const startEditing = (person: Person) => {
    setEditingId(person.id);
    setFormData({
      name: person.name,
      title: person.title,
      responsibilities: person.responsibilities,
      phone_ext: person.phone_ext || ''
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredPersonnel = personnel.filter(p => 
    p.name.includes(searchTerm) || 
    p.title.includes(searchTerm) || 
    p.responsibilities.includes(searchTerm)
  );

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ padding: '8px', backgroundColor: 'var(--glass-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
            <ArrowLeft size={24} color="var(--primary)" />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--primary-light)', padding: '10px', borderRadius: '12px', color: 'white' }}>
              <Users size={28} />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>人員配置管理</h1>
          </div>
        </div>
        <button className="btn-primary" onClick={() => {
          if (isFormOpen) {
            setIsFormOpen(false);
            setEditingId(null);
            setFormData({ name: '', title: '', responsibilities: '', phone_ext: '' });
          } else {
            setIsFormOpen(true);
            setEditingId(null);
            setFormData({ name: '', title: '', responsibilities: '', phone_ext: '' });
          }
        }}>
          <UserPlus size={20} />
          {isFormOpen ? '取消表單' : (editingId ? '編輯人員' : '新增人員')}
        </button>
      </header>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ marginBottom: '32px', animation: 'fadeIn 0.3s ease-in-out', borderLeft: editingId ? '4px solid var(--success)' : 'none' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', color: editingId ? 'var(--success)' : 'var(--primary)' }}>
            {editingId ? '編輯人員資料' : '新增人員資料'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>姓名 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required type="text" name="name" value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>職稱 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required type="text" name="title" value={formData.title} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>分機</label>
              <input type="text" name="phone_ext" value={formData.phone_ext} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} />
            </div>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>業務職掌 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea required name="responsibilities" value={formData.responsibilities} onChange={handleInputChange} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => {
              setIsFormOpen(false);
              setEditingId(null);
              setFormData({ name: '', title: '', responsibilities: '', phone_ext: '' });
            }} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}>取消</button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: editingId ? 'var(--success)' : 'var(--primary)' }} disabled={submitting}>
              {submitting ? '儲存中...' : (editingId ? '更新資料' : '確認新增')}
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '8px', padding: '8px 16px', marginBottom: '24px', border: '1px solid var(--glass-border)' }}>
          <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px' }} />
          <input 
            type="text" 
            placeholder="搜尋姓名、職稱或業務關鍵字..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '1rem', color: 'var(--text-main)' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>載入中...</div>
        ) : filteredPersonnel.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            {searchTerm ? '找不到符合條件的人員' : '目前尚無人員資料，請點擊上方按鈕新增。'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredPersonnel.map((person) => (
              <div key={person.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '20px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--glass-border)', alignItems: 'flex-start', justifyContent: 'space-between', transition: 'box-shadow 0.2s ease' }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'} onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>{person.name}</h3>
                    <span style={{ backgroundColor: 'var(--primary-light)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem' }}>{person.title}</span>
                    {person.phone_ext && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>📞 分機: {person.phone_ext}</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    <strong>主辦業務：</strong><br />
                    {person.responsibilities}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => startEditing(person)} style={{ color: '#8b5cf6', padding: '8px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', borderRadius: '50%', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="編輯" onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.1)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Edit2 size={20} />
                  </button>
                  <button onClick={() => setPersonToDelete(person)} style={{ color: 'var(--danger)', padding: '8px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', borderRadius: '50%', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="刪除" onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {personToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', marginBottom: '16px' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-main)', fontWeight: '600' }}>確認刪除</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              您確定要刪除「<strong style={{ color: 'var(--text-main)' }}>{personToDelete.name}</strong>」的人員資料嗎？此動作無法復原。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setPersonToDelete(null)} style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--glass-bg)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                取消
              </button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--danger)', color: 'white', cursor: 'pointer', fontWeight: '500', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.9'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
