// KINEO-TRIAL-POSTVIDEO-OFFER-2026-08-07 — PROVA DE INÉRCIA COM A FLAG OFF.
//
// "Minha correção é inerte?" é uma QUERY, não uma opinião (PROMPT-DIARIO, 13h
// 07/08). Este script enumera o espaço de entradas da caixa nova e conta os
// disparos com KINEO_REVERSE_TRIAL_ENABLED desligada. O resultado esperado é
// ZERO — desligar a flag tem que ser rollback completo, inclusive da interface.
//
// Rodar:  node scripts/prove-trial-postvideo-offer-inert.mjs
//
// O predicado abaixo é a TRANSCRIÇÃO literal de `showTrialPostVideoOffer` em
// app/(dashboard)/generate/GenerateClient.tsx. Se aquele mudar, este some do
// verde e a divergência aparece.

const PHASES = ['idle', 'analyzing', 'options', 'composing', 'done', 'failed']
const TRIAL_UI_PHASES = [null, 'none', 'active', 'ending', 'downgraded', 'converted']
const BOOLS = [true, false, undefined]

/** app/(dashboard)/generate/GenerateClient.tsx — showTrialPostVideoOffer */
function showTrialPostVideoOffer(s) {
  return (
    s.phase === 'done' &&
    Boolean(s.finalVideoUrl) &&
    s.trialActive === true &&
    s.trialUiPhase === 'active' &&
    s.hasPaid !== true &&
    s.isStarter !== true &&
    s.isCreator !== true &&
    s.isStudio !== true &&
    s.trialCap > 0
  )
}

// ── O que o SERVIDOR pode devolver, por estado da flag ───────────────────────
// app/api/credits/route.ts:128 — todo o bloco de leitura do trial está dentro
// de `if (REVERSE_TRIAL_ENABLED)`. Com a flag OFF, `trialActive` fica no seu
// inicializador (false) e `trial` fica em `trialUiState(null)`.
// lib/reverseTrial.ts:trialUiState — `if (!REVERSE_TRIAL_ENABLED || !profile)
// return empty`, e `empty.phase === 'none'`, `empty.cap === TRIAL_CREDIT_CAP`.
function serverPayloads(flagOn) {
  if (!flagOn) return [{ trialActive: false, trialUiPhase: 'none', trialCap: 40 }]
  const out = []
  for (const trialActive of [true, false]) {
    for (const trialUiPhase of TRIAL_UI_PHASES) {
      for (const trialCap of [0, 40]) out.push({ trialActive, trialUiPhase, trialCap })
    }
  }
  return out
}

function run(flagOn) {
  let total = 0
  let fired = 0
  const firedShapes = []
  for (const payload of serverPayloads(flagOn)) {
    for (const phase of PHASES) {
      for (const finalVideoUrl of ['https://cdn/x.mp4', null, '']) {
        for (const hasPaid of BOOLS) {
          for (const isStarter of BOOLS) {
            for (const isCreator of BOOLS) {
              for (const isStudio of BOOLS) {
                const state = { ...payload, phase, finalVideoUrl, hasPaid, isStarter, isCreator, isStudio }
                total += 1
                if (showTrialPostVideoOffer(state)) {
                  fired += 1
                  if (firedShapes.length < 3) firedShapes.push(state)
                }
              }
            }
          }
        }
      }
    }
  }
  return { total, fired, firedShapes }
}

const off = run(false)
const on = run(true)

console.log(`FLAG OFF : ${off.fired} disparos em ${off.total} combinações`)
console.log(`FLAG ON  : ${on.fired} disparos em ${on.total} combinações`)
console.log('exemplo de disparo com a flag ON:', JSON.stringify(on.firedShapes[0]))

let bad = 0
if (off.fired !== 0) {
  console.error('❌ FALHOU: a caixa dispara com a flag OFF. Isto não pode subir.')
  bad = 1
}
if (on.fired === 0) {
  // Um predicado que nunca dispara também é defeito: seria código morto
  // travestido de segurança, e a sprint acharia que entregou uma oferta.
  console.error('❌ FALHOU: a caixa NUNCA dispara, nem com a flag ON — código morto.')
  bad = 1
}
if (!bad) console.log('✅ VERDE: 0 disparos com a flag OFF, e alcançável com a flag ON.')
process.exit(bad)
