// Posterity — where to continue after signing in · Walker Brown
//
// The sign-in page and the links in authentication emails each carry `next`,
// the page to continue to. Anyone can write a link to them, so `next` is kept
// on this site: a link to Posterity's own sign-in page must never hand the
// person it signs in to an address somewhere else.
//
// safeNext gives `next` back where it is a path on this site, and null
// otherwise, for the caller to fall back on its own landing page.
//
// A path on this site starts with one slash. Two slashes, or a slash and a
// backslash, start an address on another site, and a browser drops tabs and
// line breaks from an address before reading it, so "/<tab>/elsewhere" is read
// as two slashes. No page here has a backslash or a control character in its
// address, so any `next` holding one is refused.

const CONTROL = /[\u0000-\u001f\u007f]/;

export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return null;
  if (next.includes('\\') || CONTROL.test(next)) return null;
  return next;
}
