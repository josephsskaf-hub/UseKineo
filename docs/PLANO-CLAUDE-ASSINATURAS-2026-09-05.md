# PLANO CLAUDE — ASSINATURAS NOVAS: O RITUAL 1 → 2 → 3 → PAGA (05/09/2026)

**Ordem do fundador (05/09, manhã):** "o foco é novas assinaturas, fluxo
maior, e que quem entra tenha probabilidade maior de assinar. Não quero
muitas ações de dados, quero ações executáveis. Meta: no mínimo 2-3
assinantes novos por dia." Sprints de 8 horas, ele aperta Executar.

**Divisão desde 05/09** (`docs/ESCOPO-CODEX-UX-CLAUDE-VENDAS-2026-09-05.md`,
ACK no PEDIDOS às 10:30): **Codex** = visual, navegação, botões e espanhol
de todas as páginas, por lotes com preview aprovado pelo fundador.
**Claude** = fluxo, aquisição, retorno de intenção e assinatura nova — no
SERVIDOR (rotas, crons, e-mails de ciclo de vida, contratos que a tela
consome). Tela é PEDIDO ao Codex, não edição.

## 1. O que os dados dizem (43h pós-marco, 61 contas externas)

| degrau | pessoas | leitura |
|---|---|---|
| cadastro | 61 | |
| filme 1 | 37 | 16 min do cadastro ao filme, em média |
| filme 2 | 10 | mediana 22 min depois do 1; 6 em <30 min, 1 em outro dia |
| filme 3 | 4 | |
| filme 4 | 2 | |
| checkout | 4 | 2 delas com ZERO filmes (defeito, não desejo — regra de 02/09) |
| pagou | **0** | |

30 dias: quem fez 1 filme paga 0,3%; 2-3 filmes 0,9%; 4-7 filmes 14%; 8+ 20%.
É correlação — mas quem não faz o 2º certamente não faz o 4º.

**As três leis do ritual, medidas:**
1. **O 2º filme é da mesma sessão.** Fora dos 30 minutos, quase nunca. Toda
   porta de episódio 2 tem que estar pronta ANTES de a pessoa fechar a aba.
2. **A porta estava fechada.** `/api/next-episode` devolvia 502 em 12 de 16
   chamadas (05/09). 9 em 10 pessoas nunca viram o "Episode 2" pronto.
   Consertado no #0 (`lib/nextEpisodeMarkers.ts`). Só depois disso o degrau
   1→2 pode ser julgado.
3. **Quem sai, sai para sempre, e o único canal de volta é o e-mail** —
   37 de 37 receberam `video_ready_email_sent`. Hoje esse e-mail entrega o
   filme e para. Ele deveria entregar o filme E o episódio 2 já escrito.

## 2. Cardápio executável (uma jogada por rotação; produto na cara do cliente)

| # | jogada | onde (dono Claude) | por que agora | como medir |
|---|---|---|---|---|
| J1 ✅ | Cartão "Episode 2" volta a existir (502 → rotulado) | `app/api/next-episode`, `lib/nextEpisodeMarkers.ts` | 12/16 falhas; 0/8 → 8/8 na sonda | `next_episode_failed` → ~0; `next_episode_ready`/`video_ready_viewed` |
| J2 | **E-mail de filme pronto carrega o Episódio 2 pronto** (título + 1 clique) | `app/api/cron/send-video-ready`, `lib/seriesContinuation` | 27/37 não voltam; o e-mail é o único canal; mediana 22 min | clique no link do e-mail → 2º filme em 24h |
| J3 | **3º filme garantido no clique**: porta do episódio 3 concede crédito SÓ ao clicar quando o saldo não cobre o Kineo 1, 1× por conta, teto 15cr, kill-switch por env | rota nova `app/api/episode-credit` + evento `episode3_credit_granted` | regra da casa: crédito no clique, nunca antes; 4-7 filmes = 14% pagam | quantos clicam, quantos rendem, quantos pagam em 7d |
| J4 | **Checkout sem pagamento em 30 min → e-mail com o filme da pessoa + link do plano**, 1× por pessoa, ledger de supressão, dry-run por padrão | `app/api/cron/send-checkout-followup` (novo), `lib/lifecycle/suppression` | 4 checkouts, 0 pagos; "vazamento é preço" já fechado — a jogada é lembrar do valor entregue, não desconto | `?confirm=SEND` é do fundador; abertura/clique/`payment_success` |
| J5 | **Contrato "próxima ação" no servidor** para quem volta: continuar episódio N (script pronto), terminar render preso, ou ver plano — o Codex desenha a tela | `app/api/next-action` (novo) | 116 voltam sozinhas e não apertam nada vs 12 que apertam | `next_action_served` → clique → filme |
| J6 | **Fonte por fonte**: chatgpt.com / taaft / e-mail — quem converte 1→2 e quem cai; consertar o caminho da fonte que mais cai (a ordem colada do ChatGPT já está na fila) | `lib/pastedDirectives`, `instructionPasteNotice` | maioria dos `next_episode` de hoje vem de `utm_source=chatgpt.com` | taxa de 2º filme por fonte |
| J7 | **Winback com filme pronto** (lote de 60, rascunho/dry-run; o disparo é o link do fundador) | `app/api/admin/send-winback-*` | 264 elegíveis; crédito-sem-filme deu 0 cliques | cliques → filme → pagamento |
| J8 | Fechamento: placar por pessoa e por fonte, entregas, o que falta clicar | diário | | |

**Regra de ouro de cada rotação:** "se o fundador abrir o site (ou a caixa de
entrada de um cliente) agora, ele VÊ a diferença?" Se não, a rotação não
terminou. Medição é UM SQL por rotação, no fechamento — não é a rotação.

## 3. Limites que continuam
Preço, planos, oferta e termos: intocáveis. Pipeline de qualidade do filme:
intocável (fundador 03/09). Nenhum e-mail sai sem `?confirm=SEND` do fundador
na primeira vez de uma rota nova. Nada de dinheiro. Contatos proibidos:
den.higgins, noelrss21, emiliomontinari, akajitin. Push é o clique dele.

## 4. Como o ciclo roda
Tarefa `kineo-assinaturas-24h-0309` (aba Code), 8 rotações de 1h, abre no
disparo de :38 e faz checkpoint no de :08. Diário:
`docs/SPRINT-ASSINATURAS-2026-09-05.md` (continua do #0). Placar canônico:
marco `2026-09-03 16:00:00+00`, externos, `payment_success` = dinheiro.
