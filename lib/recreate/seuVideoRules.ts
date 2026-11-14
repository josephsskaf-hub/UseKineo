// Browser-safe shared rules. Provider selection, model names and supplier costs stay in seuVideo.ts.
import { recreateCreditCost } from '@/lib/checkoutPricing'

export const SEU_VIDEO_LIMITES = { minSegundos: 2, maxSegundos: 15, minFps: 24, maxFps: 60, maxBytes: 100 * 1024 * 1024, maxFotos: 3, maxPrompt: 900 } as const
export const SEU_VIDEO_TIPOS = ['video/mp4', 'video/quicktime'] as const

// ── leitor de MP4/MOV (ISO BMFF) por pedaços: só o cabeçalho (moov), nunca o vídeo inteiro ──────────────────────────────────────────────
export interface MetaDoVideo { segundos: number; fps: number; largura: number; altura: number }
type Ler = (inicio: number, fim: number) => Promise<Uint8Array>
const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]
const u64 = (b: Uint8Array, o: number) => u32(b, o) * 4294967296 + u32(b, o + 4)
const tipo = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])
function* caixas(b: Uint8Array, ini: number, fim: number): Generator<{ t: string; ini: number; fim: number; o: number }> {
  let o = ini
  while (o + 8 <= fim) {
    let tam = u32(b, o), cab = 8
    if (tam === 1) { tam = u64(b, o + 8); cab = 16 } else if (tam === 0) tam = fim - o
    if (tam < cab || o + tam > fim) return
    yield { t: tipo(b, o + 4), ini: o + cab, fim: o + tam, o }
    o += tam
  }
}
const filho = (b: Uint8Array, c: { ini: number; fim: number }, t: string) => { for (const x of caixas(b, c.ini, c.fim)) if (x.t === t) return x; return null }
/** Lê a caixa moov e devolve duração, quadros por segundo e tamanho da trilha de vídeo; null = não é MP4/MOV legível. */
export function metaDoMoov(moov: Uint8Array): MetaDoVideo | null {
  const raiz = { ini: 0, fim: moov.length }
  for (const trak of caixas(moov, raiz.ini, raiz.fim)) {
    if (trak.t !== 'trak') continue
    const mdia = filho(moov, trak, 'mdia'), hdlr = mdia && filho(moov, mdia, 'hdlr')
    if (!mdia || !hdlr || tipo(moov, hdlr.ini + 8) !== 'vide') continue
    const mdhd = filho(moov, mdia, 'mdhd'), tkhd = filho(moov, trak, 'tkhd')
    const stts = (() => { const minf = filho(moov, mdia, 'minf'), stbl = minf && filho(moov, minf, 'stbl'); return stbl && filho(moov, stbl, 'stts') })()
    if (!mdhd || !tkhd || !stts) return null
    const v1 = moov[mdhd.ini] === 1
    const escala = v1 ? u32(moov, mdhd.ini + 20) : u32(moov, mdhd.ini + 12)
    const duracao = v1 ? u64(moov, mdhd.ini + 24) : u32(moov, mdhd.ini + 16)
    let amostras = 0
    const n = u32(moov, stts.ini + 4)
    for (let i = 0; i < n; i++) amostras += u32(moov, stts.ini + 8 + i * 8)
    if (!escala || !duracao || !amostras) return null
    const segundos = duracao / escala
    return { segundos, fps: amostras / segundos, largura: u32(moov, tkhd.fim - 8) / 65536, altura: u32(moov, tkhd.fim - 4) / 65536 }
  }
  return null
}
/** Percorre as caixas do topo por pedaços (ftyp, mdat… até a moov, no começo ou no fim do arquivo). Nunca lança: erro = null. */
export async function lerMetaDoVideo(ler: Ler, bytes: number): Promise<MetaDoVideo | null> {
  try {
    let o = 0
    for (let passo = 0; passo < 12 && o + 8 <= bytes; passo++) {
      const cab = await ler(o, Math.min(bytes, o + 16) - 1)
      let tam = u32(cab, 0)
      if (tam === 1) tam = u64(cab, 8); else if (tam === 0) tam = bytes - o
      if (tam < 8 || o + tam > bytes) return null
      if (tipo(cab, 4) === 'moov') {
        if (tam > 8 * 1024 * 1024) return null
        const moov = await ler(o, o + tam - 1)
        const h = u32(moov, 0) === 1 ? 16 : 8
        return metaDoMoov(moov.subarray(h))
      }
      o += tam
    }
    return null
  } catch {
    return null
  }
}

/**
 * Tira o som de um MP4/MOV sem reescrever o arquivo: toda
 * trilha de áudio (hdlr 'soun') do moov vira uma caixa 'free' do MESMO tamanho (os players a ignoram; nenhum offset muda). Devolve uma
 * cópia; arquivo ilegível ou sem áudio volta igual. Pura.
 */
export function silenciarMp4(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes)
  try {
    for (const top of caixas(out, 0, out.length)) {
      if (top.t !== 'moov') continue
      for (const trak of caixas(out, top.ini, top.fim)) {
        if (trak.t !== 'trak') continue
        const mdia = filho(out, trak, 'mdia'), hdlr = mdia && filho(out, mdia, 'hdlr')
        if (hdlr && tipo(out, hdlr.ini + 8) === 'soun') out.set([0x66, 0x72, 0x65, 0x65], trak.o + 4) // 'free'
      }
    }
  } catch {
    return new Uint8Array(bytes)
  }
  return out
}

/** Duração gerada legada: o vídeo arredondado, entre 4 e 15 segundos. */
export const segundosGerados = (segundosDoVideo: number) => Math.min(SEU_VIDEO_LIMITES.maxSegundos, Math.max(4, Math.round(segundosDoVideo)))
/** A tabela de HOJE do Recreate (lib/checkoutPricing RECREATE_PRICING), sem preço novo: até 10 s = a tarifa de 10 s; 11 a 15 s = a de 15 s. */
export const creditosDoSeuVideo = (gerados: number): number | null => recreateCreditCost(gerados <= 10 ? 10 : 15)
const PAPEIS = ['The main person in @Video1', 'The second person in @Video1', 'The third person in @Video1']
export function promptPadrao(fotos: number, posicoes: ReadonlyArray<string> = []): string {
  const n = Math.min(3, Math.max(1, fotos))
  const quem = Array.from({ length: n }, (_, i) => {
    const pos = String(posicoes[i] ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').trim().slice(0, 60)
    return `${pos ? `The person ${pos} in @Video1` : PAPEIS[i]} is the person from @Image${i + 1}, with the same face.`
  }).join(' ')
  return `Recreate @Video1 exactly: the same choreography, movements and timing, with the same framing and camera as @Video1 and the same scene. ${quem} Everyone else and everything else stays as in @Video1. No logos, no watermark, no readable text.`
}
/** O prompt editado: até 900 caracteres, cita @Video1 e TODA foto enviada; fora disso, a recusa (nada cobrado). */
export function validarPrompt(prompt: unknown, fotos: number): { ok: true; prompt: string } | { ok: false; error: string } {
  const t = typeof prompt === 'string' ? prompt.replace(/\s+/g, ' ').trim() : ''
  if (!t) return { ok: false, error: 'Write what should change in the video. Nothing was charged.' }
  if (t.length > SEU_VIDEO_LIMITES.maxPrompt) return { ok: false, error: 'Keep the description under 900 characters. Nothing was charged.' }
  if (!t.includes('@Video1')) return { ok: false, error: 'Keep @Video1 in the description. Nothing was charged.' }
  for (let i = 1; i <= fotos; i++) if (!t.includes(`@Image${i}`)) return { ok: false, error: `Say who becomes the person in @Image${i}. Nothing was charged.` }
  if (/@Image[4-9]/.test(t) || (fotos < 3 && new RegExp(`@Image[${fotos + 1}-3]`).test(t))) return { ok: false, error: 'The description mentions a photo you did not add. Nothing was charged.' }
  return { ok: true, prompt: t }
}

/** Public presentation is selected on the server; no provider identifier or supplier price crosses this type. */
export type SeuVideoGender = 'man' | 'woman'
export type SeuVideoPresentation = Readonly<{
  resolution: string
  audio: 'silent' | 'original'
  waitLabel: string
  minSeconds: number
  maxSeconds: number
  minSide: number
  maxBytes: number
  minFps: number
  maxFps: number
}>
const SUBJECTS = ['the main person', 'the second person', 'the third person']
/** Explicit choice per photo. Never infer a person's gender from a photo or a missing selection. */
export function promptPorGenero(genders: readonly SeuVideoGender[], positions: readonly string[] = []): string {
  if (!Array.isArray(genders) || genders.length < 1 || genders.length > 3 || genders.some(g => g !== 'man' && g !== 'woman')) throw new RangeError('Choose Man or Woman for each photo.')
  const replacements = genders.map((gender, i) => {
    const position = String(positions[i] ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').trim().slice(0, 60)
    const subject = position ? 'the person ' + position : SUBJECTS[i]
    return 'Replace ' + subject + ' in @Video1 with the ' + gender + ' from @Image' + (i + 1) + ': ' + (gender === 'man' ? 'his' : 'her') + ' face and hair match @Image' + (i + 1) + '.'
  }).join(' ')
  return replacements + ' Keep the choreography, timing, camera, framing, background and lighting of @Video1 exactly. Keep the original clothing from @Video1.'
}
