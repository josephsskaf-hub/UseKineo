/**
 * KINEO-FIRST-PAID-MINUTE-2026-08-11 — o handshake do "primeiro minuto pago".
 *
 * POR QUE ESTE ARQUIVO EXISTE (defeito D9 da 2ª revisão adversarial)
 * -----------------------------------------------------------------
 * A autorização mora numa chave de `sessionStorage` escrita por
 * `/checkout/success` e lida por `app/(dashboard)/generate/GenerateClient.tsx`.
 * Enquanto a chave e o TTL viviam duplicados como literais nos dois arquivos,
 * renomear qualquer um dos lados desligava o recurso EM SILÊNCIO — sem erro de
 * compilação, sem evento, sem nada. Com um módulo único, o compilador passa a
 * ser a garantia.
 *
 * POR QUE `sessionStorage` E NÃO A URL
 * ------------------------------------
 * A página de sucesso manda o comprador para
 * `/generate?create_intent=fast&prompt=…&utm_source=checkout_success&utm_medium=first_win`.
 * Se a exceção "conta paga pode auto-gerar" fosse autorizada por esses
 * parâmetros, o link seria copiável: qualquer terceiro poderia disparar uma
 * geração — com prompt escolhido por ele — no saldo de um pagante logado.
 * Contas pagas eram imunes a esse vetor antes desta sprint e continuam imunes.
 * `sessionStorage` é same-origin e por aba: ninguém escreve nele de fora e ele
 * não viaja dentro de um link. As UTMs seguem no href, mas só como analytics.
 *
 * POR QUE TTL E NÃO USO ÚNICO
 * ---------------------------
 * A 1ª versão consumia a chave no momento de armar. Isso matava a recuperação
 * do estado `'eligible'` (defeito D7): quem dá F5 entre "armou" e "despachou"
 * não gastou crédito nenhum e merece a segunda tentativa — mas chegava sem
 * autorização e caía em `paid_account`. Um refresh também zera os refs do
 * componente, então nenhuma memória em RAM sobrevive ali. O TTL resolve os dois
 * casos: vale para a viagem checkout → primeiro vídeo, não para a sessão
 * inteira, e quem já despachou é barrado pelo `already_consumed` do rail (que
 * não recupera dispatch de conta paga, por decisão do defeito D1).
 */

export const FIRST_WIN_HANDSHAKE_KEY = 'kineo_first_win_until'

/** Janela da viagem checkout → primeiro vídeo. Não é a sessão do comprador. */
export const FIRST_WIN_HANDSHAKE_TTL_MS = 10 * 60 * 1000

/** Grava a autorização. Chamado por /checkout/success imediatamente antes de navegar. */
export function armFirstWinHandshake(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      FIRST_WIN_HANDSHAKE_KEY,
      String(Date.now() + FIRST_WIN_HANDSHAKE_TTL_MS),
    )
  } catch {
    // Sem sessionStorage o autostart simplesmente não arma e o botão Generate
    // manual continua sendo o caminho. Falha segura, nunca erro na tela.
  }
}

/**
 * Lê SEM consumir. O effect do autostart roda várias vezes antes de decidir
 * (espera entitlement, restauração de render, lista de vídeos); apagar a chave
 * na primeira passada mataria a autorização antes da decisão.
 */
export function peekFirstWinHandshake(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(FIRST_WIN_HANDSHAKE_KEY)
    if (!raw) return false
    const until = Number(raw)
    return Number.isFinite(until) && until > Date.now()
  } catch {
    return false
  }
}

/** Encerra a autorização quando o rail toma uma decisão final (armou ou desistiu). */
export function clearFirstWinHandshake(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(FIRST_WIN_HANDSHAKE_KEY)
  } catch {
    /* idem */
  }
}
