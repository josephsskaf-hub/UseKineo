// KINEO-MOTORES-GEO-2026-10-06 — ping do IndexNow para as páginas revisadas na TAREFA 12 (páginas de motor citáveis).
//
// RODAR SÓ DEPOIS DE PUBLICAR. O Bing é o índice por trás da busca do ChatGPT; o IndexNow avisa o Bing em horas que
// estas URLs mudaram. O script NÃO tem lista de URL digitada: ele lê o /sitemap.xml PUBLICADO e escolhe, dentro do escopo
// desta revisão (cluster /ai-video-generator + /models-pricing, /kineo-vs-higgsfield, /seedance-vs-veo-vs-kling), as URLs
// cujo <lastmod> é a data dela (ENGINE_GEO_REVIEWED_ISO = 2026-10-06, a mesma que app/sitemap.ts carimba). Se o deploy
// ainda não estiver no ar, o sitemap não tem essa data → 0 URLs → o script PARA sem pingar nada (falha fechada).
//
// Uso (na raiz do repositório):
//   node scripts/indexnow-ping-2026-10-06.mjs              → ensaio: mostra o que seria enviado (lê o sitemap do site)
//   node scripts/indexnow-ping-2026-10-06.mjs --submit     → confere a chave no ar e envia ao IndexNow
//   node scripts/indexnow-ping-2026-10-06.mjs --sitemap-file <arquivo.xml>
//                                                          → ensaio OFFLINE (sem rede) contra um sitemap local
//
// A chave é a que a casa já usa (public/8ee9f362d6ec4042b723993c3e15936b.txt, servida na raiz do domínio, a mesma de
// lib/indexnow.ts e scripts/submit-indexnow.mjs). O script confere o arquivo local E, antes de enviar, o arquivo no ar.
// Só host canônico, só https, no máximo 10.000 URLs (limite do protocolo). Nada de banco, preço ou crédito.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HOST = 'www.usekineo.com'
const ORIGIN = `https://${HOST}`
const KEY = '8ee9f362d6ec4042b723993c3e15936b'
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const REVIEWED_ISO = '2026-10-06' // espelho de ENGINE_GEO_REVIEWED_ISO (lib/seo/engineCitation.ts) — o guardião confere
const MAX_URLS = 10_000
const UA = { 'user-agent': 'Kineo-IndexNow/1.0' }
// Só as páginas DESTA revisão: o cluster de motor (hub, motores indexáveis e as traduzidas) e as três comparações revisadas.
// Outras páginas com o mesmo lastmod (ex.: /effects, de outra sessão no mesmo dia) ficam para o ping de quem as mudou.
const ESCOPO = ['/ai-video-generator', '/models-pricing', '/kineo-vs-higgsfield', '/seedance-vs-veo-vs-kling']
const noEscopo = (pathname) => ESCOPO.some((p) => pathname === p || pathname.startsWith(`${p}/`))

const args = process.argv.slice(2)
const submit = args.includes('--submit')
const fileIdx = args.indexOf('--sitemap-file')
const sitemapFile = fileIdx >= 0 ? args[fileIdx + 1] : null

function fail(message) {
  console.error(`[indexnow-2026-10-06] ${message}`)
  process.exit(1)
}

if (submit && sitemapFile) fail('--submit não combina com --sitemap-file (o envio só vale contra o sitemap publicado)')

// 1) a chave versionada bate com o nome do arquivo (o Bing confere exatamente isso)
const keyPath = join(ROOT, 'public', `${KEY}.txt`)
if (!existsSync(keyPath)) fail(`arquivo de chave ausente: public/${KEY}.txt`)
if (readFileSync(keyPath, 'utf8').trim() !== KEY) fail('o conteúdo de public/<chave>.txt não é a chave')

// 2) o sitemap: publicado (padrão) ou local (ensaio offline)
let xml
if (sitemapFile) {
  xml = readFileSync(resolve(sitemapFile), 'utf8')
} else {
  const res = await fetch(`${ORIGIN}/sitemap.xml`, { headers: UA })
  if (!res.ok) fail(`/sitemap.xml respondeu HTTP ${res.status}`)
  xml = await res.text()
}

// 3) só as URLs desta revisão (lastmod = 2026-10-06), host canônico, https, sem repetição
const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: (m[1].match(/<loc>([^<]+)<\/loc>/) ?? [])[1]?.trim() ?? '',
  lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) ?? [])[1]?.trim() ?? '',
}))
if (entries.length === 0) fail('o sitemap não tem nenhuma <url>')
const urlList = []
for (const e of entries) {
  if (!e.lastmod.startsWith(REVIEWED_ISO)) continue
  let u
  try { u = new URL(e.loc) } catch { fail(`URL inválida no sitemap: ${e.loc}`) }
  if (u.protocol !== 'https:' || u.host !== HOST) fail(`URL fora do host canônico: ${e.loc}`)
  if (!noEscopo(u.pathname)) continue
  if (!urlList.includes(u.href)) urlList.push(u.href)
}
if (urlList.length === 0) fail(`nenhuma URL com lastmod ${REVIEWED_ISO} — a revisão ainda não foi publicada? Nada enviado.`)
if (urlList.length > MAX_URLS) fail('acima do limite do protocolo (10.000 URLs)')

const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }

if (!submit) {
  console.log(JSON.stringify({ mode: sitemapFile ? 'ensaio-offline' : 'ensaio', endpoint: ENDPOINT, keyLocation: KEY_LOCATION, reviewed: REVIEWED_ISO, urlCount: urlList.length, urlList }, null, 2))
  console.log('\nNada foi enviado. Para enviar de verdade: node scripts/indexnow-ping-2026-10-06.mjs --submit')
  process.exit(0)
}

// 4) envio: a chave tem de estar no ar com o conteúdo certo ANTES do POST
const keyRes = await fetch(KEY_LOCATION, { headers: UA })
if (!keyRes.ok) fail(`arquivo de chave no ar respondeu HTTP ${keyRes.status}`)
if ((await keyRes.text()).trim() !== KEY) fail('o arquivo de chave no ar não tem a chave')
const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8', ...UA },
  body: JSON.stringify(payload),
})
if (res.status !== 200 && res.status !== 202) fail(`IndexNow respondeu HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
console.log(JSON.stringify({ mode: 'enviado', httpStatus: res.status, urlCount: urlList.length, urlList }, null, 2))
