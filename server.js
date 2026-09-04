import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_ROOT = fileURLToPath(new URL('./public', import.meta.url));
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

/** @param {string} pathname @returns {string | null} */
function resolvePublicPath(pathname) {
  const decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  if (decoded.split(/[/\\]/).some((segment) => segment.startsWith('.'))) return null;
  const candidate = resolve(PUBLIC_ROOT, decoded.replace(/^[/\\]+/, ''));
  const offset = relative(PUBLIC_ROOT, candidate);
  return offset.startsWith(`..${sep}`) || offset === '..' ? null : candidate;
}

async function sendStatic(response, filePath) {
  const offset = relative(await realpath(PUBLIC_ROOT), await realpath(filePath));
  if (offset.startsWith(`..${sep}`) || offset === '..') throw new Error('Public path escaped through a symbolic link.');
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) throw new Error(`Not a file: ${filePath}`);
  response.writeHead(200, {
    'cache-control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=86400',
    'content-type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}

/** @param {import('node:http').IncomingMessage} request @param {import('node:http').ServerResponse} response @returns {Promise<void>} */
export async function routeRequest(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Método não permitido.' });
  let url;
  let filePath;
  try {
    url = new URL(request.url || '/', 'http://localhost');
    filePath = resolvePublicPath(url.pathname);
  } catch {
    return sendJson(response, 400, { error: 'Caminho inválido.' });
  }
  if (url.pathname === '/health') return sendJson(response, 200, { status: 'ok' });
  if (!filePath) return sendJson(response, 403, { error: 'Path outside public root.' });
  try {
    await sendStatic(response, filePath);
  } catch {
    sendJson(response, 404, { error: 'Recurso não encontrado.' });
  }
}

export const server = createServer((request, response) => {
  routeRequest(request, response).catch((error) => {
    console.error(JSON.stringify({ event: 'request_failed', message: error.message }));
    sendJson(response, 500, { error: 'Unexpected server error.' });
  });
});

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryPoint) server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'server_started', port: PORT }));
});
