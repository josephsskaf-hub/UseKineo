// KINEO-ADS-FLUXO-2026-10-13 — guardião do FLUXO NOVO do Studio Ads (modo simples do /ads/v2), no formato do Studio de filmes.
// Fundador, 13/10: "o design do estúdio de fazer filme está muito bom; traz para o Ads" (benchmark-ads-fluxo-2026-10-13.md, seções
// 4 e 5: itens 1, 3, 4, 5 e 6). Prova, lendo E EXECUTANDO o código real (lib pelo carregador offline da casa; os componentes
// renderizados de verdade com react-dom/server):
//   A. lib pura (lib/ads/v2Flow.ts): só import type; cor de cada um dos 15 estilos (Auto = a cor do Ads de sempre); abas; os
//      anúncios da casa do "Comece deste" existem em public/ e a receita é SÓ estilo + cena + pessoa; a vaga dos 2–3 roteiros;
//      16 línguas completas, com os marcadores e sem número de crédito digitado;
//   B. LINK PRIMEIRO: a caixa do link é o 1º campo do produto, com "Colar" (área de transferência → o MESMO importLink, que chama
//      SÓ /api/ads/v2/link-import); a foto vira "ou arraste uma foto", depois;
//   C. "Lemos sua página": nome e preço da página entram só no campo vazio; o cartão mostra nome, fotos e preço para corrigir;
//   D. o PALCO toca o asset do estilo escolhido (o mesmo `style` que vai ao /plan) e a cor do estilo pinta o brilho; o Studio de
//      filmes, o kit e o ProductStage ficam byte a byte iguais (nada foi extraído de lá);
//   E. o cartão de revisão mostra produto/estilo/cena/pessoa/nível/voz e "Gerar · N créditos" com N = `cost` (adsV2Credits) —
//      nada digitado; a vaga "Escolha seu roteiro" só com `scripts` no /plan;
//   F. no celular o botão principal gruda embaixo (CSS sticky) e só REPASSA o clique ao botão do cartão (uma porta só de débito);
//   G. "Comece deste" preenche estilo, cena e pessoa — nunca fotos, texto, link, preço, nível;
//   H. abas Um anúncio / Lote / Produção (simples, ?mode=batch, ?mode=full) e a conta do lote antes de gerar;
//   I. caminho do dinheiro intocado: v2StartCore/v2PlanCore/v2Brief/rotas/billing/tiers byte a byte iguais à base (origin/main
//      cca1ca13) e makeAd/planAd/ensureDraft/syncCard/makeVariations da tela também;
//   J. rótulo de IA na entrega e o selo "AI" da pessoa;
//   K. roteiro automático (sem "Descobrir e planejar"): 1,2 s depois da última mudança, só com mudança de verdade, pausa após
//      falha até o link "Atualizar roteiros"; escolha do roteiro por POST /api/ads/v2/plan/choose; o lote manda `scripts: false`;
//   M. mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou (âncora única, texto trocado).
// ATENÇÃO (pista paralela KINEO-ADS-ROTEIROS, branch codex/ads-roteiros-1310): ela muda lib/ads/v2PlanCore.ts e lib/ads/v2Brief.ts
// de propósito. Ao juntar as duas, reancorar SÓ as impressões digitais desses dois arquivos (I1) com o texto novo conferido.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
// reancorado KINEO-LEVA8-1310 — a pista dos roteiros (655a9cb5) entrou junto: no núcleo do /plan ela só pôs linhas inteiras marcadas
// KINEO-ADS-ROTEIROS-2026-10-13, que semRoteiros tira em memória antes da impressão digital (a de antes segue valendo, byte a byte).
import { semRoteiros } from './test-support/desfaz-roteiros-1310.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = (fn) => { try { return !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
const ordem = (src, ...marcas) => { let pos = -1; for (const m of marcas) { const i = src.indexOf(m, pos + 1); if (i < 0 || i <= pos) return false; pos = i } return true }
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
/** Trecho entre duas marcas (para funções cujo 1º "{" é o dos parâmetros). */
const trecho = (src, de, ate) => { const i = src.indexOf(de); const j = src.indexOf(ate, i + 1); return i < 0 || j < 0 ? '' : src.slice(i, j) }
const bloco = (src, inicio) => { const i = src.indexOf(inicio); if (i < 0) return ''; let d = 0; for (let j = src.indexOf('{', i + inicio.length - 1); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1) } } return '' }

const F = {
  flow: 'lib/ads/v2Flow.ts',
  comp: 'components/ads/AdsFlow.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  ux: 'app/(dashboard)/ads/v2/AdsV2SimpleUx.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  batch: 'app/(dashboard)/ads/v2/AdsV2Batch.tsx',
  styles: 'lib/ads/v2Styles.ts',
  scene: 'lib/ads/v2Scene.ts',
  presenter: 'lib/ads/v2Presenter.ts',
  iface: 'lib/ui/interfaceLanguage.ts',
  stage: 'components/ProductStage.tsx',
}

// ─── carregadores (com troca de fonte para os mutantes) ─────────────────────────────────────────────────────────────
const libs = (over = {}) => createOfflineLoader({ source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const req = createRequire(path.join(ROOT, 'package.json'))
const React = req('react')
const ReactDOM = req('react-dom')
const JSX = req('react/jsx-runtime')
const Server = req('react-dom/server')
/** Carrega .ts/.tsx de verdade (JSX do React), com react real e o seletor de língua trocado por um falso puro. */
function tsx(over = {}) {
  const cache = new Map()
  const ext = {
    react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': JSX,
    '@/components/InterfaceLanguage': { UiLabel: ({ children }) => children, useInterfaceLanguage: () => 'en' },
  }
  function load(spec, parent = ROOT) {
    if (Object.hasOwn(ext, spec)) return ext[spec]
    let file = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.resolve(parent, spec)
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = fs.existsSync(file + '.tsx') ? file + '.tsx' : file + '.ts'
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) throw new Error('import inesperado: ' + spec)
    if (cache.has(file)) return cache.get(file).exports
    const rel = path.relative(ROOT, file).split(path.sep).join('/')
    const mod = { exports: {} }
    cache.set(file, mod)
    const src = over[rel] !== undefined ? over[rel] : read(rel)
    const out = ts.transpileModule(src, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    vm.runInNewContext(out, { exports: mod.exports, module: mod, require: (n) => load(n, path.dirname(file)), console: { log() {}, warn() {}, error() {} }, process: { env: {} }, URL }, { filename: file, timeout: 5000 })
    return mod.exports
  }
  return load
}
const html = (C, props) => Server.renderToStaticMarkup(React.createElement(C, props))

const L = libs()
const FLOW = L(F.flow)
const STY = L(F.styles)
const SCN = L(F.scene)
const PRS = L(F.presenter)
const IF = L(F.iface)
const LANGS = IF.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)
const STAGE = tsx()(F.stage)

// ═══ A. lib pura ═══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. lib pura (lib/ads/v2Flow.ts)')
const libPura = (src) => !/^\s*import\s(?!type)/m.test(src) && !/fetch\(|process\.env|createClient/.test(code(src))
ok(libPura(read(F.flow)), 'A1 só import type; nada de rede, banco ou env')
const corOk = (M) => {
  const keys = STY.ADS_V2_STYLES.map((s) => s.key)
  const tints = Object.entries(M.ADS_V2_STYLE_TINT)
  return tints.length === keys.length && keys.every((k) => Array.isArray(M.ADS_V2_STYLE_TINT[k])) &&
    tints.every(([, t]) => t.length === 2 && t.every((c) => /^#[0-9A-F]{6}$/i.test(c))) &&
    new Set(tints.map(([, t]) => t[0].toLowerCase())).size >= 12 &&
    JSON.stringify(M.adsV2StyleTint('none')) === JSON.stringify(STAGE.PRODUCT_TINT.ads) && JSON.stringify(M.ADS_V2_FLOW_AUTO_TINT) === JSON.stringify(STAGE.PRODUCT_TINT.ads) &&
    JSON.stringify(M.adsV2StyleTint('nao_existe')) === JSON.stringify(STAGE.PRODUCT_TINT.ads) && JSON.stringify(M.adsV2StyleTint(null)) === JSON.stringify(STAGE.PRODUCT_TINT.ads) &&
    keys.every((k) => M.adsV2StyleTint(k) === M.ADS_V2_STYLE_TINT[k])
}
ok(tenta(() => corOk(FLOW)), 'A2 cada um dos 15 estilos tem a sua cor (#RRGGBB, 12+ diferentes); Auto/sem estilo = a cor do Ads (PRODUCT_TINT.ads)')
const abasOk = (M) => JSON.stringify(M.ADS_V2_FLOW_TABS) === JSON.stringify([{ id: 'one', href: '/ads/v2' }, { id: 'batch', href: '/ads/v2?mode=batch' }, { id: 'production', href: '/ads/v2?mode=full' }]) &&
  M.adsV2FlowTabFor('simple') === 'one' && M.adsV2FlowTabFor('batch') === 'batch' && M.adsV2FlowTabFor('full') === 'production' && M.adsV2FlowTabFor(null) === null
ok(tenta(() => abasOk(FLOW)), 'A3 abas: Um anúncio = /ads/v2, Lote = ?mode=batch, Produção = ?mode=full (o construtor completo)')
const comeceOk = (M) => {
  const keys = STY.ADS_V2_STYLES.map((s) => s.key)
  const presets = SCN.ADS_V2_SCENE_PRESETS.map((p) => p.id)
  const list = M.ADS_V2_START_FROM
  return list.length >= 6 && new Set(list.map((x) => x.id)).size === list.length && list.every((x) => {
    const r = M.adsV2StartFromRecipe(x.id)
    const files = [x.video, x.poster].every((f) => typeof f === 'string' && f.startsWith('/') && fs.existsSync(path.join(ROOT, 'public', f)))
    const styleOk = x.style === 'none' || keys.includes(x.style)
    const asset = x.style !== 'none' ? x.video === STY.ADS_V2_STYLES.find((s) => s.key === x.style).preview : !!x.presenter && x.video === PRS.adsV2PresenterById(x.presenter)?.clip
    return files && styleOk && asset && (x.scene === null || presets.includes(x.scene)) && (x.presenter === null || PRS.ADS_V2_PRESENTER_IDS.includes(x.presenter)) &&
      r && JSON.stringify(Object.keys(r).sort()) === JSON.stringify(['presenter', 'scene', 'style']) && r.style === x.style && r.scene === x.scene && r.presenter === x.presenter
  }) && M.adsV2StartFromRecipe('nao-existe') === null && list.some((x) => x.presenter) && list.some((x) => x.scene)
}
ok(tenta(() => comeceOk(FLOW)), 'A4 "Comece deste": cada anúncio da casa existe em public/ (prévia do PRÓPRIO efeito ou clipe real do apresentador) e a receita é SÓ {estilo, cena, pessoa}')
// Contrato da pista codex/ads-roteiros-1310 (13/10): scripts: [{ id: 'a'|'b'|'c', tone: 'benefit'|'bold'|'story', label, narration,
// overlays: [{role,start,end,text}], words }] + script_id; escolher = POST /api/ads/v2/plan/choose { order_id, script_id }.
const roteirosOk = (M) => {
  const ov = (t) => ({ role: 'hook', start: 0, end: 2, text: t })
  const a = M.adsV2ScriptOptions([
    { id: 'a', tone: 'benefit', label: 'Benefit', narration: ' Só  hoje. ', overlays: [ov('A'), 'B'], words: 12 },
    { id: 'b', tone: 'inventado', label: 'Pain', narration: 'Cansado?', overlays: [ov('C')], words: 'x' },
    { id: 'c', tone: 'story', narration: 'Desejo' },
    { id: 'd', tone: 'bold', narration: 'quarto' },
  ])
  return M.adsV2ScriptOptions(undefined) === null && M.adsV2ScriptOptions(null) === null && M.adsV2ScriptOptions('x') === null &&
    M.adsV2ScriptOptions([{ id: 'a', narration: 'só um' }]) === null && M.adsV2ScriptOptions([{ narration: 'um' }, { foo: 1 }]) === null &&
    Array.isArray(a) && a.length === 3 && a.map((o) => o.letter).join('') === 'ABC' && a.map((o) => o.key).join('') === 'abc' &&
    a[0].tone === 'benefit' && a[0].label === 'Benefit' && a[0].narration === 'Só hoje.' && a[0].words === 12 && JSON.stringify(a[0].overlays) === '["A","B"]' &&
    a[1].tone === null && a[1].label === 'Pain' && a[1].words === null && a[2].tone === 'story' && a[2].label === null &&
    JSON.stringify(M.ADS_V2_SCRIPT_TONES) === '["benefit","bold","story"]' && M.ADS_V2_SCRIPT_CHOOSE_ROUTE === '/api/ads/v2/plan/choose' &&
    M.ADS_V2_AUTO_PLAN_MS >= 800 && M.ADS_V2_AUTO_PLAN_MS <= 2000
}
ok(tenta(() => roteirosOk(FLOW)), 'A5 roteiros: lê `scripts` do /plan (id a/b/c, tom benefit/bold/story, rótulo, palavras) com tolerância; menos de 2 = null (o roteiro único); no máximo 3; rota de escolha e espera de 1,2 s')
const linguasOk = (M) => {
  const en = M.ADS_V2_FLOW_COPY.en
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[p + k, v]] : flat(v, p + k + '.')))
  const E = Object.fromEntries(flat(en))
  const marc = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',')
  const MUDAM = ['tabs.one', 'link.title', 'link.paste', 'read.title', 'review.title', 'review.go', 'review.then', 'review.planShort', 'start.use', 'start.title', 'stage.autoDesc', 'auto.note', 'auto.refresh', 'auto.paused', 'tones.benefit', 'tones.story']
  return LANGS.length === 16 && Object.keys(M.ADS_V2_FLOW_COPY).length === 16 && LANGS.every((l) => {
    const t = M.ADS_V2_FLOW_COPY[l]
    if (!t) return false
    const T = Object.fromEntries(flat(t))
    const iguais = Object.keys(E).filter((k) => T[k] === E[k]).length
    return JSON.stringify(Object.keys(T).sort()) === JSON.stringify(Object.keys(E).sort()) && Object.keys(E).every((k) => typeof T[k] === 'string' && T[k].trim() && marc(T[k]) === marc(E[k])) &&
      /\{c\}/.test(t.review.go) && !/\d/.test(t.review.go) && /\{go\}/.test(t.review.then) && /\{host\}/.test(t.read.from) && /\{n\}/.test(t.read.from) &&
      (l === 'en' || (iguais <= 10 && MUDAM.every((k) => T[k] !== E[k])))
  }) && M.adsV2FlowCopy('pt') === M.ADS_V2_FLOW_COPY.pt && M.adsV2FlowCopy('xx') === en && M.adsV2FlowCopy(null) === en
}
ok(tenta(() => linguasOk(FLOW)), 'A6 frases nas 16 línguas: mesmas chaves e marcadores ({c},{go},{host},{n}), escritas (não copiadas do inglês), "Gerar" sem número digitado')

// ═══ B. link primeiro ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nB. link primeiro')
const linkPrimeiro = (src) => {
  const s = code(src)
  return ordem(s, 'aria-labelledby="adv2s-s1"', 'data-kineo="ads-link-import"', '<label htmlFor="adv2s-link">{fc.link.title}</label>', '{fc.link.stores}', 'data-kineo="ads-link-paste"', '<AdsReadCard', '{fc.link.orPhoto}', '<p className="adsw-lead">{lcopy.lead}</p>', '<DropZone', 'aria-labelledby="adv2s-s2"') &&
    (s.match(/data-kineo="ads-link-import"/g) || []).length === 1 && s.indexOf('<DropZone') > s.indexOf('data-kineo="ads-link-import"') && s.indexOf('fileInputRef.current?.click()') > s.indexOf('data-kineo="ads-link-import"')
}
ok(linkPrimeiro(read(F.simple)), 'B1 a caixa "Paste your product link" (com as lojas e o "Colar") é o 1º campo do produto; "ou arraste uma foto" e o upload vêm depois')
const colarOk = (src) => {
  const s = code(src)
  const p = bloco(s, 'async function pasteLink()')
  return /onClick=\{\(\) => void pasteLink\(\)\}/.test(s) && /navigator\.clipboard\.readText\(\)/.test(p) && ordem(p, 'setLink(raw)', 'void importLink(raw)') &&
    /setLinkNote\(\{ warn: true, text: fc\.link\.pasteFail \}\)/.test(p) && !/api\(|\/api\//.test(p) && /onPaste=\{\(e\) => \{[\s\S]*?void importLink\(pasted\)/.test(s)
}
ok(colarOk(read(F.simple)), 'B2 "Colar" lê a área de transferência e segue pelo MESMO importLink (colar no campo continua buscando); bloqueado = aviso de colar à mão')
const importOk = (src) => {
  const imp = bloco(code(src), 'async function importLink(')
  return /'\/api\/ads\/v2\/link-import', \{ method: 'POST', body: \{ url \} \}/.test(imp) && (imp.match(/\/api\//g) || []).length === 1
}
ok(importOk(read(F.simple)), 'B3 importLink chama SÓ /api/ads/v2/link-import (nada de orders/plan/start)')

// ═══ C. "Lemos sua página" ═════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. "Lemos sua página"')
const lemosOk = (src) => {
  const s = code(src)
  const imp = bloco(s, 'async function importLink(')
  return /setCardTitle\(\(cur\) => \(cur\.trim\(\) \? cur : pageName\)\)/.test(imp) && /setPrice\(\(cur\) => \(cur\.trim\(\) \? cur : pagePrice\)\)/.test(imp) &&
    /const pageName = adsV2FlowName\(r\.data\.title\)/.test(imp) && /setLinkFacts\(\{ host: host \|\| url, priceFound: !!pagePrice \}\)/.test(imp) && /setLinkFacts\(null\)/.test(imp) &&
    /\{linkFacts \? \(\s*<AdsReadCard[\s\S]*?name=\{cardTitle\}[\s\S]*?onName=\{setCardTitle\}[\s\S]*?price=\{price\}[\s\S]*?onPrice=\{setPrice\}/.test(s) &&
    /photos=\{items\.filter\(\(p\) => p\.fromLink\)\.map\(\(p\) => p\.srcUrl\)\}/.test(s)
}
ok(lemosOk(read(F.simple)), 'C1 nome e preço da página entram só no campo vazio; o cartão edita os MESMOS campos (título do quadro final e preço) e mostra as fotos do link')
const cartaoOk = (over = {}) => {
  const C = tsx(over)(F.comp)
  const base = { host: 'loja.test', photos: ['/a.jpg', '/b.jpg'], name: 'Perfume Âmbar', namePlaceholder: '', onName() {}, price: '', onPrice() {}, pricePlaceholder: '', priceFound: false, disabled: false }
  const en = html(C.AdsReadCard, { ...base, copy: FLOW.ADS_V2_FLOW_COPY.en })
  const pt = html(C.AdsReadCard, { ...base, copy: FLOW.ADS_V2_FLOW_COPY.pt, price: 'R$ 99', priceFound: true })
  return en.includes('We read your page') && en.includes('data-kineo="ads-link-read"') && en.includes('src="/a.jpg"') && en.includes('src="/b.jpg"') && en.includes('value="Perfume Âmbar"') &&
    en.includes('From loja.test · 2 photos') && en.includes(FLOW.ADS_V2_FLOW_COPY.en.read.priceNone) &&
    pt.includes('Lemos sua página') && pt.includes('value="R$ 99"') && !pt.includes(FLOW.ADS_V2_FLOW_COPY.pt.read.priceNone)
}
ok(tenta(() => cartaoOk()), 'C2 o cartão RENDERIZADO: "We read your page", as 3 fotos, nome e preço editáveis; sem preço na página = o aviso; 16 línguas')

// ═══ D. o palco do estilo ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. palco do estilo')
const LABELS = { product: 'Product', voice: 'Voice: {lang}', delivery: 'Ready', empty: 'Add a photo', presenter: 'AI person' }
const stageData = (style) => {
  const spec = STY.ADS_V2_STYLES.find((s) => s.key === style)
  return { style, tint: FLOW.adsV2StyleTint(style), name: spec ? spec.label : 'Auto', desc: spec ? spec.oneLine : 'x', bestFor: spec ? spec.bestFor : null, preview: spec ? spec.preview : null, poster: spec ? spec.poster : null, photo: null, cardUrl: null, presenterPoster: null, productName: 'P', scene: null, voice: 'English', costText: '41', shortText: null }
}
const palcoOk = (over = {}) => {
  const C = tsx(over)(F.comp)
  const um = (k) => {
    const h = html(C.AdsStyleStageView, { data: stageData(k), copy: FLOW.ADS_V2_FLOW_COPY.en, labels: LABELS })
    const spec = STY.ADS_V2_STYLES.find((s) => s.key === k)
    const [a, b] = FLOW.ADS_V2_STYLE_TINT[k]
    // SSR = antes do efeito de "reduzir movimento": o pôster DO estilo; no navegador o <video> do mesmo estilo (StageLoop).
    const quadro = (h.match(/class="adv2f-media">([\s\S]*?)<\/div>/) || [])[1] ?? ''
    return quadro.includes(`src="${spec.poster}"`) && !quadro.includes(STAGE.ADS_HOUSE_STAGE[0].poster) && h.includes(`data-style="${k}"`) && h.includes(`--stage-a:${a}`) && h.includes(`--stage-b:${b}`) &&
      h.includes('data-kineo="ads-style-stage"') && (h.match(/role="tab"/g) || []).length === 3 && h.includes(spec.label)
  }
  const auto = html(C.AdsStyleStageView, { data: stageData('none'), copy: FLOW.ADS_V2_FLOW_COPY.en, labels: LABELS })
  const casa = STAGE.ADS_HOUSE_STAGE[0]
  return ['giant_product', 'beach_ad', 'package_explosion', 'dishes_served'].every(um) &&
    auto.includes(`src="${casa.poster}"`) && auto.includes(casa.badge) && auto.includes(`--stage-a:${STAGE.PRODUCT_TINT.ads[0]}`)
}
ok(tenta(() => palcoOk()), 'D1 o palco RENDERIZADO mostra o asset do estilo escolhido (pôster no servidor, vídeo no navegador) e a cor DELE no brilho; Auto = anúncio da casa com o selo do motor real')
const loopOk = (src) => {
  const s = code(src)
  const loop = trecho(s, 'function StageLoop(', 'export function AdsFlowTabs(')
  return /<video src=\{src\} poster=\{poster \?\? undefined\} muted loop playsInline autoPlay/.test(loop) && /setStill\(reducedMotion\(\)\)/.test(loop) &&
    /media = <StageLoop src=\{data\.preview\} poster=\{data\.poster\} \/>/.test(s) && /'--stage-a': data\.tint\[0\], '--stage-b': data\.tint\[1\]/.test(s) &&
    /prefers-reduced-motion:reduce\)\{\.adv2f-stage/.test(s) && /\.kps-grid>\.adv2s-slot:not\(:empty\)\{display:block;order:-1/.test(s)
}
ok(loopOk(read(F.comp)), 'D2 o vídeo do estilo toca mudo em laço (pôster com "reduzir movimento"); no celular o palco vem primeiro (order:-1)')
const palcoLigado = (src) => {
  const s = code(src)
  return /const styleTint = adsV2StyleTint\(style\)/.test(s) && /preview: styleSpec \? styleSpec\.preview : null,/.test(s) && /poster: styleSpec \? styleSpec\.poster : null,/.test(s) &&
    /const styleSpec = style !== 'none' \? ADS_V2_STYLES\.find\(\(s\) => s\.key === style\) \?\? null : null/.test(s) && /\.\.\.\(style !== 'none' \? \{ style \} : \{\}\)/.test(bloco(s, 'async function planAd()')) &&
    /<AdsStyleStage slot=\{previewSlot\} data=\{stageData\}/.test(s) && !/<LiveStage /.test(s)
}
ok(palcoLigado(read(F.simple)), 'D3 o palco usa o MESMO `style` que vai ao /plan (escolha da pessoa ou sugestão do setor) e ocupa a vaga do palco da direita')
const BASE = {
  'lib/ads/v2StartCore.ts': '4393d6ccf8d02426eecded99df5b3be56c0ee9072d5a74221bef566b474dbbde',
  'lib/ads/v2PlanCore.ts': '3fd1819ef2109e36673ea80a890e20914f2b74114c6bff52ad54e9393e7e8eb2',
  // reancorado KINEO-LEVA8-1310 — v2Brief com os 2 roteiros a mais (versões bold/story) da pista KINEO-ADS-ROTEIROS-2026-10-13: o texto
  // dela não tem linhas marcadas para tirar, então a impressão é a do arquivo EXATO do commit 655a9cb5 (conferida, segue byte a byte).
  'lib/ads/v2Brief.ts': '99678c0ef6e681544a984c307ff1524318ac6bb71016133ad8e5a7e38ce5d193',
  'app/api/ads/v2/start/route.ts': 'a8b490a3ab2b297f16c612057763bb4124d4a0acc669816a363449a2ec615f29',
  'app/api/ads/v2/plan/route.ts': 'f9f90f41060eccd96cdfbb07a115b35dd56478ed7f2b70d702fac4c7261fcbfb',
  'app/api/ads/v2/link-import/route.ts': '58e5c3ed1141c2b65fe773fbede9d300973a0eb6ff38fac98290b030e4177810',
  'app/api/ads/v2/orders/route.ts': '6815d9ff91cc40888ef5d0e9b1ae12af1fd67f78309c0c40c5b88d94a5377c63',
  'lib/ads/v2Billing.ts': 'b1ba33894c315fbc017b7d5053fa6db78b9098aa8e79aca94a3c72031943d4b9',
  'lib/ads/v2Tiers.ts': '18678aa1573651bc61ee6ff55508187393ae56c093dbc09f8737e65d344219a0',
  // reancorado KINEO-ESTILOS-DIA1-2026-10-13 — v2Styles com os 4 estilos do lote do dia 1 (catálogo, categorias, frases nas 16
  // línguas e o selo de época `season`/`seasonTag`); nenhuma função de preço, plano ou débito mudou. A impressão é a do arquivo
  // EXATO desta leva (antes: e9f8cf14…407123, base 5d15badd), byte a byte; o resto do caminho do dinheiro segue com a de antes.
  // reancorado KINEO-TIRA-STARLIGHT-1410 — v2Styles sem o starlight_gift (fundador 14/10): saem a linha do catálogo, a categoria,
  // a chave do tipo do lote do dia 1 e as 16 frases; o mecanismo de época (`season`/`seasonTag`) fica. Nenhuma função de preço,
  // plano ou débito mudou. Impressão do arquivo EXATO desta leva (antes: 4f6891ce…dfcf2, base aa78989c); o resto da tabela intacto.
  'lib/ads/v2Styles.ts': 'ac0b9f5eda0d131004053558b8739fe66d376fbc82a287d2a0908ac2421bff3d',
}
const STUDIO_BASE = {
  'app/(dashboard)/studio/StudioClient.tsx': 'f14aced01385418c88fd1a3fc7218c7a6ca83a805d36d776f14c7d2a371fc25c',
  'components/studioKit.tsx': 'c2e1679411a5816f5e80f8a592c17499843e931b3c49b3fbf770637bb8040727',
  'components/ProductStage.tsx': '87f17f599dbb14ff5e7921007304fd0728e26e6b611112def8a55246ac441bd3',
}
// reancorado KINEO-LEVA8-1310 — só o núcleo do /plan passa por semRoteiros (as linhas marcadas dos roteiros saem); o resto, como sempre.
const DESFAZ = { 'lib/ads/v2PlanCore.ts': semRoteiros }
const iguais = (tab, over = {}) => Object.entries(tab).every(([f, h]) => sha((DESFAZ[f] || ((x) => x))(over[f] !== undefined ? over[f] : read(f))) === h)
ok(iguais(STUDIO_BASE), 'D4 o Studio de filmes, o kit (STUDIO_KIT_CSS) e o ProductStage byte a byte iguais à base — nada foi extraído de lá')

// ═══ E. cartão de revisão ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE. cartão de revisão')
const revisaoOk = (src) => {
  const s = code(src)
  const prev = trecho(s, 'function SimplePlanPreview(', 'function SimpleShotGrid(')
  return /const cost = tier \? adsV2Credits\(tier, ADS_V2_SCREEN_SECONDS\) : null/.test(s) && /const shownCost = variations && three \? variationsPrice\(cost\) : cost/.test(s) &&
    /const goLabel = shownCost === null \? ux\.preview\.chooseLevel : scopy \? scopy\.make : fill\(fc\.review\.go, \{ c: shownCost \}\)/.test(s) &&
    /makeLabel=\{scopy \|\| \(variations && three\) \? null : goLabel\}/.test(s) && /: makeLabel \?\? fill\(copy\.plan\.make, \{ c: cost \?\? '' \}\)/.test(prev) &&
    /<p className="adv2f-next" data-kineo="ads-review-next">\{fill\(fc\.review\.then, \{ go: goLabel \}\)\}<\/p>/.test(s) &&
    ordem(s, 'aria-labelledby="adv2s-s4"', '{fc.review.title}', 'data-kineo="ads-review-summary"', '{fc.review.product}', '{fc.review.style}', '{fc.review.scene}', '{fc.review.presenter}', '{fc.review.level}', '{copy.plan.voice}', 'data-kineo="ads-auto-plan"', 'onClick={() => void planAd()}', 'data-kineo="ads-review-next"', 'data-kineo="ads-refresh-scripts"', '<SimplePlanPreview') &&
    !/\b(34|41|51)\b/.test(bloco(s, "const goLabel =").slice(0, 200)) && !/\b(34|41|51) (credits|créditos)/.test(read(F.comp) + read(F.flow))
}
ok(revisaoOk(read(F.simple)), 'E1 o cartão de revisão (produto · estilo · cena · pessoa · nível · voz) e "Gerar · N créditos" com N = cost/shownCost (adsV2Credits; o grupo das 3) — nenhum número digitado')
const vagaOk = (src) => {
  const s = code(src)
  const ch = bloco(s, 'async function chooseScript(')
  return /const scriptOptions = planFresh && plan \? adsV2ScriptOptions\(plan\.scripts\) : null/.test(s) && /\{scriptOptions \? \(\s*<fieldset className="adv2f-scripts" data-kineo="ads-script-options">/.test(s) &&
    /<legend>\{fc\.review\.scripts\}<\/legend>/.test(s) && /onChange=\{\(\) => void chooseScript\(o\)\}/.test(s) && /\{o\.tone \? fc\.tones\[o\.tone\] : o\.label\}/.test(s) &&
    /checked=\{\(scriptPick \?\? \(plan as Plan\)\.script_id \?\? scriptOptions\[0\]\.key\) === o\.key\}/.test(s) &&
    /api<[^>]*>\(ADS_V2_SCRIPT_CHOOSE_ROUTE, \{ method: 'POST', body: \{ order_id: id, script_id: opt\.key \} \}\)/.test(ch) && (ch.match(/api</g) || []).length === 1 && !/\/api\/ads\/v2\/(start|orders|variations)/.test(ch) &&
    /overlays: Array\.isArray\(r\.data\.overlays\) \? r\.data\.overlays : cur\.overlays,/.test(ch) && /narration: typeof r\.data\.narration === 'string' \|\| r\.data\.narration === null \? r\.data\.narration : cur\.narration,/.test(ch) &&
    /if \(!plan \|\| busy !== null \|\| copyBusy \|\| copyEdit\) return/.test(ch) &&
    /setCopyEdit\(\{ narration: plan\.narration \?\? '', overlays: plan\.overlays\.map\(\(o\) => o\.text\) \}\)/.test(s) &&
    /scripts\?: unknown/.test(s) && /script_id\?: string/.test(s)
}
ok(vagaOk(read(F.simple)), 'E2 "Escolha seu roteiro (A/B/C)": só com `scripts` no /plan; o tom traduzido; escolher = POST /plan/choose (grátis) e a narração/frases que VOLTAM viram as do plano — a edição (PATCH) parte delas')

// ═══ F. botão grudado no celular ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nF. botão grudado no celular')
const stickyOk = (ux) => /@media\(max-width:900px\)\{\n\s*\.adv2 \.adv2s-bar\{position:sticky;bottom:12px;z-index:40;display:flex/.test(ux) &&
  /\{go \? \(\s*<button type="button" className="adsw-btn small adv2f-gobtn" data-kineo="ads-mobile-go" aria-disabled=\{go\.disabled\} onClick=\{go\.onClick\}>\{go\.label\}<\/button>/.test(code(ux))
ok(stickyOk(read(F.ux)), 'F1 a barra do celular gruda embaixo (position:sticky) e leva o botão principal')
const repasseOk = (src) => {
  const s = code(src)
  const g = bloco(s, 'function goFromBar()')
  const prev = trecho(s, 'function SimplePlanPreview(', 'function SimpleShotGrid(')
  return /if \(b && !b\.disabled && !goDisabled\) b\.click\(\)/.test(g) && !/makeAd|planAd|api\(|\/api\//.test(g) &&
    /<MobilePreviewBar data=\{liveData\} copy=\{ux\} go=\{\{ label: planFresh \? goLabel : busy === 'plan' \? copy\.plan\.planning : fc\.review\.planShort, onClick: goFromBar, disabled: goDisabled \}\} \/>/.test(s) &&
    /<button ref=\{goBtnRef\} type="button" className="adsw-link adv2f-refresh" disabled=\{locked \|\| missing\.length > 0\} onClick=\{\(\) => void planAd\(\)\} onClickCapture=\{manualPlan\}>/.test(s) && /makeRef=\{goBtnRef\}/.test(s) &&
    /<button ref=\{makeRef\} type="button" className="adsw-btn" disabled=\{busy !== null \|\| cost === null \|\| short > 0 \|\| !!editor\?\.edit\} onClick=\{onMake\}>/.test(prev) &&
    (s.match(/void makeAd\(\)/g) || []).length === 1 && (s.match(/'\/api\/ads\/v2\/start'/g) || []).length === 1
}
ok(repasseOk(read(F.simple)), 'F2 a barra só REPASSA o clique ao botão do cartão (plano grátis ou "Gerar"); o débito continua com UMA porta (1 makeAd, 1 /start)')

// ═══ G. "Comece deste" ═════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG. "Comece deste"')
const PROIBIDOS = ['setItems', 'setText', 'setLink', 'setLinkRead', 'setCardTitle', 'setPrice', 'setContact', 'setTier', 'setLogo', 'setCardColor', 'setVoiceLang', 'setNarrationOn', 'setOverlaysOn', 'setDraft', 'setPlan', 'api(', '/api/']
const comeceTela = (src) => {
  const s = code(src)
  const f = bloco(s, 'function startFrom(')
  const sets = [...f.matchAll(/(?<![.\w])(set[A-Z]\w*)\(/g)].map((m) => m[1])
  return f.length > 100 && JSON.stringify([...new Set(sets)].sort()) === JSON.stringify(['setKindChoice', 'setPresenterChoice', 'setPresenterPick', 'setScene', 'setStartNote', 'setStyleChoice']) &&
    PROIBIDOS.every((p) => !f.includes(p)) && /setScene\(rec\.scene \? sc\.presets\[rec\.scene\]\.text : ''\)/.test(f) && /setPresenterChoice\(rec\.presenter !== null\)/.test(f) && /setPresenterPick\(rec\.presenter\)/.test(f) &&
    /const rec = adsV2StartFromRecipe\(id\)/.test(f) && /<AdsStartFromRow\s+slot=\{rowSlot\}[\s\S]*?onUse=\{startFrom\}/.test(s)
}
ok(comeceTela(read(F.simple)), 'G1 "Comece deste" mexe SÓ em estilo, cena (clima nas 16 línguas), pessoa (e produto/lugar = produto) — nunca fotos, texto, link, preço, nível ou cartão')
const fileiraOk = (over = {}) => {
  const C = tsx(over)(F.comp)
  const h = html(C.AdsStartFromView, { copy: FLOW.ADS_V2_FLOW_COPY.pt, titleOf: (id) => 'T-' + id, chipsOf: () => ['🌃 Neon'], tintOf: () => '#123456', onUse() {}, disabled: false })
  return (h.match(/data-start-from="/g) || []).length === FLOW.ADS_V2_START_FROM.length && h.includes('Comece deste') && h.includes('Comece de um anúncio da Kineo') &&
    FLOW.ADS_V2_START_FROM.every((x) => h.includes(`src="${x.poster}"`)) && h.includes('data-kineo="ads-start-from"')
}
ok(tenta(() => fileiraOk()), 'G2 a fileira RENDERIZADA: um botão "Comece deste" por anúncio da casa, com o pôster real (16 línguas)')
const vagaFileira = (client) => {
  const s = code(client)
  return /\{mode === 'simple' && !groupId \? <div ref=\{setRowSlot\} className="adv2f-rowslot" \/> : null\}/.test(s) && /onSampleGone=\{\(\) => setSampleGone\(true\)\}\n\s*rowSlot=\{rowSlot\}/.test(s) &&
    /\{mode === 'simple' && simplePreview && !groupId \? null : \(\n\s*<ProductRow /.test(s)
}
ok(vagaFileira(read(F.client)), 'G3 invólucro: a vaga da fileira embaixo do quadro só no modo simples; a reta da casa volta fora da montagem')

// ═══ H. abas e lote ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nH. abas e lote')
const abasTela = (client, over = {}) => {
  const s = code(client)
  const head = s.slice(s.indexOf('<header className="adsw-header adv2-head">'), s.indexOf('</header>'))
  const C = tsx(over)(F.comp)
  const M = libs(over)(F.flow)
  const h = html(C.AdsFlowTabs, { active: 'batch', copy: M.ADS_V2_FLOW_COPY.es })
  const hrefs = [...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
  return /\{mode \? <AdsFlowTabs active=\{adsV2FlowTabFor\(mode\)\} copy=\{adsV2FlowCopy\(mode === 'full' \? 'en' : lang\)\} \/> : null\}/.test(head) &&
    JSON.stringify(hrefs) === JSON.stringify(['/ads/v2', '/ads/v2?mode=batch', '/ads/v2?mode=full']) && (h.match(/aria-current="page"/g) || []).length === 1 &&
    /href="\/ads\/v2\?mode=batch" aria-current="page">Lote</.test(h) && h.includes('Un anuncio') && h.includes('Producción') &&
    /if \(new URLSearchParams\(window\.location\.search\)\.get\('mode'\) === 'batch'\) batch = true/.test(s) && /if \(new URLSearchParams\(window\.location\.search\)\.get\('mode'\) === 'full'\) m = 'full'/.test(s)
}
ok(tenta(() => abasTela(read(F.client))), 'H1 abas no cabeçalho, RENDERIZADAS: Um anúncio → /ads/v2, Lote → ?mode=batch, Produção → ?mode=full; a aba atual marcada; o invólucro lê o modo como sempre')
const loteOk = (src) => {
  const s = code(src)
  return /const total = rows\.reduce\(\(s, r\) => s \+ rowCost\(r\), 0\)/.test(s) && /const mathGrid = rows\.length > 1 && mathProducts \* mathStyles === rows\.length && mathProducts > 1 && mathStyles > 1/.test(s) &&
    /<span data-kineo="ads-batch-math">\{mathProducts\} product\{[^}]*\} \{mathGrid \? '×' : '·'\} \{mathStyles\} style\{[^}]*\} \{mathGrid \? '=' : '·'\} \{rows\.length\} ad\{[^}]*\} · \{total\} credits<\/span>/.test(s)
}
ok(loteOk(read(F.batch)), 'H2 lote: "N products × M styles = K ads · X credits" antes de gerar, com o MESMO total (adsV2Credits por linha); o "×…=" só quando a grade fecha')

// ═══ I. dinheiro intocado ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nI. caminho do dinheiro')
ok(iguais(BASE), 'I1 v2StartCore, v2PlanCore, v2Brief, rotas /start /plan /orders /link-import, v2Billing, v2Tiers e v2Styles byte a byte iguais à base')
const FN_BASE = {
  'async function makeAd()': '645b3aa671011f11e4bf82913275697bebfc22219b7cd63ccfad4fae2241f3d5',
  'async function makeVariations()': 'dd04061268b46a5c7697800c780575d4f957ce0d992609895d014848d1c5a03d',
  'async function planAd()': '199ab88ea5d8b468cfbd87074de69562ccd41fc79785a157c5ac144ce3db3179',
  'async function ensureDraft()': '251fe620319781f8717e02ceaa11a1f2325afbbdb713152e9acea2c73d545464',
  'async function syncCard(': '6088f9b3af109a76202f506b1c1ea3dd35994bb4e030c694763056545708d46e',
  'async function ensureCard()': 'b903d1463b135d361008438002000624c7173df713da31c6f9093f11ec732def',
  'async function saveCopyEdit()': '95ff92d53d970a2b8fc1a5a29c648f21a633c57a7636bf6d9938fb98c713cc07',
}
const telaDinheiro = (src) => Object.entries(FN_BASE).every(([f, h]) => sha(bloco(src, f)) === h)
ok(telaDinheiro(read(F.simple)), 'I2 na tela, makeAd, makeVariations, planAd, ensureDraft, syncCard, ensureCard e saveCopyEdit byte a byte iguais à base')

// ═══ J. rótulo de IA ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nJ. rótulo de IA')
const iaOk = (src) => {
  const s = code(src)
  return /<p className="adv2-note" role="note">\{adsV2AiLabelNotice\(lang\)\}<\/p>/.test(s) && /\{presenterOn \? <span className="adv2f-ai">\{presenterAi\}<\/span> : null\}/.test(s) &&
    /const presenterAi = adsV2PresenterPickerCopy\(lang\)\.ai/.test(s) && /return p \? `\$\{p\.name\} · \$\{presenterAi\}` : styleCopy\.autoLabel/.test(s) && /<AdsPresenterPicker name="adv2s-presenter-pick"/.test(s) &&
    /adsV2AiLabelNotice\('en'\)/.test(read(F.batch))
}
ok(iaOk(read(F.simple)), 'J1 o aviso de rótulo de IA na entrega continua; a pessoa leva o selo "AI" no cartão de revisão e no "Comece deste"')
const semInglesNoComp = (src) => {
  const s = code(src)
  const jsx = s.slice(s.indexOf('export function AdsFlowTabs'))
  return !/>\s*[A-Za-z][A-Za-z ,.'’!:-]{2,}\s*</.test(jsx) && !/(placeholder|aria-label|alt|title)="[A-Za-z]/.test(jsx)
}
ok(semInglesNoComp(read(F.comp)), 'J2 os componentes novos não têm texto de interface cravado: tudo vem das frases (16 línguas)')

// ═══ K. roteiro automático e lote ═══════════════════════════════════════════════════════════════════════════════════
console.log('\nK. roteiro automático (sem "Descobrir e planejar") e lote')
const autoOk = (src) => {
  const s = code(src)
  const ef = trecho(s, 'const planAdRef = useRef(planAd)', 'function manualPlan()')
  return /if \(phase !== 'build' \|\| autoPaused \|\| busy !== null \|\| copyEdit \|\| linkBusy \|\| missing\.length > 0 \|\| planFresh\) return/.test(ef) &&
    /if \(autoRef\.current\.sig === planSig\) return/.test(ef) && ordem(ef, 'window.setTimeout(() => {', 'autoRef.current = { sig: planSig, running: true }', 'void planAdRef.current()', '}, ADS_V2_AUTO_PLAN_MS)', 'return () => window.clearTimeout(t)') &&
    /\}, \[phase, autoPaused, busy, copyEdit, linkBusy, missing\.length, planFresh, planSig\]\)/.test(ef) && /if \(planError\) setAutoPaused\(true\)/.test(ef) &&
    /autoRef\.current = \{ sig: planSig, running: false \}\n\s*setAutoPaused\(false\)/.test(bloco(s, 'function manualPlan()')) &&
    (s.match(/onClickCapture=\{manualPlan\}/g) || []).length === 2 && !/<button[^>]*className="adsw-btn"[^>]*onClick=\{\(\) => void planAd\(\)\}/.test(s) &&
    /\{busy === 'plan' \? copy\.plan\.planning : autoPaused \? fc\.auto\.paused : fc\.auto\.note\}/.test(s)
}
ok(autoOk(read(F.simple)), 'K1 o roteiro sai SOZINHO 1,2 s depois da última mudança (o MESMO planAd), nunca sem mudança de verdade nem com o plano em dia; falhou = pausa até o link manual "Atualizar roteiros"')
const loteSemVariantes = (src) => /\.\.\.\(presenterOn \? \{ presenter: true \} : \{\}\),\n\s*scripts: false,/.test(code(src))
ok(loteSemVariantes(read(F.batch)), 'K2 o lote pede o /plan com `scripts: false` (um roteiro por linha, sem variantes)')

// ═══ M. mutantes ═══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um aplicado e vermelho)')
const muta = (rel, de, para) => {
  const src = read(rel)
  const n = src.split(de).length - 1
  const out = src.split(de).join(para)
  return { out, aplicado: n === 1 && out !== src && out.includes(para) }
}
const vermelho = (nome, rel, de, para, passa) => {
  const m = muta(rel, de, para)
  let verde = true
  try { verde = !!passa(m.out, { [rel]: m.out }) } catch { verde = false }
  ok(m.aplicado && !verde, `${nome}${m.aplicado ? '' : ' (NÃO APLICOU)'}`)
}
vermelho('M1 link depois da área de soltar fotos', F.simple, '<div className="adsw-f adv2s-link adv2f-link" data-kineo="ads-link-import">', '<DropZone x /><div className="adsw-f adv2s-link adv2f-link" data-kineo="ads-link-import">', (s) => linkPrimeiro(s))
vermelho('M2 "Colar" sem buscar a página', F.simple, 'fc.link.pasteFail })\n      linkInputRef.current?.focus()\n      return\n    }\n    setLink(raw)\n    void importLink(raw)', 'fc.link.pasteFail })\n      linkInputRef.current?.focus()\n      return\n    }\n    setLink(raw)', (s) => colarOk(s))
vermelho('M3 importLink chamando o /plan', F.simple, "'/api/ads/v2/link-import'", "'/api/ads/v2/plan'", (s) => importOk(s))
vermelho('M4 nome da página por cima do que a pessoa digitou', F.simple, 'setCardTitle((cur) => (cur.trim() ? cur : pageName))', 'setCardTitle(pageName)', (s) => lemosOk(s))
vermelho('M5 cartão sem o título "Lemos sua página"', F.comp, '<i aria-hidden="true">✓</i>{copy.read.title}', '<i aria-hidden="true">✓</i>{copy.read.name}', (_s, o) => cartaoOk(o))
vermelho('M6 palco tocando o anúncio da casa em vez do estilo', F.comp, 'media = <StageLoop src={data.preview} poster={data.poster} />', "media = <StageLoop src={house.video ?? ''} poster={house.poster ?? null} />", (_s, o) => palcoOk(o))
vermelho('M7 palco com a cor fixa (ignora o estilo)', F.comp, "'--stage-a': data.tint[0]", "'--stage-a': '#2563EB'", (_s, o) => palcoOk(o))
vermelho('M8 "Gerar · 41 créditos" digitado', F.simple, 'fill(fc.review.go, { c: shownCost })', 'fill(fc.review.go, { c: 41 })', (s) => revisaoOk(s))
vermelho('M9 frase "Gerar" com número cravado numa língua', F.flow, "go: 'Gerar · {c} créditos'", "go: 'Gerar · 41 créditos'", (_s, o) => linguasOk(libs(o)(F.flow)))
vermelho('M10 frase copiada do inglês', F.flow, "title: 'Lemos sua página'", "title: 'We read your page'", (_s, o) => linguasOk(libs(o)(F.flow)))
vermelho('M11 barra do celular sem grudar', F.ux, '.adv2 .adv2s-bar{position:sticky;bottom:12px;', '.adv2 .adv2s-bar{position:static;bottom:12px;', (s) => stickyOk(s))
vermelho('M12 barra chamando makeAd direto (2ª porta de débito)', F.simple, 'if (b && !b.disabled && !goDisabled) b.click()', 'if (b && !b.disabled && !goDisabled) void makeAd()', (s) => repasseOk(s))
vermelho('M13 "Comece deste" apagando o texto do produto', F.simple, '    setStartNote(fc.start.applied)', "    setStartNote(fc.start.applied)\n    setText('')", (s) => comeceTela(s))
vermelho('M14 receita levando o link junto', F.flow, 'return it ? { style: it.style, scene: it.scene, presenter: it.presenter } : null', 'return it ? ({ style: it.style, scene: it.scene, presenter: it.presenter, link: it.video } as never) : null', (_s, o) => comeceOk(libs(o)(F.flow)))
vermelho('M15 aba Lote com o endereço errado', F.flow, "{ id: 'batch', href: '/ads/v2?mode=batch' }", "{ id: 'batch', href: '/ads/v2?mode=lote' }", (_s, o) => abasOk(libs(o)(F.flow)) && abasTela(read(F.client), o))
vermelho('M16 vaga dos roteiros aceitando 1 opção só', F.flow, 'return out.length >= 2 ? out : null', 'return out.length >= 1 ? out : null', (_s, o) => roteirosOk(libs(o)(F.flow)))
vermelho('M17 1 caractere a mais no núcleo do débito (v2StartCore)', 'lib/ads/v2StartCore.ts', 'chargeAdsV2(admin, { userId: uid, billingRef, cost })', 'chargeAdsV2(admin, { userId: uid, billingRef, cost: cost })', (_s, o) => iguais(BASE, o))
vermelho('M18 1 caractere a mais no makeAd da tela', F.simple, "      setBusyNote(copy.plan.starting)\n", "      setBusyNote(copy.plan.starting )\n", (s) => telaDinheiro(s))
vermelho('M19 aviso de rótulo de IA tirado da entrega', F.simple, '<p className="adv2-note" role="note">{adsV2AiLabelNotice(lang)}</p>', '', (s) => iaOk(s))
vermelho('M20 texto em inglês cravado num componente novo', F.comp, '<h2 id="adv2f-start-h">{copy.start.title}</h2>', '<h2 id="adv2f-start-h">Start from a Kineo ad</h2>', (s) => semInglesNoComp(s))
vermelho('M21 lote com a conta fora do total', F.batch, '· {total} credits</span>', '· {total + 1} credits</span>', (s) => loteOk(s))
vermelho('M22 Studio de filmes mexido (1 caractere)', 'app/(dashboard)/studio/StudioClient.tsx', 'function EngineHero(', 'function  EngineHero(', (_s, o) => iguais(STUDIO_BASE, o))

vermelho('M23 roteiro automático refazendo sem mudança', F.simple, '    if (autoRef.current.sig === planSig) return\n', '', (s) => autoOk(s))
vermelho('M24 roteiro automático sem esperar a pessoa parar de digitar', F.simple, '    }, ADS_V2_AUTO_PLAN_MS)', '    }, 0)', (s) => autoOk(s))
vermelho('M25 falha automática sem pausa (tentaria de novo sozinho)', F.simple, '    if (planError) setAutoPaused(true)', '    if (planError) setAutoPaused(false)', (s) => autoOk(s))
vermelho('M26 escolher o roteiro sem trocar as frases do plano', F.simple, '        overlays: Array.isArray(r.data.overlays) ? r.data.overlays : cur.overlays,\n', '', (s) => vagaOk(s))
vermelho('M27 escolher o roteiro pela rota errada', F.flow, "export const ADS_V2_SCRIPT_CHOOSE_ROUTE = '/api/ads/v2/plan/choose'", "export const ADS_V2_SCRIPT_CHOOSE_ROUTE = '/api/ads/v2/start'", (_s, o) => roteirosOk(libs(o)(F.flow)))
vermelho('M28 lote pedindo variantes', F.batch, '        scripts: false, //', '        scripts: true, //', (s) => loteSemVariantes(s))
vermelho('M29 tom do roteiro sem tradução numa língua', F.flow, "tones: { benefit: 'Benefício'", "tones: { benefit: 'Benefit'", (_s, o) => linguasOk(libs(o)(F.flow)))

console.log(`\ntest-ads-fluxo-1310: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
