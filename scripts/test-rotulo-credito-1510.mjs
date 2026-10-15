#!/usr/bin/env node
// KINEO-ROTULO-CREDITO-1510 — guardião do rótulo de crédito da coluna "Doing now" do painel /admin.
//
// O defeito: app/api/admin/live/route.ts escrevia "⚡ modal de crédito" para QUALQUER evento com 'topup' no nome — e o chip
// de créditos da barra lateral grava `topup_eligibility_handoff_viewed` só por aparecer na tela. Chip visto ≠ modal aberto.
//
//   R1–R7  a regra pura (lib/admin/rotuloCredito.ts): chip visto = linha fraca; modal aberto = modal; tocado ≠ modal; nome de
//          recarga desconhecido só vira modal se disser "modal … opened"; sem crédito = nada.
//   R8     o painel usa a regra (import + chamada com o Set de nomes da janela) e a regra velha morreu.
//   R9     os nomes da regra existem no código que os grava (Sidebar, nota, UpgradeModal) — a regra não fala de evento fantasma.
//   R10    módulo puro; o espelho (components/LiveNowPanel.tsx) só exibe, não recalcula.
// Depois, cada mutante (em memória, provado aplicado) tem de deixar o guardião vermelho.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(join(root, 'package.json'))('typescript')
const CR = String.fromCharCode(13)
const disk = new Map()
const read = (rel) => {
  if (!disk.has(rel)) disk.set(rel, readFileSync(join(root, rel), 'utf8').split(CR).join(''))
  return disk.get(rel)
}

const LIB = 'lib/admin/rotuloCredito.ts'
const ROUTE = 'app/api/admin/live/route.ts'
const PANEL = 'components/LiveNowPanel.tsx'
const SIDEBAR = 'components/Sidebar.tsx'
const NOTE = 'components/TopupUnavailableNote.tsx'
const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'

function loadLib(src) {
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(out, { module, exports: module.exports, require: () => { throw new Error('módulo puro não importa nada') } })
  return module.exports
}

function verificar(files) {
  const src = (rel) => files[rel] ?? read(rel)
  const falhas = []
  const ok = (c, m) => { if (!c) falhas.push(m) }
  let L
  try { L = loadLib(src(LIB)) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const r = (names) => L.rotuloCredito(new Set(names))
  const MODAL = L.ROTULO_MODAL_CREDITO
  const VIU = L.ROTULO_VIU_OFERTA_CREDITO
  const TOCOU = L.ROTULO_TOCOU_CREDITO

  ok(MODAL === '⚡ modal de crédito', 'R0: o rótulo do modal é o de sempre (o fundador já lê esse texto)')
  ok(typeof VIU === 'string' && VIU.startsWith('👀') && !/modal/i.test(VIU), 'R0: a linha fraca não fala em modal')
  ok(typeof TOCOU === 'string' && !/modal/i.test(TOCOU), 'R0: o chip tocado não fala em modal')
  // R1 — o caso do fundador: só viu o chip da barra lateral.
  ok(r(['page_view', 'topup_eligibility_handoff_viewed']) === VIU, 'R1: chip de créditos só visto = "viu oferta", nunca modal')
  ok(r(['topup_eligibility_handoff_viewed']) !== MODAL, 'R1: chip visto ≠ modal de crédito')
  // R2 — a nota "recarga só no Creator+" também é impressão.
  ok(r(['topup_unavailable_note_shown']) === VIU, 'R2: nota de recarga vista = "viu oferta"')
  // R3 — modal de compra aberto de verdade.
  ok(r(['upgrade_modal_opened']) === MODAL, 'R3: upgrade_modal_opened = modal de crédito')
  ok(r(['upgrade_modal_opened', 'topup_eligibility_handoff_viewed']) === MODAL, 'R3: modal aberto + chip visto = modal (o mais forte vence)')
  // R4 — tocar no chip leva a /pricing; não abre modal.
  ok(r(['topup_eligibility_handoff_clicked']) === TOCOU, 'R4: chip tocado = "tocou em créditos"')
  ok(r(['topup_eligibility_handoff_viewed', 'topup_eligibility_handoff_clicked']) !== MODAL, 'R4: chip visto + tocado ≠ modal')
  // R5 — nome de recarga desconhecido: só vira modal se disser que é modal aberto.
  ok(r(['topup_offer_impression']) === VIU, 'R5: impressão de recarga desconhecida = linha fraca')
  ok(r(['credits_topup_banner_shown']) === VIU, 'R5: …_shown de recarga = linha fraca')
  ok(r(['credits_topup_modal_opened']) === MODAL, 'R5: …topup_modal_opened (abertura de modal) = modal')
  // R6 — sem crédito na janela, nada de rótulo de crédito.
  ok(r([]) === null && r(['page_view', 'pricing_view', 'checkout_started', 'video_generation_started']) === null, 'R6: janela sem crédito = sem rótulo de crédito')
  // R7 — a regra devolve UM rótulo (o painel não empilha "modal" e "viu oferta" na mesma linha).
  ok(typeof r(['upgrade_modal_opened', 'topup_unavailable_note_shown', 'topup_eligibility_handoff_clicked']) === 'string', 'R7: um rótulo só')

  // R8 — o painel usa a regra e a regra velha morreu.
  const route = src(ROUTE)
  ok(/^import \{ rotuloCredito \} from '@\/lib\/admin\/rotuloCredito'/m.test(route), 'R8: a rota importa rotuloCredito')
  ok(/const names = new Set\(row\.events\)/.test(route), 'R8: names é o Set dos eventos da janela da pessoa')
  ok(/const credito = rotuloCredito\(names\)\n\s*if \(credito\) did\.push\(credito\)/.test(route), 'R8: a rota chama rotuloCredito(names) e empurra o resultado na coluna')
  ok(!/n\.includes\('topup'\)/.test(route), "R8: a regra velha (qualquer 'topup' = modal) saiu da rota")
  ok(!route.includes('⚡ modal de crédito'), 'R8: o rótulo do modal não é escrito à mão na rota (só a regra o devolve)')
  ok((route.match(/rotuloCredito\(/g) ?? []).length === 1, 'R8: uma chamada só')

  // R9 — os nomes da regra são os que o código grava.
  ok(L.EVENTOS_MODAL_CREDITO_ABERTO.includes('upgrade_modal_opened') && /trackEvent\('upgrade_modal_opened'/.test(src(GEN)), 'R9: upgrade_modal_opened é gravado pelo UpgradeModal do /generate')
  ok(L.EVENTOS_OFERTA_CREDITO_VISTA.includes('topup_eligibility_handoff_viewed') && /IntersectionObserver[\s\S]{0,600}recordTopupEventOnce\('topup_eligibility_handoff_viewed'\)/.test(src(SIDEBAR)), 'R9: o chip da barra grava topup_eligibility_handoff_viewed por VISIBILIDADE (impressão)')
  ok(L.EVENTOS_OFERTA_CREDITO_TOCADA.includes('topup_eligibility_handoff_clicked') && /recordTopupEventOnce\('topup_eligibility_handoff_clicked'\)[\s\S]{0,200}router\.push\('\/pricing'\)/.test(src(SIDEBAR)), 'R9: o chip tocado vai para /pricing (não abre modal)')
  ok(L.EVENTOS_OFERTA_CREDITO_VISTA.includes('topup_unavailable_note_shown') && /trackEvent\('topup_unavailable_note_shown'/.test(src(NOTE)), 'R9: a nota grava topup_unavailable_note_shown')
  for (const n of [...L.EVENTOS_OFERTA_CREDITO_VISTA, ...L.EVENTOS_OFERTA_CREDITO_TOCADA]) ok(!L.EVENTOS_MODAL_CREDITO_ABERTO.includes(n), `R9: ${n} não está na lista de modal aberto`)

  // R10 — módulo puro; o espelho só exibe.
  ok(!/^\s*import\s/m.test(src(LIB)), 'R10: lib/admin/rotuloCredito.ts sem import')
  ok(src(LIB).includes('KINEO-ROTULO-CREDITO-1510') && route.includes('KINEO-ROTULO-CREDITO-1510'), 'R10: marca nos dois arquivos')
  const panel = src(PANEL)
  ok(!panel.includes('topup') && !panel.includes('modal de crédito') && /v\.did\.join\(/.test(panel), 'R10: o LiveNowPanel só junta did (não recalcula o rótulo)')
  return falhas
}

// ── árvore real ──────────────────────────────────────────────────────────────────────────────────────────────────────
let vermelho = 0
const real = verificar({})
for (const f of real) console.log('FAIL', f)
if (real.length === 0) console.log('PASS árvore real: R0–R10')
else vermelho++

// ── mutantes: cada um tem de deixar vermelho ─────────────────────────────────────────────────────────────────────────
function mutar(rel, de, para) {
  const s = read(rel)
  if (s.split(de).length !== 2) throw new Error(`mutante sem âncora única em ${rel}: ${de.slice(0, 60)}`)
  const out = s.split(de).join(para)
  if (out === s) throw new Error('mutante não aplicou')
  return { [rel]: out }
}
const MUTANTES = [
  ['rota volta à regra velha (qualquer topup = modal)', () => mutar(ROUTE, "          const credito = rotuloCredito(names)\n          if (credito) did.push(credito)", "          if (names.has('upgrade_modal_opened') || [...names].some((n) => n.includes('topup'))) did.push('⚡ modal de crédito')")],
  ['rota esquece de chamar a regra', () => mutar(ROUTE, '          if (credito) did.push(credito)', '          void credito')],
  ['chip visto entra na lista de modal aberto', () => mutar(LIB, "Object.freeze(['upgrade_modal_opened'])", "Object.freeze(['upgrade_modal_opened', 'topup_eligibility_handoff_viewed'])")],
  ['qualquer recarga vira modal', () => mutar(LIB, "const recargaDizModalAberto = (n: string) => ehRecarga(n) && n.includes('modal') && /_(opened|open)$/.test(n)", 'const recargaDizModalAberto = (n: string) => ehRecarga(n)')],
  ['modal aberto some da regra', () => mutar(LIB, "Object.freeze(['upgrade_modal_opened'])", 'Object.freeze([])')],
  ['chip tocado vira modal', () => mutar(LIB, "  if (lista.some((n) => EVENTOS_OFERTA_CREDITO_TOCADA.includes(n))) return ROTULO_TOCOU_CREDITO", "  if (lista.some((n) => EVENTOS_OFERTA_CREDITO_TOCADA.includes(n))) return ROTULO_MODAL_CREDITO")],
  ['linha fraca chamada de modal', () => mutar(LIB, "export const ROTULO_VIU_OFERTA_CREDITO = '👀 viu oferta de créditos'", "export const ROTULO_VIU_OFERTA_CREDITO = '👀 modal de crédito'")],
  ['impressão some (chip visto vira nada)', () => mutar(LIB, '  if (lista.some((n) => EVENTOS_OFERTA_CREDITO_VISTA.includes(n) || ehRecarga(n))) return ROTULO_VIU_OFERTA_CREDITO\n', '')],
  ['rótulo do modal escrito à mão na rota', () => mutar(ROUTE, '          if (credito) did.push(credito)', "          if (credito) did.push(credito === '⚡ modal de crédito' ? '⚡ modal de crédito' : credito)")],
]
let mortos = 0
for (const [nome, fazer] of MUTANTES) {
  let files
  try { files = fazer() } catch (e) { console.log(`FAIL mutante "${nome}" não aplicou: ${e.message}`); vermelho++; continue }
  const f = verificar(files)
  if (f.length > 0) { mortos++; console.log(`PASS mutante "${nome}" deixa vermelho (${f[0]})`) }
  else { vermelho++; console.log(`FAIL mutante "${nome}" passou verde`) }
}
console.log(`${mortos}/${MUTANTES.length} mutantes mortos`)
process.exit(vermelho === 0 ? 0 : 1)
