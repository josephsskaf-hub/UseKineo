# Teste de anúncio no Google Search por nome de motor (07/10/2026)

> **Estado:** pronto para o fundador. Nada foi publicado, nenhum centavo gasto, nada enfileirado.
> Código do rastreio na branch `codex/anuncio-motor-0710` (sobre `origin/main` 5ca07684): `0eba5e2f` (rastreio) +
> `9ec657e2` (guardião reancorado) + o commit deste doc. Pedido do fundador: "vai pra tudo".

## 0. Resumo

| | |
|---|---|
| **O quê** | 1 campanha Search, 4 grupos: **Seedance 2.5 · Kling 3 · Veo 3.1 · "Seedance + Kling + Veo in one app"** |
| **Quanto** | **US$ 18/dia por 7 dias** (teto de cobrança ≈ US$ 126). Maximizar cliques com **teto de CPC de US$ 1,00** |
| **Onde** | EUA, Reino Unido, Canadá e Austrália (opção "presença"), idioma inglês, só a rede de Pesquisa do Google |
| **Por quê** | 8 de 11 pagantes em 60 dias vieram das páginas de motor que o ChatGPT cita: gente de país rico procurando **onde usar um modelo específico**. A busca no Google por "seedance 2.5 app" é a mesma intenção, e dá para comprar. As vendas estão em ~2 por semana há 7 semanas |
| **Meta** | **≥ 1 pagante a cada US$ 100.** Com zero pagantes no fim dos 7 dias, a campanha para |
| **Medida** | Consulta SQL pronta (`docs/queries/ANUNCIO-MOTOR-LEITURA-2026-10-07.sql`): visitas → cadastros → checkout (convidado incluído) → pagantes, por grupo. Testada hoje: deu zero, e os controles positivos contam |
| **Arquivos para o Google Ads Editor** | `docs/anuncio-google-motores-2026-10-07/1-campanha.csv` … `7-sitelinks.csv` (a campanha entra **pausada**) |

---

## 1. Rastreio: o que existia, o que faltava e o que foi consertado

Conferido em `origin/main` 5ca07684 e no banco de produção, só com SELECT.

| Peça | Como estava em 5ca07684 | Agora (branch) |
|---|---|---|
| Tag do Google Ads `AW-18156258081` | ✅ No layout raiz, em todas as páginas (`gtag('config')`). O gtag.js guarda o clique sozinho no cookie dele, inclusive o gbraid do iOS | igual |
| Conversão de **cadastro** `AW-18156258081/SXGYCK_VlrEcEKGGytFD` | ✅ Valor atribuído de US$ 1 (não é receita). Dispara no /signup por e-mail e no pouso com `?signup=1` depois do Google/OAuth. Dedupe pelo id da conta. A conta que nasce de uma compra sem login não dispara esse evento, e isso está certo: ela já conta como compra | igual |
| Conversão de **compra** `AW-18156258081/NL4bCKXEwa4cEKGGytFD` | ✅ Valor e moeda reais da Stripe, `transaction_id` = sessão da Stripe. Só dispara depois que `/api/stripe/checkout/verify` confirma dono e pagamento. **Compra sem login:** a pessoa volta por `/checkout/guest`, entra com o login de uso único e cai no mesmo `/checkout/success`, onde o pixel dispara (o webhook grava o dono na sessão da Stripe) | igual |
| gclid | ⚠️ Fica no sessionStorage da **aba** e vai em todo evento do navegador. Só chega a `profiles.gclid` se o cadastro acontecer na mesma aba do pouso | o cookie de clique pago guarda o gclid por 90 dias |
| gbraid / wbraid (cliques do iOS) | ❌ Nenhum código nosso guardava | ✅ guardados no cookie de clique pago |
| utm_campaign no pouso | ✅ `landing_session_started` carrega (1.252 pousos com utm_campaign em 30 dias) | igual |
| **payment_success com a origem paga** | ❌ **Não carregava.** Tinha só o `intent_campaign` da página e o `session_id` da aba (recuperado do `checkout_started`). Funcionava no caminho comum: os 14 pagamentos reais de 60 dias têm pouso na mesma sessão. **Falhava** em quem clica, sai e volta outro dia por outra porta, e na compra sem login, em que a conta nasce no webhook sem origem nenhuma | ✅ **Carrega** `paid_utm_source/medium/campaign/term` + `paid_click_id_type` (gclid/gbraid/wbraid) + `paid_click_id` + `paid_click_at`, para o comprador logado e para o convidado |
| Guardião `test-google-ads-signup-conversion-truth` | ❌ **Vermelho na main**: a âncora da compra tinha mudado de arquivo | ✅ Reancorado no dono atual, com checagens mais estritas: 19/19 |

**O conserto, em três pontas, sem tocar em preço, crédito nem na sessão da Stripe:**
1. `lib/growth/paidClickAttribution.ts` (módulo puro): guarda o **último clique pago** (UTM + gclid, gbraid ou wbraid + hora) num cookie de 90 dias. Os campos têm formato fechado, há folga para relógio adiantado, e visita orgânica **nunca apaga** um clique pago.
2. `components/SourceCapture.tsx` grava esse cookie em todo pouso que chega com sinal pago (gclid, gbraid, wbraid ou `utm_medium=cpc`).
3. `app/api/stripe/checkout/route.ts` copia o clique para **todo** evento de checkout (é um único escritor, para logado e convidado). Em seguida, `app/api/stripe/webhook/route.ts` lê o `checkout_started` em toda compra e copia o clique para o `payment_success`.

**Provas:**
- `scripts/test-anuncio-motor-rastreio-2026-10-07.mjs`: **98/98**. Roda o módulo de verdade e confere as âncoras nos arquivos reais.
- Cenário novo "clique pago do anúncio" em `scripts/test-compra-sem-login-2026-10-06.mjs`: roda a **rota e o webhook reais** com o cookie, para convidado e logado, e confere que sem cookie, ou com cookie adulterado, nenhuma chave nova aparece. **294 ok**, com 2 mutantes em memória que falham como devem.
- `scripts/test-anuncio-motor-copia-2026-10-07.mjs`: **217/217**. Confere cada número dos anúncios contra o código (seção 3).
- **31 mutantes** nos arquivos reais (18 do rastreio, 4 do guardião do Google Ads, 9 da cópia), cada um com prova de que foi aplicado e restauração byte a byte: todos ficaram vermelhos.
- `tsc` limpo, com controle positivo (a sonda com erro de tipo reprova).
- Suíte inteira: 789 guardiões na worktree pristina em 5ca07684, com **142 vermelhos herdados**. No ramo são 791 (os 2 novos entram) e **141 vermelhos**: nenhum vermelho novo, e o guardião do Google Ads voltou a passar.

**Sem publicar o código, o teste ainda é legível pelo caminho comum (mesma aba).** O cookie fecha o caso de quem volta depois e da compra sem login. **Publique antes de ligar a campanha.**

---

## 2. A campanha

| Configuração | Valor |
|---|---|
| Nome | `Kineo - Search - Motores - Teste 0710` |
| Tipo | Pesquisa (Search), **sem** Parceiros de pesquisa e **sem** Rede de Display |
| Orçamento | **US$ 18,00/dia**, 7 dias. Com data de término, o Google não cobra mais que 18 × dias ativos (≈ US$ 126) |
| Lance | **Maximizar cliques** com **limite máximo de CPC de US$ 1,00** |
| Locais | Estados Unidos (2840), Reino Unido (2826), Canadá (2124), Austrália (2036). **Opção de local: "Presença"** (pessoas que estão ou costumam estar nesses países), nunca "presença ou interesse" |
| Idioma | Inglês |
| Correspondência | Só **exata** e de **frase**. Correspondência ampla, **AI Max**, recursos criados automaticamente e recomendações aplicadas automaticamente: **todos desligados** |
| Sufixo do URL final (campanha) | `utm_term={keyword}&utm_content={creative}`, para a palavra-chave e o anúncio chegarem ao nosso banco |
| Rotação | Otimizar (padrão) |
| Metas de conversão | As da conta: Compra (principal) e Cadastro. Com Maximizar cliques elas não mudam o lance; servem para o relatório |
| Moeda | **Conferir a moeda da conta.** Os CSVs estão em dólar. Se a conta for em real, troque 18,00 e 1,00 pelo valor em reais da cotação do dia antes de importar |

**Por que o teto de US$ 1,00.** Medi os últimos 60 dias de pousos nas páginas de motor, todas as origens:

| Página | Sessões | Contas | Pagantes | Visita → pagante |
|---|---|---|---|---|
| /ai-video-generator/seedance (1.5) | 240 | 66 | 3 | 1,25% |
| /ai-video-generator/veo | 48 | 5 | 1 | 2,1% |
| /ai-video-generator/kling-3 | 6 | 1 | 0 | n/d |
| todas as páginas de motor | 635 | 198 | 4 | 0,63% |

- Custo por pagante = CPC ÷ taxa visita→pagante. Para ficar em **US$ 100 ou menos**, o CPC precisa ficar entre **US$ 0,63** (taxa geral) e **US$ 1,36** (páginas premium). US$ 1,00 fica no meio.
- Com US$ 18/dia e esse teto: **18 cliques/dia ou mais, cerca de 126 em 7 dias**. Se a busca converter como as páginas premium convertem com o ChatGPT (1% a 2%), dá **1 a 2 pagantes**, ou seja, a meta.
- **Alerta honesto:** o Reddit pago de setembro (`reddit_sep09`) trouxe **1.016 visitas → 2 cadastros → 1 checkout → 0 pagantes**. Tráfego pago genérico não pagou. A aposta aqui é diferente: quem digita o nome do modelo já quer usá-lo.
- **Ajuste permitido:** se em 48 h a campanha não conseguir gastar US$ 10/dia porque o teto perde os leilões, suba para **US$ 1,50**. Acima de US$ 2,00, só com uma conta nova; a US$ 2 o clique só cabe na meta com 2% de conversão.

---

## 3. Grupos, palavras-chave, anúncios, negativas e sitelinks

Todo número dos anúncios sai do código, igual ao que a página de destino mostra:

| Número | Fonte no código |
|---|---|
| US$ 12,90 / 29,90 / 54,90 | `TIER_PRICES` |
| 60 e 150 créditos | `TIER_CREDITS` |
| Clipe do Seedance 2.5: 5 s por 8 créditos. Filmes do 2.5: 88 créditos (35 s) e 150 (60 s) | `ENGINE_GEO['seedance-2-5']` / `CLIP_S25_CREDITS` |
| Kling 3: clipe de 5 s por 6 créditos, filme de 60 s por 150 | `ENGINE_GEO['kling-3']` |
| Veo 3.1 Fast: clipe de 6 s por 6 créditos, filme de 60 s por 100 | `ENGINE_GEO['veo']` |
| 6 modelos, 35 a 150 créditos por filme de 60 s | `hubEngines()` |
| "Film Ready in Minutes" | tempo MEDIDO no Kineo AI Video Index (`data/ai-video-index/<edição>.json`): mediana e p90 do 2.5, do Kling 3 e do Veo 3.1 abaixo de 60 min. Até 08/10 era "Usually Ready in 8-25 Minutes", a faixa digitada que a página trocou pelo tempo medido (rodada 3 de GEO) |

O guardião `test-anuncio-motor-copia-2026-10-07` fica vermelho se qualquer desses números mudar no código, antes que o anúncio passe a mentir. Os CSVs são gerados por `scripts/gerar-anuncio-google-motores-2026-10-07.cjs`, que também valida os limites de caracteres.

Cada grupo tem **dois anúncios responsivos**, com 15 títulos de até 30 caracteres e 4 descrições de até 90:
- **A**, com o nome do motor: é o que dá mais clique.
- **B**, seguro: sem nenhuma marca de terceiro. A marca aparece só na palavra-chave.

Se o A for reprovado por marca, o B segue rodando sozinho e o grupo não para (seção 4).

### G1 — Seedance 2.5

**URL final:** `https://www.usekineo.com/ai-video-generator/seedance-2-5?utm_source=google&utm_medium=cpc&utm_campaign=motor-seedance-2-5`

**Palavras-chave — exata:** `[seedance 2.5 app]` · `[seedance 2.5 online]` · `[use seedance 2.5]` · `[seedance 2.5 video generator]` · `[seedance 2.5 ai video generator]` · `[seedance 2.5 price]` · `[seedance 2.5 pricing]` · `[seedance 2.5 access]` · `[try seedance 2.5]` · `[seedance 2.5 text to video]`

**Palavras-chave — frase:** `"seedance 2.5 app"` · `"seedance 2.5 online"` · `"use seedance 2.5"` · `"seedance 2.5 video generator"` · `"seedance 2.5 price"` · `"seedance 2.5 subscription"` · `"where to use seedance 2.5"` · `"seedance 2.5 image to video"`

**Anúncio A — com o nome do motor (clique melhor; pode ser reprovado por marca)** · caminho exibido: usekineo.com/Seedance-2-5/Online

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Seedance 2.5 Online | 19 |
| 2 | Use Seedance 2.5 Today | 22 |
| 3 | Seedance 2.5 Video Generator | 28 |
| 4 | Seedance 2.5 Clips: 8 Credits | 29 |
| 5 | Finished Films, Not Just Clips | 30 |
| 6 | Narration, Captions and Music | 29 |
| 7 | One Sentence to a Full Video | 28 |
| 8 | Plans From $12.90 a Month | 25 |
| 9 | 60-Second Film: 150 Credits | 27 |
| 10 | 35-Second Film: 88 Credits | 26 |
| 11 | Commercial Use on Every Plan | 28 |
| 12 | Clean MP4 on Paid Plans | 23 |
| 13 | Vertical 9:16, Ready to Post | 28 |
| 14 | Film Ready in Minutes | 21 |
| 15 | 6 AI Video Models, 1 Account | 28 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Type one sentence. Kineo directs Seedance 2.5 scenes, voiceover, captions and music. | 84 |
| 2 | A 5-second Seedance 2.5 clip costs 8 credits. A finished 60-second film costs 150. | 82 |
| 3 | Seedance 2.5 runs on paid plans. Creator: $29.90/month for 150 credits. | 71 |
| 4 | No editing: script, scenes, narration and captions arrive as one vertical MP4. | 78 |

**Anúncio B — seguro, sem marca de terceiro (a marca fica só na palavra-chave)** · caminho exibido: usekineo.com/AI-Video/Films

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Cinematic AI Video Online | 25 |
| 2 | Storms, Crowds and Explosions | 29 |
| 3 | Script, Scenes and Edit Done | 28 |
| 4 | Type an Idea, Get a Film | 24 |
| 5 | Cancel Anytime | 14 |
| 6 | Finished Films, Not Just Clips | 30 |
| 7 | One Sentence to a Full Video | 28 |
| 8 | Narration, Captions and Music | 29 |
| 9 | Plans From $12.90 a Month | 25 |
| 10 | Creator Plan: $29.90 a Month | 28 |
| 11 | Commercial Use on Every Plan | 28 |
| 12 | Clean MP4 on Paid Plans | 23 |
| 13 | Vertical 9:16, Ready to Post | 28 |
| 14 | Film Ready in Minutes | 21 |
| 15 | 6 AI Video Models, 1 Account | 28 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Type one sentence. Kineo writes the script, generates every scene and adds narration. | 85 |
| 2 | Captions, music and the edit included. One vertical MP4, ready to post. | 71 |
| 3 | Plans from $12.90/month. Creator: $29.90/month for 150 credits. | 63 |
| 4 | Commercial use on every plan. Paid plans export clean MP4s with no watermark. | 77 |


### G2 — Kling 3

**URL final:** `https://www.usekineo.com/ai-video-generator/kling-3?utm_source=google&utm_medium=cpc&utm_campaign=motor-kling-3`

**Palavras-chave — exata:** `[kling 3 app]` · `[kling 3.0 app]` · `[use kling 3]` · `[kling 3 video generator]` · `[kling 3.0 video generator]` · `[kling 3 online]` · `[kling 3 price]` · `[kling 3 pricing]` · `[kling 3 lip sync]` · `[try kling 3]`

**Palavras-chave — frase:** `"kling 3 app"` · `"kling 3.0 online"` · `"use kling 3"` · `"kling 3 video generator"` · `"kling 3 price"` · `"kling 3 lip sync"` · `"kling 3 ai video"` · `"where to use kling 3"`

**Anúncio A — com o nome do motor (clique melhor; pode ser reprovado por marca)** · caminho exibido: usekineo.com/Kling-3/Online

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Kling 3 Online | 14 |
| 2 | Use Kling 3 Today | 17 |
| 3 | Kling 3 Video Generator | 23 |
| 4 | Kling 3 With Lip Sync | 21 |
| 5 | Kling 3 Clips: 6 Credits | 24 |
| 6 | Characters Speak On Camera | 26 |
| 7 | Native Voice and Lip Sync | 25 |
| 8 | Finished Films, Not Just Clips | 30 |
| 9 | 60-Second Film: 150 Credits | 27 |
| 10 | Plans From $12.90 a Month | 25 |
| 11 | Narration, Captions and Music | 29 |
| 12 | No Camera, No Studio, No Actor | 30 |
| 13 | Commercial Use on Every Plan | 28 |
| 14 | Film Ready in Minutes | 21 |
| 15 | 6 AI Video Models, 1 Account | 28 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Kling 3 inside Kineo: talking characters with native voice and lip sync, fully edited. | 86 |
| 2 | A 5-second Kling 3 clip costs 6 credits. A finished 60-second film costs 150 credits. | 85 |
| 3 | Type one sentence. Kineo writes the script, routes scenes to Kling 3 and edits the film. | 88 |
| 4 | Plans from $12.90/month. Creator ($29.90, 150 credits) covers a 60-second Kling 3 film. | 87 |

**Anúncio B — seguro, sem marca de terceiro (a marca fica só na palavra-chave)** · caminho exibido: usekineo.com/AI-Video/Lip-Sync

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Talking Characters, No Camera | 29 |
| 2 | Characters Speak On Camera | 26 |
| 3 | Lip Sync AI Video Online | 24 |
| 4 | No Filming, No Editing | 22 |
| 5 | Type an Idea, Get a Film | 24 |
| 6 | Finished Films, Not Just Clips | 30 |
| 7 | One Sentence to a Full Video | 28 |
| 8 | Narration, Captions and Music | 29 |
| 9 | Plans From $12.90 a Month | 25 |
| 10 | Creator Plan: $29.90 a Month | 28 |
| 11 | Commercial Use on Every Plan | 28 |
| 12 | Clean MP4 on Paid Plans | 23 |
| 13 | Vertical 9:16, Ready to Post | 28 |
| 14 | Film Ready in Minutes | 21 |
| 15 | 6 AI Video Models, 1 Account | 28 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Characters speak on camera with their own generated voice and lip sync, scene by scene. | 87 |
| 2 | Type one sentence. Kineo writes the script, renders each scene and edits the film. | 82 |
| 3 | Captions, music and the edit included. One vertical MP4, ready to post. | 71 |
| 4 | Plans from $12.90/month. Commercial use on every plan, clean MP4 on paid plans. | 79 |


### G3 — Veo 3.1

**URL final:** `https://www.usekineo.com/ai-video-generator/veo?utm_source=google&utm_medium=cpc&utm_campaign=motor-veo-3-1`

**Palavras-chave — exata:** `[veo 3.1 app]` · `[veo 3.1 online]` · `[use veo 3.1]` · `[veo 3.1 video generator]` · `[veo 3.1 ai video generator]` · `[veo 3.1 price]` · `[veo 3.1 pricing]` · `[veo 3.1 access]` · `[try veo 3.1]` · `[veo 3.1 fast]`

**Palavras-chave — frase:** `"veo 3.1 app"` · `"veo 3.1 online"` · `"use veo 3.1"` · `"veo 3.1 video generator"` · `"veo 3.1 price"` · `"where to use veo 3.1"` · `"veo 3.1 text to video"` · `"veo 3.1 fast video"`

**Anúncio A — com o nome do motor (clique melhor; pode ser reprovado por marca)** · caminho exibido: usekineo.com/Veo-3-1/Online

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Veo 3.1 Online | 14 |
| 2 | Use Veo 3.1 Fast Today | 22 |
| 3 | Veo 3.1 Video Generator | 23 |
| 4 | Veo 3.1 Fast, Fully Edited | 26 |
| 5 | Veo 3.1 Clips: 6 Credits | 24 |
| 6 | 60-Second Film: 100 Credits | 27 |
| 7 | Finished Films, Not Just Clips | 30 |
| 8 | Narration, Captions and Music | 29 |
| 9 | One Sentence to a Full Video | 28 |
| 10 | Plans From $12.90 a Month | 25 |
| 11 | Creator Plan: $29.90 a Month | 28 |
| 12 | Commercial Use on Every Plan | 28 |
| 13 | Film Ready in Minutes | 21 |
| 14 | Vertical 9:16, Ready to Post | 28 |
| 15 | 6 AI Video Models, 1 Account | 28 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Kineo runs Veo 3.1 Fast and turns one sentence into a narrated, captioned vertical film. | 88 |
| 2 | A 6-second Veo 3.1 clip costs 6 credits. A finished 60-second film costs 100 credits. | 85 |
| 3 | No raw clips to stitch: script, scenes, voiceover, captions and music in one MP4. | 81 |
| 4 | Plans from $12.90/month. Creator ($29.90, 150 credits) covers a 60-second Veo 3.1 film. | 87 |

**Anúncio B — seguro, sem marca de terceiro (a marca fica só na palavra-chave)** · caminho exibido: usekineo.com/AI-Video/Films

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Coherent Scenes From a Prompt | 29 |
| 2 | No Raw Clips to Stitch | 22 |
| 3 | Script, Scenes and Edit Done | 28 |
| 4 | Hero Video of the Week | 22 |
| 5 | Type an Idea, Get a Film | 24 |
| 6 | Finished Films, Not Just Clips | 30 |
| 7 | One Sentence to a Full Video | 28 |
| 8 | Narration, Captions and Music | 29 |
| 9 | Plans From $12.90 a Month | 25 |
| 10 | Creator Plan: $29.90 a Month | 28 |
| 11 | Commercial Use on Every Plan | 28 |
| 12 | Clean MP4 on Paid Plans | 23 |
| 13 | Vertical 9:16, Ready to Post | 28 |
| 14 | Film Ready in Minutes | 21 |
| 15 | 6 AI Video Models, 1 Account | 28 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Type one sentence. Kineo writes the script, generates every scene and edits the film. | 85 |
| 2 | No raw clips to stitch: voiceover, captions and music arrive in one vertical MP4. | 81 |
| 3 | Plans from $12.90/month. Commercial use on every plan, clean MP4 on paid plans. | 79 |
| 4 | Pick the model per video and pay per finished film, with one credit balance. | 76 |


### G4 — Seedance + Kling + Veo in one app

**URL final:** `https://www.usekineo.com/seedance-kling-veo-in-one-place?utm_source=google&utm_medium=cpc&utm_campaign=motor-3-em-1`

**Palavras-chave — exata:** `[kling vs veo]` · `[veo vs kling]` · `[kling 3 vs veo 3.1]` · `[veo 3.1 vs kling 3]` · `[seedance vs kling]` · `[kling vs seedance]` · `[seedance 2.5 vs kling 3]` · `[seedance vs veo]` · `[ai video generator with veo and kling]` · `[all ai video models in one place]`

**Palavras-chave — frase:** `"kling vs veo"` · `"seedance vs kling"` · `"veo vs seedance"` · `"kling and veo in one app"` · `"seedance kling veo"` · `"multi model ai video generator"` · `"ai video generator all models"` · `"higgsfield alternative"`

**Anúncio A — com o nome do motor (clique melhor; pode ser reprovado por marca)** · caminho exibido: usekineo.com/All-Models/One-App

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Seedance, Kling and Veo | 23 |
| 2 | Kling, Veo, Seedance in 1 App | 29 |
| 3 | Compare Kling, Veo, Seedance | 28 |
| 4 | One Account, 6 Video Models | 27 |
| 5 | One Credit Balance for All | 26 |
| 6 | Pick the Model Per Video | 24 |
| 7 | Price Per Finished Video | 24 |
| 8 | Finished Films, Not Just Clips | 30 |
| 9 | Narration, Captions and Music | 29 |
| 10 | Plans From $12.90 a Month | 25 |
| 11 | Commercial Use on Every Plan | 28 |
| 12 | Film Ready in Minutes | 21 |
| 13 | Vertical 9:16, Ready to Post | 28 |
| 14 | Seedance 2.5 Clips: 8 Credits | 29 |
| 15 | Kling 3 and Veo 3.1 Inside | 26 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Seedance 1.5, Seedance 2.5, Kling 2.5, Kling 3, Veo 3.1 and MiniMax H3 in one account. | 86 |
| 2 | One credit balance: a finished 60-second video costs 35 to 150 credits by model. | 80 |
| 3 | Type one sentence. Kineo writes, renders, narrates and edits the film for you. | 78 |
| 4 | Plans from $12.90/month for 60 credits. Commercial use on every plan. | 69 |

**Anúncio B — seguro, sem marca de terceiro (a marca fica só na palavra-chave)** · caminho exibido: usekineo.com/All-Models/One-App

| # | Título (≤ 30) | car. |
|---|---|---|
| 1 | Six Video Models in One App | 27 |
| 2 | One Credit Balance for All | 26 |
| 3 | Pick the Model Per Video | 24 |
| 4 | Price Per Finished Video | 24 |
| 5 | Price Table for Each Model | 26 |
| 6 | Finished Films, Not Just Clips | 30 |
| 7 | One Sentence to a Full Video | 28 |
| 8 | Narration, Captions and Music | 29 |
| 9 | Plans From $12.90 a Month | 25 |
| 10 | Creator Plan: $29.90 a Month | 28 |
| 11 | Commercial Use on Every Plan | 28 |
| 12 | Clean MP4 on Paid Plans | 23 |
| 13 | Vertical 9:16, Ready to Post | 28 |
| 14 | Film Ready in Minutes | 21 |
| 15 | 6 AI Video Models, 1 Account | 28 |

| # | Descrição (≤ 90) | car. |
|---|---|---|
| 1 | Six AI video models in one account and one credit balance. Pick the model per video. | 84 |
| 2 | A finished 60-second video costs 35 to 150 credits depending on the model you pick. | 83 |
| 3 | Type one sentence. Kineo writes, renders, narrates and edits the film for you. | 78 |
| 4 | Plans from $12.90/month for 60 credits. Commercial use on every plan. | 69 |


### Negativas (nível da campanha)

**Ampla (bloqueia toda busca que tenha a palavra):** `free` · `download` · `apk` · `mod` · `crack` · `cracked` · `torrent` · `pirate` · `github` · `huggingface` · `comfyui` · `api` · `jobs` · `job` · `careers` · `career` · `hiring` · `salary` · `internship` · `wiki` · `wikipedia` · `news` · `leak` · `leaked` · `arxiv` · `benchmark` · `reddit` · `discord` · `login` · `dreamina` · `capcut` · `jimeng` · `doubao` · `volcengine` · `byteplus` · `klingai` · `vertex` · `gemini` · `replicate` · `wavespeed` · `runway` · `nsfw` · `nude` · `porn` · `uncensored` · `hentai` · `stock` · `ipo` · `earnings`

**Frase:** `"hugging face"` · `"open source"` · `"model weights"` · `"api key"` · `"what is"` · `"release date"` · `"technical report"` · `"log in"` · `"sign in"` · `"customer service"` · `"cancel subscription"` · `"google flow"` · `"ai studio"` · `"fal ai"` · `"share price"`

### Sitelinks (os mesmos 4 em cada grupo, com o utm_campaign do grupo no destino)

| Texto (≤ 25) | Linha 1 (≤ 35) | Linha 2 (≤ 35) | Destino |
|---|---|---|---|
| Plans and Prices | Starter $12.90 a month | Cancel anytime | /pricing |
| All AI Video Models | Price per video for each model | One credit balance | /ai-video-generator |
| Real Examples | Finished vertical AI videos | Narration and captions included | /examples |
| Render Time and Cost | Render time per AI model | October 2026 index | /ai-video-index |

**Opcional (frases de destaque, no nível da campanha):** `Commercial Use Included` · `Clean MP4 on Paid Plans` · `Narration and Captions` · `Vertical 9:16 Video`.

---

## 4. Marca registrada: o risco e como os anúncios foram escritos

- **Na palavra-chave**, a marca é liberada: o Google não restringe marca em palavra-chave nem no caminho exibido.
- **No texto do anúncio**, "Seedance" (ByteDance), "Kling" (Kuaishou) e "Veo" (Google) rodam normalmente **até o dono da marca reclamar**. Desde 2023, a reclamação vale contra um anunciante específico. Se o Google acatar, o anúncio fica "Limitado" ou "Reprovado: marca registrada no texto do anúncio" nos países em que a marca tem registro.
  - Existe uma exceção para revendedor ou site informativo: página que vende ou facilita o uso do produto da marca. A nossa página vende um produto próprio, com vários modelos, então **não dá para contar com essa exceção**.
- **Veo é do Google**, o mesmo dono do leilão. Trate como o caso de maior risco de reprovação.
- **Como os anúncios foram escritos para isso:**
  - Anúncio B sem nenhuma marca, em todos os grupos.
  - Sitelinks sem marca.
  - Nada de "official", nada de inserção dinâmica de palavra-chave (`{KeyWord:…}`), nada que sugira parceria.
  - Os anúncios do Veo deixam claro que é o **"Veo 3.1 Fast"**, que é o que rodamos.
- **Se o A for reprovado:** não recorra. Deixe o B rodar e anote a data. Reprovar o A não para o teste.

---

## 5. Leitura do resultado

Consulta: **`docs/queries/ANUNCIO-MOTOR-LEITURA-2026-10-07.sql`** (só SELECT, Supabase `cqqukkvjjrguayiyjvhh`).

- **O que devolve:** uma linha por grupo e uma linha TOTAL, com `visitas` (sessões que pousaram vindas do anúncio), `cadastros`, `checkout_aberto` (convidado incluído), `checkout_convidado`, `pagantes` e `receita_usd`.
- **Contas da casa** ficam fora. O trial de cartão de US$ 1 não conta como pagante.
- **Quando uma pessoa entra num grupo** (basta um toque na janela):
  - um evento do navegador com o `utm_campaign` do grupo;
  - um evento de checkout ou de pagamento com o `paid_utm_campaign` do grupo (cookie de clique pago);
  - um perfil com `signup_utm_campaign` do grupo;
  - ou qualquer conta vista na mesma sessão de navegador desses toques.

  Quem tocou dois grupos conta nos dois; o TOTAL conta cada pessoa uma vez.
- **Testada hoje (07/10):** os 4 grupos e o TOTAL deram **zero**, como esperado.
- **Controles positivos** (provam que a consulta conta de verdade):
  - Trocando o padrão para `reddit%` em 08 a 22/09: `reddit_sep09` dá **1.016 visitas, 2 cadastros, 1 checkout e 0 pagantes**.
  - Trocando para `seo_engine_seedance%` em 90 dias: **2 pagantes e US$ 57,70**, o mesmo que já se sabia sobre essa campanha.
- **Custo por pagante** = coluna "Custo" do grupo no Google Ads ÷ `pagantes` da consulta. O gasto não fica no nosso banco.
- **Conferência do URL**, a segunda consulta do arquivo: rode no dia 1, depois de abrir cada URL final no navegador. Uma linha "com gclid e sem utm_campaign" significa anúncio com URL final errado.

**Calendário de decisão:**
- **Dia 1:** conferência do URL. No Google Ads, abra "Termos de pesquisa" e negative o que não for intenção de uso.
- **Dia 3 (~US$ 54):** se um grupo passou de 60 cliques com 0 cadastros, olhe os termos de pesquisa daquele grupo antes de mexer em qualquer outra coisa.
- **Dia 7 (~US$ 126):** rode a consulta com `inicio` = data em que a campanha foi publicada e `fim` = início + 7 dias.
  - **≥ 1 pagante a cada US$ 100:** continua, e o grupo vencedor ganha campanha e orçamento próprios.
  - **Zero pagantes:** para (regra do fundador).
  - Em qualquer caso, rode de novo **48 h depois** com `fim` + 2 dias, porque a compra costuma chegar em até 48 h.

---

## 6. Passo a passo para o fundador

### O que só você pode fazer
1. **Publicar o rastreio:** a branch `codex/anuncio-motor-0710` precisa ser enfileirada pela sessão CEO e depois vem o seu clique de publicar. Faça isso **antes** de ligar a campanha.
2. **Entrar no Google Ads** com o seu login. A conta é a que tem a tag `AW-18156258081`; o arquivo antigo `GOOGLE-ADS-COPY-271.txt` cita a conta **186-928-2523**. Confirme.
3. **Faturamento:** forma de pagamento ativa e moeda da conta (se for real, converta os US$ 18 e o US$ 1).
4. **Conversões:** em Metas → Conversões → Resumo, veja se "compra" (rótulo `NL4bCKXEwa4cEKGGytFD`) e "cadastro" (`SXGYCK_VlrEcEKGGytFD`) aparecem como **ativas, gravando conversões**, com a compra como ação **principal**. Em Administrador → Configurações da conta, a **codificação automática** (auto-tagging) tem de estar **ligada**.
5. **O clique final de publicar ou ativar a campanha.**

### Opção A: Google Ads Editor (recomendada, cerca de 15 min)
1. Baixe e instale o **Google Ads Editor**, gratuito, em ads.google.com/intl/pt-BR/home/tools/ads-editor/.
2. Abra o Editor → **Adicionar conta** → entre com o seu Google → escolha a conta → **Baixar**.
3. Menu **Conta → Importar → Do arquivo…**. Importe, **nesta ordem**, os arquivos de `docs/anuncio-google-motores-2026-10-07/` (até a publicação, a pasta fica em `C:\kineo-wt\anuncio-motor-0710\docs\anuncio-google-motores-2026-10-07\`): `1-campanha.csv`, `2-locais.csv`, `3-grupos.csv`, `4-palavras-chave.csv`, `5-negativas.csv`, `6-anuncios.csv`, `7-sitelinks.csv`. Em cada um: **Concluir e revisar alterações** → **Manter**.
4. Clique na campanha e confira no painel:
   - Redes: só Pesquisa do Google.
   - Locais: os 4 países, com a opção de local em **Presença**. Isso não vem do CSV; ajuste à mão.
   - Idioma: inglês.
   - Lance: **Maximizar cliques** com **limite de CPC de US$ 1,00**. Se o campo veio vazio, digite.
   - Orçamento: 18,00.
   - **Datas de início e término** (7 dias).
   - Sufixo do URL final.
5. **Verificar alterações**, corrigir o que aparecer, depois **Postar**. A campanha sobe **pausada** e nada é gasto.
6. No site do Google Ads: Recomendações → **Aplicação automática** → desmarque tudo.
7. **Clique final:** campanha → Status → **Ativada**.

### Opção B: só pelo site do Google Ads (cerca de 40 min, sem instalar nada)
1. **+ Criar → Campanha → Criar uma campanha sem orientação → Pesquisa.**
2. Metas: use as metas da conta. Nome: `Kineo - Search - Motores - Teste 0710`.
3. **Lances:** foco em **Cliques** → marque **"Definir um limite máximo de lance de CPC"** → US$ 1,00.
4. **Redes:** desmarque **Parceiros de pesquisa** e **Rede de Display**.
5. **Locais:** Estados Unidos, Reino Unido, Canadá e Austrália. Em **Opções de local**, escolha **Presença**. **Idioma:** inglês.
6. Em **Mais configurações:**
   - datas de início e término;
   - **Opções de URL da campanha → Sufixo do URL final:** `utm_term={keyword}&utm_content={creative}`;
   - **AI Max, correspondência ampla e recursos automáticos: desligados**.
7. **Grupo 1:** nome `G1 - Seedance 2.5`.
   - Cole as palavras-chave da seção 3. Os colchetes `[...]` marcam correspondência exata e as aspas `"..."`, correspondência de frase.
   - Anúncio: URL final, caminho e os 15 títulos e 4 descrições do **Anúncio A**.
   - Clique em "Novo grupo de anúncios" e repita para G2, G3 e G4.
8. **Orçamento:** US$ 18/dia → **Revisar → Publicar campanha.** Esse é o clique final; com data de início futura, ela só começa no dia marcado.
9. Depois de publicada:
   - Anúncios → **+ Anúncio responsivo** em cada grupo, com o **Anúncio B**.
   - Recursos → **+ Sitelink**, nos 4 grupos, com o URL de cada grupo (seção 3).
   - Palavras-chave → **Palavras-chave negativas** → cole a lista da seção 3 no nível da campanha.

---

## 7. Riscos e limites conhecidos
- **Reino Unido e consentimento:** o site não tem banner de consentimento (Consent Mode). Para usuários do Reino Unido, o Google pode **subcontar** as conversões no painel dele. O nosso banco conta igual, e a decisão é tomada pelo banco.
- **Compra sem login com e-mail que já tinha conta** (ou em outro navegador, ou depois dos 15 min): a pessoa não volta ao `/checkout/success` naquele navegador, e o **Google Ads não vê a compra**. O banco vê, pelo cookie. Depois do deploy, o `payment_success` passa a guardar o gclid, o que permite subir essas compras no Google como conversão offline (próxima jogada).
- **Clique no celular e compra no computador sem login:** não há como ligar as duas pontas.
- **Orçamento compartilhado:** o Google pode concentrar o gasto num grupo só. Se depois de 48 h um grupo tiver menos de 10% dos cliques, isso já é resposta; não force.
- **Primeiro toque × último toque:** o perfil guarda o primeiro toque e o cookie guarda o último clique pago. A leitura usa **qualquer toque**, então quem tocou dois grupos aparece nos dois.

## 8. Próxima jogada
1. **Conversão offline com o gclid:** a partir do deploy, todo `payment_success` vindo de anúncio guarda o gclid. Subir essas compras no Google Ads (Conversões → Uploads) ensina ao Google quem paga de verdade, inclusive a compra sem login que o pixel perde. Com 15 a 30 compras, dá para trocar Maximizar cliques por **Maximizar conversões** com custo por aquisição alvo de US$ 100.
2. **O termo de busca vira página citável:** os termos que trouxerem cadastro no relatório do Google são exatamente as perguntas que o ChatGPT recebe. Cada termo vencedor vira uma linha nas perguntas frequentes da página do motor, o que fortalece também o canal que já paga.
3. **O grupo vencedor ganha campanha própria** e uma variação da página com o botão de planos acima da dobra para quem chega do anúncio. Quem vem do anúncio já decidiu o modelo; a página só precisa mostrar o preço.
