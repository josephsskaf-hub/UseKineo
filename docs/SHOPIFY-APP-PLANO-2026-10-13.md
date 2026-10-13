# App da Kineo na Shopify App Store: plano técnico (ETAPAS 1 e 2)

KINEO-SHOPIFY-2026-10-13. Aprovação do fundador em 13/10/2026: vender o Studio Ads direto para lojistas pela Shopify App Store.
Branch: `codex/shopify-app-1310`. **Nada publicado, nada aplicado.** A flag `SHOPIFY_APP_LIVE` fica desligada: todas as rotas novas respondem 404.

---

## 1. Decisões técnicas, conferidas na documentação oficial (shopify.dev, lida em 13/10/2026)

| Tema | Decisão | Por quê (fonte) |
|---|---|---|
| Embutido ou não | **Embutido** (dentro do admin da Shopify, com App Bridge) | Requisito 2.2.2 da App Store: o que existe fora da plataforma precisa estar integrado ao admin. O requisito 2.2.3 pede o App Bridge mais recente, carregado antes de qualquer outro script. |
| Autenticação | **Instalação gerida pela Shopify + troca de token** (o token de sessão do App Bridge vira um token offline). O OAuth por código fica como **caminho reserva** (`/api/shopify/auth` e `/callback`). | O requisito 2.3.1 proíbe pedir ao lojista que digite a loja. O 2.3.2 exige autenticar logo depois da instalação. O app precisa funcionar sem cookie de terceiro (1.1.1), então a tela usa o token de sessão e não usa cookie. |
| Tipo de token | **Offline que expira** (`expiring=1`): vale 1 h, com refresh token de 90 dias | Doc "token exchange": app público novo não pode usar token offline sem validade na GraphQL Admin API. A partir de 01/01/2027, nenhum app público pode. |
| API | **Só GraphQL Admin API**, versão `2026-07` (constante em `lib/shopify/core.ts`) | Requisito 2.2.4: app público novo usa só GraphQL. |
| Escopos | **`read_products`** (mínimo). Anexar o vídeo ao produto (etapa 2) pede **`write_products,write_files`**, que entram como escopo **opcional** | Requisito 3.2: pedir só o necessário e usar escopo opcional quando nem todo lojista precisa. A doc "product media" exige `write_files` para `fileCreate`. |
| Cobrança | **Shopify App Pricing** (cobrança gerida pela Shopify): planos cadastrados no formulário de envio, sem código de cobrança. O uso extra é cobrado por **App Events API** (medidor). | É o padrão para app público novo. A Billing API manual (`appSubscriptionCreate`) ficou para apps antigos e modelos de preço fora do comum. O requisito 1.2.1 proíbe cobrança fora da Shopify, então a Stripe fica fora deste app. |
| Plano atual | O retorno da página de planos traz `plan_handle` e `shop` na URL. Para cancelamento e congelamento, a fonte é a Partner API `activeSubscription(appId, shopId)` | Apps inscritos depois de abril de 2026 **não recebem** o webhook `APP_SUBSCRIPTIONS_UPDATE` (doc "managed pricing"). |
| Webhooks | `customers/data_request`, `customers/redact`, `shop/redact` (obrigatórios) + `app/uninstalled`, todos em `/api/shopify/webhooks` | Doc "privacy law compliance": app sem esses três webhooks é **reprovado**. Assinatura inválida responde 401. A ação precisa ser cumprida em até 30 dias. O `shop/redact` chega 48 h depois da desinstalação. |
| Verificação | Webhook: `X-Shopify-Hmac-Sha256` = base64 de HMAC-SHA256 sobre o corpo **cru**. OAuth: HMAC-SHA256 em hex dos parâmetros em ordem alfabética, sem o `hmac`. Sessão: JWT HS256, com `aud` = client id, `iss` e `dest` no mesmo host, e `exp`/`nbf`. | Docs "webhooks/https", "authorization code grant" e "session tokens". Toda comparação é em tempo constante. A loja é validada pela regex ancorada `^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$`. |
| Tempo de resposta do webhook | Conexão em 1 s e resposta em 5 s, senão a Shopify reenvia 8 vezes em 4 h. Idempotência pelo `X-Shopify-Webhook-Id`. | Doc "webhooks/https". |
| Biblioteca | **Nenhuma dependência nova.** Só `fetch` e `node:crypto`. App Bridge e Polaris (web components) carregam do CDN da Shopify. | O `@shopify/shopify-api` só faria HMAC, JWT e troca de token, que somam umas 150 linhas puras e testadas no guardião. A biblioteca também traz um adaptador de sessão e um runtime que não usamos. Reavaliar se a etapa 2 precisar de muita coisa da Admin API. |

---

## 2. Arquitetura

```
Lojista no admin da Shopify
  └─ abre "Kineo Ads" (iframe) → GET https://www.usekineo.com/shopify/app?shop=…&host=…&hmac=…
       · interruptor → credenciais → loja (regex) → hmac (se veio) → HTML com App Bridge + Polaris
       · CSP frame-ancestors https://<loja> https://admin.shopify.com
  └─ a tela pede shopify.idToken() e chama:
       GET  /api/shopify/products   (Bearer <token de sessão>)
            → verifica o JWT → loja → token da loja (guardado | refresh | troca de token) → GraphQL products(first:25)
       POST /api/shopify/ads {product_id}
            → verifica o JWT → product(id){onlineStoreUrl} → devolve https://www.usekineo.com/shopify/open?link=<página do produto>
  └─ "Make a 15-second ad" abre uma aba nova em /shopify/open
       → sem login na Kineo: /login?redirect=/shopify/open?link=… (o link sobrevive ao login)
       → com login: /ads/v2?from=shopify&link=…  → o modo simples põe o link no campo e lê as fotos
         (/api/ads/v2/link-import → /plan → /start: moderação, cota, saldo e amostra grátis como sempre)

Shopify → POST /api/shopify/webhooks (HMAC do corpo cru)
  app/uninstalled → apaga os tokens na hora, status 'uninstalled'
  shop/redact     → apaga a linha da loja
  customers/*     → nada guardado do cliente final, só registra o evento (sem e-mail nem telefone)
```

### Etapa 1 (código nesta branch) e etapa 2 (antes de enviar à revisão)

A etapa 1 já prova que a ponte funciona: instalar, ler o produto e abrir o Studio Ads com as fotos.

A etapa 2 é **obrigatória para a revisão**. Pelo requisito 2.2.2, o anúncio precisa nascer **dentro** do admin:
1. **Conta Kineo da loja.** Na primeira abertura, cria (ou vincula) uma conta Kineo para a loja (`shopify_shops.owner_user_id`) com o e-mail do dono da loja (`shop { email }`). O crédito do plano cai nela.
2. **Pedido criado no servidor.** `POST /api/shopify/ads` passa a montar o pedido `ads_v2_orders` na conta da loja, com as fotos do produto (as URLs do CDN da Shopify baixadas para `user-footage/<uid>/`, o mesmo caminho do link-import). Depois chama o plano e o início pelas mesmas funções de `lib/ads/v2Advance.ts`. As travas de hoje continuam valendo: moderação, saldo, débito confirmado e um anúncio ativo por vez. Isso pede extrair do `/api/ads/v2/plan` e do `/start` uma função que receba o `uid` em vez de ler o cookie do Supabase.
3. **Progresso e entrega na tela embutida.** Polling em `/api/shopify/ads/status`, `<video>` com o MP4 e botão de download.
4. **Opcional: "Add to product media".** Com o escopo opcional `write_products,write_files`: `stagedUploadsCreate` (VIDEO, mp4) → upload → `fileCreate` → espera o `fileStatus=READY` → anexa ao produto. Limites: 1 GB, 10 min, 1.000 vídeos por loja por semana.
5. **Cobrança.** Planos na Shopify App Pricing e o medidor `extra_ad` via App Events API. O crédito mensal é concedido quando o `plan_handle` volta da página de planos, e o vigia diário confere a `activeSubscription` na Partner API.

---

## 3. Modelo de dados (migration devolvida, NÃO aplicada)

Arquivo: `supabase/migrations/20261013200000_shopify_shops.sql`

- `shopify_shops`: `shop_domain` (único, com a mesma regex), `access_token_enc`, `refresh_token_enc`, as datas de validade de cada um, `scopes`, `owner_user_id → profiles(id)`, `plan_handle`, `plan_status` (none/trial/active/frozen/cancelled), `status` (installed/uninstalled), `installed_at`, `uninstalled_at` e `updated_at`.
- `shopify_webhook_receipts`: `webhook_id` (PK, idempotência), `topic`, `shop_domain` e `received_at`.
- RLS ligado e **nenhuma policy**. `anon`, `authenticated` e `public` têm `revoke all`, e só a `service_role` acessa.
- O token fica **cifrado** com AES-256-GCM, usando a chave `SHOPIFY_TOKEN_ENC_KEY` da Vercel. Sem essa chave, o app não grava o token: falha fechada.
- **Vínculo com o Business:** a loja aponta para **uma** conta Kineo (`owner_user_id`). Se essa conta for dona de um workspace Business (`lib/ads/workspace.ts`), os membros da equipe dela já agem no mesmo saldo pelo site. A loja não vira membro, ela **é** a conta dona.

---

## 4. Planos via Shopify App Pricing (APROVADOS pelo fundador em 13/10 — ver a seção 9 para handles e textos)

Base: o Business de hoje sai a US$ 84 por 500 cr. Um anúncio Commercial de 15 s custa 41 cr, então o plano dá 12 anúncios (`lib/businessPlan.ts`).

| Plano (handle) | Preço/mês | Créditos | Anúncios Commercial 15 s | Observação |
|---|---|---|---|---|
| Free (`free`) | US$ 0 | — | 1 amostra (a amostra grátis de hoje) | A instalação é grátis e a pessoa vê o resultado antes de pagar |
| Shop Starter (`starter`) | US$ 29 | 170 | 4 | Mesmo preço por crédito do Business (US$ 0,17/cr) |
| Shop Business (`business`) | US$ 84 | 500 | 12 | Espelha o Business do site |
| Uso extra (medidor `extra_ad`) | US$ 7 por anúncio | — | — | Só nos planos pagos. A App Pricing **não tem teto de uso**, então o teto é nosso, no código. |

- **Repasse:** 0% sobre o primeiro US$ 1 mi de receita bruta **por ano**, depois 15%. Isso só vale se o fundador **se inscrever no plano de repasse reduzido** no Partner Dashboard. Sem a inscrição, o padrão é **20%**.
- **Anual:** a App Pricing aceita plano anual ou mensal com desconto no anual. O uso extra é cobrado só mês a mês.
- **Teste em loja de desenvolvimento** da mesma organização: os planos pagos saem a US$ 0.

---

## 5. Passo a passo do FUNDADOR (eu não crio conta, não aceito termos, não preencho formulário)

1. **Conta Partner.** Criar em partners.shopify.com (US$ 19, cobrança única) e **inscrever-se no plano de repasse reduzido** (0% até US$ 1 mi). Cadastrar o **contato técnico de emergência** (exigência 4.5.6).
2. **Loja de desenvolvimento.** No Partner Dashboard: Stores → Add store → **Development store**. Criar 3 produtos publicados na loja online, com fotos.
3. **Criar o app** (Dev Dashboard / Apps → Create app → "Kineo Ads", distribuição **Public**). Colar estes valores:
   - **App URL:** `https://www.usekineo.com/shopify/app`
   - **Embedded in Shopify admin:** sim
   - **Allowed redirection URL:** `https://www.usekineo.com/api/shopify/auth/callback`
   - **Access scopes:** `read_products`. Opcionais na etapa 2: `write_products,write_files`.
   - **Use Shopify managed installation:** sim
   - **Webhooks (API version 2026-07):** `app/uninstalled` → `https://www.usekineo.com/api/shopify/webhooks`
   - **Compliance webhooks:** os três (`customers/data_request`, `customers/redact`, `shop/redact`) → `https://www.usekineo.com/api/shopify/webhooks`
   - O arquivo `shopify/shopify.app.toml` desta branch tem os mesmos valores, prontos para o `shopify app deploy` se preferir a CLI.
4. **Variáveis na Vercel** (Production). O fundador cola os valores, eu nunca os vejo:
   - `SHOPIFY_API_KEY` = Client ID
   - `SHOPIFY_API_SECRET` = Client secret
   - `SHOPIFY_TOKEN_ENC_KEY` = 32 bytes aleatórios em base64. Para gerar no terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Copiar o resultado direto para a Vercel e não guardar em lugar nenhum.
   - `SHOPIFY_APP_LIVE` = `false` (só vira `true` no dia do teste na loja de desenvolvimento)
5. **Dizer "vai shopify"** para eu: (a) aplicar a migration, (b) integrar a branch na fila, (c) depois do deploy, virar `SHOPIFY_APP_LIVE=true` e instalar na loja de desenvolvimento.
6. **Planos.** No formulário de envio, em Pricing: cadastrar os planos da seção 4, ou os que decidir.
7. **Listagem.** Nome "Kineo Ads" (o nome "Kineo" sozinho tem homônimo no Product Hunt). Ícone de 1200×1200 sem preço. Capturas de tela da **interface real**, sem moldura de navegador nem preço na imagem. **Screencast** em inglês mostrando instalação → escolha do produto → anúncio pronto. **Política de privacidade** (https://www.usekineo.com/privacy, com um parágrafo Shopify que eu escrevo). Credenciais de teste válidas para o revisor.
8. **Enviar** no botão "Submit your app".

---

## 6. Prazo realista até a submissão

| Fase | Duração |
|---|---|
| Fundador: conta Partner, loja de desenvolvimento, app e variáveis | 1 dia |
| Etapa 1 no ar em loja de desenvolvimento (esta branch + migration + flag) | 1 dia |
| Etapa 2: pedido no servidor, conta da loja, progresso e entrega no embutido, App Pricing e crédito do plano | 5–7 dias de trabalho |
| Anexar à mídia do produto (opcional, pode ficar para a v1.1) | 1–2 dias |
| Polimento para a revisão (Polaris, estados vazios e de erro, Web Vitals do admin, política de privacidade) + screencast + listagem | 2–3 dias |
| **Até o envio** | **≈ 2 a 2,5 semanas** |
| Fila de revisão da Shopify (relatos de 2026 no fórum oficial: 2–6 semanas, com rodadas "Paused" de correção) | **+ 4–6 semanas** |
| **Até aparecer na App Store** | **≈ 6–9 semanas** (final de novembro a meados de dezembro de 2026) |

---

## 7. Riscos

1. **Revisão lenta e imprevisível.** O fórum da Shopify tem um aviso oficial de "review times longer than usual". Há relatos de mais de 30 dias só em "assigning a reviewer". Não prometer data de lançamento ao mercado.
2. **Reprovação por sair do admin.** Com a etapa 1 sozinha (abrir o site numa aba nova), o app **seria reprovado** pelo requisito 2.2.2. A etapa 2 é obrigatória antes do envio.
3. **Conta externa.** Nenhum requisito proíbe login próprio (o 4.5.4 até pede credencial para o revisor), mas pedir cadastro na Kineo derruba a instalação. O desenho da etapa 2 cria a conta da loja sozinho.
4. **Cobrança dupla.** Um lojista que já assina pela Stripe e instala o app vai ter duas assinaturas. A regra proposta: conta vinculada à loja usa só o plano da Shopify, e a tela avisa quem já tem Stripe.
5. **Sem webhook de assinatura.** Apps novos não recebem `APP_SUBSCRIPTIONS_UPDATE`. Cancelamento e congelamento só aparecem pela Partner API, então precisamos de um vigia diário que releia `activeSubscription` antes de conceder crédito no mês.
6. **Custo de fal sem teto.** A App Pricing não tem teto de uso. Precisamos de teto por loja e por dia no código, como a amostra já tem.
7. **Token offline expira em 1 h.** A renovação já está implementada. Se o refresh falhar (refresh vencido em 90 dias de inatividade), a próxima abertura do app refaz a troca pelo token de sessão. Já o trabalho em segundo plano (anexar o vídeo depois do render) precisa de um token válido no momento da entrega.
8. **Polaris web components.** O CDN `cdn.shopify.com/shopifycloud/polaris.js` e as tags `s-page`, `s-section`, `s-button` e `s-text-field` precisam ser conferidos na loja de desenvolvimento. Se uma tag não renderizar, a tela continua usável com HTML puro, mas a aparência perde pontos na revisão.
9. **Privacidade.** Hoje não guardamos dado de cliente final da loja, por isso `customers/*` só registra o evento. Se um dia lermos pedidos ou clientes, esses dois webhooks passam a apagar ou exportar em até 30 dias. Isso também exige o pedido de "protected customer data".
10. **Nome.** "Kineo" tem homônimo (kineo.studio, no Product Hunt). O requisito 4.1.2 barra nome confundível, então usar "Kineo Ads" e não "Kineo".

---

## 8. Arquivos desta branch

- `lib/shopify/core.ts`: núcleo puro (interruptor, credenciais, as 3 provas de origem, cifra, redator de log). O guardião importa este arquivo de verdade.
- `lib/shopify/server.ts`: banco, troca e renovação de token, GraphQL Admin, idempotência de webhook.
- `app/api/shopify/auth/route.ts` e `app/api/shopify/auth/callback/route.ts`: OAuth por código (reserva).
- `app/api/shopify/webhooks/route.ts`: os 3 webhooks de privacidade + `app/uninstalled`.
- `app/api/shopify/products/route.ts` e `app/api/shopify/ads/route.ts`: dados da tela embutida (token de sessão).
- `app/shopify/app/route.ts`: a tela embutida (HTML + App Bridge + Polaris, sem layout do site).
- `app/shopify/open/route.ts`: a porta de login → `/ads/v2?from=shopify&link=…`.
- `app/(dashboard)/ads/v2/AdsV2Simple.tsx`: lê `?from=shopify&link=` uma vez e importa as fotos.
- `supabase/migrations/20261013200000_shopify_shops.sql`: devolvida, **não aplicada**.
- `shopify/shopify.app.toml`: modelo de configuração do app (falta o client_id).
- `scripts/test-shopify-app-1310.mjs`: guardião.

Fontes: shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange · …/authorization-code-grant · …/session-tokens · shopify.dev/docs/apps/build/compliance/privacy-law-compliance · shopify.dev/docs/apps/build/webhooks/subscribe/https · shopify.dev/docs/apps/launch/billing · …/billing/managed-pricing · shopify.dev/docs/apps/build/app-events/send-events · shopify.dev/docs/apps/build/online-store/product-media · shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements · shopify.dev/docs/apps/launch/app-store-review/review-process · shopify.dev/docs/apps/launch/distribution/revenue-share · community.shopify.dev ("Longer App Store Review Times", 2026).

---

## 9. ETAPA 2 (13/10/2026) — o anúncio nasce DENTRO do admin (requisito 2.2.2)

Aprovação do fundador em 13/10: seguir para a etapa 2 com os preços Free (1 amostra) · Shop Starter US$ 29/mês 170 cr ·
Shop Business US$ 84/mês 500 cr · anúncio extra US$ 7 (uso, teto no nosso código). Acréscimos aprovados no mesmo dia ("tudo sim"):
posicionamento "1 anúncio novo por semana", "Add to product page", pedido de avaliação sem incentivo e rótulo "Made with AI".

### 9.1 Fluxo do lojista

1. Instala o "Kineo Ads" (instalação gerida pela Shopify) e abre o app no admin.
2. Na primeira abertura, a tela pede `/api/shopify/account`: a porta da loja (`lib/shopify/request.ts`) confere o token de sessão,
   obtém o token da loja e cria **ou vincula** a conta Kineo da loja (`lib/shopify/account.ts`):
   - e-mail = `shop.email` (Admin API); quem abriu é lido por uma troca de token **online** (`associated_user`, nunca guardado);
   - não há conta com o e-mail → cria (sem senha; confirmada só se a Shopify provar o e-mail de quem abriu);
   - já há conta com o e-mail → **vincula** (nunca duplica), mas só com a prova (`email_verified` + mesmo e-mail). Sem a prova,
     403 `unverified_owner`: senão quem cria uma loja com o e-mail de outra pessoa gastaria os créditos dela;
   - o vínculo é condicional (`owner_user_id is null`): duas aberturas juntas nunca vinculam duas contas.
3. A tela mostra o plano com a promessa dele (Free "1 free sample ad" · Starter "A new ad for your product every week" ·
   Business "12 ads a month"), o saldo, e o botão **Plans** (abre a página de planos da App Pricing no topo do admin).
   Plano pago, saldo para um Commercial e nenhum anúncio começado em 7 dias → "Your weekly ad is ready to make" (só no app).
4. Escolhe um produto → nível (Free: só Photo motion, a amostra) e estilo → **Write my ad**: `POST /api/shopify/ads {action:'plan'}`
   - fotos do produto pela Admin API já recortadas em 9:16 pelo CDN da Shopify (transform crop CENTER 1080×1920 JPG), só
     `cdn.shopify.com`, baixadas pela MESMA porta SSRF do link-import (`adsV2FetchImage` → `safeGet`), moderadas e gravadas em
     `user-footage/<uid>/` (quarentena se barradas), na cota da conta;
   - cartão final desenhado no servidor (`lib/shopify/card.tsx`, next/og, mesma zona segura do `drawEndCard`), moderado e gravado;
   - rascunho pelo MESMO contrato do `POST /api/ads/v2/orders` (`sanitizeCreateOrderBody`, modo simples, 15 s, setor loja);
   - `adsV2PlanFor` = o corpo do `/api/ads/v2/plan` (moderação, teto do dia, amostra, posse das fotos, régua anti-invenção).
   A tela mostra o texto (voz + frases) e o custo ANTES de gastar.
5. **Generate**: `POST /api/shopify/ads {action:'start', order_id}` → `adsV2StartFor` = o corpo do `/api/ads/v2/start` (saldo,
   trava, `chargeAdsV2`, amostra sem débito, estorno por `failAdsV2Order`). Plano pago sem saldo: o botão diz
   "extra ad US$ 7"; com o clique explícito, `chargeExtraAd` (abaixo) e depois o mesmo `adsV2StartFor`.
6. Andamento: `GET /api/shopify/ads/status` a cada 6 s (o mesmo motor de avanço do site e do cron) → o MP4 do nosso storage toca
   na tela, com o rótulo **"Made with AI"**, **Download MP4** e **Add to product page**.
7. **Add to product page** (`POST /api/shopify/ads/attach`): confere AO VIVO os escopos (`currentAppInstallation.accessScopes`);
   sem `write_products,write_files` → 403 `scope_missing` e a tela pede os escopos OPCIONAIS (`shopify.scopes.request`) só
   nesse clique; com eles: `stagedUploadsCreate` → upload do MP4 → `productUpdate(product, media)`. `SHOPIFY_ATTACH_MEDIA=false`
   desliga o botão. ⚠ Não exercitado ainda: validar na loja de desenvolvimento.
8. Depois do 1º anúncio entregue: cartão "Enjoying Kineo Ads? Leave a review" → `SHOPIFY_APP_STORE_URL` (só `apps.shopify.com`;
   sem a env o cartão não aparece). Nenhum incentivo oferecido (regra da Shopify).

### 9.2 Função extraída (sem caminho paralelo de dinheiro)

- `lib/ads/v2PlanCore.ts` `adsV2PlanFor(user, access, readBody, started)` e `lib/ads/v2StartCore.ts` `adsV2StartFor(...)`: o corpo das
  duas rotas copiado linha a linha por script. As rotas `/api/ads/v2/plan` e `/start` leem o cookie + `loadAdsAccess(..., { workspace:
  true })` e chamam o núcleo. Prova: `scripts/test-support/shopify-extracao-v2-1310.mjs` remonta, dos dois arquivos de hoje, o texto
  EXATO das rotas de antes (sha-256 igual ao de c6c414e7); os 16 guardiões do ads v2 seguem verdes (re-ancorados para ler rota + núcleo
  e mutar o núcleo) e os de impressão digital do `/start` (ator, estilos, ux-marca) seguem com o MESMO hash de antes.
- Acesso da conta da loja (`shopAdsAccess`): o da própria conta (`loadAdsAccess`, conta pessoal); se for `none`, plano PAGO ativo da loja
  (fora de loja de desenvolvimento) vale `subscriber`. O plano da Shopify **nunca** escreve `profiles.plan` (a conta pode ser de quem
  já assina pela Stripe).

### 9.3 Cobrança e créditos

- **Planos** (formulário de envio, Pricing): handles `free`, `shop-starter`, `shop-business` (o código também aceita `starter`/`business`).
  Starter = 170 cr = 4 anúncios Commercial de 15 s (41 cr); Business = 500 cr = 12. Uso extra: medidor `extra_ad`, US$ 7, só pagos.
- **Plano atual**: nunca da URL. O `plan_handle` do retorno só dispara a releitura na Partner API (`activeSubscription(appId, shopId)`),
  feita por `syncShopPlan` (tela a cada 10 min, retorno da página de planos e o cron diário).
- **Crédito do ciclo**: `decideCycleGrant` (puro) concede só assinatura ativa, paga, conhecida, fora do teste grátis, com ciclo lido, fora
  de loja de desenvolvimento (salvo `SHOPIFY_TEST_SHOPS`). Chave = loja + início do ciclo (anual: um mês por vez). A função SQL
  `shopify_grant_credits` grava o recibo (PK loja + ciclo) e soma o crédito na MESMA transação — tela, retorno e cron juntos somam uma vez.
  Crédito é SOMADO (não zera o saldo: a conta pode ter créditos da Stripe).
- **Anúncio extra** (`chargeExtraAd`): reserva a linha em `shopify_usage_charges` (chave = o pedido) → confere os tetos contando a própria
  reserva (3/dia, 20/mês por loja; só até 41 cr — Cinema fica fora) → 1 evento no App Events API (`POST https://api.shopify.com/app/2026-10/events`,
  token por client credentials, `idempotency_key` = a chave) → só com 202 concede os créditos do anúncio (`extra:<pedido>`, idempotente) →
  o `/start` de sempre debita. Recusado = `failed` (não conta, nenhum crédito). Repetir o pedido nunca manda outro evento.
- **Free** = a amostra grátis do Studio Ads (`lib/ads/sample.ts`, uma por conta, Photo motion 15 s, teto global do dia).

### 9.4 SQL novo (DEVOLVIDO, NÃO aplicado)

`supabase/migrations/20261013210000_shopify_etapa2.sql` (aplicar DEPOIS de `20261013200000_shopify_shops.sql`):
colunas `shop_gid`, `partner_development`, `plan_checked_at` em `shopify_shops`; tabelas `shopify_credit_grants` (PK loja + ciclo) e
`shopify_usage_charges` (chave única, status pending/sent/failed, dia/mês); função `shopify_grant_credits` (SECURITY DEFINER, só
`service_role`); RLS ligado, nenhuma policy, `anon`/`authenticated` sem privilégio.

### 9.5 Variáveis novas (Vercel, o fundador cola; eu nunca vejo)

| Variável | Para quê | Sem ela |
|---|---|---|
| `SHOPIFY_PARTNER_ORG_ID` | id numérico da organização Partner | nenhum crédito de plano (falha fechada) |
| `SHOPIFY_PARTNER_API_TOKEN` | token da Partner API (Partner Dashboard → Settings → Partner API clients, permissão "Manage apps") | idem |
| `SHOPIFY_APP_GID` | `gid://partners/App/<id>` do app | idem |
| `SHOPIFY_APP_HANDLE` | o handle do app na URL da página de planos | usa `kineo-ads` |
| `SHOPIFY_TEST_SHOPS` | lojas de desenvolvimento do fundador que podem ganhar o crédito do plano de teste (vírgula) | dev store nunca ganha crédito |
| `SHOPIFY_APP_STORE_URL` | página do app na App Store (`https://apps.shopify.com/...`) | o cartão de avaliação não aparece |
| `SHOPIFY_ATTACH_MEDIA` | `false` desliga o "Add to product page" | ligado |

**Cron** (entra no `vercel.json` no dia do "vai shopify", não antes):
`{ "path": "/api/cron/shopify-plans", "schedule": "17 9 * * *" }` — com o interruptor desligado responde 404.

### 9.6 Listagem (regra da FTC e posicionamento)

- Posicionamento: Starter = "A new ad for your product every week"; Business = "12 ads a month"; Free = "1 free sample ad".
  Nunca "unlimited".
- A listagem NÃO promete "UGC" nem "testimonial": a pessoa de IA do anúncio não fala como cliente (conserto em outra branch, lib/ads).
  O anúncio pronto mostra "Made with AI" na tela.
- Pedido de avaliação sem incentivo (nada de crédito em troca).

### 9.7 O que falta até a submissão

1. Fundador: conta Partner + loja de desenvolvimento + app + variáveis (seção 5 e 9.5) + planos no formulário (handles da 9.3).
2. "vai shopify": aplicar as 2 migrations, integrar a branch, ligar `SHOPIFY_APP_LIVE=true` só na dev store, pôr o cron.
3. Validar na loja de desenvolvimento: instalação → conta criada → amostra → plano de teste (dev store na `SHOPIFY_TEST_SHOPS`) →
   crédito do ciclo → anúncio pago → extra de US$ 7 (na dev store sai a US$ 0) → "Add to product page" → desinstalar → webhooks.
4. Polaris: conferir `s-page`/`s-section`/`s-button`/`s-text-field` na loja; estados vazios e de erro; Web Vitals do admin.
5. Listagem: nome "Kineo Ads", ícone 1200×1200, capturas da interface real, **screencast** em inglês (instalar → escolher produto →
   anúncio pronto tocando no admin → Add to product page), **política de privacidade** com o parágrafo Shopify, credenciais do revisor.
6. Enviar ("Submit your app").
