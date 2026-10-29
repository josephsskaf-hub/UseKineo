<!-- KINEO-QUALIDADE-TODOS-MOTORES-2910 -->
# Qualidade por caminho — auditoria 29/10/2026

**FATO CONFIRMADO — IMPLEMENTADO:** leitura de `origin/main` em `8c736e771933f893ffebb9dafe795da6fa49afa0`, realizada em 29/10/2026. As referências desta seção são da base, antes da entrega. Existência/chamabilidade de código não comprovam resultado de render em produção.

## Antes desta entrega

**FATO CONFIRMADO — IMPLEMENTADO:** toda linha da tabela abaixo descreve o código da base citada. “Cond.” significa condição exata nas referências, não disponibilidade comprovada em produção.

| Caminho | Ficha / folha | Still critic / juiz_ficha | Elenco + época | Contrato / variedade | Estilo travado | Seres fiéis |
|---|---|---|---|---|---|---|
| Filme grátis 15 s, Kling 4.0 | Sim pelo caminho clássico Seedance antes do despacho trial [C1] | Enforce no 15 s; juiz_ficha quando folha ativa [C2] | Sim [C3] | Sim [C4] | Sim, styleAnchor [C5] | Sim, ficha/elenco [C6] |
| Filme grátis 15 s, fallback Seedance | Mesma preparação do trial [C1] | Mesmos críticos [C2] | Sim [C3] | Sim [C4] | Sim [C5] | Sim [C6] |
| Versão completa, Seedance | NÃO automática: 35 s não atende rostoFixoNoFilme15; PERSONAGEM_PUBLIC=false [F1,C1] | Still default log_only; juiz_ficha desligado sem folha [C2] | Sim [C3] | Sim [C4] | Derivado novamente, sem herdar [F1,C5] | Só elenco; ficha desligada [C6,C1] |
| Versão completa, Kling 4.0 promo | characterSheet do planner; folhaDePersonagem não chega ao ramo [F2,H1] | Still inicial julgado em log_only; sem juiz_ficha [H2] | NÃO: retorno antes do clássico [H2,C3] | NÃO contrato final do loop H3; planner próprio [H2,H3] | styleSheet do planner; sem herdar [H2,F1] | NÃO via elenco/ficha [H1,C6] |
| Studio clássico Seedance/Kling 2.5/Veo | Cond.: interna + flag, ou 15 s Seedance; âncora, sem Estrela/faceless [C1] | Still log_only; folha enforce/juiz_ficha só com ficha ativa [C2] | Sim [C3] | Sim [C4] | Sim [C5] | Sim, elenco; ficha quando ativa [C6] |
| Studio Hollywood, Kling 4.0 pago | characterSheet planner, sem folhaDePersonagem [H1,H2] | Still inicial julgado em log_only; sem juiz_ficha [H2] | NÃO [H2,C3] | Mesmo bypass do contrato final [H2,H3] | styleSheet planner [H2] | NÃO via camada comum [H1,C6] |
| Studio Hollywood, H3 | characterSheet + portrait/environment anchors; sem folhaDePersonagem [H1,H4] | Still default log_only; sem juiz_ficha [H4] | NÃO [C3,H1] | Contrato no loop; eixo em reparo de repetição [H3] | styleSheet repetida [H5] | NÃO via camada comum [H1,C6] |
| Conector Claude/ChatGPT | Herda o caminho do motor selecionado [M1] | Herda o caminho do motor [M1] | Herda o caminho do motor [M1] | Herda o caminho do motor [M1] | Herda o caminho do motor [M1] | Herda o caminho do motor [M1] |
| Anúncio público Escolha, Kling 4.0/Kling 3/Seedance 2/Veo | Retrato do ator aprovado + identidade/roupa/produto escolhidos; sem folhaDePersonagem [A1] | Juiz próprio rankeia foto, decisão humana; sem still_critic/juiz_ficha [A2] | Não usa elencoEpoca; ator explicitamente escolhido [A1] | Contrato próprio de produto/mãos/ação/área legenda [A1,A3] | Fotografia real, mesma identidade/roupa/cena nos prompts [A1,A3] | Não usa seresFieis; ator humano/referências reais [A1] |
| Anúncio V2 legado, Kling O3/Kling 4/Seedance/H3/Avatar | Ator/foto existentes, sem ficha comum [A4] | Juízes de rótulo/ator específicos, sem juiz comum [A4] | Não [A4] | Plano e produto específicos [A4] | Fotografia por prompt, sem trava comum [A4] | Produto e ator por referências [A4] |
| Cena interno e Cena95 histórico | Retrato/figurino próprios [A5] | Juiz próprio por candidato [A5] | Não [A5] | Próprio de anúncio [A5] | Fotografia e continuidade próprias [A5] | Referências reais [A5] |

**FATO CONFIRMADO — referências da base:**

- C1: `lib/cinematic/folhaDePersonagem.ts:46` (PERSONAGEM_PUBLIC=false), `:50` (motores clássicos), `:88` (pedido), `:89` (interna), `:91` (motor), `:92` (âncora), `:93` (Estrela), `:94` (faceless); `lib/filmes/filme15RostoFixo.ts:23` (15 s + Seedance); `app/api/generate-video-cinematic/route.ts:1544`, `:1786` e `:7372`.
- C2: `app/api/generate-video-cinematic/route.ts:7199` (15 s enforce, demais log_only), `:7390` (folha enforce salvo off), `:7394` (juizFicha), `:7405` (julgarSemFolha); `lib/cinematic/criticoStill.ts:63` (env pode desligar).
- C3: `app/api/generate-video-cinematic/route.ts:7027` (aplicarElencoEEpoca depois dos ajustes, antes de still/clipe).
- C4: `app/api/generate-video-cinematic/route.ts:6963` (aplicarContrato); `lib/cinematic/sceneTruth.ts`; `lib/hollywood/varietyAxis.ts`.
- C5: `app/api/generate-video-cinematic/route.ts:3746` (deriveStyleAnchor), `:3758` (classicVisualPolicy); `lib/cinematic/sceneStyle.ts:134` (applyStyleAnchor).
- C6: `lib/cinematic/elencoEpoca.ts:28` e `lib/cinematic/folhaDePersonagem.ts:38` importam seresFieis.
- F1: `lib/filmComplete/server.ts:72` inicia apenas aspect/visualMode; `:88` a `:95` lê birth sem ficha/style/still; `:108` snapshot grava apenas aspect/modo visual.
- F2: `lib/filmComplete/server.ts` marca `KINEO-VERSAO-COMPLETA-K4-2910`: promo confirmada escolhe hollywood/30 s e envia kling4_expect_promo, sem herança de identidade.
- H1: `app/api/generate-video-cinematic/route.ts:4180` separa hollywoodPath; `lib/cinematic/folhaDePersonagem.ts:91` exclui hollywood/h3.
- H2: `app/api/generate-video-cinematic/route.ts:5601` monta paidScenes, `:5609` gera firstStill; `:5612` chama criticarStill em log_only (sem juiz_ficha); resposta em `:5661` leva scene_anchor_urls antes de âncoras e crítico de Hollywood.
- H3: `app/api/generate-video-cinematic/route.ts:4476` eixo de variedade; `:6365` contrato final no loop após o retorno Kling 4.0.
- H4: `app/api/generate-video-cinematic/route.ts:5747` generateHollywoodAnchors, `:5956` criticoHModo, `:6230` crítica do still de cena.
- H5: `lib/hollywood/router.ts:674` styleSheet, `:772` cinematography repetida em cena.
- M1: `lib/mcp/studioTools.ts:39` STUDIO_GENERATE_PATH = mesma rota cinematográfica; `lib/mcp/studioMcp.ts:44` catálogo seedance/kling/veo/hollywood/h3.
- A1: `lib/ads/cena/escolhaPlan.ts:102` prompts; `:110` ator e safety; `:139` shotPrompts; `lib/ads/cena/plan.ts:109` continuity lock.
- A2: `lib/ads/cena/escolhaStills.ts:38` ESCOLHA_JUDGE, `:120` chamada de visão; `:146` escolha humana; `lib/ads/cena/runtime.ts:120` fotos aprovadas vão direto vídeo.
- A3: `lib/ads/cena/escolhaVideo.ts:6` builder comum; `:12` adapter por motor; `:15` multi_prompt Kling4; `lib/ads/cena/escolhaShots.ts` ações por categoria/formato.
- A4: `lib/ads/v2PlanCore.ts:289` planeja os shots; `lib/ads/v2Advance.ts:666` imagem, `:697` vídeo; `:553` juiz do produto na mão; `lib/ads/v2Engines.ts:121` adapta Kling O3/Kling4/Seedance/H3/Avatar/PixVerse.
- A5: `lib/ads/cena/pipeline.ts:47` avanço, `:56` juiz; `lib/ads/cena/pipeline95.ts:82` juiz, `:103` avanço; `lib/ads/cena/live.ts:2` CENA95_LIVE=false impede novos planos, mas `lib/ads/cena/runtime.ts:53` ainda atende planos históricos com quality95.

## Custo e exceções

**FATO CONFIRMADO — IMPLEMENTADO:** a folha visual clássica acrescenta FLUX por personagem e Nano Banana edit por cena (`app/api/generate-video-cinematic/route.ts:7381`, `:7386`). Ativar esse ramo indiscriminadamente criaria custo fal novo. A centralização textual e a reutilização de referências devem ser separadas dessa geração paga.

**FATO CONFIRMADO — IMPLEMENTADO:** Ads não deve inventar elenco a partir de texto comercial: a foto do ator e a do produto já são a referência canônica. Ação com produto, mãos, escala, rótulo e aprovação humana são requisitos específicos desse caminho (A1–A3). O antigo Ads v1 compõe mídia enviada pelo cliente e não cria personagens (`app/api/ads/render/route.ts:101`, `:188`).

## Depois desta entrega

**FATO CONFIRMADO — IMPLEMENTADO, leitura em 29/10/2026:** as referências Q abaixo são do código da entrega, e não do baseline. “Comum” significa passagem efetiva por `prepararQualidadeDoFilme`; “juiz comum” significa `julgarStillDoFilme`. A ficha textual não pressupõe gerar uma imagem de ficha. No anúncio, a rubrica comum alimenta o juiz existente para preservar a seleção humana e os limites de candidatos.

| Caminho | Ficha / folha | Still critic / juiz_ficha | Elenco + época | Contrato / variedade | Estilo travado | Seres fiéis |
|---|---|---|---|---|---|---|
| Grátis 15 s — Kling 4.0 | Comum; folha física só elegibilidade prévia [Q1,Q2] | Juiz comum, enforce padrão do 15 s; off global respeitado [Q3] | Comum, por fala [Q2] | Contrato clássico + variedade comum [Q2] | Comum antes do trial [Q2] | Comum [Q1] |
| Grátis 15 s — fallback Seedance | Mesma preparação e referências do trial [Q2] | Mesmo juiz [Q3] | Comum [Q2] | Mesmo contrato [Q2] | Comum [Q2] | Comum [Q1] |
| Completa — Seedance | Ficha e referências da origem, sem casting novo [Q4] | Juiz comum compara a referência herdada; sem regenerar âncora herdada [Q3,Q4] | Comum preservando elenco herdado [Q4] | Clássico + comum [Q2] | Estilo da origem antes dos prompts [Q4] | Comum com descrição herdada [Q1,Q4] |
| Completa — Kling 4.0 promo | Mesma herança, usada no despacho pago [Q4,Q5] | Juiz comum no still disponível, zero regeração adicional [Q5] | Comum antes do retorno pago [Q5] | Comum antes do despacho [Q5] | Origem + prompt compacto do motor [Q4,Q5] | Comum [Q1,Q5] |
| Studio clássico — Seedance/Kling 2.5/Veo | Ficha textual comum; geração física só orçamento legado [Q1,Q2] | Juiz comum; log_only padrão, env pode mudar [Q3] | Comum [Q2] | Clássico + variedade comum [Q2] | Comum [Q2] | Comum [Q1] |
| Studio Hollywood — Kling 4.0 pago | Ficha textual comum, sem nova folha física [Q5] | Juiz comum no primeiro still; zero foto adicional [Q5] | Comum [Q5] | Comum [Q5] | Comum + compactação preservando meio [Q5] | Comum [Q1,Q5] |
| Studio Hollywood — H3 | Ficha textual comum; âncoras do orçamento existente [Q6] | Juiz comum no still; s25 mantém seu orçamento próprio [Q6] | Comum antes e depois dos ajustes [Q6] | Comum + contrato final de cena [Q6] | Comum reaplicado após ajustes [Q6] | Comum [Q1,Q6] |
| Conector — Claude/ChatGPT | Mesma rota/motor, sem bypass do conector [Q7] | Mesma rota [Q7] | Mesma rota [Q7] | Mesma rota [Q7] | Mesma rota [Q7] | Mesma rota [Q7] |
| Anúncio Escolha — Kling 4/Kling 3/Seedance/Veo | Ficha canônica da foto escolhida; sem casting da copy [Q8] | Rubrica de identidade/still + ficha comum na chamada existente; ranking e escolha humana [Q8] | Adaptador comum em modo presenter [Q8] | Contrato específico de ação/produto/mãos preservado [Q8] | Comum, versão compacta no multi-shot [Q8] | Pessoa/produto aprovados, sem reinterpretar espécie [Q8] |
| Anúncio V2 legado — Kling 4/O3/Seedance/H3/Avatar | Ficha do ator já planejado; nenhuma pessoa extra criada pela copy [Q9] | Juiz comum após claim único, antes do vídeo; zero regeneração [Q9] | Adaptador comum em modo presenter [Q9] | Contrato específico de plano/produto preservado [Q9] | Prompt final de imagem + compacto de vídeo [Q9] | Mesma referência de ator/produto [Q9] |
| Cena interno / Cena95 histórico | Planos armazenados entram no mesmo adaptador uma vez [Q10] | Rubrica comum nas chamadas existentes [Q10] | Adaptador comum presenter [Q10] | Contrato próprio e orçamento existentes [Q10] | Comum em prompts de imagem/vídeo [Q10] | Referência aprovada preservada [Q10] |
| Anúncio V1 / Close real / mídia enviada | Não se gera personagem [Q11] | N/A para geração de personagem [Q11] | N/A [Q11] | Montagem determinística [Q11] | Mídia de origem preservada [Q11] | N/A [Q11] |
| Efeito PixVerse | Foto de produto existente [Q12] | Still comum no V2 antes do efeito [Q9] | Efeito não recebe roteiro livre [Q12] | Efeito fechado do catálogo [Q12] | Foto + efeito escolhido; schema não aceita prompt [Q12] | N/A para criação de elenco [Q12] |

**FATO CONFIRMADO — referências da entrega:**

- Q1 — fonte central: `lib/cinematic/filmQuality.ts:15` decide as camadas sem selecionar motor/rota; `:92` prepara ficha/elenco/contrato/estilo; `:101` sceneTruth; `:104` variedade e `:107` reserva espaço para elenco antes do teto de 2.500 caracteres (presenter e tag faceless mantêm seu contrato integral); `lib/cinematic/elencoEpoca.ts:26` e `lib/cinematic/folhaDePersonagem.ts:38` ligam seresFieis. Faceless preserva a intenção de não ter pessoas; Estrela mantém sua identidade própria. `app/api/generate-video-cinematic/route.ts:1794` liga personagem.ativo a essa decisão; `:7447` conserva o gate da folha paga.
- Q2 — `app/api/generate-video-cinematic/route.ts:7034` contrato clássico já aplicado; `:7098` preparação comum sobre as falas finais, antes de stills/clipes. `:7295` escolhe âncora herdada antes de gerar a imagem. `:7456` reaproveita ficha visual herdada, quando existente.
- Q3 — `app/api/generate-video-cinematic/route.ts:7272` modo; `:7279` juiz comum; `lib/cinematic/filmQualityJudge.ts:12` reúne still_critic, mostraSemFolha e decidirSemFolha; `:20` registra fal_extra=0. `lib/cinematic/criticoStill.ts:63` aceita off/log_only/enforce, com timeouts/disjuntor já existentes. Portanto “ligado” não significa que a env de produção esteja em enforce: essa env não foi lida.
- Q4 — `lib/filmComplete/server.ts:45` lê snapshot ou eventos da origem; `:56` recuperação por vídeo pertencente ao mesmo usuário; `:75` renderer valida intent pago e generationId; `:144` congela source_quality antes do checkout; `:255` herança no escritor existente; `:280` mesmo despacho Seedance/Kling4, sem receber URLs/fichas do cliente. `app/api/generate-video-cinematic/route.ts:3298` carrega; `:3771` estilo; `:3792` elenco; `:3802` snapshot. `lib/cinematic/filmQualityReference.ts:26` escolhe still por ação/identidade, recusando personagens estranhos à cena. `lib/filmComplete/qualityInheritance.ts:105` registra lacunas históricas explicitamente.
- Q5 — `app/api/generate-video-cinematic/route.ts:5605` preparação Hollywood antes da divisão de motor; `:5622` execução; `:5657` paidScenes recebe âncora herdada; `:5668` julga o still já disponível; `:5671` maxRegeracoesCena=0 e callback sem geração. `lib/cinematic/filmQuality.ts:47` compacta prompt Kling4 mantendo a estética. `lib/cinematic/filmQuality.ts:83` reaplica o teto de 2.500 caracteres do Kling 2.5 conservando a frente de identidade/ação/época e a cauda de proteção/estilo; a rota aplica no vetor final em `app/api/generate-video-cinematic/route.ts:7128`. A promoção/30 s e kling4_expect_promo continuam no despacho já existente de `lib/filmComplete/server.ts:249` e `:280`.
- Q6 — `app/api/generate-video-cinematic/route.ts:5809` não recria âncoras de uma origem herdada; `:6025` juiz comum; `:6026` limita s25/âncora existente a zero regerações; `:6111` reaplica preparação após reescritas; `:6259` âncora por identidade; `:6435` contrato final; `:6456` trava de estética no último prompt. `lib/hollywood/anchors.ts:230` respeita a estética da cena ao construir o still.
- Q7 — `lib/mcp/studioTools.ts:39` STUDIO_GENERATE_PATH; `:218` e `:340` despachos para a mesma rota. `lib/mcp/studioMcp.ts:44` lista os motores.
- Q8 — `lib/ads/cena/filmQuality.ts:16` adaptador de ficha da referência, `:25` núcleo comum, `:40` juiz com mostraSemFolha/JUIZ_FICHA_VERSAO; `lib/ads/cena/escolhaPlan.ts:178` e `:186` ligam todos os planos; `lib/ads/cena/escolhaStills.ts:123` reutiliza a chamada de visão existente, `:67` reduz score de troca de meio; `:152` usa a foto escolhida em todas as tomadas. `lib/ads/cena/plan.ts:126` cobre o plano Cena tradicional.
- Q9 — `lib/ads/v2Advance.ts:668` adaptação após todos os rewrites da imagem; `:693` juiz após claim; `:705` prompt do vídeo; `:707` override produto-na-mão também adaptado. `lib/ads/v2FilmQuality.ts:9` ficha/estilo comuns; `lib/ads/v2FilmQualityJudge.ts:7` crítico e ficha; `:11` desliga regeração. Alcançabilidade: `app/api/ads/v2/status/route.ts:35`, `app/api/cron/ads-v2-advance/route.ts:57`, `lib/ads/v2Advance.ts:1637` só desvia pedidos Cena; demais seguem o legado.
- Q10 — `lib/ads/cena/pipeline.ts:50` prepara planos internos antigos; `:59` juiz existente com rubrica compartilhada; `lib/ads/cena/pipeline95.ts:107` prepara históricos quality95; `:85` rubrica comum no juiz existente. `lib/ads/cena/live.ts:2` mantém CENA95_LIVE=false para novos pedidos; o suporte histórico não foi confundido com código morto.
- Q11 — `app/api/ads/render/route.ts:101` carrega mídia enviada; `:182` monta no Creatomate. `lib/ads/v2CloseReal.ts` e `lib/ads/v2Advance.ts:1316` montam Close real sem geração de personagem. `lib/ads/v2Advance.ts:218` preserva user_video e `:239` preserva text sem IA.
- Q12 — `lib/ads/v2Engines.ts:131` monta o efeito PixVerse apenas com effect/image_url/resolution/duration. Acrescentar prompt seria campo não suportado; a reserva H3 recebe o prompt comum em `lib/ads/v2Advance.ts:705`.

**FATO CONFIRMADO — limites de custo:** nenhuma nova chamada fal é introduzida pelos módulos filmQuality/filmQualityJudge ou pelos adaptadores Ads. Folha física continua no gate anterior e âncoras aprovadas são reutilizadas; Kling4 pago e Ads V2 fixam zero regerações no juiz comum (Q1,Q4,Q5,Q9). Ads Escolha/Cena95 reutilizam suas chamadas de visão existentes (Q8,Q10). Ads V2 legado passa a observar o still uma vez por tentativa de vídeo, sob claim único e teto de 6 s, via OpenAI, sem nova imagem fal (`lib/ads/v2FilmQualityJudge.ts:10`, `lib/ads/v2Advance.ts:693`). Preço, duração e voz não são alterados por esses adaptadores.

**TESTADO LOCALMENTE — 29/10/2026:** o helper `scripts/test-support/qualidade-ads-2910.mjs` executou código real com fronteiras de rede/visão/storage substituídas: 36 combinações categoria/formato, 144 payloads Escolha, maior prompt multi-shot de 482 caracteres; quatro chamadas de visão já existentes. No V2 legado, 24 planos, 56 imagens com num_images=1 e 760 payloads dos cinco motores com prompt passaram; o crítico simulado recusou identidade errada, fez uma chamada de visão e zero regerações. Planos internos/históricos sem snapshot também entraram no adaptador sem qualquer efeito de fornecedor. A extração de realPeople preservou byte a byte o bloco anterior após normalizar finais de linha; os três exemplos locais de sanitização passaram.

**QUESTÃO PENDENTE / DESCONHECIDO:** esta entrega foi implementada e testada localmente, não publicada e não validada visualmente em produção. Os eventos reais de nikolmishukov não foram consultados. A recuperação histórica usa somente informação realmente persistida e registra missing; não há como afirmar a recuperação de uma ficha visual que a origem nunca salvou. A prova do cliente é uma fixture offline com seu roteiro e a forma real dos eventos, não um novo render do pedido dele.

## Baseline local — 29/10/2026

**TESTADO LOCALMENTE:** `npx tsc --noEmit --incremental false` terminou com código 0 no commit base. Scripts rodados sem .env.local, credenciais, rede de fornecedor, render ou escrita em produção. As saídas integrais estão nos arquivos `docs/qualidade-baseline-scripts-2910.json` e `docs/qualidade-baseline-kling4-2910.json`.

| Teste executado na base | Código de saída | Resultado |
|---|---:|---|
| `scripts/test-elenco-epoca-2710.mjs` | 0 | Passou |
| `scripts/test-upsell-filme15-2610.mjs` | 0 | Passou |
| `scripts/test-versao-completa-k4-2910.mjs` | 0 | Passou |
| `scripts/test-meta95-personagem-2010.mjs` | 1 | Projeção histórica desfaz diverge em criticoStill.ts |
| `scripts/test-meta95-personagem-ajuste-2010.mjs` | 1 | Projeção histórica desfaz KINEO-JUIZ-FICHA-2710 não encontra trecho da rota (0x) |
| `scripts/test-juiz-ficha-2710.mjs` | 1 | Projeção histórica desfaz KINEO-JUIZ-FICHA-2710 não encontra trecho da rota (0x) |
| `scripts/test-filme15-elenco-2610.mjs` | 1 | Projeção histórica desfaz KINEO-JUIZ-FICHA-2710 não encontra trecho da rota (0x) |
| `scripts/test-personagem-sem-apresentador-2026-09-15.mjs` | 0 | Passou |
| `scripts/test-clips-kling4-2026-10-06.mjs` | 0 | Passou |
| `scripts/test-llms-filme-gratis-kling4-2910.mjs` | 0 | Passou |
| `tests/kling4FreeRedo.test.mjs` | 0 | Passou |
| `tests/kling4PaidAds.test.cjs` | 0 | Passou |
| `tests/kling4PaidAsyncStatus.test.mjs` | 0 | Passou |
| `tests/kling4PaidAudio.test.mjs` | 0 | Passou |
| `tests/kling4PaidClaim.test.mjs` | 0 | Passou |
| `tests/kling4PaidClient.test.cjs` | 0 | Passou |
| `tests/kling4PaidFilm.test.mjs` | 0 | Passou |
| `tests/kling4PaidPresentation.test.mjs` | 0 | Passou |
| `tests/kling4PaidQueueBudget.cjs` | 1 | Dependência local ausente: @electric-sql/pglite; SQL não executado |
| `tests/kling4PaidVideoBadge.cjs` | 1 | Dependência local ausente: @electric-sql/pglite; SQL não executado |
| `tests/kling4Promo.test.cjs` | 0 | Passou |
| `tests/kling4PromoBudget.cjs` | 1 | Dependência local ausente: @electric-sql/pglite; SQL não executado |
| `tests/kling4PromoCarry.test.cjs` | 0 | Passou |
| `tests/kling4PromoCarryBudget.cjs` | 1 | Dependência local ausente: @electric-sql/pglite; SQL não executado |
| `tests/kling4Trial.test.mjs` | 0 | Passou |
| `tests/kling4TrialAsync.test.mjs` | 0 | Passou |
| `tests/kling4TrialAvailability.test.mjs` | 1 | Loader offline não cobre import atual (network/unsupported module) |
| `tests/kling4TrialBudget.cjs` | 1 | Dependência local ausente: @electric-sql/pglite; SQL não executado |
| `tests/kling4TrialFallbackClaim.test.mjs` | 0 | Passou |
| `tests/kling4TrialFallbackSql.cjs` | 1 | Dependência local ausente: @electric-sql/pglite; SQL não executado |
| `tests/kling4TrialNotice.test.mjs` | 0 | Passou |
| `tests/kling4TrialRedoWiring.test.mjs` | 0 | Passou |
| `tests/kling4TrialTiming.test.mjs` | 0 | Passou |

**QUESTÃO PENDENTE / DESCONHECIDO:** nenhum render foi produzido ou observado por esta auditoria. O relato do cliente e a nota do fundador foram fornecidos no pedido de 29/10, não relidos do banco nesta tarefa.


## Apêndice — verificação da entrega e arquivos tocados

**TESTADO LOCALMENTE — 29/10/2026:** a execução final registrada em `docs/qualidade-resultados-2910.json` contém 40 arquivos de teste: 31 passaram e nove falharam. O typecheck final terminou com exit 0. Elenco/marcador passou seus 12 casos; qualidade passou 17 grupos. As nove falhas abaixo permanecem explícitas e são comparadas com o baseline, distinguindo erro idêntico de projeção já quebrada cujo primeiro ponto de falha mudou. Nenhum teste renderizou filme ou acessou produção.

| Teste da entrega | Saída | Resultado observado |
|---|---:|---|
| `npx tsc --noEmit` | 0 | Passou na rodada final. |
| `scripts/test-elenco-marcador-2910.mjs` | 0 | Passou: 12 casos, incluindo roteiro do cliente, marcadores, possessivos e idiomas. |
| `scripts/test-filme15-elenco-2610.mjs` | 1 | Falha desfaz KINEO-ELENCO-EPOCA-2710 na rota (0x); já falhava na base em KINEO-JUIZ-FICHA-2710. |
| `scripts/test-juiz-refaz-2810.mjs` | 0 | Passou: 75 verificações, incluindo mutantes. |
| `scripts/test-elenco-epoca-2710.mjs` | 0 | Passou: 68 verificações, incluindo mutantes e ligação ao núcleo comum. |
| `scripts/test-upsell-filme15-2610.mjs` | 0 | Passou: snapshot do dono, webhook pago, lançamento/retry, resgate sem navegador e oito mutantes. |
| `scripts/test-versao-completa-k4-2910.mjs` | 0 | Passou: 7/7. |
| `scripts/test-meta95-personagem-2010.mjs` | 1 | Falha desfaz KINEO-FILME15-FIEL-2610 em criticoStill.ts; mesmo erro comprovado no baseline. |
| `scripts/test-meta95-personagem-ajuste-2010.mjs` | 1 | Falha desfaz KINEO-ELENCO-EPOCA-2710 na rota (0x); base falhava antes em KINEO-JUIZ-FICHA-2710. |
| `scripts/test-juiz-ficha-2710.mjs` | 1 | Falha desfaz KINEO-ELENCO-EPOCA-2710 na rota (0x); base falhava antes em KINEO-JUIZ-FICHA-2710. |
| `scripts/test-personagem-sem-apresentador-2026-09-15.mjs` | 0 | Passou. |
| `scripts/test-clips-kling4-2026-10-06.mjs` | 0 | Passou, incluindo dez mutantes. |
| `scripts/test-llms-filme-gratis-kling4-2910.mjs` | 0 | Passou: fontes públicas, rollback e mutantes. |
| `tests/kling4FreeRedo.test.mjs` | 0 | Passou. |
| `tests/kling4PaidAds.test.cjs` | 0 | Passou: 7 casos. |
| `tests/kling4PaidAsyncStatus.test.mjs` | 0 | Passou: 9 casos. |
| `tests/kling4PaidAudio.test.mjs` | 0 | Passou: 3 casos. |
| `tests/kling4PaidClaim.test.mjs` | 0 | Passou: 5 casos. |
| `tests/kling4PaidClient.test.cjs` | 0 | Passou: 1 caso. |
| `tests/kling4PaidFilm.test.mjs` | 0 | Passou: 13 casos. |
| `tests/kling4PaidPresentation.test.mjs` | 0 | Passou: 8 casos. |
| `tests/kling4PaidQueueBudget.cjs` | 0 | Passou. A primeira base não executou por @electric-sql/pglite ausente; nesta rodada executou localmente. |
| `tests/kling4PaidVideoBadge.cjs` | 0 | Passou. A primeira base não executou por @electric-sql/pglite ausente; nesta rodada executou localmente. |
| `tests/kling4Promo.test.cjs` | 0 | Passou: 11 casos. |
| `tests/kling4PromoBudget.cjs` | 0 | Passou. A primeira base não executou por @electric-sql/pglite ausente; nesta rodada executou localmente. |
| `tests/kling4PromoCarry.test.cjs` | 0 | Passou: 1 caso. |
| `tests/kling4PromoCarryBudget.cjs` | 0 | Passou. A primeira base não executou por @electric-sql/pglite ausente; nesta rodada executou localmente. |
| `tests/kling4Trial.test.mjs` | 0 | Passou: 20 casos. |
| `tests/kling4TrialAsync.test.mjs` | 0 | Passou: 18 casos. |
| `tests/kling4TrialAvailability.test.mjs` | 1 | Falha do loader: Offline availability test forbids network/unsupported module em freeFilmEngine.ts; idêntica à base. |
| `tests/kling4TrialBudget.cjs` | 0 | Passou. A primeira base não executou por @electric-sql/pglite ausente; nesta rodada executou localmente. |
| `tests/kling4TrialFallbackClaim.test.mjs` | 0 | Passou: 5 casos. |
| `tests/kling4TrialFallbackSql.cjs` | 0 | Passou. A primeira base não executou por @electric-sql/pglite ausente; nesta rodada executou localmente. |
| `tests/kling4TrialNotice.test.mjs` | 0 | Passou: 12 casos. |
| `tests/kling4TrialRedoWiring.test.mjs` | 0 | Passou: 4 casos. |
| `tests/kling4TrialTiming.test.mjs` | 0 | Passou: 8 casos. |
| `scripts/test-qualidade-todos-motores-2910.mjs` | 0 | Passou: 17 grupos; cadeia clássica até payload Kling4, herança, limites Kling4/Kling2.5 e contratos Ads. |
| `scripts/test-ads-escolha-2310.mjs` | 1 | Falha desfaz-idiomas-formatos-2410 em lib/ads/cena/plan.ts; já falhava na base, em outro primeiro ponto da projeção. |
| `scripts/test-ads-escolha-publico-2410.mjs` | 1 | Falha isKling4AdPromoRef is not defined; idêntica à base, após seis grupos passarem. |
| `scripts/test-ads-formatos-escolha-2410.mjs` | 1 | Falha Unexpected import: @/components/Kling4PaidNotice em uiProof; idêntica à base, após planos/adaptadores. |
| `scripts/test-kling25-variedade-2026-09-28.mjs` | 1 | Falha desfaz KINEO-ELENCO-EPOCA-2710 na rota (0x); baseline confirmado falha antes em KINEO-JUIZ-FICHA-2710. |

**TESTADO LOCALMENTE — baseline complementar, 29/10/2026:** os três guardiões Ads e o de variedade Kling 2.5 também foram executados em `qualidade-heranca-2910`, HEAD `8c736e771933f893ffebb9dafe795da6fa49afa0`. O status mostrava apenas alterações de herança de filmComplete; Ads, UI, rota cinematográfica, scripts e helpers usados estavam intactos.

| Guardião | Base | Entrega | Classificação |
|---|---|---|---|
| `scripts/test-ads-escolha-2310.mjs` | Exit 1: desfaz-amostra-anuncio-2410, fonte divergente lib/ads/cena/pipeline.ts | Exit 1: desfaz-idiomas-formatos-2410, fonte divergente lib/ads/cena/plan.ts | Já falhava; primeiro ponto da projeção mudou. Não resolvido. |
| `scripts/test-ads-escolha-publico-2410.mjs` | Exit 1: isKling4AdPromoRef is not defined, após seis grupos passarem | Mesmo erro e mesmos seis grupos anteriores aprovados | Erro idêntico comprovadamente pré-existente. |
| `scripts/test-ads-formatos-escolha-2410.mjs` | Exit 1: Unexpected import: @/components/Kling4PaidNotice em uiProof | Mesmo erro, após verificações dos planos/adaptadores | Erro idêntico comprovadamente pré-existente. |
| `scripts/test-kling25-variedade-2026-09-28.mjs` | Exit 1: desfaz KINEO-JUIZ-FICHA-2710, rota mudou fora da camada (0x), no grupo c | Exit 1: desfaz KINEO-ELENCO-EPOCA-2710, mesma rota (0x) | Já falhava; primeiro ponto da projeção mudou. Não resolvido. |

**FATO CONFIRMADO — limitação dos guardiões históricos:** os desfaz comparam camadas exatas antigas e continuam com saída 1. Os testes comportamentais novos não os substituem nem demonstram que a projeção foi consertada. Os testes SQL aprovados usaram PostgreSQL embutido; a serialização local não prova concorrência entre sessões independentes em produção, conforme suas saídas.

**FATO CONFIRMADO — arquivos tocados, inventário de 29/10/2026:** união de `git diff --name-only 8c736e771933f893ffebb9dafe795da6fa49afa0` e arquivos novos ainda não rastreados da worktree de entrega: 36 arquivos. Inventário das duas partes na branch `codex/elenco-qualidade-2910`, preparada sobre essa base; não indica publicação.

| Arquivo |
|---|
| `app/api/generate-video-cinematic/route.ts` |
| `docs/QUALIDADE-POR-CAMINHO-2910.md` |
| `docs/qualidade-baseline-kling4-2910.json` |
| `docs/qualidade-baseline-scripts-2910.json` |
| `docs/qualidade-resultados-2910.json` |
| `lib/ads/cena/escolhaPlan.ts` |
| `lib/ads/cena/escolhaStills.ts` |
| `lib/ads/cena/filmQuality.ts` |
| `lib/ads/cena/pipeline.ts` |
| `lib/ads/cena/pipeline95.ts` |
| `lib/ads/cena/plan.ts` |
| `lib/ads/v2Advance.ts` |
| `lib/ads/v2FilmQuality.ts` |
| `lib/ads/v2FilmQualityJudge.ts` |
| `lib/cinematic/criticoStill.ts` |
| `lib/cinematic/elencoEpoca.ts` |
| `lib/cinematic/filmQuality.ts` |
| `lib/cinematic/filmQualityJudge.ts` |
| `lib/cinematic/filmQualityReference.ts` |
| `lib/cinematic/folhaDePersonagem.ts` |
| `lib/cinematic/pessoasDaNarracao.ts` |
| `lib/filmComplete/qualityInheritance.ts` |
| `lib/filmComplete/server.ts` |
| `lib/hollywood/anchors.ts` |
| `lib/hollywood/realPeople.ts` |
| `lib/hollywood/router.ts` |
| `scripts/test-elenco-epoca-2710.mjs` |
| `scripts/test-elenco-marcador-2910.mjs` |
| `scripts/test-filme15-elenco-2610.mjs` |
| `scripts/test-juiz-ficha-2710.mjs` |
| `scripts/test-juiz-refaz-2810.mjs` |
| `scripts/test-qualidade-todos-motores-2910.mjs` |
| `scripts/test-support/qualidade-ads-2910.mjs` |
| `scripts/test-support/qualidade-heranca-2910.mjs` |
| `tests/kling4PaidFilm.test.mjs` |
| `tests/kling4TrialTiming.test.mjs` |
