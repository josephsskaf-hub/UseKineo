# Teste no Google Search: motor premium pelo nome (01/11/2026) — KINEO-GOOGLE-ADS-TESTE-0111

> **Estado:** pacote pronto. Nada foi publicado no Google Ads e nada foi gasto. O código (rastreio do cadastro) está num
> commit local da worktree; a sessão principal integra e o fundador publica. Pedido do fundador: "vai tudo".
> Este doc substitui o plano de 07/10 (`docs/ANUNCIO-GOOGLE-MOTORES-2026-10-07.md`), que **nunca rodou**: o banco não tem
> uma única visita com `utm_campaign` `motor-*` nem `gs_*` (conferido hoje, 40 dias).

## 0. Resumo

| | |
|---|---|
| **O quê** | 1 campanha **só Search**, 3 grupos: **Kling 4.0 · Seedance · Veo 3 alternative / AI video generator premium** |
| **Quanto** | **US$ 10/dia × 7 dias = US$ 70** (aprovado). Lance: **Maximizar cliques com teto de CPC de US$ 0,80** |
| **Onde** | EUA, Reino Unido, Canadá, Austrália, opção de local **"Presença"**, idioma inglês. Sem Parceiros de pesquisa, sem Display, sem Performance Max |
| **Para onde vai o clique** | A página de motor que **já existe** de cada grupo (nunca a home: anúncio para a home deu 0 cadastros em 332 visitas do Instagram) |
| **Por quê** | 8 de 11 pagantes vieram de quem perguntou ao ChatGPT por um motor premium. Quem digita "veo 3.1 app" no Google tem a mesma intenção — e dá para comprar o clique |
| **Medida** | `docs/queries/GOOGLE-ADS-TESTE-LEITURA-2026-11-01.sql` (só SELECT): visitas → cadastros → checkout → pagantes por grupo `gs_*` |
| **Régua de parada** | **0 cadastros em 3 dias → para.** Gasto chegou a **US$ 70 sem nenhum pagamento → para.** Continua só com ≥ 1 pagante (custo por pagante ≤ US$ 70) |

## 1. O que os números dizem (medido hoje no banco, 60 dias, todas as origens)

| Página de destino | Sessões | Contas | Pagantes | Leitura |
|---|---|---|---|---|
| `/ai-video-generator/seedance` (Seedance 1.5) | 442 | 122 | 2 | a página que mais converte em conta (28%) |
| `/ai-video-generator/veo` | 21 | 5 | 1 | pouco tráfego, mas pagou |
| `/ai-video-generator/kling-3` | 12 | 1 | 0 | — |
| `/ai-video-generator/kling-4` | **0** | 0 | 0 | **nunca recebeu uma visita registrada** |

- Controle positivo da consulta de leitura (padrão `seo_engine_seedance%`, 60 dias): **102 cadastros, 2 pagantes, US$ 28,70** — a consulta conta certo.
- **Correção honesta do briefing:** o banco não tem nenhum cadastro nem evento com `seo_engine_kling4` (60 dias). O Kling 4.0 entra no teste por ser o motor mais novo e o mais buscado, **não** por já ter convertido. É o grupo de maior incerteza; se ele gastar e não cadastrar nos 3 primeiros dias, pause só ele.
- Conta do CPC: no Seedance, 1 pagante a cada ~220 sessões orgânicas. Com teto de US$ 0,80, US$ 70 compram **~85-90 cliques**. Pago costuma converter pior que orgânico, então o esperado honesto é **5-15 cadastros e 0-1 pagante**. É um teste de sinal (o clique pago por nome de motor cadastra?), não uma prova estatística.

## 2. Páginas de destino conferidas (código + produção hoje)

| Grupo | URL de pouso | No ar? | Botão principal | Motor que abre no Studio |
|---|---|---|---|---|
| `gs_kling4` | `/ai-video-generator/kling-4` | 200, título "Kling 4.0 free — your first AI film, no waitlist" | "Make your free Kling 4.0 film" → `/signup?intent_campaign=seo_engine_kling4&redirect=/studio?engine=hollywood…` | Kling 4.0 (a chave `hollywood` vira 4.0 com o interruptor pago ligado) |
| `gs_seedance` | `/ai-video-generator/seedance` | 200 | 3 botões → `/signup?intent_campaign=seo_engine_seedance&redirect=/studio?engine=seedance…` | Seedance 1.5 |
| `gs_veo` | `/ai-video-generator/veo` | 200 | 4 botões → `/signup?intent_campaign=seo_engine_veo&redirect=/studio?engine=veo…` | Veo 3.1 Fast |

- Nenhuma das três cai na home e nenhuma redireciona (os 301 de `next.config.js` são só `kineo-1` e `gemini-omni-flash`). O middleware preserva a query string.
- A tag do Google Ads `AW-18156258081` está no layout raiz (conferido no HTML de produção hoje).
- O guardião `scripts/test-google-landing-0111.mts` confere tudo isso no código (rota existe, botão leva o motor certo, URL final bem formado).

## 3. Rastreio: onde os utm são capturados e o que foi consertado

**O caminho do utm até o perfil** (conferido em `85a82bbe9`):
1. `components/SourceCapture.tsx` (montado no layout raiz, roda em todo pouso) chama `captureSourceOnce()` de `lib/analytics.ts`: `utm_source/medium/campaign` + referrer vão para `localStorage` e para o cookie `kineo_src` (90 dias, **primeiro toque vence**). O mesmo componente grava o **último clique pago** (gclid/gbraid/wbraid/msclkid ou `utm_medium=cpc`, com `utm_term`) no cookie `kineo_paid_click` (90 dias).
2. Todo evento do navegador leva os `utm_*` da aba (`sessionStorage sfa_utms`), inclusive `landing_session_started`.
3. No cadastro, `trackSignupSource()` manda tudo para `app/api/track-signup-source/route.ts`, que grava `profiles.signup_utm_source/medium/campaign`, `signup_referrer` e `gclid` (só colunas ainda nulas).
4. No checkout e no `payment_success`, o clique pago entra como `paid_utm_*` (rota de checkout + webhook).

**O que faltava (consertado neste commit):**

| Caso | Antes | Agora |
|---|---|---|
| Pessoa nova clica no anúncio e se cadastra | `signup_utm_* = google/cpc/gs_<grupo>` ✅ | igual |
| Pessoa que já tinha visitado antes **sem utm** (p.ex. veio do Google orgânico) clica no anúncio e se cadastra | `kineo_src` já existia só com referrer → `signup_utm_campaign` **nulo**: o cadastro não contava em nenhum grupo | o cadastro lê o cookie do clique pago e preenche `google/cpc/gs_<grupo>` |
| Confirma o e-mail numa **aba nova** | `profiles.gclid` nulo (o gclid só morava na aba do pouso) | gclid preenchido a partir do clique pago |
| Primeiro toque com utm de **outro canal** (chatgpt, taaft) | fica | **fica** — origem conhecida nunca é trocada; o anúncio aparece pelo `paid_utm_campaign` no checkout e pela sessão |

Regra no módulo puro `lib/growth/googleAdsTeste0111.ts` (`signupFillFromPaidClick`), ligada em `app/api/track-signup-source/route.ts`. `utm_term` (a palavra-chave) fica nos eventos e no `paid_utm_term` do checkout; o perfil não tem coluna para ela.

## 4. A campanha

| Configuração | Valor |
|---|---|
| Nome | `Kineo - Search - Motores - Teste 0111` |
| Tipo | Pesquisa (Search). **Desmarcar** Parceiros de pesquisa e Rede de Display. Não usar Performance Max |
| Orçamento | **US$ 10,00/dia**, data de início e **data de término = início + 7 dias** |
| Lance | **Maximizar cliques** + **limite máximo de CPC US$ 0,80**. Se em 48 h gastar menos de US$ 5/dia por perder leilão, suba para US$ 1,20 (nunca acima) |
| Locais | Estados Unidos, Reino Unido, Canadá, Austrália · **Opções de local → Presença** |
| Idioma | Inglês |
| Correspondência | Só **exata** `[...]` e **frase** `"..."`. Correspondência ampla, **AI Max**, recursos automáticos e recomendações automáticas: **desligados** |
| URL | Em cada anúncio: campo **URL final** = o URL do grupo (abaixo). No grupo: **Sufixo do URL final** = `utm_term={keyword}` (o Google só troca `{keyword}` no sufixo; o clique chega com o URL de pouso completo) |
| Codificação automática (gclid) | **Ligada** (Administrador → Configurações da conta) |
| Conversões | Compra (`NL4bCKXEwa4cEKGGytFD`) como principal e Cadastro (`SXGYCK_VlrEcEKGGytFD`). Com Maximizar cliques elas não mexem no lance; servem para o relatório |
| Moeda | Se a conta estiver em real, converta US$ 10 e US$ 0,80 pela cotação do dia |

**Marca registrada:** palavra-chave com marca é livre. No **texto** do anúncio, Kling (Kuaishou) e Veo (Google) podem ser reprovados se o dono reclamar. Por isso cada grupo tem um anúncio **A** (com o nome do motor, clica mais) e um **B** (sem marca nenhuma). Se o A for reprovado, não recorra: o B segue. Nada de "official", nada de `{KeyWord:}` dinâmico, nada que sugira parceria.

## 5. Grupos, palavras-chave, anúncios e negativas

Todo número dos anúncios sai do código (preço do Starter de `TIER_PRICES`, créditos do Creator de `TIER_CREDITS`,
filmes do Kling 4.0 de `KLING4_PAID_CREDITS`, filme de 60 s do Seedance 1.5 e do Veo de `creditsPerReferenceVideo`).
O bloco abaixo é **gerado** por `node scripts/gerar-google-ads-teste-0111.mts`, que também conta os caracteres e falha se
algum título passar de 30 ou descrição de 90. O guardião fica vermelho se o preço mudar no código e o doc não for regerado.
Nenhum anúncio diz "free": a busca de grátis é negativa e o anúncio é para quem quer o motor premium.

<!-- KINEO-GOOGLE-ADS-TESTE-0111:GERADO-INICIO (scripts/gerar-google-ads-teste-0111.mts — não editar à mão) -->

### G1 — Kling 4.0

**URL de pouso (o que a pessoa abre):** `https://www.usekineo.com/ai-video-generator/kling-4?utm_source=google&utm_medium=cpc&utm_campaign=gs_kling4&utm_term={keyword}`

Campo **URL final** do anúncio: `https://www.usekineo.com/ai-video-generator/kling-4?utm_source=google&utm_medium=cpc&utm_campaign=gs_kling4` · campo **Sufixo do URL final** (grupo): `utm_term={keyword}`

**Palavras-chave — exata (12):** `[kling 4]` · `[kling 4.0]` · `[kling 4 app]` · `[kling 4.0 app]` · `[kling 4 online]` · `[kling 4.0 online]` · `[kling 4 video generator]` · `[kling 4.0 video generator]` · `[kling 4 ai video]` · `[use kling 4]` · `[kling 4 price]` · `[kling 4 pricing]`

**Palavras-chave — frase (8):** `"kling 4 app"` · `"kling 4.0 online"` · `"kling 4 video generator"` · `"kling 4 ai video generator"` · `"use kling 4"` · `"kling 4 text to video"` · `"where to use kling 4"` · `"kling 4.0 access"`

**Negativas só deste grupo (ampla):** `3.0` · `2.5` · `2.1` · `1.6`

**Anúncio A — com o nome do motor (clique melhor; pode ser reprovado por marca)** · caminho exibido: usekineo.com/Kling-4/Films

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Kling 4.0 Online | 16 |
| 2 | Try Kling 4.0 in Kineo | 22 |
| 3 | Kling 4.0 AI Video Generator | 28 |
| 4 | Kling 4.0 Films With Music | 26 |
| 5 | 15, 30 or 60-Second Films | 25 |
| 6 | 60-Second Film: 150 Credits | 27 |
| 7 | Finished Films, Not Clips | 25 |
| 8 | Narration, Captions and Music | 29 |
| 9 | Type an Idea, Get a Film | 24 |
| 10 | Plans From $9.90/mo | 19 |
| 11 | Vertical 9:16, Ready to Post | 28 |
| 12 | No Waitlist | 11 |
| 13 | Clean MP4 on Paid Plans | 23 |
| 14 | Cancel Anytime | 14 |
| 15 | Script, Scenes and Edit Done | 28 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Type one idea. Kineo directs Kling 4.0 scenes and adds narration, captions and music. | 85 |
| 2 | Kling 4.0 films of 15, 30 or 60 seconds cost 45, 80 or 150 credits. | 67 |
| 3 | Plans from $9.90/mo. Paid plans export clean MP4s with no watermark. Cancel anytime. | 84 |
| 4 | One vertical MP4, ready to post. No editing and no stitching raw clips together. | 80 |

**Anúncio B — sem marca de terceiro (segue rodando se o A for reprovado por marca)** · caminho exibido: usekineo.com/AI-Video/Films

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Cinematic AI Films Online | 25 |
| 2 | 15, 30 or 60-Second Films | 25 |
| 3 | Premium AI Video Models | 23 |
| 4 | AI Video With Voiceover | 23 |
| 5 | One Idea, One Finished Film | 27 |
| 6 | Finished Films, Not Clips | 25 |
| 7 | Narration, Captions and Music | 29 |
| 8 | Type an Idea, Get a Film | 24 |
| 9 | Script, Scenes and Edit Done | 28 |
| 10 | Vertical 9:16, Ready to Post | 28 |
| 11 | Plans From $9.90/mo | 19 |
| 12 | Creator: 150 Credits/mo | 23 |
| 13 | Clean MP4 on Paid Plans | 23 |
| 14 | Cancel Anytime | 14 |
| 15 | No Camera, No Editing | 21 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Type one idea. Kineo writes the script, renders every scene and edits the film for you. | 87 |
| 2 | Narration, captions and music arrive in the same file, already timed to the scenes. | 83 |
| 3 | Plans from $9.90/mo. Paid plans export clean MP4s with no watermark. Cancel anytime. | 84 |
| 4 | One vertical MP4, ready to post. No editing and no stitching raw clips together. | 80 |

### G2 — Seedance

**URL de pouso (o que a pessoa abre):** `https://www.usekineo.com/ai-video-generator/seedance?utm_source=google&utm_medium=cpc&utm_campaign=gs_seedance&utm_term={keyword}`

Campo **URL final** do anúncio: `https://www.usekineo.com/ai-video-generator/seedance?utm_source=google&utm_medium=cpc&utm_campaign=gs_seedance` · campo **Sufixo do URL final** (grupo): `utm_term={keyword}`

**Palavras-chave — exata (12):** `[seedance]` · `[seedance ai]` · `[seedance app]` · `[seedance online]` · `[seedance 1.5]` · `[seedance 1.5 pro]` · `[seedance pro]` · `[seedance video generator]` · `[seedance ai video generator]` · `[bytedance seedance]` · `[use seedance]` · `[seedance price]`

**Palavras-chave — frase (8):** `"seedance app"` · `"seedance online"` · `"seedance video generator"` · `"seedance ai video"` · `"seedance 1.5 pro"` · `"seedance text to video"` · `"where to use seedance"` · `"bytedance video generator"`

**Negativas só deste grupo (ampla):** `2.0`

**Anúncio A — com o nome do motor (clique melhor; pode ser reprovado por marca)** · caminho exibido: usekineo.com/Seedance/Films

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Seedance 1.5 Online | 19 |
| 2 | Seedance AI Video Generator | 27 |
| 3 | Use Seedance 1.5 in Kineo | 25 |
| 4 | Seedance Films, Fully Edited | 28 |
| 5 | 60-Second Film: 35 Credits | 26 |
| 6 | Finished Films, Not Clips | 25 |
| 7 | Narration, Captions and Music | 29 |
| 8 | Type an Idea, Get a Film | 24 |
| 9 | Plans From $9.90/mo | 19 |
| 10 | Vertical 9:16, Ready to Post | 28 |
| 11 | Creator: 150 Credits/mo | 23 |
| 12 | Clean MP4 on Paid Plans | 23 |
| 13 | Cancel Anytime | 14 |
| 14 | Script, Scenes and Edit Done | 28 |
| 15 | Every Scene Generated | 21 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Type one idea. Kineo writes the script, generates Seedance 1.5 scenes and edits it. | 83 |
| 2 | A finished 60-second Seedance 1.5 film costs 35 credits, with narration and captions. | 85 |
| 3 | Plans from $9.90/mo. Paid plans export clean MP4s with no watermark. Cancel anytime. | 84 |
| 4 | One vertical MP4, ready to post. No editing and no stitching raw clips together. | 80 |

**Anúncio B — sem marca de terceiro (segue rodando se o A for reprovado por marca)** · caminho exibido: usekineo.com/AI-Video/Films

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Cinematic AI Films Online | 25 |
| 2 | Every Scene Generated | 21 |
| 3 | Premium AI Video Models | 23 |
| 4 | AI Video With Voiceover | 23 |
| 5 | One Idea, One Finished Film | 27 |
| 6 | Finished Films, Not Clips | 25 |
| 7 | Narration, Captions and Music | 29 |
| 8 | Type an Idea, Get a Film | 24 |
| 9 | Script, Scenes and Edit Done | 28 |
| 10 | Vertical 9:16, Ready to Post | 28 |
| 11 | Plans From $9.90/mo | 19 |
| 12 | Creator: 150 Credits/mo | 23 |
| 13 | Clean MP4 on Paid Plans | 23 |
| 14 | Cancel Anytime | 14 |
| 15 | No Camera, No Editing | 21 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Type one idea. Kineo writes the script, renders every scene and edits the film for you. | 87 |
| 2 | Narration, captions and music arrive in the same file, already timed to the scenes. | 83 |
| 3 | Plans from $9.90/mo. Paid plans export clean MP4s with no watermark. Cancel anytime. | 84 |
| 4 | One vertical MP4, ready to post. No editing and no stitching raw clips together. | 80 |

### G3 — Veo 3 alternative / AI video generator premium

**URL de pouso (o que a pessoa abre):** `https://www.usekineo.com/ai-video-generator/veo?utm_source=google&utm_medium=cpc&utm_campaign=gs_veo&utm_term={keyword}`

Campo **URL final** do anúncio: `https://www.usekineo.com/ai-video-generator/veo?utm_source=google&utm_medium=cpc&utm_campaign=gs_veo` · campo **Sufixo do URL final** (grupo): `utm_term={keyword}`

**Palavras-chave — exata (12):** `[veo 3.1]` · `[veo 3.1 app]` · `[veo 3.1 online]` · `[veo 3.1 fast]` · `[veo 3 app]` · `[veo 3 online]` · `[use veo 3]` · `[veo 3 alternative]` · `[veo 3.1 video generator]` · `[veo 3 video generator]` · `[premium ai video generator]` · `[best ai video generator with voice]`

**Palavras-chave — frase (8):** `"veo 3 alternative"` · `"veo 3.1 app"` · `"veo 3.1 online"` · `"veo 3 video generator"` · `"ai video generator with voiceover"` · `"premium ai video generator"` · `"cinematic ai video generator"` · `"veo without google plan"`

**Negativas só deste grupo (ampla):** `flow`

**Anúncio A — com o nome do motor (clique melhor; pode ser reprovado por marca)** · caminho exibido: usekineo.com/Veo-3-1/Films

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Veo 3.1 Fast Online | 19 |
| 2 | Veo 3.1 Without a Google Plan | 29 |
| 3 | Veo 3.1 AI Video Generator | 26 |
| 4 | Veo 3.1 Fast, Fully Edited | 26 |
| 5 | 60-Second Film: 100 Credits | 27 |
| 6 | Finished Films, Not Clips | 25 |
| 7 | Narration, Captions and Music | 29 |
| 8 | Type an Idea, Get a Film | 24 |
| 9 | Plans From $9.90/mo | 19 |
| 10 | Vertical 9:16, Ready to Post | 28 |
| 11 | Creator: 150 Credits/mo | 23 |
| 12 | Clean MP4 on Paid Plans | 23 |
| 13 | Cancel Anytime | 14 |
| 14 | Script, Scenes and Edit Done | 28 |
| 15 | Premium AI Video Models | 23 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Kineo runs Veo 3.1 Fast and turns one idea into a narrated, captioned vertical film. | 84 |
| 2 | A finished 60-second Veo 3.1 film costs 100 credits. No Google plan needed. | 75 |
| 3 | Plans from $9.90/mo. Paid plans export clean MP4s with no watermark. Cancel anytime. | 84 |
| 4 | One vertical MP4, ready to post. No editing and no stitching raw clips together. | 80 |

**Anúncio B — sem marca de terceiro (segue rodando se o A for reprovado por marca)** · caminho exibido: usekineo.com/AI-Video/Premium

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Premium AI Video Generator | 26 |
| 2 | Cinematic AI Films Online | 25 |
| 3 | AI Video With Voiceover | 23 |
| 4 | One Idea, One Finished Film | 27 |
| 5 | Every Scene Generated | 21 |
| 6 | Finished Films, Not Clips | 25 |
| 7 | Narration, Captions and Music | 29 |
| 8 | Type an Idea, Get a Film | 24 |
| 9 | Script, Scenes and Edit Done | 28 |
| 10 | Vertical 9:16, Ready to Post | 28 |
| 11 | Plans From $9.90/mo | 19 |
| 12 | Creator: 150 Credits/mo | 23 |
| 13 | Clean MP4 on Paid Plans | 23 |
| 14 | Cancel Anytime | 14 |
| 15 | No Camera, No Editing | 21 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Type one idea. Kineo writes the script, renders every scene and edits the film for you. | 87 |
| 2 | Narration, captions and music arrive in the same file, already timed to the scenes. | 83 |
| 3 | Plans from $9.90/mo. Paid plans export clean MP4s with no watermark. Cancel anytime. | 84 |
| 4 | One vertical MP4, ready to post. No editing and no stitching raw clips together. | 80 |

### Negativas da campanha (valem para os 3 grupos)

**Ampla (64):** `free` · `gratis` · `download` · `apk` · `mod` · `crack` · `cracked` · `torrent` · `pirate` · `github` · `huggingface` · `comfyui` · `api` · `jobs` · `job` · `careers` · `career` · `hiring` · `salary` · `internship` · `course` · `courses` · `tutorial` · `tutorials` · `class` · `udemy` · `wiki` · `wikipedia` · `news` · `leak` · `leaked` · `arxiv` · `paper` · `benchmark` · `reddit` · `discord` · `login` · `nsfw` · `nude` · `nudes` · `porn` · `sex` · `xxx` · `uncensored` · `hentai` · `stock` · `shares` · `ipo` · `earnings` · `dreamina` · `capcut` · `jimeng` · `doubao` · `volcengine` · `byteplus` · `klingai` · `kuaishou` · `vertex` · `gemini` · `replicate` · `wavespeed` · `runway` · `pika` · `sora`

**Frase (19):** `"hugging face"` · `"open source"` · `"model weights"` · `"api key"` · `"what is"` · `"release date"` · `"technical report"` · `"log in"` · `"sign in"` · `"customer service"` · `"cancel subscription"` · `"google flow"` · `"ai studio"` · `"fal ai"` · `"share price"` · `"how to use"` · `"no sign up"` · `"without login"` · `"unlimited free"`

<!-- KINEO-GOOGLE-ADS-TESTE-0111:GERADO-FIM -->

## 6. Como medir

Consulta: **`docs/queries/GOOGLE-ADS-TESTE-LEITURA-2026-11-01.sql`** (só SELECT, Supabase `cqqukkvjjrguayiyjvhh`). Três blocos:
1. **Leitura** (o principal): uma linha por grupo + TOTAL com `visitas`, `cadastros`, `checkout_aberto`, `checkout_convidado`, `pagantes`, `receita_usd`. Troque só `inicio`/`fim` em `params`.
2. **Conferência do URL** (dia 1): cada grupo tem de aparecer com `utm_campaign` certo e `utm_term` preenchido. `utm_term = {keyword}` literal = o sufixo foi colado no campo errado. Linha com gclid e sem `utm_campaign` = URL final sem os parâmetros.
3. **Cadastros dos últimos 3 dias por grupo** (régua do dia 3).

Custo por cadastro e por pagante = coluna **Custo** do grupo no Google Ads ÷ números da consulta (o gasto não mora no nosso banco).

## 7. Régua de parada e calendário

| Quando | Gasto aprox. | O que olhar | Decisão |
|---|---|---|---|
| Dia 1 | US$ 10 | Conferência do URL; Google Ads → **Termos de pesquisa** | Negativar todo termo que não for intenção de usar o motor |
| Dia 3 | US$ 30 | Bloco 3 da consulta | **0 cadastros no total → parar a campanha.** Grupo com 0 cadastros e ≥ 25 cliques → pausar só o grupo |
| Dia 7 | US$ 70 | Bloco 1 com início/fim reais | **0 pagantes → parar** (custo por pagante > US$ 70). ≥ 1 pagante → o grupo vencedor ganha campanha própria |
| Dia 9 | — | Bloco 1 com fim + 2 dias | Compra que chegou depois entra na conta antes da decisão final |

## 8. Passo a passo no Google Ads (site, ~35 min) — até ANTES do pagamento

> Faça na conta que tem a tag `AW-18156258081`. Pare no passo 13 se o Google pedir forma de pagamento: esse passo é seu.

1. Entre em **ads.google.com** com o seu login → confira no canto superior a conta certa.
2. **Administrador → Configurações da conta → Codificação automática**: deve estar **ligada**.
3. **Metas → Conversões → Resumo**: Compra (`NL4bCKXEwa4cEKGGytFD`) e Cadastro (`SXGYCK_VlrEcEKGGytFD`) aparecem ativas; Compra como **principal**.
4. **+ Criar → Campanha** → **Criar uma campanha sem orientação** → tipo **Pesquisa** → Continuar.
5. Nome: `Kineo - Search - Motores - Teste 0111`.
6. **Lances**: foco em **Cliques** → marque **Definir um limite máximo de lance de CPC** → `0.80`.
7. **Redes**: desmarque **Parceiros de pesquisa do Google** e **Rede de Display do Google**.
8. **Locais**: "Inserir outro local" → Estados Unidos, Reino Unido, Canadá, Austrália. **Opções de local → Presença**. **Idiomas**: inglês.
9. **Mais configurações**: datas de início e **término** (7 dias). Desligue **AI Max**/**recursos criados automaticamente** se aparecerem. Não preencha sufixo no nível da campanha (vai no grupo).
10. **Grupo de anúncios 1** — nome `G1 - Kling 4.0`:
    - Cole as palavras-chave do G1 (seção 5) **com** os colchetes e aspas.
    - Em **Opções de URL do grupo → Sufixo do URL final**: `utm_term={keyword}`.
    - **Anúncio responsivo A**: URL final do G1, caminho exibido, os 15 títulos e as 4 descrições do anúncio A.
    - Repita com **Novo grupo de anúncios** para `G2 - Seedance` e `G3 - Veo`.
11. **Orçamento**: `10.00` por dia.
12. **Revisar**: confira Pesquisa só, 4 países em Presença, inglês, CPC 0,80, US$ 10/dia, término marcado.
13. ⛔ **PARE AQUI.** Se aparecer **Faturamento / forma de pagamento** ou o botão **Publicar campanha**, esse clique é do fundador.
14. Depois de publicada (fundador): em cada grupo **+ Anúncio responsivo** com o **anúncio B**; **Palavras-chave → Palavras-chave negativas** no nível da **campanha** com as duas listas da seção 5; e as negativas "só deste grupo" no nível de cada grupo. **Recomendações → Aplicação automática** → desmarcar tudo.

## 9. Riscos e limites

- **Kling 4.0 sem histórico** (0 visitas registradas na página): é o grupo mais incerto do teste.
- **Página do Kling 4.0 fala em filme grátis** "em países suportados". O anúncio não promete grátis; se o visitante não estiver num país do grant, a página diz o preço em créditos.
- **Reino Unido sem banner de consentimento:** o Google pode subcontar conversões no painel dele. A decisão é pelo nosso banco.
- **Primeiro toque de outro canal:** quem já veio do ChatGPT com utm e depois clica no anúncio fica como `chatgpt` no perfil (regra de primeiro toque). A consulta pega essa pessoa pela sessão do pouso e pelo `paid_utm_campaign` do checkout.
- **Orçamento compartilhado:** o Google pode jogar quase tudo num grupo. Grupo com < 10% dos cliques em 48 h já é resposta.
- **Celular → computador sem login:** não há como ligar as duas pontas.

## 10. Próxima jogada

1. **Termo que cadastra vira pergunta citável:** cada termo de busca que trouxer cadastro entra como pergunta no FAQ da página do motor — o mesmo texto que o ChatGPT lê. O anúncio vira pesquisa de linguagem do cliente para o canal que já paga.
2. **Conversão offline com gclid:** agora o perfil e o `payment_success` guardam o gclid mesmo em aba nova. Com 15+ compras, subir no Google Ads (Conversões → Uploads) e trocar para Maximizar conversões.
3. **Seedance 2.0:** a busca "seedance 2.0" é negativa no G2 porque não rodamos o 2.0. Se o Kineo ligar o 2.0, ele vira o 4º grupo no mesmo dia.
