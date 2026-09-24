// KINEO-STUDIO-ADS-2026-09-25 — os 8 modelos de anúncio do dia 1 (fonte: docs/studio-ads/03-taxonomia-de-anuncios.md,
// "dia1_top8", 40 modelos estudados em 24/09). Módulo PURO: sem import, sem React, sem servidor.
//
// POR QUE 35 E 60 SEGUNDOS: a rota do Kineo 1 tem piso de 35 s para roteiro próprio
// (app/api/generate-video-fast/route.ts, floorSeconds) e a trava 8.2 não liberou o piso de 20 s
// (decisão 7 de 24/09: "vai" só para legendas na zona segura e logo persistente). Os tempos da
// taxonomia (15-40 s) foram REESCALADOS para 35 ou 60 s mantendo a proporção das batidas; a
// última batida é sempre o cartão final (logo + CTA + contato), que entra como imagem PNG
// desenhada no navegador e pinada à última cena.
//
// O QUE ESTE MÓDULO DECIDE: a estrutura do roteiro (batidas com segundos e o que aparece/fala),
// as entradas mínimas que bloqueiam o passo "Modelo" na tela, o custo em créditos e a régua de
// palavras (3,1 pal/s no clássico — CLAUDE.md "uma régua por voz"). Quem escreve a prosa é
// /api/ads/script (GPT-4o-mini) A PARTIR destas batidas; quem renderiza é o Kineo 1 via
// /api/ads/render (payload montado no servidor, cena→mídia por id).

export type AdsModelId =
  | 'oferta_relampago'
  | 'vitrine_fotos'
  | 'problema_solucao'
  | 'depoimento_cartao'
  | 'antes_depois'
  | 'historia_fundador'
  | 'tres_erros'
  | 'contagem_prazo'

export type AdsSeconds = 35 | 60
export type AdsEngine = 'fast'

export interface AdsBeat {
  /** Segundos desta batida (a soma das batidas é igual a `seconds`). */
  seconds: number
  /** O que aparece na tela — instrução para o storyboard e para a escolha de mídia. */
  screen: string
  /** O que a narração diz — molde com [colchetes] que o roteiro preenche com o brief. Nunca inventa número. */
  speech: string
  /** Mídia preferida nesta batida. `client` = foto/clipe da empresa; `stock` = Pixabay só aqui; `card` = cartão final. */
  media: 'client' | 'stock' | 'card'
}

export interface AdsModelInputs {
  /** Mínimo de fotos da empresa para liberar o modelo. */
  minPhotos: number
  /** Vídeo da empresa: exigido, opcional ou não usado. */
  video: 'required' | 'optional' | 'none'
  logo: 'required'
  /** Campos do brief que o modelo exige além dos 6 obrigatórios. */
  extraFields: readonly string[]
}

export interface AdsModel {
  id: AdsModelId
  name: string
  segment: string
  goal: string
  seconds: AdsSeconds
  engine: AdsEngine
  credits: number
  /** Régua de palavras da narração para a duração (3,1 pal/s; min-max). */
  words: readonly [number, number]
  inputs: AdsModelInputs
  beats: readonly AdsBeat[]
  ctaExample: string
  /** Aviso honesto que a tela mostra ao escolher o modelo. */
  note: string
}

const WORDS_35: readonly [number, number] = [100, 115]
const WORDS_60: readonly [number, number] = [175, 195]

export const ADS_MODELS: readonly AdsModel[] = [
  {
    id: 'oferta_relampago',
    name: 'Flash offer',
    segment: 'restaurants, salons, gyms, shops, local services',
    goal: 'direct sale with a deadline',
    seconds: 35,
    engine: 'fast',
    credits: 3,
    words: WORDS_35,
    inputs: { minPhotos: 3, video: 'optional', logo: 'required', extraFields: ['offer', 'deadline'] },
    beats: [
      { seconds: 5, screen: 'Close-up of the product or service in motion; 3-5 word card with the number of the offer', speech: 'Until [deadline]: [offer in six words].', media: 'client' },
      { seconds: 14, screen: 'Three photos or clips in quick cuts, price fixed in a corner', speech: 'The [product] that [benefit in six words]. Only here, only this week.', media: 'client' },
      { seconds: 9, screen: 'Quick proof: rating, number of customers, a photo of happy people', speech: 'More than [N] people have already come.', media: 'client' },
      { seconds: 7, screen: 'Final card: logo + call to action + address or link + deadline', speech: 'Tap the button and get yours. Ends [deadline].', media: 'card' },
    ],
    ctaExample: 'Get yours before Sunday → [link] · [address]',
    note: 'Price always on screen. Around 40% of small-business requests are this format.',
  },
  {
    id: 'vitrine_fotos',
    name: 'Photo showcase',
    segment: 'any business that only has photos',
    goal: 'local reach and reminder',
    seconds: 35,
    engine: 'fast',
    credits: 3,
    words: WORDS_35,
    inputs: { minPhotos: 6, video: 'none', logo: 'required', extraFields: ['hours', 'address'] },
    beats: [
      { seconds: 4, screen: 'Best photo with a slow zoom; card "The best [X] in [neighborhood]"', speech: 'If you live in [neighborhood], this is for you.', media: 'client' },
      { seconds: 21, screen: 'Five to eight photos, alternating zoom-in and pan, item name as a small caption', speech: 'Three short sentences: what it is, who it is for, how it feels.', media: 'client' },
      { seconds: 5, screen: 'Team or storefront photo with the Google rating', speech: 'Rated [rating] by [N] customers.', media: 'client' },
      { seconds: 5, screen: 'Final card: logo + hours + address + call to action', speech: 'Open every day from [h] to [h]. Come by.', media: 'card' },
    ],
    ctaExample: 'Come visit · [street], [number] · Mon-Sat 9-19',
    note: 'Zero stock footage: every frame is yours. Cheapest ad to produce and, for local direct response, images often beat video.',
  },
  {
    id: 'problema_solucao',
    name: 'Problem → Solution',
    segment: 'home services, clinics, software, accounting',
    goal: 'lead generation',
    seconds: 35,
    engine: 'fast',
    credits: 3,
    words: WORDS_35,
    inputs: { minPhotos: 3, video: 'optional', logo: 'required', extraFields: ['pain', 'differentiator', 'turnaround'] },
    beats: [
      { seconds: 4, screen: 'Image of the PAIN (leaking pipe, aching tooth, messy spreadsheet) with a 4-5 word question card', speech: '[Pain] again?', media: 'stock' },
      { seconds: 8, screen: 'Two clips making it worse: consequence, time lost, cost', speech: 'Every day it drags on, [consequence]. Fixing it yourself usually costs more.', media: 'stock' },
      { seconds: 14, screen: 'The company solving it: your photos or clip, clean result, team at work', speech: '[Company] fixes it in [turnaround], with [differentiator]. [Mechanism in one sentence].', media: 'client' },
      { seconds: 4, screen: 'Proof: number of jobs, rating, a customer photo', speech: '[N] homes in [city] already solved it this way.', media: 'client' },
      { seconds: 5, screen: 'Final card: logo + call to action + phone, WhatsApp or lead form', speech: 'Message us on WhatsApp now and book today.', media: 'card' },
    ],
    ctaExample: 'Book today on WhatsApp → [phone]',
    note: 'The pain may come from stock; the solution must be your real media.',
  },
  {
    id: 'depoimento_cartao',
    name: 'Testimonial cards',
    segment: 'any business with real reviews',
    goal: 'trust for a warm audience',
    seconds: 35,
    engine: 'fast',
    credits: 3,
    words: WORDS_35,
    inputs: { minPhotos: 3, video: 'optional', logo: 'required', extraFields: ['testimonials', 'rating'] },
    beats: [
      { seconds: 4, screen: 'Short customer quote as a large card over a result photo, with stars', speech: '"[Testimonial sentence, 8-12 words]"', media: 'client' },
      { seconds: 13, screen: 'Your photos or clip while the narration reads the full testimonial; stars in a corner', speech: 'The testimonial, two or three sentences, in the first person.', media: 'client' },
      { seconds: 11, screen: 'Second short quote with another customer or result photo', speech: '"[Second quote]" — [name], [neighborhood].', media: 'client' },
      { seconds: 7, screen: 'Final card: average rating + number of reviews + logo + call to action', speech: '[Rating] stars across [N] reviews. Be the next: [CTA].', media: 'card' },
    ],
    ctaExample: 'See why we are 4.9★ → book your visit',
    note: 'Only real testimonials, with a name. The script never invents a quote or a number.',
  },
  {
    id: 'antes_depois',
    name: 'Before → After',
    segment: 'salons, aesthetics, renovation, cleaning, real estate, fitness',
    goal: 'desire and conversion',
    seconds: 35,
    engine: 'fast',
    credits: 3,
    words: WORDS_35,
    inputs: { minPhotos: 4, video: 'optional', logo: 'required', extraFields: ['duration_of_service'] },
    beats: [
      { seconds: 4, screen: 'AFTER first (the beautiful result); card "This took [time]"', speech: 'This took [time].', media: 'client' },
      { seconds: 8, screen: 'Hard cut to the BEFORE with a small "before" card', speech: 'It started like this.', media: 'client' },
      { seconds: 14, screen: 'Two or three process photos or a clip, then the AFTER revealed slowly', speech: '[What was done, two sentences, no promised outcome].', media: 'client' },
      { seconds: 9, screen: 'Final card: logo + entry offer + call to action', speech: 'Want yours? [CTA].', media: 'card' },
    ],
    ctaExample: 'Book your transformation → link in bio · from [price]',
    note: 'Result first, then the before. For aesthetics and health: written permission from the person, no "cures" or "eliminates", 18+.',
  },
  {
    id: 'historia_fundador',
    name: 'Founder story',
    segment: 'any business with a person behind it',
    goal: 'top of funnel with trust',
    seconds: 60,
    engine: 'fast',
    credits: 5,
    words: WORDS_60,
    inputs: { minPhotos: 6, video: 'optional', logo: 'required', extraFields: ['origin_lines'] },
    beats: [
      { seconds: 5, screen: 'Founder photo at the place; card "I opened this because…"', speech: 'I opened [company] because [personal reason in one sentence].', media: 'client' },
      { seconds: 18, screen: 'Old photos, backstage, first day, the work, family', speech: 'The problem you saw, what the city was missing, the decision.', media: 'client' },
      { seconds: 22, screen: 'The business today: team, product, customers', speech: 'So we built… what you do differently, in plain words.', media: 'client' },
      { seconds: 9, screen: 'Proof: years, customers, rating', speech: '[N] years later, [N] customers.', media: 'client' },
      { seconds: 6, screen: 'Final card: founder + logo + soft call to action', speech: 'Come by. I will welcome you myself.', media: 'card' },
    ],
    ctaExample: 'Come meet us · [address]',
    note: 'Narrated by our voice on day one; your own cloned voice is coming next, not promised here.',
  },
  {
    id: 'tres_erros',
    name: 'Three mistakes',
    segment: 'clinics, law, accounting, consultants, trades',
    goal: 'authority and leads',
    seconds: 60,
    engine: 'fast',
    credits: 5,
    words: WORDS_60,
    inputs: { minPhotos: 2, video: 'optional', logo: 'required', extraFields: ['topic', 'three_mistakes'] },
    beats: [
      { seconds: 5, screen: 'Card "3 mistakes that cost you money with [topic]" over a strong image', speech: 'Three mistakes that make you lose money with [topic].', media: 'stock' },
      { seconds: 16, screen: 'Large "1." with an image of the mistake', speech: 'Mistake one: [mistake]. [Consequence in one sentence].', media: 'stock' },
      { seconds: 15, screen: 'Large "2." with an image', speech: 'Mistake two: [mistake]. [Consequence].', media: 'stock' },
      { seconds: 15, screen: 'Large "3."; the third pulls toward the service; your team or office photos', speech: 'Mistake three: trying to solve it alone. [What the specialist does].', media: 'client' },
      { seconds: 9, screen: 'Final card: name + credential + logo + call to action', speech: 'Send us a message and we review your case.', media: 'card' },
    ],
    ctaExample: 'We review your case, no strings → WhatsApp',
    note: 'Educational tone; the format that works for regulated professions. Each item under ten seconds.',
  },
  {
    id: 'contagem_prazo',
    name: 'Countdown / last seats',
    segment: 'events, courses, classes, launches',
    goal: 'urgency and last call',
    seconds: 35,
    engine: 'fast',
    credits: 3,
    words: WORDS_35,
    inputs: { minPhotos: 3, video: 'optional', logo: 'required', extraFields: ['deadline', 'seats'] },
    beats: [
      { seconds: 5, screen: 'Giant number ("3 days left" / "Last 12 seats") over an image of the event', speech: '[N] days left.', media: 'client' },
      { seconds: 16, screen: 'Three images of what the person gets; date and place fixed in a corner', speech: 'What happens, who it is for, why now.', media: 'client' },
      { seconds: 7, screen: 'Proof: "[N] already signed up" or a photo of the last edition', speech: '[N] people already secured their seat.', media: 'client' },
      { seconds: 7, screen: 'Final card: logo + date + price + call to action + link', speech: 'Secure yours before it is gone.', media: 'card' },
    ],
    ctaExample: 'Sign up by Friday → [link] · 12 seats left',
    note: 'Only real numbers of seats and deadlines. The "24 hours left" version is a second ad from the same brief.',
  },
]

export function adsModelById(id: string | null | undefined): AdsModel | null {
  if (!id) return null
  return ADS_MODELS.find((m) => m.id === id) ?? null
}

/** O modelo pode ser escolhido com o que a pessoa já subiu? Devolve o que falta (vazio = liberado). */
export function adsModelMissingInputs(model: AdsModel, have: { photos: number; videos: number; logo: boolean }): string[] {
  const missing: string[] = []
  if (!have.logo) missing.push('logo')
  if (have.photos < model.inputs.minPhotos) missing.push(`${model.inputs.minPhotos - have.photos} more photo(s)`)
  if (model.inputs.video === 'required' && have.videos < 1) missing.push('one video clip')
  return missing
}

/** Soma das batidas — o guardião prova que é igual a `seconds` em todos os modelos. */
export function adsModelBeatSeconds(model: AdsModel): number {
  return model.beats.reduce((acc, b) => acc + b.seconds, 0)
}
