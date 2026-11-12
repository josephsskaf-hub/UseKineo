// KINEO-ADS-PESSOA-FALANDO-TELA-1211 [SPEC-ADS-PESSOA-FALANDO-2026-11-11 §1, Div. 1 — dono 12/11: "Não adianta a gente ter os vídeos e o cara
// não conseguir fazer"] — o CONTRATO entre a tela (components/ads/PessoaFalandoPainel.tsx) e o servidor (Div. 5). Lib PURA: só nomes, tipos
// e a validação do que a tela manda. A Div. 5 implementa as 3 rotas abaixo; se mudar um nome, muda AQUI e a tela segue.
import type { ApresentadorId, FormatoId } from './formatos'
import type { Roteiro } from './roteiro'

/** As 3 chamadas da tela, nesta ordem. Nenhuma começa sozinha: cada uma nasce de um botão. */
export const PESSOA_FALANDO_API = {
  /** POST EntradaDaTela → RespostaRoteiro. O escritor (escreverRoteiro): `roteiro` aprovado, ou `rascunho` para a pessoa ajustar. */
  roteiro: '/api/ads/pessoa-falando/roteiro',
  /** POST EntradaDaTela → RespostaFotos. As 2 fotos-chave (a pessoa escolhe 1). */
  fotos: '/api/ads/pessoa-falando/fotos-chave',
  /** POST PedidoDeVideo → RespostaPedido. O único passo que cobra os créditos do botão. */
  video: '/api/ads/pessoa-falando',
} as const

/**
 * Créditos do vídeo com pessoa falando. KINEO-ADS-PESSOA-FALANDO-PRECO-1211 [dono 12/11, opção B da foto docs/decisoes-1211/preco-anuncio-falado-ABC.png]:
 * 55 créditos, SÓ o anúncio de 10 s (sem seletor de 12 s). null = a tela mostra o botão sem número e não deixa pedir. A resposta das fotos
 * (`creditos`) vale por cima, se o servidor mandar.
 */
export const ADS_PESSOA_FALANDO_CREDITS: number | null = 55

/** O lançamento é só o anúncio de 10 s: a fala cabe em 25 palavras (lib/ads/pessoaFalando/prompts.ts duracaoDaFala: ≤ 25 palavras = 10 s). */
export const FALA_MAX_PALAVRAS = 25
export function palavrasDaFala(fala: string): number { return String(fala ?? '').trim().split(/\s+/u).filter(Boolean).length }

/** O saldo cobre o vídeo? null = leitura falhou (a tela não inventa "0": deixa o servidor decidir no pedido). */
export function saldoCobre(saldo: number | null, creditos: number | null): boolean | null {
  if (saldo === null || creditos === null) return null
  return saldo >= creditos
}

export interface EntradaDaTela { fotoDoProduto: string; produto: string; frase: string; apresentadorId: ApresentadorId; formatoId: FormatoId }
export interface RespostaRoteiro { roteiro: Roteiro | null; rascunho: Roteiro | null; motivos?: string[] }
export interface RespostaFotos { fotos: [string, string]; creditos?: number | null }
export interface PedidoDeVideo extends EntradaDaTela { fotoChave: string; roteiro: Roteiro }
export interface RespostaPedido { pedidoId: string; acompanhar?: string }

export const FRASE_MAX = 140
export const PRODUTO_MAX = 60
export const FALA_MAX = 400

/** O que falta para o botão do passo poder ser apertado (null = pode). Mesma régua no servidor. */
export function faltaNaEntrada(e: Partial<EntradaDaTela>): string | null {
  if (!/^https:\/\/\S+$/u.test(String(e.fotoDoProduto ?? '').trim())) return 'Add a link to your product photo (https://…).'
  if (!String(e.produto ?? '').trim()) return 'Name your product.'
  if (!String(e.frase ?? '').trim()) return 'Write one line: what it sells.'
  if (!e.apresentadorId) return 'Choose who talks.'
  if (!e.formatoId) return 'Choose where they film it.'
  return null
}
