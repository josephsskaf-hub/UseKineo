# Conserto do domínio antigo: as URLs dos anúncios e dos sitelinks abrem no próprio host antigo (26/11)

Pedido da CEO (26/11 10:12, 10:36 e 10:58). A conta do Google Ads 186-928-2523 teve a 3ª contestação recusada por "Circumventing systems: Cloaking". O dono quer insistir, "sem erro dessa vez".
- **O problema:** toda URL final da conta (anúncios e sitelinks) está num domínio antigo, e todo pedido a esses domínios levava um 308 para www.usekineo.com. É o exemplo de cloaking que o assistente do Google escreveu: "Redirecting users or crawlers… to different domains".
- **Remover não deu:** o dono tentou remover os anúncios em 26/11, inclusive pelo celular, e a sessão Claude tentou pelos botões da conta. A conta suspensa só permite leitura ("Você tem acesso somente leitura a esta conta"; fotos em `docs/google-ads/retirada-2611/`). Então o que resta é fazer cada URL final abrir no próprio domínio.

Branch `codex/dominio-antigo-2611`, de origin/main. Nada na Vercel, na conta do Google Ads nem em preço. Sem push.

## As URLs finais da conta (lidas em 26/11, só leitura)
| Onde na conta | Estado | URL final |
|---|---|---|
| 3 anúncios da campanha "ShortsForgeAI - Conversao - US" (Viral Shorts in 2 Clicks; Faceless YouTube Channel; Make YouTube Shorts With AI) | Reprovado (Destino não correspondente), campanha encerrada | https://www.shortsforgeai.com/signup |
| Anúncio da campanha "Search - US - Launch Test" | Campanha removida | https://www.shortsforgeai.com |
| Anúncio da campanha "Search - Vendas" | Campanha removida | https://shortsforgeai.vercel.app/pricing |
| Anúncio da campanha "Search - US - Free Trial" | Campanha removida | https://shortsforgeai.com/start |
| Sitelinks da CONTA (aparecem com todo anúncio): See Pricing Plans; 7-Day Money Back | Qualificado | https://shortsforgeai.vercel.app/pricing |
| Sitelink How It Works | Qualificado | https://shortsforgeai.vercel.app/#how-it-works |
| Sitelink Start Generating Free | Qualificado | https://shortsforgeai.vercel.app/generate |
| Sitelink Watch Sample Shorts | Qualificado | https://shortsforgeai.vercel.app |
| Sitelink My Videos Library | Qualificado | https://shortsforgeai.vercel.app/my-videos |

Nenhum anúncio tem URL de celular, sufixo de URL final, modelo de acompanhamento ou parâmetro personalizado. As 4 frases de destaque não têm URL. O fragmento `#how-it-works` não chega ao servidor: o pedido é `/`.

## O 308 de hoje vem da VERCEL, antes do Next (medido)
- **A medida:**
  - `https://shortsforgeai.com/_next/static/chunks/main.js` dá 308, e o matcher do middleware EXCLUI `_next/static`;
  - `https://shortsforgeai.com/api/stripe/webhook` dá 308, e o middleware deixa esse caminho passar.
  - Os dois mostram `Server: Vercel` e `Location: https://www.usekineo.com/…`.
- **Lido na Vercel (só leitura),** no projeto `kineo` (prj_RgUXBp6H3u54zA1tbIZehdr4MQ2q), em Domains:
  - `shortsforgeai.com`: `redirect: www.usekineo.com`, `redirectStatusCode: 308`;
  - `www.shortsforgeai.com`: `redirect: www.usekineo.com`, `redirectStatusCode: 308`;
  - `shortsforgeai.vercel.app`: sem redirect na Vercel (o 308 dele é o do middleware, e este código já o cobre sozinho).
- **Por isso o código sozinho não basta no .com e no www.** Há uma mudança na Vercel, que eu NÃO fiz:

### O que mudar na Vercel (o dono ou a CEO, no painel)
1. **Painel:** Vercel → projeto **kineo** → Settings → Domains.
2. **`shortsforgeai.com`:** Edit → trocar "Redirect to www.usekineo.com (308 Permanent)" por **"Connect to an environment: Production"** (sem redirect). Salvar.
3. **`www.shortsforgeai.com`:** a mesma troca.
4. **Não mexer** em `usekineo.com` (segue redirecionando para www), em `www.usekineo.com` nem em `shortsforgeai.vercel.app`.

- **A ordem não tem risco:** com este código no ar, os dois hosts passam a responder pelo middleware.
  - Se a Vercel mudar ANTES do deploy, o middleware de hoje manda o 308 de tudo (o mesmo de agora), só que de dentro do Next.
- **Efeito colateral bom:** o `/api/stripe/webhook` no domínio antigo volta a executar no lugar, como o middleware sempre quis. Hoje a Vercel redireciona até ele.

## O que mudou no código (opção B da CEO, 26/11 11:15)
- **A regra (`lib/seo/dominioAntigo2611.ts`):** nos TRÊS hosts antigos (`shortsforgeai.com`, `www.shortsforgeai.com`, `shortsforgeai.vercel.app`), GET ou HEAD numa das 7 URLs finais da conta mostram a página de entrada. Todo o resto leva o 308 de hoje para www.usekineo.com.
  - As 7 URLs ficam numa lista única, `URLS_DA_CONTA_2611`, com a origem de cada uma na conta: `/`, `/pricing`, `/ai-shorts/2-clicks`, `/signup`, `/start`, `/generate`, `/my-videos`.
  - **Decide só por host, caminho e método.** Nunca por cabeçalho do navegador nem por user-agent. O `Sec-Fetch-Site` das versões anteriores saiu de vez (V4 da revisora).
  - **Não há mais lista de arquivos nem de chamadas de API no host antigo.** A página de entrada não pede nada além da fonte e das capas, que o matcher do middleware já deixa passar. Por isso o furo V1 (`/admin/people/x.css`, `/api/render/x.mp4`, `/a/X.js`…) deixa de existir: tudo isso leva 308.
  - **Fora da regra:** `/api/stripe/webhook` e `/api/youtube/*`, o callback do OAuth registrado em `shortsforgeai.vercel.app` (V5). Neles o middleware faz o de hoje: roda no lugar.
- **A página de entrada (`app/entrada-dominio-antigo-2611/route.ts`):** HTML próprio, fora do layout raiz, porque o layout raiz carrega scripts, provedores, banners e o modal de login.
  - **O conteúdo:**
    - o título "ShortsForgeAI is now Kineo." e a frase com a data da troca (30/06/2026, dos commits "rebrand Kineo 30/06");
    - 5 linhas do que o produto faz, tiradas de `PRODUCT` em `lib/kineoFacts.ts`, sem preço;
    - 3 capas de `public/posters`;
    - "Your account and plan are at usekineo.com".
  - **Os botões:** links ABSOLUTOS para `https://www.usekineo.com/signup`, `/login`, `/pricing` e `/`, com a query de chegada (gclid, utm…).
  - **O que ela não tem:** formulário, modal, Supabase, compra, script ou redirecionamento automático.
  - `rel=canonical` para `https://www.usekineo.com/` e `noindex, follow`.
  - A rota interna, pedida direto, dá 404 em qualquer host.
- **`middleware.ts`:**
  - a página de entrada sai ANTES do `updateSession`;
  - o pedido segue sem os cookies `sb-*`, e a resposta os apaga (V2). Nenhuma sessão é lida, renovada ou criada no host antigo;
  - o furo do `HomeAuthModal` (cadastro dentro da página no host antigo) some pela raiz, porque a home não é mais servida lá.
- **`next.config.js`:** o redirect `/start → /signup?utm_source=start` ganhou `missing` para os três hosts antigos (V6). Em www ele segue igual.
- **`scripts/test-dominio-antigo-2611.mjs` (guardião):**
  - a regra e o MIDDLEWARE REAL, com dublês só do que não é desta regra: 3 hosts × 7 URLs × 6 user-agents × 5 estados de `Sec-Fetch-Site` dão a mesma reescrita;
  - os casos de furo da revisora, o cookie `sb-*` velho, a rota interna em 404, o `/start` do next.config e o HTML da página;
  - 24/24 mutantes mortos.

## Tabela final: host × URL × resposta — MEDIDA no build de produção desta branch (26/11)
**Como medi:**
- `next build` e `next start` desta branch, com env falsa e sem chave;
- `curl` com `Host`, `X-Forwarded-Host` e `X-Forwarded-Proto: https` de cada host;
- o arquivo bruto está em `C:\kineo\docs\google-ads\pagina-de-entrada-2611\medida-*.tsv`.

O `:3211` que aparece no `Location` do arquivo bruto é a porta local; em produção não aparece.

| Pedido | shortsforgeai.com | www.shortsforgeai.com | shortsforgeai.vercel.app |
|---|---|---|---|
| As 7 URLs (`/`, `/pricing`, `/ai-shorts/2-clicks`, `/signup`, `/start`, `/generate`, `/my-videos`), `?gclid=x`, cada uma com 6 user-agents (Chrome, Safari iPhone, AdsBot-Google, AdsBot-Google-Mobile, Googlebot, curl) × 3 estados de `Sec-Fetch-Site` (sem cabeçalho, cross-site, same-origin) | **200** nos 126 pedidos | **200** nos 126 | **200** nos 126 |
| O corpo dessas 378 respostas | **o mesmo HTML** (md5 `6bfb88ea7416…`, igual nas 378) | | |
| `/start?utm_source=ad` | **200** (a entrada) | **200** | **200** |
| POST `/signup` | 308 → www | 308 → www | 308 → www |
| `/login`, `/studio`, `/admin`, `/robots.txt` | 308 → www | 308 → www | 308 → www |
| `/admin/people/x.css`, `/api/render/x.mp4`, `/api/compose/status/x.mp4`, `/a/ABCD1234.js`, `/s/tiktok.js` (furo V1) | 308 → www | 308 → www | 308 → www |
| `/api/stripe/change-plan`, `/api/stripe/checkout/resume?go=1` | 308 → www | 308 → www | 308 → www |
| `/` e `/signup` com cookie `sb-fake-auth-token` velho | 200 + `Set-Cookie: sb-fake-auth-token=; Max-Age=0` | o mesmo | o mesmo |
| `/entrada-dominio-antigo-2611` direto | 404 | 404 | 404 |
| POST `/api/stripe/webhook` | 400 (executa no lugar, sem assinatura) | 400 | 400 |
| `/api/youtube/callback` | 307 (executa no lugar, como hoje) | 307 | 307 |

**www.usekineo.com, no mesmo build:**
- `/`, `/signup`, `/login`, `/studio` e `/robots.txt` dão 200;
- `/start?utm_source=ad` dá 308 para `/signup?utm_source=start`, como hoje;
- `/entrada-dominio-antigo-2611` dá 404;
- nenhum `Set-Cookie sb-*`.

**A página:** os únicos `href` são `https://www.usekineo.com/` (canonical), `https://www.usekineo.com/?gclid=x`, `/login?gclid=x`, `/pricing?gclid=x` e `/signup?gclid=x`. Ela tem 0 `<script>` e 0 `<form>`.

**Fotos** (build local, navegador interno), em `C:\kineo\docs\google-ads\pagina-de-entrada-2611\`:
- `1920-escuro.jpg` e `1920-claro.jpg`;
- `390-escuro-topo.jpg`, `390-escuro-fim.jpg`, `390-claro-topo.jpg` e `390-claro-fim.jpg`.

Sem rolagem lateral a 390 px (`scrollWidth` 390).

## Login, cadastro, compra e sessão
- **No host antigo ninguém entra, se cadastra nem compra.** A página de entrada só tem links para www.usekineo.com, e o login, o cadastro e o checkout acontecem lá, com o cookie de lá.
- **Um cookie `sb-*` velho do host antigo** não chega ao app e é apagado na primeira visita.
- **Quem tem conta** clica em "Log in" e entra em www como sempre.

## Risco para a busca e para as citações do ChatGPT
- **Busca:**
  - a página de entrada tem `noindex` e canonical em www;
  - robots.txt e sitemap.xml dos hosts antigos seguem no 308 para www;
  - o Google segue consolidando tudo em www.
- **Citações do ChatGPT:** nenhum texto, página ou endereço de www.usekineo.com mudou. A home de www não foi tocada.
- **Risco restante nos anúncios:**
  - os anúncios e sitelinks antigos seguem com a marca ShortsForgeAI e preços velhos;
  - a página de entrada explica a troca de nome, mas não mostra preço;
  - não dá para editar nem remover nada enquanto a conta estiver suspensa.

## Como desfazer em uma linha
- **No código:** em `lib/seo/dominioAntigo2611.ts`, `HOSTS_DO_DOMINIO_ANTIGO_2611 = new Set()`. O middleware volta ao 308 de tudo, e a rota interna continua 404.
- **Ou na Vercel:** pôr de volta "Redirect to www.usekineo.com (308)" nos dois domínios. O `vercel.app` só volta pelo código.

## Rascunho da 4ª contestação (inglês; NÃO enviada)
**Antes de enviar, conferir e preencher cada colchete.** Nada que só vale depois do deploy vai no presente sem a conferência no ar:
1. Este código está no ar (SHA e hora do deploy).
2. A Vercel não redireciona mais shortsforgeai.com e www.shortsforgeai.com.
3. Cada URL da lista abaixo, conferida com `curl -sI` com o user-agent `AdsBot-Google` e com o de um navegador comum: 200 e sem `Location`. Anotar data e hora.

Se algum item não estiver verdadeiro, tirar a frase dele. Os nomes e os números vêm da conta, lidos em 26/11 (fotos em `docs/google-ads/retirada-2611/`):
- **4 campanhas:**
  - "ShortsForgeAI - Conversao - US", com 3 anúncios reprovados por "Destino não correspondente";
  - "ShortsForgeAI - Search - US - Launch Test", "ShortsForgeAI - Search - Vendas" e "ShortsForgeAI - Search - US - Free Trial", com 1 anúncio cada.
- **6 anúncios no total.**
- **Recursos da conta:** 6 sitelinks e 4 frases de destaque.

> Subject: Appeal – Circumventing systems (Cloaking) – account 186-928-2523
>
> Hello,
>
> We understand the suspension was triggered by the destinations in our account. The account has 4 campaigns ("ShortsForgeAI - Conversao - US", "ShortsForgeAI - Search - US - Launch Test", "ShortsForgeAI - Search - Vendas" and "ShortsForgeAI - Search - US - Free Trial") with 6 ads in total, plus 6 account-level sitelinks. All of their final URLs are on our former domains (shortsforgeai.com, www.shortsforgeai.com and shortsforgeai.vercel.app). We renamed the product from ShortsForgeAI to Kineo (usekineo.com), and those domains sent every visitor to the same path on www.usekineo.com with a permanent redirect. We now understand that a redirect to a different domain from the advertised one is treated as cloaking, even when it is the same for every visitor.
>
> What we changed, checked on [DATE, TIME UTC]:
> 1. Every final URL used in this account returns HTTP 200 on its own domain, with no redirect: https://www.shortsforgeai.com/signup, https://www.shortsforgeai.com/, https://shortsforgeai.com/start, https://shortsforgeai.vercel.app/, https://shortsforgeai.vercel.app/pricing, https://shortsforgeai.vercel.app/generate and https://shortsforgeai.vercel.app/my-videos.
> 2. The response does not depend on the user agent. Fetching these URLs with AdsBot-Google, AdsBot-Google-Mobile, Googlebot or a normal browser returns the same page.
> 3. Each of these pages declares its canonical URL on www.usekineo.com, our current brand domain, which is the same product and the same company.
>
> We tried to remove the outdated ads, sitelinks and callouts ourselves, from the web interface and from the mobile app, but the suspended account is read-only and does not allow it. We ask you to reinstate the account so we can delete them, or to remove them on our behalf. From now on we will advertise only on www.usekineo.com.
>
> Thank you.

## Provas (como rodar)
- **Guardião:** `node scripts/test-dominio-antigo-2611.mjs` (24/24 mutantes, só AssertionError).
- **tsc:** `--noEmit -p .`, 0.
- **`novos-vermelhos`** sobre os 32 guardiões que citam o `middleware.ts`, a regra ou o `next.config`: 12 vermelhos, todos já vermelhos na main; **0 vermelho novo**.
  - O `test-afiliados-40-2026-10-06` ganhou o dublê das exportações novas da regra: 31 ok e 0 falha.
- **Medida no build:** a tabela acima.
- **Fotos:** acima.
- **URLs finais da conta:** a coluna "URL final" da tabela de anúncios e o cartão de cada sitelink, lidos em 26/11 (fotos 13 e 16 em `docs/google-ads/retirada-2611/`).
