// Export the checked-in geometric master; no generated or outlined wordmark.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const master = fs.readFileSync(path.join(root, '../docs/brand/ravinta/assets/app-icon.svg'), 'utf8');
async function exportAssets() {
  const publicDir = path.join(root, 'public');
  for (const size of [192, 512]) {
    await sharp(Buffer.from(master)).resize(size, size).png().toFile(path.join(publicDir, `icons/icon-${size}.png`));
    // Full-bleed background. Master foreground bounds fit inside the 80% safe circle.
    const maskable = master.replace('<title>', '<rect width="128" height="128" fill="#123D3A"/><title>');
    await sharp(Buffer.from(maskable)).resize(size, size).png().toFile(path.join(publicDir, `icons/maskable-${size}.png`));
  }
  await sharp(Buffer.from(master)).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(Buffer.from(master)).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));
  const icons = await Promise.all([16, 32, 48].map(size => sharp(Buffer.from(master)).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + 16 * icons.length); header.writeUInt16LE(1, 2); header.writeUInt16LE(icons.length, 4);
  let offset = header.length;
  icons.forEach((icon, i) => { const at = 6 + 16 * i, size = [16, 32, 48][i]; header[at] = size; header[at + 1] = size; header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6); header.writeUInt32LE(icon.length, at + 8); header.writeUInt32LE(offset, at + 12); offset += icon.length; });
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, ...icons]));
  const image = await sharp(Buffer.from(master)).resize(320, 320).png().toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#F7F9F8' } }).composite([{ input: image, left: 440, top: 155 }]).png().toFile(path.join(publicDir, 'og-image.png'));
}
exportAssets().catch(error => { console.error(error.message); process.exitCode = 1; });
