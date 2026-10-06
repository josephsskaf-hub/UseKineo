# Conversão MRR — sprint de 72 horas

**DECISÃO APROVADA — mandato direto do fundador em 05/10/2026:** foco em upgrade → checkout → pagamento, com meta de pelo menos cinco pessoas externas pagando na coorte da sprint. Um passe é compra avulsa, não MRR. Sem alteração de preço, concessão, cupom, geração, e-mail, banco ou trilho de pagamento.

**DECISÃO DE EXECUÇÃO — registrada também em DECISIONS:** início da data solicitada em America/Sao_Paulo: 06/10 00:00 até 09/10 00:00 (03:00 UTC, intervalo semiaberto). O fundador não especificou hora. Este corte torna os três dias reproduzíveis; exposição exige a versão da oferta e nunca é inferida do relógio ou do enqueue.

## O que o dado confirma

**EVIDÊNCIA DE PRODUÇÃO — SELECT, corte fixo 05/10 23:25:12 UTC:** [baseline agregado](mrr-conversao-0610/baseline.json), [SQL reproduzível](mrr-conversao-0610/baseline.sql). Contas internas excluídas pela lista canônica em memória; pessoas distintas; eventos de navegador com sessão; pagamento positivo de webhook vinculado ao checkout da mesma pessoa e sessão Stripe. Agregação no banco, sem limite de mil linhas.

| Coorte / percurso | Pessoas | Taxa com seu denominador |
|---|---:|---:|
| Cadastros externos em sete dias | 136 | 100% |
| Desses, abriram checkout | 17 | 17/136 = 12,50% |
| Desses, pagaram | 1 | 1/17 = 5,88%; 1/136 = 0,74% |
| Abriram upgrade, incluindo contas anteriores | 62 | Denominador distinto da coorte acima |
| Dessas 62, checkout posterior | 13 | 13/62 = 20,97% |
| Dessas 13, pagamento posterior na mesma sessão Stripe | 1 | 1/13 = 7,69%; 1/62 = 1,61% |

**EVIDÊNCIA DE PRODUÇÃO:** os 17 checkouts da coorte têm estado atual 10 `region_paid_only`, quatro `active`, dois `downgraded`, um `converted`. Esse último completa a divisão inicial de 16. Estado atual não prova o estado na hora do checkout. A origem cadastrada do pagante é ChatGPT; campanha desconhecida. No corte fixo houve 37 pessoas em `pricing_view`, contra 38 no corte informado pelo fundador; não se somam ou interpretam essas janelas como efeito comercial.

## Entrega e limite de comprovação

**IMPLEMENTADO:** `lib/offers/mrrConversion.ts` usa exclusivamente `checkoutPricing`, `creditCostForDuration` e `clipCreditCost`. Passe de US$ 4,99 com 35 créditos: um filme Seedance de 60 s **OU** sete clipes Seedance de cinco segundos, sem extras. O saldo é compartilhado entre os formatos, não a soma das duas capacidades. Planos mostram a mesma régua, crédito como nota secundária, cobrança anual integral e concessão mensal. Nenhuma tabela de preço ou direito foi editada.

**IMPLEMENTADO:** o modal ativo é a função `UpgradeModal` dentro de `GenerateClient.tsx`, não o antigo componente homônimo sem chamador. Para conta comprovadamente não pagante, o passe fica antes dos planos; prova visual é vídeo concluído da própria conta, obtido pela API autenticada, ou trecho público próprio do fundador. Sem autoplay. A ação de teste já disponível é preservada. Assinantes continuam com a tela existente. `/pricing` só mostra a nova entrada avulsa quando confirma `region_paid_only`, `has_paid=false`, `plan=free`; dados ausentes falham fechados. Mensal e anual permanecem visíveis.

**FATO CONFIRMADO — código:** `app/api/stripe/checkout/route.ts`, função `buildPackAndRedirect`, já cobra `pack=starter` com `price_data` inline derivado da fonte canônica. O checkout existente não depende de um Price ID fixo. Metadados `intent_campaign` já atravessam checkout e webhook; as rotas Stripe foram apenas lidas.

**EVIDÊNCIA DE PRODUÇÃO — catálogo Stripe live, leitura 05/10:** listagem completa de 39 produtos ativos, 22 preços avulsos ativos e 12 links, sem paginação pendente. Não foi encontrado Price avulso USD 499 nem link estático correspondente; há um antigo USD 490. O link foi solicitado ao fundador conforme mandato. Nenhum objeto Stripe foi criado e o link antigo não foi usado.

**QUESTÃO PENDENTE / DESCONHECIDO:** uma compra real pelo passe atualizado não foi executada nesta sessão. GET da rota de checkout cria sessão de compra e não foi usado como se fosse leitura. A existência do código e o teste local não comprovam pagamento real. A ausência de Price fixo não invalida o caminho inline já aprovado em DECISIONS, 05/10.

**TESTADO LOCALMENTE:** [comparação antes/depois](mrr-conversao-0610/REVIEW.html), [32 capturas](mrr-conversao-0610/media/), [interações](mrr-conversao-0610/browser.json). JSX real do modal e de `/pricing`, APIs/contas simuladas, rede externa bloqueada; demais peças não alteradas da página foram omitidas da prévia. Desktop/celular, claro/escuro. Não são prints de produção nem prova de compra. Guardião novo executa cálculo, elegibilidade, atribuição, OFF e 13 mutantes; o guardião de preço aprovado conserva seus oito mutantes. O teste do abridor antigo recebeu as dependências da nova oferta e continua cobrando todos os motivos anteriores.

**ESTADO DA ENTREGA:** evidência final de tipos, suíte, integração, SHA e publicação em [CHECKPOINT](mrr-conversao-0610/CHECKPOINT.json) e [gates](mrr-conversao-0610/gates.json). Enfileirar não é publicar. Publicado, exposto e pago só serão promovidos mediante prova.

**TESTADO LOCALMENTE — 05/10 BRT:** main `7ec75c5d`: 762 scripts, 618 passaram e 144 falharam. Candidato integrado com fila até `656b79c1`: 766 scripts, 622 passaram e as mesmas 144 falharam, com as mesmas mensagens de asserção. Suíte inteira mais repetição dos 16 guardiões afetados pelos merges finais; nenhuma ausência no inventário e nenhum vermelho novo. Tsc passou após o último merge. Falhas preexistentes não foram removidas, silenciadas nem apresentadas como testes verdes. A execução bloqueou rede e leitura de arquivos privados de ambiente para evitar efeitos em produção.

## Régua dos relatórios de 24 horas

**IMPLEMENTADO — medição:** versão `mrr0610_v1`; impressão `conversion_offer_viewed`, primeiro gesto `conversion_offer_first_gesture`. Campos de UI: `offer_version`, `offer_surface`, `offer_id`. No checkout e no pagamento canônicos, a mesma versão/oferta é codificada em `metadata.intent_campaign=mrr0610_v1_<superficie>_<oferta>`, usando o transporte que já existia. Não se acrescentou campo fictício no webhook.

**DECISÃO DE EXECUÇÃO:** [report.sql](mrr-conversao-0610/report.sql) conta pessoas por oferta, não soma pessoas entre ofertas. Upgrade → checkout → pagamento respeita ordem e mesmo usuário; checkout → pagamento exige o mesmo `stripe_session_id`. Por oferta, o denominador exige impressão daquela oferta antes do checkout. Fonte/campanha vêm do cadastro, com coalesce entre as duas colunas de origem existentes; só há uma coluna de campanha nesse schema. O token da oferta não vira origem de aquisição. Retornos sem impressão ou eventos sem sessão aparecem como diagnóstico, não completam a meta.

**DECISÃO DE EXECUÇÃO:** relatórios registram N/N e percentual, passe versus mensal/anual, pagamentos distintos e pessoas distintas, origem conhecida/desconhecida, exposição real e próxima jogada. Amostra vazia produz desconhecido para taxa; não 0% inventado. O corte de sete dias contextualiza; a janela nova de 72 horas não prova causalidade contra ele. Repetição de compra da mesma pessoa não completa sozinha a meta conservadora de cinco pessoas.

## Crítica, concorrência e próxima jogada

**FATO CONFIRMADO / o que pode melhorar:** o preço mensal no topo antes da entrada avulsa contrariava a prioridade pedida para quem não recebeu teste. A nova apresentação coloca resultado e passe antes da assinatura. A capacidade em clipes usa duração explícita para não vender sete filmes como se fossem sete cenas de cinco segundos.

**PRÁTICA OBSERVADA — concorrência, consulta 05/10/2026:** a [página oficial de preços do InVideo](https://invideo.io/pricing/) associa os planos a quantidades de geração/vídeos e explicita cobrança anual. Adaptamos resultado concreto mais período de cobrança; não copiamos preços, descontos ou alegações de desempenho. Não há evidência pública usada aqui de que essa prática, por si, aumente conversão.

**HIPÓTESE:** menor compromisso inicial e prova do próprio resultado podem reduzir a distância entre interesse e compra. **Próximo passo recomendado:** primeiro confirmar publicação e exposição versionada; em 24 h verificar qual oferta chega a checkout e pagamento. Se a tela é vista mas o passe não chega a checkout, revisar compreensão/posição dentro do escopo. Se há checkout sem pagamento, levar oferta/preço ao fundador; não reabrir diagnóstico de cartão. Não aumentar preço, desconto ou cupom por conta própria.

**PARA O FUNDADOR DECIDIR:** fornecer o link estático de US$ 4,99 caso exista e queira esse canal além da rota inline atual; qualquer proposta de novo preço/oferta; publicar pelo launcher com os SHAs conferidos. Nenhuma necessidade de criar produto Stripe foi presumida.

**REVERSÃO:** `MRR_CONVERSION_ENABLED=false` em `lib/offers/mrrConversion.ts` restaura a apresentação e URLs de checkout anteriores. Revalidar guardiões e publicar pelo caminho da casa. Não reverter o merge inteiro: ele preserva a entrega de Clipes da outra sessão. Não há migration, alteração de crédito ou dado a desfazer.

**FATO CONFIRMADO — mapa das fontes de código conferidas:** `lib/offers/mrrConversion.ts:11` (interruptor), `:21` (metadados), `:35` (capacidade), `:47` (plano/período), `:66` (elegibilidade); `components/offers/ConversionUpgrade.tsx:56` (prova própria), `:151` (entrada regional); `lib/checkoutPricing.ts:628` (passe USD499), `:303` (anual); `app/api/stripe/checkout/route.ts:314` (token aceito), `:2545` e `:2593` (pack e price_data); `app/api/stripe/webhook/route.ts:787` (token preservado no pagamento); `lib/clips/clipServer.ts:104` e `lib/enginePlanGate.ts:58` (Seedance disponível sem gate premium); `lib/publicExamples.ts:156` (trecho público próprio). Nenhum desses fatos de implementação comprova pagamento real.
