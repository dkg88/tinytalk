import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const week = formData.get('week') as string;
    const type = formData.get('type') as string;

    if (!file || !week) {
      return NextResponse.json({ error: 'Missing file or week' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
    const filename = `${type}_${Date.now()}.${ext}`;
    const pathname = `weeks/${week}/${filename}`;

    const blob = await put(pathname, file, { access: 'public' });

    const item = {
      url: blob.url,
      pathname: blob.pathname,
      type: type || 'image',
      uploadedAt: new Date().toISOString(),
      size: file.size,
    };

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
