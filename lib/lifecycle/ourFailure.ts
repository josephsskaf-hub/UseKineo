/**
 * KINEO-FAILED-BY-US-2026-08-12 — "esta geração falhou por causa NOSSA".
 *
 * ═══ POR QUE ESTE ARQUIVO EXISTE ═══
 *
 * Em 12/08, a leitura que a empresa tinha do próprio funil era: "50 dos 98
 * trials ativos nunca geraram um vídeo, e ZERO deles chegou a tentar". Ela
 * saiu de `videos` (nenhuma linha) e de `trial_credits_used` (zero), e as duas
 * fontes concordavam. A tabela `events` discorda: dos 52 trials ativos com
 * zero vídeo, **35 chamaram `generate_started`** e **23 têm falha registrada**
 * — 22 delas exclusivamente entre 09/08 e 10/08, o apagão de 30 horas do
 * fornecedor de render.
 *
 * As duas fontes concordavam porque medem a mesma coisa: **quando a falha é
 * nossa, o débito não acontece.** O crédito não sai, o vídeo não nasce, e a
 * pessoa que tentou cinco vezes fica indistinguível da que nunca abriu o app.
 * A evidência de que ela tentou existe num lugar só: `events`.
 *
 * REGRA TRANSFERÍVEL: *"não gastou crédito" não é "não tentou"*. Toda coorte
 * que se define por ausência (não gerou, não comprou, não usou) tem de ser
 * conferida contra `events` antes de virar decisão — senão a vítima de um
 * incidente nosso é tratada como desinteressada, e a copy escrita para ela
 * começa pedindo o que ela já tentou fazer.
 *
 * ═══ A REGRA DE CLASSIFICAÇÃO, E POR QUE ELA É ESTREITA DE PROPÓSITO ═══
 *
 * Este predicado autoriza uma AFIRMAÇÃO DE CULPA num e-mail ("não foi você").
 * O erro caro aqui não é deixar uma vítima de fora — é dizer "a falha foi
 * nossa" para quem bateu num paywall ou mandou entrada inválida. Por isso a
 * classificação é uma ALLOWLIST e falha FECHADA em símbolo desconhecido: quem
 * não se encaixa recebe a copy anterior, que não afirma culpa de ninguém.
 *
 * Duas cláusulas, e cada uma tem contraexemplo medido em produção:
 *
 *   1. `http_status >= 500` — 5xx é nosso por definição. Cobre as 106 linhas de
 *      `compose_not_ok`/502 do apagão de agosto. **Não** cobre as 6 linhas de
 *      `compose_not_ok`/400 (entrada recusada), nem `analyze_blocked_active_
 *      render_gate` (gate de cliente), nem os 402 de paywall
 *      (`compose_daily_free_limit`, `cinematic_gate_credits`, ...) — que a
 *      sprint de 05/08 já registrou como evento de NEGÓCIO contado como falha.
 *   2. Símbolo de apagão de fornecedor, com status ou sem ele — `openai_hang`
 *      não tem status nenhum, porque a lambda morre antes de haver resposta.
 *
 * Fora daí, não classificamos. `analyze_threw` e `fast_threw` (17 linhas cada,
 * sem status) provavelmente são nossos também, e ficam de fora **até que
 * alguém prove**: o custo de uma vítima a menos é uma copy mais fraca; o custo
 * de um falso positivo é uma desculpa por um erro que não cometemos, enviada a
 * quem sabe que não aconteceu.
 *
 * ═══ INVARIANTE (a mesma que `BLACKOUT_MARKER_REASONS` promete e já quebrou) ═══
 *
 * `send-blackout-winback` carrega um comentário exemplar dizendo "mantenha
 * ESTA lista como o ÚNICO lugar onde um sintoma novo se registra" — e mesmo
 * assim passou o apagão mais caro da história com dois símbolos, ambos de
 * OpenAI. Comentário que nomeia invariante é promessa; quem a cumpre é o
 * commit que cria o sintoma **também** editar a lista. Sintoma novo de queda de
 * fornecedor entra AQUI **e** na lista do `send-blackout-winback`, no mesmo
 * commit — as duas listas são deliberadamente distintas (ver a nota em
 * `PROVIDER_OUTAGE_REASONS`), e é justamente por serem distintas que ninguém
 * pode editar só uma e ir embora.
 */

/** O único `events.name` que carrega `reason` + `http_status` juntos. */
export const OUR_FAILURE_EVENT_NAME = 'generation_stage_error'

/**
 * Sintomas que significam "um fornecedor derrubou a geração", independentes de
 * status HTTP (`openai_hang` não tem status nenhum: a lambda morre antes de
 * existir resposta).
 *
 * ⚠️ NÃO É — E NÃO PODE VIRAR — O `BLACKOUT_MARKER_REASONS` DO
 * `send-blackout-winback`, POR MAIS PARECIDOS QUE OS DOIS PAREÇAM. A 1ª versão
 * deste comentário afirmava que aquele cron "consome esta MESMA constante", o
 * que era falso quando foi escrito e, pior, um convite para alguém torná-lo
 * verdadeiro. Os dois conjuntos diferem em `creatomate_unverified` de
 * propósito: lá o símbolo dispara uma CAMPANHA DE E-MAIL EM MASSA, e recusa
 * ambígua do provedor (um soluço de 1s) não pode disparar isso — decisão
 * registrada em 10/08. Aqui ele só muda um parágrafo de um e-mail que já ia
 * sair de qualquer jeito, para uma pessoa que já viu a tela falhar. Mesmo
 * vocabulário, consequências de ordens de grandeza diferentes: unificar as
 * duas listas trocaria a segurança da mais perigosa pela da mais barata.
 */
export const PROVIDER_OUTAGE_REASONS: ReadonlySet<string> = new Set([
  'openai_quota_dead',
  'openai_hang',
  'creatomate_rejected',
  'creatomate_unverified',
])

/** Piso do "é nosso por definição". Abaixo disto, a resposta é do cliente. */
export const OUR_FAILURE_MIN_HTTP_STATUS = 500

/**
 * `http_status` chega como número (o cliente manda `res.status`) ou como string
 * (linhas antigas e escritas de servidor). Qualquer outra coisa é NaN — e NaN
 * nunca passa no `>=`, então entrada estranha cai no lado seguro sozinha.
 */
function statusOf(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw)
  return NaN
}

/**
 * `true` ⇒ esta linha de `generation_stage_error` é falha NOSSA, no sentido
 * estrito acima: forte o bastante para o produto pedir desculpa por ela.
 */
export function isOurFailure(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  const m = metadata as { reason?: unknown; http_status?: unknown }
  const reason = typeof m.reason === 'string' ? m.reason : null
  if (reason !== null && PROVIDER_OUTAGE_REASONS.has(reason)) return true
  const status = statusOf(m.http_status)
  return Number.isFinite(status) && status >= OUR_FAILURE_MIN_HTTP_STATUS
}
