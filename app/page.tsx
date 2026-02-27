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
export default function TinyTedTalk() {
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

  useEffect(() => {
    if (authed) {
      loadPhotos();
      loadWeeks();
    }
  }, [authed, loadPhotos, loadWeeks]);

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
    setTab('present');
  };

  const backToCurrentWeek = () => {
    setViewingWeek(null);
    loadPhotos();
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
        <style>{globalStyles}</style>
        <div className="pin-screen">
          <div className="pin-card">
            <div className="pin-icon">🎤</div>
            <h1 className="pin-title">Tiny Ted Talk</h1>
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

  // ============================================================
  // MAIN APP
  // ============================================================
  return (
    <>
      <style>{globalStyles}</style>

      <div className="app">
        {/* Header */}
        <div className="header">
          <h1 className="logo">Tiny Ted Talk</h1>
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

// ============================================================
// STYLES
// ============================================================
const globalStyles = `
  :root {
    --bg: #FFF8F0;
    --card: #FFFFFF;
    --primary: #FF6B6B;
    --secondary: #4ECDC4;
    --accent: #FFE66D;
    --text: #2C3E50;
    --text-light: #7F8C8D;
    --shadow: 0 8px 30px rgba(0,0,0,0.08);
    --radius: 20px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Quicksand', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(circle at 20% 80%, rgba(78,205,196,0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255,107,107,0.08) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(255,230,109,0.06) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  .app { position: relative; z-index: 1; }

  /* PIN SCREEN */
  .pin-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    position: relative;
    z-index: 1;
  }

  .pin-card {
    background: var(--card);
    padding: 50px 40px;
    border-radius: 28px;
    box-shadow: var(--shadow);
    text-align: center;
    max-width: 360px;
    width: 100%;
  }

  .pin-icon { font-size: 4rem; margin-bottom: 12px; }
  .pin-title {
    font-family: 'Fredoka', sans-serif;
    font-size: 2.2rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary), #FF8E53);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .pin-subtitle { color: var(--text-light); margin: 8px 0 24px; font-weight: 500; }

  .pin-input-row { display: flex; gap: 10px; justify-content: center; }
  .pin-input {
    width: 140px;
    padding: 14px 20px;
    border: 2px solid #eee;
    border-radius: 16px;
    font-family: 'Quicksand', sans-serif;
    font-size: 1.4rem;
    text-align: center;
    letter-spacing: 0.3em;
    outline: none;
    transition: border-color 0.2s;
  }
  .pin-input:focus { border-color: var(--secondary); }
  .pin-input::-webkit-outer-spin-button,
  .pin-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .pin-input[type=number] { -moz-appearance: textfield; }

  .pin-go {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    border: none;
    background: linear-gradient(135deg, var(--secondary), #45B7AA);
    color: white;
    font-size: 1.4rem;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .pin-go:hover { transform: scale(1.05); }

  .pin-error { color: var(--primary); margin-top: 16px; font-weight: 600; font-size: 0.9rem; }

  /* HEADER */
  .header { text-align: center; padding: 40px 20px 16px; }
  .logo {
    font-family: 'Fredoka', sans-serif;
    font-size: 2.4rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary), #FF8E53);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .subtitle { font-size: 0.95rem; color: var(--text-light); margin-top: 2px; font-weight: 500; }
  .week-badge {
    display: inline-block;
    background: linear-gradient(135deg, var(--secondary), #45B7AA);
    color: white;
    padding: 8px 20px;
    border-radius: 50px;
    font-weight: 600;
    font-size: 0.85rem;
    margin-top: 14px;
    box-shadow: 0 4px 15px rgba(78,205,196,0.3);
  }
  .back-btn {
    display: block;
    margin: 12px auto 0;
    padding: 8px 20px;
    border-radius: 50px;
    border: 2px solid var(--primary);
    background: transparent;
    color: var(--primary);
    font-family: 'Quicksand', sans-serif;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
  }

  /* TABS */
  .tabs {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 16px 20px;
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255,248,240,0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .tab {
    padding: 11px 24px;
    border-radius: 50px;
    border: none;
    font-family: 'Quicksand', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    background: var(--card);
    color: var(--text-light);
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
  .tab.active {
    background: linear-gradient(135deg, var(--primary), #FF8E53);
    color: white;
    box-shadow: 0 4px 20px rgba(255,107,107,0.3);
    transform: scale(1.05);
  }

  /* VIEWS */
  .view { padding: 0 20px 40px; max-width: 600px; margin: 0 auto; }
  .present-view { max-width: 1200px; }

  /* UPLOAD */
  .upload-zone {
    border: 3px dashed rgba(78,205,196,0.4);
    border-radius: var(--radius);
    padding: 50px 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: rgba(78,205,196,0.04);
  }
  .upload-zone:hover, .upload-zone.dragover {
    border-color: var(--secondary);
    background: rgba(78,205,196,0.08);
  }
  .upload-icon {
    font-size: 3.5rem;
    display: block;
    margin-bottom: 10px;
    animation: float 3s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .upload-zone h3 { font-family: 'Fredoka', sans-serif; font-size: 1.2rem; }
  .upload-zone p { color: var(--text-light); font-size: 0.85rem; margin-top: 4px; }

  .progress-bar {
    width: 200px;
    height: 8px;
    background: #eee;
    border-radius: 10px;
    margin: 16px auto 0;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(135deg, var(--secondary), #45B7AA);
    border-radius: 10px;
    transition: width 0.3s;
  }

  .photo-count { text-align: center; margin-top: 16px; font-weight: 600; color: var(--text-light); }
  .photo-count span { color: var(--primary); font-size: 1.2em; }
  .loading-text { text-align: center; margin-top: 30px; color: var(--text-light); }

  .uploaded-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 16px;
  }
  .uploaded-thumb {
    position: relative;
    aspect-ratio: 1;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--shadow);
    animation: popIn 0.3s ease backwards;
  }
  @keyframes popIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .uploaded-thumb img, .uploaded-thumb video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .remove-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    color: white;
    border: none;
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .uploaded-thumb:hover .remove-btn { opacity: 1; }
  .video-badge {
    position: absolute;
    bottom: 6px;
    left: 6px;
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  /* PRESENT */
  .present-header { text-align: center; padding: 20px 20px 10px; }
  .present-header h2 { font-family: 'Fredoka', sans-serif; font-size: 2rem; }
  .present-actions { display: flex; gap: 10px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 13px 28px;
    border-radius: 50px;
    border: none;
    font-family: 'Quicksand', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s;
    color: white;
  }
  .action-btn.primary {
    background: linear-gradient(135deg, var(--primary), #FF8E53);
    box-shadow: 0 4px 20px rgba(255,107,107,0.3);
  }
  .action-btn.secondary {
    background: linear-gradient(135deg, var(--secondary), #45B7AA);
    box-shadow: 0 4px 20px rgba(78,205,196,0.3);
  }
  .action-btn:hover { transform: translateY(-2px); }

  .collage-container { width: 100%; padding: 20px; }
  .collage {
    display: grid;
    gap: 8px;
    border-radius: var(--radius);
    overflow: hidden;
  }
  .collage-item {
    border-radius: 14px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    transition: transform 0.3s;
    box-shadow: var(--shadow);
    background: #eee;
  }
  .collage-item:hover { transform: scale(1.02); z-index: 2; }
  .collage-item img, .collage-item video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .play-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 56px;
    height: 56px;
    background: rgba(255,255,255,0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  }

  .collage.count-1 { grid-template-columns: 1fr; max-width: 700px; margin: 0 auto; }
  .collage.count-1 .collage-item { aspect-ratio: 4/3; }
  .collage.count-2 { grid-template-columns: 1fr 1fr; }
  .collage.count-2 .collage-item { aspect-ratio: 3/4; }
  .collage.count-3 { grid-template-columns: 1fr 1fr; }
  .collage.count-3 .collage-item:first-child { grid-column: 1 / -1; aspect-ratio: 16/9; }
  .collage.count-3 .collage-item { aspect-ratio: 4/3; }
  .collage.count-4 { grid-template-columns: 1fr 1fr; }
  .collage.count-4 .collage-item { aspect-ratio: 4/3; }
  .collage.count-5 { grid-template-columns: 1fr 1fr 1fr; }
  .collage.count-5 .collage-item:first-child { grid-column: 1 / 3; aspect-ratio: 16/9; }
  .collage.count-5 .collage-item { aspect-ratio: 1; }
  .collage.count-6 { grid-template-columns: 1fr 1fr 1fr; }
  .collage.count-6 .collage-item { aspect-ratio: 4/3; }
  .collage.count-many { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
  .collage.count-many .collage-item { aspect-ratio: 1; }

  /* HISTORY */
  .history-list { display: flex; flex-direction: column; gap: 12px; }
  .history-card {
    background: var(--card);
    border-radius: var(--radius);
    padding: 16px;
    box-shadow: var(--shadow);
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .history-card:hover { transform: translateY(-2px); }
  .history-preview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    width: 68px;
    height: 68px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .history-preview img { width: 100%; height: 100%; object-fit: cover; }
  .history-info h3 { font-family: 'Fredoka', sans-serif; font-size: 1.05rem; }
  .history-info p { color: var(--text-light); font-size: 0.85rem; margin-top: 2px; }

  /* EMPTY STATE */
  .empty-state { text-align: center; padding: 60px 20px; color: var(--text-light); }
  .empty-icon { font-size: 3.5rem; margin-bottom: 12px; }
  .empty-state h3 { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; color: var(--text); margin-bottom: 6px; }

  /* FULLSCREEN */
  .fullscreen-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.95);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fs-close {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    color: white;
    border: none;
    font-size: 1.4rem;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fs-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .fs-nav.prev { left: 16px; }
  .fs-nav.next { right: 16px; }
  .fs-content img, .fs-content video {
    max-width: 92vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 10px;
  }
  .fs-counter {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255,255,255,0.5);
    font-weight: 600;
    font-size: 0.9rem;
  }

  /* TV MODE */
  .tv-overlay {
    position: fixed;
    inset: 0;
    background: #1a1a2e;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tv-grid {
    display: grid;
    gap: 10px;
    width: 92vw;
    height: 88vh;
  }
  .tv-item {
    border-radius: 14px;
    overflow: hidden;
    background: #222;
  }
  .tv-item img, .tv-item video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tv-label {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255,255,255,0.5);
    font-family: 'Fredoka', sans-serif;
    font-size: 1.2rem;
  }

  @media (max-width: 600px) {
    .logo { font-size: 1.9rem; }
    .collage.count-many { grid-template-columns: repeat(2, 1fr); }
    .uploaded-grid { grid-template-columns: repeat(3, 1fr); }
    .tab { padding: 10px 18px; font-size: 0.85rem; }
  }
`;
