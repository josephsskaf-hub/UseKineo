// KINEO-RAZAO-ASSINANTE-2026-09-17 — guardião da razão do assinante no painel ao vivo.
// Caso: valos87196 (Creator desde 29/07): "73 cr = +150 Creator assinou 29/07 − 2 gastos ⚠ −75 sem
// origem". O −75 era adivinhação (TIER_CREDITS de hoje sobre um intro de 50). Sem rede, sem banco.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const check = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

const wh = read('app/api/stripe/webhook/route.ts')
console.log('1) o webhook grava no payment_success quanto o pagamento concedeu')
check('helper existe e só responde por assinatura', wh.includes("function firstPaymentCreditsFromSession(") && wh.includes("if (session.mode !== 'subscription') return null"))
check('a regra do helper é a MESMA do grant (card_trial → CARD_TRIAL, trial → TRIAL_GRANT, intro válido → intro_credits, senão TIER_CREDITS)',
  wh.includes("return isCardTrial ? CARD_TRIAL_GRANT_CREDITS : isTrial ? TRIAL_GRANT_CREDITS : introApplied ? Math.floor(introCreditsRaw) : planCredits")
  && wh.includes("const creditsToGrant = isCardTrial ? CARD_TRIAL_GRANT_CREDITS : isTrial ? TRIAL_GRANT_CREDITS : firstMonthCredits"))
check('o intro só vale quando intro=1, intro_credits > 0 e ≤ grant do plano (igual ao bloco do grant)', (wh.match(/introCreditsRaw <= planCredits/g) || []).length === 2)
check('o evento payment_success carrega credits_granted', /currency: session\.currency \?\? 'usd',\n\s*\/\/[^\n]*\n\s*credits_granted: firstPaymentCreditsFromSession\(session\),/.test(wh))

const rt = read('app/api/admin/live/route.ts')
console.log('2) o painel não adivinha mais o grant de compra antiga')
check('lê também a renovação recusada', rt.includes("['payment_success', 'subscription_invoice_paid', 'checkout_payment_failed']"))
check('o TIER_CREDITS de hoje NÃO entra mais como valor de payment_success', !rt.includes("else amt = Number(TIER_CREDITS[tierRaw as CheckoutPlanTier] ?? 0)"))
check('compra sem credits_granted vira "unknown" e sai da equação', rt.includes("if (registrado === null) {") && rt.includes("cur.unknown.push(dia || '?')"))
check('só entra na equação o que o evento registrou', rt.includes("const registrado = typeof md.credits_granted === 'number' && Number.isFinite(md.credits_granted) ? md.credits_granted : null"))
check('renovação recusada conta só is_renewal e guarda motivo traduzido', rt.includes("if (md.is_renewal !== true) continue") && rt.includes("cur.refusedWhy = MOTIVO_RECUSA[why] ?? why"))
check('com compra sem registro, o gap é 0 e a nota explica', rt.includes("const ledgerGap = saldoReal === null || ledgerNote ? 0 : saldoReal - expected") && rt.includes("sem registro de crédito (antes de 17/09)"))
check('assinante recebe a frase de dono: plano · desde · pagou · recusas · filmes · gastos', rt.includes("const assinante = isPayingPlan((p.plan as string) ?? null)") && rt.includes("`${filmes} filme${filmes === 1 ? '' : 's'}`") && rt.includes("`${lg.spent} cr gastos`") && rt.includes("renovação recusada ${subs.refused}×"))
check('a frase do assinante substitui a equação só para quem paga', rt.includes("const ledger = assinante ?? (terms.length > 0 ? `= ${terms.join(' ')}` : null)"))
check('o tipo e o retorno carregam ledgerNote', rt.includes("ledgerNote: string | null") && /ledgerGap,\n\s*ledgerNote,\n/.test(rt))

const pn = read('components/LiveNowPanel.tsx')
console.log('3) o painel mostra a nota em cinza, não em vermelho')
check('a nota renderiza guardada por v.ledgerNote', pn.includes("{v.ledgerNote && (") && pn.includes("· {v.ledgerNote}"))
check('o ⚠ continua para furo real', pn.includes("{v.ledgerGap !== 0 && ("))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
