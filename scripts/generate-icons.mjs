// Generate PWA icons for Tiny Talk
// Run: node scripts/generate-icons.mjs
// Requires: npm install sharp (temporary dev dep)

import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

function createSvg(size) {
  const micX = size / 2;
  const micTopY = size * 0.18;
  const micW = size * 0.13;
  const micH = size * 0.22;
  const arcR = size * 0.2;
  const arcY = micTopY + micH * 0.6;
  const stemTop = arcY + arcR;
  const stemBot = stemTop + size * 0.06;
  const baseW = size * 0.1;
  const sw = size * 0.04;
  const fontSize = size * 0.13;
  const textY = size * 0.82;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF6B6B"/>
      <stop offset="100%" stop-color="#FF8E8E"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <rect x="${micX - micW}" y="${micTopY}" width="${micW * 2}" height="${micH}" rx="${micW}" fill="white"/>
  <path d="M${micX - arcR} ${arcY} A${arcR} ${arcR} 0 0 0 ${micX + arcR} ${arcY}" fill="none" stroke="white" stroke-width="${sw}" stroke-linecap="round"/>
  <line x1="${micX}" y1="${stemTop}" x2="${micX}" y2="${stemBot}" stroke="white" stroke-width="${sw}" stroke-linecap="round"/>
  <line x1="${micX - baseW}" y1="${stemBot}" x2="${micX + baseW}" y2="${stemBot}" stroke="white" stroke-width="${sw}" stroke-linecap="round"/>
  <text x="${micX}" y="${textY}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="${fontSize}" fill="white">Tiny Talk</text>
</svg>`;
}

for (const size of [192, 512]) {
  const svg = createSvg(size);
  const path = join(publicDir, `icon-${size}.png`);
  await sharp(Buffer.from(svg)).png().toFile(path);
  console.log(`Generated ${path}`);
}
