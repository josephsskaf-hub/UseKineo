// KINEO-ADS-ESTILO-2026-09-26 — fundador (26/09): "vamos fazer do 1 ao 6" (pesquisa de 14 concorrentes, docs/growth/
// CONCORRENTES-ADS-2026-09-26.md). Este módulo PURO carrega os itens pequenos que mudam o ACABAMENTO do anúncio, sem motor
// novo e sem tocar no montador (lib/compose é trava 8.2):
//   · estilo de legenda — aplicado pelo /api/compose DEPOIS de montar, sobre os elementos de texto das trilhas 5/7;
//   · clima da trilha — vira o `musicMood` que lib/musicDirection já aceita (vocabulário controlado);
//   · formato — 9:16 (Reels/TikTok/Shorts), 1:1 e 4:5 (feed), 16:9 (YouTube), a fonte única é lib/aspect.
// Padrões = o anúncio de sempre: legenda 'bold', trilha automática, 9:16.

export const AD_CAPTION_STYLES = [
  { id: 'bold', label: 'Bold', hint: 'White words on a dark pill (default)' },
  { id: 'clean', label: 'Clean', hint: 'White words, thin outline, no box' },
  { id: 'yellow', label: 'Yellow', hint: 'Yellow words on a dark pill' },
  { id: 'boxed', label: 'Boxed', hint: 'Black words on a white box' },
] as const
export type AdCaptionStyle = (typeof AD_CAPTION_STYLES)[number]['id']
export const AD_DEFAULT_CAPTION_STYLE: AdCaptionStyle = 'bold'
export function isAdCaptionStyle(v: unknown): v is AdCaptionStyle {
  return typeof v === 'string' && AD_CAPTION_STYLES.some((s) => s.id === v)
}

/** Propriedades que o estilo troca num elemento de legenda (Creatomate). `bold` não troca nada. */
export function captionStyleOverrides(style: AdCaptionStyle): Record<string, unknown> | null {
  switch (style) {
    case 'clean':
      return { fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.95)', stroke_width: 6, background_color: 'rgba(0,0,0,0)' }
    case 'yellow':
      return { fill_color: '#FFD400', stroke_color: 'rgba(0,0,0,0.98)', stroke_width: 3, background_color: 'rgba(0,0,0,0.60)' }
    case 'boxed':
      return { fill_color: '#111111', stroke_color: 'rgba(0,0,0,0)', stroke_width: 0, background_color: 'rgba(255,255,255,0.94)' }
    default:
      return null
  }
}

/** É um elemento de legenda do montador? (texto nas trilhas 5 = palavra falada, 7 = destaque) */
export function isCaptionElement(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const x = e as { type?: unknown; track?: unknown }
  return x.type === 'text' && [5, 7].includes(Number(x.track))
}

export const AD_MUSIC_MOODS = [
  { id: 'auto', label: 'Automatic', mood: null },
  { id: 'upbeat', label: 'Upbeat', mood: 'hustle' },
  { id: 'calm', label: 'Calm', mood: 'nature' },
  { id: 'emotional', label: 'Emotional', mood: 'emotional' },
  { id: 'epic', label: 'Epic', mood: 'epic' },
  { id: 'none', label: 'No music', mood: 'no music' },
] as const
export type AdMusicMood = (typeof AD_MUSIC_MOODS)[number]['id']
export const AD_DEFAULT_MUSIC: AdMusicMood = 'auto'
export function isAdMusicMood(v: unknown): v is AdMusicMood {
  return typeof v === 'string' && AD_MUSIC_MOODS.some((m) => m.id === v)
}
/** O valor que vai no `musicMood` de lib/musicDirection (null = automático pelo roteiro). */
export function musicMoodFor(id: AdMusicMood): string | null {
  return AD_MUSIC_MOODS.find((m) => m.id === id)?.mood ?? null
}

export const AD_FORMATS = [
  { id: '9:16', label: 'Vertical 9:16', hint: 'Reels, TikTok, Shorts, Stories', width: 1080, height: 1920 },
  { id: '4:5', label: 'Portrait 4:5', hint: 'Instagram and Facebook feed', width: 1080, height: 1350 },
  { id: '1:1', label: 'Square 1:1', hint: 'Feed, marketplaces', width: 1080, height: 1080 },
  { id: '16:9', label: 'Horizontal 16:9', hint: 'YouTube, website, TV', width: 1920, height: 1080 },
] as const
export type AdFormat = (typeof AD_FORMATS)[number]['id']
export const AD_DEFAULT_FORMAT: AdFormat = '9:16'
export function isAdFormat(v: unknown): v is AdFormat {
  return typeof v === 'string' && AD_FORMATS.some((f) => f.id === v)
}
export function adFormatSize(id: AdFormat): { width: number; height: number } {
  const f = AD_FORMATS.find((x) => x.id === id) ?? AD_FORMATS[0]
  return { width: f.width, height: f.height }
}
