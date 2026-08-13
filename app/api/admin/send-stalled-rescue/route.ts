// Stalled-render rescue blast (admin- or cron-gated) — idempotent + batched.
//
// KINEO-STALLED-RESCUE-2026-07-26 — a maior coorte morna do banco que NUNCA
// teve campanha: quem começou uma geração de vídeo e nunca completou nenhuma.
//
// POR QUE NENHUMA ROTA EXISTENTE ALCANÇA ESSA GENTE:
//   - app/api/cron/send-video-rescue exige >=1 linha em `videos` e faz
//     `continue` quando não há (route.ts:172). 111 dos 112 têm ZERO linhas em
//     `videos`, então a rota pula todos eles, um por um, todo dia.
//   - 103 deles receberam o activation nudge, que é o email ERRADO: ele parte
//     do princípio de que a pessoa nunca tentou. Ela tentou. Falhou.
//     [11/08: já são **216 de 231**, 93%. Este número é o que derrubou a
//      primeira reescrita da copy — ver docblock de `buildEmailText`, item 1.]
//   - Nenhuma das 11 campanhas do repo tem como chave "started but not
//     completed" — todas as coortes são por pagamento, checkout ou ativação.
//
// A auditoria de telemetria mostrou que ~42% dos renders iniciados morrem sem
// emitir evento de falha: essas pessoas ficaram olhando um spinner que nunca
// terminou e nunca receberam erro. A queixa delas é real e tem nome. O email
// reconhece isso e NÃO vende plano — quem nunca viu o produto funcionar não
// tem por que receber uma oferta. O único objetivo é um vídeo pronto.
//
// ESTA PREMISSA CONTINUA VALENDO DEPOIS DA RAMIFICAÇÃO DE 11/08, e ela quase
// não valeu: a primeira versão do parágrafo de trial era escassez pura ("seus
// créditos morrem em X"), o que, dito a quem nunca conseguiu tirar um vídeo,
// lê como "o produto quebrou na sua mão e agora o SEU relógio está correndo".
// A revisão adversarial apontou que isso tornava falsas as duas frases acima
// sobre o propósito do arquivo. O bloco final informa o saldo e devolve a
// responsabilidade para a casa ("that's on me, not on you"). Nenhuma versão
// pede dinheiro, nenhuma cita preço ou plano.
//
// ─────────────────────────────────────────────────────────────────────────────
// KINEO-STALLED-RESCUE-ORPHAN-2026-08-11 — ESTA ROTA NUNCA RODOU. 16 DIAS.
//
// Medido em 11/08, não herdado de doc: `stalled_rescue_emailed = true` em
// **0 de 1.080** perfis. A campanha existe desde 26/07, está correta no que se
// propôs a fazer, e nunca mandou um único e-mail. Três causas, todas de
// ORQUESTRAÇÃO, nenhuma de conteúdo:
//
//   1. O bloco abaixo dizia "a coluna AINDA NÃO EXISTE em produção". Ela existe
//      — conferido em `information_schema`. O preflight, que era a trava certa,
//      virou um aviso que ninguém mais leu, e a rota ficou marcada como inerte
//      num comentário que envelheceu.
//   2. Ela não está em `vercel.json`. Nenhum cron a chama. É GET admin-gated,
//      e ninguém abriu a URL.
//   3. Ela não entrou em `PROFILE_TIMESTAMP_COLUMNS` de lib/lifecycle/suppression.ts
//      — cuja própria documentação diz "job novo que manda e-mail entra aqui no
//      mesmo commit em que nasce". Se tivesse rodado, teria mandado e-mail em
//      cima de quem já recebia outro job na mesma hora.
//
// A COORTE HOJE É MAIOR DO QUE ERA: **231 pessoas** (eram 112), zero opt-outs,
// zero já contactadas. **37 estão em trial ATIVO com 1.469 créditos parados**,
// 16 delas perdem o trial em 72h. Elas pagaram com o cadastro, receberam 40
// créditos, tentaram usar, quebraram — e a casa nunca abriu a boca.
//
// O que este commit muda, e só isto:
//   · entra na supressão cruzada de 24h (direção de ENTRADA e de SAÍDA);
//   · não disputa mais pessoa com send-recovery (13 estavam nos dois);
//   · a copy RAMIFICA: quem está em trial ativo é informado do saldo que ainda
//     tem e de QUANTO TEMPO falta (duração, nunca data — ver `trialEndsPhrase`);
//     o resto recebe o texto original;
//   · sai a única promessa sem mecanismo do texto (ver o docblock de
//     `buildEmailText`, item 2);
//   · a lista interna passa a ser a fonte única, não a quarta cópia local.
//
// O que este commit NÃO faz, de propósito: **não registra cron em vercel.json**.
// Campanha que nunca saiu uma vez não estreia em automático para 231 pessoas na
// voz pessoal do fundador. O primeiro lote é uma URL de um clique, no relatório.
//
// EVENTOS DUPLICADOS: este banco dispara `generate_started` E
// `video_generation_started` juntos, e `generate_completed` E
// `video_generation_completed` juntos. Contar sem deduplicar infla tudo —
// por isso a coorte é montada com IN (...) + Set de user_id (equivalente ao
// bool_or do SQL), nunca contando linhas de evento.
//
// MODES (admin- ou cron-gated, GET):
//   (no params)            → DRY RUN: quem receberia (contagem + amostra).
//   ?confirm=SEND&limit=N  → envia para os próximos N não-flagados (default 50),
//                            pacing entre envios, marcando a flag só no sucesso.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import { TRIAL_CREDIT_CAP } from '@/lib/reverseTrial'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

// hello@ = prospecção/resgate de leads (support@ is reserved for support).
const FROM_EMAIL = 'Joseph at Kineo <hello@usekineo.com>'
const REPLY_TO = 'hello@usekineo.com'

// Subject escolhido entre duas variantes (a outra: "Your Kineo video didn't
// finish rendering"). Esta nomeia a queixa nas palavras da PESSOA ("never came
// out") em vez das palavras do sistema ("didn't finish rendering") e ainda
// promete movimento. A variante descartada lê como notificação automática —
// exatamente o tipo de email que essa coorte já aprendeu a ignorar.
const SUBJECT = "That video you started never came out — let's fix it"

// KINEO-STALLED-RESCUE-2026-07-26 — coluna de idempotência desta campanha.
//
// ✅ ATUALIZADO EM 11/08: A COLUNA EXISTE EM PRODUÇÃO. Conferido em
// `information_schema.columns` (boolean, not null, default false, 1.080 linhas,
// **0 em true**). O texto anterior — "AINDA NÃO EXISTE… esta rota é INERTE" —
// era verdade em 26/07 e envelheceu sem que ninguém revisitasse. É o mesmo modo
// de falha que o PROMPT-DIARIO registra como "comentário com justificativa
// envelhece e vira bug", e neste caso o custo foi específico: o comentário
// descrevia a rota como inerte, então a rota ficou parada mesmo depois de a
// única coisa que a travava ter sido resolvida.
//
// O preflight abaixo CONTINUA valendo e não muda: ele confirma a coluna ANTES
// de qualquer envio e devolve 500 com o SQL exato. Falhar alto é obrigatório
// aqui — sem a coluna não há como marcar quem já recebeu, e um segundo run
// mandaria o mesmo e-mail de novo para as mesmas pessoas (hoje, 231).
const FLAG_COLUMN = 'stalled_rescue_emailed'
// AS DUAS colunas, porque o preflight sonda as duas. A 2ª revisão adversarial
// pegou o laço: em ambiente novo quem falta é a DATADA, o operador rodava só o
// ALTER do boolean (no-op, a coluna já existe), tentava de novo e tomava o
// mesmo 500 para sempre — instrução apontando a coluna errada.
const FLAG_MIGRATION_SQL = [
  'alter table public.profiles add column if not exists stalled_rescue_emailed boolean not null default false;',
  'alter table public.profiles add column if not exists stalled_rescue_sent_at timestamptz;',
].join('\n')

// Eventos de início e de conclusão, nas DUAS grafias que este banco dispara.
const START_EVENTS = ['generate_started', 'video_generation_started']
const COMPLETE_EVENTS = ['generate_completed', 'video_generation_completed']

const RAMON = 'ramonwilliamson@gmail.com'

const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com', 'gmeenramy.com', 'kinws.com', 'doefy.com', 'x-box.in',
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', 'tempmail.com',
  '10minutemail.com', 'trashmail.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'mohmal.com', 'temp-mail.org', 'fakeinbox.com',
])

// KINEO-STALLED-RESCUE-ORPHAN-2026-08-11 — esta era a QUARTA cópia local da
// lista de contas internas. `lib/internalAccounts.ts` é a fonte única e passa a
// mandar; o que sobra aqui é estritamente o que a fonte única AINDA não cobre,
// declarado como superset (errar excluindo alguém de mais é barato; mandar
// e-mail de resgate para a irmã do fundador ou para o revisor do TAAFT, não).
//
// A regra que isto instancia está no PROMPT-DIARIO: "cópia local de lista que
// tem fonte única apodrece em silêncio" — foi exatamente o que aconteceu com o
// `isTestEmail()` do cron irmão, que não conhecia a irmã do fundador.
//
// ⚠️ LACUNA REGISTRADA, NÃO CORRIGIDA AQUI: `@usekineo.com` (nosso próprio
// domínio) NÃO está em `INTERNAL_LIKE_PATTERNS`. Só esta cópia local o filtra.
// Mexer na fonte única muda a coorte de TODA superfície de métrica do produto
// de uma vez, e isso é uma medição própria, não um efeito colateral de uma
// campanha de e-mail. Fica coberto aqui embaixo e anotado na sprint.
function isInternal(email: string): boolean {
  if (isInternalEmail(email)) return true
  if (email === RAMON) return true
  if (ADMIN_EMAILS.has(email)) return true
  if (email.startsWith('joseph+') || email.startsWith('joseph-')) return true
  const dom = email.split('@')[1] ?? ''
  if (dom === 'usekineo.com') return true
  return false
}

// Filtro de EXCLUSÃO: nome a mais aqui só protege mais gente.
//
// ⚠️ O COMENTÁRIO ANTERIOR DIZIA QUE `creator*`/`studio*` "são os planos vivos
// do reverse trial". FALSO, e a revisão adversarial o derrubou contra o
// invariante central do módulo: `lib/reverseTrial.ts:549` — "maybeActivate-
// ReverseTrial NÃO toca em `plan` nem em `has_paid`… uma conta em trial ativo
// é, para o banco, plan='free' has_paid=false". Conferido no banco em 11/08:
// das 231 pessoas desta coorte, **0 têm plan diferente de 'free'**.
//
// Os nomes ficam porque são tiers da Stripe e custam nada, mas a proteção real
// que eles dão é só contra uma linha com `has_paid` desatualizado. Se algum dia
// alguém "consertar" a coluna `plan` para escrever 'creator_trial', esta lista
// de exclusão passa a apagar exatamente o público do ramo de trial da copy
// acima — as duas metades deste arquivo entrariam em guerra. Fica registrado.
const PAID_PLANS = new Set([
  'starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial',
  'creator', 'creator_trial', 'studio', 'studio_trial',
])

function isValidExternalEmail(email: string): boolean {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return false
  if (email.includes('example.com') || email.startsWith('test@') || email.startsWith('smoketest')) return false
  const dom = email.split('@')[1] ?? ''
  if (DISPOSABLE_DOMAINS.has(dom)) return false
  if (isInternal(email)) return false
  return true
}

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — nenhum link de email aponta para
// /api/stripe/checkout: scanners corporativos (Outlook Safe Links, Proofpoint,
// Mimecast) fazem GET em todo link antes do humano ver. Aqui o destino é
// /generate, que é página comum e não tem efeito colateral — e, de qualquer
// forma, esta campanha não pede dinheiro.
const CTA_URL = 'https://usekineo.com/generate?intent_campaign=stalled_rescue'

/**
 * Contexto de trial do destinatário, quando existe. Os dois campos são LIDOS
 * DO BANCO no momento do envio — nunca constantes, nunca herdados de doc.
 */
type TrialContext = { creditsLeft: number; endsAt: Date }

/**
 * KINEO-STALLED-RESCUE-ORPHAN-2026-08-11 — duas frases desta copy foram
 * reescritas, e as duas pelo mesmo motivo: o PROMPT-DIARIO manda que toda
 * afirmação factual sobre o que o usuário FEZ seja conferida contra o banco,
 * ou reescrita como afirmação sobre a REGRA.
 *
 * 1. SAIU "you got no error and no explanation".
 *    A auditoria mediu ~42% dos renders morrendo sem evento de falha. Para os
 *    outros ~58% a frase é FALSA — eles viram erro.
 *
 *    ⚠️ A PRIMEIRA TENTATIVA DE CONSERTO TAMBÉM ERA FALSA, e a revisão
 *    adversarial a derrubou com o número na mão. Eu havia escrito "we never
 *    once wrote to you about it", justificando que `stalled_rescue_emailed =
 *    false` é filtro da query. Esse filtro só prova que nunca mandamos ESTA
 *    campanha. Medido em 11/08: **216 das 231 pessoas (93%) já receberam o
 *    activation nudge**, com carimbo real (acima do piso de 2020, ou seja,
 *    envio e não pulo). Para 93% da coorte a frase era mentira conferível na
 *    própria caixa de entrada — e o header deste arquivo já dizia isso desde
 *    26/07, na linha "103 deles receberam o activation nudge, que é o email
 *    ERRADO". A frase falsa foi substituída dentro do mesmo bloco que existe
 *    para impedir frases falsas.
 *
 *    ⚠️⚠️ E A SEGUNDA REESCRITA TAMBÉM ERA FALSA. A 2ª revisão adversarial
 *    derrubou "nothing we sent you afterwards even acknowledged that" com um
 *    job que a primeira análise não enumerou: `cron/send-blackout-winback`
 *    manda, em letras próprias, "Recently you tried to generate a video and it
 *    failed… The failure was ours." **33 pessoas desta coorte receberam esse
 *    e-mail em 01/08**, dez dias antes deste envio. É o e-mail mais
 *    reconhecedor do repositório — alegar silêncio institucional para quem
 *    pode rolar a própria caixa e achar o pedido de desculpas da casa é pior
 *    que o defeito original.
 *
 *    A sobreposição não era azar: as vítimas do apagão são gente que COMEÇOU e
 *    DEU ERRO, que é literalmente o pool desta coorte. A lição que fica é a
 *    forma da pergunta: enumerar "quem mais escreveu para esta gente?" é
 *    varrer TODOS os jobs, não o primeiro que vem à cabeça.
 *
 *    O texto que ficou não fala mais sobre o que mandamos ou deixamos de
 *    mandar. Fala sobre o RESULTADO: "nothing we've sent you since has
 *    actually put a finished video in your hands". Isso é verdadeiro para
 *    100% da coorte por construção — a coorte é definida por NÃO ter evento
 *    de conclusão. Terceira versão, e a primeira que não depende de enumerar
 *    corretamente um conjunto de jobs que muda toda semana.
 *
 * 2. SAIU "reply and I'll build the video by hand and send you the file myself".
 *    Era a única promessa do texto sem MECANISMO de entrega. São 231 pessoas e
 *    ninguém do outro lado com a agenda de produzir vídeo à mão — o fundador
 *    lê um relatório por dia. Prometer trabalho manual de volume desconhecido
 *    em nome dele é escrever um cheque que a operação não cobre; e a regra da
 *    casa é que prometer benefício exige achar o mecanismo ANTES do Send.
 *    O convite a responder FICA (o `reply_to` é uma caixa real e monitorada) —
 *    o que sai é o compromisso de mão de obra.
 */
function buildEmailText(trial: TrialContext | null): string {
  const trialBlock = trial
    ? `\nOne more thing, and it's why I'm writing today: your Kineo trial is still open, and it still has ${trial.creditsLeft} credits on it. They stop working when the trial ends, ${trialEndsPhrase(trial.endsAt)}. I'd rather you spend them than watch them expire — and if the generator gets in your way again, that's on me, not on you.\n`
    : ''

  return `Hey — Joseph here, founder of Kineo.

You started a video with Kineo and never got one out. It should have worked. It didn't — and nothing we've sent you since has actually put a finished video in your hands. That's the part that bothers me most.
${trialBlock}
I'd like to get a finished video into your hands. One click and you're back at the generator:

${CTA_URL}

If it stalls on you again, hit reply and tell me what you were trying to make. That reply lands with a person, not a bot — a stall we can name is a stall we can fix.

— Joseph, founder
Kineo · https://usekineo.com`
}

/**
 * Prazo do trial como DURAÇÃO ("in about 2 days"), nunca como data.
 *
 * ⚠️ A PRIMEIRA VERSÃO IMPRIMIA A DATA EM UTC ("August 12") e o docblock dela
 * afirmava que o erro caía "do lado seguro". A revisão adversarial mostrou que
 * cai do lado INSEGURO, e a medição confirmou o tamanho: **18 dos 37 trials
 * desta coorte (49%) vencem antes do meio-dia UTC**. Todo fuso americano está
 * ATRÁS de UTC (−4 a −10) e a coorte é majoritariamente americana, então um
 * `trial_ends_at` de 12/08 03:00Z imprime "August 12" para alguém que, no
 * relógio dele, perde o trial às 20h do dia 11. O e-mail prometia um dia
 * inteiro que a pessoa não tinha — o erro exatamente ao contrário do que uma
 * frase de urgência pode se permitir.
 *
 * Duração não tem fuso: "in about 2 days" é a mesma verdade em qualquer lugar
 * do mundo. E o arredondamento é para BAIXO (floor), então a frase sempre
 * concede menos tempo do que existe.
 *
 * A extensão automática de trial só REESCREVE `trial_ends_at` para frente,
 * nunca para trás — se ela disparar depois do envio, teremos subestimado o
 * prazo de novo, que continua sendo o lado certo de errar.
 */
function trialEndsPhrase(endsAt: Date): string {
  const hours = (endsAt.getTime() - Date.now()) / (60 * 60 * 1000)
  if (hours < 24) return 'in less than 24 hours'
  const days = Math.max(1, Math.floor(hours / 24))
  return days === 1 ? 'in about a day' : `in about ${days} days`
}

// KINEO-UNSUBSCRIBE-2026-07-26 — recebe userId para montar o rodapé com o link
// de descadastro (CAN-SPAM §7704(a)(3)/(a)(5)).
function emailHtml(userId: string, trial: TrialContext | null): string {
  const trialBlock = trial
    ? `
  <p style="margin:18px 0;padding:14px 16px;background:#f1f5f9;border-left:3px solid #2997ff;border-radius:6px;font-size:15px">
    One more thing, and it's why I'm writing today: <b>your Kineo trial is still open, and it still has ${trial.creditsLeft} credits on it.</b>
    They stop working when the trial ends, ${trialEndsPhrase(trial.endsAt)}.
    I'd rather you spend them than watch them expire — and if the generator gets in your way again, that's on me, not on you.
  </p>`
    : ''

  return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6">
  <p>Hey — Joseph here, founder of <b>Kineo</b> 🎬</p>
  <p>You started a video with Kineo and never got one out. It should have worked. It didn't — and nothing we've sent you since has actually put a finished video in your hands. That's the part that bothers me most.</p>${trialBlock}
  <p style="font-size:18px;margin:18px 0"><b>I'd like to get a finished video into your hands.</b> One click and you're back at the generator.</p>
  <p style="margin:26px 0">
    <a href="${CTA_URL}" style="background:#2997ff;color:#ffffff;padding:13px 24px;border-radius:10px;text-decoration:none;font-weight:bold">Make my video &rarr;</a>
  </p>
  <p style="color:#475569;font-size:14px">If it stalls on you again, hit reply and tell me what you were trying to make. That reply lands with a person, not a bot — a stall we can name is a stall we can fix.</p>
  <p>— Joseph, founder<br/>Kineo · https://usekineo.com</p>
</div>
${emailFooterHtml(userId)}`
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

type AdminDb = ReturnType<typeof adminClient>

/**
 * Coleta TODOS os user_id distintos que dispararam qualquer um dos `names`.
 *
 * Pagina explicitamente com .range(): o PostgREST corta em 1000 linhas por
 * padrão e hoje existem ~2.4k linhas só de evento de início. Sem paginação a
 * coorte sairia silenciosamente truncada — o pior tipo de bug numa campanha,
 * porque o número parece plausível.
 */
async function distinctUserIdsForEvents(
  admin: AdminDb,
  names: string[],
): Promise<{ ids: Set<string>; error?: string }> {
  const ids = new Set<string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('events')
      .select('user_id')
      .in('name', names)
      .not('user_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) return { ids, error: error.message }
    const rows = (data ?? []) as Array<{ user_id: string | null }>
    for (const r of rows) if (r.user_id) ids.add(r.user_id)
    if (rows.length < PAGE) break
    // Trava de segurança: nunca varrer indefinidamente se a tabela crescer.
    if (from > 200_000) break
  }
  return { ids }
}

/** .in() com lista grande estoura o tamanho da URL — busca em blocos. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function GET(req: NextRequest) {
  try {
    // Auth: cookie de admin OU `Authorization: Bearer ${CRON_SECRET}` para a
    // chamada server-to-server do cron diário. Só honra o bearer se o segredo
    // estiver realmente configurado.
    const cronSecret = process.env.CRON_SECRET
    const isCronCall =
      !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`

    if (!isCronCall) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const email = (user?.email ?? '').toLowerCase()
      if (!user || !ADMIN_EMAILS.has(email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Service credentials not configured' }, { status: 500 })
    }

    const admin = adminClient()

    // 0) PREFLIGHT DA COLUNA DE IDEMPOTÊNCIA — antes de qualquer coisa.
    // Sem a coluna não existe memória de envio, e um segundo run reenviaria
    // para todo mundo. Falha alto, com o SQL exato, e não manda nada.
    {
      const { error: flagErr } = await admin
        .from('profiles')
        .select(`id, ${FLAG_COLUMN}, stalled_rescue_sent_at`)
        .limit(1)
      if (flagErr) {
        console.error('[stalled-rescue] idempotency column missing:', flagErr.message)
        return NextResponse.json(
          {
            error: `Idempotency columns profiles.${FLAG_COLUMN} / profiles.stalled_rescue_sent_at: at least one is missing — refusing to send.`,
            detail: flagErr.message,
            fix_sql: FLAG_MIGRATION_SQL,
            note: 'Neither column may be missing: the boolean is the lifetime idempotency flag and the timestamp is what the 24h cross-suppression reads. Without it there is no record of who was already emailed, and a second run would re-send to the entire cohort.',
          },
          { status: 500 },
        )
      }
    }

    // 1) Quem COMEÇOU (dedupe pelas duas grafias do evento).
    const started = await distinctUserIdsForEvents(admin, START_EVENTS)
    if (started.error) {
      return NextResponse.json({ error: `start events query failed: ${started.error}` }, { status: 500 })
    }
    // 2) Quem COMPLETOU alguma vez (idem).
    const completed = await distinctUserIdsForEvents(admin, COMPLETE_EVENTS)
    if (completed.error) {
      return NextResponse.json({ error: `completion events query failed: ${completed.error}` }, { status: 500 })
    }

    // 3) Começou e NUNCA completou.
    const stalledIds = Array.from(started.ids).filter((id) => !completed.ids.has(id))
    if (stalledIds.length === 0) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        remaining_unemailed: 0,
        note: 'no users with a start event and no completion event',
      })
    }

    type Row = {
      id: string
      email: string | null
      plan: string | null
      is_pro: boolean | null
      has_paid: boolean | null
      // KINEO-STALLED-RESCUE-ORPHAN-2026-08-11 — insumos da ramificação da copy.
      trial_status: string | null
      trial_ends_at: string | null
      trial_credits_granted: number | null
      trial_credits_used: number | null
      video_credits: number | null
    }

    // 4) Perfis dessa gente: não pagantes, não-pro, não opt-out, ainda não
    // emailados nesta campanha. `email_opted_out = false` está na query da
    // COORTE — ou seja, vale igualmente para o `remaining_unemailed` do dry
    // run, não só para o envio.
    const rows: Row[] = []
    for (const ids of chunk(stalledIds, 200)) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, plan, is_pro, has_paid, trial_status, trial_ends_at, trial_credits_granted, trial_credits_used, video_credits')
        .in('id', ids)
        .eq('has_paid', false)
        .eq('is_pro', false)
        .eq(FLAG_COLUMN, false)
        // KINEO-UNSUBSCRIBE-2026-07-26 — quem pediu para sair NUNCA entra em coorte.
        .eq('email_opted_out', false)
      if (error) {
        return NextResponse.json({ error: `profiles query failed: ${error.message}` }, { status: 500 })
      }
      rows.push(...((data ?? []) as Row[]))
    }

    // Diagnóstico (não é coorte): quantos da lista pediram para sair. Serve
    // para o relatório `skipped_opted_out` sem jamais tocar em quem optou.
    let optedOutCount = 0
    for (const ids of chunk(stalledIds, 200)) {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('id', ids)
        .eq('email_opted_out', true)
      optedOutCount += count ?? 0
    }

    // Quem tem evento mas nenhuma linha em `profiles` (conta apagada, evento
    // anônimo remapeado). Não dá para emailar nem para marcar.
    let profilesFound = 0
    for (const ids of chunk(stalledIds, 200)) {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('id', ids)
      profilesFound += count ?? 0
    }
    const skippedNoProfile = Math.max(0, stalledIds.length - profilesFound)

    // KINEO-STALLED-RESCUE-ORPHAN-2026-08-11 — quem já está no fluxo de
    // carrinho abandonado pertence ao send-recovery. Medido hoje: 13 pessoas
    // desta coorte estão nos dois. É a MESMA regra que o cron irmão
    // (send-video-rescue) já aplica há semanas — a campanha órfã era a única
    // que ignorava a divisão de propriedade e mandaria o segundo e-mail.
    //
    // ⚠️ FALHA FECHADA, e isto foi um achado da revisão adversarial. A primeira
    // versão copiava o cron irmão literalmente, inclusive o `const { data: ab }`
    // que DESCARTA o erro. Copiar assim falha ABERTA: consulta com erro devolve
    // `null`, o Set nasce vazio, as 13 pessoas do carrinho abandonado recebem o
    // e-mail deste job em cima do e-mail do send-recovery, e o `dry run` ainda
    // reporta `skipped_in_checkout_recovery: 0` — ninguém descobre. Seria a
    // rota aplicando dois padrões opostos de falha em duas exclusões vizinhas,
    // 40 linhas depois de declarar que "silêncio é reversível, e-mail duplicado
    // não é". Aqui o erro para o envio inteiro, antes de qualquer disparo.
    const abandonedUsers = new Set<string>()
    {
      const PAGE = 1000
      for (let from = 0; ; from += PAGE) {
        const { data: ab, error: abErr } = await admin
          .from('checkout_abandoned')
          .select('user_id')
          // ORDER BY obrigatório: sem ordem estável o Postgres pode deslocar a
          // janela quando chega linha nova durante a paginação, e a linha
          // pulada é exatamente uma pessoa recebendo este e-mail por cima do
          // send-recovery — a falha que esta exclusão existe para impedir.
          .order('user_id', { ascending: true })
          .range(from, from + PAGE - 1)
        if (abErr) {
          console.error('[stalled-rescue] checkout_abandoned query failed:', abErr.message)
          return NextResponse.json(
            {
              error: `checkout_abandoned query failed: ${abErr.message}`,
              note: 'Refusing to send: without this list we would email people the send-recovery flow already owns.',
            },
            { status: 500 },
          )
        }
        const rows = (ab ?? []) as Array<{ user_id?: string | null }>
        for (const a of rows) if (a.user_id) abandonedUsers.add(a.user_id)
        // Paginado de verdade, não `.limit(10000)`: o `db-max-rows` do PostgREST
        // pode cortar abaixo do limite pedido, e truncar esta lista em silêncio
        // significa mandar e-mail duplicado exatamente para quem já estava a um
        // passo de pagar.
        if (rows.length < PAGE) break
        if (from > 200_000) break
      }
    }

    const nowMs = Date.now()

    /**
     * Contexto de trial, ou null. Três condições, todas obrigatórias:
     * trial vivo, prazo no futuro e saldo > 0. Faltando qualquer uma, a pessoa
     * recebe o texto original — a frase de urgência só existe quando ela é
     * verdadeira para AQUELA pessoa naquele instante.
     */
    function trialContextOf(row: Row): TrialContext | null {
      if ((row.trial_status ?? '') !== 'active') return null
      const endsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null
      if (!endsAt || Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= nowMs) return null

      // ⚠️ A PRIMEIRA VERSÃO CALCULAVA `granted - used`, e a revisão adversarial
      // a derrubou apontando o precedente escrito: KINEO-D0-EMAIL-REVIEW-2026-08-07,
      // em cron/trial-lifecycle-emails, registra que "40 é verdade sobre a
      // CONCESSÃO e mentira sobre o SALDO, e a frase fala de saldo". A frase
      // desta campanha também fala de saldo ("it still has N credits on it"),
      // então ela tem de ler o saldo de onde o débito realmente sai:
      // `video_credits`. A fórmula abaixo é a mesma daquele arquivo.
      //
      // Medido em 11/08 nesta coorte: as duas fórmulas dão 1.469 hoje
      // (`granted = 40` para todos, `video_credits` nunca nulo). Ou seja, a
      // troca não muda um único número agora — e é exatamente por isso que ela
      // é barata e obrigatória: o dia em que divergirem, quem recebe o erro é
      // uma pessoa lendo um número que o /generate desmente em um clique.
      // O teto por LINHA manda sobre a constante: lib/reverseTrial.ts registra que
      // `trial_credits_granted` existe justamente porque o teto já se moveu
      // (60→40), e a conta tem de valer para quem foi ativado sob o teto antigo.
      const cap = row.trial_credits_granted ?? TRIAL_CREDIT_CAP
      const capLeft = Math.max(0, cap - (row.trial_credits_used ?? 0))
      const balance =
        typeof row.video_credits === 'number' && Number.isFinite(row.video_credits)
          ? Math.max(0, row.video_credits)
          : null
      const left = balance === null ? capLeft : Math.min(capLeft, balance)
      if (left <= 0) return null
      return { creditsLeft: left, endsAt }
    }

    const seen = new Set<string>()
    let excludedByCheckoutRecovery = 0
    const candidates = rows
      .map((row) => ({
        id: row.id,
        email: (row.email ?? '').trim().toLowerCase(),
        plan: (row.plan ?? '').toLowerCase(),
        is_pro: !!row.is_pro,
        has_paid: !!row.has_paid,
        trial: trialContextOf(row),
      }))
      // free / unpaid only — nunca perseguir quem já paga
      .filter((r) => !r.has_paid && !r.is_pro && !PAID_PLANS.has(r.plan))
      // válido, externo, não descartável, não interno
      .filter((r) => isValidExternalEmail(r.email))
      // dono do lead é o send-recovery quando há carrinho abandonado
      .filter((r) => (abandonedUsers.has(r.id) ? (excludedByCheckoutRecovery++, false) : true))
      // de-dupe por email
      .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)))

    // KINEO-LIFECYCLE-SUPPRESSION-2026-07-27 — a trava cruzada de 24h, que esta
    // rota nunca respeitou. Roda por ÚLTIMO, sobre a lista já peneirada: a
    // consulta é fatiada de 200 em 200 e não faz sentido perguntar por quem
    // seria descartado de qualquer jeito. Falha FECHADA — se a consulta cair,
    // `degraded` fica true e ninguém é considerado enviável, o que é o
    // comportamento certo: silêncio é reversível, e-mail duplicado não é.
    // KINEO-STALLED-RESCUE-RAMP-2026-08-13 — JANELA DE LEITURA DE 4h, E ELA É
    // O QUE FAZ A RAMPA FUNCIONAR EM VEZ DE GIRAR NO VAZIO.
    //
    // Com a janela histórica de 24h a rampa cairia na MESMA armadilha que a
    // sprint das 11h de hoje encontrou no send-recovery, e pela mesma razão
    // estrutural: quem está em trial ATIVO — o único grupo desta coorte com
    // relógio correndo, e o primeiro da fila pela ordenação acima — é
    // exatamente quem recebe e-mail de ciclo de vida todo dia (`d0_welcome`,
    // `ending_soon`, `cap_hit`). Medido no banco em 13/08, sem herdar de doc:
    //
    //   janela de 24h → 22 dos 231 bloqueados, e **10 dos 28 em trial (36%)**
    //   janela de  4h →  3 dos 231 bloqueados, e **0 dos 28 em trial**
    //
    // Um lote diário de 25 que perde um terço do grupo prioritário todo dia é
    // uma campanha que atende preferencialmente quem NÃO tem prazo.
    //
    // É seguro aqui pelo mesmo invariante que tornou seguro lá, e por nenhum
    // outro: o carimbo deste job é VITALÍCIO. `stalled_rescue_emailed` é
    // boolean e a coorte filtra `.eq(FLAG_COLUMN, false)` (linha 481) — **1
    // e-mail por pessoa, para sempre.** Janela curta não pode gerar repetição;
    // no máximo dois e-mails nossos no mesmo dia para alguém cuja geração
    // quebrou, que é precisamente a pessoa que merece ser interrompida.
    //
    // O 3º parâmetro é OPCIONAL e nasceu em `be56e3c` para o send-recovery: os
    // outros chamadores de `loadLifecycleSuppression` continuam em 24h, byte a
    // byte. E a direção de SAÍDA não muda — `stalled_rescue_sent_at` segue em
    // `PROFILE_TIMESTAMP_COLUMNS`, então este envio continua calando os outros
    // jobs pelas 24h normais.
    const RESCUE_SUPPRESSION_HOURS = 4
    const suppression = await loadLifecycleSuppression(
      admin,
      candidates.map((c) => c.id),
      RESCUE_SUPPRESSION_HOURS,
    )
    const recipientsUnordered = candidates.filter((r) => !suppression.isSuppressed(r.id))
    const suppressedCount = candidates.length - recipientsUnordered.length

    // KINEO-STALLED-RESCUE-RAMP-2026-08-13 — PRIORIDADE POR RELÓGIO.
    //
    // Enquanto o lote era uma URL de um clique com `limit=50`, a ordem da lista
    // não importava muito: dois cliques cobriam a coorte inteira. A partir do
    // cron em rampa (25/dia, ver app/api/cron/send-stalled-rescue/route.ts) ela
    // passa a decidir QUEM É ATENDIDO ANTES DE PERDER O QUE TEM. A coorte tem
    // 231 pessoas e a ordem natural das linhas é de `created_at`: sem esta
    // ordenação, as 28 que estão em trial ATIVO com 1.120 créditos vivos —
    // as únicas cujo e-mail ainda pode virar um vídeo NESTA semana — cairiam
    // aleatoriamente no meio de uma fila de 9 dias, e boa parte delas receberia
    // "vamos consertar seu vídeo" DEPOIS de o trial já ter virado abóbora.
    // O e-mail chegaria correto e inútil.
    //
    // Duas chaves, nesta ordem:
    //   1. quem tem trial vivo primeiro (o único grupo com prazo);
    //   2. entre esses, quem termina ANTES (o relógio mais curto ganha).
    // Quem não tem trial mantém a ordem relativa de origem (sort estável no
    // V8 desde o Node 11) — não há critério melhor para eles, e inventar um
    // seria ruído.
    const recipients = [...recipientsUnordered].sort((a, b) => {
      const at = a.trial, bt = b.trial
      if (!!at !== !!bt) return at ? -1 : 1
      if (at && bt) return at.endsAt.getTime() - bt.endsAt.getTime()
      return 0
    })

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const limitParam = Number(req.nextUrl.searchParams.get('limit'))
    const batchSize = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        cohort: 'started a generation, never completed one, unpaid, non-disposable, not yet stalled-rescue-emailed',
        started_total: started.ids.size,
        completed_total: completed.ids.size,
        started_never_completed: stalledIds.length,
        skipped_no_profile: skippedNoProfile,
        skipped_opted_out: optedOutCount,
        // KINEO-STALLED-RESCUE-ORPHAN-2026-08-11 — o dry run tem que mostrar
        // TODOS os funis de descarte, senão "231 viraram 190" fica sem causa e
        // alguém conclui que a coorte encolheu.
        skipped_in_checkout_recovery: excludedByCheckoutRecovery,
        suppressed_recent_lifecycle: suppressedCount,
        // Com DUAS janelas em uso no repo (24h no resto, 4h aqui), um payload
        // que só diz "suppressed" manda a próxima investigação para o lugar
        // errado — lição literal da sprint das 11h de hoje.
        suppression_window_hours: RESCUE_SUPPRESSION_HOURS,
        suppression_degraded: suppression.degraded,
        remaining_unemailed: recipients.length,
        // Quantos receberiam o parágrafo de trial (créditos vivos + prazo).
        with_live_trial: recipients.filter((r) => r.trial !== null).length,
        trial_credits_at_stake: recipients.reduce((sum, r) => sum + (r.trial?.creditsLeft ?? 0), 0),
        next_batch_size: Math.min(batchSize, recipients.length),
        sample: recipients.slice(0, 8).map((r) => r.email),
        subject: SUBJECT,
        from: FROM_EMAIL,
        hint: 'Append &confirm=SEND (optionally &limit=N) to send the next batch.',
      })
    }

    const batch = recipients.slice(0, batchSize)
    const results: Array<{ email: string; outcome: string }> = []
    let sent = 0
    let failed = 0
    // Contado no sucesso, um a um. `batch.slice(0, sent)` seria mentira: as
    // falhas ficam intercaladas no lote, então os `sent` primeiros elementos
    // não são os que deram certo.
    let sentWithTrialBlock = 0
    // Preenchido se um carimbo falhar: o laco aborta e o payload diz por que.
    let stampFailure: string | null = null
    // Enviados E carimbados. É o ÚNICO número que pode alimentar a fila
    // restante: quem saiu sem carimbo (abort) ou falhou no Resend continua
    // elegível no próximo run, então subtrair `batch.length` mentiria em até
    // 49 pessoas — achado da 2ª revisão adversarial.
    let stamped = 0
    for (const r of batch) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [r.email],
            reply_to: REPLY_TO,
            subject: SUBJECT,
            text: `${buildEmailText(r.trial)}${emailFooterText(r.id)}`,
            html: emailHtml(r.id, r.trial),
            headers: unsubscribeHeaders(r.id),
          }),
        })
        if (res.ok) {
          sent += 1
          if (r.trial !== null) sentWithTrialBlock += 1
          // ⚠️ O `results.push({outcome:'sent'})` ficava AQUI, antes do carimbo.
          // A 2ª revisão mostrou que, no caminho de abort, a MESMA pessoa saía
          // duas vezes em `results` com desfechos contraditórios. O push desceu
          // para depois da confirmação do carimbo: só é 'sent' o que também
          // ficou gravado.
          // Marca só no sucesso — um envio falho continua pendente pro próximo batch.
          //
          // KINEO-STALLED-RESCUE-ORPHAN-2026-08-11 — os DOIS carimbos no MESMO
          // update, e não em duas chamadas. São significados diferentes da
          // mesma verdade: o boolean é a idempotência vitalícia ("esta pessoa
          // já recebeu esta campanha, nunca mais"), o timestamptz é o que a
          // janela de 24h da supressão cruzada lê ("recebeu QUANDO"). Separar
          // em dois updates abriria a janela em que um falha e o outro não, e
          // aí a pessoa fica ou reenviável para sempre ou invisível para os
          // outros sete jobs — as duas metades do defeito que este commit fecha.
          //
          // ⚠️ E O RETORNO É CONFERIDO. A revisão adversarial apontou que juntar
          // os dois carimbos sem checar o erro não FECHA uma janela, ABRE uma
          // pior: antes um erro na coluna datada derrubava só o carimbo datado;
          // juntos, ele derruba o boolean também. O e-mail já saiu, a
          // idempotência não é gravada, e o próximo run reenvia o lote INTEIRO
          // para as mesmas pessoas — exatamente o cenário que o preflight desta
          // rota existe para impedir, contornando o preflight.
          //
          // Um carimbo que falha não é um caso isolado: se a escrita não passa,
          // ela não vai passar para o próximo da fila. O laço PARA. Melhor
          // entregar 12 e-mails e parar do que 231 e-mails sem memória nenhuma.
          const { error: stampErr } = await admin
            .from('profiles')
            .update({ [FLAG_COLUMN]: true, stalled_rescue_sent_at: new Date().toISOString() })
            .eq('id', r.id)
          if (stampErr) {
            console.error(`[stalled-rescue] STAMP FAILED after send to ${r.email}:`, stampErr.message)
            results.push({ email: r.email, outcome: 'sent_unstamped_ABORTED_RUN' })
            stampFailure = stampErr.message
            break
          }
          stamped += 1
          results.push({ email: r.email, outcome: 'sent' })
        } else {
          failed += 1
          results.push({ email: r.email, outcome: 'failed' })
          console.error(`[stalled-rescue] resend failed for ${r.email}:`, await res.text())
        }
      } catch (e) {
        failed += 1
        results.push({ email: r.email, outcome: 'failed' })
        console.error(`[stalled-rescue] send threw for ${r.email}:`, e instanceof Error ? e.message : String(e))
      }
      await new Promise((res) => setTimeout(res, 700))
    }

    console.log(`[stalled-rescue] batch done: sent=${sent} failed=${failed}`)
    return NextResponse.json({
      mode: 'SENT',
      sent,
      failed,
      skipped_no_profile: skippedNoProfile,
      skipped_opted_out: optedOutCount,
      skipped_in_checkout_recovery: excludedByCheckoutRecovery,
      suppressed_recent_lifecycle: suppressedCount,
      suppression_degraded: suppression.degraded,
      sent_with_trial_block: sentWithTrialBlock,
      // Nao-nulo = o lote ABORTOU no meio porque a idempotencia parou de gravar.
      // Nao rode de novo antes de investigar: os e-mails ja sairam.
      aborted_stamp_failure: stampFailure,
      batch_size: batch.length,
      // Pela fila REAL (carimbados), nunca pelo tamanho do lote.
      remaining_after_batch: Math.max(0, recipients.length - stamped),
      results,
    })
  } catch (err) {
    console.error('[stalled-rescue] unexpected:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
