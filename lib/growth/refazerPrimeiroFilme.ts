// KINEO-REFAZER-1O-FILME-3010 [vai do fundador 30/10 "D sim — limite de 1 por conta"] — 2 compradores foram embora depois de um
// 1º filme de Kling 4 ruim (o pedido não apareceu). Na tela do filme pronto, o 1º vídeo da conta ganha "Não ficou como pediu?
// Refazer grátis": a pessoa marca o defeito (vira caso rotulado para o revisor), recebe de volta EXATAMENTE os créditos que o
// vídeo custou (videos.credits_used, teto 40) e volta ao Studio com a ideia preenchida — onde o plano (C) aparece antes de gastar.
// 1 por conta: a chave primária de public.first_film_redos é a conta (clique duplo bate na PK, nunca credita duas vezes).

export const REFAZER_TETO_CREDITOS = 40
/** Filme grátis (credits_used = 0): devolve o preço de um filme curto, para a refação também sair. */
export const REFAZER_CREDITOS_FILME_GRATIS = 9
export const REFAZER_JANELA_HORAS = 72
export const REFAZER_DEFEITOS = ['ending', 'request', 'character', 'text', 'other'] as const
export type DefeitoDoRefazer = typeof REFAZER_DEFEITOS[number]
export const REFAZER_EVENTOS = { shown: 'first_film_redo_shown', granted: 'first_film_redo_granted', refused: 'first_film_redo_refused' } as const

export interface VideoDoRefazer { id: string; user_id: string; status: string | null; credits_used: number | null; created_at: string; prompt: string | null; topic: string | null; quality_mode: string | null }

/** Os créditos devolvidos: o que o vídeo custou (teto 40); filme grátis devolve o preço de um filme curto. */
export function creditosDoRefazer(creditsUsed: number | null | undefined): number {
  const c = Math.floor(Number(creditsUsed ?? 0))
  if (!Number.isFinite(c) || c <= 0) return REFAZER_CREDITOS_FILME_GRATIS
  return Math.min(c, REFAZER_TETO_CREDITOS)
}

export type MotivoDoRefazer = 'ok' | 'not_found' | 'not_owner' | 'not_completed' | 'not_first_video' | 'too_old' | 'already_used'

/** A regra de quem pode refazer (pura): dono, vídeo pronto, 1º vídeo pronto da conta, até 72 h, nunca refez antes. */
export function podeRefazer(args: { video: VideoDoRefazer | null; userId: string; videosAntes: number; jaRefez: boolean; agora: number }): MotivoDoRefazer {
  const v = args.video
  if (!v) return 'not_found'
  if (v.user_id !== args.userId) return 'not_owner'
  if (v.status !== 'completed') return 'not_completed'
  if (args.jaRefez) return 'already_used'
  if (args.videosAntes > 0) return 'not_first_video'
  if (args.agora - Date.parse(v.created_at) > REFAZER_JANELA_HORAS * 3600_000) return 'too_old'
  return 'ok'
}

/** A ideia original para o Studio: o prompt da pessoa; "[Idea: …]" do escritor do servidor vira só a ideia. */
export function ideiaDoVideo(v: Pick<VideoDoRefazer, 'prompt' | 'topic'>): string {
  const bruto = String(v.prompt ?? '').trim() || String(v.topic ?? '').trim()
  const m = bruto.match(/^\[Idea:\s*([\s\S]*?)\]\s*(?:\n|$)/)
  return (m ? m[1] : bruto).trim().slice(0, 4000)
}

/** Para onde a pessoa volta: Filme no Studio (com a ideia) ou o Clipe, conforme o vídeo. */
export function hrefDoRefazer(v: Pick<VideoDoRefazer, 'prompt' | 'topic' | 'quality_mode'>): string {
  const ideia = ideiaDoVideo(v)
  if (v.quality_mode === 'clip') return `/clips?${new URLSearchParams({ prompt: ideia.slice(0, 1000), from: 'first_film_redo' }).toString()}`
  return `/studio?${new URLSearchParams({ prompt: ideia, intent_campaign: 'first_film_redo' }).toString()}`
}

export const REFAZER_COPY = {
  en: { title: 'Not what you asked for?', body: 'Your first video can be redone from scratch once, for free. Tell us what went wrong — the credits come back and you adjust your idea before making it again.', go: 'Redo for free', done: 'Credits returned — opening your idea…', defects: { ending: 'The ending I asked for is missing', request: "It didn't show what I asked for", character: 'The character changed between scenes', text: 'Strange letters on screen', other: 'Something else' } },
  pt: { title: 'Não ficou como você pediu?', body: 'Seu primeiro vídeo pode ser refeito do zero uma vez, de graça. Diga o que deu errado — os créditos voltam e você ajusta a ideia antes de gerar de novo.', go: 'Refazer grátis', done: 'Créditos devolvidos — abrindo sua ideia…', defects: { ending: 'O final que pedi não apareceu', request: 'Não mostrou o que eu pedi', character: 'O personagem mudou entre as cenas', text: 'Letras estranhas na tela', other: 'Outra coisa' } },
  es: { title: '¿No quedó como pediste?', body: 'Tu primer video se puede rehacer desde cero una vez, gratis. Cuéntanos qué salió mal: los créditos vuelven y ajustas tu idea antes de crearlo de nuevo.', go: 'Rehacer gratis', done: 'Créditos devueltos — abriendo tu idea…', defects: { ending: 'Falta el final que pedí', request: 'No mostró lo que pedí', character: 'El personaje cambió entre escenas', text: 'Letras raras en pantalla', other: 'Otra cosa' } },
} as const
export function refazerCopy(language: string | null | undefined) {
  const l = String(language ?? '').slice(0, 2).toLowerCase()
  return l === 'pt' ? REFAZER_COPY.pt : l === 'es' ? REFAZER_COPY.es : REFAZER_COPY.en
}
