// Loopback-only static QA server; exactly three authored HTML documents, no arbitrary file access or API proxy.
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const pages = new Map([['/comparison', 'ANTES-DEPOIS.html'],['/format','FORMATO.html'],['/interactive','INTERATIVO.html']])
http.createServer((req,res)=>{
  const file=pages.get(req.url)
  if(req.method!=='GET'||!file){res.writeHead(404);res.end();return}
  const body=fs.readFileSync(path.join(__dirname,file))
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
  res.end(body)
}).listen(38119,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:38119/comparison'))
