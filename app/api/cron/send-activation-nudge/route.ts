import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { LIFECYCLE_SKIP_STAMP } from '@/lib/lifecycle/skipStamp'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import { getViralNowTopics } from '@/lib/viralTopics'
import { composerUrl } from '@/lib/lifecycle/composerUrl'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = atual).
const OFFER = getFreeTierOffer()

// send-activation-nudge — Push #426
//
// D0 activation email. Only 1 in 244 signups ever used the free AI video —
// people sign up, get distracted, and never feel the "wow". This cron runs
// hourly and emails users who signed up 1–6 hours ago and still haven't
// generated ANY video: "your first AI video is free, one click away".
//
// Guard rails: max 1 nudge per user ever (profiles.activation_nudge_sent_at),
// skips test/founder accounts, skips anyone who already generated or paid.

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
// Push #431 — Joseph's rule: no personal name on outbound. Activation nudge is
// lead-nurture → goes out as the TEAM from hello@ (support@ = support only).
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial'])

function isTestEmail(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') ||
    e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') ||
    e.startsWith('test') ||
    e.includes('mailinator') ||
    e.startsWith('smoketest')
  )
}

// KINEO-CRON-FAILCLOSED-2026-07-27 — era `if (!cronSecret) return true`.
// Endpoint que dispara e-mail não fica público porque uma env sumiu. Padrão de
// referência: app/api/cron/autopilot-generate/route.ts:78.
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

// ═══ KINEO-PRIMEIRO-EPISODIO-PRONTO-2026-09-06 (sprint-assinaturas #21) ════
//
// O NUMERO: esta e a carta de MAIOR ALCANCE da casa — 249 envios em 30 dias,
// contra 21 da campanha mais recente. E ela funciona: 13 dessas pessoas
// entregaram um filme depois (5,2%), 9 em menos de 48h, e **2 pagaram**. Numa
// casa com 6 pagantes em 30 dias, isso e um terco do dinheiro passando por
// aqui. (Correlacao, nao causalidade — mas e a maior superficie que existe.)
//
// O QUE ELA FAZ DE ERRADO, e e o mesmo erro de toda a casa: ela PEDE. Diz
// "type any idea" com dois exemplos entre parenteses e manda para um campo em
// branco. Formulario em branco e onde a sessao morre — foi essa a leitura que
// criou o episodio 2 (#14) e a temporada (#18), e as duas medicoes que a casa
// tem apontam para o mesmo lado: quando a porta ja vem com o tema dentro, ~50%
// dos cliques viram filme em 30 minutos, contra 6,6% de base.
//
// AGORA ELA ENTREGA: tres primeiros episodios concretos, cada um a um clique,
// com o tema ja dentro do compositor. O material ja existia e nao custa nada —
// `lib/viralTopics` e uma funcao PURA (semente determinstica de 4h, sem
// banco, sem modelo). Nao ha chamada nova, nao ha centavo novo.
//
// ⚠️ O PREFILL E O TITULO, NAO O `prompt` DO TOPICO. O campo `prompt` do pool
// e um roteiro estruturado inteiro (com marcadores HOOK/PAYOFF), e
// `composerUrl` corta em 120 caracteres — cortar um roteiro no meio de um
// marcador e exatamente a classe de erro do "menino da bolha" (27/08). O
// titulo tem 31 a 45 caracteres, cabe inteiro, e a AUTO-STRUCTURE (#310) ja
// sabe transformar um tema curto em roteiro estruturado.
//
// ⚠️ FALHA ABERTA: se o pool nao devolver 3 topicos utilizaveis, `episodios`
// e vazio e a carta sai EXATAMENTE como saia antes desta peca.
type EpisodioPronto = { titulo: string; gancho: string; href: string }

function episodiosProntos(): EpisodioPronto[] {
  try {
    const pool = getViralNowTopics()
    if (!Array.isArray(pool)) return []
    const out: EpisodioPronto[] = []
    for (const t of pool) {
      const titulo = typeof t?.title === 'string' ? t.title.trim() : ''
      if (!titulo || titulo.length > 120) continue
      const gancho = typeof t?.hook === 'string' ? t.hook.trim().split('\n')[0].slice(0, 110) : ''
      out.push({
        titulo,
        gancho,
        href: composerUrl({ base: APP_URL, campaign: 'd0_activation_topic', prompt: titulo }),
      })
      if (out.length === 3) break
    }
    // Ou os tres, ou nenhum: uma carta com um unico exemplo le como
    // "nao tinham mais ideias", e duas colunas ficam tortas no cliente de
    // e-mail. Mesma regra da temporada (#18).
    return out.length === 3 ? out : []
  } catch {
    return []
  }
}

// KINEO-UNSUBSCRIBE-2026-07-26 — recebe userId para o rodapé de descadastro.
function buildEmail(userId: string, episodios: EpisodioPronto[] = []) {
  // KINEO-ACTIVATION-COPY-2026-07-06 — free plan gives 2 free videos, NOT
  // "30 credits" (stale copy that misled every signup). Short, founder-to-user
  // tone, one CTA to the video creator.
  const url = `${APP_URL}/generate?utm_source=lifecycle&utm_medium=email&utm_campaign=d0_activation`
  // Sem os tres episodios, as duas variaveis sao string vazia e a carta sai
  // como saia antes — a unica diferenca e que a frase deixou de listar dois
  // exemplos entre parenteses (que ninguem podia clicar).
  // ⚠️ O DIFF CONTRA A PRODUCAO PEGOU ISTO ANTES DE SUBIR: na primeira versao
  // eu tirava os dois exemplos entre parenteses SEMPRE. No caminho de falha
  // aberta (sem episodios) isso deixava a carta com MENOS concretude que a de
  // hoje — ou seja, a "protecao" piorava o e-mail. Os exemplos so saem quando
  // os tres episodios de verdade entram no lugar deles.
  const exemplosText = episodios.length
    ? 'You type a topic, the AI writes the script, adds the voiceover, captions and footage.'
    : 'Type any idea ("the Bermuda Triangle mystery", "how Bezos starts his day") and the AI writes the script, adds the voiceover, captions and footage.'
  const esc = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const episodiosTexto = episodios.length
    ? `
Three that are working right now — each one opens the studio with the topic already in the box:

${episodios.map((e, i) => `${i + 1}. ${e.titulo}\n   ${e.href}`).join('\n\n')}
`
    : ''
  const episodiosHtml = episodios.length
    ? `<p style="margin:0 0 10px;font-size:14px;color:#475569;">Three that are working right now — each one opens the studio with the topic already in the box:</p>
  <table style="border-collapse:separate;border-spacing:0 8px;width:100%;margin:0 0 18px;">${episodios
    .map(
      (e) => `<tr><td style="border:1px solid #e6e8ec;border-radius:10px;padding:12px 14px;">
    <a href="${e.href}" style="color:#111;text-decoration:none;font-weight:bold;font-size:15px;">${esc(e.titulo)}</a>
    ${e.gancho ? `<div style="color:#64748b;font-size:13px;margin-top:4px;">${esc(e.gancho)}</div>` : ''}
    <div style="margin-top:8px;"><a href="${e.href}" style="color:#2997ff;text-decoration:none;font-size:13px;font-weight:bold;">Make this one &rarr;</a></div>
  </td></tr>`,
    )
    .join('')}</table>`
    : ''

  const text = `Hey,

It's the team at Kineo. You signed up a little while ago but haven't made your first video yet — so here's a nudge, because the first one is the fun part.

${ft(OFFER, 'Create, watch, download and share up to 3 watermarked Fast videos every 24 hours with no card.', OFFER.copy.headline)} ${exemplosText}
${episodiosTexto}
Make your first video here: ${url}

Stuck on anything? Just reply to this email — a real person reads every message.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">It's the team at Kineo. You signed up a little while ago but haven't made your first video yet — so here's a nudge, because the first one is the fun part.</p>
  <p style="margin:0 0 14px;">${ft(OFFER, 'Create, watch, download and share up to <strong>3 watermarked Fast videos every 24 hours</strong> with no card.', OFFER.copy.headline)} ${exemplosText}</p>
  ${episodiosHtml}
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Make my first video →</a></p>
  <p style="margin:0 0 14px;">Stuck on anything? Just reply to this email — a real person reads every message.</p>
  <p style="margin:0 0 2px;">Kineo Team</p>
  <p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>
</div>
${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Keep every non-approved segment untouched during the Lote 1 micro-test.
  if (!LIFECYCLE_EMAILS_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'lifecycle_email_gate' })
  }
  if (!RESEND_API_KEY) {
    console.error('[send-activation-nudge] RESEND_API_KEY not set')
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
    // cache. O reenvio triplo do send-cap-hit nasceu disso; este job lia pelo
    // mesmo caminho. Ver lib/lifecycle/freshFetch.ts.
    global: { fetch: freshFetch },
  })

  // Users created 1–6h ago, never nudged, still on free plan.
  //
  // KINEO-ACTIVATION-WINDOW-2026-07-27 — de volta para 6h, o desenho original.
  // A janela tinha sido alargada para 30h por um motivo que venceu: "Vercel
  // Hobby only allows DAILY crons". A conta é Pro (confirmado pelo fundador em
  // 27/07/2026) e este cron passou a rodar de hora em hora, então a janela
  // larga só servia para mandar um e-mail de "primeiro vídeo" até 30h depois
  // do cadastro — bem longe do momento em que a intenção ainda existe.
  //
  // Com cron horário, cada cadastro tem ~5 execuções dentro da janela de 1–6h,
  // então uma falha isolada do cron não faz ninguém perder o nudge. Uma
  // interrupção maior que 5h consecutivas, sim: quem cadastrou naquele intervalo
  // sai da janela e nunca é nudgeado. É o preço de um e-mail que chega na hora
  // certa, e o mesmo risco que o desenho original já aceitava.
  const from = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const to = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()

  const { data: candidates, error } = await admin
    .from('profiles')
    .select('id, email, plan, created_at, activation_nudge_sent_at')
    .gte('created_at', from)
    .lte('created_at', to)
    .is('activation_nudge_sent_at', null)
    // KINEO-UNSUBSCRIBE-2026-07-26 — quem pediu para sair NUNCA entra em coorte.
    .eq('email_opted_out', false)

  if (error) {
    console.error('[send-activation-nudge] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // KINEO-LIFECYCLE-SUPPRESSION-2026-07-27 — trava cruzada de 24h entre os 4
  // jobs de ciclo de vida. Falha FECHADA (ver lib/lifecycle/suppression.ts).
  const suppression = await loadLifecycleSuppression(
    admin,
    (candidates ?? []).map((u) => u.id as string),
  )

  let sent = 0
  let skipped = 0
  let suppressed = 0

  // Calculado UMA vez por execucao: a funcao e determinstica por janela de
  // 4h, entao calcular por pessoa seria trabalho repetido — e abriria a chance
  // de duas pessoas do MESMO lote receberem listas diferentes se a janela
  // virasse no meio do envio.
  const episodiosDoLote = episodiosProntos()
  for (const u of candidates ?? []) {
    // Suprimido = recebeu outro e-mail de ciclo de vida nas últimas 24h.
    // NÃO carimba `activation_nudge_sent_at` — o usuário continua elegível na
    // próxima execução horária enquanto estiver dentro da janela de 1–6h.
    if (suppression.isSuppressed(u.id as string)) {
      suppressed++
      continue
    }

    const email = u.email?.trim()
    const plan = (u.plan ?? 'free').toLowerCase()

    // Plano é REVERSÍVEL e o carimbo é VITALÍCIO: carimbar um pagante aqui o
    // queima para sempre caso ele volte para o free. Pagante só pula, sem
    // carimbo. (mesmo desenho que send-cap-hit já usava)
    if (email && !isTestEmail(email) && PAID_PLANS.has(plan)) {
      skipped++
      continue
    }

    // Sem e-mail / conta de teste: isto nunca muda, então carimba para não
    // reconsiderar a linha — mas com o SENTINELA DE PULO, que a supressão de
    // 24h ignora. KINEO-SKIP-STAMP-2026-08-05.
    if (!email || isTestEmail(email)) {
      skipped++
      await admin
        .from('profiles')
        .update({ activation_nudge_sent_at: LIFECYCLE_SKIP_STAMP })
        .eq('id', u.id)
      continue
    }

    // Already generated a video? They're activated — no nudge needed.
    const { count } = await admin
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
    if ((count ?? 0) > 0) {
      skipped++
      // ⚠️ ESTE É O CARIMBO QUE CALOU O CAP-HIT EM 05/08. "Já gerou vídeo" é
      // irreversível, então continua carimbando para nunca reconsiderar — mas
      // com o SENTINELA, porque quem acabou de gerar vídeo é exatamente quem
      // pode bater no teto minutos depois e precisa receber o e-mail do muro.
      await admin
        .from('profiles')
        .update({ activation_nudge_sent_at: LIFECYCLE_SKIP_STAMP })
        .eq('id', u.id)
      continue
    }

    // KINEO-NUDGE-WRONG-EMAIL-2026-08-13 — QUEM JÁ TENTOU NÃO RECEBE
    // "VENHA FAZER SEU PRIMEIRO VÍDEO".
    //
    // Medido no banco em 13/08 (não herdado de doc): **227 pessoas receberam
    // este e-mail DEPOIS de já terem apertado o botão de gerar.** Delas, 9
    // (4,0%) produziram um vídeo em seguida. As outras 218 tinham acabado de
    // ver uma geração morrer e receberam, 1 a 6 horas depois, um convite
    // animado para começar — escrito na premissa de que nunca tinham tentado.
    //
    // Para quem está do outro lado isso é pior do que silêncio: prova que a
    // casa não percebeu. E a coorte inteira do stalled-rescue (231 pessoas,
    // `app/api/admin/send-stalled-rescue`) é feita exatamente destas pessoas —
    // 219 delas já tinham este carimbo quando eu medi.
    //
    // O e-mail certo para elas existe, está revisado e agora tem cron próprio
    // (`app/api/cron/send-stalled-rescue`, rampa diária). O único conserto que
    // falta é este: parar de gastar o primeiro contato com a mensagem errada.
    //
    // CARIMBA COM O SENTINELA, e a escolha é o ponto todo:
    //   · sem carimbo, a linha voltaria a cada execução horária dentro da
    //     janela de 1–6h, gastando consulta e sem nunca mandar nada;
    //   · com carimbo NORMAL, a supressão cruzada de 24h leria a data e
    //     silenciaria o stalled-rescue por um dia inteiro — eu teria calado o
    //     e-mail certo com o registro de ter recusado o errado, que é o mesmo
    //     modo de falha que a sprint das 11h de hoje encontrou no send-recovery;
    //   · com o SENTINELA (KINEO-SKIP-STAMP-2026-08-05), a linha fica resolvida
    //     para este job e **continua elegível hoje mesmo** para o rescue.
    const { count: attempts } = await admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      // As DUAS grafias que este banco dispara juntas. Conferir só uma
      // encobriria metade da coorte — a mesma armadilha documentada no
      // docblock de send-stalled-rescue.
      .in('name', ['generate_started', 'video_generation_started'])
    if ((attempts ?? 0) > 0) {
      skipped++
      await admin
        .from('profiles')
        .update({ activation_nudge_sent_at: LIFECYCLE_SKIP_STAMP })
        .eq('id', u.id)
      continue
    }

    const { text, html } = buildEmail(u.id, episodiosDoLote)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          reply_to: 'hello@usekineo.com',
          // O assunto nomeia o PRIMEIRO episodio quando ele existe: e a
          // mesma licao da carta do episodio 2 (#15) — a isca e o que a pessoa
          // nunca viu, nao um lembrete de que ela nao fez nada. Sem episodios,
          // volta byte a byte para o assunto de sempre.
          subject:
            episodiosDoLote.length > 0
              ? `Your first video: "${episodiosDoLote[0].titulo}"`
              : 'Your first Fast video is a few minutes away',
          text,
          html,
          headers: unsubscribeHeaders(u.id),
        }),
      })

      if (res.ok) {
        sent++
        await admin
          .from('profiles')
          .update({ activation_nudge_sent_at: new Date().toISOString() })
          .eq('id', u.id)
        console.log(`[send-activation-nudge] sent to ${email}`)
      } else {
        console.error(`[send-activation-nudge] resend failed for ${email}:`, await res.text())
        // not marked — retried next hour
      }
    } catch (err) {
      console.error(`[send-activation-nudge] error for ${email}:`, err)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total: (candidates ?? []).length,
    suppressed_recent_lifecycle: suppressed,
    suppression_degraded: suppression.degraded,
  })
}
