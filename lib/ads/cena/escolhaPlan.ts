// KINEO-ADS-ESCOLHA-2310 — pure planning for one customer-approved actor, scenario and still.
// KINEO-ADS-ESCOLHA-PUBLICO-2410 — the skincare still is the CLOSED starting state, before the timed opening/application.
import { classifyCena, cenaHttps, cenaVoiceModeOf, type CenaInput, type CenaJson, type CenaPlan, type CenaScript } from './plan'
import { cenaAssertVoiceRoute, type CenaRoute } from './adapters'
import { escolhaVideoRequests } from './escolhaVideo'
import { cenaCategory, type CenaCategory } from './catalog'
import { ajusteScriptPrompt, naturalAjusteScript } from './ajustePlan'
import { fitAjusteScript, writeAjusteScript, ajusteRespaldoIssues } from './ajusteRespaldo'
import { addAjusteQuality } from './ajusteQuality'
import { CENA_ESCOLHA_MARK, escolhaPresenter, escolhaScenario } from './escolhaCatalog'
import { escolhaFormat, escolhaStory, escolhaShotPrompts } from './escolhaShots'
import { narrationWordCount, narrationTokens, narrationSentences, joinNarrationTokens } from '@/lib/textLanguage'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import type { EscolhaCaptionGrounding } from './escolhaCaptionLayout'
import { ADS_ESCOLHA_SAMPLE_MARK, ADS_ESCOLHA_SAMPLE_WORDS, isEscolhaSamplePlan, escolhaSeconds } from './escolhaSamplePolicy' // KINEO-AMOSTRA-ANUNCIO-2410

export interface CenaEscolhaSelection {
  marker: 'KINEO-ADS-ESCOLHA-2310'; presenterId: string; scenarioId: string; category: CenaCategory;
  actorUrl: string; wardrobe: string; captionLane: 'top' | 'bottom'; shotPrompts: [string, string, string];
  captionGrounding?: EscolhaCaptionGrounding;
  sample?: typeof ADS_ESCOLHA_SAMPLE_MARK; // KINEO-AMOSTRA-ANUNCIO-2410 — assigned only by server admission, never trusted from request JSON.
}
export type CenaEscolhaPlan = CenaPlan & { escolha: CenaEscolhaSelection }
export interface CenaEscolhaRequestSelection { presenter_id: string; scenario_id: string; category?: unknown; sample?: boolean } // KINEO-AMOSTRA-ANUNCIO-2410 — internal server call contract.
const clean = (v: unknown): string => typeof v === 'string' ? v.replace(/\s+/gu, ' ').trim() : ''
const fold = (s: string): string => clean(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const words = (s: string, language?: string): number => narrationWordCount(clean(s), language)
const sentences = (s: string, language?: string): string[] => narrationSentences(clean(s), language)
const includes = (text: string, value: string): boolean => !!value && fold(text).includes(fold(value))
const offerKey = (text: string): string => fold(text).replace(/([%$€£])/gu, ' $1 ').replace(/[^\p{L}\p{N}%$€£]+/gu, ' ').trim().replace(/\s+/gu, ' ')
const legacySpeech = (input: CenaInput): boolean => ['pt', 'en'].includes(input.language ?? 'en')
/** Locale-neutral validation never injects the legacy English grammar/neutral-copy repairs into another language. */
function localizedEscolhaScript(raw: unknown, input: CenaInput, product: string): CenaScript {
  const r = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown> | null
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('escolha_script_invalid')
  const hooks = Array.isArray(r.hooks) ? r.hooks.map(clean) : [], use = clean(r.use), benefit = clean(r.benefit), cta = clean(r.cta)
  if (hooks.length !== 3 || new Set(hooks.map(fold)).size !== 3 || hooks.some(h => !h || words(h, input.language) > 10) || !use || !cta) throw new Error('escolha_script_invalid')
  if ([use, benefit, cta].filter(Boolean).some(line => !/[.!?。！？؟।][”"']?$/u.test(line))) throw new Error('escolha_complete_sentences_required')
  const narration = [hooks[0], use, benefit, cta].filter(Boolean).join(' ')
  const ctaKey = (s: string) => fold(s).replace(/[.!?。！？؟।]+$/u, '')
  if (!includes(narration, product) || input.cta && ctaKey(cta) !== ctaKey(input.cta) || ajusteRespaldoIssues(r, input, product).length) throw new Error('escolha_script_invalid')
  return { hooks: hooks as [string, string, string], hook: hooks[0], use, benefit, cta, narration }
}
async function writeLocalizedEscolhaScript(input: CenaInput, product: string, call: CenaJson, prompt: string): Promise<CenaScript> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await call({ model: AI_TEXT_MODELS.ads, system: `${prompt} Every spoken field must remain in ${input.language}. Use the script's native sentence punctuation. Never fall back to English.`, text: JSON.stringify({ frase: input.frase, beneficios: input.beneficios, product, cta: input.cta }), images: [] })
      return localizedEscolhaScript(raw, input, product)
    } catch { /* Bounded writer retry, no deterministic translation or English fallback. */ }
  }
  throw new Error('escolha_script_language_unavailable')
}
/** Compare complete offer tokens, ignoring case/punctuation without matching 20 inside 120. */
export function escolhaHasOffer(text: string, value: string): boolean {
  const key = offerKey(value)
  return !!key && ` ${offerKey(text)} `.includes(` ${key} `)
}
function stripSpokenOffer(text: string, offer: string): string {
  const tokens = offerKey(offer).split(' ').filter(Boolean)
  if (!tokens.length) return text
  const pattern = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('[^\\p{L}\\p{N}]*')
  return text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'giu'), ' ')
}
export function escolhaOf(plan: CenaPlan): CenaEscolhaSelection | null {
  const choice = (plan as CenaPlan & { escolha?: CenaEscolhaSelection }).escolha
  return choice?.marker === CENA_ESCOLHA_MARK ? choice : null
}
function speechInput(input: CenaInput, product: string): CenaInput {
  const offer = clean(input.oferta), pt = (input.language ?? 'en').startsWith('pt')
  const cta = offer && escolhaHasOffer(input.cta ?? '', offer) ? legacySpeech(input) ? `${pt ? 'Conheça' : 'Discover'} ${product}.` : undefined : input.cta
  return { ...input, oferta: '', frase: offer ? stripSpokenOffer(input.frase, offer) : input.frase, beneficios: (input.beneficios ?? []).filter(b => !escolhaHasOffer(b, offer)), cta }
}
/** A whole-sentence budget, never a substring/ellipsis of the CTA. The original offer stays in input for one final overlay. */
export function fitCenaEscolhaScript(raw: unknown, input: CenaInput, product: string, maxWords = 30): CenaScript {
  const spoken = speechInput(input, product), legacy = legacySpeech(input), base = legacy ? fitAjusteScript(raw, spoken, product) : localizedEscolhaScript(raw, spoken, product)
  const pt = (input.language ?? 'en').startsWith('pt'), offer = clean(input.oferta)
  const excludeOffer = (s: string): string => sentences(s, input.language).filter(sentence => !escolhaHasOffer(sentence, offer)).join(' ')
  const script: CenaScript = { ...base, hooks: [...base.hooks] as [string, string, string], hook: excludeOffer(base.hook), use: excludeOffer(base.use), benefit: excludeOffer(base.benefit), cta: excludeOffer(base.cta), narration: '' }
  if (!script.cta) { if (!legacy) throw new Error('escolha_script_language_unavailable'); script.cta = `${pt ? 'Conheça' : 'Discover'} ${product}.` }
  if (!script.hook && legacy) script.hook = `${pt ? 'Conhece' : 'Know'} ${product}?`
  const join = () => [script.hook, script.use, script.benefit, script.cta].filter(Boolean).join(' ')
  for (const field of ['use', 'benefit'] as const) {
    const pieces = sentences(script[field], input.language)
    for (let k = pieces.length - 1; k >= 0 && words(join(), input.language) > maxWords; k--) {
      const previous = script[field]; script[field] = pieces.filter((_, n) => n !== k).join(' ')
      if (!includes(join(), product)) script[field] = previous
      else pieces.splice(k, 1)
    }
  }
  if (!includes(join(), product)) { if (!legacy) throw new Error('escolha_spoken_core_exceeds_15s'); script.hook = `${pt ? 'Conhece' : 'Know'} ${product}?` }
  if (words(join(), input.language) > maxWords) {
    if (!legacy) throw new Error('escolha_spoken_core_exceeds_15s')
    script.hook = includes(script.cta, product) ? '' : `${pt ? 'Conhece' : 'Know'} ${product}?`
    script.use = ''; script.benefit = ''
  }
  script.narration = join(); script.hooks[0] = script.hook
  if (!script.narration || words(script.narration, input.language) > maxWords) throw new Error('escolha_spoken_core_exceeds_15s')
  return script
}
function prompts(plan: CenaEscolhaPlan): void {
  const sample = isEscolhaSamplePlan(plan), end = escolhaSeconds(plan), edges = sample ? [0, 3, 6, 8] : [0, 5, 10, 15] // KINEO-AMOSTRA-ANUNCIO-2410
  const selected = escolhaScenario(plan.escolha.scenarioId)!
  const mode = cenaVoiceModeOf(plan), formatId = plan.input.formato ?? 'product', story = escolhaStory(plan.category, formatId)
  const skin = plan.category === 'skincare' && (formatId === 'product' || formatId === 'ugc'), wornShoes = plan.category === 'footwear' && (formatId === 'product' || formatId === 'ugc')
  plan.setting = selected.setting; plan.interaction = story.shots.map(s => s.action).join(' ')
  plan.actor = 'the exact approved adult presenter, with the same natural face, hair, skin and clothing as the supplied portrait'
  plan.format = `escolha_${formatId}`
  const safety = `Exactly one adult: ${plan.actor}. Preserve outfit ${plan.escolha.wardrobe}. Only this person's own hands attached continuously to their arms: five anatomically natural fingers per visible hand, correct left/right ownership, never reversed or mirrored hands; no extra people or limbs. Preserve the exact customer's entire product, label spelling, colours, materials, scale and proportions. The real label remains readable and unobstructed; do not cover it with hands or added graphics. Clean uncluttered premium lighting: no unrelated dishes, random props, duplicate reflections or invented label text. Only objects required by the selected product interaction may be present. ${skin ? 'Show the selected natural face. Keep the whole original container visibly held below and away from their own face; only their own connected hands, never someone else\'s hand.' : 'Keep the product separated from the face.'}`
  const lane = plan.escolha.captionLane === 'top' ? 62 : 70
  const format = formatId === 'product_in_hand' ? 'PRODUCT IN HAND: the selected person presents the real product to camera, turns front to side, then holds it in a moving close-up. Never apply, consume or wear it.' : formatId === 'unboxing' ? 'UNBOXING: open only a plain unbranded outer box with a transparent front, lift out the real product and show its unchanged label. Preserve actual retail packaging; do not invent branded packaging or accessories.' : plan.input.formato === 'ugc' ? 'UGC: the selected creator addresses the camera naturally in the wide and medium takes, with their recognizable face and actual product clearly visible; then show the real product in use in close-up.' : `PRODUCT AD: the actual product is the hero through a clear demonstration by the selected recognizable actor, with a wide full-body establishing take, a medium demonstration and a detailed product-in-use close-up. ${skin ? 'Facial skincare is applied to the selected person own face, never forearm.' : 'Every take uses the same referenced product and the same selected person.'}`
  const placement = wornShoes ? 'In the WIDE full-body take, the real shoes stay naturally on the feet in the bottom80–100% of the frame, below the caption band; never lift or relocate worn shoes to the chest. In the final CLOSE, reframe the whole real shoes and any printed label above56% of the close-up frame.' : 'In wide and medium takes, hold/use the whole real product and its printed label naturally above56% of frame height; in the final CLOSE keep the whole product above56% of that close-up frame.'
  const composition = `COMPOSITION LOCK: vertical9:16, one full-screen view at any moment, never quadrants, collage, split-screen or picture-in-picture. Keep the face in the upper third when visible. ${placement} Reserve a quiet text-safe strip centred at ${lane}% for captions. Product label and face must never enter or be obscured by that strip. Leave62–72% uncluttered for final text. Do not generate any text, logo, badge, price, discount, subtitle or card; the editor adds those once.`
  const sceneInteraction = formatId === 'product_in_hand' || formatId === 'unboxing' ? story.shots.map(s => s.action).join(' ') : skin ? `follow the timed sequence: keep the jar CLOSED for nail taps at0–${edges[1]}s, open it only at${edges[1]}–${edges[2]}s, then apply a small amount with their own fingers to their own cheek only at${edges[2]}–${end}s` : plan.interaction // KINEO-AMOSTRA-ANUNCIO-2410
  const common = `${format} ${safety} In ${selected.setting}, ${sceneInteraction}. ${composition}`
  const base = `Use the customer's CHOSEN still as the exact first frame and identity/composition reference. ${common}`
  const silent = 'Closed relaxed lips, no speech, no singing and no lip-sync; only natural ambient sound effects of the scene and the actions, no dialogue and no music; a separate full narration is added in editing.' // KINEO-ADS-RENDER-FIX-2310 — o Kling gera som ambiente (unhas no pote, mar, passos); fala continua proibida
  const native = (text: string, close = false) => text ? `${close ? 'The same selected presenter continues native speech off-camera during the real product close; do not animate a mouth on the product.' : 'The selected face and speaking mouth remain visible, naturally addressing the camera.'} Native ${plan.input.language} speech; say ONLY these exact words, with no additions: ${text}` : 'No dialogue in this take; any visible lips remain naturally closed.'
  const voice = mode === 'narrated' ? silent : native(plan.script.narration)
  // KINEO-ADS-RENDER-FIX-2310 — the still prompt no longer carries the three-take video wording (wide/medium/close): it made the image model draw 3–5 panel storyboards (orders 1a09131b and 499b6966, 3 of 4 previews).
  const stillPlacement = wornShoes ? 'The real shoes stay naturally on the feet in the bottom80–100% of the frame, below the caption band.' : 'The whole real product and its printed label stay naturally above56% of frame height.' // KINEO-ADS-RENDER-FIX-2310
  const openingInteraction = story.opening
  const stillCommon = `${safety} In ${selected.setting}, ${openingInteraction}. SINGLE PHOTOGRAPH: one single full-bleed vertical 9:16 frame from one continuous camera view; no panels, borders, gutters, grid, collage, triptych, storyboard, split-screen or picture-in-picture. Keep the face in the upper third. ${stillPlacement} Reserve a quiet text-safe strip centred at ${lane}%. Do not generate any text, logo, badge, price, discount or subtitle.` // KINEO-ADS-RENDER-FIX-2310
  const still = `Reference image1 is the exact customer product. Reference image2 is the approved presenter identity and original wardrobe. ${stillCommon} WIDE FULL-BODY opening frame: the entire selected person from head to feet is in view with their recognizable natural face, both legs, knees and correctly joined limbs visible, naturally using the whole actual product. Preserve real product scale. Natural opening posture, ready to begin the product interaction. ${mode === 'narrated' ? 'Mouth closed and relaxed, no speaking or lip-sync.' : 'The selected face and mouth are visible, naturally ready to speak.'}`
  plan.keyframePrompts = [still, still]
  const units = narrationTokens(plan.script.narration, plan.input.language), takes = ['', '', '']; let at = 0
  for (let take = 0; take < 3; take++) {
    const count = Math.ceil((units.length - at) / (3 - take))
    takes[take] = joinNarrationTokens(units.slice(at, at + count), plan.input.language); at += count
  }
  plan.escolha.shotPrompts = escolhaShotPrompts(plan.category, formatId, mode === 'talking' ? takes as [string, string, string] : undefined, plan.input.language)
  if (sample) plan.escolha.shotPrompts = plan.escolha.shotPrompts.map((p, i) => p.replace(/Absolute\d+–\d+s/u, `Absolute${edges[i]}–${edges[i + 1]}s`).replace('live movement to15s', 'live movement to8s').replace('Lips closed; ambient action sounds only, no speech/music.', 'Lips closed; silent, no speech, sound or music.')) as [string, string, string] // KINEO-AMOSTRA-ANUNCIO-2410
  plan.videoPrompt = `${base} Exactly three sequential full-screen moving takes in the SAME scene: ${story.shots.map((shot, i) => `${edges[i]}–${edges[i + 1]}s ${shot.action}`).join(' ')} Same identity, wardrobe, lighting and product throughout; no quadrants, collage, frozen photograph, packshot or end card. Final overlays${end - 2}–${end}s sit above the live close-up. ${sample ? 'Silent video: lips closed, no speech, sound or music; narration and music are added separately.' : voice}` // KINEO-AMOSTRA-ANUNCIO-2410
  const parts = [plan.script.hook, plan.script.use, plan.script.benefit, plan.script.cta].filter(Boolean)
  let left = '', right = ''
  for (const part of parts) { if (words(left) < words(plan.script.narration) * .48) left = [left, part].filter(Boolean).join(' '); else right = [right, part].filter(Boolean).join(' ') }
  plan.segmentPrompts = [0, 1].map(index => { const text = index ? right : left; return `${base} Local0s is absolute${index ? 8 : 0}s. ${index ? `Local0–2s continue: ${story.shots[1].action} Local2–7s: ${story.shots[2].action} Local7–8s continue silently, last second trimmed. Finish every spoken word BEFORE local7s; never repeat opening.` : `Local0–5s: ${story.shots[0].action} Local5–8s begin: ${story.shots[1].action} End mid-action.`} ${mode === 'narrated' ? silent : native(text, index === 1)}` }) as [string, string]
}
/** Same pure safety and provider contracts for dry-run, start and runtime; no legacy composition/copy rewrite. */
export function preflightCenaEscolha(plan: CenaPlan, route: CenaRoute): void {
  const sample = isEscolhaSamplePlan(plan) // KINEO-AMOSTRA-ANUNCIO-2410
  if (sample && (route !== 'kling3' || cenaVoiceModeOf(plan) !== 'narrated' || plan.input.voice_mode !== 'narrated')) throw new Error('escolha_sample_requires_silent_kling3') // KINEO-AMOSTRA-ANUNCIO-2410
  const choice = escolhaOf(plan), presenter = choice && escolhaPresenter(choice.presenterId), scenario = choice && escolhaScenario(choice.scenarioId)
  if (!escolhaFormat(plan.input.formato ?? 'product')) throw new Error('escolha_invalid_format')
  if (!choice || !presenter || !scenario || !cenaCategory(choice.category) || scenario.category !== choice.category || !cenaHttps(plan.input.foto)) throw new Error('escolha_invalid_selection')
  const actorUrl = presenter.portrait.startsWith('/') ? `https://www.usekineo.com${presenter.portrait}` : presenter.portrait
  if (choice.actorUrl !== actorUrl || plan.input.actorUrl !== actorUrl || plan.continuity?.actorUrl !== actorUrl || choice.captionLane !== scenario.captionLane || plan.category !== choice.category || !choice.wardrobe) throw new Error('escolha_selection_changed')
  cenaAssertVoiceRoute(route, cenaVoiceModeOf(plan), plan.input.language)
  if (!plan.script?.narration || words(plan.script.narration, plan.input.language) > (sample ? ADS_ESCOLHA_SAMPLE_WORDS : 30) || [plan.script.hook, plan.script.use, plan.script.benefit, plan.script.cta].filter(Boolean).join(' ') !== plan.script.narration) throw new Error(sample ? 'escolha_spoken_core_exceeds_8s' : 'escolha_spoken_core_exceeds_15s') // KINEO-AMOSTRA-ANUNCIO-2410
  if (clean(plan.input.oferta) && escolhaHasOffer(plan.script.narration, plan.input.oferta!)) throw new Error('escolha_offer_must_be_visual_only')
  if (!plan.videoPrompt?.trim() || plan.segmentPrompts?.length !== 2 || !plan.segmentPrompts.every(p => p.trim()) || choice.shotPrompts?.length !== 3 || !choice.shotPrompts.every(p => p.trim())) throw new Error('escolha_prompts_missing')
  escolhaVideoRequests(plan, route, plan.input.foto)
}
export async function planCenaEscolha(input: CenaInput, route: CenaRoute, json: CenaJson, selection: CenaEscolhaRequestSelection): Promise<CenaPlan> {
  const sample = selection.sample === true, maxWords = sample ? ADS_ESCOLHA_SAMPLE_WORDS : 30 // KINEO-AMOSTRA-ANUNCIO-2410
  if (sample && route !== 'kling3') throw new Error('escolha_sample_requires_silent_kling3') // KINEO-AMOSTRA-ANUNCIO-2410
  const presenter = escolhaPresenter(selection.presenter_id), scenario = escolhaScenario(selection.scenario_id)
  if (!presenter || !scenario || !cenaCategory(scenario.category) || selection.category !== undefined && selection.category !== scenario.category) throw new Error('escolha_invalid_selection')
  const category = scenario.category, actorUrl = presenter.portrait.startsWith('/') ? `https://www.usekineo.com${presenter.portrait}` : presenter.portrait
  const quality: Pick<CenaPlan, 'quality_notes'> = {}
  let classified: Awaited<ReturnType<typeof classifyCena>>
  try { classified = await classifyCena(input, json) }
  catch { classified = { category, product: clean(input.frase.split(/[;.!?]/u)[0]).slice(0, 160), benefits: [], offer: '' }; addAjusteQuality(quality, { stage: 'classification', code: 'classifier_repaired', message: 'Typed product and selected category retained after an unavailable classifier.' }) }
  if (classified.category !== 'other' && classified.category !== category) throw new Error('escolha_scenario_category_mismatch')
  input = { ...input, actorUrl, oferta: input.oferta || classified.offer, beneficios: [...new Set([...(input.beneficios ?? []), ...classified.benefits])], voice_mode: sample ? 'narrated' : input.voice_mode ?? 'narrated' } // KINEO-AMOSTRA-ANUNCIO-2410
  const product = classified.product, spoken = speechInput(input, product)
  const scriptPrompt = `${ajusteScriptPrompt(spoken, product)} NEW SCENE SELECTION: at most${maxWords} spoken words in the selected language, completed sentences. The typed offer is a final visual overlay ONLY: never say a discount, price, promotion or offer in the speech. Name the product once. No description of actors or cameras.` // KINEO-AMOSTRA-ANUNCIO-2410
  const draft = legacySpeech(input) ? await writeAjusteScript(spoken, product, json, raw => naturalAjusteScript(raw, spoken, product), scriptPrompt, note => addAjusteQuality(quality, note)) : await writeLocalizedEscolhaScript(spoken, product, json, scriptPrompt)
  const wardrobe = 'the exact original outfit visible in the approved presenter portrait, with identical colour, fabric and sleeves'
  const choice: CenaEscolhaSelection = { marker: CENA_ESCOLHA_MARK, presenterId: presenter.id, scenarioId: scenario.id, category, actorUrl, wardrobe, captionLane: scenario.captionLane, shotPrompts: ['', '', ''] }
  if (sample) choice.sample = ADS_ESCOLHA_SAMPLE_MARK // KINEO-AMOSTRA-ANUNCIO-2410
  const plan: CenaEscolhaPlan = { marker: 'KINEO-ADS-CENA-2110', input, product, category, format: '', setting: scenario.setting, interaction: scenario.interaction, actor: '', script: fitCenaEscolhaScript(draft, input, product), keyframePrompts: ['', ''], videoPrompt: '', segmentPrompts: ['', ''], voice_mode: input.voice_mode, audioMode: input.voice_mode === 'talking' ? 'native' : 'voiceover', continuity: { actorUrl, wardrobe, productWrist: category === 'wearable' ? 'left' : null }, ajusteLive: { version: 'KINEO-ADS-CENA-RETOMADA-2110', music: true }, escolha: choice, quality_notes: quality.quality_notes }
  if (sample) plan.script = fitCenaEscolhaScript(draft, input, product, maxWords) // KINEO-AMOSTRA-ANUNCIO-2410
  prompts(plan); preflightCenaEscolha(plan, route)
  return plan
}
/** KINEO-AMOSTRA-ANUNCIO-2410 — upgrade reuses the exact saved person, scenario, product and complete spoken script; no new planning or image effect. */
export function fullEscolhaPlan(samplePlan: CenaPlan): CenaPlan { // KINEO-AMOSTRA-ANUNCIO-2410
  if (!isEscolhaSamplePlan(samplePlan)) throw new Error('escolha_sample_plan_required') // KINEO-AMOSTRA-ANUNCIO-2410
  const plan = JSON.parse(JSON.stringify(samplePlan)) as CenaEscolhaPlan // KINEO-AMOSTRA-ANUNCIO-2410
  delete plan.escolha.sample // KINEO-AMOSTRA-ANUNCIO-2410
  prompts(plan); preflightCenaEscolha(plan, 'kling3') // KINEO-AMOSTRA-ANUNCIO-2410
  return plan // KINEO-AMOSTRA-ANUNCIO-2410
} // KINEO-AMOSTRA-ANUNCIO-2410
