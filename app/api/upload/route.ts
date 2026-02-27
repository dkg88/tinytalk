import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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
    const relPath = `uploads/weeks/${week}/${filename}`;
    const absDir = path.join(process.cwd(), 'public', 'uploads', 'weeks', week);

    await mkdir(absDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(absDir, filename), buffer);

    const item = {
      url: `/${relPath}`,
      pathname: `weeks/${week}/${filename}`,
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
