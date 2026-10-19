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

import { buildCaptionElements, buildCaptionsFromWhisperWords, sentenceStartTimes, type WhisperWord } from '@/lib/compose'
import { withHookFirstFrame, GANCHO_1Q_TRACK, type HookFirstFrameResult } from '@/lib/hookFirstFrame'

export type FaseFaceless15 = 'f1' | 'f2' | 'f3' | 'f4' | 'cta'
export const FASES_FACELESS15: readonly FaseFaceless15[] = ['f1', 'f2', 'f3', 'f4', 'cta']

/**
 * INTERRUPTORES PÚBLICOS — false = só conta interna, por pedido (formatFlags). Trocar para true liga a fase para TODOS
 * os clientes do formato (depois da nota ≥ 9 do fundador naquela fase, regra do §4 do estudo).
 *   f1  legenda a 62 %, ≤5 palavras, 64/80 px, −120 ms, linha amarela só no PAYOFF
 *   f2  gancho escrito no 1º quadro (lib/hookFirstFrame) liberado no formato
 *   f3  música a 18 % com ducking em dois elementos + 3 SFX (riser · whoosh · pop)
 *   f4  5 planos de ~3 s a partir dos 3 clipes (2º plano = mesmo clipe, trim 3,0 s) + punch no reveal
 *   cta cartão de texto de 1 s no fim ("Follow for part 2 →") — opcional, exige f4, desligado por padrão
 */
export const FACELESS15_PUBLIC: Readonly<Record<FaseFaceless15, boolean>> = { f1: false, f2: false, f3: false, f4: false, cta: false }

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
    const caps = buildCaptionsFromWhisperWords(whisperWords as WhisperWord[], fimJanela, 0, FACELESS15_LEGENDA_PALAVRAS)
    const primeiraFraseAcaba = (() => {
      const w = whisperWords.find((x) => x.sentenceEnd === true)
      return w && Number.isFinite(w.end) ? Math.min(6, Math.max(JANELA_GANCHO_S, w.end)) : JANELA_GANCHO_S
    })()
    chunks = caps.length
    caps.forEach((cap, i) => {
      // −120 ms em cima da PALAVRA (não do chunk de lib/compose, que já entra 150 ms depois dela): o chunk nasce em
      // start−0,12 e acaba onde o seguinte nasce; cada palavra do karaokê anda os mesmos 0,12 s. O último chunk termina
      // no fim da fala, como sempre. Contíguo por construção: nunca dois elementos ao mesmo tempo na trilha 5.
      const raw0 = cap.words[0]?.start ?? cap.time
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
/** Lyria a 18 % (hoje 12 % em lib/compose MUSIC_VOLUME); 10 % sob o payoff (≈ −5 dB: dentro dos 6–12 dB do CapCut). */
export const FACELESS15_MUSICA_VOLUME = '18%'
export const FACELESS15_MUSICA_DUCK = '10%'
/** Espelhos de MUSIC_FADE_IN_SECONDS / MUSIC_FADE_OUT_SECONDS (lib/compose). */
export const FACELESS15_MUSICA_FADE_IN_S = 0.8
export const FACELESS15_MUSICA_FADE_OUT_S = 1.2
/** O fade curto nas junções dos dois volumes — o mesmo truque do Ads (lib/ads/adV2Montage: música em 2 elementos, 0,3 s). */
export const FACELESS15_MUSICA_JUNCAO_S = 0.3
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
  musica: 'ducking' | 'sem_payoff' | 'sem_trilha'
  /** [início do duck, fim do duck] em s, quando há ducking. */
  duck: [number, number] | null
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
  const relato: RelatoF3 = { musica: 'sem_trilha', duck: null, sfx: 'slot_vazio', cortes: [...cortes] }
  // ── música: um elemento vira três (18 % · 10 % sob o payoff · 18 % com o fade de saída), contínuos no tempo e no trecho
  const iMus = saida.findIndex((e) => ehAudio(e, 8))
  if (iMus >= 0) {
    const m = saida[iMus]
    const base: El = { type: 'audio', track: 8, source: m.source, loop: true }
    const fadeIn = r3(Math.min(FACELESS15_MUSICA_FADE_IN_S, T / 2))
    const fadeOut = r3(Math.min(FACELESS15_MUSICA_FADE_OUT_S, T / 2))
    const p = quadro.payoff
    const fimDuck = r3(T - fadeOut)
    if (p != null && p + 0.5 < fimDuck) {
      const segs: El[] = [
        { ...base, time: 0, duration: r3(p), volume: FACELESS15_MUSICA_VOLUME, audio_fade_in: fadeIn, audio_fade_out: FACELESS15_MUSICA_JUNCAO_S },
        { ...base, time: r3(p), duration: r3(fimDuck - p), trim_start: r3(p), volume: FACELESS15_MUSICA_DUCK, audio_fade_in: FACELESS15_MUSICA_JUNCAO_S, audio_fade_out: FACELESS15_MUSICA_JUNCAO_S },
        { ...base, time: fimDuck, duration: r3(T - fimDuck), trim_start: fimDuck, volume: FACELESS15_MUSICA_VOLUME, audio_fade_in: FACELESS15_MUSICA_JUNCAO_S, audio_fade_out: fadeOut },
      ]
      saida.splice(iMus, 1, ...segs)
      relato.musica = 'ducking'
      relato.duck = [r3(p), fimDuck]
    } else {
      saida.splice(iMus, 1, { ...base, time: 0, duration: T, volume: FACELESS15_MUSICA_VOLUME, audio_fade_in: fadeIn, audio_fade_out: fadeOut })
      relato.musica = 'sem_payoff'
    }
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
  if (fases.has('f1')) {
    try {
      const r = aplicarF1Faceless15(els, quadroDe(els), ctx.whisperWords)
      els = r.els
      relato.f1 = r.relato
    } catch (err) { erros.push(`f1:${err instanceof Error ? err.message : String(err)}`) }
  }
  if (fases.has('f3')) {
    try {
      const r = aplicarF3Faceless15(els, quadroDe(els), cortesDaTrilha2(els), ctx.sfx ?? SFX_FACELESS15)
      els = r.els
      relato.f3 = r.relato
    } catch (err) { erros.push(`f3:${err instanceof Error ? err.message : String(err)}`) }
  }
  ;(source as { elements: unknown[] }).elements = els
  if (erros.length) relato.erros = erros
  return relato
}
