// KINEO-DOWNLOAD-NOSSO-1311 — guardião do "baixar pelo nosso domínio" [dono 13/11 ~20:10: "a URL ainda tá parecendo Supabase lá em cima"].
// Prova, EXECUTANDO: (1) a regra pura (lib/downloadNosso.ts): arquivo nosso vira /api/download?f=…&name=…, link de fora fica igual,
// caminho com ".." ou sem extensão de mídia morre, o dono é um pedaço INTEIRO do caminho, o nome é limpo e leva a extensão real;
// (2) a rota (app/api/download/route.ts) com dublês de Next/Supabase: sem sessão → login; arquivo de outra conta → 404; o seu → 302 para o
// Storage com ?download=<nome> e evento media_download_served; nunca busca os bytes; (3) as telas: Recreate baixa pelo baixador da casa
// (video_download_clicked/video_downloaded, surface 'recreate') e nenhuma das telas consertadas aponta para o endereço cru. Mutantes.
// Rodar: node scripts/test-download-nosso-1311.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const js = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function modulo(src, req = () => { throw new Error('import inesperado') }) {
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', 'process', js(src))(req, mod, mod.exports, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://cqqukkvjjrguayiyjvhh.supabase.co' } })
  return mod.exports
}

const U = 'e92d81bf-0068-46c3-8de7-1f67e2006756'
const OUTRO = '11111111-2222-4333-8444-555555555555'
const SB = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/'
const CLIP = `${SB}clips/${U}/67404c04-babf-4058-9d7a-e91ea11debe9.mp4`

async function bateria(over = {}) {
  const p = []
  const check = async (n, fn) => { try { await fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const fonteLib = over.lib ?? lf('lib/downloadNosso.ts')
  const D = modulo(fonteLib)

  await check('arquivo nosso vira a rota do nosso domínio', async () => {
    const h = D.downloadHref(CLIP, 'kineo-recreate-dance.mp4', 'recreate')
    if (!h.startsWith('/api/download?')) throw new Error(h)
    if (/supabase/i.test(h)) throw new Error('endereço do Supabase no link: ' + h)
    const q = new URLSearchParams(h.split('?')[1])
    if (q.get('f') !== `clips/${U}/67404c04-babf-4058-9d7a-e91ea11debe9.mp4` || q.get('name') !== 'kineo-recreate-dance.mp4' || q.get('s') !== 'recreate') throw new Error(h)
  })
  await check('link de fora fica igual', async () => {
    for (const u of ['https://v3.fal.media/files/x/clip.mp4', 'blob:https://usekineo.com/abc', 'https://evil.example.com/storage/v1/object/public/renders/a/b.mp4'])
      if (D.downloadHref(u, 'x.mp4') !== u) throw new Error(u)
  })
  await check('caminho perigoso ou sem mídia morre', async () => {
    for (const c of [`clips/${U}/../x.mp4`, `clips//${U}/x.mp4`, `clips/${U}/x.html`, `clips/${U}/x`, 'x.mp4', `clips/${U}/a b.mp4`, null, ''])
      if (D.caminhoValido(c) !== null) throw new Error(String(c))
    if (D.caminhoValido(`clips/${U}/x.mp4`) !== `clips/${U}/x.mp4`) throw new Error('recusou o válido')
  })
  await check('dono = pedaço inteiro do caminho', async () => {
    if (!D.donoDoCaminho(`clips/${U}/x.mp4`, U)) throw new Error('recusou o dono')
    if (D.donoDoCaminho(`clips/${OUTRO}/x.mp4`, U)) throw new Error('aceitou outra conta')
    if (D.donoDoCaminho(`clips/x/${U}.mp4`, U)) throw new Error('aceitou o id no NOME do arquivo')
    if (D.donoDoCaminho(`clips/${U}/x.mp4`, '')) throw new Error('aceitou conta vazia')
  })
  await check('nome limpo com a extensão real', async () => {
    if (D.nomeDoArquivo('kineo image 3.png', `images/${U}/a.jpg`) !== 'kineo-image-3.jpg') throw new Error(D.nomeDoArquivo('kineo image 3.png', `images/${U}/a.jpg`))
    if (D.nomeDoArquivo('"><script>', `clips/${U}/a.mp4`) !== 'script.mp4') throw new Error(D.nomeDoArquivo('"><script>', `clips/${U}/a.mp4`))
    if (D.nomeDoArquivo('', `clips/${U}/a.mp4`) !== 'kineo-video.mp4') throw new Error('padrão')
  })

  // ── a rota, executada com dublês ─────────────────────────────────────────
  const fonteRota = over.rota ?? lf('app/api/download/route.ts')
  async function rota(url, userId) {
    const eventos = []; let buscou = false
    class NextResponse {
      constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.headers = new Map(Object.entries(init.headers ?? {})); this.headers.set = this.headers.set.bind(this.headers) }
      static redirect(loc, status) { const r = new NextResponse(null, { status }); r.location = loc; return r }
    }
    const R = modulo(fonteRota, (id) => {
      if (id === 'next/server') return { NextResponse }
      if (id === 'next/headers') return { cookies: () => ({ get: () => undefined }) }
      if (id === '@/lib/supabase/server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) } }) }
      if (id === '@/lib/serverEvents') return { writeServerEvent: async (e) => { eventos.push(e); return true } }
      if (id === '@/lib/downloadNosso') return D
      throw new Error('import inesperado: ' + id)
    })
    const u = new URL(url, 'https://usekineo.com')
    const orig = globalThis.fetch; globalThis.fetch = async () => { buscou = true; throw new Error('a rota não pode buscar os bytes') }
    try { return { r: await R.GET({ nextUrl: u }), eventos, buscou } } finally { globalThis.fetch = orig }
  }
  const HREF = D.downloadHref(CLIP, 'kineo-recreate-dance.mp4', 'recreate')
  await check('sem sessão → login, nada servido', async () => {
    const { r, eventos } = await rota(HREF, null)
    if (r.status !== 302 || !String(r.location).includes('/login') || eventos.length) throw new Error(r.status + ' ' + r.location)
  })
  await check('arquivo de outra conta → 404', async () => {
    const { r, eventos } = await rota(HREF, OUTRO)
    if (r.status !== 404 || eventos.length) throw new Error(String(r.status))
  })
  await check('caminho com .. → 404', async () => {
    const { r } = await rota(`/api/download?f=${encodeURIComponent(`clips/${U}/../../x.mp4`)}`, U)
    if (r.status !== 404) throw new Error(String(r.status))
  })
  await check('o seu → 302 ao Storage com attachment + evento, sem buscar bytes', async () => {
    const { r, eventos, buscou } = await rota(HREF, U)
    if (r.status !== 302) throw new Error(String(r.status))
    if (r.location !== `${SB}clips/${U}/67404c04-babf-4058-9d7a-e91ea11debe9.mp4?download=kineo-recreate-dance.mp4`) throw new Error(r.location)
    if (eventos.length !== 1 || eventos[0].name !== 'media_download_served' || eventos[0].userId !== U || eventos[0].metadata.surface !== 'recreate') throw new Error(JSON.stringify(eventos))
    if (buscou) throw new Error('buscou os bytes')
  })

  // ── as telas ──────────────────────────────────────────────────────────────
  const telas = over.telas ?? {}
  const t = (f) => (telas[f] ?? lf(f)).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')
  await check('Recreate baixa pelo baixador da casa e pela rota', async () => {
    const s = t('app/recreate/RecreateClient.tsx')
    if (/href=\{clip\.video_url\}/.test(s)) throw new Error('link cru do Supabase no Recreate')
    // KINEO-M12-LIGADO-1411 [CEO 14/11, reancoragem sem afrouxar] — o fluxo novo do Recreate trouxe mais um botão de download (eram 2, são 3).
    // Em vez de um número fixo: TODO botão "Download" da tela passa pela rota, e são pelo menos os 2 de sempre.
    const pelaRota = (s.match(/downloadHref\(clip\.video_url, downloadName, 'recreate'\)/g) ?? []).length
    const botoes = (s.match(/>Download [↓↗]<\/a>/g) ?? []).length
    if (pelaRota < 2 || pelaRota !== botoes) throw new Error(`os links do Recreate não passam todos pela rota (${pelaRota} de ${botoes})`)
    if (!/downloadVideoFile\(\{[^}]*surface: 'recreate'/.test(s)) throw new Error('sem o baixador da casa (evento de download)')
    if (!/kineo-recreate-\$\{/.test(s)) throw new Error('nome do arquivo')
  })
  await check('as outras telas consertadas usam a rota', async () => {
    const casos = [
      ['components/library/RecreateShelf.tsx', /downloadHref\(c\.video_url,/, /href=\{c\.video_url \?\? undefined\}/],
      ['app/(dashboard)/ads/v2/AdsV2AfterDelivery.tsx', /downloadHref\(v\.video_url,/, /href=\{v\.video_url\}/],
      ['app/film-complete/page.tsx', /downloadHref\(videoUrl,[\s\S]*downloadHref\(sourceUrl,/, /href=\{videoUrl\}/],
      ['components/growth/DownloadUpsell.tsx', /downloadHref\(hdUrl,/, /href=\{hdUrl\}/],
      ['app/(dashboard)/library/LibraryClient.tsx', /window\.open\(downloadHref\(url,/, /window\.open\(url,/],
      ['app/(dashboard)/audio/AudioClient.tsx', /window\.open\(downloadHref\(url,/, /window\.open\(url,/],
      ['app/(dashboard)/images/ImagesClient.tsx', /window\.open\(downloadHref\(url,/, /window\.open\(url,/],
    ]
    for (const [f, tem, naoTem] of casos) { const s = t(f); if (!tem.test(s) || naoTem.test(s)) throw new Error(f) }
  })
  await check('baixador da casa: aba de reserva e link manual pela rota', async () => {
    const s = t('lib/videoDownload.ts')
    if (/window\.open\(url, '_blank'/.test(s)) throw new Error('a aba de reserva abre o endereço cru')
    if (!/window\.open\(caminhoDoArquivo\(url\) \? downloadHref\(url, filename, opts\.surface\) : url/.test(s)) throw new Error('aba de reserva')
    if (!/if \(caminhoDoArquivo\(url\)\) return downloadHref\(url, filename, surface\)/.test(s)) throw new Error('link manual')
    if (!/'recreate'/.test(s.match(/export type DownloadSurface[^\n]*/)?.[0] ?? '')) throw new Error('surface recreate')
  })
  return p
}

const real = await bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const lib = lf('lib/downloadNosso.ts'), rotaSrc = lf('app/api/download/route.ts'), rec = lf('app/recreate/RecreateClient.tsx'), vd = lf('lib/videoDownload.ts')
const mutantes = [
  ['link nosso continua cru', { lib: lib.replace('  if (!caminho) return url\n', '  if (!caminho || caminho) return url\n') }],
  ['dono vira "contém o texto"', { lib: lib.replace("return caminho.split('/').slice(0, -1).includes(userId)", 'return caminho.includes(userId)') }],
  ['aceita ".."', { lib: lib.replace("p === '..' || ", '') }],
  ['rota sem conferir o dono', { rota: rotaSrc.replace("  if (!donoDoCaminho(caminho, userId)) return texto(404, 'File not found.')\n", '') }],
  ['rota sem sessão', { rota: rotaSrc.replace('  if (!userId) return NextResponse.redirect', '  if (false) return NextResponse.redirect') }],
  ['rota sem nome de baixar', { rota: rotaSrc.replace('urlDeBaixar(base, caminho, nome)', "`${base}/storage/v1/object/public/renders/${caminho}`") }],
  ['rota sem evento', { rota: rotaSrc.replace('    await writeServerEvent({', '    if (false) await writeServerEvent({') }],
  ['Recreate volta ao link cru', { telas: { 'app/recreate/RecreateClient.tsx': rec.replace("<a href={downloadHref(clip.video_url, downloadName, 'recreate')} onClick={onDownload}>Download ↓</a> · <Link", '<a href={clip.video_url} download>Download ↗</a> · <Link') } }],
  ['aba de reserva com endereço cru', { telas: { 'lib/videoDownload.ts': vd.replace("window.open(caminhoDoArquivo(url) ? downloadHref(url, filename, opts.surface) : url, '_blank'", "window.open(url, '_blank'") } }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const mudou = (over.lib && over.lib !== lib) || (over.rota && over.rota !== rotaSrc) || (over.telas && Object.entries(over.telas).every(([f, s]) => s !== lf(f)))
  if (!mudou) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if ((await bateria(over)).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS download pelo nosso domínio: arquivo nosso → /api/download (sessão + dono + attachment com nome Kineo + evento, sem bytes na Vercel); Recreate e 7 telas sem endereço do Supabase; ${mortos}/${mutantes.length} mutantes mortos`)
