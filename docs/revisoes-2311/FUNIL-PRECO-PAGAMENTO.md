# Onde o comprador some entre preço e pagamento

**EVIDÊNCIA DE PRODUÇÃO · 23/10 a 23/11/2026, corte às 16:05 BRT.** De 287 pessoas identificadas em `/pricing`, 52 clicaram num plano, 31 acionaram a compra, 28 tiveram checkout vinculado e 4 pagaram. O maior volume de perda ficou antes da escolha do plano. Foram **235 de 287 pessoas**. Depois de criado o checkout, outras 24 das 28 ficaram sem pagamento vinculado.

## Funil de 30 dias

| Grupo | Viu a página | Clicou num plano | Acionou compra | Checkout criado | Pagou |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pessoas identificadas | 287 | 52 | 31 | 28 | 4 |
| País rico no cadastro | 82 | 20 | 9 | 9 | 2 |
| Demais países conhecidos | 170 | 27 | 19 | 16 | 2 |
| País sem registro | 35 | 5 | 3 | 3 | 0 |
| Logado na primeira visita | 272 | 44 | 26 | 23 | 3 |
| Convidado que depois foi ligado a uma conta | 15 | 8 | 5 | 5 | 1 |
| Celular com sinal confirmado, entre pessoas | 34 | 9 | 5 | 5 | 2 |
| Dispositivo desconhecido, entre pessoas | 253 | 43 | 26 | 23 | 2 |
| Sessões anônimas sem ligação com conta | 291 | 10 | 7 | 7 | 0 |
| Sessões anônimas em celular confirmado | 29 | 1 | 1 | 1 | 0 |
| Sessões anônimas com dispositivo desconhecido | 262 | 9 | 6 | 6 | 0 |

**EVIDÊNCIA DE PRODUÇÃO.** Na escolha mensal, 43 pessoas ou sessões com vínculo rastreável ao clique selecionaram um plano, 25 acionaram a compra, 22 tiveram checkout criado e 4 pagaram. Na anual, foram 23, 16, 16 e 0. Quem escolheu as duas modalidades entra nas duas linhas. O zero anual está limitado a estes 16 vínculos.

| Período mostrado ao chegar | Pessoas | Sessões anônimas |
| --- | ---: | ---: |
| Mensal registrado | 120 | 113 |
| Anual registrado | 1 | 0 |
| Sem registro de período | 166 | 178 |

**FATO CONFIRMADO.** `pricing_view` registra a chegada à página, antes de medir a leitura do cartão (`app/pricing/PricingClient.tsx:694`). `pricing_plan_selected` registra a escolha no cartão (`app/pricing/PricingClient.tsx:1616`). O caminho de compra reutiliza a opção vigente de oferta e cobrança (`app/pricing/PricingClient.tsx:810`). `checkout_started` confirma a criação pelo servidor (`app/api/stripe/checkout/route.ts:3166`). A chegada visual ao formulário de pagamento não tem marca própria nessa cadeia.

**EVIDÊNCIA DE PRODUÇÃO.** A consulta liga sessões a uma conta apenas quando a sessão tem um único usuário identificado, agrupa as demais por sessão e exclui internos e bots marcados. O país vem do cadastro e usa a faixa original de alta renda da lista em `lib/freeFilmPolicy.ts`, antes das extensões de elegibilidade a BR, AR, ZA, TR, MX, MY e PR. A compra é uma assinatura paga vinculada ao ID da sessão Stripe, com valor positivo e sem trial de entrada. O checkout é ligado por escolha, modalidade, sessão ou conta e janela de 30 minutos, com 2 segundos de tolerância à ordem de chegada da telemetria. O resultado junta 44 sessões de checkout aos cliques de `/pricing`. Das 567 sessões Stripe canônicas de todos os canais, 441 chegaram sem sessão de navegador e sem ID de usuário. A origem dessas 441 permanece desconhecida.

**QUESTÃO PENDENTE.** O celular tem sinal da barra móvel. O computador não tem identificação equivalente em `pricing_view`. A categoria desconhecida inclui dispositivos que não produziram o sinal móvel. O campo `ua_class` do checkout classifica navegador, robô ou desconhecido (`app/api/stripe/checkout/route.ts:347`). O funil deixa esses casos explícitos. [Consulta só leitura](FUNIL-PRECO-PAGAMENTO.sql).

## O que a pessoa via

**TESTADO LOCALMENTE · build da main `52c247e43`, visitante, 23/11/2026.** A primeira dobra tem título, garantia, escolha de público, período e o cartão completo do Starter. O primeiro botão terminava em **755 px** no celular de 390 px. Os demais planos começavam abaixo. No desktop de 1920 px, o primeiro botão terminava em **772 px**. São medições das capturas iniciais. A nota de cobrança local também aparece após a resolução de moeda em `app/pricing/PricingClient.tsx:1632`. Sem gravação das visitas, o que cada pessoa viu historicamente permanece desconhecido. [Comparativo](FUNIL-PRECO-PAGAMENTO-ANTES-DEPOIS.html).

## O que os concorrentes fazem

**EVIDÊNCIA DE PRODUÇÃO · páginas públicas consultadas em 23/11/2026.** O comparativo guarda as cinco fotos de preço. O limite da inspeção foram os CTAs e as telas públicas que responderam. Os campos de pagamento não ficaram visíveis sem entrar em conta ou no aplicativo.

| Página pública | O que apareceu junto da escolha | Até onde deu para conferir |
| --- | --- | --- |
| [InVideo](https://invideo.io/pricing/) | O cartão põe o total cobrado no período e o valor da renovação perto do botão. A calculadora mais abaixo recomenda plano pelo volume. | A interação com Get Basic permaneceu na página pública durante o teste. A [ajuda](https://help.invideo.io/en/articles/11528140-invideo-plans-and-credits-everything-you-need-to-know) confirma a escolha de período e conferência do plano. |
| [Higgsfield](https://higgsfield.ai/pricing) | O CTA vem junto do preço. Logo abaixo, há equivalências por modelo para a franquia em créditos. | Get Starter manteve os cartões visíveis na captura. A [ajuda de cobrança](https://higgsfield.ai/creator-hub/help-center/billing/how-does-billing-work) descreve o passo Stripe Checkout. |
| [Revid](https://www.revid.ai/pricing) | Os cartões mostram período, franquia e quem mais usa o plano. O link de entrada da conta fica no topo. | A interação Select Plan manteve a página pública com Sign in. |
| [Runway](https://runway.com/pricing) | O cartão transforma créditos mensais em segundos de vídeo para modelos específicos. | Get Standard apontou para o [checkout anual do plano](https://app.runwayml.com/checkout/plan/starter-yearly), que permaneceu carregando. A [ajuda](https://help.runwayml.com/hc/en-us/articles/38815643535251-How-do-I-upgrade-or-resubscribe-to-a-paid-subscription) mostra a sequência dentro do aplicativo. |
| [Kling](https://kling.ai/app/membership/membership-plan) | A frase do preço inicial e da renovação fica no mesmo cartão. A oferta também mostra o custo por créditos. | A página pública exibiu convite para entrar. O pagamento ficou sem confirmação pública. [Termos de pagamento](https://kling.ai/docs/payment-policy). |

## Uma mudança para testar

**SUGESTÃO · escolha de plano na primeira dobra.** Colocar Starter, Creator e Studio lado a lado no raciocínio de escolha, com uma linha por plano, franquia, preço do período e ação direta. O detalhamento de motores continua acessível depois da escolha. A prévia reúne os três botões no primeiro recorte de 390 px e traz o primeiro botão a **274 px**. Em 1920 px ele termina em **349 px**. A hierarquia aproxima preço e ação como observado em InVideo e Higgsfield, usando o visual da Kineo. As fotos mostram o bloco isolado. Na integração, manter a navegação, a garantia e as divulgações existentes visíveis.

**IMPLEMENTADO PARA REVISÃO LOCAL.** `app/dev/pricing-plan-entry/page.tsx` usa a tabela de referência de `lib/checkoutPricing.ts` e a mesma função de liquidação em reais de `lib/settlementCurrency.ts:170`. A prévia representa o caso padrão no Brasil. A chave `PRICING_PLAN_ENTRY_RELEASE` nasce desligada, e a régua de acesso no servidor admite `off`, `internal` e `public` (`lib/growth/pricingPlanEntryRelease.ts:6`). A integração da página real aguarda a resolução da revisão da Black Friday, registrada no quadro às 15:59. Na integração, ligar o bloco ao mesmo estado de período, valores efetivos, moeda e `handleBuy` vigentes na página. O reteste do navegador não confirmou a interação anual após perda de controle de uma aba local. O guardião monta o componente, alterna para anual, confere o valor de liquidação e aciona o plano. As duas rotas responderam 200 e as oito capturas foram conferidas.

**SUGESTÃO · medição.** Primeiro conferir `internal` com a conta da casa e registrar sinal de dispositivo na chegada e de cartão visível, usando as classes celular/computador sem agente de navegação bruto. Para compradores externos, medir pessoas que escolhem um plano por pessoas que abriram `/pricing`, acompanhar criação de checkout e usar assinatura paga como resultado final. Com 4 pagamentos atribuídos em 30 dias, o ganho em compradores continua desconhecido. Se os valores e o destino divergem da página vigente, parar antes de abrir a chave.

**TESTADO LOCALMENTE.** TypeScript limpo no SHA de código `28afe78a4`. A bateria de preços comparou 20 guardiões, com um vermelho herdado e zero novos.
