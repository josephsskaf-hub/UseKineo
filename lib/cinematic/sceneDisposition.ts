// ═══ KINEO-353A-DISPOSICAO-DE-CENA-2026-08-26 ══════════════════════════════
//
// POR QUE ESTE ARQUIVO EXISTE
//
// Em 25 e 26/08 o cliente 19joschaschuetz96 tentou quatro vezes e recebeu
// quatro vezes a mesma frase: "Could not submit clips to AI generator." Fui
// investigar e descobri que o produto NÃO GUARDA em lugar nenhum o que o
// fornecedor respondeu. Os logs da Vercel daquele intervalo já expiraram.
// Resultado: a causa das quatro falhas é, e vai continuar sendo,
// DESCONHECIDA. Não é um mistério difícil — é um mistério que a gente
// escolheu não registrar.
//
// A informação existe no instante do erro e é jogada fora:
// `FalQueueSubmitError` já carrega `status` e `ambiguous`, e submitToFal já
// distingue "recusa explícita" (return null) de "pode ter sido aceito"
// (throw). O que faltava era um lugar para essa verdade morar.
//
// ⚠️ O QUE ESTE ARQUIVO **NÃO** FAZ (limite do #353A, decidido pelo fundador):
// não cria estado durável, não recupera nada, não muda prazo financeiro e não
// conserta o render. Ele só CLASSIFICA e DESCREVE. A recuperação é o #353B, e
// só será desenhada depois.
//
// Puro: sem rede, sem banco, sem relógio. Testado por
// scripts/test-scene-disposition.mjs com as funções reais.

import { createHmac } from 'node:crypto'

/**
 * O que aconteceu com UMA cena. `ambiguous` é o estado mais caro do sistema:
 * significa que a Fal pode ter aceitado e cobrado sem conseguir responder.
 * Reenviar uma cena ambígua é criar um job pago duplicado — por isso ela é
 * terminal para qualquer automação.
 */
export type Disposition =
  | 'accepted'         // request_id na mão. NUNCA rePOST.
  | 'explicit_reject'  // a Fal disse não, sem enfileirar nada.
  | 'ambiguous'        // pode existir no fornecedor. NUNCA rePOST automático.
  | 'not_attempted'    // nem chegamos a tentar (orçamento, aborto anterior).
  | 'terminal_failed'  // esgotou as tentativas permitidas.

/**
 * Por que falhou. Estas classes existem para NÃO repetir o erro de tratar
 * tudo igual: hoje `looksExhausted` devolve true para QUALQUER 403, então um
 * 403 de "modelo sem acesso" vira "saldo estourado", dispara e-mail de alarme
 * e devolve ao cliente "estamos com alta demanda" — três mentiras de uma vez.
 */
export type ReasonClass =
  | 'ok'
  | 'local_policy_gate'      // decisão NOSSA (ex.: real_person_blocked). Nem chega à Fal.
  | 'provider_moderation'    // a Fal recusou o conteúdo.
  | 'auth_model_access'      // chave inválida, modelo sem acesso, 404 de modelo.
  | 'balance_quota'          // saldo/cota de verdade — não "qualquer 403".
  | 'rate_limit'             // 429.
  | 'invalid_payload'        // 400/422 de parâmetro.
  | 'transport_timeout_5xx'  // rede, 408, 5xx, 2xx sem id. SEMPRE ambíguo.
  | 'unknown'

/** Se e como esta cena pode ser tentada de novo. */
export type RetrySafety =
  | 'safe'     // não houve chamada; enviar é seguro.
  | 'limited'  // recusa transitória comprovada (429): retry com teto.
  | 'never'    // aceito, ambíguo, ou falha terminal.

export interface SceneOutcome {
  scene_index: number
  model: string
  disposition: Disposition
  reason_class: ReasonClass
  retry_safety: RetrySafety
  provider_http_status: number | null
  attempt_count: number
}

// ─── Padrões de mensagem ───────────────────────────────────────────────────
// Usados APENAS para desambiguar dentro de um status, nunca para decidir
// sozinhos. Mensagem de fornecedor muda sem aviso; status é contrato.
// KINEO-353A.1 — a regex de moderacao tinha `content[_ -]?polic` DENTRO de
// `\b...\b`: o `\b` final depois de "polic" nunca casava com "content policy"
// (a palavra continua em "policy"). Ou seja, a frase mais comum de moderacao
// NAO era reconhecida. Agora "content policy" e "content_policy" casam.
const MODERACAO = /(nsfw|moderation|content[_ -]?polic|safety[_ -]?(polic|filter)|prohibited|disallow|violat|inappropriate|blocked[_ -]content)/i
// KINEO-353A.1 — "locked" SAIU desta lista. "model is locked for your account"
// e falta de ACESSO, nao falta de saldo: a palavra sozinha nao prova nada, e
// com ela aqui um problema de permissao virava alarme de saldo para o fundador
// e "estamos com alta demanda" para o cliente. Saldo agora exige evidencia
// financeira explicita.
const SALDO = /(exhaust|insufficient|balance|quota|billing|payment|top[- ]?up|out of credit|no credits|credits? remaining|prepay)/i
// Sinais de ACESSO. Testados ANTES de saldo, porque "locked" aparece nos dois
// mundos e "model is locked for your account" e o caso real que quebrava.
const ACESSO = /(model .{0,20}(locked|not available|no access|unauthorized)|locked for your account|not authorized|forbidden for this key|access denied|no access to)/i

/**
 * A pergunta que o `looksExhausted` de hoje responde errado.
 * Exige que a CLASSE seja saldo — não basta ser 403.
 */
export function isBalanceExhausted(status: number | null, message?: string): boolean {
  return classifyProviderFailure({ status, ambiguous: false, message }).reason_class === 'balance_quota'
}

/**
 * Traduz uma falha de submissão em (disposição, classe, segurança de retry).
 *
 * REGRA MESTRA: `ambiguous` vence tudo. Se a chamada pode ter sido aceita, a
 * cena é ambígua qualquer que seja o status — porque o risco não é o erro, é
 * o job pago que talvez exista do outro lado.
 */
export function classifyProviderFailure(input: {
  status: number | null
  ambiguous: boolean
  message?: string
}): { disposition: Disposition; reason_class: ReasonClass; retry_safety: RetrySafety } {
  const { status, ambiguous } = input
  const msg = input.message ?? ''

  if (ambiguous) {
    return { disposition: 'ambiguous', reason_class: 'transport_timeout_5xx', retry_safety: 'never' }
  }

  // 429 é o ÚNICO caso em que a Fal garante que nada foi enfileirado E que
  // vale tentar de novo. Todo o resto é terminal: insistir só gasta o relógio
  // da pessoa para chegar ao mesmo lugar.
  if (status === 429) {
    return { disposition: 'explicit_reject', reason_class: 'rate_limit', retry_safety: 'limited' }
  }
  if (status === 401) {
    return { disposition: 'explicit_reject', reason_class: 'auth_model_access', retry_safety: 'never' }
  }
  if (status === 402) {
    return { disposition: 'explicit_reject', reason_class: 'balance_quota', retry_safety: 'never' }
  }
  if (status === 403) {
    // O ponto exato do bug atual. 403 é "proibido", e proibido tem três
    // causas distintas com três respostas distintas ao cliente.
    // Ordem importa: ACESSO primeiro, porque "model is locked for your
    // account" contem "locked" e cairia em saldo se saldo viesse antes.
    const classe: ReasonClass = ACESSO.test(msg)
      ? 'auth_model_access'
      : SALDO.test(msg)
        ? 'balance_quota'
        : MODERACAO.test(msg)
          ? 'provider_moderation'
          : 'auth_model_access'
    return { disposition: 'explicit_reject', reason_class: classe, retry_safety: 'never' }
  }
  if (status === 404) {
    return { disposition: 'explicit_reject', reason_class: 'auth_model_access', retry_safety: 'never' }
  }
  if (status === 400 || status === 422) {
    const classe: ReasonClass = MODERACAO.test(msg) ? 'provider_moderation' : 'invalid_payload'
    return { disposition: 'explicit_reject', reason_class: classe, retry_safety: 'never' }
  }
  if (status !== null && status >= 400 && status < 500) {
    return { disposition: 'explicit_reject', reason_class: 'unknown', retry_safety: 'never' }
  }
  // Sem status e sem flag de ambiguidade: não dá para afirmar que a Fal
  // recusou. Na dúvida, o lado seguro é o que NÃO cria job duplicado.
  return { disposition: 'ambiguous', reason_class: 'unknown', retry_safety: 'never' }
}

/** Uma cena que nunca chegou a ser tentada (orçamento, aborto anterior). */
export function notAttempted(scene_index: number, model: string): SceneOutcome {
  return {
    scene_index, model,
    disposition: 'not_attempted', reason_class: 'ok', retry_safety: 'safe',
    provider_http_status: null, attempt_count: 0,
  }
}

/** Uma cena aceita, com id durável. Terminal: nunca reenviar. */
export function accepted(scene_index: number, model: string, attempt_count = 1): SceneOutcome {
  return {
    scene_index, model,
    disposition: 'accepted', reason_class: 'ok', retry_safety: 'never',
    provider_http_status: 200, attempt_count,
  }
}

/** Uma cena que falhou, classificada. */
export function failed(input: {
  scene_index: number
  model: string
  status: number | null
  ambiguous: boolean
  message?: string
  attempt_count?: number
}): SceneOutcome {
  const c = classifyProviderFailure(input)
  return {
    scene_index: input.scene_index,
    model: input.model,
    disposition: c.disposition,
    reason_class: c.reason_class,
    retry_safety: c.retry_safety,
    provider_http_status: input.status,
    attempt_count: input.attempt_count ?? 1,
  }
}

export interface DispatchSummary {
  planned: number
  attempted: number
  accepted: number
  rejected: number
  ambiguous: number
  not_attempted: number
}

/** O denominador. Sem ele não existe taxa de falha, só contagem de reclamação. */
export function summarize(outcomes: SceneOutcome[], planned: number): DispatchSummary {
  const conta = (d: Disposition) => outcomes.filter((o) => o.disposition === d).length
  const naoTentadas = conta('not_attempted')
  return {
    planned,
    attempted: outcomes.length - naoTentadas,
    accepted: conta('accepted'),
    rejected: conta('explicit_reject') + conta('terminal_failed'),
    ambiguous: conta('ambiguous'),
    not_attempted: naoTentadas + Math.max(0, planned - outcomes.length),
  }
}

/**
 * Existe gasto POSSÍVEL no fornecedor?
 *
 * É a pergunta que hoje é respondida por um booleano
 * (`providerSubmissionMayExist`) e que o #353B vai usar para decidir se a
 * claim pode ser liberada. Aqui ela já fica calculada a partir do vetor, para
 * o #353B herdar a resposta pronta em vez de reinventá-la.
 */
export function providerSpendPossible(outcomes: SceneOutcome[]): boolean {
  return outcomes.some((o) => o.disposition === 'accepted' || o.disposition === 'ambiguous')
}

/** Só isto pode ser reenviado. Aceito e ambíguo, jamais. */
export function resubmittable(outcomes: SceneOutcome[]): SceneOutcome[] {
  return outcomes.filter((o) => o.retry_safety === 'safe' || o.retry_safety === 'limited')
}

/**
 * O request_id NUNCA entra cru em analytics: é a chave que identifica um job
 * pago no fornecedor. Vai como HMAC truncado — serve para correlacionar duas
 * linhas do nosso lado e é inútil para qualquer outra coisa.
 */
export function requestIdFingerprint(requestId: string): string {
  // KINEO-353A.1 — FECHA FECHADO. O fallback 'kineo-fallback' do #353A tornava
  // o fingerprint reversivel por qualquer um que lesse este arquivo, o que e o
  // mesmo que gravar o id cru com passos extras. Sem segredo dedicado, o campo
  // simplesmente NAO EXISTE.
  const secret = process.env.KINEO_FINGERPRINT_SECRET
  if (!requestId || !secret) return ''
  return createHmac('sha256', secret).update(requestId).digest('hex').slice(0, 12)
}

/**
 * Tudo que pode ser logado de uma falha de cena. Note o que NÃO está aqui:
 * prompt, URL de mídia, chave, headers, corpo do fornecedor e mensagem livre.
 * A rota imprime `err.providerBody` cru hoje (route.ts:657) — isso sai.
 */
export function safeLogFields(o: SceneOutcome): Record<string, string | number | null> {
  return {
    scene_index: o.scene_index,
    model: o.model,
    disposition: o.disposition,
    reason_class: o.reason_class,
    retry_safety: o.retry_safety,
    provider_http_status: o.provider_http_status,
    attempt_count: o.attempt_count,
  }
}
