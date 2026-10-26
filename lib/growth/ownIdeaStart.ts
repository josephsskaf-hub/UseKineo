import { HOME_CARD_ADS_ENTRY } from '@/lib/ui/homeThreeCards'
import { adsSampleEntryOf } from '@/lib/ads/sampleEntry'
import { EXAMPLES_SELECTION_SEP24 } from '@/lib/ui/examplesSelectionSep24'
import { FOUNDER_SHOWCASE } from '@/lib/publicExamples'

export type OwnIdeaGoal = 'channel' | 'story'
export type OwnIdeaReference = 'sea' | 'space'
export type OwnIdeaContext = { mode: string; arrivalProtected: boolean }

// Only the existing Ads entry is carried. No product URL is read/imported and
// no Shopify auto-import parameter or generation intent is added.
export function ownIdeaAdsHref(): string {
  const entry = adsSampleEntryOf(HOME_CARD_ADS_ENTRY.product_ads)
  return entry ? `/ads/v2?entry=${entry}` : '/ads/v2'
}

/** Protect arrival text before Studio's hydration effects have populated it. */
export function ownIdeaArrivalProtected(search: string): boolean {
  const params = new URLSearchParams(search)
  if (['verbatim', 'clip'].includes(params.get('script_mode') ?? '')) return true
  if (['prompt', 'topic', 'chatgpt_quickstart', 'film60', 'studio_continuation', 'resume'].some(key => Boolean(params.get(key)))) return true
  return ['from', 'source', 'utm_source', 'intent_campaign'].some(key => /chatgpt|assistant|gpt/i.test(params.get(key) ?? ''))
}

export function ownIdeaAvailable(context: OwnIdeaContext): boolean {
  return context.mode === 'ai' && !context.arrivalProtected
}

const lighthouse = EXAMPLES_SELECTION_SEP24.find(video => video.id === 'b5434412-62b9-48f5-9a10-c36e2e725c9f')
const space = FOUNDER_SHOWCASE.find(video => video.id === 'fe055601-0668-4d33-be49-82c1cb033779')

// Explicit public, founder-owned catalogue entries, not customer media. These
// images suggest a direction; the starter text is not their original prompt.
export const OWN_IDEA_REFERENCES = [
  ...(lighthouse?.posterUrl ? [{ key: 'sea' as const, poster: lighthouse.posterUrl, position: lighthouse.focalPoint ?? '50% 50%' }] : []),
  ...(space?.posterPath ? [{ key: 'space' as const, poster: space.posterPath, position: '50% 50%' }] : []),
] as const

const EN = {
  title: 'What are you making?', channel: 'A Short for my channel', story: 'A story', product: 'A product ad',
  references: 'Need a direction? Optional references',
  disclosure: 'Visual references from Kineo. Your creation will be different.',
  preserved: 'Your text stays as it is. Edit it below to make it yours.',
  review: 'Review my idea', empty: 'Write your idea below, then review the settings before generating.',
  seaAlt: 'Kineo visual reference: a lighthouse', spaceAlt: 'Kineo visual reference: space',
  channelSea: 'A mystery explained', channelSpace: 'A surprising discovery', storySea: 'A mystery at sea', storySpace: 'An adventure far from home',
  channelSeaHint: 'Start with a question', channelSpaceHint: 'Start with a fact to check', storySeaHint: 'Build your own story', storySpaceHint: 'Build your own character',
  channelSeaText: 'Explain how lighthouses guide ships through a storm.',
  channelSpaceText: 'Explain one surprising discovery about space, using facts I can verify.',
  storySeaText: 'A fisherman discovers why an old lighthouse never goes dark.',
  storySpaceText: 'An astronaut finds a garden on an abandoned space station.',
}
type OwnIdeaCopy = { [K in keyof typeof EN]: string }
const COPY: Record<string, OwnIdeaCopy> = {
  en: EN,
  pt: {
    title: 'O que você quer criar?', channel: 'Um Short para meu canal', story: 'Uma história', product: 'Um anúncio de produto',
    references: 'Precisa de uma direção? Referências opcionais', disclosure: 'Referências visuais da Kineo. Sua criação será diferente.',
    preserved: 'Seu texto continua como está. Edite abaixo para deixá-lo do seu jeito.', review: 'Revisar minha ideia', empty: 'Escreva sua ideia abaixo e confira as configurações antes de gerar.',
    seaAlt: 'Referência visual da Kineo: um farol', spaceAlt: 'Referência visual da Kineo: espaço',
    channelSea: 'Um mistério explicado', channelSpace: 'Uma descoberta surpreendente', storySea: 'Um mistério no mar', storySpace: 'Uma aventura longe de casa',
    channelSeaHint: 'Comece com uma pergunta', channelSpaceHint: 'Comece com um fato a conferir', storySeaHint: 'Crie sua própria história', storySpaceHint: 'Crie seu próprio personagem',
    channelSeaText: 'Explique como os faróis guiam os navios durante uma tempestade.', channelSpaceText: 'Explique uma descoberta surpreendente sobre o espaço, usando fatos que eu possa verificar.',
    storySeaText: 'Um pescador descobre por que um velho farol nunca se apaga.', storySpaceText: 'Uma astronauta encontra um jardim em uma estação espacial abandonada.',
  },
  es: {
    title: '¿Qué quieres crear?', channel: 'Un Short para mi canal', story: 'Una historia', product: 'Un anuncio de producto',
    references: '¿Necesitas una dirección? Referencias opcionales', disclosure: 'Referencias visuales de Kineo. Tu creación será diferente.',
    preserved: 'Tu texto sigue igual. Edítalo abajo para hacerlo tuyo.', review: 'Revisar mi idea', empty: 'Escribe tu idea abajo y revisa los ajustes antes de generar.',
    seaAlt: 'Referencia visual de Kineo: un faro', spaceAlt: 'Referencia visual de Kineo: el espacio',
    channelSea: 'Un misterio explicado', channelSpace: 'Un descubrimiento sorprendente', storySea: 'Un misterio en el mar', storySpace: 'Una aventura lejos de casa',
    channelSeaHint: 'Empieza con una pregunta', channelSpaceHint: 'Empieza con un hecho por comprobar', storySeaHint: 'Crea tu propia historia', storySpaceHint: 'Crea tu propio personaje',
    channelSeaText: 'Explica cómo los faros guían a los barcos durante una tormenta.', channelSpaceText: 'Explica un descubrimiento sorprendente sobre el espacio usando hechos que pueda verificar.',
    storySeaText: 'Un pescador descubre por qué un viejo faro nunca se apaga.', storySpaceText: 'Una astronauta encuentra un jardín en una estación espacial abandonada.',
  },
}
export function ownIdeaCopy(language: string): OwnIdeaCopy { return COPY[language] ?? EN }
export function ownIdeaCopyLanguage(language: string): string { return language in COPY ? language : 'en' }

/** Called inside Studio's functional setter: stale clicks cannot erase a draft. */
export function applyOwnIdeaStarter(current: string, context: OwnIdeaContext, goal: OwnIdeaGoal, reference: OwnIdeaReference, language: string): string {
  if (!ownIdeaAvailable(context) || current.trim() || !['channel', 'story'].includes(goal) || !OWN_IDEA_REFERENCES.some(item => item.key === reference)) return current
  const copy = ownIdeaCopy(language)
  return goal === 'story'
    ? reference === 'sea' ? copy.storySeaText : copy.storySpaceText
    : reference === 'sea' ? copy.channelSeaText : copy.channelSpaceText
}
