// ═══ KINEO-IDEIA-POUSA-NO-STUDIO-2026-10-03 — a ideia digitada antes do cadastro pousa no Studio ═══════════════════
//
// PEDIDO (sessão CEO em nome do fundador, 03/10, item A "o grupo de dentro"): a ideia que a pessoa digitou ANTES de
// criar a conta (páginas SEO, home, landings de nicho, o próprio /studio deslogado) tem que chegar PREENCHIDA no Studio
// (/studio), a UM clique de gerar — e NUNCA virar render sozinha.
//
// O QUE O BANCO MOSTROU (30 dias, países de PAISES_FILME_GRATIS, SQL no relatório da tarefa):
//   · A ideia NÃO se perde no login: 134 de 135 pessoas que digitaram uma ideia chegaram à tela de criar com ela na
//     URL na 1ª hora (auth_callback_completed.has_prompt + generate_arrived_server.has_prompt). OAuth e confirmação de
//     e-mail carregam o `next` inteiro.
//   · Ela pousava na tela ERRADA: 133 de 135 caíram no /studio/create (a casa de máquinas, GenerateClient), não no
//     Studio — e 60 delas (44%) tiveram o render DISPARADO SOZINHO pelo auto-start de ativação (create_intent=fast das
//     páginas SEO). Em 60 dias, filme de auto-start pagou 2 em 327 (0,6%); filme apertado à mão, 9 em 430 (2,1%).
//
// A CURA, no CAMINHO (nunca na tela): toda saída de autenticação — /auth/callback (Google/Apple e confirmação de
// e-mail), o cadastro com confirmação automática e o login por senha — passa o destino por `destinoDaIdeia()`. Se o
// destino é a casa de máquinas COM uma ideia, ele vira /studio com a ideia e as escolhas visíveis (motor, duração,
// modo, formato, língua, atribuição) e SEM os gatilhos de auto-start (create_intent, autoanalyze, studio). O clique
// em Gerar do Studio continua levando ao /studio/create como sempre — é ele o consentimento.
//
// O QUE FICA COMO ESTÁ (de propósito): destino sem ideia; checkout; retomada de render (generationId/resume/return/
// session_id); desbloqueio de marca d'água; avatar; tópico viral por id; o "primeiro filme" pago de quem acabou de
// comprar (utm_source=checkout_success + utm_medium=first_win). A tela de cadastro continua calculando o destino
// antigo (/studio/create) — as provas de "trabalho salvo" e a recuperação de senha leem esse formato.
//
// Interruptor em código: IDEIA_POUSA_NO_STUDIO=false devolve o comportamento anterior byte a byte.
// Módulo PURO (sem import, sem env, sem banco): o guardião scripts/test-ideia-sobrevive-login-2026-10-03.mjs o executa.

export const IDEIA_POUSA_NO_STUDIO = true

export const IDEIA_POUSA_NO_STUDIO_VERSION = 'ideia_pousa_no_studio_2026_10_03' as const

/** Telas que montam o GenerateClient (o /generate é o porteiro antigo que redireciona para o /studio/create). */
const CASA_DE_MAQUINAS = new Set(['/studio/create', '/generate'])

export const STUDIO_PATH = '/studio'

/**
 * Chaves que atravessam para o Studio — exatamente as que o StudioClient lê da URL (prompt/engine/duration/
 * script_mode/aspect/language/intent_campaign/onboarding_goal/chatgpt_quickstart, a revisão de série) mais a
 * atribuição e os marcadores de cadastro (signup=1 dispara a conversão do Ads; welcome=1 o catch-all de origem).
 */
const ATRAVESSAM: readonly string[] = [
  'prompt', 'engine', 'duration', 'script_mode', 'aspect', 'language',
  'intent_campaign', 'onboarding_goal', 'chatgpt_quickstart',
  'studio_continuation', 'series', 'continuation_source',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid',
  'welcome', 'signup',
]

/** Os gatilhos do auto-start: NUNCA atravessam (é o ponto todo). */
export const GATILHOS_DE_AUTOSTART: readonly string[] = ['create_intent', 'autoanalyze', 'studio']

/** Presença de qualquer uma = fluxo que pertence à casa de máquinas; o destino fica intacto. */
const FICAM_NA_MAQUINA: readonly string[] = [
  'generationId', 'resume', 'return', 'session_id', 'wm_unlock', 'avatar', 'viral_topic', 'topic',
]

const BASE = 'https://kineo.local'

/**
 * Para onde a pessoa vai depois de autenticar. `path` é um destino interno JÁ normalizado (resolveAuthRedirect /
 * normalizeInternalRedirect). Qualquer coisa que não seja a casa de máquinas com uma ideia volta idêntica.
 */
export function destinoDaIdeia(path: string, ligado: boolean = IDEIA_POUSA_NO_STUDIO): string {
  if (!ligado || typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return path
  let url: URL
  try {
    url = new URL(path, BASE)
  } catch {
    return path
  }
  if (url.origin !== BASE) return path
  if (!CASA_DE_MAQUINAS.has(url.pathname)) return path
  const p = url.searchParams
  if (!(p.get('prompt') ?? '').trim()) return path
  if (FICAM_NA_MAQUINA.some((k) => p.has(k))) return path
  if (p.get('utm_source') === 'checkout_success' && p.get('utm_medium') === 'first_win') return path

  const destino = new URLSearchParams()
  for (const [k, v] of Array.from(p.entries())) {
    if (!ATRAVESSAM.includes(k) || destino.has(k)) continue
    destino.set(k, k === 'prompt' ? v.trim() : v)
  }
  return `${STUDIO_PATH}?${destino.toString()}`
}

/** O destino foi trocado por esta régua? (telemetria: `idea_to_studio` no evento de chegada do callback). */
export function ideiaFoiParaOStudio(antes: string, depois: string): boolean {
  return antes !== depois && depois.startsWith(`${STUDIO_PATH}?`)
}

/**
 * KINEO-LEMBRETE-COM-A-IDEIA-2026-10-03 — teto do trecho da ideia gravado no evento de chegada do cadastro
 * (auth_callback_completed / email_signup_completed, `metadata.idea`). É a ÚNICA cópia server-side da ideia de quem
 * nunca apertou Gerar — é dela que o lembrete de ~1 h (send-activation-nudge) tira o "seu filme sobre X". 120 = o
 * mesmo teto de prefill de e-mail (lib/lifecycle/composerUrl.ts COMPOSER_PREFILL_MAX_CHARS): tamanho de título.
 */
export const IDEIA_TRECHO_MAX = 120

/** O trecho da ideia que viaja num destino interno (null sem ideia). Espaços colapsados, sem quebra de linha. */
export function trechoDaIdeia(path: string | null | undefined): string | null {
  if (typeof path !== 'string' || !path.startsWith('/')) return null
  try {
    const raw = new URL(path, BASE).searchParams.get('prompt') ?? ''
    const t = raw.replace(/\s+/g, ' ').trim().slice(0, IDEIA_TRECHO_MAX).trim()
    return t || null
  } catch {
    return null
  }
}
