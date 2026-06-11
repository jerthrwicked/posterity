"use strict";

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const positionals = args.filter((a, i) =>
  !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--"))
);

const INPUT_MD = positionals[0]
  ? path.resolve(process.cwd(), positionals[0])
  : path.join(__dirname, "..", "CONTEXT_for_posterity.md");
const OUTPUT_PDF = positionals[1]
  ? path.resolve(process.cwd(), positionals[1])
  : path.join(__dirname, "..", "Project Documents", "Posterity_Stylized_Context.pdf");

const TEMPLATE = path.join(__dirname, "stylized-template.html");

const COVER = {
  title:   flag("title", "Your Voice.<br />Forever."),
  tagline: flag("tagline", "Your legacy, on your terms."),
  meta:    flag("meta", "Project Context \u00b7 June 2026 \u00b7 Jeremy Grego, Founder"),
};

const raw = fs.readFileSync(INPUT_MD, "utf8");
const bodyMd = raw.replace(/^#\s+.*\n/, "");
const bodyHtml = md.render(bodyMd).replace(/<hr\s*\/?>\s*/g, "");

function buildSections(html) {
  const parts = html.split(/(?=<h2[\s>])/);
  return parts
    .map((chunk, i) => {
      if (i === 0 && !chunk.trim().startsWith("<h2")) {
        return `<div class="section-block preamble">${chunk}</div>`;
      }
      const divider = i > 0 ? '<hr class="section-divider" />' : "";
      return `${divider}<div class="section-block">${chunk}</div>`;
    })
    .join("\n");
}

const sectioned = buildSections(bodyHtml);

let template = fs.readFileSync(TEMPLATE, "utf8");

const START = "<!-- CONTENT:START -->";
const END = "<!-- CONTENT:END -->";
const a = template.indexOf(START);
const b = template.indexOf(END);
if (a === -1 || b === -1) {
  throw new Error("Template is missing the CONTENT:START / CONTENT:END markers.");
}
template =
  template.slice(0, a + START.length) +
  "\n" + sectioned + "\n      " +
  template.slice(b);

template = template
  .replace(
    /<div class="cover-hero">[\s\S]*?<\/div>/,
    `<div class="cover-hero">${COVER.title}</div>`
  )
  .replace(
    /<div class="cover-tagline">[\s\S]*?<\/div>/,
    `<div class="cover-tagline">${COVER.tagline}</div>`
  )
  .replace(
    /<div class="cover-meta">[\s\S]*?<\/div>/,
    `<div class="cover-meta">${COVER.meta}</div>`
  );

(async () => {
  console.log("🚀 Launching Puppeteer…");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(template, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  console.log("📄 Generating PDF…");
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", bottom: "14mm", left: "13mm", right: "13mm" },
    displayHeaderFooter: false,
  });
  await browser.close();

  const outDir = path.dirname(OUTPUT_PDF);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PDF, pdfBuffer);

  const sizeMB = (fs.statSync(OUTPUT_PDF).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Saved: ${OUTPUT_PDF}`);
  console.log(`📦 ${sizeMB} MB`);
})();
