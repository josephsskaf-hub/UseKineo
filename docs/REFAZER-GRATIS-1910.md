# Refazemos 1× de graça — 19/10 (KINEO-META95-REFAZER-1910)

Decisão do fundador (19/10): os 3 carros-chefes (Filmes, Ads, UGC) ganham **uma refação grátis**. Arcads, Higgsfield e
HeyGen cobram cada refação; para nós é diferencial. Custo do estudo: ~US$ 0,17 por troca.

## Filmes — "Refazer uma cena (grátis, 1×)" (entregue)

Onde aparece: no cartão do filme pronto em **/library** e **/history** (mesmo componente `HistoryClient`), para filmes
dos motores clássicos — **Seedance 1.5, Kling 2.5 e Veo 3.1** — montados a partir de 19/10.

Como funciona:
1. O `/api/compose` passou a guardar, para todo filme clássico, o RenderScript EXATO que foi ao Creatomate, assinado com
   HMAC (evento `free_redo_film_source`). Sem a assinatura ninguém fabrica um roteiro de montagem para a rota remontar.
2. A pessoa escolhe a cena. O servidor pega no claim de nascimento assinado o payload que a fal aceitou para aquela cena
   (`scene_fal_inputs[i]`): mesmo motor, duração, quadro e âncora; só o prompt ganha "Alternate take…" (e semente nova
   quando o motor tem semente). A fala não mora no clipe, então a narração é a mesma.
3. Cena pronta → troca a URL do clipe no RenderScript (todas as ocorrências) → Creatomate. Sem TTS, Whisper, música nova,
   claim de compose ou `render_jobs`: o `/api/compose/status` nem conhece este render, não há por onde cobrar.
4. Pronto → linha NOVA em `videos` (`credits_used 0`, título " · v2"). A versão original fica intacta na biblioteca.

Regras (o servidor decide; o cliente só manda `videoId` + `sceneIndex`):
- só o dono; free e trial também têm direito;
- 1× por filme: linha-trava `free_redo_film_order` com id determinístico por filme (a PK barra duplo clique e corrida);
- falhou? a vez volta: recusa explícita da fal não gasta tentativa; envio ambíguo gasta; no máximo 2 tentativas;
- **teto global de 200 refações grátis por dia** (Filmes + Ads + UGC), em vagas `free_redo_cap_slot` com id
  determinístico por dia — nunca existem mais que 200, e linha forjada pelo navegador não ocupa vaga;
- nenhum débito, nenhuma mudança de preço ou de crédito de plano.

Eventos: `free_redo_requested`, `free_redo_delivered`, `free_redo_failed` (produto, motor, qualidade, cena, custo estimado).

Rota: `GET /api/free-redo/film?videoId=…[&lite=1]` (estado + cenas; é a consulta que faz a refação andar) e
`POST /api/free-redo/film { videoId, sceneIndex }`. Migration: **nenhuma** (tudo em `events`, como a versão B sem legenda).

Fora desta entrega (Filmes):
- Kling 3 / MiniMax H3 / H3 Max / Omni / Seedance 2.5 (família hollywood): a fala é gerada DENTRO do clipe (voz própria),
  trocar a cena muda o áudio e o sincronismo; e a cena custa 5–10× mais. Precisa de decisão de preço/teto antes.
- Kineo 1 (stock Pixabay): não passa pelo claim; a troca seria re-escolher o stock da cena no `fast_compose_recoverable`.
- Filmes montados antes deste deploy: não têm o RenderScript guardado (o botão não aparece).
- Tela de resultado do Studio (`GenerateClient`/`FilmReadyExits`): o botão mora na biblioteca; os guardiões renderizam
  `FilmReadyExits` com imports fechados — entra numa rodada própria.
- Sem cron: se a pessoa fechar a aba no meio, a refação anda quando ela voltar à biblioteca (o botão consulta sozinho).

## Ads e UGC — "Refazer grátis (1×)" do anúncio inteiro (plano, não entregue)

Hoje existe a 1ª refação grátis POR CENA (`lib/ads/v2FreeRedo.ts`, `/api/ads/v2/retake`), mas ela nunca aparece nos dois
formatos novos: o Close real e o Apresentador v2 viram planos `text`, e `canRedoShot`/retake recusam `text`/`presenter`.

Plano (na ordem):
1. Rota nova `POST /api/ads/v2/redo-free { order_id }` com os mesmos portões do retake (`posEntregaAuth`, dono = `uid`),
   pedido original `delivered`, não amostra (`isAdsSampleRef`), Close real (`adsV2CloseRealOf`) ou Apresentador v2.
2. Id do pedido novo `deterministicUuid('adsv2-free-full:' + parent.id)` — a PK faz "1× por pedido" e o duplo clique
   devolve a mesma linha. `parent_order_id` NULO (senão consome a refação grátis por cena e cai no `retake_rows_missing`),
   com o vínculo em `brief.free_redo_of` + evento.
3. Copiar do pai fotos/brief/tier/seconds/plan (o mesmo pedido), limpar `voice_url`/`music_url` para nascer um take
   novo, `billing_ref = adsV2RetakeRef(id)`, `credits_charged 0`, e iniciar pelo caminho de débito zero que a amostra já
   usa em `v2StartCore` (sem `chargeAdsV2`, que recusa custo 0). Vaga do teto diário: `reservarVagaDoDia(…, product:'ads'|'ugc')`.
4. `status` devolve `free_full_redo: true` quando cabe; botão "Refazer grátis (1×)" em `AdsV2Simple` (fase delivered),
   16 línguas no padrão `ADS_V2_REDO_COPY`.
5. Eventos `free_redo_requested/delivered/failed` com `product: 'ads' | 'ugc'` — e os nomes entram em `lib/ads/events.ts`
   (`ADS_EVENTS`, `ADS_SERVER_ONLY_EVENTS`) e no `SERVER_ONLY_EVENTS` do `/api/events`.

Por que ficou para a próxima rodada: `v2Billing.ts`, `v2Tiers.ts`, `v2PlanCore.ts`, `v2StartCore.ts`, `v2Advance.ts` e a
rota do start são vigiados por 6+ guardiões que proíbem mexer neles (close-real D2, close-real-ajuste R2, close-real-v3,
apresentador-v2-libera, juiz-grade) e `AdsV2Simple.tsx`/`events.ts` comparam byte a byte com contagem fixa
(`ADS_EVENTS.length === 58`). Fazer direito pede reancorar essa cadeia numa entrega dedicada.
