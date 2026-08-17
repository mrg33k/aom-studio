// Local static serve of dist/ with the production /dashboard rewrite, for
// driving the built dashboard in a browser (verification only, not shipped).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.mp4': 'video/mp4',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  if (file === '/dashboard' || file.startsWith('/dashboard/')) file = '/dashboard.html';
  try {
    const body = await readFile(resolve(dist, '.' + file));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(4611, '127.0.0.1', () => console.log('serving dist on http://127.0.0.1:4611'));
