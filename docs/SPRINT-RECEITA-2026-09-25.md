# Sprint de receita — sex 25/09 18h → dom 27/09 24h (BRT)

Pedido do fundador (25/09 17h45): "temos muito saldo de tokens ... precisamos usar até domingo ... vamos fazer uma sprint
(você mede) ... goal final = receita, assinaturas". Duas pistas: **GPT/Codex = visual e páginas**; **Claude = servidor,
fluxo, medição**. Claude mede ao fim de cada ciclo e escreve aqui; o GPT lê este arquivo no começo de cada ciclo
(`git fetch && git show origin/main:docs/SPRINT-RECEITA-2026-09-25.md`).

## Linha de base (medida 25/09 20h45 UTC, contas internas fora)

| | 24 h | 7 dias |
|---|---|---|
| Cadastros | 7 | 118 |
| Pessoas que receberam filme | 9 | 68 |
| Pessoas que abriram checkout | 0 | 15 |
| Pagamentos (payment_success) | 0 | 4 |
| Assinantes pagos ativos | 10 | — |

**Meta da sprint (54 h):** 3 pagamentos novos (o ritmo atual dá ~1), 25 pessoas no checkout, 1º anúncio vendido pelo
Studio Ads. Métrica única que decide: **pagamentos novos**.

## Ciclos (8 h cada; Claude mede no fim)

| Ciclo | Janela (BRT) | Medição |
|---|---|---|
| C1 | sex 18h → sáb 02h | sáb 02h |
| C2 | sáb 02h → 10h | sáb 10h |
| C3 | sáb 10h → 18h | sáb 18h |
| C4 | sáb 18h → dom 02h | dom 02h |
| C5 | dom 02h → 10h | dom 10h |
| C6 | dom 10h → 18h | dom 18h |
| Fecho | dom 18h → 24h | placar final |

## Backlog — pista GPT (visual, todas as páginas)

Ordem = impacto em receita ÷ esforço. Um item por vez, publicado antes do próximo.

1. **/pricing — tabela "Compare plans" mente:** Starter/Creator aparecem com "—" em motores que o saldo paga (e o grátis
   com ✅); Studio mostra Kling 3 "1/mo" (300 cr pagam 2). Regra verdadeira: todo plano pago usa qualquer motor que o saldo
   cubra. Trocar "—"/"1/mo" por minutos/filmes por mês de `lib/credits/creditMinutes.ts`.
2. **/pricing — duas moedas na mesma página:** quem vem do Brasil lê "Charged in BRL" nos cards e "we charge in USD
   worldwide" no topo e no FAQ. Para visitante BRL, a frase de USD some (o card já diz BRL).
3. **Home → Empresas:** o card "For businesses" ganha um anúncio de verdade rodando (o Claude passa o link do render da
   rodada 2 do Cowork) e a linha "Paste your website link — the AI makes the ad".
4. **/ads (porta pública):** trocar os "5 passos" por "link ou uma frase → anúncio pronto em minutos", 2-3 anúncios reais,
   preço em créditos (35 s = 3 créditos, qualquer plano pago). NÃO mexer na promessa de revisão humana até o fundador
   decidir (pendente).
5. **Modal de upgrade/checkout:** mostrar minutos (`minutesLine`) e "Studio Ads included" nos 3 planos; nada de preço novo.
6. **Studio Ads modo IA (tela):** polir a conferência, "Your ads" e "More versions" em mobile 390 px; estado selecionado.
7. **Passada mobile** em /pricing, /ads, /ads/new, home.

## Backlog — pista Claude (servidor, fluxo, medição)

1. Medir cada ciclo e escrever aqui (placar + o que mexeu).
2. **Trial de 10 cr que escolhe Seedance (15+ cr)**: 7 pessoas em 72 h bateram no upgrade e saíram sem filme. Levar essa
   pessoa ao Kineo 1 grátis da semana antes da parede (servidor + evento).
3. **/ads/new abre sem login** (decisão "ABRIR" de 25/09): caixa aberta para visitante; conta só em "Make the plan", com o
   rascunho guardado.
4. **Liberar o modo IA para todos** quando a rodada 2 do Cowork der nota ≥ 6 nos anúncios.
5. **10 empresas que pediram anúncio**: anúncios prontos + rascunhos no Gmail, depois do modo IA aberto.

## Regras da sprint (as de sempre, repetidas porque a pressa esquece)

- Preço, créditos por plano, trial e oferta **não mudam** (congelados até 09/10; a escada nova entra em 09/10).
- Branch `codex/<tema>-<data>` limpa a partir de `origin/main`; publicar só por `bash scripts/enfileirar.sh` + o BAT de 2
  SHAs. Nunca push direto, nunca `git branch -f entrega-atual`.
- Não tocar em trava 8.2 (lib/compose, lib/hollywood/, lib/cinematic/, lib/broll/, lib/lyriaMusic, lib/narrationFit,
  app/api/analyze-idea/, app/api/generate-script/, app/api/generate-video-*) nem em rotas de pagamento/webhook.
- Antes de publicar: `npx tsc --noEmit` + os guardiões que citam o arquivo mexido + a suíte inteira comparada à base.
- Copy só com fato do código (nada de "priority", "human editor", "never expire" que o produto não cumpre).

## Placar por ciclo (Claude preenche)

| Ciclo | Cadastros | Filmes (pessoas) | Checkout (pessoas) | Pagamentos | Studio Ads (planos/renders) | Publicado no ciclo |
|---|---|---|---|---|---|---|
| base 24 h | 7 | 9 | 0 | 0 | — | — |
