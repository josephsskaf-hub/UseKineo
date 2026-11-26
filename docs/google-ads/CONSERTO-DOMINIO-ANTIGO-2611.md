# Conserto do domínio antigo: as páginas dos anúncios abrem no próprio shortsforgeai.com (26/11)

Pedido da CEO, 26/11 10:12. A conta do Google Ads 186-928-2523 teve a 3ª contestação recusada por "Circumventing systems: Cloaking". O dono quer insistir.
- **Os únicos anúncios da conta:** 3 antigos da campanha "ShortsForgeAI - Conversao - US", reprovados por "Destino não correspondente". O domínio deles é shortsforgeai.com, e um tem o caminho de exibição `/ai-shorts/2-clicks`.
- **O problema:** todo pedido a esse domínio levava um 308 para www.usekineo.com. É o exemplo de cloaking que o assistente do Google escreveu: "Redirecting users or crawlers… to different domains".

Branch `codex/dominio-antigo-2611`, de origin/main. Nada na Vercel, na conta do Google Ads nem em preço. Sem push.

## O 308 de hoje vem da VERCEL, antes do Next (medido)
- **A medida:**
  - `https://shortsforgeai.com/_next/static/chunks/main.js` dá 308, e o matcher do middleware EXCLUI `_next/static`;
  - `https://shortsforgeai.com/api/stripe/webhook` dá 308, e o middleware deixa esse caminho passar.
  - Os dois mostram `Server: Vercel` e `Location: https://www.usekineo.com/…`.
- **Lido na Vercel (só leitura),** no projeto `kineo` (prj_RgUXBp6H3u54zA1tbIZehdr4MQ2q), em Domains:
  - `shortsforgeai.com`: `redirect: www.usekineo.com`, `redirectStatusCode: 308`;
  - `www.shortsforgeai.com`: `redirect: www.usekineo.com`, `redirectStatusCode: 308`;
  - `shortsforgeai.vercel.app`: sem redirect na Vercel (o 308 dele é o do middleware).
- **Por isso o código sozinho não basta.** Há uma mudança na Vercel, que eu NÃO fiz:

### O que mudar na Vercel (o dono ou a CEO, no painel)
1. **Painel:** Vercel → projeto **kineo** → Settings → Domains.
2. **`shortsforgeai.com`:** Edit → trocar "Redirect to www.usekineo.com (308 Permanent)" por **"Connect to an environment: Production"** (sem redirect). Salvar.
3. **`www.shortsforgeai.com`:** a mesma troca.
4. **Não mexer** em `usekineo.com` (segue redirecionando para www), em `www.usekineo.com` nem em `shortsforgeai.vercel.app`.

- **A ordem não tem risco:** com este código no ar, os dois hosts passam a responder pelo middleware.
  - Se a Vercel mudar ANTES do deploy, o middleware de hoje manda o 308 de tudo (o mesmo de agora), só que de dentro do Next.
- **Efeito colateral bom:** o `/api/stripe/webhook` no domínio antigo volta a executar no lugar, como o middleware sempre quis. Hoje a Vercel redireciona até ele.

## O que mudou no código
- **`lib/seo/dominioAntigo2611.ts` (novo):** a regra pura `decidirDominioAntigo2611`. Ela vale só para `shortsforgeai.com` e `www.shortsforgeai.com` e nunca lê o user-agent.
  - **As páginas dos anúncios, GET e HEAD:** `/` e `/pricing` servem no próprio host. `/ai-shorts/2-clicks` mostra a home, porque é o caminho de EXIBIÇÃO de um anúncio e a página não existe (404 também em www.usekineo.com).
  - **O que a página carrega ao abrir fica no mesmo host:**
    - mídia e fontes da pasta public (mp4, woff2, ico…). `_next`, imagens e a fonte manrope o matcher já deixa fora do middleware;
    - as 12 chamadas de leitura medidas no navegador ao abrir a home e o /pricing;
    - as 2 escritas que a página faz sozinha: `POST /api/events` e `POST /api/consent`.
  - **A pré-carga de outra página:** o fetch da página (cabeçalho `Sec-Fetch-Dest: empty`, que o NAVEGADOR manda) a uma página fora da lista recebe **204** no mesmo host. O Next então abre a página por navegação normal, que leva o 308.
    - O Next 14 apaga o cabeçalho `RSC` e o `_rsc` antes do middleware (`next/dist/server/web/adapter.js`, FLIGHT_PARAMETERS), por isso o sinal é o `Sec-Fetch-Dest`.
  - **Todo o resto:** o 308 de hoje.
- **`middleware.ts`:** aplica a regra antes do bloco do 308. O 308 só deixa passar o que a regra manda seguir. Os hosts (com o vercel.app), as exceções `/api/stripe/webhook` e `/api/youtube/` e o destino www.usekineo.com ficam como estão.
- **`scripts/test-dominio-antigo-2611.mjs` (guardião):** 13/13 mutantes mortos.

## Por que essa lista de páginas
- **Os 3 anúncios mostram** `shortsforgeai.com` e `shortsforgeai.com/ai-shorts/2-clicks`.
- **A URL final** não aparece na auditoria e a conta está só leitura. A home é o destino mais provável dos três.
- **Entram `/` e `/pricing`:** a página de preço é o destino de conversão da campanha "Conversao", e o anúncio fala de plano e preço.
- **Entra `/ai-shorts/2-clicks`:** se a URL final for o caminho de exibição, ele abre a home em vez de 404.
- **Para acrescentar outra página,** é uma linha em `PAGINAS_DOS_ANUNCIOS_2611`.

## Antes e depois por endereço
- **Antes:** medido em produção por curl. Todo endereço dos dois hosts antigos dava `308 → https://www.usekineo.com/<mesmo caminho>` (pela Vercel).
- **Depois:** medido no build de produção desta branch, com o cabeçalho de host, e vale depois da mudança na Vercel.

| Endereço (shortsforgeai.com e www.shortsforgeai.com, igual) | Antes | Depois |
|---|---|---|
| `/`, `/?gclid=…`, HEAD `/` | 308 → www.usekineo.com/ | **200** |
| `/pricing` | 308 → www.usekineo.com/pricing | **200** |
| `/ai-shorts/2-clicks` | 308 → www.usekineo.com/ai-shorts/2-clicks (404 lá) | **200** (a home) |
| pré-carga de `/studio` (fetch da página) | 308 (quebra por CORS) | **204** |
| pré-carga de `/pricing` (fetch da página) | 308 | **200** |
| `/studio`, `/login`, `/signup?…`, `/admin` (navegação) | 308 → www | 308 → www (igual) |
| `/api/stripe/checkout?tier=…&kc=1` (o botão de compra) | 308 → www | 308 → www, com a query (igual) |
| POST `/api/stripe/checkout` | 308 → www | 308 → www (igual) |
| `/robots.txt`, `/sitemap.xml` | 308 → www | 308 → www (igual) |
| `/api/offers/bf2026` e as outras 11 leituras da página | 308 (quebra por CORS) | **200** |
| POST `/api/events` | 308 (quebra) | **200** |
| `/previews/*.mp4` | 308 → www | **200** |
| `/api/stripe/webhook` | 308 (Vercel) | executa no lugar (405 ao GET, como em www) |
| `shortsforgeai.vercel.app/*` | 308 → www (middleware) | 308 → www (igual) |

- **O mesmo HTML para todos:**
  - `/`, `/pricing` e `/ai-shorts/2-clicks` foram baixados com 4 user-agents: navegador comum, `AdsBot-Google`, `AdsBot-Google-Mobile` e `Googlebot/2.1`;
  - deu o mesmo tamanho e o mesmo hash nos quatro (583 748, 128 229 e 583 786 bytes).
- **Canonical:**
  - `/` e `/ai-shorts/2-clicks` levam `<link rel="canonical" href="https://www.usekineo.com">`;
  - `/pricing` leva `href="https://www.usekineo.com/pricing"`;
  - é o metadata de sempre, absoluto e sem mudança.

## Login, cadastro, compra e sessão
- **O cookie de sessão é por domínio.** No host antigo, a pessoa é sempre visitante.
- **Entrar e cadastrar:** "Log in" e "Get started" levam a `/login` e `/signup?utm_source=nav`.
  - No clique, o Next tenta a pré-carga: 204 no mesmo host.
  - Depois ele navega para `shortsforgeai.com/login`, que leva 308 para `https://www.usekineo.com/login`.
  - O login e o cookie nascem em www, como hoje.
- **Comprar:** os botões de plano do /pricing navegam para `/api/stripe/checkout?tier=…` (navegação de página, "no fetch(), no await", `app/pricing/PricingClient.tsx` ~815).
  - No host antigo ela leva 308 para `https://www.usekineo.com/api/stripe/checkout?…`, com a mesma query, e o checkout segue em www.
  - Navegação não sofre CORS.
  - No servidor local, o clique em "Get Starter" fez a navegação de página e voltou com o aviso de pagamento não configurado (a Stripe não existe no teste).
- **Quem já tem conta** e cair no host antigo vê a página como visitante. Ao entrar, chega em www já logado.

## Risco para a busca e para as citações do ChatGPT
- **Busca:**
  - só 3 endereços passam a ter cópia no domínio antigo, e as cópias apontam o canonical para www.usekineo.com;
  - robots.txt e sitemap.xml do domínio antigo continuam no 308 para www;
  - o resto do domínio antigo continua redirecionando: o Google segue consolidando em www.
- **Citações do ChatGPT:** nenhum texto, página ou endereço de www.usekineo.com mudou. Nada que o ChatGPT cita some.
- **Risco restante nos anúncios:**
  - os 3 anúncios antigos têm texto com a marca ShortsForgeAI e o preço velho ("Plans From $11.90/Month");
  - a página agora abre no mesmo domínio, mas mostra Kineo AI e o preço de hoje;
  - isso pode virar outro motivo de reprovação ("destination mismatch" por conteúdo);
  - a conta está só leitura; o pedido de remoção dos 3 anúncios continua na contestação.

## Como desfazer em uma linha
- **No código:** em `lib/seo/dominioAntigo2611.ts`, `HOSTS_DO_DOMINIO_ANTIGO_2611 = new Set()`. O middleware volta ao 308 de tudo.
- **Ou na Vercel:** pôr de volta "Redirect to www.usekineo.com (308)" nos dois domínios.

## Rascunho da 4ª contestação (inglês; só fatos verificáveis por eles; NÃO enviada)
> Subject: Appeal – Circumventing systems (Cloaking) – account 186-928-2523
>
> Hello,
>
> We understand the suspension was triggered by our ads' destinations. The only ads in this account are three old search ads from the campaign "ShortsForgeAI - Conversao - US" (status: Ended). They display the domain shortsforgeai.com. On June 30, 2026 we renamed the product from ShortsForgeAI to Kineo (usekineo.com), and since then shortsforgeai.com sent every request to the same path on www.usekineo.com with a permanent redirect. We now understand that a redirect to a different domain from the advertised one is treated as cloaking, even when it is the same for every visitor.
>
> What we changed (verifiable now):
> 1. https://shortsforgeai.com/, https://shortsforgeai.com/pricing and https://shortsforgeai.com/ai-shorts/2-clicks (and the same paths on www.shortsforgeai.com) now return HTTP 200 on shortsforgeai.com itself, with no redirect.
> 2. The page is the same for every visitor and every crawler: the response does not depend on the user agent. You can fetch it with AdsBot-Google, AdsBot-Google-Mobile, Googlebot or a normal browser and receive the same HTML.
> 3. Each of these pages declares its canonical URL on www.usekineo.com, our current brand domain, which is the same product and the same company.
>
> Because the account is read-only, we cannot remove these three outdated ads ourselves. We ask you to reinstate the account so we can delete them, or to remove them on our behalf. We will advertise only on www.usekineo.com from now on.
>
> Thank you.

## Provas (como rodar)
- **Guardião:** `node scripts/test-dominio-antigo-2611.mjs` (13/13 mutantes, só AssertionError).
- **tsc:** `--noEmit -p .`, 0.
- **Tabela:** gerada com `next build` e `next start` desta branch (env falsa, sem chave) e `curl -H "Host: shortsforgeai.com" -H "X-Forwarded-Host: shortsforgeai.com"`.
- **Chamadas da página:** medidas com `performance.getEntriesByType('resource')` no navegador, ao abrir `/` e `/pricing` locais.
