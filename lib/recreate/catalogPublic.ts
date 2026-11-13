// KINEO-MENU-RECREATE-1211 [fundador 12/11: "Falha muito grave, não tem o Recreate no menu inicial. Se você quiser entrar no Recreate e
// olhar tudo que você pode recriar, não tem."] — a vitrine do /recreate para quem ainda não entrou. Antes o visitante que abria /recreate ia
// direto para o cadastro sem ver nada. Agora ele vê a grade de TODOS os modelos que já pode recriar e o clique leva ao fluxo daquele modelo
// (cadastro → /recreate/<id>, o MESMO caminho de recreateEntryHref).
// Regra da lista: só entra o que publicRecreatePath libera (efeitos com o Recreate aberto; troca de rosto só com swapApproved + preço +
// interruptor da troca público). Troca em teste NUNCA aparece. Sem preço e sem nome de motor: o preço só aparece no botão dentro do fluxo.
// Mídia: /api/recreate/assets exige login, então o vídeo-base das trocas aprovadas vem da MESMA prévia pública que a home e o
// /made-with-kineo já servem (public/previews/galeria/<id>.mp4 + public/posters/galeria/<id>.webp). Efeitos usam a prévia pública deles.
import { RECREATE_FORMATS, type RecreateFormat } from './formats'
import { publicRecreatePath, recreateEntryHref } from './entry'

export type RecreateCatalogItem = { id: string; title: string; href: string; video: string; poster: string; kind: 'swap' | 'effect'; people: number }

/** Prévia pública do vídeo-base (KINEO-MENU-RECREATE-1211). Troca aprovada: a cópia pública da galeria; efeito: a prévia do próprio efeito. */
export function recreatePublicMedia(f: RecreateFormat): { video: string; poster: string } {
  if (f.type === 'swap') return { video: `/previews/galeria/${f.id}.mp4`, poster: `/posters/galeria/${f.id}.webp` }
  return { video: f.preview, poster: f.poster }
}

/** KINEO-MENU-RECREATE-1211 — todos os modelos que um visitante pode recriar hoje, na ordem do catálogo (trocas aprovadas primeiro). */
export function publicRecreateCatalog(): RecreateCatalogItem[] {
  return RECREATE_FORMATS.filter(f => publicRecreatePath(f.id) !== null).map(f => ({
    id: f.id,
    title: f.title,
    href: recreateEntryHref(f.id, false)!,
    ...recreatePublicMedia(f),
    kind: f.type,
    people: f.photoSlots,
  }))
}
