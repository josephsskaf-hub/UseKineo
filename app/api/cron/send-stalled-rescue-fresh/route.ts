// KINEO-STALLED-FRESCOR-2026-09-05 — A FAIXA RÁPIDA DO "SEU VÍDEO NÃO SAIU"
//
// O E-MAIL CERTO EXISTE, SAI SOZINHO, E CHEGA 25 DIAS DEPOIS.
//
// Medido em produção em 05/09, sobre os 302 envios desta campanha nos últimos
// 14 dias, sem herdar número de documento nenhum:
//
//   · mediana entre o `video_generation_started` da pessoa e o e-mail que fala
//     exatamente disso: **597 horas — 24,9 dias**;
//   · **3 de 302** chegaram em menos de 2 horas;
//   · o lote de hoje (25 pessoas, 16:30 UTC) tinha mediana de **19,2 dias**,
//     com o mais antigo em 26,7;
//   · desfecho dos 302: **1 filme, 0 pagamentos**.
//
// A ORDENAÇÃO NÃO É A CAUSA — E ISSO IMPORTA, PORQUE ERA A SUSPEITA ÓBVIA.
// A prioridade por relógio de trial (`app/api/admin/send-stalled-rescue`,
// KINEO-STALLED-RESCUE-RAMP-2026-08-13) funciona: no lote de hoje as 5 pessoas
// com evento de início nas últimas 48h eram exatamente as 5 com trial vivo, e
// foram as 5 primeiras — a mais rápida recebeu em 2,4h. Mexer na ordem não
// mudaria um único envio. O que sobra é o RELÓGIO DA RAMPA: um lote por dia,
// 16:30 UTC. Quem quebra às 17:00 espera 23,5 horas.
//
// E 23,5 horas é fora da janela em que este produto tem intenção. A lei medida
// (docs/PLANO-CLAUDE-ASSINATURAS-2026-09-05.md, §1): o 2º filme é da MESMA
// sessão, mediana 22 minutos; fora dos 30 minutos, quase nunca. Para o
// PRIMEIRO filme não há razão para supor melhor.
//
// O QUE ESTE ARQUIVO FAZ, E SÓ ISTO: uma segunda passada, de hora em hora,
// restrita a quem quebrou nas últimas `FRESH_HOURS` horas, com teto pequeno.
// Nenhuma copy nova, nenhuma promessa nova, nenhum preço. O mesmo e-mail
// revisado, o mesmo `SUBJECT`, os mesmos filtros — só que hoje, não em 19 dias.
//
// POR QUE NÃO GERA E-MAIL REPETIDO: pelo mesmo invariante que já sustenta a
// rampa diária — `profiles.stalled_rescue_emailed` é boolean e a coorte filtra
// `.eq(FLAG_COLUMN, false)`. Quem a faixa rápida atender não aparece no lote
// das 16:30. **1 e-mail por pessoa, para sempre**, continua valendo byte a
// byte, e a supressão cruzada de 4h continua rodando dentro da rota admin.
//
// POR QUE O VOLUME NÃO EXPLODE: a coorte fresca é minúscula por construção —
// medida hoje, **2 pessoas** em toda a fila com início nas últimas 48h. O teto
// de `FRESH_LIMIT` por execução é uma trava de segurança para o dia em que um
// apagão de fornecedor derrubar muita gente de uma vez; nesse dia, mandar é
// exatamente o que se quer.
//
// ⚠ NASCE DESARMADO, DE PROPÓSITO (regra do ciclo de 05/09: rota nova nasce
// dry-run, o SEND é do fundador). Sem `KINEO_STALLED_FRESH_ENABLED=true` esta
// rota NÃO manda e-mail: ela roda a coorte, devolve `mode:'DISARMED'` com
// `would_send` preenchido e grita no log. O modo desarmado é BARULHENTO de
// propósito — o CLAUDE.md registra dois crons que dormiram 30 dias devolvendo
// 200 OK em silêncio, e este não vai ser o terceiro.
//
// COMO DESLIGAR: remova a entrada `/api/cron/send-stalled-rescue-fresh` do
// `vercel.json`, ou apague a env. O lote diário e a rota admin não mudam.
import { NextRequest, NextResponse } from 'next/server'
import { GET as adminStalledRescue } from '@/app/api/admin/send-stalled-rescue/route'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso. Sem esta linha
// todo GET do supabase-js com URL estavel vai para o Data Cache da Vercel PARA
// SEMPRE — e uma faixa rapida que le a coorte de uma hora atras manda e-mail
// para quem ja foi atendido. Nao remover.
export const fetchCache = 'force-no-store'

/** Só entra na faixa rápida quem começou dentro desta janela. */
const DEFAULT_FRESH_HOURS = 48
/** Teto por execução. Ver "POR QUE O VOLUME NÃO EXPLODE" acima. */
const DEFAULT_FRESH_LIMIT = 5
/** Mesmo espírito do MAX_DAILY_LIMIT da rampa: erro de digitação na env não
 *  pode virar blast de coorte inteira. */
const MAX_FRESH_LIMIT = 15
const MAX_FRESH_HOURS = 168

function envInt(name: string, fallback: number, max: number): number {
  const raw = Number(process.env[name])
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return Math.min(Math.floor(raw), max)
}

function freshHours(): number {
  return envInt('KINEO_STALLED_FRESH_HOURS', DEFAULT_FRESH_HOURS, MAX_FRESH_HOURS)
}

function freshLimit(): number {
  return envInt('KINEO_STALLED_FRESH_LIMIT', DEFAULT_FRESH_LIMIT, MAX_FRESH_LIMIT)
}

function isArmed(): boolean {
  return process.env.KINEO_STALLED_FRESH_ENABLED === 'true'
}

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const hours = freshHours()
  const limit = freshLimit()
  const armed = isArmed()

  // A rota admin lê `confirm`, `limit` e `fresh_hours` de
  // `req.nextUrl.searchParams`, e a autenticação dela aceita o MESMO bearer.
  // Repassamos o header recebido em vez de reconstruí-lo da env: se a forma do
  // segredo mudar, as duas pontas mudam juntas por construção.
  const url = new URL(req.nextUrl.toString())
  url.pathname = '/api/admin/send-stalled-rescue'
  url.searchParams.set('fresh_hours', String(hours))
  url.searchParams.set('limit', String(limit))
  // DESARMADO = sem `confirm`. A rota admin cai no ramo de DRY_RUN e não toca
  // no Resend. É o mesmo caminho que o fundador vê ao abrir a URL no navegador.
  if (armed) url.searchParams.set('confirm', 'SEND')
  else url.searchParams.delete('confirm')

  const inner = new NextRequest(url, {
    headers: { authorization: req.headers.get('authorization') ?? '' },
  })

  try {
    const res = await adminStalledRescue(inner)
    // Envelopa preservando o corpo inteiro: o payload da rota admin é a única
    // prova de quantos saíram, quantos foram suprimidos e se um carimbo falhou.
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null

    if (!armed) {
      // Desarmado é BARULHENTO. `would_send` vem da própria coorte, então o
      // fundador vê quantas pessoas estão esperando agora — não um 200 vazio.
      const wouldSend =
        (body?.next_batch_size as number | undefined) ??
        (body?.remaining_unemailed as number | undefined) ??
        0
      console.warn(
        '[cron/stalled-rescue-fresh] DISARMED — set KINEO_STALLED_FRESH_ENABLED=true to arm.',
        JSON.stringify({ fresh_hours: hours, limit, would_send: wouldSend }),
      )
      return NextResponse.json(
        {
          mode: 'DISARMED',
          reason: 'KINEO_STALLED_FRESH_ENABLED is not "true" — no email was sent.',
          arm_with: 'KINEO_STALLED_FRESH_ENABLED=true',
          fresh_hours: hours,
          fresh_limit: limit,
          would_send: wouldSend,
          inner_status: res.status,
          result: body,
        },
        { status: res.status },
      )
    }

    console.log(
      '[cron/stalled-rescue-fresh] fast lane run',
      JSON.stringify({ fresh_hours: hours, limit, status: res.status, body }),
    )
    return NextResponse.json(
      { mode: 'ARMED', fresh_hours: hours, fresh_limit: limit, inner_status: res.status, result: body },
      { status: res.status },
    )
  } catch (err) {
    console.error('[cron/stalled-rescue-fresh] failed:', err)
    return NextResponse.json(
      { error: 'stalled-rescue fast lane failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
