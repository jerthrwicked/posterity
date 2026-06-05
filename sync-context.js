const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const src = path.join(__dirname, "CONTEXT_for_posterity.md");
const oneDriveMd = "C:\\Users\\jerth\\OneDrive\\Documents\\Important\\Posterity Project Context.md";
const oneDrivePdf = "C:\\Users\\jerth\\OneDrive\\Documents\\Important\\Posterity Project Context.pdf";
const projectDocsMd = path.join(__dirname, "Project Documents", "Posterity Project Context.md");
const projectDocsPdf = path.join(__dirname, "Project Documents", "Posterity Project Context.pdf");

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
