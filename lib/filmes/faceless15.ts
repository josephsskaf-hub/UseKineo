// KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — a receita "FACELESS 15 s".
//
// Base: docs/FILMES-COMO-OS-LIDERES-FAZEM-2026-10-19.md (§3 a receita, §4 as fases). Escopo: SÓ o Seedance 1.5 de 15 s
// ('cinematic_ai' + 15 s — lib/durationByEngine: "a duração de 15 s existe SÓ no Seedance 1.5") em 9:16. Os outros
// motores, durações e formatos passam por aqui sem tocar em nada.
//
// COMO ENTRA (o mesmo jeito do logo da marca e do gancho do 1º quadro): lib/compose monta o source como sempre —
// BYTE A BYTE, nenhuma linha de lib/compose.ts muda — e DEPOIS este módulo reescreve, em memória, só as peças da fase
// ligada: legenda (F1), gancho escrito (F2), música/SFX (F3), planos da trilha 2 (F4). Nunca monta duas vezes, nunca
// toca em débito, nunca mexe na voz (trilha 4) nem nas réguas de palavras.
//
// UMA VARIÁVEL POR VEZ SEM PUBLICAR 4 VEZES: cada fase tem um interruptor público (FACELESS15_PUBLIC), hoje DESLIGADO
// para clientes. Conta interna (lib/internalAccounts isInternalEmail) liga fase a fase POR PEDIDO, com `formatFlags`
// no corpo do /api/compose (ex.: { "formatFlags": ["f1","f2"] } — aceito só de conta interna; cliente que mandar o
// campo é ignorado). Depois da nota do fundador em cada fase, a constante vira true e a fase passa a valer para
// todo mundo no formato. Guardião: scripts/test-filmes-f1f4-1910.mjs.
//
// Só propriedades que lib/compose.ts e lib/ads/adV2Montage.ts já mandam ao Creatomate em produção (type, track, time,
// duration, source, volume, loop, trim_start, audio_fade_in/out, fit, x/y/width/height, animations scale com easing,
// enter_transition, e as de texto da legenda). Nada inédito sem render de validação (regra da casa).

//
// KINEO-FILMES-F1F3-AJUSTE-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — dois consertos da escada de
// produção (docs/RESULTADO-ESCADA-F1-F4-2026-10-19.md):
//   F1 — o corte cego em blocos de ≤5 palavras deixava órfãs ("…SKY OVER" / "CUBA", "MONTHS" sozinho). Agora o
//        agrupador é desta receita (agruparLegendaFaceless15): bloco nunca atravessa fim de frase, nunca fica com 1
//        palavra no meio de uma frase (5+1 → 3+3, 4+1 → 3+2), não termina em preposição/artigo/conjunção (EN/PT/ES) e
//        prefere a vírgula/pausa; o payoff inteiro segue amarelo; os tempos continuam −120 ms sobre a palavra.
//   F3 — a música em 3 elementos com fades sobrepostos caía ~20 dB sob o payoff e deixava a cauda muda. Volume por
//        keyframe nunca foi exercitado pela casa (nenhum uso no repo) — então a música volta a UM elemento só, do 0 ao
//        fim do filme, a 14 % fixos, com os fades de sempre de lib/compose (0,8 / 1,2 s, provados em produção no F0);
//        sem ducking. Riser/whoosh/pop ficam como estavam.
import { buildCaptionElements, buildCaptionsFromWhisperWords, sentenceStartTimes, type WhisperWord } from '@/lib/compose'
import { pickHighlightWord } from '@/lib/openai'
import { withHookFirstFrame, GANCHO_1Q_TRACK, type HookFirstFrameResult } from '@/lib/hookFirstFrame'

export type FaseFaceless15 = 'f1' | 'f2' | 'f3' | 'f4' | 'cta'
export const FASES_FACELESS15: readonly FaseFaceless15[] = ['f1', 'f2', 'f3', 'f4', 'cta']

/**
 * INTERRUPTORES PÚBLICOS — false = só conta interna, por pedido (formatFlags). Trocar para true liga a fase para TODOS
 * os clientes do formato (depois da nota ≥ 9 do fundador naquela fase, regra do §4 do estudo).
 *   f1  legenda a 62 %, ≤5 palavras, 64/80 px, −120 ms, linha amarela só no PAYOFF
 *   f2  gancho escrito no 1º quadro (lib/hookFirstFrame) liberado no formato
 *   f3  música num elemento só a 14 % fixos (do 0 ao fim, sem ducking) + 3 SFX (riser · whoosh · pop)
 *   f4  5 planos de ~3 s a partir dos 3 clipes (2º plano = mesmo clipe, trim 3,0 s) + punch no reveal
 *   cta cartão de texto de 1 s no fim ("Follow for part 2 →") — opcional, exige f4, desligado por padrão
 */
export const FACELESS15_PUBLIC: Readonly<Record<FaseFaceless15, boolean>> = { f1: true, f2: false, f3: true, f4: false, cta: false } // KINEO-FILMES-F1F3-PUBLICO-2010 [TRAVA 8.2 — vai do fundador 20/10 "nota 10"] — F1 (legenda) + F3 (som) para TODOS no formato (render e48e17bf); f2/f4/cta seguem só por pedido interno

/** O formato: Seedance 1.5 ('cinematic_ai'), 15 s, 9:16, sem avatar e fora do Studio Ads. */
export const FACELESS15_QUALITY = 'cinematic_ai'
export const FACELESS15_DURATION = 15
export const FACELESS15_ASPECT = '9:16'

// ── F1 · legenda (§3.4 do estudo) ────────────────────────────────────────────────────────────────────────────────────
/** Borda inferior da caixa da legenda (hoje 78 % em lib/compose CAPTION_BOTTOM_Y): fora dos 35 % de baixo do Meta, abaixo do rosto em plano médio (25–45 %). */
export const FACELESS15_LEGENDA_Y = '62%'
export const FACELESS15_LEGENDA_FONTE = 64
export const FACELESS15_LEGENDA_FONTE_GANCHO = 80
export const FACELESS15_LEGENDA_PALAVRAS = 5
/** A legenda entra 120 ms ANTES da palavra (Opus: 100–200 ms). */
export const FACELESS15_LEGENDA_ANTECIPACAO_S = 0.12
/** O mesmo amarelo do karaokê (lib/compose HIGHLIGHT_COLOR). */
export const FACELESS15_AMARELO = '#FFD700'
/** Espelho de CAPTION_HOOK_WINDOW_SECONDS (lib/compose): o tratamento de gancho cobre a 1ª frase, nunca menos de 2 s nem mais de 6 s. */
const JANELA_GANCHO_S = 2
/** O PAYOFF tem de ter pelo menos este tanto de fala; senão a última fronteira de frase não é o reveal. */
const PAYOFF_MIN_S = 1.0

export interface Faceless15Decisao {
  /** O pedido é o formato (quality/duração/quadro/sem avatar/sem Ads)? Fora do formato nada acontece, nem para conta interna. */
  formato: boolean
  /** Há pelo menos uma fase ligada (pública ou pedida por conta interna) dentro do formato. */
  ativo: boolean
  motivo: string
  /** Fases que valem nesta montagem, na ordem de FASES_FACELESS15. */
  fases: FaseFaceless15[]
  /** O que a conta interna pediu (normalizado). */
  pedidas: FaseFaceless15[]
  /** Pedidos que não entraram, com o porquê. */
  ignoradas: string[]
}

/** Normaliza `formatFlags` do corpo: lista de strings ou texto separado por vírgula/espaço; só os nomes conhecidos. */
export function lerPedidoFaceless15(pedido: unknown): { fases: FaseFaceless15[]; desconhecidas: string[] } {
  const brutos: string[] = Array.isArray(pedido)
    ? pedido.map((v) => String(v ?? ''))
    : typeof pedido === 'string'
      ? pedido.split(/[\s,;]+/)
      : []
  const fases: FaseFaceless15[] = []
  const desconhecidas: string[] = []
  for (const b of brutos) {
    const n = b.trim().toLowerCase()
    if (!n) continue
    if ((FASES_FACELESS15 as readonly string[]).includes(n)) {
      if (!fases.includes(n as FaseFaceless15)) fases.push(n as FaseFaceless15)
    } else if (desconhecidas.length < 8) desconhecidas.push(n.slice(0, 16))
  }
  return { fases, desconhecidas }
}

/** Decide, para UMA montagem, quais fases valem. Pura; chamada na rota com o que o servidor já sabe (nunca o corpo decide a conta). */
export function resolverFaceless15(input: {
  interna: boolean
  pedido: unknown
  quality: unknown
  duration: unknown
  aspect?: unknown
  avatar?: boolean
  studioAds?: boolean
}): Faceless15Decisao {
  const { fases: pedidasBrutas, desconhecidas } = lerPedidoFaceless15(input.pedido)
  const ignoradas: string[] = desconhecidas.map((d) => `${d}:desconhecida`)
  const foraDoFormato: string[] = []
  if (input.quality !== FACELESS15_QUALITY) foraDoFormato.push(`quality=${String(input.quality)}`)
  if (Number(input.duration) !== FACELESS15_DURATION) foraDoFormato.push(`duration=${String(input.duration)}`)
  const aspect = input.aspect == null || input.aspect === '' ? FACELESS15_ASPECT : String(input.aspect)
  if (aspect !== FACELESS15_ASPECT) foraDoFormato.push(`aspect=${aspect}`)
  if (input.avatar) foraDoFormato.push('avatar')
  if (input.studioAds) foraDoFormato.push('studio_ads')
  const formato = foraDoFormato.length === 0
  const pedidas: FaseFaceless15[] = []
  if (input.interna === true) pedidas.push(...pedidasBrutas)
  else if (pedidasBrutas.length > 0) ignoradas.push(`${pedidasBrutas.join('+')}:conta_externa`)
  const ligadas = new Set<FaseFaceless15>()
  for (const f of FASES_FACELESS15) if (FACELESS15_PUBLIC[f]) ligadas.add(f)
  for (const f of pedidas) ligadas.add(f)
  if (ligadas.has('cta') && !ligadas.has('f4')) { ligadas.delete('cta'); ignoradas.push('cta:exige_f4') }
  const fases = FASES_FACELESS15.filter((f) => ligadas.has(f))
  if (!formato) return { formato: false, ativo: false, motivo: `fora_do_formato:${foraDoFormato.join(',')}`, fases: [], pedidas, ignoradas }
  if (fases.length === 0) return { formato: true, ativo: false, motivo: 'nenhuma_fase_ligada', fases: [], pedidas, ignoradas }
  return { formato: true, ativo: true, motivo: 'ok', fases, pedidas, ignoradas }
}

// ── o quadro da montagem (lido do próprio source, nada de número solto) ──────────────────────────────────────────────
type El = Record<string, unknown>
const r3 = (v: number): number => Math.round(v * 1000) / 1000
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)
const ehTexto = (e: El, track: number): boolean => !!e && e.type === 'text' && Number(e.track) === track
const ehVideo = (e: El, track: number): boolean => !!e && e.type === 'video' && Number(e.track) === track
const ehAudio = (e: El, track: number): boolean => !!e && e.type === 'audio' && Number(e.track) === track

export interface QuadroFaceless15 {
  total: number
  /** Onde a fala termina (trilha 4 = a voz; sem ela, o fim do filme). */
  falaFim: number
  /** Inícios de frase do Whisper dentro da fala (sentenceStartTimes de lib/compose, a mesma régua dos cortes e das legendas). */
  frases: number[]
  /** O reveal: a última fronteira de frase com pelo menos PAYOFF_MIN_S de fala depois dela; null sem Whisper. */
  payoff: number | null
}

export function lerQuadroFaceless15(source: El, whisperWords?: ReadonlyArray<WhisperWord> | null): QuadroFaceless15 {
  const els = Array.isArray(source.elements) ? (source.elements as El[]) : []
  const total = num(source.duration)
  const voz = els.find((e) => ehAudio(e, 4))
  const falaFim = voz ? r3(num(voz.time) + num(voz.duration)) : total
  const frases = (Array.isArray(whisperWords) && whisperWords.length > 0 ? sentenceStartTimes(whisperWords as WhisperWord[]) : [])
    .filter((t) => t > 0 && t < falaFim)
  const candidatos = frases.filter((t) => t <= falaFim - PAYOFF_MIN_S)
  const payoff = candidatos.length > 0 ? r3(candidatos[candidatos.length - 1]) : null
  return { total, falaFim, frases, payoff }
}

// ── F1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface RelatoF1 {
  chunker: 'whisper' | 'proporcional'
  chunks: number
  elementos: number
  palavrasMax: number
  payoffEm: number | null
  amarelos: number
}

// KINEO-FILMES-F1F3-AJUSTE-1910 — o agrupador da legenda (frase → blocos de 2..5 palavras).
/** Palavras que nunca fecham um bloco (EN/PT/ES básicos): preposição, artigo, conjunção, possessivo curto. */
export const FACELESS15_PALAVRAS_QUE_NAO_FECHAM: ReadonlySet<string> = new Set([
  // EN
  'a', 'an', 'the', 'of', 'in', 'to', 'on', 'at', 'for', 'over', 'with', 'from', 'by', 'into', 'onto', 'as', 'about', 'under',
  'and', 'or', 'but', 'than', 'its', 'their', 'his', 'her', 'my', 'your', 'our',
  // PT
  'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra',
  'por', 'pelo', 'pela', 'pelos', 'pelas', 'com', 'e', 'ou', 'mas', 'que', 'ao', 'aos', 'à', 'às', 'sobre', 'seu', 'sua',
  // ES
  'el', 'la', 'los', 'las', 'unos', 'unas', 'del', 'en', 'con', 'al', 'y', 'pero', 'su', 'sus',
])
/** Pausa (s) entre palavras que conta como vírgula (boa para partir dentro da frase). */
const PAUSA_VIRGULA_S = 0.15
/** Pausa (s) que a base trata como fim de frase (lib/compose SENTENCE_GAP_SECONDS) — aqui só vale quando o Whisper não trouxe nenhuma pontuação. */
const PAUSA_FRASE_S = 0.28
const normPalavra = (w: string): string => (w ?? '').toLowerCase().replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '').trim()
const fechaFrase = (w: WhisperWord): boolean => w.sentenceEnd === true || /[.!?…]["'”’)\]]*$/.test((w.word ?? '').trim())
const temVirgula = (w: WhisperWord): boolean => /[,;:—–]["'”’)\]]*$/.test((w.word ?? '').trim())
// KINEO-FILME15-PERFEITO-2610 — caso real 8da074c197bc: "... DE 50" / "SEGUNDOS ...".
// Só medidas explícitas EN/PT/ES depois de numeral em algarismos. Não adivinha nomes próprios nem números por extenso.
const UNIDADES_FACELESS15: ReadonlySet<string> = new Set([
  's', 'sec', 'secs', 'second', 'seconds', 'seg', 'segundo', 'segundos',
  'ms', 'millisecond', 'milliseconds', 'milissegundo', 'milissegundos', 'milisegundo', 'milisegundos',
  'min', 'mins', 'minute', 'minutes', 'minuto', 'minutos', 'h', 'hour', 'hours', 'hora', 'horas',
  'day', 'days', 'dia', 'dias', 'día', 'días', 'week', 'weeks', 'semana', 'semanas',
  'month', 'months', 'mes', 'meses', 'year', 'years', 'ano', 'anos', 'año', 'años',
  'mm', 'cm', 'm', 'km', 'meter', 'meters', 'metre', 'metres', 'metro', 'metros',
  'kilometer', 'kilometers', 'kilometre', 'kilometres', 'quilômetro', 'quilômetros', 'kilómetro', 'kilómetros',
  'g', 'kg', 'gram', 'grams', 'grama', 'gramas', 'gramo', 'gramos', 'kilogram', 'kilograms', 'quilo', 'quilos',
  'ml', 'l', 'liter', 'liters', 'litre', 'litres', 'litro', 'litros',
])
const numeroComUnidadeFaceless15 = (left: WhisperWord | undefined, right: WhisperWord | undefined): boolean =>
  !!left && !!right && !fechaFrase(left) && /^\d+(?:[.,]\d+)*$/.test(normPalavra(left.word)) && UNIDADES_FACELESS15.has(normPalavra(right.word))

export interface BlocoLegendaFaceless15 {
  text: string
  highlight: string | null
  words: Array<{ word: string; start: number; end: number }>
  /** O bloco é uma frase inteira (só aí ele pode ter 1 palavra: "Gone."). */
  fraseInteira: boolean
}

/** Parte UMA frase (n palavras) em blocos de 2..max: menos blocos, tamanhos parecidos, nunca fecha em preposição/artigo, prefere vírgula/pausa. Devolve os tamanhos. */
export function partirFraseFaceless15(n: number, naoFecha: ReadonlyArray<boolean>, virgula: ReadonlyArray<number>, max = FACELESS15_LEGENDA_PALAVRAS, naoCorta: ReadonlyArray<boolean> = []): number[] {
  if (n <= 1) return n === 1 ? [1] : []
  if (n <= max) return [n]
  const alvo = n / Math.ceil(n / max)
  const custo: number[] = new Array(n + 1).fill(Infinity)
  const de: number[] = new Array(n + 1).fill(-1)
  custo[0] = 0
  for (let fim = 2; fim <= n; fim++) {
    for (let tam = 2; tam <= max && tam <= fim; tam++) {
      const ini = fim - tam
      if (!Number.isFinite(custo[ini])) continue
      const ultima = fim - 1
      const meio = fim < n
      if (meio && naoCorta[ultima]) continue // KINEO-FILME15-PERFEITO-2610 — mantém número+unidade no mesmo bloco quando a régua de 2..max permite
      const c = custo[ini] + 10 + (tam - alvo) ** 2 + (meio && naoFecha[ultima] ? 100 : 0) - (meio ? (virgula[ultima] ?? 0) : 0)
      if (c < custo[fim] - 1e-9) { custo[fim] = c; de[fim] = ini }
    }
  }
  if (!Number.isFinite(custo[n])) return naoCorta.some(Boolean) ? partirFraseFaceless15(n, naoFecha, virgula, max) : [n] // KINEO-FILME15-PERFEITO-2610 — teto customizado incompatível preserva a partição anterior
  const tams: number[] = []
  for (let fim = n; fim > 0; fim = de[fim]) tams.unshift(fim - de[fim])
  return tams
}

/**
 * Os blocos da legenda da F1, a partir do Whisper. Usa o mesmo normalizador de tokens de lib/compose (junta "A"+"M",
 * cola "5 AM", corta a janela) chamando-o com 1 palavra por bloco, e agrupa aqui com as regras da receita.
 */
export function agruparLegendaFaceless15(whisperWords: ReadonlyArray<WhisperWord>, fimJanela: number, max = FACELESS15_LEGENDA_PALAVRAS): BlocoLegendaFaceless15[] {
  const originais = whisperWords as WhisperWord[]
  const brutos = buildCaptionsFromWhisperWords(originais, fimJanela, 0, 1)
    .map((c) => c.words[0])
    .filter((w): w is { word: string; start: number; end: number } => !!w && !!String(w.word ?? '').trim())
  // KINEO-FILMES-F1-VIRGULA-1910 — o fim de frase de cada token vem da palavra original casada pela ORDEM e pelo TEXTO,
  // nunca pelo tempo: o Whisper dá duração ZERO à última palavra da frase (escada v2: Earth 3,48–3,48 = o fim de "at";
  // months 16,58–16,58 = o fim de "for"), e o casamento antigo por tempo de fim grudava o ponto de "Earth" em "at" —
  // "A STORM STRAIGHT AT" / "EARTH". Token colado por lib/compose ("A"+"M" → "AM", "5"+"AM" → "5 AM") consome as
  // originais até o texto bater; na dúvida, consome uma.
  const chave = (w: unknown): string => String(w ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const naJanela = originais.filter((o) => !!o && typeof o.start === 'number' && o.start < fimJanela)
  let j = 0
  const toks: WhisperWord[] = []
  for (const w of brutos) {
    const alvo = chave(w.word)
    while (j < naJanela.length && chave(naJanela[j].word) === '' && alvo !== '') {
      if ((naJanela[j].sentenceEnd === true || fechaFrase(naJanela[j])) && toks.length > 0) toks[toks.length - 1].sentenceEnd = true
      j++
    }
    const j0 = j
    let acc = ''
    while (j < naJanela.length && acc.length < alvo.length) { acc += chave(naJanela[j].word); j++ }
    if (acc !== alvo) j = Math.min(naJanela.length, j0 + 1)
    const casadas = naJanela.slice(j0, j)
    toks.push({ word: w.word, start: w.start, end: w.end, sentenceEnd: casadas.some((o) => o.sentenceEnd === true || fechaFrase(o)) || fechaFrase({ word: w.word, start: 0, end: 0 }) })
  }
  if (toks.length === 0) return []
  const temPontuacao = toks.some((w) => w.sentenceEnd === true)
  const gap = (i: number): number => (i + 1 < toks.length ? toks[i + 1].start - toks[i].end : Infinity)
  // 1) frases: fim de frase real (pontuação do Whisper); sem nenhuma pontuação, a pausa longa da base
  const frases: Array<{ ini: number; fim: number; real: boolean }> = []
  {
    let ini = 0
    for (let i = 0; i < toks.length; i++) {
      const real = toks[i].sentenceEnd === true
      const porPausa = !temPontuacao && Number.isFinite(gap(i)) && gap(i) >= PAUSA_FRASE_S && !numeroComUnidadeFaceless15(toks[i], toks[i + 1]) // KINEO-FILME15-PERFEITO-2610 — uma pausa não separa "50 segundos" sem fim de frase real
      if (real || porPausa || i === toks.length - 1) { frases.push({ ini, fim: i + 1, real: real || i === toks.length - 1 }); ini = i + 1 }
    }
  }
  // frase de 1 palavra nascida só de pausa (não de ponto) não fica sozinha: junta à seguinte (ou à anterior, se é a última)
  for (let k = 0; k < frases.length; k++) {
    const f = frases[k]
    if (f.fim - f.ini !== 1 || (f.real && temPontuacao)) continue
    if (frases.length === 1) break
    if (k + 1 < frases.length) { frases[k + 1].ini = f.ini; frases.splice(k, 1); k-- }
    else { frases[k - 1].fim = f.fim; frases.splice(k, 1) }
  }
  // 2) cada frase em blocos
  const blocos: BlocoLegendaFaceless15[] = []
  for (const f of frases) {
    const ws = toks.slice(f.ini, f.fim)
    const naoCorta = ws.map((w, i) => numeroComUnidadeFaceless15(w, ws[i + 1])) // KINEO-FILME15-PERFEITO-2610 — não muda tokens, texto nem timestamps
    const naoFecha = ws.map((w) => FACELESS15_PALAVRAS_QUE_NAO_FECHAM.has(normPalavra(w.word)))
    const virgula = ws.map((w, i) => (temVirgula(w) ? 6 : 0) + (gap(f.ini + i) >= PAUSA_FRASE_S ? 8 : gap(f.ini + i) >= PAUSA_VIRGULA_S ? 4 : 0))
    let i = 0
    for (const tam of partirFraseFaceless15(ws.length, naoFecha, virgula, max, naoCorta)) { // KINEO-FILME15-PERFEITO-2610
      const usados = ws.slice(i, i + tam) // KINEO-FILME15-PERFEITO-2610 — a partição conserva todas as palavras faladas
      i += tam
      // KINEO-FILME15-PERFEITO-2610 — não deduplica depois da partição: "very / very beginning" virava "beginning" sozinho,
      // e "No. No one…" perdia fala real. A evidência já está alinhada à voz; repetição dita deve aparecer.
      const text = usados.map((w) => String(w.word).trim()).join(' ').trim()
      if (!text) continue
      blocos.push({ text, highlight: pickHighlightWord(text), words: usados.map((w) => ({ word: String(w.word).trim(), start: r3(w.start), end: r3(w.end) })), fraseInteira: tam === ws.length })
    }
  }
  return blocos
}

/** A legenda da receita, em cima do source montado. Devolve os elementos novos (nunca muda os recebidos). */
export function aplicarF1Faceless15(els: ReadonlyArray<El>, quadro: QuadroFaceless15, whisperWords?: ReadonlyArray<WhisperWord> | null): { els: El[]; relato: RelatoF1 } {
  const idx = els.findIndex((e) => ehTexto(e, 5))
  const semLegenda = els.filter((e) => !ehTexto(e, 5))
  const antigas = els.filter((e) => ehTexto(e, 5))
  const payoff = quadro.payoff
  const ehPayoff = (t: number): boolean => payoff != null && t >= payoff - 0.05
  const ANT = FACELESS15_LEGENDA_ANTECIPACAO_S
  const vestir = (e: El, gancho: boolean, amarelo: boolean): El => ({
    ...e,
    y: FACELESS15_LEGENDA_Y,
    font_size: gancho ? FACELESS15_LEGENDA_FONTE_GANCHO : FACELESS15_LEGENDA_FONTE,
    fill_color: amarelo ? FACELESS15_AMARELO : '#ffffff',
  })
  let novas: El[] = []
  let chunker: RelatoF1['chunker'] = 'proporcional'
  let chunks = 0
  let palavrasMax = 0
  if (Array.isArray(whisperWords) && whisperWords.length > 0) {
    chunker = 'whisper'
    const fimJanela = r3(Math.min(quadro.falaFim, quadro.total))
    const caps = agruparLegendaFaceless15(whisperWords, fimJanela) // KINEO-FILMES-F1F3-AJUSTE-1910 — era o corte cego de lib/compose (≤5 sem olhar a frase): órfãs
    const primeiraFraseAcaba = (() => {
      const w = whisperWords.find((x) => x.sentenceEnd === true)
      return w && Number.isFinite(w.end) ? Math.min(6, Math.max(JANELA_GANCHO_S, w.end)) : JANELA_GANCHO_S
    })()
    chunks = caps.length
    caps.forEach((cap, i) => {
      // −120 ms em cima da PALAVRA (não do chunk de lib/compose, que já entra 150 ms depois dela): o chunk nasce em
      // start−0,12 e acaba onde o seguinte nasce; cada palavra do karaokê anda os mesmos 0,12 s. O último chunk termina
      // no fim da fala, como sempre. Contíguo por construção: nunca dois elementos ao mesmo tempo na trilha 5.
      const raw0 = cap.words[0]?.start ?? 0
      const proximo = caps[i + 1]?.words[0]?.start ?? fimJanela
      const time = Math.max(0, r3(raw0 - ANT))
      const fim = i === caps.length - 1 ? fimJanela : Math.max(time + 0.1, r3(proximo - ANT))
      const gancho = raw0 < primeiraFraseAcaba
      const amarelo = ehPayoff(raw0)
      palavrasMax = Math.max(palavrasMax, cap.words.length)
      const karaokeWords = cap.words.map((w) => ({ word: w.word, start: Math.max(time, r3(w.start - ANT)), end: r3(Math.max(time, w.end - ANT)) }))
      // emphasize só vale no elemento único (sem karaokê); no karaokê a cor é vestida abaixo — o resultado é o mesmo:
      // linha inteira amarela SÓ no payoff, branca com a palavra corrente amarela no resto.
      const base = buildCaptionElements({ text: cap.text, time, duration: r3(fim - time), highlight: cap.highlight, emphasize: amarelo, hook: gancho, karaokeWords }) as unknown as El[]
      novas.push(...base.map((e) => vestir(e, gancho, amarelo)))
    })
  } else {
    // Sem Whisper (fallback proporcional de lib/compose): mantém os chunks que vieram e só veste posição, tamanho, cor e
    // antecipação (−120 ms em todos; o 1º fica em 0; o último termina onde terminava).
    const fonteGancho = antigas.reduce((m, e) => Math.max(m, num(e.font_size) || 0), 0)
    const temDoisTamanhos = new Set(antigas.map((e) => num(e.font_size))).size > 1
    chunks = antigas.length
    novas = antigas.map((e, i) => {
      const gancho = temDoisTamanhos && num(e.font_size) === fonteGancho
      palavrasMax = Math.max(palavrasMax, String(e.text ?? '').split(/\s+/).filter(Boolean).length)
      const t0 = num(e.time)
      const fim0 = t0 + num(e.duration)
      const time = Math.max(0, r3(t0 - ANT))
      const fim = i === antigas.length - 1 ? fim0 : r3(fim0 - ANT)
      return vestir({ ...e, time, duration: r3(Math.max(0.1, fim - time)) }, gancho, ehPayoff(t0))
    })
  }
  const saida = idx < 0 ? [...semLegenda, ...novas] : [...semLegenda.slice(0, idx), ...novas, ...semLegenda.slice(idx)]
  return {
    els: saida,
    relato: { chunker, chunks, elementos: novas.length, palavrasMax, payoffEm: payoff, amarelos: novas.filter((e) => e.fill_color === FACELESS15_AMARELO).length },
  }
}

// ── F2 · gancho escrito no 1º quadro (§3.7) ──────────────────────────────────────────────────────────────────────────
// lib/hookFirstFrame.ts NÃO muda: GANCHO_1Q_PUBLIC continua false para os outros formatos. Aqui, DENTRO do formato, o
// gancho segue a fase: ligada = entra também para quem não é conta interna (o withHookFirstFrame mede a colisão com a
// legenda — já na posição da F1 quando ela está ligada — e com marca d'água/logo, como sempre); desligada = SAI, mesmo
// da conta interna, para a F0/F1/F3/F4 serem testadas uma variável por vez. Fora do formato nada muda (a rota já aplicou
// o gancho da conta interna, como desde 03/10).
export interface RelatoF2 {
  aplicado: boolean
  motivo: 'formato_inativo' | 'ja_aplicado' | 'removido_f2_desligada' | 'f2_desligada' | HookFirstFrameResult['reason']
  frase: string | null
  y: string | null
}

export function aplicarGanchoFaceless15(
  source: Record<string, unknown>,
  decisao: Faceless15Decisao,
  opts: { narration: string | null | undefined; font?: string | null; skip?: boolean },
): RelatoF2 {
  if (!decisao || !decisao.ativo) return { aplicado: false, motivo: 'formato_inativo', frase: null, y: null }
  const els = (source as { elements?: unknown }).elements
  if (!Array.isArray(els)) return { aplicado: false, motivo: 'sem_source', frase: null, y: null }
  const ganchos = (els as El[]).filter((e) => ehTexto(e, GANCHO_1Q_TRACK))
  if (decisao.fases.includes('f2')) {
    if (ganchos.length > 0) return { aplicado: true, motivo: 'ja_aplicado', frase: String(ganchos[0].text ?? ''), y: String(ganchos[0].y ?? '') }
    const g = withHookFirstFrame(source, { interna: true, narration: opts.narration, font: opts.font, skip: opts.skip })
    return { aplicado: g.applied, motivo: g.reason, frase: g.phrase, y: g.y }
  }
  if (ganchos.length > 0) {
    ;(source as { elements: unknown[] }).elements = (els as El[]).filter((e) => !ehTexto(e, GANCHO_1Q_TRACK))
    return { aplicado: false, motivo: 'removido_f2_desligada', frase: null, y: null }
  }
  return { aplicado: false, motivo: 'f2_desligada', frase: null, y: null }
}

// ── F3 · som (§3.5 SFX · §3.6 música) ────────────────────────────────────────────────────────────────────────────────
/**
 * KINEO-FILMES-F1F3-AJUSTE-1910 — Lyria a 14 % FIXOS num elemento só (hoje 12 % em lib/compose MUSIC_VOLUME). O ducking em
 * 3 elementos (18 · 10 · 18 com junções de 0,3 s) caiu ~20 dB sob o payoff e deixou a cauda muda na escada de 19/10;
 * volume por keyframe nunca foi exercitado pela casa, então nada de ducking: um elemento, do 0 ao fim do filme.
 */
export const FACELESS15_MUSICA_VOLUME = '14%'
/** Espelhos de MUSIC_FADE_IN_SECONDS / MUSIC_FADE_OUT_SECONDS (lib/compose) — os fades do F0, cauda audível medida em produção. */
export const FACELESS15_MUSICA_FADE_IN_S = 0.8
export const FACELESS15_MUSICA_FADE_OUT_S = 1.2
/** Trilha livre acima de tudo (lib/compose 1–9, logo 10, gancho 11). */
export const FACELESS15_SFX_TRACK = 12
export const FACELESS15_SFX_BASE_URL = 'https://www.usekineo.com/sfx/'
/** O whoosh começa um pouco antes do corte, para o pico cair em cima dele. */
export const FACELESS15_WHOOSH_ANTES_S = 0.1

export interface SfxFaceless15 {
  arquivo: string
  /** URL estável (arquivo estático do próprio site, public/sfx/). null = slot vazio: o SFX não entra e o relato diz. */
  url: string | null
  segundos: number
  /** Volume em % de amplitude do Creatomate: −14 dB ≈ 20 % · −12 dB ≈ 25 % · −10 dB ≈ 30 %. */
  volume: string
  sha256: string
  licenca: string
}
const LICENCA_SFX = 'síntese própria, determinística (scripts/gerar-sfx-faceless15-1910.mjs) — nenhum arquivo de terceiro; equivalente a CC0'
export const SFX_FACELESS15: Readonly<Record<'riser' | 'whoosh' | 'pop', SfxFaceless15>> = {
  riser: { arquivo: 'faceless15-riser.wav', url: `${FACELESS15_SFX_BASE_URL}faceless15-riser.wav`, segundos: 1.2, volume: '20%', sha256: '3dd7dc9ff16797bcf0347baf0fcc11a27e1956ab1a665c5754870e522fac88ed', licenca: LICENCA_SFX },
  whoosh: { arquivo: 'faceless15-whoosh.wav', url: `${FACELESS15_SFX_BASE_URL}faceless15-whoosh.wav`, segundos: 0.25, volume: '25%', sha256: '07c0c1e53a17e4f2dfa47278a0209445e1964c0952ae196e503f6dee5cd16939', licenca: LICENCA_SFX },
  pop: { arquivo: 'faceless15-pop.wav', url: `${FACELESS15_SFX_BASE_URL}faceless15-pop.wav`, segundos: 0.3, volume: '30%', sha256: '8c28bb3147161b08cac0785ade5a10fc414ffc0285fcb0e5cc87f5bae5498642', licenca: LICENCA_SFX },
}

export interface RelatoF3 {
  /** KINEO-FILMES-F1F3-AJUSTE-1910 — 'unica' = um elemento de música do 0 ao fim, volume fixo; 'sem_trilha' = não havia música. */
  musica: 'unica' | 'sem_trilha'
  /** Volume fixo da música ('14%'), quando há trilha. */
  volume: string | null
  /** [início, fim] da música em s — sempre [0, total do filme]: a cauda nunca fica muda. */
  cobre: [number, number] | null
  sfx: { riser: boolean; whoosh: number; pop: boolean } | 'slot_vazio'
  cortes: number[]
}

/** Os cortes de hoje na trilha 2 (inícios de plano > 0), quando a F4 não rodou. */
export function cortesDaTrilha2(els: ReadonlyArray<El>): number[] {
  const ts = els.filter((e) => ehVideo(e, 2)).map((e) => num(e.time)).filter((t) => t > 0)
  return [...new Set(ts.map(r3))].sort((a, b) => a - b)
}

export function aplicarF3Faceless15(els: ReadonlyArray<El>, quadro: QuadroFaceless15, cortes: ReadonlyArray<number>, sfx: typeof SFX_FACELESS15 = SFX_FACELESS15): { els: El[]; relato: RelatoF3 } {
  const T = quadro.total
  const saida: El[] = [...els]
  const relato: RelatoF3 = { musica: 'sem_trilha', volume: null, cobre: null, sfx: 'slot_vazio', cortes: [...cortes] }
  // ── música (KINEO-FILMES-F1F3-AJUSTE-1910): UM elemento só na trilha 8, do 0 ao fim do filme (T já inclui o CTA), a 14 %
  // fixos, loop, com os fades de sempre — nunca pedaços, nunca trim_start, nunca duas músicas somando/cortando na trilha
  const iMus = saida.findIndex((e) => ehAudio(e, 8))
  if (iMus >= 0) {
    const m = saida[iMus]
    const fadeIn = r3(Math.min(FACELESS15_MUSICA_FADE_IN_S, T / 2))
    const fadeOut = r3(Math.min(FACELESS15_MUSICA_FADE_OUT_S, T / 2))
    const unica: El = { type: 'audio', track: 8, time: 0, duration: T, source: m.source, volume: FACELESS15_MUSICA_VOLUME, loop: true, audio_fade_in: fadeIn, audio_fade_out: fadeOut }
    const semMusica = saida.filter((e) => !ehAudio(e, 8))
    saida.splice(0, saida.length, ...semMusica.slice(0, iMus), unica, ...semMusica.slice(iMus))
    relato.musica = 'unica'
    relato.volume = FACELESS15_MUSICA_VOLUME
    relato.cobre = [0, T]
  }
  // ── SFX: riser no gancho, whoosh em cada corte, pop no reveal (trilha 12, só com URL no catálogo)
  const sons: El[] = []
  const som = (s: SfxFaceless15, time: number): El | null =>
    s.url ? { type: 'audio', track: FACELESS15_SFX_TRACK, time: r3(time), duration: r3(Math.min(s.segundos, Math.max(0.1, T - time))), source: s.url, volume: s.volume } : null
  const riser = som(sfx.riser, 0)
  if (riser) sons.push(riser)
  let whooshes = 0
  for (const t of cortes) {
    if (!(t > 0 && t < T)) continue
    const w = som(sfx.whoosh, Math.max(0, t - FACELESS15_WHOOSH_ANTES_S))
    if (w) { sons.push(w); whooshes++ }
  }
  const pop = quadro.payoff != null ? som(sfx.pop, quadro.payoff) : null
  if (pop) sons.push(pop)
  if (sons.length > 0) {
    saida.push(...sons)
    relato.sfx = { riser: !!riser, whoosh: whooshes, pop: !!pop }
  }
  return { els: saida, relato }
}

// ── F4 · 5 planos de 3 clipes (§3.1 / §3.8 / §3.9) ──────────────────────────────────────────────────────────────────
// O mercado corta a cada 3–5 s; o 15 s do Seedance nasce com 3 clipes de 6 s. Em vez de gerar mais clipes (custo de fal),
// cada clipe vira até DOIS planos: o 2º plano é o MESMO clipe com trim_start 3,0 s — zero custo. Os cortes caem na
// fronteira de frase do Whisper quando cabe (a mesma régua das legendas), com piso 2,4 s e teto 4,0 s por plano; o
// reveal (payoff) é sempre um corte quando a cauda dele cabe num plano, e o plano do reveal abre com um punch
// 100→104 % em 0,15 s (elemento curto + o zoom de sempre a partir de 104 %). Nenhum plano passa do clipe
// (trim_start + duração + sobreposição ≤ segundos do clipe) — o que não cabe encolhe o trim; sem segundos conhecidos e
// com loop desligado, o limite é o que o clipe já mostrou na montagem de sempre.
export const FACELESS15_PLANO_MIN_S = 2.4
export const FACELESS15_PLANO_MAX_S = 4.0
export const FACELESS15_PLANO_ALVO_S = 3.0
/** O 2º plano de um clipe entra na metade dele. */
export const FACELESS15_TRIM_2O_PLANO_S = 3.0
/** Espelhos de CLIP_TRIM_START e CLIP_GAP_OVERLAP (lib/compose). */
const TRIM_CABECA_S = 0.1
const SOBREPOSICAO_S = 0.06
/** Segundos de um clipe do formato quando o claim não diz (Seedance 15 s assina 6|7|8). */
export const FACELESS15_CLIPE_PADRAO_S = 6
export const FACELESS15_PUNCH_S = 0.15
export const FACELESS15_PUNCH_ESCALA = '104%'
const ZOOM_ESCALA = '108%'
/** CTA de texto (§3.9): 1 s sobre o último plano esticado, sem fala; só com a fase 'cta'. */
export const FACELESS15_CTA_TEXTO = 'Follow for part 2 →'
export const FACELESS15_CTA_S = 1.0
export const FACELESS15_CTA_FONTE = 48
export const FACELESS15_CTA_TRACK = 13

/** Quantos planos cabem num trecho de `L` segundos (0 se nem um plano mínimo cabe). */
export function planosPara(L: number): number {
  if (!(L >= FACELESS15_PLANO_MIN_S - 1e-9)) return 0
  const lo = Math.ceil(L / FACELESS15_PLANO_MAX_S - 1e-9)
  const hi = Math.floor(L / FACELESS15_PLANO_MIN_S + 1e-9)
  return Math.max(1, Math.min(hi, Math.max(lo, Math.round(L / FACELESS15_PLANO_ALVO_S))))
}

/** Os n−1 cortes internos de [ini, fim] em n planos: cada corte vai à fronteira de frase mais perto do ideal dentro da janela [piso, teto] que ainda deixa os planos restantes caberem; sem fronteira na janela, o ideal. */
export function planejarCortesFaceless15(ini: number, fim: number, n: number, frases: ReadonlyArray<number>): number[] {
  const cortes: number[] = []
  let prev = ini
  for (let k = 1; k < n; k++) {
    const rest = n - k
    const lo = Math.max(prev + FACELESS15_PLANO_MIN_S, fim - rest * FACELESS15_PLANO_MAX_S)
    const hi = Math.min(prev + FACELESS15_PLANO_MAX_S, fim - rest * FACELESS15_PLANO_MIN_S)
    const ideal = prev + (fim - prev) / (rest + 1)
    let corte: number
    if (lo <= hi + 1e-9) {
      const cands = frases.filter((t) => t >= lo - 1e-9 && t <= hi + 1e-9)
      corte = cands.length > 0 ? cands.reduce((m, t) => (Math.abs(t - ideal) < Math.abs(m - ideal) ? t : m), cands[0]) : Math.min(hi, Math.max(lo, ideal))
    } else {
      corte = Math.min(fim, Math.max(prev + FACELESS15_PLANO_MIN_S, ideal))
    }
    corte = r3(corte)
    cortes.push(corte)
    prev = corte
  }
  return cortes
}

export interface RelatoF4 {
  aplicado: boolean
  motivo: 'ok' | 'sem_clipe' | 'still_na_trilha' | 'curto_demais'
  clipes: number
  planos: number
  cortes: number[]
  /** Quantos cortes caíram numa fronteira de frase. */
  emFrase: number
  punchEm: number | null
  /** [clipe, trim_start, duração] de cada plano, na ordem. */
  trechos: Array<[number, number, number]>
  /** Planos cujo clipe não cobria o pedido e ficaram com loop ligado (frames repetidos em vez de quadro preto). */
  loopPorFalta: number
  cta: boolean
  total: number
}

export function aplicarF4Faceless15(els: ReadonlyArray<El>, quadro: QuadroFaceless15, clipSeconds: ReadonlyArray<number> | null | undefined, opts: { cta?: boolean; font?: string | null } = {}): { els: El[]; relato: RelatoF4; total: number } {
  const T = quadro.total
  const vazio = (motivo: RelatoF4['motivo']): { els: El[]; relato: RelatoF4; total: number } => ({ els: [...els], total: T, relato: { aplicado: false, motivo, clipes: 0, planos: 0, cortes: [], emFrase: 0, punchEm: null, trechos: [], loopPorFalta: 0, cta: false, total: T } })
  if (els.some((e) => e.type === 'image' && Number(e.track) === 2)) return vazio('still_na_trilha')
  const planosHoje = els.filter((e) => ehVideo(e, 2))
  if (planosHoje.length === 0) return vazio('sem_clipe')
  const fontes: string[] = []
  for (const e of planosHoje) { const s = String(e.source ?? ''); if (s && !fontes.includes(s)) fontes.push(s) }
  const nClipes = fontes.length
  const modelo = planosHoje[0]
  const primeiroDe = (src: string): El => planosHoje.find((e) => String(e.source) === src) as El
  // segundos conhecidos de cada clipe (claim assinado) ou o limite inferior que a montagem de sempre já mostrou
  const assinados = Array.isArray(clipSeconds) && clipSeconds.length === nClipes && clipSeconds.every((s) => typeof s === 'number' && Number.isFinite(s) && s > 0.5 && s <= 30)
  const segundos = fontes.map((src, c) => {
    if (assinados) return (clipSeconds as ReadonlyArray<number>)[c]
    const mostrado = planosHoje.filter((e) => String(e.source) === src).reduce((m, e) => Math.max(m, (num(e.trim_start) || 0) + num(e.duration)), 0)
    const loopa = planosHoje.filter((e) => String(e.source) === src).every((e) => e.loop === true)
    return loopa ? Math.max(mostrado, FACELESS15_CLIPE_PADRAO_S) : mostrado
  })
  // quantos planos e onde cortar: o reveal é corte fixo quando a cabeça e a cauda cabem
  const p = quadro.payoff
  let cortes: number[]
  let punchEm: number | null = null
  if (p != null && planosPara(p) >= 1 && planosPara(T - p) >= 1) {
    cortes = [...planejarCortesFaceless15(0, p, planosPara(p), quadro.frases), r3(p), ...planejarCortesFaceless15(p, T, planosPara(T - p), quadro.frases)]
    punchEm = r3(p)
  } else {
    const n = planosPara(T)
    if (n === 0) return vazio('curto_demais')
    cortes = planejarCortesFaceless15(0, T, n, quadro.frases)
  }
  const inicios = [0, ...cortes]
  const n = inicios.length
  // o CTA estica o último plano em 1 s (sem fala) — o total do filme cresce
  const ctaOn = opts.cta === true
  const total = ctaOn ? r3(T + FACELESS15_CTA_S) : T
  const usos = new Array(nClipes).fill(0)
  const novos: El[] = []
  const trechos: RelatoF4['trechos'] = []
  let loopPorFalta = 0
  for (let k = 0; k < n; k++) {
    const ini = inicios[k]
    const fim = k + 1 < n ? inicios[k + 1] : total
    const len = r3(fim - ini)
    const c = Math.min(nClipes - 1, Math.floor((k * nClipes) / n))
    usos[c]++
    const base = primeiroDe(fontes[c])
    const cabeca = num(base.trim_start) || TRIM_CABECA_S
    let trim = usos[c] === 1 ? r3(cabeca) : r3((usos[c] - 1) * FACELESS15_TRIM_2O_PLANO_S)
    let loop = base.loop === true && !assinados
    if (trim + len + SOBREPOSICAO_S > segundos[c] + 1e-9) {
      trim = r3(Math.max(cabeca, segundos[c] - len - SOBREPOSICAO_S))
      if (trim + len + SOBREPOSICAO_S > segundos[c] + 1e-9) { loop = true; loopPorFalta++ }
    }
    trechos.push([c, trim, len])
    const zoomIn = k % 2 === 0
    const comum: El = { ...modelo, source: fontes[c], loop }
    delete comum.enter_transition
    if (k === 0 && modelo.enter_transition) comum.enter_transition = modelo.enter_transition
    const zoom = (de: string, para: string): unknown[] => [{ type: 'scale', fade: false, start_scale: de, end_scale: para, easing: 'ease-out' }]
    if (punchEm != null && Math.abs(ini - punchEm) < 1e-6 && len - FACELESS15_PUNCH_S >= 1) {
      // punch no reveal: 0,15 s de 100→104 % e o zoom lento de 104→108 % no resto do plano (mesmo clipe, trecho contínuo)
      novos.push({ ...comum, time: r3(ini), duration: r3(FACELESS15_PUNCH_S + SOBREPOSICAO_S), trim_start: trim, animations: zoom('100%', FACELESS15_PUNCH_ESCALA) })
      novos.push({ ...comum, time: r3(ini + FACELESS15_PUNCH_S), duration: r3(len - FACELESS15_PUNCH_S + SOBREPOSICAO_S), trim_start: r3(trim + FACELESS15_PUNCH_S), animations: zoom(FACELESS15_PUNCH_ESCALA, ZOOM_ESCALA) })
    } else {
      novos.push({ ...comum, time: r3(ini), duration: r3(len + SOBREPOSICAO_S), trim_start: trim, animations: zoom(zoomIn ? '100%' : ZOOM_ESCALA, zoomIn ? ZOOM_ESCALA : '100%') })
    }
  }
  // troca a trilha 2 no lugar onde ela estava; com CTA, estica o que cobre o filme inteiro (fundo, véu, marca d'água) e põe o cartão
  const i0 = els.findIndex((e) => ehVideo(e, 2))
  const semPlanos = els.filter((e) => !ehVideo(e, 2))
  let saida: El[] = [...semPlanos.slice(0, i0), ...novos, ...semPlanos.slice(i0)]
  if (ctaOn) {
    saida = saida.map((e) => (num(e.time) === 0 && Math.abs(num(e.duration) - T) < 1e-6 && (e.type === 'shape' || (e.type === 'text' && Number(e.track) === 9)) ? { ...e, duration: total } : e))
    saida.push({
      type: 'text', track: FACELESS15_CTA_TRACK, time: r3(T), duration: FACELESS15_CTA_S, text: FACELESS15_CTA_TEXTO,
      x: '50%', y: '50%', x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', width: '78%',
      font_family: typeof opts.font === 'string' && opts.font.trim() ? opts.font.trim() : 'Montserrat', font_size: FACELESS15_CTA_FONTE, font_weight: '700', line_height: '105%',
      fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.98)', stroke_width: 3, background_color: 'rgba(0,0,0,0.60)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10,
      enter_transition: { type: 'pop', duration: 0.08 },
    })
  }
  const emFrase = cortes.filter((t) => quadro.frases.some((f) => Math.abs(f - t) < 1e-6)).length
  return { els: saida, total, relato: { aplicado: true, motivo: 'ok', clipes: nClipes, planos: n, cortes, emFrase, punchEm, trechos, loopPorFalta, cta: ctaOn, total } }
}

// ── a aplicação (F1/F3/F4 em cima do source montado) ─────────────────────────────────────────────────────────────────
export interface ContextoFaceless15 {
  whisperWords?: ReadonlyArray<WhisperWord> | null
  /** Segundos REAIS de cada clipe (claim assinado, via /api/compose), alinhados à ordem dos clipes. */
  clipSeconds?: ReadonlyArray<number> | null
  /** Fonte da legenda para a língua (captionFontFor). */
  font?: string | null
  /** Catálogo de SFX (padrão SFX_FACELESS15; o guardião passa um com url null para provar o slot vazio). */
  sfx?: typeof SFX_FACELESS15
}

export interface RelatoFaceless15 {
  ativo: boolean
  motivo: string
  fases: FaseFaceless15[]
  f1?: RelatoF1
  f3?: RelatoF3
  f4?: RelatoF4
  erros?: string[]
}

/**
 * Reescreve o source montado por lib/compose com as fases ligadas. Decisão inativa = devolve sem TOCAR no source
 * (byte a byte o de sempre). Cada fase roda protegida: falha numa fase = a fase não entra, as outras seguem, o filme sai.
 * Chamar SÍNCRONO, logo depois de buildCreatomateSource (antes de qualquer await): usa buildCaptionElements, que lê o
 * quadro/fonte fixados pela mesma montagem (ver ACTIVE_ASPECT em lib/compose).
 */
export function aplicarFaceless15(source: Record<string, unknown>, decisao: Faceless15Decisao, ctx: ContextoFaceless15 = {}): RelatoFaceless15 {
  if (!decisao || !decisao.ativo) return { ativo: false, motivo: decisao ? decisao.motivo : 'sem_decisao', fases: [] }
  const relato: RelatoFaceless15 = { ativo: true, motivo: 'ok', fases: [...decisao.fases] }
  const erros: string[] = []
  const elsOriginais = (source as { elements?: unknown }).elements
  if (!Array.isArray(elsOriginais) || !(num(source.duration) > 0)) return { ativo: false, motivo: 'sem_source', fases: [] }
  let els: El[] = elsOriginais as El[]
  const fases = new Set(decisao.fases)
  const quadroDe = (lista: ReadonlyArray<El>): QuadroFaceless15 => lerQuadroFaceless15({ ...source, elements: lista }, ctx.whisperWords)
  // F4 primeiro: os cortes dela são os que a F3 marca com whoosh; o CTA estica o filme, e o total novo vale para o resto
  if (fases.has('f4')) {
    try {
      const r = aplicarF4Faceless15(els, quadroDe(els), ctx.clipSeconds, { cta: fases.has('cta'), font: ctx.font })
      if (r.relato.aplicado) {
        els = r.els
        ;(source as { duration: number }).duration = r.total
      }
      relato.f4 = r.relato
    } catch (err) { erros.push(`f4:${err instanceof Error ? err.message : String(err)}`) }
  }
  if (fases.has('f1')) {
    try {
      const r = aplicarF1Faceless15(els, quadroDe(els), ctx.whisperWords)
      els = r.els
      relato.f1 = r.relato
    } catch (err) { erros.push(`f1:${err instanceof Error ? err.message : String(err)}`) }
  }
  if (fases.has('f3')) {
    try {
      const r = aplicarF3Faceless15(els, quadroDe(els), relato.f4?.aplicado ? relato.f4.cortes : cortesDaTrilha2(els), ctx.sfx ?? SFX_FACELESS15)
      els = r.els
      relato.f3 = r.relato
    } catch (err) { erros.push(`f3:${err instanceof Error ? err.message : String(err)}`) }
  }
  ;(source as { elements: unknown[] }).elements = els
  if (erros.length) relato.erros = erros
  return relato
}
