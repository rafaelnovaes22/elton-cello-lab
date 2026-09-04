import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { server } from '../server.js';

let baseUrl;
before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test('root serves the product and every local image exists', async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /data-start-timer/);
  const assets = [...html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)].map((match) => match[1]);
  const replies = await Promise.all(assets.map((asset) => fetch(`${baseUrl}${asset}`)));
  replies.forEach((reply, index) => assert.equal(reply.status, 200, assets[index]));
});

test('missing assets and malformed requests cannot masquerade as a working page', async () => {
  assert.equal((await fetch(`${baseUrl}/missing.js`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/%E0%A4%A`)).status, 400);
  assert.equal((await fetch(`${baseUrl}/.env`)).status, 403);
  assert.equal((await fetch(baseUrl, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
});
