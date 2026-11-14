// ═══ KINEO-RECREATE-SEU-VIDEO-1311 [dono 13/11 ~19:55: "eu quero recreate pra hoje funcionando em qualquer video que eu quiser"] ═══════════
// O Recreate "com o seu vídeo": o cliente envia o vídeo (2 a 15 s) e de 1 a 3 fotos; o motor é o Seedance 2.5 por vídeo de referência
// (bytedance/seedance-2.5/reference-to-video, task "reference", @Video1 e @Image1…), 480p, sem som gerado. Os 2 testes pagos de 13/11
// passaram na 1ª leitura (docs/decisoes-1311/prova-genjutsu-teste1-1311.md, prova-trio-teste2-1311.md).
// Débito, envio, estorno e idempotência: submitClip (lib/clips/clipFlow), como o Recreate de catálogo. A trava "não trocou" do catálogo não se
// aplica (ela compara com o vídeo-base da casa e só roda no modelo do Recast).
// Interruptor SEU_VIDEO_RELEASE: 'internal' = só contas da casa (isInternalEmail) até 3 provas aprovadas; 'off' = 404 para todos.
// Guardião: scripts/test-recreate-seu-video-1311.mjs.
import { SEU_VIDEO_LIMITES, SEU_VIDEO_TIPOS, lerMetaDoVideo, promptPadrao } from './seuVideoRules'
import type { MetaDoVideo } from './seuVideoRules'
export { SEU_VIDEO_LIMITES, SEU_VIDEO_TIPOS, lerMetaDoVideo, metaDoMoov, silenciarMp4, segundosGerados, creditosDoSeuVideo, promptPadrao, validarPrompt, promptPorGenero } from './seuVideoRules'
export type { MetaDoVideo, SeuVideoGender, SeuVideoPresentation } from './seuVideoRules'
export { SEU_VIDEO_RELEASE } from './seuVideoRelease'
export const SEU_VIDEO_VERSAO = 'recreate_seu_video_1311_v2' // v2: trava "não trocou" no Seedance + enquadramento no prompt (CEO 13/11)
export const SEEDANCE25_MODEL = 'bytedance/seedance-2.5/reference-to-video'
/** fal, 480p: soma os segundos ENVIADOS e os GERADOS (conta da sessão Research de 13/11). */
export const SEEDANCE25_USD_POR_SEGUNDO_480P = 0.1323
export const SEU_VIDEO_PASTA = 'recreate-uploads'
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

// ═══ KINEO-RECREATE-SOM-VERDADE-1411 [revisor independente + CEO 14/11, (c)] — o vídeo do cliente SEM trilha de som ════════════════════════════════════════
// A montagem do som põe o original por baixo, invisível, com volume 100%. Um original sem trilha de som não tem o que pôr: mandá-lo ao Creatomate
// é gasto sem efeito e um comportamento que nunca foi provado. Então: o cabeçalho (moov) do original é lido por Range; sem trilha 'soun' = a
// montagem do som não entra (quem não paga ainda recebe a marca), o clipe sai mudo e diz isso no status. Leitura que falha = segue como antes.
export const SEU_VIDEO_MUDO_EVENTO = 'recreate_seu_video_mudo' as const
const u32s = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]
const tipos = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])
function* caixasDe(b: Uint8Array, ini: number, fim: number): Generator<{ t: string; ini: number; fim: number }> {
  let o = ini
  while (o + 8 <= fim) {
    let tam = u32s(b, o), cab = 8
    if (tam === 1) { tam = u32s(b, o + 8) * 4294967296 + u32s(b, o + 12); cab = 16 } else if (tam === 0) tam = fim - o
    if (tam < cab || o + tam > fim) return
    yield { t: tipos(b, o + 4), ini: o + cab, fim: o + tam }
    o += tam
  }
}
/** A caixa moov (sem o cabeçalho dela) tem uma trilha de som (hdlr 'soun')? */
export function temTrilhaDeSom(moov: Uint8Array): boolean {
  for (const trak of caixasDe(moov, 0, moov.length)) {
    if (trak.t !== 'trak') continue
    for (const mdia of caixasDe(moov, trak.ini, trak.fim)) {
      if (mdia.t !== 'mdia') continue
      for (const hdlr of caixasDe(moov, mdia.ini, mdia.fim)) if (hdlr.t === 'hdlr' && tipos(moov, hdlr.ini + 8) === 'soun') return true
    }
  }
  return false
}
/** O original tem trilha de som? true | false | null (não deu para ler: quem chama segue como antes). Só o cabeçalho, por Range. Nunca lança. */
export async function trilhaDeSomPorUrl(url: string, f: typeof fetch): Promise<boolean | null> {
  try {
    const head = await f(url, { method: 'HEAD', cache: 'no-store' })
    const bytes = head.ok ? Number(head.headers.get('content-length') ?? 0) : 0
    if (!bytes) return null
    const ler = async (ini: number, fim: number) => {
      const r = await f(url, { headers: { Range: `bytes=${ini}-${fim}` }, cache: 'no-store' })
      if (r.status !== 206 && r.status !== 200) throw new Error(`range ${r.status}`)
      const b = new Uint8Array(await r.arrayBuffer())
      return r.status === 200 ? b.subarray(ini, fim + 1) : b
    }
    let o = 0
    for (let passo = 0; passo < 12 && o + 8 <= bytes; passo++) {
      const cab = await ler(o, Math.min(bytes, o + 16) - 1)
      let tam = u32s(cab, 0)
      if (tam === 1) tam = u32s(cab, 8) * 4294967296 + u32s(cab, 12); else if (tam === 0) tam = bytes - o
      if (tam < 8 || o + tam > bytes) return null
      if (tipos(cab, 4) === 'moov') {
        if (tam > 8 * 1024 * 1024) return null
        const moov = await ler(o, o + tam - 1)
        return temTrilhaDeSom(moov.subarray(u32s(moov, 0) === 1 ? 16 : 8))
      }
      o += tam
    }
    return null
  } catch {
    return null
  }
}

// ── validação, duração gerada, preço ───────────────────────────────────────────────────────────────────────────────────────────────
export type RecusaDoVideo = { ok: false; code: 'format' | 'duration' | 'fps' | 'size' | 'resolution'; error: string } // KINEO-RECREATE-KLING4-1311 — + resolution
export function validarVideo(meta: MetaDoVideo | null, bytes: number, contentType: string, motor: MotorDoSeuVideo = 'seedance25'): { ok: true } | RecusaDoVideo { // KINEO-RECREATE-KLING4-1311 — + motor
  const k = motor === 'kling4' ? validarParaKling4(meta) : null // KINEO-RECREATE-KLING4-1311
  if (k && meta && (SEU_VIDEO_TIPOS as readonly string[]).includes(contentType) && bytes <= SEU_VIDEO_LIMITES.maxBytes) return k // KINEO-RECREATE-KLING4-1311
  const L = SEU_VIDEO_LIMITES
  if (!(SEU_VIDEO_TIPOS as readonly string[]).includes(contentType) || !meta) return { ok: false, code: 'format', error: 'Send an MP4 or MOV video. Nothing was charged.' }
  if (bytes > L.maxBytes) return { ok: false, code: 'size', error: 'Send a video up to 100 MB. Nothing was charged.' }
  if (meta.segundos < L.minSegundos || meta.segundos > L.maxSegundos + 0.25) return { ok: false, code: 'duration', error: `Send a video between ${L.minSegundos} and ${L.maxSegundos} seconds long. Yours has ${meta.segundos.toFixed(1)} s. Nothing was charged.` }
  if (meta.fps < L.minFps - 0.5 || meta.fps > L.maxFps + 0.5) return { ok: false, code: 'fps', error: `Send a video recorded at 24 to 60 frames per second. Yours has ${Math.round(meta.fps)}. Nothing was charged.` }
  return { ok: true }
}
// ═══ KINEO-RECREATE-KLING4-1311 [dono 13/11, prioridade nº 1; CEO 13/11] — o "seu vídeo" no Kling 4.0 edição (kling/v4/video-to-video/edit) ═══
// Prova da CEO de 13/11 21:20 (playground, a mesma foto de rosto real que o Seedance recusou): 77 s, US$ 0,94 por 5 s em 720p; trocou rosto e
// cabelo e MANTEVE roupa, cena, enquadramento, dança e giro. A página não tem termos de acesso (nem B2B, nem end_user_id).
// Schema lido em 13/11 (fal.ai/models/kling/v4/video-to-video/edit/api): prompt (@Video1, @ImageN), video_url de 3 a 30,05 s, 700 a 4.553 px
// POR LADO, 23,9 a 60 fps, até 300 MB; image_urls; duration (padrão = a do vídeo); resolution 720p|1080p (PADRÃO 1080p: mandamos 720p);
// aspect_ratio (omitido = o do vídeo). Sem task. O Kling GERA uma faixa de som: ela sai do arquivo antes de guardar (silenciarMp4) e o som
// do cliente volta pela montagem da Entrega B.
// Preço (página): US$ 0,094/s em 720p sobre entrada + saída, mínimo 2× a saída. Vídeo abaixo de 700 px num lado: RECUSA no check (ampliar
// seria uma chamada paga a mais e piora a nitidez do rosto; vídeo de celular já sai em 720p ou mais).
// Interruptor SEU_VIDEO_MOTOR: 'kling4' (padrão) | 'seedance25' (o caminho anterior, intacto).
export type MotorDoSeuVideo = 'kling4' | 'seedance25'
export const SEU_VIDEO_MOTOR: MotorDoSeuVideo = 'kling4'
export const KLING4_EDIT_MODEL = 'kling/v4/video-to-video/edit'
export const KLING4_USD_POR_SEGUNDO_720P = 0.094
export const KLING4_LIMITES = { minLado: 700, minSegundos: 3 } as const
export const modeloDoMotor = (motor: MotorDoSeuVideo) => (motor === 'kling4' ? KLING4_EDIT_MODEL : SEEDANCE25_MODEL)
/** Os modelos do "seu vídeo" (a frase da recusa, o som original, a trava). */
export const ehModeloDoSeuVideo = (model: unknown) => model === KLING4_EDIT_MODEL || model === SEEDANCE25_MODEL
/** Custo fal do Kling 4.0 edição em 720p: US$ 0,094/s sobre entrada + saída, mínimo 2× a saída (a saída tem a duração do vídeo). */
export const custoFalKling4 = (segundosDoVideo: number, segundosDaSaida: number = segundosDoVideo) =>
  Math.round(KLING4_USD_POR_SEGUNDO_720P * Math.max(segundosDoVideo + segundosDaSaida, 2 * segundosDaSaida) * 10000) / 10000
function validarParaKling4(meta: MetaDoVideo | null): RecusaDoVideo | null {
  if (!meta) return null
  if (meta.segundos < KLING4_LIMITES.minSegundos) return { ok: false, code: 'duration', error: `Send a video between ${KLING4_LIMITES.minSegundos} and ${SEU_VIDEO_LIMITES.maxSegundos} seconds long. Yours has ${meta.segundos.toFixed(1)} s. Nothing was charged.` }
  if (Math.min(meta.largura, meta.altura) < KLING4_LIMITES.minLado) return { ok: false, code: 'resolution', error: `Send a video of at least 700 pixels on each side (720p or more). Yours is ${Math.round(meta.largura)}×${Math.round(meta.altura)}. Nothing was charged.` }
  return null
}
const ORDEM = ['the main person', 'the second person', 'the third person']
/** O prompt pronto do Kling (neutro de gênero): troca a(s) pessoa(s) e mantém roupa, cena, câmera e coreografia. Editável. */
export function promptKling4(fotos: number, posicoes: ReadonlyArray<string> = []): string {
  const n = Math.min(3, Math.max(1, fotos))
  const quem = Array.from({ length: n }, (_, i) => {
    const pos = String(posicoes[i] ?? '').replace(/[^\p{L}\p{N} ,'-]/gu, '').trim().slice(0, 60)
    return `${pos ? `the person ${pos}` : ORDEM[i]} in @Video1 with the person from @Image${i + 1}`
  }).join(', and ')
  return `Replace ${quem}: their face and hair match ${n === 1 ? '@Image1' : 'their photo'}. Keep the choreography, timing, camera, framing, background and lighting of @Video1 exactly. Keep the original clothing from @Video1. No logos, no watermark, no readable text.`
}
/** O prompt pronto do motor ligado. */
export const promptDoSeuVideo = (motor: MotorDoSeuVideo, fotos: number, posicoes: ReadonlyArray<string> = []) => (motor === 'kling4' ? promptKling4(fotos, posicoes) : promptPadrao(fotos, posicoes))
/** A entrada exata do Kling (a da prova da CEO): sem duration (= a do vídeo) e sem aspect_ratio (= o do vídeo), 720p. */
export function entradaKling4(a: { prompt: string; fotos: string[]; videoUrl: string }) {
  return { prompt: a.prompt, video_url: a.videoUrl, image_urls: a.fotos, resolution: '720p' }
}

export const custoFalDoSeuVideo = (segundosDoVideo: number, gerados: number) => Math.round((segundosDoVideo + gerados) * SEEDANCE25_USD_POR_SEGUNDO_480P * 10000) / 10000
/** O formato da saída mais perto do vídeo enviado (o motor refaz a cena; o enquadramento acompanha o original). */
export function proporcaoDoVideo(largura: number, altura: number): string {
  const r = largura > 0 && altura > 0 ? largura / altura : 9 / 16
  const opcoes: Array<[string, number]> = [['9:16', 9 / 16], ['3:4', 3 / 4], ['1:1', 1], ['4:3', 4 / 3], ['16:9', 16 / 9]]
  return opcoes.reduce((a, b) => (Math.abs(Math.log(b[1] / r)) < Math.abs(Math.log(a[1] / r)) ? b : a))[0]
}

// ── o prompt pronto (código) e o que a pessoa pode editar ─────────────────────────────────────────────────────────────────────────────
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
// KINEO-RECREATE-SOM-DESLIGA-1311 [CEO 13/11 22:05, prova paga pela nossa chave] — DESLIGADO: nas provas dos clipes 19e29401 e 28f2edcd a
// montagem do som entregou a IMAGEM do vídeo ORIGINAL no lugar da saída do motor (SSIM entregue × origem = 0,99; entregue × saída do motor
// = 0,90; os dois entregues idênticos entre si, SSIM 1,00). O elemento "audio" com um MP4 como fonte cobre o quadro com o vídeo do cliente.
// Com false o clipe sai MUDO, que é a saída do motor (o som inventado pelo Kling já é removido por silenciarMp4). Só volta a true depois de a
// montagem provar, com SSIM contra a saída do motor, que só o SOM do original entra.
// KINEO-RECREATE-SOM-LIGA-1411 [CEO 14/11, "Subir. Autorizo 8 usd na fall" do dono; prova em PRODUÇÃO, conta da casa, US$ 1,26] — LIGADO. A montagem em camadas
// (KINEO-RECREATE-SOM-SO-O-SOM-1311: o original por baixo e invisível, o clipe do motor por cima, mudo) provou trazer SÓ o som: clip 42e8894a
// (3 s, som_original true): entregue × saída do motor 0,991 de semelhança (mínimo 0,989); entregue × entrada 0,865; áudio do entregue × entrada
// com correlação 1,000; trava swapped. O 2º pedido da mesma conta (clip 4d4afc8d) passou pela fila e também trocou. A "etiqueta" pública
// acompanha o interruptor (seuVideoPresentation: audio 'original'), e a marca de prova por clipe fica sem efeito (a rota só a grava com o global desligado).
export const SEU_VIDEO_SOM_ORIGINAL = true
/**
 * O som que entra na montagem: a URL do vídeo original, lida da impressão do pedido (submitClip grava [pedido, modelo, entrada da fal]).
 * Só o Seedance 2.5 e só o arquivo do PRÓPRIO dono no nosso bucket (recreate-uploads/<dono>/<uuid>.mp4|mov). Fora disso: null. Pura.
 */
// KINEO-RECREATE-SOM-PROVA-1311 [CEO 14/11: provar o item C sem ligar o som de todo mundo] — a PROVA do som num clipe só: com o interruptor
// global desligado, o POST /api/recreate/seu-video aceita `som_original: true` SÓ de conta da casa e grava esta marca na entrada do pedido (a
// impressão que a liquidação lê). O embrulho do envio (seuVideoSubmitDeps) tira toda chave kineo_* antes da fal: a fal nunca a vê.
export const MARCA_SOM_PROVA = 'kineo_som_original_prova'
/** A entrada que vai à fal: sem as marcas da casa (kineo_*). Pura; sem marca, o mesmo objeto. */
export function semMarcasDaCasa(input: Record<string, unknown>): Record<string, unknown> {
  if (!Object.keys(input).some((k) => k.startsWith('kineo_'))) return input
  return Object.fromEntries(Object.entries(input).filter(([k]) => !k.startsWith('kineo_')))
}
export function somOriginalDaLinha(row: { model: string | null; fingerprint: string | null; user_id: string; seconds: number }, supabaseUrl: string, ligado: boolean = SEU_VIDEO_SOM_ORIGINAL): { url: string; seconds: number } | null {
  if (!ehModeloDoSeuVideo(row.model) || !row.fingerprint || !supabaseUrl) return null // KINEO-RECREATE-KLING4-1311 — era: row.model !== SEEDANCE25_MODEL · KINEO-RECREATE-SOM-PROVA-1311 — o `ligado` vai abaixo (a marca de prova liga só este clipe)
  try {
    const p = JSON.parse(row.fingerprint) as unknown
    if (!Array.isArray(p) || p[1] !== row.model || !p[2] || typeof p[2] !== 'object') return null // KINEO-RECREATE-KLING4-1311 — era: p[1] !== SEEDANCE25_MODEL
    if (!ligado && (p[2] as Record<string, unknown>)[MARCA_SOM_PROVA] !== true) return null // KINEO-RECREATE-SOM-PROVA-1311
    const url = (p[2] as { video_urls?: unknown }).video_urls
    const um = (p[2] as { video_url?: unknown }).video_url // KINEO-RECREATE-KLING4-1311 — o Kling recebe video_url (um só)
    const u = row.model === KLING4_EDIT_MODEL ? (typeof um === 'string' ? um : '') : Array.isArray(url) && typeof url[0] === 'string' ? url[0] : ''
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
