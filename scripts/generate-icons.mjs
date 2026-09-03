/**
 * Generates the PWA icon PNGs from a tiny shape description (no image deps).
 * Run with: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';

const GREEN = [58, 158, 91];   // oklch(58% 0.15 148) ≈ #3A9E5B
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size);
      raw[p++] = r; raw[p++] = g; raw[p++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A white camera mark on the brand green, full-bleed so it is maskable-safe. */
function mark(x, y, size) {
  const u = size / 100;              // 100-unit design grid
  const gx = x / u, gy = y / u;

  const inRoundRect = (l, t, r, b, rad) => {
    if (gx < l || gx > r || gy < t || gy > b) return false;
    const cx = Math.min(Math.max(gx, l + rad), r - rad);
    const cy = Math.min(Math.max(gy, t + rad), b - rad);
    return (gx - cx) ** 2 + (gy - cy) ** 2 <= rad * rad;
  };
  const inCircle = (cx, cy, rad) => (gx - cx) ** 2 + (gy - cy) ** 2 <= rad * rad;

  // camera body + viewfinder bump
  const body = inRoundRect(22, 36, 78, 72, 8) || inRoundRect(38, 29, 56, 40, 4);
  if (!body) return GREEN;
  // lens: green ring knocked out of the white body
  if (inCircle(50, 54, 13)) return inCircle(50, 54, 8.5) ? GREEN : WHITE;
  return WHITE;
}

for (const size of [180, 192, 512]) {
  writeFileSync(new URL(`../public/icons/icon-${size}.png`, import.meta.url), png(size, mark));
  console.log(`public/icons/icon-${size}.png`);
}
