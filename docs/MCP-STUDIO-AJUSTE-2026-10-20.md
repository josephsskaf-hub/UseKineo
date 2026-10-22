# KINEO-MCP-STUDIO-AJUSTE-2010 — ajuste do conector Kineo Studio (20/10/2026)

Depois do 1º filme real pelo conector (Claude: job `fa216362`; ChatGPT: job `6ce0763f`), o fundador pediu 5 ajustes numa entrega só.

## 1. Título perdido
- Causa: `/api/compose/status` deriva `videos.title` da 1ª linha do tema; no modo "Let AI structure" o tema começa com
  `[Idea: …]` — a linha inteira é colchete, sai vazia, o título nasce NULL (afeta também ~4% dos vídeos do site).
- Conserto (sem tocar o pipeline): `kineo_video_status` e `kineo_list_videos` preenchem `videos.title` com o título pedido
  (`mcp_studio_jobs.dispatch.title`) **só quando NULL e só no vídeo da própria conta** (`lib/mcp/studioTools.ts`).
- Fica para depois (pipeline, TRAVA 8.2): a derivação do título no `/api/compose/status` ignorar a linha `[Idea: …]`.

## 2. Cópia
- Herói da `/claude-connector`: "nunca renderiza/cria conta/cobra" vale para o **Kineo MCP**; o **Kineo Studio** faz o filme na
  conta e gasta os créditos dela.
- Tela de consentimento OAuth: nomeia o app pelo host do redirect (claude.ai → Claude, chatgpt.com → ChatGPT; nome da DCR só
  se for conhecido) ou fica neutra ("in the app you connected (Claude, ChatGPT…)").

## 3. Tutorial do ChatGPT
ChatGPT → Settings → Apps & Connectors (Plugins em algumas versões) → Advanced settings → Developer mode → Create / "Add
custom MCP server" → nome "Kineo Studio", URL `https://www.usekineo.com/api/mcp/studio`, Authentication OAuth, "I trust this
application" → Allow na tela da Kineo → numa conversa nova, ligar o Kineo Studio no "+" / Developer mode. Plano pago (Plus+).
Em EN e PT na seção Kineo Studio e na aba ChatGPT do painel.

## 4. Estorno quando o render falha
- O conector não debita nada: quem debita/estorna é `/api/generate-video-cinematic` (o mesmo do botão Generate).
- Buraco achado: quando a rota responde `pending` (409/503), cai (sem resposta) ou dá 5xx, o claim pode ficar em
  `pending`/`done` com o débito feito — e quem fecha esse claim é o **cliente reenviando a mesma geração** (o refund-sweep só olha
  claim `settled`). O site reenvia; o conector não reenviava nem gravava job: crédito preso e a mesma `idempotency_key` cobrava
  de novo (geração nova).
- Conserto: o create reenvia a mesma geração enquanto a rota diz `pending` (até 6 vezes, dentro de 200 s); se não fechar, grava
  o job com o corpo e o `kineo_video_status` (a partir de 2 min) reenvia — a rota liquida (o filme segue) ou estorna o pending
  vencido e libera o claim (status `refunded`). A mesma chave passa a devolver o job, nunca cobra de novo.
- Falha depois do despacho (cron too_few, sweep de `settled` sem entrega): a rota/cron estorna e libera; o status lê `released`
  → `refunded`. Já estava certo.
- Prova offline: `scripts/test-mcp-studio-ajuste-2010.mjs` (dublês de banco, rota com razão de créditos, sessão e relógio).

## 5. Página `/claude-connector` nova
Clara, nos tokens e na fonte da home; vídeos velhos fora; vitrine de 9 (3 UGC, 3 anúncios de produto, 3 filmes) com clipes que
o site já serve; topo "Live in Claude · Live in ChatGPT"; app da loja do ChatGPT "in review" em nota pequena.
