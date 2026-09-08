# Pista 3 — pós-filme · bloco 08/09/2026

## Mandato do fundador — 08/09/2026, nesta tarefa

Autorização explícita: abandonar as worktrees anteriores; trabalhar em `C:/kineo-wt/p3`, criada detached de `origin/main` (`0044fccf`). Foco em `/go` e filme próprio depois da entrega. Publicar uma melhoria visual até 06:00 BRT (09:00 UTC), via `scripts/enfileirar.sh` e BAT. Se o enfileiramento falhar, não repetir; escrever `PRONTO PARA PUBLICAR: <sha>` no PEDIDOS para Claude publicar. Bloco fecha 12:10 BRT (15:10 UTC), sem renovação automática.

## EXECUTAR — uma oferta concreta ao lado do filme próprio

**FATO CONFIRMADO — base 0044fccf, 08/09/2026:** a Library abre `/history#v-ID` (`app/(dashboard)/library/LibraryClient.tsx:228`). A lightbox do filme próprio oferece download e Starter mensal (`app/(dashboard)/history/HistoryClient.tsx:2052`), sem a entrada Creator. `/go` mostra roteiro antes da geração (`app/go/[token]/page.tsx:188`); não representa um filme entregue.

**HIPÓTESE:** colocar benefício, entrada e renovação juntos no contexto do filme salvo facilita a decisão de continuar criando. A oferta compra créditos e novas gerações; não promete limpar o arquivo existente. Esta é uma lacuna da biblioteca, separada da oferta pós-render já publicada por Claude no Generate.

**SUGESTÃO EM EXECUÇÃO:** uma peça compartilhada com preço/créditos/duração derivados de `lib/checkoutPricing.ts`, checkout Creator existente e perfil elegível confirmado no servidor. Preservar download e plano. `/go` explica o mesmo próximo benefício sem inventar vínculo roteiro→filme. A página `/video` é wizard legado, não será confundida com filme próprio.

**MÉTRICA / HIPÓTESE:** pessoas externas da coorte ChatGPT com oferta visível → clique → checkout → pagamento confirmado, em ordem temporal e mesma Stripe Session. Campanha `pista3_next_film_v1` por superfície; evento de exposição do CTA visível por um segundo, aba visível; clique usa o launcher já existente. Anônimos, probes, compra direta e pós-filme separados. UA browser não prova pessoa.

**EVIDÊNCIA DE PRODUÇÃO HISTÓRICA:** fotografia anterior, corte 07/09 23:30 UTC, documentada em `42d62e90:docs/SPRINT-CHATGPT-2026-09-07.md`: 81 novos atribuídos, 71 geraram, 66 com arquivo verificado, 4 checkout, 0 payment_success. Só um checkout posterior ao arquivo. Não é medição atual nem funil linear.

**GATE / SUGESTÃO:** entregar uma variante, medir após exposição identificada e preservar enquanto amostra insuficiente. Parar/reverter se CTA mudar produto/valor, aparecer para perfil desconhecido/pago ou prejudicar download/reprodução. Não alterar pipeline, GenerateClient, Stripe, preço, crédito ou termos.

**ESTADO — 08/09/2026 04:00 UTC:** IMPLEMENTADO e TESTADO LOCALMENTE; aguardando publicação pelo caminho autorizado.

## Entrega e evidência local — 08/09/2026

**FATO CONFIRMADO / IMPLEMENTADO:** a lightbox do filme próprio reúne reprodução, download e convite Creator; o convite só monta para filme concluído com arquivo (`app/(dashboard)/history/HistoryClient.tsx:2094`). O perfil é consultado com o proprietário autenticado (`app/(dashboard)/history/page.tsx:23`) e a elegibilidade exige todos os campos conhecidos, plano gratuito e ausência de pagamento/assinatura (`lib/growth/postFilmCreatorOffer.ts:13`). `/history#v-ID` continua levando ao cartão; a oferta aparece quando a pessoa abre o filme.

**FATO CONFIRMADO / IMPLEMENTADO:** preço, duração, créditos e renovação vêm de `lib/checkoutPricing.ts`, por `lib/growth/postFilmCreatorOffer.ts:23`. O CTA conserva o checkout existente e acrescenta campanha por superfície (`lib/growth/postFilmCreatorOffer.ts:32`). O texto explicita que o arquivo salvo não perde a marca (`components/PostFilmCreatorOffer.tsx:110`). Em `/go`, a oferta permanece depois do roteiro e declara primeira compra; anônimos não são contados como perfis verificados (`app/go/[token]/page.tsx:244`).

**TESTADO LOCALMENTE — execução 08/09/2026:** typecheck sem emissão e sem incremental passou, executado pelo binário local do TypeScript (`node node_modules/typescript/bin/tsc --noEmit --incremental false`, equivalente ao comando do gate). `docs/qa/test-pista3-post-film.mjs`: 76 verificações passaram, incluindo perfil incompleto/pago, preço canônico mutável, JSX real das páginas, checkout compartilhado e exposição visível. Gates offline pertinentes: sharing safety 70; five improvements 621; locale 2.034; home curation 178; showcase 287; handoff verdade 84. Fonte dos números: saídas dos testes nesta tarefa, nesta data; não são métricas de clientes.

**TESTADO LOCALMENTE / COMPARAÇÃO VISUAL:** `docs/previews/PISTA3-POS-FILME-2026-09-08.html` é autocontido, antes/depois da base `0044fccf`, desktop e mobile nas duas superfícies. Usa JSX real com perfil/filme sintéticos e poster de demonstração já existente; não é captura de conta de cliente. As quatro imagens `PISTA3-FILME-DESKTOP.png`, `PISTA3-FILME-MOBILE.png`, `PISTA3-GO-DESKTOP.png`, `PISTA3-GO-MOBILE.png` foram inspecionadas. Nenhum dos oito quadros apresentou transbordamento horizontal na inspeção pelo navegador.

**QUESTÃO PENDENTE / DESCONHECIDO:** impacto em conversão, exposição humana e pagamento real depois desta variante. Os testes são offline; não foi feita cobrança, render ou autenticação de cliente. Revisão independente estática final não encontrou bloqueador. Publicação e baseline da campanha serão registradas separadamente, sem transformar teste em evidência de produção.

## Enfileiramento único e passagem para Claude — 08/09/2026 04:02 UTC

**IMPLEMENTADO / TESTADO LOCALMENTE, NÃO PUBLICADO:** commit de produto `2ba66950da0ca850548c784b93dc84bc8f30774e`, pai `0044fccf`, preservado pela ref `codex/pista3-pos-filme-2026-09-08`. A tentativa única autorizada de `scripts/enfileirar.sh` saiu 1, indicando fila 526 / meus novos 626 e conflitos em GenerateClient/instructionPasteNotice, fora do commit desta entrega. Fonte: saída do comando nesta tarefa, 08/09 ~04:00 UTC. O rebase foi abortado e o HEAD revisado foi restaurado; a fila manteve `59f6b1cf`. Sem nova tentativa e sem BAT sobre a fila antiga. Pedido exato `PRONTO PARA PUBLICAR: 2ba66950da0ca850548c784b93dc84bc8f30774e` no PEDIDOS conforme instrução do fundador; Claude publica.

**EVIDÊNCIA DE PRODUÇÃO / BASELINE — corte 08/09/2026 03:59:10 UTC:** SELECT em Supabase, campanha `pista3_next_film_v1` e os dois sufixos, encontrou zero linhas de exposição, clique, checkout e payment_success desde 03/09 16:00 UTC, antes mesmo das exclusões. Também zero pessoas identificadas e linhas anônimas; datas primeira/última NULL. SQL exata em `docs/queries/PISTA-3-POS-FILME-2026-09-08.sql`. É baseline anterior à publicação, não taxa nem prova de impacto. Consultas futuras devem ler juntos `metadata.is_bot` e `metadata.client_class`, além das exclusões históricas; essa omissão da consulta histórica não altera o zero bruto observado.

**QUESTÃO PENDENTE / DESCONHECIDO:** SHA/deploy publicado por Claude e exposição externa posterior. A rotina continua com o mesmo critério por pessoa e o mesmo encerramento, sem repetir este enfileiramento.

## Compatibilidade com a entrada vigente — 08/09/2026 04:45 UTC

**FATO CONFIRMADO / CONTRADIÇÃO:** `origin/main` avançou para `d15a19a3`; o commit `89a65eb9` define `CARD_ENTRY_ONLY = true` (`89a65eb9:lib/entryPolicy.ts:28`) e não concede o trial gratuito (`89a65eb9:lib/reverseTrial.ts:818`). O texto de /go ainda dizia “Free to try — no card” e nosso componente oferecia “try your script free above”. As duas frases ficaram incompatíveis com o código da entrada. A entrega `2ba66950` ainda não está na main e não deve ser publicada isoladamente com essa copy antiga.

**IMPLEMENTADO / TESTADO LOCALMENTE:** corrigida somente essa promessa nas superfícies já autorizadas. /go agora explica que a conta abre o roteiro no Studio e o trial Creator requer método de pagamento (`app/go/[token]/page.tsx:228`); o rodapé da oferta conserva primeira compra, sem sugerir geração grátis (`components/PostFilmCreatorOffer.tsx:114`). Sem alteração de oferta, valor, elegibilidade, destino, evento ou geração. Revisão independente confirmou que `card_required` muda `trial_status` e é compatível com nosso predicado já existente; não houve motivo para ampliar o escopo.

**TESTADO LOCALMENTE — 08/09/2026 ~04:44 UTC:** typecheck sem emissão/incremental passou; teste próprio agora tem 80 verificações, incluindo ausência da promessa gratuita em EN/ES/HI; handoff verdade manteve 84 sem falha. Fonte: saídas da execução nesta tarefa. Preview HTML e as duas imagens de /go foram regenerados e inspecionados; o antes permanece a base histórica `0044fccf`, não a nova política. Os testes anteriores das superfícies não alteradas continuam sendo os registrados na primeira entrega.

**ESTADO:** mesma variante, correção de compatibilidade antes de publicar. Nenhuma nova tentativa de enfileiramento, nenhum BAT/push. O pedido para Claude será atualizado com a correção obrigatória junto da entrega original; não tratar a ausência de publicação como resultado de conversão.

## Fonte de preço atual e preview revalidado — 08/09/2026 05:18 UTC

**FATO CONFIRMADO:** a main observada em 05:12:35 UTC era `74120088`, ainda sem nossos componentes. `98c633ac:lib/checkoutPricing.ts:100` mudou Creator mensal para USD 1.900 centavos; a entrada segue 100 centavos/7 dias/80 créditos (`98c633ac:lib/checkoutPricing.ts:335`, `:356`, `:357`). Os 150 créditos do Creator mensal não são o grant de 80 do trial. A copy da política passou a indicar Kineo 1/Seedance (`98c633ac:lib/entryPolicy.ts:53`).

**IMPLEMENTADO / TESTADO LOCALMENTE:** o código de produto de Pista 3 não precisou mudar: renovação já deriva de `TIER_PRICES.basic.usd` e o grant já deriva de `CARD_TRIAL_GRANT_CREDITS`. A expectativa numérica dos testes deixou de congelar o preço antigo e passou a consultar as constantes canônicas independentemente do helper. A mutação da taxa de entrada continua sendo exercitada. O harness recebeu opção somente de leitura `--pricing-ref=98c633ac`, que executa nosso JSX com a fonte de preços daquele commit e preserva a fonte histórica no antes.

**TESTADO LOCALMENTE — 08/09/2026:** 80 verificações passaram tanto com a base local quanto com `node docs/qa/test-pista3-post-film.mjs --pricing-ref=98c633ac`. A geração `node docs/qa/pista3-fixtures.mjs --preview --pricing-ref=98c633ac` produziu o HTML atual; quatro PNGs foram regenerados e inspecionados. O navegador confirmou $1.00/$19.00 na oferta e $9.00 no Starter, em desktop/mobile, sem transbordamento horizontal nos oito quadros. Fonte dos números: saídas de testes/DOM e capturas desta tarefa; são fixtures, não clientes nem validação de deploy. O antes mantém os preços de `0044fccf`; o HTML informa as duas fontes.

**ESTADO:** produto continua o conjunto original com a correção `f69895a6`; este checkpoint só atualiza QA, preview e registro. Revisão independente não encontrou incompatibilidade adicional de benefício/elegibilidade com a nova política. Publicação continua pendente e a proibição de repetir enfileiramento continua válida.

## Publicação antes do prazo — checkpoint de 08/09/2026 08:12:50 UTC

**FATO CONFIRMADO / PUBLICAÇÃO PENDENTE:** após `git fetch origin`, a main estava em `7427bbc03304ddd2b36135074dea9729420deac3`. O commit corrigido `f69895a6` não é ancestral e `git ls-tree origin/main` não contém `components/PostFilmCreatorOffer.tsx` nem `lib/growth/postFilmCreatorOffer.ts`. Não há resposta pertinente nova no PEDIDOS remoto desde o checkpoint anterior. Fonte: comandos somente de leitura nesta tarefa, nesta data e hora. Nenhuma alteração de produto, retry, BAT ou push foi feita neste checkpoint.

**QUESTÃO PENDENTE / DESCONHECIDO:** confirmação de recebimento pelo Claude e publicação/deploy do pacote `69472eff259e07ec662ada13da721c3f25f88d63`. O prazo de entrega visível é 09:00 UTC (06:00 BRT); o conjunto está revisado, mas a publicação depende do publicador indicado pelo fundador. O Board recebeu novamente o ponto de execução necessário antes do prazo; isso não é confirmação de recebimento pelo Claude. Sem publicação confirmada, não há efeito da variante a atribuir nem motivo para abrir outra frente.

## Prazo das 06h — verificação de 08/09/2026 09:11:42 UTC

**ESTADO / PRAZO NÃO CUMPRIDO:** esta tarefa não entregou a variante visível em produção até 06:00 BRT. Após o prazo, `origin/main` estava em `309917e8056ecb77893fad28424bebb5db8006a5`, ainda sem `components/PostFilmCreatorOffer.tsx` e `lib/growth/postFilmCreatorOffer.ts`, e sem o commit corrigido como ancestral. Fonte: `git fetch`, `git log`, `git ls-tree` e `git merge-base` executados nesta tarefa às 09:11:42 UTC. Não há confirmação do publicador ou de deploy desta entrega.

**FATO CONFIRMADO / IMPLEMENTADO E TESTADO LOCALMENTE:** permanece pronto o pacote `69472eff259e07ec662ada13da721c3f25f88d63`, faixa completa `0044fccf..69472eff`, com a correção de entrada paga e QA de renovação a $19. A única tentativa de enfileiramento falhou conforme registro anterior; o fallback no PEDIDOS e os repasses ao Board não se converteram em publicação confirmada. Não houve retry, BAT ou push desta tarefa. Não atribuir receita, conversão ou fracasso comercial a uma variante sem publicação verificada.

**PRÓXIMO PASSO / QUESTÃO PENDENTE:** continuar até o encerramento já autorizado de 12:10 BRT (15:10 UTC), verificando eventual publicação pelo Claude e só então exposição/pagamento por pessoa. Sem nova variante ou nova tentativa de enfileiramento. O prazo perdido fica registrado; o bloco não será estendido automaticamente para compensá-lo.

## Repasse incompleto identificado — 08/09/2026 13:10–13:22 UTC

**FATO CONFIRMADO / FALHA DE COORDENAÇÃO:** o PEDIDOS de `origin/main` trouxe uma cobrança dirigida ao Codex, citando a ordem do fundador de 08/09 às 09:40 BRT e a ausência da entrega na main. O pedido `PRONTO PARA PUBLICAR` desta tarefa foi escrito somente em `C:/kineo-wt/p3/docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`; não chegou ao PEDIDOS remoto que o Claude lê. Os avisos ao Board não confirmam recebimento pelo Claude. A main observada neste checkpoint, `6db8ca2f35dfb98caa1647a70aa1e679ccb3fe09`, continua sem os dois novos arquivos de produto. Fonte: leitura de `origin/main:docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` e inspeção Git nesta tarefa, nesta data. O repasse local foi insuficiente; não atribuir isso a uma fila bloqueada.

**TESTADO LOCALMENTE — 08/09/2026 13:14:58 UTC:** preparado um patch binário consolidado da faixa `0044fccf..69472eff`, com os cinco arquivos de produto, QA, previews, diário e SQL. `git apply --cached --check --binary` passou contra `6db8ca2f` em índice temporário isolado, sem modificar a main ou esta working tree. Revisão independente confirmou os 14 arquivos previstos e a ausência de alterações em GenerateClient, Stripe, compose, preços canônicos e PEDIDOS. O teste de aplicação não equivale a build, execução integrada ou deploy.

**ARTEFATO LOCAL / IMPLEMENTADO:** `C:/kineo-wt/p3/docs/handoff/PISTA3-PARA-CLAUDE-2026-09-08.zip` contém `PISTA3-APLICAR.patch`, `LEIA-ME.md` e `RESPOSTA-PARA-PEDIDOS.md`. Os bytes podem ser anexados à sessão do publicador sem depender dos objetos Git locais. SHA-256 do ZIP: `D3F7C71D2B10BF091B13F54CC9538FEC490217ABB5C90A4019D7D91F3E08C6D8`. O patch preserva o PEDIDOS remoto. Os artefatos de transferência permanecem locais, fora dos commits de produto, para não duplicar o código no repositório.

**QUESTÃO PENDENTE / DESCONHECIDO:** não há uma tarefa Claude conectada disponível. Foi solicitada ao fundador a indicação do caminho ou canal compartilhado que o Claude consegue ler. Nenhuma confirmação de recebimento ou publicação foi obtida. O pacote pronto permanece `69472eff259e07ec662ada13da721c3f25f88d63`; não houve nova tentativa de enfileiramento, BAT ou push. O encerramento de 15:10 UTC permanece inalterado.

## Alinhamento aprovado à Versão B — retomada de 08/09/2026 14:49 UTC

**DECISÃO DO FUNDADOR — retransmitida pelo Board às 11:48 BRT:** alinhar plano, diário, medição e pacote pendente aos novos clientes da Versão B, sem ampliar escopo ou renovar o ciclo. Registrado em `docs/HANDOFF-PISTA3-VERSAO-B-2026-09-08.md`; o brief anterior foi marcado como histórico e aponta para esse handoff vigente.

**FATO CONFIRMADO / RECOMENDAÇÃO:** main revisada `852f4ef65c45c7933b3595eeb578480954d5db08`. As superfícies /go e History e seus contratos de telemetry/interface language permanecem iguais à base do pacote; não há duplicata desta oferta nessas superfícies. Manter o produto da P3 como primeira compra elegível: novo visitante ainda não pagou e gratuito histórico com filme são públicos distintos; cliente do trial pago não recebe a oferta. Não recomendar o pacote como ativação/continuidade/renovação universal. Preços e grants atuais conferidos em `lib/checkoutPricing.ts`, motores em `lib/enginePlanGate.ts`; nenhuma mudança de produto foi necessária.

**TESTADO LOCALMENTE — 08/09/2026:** QA ampliada para os públicos e estados transitórios pertinentes. São 95 verificações aprovadas tanto com os preços de `852f4ef6` quanto com a fonte local; comandos e limites no handoff. Isso não é teste integrado da main nem deploy. Não houve edição de JSX, nova variante visual, mudança de preço, Stripe, pipeline ou painel. Previews já revisados continuam representando o mesmo produto.

**FATO CONFIRMADO / MEDIÇÃO RECONCILIADA:** a revisão somente de leitura do contrato atual separou entrada `payment_success.card_trial=true`, checkout de assinatura e fatura de conversão. Registrados no handoff os formatos reais, dedupe por Stripe Session/fatura e o limite de `trial_conversion=false`, que sozinho não prova renovação. A coorte gratuita histórica não será comparada como um mesmo funil com a entrada paga da Versão B. A SQL histórica permanece intacta e identificada como histórica. Nenhum SELECT novo foi executado nem resultado de clientes foi atribuído à variante sem deploy.

**QUESTÃO PENDENTE / GATE DO PUBLICADOR:** receber os bytes, aplicar na main atual, rodar checks integrados e publicar com prova de SHA/deploy. O repasse local continua sem confirmação do Claude. O pacote de transferência será atualizado com a QA e o handoff vigentes; o conjunto anterior `69472eff` segue como origem do produto, não como solução universal dos novos clientes. Sem retry, BAT/push ou extensão além de 15:10 UTC.

## Correção pública para preservar o roteiro — 08/09/2026, revisão às 14:58 UTC

**DECISÃO DO FUNDADOR / ESCOPO:** novo handoff do Board reafirmou /go e páginas públicas para novos clientes, sem ampliar History nem tocar cobrança, geração ou admin. Conciliado: History mantém somente a alteração anterior; a correção nova é no caminho público do roteiro. Lidos `docs/AUDITORIA-SISTEMA-DE-COMPRA-2026-09-08.md`, `docs/ADMIN-FONTE-UNICA-2026-09-08.md` e fim do PEDIDOS de `origin/main`, agora `ebe343a7`. Não repetir como resultado próprio a amostra pequena informada pelo fundador nem inferir rejeição ao preço antes do fix do modal.

**FATO CONFIRMADO / IMPLEMENTADO:** a revisão encontrou que o CTA público antigo abria checkout sem token e poderia retomar rascunho anterior; não havia helper exportado que preservasse integralmente o roteiro nesse atalho. Corrigido em /go e no ramo público do componente: âncora com `goHref` para o handoff já existente, rótulo “Open this script in Studio”, preço antecipado e escolha do trial no Studio. A oferta oculta sem handoffHref. Sem escrita de rascunho, checkout direto ou render nessa âncora. Fontes e limites estão no handoff vigente. Não publicar `69472eff` isoladamente como solução que preserva a ideia na compra direta.

**TESTADO LOCALMENTE:** 100 verificações próprias com preço de `852f4ef6`, 84 do handoff verdade, typecheck sem emissão/incremental aprovado; revisão independente sem bloqueador na correção. Antes/depois /go desktop/mobile regenerado e inspecionado. A âncora observada contém o token sintético e abre a rota existente. A continuidade até o Studio é comprovada pelo contrato; pagamento real e retomada posterior continuam sem validação desta tarefa.

**ESTADO / PUBLICAÇÃO:** candidato atualizado substitui o pacote de compra direta anterior. Será entregue com patch e instruções atuais; transmissão ao Claude, recebimento, merge e deploy permanecem estados distintos e pendentes, sem nova tentativa de enfileirar. Encerramento mantido às 15:10 UTC.
