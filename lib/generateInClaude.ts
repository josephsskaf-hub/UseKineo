// ═══ KINEO-NO-CLAUDE-0911 [fundador 09/11: "também quero isso: generate in Claude, with Kineo AI" + regra "copiar 90%"] ═══
//
// Fonte ÚNICA da página /kineo-in-claude: o molde da página MCP da Higgsfield (abas por assistente → herói "GENERATE …
// IN CLAUDE WITH …" → "Add … in Claude" + "How to connect?" → galeria do que dá para pedir, cada cartão com prévia, título,
// uma linha e o pedido exato para copiar → passos numerados → FAQ), com os NOSSOS fatos.
//
// A página é do conector Kineo Studio (/api/mcp/studio: OAuth na conta Kineo, filme feito na conta, créditos da conta).
// NÃO é a do conector do diretório (/api/mcp, só roteiro e fatos): esse continua documentado em /claude-connector, que é a
// URL que o Connectors Directory do Claude revisa — por isso o herói "generate videos" mora numa rota própria.
//
// Verdade do código (lib/mcp/studioMcp.ts, hoje): kineo_create_video aceita format ∈ STUDIO_FORMATS, mas SÓ 'film' produz;
// product_ad, ugc_ad e kids_cartoon devolvem um link do Studio sem cobrar. Então todo cartão "você pode pedir" é um filme
// narrado (format 'film'), variando o que a ferramenta aceita de verdade: duração, quadro, língua, ideia × roteiro próprio.
// Sem nome de motor nos cartões (o fundador está tirando motor da cara do produto); preço nunca digitado — a página calcula
// "a partir de N créditos" de engineCatalog(). Prévia = filme narrado que o site JÁ serve (public/previews), mudo, leve.
//
// Guardião: scripts/test-kineo-no-claude-0911.mjs.

// Não /generate-…: componentes globais tratam todo caminho que começa com '/generate' como a tela de gerar (ActiveRenderPill,
// ReferralPromoBanner, SocialProofToast, affiliateFirstClick).
export const GENERATE_IN_CLAUDE_PATH = '/kineo-in-claude'
export const GENERATE_IN_CLAUDE_MARK = 'KINEO-NO-CLAUDE-0911'
/** Âncora dos passos numerados (o botão "How to connect?" rola até aqui). */
export const GENERATE_IN_CLAUDE_STEPS_ANCHOR = 'how-to-connect'

/** As abas: só onde o conector Kineo Studio foi testado (Claude em 20/10, job fa216362; ChatGPT em 20/10, job 6ce0763f). */
export const GENERATE_IN_CLAUDE_TABS = [
  { key: 'claude', name: 'Claude' },
  { key: 'chatgpt', name: 'ChatGPT' },
] as const
export type AssistantTab = (typeof GENERATE_IN_CLAUDE_TABS)[number]['key']

/** ?tab=chatgpt (molde da Higgsfield: /mcp?tab=claude) escolhe a aba; qualquer outro valor fica no Claude. */
export function assistantTabFrom(raw: string | null | undefined): AssistantTab | null {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === 'chatgpt' || v === 'claude' ? v : null
}

/** O herói no padrão deles, trocando só o nome do assistente. */
export function heroTitle(tab: AssistantTab): string {
  return `Generate videos in ${tab === 'chatgpt' ? 'ChatGPT' : 'Claude'} with Kineo`
}

/** O que a ferramenta aceita de fato (espelha os enums de kineo_create_video; o guardião confere contra lib/mcp/studioMcp.ts). */
export type AskFormat = 'film'
export type AskAspect = '9:16' | '16:9' | '1:1' | '4:5'
export type AskCard = {
  id: string
  /** O formato que o pedido gera em kineo_create_video. */
  format: AskFormat
  /** O que a pessoa recebe, sem motor. */
  kind: string
  title: string
  line: string
  duration: 15 | 35 | 60 | 90
  aspect: AskAspect
  /** Código de língua da narração (NARRATION_LANGUAGE_CODES). */
  language: string
  /** idea = a Kineo escreve a narração; script = a narração da pessoa, palavra por palavra. */
  mode: 'idea' | 'script'
  /** Prévia: filme narrado que o site já serve em public/ (mudo, em loop). */
  clip: { src: string; poster: string }
  /** A frase exata para digitar no Claude/ChatGPT. */
  prompt: string
}

const film = (name: string) => ({ src: `/previews/${name}.mp4`, poster: `/posters/${name}.webp` })

export const ASK_CARDS: readonly AskCard[] = [
  {
    id: 'mystery',
    format: 'film',
    kind: 'Narrated film',
    title: 'A mystery from history',
    line: 'One true story, told with a hook and an ending, as a vertical Short.',
    duration: 60,
    aspect: '9:16',
    language: 'en',
    mode: 'idea',
    clip: film('door-970d03e6-9b87-403f-bef7-810db80ba8ce'),
    prompt: 'Using Kineo Studio, make a 60-second narrated vertical film about the three lighthouse keepers who vanished from the Flannan Isles in 1900.',
  },
  {
    id: 'history',
    format: 'film',
    kind: 'Narrated film',
    title: 'One day in history',
    line: 'A single moment from the past, narrated scene by scene.',
    duration: 35,
    aspect: '9:16',
    language: 'en',
    mode: 'idea',
    clip: film('home-card-novo-film_pompeii'),
    prompt: 'Using Kineo Studio, make a 35-second narrated vertical film about the last morning in Pompeii before Vesuvius erupted.',
  },
  {
    id: 'nature',
    format: 'film',
    kind: 'Narrated film',
    title: 'The power of nature',
    line: 'A real natural event explained in under a minute.',
    duration: 35,
    aspect: '9:16',
    language: 'en',
    mode: 'idea',
    clip: film('door-83db8b63-b654-491e-a0aa-86ce1bc1f3d7'),
    prompt: 'Using Kineo Studio, make a 35-second narrated vertical film about the 1958 megatsunami in Lituya Bay, Alaska.',
  },
  {
    id: 'scifi',
    format: 'film',
    kind: 'Narrated film',
    title: 'A short sci-fi story',
    line: 'An invented story with a twist at the end.',
    duration: 60,
    aspect: '9:16',
    language: 'en',
    mode: 'idea',
    clip: film('home-card-novo-film_mars_door'),
    prompt: 'Using Kineo Studio, make a 60-second narrated vertical film: a short sci-fi story about an astronaut who finds a door on Mars.',
  },
  {
    id: 'script',
    format: 'film',
    kind: 'Narrated film',
    title: 'Your script, word for word',
    line: 'Paste your own narration; Kineo reads it exactly as written.',
    duration: 60,
    aspect: '9:16',
    language: 'en',
    mode: 'script',
    clip: film('home-card-novo-film_shipwreck'),
    prompt: 'Using Kineo Studio, make a 60-second narrated vertical film and read my script word for word: [paste your script here]',
  },
  {
    id: 'spooky',
    format: 'film',
    kind: 'Narrated film',
    title: 'A spooky story',
    line: 'A campfire-style tale that ends on a cliffhanger.',
    duration: 35,
    aspect: '9:16',
    language: 'en',
    mode: 'idea',
    clip: film('galeria/werewolf'),
    prompt: 'Using Kineo Studio, make a 35-second narrated vertical film: a spooky story about what a village hears in the woods on a full-moon night.',
  },
  {
    id: 'spanish',
    format: 'film',
    kind: 'Narrated film',
    title: 'Narrated in another language',
    line: 'Ask in English, get the narration in Spanish (or Portuguese, French, German…).',
    duration: 35,
    aspect: '9:16',
    language: 'es',
    mode: 'idea',
    clip: film('door-dabfdca7-33a1-4de3-b2b4-050333b8a21c'),
    prompt: 'Using Kineo Studio, make a 35-second narrated vertical film in Spanish about a sailboat caught in a storm off the coast.',
  },
  {
    id: 'widescreen',
    format: 'film',
    kind: 'Narrated film',
    title: 'Widescreen for YouTube',
    line: 'The same kind of film in 16:9 and up to 90 seconds.',
    duration: 90,
    aspect: '16:9',
    language: 'en',
    mode: 'idea',
    clip: film('door-07252598-1392-4226-b5d5-d02bd892d69b'),
    prompt: 'Using Kineo Studio, make a 90-second narrated widescreen (16:9) film about the robots that explore the deepest parts of the ocean.',
  },
]

/** Formatos que o conector recebe mas ainda NÃO produz: a página diz isso numa linha, nunca num cartão. */
export const STUDIO_ONLY_FORMATS_LINE =
  'Product ads, UGC ads and cartoon episodes are made in Kineo Studio on the website. If you ask for one in the chat, the connector answers with a Studio link and charges nothing.'

/** Nome da língua da narração, para o selo do cartão (só as que os cartões usam; inglês não ganha selo). */
export const ASK_LANGUAGE_NAMES: Readonly<Record<string, string>> = { es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German' }

/** O modelo com que a pessoa conversa no Claude hoje (o fundador autorizou nomear; nada de parceria). */
