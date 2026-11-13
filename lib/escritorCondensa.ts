// KINEO-ESCRITOR-CONDENSA-1311 [dono 13/11 ~20:10: "quero saber porque todo cliente que falha… e já ter uma solução"; item B da CEO] — a recusa FALSA
// do escritor no filme curto. Caso de 13/11 22:59Z (conta nova da França): briefing colado de 447 palavras ("episódio 1, 90 segundos, seções em
// markdown") para um filme de 15 s no Kling 4 grátis; o escritor respondeu "I'm sorry, I can't assist with that request" na 1ª chamada e na
// 2ª (o resgate de hoje) — a pessoa viu "the AI declined the topic". Dois minutos depois, o MESMO texto embrulhado em "Condense this whole
// story…" (o caminho do servidor, lib/meta95/ideiaNoEscritor temaParaOEscritor) virou roteiro. Ensaio offline de 13/11 (gpt-4o, as instruções
// reais do escritor, US$ 0,32): com a faixa do Kling 4 grátis, o briefing é recusado na 1ª e na 2ª e ACEITO na 3ª ("condensar"); 6 briefings
// longos reais de 14 dias seguem aceitos; 3 proibidos param na moderação antes do escritor (a 3ª tentativa só corre com a moderação aprovando).
// Recusas medidas em 14 dias: 8 (5 pessoas), todas em filme de 15 s com texto colado de produção.
import { temaParaOEscritor } from '@/lib/meta95/ideiaNoEscritor'

export const ESCRITOR_CONDENSA_EVENT = 'script_condense_retry' as const
/** Folga para o resto da rota (fecho do filme curto, eventos) depois da 3ª chamada, dentro do maxDuration de 60 s. */
export const FOLGA_DEPOIS_MS = 5_000
/** Abaixo disso a 3ª chamada não tem tempo de escrever um roteiro: não tenta (a recusa de hoje segue). */
export const PRAZO_MINIMO_MS = 15_000

/** O tema da 3ª tentativa: o mesmo embrulho "Condense this whole story…" do caminho do servidor; texto curto ganha o embrulho sem teto. */
export function temaCondensado(a: { topic: string; seconds: number; engine?: string | null; language?: string | null }): string {
  const t = temaParaOEscritor({ ideia: a.topic, seconds: a.seconds, engine: a.engine ?? null, language: a.language ?? null })
  if (t.condensada) return t.tema
  const sem = String(a.topic ?? '').replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim()
  return `Condense this whole story into a ${a.seconds}-second film — keep its beginning, its key facts and its ending; never cut it off midway:\n[${sem}]`
}

/** Prazo da 3ª chamada (ms), ou null quando não cabe no maxDuration da rota. */
export function prazoDaTerceiraTentativa(decorridoMs: number, timeoutMs: number, maxDurationMs = 60_000): number | null {
  const resta = maxDurationMs - decorridoMs - FOLGA_DEPOIS_MS
  return resta >= PRAZO_MINIMO_MS ? Math.min(timeoutMs, resta) : null
}

/** Só filme curto (onde as 8 recusas aconteceram), só sem conteúdo barrado, só com texto. */
export function tentaCondensar(a: { conteudoBarrado: boolean; filmeCurto: boolean; topic: string }): boolean {
  return !a.conteudoBarrado && a.filmeCurto && String(a.topic ?? '').trim().length > 0
}
