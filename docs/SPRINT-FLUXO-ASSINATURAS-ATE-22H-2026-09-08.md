# Sprint de fluxo e primeiras assinaturas — 08/09/2026, até 22h

**DECISÃO DO FUNDADOR — nesta tarefa, 08/09/2026:** retomar fluxo e assinaturas com o modelo comercial recebido do Claude e os aprendizados das últimas sprints, até as 22h de Brasília. Marco desta retomada: `2026-09-08T15:23:30Z`. Encerramento: `2026-09-09T01:00:00Z`. A janela anterior permanece encerrada e documentada; esta autorização abre uma nova janela, sem apagar seu resultado.

**CONFIGURADO:** a rotina existente `usekineo-fluxo-ciclos-de-20-min` foi reativada como **UseKineo — Fluxo e primeiras assinaturas · até 22h**, vinculada a esta tarefa, com revisões a cada 20 minutos e término fixo. Não foi criada outra rotina ou outro executor. Confirmação: ferramenta `automation_update`, 08/09/2026. O Board recebeu a retomada e confirmou que permanece somente na coordenação.

## Resultado que buscamos

**HIPÓTESE:** quem chega do ChatGPT com uma ideia pronta tende a avançar melhor quando encontra o roteiro preservado, benefício compreensível e preço completo antes da escolha. O resultado comercial a perseguir é primeira compra confirmada e progressão até filme e assinatura, sem tratar clique, cadastro ou teste interno como receita.

**DECISÃO OPERACIONAL:** separar três públicos: visitante que ainda não pagou; cliente do trial pago, cuja próxima necessidade é filme/continuidade; gratuito histórico com filme, elegível a uma primeira compra. A entrada de US$1 é uma compra de trial; não é a mensalidade de US$19 nem prova de retenção.

## Execução em ordem

1. **CONCLUÍDO / EVIDÊNCIA DE PRODUÇÃO — 08/09:** Claude recebeu o patch, integrou em `7a7b259c539f3a11614f378ff1b70ef33ae8a5f8` e publicou. Vercel confirmou READY com alias de produção às `15:32:56.985 UTC`. Preservar a variante e acompanhar exposição real; os limites da verificação constam abaixo.
2. **CONCLUÍDO / EVIDÊNCIA DE PRODUÇÃO — 08/09:** baseline agregada da Versão B executada por SELECT, com corte anterior à nova sprint e ingresso comprovado. Resultado e consulta reproduzível abaixo. Essa leitura não mede o efeito da entrega publicada depois.
3. **EXECUTAR CONFORME EVIDÊNCIA:** tratar uma barreira concreta em /go ou superfície pública própria que já tenha chamador. Antes de editar, escrever hipótese, mudança mínima, público, evento, limite de parada e risco; confirmar que a mecânica não duplica entrega de outra pista. Validar e encaminhar pelo caminho permitido. Se a amostra de uma variante for insuficiente, preservá-la.

## Entrega publicada e caminho operacional corrigido

**IMPLEMENTADO / TESTADO LOCALMENTE:** candidato `bcdfac12aa31c5e2ee3388c5696554ea7eca44db`, faixa completa `0044fccf..bcdfac12`, ref `codex/pista3-go-preserva-roteiro`. /go informa a oferta e usa o handoff com token até o Studio; não abre checkout isolado que poderia retomar outra ideia. History preserva apenas o escopo anteriormente autorizado. Typecheck, 100 verificações próprias, 84 de handoff e comparação visual constam em `docs/HANDOFF-PISTA3-VERSAO-B-2026-09-08.md` e no diário encerrado.

**EVIDÊNCIA DE RECEBIMENTO / INTEGRAÇÃO — 08/09:** o fundador retransmitiu a confirmação do Claude de recebimento do patch SHA-256 `BFD3B75B3CB046C94CE7B6B12FF207A5696A844C25775F25B0E972EBD09C9588`, aplicado sobre `654e402f` em `C:/kineo-wt/p3-apply`, com typecheck e 100 + 84 verificações verdes. O fetch do clone vivo confirmou o commit integrado `7a7b259c` em origin/main. O ZIP no clone antigo é somente arquivo histórico: não reaplicar seu produto nem repetir o enfileiramento antigo.

**EVIDÊNCIA DE PRODUÇÃO — leitura Vercel e HTTP, 08/09 às 15:37 UTC:** deploy `dpl_5CSpf5cue1Z5pcivgPqJGR8rxcSt`, SHA `7a7b259c539f3a11614f378ff1b70ef33ae8a5f8`, target production, READY em `2026-09-08T15:32:56.985Z`, alias `www.usekineo.com`, sem erro de alias. Durante a verificação, o alias avançou ao commit documental `23a6646d`, deploy `dpl_BrNJBtDe2c8UYtFDP64tr6BsASYs`, READY em `15:34:54.465 UTC`. Fonte: MCP Vercel get_deployment; [deploy do produto](https://vercel.com/josephsskaf-hubs-projects/kineo/5CSpf5cue1Z5pcivgPqJGR8rxcSt).

**VALIDADO EM PRODUÇÃO / RECORTE TÉCNICO — 08/09 às 15:37 UTC:** GET de uma sonda preexistente, identificada como bot, devolveu 200 em /go e manteve o token no link de retomada. O chunk publicado contém `pista3_next_film_v1`, `handoffHref` e `Open this script in Studio`. Token inválido devolveu 404. A oferta não aparece para bot, conforme o gate; não houve novo handoff, clique, render ou pagamento. O publicador também registrou canário com HTML da oferta no PEDIDOS em `23a6646d`; esse registro é evidência do publicador, não visita de cliente.

**QUESTÃO PENDENTE / LIMITE:** a verificação independente não validou visualmente uma pessoa elegível em /go, o lightbox autenticado de /history, checkout ou pagamento. Publicação técnica não prova conversão nem continuidade de todos os parâmetros depois de uma cobrança real. Nenhuma sonda entra no denominador de pessoas externas.

**CONTRADIÇÃO CORRIGIDA — 08/09:** o PEDIDOS em `23a6646d` sugere medir desde `16:05 UTC`, posterior à publicação e ainda futuro quando lido. O marco documentado de exposição possível é `15:32:56.985 UTC`, READY do primeiro deploy com a variante, não o horário do commit nem o corte arbitrário de 16:05. Eventos anteriores ficam fora da exposição em produção; presença de deploy não equivale a oferta vista.

**FATO CONFIRMADO / ESCOPO:** main observada no início `654e402f`, cujo avanço liga o D+1 autorizado ao Claude; não será duplicado nem disparado por esta tarefa. Preços vêm de `lib/checkoutPricing.ts`; política e motores seguem `entryPolicy`/`enginePlanGate`. Não alterar checkout, webhook, compose, GenerateClient, admin, preços, crédito, home/Omni, lifecycle ou pipeline. Sem comunicação a clientes, rascunho de outreach, anúncio, gasto, render, conta externa, segredo/.env ou escrita em banco. History não recebe expansão nesta retomada.

**FATO CONFIRMADO / CORREÇÃO OPERACIONAL — 08/09:** a worktree nova é `C:/kineo-wt/p3-novo`, criada de origin/main do clone vivo `C:/kineo`. `git rev-parse --git-common-dir` confirma `C:/kineo/.git`. A junction node_modules aponta para `C:/kineo/node_modules`. A worktree antiga p3 pertence ao clone morto do OneDrive; sua entrega-atual não é a fila de produção. A ordem direta do fundador corrige o caminho antigo citado em AGENTS.md. O checkout principal vivo contém alterações de terceiros e não será editado ou limpo por esta pista.

**INSTRUÇÃO DIRETA DO FUNDADOR — resposta nesta tarefa, 08/09:** o publicador é um fluxo de arquivos, sem sessão ou aplicativo a localizar. O canal real é `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`, commitado e enfileirado. Para trabalho novo no clone vivo: commit na worktree, `bash scripts/enfileirar.sh` uma vez, depois `C:/kineo/scripts/!RODAR-AGORA.bat` ou SUBIR-SITE.bat. Verificar fila e ausência de helper ativo, preservar trabalho alheio. Se enfileirar falhar, não tentar outra vez: registrar `PRONTO PARA PUBLICAR: <sha>` no PEDIDOS e entregar ao publicador. Isso não autoriza reaplicar o pacote já publicado nem repetir a falha do clone morto.

**CONFIGURADO — 08/09 às 15:39 UTC:** o prompt completo da rotina foi corrigido para a worktree nova, clone vivo, recebimento confirmado, fluxo por arquivos e término às 22h BRT. A regra antiga de canal desconhecido foi retirada; não há uma segunda rotina de código.

## Placar e critério de decisão

**SUGESTÃO EM EXECUÇÃO:** medir pessoas externas identificadas, com internos, probes e sinais de bot excluídos; sessões anônimas separadas. A coorte da Versão B deve ter ingresso comprovado, não ser inferida pelo perfil atual. Não misturar a população histórica gratuita com a paga como se percorressem o mesmo funil.

**FATO CONFIRMADO / CONTRATO VIGENTE:** `payment_success.card_trial=true` identifica a entrada do trial; checkout direto de assinatura exige os campos de contrato, não só o nome do evento; fatura de conversão usa `subscription_invoice_paid` e `trial_conversion`. Deduplicar sessão/fatura e vincular a mesma pessoa/assinatura; `false` sozinho não prova renovação. Fonte e limites detalhados no handoff vigente, conferidos no webhook e em `app/api/admin/_shared/mrr.ts`. Não substituir valores reais por preços de tabela atuais em recibos históricos.

**EVIDÊNCIA DE PRODUÇÃO / BASELINE ANTERIOR À SPRINT — SELECT executada em 08/09/2026:** janela semiaberta `[2026-09-08 04:30:00 UTC, 2026-09-08 15:23:30 UTC)`. Fonte exata: `docs/queries/BASELINE-VERSAO-B-ATE-22H-2026-09-08.sql`, Supabase projeto `cqqukkvjjrguayiyjvhh`. A coorte exige cadastro e ingresso `card_entry_required`, `policy=card_entry_only`, `marked=true`; internos, sondas conhecidas e sinais de bot são excluídos. Os degraus abaixo exigem a mesma pessoa e ordem temporal. Origem é sinal observado, não atribuição perfeita.

| Origem observada | Pessoas na coorte | Banner visto depois do ingresso | Clique depois de ver | Checkout do trial depois do clique | Pessoas com pagamento identificado na janela |
| --- | ---: | ---: | ---: | ---: | ---: |
| ChatGPT com sinal | 3 | 3 | 0 | 0 | 0 |
| Origem desconhecida | 1 | 1 | 0 | 0 | 0 |
| Outra fonte declarada | 3 | 2 | 0 | 0 | 0 |
| Total da mesma janela | 7 | 6 | 0 | 0 | 0 |

**LIMITE DA BASELINE:** todas as categorias financeiras retornaram zero nessa coorte: trial de US$1, trial de outro valor, assinatura direta, avulso, pagamento sem classificação, valor ausente/zero, conflitos e faturas positivas. A consulta deduplica sessão/fatura e aponta contratos conflitantes; não soma essas categorias sobrepostas. O resultado não descreve receita global da empresa, não demonstra rejeição de preço e não mede a variante que foi publicada depois. A amostra é insuficiente para julgar conversão. O painel administrativo usa outra janela; não comparar totais como se fossem o mesmo funil.

**EVIDÊNCIA DE PRODUÇÃO / PRIMEIRA EXPOSIÇÃO — SELECT de 08/09/2026:** janela `[15:32:56.985,15:41:01) UTC`, desde o READY. `pista3_creator_offer_viewed` com a variante retornou zero linhas, inclusive antes dos filtros; zero pessoas externas identificadas e zero eventos anônimos observados. Fonte exata: `docs/queries/PISTA3-PRIMEIRA-EXPOSICAO-2026-09-08.sql`, projeto Supabase acima. Isso não prova zero visitantes: a emissão depende de JavaScript, visibilidade e persistência. Não há volume para decidir eficácia ou abandono. Os nomes financeiros incluídos nessa consulta foram filtrados pelo marcador da variante e NÃO medem pagamentos totais ou a sequência de conversão; o futuro acompanhamento financeiro deve partir das pessoas expostas e vincular seus contratos, mesmo sem marcador nos eventos financeiros.

**FATO CONFIRMADO — `7a7b259c:components/PostFilmCreatorOffer.tsx:49`:** a exposição depende de controle pelo menos 50% visível durante 1.000 ms e aba visível; o evento é emitido em `:63`. A âncora de /go (`:99`) leva ao Studio; não interpretar ausência de `checkout_cta_clicked` nesse componente como abandono do pouso. **DECISÃO OPERACIONAL:** manter a variante, acompanhar exposição real nas próximas rodadas e não criar uma nova versão por ausência de amostra.

**GATE DE PARADA:** interromper uma mudança se aparecer compra para perfil pago/desconhecido, perda do roteiro, alteração de produto/valor, degradação do filme/download, conflito de responsabilidade ou necessidade de ação fora do escopo. Pedido concreto ao dono, sem contornar o limite. A ausência de amostra não é falha de preço ou motivo para trocar copy a cada rodada.

**FECHAMENTO PROGRAMADO:** às 22h BRT, registrar o que chegou ao ar, pessoas que avançaram, entradas pagas e assinaturas separadas, pendências e três próximas prioridades; remover a rotina e parar sem renovação automática. Notificar durante o bloco apenas entrega, mudança relevante, pagamento confirmado, falha real ou informação necessária.

## Acompanhamento durante a sprint

**EVIDÊNCIA DE PRODUÇÃO — SELECT de 08/09, rodada das 13h BRT:** janela cumulativa `[15:32:56.985,16:00:32.320) UTC`. Zero linhas de `pista3_creator_offer_viewed` com marcador da variante antes dos filtros; zero pessoas externas identificadas e zero eventos/sessões anônimos observados. Fonte: a SQL de `docs/queries/PISTA3-PRIMEIRA-EXPOSICAO-2026-09-08.sql` em `bbe40dd7`, com `cutoff_utc='2026-09-08 16:00:32.320+00'` e CTE `wanted` limitada somente a `pista3_creator_offer_viewed`, executada no projeto `cqqukkvjjrguayiyjvhh`. Não foi feita leitura financeira nesta rodada. Git origin/main continua `bbe40dd7`, sem novos pedidos desde o registro anterior. Sem amostra para decisão; variante preservada. Esta janela contém a primeira leitura, portanto não somar seus resultados.

**REGISTRO LOCAL / DECISÃO OPERACIONAL:** leituras sem mudança acionável serão agrupadas no diário e publicadas junto ao próximo marco ou encerramento, evitando um deploy documental a cada consulta. A fila e o PEDIDOS publicado não são alterados por uma leitura sem novidade.

**FATO CONFIRMADO / IMPLEMENTADO — checagem limitada de 08/09, rodada das 13h:** o emissor (`components/PostFilmCreatorOffer.tsx:36`, `:63`) passa versão, superfície e visibilidade por `trackClosedEvent` (`lib/analytics.ts:484`, `:440`) até `/api/events`. A lista de nomes bloqueados não contém esse evento (`app/api/events/route.ts:21`, `:153`); os campos permanecem na metadata, com ip_hash/is_bot acrescentados antes do insert (`:227`, `:252`). Nenhum bloqueio concreto encontrado nesse percurso de código. Isso não prova ingestão no navegador de uma pessoa real nem transforma ausência de eventos em falha.

**EVIDÊNCIA DE PRODUÇÃO — SELECT de 08/09, rodada das 13h20 BRT:** mesma origem `15:32:56.985 UTC`, corte cumulativo `16:20:32.573 UTC`, mesma SQL e restrição a `pista3_creator_offer_viewed` da rodada anterior, alterando apenas `cutoff_utc`. Resultado: zero linhas antes dos filtros; zero pessoas externas e zero eventos/sessões anônimos observados. origin/main permanece `bbe40dd7`, sem nova mensagem no PEDIDOS. Sem mudança acionável: preservar a variante; não inferir pagamentos ou ausência de visitas a partir deste resultado e não somar janelas cumulativas. Registro local aguardando publicação agrupada.

**EVIDÊNCIA DE PRODUÇÃO — SELECT de 08/09, rodada das 13h40 BRT:** mesma origem `15:32:56.985 UTC`, corte cumulativo `16:40:02.842 UTC`; consulta histórica de exposição com esse `cutoff_utc` e `wanted` restrito a `pista3_creator_offer_viewed`. Resultado: zero linhas antes dos filtros, zero pessoas externas e zero eventos/sessões anônimos observados. origin/main e PEDIDOS continuam `bbe40dd7`. A variante permanece. Leitura complementar de chegadas ao pouso abaixo, quando concluída, não transforma sessões em pessoas.

**EVIDÊNCIA DE PRODUÇÃO — chegadas ao /go, SELECT de 08/09:** mesma janela `[15:32:56.985,16:40:02.842) UTC`; fonte exata `docs/queries/PISTA3-CHEGADAS-GO-2026-09-08.sql`, projeto `cqqukkvjjrguayiyjvhh`. `gpt_landing_viewed` registrou somente 2 linhas ligadas a sondas conhecidas, 2 tokens de teste, sem user_id ou sessão, signed_in=false. Zero linhas nas demais classes (bot não reconhecido como sonda, identidade reportada, não identificado sem sinal de bot). Os registros de sonda são de `15:33:13.131942 UTC` e `15:37:03.321501 UTC`. Nenhuma chegada de cliente foi demonstrada por esse contador nessa janela; não há base para atribuir o zero de exposição a abandono da oferta.

**FATO CONFIRMADO / LIMITES DO CONTADOR — 08/09:** `app/go/[token]/page.tsx:105` chama `gpt_landing_viewed` somente depois de validar token/expiração; envia token, signed_in, bot e cookie session_id, sem userId. `lib/serverEvents.ts:70` grava user_id=NULL nesse caso, inclusive com signed_in=true. O dedupe é nome + sessão por 30 minutos, sem token (`:53`); sessões e tokens não são pessoas. Sondas são reconhecidas pelo token ligado ao IP do criador do handoff; esse IP não identifica o visitante. Essa leitura não cobre URLs inválidas/expiradas, não prova todos os acessos e não classifica desconhecidos como pessoas externas. Não alterar medição existente nem variante por este resultado.

**EVIDÊNCIA DE PRODUÇÃO / PRIMEIRA EXPOSIÇÃO EXTERNA — SELECT de 08/09, rodada das 14h:** janela cumulativa `[15:32:56.985,17:01:33.171) UTC`. A oferta registrou 1 evento de 1 pessoa externa identificada em `history_film`, às `16:59:38.862992 UTC` (13h59 BRT), com contrato de visibilidade válido. Filtros de internos/bots/sondas não classificaram essa exposição como teste; sinal de bot está presente. Não houve evento anônimo ou exposição em gpt_handoff nessa janela. Fonte: mesma SQL de exposição, `wanted` limitado ao evento, com corte `17:01:33.171 UTC`; executada junto à consulta de chegadas como CTEs independentes agregadas em JSON, no projeto Supabase já indicado. A leitura de chegadas continua com somente as 2 sondas anteriores, sem nova linha nas outras classes.

**DECISÃO OPERACIONAL / LIMITE — rodada das 14h:** a ingestão de uma exposição real de History está demonstrada. Isso não é compra, assinatura nem atribuição causal; uma pessoa não permite julgar taxa de conversão. Preservar a variante e verificar a continuidade por identidade após a primeira exposição, sem exigir que pagamento carregue o marcador da campanha. History conserva o pacote autorizado, sem nova expansão. O primeiro registro externo é um marco para publicar o diário agrupado.

**EVIDÊNCIA DE PRODUÇÃO / CONTINUIDADE — SELECT de 08/09, mesmo corte `17:01:33.171 UTC`:** a coorte contém 1 pessoa externa exposta. Após sua primeira exposição, a junção pela mesma identidade encontrou zero linhas de `checkout_cta_clicked`, `checkout_started`, `payment_success` e `subscription_invoice_paid`. Fonte exata: `docs/queries/PISTA3-CONTINUIDADE-EXPOSTOS-2026-09-08.sql`, projeto Supabase já indicado. O pagamento não é filtrado por campanha. Esse resultado descreve apenas a continuidade observada na janela curta, não receita global nem abandono definitivo. Sessões/faturas distintas são separadas de pessoas; como não houve linha financeira, nenhuma venda ou renovação foi classificada. Se surgir dinheiro, reconciliar contratos/conflitos por Session/invoice antes de divulgar valores ou tipo de compra.

**EVIDÊNCIA DE PRODUÇÃO — leituras seguintes de 08/09:** todas as linhas abaixo começam em `15:32:56.985 UTC` e têm corte final exclusivo; não somar linhas cumulativas. Fonte: as SQLs `PISTA3-PRIMEIRA-EXPOSICAO-2026-09-08.sql` (wanted limitado ao evento de exposição), `PISTA3-CHEGADAS-GO-2026-09-08.sql` e `PISTA3-CONTINUIDADE-EXPOSTOS-2026-09-08.sql`, trocando somente seus cortes pela coluna abaixo e executando as três como CTEs independentes em uma SELECT no projeto já indicado. Os quatro degraus de continuidade contam pessoas da coorte após a primeira exposição, não exigem campanha no pagamento e não provam causalidade.

| Corte UTC | Pessoas externas expostas | Eventos anônimos de exposição | Pessoas com clique posterior | Pessoas com checkout posterior | Pessoas com payment_success posterior | Pessoas com fatura posterior |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 17:21:33.436 | 1 | 0 | 0 | 0 | 0 | 0 |
| 17:41:33.734 | 1 | 0 | 0 | 0 | 0 | 0 |
| 18:01:04.041 | 1 | 0 | 0 | 0 | 0 | 0 |
| 18:21:04.343 | 1 | 0 | 0 | 0 | 0 | 0 |
| 18:41:04.666 | 1 | 0 | 0 | 0 | 0 | 0 |
| 19:00:34.995 | 1 | 0 | 0 | 0 | 0 | 0 |
| 19:20:35.245 | 1 | 0 | 0 | 0 | 0 | 0 |
| 19:42:05.530 | 1 | 0 | 0 | 0 | 0 | 0 |
| 20:00:35.765 | 1 | 0 | 0 | 0 | 0 | 0 |
| 20:21:06.050 | 1 | 0 | 0 | 0 | 0 | 0 |
| 20:41:06.423 | 1 | 0 | 0 | 0 | 0 | 0 |
| 21:01:36.761 | 1 | 0 | 0 | 0 | 0 | 0 |
| 21:21:07.086 | 1 | 0 | 0 | 0 | 0 | 0 |
| 21:41:37.441 | 1 | 0 | 0 | 0 | 0 | 0 |
| 22:00:07.667 | 1 | 0 | 0 | 0 | 0 | 0 |

**LIMITE / ESTADO — rodada das 19h BRT:** permanece a mesma pessoa de History, sem nova exposição de /go; todas as linhas financeiras posteriores estão ausentes. O pouso mantém somente as 2 sondas já registradas, com zero linhas nas demais classes. origin/main permanece `3eeae0d1`, sem nova alteração; PEDIDOS não mudou desde `c9a145ad`. Variante preservada, leitura sem mudança acionável registrada localmente para publicação agrupada. O encerramento continua às22h BRT, que corresponde a01h UTC de09/09; esta leitura das22h UTC não é o encerramento.

**EVIDÊNCIA DE PRODUÇÃO / VERSÃO B SEPARADA — SELECT de 08/09, rodada das 15h40:** a consulta `BASELINE-VERSAO-B-ATE-22H-2026-09-08.sql` foi reaplicada com a mesma origem `04:30 UTC` e corte exclusivo ampliado para `18:41:04.666 UTC`, como uma quarta CTE independente. Continua com 7 pessoas de ingresso comprovado: 3 com sinal ChatGPT (3 viram banner), 1 de origem desconhecida (1 viu), 3 de outra fonte declarada (2 viram). Zero clique após visualização e zero checkout após clique; todas as categorias financeiras e conflitos retornaram zero nessa coorte, inclusive entradas de trial por qualquer rota. Não houve mudança no placar observado desde a baseline. Esta janela começa antes da sprint e não se mistura à coorte exposta; não é receita global nem efeito atribuível à P3. Fonte e projeto são os mesmos da baseline, sem alterar a SQL histórica arquivada.

## Handoff vigente recebido pelo Board — 08/09, incorporado após 19h48 UTC

**INSTRUÇÃO DIRETA DO FUNDADOR / RETRANSMISSÃO PELO BOARD — 08/09:** conservar o modelo comercial e as entregas já publicadas: entrada Creator de US$1/7 dias/80 créditos, depois US$19; Starter9/60, Creator19/150, Studio29/180 e anual10x. Preço/copy derivam de checkoutPricing/entryPolicy; motores e elegibilidade vêm de enginePlanGate, sem resumir a lista completa a quatro motores. Continue now permanece escolha explícita. Nenhuma mudança nova em preço, oferta, Stripe ou pipeline. /ph, D+1 (09h30, teto30), afiliados, geo/Dodo e retomada de rascunho45min continuam com Claude. Esta incorporação não reconstrói as entregas nem amplia a caneta da P3.

**FATO CONFIRMADO / FONTE DO PLACAR — `c9a145ad:lib/admin/versaoBFunnel.ts:8`:** `VERSAO_B_SINCE='2026-09-08T05:00:00.000Z'`; a função `funilVersaoB` em `:23` conta conjuntos independentes por pessoa. Para o placar da casa, usar esse contrato e `app/api/admin/_shared/mrr.ts`, sem contagem paralela ou taxa sequencial inventada. As leituras anteriores de origem04h30 ficam preservadas como análises históricas declaradas; não voltar a executá-las como placar da casa nem rebatizar seus totais como painel. A coorte específica P3 desde READY15:32:56.985UTC permanece separada e temporal, com contratos financeiros reconciliados antes de classificar trial, primeira mensalidade ou renovação.

**NOVO GATE EXPLÍCITO ANTES DO PRÓXIMO ENFILEIRAMENTO:** ler e executar somente se offline os11 scripts abaixo, além de typecheck sem emissão/incremental e QA própria pertinente. Não executar chamadas/escritas de produção nem ler .env.local/credenciais; não alterar guardiões para ocultar regressão. Há outros scripts datados08/09: estes11 não significam todos os21. Evidência da mesma árvore de código pode ser reaproveitada; mudança de código, falha ou preocupação concreta exige nova verificação pertinente.

1. `scripts/test-admin-fonte-unica-2026-09-08.mjs`
2. `scripts/test-afiliado-ref-2026-09-08.mjs`
3. `scripts/test-continue-now-2026-09-08.mjs`
4. `scripts/test-funil-volta-1-dolar-2026-09-08.mjs`
5. `scripts/test-motor-so-no-studio-2026-09-08.mjs`
6. `scripts/test-ph-landing-2026-09-08.mjs`
7. `scripts/test-placar-diario-2026-09-08.mjs`
8. `scripts/test-placar-trial-1-dolar-2026-09-08.mjs`
9. `scripts/test-sistema-de-compra-2026-09-08.mjs`
10. `scripts/test-tarefas-5-6-2026-09-08.mjs`
11. `scripts/test-versao-b-entrada-1-dolar-2026-09-08.mjs`

**CONFIGURADO — 08/09:** prompt integral da rotina atualizado com esse handoff, fonte canônica das05h, novos gates e término inalterado às22h BRT. Registro agrupado: não publicar apenas para acusar recebimento. A variante já publicada não será reaplicada.

**FATO CONFIRMADO / INSPEÇÃO DOS NOVOS GATES — 08/09, árvore `c9a145ad`:** os11 scripts listados e helpers executados relevantes foram lidos integralmente. Todos são offline no caminho testado: leitura local e helpers puros em memória; o ramo Stripe do MRR recebe mocks e não é chamado, e a VM de entryPolicy usa env vazio. Nenhum dos11 lê .env.local, faz chamada de rede/banco, envia mensagem, escreve arquivo/produção ou inicia subprocesso. Isso autoriza apenas essa verificação local, não o acionamento das rotas que os testes leem como texto.

**TESTADO LOCALMENTE — 08/09 às19:52 UTC:** os11 guardiões passaram com 236 verificações e zero falhas. Na ordem da lista acima: 27, 10, 20, 20, 23, 14, 17, 17, 27, 25 e 36 verificações. Também passaram `node node_modules/typescript/bin/tsc --noEmit --incremental false` (exit0, sem saída), `node docs/qa/test-pista3-post-film.mjs` (100 verificações) e `node scripts/test-gpt-handoff-verdade.mjs` (84, zero falhas). Fonte: saídas dos processos locais nesta tarefa, HEAD `c9a145adc470dd52ba3d78cec730cf09eae80ac5`. Nenhum teste foi editado. O único arquivo modificado após a bateria era este diário; não há alteração de produto. Os resultados não significam21 scripts testados, execução real de cobrança, D+1 enviado ou render em produção. Reaproveitar essa evidência enquanto a árvore de código e os contratos verificados não mudarem; não criar deploy para registrar somente o recebimento do handoff.

**FATO CONFIRMADO / ATUALIZAÇÃO DA BASE — 08/09, rodada das17h:** `origin/main` avançou pelos commits `8fa95fba` e `42d4b512`, recebidos na worktree por fast-forward, preservando o diário local. O diff acrescenta propagação validada de utm_campaign para intent_campaign nos CTAs de /ph (`components/PhLandingBeacon.tsx:26`) e uma asserção no guardião de PH; a preparação de anúncios permanece com seus responsáveis. As consultas arquivadas, fontes de preço, elegibilidade e produto P3 não mudaram; a leitura específica usa os mesmos contratos. A bateria de19h52 é evidência da base anterior, não comprova a nova asserção de PH: antes do próximo enfileiramento, validar a árvore atual conforme o gate vigente. Nenhum anúncio, gasto ou edição de /ph foi realizado por esta pista.

## 08/09 19h — pedido do fundador sobre pagamento

**EVIDÊNCIA DE PRODUÇÃO — corte22:05:17UTC:** função canônica VersãoB desde05h retornou8 ingressos,7 pessoas com banner mostrado,0 clique e0 checkout trial. São conjuntos independentes. Checkout geral separado:2 pessoas em tentativa/abertura; nenhuma falha externa do app registrada. Stripe MCP pediu reautenticação, portanto recusas bancárias seguem desconhecidas. Método e limites em docs/PAGAMENTO-RETORNO-2026-09-08.md.

**FATO CONFIRMADO / IMPLEMENTADO — nova entrega:** retorno de checkout preserva o trial aceito pelo servidor; cancelamento mantém taxa/prazo/renovação e não troca a oferta por Starter; CardEntryBanner mostra erro do launcher; botão e contador após compra confirmada levam à mesma ideia salva. Preços, grants, webhook e medição intactos. Comparação visual em docs/previews/PAGAMENTO-RETORNO-2026-09-08.html.

**TESTADO LOCALMENTE — 08/09:** typecheck verde;237 verificações nos11 comerciais,47 novas de retorno,100 pós-filme e84 handoff. Base de produto3eeae0d1; novos commits externos até3f4c6dd1/7cdb5fe5 só acrescentam documentação. A sprint desta tarefa ainda termina22hBRT; o marco da campanha Reddit às19h15 e sua avaliação48h pertencem ao placar/distribuição da casa, sem prorrogar esta rotina.
