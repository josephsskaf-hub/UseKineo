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
// ✅ DÍVIDA #1 PAGA (06/08, sprint 16h — [KINEO-TRIAL-DOWNGRADE-2026-08-06]):
// "trial que termina no DIA (3/7) sem gastar tudo deixa saldo remanescente em
// video_credits" era o motivo de ligar a flag antes do cron dar 40 créditos
// VITALÍCIOS. Resolvido em duas metades, ambas neste arquivo:
//   · a ativação passou a gravar `trial_credits_granted` na MESMA UPDATE do
//     grant (registro por LINHA, não pela constante);
//   · downgradeExpiredTrial() (fim do arquivo) revoga o não gasto e fecha o
//     estado numa escrita atômica, chamado de /api/cron/trial-downgrade.
// O que AINDA falta antes da flag: itens 3–9 da fase 2 (paywalls, e-mails,
// troca do free tier, primeiro minuto pago, webhook, QA completo).

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

/** trial_credits_used como número, tolerante a null/tipo errado. */
export function trialCreditsUsed(profile: TrialProfileFields | null | undefined): number {
  const used = profile?.trial_credits_used
  return typeof used === 'number' && Number.isFinite(used) ? used : 0
}

/**
 * O RELÓGIO venceu? Data ausente ou ilegível conta como VENCIDO — um trial sem
 * prazo legível não pode virar trial eterno.
 */
export function trialClockExpired(
  profile: TrialProfileFields | null | undefined,
  now: number = Date.now(),
): boolean {
  const endsRaw = profile?.trial_ends_at
  const ends = typeof endsRaw === 'string' ? Date.parse(endsRaw) : NaN
  return !Number.isFinite(ends) || now >= ends
}

/** O TETO de créditos foi atingido? */
export function trialCapReached(profile: TrialProfileFields | null | undefined): boolean {
  return trialCreditsUsed(profile) >= TRIAL_CREDIT_CAP
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
  return !trialClockExpired(profile, now) && !trialCapReached(profile)
}

/**
 * A coorte do CRON DE DOWNGRADE (fase 2, item 2): trials que já NÃO estão
 * ativos e ainda não foram processados.
 *
 * ⚠️ NÃO é `!isTrialActive(...)`, e a diferença é a razão de esta função
 * existir. `isTrialActive` carrega a FLAG; se o cron perguntasse por ela,
 * DESLIGAR a flag (um rollback perfeitamente razoável) faria o cron enxergar
 * TODOS os trials vivos como vencidos e revogar o crédito de todo mundo na
 * rodada seguinte. Por isso a decisão do cron é independente de flag — e a
 * lição de 05/08 ("se o gatilho e o cron contam coisas diferentes, o cron está
 * errado") é honrada pelo lado certo: os dois leem `trialClockExpired` e
 * `trialCapReached`, os MESMOS predicados, e nunca podem divergir.
 *
 * `'downgraded'` e `'converted'` são estados TERMINais escritos por este cron —
 * ficam fora da coorte, e é isso que o torna idempotente por construção.
 */
export function trialNeedsDowngrade(
  profile: TrialProfileFields | null | undefined,
  now: number = Date.now(),
): boolean {
  const status = profile?.trial_status
  if (status !== 'active' && status !== 'expired') return false
  return trialClockExpired(profile, now) || trialCapReached(profile)
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-TRIAL-PAYWALL-2026-08-06 — FASE 2, ITENS 2b e 3: o ESTADO DO TRIAL
// PARA A UI, calculado UMA vez no servidor.
//
// Por que isto existe em vez de o componente ler as colunas e decidir:
// a regra "quem vê o modal de downgrade" é uma regra de DINHEIRO (ela pede
// assinatura) e ela já tem duas armadilhas registradas neste repositório:
//
//   1. ⚠️ `trial_downgraded_at` TAMBÉM é carimbado em quem CONVERTEU. Decidir
//      por essa coluna mostra "veja o que você perdeu" para quem acabou de
//      PAGAR. A coorte correta é `trial_status === 'downgraded'`, e ela mora
//      aqui, num lugar só — a mesma regra que os e-mails D3+ (item 4) vão usar.
//   2. ⚠️ "quem paga" decidido por ALLOWLIST de planos erra do lado caro: a
//      produção tem 3 perfis pagando com `plan='free'` e 1 com `plan='pro'`
//      sem `has_paid`. Por isso a pergunta é feita por DENYLIST invertida
//      (`isPayingProfile`), que falha FECHADO: na dúvida, é pagante e o
//      upsell não aparece.
//
// Escrever esta regra em TypeScript no componente E de novo na query do e-mail
// seria a MESMA regra em dois idiomas — o modo de falha mais caro já registrado
// no PROMPT-DIARIO, porque ela envelhece em um só.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fase do trial do ponto de vista da INTERFACE. Descritiva e sem juízo de
 * valor: quem decide o que mostrar é `showDowngradeModal`, abaixo.
 *
 * - `none`        — flag OFF, ou conta que nunca teve trial (`trial_status` null).
 * - `active`      — trial valendo agora (`isTrialActive` true).
 * - `ending`      — o prazo venceu ou o teto foi atingido, mas o cron ainda não
 *                   passou. O ENTITLEMENT já caiu (a expiração é passiva); só o
 *                   crédito remanescente ainda não foi revogado.
 * - `downgraded`  — o cron fechou o trial sem compra.
 * - `converted`   — o cron fechou o trial de alguém que pagou.
 */
export type TrialUiPhase = 'none' | 'active' | 'ending' | 'downgraded' | 'converted'

export interface TrialUiState {
  phase: TrialUiPhase
  /** ISO de `trial_ends_at`, ou null. Vem em TODA fase (o cliente precisa distinguir "nunca teve trial" de "o trial acabou"). */
  endsAt: string | null
  /** Milissegundos até o fim, quando ainda houver. NUNCA um "dias restantes" já arredondado: número derivado com decimal apodrece na viagem e o cliente arredonda no momento de exibir. */
  msLeft: number | null
  /** Créditos concedidos NA LINHA (não a constante — um trial antigo pode ter recebido outro número). */
  creditsGranted: number
  /** Créditos consumidos, cru. Pode ULTRAPASSAR `creditsGranted`: o último débito antes do teto pode custar mais do que faltava. */
  creditsUsed: number
  /** `creditsUsed` limitado por `creditsGranted` — o único seguro para copy do tipo "you used N of M". */
  creditsUsedForDisplay: number
  /** O teto vigente HOJE. Vai para o cliente para nenhuma copy precisar redigitar 40. */
  cap: number
  /**
   * A ÚNICA autorização para o modal comparativo de downgrade aparecer.
   * `phase === 'downgraded'` E não-pagante. Nunca derivado de datas no cliente.
   */
  showDowngradeModal: boolean
}

/** Linha mínima para responder "esta conta paga?" — a mesma pergunta do cron. */
export interface PayingProfileFields {
  plan?: unknown
  has_paid?: unknown
}

/**
 * DENYLIST invertida: só é "não paga" quem tem `has_paid` falso E plano
 * vazio/'free'. Qualquer outra coisa (plano desconhecido, coluna ausente,
 * grafia nova) conta como PAGANTE — o erro caro aqui é pedir assinatura a
 * quem já assinou, não deixar de pedir a quem não assinou.
 */
export function isPayingProfile(row: PayingProfileFields | null | undefined): boolean {
  if (!row) return false
  if (row.has_paid === true) return true
  const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : ''
  return plan !== '' && plan !== 'free'
}

/** Linha de profiles suficiente para montar o estado de UI do trial. */
export interface TrialUiRow extends TrialProfileFields, PayingProfileFields {
  trial_credits_granted?: unknown
}

/**
 * Monta o estado do trial para a interface. Nunca lança; entrada nula vira
 * `none`. Com a flag OFF devolve SEMPRE `none` — desligar a flag é um rollback
 * completo, inclusive da interface, sem deixar modal órfão na tela de ninguém.
 */
export function trialUiState(
  profile: TrialUiRow | null | undefined,
  now: number = Date.now(),
): TrialUiState {
  const empty: TrialUiState = {
    phase: 'none',
    endsAt: null,
    msLeft: null,
    creditsGranted: 0,
    creditsUsed: 0,
    creditsUsedForDisplay: 0,
    cap: TRIAL_CREDIT_CAP,
    showDowngradeModal: false,
  }
  if (!REVERSE_TRIAL_ENABLED || !profile) return empty

  const status = typeof profile.trial_status === 'string' ? profile.trial_status : null
  if (status === null) return empty

  const endsRaw = profile.trial_ends_at
  const endsAt = typeof endsRaw === 'string' ? endsRaw : null
  const endsMs = endsAt ? Date.parse(endsAt) : NaN
  const msLeft = Number.isFinite(endsMs) ? Math.max(0, endsMs - now) : null

  const grantedRaw = profile.trial_credits_granted
  const creditsGranted =
    typeof grantedRaw === 'number' && Number.isFinite(grantedRaw) ? grantedRaw : 0
  const creditsUsed = trialCreditsUsed(profile)

  let phase: TrialUiPhase
  if (status === 'downgraded') phase = 'downgraded'
  else if (status === 'converted') phase = 'converted'
  else if (isTrialActive(profile, now)) phase = 'active'
  else if (status === 'active' || status === 'expired') phase = 'ending'
  // Status gravado por uma versão futura que este código não conhece: não
  // inventar uma fase. `none` não mostra nada, que é o desfecho seguro.
  else return empty

  return {
    phase,
    endsAt,
    msLeft,
    creditsGranted,
    creditsUsed,
    creditsUsedForDisplay:
      creditsGranted > 0 ? Math.min(creditsUsed, creditsGranted) : creditsUsed,
    cap: TRIAL_CREDIT_CAP,
    // ⚠️ `creditsGranted > 0` mora AQUI, e não em cada tela, porque a SEGUNDA
    // passada da revisão adversarial pegou a primeira correção pela metade: a
    // guarda tinha sido posta só no paywall do /generate, e o modal — a
    // superfície mais alta das duas — continuava abrindo com a frase "your
    // trial credits have expired" para uma linha que nunca recebeu crédito
    // nenhum. Duas telas da mesma feature dando veredictos opostos sobre a
    // MESMA linha do banco é o defeito que este arquivo inteiro existe para
    // impedir. Só fala de PERDA quem comprovadamente RECEBEU.
    //
    // Efeito colateral desejado: qualquer rota futura que esqueça
    // `trial_credits_granted` no SELECT perde o upsell (silencioso, mas do lado
    // seguro) em vez de inventar uma perda que não houve.
    showDowngradeModal: phase === 'downgraded' && !isPayingProfile(profile) && creditsGranted > 0,
  }
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
          // REGISTRO POR LINHA do que ESTA conta recebeu (fase 2, item 2).
          // O cron de downgrade revoga o saldo remanescente do grant, e a conta
          // "quanto sobrou" precisa do que foi CONCEDIDO. Ler a constante na
          // hora da revogação seria correto só enquanto o teto nunca mudasse:
          // no dia em que o fundador aprovar 40→60, todo trial concedido a 40
          // passaria a ter 60 revogados. Número de dinheiro que envelhece mora
          // na LINHA, não na constante. (Vai na MESMA UPDATE do grant — nenhum
          // round-trip novo, nenhuma janela em que o crédito exista sem rastro.)
          trial_credits_granted: TRIAL_GRANT_CREDITS,
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
          console.log(`[reverse-trial] EXPIRED user=${userId.slice(0, 8)} used=${newUsed}/${TRIAL_CREDIT_CAP}`)
          // INSTRUMENTO DO A/B (sprint 13h) — sem este evento o experimento
          // 3d vs 7d não tem como distinguir "trial acabou porque a pessoa USOU
          // tudo" de "acabou porque o relógio venceu", que é exatamente a
          // pergunta que decide se o teto de 40 está apertado demais ou de menos.
          // console.log não é dado: não sobrevive à janela de log da Vercel nem
          // entra em query. Awaited pelo mesmo motivo do grant — é o rastro de
          // um evento que acontece UMA vez por trial e nunca mais.
          await writeServerEvent({
            name: 'trial_expired',
            userId,
            metadata: {
              reason: newUsed >= TRIAL_CREDIT_CAP ? 'credit_cap' : 'clock',
              credits_used: newUsed,
              cap: TRIAL_CREDIT_CAP,
              expired_before_deadline: newUsed >= TRIAL_CREDIT_CAP && Number.isFinite(ends) && Date.now() < ends,
            },
          })
        }
        return
      }
      // Perdeu a corrida — relê e tenta de novo.
    }
  } catch (e) {
    console.error('[reverse-trial] cap accounting threw:', e instanceof Error ? e.message : String(e))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 2, ITEM 2 — DOWNGRADE DO FIM DO TRIAL
//
// O que este bloco resolve é a DÍVIDA #1 declarada no commit d1133c7: a
// expiração já era passiva (entitlement volta ao free na request seguinte),
// mas o SALDO remanescente dos 40 créditos concedidos ficava na conta para
// sempre. Ligar a flag sem isto = 40 créditos vitalícios por e-mail.
//
// Três decisões que a revisão adversarial obrigou a escrever aqui:
//
// 1. QUEM PAGA NUNCA TEM CRÉDITO REVOGADO — e a checagem é DENYLIST INVERTIDA
//    (qualquer plan diferente de 'free'/vazio, OU has_paid), não a allowlist
//    PAID_PLANS que send-cap-hit e send-activation-nudge carregam (e que já
//    divergem entre si: uma tem 'autopilot', a outra não). Allowlist falha
//    ABERTO no plano que ninguém lembrou de acrescentar — e "falhar aberto"
//    aqui significa tirar crédito de um cliente pagante. Mesma guarda da
//    ativação, pelo mesmo motivo, no sentido seguro.
//
// 2. PERDER A CORRIDA DO CAS 3× = PULAR A LINHA, nunca gravar sem guarda.
//    É o OPOSTO da escolha feita no grant, de propósito: lá, desistir deixava
//    um usuário com trial e sem crédito nenhum (dano permanente e invisível);
//    aqui, desistir só adia a revogação em uma hora, enquanto gravar sem guarda
//    destruiria um crédito comprado que chegou no meio da corrida. A assimetria
//    do dano é que escolhe o lado.
//
// 3. REVOGA-SE O NÃO GASTO DO GRANT, LIMITADO PELO SALDO — nunca "zera a
//    conta". `min(saldo, max(0, concedido − usado))`. Crédito de indicação,
//    crédito comprado e crédito de refund ficam onde estão.
// ─────────────────────────────────────────────────────────────────────────────

/** Linha de profiles que o cron de downgrade precisa ler. */
export interface TrialDowngradeRow extends TrialProfileFields {
  id: string
  plan?: unknown
  has_paid?: unknown
  video_credits?: unknown
  trial_credits_granted?: unknown
  trial_variant?: unknown
}

export type TrialDowngradeOutcome =
  | { action: 'skipped'; reason: string; creditsRevoked: 0 }
  | { action: 'converted'; reason: 'paid'; creditsRevoked: 0 }
  | { action: 'downgraded'; reason: 'credit_cap' | 'clock'; creditsRevoked: number }

/** Colunas exigidas pelo downgrade — uma constante para o cron e os testes não divergirem. */
export const TRIAL_DOWNGRADE_SELECT =
  'id, plan, has_paid, video_credits, trial_status, trial_ends_at, trial_credits_used, trial_credits_granted, trial_variant'

// KINEO-TRIAL-PAYWALL-2026-08-06 — `isPayingProfile` foi PROMOVIDA para o topo
// deste arquivo (junto de trialUiState) e exportada. O cron e a interface
// precisam responder "esta conta paga?" com a MESMA função: se o cron achar que
// converteu e a tela achar que não, a pessoa recebe "veja o que você perdeu"
// depois de pagar. Duas cópias da mesma regra envelhecem em uma só.

/**
 * Processa UM trial vencido: revoga o saldo remanescente do grant e fecha o
 * estado. Nunca lança — o cron não pode morrer por causa de uma linha.
 *
 * Escrita ATÔMICA única (nada de "revoga e depois marca"): `video_credits`,
 * `trial_status` e `trial_downgraded_at` saem juntos, com compare-and-swap em
 * `trial_status` (o estado observado) e em `video_credits` (o saldo observado).
 * Ou a linha inteira muda, ou nada muda — logo não existe estado intermediário
 * "crédito revogado mas trial ainda aberto", que na rodada seguinte revogaria
 * de novo.
 */
export async function downgradeExpiredTrial(
  db: SupabaseClient,
  userId: string,
  now: number = Date.now(),
): Promise<TrialDowngradeOutcome> {
  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { data, error } = await db
        .from('profiles')
        .select(TRIAL_DOWNGRADE_SELECT)
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error('[reverse-trial] downgrade read failed:', error.message)
        return { action: 'skipped', reason: 'read_error', creditsRevoked: 0 }
      }
      if (!data) return { action: 'skipped', reason: 'no_profile', creditsRevoked: 0 }
      const row = data as unknown as TrialDowngradeRow

      // Releitura: o estado pode ter mudado entre a query da coorte e agora.
      if (!trialNeedsDowngrade(row, now)) {
        return { action: 'skipped', reason: 'not_due', creditsRevoked: 0 }
      }

      const observedStatus = row.trial_status as string
      const rawBalance = row.video_credits
      const balance = typeof rawBalance === 'number' && Number.isFinite(rawBalance) ? rawBalance : null
      const grantedRaw = row.trial_credits_granted
      const granted = typeof grantedRaw === 'number' && Number.isFinite(grantedRaw) ? grantedRaw : 0
      const used = trialCreditsUsed(row)

      const paying = isPayingProfile(row)
      // Não gastou do grant = pode ser revogado; limitado pelo saldo real, que
      // pode ser menor (o /api/credits/deduct decrementa fora do RPC) — e nunca
      // negativo, porque `used` pode ULTRAPASSAR `granted` (o último débito
      // antes do teto pode custar mais do que faltava).
      //
      // `granted` VINDO 0 REVOGA 0, de propósito e sem fallback para a
      // constante. Uma linha de trial sem registro de concessão é ou (a) de
      // antes desta coluna existir — e a produção tem ZERO trials, a flag nunca
      // esteve ligada, então esse conjunto é vazio — ou (b) editada à mão. Nos
      // dois casos, "assumir 40" tiraria crédito que talvez a pessoa tenha
      // COMPRADO. Na dúvida sobre dinheiro alheio, não mexer.
      const unspent = Math.max(0, granted - used)
      const revoke = paying || balance === null ? 0 : Math.min(Math.max(0, balance), unspent)

      const reason: 'credit_cap' | 'clock' = trialCapReached(row) ? 'credit_cap' : 'clock'
      // ⚠️ SEAM PARA O ITEM 4 (extensão automática "+2 dias se 3+ vídeos e não
      // assinou"): o ponto de decisão dela é AQUI, antes desta escrita, e não um
      // cron separado. Depois que a linha vira 'downgraded' e o saldo é
      // revogado, estender significaria conceder crédito DE NOVO — reabrindo
      // exatamente o replay que o desenho do grant foi feito para eliminar.
      // Quem for implementar: a extensão é um ramo desta mesma UPDATE
      // (trial_ends_at += 2d, trial_extended = true, status segue 'active'),
      // com a MESMA guarda de CAS. E a contagem de "3+ vídeos" NÃO pode sair da
      // tabela `videos`, que é escrita pelo CLIENTE (lição de 06/08): a fonte
      // server-side é `render_jobs` / `credit_debits`.
      const patch: Record<string, unknown> = {
        // 'converted' é rede de segurança, NÃO substitui o webhook da Stripe
        // (item 8): quem comprou durante o trial e nunca teve o status atualizado
        // sairia daqui contado como churn no A/B.
        trial_status: paying ? 'converted' : 'downgraded',
        // ⚠️ COORTE DOS E-MAILS D3+ (item 4) = trial_status = 'downgraded' E
        // trial_downgraded_at na janela. NUNCA só `trial_downgraded_at is not
        // null`: esta coluna também é carimbada em quem CONVERTEU, e mandar
        // "Here's what you just lost access to" para um assinante ativo é
        // exatamente a classe de erro que a revisão de 05/08 pegou (afirmação
        // sobre o usuário que ele consegue conferir e que é falsa).
        trial_downgraded_at: new Date(now).toISOString(),
      }
      if (revoke > 0) patch.video_credits = (balance ?? 0) - revoke

      let write = db.from('profiles').update(patch).eq('id', userId).eq('trial_status', observedStatus)
      // O eixo do saldo no CAS só existe quando há dinheiro em jogo. Sem
      // revogação, exigir o saldo só produziria retry inútil quando um débito
      // legítimo acontece no mesmo segundo. (`revoke > 0` implica `balance`
      // numérico — ver o cálculo acima —, então não há ramo de null aqui.)
      if (revoke > 0) write = write.eq('video_credits', balance as number)
      const { data: updated, error: writeErr } = await write.select('id')
      if (writeErr) {
        console.error('[reverse-trial] downgrade update failed:', writeErr.message)
        return { action: 'skipped', reason: 'update_error', creditsRevoked: 0 }
      }
      if (!updated || updated.length === 0) continue // perdeu a corrida — relê

      const outcome: TrialDowngradeOutcome = paying
        ? { action: 'converted', reason: 'paid', creditsRevoked: 0 }
        : { action: 'downgraded', reason, creditsRevoked: revoke }
      console.log(
        `[reverse-trial] ${outcome.action.toUpperCase()} user=${userId.slice(0, 8)} reason=${outcome.reason} revoked=${outcome.creditsRevoked} used=${used}/${granted}`,
      )
      // AWAIT pelo mesmo motivo do grant e do trial_expired: acontece UMA vez
      // por trial. Mas o registro que os e-mails D3+ vão usar como COORTE é a
      // COLUNA trial_downgraded_at, escrita na mesma UPDATE do dinheiro — não
      // este evento. Evento que falha vira buraco de auditoria; coorte que falha
      // vira gente sem e-mail e gente com e-mail duplicado.
      await writeServerEvent({
        name: 'trial_downgraded',
        userId,
        metadata: {
          outcome: outcome.action,
          reason: outcome.reason,
          credits_revoked: outcome.creditsRevoked,
          credits_granted: granted,
          credits_used: used,
          variant: typeof row.trial_variant === 'string' ? row.trial_variant : null,
          from_status: observedStatus,
        },
      })
      return outcome
    }
    // 3 corridas perdidas: PULA. Ver decisão 2 no cabeçalho deste bloco — a
    // próxima rodada pega, e o entitlement já está correto desde o vencimento
    // (isTrialActive é passivo). Adiar revogação é barato; gravar sem guarda não.
    console.warn(`[reverse-trial] downgrade lost CAS 3x user=${userId.slice(0, 8)} — retry next run`)
    return { action: 'skipped', reason: 'lost_race', creditsRevoked: 0 }
  } catch (e) {
    console.error('[reverse-trial] downgrade threw:', e instanceof Error ? e.message : String(e))
    return { action: 'skipped', reason: 'threw', creditsRevoked: 0 }
  }
}
