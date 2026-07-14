import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = parseInt(process.argv[2], 10) || 8080;

http.createServer((req, res) => {
  const target = req.url.slice(1);
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    res.writeHead(400);
    res.end('Usage: GET /<target-url>');
    return;
  }

  const url = new URL(target);
  const mod = url.protocol === 'https:' ? https : http;

  const blockedHeaders = ['host'];
  const cleanHeaders = Object.fromEntries(
    Object.entries(req.headers).filter(([k]) => !blockedHeaders.includes(k.toLowerCase()))
  );
  cleanHeaders['user-agent'] = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36';
  cleanHeaders['origin'] = 'https://dude.mvp.bd';
  cleanHeaders['referer'] = 'https://dude.mvp.bd/';

  req.setTimeout(30000);
  const proxyReq = mod.request(target, { method: req.method, headers: { ...cleanHeaders, host: url.hostname }, timeout: 15000 }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Access-Control-Allow-Origin': '*',
      ...Object.fromEntries(
        Object.entries(proxyRes.headers).filter(([k]) => !/^access-control-allow-origin$/i.test(k))
      ),
    });
    proxyRes.on('error', (e) => { console.error('Proxy response error:', e.message); res.destroy(); });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => { console.error('Proxy error:', e.message); if (!res.writableEnded) { res.writeHead(502); res.end('Proxy error'); } });
  proxyReq.on('timeout', () => { console.error('Proxy timeout'); proxyReq.destroy(); if (!res.writableEnded) { res.writeHead(504); res.end('Proxy timeout'); } });
  req.on('error', (e) => { console.error('Req error:', e.message); proxyReq.destroy(); });
  req.pipe(proxyReq);
}).listen(PORT, () => console.log(`CORS proxy running on http://localhost:${PORT}`));
