// ═══════════════════════════════════════════════════════════════════════════
// ⚰️ KINEO-PRICING-V6-2026-08-19 — CAMPANHA ENCERRADA. ESTA ROTA RESPONDE 410.
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ELA NÃO FOI "CORRIGIDA", E SIM APOSENTADA:
//
// Este e-mail não continha um preço desatualizado — ele ANUNCIAVA A EXISTÊNCIA
// do preço regional. O assunto era, literalmente, "Kineo is now ₹399/month in
// India", e o corpo inteiro é a notícia de que existe uma tabela indiana.
// Em 19/08 o fundador matou o preço por região (ver o bloco de TIER_PRICES em
// lib/checkoutPricing.ts): passou a existir UMA escada global — $7 / $15 / $29
// — mostrada na moeda local, sem segundo degrau por país.
//
// Trocar "₹399" por "₹599" aqui seria pior do que deixar quebrado: o e-mail
// continuaria dizendo "Kineo agora tem preço indiano, o que você viu antes era
// o preço internacional, isso foi corrigido" — uma notícia que deixou de ser
// verdade. E ele iria justamente para os 130 indianos ENGAJADOS, o público que
// menos pode receber uma segunda mudança de preço contraditória em duas
// semanas. Não existe edição de texto que salve uma campanha cuja premissa
// morreu; o que existe é não disparar.
//
// A rota é preservada (em vez de apagada) por três motivos concretos:
//   1. o evento `india_price_emailed_v1` continua na tabela `events` e este
//      arquivo é a única documentação de quem o gravou e por quê;
//   2. se alguém abrir a URL de admin por hábito (era DRY RUN por default), um
//      410 com explicação é infinitamente melhor que um 404 mudo — ou, pior,
//      que uma versão "consertada" que dispara de verdade;
//   3. o raciocínio do experimento (isolar "o muro da Índia é preço?") segue
//      válido como método, mesmo com a hipótese respondida de outro jeito.
//
// O QUE O E-MAIL DIZIA, PALAVRA POR PALAVRA (registro — não reutilizar):
//   Assunto: "Kineo is now ₹399/month in India"
//   Corpo:   "Kineo now has Indian pricing. The Starter plan is ₹399/month —
//             60 credits, watermark-free exports, every engine included."
//   P.S.:    "The Creator plan (140 credits ≈ 7 cinematic films/month) is half
//             price for your first month with code FIRST50."
//   → Hoje: não há preço indiano separado; o Starter concede 40 créditos e o
//     Creator 90; e não existe 1º mês pela metade em plano nenhum. Quatro
//     afirmações, quatro mortas, num único e-mail.
//
// ─── CONTEXTO ORIGINAL, PRESERVADO (KINEO-INDIA-399-2026-08-19) ─────────────
// O experimento do muro de preço (fundador: "vamos entender se realmente esse
// era um muro"). Medido em 14 dias: Índia = maior país do funil (70 signups —
// mais que os EUA), 17 chegaram ao checkout, ZERO pagaram. E todos os 280
// cadastros indianos históricos viram "$9.90/₹799" na vitrine, porque o preço
// regional (₹399, vivo no checkout desde 04/08) ficou invisível na home.
// A campanha alvejava os 130 indianos que JÁ GERARAM ≥1 vídeo (os engajados;
// os 150 que nunca geraram são frios). utm separado por link para medir o
// muro: se a Índia saísse de 0% de conversão, era preço; se continuasse 0%, o
// muro era outro (confiança / cartão internacional / UPI).
// Coorte: signup_country='IN', has_paid≠true, opt-in, e-mail real, ≥1 vídeo.
// Carimbo: evento `india_price_emailed_v1`, gravado SÓ no sucesso, nunca 2×.
// Padrão: clone do send-comeback50 — admin-gated, DRY RUN por default,
// ?confirm=SEND&limit=N para disparar, pacing de 600ms.
//
// ⚠️ A RESPOSTA QUE O EXPERIMENTO NUNCA DEU continua em aberto e é a pergunta
// mais cara do funil: o muro da Índia é PREÇO ou é outra coisa? A V6 responde
// metade sem querer — o Starter global caiu para $7 (≈₹599), bem abaixo dos
// ₹799 que essa coorte viu, ainda que acima dos ₹399 que nunca chegaram a ver.
// Se a Índia continuar em 0% com a escada nova, "era preço" fica difícil de
// sustentar. Se um novo teste for autorizado, ele nasce em rota NOVA, com
// premissa nova e evento novo — reanimar esta aqui reenviaria a notícia
// errada para gente que já recebeu uma.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GONE = {
  error: 'campaign_retired',
  campaign: 'india_price_399',
  retired_on: '2026-08-19',
  reason:
    'Kineo moved to a single global price ($7 / $15 / $29, shown in local currency). ' +
    'This campaign announced the existence of India-specific pricing, which no longer exists, ' +
    'so its premise — not just its numbers — is dead. It was retired instead of repriced.',
  see: 'lib/checkoutPricing.ts (TIER_PRICES) and this file for the full rationale.',
} as const

export async function GET() {
  return NextResponse.json(GONE, { status: 410 })
}

export async function POST() {
  return NextResponse.json(GONE, { status: 410 })
}
