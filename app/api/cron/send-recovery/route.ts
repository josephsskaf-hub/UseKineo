import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression, HOT_LEAD_SUPPRESSION_HOURS } from '@/lib/lifecycle/suppression'
import { recordEmailSend, recordResendResponse } from '@/lib/email/quota'
import { LIFECYCLE_SKIP_STAMP } from '@/lib/lifecycle/skipStamp'
import { PLANS } from '@/lib/pricing'

// send-recovery — Push #425
//
// Automated hot-lead recovery. checkout_abandoned rows appear when a Stripe
// session EXPIRES (~24h after the user walked away). Until now Joseph had to
// spot the lead in /admin and ask for a manual email — leads that abandoned
// overnight went cold. This cron runs every 2 hours and sends ONE personal
// founder-style email per lead (the EMAIL-HOT-LEAD.md template), from
// hello@usekineo.com, asking what got in the way.
//
// Guard rails:
//   - max 1 recovery email per user, ever (recovery_sent_at). Pagante e opt-out
//     sao REVERSIVEIS: pulam sem carimbar. Teste/sem e-mail levam o sentinela.
//   - skips users who already converted to a paid plan
//   - skips founder/test accounts (same rules as /admin's isTestEmail)
//   - only looks at sessions expired in the last 48h, so a fresh deploy
//     never blasts the historical backlog

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const LIFECYCLE_EMAILS_ENABLED = process.env.KINEO_LIFECYCLE_EMAILS_ENABLED === 'true'
// Push #431 — Joseph's rule: lead-recovery/outreach goes out as the TEAM from
// hello@ (friendlier, commercial); support@ stays for support-only matters.
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const PAID_PLANS = new Set(['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial'])

// ═══ KINEO-RECOVERY-STARVATION-2026-08-13 — O LEAD MAIS QUENTE DA CASA ═══
// ═══ MORRIA DE FOME, CALADO, E O SILÊNCIO ERA O SINTOMA                 ═══
//
// MEDIDO hoje em produção (contas internas fora), 9 de 9 casos explicados e
// ZERO resíduo — toda linha presa tem colisão, e nenhuma colisão faltou:
//
//   7 pessoas · 9 linhas de `checkout_abandoned` com `recovery_sent_at IS NULL`
//   paradas de 29h a 137h. Todas: plan='free', email_opted_out=false,
//   has_paid=false, e-mail válido, não-teste. Ou seja: NENHUM dos desvios
//   legítimos deste arquivo se aplica a elas. São destinatários perfeitos que
//   simplesmente nunca receberam nada.
//
// A taxa de envio conta a história sozinha:
//   31/07 → 09/08 ....... ~97% das linhas recuperadas (13/13, 7/7, 5/5, 3/3…)
//   10/08 ............... 3 de 4
//   11/08 ............... 1 de 4
//   12/08 ............... 2 de 4
//   13/08 ............... 0 de 4
// O corte é 10/08 — exatamente quando os e-mails do trial entraram em volume
// (`d0_welcome` desde 08/08, `ending_soon` 09/08, `downgraded_loss` 11/08).
//
// A MECÂNICA, e por que ela DESTRÓI em vez de atrasar:
//   1. a linha só NASCE quando a sessão Stripe expira (~24h depois do clique);
//   2. a janela de elegibilidade era de 48h a partir daí;
//   3. qualquer um dos 9 jobs de ciclo de vida que mande e-mail nesse intervalo
//      cala este job por 24h (a supressão NÃO carimba — a linha "continua
//      elegível na próxima execução", que é verdade e é justamente a armadilha);
//   4. DUAS colisões cobrem as 48h, a janela fecha, e a linha nunca mais é
//      lida. Sem erro, sem carimbo, sem log. O lead morre em silêncio.
//
// E A COLISÃO É ANTICORRELAÇÃO DE DESENHO, NÃO AZAR — é isto que faz o defeito
// piorar conforme o produto melhora. Quem abandona checkout é, por definição,
// alguém ATIVO: acabou de receber um vídeo (`video_ready`), bateu no teto
// (`cap_hit`), está no meio do trial (`d0_welcome`/`ending_soon`) ou baixou sem
// postar (`post_nudge`). **A mesma atividade que leva a pessoa até o checkout é
// a que dispara o e-mail que cala a recuperação dela.** Foram exatamente esses
// seis os vencedores das 9 colisões medidas.
//
// DUAS MUDANÇAS, e nenhuma delas toca preço, oferta ou o texto do e-mail:
//
//  1. JANELA DE ELEGIBILIDADE 48h → 7 DIAS. Colisão passa a ADIAR em vez de
//     DESCARTAR. Esta sozinha resolve os 9 casos e é a que importa: a janela de
//     48h era estreita demais para um job que pode ser calado por 24h de cada
//     vez. O comentário original justificava as 48h com "a fresh deploy never
//     blasts the historical backlog" — a proteção real contra isso é o teto por
//     execução abaixo, não a janela, porque o carimbo aqui é VITALÍCIO.
//
//  2. SUPRESSÃO DE 24h → 4h **SÓ PARA ESTE JOB**. Este é o único e-mail da casa
//     endereçado a quem abriu um checkout da Stripe com o cartão na mão; ele não
//     pode perder a vez para um "your video is ready". Encurtar é seguro AQUI e
//     em quase nenhum outro lugar, porque o carimbo deste job é vitalício (1 por
//     pessoa, para sempre): janela curta não gera repetição, no máximo dois
//     e-mails nossos no mesmo dia para alguém tentando comprar. As 4h preservam
//     inteira a razão de existir da supressão — não mandar dois e-mails com
//     minutos de diferença. Os outros 11 chamadores continuam em 24h: o
//     parâmetro é opcional e o default não mudou.
//
// TETO POR EXECUÇÃO: a janela de 7 dias faz a PRIMEIRA execução após o deploy
// encontrar o represamento inteiro de uma vez (hoje: 7 pessoas). São todos leads
// legítimos e o carimbo é vitalício, então não há repetição possível — mas um
// job que pode mandar N e-mails de uma vez precisa de um N máximo escrito, e não
// de uma janela estreita fazendo esse papel por acidente. As linhas que sobram
// do teto ficam para a execução seguinte (2h depois), na ordem em que estão.
const RECOVERY_WINDOW_HOURS = 7 * 24
const MAX_EMAILS_PER_RUN = 25

// ═══ KINEO-RECOVERY-WRONG-PLAN-2026-08-11 — O E-MAIL NOMEAVA UM PLANO QUE NÃO EXISTE ═══
//
// O DEFEITO (medido em produção, não deduzido). A tabela local acima mapeava
// `basic → 'Basic'` e `pro → 'Pro'`. Esses nomes NÃO existem no produto: a
// fonte canônica é `lib/pricing.PLANS`, e ela diz `basic → 'Creator'` e
// `pro → 'Studio'` — que é o que `/pricing`, `AccountClient` e `AutopilotClient`
// mostram. Uma quarta cópia à mão do mapa de planos divergiu das outras três.
//
// A COORTE ATINGIDA, contada em `checkout_abandoned` por tier
// (`recovery_sent_at > 2020-01-01`, que exclui o sentinela de pulo de 1970):
//
//     tier=starter   99 envios  → 'Starter'  ✅
//     tier=basic     71 envios  → 'Basic'    ❌ o produto chama Creator
//     tier=pro       35 envios  → 'Pro'      ❌ o produto chama Studio
//     tier=null      36 envios  → 'Pro'      ❌ inventava um plano do nada
//     tier=autopilot  3 envios  → 'Pro'      ❌ (não estava no mapa)
//     ─────────────────────────────────────────
//     145 de 244 = 59% nomeavam um plano que a pessoa nunca viu na tela.
//
// (⚠️ o agregado sem `group by` devolve 245 e a soma por tier devolve 244. Uma
// linha não aparece em nenhum balde. As duas revisões pegaram a divergência;
// **244 é o número usado aqui** porque é o que a decomposição sustenta. A linha
// órfã não muda a conclusão e não foi caçada — fica registrada em vez de
// arredondada, que é a regra desta casa sobre número em comentário.)
//
// POR QUE ISSO É CARO E NÃO COSMÉTICO: esta é a coorte mais quente do funil —
// gente que chegou até a página da Stripe. O e-mail chega dizendo "you got all
// the way to the Basic checkout" para quem clicou num botão escrito **Creator**
// a $24,90. No melhor caso é confuso; no pior lê como phishing ou como e-mail
// de outra empresa, no exato instante em que a pessoa decide se confia em nós
// com o cartão. 24 pessoas receberam este e-mail nos últimos 30 dias e
// **nenhuma comprou**.
//
// O `?? 'Pro'` era a parte pior: um tier ausente virava uma AFIRMAÇÃO sobre
// qual plano a pessoa tentou comprar. 36 envios. Agora tier desconhecido não
// nomeia plano nenhum — o e-mail fala de "your Kineo checkout" e manda para
// /pricing. Não saber é um estado legítimo; inventar não é.
//
// A CORREÇÃO É NÃO TER MAPA NOVO: `planNameFor()` deriva de `PLANS`, a mesma
// constante que a UI usa. Um mapa à mão consertaria hoje e divergiria de novo
// no próximo repricing. (Honestidade sobre o alcance: a revisão adversarial
// mostrou que há OUTRAS cópias à mão de nome de plano no repo —
// `checkout/resume`, `checkout/cancelled`, `_shared/mrr`, `PricingClient`,
// `StructuredData`. Este commit conserta ESTE arquivo; a consolidação das
// demais não foi feita e não deve ser lida como feita.)
//
// Dois detalhes que a revisão adversarial cobrou e que não são paranoia:
//   · `hasOwnProperty` — sem ele, `tier='constructor'` acha `Object` na cadeia
//     de protótipo e o e-mail diria "the **Object** checkout". Hoje inalcançável
//     (o tier vem da nossa própria metadata), mas o repo já usa esse guarda em
//     `checkoutPricing.isBulkPackId` e ele custa uma linha.
//   · aliases — o mapa removido também entendia `creator` e `studio`. `PLANS` é
//     chaveado por `basic`/`pro`, então sem a normalização uma linha legada com
//     `tier='creator'` PERDERIA o nome que hoje acerta. Hoje não existe nenhuma
//     (`select distinct tier` → starter, basic, pro, autopilot, null), mas a
//     regressão silenciosa custaria mais que o `Record` abaixo.
const TIER_ALIASES: Record<string, string> = { creator: 'basic', studio: 'pro' }

function planNameFor(tier: string | null | undefined): string | null {
  const input = (tier ?? '').trim().toLowerCase()
  const raw = TIER_ALIASES[input] ?? input
  if (!raw || raw === 'free') return null
  if (!Object.prototype.hasOwnProperty.call(PLANS, raw)) return null
  return (PLANS as Record<string, { name?: string } | undefined>)[raw]?.name ?? null
}

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

// KINEO-UNSUBSCRIBE-2026-07-26 — recebe userId para o rodapé de descadastro.
// KINEO-ORDEM-2-2026-08-02 — PayPal no momento do decline: ~40% dos pagamentos
// da história são "malsucedido" (decline de banco, Índia/Paquistão fortes).
// PayPal JÁ existe (rotas /api/paypal/*); o e-mail só precisava oferecer.
// O link exige login: usuário deslogado cai em /signup?redirect=/pricing, onde
// os botões PayPal existem — fallback aceitável, nunca um beco sem saída.
const PAYPAL_TIERS = new Set(['starter', 'basic', 'pro'])
function paypalLink(tier: string): string {
  return PAYPAL_TIERS.has(tier)
    ? `https://www.usekineo.com/api/paypal/checkout?tier=${tier}`
    : 'https://www.usekineo.com/pricing'
}
// ═══ KINEO-RECOVERY-NO-MINT-LINK-2026-08-11 — O LINK DE CHECKOUT FOI CORTADO ═══
//
// ESTA SEÇÃO REGISTRA UMA MUDANÇA QUE EU ESCREVI E DEPOIS REMOVI. Fica escrita
// porque o próximo a olhar este arquivo vai ter a mesma ideia, e ela tem uma
// armadilha de PREÇO que não é visível daqui.
//
// A ideia: o e-mail vai para quem chegou na página da Stripe e não terminou, e
// o único link clicável dele é o do PayPal. Um link de "retomar seu checkout"
// parece a melhoria mais óbvia do arquivo inteiro.
//
// A ARMADILHA, medida nas duas revisões adversariais desta sprint:
// `https://…/api/stripe/checkout?tier=X` **não reproduz o preço do botão**. O
// primeiro mês com desconto é decidido pelo QUERY PARAM `intro=1`
// (`app/api/stripe/checkout/route.ts` → `searchParams.get('intro') === '1'`), e
// TODO botão real do produto anexa `&intro=1` (PricingClient, PricingCards,
// KineoLanding, ExitIntentOffer, TrialActiveBanner, TrialDowngradeModal,
// HistoryClient, MyVideosClient). Sem o param:
//
//     starter  → botão $4,90 no 1º mês   ·  link do e-mail $9,90   (2,0×)
//     basic    → botão $9,90 no 1º mês   ·  link do e-mail $24,90  (2,5×)
//
// São 170 dos 244 envios da história. Um e-mail que diz "pick up where you left
// off" e cobra 2,5× o que a pessoa viu é pior que não mandar link nenhum — e é
// exatamente o erro que `app/api/stripe/checkout/resume/route.ts` já se recusa a
// cometer ("hide recovery rather than ever substituting a full-price Creator
// checkout").
//
// POR QUE NEM COM `&intro=1` EU LIGUEI ISSO AGORA — a segunda razão, que é a que
// decide: **`KINEO-CHECKOUT-TRIAGE-2026-07-25` já tirou os links diretos de
// `/api/stripe/checkout` deste exato tipo de e-mail**
// (`app/api/admin/send-abandon-recovery/route.ts`), porque scanners corporativos
// (Outlook Safe Links, Proofpoint, Mimecast) fazem GET em todo link de e-mail e
// `isSpeculativeRequest()` não os detecta — cada varredura MINTA uma sessão
// Stripe e suja `checkout_attempted`, que é justamente o funil usado como prova
// aqui. Reverter uma decisão datada dentro do fluxo de pagamento, sem QA do
// fluxo de pagamento, viola o guardrail explícito do fundador.
//
// O CAMINHO CERTO, quando houver QA: `/api/stripe/checkout/resume?go=1`, que
// resolve a sessão original por `latestAbandonedSessionId(userId)` e propaga
// `intro` e promo da sessão abandonada — não é rota de mint e não tem a
// armadilha de preço. Fica como decisão do fundador no relatório desta sprint,
// não como commit meu.

/**
 * ═══ KINEO-RECOVERY-FALSE-CREDITS-2026-08-11 — "30 free credits" ERA MENTIRA ═══
 *
 * A linha removida daqui afirmava, para TODA a coorte: *"Your account comes
 * with 30 free credits - so you can test the engine before paying anything."*
 *
 * Nenhuma conta tem 30 créditos. `PLANS.free.credits` é 3 e a concessão do
 * reverse trial é `TRIAL_GRANT_CREDITS = 40`. Os 30 são uma promessa aposentada
 * — o próprio comentário do arquivo já sabia disso ("its copy still references
 * a retired 30-credit promise") e concluía que o job estava "paused by
 * default". **Não estava.** O único guarda era `KINEO_LIFECYCLE_EMAILS_ENABLED`,
 * que é a flag do sistema INTEIRO de ciclo de vida e está ligada em produção
 * desde 23/07 (`trial_emails_log` prova: envios reais em 11/08). A pausa que
 * justificava conviver com a copy errada nunca existiu: 245 e-mails saíram.
 *
 * Custo específico deste número: a pessoa está decidindo se confia em nós com
 * o cartão. Ela clica, loga, e o saldo não é 30. O e-mail que existe para
 * recuperar a compra é o que dá a ela o primeiro motivo documentado para não
 * comprar.
 *
 * A CORREÇÃO NÃO É TROCAR 30 POR OUTRO LITERAL — seria o mesmo defeito com
 * outro número, e envelheceria no próximo repricing. Passa a afirmar o SALDO
 * REAL daquela pessoa, lido no mesmo SELECT que já busca o perfil, e **só
 * quando ele é maior que zero**. Saldo 0 (trial rebaixado, créditos revogados)
 * → a linha some. O e-mail se cala em vez de mentir, que é a regra desta casa.
 *
 * ⚠️ MINHA 1ª VERSÃO DESTA FUNÇÃO FOI REPROVADA NAS DUAS REVISÕES, e a frase
 * derrubada fica citada porque o erro é sutil e convidativo. Ela era:
 * *"…nothing expires because you didn't finish checkout"*.
 *
 * **A causalidade está exatamente invertida.** `maybeActivateReverseTrial`
 * escreve `video_credits = saldo + TRIAL_GRANT_CREDITS`, ou seja, os 40
 * créditos do trial MORAM nesta mesma coluna; e um trial ativo tem
 * `plan='free'`, então ele NÃO cai no filtro de pagante e recebe este e-mail.
 * `downgradeExpiredTrial` revoga `min(saldo, granted − used)` no cron horário —
 * isto é, os créditos são revogados **porque** a pessoa não assinou, e
 * sobrevivem **se** ela assina (o webhook carimba `converted`, que é terminal e
 * sai da coorte do downgrade). A frase afirmava o oposto literal da regra do
 * sistema, e ainda por cima dizia "sem pressa" ao lead mais quente do funil.
 *
 * A versão que ficou não afirma NADA sobre expiração — nem que expira, nem que
 * não. Afirmar que expira exigiria ler `trial_ends_at` e acertar o fuso e a
 * borda do cron para não prometer um prazo errado; afirmar que não expira é
 * falso. Entre as duas, o silêncio é a única frase verdadeira para as duas
 * coortes (trial e free) com o dado que este SELECT já tem.
 */
function creditsLine(balance: number | null): string | null {
  if (balance === null || !Number.isFinite(balance) || balance <= 0) return null
  const n = Math.floor(balance)
  return `- You still have ${n} credit${n === 1 ? '' : 's'} sitting in your account right now`
}

function buildEmail(plan: string | null, tier: string | null, userId: string, balance: number | null) {
  // Plano desconhecido não vira "Pro": vira ausência de plano na frase.
  const opening = plan
    ? `We noticed you got all the way to the ${plan} checkout but didn't finish signing up.`
    : `We noticed you got all the way to the checkout but didn't finish signing up.`
  const bullets = [
    '- We accept card, Link, Google Pay and Apple Pay',
    `- Card didn't go through? You can pay with PayPal instead: ${paypalLink((tier ?? '').trim().toLowerCase())}`,
    creditsLine(balance),
    // KINEO-RECOVERY-NO-DISCOUNT-2026-08-11 — a linha anterior era *"If the
    // price was the issue, reply and tell us. We'd rather make you a deal than
    // lose you"*: uma PROMESSA de desconto, feita por um job que não tem
    // desconto nenhum para dar. Convidar o MOTIVO não queima o preço; prometer
    // o abatimento ensina a coorte inteira a esperar por ele.
    //
    // ⚠️ E A POLÍTICA AQUI NÃO É TÃO LIMPA QUANTO EU ESCREVI NA 1ª VERSÃO — a
    // revisão adversarial derrubou a frase "esta pessoa está em D0/D1 e não
    // recebe desconto". Duas correções, ambas medidas:
    //   · O RELÓGIO: a linha de `checkout_abandoned` só nasce quando a sessão
    //     Stripe EXPIRA (~24h) e a janela deste job é de 48h. O e-mail chega em
    //     D1–D3, não em D0/D1.
    //   · A COLISÃO, que importa mais: a MESMA coorte recebe todo dia às 10:00Z
    //     o `/api/admin/send-abandon-recovery` (via cron `send-reminders`), com
    //     o assunto **"Still thinking it over? First month $4.90"** — um
    //     desconto real de 50% no Starter. Ou seja, esta linha pede à pessoa
    //     que proponha um número no mesmo dia em que o e-mail vizinho já lhe
    //     ofereceu $4,90. Quem responder "$5" está negociando um preço que já
    //     ganhou. NÃO é violação da regra do COMEBACK50 (que é do D5/D10
    //     pós-trial, outro funil), mas é uma sobreposição de ofertas que
    //     ninguém desenhou. Vai como decisão do fundador no relatório — mexer
    //     em qual e-mail carrega qual oferta é mudança de política de preço, e
    //     política de preço é gate dele, não meu.
    '- If the price was the issue, reply and tell us which number would have worked',
  ].filter((l): l is string => l !== null)

  const text = `Hey,

This is the Kineo team.

${opening} No pressure at all - we just wanted to ask: did something get in the way? A payment issue, a question about the plans, a feature you were looking for?

Whatever it was, we'd like to fix it. A few things that might help:

${bullets.join('\n')}

Just hit reply and tell us what would make Kineo a yes for you. A real person reads and answers every message.

Kineo Team
usekineo.com`

  // Deliberately plain HTML — it must read like a person, not a campaign.
  // URLs viram <a> porque clientes de e-mail NÃO auto-linkam texto em HTML —
  // e o link do PayPal só cumpre a Ordem 2 se for clicável.
  const linkify = (line: string) =>
    line.replace(/https?:\/\/[^\s]+/g, (u) => `<a href="${u}" style="color:#111;">${u}</a>`)
  const html =
    text
      .split('\n')
      .map((line) => (line.trim() === '' ? '<br/>' : `<p style="margin:0 0 2px;font-family:Arial,sans-serif;font-size:14px;color:#111;line-height:1.55;">${linkify(line)}</p>`))
      .join('') + emailFooterHtml(userId)

  return { text: `${text}${emailFooterText(userId)}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ⚠️ KINEO-FALSE-PAUSE-2026-08-11 — O COMENTÁRIO ANTERIOR AFIRMAVA UMA PAUSA
  // QUE NUNCA EXISTIU, e por isso vai citado aqui em vez de apagado em
  // silêncio. Ele dizia: *"Paused by default: this sequence overlaps the
  // abandonment batch and its copy still references a retired 30-credit
  // promise. Re-enable only after … founder approval."*
  //
  // As duas metades eram verdadeiras e a conclusão era falsa. A copy REALMENTE
  // trazia a promessa aposentada de 30 créditos (corrigida agora, ver
  // KINEO-RECOVERY-FALSE-CREDITS). Mas "paused by default" descrevia um guarda
  // que não é deste job: `KINEO_LIFECYCLE_EMAILS_ENABLED` é a flag do sistema
  // INTEIRO de ciclo de vida, ligada em produção desde 23/07 — desligá-la para
  // pausar ESTE cron calaria também o welcome, o ending_soon e o aviso de
  // perda. Ou seja: a pausa nunca podia ser acionada sem derrubar o resto, e
  // não foi. **245 e-mails com a copy errada saíram enquanto o arquivo dizia
  // que estava pausado.**
  //
  // A LIÇÃO, que vale além deste arquivo: comentário não pausa nada. Um job que
  // precisa de pausa própria precisa de FLAG PRÓPRIA. Este aqui não precisa
  // mais — a copy foi corrigida —, então a flag compartilhada volta a ser
  // apenas o que sempre foi: o corta-tudo do ciclo de vida.
  if (!LIFECYCLE_EMAILS_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'lifecycle_email_gate' })
  }
  if (!RESEND_API_KEY) {
    console.error('[send-recovery] RESEND_API_KEY not set')
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

  // Sessions expired in the last RECOVERY_WINDOW_HOURS, never recovered.
  const since = new Date(Date.now() - RECOVERY_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data: rows, error } = await admin
    .from('checkout_abandoned')
    .select('id, user_id, tier, expired_at')
    .is('recovery_sent_at', null)
    .gte('expired_at', since)
    .order('expired_at', { ascending: false })

  if (error) {
    console.error('[send-recovery] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // One candidate row per user (most recent abandonment wins).
  const byUser = new Map<string, { id: string; tier: string | null }>()
  for (const r of rows ?? []) {
    if (r.user_id && !byUser.has(r.user_id)) {
      byUser.set(r.user_id, { id: r.id, tier: r.tier })
    }
  }
  if (byUser.size === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, total: 0 })
  }

  // Profiles: email + current plan (skip already-converted users).
  const userIds = [...byUser.keys()]
  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    // KINEO-UNSUBSCRIBE-2026-07-26 — a coorte aqui nasce de checkout_abandoned,
    // não de uma query em profiles, então o opt-out entra no SELECT e é
    // filtrado no laço abaixo (junto com pagos/teste) para que a linha de
    // checkout_abandoned também seja marcada e nunca mais reconsiderada.
    // KINEO-RECOVERY-FALSE-CREDITS-2026-08-11 — `video_credits` entra aqui para
    // que a frase de crédito seja o saldo REAL da pessoa e não um literal.
    // Mesma leitura, mesma linha: zero query nova.
    .select('id, email, plan, email_opted_out, video_credits')
    .in('id', userIds)
  if (profErr) {
    console.error('[send-recovery] profiles error:', profErr.message)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }
  const profById = new Map((profiles ?? []).map((p) => [p.id, p]))

  // KINEO-LIFECYCLE-SUPPRESSION-2026-07-27 — trava cruzada de 24h entre os 4
  // jobs de ciclo de vida. Este é o job mais agressivo da casa (a cada 2h), e
  // era o único cujo carimbo mora fora de `profiles` — logo, o mais provável de
  // atropelar os outros. Falha FECHADA (ver lib/lifecycle/suppression.ts).
  // KINEO-RECOVERY-STARVATION-2026-08-13 — 4h em vez de 24h, SÓ aqui. Ver o
  // bloco no topo deste arquivo: carimbo vitalício + coorte que é sinal de
  // compra = o único job da casa que pode encurtar a janela sem risco de
  // repetição. Os outros 11 chamadores usam o default e não mudam.
  const suppression = await loadLifecycleSuppression(admin, userIds, HOT_LEAD_SUPPRESSION_HOURS)

  let sent = 0
  let skipped = 0
  let suppressed = 0
  // Linhas elegíveis que ficaram para a próxima execução por causa do teto —
  // reportado para que "sent" menor que "total" nunca precise ser adivinhado.
  let deferredByCap = 0

  for (const [userId, cand] of byUser) {
    // Teto por execução. Vem ANTES de qualquer desvio para que um lote grande
    // não seja consumido por `continue`s e o teto vire letra morta: o que
    // interessa limitar é E-MAIL ENVIADO, e é `sent` que ele compara.
    if (sent >= MAX_EMAILS_PER_RUN) {
      deferredByCap++
      continue
    }
    // Suprimido = recebeu outro e-mail de ciclo de vida nas últimas 24h.
    // NÃO carimba `recovery_sent_at`: a linha continua elegível na próxima
    // execução, depois que a janela passar. Carimbar aqui seria descartar o
    // lead para sempre por causa de uma colisão de agenda.
    if (suppression.isSuppressed(userId)) {
      suppressed++
      continue
    }

    const prof = profById.get(userId)
    const email = prof?.email?.trim()
    const plan = (prof?.plan ?? 'free').toLowerCase()

    const optedOut = (prof as { email_opted_out?: boolean | null } | undefined)?.email_opted_out === true

    // Plano pago e opt-out são REVERSÍVEIS e o carimbo é VITALÍCIO: quem volta
    // ao free, ou quem se reinscreve, nasceria queimado para sempre. Só pula.
    if (email && !isTestEmail(email) && (PAID_PLANS.has(plan) || optedOut)) {
      skipped++
      continue
    }

    // Sem e-mail / conta de teste: irreversível → carimba para não reconsiderar
    // a linha, com o SENTINELA DE PULO, que a supressão de 24h ignora.
    // KINEO-SKIP-STAMP-2026-08-05.
    if (!email || isTestEmail(email)) {
      skipped++
      await admin
        .from('checkout_abandoned')
        .update({ recovery_sent_at: LIFECYCLE_SKIP_STAMP })
        .eq('user_id', userId)
        .is('recovery_sent_at', null)
      continue
    }

    // Plano nomeado só quando ele É conhecido — ver KINEO-RECOVERY-WRONG-PLAN.
    const planName = planNameFor(cand.tier)
    const rawBalance = (prof as { video_credits?: number | null } | undefined)?.video_credits
    const balance =
      typeof rawBalance === 'number' && Number.isFinite(rawBalance) ? Math.max(0, rawBalance) : null
    const { text, html } = buildEmail(planName, cand.tier, userId, balance)

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
          subject: 'Quick question about your Kineo checkout',
          text,
          html,
          headers: unsubscribeHeaders(userId),
        }),
      })

      // KINEO-EMAIL-QUOTA-WIRED-2026-08-17 — este é o remetente de MAIOR valor
      // da casa (a pessoa já chegou na página de pagamento) e era um dos que
      // enviavam sem registrar NADA. Prioridade `revenue`: `claimEmailSlot`
      // nunca barra esta linha, então NÃO há chamada de claim aqui de
      // propósito — chamar um gate cujo veredito é sempre "pode" só gastaria um
      // round-trip por e-mail no caminho quente. O que faltava era o
      // DENOMINADOR, e é ele que entra: uma linha por desfecho, com o
      // http_status cru. Um 429 aqui é o único número que prova que a cota do
      // Resend matou uma recuperação de checkout — hoje isso morre num
      // console.error que ninguém lê.
      await recordResendResponse({
        kind: 'checkout_recovery',
        priority: 'revenue',
        userId,
        res,
        admin,
      })

      if (res.ok) {
        sent++
        await admin
          .from('checkout_abandoned')
          .update({ recovery_sent_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('recovery_sent_at', null)
        // O log diz o que o e-mail DIZ. `planName ?? 'no-plan-named'` — nunca
        // um rótulo inventado, senão o log vira a próxima fonte de verdade
        // errada sobre qual plano a pessoa tentou comprar.
        console.log(
          `[send-recovery] sent to ${email} (tier=${cand.tier ?? 'null'} plan=${planName ?? 'no-plan-named'} credits=${balance ?? 'unknown'})`,
        )
      } else {
        console.error(`[send-recovery] resend failed for ${email}:`, await res.text())
        // do NOT mark — retried on the next run
      }
    } catch (err) {
      console.error(`[send-recovery] error for ${email}:`, err)
      // `ok: null` é EXATAMENTE o caso que a coluna nullable existe para
      // registrar: o fetch estourou, então não sabemos se o Resend aceitou.
      // Contar como sucesso inventaria cota gasta; contar como falha liberaria
      // cota que talvez não exista. Fica explícito no ledger.
      await recordEmailSend({
        kind: 'checkout_recovery',
        priority: 'revenue',
        userId,
        ok: null,
        detail: err instanceof Error ? err.message.slice(0, 300) : 'fetch threw',
        admin,
      })
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total: byUser.size,
    suppressed_recent_lifecycle: suppressed,
    suppression_degraded: suppression.degraded,
    // KINEO-RECOVERY-STARVATION-2026-08-13 — os dois campos que tornam a
    // inanição VISÍVEL na próxima vez. `suppressed` já existia e não bastava:
    // ele conta quem foi calado NESTA execução, sem dizer com que janela nem
    // por quanto tempo a linha já vinha esperando.
    window_hours: RECOVERY_WINDOW_HOURS,
    suppression_window_hours: HOT_LEAD_SUPPRESSION_HOURS,
    deferred_by_cap: deferredByCap,
  })
}
