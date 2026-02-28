import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate pathname format: weeks/{weekKey}/{type}_{timestamp}.{ext}
        if (!pathname.match(/^weeks\/\d{4}-\d{2}-\d{2}\/(image|video)_\d+\.\w+$/)) {
          throw new Error('Invalid upload path');
        }
        return {
          allowedContentTypes: ['image/*', 'video/*'],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
        };
      },
      onUploadCompleted: async () => {
        // Nothing needed — client handles state
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
