// KINEO-GEO-RODADA2-2026-10-08 — ping do IndexNow para as páginas da rodada 2 de GEO (a página do Seedance 1.5, a edição de
// outubro do "State of AI Shorts" e as páginas de nicho com filme real da casa).
//
// RODAR SÓ DEPOIS DE PUBLICAR (a sessão CEO faz o ping). O Bing é o índice por trás da busca do ChatGPT; o IndexNow avisa o
// Bing em horas que estas URLs mudaram. O script NÃO tem URL digitada além do escopo: ele lê o /sitemap.xml PUBLICADO e
// escolhe, dentro do escopo desta rodada, as URLs cujo <lastmod> é a data dela (GEO_RODADA2_REVIEWED_ISO = 2026-10-08, a mesma
// que app/sitemap.ts carimba; o estudo leva a data da leitura da edição, que é do mesmo dia). Se o deploy ainda não estiver no
// ar, o sitemap não tem essa data → 0 URLs → o script PARA sem pingar nada (falha fechada).
//
// O ESCOPO (caminhos EXATOS, nunca prefixo — as páginas traduzidas do Seedance não mudaram):
//   · /ai-video-generator/seedance e /state-of-ai-shorts-2026;
//   · /free-ai-shorts/<nicho> para cada chave de NICHE_HOUSE_FILM_IDS em lib/seo/houseFilmIdeas.ts (lida da fonte; o guardião
//     scripts/test-geo-rodada2-2026-10-08.mjs executa este script offline contra o sitemap gerado e confere a lista exata).
//
// Uso (na raiz do repositório):
//   node scripts/indexnow-ping-2026-10-08.mjs              → ensaio: mostra o que seria enviado (lê o sitemap do site)
//   node scripts/indexnow-ping-2026-10-08.mjs --submit     → confere a chave no ar e envia ao IndexNow
//   node scripts/indexnow-ping-2026-10-08.mjs --sitemap-file <arquivo.xml>
//                                                          → ensaio OFFLINE (sem rede) contra um sitemap local
//
// A chave é a que a casa já usa (public/8ee9f362d6ec4042b723993c3e15936b.txt, a mesma de lib/indexnow.ts e do ping de 06/10).
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
const MAX_URLS = 10_000
const UA = { 'user-agent': 'Kineo-IndexNow/1.0' }

function fail(message) {
  console.error(`[indexnow-2026-10-08] ${message}`)
  process.exit(1)
}

// a data e os nichos desta rodada, lidos da FONTE (lib/seo/houseFilmIdeas.ts) — nada redigitado aqui
const ideasSrc = readFileSync(join(ROOT, 'lib/seo/houseFilmIdeas.ts'), 'utf8').replace(/\r\n/g, '\n')
const REVIEWED_ISO = (ideasSrc.match(/export const GEO_RODADA2_REVIEWED_ISO = '(\d{4}-\d{2}-\d{2})'/) ?? [])[1]
if (!REVIEWED_ISO) fail('GEO_RODADA2_REVIEWED_ISO não encontrado em lib/seo/houseFilmIdeas.ts')
const idsBlock = (ideasSrc.match(/export const NICHE_HOUSE_FILM_IDS: Readonly<Record<string, string>> = \{\n([\s\S]*?)\n\}/) ?? [])[1]
if (!idsBlock) fail('NICHE_HOUSE_FILM_IDS não encontrado em lib/seo/houseFilmIdeas.ts')
const NICHES = [...idsBlock.matchAll(/^\s+(\w+): '/gm)].map((m) => m[1])
if (NICHES.length === 0) fail('nenhum nicho em NICHE_HOUSE_FILM_IDS')
const ESCOPO = ['/ai-video-generator/seedance', '/state-of-ai-shorts-2026', ...NICHES.map((n) => `/free-ai-shorts/${n}`)]

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

// 3) só as URLs desta rodada (lastmod começando por 2026-10-08), caminho exato do escopo, host canônico, https, sem repetição
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
  if (!ESCOPO.includes(u.pathname)) continue
  if (!urlList.includes(u.href)) urlList.push(u.href)
}
if (urlList.length === 0) fail(`nenhuma URL com lastmod ${REVIEWED_ISO} — a rodada ainda não foi publicada? Nada enviado.`)
if (urlList.length > MAX_URLS) fail('acima do limite do protocolo (10.000 URLs)')

const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }

if (!submit) {
  console.log(JSON.stringify({ mode: sitemapFile ? 'ensaio-offline' : 'ensaio', endpoint: ENDPOINT, keyLocation: KEY_LOCATION, reviewed: REVIEWED_ISO, urlCount: urlList.length, urlList }, null, 2))
  console.log('\nNada foi enviado. Para enviar de verdade: node scripts/indexnow-ping-2026-10-08.mjs --submit')
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
