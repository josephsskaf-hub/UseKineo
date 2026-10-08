// KINEO-GEO-RODADA3-2026-10-08 — ping do IndexNow para as URLs NOVAS E ALTERADAS da rodada 3 de GEO (as 4 respostas: modelos,
// InVideo, CapCut, melhor gerador; o tempo medido nas páginas de motor nas 14 línguas e no /alternatives; o timer de roteiro;
// e as páginas da rodada 2 que a rodada 3 também mudou — Seedance 1.5 e os nichos com filme, com o botão "Make one like this").
//
// RODAR SÓ DEPOIS DE PUBLICAR (a sessão CEO faz o ping; esta rodada NÃO rodou). O Bing é o índice por trás da busca do ChatGPT;
// o IndexNow avisa o Bing em horas que estas URLs mudaram. O script NÃO tem URL digitada: ele lê o /sitemap.xml PUBLICADO e
// escolhe (1) toda URL com o carimbo EXATO da rodada 3 (GEO_RODADA3_LAST_MODIFIED_ISO de lib/seo/geoRodada3.ts — só a rodada 3
// carimba esse instante) e (2) as páginas da rodada 2 que a rodada 3 também mudou (GEO_RODADA2_PAGES_ALSO_IN_RODADA3 e as
// /free-ai-shorts/<nicho> de NICHE_HOUSE_FILM_IDS em lib/seo/houseFilmIdeas.ts), com o lastmod do mesmo dia. Se o deploy ainda
// não estiver no ar, o sitemap não tem o carimbo → 0 URLs → o script PARA sem pingar nada (falha fechada).
//
// Uso (na raiz do repositório):
//   node scripts/indexnow-ping-geo-rodada3-2026-10-08.mjs              → ensaio: mostra o que seria enviado (lê o sitemap do site)
//   node scripts/indexnow-ping-geo-rodada3-2026-10-08.mjs --submit     → confere a chave no ar e envia ao IndexNow
//   node scripts/indexnow-ping-geo-rodada3-2026-10-08.mjs --sitemap-file <arquivo.xml>
//                                                                      → ensaio OFFLINE (sem rede) contra um sitemap local
//
// A chave é a que a casa já usa (public/8ee9f362d6ec4042b723993c3e15936b.txt, a mesma de lib/indexnow.ts e dos pings de 06/10 e
// da rodada 2). Só host canônico, só https, no máximo 10.000 URLs (limite do protocolo). Nada de banco, preço ou crédito.
// O guardião scripts/test-geo-rodada3-2026-10-08.mjs executa este script offline contra o sitemap gerado e confere a lista exata.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HOST = 'www.usekineo.com'
const ORIGIN = `https://${HOST}`
const KEY = '8ee9f362d6ec4042b723993c3e15936b'
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const MAX_URLS = 10_000
const UA = { 'user-agent': 'Kineo-IndexNow/1.0' }

function fail(message) {
  console.error(`[indexnow-geo-rodada3] ${message}`)
  process.exit(1)
}

// as constantes da rodada, lidas da FONTE (lib/seo/geoRodada3.ts não importa nada em tempo de execução: transpila e roda isolado)
const ts = createRequire(join(ROOT, 'package.json'))('typescript')
const rd = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const r3 = (() => {
  const js = ts.transpileModule(rd('lib/seo/geoRodada3.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: () => { throw new Error('geoRodada3.ts não pode importar nada em tempo de execução') }, URLSearchParams }, { filename: 'geoRodada3.ts' })
  return mod.exports
})()
const STAMP = r3.GEO_RODADA3_LAST_MODIFIED_ISO
const DAY = r3.GEO_RODADA3_REVIEWED_ISO
if (!STAMP || Number.isNaN(Date.parse(STAMP)) || !DAY || !STAMP.startsWith(DAY)) fail('GEO_RODADA3_LAST_MODIFIED_ISO/REVIEWED_ISO inválidos em lib/seo/geoRodada3.ts')
const ideasSrc = rd('lib/seo/houseFilmIdeas.ts')
const idsBlock = (ideasSrc.match(/export const NICHE_HOUSE_FILM_IDS: Readonly<Record<string, string>> = \{\n([\s\S]*?)\n\}/) ?? [])[1]
if (!idsBlock) fail('NICHE_HOUSE_FILM_IDS não encontrado em lib/seo/houseFilmIdeas.ts')
const NICHES = [...idsBlock.matchAll(/^\s+(\w+): '/gm)].map((m) => m[1])
const ALSO_ROUND2 = [...(r3.GEO_RODADA2_PAGES_ALSO_IN_RODADA3 ?? []), ...NICHES.map((n) => `/free-ai-shorts/${n}`)]

const args = process.argv.slice(2)
const submit = args.includes('--submit')
const fileIdx = args.indexOf('--sitemap-file')
const sitemapFile = fileIdx >= 0 ? args[fileIdx + 1] : null
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

// 3) as URLs desta rodada: o carimbo exato dela, ou as páginas da rodada 2 que ela também mudou (mesmo dia); host canônico, https
const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: (m[1].match(/<loc>([^<]+)<\/loc>/) ?? [])[1]?.trim() ?? '',
  lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) ?? [])[1]?.trim() ?? '',
}))
if (entries.length === 0) fail('o sitemap não tem nenhuma <url>')
const stampMs = Date.parse(STAMP)
const urlList = []
for (const e of entries) {
  let u
  try { u = new URL(e.loc) } catch { fail(`URL inválida no sitemap: ${e.loc}`) }
  if (u.protocol !== 'https:' || u.host !== HOST) fail(`URL fora do host canônico: ${e.loc}`)
  const carimbo = Date.parse(e.lastmod) === stampMs
  const daRodada2 = ALSO_ROUND2.includes(u.pathname) && e.lastmod.startsWith(DAY)
  if (!carimbo && !daRodada2) continue
  if (!urlList.includes(u.href)) urlList.push(u.href)
}
if (urlList.length === 0) fail(`nenhuma URL com o carimbo ${STAMP} — a rodada ainda não foi publicada? Nada enviado.`)
// o /llms.txt (mudou nesta rodada e não está no sitemap): entra junto, só quando a rodada já está no ar (lista acima não vazia)
urlList.push(`${ORIGIN}/llms.txt`)
if (urlList.length > MAX_URLS) fail('acima do limite do protocolo (10.000 URLs)')

const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }

if (!submit) {
  console.log(JSON.stringify({ mode: sitemapFile ? 'ensaio-offline' : 'ensaio', endpoint: ENDPOINT, keyLocation: KEY_LOCATION, stamp: STAMP, urlCount: urlList.length, urlList }, null, 2))
  console.log('\nNada foi enviado. Para enviar de verdade: node scripts/indexnow-ping-geo-rodada3-2026-10-08.mjs --submit')
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
