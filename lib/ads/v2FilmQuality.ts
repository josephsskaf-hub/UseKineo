// KINEO-QUALIDADE-TODOS-MOTORES-2910 — legacy Ads shares film quality at its final provider boundary.
import { prepararQualidadeDoFilme, travarEstiloCompactoDoFilme } from '@/lib/cinematic/filmQuality'
import { deriveStyleAnchor } from '@/lib/cinematic/sceneStyle'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import type { AdsV2StoredPlan } from './v2Advance'

/** These Ads are photographed product/actor scenes. Product copy never casts a named character. */
export function qualidadeDoPlanoAdsV2(plan: AdsV2StoredPlan | null, kind: string, prompt: string, compact = false) {
  const actor = kind === 'presenter' ? plan?.presenter : null
  const canonica = actor?.actorPrompt ?? ''
  const elenco: FichaDePersonagem[] = canonica ? [{ nome: 'approved presenter', nucleo: 'presenter', tipo: 'humano',
    origem: 'autor', canonica, protagonista: true, genero: null }] : []
  const style = deriveStyleAnchor('photorealistic live-action commercial')
  const quality = prepararQualidadeDoFilme({ prompts: [prompt], falas: [plan?.narration ?? ''],
    contextoOriginal: plan?.narration ?? '', contextoFiltro: plan?.narration ?? '', modo: 'presenter', tagFaceless: false,
    style, elenco, preservarElenco: true, aplicarContrato: false })
  // The legacy framing, true product, hand pose and shot timing are already the more specific scene contract.
  return { ...quality, prompt: compact ? travarEstiloCompactoDoFilme(prompt, style) : quality.prompts[0],
    referencia: actor?.v2?.portraitUrl ? { url: actor.v2.portraitUrl, descricao: canonica } : undefined }
}
