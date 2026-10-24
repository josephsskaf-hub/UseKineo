// KINEO-ADS-CENA-95-2110 — três tomadas, roteiro calibrado e escolha de ator antes de reservar créditos.
import { CENA_WARDROBE } from './catalog' // KINEO-ADS-CENA-95-PACING-2110 — catálogo derivado sem alterar o caminho legado.
import { cena95Composition, type Cena95Composition } from './composition95' // KINEO-ADS-CENA-95-PACING-2110
import { cena95Preflight } from './preflight95' // KINEO-ADS-CENA-95-PACING-2110
import { classifyCena, type CenaInput, type CenaJson, type CenaPlan } from './plan'
import { cenaAssertVoiceRoute, type CenaRoute } from './adapters'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { chooseCena95Presenter, CENA95_MUSIC, type Cena95Presenter } from './presenters95'
import { parseCena95Script, type Cena95Script } from './script95'
import { estimateCena95Cost } from './costs95'
import { cena95NativeSegments, cena95NativePause, cena95NativeSilence } from './adapters95' // KINEO-ADS-CENA-95-PACING-2110
import { cena95ScriptContract, cena95ScriptRepair } from './script95Contract' // KINEO-ADS-CENA-95-PLAN-FAILED-2110
export interface Cena95Usage { inputTokens: number; outputTokens: number; calls: number; measuredCalls: number }
export interface Cena95Plan extends CenaPlan {
  script: Cena95Script
  quality95: { version: 'KINEO-ADS-CENA-95-2110'; presenter: Cena95Presenter; wardrobe: string; musicMood: typeof CENA95_MUSIC[keyof typeof CENA95_MUSIC]; closePhoto: string; shots: readonly [{ kind: 'hook'; start: 0; seconds: 3 }, { kind: 'use'; start: 3; seconds: 7 }, { kind: 'close'; start: 10; seconds: 5 }]; costs: Record<CenaRoute, ReturnType<typeof estimateCena95Cost>>; planningUsage: Cena95Usage; nativeVoice: string; composition?: Cena95Composition } // KINEO-ADS-CENA-95-PACING-2110 — ausente nos pedidos antigos.
}
export function cena95CostTableOf(plan: unknown): Cena95Plan['quality95']['costs'] | null {
  const p = plan as Partial<Cena95Plan> | null
  return p?.quality95?.version === 'KINEO-ADS-CENA-95-2110' ? p.quality95.costs : null
}
export async function planCena95(input: CenaInput, route: CenaRoute, json: CenaJson, context: { userId: string; recentActors: readonly string[] }): Promise<Cena95Plan> {
  const mode = input.voice_mode ?? 'narrated'
  cenaAssertVoiceRoute(route, mode, input.language)
  if (mode === 'narrated' && !['en', 'pt', 'es'].includes(input.language ?? 'en')) throw new Error('cena95_voice_language_unsupported')
  const planningUsage: Cena95Usage = { inputTokens: 0, outputTokens: 0, calls: 0, measuredCalls: 0 }
  const call: CenaJson = async c => {
    planningUsage.calls++
    const request = { ...c, maxOutputTokens: 2048, onUsage: (usage: { prompt_tokens?: number; completion_tokens?: number }) => { if (Number.isFinite(usage.prompt_tokens) && Number.isFinite(usage.completion_tokens)) { planningUsage.inputTokens += usage.prompt_tokens!; planningUsage.outputTokens += usage.completion_tokens!; planningUsage.measuredCalls++ } } }
    if (c.images.length) request.system += ' Also return photo_is_isolated_product:true ONLY when the source photo shows the product alone, with no hand or person; unknown=false. The final shot uses this exact photograph, so an existing hand cannot be removed.'
    const value = await json(request)
    if (c.images.length) { const r = typeof value === 'string' ? JSON.parse(value) : value; if (!r || r.photo_is_isolated_product !== true) throw new Error('cena95_packshot_required') }
    return value
  }
  const classification = await classifyCena(input, call)
  const presenter = chooseCena95Presenter(classification.category, context.userId, context.recentActors, input.actorUrl)
  input = { ...input, voice_mode: mode, actorUrl: presenter.portrait, oferta: input.oferta || classification.offer, beneficios: [...new Set([...(input.beneficios ?? []), ...classification.benefits])] }
  const category = classification.category, wardrobe = CENA_WARDROBE[category] // KINEO-ADS-CENA-95-PACING-2110
  const composition = cena95Composition(category, input.formato === 'ugc' ? 'ugc' : 'product', mode) // KINEO-IDIOMAS-FORMATOS-2410 — new formats are storyboarded by escolha, legacy composition keeps its existing two modes.
  let script: Cena95Script | undefined, correction = '', previous: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // KINEO-ADS-CENA-95-PLAN-FAILED-2110 — o JSON solicitado tem exatamente o contrato validado, inclusive nos três ganchos.
      previous = await call({ model: AI_TEXT_MODELS.ads, images: [], system: cena95ScriptContract(input.language ?? 'en'), text: JSON.stringify({ product: classification.product, frase: input.frase, benefits: input.beneficios, offer: input.oferta, cta: input.cta, visualDirectionOnly: composition.interaction, correction, ...(attempt ? { repair: cena95ScriptRepair(previous, correction, input.language) } : {}) }) }) // KINEO-ADS-CENA-95-PACING-2110
      script = parseCena95Script(previous, input, classification.product)
      cena95Preflight(script, input, route, presenter, { product: classification.product }) // KINEO-ADS-CENA-95-PACING-2110 — dry/live share this exact gate before branching.
      break
    } catch (e) { script = undefined; correction = e instanceof Error ? e.message : 'cena95_script_invalid' }
  }
  if (!script) throw new Error(correction || 'cena95_script_invalid')
  const lock = `The SAME approved actor ${presenter.name}, ${presenter.look}, exact identity from ${presenter.portrait}. SAME clothing in every shot and retry: ${wardrobe}. ${category === 'wearable' ? 'The watch stays on their LEFT wrist; never mirrored, never the right wrist.' : 'Preserve the same arms and left/right anatomy.'}`
  const base = `${input.formato === 'ugc' ? 'Natural conversational creator demonstration' : 'Confident product demonstration'}. ${lock} In ${composition.setting}. ${composition.scale}. ${composition.actor}. ${composition.framing} Only their own hands continuously attached to their arms, exactly five fingers per visible hand, no extra person/hand, no floating product. Keep the whole real product faithful to the customer photo. Nothing approaches or touches the face. No invented text, labels, graphics, accessories or objects; preserve the existing product label.` // KINEO-ADS-CENA-95-PACING-2110
  const silent = 'No speech, dialogue or lip-sync. Mouth closed in every frame. Silent scene; a separate narrator is added later.'
  const nativeVoice = `One consistent ${presenter.gender} ${presenter.age.replace('_', ' ')} voice in ${input.language}, ${input.formato === 'ugc' ? 'conversational' : 'confident and clear'}, matching this actor across every segment. Native speech only, no second narrator.`
  const words = script.narration.split(' '), boundary = Math.round(words.length * 8 / 15)
  const veoSegments = mode === 'talking' && route === 'veo31' ? cena95NativeSegments(script, [8, 7]) : [] // KINEO-ADS-CENA-95-PACING-2110
  const veoSpeech = veoSegments.length ? veoSegments.map(p => p.text) : [words.slice(0, boundary).join(' '), words.slice(boundary).join(' ')]
  const segmentPrompts: [string, string] = [
    `${base} Local 0-3s: ${composition.opening}, then 3-8s ${composition.interaction}. ${mode === 'narrated' ? silent : cena95NativeSilence(veoSegments[0]) || `${nativeVoice} Face and speaking mouth visible within the locked crop. ${cena95NativePause(veoSegments[0], script.cta)}Say ONLY: ${veoSpeech[0]}`}`, // KINEO-ADS-CENA-95-PACING-2110
    `${base} Continue the same action from absolute 8s. Local 0-2s: ${composition.interaction}; ${mode === 'narrated' || cena95NativeSilence(veoSegments[1]) ? 'continue the same silent product action to absolute15s' : 'keep speaking naturally to absolute15s'}, last generated second trimmed. ${mode === 'narrated' ? silent : cena95NativeSilence(veoSegments[1]) || `${nativeVoice} Face and mouth visible within the locked crop. ${cena95NativePause(veoSegments[1], script.cta)}Say ONLY: ${veoSpeech[1]}`}`, // KINEO-ADS-CENA-95-PACING-2110
  ]
  const characters = cena95Preflight(script, input, route, presenter, { product: classification.product }).voiceRequest?.billingCharacters ?? 0 // KINEO-ADS-CENA-95-PACING-2110
  const costs = Object.fromEntries((['kling3', 'seedance2', 'veo31'] as const).map(r => [r, estimateCena95Cost(r, mode, { characters, planningCalls: planningUsage.calls })])) as Cena95Plan['quality95']['costs']
  return { marker: 'KINEO-ADS-CENA-2110', input, category, product: classification.product, format: composition.format, setting: composition.setting, actor: composition.productDominant ? composition.actor : presenter.look, interaction: composition.interaction, script, voice_mode: mode, audioMode: mode === 'narrated' ? 'voiceover' : 'native', continuity: { actorUrl: presenter.portrait, wardrobe, productWrist: category === 'wearable' ? 'left' : null }, keyframePrompts: [`${base} SHARED BASE KEYFRAME: ${composition.keyframe}. ${mode === 'narrated' ? 'Any visible mouth is closed.' : 'Face ready to speak within the locked crop.'}`, `${base} Same shared keyframe reference and the exact locked composition.`], videoPrompt: `${base} ${mode === 'narrated' ? silent : nativeVoice}`, segmentPrompts, quality95: { version: 'KINEO-ADS-CENA-95-2110', presenter, wardrobe, musicMood: CENA95_MUSIC[category], closePhoto: input.foto, shots: [{ kind: 'hook', start: 0, seconds: 3 }, { kind: 'use', start: 3, seconds: 7 }, { kind: 'close', start: 10, seconds: 5 }], costs, planningUsage, nativeVoice, composition } } // KINEO-ADS-CENA-95-PACING-2110
}
