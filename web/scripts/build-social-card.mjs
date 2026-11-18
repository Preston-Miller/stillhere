import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const photo = await sharp(fileURLToPath(new URL('public/hero-photo.jpg', root)))
  .resize(1200, 630, { fit: 'cover', position: 'left' }).toBuffer();
const overlay = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="shade"><stop offset="0" stop-color="#0b0e0a" stop-opacity=".22"/><stop offset=".44" stop-color="#0b0e0a" stop-opacity=".9"/><stop offset="1" stop-color="#0b0e0a"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#shade)"/>
<g font-family="Arial, Helvetica, sans-serif">
<text x="520" y="113" font-size="35" font-weight="700" fill="#f2efe5">OffGridAI</text>
<rect x="520" y="148" width="64" height="5" rx="2" fill="#dfae42"/>
<text x="520" y="248" font-size="66" font-weight="700" fill="#f2efe5">AI that works</text>
<text x="520" y="327" font-size="66" font-weight="700" fill="#dfae42">without internet.</text>
<text x="520" y="411" font-size="27" fill="#d1d1c7">Emergency guides. Offline maps.</text>
<text x="520" y="452" font-size="27" fill="#d1d1c7">An AI assistant on your Mac.</text>
<text x="520" y="560" font-size="23" fill="#aaa99c">offgridai.vercel.app</text>
</g></svg>`;
await sharp(photo).composite([{ input: Buffer.from(overlay) }]).png().toFile(fileURLToPath(new URL('public/social-preview-v1.png', root)));
