// KINEO-ADS-QUADRO-STUDIO-1510 — guardião do QUADRO CURTO do Studio Ads (aba "Um anúncio", modo simples do /ads/v2) no formato do
// Studio de filmes ("Make a film", /studio). Fundador, 15/10, comparando os prints: o fundo cinza chapado, a tipografia "menos
// desenhada" e o formulário LONGO. Prova, lendo o código real:
//   A. REUSO do sistema do Studio: o quadro usa as classes do kit (.lab/.n, .pill/.pill.on, .mdlbtn, .go.ok/.go.no, .gnote) dentro
//      do escopo .stu com o STUDIO_KIT_CSS; o par de cores do Ads é EXATAMENTE o STAGE_TINT.seedance do StudioClient (lido do
//      arquivo do Studio — se um dos dois mudar sozinho, fica vermelho);
//   B. o DEGRADÊ no /ads: a raiz é .kps-page (main:has(.kps-page) pinta o degradê no ProductStage), useProductStage('ads') põe o
//      atributo, e o <style> do par do Studio vem DEPOIS do ProductStageStyles (mesma especificidade: o último vence);
//   C. a ORDEM do quadro: Produto → Seu anúncio → Estilo → botão principal, e o botão é o MESMO da barra do celular (goFromBar);
//   D. os campos OPCIONAIS moram nos cartões recolhidos (fechados por padrão): preço, contato, logo, cartão final, cor, frases, voz,
//      pessoa de IA, nível e a escolha completa de estilos — nenhum deles dentro do quadro;
//   E. o caminho do PEDIDO intocado: as funções que montam /plan, /orders, /start, /variations, /link-import e o envio de arquivos
//      byte a byte iguais à base (origin/main e4884841);
//   F. <style> por dangerouslySetInnerHTML; as 3 frases novas nas 16 línguas, lib pura;
//   M. mutantes: cada regra quebrada fica vermelha (e cada mutante prova que aplicou).
import fs from 'node:fs'
import { semMelhorias1410 } from './test-support/desfaz-melhorias-1410.mjs' // reancorado KINEO-ADS-MELHORIAS-1410
import { semDemoUniverso1410 } from './test-support/desfaz-ads-demo-universo-1410.mjs' // reancorado KINEO-ADS-DEMO-UNIVERSO-1410
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const bloco = (src, inicio) => { const i = src.indexOf(inicio); if (i < 0) return ''; let d = 0; for (let j = src.indexOf('{', i + inicio.length - 1); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1) } } return '' }
const ordem = (src, ...marcas) => { let pos = -1; for (const m of marcas) { const i = src.indexOf(m, pos + 1); if (i < 0 || i <= pos) return false; pos = i } return true }
const trecho = (src, de, ate) => { const i = src.indexOf(de); if (i < 0) return ''; const j = src.indexOf(ate, i + de.length); return j < 0 ? '' : src.slice(i, j + ate.length) }
const troca = (src, a, b) => { if (src.split(a).length !== 2) throw Error('âncora não única: ' + a.slice(0, 60)); const s = src.split(a).join(b); if (s === src) throw Error('mutante não aplicou'); return s }

const F = {
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  quadro: 'app/(dashboard)/ads/v2/AdsV2Quadro.tsx',
  copy: 'lib/ads/v2QuadroCopy.ts',
  studio: 'app/(dashboard)/studio/StudioClient.tsx',
  stage: 'components/ProductStage.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, read(f)]))

// o quadro: da raiz até o comentário dos cartões recolhidos; os cartões: cada <details> inteiro
const BOARD_START = '<div className="adv2q-board" data-kineo="ads-quadro-studio">'
const BOARD_END = '{/* KINEO-ADS-QUADRO-STUDIO-1510 — os cartões recolhidos'
const board = (s) => { const i = s.indexOf(BOARD_START); const j = s.indexOf(BOARD_END, i); return i < 0 || j < 0 ? '' : s.slice(i, j) }
const card = (s, kineo) => trecho(s, `data-kineo="${kineo}"`, '</details>')
const more = (s) => trecho(s, '<details className="adv2s-more" open={moreOpen}', '</details>')

// ═══ A. reuso do sistema do Studio ═════════════════════════════════════════════════════════════════════════════════
console.log('\nA. reuso do Studio')
const reusoOk = (simple, client, quadro, studio) => {
  const b = board(simple)
  const labs = (b.match(/<h2 id="adv2s-s[123]" className="lab"><span className="n" aria-hidden="true">/g) || []).length
  const seed = studio.match(/\n {2}seedance: \['(#[0-9A-F]{6})', '(#[0-9A-F]{6})'\],/)
  const ours = quadro.match(/export const ADS_QUADRO_STAGE_TINT: readonly \[string, string\] = \['(#[0-9A-F]{6})', '(#[0-9A-F]{6})'\]/)
  return labs === 3 &&
    /className=\{`pill\$\{adKind === 'product' \? ' on' : ''\}`\}/.test(b) && /className=\{`pill\$\{adKind === 'place' \? ' on' : ''\}`\}/.test(b) &&
    b.includes('<div className="mdlbtn adv2q-box">') &&
    /<button type="button" className=\{`go \$\{goDisabled \? 'no' : 'ok'\}`\} aria-disabled=\{goDisabled\} onClick=\{goFromBar\}>/.test(b) &&
    b.includes('<p className="gnote" role="status">') &&
    /<div className="stu adsw adv2 kps-page adv2q">/.test(client) && client.includes('<style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />') &&
    !!seed && !!ours && seed[1] === ours[1] && seed[2] === ours[2] &&
    /const STAGE_CSS = Object\.entries\(STAGE_TINT\)/.test(studio)
}
ok(reusoOk(SRC.simple, SRC.client, SRC.quadro, SRC.studio), 'A1 rótulos .lab/.n, pílulas .pill/.pill.on, caixa .mdlbtn, botão .go.ok/.go.no e .gnote do kit; raiz .stu com STUDIO_KIT_CSS; o par de cores = STAGE_TINT.seedance do StudioClient')
// medido no /studio (Edge sem cabeça, 1440×900): título 34/500/-.035em mb 4; sub 15/1.6 --muted mb 14; abas 14/400 44px 10×18 raio 10;
// rótulo 13/650/+.01em --text2; pílula 11.5/500 raio 10; caixa de texto branca raio 12 linha 1.65; botão 15/700/-.01em raio 12.
const css = SRC.quadro
const regra = (sel) => { const i = css.indexOf(sel + '{'); if (i < 0) return ''; return css.slice(i + sel.length + 1, css.indexOf('}', i)) }
const tipoOk = () => {
  const h1 = regra('html .stu.adv2.adv2q .adsw-header h1')
  const sub = regra('html .stu.adv2.adv2q .adsw-header .sub')
  const tab = regra('html .stu.adv2.adv2q .adv2f-tabs a')
  const on = regra('html .stu.adv2.adv2q .adv2f-tabs a[aria-current=page]')
  const lab = regra('html .stu.adv2.adv2q .adv2q-step h2.lab')
  const go = regra('html .stu.adv2.adv2q .adv2q-go .go')
  return /font-weight:var\(--type-title-weight,500\)/.test(h1) && /letter-spacing:-\.035em/.test(h1) && /margin:0 0 4px/.test(h1) &&
    /color:var\(--muted\)/.test(sub) && /line-height:1\.6/.test(sub) && /margin:0 0 14px/.test(sub) &&
    /min-height:44px/.test(tab) && /padding:10px 18px/.test(tab) && /border-radius:10px/.test(tab) && /font-size:14px/.test(tab) && /font-weight:400/.test(tab) &&
    /background:var\(--accent-soft\)/.test(on) && /color:var\(--accent\)/.test(on) && /border-color:var\(--border2\)/.test(on) &&
    /font-size:13px/.test(lab) && /font-weight:650/.test(lab) && /letter-spacing:\.01em/.test(lab) && /color:var\(--text2\)/.test(lab) &&
    /font-size:15px/.test(go) && /font-weight:700/.test(go) && /letter-spacing:-\.01em/.test(go) && /border-radius:12px/.test(go)
}
ok(tipoOk(), 'A2 os valores medidos do Studio (título, subtítulo, abas Filme/Clipe, rótulo, botão) estão no CSS do quadro')

// ═══ B. o degradê no /ads ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nB. o degradê do Studio no /ads')
const degradeOk = (client, quadro, stage) => {
  const iStage = client.indexOf('<ProductStageStyles />')
  const iTint = client.indexOf('<style dangerouslySetInnerHTML={{ __html: ADS_QUADRO_TINT_CSS }} />')
  const iQuadro = client.indexOf('<style dangerouslySetInnerHTML={{ __html: ADS_QUADRO_STUDIO_CSS }} />')
  return /\buseProductStage\('ads'\)/.test(client) && /className="[^"]*\bkps-page\b[^"]*\badv2q\b[^"]*"/.test(client) &&
    iStage > 0 && iTint > iStage && iQuadro > iTint &&
    /export const ADS_QUADRO_TINT_CSS = `html\[data-studio-stage="ads"\]\{--stage-a:\$\{QA\};--stage-b:\$\{QB\}\}`/.test(quadro) &&
    /const \[QA, QB\] = ADS_QUADRO_STAGE_TINT/.test(quadro) &&
    /main:has\(\.kps-page\)\{background:[^}]*var\(--stage-a\)[^}]*var\(--stage-b\)/.test(stage) &&
    /root\.dataset\.studioStage = key/.test(stage) && /html\[data-studio-stage\] aside:has\(>nav\[data-nav-surface=sidebar\]\)\{--sidebar-bg:/.test(stage)
}
ok(degradeOk(SRC.client, SRC.quadro, SRC.stage), 'B1 raiz .kps-page.adv2q + useProductStage(\'ads\'): o <main> e a barra lateral ganham o degradê; o par do Studio entra DEPOIS do ProductStageStyles')

// ═══ C. a ordem do quadro ══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. ordem do quadro')
const ordemOk = (s) => {
  const b = board(s)
  return b.length > 2000 && ordem(b, 'aria-labelledby="adv2s-s1"', '{ux.steps.product}</h2>', 'data-kineo="ads-link-import"', '<DropZone',
    'aria-labelledby="adv2s-s2"', '{qc.yourAd}</h2>', 'data-kineo="ads-kind"', 'className="adv2q-prompt"', 'data-kineo="ads-scene"', 'data-preset={p.id}',
    'aria-labelledby="adv2s-s3"', '{styleCopy.title}</h2>', '<QuadroStyleRow', 'data-kineo="ads-quadro-go"', '{planFresh ? goLabel : busy === \'plan\' ? copy.plan.planning : fc.review.planShort}') &&
    ordem(s, BOARD_START, BOARD_END, 'data-kineo="ads-quadro-level"', 'data-kineo="ads-quadro-voice"', 'data-kineo="ads-quadro-styles-all"', '<details className="adv2s-more"', 'aria-labelledby="adv2s-s4"') &&
    // o botão do quadro é o MESMO da barra do celular: mesmo rótulo, mesmo goFromBar, mesmo goDisabled
    /<MobilePreviewBar data=\{liveData\} copy=\{ux\} go=\{\{ label: planFresh \? goLabel : busy === 'plan' \? copy\.plan\.planning : fc\.review\.planShort, onClick: goFromBar, disabled: goDisabled \}\} \/>/.test(s) &&
    !s.includes('<SimpleStepper')
}
ok(ordemOk(SRC.simple), 'C1 Produto → Seu anúncio → Estilo → botão principal (o mesmo da barra do celular); depois os cartões recolhidos e a revisão')

// ═══ D. opcionais nos cartões recolhidos ═══════════════════════════════════════════════════════════════════════════
console.log('\nD. opcionais recolhidos')
const OPCIONAIS = {
  more: ['onChange={(e) => setPrice(e.target.value)} placeholder={copy.text.pricePlaceholder}', 'ref={contactInputRef}', 'ref={cardCanvasRef}', 'onChange={(e) => setCardTitle(e.target.value)}', 'chooseLogo(', 'setCardColor(', 'setOverlaysOn(', 'setNarrationOn(', '<AdsPresenterToggle', '<AdsPresenterPicker'],
  'ads-quadro-level': ['name="adv2s-tier"', '<TierIncludes', 'copy.tiers.balance'],
  'ads-quadro-voice': ['setVoiceLang(', 'data-kineo="ads-voice-ask"'],
  'ads-quadro-styles-all': ['<AdsStylePicker', 'name="adv2s-style"'],
}
const recolhidoOk = (s) => {
  const b = board(s)
  for (const [k, list] of Object.entries(OPCIONAIS)) {
    const box = k === 'more' ? more(s) : card(s, k)
    if (!box) return false
    for (const m of list) { if (!box.includes(m)) return false; if (b.includes(m)) return false }
  }
  // fechados por padrão: "Mais" e "todos os estilos" começam fechados; nível só abre sem nível marcado; voz só com a língua incerta
  return /const \[moreOpen, setMoreOpen\] = useState\(false\)/.test(s) && /const \[stylesOpen, setStylesOpen\] = useState\(false\)/.test(s) &&
    /data-kineo="ads-quadro-level" open=\{levelOpen \?\? tier === null\}/.test(s) && /data-kineo="ads-quadro-voice" open=\{voiceOpen \?\? voiceUnsure\}/.test(s) &&
    /<summary>\{copy\.text\.more\}<span className="o">· \{qc\.optional\}<\/span><\/summary>/.test(s)
}
ok(recolhidoOk(SRC.simple), 'D1 preço, contato, cartão final, logo, cor, frases, voz, pessoa de IA, nível e todos os estilos moram nos cartões recolhidos (fechados) — nenhum no quadro')

// ═══ E. o pedido intocado ═════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE. caminho do pedido')
// impressões tiradas de origin/main e4884841 (a base desta leva). As 3 primeiras batem com as de scripts/test-ads-fluxo-1310.mjs (I2).
const FN_BASE = {
  'async function ensureItemsUploaded()': '39859df0be8509676deba7d8b8e4b314882a77a33b2a885dc9c0e08c8cbbd773',
  'async function ensureCard()': 'b903d1463b135d361008438002000624c7173df713da31c6f9093f11ec732def',
  'async function ensureDraft()': '251fe620319781f8717e02ceaa11a1f2325afbbdb713152e9acea2c73d545464',
  'async function ensureResearch(': '27255cd9fb68988af6e7b4729f488bdf1a3ab7708a08358be6552f331e2d192c',
  'async function planAd()': '199ab88ea5d8b468cfbd87074de69562ccd41fc79785a157c5ac144ce3db3179',
  'async function syncCard(': '6088f9b3af109a76202f506b1c1ea3dd35994bb4e030c694763056545708d46e',
  'async function saveCopyEdit()': '95ff92d53d970a2b8fc1a5a29c648f21a633c57a7636bf6d9938fb98c713cc07',
  'async function makeAd()': '645b3aa671011f11e4bf82913275697bebfc22219b7cd63ccfad4fae2241f3d5',
  'async function makeVariations()': 'dd04061268b46a5c7697800c780575d4f957ce0d992609895d014848d1c5a03d',
  'async function importLink(': '5b71577ee6635f19f11ab197a09ac0b5ceafea8fc5c93f3d2bb6daec9518678d',
  'async function pasteLink()': 'e5273db6f61884d4819e1e788513be0fa0667c8ef9dd892e120534bdcc1b67b8',
  'async function chooseScript(': '5063727f1969a5f41cf944fb6d4f1a085fa47b34e3565911ce3d4320d6174eae',
  'async function addFilesNow(': '954ee33a72821f75ce0592823eae567ebc415072fe6dc8de6126b66e8bab33bb',
  'async function chooseLogo(': 'c3b03b4b912e10ec1575bbf304e21293cc1b4e8a155afe94a517a325d44bb0d4',
  'function goFromBar()': 'd3eb048cecde0cd478dbef168198f4cd29496b0c2697f1b755687ce2dd5682d5',
  'function manualPlan()': '39121993314224998061bfddcc375510f09c6740f93bc09bf06ceb0085cec8c7',
}
// reancorado KINEO-ADS-MELHORIAS-1410 — a tela simples ganhou o formato (4:5/1:1): o corpo do /plan, a assinatura do plano, o estilo
// efetivo e o recorte/upload mudaram em linhas MARCADAS. semMelhorias1410 (scripts/test-support/desfaz-melhorias-1410.mjs) as devolve ao
// texto EXATO de antes, e a regra de sempre vale sobre ele; as linhas novas são provadas em scripts/test-ads-formatos-1410.mjs.
const pedidoOk = (s0, s = semMelhorias1410(semDemoUniverso1410(F.simple, s0))) => // reancorado KINEO-ADS-DEMO-UNIVERSO-1410 — a demo de 14/10 sai antes (pronúncia no rascunho, língua do link, a língua da página lida no importLink); prova em test-ads-demo-universo-1410
  Object.entries(FN_BASE).every(([f, h]) => sha(bloco(s, f)) === h) &&
  // as entradas do pedido: a chave do rascunho, a assinatura do plano e o nível/estilo/voz que vão no corpo, como na base
  s.includes("const draftKey = JSON.stringify({ text: sentence, scene: sceneFinal, kind: adKind, price: priceT, contact: contactT, overlays: overlaysOn, voice: narrationOn, lang: spoken, tier, link: linkRead })") &&
  s.includes("const style: AdsV2StyleChoice = ADS_V2_STYLES_PUBLIC ? styleChoice ?? styleSuggested : 'none'") &&
  s.includes("const spoken: NarrationLanguage = voiceLang ?? narrationLanguage(detected) ?? shortLang ?? narrationLanguage(lang) ?? 'en'")
ok(pedidoOk(SRC.simple), 'E1 /orders, /plan, /start, /variations, /link-import, envio de fotos/logo, cartão final e o botão da barra byte a byte iguais à base (e4884841)')
// os 3 estados novos só abrem/fecham cartões: nunca aparecem em função de pedido nem nas assinaturas
const estadoSoTela = (s) => ['stylesOpen', 'levelOpen', 'voiceOpen', 'qc.'].every((k) => Object.keys(FN_BASE).every((f) => !bloco(s, f).includes(k)) && !/const (draftKey|baseSig|planSig|cardSig) = [^\n]*(stylesOpen|levelOpen|voiceOpen)/.test(s))
ok(estadoSoTela(SRC.simple), 'E2 os estados novos (stylesOpen/levelOpen/voiceOpen) e as frases novas não entram em pedido nem em assinatura')
// a fileira rápida de estilos chama o MESMO setStyleChoice da escolha completa
ok(/<QuadroStyleRow value=\{style\} suggested=\{styleSuggested\} onChange=\{setStyleChoice\}/.test(SRC.simple) && /onChange=\{setStyleChoice\}\n\s+disabled=\{locked\}\n\s+copy=\{styleCopy\}/.test(SRC.simple), 'E3 a fileira de 5 estilos e a escolha completa mexem no MESMO setStyleChoice')

// ═══ F. estilo e frases ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nF. <style> e frases')
ok(!/<style>\s*\{\s*ADS_QUADRO/.test(SRC.client) && (SRC.client.match(/<style dangerouslySetInnerHTML=\{\{ __html: ADS_QUADRO_(TINT|STUDIO)_CSS \}\} \/>/g) || []).length === 2, 'F1 os <style> do quadro entram por dangerouslySetInnerHTML (">" no seletor quebra a hidratação)')
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const copyOk = (src) => !/^\s*import\s(?!type)/m.test(src) && LANGS.every((l) => {
  const m = src.match(new RegExp(`\\n  ${l}: \\{ yourAd: '([^']+)', seeAll: '([^']+)', optional: '([^']+)' \\},`))
  return m && m[2].includes('{n}') && m[1].trim() && m[3].trim()
})
ok(copyOk(SRC.copy), 'F2 as 3 frases novas nas 16 línguas (o "Ver todos" com {n}); lib pura (só import type)')
ok(/^'use client'/.test(SRC.quadro) && [...SRC.quadro.matchAll(/^import[\s\S]*?from '([^']+)'/gm)].every((m) => m[1] === '@/lib/ads/v2Styles') && !/fetch\(|\/api\//.test(SRC.quadro), 'F3 AdsV2Quadro.tsx é cliente, só importa a lib pura de estilos e não chama rota')

// ═══ M. mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes')
const vermelho = (nome, fn) => { let r; try { r = fn() } catch (e) { console.log('       (mutante: ' + e.message + ')'); r = true } ok(r === false, nome) }
vermelho('M1 a pessoa de IA sobe para dentro do quadro → vermelho', () => recolhidoOk(troca(SRC.simple, '            <div className="adv2q-go" data-kineo="ads-quadro-go">', '            <AdsPresenterToggle name="x" />\n            <div className="adv2q-go" data-kineo="ads-quadro-go">')))
vermelho('M2 o par de cores sai do verde-azulado do Studio → vermelho', () => reusoOk(SRC.simple, SRC.client, troca(SRC.quadro, "['#10B981', '#06B6D4']", "['#2563EB', '#F43F5E']"), SRC.studio))
vermelho('M3 o <style> do par do Studio vai para ANTES do ProductStageStyles (o par do Ads venceria) → vermelho', () => degradeOk(troca(troca(SRC.client, '      <style dangerouslySetInnerHTML={{ __html: ADS_QUADRO_TINT_CSS }} />', ''), '      <ProductStageStyles />', '      <style dangerouslySetInnerHTML={{ __html: ADS_QUADRO_TINT_CSS }} />\n      <ProductStageStyles />'), SRC.quadro, SRC.stage))
vermelho('M4 o planAd muda um campo do corpo do /plan → vermelho', () => pedidoOk(troca(SRC.simple, "body: { mode: 'simple', order_id: orderId, sector,", "body: { mode: 'simple', order_id: orderId, sector: 'other',")))
vermelho('M5 o botão principal desce para depois do cartão do nível → vermelho', () => {
  const go = trecho(SRC.simple, '            <div className="adv2q-go" data-kineo="ads-quadro-go">', '            </div>\n')
  const s1 = troca(SRC.simple, go, '')
  return ordemOk(troca(s1, '            <details className="adv2q-opt" data-kineo="ads-quadro-level"', go + '            <details className="adv2q-opt" data-kineo="ads-quadro-level"'))
})
vermelho('M6 o preço volta para o quadro (fora de "Mais opções") → vermelho', () => recolhidoOk(troca(SRC.simple, '              <label className="adsw-f adv2q-text">', '              <input onChange={(e) => setPrice(e.target.value)} placeholder={copy.text.pricePlaceholder} />\n              <label className="adsw-f adv2q-text">')))
vermelho('M7 a raiz perde o .kps-page (sem degradê) → vermelho', () => degradeOk(troca(SRC.client, '<div className="stu adsw adv2 kps-page adv2q">', '<div className="stu adsw adv2 adv2q">'), SRC.quadro, SRC.stage))
vermelho('M8 uma língua perde o {n} do "Ver todos" → vermelho', () => copyOk(troca(SRC.copy, "seeAll: 'Ver todos os {n}'", "seeAll: 'Ver todos'")))

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
