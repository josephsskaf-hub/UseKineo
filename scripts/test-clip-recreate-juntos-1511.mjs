#!/usr/bin/env node
// KINEO-CLIP-RECREATE-JUNTOS-1511 — guardião da tela que junta a aba Clip e a aba Recreate (dono 15/11: "juntar a aba de Clips com a aba de Recreate,
// porque no fundo é a mesma coisa… manter o fluxo na lateral, os vídeos que dá para recriar EMBAIXO e o modelo escolhido rodando à DIREITA").
//   A · interruptor CLIP_RECREATE_JUNTOS_RELEASE nasce 'internal' (só a allowlist exata da casa; visitante nunca); quem o tem perde a aba Recreate em
//       toda barra (ela É a aba Clip) e quem não o tem segue com a régua de sempre (recreateVisible).
//   B · quem não está no interruptor vê as telas de hoje: as rotas só desviam com a régua; o RecreateClient sem `moldura` dá o MESMO HTML da main de
//       antes (BASE); o ClipsClient é byte a byte o da BASE; a tela única recebe as MESMAS props do RecreateClient de sempre (comparadas uma a uma).
//   C · os pedidos são os mesmos: o RecreateClient real (hooks emulados, rede/armazenamento como dublês que só anotam) manda ao /api/avatar/upload e ao
//       /api/recreate exatamente os mesmos bytes (URL, método, cabeçalhos, corpo) com e sem `moldura`, para a mesma escolha e a mesma foto; voltar ao
//       Clip não manda nada; e a tela única passa ao ClipsClient as MESMAS props da aba Clip de hoje.
//   D · a tela: abas Film · Clip · Cartoon · Ads (Clip ativa, sem Recreate); sem modelo, a caixa do Clips à esquerda, o 1º modelo público tocando à
//       direita e a grade dos modelos embaixo (antes dos efeitos do Clips); com modelo, o painel do Recreate; tocar só ESCOLHE; nenhum preço fora dos
//       botões; a receita dos moldes da casa fora do JS da tela; a prévia /dev é 404 em produção.
//   M · mutantes: cada um tem de reprovar pelo menos um caso.
// Offline: módulos reais transpilados, sem rede, sem banco, sem fornecedor. Rodar: node scripts/test-clip-recreate-juntos-1511.mjs
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'
import path from 'node:path'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const ts = require(path.join(ROOT, 'node_modules/typescript'))
const React = require(path.join(ROOT, 'node_modules/react'))
const jsx = require(path.join(ROOT, 'node_modules/react/jsx-runtime'))
const { renderToStaticMarkup } = require(path.join(ROOT, 'node_modules/react-dom/server'))
const BASE = '11daf2720' // origin/main antes desta obra (15/11)
const baseSrc = p => execFileSync('git', ['show', `${BASE}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
const lf = s => s.replace(/\r\n/g, '\n')
const src = (o, p) => lf(o[p] ?? read(p))
const HOUSE = 'josephsskaf@gmail.com', CUSTOMER = 'customer@example.org'
const RC = 'app/recreate/RecreateClient.tsx', CLIPS = 'app/(dashboard)/clips/ClipsClient.tsx', JUNTOS = 'components/create/ClipRecreateJuntos.tsx'
const FLOW = 'app/recreate/RecreateFlowPage.tsx', CREATE = 'app/create/[tab]/page.tsx'
const link = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }
const stubs = { 'next/link': link, '@/lib/analytics': { trackClosedEvent: async () => 'stored', trackEvent: async () => true }, 'next/navigation': { useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams(), usePathname: () => '/create/clip' } }
// Um carregador por mundo (o mesmo `o`): os módulos são sem estado; cada mutante é outro objeto e ganha o seu. Só por tempo (a bateria corta em 420 s).
const mundos = new WeakMap()
const L = (o, extra = {}) => { if (Object.keys(extra).length) return loader({ ...stubs, ...extra }, o); let l = mundos.get(o); if (!l) { l = loader(stubs, o); mundos.set(o, l) } return l }
const transpilados = new Map()
const nodes = (node, p, out = []) => { if (Array.isArray(node)) { node.forEach(n => nodes(n, p, out)); return out } if (!node || typeof node !== 'object') return out; if (p(node)) out.push(node); return nodes(node.props?.children, p, out) }
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node)

// ─── A. Interruptor ──────────────────────────────────────────────────────────────────────────────────────────────────
function casosA(o) {
  const j = L(o)('lib/create/clipRecreateJuntos'), rel = L(o)('lib/create/release'), acc = L(o)('lib/recreate/access'), clip = L(o)('lib/create/clipNaMoldura'), create = L(o)('lib/create/access')
  const v = (e, r) => j.clipRecreateJuntosVisivel(e, r)
  const ambasHoje = e => clip.clipNaMolduraVisivel(e) && acc.recreateVisible(e)
  return [
    ["A1 interruptor nasce 'internal'", rel.CLIP_RECREATE_JUNTOS_RELEASE === 'internal'],
    ['A2 padrão: a casa vê; conta de fora e visitante não', v(HOUSE) === true && v(CUSTOMER) === false && v(null) === false && v(undefined) === false && v('') === false],
    ["A3 'internal' é a allowlist EXATA (e-mail parecido não passa)", v('josephsskaf@gmail.com.evil.org', 'internal') === false && v('test-hacker@example.org', 'internal') === false],
    ["A4 'off': ninguém; 'public': só quem já abre /create/clip e /recreate; visitante nunca", [HOUSE, CUSTOMER, null].every(e => v(e, 'off') === false) && v(CUSTOMER, 'public') === ambasHoje(CUSTOMER) && v(null, 'public') === false],
    ['A5 a aba Recreate some só para quem tem a tela única; os outros: recreateVisible', j.abaRecreateVisivel(HOUSE) === false && j.abaRecreateVisivel(CUSTOMER) === acc.recreateVisible(CUSTOMER) && j.abaRecreateVisivel(HOUSE, 'off') === acc.recreateVisible(HOUSE)],
    ['A6 /create/<aba>: a casa recebe a barra sem Recreate; a conta de fora, a de sempre', ['film', 'cartoon', 'ads'].every(t => create.createShellDecision(t, { email: HOUSE }).showRecreate === false && create.createShellDecision(t, { email: CUSTOMER }).showRecreate === acc.recreateVisible(CUSTOMER))],
    ['A7 Library e Ads: a MESMA régua da barra', src(o, 'app/(dashboard)/DashboardShell.tsx').includes('<CreateMolduraTopo showRecreate={abaRecreateVisivel(userEmail)} showClip={clipNaMolduraVisivel(userEmail)} />') && src(o, 'app/(dashboard)/ads/v2/AdsV2Workspace.tsx').includes('showRecreate: abaRecreateVisivel(user?.email)') && src(o, CREATE).includes('showRecreate={abaRecreateVisivel(quem.email)')],
  ]
}

const BASE_RC = { [RC]: baseSrc(RC) }
// ─── B. Quem não está no interruptor: as telas de hoje ───────────────────────────────────────────────────────────────
/** Atributos de um JSX (<Tag … />) e as chaves de um objeto literal `const <nome>… = { … }`, como texto normalizado. */
function atributosDoJsx(code, tag) {
  const sf = ts.createSourceFile('x.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let out = null
  const visit = n => { if (!out && ts.isJsxSelfClosingElement(n) && n.tagName.getText(sf) === tag) out = Object.fromEntries(n.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.getText(sf), a.initializer ? (ts.isJsxExpression(a.initializer) ? a.initializer.expression.getText(sf) : a.initializer.getText(sf)) : 'true'])); ts.forEachChild(n, visit) }
  visit(sf); return out
}
function objetoLiteral(code, nome) {
  const sf = ts.createSourceFile('x.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let out = null
  const visit = n => { if (!out && ts.isVariableDeclaration(n) && n.name.getText(sf) === nome && n.initializer && ts.isObjectLiteralExpression(n.initializer)) out = Object.fromEntries(n.initializer.properties.map(p => ts.isShorthandPropertyAssignment(p) ? [p.name.getText(sf), p.name.getText(sf)] : [p.name.getText(sf), p.initializer.getText(sf)])); ts.forEachChild(n, visit) }
  visit(sf); return out
}
function ssrRecreate(o, props) {
  // O render de servidor (efeitos não rodam): o HTML que a pessoa recebe.
  const C = L(o)('app/recreate/RecreateClient').default
  return renderToStaticMarkup(React.createElement(C, props))
}
function casosB(o) {
  const flow = src(o, FLOW), create = src(o, CREATE)
  const desvio = "if (user && basePath === '/recreate' && clipRecreateJuntosVisivel(user.email)) {"
  const iDesvio = flow.indexOf(desvio), iSempre = flow.indexOf('return <RecreateClient currentFlow flowBasePath={basePath} initialId={id}')
  const classico = atributosDoJsx(flow.slice(iSempre), 'RecreateClient') ?? {}
  const juntos = objetoLiteral(flow, 'recreate') ?? {}
  const norm = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.replace(/\s+/g, ' ')]))
  const iClip = create.indexOf("if (params.tab === 'clip') {"), iJ = create.indexOf('if (clipRecreateJuntosVisivel(u?.email)) {'), iMold = create.indexOf('return <ClipNaMoldura measurementActor={u?.id ?? null} showRecreate={recreateVisible(u?.email)} />')
  const iPorta = create.indexOf("if (!clipNaMolduraVisivel(u?.email)) redirect('/clips' + (query ? '?' + query : ''))"), iEfeito = create.indexOf('if (recreateFormat(id)) redirect(`/recreate/${id}`)')
  const base = BASE_RC
  const casosHtml = [
    ['biblioteca (nenhum modelo)', { currentFlow: true, flowBasePath: '/recreate', signedIn: true, accountKey: 'u1', createTabs: true }],
    ['modelo aberto, logado', { currentFlow: true, flowBasePath: '/recreate', signedIn: true, accountKey: 'u1', createTabs: true, initialId: 'passarela', ownVideoVisible: true }],
    ['visitante com modelo', { currentFlow: true, flowBasePath: '/recreate', signedIn: false, initialId: 'passarela', guestQuotes: [{ id: 'passarela', credits: 40, available: true, shortfall: 0 }] }],
    ['tela antiga (sem fluxo)', { initialId: 'passarela', internalTools: true }],
  ]
  return [
    ['B1 /recreate: a tela única só com a régua (logado, rota do Recreate, interruptor) e ANTES da linha de sempre', iDesvio > 0 && iSempre > iDesvio && flow.slice(iDesvio, iSempre).includes('return <ClipRecreateJuntos measurementActor={user.id} recreate={recreate} />')],
    ['B2 a tela única recebe as MESMAS props do RecreateClient de sempre (uma a uma)', Object.keys(classico).length >= 12 && isDeepStrictEqual(norm(classico), norm(juntos))],
    ['B3 /create/clip: a tela única só depois das portas de hoje (aba Clip, efeito → Recreate) e antes da aba Clip de sempre', iClip > 0 && iPorta > iClip && iEfeito > iPorta && iJ > iEfeito && iMold > iJ && create.slice(iJ, iMold).includes("return RecreateFlowPage({ basePath: '/recreate' })")],
    ['B4 /recreate/your-video: a barra só muda com a mesma régua', flow.includes("abaJuntos={!!user && basePath === '/recreate' && clipRecreateJuntosVisivel(user.email)}") && src(o, 'app/recreate-preview/SeuVideoRecreateClient.tsx').includes("<CreateTabs active={abaJuntos?'clip':'recreate'} {...{recreateHref:flowBasePath}} {...(abaJuntos?{showClip:true,showRecreate:false}:{})}/>")],
    ...casosHtml.map(([n, props]) => [`B5 RecreateClient sem moldura = HTML da main (${n})`, ssrRecreate(o, props) === ssrRecreate({ ...o, ...base }, props)]),
    ['B6 ClipsClient byte a byte o da main (mesmo estado, upload, pedido, preço e eventos)', src(o, CLIPS) === lf(baseSrc(CLIPS))],
    ['B7 a aba Clip de sempre (ClipNaMoldura) intocada', src(o, 'components/create/ClipNaMoldura.tsx') === lf(baseSrc('components/create/ClipNaMoldura.tsx'))],
  ]
}

// ─── C. Os mesmos pedidos ───────────────────────────────────────────────────────────────────────────────────────────
// O RecreateClient REAL com hooks emulados (como scripts/test-recreate-current-flow-1411.mjs): a rede e o armazenamento só anotam.
const ACCOUNT = '11111111-2222-4333-8444-555555555555'
function harness(o, { moldura = false, props = {} } = {}) {
  const h = { slots: [], cursor: 0, dirty: true, pending: [], tree: null, calls: [], history: [], partes: null, props: { currentFlow: true, flowBasePath: '/recreate', signedIn: true, accountKey: ACCOUNT, createTabs: true, ...props } }
  if (moldura) h.props.moldura = p => { h.partes = p; return jsx.jsxs('main', { children: [p.aviso, p.painel, p.palco, jsx.jsx('section', { children: p.galeria }), p.dialogo] }) }
  const useState = init => { const i = h.cursor++; const slot = h.slots[i] ??= { value: typeof init === 'function' ? init() : init }; return [slot.value, v => { slot.value = typeof v === 'function' ? v(slot.value) : v; h.dirty = true }] }
  const useRef = init => h.slots[h.cursor++] ??= { current: init }
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
  const useEffect = (create, deps) => { const i = h.cursor++, old = h.slots[i]; if (!old || !same(old.deps, deps)) { const slot = { deps, create, cleanup: old?.cleanup }; h.slots[i] = slot; h.pending.push(slot) } }
  const stub = () => null, prepare = async f => f
  const real = L(o)
  const deps = {
    react: { ...React, useState, useRef, useEffect }, 'react/jsx-runtime': jsx, 'next/link': { __esModule: true, default: 'a' },
    '@/components/KineoBolt': { KineoBrandIcon: stub }, '@/lib/clips/clipCatalog': real('lib/clips/clipCatalog'), '@/lib/recreate/formats': real('lib/recreate/formats'), '@/lib/recreate/entry': real('lib/recreate/entry'), '@/lib/recreate/catalogPublic': real('lib/recreate/catalogPublic'),
    '@/lib/recreate/photos': { compressPhoto: prepare, cropFace: prepare, composePairPhoto: async () => new File(['par'], 'par.jpg', { type: 'image/jpeg' }) },
    './RecreatePlayer': { __esModule: true, default: 'fixture-player', ExampleCover: 'fixture-cover' },
    '@/components/create/CreateTabs': { __esModule: true, default: stub }, '@/components/create/CreateNavConta': { __esModule: true, default: stub },
    '@/lib/videoDownload': { downloadVideoFile: stub }, '@/lib/downloadNosso': { downloadHref: u => '/api/download?url=' + encodeURIComponent(u) },
    '@/lib/growth/visitanteEscreveAntes': real('lib/growth/visitanteEscreveAntes'),
    '@/lib/recreate/flowDraft': { async saveRecreateFlowDraft() { return 'draft-ref' }, async loadRecreateFlowDraft() { return null }, async clearRecreateFlowDraft() {}, async expireRecreateFlowDrafts() {} },
  }
  let uuid = 0
  const window = { location: { assign() {} }, history: { replaceState: (_, __, url) => h.history.push(url) }, confirm: () => true, matchMedia: () => ({ matches: false }), addEventListener() {}, removeEventListener() {}, requestAnimationFrame: f => f() }
  const formatos = real('lib/recreate/formats')
  const quotes = formatos.RECREATE_FORMATS.map(f => ({ id: f.id, credits: formatos.recreateCreditsFor(f), shortfall: 0, available: formatos.recreateCreditsFor(f) !== null }))
  const fetch = async (url, init = {}) => {
    const body = init.body instanceof FormData ? [...init.body.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : `file:${v.name}:${v.size}:${v.type}`]) : init.body ?? null
    h.calls.push({ url, method: init.method ?? 'GET', headers: init.headers ?? null, body })
    if (url === '/api/avatar/upload') return Response.json({ url: `https://fixture.invalid/storage/v1/object/public/avatars/${ACCOUNT}/${h.calls.length}.jpg` })
    if (url === '/api/recreate' && init.method === 'POST') return Response.json({ clip: { id: 'fixture-clip', status: 'pending' } })
    if (url === '/api/recreate') return Response.json({ catalog: quotes })
    if (url === '/api/recreate/social') return Response.json({ items: [] })
    if (String(url).startsWith('/api/recreate/status')) return Response.json({ clip: { id: 'fixture-clip', status: 'pending' } })
    throw Error('E/S inesperada ' + url)
  }
  const fonte = src(o, RC)
  if (!transpilados.has(fonte)) transpilados.set(fonte, ts.transpileModule(fonte, { fileName: RC, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText)
  const code = transpilados.get(fonte)
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, require: n => { if (n.endsWith('.css')) return {}; if (!Object.hasOwn(deps, n)) throw Error('dependência sem dublê ' + n); return deps[n] }, window, document: { querySelector: () => null }, URL: { createObjectURL: () => 'blob:fixture-' + (++uuid), revokeObjectURL() {} }, URLSearchParams, File, Blob, FormData, Response, AbortController, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid' } }, fetch, crypto: { randomUUID: () => '11111111-2222-4333-8444-' + String(++uuid).padStart(12, '0') }, sessionStorage: { _m: new Map(), getItem(k) { return this._m.get(k) ?? null }, setItem(k, v) { this._m.set(k, v) }, removeItem(k) { this._m.delete(k) } }, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}, console }, { filename: RC })
  const C = module.exports.default
  h.render = () => { h.cursor = 0; h.dirty = false; h.tree = C(h.props) }
  h.flush = async () => { for (let i = 0; i < 25; i++) { if (h.dirty) h.render(); for (const it of h.pending.splice(0)) { it.cleanup?.(); it.cleanup = it.create() } await Promise.resolve(); await Promise.resolve() } }
  h.click = async n => { n.props.onClick?.({ preventDefault() {} }); await h.flush() }
  h.render(); return h
}
const gen = h => nodes(h.tree, n => n.type === 'button' && Object.hasOwn(n.props, 'data-recreate-generate'))[0]
async function foto(h, i = 0) {
  const alvo = nodes(h.tree, n => n.type === 'button' && /^(Add your photo|Add photo of person \d|Change photo \d)$/.test(n.props['aria-label'] || ''))[i]
  alvo.props.onPaste({ preventDefault() {}, clipboardData: { items: [{ kind: 'file', getAsFile: () => new File(['rosto'], `rosto-${i}.jpg`, { type: 'image/jpeg' }) }] } }); await h.flush()
}
/** Um percurso: abre (ou escolhe) o modelo, põe as fotos e aperta Generate. Devolve os pedidos anotados. */
async function percurso(o, moldura, id, { escolher = false } = {}) {
  const h = harness(o, { moldura, props: escolher ? {} : { initialId: id } }); await h.flush()
  if (escolher) {
    if (moldura) { h.partes.escolher(h.partes.catalogo.find(f => f.id === id)); await h.flush() }
    else await h.click(nodes(h.tree, n => n.type === 'button' && n.props['aria-label'] === `Use ${L(o)('lib/recreate/formats').recreateFormat(id).title}`)[0])
  }
  const slots = L(o)('lib/recreate/formats').recreateFormat(id).photoSlots
  for (let i = 0; i < slots; i++) await foto(h, i)
  await h.click(gen(h))
  return h
}
async function casosC(o) {
  const out = []
  const formatos = L(o)('lib/recreate/formats')
  const ids = ['passarela', formatos.RECREATE_FORMATS.find(f => f.type === 'effect' && f.photoSlots === 1)?.id, formatos.RECREATE_FORMATS.find(f => f.type === 'effect' && f.photoSlots === 2)?.id].filter(Boolean)
  for (const id of ids) for (const escolher of [false, true]) {
    const a = await percurso(o, false, id, { escolher }), b = await percurso(o, true, id, { escolher })
    const post = h => h.calls.filter(c => c.url === '/api/recreate' && c.method === 'POST')
    out.push([`C1 ${id}${escolher ? ' (escolhido na grade)' : ''}: os MESMOS bytes ao upload e ao /api/recreate com e sem a tela única`, post(a).length === 1 && JSON.stringify(a.calls) === JSON.stringify(b.calls) && JSON.stringify(a.history) === JSON.stringify(b.history) /* JSON: cada tela roda no seu contexto vm (protótipos diferentes) */])
  }
  // Voltar ao Clip: nada sai pela rede, a URL volta à aba Clip e o painel do Recreate some.
  const h = harness(o, { moldura: true, props: { initialId: 'passarela' } }); await h.flush()
  const antes = h.calls.length
  await foto(h); const soltou = h.partes.soltar('/create/clip'); await h.flush()
  out.push(['C2 voltar ao Clip não manda pedido, limpa o modelo e devolve a URL da aba Clip', soltou === true && h.calls.length === antes && h.partes.selecionado === null && h.partes.painel === null && h.history.at(-1) === '/create/clip'])
  const ocupado = harness(o, { moldura: true, props: { initialId: 'passarela' } }); await ocupado.flush(); await foto(ocupado); await ocupado.click(gen(ocupado))
  out.push(['C3 com o pedido correndo, voltar ao Clip é recusado (o modelo fica)', ocupado.partes.soltar('/create/clip') === false && ocupado.partes.selecionado?.id === 'passarela'])
  // A tela única passa ao ClipsClient as MESMAS props da aba Clip de hoje (ClipNaMoldura) e ao RecreateClient as props que recebeu.
  const vistos = {}
  const espiao = nome => ({ __esModule: true, default: props => { vistos[nome] = props; return null } })
  const elJ = L(o, { '@/app/(dashboard)/clips/ClipsClient': espiao('juntos') })('components/create/ClipRecreateJuntos').default({ measurementActor: 'u1', recreate: { currentFlow: true, initialId: 'x' } })
  const elC = L(o, { '@/app/(dashboard)/clips/ClipsClient': espiao('aba') })('components/create/ClipNaMoldura').default({ measurementActor: 'u1' })
  const semMoldura = p => Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'moldura'))
  const rcEl = elJ.props.moldura({ estilos: null, grade: null, tendencias: null, efeitos: null, meusClipes: null })
  out.push(['C4 ClipsClient recebe as MESMAS props da aba Clip de hoje (measurementActor, rótulo do Details)', isDeepStrictEqual(semMoldura(elJ.props), semMoldura(elC.props)) && typeof elJ.props.moldura === 'function'])
  out.push(['C5 RecreateClient recebe exatamente as props da rota + a moldura', isDeepStrictEqual(semMoldura(rcEl.props), { currentFlow: true, initialId: 'x' }) && typeof rcEl.props.moldura === 'function'])
  out.push(['C6 a tela única não tem estado, rede, roteador nem evento próprios', !/\buse(State|Effect|Ref|Router)\b|fetch\(|track(Closed)?Event|sessionStorage|localStorage/.test(src(o, JUNTOS))])
  return out
}

// ─── D. A tela ──────────────────────────────────────────────────────────────────────────────────────────────────────
function montar(o, { selecionado = null, catalogo, soltar = () => true } = {}) {
  const log = { escolhas: [], soltas: [] }
  const M = L(o)('components/create/ClipRecreateJuntos')
  const el = M.default({ measurementActor: 'u1', recreate: { currentFlow: true } })
  const mk = id => jsx.jsx('i', { 'data-peca': id })
  const rcEl = el.props.moldura({ estilos: mk('clip-estilos'), grade: mk('clip-caixa'), tendencias: mk('clip-tendencias'), efeitos: mk('clip-efeitos'), meusClipes: mk('clip-meus') })
  const partes = { selecionado, catalogo, midia: f => ({ video: `/v/${f.id}.mp4`, poster: `/p/${f.id}.webp` }), escolher: f => log.escolhas.push(f.id), soltar: u => { log.soltas.push(u); return soltar(u) }, ocupado: false, sair() {}, aviso: null, painel: selecionado ? mk('rc-painel') : null, palco: selecionado ? mk('rc-palco') : null, galeria: mk('rc-grade'), galeriaRef: { current: null }, dialogo: mk('rc-dialogo') }
  const tree = rcEl.props.moldura(partes)
  return { tree, log, html: renderToStaticMarkup(tree), M }
}
function casosD(o) {
  const formatos = L(o)('lib/recreate/formats'), entry = L(o)('lib/recreate/entry')
  const casa = formatos.RECREATE_FORMATS.find(f => entry.publicRecreatePath(f.id) === null) // um molde que só a casa vê (sem link público)
  const pub = formatos.RECREATE_FORMATS.filter(f => entry.publicRecreatePath(f.id) !== null)
  const catalogo = [...(casa ? [casa] : []), ...pub]
  const sem = montar(o, { catalogo }), com = montar(o, { catalogo, selecionado: pub[0] })
  const abas = h => [...h.matchAll(/data-create-tab="([a-z]+)"/g)].map(x => x[1]).join()
  const ordem = (h, ...xs) => xs.map(x => h.indexOf(x)).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1]))
  const palco = nodes(sem.tree, n => n.props?.['data-juntos-palco'])[0]
  const recriar = nodes(sem.tree, n => n.props?.stage?.action)[0]?.props.stage.action // o botão mora no palco (stage.action do RecreatePlayer)
  recriar?.props.onClick({ preventDefault() {} })
  // Efeito do Clips com modelo aberto: o painel volta ao Clips antes; se o Recreate recusar, o clique não passa.
  const efeitos = h => nodes(h.tree, n => typeof n.props?.className === 'string' && n.props.className.includes('ct-juntos-efeitos'))[0]
  const recusa = montar(o, { catalogo, selecionado: pub[0], soltar: () => false }), aceita = montar(o, { catalogo, selecionado: pub[0], soltar: () => true })
  const evento = () => { const e = { parou: false, preventDefault() { this.parou = true }, stopPropagation() { this.parou = true } }; return e }
  const eR = evento(), eA = evento(); efeitos(recusa).props.onClickCapture(eR); efeitos(aceita).props.onClickCapture(eA)
  const voltar = nodes(com.tree, n => n.props?.['data-juntos-voltar'] !== undefined && n.type === 'button')[0]
  voltar?.props.onClick({})
  const juntos = src(o, JUNTOS), css = src(o, 'components/create/clip-recreate-juntos.css'), flowCss = src(o, 'app/recreate/currentFlow.css')
  const dev = src(o, 'app/dev/clip-recreate-juntos/page.tsx'), PROD_404 = "  if (process.env.NODE_ENV === 'production') notFound()"
  // A receita dos moldes da casa nunca entra no JS desta tela (KINEO-RECEITA-FORA-DO-JS-1411 · KINEO-GUIA-PRIVADO-1411): o grafo de imports a partir dela.
  const grafo = new Set(), fila = [JUNTOS]
  while (fila.length) {
    const p = fila.pop(); if (grafo.has(p)) continue; grafo.add(p)
    for (const m of src(o, p).matchAll(/^\s*import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/gm)) {
      const s = m[1]; if (s.endsWith('.css') || !(s.startsWith('@/') || s.startsWith('.'))) continue
      const base = s.startsWith('@/') ? s.slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(p), s))
      const alvo = [base, base + '.ts', base + '.tsx', base + '/index.ts'].find(c => { try { read(c); return /\.tsx?$/.test(c) } catch { return false } })
      if (alvo) fila.push(alvo)
    }
  }
  return [
    ['D1 abas Film · Clip · Cartoon · Ads, Clip ativa, sem Recreate', abas(sem.html) === 'film,clip,cartoon,ads' && sem.html.includes('aria-current="page" data-create-tab="clip"') && abas(com.html) === 'film,clip,cartoon,ads'],
    ['D2 sem modelo: a caixa do Clips à esquerda, o modelo tocando à direita, a grade dos modelos embaixo e depois os efeitos e My clips', sem.html.includes('ct-juntos-clip') && ordem(sem.html, 'data-peca="clip-estilos"', 'data-peca="clip-caixa"', 'data-juntos-palco', 'data-peca="rc-grade"', 'data-peca="clip-tendencias"', 'data-peca="clip-efeitos"', 'data-peca="clip-meus"') && !sem.html.includes('data-peca="rc-painel"')],
    ['D3 o modelo que toca por padrão é o 1º com link público (nunca um molde só da casa)', palco?.props['data-juntos-palco'] === pub[0].id && sem.M.palcoPadrao(catalogo)?.id === pub[0].id && sem.M.palcoPadrao([])  === null],
    ['D4 "Recreate this" só ESCOLHE o modelo (o painel muda; nada gera)', sem.log.escolhas.join() === pub[0].id && sem.log.soltas.length === 0],
    ['D5 com modelo: o painel do Recreate (com "voltar ao Clip") e o palco dele; a caixa do Clips sai do painel; os estilos do Clips ficam', ordem(com.html, 'data-peca="clip-estilos"', 'data-juntos-voltar', 'data-peca="rc-painel"', 'data-peca="rc-palco"', 'data-peca="rc-grade"', 'data-peca="clip-efeitos"') && !com.html.includes('data-peca="clip-caixa"') && com.log.soltas.join() === '/create/clip'],
    ['D6 efeito do Clips com modelo aberto: volta ao Clips; recusado, o clique não passa', eR.parou === true && eA.parou === false && recusa.log.soltas.length === 1 && aceita.log.soltas.length === 1],
    ['D7 nenhum preço nem nome de motor na casca (o custo segue só nos botões das duas telas)', !/✦|\bcredits?\b|\$\s?\d|seedance|kling|hailuo|veo|runway|wan\b/i.test(juntos.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')) && !/✦|\bcredits?\b|\$\s?\d/i.test(sem.html.replace(/<header[\s\S]*?<\/header>/, ''))],
    ['D8 receita dos moldes da casa fora do JS da tela', grafo.has(RC) && ![...grafo].some(p => /movimentoMoldes|catalogoServidor|lib\/recreate\/guias|guiasManifesto|movimentoJuiz|seuVideoServer|lib\/recreate\/server/.test(p))],
    ['D9 celular: o fluxo do Recreate põe painel → modelo → grade (≤ 800 px) e a casca usa esse fluxo; o CSS novo só vale debaixo de .ct-juntos', /rc-current-flow ct-juntos|rc-current-flow create-shell create-clip ct-juntos/.test(juntos) && flowCss.includes('.recreate.rc-current-flow .rc-panel{order:0;') && flowCss.includes('.recreate.rc-current-flow .rc-reference{order:1}') && flowCss.includes('.recreate.rc-current-flow .rc-gallery{order:2}') && css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(r => r.trim()).filter(r => r && !r.startsWith('@media')).every(r => r.includes('.ct-juntos'))],
    ['D10 prévia /dev: 404 em produção e só a vitrine de visitante (sem receita, sem gerar)', dev.indexOf(PROD_404) > 0 && dev.indexOf('const publicos = publicRecreateCatalog()') > dev.indexOf(PROD_404) && dev.includes('signedIn: false') && dev.includes('formatosParaOCliente(null).filter(') && !/'use client'/.test(dev)],
  ]
}

// Cada grupo só roda de novo num mutante que toca um arquivo dele; senão vale o resultado do mundo real (o mesmo código dá o mesmo resultado).
const DEPENDE = { A: ['lib/', 'app/(dashboard)/DashboardShell.tsx', 'app/(dashboard)/ads/v2/AdsV2Workspace.tsx', CREATE], B: [FLOW, CREATE, RC, CLIPS, 'components/create/', 'app/recreate-preview/', 'lib/'], C: [RC, JUNTOS, CLIPS, 'components/create/', 'lib/'], D: [JUNTOS, RC, 'components/create/', 'app/dev/', 'app/recreate/', 'lib/'] }
const GRUPOS = { A: async o => casosA(o), B: async o => casosB(o), C: casosC, D: async o => casosD(o) }
let real = null
const todos = async o => {
  const tocados = Object.keys(o), out = []
  for (const g of Object.keys(GRUPOS)) out.push(...(real && !tocados.some(t => DEPENDE[g].some(d => t.startsWith(d))) ? real[g] : await GRUPOS[g](o)))
  return out
}
real = {}; for (const g of Object.keys(GRUPOS)) real[g] = await GRUPOS[g]({})
let falhas = 0, total = 0
for (const [nome, ok] of await todos({})) { total++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${nome}`); if (!ok) falhas++ }

// ─── M. Mutantes ────────────────────────────────────────────────────────────────────────────────────────────────────
const mut = (p, de, para) => { const s = lf(read(p)); if (s.split(de).length !== 2) throw new Error(`mutante sem alvo único em ${p}: ${de.slice(0, 60)}`); return { [p]: s.replace(de, para) } }
const MUTANTES = [
  ["M1 interruptor 'public' por padrão", mut('lib/create/release.ts', "CLIP_RECREATE_JUNTOS_RELEASE: InternalRelease = 'internal'", "CLIP_RECREATE_JUNTOS_RELEASE: InternalRelease = 'public'")],
  ['M2 régua ignora a allowlist', mut('lib/create/clipRecreateJuntos.ts', "release !== 'off' && releaseVisible(email, release) &&", "release !== 'off' &&")],
  ['M3 /recreate desvia sem a régua', mut(FLOW, "if (user && basePath === '/recreate' && clipRecreateJuntosVisivel(user.email)) {", "if (user && basePath === '/recreate') {")],
  ['M4 a tela única recebe outra prop', mut(FLOW, "internalTools: !!user && releaseVisible(user.email, 'internal'), formatos", 'internalTools: true, formatos')],
  ['M5 o pedido muda só na tela única', mut(RC, "const payload: Record<string, unknown> = { format: selected.id, mode: 'swap', seconds: selected.seconds, prompt, consent, simulate: false }", "const payload: Record<string, unknown> = { format: selected.id, mode: 'swap', seconds: selected.seconds + (moldura ? 1 : 0), prompt, consent, simulate: false }")],
  ['M6 a tela de sempre muda', mut(RC, '      {selected && <section className="rc-reference" aria-label="Base video">{palco}</section>}', '      {selected && <section className="rc-reference" aria-label="Template">{palco}</section>}')],
  ['M7 a aba Recreate volta na tela única', mut(JUNTOS, '<CreateTabs active="clip" showRecreate={false} showClip />', '<CreateTabs active="clip" showClip />')],
  ['M8 o Clip some da barra (o defeito do dono)', mut(JUNTOS, '<CreateTabs active="clip" showRecreate={false} showClip />', '<CreateTabs active="clip" showRecreate={false} />')],
  ['M9 "Recreate this" não escolhe', mut(JUNTOS, 'onClick={() => rc.escolher(padrao)}', 'onClick={() => rc.soltar(JUNTOS_VOLTA)}')],
  ['M10 efeito passa mesmo com o Recreate recusando', mut(JUNTOS, '{ event.preventDefault(); event.stopPropagation() }', '{ }')],
  ['M11 a barra do /create volta a ter Recreate para a casa', mut('lib/create/access.ts', "showRecreate: abaRecreateVisivel(user.email) }", "showRecreate: abaRecreateVisivel(user.email, 'off') }")],
  ['M12 prévia /dev aberta em produção', mut('app/dev/clip-recreate-juntos/page.tsx', "  if (process.env.NODE_ENV === 'production') notFound()\n", '')],
  ['M13 o ClipsClient mudou', mut(CLIPS, "fetch('/api/credits', { cache: 'no-store' })", "fetch('/api/credits?juntos=1', { cache: 'no-store' })")],
  ['M14 palco padrão pega o molde da casa', mut(JUNTOS, 'return catalogo.find(f => publicRecreatePath(f.id) !== null) ?? catalogo[0] ?? null', 'return catalogo[0] ?? null')],
  ['M15 voltar ao Clip manda pedido', mut(RC, "    window.history.replaceState(null, '', url)\n    return true", "    void fetch('/api/recreate', { cache: 'no-store' })\n    window.history.replaceState(null, '', url)\n    return true")],
  ['M16 /create/clip pula a porta da aba Clip', mut(CREATE, "    if (!clipNaMolduraVisivel(u?.email)) redirect('/clips' + (query ? '?' + query : ''))\n", '')],
  ['M18 os estilos do Clips só no painel do Clips (a grade de efeitos perde o CSS com um modelo aberto)', mut(JUNTOS, '{clip.estilos}{/* os estilos', '{/* os estilos')],
  ['M17 preço escrito na casca', mut(JUNTOS, "recriar: 'Recreate this ↗'", "recriar: 'Recreate this · ✦ 40 ↗'")],
]
for (const [nome, o] of MUTANTES) {
  let reprovou, porque = ''
  try { const f = (await todos(o)).filter(([, ok]) => !ok); reprovou = f.length > 0; porque = f.map(([n]) => n.split(' ')[0]).join(', ') } catch (e) { reprovou = true; porque = 'erro: ' + String(e?.message ?? e).slice(0, 80) }
  total++
  console.log(`  ${reprovou ? 'ok  ' : 'FAIL'} ${nome} → o guardião reprova (${porque})`)
  if (!reprovou) falhas++
}
console.log(`${total - falhas} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
