import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { CREATOR_PRICE, BEST_COST_PER_FILM, CREATOR_AI_FILMS } from '@/lib/marketingPrice'

// ═══ KINEO-FIRST50-QUENTES-2026-08-21 ══════════════════════════════════════
//
// ⚠️⚠️ ESTA ROTA NÃO TEM CRON, E ISSO É A DECISÃO MAIS IMPORTANTE DO ARQUIVO.
//
// Hoje, 21/08, a campanha `send-oneoff-unlock` mandou o MESMO e-mail 8 vezes
// para as mesmas 29 pessoas, uma por passada de um cron */20, porque a trava
// de deduplicação falhava ABERTO. Foram 212 disparos onde deviam ter saído 29
// — e os 29 eram os leads mais quentes do banco.
//
// A lição não é "conserta a trava" (isso também foi feito). É que campanha de
// VENDA não precisa de cron. Ela é disparada meia dúzia de vezes na vida, por
// uma pessoa, olhando para a lista. Um cron transforma um erro de lógica em
// um erro que se REPETE sozinho a cada 20 minutos enquanto ninguém olha.
// Automação é para o que acontece o tempo todo (entrega, resgate); campanha
// é para o que acontece de vez em quando, e de vez em quando é trabalho de
// gente. O fundador chama esta rota quando quiser, e ela manda UMA vez.
//
// ─── A LISTA, e por que ela é dividida em duas ─────────────────────────────
//
// Alvo: quem voltou em 4+ DIAS DIFERENTES nos últimos 10 dias, viu preço,
// tocou o checkout e não assinou. São 43 pessoas. Voltar quatro dias a um
// site onde você não consegue mais fazer nada não é curiosidade — é vontade.
//
// MAS 21 dessas 43 estão entre as 29 que levaram os 8 e-mails de hoje. Mandar
// agora seria o 10º e-mail nosso em um dia para elas. O dano não fica na
// campanha: o provedor aprende que somos spam e passa a derrubar TAMBÉM o
// e-mail de entrega ("seu vídeo está pronto"). A gente perderia o canal para
// tentar salvar uma tarde. Por isso `segment`:
//
//   segment=limpos    → os ~22 que NÃO levaram o spam. Mandar primeiro.
//   segment=queimados → os ~21 que levaram. Só depois de uns dias, e com um
//                       assunto diferente e a desculpa na primeira linha.
//
// Pedir desculpa por um erro nosso converte melhor do que fingir que não
// houve: essa gente já provou que quer o produto.
//
// ─── O CUPOM ───────────────────────────────────────────────────────────────
// FIRST50 = 50% na PRIMEIRA fatura, Creator/Studio mensal (gate em código no
// checkout, KINEO-PROMO-GATE). NÃO é o COMEBACK50, que é 50% por TRÊS meses e
// ficou vivo só para quem já recebeu aquele link. O fundador mandou reduzir
// para 1 mês em 18/08; FIRST50 é o resultado dessa ordem.
//
// ⚠️ ESTA ROTA NÃO CRIA CUPOM NA STRIPE e não confere se ele existe. Quem faz
// isso é o preflight de /api/admin/send-comeback50. RODAR AQUELE PRIMEIRO, em
// dry-run, é parte do procedimento — "código existir não é código estar
// ligado" foi a lição de 19/08, quando eu quase publiquei um desconto que não
// existia no vídeo de um criador.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'josephsskaf@gmail.com'
const PROMO = 'FIRST50'
const STAMP = 'first50_quentes_emailed_v1'
const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com'])

function isInternalOrJunk(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') || e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') || e.startsWith('test') ||
    e.includes('mailinator') || e.startsWith('smoketest') ||
    e.endsWith('@yopmail.com')
  )
}

// ⚠️ `userId`, NÃO e-mail: emailFooterHtml/Text e unsubscribeHeaders montam o
// link de descadastro a partir do ID. Passar o e-mail aqui compila (os dois
// são string) e produz um link de unsubscribe QUEBRADO — quem quisesse sair
// não conseguiria, o que é a receita para virar denúncia de spam em vez de
// descadastro. Tipos iguais escondendo significados diferentes é onde este
// repositório já se machucou antes (`engine` vs `quality`).
function corpo(queimado: boolean, userId: string) {
  const link = `https://usekineo.com/pricing?promo=${PROMO}&utm_source=first50_quentes`
  // A desculpa vai PRIMEIRO no segmento queimado, antes de qualquer venda.
  // Ordem invertida (oferta e depois "aliás, desculpa os e-mails") lê como
  // desculpa de conveniência e queima o pouco de crédito que sobrou.
  const abertura = queimado
    ? `First — I owe you an apology. A bug on our side sent you the same email several times today. That was our mistake, not a marketing choice, and it's fixed.\n\nSince I'm here, one honest offer.`
    : `You've come back to Kineo on four different days. I noticed, and I don't want to waste that with a generic email.`

  const texto = `${abertura}

You've made videos. You've seen the pricing page. You haven't subscribed — so I'm guessing the monthly price is the part that doesn't sit right.

Here's the math I should have shown you on the pricing page: Creator is ${CREATOR_PRICE}/month for about ${CREATOR_AI_FILMS} finished AI films. That's roughly ${BEST_COST_PER_FILM} per film — script, voiceover, karaoke captions, soundtrack and edit included. A freelance editor charges $30 to $75 for one Short.

Use ${PROMO} and the first month is half price. One month, no lock-in, cancel whenever.

${link}

If the answer is still no, just hit reply and tell me why — I read every one of these and it genuinely helps.

Joseph
Founder, Kineo`

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;line-height:1.6">
  <p>${abertura.replace(/\n\n/g, '</p><p>')}</p>
  <p>You've made videos. You've seen the pricing page. You haven't subscribed — so I'm guessing the monthly price is the part that doesn't sit right.</p>
  <p>Here's the math I should have shown you on the pricing page: <b>Creator is ${CREATOR_PRICE}/month for about ${CREATOR_AI_FILMS} finished AI films.</b> That's roughly <b>${BEST_COST_PER_FILM} per film</b> — script, voiceover, karaoke captions, soundtrack and edit included. A freelance editor charges $30 to $75 for one Short.</p>
  <p>Use <b>${PROMO}</b> and the first month is half price. One month, no lock-in, cancel whenever.</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#2997ff;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Get 50% off the first month</a></p>
  <p style="color:#555">If the answer is still no, just hit reply and tell me why — I read every one of these and it genuinely helps.</p>
  <p style="color:#555">Joseph<br>Founder, Kineo</p>
  ${emailFooterHtml(userId)}
</div>`
  return { texto: texto + '\n\n' + emailFooterText(userId), html }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !ADMIN_EMAILS.has(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'admin only' }, { status: 403 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svc) return NextResponse.json({ error: 'env' }, { status: 503 })
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

  const segment = req.nextUrl.searchParams.get('segment') === 'queimados' ? 'queimados' : 'limpos'

  // ═══ KINEO-COORTE-NO-BANCO-2026-08-22 — A LIÇÃO QUE O DRY-RUN ENSINOU ═══
  //
  // A versão anterior deste bloco lia até 50.000 eventos e agregava em
  // JavaScript. O comentário dela dizia, com convicção, que era "de propósito
  // — sem RPC e sem SQL cru". O dry-run do fundador devolveu `eligible: 0`
  // enquanto o SQL direto achava 17, e a causa é que o PostgREST do Supabase
  // TRUNCA qualquer resposta em ~1.000 linhas SEM ERRO: a rota recebeu 4%
  // dos 24.925 eventos da janela e concluiu "coorte vazia" com cara de
  // sucesso.
  //
  // O fail-closed de ontem não pegou porque truncamento NÃO É ERRO — `error`
  // vem null, `data` vem cheio (de menos). É a terceira variação do mesmo
  // defeito em dois dias: guarda que confia numa leitura que pode degradar
  // em silêncio. A regra que fica: AGREGAÇÃO PERTENCE AO BANCO. Contagem por
  // pessoa, distinct de dias, bool_or — tudo isso o Postgres faz com índice
  // e devolve 43 linhas; trazer linhas cruas para contar em JS é pagar
  // transferência para refazer pior, com um teto invisível no meio.
  //
  // A função (supabase/migrations/20260822_first50_quentes_cohort) devolve
  // só os user_ids: 4+ dias distintos em 10, com toque no checkout.
  const { data: coorteRows, error: coorteErro } = await admin.rpc('first50_quentes_cohort')
  if (coorteErro) {
    return NextResponse.json(
      { mode: 'ABORTED', reason: 'cohort_unreadable', detail: coorteErro.message },
      { status: 503 },
    )
  }
  const quentes = ((coorteRows ?? []) as Array<{ user_id: string }>)
    .map((r) => r.user_id)
    .filter(Boolean)

  if (quentes.length === 0) return NextResponse.json({ mode: 'DRY_RUN', eligible: 0, note: 'coorte vazia' })

  const [{ data: profs, error: pErro }, { data: spam, error: sErro }, { data: stamps, error: stErro }] =
    await Promise.all([
      admin.from('profiles').select('id, email, email_opted_out, has_paid, is_pro').in('id', quentes),
      // ⚠️ o PostgREST corta em ~1.000 linhas mesmo pedindo 5.000 — hoje os stamps
      // têm ~212 linhas, mas se algum passar de 1.000 esta leitura degrada em
      // silêncio. order desc = os mais novos sobrevivem ao corte.
      admin.from('events').select('user_id').eq('name', 'oneoff_unlock_emailed').order('created_at', { ascending: false }).limit(1000),
      admin.from('events').select('user_id').eq('name', STAMP).order('created_at', { ascending: false }).limit(1000),
    ])
  if (pErro || sErro || stErro) {
    return NextResponse.json(
      { mode: 'ABORTED', reason: 'lookup_failed', detail: (pErro ?? sErro ?? stErro)?.message },
      { status: 503 },
    )
  }

  const queimados = new Set((spam ?? []).map((s) => s.user_id as string))
  const jaRecebeu = new Set((stamps ?? []).map((s) => s.user_id as string))

  const alvos = (profs ?? []).filter((p) => {
    const id = p.id as string
    const email = (p.email ?? '') as string
    if (!email || p.email_opted_out || isInternalOrJunk(email)) return false
    if (p.has_paid === true || p.is_pro === true) return false
    if (jaRecebeu.has(id)) return false
    return segment === 'queimados' ? queimados.has(id) : !queimados.has(id)
  })

  const enviar = req.nextUrl.searchParams.get('confirm') === 'SEND'
  if (!enviar) {
    return NextResponse.json({
      mode: 'DRY_RUN',
      segment,
      cohort: 'voltou em 4+ dias distintos em 10d · tocou checkout · nunca pagou · nunca recebeu esta campanha',
      eligible: alvos.length,
      emails: alvos.map((a) => a.email),
      proximo_passo: `adicione &confirm=SEND para disparar (segment=${segment})`,
    })
  }

  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY ausente' }, { status: 503 })

  let ok = 0
  const results: { email: string; outcome: string }[] = []
  for (const a of alvos) {
    const email = a.email as string
    const { texto, html } = corpo(segment === 'queimados', a.id as string)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          reply_to: REPLY_TO,
          to: email,
          subject: segment === 'queimados'
            ? 'Sorry about the repeated emails — and 50% off if you still want it'
            : `${BEST_COST_PER_FILM} per finished film — 50% off your first month`,
          text: texto,
          html,
          headers: unsubscribeHeaders(a.id as string),
        }),
      })
      if (res.ok) {
        await admin.from('events').insert({ user_id: a.id, name: STAMP, metadata: { segment, promo: PROMO } })
        ok++
        results.push({ email, outcome: 'sent' })
      } else {
        results.push({ email, outcome: `failed_${res.status}` })
      }
    } catch {
      results.push({ email, outcome: 'threw' })
    }
  }

  return NextResponse.json({ mode: 'SENT', segment, sent: ok, of: alvos.length, results })
}
