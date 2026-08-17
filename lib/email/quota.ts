// KINEO-EMAIL-QUOTA-2026-08-17 — gate de cota diária do Resend com RESERVA
// para os e-mails que trazem dinheiro.
//
// ─────────────────────────────────────────────────────────────────────────────
// O PROBLEMA (medido, não suposto)
// ─────────────────────────────────────────────────────────────────────────────
// 17/08 foi o dia recorde: 97 cadastros em 24h contra uma média de ~12. O
// check-up de fornecedores do mesmo dia mediu 72 e-mails no único ledger que
// existe (`trial_emails_log`) contra um teto de 100/dia do plano free do
// Resend — e esse 72 é PISO, porque os crons send-video-ready, send-recovery,
// send-reminders, send-activation-nudge, send-post-nudge e send-welcome enviam
// sem registrar nada. O total real está entre 72 e "já estourou ontem".
//
// Quando o teto estoura, o Resend responde 429 e TODO remetente deste repo cai
// no mesmo ramo: `console.error` e segue a vida. O e-mail some sem evento, sem
// gráfico e sem retry — e a fila do dia é atendida por ordem de cron, não por
// ordem de valor. Ou seja: hoje um nudge de ativação para quem cadastrou às
// 3h da manhã pode consumir a última vaga do dia, e o
// "Your Creator trial ends tonight" da pessoa que já gerou 5 vídeos morre.
// Isso não é hipótese de desenho: os crons de nudge rodam de hora em hora e o
// de lifecycle roda 1x/dia.
//
// ─────────────────────────────────────────────────────────────────────────────
// A DECISÃO DE PROJETO, e por que ela é o contrário do óbvio
// ─────────────────────────────────────────────────────────────────────────────
// O reflexo seria "enfileirar e reenviar amanhã". Errado por duas razões:
// (1) e-mail de trial é PERECÍVEL — "acaba hoje à noite" entregue amanhã é
// mentira, e "aqui está o que você perdeu" entregue 2 dias depois é ruído;
// (2) fila exige estado novo, retry, dedupe — infra nova para resolver um
// problema de PRIORIDADE.
//
// O que este arquivo faz é mais barato e mais certo: reserva. Os envios de
// baixa prioridade CEDEM a vaga quando o dia passa do limiar deles, e os de
// receita nunca são barrados por nós. A cota escassa é gasta de cima para
// baixo, e o que é perecível ganha na hora.
//
//   revenue → trial D1/D2/D3/D5/D10, resgate de checkout, teto de créditos.
//             NUNCA barrado por este gate. Se não couber, quem responde é o
//             Resend com 429 — e aí a linha no ledger é a prova para pagar o
//             plano, não uma decisão nossa escondida.
//   product → entrega e recuperação do produto (vídeo pronto, vídeo resgatado,
//             boas-vindas, créditos devolvidos). Cede a partir de 85%.
//   growth  → nudge de ativação, nudge de post, lembretes, winback de apagão,
//             blasts. Cede a partir de 60%.
//
// FALHA ABERTA, SEMPRE. Se a leitura do ledger falhar por qualquer motivo, o
// gate LIBERA o envio. Um gate de cota que barra e-mail por causa de um erro de
// banco é pior do que não ter gate: ele reproduz exatamente a falha silenciosa
// que existe para eliminar. Toda saída carrega `degraded: true` nesse caso, e o
// caller devolve isso na resposta do cron (mesma regra dos outros
// `*_degraded` deste repo: um 200 anômalo tem de ser distinguível de um 200
// normal).
//
// ─────────────────────────────────────────────────────────────────────────────
// O QUE ESTE ARQUIVO **NÃO** FAZ
// ─────────────────────────────────────────────────────────────────────────────
// Não escolhe destinatário, não escreve copy, não decide idempotência (isso é
// do claim em `trial_emails_log` / colunas `*_sent_at`, que continuam mandando)
// e NÃO chama o Resend. O fetch continua em cada remetente, de propósito:
// centralizar o envio significaria reescrever 30 call sites com formatos
// diferentes num dia de recorde de tráfego. Aqui são duas linhas por
// remetente — `claimEmailSlot` antes, `recordEmailSend` depois — e nenhum
// caminho existente muda de forma.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type EmailPriority = 'revenue' | 'product' | 'growth'

/**
 * Teto diário do provedor. Plano free do Resend = 100/dia. Env para poder
 * subir no MESMO minuto em que o fundador pagar o plano, sem deploy — se o
 * número tivesse de vir num commit, a compra dele ficaria refém de uma sprint.
 */
export function dailyCap(): number {
  const raw = Number(process.env.KINEO_EMAIL_DAILY_CAP)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 100
}

/**
 * Fração do teto a partir da qual cada prioridade cede a vaga.
 * `revenue` é 1 e nunca é consultado — está aqui só para o mapa ser total e
 * ninguém "consertar" isso adicionando um limiar depois.
 */
const YIELD_AT: Record<EmailPriority, number> = {
  revenue: 1,
  product: 0.85,
  growth: 0.6,
}

function envRatio(name: string, fallback: number): number {
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : fallback
}

function yieldThreshold(priority: EmailPriority): number {
  if (priority === 'growth') return envRatio('KINEO_EMAIL_YIELD_GROWTH', YIELD_AT.growth)
  if (priority === 'product') return envRatio('KINEO_EMAIL_YIELD_PRODUCT', YIELD_AT.product)
  return 1
}

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Início do dia UTC. O teto do Resend é diário em UTC. */
function startOfUtcDay(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

export type EmailSlot = {
  /** false = NÃO enviar. Só acontece para product/growth. */
  allowed: boolean
  /** Aceitos pelo Resend hoje (ok = true), medido no ledger. */
  usedToday: number
  cap: number
  priority: EmailPriority
  /** true = a contagem não pôde ser lida; liberamos por segurança. */
  degraded: boolean
  reason: 'ok' | 'yielded' | 'degraded_open' | 'no_client'
}

/**
 * Consulta a cota do dia e devolve se este envio pode sair.
 *
 * Corrida conhecida e aceita: entre a leitura e o envio, outro cron pode
 * ocupar vagas. O erro é de ±alguns e-mails e sempre no lado seguro, porque os
 * limiares (60%/85%) deixam folga de 15–40 envios acima de qualquer rajada
 * plausível de um cron. Transação ou lock aqui custaria mais do que o erro que
 * evitaria — e travaria envio, que é o pecado deste arquivo.
 */
export async function claimEmailSlot(params: {
  kind: string
  priority: EmailPriority
  admin?: SupabaseClient | null
}): Promise<EmailSlot> {
  const { kind, priority } = params
  const cap = dailyCap()
  const admin = params.admin ?? adminClient()

  if (!admin) {
    return { allowed: true, usedToday: 0, cap, priority, degraded: true, reason: 'no_client' }
  }

  let usedToday = 0
  try {
    const { count, error } = await admin
      .from('email_send_log')
      .select('id', { count: 'exact', head: true })
      .eq('ok', true)
      .gte('sent_at', startOfUtcDay())
    if (error) {
      console.warn(`[email-quota] contagem indisponível (${kind}): ${error.code ?? '?'} ${error.message}`)
      return { allowed: true, usedToday: 0, cap, priority, degraded: true, reason: 'degraded_open' }
    }
    usedToday = count ?? 0
  } catch (err) {
    console.warn(`[email-quota] contagem lançou (${kind}):`, err)
    return { allowed: true, usedToday: 0, cap, priority, degraded: true, reason: 'degraded_open' }
  }

  if (priority === 'revenue') {
    return { allowed: true, usedToday, cap, priority, degraded: false, reason: 'ok' }
  }

  const limit = Math.floor(cap * yieldThreshold(priority))
  if (usedToday >= limit) {
    // A linha do "não enviei" vale tanto quanto a do "enviei": sem ela, o
    // relatório vê um cron que mandou menos e-mails e não sabe se foi por
    // falta de gente ou por falta de cota.
    void recordEmailSend({
      kind,
      priority,
      ok: false,
      yielded: true,
      detail: `yield ${usedToday}/${cap} (limite ${limit})`,
      admin,
    })
    return { allowed: false, usedToday, cap, priority, degraded: false, reason: 'yielded' }
  }

  return { allowed: true, usedToday, cap, priority, degraded: false, reason: 'ok' }
}

/**
 * Registra a tentativa. Best-effort por construção: NUNCA lança, nunca é
 * aguardada num caminho que possa falhar o envio.
 *
 * `httpStatus === 429` é o único desfecho que também grava um evento — é o
 * número que hoje não aparece em lugar nenhum e o que justifica pagar o plano.
 */
export async function recordEmailSend(params: {
  kind: string
  priority: EmailPriority
  userId?: string | null
  ok: boolean | null
  httpStatus?: number | null
  yielded?: boolean
  detail?: string | null
  admin?: SupabaseClient | null
}): Promise<void> {
  const admin = params.admin ?? adminClient()
  if (!admin) return
  try {
    await admin.from('email_send_log').insert({
      kind: params.kind,
      priority: params.priority,
      user_id: params.userId ?? null,
      ok: params.ok,
      http_status: params.httpStatus ?? null,
      yielded: params.yielded ?? false,
      detail: params.detail ?? null,
    })
  } catch (err) {
    console.warn('[email-quota] log falhou:', err)
  }

  if (params.httpStatus === 429) {
    try {
      await admin.from('events').insert({
        user_id: params.userId ?? null,
        name: 'email_quota_exhausted',
        path: '/lib/email/quota',
        metadata: {
          kind: params.kind,
          priority: params.priority,
          cap: dailyCap(),
          source: 'resend_429',
        },
      })
    } catch {
      // já logado acima; um evento perdido não pode derrubar um envio
    }
  }
}

/**
 * Açúcar para os call sites: transforma o resultado do `fetch` do Resend em
 * uma linha de ledger. Aceita `Response` para não obrigar cada remetente a
 * lembrar de passar o status.
 */
export function recordResendResponse(params: {
  kind: string
  priority: EmailPriority
  userId?: string | null
  res: { ok: boolean; status: number }
  admin?: SupabaseClient | null
}): Promise<void> {
  return recordEmailSend({
    kind: params.kind,
    priority: params.priority,
    userId: params.userId,
    ok: params.res.ok,
    httpStatus: params.res.status,
    admin: params.admin,
  })
}
