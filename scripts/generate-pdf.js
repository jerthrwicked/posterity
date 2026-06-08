"use strict";

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const INPUT_MD = path.join(__dirname, "..", "CONTEXT_for_posterity.md");
const OUTPUT_PDF = "C:\\Users\\jerth\\OneDrive\\Documents\\Important\\Posterity Project Context.pdf";

// ---------------------------------------------------------------------------
// 1. Read and convert markdown
// ---------------------------------------------------------------------------
const raw = fs.readFileSync(INPUT_MD, "utf8");
const bodyHtml = md.render(raw);

// ---------------------------------------------------------------------------
// 2. Plain HTML template — white background, black text, clean and readable.
//    No cover page, no styled wrap, no design flourishes.
//    This is the working session document — functional, not for sharing.
// ---------------------------------------------------------------------------
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Posterity Project Context</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page { size: A4; margin: 20mm 18mm; }

  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 11pt;
    color: #111111;
    background: #ffffff;
    line-height: 1.6;
  }

  h1 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 20pt;
    font-weight: 700;
    color: #000000;
    margin-top: 0;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #000000;
  }

  h2 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14pt;
    font-weight: 700;
    color: #000000;
    margin-top: 28px;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #cccccc;
  }

  h3 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12pt;
    font-weight: 700;
    color: #222222;
    margin-top: 18px;
    margin-bottom: 6px;
  }

  h4 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    font-weight: 700;
    color: #333333;
    margin-top: 14px;
    margin-bottom: 4px;
  }

  p {
    margin-bottom: 10px;
  }

  a {
    color: #0066cc;
    text-decoration: underline;
  }

  strong {
    font-weight: 700;
  }

  em {
    font-style: italic;
  }

  code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9.5pt;
    background: #f4f4f4;
    color: #333333;
    padding: 1px 4px;
    border-radius: 2px;
    border: 1px solid #dddddd;
  }

  pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    background: #f4f4f4;
    color: #333333;
    padding: 10px 14px;
    border: 1px solid #dddddd;
    border-radius: 3px;
    margin: 10px 0;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
  }

  pre code {
    background: none;
    border: none;
    padding: 0;
  }

  ul, ol {
    padding-left: 22px;
    margin-bottom: 10px;
  }

  li {
    margin-bottom: 3px;
    line-height: 1.6;
  }

  hr {
    border: none;
    border-top: 1px solid #cccccc;
    margin: 20px 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 10pt;
  }

  th {
    font-family: Arial, Helvetica, sans-serif;
    font-weight: 700;
    background: #eeeeee;
    color: #000000;
    padding: 6px 10px;
    text-align: left;
    border: 1px solid #bbbbbb;
  }

  td {
    padding: 5px 10px;
    border: 1px solid #cccccc;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background: #f9f9f9;
  }

  blockquote {
    margin: 12px 0 12px 16px;
    padding: 8px 12px;
    border-left: 3px solid #aaaaaa;
    color: #444444;
    font-style: italic;
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

// ---------------------------------------------------------------------------
// 3. Launch Puppeteer and render to PDF
// ---------------------------------------------------------------------------
(async () => {
  console.log("🚀 Launching Puppeteer...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });

  console.log("📄 Generating PDF...");

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    displayHeaderFooter: false,
  });

  await browser.close();

  const outDir = path.dirname(OUTPUT_PDF);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT_PDF, pdfBuffer);

  const sizeMB = (fs.statSync(OUTPUT_PDF).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ PDF saved to: ${OUTPUT_PDF}`);
  console.log(`📦 File size: ${sizeMB} MB`);
})();
