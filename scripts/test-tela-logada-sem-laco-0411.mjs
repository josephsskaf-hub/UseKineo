// KINEO-FLUXO2-GUARDA-TELA-0411 — guardião: a tela do anúncio monta com pedido salvo e assenta, em toda combinação de conta e etapa.
// Executa o AdsV2Escolha de verdade pelo suporte de hooks; o suporte estoura se a tela não parar de pedir render em 8 rodadas ("did not settle").
// Nasceu do congelamento visto em 04/11 na conta interna com pedido salvo. ATENÇÃO: este guardião NÃO reproduziu aquele congelamento: ele cobre laço de render,
// não prova a causa. A causa segue desconhecida.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { runEscolhaUiProof } from './test-support/ads-escolha-ui-2310.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const UI = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx', AVISO = 'components/Kling4PaidNotice.tsx'
const lf = (t) => t.replace(/\r\n/g, '\n')
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const ID = '00000000-0000-4000-8000-000000000001'
const STILLS = [1, 2, 3, 4].map((n) => ({ id: `still-${n}`, url: `https://offline.invalid/${n}.png`, score: 90, reasons: [] }))
const FORM = { foto: 'https://offline.invalid/p.jpg', frase: 'Red light therapy scalp massage hair brush (LED). Massages the scalp and stimulates hair growth at home, 10 minutes a day.', oferta: '', beneficios: 'massages the scalp\nstimulates hair growth at home\n10 minutes a day', cta: 'Shop now', language: 'en', formato: 'product_in_hand', voice_mode: 'narrated', rota: '', presenter_id: 'sofia', category: 'skincare', scenario_id: 'skincare_bathroom' }
const NOTAS = Array.from({ length: 14 }, (_, i) => ({ code: 'script_retry', message: `nota ${i}` }))
const salvo = (stage, extra = {}) => ({ version: 'KINEO-ADS-ESCOLHA-2310', form: FORM, order_id: ID, stage, stills: STILLS, still_id: 'still-3', narration_used: 'Shop now.', quality_notes: NOTAS, credits: 51, photo_round: 1, max_photo_rounds: 2, choice_locked: true, ...extra })
const lease = (reason) => ({ paidLive: true, promoLive: true, promoAvailable: reason === 'ok', publicOfferLive: true, reason, checkedAt: new Date(Date.now() - 1000).toISOString(), validUntil: new Date(Date.now() + 10000).toISOString(), expiresAt: null, remainingToday: 3 })
const CONTAS = [
  ['interna', { internalControls: true }, 'not_subscribed'],
  ['assinante', { internalControls: false }, 'ok'],
  ['assinante sem cota', { internalControls: false }, 'daily_limit'],
  ['grátis', { internalControls: false, sampleAvailable: true, initialSample: true }, 'not_subscribed'],
  ['sem leitura do Kling 4', { internalControls: false }, null],
]
const ETAPAS = ['planned', 'stills', 'choose', 'rendering', 'delivered', 'failed']
const PROMOS = [{}, { kling4_promo: { free: true, reason: 'ok' }, engine_used: 'kling4' }, { kling4_promo: { free: false, reason: 'not_subscribed' }, engine_used: 'kling4' }, { sample: true }]

/** Monta todas as combinações. Devolve as que não assentam. */
async function prova(mutar = {}) {
  const erros = []
  await runEscolhaUiProof({ current: true, source: (text, file) => (mutar[file] ? mutar[file](lf(text)) : text), scenario: async ({ client, nodeText }) => {
    const monta = async (nome, opcoes, conferir) => {
      try {
        const u = client({ lang: 'en', onAskStartOver: () => {}, ...opcoes })
        u.render(); await u.settle(); await u.settle()
        if (conferir && !conferir(u)) erros.push(`${nome}: tela errada`)
        if (u.requests.length) erros.push(`${nome}: chamou o servidor ao montar`)
      } catch (e) { erros.push(`${nome}: ${e.message}`) }
    }
    const temLinha = (u) => u.nodes().some((n) => n.props?.['data-kineo'] === 'ads-em-andamento')
    for (const [conta, opcoes, motivo] of CONTAS) {
      const availability = motivo ? lease(motivo) : null
      await monta(`${conta}, sem pedido`, { ...opcoes, form: null, availability }, (u) => !temLinha(u))
      for (const etapa of ETAPAS) for (const extra of PROMOS) await monta(`${conta}, ${etapa}, ${JSON.stringify(extra)}`, { ...opcoes, form: { ...FORM, presenter_id: 'jade', category: '', scenario_id: '' }, availability, saved: salvo(etapa, extra) }, temLinha)
      await monta(`${conta}, por link`, { ...opcoes, form: null, availability, query: `?order=${ID}` }, temLinha)
    }
    void nodeText
  } })
  return erros
}
const erros = await prova()
for (const e of erros.slice(0, 12)) checa(e, false)
checa('toda combinação de conta e etapa monta e assenta, sem chamar o servidor', erros.length === 0)

for (const [nome, muta] of [
  ['efeito sem dependência grava objeto novo', (t) => t.replace("  useEffect(() => { onPreview?.(true);", "  useEffect(() => { setOrderPromo({ free: false, reason: 'x' }) })\n  useEffect(() => { onPreview?.(true);")],
  ['efeito depende do próprio objeto', (t) => t.replace("  useEffect(() => { onPreview?.(true);", "  useEffect(() => { setOrderPromo({ free: false, reason: 'x' }) }, [orderPromo])\n  useEffect(() => { onPreview?.(true);")],
  ['set durante o render', (t) => t.replace('  const photoCount = sampleMode ? 2 : 4\n', "  setOrderPromo({ free: false, reason: 'x' })\n  const photoCount = sampleMode ? 2 : 4\n")],
]) {
  const fonte = ler(UI), mudou = muta(fonte) !== fonte
  let r = []
  try { r = await prova({ [UI]: muta }) } catch (e) { r = ['estourou: ' + e.message] }
  checa(`mutante "${nome}" fica vermelho`, mudou && r.some((m) => /did not settle/.test(m)))
}

// ── O aviso do Kling 4: a leitura é renovada a cada ~15 s e passa por null; isso não pode virar outra impressão.
const require = createRequire(import.meta.url)
const React = require('react')
function montaAviso(mutar) {
  const estados = [], refs = [], efeitos = [], eventos = []
  let i = 0, r = 0, e = 0
  const hooks = { ...React, useState: (v) => { const k = i++; if (!(k in estados)) estados[k] = v; return [estados[k], (x) => { estados[k] = x }] }, useRef: (v) => { const k = r++; return refs[k] ?? (refs[k] = { current: v }) }, useEffect: (f, d) => { const k = e++; const velho = efeitos[k]; if (!velho || !d || d.some((x, n) => x !== velho.d?.[n])) { efeitos[k] = { d }; f() } } }
  const load = createOfflineLoader({
    mocks: { react: hooks, 'react/jsx-runtime': require('react/jsx-runtime'), '@/components/InterfaceLanguage': { UiLabel: ({ children }) => children }, '@/lib/analytics': { trackEvent: async (n, m) => { eventos.push([n, m]); return true } } },
    globals: { document: { visibilityState: 'visible' }, window: { addEventListener() {}, removeEventListener() {} }, setTimeout: () => 0, clearTimeout() {}, AbortController, Date },
    source: (rel, t) => { const m = mutar && rel === AVISO ? mutar(lf(t)) : t; return rel === AVISO ? ts.transpileModule(m, { fileName: 'aviso.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText : m },
  })
  const Aviso = load(AVISO).default
  const desenha = (availability, surface = 'studio') => { i = r = e = 0; return Aviso({ surface, availability }) }
  return { desenha, eventos }
}
const ciclo = (mutar) => {
  const a = montaAviso(mutar)
  a.desenha(lease('not_subscribed'))
  for (let n = 0; n < 6; n++) { a.desenha(null); a.desenha(lease('not_subscribed')) }
  return a
}
const aviso = ciclo()
checa('aviso: seis renovações da leitura = uma impressão', aviso.eventos.length === 1 && aviso.eventos[0][0] === 'kling4_promo_notice_shown')
const virou = montaAviso(); virou.desenha(lease('not_subscribed')); virou.desenha(null); virou.desenha({ ...lease('daily_cap'), publicOfferLive: false })
checa('aviso: mudar de estado (oferta → cota do dia) conta de novo', virou.eventos.length === 2 && virou.eventos[1][1].state === 'daily_cap')
const mutAviso = ciclo((t) => t.replace('if (!shownState || medido.current === `${surface}:${shownState}`) return', 'if (!shownState) return'))
checa('mutante "aviso sem a trava" fica vermelho', mutAviso.eventos.length === 7)

console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
