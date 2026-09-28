# CENA-CLASSICA-RETENTATIVA — 28/09/2026

Branch `codex/cinematico-retentativa-0928` (base origin/main 22c8e70e). Três commits, nesta ordem:

1. **parte 1 (inerte, sobe sozinha)** — `/api/retry-hollywood-scene` aceita Seedance 1.5, Kling 2.5 e
   Veo 3.1 (t2v e i2v) e, para eles, reenvia o payload ASSINADO que a fal já aceitou — e, desde a revisão
   adversarial de 27/09, nunca prende o filme (seção no fim): a retomada clássica solta o mutex no desfecho
   ambíguo, e o compose e o cron de resgate desfazem o que sobrar de hold clássico.
2. **docs** — este arquivo e docs/CANARIOS-MOTORES-2026-09-28.md (roteiros, ensaio de $0, orçamento).
3. **[TRAVA 8.2]** — `app/api/generate-video-cinematic/route.ts`: o caminho clássico grava o payload de
   cada cena e a resposta passa a levar `scene_prompts`, `scene_fal_inputs` e `fal_models`; e a cena
   Omni sem imagem ganha uma 2ª chance antes de cair no Kling v3, agora com evento. **Só sobe com a
   palavra do fundador.**

## O que muda para o cliente

Hoje, quando uma cena de Seedance 1.5 / Kling 2.5 / Veo 3.1 falha ou trava na fal, o filme sai com uma
cena a menos (cobrado inteiro) ou morre no prazo de 50 min e é estornado. Os motores de voz própria
(Kling 3, H3, Omni, S25) já refaziam a cena em 2 rodadas; os clássicos — que fazem 100 % das primeiras
impressões — não tinham nenhuma. Depois da parte 3: a cena clássica que falha é refeita até 2 vezes
(1ª idêntica, 2ª com o texto visual suavizado para a moderação), e o filme sai inteiro.

Casos reais: 3ab8128c (conta externa vinda do TAAFT, Seedance 60 s, 16/09) — 7/7 cenas aceitas, 6
prontas, a 7ª nunca voltou; morreu no prazo e os 25 cr voltaram. d6e8e8b3 (fundador, 15/09) — saiu com
6 de 7 cenas, sem retentativa. 14 dias: Seedance 5 parciais em 49 claims, Veo 1/6, Kling 2.5 0/5.

## Como funciona

- A rota de geração grava, cena a cena, o payload exato que foi à fal (`classicSceneInputs`), antes de
  cada POST: a despachante para no primeiro aceite, então o último gravado é o aceito — no mesmo modelo
  que o claim assina (i2v com o still, ou t2v depois de recusa, ou o prompt neutro depois de moderação).
- A resposta assinada (HMAC + hash) carrega `scene_fal_inputs`; `scene_prompts` abre o portão de
  retomada do cliente; `fal_models` vai sempre (antes só com âncora).
- `/api/retry-hollywood-scene` confere o payload (objeto; prompt 20–6000 caracteres; i2v só com
  image_url https; t2v sem image_url), reenvia byte a byte na 1ª rodada e troca SÓ o prompt na 2ª.
  Mutex, prova de falha terminal assinada e retarget são os de sempre; nenhum 2º POST pago para a mesma
  cena falhada depois de resposta ambígua (registro `classic_scene_retry_attempt`) — mas, ao contrário da
  família hollywood, a ambiguidade SOLTA o mutex e o filme segue com as cenas prontas (seção no fim). O evento `hollywood_scene_retried` ganha `metadata.family` (`classic`|`hollywood`)
  e reinicia o relógio da cena presa.
- Compose e cron de resgate não leem os campos novos: o cliente só manda `scene_*` ao compose nas
  qualidades hollywood, o compose só extrai `scene_captions` do claim clássico, e o cron só usa `scene_*`
  quando há `scene_engines`. O que os dois ganharam é só o desfazer do hold clássico (seção no fim).
- Omni: o fal só tem Omni em image-to-video. Quando o still da cena falha, ele ganha uma 2ª chance de
  15 s (teto de 45 s por filme, a rota tem 300 s); se falhar de novo e o filme tem âncoras, a cena anima
  o still de ambiente (já pago); só então o Kling v3 — agora com `omni_scene_kling_fallback`
  `{scene_index, reason: still_failed|no_anchors}`. Antes, 2 de 11 cenas do e7918140 viraram Kling sem
  nenhum registro.
- Seedance 2.5: nenhum código. As falhas medidas eram o poller (lista de modelos, consertada em
  d5198370). Nada de retentar 5xx no envio: 5xx é ambíguo e poderia cobrar duas vezes.

## Custo

Cada rodada refaz UMA cena na fal, sem cobrar crédito do cliente: Seedance ~$0,21 por cena de 8 s,
Kling 2.5 ~$0,70 por clipe de 10 s, Veo ~$0,80 por clipe de 8 s. No máximo 2 rodadas por cena falha.
Com o volume medido (1 parcial externo clássico em 14 dias), o custo extra é de centavos por semana.

## Prova

`node scripts/test-cena-classica-retentativa-2026-09-28.mjs` — executa o ALLOWED e o signedClassic
reais, o POST real da retomada (loader offline, HMAC real), o submit clássico real pela despachante
real, o objeto de resposta real, a cadeia geração → retomada → portão do cliente, o
signedSceneMetadata real do compose e o bloco Omni real em 7 cenários; mutantes pegos. Regressão: os
204 guardiões que citam os arquivos tocados ficam com o mesmo resultado da origin/main.

Revisão adversarial (seção abaixo), no mesmo guardião: o POST real com 503/408/transporte/sem id/POST
pendurado, recusa explícita, liberação e retarget falhando 1 e 2 vezes, a aquisição REAL do compose
(`claimGenerationSubmission`) e o ramo real do hold, a régua da lib, a condição real do cron e o controle
hollywood (continua segurando). 16 mutantes de fonte rodados à mão, todos pegos — entre eles a rota de antes,
que devolve o 422 `scene_retry_unresolved` do relato.

## Como medir no ar

```sql
select metadata->>'family' familia, metadata->>'model' modelo, count(*)
from events where name = 'hollywood_scene_retried' and created_at > '<deploy do [TRAVA 8.2]>'
group by 1, 2;
select metadata->>'reason' motivo, count(*) from events where name = 'omni_scene_kling_fallback' group by 1;
-- revisão adversarial: quantas retomadas clássicas ficaram ambíguas e quantos holds o compose desfez
select name, metadata->>'phase' fase, count(*) from events
where name in ('classic_scene_retry_unconfirmed', 'classic_scene_retry_hold_cleared') group by 1, 2;
```

## Revisão adversarial (27/09): a cena clássica nunca prende o filme

**O defeito.** A retomada clássica herdou da família hollywood a regra "fornecedor ambíguo = segura o mutex do
compose até alguém confirmar". A revisão rodou o POST real num claim Seedance i2v assinado (1 de 2 cenas pronta) com a
fal respondendo 503: a rota devolveu 422 `scene_retry_unresolved` e deixou o mutex preso em `ambiguous`. Daí em diante o
compose respondia 422 "Contact support" a cada tentativa, o cron de resgate lia a linha como "a pessoa compôs sozinha" e
o refund-sweep a lia como ambígua — filme nunca entregue e 25 cr nunca devolvidos. Erro de transporte, resposta sem id,
retarget ou liberação que falham e lambda morta no meio davam o mesmo. Na origin/main esse filme saía com N-1 cenas.
(Frequência: 0 envios ambíguos em 1.669 POSTs de nascimento em 30 dias — mas a retomada dispara justamente quando a fal
está mal, e estes são os motores das primeiras impressões.)

**O conserto (só na família clássica; hollywood continua segurando).**
- Antes de qualquer gasto, um registro `classic_scene_retry_attempt` de id determinístico (usuário, geração, cena,
  request antigo): uma 2ª chamada para a MESMA cena falhada colide e recebe 409, sem OpenAI e sem POST. Recusa explícita
  da fal (nenhum job existe) devolve o registro, e a 2ª rodada suavizada continua valendo.
- Desfecho ambíguo (408/5xx/transporte/sem id/prazo de 25 s no POST) ou retarget que falha duas vezes (o retarget é
  idempotente, a 2ª chamada confirma uma 1ª que gravou sem responder): o registro fica, o mutex é SOLTO (2 tentativas),
  a resposta é 502 e o evento `classic_scene_retry_unconfirmed` guarda o job possivelmente órfão. A cena segue falhada
  no claim e o compose monta com as prontas. Custo máximo: um job órfão na fal.
- Aceito e retargetado mas a liberação falha duas vezes: resposta de sucesso (o cliente acompanha a cena nova), fase
  `release_unconfirmed` anotada.
- O que sobrar de hold clássico (liberação que falhou duas vezes, ou lambda morta com o marcador `submitting` com mais de
  120 s) o **compose** desfaz: apaga só a linha do mutex (dono e assinatura conferidos), grava
  `classic_scene_retry_hold_cleared` e responde 409 pendente; a chamada seguinte monta. O **cron de resgate** deixa de
  contar essa linha como "a pessoa compôs sozinha" e chega ao compose por ele.
- Prazos: a retomada ganhou `maxDuration = 60` (antes herdava o padrão da plataforma), a OpenAI da rodada suavizada 20 s
  sem retentativa (antes 20 s × 2) e o POST clássico 25 s. Um `submitting` com mais de 120 s é de lambda morta.
- Régua única em `lib/classicSceneRetry.ts` (pura): os 6 ids clássicos (espelho de `cinematic-clip-status`), a janela
  de 120 s e os predicados que a retomada, o compose e o cron usam.

**Resíduo conhecido.** Enquanto um hold clássico não é desfeito (entre a falha dupla de liberação e a próxima chamada do
compose ou do cron), `/api/compose/active` ainda mostra "precisa de confirmação" a quem reabrir a página; o cron de 5 em 5
min resolve e o e-mail de pronto chega. Hollywood segue com o hold de sempre, de propósito.
