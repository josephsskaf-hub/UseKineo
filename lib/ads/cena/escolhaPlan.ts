// KINEO-ADS-ESCOLHA-2310 — pure planning for one customer-approved actor, scenario and still.
import { classifyCena, cenaHttps, cenaVoiceModeOf, type CenaInput, type CenaJson, type CenaPlan, type CenaScript } from './plan'
import { cenaAssertVoiceRoute, type CenaRoute } from './adapters'
import { escolhaVideoRequests } from './escolhaVideo'
import { cenaCategory, type CenaCategory } from './catalog'
import { ajusteScriptPrompt, naturalAjusteScript } from './ajustePlan'
import { fitAjusteScript, writeAjusteScript } from './ajusteRespaldo'
import { addAjusteQuality } from './ajusteQuality'
import { CENA_ESCOLHA_MARK, escolhaPresenter, escolhaScenario } from './escolhaCatalog'

export interface CenaEscolhaSelection {
  marker: 'KINEO-ADS-ESCOLHA-2310'; presenterId: string; scenarioId: string; category: CenaCategory;
  actorUrl: string; wardrobe: string; captionLane: 'top' | 'bottom'; shotPrompts: [string, string, string];
}
export type CenaEscolhaPlan = CenaPlan & { escolha: CenaEscolhaSelection }
export interface CenaEscolhaRequestSelection { presenter_id: string; scenario_id: string; category?: unknown }
const clean = (v: unknown): string => typeof v === 'string' ? v.replace(/\s+/gu, ' ').trim() : ''
const fold = (s: string): string => clean(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const words = (s: string): number => clean(s).split(/\s+/u).filter(Boolean).length
const sentences = (s: string): string[] => clean(s).split(/(?<=[.!?])\s+/u).filter(Boolean)
const includes = (text: string, value: string): boolean => !!value && fold(text).includes(fold(value))
const offerKey = (text: string): string => fold(text).replace(/([%$€£])/gu, ' $1 ').replace(/[^\p{L}\p{N}%$€£]+/gu, ' ').trim().replace(/\s+/gu, ' ')
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
  const cta = offer && escolhaHasOffer(input.cta ?? '', offer) ? `${pt ? 'Conheça' : 'Discover'} ${product}.` : input.cta
  return { ...input, oferta: '', frase: offer ? stripSpokenOffer(input.frase, offer) : input.frase, beneficios: (input.beneficios ?? []).filter(b => !escolhaHasOffer(b, offer)), cta }
}
/** A whole-sentence budget, never a substring/ellipsis of the CTA. The original offer stays in input for one final overlay. */
export function fitCenaEscolhaScript(raw: unknown, input: CenaInput, product: string, maxWords = 30): CenaScript {
  const spoken = speechInput(input, product), base = fitAjusteScript(raw, spoken, product)
  const pt = (input.language ?? 'en').startsWith('pt'), offer = clean(input.oferta)
  const excludeOffer = (s: string): string => sentences(s).filter(sentence => !escolhaHasOffer(sentence, offer)).join(' ')
  const script: CenaScript = { ...base, hooks: [...base.hooks] as [string, string, string], hook: excludeOffer(base.hook), use: excludeOffer(base.use), benefit: excludeOffer(base.benefit), cta: excludeOffer(base.cta), narration: '' }
  if (!script.cta) script.cta = `${pt ? 'Conheça' : 'Discover'} ${product}.`
  if (!script.hook) script.hook = `${pt ? 'Conhece' : 'Know'} ${product}?`
  const join = () => [script.hook, script.use, script.benefit, script.cta].filter(Boolean).join(' ')
  for (const field of ['use', 'benefit'] as const) {
    const pieces = sentences(script[field])
    for (let k = pieces.length - 1; k >= 0 && words(join()) > maxWords; k--) {
      const previous = script[field]; script[field] = pieces.filter((_, n) => n !== k).join(' ')
      if (!includes(join(), product)) script[field] = previous
      else pieces.splice(k, 1)
    }
  }
  if (!includes(join(), product)) script.hook = `${pt ? 'Conhece' : 'Know'} ${product}?`
  if (words(join()) > maxWords) {
    script.hook = includes(script.cta, product) ? '' : `${pt ? 'Conhece' : 'Know'} ${product}?`
    script.use = ''; script.benefit = ''
  }
  script.narration = join(); script.hooks[0] = script.hook
  if (!script.narration || words(script.narration) > maxWords) throw new Error('escolha_spoken_core_exceeds_15s')
  return script
}
function prompts(plan: CenaEscolhaPlan): void {
  const selected = escolhaScenario(plan.escolha.scenarioId)!
  const mode = cenaVoiceModeOf(plan), skin = plan.category === 'skincare'
  plan.setting = selected.setting; plan.interaction = skin ? 'opens the original skincare container and gently applies a small amount with their own fingers to their own cheek, keeping the full original container below the face and its label visible' : selected.interaction
  plan.actor = 'the exact approved adult presenter, with the same natural face, hair, skin and clothing as the supplied portrait'
  plan.format = plan.input.formato === 'ugc' ? 'escolha_ugc' : 'escolha_product'
  const safety = `Exactly one adult: ${plan.actor}. Preserve outfit ${plan.escolha.wardrobe}. Only this person's own hands attached continuously to their arms: five anatomically natural fingers per visible hand, correct left/right ownership, never reversed or mirrored hands; no extra people or limbs. Preserve the exact customer's entire product, label spelling, colours, materials, scale and proportions. The real label remains readable and unobstructed; do not cover it with hands or added graphics. Clean uncluttered premium lighting: no unrelated dishes, random props, duplicate reflections or invented label text. Only objects required by the selected product interaction may be present. ${skin ? 'Show the selected natural face. Demonstrate skincare with their own fingers on their own cheek while the whole original container remains visibly held below the face; never someone else\'s hand.' : 'Keep the product separated from the face.'}`
  const lane = plan.escolha.captionLane === 'top' ? 62 : 70
  const format = plan.input.formato === 'ugc' ? 'UGC: the selected creator addresses the camera naturally in the wide and medium takes, with their recognizable face and actual product clearly visible; then show the real product in use in close-up.' : `PRODUCT AD: the actual product is the hero through a clear demonstration by the selected recognizable actor, with a wide full-body establishing take, a medium demonstration and a detailed product-in-use close-up. ${skin ? 'Facial skincare is applied to the selected person own face, never forearm.' : 'Every take uses the same referenced product and the same selected person.'}`
  const placement = plan.category === 'footwear' ? 'In the WIDE full-body take, the real shoes stay naturally on the feet in the bottom80–100% of the frame, below the caption band; never lift or relocate worn shoes to the chest. In the final CLOSE, reframe the whole real shoes and any printed label above56% of the close-up frame.' : 'In wide and medium takes, hold/use the whole real product and its printed label naturally above56% of frame height; in the final CLOSE keep the whole product above56% of that close-up frame.'
  const composition = `COMPOSITION LOCK: vertical9:16, one full-screen view at any moment, never quadrants, collage, split-screen or picture-in-picture. Keep the face in the upper third when visible. ${placement} Reserve a quiet text-safe strip centred at ${lane}% for captions. Product label and face must never enter or be obscured by that strip. Leave62–72% uncluttered for final text. Do not generate any text, logo, badge, price, discount, subtitle or card; the editor adds those once.`
  const common = `${format} ${safety} In ${selected.setting}, ${plan.interaction}. ${composition}`
  const base = `Use the customer's CHOSEN still as the exact first frame and identity/composition reference. ${common}`
  const silent = 'SILENT scene, closed relaxed lips, no speech or lip-sync; a separate full narration is added in editing.'
  const native = (text: string, close = false) => text ? `${close ? 'The same selected presenter continues native speech off-camera during the real product close; do not animate a mouth on the product.' : 'The selected face and speaking mouth remain visible, naturally addressing the camera.'} Native ${plan.input.language} speech; say ONLY these exact words, with no additions: ${text}` : 'No dialogue in this take; any visible lips remain naturally closed.'
  const voice = mode === 'narrated' ? silent : native(plan.script.narration)
  const still = `Reference image1 is the exact customer product. Reference image2 is the approved presenter identity and original wardrobe. ${common} WIDE FULL-BODY opening frame: the entire selected person from head to feet is in view with their recognizable natural face, both legs, knees and correctly joined limbs visible, naturally using the whole actual product. Preserve real product scale. Natural opening posture, ready to begin the product interaction. ${mode === 'narrated' ? 'Mouth closed and relaxed, no speaking or lip-sync.' : 'The selected face and mouth are visible, naturally ready to speak.'}`
  plan.keyframePrompts = [still, still]
  const units = sentences(plan.script.narration), takes = ['', '', '']; let at = 0
  for (let take = 0; take < 3; take++) {
    const remaining = words(units.slice(at).join(' ')), goal = remaining / (3 - take)
    while (at < units.length && (take === 2 || !takes[take] || words(takes[take]) + words(units[at]) <= goal)) { takes[take] = [takes[take], units[at++]].filter(Boolean).join(' ') }
  }
  const shots = [
    'Absolute0–5s: WIDE FULL-BODY, entire selected person from head to feet, recognizable face, both legs, knees and connected limbs visible while naturally using the exact product.',
    'Absolute5–10s: MEDIUM demonstration of the same selected person and product, the natural face and connected hands clearly visible. Preserve every detail of the same outfit, scene and product.',
    'Absolute10–15s: CLOSE-UP of the exact REAL product in active use by the same selected person, including their own connected fingers/body part as appropriate. Preserve the whole product and readable unchanged label. Live natural movement continues under final text13–15s; no original-photo insert, still photograph, frozen frame, plain card or new scene.',
  ]
  plan.escolha.shotPrompts = shots.map((shot, k) => `${base} ${shot} ${mode === 'narrated' ? silent : native(takes[k], k === 2)}`) as [string, string, string]
  plan.videoPrompt = `${base} Exactly three sequential full-screen moving takes in the SAME scene: 0–5s WIDE full body head to feet; 5–10s MEDIUM same actor using the product; 10–15s CLOSE real product in active use. Same identity, wardrobe, lighting and product throughout; no quadrants, collage, frozen photograph, packshot or end card. Final overlays13–15s sit above the live close-up. ${voice}`
  const parts = [plan.script.hook, plan.script.use, plan.script.benefit, plan.script.cta].filter(Boolean)
  let left = '', right = ''
  for (const part of parts) { if (words(left) < words(plan.script.narration) * .48) left = [left, part].filter(Boolean).join(' '); else right = [right, part].filter(Boolean).join(' ') }
  plan.segmentPrompts = [0, 1].map(index => { const text = index ? right : left; return `${base} Local0s is absolute${index ? 8 : 0}s. ${index ? 'Local0–2s MEDIUM same actor demonstrating the product; local2–7s CLOSE the real product in active use; local7–8s continue silently, that last second is trimmed. Finish every supplied spoken word BEFORE local7s. Never repeat the opening or return to a wide frame.' : 'Local0–5s WIDE FULL-BODY head to feet; local5–8s MEDIUM same selected actor naturally using the actual product. End mid-action.'} ${mode === 'narrated' ? silent : native(text, index === 1)}` }) as [string, string]
}
/** Same pure safety and provider contracts for dry-run, start and runtime; no legacy composition/copy rewrite. */
export function preflightCenaEscolha(plan: CenaPlan, route: CenaRoute): void {
  const choice = escolhaOf(plan), presenter = choice && escolhaPresenter(choice.presenterId), scenario = choice && escolhaScenario(choice.scenarioId)
  if (!choice || !presenter || !scenario || !cenaCategory(choice.category) || scenario.category !== choice.category || !cenaHttps(plan.input.foto)) throw new Error('escolha_invalid_selection')
  const actorUrl = presenter.portrait.startsWith('/') ? `https://www.usekineo.com${presenter.portrait}` : presenter.portrait
  if (choice.actorUrl !== actorUrl || plan.input.actorUrl !== actorUrl || plan.continuity?.actorUrl !== actorUrl || choice.captionLane !== scenario.captionLane || plan.category !== choice.category || !choice.wardrobe) throw new Error('escolha_selection_changed')
  cenaAssertVoiceRoute(route, cenaVoiceModeOf(plan), plan.input.language)
  if (!plan.script?.narration || words(plan.script.narration) > 30 || [plan.script.hook, plan.script.use, plan.script.benefit, plan.script.cta].filter(Boolean).join(' ') !== plan.script.narration) throw new Error('escolha_spoken_core_exceeds_15s')
  if (clean(plan.input.oferta) && escolhaHasOffer(plan.script.narration, plan.input.oferta!)) throw new Error('escolha_offer_must_be_visual_only')
  if (!plan.videoPrompt?.trim() || plan.segmentPrompts?.length !== 2 || !plan.segmentPrompts.every(p => p.trim()) || choice.shotPrompts?.length !== 3 || !choice.shotPrompts.every(p => p.trim())) throw new Error('escolha_prompts_missing')
  escolhaVideoRequests(plan, route, plan.input.foto)
}
export async function planCenaEscolha(input: CenaInput, route: CenaRoute, json: CenaJson, selection: CenaEscolhaRequestSelection): Promise<CenaPlan> {
  const presenter = escolhaPresenter(selection.presenter_id), scenario = escolhaScenario(selection.scenario_id)
  if (!presenter || !scenario || !cenaCategory(scenario.category) || selection.category !== undefined && selection.category !== scenario.category) throw new Error('escolha_invalid_selection')
  const category = scenario.category, actorUrl = presenter.portrait.startsWith('/') ? `https://www.usekineo.com${presenter.portrait}` : presenter.portrait
  const quality: Pick<CenaPlan, 'quality_notes'> = {}
  let classified: Awaited<ReturnType<typeof classifyCena>>
  try { classified = await classifyCena(input, json) }
  catch { classified = { category, product: clean(input.frase.split(/[;.!?]/u)[0]).slice(0, 160), benefits: [], offer: '' }; addAjusteQuality(quality, { stage: 'classification', code: 'classifier_repaired', message: 'Typed product and selected category retained after an unavailable classifier.' }) }
  if (classified.category !== 'other' && classified.category !== category) throw new Error('escolha_scenario_category_mismatch')
  input = { ...input, actorUrl, oferta: input.oferta || classified.offer, beneficios: [...new Set([...(input.beneficios ?? []), ...classified.benefits])], voice_mode: input.voice_mode ?? 'narrated' }
  const product = classified.product, spoken = speechInput(input, product)
  const draft = await writeAjusteScript(spoken, product, json, raw => naturalAjusteScript(raw, spoken, product), `${ajusteScriptPrompt(spoken, product)} NEW SCENE SELECTION: aim at most30 words in BOTH Portuguese and English, completed sentences. The typed offer is a final visual overlay ONLY: never say a discount, price, promotion or offer in the speech. Name the product once. No description of actors or cameras.`, note => addAjusteQuality(quality, note))
  const wardrobe = 'the exact original outfit visible in the approved presenter portrait, with identical colour, fabric and sleeves'
  const choice: CenaEscolhaSelection = { marker: CENA_ESCOLHA_MARK, presenterId: presenter.id, scenarioId: scenario.id, category, actorUrl, wardrobe, captionLane: scenario.captionLane, shotPrompts: ['', '', ''] }
  const plan: CenaEscolhaPlan = { marker: 'KINEO-ADS-CENA-2110', input, product, category, format: '', setting: scenario.setting, interaction: scenario.interaction, actor: '', script: fitCenaEscolhaScript(draft, input, product), keyframePrompts: ['', ''], videoPrompt: '', segmentPrompts: ['', ''], voice_mode: input.voice_mode, audioMode: input.voice_mode === 'talking' ? 'native' : 'voiceover', continuity: { actorUrl, wardrobe, productWrist: category === 'wearable' ? 'left' : null }, ajusteLive: { version: 'KINEO-ADS-CENA-RETOMADA-2110', music: true }, escolha: choice, quality_notes: quality.quality_notes }
  prompts(plan); preflightCenaEscolha(plan, route)
  return plan
}
