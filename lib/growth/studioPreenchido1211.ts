// ═══ KINEO-STUDIO-PREENCHIDO-1211 — o Studio chega PREENCHIDO com o tema da página por onde a pessoa entrou ═══════════════
//
// PEDIDO (CEO 11/11 23:05, ordem do dono "melhorar o fluxo de pessoas que entram"). Base: docs/CHATGPT-ENTRADA-ONDE-PARA-2026-11-12.md
// — dos cadastros vindos do ChatGPT sem filme, 33% param DENTRO do Studio (18% abrem e não digitam; 15% digitam e não geram).
//
// O QUE O BANCO MOSTROU (30 dias, cadastros externos, página de entrada = landing_session_started do mesmo session_id):
//   · A ideia NÃO se perde no login: quem cadastra com ?prompt= chega ao Studio com ela (studio_idea_arrived_v1) em ~100%.
//   · Ela nunca EXISTIU para quem entra por botão genérico: / (home) 165 de 201 sem ideia; /ai-video-generator/seedance 52 de 53;
//     /text-to-video-shorts 36 de 88. O destino desses cadastros é "/" ou "/studio" sem prompt — o Studio abre vazio.
//
// A CURA: na 1ª chegada ao Studio de uma conta nova (≤ 24 h, nenhum filme pronto) SEM ideia na URL, o servidor acha a página de
// entrada da conta (o pouso do mesmo session_id) e devolve a ideia-exemplo DA PRÓPRIA PÁGINA, no idioma dela. O Studio só a
// ESCREVE na caixa (editável). NADA COMEÇA SOZINHO: não gera, não analisa, não debita. O botão com preço continua o consentimento.
// Fonte das frases (nada inventado aqui): o `examplePrompt` das páginas de intenção (lib/seo/intentPages.ts) e a 1ª ideia da lista
// de cada nicho de /free-ai-shorts (copiada literal de app/free-ai-shorts/[niche]/page.tsx; o guardião confere que segue lá).
// Interruptor: KINEO_STUDIO_PREENCHIDO_1211 = 'off' devolve o Studio vazio de antes (a rota responde sem ideia).
import { getIntentPage } from '@/lib/seo/intentPages'

export const KINEO_STUDIO_PREENCHIDO_1211 = 'on' as 'on' | 'off'
export const STUDIO_PREENCHIDO_VERSION = 'studio_preenchido_1211'
/** Impressão: a 1ª chegada da conta nova ao Studio (página de entrada, se já tinha ideia, se foi preenchida). */
export const STUDIO_PREFILL_EVENT = 'studio_prefilled_from_page'
/** O clique em gerar com a ideia que veio da página (editada ou não). */
export const STUDIO_PREFILL_GENERATED_EVENT = 'studio_prefilled_generated'
/** Janela da conta nova: depois disso o Studio volta a abrir vazio para ela. */
export const STUDIO_PREFILL_WINDOW_MS = 24 * 60 * 60 * 1000
/** Marca do navegador: preenche uma vez só por aparelho (apagar a frase e recarregar não a traz de volta). */
export const STUDIO_PREFILL_DONE_KEY = 'kineo_studio_prefill_done_1211'

/** 1ª ideia da lista de cada nicho de /free-ai-shorts/[niche] (literal da página; o guardião confere). */
export const NICHE_FIRST_IDEA: Readonly<Record<string, string>> = {
  money: "$200 a month makes you a millionaire — here’s the exact math",
  faith: "The verse for anyone who is tired of pretending they are fine",
  mystery: "The disappearance nobody solved in 70 years",
  history: "Why ancient Rome collapsed in 5 steps",
  motivation: "The 5am habit that rewires your brain",
  facts: "The everyday object that’s secretly 1,000 years old",
  ai: "The AI tool replacing 10 jobs right now",
  geography: "The country where it’s illegal to die",
  space: "What NASA found on Mars they never announced",
  truecrime: "The cold case solved by a single typo",
  psychology: "Say this one sentence and people instantly trust you",
  sports: "The shot that ended a career in one second",
  science: "There’s enough gold in the ocean to make everyone rich — here’s the catch",
  conspiracy: "The “accident” that destroyed the evidence days before the trial",
  luxury: "What a $500 million yacht actually costs to run per day",
  stoicism: "The Stoic rule that kills anxiety in 10 seconds",
  crypto: "The $100 Bitcoin bet that turned into a fortune",
  business: "The business that made millions with almost no employees",
  fitness: "The 20-minute habit that changes your body in 30 days",
  relationships: "The one text that instantly changes how they see you",
  horror: "The 3am rule you should never break",
  celebrity: "The star who went from broke to a billion dollars",
  animals: "The animal that can survive being frozen solid",
  health: "The 30-second habit that adds years to your life",
  cars: "The $3 million car only 10 people can buy",
  gaming: "The game that was never supposed to exist",
  movies: "The movie scene that was completely unscripted",
  food: "The food that never actually expires",
  travel: "The place tourists are banned from entering",
  localbusiness: "The one question every customer asks before booking us — answered in 30 seconds",
}

/** Página de entrada sem frase própria → a página de intenção do MESMO tema cuja frase-exemplo ela usa. */
const PAGINA_PARA_INTENCAO: Readonly<Record<string, string>> = {
  '/': 'youtube-shorts', // home: o Short narrado do topo (a home é de outro dono e não é tocada)
  '/text-to-video-shorts': 'text-to-video',
  '/free-ai-shorts-generator': 'youtube-shorts',
  '/gerador-de-shorts-gratis': 'portuguese',
  '/ai-video-generator': 'youtube-shorts',
  '/ai-video-generator/seedance': 'text-to-video',
  '/ai-video-generator/kling-4': 'text-to-video',
  '/ai-video-generator/seedance-2-5': 'text-to-video',
}

/** Páginas que levam a OUTRO produto (anúncio, desenho) ou não são de entrada: nunca preenchem o Studio de filme. */
const NUNCA: readonly string[] = ['/ai-ugc-ads', '/ai-kids-cartoon-videos', '/pricing', '/login', '/signup', '/studio', '/partners', '/agencies', '/affiliate']

/** Código de língua de /free-shorts-generator/[lang] → a página de intenção da mesma língua. */
const LINGUA_PARA_INTENCAO: Readonly<Record<string, string>> = {
  es: 'spanish', pt: 'portuguese', hi: 'hindi', fr: 'french', de: 'german', it: 'italian', ar: 'arabic', id: 'indonesian', tr: 'turkish',
  ur: 'urdu', uk: 'ukrainian', vi: 'vietnamese', ru: 'russian', pl: 'polish', nl: 'dutch',
}

export type IdeiaDaPagina = { idea: string; language: string | null; source: 'intent' | 'niche' }

/** Normaliza o caminho do pouso (sem query, sem barra no fim, minúsculo). */
export function normalizarPagina(path: unknown): string | null {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null
  const p = path.split('?')[0].split('#')[0].toLowerCase().replace(/\/+$/u, '')
  return p === '' ? '/' : p
}

function daIntencao(slug: string | undefined): IdeiaDaPagina | null {
  if (!slug) return null
  const page = getIntentPage(slug)
  const idea = typeof page?.examplePrompt === 'string' ? page.examplePrompt.trim() : ''
  if (!idea) return null
  return { idea, language: typeof page?.language === 'string' ? page.language : null, source: 'intent' }
}

/** A ideia-exemplo da página de entrada, ou null (página sem tema de filme, de outro produto, ou desconhecida). */
export function ideiaDaPagina(path: unknown): IdeiaDaPagina | null {
  const p = normalizarPagina(path)
  if (!p || NUNCA.some((n) => p === n || p.startsWith(`${n}/`))) return null
  const intent = /^\/ai-video-generator\/for\/([a-z0-9-]+)$/u.exec(p)
  if (intent) return daIntencao(intent[1])
  const niche = /^\/free-ai-shorts\/([a-z0-9-]+)$/u.exec(p)
  if (niche) {
    const idea = NICHE_FIRST_IDEA[niche[1]]
    return idea ? { idea, language: null, source: 'niche' } : null
  }
  const lang = /^\/free-shorts-generator\/([a-z]{2})$/u.exec(p)
  if (lang) return daIntencao(LINGUA_PARA_INTENCAO[lang[1]])
  return daIntencao(PAGINA_PARA_INTENCAO[p])
}

/** O servidor só preenche para conta nova (≤ 24 h), sem filme pronto, com o interruptor ligado. */
export function contaRecebePreenchimento(input: { chave?: 'on' | 'off'; accountCreatedAt: string | null | undefined; completedFilms: number | null; nowMs: number }): boolean {
  if ((input.chave ?? KINEO_STUDIO_PREENCHIDO_1211) !== 'on') return false
  if (input.completedFilms !== 0) return false
  const t = Date.parse(String(input.accountCreatedAt ?? ''))
  return Number.isFinite(t) && input.nowMs - t >= 0 && input.nowMs - t <= STUDIO_PREFILL_WINDOW_MS
}

/** Chegada ao Studio que pode receber a ideia: sem ideia na URL e sem nenhum fluxo que já traga texto ou série. */
export function chegadaSemIdeia(sp: URLSearchParams): boolean {
  if ((sp.get('prompt') ?? '').trim()) return false
  return !['film60', 'studio_continuation', 'series', 'continuation_source', 'chatgpt_quickstart', 'generationId', 'resume'].some((k) => sp.has(k))
}
