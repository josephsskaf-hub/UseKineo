# Relatório do ciclo Claude — 04/09/2026 16:15 BRT

> Contraparte do "Encerramento do ciclo Codex — 04/09/2026". Mesmo marco zero,
> mesmo SQL canônico, mesma regra: trabalho não é venda. Escrito para o consenso
> fundador / Claude / Codex. Rótulos conforme AGENTS.md §4.

## 1. Estado operacional

**FATO CONFIRMADO (git, 16:07 BRT):** a pista do Claude NÃO parou. A tarefa
`kineo-assinaturas-24h-0309` (aba Code, a cada 30 min) fechou a sprint 1
(assinaturas, 16 rodadas, 15 commits de código, todos em `origin/main`) e está na
sprint 2 (retenção, 3 rodadas prontas na fila `entrega-atual`, 4 commits
aguardando o clique do fundador no SUBIR-SITE.bat). Janela da sprint 2: até
05/09 16:30 BRT. Nenhuma rodada pediu nada ao fundador.

**FATO CONFIRMADO:** o encerramento do Codex está inteiro na main (R48
`6a0a5bd3`, R29 fluxo `2f0e4fcb`, doc de fechamento; último commit 16:02 BRT).
Parada limpa, nada pela metade. Pedidos entre pistas: 26 abertos / 22 atendidos.

## 2. Balanço no SQL canônico

**EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, 04/09 16:10 BRT; marco
2026-09-03 16:00 UTC; contas internas excluídas):**

| indicador | valor |
|---|---:|
| cadastros | 42 (ChatGPT 20 · TAAFT 10) |
| pessoas distintas com filme | 28 |
| filmes entregues | 36 |
| pessoas no checkout | 4 (2 com filme · 2 sem) |
| `payment_success` (webhook, fonte do dinheiro) | **0** |
| `generation_stage_error` | 7 (eram 31 nas 24h anteriores) |
| `narration_guard_blocked` (o que a rodada #1 mata) | **0** |

**LIMITAÇÃO:** os mesmos avisos do relatório do Codex valem aqui. Não dividir
28 por 42. Falhas caírem de 31 para 7 é efeito medido da entrega; assinatura
continuar em zero é o resultado que importa, e ele não mudou.

## 3. O que ficou implementado na pista Claude

**IMPLEMENTADO / trilha em `docs/SPRINT-ASSINATURAS-2026-09-03.md` (#1→#16) e
`docs/SPRINT-RETENCAO-2026-09-04.md` (#17→#19, na fila):**

Sprint 1, o caminho do primeiro filme (todos em produção):
- #1 gate de narração vira degrau (34 recusas/30d por "faltam 2 palavras")
- #2 guarda de cobrança deixa de matar filme montado (5 de 6 perdidos)
- #3 narrador para de ler "Visual:" em roteiro de cinema colado (22 pessoas)
- #4 semente de série nasce do tema, não de fragmento de ordem (9 de 43)
- #5 crédito preso deixa de ser porta fechada (10 pessoas, 8 sem filme na vida)
- #6 e-mail de desculpa sai pela primeira vez em 30 dias
- #7 expansor aceita o que o renderizador aceitaria (15 de 32)
- #8 frase única deixa de ser acusada de roteiro reescrito (7 pessoas)
- #9/#10 pílula "Rendering" liga ao render certo; /history enxerga render vivo
- #11 cadastro por e-mail/senha nasce com os 25 créditos (14 órfãos em 21d)
- #12 D5/D10 param de pedir cartão a quem nunca viu filme (57 de 57 envios)
- #13 caixa do cartão oferece o primeiro filme grátis a quem nunca viu um
- #14 clique que morre com a aba deixa rastro (21 pessoas invisíveis em 14d)
- #15 caixa do plano fala em filmes, não em créditos
- #16 e-mail do segundo filme parava em silêncio para 304 pessoas

Sprint 2, retenção (na fila):
- #17 os 15 consertos medidos um a um: **6 FUNCIONARAM, 0 PIORARAM**, 4 sem
  exposição ainda, nenhum candidato a reversão
- #18 a porta "episódio 2 do seu tema" tinha 27% de clique com 12% de exposição;
  passa a ser a primeira coisa que quem volta vê, com denominador
- #19 103 pessoas de UM filme voltaram sozinhas à tela de criar; 82 foram embora
  sem apertar gerar porque a primeira coisa que viam era um campo em branco

**FATO CONFIRMADO:** os 15 commits de código passaram por worktree limpa,
teste lendo o arquivo real, typecheck e `enfileirar.sh`. Isso prova entrega,
não efeito comercial.

## 4. Verificação do relatório do Codex

**FATO CONFIRMADO (`app/checkout/success/page.tsx:72-121`, lido 16:00 BRT):** a
pendência nº 1 dele está meio certa, e a metade certa importa.
- `checkout_success_viewed` NÃO é a fonte do dinheiro: comentário
  `KINEO-PAYMENT-EVENT-2026-07-15` diz que `payment_success` é gravado só pelo
  webhook verificado da Stripe. **A contagem de assinaturas não está
  contaminada.** O zero é zero.
- Os pixels SÃO vulneráveis: `gtag('event','conversion')` e `ttq.track('Purchase')`
  disparam com `value`/`currency` lidos da URL, sem verificação, e o padrão sem
  parâmetro é 4,90. Qualquer visita à página manda compra falsa ao Google Ads e
  ao TikTok. Custo hoje ~0 (sem mídia paga); arma um problema no dia em que
  houver. Pista do Codex; conserto pequeno.

**CONTRADIÇÃO com decisão aprovada:** a proposta nº 2 dele ("não concluir que
preço causa abandono só por correlação") reabre a conclusão fechada pelo
fundador em 19/08 (CLAUDE.md). Fica fora de escopo salvo ordem dele.

## 5. Diagnóstico convergente (as duas pistas, por caminhos diferentes)

**EVIDÊNCIA DE PRODUÇÃO (SELECT, 04/09 16:00 BRT):** nas 24h pós-marco nasceram
**165 nomes de evento novos** (superfícies de medição): 43 vistos por 1 pessoa,
54 por 2-5, 68 por 6+. **97 de 165 (59%) foram vistos por 5 pessoas ou menos.**
No mesmo período: 207 pessoas ativas, 28 com filme, 4 no checkout, 0 pagaram.

**EVIDÊNCIA DE PRODUÇÃO (30 dias, externos):** quem fez 1 filme: 319 pessoas,
2 pagaram (0,6%). 2-3 filmes: 113, 2 pagaram. 4-7: 14, 2 pagaram (14%). 8+: 6,
2 pagaram (33%). **O 4º filme prevê pagamento 23× melhor que o 1º**, e 22 das 27
pessoas da janela pararam no 1º.

Leitura: o Codex mediu zero pagamentos e propôs "trocar volume por uma métrica".
O Claude mediu 165 superfícies que quase ninguém viu e achou a porta do episódio
2 enterrada. É o mesmo veredito: **a casa constrói mais rápido do que o mundo
consegue olhar, e o que falta não é superfície, é a pessoa voltar.**

## 6. Pendências

1. **FATO CONFIRMADO:** 4 entregas da retenção paradas na fila desde ~14:20 BRT,
   incluindo a porta do episódio 2. Cada hora sem clique = gente de um filme
   caindo no campo em branco.
2. **QUESTÃO PENDENTE:** pixels do `/checkout/success` (item 4). Dono natural:
   pista do caixa (Codex). Se o Codex não voltar, vira pedido ao Claude.
3. **QUESTÃO PENDENTE:** 26 pedidos abertos em PEDIDOS-ENTRE-PISTAS; parte pode
   já ter sido coberta por commits recentes. Reconciliar antes de implementar.
4. **QUESTÃO PENDENTE:** #13/#14/#15 ainda sem exposição medida (entraram há
   <6h). Reavaliar em 24h antes de qualquer reversão.
5. Fora do repositório, ninguém tocou: listing do TAAFT (pacote pronto em
   `docs/TAAFT-LISTING-2026-09-03.md`) e vídeo do dia (2 dias sem sair).

## 7. Proposta para consenso — SUGESTÃO, não execução

Métrica única, igual à do Codex: pessoas externas novas com `payment_success`.
Métrica-guia (a que prevê): pessoas que sobem de faixa de filmes (1→2→4).

1. **Claude continua na retenção** até 05/09 16:30, como já está: é a única pista
   com fio vivo e medido (porta do episódio 2). Próximas: R2 série com memória,
   R3 caixa vazia nunca para quem já fez filme, R4 winback com filme pronto.
2. **GPT/Codex, se religar: auditar e matar, não construir.** Mandato: para cada
   uma das 165 superfícies, quem viu, quem moveu de faixa, quem pagou; três
   listas (fica / morre / precisa de prova); nenhuma superfície nova até a lista
   existir. Mais o conserto do pixel. É trabalho de julgamento, o uso certo de
   um modelo mais forte.
3. **Um experimento por vez**, com hipótese, métrica e critério de parada
   escritos antes do código (regra do próprio Codex; o Claude assina).
4. **Cowork ganha a pista do que não é código**: listing do TAAFT (parar antes
   de salvar, fundador confirma), vídeo do dia, rascunhos de e-mail.
5. Não reabrir preço nem B2B nesta janela.

**PRÓXIMA JOGADA:** subir a fila (1 clique) e deixar a porta do episódio 2
trabalhar 24h com denominador. É o único teste que já tem número a favor.

✅ **O QUE DEPENDE DO FUNDADOR:** clicar no SUBIR-SITE.bat; aprovar ou ajustar o
mandato do GPT ("auditar e matar"); publicar o vídeo do dia.

📋 **O QUE ACONTECEU:** a pista do Claude fechou 16 consertos no caminho do
primeiro filme, provou que 6 já funcionam e nenhum piorou, e achou onde o
segundo filme morre. Zero assinaturas no corte, igual ao Codex. As duas pistas
concordam no diagnóstico e o próximo passo é retenção medida, não superfície nova.
