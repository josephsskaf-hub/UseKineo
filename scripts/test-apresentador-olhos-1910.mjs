// KINEO-APRESENTADOR-OLHOS-1910 — guardião da entrega "olhos abertos" do apresentador v2 do Studio Ads (validação dos 12 apresentadores, 19/10:
// docs/VALIDACAO-12-APRESENTADORES-2026-10-19.md — só 4 aprovados; os 8 reprovados por UM defeito: olhos fechados falando, "saboreando o perfume").
// Roda com `node scripts/test-apresentador-olhos-1910.mjs` da raiz do repo, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo typescript
// do repo (o texto pelo carregador offline da casa). Fora da TRAVA 8.2.
//
// O que prova (1 seção por item):
//   O  ATUAÇÃO: as 2 variantes (mão livre e mãos paradas) COMEÇAM com "eyes open and looking into the lens the whole time; only quick, brief blinks", levam o
//      texto da R3 INTACTO (byte a byte o da base) e terminam com "avoid: closed eyes, eyes shut, squinting, savoring, head tilted back, toothy grin"; a linha
//      planejada antes (texto da R3) também sai com os olhos abertos; o negative de reserva leva a lista; o motor segue sem campo de negative; nada de "warm";
//   T  ROTEIRO: a fala do apresentador v2 não é sensorial — a régua acha as marcas nas 12 falas REAIS da validação e não acha nada em fala de apresentador
//      nem nos fechos da casa; o pedido de texto ganha a regra (e o produto perde o "detalhe sensorial") SÓ com talk; a régua recusa com talk e aceita sem;
//      o /plan só liga isso no caminho do v2; a fala curta não amputa (piso 19; voz sem speed até 8% fica; corte nunca abaixo do piso);
//   E  TELA DE ESCOLHA: cliente vê só os 4 aprovados; interna vê os 12 com "em teste"; o servidor troca id oculto e sorteio oculto; interruptor único;
//   V  VOZ: a amostra da tela é a voz do anúncio naquela língua (PT mulher = Portuguese_ConfidentWoman, arquivo existe); voice_id nos eventos da montagem;
//   D  desfaz exato + marca em toda linha + encadeamento (a cabeça da cadeia do Close real tira esta camada primeiro) + novos + assunto dos commits;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semUgcAjustes2010 } from './test-support/desfaz-ugc-ajustes-2010.mjs' // reancorado KINEO-UGC-AJUSTES-2010 — a camada mais nova (ajustes do UGC, 20/10) sai do disco antes das provas desta entrega
import { semApresentadorOlhos1910, desfazApresentadorOlhos1910, APRESENTADOR_OLHOS_1910_ARQUIVOS, APRESENTADOR_OLHOS_1910_NOVOS, APRESENTADOR_OLHOS_1910_BASE, MARCA_APRESENTADOR_OLHOS_1910, ACRESCIMOS_APRESENTADOR_OLHOS_1910 } from './test-support/desfaz-apresentador-olhos-1910.mjs'
import { semCloseRealLegendaCorte1910 } from './test-support/desfaz-close-real-legenda-corte-1910.mjs'
import { desfazApresentadorV2Ajuste3_1710 } from './test-support/desfaz-apresentador-v2-ajuste-3-1710.mjs'
import { semHomeCardsBotoes2010, diffSoHomeCardsBotoes2010 } from './test-support/desfaz-home-cards-botoes-2010.mjs' // reancorado KINEO-HOME-CARDS-BOTOES-2010 — os botões distintos dos cards de anúncio (camada mais nova) saem do disco e do diff antes das provas D2/D4
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT) // o carregador offline resolve '@/' a partir do cwd
const MARCA = 'KINEO-APRESENTADOR-OLHOS-1910'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(semUgcAjustes2010(semAfiliado50_2610(p, readFileSync(join(ROOT, p), 'utf8')), p)) // o arquivo VIVO (esta é a camada mais nova) · reancorado KINEO-UGC-AJUSTES-2010 — os ajustes do UGC de 20/10 (Jade e Robert aprovados, sub-teto, probe, folga de 23) saem primeiro, em memória (provados em scripts/test-ugc-ajustes-2010.mjs)
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const B = APRESENTADOR_OLHOS_1910_BASE
const base = (p) => { try { return lf(git('show', `${B}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = { v2: 'lib/ads/v2PresenterV2.ts', brief: 'lib/ads/v2Brief.ts', plan: 'lib/ads/v2PlanCore.ts', advance: 'lib/ads/v2Advance.ts', presenter: 'lib/ads/v2Presenter.ts', picker: 'components/ads/AdsPresenterPicker.tsx', page: 'app/(dashboard)/ads/v2/page.tsx', simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx', fit: 'lib/ads/v2CopyFit.ts' }

// ── carregador simples (lib pura, só `import type`): transpila TS → CJS; `text` = fonte (mutante ou viva) ─────────────────────────────────────
function loadPure(text) {
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', 'require', js)(module, module.exports, (s) => { throw new Error('import inesperado: ' + s) })
  return module.exports
}
const V2 = loadPure(rd(F.v2))
const V2BASE = loadPure(base(F.v2))
const PRES = createOfflineLoader({})(F.presenter)
const LIB = PRES.ADS_V2_PRESENTER_LIBRARY
const JSONS = Object.fromEntries(['lib/ui/refinementCopy.json'].map((rel) => ['@/' + rel, JSON.parse(rd(rel))]))
const BR = (over = {}) => createOfflineLoader({ mocks: { '@/lib/openai': { openai: {} }, ...JSONS }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })(F.brief)
const BRIEF = BR()
const FIT = createOfflineLoader({ mocks: { ...JSONS } })(F.fit)

// as 12 falas REAIS da validação (ads_v2_orders.plan.narration dos 12 pedidos, lidas em 20/10)
const FALAS_VALIDACAO = [
  'This is LUME — a unique perfume that captivates with its enchanting aroma. Discover your signature scent today.', // kenji (aprovado, mas "scent"/"aroma" sem verbo sensorial → ver abaixo)
  'Conheça Perfume Atheeri. Este é um perfume que traz uma experiência única. Sinta a essência marcante e envolvente.',
  'Conheça Perfume LUME — uma experiência única. Sinta a essência que envolve e encanta. Descubra o seu aroma perfeito.',
  'Conheça Perfume LUME. Um aroma envolvente que encanta os sentidos. Descubra a essência única de Perfume LUME.',
  'Conheça Perfume LUME. Uma experiência única de fragrância que encanta os sentidos. Descubra e sinta a diferença.',
  'This is LUME — a captivating perfume that envelops you in an enchanting scent. Experience the allure today.',
  'Conheça Perfume LUME. É uma experiência única que encanta os sentidos e proporciona um aroma especial para você. Descubra!',
  'Conheça Perfume LUME. Uma experiência única em fragrâncias que encantam. Descubra a essência que toca seus sentidos.',
  "Here's LUME — captivating perfumes that evoke emotion. Discover your signature fragrance.",
  'This is LUME — a captivating perfume that enchants the senses with its alluring fragrance. Experience the essence today.',
  'Conheça Perfume LUME, uma fragrância única que encanta os sentidos. Experimente a suavidade e a beleza de Perfume LUME.',
  'Conheça Perfume LUME. É uma experiência única que encanta os sentidos. Sinta a essência e descubra o seu aroma.',
]
// as que os 8 reprovados falaram (as do Kenji/Rahul/Amara aprovados ficam de fora desta conta)
const REPROVADAS = [FALAS_VALIDACAO[2], FALAS_VALIDACAO[3], FALAS_VALIDACAO[4], FALAS_VALIDACAO[5], FALAS_VALIDACAO[7], FALAS_VALIDACAO[9], FALAS_VALIDACAO[10], FALAS_VALIDACAO[11]]
const BOAS = [
  'Esse é o LUME, um perfume para o dia a dia. Leve na bolsa e use no trabalho. Garanta o seu hoje no site.',
  'This is LUME, an everyday perfume for work and weekends. It fits in any bag. Get yours today.',
  'Este es LUME, un perfume para todos los días. Cabe en tu bolso. Consíguelo hoy.',
  'Perfume LUME: feito para quem quer um perfume marcante no trabalho. Peça o seu agora.',
]

// ═══ O. a atuação ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('O. atuação: olhos abertos primeiro, a R3 intacta, o que evitar no fim (as 2 variantes)')
const EYES = 'eyes open and looking into the lens the whole time; only quick, brief blinks'
const AVOID = 'closed eyes, eyes shut, squinting, savoring, head tilted back, toothy grin'
const provaAtuacao = (v2 = V2) => {
  const r3 = V2BASE.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT, r3s = V2BASE.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL
  const both = [[v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT, r3], [v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL, r3s]]
  return both.every(([p, old]) => typeof p === 'string' && p.startsWith(EYES + '; ') && p.includes(old) && p.endsWith('; avoid: ' + AVOID) && p === `${EYES}; ${old}; avoid: ${AVOID}` && !/\bwarm\b/i.test(p)) &&
    v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_R3 === r3 && v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL_R3 === r3s &&
    v2.adsV2PresenterV2Performance(true) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT && v2.adsV2PresenterV2Performance(false) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL && v2.adsV2PresenterV2Performance(null) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL
}
const provaLinhaAntiga = (v2 = V2) => {
  const of = v2.adsV2PresenterV2PerformanceOf
  return of(V2BASE.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT && of(V2BASE.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL &&
    of(v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT && of(v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL &&
    of(PRES.ADS_V2_PRESENTER_PERFORMANCE_PROMPT) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL && of(null) === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL && of('qualquer') === v2.ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_STILL
}
await check('O1 as 2 variantes começam com os olhos abertos, levam o texto da R3 byte a byte (o da base) e terminam com "avoid: …"; sem "warm"', () => provaAtuacao())
await check('O2 a linha planejada ANTES (texto da R3) sai com os olhos abertos (mão livre → mão livre; mãos paradas e a de 09/10 → mãos paradas)', () => provaLinhaAntiga())
await check('O3 o negative de reserva leva a lista; o motor segue SEM campo de negative (o corpo do Kling não muda); o avanço manda adsV2PresenterV2PerformanceOf(row.prompt) ao motor', () => {
  const inp = { image_url: 'https://x/y.png', audio_url: 'https://x/a.mp3', prompt: 'p' }
  return V2.ADS_V2_PRESENTER_V2_NEGATIVE_PROMPT === `${V2BASE.ADS_V2_PRESENTER_V2_NEGATIVE_PROMPT}, ${AVOID}` && V2.ADS_V2_PRESENTER_V2_NEGATIVE_SUPPORTED === false && V2.adsV2PresenterV2AvatarInput(inp) === inp &&
    V2.adsV2PresenterV2AvatarInput(inp, true).negative_prompt.endsWith(AVOID) && rd(F.advance).includes('prompt: pv ? pv.lib.adsV2PresenterV2PerformanceOf(row.prompt) : videoPromptOf(order, row)')
})

// ═══ T. o roteiro do apresentador ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nT. roteiro: fala de apresentador, sem verbos sensoriais, sem sair curta')
const provaMarcas = (b = BRIEF) => {
  const m = b.presenterTalkMarks
  const fechos = Object.entries(FIT.ADS_V2_NAME_CLOSES).flatMap(([, l]) => l.map((c) => c.t.split('{name}').join('LUME'))).concat(Object.values(FIT.ADS_V2_CLOSE_REAL_FULL_CLOSES ?? {}).flat().map((c) => c.t))
  return REPROVADAS.every((t) => m(t).length > 0) && BOAS.every((t) => m(t).length === 0) && fechos.every((t) => m(t).length === 0) &&
    ['sinta', 'cheire', 'envolva-se', 'transporta', 'saboreie', 'feche os olhos', 'os sentidos', 'smell', 'savor', 'close your eyes', 'envelops', 'experience the', 'siente', 'envuélvete', 'cierra los ojos', 'déjate llevar'].every((w) => m(`Uau. ${w} agora.`).length > 0) &&
    m('desenvolvido para o dia a dia') .length === 0 && m(null).length === 0
}
await check('T1 a régua acha marca sensorial nas 8 falas REAIS dos reprovados e em cada verbo pedido (en/pt/es); nada em fala de apresentador, nos fechos da casa nem em "desenvolvido"', () => provaMarcas())
const BRIEF_LUME = { business: 'Perfume LUME', offer: null, contact: null, extra: {} }
const provaPedido = (b = BRIEF) => {
  const on = b.buildV2CopyMessages(BRIEF_LUME, 'Portuguese', { maxWords: 21, narration: true, ad: { product: true, presenter: true, talk: true } }).system
  const off = b.buildV2CopyMessages(BRIEF_LUME, 'Portuguese', { maxWords: 21, narration: true, ad: { product: true, presenter: true } }).system
  return on.includes(b.ADS_V2_PRESENTER_TALK_RULE) && on.includes(b.ADS_V2_PRODUCT_TALK_RULE) && !on.includes(b.ADS_V2_PRODUCT_NARRATION_RULE) && !/sensory detail/.test(on) &&
    !off.includes(b.ADS_V2_PRESENTER_TALK_RULE) && off.includes(b.ADS_V2_PRODUCT_NARRATION_RULE) && !off.includes(b.ADS_V2_PRODUCT_TALK_RULE) && off === on.split('\n').filter((l) => l !== b.ADS_V2_PRESENTER_TALK_RULE).join('\n').replace(b.ADS_V2_PRODUCT_TALK_RULE, b.ADS_V2_PRODUCT_NARRATION_RULE)
}
await check('T2 o pedido de texto: com talk, a regra do apresentador entra e o produto perde o "detalhe sensorial"; sem talk, o pedido de sempre', () => provaPedido())
const provaRegua = (b = BRIEF) => {
  const raw = (n) => JSON.stringify({ narration: n, overlays: ['Perfume LUME', 'Para o dia a dia'], sector: 'store' })
  const sens = 'Conheça Perfume LUME. Uma experiência única que encanta os sentidos e você vai amar. Sinta a essência e descubra o seu aroma hoje.'
  const boa = 'Esse é o Perfume LUME, feito para o dia a dia. Cabe na bolsa e vai do trabalho ao jantar. Garanta o seu hoje.'
  const opt = (talk) => ({ maxWords: 30, narration: true, ad: { product: false, presenter: true, ...(talk ? { talk: true } : {}) } })
  const a = b.checkV2Copy(raw(sens), BRIEF_LUME, opt(true)), c = b.checkV2Copy(raw(sens), BRIEF_LUME, opt(false)), d = b.checkV2Copy(raw(boa), BRIEF_LUME, opt(true))
  return a.ok === false && a.why.some((w) => w.includes('sensory') && w.includes('"sinta"')) && c.ok === true && d.ok === true
}
await check('T3 a régua: com talk, a fala sensorial volta para correção (o motivo cita "sinta"); sem talk, a mesma fala passa; fala de apresentador passa com talk', () => provaRegua())
const provaRotaTalk = (plan = rd(F.plan), brief = rd(F.brief)) =>
  plan.includes("      ...(v2Words ? { presenterTalk: true } : {}),") && /presenterTalkMarks\(extracted\.copy\.narration\)/.test(plan) && /presenter_talk_left/.test(plan) &&
  brief.includes('...(args.presenter === true && args.presenterTalk === true ? { talk: true } : {})') &&
  brief.includes("const variantRelaxedOpts = relaxTalk && relaxedOpts.ad ? { ...relaxedOpts, ad: { ...relaxedOpts.ad, talk: true } } : relaxedOpts") &&
  brief.includes('if (!checked.ok && (relaxNames || relaxShop || relaxTalk)) {') && !/closeReal[^\n]*presenterTalk|presenterTalk[^\n]*closeReal/.test(plan)
await check('T4 o /plan liga a fala de apresentador SÓ com v2Words (o caminho do v2; Close real e o resto fora); sobrou depois da correção = aceita e vai ao evento; as versões B/C não afrouxam', () => provaRotaTalk())
const provaCurta = (v2 = V2) => {
  const w = v2.adsV2PresenterV2Words(30)
  const rahul = "Here's LUME — captivating perfumes that evoke emotion. These fragrances are crafted for those who appreciate elegance. Discover your signature fragrance."
  const fitR = v2.adsV2PresenterV2VoiceFit({ seconds: 10.762, text: rahul, canSpeed: false })
  const t21 = 'Esse é o LUME, um perfume para o dia a dia. Ele cabe na bolsa e vai do trabalho ao jantar sem pesar. Garanta o seu.'
  const fitLong = v2.adsV2PresenterV2VoiceFit({ seconds: 13, text: t21, canSpeed: false })
  const t30 = 'Esse é o LUME, um perfume para o dia a dia. Ele foi feito para quem trabalha fora e quer estar pronto o dia inteiro sem pensar nisso. Cabe na bolsa. Garanta o seu hoje.'
  const fit30 = v2.adsV2PresenterV2VoiceFit({ seconds: 14.36, text: t30, canSpeed: true })
  const words = (s) => s.split(/\s+/).filter(Boolean).length
  return v2.ADS_V2_PRESENTER_V2_MIN_WORDS === 19 && v2.ADS_V2_PRESENTER_V2_MAX_WORDS === 21 && w.min === 19 && w.max === 21 && v2.adsV2PresenterV2Words(15).min === 15 &&
    fitR.action === 'ok' && fitLong.action === 'ok' && (fit30.action === 'ok' || words(fit30.text) >= 19) &&
    v2.adsV2PresenterV2VoiceFit({ seconds: 11.4, text: rahul, canSpeed: false }).action !== 'speed' && v2.adsV2PresenterV2VoiceFit({ seconds: 10.9, text: t21, canSpeed: true }).action === 'speed'
}
await check('T5 a fala não sai curta: piso 19 (régua 19–21); a voz sem speed até 8% acima do alvo fica (o caso do Rahul: 10,76 s não perde a frase); o corte nunca deixa menos de 19 palavras', () => provaCurta())

// ═══ E. a tela de escolha ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE. tela de escolha: cliente vê só os 4 aprovados; interna vê os 12 ("em teste"); o servidor confere')
const provaVisivel = (v2 = V2) => {
  const ids = LIB.map((p) => p.id)
  const cliente = ids.filter((id) => v2.adsV2PresenterV2Visible(id, false)), casa = ids.filter((id) => v2.adsV2PresenterV2Visible(id, true))
  const teste = ids.filter((id) => v2.adsV2PresenterV2Testing(id))
  return v2.ADS_V2_PRESENTER_V2_APPROVED_ONLY === true && JSON.stringify([...v2.ADS_V2_PRESENTER_V2_APPROVED].sort()) === JSON.stringify(['amara', 'kenji', 'rahul', 'sofia']) &&
    JSON.stringify(cliente.sort()) === JSON.stringify(['amara', 'kenji', 'rahul', 'sofia']) && casa.length === 12 && teste.length === 8 && !teste.some((id) => cliente.includes(id)) &&
    ids.every((id) => v2.adsV2PresenterV2Visible(id, false, false)) && !v2.adsV2PresenterV2Testing('jade', false) && !v2.adsV2PresenterV2Visible(null, true) && v2.ADS_V2_PRESENTER_V2_APPROVED.every((id) => ids.includes(id))
}
await check('E1 interruptor único + lista em código: cliente = sofia, amara, rahul, kenji; interna = os 12; os 8 "em teste"; desligado = os 12 para todos', () => provaVisivel())
const provaTrava = (v2 = V2) => {
  const g = (presenterId, person, internal, only) => v2.adsV2PresenterV2GatePick({ presenterId, person, internal, library: LIB }, only)
  const idx = (id) => LIB.findIndex((p) => p.id === id)
  const women = ['sofia', 'amara'], men = ['rahul', 'kenji']
  const okWoman = ['jade', 'clara', 'hannah', 'chloe', 'lucia', 'yasmin'].every((id) => { const r = g(id, idx(id), false); return r.swapped && women.includes(r.presenterId) && r.person === idx(r.presenterId) })
  const okMan = ['marcus', 'robert'].every((id) => { const r = g(id, idx(id), false); return r.swapped && men.includes(r.presenterId) })
  const sorteio = [0, 1, 2, 3, 4, 5].every((k) => { const r = g(null, k, false); return r.presenterId === null && women.includes(LIB[r.person].id) && (r.swapped === !women.includes(LIB[k].id)) })
  const iguais = ['sofia', 'amara', 'rahul', 'kenji'].every((id) => !g(id, idx(id), false).swapped) && !g('jade', 3, true).swapped && !g('jade', 3, false, false).swapped && !g(null, 1, true).swapped
  return okWoman && okMan && sorteio && iguais
}
await check('E2 trava do servidor: cliente com id oculto → aprovado do MESMO gênero; sorteio oculto → Sofia ou Amara (sem id); aprovado, conta interna e interruptor desligado = igual', () => provaTrava())
const provaTelaFonte = (picker = rd(F.picker), page = rd(F.page), plan = rd(F.plan)) =>
  /const all = useContext\(AdsPresenterAllContext\)/.test(picker) && picker.includes('ADS_V2_PRESENTER_LIBRARY.filter((p) => adsV2PresenterV2Visible(p.id, all) && (cat === \'all\' || p.tag === cat))') &&
  picker.includes('adsV2PresenterV2Testing(p.id) ? <span data-kineo="ads-presenter-testing"') && />em teste</.test(picker) && picker.includes('export const AdsPresenterAllContext = createContext(false)') &&
  picker.includes('if (value && !adsV2PresenterV2Visible(value, all)) onChange(null)') &&
  page.includes('<AdsPresenterAllProvider all={isAdsInternalEmail(user.email)}><AdsV2Client ') && page.includes('</AdsPresenterAllProvider>') &&
  plan.includes("presenterV2Lib.adsV2PresenterV2GatePick({ presenterId: presenter.presenterId ?? null, person: presenter.person, internal: reason === 'internal', library: ADS_V2_PRESENTER_LIBRARY })") &&
  plan.indexOf('adsV2PresenterV2GatePick(') < plan.indexOf('const v2Entry = adsV2PresenterById(presenter.presenterId)')
await check('E3 a tela lê "interna?" do servidor (page.tsx → AdsPresenterAllProvider), filtra pelos aprovados, marca "em teste", desfaz escolha oculta; o /plan aplica a trava antes do v2', () => provaTelaFonte())

// ═══ V. a voz ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nV. voz: a amostra da tela = a voz do anúncio; voice_id no evento')
const provaAmostra = (v2 = V2) => {
  const by = (id) => LIB.find((p) => p.id === id)
  const file = v2.ADS_V2_PRESENTER_V2_VOICE_SAMPLES.Portuguese_ConfidentWoman
  const b = existsSync(join(ROOT, 'public', file)) ? readFileSync(join(ROOT, 'public', file)) : null
  const mp3 = !!b && (b.subarray(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) && b.length <= 120 * 1024 && b.length >= 8000
  // toda voz da tabela com voice id tem amostra, e a amostra que a tela toca é ELA em cada língua/gênero da tabela
  const tabela = Object.entries(v2.ADS_V2_PRESENTER_V2_VOICES).every(([lang, row]) => ['woman', 'man'].every((g) => {
    const v = row[g]; const e = LIB.find((p) => p.gender === g)
    const s = v2.adsV2PresenterV2SampleFor(e, lang)
    return v.engine === 'minimax' ? (s === v2.ADS_V2_PRESENTER_V2_VOICE_SAMPLES[v.voiceId] && !!s && existsSync(join(ROOT, 'public', s))) : s === e.voiceSample
  }))
  return mp3 && tabela && LIB.filter((p) => p.gender === 'woman').every((p) => v2.adsV2PresenterV2SampleFor(p, 'pt') === file) &&
    v2.adsV2PresenterV2SampleFor(by('rahul'), 'pt') === by('rahul').voiceSample && v2.adsV2PresenterV2SampleFor(by('sofia'), 'en') === by('sofia').voiceSample &&
    v2.adsV2PresenterV2SampleFor(by('sofia'), null) === by('sofia').voiceSample && v2.adsV2PresenterV2SampleFor(null, 'pt') === null
}
await check('V1 a amostra da tela é a voz do anúncio: PT mulher = Portuguese_ConfidentWoman (arquivo MP3 existe); toda voz da tabela com voice id tem amostra; o resto = a voz do retrato (= a do anúncio)', () => provaAmostra())
const provaAmostraTela = (picker = rd(F.picker), simple = rd(F.simple)) =>
  picker.includes('(p && !broken[p.id] ? adsV2PresenterV2SampleFor(p, voiceLanguage) : null)') &&
  simple.includes("const presenterV2Voice: string | null = adsV2PresenterV2Eligible({ on: adsV2PresenterV2On(false), tier: tier ?? '', format, style: style === 'none' ? null : style }) ? spoken : null") &&
  simple.includes('voiceLanguage={presenterV2Voice}') && simple.indexOf('const presenterV2Voice') > simple.indexOf('  const spoken: NarrationLanguage = ')
await check('V2 a tela simples passa a língua da voz (a MESMA que vai ao /plan) só quando o v2 vale (Comercial, 9:16, sem estilo); o seletor toca a amostra dela', () => provaAmostraTela())
const provaVoiceId = (v2 = V2, adv = rd(F.advance)) => {
  const id = v2.adsV2PresenterV2VoiceIdOf
  return id('pt', 'woman', { engine: 'minimax' }) === 'minimax:Portuguese_ConfidentWoman' && id('pt', 'woman', { engine: 'eleven', voice: 'Aria' }) === 'minimax:Portuguese_ConfidentWoman' &&
    id('en', 'man', { engine: 'eleven', voice: 'Brian' }) === 'eleven:Brian' && id('pt', 'man', { engine: 'eleven', voice: 'Daniel' }) === 'eleven:Daniel' && id('en', 'woman', { engine: 'minimax' }) === 'minimax:default' && id('xx', 'woman', null) === 'minimax:default' &&
    adv.includes('async function adsV2NarrationVoiceId(order: AdsV2OrderRow): Promise<string> {') && adv.includes('  const voiceId = await adsV2NarrationVoiceId(order)') &&
    adv.includes('metadata: { order_id: order.id, creatomate_render_id: renderId, voice_id: voiceId, shots: montageShots.length, ') && adv.includes(', voice_seconds: voiceSeconds, voice_id: voiceId, music_source:') &&
    adv.indexOf('  const voiceId = await adsV2NarrationVoiceId(order)') < adv.indexOf("    name: 'ads_v2_assembling',")
}
await check('V3 voice_id gravado no ads_v2_assembling e no ads_v2_close_real_assembled, pela mesma árvore da voz (tabela por língua+gênero → retrato → MiniMax padrão)', () => provaVoiceId())

// ═══ D. desfaz ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, novos')
const TOPO = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)[0] || 'HEAD' // reancorado KINEO-HOME-CARDS-BOTOES-2010 — D2/D4 medem da base até o ÚLTIMO commit com a marca desta entrega; camadas mais novas por cima não contam
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-apresentador-olhos-1910.mjs), é EXATAMENTE a base ${B.slice(0, 9)}; os novos existem e não existiam lá`, () =>
  APRESENTADOR_OLHOS_1910_ARQUIVOS.length >= 8 && APRESENTADOR_OLHOS_1910_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(semApresentadorOlhos1910(rd(f), f)) === b }) &&
  APRESENTADOR_OLHOS_1910_NOVOS.length === 4 && APRESENTADOR_OLHOS_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && statSync(join(ROOT, f)).size > 0 && base(f) === null) && MARCA_APRESENTADOR_OLHOS_1910 === MARCA)
await check('D2 toda linha nova traz a marca (o diff contra a base só toca os arquivos da lista e os novos); a marca não contém a de outra camada; nada de cobrança, motor ou preço', () => {
  const tocados = git('diff', '--name-only', B, TOPO).trim().split('\n').concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter((f) => f && !diffSoHomeCardsBotoes2010(git('diff', '-U0', '--no-color', 'HEAD', '--', f), f))).filter(Boolean) // reancorado KINEO-HOME-CARDS-BOTOES-2010 — até o TOPO; o não commitado só da camada nova fica fora
  const permitidos = new Set([...APRESENTADOR_OLHOS_1910_ARQUIVOS, ...APRESENTADOR_OLHOS_1910_NOVOS])
  const linhas = APRESENTADOR_OLHOS_1910_ARQUIVOS.every((f) => { const b = new Set(base(f).split('\n')); return lf(semHomeCardsBotoes2010(rd(f), f)).split('\n').every((l) => b.has(l) || l.includes(MARCA)) }) // reancorado KINEO-HOME-CARDS-BOTOES-2010 — o disco sem a camada nova
  return tocados.length > 0 && tocados.every((f) => permitidos.has(f)) && linhas && !/KINEO-APRESENTADOR-V2|KINEO-CLOSE-REAL/.test(MARCA) &&
    !tocados.some((f) => /engineCost|pricing|lib\/credits\/|v2Billing|v2Tiers|v2Engines|v2StartCore|ttsFallback|lib\/compose\.ts|lib\/avatar\//.test(f))
})
await check('D3 encadeamento: a cabeça da cadeia do Close real (e, por ela, o apresentador v2 e o ajuste 3) tira esta camada PRIMEIRO; sem a marca, fora da lista e null passam igual', () => {
  return APRESENTADOR_OLHOS_1910_ARQUIVOS.filter((f) => f.startsWith('lib/')).every((f) => {
    const raw = readFileSync(join(ROOT, f), 'utf8'), semEste = semApresentadorOlhos1910(raw, f)
    return semCloseRealLegendaCorte1910(raw, f) === semCloseRealLegendaCorte1910(semEste, f) && desfazApresentadorV2Ajuste3_1710(f, raw) === desfazApresentadorV2Ajuste3_1710(f, semEste)
  }) && semApresentadorOlhos1910(base(F.v2), F.v2) === base(F.v2) && semApresentadorOlhos1910(rd('lib/compose.ts'), 'lib/compose.ts') === rd('lib/compose.ts') && desfazApresentadorOlhos1910(F.v2, null) === null &&
    Object.values(ACRESCIMOS_APRESENTADOR_OLHOS_1910).every((n) => Number.isInteger(n) && n >= 0)
})
await check('D4 todo commit da entrega traz a marca no assunto', () => {
  const assuntos = git('log', '--no-merges', '--format=%s', `${B}..${TOPO}`).trim().split('\n').filter(Boolean) // reancorado KINEO-HOME-CARDS-BOTOES-2010 — até o TOPO
  return assuntos.length === 0 || assuntos.every((s) => s.includes(MARCA))
})

// ═══ M. mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
// o mutante é MONTADO fora do try (não aplicou = a checagem lança e fica FAIL); só a prova roda dentro
const vermelho = async (fn) => { try { return !(await fn()) } catch { return true } }
const mV2 = (a, b) => loadPure(trocar(rd(F.v2), a, b))
await check('M1 sem os olhos abertos no início → O1 vermelho', () => { const mut = [mV2('return `${ADS_V2_PRESENTER_V2_EYES_OPEN}; ${r3}; avoid: ${ADS_V2_PRESENTER_V2_EYES_AVOID}`', 'return `${r3}; avoid: ${ADS_V2_PRESENTER_V2_EYES_AVOID}`')]; return vermelho(() => provaAtuacao(...mut)) })
await check('M2 a linha da R3 planejada antes cai nas mãos paradas → O2 vermelho', () => { const mut = [mV2('rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT || rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT_R3 ?', 'rowPrompt === ADS_V2_PRESENTER_V2_PERFORMANCE_PROMPT ?')]; return vermelho(() => provaLinhaAntiga(...mut)) })
await check('M3 a régua esquece "sinta" → T1 vermelho', () => { const mut = [BR({ [F.brief]: trocar(rd(F.brief), '|sint(?:a|am|o)|', '|') })]; return vermelho(() => provaMarcas(...mut)) })
await check('M4 a regra do apresentador fora do pedido de texto → T2 vermelho', () => { const mut = [BR({ [F.brief]: trocar(rd(F.brief), '    ...(opts.ad?.talk === true && opts.narration ? [ADS_V2_PRESENTER_TALK_RULE] : []),', '    ...([]),') })]; return vermelho(() => provaPedido(...mut)) })
await check('M5 a régua não confere o tom → T3 vermelho', () => { const mut = [BR({ [F.brief]: trocar(rd(F.brief), 'if (tm.length) why.push(adsV2PresenterTalkWhy(tm))', 'if (tm.length && false) why.push(adsV2PresenterTalkWhy(tm))') })]; return vermelho(() => provaRegua(...mut)) })
await check('M6 o /plan não liga a fala de apresentador → T4 vermelho', () => { const mut = [trocar(rd(F.plan), '      ...(v2Words ? { presenterTalk: true } : {}),', '      ...({}),')]; return vermelho(() => provaRotaTalk(...mut)) })
await check('M7 o corte volta a amputar abaixo do piso (sem a guarda e sem a tolerância) → T5 vermelho', () => { const mut = [loadPure(trocar(trocar(rd(F.v2), '< ADS_V2_PRESENTER_V2_MIN_WORDS) best = -1', '< 0) best = -1'), 'if (i.canSpeed !== true && s <= target * ADS_V2_PRESENTER_V2_MAX_SPEED + 1e-9) return', 'if (false) return'))]; return vermelho(() => provaCurta(...mut)) })
await check('M8 a Jade entra nos aprovados → E1 vermelho', () => { const mut = [mV2("['sofia', 'amara', 'rahul', 'kenji']", "['sofia', 'amara', 'rahul', 'kenji', 'jade']")]; return vermelho(() => provaVisivel(...mut)) })
await check('M9 a trava do servidor ignora o sorteio oculto → E2 vermelho', () => { const mut = [mV2("  if (drawn && ADS_V2_PRESENTER_V2_APPROVED.includes(drawn.id)) return same", '  if (drawn) return same')]; return vermelho(() => provaTrava(...mut)) })
await check('M10 a tela mostra os 12 para todos → E3 vermelho', () => { const mut = [trocar(rd(F.picker), 'ADS_V2_PRESENTER_LIBRARY.filter((p) => adsV2PresenterV2Visible(p.id, all) && (cat', 'ADS_V2_PRESENTER_LIBRARY.filter((p) => (cat')]; return vermelho(() => provaTelaFonte(...mut)) })
await check('M11 a amostra volta a ser a voz do retrato em PT → V1 vermelho', () => { const mut = [mV2("if (typeof language === 'string' && language) {", 'if (false) {')]; return vermelho(() => provaAmostra(...mut)) })
await check('M12 a tela não passa a língua da voz → V2 vermelho', () => { const mut = [rd(F.picker), trocar(rd(F.simple), ' voiceLanguage={presenterV2Voice}', '')]; return vermelho(() => provaAmostraTela(...mut)) })
await check('M13 o evento da montagem sem voice_id → V3 vermelho', () => { const mut = [V2, trocar(rd(F.advance), 'renderId, voice_id: voiceId, shots:', 'renderId, shots:')]; return vermelho(() => provaVoiceId(...mut)) })

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
