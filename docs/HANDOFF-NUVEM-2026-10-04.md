# HANDOFF — sessão Nuvem (B2B · SEO/AEO · Laços), 02→04/10/2026

Branch: `codex/nuvem-b2b-seo-lacos-0210` (a partir de `origin/main` 6ac5d2b). PR em rascunho:
https://github.com/josephsskaf-hub/UseKineo/pull/51. **Nada publicado e nenhum render pago.** O Claude local revisa,
testa com render real e publica.

Meta da sessão: 50 assinantes. O fato que orientou as escolhas foi este: 7 dos 9 últimos pagantes pagaram na primeira
hora, sem fazer vídeo, e vieram sobretudo do ChatGPT. Por isso as entregas priorizam portas que um motor de resposta
consegue citar, a atribuição de onde a pessoa pousou, os eventos do MCP do ChatGPT e o produto B2B que uma empresa
consegue comprar sozinha.

Áreas que não foram tocadas porque são da sessão Board/GPT: `lib/admin`, `app/admin`, `app/api/cron`, `vercel.json`,
`app/api/stripe`, `lib/checkoutPricing.ts`, `StudioClient`/`GenerateClient` e `lib/lifecycle`.

`npm ci` rodou na raiz e passou de primeira (sem precisar de `npm install`).

---

## O que foi feito, item por item

### A) B2B e produtos

| Item | Commit | O que mudou |
|---|---|---|
| A1 | d7735bc, 104190e (mapa: 9926365) | Três portas públicas e indexáveis, fora de `(dashboard)`, com uma moldura comum em `components/ProductDoor.tsx`. Detalhes de cada uma abaixo da tabela. As três entram no sitemap, no rodapé, no `llms.txt` e no `/api/facts` pelo catálogo `lib/growth/productLandingPages.ts`. A de atriz/mascote só entra no llms/facts quando `PRODUCAO_PUBLIC` estiver ligado. |
| A2 | b227b29 | Logo da conta em todo produto. Detalhes abaixo da tabela. Sem `place`, o elemento do logo sai idêntico ao de 01/10: o compose não muda. |
| A3 | 6668dd9 | Produção pronta para assinantes. Detalhes abaixo da tabela. |
| A4 | 29bddd5 | Card **"Kineo Business"**: é o plano Studio, sem preço novo. Detalhes abaixo da tabela. |
| A5 | 53749d7 | Espaços com **vários destinos**. Detalhes abaixo da tabela. |
| A6 | b7e2e2e | `spaces_montage_submitted` entrou em `SERVER_ONLY_EVENTS`: era a prova de dono do GET da montagem e o navegador conseguia forjá-la. A migration `supabase/migrations/20261002120000_ads_v2_orders.sql` traz o estado final das 3 tabelas do v2. Detalhes abaixo da tabela. |

**A1 — as três portas**
- **`/ai-virtual-staging-video` (Spaces)**
  - Os 3 pares antes→depois da casa vêm de `SHOWCASE_MEDIA.spaces`.
  - Preço em créditos: foto Nano Banana Pro (5) + clipe Kling 2.5 (`clipCreditCost('kling', 5)`), por foto.
  - Selo honesto: "ilustração feita com IA" e "Presented by" você.
- **`/ai-video-clip-generator` (Clips)**
  - A tabela de preço sai de `offeredSecondsFor × clipCreditCost`.
  - Só aparecem motores fora da pausa; o S25 só aparece com `S25_PUBLIC`.
- **`/ai-actor-ads` (atriz de IA / mascote)**
  - Etapas e preços vêm de `lib/ads/producao.ts`; os vídeos são os da casa (`SHOWCASE_MEDIA.ads`).
  - O botão só aponta para `/ads/producao` com `PRODUCAO_PUBLIC=true`. Enquanto estiver fechado, aponta para Kineo Empresas (nunca para uma porta 404).
  - Aviso na página: "ator de IA não é cliente real".

**A2 — logo da conta em todo produto**
- `lib/brandLogo` ganhou `place {until, y}`.
- **Espaços:** o logo entra a 19%, abaixo do rótulo ANTES/DEPOIS.
- **Ads v2:** o logo aparece só durante os planos. O cartão final já tem o logo, então não duplica.
- **Clips:** o clipe não tem montagem, então nasceu uma passada própria.
  - Rota `/api/clips/brand`: cópia no Creatomate, salva no nosso storage, 1 envio por clipe, prova de dono pelo evento só de servidor `clip_brand_submitted`.
  - Botão "Add my logo" em 16 línguas.
  - Fica atrás de `CLIPS_BRAND_LOGO_PUBLIC=false` (a casa vê) e não cobra crédito.

**A3 — Produção pronta para assinantes**
- `PRODUCAO_PUBLIC` continua `false`.
- **Montagem:** `PRODUCAO_MONTAGE_CREDITS = 2` (proposta), atrás de `PRODUCAO_MONTAGE_CHARGE_LIVE=false`.
  - Com a cobrança ligada, o débito segue o padrão do `v2Billing`: intenção → saldo → débito → reler o ledger, sempre antes do envio.
  - Se o envio falhar, estorna na hora. Se o Creatomate falhar, estorna no GET.
  - Chave `prodmont-<hash(conta, clique)>`: o mesmo clique nunca cobra duas vezes.
- **Biblioteca:** o MP4 pronto vira linha em `videos`, com render_id = chave, `quality_mode='producao_montage'` e selo "Studio Ads".
  - Essa linha é também a prova de entrega que a varredura genérica de estorno lê. Montagem sem linha depois de 2 h é estornada (`prodmont-` fica **dentro** da varredura de propósito).
- **Fala para a câmera:** **presenter 70 cr ("Talk to camera (standard)", Kling AI Avatar v2 Standard)** ao lado do **fabric 110**. O padrão segue fabric.

**A4 — card "Kineo Business"**
- Inclui logo em tudo, Studio Ads com 3 variações, Espaços, 10 personagens e 300 cr. Todos os números vêm das fontes.
- Fica atrás de `KINEO_BUSINESS_CARD_LIVE=false`.
  - Em `/ads`, a casa vê com `?preview=business`.
  - `/business-video-ads` é estático, então lá o card só aparece com o interruptor ligado.
- Checkout: `GET tier=pro&billing=monthly&from=business&intent_campaign=kineo_business`, por `<a>` (sem prefetch).
- `characterLimitFor` mudou para `lib/characterLimits.ts` (módulo puro, reexportado por `lib/characters`).

**A5 — Espaços com vários destinos**
- 1 foto vira 2 a 4 negócios rotulados num só vídeo.
- O preço é a soma das etapas: (foto pronta 5 + clipe) × destinos.
- Tela `/spaces?mode=multi`, separada da tela lançada. A curadoria é pesquisada por destino.
- Fica atrás de `SPACES_MULTI_PUBLIC=false` (a casa vê).

**A6 — migration das tabelas do v2**
- Cobre `ads_v2_orders`, `ads_v2_shots` e `ads_v2_variation_groups`, conferida contra produção (colunas, CHECK, índices, gatilhos).
- É idempotente e **não** recria o índice antigo "um ativo por conta". Recriá-lo travaria as 3 variações.

### B) SEO / AEO

| Item | Commit | O que mudou |
|---|---|---|
| B1 | f6beabd | 7 construtores passaram de `/studio/create` para `/studio`, com os mesmos parâmetros. Exceções e ajustes abaixo da tabela. |
| B2 | 7dfef8f, bb49b24 | `profiles.signup_landing_path` grava a página de pouso no primeiro toque. Detalhes abaixo da tabela. |
| B3 | 363fa1a | MCP do ChatGPT. Detalhes abaixo da tabela. |
| B4 | 9926365 | Órfãs ganham link interno, sempre derivado dos catálogos. Detalhes abaixo da tabela. |
| B5 | 825ac25 | pt/es nas páginas de motor, atrás de `ENGINE_PAGES_PT_ES_LIVE=false`, com o texto pronto. Preço em reais na `/gerador-de-shorts-gratis`, atrás de `GERADOR_BRL_PRICE_LIVE=false` (ver decisão 11). |

**B1 — construtores migrados para `/studio`**
- Migrados:
  - `toolActivationHref`, `productToVideo`, `commentToVideo`, `businessContentPlan`
  - `freeScriptSignupHandoff`, `exampleRemix`, `pricingJourneyProof`
- Ficaram em `/studio/create`, documentados no código:
  - `creationHandoff`, porque `create_intent` e `welcome=1` só são lidos lá.
  - `wallV1`, porque `resume=wall_v1` (volta pós-checkout) só é lido lá.
- O 45 s antigo virou 35 s. A tela antiga já fazia essa troca e o Studio novo não tem 45.
- **Achado:** a conta nova criada por Google/Apple pousava no `/studio` sem disparar a conversão de cadastro nem o `trackSignupSource`. Isso valia desde o 36fc267.
  - `app/(dashboard)/studio/page.tsx` agora monta `<SignupConversionTracker keepUrl />`. Isso é a página, não o StudioClient.
  - **Revisar:** é área de ativação/conversão.

**B2 — página de pouso no perfil**
- A migration `20261002130000_signup_landing_path.sql` **ainda não foi aplicada**.
- Só o pathname é gravado, e `/go/<token>` vira `/go`.
- O primeiro toque vence no banco: o `UPDATE` só grava `.is(null)`.
- Sem a coluna, a gravação é pulada e o resto da atribuição continua.
- O `utm_source=seo` cravado em `publicCreationIntent` saiu. O placar orgânico continua por `medium=organic`.

**B3 — MCP do ChatGPT**
- A rota lê `getKineoFacts` e grava `mcp_initialized` e `mcp_tool_called` com `client:'chatgpt'`.
- Mostrar os fatos comerciais ao ChatGPT fica atrás de `CHATGPT_MCP_COMMERCIAL_FACTS_LIVE=false`: o app foi submetido à OpenAI sem ofertas.
- Com o interruptor desligado, as ferramentas e os esquemas ficam idênticos.

**B4 — órfãs com link interno**
- **Rodapé:**
  - Produto: as 3 portas do A1, o hub `/ai-video-generator` e o hub de 100 casos de uso.
  - Compare: `/vs` + as 3 comparações de Ads.
  - Uma linha com as 16 portas de língua.
- **Hubs:** `/ai-video-generator` lista todas as páginas de motor traduzidas; `/vs` ganhou a seção de Ads.
- **Sitemap:** `/showcase` (com `SHOWCASE_PUBLIC`) e `/support` entraram. `LAST_MODIFIED` foi de 17/09 para 02/10.
- **llms.txt:** "Recently shipped" e uma seção nova "Clips, Spaces and photo-motion ads", com números derivados do código (`lib/growth/productLandingFacts.ts`).
- **/api/facts:** ganhou o bloco `products`. `PLAN_FACTS` não foi tocado.
- **As 8 `/ads/for/*`:** o "Example video coming soon" foi trocado pelo vídeo da casa, com legenda "house demo, not a client result".

### C) Laços

| Item | Commit | O que mudou |
|---|---|---|
| C1 | e8e59d6 | O "Affiliate — 40%" virou `AFFILIATE_COMMISSION_PCT` (30%) em todos os pontos. Detalhes abaixo da tabela. |
| C2 | 8c92df4, 64232e5 | **Bug achado e consertado: convites morriam desde 08/09.** Também: constante única e eventos de indicação. Detalhes abaixo da tabela. |
| C3 | 713bb3e | Página `/v/`: compartilhamento rastreado, barra fixa no celular e kit apontando para o próprio filme. Detalhes abaixo da tabela. |
| C4 | 13411d2 | Rota admin `app/api/admin/post-to-earn` (GET lista, POST aprova ou recusa). Detalhes abaixo da tabela. |
| C5 | 10435df | `/wall` ganhou a seção "Latest public films". Detalhes abaixo da tabela. |

**C1 — taxa de afiliado derivada de uma constante só**
- Corrigidos: Sidebar, `AffiliateMomentumCard`, painel do afiliado, `/partners` e o e-mail `send-hotlead-blast`, que dizia 40%.
- O guardião varre `app/`, `components/` e `lib/`.
- **Pendente:** `components/Footer.tsx` ainda tem "Affiliate program - 30% recurring" digitado. Esse texto é a chave das traduções em `lib/ui/interface*`. O guardião só deixa passar enquanto o número for o vigente.

**C2 — bug dos convites, constante única e eventos**
- **O bug:** o middleware mandava todo `?ref=XXXXXXXX` para `/a/CODE`, que só conhece código de afiliado. O visitante de um convite caía na home sem código.
  - Produção: **0 cadastros com `referred_by` desde a semana de 24/08**, contra 6 antes disso.
  - O link de filme publicado (`/v/<id>?ref=`) também mandava o visitante para a home, e ele nunca via o filme.
- **O conserto:**
  - O middleware não desvia mais `/v/`.
  - `/a/` reconhece código de convite e passa o código no cookie `sf_ref`, que o `captureRefOnce` lê.
- **Constante única:** `lib/referralReward.ts` (30 cr, teto 20). `/api/referral`, `/qualify` e o `llms.txt` importam dela.
- **Eventos:**
  - `referral_link_copied`, no navegador.
  - `referral_landing`, `referral_attributed` e `referral_qualified`, no servidor e em `SERVER_ONLY_EVENTS`.

**C3 — página `/v/`**
- `public_video_share_clicked` grava o método real usado para compartilhar.
- CTA fixa só em tela de até 640px, respeitando o safe-area.
- O kit (`publishPackServer`) aponta para `/v/<id>?ref=<código do dono>` quando o filme tem `published_at`.

**C4 — rota admin do "Cole o link e ganhe"**
- Aprovar segue esta ordem: update condicional `pending→granted` → `add_video_credits` (3 cr) → evento. Se o crédito falhar, o status volta.
- Recusar exige motivo.
- O banco aceita `granted`/`rejected`, não `approved`.
- Há 8 claims pendentes em produção.
- Não foi criada tela em `app/admin`.

**C5 — "Latest public films" no `/wall`**
- A seção lê `listIndexablePublicVideos`, a mesma política do sitemap de vídeo.
- Timeout de 2,5 s e cache de 10 min. Em caso de erro, a seção some.

### Integração (esta sessão)
- `bb49b24`: a migration do B2 tinha o mesmo timestamp `20261002120000` da A6. Renomeei para `20261002130000`.
- `58f2e6c`: conflito em `SERVER_ONLY_EVENTS` (A6/A2 × C2). As duas listas entraram.
- `64232e5`: o `llms.txt` passou a importar `REFERRAL_REWARD_CREDITS` e `REFERRAL_MAX_REWARDED_FRIENDS` de `lib/referralReward.ts`.

---

## Testes

- `npx tsc --noEmit -p .`: **0 erros** em `origin/main` e **0 erros** no SHA final.
- **Guardiões novos (15), todos verdes, a maioria com mutantes:**
  - Seção A: `test-nuvem-a1…a6`
  - Seção B: `test-links-studio-novo`, `test-atribuicao-pouso`, `test-mcp-chatgpt-fatos`, `test-mapa-orfas`
  - Seção C: `test-lacos-taxa-afiliado`, `-indicacao`, `-share`, `-post-to-earn`, `-wall`
- **Suíte inteira** (`node` em cada `scripts/test-*.mjs`, `origin/main` × SHA final, worktrees separadas): ver a seção "Suíte comparada" no fim deste arquivo.
- **Reancorados.** Cada um tem o comentário "Reancorado 02/10 (<TAG>): <motivo>" na linha, e a prova continua a mesma:
  - `test-ads-v2-servidor`, `test-ads-video-do-cliente`: stub do logo.
  - `test-producao-ads`: P4, P9, P26 e P58.
  - `test-pricing-diz-a-verdade`: `characterLimits`.
  - `test-product-to-video`, `test-comment-to-video`, `test-business-content-plan`, `test-sem-porteiro`, `test-signup-creation-proof`, `test-example-remix`, `test-growth-space-intent`, `test-local-business-ad-brief`, `test-public-creation-intent`.
  - `test-ads-for-segmentos`, `test-projeto-1-google`, `test-motores-16-linguas`, `test-interface-language`, `test-rodape-segmentos`.
  - `test-afiliado-30-e-packs-v7`, `test-affiliate-activation`, `test-affiliate-payment-chain`, `test-affiliate-destinations`.

---

## O que ficou atrás de interruptor (todos nascem `false`)

| Interruptor | Arquivo | O que liga |
|---|---|---|
| `CLIPS_BRAND_LOGO_PUBLIC` | lib/clips/clipBrand.ts | Botão "Add my logo" do Clips para todos. O render do Creatomate é custo nosso, sem crédito. |
| `PRODUCAO_MONTAGE_CHARGE_LIVE` | lib/ads/producao.ts | Cobrança de 2 cr por montagem da Produção. É pré-requisito de `PRODUCAO_PUBLIC`. |
| `PRODUCAO_PUBLIC` | lib/ads/producao.ts | Produção aberta (já existia; continua `false`). |
| `KINEO_BUSINESS_CARD_LIVE` | lib/growth/kineoBusiness.ts | Card "Kineo Business" em /ads e /business-video-ads. |
| `SPACES_MULTI_PUBLIC` | lib/spaces/spaces.ts | Espaços com vários destinos para todos. |
| `CHATGPT_MCP_COMMERCIAL_FACTS_LIVE` | lib/mcp/chatgptContract.ts | Fatos comerciais (planos/preços) no `kineo_facts` do ChatGPT. |
| `ENGINE_PAGES_PT_ES_LIVE` | lib/seo/enginePageLangs.ts | Páginas de motor em português e espanhol. |
| `GERADOR_BRL_PRICE_LIVE` | lib/seo/brlDoorPrice.ts | Preço em R$ na /gerador-de-shorts-gratis. |

## Migrations (nenhuma aplicada)
1. `supabase/migrations/20261002120000_ads_v2_orders.sql`: só versiona o que **já existe** em produção. Aplicar é inócuo (idempotente), mas não é necessário.
2. `supabase/migrations/20261002130000_signup_landing_path.sql`: coluna nova. Pode rodar antes ou depois do deploy, porque o código tolera a falta dela.

---

## Decisões para o fundador

1. **Montagem da Produção a 2 créditos?** O custo no Creatomate é de cerca de US$ 0,13–0,26. Ligar `PRODUCAO_MONTAGE_CHARGE_LIVE` antes de abrir a Produção.
2. **Abrir a Produção ao público (`PRODUCAO_PUBLIC`)?** Depende de render real aprovado e da decisão 1. Também decide se a fala padrão é presenter 70 ou fabric 110 (hoje: fabric, que foi a validada à mão).
3. **Card "Kineo Business" no ar?** É um nome comercial novo sobre o preço do Studio (US$ 54,90), sem preço novo.
4. **Espaços com vários destinos para todos?** O preço é a soma das etapas.
5. **Logo no Clips para todos?** Cada clique é um render do Creatomate pago por nós. Alternativa: cobrar 1–2 cr.
6. **Fatos comerciais no MCP do ChatGPT?** Ligar pode atrasar ou reprovar a revisão do app na OpenAI. O MCP é a origem da maioria dos pagantes.
7. **Indicação voltou a funcionar** (conserto do C2). Isso religa os 30 cr para cada lado, três vezes o trial de cadastro de hoje (10 cr). Manter 30?
8. **Unificar os dois prêmios?** Hoje "Cole o link e ganhe" paga 3 cr e a indicação paga 30 + 30.
9. **Barra fixa do `/v/` no celular:** ela trocou o remix sem cadastro pelo botão de cadastro. Confirmar.
10. **`/wall` "Latest public films":** mostra filmes de clientes que publicaram. A alternativa é mostrar só filmes da casa.
11. **Preço em reais na porta PT:** o pedido dizia R$ 49,90, mas a tabela que o checkout cobra hoje (V8-A, `lib/settlementCurrency.ts`) é **R$ 64,90**. Ligado, a página mostra R$ 64,90, lido da fonte. Para R$ 49,90, quem muda é a tabela BRL (e o checkout passa a cobrar isso).
12. **pt/es nas páginas de motor (`ENGINE_PAGES_PT_ES_LIVE`)?** A decisão de 25/07 dizia "site só em inglês"; desde então já há 13 línguas.
13. **Volta do pós-checkout da parede (`resume=wall_v1`) e `create_intent`** continuam no `/studio/create`. Migrar depende de a sessão dona do StudioClient passar a ler esses parâmetros.
14. **Teto diário de 100 cr do post-to-earn:** as aprovações humanas (rota C4) não contam para ele. Confirmar.
15. **Kits de quem paga:** não têm linha de crédito, então não ganham o link `/v/?ref=`. Manter?

## Fora do escopo, visto no caminho (não mexido)
- `app/api/referral/qualify` credita lendo o saldo e escrevendo de volta, o que perde crédito numa corrida com compra ou render. Trocar por `add_video_credits`.
- Ainda há dois `utm_source=seo` cravados: `lib/growth/realEstateShorts.ts` e `toolActivationHref`.
- `tests/chatgpt-plugin.test.mjs` já estava vermelho na main: espera `/studio/create` no `/go` (resto do 36fc267).
- `components/Footer.tsx` tem "30% recurring" digitado (ver C1).

## Próximas jogadas (crescimento, não óbvias)
1. **"Pergunte ao ChatGPT" como porta de B2B.** O ChatGPT traz quem paga na primeira hora, e agora o MCP grava `mcp_tool_called` com `client='chatgpt'`. Em 7 dias dá para cruzar `mcp_tool_called → signup_landing_path → pagamento`.
   - Se a maioria dos pagantes passar pelo `kineo_facts`, ligar os fatos comerciais (decisão 6) é a alavanca de maior retorno da semana.
   - Se o caminho for outro, não ligar e proteger a revisão da OpenAI.
2. **Espaços com vários destinos como isca para construtoras:** um vídeo "este ponto pode ser café · farmácia · clínica" é o material que o corretor manda ao locatário. Cada vídeo enviado é um anúncio da Kineo na mesa de quem aluga.
   - Ação: o fundador gera 1 vídeo de um ponto vazio real das construtoras que conhece e manda com "Presented by <construtora>". É o primeiro case B2B público.
3. **A indicação estava morta há 5 semanas** (0 atribuições desde 24/08). Com o conserto, a primeira coisa a medir é `referral_landing` / `referral_attributed` em 7 dias.
   - Se o volume voltar ao patamar de agosto (~1,5/semana), vale um lembrete no pico da alegria ("seu filme ficou pronto — mande para um amigo e ganhe 30").
4. **O vídeo da casa nas `/ads/for/*`:** as 8 páginas de segmento deixaram de mostrar "coming soon". Pedir ao IndexNow (`scripts/submit-indexnow.mjs`) as 3 portas novas e as 8 de segmento no dia do deploy, porque o Bing alimenta o ChatGPT.

---

## Suíte comparada (node em cada scripts/test-*.mjs)

| | Arquivos | Verdes | Vermelhos |
|---|---|---|---|
| `origin/main` 6ac5d2b | 744 | 577 | 167 |
| esta branch (SHA final) | 759 (744 + 15 novos) | 593 | 166 |

- **Nenhum guardião verde na main ficou vermelho.**
- **1 guardião vermelho na main ficou verde:** `test-growth-space-intent`. Ele esperava `/generate`, e o B1 o reancorou para `/studio`, com motivo escrito no arquivo.
- **Os 15 novos estão verdes.**
- **Os 166 vermelhos são os mesmos da main**, e falham pelos mesmos motivos. A maioria lê histórico do git (`git show`/`git log`), que este clone raso (50 commits) não tem; o restante já era texto antigo de outras sessões. No clone completo do Claude local, parte deles deve ficar verde nos dois lados.
- **Como medi:** a main rodou em série com 60 s por arquivo; a branch rodou com 4 em paralelo e 120 s por arquivo.
- **Uma rodada intermediária saiu inválida e foi descartada:** um processo antigo continuou escrevendo no mesmo arquivo de resultado depois que a worktree dele foi apagada. Na rodada limpa, os 264 arquivos que apareciam como "viraram vermelho" naquela rodada passaram todos, inclusive quando rodados um por um.

## Checkpoints desta conversa
- **Primeiro bloco:** seção A inteira (A1–A6), com um commit e um guardião por item, cada um com push.
- **Segundo bloco:** integração das seções B e C (três frentes paralelas em worktrees isoladas), resolução de conflitos, integração do `llms.txt` e suíte comparada.
- A sessão terminou antes do prazo de 04/10 20:00 BRT porque todos os itens fecharam. O que sobra depende do fundador (lista acima) ou de render real (Claude local).
