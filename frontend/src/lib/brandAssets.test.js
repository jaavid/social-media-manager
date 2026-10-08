import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const root = path.resolve(__dirname, '../../public');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
test('install assets match declarations and maskable foreground stays inside the safe circle', async () => {
  expect(manifest.id).toBe('/'); expect(manifest.name).toContain('Ravinta');
  for (const icon of manifest.icons) {
    const file = path.join(root, icon.src); const metadata = await sharp(file).metadata();
    expect(`${metadata.width}x${metadata.height}`).toBe(icon.sizes);
    if (icon.purpose !== 'maskable') continue;
    expect(icon.src).toContain('maskable-');
    const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let foreground = 0, farthest = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const at = (y * info.width + x) * info.channels;
      if (data[at] > 100 && data[at + 1] > 150) {
        foreground++;
        farthest = Math.max(farthest, Math.hypot(x + .5 - info.width / 2, y + .5 - info.height / 2));
      }
    }
    expect(foreground).toBeGreaterThan(100);
    expect(farthest).toBeLessThan(info.width * .4);
  }
  expect((await sharp(path.join(root, 'apple-touch-icon.png')).metadata()).width).toBe(180);
  const og = await sharp(path.join(root, 'og-image.png')).metadata(); expect([og.width, og.height]).toEqual([1200, 630]);
  const ico = fs.readFileSync(path.join(root, 'favicon.ico')); expect(ico.readUInt16LE(2)).toBe(1); expect(ico.readUInt16LE(4)).toBe(3);
});
