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

  const blockedHeaders = ['origin', 'referer', 'host', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform'];
  const cleanHeaders = Object.fromEntries(
    Object.entries(req.headers).filter(([k]) => !blockedHeaders.includes(k.toLowerCase()))
  );
  cleanHeaders['user-agent'] = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36';

  const proxyReq = mod.request(target, { method: req.method, headers: { ...cleanHeaders, host: url.hostname } }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Access-Control-Allow-Origin': '*',
      ...Object.fromEntries(
        Object.entries(proxyRes.headers).filter(([k]) => !/^access-control-allow-origin$/i.test(k))
      ),
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => { console.error('Proxy error:', e.message); res.writeHead(502); res.end('Proxy error: ' + e.message); });
  req.pipe(proxyReq);
}).listen(PORT, () => console.log(`CORS proxy running on http://localhost:${PORT}`));
