// KINEO-CLAUDE-1CLIQUE-2026-09-30 — o gesto "copiar a URL + abrir o modal de conector do Claude", só para componentes
// de cliente (usa navigator/window). Destinos em lib/claudeConnect.ts (fonte única, pura).
import { CLAUDE_ADD_CONNECTOR_URL, CLAUDE_MCP_SERVER_URL } from '@/lib/claudeConnect'

/**
 * Tem de rodar DENTRO do onClick: fora do gesto do usuário o navegador bloqueia a área de transferência e a aba nova.
 * A cópia COMEÇA antes do window.open (os dois no mesmo tique do gesto) e o resultado dela só é aguardado depois de a
 * aba abrir. Devolve true só se a URL foi mesmo para a área de transferência — quem chama mostra o campo Copy se falhar.
 */
export async function copyUrlAndOpenClaude(opts: { open: boolean }): Promise<boolean> {
  let copying: Promise<void> | null = null
  try {
    copying = navigator.clipboard?.writeText(CLAUDE_MCP_SERVER_URL) ?? null
  } catch {
    copying = null
  }
  if (opts.open) {
    try {
      window.open(CLAUDE_ADD_CONNECTOR_URL, '_blank', 'noopener')
    } catch {
      /* pop-up bloqueado: a página mostra o botão de novo */
    }
  }
  if (!copying) return false
  try {
    await copying
    return true
  } catch {
    return false
  }
}
