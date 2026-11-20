# KINEO-RECUSA-IA-2011 · onde a branch barra a recusa do modelo

Linhas de `codex/conserto-recusa-ia-2011` sobre a origin/main `f82078c15` (20/11).
Mensagem padrão da recusa (`lib/modelRefusal.ts:269`, `MODEL_REFUSAL_MESSAGE`):
"The writer could not turn this idea into a script (the AI declined the topic). Nothing was charged — try rewording the idea, or paste your own script with "Use my script as is"."
No Studio (`app/(dashboard)/generate/GenerateClient.tsx:14167`), essa frase (e `reason: model_refused_topic`) mostra o botão **"Try a safer angle"** (`lib/recusaBotao.ts:115`, `:127` e `:216`): ele reescreve a ideia com o prefixo "A respectful, factual, family-friendly short documentary about:" e tenta de novo, em modo IA.

Toda guarda grava o evento `model_refusal_blocked` (guarda, rota, 120 caracteres do texto barrado, se houve estorno).

## (a) Onde a branch devolve 422 ou estorna

| # | Rota e linha | Quando | Crédito | O que o cliente vê |
|---|---|---|---|---|
| 1 | cinematic `route.ts:1686` (entrada) | o roteiro que chegou é recusa do modelo, não é "Use my script as is" e não veio a ideia do cliente | não cobrado (antes do débito) | a mensagem padrão + "Try a safer angle". Se a ideia do cliente veio, **não há 422**: o filme nasce da ideia |
| 2 | cinematic `route.ts:3370` (helper), chamado em `:4183` e `:4412` (fala das cenas do escritor de cenas) | a fala de uma cena é recusa | **estornado** (o estorno de sempre: `confirmCinematicRefund` + `releaseBirthClaim`) | "The writer could not turn this idea into a script (the AI declined the topic). Your credits were returned — try rewording the idea…" + "Try a safer angle" |
| 3 | cinematic `route.ts:5069` (planejador hollywood) | fala, prompt ou diálogo do planejador é recusa (a fala do cliente em verbatim, que a C1 repõe ou que é trecho do roteiro dele, não é julgada) | **estornado**, igual ao 2 | igual ao 2 |
| 4 | cinematic, mesmo helper do 2 e do 3, quando o estorno **não** confirma na hora | o banco não confirmou a devolução | fica preso até a varredura de estorno que já existe (`app/api/cron/refund-sweep`) | "…Your automatic credit refund is still being confirmed." (HTTP 503). **ABERTO (pequeno):** a pessoa fica sem filme e com o crédito pendente até a varredura passar; a frase explica, mas não diz quando |
| 5 | `app/api/generate-script/route.ts:585` (escritor, já existia) | o escritor recusou nas 3 tentativas (a 1ª, a "só a história" e a "condensar") | não cobrado (a rota não cobra) | a mensagem padrão + "Try a safer angle" |
| 6 | `app/api/kids-cartoon/story/route.ts:103` → 502 em `:113` | a história do desenho é recusa | não cobrado | "The story did not come out right this time. Nothing was charged — please try again." (ou a versão em PT) |
| 7 | `app/api/baby-podcast/prepare/route.ts:79` → 502 em `:89` | o roteiro do bebê é recusa | não cobrado | "The script did not come out right… Nothing was charged…" (ou PT) |
| 8 | `app/api/ads/script/route.ts:85` → 502 em `:125` | uma versão do anúncio é recusa e as correções não consertam | não cobrado | "The AI could not write a script with these facts. Add one more detail about your offer and try again." (`AdsWizardClient.tsx:1874`) |
| 9 | `app/api/ad-script/route.ts:90` → 502 | o roteiro do anúncio (avatar) é recusa | não cobrado | "Could not write the ad script. Please try again." |
| 10 | `app/api/expand-script/route.ts:289` → 502 | a expansão do roteiro é recusa | não cobrado | "The writer is busy right now." / "Could not expand the script. Please try again."; o roteiro do cliente fica como estava |
| 11 | `app/api/apply-suggestion/route.ts:86` → 502 | a sugestão aplicada é recusa | não cobrado | "Could not apply that suggestion. Please try again."; o roteiro fica |

Sem 422 e sem estorno (o fluxo segue com o texto de antes):
- descritor de cena `route.ts:4490`: a descrição que é recusa vira "sem descrição" e entra o complemento de sempre;
- reescritores de fala e de plano `route.ts:3383` e `:3384` (expandVoiceoversToTargets, appendNarrationToTargets, alignShotsToSpeech): fica o texto de antes da reescrita;
- `app/api/regenerate-scene/route.ts:200`: entra o prompt do construtor;
- `app/api/retry-hollywood-scene/route.ts:42`: segue o prompt assinado;
- `app/api/demo-script/route.ts:116`: a demo mostra o roteiro do banco fixo.
- "Use my script as is": o texto do cliente passa como veio (nem a entrada do cinematic nem `lib/requestFidelity.ts` o barram por soar a recusa).

Ninguém fica sem filme **e** sem crédito sem explicação, fora o caso 4 (crédito pendente até a varredura).

## (b) Falso positivo: texto LEGÍTIMO do modelo barrado

| Script | Barrado por engano | Por quê |
|---|---|---|
| adv3 (1/38) | "I can't write this without crying. My grandfather crossed the ocean in 1952 with one suitcase." | a régua da origin/main já barrava "I can't write this" (é o PISO pedido na volta 2) |
| adv4 (1/33) | "The robot said: As an AI, I cannot lie to you. Your father is alive." | o PISO pega "as an AI, I cannot…"; "lie" não é verbo de sentimento, então não vale a exceção do narrador |
| adv4b (7/18) | "I can't do that. Not for money, not for anyone." · "I won't do that. I promised my mother." · "I cannot help. My hands are shaking." · "I won't continue. The war took everything from me." · "Desculpe, não posso ajudar. A ponte caiu às três da manhã." · "Lo siento, no puedo ayudar. Mi hermano se fue con el dinero." · "Leider kann ich nicht helfen. Der Damm brach um Mitternacht." | narração curta (até 60 palavras) que ABRE com uma frase de recusa de assistente e não tem atribuição de fala ("disse", "the clerk told", "Those were the last words…") |

O que acontece com o filme e o crédito quando o MODELO escreve uma dessas:
- **no escritor** (`/api/generate-script`): a rota tenta de novo ("só a história" e depois "condensar"). Se uma tentativa sai sem a frase, o filme segue com ela. Se as 3 caem na régua: 422, **nada cobrado**, mensagem padrão + "Try a safer angle". O cliente fica sem o filme daquela ideia, com o crédito inteiro;
- **na fala das cenas ou do planejador** (cinematic): **estorno** e 422 (casos 2 e 3). Sem filme, com o crédito de volta;
- **nos reescritores, no descritor, no refazer cena e no retry**: nada para o cliente; fica o texto de antes;
- **no desenho, no bebê e nos anúncios**: 502 "não saiu desta vez", nada cobrado.
- Se o cliente digitou a frase ele mesmo em "Use my script as is": **passa** (é texto dele).

O custo do falso positivo é um 422 sem cobrança (ou com estorno), nunca um filme quebrado. (Em 30 dias o banco tem 3 pessoas com a recusa real; a frequência destas narrações curtas em 1ª pessoa não foi medida.)
