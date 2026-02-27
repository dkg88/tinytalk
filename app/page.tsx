'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Types
interface MediaItem {
  url: string;
  pathname: string;
  type: 'image' | 'video';
  uploadedAt: string;
  size: number;
}

// Theme definitions
const THEMES: Record<string, { label: string; emoji: string; bg: string; accent: string }> = {
  none:       { label: 'No Theme',   emoji: '',     bg: '#FFF8F0', accent: '' },
  dinosaur:   { label: 'Dinosaur',   emoji: '\u{1F995}\u{1F996}', bg: '#e8f5e9', accent: '#6BCB77' },
  firetruck:  { label: 'Firetruck',  emoji: '\u{1F692}\u{1F525}', bg: '#fce4ec', accent: '#FF6B6B' },
  helicopter: { label: 'Helicopter', emoji: '\u{1F681}\u{1F4A8}', bg: '#e3f2fd', accent: '#5DADE2' },
  train:      { label: 'Train',      emoji: '\u{1F682}\u{1F683}', bg: '#fff3e0', accent: '#F0B27A' },
  space:      { label: 'Space',      emoji: '\u{1F680}\u{2B50}',  bg: '#ede7f6', accent: '#A78BFA' },
  ocean:      { label: 'Ocean',      emoji: '\u{1F419}\u{1F420}', bg: '#e0f2f1', accent: '#4ECDC4' },
};

interface WeekData {
  weekKey: string;
  label: string;
  items: MediaItem[];
}

// Helpers
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekKey(date: Date = new Date()): string {
  return getWeekStart(date).toISOString().split('T')[0];
}

function getWeekLabel(date: Date = new Date()): string {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `Week of ${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

// ============================================================
// MAIN APP
// ============================================================
export default function TinyTalk() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [tab, setTab] = useState<'upload' | 'present' | 'history'>('upload');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);
  const [tvMode, setTvMode] = useState(false);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [viewingWeek, setViewingWeek] = useState<string | null>(null);
  const [theme, setTheme] = useState('none');
  const slideshowRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('ttt-authed');
    if (saved === 'true') setAuthed(true);
  }, []);

  // Load photos for current week
  const loadPhotos = useCallback(async (weekKey?: string) => {
    setLoading(true);
    try {
      const wk = weekKey || getWeekKey();
      const res = await fetch(`/api/photos?week=${wk}`);
      if (res.ok) {
        const data = await res.json();
        setMedia(data.items || []);
      }
    } catch (e) {
      console.error('Failed to load photos:', e);
    }
    setLoading(false);
  }, []);

  // Load weeks for history
  const loadWeeks = useCallback(async () => {
    try {
      const res = await fetch('/api/weeks');
      if (res.ok) {
        const data = await res.json();
        setWeeks(data.weeks || []);
      }
    } catch (e) {
      console.error('Failed to load weeks:', e);
    }
  }, []);

  // Load theme for current week
  const loadTheme = useCallback(async (weekKey?: string) => {
    try {
      const wk = weekKey || getWeekKey();
      const res = await fetch(`/api/theme?week=${wk}`);
      if (res.ok) {
        const data = await res.json();
        setTheme(data.theme || 'none');
      }
    } catch {
      setTheme('none');
    }
  }, []);

  const saveTheme = async (t: string) => {
    setTheme(t);
    const wk = viewingWeek || getWeekKey();
    await fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: wk, theme: t }),
    });
  };

  useEffect(() => {
    if (authed) {
      loadPhotos();
      loadWeeks();
      loadTheme();
    }
  }, [authed, loadPhotos, loadWeeks, loadTheme]);

  // PIN auth
  const handlePin = async () => {
    setPinError('');
    try {
      const res = await fetch('/api/photos?pin=' + pin);
      if (res.ok) {
        setAuthed(true);
        sessionStorage.setItem('ttt-authed', 'true');
      } else {
        setPinError('Wrong PIN, try again');
        setPin('');
      }
    } catch {
      setPinError('Something went wrong');
    }
  };

  // Upload
  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const total = files.length;
    let done = 0;

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('week', viewingWeek || getWeekKey());
        formData.append('type', isVideo ? 'video' : 'image');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setMedia(prev => [...prev, data.item]);
        }
      } catch (e) {
        console.error('Upload failed:', e);
      }

      done++;
      setUploadProgress(Math.round((done / total) * 100));
    }

    setUploading(false);
    setUploadProgress(0);
    loadWeeks(); // refresh history
  };

  // Delete
  const handleDelete = async (pathname: string) => {
    try {
      await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname }),
      });
      setMedia(prev => prev.filter(m => m.pathname !== pathname));
      loadWeeks();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Slideshow
  const startSlideshow = () => {
    if (media.length === 0) return;
    setFullscreenIdx(0);
    setSlideshowActive(true);
  };

  useEffect(() => {
    if (slideshowActive && fullscreenIdx !== null) {
      slideshowRef.current = setTimeout(() => {
        setFullscreenIdx(prev => (prev !== null ? (prev + 1) % media.length : 0));
      }, 4000);
    }
    return () => {
      if (slideshowRef.current) clearTimeout(slideshowRef.current);
    };
  }, [slideshowActive, fullscreenIdx, media.length]);

  const closeFullscreen = () => {
    setFullscreenIdx(null);
    setSlideshowActive(false);
  };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (fullscreenIdx !== null) {
        if (e.key === 'Escape') closeFullscreen();
        if (e.key === 'ArrowLeft') setFullscreenIdx(prev => prev !== null ? (prev - 1 + media.length) % media.length : 0);
        if (e.key === 'ArrowRight') setFullscreenIdx(prev => prev !== null ? (prev + 1) % media.length : 0);
      }
      if (tvMode && e.key === 'Escape') setTvMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreenIdx, tvMode, media.length]);

  // View a past week
  const viewWeek = (weekKey: string) => {
    setViewingWeek(weekKey);
    loadPhotos(weekKey);
    loadTheme(weekKey);
    setTab('present');
  };

  const backToCurrentWeek = () => {
    setViewingWeek(null);
    loadPhotos();
    loadTheme();
    setTab('upload');
  };

  const displayWeekKey = viewingWeek || getWeekKey();
  const displayWeekLabel = viewingWeek
    ? getWeekLabel(new Date(viewingWeek + 'T00:00:00'))
    : getWeekLabel();

  // ============================================================
  // PIN SCREEN
  // ============================================================
  if (!authed) {
    return (
      <>
        <div className="pin-screen">
          <div className="pin-card">
            <div className="pin-icon">🎤</div>
            <h1 className="pin-title">Tiny Talk</h1>
            <p className="pin-subtitle">Enter your family PIN</p>
            <div className="pin-input-row">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePin()}
                placeholder="••••"
                className="pin-input"
                autoFocus
              />
              <button onClick={handlePin} className="pin-go">→</button>
            </div>
            {pinError && <p className="pin-error">{pinError}</p>}
          </div>
        </div>
      </>
    );
  }

  const themeData = THEMES[theme] || THEMES.none;

  // ============================================================
  // MAIN APP
  // ============================================================
  return (
    <>
      <div className="app" style={themeData.accent ? {
        '--theme-bg': themeData.bg,
        '--theme-accent': themeData.accent,
      } as React.CSSProperties : undefined}>
        {/* Header */}
        <div className="header">
          <h1 className="logo">Tiny Talk</h1>
          <p className="subtitle">Weekly photo presentations by your little one</p>
          <div className="week-badge">{displayWeekLabel}</div>
          {viewingWeek && (
            <button className="back-btn" onClick={backToCurrentWeek}>
              ← Back to this week
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
            📸 Add
          </button>
          <button className={`tab ${tab === 'present' ? 'active' : ''}`} onClick={() => setTab('present')}>
            📺 Present
          </button>
          <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => { setTab('history'); loadWeeks(); }}>
            📅 History
          </button>
        </div>

        {/* UPLOAD TAB */}
        {tab === 'upload' && (
          <div className="view">
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
              onDragLeave={e => e.currentTarget.classList.remove('dragover')}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove('dragover');
                handleFiles(e.dataTransfer.files);
              }}
            >
              <span className="upload-icon">{uploading ? '⏳' : '📷'}</span>
              {uploading ? (
                <>
                  <h3>Uploading... {uploadProgress}%</h3>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <h3>Add this week&apos;s photos &amp; videos</h3>
                  <p>Tap to select or drag &amp; drop</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={e => e.target.files && handleFiles(e.target.files)}
                style={{ display: 'none' }}
              />
            </div>

            <div className="theme-picker-main">
              <p className="theme-label">Weekly Theme</p>
              <div className="theme-grid">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    className={`theme-option ${theme === key ? 'active' : ''}`}
                    onClick={() => saveTheme(key)}
                    style={key !== 'none' ? { '--opt-accent': t.accent } as React.CSSProperties : undefined}
                  >
                    <span className="theme-option-emoji">{key === 'none' ? '⊘' : t.emoji}</span>
                    <span className="theme-option-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {media.length > 0 && (
              <p className="photo-count"><span>{media.length}</span> memories this week</p>
            )}

            {loading && media.length === 0 && (
              <p className="loading-text">Loading photos...</p>
            )}

            <div className="uploaded-grid">
              {media.map((item, i) => (
                <div key={item.pathname} className="uploaded-thumb" style={{ animationDelay: `${i * 0.05}s` }}>
                  {item.type === 'video' ? (
                    <>
                      <video src={item.url} muted playsInline />
                      <div className="video-badge">▶ Video</div>
                    </>
                  ) : (
                    <img src={item.url} alt="" loading="lazy" />
                  )}
                  <button className="remove-btn" onClick={() => handleDelete(item.pathname)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRESENT TAB */}
        {tab === 'present' && (
          <div className="view present-view">
            {media.length > 0 ? (
              <>
                <div className="present-header">
                  <h2>This Week&apos;s Adventures!</h2>
                  <div className="present-actions">
                    <button className="action-btn primary" onClick={startSlideshow}>▶ Slideshow</button>
                    <button className="action-btn secondary" onClick={() => setTvMode(true)}>⛶ TV Mode</button>
                  </div>
                </div>
                <div className="collage-container">
                  <div className={`collage count-${Math.min(media.length, 6)}${media.length > 6 ? ' count-many' : ''}`}>
                    {media.map((item, i) => (
                      <div key={item.pathname} className="collage-item" onClick={() => setFullscreenIdx(i)}>
                        {item.type === 'video' ? (
                          <>
                            <video src={item.url} muted playsInline />
                            <div className="play-overlay">▶</div>
                          </>
                        ) : (
                          <img src={item.url} alt="" loading="lazy" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎨</div>
                <h3>No photos yet!</h3>
                <p>Add some photos first, then come back for the show.</p>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="view">
            {weeks.length > 0 ? (
              <div className="history-list">
                {weeks.map(w => (
                  <div key={w.weekKey} className="history-card" onClick={() => viewWeek(w.weekKey)}>
                    <div className="history-preview">
                      {w.items.slice(0, 4).map((item, i) => (
                        <img key={i} src={item.url} alt="" />
                      ))}
                    </div>
                    <div className="history-info">
                      <h3>{w.label}</h3>
                      <p>{w.items.length} photo{w.items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No past weeks yet</h3>
                <p>Your weekly collections will show up here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULLSCREEN VIEWER */}
      {fullscreenIdx !== null && (
        <div className="fullscreen-overlay" onClick={closeFullscreen}>
          <button className="fs-close" onClick={closeFullscreen}>✕</button>
          <button className="fs-nav prev" onClick={e => {
            e.stopPropagation();
            setFullscreenIdx((fullscreenIdx - 1 + media.length) % media.length);
          }}>‹</button>
          <button className="fs-nav next" onClick={e => {
            e.stopPropagation();
            setFullscreenIdx((fullscreenIdx + 1) % media.length);
          }}>›</button>
          <div className="fs-content" onClick={e => e.stopPropagation()}>
            {media[fullscreenIdx]?.type === 'video' ? (
              <video src={media[fullscreenIdx].url} controls autoPlay playsInline />
            ) : (
              <img src={media[fullscreenIdx]?.url} alt="" />
            )}
          </div>
          <div className="fs-counter">{fullscreenIdx + 1} / {media.length}</div>
        </div>
      )}

      {/* TV MODE */}
      {tvMode && (
        <div className="tv-overlay">
          <button className="fs-close" onClick={() => setTvMode(false)}>✕</button>
          <div className="tv-grid" style={{
            gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(media.length))}, 1fr)`
          }}>
            {media.map((item, i) => (
              <div key={item.pathname} className="tv-item">
                {item.type === 'video' ? (
                  <video src={item.url} muted playsInline />
                ) : (
                  <img src={item.url} alt="" />
                )}
              </div>
            ))}
          </div>
          <div className="tv-label">{displayWeekLabel}</div>
        </div>
      )}
    </>
  );
}

