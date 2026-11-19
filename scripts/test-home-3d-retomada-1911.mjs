import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import ts from 'typescript'

// Exercise the shipped loader, controller and styles in a real browser. Only the GPU,
// visibility and scene clock are controlled, so the 45 fps boundary is reproducible.
const browser = [
  process.env.CHROME_BIN,
  path.join(process.env.LOCALAPPDATA || '.', 'Google/Chrome/Application/chrome.exe'),
  path.join(process.env.ProgramFiles || '.', 'Google/Chrome/Application/chrome.exe'),
  path.join(process.env['ProgramFiles(x86)'] || '.', 'Microsoft/Edge/Application/msedge.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => p && existsSync(p))
assert(browser, 'Set CHROME_BIN to Chrome, Chromium or Edge')
const read = name => readFileSync(name, 'utf8')
const client = ts.transpileModule(read('components/home/HomeProjection.tsx'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const controller = read('public/screening-room/home-projection.js')
const fixture = read('scripts/test-support/home-projection-browser.mjs')
const assets = {
  '/entry.js': client, '/fixture.js': fixture,
  '/effect.js': 'export function useEffect(fn){window.unmount=fn()}',
  '/screening-room/home-projection.js': 'const {performance,setInterval,clearInterval,setTimeout,clearTimeout}=window.sceneClock;\n' + controller,
  '/screening-room/home-film.css': read('public/screening-room/home-film.css'),
  '/screening-room/scene.js': `export async function enter({host,signal}) {
    window.attempts++; if(window.noGPU) throw Error('no graphics adapter');
    host.dataset.frames='0'; host.dataset.backend='test'; return {words(){}}
  }`,
}
const cases = ['light','dark','recover','hidden','abort','gpu','mobile','reduced']
let resolveResult
const results = new Map()
const server = createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost')
  if (url.pathname === '/result') {
    let body=''; for await(const chunk of req) body+=chunk
    results.set(url.searchParams.get('case'),body)
    res.end(); resolveResult?.(); return
  }
  const asset = assets[url.pathname]
  if(asset!==undefined) {res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'text/javascript');res.end(asset);return}
  const mode=url.searchParams.get('case')
  if(!mode){res.end();return}
  res.setHeader('Content-Type','text/html')
  if(url.searchParams.has('driver')){
    res.end('<iframe title="home" style="width:'+(mode==='mobile'?390:1000)+'px;height:650px;border:0" src="/?case='+mode+'"></iframe>');return
  }
  res.end(`<!doctype html><html data-theme="${mode==='dark'?'dark':'light'}"><meta charset=utf-8>
    <style>.k3c-media{display:block;position:relative;width:300px;height:160px} .k3c-media picture{display:block;width:100%;height:100%;background:navy} a{display:inline-block;position:relative} .k3c-cta{position:absolute;bottom:12px;left:12px}</style>
    <script type="importmap">{"imports":{"react":"/effect.js"}}</script>
    <main class="klp"><div class="k3c-head"><span>Films</span><span class="k3c-more">Guide</span></div>
    <a data-home-card="films" href="#film"><span class="k3c-media"><picture></picture><video></video></span><span class="k3c-cta">Make my film</span></a></main><script type="module" src="/fixture.js"></script></html>`)
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
try {
  for(const mode of cases){
    const profile=mkdtempSync(path.join(tmpdir(),'kineo-film-guard-'))
    const url='http://127.0.0.1:'+server.address().port+'/?driver=1&case='+mode
    const child=spawn(browser,['--headless','--no-first-run','--disable-extensions','--disable-background-networking','--window-size=1400,900','--user-data-dir='+profile,...(mode==='reduced'?['--force-prefers-reduced-motion']:[]),url],{stdio:'ignore',windowsHide:true})
    const closed=new Promise(resolve=>child.once('close',resolve))
    let timer
    try {
      await Promise.race([new Promise(r=>{resolveResult=r}),closed,new Promise(r=>{timer=setTimeout(r,18000)})])
      assert.equal(results.get(mode),'ok',mode+': '+(results.get(mode)||'browser exited or timed out'))
      console.log('ok',mode)
    } finally {
      clearTimeout(timer); child.kill(); await closed
      if(path.dirname(profile)===path.resolve(tmpdir()) && path.basename(profile).startsWith('kineo-film-guard-')) {
        try {rmSync(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150})} catch { /* Chromium may still hold its temporary profile. */ }
      }
    }
  }
} finally {server.close()}
