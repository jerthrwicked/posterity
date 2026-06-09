// LOCAL ONLY — never deploy this route
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const INBOX_PATH = path.join(process.cwd(), 'cursor-inbox.md');
const LOCAL_HOSTS = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

function normalizeLoopback(value) {
  if (!value) return null;
  return value.replace(/^::ffff:/, '');
}

function getHostname(value) {
  if (!value) return null;

  try {
    return normalizeLoopback(new URL(value).hostname);
  } catch {
    return normalizeLoopback(value.split(':')[0]);
  }
}

function isLocalRequest(req) {
  const requestHost = getHostname(req.url);
  const originHost = getHostname(req.headers.get('origin'));
  const forwardedFor = normalizeLoopback(
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  );
  const realIp = normalizeLoopback(req.headers.get('x-real-ip')?.trim());

  if (originHost && !LOCAL_HOSTS.has(originHost)) return false;
  if (forwardedFor && !LOCAL_HOSTS.has(forwardedFor)) return false;
  if (realIp && !LOCAL_HOSTS.has(realIp)) return false;

  return LOCAL_HOSTS.has(requestHost);
}

export async function POST(req) {
  if (!isLocalRequest(req)) {
    return Response.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const task = body.task;

  if (typeof task !== 'string' || !task) {
    return Response.json(
      { success: false, message: 'No task provided' },
      { status: 400 }
    );
  }

  fs.writeFileSync(INBOX_PATH, task, 'utf-8');

  return Response.json({
    success: true,
    message: 'Task written to cursor-inbox.md',
  });
}
