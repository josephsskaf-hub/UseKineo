// KINEO-PAGINAS-CONECTOR-2110 — quatro guias do Kineo Studio (OAuth), com pares EN/PT.
// Conteúdo aprovado no pedido do fundador em 21/10; nenhum preço em dinheiro ou promessa de renda.
import type { Metadata } from 'next'

export type ConnectorClient = 'chatgpt' | 'claude'
export type ConnectorLanguage = 'en' | 'pt'
export const CONNECTOR_GUIDES_REVIEWED = '2026-10-21'
export const CONNECTOR_GUIDES_BASE = 'https://www.usekineo.com'

export const CONNECTOR_GUIDES = [
  { client: 'chatgpt', lang: 'en', path: '/make-ai-videos-in-chatgpt', title: 'Make AI videos in ChatGPT', description: 'Connect Kineo Studio to ChatGPT with OAuth. Follow the setup steps, create narrated films with Kineo credits, or prepare an ad and continue in Studio Ads. Requires paid ChatGPT.' },
  { client: 'chatgpt', lang: 'pt', path: '/criar-videos-com-ia-no-chatgpt', title: 'Crie vídeos com IA no ChatGPT', description: 'Conecte o Kineo Studio ao ChatGPT com OAuth. Veja o passo a passo, crie filmes narrados com créditos Kineo ou prepare um anúncio para continuar no Studio Ads. Exige ChatGPT pago.' },
  { client: 'claude', lang: 'en', path: '/make-ai-videos-in-claude', title: 'Make AI videos in Claude', description: 'Add Kineo Studio as a custom Claude connector with OAuth. Create narrated films with Kineo credits, or prepare an ad and continue in Studio Ads. Setup and safety FAQ.' },
  { client: 'claude', lang: 'pt', path: '/criar-videos-com-ia-no-claude', title: 'Crie vídeos com IA no Claude', description: 'Adicione o Kineo Studio como conector personalizado do Claude com OAuth. Crie filmes narrados com créditos Kineo ou prepare um anúncio para continuar no Studio Ads. Passos e FAQ.' },
] as const

export function connectorGuide(client: ConnectorClient, lang: ConnectorLanguage) {
  return CONNECTOR_GUIDES.find((guide) => guide.client === client && guide.lang === lang)!
}

export function connectorGuideMetadata(client: ConnectorClient, lang: ConnectorLanguage): Metadata {
  const guide = connectorGuide(client, lang)
  const url = `${CONNECTOR_GUIDES_BASE}${guide.path}`
  const title = `${guide.title} | Kineo`
  const images = [{ url: `${CONNECTOR_GUIDES_BASE}/og-card.png?v=claro-1001b`, width: 1200, height: 630, alt: guide.title }]
  return {
    metadataBase: new URL(CONNECTOR_GUIDES_BASE),
    title,
    description: guide.description,
    alternates: {
      canonical: url,
      languages: {
        en: `${CONNECTOR_GUIDES_BASE}${connectorGuide(client, 'en').path}`,
        pt: `${CONNECTOR_GUIDES_BASE}${connectorGuide(client, 'pt').path}`,
        'x-default': `${CONNECTOR_GUIDES_BASE}${connectorGuide(client, 'en').path}`,
      },
    },
    openGraph: { title, description: guide.description, url, type: 'website', siteName: 'Kineo (usekineo.com)', locale: lang === 'pt' ? 'pt_BR' : 'en_US', alternateLocale: lang === 'pt' ? ['en_US'] : ['pt_BR'], images },
    twitter: { card: 'summary_large_image', title, description: guide.description, images },
  }
}

export function connectorGuideSteps(client: ConnectorClient, lang: ConnectorLanguage) {
  if (client === 'chatgpt') return lang === 'pt' ? [
    ['Ligue o Modo desenvolvedor', 'No ChatGPT pago: Configurações → Apps e Conectores (ou Plugins) → Configurações avançadas → Modo desenvolvedor. Em versões com a nova interface, use Plugins → + → Adicionar servidor MCP personalizado. Os nomes podem variar conforme a versão e as permissões da sua conta.'],
    ['Adicione o Kineo Studio', 'Clique em Criar ou Adicionar servidor MCP personalizado. Nome: Kineo Studio. Cole a URL abaixo e escolha Autenticação: OAuth.'],
    ['Entre na Kineo e autorize', 'Entre na sua conta Kineo na tela de login que abrir. Leia as permissões e clique em Permitir (Allow). Nunca cole sua senha na conversa.'],
    ['Ative na conversa e faça o pedido', 'Em uma nova conversa, ative Kineo Studio no menu + / Modo desenvolvedor. Peça um filme narrado, revise o pedido e confirme a criação quando solicitado. Para anúncios, prepare o briefing e continue no Studio Ads; o conector pode fornecer um link do Kineo Studio.'],
  ] : [
    ['Enable Developer mode', 'In paid ChatGPT: Settings → Apps & Connectors (or Plugins) → Advanced settings → Developer mode. In versions with the new interface, use Plugins → + → Add custom MCP server. Labels can vary with your version and account permissions.'],
    ['Add Kineo Studio', 'Click Create or Add custom MCP server. Name it Kineo Studio, paste the URL below and choose Authentication: OAuth.'],
    ['Sign in to Kineo and allow', 'Sign in to your Kineo account on the login screen that opens. Review the permissions and click Allow. Never paste your password into the conversation.'],
    ['Enable it in a chat and ask', 'In a new chat, enable Kineo Studio from the + / Developer mode menu. Ask for a narrated film, review the request and confirm creation when prompted. For ads, prepare the brief and continue in Studio Ads; the connector can provide a Kineo Studio link.'],
  ]
  return lang === 'pt' ? [
    ['Abra os conectores do Claude', 'No Claude: Personalizar → Conectores → Adicionar conector personalizado. Se sua conta pertence a uma organização, o administrador pode precisar liberar conectores.'],
    ['Cole a URL do Kineo Studio', 'Dê o nome Kineo Studio e cole a URL abaixo. Continue para o login OAuth na sua conta Kineo.'],
    ['Entre na Kineo e autorize', 'Na tela da Kineo, entre na sua conta, leia as permissões e clique em Permitir (Allow). Nunca cole sua senha na conversa.'],
    ['Ative na conversa e faça o pedido', 'Ative Kineo Studio na conversa. Peça um filme narrado, revise o pedido e confirme a criação quando solicitado. Para anúncios, prepare o briefing e continue no Studio Ads; o conector pode fornecer um link do Kineo Studio. O Claude consulta o andamento e pode trazer o link do vídeo quando estiver pronto.'],
  ] : [
    ['Open Claude connectors', 'In Claude: Customize → Connectors → Add custom connector. If your account belongs to an organization, an administrator may need to enable connectors.'],
    ['Paste the Kineo Studio URL', 'Name it Kineo Studio and paste the URL below. Continue to OAuth sign-in with your Kineo account.'],
    ['Sign in to Kineo and allow', 'On the Kineo screen, sign in, review the permissions and click Allow. Never paste your password into the conversation.'],
    ['Enable it in a chat and ask', 'Enable Kineo Studio in the conversation. Ask for a narrated film, review the request and confirm creation when prompted. For ads, prepare the brief and continue in Studio Ads; the connector can provide a Kineo Studio link. Claude can check progress and bring back the video link when it is ready.'],
  ]
}

export function connectorGuideFaq(client: ConnectorClient, lang: ConnectorLanguage) {
  const name = client === 'chatgpt' ? 'ChatGPT' : 'Claude'
  const revoke = client === 'chatgpt'
    ? (lang === 'pt' ? 'No ChatGPT, abra Apps e Conectores (ou Plugins), selecione Kineo Studio e desconecte a conexão MCP. Se você também instalou um plugin, desinstalá-lo sozinho pode não desconectar o servidor: confira a conexão.' : 'In ChatGPT, open Apps & Connectors (or Plugins), select Kineo Studio and disconnect the MCP connection. If you also installed a plugin, uninstalling it alone may not disconnect the server: check the connection.')
    : (lang === 'pt' ? 'No Claude: Personalizar → Conectores → Kineo Studio → Desconectar ou Remover. A opção Remover também pode aparecer no menu de três pontos.' : 'In Claude: Customize → Connectors → Kineo Studio → Disconnect or Remove. Remove may also appear in the three-dot menu.')
  return lang === 'pt' ? [
    { q: 'Preciso de plano pago do ChatGPT?', a: client === 'chatgpt' ? 'Sim. Este caminho de servidor MCP personalizado exige um plano pago do ChatGPT e acesso ao Modo desenvolvedor. A assinatura do ChatGPT não inclui créditos Kineo.' : 'Para este guia do Claude, não: você usa sua conta Claude. Para conectar o Kineo Studio no ChatGPT, precisa de um plano pago do ChatGPT. As permissões de conectores do Claude dependem da sua conta.' },
    { q: `É seguro conectar a Kineo ao ${name}?`, a: 'Você entra na Kineo por OAuth e revisa a tela Allow. O conector pode ler plano, saldo e vídeos recentes, criar vídeos e gastar os créditos da sua conta. Autorize apenas a URL oficial desta página. Nunca envie sua senha no chat. Revise o pedido antes de autorizar uma criação.' },
    { q: 'Como revogar o acesso?', a: revoke },
    { q: 'Quanto custa criar um vídeo?', a: 'Você paga com os créditos da sua conta Kineo. O custo depende do motor, da duração e do tipo de vídeo. Peça ao assistente para consultar seu saldo e o custo antes de criar; consulte os planos atuais na Kineo. Ter ChatGPT ou Claude não fornece créditos Kineo.' },
    { q: 'Já posso pedir desenho infantil 3D pelo conector?', a: 'Em breve. Desenho infantil 3D ainda não está disponível por este conector. Hoje, o conector cria filmes narrados. Para anúncios, ele devolve um link do Kineo Studio, sem gerar nem cobrar o anúncio na conversa. Continue a criação no Studio Ads.' },
  ] : [
    { q: 'Do I need a paid ChatGPT plan?', a: client === 'chatgpt' ? 'Yes. This custom MCP server setup requires a paid ChatGPT plan and access to Developer mode. Your ChatGPT subscription does not include Kineo credits.' : 'Not for this Claude guide: you use your Claude account. Connecting Kineo Studio in ChatGPT requires a paid ChatGPT plan. Claude connector permissions depend on your account.' },
    { q: `Is it safe to connect Kineo to ${name}?`, a: 'You sign in to Kineo with OAuth and review the Allow screen. The connector can read your plan, balance and recent videos, create videos and spend your account credits. Only authorize the official URL on this page. Never send your password in chat. Review a creation request before approving it.' },
    { q: 'How do I revoke access?', a: revoke },
    { q: 'How much does a video cost?', a: 'You pay with the credits in your Kineo account. Cost depends on the engine, duration and video type. Ask the assistant to check your balance and the cost before creating, and see current Kineo plans. Having ChatGPT or Claude does not provide Kineo credits.' },
    { q: 'Can I request a 3D kids cartoon through the connector?', a: 'Coming soon. 3D kids cartoons are not yet available through this connector. Today, the connector creates narrated films. For ads, it returns a Kineo Studio link, without generating or charging for the ad in chat. Continue creation in Studio Ads.' },
  ]
}

export function connectorGuideLlmsLines(base: string): string {
  return CONNECTOR_GUIDES.map((guide) => `- [${guide.title}](${base}${guide.path}): ${guide.description}`).join('\n')
}
