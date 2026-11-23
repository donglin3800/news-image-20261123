// main.ts — "The World Today": a one-page newspaper front page that sums up
// Monday 23 November 2026 in five stories, all first reported on Sunday
// 22 November 2026. Node 22, standard library only, no network, fully
// deterministic: the same bytes on every run. Writes one 1024x1024 PNG.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows; bit 4 is the leftmost column.
// Designed fresh for this front page (uppercase, lowercase, digits, marks).
// ---------------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [0x00, 0x0e, 0x01, 0x0f, 0x11, 0x11, 0x0f],
  b: [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x1e],
  c: [0x00, 0x0e, 0x11, 0x10, 0x10, 0x11, 0x0e],
  d: [0x01, 0x01, 0x0d, 0x13, 0x11, 0x11, 0x0f],
  e: [0x00, 0x0e, 0x11, 0x1f, 0x10, 0x11, 0x0e],
  f: [0x06, 0x08, 0x08, 0x1e, 0x08, 0x08, 0x08],
  g: [0x00, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x11],
  i: [0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x11],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0x00, 0x1a, 0x15, 0x15, 0x15, 0x15, 0x15],
  n: [0x00, 0x16, 0x19, 0x11, 0x11, 0x11, 0x11],
  o: [0x00, 0x0e, 0x11, 0x11, 0x11, 0x11, 0x0e],
  p: [0x00, 0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10],
  q: [0x00, 0x0d, 0x13, 0x11, 0x0f, 0x01, 0x01],
  r: [0x00, 0x16, 0x19, 0x10, 0x10, 0x10, 0x10],
  s: [0x00, 0x0f, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  t: [0x08, 0x08, 0x1e, 0x08, 0x08, 0x09, 0x06],
  u: [0x00, 0x11, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0x00, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0x00, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  x: [0x00, 0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0x00, 0x11, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0x00, 0x1f, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  "—": [0, 0, 0, 0x1f, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "’": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "•": [0, 0x0c, 0x0c, 0x0c, 0, 0, 0],
  "·": [0, 0, 0, 0x0c, 0x0c, 0, 0],
};

// ---------------------------------------------------------------------------
// Canvas: an RGB buffer with tiny drawing primitives.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 227];
const INK: RGB = [25, 25, 25];
const RED: RGB = [158, 27, 27];
const NAVY: RGB = [31, 58, 95];
const TEAL: RGB = [15, 91, 77];
const GOLD: RGB = [176, 124, 22];
const GREY: RGB = [107, 101, 88];
const WHITE: RGB = [255, 255, 255];
const SKY: RGB = [214, 228, 240];
const SEA: RGB = [70, 120, 170];
const LAND: RGB = [96, 150, 90];
const FLAME: RGB = [224, 110, 30];
const FLAME2: RGB = [240, 180, 40];

const px = new Uint8Array(W * H * 3);

function setPixel(x: number, y: number, c: RGB): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
      setPixel(xx, yy, c);
    }
  }
}

function hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
  for (let t2 = 0; t2 < t; t2++) fillRect(Math.min(x0, x1), y + t2, Math.abs(x1 - x0), 1, c);
}

function vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
  for (let t2 = 0; t2 < t; t2++) fillRect(x + t2, Math.min(y0, y1), 1, Math.abs(y1 - y0), c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  // Round endpoints first: fractional starts plus integer steps can never
  // reach an exact-equality stop, so the march would run away.
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  const steps = dx - dy + 1;
  for (let guard = 0; guard < steps; guard++) {
    fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) setPixel(cx + x, cy + y, c);
  }
}

function circleOutline(cx: number, cy: number, r: number, c: RGB, t = 1): void {
  for (let a = 0; a < 720; a++) {
    const rad = (a * Math.PI) / 360;
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));
    fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
  }
}

function fillPoly(points: [number, number][], c: RGB): void {
  // Even-odd scanline fill.
  let minY = H;
  let maxY = 0;
  for (const [, y] of points) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(Math.round(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0)));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, xs[k]); x <= Math.min(W - 1, xs[k + 1]); x++) {
        setPixel(x, y, c);
      }
    }
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const half = Math.floor(rx * Math.sqrt(t));
    for (let x = -half; x <= half; x++) setPixel(cx + x, cy + y, c);
  }
}

// ---------------------------------------------------------------------------
// Text: measure, wrap, draw.
// ---------------------------------------------------------------------------
function textWidth(text: string, scale: number): number {
  let w = 0;
  for (const ch of text) {
    if (FONT[ch]) w += 6 * scale;
    else w += 6 * scale; // unknown glyph: blank advance
  }
  return w > 0 ? w - scale : 0; // no trailing gap
}

function drawText(x: number, y: number, text: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of text) {
    const g = FONT[ch];
    if (g) {
      for (let row = 0; row < 7; row++) {
        const bits = g[row];
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            fillRect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentred(cx: number, y: number, text: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(text, scale) / 2), y, text, scale, c);
}

function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxWidth) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawPara(x: number, y: number, text: string, maxWidth: number, scale: number, c: RGB, leading: number): number {
  const lines = wrapText(text, maxWidth, scale);
  for (let i = 0; i < lines.length; i++) {
    drawText(x, y + i * leading, lines[i], scale, c);
  }
  return y + lines.length * leading;
}

// ---------------------------------------------------------------------------
// PNG encoding: filter-0 scanlines, zlib level 9, fixed CRC table.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Illustrations: small flat scenes drawn with the primitives above.
// ---------------------------------------------------------------------------

// Lead art: a globe with a jagged crack — the climate talks broke apart.
function drawGlobe(x: number, y: number, r: number): void {
  fillRect(x - r - 14, y - r - 14, 2 * r + 28, 2 * r + 28, SKY);
  hline(x - r - 14, x + r + 14, y - r - 14, NAVY, 3);
  hline(x - r - 14, x + r + 14, y + r + 14, NAVY, 3);
  vline(x - r - 14, y - r - 14, y + r + 14, NAVY, 3);
  vline(x + r + 14, y - r - 14, y + r + 14, NAVY, 3);
  fillCircle(x, y, r, SEA);
  // Land masses, clipped roughly inside the disc.
  fillEllipse(x - r * 0.42, y - r * 0.35, Math.floor(r * 0.34), Math.floor(r * 0.26), LAND);
  fillEllipse(x + r * 0.45, y + r * 0.15, Math.floor(r * 0.3), Math.floor(r * 0.42), LAND);
  fillEllipse(x - r * 0.1, y + r * 0.55, Math.floor(r * 0.3), Math.floor(r * 0.2), LAND);
  fillEllipse(x + r * 0.5, y - r * 0.55, Math.floor(r * 0.2), Math.floor(r * 0.18), LAND);
  // Meridians and equator.
  circleOutline(x, y, r, NAVY, 3);
  for (let k = -2; k <= 2; k++) {
    const rx = Math.floor((r * Math.abs(k)) / 3);
    if (rx > 4) {
      for (let yy = -r; yy <= r; yy += 2) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy)));
        const xx = Math.floor((half * rx) / r);
        setPixel(x + xx, y + yy, WHITE);
        setPixel(x - xx, y + yy, WHITE);
      }
    }
  }
  hline(x - r, x + r, y, WHITE, 2);
  // The crack: a red zigzag splitting the globe.
  const crack: [number, number][] = [
    [x - r * 0.7, y - r * 0.95],
    [x - r * 0.35, y - r * 0.4],
    [x - r * 0.55, y - r * 0.05],
    [x - r * 0.1, y + r * 0.3],
    [x - r * 0.3, y + r * 0.65],
    [x + r * 0.05, y + r * 0.95],
  ];
  for (let i = 0; i + 1 < crack.length; i++) {
    line(crack[i][0], crack[i][1], crack[i + 1][0], crack[i + 1][1], RED, 5);
  }
  fillCircle(x - r * 0.7, y - r * 0.95, 7, RED);
}

// Warship at sea, hit and burning.
function drawShip(x: number, y: number, s: number): void {
  // s scales the 100x70 scene.
  const X = (dx: number) => x + Math.floor(dx * s);
  const Y = (dy: number) => y + Math.floor(dy * s);
  fillRect(X(0), Y(0), Math.floor(100 * s), Math.floor(70 * s), SKY);
  // Sea.
  fillRect(X(0), Y(52), Math.floor(100 * s), Math.floor(18 * s), SEA);
  for (let i = 0; i < 4; i++) {
    hline(X(6 + i * 22), X(20 + i * 22), Y(58 + (i % 2) * 5), WHITE, 2);
  }
  // Hull.
  fillPoly(
    [
      [X(12), Y(34)],
      [X(88), Y(34)],
      [X(80), Y(52)],
      [X(20), Y(52)],
    ],
    NAVY
  );
  // Deck house and mast.
  fillRect(X(40), Y(22), Math.floor(22 * s), Math.floor(12 * s), NAVY);
  vline(X(52), Y(6), Y(22), INK, 3);
  // Funnel with smoke.
  fillRect(X(66), Y(20), Math.floor(8 * s), Math.floor(14 * s), INK);
  fillCircle(X(70), Y(14), Math.floor(5 * s), GREY);
  fillCircle(X(76), Y(8), Math.floor(4 * s), GREY);
  // Explosion starburst at the bow.
  const cx = X(84);
  const cy = Y(26);
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    const x1 = Math.round(cx + 16 * s * Math.cos(rad));
    const y1 = Math.round(cy + 16 * s * Math.sin(rad));
    line(cx, cy, x1, y1, FLAME, 3);
  }
  fillCircle(cx, cy, Math.floor(7 * s), FLAME2);
  fillCircle(cx, cy, Math.floor(4 * s), RED);
}

// Missiles streaking up, one burst.
function drawMissiles(x: number, y: number, s: number): void {
  const X = (dx: number) => x + Math.floor(dx * s);
  const Y = (dy: number) => y + Math.floor(dy * s);
  fillRect(X(0), Y(0), Math.floor(100 * s), Math.floor(70 * s), SKY);
  fillRect(X(0), Y(58), Math.floor(100 * s), Math.floor(12 * s), LAND);
  // Three missile trails.
  const trails: [number, number, number, number][] = [
    [18, 58, 30, 16],
    [48, 58, 50, 8],
    [78, 58, 66, 20],
  ];
  for (const [x0, y0, x1, y1] of trails) {
    line(X(x0), Y(y0), X(x1), Y(y1), GREY, 2);
    fillPoly(
      [
        [X(x1) - 3, Y(y1) + 8],
        [X(x1) + 3, Y(y1) + 8],
        [X(x1), Y(y1) - 2],
      ],
      INK
    );
  }
  // Burst at the top missile.
  const cx = X(50);
  const cy = Y(8);
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    line(cx, cy, Math.round(cx + 12 * s * Math.cos(rad)), Math.round(cy + 12 * s * Math.sin(rad)), FLAME, 3);
  }
  fillCircle(cx, cy, Math.floor(5 * s), FLAME2);
}

// A house on fire.
function drawFire(x: number, y: number, s: number): void {
  const X = (dx: number) => x + Math.floor(dx * s);
  const Y = (dy: number) => y + Math.floor(dy * s);
  fillRect(X(0), Y(0), Math.floor(100 * s), Math.floor(70 * s), SKY);
  fillRect(X(0), Y(58), Math.floor(100 * s), Math.floor(12 * s), LAND);
  // House.
  fillPoly(
    [
      [X(22), Y(30)],
      [X(50), Y(12)],
      [X(78), Y(30)],
    ],
    RED
  );
  fillRect(X(26), Y(30), Math.floor(48 * s), Math.floor(28 * s), NAVY);
  fillRect(X(44), Y(42), Math.floor(12 * s), Math.floor(16 * s), GOLD);
  fillRect(X(30), Y(34), Math.floor(8 * s), Math.floor(8 * s), WHITE);
  fillRect(X(62), Y(34), Math.floor(8 * s), Math.floor(8 * s), WHITE);
  // Flames above the roof.
  const flame = (cx: number, cy: number, r: number) => {
    fillPoly(
      [
        [cx - r, cy + r],
        [cx - Math.floor(r * 0.6), cy - r],
        [cx, cy - Math.floor(r * 1.8)],
        [cx + Math.floor(r * 0.6), cy - r],
        [cx + r, cy + r],
      ],
      FLAME
    );
    fillPoly(
      [
        [cx - Math.floor(r * 0.5), cy + Math.floor(r * 0.6)],
        [cx, cy - r],
        [cx + Math.floor(r * 0.5), cy + Math.floor(r * 0.6)],
      ],
      FLAME2
    );
  };
  flame(X(38), Y(14), Math.floor(8 * s));
  flame(X(58), Y(10), Math.floor(10 * s));
  // Smoke.
  fillCircle(X(74), Y(6), Math.floor(4 * s), GREY);
  fillCircle(X(80), Y(2), Math.floor(3 * s), GREY);
}

// A capitol dome.
function drawDome(x: number, y: number, s: number): void {
  const X = (dx: number) => x + Math.floor(dx * s);
  const Y = (dy: number) => y + Math.floor(dy * s);
  fillRect(X(0), Y(0), Math.floor(100 * s), Math.floor(70 * s), SKY);
  fillRect(X(0), Y(58), Math.floor(100 * s), Math.floor(12 * s), LAND);
  // Dome.
  fillPoly(
    [
      [X(28), Y(40)],
      [X(28), Y(30)],
      [X(36), Y(20)],
      [X(50), Y(14)],
      [X(64), Y(20)],
      [X(72), Y(30)],
      [X(72), Y(40)],
    ],
    WHITE
  );
  vline(X(50), Y(6), Y(14), INK, 2);
  fillRect(X(47), Y(4), Math.floor(6 * s), Math.floor(4 * s), RED);
  // Drum and columns.
  fillRect(X(26), Y(40), Math.floor(48 * s), Math.floor(6 * s), WHITE);
  for (let i = 0; i < 5; i++) {
    fillRect(X(28 + i * 10), Y(46), Math.floor(4 * s), Math.floor(12 * s), WHITE);
  }
  fillRect(X(22), Y(58), Math.floor(56 * s), Math.floor(4 * s), WHITE);
  // Wings.
  fillRect(X(8), Y(50), Math.floor(14 * s), Math.floor(8 * s), WHITE);
  fillRect(X(78), Y(50), Math.floor(14 * s), Math.floor(8 * s), WHITE);
}

// ---------------------------------------------------------------------------
// The five stories. Every one was first reported on Sunday 22 November 2026
// (Reuters, UN News, the Institute for the Study of War, CNN); this is the
// Monday paper, so the front page is dated Monday 23 November 2026.
// ---------------------------------------------------------------------------
interface Story {
  kicker: string;
  headline: string;
  summary: string;
  art: "ship" | "missiles" | "fire" | "dome";
}

const STORIES: Story[] = [
  {
    kicker: "WAR AT SEA — LIBYA",
    headline: "UKRAINE SINKS RUSSIAN WARSHIP",
    summary:
      "Sea drones hit the corvette Merkury off Benghazi; the ship capsized and sank. A second Russian-linked cargo ship was struck too.",
    art: "ship",
  },
  {
    kicker: "UKRAINE — KYIV",
    headline: "165 MISSILES IN A WEEK",
    summary:
      "Zelensky says US delays on Patriot missiles are 'difficult to understand' as Russia pounds Ukraine; a drone strike near Kyiv kills three.",
    art: "missiles",
  },
  {
    kicker: "ISRAEL — RAMALLAH",
    headline: "WEST BANK ARSON",
    summary:
      "Settlers torch cars and homes in four villages overnight. Eisenkot, tapped to form a government, calls it 'Jewish terrorism'.",
    art: "fire",
  },
  {
    kicker: "WASHINGTON",
    headline: "DEMOCRATS TAKE THE SENATE",
    summary:
      "Schumer led Democrats to a big Senate win — then faced a leadership challenge from Van Hollen ahead of a 1 December vote.",
    art: "dome",
  },
];

function drawArt(kind: Story["art"], x: number, y: number): void {
  if (kind === "ship") drawShip(x, y, 1);
  else if (kind === "missiles") drawMissiles(x, y, 1);
  else if (kind === "fire") drawFire(x, y, 1);
  else drawDome(x, y, 1);
}

// ---------------------------------------------------------------------------
// Layout: a broadsheet front page, 1024 x 1024.
// ---------------------------------------------------------------------------
function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  // Page border.
  hline(12, 1012, 12, INK, 2);
  hline(12, 1012, 1011, INK, 2);
  vline(12, 12, 1011, INK, 2);
  vline(1011, 12, 1011, INK, 2);

  // Masthead.
  drawTextCentred(512, 30, "THE WORLD TODAY", 8, INK);
  hline(32, 992, 100, INK, 3);
  hline(32, 992, 106, INK, 1);
  drawText(32, 116, "MONDAY, 23 NOVEMBER 2026", 2, INK);
  const rightTag = "FIVE STORIES - ONE DAY";
  drawText(992 - textWidth(rightTag, 2), 116, rightTag, 2, RED);
  hline(32, 992, 138, INK, 2);

  // Lead story: COP31.
  const LX = 32;
  const LW = 600;
  drawText(LX, 156, "CLIMATE SUMMIT - ANTALYA, TURKIYE", 2, RED);
  drawText(LX, 182, "COP31 COLLAPSES:", 5, INK);
  drawText(LX, 228, "NO CLIMATE PACT", 5, INK);
  drawPara(
    LX,
    292,
    "After a record two days of overtime, the EU and others reject a draft that never mentions fossil fuels. UN chief Guterres is 'deeply disappointed'.",
    LW,
    2,
    INK,
    20
  );
  drawText(LX, 392, "THE LONGEST COP ON RECORD ENDS WITH NO DEAL.", 2, NAVY);
  drawText(LX, 424, "200 NATIONS - 2 DAYS OVERTIME - 1.5C LIMIT AT RISK", 2, RED);
  // Lead art on the right, separated by a rule.
  vline(668, 156, 470, GREY, 1);
  drawGlobe(830, 310, 95);
  drawTextCentred(830, 428, "ANTALYA, TURKIYE", 2, GREY);

  // In brief strip.
  hline(32, 992, 486, INK, 1);
  drawPara(
    32,
    498,
    "IN BRIEF: Russian cargo ship Sparta II still burns off Finland - South Korea's education minister quits in AI cheating scandal - Thousands march in Lisbon over living costs.",
    960,
    2,
    INK,
    19
  );

  // Four stories in a 2 x 2 grid.
  hline(32, 992, 556, INK, 3);
  const cellW = 470;
  const cellH = 186;
  const colX = [32, 522];
  const rowY = [574, 772];
  for (let i = 0; i < 4; i++) {
    const cx = colX[i % 2];
    const cy = rowY[Math.floor(i / 2)];
    const st = STORIES[i];
    drawArt(st.art, cx, cy);
    drawTextCentred(cx + 50, cy + 78, "22 NOV", 2, GREY);
    const tx = cx + 118;
    const tw = cellW - 118;
    drawText(tx, cy, st.kicker, 2, RED);
    const headLines = wrapText(st.headline, tw, 3);
    for (let li = 0; li < headLines.length; li++) {
      drawText(tx, cy + 22 + li * 26, headLines[li], 3, INK);
    }
    drawPara(tx, cy + 22 + headLines.length * 26 + 10, st.summary, tw, 2, INK, 19);
  }
  // Grid dividers.
  vline(512, 574, 958, GREY, 1);
  hline(32, 992, 766, GREY, 1);

  // Footer: sources and the dating note.
  hline(32, 992, 1010 - 44, INK, 2);
  drawTextCentred(
    512,
    978,
    "SOURCES: REUTERS - UN NEWS - INSTITUTE FOR THE STUDY OF WAR - CNN",
    2,
    GREY
  );
  drawTextCentred(512, 996, "ALL FIVE STORIES FIRST REPORTED SUNDAY 22 NOVEMBER 2026", 2, GREY);
}

function main(): void {
  drawPage();
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
