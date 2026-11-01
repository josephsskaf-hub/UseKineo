// ═══ KINEO-GOOGLE-ADS-TESTE-0111 — CAMPANHA DE TESTE NO GOOGLE SEARCH: GRUPOS, URL FINAL E O CADASTRO QUE NÃO PERDE O ANÚNCIO ═══
//
// POR QUÊ (fundador 01/11, "vai tudo"): teste de US$ 10/dia × 7 dias no Google Search (EUA, Reino Unido, Canadá, Austrália)
// mirando quem procura um MOTOR premium pelo nome — a mesma intenção das páginas de motor que o ChatGPT cita, de onde vieram
// 8 dos 11 pagantes. Doc: docs/GOOGLE-ADS-TESTE-2026-11-01.md. Este módulo é a fonte única de três coisas:
//   1. os grupos do teste (utm_campaign gs_<grupo>) e a página de motor EXISTENTE de cada um — nunca a home (anúncio para a
//      home deu 0 cadastros em 332 visitas do Instagram);
//   2. o URL final que vai no Google Ads (o guardião confere que a rota existe e que o botão dela abre o motor certo);
//   3. o preenchimento do cadastro a partir do clique pago (cookie kineo_paid_click, lib/growth/paidClickAttribution.ts).
//
// O BURACO QUE O ITEM 3 FECHA (conferido em 85a82bbe9): o perfil guarda a origem do PRIMEIRO toque (cookie kineo_src) e o
// gclid só vinha do sessionStorage da ABA do pouso. Dois casos perdiam o anúncio no cadastro:
//   · quem já tinha visitado o site antes SEM utm (só referrer orgânico, p.ex. google.com) e agora clica no anúncio: o
//     kineo_src já existe, então signup_utm_campaign ficava nulo — o cadastro não contava para nenhum grupo gs_*;
//   · quem confirma o e-mail numa ABA NOVA (o link do e-mail abre outra aba): sessionStorage vazio → profiles.gclid nulo e
//     o session_id da aba nova não liga ao pouso.
// Os dois já tinham o clique pago num cookie de 90 dias que só a rota de checkout lia. Agora o cadastro também lê — e só
// PREENCHE o que está nulo: origem conhecida (utm de outro canal) nunca é trocada, e a regra de primeiro toque continua.
//
// MÓDULO PURO (só import de tipo): o guardião scripts/test-google-landing-0111.mts o executa sem rede.

import type { PaidClick } from './paidClickAttribution'

export const GS_CAMPAIGN_PREFIX = 'gs_' as const

export type GsGrupo = {
  /** sufixo do utm_campaign: gs_<key> */
  key: 'kling4' | 'seedance' | 'veo'
  nome: string
  /** rota pública EXISTENTE da página do motor */
  path: string
  /** o motor que o botão de cadastro da página abre no /studio (create_intent) */
  engineParam: 'hollywood' | 'seedance' | 'veo'
  /** o intent_campaign que o botão da página já carrega (a origem externa continua sendo o anúncio) */
  intentCampaign: string
}

// Kling 4.0 é servido pela chave 'hollywood' quando o interruptor pago dele está ligado (app/(dashboard)/studio/StudioClient.tsx
// troca nome, ícone e preço da chave para o 4.0); por isso o botão da página do 4.0 abre engine=hollywood.
export const GS_GRUPOS: readonly GsGrupo[] = [
  { key: 'kling4', nome: 'Kling 4.0', path: '/ai-video-generator/kling-4', engineParam: 'hollywood', intentCampaign: 'seo_engine_kling4' },
  { key: 'seedance', nome: 'Seedance', path: '/ai-video-generator/seedance', engineParam: 'seedance', intentCampaign: 'seo_engine_seedance' },
  { key: 'veo', nome: 'Veo 3 alternative / premium AI video', path: '/ai-video-generator/veo', engineParam: 'veo', intentCampaign: 'seo_engine_veo' },
] as const

export const GS_ORIGIN = 'https://www.usekineo.com' as const

export function gsCampaign(grupo: Pick<GsGrupo, 'key'>): string {
  return `${GS_CAMPAIGN_PREFIX}${grupo.key}`
}

/** O pedaço do URL que carrega a palavra-chave: `{keyword}` é o ValueTrack do Google (vira a palavra-chave no clique). */
export const GS_FINAL_URL_SUFFIX = 'utm_term={keyword}' as const

/** O que vai no campo "URL final" do anúncio (sem ValueTrack: o Google só substitui ValueTrack no sufixo/modelo). */
export function gsFinalUrlBase(grupo: Pick<GsGrupo, 'key' | 'path'>): string {
  return `${GS_ORIGIN}${grupo.path}?utm_source=google&utm_medium=cpc&utm_campaign=${gsCampaign(grupo)}`
}

/**
 * O URL que a pessoa abre ao clicar = URL final + sufixo. `{keyword}` fica literal — URLSearchParams escaparia as chaves e
 * o Google não o substituiria.
 */
export function gsFinalUrl(grupo: Pick<GsGrupo, 'key' | 'path'>): string {
  return `${gsFinalUrlBase(grupo)}&${GS_FINAL_URL_SUFFIX}`
}

/** Igual a AI_ASSISTANT_LIKELY_SOURCE (lib/acquisitionSource.ts) — o guardião confere. Estimativa não é origem conhecida. */
export const GS_GUESS_SOURCE = 'ai_assistant_likely' as const

export type SignupSourceColumns = {
  signup_utm_source: string | null
  signup_utm_medium: string | null
  signup_utm_campaign: string | null
  gclid: string | null
}

/**
 * O que o clique pago pode PREENCHER no perfil durante o cadastro (só colunas que continuariam nulas):
 *   · utm source/medium/campaign: só quando nem o perfil nem este pedido trazem source NEM campaign. Assim o primeiro toque
 *     com utm de outro canal (chatgpt, taaft…) nunca é trocado, e o trio nunca sai misturado de dois toques diferentes;
 *     um primeiro toque só com referrer orgânico (sem utm) recebe o anúncio — é o caso que sumia do placar gs_*;
 *   · gclid: quando perfil e pedido não têm gclid e o clique pago é do Google (idType gclid).
 * `profile` = o que já está gravado; `pedido` = o que este pedido vai gravar (body + cookie kineo_src).
 */
export function signupFillFromPaidClick(input: {
  profile: Partial<SignupSourceColumns> | null
  pedido: Partial<SignupSourceColumns>
  click: PaidClick | null
}): Partial<SignupSourceColumns> {
  const { profile, pedido, click } = input
  if (!click) return {}
  const fill: Partial<SignupSourceColumns> = {}
  // A estimativa 'ai_assistant_likely' não conta como origem: o atestado do clique pago a substitui (mesma regra da rota).
  const profileSource = profile?.signup_utm_source === GS_GUESS_SOURCE ? null : profile?.signup_utm_source
  const hasUtm =
    Boolean(profileSource) || Boolean(profile?.signup_utm_campaign) ||
    Boolean(pedido.signup_utm_source) || Boolean(pedido.signup_utm_campaign)
  if (!hasUtm && (click.source || click.campaign)) {
    if (click.source) fill.signup_utm_source = click.source
    if (click.medium && !profile?.signup_utm_medium && !pedido.signup_utm_medium) fill.signup_utm_medium = click.medium
    if (click.campaign) fill.signup_utm_campaign = click.campaign
  }
  if (!profile?.gclid && !pedido.gclid && click.idType === 'gclid' && click.id) fill.gclid = click.id
  return fill
}
