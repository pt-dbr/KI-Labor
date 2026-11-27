import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';

const root = resolve(process.argv[2] || '.');
const mime = {'.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json'};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const requested = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!requested.startsWith(root + sep)) throw new Error('Pfad außerhalb des Projekts');
    const body = await readFile(requested);
    response.writeHead(200, {'Content-Type': mime[extname(requested)] || 'application/octet-stream'});
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Datei nicht gefunden');
  }
});
server.listen(Number(process.env.KI_LAB_PORT || 4173), '127.0.0.1', () => console.log('http://127.0.0.1:' + server.address().port));
