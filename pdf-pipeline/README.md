# Posterity — Stylized PDF Pipeline

Single source of truth for every Posterity document PDF.

## Files

| File | Role |
|---|---|
| `stylized-template.html` | The full print shell — cover, typography, tables. Edit the look here. |
| `generate-stylized-pdf.js` | Injects sectioned markdown, patches cover text, renders via Puppeteer. No styling lives here. |

## Usage

```bash
# default — reproduces the context PDF
node pdf-pipeline/generate-stylized-pdf.js

# any document
node pdf-pipeline/generate-stylized-pdf.js input.md "Project Documents/out.pdf" \
  --title "Title Here" \
  --tagline "Tagline here." \
  --meta "Internal · June 2026 · Posterity"
```

Point the npm script at this file:

```json
"scripts": { "generate-stylized": "node pdf-pipeline/generate-stylized-pdf.js" }
```

## IMPORTANT: Save-as-PDF requires "Background graphics" ON.

## Frozen — do not route through this pipeline

- `Posterity Project Context.pdf`
- `CONTEXT_for_posterity.md`

Every other document generated going forward runs through this script.
