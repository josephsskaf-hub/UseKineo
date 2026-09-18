# Relatório do dia — 18/09/2026, 12:10 BRT (sessão CEO)

Primeiro dia com as quatro apostas de 17/09 no ar (porta do 3º filme, laço viral, 16 línguas, cota semanal + carta). Números lidos do banco às 12:05 BRT; contas internas fora.

## Placar 24 h
| | |
|---|---|
| Cadastros | 14 |
| Pessoas que fizeram filme | 9 (11 filmes) |
| Checkouts iniciados | 2 |
| Pagamentos | 0 |
| Coerência Kineo 1 (24 filmes julgados) | média 72, 1 abaixo de 50 |

Dia fraco de entrada (14 contra 45 no dia anterior). Ainda sem pagamento desde 16/09 22:16.

## As quatro apostas
| Aposta | Exposição | Resultado | Leitura |
|---|---|---|---|
| Carta da cota semanal | 480 enviadas (17/09 20:17 → 21:50 BRT) | 1 pessoa voltou ao site, 0 filmes | 15 h depois: 0,2% de retorno. A régua das cartas anteriores era 2 cliques em 95. Esperar 48 h antes de julgar; se ficar em 1, a cota semanal precisa de outra porta (no site, não por e-mail). |
| Porta do 3º filme | 0 pessoas chegaram ao fim do 2º filme sem saldo | — | Sem plateia ainda. Coorte medida: ~3 pessoas/dia. Julgar em 7 dias. |
| Laço viral (página pública) | 0 páginas publicadas | — | Só 9 pessoas fizeram filme hoje; nenhuma clicou "Create a public watch page". Julgar em 7 dias; se ficar em 0, o botão precisa subir na tela. |
| 16 línguas | 0 filmes em língua nova, 0 recusas | — | Ninguém escolheu ainda. A prova em hindi é sua. |

## Fontes (7 dias)
| Fonte | Cadastros | Com filme | Pagaram |
|---|---|---|---|
| ChatGPT | 66 | 46 | 1 |
| TAAFT | 32 | 21 | 0 |
| Sem fonte | 26 | 12 | 0 |
| Toolify | 12 | 2 | 0 |
| Google (Projeto 1) | 0 registrados | — | — |

Google ainda não trouxe cadastro rastreável (100 páginas no ar há 33 h; indexação pedida). Base de comparação: 9 visitantes/semana.

## Renovações (a confirmar na Stripe)
Nos últimos 60 dias o banco tem **1** evento de renovação paga (`subscription_invoice_paid`). Renovações que deveriam ter caído: gapozweb (17/09), den.higgins (18/09), emilio (01/09). As de valos e akajitin foram recusadas (cartão sem saldo, registrado). O banco estava lento demais para cruzar pessoa a pessoa. Se a Stripe mostrar cobranças de renovação que não estão aqui, o webhook está pulando o evento e o MRR do painel está baixo. **Ação sua: abrir Stripe → Pagamentos → filtrar "assinatura" nos últimos 30 dias e me dizer quantas renovações há.**

## Feito hoje (sem depender de ninguém)
- Despublicar/publicar pelo My Videos. Benefício: a pessoa controla a própria página; mais gente publica quando sabe que pode tirar.
- llms.txt declara as 16 línguas e quais motores falam cada uma. Benefício: o ChatGPT em espanhol/hindi passa a ter o fato para citar.
- Jornada do ChatGPT renovada + blocos em espanhol e hindi.
- Carta da cota corrigida duas vezes: "frio" só por atividade de navegador; supressão de 24 h da casa respeitada; carimbo na lista canônica.

## Adiado com dado
- Reativação com o filme pronto: 280 de 281 receberam carta em 7 dias. Coorte limpa: 0. Reavaliar 24/09.
- Japonês/coreano: depois da prova em hindi.

## O que depende do fundador hoje
1. Cota: último clique (`confirm=SEND`) e decidir os 379 sem filme (`&all=1`).
2. Renders de prova: Kling 3 35 s; Kineo 1 em hindi 35 s.
3. Stripe: contar renovações do mês (ver seção acima).
4. Codex: trazer as 2 respostas do prompt de afiliados.
