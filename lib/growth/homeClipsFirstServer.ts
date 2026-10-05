// KINEO-HOME-CLIPS-FIRST-2026-10-05 — o lado SERVIDOR do A/B da home: lê cookie, user-agent e as travas dos clipes e chama
// a regra pura (lib/growth/homeClipsFirst.ts). A home (app/page.tsx) e a rota de exposição (app/api/home-variant) usam
// ESTA função — as duas sempre concordam sobre a variante de uma pessoa.
import { cookies, headers } from 'next/headers'
import { isInternalEmail } from '@/lib/internalAccounts'
import { clipsVisible } from '@/lib/clips/clipLaunch'
import { clipEffectsVisible } from '@/lib/clips/clipEffects'
import {
  HOME_CLIPS_FIRST,
  HOME_VARIANT_EVENT_VERSION,
  HOME_VISITOR_COOKIE,
  assignHomeVariant,
  effectiveHomeClipsFirstMode,
  homePreviewVariant,
  normalizeHomeVisitorId,
  type HomeAssignment,
  type HomeClipsFirstMode,
} from '@/lib/growth/homeClipsFirst'

/**
 * O modo que vale para ESTA pessoa: o interruptor, travado pela MESMA regra de visibilidade do /clips
 * (clipsVisible(email) e clipEffectsVisible(isInternalEmail(email)) — lib/clips/*). Só vê a galeria quem pode usá-la:
 * com HOME_CLIPS_FIRST ligado e CLIP_EFFECTS_PUBLIC=false, a conta da casa entra no sorteio (canário) e o visitante de
 * fora fica na home atual, sem evento. Sem e-mail (deslogado) = só com os interruptores públicos ligados.
 */
export function homeClipsFirstModeFor(email: string | null | undefined): HomeClipsFirstMode {
  const internal = isInternalEmail(email)
  return effectiveHomeClipsFirstMode(HOME_CLIPS_FIRST, {
    clipsPublic: clipsVisible(email),
    effectsPublic: clipEffectsVisible(internal),
  })
}

export interface HomeVariantChoice extends HomeAssignment {
  /** true = prévia pedida por conta da casa (?home_variant=); nunca grava evento. */
  preview: boolean
}

/** A variante desta requisição. Nunca lança: qualquer falha = home atual, sem evento. */
export function resolveHomeVariant(args: {
  userId: string | null
  email?: string | null
  previewParam?: string | null
}): HomeVariantChoice {
  try {
    const preview = homePreviewVariant(args.previewParam, isInternalEmail(args.email))
    if (preview) {
      return {
        variant: preview, assignment: null, assignmentId: null, mode: homeClipsFirstModeFor(args.email), reason: 'off',
        expose: false, preview: true,
      }
    }
    const assigned = assignHomeVariant({
      mode: homeClipsFirstModeFor(args.email),
      userId: args.userId,
      visitorId: cookies().get(HOME_VISITOR_COOKIE)?.value ?? null,
      userAgent: headers().get('user-agent'),
    })
    return { ...assigned, preview: false }
  } catch {
    return { variant: 'control', assignment: null, assignmentId: null, mode: 'off', reason: 'off', expose: false, preview: false }
  }
}

/**
 * CONTRATO com o agente do /clips (e qualquer evento de funil do servidor): espalhe isto no `metadata` de
 * clip_effect_chosen / clip_effect_ready / clip_effect_film_upsell_clicked. Liga a conta ao kineo_vid que viu a home
 * ANTES do cadastro — quem clica num efeito deslogado vai /signup → /clips e nunca volta à home, então sem este carimbo
 * a SQL não saberia que aquela conta nasceu da variante. Com o interruptor 'off' devolve {} (nada muda). Nunca lança.
 *   home_ab              versão do experimento (HOME_VARIANT_EVENT_VERSION)
 *   home_visitor_id      o kineo_vid do navegador (id aleatório first-party; null se não houver)
 *   home_variant         a variante que a home mostra HOJE a esta pessoa (por user_id quando logado; passe o e-mail)
 *   home_variant_visitor a variante do kineo_vid (a que a pessoa viu deslogada; null sem cookie)
 */
export function homeVariantStamp(userId: string | null, email?: string | null): Record<string, string | null> {
  try {
    const mode = homeClipsFirstModeFor(email)
    if (HOME_CLIPS_FIRST === 'off') return {}
    const visitorId = normalizeHomeVisitorId(cookies().get(HOME_VISITOR_COOKIE)?.value ?? null)
    const userAgent = headers().get('user-agent')
    const now = assignHomeVariant({ mode, userId, visitorId, userAgent })
    // O que esta pessoa viu DESLOGADA: regra pública (sem e-mail).
    const asVisitor = visitorId ? assignHomeVariant({ mode: homeClipsFirstModeFor(null), userId: null, visitorId, userAgent }) : null
    return {
      home_ab: HOME_VARIANT_EVENT_VERSION,
      home_visitor_id: visitorId,
      home_variant: now.reason === 'bot' ? null : now.variant,
      home_variant_visitor: asVisitor && asVisitor.reason !== 'bot' ? asVisitor.variant : null,
    }
  } catch {
    return {}
  }
}
