#!/usr/bin/env node
// KINEO-HOME-PITCH-1611 — guardião (dono 16/11 ~00:10: "Coloca o pitch na homepage!! Em alguma posição de destaque").
// Executa a vitrine DE VERDADE (components/home/HomeMosaic.tsx, a mesma da home e do /made-with-kineo) e prova:
//   T · o "Pitch invader" ABRE a home: 1º cartão do topo (em cima à esquerda, no computador e no celular), do MESMO tamanho dos vizinhos (2×2 foi medido e
//       recusado: 1236×1481 a 1920 px, mais alto que a tela), e não se repete na grade.
//   L · o link: logado → /recreate/invasor-de-campo; visitante → mesmo editor quando público, ou cadastro com retorno quando a chave fecha, nunca 404 nem arquivo privado.
//   R · o selo "Recreate" (o desenho de KINEO-ETIQUETA-UNICA-1111) e o nome "Pitch invader"; nenhum número de views (não há post real deste vídeo).
//   M · a prévia é NOSSA, muda, 540×960, ≤600 KB, com pôster e linha no registro de enquadramento com o mesmo foco.
//   V · está também no /made-with-kineo; o molde existe no catálogo do SERVIDOR e um cliente comum o vê; nada da receita entra nos módulos do cartão.
//   X · mutantes: cada uma das provas acima fica vermelha quando o código muda.
// Offline, sem rede. Rodar: npx tsx scripts/test-home-pitch-1611.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Module = require('node:module')
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const ID = 'invasor-de-campo'
const LIB = 'lib/clipesNos2Lugares.ts', MOSAICO = 'components/home/HomeMosaic.tsx', ENTRY = 'lib/recreate/entry.ts', MOLDE = 'lib/recreate/invasorMolde.ts'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const norm = (f) => path.relative(ROOT, f).split(path.sep).join('/')

let trocas = {}
const resolveOriginal = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) {
    const base = path.join(ROOT, request.slice(2))
    for (const c of ['', '.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) if (fs.existsSync(base + c) && fs.statSync(base + c).isFile()) return base + c
  }
  if (request === 'server-only' || request === 'client-only') return path.join(ROOT, 'package.json')
  return resolveOriginal.call(this, request, parent, ...rest)
}
const transpila = (module, filename) => {
  let src = lf(fs.readFileSync(filename, 'utf8'))
  const troca = trocas[norm(filename)]
  if (troca) src = troca(src)
  module._compile(ts.transpileModule(src, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
}
Module._extensions['.ts'] = transpila
Module._extensions['.tsx'] = transpila
Module._extensions['.css'] = () => {}
const { renderToStaticMarkup } = require('react-dom/server')
const React = require('react')
function carrega(novasTrocas = {}) {
  trocas = novasTrocas
  for (const k of Object.keys(require.cache)) if (k.startsWith(ROOT) && !k.includes('node_modules')) delete require.cache[k]
  const r = (rel) => require(path.join(ROOT, rel))
  return { lib: r(LIB), mosaico: r(MOSAICO), entry: r(ENTRY), stats: r('lib/home/cardSocialStats.ts'), cat: r('lib/recreate/catalogoServidor.ts'), access: r('lib/recreate/access.ts'), formats: r('lib/recreate/formats.ts') }
}

/** Largura, altura e se há trilha de som, lidos das caixas do MP4 (tkhd e hdlr), sem ffprobe. */
function mp4Info(buf) {
  const out = { w: 0, h: 0, audio: false, video: false }
  const anda = (ini, fim) => {
    let p = ini
    while (p + 8 <= fim) {
      let tam = buf.readUInt32BE(p); const tipo = buf.toString('latin1', p + 4, p + 8); let cab = 8
      if (tam === 1) { tam = Number(buf.readBigUInt64BE(p + 8)); cab = 16 } else if (tam === 0) tam = fim - p
      if (tam < cab) break
      if (['moov', 'trak', 'mdia'].includes(tipo)) anda(p + cab, p + tam)
      else if (tipo === 'hdlr') { const h = buf.toString('latin1', p + cab + 8, p + cab + 12); if (h === 'soun') out.audio = true; if (h === 'vide') out.video = true }
      else if (tipo === 'tkhd') { const v = buf[p + cab]; const o = p + cab + (v === 1 ? 88 : 76); const w = buf.readUInt32BE(o) / 65536, hh = buf.readUInt32BE(o + 4) / 65536; if (w && hh) { out.w = w; out.h = hh } }
      p += tam
    }
  }
  anda(0, buf.length)
  return out
}

const cartaoDe = (html, id) => {
  const i = html.indexOf(`data-clip-novo="${id}"`)
  if (i < 0) return null
  return html.slice(html.lastIndexOf('<a ', i), html.indexOf('</a>', i) + 4)
}
const hrefDe = (cartao) => (/href="([^"]+)"/.exec(cartao ?? '')?.[1] ?? '').replace(/&amp;/g, '&')
const FLOW = 'app/recreate/RecreateFlowPage.tsx', RELEASE = 'lib/create/publicEditorRelease.ts'
const VISITANTE = '/signup?' + new URLSearchParams({ redirect: `/recreate/${ID}` }).toString()

/** Todas as provas; devolve [nome, ok][]. */
function checa(novasTrocas = {}, fontes = {}) {
  const out = []
  const c = (nome, ok) => out.push([nome, !!ok])
  let m
  try { m = carrega(novasTrocas) } catch (e) { if (process.env.DEPURA) console.log('carga:', e.stack); return [['carga ' + String(e.message).slice(0, 200), false]] }
  const { lib, mosaico, entry, stats, cat, access, formats } = m
  const clip = lib.CLIPES_NOVOS.find((x) => x.id === ID)
  // T · o topo
  c('T1 é o 1º de CLIPES_NO_TOPO; o topo segue com 6 (o suéter desceu para a grade)', lib.CLIPES_NO_TOPO[0] === ID && lib.CLIPES_NO_TOPO.length === 6 && !lib.CLIPES_NO_TOPO.includes('sueter-aconchegante') && lib.CLIPES_NOVOS.some((x) => x.id === 'sueter-aconchegante'))
  const home = lf(renderToStaticMarkup(React.createElement(mosaico.default, { signedIn: false })))
  const homeLogado = lf(renderToStaticMarkup(React.createElement(mosaico.default, { signedIn: true })))
  const topo = home.slice(home.indexOf('data-home-topo-grid="1"'), home.indexOf('<div class="kmz-grid">'))
  const primeiro = /<a [^>]*>/.exec(topo)?.[0] ?? ''
  c('T2 o 1º cartão desenhado no topo da home é o Pitch invader', primeiro.includes(`data-clip-novo="${ID}"`))
  const classes = [...topo.matchAll(/<a [^>]*class="([^"]*)"/g)].map((x) => x[1])
  c('T3 os 6 do topo com a MESMA classe (mesmo tamanho; nenhum cartão esticado)', classes.length === 6 && classes.every((k) => k === 'kmz-t kmz-big'))
  c('T4 na home ele não se repete na grade de baixo', (home.match(new RegExp(`data-clip-novo="${ID}"`, 'g')) ?? []).length === 1)
  const cssAtual = /const CSS = [\s\S]*?\n`/.exec(novasTrocas[MOSAICO] ? novasTrocas[MOSAICO](rd(MOSAICO)) : rd(MOSAICO))?.[0] ?? ''
  c('T5 CSS do topo intacto: 3 por linha no computador, 2 abaixo de 1100 px, todos em pé 5:6', cssAtual.includes('.klp .kmz-topo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:12px}\n.klp .kmz-topo-grid>.kmz-t{grid-column:auto;grid-row:auto;aspect-ratio:5/6}\n@media(max-width:1099px){.klp .kmz-topo-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n') && !/kmz-topo-grid>[^{]*\{[^}]*span/.test(cssAtual))
  // L · o link
  const cv = cartaoDe(home, ID), cl = cartaoDe(homeLogado, ID)
  const editorPublico = require(path.join(ROOT, 'lib/create/publicEditorServer.ts')).publicEditor
  c('L1 visitante: abre o editor público e, com a chave fechada, conserva cadastro com retorno', hrefDe(cv) === (editorPublico('clip') ? `/recreate/${ID}` : VISITANTE))
  c('L2 logado: abre direto o mesmo molde na home', hrefDe(cl) === `/recreate/${ID}`)
  c('L3 nenhum link do cartão aponta para arquivo do molde (/api/recreate/assets) nem para fora', ![cv, cl].some((x) => /\/api\/recreate|quarantine|recreate-guias|https?:/.test(hrefDe(x))))
  const ar = require(path.join(ROOT, 'lib/authRedirect.ts'))
  c('L4 o cadastro aceita a volta (normalizeInternalRedirect mantém o caminho)', ar.normalizeInternalRedirect(new URLSearchParams(VISITANTE.split('?')[1]).get('redirect')) === `/recreate/${ID}`)
  const fluxo = novasTrocas[FLOW] ? novasTrocas[FLOW](rd(FLOW)) : rd(FLOW)
  // Executa o bloco da rota com o catálogo e a política reais; a assinatura 404 é local e nunca abre sessão.
  const arquivo = ts.createSourceFile(FLOW, fluxo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const componente = arquivo.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'RecreateFlowPage')
  const verificacao = componente?.body?.statements.find(n => ts.isIfStatement(n) && n.expression.getText(arquivo) === 'id')
  if (!verificacao) throw new Error('Bloco de autorização por id da rota não encontrado')
  const controla = new Function('id', 'user', 'recreateFormat', 'recreateFormatVisible', 'publicRecreatePath', 'publicEditor', 'RECREATE_MOLDES_SO_LOGADO', 'notFound', verificacao.getText(arquivo))
  const ausente = Symbol('404')
  const abre = (id, user, editor, formatOverride) => {
    try {
      controla(id, user, formatOverride ?? cat.recreateFormatServidor, access.recreateFormatVisible,
        entry.publicRecreatePath, tab => editor && tab === 'clip', entry.RECREATE_MOLDES_SO_LOGADO, () => { throw ausente })
      return true
    } catch (e) { if (e === ausente) return false; throw e }
  }
  const conta = { email: 'customer@example.org' }
  c('L5a visitante abre o Pitch público com a chave ligada; OFF requer login; logado abre nos dois casos',
    abre(ID, null, true) && !abre(ID, null, false) && abre(ID, conta, true) && abre(ID, conta, false))
  const molde = cat.recreateFormatServidor(ID)
  const privado = { ...molde, swapApproved: false, swapInTest: true }
  c('L5b receita reservada ou retirada e id desconhecido são inacessíveis mesmo com a chave ligada',
    [null, conta].every(user => !abre(ID, user, true, () => privado) && !abre(ID, user, true, () => ({ ...molde, retirado: true })) &&
      !abre('id-inexistente-de-teste', user, true)) && !formats.RECREATE_FORMATS.some(f => f.id === ID))
  c('L6 só um molde de verdade entra na lista "só logado": a lista é a combinada', JSON.stringify(entry.RECREATE_MOLDES_SO_LOGADO) === JSON.stringify([ID]) && entry.recreateMoldeLogadoHref('selfie-confete', false) === null)
  // R · selo, nome, sem número
  c('R1 o nome na tela é "Pitch invader" e o tipo vive só no aria-label', clip?.title === 'Pitch invader' && cv?.includes('<b>Pitch invader</b>') && cv?.includes('aria-label="Pitch invader — Recreate template"') && !/>\s*Recreate template\s*</.test(cv ?? ''))
  c('R2 o selo "Recreate" no desenho único (kmz-chip kmz-re), sem "Make your ad" nem convite', /class="kmz-chip kmz-re"[^>]*>[\s\S]*?Recreate</.test(cv ?? '') && !/kmz-mkad|data-convite=/.test(cv ?? ''))
  c('R3 nenhum número de views ou curtidas (não há post real deste vídeo)', stats.cardStatFor(lib.clipeNovoVideo(clip ?? { id: ID })) === null && !Object.keys(stats.CARD_SOCIAL_STATS).includes(ID) && /<span class="kmz-views"><\/span>/.test(cv ?? '') && !/👁|♥|views/i.test((cv ?? '').replace(/(href|class|data-[a-z-]+|aria-label)="[^"]*"/g, '')))
  c('R4 sem motor no cartão (dado: engine null)', clip?.engine === null && clip?.selo === 'Recreate template' && !/Kling|Seedance|MiniMax/i.test((cv ?? '').replace(/(href|src)="[^"]*"/g, '')))
  // M · mídia
  const video = path.join(ROOT, 'public', lib.clipeNovoVideo({ id: ID })), poster = path.join(ROOT, 'public', lib.clipeNovoPoster({ id: ID }))
  const info = fs.existsSync(video) ? mp4Info(fs.readFileSync(fontes.video ?? video)) : null
  const tamanho = fontes.tamanho ?? (fs.existsSync(video) ? fs.statSync(video).size : Infinity)
  c('M1 prévia muda, 540×960, ≤600 KB', !!info && info.video && !info.audio && info.w === 540 && info.h === 960 && tamanho <= 600 * 1024)
  c('M2 pôster em /posters/galeria e no cartão', fs.existsSync(poster) && cv?.includes(`src="/posters/galeria/${ID}.webp"`))
  const enq = fontes.enq ?? rd('lib/vitrineEnquadramento.ts')
  const linha = new RegExp(`'/previews/galeria/${ID}\\.mp4': \\{ focus: '([^']+)'`).exec(enq)
  c('M3 linha no registro de enquadramento com o MESMO foco do cartão', !!linha && linha[1] === clip?.focus && cv?.includes(`--kmz-focus:${clip?.focus}`))
  // V · Made with Kineo e o catálogo do servidor
  const mwk = lf(renderToStaticMarkup(React.createElement(mosaico.default, { signedIn: false, full: true, styles: [] })))
  const cm = cartaoDe(mwk, ID)
  c('V1 está no /made-with-kineo, com o mesmo link e o selo Recreate', !!cm && hrefDe(cm) === hrefDe(cv) && /class="kmz-chip kmz-re"/.test(cm))
  const f = cat.recreateFormatServidor(ID)
  c('V2 o molde existe no catálogo do servidor e um cliente comum o vê', !!f && access.recreateFormatVisible(f, 'customer@example.org') === true && cat.formatosParaOCliente('customer@example.org').some((x) => x.id === ID))
  const modulos = [LIB, MOSAICO, ENTRY].map((r) => (novasTrocas[r] ? novasTrocas[r](rd(r)) : rd(r)))
  c('V3 nenhum módulo do cartão importa o molde nem traz a receita', modulos.every((s) => !/invasorMolde|invasorServer|from '\.\/invasor'|kineo-trecho:|recreate-invasor-de-campo-t\d|the man in the dark blue shirt|quarantine/.test(s)))
  return out
}

let falhas = 0
const casos = checa()
for (const [n, ok] of casos) { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}`); if (!ok) falhas++ }

const troca = (a, b) => (s) => { if (!s.includes(a)) throw new Error('âncora do mutante sumiu: ' + a.slice(0, 70)); return s.replace(a, b) }
const fechada = checa({ [RELEASE]: troca('PUBLIC_CREATE_EDITORS = true', 'PUBLIC_CREATE_EDITORS = false') })
for (const [nome, ok] of fechada.filter(([n]) => /^(?:L[12]|V1) /.test(n))) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} OFF ${nome}`)
  if (!ok) falhas++
}
const MUT = [
  ['o Pitch invader sai da frente do topo', { [LIB]: troca('  return [...moldes, ...base.filter((id) => !moldes.includes(id))].slice(0, 6)', '  return [...base.filter((id) => !moldes.includes(id)).slice(0, 1), ...moldes, ...base.filter((id) => !moldes.includes(id)).slice(1)].slice(0, 6)') }, 'T2'], // reancorado KINEO-NOVIDADE-EM-EVIDENCIA-1611: o topo é a regra topoComNovidades
  ['o Pitch invader sai do topo (só na grade)', { [LIB]: troca("prompt: null, desde: '2026-11-15' },", 'prompt: null },') }, 'T1'], // reancorado KINEO-NOVIDADE-EM-EVIDENCIA-1611: sem a data de abertura o cartão não entra na frente
  ['o 1º cartão do topo fica 2×2 (mais alto que a tela)', { [MOSAICO]: troca('.klp .kmz-topo-grid>.kmz-t{grid-column:auto;grid-row:auto;aspect-ratio:5/6}\n', '.klp .kmz-topo-grid>.kmz-t{grid-column:auto;grid-row:auto;aspect-ratio:5/6}\n.klp .kmz-topo-grid>.kmz-t:first-child{grid-column:span 2;grid-row:span 2}\n') }, 'T5'],
  ['o Pitch invader aparece duas vezes na home', { [MOSAICO]: troca('if (!topo && !full && NO_TOPO.has(c.id)) return null', 'if (!topo && !full && NO_TOPO.has(c.id) && c.id !== \'invasor-de-campo\') return null') }, 'T4'],
  ['visitante encaminhado ao cadastro apesar da abertura do molde', { [MOSAICO]: troca('createEntryForSignupHref(templateHref ?? viaSignup(clipeNovoDestino(c), signedIn), signedIn)', '(templateHref ?? viaSignup(clipeNovoDestino(c), signedIn))') }, 'L1'],
  ['conta logada encaminhada ao cadastro ao escolher o molde', { [MOSAICO]: troca('createEntryForSignupHref(templateHref ?? viaSignup(clipeNovoDestino(c), signedIn), signedIn)', "(templateHref && signedIn ? '/signup?redirect=' + encodeURIComponent(templateHref) : createEntryForSignupHref(templateHref ?? viaSignup(clipeNovoDestino(c), signedIn), signedIn))") }, 'L2'],
  ['o cartão perde o caminho do molde', { [MOSAICO]: troca('const templateHref = recreateMoldeLogadoHref(c.id, signedIn) ??', 'const templateHref =') }, 'L1'],
  ['visitante autorizado no Pitch mesmo com a chave fechada', { [FLOW]: troca("publicEditor('clip') && RECREATE_MOLDES_SO_LOGADO.includes(id)", "RECREATE_MOLDES_SO_LOGADO.includes(id)") }, 'L5a'],
  ['molde privado permitido pelo id do Pitch', { [FLOW]: troca('!recreateFormatVisible(format, user?.email) ||', '') }, 'L5b'],
  ['o selo Recreate some', { [MOSAICO]: troca("  if (t.kind === 'novo' && recreateMoldeLogadoHref(t.clip.id, true)) return true", '') }, 'R2'],
  ['número de views inventado', { 'lib/home/cardSocialStats.ts': troca("export const CARD_SOCIAL_STATS: Readonly<Record<string, CardSocialStat>> = {", "export const CARD_SOCIAL_STATS: Readonly<Record<string, CardSocialStat>> = {\n  'invasor-de-campo': { views: 12_000, source: 'Instagram', url: 'https://www.instagram.com/usekineo/reel/x/', checked: '2026-11-16' },") }, 'R3'],
  ['o foco do cartão muda sem conferir', { [LIB]: troca("clipId: 'clip:a3b76cb7', focus: '50% 33%'", "clipId: 'clip:a3b76cb7', focus: '50% 50%'") }, 'M3'],
  ['o molde fecha ao público e o cartão continua', { [MOLDE]: troca('export const INVASOR_ABERTO_AO_PUBLICO: boolean = true', 'export const INVASOR_ABERTO_AO_PUBLICO: boolean = false') }, 'V2'],
  ['o cartão importa o molde do servidor', { [ENTRY]: (s) => "import { INVASOR_ID } from './invasorMolde'\n" + s }, 'V3'],
]
for (const [nome, t, alvo] of MUT) {
  let r
  try { r = checa(t).find(([n]) => n.startsWith(alvo)) } catch (e) { r = null; console.log('     ', e.message) }
  const pego = r && !r[1]
  console.log(`  ${pego ? 'ok  ' : 'FAIL'} X ${nome} é pego por ${alvo}`)
  if (!pego) falhas++
}
// a prévia: com som ou maior que 600 KB fica vermelho (arquivo forjado, sem tocar no real)
{
  const real = fs.readFileSync(path.join(ROOT, 'public/previews/galeria', ID + '.mp4'))
  const comSom = Buffer.from(real); const i = comSom.indexOf('vide', comSom.indexOf('hdlr')); if (i > 0) comSom.write('soun', i, 'latin1')
  const tmp = path.join(ROOT, 'node_modules', '.cache-home-pitch-1611.mp4')
  let pegoSom = false, pegoPeso = false
  try { fs.writeFileSync(tmp, comSom); pegoSom = !checa({}, { video: tmp }).find(([n]) => n.startsWith('M1'))[1] } catch { pegoSom = false } finally { try { fs.unlinkSync(tmp) } catch {} }
  pegoPeso = !checa({}, { tamanho: 601 * 1024 }).find(([n]) => n.startsWith('M1'))[1]
  for (const [nome, ok] of [['X prévia com som é pega por M1', pegoSom], ['X prévia acima de 600 KB é pega por M1', pegoPeso]]) { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${nome}`); if (!ok) falhas++ }
}
console.log(`${falhas ? 'FALHA' : 'PASS'} home-pitch-1611: ${casos.length + MUT.length + 5 - falhas} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
