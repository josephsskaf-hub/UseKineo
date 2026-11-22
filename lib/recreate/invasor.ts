// ═══ KINEO-INVASOR-DE-CAMPO-1511 [dono 15/11: "Esse é o vídeo de futebol que eu quero no Recreate, pra pessoa trocar o rosto!"] ═══════════
// O molde de VÁRIOS TRECHOS: UM pedido do cliente (uma foto) → N pedidos ao kling/v4/video-to-video/edit, ESTRITAMENTE UM POR VEZ somando todos os
// clientes (a vaga única de lib/recreate/filaKlingEdit.ts), cada um com o texto da receita de 14/11 → a montagem (Creatomate, a mesma da marca dos
// clipes) junta os trechos, devolve a velocidade do trecho alongado e põe o SOM ORIGINAL → o MP4 vai ao NOSSO bucket → done. Débito ÚNICO na entrada
// (submitClip, debitVideoCredits); qualquer falha depois dele ESTORNA (o mesmo fail() de sempre: refund idempotente + failed).
//
// A MÁQUINA (uma linha só em `clips`, sem tabela nem coluna nova; a etapa vive em `model` + `failure_reason` enquanto `processing`):
//   · trecho 0: entra pelo submitClip de sempre (fila, vaga, débito). Na fila, a linha é `pending` com a marca da fila; ao sair, `processing` com o
//     request_id e failure_reason null (= trecho 0 no fornecedor).
//   · trecho i ≥ 1 no fornecedor: failure_reason `inv_t<i>`; enviando (reservado, request_id ainda não gravado): `inv_e<i>_<ms>`.
//   · trecho i pronto: copia para o NOSSO bucket (caminho fixo: dois atores escrevem o mesmo arquivo) → reserva o próximo por UPDATE condicional (um
//     ator só) → confirma a vaga (renova o prazo E o início: o teto duro de 20 min vale por trecho) → envia → grava o request_id.
//   · último trecho pronto: reserva a montagem (model = INVASOR_MONTAGEM_MODEL, failure_reason `inv_m<n>_<ms>`, request_id null) → SOLTA a vaga (o
//     próximo cliente passa) → manda a montagem → grava o id do render em fal_request_id → pronto = baixa, sobe ao bucket, done.
// A vaga fica com ESTA linha do 1º ao último trecho: nunca há dois pedidos nossos no Kling edit ao mesmo tempo (dois juntos voltam sem trocar e a fal
// cobra: 0 de 5 em paralelo, 10 de 10 sozinho, 14/11).
// Módulo PURO (io injetado): o guardião scripts/test-invasor-de-campo-1511.mjs executa a máquina com um banco e uma fal de mentira.
import type { ClipRow, ProviderState } from '@/lib/clips/clipFlow'
import type { RecreatePlan } from './generation'
import { KLING4_EDIT_MODEL, KLING4_USD_POR_SEGUNDO_720P } from './seuVideo'
import { RECREATE_UNPRICED_ERROR } from './formats'
import { decidirPorta, type EstadoDaPorta, type RecusaDaPorta } from './portaDoSeuVideo'
import { INVASOR_FORMATO, INVASOR_ID, MOLDE_PITCH_INVADER, creditosDoMolde, moldeDeTrechos, type MoldeDeTrechos } from './invasorMolde'
import { KLING_IDENTITY_PHOTO_LIMIT, validRecreatePhotoCount } from './identityPhotos'

export const INVASOR_MARCA = 'KINEO-INVASOR-DE-CAMPO-1511'
/** A etapa da montagem na coluna `model` (o id do render do Creatomate vai em fal_request_id). Não é um modelo da fal: só esta máquina o lê. Um só para todos os moldes. */
export const INVASOR_MONTAGEM_MODEL = 'kineo/montagem-invasor-de-campo'
/** O selo honesto da Library: o motor real que trocou o rosto (a linha guarda a chave 'h3' do catálogo de clipes, como o "seu vídeo"). */
export const INVASOR_SELO = 'Kling 4.0 Edit'
// O preço vem da tabela ÚNICA (lib/checkoutPricing.ts RECREATE_PRICING_VARIOS_TRECHOS, lido em ./invasorMolde): nenhum número aqui. null = sem preço = recusa limpa.
export const INVASOR_CREDITOS: number | null = INVASOR_FORMATO.creditos ?? null
/** KINEO-REMODELAMENTO-MOLDES-1611 — custo fal previsto de um molde (Kling 4.0 edição 720p, US$ 0,094/s sobre entrada + saída; a saída tem a duração do arquivo + 1 quadro). */
export const falUsdDoMolde = (m: Pick<MoldeDeTrechos, 'trechos'>) => Math.round(m.trechos.reduce((s, t) => s + KLING4_USD_POR_SEGUNDO_720P * (t.segundosDoArquivo + t.segundosDoArquivo + 0.04), 0) * 100) / 100
export const segundosDoFilme = (m: Pick<MoldeDeTrechos, 'trechos'>) => Math.round(m.trechos.reduce((s, t) => s + t.segundosNoFilme, 0) * 1000) / 1000
/** Custo fal previsto do Pitch invader. */
export const INVASOR_FAL_USD = falUsdDoMolde(MOLDE_PITCH_INVADER)
export const INVASOR_SEGUNDOS_DO_FILME = segundosDoFilme(MOLDE_PITCH_INVADER)
/** O envio de um trecho reservado e sem request_id gravado há mais que isto = perdido (estorno). O mesmo prazo do submit_lost de sempre. */
export const INVASOR_ENVIO_PERDIDO_MS = 10 * 60 * 1000
/** Montagem: tentativas (render que falha ou some) e quanto esperar um render antes de mandar de novo. */
export const INVASOR_MONTAGEM_TENTATIVAS = 3
export const INVASOR_MONTAGEM_REENVIO_MS = 2 * 60 * 1000
export const INVASOR_MONTAGEM_TETO_MS = 10 * 60 * 1000
/** Linha de mais que isto (do pedido ao fim) = vencida, estorno. O mesmo CLIP_EXPIRE_MS do clipe. */
export const INVASOR_EXPIRA_MS = 6 * 60 * 60 * 1000
/** KINEO-INVASOR-DE-CAMPO-1511 [revisor 15/11, item 2] — a conferência de um trecho (até 40 s da trava + a cópia) reservada há mais que isto = o ator morreu: outro
 *  a retoma. O mesmo prazo da reserva da trava de sempre (SWAP_CHECK_LOCK_STALE_MS, 2 min). */
export const INVASOR_CONFERENCIA_VENCE_MS = 2 * 60 * 1000
/** A saída do Kling dura o arquivo + 1 quadro (8 → 8,04 s; 3 → 3,04 s). Mais curta que o arquivo menos isto = o motor cortou o trecho: falha com estorno. */
export const INVASOR_TOLERANCIA_S = 0.1
export const INVASOR_EVENTOS = { trecho: 'recreate_invasor_trecho', trava: 'recreate_invasor_trava', montagem: 'recreate_invasor_montagem', pronto: 'recreate_invasor_pronto', descricao: 'recreate_pessoa_descricao' } as const
export const INVASOR_FALHAS = { vagaPerdida: 'invasor_slot_lost', montagem: 'invasor_assembly_failed', curto: 'invasor_segment_short' } as const

// ─── O texto (a receita de 14/11, palavra por palavra; nenhuma frase negativa além de "wears no glasses") ───
export type InvasorGenero = 'man' | 'woman'
/** KINEO-REMODELAMENTO-MOLDES-1611 — o bicho da foto do cliente no molde de bicho (o cachorro craque). */
export type InvasorBicho = 'dog' | 'cat'
/** Cabelo e barba lidos da foto (lib/recreate/descricaoDaPessoa.ts cabeloEBarba: só palavras do vocabulário fechado). Fora da forma = vazio. */
const cabeloValido = (c: string | null | undefined) => (typeof c === 'string' && /^[a-z ,\-]{3,200}$/.test(c) ? c : null)
/** O texto do Pitch invader (o de sempre, byte a byte). */
export function textoDoInvasor(a: { genero?: InvasorGenero | null; cabeloEBarba?: string | null; semOculos?: boolean | null }): string {
  return textoDoMolde(MOLDE_PITCH_INVADER, a)
}
/** KINEO-REMODELAMENTO-MOLDES-1611 — o texto de QUALQUER molde: pessoa = a receita de 14/11 com o alvo e a frase da roupa do molde; bicho = a mesma receita adaptada
 *  ("his fur, face and ears match @Image1"), sem frase da roupa e sem leitura de cabelo. Nenhuma frase negativa além de "wears no glasses". */
export function textoDoMolde(m: Pick<MoldeDeTrechos, 'alvo'>, a: { genero?: InvasorGenero | null; cabeloEBarba?: string | null; semOculos?: boolean | null; bicho?: InvasorBicho | null }): string {
  const alvo = m.alvo
  if (alvo.tipo === 'bicho') {
    const bicho = a.bicho === 'cat' ? 'cat' : 'dog'
    return `Replace ${alvo.texto} in @Video1 with the ${bicho} from @Image1: his fur, face and ears match @Image1${alvo.acao ? `, and ${alvo.acao}` : ''}. Keep his movements, the timing, the camera, the framing, every other person, the background and the lighting of @Video1 exactly.` // KINEO-NOVIDADE-EM-EVIDENCIA-1611 — + a ação (a bola do @Video1)
  }
  const mulher = a.genero === 'woman'
  const ele = mulher ? 'she' : 'he', dele = mulher ? 'her' : 'his'
  const cabelo = cabeloValido(a.cabeloEBarba)
  // O homem do vídeo usa óculos: a foto sem óculos (ou não lida) pede "wears no glasses"; a foto com óculos deixa os óculos.
  const oculos = alvo.deOculos && a.semOculos !== false ? `, and ${ele} wears no glasses` : ''
  const traços = mulher ? `${dele} face and hair match @Image1` : `${dele} face, hair and beard match @Image1`
  return `Replace ${alvo.texto} in @Video1 with the ${mulher ? 'woman' : 'man'} from @Image1: ${traços}${cabelo ? `, with ${cabelo}` : ''}${oculos}. Keep ${dele} movements, the timing, the camera, the framing, every other person, the background and the lighting of @Video1 exactly.${alvo.roupa ? ` ${alvo.roupa}` : ''}` // KINEO-NOVIDADE-EM-EVIDENCIA-1611 — sem frase da roupa quando o alvo não veste nada
}
/** "wearing no glasses" no fim da frase do leitor = sem óculos; "wearing glasses" = com; sem leitura = null. */
export function semOculosDaDescricao(texto: string | null | undefined): boolean | null {
  if (typeof texto !== 'string') return null
  if (/\bwearing no glasses$/.test(texto)) return true
  if (/\bwearing glasses$/.test(texto)) return false
  return null
}

// ─── A entrada da fal (o vídeo do trecho é um MARCADOR na linha: a URL assinada só nasce no envio) ───
export const INVASOR_TRECHO_PREFIXO = 'kineo-trecho://'
export const marcadorDoTrecho = (i: number, id: string = INVASOR_ID) => `${INVASOR_TRECHO_PREFIXO}${id}/${i}`
/** O molde e o trecho de um marcador (o molde tem de estar no registro e o trecho existir nele), ou null. */
export function lerMarcador(v: unknown): { molde: MoldeDeTrechos; i: number } | null {
  const m = typeof v === 'string' ? /^kineo-trecho:\/\/([a-z0-9-]+)\/(\d)$/.exec(v) : null
  const molde = m ? moldeDeTrechos(m[1]) : null
  if (!m || !molde) return null
  const i = Number(m[2])
  return i < molde.trechos.length ? { molde, i } : null
}
export function trechoDoMarcador(v: unknown, id: string = INVASOR_ID): number | null {
  const r = lerMarcador(v)
  return r && r.molde.id === id ? r.i : null
}
export function entradaDoTrecho(a: { prompt: string; foto: string; angulos?: readonly string[]; trecho: number; molde?: Pick<MoldeDeTrechos, 'id'> }): Record<string, unknown> {
  const referencia = a.angulos?.length
    ? { elements: [{ frontal_image_url: a.foto, reference_image_urls: [...a.angulos] }] }
    : { image_urls: [a.foto] }
  return { prompt: a.prompt, video_url: marcadorDoTrecho(a.trecho, a.molde?.id ?? INVASOR_ID), ...referencia, resolution: '720p' }
}
/** A entrada que vai à fal: o marcador do trecho vira a URL assinada (1 h) e as marcas da casa (kineo_*) saem. Assinatura que falha = null (o envio
 *  falha limpo, com estorno). Entrada sem marcador: a mesma, só sem as marcas. */
export async function resolverEntrada(input: Record<string, unknown>, assinar: (molde: MoldeDeTrechos, trecho: number) => Promise<string | null>): Promise<Record<string, unknown> | null> {
  const limpa = Object.fromEntries(Object.entries(input).filter(([k]) => !k.startsWith('kineo_')))
  if (typeof limpa.video_url !== 'string' || !limpa.video_url.startsWith(INVASOR_TRECHO_PREFIXO)) return limpa
  const r = lerMarcador(limpa.video_url)
  const url = r === null ? null : await assinar(r.molde, r.i).catch(() => null)
  return url && /^https:\/\//.test(url) ? { ...limpa, video_url: url } : null
}

// ─── O plano (o que o POST /api/recreate passa ao submitClip) ───
export type InvasorPlanResult = { ok: true; plan: RecreatePlan } | { ok: false; status: number; error: string }
export function planInvasor(raw: Record<string, unknown>, ctx: { userId: string; supabaseUrl: string; dono: (url: string) => string | null; aceitarAngulos?: boolean }, leitura: { cabeloEBarba: string | null; semOculos: boolean | null } | null): InvasorPlanResult {
  const bad = (error: string, status = 400): InvasorPlanResult => ({ ok: false, status, error })
  const molde = moldeDeTrechos(raw.format)
  if (!molde) return bad('Choose a video from the Kineo catalog.')
  const credits = creditosDoMolde(molde)
  if (credits === null) return bad(RECREATE_UNPRICED_ERROR, 409)
  if (raw.consent !== true) return bad('Confirm you have permission to use these photos.')
  const limite = ctx.aceitarAngulos && molde.alvo.tipo === 'pessoa' ? KLING_IDENTITY_PHOTO_LIMIT : 1
  if (!Array.isArray(raw.photos) || !validRecreatePhotoCount(raw.photos.length, 1, limite)) {
    return bad(limite === 1 ? 'Add a photo for each person in this format.' : `Add one front photo and up to ${limite - 1} photos of the same person.`)
  }
  const photos: string[] = []
  for (const value of raw.photos) {
    const url = typeof value === 'string' ? ctx.dono(value) : null
    if (!url) return bad('Upload photos to your own account before continuing.', 403)
    photos.push(url)
  }
  if (new Set(photos).size !== photos.length) return bad('Choose a different photo for each angle.')
  const [foto, ...angulos] = photos
  const genero: InvasorGenero = raw.gender === 'woman' ? 'woman' : 'man'
  const bicho: InvasorBicho = raw.pet === 'cat' ? 'cat' : 'dog'
  const receita = textoDoMolde(molde, { genero, bicho, cabeloEBarba: leitura?.cabeloEBarba ?? null, semOculos: leitura?.semOculos ?? null })
  const prompt = angulos.length ? receita.replace(/@Image1\b/g, '@Element1') : receita
  return { ok: true, plan: {
    body: { engine: 'h3', seconds: molde.segundos, aspect: null, prompt, imageUrl: foto },
    model: KLING4_EDIT_MODEL, credits, falUsd: falUsdDoMolde(molde), photos,
    input: { ...entradaDoTrecho({ prompt, foto, angulos, trecho: 0, molde }), kineo_molde: molde.id },
  } }
}

// ─── A porta (KINEO-INVASOR-DE-CAMPO-1511 [2º revisor 15/11, item 2]) ───
export const INVASOR_PAUSADO = 'engine_paused' as const
export const FRASE_INVASOR_PAUSADO = 'This video is temporarily paused for maintenance. Nothing was charged.'
/** Tudo o que recusa o pedido ANTES de cobrar: o motor em pausa (a mesma pausa da troca do catálogo) e a porta do Kling edit (lib/recreate/portaDoSeuVideo decidirPorta:
 *  um pedido aberto por conta, o teto de "não trocou", a fila cheia). null = pode seguir para a cobrança. A repetição da mesma chave nunca passa por aqui. */
export function portaDoInvasor(e: EstadoDaPorta & { motorOk: boolean }): RecusaDaPorta | null {
  if (!e.replay && !e.motorOk) return { code: INVASOR_PAUSADO, status: 409, error: FRASE_INVASOR_PAUSADO, extra: { charged: false } }
  return decidirPorta(e)
}

// ─── A linha ───
type LinhaDoInvasor = Pick<ClipRow, 'fingerprint' | 'engine' | 'mode' | 'model'>
type DadosDoTrecho = { prompt: string; foto: string; angulos?: string[]; molde: MoldeDeTrechos }
const urlDeFoto = (v: unknown): v is string => typeof v === 'string' && /^https:\/\//.test(v)
/** A entrada do trecho 0 guardada pelo servidor na impressão digital ([pedido, modelo, entrada]) — é dela que os trechos seguintes saem. */
export function dadosDaLinha(row: { fingerprint?: string | null }): DadosDoTrecho | null {
  if (typeof row.fingerprint !== 'string' || !row.fingerprint.startsWith('[')) return null
  try {
    const fp = JSON.parse(row.fingerprint) as unknown
    if (!Array.isArray(fp) || fp.length !== 3 || fp[1] !== KLING4_EDIT_MODEL || !fp[2] || typeof fp[2] !== 'object') return null
    const e = fp[2] as Record<string, unknown>
    const molde = moldeDeTrechos(e.kineo_molde) // KINEO-REMODELAMENTO-MOLDES-1611 — era: só o Pitch invader
    if (!molde || trechoDoMarcador(e.video_url, molde.id) !== 0 || typeof e.prompt !== 'string' || !e.prompt) return null
    if (e.elements !== undefined) {
      if (molde.alvo.tipo !== 'pessoa' || e.image_urls !== undefined || !Array.isArray(e.elements) || e.elements.length !== 1) return null
      const element = e.elements[0]
      if (!element || typeof element !== 'object') return null
      const { frontal_image_url: foto, reference_image_urls: angulos } = element
      if (!urlDeFoto(foto) || !Array.isArray(angulos) || angulos.length < 1 || angulos.length >= KLING_IDENTITY_PHOTO_LIMIT || !angulos.every(urlDeFoto)) return null
      if (new Set([foto, ...angulos]).size !== 1 + angulos.length) return null
      return { prompt: e.prompt, foto, angulos, molde }
    }
    const foto = Array.isArray(e.image_urls) ? e.image_urls[0] : null
    if (!urlDeFoto(foto)) return null
    return { prompt: e.prompt, foto, molde }
  } catch { return null }
}
/** É linha do invasor? Pelo que o SERVIDOR gravou (impressão digital + motor + modo + um dos dois modelos), nunca pelo texto. */
export const invasorDaLinha = (row: LinhaDoInvasor) => (row.model === KLING4_EDIT_MODEL || row.model === INVASOR_MONTAGEM_MODEL) && row.engine === 'h3' && row.mode === 'image' && dadosDaLinha(row) !== null

const ms13 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(13, '0')
export const marcaDoTrecho = (i: number): string | null => (i === 0 ? null : `inv_t${i}`)
export const marcaDoEnvio = (i: number, agora: number) => `inv_e${i}_${ms13(agora)}`
export const marcaDaMontagem = (n: number, agora: number) => `inv_m${n}_${ms13(agora)}`
/** KINEO-INVASOR-DE-CAMPO-1511 [revisor 15/11, item 2] — a CONFERÊNCIA do trecho i (duração + trava "não trocou") reservada por UM ator. Mais velha que
 *  INVASOR_CONFERENCIA_VENCE_MS = o ator morreu no meio: outro a retoma do zero (a saída do fornecedor ainda está no request_id). */
export const marcaDaConferencia = (i: number, agora: number) => `inv_c${i}_${ms13(agora)}`
export function lerMarca(v: string | null): { tipo: 'trecho'; i: number } | { tipo: 'envio'; i: number; em: number } | { tipo: 'conferencia'; i: number; em: number } | { tipo: 'montagem'; n: number; em: number } | null {
  if (v === null) return { tipo: 'trecho', i: 0 }
  let m = /^inv_t(\d)$/.exec(v)
  if (m) return { tipo: 'trecho', i: Number(m[1]) }
  m = /^inv_e(\d)_(\d{13})$/.exec(v)
  if (m) return { tipo: 'envio', i: Number(m[1]), em: Number(m[2]) }
  m = /^inv_c(\d)_(\d{13})$/.exec(v)
  if (m) return { tipo: 'conferencia', i: Number(m[1]), em: Number(m[2]) }
  m = /^inv_m(\d)_(\d{13})$/.exec(v)
  if (m) return { tipo: 'montagem', n: Number(m[1]), em: Number(m[2]) }
  return null
}

// ─── A montagem (RenderScript do Creatomate) ───
/** Os trechos em sequência na trilha 1 (mudos: o som que o Kling inventa nunca sai), o trecho alongado com a velocidade de volta, o som ORIGINAL na
 *  trilha 2 e, para quem não paga, a marca usekineo.com por cima (o mesmo texto e lugar dos clipes; `marca` = o elemento pronto). */
export function fonteDaMontagem(a: { molde?: MoldeDeTrechos; trechos: readonly string[]; som: string; marca?: Record<string, unknown> | null }): Record<string, unknown> {
  const molde = a.molde ?? MOLDE_PITCH_INVADER // KINEO-REMODELAMENTO-MOLDES-1611 — o molde da linha (sem ele, o Pitch invader, byte a byte)
  if (a.trechos.length !== molde.trechos.length) throw new Error('montagem: trechos faltando')
  let t = 0
  const videos = molde.trechos.map((tr, i) => {
    const el = { type: 'video', track: 1, time: Math.round(t * 1000) / 1000, duration: tr.segundosNoFilme, source: a.trechos[i], volume: '0%', ...(tr.velocidade !== 100 ? { speed: `${tr.velocidade}%` } : {}) }
    t += tr.segundosNoFilme
    return el
  })
  const som = { type: 'audio', track: 2, time: 0, duration: molde.som.segundos, source: a.som, volume: '100%' }
  return {
    output_format: 'mp4', width: molde.saida.largura, height: molde.saida.altura, frame_rate: molde.saida.fps, duration: segundosDoFilme(molde),
    elements: [...videos, som, ...(a.marca ? [{ ...a.marca, track: 3, time: 0 }] : [])],
  }
}

// ─── A máquina ───
export type EnvioDoFornecedor = { ok: true; requestId: string } | { ok: false; ambiguous: boolean; error: string }
export type EstadoDaMontagem = { status: 'succeeded'; url: string } | { status: 'failed'; error: string | null } | { status: 'pending' }
export interface InvasorIo {
  now(): number
  poll(model: string, requestId: string): Promise<ProviderState>
  /** Copia a saída do trecho i para o NOSSO bucket (caminho fixo) e devolve a URL nossa e a DURAÇÃO lida do MP4 (null = ilegível). Lança se falhar. */
  guardarTrecho(row: ClipRow, i: number, providerUrl: string): Promise<{ url: string; segundos: number | null }>
  /** KINEO-INVASOR-DE-CAMPO-1511 [revisor 15/11, item 2] — a MESMA trava "não trocou" do Kling edit (lib/recreate/swapCheck.ts, alvo do pedido, 4 instantes, regra
   *  estrita): o trecho original (privado) × a saída do motor × a foto. Nunca lança; falha da checagem = 'unverified' (a política de sempre: entrega). */
  conferirTroca(row: ClipRow, i: number, providerUrl: string, dados: { prompt: string; foto: string; molde: MoldeDeTrechos }): Promise<{ result: string; reason: string; usd?: number; auditoria?: AuditoriaDaTrava }>
  /** As URLs NOSSAS dos trechos já guardados (na ordem), para a montagem. Lança se faltar algum. */
  urlsDosTrechos(row: ClipRow): Promise<string[]>
  /** UPDATE condicional: só se a linha ainda está `processing` com ESTE failure_reason e ESTE fal_request_id. true = este ator moveu. */
  mover(id: string, de: { failure_reason: string | null; fal_request_id: string | null }, para: { failure_reason: string | null; fal_request_id?: string | null; model?: string }): Promise<boolean>
  /** A vaga do Kling edit é DESTA linha (renova prazo e início) ou estava livre e agora é. false = outra linha a tem (nunca manda em paralelo). */
  garantirVaga(clipId: string): Promise<boolean>
  /** Solta a vaga SÓ se for desta linha. */
  soltarVaga(clipId: string): Promise<void>
  /** Manda o trecho i ao Kling (um POST, sem retry do POST pago). */
  enviarTrecho(row: ClipRow, i: number, dados: DadosDoTrecho): Promise<EnvioDoFornecedor>
  /** Manda a montagem. Devolve o id do render, ou erro. */
  montar(row: ClipRow, trechos: string[]): Promise<{ ok: true; renderId: string } | { ok: false; error: string }>
  consultarMontagem(renderId: string): Promise<EstadoDaMontagem>
  /** Copia o filme montado para o NOSSO bucket (clips/<dono>/<id>.mp4) e devolve a URL nossa. Lança se falhar. */
  guardarFilme(row: ClipRow, url: string): Promise<string>
  /** done condicional à marca da montagem deste ator (solta a marca). */
  markDone(id: string, videoUrl: string, marca: string): Promise<boolean>
  refund(billingReference: string): Promise<number>
  markFailed(id: string, reason: string, refunded: number): Promise<boolean>
  event(name: string, metadata: Record<string, unknown>): Promise<void>
}

/** KINEO-TRAVA-INSTANTES-MOLDE-1611 [CEO 16/11: o evento da trava não dizia o que o juiz viu nem onde] — o que vai ao evento recreate_invasor_trava para auditar o veredito. */
export type AuditoriaDaTrava = { instants: number[] | null; instants_source: string | null; pairs_used: number[] | null; judge: unknown[] | null; subjects: Array<string | null> | null; target_missing: boolean | null; model: string | null; unverified_reason: string | null }

const telemetria = (row: ClipRow) => ({ clip_id: row.id, format: dadosDaLinha(row)?.molde.id ?? INVASOR_ID, engine: row.engine, seconds: row.seconds, credits: row.credits })

/** KINEO-INVASOR-DE-CAMPO-1511 [revisor 15/11, item 2] — o veredito da trava que NÃO entrega (o mesmo do Kling edit: não trocou, parcial, incerto) → o motivo da falha. */
const NAO_ENTREGA: Readonly<Record<string, string>> = { unchanged: 'swap_unchanged', partial: 'swap_partial', uncertain: 'swap_uncertain' }

/** KINEO-INVASOR-DE-CAMPO-1511 [revisor 15/11, item 4] — quantos pedidos ao fornecedor esta linha ainda vai fazer: na fila, todos; no trecho i (rodando, conferindo
 *  ou enviando o i), os que faltam a partir dele; na montagem, nenhum. É o peso da linha na fila (lib/recreate/filaKlingEdit.ts filaPonderada). */
export function trechosQueFaltam(row: Pick<ClipRow, 'status' | 'model' | 'failure_reason'> & { fingerprint?: string | null }): number {
  const total = (dadosDaLinha(row)?.molde ?? MOLDE_PITCH_INVADER).trechos.length // KINEO-REMODELAMENTO-MOLDES-1611 — os trechos do molde da linha
  if (row.status === 'pending') return total
  if (row.status !== 'processing' || row.model === INVASOR_MONTAGEM_MODEL) return 0
  const m = lerMarca(row.failure_reason)
  if (!m || m.tipo === 'montagem') return 0
  return Math.max(0, total - (m.tipo === 'conferencia' ? m.i + 1 : m.i))
}
/** O peso de uma linha qualquer do Kling edit na fila: o invasor pelos trechos que faltam (no mínimo 1); o pedido de sempre, 1. */
export const pesoNaFila = (row: Pick<ClipRow, 'status' | 'model' | 'failure_reason' | 'fingerprint' | 'engine' | 'mode'>) => (invasorDaLinha(row) ? Math.max(1, trechosQueFaltam(row)) : 1)

export async function settleInvasor(io: InvasorIo, row: ClipRow): Promise<ClipRow> {
  if (row.status !== 'processing') return row
  const agora = io.now()
  const idade = agora - Date.parse(row.created_at)
  const marca = lerMarca(row.failure_reason)
  const etapa = row.model === INVASOR_MONTAGEM_MODEL ? 'montagem' : 'trecho'
  const fail = async (reason: string, meta: Record<string, unknown> = {}, soltar = etapa === 'trecho'): Promise<ClipRow> => {
    const refunded = await io.refund(row.billing_reference)
    const moved = await io.markFailed(row.id, reason, refunded)
    if (soltar && reason !== 'submit_ambiguous') await io.soltarVaga(row.id).catch(() => {})
    if (moved) await io.event('clip_failed', { ...telemetria(row), reason, credits_refunded: refunded, stage: 'settle', invasor: etapa, ...meta })
    return { ...row, status: 'failed', failure_reason: reason, credits_refunded: refunded }
  }
  if (!marca) return row // marca que esta máquina não escreveu: não mexe
  if (Number.isFinite(idade) && idade >= INVASOR_EXPIRA_MS) return fail('expired', { trecho: marca.tipo === 'montagem' ? null : marca.i })
  if (etapa === 'montagem') return marca.tipo === 'montagem' ? passoDaMontagem(io, row, marca) : row

  // ── etapa dos trechos (model = Kling edit) ──
  if (marca.tipo === 'montagem') return row
  if (marca.tipo === 'envio') {
    // Outro ator reservou o envio e ainda não gravou o request_id. Perdido depois do prazo = estorno (o pedido pode existir do outro lado: a vaga vence sozinha).
    return agora - marca.em >= INVASOR_ENVIO_PERDIDO_MS ? fail('submit_lost', { trecho: marca.i }, false) : row
  }
  // Outro ator está conferindo este trecho (duração + trava): espera. Conferência abandonada (o ator morreu) é retomada por este, do zero.
  if (marca.tipo === 'conferencia' && agora - marca.em < INVASOR_CONFERENCIA_VENCE_MS) return row
  const i = marca.i
  const dados = dadosDaLinha(row)
  if (!dados) return row
  const T = dados.molde.trechos // KINEO-REMODELAMENTO-MOLDES-1611 — os trechos do molde da linha
  if (i >= T.length || !row.fal_request_id) return row
  const st = await io.poll(KLING4_EDIT_MODEL, row.fal_request_id)
  if (st.state === 'failed') return fail('provider_failed', { trecho: i, provider_error: st.error })
  if (st.state !== 'done') return row
  let guardado: { url: string; segundos: number | null }
  try {
    guardado = await io.guardarTrecho(row, i, st.url)
  } catch {
    return row // tenta de novo na próxima passada (o prazo de 6 h estorna)
  }
  // KINEO-INVASOR-DE-CAMPO-1511 [revisor 15/11, item 2] — UM ator confere o trecho (reserva condicional): a duração e a trava "não trocou" do Kling edit. Trecho
  // mais curto que o esperado ou que não trocou = falha com estorno, NUNCA entrega; só depois disso o próximo trecho (ou a montagem) anda.
  const conf = marcaDaConferencia(i, agora)
  if (!(await io.mover(row.id, { failure_reason: row.failure_reason, fal_request_id: row.fal_request_id }, { failure_reason: conf }))) return row // outro ator levou
  const esperado = T[i].segundosDoArquivo
  if (guardado.segundos === null || !(guardado.segundos >= esperado - INVASOR_TOLERANCIA_S)) return fail(INVASOR_FALHAS.curto, { trecho: i, segundos: guardado.segundos, esperado })
  const veredito: { result: string; reason: string; usd?: number; auditoria?: AuditoriaDaTrava } = await io.conferirTroca(row, i, st.url, dados).catch(() => ({ result: 'unverified', reason: 'check_error' }))
  await io.event(INVASOR_EVENTOS.trava, { ...(veredito.auditoria ?? {}), ...telemetria(row), trecho: i, result: veredito.result, reason: veredito.reason, usd: veredito.usd ?? null }) // KINEO-TRAVA-INSTANTES-MOLDE-1611 — + os instantes e a resposta do juiz (ANTES de todo campo fixo: não sobrescreve clip_id, format, trecho, result)
  if (Object.hasOwn(NAO_ENTREGA, veredito.result)) return fail(NAO_ENTREGA[veredito.result], { trecho: i, swap_check: veredito.result })
  if (i < T.length - 1) {
    const envio = marcaDoEnvio(i + 1, io.now())
    if (!(await io.mover(row.id, { failure_reason: conf, fal_request_id: row.fal_request_id }, { failure_reason: envio }))) return row // outro ator retomou a conferência
    if (!(await io.garantirVaga(row.id).catch(() => false))) return fail(INVASOR_FALHAS.vagaPerdida, { trecho: i + 1 }, false)
    const sent = await io.enviarTrecho(row, i + 1, dados)
    if (!sent.ok) return fail(sent.ambiguous ? 'submit_ambiguous' : 'provider_rejected', { trecho: i + 1, provider_error: sent.error })
    const proxima = marcaDoTrecho(i + 1)
    let saved = await io.mover(row.id, { failure_reason: envio, fal_request_id: row.fal_request_id }, { failure_reason: proxima, fal_request_id: sent.requestId })
    if (!saved) saved = await io.mover(row.id, { failure_reason: envio, fal_request_id: row.fal_request_id }, { failure_reason: proxima, fal_request_id: sent.requestId })
    await io.event(INVASOR_EVENTOS.trecho, { ...telemetria(row), trecho: i + 1, request_id: sent.requestId, tracking_saved: saved, ms: Math.max(0, idade) })
    return saved ? { ...row, failure_reason: proxima, fal_request_id: sent.requestId } : { ...row, failure_reason: envio }
  }
  // o último trecho passou na conferência: a montagem é deste ator (um só), e a vaga volta para o próximo cliente
  const m1 = marcaDaMontagem(1, io.now())
  if (!(await io.mover(row.id, { failure_reason: conf, fal_request_id: row.fal_request_id }, { failure_reason: m1, fal_request_id: null, model: INVASOR_MONTAGEM_MODEL }))) return row
  await io.soltarVaga(row.id).catch(() => {})
  await io.event(INVASOR_EVENTOS.trecho, { ...telemetria(row), trecho: 'all_done', ms: Math.max(0, idade) })
  const montando = { ...row, model: INVASOR_MONTAGEM_MODEL, failure_reason: m1, fal_request_id: null }
  return mandarMontagem(io, montando, m1, 1, (reason, meta = {}) => failNaMontagem(io, montando, reason, meta))
}

async function failNaMontagem(io: InvasorIo, row: ClipRow, reason: string, meta: Record<string, unknown>): Promise<ClipRow> {
  const refunded = await io.refund(row.billing_reference)
  const moved = await io.markFailed(row.id, reason, refunded)
  if (moved) await io.event('clip_failed', { ...telemetria(row), reason, credits_refunded: refunded, stage: 'settle', invasor: 'montagem', ...meta })
  return { ...row, status: 'failed', failure_reason: reason, credits_refunded: refunded }
}

type Fail = (reason: string, meta?: Record<string, unknown>) => Promise<ClipRow>
/** Manda a montagem com a marca `m` que ESTE ator acabou de gravar; grava o id do render. Falha no envio: a marca fica sem render e a próxima passada
 *  (depois de INVASOR_MONTAGEM_REENVIO_MS) tenta de novo, até INVASOR_MONTAGEM_TENTATIVAS. */
async function mandarMontagem(io: InvasorIo, row: ClipRow, m: string, n: number, fail: Fail): Promise<ClipRow> {
  let trechos: string[]
  try { trechos = await io.urlsDosTrechos(row) } catch { return n >= INVASOR_MONTAGEM_TENTATIVAS ? fail(INVASOR_FALHAS.montagem, { why: 'segments_missing' }) : row }
  const r = await io.montar(row, trechos).catch((e) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }))
  if (!r.ok) {
    await io.event(INVASOR_EVENTOS.montagem, { ...telemetria(row), tentativa: n, ok: false, error: String(r.error).slice(0, 200) })
    return n >= INVASOR_MONTAGEM_TENTATIVAS ? fail(INVASOR_FALHAS.montagem, { why: 'submit_failed' }) : row
  }
  let saved = await io.mover(row.id, { failure_reason: m, fal_request_id: null }, { failure_reason: m, fal_request_id: r.renderId })
  if (!saved) saved = await io.mover(row.id, { failure_reason: m, fal_request_id: null }, { failure_reason: m, fal_request_id: r.renderId })
  await io.event(INVASOR_EVENTOS.montagem, { ...telemetria(row), tentativa: n, ok: true, render_id: r.renderId, tracking_saved: saved })
  return saved ? { ...row, fal_request_id: r.renderId } : row
}

async function passoDaMontagem(io: InvasorIo, row: ClipRow, marca: { n: number; em: number }): Promise<ClipRow> {
  const agora = io.now()
  const fail: Fail = (reason, meta = {}) => failNaMontagem(io, row, reason, meta)
  const deNovo = async (motivo: string): Promise<ClipRow> => {
    if (marca.n >= INVASOR_MONTAGEM_TENTATIVAS) return fail(INVASOR_FALHAS.montagem, { why: motivo })
    const m = marcaDaMontagem(marca.n + 1, agora)
    if (!(await io.mover(row.id, { failure_reason: row.failure_reason, fal_request_id: row.fal_request_id }, { failure_reason: m, fal_request_id: null }))) return row
    return mandarMontagem(io, { ...row, failure_reason: m, fal_request_id: null }, m, marca.n + 1, fail)
  }
  if (!row.fal_request_id) return agora - marca.em >= INVASOR_MONTAGEM_REENVIO_MS ? deNovo('submit_lost') : row
  let st: EstadoDaMontagem
  try { st = await io.consultarMontagem(row.fal_request_id) } catch { return row }
  if (st.status === 'failed') return deNovo('render_failed')
  if (st.status === 'pending') return agora - marca.em >= INVASOR_MONTAGEM_TETO_MS ? deNovo('render_timeout') : row
  let nosso: string
  try { nosso = await io.guardarFilme(row, st.url) } catch { return row }
  const marcaAtual = row.failure_reason as string
  if (!(await io.markDone(row.id, nosso, marcaAtual))) return row
  await io.event('clip_delivered', { ...telemetria(row), age_ms: Math.max(0, agora - Date.parse(row.created_at)) })
  await io.event(INVASOR_EVENTOS.pronto, { ...telemetria(row), tentativas_da_montagem: marca.n, age_ms: Math.max(0, agora - Date.parse(row.created_at)) })
  return { ...row, status: 'done', video_url: nosso, failure_reason: null }
}
