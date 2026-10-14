// KINEO-ADS-LINK-TELA-1510 — guardião da TELA do leitor de link do Studio Ads (follow-up do KINEO-ADS-LINK-LOJAS-1510; fundador
// 15/10: "Ads perfeito para agências, hoje"). Nada de rede, nada pago: readFileSync + o carregador offline
// (scripts/test-support/offline-ts-loader.mjs) para a lib pura, o React de verdade (renderToStaticMarkup) para o cartão
// "Lemos sua página", e `git` para medir O PRÓPRIO commit contra o pai dele (antes do commit existir: HEAD + o não commitado).
//
// O que prova:
//   A lib/ads/v2LinkTela.ts: confiança que não é 'high' pede confirmação ('high' não); "não tivemos certeza do preço"
//     (price_varies/range/conflict/is_from) ≠ "a página não tem preço" (no_price); a moeda só ISO de 3 letras; o 422 honesto:
//     inglês = body.message EXATO, as outras línguas = a mesma frase traduzida pelos ramos de linkBlockMessage (e o inglês
//     traduzido é IGUAL ao do servidor em todos os ramos); 16 línguas preenchidas, com {site}, nenhuma caindo no inglês;
//   B o AdsV2Simple: a confiança média/baixa entra no "falta" (o roteiro automático e o manual esperam), "Looks right" e editar
//     nome/preço confirmam, 'high' nasce confirmado; o 422 'link_unreachable' mostra a frase do servidor + "Enviar a foto"
//     que leva à área de soltar; a moeda e o estado do preço chegam ao cartão;
//   C o cartão RENDERIZADO: pendente = título de conferência, campos destacados, botão "Looks right"; 'high' = o MESMO HTML do
//     cartão de antes (sem a moeda); preço incerto × sem preço = frases diferentes; a moeda ao lado do preço;
//   D o AdsV2Batch: o 422 mostra body.message e o botão "Upload the photo instead" abre o seletor de fotos DA linha;
//   E dinheiro intocado no diff deste commit (só as 3 telas, a lib nova e scripts/); desfeito este conserto
//     (scripts/test-support/desfaz-ads-link-tela-1510.mjs), as 3 telas são EXATAMENTE o pai; todo bloco novo traz a marca;
//   M mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou (âncora única, texto mudou).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semLinkTela1510, LINK_TELA_1510_ARQUIVOS, MARCA_LINK_TELA_1510 } from './test-support/desfaz-ads-link-tela-1510.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })
const MARCA = MARCA_LINK_TELA_1510

// base = pai do PRIMEIRO commit com a marca; antes do commit existir, HEAD (e o diff é o não commitado)
let BASE = 'HEAD'
let PROPRIO = null
try {
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  if (shas.length) { PROPRIO = shas[shas.length - 1]; BASE = git('rev-parse', `${PROPRIO}~1`).trim() }
} catch { BASE = 'HEAD' }
const base = (rel) => { try { return git('show', `${BASE}:${rel}`).replace(/\r\n/g, '\n') } catch { return null } }
const diffDoConserto = (opts, paths = []) => ((PROPRIO ? git('diff', ...opts, BASE, PROPRIO, '--', ...paths) + git('diff', ...opts, 'HEAD', '--', ...paths) : git('diff', ...opts, BASE, '--', ...paths))).replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = (fn) => { try { return !!fn() } catch (e) { if (process.env.DEBUG_LT) console.log('       (lançou: ' + (e && e.stack) + ')'); return false } }
const troca = (src, a, b) => { if (src.split(a).length !== 2) throw Error('âncora não única: ' + a.slice(0, 70)); const s = src.split(a).join(b); if (s === src) throw Error('mutante não aplicou'); return s }

const F = {
  lib: 'lib/ads/v2LinkTela.ts',
  reader: 'lib/ads/linkReader.ts',
  flowCopy: 'lib/ads/v2Flow.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  batch: 'app/(dashboard)/ads/v2/AdsV2Batch.tsx',
  comp: 'components/ads/AdsFlow.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, read(f)]))
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']

// ─── carregadores (com troca de fonte para os mutantes) ─────────────────────────────────────────────────────────────
const libs = (over = {}) => createOfflineLoader({ source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const req = createRequire(path.join(ROOT, 'package.json'))
const React = req('react')
const ReactDOM = req('react-dom')
const JSX = req('react/jsx-runtime')
const Server = req('react-dom/server')
function tsx(over = {}) {
  const cache = new Map()
  const ext = { react: React, 'react-dom': ReactDOM, 'react/jsx-runtime': JSX, '@/components/ProductStage': { ADS_HOUSE_STAGE: {} } }
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
const bloco = (s, a, fim = '\n  }\n') => { const i = s.indexOf(a); const j = i < 0 ? -1 : s.indexOf(fim, i); return i < 0 || j < 0 ? '' : s.slice(i, j + fim.length) }

// ═══ A. a lib pura ══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('A. lib/ads/v2LinkTela.ts')
const libOf = (over = {}) => libs(over)(F.lib)
const READER = libs()(F.reader)
const FLOW = libs()(F.flowCopy)
const checkOk = (T) => T.adsV2LinkNeedsCheck('medium') && T.adsV2LinkNeedsCheck('low') && T.adsV2LinkNeedsCheck(null) && T.adsV2LinkNeedsCheck(undefined) && !T.adsV2LinkNeedsCheck('high')
ok(tenta(() => checkOk(libOf())), 'A1 confiança medium/low/ausente = pede confirmação; high = não pede (como antes)')
const precoOk = (T) => T.adsV2LinkPriceState('USD 29.90', ['price_from_meta']) === 'found' &&
  ['price_varies', 'price_range', 'price_conflict', 'price_is_from'].every((r) => T.adsV2LinkPriceState(null, ['jsonld_product', r]) === 'unsure') &&
  T.adsV2LinkPriceState(null, ['jsonld_product', 'no_price']) === 'none' && T.adsV2LinkPriceState('', []) === 'none' && T.adsV2LinkPriceState(null, 'lixo') === 'none' &&
  LANGS.every((l) => { const c = T.ADS_V2_LINK_TELA_COPY[l]; const fc = FLOW.ADS_V2_FLOW_COPY[l]; return c && fc && c.priceUnsure && c.priceUnsure !== fc.read.priceNone })
ok(tenta(() => precoOk(libOf())), 'A2 preço descartado por dúvida (variantes/faixa/conflito/"de") = "unsure"; no_price = "none"; a frase do "unsure" ≠ "a página não tem preço" nas 16 línguas')
const moedaOk = (T) => T.adsV2LinkCurrency('brl') === 'BRL' && T.adsV2LinkCurrency(' USD ') === 'USD' && T.adsV2LinkCurrency('R$') === null && T.adsV2LinkCurrency(null) === null && T.adsV2LinkCurrency('EURO') === null
ok(tenta(() => moedaOk(libOf())), 'A3 a moeda: ISO de 3 letras (maiúsculas); "R$", vazio e lixo = nada')
const BLOQ = [
  { platform: 'amazon', detail: 'captcha' }, { platform: 'etsy', detail: 'captcha' }, { platform: 'mercadolivre', detail: 'login' },
  { platform: 'generic', detail: 'login' }, { platform: 'generic', detail: 'js_only' }, { platform: 'generic', detail: 'captcha' }, { platform: 'shopify', detail: 'captcha' },
]
const avisoOk = (T) => {
  const en = T.adsV2LinkTelaCopy('en'), pt = T.adsV2LinkTelaCopy('pt')
  const corpo = (b) => ({ error: 'link_unreachable', why: 'blocked', ...b, message: READER.linkBlockMessage(b.platform, b.detail) })
  return BLOQ.every((b) => T.adsV2LinkBlockedText(corpo(b), en, 'en') === corpo(b).message) && // inglês = a frase EXATA do servidor
    T.adsV2LinkBlockedText({ message: 'Server says hi.' }, en, 'en') === 'Server says hi.' &&
    BLOQ.every((b) => { const ptT = T.adsV2LinkBlockedText(corpo(b), pt, 'pt'); return typeof ptT === 'string' && ptT.length > 10 && ptT !== corpo(b).message && !ptT.includes('{site}') }) &&
    T.adsV2LinkBlockedText(corpo(BLOQ[0]), pt, 'pt').startsWith('Amazon ') && T.adsV2LinkBlockedText(corpo(BLOQ[2]), pt, 'pt').startsWith('Mercado Livre ') &&
    // o inglês TRADUZIDO pelos ramos (língua 'xx' cai no inglês verbatim; forçando os ramos pelo EN) bate com o servidor em todos os casos
    BLOQ.every((b) => { const viaRamos = T.adsV2LinkBlockedText({ ...corpo(b), message: 'x' }, en, 'pt'); return viaRamos === corpo(b).message }) &&
    T.adsV2LinkBlockedText({ why: 'blocked' }, pt, 'pt') === null && T.adsV2LinkBlockedText(null, en, 'en') === null && T.adsV2LinkBlockedText({ message: '  ' }, en, 'en') === null
}
ok(tenta(() => avisoOk(libOf())), 'A4 o 422 honesto: inglês = body.message EXATO; pt = a mesma frase traduzida (Amazon/Etsy/Mercado Livre/login/só-JS/bloqueio); os ramos em inglês = linkBlockMessage do servidor; sem message = null')
const linguasOk = (T) => {
  const C = T.ADS_V2_LINK_TELA_COPY, en = C.en, keys = Object.keys(en)
  return Object.keys(C).length === 16 && LANGS.every((l) => C[l] && keys.every((k) => typeof C[l][k] === 'string' && C[l][k].trim().length > 1)) &&
    LANGS.every((l) => C[l].blockedBy.includes('{site}') && C[l].loginBy.includes('{site}') && !/\{(?!site\})/.test(Object.values(C[l]).join(' '))) &&
    LANGS.filter((l) => l !== 'en').every((l) => ['title', 'why', 'ok', 'pending', 'priceUnsure', 'upload', 'blocked', 'login', 'jsOnly'].every((k) => C[l][k] !== en[k])) &&
    T.adsV2LinkTelaCopy('xx') === en && T.adsV2LinkTelaCopy('pt') === C.pt
}
ok(tenta(() => linguasOk(libOf())), 'A5 16 línguas, todas as frases preenchidas, {site} onde precisa, nenhuma língua caindo no inglês; língua desconhecida = inglês')

// ═══ B. o AdsV2Simple ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nB. AdsV2Simple')
const faltaOk = (s) => {
  const falta = s.slice(s.indexOf('  const missing: string[] = []'), s.indexOf('// ── URL, poll e vista do pedido'))
  return /\n  if \(linkFacts\?\.check\) missing\.push\(ltc\.pending\)/.test(falta) &&
    s.indexOf('const [linkFacts, setLinkFacts]') > 0 && s.indexOf('const [linkFacts, setLinkFacts]') < s.indexOf('  const missing: string[] = []') &&
    /missing\.length > 0 \|\| planFresh\) return/.test(s) && /if \(busy \|\| missing\.length\) return/.test(s) &&
    /const goDisabled = planFresh \? [^\n]*: locked \|\| missing\.length > 0/.test(s) &&
    /const ltc: AdsV2LinkTelaCopy = adsV2LinkTelaCopy\(lang\)/.test(s)
}
ok(tenta(() => faltaOk(SRC.simple)), 'B1 confiança média/baixa entra no "falta": o roteiro automático (1,2 s), o manual e o botão Gerar esperam a confirmação')
const lidoOk = (s) => {
  const imp = bloco(s, 'async function importLink(')
  return /setLinkFacts\(\{ host: host \|\| url, priceFound: !!pagePrice, check: adsV2LinkNeedsCheck\(extra\.confidence\), confirmed: false, priceState: adsV2LinkPriceState\(r\.data\.price, extra\.reasons\), currency: adsV2LinkCurrency\(extra\.currency\) \}\)/.test(imp) &&
    /const confirmLink = \(\) => setLinkFacts\(\(f\) => \(f && f\.check \? \{ \.\.\.f, check: false, confirmed: true \} : f\)\)/.test(s) &&
    /onName=\{\(v\) => \{ setCardTitle\(v\); confirmLink\(\) \}\}/.test(s) && /onPrice=\{\(v\) => \{ setPrice\(v\); confirmLink\(\) \}\}/.test(s) &&
    /check=\{linkFacts\.priceState \? \{ copy: ltc, pending: !!linkFacts\.check, confirmed: !!linkFacts\.confirmed, onConfirm: confirmLink, priceState: linkFacts\.priceState, currency: linkFacts\.currency \?\? null \} : undefined\}/.test(s) &&
    /setLinkFacts\(null\)/.test(imp)
}
ok(tenta(() => lidoOk(SRC.simple)), 'B2 o que a rota disse chega ao cartão: check = confiança não-high, estado do preço, moeda; "Looks right" e editar nome/preço confirmam; link novo zera')
const erroOk = (s) => {
  const imp = bloco(s, 'async function importLink(')
  const i = imp.indexOf('if (!r.ok) {'), j = imp.indexOf('const host = typeof r.data.host')
  const ramo = imp.slice(i, j)
  return /const blockedText = r\.code === 'link_unreachable' \? adsV2LinkBlockedText\(r\.body, ltc, lang\) : null/.test(ramo) &&
    /if \(r\.code === 'link_unreachable'\) \{ setLinkNote\(\{ warn: true, upload: true, text: blockedText \?\? \(/.test(ramo) &&
    ramo.indexOf('blockedText ??') < ramo.indexOf("r.code.startsWith('moderation')") && ramo.indexOf('if (sampleGone(r.code)) return') < ramo.indexOf('const blockedText') &&
    /\{linkNote\?\.upload \? <button type="button" [^\n]*data-kineo="ads-link-upload-instead"[^\n]*onClick=\{focusDrop\}>\{ltc\.upload\}<\/button> : null\}/.test(s) &&
    /<div className="adv2q-drop" ref=\{dropRef\}/.test(s) && /function focusDrop\(\) \{[\s\S]{0,400}?querySelector<HTMLButtonElement>\('button\.adv2-add'\)\?\.focus\(/.test(s)
}
ok(tenta(() => erroOk(SRC.simple)), 'B3 o 422 "link_unreachable" mostra a frase do servidor (adsV2LinkBlockedText) antes das genéricas e o botão "Enviar a foto" leva o foco à área de soltar')

// ═══ C. o cartão renderizado ════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. "Lemos sua página" renderizado')
const cartao = (over = {}) => {
  const C = tsx(over)(F.comp)
  const T = libOf()
  const b = { host: 'loja.test', photos: ['/a.jpg'], name: 'Echo Dot', namePlaceholder: '', onName() {}, price: '', onPrice() {}, pricePlaceholder: '', priceFound: false, disabled: false, copy: FLOW.ADS_V2_FLOW_COPY.en }
  const chk = (o) => ({ copy: T.ADS_V2_LINK_TELA_COPY.en, pending: false, confirmed: false, onConfirm() {}, priceState: 'found', currency: null, ...o })
  return {
    T, b,
    antes: html(C.AdsReadCard, { ...b, price: 'USD 29.99', priceFound: true }),
    alto: html(C.AdsReadCard, { ...b, price: 'USD 29.99', priceFound: true, check: chk({}) }),
    pend: html(C.AdsReadCard, { ...b, check: chk({ pending: true, priceState: 'unsure' }) }),
    nada: html(C.AdsReadCard, { ...b, check: chk({ priceState: 'none' }) }),
    moeda: html(C.AdsReadCard, { ...b, price: 'BRL 129,90', priceFound: true, check: chk({ currency: 'BRL' }) }),
    feito: html(C.AdsReadCard, { ...b, price: 'x', priceFound: true, check: chk({ confirmed: true }) }),
    ptPend: html(C.AdsReadCard, { ...b, copy: FLOW.ADS_V2_FLOW_COPY.pt, check: chk({ copy: T.ADS_V2_LINK_TELA_COPY.pt, pending: true, priceState: 'unsure' }) }),
  }
}
const pendenteOk = (R) => {
  const en = R.T.ADS_V2_LINK_TELA_COPY.en, pt = R.T.ADS_V2_LINK_TELA_COPY.pt
  return R.pend.includes('data-check="true"') && R.pend.includes(en.title) && R.pend.includes(en.why) && R.pend.includes('data-kineo="ads-link-looks-right"') && R.pend.includes(`>${en.ok}</button>`) &&
    !R.pend.includes(FLOW.ADS_V2_FLOW_COPY.en.read.title) && R.ptPend.includes(pt.title) && R.ptPend.includes(`>${pt.ok}</button>`)
}
ok(tenta(() => pendenteOk(cartao())), 'C1 confiança média/baixa: o cartão vira "Please confirm the product name, price and photo", campos destacados (data-check) e o botão "Looks right" (sem modal); em pt também')
const altoOk = (R) => R.alto === R.antes && !R.alto.includes('data-check') && !R.alto.includes('ads-link-looks-right') && R.alto.includes(FLOW.ADS_V2_FLOW_COPY.en.read.title) && R.feito.includes('data-kineo="ads-link-confirmed"') && !R.feito.includes('data-check')
ok(tenta(() => altoOk(cartao())), 'C2 confiança high = o MESMO HTML do cartão de antes (sem destaque, sem botão); confirmado = só o ✓ de agradecimento')
const precoCartaoOk = (R) => {
  const en = R.T.ADS_V2_LINK_TELA_COPY.en, none = FLOW.ADS_V2_FLOW_COPY.en.read.priceNone
  return R.pend.includes(en.priceUnsure) && !R.pend.includes(none) && R.nada.includes(none) && !R.nada.includes(en.priceUnsure) &&
    R.moeda.includes('data-kineo="ads-link-currency">BRL</span>') && !R.alto.includes('ads-link-currency')
}
ok(tenta(() => precoCartaoOk(cartao())), 'C3 preço incerto = "We weren’t sure about the price…"; sem preço = "No price on the page…"; a moeda ao lado de "Price" só quando a página disse')
const cssOk = (s) => /\.adv2 \.adv2f-read\[data-check=true\] input\{border-color:#F59E0B/.test(s) && !/<style>\s*\{/.test(s)
ok(tenta(() => cssOk(SRC.comp)), 'C4 o destaque vive no ADS_FLOW_CSS (injetado por dangerouslySetInnerHTML no AdsV2Client), sem <style>{…} cru')

// ═══ D. o AdsV2Batch ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. AdsV2Batch')
const loteOk = (s) => {
  const imp = bloco(s, 'async function importLink(key: string)')
  const i = imp.indexOf('if (!r.ok) {')
  const ramo = imp.slice(i, imp.indexOf('const host = typeof r.data.host'))
  return /const LINK_TELA = adsV2LinkTelaCopy\('en'\)/.test(s) &&
    /if \(r\.code === 'link_unreachable'\) \{ updateRow\(key, \{ linkBusy: false, linkUpload: true, linkNote: adsV2LinkBlockedText\(r\.body, LINK_TELA, 'en'\) \?\? adsV2LinkImportError\(r\.code, LINK_COPY\) \}\); return \}/.test(ramo) &&
    ramo.indexOf('adsV2LinkBlockedText') < ramo.indexOf("r.code.startsWith('moderation')") &&
    /if \(row\.linkUpload\) updateRow\(key, \{ linkUpload: false \}\)/.test(imp) &&
    /\{r\.linkNote && r\.linkUpload && r\.photos\.length < MAX_PHOTOS_PER_ROW \? <button [^\n]*data-kineo="ads-batch-upload-instead"[^\n]*closest\('li'\)\?\.querySelector<HTMLInputElement>\('input\[type=file\]'\)\?\.click\(\)\}>\{LINK_TELA\.upload\}<\/button> : null\}/.test(s)
}
ok(tenta(() => loteOk(SRC.batch)), 'D1 o lote: o 422 mostra body.message (adsV2LinkBlockedText) antes da frase genérica e "Upload the photo instead" abre o seletor de fotos da linha')

// ═══ E. dinheiro intocado, desfaz e marca ═══════════════════════════════════════════════════════════════════════════
console.log('\nE. dinheiro intocado, desfaz e marca')
const PERMITIDOS = new Set([...LINK_TELA_1510_ARQUIVOS, F.lib])
const tocados = () => [...new Set(diffDoConserto(['--name-only']).split('\n').map((l) => l.trim()).filter(Boolean))]
const DINHEIRO = ['lib/ads/v2Billing.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'app/api/ads/v2/plan/route.ts', 'lib/ads/v2PlanCore.ts', 'lib/ads/v2Batch.ts', 'app/api/ads/v2/link-import/route.ts', 'lib/ads/v2Link.ts', 'lib/ads/linkReader.ts', 'lib/ads/v2LinkImport.ts', 'lib/credits/debit.ts', 'lib/credits/refund.ts']
ok(tenta(() => { const t = tocados(); return t.every((f) => PERMITIDOS.has(f) || f.startsWith('scripts/')) && DINHEIRO.every((f) => !t.includes(f) && base(f) !== null && read(f) === base(f)) }), `E1 o diff deste conserto só toca as 3 telas, a lib nova e scripts/; dinheiro e a rota/leitor do link byte a byte iguais ao pai (${BASE.slice(0, 8)})`)
const desfeitoOk = (S) => LINK_TELA_1510_ARQUIVOS.length === 3 && [['simple', F.simple], ['batch', F.batch], ['comp', F.comp]].every(([k, f]) => semLinkTela1510(f, S[k]) === base(f))
ok(tenta(() => desfeitoOk(SRC)), 'E2 desfeito este conserto (scripts/test-support/desfaz-ads-link-tela-1510.mjs), AdsV2Simple, AdsV2Batch e AdsFlow são EXATAMENTE o pai')
const marcadosOk = () => LINK_TELA_1510_ARQUIVOS.every((f) => {
  const d = diffDoConserto(['-U0', '--no-color'], [f])
  const blocos = d.split('\n@@').slice(1).map((h) => h.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')))
  return blocos.length > 0 && blocos.every((b) => b.length === 0 || b.some((l) => l.includes(MARCA)))
})
ok(tenta(marcadosOk), 'E3 todo bloco novo nas 3 telas traz a marca KINEO-ADS-LINK-TELA-1510')

// ═══ M. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um aplicado e vermelho)')
const vermelho = (nome, fn) => { let red; try { red = !fn() } catch (e) { if (process.env.DEBUG_LT) console.log('       (mutante lançou: ' + (e && e.message) + ')'); red = !/âncora não única|mutante não aplicou/.test(String(e && e.message)) ; if (!red) { console.log('  FAIL ' + nome + ' (NÃO APLICOU: ' + e.message + ')'); fail++; return } } ok(red, nome) }
vermelho('M1 confiança medium deixa de pedir confirmação → A1 vermelho', () => checkOk(libOf({ [F.lib]: troca(SRC.lib, "return confidence !== 'high'", "return confidence === 'low'") })))
vermelho('M2 preço incerto vira "a página não tem preço" (ignora os porquês) → A2 vermelho', () => precoOk(libOf({ [F.lib]: troca(SRC.lib, "? 'unsure' : 'none'", "? 'none' : 'none'") })))
vermelho('M3 o 422 ignora body.message em inglês (sempre traduz) → A4 vermelho', () => avisoOk(libOf({ [F.lib]: troca(SRC.lib, "if (!language || language === 'en' || ", "if (!language || ") })))
vermelho('M4 o vietnamita some da tabela → A5 vermelho', () => linguasOk(libOf({ [F.lib]: troca(SRC.lib, ', id: ID, vi: VI,', ', id: ID,') })))
vermelho('M5 o "falta" esquece a confirmação (o roteiro automático usaria dado duvidoso) → B1 vermelho', () => faltaOk(troca(SRC.simple, '\n  if (linkFacts?.check) missing.push(ltc.pending)', '\n  if (false) missing.push(ltc.pending)')))
vermelho('M6 high também pediria confirmação (check sempre true) → B2 vermelho', () => lidoOk(troca(SRC.simple, 'check: adsV2LinkNeedsCheck(extra.confidence)', 'check: true')))
vermelho('M7 o Simple volta à frase genérica no 422 (sem body.message) → B3 vermelho', () => erroOk(troca(SRC.simple, "const blockedText = r.code === 'link_unreachable' ? adsV2LinkBlockedText(r.body, ltc, lang) : null", 'const blockedText = null')))
vermelho('M8 o cartão perde o estado pendente (sem destaque nem botão) → C1 vermelho', () => pendenteOk(cartao({ [F.comp]: troca(SRC.comp, 'const pending = !!check?.pending', 'const pending = false') })))
vermelho('M9 o cartão high ganha a moeda/estado mesmo sem moeda (HTML muda) → C2 vermelho', () => altoOk(cartao({ [F.comp]: troca(SRC.comp, "{check?.currency ? <span className=\"cur\" data-kineo=\"ads-link-currency\">{check.currency}</span> : null}", "{check ? <span className=\"cur\" data-kineo=\"ads-link-currency\">{check.currency}</span> : null}") })))
vermelho('M10 o cartão diz "a página não tem preço" mesmo quando o preço foi descartado → C3 vermelho', () => precoCartaoOk(cartao({ [F.comp]: troca(SRC.comp, "{check?.priceState === 'unsure' ? check.copy.priceUnsure : copy.read.priceNone}", '{copy.read.priceNone}') })))
vermelho('M11 o lote volta ao código de erro só (sem body.message) → D1 vermelho', () => loteOk(troca(SRC.batch, "linkNote: adsV2LinkBlockedText(r.body, LINK_TELA, 'en') ?? adsV2LinkImportError(r.code, LINK_COPY)", 'linkNote: adsV2LinkImportError(r.code, LINK_COPY)')))
vermelho('M12 uma linha nova do Simple sem a marca → desfaz/E2 vermelho', () => desfeitoOk({ ...SRC, simple: troca(SRC.simple, '  const ltc: AdsV2LinkTelaCopy = adsV2LinkTelaCopy(lang) // KINEO-ADS-LINK-TELA-1510\n', '  const ltc: AdsV2LinkTelaCopy = adsV2LinkTelaCopy(lang)\n  const extraSemMarca = 1\n') }))

console.log(`\ntest-ads-link-tela-1510: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
