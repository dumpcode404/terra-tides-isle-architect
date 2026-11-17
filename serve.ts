// Tiny static server for local play: `node serve.ts` serves game/ on
// http://localhost:8080 (Node 22, standard library only; dev convenience).
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((request, response) => {
  const urlPath = (request.url || '/').split('?')[0].split('#')[0];
  let decoded = '/';
  try {
    decoded = decodeURIComponent(urlPath);
  } catch (e) { /* keep root */ }
  const target = normalize(join(root, decoded === '/' ? '/index.html' : decoded));
  if (target !== root && !target.startsWith(root + sep)) {
    response.writeHead(403);
    response.end('forbidden');
    return;
  }
  let stat;
  try {
    stat = statSync(target);
  } catch (e) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  if (!stat.isFile()) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream' });
  createReadStream(target).pipe(response);
}).listen(port, () => {
  console.log(`TERRACOTTA TIDES served at http://localhost:${port}`);
});
