// KINEO-IDIOMAS-FORMATOS-2410 — shared selection, storyboard and compact provider prompts; no paid effects.
import type { CenaCategory } from './catalog'

export const CENA_ESCOLHA_FORMATS = [
  { id: 'ugc', pt: 'UGC', en: 'UGC' },
  { id: 'product', pt: 'Produto em destaque', en: 'Product in focus' },
  { id: 'product_in_hand', pt: 'Produto na mão', en: 'Product in hand' },
  { id: 'unboxing', pt: 'Unboxing', en: 'Unboxing' },
] as const
export type CenaEscolhaFormat = typeof CENA_ESCOLHA_FORMATS[number]['id']
export function escolhaFormat(value: unknown): value is CenaEscolhaFormat { return CENA_ESCOLHA_FORMATS.some(f => f.id === value) }
type Shot = { pt: string; en: string; action: string }
type Story = { opening: string; shots: readonly [Shot, Shot, Shot] }
const CATEGORY_STORIES: Record<CenaCategory, Story> = {
  footwear: { opening: 'crouches with the real shoes on their own feet, own fingers ready to tie the laces', shots: [
    { pt: 'Amarra o tênis', en: 'Ties the shoes', action: 'WIDE full body: ties the real shoes on their own feet with connected hands.' },
    { pt: 'Levanta e corre', en: 'Stands and runs', action: 'WIDE: stands up and jogs forward, full body in natural running motion, same real shoes.' },
    { pt: 'Close do tênis em movimento', en: 'Close-up of moving shoes', action: 'CLOSE: the real shoes take two natural running strides, all shoe details visible; no new lettering.' },
  ] },
  skincare: { opening: 'holds the real jar CLOSED, original lid fully screwed on, fingers poised for nail taps; no visible cream, scooping or application', shots: [
    { pt: 'Tap das unhas na tampa', en: 'Nail taps on the lid', action: 'WIDE full body: holds the real jar CLOSED and taps its lid twice with four fingernails, crisp ASMR nail taps; smiles.' },
    { pt: 'Abre o pote e pega o creme', en: 'Opens jar and scoops cream', action: 'MEDIUM: twists the original lid OFF, then scoops a little cream with one fingertip; no cream before opening.' },
    { pt: 'Aplica uma vez no rosto', en: 'Applies once to the cheek', action: 'CLOSE: smooths that cream onto their own cheek in ONE gentle stroke, OPEN real jar and unchanged label in view.' },
  ] },
  wearable: { opening: 'has the actual watch on their own LEFT wrist, own other hand ready to fasten the existing strap', shots: [
    { pt: 'Ajusta o relógio no pulso', en: 'Fastens the watch', action: 'WIDE full body: fastens the real watch on their own LEFT wrist using its existing strap.' },
    { pt: 'Caminha e confere a hora', en: 'Walks and checks the time', action: 'MEDIUM: takes two confident steps, glances at their own LEFT wrist and taps the watch existing control once; no invented screen UI.' },
    { pt: 'Close do relógio no pulso', en: 'Watch close-up on the wrist', action: 'CLOSE: gently turns their own LEFT wrist, showing the whole real watch, dial, strap and original markings while moving.' },
  ] },
  perfume: { opening: 'holds the actual perfume bottle upright with its original cap still attached, ready to remove it', shots: [
    { pt: 'Pega o frasco e tira a tampa', en: 'Lifts bottle and removes cap', action: 'WIDE full body: lifts the real perfume bottle and removes its original cap with their own hands.' },
    { pt: 'Borrifa uma vez no pulso', en: 'Sprays once onto the wrist', action: 'MEDIUM: sprays the real perfume ONCE onto their own wrist, bottle pointed away from the face, then lowers the wrist.' },
    { pt: 'Close do frasco real', en: 'Close-up of the real bottle', action: 'CLOSE: replaces the original cap and holds the real bottle steady in their own hand, front label facing camera, unobstructed.' },
  ] },
  bag: { opening: 'rests their own hand on the actual bag existing handle, ready to lift it', shots: [
    { pt: 'Pega a bolsa pela alça', en: 'Lifts the bag by its handle', action: 'WIDE full body: lifts the real bag by its existing handle with their own connected hand.' },
    { pt: 'Coloca no ombro e caminha', en: 'Shoulders it and walks', action: 'MEDIUM: places the real bag existing strap on their own shoulder and walks two confident steps, relaxed natural movement.' },
    { pt: 'Close da bolsa em uso', en: 'Close-up of the bag in use', action: 'CLOSE: steadies the real bag while walking, gently turns its front toward camera; original material, fastening and label visible.' },
  ] },
  bottle: { opening: 'holds the actual bottle upright with its original cap closed, ready to open it', shots: [
    { pt: 'Pega a garrafa', en: 'Picks up the bottle', action: 'WIDE full body: picks up the real capped bottle, stands tall and takes one relaxed step.' },
    { pt: 'Abre a tampa e faz uma pausa', en: 'Opens the cap and pauses', action: 'MEDIUM: pauses and opens the bottle existing cap with their own connected hands; no invented contents or added liquid.' },
    { pt: 'Close da garrafa na mão', en: 'Close-up of bottle in hand', action: 'CLOSE: holds the opened real bottle upright and slowly turns it toward camera, label clear; original cap remains in their other hand.' },
  ] },
  supplement: { opening: 'holds the real supplement container CLOSED, ready to open its existing closure; no dose, pills, powder or shaker invented', shots: [
    { pt: 'Pega a embalagem real', en: 'Picks up the real container', action: 'WIDE full body: picks up the CLOSED real supplement container, natural confident posture.' },
    { pt: 'Abre a embalagem', en: 'Opens the container', action: 'MEDIUM: opens the real container existing closure with their own hands; no invented scoop, powder, capsules, serving or health result.' },
    { pt: 'Close do rótulo original', en: 'Original label close-up', action: 'CLOSE: slowly turns the open real container toward camera with its whole original label visible; no ingestion or result claim.' },
  ] },
  tea: { opening: 'holds the actual tea package CLOSED beside one plain cup, ready to open its existing closure', shots: [
    { pt: 'Escolhe o chá', en: 'Picks up the tea', action: 'WIDE full body: picks up the CLOSED real tea package beside a plain cup, relaxed morning-ritual posture.' },
    { pt: 'Abre o chá junto à xícara', en: 'Opens tea beside the cup', action: 'MEDIUM: opens the real tea package with their own hands beside the plain cup; no invented sachet, scoop or package contents.' },
    { pt: 'Close do chá na pausa', en: 'Tea close-up during the break', action: 'CLOSE: slowly turns the real tea package beside the cup, original label clear, own connected fingers visible; no drinking or claims.' },
  ] },
  other: { opening: 'holds the actual product in their own connected hands, its real front toward camera, ready to turn it', shots: [
    { pt: 'Pega o produto real', en: 'Picks up the real product', action: 'WIDE full body: picks up the actual product with their own connected hands, original proportions unchanged.' },
    { pt: 'Mostra frente e lateral', en: 'Shows front and side', action: 'MEDIUM: takes a confident step and gently turns the actual product from front to side; no invented function or accessories.' },
    { pt: 'Close dos detalhes reais', en: 'Real detail close-up', action: 'CLOSE: gently tilts the real product in their own hands to show its original front, material and label, without adding features.' },
  ] },
}
const HAND_STORY: Story = { opening: 'holds the whole actual product naturally in their own connected hands, ready to present its front to camera; wearable/shoes are held, not worn', shots: [
  { pt: 'Apresenta o produto na mão', en: 'Presents the product in hand', action: 'WIDE full body: presents the whole real product in their own hands toward camera; recognizable face visible.' },
  { pt: 'Mostra a frente e a lateral', en: 'Shows the front and side', action: 'MEDIUM: brings the real product toward camera, slowly turns front to side, own hands connected and face visible; no claimed testimonial.' },
  { pt: 'Close do produto na mão', en: 'Product-in-hand close-up', action: 'CLOSE: tilts the whole real product in their own hand, front label facing camera, original shape and details clear.' },
] }
const UNBOX_STORY: Story = { opening: 'rests their own connected hands on a CLOSED plain unbranded outer box with a transparent front: the whole actual product and its original label are fully visible inside; preserve real retail packaging', shots: [
  { pt: 'Abre a embalagem externa', en: 'Opens the outer packaging', action: 'WIDE full body: opens the lid of that plain unbranded transparent-front outer box with their own hands; no knife; retail packaging unchanged.' },
  { pt: 'Retira o produto real', en: 'Lifts out the real product', action: 'MEDIUM: lifts the actual product from that same box and turns its real front toward camera, recognizable face visible; no new accessories.' },
  { pt: 'Close do produto revelado', en: 'Revealed product close-up', action: 'CLOSE: gently turns the whole actual product in their own hands, original label clear; opened shipping box stays below it.' },
] }
export function escolhaStory(category: CenaCategory, format: CenaEscolhaFormat = 'product'): Story { return format === 'product_in_hand' ? HAND_STORY : format === 'unboxing' ? UNBOX_STORY : CATEGORY_STORIES[category] }
export function escolhaShotPreview(category: CenaCategory, format: CenaEscolhaFormat = 'product') { return escolhaStory(category, format).shots.map((s, i) => ({ id: ['wide', 'medium', 'close'][i], seconds: 5, pt: s.pt, en: s.en })) }
/** The chosen still carries identity/scene detail. Essential continuity, sound and product constraints remain in every sent shot. */
export function escolhaShotPrompts(category: CenaCategory, format: CenaEscolhaFormat, speech?: readonly [string, string, string], language = 'en'): [string, string, string] {
  const lock = 'Chosen still: same ONE adult, outfit, scene and whole real product, label unchanged. Own attached hands, five fingers. No invented branding/text/split screen. Product in frame.' // KINEO-ADS-MARCA-QUADRO-2410 — fundador 24/10 (perfume 9,5): o frasco saía do quadro quando ela esticava o braço
  return escolhaStory(category, format).shots.map((s, i) => {
    const sound = speech ? speech[i] ? `${i === 2 ? 'Same person off-camera' : 'Person on camera'} says ONLY in ${language}: ${speech[i]}` : 'No speech, lips closed.' : 'Lips closed; ambient action sounds only, no speech/music.'
    const tail = i === 2 ? ' Label faces camera, no reveal turn. Whole label above56%; live movement to15s; no card.' : '' // KINEO-ADS-MARCA-QUADRO-2410 — a marca aparece já de frente, sem girar o produto para revelar
    const prompt = `${lock} Absolute${i * 5}–${(i + 1) * 5}s: ${s.action}${tail} ${sound}`
    if (prompt.length > 500) throw new Error('escolha_shot_prompt_exceeds_500')
    return prompt
  }) as [string, string, string]
}
