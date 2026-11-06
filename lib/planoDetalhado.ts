// KINEO-PRICING-DETALHE-0611 [fundador 06/11: "deixar um pouco mais detalhado o que faz com cada preço... ver que tá comprando mais coisa"]
// O desenho usa a mesma conta do débito (components/kidsCartoon/KidsCartoonTemplate.tsx, kidsCartoonCost).
// Lista visível em cada plano. Cada número sai do custo real em créditos; plano que não cobre o item não mostra o item.
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { KLING4_AD_CREDITS } from '@/lib/ads/kling4Paid'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'

/** O que os créditos também podem virar. É alternativa aos filmes da mesma conta, nunca soma. */
export function alternativasDoPlano(credits: number): string[] {
  const custoAnuncio = Math.max(adsV2Credits('commercial', 15), KLING4_AD_CREDITS)
  const anuncios = Math.floor(credits / custoAnuncio)
  const desenhos35 = Math.floor(credits / creditCostForDuration('cinematic_ai', true, 35))
  const desenhos15 = Math.floor(credits / creditCostForDuration('cinematic_ai', true, 15))
  const linhas: string[] = []
  if (anuncios >= 1) linhas.push(`${anuncios} product or UGC ${anuncios === 1 ? 'ad' : 'ads'} · 15 s`)
  if (desenhos35 >= 1) linhas.push(`${desenhos35} AI ${desenhos35 === 1 ? 'cartoon' : 'cartoons'} · 35 s`)
  else if (desenhos15 >= 1) linhas.push(`${desenhos15} AI ${desenhos15 === 1 ? 'cartoon' : 'cartoons'} · 15 s`)
  return linhas
}

/** O que vem em todo plano pago, sem gastar crédito a mais. */
export function incluidoEmTodoPlano(): string[] {
  return [
    'Voice, captions and music on every film',
    `Narration in ${NARRATION_LANGUAGES.length} languages`,
    'No watermark on your downloads',
    'Commercial use: the videos are yours',
    'Failed renders give your credits back',
  ]
}
