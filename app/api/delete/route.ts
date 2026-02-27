import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const { pathname } = await request.json();

    if (!pathname) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
    }

    // Find the blob by pathname prefix, then delete by URL
    const { blobs } = await list({ prefix: pathname });
    const blob = blobs.find(b => b.pathname === pathname);

    if (!blob) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await del(blob.url);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
