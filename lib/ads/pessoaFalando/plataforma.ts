// KINEO-ADS-PESSOA-FALANDO-PLATAFORMA-1211 — a parte da plataforma (Div. 5) do anúncio "pessoa falando" (docs/SPEC-ADS-PESSOA-FALANDO-2026-11-11.md §3).
// Módulo PURO (sem rede, sem banco): a rota (app/api/ads/pessoa-falando/route.ts) e o guardião usam as MESMAS regras.
//
// · Acesso: atrás de KINEO_ADS_PESSOA_FALANDO ('internal' hoje). Conta de fora recebe 404 honesto; a casa (isAdsInternalEmail) passa.
// · Créditos: UMA constante, ADS_PESSOA_FALANDO_CREDITS — PENDENTE_DECISAO_DO_DONO. Enquanto for null, o pedido PAGO é recusado ANTES de
//   qualquer débito ou chamada à fal (409 price_pending, charged:false). O dry-run de US$ 0 funciona sem preço.
// · Reserva: o padrão do filme completo (KINEO-RESERVA-FILME-COMPLETO-1111) — débito pelo ponto único (debit_video_credits_service,
//   idempotente por chave) ANTES da 1ª chamada paga, numa chave por pedido (`adspf-<pedido>`); estorno integral pela mesma chave em
//   qualquer falha (refund_render_credits, idempotente: só o 1º estorno devolve).
// · Eventos: um por passo da spec, com o pedido e o custo do passo.
import { KINEO_ADS_PESSOA_FALANDO, pessoaFalandoLigado, apresentador, formato, type ApresentadorId, type FormatoId, type ModoPessoaFalando } from './formatos'
import type { Roteiro } from './roteiro'

/** PENDENTE_DECISAO_DO_DONO — créditos por anúncio pessoa falando (10–12 s). null = o pedido pago não abre. Margem: docs/ADS-20-NO-MOLDE-HALO-2026-11-11.md. */
export const ADS_PESSOA_FALANDO_CREDITS: number | null = null

export const ADS_PF_EVENTOS = {
  dryRun: 'ads_pf_dry_run',
  reservado: 'ads_pf_credits_reserved',
  plano: 'ads_pf_plan_written',
  fotos: 'ads_pf_keyframes_ready',
  escolhida: 'ads_pf_keyframe_chosen',
  render: 'ads_pf_render_started',
  juiz: 'ads_pf_judge',
  entregue: 'ads_pf_delivered',
  estornado: 'ads_pf_refunded',
} as const

/** A conta pode usar o formato? Fora do interruptor = 404 (a rota não diz que o formato existe). */
export function pessoaFalandoAcesso(contaDaCasa: boolean, modo: ModoPessoaFalando = KINEO_ADS_PESSOA_FALANDO): boolean {
  return pessoaFalandoLigado(modo, contaDaCasa)
}

/** A chave do débito do pedido: a mesma na reserva e no estorno. */
export function chaveDeCobranca(pedidoId: string): string {
  return `adspf-${pedidoId}`
}

const URL_HTTPS = /^https:\/\/[^\s"'<>]{8,600}$/

export interface PedidoPessoaFalando {
  dryRun: boolean
  entrada: { apresentadorId: ApresentadorId; formatoId: FormatoId; produto: string; fotoDoProduto: string; frase: string; roupa?: string }
  roteiro: Roteiro | null
}

/** Lê o corpo do pedido. Nunca lança: devolve o erro em palavras para a rota responder 400. */
export function lerPedido(body: unknown): { ok: true; pedido: PedidoPessoaFalando } | { ok: false; erro: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, erro: 'body_must_be_an_object' }
  const b = body as Record<string, unknown>
  if (!apresentador(b.apresentador)) return { ok: false, erro: 'unknown_presenter' }
  if (!formato(b.formato)) return { ok: false, erro: 'unknown_format' }
  const produto = typeof b.produto === 'string' ? b.produto.trim() : ''
  const frase = typeof b.frase === 'string' ? b.frase.trim() : ''
  const foto = typeof b.foto_do_produto === 'string' ? b.foto_do_produto.trim() : ''
  if (produto.length < 3 || produto.length > 200) return { ok: false, erro: 'product_3_to_200_chars' }
  if (frase.length < 3 || frase.length > 300) return { ok: false, erro: 'claim_3_to_300_chars' }
  if (!URL_HTTPS.test(foto)) return { ok: false, erro: 'product_photo_must_be_https_url' }
  let roteiro: Roteiro | null = null
  if (b.roteiro !== undefined) {
    const r = b.roteiro as Record<string, unknown> | null
    const gestos = Array.isArray(r?.gestos) ? r!.gestos : null
    if (!r || typeof r.fala !== 'string' || !gestos || !gestos.every((g) => g && typeof (g as Record<string, unknown>).palavra === 'string' && typeof (g as Record<string, unknown>).gesto === 'string')) {
      return { ok: false, erro: 'script_must_be_{fala,gestos[{palavra,gesto}]}' }
    }
    roteiro = { fala: r.fala.trim(), gestos: gestos.map((g) => ({ palavra: String((g as Record<string, unknown>).palavra), gesto: String((g as Record<string, unknown>).gesto) })) }
  }
  const dryRun = b.dry_run === true
  if (dryRun && !roteiro) return { ok: false, erro: 'dry_run_needs_the_script' } // o dry-run não chama o escritor (nem a OpenAI): o roteiro vem no pedido
  const roupa = typeof b.roupa === 'string' && b.roupa.trim() ? b.roupa.trim().slice(0, 200) : undefined
  return { ok: true, pedido: { dryRun, roteiro, entrada: { apresentadorId: b.apresentador as ApresentadorId, formatoId: b.formato as FormatoId, produto, fotoDoProduto: foto, frase, ...(roupa ? { roupa } : {}) } } }
}

export type Reserva = 'reserved' | 'insufficient' | 'unavailable'
export interface IoCreditos {
  debitar: (i: { userId: string; chave: string; creditos: number }) => Promise<Reserva>
  estornar: (chave: string) => Promise<number>
}

/** Reserva ANTES da 1ª chamada paga. Sem preço decidido, não reserva nada (e a rota já recusou antes). */
export async function reservarPessoaFalando(io: IoCreditos, i: { userId: string; pedidoId: string; creditos?: number | null }): Promise<Reserva | 'price_pending'> {
  const creditos = i.creditos === undefined ? ADS_PESSOA_FALANDO_CREDITS : i.creditos
  if (creditos === null || !Number.isInteger(creditos) || creditos <= 0) return 'price_pending'
  try { return await io.debitar({ userId: i.userId, chave: chaveDeCobranca(i.pedidoId), creditos }) } catch { return 'unavailable' }
}

/** Estorno integral em qualquer falha do pedido (juiz reprovou 2 vezes, fornecedor recusou, montagem falhou). Idempotente. */
export async function estornarPessoaFalando(io: IoCreditos, pedidoId: string): Promise<number> {
  try { return await io.estornar(chaveDeCobranca(pedidoId)) } catch { return 0 }
}
