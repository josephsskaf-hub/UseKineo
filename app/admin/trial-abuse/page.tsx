// KINEO-TRIAL-ABUSE-PMP-2026-08-07 — /admin/trial-abuse: o painel mínimo do
// reverse trial. SOMENTE LEITURA — esta tela não tem um único caminho de
// escrita, de propósito: um botão "desbloquear este fingerprint" seria a
// primeira coisa a ser clicada sem contexto, e a decisão de conceder trial já
// falha aberto sozinha (ver lib/trialFingerprint.ts).
//
// Mesmo gate de todo /admin/*: sessão por cookie + ADMIN_EMAILS, checado no
// servidor ANTES de qualquer query, e a service-role key nunca entra no bundle
// do browser (Server Component).
//
// O que ele responde, e por que estas quatro perguntas:
//   1. Quantos trials estão ativos / venceram / foram rebaixados / converteram
//      — a taxa de conversão do experimento inteiro, por variante (3d vs 7d).
//   2. Quantos créditos foram CONCEDIDOS vs. USADOS — o custo real do brinde.
//      Lido da COLUNA trial_credits_granted (por linha), nunca da constante:
//      se o teto mudar, os trials antigos continuam somando o que receberam.
//   3. Quantos signups o fingerprint barrou — e o número que importa ao lado
//      dele: quantos ele DEIXOU passar. Um painel que só mostra bloqueios
//      convida a apertar o limite; mostrando os dois, o custo do falso
//      positivo fica na mesma linha do benefício.
//   4. Se a checagem FALHOU (tabela ausente, query com erro). Esse ramo concede
//      o trial silenciosamente, então sem esta linha o anti-abuso poderia estar
//      desligado há semanas sem ninguém notar.

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows, isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { INTERNAL_ACCOUNTS_LABEL, isInternalEmail } from '@/lib/internalAccounts'
import {
  AB_MATURITY_GRACE_MS,
  AB_MIN_ACTIVATION_PER_ARM,
  AB_MIN_CONVERSIONS_PER_ARM,
  AB_MIN_MATURED_PER_ARM,
  REVERSE_TRIAL_ENABLED,
  TRIAL_CREDIT_CAP,
  TRIAL_VARIANT_DAYS,
} from '@/lib/reverseTrial'
import type { TrialVariant } from '@/lib/reverseTrial'
import {
  trialFingerprintSaltConfigured,
  TRIAL_FINGERPRINT_MAX_ACTIVATIONS,
  TRIAL_FINGERPRINT_SALT_ENV,
  TRIAL_FINGERPRINT_TABLE,
  TRIAL_FINGERPRINT_WINDOW_DAYS,
} from '@/lib/trialFingerprint'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 20 }

// ── data ────────────────────────────────────────────────────────────────────

interface TrialProfileRow {
  id: string
  email: string | null
  /** Início do trial. Medido: `trial_started_at − created_at` ≤ 0,01d em 117/117. */
  created_at: string | null
  trial_status: string | null
  trial_variant: string | null
  trial_credits_granted: number | null
  trial_credits_used: number | null
  trial_ends_at: string | null
  /** Idempotência da extensão automática de 3 dias (cron de lifecycle). */
  trial_extended: boolean | null
}

interface FingerprintRow {
  fingerprint_hash: string | null
  outcome: string | null
  created_at: string | null
}

interface EventRow {
  name: string | null
  created_at: string | null
  user_id: string | null
  /** jsonb: forma não garantida pelo tipo — lido com narrowing, nunca com `as`. */
  metadata: Record<string, unknown> | null
}

// ═══ KINEO-AB-CENSORING-2026-08-11 — O A/B ESTAVA SENDO LIDO DE QUATRO ═══
// ═══ MANEIRAS ERRADAS AO MESMO TEMPO, E TRÊS DELAS FAVORECIAM O 3d      ═══
//
// A taxa impressa era `converted / total`. `total` inclui quem AINDA NÃO
// CHEGOU no momento de decidir, e o braço de relógio mais longo sempre demora
// mais para chegar lá. É censura de coorte aberta, e ela aponta sempre para o
// mesmo lado: contra o tratamento mais lento.
//
// ⚠️ O REMÉDIO ÓBVIO — dividir pelos status terminais — FOI TENTADO E É PIOR.
// Duas revisões adversariais independentes o derrubaram pelo mesmo motivo:
//   · `converted` é carimbado NA HORA do pagamento (pode ser no dia 1);
//     `downgraded` só pode existir depois do relógio da variante. Então o
//     conjunto "terminal" do braço lento é ENRIQUECIDO de convertedores
//     precoces enquanto seus rebaixados ainda não chegaram — o viés apenas
//     troca de direção.
//   · `TRIAL_TERMINAL_STATUSES` responde UMA pergunta ("o cron de downgrade
//     deve pular esta linha?") e a própria docstring dela proíbe este uso:
//     'downgraded' é REVERSÍVEL por dois caminhos vivos (estorno de falha de
//     fornecedor e a extensão automática de 3 dias). Um denominador que anda
//     para trás não é denominador.
//
// O denominador correto é MATURIDADE, não status: `trial_ends_at` já passou,
// com folga para o cron. Ele não anda para trás e não depende de quem carimbou
// o quê. Medido em 11/08: braço 3d 11 maturados · braço 7d **0 maturados**.
// Zero. A tela estava imprimindo "0 converted (0%)" para um braço em que
// nenhum trial tinha ainda chegado ao momento de decidir.
//
// AS QUATRO CORREÇÕES: (1) denominador = maturados; (2) contas internas fora
// (havia 1, no braço sem conversão); (3) contaminados CONTADOS E MOSTRADOS —
// não excluídos, porque revival e extensão são variáveis PÓS-tratamento e
// remover linhas por elas seleciona a amostra pelo desfecho; (4) nenhuma
// porcentagem sai enquanto N e numerador não sustentarem uma.
interface VariantStat {
  variant: string
  /** Externos (contas internas fora). O universo ITT do experimento. */
  eligible: number
  /** Início + dias da variante já passou, com folga do cron. O denominador. */
  matured: number
  /** Relógio ainda correndo. Ainda podem converter — fora dos dois lados. */
  running: number
  /** Sem data legível ou variante desconhecida: nem maturado nem correndo. */
  unreadableClock: number
  converted: number
  /** ≥1 vídeo entregue. O surrogado que tem potência estatística real. */
  activated: number
  /** Voltaram do rebaixamento por estorno de falha de fornecedor. */
  revived: number
  /** Ganharam +3 dias da extensão automática — a variável sob teste mudou. */
  extended: number
  excludedInternal: number
  /** É um braço real do experimento (3d/7d)? Baldes '?' ou legados: false. */
  isArm: boolean
}

interface AbuseData {
  byStatus: Record<string, number>
  totalTrials: number
  creditsGranted: number
  creditsUsed: number
  byVariant: VariantStat[]
  /** Nenhuma taxa de CONVERSÃO sai enquanto isto for true. */
  conversionUnreadable: boolean
  /** Nenhuma taxa de ATIVAÇÃO (o surrogado) sai enquanto isto for true. */
  activationUnreadable: boolean
  /** A leitura de `videos` falhou: "0 entregaram vídeo" seria mentira. */
  activationLookupSuspect: boolean
  /**
   * A leitura de `events` voltou vazia com trials existindo. `fetchAllRows`
   * degrada para [] em erro de PostgREST, e nesse caso os contaminados
   * apareceriam como ZERO — indistinguível de "não havia nenhum". Um painel que
   * confunde as duas coisas mente exatamente onde promete honestidade.
   */
  contaminationLookupSuspect: boolean
  fingerprintTableMissing: boolean
  fpActivated30d: number
  fpBlocked30d: number
  fpBlockedAllTime: number
  checkFailed30d: number
  repeatOffenders: Array<{ label: string; activated: number; blocked: number; lastSeen: string | null }>
}

const DAY = 24 * 60 * 60 * 1000

async function loadAbuse(): Promise<AbuseData | null> {
  const admin = serviceClient()
  if (!admin) return null

  const [profiles, fingerprints, events] = await Promise.all([
    fetchAllRows<TrialProfileRow>(
      admin,
      'profiles',
      'id, email, created_at, trial_status, trial_variant, trial_credits_granted, trial_credits_used, trial_ends_at, trial_extended',
    ),
    // fetchAllRows já degrada para [] quando a query falha (loga um warn). Se a
    // migração ainda não rodou neste ambiente, o painel abre vazio em vez de
    // 500 — mas a linha "table missing" abaixo diz isso em voz alta.
    fetchAllRows<FingerprintRow>(admin, TRIAL_FINGERPRINT_TABLE, 'fingerprint_hash, outcome, created_at'),
    // `trial_cap_refunded` entra aqui (KINEO-AB-CENSORING-2026-08-11) porque é
    // o único registro de que uma conta passou por um churn no meio do trial.
    // `metadata` vem junto de propósito: hoje o evento SÓ é escrito no ramo
    // `revive` de lib/reverseTrial, mas o contrato publicado em GATES-ABERTOS é
    // a NOTA (`ab_cohort_note`), não o nome. Casar pelo nome amarraria esta
    // tela a um detalhe de implementação que pode ganhar um segundo emissor.
    fetchAllRows<EventRow>(admin, 'events', 'name, created_at, user_id, metadata', {
      column: 'name',
      values: ['trial_blocked_fingerprint', 'trial_fingerprint_check_failed', 'trial_cap_refunded'],
    }),
  ])

  // Contas que voltaram do rebaixamento por estorno de falha de fornecedor.
  //
  // ⚠️ ELAS FICAM NO DENOMINADOR, MARCADAS. Excluí-las era a primeira versão
  // desta correção e foi derrubada na revisão: "foi revivido" é uma variável
  // PÓS-tratamento, e remover linhas por ela seleciona a amostra pelo desfecho.
  // Pior no caso concreto: o revival só alcança as vítimas do apagão que
  // RECEBERAM estorno; as que bateram o teto e não receberam continuariam
  // dentro. A regra tiraria uma parte das vítimas e manteria a outra.
  const revivedUserIds = new Set<string>()
  for (const e of events) {
    if (e.name !== 'trial_cap_refunded') continue
    const meta = e.metadata
    if (!meta || typeof meta !== 'object') continue
    const isRevival =
      meta.ab_cohort_note === 'revived_after_provider_failure' || meta.revived === true
    if (isRevival && e.user_id) revivedUserIds.add(e.user_id)
  }

  const now = Date.now()
  const maturityCutoff = now - AB_MATURITY_GRACE_MS
  const since30 = now - TRIAL_FINGERPRINT_WINDOW_DAYS * DAY

  const trialIds = profiles.filter((p) => (p.trial_status ?? '').trim()).map((p) => p.id)

  // O SURROGADO. "Ativado" = ≥1 vídeo ENTREGUE, que é a definição usada em todo
  // o resto da operação (ENGAGEMENT-LOG). Não `trial_credits_used > 0`: a
  // coorte quebrada de 11/08 prova que gastar crédito e receber vídeo são
  // coisas diferentes — 26 contas gastaram tentativa e receberam zero.
  //
  // ⚠️ FILTRADO POR `status`, NÃO POR `user_id in (…)`. A primeira versão
  // passava a lista de ids do trial, e o filtro `in` do PostgREST viaja na
  // QUERY STRING de um GET: medido, o proxy devolve 414 acima de ~64 KB, ou
  // seja ~1.650 ids. No ritmo atual (~30 trials/dia) isso chega em ~7 semanas —
  // e `fetchAllRows` engole o erro e devolve `[]`, então a tela passaria a
  // imprimir "ativação 0%" EM VERDE justamente quando o gate já tivesse aberto.
  // Filtrar por status não cresce a URL e traz ~941 linhas, uma página só.
  const videos = await fetchAllRows<{ user_id: string | null }>(admin, 'videos', 'user_id', {
    column: 'status',
    values: ['completed'],
  })
  const activatedUserIds = new Set<string>()
  for (const v of videos) if (v.user_id) activatedUserIds.add(v.user_id)

  const byStatus: Record<string, number> = {}
  let creditsGranted = 0
  let creditsUsed = 0
  const variantMap = new Map<string, VariantStat>()
  for (const p of profiles) {
    const status = (p.trial_status ?? '').trim()
    if (!status) continue // nunca teve trial — fora de todas as contagens
    byStatus[status] = (byStatus[status] ?? 0) + 1
    creditsGranted += typeof p.trial_credits_granted === 'number' ? p.trial_credits_granted : 0
    creditsUsed += typeof p.trial_credits_used === 'number' ? p.trial_credits_used : 0
    const variant = (p.trial_variant ?? '?').trim() || '?'
    const stat =
      variantMap.get(variant) ??
      {
        variant,
        eligible: 0,
        matured: 0,
        running: 0,
        unreadableClock: 0,
        converted: 0,
        activated: 0,
        revived: 0,
        extended: 0,
        excludedInternal: 0,
        isArm: Object.prototype.hasOwnProperty.call(TRIAL_VARIANT_DAYS, variant),
      }
    variantMap.set(variant, stat)

    // A ÚNICA exclusão, e ela é CONTADA: conta interna nunca foi do
    // experimento. Um painel que descarta linhas sem dizer quantas é
    // indistinguível de um painel com bug de query.
    if (isInternalEmail(p.email)) {
      stat.excludedInternal += 1
      continue
    }

    stat.eligible += 1

    // MATURIDADE POR ÂNCORA IMUTÁVEL: início do trial + dias da variante.
    //
    // ⚠️ NÃO É `trial_ends_at`, E ESSA FOI A ARMADILHA. A versão anterior desta
    // correção usava a coluna direto, alegando que ela é monotônica. Não é: a
    // extensão automática faz `trial_ends_at = now + 3d` — SOBRESCRITA, não
    // soma — então uma linha já maturada volta para "correndo". Medido em
    // 11/08: 11 linhas do braço 3d e ZERO do 7d (o 7d não tem como ter
    // expirado ainda). O denominador do 3d encolhia 52%, num braço só, o que
    // dobrava a taxa dele. É exatamente o viés que esta tela existe para
    // remover, escondido numa variável diferente.
    //
    // `created_at` não é reescrito por caminho nenhum e é o início do trial na
    // prática (medido: `trial_started_at − created_at` ≤ 0,01 dia em 117 de
    // 117 linhas). Relógio ilegível NÃO conta como maturado — inflar o
    // denominador da métrica que decide a duração do trial é o erro caro.
    const startMs = p.created_at ? Date.parse(p.created_at) : NaN
    const variantDays = TRIAL_VARIANT_DAYS[variant as TrialVariant]
    const originalEndMs =
      Number.isFinite(startMs) && typeof variantDays === 'number' ? startMs + variantDays * DAY : NaN
    if (Number.isFinite(originalEndMs) && originalEndMs <= maturityCutoff) stat.matured += 1
    else if (Number.isFinite(originalEndMs)) stat.running += 1
    else stat.unreadableClock += 1

    if (status === 'converted') stat.converted += 1
    if (activatedUserIds.has(p.id)) stat.activated += 1
    if (revivedUserIds.has(p.id)) stat.revived += 1
    if (p.trial_extended === true) stat.extended += 1
  }
  const totalTrials = Object.values(byStatus).reduce((a, b) => a + b, 0)

  // ⚠️ TRIPWIRES POR SONDA, NÃO POR "VEIO VAZIO". A primeira versão marcava
  // suspeita quando `events` voltava com zero linhas — mas zero é o estado
  // LEGÍTIMO aqui (o salt de fingerprint nunca foi configurado, então
  // `trial_blocked_fingerprint` nunca existiu, e antes de 11/08 também não
  // havia nenhum `trial_cap_refunded`). A faixa vermelha teria aparecido num
  // painel saudável. `fetchAllRows` engole o erro do PostgREST e devolve [];
  // quem distingue "falhou" de "vazio" é uma pergunta direta ao schema — o
  // mesmo padrão que a sonda de `fingerprintTableMissing` abaixo já usava.
  const [eventsProbe, videosProbe] = await Promise.all([
    admin.from('events').select('id', { count: 'exact', head: true }),
    admin.from('videos').select('id', { count: 'exact', head: true }),
  ])
  const contaminationLookupSuspect = Boolean(eventsProbe.error)
  const activationLookupSuspect = Boolean(videosProbe.error) || (trialIds.length > 0 && videos.length === 0)

  // A tabela pode existir e estar legitimamente vazia (flag OFF, que é o estado
  // de produção hoje). "Vazia" e "ausente" só se distinguem por uma pergunta
  // direta ao schema, e um painel que confunde as duas mente sobre o anti-abuso
  // estar ligado.
  let fingerprintTableMissing = false
  {
    const probe = await admin.from(TRIAL_FINGERPRINT_TABLE).select('id', { count: 'exact', head: true })
    if (probe.error) fingerprintTableMissing = true
  }

  let fpActivated30d = 0
  let fpBlocked30d = 0
  let fpBlockedAllTime = 0
  const perHash = new Map<string, { activated: number; blocked: number; lastSeen: string | null }>()
  for (const f of fingerprints) {
    const hash = (f.fingerprint_hash ?? '').trim()
    if (!hash) continue
    const ts = f.created_at ? Date.parse(f.created_at) : NaN
    const recent = Number.isFinite(ts) && ts >= since30
    const blocked = f.outcome === 'blocked'
    if (blocked) fpBlockedAllTime += 1
    if (recent) {
      if (blocked) fpBlocked30d += 1
      else fpActivated30d += 1
    }
    const entry = perHash.get(hash) ?? { activated: 0, blocked: 0, lastSeen: null }
    if (blocked) entry.blocked += 1
    else entry.activated += 1
    if (f.created_at && (!entry.lastSeen || f.created_at > entry.lastSeen)) entry.lastSeen = f.created_at
    perHash.set(hash, entry)
  }

  // PII: só o PREFIXO de 12 chars sai daqui. É o bastante para correlacionar
  // duas linhas desta tabela e inútil para qualquer outra coisa.
  const repeatOffenders = [...perHash.entries()]
    .filter(([, v]) => v.activated + v.blocked > 1)
    .sort((a, b) => b[1].activated + b[1].blocked - (a[1].activated + a[1].blocked))
    .slice(0, 25)
    .map(([hash, v]) => ({ label: hash.slice(0, 12), activated: v.activated, blocked: v.blocked, lastSeen: v.lastSeen }))

  let checkFailed30d = 0
  for (const e of events) {
    const ts = e.created_at ? Date.parse(e.created_at) : NaN
    if (!Number.isFinite(ts) || ts < since30) continue
    if (e.name === 'trial_fingerprint_check_failed') checkFailed30d += 1
  }

  // Ordem FIXA pelo nome da variante. Ordenar por tamanho fazia os braços
  // trocarem de lugar de um dia para o outro numa tela que se lê de relance.
  const byVariant = [...variantMap.values()].sort((a, b) => a.variant.localeCompare(b.variant))

  // Os gates olham SÓ os braços conhecidos. Um único perfil com `trial_variant`
  // nulo cria um balde '?' que nunca alcança piso nenhum e travaria a tela para
  // sempre — falha para o lado seguro, mas por um motivo que ninguém entenderia
  // no dia em que disparasse. O mesmo `isArm` gateia a RENDERIZAÇÃO: sem isso o
  // balde '?' imprimiria uma porcentagem sem passar por gate nenhum.
  const arms = byVariant.filter((v) => v.isArm)

  // O gate é sobre O MESMO DENOMINADOR QUE É IMPRESSO (maturados) e também
  // sobre o NUMERADOR. Um N grande com 1 conversão não é experimento, é
  // anedota com barra de erro. `arms.length < 2` cobre o array vazio, onde um
  // `every` responderia "legível".
  const conversionUnreadable =
    arms.length < 2 ||
    arms.some((v) => v.matured < AB_MIN_MATURED_PER_ARM || v.converted < AB_MIN_CONVERSIONS_PER_ARM)

  // O surrogado usa TODOS os elegíveis: "entregou ≥1 vídeo" não espera o
  // relógio vencer para ser observável.
  const activationUnreadable =
    arms.length < 2 || arms.some((v) => v.eligible < AB_MIN_ACTIVATION_PER_ARM)

  return {
    byStatus,
    totalTrials,
    creditsGranted,
    creditsUsed,
    byVariant,
    conversionUnreadable,
    // Se a leitura de `videos` falhou, TODO braço tem 0 ativados e a tela
    // imprimiria "ativação 0%" em verde para a métrica que o banner manda usar.
    // Forçar ilegível é a única saída segura.
    activationUnreadable: activationUnreadable || activationLookupSuspect,
    activationLookupSuspect,
    contaminationLookupSuspect,
    fingerprintTableMissing,
    fpActivated30d,
    fpBlocked30d,
    fpBlockedAllTime,
    checkFailed30d,
    repeatOffenders,
  }
}

// ── formatting ──────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_ORDER = ['active', 'expired', 'downgraded', 'converted'] as const
const STATUS_ACCENT: Record<string, string> = {
  active: '#34d399',
  expired: '#fbbf24',
  downgraded: '#f87171',
  converted: '#2997ff',
}

// ── page ────────────────────────────────────────────────────────────────────

export default async function AdminTrialAbusePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center" style={CARD}>
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-2" style={{ color: '#f5f5f7' }}>Access denied.</h1>
          <p className="text-sm" style={{ color: '#86868b' }}>Admin only.</p>
        </div>
      </Shell>
    )
  }

  const data = await loadAbuse()
  if (!data) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>
          Service role not configured on this environment.
        </div>
      </Shell>
    )
  }

  const statuses = [
    ...STATUS_ORDER.filter((s) => data.byStatus[s] !== undefined),
    ...Object.keys(data.byStatus).filter((s) => !STATUS_ORDER.includes(s as (typeof STATUS_ORDER)[number])),
  ]

  return (
    <Shell>
      <div className="flex items-center justify-between gap-4 mb-1">
        <h1 className="text-2xl font-black" style={{ color: '#f5f5f7' }}>Reverse trial · abuse</h1>
        <Link href="/admin" className="text-[12px] font-bold" style={{ color: '#2997ff' }}>← Admin</Link>
      </div>
      <p className="text-[12px] mb-5" style={{ color: '#86868b' }}>
        Read-only. Flag <code>KINEO_REVERSE_TRIAL_ENABLED</code> is{' '}
        <strong style={{ color: REVERSE_TRIAL_ENABLED ? '#34d399' : '#fbbf24' }}>
          {REVERSE_TRIAL_ENABLED ? 'ON' : 'OFF'}
        </strong>
        {' · '}cap {TRIAL_CREDIT_CAP} credits{' · '}fingerprint limit{' '}
        {TRIAL_FINGERPRINT_MAX_ACTIVATIONS} activations / {TRIAL_FINGERPRINT_WINDOW_DAYS}d
      </p>

      {/* KINEO-TRIAL-BLOCKERS-2026-08-07 — BLOQUEADOR #3 DO QA. Sem o salt o
          hash é sempre null, o verdict é sempre 'no_signal' e o anti-abuso
          inteiro vira um no-op: nenhuma linha, nenhum evento de bloqueio,
          nenhum aviso — os contadores abaixo ficam TODOS em zero e um zero
          nesta tela é indistinguível de "não houve abuso". Esta faixa vem
          ANTES da de tabela ausente de propósito: sem salt, nem a tabela chega
          a ser consultada, então a ordem das faixas espelha a ordem em que as
          coisas falham. Lida do ambiente VIVO (Server Component), não de
          evento — evento só prova que faltava quando alguém se cadastrou. */}
      {!trialFingerprintSaltConfigured() && (
        <div
          className="rounded-2xl p-4 mb-5 text-[12.5px]"
          style={{ background: 'rgba(248,113,113,.14)', border: '1px solid rgba(248,113,113,.55)', color: '#f87171' }}
        >
          <strong>anti-abuso INATIVO: falta {TRIAL_FINGERPRINT_SALT_ENV}.</strong> Sem essa variável
          de ambiente o fingerprint de device/IP nunca é calculado: TODO signup recebe trial sem
          nenhuma checagem, e os contadores desta página ficam em zero por falta de sinal — não por
          falta de abuso. A concessão segue fail-open de propósito; o que não pode é ser silenciosa.
          Defina {TRIAL_FINGERPRINT_SALT_ENV} no ambiente de produção da Vercel no MESMO deploy em
          que <code>KINEO_REVERSE_TRIAL_ENABLED=true</code> — instruções exatas (como gerar o valor)
          em <code>docs/QA-REVERSE-TRIAL-2026-08-07.md</code>.
        </div>
      )}

      {data.fingerprintTableMissing && (
        <div
          className="rounded-2xl p-4 mb-5 text-[12.5px]"
          style={{ background: 'rgba(248,113,113,.10)', border: '1px solid rgba(248,113,113,.35)', color: '#f87171' }}
        >
          <strong>{TRIAL_FINGERPRINT_TABLE} is missing on this environment.</strong> The device/IP guard
          is fail-open by design, so every signup is currently getting a trial with no device check.
          Apply the tail of <code>docs/SQL-REVERSE-TRIAL.sql</code>.
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statuses.map((s) => (
          <Stat key={s} label={s} value={data.byStatus[s] ?? 0} accent={STATUS_ACCENT[s] ?? '#f5f5f7'} />
        ))}
        {statuses.length === 0 && (
          <div className="col-span-2 md:col-span-4 rounded-2xl p-6 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>
            No trial has ever been activated (expected while the flag is OFF).
          </div>
        )}
      </section>

      {/* KINEO-AB-CENSORING-2026-08-11 — os cards acima são BRUTOS de propósito
          (é a contabilidade do brinde: crédito interno também custa dinheiro),
          enquanto o bloco de A/B mais abaixo exclui contas internas. Sem esta
          linha os dois "converted" da mesma tela divergiriam sem explicação. */}
      {data.byVariant.length > 0 && (
        <p className="text-[11px] -mt-3 mb-6" style={{ color: '#6e6e73' }}>
          Contagens brutas: incluem contas internas. O bloco{' '}
          <strong style={{ color: '#86868b' }}>A/B</strong> abaixo as exclui — os números divergem
          por construção.
        </p>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="trials, total" value={data.totalTrials} accent="#f5f5f7" />
        <Stat label="credits granted" value={data.creditsGranted} accent="#fbbf24" />
        <Stat label="credits used" value={data.creditsUsed} accent="#fbbf24" />
        <Stat
          label={`blocked by fingerprint (${TRIAL_FINGERPRINT_WINDOW_DAYS}d)`}
          value={data.fpBlocked30d}
          accent="#f87171"
        />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label={`allowed by fingerprint (${TRIAL_FINGERPRINT_WINDOW_DAYS}d)`}
          value={data.fpActivated30d}
          accent="#34d399"
        />
        <Stat label="blocked, all time" value={data.fpBlockedAllTime} accent="#f87171" />
        <Stat label={`check failed (${TRIAL_FINGERPRINT_WINDOW_DAYS}d)`} value={data.checkFailed30d} accent="#fbbf24" />
        <Stat label="repeat fingerprints" value={data.repeatOffenders.length} accent="#f5f5f7" />
      </section>

      {data.byVariant.length > 0 && (
        <section className="rounded-2xl p-4 mb-6" style={CARD}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h2 className="text-sm font-black" style={{ color: '#f5f5f7' }}>A/B · 3d vs 7d</h2>
            <span className="text-[11px]" style={{ color: '#6e6e73' }}>{INTERNAL_ACCOUNTS_LABEL}</span>
          </div>

          {(data.contaminationLookupSuspect || data.activationLookupSuspect) && (
            <div
              className="rounded-xl p-3 mb-3 text-[12px]"
              style={{ background: 'rgba(248,113,113,.14)', border: '1px solid rgba(248,113,113,.55)', color: '#f87171' }}
            >
              <strong>Uma das leituras falhou — os zeros abaixo são falta de dado.</strong>{' '}
              {data.contaminationLookupSuspect && (
                <>
                  <code>events</code> não respondeu: &quot;revividos&quot; aparece como zero sem que isso
                  signifique ausência de contaminação.{' '}
                </>
              )}
              {data.activationLookupSuspect && (
                <>
                  <code>videos</code> não respondeu: &quot;entregaram vídeo&quot; aparece como zero e a
                  taxa de ativação está forçada a ilegível.
                </>
              )}
            </div>
          )}

          {/* KINEO-AB-CENSORING-2026-08-11 — a faixa vem ANTES dos números, não
              depois. Um aviso embaixo de uma porcentagem chega tarde: quem lê
              uma tela de admin lê o número primeiro e a nota de rodapé nunca. */}
          {data.conversionUnreadable && (
            <div
              className="rounded-xl p-3 mb-3 text-[12px] leading-relaxed"
              style={{ background: 'rgba(251,191,36,.10)', border: '1px solid rgba(251,191,36,.35)', color: '#fbbf24' }}
            >
              <strong>A CONVERSÃO deste experimento não é legível, e não vai ser tão cedo.</strong>{' '}
              Com taxa base de ~1%, detectar uma diferença de 2× pede{' '}
              {AB_MIN_MATURED_PER_ARM.toLocaleString('en-US')} trials <em>maturados</em> por braço e
              pelo menos {AB_MIN_CONVERSIONS_PER_ARM} conversões em cada. Nenhuma porcentagem de
              conversão é impressa até lá — de propósito.{' '}
              {data.activationUnreadable ? (
                <>
                  <strong>A ativação, que é o caminho curto, também ainda não é legível:</strong>{' '}
                  pede {AB_MIN_ACTIVATION_PER_ARM} elegíveis por braço. Não divida os números brutos
                  abaixo na cabeça — é a mesma conta que este aviso existe para impedir.
                </>
              ) : (
                <>
                  <strong>Decida 3d×7d pela ATIVAÇÃO abaixo</strong>, que tem taxa base ~50× maior e
                  por isso já é legível com {AB_MIN_ACTIVATION_PER_ARM} por braço.
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {data.byVariant.map((v) => (
              <div key={v.variant} className="text-[12.5px]" style={{ color: '#86868b' }}>
                <strong style={{ color: '#f5f5f7' }}>{v.variant}</strong> · {v.eligible} elegíveis ·{' '}
                <strong style={{ color: '#f5f5f7' }}>{v.matured}</strong> maturados ·{' '}
                {v.running} com o relógio correndo · {v.converted} converteram ·{' '}
                <strong style={{ color: '#f5f5f7' }}>{v.activated}</strong> entregaram vídeo
                {v.unreadableClock > 0 && (
                  <span style={{ color: '#f87171' }}> · {v.unreadableClock} sem relógio legível</span>
                )}
                {v.isArm && !data.conversionUnreadable && v.matured > 0 && (
                  <span style={{ color: '#2997ff' }}>
                    {' '}· conversão {v.converted}/{v.matured}
                  </span>
                )}
                {v.isArm && !data.activationUnreadable && v.eligible > 0 && (
                  <span style={{ color: '#34d399' }}>
                    {' '}· ativação {Math.round((v.activated / v.eligible) * 100)}%
                  </span>
                )}
                {(v.revived > 0 || v.extended > 0 || v.excludedInternal > 0) && (
                  <span style={{ color: '#fbbf24' }}>
                    {' '}· contaminados: {v.revived} revivido(s), {v.extended} estendido(s)
                    {v.excludedInternal > 0 && ` · ${v.excludedInternal} interna(s) fora`}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] mt-3 leading-relaxed" style={{ color: '#6e6e73' }}>
            <strong>Maturado</strong> = cadastro + os dias da variante já passaram (com folga para o
            cron). Não é <code>trial_status</code> (a extensão e o estorno devolvem uma linha
            rebaixada para <code>active</code>) e <strong>não é <code>trial_ends_at</code></strong>:
            a extensão automática REAGENDA essa coluna para <code>agora + 3 dias</code>, o que faria
            uma linha já maturada voltar a contar como &quot;correndo&quot; — e ela só alcança o braço
            que já expirou alguém.{' '}
            <strong>Contaminados ficam DENTRO do denominador</strong>, marcados: ser revivido ou
            estendido é consequência do que aconteceu depois do sorteio, e tirar linhas por isso
            escolheria a amostra pelo desfecho. A <strong>extensão de +3 dias muda a própria
            variável sob teste</strong> — todo estendido do braço 3d passou a ser, na prática, 6d.
          </p>
        </section>
      )}

      <section className="rounded-2xl overflow-hidden" style={CARD}>
        <div className="px-4 py-3 text-sm font-black" style={{ color: '#f5f5f7', borderBottom: '1px solid #2a2a2d' }}>
          Repeat fingerprints (2+ signups)
        </div>
        {data.repeatOffenders.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm" style={{ color: '#86868b' }}>
            Nothing repeated yet.
          </div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: '#86868b', textAlign: 'left' }}>
                <Th>fingerprint</Th>
                <Th>trials granted</Th>
                <Th>blocked</Th>
                <Th>last seen</Th>
              </tr>
            </thead>
            <tbody>
              {data.repeatOffenders.map((r) => (
                <tr key={r.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <Td><code style={{ color: '#86868b' }}>{r.label}…</code></Td>
                  <Td>{r.activated}</Td>
                  <Td style={{ color: r.blocked > 0 ? '#f87171' : '#f5f5f7' }}>{r.blocked}</Td>
                  <Td>{fmtDate(r.lastSeen)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-[11px] mt-3" style={{ color: '#6e6e73' }}>
        Fingerprint = SHA-256(salt · IP · user-agent · accept-language). Raw IPs are never stored, here
        or in logs — only the 12-char prefix shown above. Every failure mode of the check (missing salt,
        missing IP, missing table, query error) GRANTS the trial: &quot;check failed&quot; above counts
        those, and a number climbing there means the guard is effectively off, not that abuse is down.
      </p>
    </Shell>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl p-4" style={CARD}>
      <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#86868b' }}>{label}</div>
      <div className="text-2xl font-black" style={{ color: accent }}>{value.toLocaleString('en-US')}</div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</th>
}

function Td({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return <td style={{ padding: '10px 14px', color: '#f5f5f7', whiteSpace: 'nowrap', ...style }}>{children}</td>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1400px] mx-auto">{children}</div>
    </div>
  )
}
