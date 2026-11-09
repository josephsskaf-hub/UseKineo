// KINEO-CARDS-VIEWS-0911 — fundador 09/11 (print do Higgsfield): o cartão mostra quantas pessoas viram o vídeo.
// REGRA: só número REAL, do post do MESMO vídeo na @usekineo, lido no perfil no dia em `checked`. Cartão sem post
// confirmado não ganha número (nada de estimativa, nada de "parecido"). Para atualizar: abrir tiktok.com/@usekineo,
// ler a contagem do post e trocar `views` + `checked`. Chave = nome do arquivo da prévia (sem .mp4).
export interface CardSocialStat { views: number; source: 'TikTok'; url: string; checked: string }

export const CARD_SOCIAL_STATS: Readonly<Record<string, CardSocialStat>> = {
  'lituya-h3': { views: 936, source: 'TikTok', url: 'https://www.tiktok.com/@usekineo/video/7681019573985955093', checked: '2026-11-09' },
  'tunguska-globe': { views: 441, source: 'TikTok', url: 'https://www.tiktok.com/@usekineo/video/7680395589552459029', checked: '2026-11-09' },
  'robot-action': { views: 346, source: 'TikTok', url: 'https://www.tiktok.com/@usekineo/video/7677996237756452117', checked: '2026-11-09' },
}

/** 936 → "936", 1336 → "1.3K", 72900 → "72.9K", 1200000 → "1.2M" (o formato do Higgsfield). */
export function compactCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '') + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
}

export function cardStatFor(videoUrl: string | undefined): CardSocialStat | null {
  const asset = videoUrl?.split('/').pop()?.replace(/\.mp4.*$/, '') ?? ''
  return CARD_SOCIAL_STATS[asset] ?? null
}
