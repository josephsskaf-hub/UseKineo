# Migração dos modelos da OpenAI: inventário e plano (14/10/2026)

Investigação só de leitura: nenhum código foi alterado, nada foi commitado e nenhuma API paga foi chamada.
- Código lido: `origin/main` = `9b347413` (fetch de 14/10).
- Volume: SQL só de leitura no Supabase `cqqukkvjjrguayiyjvhh`, tabela `events`, últimos 30 dias.
- Documentação: developers.openai.com (página de deprecations, páginas dos modelos, guias de TTS/STT/moderação) e fal.ai.

---

## 0. As datas que valem (conferidas na página de deprecations da OpenAI em 14/10)

| Modelo na Kineo | Desliga em | Substituto que a OpenAI indica | Observação |
|---|---|---|---|
| `tts-1`, `tts-1-hd` | **06/01/2027** | `gpt-realtime-2.1-mini` | O substituto **não serve `/v1/audio/speech`**: só Realtime (WebSocket/WebRTC/SIP), devolve PCM. |
| `gpt-4o-mini-tts` (2 snapshots) | **06/01/2027** | `gpt-realtime-2.1-mini` | Não usamos. Também morre, então **não é rota de fuga**. |
| `gpt-4o` (2024-08-06 / 2024-11-20) | **14/01/2027** | `gpt-6-luna` | O snapshot 2024-05-13 morre em 23/10/2026, mas o alias `gpt-4o` não aponta para ele. |
| `gpt-4o-mini` | **14/01/2027** | `gpt-6-luna` | |
| `gpt-4.1`, `gpt-4.1-mini` | **14/01/2027** | `gpt-6-luna` | Usamos só o 4.1-mini, nas pesquisas com web search. |
| ⚠ **`whisper-1`** | **26/02/2027** | `gpt-transcribe` / `gpt-live-transcribe` | **Não estava no e-mail citado.** Avisado em 26/08. É a base das legendas de todo filme. |
| `omni-moderation-latest` | — | — | **Não sai.** Não está na lista; o endpoint segue gratuito. Conferido. |
| `text-embedding-3-small` | — | — | Não sai. |
| `gpt-image-2` (thumbnail) | — | — | Não está na lista. Quem sai em 23/10 é o `gpt-image-1`, e não o usamos. |

**Consequência central:** depois de 06/01/2027 **não sobra nenhum modelo da OpenAI no endpoint `/v1/audio/speech`**. Hoje a página de modelos lista apenas o `gpt-4o-mini-tts`, que desliga na mesma data. Também deixam de existir as vozes `onyx`, `fable` e `nova`: o Realtime tem 10 vozes (alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar) e nenhuma delas é uma dessas três.

---

## 1. Inventário

### 1.1 Contagem

| Modelo | Pontos de chamada (call sites) | Menções no código (app+lib+components) |
|---|---|---|
| `gpt-4o-mini` | **38** (31 pelo SDK + 7 por `fetch` cru) | 88 |
| `gpt-4o` | **11** | 41 |
| `tts-1-hd` | **7** (generateTTS ×2, hostVoice, ads/render, ads/voice, generate-avatar; + `ttsModelForTier` como rótulo) | 40 |
| `tts-1` | **2** (rotas legadas `/api/render` e `/api/voiceover`) | 9 |
| `gpt-4.1-mini` | **3** (Responses + `web_search_preview`) | 6 |
| `whisper-1` | **2** (`lib/compose.ts:908` narração; `:1018` fala do clipe) | 3 |
| `omni-moderation-latest` | 3 (não sai) | 9 |
| `text-embedding-3-small` | 1 (não sai) | 3 |
| `gpt-image-2` | 2 (não sai) | 2 |
| Plano B pela fal (`openai/gpt-4o`, `openai/gpt-4o-mini`) | 1 mapeamento (`lib/llmFallback.ts:118`) + sonda admin | — |

- `scripts/`: 22 arquivos citam os modelos. São guardiões e testes, como `test-regua-35-60-90-1410.mjs`, `test-voz-15s-mesma-da-montagem`, `test-estorno-narracao-1310`, `test-llm-fallback` e `test-moderacao`. Precisam ser atualizados junto.
- **Nenhum modelo vem de variável de ambiente.** Todos estão cravados no código. As constantes nomeadas são: `PRODUCAO_PLAN_MODEL`, `ADS_V2_BRIEF_MODEL`, `SCENE_QUERY_MODEL`, `JUIZ_STILL_MODELO` (gpt-4o-mini), `GEO_MODEL`, `ADS_V2_RESEARCH_MODEL` e `SPACES_RESEARCH_MODEL` (gpt-4.1-mini).
- **Há um ponto único de interceptação para o texto.** O `openai` exportado por `lib/openai.ts:53` é um `Proxy`, e `chat.completions.create` já passa por `chatWithLlmFallback`. Um mapa de modelos com interruptor pode morar ali.
- **Sete chamadas escapam do Proxy** porque usam `fetch('https://api.openai.com/v1/chat/completions')` cru: `next-episode/route.ts:442`, `lib/cinematic/speechImageAlign.ts:137`, `lib/fastCoherence.ts:250`, `lib/hollywood/juizStill.ts:253`, `lib/pixabay.ts:1581/1821`, `lib/publishPackServer.ts:170` e `lib/temporadaServer.ts:148`.

### 1.2 Texto: cada chamada

Criticidade:
- **B** = bloqueia o render ou a venda.
- **D** = degrada a qualidade, mas o filme sai (fail-open).
- **C** = cosmético ou interno.

Volume em 30 dias: o evento que corresponde à chamada. É aproximado, porque retries e várias chamadas por evento multiplicam a conta.

| Arquivo:linha | Modelo | O que faz | Crit. | Volume 30 d (evento) |
|---|---|---|---|---|
| `app/api/generate-script/route.ts:439, 483, 566` | gpt-4o | Escritor do roteiro: auto-structure, resgate e retry de tamanho | **B** | ~308 `script_written`, com até 2 chamadas cada → **~400–650** |
| `lib/runway.ts:482` | gpt-4o | Creative Director: cenas com 9 campos (clássicos) | **B** | parte de 530 `cinematic_dispatch_result` |
| `lib/runway.ts:966, 985` | gpt-4o | Continuação e reescrita no tamanho pedido | **B** | idem |
| `lib/runway.ts:704` | gpt-4o-mini | Ajuste de palavras por cena (até 2 rodadas) | D | idem |
| `lib/hollywood/router.ts:632` | gpt-4o | Planejador hollywood (Kling 3/H3/Omni/S25) | **B** | ~16 filmes hollywood entregues + ensaios |
| `app/api/expand-script/route.ts:274` | gpt-4o | Expandir roteiro curto | D | 79 `script_expanded` + 19 segunda rodada |
| `app/api/scenes/route.ts:141` | gpt-4o | Cenas (rota legada) | D | baixo |
| `app/api/ad-script/route.ts:78` | gpt-4o | Roteiro de anúncio (legado) | C | baixo |
| `app/api/ads/script/route.ts:75` (mini) / `:95` (4o, retry) | mini + 4o | Roteiro do Ads clássico | B (Ads) | 14 `ads_script_served` |
| `app/api/analyze-idea/route.ts:567, 817, 934, 1046` | gpt-4o-mini | Analisar a ideia, camada visual e voiceovers verbatim | **B** | 1.084 `analyze_idea_clicked` → **~1.100–2.000** |
| `lib/compose.ts:457, 498` | gpt-4o-mini | `scaleVoiceoverScript`: escalar a narração ao alvo | D | ≤ 413 `compose_submission_claim` |
| `lib/kineo1/sceneQueries.ts:125` | gpt-4o-mini | Buscas Pixabay por cena (Kineo 1) | D | ~198 filmes `fast` |
| `lib/pixabay.ts:1821` (fetch cru) | gpt-4o-mini (com visão) | Diretor que vê a miniatura e escolhe o clipe | D | ~198 filmes, várias chamadas cada |
| `lib/fastCoherence.ts:250` (fetch cru) | gpt-4o-mini | Juiz de coerência do Kineo 1 (replay/admin) | C | baixo |
| `lib/hollywood/juizStill.ts:253` (fetch cru) | gpt-4o-mini (com visão) | Juiz do still antes do POST do vídeo | D | por cena dos hollywood |
| `lib/cinematic/speechImageAlign.ts:137` (fetch cru) | gpt-4o-mini | Supervisor fala×imagem | D | 1 por filme cinematográfico |
| `app/api/generate-video-cinematic/route.ts:946` | gpt-4o-mini | Direção de shot | D | ~530 |
| `app/api/retry-hollywood-scene/route.ts:32` | gpt-4o-mini | Refazer cena hollywood | D | baixo |
| `app/api/regenerate-scene/route.ts:173` | gpt-4o-mini | Regenerar cena | D | baixo |
| `app/api/generate-broll-plan/route.ts:57`, `lib/broll/broll-engine.ts:269` | gpt-4o-mini | Plano de B-roll | D | parte do Kineo 1 |
| `app/api/next-episode/route.ts:446` (fetch cru) | gpt-4o-mini | Próximo episódio (retenção) | D | **315 `next_episode_written`** |
| `lib/temporadaServer.ts:152` (fetch cru) | gpt-4o-mini | Temporada: 5 títulos | C | 1 por filme |
| `lib/publishPackServer.ts:174` (fetch cru) | gpt-4o-mini | Pacote de publicação | C | por filme |
| `app/api/video-summary/route.ts:87` | gpt-4o-mini | Resumo do vídeo | C | por clique |
| `app/api/next-shorts/route.ts:103` | gpt-4o-mini | Sugestões de próximos shorts | C | por render |
| `app/api/demo-script/route.ts:150` | gpt-4o-mini | Roteiro grátis da home (aquisição) | B (funil) | 73 `home_free_script_requested` |
| `app/api/demo-hooks/route.ts:64`, `topic-suggest:52`, `public/viral-score:97`, `apply-suggestion:68`, `diretor/suggest:53`, `generate/route.ts:135` | gpt-4o-mini | Ganchos, sugestões e score viral | C/D | baixo a médio |
| `app/api/avatar/upload/route.ts:36` | gpt-4o-mini (com visão) | Valida o rosto na foto do avatar | D | ~7 |
| `lib/characters.ts:120`, `lib/autopilot/topics.ts:92`, `app/api/cron/refresh-niche-trends/route.ts:80` | gpt-4o-mini | Personagens, autopilot e cron de tendências | C | cron diário |
| `app/api/ads/auto-brief/route.ts:78`, `lib/ads/v2Brief.ts:356` (json_object), `app/api/ads/producao/plan:68` | gpt-4o-mini | Brief e plano do Studio Ads | **B (Ads)** | 62 `ads_v2_plan_served` + 7 auto-brief |
| `app/api/ads/v2/research/route.ts:148` | gpt-4.1-mini + web_search_preview | Pesquisa da marca (Ads v2) | D | 30 `ads_v2_research_served` |
| `app/api/spaces/brief/route.ts:83` | gpt-4.1-mini + web_search_preview | Pesquisa de curadoria do Espaços | D | ~2 |
| `app/api/cron/geo-citation-monitor/route.ts:151` | gpt-4.1-mini + web_search_preview | Monitor de citação GEO (semanal) | C | 12 checagens |
| `lib/llmFallback.ts:118, 431` | `openai/` + o mesmo id, na fal | Plano B de texto pelo roteador da fal | D | 0 usos em 30 d |

### 1.3 Áudio: cada chamada

| Arquivo:linha | Modelo | O que faz | Crit. | Volume 30 d |
|---|---|---|---|---|
| `lib/compose.ts:658` (por seção) e `:686` (passe único) — `generateTTS` | tts-1-hd | Narração dos **clássicos**: Kineo 1, Seedance 1.5, Kling 2.5 e Veo. Persona com voz e velocidade, TTS por seção e byte-concat de MP3 | **B** | 198 fast + 174 Seedance + 10 Kling 2.5 + 9 Veo = **391 filmes entregues** |
| `lib/hollywood/hostVoice.ts:110` — `synthesizeHostSpeech` | tts-1-hd | Narração **e** falas do apresentador dos **hollywood** (Kling 3/H3/H3 Max/S25/Omni), com voz pinada no claim | **B** | 16 filmes entregues |
| `app/api/compose/route.ts:3063, 3200`, `compose/unlock:560`, `prewarm-voiceover:102` | (via generateTTS) | Primária, passe corretivo, desbloqueio e pré-aquecimento | B | idem |
| `app/api/generate-avatar/route.ts:806` (+ generateTTS 798/817) | tts-1-hd | Avatar / produção do Ads | B (avatar) | ~7 |
| `app/api/ads/render/route.ts:152` | tts-1-hd | Narração do **Ads clássico** (vozes nova/shimmer/onyx/echo) | B (Ads) | 12 `ads_render_served` |
| `app/api/ads/voice/route.ts:44` | tts-1-hd | Prévia de voz do Ads | C | 1 |
| `app/api/render/route.ts:173`, `app/api/voiceover/route.ts:48` | tts-1 | Rotas legadas | C | ~0 (confirmar e apagar) |
| `lib/compose.ts:908` | whisper-1 | **Tempo das legendas por palavra** sobre o mp3 da narração | **B (qualidade)** | ~400 narrações/mês, ~300 min |
| `lib/compose.ts:1018` | whisper-1 | Verifica a fala dentro do clipe (Veo/hollywood) | D | por clipe com áudio |

**Volume de voz:** 407 filmes entregues em 30 dias, com **~51 mil palavras narradas** (≈ 320 mil caracteres). Somando passes corretivos, pré-aquecimento e falas do apresentador, ficam **~350–400 mil caracteres por mês**. Idiomas registrados: en 125, pt 16, ur/fr/ru/hi/es/de esparsos, e 256 sem rótulo.

**Correção a uma premissa da casa:** o CLAUDE.md diz "hollywood = voz própria a 2,3 pal/s". No código de 14/10, a narração hollywood também é **tts-1-hd** (`lib/hollywood/hostVoice.ts`, confirmado em `lib/growth/reguaSemMotor.ts:14`). As **duas** famílias dependem da voz que sai em 06/01.

---

## 2. Voz: o maior risco

### 2.1 Todos os caminhos de TTS hoje

| Caminho | Provedor/modelo | Vozes | Velocidade |
|---|---|---|---|
| Clássicos (`generateTTS`) | OpenAI tts-1-hd | 9 personas em `lib/narration/personas.ts`: storyteller fable 1,03 · dark-mystery onyx 0,92 · finance-authority onyx 1,00 · documentary echo 0,96 · luxury-narrator alloy 0,90 · energetic-facts fable 1,10 · conspiracy onyx 0,96 · futuristic-ai alloy 1,04 · emotional-storyteller nova 0,97 | `persona × speed × seção` limitado a 0,7–1,3; passe corretivo de duração |
| Clássicos premium (desligado) | ElevenLabs direto `eleven_turbo_v2_5` (`lib/narration/elevenlabs.ts`, flag `KINEO_ELEVENLABS_ENABLED`) | `elevenVoiceId` já mapeado por persona (Rachel, Adam, Arnold, Antoni, Josh, Bella) | 0,7–1,2 |
| Hollywood (`hostVoice`) | OpenAI tts-1-hd | persona do roteiro, ou ficha do personagem (`lib/hollywood/characterVoice.ts`: onyx/echo/nova/shimmer, 0,94–1,06) | 0,7–1,3 |
| Plano B de voz dos clássicos (`lib/ttsFallback.ts`) | MiniMax speech-2.8-hd na fal | voz padrão (sem `voice_setting`) | **nenhuma**: o schema usado não passa velocidade |
| Ads v2 (`lib/ads/v2Advance.ts:620`) | MiniMax speech-2.8-hd na fal | padrão | medido **2,0 pal/s** (en 2,09 · pt 1,92) |
| Apresentadores do Ads (`lib/ttsFallback.ts:136`) | ElevenLabs v3 na fal | Brian, Daniel, Aria, Jessica | `stability 0.5` |
| Ads clássico / prévia | OpenAI tts-1-hd | nova, shimmer, onyx, echo | 1,0 |
| Avatar (`lib/avatar/voice.ts`) | MiniMax speech-02-hd na fal | — | — |

Plano B de voz: 0 eventos `tts_fallback_used` em 30 dias. **A MiniMax nunca narrou um filme de verdade fora do Ads.**

### 2.2 Réguas e portões amarrados ao ritmo do tts-1-hd (todos precisam ser medidos de novo)

| Onde | Constante | Valor hoje |
|---|---|---|
| `lib/compose.ts:409` | `TTS_WORDS_PER_SECOND` (`targetWordCount`, `scaleVoiceoverScript`) | 3,1 |
| `lib/openai.ts` | `durationPlanFor` (faixas × 0,775) | 3,1 |
| `lib/speechRate.ts` | `SPEECH_RATE_BASE` | classic 3,1 · hollywood 2,3 |
| `lib/speechRate.ts` | `CLASSIC_VOICE_WORDS_PER_SECOND` (`speechRateFor`, por voz × personaSpeed) | onyx 2,5 · fable 2,55 · alloy/echo/nova/shimmer 2,55 (estimados) |
| `lib/narrationFit.ts` (trava 8.2) | `WORDS_PER_SECOND`, `MIN_COVERAGE`, `SHORT_FILM_MIN_COVERAGE`, autofit | 2,3 · 0,95 · 0,75 |
| `lib/scriptWriterRate.ts` | `fastestClassicPersonaRate` (fable × 1,10 = 2,81); `seedanceShortWriterWords` | **régua do 15 s: 36–41 palavras** |
| `lib/growth/reguaSemMotor.ts` | **KINEO-REGUA-35-60-90-1410** | pisos 94 / 161 / 241 palavras |
| `lib/durationByEngine.ts` | `VERBATIM_EST_WORDS_PER_SECOND`, `ritmoDoFilmeCurto` (por idioma; tr 2,03), `seedanceShortSpeechCapacity` | 2,5 |
| `lib/vozDoFilmeCurto.ts` | voz do 15 s assinada no claim (portão = montagem) | persona tts-1-hd |
| `lib/contadorVoz.ts` | contador do Studio | persona tts-1-hd |
| `lib/cinematic/classicDryRun.ts` | `CLASSIC_WORDS_PER_SECOND` (veredito PASS/FAIL do dry-run) | 3,1 |
| `lib/cinematic/klingShots.ts`, `veoShots.ts`, `seedanceCobreAFala.ts`, `sceneWords.ts`, `lib/broll/scene-splitter.ts` | passo dos planos e quantos clipes cobrem a fala | 2,3 / 2,5 / 3,1 |
| `app/api/generate-video-cinematic/route.ts` | 3444 (2,5), 4255 (`WPS = 2.3`), 6450 (guarda 2,5), portão de 95 % | — |
| `app/api/compose/route.ts` | corretivo, TAIL-GROW, piso 0,92 | medidos sobre onyx 0,92 etc. |
| `lib/gptHandoff.ts`, `app/api/gpt/handoff` | as duas réguas (orçamento do GPT) | 3,1 / 2,3 |
| `app/api/cron/send-failure-recovery:215` | contador do e-mail | 2,3 |
| Ads: `lib/ads/renderContract.ts` (`ADS_MAX_NARRATION_WORDS = 88 × 2,45`), `scriptPrompt.ts` (piso 2,45), `models.ts` (3,1), `producao.ts` (`PRODUCAO_TALK_WORDS_PER_SECOND` 3,1) | — | — |
| `lib/ads/v2CopyFit.ts` | `ADS_V2_VOICE_WPS` | 2,0: já é MiniMax, **não muda** |

Ritmo medido hoje (palavras ÷ segundos do MP4 em 30 dias; é um piso do passo real):

| Motor | pal/s |
|---|---|
| Kineo 1 | 2,82 |
| Seedance | 2,73 |
| Veo | 2,53 |
| Kling 2.5 | 2,45 |
| Kling 3 | 2,32 |
| S25 | 2,28 |
| H3 | 2,09 |

**Dependências que não são de ritmo:**
- `generateTTS` concatena MP3 por seção, byte a byte.
- `compose.ts` lê a duração pelos quadros MP3 (`TTS_MP3_BITRATE_BPS`, MPEG2 a 24 kHz).
- O cache de voz é indexado pela voz da OpenAI.
- A legenda usa o tempo por palavra do Whisper, com a grafia do roteiro.

Um provedor novo precisa devolver **MP3** compatível, ou essas três peças precisam mudar.

### 2.3 Candidatos para a voz

| | tts-1-hd (hoje) | **MiniMax speech-2.8-hd (fal)** | ElevenLabs (turbo v2.5 direto / v3 na fal) | gpt-realtime-2.1-mini (OpenAI) | gpt-4o-mini-tts |
|---|---|---|---|---|---|
| Vive depois de 06/01? | não | sim | sim | sim | **não (mesma data)** |
| Custo | US$ 30/1M chars ≈ **US$ 0,03/min** | ≈ US$ 0,10/1k chars ≈ **US$ 0,10/min** (tabela da MiniMax; a fal não publica o 2.8, a Segmind cobra 0,125; **conferir na fatura da fal**) | v3 na fal US$ 0,10/1k chars ≈ US$ 0,10/min; turbo direto depende do plano | áudio de saída US$ 20/1M tokens ≈ US$ 0,02–0,03/min | — |
| Custo mensal estimado (~380 mil chars) | ~US$ 11 | **~US$ 38–48** | ~US$ 38 | ~US$ 10 + conversão | — |
| Endpoint | `/v1/audio/speech`, MP3 | fal, MP3 32 kHz/128 kbps configurável, devolve `duration_ms` | fal ou API direta, MP3 | **só Realtime** (WebSocket), **PCM**, sem `/v1/audio/speech` | — |
| Controle tipo persona | voz + speed | `voice_id`, **speed 0,5–2,0**, pitch, **emotion**, volume, `pronunciation_dict`, pausas `<#x#>` | voz + stability/style + speed 0,7–1,2 (personas **já mapeadas** em `personas.ts`) | só `instructions` em texto; onyx/fable/nova **não existem** | — |
| Idiomas | segue o Whisper | 40+ com `language_boost` | v3 70+; turbo ~32 | multilíngue | — |
| Latência | 55 s de teto, normalmente segundos | fila da fal (teto de 90 s no plano B); **medir** | fal ou direto; medir | streaming, mas exige servidor de socket | — |
| Já integrado | sim | **sim** (plano B + Ads v2 + /audio) | sim (flag clássica + apresentadores do Ads) | não | não |

**Recomendação:**
1. **Primária: MiniMax speech-2.8-hd**, nos clássicos e nos hollywood.
   - Já está no código e já narra o Ads v2.
   - É a única com `speed` e `emotion`, o que permite **calibrar cada persona para perto da régua atual** e mexer o mínimo nas réguas.
   - Cada persona ganha `minimaxVoiceId` + `minimaxSpeed` + `emotion`. A velocidade é ajustada até o ritmo medido ficar a ±5 % da tabela de hoje (2,30–2,81). O Ads v2 mediu 2,0 pal/s a 1,0, então devem ser necessários speeds de ~1,15–1,4. Se a voz ficar acelerada demais, aceita-se a régua nova e as constantes são refeitas.
2. **Reserva: ElevenLabs.** Os IDs por persona já existem e há flag no `generateTTS`; falta ligar no `hostVoice`.
3. **Descartado:** `gpt-realtime-2.1-mini`. Exige servidor WebSocket dentro de função serverless e conversão PCM→MP3 sem ffmpeg no bundle, e as três vozes mais usadas não existem. Só vale reabrir se a OpenAI lançar um modelo novo no `/v1/audio/speech` até novembro: **vigiar a página de deprecations**.
4. A narração passa de ~US$ 11 para ~US$ 40–50 por mês. No total da fal isso é desprezível, mas pesa no orçamento da casa (US$ 25/semana) durante os canários.

### 2.4 Legendas (whisper-1, 26/02/2027)

- O `gpt-transcribe` (US$ 0,0045/min) **não documenta tempo por palavra**: o guia diz que `timestamp_granularities` é "only supported for whisper-1".
- Candidatos:
  - (a) testar o `gpt-transcribe` com `verbose_json`/`word`;
  - (b) Whisper na fal com tempo por palavra (conferir o schema);
  - (c) ElevenLabs Scribe (palavra);
  - (d) alinhamento forçado com o texto conhecido. A narração é verbatim, e `alinharGrafiaDoRoteiro` já usa a grafia do roteiro.
- Custo desprezível (~300 min/mês). **Risco de prazo, não de dinheiro.**

---

## 3. Texto: substitutos

| Uso hoje | Substituto recomendado | Preço (entrada/saída por 1M) | Observação |
|---|---|---|---|
| gpt-4o-mini (38 chamadas) | **`gpt-6-luna`**, `reasoning_effort: 'none'` | US$ 0,10 / 0,50 (era 0,15 / 0,60) | Mais barato. Visão suportada. |
| gpt-4o (11 chamadas: escritores e planejadores) | **`gpt-6-luna`** com effort `low`; se o A/B reprovar, `gpt-6.1-sol` | Luna 0,10 / 0,50 · Sol 2 / 10 (era 2,50 / 10) | Os dois custam igual ou menos. Luna corta ~95 % do custo do 4o. |
| gpt-4.1-mini + web search (3) | `gpt-6-luna` na Responses API com a ferramenta de web search | busca cobrada à parte | O SDK `openai@^4.55` (o código cita 4.104) só conhece `web_search_preview`: conferir o nome da ferramenta e talvez subir o SDK. |
| Plano B pela fal (`openai/gpt-4o*`) | mapear para o modelo novo no roteador da fal | — | Conferir se a fal publica `openai/gpt-6-luna`. Os ids antigos morrem junto. |

Custo de texto hoje, estimado: ~US$ 30–40/mês, quase tudo do gpt-4o. Com Luna: ~US$ 3–5/mês, sem contar tokens de raciocínio.

**Diferenças de formato que quebram código (testar cada uma):**
- **`max_tokens` → `max_completion_tokens`.** Nos modelos de raciocínio da OpenAI, `max_tokens` costuma ser recusado. Com effort acima de `none`, os tokens de raciocínio consomem o mesmo orçamento: os tetos fixos de 180/700/900/1.800 viram JSON cortado.
- **`temperature`.** A página do Luna não menciona. Na família GPT-5, só valia com raciocínio desligado. Usamos de 0 a 0,7 em quase todo lugar.
- **`response_format: { type: 'json_object' }`.** A página lista "Structured outputs" e não menciona JSON mode. São usados em `v2Brief`, `juizStill`, `sceneQueries`, `analyze-idea` e outros. Testar `json_object`; se falhar, migrar para `json_schema`.
- **Function calling** na Chat Completions só com effort `none`.
- **Obediência à contagem de palavras muda.** As réguas do escritor foram calibradas no comportamento do 4o:
  - "o mini entrega ~70–75 %" (`lib/ads/scriptPrompt.ts`);
  - "o 4o escreve −8 % a +21 %" (`lib/cinematic/escritorNoLugar.ts`);
  - "o 4o devolve 6 cenas quando pedem 9" (`lib/runway.ts`);
  - "o mini escreve 86–110 para 144" (`router.ts`).

  Correções embutidas, como pedir acima do teto, viram excesso se o modelo novo obedecer.
- **Latência.** Raciocínio em rota com timeout de 35 s (`OPENAI_SCRIPT_TIMEOUT_MS`) e `maxDuration` 300. Medir o p95.
- **Visão.** A contagem de tokens de imagem muda; as estimativas de custo em `juizStill.ts` e `pixabay.ts` ficam erradas.

---

## 4. Plano com datas

Regras que valem durante o plano:
- **Congelamento de produto até ~27/10:** antes disso, só inventário, fixtures e testes offline.
- **Trava 8.2:** `lib/compose.ts`, `lib/hollywood/hostVoice.ts`, `lib/narrationFit.ts` e as rotas `generate-video-cinematic` e `compose` exigem "vai" do fundador.

| Fase | Datas | O que | Custo |
|---|---|---|---|
| **0. Inventário** | 14/10 (feito) | Este documento | US$ 0 |
| **1. Fixtures congeladas** | 15–24/10 | Exportar, só leitura:<br>· 30 roteiros reais por motor (Kineo 1, Seedance 15/35/60/90, Kling 2.5, Veo, hollywood) em en/pt + 5 de outros idiomas;<br>· 20 pedidos do Ads e 20 do analyze-idea;<br>· as respostas atuais do 4o/mini como linha de base.<br>Gravar em `scripts/fixtures/migracao-2026-10/`. | US$ 0 |
| **2a. A/B de texto offline** | 20/10–07/11 | Script que roda cada fixture em gpt-4o, gpt-4o-mini, gpt-6-luna (none/low) e gpt-6.1-sol. Mede: JSON válido, contagem de palavras contra a régua, nº de cenas, latência p50/p95 e custo. Nada vai ao produto. | **~US$ 15–25** em tokens |
| **2b. A/B de voz offline** | 28/10–14/11 | Sintetizar as fixtures nas 9 personas, em 3 idiomas e 3 tamanhos, em MiniMax (`voice_id`/`speed`/`emotion` calibrados), ElevenLabs e tts-1-hd como base. Medir pal/s pelo `duration_ms`/MP3, ouvir (fundador dá nota de timbre) e escolher o mapa persona→voz. Testar as legendas nos mesmos MP3s (gpt-transcribe, Whisper na fal, alinhamento forçado). | **~US$ 30–40** (≈ 3 × 100 mil chars + transcrição) |
| **3. Código atrás de interruptor** | 28/10–14/11 | · `lib/aiModels.ts`: mapa único papel→modelo, com env `KINEO_TEXT_MODELS=legacy\|v2`, aplicado no Proxy de `lib/openai.ts` e nas 7 chamadas por fetch cru.<br>· `KINEO_VOICE_PROVIDER=openai\|minimax\|eleven` em `generateTTS` e `synthesizeHostSpeech` (trava 8.2: pedir "vai").<br>· Tabela de ritmo por (provedor, voz).<br>· Réguas recalculadas a partir das medidas da fase 2b.<br>· Dry-runs a US$ 0 (`dry_run:true`) com as réguas novas em todos os motores. | US$ 0 |
| **4. Canários pagos** | 10–21/11 | Só contas do fundador (marca d'água forçada), com saldo da fal conferido antes:<br>· 2 Kineo 1 (35/60) · 3 Seedance 1.5 (15/35/60) · 1 Kling 2.5 · 1 Veo · 1 Kling 3 · 1 H3<br>· mais 2 do Ads (clássico e v2) e 1 em pt e 1 em outro idioma.<br>Critério: duração ≥ alvo (não abaixo), legenda sincronizada, voz certa no apresentador e fala igual ao roteiro. | **~US$ 40–60** de fal + ~US$ 2 de API. Dividir em 2 semanas pelo teto de US$ 25/sem. |
| **5. Virada com rollback** | texto **17/11**; voz **01–03/12** (depois da Black Friday, 27/11) | Interruptor em `v2`/`minimax` para todos. Rollback = voltar o env, válido até 05/01 (voz) e 13/01 (texto). Vigiar por 7 dias no placar: `narration_too_short`, `compose_refused`, `render_delivered_measured` (duração vs alvo), `generation_stage_error` e fal gasto por filme. | — |
| **6. Remoção** | 15/12 (voz/texto) · 31/01 (Whisper) | Apagar os ids antigos e as rotas legadas (`/api/render`, `/api/voiceover`) e trocar o plano B de texto da fal. O guardião de inventário fica vermelho para qualquer id aposentado. | — |
| Prazos duros | **06/01/2027** voz · **14/01/2027** texto · **26/02/2027** Whisper | Folga de 3 a 5 semanas antes de cada um. | — |

**Envelope total de testes: ~US$ 90–125.** Texto ~20, voz offline ~35, canários ~50, mais folga para retry.

### 4.1 Guardiões a escrever (com mutação, commitando antes de falsificar)
1. **Inventário:** falha se aparecer `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `tts-1`, `gpt-4o-mini-tts` ou `whisper-1` fora de `lib/aiModels.ts`. Depois da fase 6, falha em qualquer lugar.
2. **Régua por voz:** a tabela (provedor, voz) → pal/s bate com as medidas gravadas da fase 2b (±5 %).
3. **Duração:** com as fixtures, cobertura ≥ 0,95 nos 35/60/90 e ≥ 0,75 no 15 s, na régua nova. Os pisos de `reguaSemMotor` (hoje 94/161/241) e a faixa do 15 s (36–41) são recalculados, não copiados.
4. **Crédito e margem:** para a mesma fixture, nº de clipes pagos à fal ≤ linha de base +10 % e duração faturada igual. Voz mais lenta = mais clipes no mesmo crédito.
5. **JSON e contrato do texto:** toda chamada da fase 2a devolve JSON parseável e respeita a régua de palavras e de cenas.
6. **Formato do áudio:** o MP3 do provedor novo passa no leitor de duração do compose e no byte-concat por seção; ou a TTS por seção é desligada para ele.
7. **Legenda:** o drift entre o tempo por palavra e o áudio fica abaixo de 150 ms nas fixtures.
8. **Voz pinada:** o hollywood mantém uma voz por filme. É o defeito que o `hostVoice` existe para matar: o claim carrega o `voice_id` novo.

### 4.2 Riscos
1. **Ritmo da voz muda duração → crédito → margem.**
   - Voz mais rápida: mais recusas por "narração curta" (a maior perda histórica do Kineo 1).
   - Voz mais lenta: filmes mais longos, mais clipes pagos à fal pelo mesmo crédito, e o teto de 89 s do Ads estourado.
   - As ~20 constantes da seção 2.2 precisam ser refeitas juntas: "uma régua por voz".
2. **Timbre e identidade.** As vozes onyx/fable/nova (6 de 9 personas, 3 de 4 vozes do Ads, vozes de personagem) acabam. O "jeito Kineo" de soar muda para todo cliente no mesmo dia. Pedir nota do fundador antes da virada.
3. **Legendas sem dono depois de 26/02.** O substituto oficial não promete tempo por palavra.
4. **Texto:** obediência a contagem, parâmetros e JSON mudam; o plano B da fal morre junto; 7 chamadas cruas escapam do interruptor.
5. **Trava 8.2 e congelamento:** os arquivos centrais exigem "vai" do fundador. Pedir na janela de 28/10.
6. **Custo do canário contra o caixa da fal**, que recarrega por cartão (recusa em 08/10). Ler o saldo antes de cada lote.

---

## 5. Fase 1 entregue (14/10) e checklist da fase 2

Marca: `KINEO-MIGRACAO-OPENAI-F1-1410`. As linhas abaixo são do `origin/main` 9b347413 mais os commits da fase 1.

### 5.1 O que a fase 1 deixou pronto

- **Amostras congeladas** em `scripts/fixtures/migracao-openai/`. Não é `migracao-2026-10/`, como a seção 4 previa. O `README.md` da pasta explica o método.

  | Arquivo | Casos | O que guarda |
  |---|---|---|
  | `roteirista.json` | 36 | Kineo 1 35/60/90, Seedance 15/35/60/90, Kling 2.5, Veo e hollywood H3/Kling 3; en, pt, es, fr, ar, hi, ur, ko |
  | `analyze-idea.json` | 20 | corpos reais do POST |
  | `ads-plan.json` | 7 | **só existem 7 pedidos v2 de conta externa**, todos de uma conta |
  | `narracoes.json` | 45 | com segundos do MP4 e persona estimada |
  | `legendas.json` | 11 | casos de legenda |

- **Registro `lib/aiModels.ts`**, com as strings de hoje, sem trocar nada:
  - `AI_TEXT_MODELS`: writer, planner, scenePlannerLight, analyzer, vision, ads, adsRetry, research, utility;
  - `AI_SPEECH_MODELS`: tts, ttsLegacy;
  - `AI_TRANSCRIPTION_MODEL`, `AI_MODERATION_MODEL`, `AI_EMBEDDING_MODEL`, `AI_IMAGE_MODEL`;
  - `OPENAI_SHUTDOWN_DATES`.
- **13 chamadas já trocadas** para o registro. São arquivos fora da trava 8.2 que nenhum guardião lê. Cada troca mexe em 1 linha e acrescenta 1 import. Desfazer a troca em memória devolve o arquivo byte a byte igual ao `origin/main`.
  - `app/api/topic-suggest`, `video-summary`, `next-shorts`, `demo-hooks`, `public/viral-score`, `generate`, `cron/refresh-niche-trends` e `lib/autopilot/topics.ts` → `utility`
  - `generate-broll-plan`, `regenerate-scene` → `scenePlannerLight`
  - `avatar/upload` → `vision`
  - `scenes` → `writer`
  - `voiceover` → `AI_SPEECH_MODELS.ttsLegacy`
- **Guardião `scripts/test-modelos-openai-inventario-1410.mjs`.** Tem uma foto de 56 strings cruas em 37 arquivos.
  - Fica vermelho se aparecer string crua nova fora do registro.
  - Fica vermelho se o registro trocar um modelo antes da hora.
  - Fica vermelho se uma troca marcada apontar para uma constante com outro valor.
  - Imprime a contagem regressiva: 84 dias para a voz, 92 para o texto e 135 para o Whisper, contados de 14/10.

### 5.2 Checklist da fase 2: chamadas a mover para o registro

Regra: cada item troca a string pela constante e **não muda o valor**. A troca de valor é da fase 3, atrás do interruptor. Arquivo marcado **(8.2)** pede o "vai" do fundador; a aprovação de 14/10 cobre esta migração. Depois de cada leva, rodar o guardião com `--foto`, conferir e encolher a `FOTO`.

**Texto pelo SDK** (passam pelo Proxy de `lib/openai.ts:53`):

- [ ] `app/api/generate-script/route.ts:439`, `:483`, `:566` → `AI_TEXT_MODELS.writer`
- [ ] `app/api/expand-script/route.ts:274` → `writer`
- [ ] `app/api/ad-script/route.ts:78` → `writer`
- [ ] `lib/runway.ts:482`, `:966`, `:985` → `planner`
- [ ] `lib/runway.ts:704` → `scenePlannerLight`
- [ ] `lib/hollywood/router.ts:632` → `planner`. **Cuidado:** o `test-llm-fallback` confere `corpo.model === 'gpt-4o'`. O valor não muda, mas releia o guardião.
- [ ] `app/api/analyze-idea/route.ts:567`, `:817`, `:934`, `:1046` → `analyzer`
- [ ] `lib/compose.ts:457`, `:498` → `analyzer` **(8.2)**
- [ ] `app/api/generate-video-cinematic/route.ts:946` → `scenePlannerLight` **(8.2)**
- [ ] `app/api/retry-hollywood-scene/route.ts:32` → `scenePlannerLight`
- [ ] `lib/broll/broll-engine.ts:269` → `scenePlannerLight`
- [ ] `lib/kineo1/sceneQueries.ts:36` (`SCENE_QUERY_MODEL`) → `= AI_TEXT_MODELS.scenePlannerLight`
- [ ] `lib/pixabay.ts:1821` → `vision`
- [ ] `app/api/ads/script/route.ts:75` → `ads`; `:95` → `adsRetry`
- [ ] `app/api/ads/auto-brief/route.ts:78` → `ads`
- [ ] `lib/ads/v2Brief.ts:22` (`ADS_V2_BRIEF_MODEL`) e `lib/ads/producao.ts:179` (`PRODUCAO_PLAN_MODEL`) → `= AI_TEXT_MODELS.ads`
- [ ] `app/api/demo-script/route.ts:150`, `apply-suggestion/route.ts:68`, `diretor/suggest/route.ts:53`, `lib/characters.ts:120` → `utility`

**Texto por `fetch` cru** (escapam do Proxy e do plano B; o interruptor da fase 3 precisa alcançá-los):

- [ ] `app/api/next-episode/route.ts:442` (corpo `:446`) → `utility`
- [ ] `lib/temporadaServer.ts:148` (`:152`) → `utility`
- [ ] `lib/publishPackServer.ts:170` (`:174`) → `utility`
- [ ] `lib/cinematic/speechImageAlign.ts:132` (padrão do `opts.model`) → `analyzer`
- [ ] `lib/fastCoherence.ts:245` → `analyzer`
- [ ] `lib/hollywood/juizStill.ts:29` (`JUIZ_STILL_MODELO`, usado em `:257`) → `= AI_TEXT_MODELS.vision`
- [ ] `lib/pixabay.ts:1581`: é só o transporte, o modelo vem do corpo de `:1821`.

**Pesquisa** (Responses + `web_search_preview`):

- [ ] `lib/ads/v2Research.ts:22`, `lib/spaces/spaces.ts:67` e `lib/geo/citationMonitor.ts:30` → `= AI_TEXT_MODELS.research`. Na fase 3, conferir se o SDK `openai@4.104` aceita o modelo novo e a ferramenta nova; senão, subir o SDK.

**Voz e legendas:**

- [ ] `lib/compose.ts:660`, `:686` (`generateTTS`) → `AI_SPEECH_MODELS.tts` **(8.2)**
- [ ] `lib/hollywood/hostVoice.ts:110` → `tts` **(8.2)**
- [ ] `app/api/ads/render/route.ts:152`, `ads/voice/route.ts:44`, `generate-avatar/route.ts:806` → `tts`
- [ ] `lib/narration/elevenlabs.ts:51` (rótulo `ttsModelForTier`) → `tts`
- [ ] `app/api/render/route.ts:173` → `ttsLegacy`. Candidata a ser apagada na fase 6, junto com `/api/voiceover`.
- [ ] `lib/compose.ts:908`, `:1018` → `AI_TRANSCRIPTION_MODEL` **(8.2)**

**Plano B e sonda:**

- [ ] `lib/llmFallback.ts:119` (`fallbackModelFor`: `openai/` + id) e `app/api/admin/llm-fallback-probe/route.ts:31` (`PROBE_MODELS`). A fase 3 mapeia para o id novo na fal; antes, conferir se a fal publica `openai/gpt-6-luna`.

**Fora do escopo** (não saem): `omni-moderation-latest` (`lib/safety/contentModeration.ts:47`, `topicModeration.ts:50`, `app/api/admin/moderation-scan/route.ts:50`), `text-embedding-3-small` (`lib/broll/relevance-score.ts:43`) e `gpt-image-2` (`app/api/generate-thumbnail/route.ts:120`, `:154`). Podem passar a usar as constantes do registro, mas sem pressa.

**Guardiões que citam os ids e precisam ser relidos quando o valor mudar** (fase 3, não na 2):

- `test-llm-fallback-2026-09-28`, `test-regua-35-60-90-1410`, `test-voz-15s-mesma-da-montagem-2026-09-29`, `test-h3-palavras-2026-09-15`
- `test-escritor-monumento-1310`, `test-ads-v2-servidor-2026-09-28`, `test-producao-ads-2026-10-01`, `test-ads-self-serve-2026-09-24`
- `test-kineo1-diretor-ve-2026-09-28`, `test-kineo1-imagem-v2-2026-09-28`, `test-coerencia-kineo1-2026-09-16`, `test-diretor-kineo-2026-09-23`
- `test-fala-x-imagem-2026-09-16`, `test-visual-contract-2026-09-11`, `test-vigia-palavras-por-cena-2026-09-11`
- `test-episodio2-memoria-2026-09-06`, `test-serie-memoria-2026-09-04`, `test-primeiro-episodio-pronto`, `test-temporada`, `test-pacote-publicacao`
- `test-support/desfaz-motor-15s-1510`

**Instrumentação a ligar antes do A/B** (as amostras mostraram que faltam):

- [ ] Gravar `persona_id`, `voice` e `speed` em `render_delivered_measured`. Hoje vêm nulos em 100% das linhas, e sem isso a régua por voz só pode ser estimada.
- [ ] Gravar o hash e os primeiros 300 caracteres da ideia original em `generation_attempt_opened`. Hoje só fica o roteiro já escrito (`topic_hint` de 90 caracteres).

### 5.3 Banco de testes A/B (offline, sem tocar produção)

Um script por eixo em `scripts/ab-migracao-openai/`. Todos leem as amostras de `scripts/fixtures/migracao-openai/` e gravam o resultado em `scripts/fixtures/migracao-openai/resultados/<eixo>-<data>.json`.

Regras comuns:
- Sem chave, o script não roda.
- Primeiro roda um ensaio a US$ 0, que só monta as requisições e estima o custo.
- A execução paga exige `--pagar` **e** um teto `--teto-usd`.
- Nada importa rota do app: a chamada ao modelo é refeita com os mesmos prompts, extraídos dos arquivos por `readFileSync`, como fazem os guardiões.

**Texto** (`ab-texto.mjs`, fase 2a, ~US$ 15–25):

- Modelos: `gpt-4o` e `gpt-4o-mini` (linha de base), `gpt-6-luna` com effort `none` e `low`, e `gpt-6.1-sol`.
- Casos: `roteirista.json` (36) × 3 repetições, `analyze-idea.json` (20) e `ads-plan.json` (7) × 3.
- Medidas por caso:
  - JSON parseável;
  - palavras contra a régua do motor (classic 3,1 pal/s; hollywood 2,3; Seedance 15 s 36–41);
  - nº de cenas contra o pedido;
  - nomes e números da entrada preservados. Usar os defeitos reais como teste negativo: "Days, Jesus fasted" e "the of Versailles";
  - instrução **não** narrada ("No leas estas instrucciones", "Juste l'histoire");
  - latência p50/p95, tokens e custo.
- Diferenças de parâmetro a testar em cada modelo novo: `max_tokens` × `max_completion_tokens`, `temperature`, `response_format: json_object` × `json_schema`.
- Critério de aprovação, por papel:
  - JSON ≥ 99 %;
  - palavras dentro da régua em ≥ 90 % (acima do alvo é aceito, abaixo não);
  - p95 abaixo do timeout da rota (35 s no escritor);
  - zero instrução narrada nas amostras.

**Voz** (`ab-voz.mjs`, fase 2b, ~US$ 30–40):

- Provedores: tts-1-hd (linha de base), MiniMax speech-2.8-hd (`voice_id`/`speed`/`emotion` por persona) e ElevenLabs.
- Casos: `narracoes.json` (45). As 7 personas cobertas mais `conspiracy` e `futuristic-ai`, sintetizadas a partir de 3 narrações en/pt/es.
- Medidas:
  - pal/s pela duração real do MP3 (leitor de quadros do compose para MP3; `duration_ms` da MiniMax como conferência);
  - desvio contra a tabela da seção 2.2;
  - MP3 compatível com o byte-concat por seção;
  - nota de timbre do fundador (planilha 1–5 por persona).
- Calibração: para cada persona, buscar o `speed` da MiniMax que deixa o pal/s a ±5 % do tts-1-hd medido aqui. Gravar a tabela (provedor, voz, speed) → pal/s, que vira o guardião nº 2 da seção 4.1.

**Legendas** (`ab-legendas.mjs`, fase 2b, custo desprezível):

- Áudio: o MP3 da linha de base de `legendas.json` (11), gerado no `ab-voz` (nenhuma mídia de cliente é baixada).
- Candidatos: whisper-1 (base), gpt-transcribe (`verbose_json`/`word`, se existir), Whisper na fal com tempo por palavra e alinhamento forçado com o texto conhecido.
- Medidas:
  - existe tempo por palavra;
  - drift contra o whisper-1 abaixo de 150 ms na mediana e abaixo de 400 ms no p95;
  - grafia do roteiro preservada (números, aspas, RTL, devanágari, chinês no meio do inglês);
  - nenhuma palavra traduzida.
