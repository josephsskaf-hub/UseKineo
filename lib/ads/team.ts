// KINEO-EQUIPE-BUSINESS-2026-10-10 — a EQUIPE do plano Business (decisão do fundador, 10/10/2026).
//
// POR QUÊ: os planos de empresa do mercado vêm com vários usuários (HeyGen Business +US$ 20 por vaga; Higgsfield e Krea
// com vagas de equipe). O Kineo Business (US$ 84/mês, lib/businessPlan.ts) passa a deixar a empresa chamar colegas que
// fazem anúncio com os créditos DA EMPRESA. Versão 1, a menor segura:
//   · até BUSINESS_SEATS colegas, incluídos no preço (sem cobrança por vaga);
//   · convite por e-mail = linha em public.ads_team_members + link assinado, de uso único, que vence em 7 dias. O código
//     NÃO manda e-mail (não há modelo transacional ainda): o dono copia o link e manda;
//   · o colega entra com a PRÓPRIA conta, logado, com o MESMO e-mail convidado;
//   · vale só enquanto o plano do dono for 'business' (conferido a cada requisição; caiu o plano, o colega perde o acesso
//     na hora e os dados ficam com o dono);
//   · só o Studio Ads. Filmes, clipes, imagens e o resto continuam estritamente por conta.
//
// Módulo PURO (sem node:crypto, sem servidor): entra também em telas 'use client' e em lib/businessPlan.ts. A parte que
// assina token e lê o banco mora em lib/ads/workspace.ts.

/** Colegas que o dono do Business pode chamar (incluídos no preço, sem cobrança por vaga na v1). */
export const BUSINESS_SEATS = 3
/** O único plano que abre equipe. */
export const ADS_TEAM_PLAN = 'business'
/** Tabela da equipe (migrations_pending/2026-10-10_equipe_business.sql). */
export const ADS_TEAM_TABLE = 'ads_team_members'
/** Validade do link do convite. */
export const ADS_TEAM_INVITE_DAYS = 7
/** A página da equipe (dono: convidar/remover; membro: ver e sair). */
export const ADS_TEAM_PATH = '/ads/team'
/** A página do aceite (o link do convite). */
export const ADS_TEAM_JOIN_PATH = '/ads/team/join'

/** Eventos de servidor da equipe (lib/serverEvents.ts writeServerEvent). */
export const ADS_TEAM_EVENTS = {
  inviteCreated: 'team_invite_created',
  memberJoined: 'team_member_joined',
  memberRemoved: 'team_member_removed',
  orderByMember: 'ads_order_by_member',
} as const

export type AdsTeamStatus = 'pending' | 'active' | 'revoked' | 'removed' | 'left' | 'expired'
/** Estados que ocupam vaga. */
export const ADS_TEAM_LIVE_STATUSES: readonly AdsTeamStatus[] = ['pending', 'active']

/** O plano abre equipe? (só 'business', exato). */
export function isTeamOwnerPlan(plan: unknown): boolean {
  return typeof plan === 'string' && plan.trim().toLowerCase() === ADS_TEAM_PLAN
}

/** E-mail normalizado (minúsculo, sem espaço) ou null se não parece e-mail. */
export function normalizeTeamEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const e = raw.trim().toLowerCase()
  if (e.length < 3 || e.length > 254) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null
  return e
}

/** Primeira vaga livre (1..BUSINESS_SEATS) dadas as vagas ocupadas; null = equipe cheia. */
export function nextFreeSeat(taken: readonly unknown[]): number | null {
  const used = new Set(taken.map((n) => Number(n)))
  for (let s = 1; s <= BUSINESS_SEATS; s++) if (!used.has(s)) return s
  return null
}

/** Convite pendente já vencido? (data ilegível = vencido: falha fechada). */
export function inviteExpired(expiresAt: unknown, now: Date = new Date()): boolean {
  const t = typeof expiresAt === 'string' || expiresAt instanceof Date ? new Date(expiresAt).getTime() : NaN
  return !Number.isFinite(t) || t <= now.getTime()
}

/** Papel de quem está no Studio Ads: dono do próprio workspace (inclui toda conta sem equipe) ou membro de um Business. */
export type AdsWorkspaceRole = 'owner' | 'member'

/** O que a tela do Studio Ads recebe do servidor sobre o workspace (nada de id de outra conta). */
export interface AdsWorkspaceView {
  role: AdsWorkspaceRole
  /** Nome do negócio do dono (kit da marca) ou o e-mail dele; só para o membro. */
  ownerLabel: string | null
  /** O dono do Business vê o link da equipe. */
  teamOwner: boolean
}
