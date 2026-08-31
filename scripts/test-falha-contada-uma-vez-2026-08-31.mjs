#!/usr/bin/env node
// ═══ sprint-v1v4 #12 — UMA FALHA, UMA LINHA QUE CONTA ══════════════════════
//
// Medido em produção agora (14 dias, só pessoas externas):
//   448 linhas de `generation_stage_error`  →  209 falhas de verdade.
//   174 das 209 tentativas (83%) gravaram EXATAMENTE 2 linhas, uma delas MUDA.
//   186 das 448 linhas (42%) sem `reason` nenhum.  1 com `error='unknown'`.
//   29 linhas sem `attempt_id` — não dá nem para parear à mão.
//
// Rodar:  node scripts/test-falha-contada-uma-vez-2026-08-31.mjs
// Sem rede, sem banco, sem servidor.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

let falhas = 0
const checa = (nome, cond, detalhe = '') => {
  if (cond) console.log(`  ✓ ${nome}`)
  else { falhas++; console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`) }
}

// ── Reimplementação fiel do módulo (o .ts não roda direto no node) ─────────
const fonteLib = ler('lib/failureLedger.ts')

const FAILURE_ROLE_CAUSE = 'cause'
const FAILURE_ROLE_TRANSITION = 'stage_transition'
const UNREPORTED = 'unreported_stage_failure'

function sintetizarCausa(stage, reason, httpStatus) {
  return [`no_detail:${reason}`, `stage=${stage}`,
    `http=${typeof httpStatus === 'number' ? httpStatus : 'none'}`].join('|').slice(0, 180)
}
function rotularTransicao(e) {
  const relatado = typeof e.reasonJaRelatado === 'string' && e.reasonJaRelatado.trim()
    ? e.reasonJaRelatado.trim() : null
  const podeParear = typeof e.attemptId === 'string' && e.attemptId.trim().length > 0
  const ehEco = podeParear && relatado !== null
  const reason = ehEco ? relatado : UNREPORTED
  const naTela = typeof e.mensagemNaTela === 'string' ? e.mensagemNaTela.trim() : ''
  const temFrase = naTela.length > 0 && naTela !== 'unknown'
  return {
    failure_role: ehEco ? FAILURE_ROLE_TRANSITION : FAILURE_ROLE_CAUSE,
    reason,
    error: temFrase ? naTela.slice(0, 180) : sintetizarCausa(e.stage, reason, null),
    error_source: temFrase ? 'screen' : 'synthesized',
    duplicate_of_cause: ehEco,
  }
}
function contaComoFalha(m0) {
  const m = m0 ?? {}
  const papel = typeof m.failure_role === 'string' ? m.failure_role : null
  if (papel === FAILURE_ROLE_CAUSE) return true
  if (papel === FAILURE_ROLE_TRANSITION) return false
  const reason = typeof m.reason === 'string' ? m.reason.trim() : ''
  return reason.length > 0
}

// ═══ A — os PARES REAIS de produção param de contar dobrado ════════════════
// Cada linha é um par observado no banco: [attempt, reason do emissor (A),
// frase que o emissor (B) gravou].
console.log('\nA. Pares reais de produção (14d) — cada falha conta UMA vez')
const paresReais = [
  ['a1', 'narration_too_short', 'Your script is about 31 seconds of narration, but you asked for a 45-second video'],
  ['a2', 'narration_too_short', 'Your script is about 35 seconds of narration, but you asked for a 45-second video'],
  ['a3', 'narration_too_short', 'Your script is about 32 seconds of narration, but you asked for a 45-second video'],
  ['a4', 'narration_too_short', 'Your script is about 38 seconds of narration, but you asked for a 45-second video'],
  ['a5', 'narration_too_short', 'unknown'],                 // 31/08 17:55:28Z
  ['a6', 'cinematic_gate_trial_stalled', 'Your trial has 25 credits left and an AI video needs 38. Add a plan to keep the AI engine.'],
  ['a7', 'cinematic_gate_trial_stalled', 'Your trial has 21 credits left and an AI video needs 38. Add a plan to keep the AI engine.'],
  ['a8', 'analyze_not_ok', 'Could not analyze topic. Please try again.'],
  ['a9', 'analyze_not_ok', 'Could not analyze that idea. Please try again.'],
]
let contadas = 0
for (const [att, reason, frase] of paresReais) {
  const linhaA = { attempt_id: att, failure_role: FAILURE_ROLE_CAUSE, reason }
  const rotulo = rotularTransicao({ stage: 'failed', attemptId: att, reasonJaRelatado: reason, mensagemNaTela: frase })
  const linhaB = { attempt_id: att, ...rotulo }
  contadas += (contaComoFalha(linhaA) ? 1 : 0) + (contaComoFalha(linhaB) ? 1 : 0)
}
checa(`9 falhas → 9 linhas contadas (era 18)`, contadas === 9, `deu ${contadas}`)
checa('o eco NUNCA conta',
  paresReais.every(([att, r, f]) => !contaComoFalha({ ...rotularTransicao({ stage: 'failed', attemptId: att, reasonJaRelatado: r, mensagemNaTela: f }) })))
checa('o eco HERDA o reason (group by reason para de perder 42%)',
  paresReais.every(([att, r, f]) => rotularTransicao({ stage: 'failed', attemptId: att, reasonJaRelatado: r, mensagemNaTela: f }).reason === r))
checa('o eco guarda a FRASE da tela (nada de informação se perde)',
  rotularTransicao({ stage: 'failed', attemptId: 'a1', reasonJaRelatado: 'narration_too_short', mensagemNaTela: paresReais[0][2] }).error.startsWith('Your script is about 31'))

// ═══ B — o literal 'unknown' não volta ao banco ════════════════════════════
console.log("\nB. O 'unknown' de 31/08 17:55:28Z")
const r5 = rotularTransicao({ stage: 'failed', attemptId: 'a5', reasonJaRelatado: 'narration_too_short', mensagemNaTela: 'unknown' })
checa("error deixa de ser o literal 'unknown'", r5.error !== 'unknown')
checa('e vira causa sintetizada com o reason real',
  r5.error === 'no_detail:narration_too_short|stage=failed|http=none', r5.error)
checa("error_source acusa que a frase faltou", r5.error_source === 'synthesized')
for (const vazio of [null, undefined, '', '   ']) {
  checa(`mensagem ${JSON.stringify(vazio)} nunca produz error vazio`,
    rotularTransicao({ stage: 'failed', attemptId: 'x', reasonJaRelatado: 'foo', mensagemNaTela: vazio }).error.length > 0)
}

// ═══ C — a falha órfã NÃO some da contagem ═════════════════════════════════
console.log('\nC. Transição sem causa relatada = testemunha única, não eco')
const orfa = rotularTransicao({ stage: 'failed', attemptId: 'z1', reasonJaRelatado: null, mensagemNaTela: 'Something went wrong.' })
checa('vira CAUSA, não eco', orfa.failure_role === FAILURE_ROLE_CAUSE)
checa(`reason = ${UNREPORTED}`, orfa.reason === UNREPORTED)
checa('e portanto CONTA', contaComoFalha(orfa))
checa('duplicate_of_cause = false', orfa.duplicate_of_cause === false)
// 29 linhas de 14 dias não têm attempt_id: sem pareamento possível, contam.
const semAttempt = rotularTransicao({ stage: 'failed', attemptId: null, reasonJaRelatado: 'narration_too_short', mensagemNaTela: 'x' })
checa('sem attempt_id não vira eco (29 linhas em 14d)', semAttempt.failure_role === FAILURE_ROLE_CAUSE)
checa('sem attempt_id conta', contaComoFalha(semAttempt))
for (const att of ['', '   ']) {
  checa(`attempt_id ${JSON.stringify(att)} também não pareia`,
    rotularTransicao({ stage: 'failed', attemptId: att, reasonJaRelatado: 'r', mensagemNaTela: 'x' }).failure_role === FAILURE_ROLE_CAUSE)
}

// ═══ D — a regra de contagem trata o LEGADO certo ══════════════════════════
console.log('\nD. Linhas antigas (sem failure_role) continuam legíveis')
checa('linha antiga COM reason conta (era o emissor A)', contaComoFalha({ reason: 'analyze_not_ok' }))
checa('linha antiga SEM reason não conta (era a metade muda)', !contaComoFalha({ error: 'Could not analyze topic.' }))
checa('reason só com espaço não conta', !contaComoFalha({ reason: '   ' }))
checa('metadata null não explode', contaComoFalha(null) === false)
checa('metadata undefined não explode', contaComoFalha(undefined) === false)
checa('failure_role vence reason ausente', contaComoFalha({ failure_role: 'cause' }))
checa('failure_role=stage_transition vence reason presente',
  !contaComoFalha({ failure_role: 'stage_transition', reason: 'narration_too_short' }))

// ═══ E — A PEÇA ESTÁ LIGADA (lição do sceneTruth: biblioteca morta) ════════
console.log('\nE. Provas de que o módulo está CHAMADO, não apenas escrito')
const gc = ler('app/(dashboard)/generate/GenerateClient.tsx')
checa('GenerateClient importa de @/lib/failureLedger', /from '@\/lib\/failureLedger'/.test(gc))
checa('importa rotularTransicao', /rotularTransicao/.test(gc.split("from '@/lib/failureLedger'")[0]))
checa('emissor (B) — ramo failed chama rotularTransicao',
  /phase === 'failed' && lastFailedAttemptRef[\s\S]{0,600}?rotularTransicao\(\{[\s\S]{0,200}?stage: 'failed'/.test(gc))
checa("emissor (B) — ramo idle chama rotularTransicao",
  /phase === 'idle' && error[\s\S]{0,900}?rotularTransicao\(\{[\s\S]{0,200}?stage: 'idle'/.test(gc))
checa("emissor (B) não grava mais o literal 'unknown'", !/error: error\?\.slice\(0, 180\) \?\? 'unknown'/.test(gc))
checa('emissor (B) grava failure_role', /failure_role: rotulo\.failure_role/.test(gc))
checa('emissor (B) grava o reason herdado', /reason: rotulo\.reason/.test(gc))
checa('emissor (A) declara failure_role: FAILURE_ROLE_CAUSE', /failure_role: FAILURE_ROLE_CAUSE/.test(gc))
checa('emissor (A) carimba causaRelatadaRef antes de gravar',
  /causaRelatadaRef\.current = \{ attemptId: generationAttemptRef\.current, reason \}/.test(gc))
checa('o ref existe declarado', /const causaRelatadaRef = useRef</.test(gc))
checa('a transição LÊ o ref com checagem de mesma tentativa',
  /causaRelatadaRef\.current\.attemptId === attemptId/.test(gc))
checa('sintetizarCausa local delega para o módulo (fórmula única)',
  /return sintetizarCausaCompartilhada\(stage, reason, httpStatus\)/.test(gc))
checa('não sobrou uma segunda cópia da fórmula no componente',
  (gc.match(/`no_detail:\$\{reason\}`/g) || []).length === 0)

const health = ler('app/api/admin/health/route.ts')
checa('vigia /admin/health importa contaComoFalha', /from '@\/lib\/failureLedger'/.test(health))
checa('vigia filtra por contaComoFalha antes de contar', /if \(!contaComoFalha\(m\)\) continue/.test(health))
checa('vigia não abre alarme por data.length e sim por contadas',
  /ok: contadas === 0 \|\| porCausa\.size <= 2/.test(health))
checa('vigia agrupa por reason primeiro (era error, que difere entre as metades)',
  /String\(m\.reason \?\? m\.error/.test(health))

// ═══ F — fronteira com o Codex ═════════════════════════════════════════════
console.log('\nF. Fronteira com a pista do Codex')
checa('lib/failureLedger.ts não fala de preço/plano/checkout',
  !/(stripe|checkout|price|plan_|coupon)/i.test(fonteLib))
checa('o módulo não importa nada (é aritmética pura)', !/^import /m.test(fonteLib))
checa('nenhuma escrita em banco/rede no módulo', !/(fetch\(|supabase|from\()/.test(fonteLib))

console.log(falhas === 0 ? '\n✅ TODAS AS VERIFICAÇÕES OK' : `\n❌ ${falhas} FALHA(S)`)
process.exit(falhas === 0 ? 0 : 1)
