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
import { transcreverNaEscritaCom } from '@/lib/escritaDaLegenda'

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
