"use strict";

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const INPUT_MD = path.join(__dirname, "..", "CONTEXT_for_posterity.md");
const OUTPUT_PDF = "C:\\Users\\jerth\\OneDrive\\Documents\\Important\\Posterity_Stylized_Context.pdf";

// ---------------------------------------------------------------------------
// 1. Read and convert markdown
// ---------------------------------------------------------------------------
const raw = fs.readFileSync(INPUT_MD, "utf8");

// Strip the very first h1 (# Posterity - Project Context) — cover page handles it
const bodyMd = raw.replace(/^#\s+.*\n/, "");
const bodyHtml = md.render(bodyMd);

// ---------------------------------------------------------------------------
// 2. Post-process HTML — wrap every <h2> section in a section block so we
//    can inject <hr> dividers between them cleanly
// ---------------------------------------------------------------------------
function buildSections(html) {
  // Split on <h2 boundaries
  const parts = html.split(/(?=<h2[\s>])/);
  return parts
    .map((chunk, i) => {
      if (i === 0 && !chunk.trim().startsWith("<h2")) {
        // Preamble before first h2
        return `<div class="section-block preamble">${chunk}</div>`;
      }
      const divider = i > 0 ? '<hr class="section-divider" />' : "";
      return `${divider}<div class="section-block">${chunk}</div>`;
    })
    .join("\n");
}

const sectioned = buildSections(bodyHtml);

// ---------------------------------------------------------------------------
// 3. Full HTML template
//
// WRAP STRATEGY: The body background is #3a3a3a (the grey wrap). The black
// content column sits inside it via margin: 0 32px on .content-wrapper.
// This means grey naturally shows on LEFT and RIGHT of every content page.
//
// TOP grey edge (first content page only): the 32px padding-top on
// .content-wrapper creates grey space at the very top of the first content
// page, because that's where the content element starts.
//
// BOTTOM grey edge (last content page only): the 32px padding-bottom on
// .content-wrapper creates grey space at the very bottom of the last content
// page, because that's where the content element ends.
//
// MIDDLE pages: content bleeds to the page top and bottom — no grey cap —
// which is exactly what the spec requires.
//
// The cover page is full-bleed black, outside .content-wrapper entirely.
// ---------------------------------------------------------------------------
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Posterity Project Context</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lora:ital@1&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Page setup ── */
  @page { size: A4; margin: 0; }

  /*
   * body background = #3a3a3a (the grey wrap frame).
   * It shows through wherever the black content column does NOT cover.
   * That means: 32px grey gutters on left + right of every content page,
   * 32px grey cap on top of page 2 (first content page),
   * 32px grey cap on bottom of the last content page.
   */
  html {
    background: #3a3a3a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    margin: 0;
    padding: 0;
    background: #3a3a3a;
    font-family: 'Poppins', sans-serif;
    font-size: 11px;
    color: #ffffff;
    line-height: 1.7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Cover page — full bleed black, no grey at all ── */
  .cover-page {
    width: 100%;
    height: 297mm;
    background: #000000;
    break-after: page;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0 0 80px 60px;
  }

  .cover-brand {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #ffffff;
    margin-bottom: 20px;
  }

  .cover-hero {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 72px;
    line-height: 1.1;
    color: #ffffff;
  }

  .cover-tagline {
    font-family: 'Lora', serif;
    font-style: italic;
    font-size: 16px;
    color: #cccccc;
    margin-top: 24px;
  }

  .cover-rule {
    width: 120px;
    height: 1px;
    background: #3a3a3a;
    border: none;
    margin-top: 32px;
  }

  .cover-meta {
    font-family: 'Poppins', sans-serif;
    font-weight: 400;
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #666666;
    margin-top: 16px;
  }

  /*
   * ── Content wrapper ──
   *
   * margin: 0 32px  → 32px grey gutter on left and right of every page
   * padding-top: 32px  → grey cap appears at top of first content page only
   * padding-bottom: 32px  → grey cap appears at bottom of last content page only
   * background: #000000  → the black content area
   * padding-left/right: 40px  → inner horizontal clearance (total 72px from page edge)
   *
   * Combined clearance from any wrap edge: 40px (well above the 20px minimum).
   */
  .content-wrapper {
    margin: 0 32px;
    padding: 32px 40px 32px 40px;
    background: #000000;
  }

  /* ── Typography ── */
  h1 { display: none; }

  h2 {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    font-size: 18px;
    color: #5b9bd5;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 20px;
    margin-bottom: 12px;
  }

  h3 {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    font-size: 14px;
    color: #ffffff;
    margin-top: 16px;
    margin-bottom: 8px;
  }

  h4 {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    font-size: 12px;
    color: #cccccc;
    margin-top: 12px;
    margin-bottom: 6px;
  }

  p {
    margin-bottom: 10px;
  }

  em, i {
    font-family: 'Lora', serif;
    font-style: italic;
    color: #cccccc;
  }

  strong {
    font-weight: 600;
    color: #ffffff;
  }

  a {
    color: #5b9bd5;
    text-decoration: none;
  }

  code {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    background: #1a1a1a;
    color: #aaaaaa;
    padding: 1px 4px;
    border-radius: 2px;
  }

  pre {
    background: #1a1a1a;
    color: #aaaaaa;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 10px;
    line-height: 1.5;
    overflow: hidden;
    margin: 12px 0;
  }

  pre code {
    background: none;
    padding: 0;
  }

  /* ── Lists ── */
  ul, ol {
    padding-left: 20px;
    margin-bottom: 10px;
  }

  ul li, ol li {
    margin-bottom: 4px;
    color: #ffffff;
    font-family: 'Poppins', sans-serif;
    font-size: 11px;
    line-height: 1.7;
  }

  ul li::marker {
    color: #5b9bd5;
  }

  ol li::marker {
    color: #5b9bd5;
  }

  /* ── Section dividers — stays inside content column, never touches wrap ── */
  hr.section-divider {
    border: none;
    border-top: 1px solid #2d4a6e;
    margin: 28px 0;
    width: 100%;
  }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    border-radius: 4px;
    overflow: hidden;
  }

  thead tr {
    background: #ffffff;
  }

  thead th {
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    font-size: 11px;
    color: #000000;
    padding: 8px 12px;
    text-align: left;
    border: none;
  }

  tbody tr {
    background: #ffffff;
  }

  tbody tr:nth-child(even) {
    background: #f5f5f5;
  }

  tbody td {
    font-family: 'Poppins', sans-serif;
    font-weight: 400;
    font-size: 11px;
    color: #000000;
    padding: 8px 12px;
    border: none;
  }
</style>
</head>
<body>

<!-- ═══════════════════ COVER PAGE ═══════════════════ -->
<div class="cover-page">
  <div class="cover-brand">Posterity</div>
  <div class="cover-hero">Your Voice.<br>Forever.</div>
  <div class="cover-tagline">Your legacy, on your terms.</div>
  <hr class="cover-rule" />
  <div class="cover-meta">Project Context &middot; June 2026 &middot; Jeremy Grego, Founder</div>
</div>

<!-- ═══════════════════ CONTENT ═══════════════════ -->
<div class="content-wrapper">
${sectioned}
</div>

</body>
</html>`;

// ---------------------------------------------------------------------------
// 4. Launch Puppeteer and render to PDF
// ---------------------------------------------------------------------------
(async () => {
  console.log("🚀 Launching Puppeteer...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Set content — waitUntil networkidle0 ensures Google Fonts load
  await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });

  // Brief pause to let fonts render
  await new Promise((r) => setTimeout(r, 1500));

  console.log("📄 Generating PDF...");

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    displayHeaderFooter: false,
  });

  await browser.close();

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT_PDF);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT_PDF, pdfBuffer);

  const sizeMB = (fs.statSync(OUTPUT_PDF).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ PDF saved to: ${OUTPUT_PDF}`);
  console.log(`📦 File size: ${sizeMB} MB`);
})();
