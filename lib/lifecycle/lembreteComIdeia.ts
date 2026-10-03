// ═══ KINEO-LEMBRETE-COM-A-IDEIA-2026-10-03 — "seu filme está esperando", com a ideia da pessoa ════════════════════
//
// PEDIDO (sessão CEO em nome do fundador, 03/10, item A "o grupo de dentro"): ~1 h depois do cadastro, quem PODE gerar
// e não gerou recebe um lembrete. O lembrete já existe — app/api/cron/send-activation-nudge (cron "40 * * * *",
// janela 1–6 h, 1× por pessoa, supressão cruzada de 24 h). O que o banco mostrou (30 dias, países do filme grátis,
// SQL no relatório): dos 50 que não tentaram gerar na 1ª hora, 47 receberam a carta, mediana de 89 min após o
// cadastro; 5 deles (10,6%) fizeram um filme depois, todos em até 48 h. Ou seja: o lembrete chega, e na hora certa.
//
// OS DOIS BURACOS que esta peça fecha:
//   (1) A carta NÃO sabe a ideia da pessoa. Ela oferece três tópicos da prateleira, mas a pessoa que digitou "a
//       cidade perdida sob o Titicaca" antes de se cadastrar recebe "Bermuda Triangle". A ideia agora fica gravada no
//       evento de chegada do cadastro (`metadata.idea`, ≤120 caracteres; lib/growth/ideiaPousaNoStudio.ts
//       trechoDaIdeia) e a carta a cita: assunto "Your film about “X” is one click away", botão abrindo o compositor
//       com a ideia JÁ na caixa (composerUrl → prefill, NUNCA create_intent: nada gera sozinho).
//   (2) A carta ia também para quem NÃO PODE gerar: conta 'region_paid_only' (fora do filme grátis por país, 0
//       crédito — lib/freeFilmPolicy.ts) e 'blocked' (trial negado pelas travas anti-abuso). Para elas, "seu primeiro
//       filme é grátis" é promessa falsa. Agora pulam com o carimbo-sentinela (continuam elegíveis para outros jobs).
//
// MODO DA IDEIA (interruptor em código, nunca env): 'dry_run' por padrão. Em 'dry_run' a carta que SAI é a de sempre;
// a rota só CALCULA a versão com a ideia e devolve no JSON quantas cartas a teriam (sem PII). 'live' troca a carta.
// 'off' nem calcula. A recusa de quem não pode gerar (2) vale em qualquer modo — só reduz envio, nunca cria.
//
// Módulo PURO (sem import, sem env, sem banco): o guardião scripts/test-lembrete-com-ideia-2026-10-03.mjs o executa.

export type LembreteComIdeiaModo = 'off' | 'dry_run' | 'live'

export const LEMBRETE_COM_IDEIA: LembreteComIdeiaModo = 'dry_run'

export const LEMBRETE_COM_IDEIA_VERSION = 'lembrete_com_ideia_2026_10_03' as const

/** Campanha (utm_campaign) do botão da ideia — separada de d0_activation/d0_activation_topic para medir o clique. */
export const LEMBRETE_IDEIA_CAMPAIGN = 'd0_activation_own_idea'

/** Estados de trial em que a conta NÃO tem como gerar de graça (0 crédito por desenho). */
export const TRIAL_SEM_FILME: readonly string[] = ['region_paid_only', 'blocked']

/** A conta pode receber "seu primeiro filme está a um clique"? (plano pago é tratado antes, pela rota). */
export function podeGerarParaLembrete(row: { trial_status?: string | null } | null | undefined): boolean {
  const ts = typeof row?.trial_status === 'string' ? row.trial_status.trim().toLowerCase() : ''
  return !TRIAL_SEM_FILME.includes(ts)
}

const IDEIA_MIN = 6
const IDEIA_MAX = 120
// Começo de instrução a um chatbot (e não de tema): a carta não cita "Create a 40-second video titled…".
const INSTRUCAO = /^(create|write|make|generate|produce|give me|you are|act as|absolutely|sure|here is|here's|below is|crie|escreva|faça|gere|crea|escribe|haz|genera)\b/i

/** Limpa a ideia gravada (null = não citar). Mesmas regras do trecho gravado + filtro de instrução e de marcador. */
export function ideiaCitavel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.replace(/\s+/g, ' ').trim().slice(0, IDEIA_MAX).trim()
  if (t.length < IDEIA_MIN) return null
  if (!/\p{L}{3}/u.test(t)) return null
  if (INSTRUCAO.test(t)) return null
  if (/^(HOOK|MICRO REWARD|ESCALATION|PAYOFF|STYLE|SCENE)\s*[:：]/i.test(t)) return null
  if (/https?:\/\/|www\./i.test(t)) return null
  return t
}

/**
 * A ideia mais recente gravada nos eventos de chegada do cadastro. `linhas` vem ordenada da MAIS NOVA para a mais
 * antiga (a rota pede `order created_at desc`); a primeira citável vence.
 */
export function ideiaDoCadastro(linhas: ReadonlyArray<{ metadata?: unknown } | null | undefined>): string | null {
  for (const l of linhas ?? []) {
    const md = l?.metadata
    if (!md || typeof md !== 'object') continue
    const ideia = ideiaCitavel((md as Record<string, unknown>).idea)
    if (ideia) return ideia
  }
  return null
}

/** Para o assunto: a ideia cabe numa linha de caixa de entrada (≤ 60), cortada em palavra com reticência. */
export function ideiaNoAssunto(ideia: string): string {
  if (ideia.length <= 60) return ideia
  const corte = ideia.slice(0, 59)
  const espaco = corte.lastIndexOf(' ')
  return `${(espaco >= 30 ? corte.slice(0, espaco) : corte).trim()}…`
}

export function assuntoComIdeia(ideia: string): string {
  return `Your film about “${ideiaNoAssunto(ideia)}” is one click away`
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** O bloco da ideia (texto e HTML). Nada de crédito, preço ou promessa nova: a ideia, o lugar onde ela está, 1 clique. */
export function blocoDaIdeia(ideia: string, href: string): { text: string; html: string } {
  const text = `Your idea is saved: "${ideia}"\nIt's already in the box — one click and the film starts:\n${href}\n`
  const html = `<p style="margin:0 0 8px;">Your idea is saved:</p>
  <p style="margin:0 0 14px;padding:12px 14px;border:1px solid #e6e8ec;border-radius:10px;font-weight:bold;">“${esc(ideia)}”</p>
  <p style="margin:0 0 18px;">It’s already in the box — one click and the film starts.</p>
  <p style="margin:0 0 24px;"><a href="${esc(href)}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Make this film →</a></p>`
  return { text, html }
}
