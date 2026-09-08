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
