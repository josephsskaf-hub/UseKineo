// ═══ KINEO-JOGADAS-VENDA-1510 — JOGADA 2: a carta quente mostra o PRÓPRIO filme da pessoa (e o passe a quem é da região) ═══
//
// NÃO É CARTA NOVA. A carta existe desde 07/09 (app/api/admin/send-checkout-hot-nudge, cron "6,21,36,51 * * * *"): sai
// 30 min–6 h depois do clique de comprar, SÓ com a sessão da Stripe ainda `open` (o botão é a MESMA página), uma por pessoa
// na vida, supressão de 24 h, fora quem levou outra campanha em 7 dias. A janela e os carimbos ficam como estão: o banco
// mostrou que ela sai cedo (14 dias, 15 envios, 33–44 min depois do clique) e quem paga paga em 0–5 min — não há
// atraso para consertar.
//
// O QUE O BANCO MOSTROU (14/10, só SELECT, contas internas fora, 14 dias):
//   · 21 pessoas apertaram comprar; 4 pagaram; 19 tinham ZERO vídeo no clique (as 15 cartas enviadas saíram todas com
//     has_film=false). A carta, que tinha a frase "You already made X", praticamente nunca a usou;
//   · 12 das 21 nasceram 'region_paid_only' (país fora do trial) e abriram checkout de ASSINATURA — para elas existe, desde
//     05/10, o passe de 1 filme pagamento único (pack:starter, PACK_PRICE_MINOR) que a carta nunca nomeava;
//   · `checkout_started.metadata.ip_country` vem vazio em 100% (57/57 em 30 dias): a carta não sabia o país, e por isso
//     nem a língua. O perfil sabe (signup_country/last_country) — 7 das 57 são do Brasil;
//   · a busca de "filme entregue" lia o vídeo mais novo de QUALQUER status: um render falho virava "You already made".
//
// O QUE MUDA (só conteúdo):
//   (1) o filme PRÓPRIO, quando existe e foi ENTREGUE (status 'completed'): a capa (thumb_url/thumbnail_url, bucket
//       público; 160 de 169 entregas de 14 dias têm capa) com o link da biblioteca logada (/history) — nunca a página
//       pública /v/, nunca o MP4, nunca o id do vídeo (vídeo é privado por padrão). Anúncio e clipe dizem o que são;
//   (2) sem filme: a frase honesta de sempre ("You got as far as the payment page…") e o botão da mesma página;
//   (3) conta 'region_paid_only' elegível ao passe (regionPassOfferEligible: has_paid PROVADO false, plano grátis,
//       REGION_PASS_OFFER_LIVE) que abandonou uma ASSINATURA: uma linha secundária com o passe de 1 filme, no preço da
//       moeda que a Stripe vai cobrar (precoDaCarta = regionPassPrice, a mesma chamada do checkout do pack) e o link da
//       rota do passe (grava o clique e segue ao checkout). Nenhum preço digitado, nenhum preço novo;
//   (4) a língua pelo país do perfil (linguaDoPais: PT/ES quando o país indica, senão inglês) — a mesma régua das cartas
//       da região (lib/lifecycle/regionFirstFilmEmail.ts).
//
// MÓDULO PURO (só imports relativos e puros): a rota e o guardião scripts/test-jogadas-venda-1510.mjs executam as MESMAS
// funções. O texto em inglês da carta continua na rota (os guardiões de 07/09 e 08/10 o leem lá); daqui saem o bloco do
// filme, a linha do passe e a carta inteira em português e espanhol.
import { WELCOME20_PERCENT_OFF } from '../growth/publicPromoTruth'
import { regionPassGoHref, regionPassOfferEligible, type RegionPassPrice } from '../regionPass'
import { linguaDoPais, paisDoPerfil, precoDaCarta, type RegionEmailLang } from './regionFirstFilmEmail'

export const CARTA_QUENTE_MARK = 'KINEO-JOGADAS-VENDA-1510' as const
/** Gravado no carimbo de envio ao lado do EMAIL_VERSION de sempre (que os guardiões de 08/10 conferem byte a byte). */
export const CARTA_QUENTE_COPY_VERSION = 'hot_nudge_own_film_1510' as const
/** Interruptor ÚNICO da linha do passe nesta carta (o passe em si continua governado por REGION_PASS_OFFER_LIVE). */
export const HOT_NUDGE_PASS_LIVE = true

const SITE = 'https://www.usekineo.com'
/** Campanhas separadas no placar: o clique na capa/biblioteca × o clique no passe. */
export const OWN_FILM_CAMPAIGN = 'checkout_hot_nudge_own_film' as const
export const PASS_CAMPAIGN = 'checkout_hot_nudge_pass' as const

export type CartaLang = RegionEmailLang
export type TipoDaEntrega = 'film' | 'ad' | 'clip'

export type LinhaDeVideo = {
  status?: unknown
  quality_mode?: unknown
  thumb_url?: unknown
  thumbnail_url?: unknown
}

/** A entrega mais recente. As linhas chegam do mais novo para o mais velho; só 'completed' conta (falhou, está rodando ou
 *  foi estornado = não é entrega, e nomeá-lo seria mentira). */
export function ultimaEntrega<T extends LinhaDeVideo>(linhas: readonly T[] | null | undefined): T | null {
  for (const l of linhas ?? []) if (l && l.status === 'completed') return l
  return null
}

/** O que a pessoa recebeu: anúncio (quality_mode 'ads…'), clipe de efeito ('clip') ou filme (o resto). */
export function tipoDaEntrega(qualityMode: unknown): TipoDaEntrega {
  if (qualityMode === 'clip') return 'clip'
  if (typeof qualityMode === 'string' && qualityMode.startsWith('ads')) return 'ad'
  return 'film'
}

/** A capa só entra se for https sem nada que quebre o atributo (aspas, espaço, sinais de tag). Senão, sem imagem. */
export function capaSegura(...urls: unknown[]): string | null {
  for (const u of urls) {
    if (typeof u !== 'string') continue
    const t = u.trim()
    if (t.length > 0 && t.length <= 1000 && /^https:\/\/[^\s"'<>`]+$/.test(t)) return t
  }
  return null
}

export type FilmeProprio = { tipo: TipoDaEntrega; capa: string | null }

export function filmeProprioDe(linha: LinhaDeVideo | null | undefined): FilmeProprio | null {
  if (!linha || linha.status !== 'completed') return null
  return { tipo: tipoDaEntrega(linha.quality_mode), capa: capaSegura(linha.thumb_url, linha.thumbnail_url) }
}

/** Onde a pessoa vê o PRÓPRIO filme: a biblioteca logada. Nunca /v/, nunca o MP4, nunca o id do vídeo. */
export function linkDaBiblioteca(): string {
  return `${SITE}/history?utm_source=lifecycle&utm_medium=email&utm_campaign=${OWN_FILM_CAMPAIGN}`
}

/** O botão do passe: a rota do passe (grava region_paid_offer_clicked e segue ao checkout do pack com a campanha da
 *  região). Sem login, ela cai no checkout de sempre do pack — que pede o login antes. */
export function linkDoPasseNaCarta(): string {
  return `${SITE}${regionPassGoHref('first_film')}&utm_source=lifecycle&utm_medium=email&utm_campaign=${PASS_CAMPAIGN}`
}

export type PasseNaCarta = { preco: RegionPassPrice; href: string }

/**
 * A linha do passe entra? Fechada por padrão:
 *   · interruptor desta carta ligado;
 *   · a página abandonada é uma ASSINATURA (mode 'subscription'). Quem abandonou o próprio passe (mode 'payment') já tem
 *     o passe no botão principal; sessão desconhecida = não;
 *   · a conta é da régua do passe (regionPassOfferEligible: 'region_paid_only', has_paid === false, plano grátis, e o
 *     interruptor do passe REGION_PASS_OFFER_LIVE).
 */
export function passeParaCarta(input: {
  perfil: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null } | null | undefined
  modoDaSessao: unknown
  pais: string | null
  live?: boolean
}): PasseNaCarta | null {
  if ((input.live ?? HOT_NUDGE_PASS_LIVE) !== true) return null
  if (input.modoDaSessao !== 'subscription') return null
  if (!regionPassOfferEligible(input.perfil)) return null
  return { preco: precoDaCarta(input.pais), href: linkDoPasseNaCarta() }
}

/** País e língua da carta pelo perfil (o checkout_started não traz o país). Desconhecido → inglês. */
export function paisELingua(perfil: { signup_country?: unknown; last_country?: unknown } | null | undefined, paisDoClique?: string | null): { pais: string | null; lang: CartaLang } {
  const doClique = typeof paisDoClique === 'string' && /^[A-Z]{2}$/.test(paisDoClique.trim().toUpperCase()) ? paisDoClique.trim().toUpperCase() : null
  const pais = doClique ?? paisDoPerfil(perfil)
  return { pais, lang: linguaDoPais(pais) }
}

export type ExtrasDaCarta = { lang: CartaLang; proprio: FilmeProprio | null; passe: PasseNaCarta | null }
export const SEM_EXTRAS: ExtrasDaCarta = { lang: 'en', proprio: null, passe: null }

// ─── O texto (en/pt/es) ─────────────────────────────────────────────────────────────────────────────────────────────
type Copy = {
  hey: string
  open: string
  feitoComNome: (nome: string, tipo: TipoDaEntrega) => string
  feitoSemNome: (tipo: TipoDaEntrega) => string
  semFilme: string
  naBiblioteca: string
  verNaBiblioteca: string
  capaAlt: (tipo: TipoDaEntrega) => string
  boasVindas: (plano: string) => string
  boasVindasBotao: string
  mesmaPagina: string
  mesmaPaginaCurta: string
  botao: string
  passe: (segundos: number, preco: string) => string
  passeBotao: (preco: string) => string
  resposta: string
  assinatura: string
  assunto: (filme: string | null) => string
}

const UM: Record<CartaLang, Record<TipoDaEntrega, string>> = {
  en: { film: 'a short', ad: 'an ad', clip: 'a clip' },
  pt: { film: 'um vídeo', ad: 'um anúncio', clip: 'um clipe' },
  es: { film: 'un video', ad: 'un anuncio', clip: 'un clip' },
}
/** "a short" / "an ad" / "a clip" — a frase sem título da rota (inglês) usa esta. */
export function umaEntrega(lang: CartaLang, tipo: TipoDaEntrega | null | undefined): string {
  return UM[lang][tipo ?? 'film']
}

export const CARTA_QUENTE_COPY: Record<CartaLang, Copy> = {
  en: {
    hey: 'Hey — Joseph here, founder of Kineo.',
    open: 'You opened the payment page a little while ago and it is still sitting there, open. No charge was made.',
    feitoComNome: (n, t) => (t === 'ad' ? `You already made the ad “${n}” with Kineo, so you know what comes out the other side.` : `You already made “${n}” with Kineo, so you know what comes out the other side.`),
    feitoSemNome: (t) => `You already made ${UM.en[t]} with Kineo, so you know what comes out the other side.`,
    semFilme: 'You got as far as the payment page, so something about this was worth your time.',
    naBiblioteca: 'It is saved in your library, private to your account:',
    verNaBiblioteca: 'Watch it again in your library',
    capaAlt: (t) => (t === 'ad' ? 'Your ad' : t === 'clip' ? 'Your clip' : 'Your video'),
    boasVindas: (p) => `If it was the price: your first month of ${p} is ${WELCOME20_PERCENT_OFF}% off with our welcome offer. Same plan, applied automatically, no code to type:`,
    boasVindasBotao: `Finish with ${WELCOME20_PERCENT_OFF}% off your first month`,
    mesmaPagina: 'If life just got in the way, this is the same page you left — same plan, same price, nothing to pick again:',
    mesmaPaginaCurta: 'If life just got in the way, the same page you left is still open — same plan, same price, nothing to pick again:',
    botao: 'Finish where you left off',
    passe: (s, p) => `Not ready for a subscription? One ${s}-second film for ${p} — paid once, no renewal:`,
    passeBotao: (p) => `Make one film · ${p}`,
    resposta: 'And if something on that page did not add up, hit reply and tell me in one sentence. It comes straight to me, and I would rather know than guess.',
    assinatura: '— Joseph, founder',
    assunto: (f) => (f ? `Your payment page for "${f}" is still open` : 'Your Kineo payment page is still open'),
  },
  pt: {
    hey: 'Oi — aqui é o Joseph, fundador da Kineo.',
    open: 'Você abriu a página de pagamento há pouco e ela continua lá, aberta. Nada foi cobrado.',
    feitoComNome: (n, t) => (t === 'ad' ? `Você já fez o anúncio “${n}” na Kineo, então sabe o que sai do outro lado.` : `Você já fez “${n}” na Kineo, então sabe o que sai do outro lado.`),
    feitoSemNome: (t) => `Você já fez ${UM.pt[t]} na Kineo, então sabe o que sai do outro lado.`,
    semFilme: 'Você chegou até a página de pagamento, então alguma coisa aqui valeu o seu tempo.',
    naBiblioteca: 'Ele está salvo na sua biblioteca, visível só para a sua conta:',
    verNaBiblioteca: 'Ver de novo na sua biblioteca',
    capaAlt: (t) => (t === 'ad' ? 'Seu anúncio' : t === 'clip' ? 'Seu clipe' : 'Seu vídeo'),
    boasVindas: (p) => `Se foi o preço: o primeiro mês do ${p} sai com ${WELCOME20_PERCENT_OFF}% de desconto na nossa oferta de boas-vindas. Mesmo plano, aplicado sozinho, sem código para digitar:`,
    boasVindasBotao: `Concluir com ${WELCOME20_PERCENT_OFF}% de desconto no 1º mês`,
    mesmaPagina: 'Se foi só a vida que atrapalhou, esta é a mesma página que você deixou — mesmo plano, mesmo preço, nada para escolher de novo:',
    mesmaPaginaCurta: 'Se foi só a vida que atrapalhou, a mesma página que você deixou continua aberta — mesmo plano, mesmo preço, nada para escolher de novo:',
    botao: 'Concluir de onde parei',
    passe: (s, p) => `Ainda não quer assinatura? Um filme de ${s} segundos por ${p} — pago uma vez, sem renovação:`,
    passeBotao: (p) => `Fazer um filme · ${p}`,
    resposta: 'E se algo naquela página não fez sentido, responda este e-mail e me diga em uma frase. Chega direto para mim, e prefiro saber a adivinhar.',
    assinatura: '— Joseph, fundador',
    assunto: (f) => (f ? `Sua página de pagamento de "${f}" continua aberta` : 'Sua página de pagamento da Kineo continua aberta'),
  },
  es: {
    hey: 'Hola — soy Joseph, fundador de Kineo.',
    open: 'Abriste la página de pago hace un rato y sigue ahí, abierta. No se hizo ningún cobro.',
    feitoComNome: (n, t) => (t === 'ad' ? `Ya hiciste el anuncio “${n}” con Kineo, así que sabes lo que sale del otro lado.` : `Ya hiciste “${n}” con Kineo, así que sabes lo que sale del otro lado.`),
    feitoSemNome: (t) => `Ya hiciste ${UM.es[t]} con Kineo, así que sabes lo que sale del otro lado.`,
    semFilme: 'Llegaste hasta la página de pago, así que algo de esto valió tu tiempo.',
    naBiblioteca: 'Está guardado en tu biblioteca, visible solo para tu cuenta:',
    verNaBiblioteca: 'Verlo de nuevo en tu biblioteca',
    capaAlt: (t) => (t === 'ad' ? 'Tu anuncio' : t === 'clip' ? 'Tu clip' : 'Tu video'),
    boasVindas: (p) => `Si fue el precio: el primer mes de ${p} tiene ${WELCOME20_PERCENT_OFF}% de descuento con nuestra oferta de bienvenida. El mismo plan, aplicado solo, sin código que escribir:`,
    boasVindasBotao: `Terminar con ${WELCOME20_PERCENT_OFF}% de descuento el 1.er mes`,
    mesmaPagina: 'Si solo se te cruzó la vida, esta es la misma página que dejaste — mismo plan, mismo precio, nada que elegir de nuevo:',
    mesmaPaginaCurta: 'Si solo se te cruzó la vida, la misma página que dejaste sigue abierta — mismo plan, mismo precio, nada que elegir de nuevo:',
    botao: 'Terminar donde lo dejé',
    passe: (s, p) => `¿Todavía no quieres una suscripción? Una película de ${s} segundos por ${p} — un solo pago, sin renovación:`,
    passeBotao: (p) => `Hacer una película · ${p}`,
    resposta: 'Y si algo en esa página no cuadró, responde este correo y dímelo en una frase. Me llega directo, y prefiero saber que adivinar.',
    assinatura: '— Joseph, fundador',
    assunto: (f) => (f ? `Tu página de pago de "${f}" sigue abierta` : 'Tu página de pago de Kineo sigue abierta'),
  },
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const AZUL = '#2997ff'

/** O bloco do filme próprio (texto): uma frase e o link da biblioteca. Vazio sem filme. */
export function blocoDoFilmeTexto(x: ExtrasDaCarta): string {
  if (!x.proprio) return ''
  return ` ${CARTA_QUENTE_COPY[x.lang].naBiblioteca} ${linkDaBiblioteca()}`
}

/** O bloco do filme próprio (html): a capa (quando existe) e o link, os dois para a biblioteca logada. */
export function blocoDoFilmeHtml(x: ExtrasDaCarta): string {
  if (!x.proprio) return ''
  const c = CARTA_QUENTE_COPY[x.lang]
  const href = linkDaBiblioteca()
  const capa = x.proprio.capa
    ? `<p style="margin:0 0 8px"><a href="${href}"><img src="${esc(x.proprio.capa)}" alt="${esc(c.capaAlt(x.proprio.tipo))}" width="160" style="display:block;border:0;border-radius:12px;max-width:160px" /></a></p>\n`
    : ''
  return `${capa}<p style="margin:0 0 18px;font-size:14px"><a href="${href}" style="color:${AZUL}">${esc(c.verNaBiblioteca)} &rarr;</a></p>\n`
}

/** A linha do passe (texto). Vazia sem passe. */
export function passeTexto(x: ExtrasDaCarta): string {
  if (!x.passe) return ''
  const c = CARTA_QUENTE_COPY[x.lang]
  return `\n${c.passe(x.passe.preco.seconds, x.passe.preco.label)}\n\n${x.passe.href}\n`
}

/** A linha do passe (html): botão SECUNDÁRIO (contorno), abaixo do botão da mesma página. */
export function passeHtml(x: ExtrasDaCarta): string {
  if (!x.passe) return ''
  const c = CARTA_QUENTE_COPY[x.lang]
  const p = x.passe.preco.label
  return `<p style="font-size:14px;color:#555;margin:18px 0 8px">${esc(c.passe(x.passe.preco.seconds, p))}</p>
<p style="margin:0 0 22px"><a href="${x.passe.href}" style="color:#1a1a1a;border:1px solid #c8c8c8;text-decoration:none;padding:9px 16px;border-radius:8px;font-weight:700;display:inline-block">${esc(c.passeBotao(p))}</a></p>
`
}

export type OfertaNaCarta = { oferecer: true; plano: string; link: string } | { oferecer: false }

/** O assunto em pt/es (o inglês continua na rota, byte a byte). */
export function assuntoTraduzido(lang: CartaLang, filme: string | null): string {
  return CARTA_QUENTE_COPY[lang].assunto(filme)
}

/**
 * A carta inteira em português ou espanhol — a MESMA estrutura da inglesa da rota: aviso da página aberta, o que a pessoa
 * já fez (ou a frase honesta), a oferta de boas-vindas só com direito, o botão da MESMA página, o passe (quando entra),
 * o convite de resposta e o rodapé de descadastro.
 */
export function cartaTraduzida(input: {
  lang: CartaLang
  filme: string | null
  temFilme: boolean
  liveUrl: string
  oferta: OfertaNaCarta
  extra: ExtrasDaCarta
  rodape: { text: string; html: string }
}): { text: string; html: string } {
  const c = CARTA_QUENTE_COPY[input.lang]
  const x: ExtrasDaCarta = { ...input.extra, lang: input.lang }
  const tipo = x.proprio?.tipo ?? 'film'
  const feitoT = input.temFilme ? (input.filme ? c.feitoComNome(input.filme, tipo) : c.feitoSemNome(tipo)) : c.semFilme
  const feitoH = input.temFilme
    ? (input.filme ? esc(c.feitoComNome(input.filme, tipo)).replace(esc(`“${input.filme}”`), `<strong>${esc(`“${input.filme}”`)}</strong>`) : esc(c.feitoSemNome(tipo)))
    : esc(c.semFilme)
  const ofertaT = input.oferta.oferecer ? `${c.boasVindas(input.oferta.plano)}\n\n${input.oferta.link}\n\n` : ''
  const text = `${c.hey}

${c.open}

${feitoT}${blocoDoFilmeTexto(x)}

${ofertaT}${c.mesmaPagina}

${input.liveUrl}
${passeTexto(x)}
${c.resposta}

${c.assinatura}
Kineo · usekineo.com
${input.rodape.text}`
  const botao = (href: string, rotulo: string) => `<p style="margin:26px 0">
  <a href="${href}" style="background:${AZUL};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${esc(rotulo)} &rarr;</a>
</p>`
  const meio = input.oferta.oferecer
    ? `<p>${esc(c.boasVindas(input.oferta.plano))}</p>
${botao(input.oferta.link, c.boasVindasBotao)}
<p style="font-size:14px;color:#555"><a href="${input.liveUrl}" style="color:${AZUL}">${esc(c.mesmaPaginaCurta)}</a></p>`
    : `<p>${esc(c.mesmaPagina)}</p>
${botao(input.liveUrl, c.botao)}`
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>${esc(c.hey)}</p>
<p>${esc(c.open)}</p>
<p>${feitoH}</p>
${blocoDoFilmeHtml(x)}${meio}
${passeHtml(x)}<p>${esc(c.resposta)}</p>
<p>${esc(c.assinatura)}<br/>Kineo &middot; <a href="https://usekineo.com" style="color:${AZUL}">usekineo.com</a></p>
${input.rodape.html}</div>`
  return { text, html }
}
