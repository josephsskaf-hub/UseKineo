// KINEO-ADS-EXEMPLOS-1111 — guardião da seção "Ads made with Kineo" da /ads.
// Prova: cada linha de lib/ads/adsExemplos.ts tem os 3 arquivos (capa ≤ 30 KB, prévia muda ≤ 400 KB com +faststart, anúncio
// inteiro COM som); o cartão não diz motor nem preço; a prévia não baixa na abertura (preload="none", <video> só monta perto
// da tela) e nada toca com som sozinho; texto ≥ 12 px; 2 colunas no celular; a seção vem ANTES dos estilos. Mutantes no fim.
// Rodar: node scripts/test-ads-exemplos-1111.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const LISTA = 'lib/ads/adsExemplos.ts'
const COMP = 'components/ads/AdsExemplos.tsx'
const PAGE = 'app/ads/page.tsx'

function carrega(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (d) => { throw new Error('adsExemplos deixou de ser puro: ' + d) })
  return mod.exports
}

// MP4: +faststart = o átomo moov vem antes do mdat; áudio = existe uma trilha com handler 'soun'.
function mp4(path) {
  const b = fs.readFileSync(path)
  const moov = b.indexOf('moov'), mdat = b.indexOf('mdat')
  return { faststart: moov > 0 && (mdat < 0 || moov < mdat), audio: b.indexOf('soun') > 0 && b.indexOf('soun') < (mdat > 0 ? Math.max(mdat, moov + 1) : b.length) || (moov > mdat && b.indexOf('soun', moov) > 0) }
}

const PROIBIDO_NO_CARTAO = /\b(kling|seedance|veo|h3|minimax|pixverse|nano ?banana|fal|hollywood|sora|runway|credits?|cr[ée]ditos?)\b|[$€£]|R\$|\bfree\b/i

function confereLista(L, base = 'public') {
  const p = []
  const itens = L.ADS_EXEMPLOS
  if (!Array.isArray(itens) || itens.length < 6) p.push('a lista tem de começar com os 6 anúncios de Natal')
  const keys = new Set()
  for (const it of itens ?? []) {
    if (keys.has(it.key)) p.push('chave repetida: ' + it.key)
    keys.add(it.key)
    if (!/^[a-z0-9-]+$/.test(it.key)) p.push('chave com caractere estranho: ' + it.key)
    if (PROIBIDO_NO_CARTAO.test(it.title) || PROIBIDO_NO_CARTAO.test(it.format)) p.push(`cartão com motor ou preço: ${it.key} (${it.title} / ${it.format})`)
    if (!Number.isInteger(it.seconds) || it.seconds < 5 || it.seconds > 60) p.push('duração fora de 5–60 s: ' + it.key)
    if (it.preview !== `/ads-exemplos/${it.key}.mp4` || it.poster !== `/ads-exemplos/${it.key}.webp` || it.full !== `/ads-exemplos/${it.key}-completo.mp4`) p.push('caminhos fora do padrão: ' + it.key)
    const capa = base + it.poster, previa = base + it.preview, inteiro = base + it.full
    for (const f of [capa, previa, inteiro]) if (!fs.existsSync(f)) p.push('arquivo ausente: ' + f)
    if (!fs.existsSync(capa) || !fs.existsSync(previa) || !fs.existsSync(inteiro)) continue
    if (fs.statSync(capa).size > 30_000) p.push(`capa > 30 KB: ${it.key} (${fs.statSync(capa).size})`)
    if (fs.statSync(previa).size > 400_000) p.push(`prévia > 400 KB: ${it.key} (${fs.statSync(previa).size})`)
    if (fs.statSync(inteiro).size > 3_000_000) p.push(`anúncio inteiro > 3 MB: ${it.key}`)
    const pv = mp4(previa), fu = mp4(inteiro)
    if (!pv.faststart) p.push('prévia sem +faststart: ' + it.key)
    if (pv.audio) p.push('prévia com áudio (tem de ser muda): ' + it.key)
    if (!fu.faststart) p.push('anúncio inteiro sem +faststart: ' + it.key)
    if (!fu.audio) p.push('anúncio inteiro sem som: ' + it.key)
  }
  if (L.ADS_EXEMPLOS_LIVE !== true) p.push('o interruptor da seção nasce ligado')
  return p
}

function confereComponente(C) {
  const p = []
  if (!C.includes('preload="none"')) p.push('a prévia tem de ser preload="none"')
  if (!/\{montado \? <video ref=\{vid\} src=\{item\.preview\}[^\n]*muted loop playsInline preload="none"/.test(C)) p.push('o <video> da prévia só monta perto da tela, mudo')
  if (!C.includes("rootMargin: '200px 0px'")) p.push('a prévia monta por IntersectionObserver perto da tela')
  if (!C.includes('loading="lazy"')) p.push('a capa carrega preguiçosa')
  // som só no player, depois do clique: o único <video> sem `muted` é o do diálogo, com controles
  const codigo = C.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '') // comentários fora: só o JSX de verdade conta
  const semMudo = [...codigo.matchAll(/<video\b[^>]*>/g)].map((m) => m[0]).filter((v) => !/\bmuted\b/.test(v))
  if (semMudo.length !== 1 || !/src=\{aberto\.full\}/.test(semMudo[0]) || !/\bcontrols\b/.test(semMudo[0])) p.push('só o player aberto pelo clique toca com som (e com controles)')
  const fontes = [...C.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
  if (!fontes.length || fontes.some((n) => n < 12)) p.push('texto abaixo de 12 px no cartão: ' + fontes.join(','))
  if (!/@media \(max-width:480px\)\{\.kex-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(C)) p.push('2 colunas no celular')
  if (!C.includes("if (e.key === 'Escape') setAberto(null)")) p.push('o player fecha com Esc')
  return p
}

function conferePagina(P) {
  const p = []
  const iEx = P.indexOf('<h2 id="ads-examples">Ads made with Kineo</h2>')
  const iSt = P.indexOf('<h2 id="ads-styles">Styles for your product shot</h2>')
  if (iEx < 0) p.push('a seção "Ads made with Kineo" não está na /ads')
  else if (iSt < 0 || iEx > iSt) p.push('a seção dos anúncios tem de vir ANTES dos estilos')
  if (!P.includes('{ADS_EXEMPLOS_LIVE ? (')) p.push('a seção obedece ao interruptor')
  if (!P.includes('<AdsExemplosGrid />')) p.push('a seção usa o componente da lista')
  // honestidade: os de Natal foram feitos pela casa fora do Studio Ads — a página não pode dizer que a ferramenta os fez
  const trecho = iEx >= 0 ? P.slice(iEx, P.indexOf('</section>', iEx)) : ''
  if (/made (with|by|in) Studio Ads|Studio Ads made/i.test(trecho)) p.push('a seção diz que o Studio Ads fez os exemplos')
  return p
}

const L = carrega(lf(LISTA)), C = lf(COMP), P = lf(PAGE)
const falhas = [...confereLista(L), ...confereComponente(C), ...conferePagina(P)]
if (falhas.length) { console.error('FALHA\n' + falhas.join('\n')); process.exit(1) }

// ── mutantes ─────────────────────────────────────────────────────────────────────────────────────────────────
const mutantes = [
  ['motor no cartão', () => confereLista(carrega(lf(LISTA).replace("'UGC review', 15)", "'Kling 4 UGC', 15)")))],
  ['preço no cartão', () => confereLista(carrega(lf(LISTA).replace("'The gift watch'", "'The gift watch — $9'")))],
  ['item sem arquivos', () => confereLista(carrega(lf(LISTA).replace("  exemplo('caneca',", "  exemplo('nao-existe', 'X', 'UGC review', 15),\n  exemplo('caneca',")))],
  ['prévia baixando na abertura', () => confereComponente(C.replaceAll('preload="none"', 'preload="metadata"'))],
  ['prévia com som', () => confereComponente(C.replace('src={item.preview} poster={item.poster} muted loop', 'src={item.preview} poster={item.poster} loop'))],
  ['texto de 11 px', () => confereComponente(C.replace('.kex-secs{font-size:12px', '.kex-secs{font-size:11px'))],
  ['seção depois dos estilos', () => {
    const i = P.indexOf('        {/* KINEO-ADS-EXEMPLOS-1111'), j = P.indexOf('        {/* KINEO-ESTILOS-PRODUTO-2026-10-09'), k = P.indexOf('        <section className="ads-sec" aria-labelledby="ads-levels">')
    return conferePagina(P.slice(0, i) + P.slice(j, k) + P.slice(i, j) + P.slice(k))
  }],
]
let mortos = 0
for (const [nome, roda] of mutantes) { if (roda().length) mortos++; else console.error('MUTANTE VIVO: ' + nome) }
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS ads-exemplos: ${L.ADS_EXEMPLOS.length} anúncios com capa ≤ 30 KB, prévia muda ≤ 400 KB e inteiro com som; sem motor/preço; ${mortos}/${mutantes.length} mutantes mortos`)
