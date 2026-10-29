// KINEO-QUALIDADE-TODOS-MOTORES-2910 — Ads uses the same pure film layers with its approved actor/product contract.
import { prepararQualidadeDoFilme, travarEstiloCompactoDoFilme, FILM_QUALITY_VERSION } from '@/lib/cinematic/filmQuality'
import { deriveStyleAnchor, type StyleAnchor } from '@/lib/cinematic/sceneStyle'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import type { CenaPlan } from './plan'
import { mostraSemFolha, JUIZ_FICHA_VERSAO } from '@/lib/cinematic/juizFicha' // KINEO-QUALIDADE-TODOS-MOTORES-2910

export interface AdsFilmQuality {
  version: typeof FILM_QUALITY_VERSION
  elenco: FichaDePersonagem[]
  style: StyleAnchor
  actorReference: string | null
}

/** The presenter was selected from a photograph. Product copy must never cast a new actor or a cartoon. */
export function aplicarQualidadeDoAnuncio<T extends CenaPlan>(plan: T): T {
  const actorReference = plan.continuity?.actorUrl ?? plan.input.actorUrl ?? null
  const elenco: FichaDePersonagem[] = actorReference ? [{
    nome: 'approved presenter', nucleo: 'presenter', tipo: 'humano', origem: 'autor',
    canonica: `${plan.actor}; exact approved identity and ${plan.continuity?.wardrobe ?? 'original reference wardrobe'}`,
    protagonista: true, genero: null,
  }] : []
  const style = deriveStyleAnchor('photorealistic live-action commercial')
  const all = [...plan.keyframePrompts, plan.videoPrompt, ...plan.segmentPrompts]
  const prepared = prepararQualidadeDoFilme({
    prompts: all, falas: all.map(() => plan.script.narration), contextoOriginal: plan.script.narration,
    contextoFiltro: plan.script.narration, modo: 'presenter', tagFaceless: false, style,
    elenco, preservarElenco: true, aplicarContrato: false,
  })
  // Ads' timed action, product fidelity, hands, caption lane and chosen portrait remain the scene contract.
  plan.keyframePrompts = prepared.prompts.slice(0, 2) as [string, string]
  plan.videoPrompt = prepared.prompts[2]
  plan.segmentPrompts = prepared.prompts.slice(3, 5) as [string, string]
  if (plan.escolha) plan.escolha.shotPrompts = plan.escolha.shotPrompts.map(p => travarEstiloCompactoDoFilme(p, style)) as [string, string, string]
  plan.filmQuality = { version: FILM_QUALITY_VERSION, elenco, style, actorReference }
  return plan
}

/** Reference/style expectations accompany the existing Ads vision request; no new image or vision call. */
export function qualidadeDoAnuncioParaJuiz(plan: CenaPlan, imageLayout = 'Image2 is the already approved character reference; image3 is the candidate'): string {
  const quality = plan.filmQuality
  return quality ? `Film quality ${quality.version}; ${JUIZ_FICHA_VERSAO}: ${quality.style.suffix}. Character description: ${mostraSemFolha('', quality.elenco)}. ${imageLayout}. A different rendering medium (cartoon instead of the photographic actor), species, age group, identity or outfit is a visible identity defect. Report same_visual_medium as true, false or null; never guess hidden evidence.` : ''
}
