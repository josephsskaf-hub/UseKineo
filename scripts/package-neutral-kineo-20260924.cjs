// Package the neutral Kineo proposal for direct file access. No network calls.
// Usage: node scripts/package-neutral-kineo-20260924.cjs [output.html] [--check]
// Discovers index.html, its prototype navigation, and every before-*.html snapshot.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const sourceDir = path.join(publicRoot, 'design/neutral-20260924');
const defaultOutput = 'C:/Users/josep/Documents/Codex/2026-09-21/kineo-ux-ui/outputs/neutral-kineo-20260924/KINEO-IDENTIDADE-NEUTRA.html';
const output = path.resolve(process.argv.slice(2).find(arg => arg !== '--check') || defaultOutput);
const checkOnly = process.argv.includes('--check');
const origin = 'https://www.usekineo.com';
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const assetCache = new Map();
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function publicURL(raw) {
  let url = new URL(decode(raw), origin + '/design/neutral-20260924/');
  if (url.origin !== origin) throw Error('External asset is not available offline: ' + url.href);
  if (url.pathname === '/_next/image') url = new URL(url.searchParams.get('url'), origin);
  if (url.origin !== origin) throw Error('External optimized image: ' + url.href);
  return url;
}

function inlineAsset(raw) {
  if (/^(data:|#)/i.test(raw)) return raw;
  const url = publicURL(raw);
  if (/\.mp4$/i.test(url.pathname)) return url.href;
  const filename = path.resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
  if (!filename.startsWith(publicRoot + path.sep)) throw Error('Asset outside public directory');
  const type = mime[path.extname(filename).toLowerCase()];
  if (!type || !fs.existsSync(filename)) throw Error('Missing local asset: ' + url.pathname);
  if (!assetCache.has(filename)) assetCache.set(filename, `data:${type};base64,${fs.readFileSync(filename).toString('base64')}`);
  return assetCache.get(filename);
}

const latin = inlineAsset('/design/business-ads-20260924/manrope-latin.woff2');
const greek = inlineAsset('/design/business-ads-20260924/manrope-greek.woff2');
function fontFaces(family) {
  return `@font-face{font-family:${family};font-style:normal;font-weight:200 800;font-display:swap;src:url("${latin}") format("woff2")}@font-face{font-family:${family};font-style:normal;font-weight:200 800;font-display:swap;src:url("${greek}") format("woff2");unicode-range:U+370-3FF}`;
}

function inlineCSS(css) {
  // Snapshots are English. Replace Next's remote Manrope subsets with the
  // locally supplied Latin/Greek Manrope files; the latter includes the ray.
  // Unused Cyrillic/Devanagari subsets are omitted instead of requesting them.
  const families = new Set();
  css = css.replace(/@font-face\s*\{[^}]*\}/gi, block => {
    if (!block.includes('/_next/static/media/')) return block;
    const family = block.match(/font-family:\s*([^;}]+)/i)?.[1];
    if (family && /Manrope/.test(family)) families.add(family);
    return '';
  });
  css += [...families].map(fontFaces).join('');
  if (/@import\b/i.test(css)) throw Error('CSS import must be captured before packaging');
  return css.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (match, double, single, plain) => {
    const value = (double ?? single ?? plain).trim();
    return /^(data:|#)/i.test(value) ? match : `url("${inlineAsset(value)}")`;
  });
}

function verifyScripts(html, label) {
  let count = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/i.test(match[1])) throw Error(label + ': external script is forbidden');
    if (/type=["']application\/(?:ld\+)?json["']/i.test(match[1])) continue;
    new vm.Script(match[2], { filename: label + '#' + (++count) });
  }
  return count;
}

let index = fs.readFileSync(path.join(sourceDir, 'index.html'), 'utf8');
const labels = Object.fromEntries([...index.matchAll(/<button\b[^>]*data-page=["']([a-z0-9_-]+)["'][^>]*>([\s\S]*?)<\/button>/gi)].map(match => [match[1], decode(match[2].replace(/<[^>]+>/g, '').trim())]));
assert.ok(Object.keys(labels).length, 'Index must declare prototype buttons');
const filenames = fs.readdirSync(sourceDir).filter(name => name.endsWith('.html') && name !== 'index.html').sort();
const pages = {};
let parsedScripts = 0;

// The iframe owns its navigation. Exact page allowlist plus source/origin checks
// in the parent keep file:// (opaque "null" origin) messaging narrowly scoped.
const bridge = `document.addEventListener('click',event=>{const anchor=event.target.closest?.('a[href]');if(!anchor)return;const href=anchor.getAttribute('href');const name=href.split(/[?#]/)[0].split('/').pop();const key=name.endsWith('.html')?name.slice(0,-5):'';if(!${json(Object.keys(labels))}.includes(key))return;event.preventDefault();event.stopImmediatePropagation();const hash=href.includes('#')?'#'+href.split('#').slice(1).join('#'):'';if(parent!==window)parent.postMessage({type:'kineo-neutral-page',page:key,hash},location.origin==='null'?'*':location.origin)},true);`;

function packageDocument(source, name) {
  parsedScripts += verifyScripts(source, name + ':source');
  let html = source.replace(/<base\b[^>]*>/gi, '');
  if (name.startsWith('before-')) {
    // This third-party badge was not captured locally. Preserve its real alt
    // text and dimensions rather than silently fetching it or inventing art.
    html = html.replace(/<img\b[^>]*src="https:\/\/media\.theresanaiforthat\.com\/featured-on-taaft\.png[^>]*>/gi, tag => {
      const alt = tag.match(/\balt="([^"]*)"/)?.[1] || 'External badge';
      return `<span role="img" aria-label="${alt}" title="Offline snapshot: external badge shown as its original alt text" style="display:inline-flex;align-items:center;justify-content:center;width:200px;height:42px;border:1px solid currentColor;border-radius:5px;font:11px Arial;text-align:center">${alt}</span>`;
    });
  }
  if (/<link\b[^>]*rel=["']stylesheet/i.test(html)) throw Error(name + ': stylesheet has not been captured');
  html = html.replace(/<link\b[^>]*>/gi, ''); // metadata/preloads are not needed offline
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) => `<style${attrs}>${inlineCSS(css)}</style>`);
  html = html.replace(/\s(?:srcset|sizes)=["'][^"']*["']/gi, '');
  html = html.replace(/\b(src|poster|data-video)=("|')([\s\S]*?)\2/gi, (_, attr, quote, value) => `${attr}=${quote}${inlineAsset(value)}${quote}`);
  html = html.replace(/\bstyle=("|')([\s\S]*?)\1/gi, (_, quote, css) => `style=${quote}${inlineCSS(css).replaceAll(quote, quote === '"' ? '&quot;' : '&#39;')}${quote}`);
  if (name.startsWith('before-')) {
    // The frozen comparison is inspection-only, including its old Stripe links.
    html = html.replace(/(<a\b[^>]*\bhref=)("|')[\s\S]*?\2/gi, '$1"#offline-snapshot"');
    return html;
  }
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attrs, code) => {
    // Prototype URLs are replaced by the srcdoc bridge; blob/file pages do not
    // have a usable web base URL for the original new URL(anchor.href) loop.
    code = code.split(/\r?\n/).filter(line => !/document\.querySelectorAll\('a\[href/.test(line)).join('\n');
    code = code.replace(/const theme=new URLSearchParams\(location\.search\)\.get\('theme'\)\|\|'light'/, "const theme=document.body.dataset.theme||'light'");
    return `<script${attrs}>${bridge}\n${code}</script>`;
  });
  parsedScripts += verifyScripts(html, name + ':packaged');
  return html;
}

for (const filename of filenames) pages[filename.slice(0, -5)] = packageDocument(fs.readFileSync(path.join(sourceDir, filename), 'utf8'), filename);
for (const key of Object.keys(labels)) assert.ok(pages[key], 'Missing prototype: ' + key);

index = index.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) => `<style${attrs}>${inlineCSS(css)}</style>`);
index = index.replace(/<iframe\b[^>]*>/gi, tag => tag.replace(/\s(?:src|srcdoc)=("|')[\s\S]*?\1/gi, ''));
index = index.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
index = index.replace(/(<a\b[^>]*id="open"[^>]*href=)"[^"]*"/i, '$1"#"').replace(/(<a\b[^>]*href=)"[^"]*"([^>]*id="open")/i, '$1"#"$2');

const controller = `
const pages=JSON.parse(document.getElementById('offline-pages').textContent),labels=${json(labels)};
const originalTemplate=document.documentElement.outerHTML;
const root=document.documentElement;let page=Object.hasOwn(labels,root.dataset.offlinePage)?root.dataset.offlinePage:${json(Object.keys(labels)[0])},theme=['light','graphite','adaptive'].includes(root.dataset.offlineTheme)?root.dataset.offlineTheme:'light';
const view=document.getElementById('view'),before=document.getElementById('before'),stage=document.getElementById('stage'),compare=document.getElementById('compare');
if(root.dataset.offlineSingle==='1'){document.querySelector('body>header').hidden=true;stage.style.padding='0';stage.querySelectorAll('.frame>p').forEach(p=>p.hidden=true);stage.querySelectorAll('.frame').forEach(frame=>{frame.style.border='0';frame.style.borderRadius='0'})}
function render(key){return pages[key].replace(/(<body\\b[^>]*\\bdata-theme=")[^"]*(")/i,'$1'+theme+'$2')}
function show(hash=''){view.srcdoc=render(page);document.getElementById('label').textContent=labels[page]+' · proposta';document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===page)));document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===theme)));const hasBefore=Object.hasOwn(pages,'before-'+page);compare.disabled=!hasBefore;if(!hasBefore){stage.classList.remove('compare');compare.setAttribute('aria-pressed','false')}else before.srcdoc=pages['before-'+page];view.onload=()=>{if(hash)view.contentDocument.getElementById(hash.slice(1))?.scrollIntoView()}}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;show()});document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{theme=b.dataset.theme;show()});for(const id of ['mobile','compare'])document.getElementById(id).onclick=function(){this.setAttribute('aria-pressed',String(stage.classList.toggle(id)))};
window.addEventListener('message',event=>{if(event.source!==view.contentWindow||event.origin!==location.origin||event.data?.type!=='kineo-neutral-page'||!Object.hasOwn(labels,event.data.page))return;page=event.data.page;show(typeof event.data.hash==='string'&&/^#[a-z0-9_-]+$/i.test(event.data.hash)?event.data.hash:'')});
let wholeURL;document.getElementById('open').addEventListener('click',function(){if(wholeURL)URL.revokeObjectURL(wholeURL);const html=originalTemplate.replace(/<html\\b[^>]*>/i,'<html lang="pt-BR" data-offline-single="1" data-offline-page="'+page+'" data-offline-theme="'+theme+'">');wholeURL=URL.createObjectURL(new Blob(['<!doctype html>'+html],{type:'text/html'}));this.href=wholeURL});
show();
`;
new vm.Script(bridge, { filename: 'offline-navigation' });
new vm.Script(controller, { filename: 'offline-controller' });
const payload = `<script type="application/json" id="offline-pages">${json(pages)}</script><script>${controller}</script>`;
index = index.replace('</body>', payload + '</body>');
verifyScripts(index, 'standalone');
assert.ok(!/https:\/\/www\.usekineo\.com\/_next\/static\/media\//.test(index), 'No remote font dependencies');

if (!checkOnly) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, index);
}
console.log(JSON.stringify({ mode: checkOnly ? 'checked' : 'packaged', output: checkOnly ? null : output, pages: Object.keys(pages), assetsInlined: assetCache.size, scriptsParsed: parsedScripts + 2, bytes: Buffer.byteLength(index), remoteMedia: 'Public Kineo MP4 URLs only; no fetch performed' }, null, 2));
