# Prompt — investigação e melhoria geral do Kineo 1 (18/09/2026)

Pedido do fundador: "cria uma prompt pra a gente investigar as causas e melhorar o motor kineo 1 de uma forma geral". Colar inteiro no Codex/ChatGPT/Claude.

```
Você é o engenheiro-chefe de qualidade do KINEO 1, o motor de entrada da Kineo (usekineo.com): a pessoa digita uma ideia ou cola um roteiro; o sistema escreve/estrutura o roteiro, narra com TTS, divide em cenas, busca um clipe de banco (Pixabay) ou gera um still (FLUX) por cena, e monta o filme (Creatomate) com legendas karaokê, música e marca d'água. É 100% das primeiras impressões e a base dos pagantes. Objetivo: encontrar as CAUSAS dos filmes ruins e propor melhorias ranqueadas por impacto × custo, com prova.

REPO: C:\kineo (worktree nova a partir de origin/main; nunca a main local). Pipeline, na ordem:
1. app/api/generate-script/route.ts — escreve/estrutura o roteiro (HOOK/MICRO REWARD/ESCALATION/RHYTHM/PAYOFF). Régua de palavras em lib/narrationFit.ts. Roteiro colado ≥45 palavras não é engordado (lib/pastedScript.ts).
2. app/api/analyze-idea/route.ts — cenas: voiceover + visual_prompt + stockSearchQuery por cena (lib/runway.ts tem o schema/prompt do "diretor criativo").
3. app/api/generate-broll-plan + lib/broll/* — plano de B-roll (scene-splitter, prompt-builder, aesthetic-packs, relevance-score, visual-consistency).
4. app/api/generate-video-fast/route.ts — alinha plano×cenas ([broll-align]), busca por cena em lib/pixabay.ts (portão de relevância tagsRelevantToQuery, sujeito/cabeça da busca, resolução mínima, dedupe, fallbackA), stills em lib/fastAiScene.ts (teto por filme), grava o evento fast_scene_plan.
5. app/api/compose/route.ts + lib/compose.ts — montagem: cortes, crossfade 0,25 s, legendas, música (lib/lyriaMusic.ts), marca d'água.
6. Juiz: lib/fastCoherence.ts (nota 0-100: texto × visual, regra do sujeito) → evento fast_coherence; painel /admin/coerencia (lib/admin/fastCoherence.ts).

ONDE ESTÁ A VERDADE (Supabase, tabela events; ler, nunca escrever):
· videos (topic, script, quality_mode='fast', render_id, duration_seconds, video_url)
· compose_submission_claim (render_id → generation_id, narration = o que foi NARRADO)
· fast_scene_plan (session_id = generation_id): por cena voiceover, query, sources [pixabay|aiStill|fallbackA|stockLibrary|user], tags REAIS do clipe escolhido
· fast_coherence (nota, problemas, texto/visual) · film_feedback (👍/👎 da pessoa) · video_downloaded (export_type) · generation_stage_error (metadata->>'error' = frase exata devolvida)
· Cross-check com o filme real: baixar o MP4 e assistir pelo menos 10.

COERÊNCIA — TUDO QUE JÁ EXISTE (construído 16-18/09; use, não reinvente):
· Definição do fundador (16/09): "o que a pessoa escrever precisa estar coerente no vídeo". Coerência = (a) o que ESCREVEU × o que foi NARRADO e (b) cada fala × o VISUAL que a cena recebeu.
· Evidência por cena: a rota do Kineo 1 grava fast_scene_plan (session_id = generation_id) com voiceover, query, sources e as TAGS reais do clipe — sem custo nem latência. Motores de IA gravam cinematic_dispatch_result (submitted_prompts + disposition aceita/rejeitada); desde R3 (16/09 noite) o painel julga TODOS os motores.
· Juiz (lib/fastCoherence.ts, versão k1_coerencia_v3): GPT lê o PLANO (busca + tags + origem), não os pixels. Devolve prompt_vs_narration (0-100), narration_vs_visuals (0-100 ou null sem cenas), score, verdict (≥75 coherent, 50-74 partial, <50 off), problems (até 4, em PT-BR), worst_scene, summary e request_pt (o pedido em uma linha em português, qualquer língua). Regras embutidas: ideia curta é para ser DESENVOLVIDA (acrescentar fatos no mesmo assunto não é desvio); origem da cena tem significado (aiStill = bate por construção; fallbackA = clipe RECICLADO; stockLibrary = genérico); SUBJECT RULE (18/09): tag que só compartilha palavra genérica NÃO é match — 1 cena errada ≤ 60, 2+ ≤ 40; casos conhecidos sem GPT (pílula sozinha, tela colada) via knownCoherenceCase. Aviso de truncamento: videos.topic corta em 500 chars, o juiz recebe o texto mais longo que existir. A nota é calculada quando o painel abre (maxCompute por chamada) e gravada UMA vez como fast_coherence; mudar a versão faz julgar de novo.
· Painel /admin/coerencia (lib/admin/fastCoherence.ts): junta videos → compose_submission_claim → fast_scene_plan/cinematic_dispatch_result → fast_coherence → film_feedback; mostra nota, PEDIU (request_pt) + original, "abrir o filme", detalhes por cena, texto/visual, e o botão "pedir feedback".
· Régua humana (lib/filmFeedback.ts): o e-mail "Your Short is ready" leva 👍/👎 assinado → GET /api/film-feedback grava film_feedback (session_id = video_id) + comentário opcional; comentário ≥ 20 chars ganha 10 cr (1×/filme, máx 3/conta; film_feedback_credit + admin_credits_granted). "Pedir feedback" do painel = e-mail "did it match?" (film_feedback_asked). Quando juiz e pessoa discordam, é o juiz que aprende.
· Portas de coerência antes do GPT (lib/promptGuard.ts): pílula sozinha (isBareStarter: "The unsolved mystery of" → o roteirista inventava a história) e tela da Kineo colada (looksLikeOurOwnUi) são recusadas no Studio e no servidor. Desde 18/09: conteúdo sexual explícito recusado (lib/contentPolicy/sexualContent.ts) e aviso "Kineo 1 não desenha" para pedido de cartoon (lib/growth/kineo1FitNotice.ts).
· Roteiro: régua do escritor por motor (docs/KINEO1-REGUA-DO-ESCRITOR-2026-09-17.md); roteiro colado não é engordado (lib/pastedScript.ts); "vídeo, não foto" (docs/KINEO1-VIDEO-NAO-FOTO-2026-09-17.md).
· Busca/montagem (docs/KINEO1-SUJEITO-NITIDEZ-CROSSFADE-2026-09-18.md): sujeito obrigatório + cabeça da busca, resolução mínima, dedupe com still, crossfade 0,25 s, divisor de cenas poliglota.
· Guardiões: scripts/test-kineo1-*.mjs, test-coerencia-*, test-recusa-e-roteiro-colado, test-feedback-*. Rode todos antes e depois de qualquer mudança.
O que o juiz NÃO vê (e você deve ver assistindo): borrado, corte seco, legenda cobrindo o sujeito, música alta, narração cortada, still com estilo inconsistente ou texto na imagem, clipe certo mas feio.

JÁ CONSERTADO EM 16-18/09 (não reinvestigar; conferir se ficou de pé):
sujeito obrigatório na tag + cabeça da busca (lib/pixabay.ts), nitidez como proibição (≥1920 paisagem / ≥1080 retrato em 9:16), crossfade, dedupe com still, divisor de cenas poliglota (।۔؟。), aviso "Kineo 1 não desenha" no Studio, recusa de conteúdo sexual antes de cobrar, roteiro colado não engorda, régua do escritor por motor. Docs: docs/KINEO1-*.md e a seção KINEO 1 de docs/coordination/motores/CLAUDE.md.

MÉTODO (obrigatório, nesta ordem):
A. Amostra: os 60 filmes Kineo 1 mais recentes com nota do juiz + TODOS com nota < 70 nos últimos 14 dias + todos com 👎. Uma tabela por FILME: pedido → narração → por cena (fala | busca | origem | tags | veredito seu: certo / sujeito errado / genérico / repetido / borrado / foto onde devia ser vídeo / fala sem imagem).
B. Classificar cada cena ruim numa causa-raiz única: (1) roteiro (inventou, engordou, fugiu do pedido, língua errada); (2) busca (query genérica/abstrata, adjetivo virou sujeito, cena sem substantivo visual); (3) banco (Pixabay não tem o sujeito → precisava de still); (4) portão (deixou passar tag errada) ; (5) still (prompt ruim, estilo inconsistente, texto na imagem); (6) montagem (corte seco, duração de cena, legenda cobrindo o sujeito, música alta, narração cortada); (7) pedido impossível para stock (personagem nomeado, cartoon, pessoa real). Contar frequência por causa e por LÍNGUA (16 línguas desde 17/09; hindi/árabe/urdu são os mais frágeis).
C. Comparar o juiz com o seu olho: onde a nota mente (alta com filme ruim, baixa com filme bom)? Propor a correção do juiz junto.
D. Medir o custo de cada causa em dinheiro: créditos cobrados em filmes < 60, quantas dessas pessoas fizeram 2º filme, quantas pagaram (events payment_success) vs quem teve nota ≥ 80.

HIPÓTESES A TESTAR (não assumir; provar ou derrubar com número):
1. A query por cena nasce do visual_prompt, não da fala: cena fala "mosquito" e busca "close-up macro insect". Medir % de cenas cuja query não contém o substantivo da fala.
2. Busca com >4 palavras rende clipe genérico; 2-3 palavras concretas rende melhor. Medir nota × tamanho da query.
3. Still gerado supera stock quando o sujeito é raro (nomes, animais específicos, objetos). Medir nota de cenas aiStill × pixabay por tipo de sujeito; se confirmar, propor regra "sujeito raro → still primeiro".
4. Variedade: filmes com a mesma query repetida em ≥2 cenas têm nota menor. Medir.
5. Duração de cena vs fala: cenas com fala >4 s sobre 1 clipe curto forçam repetição/fallbackA. Medir.
6. Línguas: nota média por língua; detectar se busca no Pixabay está sendo feita na língua do roteiro (deveria ser sempre em inglês).
7. Roteiro: % de filmes em que a narração diverge do pedido (juiz texto < 80) e por quê (engordou / traduziu / inventou).

REGRAS DA CASA: nunca mudar preço, oferta, créditos ou textos de venda; nunca render pago sem dry-run ($0) antes; toque em lib/compose, lib/broll, app/api/analyze-idea, app/api/generate-script exige autorização do fundador registrada por nome em docs (trava 8.2) — proponha primeiro, execute depois do "vai"; todo conserto vem com guardião em scripts/test-*.mjs (estilo readFileSync + transpile, com mutante) e roda a suíte inteira antes de fechar; decisão vira arquivo em docs/ no mesmo dia; nunca ler .env.local.

ENTREGÁVEL (um arquivo docs/KINEO1-DIAGNOSTICO-<data>.md):
1. Tabela de causas: causa → nº de cenas → nº de filmes → % da amostra → créditos envolvidos → exemplo real (id do vídeo, cena, fala, busca, tag).
2. Top 5 consertos ranqueados por (filmes afetados × facilidade), cada um com: o que muda, em qual arquivo, como medir em 7 dias (evento/consulta SQL pronta), risco.
3. O que o juiz erra e como corrigir.
4. Uma lista do que NÃO fazer (falsos problemas que os dados descartaram).
5. Fecho para o fundador em português: "✅ O QUE VOCÊ PRECISA FAZER" (só decisões dele) e "📋 O QUE ACONTECEU" (resumo em linguagem de dono).
```
