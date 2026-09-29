// scripts/test-exit-intent-diz-a-verdade-2026-09-27.mjs
// sprint16h V1 (dom 27/09/2026, alvo MRR) — O MODAL DE SAÍDA E A COPY DO TRIAL
// DIZEM SÓ O QUE O CÓDIGO CUMPRE.
//
// O que estava no ar (origin/main 365e663a):
//   · components/ExitIntentOffer.tsx anunciava "$1 for 7 days of Creator" — um
//     trial DESLIGADO (lib/checkoutPricing.ts CARD_TRIAL_LIVE = false) — e
//     "enough for 0 Seedance films" (TRIAL_FILMS = 10 ÷ 25 = 0).
//   · lib/freeTierOffer.ts prometia "every engine unlocked — Kling 3 included"
//     em 3 frases que o ChatGPT lê: acesso é verdade, saldo é mentira (10cr não
//     compra um Seedance de 25, muito menos um Kling 3 de 150).
//
// Estilo da casa: readFileSync, sem alias @/, conta ocorrências (nunca morre na
// primeira falha), trava o literal ANTIGO em 0 e prova o novo. A parte C usa o
// mesmo carregador offline de scripts/test-llms-commercial-truth.mjs para ler o
// VALOR real das constantes — o texto pode parecer derivado e imprimir 0.

import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const falhas = []
const notas = []
let total = 0
function check(nome, condicao, detalhe) {
  total += 1
  if (condicao) return
  falhas.push(detalhe ? `${nome} — ${detalhe}` : nome)
}
const count = (texto, literal) => texto.split(literal).length - 1
const semComentarioDeLinha = (texto) =>
  texto.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\{\/\*)/.test(l)).join('\n')

const EXIT = readFileSync('components/ExitIntentOffer.tsx', 'utf8')
const FTO = readFileSync('lib/freeTierOffer.ts', 'utf8')
const LLMS = readFileSync('app/llms.txt/route.ts', 'utf8')
const EXIT_CODIGO = semComentarioDeLinha(EXIT)
const FTO_CODIGO = semComentarioDeLinha(FTO)

// ── A. o literal ANTIGO = 0 ─────────────────────────────────────────────────
check('A1 "for 7 days of Creator" = 0 em components/ExitIntentOffer.tsx',
  count(EXIT, 'for 7 days of Creator') === 0, `${count(EXIT, 'for 7 days of Creator')} ocorrência(s)`)
check('A2 "Kling 3 included" = 0 em lib/freeTierOffer.ts',
  count(FTO, 'Kling 3 included') === 0, `${count(FTO, 'Kling 3 included')} ocorrência(s)`)
check('A3 "including Kling 3" = 0 em lib/freeTierOffer.ts',
  count(FTO, 'including Kling 3') === 0, `${count(FTO, 'including Kling 3')} ocorrência(s)`)
check('A4 o modal não promete mais filmes de Seedance com o grant',
  !/enough for \$\{TRIAL_FILMS\}/.test(EXIT) && !/Seedance \$\{TRIAL_FILMS/.test(EXIT))
check('A5 nenhum href="/signup" pelado sobrou no modal',
  count(EXIT_CODIGO, 'href="/signup"') === 0)
{
  // Os selos "$1 / 7 DAYS" só podem existir no ramo `CARD_ENTRY_ONLY ? [...]`:
  // a linha que os carrega começa com "? [" e a linha anterior abre o ternário.
  const linhas = EXIT_CODIGO.split(/\r?\n/)
  const selosB = linhas.map((l, i) => [l, i]).filter(([l]) => /CREDITS FOR \$1|'7 DAYS'/.test(l))
  check('A6 os selos da porta de $1 só existem dentro do ramo CARD_ENTRY_ONLY (versão A não os mostra)',
    selosB.length === 1 && /^\s*\? \[/.test(selosB[0][0]) && /\(CARD_ENTRY_ONLY\s*$/.test(linhas[selosB[0][1] - 1]),
    `${selosB.length} linha(s) com os selos antigos`)
}

// ── B. o NOVO existe e é derivado, nunca digitado ───────────────────────────
const HREF = "/signup?utm_source=exit_intent&utm_medium=free_panel&utm_campaign=sprint0927"
check('B1 href do cadastro contém utm_source=exit_intent (utm triplo)',
  EXIT.includes(HREF) && EXIT.includes('utm_source=exit_intent'))
const tile = EXIT_CODIGO.split(/\r?\n/).find((l) => l.includes("exitPrice('starter')") && l.includes('cancel anytime')) || ''
check('B2 o tile do Starter lê preço do cobrador (getTierPrice+formatCheckoutMoney via exitPrice) e créditos de TIER_CREDITS.starter',
  tile.includes("exitPrice('starter')") && tile.includes('TIER_CREDITS.starter') && tile.includes('Starter ·'), tile.trim().slice(0, 120))
check('B3 o tile do Starter não digita preço nem crédito',
  tile !== '' && !/\$\d|\b\d{2,}\b/.test(tile.replace(/\$\{[^}]*\}/g, '')))
// Reancorado 29/09 (KINEO-ENTRADA-SEEDANCE15, E2b): a frase ganhou o ramo da entrada nova (SEEDANCE_15S_PUBLIC →
// TRIAL_SEEDANCE15_FILMS, filme grátis de 15 s); o ramo de hoje segue vindo de TRIAL_KINEO1_FILMS, derivado.
check('B4 "enough for N Kineo 1 film(s)" vem de TRIAL_KINEO1_FILMS (trialFilmsForEngine)',
  /enough for \$\{SEEDANCE_15S_PUBLIC \? /.test(EXIT) && /: `\$\{TRIAL_KINEO1_FILMS\} Kineo 1 \$\{TRIAL_KINEO1_FILMS === 1 \? 'film' : 'films'\}`\}/.test(EXIT))
check('B5 TRIAL_KINEO1_FILMS nasce de trialFilmsForEngine(creditCostForDuration(\'fast\', true, DURATION_REFERENCE_SECONDS))',
  /export const TRIAL_KINEO1_FILMS = trialFilmsForEngine\(\s*creditCostForDuration\('fast', true, DURATION_REFERENCE_SECONDS\),?\s*\)/.test(FTO))
check('B6 TRIAL_FILMS (Seedance) segue intacto — a constante não foi tocada',
  /export const TRIAL_FILMS = Math\.floor\(\s*G \/ creditCostForDuration\('cinematic_ai', true, 60\),?\s*\)/.test(FTO))
const NOVA = "free credits = ${TRIAL_KINEO1_FILMS} Kineo 1 ${TRIAL_KINEO1_FILMS_NOUN}; AI engines (Seedance, Veo, Kling) from Starter."
for (const campo of ['sentence', 'planCardBody', 'cmpKineoFree']) {
  // O campo aparece 3x no arquivo (interface, ON_COPY, CARD_ENTRY_TIER_COPY):
  // o valor é a própria linha (quando já abre o template) ou a seguinte. Só a
  // ocorrência de ON_COPY carrega ${G}; é ela que tem de publicar a frase nova.
  const linhas = FTO_CODIGO.split(/\r?\n/)
  const candidatos = linhas
    .map((l, i) => (new RegExp(`^\\s*${campo}:`).test(l) ? (l.includes('`') ? l : linhas[i + 1]) : null))
    .filter((l) => typeof l === 'string')
  const corpo = candidatos.find((l) => l.includes('${G}')) ?? (candidatos[0] ?? '')
  // cmpKineoFree diz "on signup" entre o grant e o "=" (é assim que as páginas
  // de comparação a leem); os outros dois campos não. A frase é a mesma.
  const novaRe = /\$\{G\} free credits( on signup)? = \$\{TRIAL_KINEO1_FILMS\} Kineo 1 \$\{TRIAL_KINEO1_FILMS_NOUN\}; AI engines \(Seedance, Veo, Kling\) from Starter\./
  check(`B7 ON_COPY.${campo} publica "\${G} ${NOVA}"`, novaRe.test(corpo), corpo.trim().slice(0, 140))
  check(`B8 ON_COPY.${campo} não digita número (fora de \${…} e do nome "Kineo 1")`,
    !/\d/.test(corpo.replace(/\$\{[^}]*\}/g, '').replace(/Kineo 1/g, '')), corpo.trim().slice(0, 140))
}
check('B9 CTA de quem já tem conta: "Back to Studio" → /studio, e o clique deslogado segue exit_intent_free_clicked',
  EXIT.includes("signedIn ? 'Back to Studio' : 'Sign up and make my first video'")
  && EXIT.includes("href={signedIn ? '/studio' : '" + HREF + "'}")
  && EXIT.includes("trackEvent('exit_intent_free_clicked', variant)")
  && EXIT.includes("trackEvent('exit_intent_back_to_studio_clicked', variant)"))
check('B10 a sessão é lida como o NavCreditsBadge lê (/api/credits → 401 sem sessão), só com o painel free aberto',
  /if \(!open \|\| variant !== 'free'\) return[\s\S]{0,200}fetch\('\/api\/credits'/.test(EXIT))

// ── C. os VALORES reais (carregador offline: sem rede, sem banco) ───────────
const load = createOfflineLoader({ env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' } })
const fto = load('lib/freeTierOffer.ts')
const cost = load('lib/credits/engineCost.ts')
const pricing = load('lib/checkoutPricing.ts')
const policy = load('lib/entryPolicy.ts')
const { SUPPORTED_DURATIONS } = load('lib/expandPolicy.ts')
const G = fto.TRIAL_CREDITS_SHOWN
const k1 = Math.floor(G / cost.creditCostForDuration('fast', true, cost.DURATION_REFERENCE_SECONDS))
check('C1 TRIAL_KINEO1_FILMS = grant ÷ custo pago do Kineo 1 de referência, e é ≥ 1',
  fto.TRIAL_KINEO1_FILMS === k1 && k1 >= 1, `TRIAL_KINEO1_FILMS=${fto.TRIAL_KINEO1_FILMS} esperado=${k1} (G=${G})`)
check('C2 o defeito de origem continua real: TRIAL_FILMS (Seedance) com o grant de hoje',
  Number.isInteger(fto.TRIAL_FILMS), `TRIAL_FILMS=${fto.TRIAL_FILMS}`)
notas.push(`grant mostrado G=${G} · Kineo 1 de referência=${cost.creditCostForDuration('fast', true, cost.DURATION_REFERENCE_SECONDS)}cr → ${k1} filme(s) · Seedance → TRIAL_FILMS=${fto.TRIAL_FILMS}`)
const on = fto.buildFreeTierOffer(true).copy
// cmpKineoFree diz "on signup" entre o grant e o "=": a frase é a mesma, com o
// aposto no lugar em que as páginas de comparação a leem.
const esperado = new RegExp(`${G} free credits( on signup)? = ${k1} Kineo 1 ${k1 === 1 ? 'film' : 'films'}; AI engines \\(Seedance, Veo, Kling\\) from Starter\\.`)
if (policy.CARD_ENTRY_ONLY) {
  notas.push('CARD_ENTRY_ONLY = true: a copy servida é a da porta de $1; C3/C4 medem a versão A só pelo texto (B7)')
} else {
  for (const campo of ['sentence', 'planCardBody', 'cmpKineoFree']) {
    check(`C3 copy servida .${campo} contém "${esperado.source}"`, esperado.test(on[campo]), on[campo])
    check(`C4 copy servida .${campo} não fala de Kling 3 nem de "every engine unlocked"`,
      !/Kling 3|every engine unlocked/.test(on[campo]), on[campo])
  }
}
// "AI engines (Seedance, Veo, Kling) from Starter" só é verdade se o saldo do
// Starter comprar pelo menos UM filme de cada família em alguma duração
// suportada (Veo 3.1 = 100cr/60s só cabe nos 60cr do Starter a 35s; o "Kling"
// da frase é o Kling 2.5 de 50cr — Kling 3 de 150cr é Creator, não Starter).
const starter = pricing.TIER_CREDITS.starter
for (const [nome, q] of [['Seedance', 'cinematic_ai'], ['Veo', 'cinematic_veo'], ['Kling (2.5)', 'cinematic_kling']]) {
  const minimo = Math.min(...SUPPORTED_DURATIONS.map((s) => cost.creditCostForDuration(q, true, s)))
  check(`C5 "${nome} from Starter" é verdade: menor filme suportado (${minimo}cr) cabe nos ${starter}cr do Starter`, minimo <= starter)
  check(`C6 "${nome} from Starter" é a PRIMEIRA linha verdadeira: o grant de ${G}cr não compra nenhum`, minimo > G)
}
check('C7 o tile do Starter no modal mostra o MESMO plano que o cobrador vende (TIER_CREDITS.starter é inteiro > 0)',
  Number.isInteger(starter) && starter > 0)

// ── D. /llms.txt continua coerente com a copy nova (linha do trial) ──────────
check('D1 llms.txt separa ACESSO de SALDO na linha do trial',
  LLMS.includes('Access does not mean the balance covers a full video.'))
check('D2 llms.txt publica o que o saldo do trial cobre, motor a motor',
  LLMS.includes('-credit trial balance covers: ${covered}') && LLMS.includes('It does not cover one full reference video on: ${balanceShort}'))
check('D3 llms.txt não afirma "Kling 3 included" no trial',
  count(LLMS, 'Kling 3 included') === 0 && count(LLMS, 'including Kling 3') === 0)

// ── veredito ─────────────────────────────────────────────────────────────────
console.log(notas.map((n) => `  · ${n}`).join('\n'))
if (falhas.length) {
  console.error(`\nEXIT-INTENT-DIZ-A-VERDADE: ${falhas.length} de ${total} REPROVARAM`)
  for (const f of falhas) console.error(`  ✗ ${f}`)
  process.exit(1)
}
console.log(`\nEXIT-INTENT-DIZ-A-VERDADE: ${total} verificações, todas verdes`)
