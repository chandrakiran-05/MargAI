const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const certPath = path.resolve(__dirname, '../../../apps/web/certs/cert.pem');
const keyPath = path.resolve(__dirname, '../../../apps/web/certs/key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('SSL certs not found in apps/web/certs');
  process.exit(1);
}

const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

const server = https.createServer(sslOptions, (req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: 5173,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:5173',
      'x-forwarded-proto': 'https',
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Gateway Error connecting to Vite: ' + err.message);
  });

  req.pipe(proxyReq, { end: true });
});

// WebSocket support for Vite HMR
server.on('upgrade', (req, clientSocket, head) => {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: 5173,
    path: req.url,
    method: req.method,
    headers: req.headers,
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    clientSocket.write(
      `HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n` +
      Object.entries(proxyRes.headers)
        .map(([k, v]) => `${k}: ${v}\r\n`)
        .join('') +
      '\r\n'
    );
    if (proxyHead && proxyHead.length) clientSocket.write(proxyHead);
    proxySocket.pipe(clientSocket);
    clientSocket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    clientSocket.destroy();
  });

  proxyReq.end();
});

const PORT = 5174;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTPS Mobile Gateway] Running on https://0.0.0.0:${PORT}`);
  console.log(`[HTTPS Mobile Gateway] Open on smartphone: https://10.20.20.141:${PORT}/?mode=smartphone`);
});
