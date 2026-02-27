import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const week = formData.get('week') as string;
    const type = formData.get('type') as string;

    if (!file || !week) {
      return NextResponse.json({ error: 'Missing file or week' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract EXIF capture date from images
    let capturedTs = Date.now();
    if (type !== 'video') {
      try {
        const metadata = await sharp(buffer).metadata();
        const exifDate = metadata.exif ? parseExifDate(metadata.exif) : null;
        if (exifDate) capturedTs = exifDate;
      } catch {
        // No EXIF or unreadable — fall back to upload time
      }
    }

    const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
    const filename = `${type}_${capturedTs}.${ext}`;
    const pathname = `weeks/${week}/${filename}`;

    const blob = await put(pathname, buffer, { access: 'public' });

    const item = {
      url: blob.url,
      pathname: blob.pathname,
      type: type || 'image',
      uploadedAt: new Date().toISOString(),
      capturedAt: new Date(capturedTs).toISOString(),
      size: file.size,
    };

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

/** Parse EXIF DateTimeOriginal from raw EXIF buffer. Returns ms timestamp or null. */
function parseExifDate(exifBuffer: Buffer): number | null {
  // EXIF date tags: DateTimeOriginal (0x9003), DateTimeDigitized (0x9004)
  // Format: "YYYY:MM:DD HH:MM:SS"
  const str = exifBuffer.toString('binary');
  const dateRegex = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
  const match = str.match(dateRegex);
  if (!match) return null;
  const [, year, month, day, hour, min, sec] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
  return isNaN(date.getTime()) ? null : date.getTime();
}
