// KINEO-NO-CLAUDE-0911 [fundador 09/11: "também quero isso: generate in Claude, with Kineo AI" + regra "copiar 90%"] —
// /kineo-in-claude: a página "Kineo dentro do Claude e do ChatGPT" no molde da página MCP da Higgsfield (/mcp?tab=claude).
// Rota própria, e não a /claude-connector, porque a /claude-connector é a documentação que o Connectors Directory do Claude
// revisa para o conector /api/mcp (que nunca renderiza) — um herói "generate videos" lá falaria pelo conector errado.
// A /claude-connector aponta para cá; esta página aponta de volta para ela.
//
// Tudo que tem fonte vem da fonte: URL do conector (lib/claudeConnect.ts), ferramentas (buildStudioTools — o mesmo objeto de
// tools/list), créditos por duração (engineCatalog → creditCostForDuration), motores fora de oferta (UNAVAILABLE_ENGINE_KEYS),
// cartões e texto (lib/generateInClaude.ts). Nenhum preço, motor ou número de uso digitado.
import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import { UNAVAILABLE_ENGINE_KEYS } from '@/lib/engineLaunch'
import { CLAUDE_CONNECTOR_PAGE, CLAUDE_STUDIO_MCP_SERVER_URL } from '@/lib/claudeConnect'
import { buildStudioTools, engineCatalog } from '@/lib/mcp/studioMcp'
import { ASK_CARDS, GENERATE_IN_CLAUDE_PATH } from '@/lib/generateInClaude'
import GenerateInClaude, { type CreditRow } from './GenerateInClaude'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Generate videos in Claude and ChatGPT with Kineo',
  description:
    'Add the Kineo Studio connector to Claude or ChatGPT, sign in to your Kineo account, and ask for a narrated film in the chat. Kineo makes it in your account with your credits and the chat gets the link.',
  alternates: { canonical: `${BASE}${GENERATE_IN_CLAUDE_PATH}` },
  openGraph: {
    title: 'Generate videos in Claude with Kineo',
    description: 'Ask Claude or ChatGPT for a narrated film. Kineo makes it in your Kineo account and the chat gets the link.',
    url: `${BASE}${GENERATE_IN_CLAUDE_PATH}`,
    type: 'website',
  },
}

export default function GenerateInClaudePage() {
  const catalog = engineCatalog(UNAVAILABLE_ENGINE_KEYS)
  /** Para cada duração oferecida: o menor preço entre os motores em oferta ("from N credits"), sem nomear motor. */
  const seconds = Array.from(new Set(catalog.flatMap((c) => c.durations.map((d) => d.seconds)))).sort((a, b) => a - b)
  const credits: CreditRow[] = seconds.map((s) => ({
    seconds: s,
    from: Math.min(...catalog.flatMap((c) => c.durations.filter((d) => d.seconds === s).map((d) => d.credits))),
  }))
  const fromFor = (s: number) => credits.find((r) => r.seconds === s)?.from ?? null
  const cards = ASK_CARDS.map((c) => ({ ...c, from: fromFor(c.duration) }))
  const tools = buildStudioTools({ pausedEngines: UNAVAILABLE_ENGINE_KEYS }).map((t) => ({ name: t.name, title: t.title, readOnly: t.annotations.readOnlyHint }))

  return (
    <>
      <GenerateInClaude
        serverUrl={CLAUDE_STUDIO_MCP_SERVER_URL}
        cards={cards}
        credits={credits}
        tools={tools}
        scriptsOnlyHref={CLAUDE_CONNECTOR_PAGE}
      />
      <Footer />
    </>
  )
}
