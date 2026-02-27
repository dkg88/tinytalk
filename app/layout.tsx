import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tiny Ted Talk',
  description: 'Weekly photo presentations by your little one',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  manifest: '/manifest.json',
  themeColor: '#FF6B6B',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tiny Ted Talk',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Quicksand:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
