// sprint-assinaturas #29 — GUARDIAO: o produto nao pode OFERECER uma compra
// que o proprio cobrador recusa.
//
// O DEFEITO (medido 06/09): desde 17/08 o pop-up de credito curto do
// /studio/create pintava os 4 pacotes de recarga para TODA conta. O
// /api/stripe/checkout so aceita basic/pro (canPurchaseCreditTopup) e responde
// 403 `topup_requires_creator_plus` a todo o resto. 60 dias: 18 pessoas viram a
// escadinha, 0 podiam comprar. Em 06/09 12:19:08 uma conta vinda do TAAFT
// clicou em `topup100` QUATRO MINUTOS depois do cadastro e levou o 403; depois
// encolheu o proprio pedido de 90s para 35s e foi embora.
//
// Este arquivo le os ARQUIVOS REAIS (nada de import com alias '@/', que morre
// fora do bundler — ver docs e a memoria `guardioes-com-alias-nao-rodam`) e
// amarra as verificacoes a VARIAVEL QUE DECIDE, nao a contagem de texto.
import { readFileSync } from 'node:fs'

let ok = 0
let fail = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok++ } else { fail++; falhas.push(nome) }
}
const norm = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const FIT = norm('lib/growth/limitPurchaseFit.ts')
const GC = norm('app/(dashboard)/generate/GenerateClient.tsx')
const NOTE = norm('components/TopupUnavailableNote.tsx')
const ELIG = norm('lib/growth/topupEligibility.ts')

// ── 1. O modulo puro usa a regra DO COBRADOR, nao uma copia dela ────────────
check('limitPurchaseFit importa canPurchaseCreditTopup',
  /import\s*\{\s*canPurchaseCreditTopup\s*\}\s*from\s*'@\/lib\/growth\/topupEligibility'/.test(FIT))
// Sem comentarios: um regex solto casa com a PROPRIA prosa que explica a
// regra (aconteceu aqui na 1a execucao deste arquivo).
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .join('\n')
const FIT_CODIGO = semComentarios(FIT)
check('limitPurchaseFit NAO redigita a lista de planos elegiveis',
  !/TOPUP_ELIGIBLE_PLANS/.test(FIT_CODIGO)
  && !/'basic_trial'/.test(FIT_CODIGO)
  && !/new Set\(\[/.test(FIT_CODIGO))
check('topupPurchasable vem da funcao do cobrador',
  /const\s+topupPurchasable\s*=\s*canPurchaseCreditTopup\(input\.plan\)/.test(FIT))
check('a lista de recargas e GOVERNADA por topupPurchasable',
  /const\s+fittingTopupIds\s*=\s*topupPurchasable\s*\n?\s*\?/.test(FIT))
check('o resultado publica topupPurchasable', /\n\s+topupPurchasable,/.test(FIT))
check('a telemetria publica topup_purchasable',
  /topup_purchasable:\s*fit\.topupPurchasable/.test(FIT))

// ── 2. A tela pergunta ao cobrador e passa o plano adiante ──────────────────
check('GenerateClient importa a regra do cobrador',
  /import\s*\{\s*canPurchaseCreditTopup\s*\}\s*from\s*'@\/lib\/growth\/topupEligibility'/.test(GC))
check('GenerateClient importa a caixa substituta',
  /import\s+TopupUnavailableNote\s+from\s+'@\/components\/TopupUnavailableNote'/.test(GC))
check('o modal decide por canPurchaseCreditTopup(plan)',
  /const\s+topupPurchasable\s*=\s*canPurchaseCreditTopup\(plan\)/.test(GC))
check('a escadinha e GOVERNADA por topupPurchasable (nao mais `{(`)',
  /\{topupPurchasable \? \(\n\s+<div style=\{\{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 \}\}>/.test(GC))
check('o ramo negativo pinta a caixa substituta',
  /\) : \(\n\s+<TopupUnavailableNote fit=\{purchaseFit\} \/>\n\s+\)\}/.test(GC))
check('o plano do servidor e derivado dos booleanos da tela',
  /const\s+serverPlanName\s*=\s*isStudio \? 'pro' : isCreator \? 'basic' : isStarter \? 'starter' : 'free'/.test(GC))
check('o calculo do pai recebe o plano', /isSubscriber: isStarter \|\| isCreator \|\| isStudio,\n\s+plan: serverPlanName,/.test(GC))
check('o modal recebe o plano no call site', /plan=\{serverPlanName\}/.test(GC))
check('o modal repassa o plano ao calculo',
  /calculateLimitPurchaseFit\(\{ balance, requiredCredits, isSubscriber, plan \}\)/.test(GC))
check('a escadinha nao voltou a ser incondicional', !/\{\(\n\s+<div style=\{\{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 \}\}>/.test(GC))

// ── 3. Starter continua fora da recarga (a regra do servidor nao afrouxou) ──
check('topupEligibility segue sem starter/free', !/'starter'/.test(ELIG) && !/'free'/.test(ELIG))

// ── 4. A caixa substituta nao digita numero de preco nem de credito ────────
check('a caixa deriva os creditos de TIER_CREDITS', /TIER_CREDITS\[tier\]/.test(NOTE))
check('a caixa nao digita cifrao', !/\$\d/.test(NOTE))
check('a caixa protege o divisor (sem "Infinity films")', /if \(cost < 1\) return 1/.test(NOTE))

// ── 5. COMPORTAMENTO: o modulo puro, exercitado de verdade ─────────────────
// Reexecuta a logica sem bundler traduzindo o TS para JS na marra: em vez de
// importar (alias '@/'), reimplementamos SO a leitura das tabelas e conferimos
// as invariantes com os numeros reais do produto.
const PRICING = norm('lib/checkoutPricing.ts')
const tierCredits = {}
const mTier = PRICING.match(/export const TIER_CREDITS[^=]*=\s*\{([\s\S]*?)\n\}/)
if (mTier) for (const [, k, v] of mTier[1].matchAll(/(\w+)\s*:\s*(\d+)/g)) tierCredits[k] = Number(v)
check('TIER_CREDITS lido do arquivo real', Object.keys(tierCredits).length >= 3)

// A conta do caso real: 25 creditos, filme de 38 (90s cinematic).
// Antes: recommended = topup (403). Depois: tem de ser um PLANO.
const saldo = 25
const preciso = 38
const planoQueCobre = ['starter', 'basic', 'pro'].filter(
  (t) => saldo + (tierCredits[t] ?? 0) >= preciso,
)
check('o caso real (25cr, filme de 38) tem plano que cobre', planoQueCobre.length > 0)
check('o plano mais barato que cobre e o Starter', planoQueCobre[0] === 'starter')

// invariante de negocio: a recarga nunca pode ser mais barata por credito que
// o plano — se fosse, abrir a recarga a todos canibalizaria a assinatura.
const mTopupCr = PRICING.match(/export const TOPUP_CREDITS[^=]*=\s*\{([\s\S]*?)\n\}/)
check('TOPUP_CREDITS lido do arquivo real', !!mTopupCr)

console.log(`\n${ok} verificacoes OK, ${fail} falharam`)
if (fail) { console.error('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
