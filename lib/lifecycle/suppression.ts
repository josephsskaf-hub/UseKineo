// KINEO-LIFECYCLE-SUPPRESSION-2026-07-27 — a trava que faltava entre os jobs
// de ciclo de vida.
//
// O PROBLEMA (estrutural, não hipotético)
// ───────────────────────────────────────
// Cada job de e-mail é "1 por usuário para sempre" com uma coluna própria, e
// NENHUM enxerga o do outro:
//
//   cron/send-reminders          → profiles.reminder_sent_at
//   cron/send-activation-nudge   → profiles.activation_nudge_sent_at
//   cron/send-video-rescue       → profiles.video_rescue_sent_at
//   cron/send-recovery           → checkout_abandoned.recovery_sent_at   ← NÃO é profiles
//   admin/send-abandon-recovery  → profiles.abandon_emailed      (boolean, SEM data)
//   admin/send-free-upsell       → profiles.free_upsell_emailed  (boolean, SEM data)
//
// As coortes se cruzam de verdade. Exemplo conferido no código: send-free-upsell
// filtra `free_ai_generate_used = true` e NÃO exclui quem clicou em checkout
// (app/api/admin/send-free-upsell/route.ts:128-136), apesar de o comentário no
// topo daquele arquivo afirmar que exclui. Quem gerou um vídeo grátis E clicou
// no checkout está nas DUAS coortes, e as duas rodam na MESMA execução diária
// de send-reminders — dois e-mails com segundos de diferença.
//
// O QUE ESTE MÓDULO FAZ
// ─────────────────────
// Dado um conjunto de user ids, devolve quem recebeu QUALQUER e-mail de ciclo
// de vida nas últimas LIFECYCLE_SUPPRESSION_HOURS horas, tomando o MÁXIMO das
// 6 colunas datadas de `profiles` (lista em PROFILE_TIMESTAMP_COLUMNS) mais
// `checkout_abandoned.recovery_sent_at`. Um usuário suprimido não entra na coorte de nenhum
// job naquela execução.
//
// SEM MIGRATION, SEM COLUNA NOVA. Só leitura das colunas que já existem.
//
// ─────────────────────────────────────────────────────────────────────────────
// DUAS PROPRIEDADES CONHECIDAS E ACEITAS (documentadas para ninguém "descobrir"
// isto depois e achar que é bug):
//
// 1. As duas colunas BOOLEANAS não participam da janela.
//    `abandon_emailed` e `free_upsell_emailed` são boolean, não timestamptz —
//    carregam o "se", nunca o "quando". Não dá para derivar 24h de um boolean, e
//    tratar `true` como "recebeu agora" bloquearia o usuário para SEMPRE, que é
//    pior que o problema. Consequência residual: os dois lotes admin RESPEITAM
//    esta supressão (direção de entrada, ver §uso abaixo), mas os envios DELES
//    ficam invisíveis para os outros 4 jobs por 24h. Fechar isso exige converter
//    as duas colunas para timestamptz — migration, que exige autorização
//    separada. Registrado, não feito.
//
// 2. ~~As colunas marcam "processado", não "enviado".~~
//    ✅ CORRIGIDO EM 05/08/2026 — KINEO-SKIP-STAMP-2026-08-05.
//
//    O texto que estava aqui dizia que a sobreposição entre "carimbado por pulo"
//    e "coorte de outro job" era ~vazia, e listava o único caso conhecido
//    (send-activation-nudge pulando quem já gerou vídeo) como inofensivo porque
//    a coorte do send-video-rescue exige vídeo com 24h+.
//
//    **A análise estava certa para os jobs que existiam quando foi escrita, e a
//    conclusão apodreceu no dia em que um job novo entrou na lista.** O
//    `send-cap-hit` dispara MINUTOS depois da recusa, não 24h depois — e em
//    05/08 exatamente aquele carimbo-por-pulo "inofensivo" calou por 24h o sinal
//    de compra mais quente do funil (`eziafakaego2026@gmail.com`, recusa 19:00Z,
//    carimbo de pulo 19:40:47Z, e-mail que nunca existiu).
//
//    A correção não é reanalisar a sobreposição de novo a cada job novo — é
//    fazer o pulo parar de se parecer com um envio. Os jobs agora carimbam
//    `LIFECYCLE_SKIP_STAMP` (época Unix) quando pulam, e esta supressão só
//    aceita carimbo posterior a `REAL_SEND_FLOOR_MS`. Ver lib/lifecycle/skipStamp.ts.
//
// FALHA FECHADA. Se qualquer consulta der erro, TODOS os ids entram como
// suprimidos e `degraded` vira true. Perder um e-mail é barato; mandar e-mail
// repetido para uma base de 713 pessoas queima domínio.

import type { SupabaseClient } from '@supabase/supabase-js'
import { isRealSendStamp, REAL_SEND_FLOOR_MS } from './skipStamp'

/** Janela mínima entre dois e-mails de ciclo de vida para o MESMO usuário. */
export const LIFECYCLE_SUPPRESSION_HOURS = 24

const SUPPRESSION_WINDOW_MS = LIFECYCLE_SUPPRESSION_HOURS * 60 * 60 * 1000

/**
 * PostgREST manda `in.(...)` na query string. Com milhares de UUIDs a URL
 * estoura (send-video-rescue carrega até 5000 perfis de uma vez), então as
 * consultas são fatiadas.
 */
const CHUNK_SIZE = 200

/** Colunas datadas em `profiles` que registram um e-mail de ciclo de vida. */
const PROFILE_TIMESTAMP_COLUMNS = [
  'reminder_sent_at',
  'activation_nudge_sent_at',
  'video_rescue_sent_at',
  // KINEO-CAP-HIT-2026-08-03 (Ordem 4) — e-mail do teto same-day.
  // cron/send-cap-hit → profiles.cap_hit_sent_at
  'cap_hit_sent_at',
  // KINEO-VIDEO-READY-2026-08-03 (Medida 6 do PLANO-SEMANA) — "your video is ready".
  // cron/send-video-ready → profiles.video_ready_sent_at
  'video_ready_sent_at',
  // KINEO-DAILY-NUDGE-2026-08-04 — "your 3 free Shorts are back" (retenção D7).
  // cron/send-credits-back → profiles.credits_back_sent_at
  //
  // ÚNICO carimbo RECORRENTE da lista: o job reenvia a cada 3 dias, então esta
  // coluna é "quando foi o último", não "se já foi". Isso não muda nada aqui —
  // a supressão só olha a janela de 24h — mas evita que alguém leia a coluna
  // como flag de "já processado para sempre", como as outras cinco.
  'credits_back_sent_at',
  // KINEO-POST-NUDGE-2026-08-05 — "você baixou e nunca postou".
  // cron/send-post-nudge → profiles.post_nudge_sent_at
  //
  // SEGUNDO carimbo recorrente da lista (cooldown de 14 dias), pelo mesmo
  // motivo do anterior: hábito não se constrói com um e-mail só. Entrar aqui é
  // OBRIGATÓRIO e não opcional — um job de lifecycle que não aparece nesta
  // lista fica invisível para os outros seis, e a pessoa recebe dois e-mails
  // nossos com minutos de diferença. Job novo que manda e-mail entra aqui no
  // mesmo commit em que nasce.
  'post_nudge_sent_at',
] as const

export interface LifecycleSuppression {
  /** true = este usuário recebeu e-mail de ciclo de vida nas últimas 24h. */
  isSuppressed(userId: string): boolean
  /** Quantos dos ids consultados estão suprimidos. Para o payload do job. */
  readonly suppressedCount: number
  /** true = alguma consulta falhou e a trava fechou em cima de TODOS os ids. */
  readonly degraded: boolean
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function parseTime(raw: unknown): number {
  if (!raw) return 0
  const t = Date.parse(String(raw))
  return Number.isNaN(t) ? 0 : t
}

/**
 * Carrega, em lote, quem está dentro da janela de supressão.
 *
 * @param admin  cliente Supabase com service role (os jobs já criam um).
 * @param userIds ids candidatos do job que está chamando.
 */
export async function loadLifecycleSuppression(
  admin: SupabaseClient,
  userIds: string[],
): Promise<LifecycleSuppression> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0)))

  if (ids.length === 0) {
    return { isSuppressed: () => false, suppressedCount: 0, degraded: false }
  }

  const cutoff = Date.now() - SUPPRESSION_WINDOW_MS
  const lastEmailAt = new Map<string, number>()

  const bump = (userId: unknown, when: number) => {
    if (typeof userId !== 'string' || !userId || when <= 0) return
    // KINEO-SKIP-STAMP-2026-08-05 — carimbo de PULO não cala ninguém. Só entra
    // na janela de 24h o carimbo que corresponde a um e-mail que saiu de verdade.
    if (!isRealSendStamp(when)) return
    if ((lastEmailAt.get(userId) ?? 0) < when) lastEmailAt.set(userId, when)
  }

  /** Falha fechada: suprime todo o lote e avisa alto. */
  const closed = (reason: string): LifecycleSuppression => {
    console.error(
      `[lifecycle-suppression] FALHA FECHADA (${reason}) — ${ids.length} destinatário(s) suprimido(s) nesta execução`,
    )
    const all = new Set(ids)
    return { isSuppressed: (u) => all.has(u), suppressedCount: all.size, degraded: true }
  }

  try {
    for (const part of chunk(ids, CHUNK_SIZE)) {
      const { data: profileRows, error: profileErr } = await admin
        .from('profiles')
        .select(['id', ...PROFILE_TIMESTAMP_COLUMNS].join(', '))
        .in('id', part)

      if (profileErr) return closed(`profiles: ${profileErr.code ?? '?'} ${profileErr.message}`)

      for (const row of (profileRows ?? []) as unknown as Array<Record<string, unknown>>) {
        for (const col of PROFILE_TIMESTAMP_COLUMNS) bump(row.id, parseTime(row[col]))
      }

      // send-recovery é o único que NÃO marca em profiles — o carimbo dele mora
      // na linha de checkout_abandoned. Sem esta segunda consulta o job mais
      // agressivo da casa (a cada 2h) ficaria invisível para os outros três.
      const { data: abandonedRows, error: abandonedErr } = await admin
        .from('checkout_abandoned')
        .select('user_id, recovery_sent_at')
        .in('user_id', part)
        // KINEO-SKIP-STAMP-2026-08-05 — corta o carimbo de PULO na origem, em vez
        // de trazer a linha e descartá-la no `bump`. Mesmo resultado, menos I/O.
        .gte('recovery_sent_at', new Date(REAL_SEND_FLOOR_MS).toISOString())

      if (abandonedErr) {
        return closed(`checkout_abandoned: ${abandonedErr.code ?? '?'} ${abandonedErr.message}`)
      }

      for (const row of (abandonedRows ?? []) as unknown as Array<Record<string, unknown>>) {
        bump(row.user_id, parseTime(row.recovery_sent_at))
      }
    }
  } catch (err) {
    return closed(err instanceof Error ? err.message : String(err))
  }

  const suppressed = new Set<string>()
  for (const id of ids) {
    if ((lastEmailAt.get(id) ?? 0) > cutoff) suppressed.add(id)
  }

  if (suppressed.size > 0) {
    console.log(
      `[lifecycle-suppression] ${suppressed.size}/${ids.length} suprimido(s) — e-mail de ciclo de vida nas últimas ${LIFECYCLE_SUPPRESSION_HOURS}h`,
    )
  }

  return { isSuppressed: (u) => suppressed.has(u), suppressedCount: suppressed.size, degraded: false }
}
