// KINEO-ADS-CENA-RETOMADA-2110 — identical pure gates before dry/live, debit and rendering.
import { cenaHttps, type CenaPlan } from './plan'
import { cenaAssertVoiceRoute, cenaVideoRequests, type CenaRoute } from './adapters'
import { ajustePlanComposition } from './ajustePlan' // KINEO-ADS-CENA-SEGUE-2110
import { fitAjusteScript } from './ajusteRespaldo' // KINEO-ADS-CENA-SEGUE-2110
import { addAjusteQuality } from './ajusteQuality' // KINEO-ADS-CENA-SEGUE-2110
import { CENA_ACTORS, CENA_CATALOG, cenaCategory } from './catalog' // KINEO-ADS-CENA-SEGUE-2110
import { adsV2PresenterById } from '../v2Presenter' // KINEO-ADS-CENA-SEGUE-2110
import { ajusteCloseRequest } from './ajusteMedia'
import { ajusteFinalTextElements } from './ajusteMontage'
export function preflightCenaAjuste(plan: CenaPlan, route: CenaRoute) {
  if (plan.ajusteLive?.version !== 'KINEO-ADS-CENA-RETOMADA-2110' || !cenaHttps(plan.input.foto)) throw new Error('cena_ajuste_plan_invalid') // KINEO-ADS-CENA-SEGUE-2110 — input/security still required.
  cenaAssertVoiceRoute(route, plan.voice_mode ?? 'narrated', plan.input.language)
  const record = (note: Parameters<typeof addAjusteQuality>[1]) => addAjusteQuality(plan, note) // KINEO-ADS-CENA-SEGUE-2110
  if (!cenaCategory(plan.category)) { plan.category = 'other'; record({ stage: 'preflight', code: 'category_repaired', message: 'Unknown plan category replaced with the neutral scenario.' }) }
  if (!cenaHttps(plan.input.actorUrl)) { // KINEO-ADS-CENA-SEGUE-2110 — reuse an existing approved portrait, no provider call.
    const portrait = adsV2PresenterById(CENA_ACTORS[plan.category])?.portrait
    if (portrait) { plan.input.actorUrl = `https://www.usekineo.com${portrait}`; record({ stage: 'preflight', code: 'actor_reference_repaired', message: 'Missing actor reference replaced with the approved category portrait.' }) }
  }
  const previous = plan.script?.narration, checked = fitAjusteScript(plan.script, plan.input, plan.product, record) // KINEO-ADS-CENA-SEGUE-2110
  plan.script = checked // KINEO-ADS-CENA-SEGUE-2110 — same deterministic correction at dry, start and runtime.
  if (previous !== checked.narration) record({ stage: 'preflight', code: 'narration_repaired', message: 'Saved narration corrected with the same planner rules before using it.' })
  const row = CENA_CATALOG[plan.category], base = `Show the exact customer product ${plan.product} in ${row.setting}. ${row.interaction}. ${row.scale}. Keep the same actor, wardrobe and product reference. No invented text.`
  if (!plan.videoPrompt?.trim()) plan.videoPrompt = base // KINEO-ADS-CENA-SEGUE-2110
  if (!Array.isArray(plan.keyframePrompts) || plan.keyframePrompts.length !== 2 || plan.keyframePrompts.some(p => !p?.trim())) plan.keyframePrompts = [`${base} Opening view.`, `${base} Product in use.`] // KINEO-ADS-CENA-SEGUE-2110
  if (!Array.isArray(plan.segmentPrompts) || plan.segmentPrompts.length !== 2 || plan.segmentPrompts.some(p => !p?.trim())) plan.segmentPrompts = [base, base] // KINEO-ADS-CENA-SEGUE-2110
  if (plan.format !== (plan.input.formato === 'ugc' ? 'ugc_person' : plan.voice_mode === 'talking' ? 'product_talking_close' : 'product_close_demo')) { Object.assign(plan, ajustePlanComposition(plan)); record({ stage: 'preflight', code: 'format_repaired', message: 'Framing repaired to the requested UGC/product format.' }) } // KINEO-ADS-CENA-SEGUE-2110
  if (plan.voice_mode === 'talking' && previous !== checked.narration) { // KINEO-ADS-CENA-SEGUE-2110 — native speech must use the exact corrected copy too.
    if (previous) plan.videoPrompt = plan.videoPrompt.replace(previous, checked.narration)
    const prefix = (prompt: string) => prompt.split('Native audio in ')[0]
    const split = Math.max(1, Math.round(checked.use.split(' ').length * 5 / 7)), useWords = checked.use.split(' ')
    plan.videoPrompt = `${prefix(plan.videoPrompt)}Native audio in ${plan.input.language}. Speak only these exact words, no additions: ${checked.narration}`
    plan.segmentPrompts = [`${prefix(plan.segmentPrompts[0])}Native audio in ${plan.input.language}, say ONLY: ${checked.hook} ${useWords.slice(0, split).join(' ')}. End mid-action.`, `${prefix(plan.segmentPrompts[1])}Native audio in ${plan.input.language}, say ONLY: ${useWords.slice(split).join(' ')} ${checked.benefit} ${checked.cta}. Do not repeat the opening.`]
  }
  // URLs here stand in for future keyframes solely to validate the same request builder; nothing is submitted.
  const scene = cenaVideoRequests(route, { keyframeUrl: plan.input.foto, endKeyframeUrl: plan.input.foto, productUrl: plan.input.foto, prompt: plan.videoPrompt, segmentPrompts: plan.segmentPrompts, language: plan.input.language, voiceMode: plan.voice_mode })
  const close = ajusteCloseRequest(plan, route), finalText = ajusteFinalTextElements(plan)
  return { scene, close, finalText }
}
