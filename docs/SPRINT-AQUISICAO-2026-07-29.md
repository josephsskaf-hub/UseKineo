# SPRINT DE AQUISIÇÃO — 29/07/2026 (5h)

**Objetivo dado:** aumentar o volume que entra no site.
**Executado por:** CEO operacional, sozinho. **Base:** commit `f2d952b` → `9022d3c`.
**Tudo abaixo está NO AR e verificado ao vivo, não descrito.**

---

## 1. A MEDIÇÃO QUE REDEFINIU O PROBLEMA

Antes de escrever qualquer página nova, fui ver se o Google enxerga as que já existem. Google Search Console, `sc-domain:usekineo.com`, 29/07:

| Métrica | Valor |
|---|---:|
| Páginas indexadas | **55** |
| Páginas NÃO indexadas | **43** |
| **Cliques de busca web — história inteira** | **8** |
| Páginas de vídeo indexadas | **0 de 10** |

Oito cliques. O Google não é um canal da Kineo — é um canal fechado.

E a superfície técnica **não** é a culpada: o sitemap cobre 106 URLs, o `robots.ts` tem allow-list explícita para GPTBot, ClaudeBot, PerplexityBot e Google-Extended, existe `llms.txt`, existe `/api/facts` com CORS aberto, e 20 páginas emitem JSON-LD. Esse trabalho já estava feito e está bem feito. **Publicar mais páginas não era a alavanca.**

### As 43, destrinchadas

| Razão | Páginas |
|---|---:|
| **Discovered – currently not indexed** | **21** |
| Page with redirect | 6 |
| Excluded by 'noindex' tag | 5 |
| **Crawled – currently not indexed** | **5** |
| Duplicate without user-selected canonical | 4 |
| Alternate page with proper canonical tag | 2 |

> ⚠️ **Correção de uma leitura minha.** Na primeira passada eu li "26 páginas que o Google avaliou e recusou". Errado, e a diferença muda a prescrição inteira. São **21 "Discovered"** — o Google sabe que a URL existe (leu no sitemap) e **nunca chegou a rastreá-la** — e apenas **5 "Crawled"**, que é a rejeição por qualidade de verdade.
>
> 21 páginas não rastreadas é sintoma de **crawl budget e autoridade de domínio**, não de conteúdo ruim. Isso é consertável. Rejeição por qualidade, não seria — não em cinco horas.

---

## 2. 🔴 O QUE O GOOGLE ESTAVA MOSTRANDO DE VERDADE

`site:usekineo.com`, 29/07. O que ranqueia hoje:

`/avatar` · `/animate` · `/affiliate` · `/signup` — **telas de app logado.** Com estes títulos:

> **"AI Avatar Studio — ShortsForgeAI"** · **"From $11.90/mo"** · *"viral YouTube Short in 60 seconds"*

Conferi por grep: **nenhuma dessas strings existe mais no repositório.** E conferi ao vivo com JavaScript no navegador — `/avatar` serve hoje `AI Avatar Studio — Kineo`.

**As páginas foram consertadas. O Google é que nunca recrawleou.** Quem encontra a Kineo hoje pode ver uma marca morta, a um preço que nunca cobramos, prometendo 60 segundos quando a mediana medida é 2,30 min — numa tela que ele não consegue usar sem conta.

Dois custos, ambos reais:

1. **Crawl budget.** Num domínio onde 21 landing pages de verdade nunca foram rastreadas, todo crawl gasto numa tela de app é um crawl a menos numa página feita para converter.
2. **Marca.** O snippet velho *é* a primeira impressão.

---

## 3. O QUE FOI FEITO — tudo no ar

### 3.1 ✅ As 11 telas de app saíram do índice

`noindex, follow` no route group `(dashboard)`. Uma linha, cobre `/avatar`, `/animate`, `/affiliate`, `/referral`, `/templates`, `/channel`, `/autopilot`, `/account`, `/thumbnail-generator`, `/my-videos`, `/video`.

**`noindex` e NÃO `Disallow` no robots.txt** — inverter isso é um gol contra clássico. `Disallow` bloqueia o **crawl**, e página que o Google não rastreia é página cujo `noindex` ele nunca lê: a URL ficaria **congelada no índice com o título velho para sempre**. A ordem certa é servir `noindex`, deixar cair, e só então considerar bloquear. `follow: true` de propósito — link interno segue passando sinal enquanto a página envelhece para fora.

**Verificado ao vivo, e a verificação importava:** `/viral-now` mora dentro de `(dashboard)`, está no sitemap com prioridade 0.9 e teria sido desindexado por acidente. Ele declara `index: true` na própria página e sobrescreve o layout. Confirmado no HTML servido:

| URL | `meta robots` ao vivo |
|---|---|
| `/avatar` (app) | `noindex, follow` ✅ |
| `/viral-now` | `index, follow` ✅ |
| `/ai-avatar` · `/pricing` · `/faceless-video-generator` | sem tag = indexável ✅ |

### 3.2 ✅ `lastModified` do sitemap: 25/07 → 29/07

Não é cosmético. A data velha diz ao Google *"não há nada novo aqui"* — exatamente o sinal errado quando o problema **é** cache velho.

### 3.3 ✅ IndexNow: 106 URLs submetidas — a primeira vez na história do projeto

```
{ "mode": "submitted", "httpStatus": 200, "urlCount": 106,
  "host": "www.usekineo.com", "submittedAt": "2026-07-29T22:05:02.751Z" }
```

`scripts/submit-indexnow.mjs` existia, a chave já estava publicada em `public/`, e **nunca tinha sido executado.**

**Por que este é o item de maior valor da sprint, e não é sobre o Bing por si:**

> A busca do **ChatGPT roda em cima do índice do Bing**. E o ChatGPT é, com folga, a melhor fonte de aquisição que a Kineo já mediu — `docs/growth`, 23/07: **ChatGPT trouxe 4 cadastros e OS DOIS únicos checkouts da semana. O Google inteiro trouxe 1 sessão e zero.**

Ou seja: a fonte que converte 100% dos checkouts da semana depende de um índice que ninguém nunca alimentou. O Google leva semanas e ignora `lastmod` quando quer. O Bing age sobre IndexNow em horas.

---

## 4. O QUE EU NÃO FIZ, E POR QUÊ

**Bing Webmaster Tools — nunca foi configurado.** Confirmei: a conta não existe. Configurar exige autenticar uma conta Microsoft, e criar conta/entrar com senha é linha que eu não cruzo. **É o seu item de 10 minutos com maior retorno da lista**, e tem importação em um clique a partir do Search Console. O IndexNow já funciona sem ele; o Webmaster Tools te dá a *visibilidade* do canal.

**Não submeti a diretórios.** Os ~20 gratuitos com dofollow confirmado (FutureTools, Fazier, Microlaunch, OpenAlternative, Twelve Tools, aitools.fyi, Dang.ai, TinyLaunch, Findly) exigem criação de conta ou CAPTCHA. O Bing também me serviu CAPTCHA numa checagem de índice e eu parei ali.

**Não pedi reindexação em massa no GSC.** Para as 5 páginas em "Crawled – not indexed", pedir de novo não muda um julgamento de qualidade já feito. Para as 21 em "Discovered", o conserto certo é crawl budget — que é o que a §3.1 acabou de liberar.

**Não escrevi páginas novas de SEO.** Com 21 páginas existentes que o Google nunca rastreou, publicar a de número 107 seria diluir crawl budget que já não dá conta do que existe. Esse é o erro que essa sprint estava desenhada para não cometer.

---

## 5. A VERDADE ESTRATÉGICA QUE VOCÊ PRECISA OUVIR

Consertei tudo que estava tecnicamente quebrado na aquisição orgânica, e isso era real. Mas quero ser direto sobre o teto:

**Um domínio de três meses, sem backlinks, não ranqueia — por melhor que seja o SEO on-page.** O trabalho técnico aqui está entre os melhores que já vi num produto deste estágio, e o resultado são 8 cliques. A variável que falta não é on-page. É **autoridade**, e autoridade vem de links e menções de fora.

Por isso os diretórios não são um item menor de checklist — **são a alavanca principal, e são a única que depende de você**, porque cada um exige uma conta. A ordem que eu faria:

1. **Bing Webmaster Tools** — importar do GSC, 10 min. Abre visibilidade no canal que já converte 100% dos seus checkouts.
2. **AlternativeTo** — sua página existe com **0 likes**. "Suggest alternative" em 15–20 páginas de concorrentes (OpusClip, Submagic, InVideo AI, Klap, Crayo, AutoShorts, Revid, Faceless.so, Syllaby, Pictory, HeyGen, Fliki, SendShort, Zebracat, Quso). Intenção de compra altíssima.
3. **FutureTools** (futuretools.io/submit-a-tool) — curado pelo Matt Wolfe, ~700k inscritos. Entrar aqui é entrar no radar dele.
4. **Fazier** — 57 links externos, 0 nofollow. Melhor razão dofollow/esforço da lista inteira.
5. **TAAFT** — as 6 ferramentas grátis (`/free-script-generator`, `/free-hook-generator`, `/viral-score`, `/shorts-money-calculator`, `/free-ai-shorts-generator`, `/niche-picker`) qualificam individualmente na rota gratuita: `https://tally.so/r/mRWbdK`. São 6 listagens a mais apontando para o domínio.

---

## 6. COMO SABER SE FUNCIONOU

Reconferir em **7 dias**, no Search Console:

| Métrica | Baseline 29/07 | O que significa subir |
|---|---:|---|
| **"Discovered – currently not indexed"** | **21** | ↓ = o crawl budget liberado está sendo usado nas páginas certas. **É a métrica primária desta sprint.** |
| Páginas indexadas | 55 | Deve cair um pouco primeiro (as 11 telas de app saindo) e depois subir |
| Cliques de busca web | 8 (total histórico) | Qualquer número de dois dígitos já é ruptura |
| Páginas de vídeo indexadas | 0 de 10 | Canal inteiro fechado hoje |

⚠️ **Espere as indexadas caírem antes de subirem.** As 11 telas de app vão sair do índice nas próximas semanas — isso é o conserto funcionando, não uma regressão.
