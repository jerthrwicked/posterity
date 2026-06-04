const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const src = path.join(__dirname, "CONTEXT for posterity.md");
const dest = "C:\\Users\\jerth\\OneDrive\\Documents\\Important\\Posterity Project Context.md";

fs.copyFileSync(src, dest);
console.log("✅ Markdown copied to OneDrive.");

execSync("node update-context.js", { stdio: "inherit", cwd: __dirname });
