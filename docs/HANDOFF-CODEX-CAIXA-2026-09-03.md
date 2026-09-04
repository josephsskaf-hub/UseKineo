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
