// KINEO-TRIAL-ABUSE-PMP-2026-08-07 — ANTI-ABUSO DO REVERSE TRIAL, FASE 2:
// sinal de device/IP.
//
// POR QUE ESTE ARQUIVO EXISTE
// 40 créditos grátis por conta (TRIAL_GRANT_CREDITS) é o alvo mais óbvio de
// abuso que este produto já teve: um e-mail novo = ~$4,1 de custo de render.
// As guardas da fase 1 (perfil <24h, 1 trial por conta, domínio descartável)
// param o repeat do MESMO e-mail e o descarte mais preguiçoso — não param
// alguém abrindo 30 Gmails no mesmo notebook.
//
// O QUE ESTE MÓDULO NÃO FAZ, DE PROPÓSITO
//   · NÃO guarda IP. Em lugar nenhum. O IP entra em `trialFingerprintHash()`
//     e sai como SHA-256 salgado; a tabela `trial_signup_fingerprints` só vê
//     o hash. Sem o salt (env) o hash é irreversível na prática e, mais
//     importante, não é correlacionável com nenhum outro dado nosso — trocar
//     o salt invalida a base inteira de fingerprints de propósito.
//   · NÃO bloqueia com mensagem. Quem bate no limite recebe uma conta NORMAL,
//     sem trial e sem aviso. Acusar um cliente real de fraude é o dano caro;
//     não dar 40 créditos a ele é o dano barato (ele ainda pode comprar).
//   · NÃO falha fechado. Erro de query, tabela ausente, salt ausente, header
//     ausente → CONCEDE o trial. A ordem do fundador é explícita: "na dúvida,
//     conceder e registrar evento suspeito".
//
// PII / LGPD — três decisões escritas para não serem desfeitas por engano:
//   1. O hash é calculado na BORDA (app/api/track-signup-source), onde os
//      headers existem, e só o hash atravessa para lib/reverseTrial.ts. Assim
//      o módulo que fala com o banco nunca tem o IP em escopo — não dá para
//      "logar por engano" o que não se recebeu.
//   2. Sem `KINEO_TRIAL_FINGERPRINT_SALT` no ambiente, `trialFingerprintHash`
//      devolve null e NADA é gravado. Um deploy sem o salt não vaza hash sem
//      sal (que seria uma rainbow table de IPs) — ele simplesmente desliga o
//      sinal.
//   3. Os logs deste arquivo só imprimem o PREFIXO de 12 chars do hash. O
//      suficiente para o fundador correlacionar duas linhas do painel; inútil
//      para qualquer outra coisa.

import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Tabela (migração aditiva) — ver docs/SQL-REVERSE-TRIAL.sql. */
export const TRIAL_FINGERPRINT_TABLE = 'trial_signup_fingerprints'

/**
 * Quantos trials um MESMO fingerprint pode ativar dentro da janela antes de o
 * próximo sair sem trial. N=2 e não N=1 por um motivo medido, não por gosto:
 * o fingerprint é (IP + user-agent + accept-language) e um casal/uma família
 * atrás do mesmo NAT, com o mesmo Chrome atualizado e o mesmo idioma, colide
 * de verdade. Com N=2 a segunda pessoa da casa ainda ganha o trial; só a
 * terceira em 30 dias não ganha — e ainda assim cria conta normalmente.
 */
export const TRIAL_FINGERPRINT_MAX_ACTIVATIONS = 2

/** Janela de contagem, em dias. */
export const TRIAL_FINGERPRINT_WINDOW_DAYS = 30

/** Prefixo usado em log/painel. NUNCA o hash inteiro fora do banco. */
export function fingerprintLabel(hash: string | null | undefined): string {
  return typeof hash === 'string' && hash.length >= 12 ? hash.slice(0, 12) : 'none'
}

// ── KINEO-TRIAL-BLOCKERS-2026-08-07 — BLOQUEADOR #3 DO QA: O NO-OP MUDO ──────
// Sem `KINEO_TRIAL_FINGERPRINT_SALT` no ambiente, `trialFingerprintHash()`
// devolve null, `evaluateTrialFingerprint` devolve `{allow:true,
// reason:'no_signal'}` e o trial é concedido — SEM linha, SEM evento, SEM log.
// O anti-abuso inteiro fica desligado e nada em lugar nenhum reclama. Com 360
// signups/30d e 40 créditos por trial (~$4,1 de custo), isso é ~$1.480/mês de
// exposição que ninguém veria.
//
// A POSTURA NÃO MUDA — continua FAIL-OPEN (concede; a ordem do fundador é "na
// dúvida, conceder e registrar evento suspeito"). O que muda é que deixa de ser
// SILENCIOSO: quem ativa emite UM aviso por processo + UM evento por processo
// (ver `maybeActivateReverseTrial` em lib/reverseTrial.ts) e o painel
// /admin/trial-abuse abre com uma faixa vermelha permanente enquanto faltar.
//
// Uma vez POR PROCESSO, e não por signup, porque um log por signup em pico de
// tráfego é indistinguível de ruído — e log que ninguém lê é o mesmo silêncio
// com custo de storage. Serverless recicla processo com frequência, então a
// linha reaparece sozinha sem virar spam.
// ─────────────────────────────────────────────────────────────────────────────

/** Nome exato da env var. Aqui, e não redigitado em mensagem de erro nenhuma. */
export const TRIAL_FINGERPRINT_SALT_ENV = 'KINEO_TRIAL_FINGERPRINT_SALT'

/**
 * O salt existe neste ambiente? MESMO predicado usado por
 * `trialFingerprintHash` (presente e não-vazio depois de trim) — se os dois
 * divergirem, o painel mente sobre o estado do anti-abuso.
 */
export function trialFingerprintSaltConfigured(): boolean {
  const salt = process.env[TRIAL_FINGERPRINT_SALT_ENV]
  return typeof salt === 'string' && salt.trim().length > 0
}

export interface TrialFingerprintSource {
  ip?: string | null
  userAgent?: string | null
  acceptLanguage?: string | null
}

/**
 * Primeiro IP de x-forwarded-for (o do cliente; os seguintes são proxies), com
 * fallback para x-real-ip. Devolve null quando não há nada confiável — e null
 * significa "sem sinal", que significa "concede".
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for')
  const first = fwd ? fwd.split(',')[0]?.trim() : ''
  const ip = first || (headers.get('x-real-ip') ?? '').trim()
  if (!ip) return null
  // Endereços que não identificam ninguém (dev local, proxy mal configurado)
  // não podem virar um bucket compartilhado que bloqueia meio mundo.
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') return null
  return ip.slice(0, 64)
}

/**
 * SHA-256(salt + '|' + ip + '|' + user-agent + '|' + accept-language).
 *
 * Devolve null (= sinal ausente = concede) quando:
 *   · `KINEO_TRIAL_FINGERPRINT_SALT` não está no ambiente — sem salt não se
 *     grava derivado de IP nenhum (decisão 2 do cabeçalho);
 *   · não há IP utilizável. IP é o único componente que custa dinheiro para o
 *     abusador trocar; user-agent e accept-language sozinhos casariam milhares
 *     de contas legítimas no mesmo bucket, o que é uma máquina de falso
 *     positivo, não um sinal.
 */
export function trialFingerprintHash(src: TrialFingerprintSource): string | null {
  const salt = process.env[TRIAL_FINGERPRINT_SALT_ENV]
  if (!salt || !salt.trim()) return null
  const ip = (src.ip ?? '').trim()
  if (!ip) return null
  const ua = (src.userAgent ?? '').trim().slice(0, 400)
  const lang = (src.acceptLanguage ?? '').trim().slice(0, 120)
  try {
    return createHash('sha256').update(`${salt.trim()}|${ip}|${ua}|${lang}`).digest('hex')
  } catch {
    return null
  }
}

/** Conveniência para rotas: headers → hash (ou null). */
export function trialFingerprintFromHeaders(headers: Headers): string | null {
  return trialFingerprintHash({
    ip: clientIpFromHeaders(headers),
    userAgent: headers.get('user-agent'),
    acceptLanguage: headers.get('accept-language'),
  })
}

export type TrialFingerprintOutcome = 'activated' | 'blocked'

export interface TrialFingerprintVerdict {
  /** false SOMENTE quando o limite foi comprovadamente ultrapassado. */
  allow: boolean
  reason: 'no_signal' | 'under_limit' | 'over_limit' | 'check_failed'
  /** Ativações anteriores contadas na janela. -1 = não foi possível contar. */
  priorActivations: number
}

/**
 * Conta quantos trials este fingerprint já ATIVOU na janela e decide.
 *
 * FALHA ABERTO EM TODOS OS RAMOS DE ERRO — inclusive tabela inexistente
 * (42P01, ambiente sem a migração aplicada). O chamador registra o evento
 * `trial_fingerprint_check_failed` para o buraco ficar visível no painel em vez
 * de virar bloqueio silencioso.
 */
export async function evaluateTrialFingerprint(
  db: SupabaseClient,
  hash: string | null,
): Promise<TrialFingerprintVerdict> {
  if (!hash) return { allow: true, reason: 'no_signal', priorActivations: 0 }
  try {
    const since = new Date(
      Date.now() - TRIAL_FINGERPRINT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()
    const { count, error } = await db
      .from(TRIAL_FINGERPRINT_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('fingerprint_hash', hash)
      .eq('outcome', 'activated')
      .gte('created_at', since)
    if (error) {
      console.warn(`[trial-fingerprint] count failed (fail-open): ${error.message}`)
      return { allow: true, reason: 'check_failed', priorActivations: -1 }
    }
    const prior = typeof count === 'number' ? count : 0
    if (prior >= TRIAL_FINGERPRINT_MAX_ACTIVATIONS) {
      return { allow: false, reason: 'over_limit', priorActivations: prior }
    }
    return { allow: true, reason: 'under_limit', priorActivations: prior }
  } catch (e) {
    console.warn(
      `[trial-fingerprint] count threw (fail-open): ${e instanceof Error ? e.message : String(e)}`,
    )
    return { allow: true, reason: 'check_failed', priorActivations: -1 }
  }
}

/**
 * Grava a linha do fingerprint. Chamada DEPOIS do desfecho, nunca antes:
 * gravar 'activated' na expectativa de ativar deixaria um slot queimado em toda
 * ativação que morre no meio (CAS perdido, processo derrubado) — e slot
 * queimado é falso positivo para a PRÓXIMA pessoa.
 *
 * Nunca lança. Uma falha aqui só custa um sinal; ela não pode desfazer um trial
 * que já foi concedido.
 */
export async function recordTrialFingerprint(
  db: SupabaseClient,
  args: { hash: string | null; userId: string; outcome: TrialFingerprintOutcome },
): Promise<void> {
  if (!args.hash) return
  try {
    const { error } = await db.from(TRIAL_FINGERPRINT_TABLE).insert({
      fingerprint_hash: args.hash,
      user_id: args.userId,
      outcome: args.outcome,
    })
    if (error) console.warn(`[trial-fingerprint] insert failed: ${error.message}`)
  } catch (e) {
    console.warn(
      `[trial-fingerprint] insert threw: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}
