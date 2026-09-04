import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { creditCostFor } from '@/lib/credits/engineCost'
import { buildSeriesContinuationEmailUrl } from '@/lib/seriesContinuation'
import { pickMomentumTopic, momentumAnchor } from '@/lib/momentumTopic'
import { createClient as createSessionClient } from '@/lib/supabase/server'
import {
  momentumSkipReason, resolveIdleWindow, videosAwayWord, momentumNextFilm,
  MOMENTUM_MIN_GAP_DAYS, type MomentumStamp,
} from '@/lib/momentumLadder'
// #16 — a cota do free tier entra na decisao: o e-mail so promete o filme do
// motor free para quem AINDA tem vaga na janela. Mesma fonte de verdade que o
// enforcement do /api/compose usa para recusar.
import { getFreeTierOffer } from '@/lib/freeTierOffer'
import { countFreeFastUsage } from '@/lib/freeFastQuota'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } from '@/lib/composeClaim'

// ═══ KINEO-MOMENTUM-2026-08-20 — O E-MAIL QUE MIRA O 4º VÍDEO ═════════════
//
// A DESCOBERTA QUE ORIGINOU ESTE ARQUIVO (medida em 20/08, 854 contas):
//   1 vídeo feito     → 0,33% assinam
//   2-3 vídeos        → 0,86%
//   4-6 vídeos        → 11,76%   ← 24× mais
//   7+ vídeos         → 18,18%   ← 37× mais
// A compra não acontece no checkout: acontece no QUARTO VÍDEO. E só 28 de 854
// pessoas chegaram lá.
//
// O funil tinha cobertura nas duas pontas e um buraco no meio exatamente onde
// mora o dinheiro: `send-activation-nudge` cuida de quem fez ZERO vídeos, e as
// campanhas de checkout cuidam de quem já foi ao pagamento. Ninguém falava com
// quem fez 1, 2 ou 3 vídeos e parou — que são 154 + 67 pessoas em 14 dias, o
// maior grupo do funil depois dos que nunca geraram.
//
// POR QUE ESTE E-MAIL NÃO TEM CUPOM (decisão consciente):
// A pessoa não parou por preço — ela nem chegou ao preço. Ela parou por
// inércia. Desconto aqui seria responder uma objeção que ela não fez, e ainda
// ensinaria que parar rende prêmio. O gancho é o PRÓXIMO VÍDEO, e a prova de
// que ela consegue é o vídeo que ela já fez.
//
// O QUE TORNA ESTE E-MAIL DIFERENTE DE UM "VOLTA PRA GENTE":
// ele cita o tema do vídeo QUE ELA FEZ (temos `topic` na tabela videos) e
// sugere o próximo passo concreto. Não é lembrete, é continuação.
//
// Guard rails: 1× por pessoa para sempre (marcador `momentum_nudge_sent`),
// só quem tem crédito suficiente para de fato fazer o próximo vídeo (senão o
// e-mail manda a pessoa bater num 402 — o erro que já cometemos em 5 telas),
// pula pagante, opt-out, conta interna e descartável.

// ═══ KINEO-SPRINT-V1V4-2026-09-01 (#24) — DUAS COISAS ERRADAS AQUI ════════
//
// (A) ESTE E-MAIL NUNCA FOI ENVIADO. `select count(*) from events where
//     name='momentum_nudge_sent'` = ZERO, desde 20/08. A causa nao esta neste
//     arquivo: em `vercel.json` o cron chama
//         "/api/cron/send-momentum-nudge"  (schedule 30 13 * * *)
//     SEM `?confirm=SEND`. A rota exige esse parametro para sair do DRY_RUN
//     (linha `const confirm = ...` abaixo). Ou seja: ha 11 dias a plataforma
//     acorda esta rota todo dia as 13:30 UTC, ela calcula a lista de elegiveis
//     com capricho, devolve `mode: DRY_RUN` e nao manda um unico e-mail.
//     A unica campanha da casa escrita para empurrar o video 1 ate o 4 e uma
//     carta escrita e nunca postada.
//     ⚠ NAO ARMEI SOZINHO — armar dispara ate 40 e-mails reais por rodada, e
//     e-mail que sai e decisao do fundador. A resposta DRY_RUN agora explica
//     isso em `armed` / `why` / `to_arm`, para o defeito parar de ser
//     invisivel. Para armar: por `?confirm=SEND` no path do vercel.json.
//
// (B) O BOTAO JOGAVA FORA O TEMA QUE O PROPRIO TEXTO CITA. A carta diz
//     "Your film about X is sitting in your library" e o botao levava para um
//     `/generate` PELADO — Studio em branco, tudo para reescrever.
//     Medido em 30 dias (externos): 123 pessoas voltaram de verdade numa
//     sessao posterior ao 1o video e 30 fizeram outro video = 24%. Pelo
//     caminho de continuacao de serie: 59 chegadas -> 31 videos = 53%.
//     Mais que o DOBRO, com o MESMO clique — muda so o destino. Agora o botao
//     carrega o tema (`buildSeriesContinuationEmailUrl`), o mesmo helper que
//     /history, /studio e a tela de video pronto ja usam. Sem tema utilizavel
//     (cleanTopic devolve null), a URL volta a ser exatamente a de antes:
//     nunca inventamos o assunto do video da pessoa.

// ═══ KINEO-SPRINT-ASSINATURAS-2026-09-02 (#6) — O TEMA NUNCA PASSAVA ═══════
//
// O (B) acima foi ligado e NUNCA disparou. `videos.topic` guarda o ROTEIRO
// inteiro (gancho + corpo, 500 chars), e o `cleanTopic` antigo rejeitava tudo
// acima de 90 caracteres: medido em SQL em 02/09, na vespera do 1o disparo
// real (10:30 BRT), 23 de 23 elegiveis com topic de 161-558 chars →
// `com_tema: 0`. Todo e-mail sairia neutro ("You made your first film") com
// botao para o /generate PELADO — o destino de 24% que a #24 disse ter trocado
// pelo de 53%. Agora o tema e a linha do GANCHO pela regua da casa
// (`extractShortTitle`, a mesma de /history, home e /studio), com filtro de
// instrucao (`lib/momentumTopic.ts`): roteiro que comeca com "Create a
// 40-second…"/"STYLE:"/"must be in FRENCH ONLY" nao vira anchor. Sem tema
// utilizavel, texto e URL sao os de antes. E a leitura de `videos` ganhou
// tripwire de truncamento (PostgREST devolve no maximo 1.000 linhas SEM ERRO;
// 756 em 30d hoje): saturou → 500 e nenhum e-mail, porque contagem truncada
// diria "You're three away" para quem ja fez cinco.

// ═══ KINEO-SPRINT-ASSINATURAS-2026-09-02 (#23) — A ESCADA E O RESGATE ═════
//
// (1) O carimbo era 1× POR PESSOA PARA SEMPRE. A pessoa recebia o e-mail no
//     vídeo 1, fazia o 2º (o e-mail FUNCIONOU), parava no 2 — e nunca mais
//     ouvia falar da casa. A campanha escrita para levar até o 4º largava a
//     pessoa no 1º degrau que ela subia. Agora o carimbo vale POR DEGRAU
//     (`metadata.videos`, que o insert sempre gravou): 1 e-mail no 1, outro
//     no 2, outro no 3 — só quando a contagem SOBE, com folga mínima de
//     MOMENTUM_MIN_GAP_DAYS entre dois. Parado no mesmo degrau = silêncio.
//     Regra em `lib/momentumLadder.ts` (pura); o `skipped` do DRY_RUN mostra
//     quantos caem em cada motivo.
//
// (2) A janela 20-96h pressupõe cron diário. O cron ficou DESARMADO de 20/08 a
//     01/09; medido 02/09 06:30 BRT (externos, 30d): 25 pessoas com 1-3
//     vídeos, ≥5cr, sem plano, nunca carimbadas, último vídeo há MAIS de 96h
//     — passaram pela janela enquanto a rota respondia DRY_RUN. `?max_idle_h=
//     720` alarga o teto (nunca acima de 30d, nunca abaixo de 96h) para UMA
//     rodada de resgate. O cron do vercel.json não manda esse parâmetro: o
//     dia a dia continua 96h.
//
// (3) Para o resgate ser 1 clique do fundador (o cron exige Bearer
//     CRON_SECRET, que o navegador não tem), a rota aceita TAMBÉM sessão de
//     admin (`ADMIN_EMAILS`, o mesmo conjunto de /api/admin/send-winback-25).
//     Continua dry-run por padrão; `&confirm=SEND` envia.
//     Link: /api/cron/send-momentum-nudge?max_idle_h=720 (dry-run) →
//           /api/cron/send-momentum-nudge?max_idle_h=720&confirm=SEND

// ═══ KINEO-SPRINT-ASSINATURAS-2026-09-04 (#16) — O SALDO ZERO COMIA O DEGRAU ══
//
// O NUMERO QUE PAGOU A MUDANCA (medido 04/09 13:50 BRT, externos, 7 dias):
//   138 pessoas receberam filme · 113 fizeram UM e pararam · 25 fizeram 2+.
//   1 filme  -> 6 checkouts, **0 assinaturas**.
//   2+ filmes -> 4 checkouts, **3 assinaturas** — as 3 assinaturas da semana.
// O segundo filme E a assinatura. Esta rota existe para produzi-lo.
//
// E ela derrubava, sem contar em lugar nenhum (`continue` mudo), justamente
// quem nao tem mais credito:
//   · 304 de 349 candidatos da janela de resgate de 30d (217 com 1 filme);
//   ·  17 de  73 candidatos da janela diaria de 20-96h (13 com 1 filme).
// O bar era `creditCostFor('fast', true)` — o Kineo 1 da conta PAGANTE (5cr).
// Esta carta so fala com quem NAO paga, e ali o mesmo motor custa **0**. A
// campanha escrita para levar do 1o ao 4o filme desistia da pessoa citando o
// preco de uma conta que ela nunca contata.
//
// O QUE MUDA, E O QUE NAO MUDA:
//   · Quem passava continua passando byte a byte (o piso de 1 credito virou o
//     ramo 'credits', com a URL identica a de antes). Zero mudanca para eles.
//   · Quem tem saldo curto entra num ramo NOVO ('free_engine'): a carta diz que
//     o Kineo 1 sai por zero credito e que ele vem com marca d'agua, e o botao
//     leva `?engine=fast` — o Studio ja honra esse parametro e ele vence os
//     defaults por plano (KINEO-URL-ENGINE-WINS-2026-08-17). Sem isso a carta
//     mandaria a pessoa para um motor que ela nao pode pagar: o 402 que este
//     arquivo existe para nao provocar.
//   · A vaga do free tier entra na decisao (getFreeTierOffer + countFreeFastUsage,
//     as MESMAS fontes do enforcement do /api/compose). Vaga gasta ou leitura
//     falha = nao manda. Falha fechada dos dois lados.
//   · O descarte por saldo passou a aparecer no `skipped` do dry-run.
//
// COMO MEDIR: `momentum_nudge_sent` agora carrega `metadata.next_film`
// ('credits' | 'free_engine'). A pergunta e se o balde novo faz o 2o filme —
// e se o 2o filme vira checkout, como fez para 3 de 25 nesta semana.

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
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const STAMP = 'momentum_nudge_sent'
const MAX_PER_RUN = 40
// Janela: cedo o bastante para a memória estar fresca, tarde o bastante para
// não atropelar quem ainda está na sessão. 20h-96h desde o último vídeo
// (constantes em lib/momentumLadder.ts; `?max_idle_h=` só alarga, #23).
const VIDEOS_TRIPWIRE = 1000
// #23: sessão de admin também abre a rota (link de 1 clique do fundador).
const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])

function isInternalOrJunk(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') || e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') || e.startsWith('test') ||
    e.includes('mailinator') || e.startsWith('smoketest') ||
    e.endsWith('@gouziben.com') || e.endsWith('@ptct.net')
  )
}

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false // fail-closed: env sumida não abre o endpoint
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

// #23: admin logado no navegador (mesmo padrão de /api/admin/send-winback-25).
// Falha fechada: qualquer erro de sessão = não autorizado.
async function isAdminSession(): Promise<boolean> {
  try {
    const supabase = createSessionClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = (user?.email ?? '').toLowerCase()
    return !!email && ADMIN_EMAILS.has(email)
  } catch {
    return false
  }
}

type NextFilmKind = 'credits' | 'free_engine'

function buildEmail(userId: string, videosMade: number, topic: string | null, nextFilm: NextFilmKind = 'credits') {
  // #16 — quem chega aqui sem credito so tem UM filme possivel: o Kineo 1, que
  // custa 0 nesta conta. O link PRECISA carregar o motor (?engine=fast, que o
  // GenerateClient ja honra desde KINEO-ENGINE-DEEPLINK-2026-08-15 e que vence
  // os defaults por plano), senao a carta manda a pessoa para uma tela cujo
  // motor selecionado ela nao pode pagar — o 402 que este arquivo existe para
  // nao provocar. Para quem TEM credito a URL continua identica a de antes.
  const freeEngine = nextFilm === 'free_engine'
  // O tema viaja no botao. Sem tema, cai na MESMA url de antes (so utm).
  const url = buildSeriesContinuationEmailUrl(APP_URL, topic, 'momentum_email', {
    utm_source: 'lifecycle',
    utm_medium: 'email',
    utm_campaign: 'momentum',
    ...(freeEngine ? { engine: 'fast' } : {}),
  })
  // Rotulo honesto: so promete "episodio 2 pronto" quando o tema REALMENTE
  // viaja no link. Botao que promete preenchimento e entrega tela em branco e
  // exatamente o defeito que esta rodada esta consertando.
  const cta = topic ? 'Open episode 2 →' : 'Make the next one →'
  // #23: a palavra vem da escada (1→three, 2→two, 3→one); a rota só chega aqui
  // com 1..3, mas o fallback nunca inventa número.
  const away = videosAwayWord(videosMade) ?? 'a few'
  // A frase que ancora no que ELA fez. Sem tema utilizável, cai numa versão
  // neutra — nunca inventamos o assunto do vídeo dela.
  const anchor = momentumAnchor(topic, videosMade)
  // #16 — a unica frase nova da carta, e ela so aparece para quem esta sem
  // credito. Diz a verdade inteira: o motor que sai de graca, e a marca d'agua
  // que vem junto com ele (getFreeTierOffer e a mesma fonte do enforcement).
  const freeLineText = freeEngine
    ? `Your balance won't cover an AI film right now — but your next film is not blocked. Kineo 1 costs no credits on your account. It renders with our watermark; everything else is the same machine.

`
    : ''
  const freeLineHtml = freeEngine
    ? `<p style="margin:0 0 14px;">Your balance won't cover an AI film right now — but your next film is not blocked. <strong>Kineo 1 costs no credits on your account</strong>. It renders with our watermark; everything else is the same machine.</p>`
    : ''

  const text = `Hey,

${anchor}

Here's something we noticed looking at how people use Kineo: the difference between someone who makes one video and someone who builds a channel is almost never talent — it's the fourth video. That's where it stops feeling like a tool you're testing and starts feeling like a workflow you own.

You're ${away} away.

${freeLineText}Pick anything — a mystery, a country, a story you can't stop thinking about — and the AI writes the script, records the voiceover, cuts the captions and scores it.

${topic ? 'Episode 2 is already written for you — one click and the idea is in the box:' : 'Make the next one:'} ${url}

If something got in the way last time, just reply and tell me. It lands with a real person.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">${anchor}</p>
  <p style="margin:0 0 14px;">Here's something we noticed looking at how people use Kineo: the difference between someone who makes one video and someone who builds a channel is almost never talent — it's <strong>the fourth video</strong>. That's where it stops feeling like a tool you're testing and starts feeling like a workflow you own.</p>
  <p style="margin:0 0 14px;">You're <strong>${away}</strong> away.</p>
  ${freeLineHtml}
  <p style="margin:0 0 14px;">Pick anything — a mystery, a country, a story you can't stop thinking about — and the AI writes the script, records the voiceover, cuts the captions and scores it.</p>
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">${cta}</a></p>
  <p style="margin:0 0 14px;">If something got in the way last time, just reply and tell me. It lands with a real person.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  const viaCron = isCronAuthorized(req)
  if (!viaCron && !(await isAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
  const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const now = Date.now()
  // #23: janela padrão 20-96h; `max_idle_h` só alarga (teto 30d) — resgate.
  const window = resolveIdleWindow(req.nextUrl.searchParams.get('max_idle_h'))
  const idleMin = new Date(now - window.maxIdleH * 3600_000).toISOString()
  const idleMax = new Date(now - window.minIdleH * 3600_000).toISOString()

  // Candidatos: vídeos concluídos na janela de ociosidade. Agregamos por
  // pessoa em memória (o Supabase JS não faz GROUP BY).
  const { data: vids, error } = await admin
    .from('videos')
    .select('user_id, created_at, topic')
    .eq('status', 'completed')
    .gte('created_at', new Date(now - 30 * 24 * 3600_000).toISOString())
    .limit(4000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Tripwire de truncamento (#6): o PostgREST corta em max-rows (1.000 por
  // padrao) sem erro. Pagina cheia = contagem por pessoa nao confiavel.
  if ((vids?.length ?? 0) >= VIDEOS_TRIPWIRE) {
    console.error(`[momentum] videos query saturated at ${vids?.length} rows — counts untrustworthy, sending nothing`)
    return NextResponse.json({ error: 'videos_truncated', rows: vids?.length, note: 'paginar a leitura antes de voltar a enviar' }, { status: 500 })
  }

  type Agg = { count: number; last: string; topic: string | null }
  const byUser = new Map<string, Agg>()
  for (const v of vids ?? []) {
    const uid = v.user_id as string | null
    if (!uid) continue
    const created = v.created_at as string
    const cur = byUser.get(uid)
    if (!cur) byUser.set(uid, { count: 1, last: created, topic: (v.topic as string | null) ?? null })
    else {
      cur.count += 1
      if (created > cur.last) { cur.last = created; cur.topic = (v.topic as string | null) ?? null }
    }
  }

  // A faixa que este e-mail existe para mover: 1 a 3 vídeos, parado na janela.
  const candidates = [...byUser.entries()].filter(([, a]) =>
    a.count >= 1 && a.count <= 3 && a.last >= idleMin && a.last <= idleMax,
  )
  if (candidates.length === 0) {
    return NextResponse.json({ mode: confirm ? 'SENT' : 'DRY_RUN', eligible: 0, window, note: 'ninguém na faixa 1-3 vídeos dentro da janela' })
  }

  const ids = candidates.map(([id]) => id)
  const [{ data: profs }, { data: stamps }] = await Promise.all([
    admin.from('profiles').select('id, email, email_opted_out, video_credits, stripe_subscription_id').in('id', ids.slice(0, 1000)),
    admin.from('events').select('user_id, created_at, metadata').eq('name', STAMP).in('user_id', ids.slice(0, 1000)),
  ])
  // #23: carimbos POR PESSOA com o degrau (metadata.videos) e a hora — a
  // escada decide se este degrau já foi avisado ou se é cedo demais.
  const stampsByUser = new Map<string, MomentumStamp[]>()
  for (const s of stamps ?? []) {
    const uid = s.user_id as string | null
    if (!uid) continue
    const meta = (s.metadata ?? {}) as Record<string, unknown>
    const v = typeof meta.videos === 'number' ? meta.videos : null
    const arr = stampsByUser.get(uid) ?? []
    arr.push({ created_at: s.created_at as string, videos: v })
    stampsByUser.set(uid, arr)
  }
  const profById = new Map((profs ?? []).map((p) => [p.id as string, p]))

  // ═══ #16 — A VAGA DO MOTOR FREE ══════════════════════════════════════════
  // Quem esta sem credito so tem um filme possivel: o Kineo 1, que custa 0
  // nesta conta. Mas o free tier tem COTA (getFreeTierOffer: 1 Fast por 30d
  // com o reverse trial ligado, 3/24h sem ele) e prometer filme para quem ja
  // gastou a vaga e mandar a pessoa direto no 402. A contagem sai da MESMA
  // funcao que o /api/compose usa para recusar (countFreeFastUsage), sobre as
  // MESMAS duas fontes: a reserva (claim de custo 0) e a linha em videos.
  // Falha de leitura => mapa nulo => momentumNextFilm devolve unknown_balance
  // e ninguem do balde novo recebe. Falha fechada, sempre.
  const OFFER = getFreeTierOffer()
  const quotaWindowStart = new Date(now - OFFER.windowMs).toISOString()
  const [freeClaimsRes, freeVideosRes] = await Promise.all([
    admin.from('events').select('user_id, metadata, created_at')
      .eq('name', COMPOSE_CLAIM_EVENT).eq('path', COMPOSE_CLAIM_PATH)
      .eq('metadata->>quality', 'fast').eq('metadata->>cost', '0')
      .gte('created_at', quotaWindowStart).limit(5000),
    admin.from('videos').select('user_id, render_id')
      .eq('quality_mode', 'fast').eq('credits_used', 0)
      .gte('created_at', quotaWindowStart).limit(5000),
  ])
  const quotaReadOk = !freeClaimsRes.error && !freeVideosRes.error
  if (!quotaReadOk) {
    console.error('[momentum] free-quota read failed — ninguem do balde motor-free recebe nesta rodada:',
      freeClaimsRes.error?.message ?? freeVideosRes.error?.message)
  }
  const freeUsageByUser = quotaReadOk
    ? countFreeFastUsage({
        claims: freeClaimsRes.data ?? [],
        videos: freeVideosRes.data ?? [],
        // varredura da base inteira: linha orfa (user_id NULL apos delete) e
        // pulada, nao lancada — mesma escolha do send-credits-back.
        onUnknownUser: 'skip',
      })
    : null
  const freeQuotaLeftFor = (id: string): number | null =>
    freeUsageByUser === null ? null : Math.max(0, OFFER.limit - (freeUsageByUser.get(id) ?? 0))

  // Crédito mínimo para o próximo vídeo REALMENTE acontecer. Deriva de
  // creditCostFor — nunca número cravado (o Kineo 1 mudou de preço 3× em 2
  // dias; copy que promete o que não cabe é como quebramos 7 promessas na V6).
  //
  // ⚠ #16 — ESTE NUMERO ERA O PRECO DA CONTA ERRADA. `creditCostFor('fast',
  // true)` = 1 e o Kineo 1 para conta PAGANTE; este e-mail so fala com quem
  // NAO paga (o `stripe_subscription_id` abaixo derruba o resto), e para essa
  // conta o mesmo motor custa 0. O bar de 1 credito derrubava, em silencio,
  // 299 de 348 candidatos da janela de resgate — 215 deles com exatamente UM
  // filme, que e a coorte onde a assinatura nasce (7d: 1 filme -> 0 de 113
  // assinam; 2+ filmes -> 3 de 25). Segue derivado de creditCostFor, agora com
  // o argumento que descreve a pessoa que vai receber a carta. `minCredits`
  // sobrevive como PISO DO RAMO PAGO — e o mesmo bar de antes, e e por isso que
  // a coorte que ja recebia nao muda de carta nem de link.
  const minCredits = creditCostFor('fast', true)

  const targets: Array<{ id: string; email: string; count: number; topic: string | null; nextFilm: NextFilmKind }> = []
  const skipped = {
    same_step: 0, legacy_stamp: 0, too_soon: 0,
    // #16 — o descarte por saldo era um `continue` MUDO. Um balde que nao
    // aparece no dry-run e um defeito que ninguem consegue ver.
    too_few_credits: 0, free_quota_used: 0, unknown_balance: 0,
  }
  for (const [id, agg] of candidates) {
    const skip = momentumSkipReason(stampsByUser.get(id) ?? [], agg.count, now)
    if (skip) { skipped[skip]++; continue }
    const p = profById.get(id)
    if (!p) continue
    const email = (p.email ?? '') as string
    if (!email || p.email_opted_out || isInternalOrJunk(email)) continue
    if (p.stripe_subscription_id) continue // já é cliente
    // O custo do proximo filme e o desta conta — que, aqui, nunca e pagante.
    const freeEngineCost = creditCostFor('fast', false)
    const decision = momentumNextFilm({
      credits: (p.video_credits as number | null) ?? null,
      // `creditFloor` E o bar antigo, byte a byte: quem passava continua
      // passando, com a mesma carta e o mesmo link.
      creditFloor: minCredits,
      freeEngineCost,
      freeQuotaLeft: freeQuotaLeftFor(id),
    })
    if (!decision.ok) { skipped[decision.reason]++; continue }
    targets.push({ id, email, count: agg.count, topic: pickMomentumTopic(agg.topic), nextFilm: decision.kind })
  }

  if (!confirm) {
    return NextResponse.json({
      mode: 'DRY_RUN',
      cohort: `fez 1-3 vídeos · parado há ${window.minIdleH}-${window.maxIdleH}h · não paga · nunca recebeu este e-mail NESTE degrau (folga ${MOMENTUM_MIN_GAP_DAYS}d entre degraus) · consegue fazer o próximo filme AGORA: tem crédito (≥${minCredits}) OU o Kineo 1 sai por ${creditCostFor('fast', false)} e a vaga free (${OFFER.limit} por ${Math.round(OFFER.windowMs / 3600_000)}h) está livre`,
      window,
      via: viaCron ? 'cron' : 'admin_session',
      // #23: quantos candidatos a escada segurou, por motivo.
      skipped,
      eligible: targets.length,
      por_quantidade: {
        um_video: targets.filter((t) => t.count === 1).length,
        dois: targets.filter((t) => t.count === 2).length,
        tres: targets.filter((t) => t.count === 3).length,
      },
      // #16 — os dois ramos da carta, e o que a cota do free tier segurou.
      por_proximo_filme: {
        com_credito: targets.filter((t) => t.nextFilm === 'credits').length,
        motor_free: targets.filter((t) => t.nextFilm === 'free_engine').length,
      },
      free_quota: {
        limite: OFFER.limit,
        janela_h: Math.round(OFFER.windowMs / 3600_000),
        leitura: freeUsageByUser === null ? 'FALHOU (ninguém do balde motor-free entra)' : 'ok',
        custo_kineo1_conta_free: creditCostFor('fast', false),
      },
      exemplo_link_motor_free: buildSeriesContinuationEmailUrl(APP_URL, targets.find((t) => t.nextFilm === 'free_engine')?.topic ?? null, 'momentum_email', { utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: 'momentum', engine: 'fast' }),
      subject: 'The fourth video is the one that changes things',
      // KINEO-SPRINT-V1V4-2026-09-01 (#24) — o defeito para de ser invisivel.
      armed: false,
      why: 'sem ?confirm=SEND na URL esta rota NUNCA envia. Em vercel.json o cron chama /api/cron/send-momentum-nudge sem esse parametro desde 20/08 — momentum_nudge_sent = 0 no banco.',
      to_arm: 'trocar o path em vercel.json por "/api/cron/send-momentum-nudge?confirm=SEND" (o mesmo formato ja usado pelo send-hotlead-blast).',
      com_tema: targets.filter((t) => t.topic).length,
      topic_rule: 'linha do gancho via extractShortTitle + filtro de instrucao (lib/momentumTopic.ts); antes do #6 com_tema era 0 em 100% dos casos (topic > 90 chars)',
      sem_tema: targets.filter((t) => !t.topic).length,
      exemplo_link: buildSeriesContinuationEmailUrl(APP_URL, targets.find((t) => t.topic)?.topic ?? null, 'momentum_email', { utm_source: 'lifecycle', utm_medium: 'email', utm_campaign: 'momentum' }),
      sample: targets.slice(0, 12).map((t) => `${t.email} (${t.count}v${t.topic ? ` · ${t.topic.slice(0, 40)}` : ''})`),
      hint: 'Append &confirm=SEND to send.',
    })
  }

  let sent = 0
  const results: Array<{ email: string; outcome: string }> = []
  for (const t of targets.slice(0, MAX_PER_RUN)) {
    const { text, html } = buildEmail(t.id, t.count, t.topic, t.nextFilm)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [t.email],
          reply_to: 'hello@usekineo.com',
          subject: 'The fourth video is the one that changes things',
          text,
          html,
          headers: unsubscribeHeaders(t.id),
        }),
      })
      if (res.ok) {
        // Carimbo só no SUCESSO — falha volta na próxima rodada.
        // #23: `videos` É o degrau — a escada lê este campo para decidir o próximo.
        // #16: `next_film` separa as duas coortes na medicao — sem ele o balde
        // novo se dissolve na media do antigo e a jogada fica sem veredito.
        await admin.from('events').insert({ user_id: t.id, name: STAMP, metadata: { videos: t.count, rescue: window.rescue, via: viaCron ? 'cron' : 'admin_session', next_film: t.nextFilm } })
        sent++
        results.push({ email: t.email, outcome: 'sent' })
      } else {
        results.push({ email: t.email, outcome: `failed_${res.status}` })
      }
    } catch {
      results.push({ email: t.email, outcome: 'threw' })
    }
    await new Promise((r) => setTimeout(r, 600))
  }

  console.log(`[momentum] sent=${sent} of ${targets.length} eligible (window ${window.minIdleH}-${window.maxIdleH}h${window.rescue ? ' RESCUE' : ''}; skipped same_step=${skipped.same_step} too_soon=${skipped.too_soon} legacy=${skipped.legacy_stamp} too_few_credits=${skipped.too_few_credits} free_quota_used=${skipped.free_quota_used} unknown_balance=${skipped.unknown_balance})`)
  return NextResponse.json({
    mode: 'SENT', sent, eligible: targets.length, window, skipped, results,
    por_proximo_filme: {
      com_credito: targets.filter((t) => t.nextFilm === 'credits').length,
      motor_free: targets.filter((t) => t.nextFilm === 'free_engine').length,
    },
  })
}
