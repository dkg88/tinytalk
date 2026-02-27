import { NextRequest, NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';

function getWeekKey(): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get('week') || getWeekKey();
  const prefix = `weeks/${week}/theme.json`;

  try {
    const { blobs } = await list({ prefix });
    const themeBlob = blobs.find(b => b.pathname === `weeks/${week}/theme.json`);

    if (!themeBlob) {
      return NextResponse.json({ theme: 'none' });
    }

    const res = await fetch(themeBlob.url);
    const data = await res.json();
    return NextResponse.json({ theme: data.theme || 'none' });
  } catch {
    return NextResponse.json({ theme: 'none' });
  }
}

export async function POST(request: NextRequest) {
  const { week, theme } = await request.json();
  const weekKey = week || getWeekKey();
  const pathname = `weeks/${weekKey}/theme.json`;

  try {
    await put(pathname, JSON.stringify({ theme }), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
    return NextResponse.json({ ok: true, theme });
  } catch {
    return NextResponse.json({ error: 'Failed to save theme' }, { status: 500 });
  }
}
