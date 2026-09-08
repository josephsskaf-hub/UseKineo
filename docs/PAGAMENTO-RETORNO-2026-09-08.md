# Pagamento: preservar a oferta e a ideia na retomada

**FATO CONFIRMADO / ESCOPO — 08/09/2026:** pedido direto do fundador nesta tarefa para melhorar o sistema de pagamento, dentro da sprint até22h BRT. Base examinada `3eeae0d1`, worktree do clone vivo `C:/kineo-wt/p3-novo`. Esta entrega corrige retorno e mensagem de erro; mantém preços, concessão de créditos, webhook, política de elegibilidade e medição por pessoa.

**EVIDÊNCIA DE PRODUÇÃO — 08/09, janela [05:00:00,22:05:17) UTC:** a função original `funilVersaoB` foi transpilada e executada em memória sobre uma SELECT, com a lista externa do reader canônico. Ingresso8, banner mostrado7, clique0, checkout trial0, entrada trial paga0, autostart0, conversão por fatura0, paywall0. São conjuntos independentes: não representam uma sequência reconciliada nem uma taxa7/8. Os helpers reais `isTrialEntryEvent` e `isNewSubscriberEvent` também retornaram zero pessoas nessa janela.

**FATO CONFIRMADO / FONTES:** `lib/admin/versaoBFunnel.ts:8` fixa o marco, `:24` implementa a função e `:33` mantém os conjuntos; `app/admin/overview/page.tsx:181` e `lib/internalAccounts.ts:51` definem a exclusão interna. Classificação financeira complementar em `app/api/admin/_shared/mrr.ts:248` e `:257`.

**EVIDÊNCIA DE PRODUÇÃO / RECORTE SEPARADO — mesma janela:** checkout geral teve2 eventos/2 pessoas externas em `checkout_attempted` e2/2 em `checkout_started`; zero eventos/pessoas externas em `checkout_failed` e `checkout_auth_required`. Os12 eventos anônimos de tentativa e12 de autenticação exigida ficaram fora da contagem de pessoas. Perfis para classificação observados às22:08:47.583841UTC, portanto depois do corte dos eventos. Dados individuais permaneceram apenas na memória da ferramenta.

**QUESTÃO PENDENTE / DESCONHECIDO — 08/09:** a conexão Stripe MCP devolveu reautenticação necessária (`oauth_token_invalid_grant`) ao listar contas. Nenhuma conta ou cobrança foi consultada. Ausência de `checkout_failed` do app (`app/api/stripe/checkout/route.ts:894`) não prova ausência de recusas bancárias. Estes dados não sustentam atribuir a falta de assinaturas ao processador.

**FATO CONFIRMADO / IMPLEMENTADO:**

- `app/api/stripe/checkout/route.ts:1475`: o retorno de uma nova sessão preserva `trial=1` somente quando `wantsTrial && !isAnnual` já foi aceito pelo servidor. Antes, cancelar descartava o trial.
- `app/checkout/cancelled/page.tsx:94`: apenas Creator mensal com marcador explícito exibe o trial; o retry conserva o marcador e os demais parâmetros. Taxa, dias, créditos e mensalidade derivam de `lib/checkoutPricing.ts`. O Starter deixa de ser apresentado como entrada mais barata que o trial; respostas sobre preço e revisão da ideia também preservam essa condição.
- `components/CardEntryBanner.tsx:143`: falha do launcher aparece junto ao botão, com `role="alert"`; a trava de clique continua igual.
- `app/checkout/success/page.tsx:216`: botão imediato e contador compartilham o destino após confirmação autoritativa do acesso. A presença de um rascunho encaminha para a retomada existente; o Studio continua validando prazo, créditos e disparo. Autopilot mantém seu destino.

**TESTADO LOCALMENTE — 08/09:** typecheck sem incremental verde;11 guardiões comerciais com237 verificações; QA pós-filme100; handoff84; nova regressão de retorno47. O teste novo executa o JSX real com estado sintético, bloqueia rede e reproduz a perda do marcador na base anterior. Cobre trial/inválidos/anual/intro/promo/campanha, preço canônico, objeções, erro visível e equivalência entre botão/contador com os gates de acesso. Não cria conta, sessão de pagamento ou filme.

**TESTADO LOCALMENTE / COMPARAÇÃO VISUAL:** `docs/previews/PAGAMENTO-RETORNO-2026-09-08.html` é autocontido, com CSS inline e JSX real em estados sintéticos. Há pares desktop/mobile para retorno, objeção ao preço, revisão da ideia, erro de abertura e compra confirmada com ideia salva. Capturas `PAGAMENTO-desktop-*.png` e `PAGAMENTO-mobile-*.png` revisadas, sem cortes ou sobreposição; as20 vistas embutidas não apresentaram overflow horizontal. Revisão independente do código não encontrou bloqueador.

**FATO CONFIRMADO / LIMITES:** sessões abertas antes desta entrega continuam sem marcador; não inferimos trial por tier/campanha. A regra existente `has_paid` pode retirar elegibilidade e abrir o checkout pelo preço mensal, sempre antes da confirmação pelo comprador. O retorno informa primeira compra e nova verificação de elegibilidade. Nenhuma cobrança real ou melhora de conversão foi comprovada por esta entrega.

**SUGESTÃO / PRÓXIMA DECISÃO:** publicar as correções e marcar o horário real do deploy para avaliar retomadas. Reconectar Stripe para distinguir abandono e recusas. A próxima intervenção comercial deve responder à falta de cliques na oferta com evidência suficiente da superfície; não trocar processador ou preço com base nos zeros atuais.

**TESTADO LOCALMENTE / CONTRATOS ADJACENTES — 08/09:** sharing-safety70/70, five-improvements628/628, checkout-success-entitlement66/66, checkout-setup-failure-return109/109 e checkout-cancel-deliver-first39/39. Todos inspecionados antes da execução; mocks/ambiente vazio e rede bloqueada, com git show somente leitura nos testes que comparam fontes. Dois guardiões textuais foram adaptados ao diff: success permite whitespace variável no mesmo gate; cancel exige a nova proteção!cardTrial além da condição anterior. Não foi afrouxada uma regra de acesso para fazer teste passar.
