'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Search, Briefcase } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  type: string;
  status: string;
  progress_percent: number;
  contractor: string;
  start_date: string;
  end_date: string;
  bbox_min_x: number | null;
  bbox_min_y: number | null;
  bbox_max_x: number | null;
  bbox_max_y: number | null;
}

export default function ProgressPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('全部');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', type: '汙水', status: '辦理中', progress_percent: 0, 
    contractor: '', start_date: '', end_date: '' 
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/progress');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ name: '', type: '汙水', status: '辦理中', progress_percent: 0, contractor: '', start_date: '', end_date: '' });
        setIsFormOpen(false);
        fetchProjects();
      }
    } catch (error) {
      console.error('Failed to add project:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除此工程進度嗎？')) return;
    try {
      const res = await fetch(`/api/progress/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case '已結案': return 'var(--success)';
      case '辦理中': return 'var(--primary)';
      case '暫停': return '#f59e0b';
      case '落後': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesType = filterType === '全部' || p.type === filterType;
    const matchesSearch = p.name.includes(searchTerm) || (p.contractor && p.contractor.includes(searchTerm));
    return matchesType && matchesSearch;
  });

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ padding: '8px', backgroundColor: 'var(--glass-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
            <ArrowLeft size={24} color="var(--primary)" />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--success)', padding: '10px', borderRadius: '12px', color: 'white' }}>
              <Briefcase size={28} />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>業務進度管理</h1>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setIsFormOpen(!isFormOpen)} style={{ backgroundColor: 'var(--success)' }}>
          <Plus size={20} />
          {isFormOpen ? '取消新增' : '新增工程'}
        </button>
      </header>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ marginBottom: '32px', borderLeft: '4px solid var(--success)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px', color: 'var(--success)' }}>新增工程/計畫</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>工程名稱 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required type="text" name="name" value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>工程類型 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select name="type" value={formData.type} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }}>
                <option value="汙水">汙水下水道工程</option>
                <option value="雨水">雨水下水道工程</option>
                <option value="其他">其他計畫</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>狀態 <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }}>
                <option value="辦理中">辦理中</option>
                <option value="已結案">已結案</option>
                <option value="落後">落後</option>
                <option value="暫停">暫停</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>進度百分比 (%)</label>
              <input type="number" min="0" max="100" name="progress_percent" value={formData.progress_percent} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>承包廠商</label>
              <input type="text" name="contractor" value={formData.contractor} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>開工日期</label>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>預定完工日期</label>
              <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1rem' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsFormOpen(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--glass-border)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}>取消</button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--success)' }} disabled={submitting}>
              {submitting ? '儲存中...' : '確認儲存'}
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
            {['全部', '汙水', '雨水', '其他'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: filterType === type ? 'var(--primary-light)' : 'transparent',
                  color: filterType === type ? 'white' : 'var(--text-main)',
                  fontWeight: filterType === type ? '600' : '400',
                  border: 'none',
                  borderRight: '1px solid var(--glass-border)'
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-color)', borderRadius: '8px', padding: '8px 16px', border: '1px solid var(--glass-border)', flexGrow: 1 }}>
            <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px' }} />
            <input 
              type="text" 
              placeholder="搜尋工程名稱或廠商..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '1rem', color: 'var(--text-main)' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>載入中...</div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            目前尚無符合的工程進度資料。
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filteredProjects.map((project) => (
              <div key={project.id} style={{ padding: '20px', backgroundColor: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'box-shadow 0.2s ease', position: 'relative' }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'} onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                
                <button onClick={() => handleDelete(project.id)} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-color)', border: '1px solid var(--glass-border)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                  <Trash2 size={16} />
                </button>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingRight: '30px' }}>
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: project.type === '汙水' ? 'rgba(37,99,235,0.1)' : 'rgba(16,185,129,0.1)', color: project.type === '汙水' ? 'var(--primary)' : 'var(--success)', fontWeight: '600' }}>
                      {project.type}
                    </span>
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: getStatusColor(project.status), color: 'white', fontWeight: '600' }}>
                      {project.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1.4' }}>{project.name}</h3>
                </div>

                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>進度</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{project.progress_percent}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--glass-border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${project.progress_percent}%`, backgroundColor: getStatusColor(project.status), borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {project.contractor && <div><strong>廠商：</strong>{project.contractor}</div>}
                  {project.start_date && project.end_date && (
                    <div><strong>工期：</strong>{project.start_date} ~ {project.end_date}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
