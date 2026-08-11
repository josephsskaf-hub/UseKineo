# SEO que escala com uso: as 918 páginas de vídeo — indexação, qualidade e ligação com a oferta

`[KINEO-SEO-VIDEO-PAGES-2026-08-11]` · auditado e medido em produção em 11/08/2026

O único SEO que vale a pena aqui é o que cresce sozinho. O produto tem **918 vídeos**
(914 completos), e a tabela cresceu **169 linhas nos últimos 7 dias** sem ninguém
escrever uma palavra. Escrever mais landing page à mão custa esforço linear;
garantir que essas 918 páginas sejam indexáveis, boas e ligadas à oferta custa uma
vez e rende para sempre.

O ponto de partida é feio: **zero eventos vindos do Google em 7 dias, contra 2.131
sessões**. Este documento separa o que é problema nosso (e foi consertado) do que
só o Search Console responde.

---

## 1. O Google está engolindo? Evidência medida, não opinião

Tudo abaixo foi medido contra `https://www.usekineo.com` em 11/08/2026, não contra
o código.

### 1.1 O sitemap está de pé, e a correção de 04/08 pegou

| Verificação | Resultado |
|---|---|
| `GET /video-sitemap.xml` | **HTTP 200**, `application/xml`, 602 KB |
| `X-Video-Sitemap-Count` | **650** |
| `<loc>` emitidos | 650 (6 exemplos + **644 páginas `/v/…`**) |
| `<loc>` duplicados | **0** |
| `<video:player_loc>` | **0 ocorrências** ✅ |
| `<video:content_loc>` idêntico ao `<loc>` da mesma entrada | **0** ✅ |
| `robots.txt` declara os dois sitemaps | sim (`/sitemap.xml` e `/video-sitemap.xml`) |

**A correção de 04/08 está viva em produção.** O erro que fez o Google descartar
557 de 561 vídeos (`player_loc` repetindo o `<loc>`) não existe mais em nenhuma das
650 entradas. Do lado do XML, o problema de 04/08 está resolvido.

### 1.2 Amostra real de 20 entradas: páginas, thumbnails e MP4

Amostra aleatória (seed fixa) de 20 entradas do sitemap de produção, com `GET` na
página e `HEAD` no thumbnail e no MP4:

- **página `/v/[id]`: 20/20 → HTTP 200**
- **`thumbnail_loc`: 20/20 → HTTP 200, `image/png`** (a rota `/v/[id]/opengraph-image`,
  1200×630, muito acima do mínimo de 160×90 do Google)
- **`content_loc`: 20/20 → HTTP 200, `video/mp4`**
- **`<meta name="robots">`: ausente em todas** — ou seja, indexáveis de fato, sem
  `noindex` acidental. O JSON-LD `VideoObject` está presente em todas.

### 1.3 …mas 27 entradas anunciavam um MP4 MORTO

A amostra de 20 caiu, por sorte, toda em URLs do storage do Supabase. Ao testar
**todas as 40 entradas cujo `content_loc` NÃO é o storage do Supabase**, o quadro
muda:

| Host do `content_loc` | Entradas | Resultado do `HEAD` |
|---|---|---|
| `www.usekineo.com/videos/*` (exemplos) | 6 | **6× 200** |
| `f002.backblazeb2.com` (bucket de entrega do Creatomate) | 33 | **7× 200, 26× 404** |
| `dnznrvs05pmza.cloudfront.net` (Runway, URL assinada `?_jwt=`) | 1 | **1× 401** (assinatura expirada) |
| `cqqukkvjjrguayiyjvhh.supabase.co` (storage próprio) | 610 | amostrado: **16/16 200**, incluindo as 12 mais ANTIGAS |

**27 das 650 entradas (4,2%) apontavam para um arquivo que já não existe.** E não é
só o sitemap: essas 27 páginas continuavam **indexáveis**, servindo um `<video>`
quebrado para qualquer humano que chegasse da busca.

As backblaze ainda vivas eram todas de **03–06/08** — a retenção do bucket de
entrega do Creatomate é de poucos dias. Não existe URL backblaze "boa": existe URL
backblaze que ainda não morreu. No banco: **91 linhas backblaze + 6 cloudfront
assinadas contra 817 no storage próprio.**

### 1.4 Quantas passam no portão de qualidade

`lib/publicVideos.ts` já reprovava conteúdo raso (título < 20 chars, transcrição
< 240 chars / < 45 palavras) e deduplicava por transcrição. Efeito medido:
**914 linhas completas → 644 páginas `/v/…` no sitemap** (70%). As 270 de fora
renderizam normalmente para o dono que compartilhou o link, mas com
`robots: noindex` e fora do sitemap. **O portão funciona e a página nunca é um
soft-404** — id inexistente devolve 404 de verdade; queda do Supabase devolve a
página amigável com `noindex`, não 404 em massa.

---

## 2. Qualidade das páginas `/v/[id]`: melhor do que se esperava

Auditadas com olhos de quem procura conteúdo raso. Elas **não** são "um player e um
botão":

- **Texto único e substancial**: o roteiro sai do campo `topic` do banco, limpo de
  marcadores (`HOOK`, `[Pexels: …]`, blocos de produção) e quebrado em parágrafos
  legíveis, sob um `<h2>` honesto — "Full script" só quando a linha realmente
  carrega os marcadores, senão "The brief behind this video".
- **Title e meta description descrevem o vídeo**: derivados da primeira frase real
  da narração (não do `title` do banco, que vem truncado em 60 chars no meio da
  palavra). Canonical próprio (`/v/<id>`), corrigido no PUSH #92.
- **Dados estruturados**: `VideoObject` + `BreadcrumbList`, emitidos **apenas** nas
  páginas indexáveis.
- **Links internos**: até 9 irmãs do mesmo vertical, a estante do vertical, o hub
  `/scripts` e 8 páginas comerciais (`/pricing`, `/faceless-video-generator`,
  `/free-ai-shorts-generator`, `/youtube-shorts-from-topic`, …). Não são folhas
  órfãs.
- **`youtube_description` e `hashtags`** entram como seções próprias quando existem.

**Nada a consertar aqui.** O trabalho de 03/08 (biblioteca de scripts) resolveu.

### O que ainda estava errado (e foi consertado)

1. **Prompt interno publicado como `<h1>`.** `lib/seriesContinuation.ts` grava em
   `topic` a instrução literal *"Create the next episode in the same Short series
   about … Keep the topic and format recognizable, but use a completely new hook …
   Do not repeat the previous episode."* Ela é longa e única, então passava batida
   pelo portão de tamanho. **3 das 650 entradas do sitemap tinham essa frase como
   título E como meta description.** A biblioteca (`lib/scriptLibrary.ts`) já se
   recusava a exibir esses cards, mas isso limpava só a vitrine, não o índice.
   E `/api/cron/autopilot-generate` roda **de hora em hora** gravando essa forma —
   o número só cresceria.
2. **Títulos duplicados.** 650 entradas carregavam apenas **638 títulos distintos**
   e 643 descrições distintas. Onze/doze pares subiram com `<h1>` e
   `<meta description>` idênticos byte a byte — duas URLs quase iguais dividindo o
   sinal uma da outra. A deduplicação existente compara os primeiros 400 caracteres
   da transcrição, e isso não é apertado o bastante.

---

## 3. Ligação com a oferta: já estava certa

Quem cai numa `/v/[id]` vinda da busca encontra **dois** CTAs, ambos lendo a oferta
canônica de `lib/freeTierOffer.ts` via `getFreeTierOffer()` + `ft()`:

- o card "Made in a few minutes with AI" logo abaixo do player, com
  `/signup?utm_source=public_video&…&prompt=<título>`;
- "Generate a Short from this script →" no fim do roteiro — o momento em que o
  leitor está com a ideia na cabeça.

**Zero preço hardcoded, zero menção a desconto, zero número de crédito literal** na
página. A troca do free tier pela flag de reverse trial já pega essas superfícies
automaticamente. Nada a mudar — confirmado por leitura linha a linha de
`app/v/[id]/page.tsx`.

---

## 4. Canibalização: o diagnóstico correto é outro

As 918 páginas **não** competem com as páginas comerciais. Elas disputam cauda
longa informacional ("Star of the South diamond", "Monaco richest place") e as
comerciais disputam intenção de compra ("ai shorts generator", "faceless video
generator"). Não há sobreposição de termo — **não é canibalização**.

O risco real é outro e tem nome: **scaled content abuse** (política do Google
atualizada em 15/05/2026, que se aplica "no matter how it's created" e não abre
exceção para conteúdo de usuário). Multiplicar um template centenas de vezes é o
padrão que derruba o domínio inteiro.

Por isso a regra adotada aqui é **conservadora por escolha**: na dúvida entre
indexar lixo e não indexar, **não piorar**. Uma página reprovada continua
renderizando para o dono que compartilhou o link (não quebramos o produto), mas sai
do índice e do sitemap.

**Nenhuma página boa foi rebaixada. Só saíram as que já estavam quebradas,
duplicadas ou eram máquina interna vazando.**

---

## 5. IndexNow / Bing: o buraco maior de todos

O repo tinha `scripts/submit-indexnow.mjs` e ele funciona. O problema era **o que**
ele submetia e **quando**:

| | URLs | `/v/…` entre elas |
|---|---|---|
| `/sitemap.xml` (o único que o script lia) | 164 | **0** |
| `/video-sitemap.xml` (que ele ignorava) | 650 | **644** |

**As 644 páginas de vídeo nunca foram submetidas ao IndexNow. Nem uma vez.** E o
único gatilho era um humano lembrar de rodar `npm run seo:indexnow:submit`.

Isso dói exatamente aqui: o IndexNow alimenta o **Bing**, e o Bing é o índice por
trás da busca do **ChatGPT** — a fonte de aquisição que mais converte segundo as
medições do próprio produto (`docs/growth`, 23/07: ChatGPT trouxe 4 signups e os
2 checkouts da semana; Google trouxe 1 sessão e zero). O Google ignora IndexNow;
o Bing age em horas. Com o Google mandando **zero eventos em 7 dias**, apostar só
nele seria apostar na fonte que não entregou.

---

## O que foi mudado

| Arquivo | Mudança |
|---|---|
| `lib/publicVideos.ts` | `hasDurablePlayback()` — URL assinada (`_jwt`, `token`, `Expires`, `X-Amz-Signature`…) ou host de entrega de terceiro reprova o portão. Allow-list derivada de `NEXT_PUBLIC_SUPABASE_URL` + host canônico. |
| `lib/publicVideos.ts` | `isPromptScaffolding()` promovido a **reprovação de portão**: o prompt de continuação de série nunca mais vira `<h1>` público. |
| `lib/publicVideos.ts` | Segunda impressão digital, no **título normalizado**, em `listIndexablePublicVideos()`. Mantém a mais nova de cada par. |
| `lib/publicVideos.ts` | Alarme: se > 50% das linhas reprovarem por durabilidade, `console.error` — evita o sitemap colapsar em silêncio se o host do storage mudar. |
| `lib/scriptLibrary.ts` | A regex de scaffolding subiu para `publicVideos.ts` (direção de import inalterada, sem ciclo); re-exportada para os call sites existentes. |
| `lib/indexnow.ts` **(novo)** | Submissor compartilhado: normaliza, valida host/protocolo, deduplica, corta em 10.000, suporta `dryRun`. URL torta agora vai para `skipped` em vez de derrubar o lote inteiro. |
| `app/api/cron/submit-indexnow/route.ts` **(novo)** | Cron diário. Auth fail-closed com `CRON_SECRET`. Submete só páginas que passaram no portão, só as da janela de 3 dias, teto de 500 + 2 hubs. Read-only no banco. |
| `vercel.json` | Cron registrado às 07:35 UTC. |
| `scripts/submit-indexnow.mjs` | Passa a ler **os dois** sitemaps e mesclar. Continua servindo para backfill manual. |

### Efeito medido (simulação das novas regras sobre o XML de produção de 11/08)

```
antes:  650 entradas
depois: 602 entradas
removidas: 34 por URL não durável  (27 delas já respondiam 404/401)
            3 por prompt vazado
           11 por título duplicado
```

Fica em ~596 páginas `/v/…` + 6 exemplos. **Perde-se 7% das entradas e ganha-se um
sitemap em que toda entrada resolve.** Sete páginas backblaze que ainda respondiam
200 saem junto — de propósito: elas morrem em dias, e uma página indexada com
player quebrado é pior do que uma página não indexada.

### Verificação

- `npx tsc --noEmit` no repo inteiro: **EXIT=0**. Falsificado: erro proposital
  injetado em `lib/indexnow.ts` → `EXIT=2` com `TS2304`; removido → `EXIT=0`.
- **Prova comportamental** (não só tipos): as funções puras foram compiladas com
  esbuild e executadas contra 9 casos de portão e 10 de predicado — todos verdes.
  O harness também foi falsificado (rodado com `NEXT_PUBLIC_SUPABASE_URL` apontando
  para outro projeto → saída não-zero), provando que ele é capaz de reprovar.
- Nada nesta mudança toca preço, crédito, entitlement, e-mail ou qualquer escrita
  no banco.

---

## O que SÓ o Search Console responde

Sem acesso ao GSC, estas perguntas ficam abertas. **O fundador precisa abrir e olhar:**

1. **Relatório "Vídeos" → o sitemap foi reprocessado depois de 04/08?** O XML está
   correto hoje, mas se o GSC ainda mostrar "557 errors" de 04/08, o Google
   simplesmente não voltou. Ação: reenviar `/video-sitemap.xml` manualmente em
   *Sitemaps* e conferir a data de "Última leitura".
2. **Cobertura: quantas `/v/…` estão "Indexadas" vs "Descobertas – não indexadas"?**
   "Descoberta, atualmente não indexada" em massa é o sintoma clássico de orçamento
   de rastreamento gasto com páginas de baixo valor — exatamente o que as remoções
   acima atacam.
3. **Alguma ação manual ou "Problemas de segurança"?** Uma penalidade por *scaled
   content abuse* explicaria zero eventos com 2.131 sessões melhor do que qualquer
   defeito técnico. **Checar isto primeiro** — se houver, nada mais importa até
   resolver.
4. **Impressões vs cliques nas `/v/…`**: se há impressões e zero clique, o problema
   é título/description (CTR). Se não há nem impressão, é indexação. São consertos
   opostos e só o GSC distingue.
5. **A propriedade cobre `www.usekineo.com` E o domínio antigo?** Ainda há títulos
   em cache da era `shortsforgeai`; sem a propriedade de domínio, metade da
   história fica invisível.
6. **Bing Webmaster Tools**: confirmar que as submissões IndexNow estão sendo
   aceitas (`Submitted URLs` > 0) depois que o cron rodar pela primeira vez. É o
   canal que realmente converte.

---

## Follow-ups (fora do escopo desta mudança)

1. **Consertar a raiz do MP4 morto**: copiar todo render para o storage próprio em
   vez de guardar a URL de entrega do Creatomate. Hoje 91 linhas dependem de um
   bucket de terceiro com retenção de dias. Isso mexe no caminho de render — mudança
   de risco diferente, merece sprint própria. Enquanto não for feito, essas páginas
   ficam `noindex` (correto, mas é remendo).
2. **Divergência conhecida e aceita**: uma página descartada pela deduplicação
   (transcrição ou título) sai do sitemap mas **não** ganha `noindex` na página — a
   dedup é uma decisão entre linhas e a página só enxerga a própria. A garantia que
   importa continua valendo na direção crítica: *o sitemap nunca anuncia uma URL que
   renderiza `noindex`*. Fechar o outro lado exigiria uma segunda consulta por
   render; não vale o custo.
3. **Sharding do sitemap**: o teto é 5.000 (`SITEMAP_MAX_VIDEOS`) e já existe
   `console.warn` ao bater. A ~170 vídeos/semana, isso chega em ~2027.
