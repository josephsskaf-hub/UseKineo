// KINEO-EMAIL-FILME-NA-PAGINA-1111 — [CEO 11/11, proposta 1 do estudo "A espera do filme"]
// O botão do e-mail "filme pronto" leva à NOSSA página do filme (My Videos, com o filme abrindo e tocando), não ao MP4 cru
// do bucket. Medido em 11/11 (14 dias, 74 primeiros filmes): 25 ficaram prontos com a pessoa fora e 18 nunca voltaram; o
// clique no MP4 cru não deixava rastro nem mostrava o próximo passo. O MP4 direto continua no e-mail, como linha secundária.
//
// Destino escolhido: /history?v=<id> (a página "My Videos"). É a única página NOSSA, já existente, onde um filme PRIVADO da
// própria conta toca (FilmPreviewDialog abre com autoPlay) e baixa (o botão de download conta `video_download_clicked`
// com o video_id). /v/<id> só existe para filme publicado; /film-60 é ponte para o checkout. /library embute a mesma lista,
// mas abre por abas; /history é a página dedicada e o atalho #v-<id> já era usado por /library e /ads.
//
// Medida em 3 degraus, todos com o video_id:
//   1. clique   — `video_ready_email_clicked` (servidor, /api/email/filme-pronto, antes do login: conta até quem desiste nele)
//   2. viu      — `video_ready_email_landed` com opened=true (o filme abriu tocando na página)
//   3. baixou   — `video_download_clicked` (já existia; surface 'library_lightbox')
//
// Interruptor: EMAIL_FILME_NA_PAGINA_LIVE = false devolve o e-mail de antes, byte a byte (o guardião confere).

/** Interruptor desta entrega. false = botão volta ao MP4 cru, sem a linha secundária (e-mail idêntico ao de antes). */
export const EMAIL_FILME_NA_PAGINA_LIVE = true as boolean

export const EMAIL_FILME_CLICK_PATH = '/api/email/filme-pronto'
export const EMAIL_FILME_CLICKED_EVENT = 'video_ready_email_clicked'
export const EMAIL_FILME_LANDED_EVENT = 'video_ready_email_landed'
export const EMAIL_FILME_UTM_SOURCE = 'video_ready_email'
export const EMAIL_FILME_VERSION = 'email_filme_na_pagina_1111_v1'

const VIDEO_ID = /^[A-Za-z0-9-]{8,64}$/

/** O id do filme é aceito? (uuid da tabela videos; nada que quebre a URL nem o HTML) */
export function videoIdValido(raw: unknown): raw is string {
  return typeof raw === 'string' && VIDEO_ID.test(raw)
}

/** O link do e-mail: passa pela rota que conta o clique e segue para a página do filme. */
export function emailFilmeHref(appUrl: string, videoId: string): string {
  return `${appUrl.replace(/\/$/, '')}${EMAIL_FILME_CLICK_PATH}?${new URLSearchParams({ v: videoId }).toString()}`
}

/** Para onde a rota do clique manda: a página do filme, com o filme marcado e a origem do e-mail. Sempre relativo. */
export function emailFilmeDestino(videoId: string): string {
  return `/history?${new URLSearchParams({ v: videoId, utm_source: EMAIL_FILME_UTM_SOURCE, utm_medium: 'email', utm_campaign: 'film_ready' }).toString()}`
}

export type EmailFilmeBotao = {
  /** href do botão principal */
  href: string
  /** texto do botão principal */
  label: string
  /** linha secundária com o MP4 direto ('' quando desligado) */
  secondaryHtml: string
  /** carimbo para o evento video_ready_email_sent: este e-mail levou o link da página? */
  paginaDoFilme: boolean
}

/**
 * O botão do e-mail "filme pronto". Desligado, ou sem id de filme: o botão de antes (MP4 cru, "⬇ Download Your Short") e
 * nenhuma linha a mais — o e-mail sai byte a byte como antes.
 */
export function emailFilmeBotao(input: { appUrl: string; videoId: string | null | undefined; rawUrl: string; live?: boolean }): EmailFilmeBotao {
  const live = input.live ?? EMAIL_FILME_NA_PAGINA_LIVE
  if (!live || !videoIdValido(input.videoId)) {
    return { href: input.rawUrl, label: '⬇ Download Your Short', secondaryHtml: '', paginaDoFilme: false }
  }
  const raw = input.rawUrl.replace(/"/g, '')
  return {
    href: emailFilmeHref(input.appUrl, input.videoId),
    label: '▶ Watch your film',
    secondaryHtml: `\n                <p style="color:#64748b;font-size:12px;margin:10px 0 0">or <a href="${raw}" style="color:#94a3b8;">download the file</a></p>`,
    paginaDoFilme: true,
  }
}
