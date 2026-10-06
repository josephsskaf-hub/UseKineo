// KINEO-CLIPE-GRATIS-REGIAO-2026-10-05 — guardião do clipe grátis para quem nasce 'region_paid_only' (fundador 05/10, item
// 1A: "por 0,27 eu topo liberar para esses países … pelo menos um clipe grátis de 5 segundos").
// Prova, EXECUTANDO lib/freeFilmPolicy.ts (puro) e lib/clips/clipPricing.ts:
//   (1) o crédito dado = o preço de 1 clipe de 5 s no Seedance (espelho sem import, conferido aqui);
//   (2) a faixa mostra o clipe grátis só para quem é 'region_paid_only', não pagou, plano grátis e ainda tem o saldo do clipe;
//   (3) o cadastro dá o crédito na MESMA transição que marca a região, com compare-and-set (nunca duas vezes, nunca por cima
//       de saldo) e evento de servidor; a recusa do filme narrado para essas contas continua intacta;
//   (4) o layout passa a disponibilidade para a faixa, e a faixa leva ao /clips;
//   (5) mutantes: cada regra quebrada fica vermelha.
// Estilo readFileSync + transpile (molde scripts/test-clip-efeitos-2026-10-05.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

/** Carrega um módulo TS puro; imports relativos ('./x') resolvem para o .ts vizinho. Qualquer outro import = erro. */
function load(rel, over = {}) {
  const src = over[rel] ?? read(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const req = (name) => {
    if (!name.startsWith('./')) throw new Error(`${rel}: import inesperado ${name} (módulo precisa ser puro)`)
    return load(path.posix.join(path.posix.dirname(rel), name.slice(2) + '.ts'), over)
  }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, req)
  return mod.exports
}

const POLICY = 'lib/freeFilmPolicy.ts'
const TRIAL = 'lib/reverseTrial.ts'
const LAYOUT = 'app/(dashboard)/layout.tsx'
const BANNER = 'components/RegionPaidOnlyBanner.tsx'

function problems(over = {}) {
  const p = []
  const src = (rel) => (over[rel] ?? read(rel)).replace(/\r\n/g, '\n')
  let P
  try { P = load(POLICY, over) } catch (err) { return [`política não carrega: ${err.message}`] }
  const price = load('lib/clips/clipPricing.ts')

  // (1) crédito = preço de 1 clipe de 5 s no Seedance (com foto e com texto)
  if (P.REGION_FREE_CLIP_PUBLIC !== true) p.push('interruptor do clipe grátis desligado (o fundador mandou ligar em 05/10)')
  const seedance5 = price.clipCreditCost('seedance', 5, true)
  if (P.REGION_FREE_CLIP_CREDITS !== seedance5 || price.clipCreditCost('seedance', 5, false) !== seedance5) {
    p.push(`crédito dado (${P.REGION_FREE_CLIP_CREDITS}) ≠ preço de 1 clipe de 5 s no Seedance (${seedance5})`)
  }
  if (P.REGION_FREE_CLIP_GRANTED_EVENT !== 'region_free_clip_granted') p.push('nome do evento mudou (a medição lê region_free_clip_granted)')
  if (P.REGION_FREE_CLIP_HREF !== '/clips') p.push('a faixa não leva ao /clips')

  // (2) quem vê a faixa do clipe grátis
  const base = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: seedance5 }
  const casos = [
    [base, true, 'região sem teste, com o saldo do clipe'],
    [{ ...base, video_credits: 0 }, false, 'já usou o clipe (saldo 0)'],
    [{ ...base, video_credits: seedance5 - 1 }, false, 'saldo abaixo de 1 clipe'],
    [{ ...base, has_paid: true }, false, 'já pagou'],
    [{ ...base, plan: 'starter' }, false, 'tem plano'],
    [{ ...base, trial_status: 'active' }, false, 'conta com teste normal'],
    [null, false, 'sem perfil'],
  ]
  for (const [row, want, label] of casos) {
    if (P.regionFreeClipAvailable(row) !== want) p.push(`faixa do clipe grátis errada para: ${label}`)
  }
  for (const lang of ['en', 'pt', 'es']) {
    const c = P.REGION_FREE_CLIP_NOTICE?.[lang]
    if (!c || !c.title?.trim() || !c.body?.trim() || !c.cta?.trim()) p.push(`texto da faixa vazio em ${lang}`)
    else if (!/\b5\b/.test(c.body)) p.push(`texto da faixa em ${lang} não diz que o clipe é de 5 segundos`)
  }
  // a recusa do FILME continua a mesma (o clipe grátis não abre o filme narrado)
  if (P.REGION_PAID_ONLY_REFUSAL !== `${P.REGION_PAID_ONLY_NOTICE.en.title}. ${P.REGION_PAID_ONLY_NOTICE.en.body} Nothing was charged.`) {
    p.push('a recusa do filme narrado para a região mudou')
  }

  // (3) o cadastro dá o crédito na transição, com compare-and-set e evento
  const trial = src(TRIAL)
  const ramo = trial.slice(trial.indexOf('if (!filmeGratisPermitido(args.country ?? null)) {'), trial.indexOf("return { activated: false, reason: 'region_paid_only' }"))
  if (!ramo || ramo.length < 50) p.push('ramo region_paid_only do cadastro não encontrado')
  else {
    const bloco = ramo.slice(ramo.indexOf('if (markedPais && REGION_FREE_CLIP_PUBLIC) {'))
    if (!ramo.includes('if (markedPais && REGION_FREE_CLIP_PUBLIC) {')) p.push('o crédito não está preso à transição (markedPais) e ao interruptor')
    else {
      for (const need of [
        '.update({ video_credits: REGION_FREE_CLIP_CREDITS })',
        ".eq('id', args.userId)",
        ".eq('trial_status', REGION_PAID_ONLY_TRIAL_STATUS)",
        ".eq('video_credits', 0)",
        'name: REGION_FREE_CLIP_GRANTED_EVENT,',
      ]) if (!bloco.includes(need)) p.push(`cadastro sem "${need}" no crédito do clipe`)
    }
  }

  // (4) layout → faixa → /clips
  const layout = src(LAYOUT)
  if (!/<RegionPaidOnlyBanner freeClip=\{regionFreeClipAvailable\(profile as \{[^}]*video_credits\?: number \| null \} \| null\)\} \/>/.test(layout)) {
    p.push('o layout não passa a disponibilidade do clipe grátis para a faixa')
  }
  if (!/\.select\('[^']*\bvideo_credits\b[^']*'\)/.test(layout)) p.push('o layout não lê video_credits do perfil')
  const banner = src(BANNER)
  if (!banner.includes('pickInterfaceCopy(freeClip ? REGION_FREE_CLIP_NOTICE : REGION_PAID_ONLY_NOTICE, language)')) p.push('a faixa não troca o texto quando o clipe grátis está disponível')
  if (!banner.includes('href={REGION_FREE_CLIP_HREF}') || !banner.includes("'region_free_clip_cta_clicked'")) p.push('a faixa não leva ao /clips com o evento do clique')
  if (!banner.includes('href={REGION_PAID_ONLY_PLANS_HREF}')) p.push('a faixa perdeu o botão dos planos')
  return p
}

console.log('TESTE clipe grátis para país sem teste — 05/10')
const real = problems()
ok(real.length === 0, '(1–4) crédito = preço do clipe, faixa certa, cadastro com compare-and-set e evento, layout e faixa ligados' + (real.length ? ' → ' + real.join(' | ') : ''))

// (5) mutantes — prova que cada ancoragem é real e que a regra quebrada fica vermelha
const mutants = [
  ['M1 sem trava de saldo 0 (daria por cima de saldo)', TRIAL, ".eq('video_credits', 0)\n", ''],
  ['M2 crédito a cada login (fora da transição)', TRIAL, 'if (markedPais && REGION_FREE_CLIP_PUBLIC) {', 'if (REGION_FREE_CLIP_PUBLIC) {'],
  ['M3 crédito diferente do preço do clipe', POLICY, 'export const REGION_FREE_CLIP_CREDITS = 5', 'export const REGION_FREE_CLIP_CREDITS = 6'],
  ['M4 interruptor desligado', POLICY, 'export const REGION_FREE_CLIP_PUBLIC = true', 'export const REGION_FREE_CLIP_PUBLIC = false'],
  ['M5 faixa sem a disponibilidade', LAYOUT, '<RegionPaidOnlyBanner freeClip={regionFreeClipAvailable(', '<RegionPaidOnlyBanner data-x={regionFreeClipAvailable('],
  ['M6 faixa disponível com saldo zero', POLICY, "return typeof row?.video_credits === 'number' && row.video_credits >= REGION_FREE_CLIP_CREDITS", "return typeof row?.video_credits === 'number'"],
  ['M7 recusa do filme passa a falar do clipe', POLICY, 'export const REGION_PAID_ONLY_REFUSAL = `${REGION_PAID_ONLY_NOTICE.en.title}.', 'export const REGION_PAID_ONLY_REFUSAL = `${REGION_FREE_CLIP_NOTICE.en.title}.'],
]
for (const [label, file, from, to] of mutants) {
  const src = read(file)
  if (!src.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  let bitten = false
  try {
    bitten = problems({ [file]: src.replace(from, to) }).length > 0
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
