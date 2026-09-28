// KINEO-ADS-V2-MUSICA-2026-09-29 — de onde a música do anúncio v2 começa a tocar.
//
// Defeito achado no 1º anúncio real (pedido 6dc2b61d, 28/09 09:03 UTC): o Lyria não respondeu, a reserva sorteou
// emotional-11.mp3 da biblioteca (bucket `music`) e ela tem 14 s de SILÊNCIO DIGITAL no começo. A montagem punha a
// música a partir do zero, então do segundo 8 ao 14 do anúncio (depois da voz) não havia som nenhum.
// Nos filmes longos a voz cobre a introdução; num anúncio de 15 s ela vira metade do vídeo mudo.
//
// Remédio: cada faixa da biblioteca tem aqui o PRIMEIRO instante a partir do qual há pelo menos 32 s seguidos de
// música (nenhum silêncio > 0,4 s a -40 dB), medido com ffmpeg silencedetect nas 59 faixas em 29/09. 32 s cobre o
// anúncio de 30 s com folga. Faixa sem esse trecho (emotional-08) não entra: a reserva troca por outra do mesmo clima.
// Faixa que não vem da biblioteca (cópia do Lyria no nosso bucket) começa no zero.
//
// LIB PURA (nenhum import). Se a biblioteca mudar (lib/pixabayMusic.ts MOOD_TRACKS), medir de novo e atualizar a
// tabela: o guardião scripts/test-ads-v2-musica-2026-09-29.mjs confere que toda faixa da biblioteca está aqui ou
// na lista de fora.

export const ADS_V2_MUSIC_WINDOW_SECONDS = 32

/** Faixas medidas e reprovadas para anúncio (sem 32 s seguidos de música). */
export const ADS_V2_MUSIC_EXCLUDED: readonly string[] = ['emotional-08.mp3']

/** Início seguro (s) de cada faixa aprovada da biblioteca. */
export const ADS_V2_MUSIC_STARTS: Readonly<Record<string, number>> = {
  'emotional-01.mp3': 0,
  'emotional-02.mp3': 15.01,
  'emotional-03.mp3': 9.7,
  'emotional-04.mp3': 0,
  'emotional-05.mp3': 2.67,
  'emotional-06.mp3': 0.92,
  'emotional-07.mp3': 0,
  'emotional-09.mp3': 53.48,
  'emotional-10.mp3': 0,
  'emotional-11.mp3': 57.05,
  'emotional-12.mp3': 0,
  'emotional-13.mp3': 11.55,
  'epic-01.mp3': 0,
  'epic-02.mp3': 0,
  'epic-03.mp3': 0,
  'epic-04.mp3': 0.6,
  'epic-05.mp3': 0,
  'epic-06.mp3': 0,
  'epic-07.mp3': 0.75,
  'epic-08.mp3': 0,
  'epic-09.mp3': 0,
  'hustle-01.mp3': 0,
  'hustle-02.mp3': 0,
  'hustle-03.mp3': 0,
  'hustle-04.mp3': 0,
  'hustle-05.mp3': 0,
  'hustle-06.mp3': 0,
  'hustle-07.mp3': 0,
  'nature-01.mp3': 0,
  'nature-02.mp3': 0,
  'nature-03.mp3': 0.71,
  'nature-04.mp3': 0,
  'nature-05.mp3': 0,
  'nature-06.mp3': 0,
  'nature-07.mp3': 0,
  'nature-08.mp3': 6.2,
  'nature-09.mp3': 3.91,
  'nature-10.mp3': 0,
  'nature-11.mp3': 0,
  'nature-12.mp3': 0,
  'suspense-01.mp3': 0,
  'suspense-02.mp3': 0,
  'suspense-03.mp3': 0,
  'suspense-04.mp3': 0,
  'suspense-05.mp3': 0,
  'suspense-06.mp3': 0,
  'suspense-07.mp3': 0,
  'suspense-08.mp3': 0,
  'suspense-09.mp3': 0,
  'suspense-10.mp3': 2.15,
  'suspense-11.mp3': 2.16,
  'suspense-12.mp3': 2.15,
  'tech-01.mp3': 0,
  'tech-02.mp3': 0,
  'tech-03.mp3': 0,
  'tech-04.mp3': 0,
  'tech-05.mp3': 0,
  'tech-06.mp3': 0,
}

const LIBRARY_MARK = '/storage/v1/object/public/music/'

/** Nome do arquivo quando a URL é da biblioteca (bucket `music`, sem subpasta); senão null. */
export function adsV2LibraryTrack(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null
  const i = url.indexOf(LIBRARY_MARK)
  if (i < 0) return null
  const rest = url.slice(i + LIBRARY_MARK.length).split(/[?#]/)[0]
  return /^[a-z]+-\d{2}\.mp3$/.test(rest) ? rest : null
}

/** A faixa serve para anúncio? Fora da biblioteca (cópia do Lyria) serve; da biblioteca, só as medidas e aprovadas. */
export function adsV2MusicUsable(url: string | null | undefined): boolean {
  if (typeof url !== 'string' || !url.trim()) return false
  const track = adsV2LibraryTrack(url)
  if (track === null) return !url.includes(LIBRARY_MARK)
  return Object.prototype.hasOwnProperty.call(ADS_V2_MUSIC_STARTS, track)
}

/** De onde a música começa (s): o início medido da faixa da biblioteca, ou 0 fora dela. */
export function adsV2MusicTrimStart(url: string | null | undefined): number {
  const track = adsV2LibraryTrack(url)
  if (track === null) return 0
  const t = ADS_V2_MUSIC_STARTS[track]
  return typeof t === 'number' && Number.isFinite(t) && t >= 0 ? t : 0
}

/** Faixa aprovada do mesmo clima, escolhida de forma determinística pela semente (o id do pedido). */
export function adsV2FallbackTrack(mood: string, seed: string): string {
  const all = Object.keys(ADS_V2_MUSIC_STARTS).sort()
  const same = all.filter((t) => t.startsWith(`${mood}-`))
  const pool = same.length ? same : all
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return pool[h % pool.length]
}

/** Troca a URL de uma faixa da biblioteca pela de outra faixa (mesmo bucket). */
export function adsV2SwapLibraryTrack(url: string, track: string): string {
  const i = url.indexOf(LIBRARY_MARK)
  if (i < 0) return url
  return url.slice(0, i + LIBRARY_MARK.length) + track
}
