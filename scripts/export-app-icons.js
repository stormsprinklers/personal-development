const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const src =
  "C:/Users/jgree/.cursor/projects/c-Users-jgree-OneDrive-Desktop-Personal-Development/assets/icon-1024-glossy.png";
const outDir = path.join(__dirname, "..", "public");

async function main() {
  const meta = await sharp(src).metadata();
  console.log("source", meta.width, meta.height, meta.format);

  const buf1024 = await sharp(src)
    .resize(1024, 1024, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  await sharp(buf1024).toFile(path.join(outDir, "icons/icon-1024.png"));
  await sharp(buf1024).toFile(path.join(outDir, "icons/icon-source.png"));
  await sharp(buf1024).resize(512, 512).png().toFile(path.join(outDir, "icons/icon-512.png"));
  await sharp(buf1024).resize(192, 192).png().toFile(path.join(outDir, "icons/icon-192.png"));
  await sharp(buf1024).resize(180, 180).png().toFile(path.join(outDir, "icons/icon-180.png"));
  await sharp(buf1024).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="PD Hub">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5AC8FA"/>
      <stop offset="100%" stop-color="#0A84FF"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="240" fill="url(#gloss)"/>
  <g fill="#ffffff">
    <circle cx="256" cy="256" r="72"/>
    <rect x="244" y="96" width="24" height="56" rx="12"/>
    <rect x="244" y="360" width="24" height="56" rx="12"/>
    <rect x="96" y="244" width="56" height="24" rx="12"/>
    <rect x="360" y="244" width="56" height="24" rx="12"/>
    <g transform="rotate(45 256 256)">
      <rect x="244" y="96" width="24" height="56" rx="12"/>
      <rect x="244" y="360" width="24" height="56" rx="12"/>
      <rect x="96" y="244" width="56" height="24" rx="12"/>
      <rect x="360" y="244" width="56" height="24" rx="12"/>
    </g>
  </g>
</svg>
`;
  fs.writeFileSync(path.join(outDir, "icon.svg"), svg);
  console.log("wrote icons");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
