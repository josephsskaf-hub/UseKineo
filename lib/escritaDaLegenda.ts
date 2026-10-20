// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-META95-ESCRITA-2010 — a legenda sai na MESMA escrita do roteiro.
//
// O defeito (régua 95 de 20/10: 2 de 10 filmes de clientes com o teto "legenda na língua/escrita errada"; diagnóstico de
// 19/10, render 9de38488): roteiro em hindi (devanágari), narração em hindi, LEGENDA EM URDU (escrita árabe-persa).
// Caso real de 20/10: vídeo d97e1546 (Seedance 1.5, Jantar Mantar, roteiro "भारत में एक रहस्यमयी जगह है…", script_written
// language=hi) — o juiz escreveu "legenda em urdu" nos 8 quadros.
//
// A causa: o Whisper era chamado SEM `language` (lib/compose.ts transcribeTTSWithTimestamps). Hindi e urdu são a mesma
// língua falada (hindustâni) com duas escritas; sem dica, o whisper-1 escolhe a escrita de ouvido e para o hindi falado
// pelo tts-1-hd sai muitas vezes em urdu. Daí:
//   · lib/captionScriptSpelling.ts (alinharGrafiaDoRoteiro) compara chaves de letras — devanágari × árabe nunca casam →
//     0 âncoras → 'poucas_ancoras' → devolve o Whisper SEM MUDANÇA, isto é, em urdu;
//   · o cache de voz (e a voz pedida no clique, lib/audioNoCliqueServer.ts) guardava essas palavras em urdu, e a próxima
//     montagem com o mesmo roteiro herdava a legenda errada.
//
// O conserto (fora de lib/compose.ts, que segue intocada):
//   1. idiomaWhisperDaEscrita: a escrita DOMINANTE do roteiro escolhe o `language` do Whisper só quando a escrita diz a
//      língua sem ambiguidade (devanágari → hi, bengali → bn, árabe com letra do urdu → ur, …). Latim e cirílico → null
//      (nenhuma dica: o comportamento de antes, byte a byte, para quase todos os filmes);
//   2. transcreverNaEscritaCom: com idioma → Whisper com `language`; se falhar, vier vazio ou AINDA na escrita errada,
//      volta para a transcrição de sempre (nunca pior que antes);
//   3. escritaDivergente: palavras do Whisper (frescas ou do cache) numa escrita diferente da do roteiro → o compose
//      ignora o cache (sintetiza de novo, já com o idioma certo, e regrava a chave);
//   4. legendaNaEscritaDoRoteiro: rede final — se as palavras que vão para a legenda ainda estão em outra escrita, a
//      legenda não usa o Whisper e cai no plano B que já existe (texto do roteiro distribuído no tempo do áudio).
//
// Lib pura: sem import, sem rede, sem env. O guardião scripts/test-meta95-escrita-2010.mjs roda isto numa VM.

/** O formato mínimo das palavras do Whisper (espelho estrutural de WhisperWord em lib/compose.ts). */
export interface PalavraDaLegenda {
  word: string
  start: number
  end: number
  sentenceEnd?: boolean
}

/** Família de escrita. 'Japones' = kana presente (com ou sem kanji). */
export type Escrita =
  | 'Latin' | 'Cyrillic' | 'Greek' | 'Armenian' | 'Georgian' | 'Hebrew' | 'Arabic'
  | 'Devanagari' | 'Bengali' | 'Gurmukhi' | 'Gujarati' | 'Oriya' | 'Tamil' | 'Telugu' | 'Kannada' | 'Malayalam' | 'Sinhala'
  | 'Thai' | 'Lao' | 'Khmer' | 'Myanmar' | 'Ethiopic' | 'Hangul' | 'Han' | 'Japones'

// Regex LITERAIS (nada de RegExp montado em template): letra ou marca combinante de cada escrita.
const TABELA: ReadonlyArray<readonly [Escrita, RegExp]> = [
  ['Latin', /[\p{Script=Latin}]/u],
  ['Cyrillic', /[\p{Script=Cyrillic}]/u],
  ['Greek', /[\p{Script=Greek}]/u],
  ['Armenian', /[\p{Script=Armenian}]/u],
  ['Georgian', /[\p{Script=Georgian}]/u],
  ['Hebrew', /[\p{Script=Hebrew}]/u],
  ['Arabic', /[\p{Script=Arabic}]/u],
  ['Devanagari', /[\p{Script=Devanagari}]/u],
  ['Bengali', /[\p{Script=Bengali}]/u],
  ['Gurmukhi', /[\p{Script=Gurmukhi}]/u],
  ['Gujarati', /[\p{Script=Gujarati}]/u],
  ['Oriya', /[\p{Script=Oriya}]/u],
  ['Tamil', /[\p{Script=Tamil}]/u],
  ['Telugu', /[\p{Script=Telugu}]/u],
  ['Kannada', /[\p{Script=Kannada}]/u],
  ['Malayalam', /[\p{Script=Malayalam}]/u],
  ['Sinhala', /[\p{Script=Sinhala}]/u],
  ['Thai', /[\p{Script=Thai}]/u],
  ['Lao', /[\p{Script=Lao}]/u],
  ['Khmer', /[\p{Script=Khmer}]/u],
  ['Myanmar', /[\p{Script=Myanmar}]/u],
  ['Ethiopic', /[\p{Script=Ethiopic}]/u],
  ['Hangul', /[\p{Script=Hangul}]/u],
  ['Han', /[\p{Script=Han}]/u],
  ['Japones', /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
]
const LETRA_OU_MARCA = /[\p{L}\p{M}]/u

/** Fração mínima das letras que a escrita dominante precisa ter. */
export const ESCRITA_FRACAO_MINIMA = 0.6
/** Mínimo de letras contadas para decidir alguma coisa. */
export const ESCRITA_LETRAS_MINIMAS = 3

/** Conta as letras por escrita. Colchetes (marcações "[Pexels: …]") e o que estiver dentro não contam. */
export function contarEscritas(texto: string): Map<Escrita, number> {
  const limpo = String(texto ?? '').replace(/\[[^\]]*\]/g, ' ')
  const conta = new Map<Escrita, number>()
  for (const ch of limpo) {
    if (!LETRA_OU_MARCA.test(ch)) continue
    for (const [nome, re] of TABELA) {
      if (re.test(ch)) { conta.set(nome, (conta.get(nome) ?? 0) + 1); break }
    }
  }
  return conta
}

/** A escrita que domina o texto (≥ 60% das letras, ≥ 3 letras), ou null. Kana presente junta kanji + kana em 'Japones'. */
export function escritaDominante(texto: string): Escrita | null {
  const conta = contarEscritas(texto)
  const kana = conta.get('Japones') ?? 0
  if (kana > 0) {
    conta.set('Japones', kana + (conta.get('Han') ?? 0))
    conta.delete('Han')
  }
  let total = 0
  let melhor: Escrita | null = null
  let melhorN = 0
  for (const [nome, n] of conta) {
    total += n
    if (n > melhorN) { melhor = nome; melhorN = n }
  }
  if (!melhor || total < ESCRITA_LETRAS_MINIMAS || melhorN / total < ESCRITA_FRACAO_MINIMA) return null
  return melhor
}

// Escrita árabe: letras que só o urdu usa, e as que o persa usa e o árabe não.
const LETRA_DO_URDU = /[ٹڈڑںھہۃے]/u // ٹ ڈ ڑ ں ھ ہ ۃ ے
const LETRA_DO_PERSA = /[پچژگکی]/u // پ چ ژ گ ک ی

/** Escrita que diz a língua sem ambiguidade → código ISO-639-1 que o Whisper aceita. Latim/cirílico ficam de fora (null). */
const IDIOMA_DA_ESCRITA: Partial<Record<Escrita, string>> = {
  Devanagari: 'hi', // o caso do defeito: sem dica o hindi falado sai em urdu
  Bengali: 'bn',
  Gurmukhi: 'pa',
  Gujarati: 'gu',
  Oriya: 'or',
  Tamil: 'ta',
  Telugu: 'te',
  Kannada: 'kn',
  Malayalam: 'ml',
  Sinhala: 'si',
  Thai: 'th',
  Lao: 'lo',
  Khmer: 'km',
  Myanmar: 'my',
  Ethiopic: 'am',
  Hangul: 'ko',
  Han: 'zh',
  Japones: 'ja',
  Hebrew: 'he',
  Greek: 'el',
  Georgian: 'ka',
  Armenian: 'hy',
}

/**
 * O `language` do Whisper que a escrita do ROTEIRO pede, ou null (sem dica = como sempre foi).
 * Árabe: letra do urdu → 'ur'; letra do persa → 'fa'; senão 'ar' (o urdu falado sem dica sai em escrita hindi e vice-versa).
 */
export function idiomaWhisperDaEscrita(roteiro: string): string | null {
  const escrita = escritaDominante(roteiro)
  if (!escrita) return null
  if (escrita === 'Arabic') {
    const t = String(roteiro ?? '')
    if (LETRA_DO_URDU.test(t)) return 'ur'
    if (LETRA_DO_PERSA.test(t)) return 'fa'
    return 'ar'
  }
  return IDIOMA_DA_ESCRITA[escrita] ?? null
}

/** Texto corrido das palavras do Whisper. */
function textoDasPalavras(words: ReadonlyArray<PalavraDaLegenda> | null | undefined): string {
  return Array.isArray(words) ? words.map((w) => String(w?.word ?? '')).join(' ') : ''
}

/**
 * As palavras estão numa escrita DIFERENTE da do roteiro? Só responde true quando as duas escritas são decididas e
 * diferentes (hindi em devanágari × urdu em árabe). Sem palavras, sem roteiro ou escrita misturada → false (não mexe).
 */
export function escritaDivergente(words: ReadonlyArray<PalavraDaLegenda> | null | undefined, roteiro: string): boolean {
  const doRoteiro = escritaDominante(roteiro)
  if (!doRoteiro) return false
  const dasPalavras = escritaDominante(textoDasPalavras(words))
  if (!dasPalavras) return false
  return dasPalavras !== doRoteiro
}

/**
 * Rede final da legenda: palavras numa escrita diferente da do roteiro NÃO vão para a tela — devolve undefined e o
 * montador usa o plano B que já existe (o texto do roteiro distribuído na duração real do áudio). Senão, as mesmas.
 */
export function legendaNaEscritaDoRoteiro<T extends PalavraDaLegenda>(words: T[] | undefined, roteiro: string): T[] | undefined {
  if (!words || words.length === 0) return words
  return escritaDivergente(words, roteiro) ? undefined : words
}

/** As duas transcrições que o servidor sabe fazer (injetadas: a lib não chama rede). */
export interface TranscritoresDaEscrita<T extends PalavraDaLegenda> {
  /** A de sempre (lib/compose.ts transcribeTTSWithTimestamps): sem `language`. */
  padrao: () => Promise<T[]>
  /** A mesma chamada com `language`. */
  comIdioma: (idioma: string) => Promise<T[]>
}

/**
 * Transcreve o áudio do roteiro na escrita do roteiro. Sem idioma pela escrita → só a de sempre (nada muda). Com idioma →
 * Whisper com `language`; vazio, erro ou ainda na escrita errada → a de sempre (nunca pior que antes).
 */
export async function transcreverNaEscritaCom<T extends PalavraDaLegenda>(roteiro: string, t: TranscritoresDaEscrita<T>): Promise<T[]> {
  const idioma = idiomaWhisperDaEscrita(roteiro)
  if (!idioma) return t.padrao()
  try {
    const words = await t.comIdioma(idioma)
    if (Array.isArray(words) && words.length > 0 && !escritaDivergente(words, roteiro)) return words
    console.warn(`[legenda-escrita] Whisper com language=${idioma} ${Array.isArray(words) && words.length > 0 ? 'ainda saiu em outra escrita' : 'voltou vazio'} — transcrição de sempre`)
  } catch (err) {
    console.warn(`[legenda-escrita] Whisper com language=${idioma} falhou — transcrição de sempre:`, err instanceof Error ? err.message : String(err))
  }
  return t.padrao()
}
