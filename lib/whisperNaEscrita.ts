// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-META95-ESCRITA-2010 — Whisper na escrita do roteiro.
//
// Lado de servidor de lib/escritaDaLegenda.ts (a decisão e o porquê moram lá). lib/compose.ts continua intocada: a
// transcrição de sempre (transcribeTTSWithTimestamps, sem `language`) é chamada como está sempre que a escrita do roteiro
// não pede idioma (latim, cirílico, misturado) — ou seja, para quase todos os filmes nada muda. Quando o roteiro está em
// devanágari (e nas outras escritas que dizem a língua), esta chamada é a MESMA do compose (whisper-1, verbose_json,
// word + segment, mesmo timeout, sem retry) com `language`, e as fronteiras de frase passam pelo MESMO markSentenceEnds.
import { toFile } from 'openai'
import { markSentenceEnds, transcribeTTSWithTimestamps, type WhisperWord } from '@/lib/compose'
import { OPENAI_WHISPER_TIMEOUT_MS } from '@/lib/openai'
import { AI_TRANSCRIPTION_MODEL } from '@/lib/aiModels'
import { transcreverNaEscritaCom, idiomaWhisperDaEscrita } from '@/lib/escritaDaLegenda' // KINEO-FILME15-FIEL-2610: + idiomaWhisperDaEscrita

/** Whisper com `language` (ISO-639-1). Erro sobe: quem chama volta para a transcrição de sempre. */
async function whisperComIdioma(buffer: Buffer, idioma: string): Promise<WhisperWord[]> {
  const { openai } = await import('@/lib/openai')
  const audioBlob = new Blob(
    [new Uint8Array(buffer.buffer as ArrayBuffer, buffer.byteOffset, buffer.byteLength)],
    { type: 'audio/mpeg' },
  )
  const file = await toFile(audioBlob, 'voiceover.mp3', { type: 'audio/mpeg' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transcription: any = await openai.audio.transcriptions.create({
    model: AI_TRANSCRIPTION_MODEL,
    file: file as unknown as Parameters<typeof openai.audio.transcriptions.create>[0]['file'],
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
    language: idioma,
  } as Parameters<typeof openai.audio.transcriptions.create>[0],
  { timeout: OPENAI_WHISPER_TIMEOUT_MS, maxRetries: 0 })
  const words: WhisperWord[] = transcription?.words ?? []
  const segments: Array<{ start?: number; end?: number; text?: string }> = transcription?.segments ?? []
  const marked = markSentenceEnds(words, segments)
  console.log(`[legenda-escrita] Whisper language=${idioma}: ${marked.length} words, ${segments.length} segments`)
  return marked
}

/**
 * Palavras com tempo do áudio de `roteiro`, na escrita do roteiro. Mesmo contrato de transcribeTTSWithTimestamps:
 * nunca lança; falha devolve [] (o plano B proporcional de sempre).
 */
export async function transcreverNaEscritaDoRoteiro(buffer: Buffer, roteiro: string): Promise<WhisperWord[]> {
  try {
    return await transcreverNaEscritaCom<WhisperWord>(String(roteiro ?? ''), {
      padrao: () => transcribeTTSWithTimestamps(buffer),
      comIdioma: (idioma) => whisperComIdioma(buffer, idioma),
    })
  } catch {
    return []
  }
}

// ═══ KINEO-FILME15-FIEL-2610 [TRAVA 8.2 — vai do fundador 26/10 "o ads de 15 está horrível… arrumasse para mim o mais rápido possível"] ═══
// Whisper no IDIOMA DO FILME quando a escrita não diz nada (latim). Pena dourada (26/10, be296327): roteiro em português, interface
// em inglês → o compose chamava o Whisper sem `language` e a legenda saiu em outra língua ("legenda na língua/escrita errada" no
// juiz de pixel). Regra pura (testável sem rede): escrita que já diz o idioma (devanágari, árabe…) → o caminho de sempre; idioma
// vazio ou 'en' → o caminho de sempre, byte a byte; outro idioma → Whisper com `language`; vazio ou erro → o caminho de sempre.
export type DecisaoDoIdiomaDoFilme = 'escrita' | 'padrao' | 'idioma_do_filme'
export function decidirTranscricaoDoFilme(roteiro: string, idioma: string | null | undefined): { decisao: DecisaoDoIdiomaDoFilme; idioma: string | null } {
  if (idiomaWhisperDaEscrita(roteiro)) return { decisao: 'escrita', idioma: null }
  const code = String(idioma ?? '').trim().toLowerCase()
  if (!code || code === 'en') return { decisao: 'padrao', idioma: null }
  return { decisao: 'idioma_do_filme', idioma: code }
}
export async function transcreverNoIdiomaCom<T>(roteiro: string, idioma: string | null | undefined, t: { padrao: () => Promise<T[]>; comIdioma: (idioma: string) => Promise<T[]> }): Promise<T[]> {
  const d = decidirTranscricaoDoFilme(roteiro, idioma)
  if (d.decisao !== 'idioma_do_filme' || !d.idioma) return t.padrao()
  try {
    const words = await t.comIdioma(d.idioma)
    if (Array.isArray(words) && words.length > 0) return words
    console.warn(`[legenda-escrita] KINEO-FILME15-FIEL-2610: Whisper com language=${d.idioma} voltou vazio — transcrição de sempre`)
  } catch (err) {
    console.warn(`[legenda-escrita] KINEO-FILME15-FIEL-2610: Whisper com language=${d.idioma} falhou — transcrição de sempre:`, err instanceof Error ? err.message : String(err))
  }
  return t.padrao()
}
/** Mesmo contrato de transcreverNaEscritaDoRoteiro (nunca lança; [] = plano B proporcional). `idioma` = o idioma resolvido pelo compose. */
export async function transcreverNoIdiomaDoFilme(buffer: Buffer, roteiro: string, idioma: string | null | undefined): Promise<WhisperWord[]> {
  try {
    return await transcreverNoIdiomaCom<WhisperWord>(roteiro, idioma, {
      padrao: () => transcreverNaEscritaDoRoteiro(buffer, roteiro),
      comIdioma: (code) => whisperComIdioma(buffer, code),
    })
  } catch {
    return []
  }
}
