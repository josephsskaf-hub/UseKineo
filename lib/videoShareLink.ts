import { createHmac, timingSafeEqual } from 'crypto'

// ═══ KINEO-CONSENTIMENTO-DE-PARTILHA-2026-09-06 — sprint-assinaturas #27 ════
//
// O NÚMERO QUE MANDOU ESCREVER ISTO (medido 06/09 em produção):
//
//   · `videos` tem 1.638 linhas. Linhas com página pública: **ZERO**, e não
//     por defeito — `CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false` desde
//     27/08, de propósito, porque o esquema não tinha campo de consentimento
//     "versionado e auditável" (a frase é do próprio lib/publicSurfacePolicy).
//   · Consequência: a casa entrega ~20 filmes por dia e o cliente **não tem
//     como mostrar nenhum deles a ninguém** — só baixar o MP4. O e-mail de
//     filme pronto diz, duas vezes, "your video is private by default".
//   · O pacote de publicação (#20) já escreve título/descrição/legenda com
//     "made with usekineo.com" dentro. Ou seja: a casa escreve o anúncio e
//     não dá ao cliente a vitrine onde pendurá-lo.
//
// O QUE ESTA PEÇA FAZ, e é a única coisa que faltava: **o campo de
// consentimento**. Não liga a superfície pública para todo mundo — isso seria
// publicar filme de cliente sem ele pedir. Ela dá ao DONO um botão de uma
// linha, dentro do e-mail que ele já recebe, que publica UM filme, o dele,
// com carimbo de quando e por onde (`videos.published_at`/`published_via`), e
// um segundo link que despublica. A trava global continua `false`: uma linha
// sem `published_at` é invisível como sempre foi.
//
// POR QUE O LINK É ASSINADO, e não uma rota com sessão: a lição do
// `/api/episode-link` (05/09) é que clique de inbox **estruturalmente não tem
// sessão** — o Gmail do telefone abre em webview própria, o link chega em
// outro aparelho, a aba é anônima. Uma rota que exigisse login mandaria o dono
// para um formulário em vez de publicar o filme dele. O token é um HMAC do id
// do filme: quem tem o e-mail tem o token, e o token não serve para mais nada
// além daquele filme.
//
// FALHA FECHADA EM TODOS OS RAMOS: sem segredo no ambiente, `mintShareToken`
// devolve null (o e-mail sai sem o bloco, byte a byte como antes) e
// `verifyShareToken` devolve false (nenhum token vale). Nada vira público por
// acidente de configuração.

/** Prefixo de versão do token. Trocar aqui invalida todos os links antigos. */
export const SHARE_TOKEN_VERSION = 'v1'

/**
 * Segredo de assinatura. `VIDEO_SHARE_SECRET` quando existir; senão o
 * `CRON_SECRET` que a casa já usa nas rotas de campanha. O token é um HMAC:
 * vazar um link não vaza o segredo nem serve para outro filme.
 */
function shareSecret(): string | null {
  const raw = (process.env.VIDEO_SHARE_SECRET || process.env.CRON_SECRET || '').trim()
  return raw.length >= 16 ? raw : null
}

function assinar(videoId: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${SHARE_TOKEN_VERSION}:${videoId}`)
    .digest('base64url')
}

/**
 * Token de partilha para um filme. `null` quando não há segredo — e nesse caso
 * quem chama simplesmente não escreve o bloco no e-mail.
 */
export function mintShareToken(videoId: string): string | null {
  const id = (videoId ?? '').trim()
  if (!id) return null
  const secret = shareSecret()
  if (!secret) return null
  return assinar(id, secret)
}

/**
 * Confere o token. Comparação em tempo constante — um verificador que sai no
 * primeiro byte diferente conta o tempo para quem quiser adivinhar.
 */
export function verifyShareToken(videoId: string, token: string | null | undefined): boolean {
  const id = (videoId ?? '').trim()
  const recebido = (token ?? '').trim()
  if (!id || !recebido) return false
  const secret = shareSecret()
  if (!secret) return false
  const esperado = assinar(id, secret)
  const a = Buffer.from(esperado)
  const b = Buffer.from(recebido)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** URL de publicação de um clique, para colar no e-mail. `null` sem segredo. */
export function publishHref(videoId: string, base: string, source: string): string | null {
  const t = mintShareToken(videoId)
  if (!t) return null
  return `${base}/api/video/publish?v=${encodeURIComponent(videoId)}&t=${encodeURIComponent(t)}&src=${encodeURIComponent(source)}`
}

/** URL que DESPUBLICA o mesmo filme. Sai no mesmo e-mail que publica: quem
 *  publica em um clique precisa poder voltar atrás em um clique. */
export function unpublishHref(videoId: string, base: string, source: string): string | null {
  const href = publishHref(videoId, base, source)
  return href ? `${href}&undo=1` : null
}
