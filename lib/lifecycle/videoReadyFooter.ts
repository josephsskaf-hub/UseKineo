/**
 * sprint-assinaturas #24 (02/09/2026) — o rodape do e-mail "Your Short is
 * ready" (app/api/compose/status/[renderId]/route.ts).
 *
 * O QUE ESTAVA ERRADO. O e-mail de video pronto e o unico que chega no minuto
 * de maior boa vontade do cliente, e sai para TODO render — e o rodape era UM
 * so, para todo mundo: "Want a clean export and N more Fast Shorts this
 * month? Starter is $7/month →". Medido 02/09 (externos, 7d, 105 e-mails):
 *   · 8 foram para ASSINANTES (Studio e Starter) — quem ja paga $29 leu
 *     "compre o Starter por $7" e "clean export" (o export dele ja e limpo);
 *   · 51 foram para trial ATIVO com credito (47 ainda com >= 5cr hoje) — a
 *     unica coisa que move essa pessoa e o 2o video (0,9% → 11,8% no 4o), e
 *     o rodape pedia dinheiro em vez de pedir o episodio 2;
 *   · 45 foram para quem QUEIMOU o trial naquele filme (custo medio 15,8cr)
 *     — o unico pedido de dinheiro certo, mas medido em "Fast Shorts" que a
 *     pessoa nao fez, nao em filmes COMO AQUELE.
 *
 * O QUE MUDA. Tres rodapes, decididos por dados que a rota JA tem (zero
 * consulta nova): assinante → episodio 2 + saldo, sem preco; nao-assinante
 * com saldo para o proximo video → episodio 2 primeiro, plano em filmes
 * depois; nao-assinante sem saldo → plano medido em filmes como o que acabou
 * de chegar (filmsPerPlan/TIER_CREDITS). Falha aberta: custo desconhecido ou
 * saldo desconhecido = a copy de hoje, com o numero certo.
 *
 * Regras: nenhum numero digitado (preco vem de TIER_PRICES, creditos de
 * TIER_CREDITS, custo do claim assinado); nao promete cupom, credito nem
 * desconto; nao inventa segundos (filmNoun); o `intent_campaign` do Codex
 * continua no link de preco para a medicao dele nao quebrar.
 */
import { CARD_TRIAL_DAYS, CARD_TRIAL_GRANT_CREDITS, CARD_TRIAL_LIVE, TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { trialEntryFeeLabel, trialMonthlyAfterLabel } from '@/lib/lifecycle/trialEntryFee'
import { filmsPerPlan, filmNoun, sanitizeFilmCost } from '@/lib/lifecycle/trialFilmPlans'
import { buildSeriesContinuationEmailUrl, normalizeSeriesSeed, type SeriesContinuationSource } from '@/lib/seriesContinuation'
import { videosForCredits } from '@/lib/marketingPrice'

export type VideoReadyFooterKind =
  | 'subscriber_next' // ja paga: episodio 2 + saldo, sem preco
  | 'trial_episode2' // nao paga, tem saldo para o proximo: episodio 2 primeiro
  | 'plan_films' // nao paga, sem saldo PROVADO: plano medido em filmes como este
  // sprint-assinaturas #1 (05/09) — saldo DESCONHECIDO. Nao e o mesmo que
  // saldo zero, e ate hoje era tratado como se fosse: a porta do episodio 2
  // sumia justamente de quem tinha credito na mao. O plano continua; a porta volta.
  | 'unknown_balance_episode2'
  | 'plan_generic' // custo/saldo desconhecido: copy de hoje (numero certo)

export interface VideoReadyFooterInput {
  /** has_paid OU plano pago — trial ativo NAO conta (ainda nao pagou). */
  isSubscriber: boolean
  /** Saldo depois do debito (retorno do RPC). null = desconhecido. */
  creditsRemaining: number | null
  /** Custo assinado do render (claim). */
  cost: number
  /** Tema do video (para o episodio 2). Vazio = sem bloco de episodio. */
  topic: string
  /** Duracao real em segundos (para "62-second film"). */
  durationSeconds: number | null
  appUrl: string
  /**
   * `profiles.has_paid` — a MESMA coluna que o cobrador consulta antes de
   * aceitar `?trial=1`. `null`/ausente = NAO SABEMOS, e o desconhecido nao vira
   * `false`: sem esta coluna provada a porta de $1 nao aparece (ver
   * `trialDoorHtml`). Nao confundir com `isSubscriber`, que e mais largo
   * (has_paid OU plano pago) — a porta precisa do predicado ESTREITO.
   */
  hasPaid?: boolean | null
}

export interface VideoReadyFooter {
  kind: VideoReadyFooterKind
  html: string
  /**
   * A porta de $1 entrou neste e-mail? Vai para o carimbo do evento — sem isto
   * a medicao nao separa quem leu a oferta nova de quem leu so o plano cheio
   * (memoria `carimbo-proprio-para-a-versao-nova`, va-r4b).
   */
  trialDoor: boolean
}

/** Menor custo de um video na casa (Kineo 1 = 5cr). Abaixo disso o saldo nao
 *  compra o proximo video e o pedido certo e o plano, nao o episodio 2. */
export const NEXT_VIDEO_MIN_CREDITS = 5

const PRICING_INTENT = 'intent_campaign=video_ready_email_plan_truth_v1'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function episodeTwoHtml(
  appUrl: string,
  topic: string,
  campaign: string,
  // sprint-assinaturas #1 — o ramo de saldo desconhecido usa fonte propria,
  // senao a chegada dele fica indistinguivel das outras portas do e-mail.
  source: SeriesContinuationSource = 'video_ready_email',
): string {
  const tema = normalizeSeriesSeed(topic)
  if (!tema) return ''
  const url = buildSeriesContinuationEmailUrl(appUrl, tema, source, {
    utm_source: 'lifecycle',
    utm_medium: 'email',
    utm_campaign: campaign,
  })
  return `<p style="margin:18px 0 0"><a href="${esc(url)}" style="display:block;background:#1f1f23;border:1px solid #2a2a30;border-left:4px solid #2997ff;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 16px;border-radius:8px;">Episode 2: ${esc(tema)} &rarr;</a></p>`
}

function creditsLeftLine(n: number | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return ''
  const k = Math.floor(n)
  return `You have <strong style="color:#fff">${k} credit${k === 1 ? '' : 's'}</strong> left`
}

function pricingUrl(appUrl: string, campaign: string): string {
  return `${appUrl.replace(/\/+$/, '')}/pricing?${PRICING_INTENT}&utm_source=lifecycle&utm_medium=email&utm_campaign=${campaign}`
}

function starterPrice(): string {
  return formatCheckoutMoney('usd', TIER_PRICES.starter.usd)
}

/** Copy de hoje, com o numero certo (videosForCredits) — o controle. */
function genericPlanHtml(appUrl: string): string {
  return `<p style="color:#64748b;font-size:12px;margin:24px 0 0">Want a clean export and ${videosForCredits(TIER_CREDITS.starter, 'fast')} more Fast Shorts this month? <a href="${esc(pricingUrl(appUrl, 'video_ready_plan_generic'))}" style="color:#2997ff;">Starter is ${starterPrice()}/month &rarr;</a></p>`
}

/** Plano medido em filmes COMO ESTE. null quando nenhum plano compra >= 1. */
function filmsPlanHtml(appUrl: string, cost: number, durationSeconds: number | null, campaign: string): string | null {
  const rows = filmsPerPlan(cost)
  if (!rows) return null
  const c = sanitizeFilmCost(cost)
  if (c === null) return null
  const noun = filmNoun(durationSeconds)
  const lines = rows
    .filter((r) => r.films >= 1)
    .map((r) => `${r.name} &mdash; ${r.films} ${r.films === 1 ? 'film' : 'films'} like this a month`)
    .join(' &middot; ')
  return `<p style="color:#94a3b8;font-size:12px;margin:24px 0 0">This ${noun} cost <strong style="color:#fff">${c} credit${c === 1 ? '' : 's'}</strong>. ${lines}. <a href="${esc(pricingUrl(appUrl, campaign))}" style="color:#2997ff;">Plans from ${starterPrice()}/month &rarr;</a></p>`
}

// ═══════════════════════════════════════════════════════════════════════════
// A PORTA DE $1 NO E-MAIL DE ENTREGA — va-r5 (07/09/2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// O QUE ESTAVA ERRADO, MEDIDO. Este rodape e a maior superficie de dinheiro da
// casa: `video_ready_email_sent` saiu **187 vezes para 132 pessoas** desde
// 02/09 com um pedido de dinheiro dentro (~13/dia), contra **7 slots em 7 dias**
// que a pergunta comercial ganha na TELA (medicao da pista irma, fv-r6b). E o
// pedido que ele carrega — "Plans from $7/month" / "Starter is $7/month" — tem
// **ZERO chegadas** em toda a sua historia: `intent_campaign =
// 'video_ready_email_plan_truth_v1'` da 0 linhas.
//
// CONTROLE RODADO ANTES DE CHAMAR DE ZERO (memoria `zero-escritas-conte-as-oportunidades`
// e `provar-leitura-sem-trafego`): `intent_campaign` E escrito — 726 linhas para
// `push69_home_one_click_starters`, 247 para `studio_v4`, e o campo aparece em
// 1.073 eventos. Se alguem tivesse clicado, estaria la. O zero e real.
//
// A JOGADA. A casa tem uma oferta mais barata que $7/mes desde 07/09 — o trial
// pago de $1 — e ela nao existia em NENHUM e-mail de entrega. O plano continua
// visivel logo abaixo (ordem do fundador: "nunca esconder o plano"); o que muda
// e que o primeiro degrau deixa de ser uma decisao mensal.
//
// ═══ AS TRES TRAVAS DE HONESTIDADE (memoria `vitrine-oferece-o-que-o-cobrador-recusa`)
// O cobrador (`app/api/stripe/checkout/route.ts`) zera `wantsTrial` em dois
// casos, e anunciar $1 para quem sera cobrado $15 e uma mentira medivel:
//   1. `has_paid === true` → `card_trial_denied: 'has_paid'`. Por isso a porta
//      exige `hasPaid === false` PROVADO, e nao `!isSubscriber`: o segundo e
//      mais largo (inclui plano pago) e, pior, e verdadeiro quando a linha de
//      perfil NAO CARREGOU. Falha fechada: desconhecido nao abre a porta.
//      No banco, `has_paid` nunca e nulo (1.824 false / 13 true) — exigir o
//      `false` explicito nao custa alcance nenhum e protege da leitura falha.
//   2. `tier !== TRIAL_TIER` ('basic'). A porta e SEMPRE Creator — por isso ela
//      NAO substitui o link de plano, que fala de Starter. Ela se soma.
//   3. Sem os dois rotulos formatados nao ha promessa auditavel: nenhum numero
//      e digitado aqui. Tudo vem de `lib/lifecycle/trialEntryFee.ts`, que le a
//      MESMA constante que a Stripe cobra (`CARD_TRIAL_ENTRY_FEE_MINOR`) e a
//      MESMA tabela de mensalidade (`getTierPrice('basic')`).
//
// O QUE A PORTA **NAO** PROMETE. A caixa da TELA diz "Get this film clean"
// porque ela tem o `renderId` na mao e `/api/compose/unlock` sabe remontar
// aquele filme. O e-mail **nao tem** esse caminho — prometer export limpo aqui
// seria vender o que este link nao entrega (CLAUDE.md: "NUNCA prometer a um
// cliente algo que o produto nao sabe executar sozinho"). Entao ela promete
// exatamente o que a Stripe faz no clique: os dias, os creditos concedidos no
// ato, a mensalidade a partir do dia seguinte, e o cancelamento.
const TRIAL_DOOR_INTENT = 'video_ready_email_trial_1usd_v1'

/**
 * O degrau de $1, ou `null` quando o cobrador recusaria / o preco nao resolve.
 * `prominent` = e o unico pedido de dinheiro do e-mail (ramos sem saldo), e ai
 * ele ganha o botao; nos ramos com episodio 2 ele entra como linha, para nao
 * disputar o clique com a peca que melhor preve pagamento.
 */
function trialDoorHtml(
  appUrl: string,
  hasPaid: boolean | null | undefined,
  campaign: string,
  prominent: boolean,
): string | null {
  if (!CARD_TRIAL_LIVE) return null // KINEO-RESTAURACAO-2026-09-09 — trial de $1 desligado
  if (hasPaid !== false) return null
  const fee = trialEntryFeeLabel({ compact: true })
  const monthly = trialMonthlyAfterLabel({ compact: true })
  if (!fee || !monthly) return null
  const url =
    `${appUrl.replace(/\/+$/, '')}/api/stripe/checkout?tier=basic&billing=monthly&trial=1` +
    `&intent_campaign=${TRIAL_DOOR_INTENT}` +
    `&utm_source=lifecycle&utm_medium=email&utm_campaign=${campaign}`
  const note =
    `${fee} today &middot; ${CARD_TRIAL_GRANT_CREDITS} credits now &middot; ` +
    `then ${monthly}/month from day ${CARD_TRIAL_DAYS + 1} &middot; cancel anytime`
  if (prominent) {
    return (
      `<p style="margin:18px 0 0"><a href="${esc(url)}" style="display:block;background:#1f1f23;border:1px solid #2a2a30;border-left:4px solid #2997ff;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 16px;border-radius:8px;">` +
      `Try Creator for ${fee} &mdash; ${CARD_TRIAL_DAYS} days &rarr;</a></p>` +
      `<p style="color:#64748b;font-size:12px;margin:8px 0 0">${note}</p>`
    )
  }
  return (
    `<p style="color:#94a3b8;font-size:12px;margin:14px 0 0">Or start Creator for ${fee} &mdash; ` +
    `<a href="${esc(url)}" style="color:#2997ff;">${CARD_TRIAL_DAYS} days, then ${monthly}/month &rarr;</a> ` +
    `<span style="color:#64748b">${note}</span></p>`
  )
}

export function videoReadyFooter(input: VideoReadyFooterInput): VideoReadyFooter {
  const { appUrl } = input
  const credits = typeof input.creditsRemaining === 'number' && Number.isFinite(input.creditsRemaining)
    ? Math.floor(input.creditsRemaining)
    : null

  // 1) Assinante: nunca pede dinheiro no e-mail de entrega; pede o proximo filme.
  if (input.isSubscriber) {
    const ep2 = episodeTwoHtml(appUrl, input.topic, 'video_ready_subscriber_episode2')
    const left = creditsLeftLine(credits)
    const lead = left
      ? `${left} this cycle &mdash; the next episode is one click away.`
      : 'The next episode is one click away.'
    return {
      kind: 'subscriber_next',
      html: `<p style="color:#94a3b8;font-size:13px;margin:24px 0 0">${lead}</p>${ep2}`,
      // Quem ja paga nunca ve a porta de entrada: o cobrador recusaria (`has_paid`)
      // e o pedido dele nao e entrar, e o proximo filme.
      trialDoor: false,
    }
  }

  // 2) Nao paga, mas tem saldo para o proximo video: o 2o video vem antes do preco.
  if (credits !== null && credits >= NEXT_VIDEO_MIN_CREDITS) {
    const ep2 = episodeTwoHtml(appUrl, input.topic, 'video_ready_trial_episode2')
    const left = creditsLeftLine(credits)
    const plan = filmsPlanHtml(appUrl, input.cost, input.durationSeconds, 'video_ready_trial_plan_films') ?? genericPlanHtml(appUrl)
    // Ela tem saldo: o episodio 2 continua sendo o primeiro pedido (27 pessoas
    // usaram o botao de serie e 3 pagaram, ~7x a base). A porta entra DEPOIS
    // dele, como linha, e antes do plano cheio — e o degrau mais barato, nao o
    // primeiro convite.
    const door = trialDoorHtml(appUrl, input.hasPaid, 'video_ready_trial_door_1usd', false)
    return {
      kind: 'trial_episode2',
      html: `<p style="color:#94a3b8;font-size:13px;margin:24px 0 0">${left} &mdash; enough for the next episode. People who make a second video are the ones who keep going.</p>${ep2}${door ?? ''}${plan}`,
      trialDoor: door !== null,
    }
  }

  // 2b) SALDO DESCONHECIDO — sprint-assinaturas #1 (05/09).
  //
  // O QUE ESTAVA ERRADO. `credits === null` caia direto no ramo 3 e a pessoa
  // recebia o rodape de quem esta SEM saldo: sem a porta do episodio 2, so o
  // preco. E `null` aqui nunca significou "zero" — significa que o remetente
  // NAO SABIA. Medido no banco (marco 03/09 16:00 UTC, 43h, contas externas):
  // dos 26 e-mails `plan_films`, **22 sairam com `credits_remaining` NULL**, e
  // 17 das 20 pessoas desse grupo tinham >= 5 creditos na mao (media 8,3; teto
  // 12) — saldo de sobra para o proximo filme no Kineo 1 (5cr). A causa e
  // estrutural, nao aleatoria: nos motores cinematicos o credito e consumido na
  // ABERTURA do job, entao a rota de status nao tem retorno de debito e carimba
  // `creditsRemaining = null` de proposito. Ou seja, quem usou o motor caro —
  // justamente quem demonstrou mais intencao — era o unico a perder a porta.
  //
  // REGRA NOVA: desconhecido nao vira zero. A porta do episodio 2 e o PROPRIO
  // tema da pessoa — nunca e mentira, nao custa nada e e a peca que mais preve
  // pagamento (27 pessoas usaram o botao de serie e 3 pagaram, ~7x a base). O
  // pedido de plano CONTINUA igual, byte a byte (mesma funcao, mesma copy,
  // mesmo link): o que muda e que ele deixa de ser a UNICA saida. E nenhuma
  // frase afirma saldo — sem numero provado, nao se cita numero.
  if (credits === null && !input.isSubscriber) {
    const ep2 = episodeTwoHtml(appUrl, input.topic, 'video_ready_unknown_balance_episode2', 'video_ready_unknown_balance')
    if (ep2) {
      const plan =
        filmsPlanHtml(appUrl, input.cost, input.durationSeconds, 'video_ready_unknown_balance_plan_films') ??
        genericPlanHtml(appUrl)
      const door = trialDoorHtml(appUrl, input.hasPaid, 'video_ready_unknown_balance_door_1usd', false)
      return {
        kind: 'unknown_balance_episode2',
        html: `<p style="color:#94a3b8;font-size:13px;margin:24px 0 0">The next episode is one click away.</p>${ep2}${door ?? ''}${plan}`,
        trialDoor: door !== null,
      }
    }
    // Sem tema utilizavel nao ha porta para abrir: cai no ramo de hoje.
  }

  // 3) Nao paga e o saldo PROVADO nao compra o proximo: o plano, medido em
  //    filmes como este. So se chega aqui com numero na mao (ou sem tema).
  // Aqui o saldo NAO compra o proximo filme: dinheiro e o unico pedido possivel,
  // entao a porta ganha o botao e vem ANTES do plano. E o unico ramo em que a
  // pessoa nao tem nada de graca para fazer a seguir — e era exatamente o ramo
  // que recebia "Plans from $7/month", o pedido com zero cliques na historia.
  const door = trialDoorHtml(appUrl, input.hasPaid, 'video_ready_no_balance_door_1usd', true)

  const films = filmsPlanHtml(appUrl, input.cost, input.durationSeconds, 'video_ready_plan_films')
  if (films) return { kind: 'plan_films', html: `${door ?? ''}${films}`, trialDoor: door !== null }

  // 4) Custo desconhecido: a copy de hoje.
  return { kind: 'plan_generic', html: `${door ?? ''}${genericPlanHtml(appUrl)}`, trialDoor: door !== null }
}

// ═══ sprint-assinaturas #26 (02/09) — mesma leitura de perfil + linha de
// `videos` que o cron de resgate (#25) faz localmente, agora exportada para o
// `send-video-ready` (o 3º e-mail de "vídeo pronto" da casa) usar o MESMO
// rodapé por situação. Trial ativo (starter_trial/creator_trial…) NÃO conta
// como assinante — ainda não pagou. Nunca lança: perfil/vídeo nulos caem na
// copy genérica (numero certo) como no #24.
// Só planos PAGOS. Em produção (02/09) o trial vive em plan='free' +
// trial_ends_at; nomes `*_trial` não existem em `profiles` e, se um dia
// existirem, são trial — não assinatura.
const READY_PAID_PLANS = new Set(['starter', 'basic', 'pro', 'creator', 'studio'])

export type ReadyProfileRow = { has_paid?: boolean | null; plan?: string | null; video_credits?: number | null } | null
export type ReadyVideoRow = { title?: string | null; topic?: string | null; credits_used?: number | null; duration?: number | null } | null

export function isSubscriberProfile(prof: ReadyProfileRow): boolean {
  const planName = (prof?.plan ?? 'free').toLowerCase()
  return prof?.has_paid === true || READY_PAID_PLANS.has(planName)
}

export function videoReadyFooterFromRows(prof: ReadyProfileRow, vid: ReadyVideoRow, appUrl: string): VideoReadyFooter {
  const credits = typeof prof?.video_credits === 'number' && Number.isFinite(prof.video_credits) ? prof.video_credits : null
  const cost = typeof vid?.credits_used === 'number' && Number.isFinite(vid.credits_used) ? vid.credits_used : 0
  const topic = ((vid?.title ?? '') || (vid?.topic ?? '') || '').trim()
  const duration = typeof vid?.duration === 'number' && Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : null
  return videoReadyFooter({
    isSubscriber: isSubscriberProfile(prof),
    creditsRemaining: credits,
    cost,
    topic,
    durationSeconds: duration,
    appUrl,
    // O predicado ESTREITO do cobrador, propagado como esta na linha: `false`
    // so quando a coluna existe e e falsa. Linha ausente => `undefined` => a
    // porta de $1 nao abre (falha fechada).
    hasPaid: typeof prof?.has_paid === 'boolean' ? prof.has_paid : null,
  })
}
