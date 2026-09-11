# VIGIA DOS MOTORES — 11/09/2026 (15:00–20:30 BRT)

Missão do fundador (14h): "fique de alerta nas próximas 4-5 horas; quando as pessoas
fizerem vídeos, olhe se está bom e dê uma nota; nos motores mais caros ainda faltam
coisas encaixar; veja se todos os motores estão 100%, se a fala sai, se 90 s
funciona, se as plataformas/formatos que a pessoa seleciona são respeitados".

Regras desta vigília: banco só leitura (projeto cqqukkvjjrguayiyjvhh), zero render
pago, zero contato, zero notificação. Nota por filme (0-10) com 8 critérios fixos;
entrega (a) e fala (d) pesam 2×. Contas internas (josephsskaf/usekineo/kineo.local)
não recebem nota, só entram no retrato dos motores.

---

## Rotação 1 — 15:30 BRT (18:30 UTC) · branch codex/vigia-motores-1530 · base 26dd32a4

### Filmes de contas externas desde 14:30 UTC (11:30 BRT)

| id | motor | pessoa | pedido | saiu | fal | cadastro→filme | nota |
|---|---|---|---|---|---|---|---|
| 597f8237 | Seedance 1.5 (cinematic_ai) | conta nova via ChatGPT (push63_niche_horror), trial 30cr | 35 s · 9:16 (padrão) | 36 s · completed · URL ok · 15cr | 4/4 aceitas · 4 POSTs · 200×4 · deploy 26dd32a4 | 4 min 33 s | **9,0** |

Critérios do 597f8237: (a) entregou 10 · (b) 36 ≥ 35 → 10 · (c) formato: prompts
trazem "9:16 vertical framing", mas o quadro PEDIDO não existia em evento nenhum
(ver conserto abaixo) → 9 · (d) fala: caminho clássico (TTS por fora, visual_mode
documentary_faceless), nenhum verbo de fala nos 240 chars visíveis de cada prompt
→ 9 · (e) silêncio: 93 palavras ÷ 3,1 = 30 s de voz num filme de 36 s (≈6 s só de
música; a régua clássica pede 100-115 palavras para 35 s; a régua de silêncio nova
só cobre o caminho hollywood) → 8 · (f) tema: **2 das 4 cenas fora do roteiro** —
cena 3 (fala "police searched his apartment") recebeu "vintage security camera at
the entrance of the **Amityville House**… infamous paranormal events" (o gerador
de prompt visual injetou uma casa mal-assombrada real; contrato_cena marcou
`sem_ancora_comum`/genérica), cena 4 (fala "hidden room covered in photos")
recebeu "mirror reflecting a dark figure"; cenas 1-2 mostram casa suburbana
(história diz apartamento) → 5 · (g) fal 4/4, sem "falling back" → 10 · (h) 4,5 min
→ 10. Ponderado: (20+10+9+18+8+5+10+10)/10 = **9,0**. O que o espectador sente: um
Short coeso e no tempo, com duas cenas que não ilustram o que a voz diz.

Contas internas no mesmo intervalo (sem nota): fundador rodou Kling 3 "Tomás, o
faroleiro" às 11:53 BRT (deploy 679b789c, ANTES do d4d89499) → 60 s entregue,
150cr, 8/8 cenas — cena 1 ainda com "He begins speaking about his past" no prompt
de apoio (exatamente o que o d4d89499 removeu depois); dry-runs de $0 às 12:27,
12:28 (×3) e 13:51 (×2) em hollywood/omni/h3 sobre os deploys d4d89499 e
baecab96 (planned 0, http 200, nada pago). Nenhuma falha de cliente na janela.

### Retrato dos motores (1ª rotação)

| motor | último filme entregue | última falha (causa) | 90 s | formato | voz | quebrado / a encaixar |
|---|---|---|---|---|---|---|
| Kineo 1 (fast) | 11/09 13:15 UTC · 93 em 7d · max 90 s | 11/09 11:23 broll_plan_threw_autopilot "Failed to fetch" (rede do cliente, 1 pessoa) | sim (SUPPORTED 35/45/60/90) | 9:16 cravado em lib/fastAiHook.ts:57 (Kineo 1 não recebe `aspect`) | TTS | — |
| Seedance 1.5 (cinematic_ai) | 11/09 17:58 UTC · 62 em 7d · max 84 s | 11/09 09:02 cinematic_dispatch_not_ok 409 "generation id belongs to a different cinematic request" (1 pessoa, ChatGPT) | sim (clipCount ≤ 9 × 9 s) | aspect_ratio: frame.falAspectRatio | TTS por fora | provider_abandoned_refunded: 14 claims / 12 pessoas em 15 dias (8% de 163) — pessoa fecha a aba e o servidor não termina |
| Kling 2.5 (cinematic_kling) | 11/09 09:30 UTC (externo, alwalidbasem; stranded finisher compôs) · 2 em 7d | nenhuma em 3d | sim | idem | TTS | — |
| Veo 3.1 (cinematic_veo) | 08/09 22:36 UTC · 4 em 7d · max 79 s | nenhuma em 3d | sim (cena ≤ 8 s) | idem | TTS | sem uso externo em 7d |
| Kling 3 (cinematic_hollywood) | 11/09 15:01 UTC (fundador) · 2 em 7d · 60 s | 11/09 14:41 narration_too_short (fundador, 35 s de fala p/ 60 s) | sim: hollywoodTarget = min(90)+8 → plano de 98 s | aspect_ratio no buildFalInput; **retry de cena crava '9:16'** (app/api/retry-hollywood-scene/route.ts:57,60,65) | host (TTS na boca via Avatar v2) desde 6b3384af — **0 filmes pagos depois do d4d89499** | ledger zerado (ver conserto) |
| MiniMax H3 (cinematic_h3) | **27/08 01:55 UTC — 15 dias sem entrega**; 11 em 30d | 11/09 09:22 UTC walidbasempayments (JO): 6 cenas submetidas (27cr = trial inteiro), cliente esperou **51 min** em fal_polling, foi embora; stranded finisher não compôs (sem stranded_outcome); refund-sweep estornou às 11:30 `cinematic_abandoned_no_delivery` | sim (cap 12/15) | idem hollywood | O3 nativo / host | causa da não-entrega DESCONHECIDA (sem chave fal local para ler o status das 6 cenas; a rota de status não logou erro) |
| Omni Flash (cinematic_omni) | 11/09 03:42 UTC (fundador) · 1 em 7d · 40 s | nenhuma | cap 10 s/cena (SCENE_CAP omni=10) | idem | O3/host | ledger zerado |
| Seedance 2.5 (s25) | nunca entregou (canário 01/09 3/6 → estorno) | 01/09 21:00 provider_abandoned | — | vermelho herdado test-motores-d1 | — | S25_PUBLIC=false |
| Avatar | **15/07/2026** — 0 em 30d | — | — | — | — | continua invisível (auditoria 28/08 item 2) |

Fatos medidos que mudam a leitura:

1. **Formato: a pessoa NÃO seleciona formato no Studio.** `aspect` só entra por
   `?aspect=` (handoff do GPT, lib/gptHandoff.ts); o GenerateClient não tem
   seletor e avisa honestamente que 16:9 "a casa não faz" (linha 7628). Em 9 dias
   nenhum evento de render gravou `aspect` — só gpt_handoff_created/gpt_landing
   (9:16 em 100%). Ou seja: 100% dos filmes são 9:16 e o critério (c) era
   IMENSURÁVEL no banco. Conserto desta rotação: `requested_aspect` em
   `generation_dispatch_received` e `aspect` no claim assinado.
2. **Livro-razão zerado nos motores caros.** Todos os 5 `cinematic_dispatch_result`
   da família hollywood (Kling 3 ×2, H3, Omni) em 7 dias saíam
   `attempted=0 · not_attempted=N · invariant_ok=false · claim_action=unknown ·
   provider_spend_possible=false` — inclusive os dois filmes de 150cr ENTREGUES.
   Causa: o laço hollywood nunca escrevia `ctx.outcomes/attempts` nem
   `claimAction` (só o clássico fazia). É a "observação não bloqueante" de 27/08
   (claim_action=unknown) que na verdade era o padrão de 100% da família.
3. **90 s:** aceito nos dois caminhos (hollywoodTarget min(90)+8; clássico até 9
   clipes de 9 s; SUPPORTED_DURATIONS 35/60/90). Nenhum filme externo de 90 s na
   janela; o Kineo 1 tem entregas de 90 s em 7d.
4. **Fala nos motores caros depois das mudanças de hoje: ainda sem prova em
   produção.** 0 renders pagos de Kling 3/H3/Omni de conta externa desde 6b3384af
   (11:34). O único canário (fundador, 11:53) rodou no deploy anterior ao
   d4d89499. Dry-runs do fundador às 12:27-13:51 passaram (200), mas dry-run não
   prova voz.

### O que mudou (rotação 1)

- `app/api/generate-video-cinematic/route.ts` (KINEO-VIGIA-LEDGER + KINEO-VIGIA-FORMATO):
  `hDispositions[]` paralelo a `hRequestIds` (accepted / explicit_reject /
  ambiguous nos 3 pontos de push); bloco que preenche `ctx.outcomes[i]`,
  `ctx.attempts[i]` e `totalPosts` entre o acolchoamento e o FAILFAST (cena
  nunca tentada fica de fora → not_attempted; recusa sem classe vai como
  unknown/never — nunca autoriza re-POST); `claimAction='published'` antes de
  `publishCinematicResponse` no sucesso hollywood e no salvage;
  `requested_aspect` no `generation_dispatch_received`; `aspect: aspectRequested`
  nos dois claims (hollywood e clássico). Nada de preço, crédito, prompt, motor
  ou tela.
- Guardião `scripts/test-vigia-ledger-hollywood-2026-09-11.mjs` (18 checks; 4
  deles executam `resumirPlano`/`invarianteFecha` de verdade com o vetor que a
  rota monta: 8/8 → invariante fecha; 2 aceitas + ambígua + break → not_attempted
  5; recusa explícita → rejected; vetor vazio = o defeito antigo). Falsificado
  por 6 mutantes, todos mortos com `git diff` provando que aplicaram: disposição
  sempre accepted · cena não tentada entra · claimAction hollywood some ·
  requested_aspect some · hValid antes do razão · aspect só num claim.
- tsc 0 · 16 baterias do CI + scene-truth + motores-r2-r6 + voz-na-boca +
  primeira-pessoa + silencio-na-cena verdes.

### O que fica (pedidos em PEDIDOS-ENTRE-PISTAS)

- Retry de cena crava `aspect_ratio: '9:16'` (Omni, H3 t2v, Kling 2.5 t2v) — fora
  do território desta vigília (última mudança: Codex 10:54 "compose mutex"). Com
  `aspect` agora no claim, o retry pode ler de lá.
- Gerador de prompt visual clássico injeta lugar real fora do roteiro
  ("Amityville House") — lib/cinematic/visualPromptPolicy.ts é do Codex (02:38).
- H3 de walidbasempayments: 51 min de espera, 0 entrega, causa desconhecida.
  Precisa ler o status das 6 cenas na fal (request_ids no claim 928eebd1) — não
  há chave fal local nesta máquina.
- Seedance: 12 pessoas em 15 dias fecham a aba e o stranded finisher não fecha o
  filme (`provider_abandoned_refunded`). Medir na próxima rotação quantas dessas
  tinham TODAS as cenas prontas na fal.
