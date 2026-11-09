// KINEO-ENQUADRAMENTO-0911 — guardião do pedido do fundador 09/11: "Eu quero que você coloque um código que sempre que a gente for colocar
// alguma coisa nova, a gente coloque ele com os quadros certos. A gente não pode errar isso."
//
// Um teste não enxerga a imagem. Ele garante que a conferência FOI FEITA, FOI ANOTADA e que nada mudou desde então:
//   (A) toda mídia que a vitrine (home + /made-with-kineo) pode mostrar nos próximos 400 dias tem linha em lib/vitrineEnquadramento.ts;
//   (B) o focus que o código usa é o focus anotado (mudou um sem o outro = vermelho);
//   (C) toda forma de janela em que a mídia aparece foi conferida (clipe novo que vira cartão grande também);
//   (D) o vídeo e o pôster são os MESMOS bytes conferidos (trocou o arquivo = vermelho até conferir de novo);
//   (E) vídeo conferido em pelo menos 8 quadros (foto: o quadro único); data válida; focus no formato "X% Y%"; nenhuma linha órfã;
//   (F) o CSS de onde as janelas (JANELAS) foram medidas não mudou: mudou o desenho da grade, refazer as janelas e a conferência;
//   (M) mutantes ficam vermelhos, cada um trocando a FONTE de verdade antes de carregar.
// Para consertar um vermelho: node scripts/enquadra.mjs <id> → olhar a folha → colar a linha impressa no registro.
// Rodar: node scripts/test-enquadramento-vitrine-0911.mjs
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, carrega, midiasDaVitrine, impressao, lerPublico } from './vitrine-tiles.mjs'

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))

// O CSS de onde saem as JANELAS (lib/vitrineEnquadramento.ts). Mudou um destes, as proporções dos cartões mudaram.
const CSS_PINOS = [
  ['components/home/HomeMosaic.tsx', '.klp .kmz-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:clamp(92px,8.6vw,138px);grid-auto-flow:row dense;gap:12px}'],
  ['components/home/HomeMosaic.tsx', '.klp .kmz-big{grid-column:span 2;grid-row:span 4}'],
  ['components/home/HomeMosaic.tsx', '.klp .kmz-wide{grid-column:span 2}'],
  ['components/home/HomeMosaic.tsx', 'grid-row:span 2;overflow:hidden'],
  ['components/home/HomeMosaic.tsx', '@media(max-width:1099px){.klp .kmz-grid{grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:clamp(100px,15vw,150px)}}'],
  ['components/home/HomeMosaic.tsx', '.klp .kmz-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:27vw;gap:8px}.klp .kmz-t{grid-row:span 2;border-radius:11px}.klp .kmz-big{grid-column:span 1;grid-row:span 3}.klp .kmz-wide{grid-column:span 2;grid-row:span 2}'],
  ['app/appearance.css', ':root{--k2f:max(300px,calc((100vh - 244px)/2))!important}'],
  ['app/appearance.css', '.klp #samples .kmz-grid{grid-auto-rows:calc((var(--k2f) - 24px)/3)!important}'],
  ['app/appearance.css', '[data-home-cta="mosaic_motion"]{display:block!important;grid-column:span 1!important;grid-row:span 3!important}'],
  ['app/KineoLanding.tsx', '.klp .wrap{max-width:none;margin:0 auto;padding:0 32px}'],
]

/** Devolve a lista de erros. `trocas` muda a fonte antes de carregar; `ler` muda os bytes lidos de public/; `css` muda o texto lido. */
function verifica({ trocas = {}, ler = lerPublico, css = (rel, t) => t, dias = 400 } = {}) {
  const e = []
  const mods = carrega(trocas)
  const { ENQUADRAMENTO: REG, JANELAS } = mods.registro
  const midias = midiasDaVitrine(mods, { dias })
  const FORMAS = new Set(Object.keys(JANELAS))
  for (const m of midias.values()) {
    const r = REG[m.key]
    const tag = `${m.kind} ${m.label} (${m.key})`
    if (m.conflito) e.push(`B ${tag}: o mesmo arquivo aparece com dois focus (${m.conflito})`)
    if (!r) { e.push(`A ${tag}: sem conferência de quadro — rode node scripts/enquadra.mjs ${m.label}`); continue }
    if (r.focus !== m.focus) e.push(`B ${tag}: focus no código ${m.focus} ≠ conferido ${r.focus}`)
    for (const s of m.shapes) if (!r.shapes.includes(s)) e.push(`C ${tag}: aparece na janela "${s}" e não foi conferido nela`)
    const media = impressao(m.media, ler)
    if (!media) e.push(`D ${tag}: arquivo de mídia não existe em public/`)
    else if (media !== r.media) e.push(`D ${tag}: o arquivo mudou desde a conferência (${r.media} → ${media})`)
    const poster = m.poster ? impressao(m.poster, ler) : null
    if ((r.poster ?? null) !== poster) e.push(`D ${tag}: o pôster mudou desde a conferência (${r.poster} → ${poster})`)
  }
  for (const [k, r] of Object.entries(REG)) {
    if (!midias.has(k)) e.push(`E linha órfã no registro (a vitrine não mostra mais): ${k}`)
    const video = /\.(mp4|webm|mov)$/i.test(k)
    if (video ? r.frames < 8 : r.frames < 1) e.push(`E ${k}: só ${r.frames} quadro(s) conferido(s) (mínimo ${video ? 8 : 1})`)
    if (!/^2\d{3}-\d{2}-\d{2}$/.test(r.date || '')) e.push(`E ${k}: data inválida`)
    if (!/^\d+(\.\d+)?% \d+(\.\d+)?%$/.test(r.focus || '')) e.push(`E ${k}: focus fora do formato "X% Y%": ${r.focus}`)
    if (!r.shapes?.length || r.shapes.some((s) => !FORMAS.has(s))) e.push(`E ${k}: forma de janela desconhecida: ${r.shapes}`)
  }
  for (const [s, j] of Object.entries(JANELAS)) if (!(j.min > 0 && j.max >= j.min)) e.push(`F janela ${s} inválida`)
  for (const [rel, pino] of CSS_PINOS) if (!lf(css(rel, rd(rel))).includes(pino)) e.push(`F ${rel}: o CSS da grade mudou ("${pino.slice(0, 60)}…") — refazer JANELAS e conferir de novo`)
  return { e, n: midias.size, reg: Object.keys(REG).length }
}

console.log('\n(A–F) a vitrine de hoje e dos próximos 400 dias')
const base = verifica()
for (const x of base.e.slice(0, 40)) console.log('       ', x)
if (base.e.length > 40) console.log(`        … e mais ${base.e.length - 40}`)
ok(base.e.length === 0, `${base.n} mídias da vitrine, ${base.reg} linhas no registro, ${base.e.length} erro(s)`)
ok(base.n >= 100, `a vitrine tem ${base.n} mídias (≥ 100: a lista não encolheu por engano)`)
const regSrc = rd('lib/vitrineEnquadramento.ts')
ok(/COMO ENTRA MÍDIA NOVA NA VITRINE/.test(regSrc), 'o registro explica como entra mídia nova')
ok(/scripts\/enquadra\.mjs/.test(rd('lib/clipesNos2Lugares.ts')), 'lib/clipesNos2Lugares.ts manda usar scripts/enquadra.mjs')
ok(/scripts\/enquadra\.mjs/.test(rd('components/home/HomeMosaic.tsx')), 'components/home/HomeMosaic.tsx manda usar scripts/enquadra.mjs')

console.log('\n(M) mutantes — cada um tem de ficar vermelho')
const D = 30
const mutantes = [
  ['muda o focus do leão no código', { trocas: { 'components/home/HomeMosaic.tsx': (s) => s.replace("lion: '50% 22%'", "lion: '50% 50%'") } }, /B .*lion/],
  ['volta a foto da poça para o centro', { trocas: { 'components/home/HomeMosaic.tsx': (s) => s.replace("'puddle.webp': '50% 32%', ", '') } }, /B .*puddle/],
  ['clipe novo entra sem conferência', { trocas: { 'lib/clipesNos2Lugares.ts': (s) => s.replace("export const CLIPES_NOVOS: readonly ClipeNovo[] = [", "export const CLIPES_NOVOS: readonly ClipeNovo[] = [\n  { id: 'clipe-sem-conferir', title: 'X', engine: 'h3', clipId: 'fal:x', focus: '50% 50%', pessoa: false, prompt: null },") } }, /A .*clipe-sem-conferir/],
  ['foto nova entra sem conferência', { trocas: { 'components/home/HomeMosaic.tsx': (s) => s.replace("  { file: 'canoe.webp',", "  { file: 'nova.webp', w: 640, h: 1138, alt: 'x' },\n  { file: 'canoe.webp',") } }, /A .*nova\.webp/],
  ['estilo de anúncio muda de focus', { trocas: { 'components/home/HomeMosaic.tsx': (s) => s.replace("graffiti_ad: '50% 62%'", "graffiti_ad: '50% 45%'") } }, /B .*graffiti_ad/],
  ['efeito muda de focus', { trocas: { 'components/home/HomeMosaic.tsx': (s) => s.replace("kiss: '50% 22%'", "kiss: '50% 45%'") } }, /B .*kiss/],
  ['multicâmera muda de focus', { trocas: { 'components/home/HomeMosaic.tsx': (s) => s.replace("poster: '/posters/motion-horse-0611.webp', focus: '50% 32%'", "poster: '/posters/motion-horse-0611.webp', focus: '50% 50%'") } }, /B .*motion-horse/],
  ['registro com só 6 quadros', { trocas: { 'lib/vitrineEnquadramento.ts': (s) => s.replace(/('\/previews\/galeria\/lion\.mp4': \{[^}]*frames: )\d+/, '$16') } }, /E .*lion\.mp4: só 6/],
  ['registro sem a janela grande de um clipe novo', { trocas: { 'lib/vitrineEnquadramento.ts': (s) => s.replace(/('\/previews\/galeria\/pet-barista\.mp4': \{[^}]*shapes: )\[[^\]]*\]/, "$1['small']") } }, /C .*pet-barista/],
  ['a prévia do leão trocou de bytes', { ler: (rel) => { const b = lerPublico(rel); return rel.endsWith('galeria/lion.mp4') && b ? Buffer.concat([b, Buffer.from([0])]) : b } }, /D .*lion.*arquivo mudou/],
  ['o pôster do cachorro barista trocou', { ler: (rel) => { const b = lerPublico(rel); return rel.endsWith('galeria/pet-barista.webp') && b ? b.subarray(1) : b } }, /D .*pet-barista.*pôster mudou/],
  ['linha órfã no registro', { trocas: { 'lib/vitrineEnquadramento.ts': (s) => s.replace('export const ENQUADRAMENTO: Readonly<Record<string, Enquadrado>> = {', "export const ENQUADRAMENTO: Readonly<Record<string, Enquadrado>> = {\n  '/previews/nao-existe.mp4': { focus: '50% 50%', shapes: ['small'], frames: 10, date: '2026-11-09', media: '1:x', poster: null },") } }, /E linha órfã/],
  ['a grade do computador vira 5 colunas', { css: (rel, t) => (rel === 'components/home/HomeMosaic.tsx' ? t.replace('repeat(6,minmax(0,1fr))', 'repeat(5,minmax(0,1fr))') : t) }, /F .*HomeMosaic.*CSS da grade mudou/],
  ['a fileira da home muda de altura', { css: (rel, t) => (rel === 'app/appearance.css' ? t.replace('(var(--k2f) - 24px)/3', '(var(--k2f) - 24px)/4') : t) }, /F .*appearance.*CSS da grade mudou/],
]
for (const [nome, opts, padrao] of mutantes) {
  const r = verifica({ ...opts, dias: D })
  ok(r.e.some((x) => padrao.test(x)), `mutante "${nome}" fica vermelho${r.e.length ? '' : ' (passou verde!)'}`)
}
carrega() // devolve o cache limpo

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
