// KINEO-AUTOPILOT-2026-07-26 — telemetria do Autopilot.
//
// Sem isso o Autopilot é indebugável em produção: 42% dos renders deste app já
// morrem de forma invisível, e aqui NÃO existe um humano olhando a tela para
// perceber a falha. Todo desfecho de run vira uma linha em `events`.
//
// A coluna é `name` (NÃO `event_name`) — writeServerEvent já escreve assim e
// ainda tem fallback para projetos com o schema antigo de eventos.

import { writeServerEvent } from '@/lib/serverEvents'

export const AUTOPILOT_EVENT_PATH = '/api/cron/autopilot-generate'
// KINEO-AUTOPILOT-UI-2026-07-26 — a superfície do cliente
// (app/api/autopilot/schedules) grava com o MESMO helper, só mudando o `path`.
export const AUTOPILOT_SCHEDULES_EVENT_PATH = '/api/autopilot/schedules'

export type AutopilotEventName =
  | 'autopilot_run_started'
  | 'autopilot_run_published'
  | 'autopilot_run_skipped'
  | 'autopilot_run_failed'
  // KINEO-AUTOPILOT-UI-2026-07-26 — ciclo de vida da AGENDA (o funil humano).
  // Sem estes eventos não dá para responder "alguém chega no formulário?" —
  // os eventos de run acima só existem DEPOIS que uma agenda foi criada, então
  // um funil que morre antes disso era invisível por completo.
  | 'autopilot_schedule_created'
  | 'autopilot_schedule_paused'
  | 'autopilot_schedule_resumed'
  | 'autopilot_schedule_updated'
  | 'autopilot_schedule_deleted'
  | 'autopilot_schedule_blocked'

/** Nunca lança e nunca bloqueia o loop — analytics não pode derrubar o cron. */
export async function autopilotEvent(
  name: AutopilotEventName,
  args: {
    userId: string | null
    scheduleId?: string | null
    runId?: string | null
    channelId?: string | null
    metadata?: Record<string, unknown>
    /** Sobrescreve o `path` gravado em events. Default: a rota do cron. */
    path?: string | null
  },
): Promise<void> {
  try {
    await writeServerEvent({
      name,
      userId: args.userId,
      path: args.path ?? AUTOPILOT_EVENT_PATH,
      metadata: {
        schedule_id: args.scheduleId ?? null,
        run_id: args.runId ?? null,
        channel_id: args.channelId ?? null,
        ...(args.metadata ?? {}),
      },
    })
  } catch (e) {
    console.warn('[autopilot/events] write failed:', e instanceof Error ? e.message : String(e))
  }
}
