import { RECREATE_RELEASE, RECREATE_SWAP_RELEASE, RECREATE_MOVIMENTO_RELEASE } from './release'
import { recreateFormat, recreateSwapPriced } from './formats'
import { RECREATE_FLOW_ENABLED } from './flowRelease'

/** Only catalog items can become Recreate links; the switch restores all legacy destinations when closed. */
export function publicRecreatePath(id: string): string | null {
  const f = recreateFormat(id)
  // KINEO-RECREATE-TRAVA-1011 — a public link to a SWAP needs the swap switch public AND the format approved and priced.
  // KINEO-RECREATE-MOVIMENTO-1411 — o movimento só ganha link público com o interruptor dele 'public' E o molde aprovado (nunca pela regra do efeito).
  const open = !!f && (f.type === 'motion' ? RECREATE_MOVIMENTO_RELEASE === 'public' && f.movimentoAprovado === true && recreateSwapPriced(f)
    : f.type !== 'swap' || (RECREATE_SWAP_RELEASE === 'public' && f.swapApproved === true && recreateSwapPriced(f)))
  return RECREATE_RELEASE === 'public' && open ? `/recreate/${id}` : null
}
// KINEO-HOME-PITCH-1611 [dono 16/11 ~00:10: "Coloca o pitch na homepage!! Em alguma posição de destaque"] — moldes do Recreate abertos a TODO cliente
// LOGADO que NÃO estão no catálogo do navegador (a receita mora só no servidor: lib/recreate/catalogoServidor.ts). Nenhum dado do molde vem para cá
// (este módulo chega ao JavaScript público): só o id. Logado abre /recreate/<id>; visitante passa pelo cadastro e volta para lá (a página exige login
// e dá 404 a visitante; o cadastro não lê nada do molde). O guardião scripts/test-home-pitch-1611.mjs prova que cada id daqui existe no catálogo do
// servidor e que um cliente comum o vê: fechar o molde (INVASOR_ABERTO_AO_PUBLICO = false) deixa o guardião vermelho até a linha sair daqui.
export const RECREATE_MOLDES_SO_LOGADO: readonly string[] = ['invasor-de-campo']
export function recreateMoldeLogadoHref(id: string, signedIn: boolean): string | null {
  if (!RECREATE_MOLDES_SO_LOGADO.includes(id)) return null
  const path = `/recreate/${id}`
  return signedIn ? path : '/signup?' + new URLSearchParams({ redirect: path }).toString()
}
export function recreateEntryHref(id: string, signedIn: boolean): string | null {
  const path = recreateFormat(id) ? `/recreate/${id}` : null
  return path === null ? null : signedIn || (RECREATE_FLOW_ENABLED && publicRecreatePath(id)) ? path : '/signup?' + new URLSearchParams({ redirect: path }).toString()
}
