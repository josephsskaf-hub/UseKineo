# SPRINT ASSINATURAS — ciclo noturno de 8h (06/09/2026)

**Ordem do fundador (06/09 00:30 BRT):** "Trabalha sozinho, automaticamente,
por 8 horas. Avanca em ASSINATURAS. NAO ME CHAME. RODE TODOS OS PUSHES POR MIM.
So me entregue o resultado daqui a 8 horas. Voce decide todas as acoes."

**Janela:** 2026-09-06 01:08 → 09:08 BRT · 8 rotacoes de 1h.
**Marco do placar:** `2026-09-06 04:00:00+00` (UTC). O dinheiro e
`payment_success` de webhook, em conta externa, depois desse instante.
**O push e meu neste ciclo.** Entrega que nao esta EM PRODUCAO ao fim da
rotacao nao conta como entrega.

Estado na abertura: 0 assinaturas desde o marco. `next_action_served` = **0 em
toda a historia** — as duas pecas de servidor do ciclo de 05/09 estao no ar e
ninguem as chama.

---

### #1 — 01:08→02:20 — o contrato da proxima acao prometia "Kineo 1 · 0 creditos" para quem a casa cobra 5

**HIPOTESE DA ROTACAO (escrita antes de codar):** o cardapio manda ligar o N1
(o "nao" vira porta) montando um cartao sobre `GET /api/next-action`. Antes de
montar, conferir se o que a rota devolve e verdade.

**NAO ERA.** E o defeito estava exatamente na coorte que o cartao existe para
servir.

**ERRADO (medido em producao, antes de qualquer linha):**

| medida | valor |
|---|---|
| contas com `trial_status` em `plan='free'` e `has_paid=false` | **798 de 803** |
| pessoas hoje no estado `dry` (saldo < preco do ultimo filme, externas, 14d) | **140** |
| dessas, com saldo < 5cr | **97** |
| `next_action_served` na historia inteira | **0** |
| `free_duration_clamped` em 30d (so existe com o reverse trial LIGADO) | **9** |

A rota calculava `isPaidUser` com um predicado **proprio** (PAID_PLANS +
`has_paid`). Para as 798 contas de trial isso da FALSE, e
`creditCostForDuration('fast', false, s)` devolve **0** — entao o contrato
anunciava *"Continue with Kineo 1 · 0 credits"*.

Quem cobra e o `/api/compose`, e la o predicado e **outro**:
`isFreePlanFast = isFreePlan && !hasPaid && !ent.isTrial` (route.ts:1668).
Com trial ativo, `ent.isTrial` e true, o render segue o caminho **pago** e o
Kineo 1 custa `creditCostForDuration('fast', TRUE, duration)` = **5+**.

Contrato prometia 0, casa cobrava 5 — para a pessoa que acabou de levar um
"nao" por falta de saldo. E a classe *"copy que mente"* do achado 4 da auditoria
de 28/08, cometida pelo arquivo que **cita essa auditoria no proprio cabecalho**.

**MUDOU** — `app/api/next-action/route.ts` (SHA `31066fd7`):

1. **Fim do terceiro predicado.** A rota le `getEffectiveEntitlement()`, a
   MESMA funcao de onde o compose tira o `ent`, e usa `treatAsPaid`
   (== `!isFreePlanFast` para plano free). A cura nao foi consertar o calculo:
   foi parar de ter um calculo.
2. **A segunda verdade, que nenhum lado dizia.** Quando o Kineo 1 sai mesmo de
   graca (trial encerrado), ele **nao e ilimitado**: com o reverse trial ligado
   o free tier da **1 Fast por 30 dias** e corta o filme em **15 segundos**.
   Oferecer "de graca" calado trocaria uma mentira de preco por uma de entrega.
   A cota e contada com a fonte unica do compose (`lib/freeFastQuota`), e a
   resposta passa a carregar `freeTier{clampSeconds,slotsLeft,limit,windowHours}`.
3. **Falha fechada.** Cota que nao pode ser VERIFICADA (sem service key, erro
   de banco) = Kineo 1 gratis **nao e oferecido**. O lado que erra prometendo e
   o unico lado caro aqui.

**O QUE O CLIENTE PASSA A VER:** por enquanto, nada — a rota segue sem tela
(e por isso o N1 e a rotacao #2). O que mudou e que a tela que vier em seguida
nasce sobre um contrato que nao mente. Montar o cartao antes desta correcao
teria publicado a mentira em vez de esconde-la.

**TESTES:** `scripts/test-next-action-2026-09-05.mjs` **39 → 65** verificacoes,
verde. A secao 10 le o `app/api/compose/route.ts` REAL e prova o espelho do
predicado. Falsificado com 3 mutantes, cada um pego por 1 verificacao:
volta ao predicado proprio · cota desconhecida virando cota livre · filtro que
para de tirar o Fast sem vaga. `npx tsc --noEmit` verde (junction de
node_modules confirmada — `next/package.json` visivel).

**RISCO:** a rota passou a fazer 2 leituras a mais (events + videos) e so no
caminho gratis. Leitura pura, service-role, sem escrita. Se o Supabase estiver
doente, a consequencia e a oferta gratis sumir — nunca uma cobranca errada.

**COMO MEDIR:** `next_action_served` agora carrega `treat_as_paid`, `is_trial`
e `free_slots`. Quando a tela da #2 subir, a prova da correcao e:
`next_action_served` com `treat_as_paid=true` **nunca** acompanhado de oferta
de Kineo 1 a 0 credito. Hoje o denominador e 0 (rota sem chamador).

**PLACAR (marco 04:00 UTC):** 0 assinaturas. Sem movimento — a rotacao foi de
correcao de contrato, nao de superficie.

**PROXIMA JOGADA (#2):** montar o cartao N1 no `UpgradeModal` (ponto exato: logo
apos o bloco `purchaseFit`, `GenerateClient.tsx:~19480`), agora sobre o contrato
honesto: os dois numeros, o motor que o saldo AINDA paga **com o teto de 15s
dito**, e a porta do plano. Cohort distinta da do `firstFilmFree` (que so pega
quem tem 0 filmes), entao nao ha sobreposicao.

---

### #2 — 02:08→03:05 — a peça que fecha a venda tinha ZERO chamadas; o "não" vira porta

**ERRADO (medido):** `GET /api/next-action` está em produção desde 05/09 e tem
**0 chamadas na história inteira**. O contrato que sabe responder "o que você
pode fazer agora" nunca chegou a uma tela. Enquanto isso, **140 pessoas**
(externas, não pagantes, 14d) estão com saldo MENOR que o preço do filme que
acabaram de fazer — e a casa responde a esse instante com um modal que começa
por "não".

**MUDOU** — `components/NextActionCard.tsx` (novo), montado com **UMA linha**
no `UpgradeModal` (`GenerateClient.tsx`), atrás de `reasonHasCreditFit`. Quem
caiu no modal por gate de plano (studio/creator/footage) tem saldo e não é
desta conversa. SHA `f1dfd256`.

**O QUE O CLIENTE PASSA A VER**, no instante em que aperta gerar e não cobre:

| antes | agora |
|---|---|
| "You're out of credits 🎉" + linhas de plano | a frase com os **dois números**, vinda pronta do servidor |
| nenhuma saída que não custe dinheiro | o motor que o saldo **ainda paga**, com o custo que a rota mandou |
| — | quando esse motor é o Kineo 1 grátis: **15 segundos, com marca d'água, 1 a cada 30 dias** |
| plano | plano, **sempre** — inclusive sem alternativa, que é quando ele mais importa (K1) |

**TRÊS COISAS QUE A TELA NÃO FAZ**, e cada uma é uma cicatriz: (1) não calcula
preço — todo número vem do `cost` da rota, que sai da mesma função que cobra;
(2) não decide quem vê — quem decide é o `state` do servidor, porque duplicar
o predicado de "está sem saldo" seria criar o **terceiro** predicado, o defeito
que a #1 acabou de arrancar da rota; (3) não bloqueia ninguém — não é overlay,
não intercepta clique, não esconde as linhas de plano, e falha de rede faz o
cartão sumir em silêncio.

Coorte **distinta** da oferta de primeiro filme grátis (que só pega quem tem 0
filmes): esta fala com quem JÁ entregou filme e ficou seco. Sem sobreposição.

**TESTES:** `scripts/test-next-action-card-2026-09-06.mjs`, **40/40**, lendo o
componente e o call site REAIS. Falsificado com **5 mutantes**, cada um pego:
cartão pintando fora do estado seco · plano só aparecendo com alternativa ·
preço redigitado na tela · o grátis calando o corte de 15s · montagem sem a
guarda de falta de crédito. Regressão: `test-next-action` 65/65,
`test-serie-memoria` **142/142 com a seção 10 (trava de qualidade do fundador)
verde** — `GenerateClient.tsx` não está na lista de caminhos proibidos.
`npx tsc --noEmit` verde.

**VERMELHO QUE NÃO É MEU:** `test-coerencia-historia-2026-09-02` dá 23 ok / 2
fail (`duration=45 na URL vira 35`, `onboarding: consulta /api/credits antes de
escolher motor`). São **exatamente** as duas falhas que o claude #2 registrou
no PEDIDOS em 05/09 11:50, já vermelhas antes deste ciclo. Não toquei.

**RISCO:** o cartão faz 1 GET a mais quando o modal de crédito abre. Leitura
pura. Se a rota falhar, o cartão não pinta e o modal segue exatamente como
hoje — o pior caso é a tela de antes.

**COMO MEDIR (o degrau que hoje é 140 → 1):** `next_action_card_shown` (novo,
com `has_alternative` e `clamp_seconds`) → `next_action_clicked` com `choice`
(`continue_free` | `continue_cheaper` | `see_plans`) → `checkout_started` entre
pessoas com filme ≥ 1. Hoje o denominador é **0**, porque não havia tela.

**PLACAR (marco 04:00 UTC):** 0 assinaturas, 0 cadastros novos desde o marco
(1,5h de madrugada). Checagem zero **limpa**: 0 cadastro sem crédito (corte no
conserto de 04/09 13:08 UTC), 0 `next_episode_failed` (corte 05/09 13:25 UTC),
0 débito sem entrega, 0 render preso. Produto vivo: 45 eventos na última hora,
9 vídeos em 6h.

**DÍVIDA HONESTA DE VERIFICAÇÃO:** a entrega da #1 e a desta rotação são
**auth-gated**, então não têm marcador público — dá para provar que a fila
subiu (`origin/main` = SHA, fila = 0) e que o site responde 200 com a rota em
401, mas **não** dá para provar por HTTP que o SHA específico está servindo. A
casa não tem rota de versão. Registrado como dívida, não resolvido aqui.

**PRÓXIMA JOGADA (#3):** o N2 do cardápio — o cartão do Episódio 2 na tela de
filme pronto ganha o mesmo contrato. Medido em 05/09: 27 impressões, 4 cliques
(15%), e o cartão fala do roteiro e nunca do que custa. É a mesma peça, na
superfície onde a pessoa está feliz em vez de recusada.
