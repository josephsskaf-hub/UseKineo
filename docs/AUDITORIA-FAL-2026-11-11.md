# Auditoria do gasto da fal — 01 a 11/11/2026 (Divisão 5, Plataforma)

Só leitura no banco de produção, sem mudar nada. Pedido da CEO em 11/11.
**O repositório é público:** este arquivo não traz e-mail nem nome de cliente. As contas aparecem pelos 8 primeiros
caracteres do id (`profiles.id`), pela classe e pelo país. O e-mail se acha no admin.

## Ponto de partida (painel da fal, lido pela CEO)
Ciclo de novembro: **US$ 407,64 em 11 dias** (US$ 39/dia), contra ~12 assinantes pagos.
- Kling 4: i2v 115,40 · t2v 21,20
- Seedance 1.5: i2v 53,03 · t2v 7,22
- H3 Max Turbo i2v: 41,97
- H3 Max recast: 41,20
- nano-banana-pro: edit 39,90 · simples 4,80
- Topaz upscale: 20,52
- flux/dev: 20,43
- Kling v3 pro t2v: 17,36
- Wan-3: 7,20
- Lyria3: 7,04
- Seedance 2.5: 5,16
- Outros: ~5,21

## Quanto foi explicado
- **US$ 179** de vídeo medidos direto no banco (44%):
  - claims de filme: segundos × preço por segundo do código;
  - Clips e Recreate: `clips.fal_usd`.
- **US$ 272 (67%)** somando o que dá para repartir por uso: stills dos filmes (nano-banana edit + flux), música (Lyria) e Enhance (Topaz).
- **US$ 319 (78%)** somando o provável (abaixo). O resto é erro de estimativa ou chamada feita fora do app.

## Por quem
| Quem | Contas | Certo (US$) | Provável (US$) | % do painel |
|---|---|---|---|---|
| Casa (2 contas do fundador + 1 de teste) | 3 | 150,0 | +20,6 | 37–42% |
| Grátis | 71 | 92,8 | +47,1 | 23–34% |
| Grátis com cara de fazenda (e-mail com "+", relay, aparelho repetido) | 6 | 10,4 | — | 3% |
| Assinantes pagos (só 3 usaram fal no mês) | 3 | 38,0 | — | 9% |
| Cortesia | 1 | 4,6 | — | 1% |
| Sem dono / erro de estimativa | — | 44,1 | — | 11% |

- **Casa, provável:** Kling 3 (US$ 13,40) e Wan (US$ 7,20). Nenhum cliente usou esses motores fora do que o banco já mostra.
- **Grátis, provável:** 20 reservas do teste Kling 4 (US$ 2,355 cada) sem filme registrado, de 2 contas grátis em 08/11 (detalhe abaixo).

## O que é de quem
- **Recast (US$ 41,20) é 100% da casa.**
  - US$ 17,40 são 6 recasts da conta do fundador no app: 2 falharam e cobraram US$ 6.
  - ~US$ 23,80 não deixaram linha no banco: chamadas feitas fora do app, nos testes do Recreate (ver "Chamadas por fora do app").
- **Nano-banana-pro edit (US$ 39,90) não é o produto /images.**
  - É o still de cada cena do filme: ficha do personagem (`lib/estrelaDoFilme.ts`), foto de referência e regerações do crítico de still.
  - Junto com o flux/dev (`lib/free15StillFlux0311.ts`, `lib/hollywood/anchors.ts`) foram 821 stills no mês: casa 358, grátis 250, pagos 166, cortesia 27, cara de fazenda 20.
  - O /images gastou ~US$ 5 (26 nano-banana simples, da casa, + 146 schnell).
- **Topaz (US$ 20,52):** é o Enhance automático da casa (`HOUSE_ENHANCE_EMAILS`, `app/api/compose/status/[renderId]/route.ts`). 26 dos 27 vídeos são da conta do fundador.
- **Lyria3 (US$ 7,04):** 92 músicas de filme, 1/3 da casa.
- **Kling 4 no teste grátis:** 31 filmes, para 31 contas diferentes, US$ 73,01 exatos (`kling4_trial_films.cost_milliusd`).
- **Pico de 08/11, das 15h às 21h UTC** (mesma janela em que o saldo da fal acabou — `fal_balance_exhausted`):
  - Quem: duas contas grátis criadas no mesmo dia, `dee9228f` (RO) e `07e7dd7f` (FR).
  - O que fizeram: 24 e 27 tentativas do teste Kling 4. Ficaram 20 reservas de US$ 2,355 sem motor registrado (US$ 47,10).
  - O que receberam: 1 filme cada.
  - Esse valor bate com o buraco do Kling 4 (painel US$ 137 × medido US$ 85). Não dá para provar que a fal cobrou.

## Por produto (11 dias)
| Produto | US$ |
|---|---|
| Filme grátis (teste Kling 4 + Seedance/H3 grátis + stills + música) | ~101 (~148 com o provável) |
| Filme pago (assinantes + cortesia) | ~35 |
| Clipes | 17,50 |
| Recreate (recast) | 41,20 — casa |
| Imagens (/images) | ~5. Os outros ~US$ 60 de imagem são stills de filme |
| Upscale (Topaz) | 20,50 — casa |
| Vídeos do dia da casa | dentro dos US$ 47 de filmes da casa (35 pedidos pelo conector) |

## As 10 contas que mais gastaram (id · classe · país)
| Conta | Classe | Gasto fal (US$) | Pagou em novembro |
|---|---|---|---|
| e92d81bf | casa (fundador) | ~115–120: filmes 32,5, clipes/recast 25,6, Topaz ~20, recast fora do app ~24 | — |
| acffefe5 | casa (fundador) | ~29 | — |
| dee9228f | grátis · RO | 2,90 + 23,60 provável | 0 |
| 07e7dd7f | grátis · FR | 0,50 + 23,60 provável | 0 |
| 7d4baa98 | pagante · US | 10,40 | 0. Último pagamento: US$ 9,90 em 17/09 |
| a70e1fd3 | pagante · QA | 8,10 | 15,92 em 01/11 |
| 79b57cba | pagante · ZW | 5,50 | 9,95 em 04/11 |
| 2ff0b7dc | grátis · IT | 2,80 | 0 |
| cca2e04d | cortesia · US | 2,50 | 0 |
| 25 contas empatadas | grátis | 2,36 cada (1 filme Kling 4) | 0 |

## As 3 torneiras e as propostas (com o que pouparia por mês)
1. **Kling 4 no filme grátis:** ~US$ 120 em 11 dias, ~US$ 330/mês. Uma das 31 contas virou pagante (`a70e1fd3`).
   - Proposta: o grátis passa para H3 Turbo (US$ 0,42 por 15 s contra US$ 2,36); Kling 4 vira o upgrade pago; e uma tentativa por conta e por aparelho por dia.
   - Pouparia: ~US$ 250–280/mês.
2. **Casa:** ~US$ 150–170 em 11 dias, ~US$ 410–460/mês.
   - Proposta: Topaz automático desligado (~US$ 55/mês); testes de Recreate, Kling 3 e Wan só em 5 s e dentro do teto de US$ 25/semana.
   - Pouparia: ~US$ 250/mês.
3. **Stills regerados pelo crítico:** ~US$ 60 em 11 dias, ~US$ 165/mês. O crítico regerou 235 stills e fez 2 chamadas em 61% deles.
   - Proposta: no filme grátis, 1 still por cena em flux, sem regerar; nano-banana edit e crítico só no filme pago.
   - Pouparia: ~US$ 60–70/mês.

## Decisões da CEO sobre estes números (11/11)
- **O filme grátis CONTINUA no Kling 4 por enquanto.** É o único teste grátis que já virou pagante. A CEO revê em 14 dias, com a nota dos filmes depois dos consertos da Div. 2.
- **Teto de 1 tentativa por conta e por aparelho por dia:** vai para a Div. 4.
- **Topaz automático da casa e corte de stills no grátis:** a CEO leva ao fundador, porque mexem em qualidade.

## Chamadas por fora do app (~22% do painel, ~US$ 24 só de recast)
O que foi procurado em 11/11:
- **Repositório (commitado):** nenhum script fora de `scripts/test-*` chama a fal direto. O app chama por `lib/` e `app/`, e isso fica no banco.
- **Arquivos fora do git** (`C:\kineo`, `C:\kineo-wt\*`, `C:\tmp`, tarefas agendadas, notas das sessões): nada.
- **Rascunhos das sessões:** 7 arquivos com chamada à fal.
  - `reserva1.cjs`, `ed7.cjs` e `kf.mjs`: sessão CEO, 28/10 a 06/11. O `kf.mjs` usa nano-banana-pro/edit.
  - `sectionB.mjs`: 10/11, Kling 2.5.
  - `t1.mjs`: extract-nth-frame.
  - 2 cópias de testes.
- **Comandos executados nos históricos do Claude** (novembro): 12 envios diretos (POST com chave), em 4 sessões.
  - Sessão CEO `78f14cea`: 5 comandos, 3 em laço (02–03/11).
  - Sessão `1af60075`: 2 comandos em laço (05/11).
  - Sessões `6bc30eca` e `ea48451d`: 2 comandos cada (10/11).
  - 1 comando é da própria busca desta auditoria, que não chamou a fal.
- **Codex:** uma única sessão aberta desde 09/09 (557 MB de histórico) cita `queue.fal.run/minimax/h3…` 21 vezes e "recast" 22 vezes entre 09 e 11/11, no trabalho do Recreate. É a candidata mais forte para os ~US$ 24 de recast fora do app. Dá para provar que ela cita esses endereços, não que fez a chamada.
- **Invisível daqui:** o playground do site da fal, usado pelo fundador ou por quem tiver a conta.

### A regra proposta para chamada por fora deixar rastro
1. **Uma chave da fal por origem**, criadas no painel da fal sem código:
   - `kineo-app`: a da Vercel;
   - `sessoes-claude`;
   - `sessoes-codex`;
   - `fundador`: playground.
   
   O painel passa a separar o gasto por chave sozinho. As sessões param de usar a chave do app.
2. **Todo script fora do app** chama a fal por um ajudante único, `scripts/fal-casa.mjs` (a construir).
   - Antes do envio, ele grava uma linha em `C:\kineo\custo-fal-casa.log`: data, sessão, modelo, segundos, custo estimado e request id.
   - Também grava um evento `fal_house_call` no banco, para o placar enxergar.
   - Recusa enviar sem "motivo" e acima de US$ 5 por chamada sem a palavra "aprovado".
3. **Teste de produto usa o app** (contas da casa), porque aí o rastro já existe. Chamada direta só para o que o app não faz.

## Como repetir (receita das consultas)
Rodar no projeto Supabase de produção (`cqqukkvjjrguayiyjvhh`), só leitura.

**1. Gasto estimado por dia e por classe, últimos 14 dias (placar).** A consulta está em `docs/queries/FAL-GASTO-POR-DIA-E-CLASSE.sql`.

**2. Por conta, no mês.** É a mesma lógica: trocar `group by dia, classe` por `group by user_id` e juntar `profiles` só no admin, nunca em arquivo público.

**3. Kling 4 grátis, exato:**
```sql
select engine_used, count(*), round(sum(cost_milliusd)/1000.0,2) usd, round(sum(reserved_milliusd) filter (where engine_used is null)/1000.0,2) reservado_sem_filme
from kling4_trial_films where reserved_at >= date_trunc('month', now()) group by 1;
```

**4. Stills e regerações por classe:** contar eventos `cinematic_still_critic` (e o campo `regerou`), `cinematic_character_sheet` e `scene_preview_shown` desde o dia 1.

**Preços usados**, os do código em 11/11:

| Motor | US$ por segundo |
|---|---|
| Kling 4 | 0,157 (`lib/ads/v2Tiers.ts`; o filme grátis de 15 s = 2,355) |
| Seedance 1.5 | 0,026 |
| H3 Max Turbo | 0,028 até 15/11, 0,04 a partir de 16/11 (`lib/freeRedo/core.ts`) |
| H3 | 0,06 |
| Kling 3 / o3 | 0,112 |
| Veo | 0,15 |
| Topaz | 0,02 × ~40 s por vídeo |
| Lyria3 | ~0,08 por música |

Onde o claim não traz a duração do clipe, usa-se a média do mesmo motor.

**Limites:**
- O banco não registra o custo real devolvido pela fal, só o estimado.
- Claims sem `response` (soltos ou parados) não entram.
- Quando o preço do H3 Turbo mudar em 16/11, atualizar o `case` da consulta.
