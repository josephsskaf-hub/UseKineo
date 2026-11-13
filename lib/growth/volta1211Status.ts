// ═══ KINEO-VOLTA-STATUS-1311 — o estado da carta de volta no Resend, sem o painel (CEO 13/11 16:40: "estou cega para Bounced e Complained") ═══
//
// FONTE (documentação oficial do Resend, lida em 13/11/2026):
//   · GET https://api.resend.com/emails            → "List emails": { object:'list', has_more, data:[{ id, to[], created_at, subject,
//                                                     last_event, … }] }, `limit` 1–100, cursor `after`/`before` (só um dos dois).
//   · GET https://api.resend.com/emails/{id}       → "Retrieve email": { id, to, created_at, last_event, tags, … }.
//   · last_event ∈ bounced, canceled, clicked, complained, delivered, delivery_delayed, failed, opened, queued, scheduled, sent,
//     suppressed (delivery_delayed vira bounced depois de até 14 h de tentativas).
//   · Limite: 10 requisições por segundo por time (429 acima). Toda requisição precisa de User-Agent (sem ele, 403).
//   · O envio devolve { id }. Até 13/11 a casa NÃO guardava esse id: os 50 primeiros da volta_1211 são achados pela LISTA, casando
//     o destinatário com o horário do carimbo volta_1211_emailed (o e-mail nasce no Resend ANTES do carimbo, que só é gravado com o
//     envio aceito). Dali em diante o carimbo leva `resend_id` e a consulta é por id.
// O QUE ESTE ARQUIVO NÃO FAZ: não envia, não grava, não devolve endereço. Só conta.

export const VOLTA_STATUS_MARK = 'KINEO-VOLTA-STATUS-1311' as const

export const RESEND_LAST_EVENTS = [
  'sent', 'delivered', 'delivery_delayed', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'suppressed',
  'queued', 'scheduled', 'canceled',
] as const
export type ResendLastEvent = (typeof RESEND_LAST_EVENTS)[number]
export type VoltaEstado = ResendLastEvent | 'outro' | 'sem_estado'

/** Janela do casamento pela lista: o e-mail é criado no Resend até 10 min antes do carimbo e nunca mais de 2 min depois. */
export const VOLTA_MATCH_ANTES_MS = 10 * 60_000
export const VOLTA_MATCH_DEPOIS_MS = 2 * 60_000
/** Teto de páginas da lista (100 por página) numa leitura: 60 páginas = 6.000 e-mails, ~7 s a 10 req/s. */
export const VOLTA_LISTA_MAX_PAGINAS = 60

export type ResendListado = { id: string; to: string[]; created_at: string; last_event: string | null }
export type VoltaEnviado = { email: string; stampMs: number; resendId: string | null }

export function normalizarEstado(raw: unknown): VoltaEstado {
  if (typeof raw !== 'string' || !raw) return 'sem_estado'
  return (RESEND_LAST_EVENTS as readonly string[]).includes(raw) ? (raw as ResendLastEvent) : 'outro'
}

/** created_at do Resend vem como "2026-11-13 16:40:12.345+00" ou ISO; os dois viram ms. */
export function resendMs(raw: unknown): number | null {
  if (typeof raw !== 'string' || !raw) return null
  const ms = Date.parse(raw.includes('T') ? raw : raw.replace(' ', 'T').replace(/\+00$/, 'Z'))
  return Number.isFinite(ms) ? ms : null
}

/** Casa cada enviado SEM id com um e-mail da lista: mesmo destinatário e criado na janela do carimbo. Cada e-mail da lista casa uma vez. */
export function casarPelaLista(enviados: VoltaEnviado[], listados: ResendListado[]): Map<number, VoltaEstado> {
  const usados = new Set<string>()
  const out = new Map<number, VoltaEstado>()
  enviados.forEach((e, i) => {
    if (e.resendId) return
    const alvo = e.email.trim().toLowerCase()
    let melhor: ResendListado | null = null
    let melhorDist = Infinity
    for (const l of listados) {
      if (usados.has(l.id)) continue
      if (!l.to.some((t) => typeof t === 'string' && t.trim().toLowerCase() === alvo)) continue
      const ms = resendMs(l.created_at)
      if (ms === null || ms < e.stampMs - VOLTA_MATCH_ANTES_MS || ms > e.stampMs + VOLTA_MATCH_DEPOIS_MS) continue
      const d = Math.abs(e.stampMs - ms)
      if (d < melhorDist) { melhor = l; melhorDist = d }
    }
    if (melhor) { usados.add(melhor.id); out.set(i, normalizarEstado(melhor.last_event)) }
  })
  return out
}

/** A lista do Resend vem do mais novo para o mais antigo: para quando a página inteira é mais velha que o 1º carimbo menos a janela. */
export function listaPassouDoInicio(pagina: ResendListado[], primeiroStampMs: number): boolean {
  if (pagina.length === 0) return true
  return pagina.every((l) => { const ms = resendMs(l.created_at); return ms !== null && ms < primeiroStampMs - VOLTA_MATCH_ANTES_MS })
}

export type VoltaContagem = Record<VoltaEstado, number>
export function contarEstados(estados: VoltaEstado[]): VoltaContagem {
  const c = Object.fromEntries([...RESEND_LAST_EVENTS, 'outro', 'sem_estado'].map((k) => [k, 0])) as VoltaContagem
  for (const e of estados) c[e]++
  return c
}

/**
 * A régua do lote (relatório div4-volta-1211-ensaio.md, aprovada pela CEO 13/11):
 *   spam (complained) 2 ou mais → PARA · 1 → OLHAR antes da próxima chamada
 *   devolvidos (bounced) ≥ 3% dos enviados → PARA
 *   descadastro ≥ 1% → PARA
 *   depois de 200 enviados, visitas pela carta < 1% → PARA
 *   mais da metade sem estado no Resend → OLHAR (a leitura não enxerga o lote; não decidir às cegas)
 * `last_event` é o ÚLTIMO estado: um e-mail entregue e depois marcado como spam aparece como complained — conta certo.
 */
export type VoltaVeredito = 'segue' | 'OLHAR' | 'PARA'
export function voltaRegua(m: { enviados: number; spam: number; devolvidos: number; descadastros: number; visitas: number; semEstado: number }): { veredito: VoltaVeredito; motivos: string[] } {
  const para: string[] = []
  const olhar: string[] = []
  if (m.spam >= 2) para.push(`spam: ${m.spam} (teto: 2)`)
  else if (m.spam === 1) olhar.push('spam: 1 (olhar antes da próxima chamada)')
  if (m.enviados > 0 && m.devolvidos / m.enviados >= 0.03) para.push(`devolvidos: ${m.devolvidos} de ${m.enviados} (≥ 3%)`)
  if (m.enviados > 0 && m.descadastros / m.enviados >= 0.01) para.push(`descadastros: ${m.descadastros} de ${m.enviados} (≥ 1%)`)
  if (m.enviados >= 200 && m.visitas / m.enviados < 0.01) para.push(`visitas: ${m.visitas} de ${m.enviados} (< 1% depois de 200)`)
  if (m.enviados > 0 && m.semEstado * 2 > m.enviados) olhar.push(`sem estado no Resend: ${m.semEstado} de ${m.enviados}`)
  if (para.length) return { veredito: 'PARA', motivos: [...para, ...olhar] }
  if (olhar.length) return { veredito: 'OLHAR', motivos: olhar }
  return { veredito: 'segue', motivos: [] }
}

/** KINEO-VOLTA-STATUS-ERRO-1311 — o `name` do erro que o Resend devolve ({ statusCode, message, name }), só quando é um identificador
 *  simples (ex.: restricted_api_key, validation_error). Qualquer outra coisa vira null: a rota nunca carrega texto livre do provedor. */
export async function nomeDoErroResend(r: { json: () => Promise<unknown> }): Promise<string | null> {
  try {
    const corpo = (await r.json()) as { name?: unknown } | null
    const n = corpo && typeof corpo.name === 'string' ? corpo.name : ''
    return /^[a-z][a-z0-9_]{0,63}$/.test(n) ? n : null
  } catch {
    return null
  }
}
