// KINEO-CLAUDE-1CLIQUE-2026-09-30 — fonte ÚNICA dos destinos do "conectar a Kineo ao Claude".
//
// Brief do fundador (30/09): quem clica no card "KINEO FOR CLAUDE" não pode cair numa tela de URLs para copiar e colar.
// Instalação em 1 clique ainda não existe: a listagem está EM REVISÃO no diretório do Claude, e o claude.ai não aceita
// pré-preencher nome/URL do conector por query string (testado 30/09: ?name=&url= abre o modal com os campos vazios).
// O melhor possível agora: o clique COPIA a URL do servidor e ABRE o modal "Adicionar conector personalizado" ao mesmo
// tempo — a pessoa só cola. Depois de colar, o Claude pede 3 cliques: Continuar → Adicionar → Vincular (testado 30/09).
//
// PURO: zero import, zero window. Card da home (components/PromoCards.tsx), painel (app/claude-connector/ConnectPanel.tsx)
// e página (app/claude-connector/page.tsx) importam daqui. Guardião: scripts/test-works-with-claude-2026-09-30.mjs.
// Quando a listagem for APROVADA e PUBLICADA: o destino do card e do botão principal passa a ser a página da Kineo no
// diretório (botão "Connect" nativo) — ver a memória diretorio-claude-recusa-midia-por-ia.

/** O servidor MCP remoto da Kineo (sempre com www: o redirect do apex derruba cabeçalhos no cliente de conectores). */
export const CLAUDE_MCP_SERVER_URL = 'https://www.usekineo.com/api/mcp'
/** O modal "Adicionar conector personalizado" do claude.ai (testado no Chrome do fundador, 30/09 ~09:15 BRT). */
export const CLAUDE_ADD_CONNECTOR_URL = 'https://claude.ai/customize/connectors?modal=add-custom-connector'
/** Chat novo com o texto na caixa, SEM enviar (testado 30/09). Deslogado, o login devolve ao mesmo pedido (returnTo). */
export const CLAUDE_NEW_CHAT_URL = 'https://claude.ai/new?q='
/** A página da Kineo sobre o conector (URL estável: card da home, selo de /pricing, rodapé, submissão do diretório). */
export const CLAUDE_CONNECTOR_PAGE = '/claude-connector'
/** Âncora do painel de conexão na página. */
export const CLAUDE_CONNECT_ANCHOR = 'connect'

/** De onde a pessoa veio (lista FECHADA — vai para os eventos). */
export const CLAUDE_CONNECT_SOURCES = ['home_card', 'pricing_badge', 'footer', 'page'] as const
export type ClaudeConnectSource = (typeof CLAUDE_CONNECT_SOURCES)[number]
export function claudeConnectSource(raw: unknown): ClaudeConnectSource {
  return typeof raw === 'string' && (CLAUDE_CONNECT_SOURCES as readonly string[]).includes(raw) ? (raw as ClaudeConnectSource) : 'page'
}

/** /claude-connector?src=<origem>[&copied=1|0]#connect */
export function claudeConnectorHref(source: ClaudeConnectSource, copied?: boolean): string {
  const q = `src=${source}${copied === undefined ? '' : `&copied=${copied ? 1 : 0}`}`
  return `${CLAUDE_CONNECTOR_PAGE}?${q}#${CLAUDE_CONNECT_ANCHOR}`
}

/** Fecho de todo pedido pronto (mecânica da Higgsfield): quem ainda não conectou é guiado pelo próprio Claude. */
export const CLAUDE_CONNECT_SENTENCE = `If Kineo is not connected, ask me to [connect Kineo](${CLAUDE_ADD_CONNECTOR_URL}) using ${CLAUDE_MCP_SERVER_URL} before continuing.`

/** Link que abre um chat novo no claude.ai com o pedido + o fecho de conexão, codificados. */
export function claudePromptHref(prompt: string): string {
  return CLAUDE_NEW_CHAT_URL + encodeURIComponent(`${prompt} ${CLAUDE_CONNECT_SENTENCE}`)
}

/** Pedido do botão "Already connected? Start in Claude" (roteiro + envio ao Studio — nunca "faça o vídeo no Claude"). */
export const CLAUDE_START_PROMPT = 'Using the Kineo connector, write a 35-second YouTube Short script about [your topic], then send it to Kineo Studio.'

/** Celular: largura < 768 ou UA móvel. No celular NÃO se abre o claude.ai (o modal de conector no app móvel não foi
 *  confirmado): só se navega para a página, com o aviso de adicionar pelo Claude na web ou no desktop. */
export const CLAUDE_MOBILE_MAX_WIDTH = 768
export function isMobileClient(width: number, userAgent: string): boolean {
  return width < CLAUDE_MOBILE_MAX_WIDTH || /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent || '')
}

/** Eventos de navegador (nomes fechados). */
export const CLAUDE_CONNECT_EVENTS = {
  copyOpen: 'claude_connect_copy_open',
  copiedStateView: 'claude_connect_copied_state_view',
  openPrompt: 'claude_open_prompt_click',
} as const
