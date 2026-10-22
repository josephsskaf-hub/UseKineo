// KINEO-ADS-CENA-RETOMADA-2110 — identical pure gates before dry/live, debit and rendering.
import { cenaHttps, type CenaPlan } from './plan'
import { cenaAssertVoiceRoute, cenaVideoRequests, type CenaRoute } from './adapters'
import { naturalAjusteScript } from './ajustePlan'
import { ajusteCloseRequest } from './ajusteMedia'
import { ajusteFinalTextElements } from './ajusteMontage'
export function preflightCenaAjuste(plan: CenaPlan, route: CenaRoute) {
  if (plan.ajusteLive?.version !== 'KINEO-ADS-CENA-RETOMADA-2110' || !cenaHttps(plan.input.foto) || !cenaHttps(plan.input.actorUrl)) throw new Error('cena_ajuste_plan_invalid')
  cenaAssertVoiceRoute(route, plan.voice_mode ?? 'narrated', plan.input.language)
  const checked = naturalAjusteScript(plan.script, plan.input, plan.product)
  if (checked.narration !== plan.script.narration || checked.hook !== plan.script.hook) throw new Error('cena_ajuste_script_changed')
  if (plan.format !== (plan.input.formato === 'ugc' ? 'ugc_person' : plan.voice_mode === 'talking' ? 'product_talking_close' : 'product_close_demo')) throw new Error('cena_ajuste_format_invalid')
  // URLs here stand in for future keyframes solely to validate the same request builder; nothing is submitted.
  const scene = cenaVideoRequests(route, { keyframeUrl: plan.input.foto, endKeyframeUrl: plan.input.foto, productUrl: plan.input.foto, prompt: plan.videoPrompt, segmentPrompts: plan.segmentPrompts, language: plan.input.language, voiceMode: plan.voice_mode })
  const close = ajusteCloseRequest(plan, route), finalText = ajusteFinalTextElements(plan)
  return { scene, close, finalText }
}
