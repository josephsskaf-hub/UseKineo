// KINEO-CREDIT-INTENT-2026-07-11 — SINGLE SOURCE OF TRUTH for per-engine credit
// cost. Extracted verbatim from app/api/compose/status/[renderId]/route.ts so
// that BOTH the place a render is BORN (/api/compose) and the place it is
// SETTLED (/api/compose/status) compute the price from the same function — no
// drift, no second copy to forget when prices change.
//
// The historical credit-leak class ("avatar nunca debitava por quality
// ausente", #315/#361) came from the billing amount being decided far from a
// trusted source. Keeping the cost table here, imported by every biller, is the
// structural guard against that.

export type Quality =
  | 'fast'
  | 'basic'
  | 'basic_ai'
  | 'pro'
  | 'cinematic_ai'
  | 'cinematic_kling'
  | 'cinematic_veo'
  | 'cinematic_sora'
  | 'cinematic_hollywood'
  | 'cinematic_h3'
  | 'cinematic_omni'
  | 'cinematic_s25'
  | 'avatar'
  | 'presenter'

// KINEO-PRICING-V3C-2026-07-10 — creditCostFor now takes isPaidUser so Fast
// can cost 1 credit for PAYING accounts while staying 0 for free users (the
// KINEO-ZERO-SIGNUP watch-free funnel is untouched).
export function creditCostFor(quality: Quality, isPaidUser = false): number {
  // Matches the per-quality cost shown to the user on the Generate screen.
  // The UI display lives in app/(dashboard)/generate/GenerateClient.tsx — keep
  // these two in sync when adjusting prices. Push #084 added 'fast' = 1
  // credit for the Pexels + TTS Fast Mode pipeline. Basic / Basic AI = 15,
  // Pro = 20. Push #315 added 'cinematic_ai' = 3 for fal.ai Wan 2.1.
  switch (quality) {
    case 'fast':
      // KINEO-ZERO-SIGNUP-2026-07-09 — Fast is FREE again (was 1cr since
      // KINEO-FAST-1CR-2026-07-06). InVideo model: render/watch free with
      // watermark, pay $4.90 to download (KINEO-DL-PAYWALL). Fast costs
      // ~$0.02-0.05 to serve — it's the growth engine, not the revenue line.
      // KINEO-PRICING-V3C-2026-07-10 — for PAYING accounts (has_paid=true or
      // any paid plan) Fast now costs 1 credit per video. Free users stay at
      // 0 (watermarked render). Paid clean exports cost 1 credit; a zero balance
      // is rejected before provider submission and never bypasses settlement.
      // ⚠️ KINEO-FAST-2CR-2026-08-19 — 1 → 2 CRÉDITOS para conta paga
      // (fundador: "é um vídeo muito bom pra ser um crédito, tem que aumentar").
      //
      // A MARGEM NUNCA FOI O PROBLEMA: o Kineo 1 custa $0,02-0,05 por render e
      // a 1 crédito já rendia ~70%. O problema é POSICIONAMENTO. A 1 crédito o
      // Starter entregava 40 vídeos por mês, e o cliente lê "1 crédito" como
      // "o vídeo mais barato" em vez de "o vídeo mais rápido" — desvaloriza
      // justamente o motor MAIS USADO da casa (138 renders em 7 dias, contra
      // 73 do Seedance).
      //
      // A 2 créditos: Starter faz 20 vídeos/mês (ainda muito), margem sobe de
      // ~70% para ~85%, e o motor deixa de parecer descartável.
      //
      // O GRÁTIS NÃO MUDA. Free segue em 0 — o funil de assistir-antes-de-pagar
      // (KINEO-ZERO-SIGNUP) é o que traz gente, e encarecê-lo seria cobrar
      // pedágio na porta de entrada.
      //
      // ⚠️ KINEO-FAST-5CR-2026-08-20 — 2 → 5 CRÉDITOS (decisão do fundador na
      // sessão de margem). O comentário acima ("custa $0,02-0,05, margem nunca
      // foi o problema") media só o VÍDEO — e o Kineo 1 não gera vídeo em
      // fornecedor (b-roll é Pexels, de graça). Medido o custo TOTAL do
      // entregável, a conta era outra: Creatomate ~$0,13/vídeo (já com os 24
      // fps de hoje) + OpenAI script/TTS ~$0,20 = ~$0,33 por vídeo, contra
      // $0,33 de receita a 2 créditos. Ou seja, o motor MAIS USADO da casa
      // rodava no zero a zero, e cada vídeo a mais só somava risco.
      //
      // A 5 créditos: receita $0,83 por vídeo, margem ~60%. E o posicionamento
      // fecha com a régua nova — 5 é 1/4 de um Seedance (20) e 1/30 de um
      // Kling 3 (150), que é honestamente a proporção de trabalho entre eles.
      //
      // O QUE ISSO CUSTA, DITO NA CARA: o volume por plano cai pela metade e
      // meia. Starter passa de 20 para 8 vídeos rápidos/mês, Creator de 45
      // para 18, e o trial de 25 para 10. O trial ainda passa folgado do 4º
      // vídeo (o limiar onde a conversão medida salta de 0,9% para 11,8%),
      // que é o número que essa decisão não podia quebrar — e não quebrou.
      return isPaidUser ? 5 : 0
    case 'avatar':
      // KINEO-AVATAR-120-2026-07-06 — AI Avatar folded into the UNIVERSAL
      // video_credits system (was the separate avatar_credits add-on @ 1/video).
      // KINEO-AVATAR-220-2026-07-07 — repriced 120→220 (real VEED cost ~$9.60/video).
      // KINEO-REBASE-2026-07-10 — 220 → 110 (2:1 credit rebase; same USD value).
      return 110
    case 'presenter':
      // KINEO-PRESENTER-2026-07-10 — AI Presenter (Kling AI Avatar v2 Standard).
      // 70 credits ≈ ~71% margin (Joseph subiu 60→70 em 10/07). Keep in sync with
      // AVATAR_CREDIT_COST in generate-avatar.
      return 70
    case 'cinematic_ai':
      // KINEO-REBASE-2026-07-10 — 40 → 20 (2:1 rebase).
      // KINEO-V6.1-2026-08-25 (fundador autorizou) — 20 → 25. A fatura de
      // agosto mediu $3.30/render TUDO-DENTRO (âncoras+retries) contra ~$2.15
      // de receita a 20cr: o motor MAIS USADO da casa rodava no VERMELHO. A
      // 25cr + fixes de retry/salvage de hoje, sai do prejuízo. O trial de
      // 25cr segue comprando EXATAMENTE 1 Seedance — storytelling intacto.
      // (O espelho SEEDANCE_CREDIT_COST da rota agora LÊ esta função.)
      return 25
    case 'cinematic_kling':
      // KINEO-KLING-90-2026-07-06 margin math intact.
      // KINEO-REBASE-2026-07-10 — 90 → 45 (2:1 rebase; same USD value).
      // KINEO-PRICING-V3B-2026-07-10 — 45 → 50 (margin bump). Keep in sync
      // with KLING_CREDIT_COST in generate-video-cinematic.
      return 50
    case 'cinematic_h3':
      // KINEO-H3-2026-08-19 — MiniMax H3 a 768p custa $0.06/s na fal: um filme
      // de 65s (o formato da casa, 60s+ por causa do TikTok Rewards) sai por
      // $3.90. A 45 créditos, ao preço por crédito do Creator ($0.1667), a
      // receita líquida é $7.00 e a margem fica em 44%.
      //
      // POR QUE 45 E NÃO 50 (que daria 50% de margem): a 50 o Creator, com 90
      // créditos, faz UM filme. A 45 ele faz DOIS. O motor existe justamente
      // porque o corte de grants da V6 deixou o Creator sem nenhum filme
      // carro-chefe (Kling 3 custa 150cr) — margem melhor num produto que não
      // cabe no plano vale zero.
      return 45
    case 'cinematic_veo':
      // #489/#491 — Veo 3.1 Fast premium. KINEO-REBASE — 180 → 90.
      // KINEO-V6.1-2026-08-25 — 90 → 100: custo fal ~$9.75/render vs ~$9.65
      // de receita = zero a zero. Ninguém escolhe Veo por $1 de diferença;
      // escolhe pelo nome Google. (Espelho VEO_CREDIT_COST agora lê daqui.)
      return 100
    case 'cinematic_sora':
      // #491 — Sora 2 premium (engine still BLOCKED upstream).
      // KINEO-REBASE-2026-07-10 — 200 → 100.
      return 100
    case 'cinematic_hollywood':
      // KINEO-REBASE-2026-07-10 — Hollywood = 150 créditos: preço FINAL aprovado
      // 10/07. Keep in sync with HOLLYWOOD_CREDIT_COST in generate-video-cinematic.
      return 150
    case 'cinematic_omni':
      // KINEO-OMNI-2026-08-25 — Gemini Omni Flash: #1 do ranking cego de
      // agosto (1245 Elo) a $0.13/s no fal — MAIS BARATO que o Kling 3
      // ($0.168/s). Mesma etiqueta de 150cr do Kling 3 = filme de 65s rende
      // $16 de receita sobre ~$8.50 de fal → margem ~47% contra ~30% do
      // Kling 3. O topo do catálogo fica com o topo do ranking, e a margem
      // melhora 17pp sem o cliente pagar um centavo a mais.
      return 150
    case 'cinematic_s25':
      // KINEO-S25-2026-09-01 — Seedance 2.5, 720p, preco POR TOKEN da fal
      // (~$0.462/s em 720p 9:16 24fps): um filme de 60s custa ~$27.70 de
      // fornecedor. A 150cr seria PREJUIZO (~$25 de receita) — a mesma
      // matematica que barrou o Seedance 2.0 em agosto. 250cr = ~$41.70 de
      // receita → margem ~33%. ⚠ ETIQUETA PROVISORIA: o motor esta TRANCADO
      // para contas internas (gate s25_internal_only na rota) ate o fundador
      // bater o martelo do preco publico — decisao que e SEMPRE dele.
      return 250
    case 'pro':
      // KINEO-REBASE-2026-07-10 — legacy 20 → 10.
      return 10
    case 'basic':
    case 'basic_ai':
    default:
      // KINEO-REBASE-2026-07-10 — legacy 15 → 8 (ceil of 15/2).
      return 8
  }
}

// KINEO-AVATAR-STUDIO-BILLING — fixed credit costs for the Avatar Studio helper
// endpoints that call paid fal models but are NOT part of the compose quality
// table above. Kept here (the single cost source-of-truth) so no route invents
// its own price. Charged via the same debit_video_credits RPC + deterministic
// billing reference as the avatar/gesture pipelines.
//   Voice clone (fal MiniMax voice-clone, ~$1.50/clone, one-time per voice).
// ═══ KINEO-DURACAO-2026-08-20 — O CRÉDITO PASSA A SEGUIR A DURAÇÃO ═══════
// Decisão do fundador ao abrir o tier de 90s. O motivo é aritmético e não dava
// para ignorar: o custo do fornecedor é LINEAR nos segundos gerados, mas o
// preço em créditos era FIXO por motor. Um Seedance de 90s consome 50% mais
// que um de 60s e cobrava igual:
//     35s → $0.94 de fal · 60s → $1.61 · 90s → $2.42
// A 20 créditos fixos, a margem caía de 72% (35s) para 27% (90s) — ou seja, o
// vídeo mais longo virava o mais barato por segundo justamente quando o dado
// do TikTok (6M vídeos, jan-jun/2026) mostra que 90s rende 9,6× mais views que
// 15-30s. Todo mundo migraria para o 90 e a margem cairia sozinha.
//
// A regra é a mais simples que resolve: proporcional ao alvo, com 60s como
// referência (o preço histórico de cada motor). Nada de tabela nova para
// manter — mexeu no custo base, os três tiers acompanham.
//     35s = 60% · 60s = 100% · 90s = 150%
// Arredonda para cima: nunca cobramos menos do que o fornecedor leva.
//
// ⚠️ O NÚMERO TEM DE APARECER ANTES DO CLIQUE. O /studio já mostra "Estimated
// cost"; ele passa a reagir ao seletor de duração. Preço que muda depois do
// clique é cobrança-surpresa — a mesma classe de erro que caçamos o dia todo.
export const DURATION_REFERENCE_SECONDS = 60

export function creditCostForDuration(
  quality: Quality,
  isPaidUser: boolean,
  seconds: number,
): number {
  const base = creditCostFor(quality, isPaidUser)
  if (base <= 0) return base // free tier segue 0 — a escala não cria cobrança onde não havia
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : DURATION_REFERENCE_SECONDS
  // Clamp defensivo: 10s..180s cobre todo SUPPORTED_DURATIONS com folga e
  // impede que um valor absurdo vindo da URL vire uma cobrança absurda.
  const clamped = Math.max(10, Math.min(180, safe))
  return Math.max(1, Math.ceil(base * (clamped / DURATION_REFERENCE_SECONDS)))
}

export const CLONE_VOICE_CREDIT_COST = 10
//   Scene generation (FLUX.1 Kontext edit + best-effort face-swap, ~cents).
export const SCENE_GEN_CREDIT_COST = 2

// KINEO-CREDIT-INTENT-2026-07-11 — normalize an arbitrary string (e.g. a value
// read back from the render_jobs intent row, or a client query param) into the
// Quality union. Anything unrecognized collapses to 'basic_ai' — the same
// defensive default the routes already used. Centralized here so the compose
// status route and any future biller validate identically.
export function normalizeQuality(raw: string | null | undefined): Quality {
  const q = (raw ?? '').toString()
  switch (q) {
    case 'fast':
    case 'basic':
    case 'basic_ai':
    case 'pro':
    case 'cinematic_ai':
    case 'cinematic_kling':
    case 'cinematic_veo':
    case 'cinematic_sora':
    case 'cinematic_hollywood':
    case 'cinematic_h3': // KINEO-H3-2026-08-19
    case 'cinematic_omni': // KINEO-OMNI-2026-08-25
    case 'cinematic_s25': // KINEO-S25-2026-09-01
    case 'avatar':
    case 'presenter':
      return q
    default:
      return 'basic_ai'
  }
}
