// KINEO-PEDIDO-MUDO-3010 [vai do fundador 30/10 "estão todos autorizados"] — revisor 29/10: "15-second silent video. Pure black
// background. One enormous 3D word BROKENBASE…" foi pedido no Filme narrado e recebeu narração. O Filme sempre tem voz; o produto
// que faz vídeo sem narração é o Clipe. A tela avisa e leva o texto pronto para o Clipe (nota, nunca bloqueio).
const PEDE_MUDO_RE = /\b(?:silent (?:video|film|clip|short)|no (?:narration|voice[\s-]?over|voiceover|voice|talking)|without (?:narration|voice[\s-]?over|voiceover|voice)|music only|only music|sem (?:narra[çc][aã]o|locu[çc][aã]o|voz|fala)|v[íi]deo (?:mudo|sem fala)|s[óo] m[úu]sica|sin (?:narraci[oó]n|voz|locuci[oó]n)|solo m[úu]sica|v[íi]deo (?:mudo|silencioso)|ohne (?:sprecher|erz[äa]hler|stimme)|sans (?:narration|voix))\b/i

/** O texto pede vídeo sem narração ("silent video", "sem narração", "only music"). */
export function pedeVideoMudo(texto: string | null | undefined): boolean {
  return PEDE_MUDO_RE.test(String(texto ?? ''))
}

/** O Clipe com o texto preenchido (a tela do Clipe lê ?prompt=). */
export function hrefDoClipeComTexto(texto: string): string {
  return `/clips?${new URLSearchParams({ prompt: String(texto ?? '').trim().slice(0, 1000), from: 'film_silent_request' }).toString()}`
}

export const PEDIDO_MUDO_EVENTOS = { shown: 'film_silent_request_notice_shown', clicked: 'film_silent_request_clip_clicked' } as const

export const PEDIDO_MUDO_COPY = {
  en: { title: 'Films always come with a narrator', body: 'You asked for a video without narration. A narrated film always has a voice. For a silent shot with only visuals, make it as a Clip.', cta: 'Make it a silent Clip' },
  pt: { title: 'O filme sempre vem com narração', body: 'Você pediu um vídeo sem narração. O filme narrado sempre tem voz. Para uma cena só com imagem, faça como Clipe.', cta: 'Fazer como Clipe sem narração' },
  es: { title: 'La película siempre lleva narración', body: 'Pediste un video sin narración. La película narrada siempre tiene voz. Para una escena solo con imagen, hazla como Clip.', cta: 'Hacerlo como Clip sin narración' },
} as const
export function pedidoMudoCopy(language: string | null | undefined) {
  const l = String(language ?? '').slice(0, 2).toLowerCase()
  return l === 'pt' ? PEDIDO_MUDO_COPY.pt : l === 'es' ? PEDIDO_MUDO_COPY.es : PEDIDO_MUDO_COPY.en
}
