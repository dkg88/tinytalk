import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'weeks/' });

    // Group blobs by week key
    const weekMap = new Map<string, { url: string; type: string }[]>();

    for (const blob of blobs) {
      // pathname: "weeks/{weekKey}/{filename}"
      const parts = blob.pathname.split('/');
      if (parts.length < 3) continue;

      const weekKey = parts[1];
      const filename = parts[2];

      // Skip theme config files
      if (filename === 'theme.json') continue;

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push({
        url: blob.url,
        type: filename.startsWith('video_') ? 'video' : 'image',
      });
    }

    const weeks = Array.from(weekMap.entries()).map(([weekKey, items]) => ({
      weekKey,
      label: getWeekLabel(weekKey),
      items,
    }));

    weeks.sort((a, b) => b.weekKey.localeCompare(a.weekKey));

    return NextResponse.json({ weeks });
  } catch {
    return NextResponse.json({ weeks: [] });
  }
}

function getWeekLabel(weekKey: string): string {
  const start = new Date(weekKey + 'T00:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `Week of ${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}
