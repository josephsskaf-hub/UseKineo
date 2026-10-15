// ═══ KINEO-STUDIO-FANTASMA-1510 — as regras puras dos 4 consertos da tela do Studio (/studio/create) ═══════════════
//
// Achados seguindo 4 contas-agente (docs/ROBOS-DE-REVIEW-E-DIRETORIOS-2026-10-15.md):
//   1. FILME FANTASMA — `?autoanalyze=1&prompt=…` ficava na URL para sempre; recarregar/voltar disparava a análise de
//      novo sem clique (Tab 15/10: roteiro novo 1 s depois da recarga; vmail.dev 04/09: 5 recargas → 2 renders).
//   2. TRAVA DE SALDO FURADA — o efeito esperava 1,5 s o saldo e depois seguia SEM a guarda (Tab: 1 cr, filme a 9).
//   3. "VIDEO GENERATION FAILED" FALSO — o fetch do navegador caía e a tela dizia "falhou" enquanto o servidor
//      terminava o filme (bu.app 23/09: 2 × "falhou", 2 filmes entregues 11 min depois).
//   4. DOWNLOAD — o botão ficava abaixo do player de 78vh; Tab e AgentMail foram ao /history para baixar.
//
// Módulo SEM import de propósito: o guardião scripts/test-studio-fantasma-1510.mjs o transpila e executa cru.

/** Parâmetro de auto-start que este conserto consome UMA vez e tira da URL. */
export const AUTOANALYZE_PARAM = 'autoanalyze'
export const AUTOANALYZE_SESSION_PREFIX = 'kineo:autoanalyze:v1'

/** Validade da marca "já analisei este texto nesta aba". Clique novo no MESMO texto depois disso volta a analisar sozinho. */
export const AUTOANALYZE_SESSION_TTL_MS = 30 * 60 * 1000

/**
 * Chave de sessionStorage para "este texto já foi auto-analisado nesta aba". O texto não vai para o storage (só um
 * hash FNV-1a + o tamanho), no mesmo molde de activationAutostartSessionKey do GenerateClient.
 */
export function autoanalyzeSessionKey(prompt: string): string {
  const texto = prompt.trim()
  let hash = 2166136261
  for (let index = 0; index < texto.length; index += 1) {
    hash ^= texto.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `${AUTOANALYZE_SESSION_PREFIX}:${(hash >>> 0).toString(36)}:${texto.length}`
}

/**
 * Este texto já foi auto-analisado nesta aba? `marcaRaw` = o valor da chave autoanalyzeSessionKey (timestamp em ms, como
 * texto); `studioGoRaw` = o token 'kineo:studio:go:v1' que o clique em Gerar do /studio grava ({ t }). Um token MAIS
 * NOVO que a marca é um clique novo (a pessoa pediu de novo o mesmo texto) e vence a marca. Ilegível = não vale.
 */
export function jaConsumidoNaAba(input: { marcaRaw: string | null; studioGoRaw: string | null; agoraMs: number }): boolean {
  if (!input.marcaRaw) return false
  const t = Number(input.marcaRaw)
  if (!Number.isFinite(t) || t <= 0) return false
  const idade = input.agoraMs - t
  if (idade < 0 || idade >= AUTOANALYZE_SESSION_TTL_MS) return false
  let cliqueNovo = false
  if (input.studioGoRaw) {
    try {
      const tok = JSON.parse(input.studioGoRaw) as { t?: unknown }
      cliqueNovo = typeof tok?.t === 'number' && tok.t > t
    } catch {
      cliqueNovo = false
    }
  }
  return !cliqueNovo
}

/**
 * O endereço sem `autoanalyze` (prompt, motor, duração, studio=1, UTMs e o resto ficam). null = não havia o que tirar.
 * Recebe e devolve só caminho+busca+hash, para ir direto no history.replaceState.
 */
export function enderecoSemAutoanalyze(href: string): string | null {
  let url: URL
  try {
    url = new URL(href, 'https://usekineo.com')
  } catch {
    return null
  }
  if (!url.searchParams.has(AUTOANALYZE_PARAM)) return null
  url.searchParams.delete(AUTOANALYZE_PARAM)
  return `${url.pathname}${url.search}${url.hash}`
}

export type DecisaoAutoanalyze =
  /** sem ?autoanalyze=1 com texto: nada a fazer */
  | 'nada'
  /** esta montagem ou esta aba já consumiu o mesmo texto: não analisa de novo (recarga/voltar/remontagem) */
  | 'ja_consumido'
  /** saldo ainda não chegou: espera ("Checking your credits…"), nunca segue às cegas */
  | 'checando_saldo'
  /** a leitura do saldo terminou sem saldo: pede para tentar de novo, não começa nada */
  | 'saldo_falhou'
  /** saldo lido: segue para a guarda de sempre (outOfCredits / descida / análise) */
  | 'decidir'

export function decidirAutoanalyze(input: {
  auto: boolean
  prompt: string
  /** a chave já consumida NESTA montagem (autoAnalyzeKeyRef) */
  chaveDaMontagem: string | null
  /** a marca da aba (sessionStorage) ainda vale para este texto */
  consumidoNaSessao: boolean
  credits: number | null
  creditsLoading: boolean
}): DecisaoAutoanalyze {
  const chave = input.prompt.trim()
  if (!input.auto || !chave) return 'nada'
  if (input.chaveDaMontagem === chave) return 'ja_consumido'
  if (input.consumidoNaSessao) return 'ja_consumido'
  if (input.credits === null) return input.creditsLoading ? 'checando_saldo' : 'saldo_falhou'
  return 'decidir'
}

export const CHECKING_CREDITS_COPY = 'Checking your credits…'
export const CREDITS_READ_FAILED_COPY = "We couldn't check your credits, so nothing was started. Try again."

// ── (3) a tela só diz "falhou" depois de perguntar ao servidor ───────────────────────────────────────────────────────

export const STILL_RENDERING_COPY = "Still rendering — this can take up to 15–20 min. We'll keep it in your Library."
/** Depois disto a tela para de perguntar e manda para a Biblioteca (o servidor segue e manda o e-mail de pronto). */
export const STILL_RENDERING_POLL_MAX_MS = 25 * 60 * 1000
export const STILL_RENDERING_POLL_EVERY_MS = 15 * 1000

export type MotivoAindaNoForno = 'server_rendering' | 'server_delivered' | 'kineo1_job_open' | 'nothing_in_flight'

/**
 * Antes de declarar falha num erro do NAVEGADOR (fetch que caiu, resposta ilegível): o servidor ainda tem este filme?
 *  · /api/compose/active diz 'rendering'                                    → em voo
 *  · /api/compose/active diz 'completed' com filme NASCIDO depois do clique → já entregue
 *  · Kineo 1 cujo pedido foi gravado no servidor (render_job_opened ok)     → o cron termina (finish-orphan-jobs/stranded)
 *  · nada disso                                                              → falha de verdade (a tela de sempre)
 */
export function decidirAindaNoForno(input: {
  probe: { state: 'rendering' } | { state: 'completed'; completedAtMs: number } | null
  inicioMs: number
  pedidoKineo1Aberto: boolean
}): { emVoo: boolean; motivo: MotivoAindaNoForno } {
  const p = input.probe
  if (p && p.state === 'rendering') return { emVoo: true, motivo: 'server_rendering' }
  if (p && p.state === 'completed' && Number.isFinite(p.completedAtMs) && p.completedAtMs >= input.inicioMs) {
    return { emVoo: true, motivo: 'server_delivered' }
  }
  if (input.pedidoKineo1Aberto) return { emVoo: true, motivo: 'kineo1_job_open' }
  return { emVoo: false, motivo: 'nothing_in_flight' }
}

/** O filme que a sonda acabou de ver pronto é o deste aviso? (nascido depois do clique) */
export function filmeDoAvisoChegou(
  probe: { state: 'rendering' } | { state: 'completed'; completedAtMs: number } | null,
  inicioMs: number,
): boolean {
  return Boolean(probe && probe.state === 'completed' && Number.isFinite(probe.completedAtMs) && probe.completedAtMs >= inicioMs)
}
