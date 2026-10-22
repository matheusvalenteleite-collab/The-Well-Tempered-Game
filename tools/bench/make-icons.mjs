// The bench's Home Screen icons (D195): an 8-bit emblem drawn from a pixel grid, no external art,
// written as PNGs by a small encoder (zlib + CRC-32, no dependencies).
// Usage: node tools/bench/make-icons.mjs  (writes public/bench-app/icon-{180,192,512}.png and icon-maskable-512.png)
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// touch.css's tokens: --tg-bg, --tg-box, --tg-barline, --tg-shine, the shadow red, --tg-fg.
const C = { bg: "#0b0d18", box: "#121530", line: "#353d78", shine: "#fff3a6", red: "#b8322a", fg: "#ecead9" };
// Two beamed quavers ("o", in shine, with a red shadow one pixel down-right) over a strip of keys.
const NOTE = [
  "....oooooooooo..",
  "....oooooooooo..",
  "....o........o..",
  "....o........o..",
  "....o........o..",
  "....o........o..",
  "..ooo......ooo..",
  ".oooo.....oooo..",
  ".oooo.....oooo..",
  "..oo.......oo...",
];
// Keys from C, a semitone a cell, 16 cells: the black keys (sharps) three cells tall over the white.
const BLACK_KEYS = [1, 3, 6, 8, 10, 13, 15];

/** The emblem as a grid of colours, 22 cells square. */
function grid() {
  const n = 22;
  const g = Array.from({ length: n }, () => Array(n).fill(C.box));
  for (let i = 0; i < n; i++) g[0][i] = g[n - 1][i] = g[i][0] = g[i][n - 1] = C.line; // the frame
  const ox = 3;
  const oy = 3;
  for (let y = 0; y < NOTE.length; y++)
    for (let x = 0; x < 16; x++) if (NOTE[y][x] === "o") g[oy + y + 1][ox + x + 1] = C.red;
  for (let y = 0; y < NOTE.length; y++)
    for (let x = 0; x < 16; x++) if (NOTE[y][x] === "o") g[oy + y][ox + x] = C.shine;
  // The keys: rows 15-19, black keys on the upper three rows; a red shadow below.
  for (let y = 15; y < 20; y++) for (let x = 0; x < 16; x++) g[y][ox + x] = C.fg;
  for (const x of BLACK_KEYS) for (let y = 15; y < 18; y++) g[y][ox + x] = C.bg;
  for (let x = 1; x < 17; x++) g[20][ox + x] = C.red;
  return g;
}

/** Paint the grid into a `size` square, the grid `fill` of the side, centred on --tg-bg. */
function render(size, fill) {
  const g = grid();
  const n = g.length;
  const side = size * fill;
  const off = (size - side) / 2;
  const rgb = Buffer.alloc(size * size * 3);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(((x + 0.5 - off) / side) * n);
      const gy = Math.floor(((y + 0.5 - off) / side) * n);
      const c = gx >= 0 && gy >= 0 && gx < n && gy < n ? g[gy][gx] : C.bg;
      hex(c).forEach((v, i) => (rgb[(y * size + x) * 3 + i] = v));
    }
  return png(size, size, rgb);
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** An 8-bit RGB PNG, unfiltered rows. */
function png(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const out = (f) => fileURLToPath(new URL(`../../public/bench-app/${f}`, import.meta.url));
// Full bleed for the plain icons (iOS and launchers round the corners); the maskable one keeps the
// emblem inside the central safe circle (80% of the side), on the background colour.
for (const [file, size, fill] of [
  ["icon-180.png", 180, 1],
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["icon-maskable-512.png", 512, 0.62],
]) {
  writeFileSync(out(file), render(size, fill));
  console.log(`wrote public/bench-app/${file}`);
}
