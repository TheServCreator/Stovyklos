import sharp from 'sharp';
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PUBLIC_DIR = 'public';
const MAX_DIM = 1200;
const JPEG_QUALITY = 78;
const PNG_QUALITY = 80;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

const files = (await walk(PUBLIC_DIR)).filter(f => /\.(jpe?g|png)$/i.test(f));

let totalBefore = 0, totalAfter = 0;
for (const file of files) {
  const beforeBytes = (await stat(file)).size;
  totalBefore += beforeBytes;

  const buf = await readFile(file);
  const img = sharp(buf, { failOnError: false });
  const meta = await img.metadata();
  const ext = extname(file).toLowerCase();

  let pipeline = img;
  const needsResize = (meta.width || 0) > MAX_DIM || (meta.height || 0) > MAX_DIM;
  if (needsResize) {
    pipeline = pipeline.resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });
  }

  if (ext === '.png') {
    pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9, palette: true });
  } else {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  }

  const out = await pipeline.toBuffer();

  if (out.length < beforeBytes * 0.95) {
    await writeFile(file, out);
    totalAfter += out.length;
    const pct = ((1 - out.length / beforeBytes) * 100).toFixed(0);
    console.log(`${file}: ${(beforeBytes/1024).toFixed(0)}KB -> ${(out.length/1024).toFixed(0)}KB (-${pct}%)`);
  } else {
    totalAfter += beforeBytes;
    console.log(`${file}: skipped (already optimal)`);
  }
}

console.log(`\nTotal: ${(totalBefore/1024/1024).toFixed(1)}MB -> ${(totalAfter/1024/1024).toFixed(1)}MB`);
