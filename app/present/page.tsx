'use client';

import { useState, useEffect, useRef } from 'react';
import './present.css';

interface MediaItem {
  url: string;
  pathname: string;
  type: 'image' | 'video';
}

export default function PresentPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mode, setMode] = useState<'collage' | 'slideshow'>('collage');
  const [currentIdx, setCurrentIdx] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/photos')
      .then(r => r.json())
      .then(d => setMedia(d.items || []))
      .catch(() => {});
  }, []);

  // Slideshow auto-advance
  useEffect(() => {
    if (mode === 'slideshow' && media.length > 0) {
      timerRef.current = setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % media.length);
      }, 4000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [mode, currentIdx, media.length]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setCurrentIdx(prev => (prev + 1) % media.length);
      if (e.key === 'ArrowLeft') setCurrentIdx(prev => (prev - 1 + media.length) % media.length);
      if (e.key === ' ') { e.preventDefault(); setMode(m => m === 'collage' ? 'slideshow' : 'collage'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [media.length]);

  const weekLabel = getWeekLabel();

  if (media.length === 0) {
    return (
      <div style={styles.empty}>

        <p style={{ fontSize: '4rem' }}>📷</p>
        <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: 'white' }}>No photos this week yet!</h1>
      </div>
    );
  }

  return (
    <>
      <style>{presentStyles}</style>
      <div style={styles.container}>
        {mode === 'collage' ? (
          <>
            <h1 style={styles.title}>{weekLabel}</h1>
            <div className="tv-collage" style={{
              gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(media.length))}, 1fr)`,
            }}>
              {media.map((item, i) => (
                <div key={item.pathname} className="tv-cell" onClick={() => { setCurrentIdx(i); setMode('slideshow'); }}>
                  {item.type === 'video' ? (
                    <video src={item.url} muted playsInline />
                  ) : (
                    <img src={item.url} alt="" />
                  )}
                </div>
              ))}
            </div>
            <p style={styles.hint}>Tap a photo to start slideshow · Press Space to toggle</p>
          </>
        ) : (
          <div className="tv-slideshow" onClick={() => setCurrentIdx(prev => (prev + 1) % media.length)}>
            {media[currentIdx]?.type === 'video' ? (
              <video src={media[currentIdx].url} controls autoPlay playsInline />
            ) : (
              <img src={media[currentIdx]?.url} alt="" />
            )}
            <div style={styles.counter}>{currentIdx + 1} / {media.length}</div>
            <p style={styles.hint}>Tap to advance · Press Space for collage view</p>
          </div>
        )}
      </div>
    </>
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
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Quicksand, sans-serif',
    fontWeight: 600,
  },
};

