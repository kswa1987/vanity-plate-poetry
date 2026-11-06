// Tiny local web server for the plate poem prototype (works on Mac, Windows and Linux).
// Does the same job as server.ps1: serves this folder at http://localhost:8765 so the page can talk to Ollama.
// Run it with:  node server.js            (add --no-browser to skip opening the page, --port 9000 for another port)
// Needs only Node.js, no packages.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const args = process.argv.slice(2);
const noBrowser = args.includes('--no-browser');
const portArg = args.indexOf('--port');
const port = portArg >= 0 ? Number(args[portArg + 1]) : 8765;
const root = __dirname;
const url = `http://localhost:${port}/`;

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function openBrowser() {
  if (noBrowser) return;
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, url).pathname);

    if (urlPath === '/api/images') {
      const names = fs.readdirSync(root, { withFileTypes: true })
        .filter(f => f.isFile() && imageExts.includes(path.extname(f.name).toLowerCase()))
        .map(f => f.name)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      return send(res, 200, 'application/json', JSON.stringify(names));
    }

    if (urlPath === '/api/save' && req.method === 'POST') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        try {
          fs.writeFileSync(path.join(root, 'plates.json'), Buffer.concat(chunks));
          send(res, 200, 'application/json', '{"ok":true}');
        } catch (e) { send(res, 500, 'text/plain', e.message); }
      });
      return;
    }

    if (urlPath === '/') urlPath = '/index.html';
    const file = path.resolve(root, '.' + urlPath);
    // Only files inside this folder, and nothing hidden (like .git).
    const inside = file.startsWith(root + path.sep) && !path.relative(root, file).split(path.sep).some(p => p.startsWith('.'));
    if (inside && fs.existsSync(file) && fs.statSync(file).isFile()) {
      return send(res, 200, types[path.extname(file).toLowerCase()] || 'application/octet-stream', fs.readFileSync(file));
    }
    send(res, 404, 'text/plain', 'Not found');
  } catch (e) {
    try { send(res, 500, 'text/plain', e.message); } catch {}
  }
});

server.on('error', err => {
  if (err.code !== 'EADDRINUSE') throw err;
  // Already running (say, from another terminal)? Just open the page.
  const portTaken = () => {
    console.error(`Port ${port} is taken by another program. Try: node server.js --port 8766`);
    process.exit(1);
  };
  http.get(url + 'api/images', r => {
    r.resume();
    if (r.statusCode !== 200 || !String(r.headers['content-type']).startsWith('application/json')) return portTaken();
    console.log('Plate poems is already running. Opening it in your browser.');
    openBrowser();
    process.exit(0);
  }).on('error', portTaken);
});

// 127.0.0.1 keeps it on this computer only; the page is still opened as http://localhost, which Ollama allows.
server.listen(port, '127.0.0.1', () => {
  console.log(`Plate poems running at ${url}  (press Ctrl+C to stop)`);
  openBrowser();
});
