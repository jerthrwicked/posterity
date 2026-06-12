"use strict";
const puppeteer = require("puppeteer");
const path = require("path");

// Bare swallow on flat black square — same bird as favicon.svg, no rounded corners for app icons
const SWALLOW_PATH =
  "M60 36 C72 26 92 20 110 22 C96 34 80 46 66 54 C65 58 64 62 63 66 L69 94 L60 77 L51 94 L57 66 C56 62 55 58 54 54 C40 46 24 34 10 22 C28 20 48 26 60 36 Z";

const SIZES = [192, 512];

function makeSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
  <rect width="200" height="200" fill="#000000"/>
  <g transform="translate(100,100) scale(1.05) translate(-60,-58)">
    <path d="${SWALLOW_PATH}" fill="#ffffff"/>
  </g>
</svg>`;
}

async function makeIcon(page, size) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  html, body { width: ${size}px; height: ${size}px; background: #000; overflow: hidden; }
</style></head>
<body>${makeSvg(size)}</body>
</html>`;

  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  const dest = path.join(__dirname, "..", "public", `icon-${size}.png`);
  await page.screenshot({ path: dest, clip: { x: 0, y: 0, width: size, height: size } });
  console.log(`icon-${size}.png → ${dest}`);
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  for (const size of SIZES) {
    await makeIcon(page, size);
  }
  await browser.close();
  console.log("done");
})();
