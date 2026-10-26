// Local synthetic UI preview only. No production routes, credentials, customer files or filesystem traversal.
import http from 'node:http'
import fs from 'node:fs'
const page = new URL('./admin-antes-depois.html', import.meta.url)
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' || req.url?.split('?')[0] !== '/') { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  res.end(fs.readFileSync(page))
})
server.listen(49263, '127.0.0.1', () => console.log('Synthetic preview: http://127.0.0.1:49263/'))
