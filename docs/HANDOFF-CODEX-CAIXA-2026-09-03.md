# HANDOFF CODEX — CAIXA

## ROUND 3 — K13 · prova do filme próprio na retomada do checkout

**Data:** 2026-09-03 23:36 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-resume-own-film-r3b`
**SHA em produção:** `2c6c94929db20ff17ea3adcc7477ff39dcde15f7`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-03 23:28–23:36 BRT

- Marco canônico `2026-09-03 16:00 UTC`: 16 cadastros externos, 11 pessoas
  externas com filme concluído, 1 pessoa em checkout de desejo, 1 em checkout
  sem filme, 0 assinaturas e 0 pessoas com falha sem filme.
- Vigia das últimas 2 horas: 0 pessoas externas com checkout aberto sem
  pagamento. Não houve trilha individual a registrar nesta rodada.
- Linha de base de 30 dias, pessoas externas: 89 viram o banner de retomada,
  76 fecharam, 9 clicaram e 8 tiveram uma impressão humana da escolha.
- O último clique do banner antigo ocorreu em 2026-08-26 03:12:25 UTC.
- `checkout_resume_film_proof_loaded` parte de 0 pessoas e 0 eventos.

### FATO CONFIRMADO — o que doía

O banner antigo lembrava uma sessão abstrata e repetia preço/plano. Ele não
mostrava o valor que a própria pessoa já recebeu, apesar de `/api/videos` já
entregar os filmes autenticados da conta. K14 já existe em
`app/checkout/cancelled/page.tsx`; não foi reconstruída. A prova visual dentro
do Stripe permanece genérica por privacidade; nenhum filme de cliente foi
enviado ao Stripe.

### IMPLEMENTADO

- `lib/growth/checkoutResumeFilm.ts`: seleciona apenas o filme concluído mais
  recente, aceita somente URL HTTPS, prefere a versão melhorada e higieniza o
  título. Telemetria contém apenas campos fechados; nunca título, ID ou URL.
- `components/useCheckoutResumeFilm.ts`: lê `/api/videos` somente quando o
  banner está ativo, com sessão da mesma origem, sem cache e com abort.
- `components/CheckoutResumeBanner.tsx`: mostra o filme da própria pessoa,
  título e CTA “Finish secure checkout”; a retomada continua levando ao mesmo
  checkout já salvo.
- `components/CheckoutResumeBanner.module.css`: preserva leitura e toque no
  mobile; o CTA ganha linha própria abaixo de 520 px.
- Variante comercial: `resume_own_film_v2`.
- Denominador novo: `checkout_resume_film_proof_loaded` somente após o vídeo
  realmente carregar.

### TESTADO LOCALMENTE

- `test-checkout-resume-own-film.mjs` → 35/35.
- `test-checkout-resume-human-view.mjs` → 111/111.
- `test-pricing-saved-checkout.mjs` → 47/47.
- TypeScript → exit 0.
- Guardião local → 12/12.
- Whitespace → limpo.
- Comparação visual desktop/mobile:
  `docs/previews/CAIXA-CHECKOUT-RESUME-OWN-FILM-2026-09-03.html`.

### VALIDADO EM PRODUÇÃO — 2026-09-03 23:36 BRT

- `origin/main` aponta para o SHA completo acima.
- Vercel `dpl_82VK7THU5YtoGpNL2UXaSVozrxCF` → READY, aliasado em
  `www.usekineo.com`, sem erro de alias.
- O domínio canônico respondeu 200 após o deploy.
- GitHub Guardião #44 → success: suíte de testes e TypeScript verdes.

### COMO MEDIR / GATE DE PARADA

Unidade = pessoa externa. Cruzar
`checkout_resume_film_proof_loaded` → `checkout_resume_banner_clicked` →
`checkout_started` → `checkout_success_viewed` na mesma pessoa em 24 horas.
Não reabrir esta superfície antes de 10 pessoas com prova carregada e 24 horas
completas, o que vier por último. Se carregamento ficar abaixo de 80% das
impressões humanas, investigar mídia; se o clique não superar a linha de base,
preservar por uma janela e testar outra etapa, sem empilhar nova copy.

### RISCO / REVERSIBILIDADE

Risco baixo: a API e o destino do checkout já existiam. Falha de rede mantém o
banner genérico; nenhuma compra é bloqueada. A variante pode ser revertida em
um commit sem alterar preço, crédito, Stripe, banco ou pipeline de render.

### PRÓXIMA JOGADA

K17, fora desta superfície: traduzir créditos em quantidade de filmes nas
superfícies de venda que ainda expõem apenas a abstração interna, usando as
fontes canônicas existentes e sem mudar preço.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

Quem abandonou o checkout agora reencontra o próprio filme ao lado do botão de
pagar. A retomada deixou de pedir que a pessoa se lembre do valor: ela mostra o
valor entregue, sem expor conteúdo ao Stripe e sem mudar a oferta.
---

## ROUND 4 — K17 · filmes concluídos antes de créditos

**Data:** 2026-09-04 09:56 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-films-not-credits-r4b`
**SHA funcional em produção:** `8507e5297117c8eb4b0ad45943dfb592d76e6dab`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 09:41 BRT

- Marco canônico `2026-09-03 16:00 UTC`: 33 cadastros externos, 20 pessoas
  externas com filme concluído, 1 pessoa em checkout de desejo, 1 em checkout
  sem filme, 0 assinaturas e 0 pessoas com falha sem filme.
- Vigia das últimas 2 horas: 0 pessoas externas com checkout aberto sem
  pagamento. Não houve trilha individual a registrar nesta rodada.
- O K13 ainda não tem amostra: 0 pessoas e 0 eventos
  `checkout_resume_film_proof_loaded` desde a fronteira do deploy. A superfície
  ficou congelada até o gate mínimo de 10 pessoas + 24 horas.

### FATO CONFIRMADO — o que doía

`WelcomeOfferModal` mostrava apenas “90/180 credits per month”. O exit intent
do pricing abria com “Fresh credits” e liderava os dois cards com 40/90
`credits/mo`. A pessoa precisava conhecer a unidade interna antes de entender
o que comprava. `/pricing` e Plan Fit já calculavam filmes; não foram
reconstruídos. O `PostVideoPaywall` está órfão, e as ocorrências dentro de
`GenerateClient`/Account pertencem à pista Claude; não foram tocadas.

### IMPLEMENTADO

- `lib/growth/planFilmLanguage.ts`: contrato versionado
  `plan_film_language_v1`, com validação de inteiros e créditos secundários.
- Welcome Creator/Studio: “3/7 Seedance films / month” primeiro; 90/180 créditos
  continuam visíveis depois.
- Exit intent Starter/Creator: “8 Kineo 1 films” e “3 Seedance films” primeiro;
  40/90 créditos continuam visíveis depois.
- Todos os números vêm de `videosPerMonth()` + `TIER_CREDITS`; preço,
  grant, motor, oferta, CTA e destino do checkout não mudaram.
- Eventos existentes recebem `capacity_unit_version`; nenhum evento novo,
  dado livre ou identificador foi criado.

### TESTADO LOCALMENTE

- `test-plan-film-language.mjs` → 32/32.
- `test-money-truth-contract.mjs` → 313/313.
- `test-public-promo-truth.mjs` → 68/68.
- `test-welcome-offer-frequency.mjs` → 34/34.
- `test-exit-intent-variant-probe.mjs` → 110/110.
- `test-studio-mobile-2026-08-29.mjs` → 8/8.
- TypeScript → exit 0; Guardião local → 12/12; whitespace → limpo.
- Comparação visual desktop/mobile:
  `docs/previews/CAIXA-PLAN-FILM-LANGUAGE-2026-09-04.html`.

Uma asserção antiga foi corrigida: o money-truth exigia o nome aposentado
`CREATOR_AI_FILMS`. Agora exige `videosPerMonth` + `TIER_CREDITS`; o teste
novo executa e trava os resultados atuais 8/3/7.

### VALIDADO EM PRODUÇÃO — 2026-09-04 09:56 BRT

- `origin/main` aponta para o SHA funcional completo acima.
- Vercel `dpl_FsFYfoRFTwB58CS8TG7co2UL6iBi` → READY, aliasado em
  `www.usekineo.com`, sem erro de alias.
- `https://www.usekineo.com/pricing` respondeu 200.
- Os chunks públicos contêm `plan_film_language_v1`, a frase film-first e
  `Kineo 1 film`.
- GitHub Guardião run `33875113732` → success.

### COMO MEDIR / GATE DE PARADA

Unidade = pessoa externa. Para Welcome, medir
`welcome_offer_viewed` → `welcome_offer_checkout_clicked` →
`checkout_success_viewed` na mesma pessoa em 24 horas. Para exit intent,
medir `exit_intent_shown` → clique do tier → sucesso na mesma janela, sempre
filtrando `capacity_unit_version = plan_film_language_v1`.
Não reeditar cada superfície antes de 10 pessoas externas expostas e 24 horas
completas, o que vier por último. Falta de amostra congela a variante; não
autoriza empilhar nova copy.

### RISCO / REVERSIBILIDADE

Risco baixo e reversível em um commit. A capacidade é uma divisão exata sobre
o filme de referência de 60s. O crédito continua visível para transparência.
Mudança futura em grant ou custo quebra o teste atual e exige revisão consciente.

### PRÓXIMA JOGADA

K16: auditar o pós-primeiro-filme e separar “episódio 2” de “plano para os
próximos filmes”, sem tocar nas superfícies K13/K17 antes de seus gates.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

Duas caixas decisivas deixaram de vender a unidade interna “crédito” como
manchete. Agora dizem quantos filmes o saldo atual produz, mantêm os créditos
logo depois para transparência e levam ao mesmo checkout pelo mesmo preço.
---

## ROUND 5 — K16 · auditoria por número de filmes, sem empilhar variante

**Data:** 2026-09-04 10:08 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-next-films-r5`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:08 BRT

- Marco canônico `2026-09-03 16:00 UTC`: 34 cadastros externos, 21 pessoas
  externas com filme concluído, 1 pessoa em checkout de desejo, 2 em checkout
  sem filme, 0 assinaturas e 0 pessoas com falha sem filme.
- Vigia das últimas 2 horas: 1 pessoa externa (`a8c8d6c5`) abriu o Pro e não
  pagou. O classificador canônico gravou `activation_defect`: origem direta,
  0 filmes, 25 créditos intactos e nenhum roteiro pronto. Depois do checkout,
  ela abriu e selecionou o quickstart do ChatGPT e chegou ao Studio. Não houve
  erro de geração na trilha observada.
- `history_first_video_human_view_v2`: 10 pessoas externas realmente viram
  o card de primeiro filme; 1 clicou no CTA de episódio, 6 concluíram outro
  filme em até 24h da exposição, 0 clicaram no Starter e 0 pagaram nessa janela.
  Apenas 4 exposições já completaram 24h: nelas, 1 clique de episódio, 2 novos
  filmes, 0 clique de plano e 0 pagamento.
- `push28_repeat_creator` (oferta após repetição): 7 pessoas externas em 7
  dias, 0 clique e 0 pagamento; só 5 já completaram 24h.
- `trial_repeat_before_checkout_v1`: 5 pessoas externas expostas, 0 clique
  e 1 novo filme em até 24h.

### FATO CONFIRMADO — o que existe no produto

- O K16 já governa as duas superfícies vivas. Com 1 filme, o histórico coloca
  “Build Episode 2” antes do Starter; com 2+ filmes, o plano vira a ação
  principal. O resultado do gerador também oferece outro episódio enquanto o
  trial ainda comporta um filme.
- O clique principal do primeiro estágio é `series_continue_clicked`, não
  `history_first_video_offer_clicked`. Medir somente o segundo produzia a
  conclusão falsa “10 viram e ninguém agiu”.
- `components/PostVideoPaywall.tsx` continua órfão; não foi editado.
- As superfícies vivas estão em arquivos da pista Claude
  (`GenerateClient.tsx` e `HistoryClient.tsx`); não foram tocadas.

### DECISÃO REVERSÍVEL / GATE

Nenhuma variante nova foi empilhada. O estágio de primeiro filme mostra sinal
de repetição, mas só 4 pessoas completaram a janela de 24h. A oferta de 2+
filmes tem apenas 5 pessoas maduras. As duas ficam congeladas até 10 pessoas
externas com 24h completas por estágio. O próximo diagnóstico deve separar
continuação por CTA de continuação por navegação alternativa, porque 5 dos 6
novos filmes não vieram do clique rastreado.

### IMPLEMENTADO

Nenhuma alteração de produto. Esta foi uma rodada de diagnóstico mensurável:
corrigiu a métrica de K16, impediu retrabalho em componente órfão e preservou
a divisão de pistas.

### COMO MEDIR

Para 1 filme: `history_first_video_offer_viewed` com versão
`history_first_video_human_view_v2` → `series_continue_clicked` com source
`history_milestone` → novo `videos.status='completed'` → pagamento, tudo
por pessoa em 24h. Para 2+ filmes: `history_repeat_offer_viewed` →
`history_repeat_offer_clicked` → pagamento na mesma janela.

### RISCO

Risco zero de produto: somente SELECT e documentação. A leitura preliminar de
6/10 não é tratada como taxa final porque 6 exposições ainda não maturaram 24h.

### PRÓXIMA JOGADA

Atender o pedido aberto do Claude sobre saldo insuficiente nas superfícies
próprias de CAIXA: inventariar as seis redações, localizar quais caixas vivas
ainda terminam em extrato sem ação e propor uma saída já existente, sem mudar
preço, crédito, motor, oferta ou arquivo compartilhado.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

O funil de episódio 2 já existe e há sinal de uso: 6 de 10 pessoas fizeram
outro filme depois de ver o card. O dado ainda não prova causalidade nem tem
janela madura suficiente para nova mudança. O problema seguinte está depois
da repetição, e a oferta de 2+ filmes permanece congelada até completar amostra.

---

## ROUND 6 — saldo insuficiente + K11 · call graph vivo antes de copy

**Data:** 2026-09-04 10:14 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-live-balance-r6`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:13 BRT

- Marco canônico `2026-09-03 16:00 UTC`: 34 cadastros externos, 21 pessoas
  com filme, 1 checkout de desejo, 2 checkouts sem filme, 0 assinaturas e 0
  pessoas com falha sem filme.
- Vigia das últimas 2 horas: permanece 1 pessoa externa (`a8c8d6c5`), classe
  canônica `activation_defect`, Pro aberto, 0 filmes, 25 créditos intactos.
- K11 `pricing_journey_proof_v1`, estado `after_delivery`: 5 pessoas externas,
  todas com 24h completas; 0 clique no CTA interno, 1 checkout e 1 assinatura
  por outro caminho nas 24h seguintes.
- O estado `before_first_delivery` tem 9 pessoas (8 maduras), 0 clique interno,
  3 checkouts e 1 assinatura por outros caminhos.

### FATO CONFIRMADO — pedido do Claude sobre saldo curto

- `components/UpgradeModal.tsx` não tem caller no HEAD atual. Ele está órfão;
  editar sua copy não mudaria o produto.
- A caixa viva é uma função local `UpgradeModal` em
  `app/(dashboard)/generate/GenerateClient.tsx:18480`, e o gatilho também vive
  nesse arquivo. Essa é a pista Claude/compartilhada.
- As seis redações de saldo citadas pelo pedido nascem em rotas de Compose,
  Avatar, Animate e mídia. As caixas vivas de Images/Audio/Animate já oferecem
  plano ou recarga; o texto cru restante é responsabilidade do chamador.
- K11 já está IMPLEMENTADO em `PricingJourneyProof`: após entrega, a página de
  preço mostra duração e motor do filme da pessoa antes dos planos. A variante
  tem só 5 pessoas expostas, abaixo do gate de 10; não foi reeditada.

### DECISÃO REVERSÍVEL / GATE

O pedido de saldo foi devolvido à pista dona com o call graph exato. Não foi
criado componente paralelo nem copy órfã. K11 permanece congelado até 10
pessoas externas maduras em `after_delivery`. A assinatura observada prova
correlação da jornada, não crédito do CTA, porque não houve clique nele.

### IMPLEMENTADO

Nenhuma alteração de produto. Diagnóstico mensurável e roteamento entre pistas.

### COMO MEDIR

Para K11: `pricing_journey_proof_viewed` → CTA do próprio componente →
`checkout_started` → `checkout_success_viewed`, por pessoa em 24h e por
`journey_state`. Para saldo: medir no evento do chamador qual ação apareceu
após 402; mensagem do servidor sozinha não prova que a UI terminou sem saída.

### RISCO

Risco zero de produto: SELECT e documentação. O risco evitado foi editar um
componente órfão e declarar uma correção que ninguém veria.

### PRÓXIMA JOGADA

Auditar K8 e as superfícies próprias restantes por caller e amostra. Se todas
estiverem implementadas ou congeladas, fazer rodada de medição pura contra o
marco zero e transformar o padrão do vigia em pedido objetivo para a pista dona.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

A mensagem de saldo que realmente aparece está dentro da tela do Claude; o
arquivo de modal atribuído à CAIXA está morto. Não desperdicei uma entrega nele.
A página de preço já usa o filme como prova e teve uma assinatura na pequena
coorte, mas ainda não tem amostra suficiente para receber outra variante.

---

## ROUND 7 — K8 · prova de idioma bloqueada por ausência de fonte

**Data:** 2026-09-04 10:16 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-language-proof-r7`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:15 BRT

- O schema de produção não possui coluna com `language` ou `locale` em
  `profiles`, `videos` ou `render_jobs`.
- O placar e o vigia não mudaram desde a rodada anterior: 34 cadastros, 21
  pessoas com filme, 1 checkout de desejo, 2 sem filme, 0 assinaturas, 0 falhas
  sem filme; 1 pessoa `activation_defect` permanece no vigia de 2 horas.

### FATO CONFIRMADO — o que doía

- K8 pede que a caixa diga “narrated in [idioma]” com base no filme da pessoa.
  `/api/videos` entrega motor, duração e mídia, mas não entrega idioma.
- O runtime de narração aceita apenas `en | pt | es` em funções centrais. O
  pedido já aberto para a pista Claude registra que `de` e `fr` hoje caem para
  inglês; portanto “every language” seria promessa falsa.
- Não existe implementação viva nem evento versionado de K8. O grep no código,
  nos handoffs e no log da main não encontrou caller a medir.

### DECISÃO REVERSÍVEL / GATE

K8 fica BLOQUEADO até existir uma fonte owner-scoped do idioma efetivamente
usado no TTS. Não inferir idioma a partir do roteiro, país, navegador ou origem.
Quando a fonte existir, a CAIXA pode consumir o campo sem tocar no pipeline e
mostrar somente `en`, `pt` ou `es` confirmados; valor ausente esconde a prova.

### IMPLEMENTADO

Nenhuma alteração de produto. Diagnóstico de contrato e pedido para a pista
dona. Nenhuma promessa, migration ou leitura de conteúdo de cliente foi criada.

### COMO MEDIR

Após o contrato existir: impressão da prova com `effective_language_source`
allow-listed → checkout → assinatura por pessoa em 24h. Antes disso, qualquer
taxa seria inventada porque a exposição não existe.

### RISCO

Risco zero de produto. O risco evitado foi afirmar no último metro um idioma
que o filme pode não ter usado.

### PRÓXIMA JOGADA

ROUND 8 será medição pura das rodadas 5–7 e das intervenções funcionais ainda
em amostra, contra o marco zero, sem código.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

A prova de idioma seria boa para conversão, mas hoje o produto não guarda a
verdade necessária para escrevê-la. Em vez de adivinhar pela nacionalidade ou
pelo roteiro, o pedido foi enviado ao dono do pipeline para expor o idioma real.

---

## ROUND 8 — medição pura · quatro estágios sem empilhar copy

**Data:** 2026-09-04 10:22 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-measurement-r8`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:21 BRT

| Estágio | Pessoas externas | Ação | Checkout | Assinatura | Leitura |
|---|---:|---:|---:|---:|---|
| K13 retomada com filme | 0 | 0 | 0 | 0 | sem amostra |
| K17 Welcome film-first | 1 | 0; dispensou 1 | — | 0 | sem amostra |
| K16 primeiro filme | 10, só 4 maduras | 1 CTA; 6 novos filmes | — | 0 | não fechar |
| K16 após 2+ filmes | 7, só 5 maduras | 0 | — | 0 | não fechar |
| K11 pricing após entrega | 5 maduras | 0 CTA interno | 1 | 1 | caminho externo |
| K11 pricing antes da entrega | 10, 8 maduras | 0 CTA interno | 3 | 1 | caminho externo |

- Marco canônico: 35 cadastros externos, 21 pessoas com filme, 1 checkout de
  desejo, 2 checkouts sem filme, 0 assinaturas desde `2026-09-03 16:00 UTC` e
  0 pessoas com falha sem filme.
- Vigia de checkout: 1 pessoa externa (`a8c8d6c5`), agora atribuída a ChatGPT,
  abriu Pro, não pagou e segue com 0 filmes e 25 créditos. O classificador
  gravou `activation_defect`; ela chegou ao Studio pelo quickstart depois do
  checkout, sem erro de geração na trilha observada.

### FATO CONFIRMADO — leitura das quatro rodadas

- Nenhuma intervenção recente atingiu ao mesmo tempo 10 pessoas externas e
  janela completa de 24h. Alterá-las agora destruiria o aprendizado.
- K16 produz repetição por múltiplos caminhos: 6 pessoas fizeram outro filme,
  mas só 1 clicou no CTA rastreado do histórico. O evento isolado subconta o
  resultado; o novo filme é a evidência final desse estágio.
- As duas assinaturas históricas observadas no K11 aconteceram sem clique no
  CTA do componente. A jornada de pricing está correlacionada, mas não recebe
  crédito causal por esses pagamentos.
- O marco da sprint ganhou 2 cadastros desde a ROUND 4, enquanto pessoas com
  filme, checkout de desejo e assinatura ficaram estáveis.

### IMPLEMENTADO

Nenhuma alteração de produto, por regra de medição pura. Queries foram
reconciliadas por pessoa externa e janela de 24h; evento não foi contado como
cliente e checkout não foi contado como receita.

### GATE DE PARADA

K13, K17, K16 e K11 continuam congelados até seus gates já registrados. A
próxima rodada deve agir em superfície diferente. O padrão vivo do vigia é
ativação anterior ao primeiro filme; como essa tela é da pista Claude, a CAIXA
não a usa para justificar mais copy no pricing.

### PRÓXIMA JOGADA

Auditar K9/K14 na volta de checkout cancelado: provar caller, exposição,
resposta de objeção e destino de teste antes de editar. Se a ação já existe,
medir por pessoa e congelar; se o caminho termina sem ação, corrigir na pista
própria sem tocar no gerador.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

O caixa ainda não gerou uma assinatura nova nesta janela. As mudanças mais
recentes também ainda não têm amostra suficiente para julgamento. Mantive cada
teste intacto e mudei de estágio: a próxima leitura será a volta do checkout
cancelado, onde a pessoa já revelou intenção de pagar.

---

## ROUND 9 — K9/K14 · retorno cancelado já existe, sem amostra

**Data:** 2026-09-04 10:24 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-cancelled-r9`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:23 BRT

- K14 `checkout_cancel_objection_visibility_v1`: 0 pessoas externas expostas
  em 14 dias, 0 respostas, 0 checkout e 0 assinatura atribuível.
- K9 `checkout_cancelled_trial_delivery_offered`: 1 pessoa externa exposta e
  madura, 0 clique, 0 filme posterior e 0 assinatura em 24h.
- Marco canônico permanece em 35 cadastros, 21 pessoas com filme, 1 checkout
  de desejo, 2 sem filme, 0 assinaturas e 0 falhas sem filme.
- Vigia de 2h: a mesma pessoa ChatGPT `a8c8d6c5`, Pro, `activation_defect`, 0
  filmes e 25 créditos; nenhum novo checkout externo entrou na janela.

### FATO CONFIRMADO — o que existe

- `app/checkout/cancelled/page.tsx` possui as quatro objeções vivas e responde
  no mesmo lugar: preço, dúvida de plano, perguntas e apenas olhando.
- A exposição humana é medida por IntersectionObserver, aba visível e dedupe
  no evento `checkout_cancel_objection_viewed`.
- Para conta elegível sem primeira entrega, a mesma página oferece um filme de
  trial, mede oferta/clique e só inicia após ação explícita da pessoa.
- K9 e K14 têm caller e testes de contrato; não são módulos órfãos.

### DECISÃO REVERSÍVEL / GATE

Nenhuma mudança. K14 não pode ser julgada sem uma única exposição; K9 não pode
ser reescrita com uma pessoa. As duas ficam congeladas até 10 pessoas externas
maduras ou até um defeito funcional reproduzível contradizer o código.

### IMPLEMENTADO

Nenhuma alteração de produto. Diagnóstico mensurável e anti-repetição. O teste
de visibilidade foi corrigido para verificar a ordem `stop → clear geometry`
com whitespace agnóstico: a asserção antiga exigia LF literal e ficava vermelha
num checkout CRLF, apesar de o comportamento estar intacto.

### COMO MEDIR

K14: `checkout_cancel_objection_viewed` → `checkout_cancel_reason` → novo
`checkout_started` → pago, por pessoa em 24h. K9: oferta → clique → filme
concluído → pago, na mesma pessoa e janela.

### RISCO

Risco zero de produto. O risco evitado foi trocar uma pesquisa sem respondente
e destruir a primeira linha de base antes de ela existir. A mudança de teste
preserva a mesma invariante e só remove dependência do fim de linha da máquina.

### PRÓXIMA JOGADA

K15: auditar `checkoutVisualProof`, caller real, exposição e resultado. Só
alterar se a prova no caixa for genérica ou estiver ausente apesar de existir
filme owner-scoped; mídia de cliente nunca vai para metadata do Stripe.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

A volta do checkout já pergunta a objeção e oferece o primeiro filme. O gargalo
é distribuição dessa tela: ninguém viu a pesquisa e apenas uma pessoa viu a
oferta de teste. Preservei o experimento e avancei para a prova visual do caixa.

---

## ROUND 10 — K15 · prova visual do Stripe preservada, vigia avançou

**Data:** 2026-09-04 10:28 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-visual-proof-r10`

### CORREÇÃO FACTUAL DE HORÁRIO

As ROUNDs 6–9 tinham horários projetados, posteriores ao relógio real. Foram
corrigidas acima usando os horários dos commits como âncora: 10:14, 10:15,
10:22 e 10:24 BRT. Nenhum dado ou conclusão mudou.

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:27 BRT

- Sem `checkout_visual_proof`: 19 pessoas externas maduras em 14 dias, 0
  pagamentos, 5 cancelamentos e 19 sessões expiradas.
- Com `checkout_visual_proof_v2`: 22 pessoas externas, 19 maduras, 2
  pagamentos, 2 cancelamentos e 18 sessões expiradas.
- As coortes são temporais e não randomizadas. A diferença 0→2 pagamentos é
  compatível com melhora, mas não prova causalidade da imagem.
- Marco canônico: 35 cadastros, 22 pessoas com filme, 1 checkout de desejo, 2
  sem filme, 0 assinaturas desde o marco e 0 pessoas com falha sem filme.
- Vigia: `a8c8d6c5` continua sem pagamento, mas deixou de ser abandono de
  ativação. Saiu de 25 para 12 créditos, iniciou Seedance, teve despacho aceito
  e abriu a tela de render em andamento. Não há erro nem filme concluído ainda.

### FATO CONFIRMADO — K15

- O checkout vivo executa `CHECKOUT_VISUAL_PROOF` e envia a imagem pública da
  marca ao Stripe no `product_data.images`.
- A imagem é deliberadamente genérica. Enviar vídeo, thumbnail, prompt ou URL
  assinada da pessoa ao Stripe apenas para decorar o pagamento ampliaria dado
  de cliente para um terceiro e contradiria o contrato de privacidade do módulo.
- A versão chega ao evento, à Session, à Subscription e ao webhook; o teste
  também exige ausência de mídia privada.
- A prova pessoal continua antes do redirecionamento, nas superfícies owner-
  scoped de pós-vídeo, pricing e retomada. Não foi duplicada dentro do Stripe.

### DECISÃO REVERSÍVEL / GATE

Preservar `checkout_visual_proof_v2`. Já há 19 pessoas maduras e 2 pagamentos,
sem sinal de regressão. Não substituir a imagem de marca por mídia privada. A
próxima comparação só pode atribuir causalidade com variante controlada; estes
dois períodos servem como evidência observacional.

### IMPLEMENTADO

Nenhuma alteração de produto. Auditoria do caller, teste e produção. Também
foram corrigidos somente os timestamps documentais incorretos das quatro
rodadas anteriores.

### COMO MEDIR

`checkout_started` agrupado por `checkout_visual_proof` → cancelamento,
expiração e `checkout_success_viewed` em 24h por pessoa externa. Nunca contar
Session ou expiração como pessoa adicional.

### RISCO

Risco zero de produto. O risco evitado foi vazar um artefato privado ao Stripe
e chamar uma comparação temporal de teste causal.

### PRÓXIMA JOGADA

Reconciliar o vigia até o render dessa pessoa terminar. Em paralelo, auditar a
última ação própria ainda não congelada: coerência do valor exibido no modal
vivo via pedido do Claude, sem tocar no arquivo compartilhado.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

A prova visual genérica do checkout está associada a 2 pagamentos em 22 pessoas,
contra 0 em 19 antes dela, sem alegar causalidade. A pessoa quente do vigia não
abandonou: começou um Seedance e está na sala de render. Agora acompanhamos o
desfecho real antes de mexer em outra tela.

---

## ROUND 11 — pedido do Claude · ativação antes do caixa já está viva

**Data:** 2026-09-04 10:33 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-vigil-r11`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:32 BRT

- Marco canônico: 35 cadastros externos, 22 pessoas com filme, 1 checkout de
  desejo, 2 checkouts sem filme, 0 assinaturas desde o marco e 0 pessoas com
  falha sem filme.
- Vigia das últimas 2h: uma pessoa externa, `a8c8d6c5`, origem ChatGPT. Criou a
  conta e abriu checkout quatro segundos depois, ainda com 25 créditos e zero
  filme: classe `defeito/ativação` no instante do caixa.
- O caminho posterior prova que a recuperação já existente foi executada: viu
  `pricing_journey_proof_viewed`, clicou duas vezes em
  `trial_first_delivery`, confirmou a geração e iniciou Seedance. Às 10:32
  tinha 12 créditos, zero erro, zero filme concluído e o render seguia em voo.

### FATO CONFIRMADO — anti-repetição do pedido das 11:35

- `components/TrialActiveBanner.tsx` já remove o CTA de checkout enquanto
  `decideTrialFirstDelivery()` considera a primeira entrega elegível. Entrou em
  `67b88b09` e preserva saldo para repetição desde `383d744d`.
- `components/growth/PricingJourneyProof.tsx` já consulta `/api/videos`, mostra
  “See your own finished video before choosing a plan” antes dos cards para
  quem tem zero entrega e leva ao Studio. Entrou em `b607a8ab`.
- A pessoa viva abriu o caixa antes dessas superfícies autenticadas terem tempo
  de montar: a intenção de compra nasceu antes do login e foi preservada pelo
  callback. Interceptar o endpoint Stripe agora bloquearia quem declarou “I
  already want to subscribe”; não é uma correção segura.

### DECISÃO REVERSÍVEL / GATE

Não duplicar o CTA nem bloquear checkout. A própria pessoa do pedido atravessou
o bridge existente e está produzindo a prova. Congelar essa superfície até o
desfecho: filme concluído e checkout/pagamento em 24h. O pedido foi respondido
no arquivo entre pistas com os SHAs e a trilha.

### IMPLEMENTADO

Nenhuma mudança de produto. Diagnóstico de não repetição, resposta entre pistas
e vigilância do caso real. Guardião da ROUND 10 confirmou verde no run
`33878277578` para o SHA `f6d83b4e`.

### COMO MEDIR

Para `a8c8d6c5`: `videos.status='completed'`, depois `checkout_started` e
`checkout_success_viewed` em 24h. Para a superfície: pessoas externas com
`pricing_journey_proof_viewed` no estado `before_first_delivery` → primeiro
filme → checkout → pago, sem misturar eventos repetidos.

### RISCO

Bloquear Stripe com base em zero filme faria o produto recusar uma intenção
explícita de compra. Preservar a escolha e oferecer prova antes dos cards mantém
os dois caminhos sem desconto, crédito novo ou promessa nova.

### PRÓXIMA JOGADA

Reconciliar o render de `a8c8d6c5`; se concluir, medir se a prova traz o retorno
ao caixa. Se falhar, encaminhar ao Claude como produto, sem a CAIXA tocar render.
Em paralelo, auditar a rota dominante restante dos checkouts sem filme — a
intenção preservada pelo cadastro — sem inserir intersticial antes de pagamento.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

O pedido de mandar a pessoa ao primeiro filme já estava implementado nas duas
superfícies certas. O caso vivo confirmou o comportamento: ela saiu do checkout,
aceitou a prova e iniciou Seedance. Não bloqueei uma compra real nem empilhei
outra copy; o próximo dado é o filme terminar e a pessoa voltar ao caixa.

---

## ROUND 12 — medição pura · a prova antes do pagamento já tem um pagante

**Data:** 2026-09-04 10:35 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-measurement-r12`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:34 BRT

| Superfície | Pessoas | Maduras 24h | Filme depois | Checkout depois | Pago depois |
|---|---:|---:|---:|---:|---:|
| K14 `checkout_cancel_reason` | 2 | 2 | 1 | 1 | 1 |
| K9 filme oferecido na volta cancelada | 1 | 1 | 0 | 0 | 0 |
| Prova do pricing antes do 1º filme | 10 | 8 | 2 | 3 | **1** |
| Prova do pricing depois do filme | 5 | 5 | 2 | 1 | **1** |
| Clique na primeira entrega do trial | 35 | 28 | 21 | 5 | 1 |
| Geração da primeira entrega confirmada | 13 | 9 | 11 | 3 | 0 |

As colunas são pessoas externas únicas e desfechos posteriores à primeira
exposição. São associações observacionais; superfícies se sobrepõem e não são
um teste randomizado.

### PLACAR CANÔNICO

35 cadastros externos · 22 pessoas com filme · 1 checkout de desejo · 2
checkouts sem filme · 0 assinaturas desde `2026-09-03 16:00 UTC` · 0 pessoas
com falha sem filme.

### VIGIA DO CHECKOUT

Uma pessoa externa nas últimas 2h: `a8c8d6c5`, ChatGPT, classe inicial
`defeito/ativação`. Às 10:34 continuava com 12 créditos, zero filme concluído,
zero erro e último sinal `active_render_pill_shown`; o Seedance permanece em
voo. Não classificar espera de fornecedor como abandono nem como falha.

### LEITURA

- A hipótese “prova antes de preço atrapalha compra” está contradita pelo
  mínimo necessário para preservação: o estado `before_first_delivery` já tem
  1 pagante e 3 pessoas que chegaram ao caixa.
- A oferta de primeira entrega produz valor: 21 de 35 pessoas com clique tiveram
  filme posterior. O desfecho pago ainda é raro e as 7 exposições imaturas
  impedem outra variante agora.
- K9 segue sem sinal e K14 tem só duas pessoas. O único pagamento em K14 não
  autoriza atribuir causalidade; a amostra é mínima.

### IMPLEMENTADO

Nenhuma alteração de produto — rodada 4n exclusivamente de medição. O
Guardião da ROUND 11 ainda estava em execução no início do corte; o anterior,
run `33878277578`, estava verde.

### GATE

Preservar K9, K14 e a prova do pricing. Não reeditar antes de nova amostra.
Reconciliar `a8c8d6c5` até um desfecho objetivo. Próxima ação nova deve atacar o
salto filme concluído → pagamento, sem alterar o bridge que já entrega filme.

### PRÓXIMA JOGADA

Auditar o pedido do Claude sobre D5/D10 com filme: 70 pessoas receberam prova
no e-mail e só uma abriu checkout; verificar se a `/pricing` reconhece a UTM e
mostra o filme owner-scoped antes dos cards sem criar uma segunda prova.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

A medição mostrou que a prova antes do pagamento já tem um pagante e leva gente
ao caixa; não devemos desmontá-la. O caso quente do ChatGPT ainda está esperando
o Seedance, sem erro. A próxima rodada vai investigar por que quem recebe o
e-mail com o próprio filme cai numa página de preço genérica.

---

## ROUND 13 — D5/D10 · o filme do e-mail chega à decisão

**Data:** 2026-09-04 10:41 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-email-film-proof-r13`

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:40 BRT

- 71 pessoas externas receberam `offer_with_film` no D5/D10: 23 no D5 e 48
  no D10. Depois do primeiro envio, 1 pessoa abriu checkout e 0 pagaram.
- A contagem anterior dizia “70 envios”; a leitura atual é 71 pessoas e 71
  envios. Janela viva mudou em uma pessoa; não somar snapshots diferentes.
- Placar canônico: 35 cadastros, 22 pessoas com filme, 1 checkout de desejo, 2
  checkouts sem filme, 0 assinaturas e 0 pessoas com falha sem filme.
- Vigia `a8c8d6c5`: 12 créditos, zero filme, zero erro e último evento ainda
  `active_render_pill_shown`. Render em voo, não abandono.

### HIPÓTESE

O e-mail cita o resultado da pessoa, mas o clique `trial_offer_d5|d10` chega a
uma prova textual genérica antes dos cards. Tornar o mesmo filme visível e
tocável conserva a motivação que abriu o e-mail até o ponto de decisão.

### IMPLEMENTADO

- `lib/growth/pricingJourneyProof.ts`: allowlist exata dos dois campaigns e
  contrato `pricing_journey_email_film_v1`.
- `app/pricing/PricingClient.tsx`: encaminha apenas o campaign já sanitizado.
- `components/growth/PricingJourneyProof.tsx`: no retorno D5/D10, seleciona o
  último filme via `selectCheckoutResumeFilm`, mostra playback com controles e
  mantém os mesmos botões de plano e revisão. Todas as outras visitas preservam
  o ramo atual.
- Telemetria registra versão, campaign allow-listed e buckets de disponibilidade;
  nunca título, URL, id, prompt ou roteiro.
- Preview antes/depois desktop/mobile em
  `docs/previews/PRICING-EMAIL-FILM-PROOF-2026-09-04.html`.

### TESTADO LOCALMENTE

`test-pricing-journey-proof` 63/63 · `test-checkout-resume-own-film` 35/35 ·
`test-pricing-plan-choice-attribution` 26/26 · Guardião local 12/12 ·
`npx tsc --noEmit` equivalente, verde · `git diff --check` limpo.

A revisão visual automática no Chrome foi bloqueada pela política de segurança
para URL `file://`; não houve tentativa de contorno. O HTML autocontido está no
painel do Codex e cobre antes/depois em desktop e mobile.

### COMO MEDIR

`pricing_journey_email_film_loaded` → `pricing_journey_proof_plans_clicked` →
`checkout_started` → `checkout_success_viewed`, por pessoa externa e separado
entre D5/D10. Linha de base combinada: 71 pessoas, 1 checkout, 0 pagamentos.

### GATE DE PARADA

Não alterar preço, cupom, corpo do e-mail ou prova genérica. Manter a variante
até 10 pessoas externas carregarem filme ou 7 dias, o que vier primeiro. Parar
e reverter se houver erro de mídia ou queda do CTA de planos nesse segmento.

### RISCO

Baixo e segmentado. A mídia vem da rota autenticada do próprio dono e passa
pela allowlist HTTPS já usada na retomada do checkout. O risco residual é custo
de rede; `preload='metadata'`, sem autoplay, limita o carregamento inicial.

### PRÓXIMA JOGADA

Publicar, validar o deploy e confirmar o primeiro evento de carregamento. Depois,
reconciliar o vigia e auditar a intenção preservada no cadastro sem colocar
intersticial entre uma pessoa pronta para pagar e o Stripe.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

Quem volta pelo e-mail que fala do próprio filme agora vê e pode tocar esse
filme antes dos planos. A mudança alcança só D5/D10, não mexe em preço nem no
resto do pricing, e cria a primeira medição direta entre “vi meu resultado” e
“paguei”.

---

## ROUND 14 — intenção antes do produto · não bloquear quem quer pagar

**Data:** 2026-09-04 10:46 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-auth-intent-r14`

### VALIDAÇÃO DA ENTREGA ANTERIOR

**VALIDADO EM PRODUÇÃO:** SHA `2df52939`, Vercel
`dpl_93sYbm8HKeGqLgrYJkWHrZKh3L3w` READY e aliasado em
`www.usekineo.com`; Guardião run `33879534776` verde. O Chrome abriu a
`/pricing?intent_campaign=trial_offer_d5` sem erro visual. A conta do fundador
é inelegível à prova segmentada, então o playback pessoal não foi forçado nem
simulado em produção.

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:45 BRT

- Nos primeiros checkouts externos dos últimos 7 dias, 20 pessoas ainda não
  tinham filme no instante do caixa; 16 chegaram em até 6 minutos de conta.
- Dessas 20, 7 fizeram filme depois e 1 pagou depois. Bloquear checkout por
  `videos_ok=0` teria bloqueado uma assinatura real.
- Desde a entrada da prova antes do pagamento (`b607a8ab`, corte operacional
  31/08 01:30 UTC), são 14 pessoas sem filme no primeiro checkout: 11 em até 6
  minutos, 5 com filme posterior, 2 que viram a prova depois e 1 pagante.
- Nenhuma tinha `finished_script` antes do primeiro checkout. É intenção de
  compra anterior ao uso, não roteiro pronto nem falha técnica.
- A origem imediatamente anterior se distribui: 4 `trial_active_banner`, 3
  `dashboard`, 2 `generate_step_1`, 2 `generate_upgrade_modal` e 9 pessoas em
  oito sinais unitários. Não há um único caller que explique o grupo.

### VIGIA DO CHECKOUT

Uma pessoa externa nas últimas 2h: `a8c8d6c5`, ChatGPT. Continua sem pagamento
e sem filme concluído, mas às 10:45 avançou de cenas para
`compose_submission_claim`, com 12 créditos e zero erro. Classe atual:
`ativação em entrega`, não abandono.

### DECISÃO REVERSÍVEL / GATE

Não inserir intersticial no callback e não recusar Stripe para conta com zero
filme. O dado mostra que esse grupo pode virar filme e também contém um pagante.
As superfícies atuais fazem a escolha correta: prova primeiro como ação
principal, “I already want to subscribe” como saída explícita.

### IMPLEMENTADO

Nenhuma alteração de produto. Diagnóstico por pessoa no instante real do
checkout, separando filme anterior de filme posterior e evitando a contagem
enganosa por estado atual da conta.

### COMO MEDIR

Primeiro `checkout_started` por pessoa externa; contar vídeos `completed` com
`created_at < checkout_at`, depois filme e `checkout_success_viewed` posteriores.
Nunca classificar “sem filme” pelo estado atual da conta.

### RISCO

O maior risco era otimizar o denominador removendo pessoas prontas para pagar.
Um funil com menos checkout pode parecer melhor sem gerar uma assinatura a mais.

### PRÓXIMA JOGADA

Reconciliar o `compose_submission_claim` do vigia. Depois auditar uma superfície
nova de último metro que não esteja congelada: a confiança e continuidade na
volta de uma sessão Stripe, sem mexer em oferta nem em render.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

Descobrimos que “checkout antes do filme” não é automaticamente lixo: 7 dessas
pessoas fizeram filme depois e uma pagou. Por isso não bloqueei o caixa. A ação
certa é oferecer prova primeiro sem retirar a escolha de quem já quer assinar.

---

## ROUND 15 — uma decisão por vez: entrega antes do lembrete salvo

**Data:** 2026-09-04 10:50 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-render-wait-r15`

### VALIDAÇÃO DA ENTREGA ANTERIOR

**VALIDADO NA MAIN:** rodada 14 em `5975cf09`; Guardião local 12/12, jornada
63/63 e typecheck verde antes do fast-forward. Foi documentação/decisão, sem
deploy de produto.

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:49 BRT

- Placar canônico desde 03/09 16:00 UTC: 35 cadastros externos, 22 pessoas com
  filme, 1 checkout com desejo pós-filme, 2 pessoas no estado atual sem filme,
  0 assinaturas e 0 pessoas com falha sem filme.
- Vigia das últimas 2h: uma pessoa externa (`a8c8d6c5`), ainda sem pagamento ou
  filme, mas com submissão iniciada e zero erro; classe `ativação em entrega`.
- Em 14 dias, 3 pessoas externas tiveram `active_render_pill_shown` em estado
  `rendering` e `checkout_resume_banner_viewed` na mesma janela de ±2 minutos.
  Nenhuma pagou depois; uma recebeu o filme e duas ainda não.
- O caso vivo viu o banner salvo, iniciou a entrega, viu a pílula de render e
  dispensou o checkout. Não é prova causal, mas é uma colisão de decisões real.

### HIPÓTESE E MUDANÇA MÍNIMA

Pedir pagamento enquanto o primeiro filme ainda está no forno compete com a
própria prova de valor. O checkout salvo não é apagado nem alterado: somente o
banner global fica oculto enquanto a sonda autenticada e owner-scoped
`/api/compose/active` responde `rendering`. Ao chegar a estado terminal, o
lembrete retorna automaticamente.

Para capturar a corrida de um render que começa logo após o layout, há duas
rechecagens ociosas de 15s. Depois disso, polling continua apenas durante um
render confirmado. Falha da sonda abre o banner; nunca apaga recuperação boa.

### IMPLEMENTADO

- `components/CheckoutResumeBanner.tsx`: guarda executada no caller real;
  denominador humano também para durante a ocultação.
- `lib/growth/checkoutResumeDeliveryGuard.ts`: classificação e orçamento de
  sondagem puros; nenhum identificador de render sai em telemetria.
- `scripts/test-checkout-resume-delivery-guard.mjs`: 16 invariantes executáveis.
- `docs/previews/CHECKOUT-RESUME-DELIVERY-GUARD-2026-09-04.html`: comparação
  visual antes/depois, responsiva.

### TESTADO LOCALMENTE

Delivery guard 16/16 · human view 111/111 · own film 35/35 · pricing saved
checkout 47/47 · Guardião local 12/12 · typecheck verde · `diff --check` limpo.

### COMO MEDIR

`checkout_resume_suppressed_active_render` → filme concluído →
`checkout_resume_choice_viewed` → `checkout_started` →
`checkout_success_viewed`, por pessoa externa. A métrica operacional é zerar a
coexposição em ±2 minutos sem reduzir pagamento após o filme.

### GATE DE PARADA

Manter até 10 pessoas externas suprimidas ou 7 dias. Parar/reverter se o banner
não reaparecer após estado terminal, se a sonda elevar erros, ou se uma pessoa
com checkout salvo ficar sem nenhuma exposição após o filme.

### RISCO

Baixo e reversível. Há uma chamada owner-scoped extra apenas para pessoas com
checkout recuperável, mais duas rechecagens ociosas; durante render já existia
polling equivalente no produto. O risco residual é atrasar por segundos uma
compra espontânea enquanto a entrega está em voo; a pessoa continua podendo
abrir `/pricing` normalmente.

### PRÓXIMA JOGADA

Publicar e validar que o banner comum continua visível quando não há render.
Depois medir o caso vivo até entrega/pagamento e escolher uma superfície nova,
sem reeditar esta antes do gate.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

Três pessoas viram duas ordens ao mesmo tempo: “espere seu vídeo” e “pague
agora”. O checkout continua salvo, mas o lembrete agora espera o filme terminar
e volta depois, quando existe prova para sustentar a decisão.

---

## ROUND 16 — medição pura · nenhuma superfície reeditada

**Data:** 2026-09-04 10:59 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-measurement-r16`

### VALIDAÇÃO DA ENTREGA ANTERIOR

**VALIDADO EM PRODUÇÃO:** SHA `cc6c05b5`, Vercel
`dpl_FoHJFoPKcMo9FtWLxneMFokvrQX3` READY e aliasado em
`www.usekineo.com`; Guardião run `33880758743` verde. O Studio abriu no Chrome
autenticado sem erro visual; a aba criada para o teste foi fechada.

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 10:58 BRT

Placar canônico desde 03/09 16:00 UTC: 35 cadastros externos, 22 pessoas com
filme, 1 checkout com desejo pós-filme, 2 pessoas no estado atual sem filme,
0 assinaturas e 0 pessoas com falha sem filme. Não houve mudança desde a R15.

Primeiro toque por pessoa externa, todos maduros há pelo menos 15 minutos:

| intervenção | pessoas | filme depois | checkout depois | pago depois |
|---|---:|---:|---:|---:|
| `trial_first_delivery_clicked` | 7 | 4 | 0 | 0 |
| `pricing_journey_proof_viewed` | 2 | 0 | 0 | 0 |
| `checkout_resume_choice_viewed` | 2 | 0 | 0 | 0 |

`pricing_journey_email_film_loaded` e
`checkout_resume_suppressed_active_render` ainda têm zero pessoas: os dois
experimentos são novos demais, portanto não há amostra válida e não foram
reeditados.

### VIGIA DO CHECKOUT

A única pessoa das últimas 2h continua sem filme e sem pagamento. O último
sinal mudou para `stranded_composed` às 10:46:27 BRT. **FATO CONFIRMADO NO
CÓDIGO:** esse evento significa que o finisher já obteve um render composto;
não é falha terminal por si só. No corte havia 12 minutos de espera, abaixo da
próxima rodada de 15 minutos do finisher. Classificação: `entrega em recuperação`,
com vigia aberto; não abrir incidente antes da janela operacional.

### DECISÃO / GATE

Nenhuma mudança de produto nesta rodada. O dado mais doloroso permanece 0
assinaturas, mas todas as variantes recentes estão abaixo do gate. Empilhar
nova copy nelas agora destruiria a capacidade de aprender qual etapa moveu o
caixa.

### COMO MEDIR

Na próxima leitura, primeiro reconciliar a pessoa `a8c8d6c5`: vídeo concluído,
`stranded_outcome`, estorno ou erro. Depois repetir os dois eventos novos e o
placar, sempre por pessoa externa.

### RISCO

O risco atual não é inação: é chamar recuperação normal de falha antes do ciclo
do cron, ou otimizar cliques sem uma assinatura. Ambos foram evitados.

### PRÓXIMA JOGADA

Se o vigia fechar com filme, trabalhar outra superfície CAIXA ainda não
congelada. Se passar da janela operacional sem vídeo, abrir pedido factual para
Claude com o último estado; nenhum toque no pipeline pela CAIXA.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

A rodada só mediu. Os experimentos recém-publicados ainda não tiveram pessoas
e, por isso, não foram mexidos de novo. O cliente vivo chegou à recuperação do
filme e segue observado até um desfecho real, sem confundir espera com erro.

---

## ROUND 17 — K1 completo por superfície · oferta automática só após valor

**Data:** 2026-09-04 11:07 BRT
**Pista:** Growth-B2C / CAIXA
**Branch:** `codex/caixa-value-continuity-r17`

### VALIDAÇÃO DA ENTREGA ANTERIOR

**VALIDADO EM PRODUÇÃO:** R15 permanece em `cc6c05b5`, Vercel READY e Guardião
verde. Até 10:58 BRT, zero eventos de supressão: nenhuma pessoa elegível passou
pela variante ainda. R16 foi medição/documentação em `2a62e0f2`.

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 11:03 BRT

O K1 estava correto no `TrialActiveBanner`, mas incompleto na superfície global:
o `WelcomeOfferModal` continuava abrindo segundos depois do cadastro.

Primeiro `welcome_offer_viewed` de cada pessoa externa em 14 dias:

| superfície, sem filme no instante | pessoas | fecharam | clicaram modal | pagaram |
|---|---:|---:|---:|---:|
| dashboard | 30 | 23 | 3 | 0 |
| home | 5 | 4 | 0 | 0 |
| pricing | 2 | 2 | 1 | 1 |

A mediana de idade das 37 pessoas sem filme era 0,19 minuto, cerca de 11
segundos. A única pagante clicou no próprio modal de `pricing`, abriu o checkout,
pagou e só depois fez o primeiro filme. Portanto apagar o modal global seria
regressão de receita; segmentar por superfície preserva o caminho comprovado.

### HIPÓTESE E MUDANÇA MÍNIMA

No dashboard, a primeira tarefa é ver o produto funcionar; um modal automático
de plano antes disso interrompe a ativação. Em `pricing`, a visita já expressa
intenção de compra e permanece exatamente como está.

Somente `surface='dashboard'` com histórico owner-scoped confiável e
`completedCount=0` adia a abertura. Falha ou ausência de histórico preserva o
comportamento antigo. O marcador de 72h não é gravado quando há supressão, então
a oferta existente volta a ser elegível numa visita depois do primeiro filme.

### IMPLEMENTADO

- `components/WelcomeOfferModal.tsx`: lê plano, identidade e histórico em
  paralelo; nenhuma cascata de rede. Home/pricing não fazem a consulta extra.
- `lib/growth/welcomeOfferFrequency.ts`: política pura e versão
  `welcome_offer_after_film_v1`.
- `scripts/test-welcome-offer-frequency.mjs`: caller real, falha aberta e
  preservação de home/pricing travados.
- `docs/previews/WELCOME-OFFER-AFTER-FIRST-FILM-2026-09-04.html`: comparação
  visual responsiva e caminho de pricing preservado.

### TESTADO LOCALMENTE

Welcome offer 44/44 · public promo truth 68/68 · plan film language 32/32 ·
money truth 313/313 · typecheck verde · `diff --check` limpo. O checklist React
foi aplicado: as três leituras independentes são paralelas, abortos/erros não
quebram a página e nenhum dado do filme entra em telemetria.

### COMO MEDIR

`welcome_offer_suppressed_before_first_film` → primeiro filme →
`welcome_offer_viewed` posterior no dashboard → clique → checkout → pagamento.
Separar sempre `surface`. Linha de base do dashboard: 30 pessoas sem filme,
23 dismissals, 3 cliques e 0 pagamentos.

### GATE DE PARADA

Manter até 20 pessoas externas suprimidas ou 7 dias. Reverter se `pricing`
deixar de emitir seu evento, se pessoa com `completedCount>=1` for suprimida ou
se a taxa de primeiro filme cair no grupo. Não reeditar antes do gate.

### RISCO

Baixo e isolado ao dashboard. A decisão não mexe no desconto, preço, checkout,
frequência, home ou pricing. Risco residual: alguém no dashboard queria pagar
antes de testar; Pricing segue visível na navegação e o histórico indisponível
falha aberto.

### PRÓXIMA JOGADA

Publicar e validar home, pricing e dashboard. Depois congelar a superfície e
voltar ao vigia, escolhendo outro estágio do caixa.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

O modal que vendia antes de o cliente ver um filme agora espera somente no
dashboard. A página de preços — o caminho que já gerou pagamento real antes do
primeiro vídeo — foi preservada sem mudança.

---

## ROUND 18 — recusa de pagamento: separar primeira compra de renovação — 04/09 11:08→11:13 BRT — CONCLUÍDA

### PLACAR E VIGIA

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:09 BRT:** desde o marco de 03/09 13:00 BRT há 35 cadastros externos, 23 pessoas com filme, 2 pessoas em checkout com filme, 1 sem filme, 0 assinaturas e 0 pessoas com falha sem filme. Fonte: SQL canônico do programa, somente leitura, pessoas distintas e contas internas excluídas.
- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:10 BRT:** a única pessoa externa do vigia móvel de duas horas é `73bd3264`, origem registrada `chatgpt`, plano `pro` aberto 4 segundos após o callback de cadastro. Ela agora tem 1 filme concluído às 11:00 BRT, 12 créditos, nenhum erro e nenhum pagamento. Classificação atual: **desejo**; a ronda 15 já preserva seu checkout durante o render e a ronda 17 governa a próxima exposição da oferta. A superfície permanece congelada.

### DADO QUE DOÍA

- **EVIDÊNCIA DE PRODUÇÃO — 04/09/2026 11:12 BRT:** nos últimos 30 dias existem exatamente 2 pessoas externas com `checkout_payment_failed`, 1 evento por pessoa. As duas ocorrências são `stage=renewal`, `reason_category=insufficient_funds`, rede recusou e risco normal. Uma ocorreu em 03/09 e outra em 04/09. Existem **0 pessoas com recusa canônica na primeira assinatura** nessa janela.
- **FATO CONFIRMADO:** `payment_intent.payment_failed` distingue `initial|renewal|unknown` e grava `reason_category`; `charge.failed` é apenas enriquecimento e não duplica o evento canônico. Fonte: `app/api/stripe/webhook/route.ts:1547-1630` e `lib/stripeCheckoutFailure.ts:1-128`.
- **CONTRADIÇÃO CORRIGIDA:** contar esses dois eventos como falha do checkout inicial seria falso. Ambos pertencem a cobrança de renovação de pessoas já pagantes; não explicam as 0 novas assinaturas do placar.

### DECISÃO REVERSÍVEL

Nenhuma mudança de checkout. Criar copy, novo método ou retry da primeira compra com base nesses dois eventos atacaria a etapa errada. A orientação de cartão/Apple Pay/Google Pay já está visível nas superfícies próprias e o PayPal continua corretamente bloqueado: `PAYPAL_ENABLED=false`, depois de canário reprovado documentado.

### COMO MEDIR E GATE

Reabrir uma ação de falha da primeira compra somente quando existir pelo menos 1 pessoa externa com `checkout_payment_failed.stage='initial'`; classificar por `reason_category`, pessoa e resultado posterior. Renovação insuficiente é uma fila separada de retenção e não entra no denominador de aquisição.

### RISCO

Zero risco de produto: rodada somente leitura + registro canônico. O risco evitado foi mudar o checkout inicial por causa de um evento de renovação.

### PRÓXIMA JOGADA

Medir a maior superfície de decisão ainda não congelada e agir somente se houver pessoas reais sem caminho já coberto. Não reeditar R13, R15 ou R17 antes dos respectivos gates.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

As duas recusas reais de cartão não são novas compras perdidas: são renovações recusadas por saldo insuficiente. O checkout inicial não ganhou uma mudança sem evidência; o vigia continua concentrado na pessoa do ChatGPT que agora já recebeu o primeiro filme.

---

## ROUND 19 — roteiro do ChatGPT preservado deixa de parecer travado

**Data:** 2026-09-04 11:14→11:28 BRT

**Pista:** Growth-B2C / CAIXA

**Branch:** `codex/caixa-chatgpt-instruction-r19`

**SHA funcional:** `679e9935`

### VALIDAÇÃO DA ENTREGA ANTERIOR

**IMPLEMENTADO EM `origin/main`:** R18 está em `6a88b0da`. **QUESTÃO
PENDENTE:** nesta máquina `gh` não existe e a CLI da Vercel não tem sessão;
portanto não classifico Guardião/deploy como validados por painel nesta rodada.
A produção pública será validada depois do merge sem inventar estado externo.

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 11:26 BRT

Placar canônico desde 03/09 16:00 UTC: **36 cadastros externos, 23 pessoas com
filme, 2 checkouts com filme, 1 sem filme, 0 assinaturas e 0 pessoas com falha
sem filme**.

O vigia das últimas 2h encontrou uma pessoa externa (`a8c8d6c5`), origem
registrada `chatgpt`, plano Pro aberto quatro segundos após o cadastro. Ela
bateu exatamente em `activation_autostart_skipped(reason=
prompt_looks_like_instruction)` às 10:16:59 BRT; sem explicação, tentou analisar
manualmente seis vezes e só iniciou a geração às 10:20:21, **3m22s depois**.
Agora tem um filme concluído, 12 créditos, nenhum erro e nenhum pagamento.
Classificação: **desejo**. A pessoa real confirma o pedido do Claude e decide a
jogada acima do cardápio.

### DADO QUE DOÍA

**EVIDÊNCIA DE PRODUÇÃO — pedido do Claude, medido em 04/09/2026:** 35 pessoas
em 48h caíram no guarda correto de instruções; 12 nunca fizeram filme. O guarda
protege a qualidade e não deve ser afrouxado. O defeito era silêncio: o roteiro
permanecia no textarea, mas a interface não dizia isso nem apontava o próximo
clique.

### IMPLEMENTADO

- `app/(dashboard)/generate/GenerateClient.tsx`: no único ramo
  `prompt_looks_like_instruction`, mostra orientação antes de consumir o
  auto-start; a edição manual remove o aviso obsoleto.
- `lib/growth/instructionPasteNotice.ts`: copy, versão, regra fechada e faixas
  categóricas de comprimento em módulo puro.
- `scripts/test-instruction-paste-notice.mjs`: 28 invariantes executáveis,
  incluindo caller real, ordem aviso→skip, trava preservada, acessibilidade e
  ausência de roteiro na telemetria.
- `docs/previews/CHATGPT-INSTRUCTION-NOTICE-2026-09-04.html`: antes/depois em
  desktop e depois em mobile.

O evento novo `activation_instruction_notice_viewed` carrega apenas versão,
razão, superfície, fonte já allow-listed e faixa de tamanho. Não carrega prompt,
roteiro, título nem identificador de render.

### TESTADO LOCALMENTE

Instruction notice 28/28 · quickstart 127/127 · trial-best 27/27 · public promo
68/68 · money truth 313/313 · TypeScript verde · `diff --check` limpo. Duas
baterias antigas de recuperação falham localmente em âncoras que exigem LF
literal; os trechos funcionais continuam presentes e o blob normalizado do Git
mantém LF. Não alterei teste da pista Claude para fabricar verde.

### COMO MEDIR

Por pessoa e sessão: `activation_autostart_skipped` com
`reason=prompt_looks_like_instruction` → `activation_instruction_notice_viewed`
→ `generate_started` → filme → checkout → pagamento. Linha viva desta rodada:
3m22s e seis cliques de análise entre skip e geração; meta é cair para um clique
e reduzir as 12 pessoas sem filme, sem aumentar auto-render de instrução.

### GATE DE PARADA

Manter até 20 pessoas externas expostas ou 7 dias. Reverter se o aviso aparecer
para outro motivo, se texto editado continuar mostrando confirmação obsoleta,
se qualquer prompt entrar no evento ou se a trava deixar de bloquear auto-start.
Não reeditar antes do gate.

### RISCO

Baixo e reversível. É uma linha explicativa em uma condição já existente; não
mexe em preço, oferta, crédito, checkout, motor, render ou conteúdo do usuário.
Risco residual: marcadores não reconhecidos ainda podem ser narrados; a copy
diz explicitamente “recognized” e não promete cobertura universal.

### PRÓXIMA JOGADA

Publicar e validar a entrada real do ChatGPT sem gastar crédito. A ROUND 20 é
medição pura: reconciliar as quatro entregas anteriores e não editar nenhuma
superfície antes da amostra.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

O roteiro do ChatGPT já era preservado e a trava de qualidade estava certa; a
tela é que ficava muda. Agora ela confirma o que foi preservado, explica o que
vira narração e aponta o clique de Generate, com uma métrica própria até filme e
assinatura.

---

## ROUND 20 — medição das quatro rodadas · nenhuma superfície reeditada

**Data:** 2026-09-04 11:34→11:36 BRT

**Pista:** Growth-B2C / CAIXA

**Branch:** `codex/caixa-measurement-r20`

### VALIDAÇÃO DA ENTREGA ANTERIOR

**VALIDADO EM PRODUÇÃO:** `origin/main=21aeada1`, Guardião #110 concluído com
quatro checks verdes (suíte 24s, TypeScript 59s, Vercel e comentários), Vercel
`dpl_9FnzHwsTiw73F1EREDaJWDSLgCx6` Ready em Production, domínio atual
`www.usekineo.com`, fonte `21aeada1`. Também ficou fechada a pendência da R18:
Guardião #107 verde para `6a88b0da`.

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 11:35 BRT

Placar canônico desde 03/09 16:00 UTC: **36 cadastros externos, 23 pessoas com
filme, 2 checkouts com filme, 1 sem filme, 0 assinaturas e 0 pessoas com falha
sem filme**. Não mudou desde a R19.

Primeiro toque por pessoa externa desde o marco:

| intervenção | pessoas | filme depois | checkout depois | pago depois |
|---|---:|---:|---:|---:|
| `trial_first_delivery_clicked` | 8 | 5 | 0 | 0 |
| `checkout_resume_choice_viewed` | 2 | 1 | 0 | 0 |
| `pricing_journey_proof_viewed` | 2 | 1 | 0 | 0 |
| `checkout_resume_suppressed_active_render` | 0 | 0 | 0 | 0 |
| `welcome_offer_suppressed_before_first_film` | 0 | 0 | 0 | 0 |
| `activation_instruction_notice_viewed` | 0 | 0 | 0 | 0 |

As três intervenções mais recentes seguem sem exposição humana. **Sem amostra
válida:** nenhuma delas foi reeditada.

### VIGIA DO CHECKOUT

A única pessoa externa nas últimas 2h continua `a8c8d6c5`, origem `chatgpt`,
Pro, classificação **desejo**. O desfecho operacional avançou: tem um filme,
12 créditos e baixou o arquivo às 11:16 BRT. Continua sem pagamento. Isso prova
valor recebido, mas não autoriza atribuir a ausência de pagamento a preço,
cartão ou copy; nenhum evento de objeção/falha apareceu.

### DECISÃO / GATE

Nenhuma mudança de produto nesta rodada. A regra de quatro rodadas foi
cumprida: medir R16–R19 contra o mesmo marco antes de continuar. O sinal que dói
é 0 assinaturas, mas empilhar mensagem sobre variantes com zero pessoas
destruiria a leitura causal.

### COMO MEDIR

Repetir primeiro toque→filme→checkout→pago quando qualquer evento novo ganhar
pessoa real. Para o vigia, observar somente sinais posteriores ao download:
retorno à oferta, checkout reaberto, objeção explícita ou pagamento.

### RISCO

Zero risco de produto e zero custo: somente SQL de leitura e documentação. O
risco evitado foi transformar um download sem pagamento em certeza inventada
sobre a causa.

### PRÓXIMA JOGADA

Voltar a uma superfície não congelada e começar pelo pedido aberto de maior
impacto da pista Claude. Não tocar novamente no aviso da R19 antes de 20 pessoas
ou 7 dias.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

A entrega nova está no ar e verde, mas ainda ninguém recebeu o aviso. A pessoa
viva do ChatGPT terminou e baixou o primeiro filme, porém não voltou ao caixa.
A rodada preservou os testes existentes e não inventou uma causa para esse não
pagamento.

---

## ROUND 21 — dispensa antes da entrega não apaga a decisão pós-filme

**Data:** 2026-09-04 11:43→11:52 BRT

**Pista:** Growth-B2C / CAIXA

**Branch:** `codex/caixa-dismiss-until-film-r21`

### VALIDAÇÃO DA RODADA ANTERIOR

**FATO CONFIRMADO:** `origin/main=4a97fdbb`, a worktree começou limpa e sem
divergência. O único patch externo encontrado era um artefato antigo do K13,
já incorporado em `2df52939`; `git apply --check` o recusou como corrompido na
linha 107. Nenhuma linha desse patch foi aplicada.

### EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-04 11:43 BRT

Placar canônico desde 03/09 16:00 UTC: **37 cadastros externos, 23 pessoas com
filme, 2 checkouts com filme, 1 sem filme, 0 assinaturas e 0 pessoas com falha
sem filme**.

O vigia das últimas 2h tem uma pessoa externa (`4ade265a`), origem `chatgpt`,
um filme concluído, 12 créditos, checkout Pro e nenhum pagamento. Ela viu a
prova da página de preço, o pricing inline e a retomada salva; dispensou a
retomada às 10:21 BRT, recebeu a oferta pós-primeiro-filme às 11:08, tentou o
download duas vezes e concluiu o download às 11:16. Depois da entrega, a
retomada não voltou.

Desde a entrada da política de primeira entrega em 30/08, duas pessoas externas
abriram checkout pelo `trial_active_banner` antes de qualquer filme concluído.
Uma já tinha clicado deliberadamente na primeira entrega; bloquear o checkout
por `videos_ok=0` retiraria escolha explícita. A outra chegou ao caixa enquanto
a entrega ainda estava em voo. Portanto o pedido de desviar toda conta sem
filme já estava coberto e seria regressivo se aplicado como bloqueio.

### GATE DA R15 DISPARADO

**CONTRADIÇÃO:** a R15 prometeu que o lembrete salvo voltaria após o estado
terminal e definiu como parada “uma pessoa com checkout salvo ficar sem nenhuma
exposição após o filme”. A pessoa viva dispensou antes do filme; o `POST` gravou
o mesmo cookie de sete dias usado depois da entrega. O vídeo pronto mudou o
valor disponível, mas não mudava a dispensa. O gate de parada ocorreu no
primeiro caso observável.

### IMPLEMENTADO

- `lib/checkoutResumeSurface.ts`: política pura distingue `until_delivery` de
  dispensa persistente. Cookie legado e valor desconhecido continuam fechados.
- `app/api/stripe/checkout/resume/route.ts`: o `POST` consulta somente o total
  owner-scoped de filmes concluídos. Sem filme, a dispensa dura até a primeira
  entrega; com filme ou histórico indisponível, preserva os sete dias. O `GET`
  só reabre a dispensa pré-entrega após contagem confiável `>=1`, limpa o cookie
  e mantém todas as verificações de posse/assinatura/sessão Stripe.
- `components/CheckoutResumeBanner.tsx`: a reabertura emite
  `checkout_resume_reopened_after_delivery` e carrega apenas tier, billing e
  tipo de destino; nenhum id, título, URL ou conteúdo entra no evento.
- `docs/previews/CHECKOUT-RESUME-AFTER-DELIVERY-2026-09-04.html`: comparação
  antes/depois, desktop e mobile, sem depender de build.

### TESTADO LOCALMENTE

Pricing saved checkout **65/65** · own film **35/35** · delivery guard
**17/17** · human view **111/111** · TypeScript verde · `diff --check` limpo.
O navegador recusou `file://` por política de segurança; o preview estático foi
criado e aberto no painel de arquivo do Codex, sem contornar a restrição.

### VALIDADO EM PRODUÇÃO

**VALIDADO EM PRODUÇÃO — 2026-09-04 11:54 BRT:** commit funcional
`61e504d00b3196ffaa11713043cd7887abfb3f5e`; Guardião run `33885982030`
concluído com TypeScript e suíte verdes. A pista FLUXO avançou a `main` logo em
seguida para `716e87bdefbda89cf88df2e06e66ac1f646bc96a`; `git merge-base
--is-ancestor` confirmou `61e504d0` dentro dessa ponta. Deploy de produção
Vercel `Az4Gmg7fG6c4BNcMFyGKdmBvdDqP` Ready, origem `716e87bd`, ambiente
Production. O preview isolado do commit funcional também ficou Ready em
`DBaVqNTHXmrwfP33vKo7r2L6rJWp`.

### COMO MEDIR

`checkout_resume_banner_dismissed(has_personal_film=false)` → primeiro filme →
`checkout_resume_reopened_after_delivery` →
`checkout_resume_film_proof_loaded` → checkout → pagamento, por pessoa externa.
Separar de dispensas com `has_personal_film=true`, que continuam sete dias.

### GATE DE PARADA

Manter até 10 reaberturas externas ou 7 dias. Reverter se uma dispensa
pós-entrega reabrir, se histórico indisponível produzir nova exposição, se uma
conta sem filme voltar a ver o lembrete em outra página ou se o link explícito
`go=1` deixar de funcionar.

### RISCO

Baixo e reversível. Uma leitura exata de histórico acontece apenas quando a
pessoa dispensa o lembrete e, depois, em GETs passivos com o cookie
`until_delivery`. Falha de leitura respeita a dispensa. Nenhum preço, oferta,
crédito, sessão Stripe, filme ou dado persistente é alterado.

### PRÓXIMA JOGADA

Publicar, validar Guardião/deploy e observar a primeira reabertura real. Depois
voltar a uma superfície não congelada; não reeditar o K13 antes do gate.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

Quem fecha o lembrete antes de ver o resultado continua em paz enquanto o filme
não existe. Quando a prova chega, a escolha salva pode voltar uma vez mostrando
o próprio filme. Fechar depois disso continua silenciando por sete dias.

---

## ROUND 22 — crédito preso passa a mostrar progresso real do primeiro filme

**Data:** 2026-09-04 11:57→12:05 BRT

**Pista:** Growth-B2C / CAIXA, atendendo pedido explícito da pista Claude

**Branch:** `codex/caixa-held-progress-r22`

**SHA funcional:** `bc544477d7fd7a6539b8627b83498807eec0f058`

### PLACAR E VIGIA

- **EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 04/09/2026 11:58 BRT:** desde o marco de 03/09 16:00 UTC há 37 cadastros externos, 23 pessoas com filme, 2 checkouts com filme, 1 checkout sem filme, 0 assinaturas e 1 pessoa com falha sem filme.
- **EVIDÊNCIA DE PRODUÇÃO:** o vigia de checkout das últimas 2h continua com uma pessoa externa (`73bd3264`), origem `chatgpt`, 1 filme, 12 créditos, checkout Pro e nenhum pagamento. Ela recebeu o filme e concluiu o download; nenhuma objeção ou recusa de pagamento apareceu.
- **EVIDÊNCIA DE PRODUÇÃO — caso que decidiu a rodada:** a nova pessoa sem filme (`3cafd236`), origem TAAFT, iniciou o primeiro render às 11:42 BRT, bateu no crédito preso às 11:47, viu a sala de espera às 11:50 e manteve a página aberta emitindo rechecagens a cada 45 segundos. O servidor informou que o render tinha 4 minutos e ainda estava em voo. Esse é o primeiro caso vivo exato do pedido aberto do Claude.

### HIPÓTESE E MUDANÇA MÍNIMA

**HIPÓTESE:** a sala correta ainda parecia um erro parado porque descartava os campos estruturados `holdState` e `inFlight.minutesAgo` já devolvidos pelo servidor.

**IMPLEMENTADO:** `GenerateClient.tsx` aceita somente `in_flight|dead`, falha fechado para `unknown` e, apenas com prova `in_flight`, troca o título por “Your film is being made” e mostra “In progress for about N minutes”. Não existe porcentagem falsa, prazo de conclusão, novo retry, render automático, preço ou oferta. O evento existente ganhou `hold_state` e `minutes_ago`, sem conteúdo do filme.

**TESTADO LOCALMENTE:** sala de espera 38/38; contrato de crédito preso 115/115; money-truth 313/313; public-promo-truth 68/68; TypeScript verde; whitespace limpo. O teste antigo vermelho deixou de procurar a forma removida do JSX e agora prova a política `showGenericFailure`, a ordem de limpeza e o isolamento do estado em voo. Preview desktop/mobile conferido visualmente em `docs/previews/CREDITS-HELD-PROGRESS-2026-09-04.html`.

### COMO MEDIR E GATE

`credits_held_notice_shown(hold_state='in_flight')` → rechecagens → `credits_held_released` ou filme entregue. Comparar abandono em menos de 60 segundos e rechecagens por pessoa com a linha anterior. Reverter se `in_flight` aparecer sem `minutes_ago`, se estado `dead|unknown` receber linguagem de progresso, ou se a UI iniciar outro render automaticamente.

### RISCO E PEDIDO À OUTRA PISTA

**RISCO:** baixo e reversível; só apresenta dados que o servidor já calculou. O risco residual é o render realmente permanecer órfão — copy não entrega filme.

**EVIDÊNCIA DE PRODUÇÃO — 12:05 BRT:** o mesmo caso chegou a `stranded_composed` às 12:02, mas seguia com 0 vídeos concluídos e 12 créditos. Foi aberto pedido à pista Claude para decidir se é atraso esperado ou fechamento órfão; CAIXA não tocou no pipeline.

### VALIDADO EM PRODUÇÃO

**VALIDADO EM PRODUÇÃO — 04/09/2026 12:08 BRT:** `origin/main=a5da42b189fe63cc8dc552dcdc680f4432162c87`; o commit funcional `bc544477` é ancestral direto. Guardião run `33887518967` concluiu com TypeScript e suíte verdes. Vercel Production `EvnGq2kD8MwmVKXChCkoFg7gHGwd` ficou Ready em 1m07s, origem `a5da42b`; Preview `AqE3fDCbDRK5mxpNArbeRwz51WvN` também ficou Ready. Não houve render forçado nem gasto de crédito para validar a UI.

### PRÓXIMA JOGADA

Publicar e validar o estado visual. Congelar esta superfície até 10 pessoas externas em `in_flight` ou 7 dias; seguir para outro estágio do caixa.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

A pessoa que esperava o primeiro filme não vê mais uma falha vaga: vê que o filme está sendo feito e há quantos minutos, com a mesma rechecagem segura. O produto ainda precisa confirmar a entrega do caso vivo; isso foi encaminhado à pista correta sem mexer no render.

---

## ROUND 23 — duração efetiva aparece antes de aprovar o roteiro

**Data:** 2026-09-04 12:10→12:20 BRT

**Pista:** Growth-B2C / CAIXA, atendendo pedido explícito da pista Claude

**Branch:** `codex/caixa-effective-duration-r23`

**SHA funcional:** `fc427bd603d6cc547b922b8d12e24e93d0e8d677`

### RECONCILIAÇÃO E PLACAR

- **EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 04/09/2026 12:15 BRT:** desde o marco de 03/09 16:00 UTC há 37 cadastros externos, 24 pessoas com filme, 2 checkouts com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme.
- **EVIDÊNCIA DE PRODUÇÃO:** a pessoa TAAFT que estava em `stranded_composed` na R22 finalmente entrou no grupo com filme; `pessoas_com_filme` subiu de 23 para 24 e `pessoas_falha_sem_filme` voltou de 1 para 0. A correção visual da R22 ainda não tem amostra pós-deploy suficiente e permanece congelada.
- **EVIDÊNCIA DE PRODUÇÃO:** não houve pessoa externa no vigia de checkout das últimas 2h. Em 14 dias, 32 pessoas tiveram `script_expand_autostarted`, 15 tiveram `script_expand_failed` e 12 aceitaram a expansão; a razão de aceite atual é 12/32 pessoas, sem atribuição causal.

### HIPÓTESE E MUDANÇA MÍNIMA

**FATO CONFIRMADO:** `app/api/expand-script/route.ts` já devolvia `effectiveDuration` e `autofitDown`, mas `GenerateClient.tsx` descartava os dois campos. Quando o servidor aceitava um roteiro para 30s após pedido de 35s, o painel de aprovação não explicava a mudança.

**HIPÓTESE:** esconder a duração efetiva cria surpresa depois do aceite e contribui para abandono justamente entre pessoas que já superaram o bloqueio do roteiro.

**IMPLEMENTADO:** o painel “Read it before we render” mostra “You asked for 35s. This script fits 30s…” somente quando a resposta traz `autofitDown=true` e uma duração numérica menor. O cliente não muda o seletor nem altera o comportamento do render; apenas explica a decisão que o servidor já aplica. `script_expanded` e `script_expand_accepted` agora carregam duração pedida, duração efetiva e o booleano de descida, sem conteúdo do roteiro.

### TESTADO E VALIDADO

- **TESTADO LOCALMENTE:** contrato expansor+cliente 63/63; política de expansão 95/95; régua de narração 9/9; money-truth 313/313; public-promo-truth 68/68; TypeScript verde; whitespace limpo.
- **TESTADO VISUALMENTE:** comparação desktop conferida em `docs/previews/EXPANDED-SCRIPT-DURATION-TRUTH-2026-09-04.html`; aviso legível, ação principal preservada e sem preço/crédito.
- **VALIDADO EM PRODUÇÃO — 04/09/2026 12:19 BRT:** `origin/main=fc427bd603d6cc547b922b8d12e24e93d0e8d677`; Guardião run `33888661983` concluiu com sucesso em 1m14s. Vercel Production `dpl_A19ddGDuBwJbxoJr1SCyH9ZCpjBd` ficou `READY` para o mesmo SHA; preview `dpl_63ZHArumi8FMPgFU91Rat5Fhtd3K` também ficou `READY`.

### COMO MEDIR E GATE

`script_expanded(autofit_down=true)` → `script_expand_accepted(autofit_down=true)` → análise/filme/checkout/pagamento, por pessoa externa. Comparar aceite e abandono da aba em menos de 60 segundos com o baseline de 12 aceites entre 32 pessoas auto-iniciadas.

Congelar até 10 exposições externas ou 7 dias. Reverter se o aviso aparecer com `autofit_down=false`, se a duração efetiva for maior/igual à pedida, se o cliente mudar o seletor ou se um texto ainda curto ganhar aprovação.

### RISCO

Baixo e reversível. O aviso depende de dois campos estruturados do servidor e falha fechado. Nenhum preço, oferta, crédito, motor ou render foi alterado.

### PRÓXIMA JOGADA

Não reeditar esta superfície antes do gate. Na próxima rodada, reconciliar pedidos abertos novamente e escolher outra etapa do caixa com exposição mensurável.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

Quando o sistema precisa encaixar o roteiro numa duração menor, a pessoa agora sabe disso antes de aprovar. A mudança já está em produção, com Guardião e deploy verdes, e não altera o render nem o custo.

---

## ROUND 24 — medição pura · três entregas novas ainda sem exposição

**Data:** 2026-09-04 12:21→12:24 BRT

**Pista:** Growth-B2C / CAIXA

**Branch:** `codex/caixa-measurement-r24`

### PLACAR E VIGIA

**EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 04/09/2026 12:23 BRT:** desde o marco de 03/09 16:00 UTC há **37 cadastros externos, 24 pessoas com filme, 2 checkouts com filme, 1 checkout sem filme, 0 assinaturas e 0 pessoas com falha sem filme**. Não houve pessoa externa no vigia de checkout das últimas 2h.

### MEDIÇÃO DAS RODADAS 21–23

| entrega | pessoas expostas pós-deploy | filme depois | checkout depois | pago depois |
|---|---:|---:|---:|---:|
| R21 · checkout reaberto após primeira entrega | 0 | 0 | 0 | 0 |
| R22 · progresso real para crédito preso | 0 | 0 | 0 | 0 |
| R23 · duração efetiva antes do aceite | 0 | 0 | 0 | 0 |

**FATO CONFIRMADO:** as consultas usam o timestamp individual de cada deploy e contam pessoas externas distintas. R22 exige `hold_state='in_flight'`; R23 exige `autofit_down=true`. Evento, impressão, filme ou checkout não foi contado como assinatura.

### DECISÃO / GATE

Nenhuma mudança de produto. As três intervenções estão `VALIDADAS EM PRODUÇÃO`, mas ainda não têm uma única exposição humana pós-deploy; portanto não existe amostra para melhorar, reverter ou atribuir resultado. Permanecem congeladas até o gate próprio de 10 pessoas externas ou 7 dias.

O avanço de 23 para 24 pessoas com filme veio da entrega tardia do caso TAAFT já observado na R22, não de nenhuma dessas três interfaces novas. O placar continua com 0 assinatura; isso dói, mas não transforma ausência de amostra em causa.

### RISCO

Zero risco de produto e zero custo: somente SQL `SELECT` e documentação. O risco evitado foi empilhar uma quarta mensagem sobre superfícies que nenhum visitante elegível viu ainda.

### PRÓXIMA JOGADA

Reconciliar novamente os pedidos abertos e agir numa etapa do caixa que não esteja congelada. Se o vigia continuar vazio, escolher por impacto histórico e caller vivo, não por contagem de eventos.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

As três melhorias recentes estão no ar, mas ainda não passaram por uma pessoa elegível. Não confundi “publicado” com “provado”: mantive as variantes e preservei o aprendizado para a próxima entrada real.

---

## ROUND 25 — K4 auditado e redirecionado · o segundo download já recebe convite

**Data:** 2026-09-04 12:25→12:33 BRT

**Pista:** Growth-B2C / CAIXA

**Branch:** `codex/caixa-second-download-r25`

### PLACAR E VIGIA

**EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 04/09/2026 12:32 BRT:** desde o marco de 03/09 16:00 UTC há **39 cadastros externos, 24 pessoas com filme, 2 checkouts com filme, 2 checkouts sem filme, 0 assinaturas e 0 pessoas com falha sem filme**.

**EVIDÊNCIA DE PRODUÇÃO — vigia das últimas 2h:** uma pessoa externa (`9f2b563c`), origem direta, abriu checkout Pro dois segundos após concluir o cadastro. Tinha 25 créditos intactos, 0 filme e nenhum input registrado. Pela taxonomia vigente é `defeito` (0 filme + 0 input), mas não há evidência de falha técnica: a trilha é somente callback de autenticação → trial concedido → checkout. O caminho de primeira entrega já existe e não foi duplicado nem usado para bloquear a intenção explícita de pagar.

### O DADO QUE INVALIDOU A IMPLEMENTAÇÃO PLANEJADA

**EVIDÊNCIA DE PRODUÇÃO — 30 dias, pessoas externas:** 67 pessoas fizeram ao menos dois `video_downloaded` confirmados. No segundo download, 51 já viram alguma oferta próxima: 44 viram a oferta de trial e 10 a oferta free, com sobreposição. Doze abriram checkout nas 24h seguintes e uma confirmou pagamento depois do segundo download. Cinquenta e quatro segundos downloads ocorreram na tela final e 13 no `/history`.

**FATO CONFIRMADO:** `GenerateClient.tsx` já troca o card de exportação após o download e já mostra as escolhas existentes de assinatura/avulso. A superfície adicional `clean_export_direct_choices_viewed` teve 0 pessoas, porque suas condições não representam a coorte dominante de trial; isso não significa ausência de convite — `trial_post_video_offer_viewed` já cobre a maioria.

### DECISÃO / GATE

**CONTRADIÇÃO:** o cardápio K4 dizia que ninguém que baixa duas vezes é convidado. Produção mostra convite para 51/67 e 12 checkouts em 24h. Portanto, não foi criado outro card no Generate: seria oferta duplicada no mesmo momento e confundiria atribuição.

**QUESTÃO PENDENTE:** os 13 segundos downloads do `/history` não têm o mesmo caller visual. Como a tela e o contrato de download são da pista Claude, foi aberto um pedido preciso: sinalizar o segundo download confirmado no `/history`; depois, a CAIXA pode ligar um card próprio sem alterar o mecanismo de download.

Gate do K4: só implementar após esse sinal ou outra prova de ausência de oferta por pessoa. Medir sinal → card → checkout → pagamento; reverter se o card coexistir com oferta já visível na mesma sessão.

### RISCO

Zero risco de produto e zero custo: somente `SELECT` agregado e documentação. O risco evitado foi sobrepor uma nova caixa de venda a 51 pessoas que já receberam uma.

### PRÓXIMA JOGADA

Enquanto o pedido compartilhado aguarda a outra pista, atacar outro estágio CAIXA sem editar uma superfície congelada: procurar a próxima lacuna com caller vivo entre K9/K8/K11 e o checkout atual.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

O segundo download já abre a conversa de assinatura para a maioria; o problema não era “ninguém convidado”. Evitei uma oferta duplicada e isolei o buraco real: quem baixa de novo pelo histórico ainda não tem o mesmo gatilho. A pista responsável recebeu o pedido com medição exata.

---

## ROUND 26 — USD explícito dentro do checkout hospedado

**Data:** 2026-09-04 12:34→12:43 BRT

**Pista:** Growth-B2C / CAIXA

**Branch:** `codex/caixa-usd-checkout-r26`

### DADO QUE DOÍA E HIPÓTESE

**EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 04/09/2026:** nos últimos 14 dias, 44 pessoas externas tiveram uma primeira tentativa de checkout registrada; todas as tentativas com moeda conhecida foram USD e 3 pessoas confirmaram pagamento depois. A versão atual de orientação de pagamento chegou a 22 dessas pessoas e teve 2 pagamentos posteriores; isso é coorte temporal, não prova causal.

**FATO CONFIRMADO:** a página pública já declara que a Kineo lista e cobra planos em USD no mundo inteiro, mas a descrição sempre visível do produto dentro do Stripe dizia somente quais meios de pagamento usar. O último metro não repetia a moeda comercial que a pessoa tinha acabado de ler.

**HIPÓTESE:** a ausência de uma frase explícita de USD dentro do checkout cria uma pequena quebra de confiança para compradores internacionais quando o símbolo `$` é ambíguo. O fundador já decidiu cobrança somente em USD e pediu coerência no instante final; a mudança apresenta essa decisão, não cria outra.

### MUDANÇA MÍNIMA REVERSÍVEL

**IMPLEMENTADO:** `checkout_payment_guidance_v2` passa a começar a descrição do plano no Stripe com “Charged in USD worldwide.” O rótulo `USD` deriva de `CURRENCY_DISPLAY[resolveCheckoutCurrency(null)]`, a fonte canônica; não existe literal de preço, conversão automática ou moeda alternativa. A orientação já existente sobre cartão, Apple Pay, Google Pay e Link permanece byte a byte depois da nova frase.

Nenhum preço, cobrança, desconto, plano, crédito, SKU, meio de pagamento ou regra do Stripe foi alterado. A versão nova já é carregada nos eventos de tentativa, sessão e webhook, permitindo coorte limpa.

### TESTADO E PREVIEW

**TESTADO LOCALMENTE:** contrato de orientação do checkout 35/35; moeda canônica 7256/7256; money-truth 313/313; public-promo-truth 68/68; TypeScript verde; whitespace limpo.

**TESTADO VISUALMENTE:** desktop antes/depois conferido em `docs/previews/CHECKOUT-USD-TRUTH-2026-09-04.html`. A linha fica legível no produto do checkout e não muda hierarquia, botão ou valor.

### COMO MEDIR E GATE

`checkout_attempted(checkout_payment_guidance='checkout_payment_guidance_v2')` → `checkout_started` → cancelamento/expiração/pagamento, por pessoa externa. Comparar somente depois de 10 exposições com 24h completas ou 7 dias. Sucesso: maior proporção de `checkout_success_viewed`; sinais secundários: menor cancelamento/expiração. Reverter se a descrição exceder o limite do Stripe, ocultar informação de plano ou gerar erro de sessão.

### PLACAR E VIGIA

**EVIDÊNCIA DE PRODUÇÃO — corte de 12:32 BRT:** 39 cadastros externos, 24 pessoas com filme, 2 checkouts com filme, 2 sem filme, 0 assinaturas e 0 pessoas com falha sem filme desde o marco. O vigia de 2h tinha uma pessoa externa já descrita na R25; nenhuma nova trilha apareceu durante o desenho.

### RISCO

Baixo e reversível: somente uma frase de verdade comercial já aprovada dentro da descrição do checkout. Risco residual é a frase aumentar densidade visual; o preview mostra que continua curta, e o contrato trava o total abaixo de 500 caracteres.

### PRÓXIMA JOGADA

Publicar e validar a versão v2; depois congelar até o gate. Na rodada seguinte, medir uma superfície diferente ou atender um pedido novo sem reeditar checkout USD.

### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

### 📋 O QUE ACONTECEU

Quem sai da tabela em USD e chega ao Stripe agora lê dentro do próprio checkout que a cobrança é em USD. É uma correção de coerência no último segundo, sem mudar um centavo nem a forma de pagamento.
