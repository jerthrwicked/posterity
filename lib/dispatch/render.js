// Renders a message from its stored copy (dispatch_copy) for the Communication
// Dispatch System. Copy is never written here: it is read from the row, and the
// frame's fixed text arrives as stored copy too, so approved wording replaces a
// placeholder as a content change (Master Specification, Customer Contact and
// Communication; roadmap placeholder convention).
//
// A cascade's sequence label, dates and names fill into copy as {{name}} tokens.
// A token with no value throws rather than reaching a person as "{{name}}".

const TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function fill(template, params = {}, escape = (s) => s) {
  if (template == null) return null;
  return template.replace(TOKEN, (_, key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`dispatch copy: no value for {{${key}}}`);
    }
    return escape(String(value));
  });
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderSms(copy, params) {
  if (!copy?.sms_body) throw new Error(`dispatch copy ${copy?.key}: no text message body`);
  return { body: fill(copy.sms_body, params) };
}

// Every automated email renders from one frame, with a plain-text version
// beside the designed one. `frame` is the dispatch_copy row of kind 'frame',
// holding the frame's fixed text, read by the caller.
export function renderEmail(copy, params, frame) {
  if (copy?.kind === 'frame') throw new Error(`dispatch copy ${copy.key} is the frame, not a message`);
  if (!copy?.subject) throw new Error(`dispatch copy ${copy?.key}: no subject`);
  if (frame?.kind !== 'frame') throw new Error('dispatch: no email frame row');

  const subject = fill(copy.subject, params);
  const body = bodies(copy, params);
  const footer = bodies(frame, params);

  return {
    subject,
    html: frameHtml({ subject, bodyHtml: body.html, footerHtml: footer.html }),
    text: `${body.text.trim()}\n\n--\n${footer.text.trim()}\n`,
  };
}

// A row may store HTML, text, or both; whichever is missing is made from the other.
function bodies(row, params) {
  if (!row.html_body && !row.text_body) throw new Error(`dispatch copy ${row.key}: no body`);
  const html = row.html_body
    ? fill(row.html_body, params, escapeHtml)
    : textToHtml(fill(row.text_body, params));
  const text = row.text_body ? fill(row.text_body, params) : htmlToText(html);
  return { html, text };
}

// ------------------------------------------------------------------ the frame

// The frame has a light version and a dark version. The light version carries
// the Swallow Seal and the sage accent, and is the one exception to the black
// canvas (Website Design Standards). The dark version is for the email apps that
// ask for one (Apple Mail, and Outlook on Mac), and its rules sit in the head's
// style block. In both, the seal sits on a white circle, so it stays visible when
// an email app recolors the email. Neutral greys carry no blue cast. Tables and
// inline styles, since email clients ignore most stylesheets.
const SAGE = '#93AB99';
const INK = '#0a0a0a';
const MUTED = '#525252';
const RULE = '#e5e5e5';
const GROUND = '#f5f5f5';
const CARD = '#ffffff';
const SANS = "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// The compact Swallow Seal as a picture (public/brand/posterity-seal-compact-black.png,
// generated from the vector), since Gmail and Outlook drop inline SVG. The Website
// Design Standards allow a PNG copy where a platform takes no vector, and email is one.
// Its address is absolute, since an email has no site to be relative to.
export const SEAL_SRC = 'https://www.yourposterity.com/brand/posterity-seal-compact-black.png';
const SEAL = `<img src="${SEAL_SRC}" width="44" height="44" alt="Posterity" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:44px;height:44px;">`;
// The seal centred on a 60px white circle, the same in both versions.
const SEAL_ON_WHITE = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td align="center" valign="middle" width="60" height="60" style="width:60px;height:60px;border-radius:50%;background:#ffffff;">${SEAL}</td></tr></table>`;

function frameHtml({ subject, bodyHtml, footerHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
@media (prefers-color-scheme: dark) {
  .pg { background:#000000 !important; }
  .pc { background:#000000 !important; border-color:#262626 !important; }
  .pb { color:#d4d4d4 !important; }
  .pb a { color:#ffffff !important; }
  .pf { color:#a1a1a1 !important; border-top-color:#262626 !important; }
}
</style>
</head>
<body class="pg" style="margin:0;padding:0;background:${GROUND};color:${INK};">
<table class="pg" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUND};">
<tr><td align="center" style="padding:32px 16px;">
<table class="pc" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${CARD};border:1px solid ${RULE};border-radius:16px;">
<tr><td align="center" style="padding:32px 32px 0;">${SEAL_ON_WHITE}</td></tr>
<tr><td align="center" style="padding:20px 32px 0;"><div style="width:40px;height:2px;background:${SAGE};line-height:2px;font-size:0;">&nbsp;</div></td></tr>
<tr><td class="pb" style="padding:28px 32px 32px;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK};">${bodyHtml}</td></tr>
<tr><td class="pf" style="padding:20px 32px 28px;border-top:1px solid ${RULE};font-family:${SANS};font-size:13px;line-height:1.5;color:${MUTED};">${footerHtml}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}

// The last paragraph carries no bottom margin, so it does not stack on the
// cell's padding (email clients ignore :last-child).
function textToHtml(text) {
  const paras = text.trim().split(/\n{2,}/);
  return paras
    .map((p, i) => `<p style="margin:0 0 ${i === paras.length - 1 ? 0 : 16}px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
