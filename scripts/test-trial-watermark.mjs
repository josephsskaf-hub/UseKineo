// KINEO-TRIAL-WATERMARK-2026-09-07 — guardião da ORDEM DO FUNDADOR de 07/09:
// "liga marca d'água no trial".
//
// MEDIDO ANTES (7 dias, contas externas): trial ativo baixou 31 filmes COM
// marca (todos Kineo 1) e 29 LIMPOS (todos Seedance). A política existia pela
// metade — `isTrialRender` só era atribuído no ramo `fast` de /api/compose.
//
// Este guardião NÃO conta texto: ele EXTRAI as expressões que decidem do
// próprio arquivo e as AVALIA contra fixtures. Um mutante que troque `&&` por
// `||`, que apague um termo ou que devolva `true` fixo reprova, porque a
// tabela-verdade muda. Estilo readFileSync de propósito: guardião com import
// `@/` morre no import antes da primeira verificação (72 testes da casa já
// morreram assim).
import { readFileSync } from 'node:fs'

let pass = 0
const fails = []
const ok = (name, cond) => { if (cond) pass++; else fails.push(name) }
const eq = (name, got, want) => ok(`${name} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, got === want)

const norm = (p) => readFileSync(p, 'utf8').split('\r\n').join('\n')
const compose = norm('app/api/compose/route.ts')
const unlock = norm('app/api/compose/unlock/route.ts')
const client = norm('app/(dashboard)/generate/GenerateClient.tsx')

// ── 1) O RAMO cinematic_ai PASSOU A DECIDIR ────────────────────────────────
// Âncora pela ABERTURA do ramo, não por uma linha solta: o que importa é que a
// atribuição esteja DENTRO de `if (quality === 'cinematic_ai')`.
const aiBranchAt = compose.indexOf("      if (quality === 'cinematic_ai') {")
ok('ramo cinematic_ai existe', aiBranchAt > 0)
const aiBranch = compose.slice(aiBranchAt, aiBranchAt + 2000)
const aiAssign = /isTrialRender = ([^\n]+)/.exec(aiBranch)
ok('ramo cinematic_ai atribui isTrialRender', Boolean(aiAssign))

// ── 2) O RAMO fast CONTINUA DECIDINDO, E AGORA POUPA QUEM PAGOU ────────────
const fastBranchAt = compose.indexOf('isFreePlanFast = isFreePlan && !hasPaid && !ent.isTrial')
ok('ramo fast existe', fastBranchAt > 0)
const fastBranch = compose.slice(fastBranchAt, fastBranchAt + 1200)
const fastAssign = /isTrialRender = ([^\n]+)/.exec(fastBranch)
ok('ramo fast atribui isTrialRender', Boolean(fastAssign))

// ── 3) TABELA-VERDADE DAS DUAS EXPRESSÕES, AVALIADAS DE VERDADE ────────────
// A regra que o fundador pediu, escrita como fatos e não como texto:
//   trial ativo e conta NÃO paga  → marca d'água  (era o buraco: 29 Seedance)
//   trial de $1 (conta paga)      → SEM marca     (quem pôs o cartão)
//   sem trial                     → decide o resto da rota, não este termo
const truthTable = [
  { ent: { isTrial: true, isPaidAccount: false }, want: true, caso: 'trial ativo, nunca pagou' },
  { ent: { isTrial: true, isPaidAccount: true }, want: false, caso: 'trial de $1 - ja pagou' },
  { ent: { isTrial: false, isPaidAccount: false }, want: false, caso: 'free sem trial' },
  { ent: { isTrial: false, isPaidAccount: true }, want: false, caso: 'assinante' },
]
for (const [rotulo, m] of [['cinematic_ai', aiAssign], ['fast', fastAssign]]) {
  if (!m) continue
  const expr = m[1].replace(/\s*$/, '')
  for (const row of truthTable) {
    let got
    try { got = Function('ent', `"use strict"; return (${expr})`)(row.ent) } catch (e) { got = `ERRO: ${e.message}` }
    eq(`${rotulo}: ${row.caso}`, got, row.want)
  }
}

// ── 4) A DECISÃO TEM UM DONO SÓ, E ELE É LIDO PELO BUILDER ─────────────────
// O builder não pode reconstruir a regra: ele lê a variável que a guarda.
ok('builder classico le watermarkApplied', compose.includes('        watermark: watermarkApplied,'))
const wmAssign = /watermarkApplied =\n([\s\S]{0,400}?)\n    let source: Record<string, unknown>/.exec(compose)
ok('watermarkApplied e atribuido antes do builder', Boolean(wmAssign))
if (wmAssign) {
  const expr = wmAssign[1].trim()
  const evalWm = (isFreePlanFast, isTrialRender, forced) => {
    const src = expr.replace(/FORCE_WATERMARK_EMAILS\.has\([^)]*\)[^\n]*/g, 'FORCED')
    return Function('isFreePlanFast', 'isTrialRender', 'FORCED', `"use strict"; return (${src})`)(isFreePlanFast, isTrialRender, forced)
  }
  eq('watermark: free fast', evalWm(true, false, false), true)
  eq('watermark: trial (o conserto de hoje)', evalWm(false, true, false), true)
  eq('watermark: conta do #434', evalWm(false, false, true), true)
  eq('watermark: pagante limpo', evalWm(false, false, false), false)
}

// ── 5) A ORDEM IMPORTA: decidir DEPOIS de montar seria decidir tarde ───────
const wmAssignAt = compose.indexOf('    watermarkApplied =')
const builderAt = compose.indexOf('      source = buildCreatomateSource({')
ok('a decisao acontece ANTES do builder', wmAssignAt > 0 && builderAt > 0 && wmAssignAt < builderAt)

// ── 6) A RESPOSTA CONTA A VERDADE (as duas saidas de sucesso) ──────────────
ok('resposta classica devolve watermark', compose.includes('      watermark: watermarkApplied,'))
ok('resposta hollywood devolve watermark', compose.includes('        watermark: forced,'))

// ── 7) O PAR OBRIGATORIO: O REBUILD LIMPO PRECISA DO MESMO RITMO ───────────
// Vender "export limpo" e devolver outra montagem e promessa que a casa nao
// sabe cumprir. `quality` em lib/compose.ts NAO e rotulo: e `isFastStock`.
ok('unlock nao crava mais fast no builder', !unlock.includes("        quality: 'fast',\n        realAudioDuration,"))
ok('unlock monta com a quality do filme', unlock.includes('        quality: rebuildQuality,'))
const rq = /function rebuildQualityOf\(raw: unknown\)[\s\S]{0,400}?\n\}/.exec(unlock)
ok('rebuildQualityOf existe', Boolean(rq))
ok('whitelist inclui cinematic_ai', /REBUILD_QUALITIES = new Set\(\[[^\]]*'cinematic_ai'[^\]]*\]\)/.test(unlock))
ok('whitelist inclui fast', /REBUILD_QUALITIES = new Set\(\[[^\]]*'fast'[^\]]*\]\)/.test(unlock))
// Hollywood NAO entra: narracao por cena nao se remonta pelo builder classico.
for (const q of ['cinematic_kling', 'cinematic_veo', 'cinematic_h3', 'cinematic_omni', 'cinematic_s25']) {
  ok(`whitelist NAO inclui ${q}`, !new RegExp(`REBUILD_QUALITIES = new Set\\(\\[[^\\]]*'${q}'`).test(unlock))
}

// ── 8) O PROTOCOLO DE PAGAMENTO DO UNLOCK NAO MUDOU UM BYTE ────────────────
ok('unlock continua custando 0', unlock.includes('const intendedCost = 0'))
ok('claim assinado continua rotulado fast', /signComposeClaim\(serviceRoleKey, \{[\s\S]{0,400}?quality: 'fast',/.test(unlock))
ok('unlock continua entregando limpo', unlock.includes('        watermark: false,'))

// ── 9) A TELA PAROU DE ADIVINHAR ───────────────────────────────────────────
// O defeito que isto mata: `video_downloaded.export_type` rotularia 'clean' um
// download COM marca, e a caixa de unlock nunca apareceria para o trial.
const cw = /const currentResultHasWatermark =\n([\s\S]{0,400}?)\n  const showPostVideoExportChoice/.exec(client)
ok('currentResultHasWatermark existe', Boolean(cw))
if (cw) {
  const expr = cw[1].trim()
  ok('a verdade do servidor tem precedencia', /^serverWatermark !== null/.test(expr))
  const evalCw = (serverWatermark, planTier, hasPaid, quality, falUsed, hasInputs) =>
    Function('serverWatermark', 'planTier', 'hasPaid', 'quality', 'falUsedRef', 'lastFastRenderRef',
      `"use strict"; return (${expr})`)(serverWatermark, planTier, hasPaid, quality,
      { current: falUsed }, { current: hasInputs ? {} : null })
  eq('servidor disse MARCADO num Seedance de trial', evalCw(true, 'free', false, 'cinematic_ai', true, true), true)
  eq('servidor disse LIMPO num fast de free', evalCw(false, 'free', false, 'fast', false, true), false)
  eq('servidor calado: cai no fallback antigo', evalCw(null, 'free', false, 'fast', false, true), true)
  eq('servidor calado, pagante: limpo', evalCw(null, 'starter', true, 'fast', false, true), false)
}

// ── 10) LER SEM ZERAR SERIA HERDAR O VEREDITO DO FILME ANTERIOR ────────────
const setCount = (client.match(/setServerWatermark\(data\.watermark\)/g) || []).length
eq('as DUAS chamadas do compose leem o campo', setCount, 2)
const resetCount = (client.match(/setServerWatermark\(null\)/g) || []).length
eq('os TRES pontos de filme novo zeram o veredito', resetCount, 3)
const clampCount = (client.match(/setFreeClampNotice\(\{ from: fc\.from, to: fc\.to \}\)/g) || []).length
eq('par obrigatorio: mesmo numero de call sites do clamp', setCount, clampCount)

// ── 11) O HANDOFF DO UNLOCK CARREGA O MOTOR ────────────────────────────────
ok('FastRenderInputs tem quality', /interface FastRenderInputs \{[\s\S]{0,700}?\n  quality\?: string\n\}/.test(client))
ok('o snapshot do render grava a quality real', client.includes('            quality: falUsedRef.current ? falQualityRef.current : quality,\n          }'))
ok('normalize preserva fast/cinematic_ai', client.includes("input.quality === 'fast' || input.quality === 'cinematic_ai' ? { quality: input.quality } : {}"))

// ── 12) O QUE NAO PODE TER MUDADO ──────────────────────────────────────────
// A ordem foi "so o booleano": regua, motor, prompt de cena, credito e preco.
ok('o custo do cinematic_ai nao mudou', compose.includes("const requiredCredits = creditCostFor('cinematic_ai', true)"))
ok('isFreePlanFast nao mudou', compose.includes('isFreePlanFast = isFreePlan && !hasPaid && !ent.isTrial'))
ok('o clamp de 15s do free nao mudou', compose.includes('const maxFreeSeconds = ent.maxDurationSeconds'))

console.log(`\n[test-trial-watermark] ${pass}/${pass + fails.length} verificacoes`)
if (fails.length) {
  console.error('\nFALHOU:')
  for (const f of fails) console.error('  x ' + f)
  process.exit(1)
}
console.log('OK - a marca dagua do trial e o rebuild fiel estao amarrados.')
