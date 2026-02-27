import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

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
  const themePath = path.join(process.cwd(), 'public', 'uploads', 'weeks', week, 'theme.json');

  try {
    const data = JSON.parse(await readFile(themePath, 'utf-8'));
    return NextResponse.json({ theme: data.theme || 'none' });
  } catch {
    return NextResponse.json({ theme: 'none' });
  }
}

export async function POST(request: NextRequest) {
  const { week, theme } = await request.json();
  const weekKey = week || getWeekKey();
  const weekDir = path.join(process.cwd(), 'public', 'uploads', 'weeks', weekKey);
  const themePath = path.join(weekDir, 'theme.json');

  try {
    await mkdir(weekDir, { recursive: true });
    await writeFile(themePath, JSON.stringify({ theme }), 'utf-8');
    return NextResponse.json({ ok: true, theme });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save theme' }, { status: 500 });
  }
}
