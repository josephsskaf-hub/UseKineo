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

## O que mudou no código
- **`lib/seo/dominioAntigo2611.ts` (novo):** a regra pura `decidirDominioAntigo2611`. Vale para os TRÊS hosts antigos (`shortsforgeai.com`, `www.shortsforgeai.com`, `shortsforgeai.vercel.app`) e nunca lê o user-agent.
  - **Uma lista só, `URLS_DA_CONTA_2611`,** com as 7 URLs finais e a origem de cada uma na conta, a mesma nos três hosts:
    - `/` e `/pricing` servem no próprio host;
    - `/ai-shorts/2-clicks`, `/signup`, `/start`, `/generate` e `/my-videos` mostram a home no próprio host a quem CHEGA (do anúncio, do robô, digitando);
    - nas páginas de conta (`/signup`, `/start`, `/generate`, `/my-videos`), o clique DE DENTRO da página (cabeçalho `Sec-Fetch-Site: same-origin`, que o NAVEGADOR manda) segue com o 308 para www.usekineo.com. Nenhuma sessão nem cookie nasce no host antigo.
  - **O que a página carrega ao abrir fica no mesmo host:**
    - mídia e fontes da pasta public (mp4, woff2, ico…). `_next`, imagens e a fonte manrope o matcher já deixa fora do middleware;
    - as 12 chamadas de leitura medidas no navegador ao abrir a home e o /pricing;
    - as 2 escritas que a página faz sozinha: `POST /api/events` e `POST /api/consent`.
  - **A pré-carga de outra página:** o fetch da página (cabeçalho `Sec-Fetch-Dest: empty`) a uma página fora da lista recebe **204** no mesmo host. O Next então abre a página por navegação normal, que leva o 308.
    - O Next 14 apaga o cabeçalho `RSC` e o `_rsc` antes do middleware (`next/dist/server/web/adapter.js`, FLIGHT_PARAMETERS), por isso o sinal é o `Sec-Fetch-Dest`.
  - **Fora da regra:** `/api/stripe/webhook` e `/api/youtube/*` (o callback do OAuth registrado em `shortsforgeai.vercel.app/api/youtube/callback`). Nesses caminhos o middleware nem chama a regra e faz o de hoje: roda no lugar.
  - **[V1 da revisora] Arquivo da página só nas pastas reais da public:** lista fechada `PASTAS_DA_PUBLIC_2611` (previews, videos, fonts, sfx, pwa, home-images, home-mosaic, posters, screening-room, nav-thumbs, ads-exemplos, ads-styles, models, og) e os dois arquivos da raiz que o navegador pede (`/favicon.ico`, `/manifest.webmanifest`).
    - Antes, qualquer caminho com final `.js`, `.css` ou `.mp4` passava, e rota dinâmica EXECUTAVA no host antigo (`/admin/people/x.css`, `/api/render/x.mp4`, `/a/CODE.js`, `/s/tiktok.js`). Agora esses caminhos dão 308.
    - Ficam fora de propósito: `auth`, `ads`, `kids-cartoon` e `trending` (também são rotas do app), `design` e `gpt` (a página não pede).
    - O guardião confere no disco que cada pasta da lista existe na `public` e NÃO é rota do app.
  - **[V2 da revisora] Nenhuma sessão no host antigo:** tudo o que a regra serve sai do middleware ANTES do `updateSession`. O pedido chega ao app SEM os cookies `sb-*` e a resposta os apaga (`Max-Age=0`). Vale nos três hosts.
    - Assim nada renova, lê nem cria sessão lá: a página é a de visitante, `/api/stripe/change-plan` não lê plano, `/api/stripe/checkout/resume?go=1` não acha conta.
    - O guardião prova no MIDDLEWARE REAL (com dublês só do que não é desta regra): cookie `sb-*` velho no pedido → o app recebe o pedido sem ele, a resposta traz `sb-*` com valor vazio e Max-Age 0, e o `updateSession` não roda. Em www.usekineo.com e no `/api/youtube/callback`, o caminho de sempre.
  - **Todo o resto:** o 308 de hoje.
- **`middleware.ts`:** aplica a regra antes do bloco do 308, exceto nos caminhos que já rodavam no host antigo. Passa `Sec-Fetch-Dest` e `Sec-Fetch-Site`. Os hosts, as exceções e o destino www.usekineo.com ficam como estão.
- **`scripts/test-dominio-antigo-2611.mjs` (guardião):** os três hosts × as 7 URLs, quem chega × clique de dentro, webhook e YouTube fora, V1 contra o disco, V2 no middleware real; 29/29 mutantes mortos.

## Tabela final: host × URL × resposta (depois do deploy e da mudança na Vercel)
"Antes" foi medido em produção por curl: todo endereço dos três hosts dava `308 → https://www.usekineo.com/<mesmo caminho>` (Vercel no .com e no www; middleware no vercel.app). "Depois" sai da regra, provado pelo guardião. As linhas marcadas com * também foram medidas no build de produção desta branch (rodada anterior, só .com e www); as demais ainda não foram medidas em build.

| URL | shortsforgeai.com | www.shortsforgeai.com | shortsforgeai.vercel.app |
|---|---|---|---|
| `/` (e `/#how-it-works`, `/?gclid=…`, HEAD) | **200** * | **200** * | **200** |
| `/pricing` | **200** * | **200** * | **200** |
| `/ai-shorts/2-clicks` | **200** (a home) * | **200** (a home) * | **200** (a home) |
| `/signup`, `/start`, `/generate`, `/my-videos`, quem chega | **200** (a home) | **200** (a home) | **200** (a home) |
| as mesmas, clicadas de dentro da página | 308 → www (mesmo caminho) | 308 → www | 308 → www |
| pré-carga de outra página (fetch da página) | **204** * | **204** * | **204** |
| `/studio`, `/login`, `/admin`, `/generate/…`, `/signup/` | 308 → www * | 308 → www * | 308 → www |
| `/admin/people/x.css`, `/api/render/x.mp4`, `/a/CODE.js`, `/s/tiktok.js` (final de arquivo fora das pastas da public) | 308 → www | 308 → www | 308 → www |
| qualquer URL servida acima, com cookie `sb-*` velho | **200** sem sessão, `sb-*` apagado | o mesmo | o mesmo |
| `/api/stripe/checkout?…` (botão de compra), POST `/api/stripe/checkout` | 308 → www * | 308 → www * | 308 → www |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | 308 → www * | 308 → www * | 308 → www |
| as 12 leituras da página, POST `/api/events`, POST `/api/consent`, `/previews/*.mp4` | **200** * | **200** * | **200** |
| `/api/stripe/webhook` | executa no lugar * | executa no lugar * | executa no lugar (igual a hoje) |
| `/api/youtube/callback` e `/api/youtube/*` | executa no lugar | executa no lugar | executa no lugar (igual a hoje) |

- **O mesmo HTML para todos** (medido na rodada anterior):
  - `/`, `/pricing` e `/ai-shorts/2-clicks` foram baixados com 4 user-agents: navegador comum, `AdsBot-Google`, `AdsBot-Google-Mobile` e `Googlebot/2.1`;
  - deu o mesmo tamanho e o mesmo hash nos quatro (583 748, 128 229 e 583 786 bytes).
  - `/signup`, `/start`, `/generate` e `/my-videos` servem a mesma home (reescrita), sem ler user-agent.
- **Canonical:** `/` e as URLs que mostram a home levam `<link rel="canonical" href="https://www.usekineo.com">`; `/pricing` leva `href="https://www.usekineo.com/pricing"`. É o metadata de sempre.

## Login, cadastro, compra e sessão
- **O cookie de sessão é por domínio.** No host antigo, a pessoa é sempre visitante.
- **Entrar e cadastrar:** "Log in" e "Get started" levam a `/login` e `/signup?utm_source=nav`.
  - No clique, o Next tenta a pré-carga: 204 no mesmo host (o fetch é same-origin).
  - Depois ele navega; a navegação é same-origin e leva 308 para `https://www.usekineo.com/login` ou `/signup`.
  - O login e o cookie nascem em www, como hoje.
- **Quem chega pelo anúncio em `/signup`** vê a home; o clique em "Get started" ali dentro leva a www.usekineo.com/signup.
- **Limite conhecido:** navegador sem `Sec-Fetch-Site` (Safari antes de 16.4) não distingue o clique de dentro. Nele, clicar em "Get started" numa página que já é `/signup` mostra a home de novo; o "Log in" funciona.
- **Por que o clique se distingue pelo `Sec-Fetch-Site` e não só pelo host (V3 da revisora):** quem chega do anúncio e quem clica em "Get started" dentro da página pedem a MESMA URL (`/signup`) no MESMO host. Só o host não separa os dois.
  - Para decidir só pelo host, os botões de conta da página teriam de apontar direto para www.usekineo.com quando a página roda no host antigo. Isso é mudança na tela (o par login/signup e a home, área do GPT).
  - Sem tocar em tela, o sinal que sobra é um cabeçalho que o NAVEGADOR manda (`Sec-Fetch-Site`), nunca o user-agent. Para o robô do Google e para quem chega do anúncio, a resposta é a mesma.
  - Se a CEO preferir a versão só por host, o pedido ao GPT é: no host antigo, os botões de conta da home e do /pricing navegam para `https://www.usekineo.com/signup` com a mesma query. Depois disso o `Sec-Fetch-Site` sai da regra.
- **Comprar:** os botões de plano do /pricing navegam para `/api/stripe/checkout?tier=…` (navegação de página, `app/pricing/PricingClient.tsx` ~815). No host antigo ela leva 308 para www com a mesma query, e o checkout segue em www.

## Risco para a busca e para as citações do ChatGPT
- **Busca:**
  - só as 7 URLs passam a ter cópia nos domínios antigos, e as cópias apontam o canonical para www.usekineo.com;
  - robots.txt e sitemap.xml dos domínios antigos continuam no 308 para www;
  - o resto continua redirecionando: o Google segue consolidando em www.
- **Citações do ChatGPT:** nenhum texto, página ou endereço de www.usekineo.com mudou.
- **Risco restante nos anúncios:**
  - os anúncios e os sitelinks antigos têm a marca ShortsForgeAI e preços velhos ("Plans From $11.90/Month", "$4.90/mo", "7-Day Money Back");
  - a página agora abre no mesmo domínio, mas mostra Kineo e o preço de hoje;
  - isso pode virar outro motivo de reprovação (conteúdo diferente do anúncio). Não dá para editar nem remover enquanto a conta estiver suspensa.

## Como desfazer em uma linha
- **No código:** em `lib/seo/dominioAntigo2611.ts`, `HOSTS_DO_DOMINIO_ANTIGO_2611 = new Set()`. O middleware volta ao 308 de tudo.
- **Ou na Vercel:** pôr de volta "Redirect to www.usekineo.com (308)" nos dois domínios.

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
- **Guardião:** `node scripts/test-dominio-antigo-2611.mjs` (29/29 mutantes, só AssertionError).
- **tsc:** `--noEmit -p .`, 0.
- **`novos-vermelhos`** sobre os guardiões que citam o `middleware.ts` ou a regra: 21 guardiões; 5 vermelhos, todos já vermelhos na main; **0 vermelho novo** (rodado sobre esta regra).
  - O `test-afiliados-40-2026-10-06` monta o middleware real com um dublê da regra, inerte em www.usekineo.com como a real: 31 ok e 0 falha.
- **Tabela (linhas com *):** `next build` e `next start` desta branch na rodada anterior (env falsa, sem chave) e `curl -H "Host: shortsforgeai.com" -H "X-Forwarded-Host: shortsforgeai.com"`. As linhas novas (vercel.app, `/signup`, `/start`, `/generate`, `/my-videos`) estão provadas pelo guardião, não por build.
- **Chamadas da página:** medidas com `performance.getEntriesByType('resource')` no navegador, ao abrir `/` e `/pricing` locais.
- **URLs finais da conta:** coluna "URL final" da tabela de anúncios e o cartão de cada sitelink, lidos em 26/11 (fotos 13 e 16 em `docs/google-ads/retirada-2611/`).
