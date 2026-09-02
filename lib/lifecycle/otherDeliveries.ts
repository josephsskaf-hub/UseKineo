/**
 * KINEO-SPRINT-ASSINATURAS-2026-09-02 (#11) — "esta pessoa RECEBEU algo da
 * casa que nao esta em `videos`".
 *
 * ═══ POR QUE ESTE ARQUIVO EXISTE ═══
 *
 * 02/09 00:31 UTC: xzavior000 (trial do TAAFT, 25cr) abriu /pricing duas
 * vezes, foi ao /animate e fez 5 clipes de 10s em 24 minutos — os 5 entregues
 * (`animate_job_settled outcome=delivered`). Bateu no teto de credito no 5o
 * (`trial_expired reason=credit_cap`), foi rebaixado 30s depois e, 30 minutos
 * depois, recebeu o `downgraded_loss` na versao "nunca rodou": assunto "Your
 * first video is one click away", corpo "nothing we sent you actually put a
 * finished video in your hands". Ele tinha 5 na Library.
 *
 * A causa e o ponto cego ja anotado no CLAUDE.md em 24/08: `/animate`,
 * `/images` e `/audio` NAO criam linha em `videos`. Toda coorte que se define
 * por "0 videos" (aqui: `videosMade === 0`) trata quem usou esses produtos
 * como quem nunca apertou o botao. Medido em 30 dias: 13 `downgraded_loss`,
 * 10 `ending_soon`, 11 `expired_offer_d5` foram para gente com 0 `videos` e
 * pelo menos uma entrega em outro produto. Sao poucos — mas sao justamente
 * os que GASTARAM o trial inteiro, o lead mais quente da fila.
 *
 * REGRA TRANSFERIVEL (irma da de `ourFailure.ts`): *"0 linhas em `videos`"
 * nao e "0 entregas"*. Antes de dizer a alguem que nada foi entregue, olhar
 * `images`, `audios` e o evento terminal do Animate.
 *
 * ═══ CONTRATO ═══
 *
 *   · FALHA ABERTA por fonte: leitura que falha conta 0 NAQUELA fonte e marca
 *     `degraded`. O pior caso do fail-open e a copy de hoje para alguem que
 *     talvez tenha um clipe — nunca uma coorte silenciada. (O campo so
 *     ACRESCENTA verdade; nao autoriza extensao nem credito.)
 *   · Animate conta `billing_reference` DISTINTOS: a varredura horaria
 *     re-grava `animate_job_settled` para o mesmo job (43x para um job de
 *     31/08 — divida registrada no diario #11), entao contar linhas mentiria.
 *   · Paginacao com ORDER BY estavel (`id`), pagina < max-rows do PostgREST,
 *     mesmo padrao das leituras irmas em trial-lifecycle-emails/route.ts.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface OtherDeliveries {
  /** Clipes do /animate entregues (billing_reference distintos). */
  clips: number
  /** Linhas em `images` (toda linha e uma imagem entregue e persistida). */
  images: number
  /** Linhas em `audios` (toda linha e um audio entregue e persistido). */
  audios: number
}

export const EMPTY_OTHER_DELIVERIES: Readonly<OtherDeliveries> = Object.freeze({ clips: 0, images: 0, audios: 0 })

export function otherDeliveriesTotal(o: Readonly<OtherDeliveries> | null | undefined): number {
  if (!o) return 0
  return Math.max(0, o.clips | 0) + Math.max(0, o.images | 0) + Math.max(0, o.audios | 0)
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * Frase curta e verdadeira por construcao, para colar numa sentenca:
 *   "5 animated clips" · "2 images and 1 voiceover" ·
 *   "3 animated clips, 2 images and 1 voiceover". Vazio quando total = 0.
 */
export function describeOtherDeliveries(o: Readonly<OtherDeliveries> | null | undefined): string {
  if (!o) return ''
  const parts: string[] = []
  if (o.clips > 0) parts.push(plural(o.clips, 'animated clip', 'animated clips'))
  if (o.images > 0) parts.push(plural(o.images, 'image', 'images'))
  if (o.audios > 0) parts.push(plural(o.audios, 'voiceover', 'voiceovers'))
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

const USERS_PER_QUERY = 50
const PAGE = 500
const HARD_CAP = 50_000

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

type Row = { user_id?: unknown; br?: unknown }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any

/**
 * Le uma fonte inteira para a coorte. Devolve `false` se QUALQUER pagina
 * falhar — parcial nao serve (metade da coorte "com entrega" e metade "sem"
 * e a afirmacao errada com cara de resposta; mesma regra do `ourFailure`).
 */
async function readSource(
  admin: SupabaseClient,
  ids: string[],
  table: string,
  select: string,
  filter: (q: AnyQuery) => AnyQuery,
  onRow: (row: Row) => void,
  label: string,
): Promise<boolean> {
  for (const part of chunk(ids, USERS_PER_QUERY)) {
    let from = 0
    for (;;) {
      const base: AnyQuery = admin.from(table).select(select).in('user_id', part)
      const { data, error } = await filter(base).order('id', { ascending: true }).range(from, from + PAGE - 1)
      if (error) {
        console.error(`[other-deliveries] ${label} read failed:`, error.message)
        return false
      }
      const got = (data ?? []) as Row[]
      for (const r of got) onRow(r)
      if (got.length < PAGE) break
      from += got.length
      if (from >= HARD_CAP) {
        console.error(`[other-deliveries] ${label} exceeded ${HARD_CAP} rows for ${part.length} users — giving up`)
        return false
      }
    }
  }
  return true
}

export async function countOtherDeliveries(
  admin: SupabaseClient,
  cohortIds: string[],
): Promise<{ counts: Map<string, OtherDeliveries>; degraded: boolean }> {
  const counts = new Map<string, OtherDeliveries>()
  const get = (id: string): OtherDeliveries => {
    let c = counts.get(id)
    if (!c) {
      c = { clips: 0, images: 0, audios: 0 }
      counts.set(id, c)
    }
    return c
  }
  if (cohortIds.length === 0) return { counts, degraded: false }
  let degraded = false

  // Animate: evento terminal do servidor, um job = um billing_reference.
  const seenRefs = new Set<string>()
  const okAnimate = await readSource(
    admin,
    cohortIds,
    'events',
    'id, user_id, br:metadata->>billing_reference',
    (q) => q.eq('name', 'animate_job_settled').eq('metadata->>outcome', 'delivered'),
    (r) => {
      if (typeof r.user_id !== 'string' || typeof r.br !== 'string' || !r.br) return
      const key = `${r.user_id}:${r.br}`
      if (seenRefs.has(key)) return
      seenRefs.add(key)
      get(r.user_id).clips += 1
    },
    'animate',
  )
  if (!okAnimate) {
    degraded = true
    for (const c of counts.values()) c.clips = 0
  }

  const okImages = await readSource(
    admin, cohortIds, 'images', 'id, user_id', (q) => q,
    (r) => { if (typeof r.user_id === 'string') get(r.user_id).images += 1 },
    'images',
  )
  if (!okImages) {
    degraded = true
    for (const c of counts.values()) c.images = 0
  }

  const okAudios = await readSource(
    admin, cohortIds, 'audios', 'id, user_id', (q) => q,
    (r) => { if (typeof r.user_id === 'string') get(r.user_id).audios += 1 },
    'audios',
  )
  if (!okAudios) {
    degraded = true
    for (const c of counts.values()) c.audios = 0
  }

  return { counts, degraded }
}
