'use client';

import { useEffect, useState } from 'react';

export function PWAProvider() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration failed:', err);
      });
    }

    // Offline detection
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    setOffline(!navigator.onLine);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={`offline-banner${offline ? ' visible' : ''}`}>
      You&apos;re offline — uploads and photos need a connection
    </div>
  );
}
