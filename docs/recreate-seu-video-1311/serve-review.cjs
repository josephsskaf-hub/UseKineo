// Read-only local review assets, never a product API.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const base=__dirname,publicRoot=path.resolve(base,'../../public');
http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
  let p;try{p=decodeURIComponent(new URL(req.url,'http://local').pathname)}catch{res.writeHead(400);return res.end()}
  if(p.includes('..')||p.split('/').some(x=>x.startsWith('.'))){res.writeHead(403);return res.end()}
  const asset=/^\/(previews|posters|kids-cartoon|home-images|images|logos)\//.test(p),root=asset?publicRoot:base;
  const f=path.resolve(root,'.'+(p==='/'?'/fixtures/pending.html':p));
  if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  const type={'.html':'text/html; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.svg':'image/svg+xml'}[path.extname(f)];
  if(!type){res.writeHead(404);return res.end()}
  fs.stat(f,(e,s)=>{if(e||!s.isFile()){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':type,'Content-Length':s.size,'X-Robots-Tag':'noindex,nofollow','Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else fs.createReadStream(f).pipe(res)})
}).listen(3033,'127.0.0.1',()=>console.log('Read-only review: http://127.0.0.1:3033/'))
