import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { isInternalEmail } from '@/lib/internalAccounts'
import {
  POST_TO_EARN_CREDITS,
  POST_TO_EARN_MAX_PER_WINDOW,
  POST_TO_EARN_WINDOW_DAYS,
  POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP,
  POST_TO_EARN_PITCH,
} from '@/lib/postToEarn'

// send-post-nudge — KINEO-POST-NUDGE-2026-08-05.
//
// O BURACO, MEDIDO (05/08/2026 23:45Z)
// ────────────────────────────────────
//   · 73 pessoas externas já baixaram um vídeo pronto (`video_downloaded`).
//   · `posted_shorts` tem 2 linhas na HISTÓRIA INTEIRA.
//   · `post_to_earn_claims` tem **0** linhas — o Post to Earn está no ar desde
//     04/08 e nunca pagou um único crédito a ninguém.
//   · 72 das 73 pessoas baixaram e nunca registraram um Short.
//
// A causa não é o mecanismo: ele existe, é completo e paga de verdade
// (app/api/posted-shorts → lib/postToEarnGrant → RPC add_video_credits, o
// MESMO RPC dos webhooks de pagamento). O que não existe é o CONVITE.
//
// Varredura feita antes de escrever este arquivo: as 13 rotas de cron, as
// rotas de admin e todos os corpos de e-mail do repositório não têm UMA
// menção a `/wall`, a "paste the link" ou a Post to Earn. O convite só aparece
// para quem JÁ está logado dentro de /generate, /wall ou /history — ou seja,
// só para quem voltou sozinho. Quem baixou o arquivo e fechou a aba nunca
// soube que existia dinheiro do outro lado.
//
// Este job é essa mensagem, e só ela.
//
// POR QUE ESTA É A ALAVANCA CERTA E NÃO MAIS UM E-MAIL
// ───────────────────────────────────────────────────
// "Fazer o vídeo não é o produto. Postar é." Um Short publicado com a marca
// d'água é o único ativo da empresa que trabalha sozinho depois de criado:
// ele é distribuição gratuita, prova social verificável para a landing, e o
// motivo pelo qual a pessoa volta amanhã (ela tem crédito na mão). O download
// é o momento em que o arquivo está literalmente na mão dela — e é o único
// momento em que "agora publica" não soa como pedido, e sim como o próximo
// passo óbvio.
//
// PÚBLICO (conservador — e-mail errado queima domínio)
// ───────────────────────────────────────────────────
//   - emitiu `video_downloaded` (prova de ENTREGA do arquivo, não de clique —
//     lib/videoDownload.ts só emite esse evento no caminho blob confirmado)
//   - NÃO tem nenhuma linha em `posted_shorts` (quem já postou não precisa de
//     convite; precisaria de outro e-mail, que não é este)
//   - último download entre MIN_IDLE e MAX_IDLE (ver constantes)
//   - plano free, não optou por sair, não é conta interna
//   - fora do cooldown deste próprio e-mail e da supressão cruzada de 24h
//
// SEMÂNTICA DA COLUNA — LEIA ANTES DE MEXER
// ─────────────────────────────────────────
// `profiles.post_nudge_sent_at` é lida como JANELA (cooldown), igual a
// `credits_back_sent_at` e AO CONTRÁRIO das cinco colunas de "1 vez para
// sempre". Consequência direta, que é a lição de 05/08 (lib/lifecycle/
// skipStamp.ts, REGRA 2): esta coluna **nunca** pode receber o sentinela
// LIFECYCLE_SKIP_STAMP. `Date.parse('1970-01-01') === 0` é invisível para o
// teste `lastSent > 0` daqui, e um pulo carimbado assim viraria "elegível para
// sempre" — o oposto do que o carimbo queria dizer. Quem é pulado aqui não é
// carimbado, e isso custa ZERO escrita: o filtro que o pulou vai pulá-lo de
// novo na próxima rodada, de graça.
//
// AGENDAMENTO: "50 * * * *" (vercel.json). De hora em hora, no minuto :50 —
// o único slot livre em toda a hora (:00 autopilot, :05/:35 blackout-winback,
// :10/:40 video-ready, :15/:45 cap-hit, :20 recovery, :25 credits-back às 15h,
// :40 activation-nudge). De hora em hora porque o valor da mensagem decai com
// o tempo: o convite tem que chegar enquanto o arquivo ainda está na pasta de
// downloads, não no dia seguinte. O cooldown de 14 dias e a supressão cruzada
// de 24h são o que impede que "de hora em hora" vire spam.
//
// A PROMESSA VEM DA FONTE ÚNICA. Os números de crédito não são digitados aqui:
// saem de lib/postToEarn.ts, o mesmo módulo que o /wall e o /generate exibem e
// que lib/postToEarnGrant.ts executa. Um e-mail que prometesse um número
// diferente do que o servidor paga viraria ticket de suporte no primeiro dia.
//
// ?dry=1 mede o público sem enviar nada e sem carimbar.

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

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const LIFECYCLE_EMAILS_ENABLED = process.env.KINEO_LIFECYCLE_EMAILS_ENABLED === 'true'
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'

/**
 * Não interromper a sessão. Quem baixou há 40 minutos ainda pode estar no app,
 * e o convite já está na tela dele (GenerateClient "Published it?"). O e-mail
 * é para quem FECHOU a aba.
 */
const MIN_IDLE_MS = 2 * 60 * 60 * 1000
/**
 * Além disto o arquivo já não está na cabeça da pessoa — é público de win-back.
 * 7 dias, e não 30, porque o e-mail ABRE com "you downloaded your Short — nice".
 * Essa frase é verdadeira para quem baixou ontem e soa quebrada, quase robótica,
 * para quem baixou há 27 dias. Janela de mensagem e janela de coorte têm que ser
 * a MESMA coisa; quem passou de 7 dias é assunto de win-back, que é outro job.
 */
const MAX_IDLE_MS = 7 * 24 * 60 * 60 * 1000
/** Cooldown do próprio e-mail. Recorrente, mas nunca mais de 1 a cada 14 dias. */
const POST_NUDGE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000
/**
 * Teto por execução, DERIVADO do disjuntor global do Post to Earn — nunca
 * digitado. O programa só consegue pagar
 * POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP / POST_TO_EARN_CREDITS recompensas por
 * dia; convidar muito mais gente que isso por dia é fabricar a frase "Rewards
 * are paused for today" para quem fez exatamente o que o e-mail mandou.
 * O fator 2 é a folga por conversão parcial (nem todo convidado publica hoje).
 * Mexer no disjuntor passa a mexer no volume de convite sozinho — mesma regra
 * de fonte única que vale para os créditos.
 */
const MAX_PER_RUN = Math.max(
  5,
  Math.floor((POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP / POST_TO_EARN_CREDITS / 24) * 2),
)
/** PostgREST manda `in.(...)` na query string — fatiar para não estourar a URL. */
const CHUNK_SIZE = 200
/** Tetos de leitura. */
const MAX_EVENT_ROWS = 5000

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

function parseTime(raw: unknown): number {
  if (!raw) return 0
  const t = Date.parse(String(raw))
  return Number.isNaN(t) ? 0 : t
}

function wallUrl(): string {
  const params = new URLSearchParams({
    utm_source: 'lifecycle',
    utm_medium: 'email',
    utm_campaign: 'post_nudge',
  })
  // #paste é OBRIGATÓRIO, não enfeite. O campo de colar link mora no RODAPÉ de
  // /wall (a seção depois de até 60 cards); o empty state que o mostra no topo
  // só aparece com o mural vazio. Sem a âncora, o botão "Paste my link" larga a
  // pessoa no topo de uma página onde ela precisa rolar tudo para achar o que o
  // botão prometeu — e o único trabalho deste e-mail é fazê-la colar um link.
  return `${APP_URL}/wall?${params.toString()}#paste`
}

function buildEmail(userId: string) {
  const url = wallUrl()
  const credits = POST_TO_EARN_CREDITS
  const perWeek = POST_TO_EARN_MAX_PER_WINDOW

  // Cada frase daqui é verificável contra o código que roda:
  //  · "${credits} credits" → POST_TO_EARN_CREDITS, o valor que o RPC paga.
  //  · "public on YouTube"  → a checagem de oEmbed em lib/postToEarnGrant.ts.
  //  · "counts once"        → o índice único global em post_to_earn_claims.
  // Nada aqui promete ranking por views: o /wall diz, hoje, que a ordenação por
  // views ainda não existe ("ordered by newest first"). Prometer o que a tela
  // não entrega é o defeito que este repositório já pagou duas vezes.
  const text = `Hey,

You downloaded your Short — nice. There's one step left, and it's the one that pays you back.

${POST_TO_EARN_PITCH}

Publish it on YouTube, come back and paste the link: ${url}

Three things happen when you do:
1. You get ${credits} credits — enough for another day of creating, free.
2. Your Short joins the Wall of Proof, our public board of Shorts made with Kineo.
3. The video keeps working for you after you close the tab.

The video has to be public on YouTube for the credits to land, and each video counts once — up to ${perWeek} every ${POST_TO_EARN_WINDOW_DAYS} days, while the day's reward pool lasts.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">You downloaded your Short — nice. <strong>There's one step left, and it's the one that pays you back.</strong></p>
  <p style="margin:0 0 20px;">${POST_TO_EARN_PITCH}</p>
  <p style="margin:0 0 10px;"><a href="${url}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Paste my link &rarr;</a></p>
  <p style="margin:0 0 18px;font-size:13px;color:#64748b;">Publish it on YouTube first, then paste the link on that page.</p>
  <p style="margin:0 0 6px;">Three things happen when you do:</p>
  <p style="margin:0 0 4px;">1. You get <strong>${credits} credits</strong> — enough for another day of creating, free.</p>
  <p style="margin:0 0 4px;">2. Your Short joins the <strong>Wall of Proof</strong>, our public board of Shorts made with Kineo.</p>
  <p style="margin:0 0 18px;">3. The video keeps working for you after you close the tab.</p>
  <p style="margin:0 0 14px;font-size:13px;color:#64748b;">The video has to be public on YouTube for the credits to land, and each video counts once — up to ${perWeek} every ${POST_TO_EARN_WINDOW_DAYS} days, while the day's reward pool lasts.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dry') === '1'

  if (!dryRun && !LIFECYCLE_EMAILS_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'lifecycle_email_gate' })
  }
  if (!dryRun && !RESEND_API_KEY) {
    console.error('[send-post-nudge] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // KINEO-LIFECYCLE-FRESH-READ-2026-08-05 — leitura de cron nunca vem de
    // cache. Nasceu do reenvio triplo do send-cap-hit; todo cron novo já nasce
    // com a correção.
    global: { fetch: freshFetch },
  })

  const now = Date.now()

  // ── 1) Quem recebeu o arquivo na mão ──────────────────────────────────────
  // `video_downloaded` é emitido em UM lugar só (lib/videoDownload.ts) e só no
  // caminho de blob confirmado — abrir uma aba não conta. É a prova de entrega
  // mais forte que a empresa tem.
  const { data: downloads, error: dlErr } = await admin
    .from('events')
    .select('user_id, created_at')
    .eq('name', 'video_downloaded')
    .gte('created_at', new Date(now - MAX_IDLE_MS).toISOString())
    .order('created_at', { ascending: false })
    .limit(MAX_EVENT_ROWS)

  if (dlErr) {
    console.error('[send-post-nudge] downloads query error:', dlErr.message)
    return NextResponse.json({ error: dlErr.message }, { status: 500 })
  }

  const lastDownloadAt = new Map<string, number>()
  for (const row of (downloads ?? []) as Array<Record<string, unknown>>) {
    const id = typeof row.user_id === 'string' ? row.user_id : ''
    if (!id) continue
    const at = parseTime(row.created_at)
    if ((lastDownloadAt.get(id) ?? 0) < at) lastDownloadAt.set(id, at)
  }

  const idleIds = Array.from(lastDownloadAt.entries())
    .filter(([, at]) => now - at >= MIN_IDLE_MS && now - at <= MAX_IDLE_MS)
    .map(([id]) => id)

  if (idleIds.length === 0) {
    return NextResponse.json({ sent: 0, eligible: 0, reason: 'nobody_in_idle_window' })
  }

  // ── 2) Tirar quem JÁ postou ───────────────────────────────────────────────
  // Falha FECHADA: sem conseguir provar quem já registrou um Short, o job não
  // envia. Convidar a postar quem já postou é o jeito mais rápido de fazer a
  // mensagem parecer automática e sem valor.
  const alreadyPosted = new Set<string>()
  for (const part of chunk(idleIds, CHUNK_SIZE)) {
    const POSTED_PAGE = 1000
    const { data: posted, error: postedErr } = await admin
      .from('posted_shorts')
      .select('user_id')
      .in('user_id', part)
      .limit(POSTED_PAGE)

    if (postedErr) {
      console.error('[send-post-nudge] posted_shorts query error:', postedErr.message)
      return NextResponse.json({ error: postedErr.message, sent: 0 }, { status: 503 })
    }
    // Truncamento do PostgREST NÃO vem como `error` — vem como uma página curta
    // e silenciosa. Sem esta checagem a exclusão "quem já postou" falharia
    // ABERTA justamente quando a tabela crescer, e alguém que postou receberia
    // "você baixou e nunca postou". Fechar aqui é barato: o job perde uma
    // rodada e volta em uma hora.
    if ((posted?.length ?? 0) >= POSTED_PAGE) {
      console.error('[send-post-nudge] posted_shorts truncado no limite — abortando (fail-closed)')
      return NextResponse.json({ error: 'posted_shorts_truncated', sent: 0 }, { status: 503 })
    }
    for (const row of (posted ?? []) as Array<Record<string, unknown>>) {
      if (typeof row.user_id === 'string') alreadyPosted.add(row.user_id)
    }
  }

  const notPostedIds = idleIds.filter((id) => !alreadyPosted.has(id))
  if (notPostedIds.length === 0) {
    return NextResponse.json({ sent: 0, eligible: 0, reason: 'everybody_already_posted' })
  }

  // ── 2b) CEDER A VEZ AO send-cap-hit ───────────────────────────────────────
  // Entrar em PROFILE_TIMESTAMP_COLUMNS é obrigatório, mas tem um custo que
  // precisa ser pago aqui e não descoberto depois: cada envio deste job cala a
  // pessoa nos outros seis por 24h. E a coorte daqui — quem baixou vídeo — é
  // exatamente a gente mais engajada, ou seja, a mesma que bate no teto do free
  // e vira coorte do send-cap-hit, o sinal de compra mais quente do funil.
  //
  // Os dois decaem em escalas diferentes: o cap-hit vale por MINUTOS (a pessoa
  // está no muro AGORA, com a carteira na mão), o post-nudge vale por DIAS.
  // Quando colidem, quem cede é este. Quem bateu no muro nas últimas 24h sai da
  // coorte de hoje e volta amanhã, sem carimbo e sem perda.
  const capHitSince = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const { data: atTheWall, error: wallErr } = await admin
    .from('events')
    .select('user_id')
    .eq('name', 'compose_refused')
    .eq('metadata->>reason', 'free_fast_limit')
    .gte('created_at', capHitSince)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (wallErr) {
    // Falha FECHADA: sem saber quem está no muro, o risco é calar uma compra.
    console.error('[send-post-nudge] cap-hit cohort query error:', wallErr.message)
    return NextResponse.json({ error: wallErr.message, sent: 0 }, { status: 503 })
  }

  const atTheWallIds = new Set<string>()
  for (const row of (atTheWall ?? []) as Array<Record<string, unknown>>) {
    if (typeof row.user_id === 'string') atTheWallIds.add(row.user_id)
  }

  const coldIds = notPostedIds.filter((id) => !atTheWallIds.has(id))
  const yieldedToCapHit = notPostedIds.length - coldIds.length
  if (coldIds.length === 0) {
    return NextResponse.json({
      sent: 0,
      eligible: 0,
      yielded_to_cap_hit: yieldedToCapHit,
      reason: 'everybody_at_the_wall',
    })
  }

  // ── 3) Perfis: free, opt-in, fora do cooldown ─────────────────────────────
  interface Candidate {
    id: string
    email: string
    lastDownloadAt: number
  }
  const candidates: Candidate[] = []
  let skippedPlanOrInternal = 0
  let skippedCooldown = 0

  for (const part of chunk(coldIds, CHUNK_SIZE)) {
    const { data: profiles, error: profilesErr } = await admin
      .from('profiles')
      .select('id, email, plan, has_paid, post_nudge_sent_at')
      .in('id', part)
      .eq('email_opted_out', false)

    if (profilesErr) {
      console.error('[send-post-nudge] profiles query error:', profilesErr.message)
      return NextResponse.json({ error: profilesErr.message }, { status: 500 })
    }

    for (const p of (profiles ?? []) as Array<Record<string, unknown>>) {
      const id = typeof p.id === 'string' ? p.id : ''
      if (!id) continue
      const email = typeof p.email === 'string' ? p.email.trim() : ''
      const plan = String(p.plan ?? 'free').toLowerCase()

      // Pagante e conta interna PULAM SEM CARIMBO — ver "SEMÂNTICA DA COLUNA"
      // no cabeçalho. Plano é reversível: quem cancela hoje volta a ser público
      // deste e-mail amanhã, e um carimbo aqui o calaria por 14 dias à toa.
      if (!email || isInternalEmail(email) || plan !== 'free' || p.has_paid === true) {
        skippedPlanOrInternal++
        continue
      }

      const lastSent = parseTime(p.post_nudge_sent_at)
      if (lastSent > 0 && now - lastSent < POST_NUDGE_COOLDOWN_MS) {
        skippedCooldown++
        continue
      }

      candidates.push({ id, email, lastDownloadAt: lastDownloadAt.get(id) ?? 0 })
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      sent: 0,
      eligible: 0,
      skipped_plan_or_internal: skippedPlanOrInternal,
      skipped_cooldown: skippedCooldown,
      reason: 'nobody_after_profile_filters',
    })
  }

  // ── 4) Supressão cruzada de 24h (fail-closed) ─────────────────────────────
  const suppression = await loadLifecycleSuppression(admin, candidates.map((c) => c.id))
  const eligible = candidates.filter((c) => !suppression.isSuppressed(c.id))

  // Mais recentes primeiro: o arquivo de quem baixou há 3 horas ainda está na
  // cabeça dele. Se o teto cortar alguém, corta quem tem menos chance de agir.
  eligible.sort((a, b) => b.lastDownloadAt - a.lastDownloadAt)
  const batch = eligible.slice(0, MAX_PER_RUN)

  if (dryRun) {
    console.log(
      `[send-post-nudge] DRY RUN — idle=${idleIds.length} nao_postaram=${notPostedIds.length} ` +
      `cedidos_ao_cap_hit=${yieldedToCapHit} ` +
      `candidatos=${candidates.length} elegiveis=${eligible.length} enviaria=${batch.length}`,
    )
    return NextResponse.json({
      dry_run: true,
      sent: 0,
      would_send: batch.length,
      idle_window: idleIds.length,
      not_posted: notPostedIds.length,
      yielded_to_cap_hit: yieldedToCapHit,
      after_profile_filters: candidates.length,
      eligible: eligible.length,
      capped_out: Math.max(0, eligible.length - batch.length),
      skipped_plan_or_internal: skippedPlanOrInternal,
      skipped_cooldown: skippedCooldown,
      suppressed_recent_lifecycle: suppression.suppressedCount,
      suppression_degraded: suppression.degraded,
    })
  }

  let sent = 0
  let failed = 0

  let lostRace = 0
  const cooldownCutoff = new Date(now - POST_NUDGE_COOLDOWN_MS).toISOString()

  for (const u of batch) {
    // ── RESERVA ATÔMICA, ANTES DO RESEND (KINEO-POST-NUDGE-RESERVE) ─────────
    // Este job roda de HORA EM HORA, e a única memória de "já mandei" seria a
    // coluna `post_nudge_sent_at` — a mesma classe de coluna que, em 05/08,
    // o send-cap-hit releu como nula e reenviou o mesmo e-mail 3× em 90 min.
    // O `freshFetch` ataca a causa suspeita daquela leitura velha; isto aqui
    // não depende de nenhuma leitura ter sido fresca.
    //
    // O `UPDATE ... WHERE (nulo OU mais velho que o cooldown)` é resolvido
    // dentro do Postgres, num só comando: quem levar 0 linhas perdeu a corrida
    // e não manda nada. O preço, deliberado e igual ao do cap-hit: se o Resend
    // falhar DEPOIS da reserva, a pessoa perde este e-mail por 14 dias. É
    // melhor um e-mail a menos do que um loop de reenvio — o primeiro custa um
    // nudge, o segundo custa o domínio.
    const stampedAt = new Date().toISOString()
    const { data: claimed, error: claimErr } = await admin
      .from('profiles')
      .update({ post_nudge_sent_at: stampedAt })
      .eq('id', u.id)
      .or(`post_nudge_sent_at.is.null,post_nudge_sent_at.lt.${cooldownCutoff}`)
      .select('id')

    if (claimErr) {
      failed++
      console.error(`[send-post-nudge] reserva falhou para ${u.email}: ${claimErr.code ?? '?'} ${claimErr.message} — nada enviado`)
      continue
    }
    if (!claimed || claimed.length === 0) {
      lostRace++
      continue
    }

    const body = buildEmail(u.id)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [u.email],
          reply_to: 'hello@usekineo.com',
          subject: `Your Short is done — now get paid ${POST_TO_EARN_CREDITS} credits for posting it`,
          text: body.text,
          html: body.html,
          headers: unsubscribeHeaders(u.id),
        }),
      })

      if (res.ok) {
        sent++
        const { error: evtErr } = await admin.from('events').insert({
          user_id: u.id,
          name: 'post_nudge_sent',
          path: '/api/cron/send-post-nudge',
          metadata: {
            campaign: 'post_nudge',
            idle_hours: Math.round((now - u.lastDownloadAt) / (60 * 60 * 1000)),
          },
        })
        if (evtErr) {
          console.error(`[send-post-nudge] evento post_nudge_sent NAO gravado para ${u.email}: ${evtErr.message}`)
        }

        console.log(`[send-post-nudge] sent to ${u.email}`)
      } else {
        failed++
        console.error(
          `[send-post-nudge] resend failed for ${u.email}:`, await res.text(),
          '— a reserva JA foi feita: esta pessoa so volta a ser elegivel depois do cooldown',
        )
      }
    } catch (err) {
      failed++
      console.error(`[send-post-nudge] error for ${u.email}:`, err)
    }
  }

  return NextResponse.json({
    sent,
    failed,
    // > 0 significa que outra execução reservou a mesma pessoa entre a leitura
    // e a escrita. É a trava de reenvio funcionando, não um erro.
    lost_race: lostRace,
    eligible: eligible.length,
    capped_out: Math.max(0, eligible.length - batch.length),
    idle_window: idleIds.length,
    not_posted: notPostedIds.length,
    yielded_to_cap_hit: yieldedToCapHit,
    skipped_plan_or_internal: skippedPlanOrInternal,
    skipped_cooldown: skippedCooldown,
    suppressed_recent_lifecycle: suppression.suppressedCount,
    suppression_degraded: suppression.degraded,
  })
}
