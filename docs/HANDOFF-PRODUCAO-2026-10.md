# HANDOFF — Produção no Ads + conserto da Estrela (01/10/2026)

**Branch:** `codex/producao-ads-2026-10` (nasce de `origin/main` ea7b95d1). **Não publicada** — o Claude local revisa, testa com render real e publica.
**Regra respeitada:** nenhum push na `main`, nenhum render pago (fal, Creatomate, Avatar). Testes só com guardiões de `readFileSync` + transpile e mutantes.

## Commits (do mais antigo ao mais novo)

| SHA | O quê |
|---|---|
| 95c80231 | **Tarefa 0 — Estrela do filme**: o compose soma a sobretaxa ASSINADA no claim (38+6=44) [TRAVA 8.2] |
| 05c74821 | Clips: a imagem gerada da própria conta (`renders/images/<uid>/`) também vira clipe |
| 9ff5a737 | Produção: régua pura (`lib/ads/producao.ts`) + voz feminina/masculina no avatar sem o truque do `[Pexels:]` |
| 8124d13e | Produção: rotas `/api/ads/producao/plan` e `/api/ads/producao/montage` |
| 2e01dc10 | Produção: tela `/ads/producao` no formato kps + guardião |
| f0bb36c8 | Produção: atalho no `/ads/v2` para quem vê a Produção |
| (este) | este relatório |

## Tarefa 0 — "Estrela do filme" morria na montagem

**Causa:** o claim do filme cobra filme + sobretaxa (Kling 3 a 15 s: 38 + 6 = 44) e o `/api/compose` comparava o custo do claim só com o preço do filme (38) → "These AI clips do not match their signed generation".

**Conserto (só linhas marcadas `KINEO-ESTRELA-SOBRETAXA-ASSINADA-2026-10-01`, acrescentadas):**
- `app/api/generate-video-cinematic/route.ts` — `publishCinematicResponse` grava `estrela_sobretaxa_cr = estrelaSobretaxaDe(duracaoCobrada)` (o MESMO número que entrou no `cost`) na resposta do claim, que é coberta por hash + assinatura do servidor. Sem estrela, nada entra: resposta e hash de sempre.
- `lib/estrelaDoFilme.ts` — `sobretaxaAssinadaDaEstrela(response, creditCost)`: lê o campo; texto, fração, negativo, zero ou ≥ custo = 0 (falha fechada → a conferência dura volta e recusa, como antes).
- `app/api/compose/route.ts` — as DUAS conferências de preço somam esse número: a regra dura e a ponte do degrau (claim assinado em duração menor que o botão). Nunca lê do corpo, nunca recalcula.
- Retiradas as linhas marcadas, as duas rotas voltam à base byte a byte (provado no guardião).
- `ESTRELA_PUBLIC` continua `false`.

**Guardião:** `scripts/test-estrela-sobretaxa-assinada-2026-10-01.mjs` (27 verificações). Extrai as duas condições do compose e as EXECUTA: na base o caso 38+6=44 é recusado (reproduz o defeito); no novo passa; 44 sem sobretaxa assinada, sobretaxa que não fecha (5≠6), clipe trocado e qualidade trocada continuam recusados; sem estrela a regra nova decide igual à base em 480 combinações; o degrau com estrela desce para a duração assinada e nunca estica.
**Reancorados com motivo:** `test-veo-marcado` e `test-veo-modo-ia` (retiram a marca nova antes do byte a byte), `test-quality-route-integration` (executa o publicador com e sem estrela e prova o campo).
**Limite conhecido:** filme com estrela cujo claim nasceu ANTES do deploy não tem o campo e continua sendo recusado no compose (o resgate do servidor monta). Só contas da casa usam a Estrela hoje.

## Produção (`/ads/producao`)

O fluxo que o fundador fez à mão em 01/10, como produto. Formato kps (quadro à esquerda, palco à direita, cor do Ads), textos em inglês com `UiLabel`, só contas da casa (`PRODUCAO_PUBLIC = false`, lista EXATA do Ads `isAdsInternalEmail`).

**Topo — modelos prontos:** Testimonial (UGC) · Brand mascot · Your app on the phone. Cada um muda o tipo de personagem, a pista do planejador, o exemplo da ideia e traz 3–5 planos de reserva.

**Passos (o preço aparece no botão, antes do clique):**
1. **Personagem** — mulher/homem/mascote. "Create with AI · 5 cr" (Nano Banana Pro) ou "Use a photo · free" (só com a caixa de autorização marcada; `/api/images/reference`, moderado). "Save character · free" grava em `/api/characters`; "My characters" reusa (a imagem salva vira referência de novo).
2. **Ideia → planos** — `/api/ads/producao/plan` (grátis, teto 40/dia, gpt-4o-mini JSON) devolve 3–5 planos: título, prompt de imagem em inglês, movimento, clipe ou fala (com a fala na língua escolhida: pt/en/es). Foto opcional de produto/app vira 2ª referência. Planejador fora do ar = planos do modelo (`source:'fallback'`, a tela avisa). Tudo editável; reordenar ↑↓; até 5.
3. **Prévia das cenas** — SÓ imagens: "Generate N images · 5N cr", com a referência do personagem e o prompt "This exact woman/man/character, same face, hair and outfit as in the first reference image. …". Aprovar / "Redo · 5 cr" por plano. Nenhum vídeo antes disso.
4. **Dar vida** — cada plano aprovado: **clipe** (`/api/clips`, motor e duração do catálogo real com o preço do próprio GET) ou **fala para a câmera** (`/api/generate-avatar`, fabric, 110 cr, voz **Female/Male**, língua pt/en/es, aviso vermelho abaixo de 12 s de fala estimada; a rota é quem mede e recusa sem cobrar).
5. **Montar** — narração opcional (`/api/audio/generate`, MiniMax Speech 2.8 HD, 2 cr/1.000 caracteres), slogan, linha de apoio, cartão claro/escuro, aviso se a conta não tem logo. "Assemble N shots" → `/api/ads/producao/montage`. Botão mostra "Montage: price to be set — free while in preview".

**Montagem (Creatomate, `buildProducaoMontageSource`):** MP4 1080×1920, 30 fps; planos na ordem escolhida alternando faixas 2/3 com fade de 0,4 s; clipes mudos; a fala do avatar (mp3 do claim) entra no MESMO instante e com a MESMA duração do plano; a narração toca só sobre os clipes antes da 1ª fala (nunca duas vozes); cartão final de 3 s com o logo da conta em tela cheia (`fit: contain`, 84%), slogan e linha de apoio. Só propriedades que os montadores da casa já usam (sem `color_filter`, `playback_rate`, vinheta).
**Segurança da montagem:** o navegador manda IDs, nunca URL: clipe = linha `clips` da conta com `status = done`; fala = claim ASSINADO do avatar (`loadPrepaidAvatarClaimForGeneration`: pago, completo, URL do vídeo e mp3 ligados); narração = linha `audios` da conta em `renders/audio/<uid>/`; logo = `findBrandLogoUrl`. O GET só responde a quem enviou (evento `producao_montage_submitted`, que entrou em `SERVER_ONLY_EVENTS` junto com `producao_plan_created`). Pronto = cópia no nosso storage (`producao-<render_id>`).

**Mudanças em peças existentes (costura, não reescrita):**
- `lib/clips/clipCatalog.ts` `ownedClipImageUrl` aceita também `renders/images/<uid>/` (a imagem gerada da própria conta). Outra conta, pasta que só começa com o uid, `..`, query e outras pastas continuam recusadas (guardião `test-clipes` ampliado). O Espaços não precisa mais reenviar a imagem pelo `/api/avatar/upload` (não mexi no Espaços).
- `app/api/generate-avatar/route.ts` aceita `voiceGender: 'female' | 'male'` → OpenAI tts-1-hd `nova`/`onyx` direto (como o `/api/ads/voice`), depois da voz clonada e antes do caminho de sempre. Sem o campo nada muda; a impressão digital só ganha a chave quando a voz é escolhida (mesmo hash de antes).
- `/ads/v2` mostra "New: Production — …" só para quem vê a Produção.

**Guardião:** `scripts/test-producao-ads-2026-10-01.mjs` (58 verificações): executa a régua e a montagem (tempos, transição, fala alinhada, narração cortada na 1ª fala, cartão, logo, recusas), confere os espelhos de preço contra as rotas (imagem 5, avatar 110, piso 12 s, narração 2/1k), a ordem das portas, a resolução das peças no banco, eventos só de servidor, e a tela (5 passos na ordem, custo em cada botão, modelos no topo, selo honesto).
**Mutantes rodados (13, todos ficaram vermelhos):** transição sem sobreposição, fala fora do plano, narração por cima da fala, interruptor ligado, clipe sem `user_id`, GET sem a prova de dono, voz sempre no hash, preço do avatar trocado, as 2 linhas do compose da Estrela, sobretaxa pela duração errada, régua da sobretaxa sem teto, pasta de imagem larga no clips.

## Suíte inteira (node em cada `scripts/test-*.mjs`, 180 s cada) — base × branch

| | guardiões | verdes | vermelhos |
|---|---|---|---|
| base `origin/main` ea7b95d1 | 741 | 600 | 141 |
| branch (f0bb36c8, antes deste relatório) | 743 | 602 | 141 |

Comparado por NOME: **nenhum guardião mudou de cor**. Os 2 a mais são os novos (`test-estrela-sobretaxa-assinada-2026-10-01`, `test-producao-ads-2026-10-01`), ambos verdes. Os 141 vermelhos são os mesmos da base (herdados), e nenhum estourou o tempo. `tsc --noEmit`: 0 erros.

Reancorados, com o motivo escrito no próprio arquivo:
- `test-veo-marcado`, `test-veo-modo-ia` e `test-quality-route-integration` (Tarefa 0).
- `test-clipes` (ampliado).
- `test-ads-v2-virada` (prop opcional).
- `test-moderacao` (26 importadores).

`test-memoria-episodio` fica vermelho só enquanto há diff NÃO commitado em `app/api/generate-video-*` (ele lê `git diff HEAD`). Depois do commit volta a verde.

## O que falta / riscos

1. **Render real** (Claude local, um passo por vez, só conta da casa): personagem por IA (5 cr) → planejar → 3 imagens (15 cr) → 1 clipe Kling 2.5 5 s (5 cr) + 1 fala feminina pt de ~40 palavras (110 cr) → montar com logo. Conferir quadro a quadro: transição, fala sincronizada no plano certo, cartão final com o logo inteiro.
2. **Preço da montagem**: `PRODUCAO_MONTAGE_CREDITS = null`. Custo real de referência ~US$0,13 por 15 s (lib/ads/v2Tiers). Com a Produção aberta e o preço null a rota responde 403 `price_not_set` (o guardião também recusa abrir com preço null). Quando o fundador decidir, falta escrever o débito/estorno da montagem (padrão `lib/ads/v2Billing.ts`).
3. **Mascote falando**: o upload do avatar confere rosto (`faceVisible`); mascote 3D pode ser recusado (422, sem cobrança). Saída: usar o plano como clipe.
4. **Vídeo do avatar fica na URL da fal** (como no Avatar de sempre); montar logo depois de pronto. Não há cópia para o nosso storage antes da montagem.
5. **Biblioteca**: a montagem não cria linha em `videos` (igual ao Espaços) — o MP4 fica no storage e na tela; não aparece em /library.
6. **Traduções**: os textos novos passam por `UiLabel`, mas não estão no corpus das 16 línguas (exige entrada em `lib/ui/interfaceLabels.ts` e as mesmas chaves nos 13 dicionários) — aparecem em inglês em todas as línguas.
7. **Narração sem duração na linha `audios`**: a rota usa a medida do navegador (1–120 s) só para o tempo na linha do tempo; o arquivo continua conferido por dono.

## Achados de passagem (não mexi — fora do escopo)

- `spaces_montage_submitted` **não** está em `SERVER_ONLY_EVENTS`: o navegador pode cunhar a "prova de dono" de um render_id alheio no GET do Espaços (precisa adivinhar o id). Conserto de 1 linha.
- `sweepAbandonedAvatarDebits` (lib/credits/refund.ts) fatia `avatar-<claimId>` como se fosse `avatar-<requestId>`: a busca do claim nunca casa e a varredura não estorna nada. Hoje é inerte (não estorna à toa, mas também não salva quem fechou a aba num avatar falho).

## Perguntas para o fundador

1. **Preço da montagem da Produção**: grátis (as peças já cobram), um número fixo (ex.: 2 cr) ou por segundo? Até decidir, só a casa usa.
2. **Abrir a Produção** (`PRODUCAO_PUBLIC = true`) depois do render real aprovado?
3. **Fala para a câmera a 110 cr** (fabric, qualquer duração até 60 s): manter, ou oferecer o Presenter (70 cr) como opção mais barata?
4. **O MP4 final deve entrar na Biblioteca** (/library) como os filmes?
5. **Traduzir a tela** para pt/es já (entra no corpus das 16 línguas)?
