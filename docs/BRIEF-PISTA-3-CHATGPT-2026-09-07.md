# BRIEF — PISTA 3: CHATGPT COMO VENDEDOR (07/09/2026, do fundador para o Codex)

**ATUALIZAÇÃO DO FUNDADOR — 08/09/2026 11:48 BRT, via Board:** o plano vigente desta execução é `docs/HANDOFF-PISTA3-VERSAO-B-2026-09-08.md`: primeira compra na Versão B, três públicos separados, /go e filme próprio, fechamento às 12:10 BRT. O texto abaixo é o brief histórico de 07/09; seus números, classificação de pagamento e ciclo não descrevem automaticamente o regime atual. Não usar a entrega de primeira compra como solução universal para quem já pagou o trial.

> Isto é um START, não um roteiro. Leia, meça, e reescreva com a sua cabeça
> antes de começar. A sua versão vira a primeira entrada do seu diário.

## A missão

A casa está há 5 dias sem assinante novo. Duas rotinas do Claude já rodam
(FECHAR A VENDA cuida das TELAS; VENDA ASSISTIDA cuida das PESSOAS por
e-mail). Nenhuma delas cuida do canal que mais traz gente nova e mais perde:
**o ChatGPT**. Esta pista é sua: tudo o que acontece entre a pessoa
conversar com o ChatGPT e pagar o primeiro filme na Kineo. Meta da casa:
10, 15, 25 assinantes por dia. Pense como Bezos: abra cada ciclo com o
press release do resultado e invente o caminho; a praxe é o piso.

## O que já existe (não reinvente, meça)

- O ChatGPT já manda gente: link de handoff `/go/<token>`, tabela
  `gpt_handoffs`, funil por pessoa documentado em
  `docs/SPRINT-GPT-LOJA-2026-09-06.md`.
- O maior vazamento da casa é "apertou e não saiu": 20 das 29 pessoas que
  despacharam um filme e não receberam vinham do ChatGPT (7 dias, medido
  06/09). Chegam com uma ideia pronta e saem sem filme.
- O GPT próprio da Kineo NÃO pode ser publicado (OpenAI fechou a loja para
  contas pessoais em 16/08 e Business só publica interno; só Enterprise).
  Portanto o canal é: (a) o ChatGPT respondendo "melhor gerador de vídeo
  com IA" e citando a Kineo; (b) GPTs de terceiros que citam a gente;
  (c) quem chega com referrer chatgpt.com; (d) o handoff.
- Oferta padrão de toda a casa hoje: trial de $1 por 7 dias no Creator
  (`/api/stripe/checkout?tier=basic&billing=monthly&trial=1`). Preço
  público não muda; sem cupom, sem crédito novo.
- Marco zero do placar: `2026-09-03 16:00:00+00`. Contas externas excluem
  josephsskaf / usekineo / kineo.local. Só `payment_success` é dinheiro.

## Primeira rotação: medir antes de construir

Por pessoa, desde o marco: chegou do ChatGPT (referrer, utm, handoff) →
cadastrou → apertou gerar → recebeu filme → abriu checkout → pagou. Onde o
degrau seca, é lá que você trabalha. Grave a SQL em
`docs/queries/PISTA-3-CHATGPT.sql` e os números no diário.

## Alavancas candidatas (escolha, não faça todas)

1. **Continuar a conversa**: pouso `/from-chatgpt` (ou o `/go`) que recebe a
   ideia que a pessoa já escreveu no ChatGPT e gera sem pedir nada de novo.
2. **Apertou e saiu**: o que trava o despacho de quem vem do ChatGPT
   (idioma, script longo, motor errado, crédito) — consertar o degrau, não
   o aviso.
3. **Ser citado**: páginas escritas para o ChatGPT ler e recomendar
   (comparativos, preço em texto puro, "Kineo vs", FAQ com os 8 motores e o
   trial de $1). O ChatGPT cita quem responde a pergunta inteira numa página.
4. **A oferta certa na porta certa**: o $1 como primeira opção para quem
   chega do ChatGPT; medir clique e pagamento, não impressão.

## O que é seu e o que não é

- SEUS: tudo em `app/go/**`, `app/from-chatgpt/**` (novo), páginas públicas
  de SEO/LLM, copy do handoff, `docs/SPRINT-CHATGPT-2026-09-07.md` (diário),
  `docs/queries/PISTA-3-CHATGPT.sql`.
- NÃO TOQUE (rotinas do Claude em andamento): `app/api/compose/**`,
  `GenerateClient.tsx`, `components/PricingCards.tsx`,
  `app/api/stripe/**`, `app/api/admin/send-*`, `lib/lifecycle/**`.
  Precisa de algo lá? Escreva o pedido em
  `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` e siga com o resto.
- Regras da casa: preço público não muda; nenhum e-mail sai desta pista
  (a VENDA ASSISTIDA já fala com as pessoas); nenhuma chave, .env, conta
  externa ou dinheiro; não apagar dados; pipeline de qualidade intocável;
  nunca push direto ou force — worktree de origin/main, `bash
  scripts/enfileirar.sh`, publicação pelo bat.

## Ritmo e fecho

Ciclos de 8 horas. Cada rotação fecha o diário com uma frase: "hoje uma
pessoa que chega do ChatGPT encontra X que ontem não encontrava" — e com o
placar (chegaram / geraram / receberam / $1 / pagaram). O fundador lê o
diário; não o chame.
