// KINEO-RESUME-1DOLAR-FIEL-2026-09-09 — o rascunho que atravessa o Stripe.
//
// O PROBLEMA QUE ISTO RESOLVE. Na versão B a pessoa escreve a ideia, escolhe o
// MOTOR e a duração, aperta Generate, bate na cota zero, vê a porta de $1, paga,
// e volta para `/studio/create?resume=card_entry`, onde o filme dispara sozinho.
// O rascunho que atravessava essa viagem guardava `prompt`, `quality` e
// `duration` — e NÃO guardava `mode` nem `aiEngine`, que são as duas variáveis
// que de fato escolhem o motor. Na volta, `mode` renascia no padrão de fábrica
// (`'fast'`). Ou seja: quem escolheu um motor cinematográfico, pagou por ele e
// voltou, recebia um filme do Kineo 1 — sem aviso, sem escolha, sem erro na
// tela. O primeiro minuto pago da casa entregava outro produto.
//
// Havia um segundo furo no mesmo lugar: a validação do `quality` restaurado era
// feita contra `QUALITY_OPTIONS`, uma lista LEGADA de três entradas
// (`basic`/`basic_ai`/`pro`). Os dois valores que o produto realmente usa hoje —
// `'fast'` e `'cinematic_ai'` — não estão nela, então o `quality` do rascunho
// era silenciosamente RECUSADO em todos os casos vivos. A validação passa a
// falar da união do tipo `Quality`, que é a verdade.
//
// POR QUE A CHAVE CONTINUA `_v1`. Existe gente com um rascunho gravado pelo
// bundle que está no ar AGORA, possivelmente dentro do Stripe neste minuto.
// Trocar a chave por `_v2` órfãaria esse rascunho justamente na volta do
// pagamento. Os campos novos são ADITIVOS: rascunho velho devolve `mode: null` e
// `engine: null`, e quem lê trata nulo como "não mexa no que já está na tela".

export const CARD_ENTRY_DRAFT_KEY = 'kineo_studio_draft_v1'
export const CARD_ENTRY_DRAFT_TTL_MS = 45 * 60 * 1000

export type DraftQuality = 'fast' | 'basic' | 'basic_ai' | 'pro' | 'cinematic_ai'
export type DraftMode = 'fast' | 'cinematic_ai' | 'cinematic' | 'creator'
export type DraftEngine =
  | 'seedance' | 'kling' | 'veo' | 'sora' | 'hollywood' | 'h3' | 'omni' | 's25'

// Espelham as uniões `Quality` / `GenerationMode` / o estado `aiEngine` do
// GenerateClient. São listas em valor porque `typeof` não sobrevive ao runtime:
// o rascunho vem do sessionStorage, que é `unknown` até ser conferido.
const DRAFT_QUALITIES: readonly DraftQuality[] = ['fast', 'basic', 'basic_ai', 'pro', 'cinematic_ai']
const DRAFT_MODES: readonly DraftMode[] = ['fast', 'cinematic_ai', 'cinematic', 'creator']
const DRAFT_ENGINES: readonly DraftEngine[] = ['seedance', 'kling', 'veo', 'sora', 'hollywood', 'h3', 'omni', 's25']
const DRAFT_DURATIONS: readonly number[] = [35, 45, 60, 90]

export interface CardEntryDraft {
  prompt: string
  quality: DraftQuality | null
  duration: number | null
  mode: DraftMode | null
  engine: DraftEngine | null
  /** `at` dentro da janela de TTL. Fora dela o rascunho é lido, mas não arma o disparo. */
  fresh: boolean
}

export function serializeCardEntryDraft(input: {
  prompt: string
  quality: string
  duration: number
  mode: string
  engine: string
  at: number
}): string {
  return JSON.stringify({
    prompt: input.prompt,
    quality: input.quality,
    duration: input.duration,
    mode: input.mode,
    engine: input.engine,
    at: input.at,
  })
}

/**
 * Lê o rascunho gravado antes da viagem ao Stripe. Devolve `null` quando não há
 * nada utilizável (sem chave, JSON quebrado, prompt vazio) — nunca lança, porque
 * o chamador roda na volta de um pagamento e um throw ali é uma tela morta com
 * dinheiro já cobrado.
 */
export function readCardEntryDraft(raw: string | null, now: number): CardEntryDraft | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const draft = parsed as Record<string, unknown>

  const prompt = typeof draft.prompt === 'string' ? draft.prompt.trim() : ''
  if (!prompt) return null

  const quality = typeof draft.quality === 'string' && (DRAFT_QUALITIES as readonly string[]).includes(draft.quality)
    ? (draft.quality as DraftQuality)
    : null
  const duration = typeof draft.duration === 'number' && DRAFT_DURATIONS.includes(draft.duration)
    ? draft.duration
    : null
  const mode = typeof draft.mode === 'string' && (DRAFT_MODES as readonly string[]).includes(draft.mode)
    ? (draft.mode as DraftMode)
    : null
  const engine = typeof draft.engine === 'string' && (DRAFT_ENGINES as readonly string[]).includes(draft.engine)
    ? (draft.engine as DraftEngine)
    : null
  const fresh = typeof draft.at === 'number' && now - draft.at < CARD_ENTRY_DRAFT_TTL_MS

  return { prompt, quality, duration, mode, engine, fresh }
}
