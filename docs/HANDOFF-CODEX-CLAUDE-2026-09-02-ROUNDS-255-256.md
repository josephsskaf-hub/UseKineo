# HANDOFF CODEX → CLAUDE — RODADAS 255–256

**Data:** 2026-09-02

**Escopo:** B2C, convite da home “Make episode 2” (`ResumeStrip`) → clique → chegada exata ao Studio → segundo vídeo persistido → primeira Stripe Session recorrente → pagamento dessa mesma Session. Esta entrega acrescenta somente medição e contrato de auditoria; não muda interface, preço, crédito, Checkout, banco, render ou comunicação externa.

## Hipótese e decisão antes da edição

**HIPÓTESE:** mostrar o próprio primeiro vídeo na home e oferecer a continuação pode ajudar uma pessoa de um vídeo a chegar ao segundo uso e, depois, à assinatura. A hipótese ainda não possui amostra madura suficiente.

**DECISÃO:** não reeditar o `ResumeStrip`. Primeiro medir o caminho completo por pessoa externa e pela primeira Stripe Session recorrente exata, preservando a superfície até sete dias individuais de observação e pelo menos 20 pessoas maduras.

## Evidência anterior à implementação

**EVIDÊNCIA DE PRODUÇÃO — Supabase, consulta somente leitura em 2026-09-02:** desde a fronteira conservadora `2026-09-01T12:05:00Z`, foram observados 13 eventos `resume_strip_seen` de 8 pessoas externas; 2 eventos de clique pertenciam a 1 pessoa; 2 landings exatas pertenciam à mesma pessoa. Na reconstrução provisória estrita, 5 pessoas satisfaziam o contrato de primeiro vídeo/exposição, 1 clicou, 1 chegou ao Studio, 0 concluiu um segundo vídeo, 0 abriu uma Session recorrente posterior e 0 pagou. Esses números não são resultado causal e ainda não cumprem a maturidade individual de sete dias.

**DECISÃO DE GATE:** estado `collecting`; `uiChangeAuthorized:false` em qualquer resultado. Uma mudança visual só pode ser diagnosticada depois de 20 pessoas externas maduras e qualidade limpa. Um primeiro pagamento abre reconciliação, nunca atribuição automática.

## Contrato mensurável

- fronteira fixa: `2026-09-01T12:05:00.000Z`;
- janela consultada de 30 dias e observação individual fixa de 7 dias após a primeira exposição;
- pessoa externa criada antes da exposição, com exatamente um vídeo concluído anterior, URL persistida e proprietário inequívoco;
- primeiro `resume_strip_seen` controla a entrada; evento posterior não limpa primeiro evento inválido;
- path `/`, sessão de navegador não vazia, `episode: 2` numérico e `video_id` literal do primeiro vídeo;
- clique exige mesma pessoa, sessão e vídeo, em ordem temporal estrita;
- landing exige `/studio/create`, `source: landing_resume_strip`, `prompt_length` inteiro positivo e ordem estrita; empates contraditórios falham fechados;
- segundo vídeo exige registro concluído, URL, dono e relógio inequívocos depois da landing;
- primeira Stripe Session recorrente canônica depois da exposição é a âncora; uma Session paga posterior nunca substitui a primeira;
- tiers aceitos: `starter`, `basic`, `pro` e `autopilot`; billing `monthly` ou `annual`, com Autopilot somente mensal;
- pack inequívoco não é assinatura; start incompleto/contraditório, conflito pack × assinatura, pagamento sem vínculo, relógio financeiro ausente ou conflito de identidade bloqueiam qualidade;
- pagamento sem `user_id` só herda dono de um único start da mesma Session existente antes do pagamento;
- cutoff individual é imutável: evento posterior a sete dias não altera o resultado daquela pessoa;
- receita usa o ledger canônico, permanece em unidade minoritária e separada por moeda;
- saída é agregada e não contém e-mail, ID de pessoa, vídeo, browser session ou Stripe Session.

## Arquivos

- `scripts/resume-strip-to-subscription-report.mjs` — relatório puro e gate fail-closed;
- `scripts/measure-resume-strip-to-subscription.mjs` — coletor paginado, oito consultas, dedupe por ID e financeiro all-history;
- `scripts/test-resume-strip-to-subscription.mjs` — 149 verificações determinísticas, incluindo fixtures adversariais;

## Estado pré-publicação

**TESTADO LOCALMENTE:** 463/463 verificações verdes:

- `test-resume-strip-to-subscription.mjs`: 149/149;
- `test-subscription-revenue-ledger.mjs`: 31/31;
- `test-first-video-file-value-to-subscription.mjs`: 99/99;
- `test-first-file-later-day-retrieval.mjs`: 74/74;
- `test-post-expiry-new-session.mjs`: 73/73;
- `test-b2c-subscription-truth-report.mjs`: 43/43.

**TESTADO LOCALMENTE:** `node --check` nos três arquivos e `git -c core.whitespace=cr-at-eol diff --check` limpos. O typecheck reproduziu somente os três erros preexistentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`; nenhum pertence a esta entrega.

**AUDITORIA INDEPENDENTE:** GO, P0=0, P1=0, P2=0. Cinco versões intermediárias foram reprovadas. Os gates adicionados impedem que evento posterior limpe: landing contraditória; start Stripe inválido; conflito pack × assinatura; pagamento empatado com exposição; pagamento sem dono/relógio ligado a Session própria histórica, empatada ou posterior; e Session recorrente posterior paga.

**VALIDADO EM PRODUÇÃO — 2026-09-02 20:02 BRT:**

- commit de produto/documentação: `16114bdc918ab1c1f10797a1112a2aa72a72e19f`, publicado por fast-forward em `origin/main`;
- deploy Vercel: `dpl_H9T4eXS1RdYniXzHrmNo6BYEdXV4`, estado `READY`, `aliasError:null`, servindo `www.usekineo.com`;
- o metadata do deploy aponta para o mesmo SHA e para a mensagem `growth: measure resume strip to paid subscription`;
- nenhum evento, Checkout, pagamento, banco, crédito, render ou comunicação externa foi forçado;
- como esta entrega não altera runtime do produto, a primeira medição madura permanece futura por definição do gate individual de sete dias.

## Próxima rodada

Alternar para B2B. Não tocar novamente no `ResumeStrip` até o gate mínimo amadurecer. O próximo experimento deve atacar descoberta → proposta → Checkout → pagamento em superfície diferente, sem duplicar `agency-production-scope.txt` nem o answer router já publicados.
