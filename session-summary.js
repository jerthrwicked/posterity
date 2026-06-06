const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const SESSION_LOG_DOC_ID = "1l0oGbIbHoDC7FrG7Ds3fqC_cXg0hRsL_k2D6hExJZOY";
const KEY_FILE = path.join(__dirname, ".cursor", "posterity-docs-key.json");
const NOTES_FILE = path.join(__dirname, "session-notes.md");

const BLANK_TEMPLATE = `<!-- 
  Fill this in during or at the end of each session.
  Running \`npm run sync\` will append it to the Posterity Session Log Google Doc and reset this file.
  Leave it blank/unchanged to skip the session log entry.
-->

## Key Decisions Made
- 

## What Was Built
- 

## What Was Discussed
- 

## Next Session Priorities
- 
`;

function isBlank(content) {
  // Strip HTML comments and whitespace, check if any real content remains
  const stripped = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/##\s+.+/g, "")
    .replace(/-\s*$/gm, "")
    .trim();
  return stripped === "";
}

async function appendSessionSummary() {
  if (!fs.existsSync(NOTES_FILE)) {
    console.log("⚠️  session-notes.md not found — skipping session log.");
    return;
  }

  const notes = fs.readFileSync(NOTES_FILE, "utf8");

  if (isBlank(notes)) {
    console.log("⚠️  session-notes.md is empty — skipping session log.");
    return;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/documents"],
  });

  const docs = google.docs({ version: "v1", auth });

  // Get current doc to find end index
  const doc = await docs.documents.get({ documentId: SESSION_LOG_DOC_ID });
  const bodyContent = doc.data.body.content;
  const endIndex = bodyContent[bodyContent.length - 1].endIndex - 1;

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Strip the HTML comment header from notes before appending
  const cleanNotes = notes
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  const textToAppend = `\n\n────────────────────────────────────\n📅 SESSION LOG — ${date}\n────────────────────────────────────\n\n${cleanNotes}\n`;

  await docs.documents.batchUpdate({
    documentId: SESSION_LOG_DOC_ID,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: endIndex },
            text: textToAppend,
          },
        },
      ],
    },
  });

  console.log(`✅ Session summary appended to Google Doc (${date}).`);

  // Reset to blank template
  fs.writeFileSync(NOTES_FILE, BLANK_TEMPLATE);
  console.log("✅ session-notes.md reset to blank template.");
}

appendSessionSummary().catch((err) => {
  console.error("❌ Session summary failed:", err.message);
  process.exit(1);
});
