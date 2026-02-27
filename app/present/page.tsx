'use client';

import { useState, useEffect } from 'react';
import './present.css';

interface MediaItem {
  url: string;
  pathname: string;
  type: 'image' | 'video';
}

export default function PresentPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/photos')
      .then(r => r.json())
      .then(d => setMedia(d.items || []))
      .catch(() => {});
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (currentIdx === null) return;
      if (e.key === 'ArrowRight') setCurrentIdx(prev => Math.min((prev ?? 0) + 1, media.length - 1));
      if (e.key === 'ArrowLeft') setCurrentIdx(prev => Math.max((prev ?? 0) - 1, 0));
      if (e.key === 'Escape') setCurrentIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, media.length]);

  const weekLabel = getWeekLabel();

  if (media.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ fontSize: '4rem' }}>📷</p>
        <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: 'white' }}>No photos this week yet!</h1>
      </div>
    );
  }

  // Single photo/video view
  if (currentIdx !== null) {
    const item = media[currentIdx];
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === media.length - 1;

    return (
      <div style={styles.container}>
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
              <video key={item.url} src={item.url} controls autoPlay playsInline />
            ) : (
              <img src={item.url} alt="" />
            )}
          </div>

          {!isLast && (
            <button className="nav-btn nav-next" onClick={() => setCurrentIdx(currentIdx + 1)}>
              ›
            </button>
          )}
        </div>

        <div style={styles.counter}>{currentIdx + 1} / {media.length}</div>
      </div>
    );
  }

  // Collage view
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{weekLabel}</h1>
      <div className="tv-collage" style={{
        gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(media.length))}, 1fr)`,
      }}>
        {media.map((item, i) => (
          <div key={item.pathname} className="tv-cell" onClick={() => setCurrentIdx(i)}>
            {item.type === 'video' ? (
              <video src={item.url} muted playsInline />
            ) : (
              <img src={item.url} alt="" />
            )}
          </div>
        ))}
      </div>
      <p style={styles.hint}>Tap a photo to start</p>
    </div>
  );
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
  },
  empty: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Fredoka, sans-serif',
    color: 'white',
    fontSize: '2rem',
    marginBottom: '20px',
    opacity: 0.8,
  },
  hint: {
    color: 'rgba(255,255,255,0.3)',
    marginTop: '16px',
    fontSize: '0.85rem',
    fontFamily: 'Quicksand, sans-serif',
  },
  counter: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Quicksand, sans-serif',
    fontWeight: 600,
    marginTop: '16px',
    fontSize: '1rem',
  },
};
