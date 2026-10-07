// KINEO-FILME-GRATIS-POR-PAIS-2026-09-29 — o interruptor da "saída B" do fundador (29/09: "vou sair na saída B").
//
// A decisão: o filme grátis (o trial de 10 créditos) passa a ser SÓ para país rico. O dado que sustenta: em 30 dias,
// 0 pagantes vieram de BR e MX, e os cadastros de países de renda baixa consomem fal sem nunca virar assinatura.
// Quem fica fora nasce com trial_status='region_paid_only' e 0 crédito (lib/reverseTrial.ts): a tela e a rota já
// recusam render de IA sem saldo, e a varredura de trial órfão (que só lê trial_status NULL) não o recredita.
//
// ⛔ POR QUE NASCEU EM 'todos': uma conta 'region_paid_only' continuava sendo plano grátis — passava pela cota
// semanal de Kineo 1 (compose isFreePlanFast) e pelo "1º filme" com clipes de IA da generate-video-fast. Ordem
// cumprida: E1 → E2a (15 s) → E2b (entrada no Seedance) → E3 (textos) → E4 (KINEO-E4-SAIDA-B-2026-09-29).
// ✅ E4 LIGA A B: a cota de Kineo 1 morreu (lib/freeTierOffer ON_OFFER.limit=0), o Kineo 1 grátis é recusado no
// servidor ANTES de qualquer fornecedor (lib/kineo1Gate.ts, na generate-video-fast e no compose free-plan-fast), e a
// cota semanal nova (1 Seedance 15 s, lib/freeWeeklyFilm.ts) só vale para país desta lista e nunca para
// 'region_paid_only'. scripts/test-e4-saida-b-cota-seedance-2026-09-29.mjs prova as três coisas executando o código.
// Contas que já existem não perdem nada: a régua só age na CONCESSÃO do trial (lib/reverseTrial.ts).
//
// Módulo PURO (sem env, sem banco, sem import) — o servidor e os guardiões leem a mesma régua.
export type FreeFilmPolicy = 'todos' | 'pais_rico'

export const FREE_FILM_POLICY: FreeFilmPolicy = 'pais_rico'

/**
 * ISO-3166 alfa-2 dos países que recebem o filme grátis sob 'pais_rico'. Alta renda: América do Norte anglófona,
 * Reino Unido/Irlanda, Oceania, União Europeia + EEE + Suíça, Ásia rica e Golfo + Israel.
 * MX FORA de propósito (0 pagantes em 30 dias). BR voltou em 03/10 por decisão do fundador (KINEO-BRASIL-VOLTA-2026-10-03).
 * Mudar a lista é decisão do fundador.
 */
export const PAISES_FILME_GRATIS: readonly string[] = [
  // América do Norte, Reino Unido e Irlanda, Oceania
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ',
  // União Europeia
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEE e Suíça
  'NO', 'IS', 'LI', 'CH',
  // Ásia rica
  'JP', 'KR', 'SG', 'HK', 'TW',
  // Golfo e Israel
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL',
  'BR', // KINEO-BRASIL-VOLTA-2026-10-03 — fundador (03/10): o Brasil vende (checkout em reais, Kineo Empresas). Reverter = apagar esta linha.
]

/** Status gravado em profiles.trial_status para quem ficou fora do filme grátis (texto livre, sem CHECK no banco). */
export const REGION_PAID_ONLY_TRIAL_STATUS = 'region_paid_only'
/** Evento de servidor da recusa (metadata: { country }). */
export const TRIAL_REGION_EXCLUDED_EVENT = 'trial_region_excluded'

function normalizarPais(country: string | null | undefined): string | null {
  if (typeof country !== 'string') return null
  const c = country.trim().toUpperCase()
  // 'XX'/'T1' e vazio = a Vercel não soube (Tor, rede privada): sem sinal.
  if (!/^[A-Z]{2}$/.test(c) || c === 'XX' || c === 'T1') return null
  return c
}

/**
 * Esta conta pode receber o filme grátis? Política 'todos' → sempre. País ausente/desconhecido → concede (mesma
 * filosofia fail-open da digital do aparelho: sem sinal não se pune ninguém). Senão, só os da lista.
 */
export function filmeGratisPermitido(country: string | null | undefined, policy: FreeFilmPolicy = FREE_FILM_POLICY): boolean {
  if (policy === 'todos') return true
  const c = normalizarPais(country)
  if (c === null) return true
  return PAISES_FILME_GRATIS.includes(c)
}

/**
 * KINEO-E4-CONSERTO-2026-09-29 (revisão de dinheiro, achado 4) — a régua ESTRITA da cota semanal: país CONHECIDO e na
 * lista. Diferente de filmeGratisPermitido (fail-open do cadastro, decisão da E1), aqui país desconhecido ('XX', 'T1'
 * do Tor, cabeçalho ausente) NÃO passa: é crédito recorrente, e o fail-open abria a cota a conta antiga de fora da lista
 * pelo Tor. Devolve o código normalizado (para fixar o país da 1ª vez) ou null.
 */
export function paisDaListaConfirmado(country: string | null | undefined): string | null {
  const c = normalizarPais(country)
  if (c === null) return null
  return PAISES_FILME_GRATIS.includes(c) ? c : null
}

// ═══ KINEO-E4-SAIDA-B-2026-09-29 — a verdade pública e a tela de quem ficou fora ═══════════════════════════════════
// Texto público (llms.txt, /facts, /api/facts, páginas que citam o filme grátis): com 'pais_rico' o filme grátis é
// "in supported countries". A cláusula DERIVA da política — nenhuma lista de país é digitada em texto público, e virar
// a política para 'todos' apaga a cláusula sozinha. Lida por lib/freeTierOffer.ts (FREE_FILM_LABEL).
export const FREE_FILM_COUNTRY_CLAUSE: string = FREE_FILM_POLICY === 'pais_rico' ? ' in supported countries' : ''

/** A conta nasceu fora do filme grátis (e segue sem pagar)? Só ela vê o aviso; pagou → some. */
export function regionPaidOnlyNoticeVisible(row: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null } | null | undefined): boolean {
  if (!row || row.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) return false
  if (row.has_paid === true) return false
  const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : 'free'
  return plan === 'free' || plan === ''
}

/** Aviso honesto (nunca um erro seco) — pt/en/es; outras línguas da interface caem no inglês. Botão leva aos planos. */
export interface RegionPaidOnlyNoticeCopy { title: string; body: string; cta: string }
export const REGION_PAID_ONLY_NOTICE: { en: RegionPaidOnlyNoticeCopy; pt: RegionPaidOnlyNoticeCopy; es: RegionPaidOnlyNoticeCopy } = {
  en: {
    title: 'The free film is not available in your country yet',
    body: 'Plans work normally here: pick one and every engine is yours, with clean downloads.',
    cta: 'See plans',
  },
  pt: {
    title: 'O filme grátis ainda não está disponível no seu país',
    body: 'Os planos funcionam normalmente: escolha um e todos os motores ficam liberados, com download sem marca d’água.',
    cta: 'Ver planos',
  },
  es: {
    title: 'La película gratis todavía no está disponible en tu país',
    body: 'Los planes funcionan con normalidad: elige uno y todos los motores quedan disponibles, con descargas sin marca de agua.',
    cta: 'Ver planes',
  },
}
export const REGION_PAID_ONLY_PLANS_HREF = '/pricing'
/** Recusa de servidor para a conta 'region_paid_only' (inglês: a rota não sabe a língua da interface). */
export const REGION_PAID_ONLY_REFUSAL = `${REGION_PAID_ONLY_NOTICE.en.title}. ${REGION_PAID_ONLY_NOTICE.en.body} Nothing was charged.`

// KINEO-CLIPE-GRATIS-REGIAO-2026-10-05 — decisão do fundador (05/10, noite, item 1A): "por 0,27 eu topo liberar para esses
// países que não têm tanto poder aquisitivo, pelo menos um clipe grátis de 5 segundos". Quem nasce 'region_paid_only' ganha,
// no cadastro, os créditos de 1 clipe de 5 s (lib/reverseTrial.ts: compare-and-set em trial_status='region_paid_only' e
// video_credits=0 — nunca dá duas vezes, nunca sobrescreve saldo). 5 cr = 1 clipe de 5 s no Seedance 1.5 (US$ 0,13 na fal)
// ou no Kling 2.5 (US$ 0,35, o teto). O filme narrado continua recusado para essas contas (REGION_PAID_ONLY_REFUSAL,
// intacto). O guardião scripts/test-clipe-gratis-regiao-2026-10-05.mjs confere que o número bate com
// clipCreditCost('seedance', 5) de lib/clips/clipPricing.ts (espelho, sem import: este módulo também roda no navegador).
export const REGION_FREE_CLIP_PUBLIC = true
export const REGION_FREE_CLIP_CREDITS = 5
export const REGION_FREE_CLIP_GRANTED_EVENT = 'region_free_clip_granted'
export const REGION_FREE_CLIP_HREF = '/clips'
/** A faixa do topo enquanto o clipe grátis está disponível (pt/en/es; as outras línguas da interface caem no inglês). */
export const REGION_FREE_CLIP_NOTICE: { en: RegionPaidOnlyNoticeCopy; pt: RegionPaidOnlyNoticeCopy; es: RegionPaidOnlyNoticeCopy } = {
  en: {
    title: 'Your first clip is free',
    body: 'The free film is not available in your country yet, but your first 5-second clip is on us. Plans unlock every engine, with clean downloads.',
    cta: 'Make my free clip',
  },
  pt: {
    title: 'Seu primeiro clipe é grátis',
    body: 'O filme grátis ainda não está disponível no seu país, mas o seu primeiro clipe de 5 segundos é por nossa conta. Os planos liberam todos os motores, com download sem marca d’água.',
    cta: 'Fazer meu clipe grátis',
  },
  es: {
    title: 'Tu primer clip es gratis',
    body: 'La película gratis todavía no está disponible en tu país, pero tu primer clip de 5 segundos va por nuestra cuenta. Los planes desbloquean todos los motores, con descargas sin marca de agua.',
    cta: 'Hacer mi clip gratis',
  },
}
/** A faixa oferece o clipe grátis enquanto o saldo cobre 1 clipe: some quando a pessoa usa e volta se o clipe falhar e for estornado. */
export function regionFreeClipAvailable(row: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null; video_credits?: number | null } | null | undefined): boolean {
  if (!REGION_FREE_CLIP_PUBLIC || !regionPaidOnlyNoticeVisible(row)) return false
  return typeof row?.video_credits === 'number' && row.video_credits >= REGION_FREE_CLIP_CREDITS
}

/** País do request pela Vercel (x-vercel-ip-country); null sem cabeçalho. */
export function paisDoRequest(h: { get(name: string): string | null } | null | undefined): string | null {
  try {
    return normalizarPais(h?.get('x-vercel-ip-country') ?? null)
  } catch {
    return null
  }
}

// ═══ KINEO-SAIDA-REGIAO-2026-10-07 — A SAÍDA DE QUEM NASCE 'region_paid_only' (fundador 07/10: "vai pra tudo") ══════════
// O DADO (Supabase, 28/09 → 07/10, só SELECT): 78 de 194 cadastros (40%) nasceram 'region_paid_only' (IN 16 · EG 9 · JO 6 ·
// PK 6 · NG 4 …); 0 fizeram filme e 0 compraram. O clipe grátis de 5 s chegou a 75 e 4 usaram; 11 abriram o checkout de
// um PLANO e nenhum pagou. A decisão são DUAS coisas, cada uma com o seu interruptor — os dois moram AQUI e só aqui:
//   (a) REGION_FREE_FILM_LIVE — UM filme Seedance 1.5 de 15 s por conta, do jeito que o resto do mundo tem o teste. Os
//       créditos do filme entram NO CADASTRO (lib/reverseTrial.ts, a mesma transição que marca a região, DEPOIS da digital
//       do aparelho: a régua do teste, 2 ativações por digital em 30 dias, quem passa vira 'blocked'); o cinematic admite só
//       Seedance 1.5 a 15 s, só conta 'region_paid_only' sem pagar, só se ela NUNCA teve filme (sem janela: não é cota
//       semanal) e reconfere depois de gravar o próprio claim. O débito é o de sempre; render que falha estorna.
//       O clipe grátis de 5 s CONTINUA (decisão no docs/DECISAO-SAIDA-REGIAO-2026-10-07.md): a faixa anuncia o filme
//       primeiro e o clipe depois; o crédito do clipe não é tocado.
//   (b) REGION_PASS_OFFER_LIVE — o passe avulso (?pack=starter) na moeda local, na parede e logo depois do filme grátis
//       (lib/regionPass.ts, app/api/region-pass, components/RegionPassOffer.tsx).
// false = o comportamento de hoje, byte a byte (scripts/test-saida-regiao-2026-10-07.mjs prova executando).
export const REGION_FREE_FILM_LIVE = false
export const REGION_PASS_OFFER_LIVE = false

/** O filme grátis de região é o MESMO filme da cota semanal (lib/freeWeeklyFilm.ts FREE_WEEKLY_FILM_QUALITY/SECONDS). */
export const REGION_FREE_FILM_QUALITY = 'cinematic_ai' as const
export const REGION_FREE_FILM_SECONDS = 15
/**
 * Créditos do filme = creditCostForDuration('cinematic_ai', true, 15) — a função que o cinematic COBRA (hoje 9). Espelho
 * sem import (este módulo roda no navegador e não importa nada); o guardião confere contra a função e contra
 * FREE_WEEKLY_FILM_CREDITS. Não é crédito novo: é video_credits, o saldo de sempre, debitado e estornado como sempre.
 */
export const REGION_FREE_FILM_CREDITS = 9
export const REGION_FREE_FILM_GRANTED_EVENT = 'region_free_film_granted'
export const REGION_FREE_FILM_USED_EVENT = 'region_free_film_used'
/** A trava de pedidos simultâneos recusou (nada cobrado). metadata.reason diz qual leitura. */
export const REGION_FREE_FILM_REFUSED_EVENT = 'region_free_film_refused'
/** Onde a faixa leva: o Studio já abre o Seedance na maior duração que o saldo paga (lib/growth/entradaSeedance15.ts). */
export const REGION_FREE_FILM_HREF = '/studio?engine=seedance&duration=15'

export type RegionFreeFilmReason = 'eligible' | 'disabled' | 'not_region' | 'paid'

/** A conta pode usar o filme grátis de região? A MESMA régua da faixa (regionPaidOnlyNoticeVisible) + o interruptor. */
export function regionFreeFilmEligibility(
  row: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null } | null | undefined,
  live: boolean = REGION_FREE_FILM_LIVE,
): RegionFreeFilmReason {
  if (!live) return 'disabled'
  if (!row || row.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) return 'not_region'
  if (!regionPaidOnlyNoticeVisible(row)) return 'paid'
  return 'eligible'
}

/** Quanto o cadastro soma pelo filme: o custo de 1 filme com o interruptor ligado; 0 desligado. */
export function regionFreeFilmGrantCredits(live: boolean = REGION_FREE_FILM_LIVE): number {
  return live ? REGION_FREE_FILM_CREDITS : 0
}

/**
 * A admissão no cinematic: Seedance 1.5, 15 s, conta elegível e NENHUM filme dela (não falho) — na vida da conta, não "na
 * semana". `priorFilms` null = não consegui contar → não admite (falha fechada: é dinheiro).
 */
export function regionFreeFilmAdmissible(input: {
  quality: string
  durationSeconds: number
  eligibility: RegionFreeFilmReason
  priorFilms: number | null
}): boolean {
  return (
    input.quality === REGION_FREE_FILM_QUALITY &&
    input.durationSeconds === REGION_FREE_FILM_SECONDS &&
    input.eligibility === 'eligible' &&
    input.priorFilms === 0
  )
}

/**
 * A trava de pedidos simultâneos, DEPOIS de gravar o próprio claim (o "inserir e depois auditar" dos holds): nenhum outro
 * crédito reservado e nenhum débito `cinematic-*` não estornado NA VIDA da conta. `lifetimeCinematicDebits` null = a
 * leitura falhou → recusa. Render que falha é estornado (refunded_at) e o filme volta.
 */
export function regionFreeFilmExclusive(input: { otherActiveHold: boolean; lifetimeCinematicDebits: number | null }): boolean {
  return input.otherActiveHold === false && input.lifetimeCinematicDebits === 0
}

/** A faixa anuncia o filme grátis enquanto ele existe: elegível, saldo ≥ 1 filme e nenhum vídeo feito ainda. */
export function regionFreeFilmAvailable(
  row: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null; video_credits?: number | null } | null | undefined,
  videosCount: number | null | undefined,
  live: boolean = REGION_FREE_FILM_LIVE,
): boolean {
  if (regionFreeFilmEligibility(row, live) !== 'eligible') return false
  if (videosCount !== 0) return false
  return typeof row?.video_credits === 'number' && row.video_credits >= REGION_FREE_FILM_CREDITS
}

/** Recusa de servidor com o filme ligado: o filme de região EXISTE, esta conta só não pode usá-lo neste pedido. */
export const REGION_FREE_FILM_REFUSAL =
  'Your free film is one 15-second Seedance 1.5 film per account. Plans work normally here: pick one and every engine is yours, with clean downloads. Nothing was charged.'
/** Recusa da trava de simultâneos (só chega a quem a admissão deixou passar). Sem prometer data. */
export const REGION_FREE_FILM_IN_USE_MESSAGE =
  'Your free film is already in progress or done. Nothing was charged — see the plans to keep creating.'

/** As faixas com o filme ligado — nenhuma diz "não disponível no seu país" (com o filme no ar, seria mentira). */
export const REGION_FREE_FILM_NOTICE: { en: RegionPaidOnlyNoticeCopy; pt: RegionPaidOnlyNoticeCopy; es: RegionPaidOnlyNoticeCopy } = {
  en: {
    title: 'Your first film is free',
    body: 'A 15-second Seedance 1.5 film from your own idea, on us (with a small Kineo watermark). Plans unlock every engine, with clean downloads.',
    cta: 'Make my free film',
  },
  pt: {
    title: 'Seu primeiro filme é grátis',
    body: 'Um filme de 15 segundos no Seedance 1.5, a partir da sua ideia, por nossa conta (com uma pequena marca d’água da Kineo). Os planos liberam todos os motores, com download sem marca d’água.',
    cta: 'Fazer meu filme grátis',
  },
  es: {
    title: 'Tu primera película es gratis',
    body: 'Una película de 15 segundos en Seedance 1.5, a partir de tu idea, por nuestra cuenta (con una pequeña marca de agua de Kineo). Los planes desbloquean todos los motores, con descargas sin marca de agua.',
    cta: 'Hacer mi película gratis',
  },
}
export const REGION_FREE_CLIP_NOTICE_FILM_LIVE: { en: RegionPaidOnlyNoticeCopy; pt: RegionPaidOnlyNoticeCopy; es: RegionPaidOnlyNoticeCopy } = {
  en: {
    title: 'Your first clip is free',
    body: 'Your first 5-second clip is on us. Plans unlock every engine, with clean downloads.',
    cta: 'Make my free clip',
  },
  pt: {
    title: 'Seu primeiro clipe é grátis',
    body: 'O seu primeiro clipe de 5 segundos é por nossa conta. Os planos liberam todos os motores, com download sem marca d’água.',
    cta: 'Fazer meu clipe grátis',
  },
  es: {
    title: 'Tu primer clip es gratis',
    body: 'Tu primer clip de 5 segundos va por nuestra cuenta. Los planes desbloquean todos los motores, con descargas sin marca de agua.',
    cta: 'Hacer mi clip gratis',
  },
}
export const REGION_PLANS_NOTICE_FILM_LIVE: { en: RegionPaidOnlyNoticeCopy; pt: RegionPaidOnlyNoticeCopy; es: RegionPaidOnlyNoticeCopy } = {
  en: {
    title: 'Keep creating',
    body: 'Plans work normally here: pick one and every engine is yours, with clean downloads.',
    cta: 'See plans',
  },
  pt: {
    title: 'Continue criando',
    body: 'Os planos funcionam normalmente: escolha um e todos os motores ficam liberados, com download sem marca d’água.',
    cta: 'Ver planos',
  },
  es: {
    title: 'Sigue creando',
    body: 'Los planes funcionan con normalidad: elige uno y todos los motores quedan disponibles, con descargas sin marca de agua.',
    cta: 'Ver planes',
  },
}
