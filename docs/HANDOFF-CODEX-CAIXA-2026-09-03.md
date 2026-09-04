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
