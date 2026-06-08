const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const src = path.join(__dirname, "CONTEXT_for_posterity.md");
const oneDriveMd = "C:\\Users\\jerth\\OneDrive\\Documents\\Important\\Posterity Project Context.md";
const oneDrivePdf = "C:\\Users\\jerth\\OneDrive\\Documents\\Important\\Posterity Project Context.pdf";
const projectDocsMd = path.join(__dirname, "Project Documents", "Posterity Project Context.md");
const projectDocsPdf = path.join(__dirname, "Project Documents", "Posterity Project Context.pdf");

// Update context size bar in Project Status section
function updateContextSizeBar() {
  const THRESHOLD_BYTES = 40 * 1024; // 40KB
  const BAR_WIDTH = 20;

  const content = fs.readFileSync(src, "utf8");
  const sizeBytes = Buffer.byteLength(content, "utf8");
  const pct = Math.min(100, Math.round((sizeBytes / THRESHOLD_BYTES) * 100));
  const filled = Math.round((pct / 100) * BAR_WIDTH);
  const bar = "▓".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
  const newLine = `📊 Context size: [${pct}%] ${bar}`;

  const sizeBar = /Context size: \[\d+%\] \S+/;
  if (sizeBar.test(content)) {
    const updated = content.replace(sizeBar, `Context size: [${pct}%] ${bar}`);
    fs.writeFileSync(src, updated, "utf8");
    console.log(`📊 Context size: ${pct}% of 40KB (${(sizeBytes / 1024).toFixed(1)}KB)`);
  } else {
    console.log(`⚠️  Context size bar line not found — skipping update.`);
  }
}

updateContextSizeBar();

// Copy markdown to OneDrive
fs.copyFileSync(src, oneDriveMd);
console.log("✅ Markdown copied to OneDrive.");

// Regenerate PDF to OneDrive
execSync("node update-context.js", { stdio: "inherit", cwd: __dirname });

// Copy markdown to Project Documents
fs.copyFileSync(src, projectDocsMd);
console.log("✅ Markdown copied to Project Documents.");

// Copy PDF to Project Documents
fs.copyFileSync(oneDrivePdf, projectDocsPdf);
console.log("✅ PDF copied to Project Documents.");

// Append session notes to Google Doc (skips automatically if notes are blank)
console.log("\n📋 Checking session notes...");
execSync("node session-summary.js", { stdio: "inherit", cwd: __dirname });
