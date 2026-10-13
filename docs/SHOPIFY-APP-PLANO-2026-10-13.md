# App da Kineo na Shopify App Store: plano técnico (ETAPA 1)

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

## 4. Planos via Shopify App Pricing (PROPOSTA: o preço é decisão do fundador)

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
