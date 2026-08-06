// KINEO-REVERSE-TRIAL-P1-2026-08-06 — REVERSE TRIAL, FASE 1 (fundação).
//
// TODO comportamento novo deste arquivo está atrás de UMA flag de ambiente:
//
//   KINEO_REVERSE_TRIAL_ENABLED === 'true'   (default: OFF)
//
// Com a flag OFF (o estado de produção nesta fase) NENHUM caminho novo executa:
// - a ativação no signup retorna antes de qualquer leitura;
// - isTrialActive() retorna false para qualquer perfil;
// - recordReverseTrialDebit() retorna antes de qualquer leitura.
// O free tier atual (FREE_FAST_PREVIEW_LIMIT = 3/24h) NÃO é tocado aqui — a
// troca atômica do free tier + copy é FASE 2.
//
// O QUE O TRIAL É (spec aprovada pelo fundador em 06/08):
// - Novo perfil (flag ON) nasce com trial_status='active' e trial_ends_at =
//   now + 3 ou 7 dias (A/B 50/50 por hash determinístico do user_id, gravado
//   em trial_variant). SEM tocar em Stripe.
// - Durante o trial: mesmos direitos do CREATOR, EXCETO os motores Studio
//   (Kling / Veo / Hollywood) — NUNCA Studio no trial.
// - HARD CAP de 40 créditos NO BACKEND (ADENDO A1 de 06/08: era 60; 40 limita
//   o pior caso a ~$4,1/trial e mantém Hollywood inalcançável por design):
//   todo débito de crédito de uma conta em trial soma em trial_credits_used;
//   ao atingir 40 o trial expira na hora (trial_status='expired'), mesmo antes
//   do dia 3/7.
// - Expiração PASSIVA: isTrialActive() decide em toda leitura — nada depende
//   de cron (o cron de downgrade formal é FASE 2).
// - 1 trial por conta, PARA SEMPRE: trial_status não-nulo nunca é reativado.
//
// ✅ DECISÃO FECHADA PELO FUNDADOR (06/08) — FASE 2, ITEM 1: a ativação CONCEDE
// crédito, e a concessão é o PRÓPRIO TETO: 40. Por isso TRIAL_GRANT_CREDITS é
// derivado de TRIAL_CREDIT_CAP em vez de ser um segundo literal — os dois não
// podem divergir nem por acidente de digitação (a terceira cópia do número 3 na
// cota free custou uma sprint inteira; aqui o número nasce único).
// Um perfil novo nasce com 0 créditos (handle_new_user); sem o grant, a flag ON
// daria o DIREITO de usar os motores pagos a quem não tem saldo para debitar —
// trial que não gera vídeo não converte ninguém.
//
// ⚠️ DÍVIDA EXPLÍCITA QUE ESTE COMMIT CRIA (item 2 da fase 2, cron de
// downgrade): trial que termina no DIA (3/7) sem gastar tudo deixa saldo
// remanescente em video_credits. O cron de downgrade PRECISA revogar o que
// sobrou — o evento de auditoria `trial_credits_granted` (escrito abaixo) é o
// que diz quanto foi concedido e quando. Enquanto a flag estiver OFF isto é
// inerte; ligar a flag ANTES do cron de downgrade seria dar 40 créditos vitalícios.

import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'

// Mesmo idioma de flag dos crons de lifecycle (KINEO_LIFECYCLE_EMAILS_ENABLED):
// igualdade estrita com 'true'. Qualquer outro valor (ausente, '1', 'yes') = OFF.
export const REVERSE_TRIAL_ENABLED = process.env.KINEO_REVERSE_TRIAL_ENABLED === 'true'

/**
 * Hard cap de créditos que um trial pode consumir, imposto no servidor.
 * ADENDO A1 (06/08): 60 → 40 — pior caso ~$4,1/trial; Hollywood segue
 * inalcançável por design.
 */
export const TRIAL_CREDIT_CAP = 40

/**
 * Créditos concedidos na ATIVAÇÃO do trial. Decisão final do fundador (06/08):
 * concessão = teto. Derivado, nunca redigitado — se um dia o teto mudar (só com
 * aprovação do fundador), a concessão acompanha na mesma linha.
 */
export const TRIAL_GRANT_CREDITS = TRIAL_CREDIT_CAP

export type TrialVariant = '3d' | '7d'

const TRIAL_VARIANT_DAYS: Record<TrialVariant, number> = { '3d': 3, '7d': 7 }

// Anti-abuso mínimo desta fase: domínios descartáveis bloqueados na ativação.
// Tokens sem ponto casam por substring do domínio (pega mailinator.com,
// team.mailinator.net etc.); tokens com ponto casam o domínio exato ou
// subdomínios. minitts.net e dysonc.com já apareceram na nossa base.
const DISPOSABLE_EMAIL_TOKENS = [
  'mailinator',
  'guerrillamail',
  '10minutemail',
  'tempmail',
  'yopmail',
  'sharklasers',
  'minitts.net',
  'dysonc.com',
] as const

export function isDisposableEmail(email: string | null | undefined): boolean {
  const at = (email ?? '').toLowerCase().trim().lastIndexOf('@')
  if (at < 0) return false
  const domain = (email ?? '').toLowerCase().trim().slice(at + 1)
  if (!domain) return false
  return DISPOSABLE_EMAIL_TOKENS.some((token) =>
    token.includes('.')
      ? domain === token || domain.endsWith('.' + token)
      : domain.includes(token),
  )
}

/**
 * A/B determinístico 50/50 pelo user_id (UUID): FNV-1a de 32 bits sobre a
 * string. O mesmo usuário SEMPRE cai na mesma variante — reprocessar o signup
 * nunca troca o braço do experimento.
 */
export function trialVariantFor(userId: string): TrialVariant {
  let hash = 0x811c9dc5
  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 2 === 0 ? '3d' : '7d'
}

/** Campos de trial como saem de um select em profiles (tolerante a tipo). */
export interface TrialProfileFields {
  trial_status?: unknown
  trial_ends_at?: unknown
  trial_credits_used?: unknown
}

/**
 * A VERDADE ÚNICA sobre "este perfil está em trial ativo?". Usada em TODOS os
 * checks de entitlement — a expiração é passiva: passou de trial_ends_at ou
 * bateu no cap de 40 (adendo A1), isto retorna false na mesma request, sem
 * esperar cron.
 * Com a flag OFF retorna false para qualquer entrada (nenhum caminho novo).
 */
export function isTrialActive(
  profile: TrialProfileFields | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!REVERSE_TRIAL_ENABLED) return false
  if (!profile || profile.trial_status !== 'active') return false
  const endsRaw = profile.trial_ends_at
  const ends = typeof endsRaw === 'string' ? Date.parse(endsRaw) : NaN
  if (!Number.isFinite(ends) || now >= ends) return false
  const used = typeof profile.trial_credits_used === 'number' ? profile.trial_credits_used : 0
  return used < TRIAL_CREDIT_CAP
}

// Service-role client (mesmo padrão de lib/credits/renderIntent.ts): a
// contabilidade do trial não pode depender de RLS do usuário logado.
function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[reverse-trial] service-role env missing — reverse trial disabled')
    return null
  }
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Ativação no signup. Chamada de /api/track-signup-source (o único touchpoint
 * server-side que TODOS os fluxos de signup já chamam). Nunca lança.
 *
 * Guardas, nesta ordem:
 *   1. flag OFF → no-op absoluto;
 *   2. perfil precisa ser NOVO (user.created_at < 24h) — sem isto, ligar a
 *      flag daria trial retroativo a toda a base no próximo login;
 *   3. e-mail descartável → nunca ativa;
 *   4. trial_status não-nulo → NUNCA reativa (1 trial por conta, para sempre);
 *   5. conta paga (plan pago ou has_paid) → não precisa de trial;
 *   6. o UPDATE carrega `is('trial_status', null)` — corrida entre duas
 *      requests de signup não cria dois trials nem sobrescreve um expirado.
 */
export async function maybeActivateReverseTrial(args: {
  userId: string
  email: string | null | undefined
  userCreatedAt: string | null | undefined
}): Promise<{ activated: boolean; reason: string }> {
  if (!REVERSE_TRIAL_ENABLED) return { activated: false, reason: 'flag_off' }
  try {
    const createdAt = typeof args.userCreatedAt === 'string' ? Date.parse(args.userCreatedAt) : NaN
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      return { activated: false, reason: 'not_new_signup' }
    }
    if (isDisposableEmail(args.email)) {
      console.warn(`[reverse-trial] disposable email blocked user=${args.userId.slice(0, 8)}`)
      return { activated: false, reason: 'disposable_email' }
    }
    const db = adminClient()
    if (!db) return { activated: false, reason: 'no_admin_client' }

    const { data: profile, error: readErr } = await db
      .from('profiles')
      .select('trial_status, plan, has_paid')
      .eq('id', args.userId)
      .maybeSingle()
    if (readErr) {
      console.error('[reverse-trial] activation profile read failed:', readErr.message)
      return { activated: false, reason: 'read_error' }
    }
    if (!profile) return { activated: false, reason: 'no_profile' }
    if (profile.trial_status !== null && profile.trial_status !== undefined) {
      return { activated: false, reason: 'trial_already_used' }
    }
    const plan = ((profile as { plan?: string | null }).plan ?? 'free').toLowerCase()
    if ((plan !== 'free' && plan !== '') || (profile as { has_paid?: boolean }).has_paid === true) {
      return { activated: false, reason: 'already_paid' }
    }

    const variant = trialVariantFor(args.userId)
    const endsAt = new Date(Date.now() + TRIAL_VARIANT_DAYS[variant] * 24 * 60 * 60 * 1000).toISOString()

    // ── ATIVAÇÃO + GRANT NA MESMA ESCRITA (fase 2, item 1) ───────────────────
    // A primeira versão deste diff fazia dois round-trips (UPDATE guardado por
    // `.is('trial_status', null)` → RPC add_video_credits → rollback se o RPC
    // falhasse). A revisão adversarial matou o desenho com dois cenários que o
    // rollback NÃO cobre:
    //   · morte do processo entre as duas escritas (esta função é chamada de
    //     /api/track-signup-source, que o cliente dispara fire-and-forget e a
    //     plataforma pode derrubar) ⇒ conta com trial 'active' e 0 créditos,
    //     travada PARA SEMPRE pela guarda "1 trial por conta";
    //   · RPC que COMMITA e perde a resposta (timeout pós-commit, 504 do
    //     PostgREST) ⇒ o rollback zera trial_status, a próxima request reativa e
    //     concede +40 DE NOVO — repetível enquanto created_at < 24h.
    // O precedente do Post to Earn não valia: lá o rollback apaga um claim
    // chaveado por um recurso externo escasso (youtube_video_id UNIQUE), então o
    // replay exige um vídeo novo; aqui o "recurso escasso" era um booleano que o
    // próprio rollback devolvia ao estado inicial.
    //
    // DESENHO ATUAL: uma ÚNICA UPDATE carrega o trial E o saldo, com
    // compare-and-swap nos dois eixos:
    //   `.is('trial_status', null)`  → 1 trial por conta, para sempre;
    //   `.eq('video_credits', saldo lido)` → soma sem read-modify-write cego.
    // Ou a linha inteira muda, ou nada muda: não existe janela entre "ativou" e
    // "creditou", logo não existe rollback, logo não existe replay. Perder a
    // corrida do CAS devolve 0 linhas e a gente relê e tenta de novo (mesmo
    // padrão otimista de recordReverseTrialDebit abaixo).
    //
    // Por que SOMAR (saldo + 40) e não escrever 40: um perfil novo nasce com 0,
    // mas o crédito de indicação (/api/referral/qualify) pode chegar antes;
    // escrever 40 apagaria esse crédito. NOTA HONESTA: aquele caminho escreve em
    // video_credits com read→compute→write fora de qualquer RPC (assim como
    // /api/credits/deduct e os webhooks de pagamento), então o CAS daqui protege
    // ESTA escrita, não a daquele lado — a corrida inversa é dívida pré-existente
    // e está registrada no relatório.
    let granted = false
    for (let attempt = 1; attempt <= 3 && !granted; attempt += 1) {
      const { data: balanceRow, error: balanceErr } = await db
        .from('profiles')
        .select('video_credits, trial_status')
        .eq('id', args.userId)
        .maybeSingle()
      if (balanceErr || !balanceRow) {
        console.error('[reverse-trial] balance read failed:', balanceErr?.message ?? 'no row')
        return { activated: false, reason: 'read_error' }
      }
      // Releitura: outra request pode ter ativado entre o primeiro select e aqui.
      if (balanceRow.trial_status !== null && balanceRow.trial_status !== undefined) {
        return { activated: false, reason: 'lost_race' }
      }
      const rawBalance = (balanceRow as { video_credits?: unknown }).video_credits
      const balance = typeof rawBalance === 'number' ? rawBalance : null

      const write = db
        .from('profiles')
        .update({
          trial_status: 'active',
          trial_ends_at: endsAt,
          trial_variant: variant,
          video_credits: (balance ?? 0) + TRIAL_GRANT_CREDITS,
        })
        .eq('id', args.userId)
        .is('trial_status', null)
      // video_credits é NULLABLE: `.eq(col, null)` nunca casa em SQL, então o
      // CAS de uma linha sem saldo precisa ser `.is(col, null)`.
      // ÚLTIMA TENTATIVA SEM A GUARDA DE SALDO (2ª passada da revisão): o eixo
      // `video_credits` do CAS é opcional para a garantia que importa — quem
      // garante "1 trial por conta" é o `.is('trial_status', null)`, que fica
      // SEMPRE. Manter o eixo do saldo nas 2 primeiras tentativas protege um
      // crédito concorrente (ex.: /api/referral/qualify escrevendo saldo com
      // read→compute→write); insistir nele na terceira só produziria um usuário
      // sem trial NENHUM, silenciosamente. Mesmo padrão de recordReverseTrialDebit.
      const guarded = attempt >= 3
        ? write
        : balance === null ? write.is('video_credits', null) : write.eq('video_credits', balance)
      const { data: updated, error: updateErr } = await guarded.select('id')
      if (updateErr) {
        console.error('[reverse-trial] activation+grant update failed:', updateErr.message)
        return { activated: false, reason: 'update_error' }
      }
      if (updated && updated.length > 0) {
        granted = true
        break
      }
      // 0 linhas: ou outra request ativou, ou o saldo mudou embaixo. Relê.
    }
    if (!granted) {
      console.error(`[reverse-trial] activation lost CAS 3x user=${args.userId.slice(0, 8)}`)
      return { activated: false, reason: 'lost_race' }
    }

    console.log(`[reverse-trial] ACTIVATED user=${args.userId.slice(0, 8)} variant=${variant} ends=${endsAt} +${TRIAL_GRANT_CREDITS}cr`)
    // Auditoria: é esta linha que responde "quanto crédito de trial a operação
    // concedeu vs. receita nova" no relatório diário, e é a referência que o cron
    // de downgrade (item 2) usa para revogar o saldo remanescente.
    // AWAIT, não `void` (2ª passada da revisão): o grant escreve video_credits
    // direto, sem linha em credit_debits — este evento é o ÚNICO rastro de que
    // 40 créditos foram concedidos. Quem chama isto é /api/track-signup-source,
    // disparado fire-and-forget pelo cliente; uma promessa solta pode morrer com
    // o congelamento da instância serverless e o rastro do dinheiro sumir.
    // writeServerEvent nunca lança (reporta false), então o await é seguro.
    await writeServerEvent({
      name: 'trial_credits_granted',
      userId: args.userId,
      metadata: {
        credits: TRIAL_GRANT_CREDITS,
        cap: TRIAL_CREDIT_CAP,
        variant,
        trial_ends_at: endsAt,
      },
    })
    return { activated: true, reason: variant }
  } catch (e) {
    console.error('[reverse-trial] activation threw:', e instanceof Error ? e.message : String(e))
    return { activated: false, reason: 'threw' }
  }
}

/**
 * Contabilidade do HARD CAP, chamada pelo ponto único de débito
 * (lib/credits/debit.ts) DEPOIS de um debit_video_credits bem-sucedido.
 * Soma o custo em trial_credits_used quando a conta está em trial 'active';
 * ao atingir 40 (ou se o relógio já passou de trial_ends_at) marca
 * trial_status='expired' NA MESMA escrita — a expiração no cap é imediata,
 * não espera dia 3/7 nem cron.
 *
 * Concorrência: update otimista (eq em trial_credits_used) com 1 retry; se a
 * segunda tentativa também perder a corrida, grava incondicionalmente a partir
 * da releitura mais fresca e loga — o erro barato aqui é contar 1 débito a
 * menos uma vez, nunca deixar de expirar (o próximo débito re-soma e expira).
 * Nunca lança: débito de crédito jamais falha por causa da contabilidade.
 */
export async function recordReverseTrialDebit(userId: string, cost: number): Promise<void> {
  if (!REVERSE_TRIAL_ENABLED) return
  if (!userId || !Number.isFinite(cost) || cost <= 0) return
  try {
    const db = adminClient()
    if (!db) return
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { data: profile, error: readErr } = await db
        .from('profiles')
        .select('trial_status, trial_ends_at, trial_credits_used')
        .eq('id', userId)
        .maybeSingle()
      if (readErr || !profile) {
        if (readErr) console.error('[reverse-trial] cap read failed:', readErr.message)
        return
      }
      if (profile.trial_status !== 'active') return
      const used = typeof profile.trial_credits_used === 'number' ? profile.trial_credits_used : 0
      const newUsed = used + Math.round(cost)
      const endsRaw = (profile as { trial_ends_at?: unknown }).trial_ends_at
      const ends = typeof endsRaw === 'string' ? Date.parse(endsRaw) : NaN
      const shouldExpire = newUsed >= TRIAL_CREDIT_CAP || !Number.isFinite(ends) || Date.now() >= ends
      const patch: Record<string, unknown> = { trial_credits_used: newUsed }
      if (shouldExpire) patch.trial_status = 'expired'

      const query = db.from('profiles').update(patch).eq('id', userId)
      // Última tentativa: grava sem a guarda otimista (ver docstring).
      const { data: updated, error: updateErr } = attempt < 3
        ? await query.eq('trial_credits_used', used).select('id')
        : await query.select('id')
      if (updateErr) {
        console.error('[reverse-trial] cap update failed:', updateErr.message)
        return
      }
      if (updated && updated.length > 0) {
        if (shouldExpire) {
          console.log(`[reverse-trial] EXPIRED at cap user=${userId.slice(0, 8)} used=${newUsed}/${TRIAL_CREDIT_CAP}`)
        }
        return
      }
      // Perdeu a corrida — relê e tenta de novo.
    }
  } catch (e) {
    console.error('[reverse-trial] cap accounting threw:', e instanceof Error ? e.message : String(e))
  }
}
