/**
 * 純 Node.js PNG 圖示產生器（無外部依賴）
 * 執行: node generate_icons.cjs
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// CRC32 查表
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function uint32BE(n) {
  return Buffer.from([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]);
}

function pngChunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const lenB  = uint32BE(data.length);
  const crcB  = uint32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function makePNG(size, r, g, b) {
  // PNG 簽名
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR：width, height, 8bit, RGB, deflate, default, no interlace
  const ihdr = Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 2, 0, 0, 0])
  ]);

  // 圖像資料：每 row 加 filter byte 0（None）
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0; // filter type
  for (let x = 0; x < size; x++) {
    row[1 + x * 3]     = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array(size).fill(row));
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const iend = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', iend)
  ]);
}

const outDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 藍色（#3b82f6 = rgb(59,130,246)）純色方塊暫用圖示
fs.writeFileSync(path.join(outDir, 'icon-192.png'), makePNG(192, 59, 130, 246));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makePNG(512, 59, 130, 246));

console.log('✅ 已產生 icon-192.png 和 icon-512.png（藍色暫用圖，可替換成正式設計）');
