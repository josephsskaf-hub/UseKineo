// KINEO-CARDS-VIEWS-0911 — fundador 09/11 (print do Higgsfield): o cartão mostra quantas pessoas viram o vídeo.
// REGRA: só número REAL, do post do MESMO vídeo na @usekineo, lido no perfil no dia em `checked`. Cartão sem post
// confirmado não ganha número (nada de estimativa, nada de "parecido"). Para atualizar: abrir tiktok.com/@usekineo,
// ler a contagem do post e trocar `views` + `checked`. Chave = nome do arquivo da prévia (sem .mp4).
export interface CardSocialStat { views: number; likes?: number; source: 'TikTok' | 'Instagram'; url: string; checked: string } // KINEO-FILMES-VIRAIS-1511 — + curtidas e Instagram

export const CARD_SOCIAL_STATS: Readonly<Record<string, CardSocialStat>> = {
  'lituya-h3': { views: 936, source: 'TikTok', url: 'https://www.tiktok.com/@usekineo/video/7681019573985955093', checked: '2026-11-09' },
  'tunguska-globe': { views: 441, source: 'TikTok', url: 'https://www.tiktok.com/@usekineo/video/7680395589552459029', checked: '2026-11-09' },
  'robot-action': { views: 346, source: 'TikTok', url: 'https://www.tiktok.com/@usekineo/video/7677996237756452117', checked: '2026-11-09' },
  // KINEO-FILMES-VIRAIS-1511 [dono 15/11: 'adicionar o número de likes e views como os líderes fazem'] — os 4 filmes virais do menu Film, lidos no
  // perfil instagram.com/usekineo/reels em 15/11 ~15:10 BRT. O Instagram arredonda acima de 10 mil ('63,2 mil' = 63.200): o cartão mostra o mesmo arredondado.
  'filme-veteranos': { views: 63_200, likes: 3_500, source: 'Instagram', url: 'https://www.instagram.com/usekineo/reel/DflTrE1O6io/', checked: '2026-11-15' },
  'filme-navio-mais-rapido': { views: 10_500, likes: 353, source: 'Instagram', url: 'https://www.instagram.com/usekineo/reel/DfnrWKLOQNV/', checked: '2026-11-15' },
  'filme-viking-america': { views: 3_802, likes: 99, source: 'Instagram', url: 'https://www.instagram.com/usekineo/reel/DfBXfCoOBBu/', checked: '2026-11-15' },
  'filme-escudo-da-siberia': { views: 1_049, likes: 21, source: 'Instagram', url: 'https://www.instagram.com/usekineo/reel/DeQkuqvuJUv/', checked: '2026-11-15' },
}

/** 936 → "936", 1336 → "1.3K", 63200 → "63.2K", 72900 → "72.9K", 1200000 → "1.2M" (o formato do Higgsfield). */
export function compactCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return (n / 1000).toFixed(n < 100_000 ? 1 : 0) /* KINEO-FILMES-VIRAIS-1511 — uma casa até 100 mil, como o Higgsfield (72.9K); era até 10 mil */.replace(/\.0$/, '') + 'K'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
}

export function cardStatFor(videoUrl: string | undefined): CardSocialStat | null {
  const asset = videoUrl?.split('/').pop()?.replace(/\.mp4.*$/, '') ?? ''
  return CARD_SOCIAL_STATS[asset] ?? null
}
