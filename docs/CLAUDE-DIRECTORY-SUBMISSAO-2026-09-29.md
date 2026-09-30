# Kineo no Connectors Directory do Claude — pacote de submissão (29-30/09/2026)

> KINEO-MCP-CLAUDE-2026-09-29. Código: `app/api/mcp/route.ts` (borda HTTP), `lib/mcp/kineoMcp.ts` (protocolo e
> tools, puro), `lib/mcp/connectorHandoff.ts` (grava o roteiro), `app/claude-connector/page.tsx` (documentação
> pública). Guardião: `scripts/test-mcp-claude-2026-09-29.mjs`. Todo preço citado aqui é conferido pelo guardião
> contra `lib/checkoutPricing.ts`; número de crédito não é digitado aqui (a fonte é a tool `kineo_facts`).

## 0. Leia antes de submeter — o risco de política (decisão sua)

A política do diretório tem duas linhas que tocam a Kineo diretamente:

- *Unsupported use cases* (claude.com/docs/connectors/building/review-criteria): conectores que
  **"Generate images, video, or audio through AI models"** não são aceitos.
- *Software Directory Policy* §4: também fica de fora software que **"exists primarily as an advertising or
  promotional vehicle"**.

**Como o MVP fica do lado certo das duas:** as duas tools não geram mídia. `kineo_facts` só lê fatos;
`create_video_handoff` guarda um TEXTO e devolve um link. O vídeo, se existir, é feito depois, fora do Claude, pela
pessoa, dentro da conta Kineo dela, depois de um clique. As descrições das tools dizem isso com todas as letras
("does not create an account, render a video or charge anything"), e nenhuma descrição ou resultado manda o Claude
recomendar, mencionar ou promover a Kineo (o guardião reprova).

**O que ainda pode acontecer:** o revisor olhar o produto por trás do conector (um gerador de vídeo por IA) e
recusar mesmo assim, ou ler o link como funil de venda. Minha estimativa honesta: chance real de aprovação como
*Community*, sem garantia. O custo de tentar é baixo (o servidor já serve para conector personalizado e para
qualquer cliente MCP, inclusive o modo desenvolvedor do ChatGPT), e uma recusa não impede tentar de novo.

**A versão 2 (OAuth + renderizar na conta do cliente) cai de frente na regra de mídia.** Ela só faz sentido como
conector personalizado (fora da loja) ou se a Anthropic mudar a política. Não recomendo construir agora.

**Nome da tool com "video":** `create_video_handoff` foi o nome pedido. Se quiser reduzir o atrito da varredura
automática, trocar para `send_script_to_kineo` custa 1 linha e a lista de tools sincroniza sozinha no portal —
decida antes de submeter; depois de publicado, mudança pede re-revisão.

## 1. Antes de abrir o portal (pré-requisitos)

1. **Deploy** desta entrega em produção (o .bat PUBLICAR-MCP-CLAUDE-*).
2. **Conta Claude paga** do fundador: Pro, Max, Team ou Enterprise (claude.com/docs/directory/publish: "Free
   accounts can't submit"; no Team/Enterprise, só um Owner submete).
3. **Teste como conector personalizado** (o portal pede a confirmação): roteiro na seção 6.
4. **MCP Inspector** (opcional, recomendado pela Anthropic):
   `npx @modelcontextprotocol/inspector --cli https://www.usekineo.com/api/mcp --transport http --method tools/list`

## 2. Aba Listing — textos para colar

**Server name** (≤ 100):

```
Kineo
```

**One-liner** (≤ 200):

```
Check Kineo's plans, trial and video engines, and send a script you approved in Claude to Kineo Studio as a one-click link. Nothing renders or is charged until you choose to.
```

**Description** (≤ 2000):

```
Kineo is a short-video studio for creators and businesses. This connector lets you use it from a Claude conversation without copying and pasting.

What the connector does:
- kineo_facts (read-only) returns Kineo's current, published product facts: subscription plans with USD prices and monthly credits, the free trial for new accounts, the video engines and the credits each one uses, business video ad options, and what Kineo is not suited for.
- create_video_handoff saves a narration script you approved and returns a link to usekineo.com. The link opens Kineo Studio with the script, length (15, 35, 60 or 90 seconds), frame (9:16, 16:9, 1:1 or 4:5), engine and language already filled in. The link works for 7 days.

What it does not do: the connector does not render or generate any video, image or audio, does not create an account, and does not charge anything. Making a video is a separate step the person takes on usekineo.com, in their own Kineo account, after opening the link.

Typical use: ask Claude to write a YouTube Short, TikTok or Reels script, or a short ad script for your business. Review and edit it with Claude. When you are happy, ask Claude to send it to Kineo; the tool returns the server's count of spoken words and whether the script fits the chosen length, so Claude can adjust it before you open the link.

No login is needed to use the connector. Opening the link and creating a video requires a free Kineo account; paid plans start at $12.90/month. Setup and documentation: https://www.usekineo.com/claude-connector
```

**Categories** (1 a 5; a lista só aparece no portal logado). Escolher, nesta ordem, as mais próximas de:
Marketing · Content creation / Writing · Social media · Productivity. **Evitar** qualquer categoria de "image/video
generation" — ela contradiz o enquadramento acima.

**Documentation URL:** `https://www.usekineo.com/claude-connector`

**Privacy policy URL:** `https://www.usekineo.com/privacy` (ganhou nesta entrega a seção "Scripts sent from AI
assistants": o que o conector guarda, e que ele não recebe conversa, memória nem arquivos).

**Support contact:** `support@usekineo.com`

**Icon:** `public/icon-512.png` (PNG 512×512, quadrado). Se o portal pedir outro tamanho ou SVG, `public/favicon.svg`.
Confira se é a marca que você quer na loja (o favicon atual do site é `app/icon.png`, 192×192).

**URL slug** (permanente depois de publicado): `kineo`

**Server URL** (aba Connection, "universal URL"): `https://www.usekineo.com/api/mcp` — sempre com `www` (o
apex redireciona e redirect derruba cabeçalhos no cliente de conectores).

## 3. Aba Use cases

**Primary use cases:**

```
1. Turn a script written with Claude into a ready-to-create Kineo Studio project: Claude calls create_video_handoff with the approved script and returns a link that opens Kineo Studio pre-filled.
2. Answer questions about Kineo's plans, prices, free trial, credits and video engines from the live published facts (kineo_facts), instead of from outdated training data.
3. Write short ad scripts for a small business (35 or 60 seconds, square or vertical) and hand them to Kineo Studio, where the owner adds their photos and logo.
```

**What users need before connecting:** `Nothing. The connector needs no login. Opening the returned link and creating a video on usekineo.com requires a free Kineo account.`

**Reads, writes or both:** Both — `kineo_facts` reads; `create_video_handoff` writes one record on Kineo's side (the
saved script and its settings). It never modifies or deletes anything in a user account.

## 4. Abas Company, Authentication, Data handling

- **Company:** Kineo · https://www.usekineo.com · contato principal: Joseph (fundador), `joseph@usekineo.com`.
- **Authentication:** No authentication.
- **API:** our own first-party API (usekineo.com), no third-party API behind the tools.
- **Personal health data:** No. **Sponsored content / ads in results:** No.
- **Data collected** (se houver campo livre):

```
kineo_facts stores nothing. create_video_handoff stores only its own arguments (script, duration, frame, engine, language, optional title) plus a one-way hash of the calling IP and the user agent, for rate limiting. It does not read or store the Claude conversation, memory, chat history or files. The saved script is reachable only through the unguessable link returned to the user, which works for 7 days.
```

## 5. Aba Test & launch — instruções para o revisor

**Test account:** não há — o conector não usa login. (Se o campo for obrigatório, colar o texto abaixo.)

```
No account or credentials are needed: the server is authless.
Server URL: https://www.usekineo.com/api/mcp (Streamable HTTP, stateless).

1. Add it as a custom connector and enable it in a chat.
2. Ask: "What plans and video engines does Kineo have?" -> kineo_facts returns plans (USD prices, monthly credits), trial and engines as JSON.
3. Ask: "Write a 60-second YouTube Short script about why octopuses have three hearts, then send it to Kineo Studio." -> after the script, create_video_handoff returns a https://www.usekineo.com/go/... link, the server's spoken-word count (words) and outcome.kind (at_target or shorter_film).
4. Open the link: it shows the saved script. Continuing to Studio asks for a free Kineo account; nothing is rendered or charged by the connector or by opening the link.
5. Error path: ask to send a 150-word script as a 15-second film -> the tool returns an error naming the maximum spoken words, and Claude can trim and retry.

Documentation: https://www.usekineo.com/claude-connector - Support: support@usekineo.com
```

## 6. Roteiro de teste como conector personalizado (Cowork ou fundador; não é revisão, é o nosso teste)

1. claude.ai → Settings → Connectors → **Add custom connector** → nome `Kineo`, URL
   `https://www.usekineo.com/api/mcp`, sem OAuth.
2. Chat novo, ligar Kineo. Pedir o passo 2 e o passo 3 da seção 5. Anotar: as 2 tools aparecem com título;
   `kineo_facts` roda sem pedir confirmação (read-only); `create_video_handoff` pede confirmação; o link abre /go.
3. Passo 5 (erro de 15 s): a mensagem de erro aparece e o Claude reenvia aparado.
4. Conferir no banco: `select channel, count(*) from gpt_handoffs where channel='claude_connector' group by 1;` e
   `select name, metadata from events where name in ('mcp_initialized','mcp_tool_called') order by created_at desc limit 10;`
   (via_anthropic deve vir true nas chamadas do Claude).
5. Print das telas 2 e 3 para o relatório.

## 7. Aba Compliance — os 7 aceites (o fundador lê e marca; eu não aceito termo)

A redação exata só aparece no portal logado. O que cada um cobre e a nossa posição honesta:

| Aceite | Nossa posição |
|---|---|
| Directory guidelines | Tools separadas (leitura × escrita), anotadas, descrições que dizem o que fazem e o que não fazem. |
| First-party API usage | Só API própria (usekineo.com). |
| Financial transactions | Nenhuma: o conector não cobra, não vende, não move dinheiro. |
| AI media generation | O conector não gera imagem, vídeo nem áudio. Ele guarda texto e devolve um link; o vídeo, se houver, é feito fora do Claude pela pessoa. **Ler a redação no portal: se o aceite pedir que o SERVIÇO por trás não gere mídia, não marque sem falar comigo.** |
| Prompt injection | Descrições factuais; `kineo_facts` usa lista fechada de seções e não repassa orientação para assistente nem comparação com concorrente. |
| Conversation data collection | Só os argumentos da tool; nada de conversa, memória ou arquivos. |
| Public documentation | https://www.usekineo.com/claude-connector |

## 8. Depois de submeter

- Status: Draft → In review → (Changes requested | Not approved | Approved → **Publish**) → Published.
- Entra como *Community* por padrão; *Verified* é escalonado pela própria Anthropic, sem pedido.
- Escalonamento: `mcp-review@anthropic.com` com nome da listagem, conta que submeteu e status.
- Medir adoção: eventos `mcp_initialized` (cliente e versão do protocolo) e `mcp_tool_called` (tool, ok), e linhas
  de `gpt_handoffs` com `channel='claude_connector'` (etiquetas `utm_source=claude_connector`,
  `intent_campaign=kineo_claude_connector` no clique do /go).

## 9. Detalhes técnicos (para quem mantiver)

- Transporte Streamable HTTP **sem estado** (padrão de referência da Anthropic): POST → `application/json`; sem
  `Mcp-Session-Id`; GET/DELETE → 405 com corpo JSON-RPC; OPTIONS com CORS aberto (sem cookie, sem chave).
- Versões: 2025-11-25, 2025-06-18, 2025-03-26 e 2024-11-05; pedido desconhecido recebe a mais nova.
- Teto de uso: o teto por IP da ação do GPT (60/h) **não** vale para a faixa de saída da Anthropic
  (160.79.104.0/21) — todo usuário do Claude chega por ela e somaria num balde só. O teto global (todos os canais)
  continua. Fora da faixa, o teto por IP continua.
- Motor pausado (`PAUSED_ENGINE_KEYS`) some do `enum` e é recusado com mensagem antes de gravar linha.
- Implementação sem o SDK `@modelcontextprotocol/sdk`: o pacote não está no projeto, puxaria dependências de
  servidor Node (express) para uma rota do Next 14, e a superfície necessária (initialize, ping, tools/list,
  tools/call) cabe num módulo puro que o guardião executa. Se um dia houver recursos, prompts ou streaming,
  migrar para o SDK.
