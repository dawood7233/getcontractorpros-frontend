const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(__dirname, '../public/assets/images');
const thumbs = path.join(dir, 'thumbs');
fs.mkdirSync(thumbs, { recursive: true });

const cards = [
  'solar-image3.webp',
  'windows.webp',
  'roofing-image.webp',
  'HVAC-img.webp',
  'Painting-img.webp',
  'Plumbing-img.webp',
  'Gutters-img.webp',
  'Homesecurity-img.webp',
  'Kitchen-img.webp',
  'Siding-img.webp',
  'Bathroom-img.webp',
  'Fencing-img.webp',
  'Flooring-img.webp',
];

async function writeCopy(srcName, destName, width, quality) {
  const src = path.join(dir, srcName);
  if (!fs.existsSync(src)) return;
  const dest = path.join(dir, destName);
  await sharp(src)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toFile(dest);
  console.log(destName, Math.round(fs.statSync(dest).size / 1024) + 'KB');
}

async function main() {
  for (const file of cards) {
    const src = path.join(dir, file);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(thumbs, file);
    await sharp(src)
      .rotate()
      .resize(640, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 70 })
      .toFile(dest);
    console.log('thumb', file, Math.round(fs.statSync(dest).size / 1024) + 'KB');
  }

  await writeCopy('banner.webp', 'banner-sm.webp', 1600, 68);
  await writeCopy('banner-2.webp', 'banner-2-sm.webp', 1600, 68);
  await writeCopy('home-1.webp', 'home-1-sm.webp', 900, 72);
  await writeCopy('about.webp', 'about-sm.webp', 1000, 72);
  await writeCopy('HVAC-img.webp', 'HVAC-sm.webp', 1000, 72);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
