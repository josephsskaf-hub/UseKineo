// KINEO-ADS-PESSOA-FALANDO-VIDEO-1211 — passo 3 do contrato da tela (o vídeo) e a rota de acompanhamento. NÃO cobra de novo: o vídeo já está nos
// 55 que as fotos-chave cobraram (CEO 12/11 15:15). Se o vídeo falhar de vez, o ESTORNO INTEGRAL dos 55 é obrigação desta lógica.
//   iniciarVideo: só depois das fotos pagas e entregues; só com uma foto-chave DESTE pedido (renders/<user>/adspf-<pedido>-fotoN); envia o
//     bytedance/seedance-2.0/image-to-video (input da Div. 2: 10 s, 720p, 9:16, generate_audio, a fala entre aspas e os gestos) SEM esperar;
//     idempotente: um pedido já enviado devolve o mesmo acompanhamento.
//   acompanhar: consulta a fila; pronto → transcreve → juizDaFala (≥ 85% das palavras na ordem, sem repetição, começa até 0,7 s);
//     aprovado → cópia para o nosso bucket → entregue; reprovado (ou fornecedor falhou) → 1 nova tentativa com o MESMO pedido; reprovado de
//     novo → estorno integral + aviso honesto.
// Lógica pura com io injetável (VideoIo): o guardião executa tudo sem rede; as rotas passam o io real.
import { videoComFala, VIDEO_ENDPOINT, VIDEO_USD_POR_SEGUNDO } from './prompts'
import { juizDaFala } from './juizFala'
import { ADS_PF_EVENTOS, estornarPessoaFalando, type IoCreditos, type PedidoPessoaFalando } from './plataforma'
import type { Roteiro } from './roteiro'

export const VIDEO_TENTATIVAS = 2
export const SEGUNDOS_DO_LANCAMENTO = 10

export interface TentativaVideo { tentativa: number; requestId: string; fala: string; input: Record<string, unknown> }
export interface EstadoVideo {
  fotosEntregues: boolean
  estornado: boolean
  entregue: string | null
  tentativas: TentativaVideo[]
  /** tentativa → aprovado? (só as já julgadas) */
  juizes: Record<number, boolean>
}
export interface VideoIo extends IoCreditos {
  estado: (i: { userId: string; pedidoId: string }) => Promise<EstadoVideo>
  submeter: (endpoint: string, input: Record<string, unknown>) => Promise<string | null>
  consultar: (requestId: string) => Promise<{ state: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }>
  transcrever: (url: string) => Promise<{ texto: string; inicio: number | null; duracao: number } | null>
  guardar: (i: { userId: string; pedidoId: string; tentativa: number; url: string }) => Promise<string | null>
  evento: (name: string, metadata: Record<string, unknown>) => Promise<void>
}
type Resp = { status: number; body: Record<string, unknown> }

export const acompanharHref = (pedidoId: string) => `/api/ads/pessoa-falando/acompanhar?pedido=${pedidoId}`

export async function iniciarVideo(io: VideoIo, i: { userId: string; pedidoId: string; fotoChave: string; roteiro: Roteiro; entrada: PedidoPessoaFalando['entrada'] }): Promise<Resp> {
  const s = await io.estado({ userId: i.userId, pedidoId: i.pedidoId })
  if (s.estornado) return { status: 409, body: { error: 'This ad request was refunded. Start a new one.', reason: 'order_refunded', charged: false } }
  if (!s.fotosEntregues) return { status: 409, body: { error: 'Make the photos first.', reason: 'photos_first', charged: false } }
  if (s.tentativas.length) return { status: 202, body: { pedidoId: i.pedidoId, acompanhar: acompanharHref(i.pedidoId), charged: false } }
  if (!new RegExp(`/${i.userId}/adspf-${i.pedidoId}-foto[12]\\.(jpg|png|webp)$`).test(i.fotoChave)) {
    return { status: 400, body: { error: 'Pick one of the two photos of this ad.', reason: 'keyframe_not_from_this_order', charged: false } }
  }
  const v = videoComFala({ apresentadorId: i.entrada.apresentadorId, formatoId: i.entrada.formatoId, fotoChave: i.fotoChave }, i.roteiro)
  if (String(v.input.duration) !== String(SEGUNDOS_DO_LANCAMENTO)) return { status: 400, body: { error: 'only_10_second_ads_for_now_max_25_words', reason: 'bad_request', charged: false } }
  return enviar(io, i.userId, i.pedidoId, 1, i.roteiro.fala, v.input)
}

async function enviar(io: VideoIo, userId: string, pedidoId: string, tentativa: number, fala: string, input: Record<string, unknown>): Promise<Resp> {
  const requestId = await io.submeter(VIDEO_ENDPOINT, input).catch(() => null)
  if (!requestId) {
    if (tentativa < VIDEO_TENTATIVAS) return enviar(io, userId, pedidoId, tentativa + 1, fala, input)
    return falhar(io, userId, pedidoId, 'video_provider_refused')
  }
  await io.evento(ADS_PF_EVENTOS.render, { pedido_id: pedidoId, tentativa, request_id: requestId, fala, input, endpoint: VIDEO_ENDPOINT, usd: SEGUNDOS_DO_LANCAMENTO * VIDEO_USD_POR_SEGUNDO }).catch(() => {})
  return { status: 202, body: { pedidoId, acompanhar: acompanharHref(pedidoId), tentativa, charged: false } }
}

async function falhar(io: VideoIo, _userId: string, pedidoId: string, motivo: string): Promise<Resp> {
  const refunded = await estornarPessoaFalando(io, pedidoId)
  await io.evento(ADS_PF_EVENTOS.estornado, { pedido_id: pedidoId, passo: 'video', motivo, creditos: refunded }).catch(() => {})
  return { status: 200, body: { status: 'falhou', reason: motivo, charged: false, refunded, error: 'The ad did not come out right, so we returned all your credits. Nothing was charged.' } }
}

export async function acompanhar(io: VideoIo, i: { userId: string; pedidoId: string }): Promise<Resp> {
  const s = await io.estado(i)
  if (s.entregue) return { status: 200, body: { status: 'pronto', video: s.entregue } }
  if (s.estornado) return { status: 200, body: { status: 'falhou', charged: false, error: 'The ad did not come out right, so we returned all your credits. Nothing was charged.' } }
  const ultima = s.tentativas[s.tentativas.length - 1]
  if (!ultima) return { status: 404, body: { error: 'Not found.' } }
  const julgado = s.juizes[ultima.tentativa]
  if (julgado === false) return reprovar(io, i, ultima, 'speech_judge_rejected') // já julgada (reprovada) e a nova tentativa não saiu: retoma

  const p = await io.consultar(ultima.requestId).catch(() => ({ state: 'processing' as const, url: null }))
  if (p.state === 'pending' || p.state === 'processing') return { status: 200, body: { status: 'renderizando', tentativa: ultima.tentativa } }
  if (p.state === 'failed' || !p.url) {
    await io.evento(ADS_PF_EVENTOS.juiz, { pedido_id: i.pedidoId, tentativa: ultima.tentativa, aprovado: false, motivos: ['provider_failed'] }).catch(() => {})
    return reprovar(io, i, ultima, 'video_provider_failed')
  }
  const t = await io.transcrever(p.url).catch(() => null)
  if (!t) return { status: 200, body: { status: 'renderizando', tentativa: ultima.tentativa } } // a transcrição tenta de novo na próxima consulta
  const v = juizDaFala({ fala: ultima.fala, transcricao: { texto: t.texto, inicio: t.inicio }, segundosPedidos: SEGUNDOS_DO_LANCAMENTO, segundosDoClipe: t.duracao })
  await io.evento(ADS_PF_EVENTOS.juiz, { pedido_id: i.pedidoId, tentativa: ultima.tentativa, aprovado: v.aprovado, motivos: v.motivos, cobertura: v.cobertura }).catch(() => {})
  if (!v.aprovado) return reprovar(io, i, ultima, 'speech_judge_rejected')
  const nossa = await io.guardar({ userId: i.userId, pedidoId: i.pedidoId, tentativa: ultima.tentativa, url: p.url }).catch(() => null)
  if (!nossa) return { status: 200, body: { status: 'renderizando', tentativa: ultima.tentativa } } // a cópia tenta de novo na próxima consulta
  await io.evento(ADS_PF_EVENTOS.entregue, { pedido_id: i.pedidoId, tentativa: ultima.tentativa, video: nossa, legenda: false }).catch(() => {})
  return { status: 200, body: { status: 'pronto', video: nossa } }
}

async function reprovar(io: VideoIo, i: { userId: string; pedidoId: string }, ultima: TentativaVideo, motivo: string): Promise<Resp> {
  if (ultima.tentativa < VIDEO_TENTATIVAS) return enviar(io, i.userId, i.pedidoId, ultima.tentativa + 1, ultima.fala, ultima.input).then((r) => (r.status === 202 ? { status: 200, body: { status: 'renderizando', tentativa: ultima.tentativa + 1, nova_tentativa: true } } : r))
  return falhar(io, i.userId, i.pedidoId, motivo)
}
