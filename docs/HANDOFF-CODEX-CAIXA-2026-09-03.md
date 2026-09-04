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
