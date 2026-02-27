import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  const weeksDir = path.join(process.cwd(), 'public', 'uploads', 'weeks');

  try {
    const weekFolders = await readdir(weeksDir);

    const weeks = await Promise.all(
      weekFolders
        .filter(f => !f.startsWith('.'))
        .map(async (weekKey) => {
          const weekPath = path.join(weeksDir, weekKey);
          const files = await readdir(weekPath);
          const visibleFiles = files.filter(f => !f.startsWith('.'));

          return {
            weekKey,
            label: getWeekLabel(weekKey),
            items: visibleFiles.map(f => ({
              url: `/uploads/weeks/${weekKey}/${f}`,
              type: f.startsWith('video_') ? 'video' : 'image',
            })),
          };
        })
    );

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
