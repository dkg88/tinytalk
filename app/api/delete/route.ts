import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { pathname } = await request.json();

    if (!pathname) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
    }

    // pathname is like "weeks/2025-02-23/image_123.jpg"
    const absPath = path.join(process.cwd(), 'public', 'uploads', pathname);

    // Prevent path traversal
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!absPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    await unlink(absPath);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
