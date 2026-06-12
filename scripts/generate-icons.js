"use strict";
const puppeteer = require("puppeteer");
const path = require("path");

const SWALLOW_PATH =
  "M60 36 C72 26 92 20 110 22 C96 34 80 46 66 54 C65 58 64 62 63 66 L69 94 L60 77 L51 94 L57 66 C56 62 55 58 54 54 C40 46 24 34 10 22 C28 20 48 26 60 36 Z";

// PWA icons — clipped to rounded rect so corners are transparent.
// rx="44" in the 200×200 viewBox == 22% of any output pixel size.
function makePwaSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
  <defs>
    <clipPath id="round-clip">
      <rect width="200" height="200" rx="44" ry="44"/>
    </clipPath>
  </defs>
  <g clip-path="url(#round-clip)">
    <rect width="200" height="200" fill="#000000"/>
    <g transform="translate(100,100) scale(1.05) translate(-60,-58)">
      <path d="${SWALLOW_PATH}" fill="#ffffff"/>
    </g>
  </g>
</svg>`;
}

// Apple touch icon — full opaque black square, no pre-rounding.
// iOS applies its own squircle mask; transparent corners cause fill inconsistencies.
function makeAppleSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
  <rect width="200" height="200" fill="#000000"/>
  <g transform="translate(100,100) scale(1.05) translate(-60,-58)">
    <path d="${SWALLOW_PATH}" fill="#ffffff"/>
  </g>
</svg>`;
}

async function makeIcon(page, size, svgContent, dest, transparent) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
</style></head>
<body>${svgContent}</body>
</html>`;

  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.screenshot({
    path: dest,
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: transparent,
  });
  console.log(`${path.basename(dest)} → ${dest}`);
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const pub = path.join(__dirname, "..", "public");

  // PWA manifest icons: rounded corners, transparent outside the squircle
  await makeIcon(page, 192, makePwaSvg(192), path.join(pub, "icon-192.png"), true);
  await makeIcon(page, 512, makePwaSvg(512), path.join(pub, "icon-512.png"), true);

  // Apple touch icon: opaque flat square (iOS masks to squircle itself)
  await makeIcon(page, 180, makeAppleSvg(180), path.join(pub, "apple-touch-icon.png"), false);

  await browser.close();
  console.log("done");
})();
