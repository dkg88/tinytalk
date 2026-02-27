import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get('pin');
  const week = searchParams.get('week');

  // PIN check
  if (pin !== undefined && pin !== null) {
    const correctPin = process.env.APP_PIN || '1234';
    if (pin !== correctPin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  }

  // List photos for a week
  const weekKey = week || getWeekKey();
  const prefix = `weeks/${weekKey}/`;

  try {
    const { blobs } = await list({ prefix });

    const items = blobs
      .filter(b => !b.pathname.endsWith('theme.json'))
      .map(b => {
        const filename = b.pathname.split('/').pop() || '';
        // Parse timestamp from filename (e.g. "image_1709123456789.jpg")
        const tsMatch = filename.match(/^(?:image|video)_(\d+)\./);
        const capturedTs = tsMatch ? Number(tsMatch[1]) : b.uploadedAt.getTime();
        return {
          url: b.url,
          pathname: b.pathname,
          type: filename.startsWith('video_') ? 'video' : 'image',
          uploadedAt: b.uploadedAt.toISOString(),
          capturedAt: new Date(capturedTs).toISOString(),
          size: b.size,
        };
      });

    items.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

function getWeekKey(): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}
