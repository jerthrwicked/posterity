const { mdToPdf } = require("md-to-pdf");
const path = require("path");

(async () => {
  const inputPath = path.join(__dirname, "CONTEXT_for_posterity.md");
  const outputPath = "C:\\Users\\jerth\\OneDrive\\Documents\\Important\\Posterity Project Context.pdf";
  
  await mdToPdf({ path: inputPath }, { dest: outputPath });
  console.log("✅ PDF updated successfully!");
})();
