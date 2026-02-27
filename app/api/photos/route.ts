import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';

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
  const weekDir = path.join(process.cwd(), 'public', 'uploads', 'weeks', weekKey);

  try {
    const files = await readdir(weekDir);

    const items = await Promise.all(
      files
        .filter(f => !f.startsWith('.'))
        .map(async (f) => {
          const fileStat = await stat(path.join(weekDir, f));
          return {
            url: `/uploads/weeks/${weekKey}/${f}`,
            pathname: `weeks/${weekKey}/${f}`,
            type: f.startsWith('video_') ? 'video' : 'image',
            uploadedAt: fileStat.mtime.toISOString(),
            size: fileStat.size,
          };
        })
    );

    items.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

    return NextResponse.json({ items });
  } catch {
    // Directory doesn't exist yet — no photos
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
