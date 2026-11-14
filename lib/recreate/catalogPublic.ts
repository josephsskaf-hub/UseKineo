// KINEO-MENU-RECREATE-1211 [fundador 12/11: "Falha muito grave, não tem o Recreate no menu inicial. Se você quiser entrar no Recreate e
// olhar tudo que você pode recriar, não tem."] — a vitrine do /recreate para quem ainda não entrou. Antes o visitante que abria /recreate ia
// direto para o cadastro sem ver nada. Agora ele vê a grade de TODOS os modelos que já pode recriar e o clique leva ao fluxo daquele modelo
// (cadastro → /recreate/<id>, o MESMO caminho de recreateEntryHref).
// Regra da lista: só entra o que publicRecreatePath libera (efeitos com o Recreate aberto; troca de rosto só com swapApproved + preço +
// interruptor da troca público). Troca em teste NUNCA aparece. Sem preço e sem nome de motor: o preço só aparece no botão dentro do fluxo.
// Mídia: /api/recreate/assets exige login, então o vídeo-base das trocas aprovadas vem da MESMA prévia pública que a home e o
// /made-with-kineo já servem (public/previews/galeria/<id>.mp4 + public/posters/galeria/<id>.webp). Efeitos usam a prévia pública deles.
import { RECREATE_FORMATS, recreateNewestFirst, type RecreateFormat } from './formats'
import { publicRecreatePath, recreateEntryHref } from './entry'

export type RecreateCatalogItem = { id: string; title: string; href: string; video: string; poster: string; kind: 'swap' | 'effect' | 'motion'; people: number } // KINEO-RECREATE-MOVIMENTO-1411 — + motion

/** Prévia pública do vídeo-base (KINEO-MENU-RECREATE-1211). Troca aprovada: a cópia pública da galeria; efeito: a prévia do próprio efeito. */
export function recreatePublicMedia(f: RecreateFormat): { video: string; poster: string } {
  // KINEO-RECREATE-MOVIMENTO-1411 — o molde de movimento é como a troca: o vídeo dele mora atrás do login; ao público, a cópia da galeria (entra junto
  // com a aprovação do molde).
  if (f.type === 'swap' || f.type === 'motion') return { video: `/previews/galeria/${f.id}.mp4`, poster: `/posters/galeria/${f.id}.webp` }
  return { video: f.preview, poster: f.poster }
}

/** KINEO-MENU-RECREATE-1211 — todos os modelos que um visitante pode recriar hoje. KINEO-RECREATE-ORDEM-1311 [dono 13/11: "Todo recreate que
 *  a gente comprar ou fizer tem que vir na lista por ordem na página dos templates"]: do mais novo para o mais antigo (campo `desde`); no
 *  mesmo dia, a ordem do catálogo. Guardião: scripts/test-recreate-ordem-1311.mjs. */
export function publicRecreateCatalog(): RecreateCatalogItem[] {
  return recreateNewestFirst(RECREATE_FORMATS.filter(f => publicRecreatePath(f.id) !== null)).map(f => ({
    id: f.id,
    title: f.title,
    href: recreateEntryHref(f.id, false)!,
    ...recreatePublicMedia(f),
    kind: f.type,
    people: f.photoSlots,
  }))
}
