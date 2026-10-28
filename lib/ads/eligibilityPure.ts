// KINEO-ADS-SIMPLES-2810 — UMA régua de elegibilidade do Studio Ads (fundador 28/10: "simplificar e fazer funcionar o ads sem bugs").
//
// POR QUÊ: havia três sistemas de amostra grátis sobrepostos (adsSampleOpen do Close real/apresentador, o livro-razão da
// Escolha e o sample_probe) e cada tela/rota perguntava a um diferente. Em produção (26-27/10), 15 pessoas de fora bateram
// no /ads/v2 e foram devolvidas à parede /ads?from=v2 — a página antiga só abria para quem adsSampleOpen aprovava.
// AGORA: a decisão do produto é o livro-razão da Escolha (lib/ads/cena/escolhaSampleServer.ts, 1 amostra por pessoa para
// sempre, teto de US$ por dia) e esta função PURA diz, para qualquer conta, UM de quatro estados:
//   'paid'                  → assinante/passe/parceiro/casa (adsGate 'ok'): faz anúncios com crédito;
//   'free_sample_available' → ainda não usou a amostra, conta elegível, teto do dia com folga;
//   'free_sample_used'      → já usou a dela (entregue ou não): vê a própria amostra e a próxima com plano;
//   'not_eligible'          → não ganha amostra, com o MOTIVO (region, unconfirmed_email, disposable, blocked,
//                             budget_exhausted_today, sample_off, ledger_unavailable). Nunca é devolvida à parede.
// Fundador 28/10: amostra SÓ para os países do filme grátis (PAISES_FILME_GRATIS, lib/freeFilmPolicy.ts) e país
// desconhecido = FECHADO (ao contrário do cadastro, que é fail-open): rm3513692 (hindi, 26/10) e anooo10117 (árabe, 24/10)
// ganharam amostra com trial_status 'active' e país nenhum no cadastro.
// MÓDULO PURO (só importa a lista pura de países): a página, as rotas, a porta /ads, os cards e o guardião
// scripts/test-ads-simples-2810.mjs executam as MESMAS funções. Quem lê o banco é lib/ads/eligibility.ts.
import { PAISES_FILME_GRATIS } from '@/lib/freeFilmPolicy'

export type AdsEligibilityState = 'paid' | 'free_sample_available' | 'free_sample_used' | 'not_eligible'
export type AdsEligibilityReason = 'region' | 'unconfirmed_email' | 'disposable' | 'blocked' | 'budget_exhausted_today' | 'sample_off' | 'ledger_unavailable' | null

export interface AdsEligibilityDecision {
  state: AdsEligibilityState
  reason: AdsEligibilityReason
}

/** O que o servidor leu (lib/ads/eligibility.ts) — null = leitura que falhou (falha FECHADA, nunca aberta). */
export interface AdsEligibilityInput {
  gate: 'ok' | 'no_access' | 'closed'
  sampleLive: boolean
  /** já existe linha no livro-razão (ads_escolha_samples) para esta pessoa? null = livro ilegível */
  used: boolean | null
  emailConfirmed: boolean
  disposable: boolean
  /** trial_status barrado (lib/ads/sample.ts adsSampleTrialStatusBlocked: 'blocked' | 'region_paid_only') */
  trialBlocked: boolean
  /** o melhor sinal de país (adsSampleCountry), já normalizado; null = nenhum sinal */
  country: string | null
  /** centavos já reservados HOJE (UTC) no livro do dia; null = leitura falhou */
  reservedCentsToday: number | null
  dailyCapCents: number
  estimateCents: number
}

/** 'XX'/'T1' e vazio = a Vercel não soube; o mesmo filtro de lib/freeFilmPolicy.ts normalizarPais (privada lá). */
export function adsSampleCountryNormalize(country: unknown): string | null {
  if (typeof country !== 'string') return null
  const c = country.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(c) || c === 'XX' || c === 'T1') return null
  return c
}

/**
 * O melhor sinal de país disponível, na ordem dada (pedido atual → last_country → signup_country): o PRIMEIRO
 * conhecido decide; nenhum conhecido = null. Fail-closed mora em adsSampleCountryAllowed (null → false).
 */
export function adsSampleCountry(signals: ReadonlyArray<unknown>): string | null {
  for (const s of signals) {
    const c = adsSampleCountryNormalize(s)
    if (c) return c
  }
  return null
}

/** A amostra grátis do anúncio abre para este país? País desconhecido = NÃO (decisão do fundador 28/10). */
export function adsSampleCountryAllowed(country: string | null | undefined): boolean {
  const c = adsSampleCountryNormalize(country)
  return c !== null && PAISES_FILME_GRATIS.includes(c)
}

/** A decisão, na ordem das portas. Quem já usou vê a própria amostra MESMO se hoje a região/teto barrariam. */
export function adsEligibilityDecide(i: AdsEligibilityInput): AdsEligibilityDecision {
  if (i.gate === 'ok') return { state: 'paid', reason: null }
  if (i.used === null) return { state: 'not_eligible', reason: 'ledger_unavailable' }
  if (i.used === true) return { state: 'free_sample_used', reason: null }
  if (!i.sampleLive) return { state: 'not_eligible', reason: 'sample_off' }
  if (!i.emailConfirmed) return { state: 'not_eligible', reason: 'unconfirmed_email' }
  if (i.disposable) return { state: 'not_eligible', reason: 'disposable' }
  if (i.trialBlocked) return { state: 'not_eligible', reason: 'blocked' }
  if (!adsSampleCountryAllowed(i.country)) return { state: 'not_eligible', reason: 'region' }
  if (i.reservedCentsToday === null || !Number.isFinite(i.reservedCentsToday)) return { state: 'not_eligible', reason: 'ledger_unavailable' }
  if (i.reservedCentsToday + i.estimateCents > i.dailyCapCents) return { state: 'not_eligible', reason: 'budget_exhausted_today' }
  return { state: 'free_sample_available', reason: null }
}

/** Quem pode CRIAR um anúncio agora (pago ou amostra). 'free_sample_used' e 'not_eligible' entram na tela, mas criam só com plano. */
export function adsEligibilityCanCreate(state: AdsEligibilityState): boolean {
  return state === 'paid' || state === 'free_sample_available'
}

/**
 * A porta honesta: o botão só diz "grátis" para o visitante (que ainda vai se cadastrar) e para quem tem a amostra
 * disponível. Para todo o resto, "Make a product ad" — e a tela explica o preço em créditos.
 */
export function adsDoorSaysFree(signedIn: boolean, state: AdsEligibilityState | null | undefined): boolean {
  if (!signedIn) return true
  return state === 'free_sample_available'
}

/** Início do PRÓXIMO dia UTC (quando o teto do dia reabre), ISO. */
export function adsSampleCapResetIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
}

// ─── as frases da tela por estado (en · pt · es; outra língua = inglês) ──────────────────────────────────────────────
export interface AdsEligibilityCopy {
  /** título do aviso */
  title: string
  /** a explicação honesta, com {credits} (crédito do anúncio completo) e {reset} (hora UTC em que o teto reabre) */
  body: string
  /** o botão de planos */
  plans: string
}
type Lang3 = 'en' | 'pt' | 'es'
const COPY: Record<Lang3, Record<Exclude<AdsEligibilityReason, null> | 'used', AdsEligibilityCopy>> = {
  en: {
    used: { title: 'You already made your free sample ad.', body: 'Your next ad is the full version: 15 s, no watermark, {credits} credits. Pick a plan and your choices stay saved.', plans: 'See plans' },
    region: { title: 'Free sample ads are available in selected countries.', body: 'You can still make your ad now with a plan: 15 s, your product, no watermark, {credits} credits per ad.', plans: 'See plans' },
    unconfirmed_email: { title: 'Confirm your email to get your free sample ad.', body: 'Open the confirmation link we sent you, then come back here. Or make your ad now with a plan ({credits} credits per ad).', plans: 'See plans' },
    disposable: { title: 'The free sample needs a personal email address.', body: 'Disposable addresses do not qualify. Sign up with your own email, or make your ad now with a plan ({credits} credits per ad).', plans: 'See plans' },
    blocked: { title: 'The free sample is not available on this account.', body: 'You can still make your ad now with a plan: 15 s, your product, no watermark, {credits} credits per ad.', plans: 'See plans' },
    budget_exhausted_today: { title: "Today's free ads are taken.", body: 'Come back tomorrow (the free allowance resets at {reset} UTC), or make it now with a plan: {credits} credits per ad.', plans: 'See plans' },
    sample_off: { title: 'Free sample ads are paused right now.', body: 'You can still make your ad now with a plan: 15 s, your product, no watermark, {credits} credits per ad.', plans: 'See plans' },
    ledger_unavailable: { title: 'We could not check your free sample right now.', body: 'Nothing was started. Try again in a moment, or make your ad now with a plan ({credits} credits per ad).', plans: 'See plans' },
  },
  pt: {
    used: { title: 'Você já fez a sua amostra grátis.', body: 'O próximo anúncio é a versão completa: 15 s, sem marca, {credits} créditos. Escolha um plano e as suas escolhas ficam guardadas.', plans: 'Ver planos' },
    region: { title: 'A amostra grátis está disponível em países selecionados.', body: 'Você pode fazer o seu anúncio agora com um plano: 15 s, o seu produto, sem marca, {credits} créditos por anúncio.', plans: 'Ver planos' },
    unconfirmed_email: { title: 'Confirme o seu e-mail para ganhar a amostra grátis.', body: 'Abra o link de confirmação que enviamos e volte aqui. Ou faça o seu anúncio agora com um plano ({credits} créditos por anúncio).', plans: 'Ver planos' },
    disposable: { title: 'A amostra grátis pede um e-mail pessoal.', body: 'Endereços descartáveis não valem. Cadastre-se com o seu e-mail, ou faça o seu anúncio agora com um plano ({credits} créditos por anúncio).', plans: 'Ver planos' },
    blocked: { title: 'A amostra grátis não está disponível nesta conta.', body: 'Você pode fazer o seu anúncio agora com um plano: 15 s, o seu produto, sem marca, {credits} créditos por anúncio.', plans: 'Ver planos' },
    budget_exhausted_today: { title: 'As amostras grátis de hoje acabaram.', body: 'Volte amanhã (a cota reabre às {reset} UTC) ou faça agora com um plano: {credits} créditos por anúncio.', plans: 'Ver planos' },
    sample_off: { title: 'A amostra grátis está pausada no momento.', body: 'Você pode fazer o seu anúncio agora com um plano: 15 s, o seu produto, sem marca, {credits} créditos por anúncio.', plans: 'Ver planos' },
    ledger_unavailable: { title: 'Não conseguimos conferir a sua amostra grátis agora.', body: 'Nada foi iniciado. Tente de novo em instantes, ou faça o seu anúncio agora com um plano ({credits} créditos por anúncio).', plans: 'Ver planos' },
  },
  es: {
    used: { title: 'Ya hiciste tu anuncio de muestra gratis.', body: 'Tu próximo anuncio es la versión completa: 15 s, sin marca de agua, {credits} créditos. Elige un plan y tus elecciones quedan guardadas.', plans: 'Ver planes' },
    region: { title: 'La muestra gratis está disponible en países seleccionados.', body: 'Puedes hacer tu anuncio ahora con un plan: 15 s, tu producto, sin marca de agua, {credits} créditos por anuncio.', plans: 'Ver planes' },
    unconfirmed_email: { title: 'Confirma tu correo para recibir la muestra gratis.', body: 'Abre el enlace de confirmación que te enviamos y vuelve aquí. O haz tu anuncio ahora con un plan ({credits} créditos por anuncio).', plans: 'Ver planes' },
    disposable: { title: 'La muestra gratis necesita un correo personal.', body: 'Las direcciones desechables no califican. Regístrate con tu propio correo, o haz tu anuncio ahora con un plan ({credits} créditos por anuncio).', plans: 'Ver planes' },
    blocked: { title: 'La muestra gratis no está disponible en esta cuenta.', body: 'Puedes hacer tu anuncio ahora con un plan: 15 s, tu producto, sin marca de agua, {credits} créditos por anuncio.', plans: 'Ver planes' },
    budget_exhausted_today: { title: 'Las muestras gratis de hoy se agotaron.', body: 'Vuelve mañana (el cupo se reabre a las {reset} UTC) o hazlo ahora con un plan: {credits} créditos por anuncio.', plans: 'Ver planes' },
    sample_off: { title: 'La muestra gratis está en pausa por ahora.', body: 'Puedes hacer tu anuncio ahora con un plan: 15 s, tu producto, sin marca de agua, {credits} créditos por anuncio.', plans: 'Ver planes' },
    ledger_unavailable: { title: 'No pudimos comprobar tu muestra gratis ahora.', body: 'No se inició nada. Inténtalo de nuevo en un momento, o haz tu anuncio ahora con un plan ({credits} créditos por anuncio).', plans: 'Ver planes' },
  },
}

/** As frases do aviso para quem entrou SEM poder criar de graça (null = estado que não precisa de aviso). */
export function adsEligibilityCopy(d: AdsEligibilityDecision, language: string | null | undefined, fill: { credits: number; resetIso?: string | null }): AdsEligibilityCopy | null {
  const key = d.state === 'free_sample_used' ? 'used' : d.state === 'not_eligible' && d.reason ? d.reason : null
  if (!key) return null
  const lang: Lang3 = language === 'pt' || language === 'es' ? language : 'en'
  const c = COPY[lang][key]
  const reset = fill.resetIso ? fill.resetIso.slice(11, 16) : '00:00'
  const sub = (s: string) => s.replace('{credits}', String(fill.credits)).replace('{reset}', reset)
  return { title: sub(c.title), body: sub(c.body), plans: c.plans }
}

// ─── toda recusa de /api/ads/v2/* vira frase com próximo passo (item 5 do plano de 28/10) ──────────────────────────
export type AdsRefusalNext = 'plans' | 'wait' | 'signin' | 'edit' | 'retry' | 'order' | 'confirm_email'
export interface AdsRefusalCopy { message: string; next: AdsRefusalNext }
const REFUSAL: Record<Lang3, Record<string, AdsRefusalCopy>> = {
  en: {
    unauthenticated: { message: 'Your session ended. Sign in again to continue.', next: 'signin' },
    no_access: { message: 'Making this ad needs a plan with Studio Ads (or credits for one ad). Your choices stay here.', next: 'plans' },
    closed: { message: 'Studio Ads is paused for new ads right now. Nothing was charged. Please try again later.', next: 'wait' },
    cena_internal_only: { message: 'This ad type is not open on your account yet. Make your ad with the standard flow.', next: 'plans' },
    v2_closed: { message: 'The ad maker is not open on your account yet.', next: 'plans' },
    out_of_credits: { message: 'You do not have enough credits for this ad. Add credits or pick a plan; your choices stay saved.', next: 'plans' },
    insufficient_credits: { message: 'You do not have enough credits for this ad. Add credits or pick a plan; your choices stay saved.', next: 'plans' },
    cena_photo_credits_required: { message: 'To prepare the stills, keep enough credits for one ad or use a plan. Credits are only used when the video is generated.', next: 'plans' },
    credits_unavailable: { message: 'We could not read your balance. Nothing was charged. Try again in a moment.', next: 'retry' },
    ads_sample_used: { message: 'This account already used its free sample. Generate the full version to continue.', next: 'plans' },
    ads_sample_cap: { message: "Today's free samples are taken. Come back tomorrow, or make the full version now with a plan.", next: 'wait' },
    ads_sample_account_blocked: { message: 'The free sample needs a confirmed, personal email in a supported country. You can make the full version with a plan.', next: 'confirm_email' },
    ads_sample_account_required: { message: 'The free sample needs a confirmed, personal email in a supported country. You can make the full version with a plan.', next: 'confirm_email' },
    ads_sample_region: { message: 'Free sample ads are available in selected countries. You can make your ad now with a plan.', next: 'plans' },
    ads_sample_disabled: { message: 'Free samples are paused right now. You can make the full version with a plan.', next: 'plans' },
    ads_sample_unavailable: { message: 'We could not check sample availability. Nothing was started. Try again shortly.', next: 'retry' },
    ads_sample_result_required: { message: 'The full version starts from a delivered sample. Open your sample result first.', next: 'order' },
    ads_sample_retry_unavailable: { message: 'We could not resume this purchase automatically. Nothing was charged. Contact us and we will finish it by hand.', next: 'retry' },
    daily_limit: { message: 'You reached today’s limit for this action. Try again tomorrow.', next: 'wait' },
    cena_photo_daily_limit: { message: 'You reached the daily limit of still rounds. Choose one of the stills you already have, or come back tomorrow.', next: 'wait' },
    cena_photo_round_limit: { message: 'This order used all its still rounds. Choose one of the available stills to generate the video.', next: 'edit' },
    cena_stills_busy: { message: 'Your stills are already being prepared. Check this order in a moment.', next: 'order' },
    cena_still_choice_required: { message: 'Choose one still before generating the video.', next: 'edit' },
    cena_choice_locked: { message: 'This order already has a chosen still. Generate the video from it, or start another plan.', next: 'order' },
    cena_choice_plan_required: { message: 'This order was made in the previous flow. Start a new plan to choose person, scene and stills.', next: 'edit' },
    moderation: { message: 'This text was blocked by our safety check. Remove claims about health, weapons, adult content or other people, then try again.', next: 'edit' },
    moderation_unavailable: { message: 'Our safety check is unavailable right now. Nothing was charged. Try again in a minute.', next: 'retry' },
    not_startable: { message: 'This order is already running or finished. Open it to see the result.', next: 'order' },
    another_active: { message: 'You already have an ad in progress. Wait for it to finish, then start the next one.', next: 'order' },
    order_not_found: { message: 'We could not find this order on your account. Start a new plan.', next: 'edit' },
    not_editable: { message: 'This order can no longer be edited. Start a new plan.', next: 'edit' },
    link_unreachable: { message: 'We could not read that product page. Check the link, or add your product name and photo by hand.', next: 'edit' },
    link_import_failed: { message: 'We could not read that product page. Add your product name and photo by hand.', next: 'edit' },
    escolha_spoken_core_exceeds_15s: { message: 'The product name and call to action do not fit in 15 seconds. Shorten the text and prepare another plan.', next: 'edit' },
    escolha_scenario_category_mismatch: { message: 'The photo looks like another category. Check the category and choose a matching scene.', next: 'edit' },
    escolha_script_language_unavailable: { message: 'We could not prepare the speech in this language. Try again; no still or video was generated.', next: 'retry' },
    cena_order_failed: { message: 'We could not save your order. Nothing was charged. Try again in a moment.', next: 'retry' },
    start_failed: { message: 'We could not start the video. Any charge is refunded automatically. Try again in a moment.', next: 'retry' },
    plan_failed: { message: 'We could not prepare the plan. Nothing was charged. Try again in a moment.', next: 'retry' },
    unavailable: { message: 'The ad maker is temporarily unavailable. Nothing was charged. Try again in a minute.', next: 'retry' },
    not_ready: { message: 'The ad maker is being updated. Try again in a minute.', next: 'retry' },
  },
  pt: {
    unauthenticated: { message: 'Sua sessão terminou. Entre novamente para continuar.', next: 'signin' },
    no_access: { message: 'Fazer este anúncio pede um plano com Studio Ads (ou créditos para um anúncio). Suas escolhas ficam aqui.', next: 'plans' },
    closed: { message: 'O Studio Ads está pausado para anúncios novos agora. Nada foi cobrado. Tente mais tarde.', next: 'wait' },
    cena_internal_only: { message: 'Este tipo de anúncio ainda não está aberto na sua conta. Faça o seu anúncio pelo fluxo padrão.', next: 'plans' },
    v2_closed: { message: 'O montador de anúncios ainda não está aberto na sua conta.', next: 'plans' },
    out_of_credits: { message: 'Você não tem créditos suficientes para este anúncio. Adicione créditos ou escolha um plano; suas escolhas ficam guardadas.', next: 'plans' },
    insufficient_credits: { message: 'Você não tem créditos suficientes para este anúncio. Adicione créditos ou escolha um plano; suas escolhas ficam guardadas.', next: 'plans' },
    cena_photo_credits_required: { message: 'Para preparar as fotos, tenha créditos para um anúncio ou use um plano. Os créditos só são usados ao gerar o vídeo.', next: 'plans' },
    credits_unavailable: { message: 'Não conseguimos ler o seu saldo. Nada foi cobrado. Tente de novo em instantes.', next: 'retry' },
    ads_sample_used: { message: 'Esta conta já usou a amostra grátis. Gere a versão completa para continuar.', next: 'plans' },
    ads_sample_cap: { message: 'As amostras grátis de hoje acabaram. Volte amanhã ou faça a versão completa agora com um plano.', next: 'wait' },
    ads_sample_account_blocked: { message: 'A amostra grátis pede e-mail confirmado e pessoal, em país atendido. Você pode fazer a versão completa com um plano.', next: 'confirm_email' },
    ads_sample_account_required: { message: 'A amostra grátis pede e-mail confirmado e pessoal, em país atendido. Você pode fazer a versão completa com um plano.', next: 'confirm_email' },
    ads_sample_region: { message: 'A amostra grátis está disponível em países selecionados. Você pode fazer o seu anúncio agora com um plano.', next: 'plans' },
    ads_sample_disabled: { message: 'A amostra grátis está pausada no momento. Você pode fazer a versão completa com um plano.', next: 'plans' },
    ads_sample_unavailable: { message: 'Não conseguimos conferir a disponibilidade da amostra. Nada foi iniciado. Tente de novo em instantes.', next: 'retry' },
    ads_sample_result_required: { message: 'A versão completa parte de uma amostra entregue. Abra o resultado da sua amostra primeiro.', next: 'order' },
    ads_sample_retry_unavailable: { message: 'Não conseguimos retomar esta compra sozinhos. Nada foi cobrado. Fale com a gente e terminamos à mão.', next: 'retry' },
    daily_limit: { message: 'Você chegou ao limite de hoje para esta ação. Tente amanhã.', next: 'wait' },
    cena_photo_daily_limit: { message: 'Você chegou ao limite diário de rodadas de fotos. Escolha uma das fotos que já tem, ou volte amanhã.', next: 'wait' },
    cena_photo_round_limit: { message: 'Este pedido usou todas as rodadas de fotos. Escolha uma das fotos disponíveis para gerar o vídeo.', next: 'edit' },
    cena_stills_busy: { message: 'Suas fotos já estão sendo preparadas. Consulte este pedido em instantes.', next: 'order' },
    cena_still_choice_required: { message: 'Escolha uma foto antes de gerar o vídeo.', next: 'edit' },
    cena_choice_locked: { message: 'Este pedido já tem uma foto escolhida. Gere o vídeo com ela, ou comece outro plano.', next: 'order' },
    cena_choice_plan_required: { message: 'Este pedido é do fluxo anterior. Comece um plano novo para escolher pessoa, cenário e fotos.', next: 'edit' },
    moderation: { message: 'Este texto foi barrado pela nossa checagem de segurança. Tire afirmações sobre saúde, armas, conteúdo adulto ou outras pessoas e tente de novo.', next: 'edit' },
    moderation_unavailable: { message: 'A checagem de segurança está indisponível agora. Nada foi cobrado. Tente em um minuto.', next: 'retry' },
    not_startable: { message: 'Este pedido já está rodando ou terminou. Abra-o para ver o resultado.', next: 'order' },
    another_active: { message: 'Você já tem um anúncio em andamento. Espere ele terminar e comece o próximo.', next: 'order' },
    order_not_found: { message: 'Não achamos este pedido na sua conta. Comece um plano novo.', next: 'edit' },
    not_editable: { message: 'Este pedido não pode mais ser editado. Comece um plano novo.', next: 'edit' },
    link_unreachable: { message: 'Não conseguimos ler essa página de produto. Confira o link, ou coloque o nome e a foto do produto à mão.', next: 'edit' },
    link_import_failed: { message: 'Não conseguimos ler essa página de produto. Coloque o nome e a foto do produto à mão.', next: 'edit' },
    escolha_spoken_core_exceeds_15s: { message: 'O nome do produto e a chamada final não cabem em 15 segundos. Encurte o texto e prepare outro plano.', next: 'edit' },
    escolha_scenario_category_mismatch: { message: 'A foto parece ser de outra categoria. Confira a categoria e escolha um cenário correspondente.', next: 'edit' },
    escolha_script_language_unavailable: { message: 'Não conseguimos preparar a fala neste idioma. Tente de novo; nenhuma foto ou vídeo foi gerado.', next: 'retry' },
    cena_order_failed: { message: 'Não conseguimos guardar o seu pedido. Nada foi cobrado. Tente de novo em instantes.', next: 'retry' },
    start_failed: { message: 'Não conseguimos iniciar o vídeo. Qualquer cobrança é estornada sozinha. Tente de novo em instantes.', next: 'retry' },
    plan_failed: { message: 'Não conseguimos preparar o plano. Nada foi cobrado. Tente de novo em instantes.', next: 'retry' },
    unavailable: { message: 'O montador está temporariamente indisponível. Nada foi cobrado. Tente em um minuto.', next: 'retry' },
    not_ready: { message: 'O montador está sendo atualizado. Tente em um minuto.', next: 'retry' },
  },
  es: {
    unauthenticated: { message: 'Tu sesión terminó. Inicia sesión de nuevo para continuar.', next: 'signin' },
    no_access: { message: 'Hacer este anuncio requiere un plan con Studio Ads (o créditos para un anuncio). Tus elecciones quedan aquí.', next: 'plans' },
    closed: { message: 'Studio Ads está en pausa para anuncios nuevos. No se cobró nada. Inténtalo más tarde.', next: 'wait' },
    cena_internal_only: { message: 'Este tipo de anuncio aún no está abierto en tu cuenta. Haz tu anuncio con el flujo estándar.', next: 'plans' },
    v2_closed: { message: 'El creador de anuncios aún no está abierto en tu cuenta.', next: 'plans' },
    out_of_credits: { message: 'No tienes créditos suficientes para este anuncio. Agrega créditos o elige un plan; tus elecciones quedan guardadas.', next: 'plans' },
    insufficient_credits: { message: 'No tienes créditos suficientes para este anuncio. Agrega créditos o elige un plan; tus elecciones quedan guardadas.', next: 'plans' },
    cena_photo_credits_required: { message: 'Para preparar las fotos, ten créditos para un anuncio o usa un plan. Los créditos solo se usan al generar el video.', next: 'plans' },
    credits_unavailable: { message: 'No pudimos leer tu saldo. No se cobró nada. Inténtalo en un momento.', next: 'retry' },
    ads_sample_used: { message: 'Esta cuenta ya usó su muestra gratis. Genera la versión completa para continuar.', next: 'plans' },
    ads_sample_cap: { message: 'Las muestras gratis de hoy se agotaron. Vuelve mañana o haz la versión completa ahora con un plan.', next: 'wait' },
    ads_sample_account_blocked: { message: 'La muestra gratis requiere un correo confirmado y personal, en un país admitido. Puedes hacer la versión completa con un plan.', next: 'confirm_email' },
    ads_sample_account_required: { message: 'La muestra gratis requiere un correo confirmado y personal, en un país admitido. Puedes hacer la versión completa con un plan.', next: 'confirm_email' },
    ads_sample_region: { message: 'La muestra gratis está disponible en países seleccionados. Puedes hacer tu anuncio ahora con un plan.', next: 'plans' },
    ads_sample_disabled: { message: 'La muestra gratis está en pausa por ahora. Puedes hacer la versión completa con un plan.', next: 'plans' },
    ads_sample_unavailable: { message: 'No pudimos comprobar la disponibilidad de la muestra. No se inició nada. Inténtalo en un momento.', next: 'retry' },
    ads_sample_result_required: { message: 'La versión completa parte de una muestra entregada. Abre primero el resultado de tu muestra.', next: 'order' },
    ads_sample_retry_unavailable: { message: 'No pudimos retomar esta compra automáticamente. No se cobró nada. Escríbenos y la terminamos a mano.', next: 'retry' },
    daily_limit: { message: 'Llegaste al límite de hoy para esta acción. Inténtalo mañana.', next: 'wait' },
    cena_photo_daily_limit: { message: 'Llegaste al límite diario de rondas de fotos. Elige una de las fotos que ya tienes, o vuelve mañana.', next: 'wait' },
    cena_photo_round_limit: { message: 'Este pedido usó todas sus rondas de fotos. Elige una de las fotos disponibles para generar el video.', next: 'edit' },
    cena_stills_busy: { message: 'Tus fotos ya se están preparando. Consulta este pedido en un momento.', next: 'order' },
    cena_still_choice_required: { message: 'Elige una foto antes de generar el video.', next: 'edit' },
    cena_choice_locked: { message: 'Este pedido ya tiene una foto elegida. Genera el video con ella, o empieza otro plan.', next: 'order' },
    cena_choice_plan_required: { message: 'Este pedido es del flujo anterior. Empieza un plan nuevo para elegir persona, escena y fotos.', next: 'edit' },
    moderation: { message: 'Nuestra revisión de seguridad bloqueó este texto. Quita afirmaciones sobre salud, armas, contenido adulto u otras personas e inténtalo de nuevo.', next: 'edit' },
    moderation_unavailable: { message: 'La revisión de seguridad no está disponible ahora. No se cobró nada. Inténtalo en un minuto.', next: 'retry' },
    not_startable: { message: 'Este pedido ya está en marcha o terminó. Ábrelo para ver el resultado.', next: 'order' },
    another_active: { message: 'Ya tienes un anuncio en marcha. Espera a que termine y empieza el siguiente.', next: 'order' },
    order_not_found: { message: 'No encontramos este pedido en tu cuenta. Empieza un plan nuevo.', next: 'edit' },
    not_editable: { message: 'Este pedido ya no se puede editar. Empieza un plan nuevo.', next: 'edit' },
    link_unreachable: { message: 'No pudimos leer esa página de producto. Revisa el enlace, o pon el nombre y la foto del producto a mano.', next: 'edit' },
    link_import_failed: { message: 'No pudimos leer esa página de producto. Pon el nombre y la foto del producto a mano.', next: 'edit' },
    escolha_spoken_core_exceeds_15s: { message: 'El nombre del producto y la llamada final no caben en 15 segundos. Acorta el texto y prepara otro plan.', next: 'edit' },
    escolha_scenario_category_mismatch: { message: 'La foto parece de otra categoría. Revisa la categoría y elige una escena que coincida.', next: 'edit' },
    escolha_script_language_unavailable: { message: 'No pudimos preparar la voz en este idioma. Inténtalo de nuevo; no se generó ninguna foto ni video.', next: 'retry' },
    cena_order_failed: { message: 'No pudimos guardar tu pedido. No se cobró nada. Inténtalo en un momento.', next: 'retry' },
    start_failed: { message: 'No pudimos iniciar el video. Cualquier cobro se devuelve automáticamente. Inténtalo en un momento.', next: 'retry' },
    plan_failed: { message: 'No pudimos preparar el plan. No se cobró nada. Inténtalo en un momento.', next: 'retry' },
    unavailable: { message: 'El creador no está disponible temporalmente. No se cobró nada. Inténtalo en un minuto.', next: 'retry' },
    not_ready: { message: 'El creador se está actualizando. Inténtalo en un minuto.', next: 'retry' },
  },
}
/** Só a tabela: a frase do código, ou null (a tela decide o que fazer com código desconhecido). */
export function adsV2RefusalFor(code: unknown, language: string | null | undefined): AdsRefusalCopy | null {
  const lang: Lang3 = language === 'pt' || language === 'es' ? language : 'en'
  const table = REFUSAL[lang]
  const key = typeof code === 'string' ? code : ''
  if (table[key]) return table[key]
  if (key.startsWith('moderation')) return table.moderation
  return null
}
/** Códigos que a tela não conhece caem numa frase honesta por STATUS, nunca num código cru. */
export function adsV2RefusalCopy(code: unknown, status: number, language: string | null | undefined): AdsRefusalCopy {
  const lang: Lang3 = language === 'pt' || language === 'es' ? language : 'en'
  const table = REFUSAL[lang]
  const known = adsV2RefusalFor(code, language)
  if (known) return known
  if (status === 401) return table.unauthenticated
  if (status === 402) return table.out_of_credits
  if (status === 403) return table.no_access
  if (status === 429) return table.daily_limit
  if (status === 409) return table.not_startable
  return table.unavailable
}
