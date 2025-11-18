import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');

// Create SVG with thought bubble emoji and background
const svg192 = `
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#4f46e5" rx="45"/>
  <text x="96" y="120" font-size="100" text-anchor="middle" font-family="system-ui" dominant-baseline="middle">💭</text>
</svg>
`;

const svg512 = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#4f46e5" rx="120"/>
  <text x="256" y="320" font-size="280" text-anchor="middle" font-family="system-ui" dominant-baseline="middle">💭</text>
</svg>
`;

// Generate 192x192 icon
sharp(Buffer.from(svg192))
  .png()
  .toFile(path.join(publicDir, 'icon-192x192.png'))
  .then(() => console.log('Generated icon-192x192.png'))
  .catch(err => console.error('Error generating 192x192:', err));

// Generate 512x512 icon
sharp(Buffer.from(svg512))
  .png()
  .toFile(path.join(publicDir, 'icon-512x512.png'))
  .then(() => console.log('Generated icon-512x512.png'))
  .catch(err => console.error('Error generating 512x512:', err));
