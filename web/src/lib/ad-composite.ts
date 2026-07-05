import sharp from "sharp";

/** Overlay a headline banner on a product image for social ad posts. */
export async function compositeAdHeadline(
  png: Buffer,
  headline: string,
): Promise<Buffer> {
  const image = sharp(png);
  const meta = await image.metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  const safe = headline
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .slice(0, 60);

  const bannerHeight = Math.max(72, Math.round(height * 0.14));
  const fontSize = Math.max(22, Math.round(bannerHeight * 0.42));

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="banner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#92400e"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${bannerHeight}" fill="url(#banner)"/>
      <text x="${width / 2}" y="${bannerHeight / 2 + fontSize * 0.35}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${fontSize}" font-weight="700"
            fill="#ffffff" text-anchor="middle">${safe}</text>
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
