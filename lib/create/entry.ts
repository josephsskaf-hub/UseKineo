// KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"]
// O ÚNICO lugar que decide para onde vai cada ENTRADA de criação do site (menu do topo, menu lateral, menu do celular, cartões
// da home, caixa de presente): a tela nova (/create/<aba>) ou o destino antigo.
//
// Regra: a entrada vai para a tela nova SÓ quando os três interruptores estão em 'public' (CREATE_ENTRY_RELEASE, o da casca
// CREATE_SHELL_RELEASE e, para Film, CREATE_FILM_INPLACE) E quando a tela nova RECEBE o mesmo dado e faz a mesma coisa:
//   · Film    — destino antigo /studio com SÓ os parâmetros que a caixa única do /studio lê (ideia, intent_campaign) + atribuição
//               (utm_*, ref, gclid, msclkid, fbclid, ttclid) e, no máximo, engine=seedance (o motor padrão da caixa). /create/film
//               lê os mesmos (app/create/[tab]/page.tsx). Sem intent_campaign, leva a MESMA campanha que a caixa do /studio grava
//               ('studio_simple', campanhaDaCaixa) — a medição fica igual; só o path do evento muda.
//               Qualquer outro parâmetro (outro motor, prompt, script_mode, série/continuação, autostart, conector, retomada…) = destino antigo.
//   · Cartoon — só /kids-cartoon SECO (sem query). Personagem, ideia, utm de abertura sem conta… = destino antigo.
//   · Ads     — só /ads/new SECO. Entrada com estilo, formato, foto, link de produto, rascunho ou origem = destino antigo.
// Com qualquer interruptor fora de 'public' a função devolve o destino antigo byte a byte.
// KINEO-ENTRADAS-SO-LOGADO-1011 [CEO 10/11: "VISITANTE (deslogado) FICA NO DESTINO ANTIGO… só quem está LOGADO vai para as abas novas"] — o canal
// que paga chega por visitante (13 de 17 pagantes compram na 1ª hora); a porta dele não muda sem medição. O estado de login é ARGUMENTO
// obrigatório: só signedIn === true vira tela nova. Visitante, ou superfície que não sabe (render de servidor/SEO), = destino antigo byte a byte
// (inclusive o embrulho '/signup?redirect=…' que algumas funções da home já fazem para visitante).
// Módulo PURO (sem rede, sem e-mail, sem env): o guardião scripts/test-entradas-tela-nova-1011.mjs o executa.
import { CREATE_ENTRY_RELEASE, CREATE_FILM_INPLACE, CREATE_SHELL_RELEASE } from './release'
import type { InternalRelease } from '@/lib/recreate/release'

export type CreateEntryKind = 'film' | 'cartoon' | 'ads'

/** O destino antigo de cada aba (path exato). */
export const LEGACY_ENTRY_PATH: Readonly<Record<CreateEntryKind, string>> = { film: '/studio', cartoon: '/kids-cartoon', ads: '/ads/new' }

/** A campanha que a caixa do /studio grava quando o link não traz nenhuma (lib/growth/studioSimples.ts campanhaDaCaixa). */
export const STUDIO_BOX_DEFAULT_CAMPAIGN = 'studio_simple'

/** Parâmetros que a aba Film recebe e trata igual ao /studio (a caixa única): o resto da lista SO_CHEGOU, menos o motor. */
const FILM_KEYS = /^(?:intent_campaign|ideia|utm_[a-z]+|ref|gclid|msclkid|fbclid|ttclid)$/
/** O único motor aceito: o padrão da caixa (motorDaCaixa(undefined) === 'seedance'); a aba Film não mostra nem troca motor. */
export const FILM_DEFAULT_ENGINE = 'seedance'
/** Chegada do cadastro (OAuth: signup=1; e-mail: welcome=1) — a aba Film monta o StudioIdeaArrival como o /studio. */
const ARRIVAL_KEYS = /^(?:signup|welcome)$/

const BASE = 'https://kineo.local'

export interface CreateEntryOpts {
  entry?: InternalRelease
  shell?: InternalRelease
  filmInplace?: InternalRelease
}

function parse(href: string): URL | null {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return null
  try {
    const u = new URL(href, BASE)
    return u.origin === BASE && !u.hash ? u : null
  } catch {
    return null
  }
}

/** Os parâmetros de um link para a aba Film são os que ela trata igual ao /studio? (página e entrada usam a MESMA régua) */
export function filmParamsSupported(params: URLSearchParams | Record<string, string | string[] | undefined>, opts: { arrival?: boolean } = {}): boolean {
  const entries: [string, unknown][] = params instanceof URLSearchParams ? Array.from(params.entries()) : Object.entries(params)
  const seen = new Set<string>()
  for (const [k, v] of entries) {
    if (typeof v !== 'string') return false // repetido / lista = o /studio trataria de outro jeito
    if (seen.has(k)) return false
    seen.add(k)
    if (k === 'engine') { if (v !== FILM_DEFAULT_ENGINE) return false; continue }
    if (FILM_KEYS.test(k)) continue
    if (opts.arrival && ARRIVAL_KEYS.test(k)) continue
    return false
  }
  return true
}

/** O destino da entrada. `legacyHref` é o destino de HOJE (sem o embrulho do cadastro). */
export function createEntryHref(kind: CreateEntryKind, legacyHref: string, signedIn: boolean, opts: CreateEntryOpts = {}): string {
  if (signedIn !== true) return legacyHref // KINEO-ENTRADAS-SO-LOGADO-1011 — visitante (ou desconhecido) fica no destino de hoje
  const entry = opts.entry ?? CREATE_ENTRY_RELEASE
  const shell = opts.shell ?? CREATE_SHELL_RELEASE
  const film = opts.filmInplace ?? CREATE_FILM_INPLACE
  if (entry !== 'public' || shell !== 'public' || (kind === 'film' && film !== 'public')) return legacyHref
  const u = parse(legacyHref)
  if (!u || u.pathname !== LEGACY_ENTRY_PATH[kind]) return legacyHref
  let target: string
  if (kind === 'film') {
    if (!filmParamsSupported(u.searchParams)) return legacyHref
    const q = new URLSearchParams(u.searchParams)
    if (!q.has('intent_campaign')) q.append('intent_campaign', STUDIO_BOX_DEFAULT_CAMPAIGN)
    target = `/create/film?${q.toString()}`
  } else {
    if (u.search) return legacyHref
    target = `/create/${kind}`
  }
  return target
}

/** A query de chegada de /create/<aba> como string (lista = a chave repetida), para devolvê-la intacta ao /studio ou ao cadastro. */
export function queryDaChegada(searchParams: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x)
  return q.toString()
}

/**
 * Para quem já tem o href pronto (menus que guardam o destino antigo como identidade; funções de cartão da home):
 * '/studio…' · '/ads/new' · '/kids-cartoon'. Qualquer outro href (inclusive o '/signup?redirect=…' do visitante) volta intacto.
 */
export function createEntryForLegacyHref(legacyHref: string, signedIn: boolean, opts: CreateEntryOpts = {}): string {
  const u = parse(legacyHref)
  if (!u) return legacyHref
  const kind = (Object.keys(LEGACY_ENTRY_PATH) as CreateEntryKind[]).find(k => LEGACY_ENTRY_PATH[k] === u.pathname)
  return kind ? createEntryHref(kind, legacyHref, signedIn, opts) : legacyHref
}
