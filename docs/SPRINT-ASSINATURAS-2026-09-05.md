# SPRINT 3 — ASSINATURAS: O RITUAL 1 → 2 → 3 → PAGA (05/09/2026 →)

Pista do Claude. Codex, desde 05/09, é dono do visual/navegação/espanhol de
TODAS as páginas (`docs/ESCOPO-CODEX-UX-CLAUDE-VENDAS-2026-09-05.md`, na
worktree do Codex). Esta pista: fluxo, aquisição, retorno e assinatura nova.
Meta do fundador (05/09): **2-3 assinaturas novas por dia**, com ações
executáveis — não ações de dados.

Placar canônico: marco zero `2026-09-03 16:00:00+00`, contas externas
(fora josephsskaf/usekineo/kineo.local). Verdade do dinheiro =
`payment_success` (webhook), nunca `checkout_success_viewed`.

## #0 — 05/09 10:00→11:30 BRT (sessão CEO, fora da rotina) — O CARTÃO DO EPISÓDIO 2 ESTAVA MORTO PARA 9 EM 10 PESSOAS

**O número.** Pós-marco (43h, externos): 61 cadastros → 37 fizeram o filme 1
→ 10 fizeram o 2 → 4 fizeram o 3 → 2 fizeram o 4 → 4 pessoas no checkout →
**0 pagamentos**. Mediana filme 1 → filme 2 = **22 minutos**; 6 dos 10
segundos filmes nasceram em menos de 30 min, 1 só em outro dia. O segundo
filme acontece **na mesma sessão ou não acontece**. 27 das 37 nunca voltaram.

**O defeito (medido, reproduzido, consertado).** `/api/next-episode` — a rota
que escreve o "Episode 2" pronto na tela de filme concluído — recebeu 16
chamadas hoje e devolveu **12 × 502**. Log da Vercel: `[next-episode] sem
marcadores, descartado` em 10 de 14. Sonda local com o MESMO prompt/modelo/
temperatura: **0 de 8** respostas traziam HOOK / MICRO REWARD / ESCALATION /
PAYOFF. Causa: o episódio 1 vai para o modelo em PROSA (é a narração real do
filme), e o modelo imita a prosa — a regra perde para o exemplo. A rota então
**descartava** a resposta, e o cartão simplesmente não aparecia. Sem erro na
tela: a porta do segundo filme estava fechada em silêncio.

**O conserto** (`lib/nextEpisodeMarkers.ts`, novo; `app/api/next-episode/route.ts`):
1. o prompt ganhou o ESQUELETO de saída explícito ("Episode 1 below is plain
   prose. Do NOT copy that shape") → sonda: **8 de 8** com marcadores;
2. o servidor deixa de descartar e passa a ROTULAR: aceita rótulo decorado
   (`**HOOK**`, `Payoff:`, `MICRO-REWARD`) e, se vier prosa pura, divide por
   FRASES em 4 blocos determinísticos — gancho = 1ª frase, payoff = última,
   meio ao meio — **sem tocar numa palavra** (Contrato C1 provado no teste);
3. só o irrecuperável (menos de 4 frases) continua 502; a resposta carrega
   `markersVia: model | normalized | auto_split` para medir o caminho.

**Prova.** `scripts/test-proximo-episodio-marcadores-2026-09-05.mjs` 27/27
(comportamento real da biblioteca + leitura da rota), `tsc` limpo, sonda
real 8/8. Arquivos: só os dois acima + o teste. Nenhum arquivo do lote A do
Codex (StudioClient, GenerateClient, HistoryClient, ResumeStrip,
seriesContinuation) foi tocado.

**Como medir (depois do clique).** `next_episode_failed` cair de 12/16 para
~0; `next_episode_ready` aparecer para quase toda chegada em `video_ready_viewed`;
e aí, pela primeira vez, `next_episode_clicked` ter denominador.

**O que ficou fora, de propósito.** O destino do clique ("Build next episode"
→ `/studio/create`) é o P0 do lote A do Codex; eu não mexo no botão, só no
que ele recebe.

### Estado da fila no fechamento do #0
21 entregas do ciclo de 04/09 + esta = **22 na fila, ZERO em produção**. O
publicador v11 está no disco (guardião 12/12 rodado hoje contra o bat real).
**Falta o clique.**
