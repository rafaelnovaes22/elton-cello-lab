import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_ROOT = resolve('public');
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
};

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function resolvePublicPath(pathname) {
  const decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const candidate = resolve(join(PUBLIC_ROOT, normalize(decoded).replace(/^[/\\]+/, '')));
  return candidate.startsWith(PUBLIC_ROOT) ? candidate : null;
}

async function sendStatic(response, filePath) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) throw new Error(`Not a file: ${filePath}`);
  response.writeHead(200, {
    'cache-control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=86400',
    'content-type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}

async function routeRequest(request, response) {
  const url = new URL(request.url || '/', 'http://localhost');
  if (url.pathname === '/health') return sendJson(response, 200, { status: 'ok' });
  const filePath = resolvePublicPath(url.pathname);
  if (!filePath) return sendJson(response, 403, { error: 'Path outside public root.' });
  try {
    await sendStatic(response, filePath);
  } catch {
    await sendStatic(response, join(PUBLIC_ROOT, 'index.html'));
  }
}

createServer((request, response) => {
  routeRequest(request, response).catch((error) => {
    console.error(JSON.stringify({ event: 'request_failed', message: error.message }));
    sendJson(response, 500, { error: 'Unexpected server error.' });
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'server_started', port: PORT }));
});
