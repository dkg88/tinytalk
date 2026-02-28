'use client';

import { useState, useEffect } from 'react';
import './present.css';

interface MediaItem {
  url: string;
  pathname: string;
  type: 'image' | 'video';
  uploadedAt?: string;
  capturedAt?: string;
}

// Theme definitions
const THEMES: Record<string, { label: string; emoji: string; bg: string; accent: string }> = {
  none:       { label: 'No Theme',   emoji: '',     bg: '#1a1a2e', accent: '' },
  dinosaur:   { label: 'Dinosaur',   emoji: '\u{1F995}\u{1F996}', bg: '#2d4a3e', accent: '#6BCB77' },
  firetruck:  { label: 'Firetruck',  emoji: '\u{1F692}\u{1F525}', bg: '#4a2020', accent: '#FF6B6B' },
  helicopter: { label: 'Helicopter', emoji: '\u{1F681}\u{1F4A8}', bg: '#1e3a5f', accent: '#5DADE2' },
  train:      { label: 'Train',      emoji: '\u{1F682}\u{1F683}', bg: '#3d2e1e', accent: '#F0B27A' },
  space:      { label: 'Space',      emoji: '\u{1F680}\u{2B50}',  bg: '#0d0d2b', accent: '#A78BFA' },
  ocean:      { label: 'Ocean',      emoji: '\u{1F419}\u{1F420}', bg: '#0e3b43', accent: '#4ECDC4' },
  rainbow:    { label: 'Rainbow',   emoji: '\u{1F308}\u{2B50}',  bg: '#3b1929', accent: '#E91E63' },
  construct:  { label: 'Construction', emoji: '\u{1F69C}\u{1F3D7}', bg: '#3d3010', accent: '#FFA000' },
  airplane:   { label: 'Airplane',  emoji: '\u{2708}\u{2601}',   bg: '#1a1c3a', accent: '#7986CB' },
  farm:       { label: 'Farm',      emoji: '\u{1F404}\u{1F33E}', bg: '#2a3a1e', accent: '#8BC34A' },
  bug:        { label: 'Bug',       emoji: '\u{1F41B}\u{1F41E}', bg: '#3d2a1a', accent: '#FF7043' },
};

// Countdown overlay component
function CountdownOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = ['3', '2', '1', 'Showtime!'];

  useEffect(() => {
    if (step < steps.length - 1) {
      const t = setTimeout(() => setStep(s => s + 1), 800);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [step, onComplete, steps.length]);

  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A78BFA'];

  return (
    <div className="countdown-overlay">
      <div className="countdown-number" key={step} style={{ color: colors[step] }}>
        {steps[step]}
      </div>
    </div>
  );
}

// Confetti finale component
function ConfettiFinale({ onBack }: { onBack: () => void }) {
  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A78BFA', '#FF8E53', '#6BCB77', '#5DADE2', '#F0B27A'];
  const confetti = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 12,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="finale-overlay">
      <div className="confetti-container">
        {confetti.map(c => (
          <div
            key={c.id}
            className="confetti-piece"
            style={{
              '--x': `${c.x}vw`,
              '--delay': `${c.delay}s`,
              '--duration': `${c.duration}s`,
              '--color': c.color,
              '--size': `${c.size}px`,
              '--rotation': `${c.rotation}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="finale-content">
        <div className="finale-emoji">🎉</div>
        <h1 className="finale-title">Great job!</h1>
        <button className="finale-back-btn" onClick={onBack}>
          ← Back to Photos
        </button>
      </div>
    </div>
  );
}

export default function PresentPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const [showFinale, setShowFinale] = useState(false);
  const [theme, setTheme] = useState('none');
  const [weekKey, setWeekKey] = useState('');

  // Load photos + theme
  useEffect(() => {
    const wk = getWeekKey();
    setWeekKey(wk);

    fetch('/api/photos')
      .then(r => r.json())
      .then(d => setMedia(d.items || []))
      .catch(() => {});

    fetch(`/api/theme?week=${wk}`)
      .then(r => r.json())
      .then(d => setTheme(d.theme || 'none'))
      .catch(() => {});
  }, []);

  // Save theme
  const saveTheme = async (t: string) => {
    setTheme(t);
    await fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekKey, theme: t }),
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showCountdown) return;
      if (showFinale) {
        if (e.key === 'Escape') { setShowFinale(false); setCurrentIdx(null); }
        return;
      }
      if (currentIdx === null) return;
      if (e.key === 'ArrowRight') {
        if (currentIdx === media.length - 1) {
          setShowFinale(true);
        } else {
          setCurrentIdx(prev => Math.min((prev ?? 0) + 1, media.length - 1));
        }
      }
      if (e.key === 'ArrowLeft') setCurrentIdx(prev => Math.max((prev ?? 0) - 1, 0));
      if (e.key === 'Escape') setCurrentIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, media.length, showCountdown, showFinale]);

  const themeData = THEMES[theme] || THEMES.none;
  const weekLabel = getWeekLabel();

  const themeStyle = {
    '--theme-bg': themeData.bg,
    '--theme-accent': themeData.accent || 'rgba(255,255,255,0.3)',
    '--theme-emoji': themeData.emoji ? `"${(themeData.emoji + ' ').repeat(500)}"` : '""',
  } as React.CSSProperties;

  // Collage click → start countdown
  const handleCollageClick = (idx: number) => {
    setPendingIdx(idx);
    setShowCountdown(true);
  };

  const handleCountdownComplete = () => {
    setShowCountdown(false);
    setCurrentIdx(pendingIdx);
    setPendingIdx(null);
  };

  const handleFinaleBack = () => {
    setShowFinale(false);
    setCurrentIdx(null);
  };

  // Empty state
  if (media.length === 0) {
    return (
      <div className="present-wrapper" style={themeStyle}>
        <div className="present-empty">
          <p style={{ fontSize: '4rem' }}>📷</p>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: 'white' }}>No photos this week yet!</h1>
        </div>
      </div>
    );
  }

  // Countdown overlay
  if (showCountdown) {
    return (
      <div className="present-wrapper" style={themeStyle}>
        <CountdownOverlay onComplete={handleCountdownComplete} />
      </div>
    );
  }

  // Confetti finale
  if (showFinale) {
    return (
      <div className="present-wrapper" style={themeStyle}>
        <ConfettiFinale onBack={handleFinaleBack} />
      </div>
    );
  }

  // Single photo/video view
  if (currentIdx !== null) {
    const item = media[currentIdx];
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === media.length - 1;
    const dayDate = item.capturedAt || item.uploadedAt;
    const dayName = dayDate
      ? new Date(dayDate).toLocaleDateString('en-US', { weekday: 'long' })
      : '';

    return (
      <div className="present-wrapper" style={themeStyle}>
        {themeData.emoji && <div className="emoji-bg" />}
        <div className="present-container">
          <button className="back-to-collage" onClick={() => setCurrentIdx(null)}>
            ← All Photos
          </button>

          <div className="viewer">
            {!isFirst && (
              <button className="nav-btn nav-prev" onClick={() => setCurrentIdx(currentIdx - 1)}>
                ‹
              </button>
            )}

            <div className="viewer-content">
              {item.type === 'video' ? (
                <video key={item.url} src={item.url} controls autoPlay playsInline preload="auto" />
              ) : (
                <img src={item.url} alt="" />
              )}
              {dayName && <div className="day-label">{dayName}</div>}
            </div>

            <button
              className={`nav-btn nav-next ${isLast ? 'finale-btn' : ''}`}
              onClick={() => {
                if (isLast) {
                  setShowFinale(true);
                } else {
                  setCurrentIdx(currentIdx + 1);
                }
              }}
            >
              {isLast ? '★' : '›'}
            </button>
          </div>

          <div className="present-counter">{currentIdx + 1} / {media.length}</div>
        </div>
      </div>
    );
  }

  // Collage view (with theme picker)
  return (
    <div className="present-wrapper" style={themeStyle}>
      {themeData.emoji && <div className="emoji-bg" />}
      <div className="present-container">
        <h1 className="present-title">{weekLabel}</h1>

        <div className="theme-picker">
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              className={`theme-btn ${theme === key ? 'active' : ''}`}
              onClick={() => saveTheme(key)}
              title={t.label}
              style={key !== 'none' ? { '--btn-accent': t.accent } as React.CSSProperties : undefined}
            >
              {key === 'none' ? '⊘' : t.emoji}
            </button>
          ))}
        </div>

        <div className="tv-collage" style={{
          gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(media.length))}, 1fr)`,
        }}>
          {media.map((item, i) => (
            <div key={item.pathname} className="tv-cell" onClick={() => handleCollageClick(i)}>
              {item.type === 'video' ? (
                <video src={item.url} muted playsInline />
              ) : (
                <img src={item.url} alt="" />
              )}
            </div>
          ))}
        </div>
        <p className="present-hint">Tap a photo to start</p>
      </div>
    </div>
  );
}

function getWeekKey(): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function getWeekLabel(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `Week of ${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}
