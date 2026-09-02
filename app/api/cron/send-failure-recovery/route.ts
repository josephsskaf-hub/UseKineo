import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'

// ═══ KINEO-RESGATE-FALHA-2026-08-21 — QUEM TENTOU E NÃO CONSEGUIU ════════
//
// Nasceu de um caso real desta madrugada: tsatsraljess@gmail.com criou conta
// às 04:35, tentou fazer vídeo TRÊS vezes, falhou nas três por um bug nosso
// (divergência de custo entre o nascimento do render e a reserva do compose),
// e foi embora sem um único vídeo. Os créditos voltaram sozinhos — o estorno
// automático funcionou — mas ninguém falou com ela.
//
// O buraco que isto fecha: já existe o `send-blackout-winback`, mas ele só
// dispara quando há APAGÃO DE FORNECEDOR detectado (marcadores de quota). Um
// bug NOSSO não acende aquele alarme, então a pessoa que ele derruba fica
// invisível. Este cron cobre o outro caso: falhou, não tem vídeo nenhum, e
// o problema não era saldo nem regra de negócio — era defeito.
//
// POR QUE ELA É A LISTA MAIS QUENTE QUE EXISTE: já quis usar o produto (fez
// conta, escreveu o tema, apertou gerar — três vezes) e ainda tem os créditos
// intactos. Não precisa ser convencida do valor; precisa saber que agora
// funciona. É o oposto de mandar cupom para quem esfriou, que é o que
// medimos hoje dando ZERO (34 e-mails do CREATOR20 → 2 visitas, 0 vídeos).
//
// SEM CUPOM, DE PROPÓSITO. Desconto aqui seria trocar um pedido de desculpas
// por uma promoção — e ensina que falha rende prêmio. O que ela precisa é
// saber que o problema era nosso, que está resolvido, e que os créditos dela
// continuam lá.
//
// Guard rails: CRON_SECRET fail-closed · só quem NUNCA completou vídeo · só
// falhas de DEFEITO (mensagens de saldo/regra são excluídas — aquilo não é
// bug, é produto funcionando) · 1× por pessoa para sempre · respeita opt-out.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STAMP = 'failure_recovery_sent'
const MAX_PER_RUN = 25
const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'

// Mensagens que NÃO são defeito — são o produto dizendo "não" corretamente.
// Mandar "desculpa, era nosso" para quem ficou sem crédito seria mentira.
const NAO_E_BUG = [
  'credits',
  'Add a plan',
  'Upgrade',
  'not included in your trial',
  'full capacity',
  "can't depict real people",
  'trial has',
  // sprint-assinaturas #5 (02/09): um render seu ainda segurando crédito é
  // regra, não defeito — o crédito volta sozinho quando ele termina/estorna.
  'still holding',
  'already started is still',
]

// ═══ sprint-assinaturas #5 — 02/09/2026 — O CRON IA MENTIR PARA A LISTA MAIS QUENTE
//
// Medido antes do 1º disparo real (o vercel.json só ganhou ?confirm=SEND em
// 01/09 às 21:16; o cron dormiu 30 dias em DRY_RUN): dos 11 elegíveis das
// últimas 48h, SETE falharam com "Your script is about 23 seconds of
// narration, but you asked for a 35-second video… Add about 23 more words".
// Isso NÃO é bug — é o produto recusando um vídeo com 12s de música sem
// história. Em 14 dias foi a maior causa individual de falha de gente real
// (24 falhas · 19 pessoas · 4 delas com os 25cr do trial intactos e ZERO
// vídeo). O e-mail de defeito diria a elas "that was our fault, a bug on our
// side, and it is fixed now — the same idea will work now". Três mentiras em
// duas linhas: não era nosso, não está "consertado", e a mesma ideia com o
// mesmo roteiro falha de novo igualzinho. Quem clica, falha, e agora sabe
// que a marca mente.
//
// O que a pessoa precisa é o oposto: os NÚMEROS dela (narração de Xs, vídeo
// pedido de Ys, faltam ~N palavras) e as duas saídas de 30 segundos —
// escolher a duração mais perto da narração, ou colar o roteiro com N
// palavras a mais. Crédito intacto, sem desculpa falsa, sem cupom.
//
// O carimbo continua sendo `failure_recovery_sent` (1× por pessoa para
// sempre), com metadata.kind = 'bug' | 'script_short' para medir separado.
const RE_SCRIPT_SHORT =
  /about (\d+) seconds? of narration.*?(\d+)-second video.*?add about (\d+) more words?/i

// sprint-assinaturas #6 (02/09 00:20): o MESMO motivo chega ao banco numa 2a
// forma, SEM numeros — `no_detail:narration_too_short|stage=failed|http=none`
// (2 pessoas de trial com 25cr intactos e zero video so na ultima hora). A regex
// acima exige os 3 numeros e deixava esse caso cair em `bug` → desculpa falsa
// as 03:00 BRT. Agora e script_short sem numeros e recebe a versao generica do
// mesmo e-mail (sem inventar segundos que nao temos).
const RE_NARRATION_SHORT_CODE = /narration_too_short|narration_guard/i

// ═══ sprint-assinaturas #15 — 02/09/2026 06:00 UTC — O 1º DISPARO REAL MANDOU
// O CONSELHO AO CONTRÁRIO
//
// adrianwellsvadrian (chatgpt.com, trial 25cr, 0 vídeos): às 02:52 UTC o
// roteiro tinha 27s para um vídeo de 35s → "Add about 14 more words" (certo).
// Ele obedeceu — e voltou com 6.228 caracteres para um vídeo de 90s. Entre
// 03:09 e 03:30 bateu SETE vezes em `prompt_len=6228 limite=5000`, e às 06:00
// este cron mandou a ele "your script was about 27 seconds of narration…
// add about 14 more words". Duas causas, as duas fechadas aqui:
//   1. só `generate_failed` era lido. O teto de 5.000 é barrado NO CLIENTE
//      (GenerateClient, 31/08) e só emite `generation_stage_error` com
//      reason `analyze_prompt_too_long` — invisível para o cron;
//   2. o mapa por pessoa guardava o PRIMEIRO erro da janela e ignorava os
//      seguintes. Quem tenta, lê a mensagem, muda o texto e falha por OUTRO
//      motivo recebia o e-mail do motivo velho.
// Agora: as duas fontes entram, o erro MAIS RECENTE da pessoa decide, e o
// roteiro comprido tem e-mail próprio com os números dela (caracteres, teto,
// e quantas palavras a duração escolhida realmente pede). Se o erro mais
// recente for "não é bug" (saldo/regra), a pessoa sai — o produto disse não
// por último, e desculpa ali seria mentira.
const RE_PROMPT_LONG = /prompt is too long|analyze_prompt_too_long|prompt_len=\d+/i
const RE_PROMPT_LEN = /prompt_len=(\d+)(?:\s+limite=(\d+))?/i
// Mesma régua do contador do Studio (~2,3 palavras por segundo de narração).
const WORDS_PER_SEC = 2.3
const PROMPT_MAX_CHARS_FALLBACK = 5000

type Kind = 'bug' | 'script_short' | 'script_long'
type ScriptShort = { narrationSec: number; requestedSec: number; wordsMissing: number }
type ScriptLong = { chars: number; limit: number; durationSec: number | null }
type FalhaMeta = { reason?: unknown; duration?: unknown }

function classifyFailure(erro: string, meta?: FalhaMeta): { kind: Kind; short?: ScriptShort; long?: ScriptLong } {
  const flat = erro.replace(/\s+/g, ' ')
  const m = flat.match(RE_SCRIPT_SHORT)
  if (m) {
    return {
      kind: 'script_short',
      short: { narrationSec: Number(m[1]), requestedSec: Number(m[2]), wordsMissing: Number(m[3]) },
    }
  }
  if (RE_NARRATION_SHORT_CODE.test(erro)) return { kind: 'script_short' }
  if (RE_PROMPT_LONG.test(flat) || String(meta?.reason ?? '') === 'analyze_prompt_too_long') {
    const l = flat.match(RE_PROMPT_LEN)
    const chars = l && l[1] ? Number(l[1]) : 0
    const limit = l && l[2] ? Number(l[2]) : PROMPT_MAX_CHARS_FALLBACK
    const d = Number(meta?.duration)
    return { kind: 'script_long', long: { chars, limit, durationSec: Number.isFinite(d) && d > 0 ? d : null } }
  }
  return { kind: 'bug' }
}

// #15: e-mail do roteiro COMPRIDO. Mesma verdade do curto, sentido oposto:
// nada cobrado, os números dela, e o conserto de 30 segundos (colar só a
// narração). Sem "our fault", sem cupom, sem motor.
function buildScriptLongEmail(userId: string, credits: number, l: ScriptLong) {
  const url = `${APP}/studio?utm_source=lifecycle&utm_medium=email&utm_campaign=failure_recovery_script_long`
  const fmt = (n: number) => n.toLocaleString('en-US')
  const words = l.durationSec ? Math.round((l.durationSec * WORDS_PER_SEC) / 5) * 5 : null
  const oQue =
    l.chars > 0
      ? `the text you pasted was ${fmt(l.chars)} characters, and the script box takes up to ${fmt(l.limit)}`
      : `the text you pasted was longer than the ${fmt(l.limit)}-character limit of the script box`
  const quanto =
    words && l.durationSec
      ? `A ${l.durationSec}-second video only needs about ${words} words of narration — roughly ${fmt(Math.round(words * 6))} characters.`
      : `A short video only needs a few hundred words of narration.`
  const text = `Hey,

Your video didn't render — and nothing was charged. Your ${credits} credits are all still there.

Here's exactly what happened: ${oQue}. ${quanto}

The 30-second fix: paste only the narration — the words you want spoken, not the whole conversation or the notes around it — and render again: ${url}

If it still fails, hit reply and paste what you typed. It lands with a real person.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>Your video didn't render — and <strong>nothing was charged</strong>. Your <strong>${credits} credits</strong> are all still there.</p>
  <p>Here's exactly what happened: ${oQue}. ${quanto}</p>
  <p><strong>The 30-second fix:</strong> paste only the narration — the words you want spoken, not the whole conversation or the notes around it — and render again.</p>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Paste the narration and render →</a></p>
  <p>If it still fails, hit reply and paste what you typed. It lands with a real person.</p>
  <p style="margin:0 0 2px">Kineo Team</p>
  <p style="margin:0"><a href="https://www.usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

function buildScriptShortEmail(userId: string, credits: number, s?: ScriptShort) {
  if (!s) return buildScriptShortGenericEmail(userId, credits)
  const url = `${APP}/studio?utm_source=lifecycle&utm_medium=email&utm_campaign=failure_recovery_script`
  const text = `Hey,

Your video didn't render — and nothing was charged. Your ${credits} credits are all still there.

Here's exactly what happened: your script was about ${s.narrationSec} seconds of narration, but you picked a ${s.requestedSec}-second video. That would leave the last ${Math.max(1, s.requestedSec - s.narrationSec)} seconds with music and no story, so Kineo stopped instead of rendering a weak ending.

Two ways to fix it in 30 seconds:

1. Paste the same script and pick the video length closest to ${s.narrationSec} seconds.
2. Or keep ${s.requestedSec} seconds and add about ${s.wordsMissing} more words to the script.

Either one renders: ${url}

If it still fails, hit reply and paste what you typed. It lands with a real person.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>Your video didn't render — and <strong>nothing was charged</strong>. Your <strong>${credits} credits</strong> are all still there.</p>
  <p>Here's exactly what happened: your script was about <strong>${s.narrationSec} seconds</strong> of narration, but you picked a <strong>${s.requestedSec}-second</strong> video. That would leave the last ${Math.max(1, s.requestedSec - s.narrationSec)} seconds with music and no story, so Kineo stopped instead of rendering a weak ending.</p>
  <p><strong>Two ways to fix it in 30 seconds:</strong></p>
  <ol style="padding-left:20px;margin:0 0 16px">
    <li>Paste the same script and pick the video length closest to <strong>${s.narrationSec} seconds</strong>.</li>
    <li>Or keep ${s.requestedSec} seconds and add about <strong>${s.wordsMissing} more words</strong> to the script.</li>
  </ol>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Fix it and render →</a></p>
  <p>If it still fails, hit reply and paste what you typed. It lands with a real person.</p>
  <p style="margin:0 0 2px">Kineo Team</p>
  <p style="margin:0"><a href="https://www.usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

// Versao sem numeros (#6): o codigo `narration_too_short` nao traz segundos
// nem palavras. Mesma verdade, sem cravar o que nao medimos.
function buildScriptShortGenericEmail(userId: string, credits: number) {
  const url = `${APP}/studio?utm_source=lifecycle&utm_medium=email&utm_campaign=failure_recovery_script`
  const text = `Hey,

Your video didn't render — and nothing was charged. Your ${credits} credits are all still there.

Here's exactly what happened: the script you typed was shorter than the video length you picked. That would leave the ending with music and no story, so Kineo stopped instead of rendering a weak video.

Two ways to fix it in 30 seconds:

1. Paste the same script and pick a shorter video length.
2. Or keep the length and add a few more sentences to the script.

Either one renders: ${url}

If it still fails, hit reply and paste what you typed. It lands with a real person.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>Your video didn't render — and <strong>nothing was charged</strong>. Your <strong>${credits} credits</strong> are all still there.</p>
  <p>Here's exactly what happened: the script you typed was <strong>shorter than the video length you picked</strong>. That would leave the ending with music and no story, so Kineo stopped instead of rendering a weak video.</p>
  <p><strong>Two ways to fix it in 30 seconds:</strong></p>
  <ol style="padding-left:20px;margin:0 0 16px">
    <li>Paste the same script and pick a <strong>shorter video length</strong>.</li>
    <li>Or keep the length and <strong>add a few more sentences</strong> to the script.</li>
  </ol>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Fix it and render →</a></p>
  <p>If it still fails, hit reply and paste what you typed. It lands with a real person.</p>
  <p style="margin:0 0 2px">Kineo Team</p>
  <p style="margin:0"><a href="https://www.usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function isInternalOrJunk(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') || e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') || e.startsWith('test') ||
    e.includes('mailinator') || e.startsWith('smoketest')
  )
}

function buildEmail(userId: string, credits: number) {
  const url = `${APP}/studio?utm_source=lifecycle&utm_medium=email&utm_campaign=failure_recovery`
  const text = `Hey,

You tried to make a video with Kineo and it failed. That was our fault, not yours — a bug on our side, and it is fixed now.

Your ${credits} credits were never spent. They are still sitting in your account, waiting.

If you have two minutes, the same idea will work now: ${url}

And if it fails again, hit reply and tell me exactly what you typed. It lands with a real person, and I will look at it myself.

Sorry for wasting your first try.

Kineo Team
usekineo.com`

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>You tried to make a video with Kineo and it failed. <strong>That was our fault, not yours</strong> — a bug on our side, and it is fixed now.</p>
  <p>Your <strong>${credits} credits</strong> were never spent. They are still sitting in your account, waiting.</p>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Try the same idea again →</a></p>
  <p>And if it fails again, hit reply and tell me exactly what you typed. It lands with a real person, and I will look at it myself.</p>
  <p>Sorry for wasting your first try.</p>
  <p style="margin:0 0 2px">Kineo Team</p>
  <p style="margin:0"><a href="https://www.usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const resendKey = process.env.RESEND_API_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!resendKey || !url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 503 })

  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'

  // Falhas das últimas 48h. Janela curta de propósito: "desculpa pelo bug de
  // ontem" tem valor; "desculpa pelo bug da semana passada" já soa a descaso.
  const desde = new Date(Date.now() - 48 * 3600_000).toISOString()
  // #15: duas fontes. `generate_failed` = falha confirmada pelo servidor;
  // `generation_stage_error` com reason `analyze_prompt_too_long` = recusa
  // determinística barrada no cliente (nunca vira generate_failed).
  const [{ data: falhas }, { data: longas }] = await Promise.all([
    admin
      .from('events')
      .select('user_id, created_at, metadata')
      .eq('name', 'generate_failed')
      .gte('created_at', desde)
      .limit(500),
    admin
      .from('events')
      .select('user_id, created_at, metadata')
      .eq('name', 'generation_stage_error')
      .eq('metadata->>reason', 'analyze_prompt_too_long')
      .gte('created_at', desde)
      .limit(500),
  ])

  type Falha = { user_id: string | null; created_at: string; metadata: unknown }
  const todas: Falha[] = [...((falhas ?? []) as Falha[]), ...((longas ?? []) as Falha[])].sort((a, b) =>
    String(a.created_at).localeCompare(String(b.created_at)),
  )

  // Por pessoa: quantas falhas de defeito/regra-de-roteiro, e o erro MAIS
  // RECENTE (a última coisa que o produto disse a ela). Uma falha "não é bug"
  // no meio não zera a contagem, mas se for a ÚLTIMA, a pessoa sai — o
  // produto disse não por último, e desculpa ali seria mentira.
  const porPessoa = new Map<string, { n: number; erro: string; meta: FalhaMeta; naoEBug: boolean }>()
  for (const f of todas) {
    const uid = f.user_id
    if (!uid) continue
    const meta = (f.metadata ?? {}) as { error?: unknown; reason?: unknown; duration?: unknown }
    const erro = String(meta.error ?? '')
    // Só defeito. Saldo/regra/limite não são bug — o produto funcionou.
    const naoEBug = NAO_E_BUG.some((frag) => erro.toLowerCase().includes(frag.toLowerCase()))
    const cur = porPessoa.get(uid) ?? { n: 0, erro, meta: {}, naoEBug }
    if (!naoEBug) cur.n += 1
    cur.erro = erro
    cur.meta = { reason: meta.reason, duration: meta.duration }
    cur.naoEBug = naoEBug
    porPessoa.set(uid, cur)
  }
  for (const [uid, cur] of porPessoa) if (cur.n === 0 || cur.naoEBug) porPessoa.delete(uid)
  if (porPessoa.size === 0) {
    return NextResponse.json({ mode: confirm ? 'SENT' : 'DRY_RUN', eligible: 0, note: 'nenhuma falha de defeito em 48h' })
  }

  const ids = [...porPessoa.keys()]
  const [{ data: profs }, { data: stamps }, { data: comVideo }] = await Promise.all([
    admin.from('profiles').select('id, email, email_opted_out, video_credits').in('id', ids),
    admin.from('events').select('user_id').eq('name', STAMP).in('user_id', ids),
    admin.from('videos').select('user_id').eq('status', 'completed').in('user_id', ids),
  ])
  const jaAvisado = new Set((stamps ?? []).map((s) => s.user_id as string))
  const jaTemVideo = new Set((comVideo ?? []).map((v) => v.user_id as string))

  const alvos: Array<{ id: string; email: string; credits: number; falhas: number; erro: string; kind: Kind; short?: ScriptShort; long?: ScriptLong }> = []
  for (const p of profs ?? []) {
    const id = p.id as string
    if (jaAvisado.has(id)) continue
    // Quem JÁ conseguiu um vídeo não precisa de desculpa — a falha foi um
    // tropeço no meio, não a experiência inteira.
    if (jaTemVideo.has(id)) continue
    const email = (p.email ?? '') as string
    if (!email || p.email_opted_out || isInternalOrJunk(email)) continue
    const info = porPessoa.get(id)!
    const cls = classifyFailure(info.erro, info.meta)
    alvos.push({ id, email, credits: (p.video_credits as number) ?? 0, falhas: info.n, erro: info.erro.slice(0, 90), kind: cls.kind, short: cls.short, long: cls.long })
  }

  if (!confirm) {
    return NextResponse.json({
      mode: 'DRY_RUN',
      cohort: 'falhou por DEFEITO nas últimas 48h · nunca completou um vídeo · nunca recebeu este e-mail',
      eligible: alvos.length,
      by_kind: {
        bug: alvos.filter((a) => a.kind === 'bug').length,
        script_short: alvos.filter((a) => a.kind === 'script_short').length,
        script_long: alvos.filter((a) => a.kind === 'script_long').length,
      },
      sample: alvos.slice(0, 15).map((a) => `${a.email} (${a.kind} · ${a.falhas}x · ${a.credits}cr · ${a.erro})`),
      hint: 'Append &confirm=SEND to send.',
    })
  }

  let sent = 0
  const results: Array<{ email: string; outcome: string }> = []
  for (const a of alvos.slice(0, MAX_PER_RUN)) {
    const { text, html } =
      a.kind === 'script_short'
        ? buildScriptShortEmail(a.id, a.credits, a.short)
        : a.kind === 'script_long' && a.long
          ? buildScriptLongEmail(a.id, a.credits, a.long)
          : buildEmail(a.id, a.credits)
    const subject =
      a.kind === 'script_short' || a.kind === 'script_long'
        ? "Your video didn't render — here's the 30-second fix (credits untouched)"
        : 'That was our fault — your credits are still there'
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Joseph at Kineo <joseph@usekineo.com>',
          to: [a.email],
          reply_to: 'joseph@usekineo.com',
          subject,
          text,
          html,
          headers: unsubscribeHeaders(a.id),
        }),
      })
      if (res.ok) {
        await admin.from('events').insert({ user_id: a.id, name: STAMP, metadata: { falhas: a.falhas, credits: a.credits, kind: a.kind } })
        sent++
        results.push({ email: a.email, outcome: `sent_${a.kind}` })
      } else results.push({ email: a.email, outcome: `failed_${res.status}` })
    } catch {
      results.push({ email: a.email, outcome: 'threw' })
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`[failure-recovery] sent=${sent} of ${alvos.length}`)
  return NextResponse.json({ mode: 'SENT', sent, eligible: alvos.length, results })
}
