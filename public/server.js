const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/octet-stream'
};

const safeJoin = (base, target) => {
  const normalized = path
    .normalize(target.replace(/\\/g, '/'))
    .replace(/^\/+/, '');
  const resolvedPath = path.resolve(base, normalized);
  const relative = path.relative(base, resolvedPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return resolvedPath;
};

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.createReadStream(filePath)
    .on('open', () => {
      res.writeHead(200, { 'Content-Type': contentType });
    })
    .on('error', () => {
      sendNotFound(res);
    })
    .pipe(res);
};

const sendNotFound = (res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
  res.end('404 - Not Found');
};

const sendIndex = (res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  sendFile(res, indexPath);
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURI(req.url.split('?')[0]);
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('400 - Bad Request');
    return;
  }

  if (urlPath === '/' || urlPath === '') {
    sendIndex(res);
    return;
  }

  const filePath = safeJoin(PUBLIC_DIR, urlPath);

  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('400 - Bad Request');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      // SPA fallback: serve index.html so client-side routing works
      sendIndex(res);
      return;
    }

    if (stats.isDirectory()) {
      const indexInDir = path.join(filePath, 'index.html');
      fs.access(indexInDir, fs.constants.F_OK, (accessErr) => {
        if (accessErr) {
          sendIndex(res);
        } else {
          sendFile(res, indexInDir);
        }
      });
      return;
    }

    sendFile(res, filePath);
  });
});

server.listen(PORT, () => {
  console.log(`MunicipaLink frontend available at http://localhost:${PORT}`);
});
