import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
const root = fileURLToPath(new URL('.', import.meta.url));
process.env.ASSESSMENT_DATA_DIR ||= join(root, '.madar-data');
await mkdir(process.env.ASSESSMENT_DATA_DIR, {recursive:true});
const { createInferenceServer } = await import('./anomaly-detection/server.mjs');
const api = createInferenceServer();
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8'};
const allowed = new Set(['index.html','app.js','styles.css','madar.js','madar.css','madar-mark.svg']);
const server = createServer(async(req,res)=>{
  if (process.env.MADAR_DEMO_PASSWORD) {
    const expected = Buffer.from('Basic '+Buffer.from('madar:'+process.env.MADAR_DEMO_PASSWORD).toString('base64'));
    const provided = Buffer.from(req.headers.authorization || '');
    if (provided.length !== expected.length || !timingSafeEqual(expected,provided)) {
      res.writeHead(401,{'WWW-Authenticate':'Basic realm="Madar demo"'}); return res.end('Sign in to Madar.');
    }
  }
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) {
    res.writeHead(403); return res.end('Cross-origin requests are not permitted.');
  }
  const url = new URL(req.url,'http://localhost');
  if (url.pathname.startsWith('/api/')) { req.url = req.url.slice(4); return api.emit('request',req,res); }
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!['GET','HEAD'].includes(req.method) || !allowed.has(file)) { res.writeHead(404); return res.end('Not found'); }
  try {
    let body = await readFile(join(root,'dist',file));
    if (file === 'index.html') body = Buffer.from(body.toString().replace('<head>', '<head><script>window.MADAR_API_BASE="/api";</script>')); 
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
const port = Number(process.env.PORT || 8090);
server.listen(port, process.env.HOST || '127.0.0.1',()=>console.log(`Madar ready at http://localhost:${server.address().port} · synthetic demo`));
