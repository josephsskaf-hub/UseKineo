// KINEO-ADS-PESSOA-FALANDO-FOTOS-1211 — passo 2 do contrato da tela: as 2 fotos-chave PAGAS. Decisão da CEO (12/11, na ausência do dono): este
// é o passo que cobra os 55 créditos (é a 1ª chamada paga; foto de graça vira abuso).
//   1. RESERVA os 55 ANTES da fal (debit_video_credits_service, chave adspf-<pedido>, idempotente: o mesmo pedido nunca cobra 2 vezes);
//   2. fal-ai/nano-banana-pro/edit com o input da Div. 2 (fotoChave: retrato do apresentador + foto do produto, num_images 2);
//   3. COPIA as 2 para o nosso bucket (a URL da fal expira) — sem as 2 cópias, nada é entregue;
//   4. qualquer falha depois da reserva = ESTORNO INTEGRAL pela mesma chave + evento ads_pf_refunded; a resposta diz charged:false.
// Lógica pura com entrada e saída injetáveis (FotosIo): o guardião executa o fluxo inteiro sem rede; a rota passa o io real.
import { fotoChave, FOTO_CHAVE_ENDPOINT, FOTO_CHAVE_USD } from './prompts'
import { ADS_PF_EVENTOS, chaveDeCobranca, estornarPessoaFalando, reservarPessoaFalando, type IoCreditos, type PedidoPessoaFalando } from './plataforma'
import { ADS_PESSOA_FALANDO_CREDITS } from './telaContrato'

export const PEDIDO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export interface FotosIo extends IoCreditos {
  /** Chama a fal (endpoint + input) e devolve as URLs das imagens (vazio = falhou). */
  gerar: (endpoint: string, input: Record<string, unknown>) => Promise<string[]>
  /** Copia uma imagem da fal para o nosso bucket; null = falhou. */
  guardar: (i: { userId: string; pedidoId: string; idx: number; url: string }) => Promise<string | null>
  evento: (name: string, metadata: Record<string, unknown>) => Promise<void>
  /** Em que pé está este pedido (pelos eventos do próprio usuário). Só 'novo' segue: 'em_andamento' (duplo clique), 'entregue' e
   *  'estornado' param — o débito é idempotente pela chave, então um pedido estornado que voltasse sairia de GRAÇA. */
  estado: (i: { userId: string; pedidoId: string }) => Promise<'novo' | 'em_andamento' | 'entregue' | 'estornado'>
  /** As 2 fotos já entregues deste pedido (as nossas), para o replay — quem recarrega a página não perde o que pagou. */
  fotos: (i: { userId: string; pedidoId: string }) => Promise<string[] | null>
}

export type RespostaFotosServidor =
  | { status: 200; body: { pedidoId: string; fotos: [string, string]; creditos: number; charged: boolean } }
  | { status: 402 | 409 | 502 | 503; body: { error: string; reason: string; charged: false; refunded?: number } }

export async function gerarFotosChave(io: FotosIo, i: { userId: string; pedidoId: string; entrada: PedidoPessoaFalando['entrada'] }): Promise<RespostaFotosServidor> {
  const estado = await io.estado({ userId: i.userId, pedidoId: i.pedidoId }).catch(() => 'em_andamento' as const)
  // KINEO-ADS-PESSOA-FALANDO-FOTOS-1211 (canário da CEO 12/11 15:35) — o MESMO pedido já pago devolve as MESMAS 2 fotos, sem cobrar de novo.
  if (estado === 'entregue') {
    const ja = await io.fotos({ userId: i.userId, pedidoId: i.pedidoId }).catch(() => null)
    if (ja && ja.length >= 2) return { status: 200, body: { pedidoId: i.pedidoId, fotos: [ja[0], ja[1]], creditos: ADS_PESSOA_FALANDO_CREDITS as number, charged: false } }
  }
  if (estado !== 'novo') return { status: 409, body: { error: 'This ad request was already used. Start a new one — nothing was charged now.', reason: 'order_' + estado, charged: false } }
  const reserva = await reservarPessoaFalando(io, { userId: i.userId, pedidoId: i.pedidoId })
  if (reserva === 'price_pending') return { status: 409, body: { error: 'The price of this ad format is not decided yet. Nothing was charged.', reason: 'price_pending', charged: false } }
  if (reserva === 'insufficient') return { status: 402, body: { error: `You need ${ADS_PESSOA_FALANDO_CREDITS} credits for this ad. Nothing was charged.`, reason: 'insufficient_credits', charged: false } }
  if (reserva === 'unavailable') return { status: 503, body: { error: 'We could not reserve your credits right now. Nothing was charged — try again in a minute.', reason: 'reserve_unavailable', charged: false } }
  await io.evento(ADS_PF_EVENTOS.reservado, { pedido_id: i.pedidoId, creditos: ADS_PESSOA_FALANDO_CREDITS, chave: chaveDeCobranca(i.pedidoId) }).catch(() => {})

  const falha = async (reason: string): Promise<RespostaFotosServidor> => {
    const refunded = await estornarPessoaFalando(io, i.pedidoId)
    await io.evento(ADS_PF_EVENTOS.estornado, { pedido_id: i.pedidoId, passo: 'fotos', motivo: reason, creditos: refunded }).catch(() => {})
    return { status: 502, body: { error: 'The photos could not be made. Your credits were returned — nothing was charged.', reason, charged: false, refunded } }
  }

  let urls: string[] = []
  try {
    const pedidoFal = fotoChave(i.entrada)
    urls = await io.gerar(pedidoFal.endpoint, pedidoFal.input)
  } catch { urls = [] }
  if (urls.length < 2) return falha('keyframes_provider_failed')

  const nossas: string[] = []
  for (let idx = 0; idx < 2; idx++) {
    const u = await io.guardar({ userId: i.userId, pedidoId: i.pedidoId, idx, url: urls[idx] }).catch(() => null)
    if (!u) return falha('keyframes_copy_failed')
    nossas.push(u)
  }
  await io.evento(ADS_PF_EVENTOS.fotos, { pedido_id: i.pedidoId, endpoint: FOTO_CHAVE_ENDPOINT, usd: FOTO_CHAVE_USD, fotos: nossas, quantas: 2, apresentador: i.entrada.apresentadorId, formato: i.entrada.formatoId }).catch(() => {})
  return { status: 200, body: { pedidoId: i.pedidoId, fotos: [nossas[0], nossas[1]], creditos: ADS_PESSOA_FALANDO_CREDITS as number, charged: true } }
}
