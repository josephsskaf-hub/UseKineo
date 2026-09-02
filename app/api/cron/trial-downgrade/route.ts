import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  REVERSE_TRIAL_ENABLED,
  TRIAL_CREDIT_CAP,
  TRIAL_TERMINAL_STATUSES,
  downgradeExpiredTrial,
  trialDowngradeSkipReason,
  trialNeedsDowngrade,
  type TrialDowngradeOutcome,
  type TrialProfileFields,
} from '@/lib/reverseTrial'

// trial-downgrade — REVERSE TRIAL FASE 2, ITEM 2 (06/08/2026).
// [KINEO-TRIAL-DOWNGRADE-2026-08-06]
//
// O QUE ESTE CRON É, E O QUE ELE NÃO É.
// Ele NÃO decide entitlement: isso já é passivo desde a fase 1
// (isTrialActive() volta false na primeira request depois do vencimento, sem
// esperar cron nenhum). O que ele faz é a parte que NENHUMA request faz
// sozinha: revogar o saldo remanescente dos créditos concedidos e registrar o
// instante do downgrade. Sem ele, ligar a flag entrega 40 créditos VITALÍCIOS
// por endereço de e-mail — a dívida #1 declarada no commit d1133c7.
//
// POR QUE DE HORA EM HORA E NÃO "MEIA-NOITE" (desvio consciente da ordem).
// A ordem do fundador diz "cron downgrade meia-noite". Só que o trial não vence
// à meia-noite de ninguém: trial_ends_at = instante do signup + 3 ou 7 dias, e
// os signups chegam nas 24 horas do dia. Um job diário deixaria, em média, 12h
// (pior caso 24h) de crédito revogável parado na conta de quem já saiu do
// trial — e é exatamente esse saldo que faz a pessoa não precisar assinar.
// De hora em hora, a exposição cai para ≤1h. O efeito para o usuário é o mesmo
// que o fundador pediu (ele perde o que não usou), com uma janela 24× menor.
//
// FLAG: este cron NÃO é gateado por KINEO_REVERSE_TRIAL_ENABLED, e isso é
// deliberado. Com a flag OFF não existe nenhuma linha com trial_status
// preenchido, então a query devolve 0 e o job é um no-op. Gatear seria pior nos
// dois sentidos: (a) desligar a flag como rollback deixaria crédito concedido
// órfão para sempre, e (b) a coorte tem que ser independente de flag para que
// desligá-la não signifique "revogar o crédito de todos os trials vivos" — ver
// trialNeedsDowngrade() em lib/reverseTrial.ts.
//
// Guarda-corpos: CRON_SECRET fail-closed · teto por rodada · uma escrita
// atômica por usuário (CAS em trial_status + video_credits) · idempotente por
// construção ('downgraded'/'converted' saem da coorte).

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'
export const maxDuration = 60

// Teto explícito (padrão dos outros crons). Cada linha custa ~3 round-trips
// (releitura + UPDATE com CAS + evento de auditoria), então 100 cabe folgado
// nos 60s de maxDuration; 200 não cabia com margem. Volume esperado por hora é
// de unidades — o teto só existe para a retomada depois de job parado, e a
// ordenação por trial_ends_at ASC garante que a fila drene pelos mais antigos.
const MAX_PER_RUN = 100

/**
 * Página lida do banco ANTES do filtro — deliberadamente muito maior que
 * MAX_PER_RUN, e a 2ª passada da revisão é a razão. Com os dois iguais, a
 * página (ordenada por trial_ends_at ASC) e o filtro brigavam: um trial que
 * estourou o TETO no dia 1 tem trial_ends_at no FUTURO, então ele ordena por
 * ÚLTIMO — e com >100 trials abertos ele cairia fora da página e só seria
 * processado quando o relógio dele vencesse, dias depois. Justo a pessoa que
 * consumiu os 40 créditos em um dia, isto é, o lead mais quente do funil, seria
 * a última a receber o e-mail de resgate. O teto que importa é o de ESCRITAS
 * (MAX_PER_RUN); ler 1000 linhas de 4 colunas de uma tabela com ~950 perfis é
 * de graça.
 */
const COHORT_PAGE = 1000

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('[trial-downgrade] service-role env missing')
    return NextResponse.json({ error: 'not_configured' }, { status: 500 })
  }
  // KINEO-DOWNGRADE-CRON-FIX-2026-08-07 — `cache: 'no-store'` EXPLÍCITO.
  // A query da coorte é a única deste projeto que é BYTE A BYTE IGUAL em toda
  // rodada (ela não interpola `now` — de propósito, ver o bloco abaixo). Dentro
  // do App Router quem executa `fetch` é a versão instrumentada do Next, e uma
  // GET idêntica sem `no-store` é a única forma de um job de hora em hora
  // continuar lendo a resposta da PRIMEIRA rodada — que, nas horas em que
  // nenhum trial existia, era `[]`. Todos os outros crons escapam por acidente:
  // eles carregam um timestamp na URL, então a chave nunca repete. Isto custa
  // nada e fecha a hipótese; sem isto, ela não seria falsificável de fora.
  const db = createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  })

  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  // COORTE — a primeira versão desta query escrevia a regra de vencimento em
  // SQL (`.or('trial_ends_at.lte.<iso>, trial_credits_used.gte.40')`). A
  // revisão adversarial derrubou por dois motivos independentes:
  //   · REGRA DUPLICADA. A condição passaria a existir em dois idiomas (SQL
  //     aqui, TypeScript em trialNeedsDowngrade) e envelheceria em um só. É
  //     literalmente a lição de 05/08 — "se o gatilho e o cron contam coisas
  //     diferentes, o cron está errado" — a caminho de acontecer de novo.
  //   · SINTAXE FRÁGIL. O filtro `or()` do PostgREST separa `coluna.op.valor`
  //     por ponto e os itens por vírgula, e o valor interpolado é um timestamp
  //     ISO cheio de pontuação. Um erro de parse aqui não estoura: devolve a
  //     coorte ERRADA em silêncio, e a coorte errada revoga dinheiro.
  // Sai mais barato buscar os trials ABERTOS (conjunto pequeno por natureza —
  // só existe trial aberto de quem se cadastrou nos últimos 3/7 dias) e aplicar
  // o MESMO predicado em memória. Ordenado por vencimento ASC, com nulos
  // primeiro: os mais atrasados entram na frente, e quem ainda não venceu fica
  // no fim da fila (e é descartado pelo filtro).
  // KINEO-DOWNGRADE-CRON-FIX-2026-08-07 — A COORTE NÃO OPINA MAIS SOBRE
  // ELEGIBILIDADE. A versão anterior repetia a lista de status em SQL
  // (`.in('trial_status', ['active','expired'])`) e de novo em TypeScript
  // dentro de `trialNeedsDowngrade`. As duas cópias concordavam no dia em que
  // foram escritas — e essa é justamente a forma como este par de bugs nasce:
  // na hora em que uma das duas mudar, o cron passa a devolver 200 sem
  // processar a pessoa certa, exatamente como nas rodadas de 01:55:17Z e
  // 02:55:07Z de 07/08.
  //
  // Agora o SQL faz UMA pergunta que não pode envelhecer: "esta linha já teve
  // trial alguma vez?" (`trial_status is not null`). Tudo o mais — status
  // aberto, relógio, teto — é decidido por `trialNeedsDowngrade`, o JUIZ ÚNICO,
  // e depois RE-decidido pela releitura dentro de `downgradeExpiredTrial`. A
  // coorte é deliberadamente LARGA: ela pode trazer 'downgraded' e 'converted'
  // (terminais) e linhas ainda vivas; todas caem no filtro, e o custo é ler uma
  // coluna a mais de um conjunto que hoje tem 1 linha em 963 perfis. Coorte
  // larga custa leitura; coorte estreita custa dinheiro que ninguém vê sumir.
  // A ÚNICA coisa que o SQL ainda exclui são os estados TERMINais — e mesmo
  // essa lista NÃO é redigitada aqui: ela vem de `TRIAL_TERMINAL_STATUSES`, a
  // mesma constante que `trialNeedsDowngrade` usa. Não é uma segunda cópia da
  // regra, é a MESMA fonte. Sem esse corte, a coorte cresceria para sempre
  // (todo trial que já existiu) e, passados 1000 deles, linhas terminais
  // antigas empurrariam para fora da página justo quem acabou de vencer.
  const cohortSelect = 'id, trial_status, trial_ends_at, trial_credits_used'
  const terminalFilter = `(${TRIAL_TERMINAL_STATUSES.join(',')})`
  const readCohort = () =>
    db
      .from('profiles')
      .select(cohortSelect)
      .not('trial_status', 'is', null)
      .not('trial_status', 'in', terminalFilter)
      .order('trial_ends_at', { ascending: true, nullsFirst: true })
      .limit(COHORT_PAGE)

  const { data: openTrials, error } = await readCohort()

  if (error) {
    console.error('[trial-downgrade] cohort query failed:', error.message)
    return NextResponse.json({ error: 'cohort_query_failed' }, { status: 500 })
  }

  // CONTAGEM INDEPENDENTE, no servidor do banco, com o MESMO predicado da
  // coorte. Ela existe por um motivo só: em 07/08 a rota devolveu 200 com zero
  // processados enquanto o banco tinha a linha elegível, e NÃO HAVIA COMO SABER
  // de fora se a leitura tinha voltado vazia ou se o filtro tinha descartado.
  // Uma leitura silenciosamente vazia (cache, RLS, chave errada, réplica) passa
  // a ser um 500 barulhento em vez de um 200 mudo — a diferença entre um bug de
  // 3 horas sem causa raiz e um alarme.
  const { count: cohortCount, error: countErr } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .not('trial_status', 'is', null)
    .not('trial_status', 'in', terminalFilter)

  let open = openTrials ?? []
  if (countErr) {
    console.warn('[trial-downgrade] cohort cross-check failed:', countErr.message)
  } else if ((cohortCount ?? 0) > 0 && open.length === 0) {
    // UMA releitura antes de gritar. A contagem roda DEPOIS da leitura, então
    // um trial ativado nesse intervalo produziria count=1/rows=0 legítimo —
    // alarme falso de hora em hora corrói a confiança no alarme verdadeiro.
    const retry = await readCohort()
    open = retry.data ?? []
    if (!retry.error && open.length === 0) {
      console.error(
        `[trial-downgrade] COHORT READ MISMATCH: count=${cohortCount} rows=0 em 2 leituras — leitura vazia com banco cheio`,
      )
      return NextResponse.json(
        { error: 'cohort_read_mismatch', cohort_count: cohortCount, rows: 0 },
        { status: 500 },
      )
    }
  }

  // Agregado dos DESCARTES: sem isto, "0 processados" não distingue "não havia
  // ninguém" de "havia e o filtro comeu".
  const skipReasons: Record<string, number> = {}
  const due = open
    .filter((row) => {
      const reason = trialDowngradeSkipReason(row as TrialProfileFields, now)
      if (reason) {
        skipReasons[reason] = (skipReasons[reason] ?? 0) + 1
        return false
      }
      return trialNeedsDowngrade(row as TrialProfileFields, now)
    })
    .map((r) => (r as { id: string }).id)
    .filter(Boolean)
  // O teto é de ESCRITAS, aplicado DEPOIS do filtro. A fila que sobrar entra na
  // rodada seguinte (1h), e o entitlement dessas pessoas já está correto desde
  // o vencimento — quem espera é a revogação do saldo, não o direito de uso.
  const ids = due.slice(0, MAX_PER_RUN)
  const tally: Record<string, number> = {}
  let creditsRevoked = 0
  let downgraded = 0
  let converted = 0

  for (const id of ids) {
    const outcome: TrialDowngradeOutcome = await downgradeExpiredTrial(db, id, now)
    const key = outcome.action === 'skipped' ? `skipped_${outcome.reason}` : outcome.action
    tally[key] = (tally[key] ?? 0) + 1
    creditsRevoked += outcome.creditsRevoked
    if (outcome.action === 'downgraded') downgraded += 1
    if (outcome.action === 'converted') converted += 1
  }

  const payload = {
    ok: true,
    flag_enabled: REVERSE_TRIAL_ENABLED,
    // Todo número vem com o denominador (regra dos 30/07): `processed` sozinho
    // não distingue "não havia ninguém" de "a fila estourou o teto".
    // `cohort_rows` = linhas lidas (TODAS as que já tiveram trial).
    // `cohort_count` = a mesma pergunta respondida pelo banco, independente.
    // Divergência entre as duas é o alarme; igualdade é a prova de leitura sã.
    cohort_rows: open.length,
    cohort_count: countErr ? null : (cohortCount ?? 0),
    open_trials: open.length - (skipReasons.terminal ?? 0),
    due: due.length,
    processed: ids.length,
    deferred: due.length - ids.length,
    page_full: open.length >= COHORT_PAGE,
    downgraded,
    converted,
    credits_revoked: creditsRevoked,
    // Por que cada linha da coorte NÃO foi processada, agregado. Sem PII.
    skip_reasons: skipReasons,
    tally,
    cap: TRIAL_CREDIT_CAP,
    ran_at: nowIso,
  }
  // SEMPRE loga. A guarda `if (ids.length > 0)` que existia aqui é o motivo de
  // as rodadas de 01:55:17Z e 02:55:07Z de 07/08 não terem deixado UMA linha de
  // rastro: o cron era observável exatamente quando funcionava, e mudo
  // exatamente quando falhava. Um job de dinheiro que roda 24×/dia e não diz o
  // que viu é um job que ninguém pode auditar. Uma linha por hora é barato.
  console.log('[trial-downgrade]', JSON.stringify(payload))
  return NextResponse.json(payload)
}
