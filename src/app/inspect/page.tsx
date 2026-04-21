'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, MapPin, Camera, Image as ImageIcon, FileText, AlertCircle,
  Phone, CheckCircle, Clock, AlertTriangle, Home, X, Download, Search,
  ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const loadDynamic = (loader: any, opts?: any) => dynamic(loader, { ssr: false, ...opts });
const MapContainer = loadDynamic(() => import('react-leaflet').then(m => m.MapContainer));
const TileLayer = loadDynamic(() => import('react-leaflet').then(m => m.TileLayer));
const CircleMarker = loadDynamic(() => import('react-leaflet').then(m => m.CircleMarker));
const Popup = loadDynamic(() => import('react-leaflet').then(m => m.Popup));
const useMapEvents = loadDynamic(async () => {
  const { useMapEvents: hook } = await import('react-leaflet');
  return { default: hook };
});

interface Manhole {
  id: number;
  manhole_no: string;
  x: number;
  y: number;
  location: string;
  depth?: number;
  area?: string;
  manhole_type?: string;
  system_type?: string;
}

interface InspectReport {
  id: number;
  manhole_no: string;
  location?: string;
  cause?: string;
  severity?: string;
  notes?: string;
  photos?: string[];
  reporter?: string;
  status?: string;
  created_at?: string;
}

type ViewType = 'map' | 'report-form' | 'reports-list' | 'report-detail';

export default function InspectPage() {
  const [view, setView] = useState<ViewType>('map');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearby, setNearby] = useState<Manhole[]>([]);
  const [selectedManhole, setSelectedManhole] = useState<Manhole | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [reports, setReports] = useState<InspectReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<InspectReport | null>(null);
  const [statusFilter, setStatusFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    cause: '',
    severity: '',
    notes: '',
    photos: [] as string[],
    reporter: ''
  });

  const [photoThumbnails, setPhotoThumbnails] = useState<string[]>([]);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          loadNearbyManholes(latitude, longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Default to Taiwan center
          setUserLocation([25.0, 121.0]);
        }
      );
    }
  }, []);

  const loadNearbyManholes = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/inspect/nearby?lat=${lat}&lng=${lng}&radius=0.05`
      );
      const data = await res.json();
      setNearby(data.nearby || []);
    } catch (error) {
      console.error('Failed to load nearby manholes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (status?: string) => {
    try {
      setLoading(true);
      let url = '/api/inspect/reports?limit=100';
      if (status && status !== '全部') {
        url += `&status=${encodeURIComponent(status)}`;
      }
      if (searchQuery) {
        url += `&manhole_no=${encodeURIComponent(searchQuery)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'reports-list') {
      loadReports(statusFilter !== '全部' ? statusFilter : undefined);
    }
  }, [view, statusFilter, searchQuery]);

  const handleManholeClick = (manhole: Manhole) => {
    setSelectedManhole(manhole);
    setShowBottomSheet(true);
    resetForm();
  };

  const handleNewReport = () => {
    setView('report-form');
    setShowBottomSheet(false);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        alert('圖片大小不能超過 5MB');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, base64]
        }));
        setPhotoThumbnails(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
    setPhotoThumbnails(prev => prev.filter((_, i) => i !== index));
  };

  const submitReport = async () => {
    if (!selectedManhole) return;
    if (!formData.cause || !formData.severity) {
      alert('請填寫塞管原因和嚴重程度');
      return;
    }

    try {
      setLoading(true);
      const reportData = {
        manhole_no: selectedManhole.manhole_no,
        manhole_id: selectedManhole.id,
        lat: selectedManhole.y,
        lng: selectedManhole.x,
        location: selectedManhole.location,
        area: selectedManhole.area,
        system_type: selectedManhole.system_type || '污水',
        cause: formData.cause,
        severity: formData.severity,
        notes: formData.notes,
        photos: formData.photos,
        reporter: formData.reporter,
        status: '待處理'
      };

      const res = await fetch('/api/inspect/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (res.ok) {
        alert('通報已提交');
        resetForm();
        setView('map');
        setSelectedManhole(null);
        setShowBottomSheet(false);
        // Refresh reports list
        loadReports();
      } else {
        alert('提交失敗，請重試');
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('提交失敗');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cause: '',
      severity: '',
      notes: '',
      photos: [],
      reporter: ''
    });
    setPhotoThumbnails([]);
  };

  const severityOptions = [
    { label: '輕微', value: '輕微', color: '#10b981' },
    { label: '中度', value: '中度', color: '#f59e0b' },
    { label: '嚴重', value: '嚴重', color: '#ef6444' },
    { label: '緊急', value: '緊急', color: '#dc2626' }
  ];

  const causeOptions = ['油脂堆積', '樹根入侵', '異物堵塞', '管線破損', '沉積淤泥', '管線錯接', '其他'];

  // MAP VIEW
  if (view === 'map') {
    return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
          {userLocation && (
            <MapContainer center={userLocation} zoom={15} style={{ height: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {nearby.map(m => (
                <CircleMarker
                  key={m.id}
                  center={[m.y, m.x]}
                  radius={8}
                  fillColor="#8b5cf6"
                  color="#7c3aed"
                  weight={2}
                  opacity={1}
                  fillOpacity={0.7}
                  eventHandlers={{ click: () => handleManholeClick(m) }}
                >
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: '150px' }}>
                      <strong>{m.manhole_no}</strong><br />
                      {m.location}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Top Header */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link href="/">
            <button style={{
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}>
              <ArrowLeft size={20} /> 返回
            </button>
          </Link>
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {nearby.length} 個人孔
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '16px',
          right: '16px',
          zIndex: 10
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <Search size={18} style={{ color: '#6b7280' }} />
            <input
              type="text"
              placeholder="搜尋人孔編號..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Bottom Floating Button & Bottom Sheet */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Bottom Sheet */}
          {showBottomSheet && (
            <div style={{
              background: 'white',
              borderRadius: '16px 16px 0 0',
              padding: '20px 16px 16px',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
              flex: 1,
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  {selectedManhole?.manhole_no}
                </h3>
                <button
                  onClick={() => {
                    setShowBottomSheet(false);
                    setSelectedManhole(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{
                background: '#f3f4f6',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                {selectedManhole?.location && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <MapPin size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                    <span>{selectedManhole.location}</span>
                  </div>
                )}
                {selectedManhole?.area && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <FileText size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                    <span>地區: {selectedManhole.area}</span>
                  </div>
                )}
                {selectedManhole?.depth && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>深度: {selectedManhole.depth}m</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleNewReport}
                style={{
                  width: '100%',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                新增通報
              </button>
            </div>
          )}

          {/* Floating Buttons */}
          {!showBottomSheet && (
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '16px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setView('reports-list');
                }}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FileText size={18} /> 通報紀錄
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // REPORT FORM VIEW
  if (view === 'report-form' && selectedManhole) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            新增塞管通報
          </h2>
          <button
            onClick={() => {
              setView('map');
              setSelectedManhole(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          {/* Manhole Info */}
          <div style={{
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              {selectedManhole.manhole_no}
            </div>
            {selectedManhole.location && (
              <div style={{ color: '#6b7280', marginBottom: '4px' }}>
                {selectedManhole.location}
              </div>
            )}
            {selectedManhole.area && (
              <div style={{ color: '#6b7280' }}>地區: {selectedManhole.area}</div>
            )}
          </div>

          {/* Cause Dropdown */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              塞管原因 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={formData.cause}
              onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                appearance: 'none',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">-- 請選擇 --</option>
              {causeOptions.map(cause => (
                <option key={cause} value={cause}>{cause}</option>
              ))}
            </select>
          </div>

          {/* Severity Buttons */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
              嚴重程度 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {severityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormData({ ...formData, severity: opt.value })}
                  style={{
                    padding: '12px',
                    border: formData.severity === opt.value ? '2px solid' + opt.color : '1px solid #d1d5db',
                    borderColor: opt.color,
                    background: formData.severity === opt.value ? opt.color + '15' : 'white',
                    color: opt.color,
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes Textarea */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              備註
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="詳細說明..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minHeight: '100px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Photo Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
              照片上傳
            </label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: '1px dashed #d1d5db',
                borderRadius: '6px',
                background: '#f9fafb',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                <Camera size={18} /> 相機
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                  multiple
                />
              </label>
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: '1px dashed #d1d5db',
                borderRadius: '6px',
                background: '#f9fafb',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                <ImageIcon size={18} /> 相簿
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                  multiple
                />
              </label>
            </div>

            {/* Photo Thumbnails */}
            {photoThumbnails.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
              }}>
                {photoThumbnails.map((thumb, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      paddingBottom: '100%',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={thumb}
                      alt={`thumbnail-${idx}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      onClick={() => removePhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reporter Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              通報人
            </label>
            <input
              type="text"
              placeholder="請輸入名字"
              value={formData.reporter}
              onChange={(e) => setFormData({ ...formData, reporter: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => {
                setView('map');
                setSelectedManhole(null);
                resetForm();
              }}
              style={{
                padding: '12px',
                border: '1px solid #d1d5db',
                background: 'white',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              onClick={submitReport}
              disabled={loading}
              style={{
                padding: '12px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '提交中...' : '提交通報'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // REPORTS LIST VIEW
  if (view === 'reports-list') {
    return (
      <div style={{
        width: '100vw',
        minHeight: '100vh',
        background: '#f9fafb',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            通報紀錄
          </h2>
          <button
            onClick={() => setView('map')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto'
        }}>
          {['全部', '待處理', '處理中', '已完成'].map(status => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
              }}
              style={{
                padding: '6px 12px',
                border: statusFilter === status ? '2px solid #8b5cf6' : '1px solid #d1d5db',
                background: statusFilter === status ? '#f3e8ff' : 'white',
                color: statusFilter === status ? '#8b5cf6' : '#6b7280',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{
          background: 'white',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f3f4f6',
            borderRadius: '6px',
            padding: '8px 12px'
          }}>
            <Search size={16} style={{ color: '#6b7280' }} />
            <input
              type="text"
              placeholder="搜尋人孔編號..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{
          background: 'white',
          padding: '8px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => {
              const params = new URLSearchParams({ format: 'xlsx' });
              if (statusFilter !== '全部') params.set('status', statusFilter);
              window.open(`/api/inspect/export?${params.toString()}`, '_blank');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 14px',
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Excel
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams({ format: 'pdf' });
              if (statusFilter !== '全部') params.set('status', statusFilter);
              window.open(`/api/inspect/export?${params.toString()}`, '_blank');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 14px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> PDF
          </button>
        </div>

        {/* Reports List */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          {loading && <div style={{ textAlign: 'center', padding: '20px' }}>加載中...</div>}

          {!loading && reports.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#9ca3af'
            }}>
              <AlertCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>暫無通報記錄</p>
            </div>
          )}

          {reports.map(report => (
            <div
              key={report.id}
              onClick={() => {
                setSelectedReport(report);
                setView('report-detail');
              }}
              style={{
                background: 'white',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px',
                cursor: 'pointer',
                borderLeft: `4px solid ${
                  report.severity === '輕微' ? '#10b981' :
                  report.severity === '中度' ? '#f59e0b' :
                  report.severity === '嚴重' ? '#ef6444' :
                  report.severity === '緊急' ? '#dc2626' : '#d1d5db'
                }`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {report.manhole_no}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {report.created_at?.substring(0, 10)}
                  </div>
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background:
                    report.status === '待處理' ? '#fef3c7' :
                    report.status === '處理中' ? '#dbeafe' :
                    report.status === '已完成' ? '#dcfce7' : '#f3f4f6',
                  color:
                    report.status === '待處理' ? '#b45309' :
                    report.status === '處理中' ? '#1e40af' :
                    report.status === '已完成' ? '#166534' : '#6b7280'
                }}>
                  {report.status}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'space-between'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#6b7280' }}>原因: </span>
                    <span style={{ fontWeight: '500' }}>{report.cause || '-'}</span>
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    <span style={{ color: '#6b7280' }}>嚴重度: </span>
                    <span style={{
                      fontWeight: '500',
                      color:
                        report.severity === '輕微' ? '#10b981' :
                        report.severity === '中度' ? '#f59e0b' :
                        report.severity === '嚴重' ? '#ef6444' :
                        report.severity === '緊急' ? '#dc2626' : '#6b7280'
                    }}>
                      {report.severity || '-'}
                    </span>
                  </div>
                </div>

                {report.photos && report.photos.length > 0 && (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: '#f3f4f6',
                    flexShrink: 0
                  }}>
                    <img
                      src={report.photos[0]}
                      alt="thumbnail"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // REPORT DETAIL VIEW
  if (view === 'report-detail' && selectedReport) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            通報詳情
          </h2>
          <button
            onClick={() => {
              setView('reports-list');
              setSelectedReport(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          {/* Status Badge */}
          <div style={{
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 'bold',
            padding: '6px 12px',
            borderRadius: '6px',
            marginBottom: '16px',
            background:
              selectedReport.status === '待處理' ? '#fef3c7' :
              selectedReport.status === '處理中' ? '#dbeafe' :
              selectedReport.status === '已完成' ? '#dcfce7' : '#f3f4f6',
            color:
              selectedReport.status === '待處理' ? '#b45309' :
              selectedReport.status === '處理中' ? '#1e40af' :
              selectedReport.status === '已完成' ? '#166534' : '#6b7280'
          }}>
            {selectedReport.status}
          </div>

          {/* Basic Info */}
          <div style={{
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '13px'
            }}>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '2px' }}>人孔編號</div>
                <div style={{ fontWeight: 'bold' }}>{selectedReport.manhole_no}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '2px' }}>通報時間</div>
                <div style={{ fontWeight: 'bold' }}>{selectedReport.created_at?.substring(0, 10)}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '2px' }}>塞管原因</div>
                <div style={{ fontWeight: 'bold' }}>{selectedReport.cause}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '2px' }}>嚴重程度</div>
                <div style={{
                  fontWeight: 'bold',
                  color:
                    selectedReport.severity === '輕微' ? '#10b981' :
                    selectedReport.severity === '中度' ? '#f59e0b' :
                    selectedReport.severity === '嚴重' ? '#ef6444' :
                    selectedReport.severity === '緊急' ? '#dc2626' : '#6b7280'
                }}>
                  {selectedReport.severity}
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          {selectedReport.location && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>
                位置
              </div>
              <div style={{
                background: '#f9fafb',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '14px'
              }}>
                {selectedReport.location}
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedReport.notes && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>
                備註
              </div>
              <div style={{
                background: '#f9fafb',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedReport.notes}
              </div>
            </div>
          )}

          {/* Photos */}
          {selectedReport.photos && selectedReport.photos.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
                照片 ({selectedReport.photos.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                {selectedReport.photos.map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`photo-${idx}`}
                    style={{
                      borderRadius: '6px',
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      background: '#f3f4f6'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Reporter */}
          {selectedReport.reporter && (
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px'
            }}>
              <span style={{ color: '#6b7280' }}>通報人: </span>
              <span style={{ fontWeight: 'bold' }}>{selectedReport.reporter}</span>
            </div>
          )}
        </div>

        {/* Bottom Action Button */}
        <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={() => {
              setView('reports-list');
              setSelectedReport(null);
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            返回紀錄
          </button>
        </div>
      </div>
    );
  }

  return null;
}
