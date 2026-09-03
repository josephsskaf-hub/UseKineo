# HANDOFF CODEX → CLAUDE — RODADAS 259–260

**Data operacional:** 02–03/09/2026 UTC

**Workstream:** B2C — primeiro vídeo → valor percebido → checkout → pagamento

**Base revalidada:** `5cb3ea755a400acbc30ee09f503ac6817ae9dee2`

**Commit funcional:** `bbffa06ec5e1cf149cfa49fe9103860a9842b5da`

**Deploy funcional:** `dpl_9MgKKo5Q8YagnfXJZ7q6qU4d9z14` — `READY` em 03/09/2026 00:42:09 UTC, SHA correto, `aliasError: null`, aliases incluindo `www.usekineo.com` e `usekineo.com`.

## Resultado executivo

**FATO CONFIRMADO:** as superfícies recentes de preço, oferta pós-vídeo, retomada de checkout, episódio 2, rating e compartilhamento ainda estão sob gates próprios. Não foram reeditadas nesta rodada.

**HIPÓTESE MEDIDA:** a decisão do roteador de começar em Seedance pode estar associada a mais assinatura self-serve do que começar em Fast. Isto é associação, não causalidade: trial, saldo, origem e intenção confundem a comparação.

**IMPLEMENTADO:** entrou em `origin/main` um relatório agregado e fail-closed para a sequência:

`first_video_engine_decided` inequívoco → primeiro vídeo persistido e concluído de toda a história → primeira Stripe Session recorrente self-serve posterior → pagamento da mesma Session dentro de sete dias individuais.

O relatório nunca interpreta ausência de evento como Fast e declara que a decisão do roteador não prova o motor efetivamente renderizado.

## Fronteira e gate

**EVIDÊNCIA DE PRODUÇÃO:** `first_video_engine_decided` passou a existir no commit `872ac41cbc7740ddf2392f417133949af1a01645`. O deploy `dpl_FmvycZNZZ2VJUVBnyFKmt4qxbKUy` ficou `READY`, sem erro de alias e nos domínios canônicos em `2026-09-02T04:00:53.307Z`. Essa é a fronteira do contrato; dados anteriores são inelegíveis.

**QUESTÃO PENDENTE / AMOSTRA:** a observação individual é de sete dias. Portanto nenhuma pessoa dessa coorte pode estar madura antes de `2026-09-09T04:00:53.307Z`. O estado correto até lá é `collecting`; esta rodada não publica taxa Seedance versus Fast.

**GATE:** no mínimo 20 pessoas maduras, pelo menos 5 por decisão de motor e sete dias individuais. O primeiro pagamento exato abre somente reconciliação. O relatório nunca autoriza sozinho alteração do onboarding.

## Contrato financeiro e de identidade

- Contagem por pessoa externa; contas internas saem pelo helper canônico.
- Perfil duplicado, conflitante, sem relógio válido ou criado depois do vídeo falha fechado.
- Primeiro vídeo é resolvido contra todo o histórico e exige `completed`, arquivo, ID, dono e horário inequívocos.
- Decisão exige `surface=niche_onboarding`, `engine=seedance|fast`, usuário e horário válidos, estritamente antes do primeiro vídeo.
- Qualquer intenção comercial anterior ou empatada ao primeiro vídeo sai da coorte limpa; recorrente, avulsa e desconhecida permanecem separadas.
- Primeira Session recorrente self-serve posterior controla. Uma Session posterior nunca limpa a primeira.
- Pagamento exige o mesmo `stripe_session_id`, mesmo dono, produto recorrente e cronologia válida pelo ledger canônico.
- Pagamento recorrente sem start ou em outra Session bloqueia qualidade; nunca vira falso não-pagante.
- Packs e Autopilot não contam como assinatura self-serve.
- Receita usa unidades mínimas inteiras e moedas ficam separadas; nenhuma conversão cambial ou soma entre moedas.
- Saída é somente agregada: sem e-mail, `user_id`, browser/session ID, Stripe Session ou vídeo ID.

## Arquivos

- `scripts/first-video-engine-to-subscription-report.mjs`
- `scripts/measure-first-video-engine-to-subscription.mjs`
- `scripts/test-first-video-engine-to-subscription.mjs`

Nenhum arquivo de interface, preço, crédito, checkout, Stripe, render, cena, voz ou legenda foi alterado.

## Verificação

- `test-first-video-engine-to-subscription.mjs`: **92/92**.
- `test-subscription-revenue-ledger.mjs`: **31/31**.
- `test-b2c-subscription-truth-report.mjs`: **43/43**.
- `node --check`: verde nos três arquivos novos.
- Whitespace: limpo nos três arquivos novos e no commit.
- Typecheck: somente os três erros já existentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`; nenhum arquivo desta rodada é TypeScript.
- Auditoria independente inicial: `NO-GO`, P0=0/P1=1 por pagamento em outra Session virar falso não-pagante.
- Correção: esse caso e pagamento sem Session agora entram em qualidade bloqueada.
- Reauditoria independente final: **GO, P0=0/P1=0**.

## Achado lateral para o dono correto

**FATO CONFIRMADO:** o pós-vídeo está dividido entre `/history` e `/my-videos`. Sidebar e MobileNav levam a `/history`, que possui continuidade e oferta mensurável. Links contextuais do Generate, PricingJourneyProof e checkout success levam a `/my-videos`, onde não existe o mesmo funil; o “Generate Similar” também não registra continuidade.

**COORDENAÇÃO:** não foi feita mudança porque `GenerateClient.tsx`, `/history` e `/my-videos` pertencem à zona de produto/Claude ou são compartilhados. Claude deve revisar esse split antes de qualquer instrumentação ou consolidação. Não ressuscitar `PostVideoPaywall` nem `StickyUpgradeBar`: estão órfãos/duplicados.

## Próxima rodada recomendada

Voltar ao eixo B2B para preservar o ciclo 50/50. No B2C, manter esta coorte intacta até o gate; não trocar motor, trial, saldo ou oferta com base em amostra imatura.
