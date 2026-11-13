// ═══ KINEO-RECREATE-SEU-VIDEO-1311 [dono 13/11 ~19:55: "eu quero recreate pra hoje funcionando em qualquer video que eu quiser"] ═══════════
// O Recreate "com o seu vídeo": o cliente envia o vídeo (2 a 15 s) e de 1 a 3 fotos; o motor é o Seedance 2.5 por vídeo de referência
// (bytedance/seedance-2.5/reference-to-video, task "reference", @Video1 e @Image1…), 480p, sem som gerado. Os 2 testes pagos de 13/11
// passaram na 1ª leitura (docs/decisoes-1311/prova-genjutsu-teste1-1311.md, prova-trio-teste2-1311.md).
// Débito, envio, estorno e idempotência: submitClip (lib/clips/clipFlow), como o Recreate de catálogo. A trava "não trocou" do catálogo não se
// aplica (ela compara com o vídeo-base da casa e só roda no modelo do Recast).
// Interruptor SEU_VIDEO_RELEASE: 'internal' = só contas da casa (isInternalEmail) até 3 provas aprovadas; 'off' = 404 para todos.
// Guardião: scripts/test-recreate-seu-video-1311.mjs.
import { recreateCreditCost } from '@/lib/checkoutPricing'
import type { InternalRelease } from './release'

export const SEU_VIDEO_RELEASE: InternalRelease = 'internal'
export const SEU_VIDEO_VERSAO = 'recreate_seu_video_1311_v2' // v2: trava "não trocou" no Seedance + enquadramento no prompt (CEO 13/11)
export const SEEDANCE25_MODEL = 'bytedance/seedance-2.5/reference-to-video'
/** fal, 480p: soma os segundos ENVIADOS e os GERADOS (conta da sessão Research de 13/11). */
export const SEEDANCE25_USD_POR_SEGUNDO_480P = 0.1323
export const SEU_VIDEO_LIMITES = { minSegundos: 2, maxSegundos: 15, minFps: 24, maxFps: 60, maxBytes: 100 * 1024 * 1024, maxFotos: 3, maxPrompt: 900 } as const
export const SEU_VIDEO_PASTA = 'recreate-uploads'
export const SEU_VIDEO_TIPOS = ['video/mp4', 'video/quicktime'] as const

// ── leitor de MP4/MOV (ISO BMFF) por pedaços: só o cabeçalho (moov), nunca o vídeo inteiro ──────────────────────────────────────────────
export interface MetaDoVideo { segundos: number; fps: number; largura: number; altura: number }
type Ler = (inicio: number, fim: number) => Promise<Uint8Array>
const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]
const u64 = (b: Uint8Array, o: number) => u32(b, o) * 4294967296 + u32(b, o + 4)
const tipo = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])
function* caixas(b: Uint8Array, ini: number, fim: number): Generator<{ t: string; ini: number; fim: number }> {
  let o = ini
  while (o + 8 <= fim) {
    let tam = u32(b, o), cab = 8
    if (tam === 1) { tam = u64(b, o + 8); cab = 16 } else if (tam === 0) tam = fim - o
    if (tam < cab || o + tam > fim) return
    yield { t: tipo(b, o + 4), ini: o + cab, fim: o + tam }
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

/** O cabeçalho de um vídeo por URL (HEAD + Range; fetch injetado). Nunca lança: erro = null. Usado pela trava "não trocou" no Seedance. */
export async function metaPorUrl(url: string, f: typeof fetch): Promise<MetaDoVideo | null> {
  try {
    const head = await f(url, { method: 'HEAD', cache: 'no-store' })
    const bytes = head.ok ? Number(head.headers.get('content-length') ?? 0) : 0
    if (!bytes) return null
    return await lerMetaDoVideo(async (ini, fim) => {
      const r = await f(url, { headers: { Range: `bytes=${ini}-${fim}` }, cache: 'no-store' })
      if (r.status !== 206 && r.status !== 200) throw new Error(`range ${r.status}`)
      const b = new Uint8Array(await r.arrayBuffer())
      return r.status === 200 ? b.subarray(ini, fim + 1) : b
    }, bytes)
  } catch {
    return null
  }
}

// ── validação, duração gerada, preço ───────────────────────────────────────────────────────────────────────────────────────────────
export type RecusaDoVideo = { ok: false; code: 'format' | 'duration' | 'fps' | 'size'; error: string }
export function validarVideo(meta: MetaDoVideo | null, bytes: number, contentType: string): { ok: true } | RecusaDoVideo {
  const L = SEU_VIDEO_LIMITES
  if (!(SEU_VIDEO_TIPOS as readonly string[]).includes(contentType) || !meta) return { ok: false, code: 'format', error: 'Send an MP4 or MOV video. Nothing was charged.' }
  if (bytes > L.maxBytes) return { ok: false, code: 'size', error: 'Send a video up to 100 MB. Nothing was charged.' }
  if (meta.segundos < L.minSegundos || meta.segundos > L.maxSegundos + 0.25) return { ok: false, code: 'duration', error: `Send a video between ${L.minSegundos} and ${L.maxSegundos} seconds long. Yours has ${meta.segundos.toFixed(1)} s. Nothing was charged.` }
  if (meta.fps < L.minFps - 0.5 || meta.fps > L.maxFps + 0.5) return { ok: false, code: 'fps', error: `Send a video recorded at 24 to 60 frames per second. Yours has ${Math.round(meta.fps)}. Nothing was charged.` }
  return { ok: true }
}
/** O Seedance 2.5 aceita duration inteira de 4 a 30: o vídeo arredondado, entre 4 e 15. */
export const segundosGerados = (segundosDoVideo: number) => Math.min(SEU_VIDEO_LIMITES.maxSegundos, Math.max(4, Math.round(segundosDoVideo)))
/** A tabela de HOJE do Recreate (lib/checkoutPricing RECREATE_PRICING), sem preço novo: até 10 s = a tarifa de 10 s; 11 a 15 s = a de 15 s. */
export const creditosDoSeuVideo = (gerados: number): number | null => recreateCreditCost(gerados <= 10 ? 10 : 15)
export const custoFalDoSeuVideo = (segundosDoVideo: number, gerados: number) => Math.round((segundosDoVideo + gerados) * SEEDANCE25_USD_POR_SEGUNDO_480P * 10000) / 10000
/** O formato da saída mais perto do vídeo enviado (o motor refaz a cena; o enquadramento acompanha o original). */
export function proporcaoDoVideo(largura: number, altura: number): string {
  const r = largura > 0 && altura > 0 ? largura / altura : 9 / 16
  const opcoes: Array<[string, number]> = [['9:16', 9 / 16], ['3:4', 3 / 4], ['1:1', 1], ['4:3', 4 / 3], ['16:9', 16 / 9]]
  return opcoes.reduce((a, b) => (Math.abs(Math.log(b[1] / r)) < Math.abs(Math.log(a[1] / r)) ? b : a))[0]
}

// ── o prompt pronto (código) e o que a pessoa pode editar ─────────────────────────────────────────────────────────────────────────────
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
/** O caminho do vídeo do cliente no bucket: só a pasta dele, só mp4/mov. */
export function caminhoDoCliente(path: unknown, userId: string): string | null {
  const p = typeof path === 'string' ? path.trim() : ''
  return new RegExp(`^${SEU_VIDEO_PASTA}/${userId}/[0-9a-f-]{36}\\.(?:mp4|mov)$`).test(p) ? p : null
}
/**
 * Recusa do motor (no envio: provider_rejected; no fim: provider_failed): o Seedance 2.5 recusa com 422 alguns rostos reais e cenas
 * sensíveis. O estorno é o de sempre (submitClip/settleClip: closeWithRefund e fail chamam deps.refund); aqui só a frase da tela, a da
 * CEO de 13/11, palavra por palavra. null = não é recusa do motor.
 */
export const FRASE_RECUSA_DO_MOTOR = 'The engine did not accept this photo. Nothing was charged. Try another photo.'
export function recusaDoMotor(code: string | null | undefined): string | null {
  return code === 'provider_rejected' || code === 'provider_failed' ? FRASE_RECUSA_DO_MOTOR : null
}
// ── Entrega B (CEO 13/11): o som ORIGINAL do vídeo do cliente volta pela montagem da casa (Creatomate, a mesma da marca dos clipes) ──────
// Nada de som gerado e nada de ffmpeg no servidor. Falhou a montagem = o clipe sai mudo (como na Entrega A), nunca fica preso.
/** ⚠ Interruptor: false = o clipe sai mudo, byte a byte a Entrega A. */
export const SEU_VIDEO_SOM_ORIGINAL = true
/**
 * O som que entra na montagem: a URL do vídeo original, lida da impressão do pedido (submitClip grava [pedido, modelo, entrada da fal]).
 * Só o Seedance 2.5 e só o arquivo do PRÓPRIO dono no nosso bucket (recreate-uploads/<dono>/<uuid>.mp4|mov). Fora disso: null. Pura.
 */
export function somOriginalDaLinha(row: { model: string | null; fingerprint: string | null; user_id: string; seconds: number }, supabaseUrl: string, ligado: boolean = SEU_VIDEO_SOM_ORIGINAL): { url: string; seconds: number } | null {
  if (!ligado || row.model !== SEEDANCE25_MODEL || !row.fingerprint || !supabaseUrl) return null
  try {
    const p = JSON.parse(row.fingerprint) as unknown
    if (!Array.isArray(p) || p[1] !== SEEDANCE25_MODEL || !p[2] || typeof p[2] !== 'object') return null
    const url = (p[2] as { video_urls?: unknown }).video_urls
    const u = Array.isArray(url) && typeof url[0] === 'string' ? url[0] : ''
    const dono = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/renders/${SEU_VIDEO_PASTA}/${row.user_id}/`
    return u.startsWith(dono) && /^[0-9a-f-]{36}\.(?:mp4|mov)$/.test(u.slice(dono.length)) ? { url: u, seconds: row.seconds } : null
  } catch {
    return null
  }
}
// ── Entrega C (CEO 13/11): os 3 formatos do catálogo que o motor antigo (Recast) reprovou passam ao Seedance 2.5 ────────────────────
// Outfit Morph (0 de 4 trocas), Elevator (a mulher 0 de 3) e Dance duo (rosto pequeno, 0 de 1). Mesmo preço do catálogo (8/10/15 s da
// tabela de hoje), o vídeo-base da casa sobe ao bucket como hoje, 480p, sem som gerado. Eles continuam só da casa (swapApproved false)
// até a prova paga da CEO; a trava "não trocou" (swapCheck) roda neles também (swapRowContext, redesenho avisado ao juiz).
/** ⚠ Interruptor: false = os 3 voltam ao Recast, byte a byte o de antes. */
export const CATALOGO_SEEDANCE25_LIGADO = true
export const CATALOGO_NO_SEEDANCE25: ReadonlySet<string> = new Set(['outfit-morph', 'elevador', 'duelo-de-danca'])
export const catalogoNoSeedance25 = (formatId: unknown, ligado: boolean = CATALOGO_SEEDANCE25_LIGADO) => ligado && typeof formatId === 'string' && CATALOGO_NO_SEEDANCE25.has(formatId)
/** O prompt do catálogo no motor novo: as pessoas do vídeo da casa viram as das fotos; com swapSubject, só aquela pessoa muda. */
export function promptDoCatalogo(fotos: number, swapSubject?: string): string {
  if (!swapSubject) return promptPadrao(fotos)
  const quem = String(swapSubject).replace(/[^\p{L}\p{N} ,'-]/gu, '').trim()
  const Quem = quem.charAt(0).toUpperCase() + quem.slice(1)
  return `Recreate @Video1 exactly: the same choreography, movements and timing, with the same framing and camera as @Video1 and the same scene. ${Quem} in @Video1 is the person from @Image1, with the same face. Everyone else, including every other person, and everything else stays exactly as in @Video1. No logos, no watermark, no readable text.`
}
/** A entrada exata da fal (o formato dos 2 testes aprovados de 13/11). */
export function entradaSeedance25(a: { prompt: string; fotos: string[]; videoUrl: string; gerados: number; proporcao: string }) {
  return { prompt: a.prompt, task: 'reference', image_urls: a.fotos, video_urls: [a.videoUrl], resolution: '480p', duration: String(a.gerados), aspect_ratio: a.proporcao, generate_audio: false }
}
