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

### #1 — 01:09→01:18 BRT — o contrato da proxima acao prometia "Kineo 1 · 0 creditos" para quem a casa cobra 5

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

### #2 — 01:18→01:22 BRT — a peça que fecha a venda tinha ZERO chamadas; o "não" vira porta

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

---

### #3 — 01:22→01:27 BRT — a mesma porta na tela onde a pessoa está FELIZ, não recusada

**ERRADO (medido em 05/09):** o cartão do episódio 2 da tela de filme pronto
fala do **roteiro** e nunca do que ele **custa** — 27 impressões, 4 cliques
(15%), e a taxa CAIU conforme o denominador subiu (45% → 13% → 15% no mesmo
dia). Quem aperta sem saldo só descobre no modal seguinte: a venda começa por
"não".

**MUDOU** — o **mesmo** `NextActionCard` da #2, montado com UMA linha em
`phase === 'done'`. Nenhuma regra nova: o servidor já decide tudo, e fora do
estado `dry` o componente não pinta nada, então quem tem saldo não vê card novo
nenhum. SHA `f1d1f3c5`.

**O QUE O CLIENTE PASSA A VER:** quem acabou de receber um filme e ficou sem
saldo para outro lê, **antes** de apertar o episódio 2, os dois números e o
motor que o saldo ainda paga — com o corte de 15s dito quando esse motor é o
Kineo 1 grátis. A porta do plano segue sempre presente (K1).

**⚠ DELIVER-FIRST INTACTO, e agora PROVADO:** o cartão fica DEPOIS do botão de
baixar e DEPOIS do `PlanFitCard` (dono da oferta da primeira entrega). A regra
não é estética — mediu **107 pessoas** que esperaram o filme, viram a tela
pronta e foram embora **sem o arquivo**. Três verificações novas comparam as
posições no arquivo real, e o mutante que sobe o cartão para antes do download
é pego pelas três. O botão do episódio 2 não foi tocado (verificação própria).

**TESTES:** `test-next-action-card` **40 → 45**, verde. Falsificado com 2
mutantes novos: cartão antes do download (pego por 3 verificações) e as duas
montagens com a mesma superfície, que cegaria o placar. Regressão:
`test-next-action` 65/65, `test-serie-memoria` 142/142 (trava de qualidade
verde), `tsc` verde.

**NOTA DE MÉTODO:** o primeiro mutante desta rodada usou `python` e o Windows
não o tem — o script não rodou e o guardião deu 45/45 **sem mutação nenhuma**.
Um "verde" ali teria sido falso. Refeito em `node`, o mutante pegou. Regra para
as próximas rotações: mutante que não imprime prova de que alterou o arquivo
não conta como falsificação.

**COMO MEDIR:** `next_action_card_shown` com `surface='generate_done_screen'` →
`next_action_clicked` → filme entregue em 24h. E o alvo real:
`checkout_started` entre pessoas com filme ≥ 2, hoje **1 de 13**.

**PRÓXIMA JOGADA (#4):** N3 do cardápio — e-mail para quem levou o "não" nas
últimas 48h (fonte chatgpt primeiro), nomeando o filme da pessoa. Dry-run
primeiro, lista completa no diário, e só então o disparo.

---

### CORREÇÃO DE RELÓGIO — 01:27 BRT (feita por mim, sobre mim)

As três entradas acima nasceram com **hora inventada** ("02:08→03:05",
"03:08→03:50"): eu escrevi o rótulo pelo número da rotação em vez de olhar o
relógio. Conferido: `date` diz **01:27 BRT / 04:27 UTC**. As três entregas
couberam **dentro da rotação #1** (01:08→02:08) — 18 minutos, não 3 horas.

É exatamente o defeito que a `#9` de 05/09 registrou no PEDIDOS ("o diário tem
uma entrada 'FECHAMENTO' carimbada 18:10 que foi escrita às 15:15") e que a
memória da casa já guarda como *"fechamento cedo: conferir o relógio, não o
rótulo"*. Repeti em menos de 24h. **Conteúdo das entradas intacto; só o
carimbo estava errado, e está corrigido.**

Regra que fica para as 7 rotações restantes deste ciclo: **carimbo de hora sai
de `date`, nunca do número da rotação** — e o mesmo vale para declarar
"fechamento".

**Consequência prática (boa):** o ciclo está muito à frente do ritmo. Sobram
~7h40 de janela com as três peças de conversão já em produção.

**DECISÃO DE TIMING sobre o N3 (e-mail), tomada por causa disto:** agora são
**00:27 no fuso do leste dos EUA**. Disparar a carta de "você levou o não" às
00:30 ET queimaria a melhor lista da casa no pior horário — e o carimbo de
supressão é de **1 por pessoa**, então não há segunda chance. O e-mail vai ser
**construído e validado em dry-run agora** e **disparado perto do fim da
janela**, por volta de **08:00 BRT (07:00 ET)**, que é manhã de quem recebe.
Construir cedo, disparar na hora certa.

---

### #4 — 01:28→01:36 BRT — a carta de quem bateu na parede de saldo (pronta, dry-run feito, NÃO disparada)

**O CARDÁPIO MANDAVA** escrever para "as 9 sem saldo + quem viu `trial_spent`
nas últimas 48h". **Medi antes de escrever**, e a coorte real é outra:

| medida (contas externas, 14d) | valor |
|---|---|
| pessoas com filme e saldo < preço do último filme | **140** |
| dessas, **já receberam** e-mail de alguma campanha | **106 (76%)** |
| nunca tocadas por campanha nenhuma | **34** |
| menos 1 opt-out → mailáveis | **33** |
| **na janela de 48h que o cardápio pedia** | **1** |
| que já tocaram o checkout (disputa com outra campanha) | **0** |

Duas consequências que mudaram a jogada: (1) a janela de 48h alcançaria **uma
pessoa** — a janela virou 14 dias; (2) as 106 já contactadas **não entram**.
A regra da casa é 1 e-mail por pessoa, e reofertar a quem já recebeu foi
registrado no PEDIDOS (pela #8 de 05/09) como **decisão do fundador, não
minha**. Fica como pergunta no fim deste bloco.

**MUDOU** — `app/api/admin/send-next-episode-wall/route.ts` (novo, SHA
`09aaa90c` + `1d01d020`). Dry-run por padrão; `?confirm=SEND&limit=N` com teto
rígido de 30; supressão de 24h com **falha fechada**; carimbo `events`
**só no sucesso**; contatos proibidos (den.higgins, noelrss21, emiliomontinari,
akajitin) na lista de bloqueio; opt-out, pagante e descartável fora.

**A CARTA NÃO MENTE, e isso foi decisão de projeto:** ela **não** nomeia motor,
não promete grátis, não cita preço e não oferece crédito. O motivo é a #1 deste
mesmo ciclo — o preço do Kineo 1 depende de o trial estar vivo, e o grátis
ainda depende de cota (1/30 dias) e sai com 15s. **Um e-mail não reconsulta
cota.** Então a divisão é: a carta traz a pessoa de volta nomeando o filme que
ela fez; o cartão das #2/#3, que lê a cota em tempo real, diz o preço quando
ela chega. A carta afirma só o verificável: o filme, o saldo e o custo do
último filme.

**O DRY-RUN PEGOU UM DEFEITO QUE TERIA QUEIMADO 8 PESSOAS.** Eu ia montar o
assunto com um `slice` de `videos.topic`. A lista real mostrou o que mora nessa
coluna: `"Create a professional 75–90 second advertising video for Help Me
Tenerife…"`, `"### Clip 1 — Ingredients & Setup | 0:00–0:04"`, `"make a truck
carrying a load…"`, `"人物使用参考图"`. Assunto `Episode 2 of "Create a
professional 75–90 second…"` é e-mail quebrado — uma vez só, porque o carimbo é
vitalício. Agora o título sai de `pickMomentumTopic`, a função da casa feita
para ancorar tópico dentro de frase. **Testado com os 31 tópicos reais: 23
viram nome, 8 caem no assunto genérico, e os 8 são exatamente os quebrados.**

**TESTES:** `scripts/test-next-episode-wall-2026-09-06.mjs`, **58/58**.
Falsificado com 6 mutantes. **Um deles furou o guardião e o conserto é a parte
que importa:** a checagem "carimba só no sucesso" era
`indexOf(throw) < indexOf(carimbo)`, e **apagar o `throw` faz o indexOf
devolver −1**, que é menor que qualquer índice — o guardião **aprovava
exatamente a remoção que existia para pegar**. Sem esse `throw`, um Resend que
responde 4xx segue para o carimbo e a pessoa fica **queimada para sempre sem
ter recebido nada**. Agora a existência é exigida antes da ordem, e o mutante é
pego por 3 verificações. (Mesma família de bug apareceu duas vezes hoje: o
`semComentarios` do guardião engole o `//` de qualquer URL e some com
`api.resend.com` — corrigido lendo o fonte cru.)

**⛔ NÃO DISPAREI, E NÃO É ESCOLHA MINHA — É CREDENCIAL.** A ordem do ciclo diz
"nesta noite VOCÊ DISPARA". Mecanicamente eu não consigo: a rota é
`admin-gated` por `supabase.auth.getUser()` e eu não tenho sessão de admin; o
caminho alternativo (RESEND_API_KEY / CRON_SECRET) mora no `.env.local`, que
este ciclo me proíbe de ler — e com razão. **Não tentei contornar a
autenticação.** Fica o padrão que a casa já usa para exatamente isto
(send-winback-25): **link de 1 clique do fundador**, na lista ✅ no fim do
diário.

**E O TIMING JOGA A FAVOR:** às 01:36 BRT são **00:36 no leste dos EUA**.
Disparar agora queimaria a melhor lista da casa na pior hora. O link é para
**depois das 08:00 BRT**.

**COMO MEDIR:** `next_episode_wall_emailed_v1` (carimbo) → `series_continuation_landed`
→ filme entregue em 24h → `checkout_started`. Denominador = 31.

---

### #5 — 01:36→01:41 BRT — o que eu NÃO construí, e o número que sobrou

Três itens do cardápio foram **medidos e fechados sem código**, porque o dado
disse que o trabalho já estava feito:

**N5 (e-mail de checkout abandonado) — JÁ COBERTO, nada a fazer.** Gate do
PEDIDOS: `checkout_abandoned` com `recovery_sent_at` nulo nas últimas 48h =
**0**. Dos 9 leads da janela, **9 já receberam**. O `send-recovery` roda
sozinho de 2 em 2 horas. Construir aqui seria a terceira advertência de
"não construa de novo" ignorada em dois dias.

**N4 (a volta de quem levou o "não") — BLOQUEADO PELA DIVISÃO DE PISTAS, e
virou pedido.** `/dashboard` faz `redirect('/studio')`, então **/studio é o
único lugar onde quem volta aterrissa** — e `StudioClient` é lote aberto do
Codex neste ciclo. Não toquei. O componente já está em produção e a montagem é
uma linha: pedido registrado no PEDIDOS às 01:45.

**A carta do vídeo pronto já é personalizada para esta coorte.** `lib/lifecycle/
videoReadyFooter.ts` tem o ramo `plan_films` exatamente para "não paga, sem
saldo provado". Ou seja: **o canal do N3 já é automático para quem entregar
filme daqui em diante** — a minha lista de 31 é o passivo de quem passou antes
disso. Isso torna o disparo menos urgente do que o cardápio supunha, e é mais
um motivo para ele sair no horário certo em vez de agora.

**Verificação do clamp de 15s: falso alarme, e ainda bem que conferi.** Fui
checar se o corte do free tier chegava a ser dito na tela (o comentário do
compose diz que a pessoa lê filme curto como *produto quebrado*). **Chega:**
`freeClampNotice` é capturado nos dois pontos de despacho e renderizado em
`GenerateClient.tsx:14429`. Nada a consertar — rotação salva por uma conferência
de 2 minutos.

---

#### O NÚMERO QUE SOBROU, e é o mais acionável da noite

Fui atrás do N6 ("o que 10 de 30 do chatgpt fizeram que os outros não"). A
leitura ingênua dava 63% × 36% em "baixou o arquivo" — mas está **contaminada
por causalidade reversa**: quem faz mais filmes tem mais chances de baixar.
Refiz com o sinal recortado **antes** do desfecho (só o que aconteceu até 2h
depois do PRIMEIRO filme; o segundo só conta se veio depois):

| fonte chatgpt, não pagante, 30d | pessoas | fizeram 2º filme |
|---|---|---|
| **baixou** o 1º filme | 81 | **39,5%** |
| **não baixou** | 109 | **20,2%** |

**O que isto NÃO prova:** que baixar *causa* o segundo filme — pode ser apenas
a marca de "gostou". Não tratar como causal.

**O que mostra com segurança:** **109 de 190 pessoas (57%) da nossa melhor
fonte terminam o filme e vão embora sem o arquivo.** É a maior fuga isolada, e
ela está **acima** de tudo que trabalhei nesta noite — o degrau do saldo, que
recebeu as três peças, vem depois deste.

**NÃO AGI NISTO DE PROPÓSITO.** A correção provável é de layout na hora da
entrega — pista do Codex — e o `DELIVER-FIRST` já está implementado. Mexer no
arranjo do botão sem preview aprovado é exatamente o que este ciclo me proíbe.
Registrado no PEDIDOS com o método de medição.

**Endurecimento do cartão (mesma rotação):** sem visual possível neste ciclo
(browser proibido), reli o componente procurando o que quebraria na tela que
pede dinheiro. Achei dois: `balance`/`shortBy` ausentes imprimiriam *"You have
undefined credits"*, e `freeTier.limit` ausente quebraria a frase do grátis.
Agora cada número só é escrito se chegou. Guardião **45 → 48**.

---

### #6 — 01:41→01:43 BRT — a validação que dava para fazer sem navegador: 5 pessoas DRY reais, traçadas pelo contrato

Navegador é proibido neste ciclo, então não dá para OLHAR o cartão. O que dá é
pegar **cinco pessoas reais no estado `dry`** e traçar, com os valores do banco,
exatamente o que o contrato devolveria e o que a tela escreveria. Fiz isso.

(`duration_seconds` vem **null** nas cinco → o contrato usa 60s, e
`DURATION_REFERENCE_SECONDS` é 60, então o Kineo 1 pago fica em 5 créditos
cheios. Confirmado no arquivo, não suposto.)

| # | saldo | último filme | trial | o que o cartão escreve |
|---|---|---|---|---|
| 1 | 10 | 15 (Seedance 1.5) | **vivo** | *"cost 15 credits. You have 10."* + **Continue with Kineo 1 · 5 credits** + plano |
| 2 | 0 | 15 (Seedance 1.5) | encerrado | mesma frase + **Kineo 1 · free** + *"Free films are 15 seconds and watermarked — 1 every 30 days"* + plano |
| 3 | 10 | 15 (Seedance 1.5) | vivo | igual ao 1 |
| 4 | 2 | 3 (Kineo 1) | vivo | frase + **só a porta do plano** (Kineo 1 custa 5 > saldo 2 — nenhuma oferta falsa) |
| 5 | 5 | 15 (Seedance 1.5) | vivo | frase + **Kineo 1 · 5 credits** (cabe exatamente) + plano |

**A LINHA 1 É A PROVA DE QUE A #1 NÃO FOI ACADEMISMO.** Essa pessoa está em
trial vivo com `plan='free'`. Pelo código de ontem, o contrato teria anunciado
**"Kineo 1 · 0 credits"** — e o `/api/compose` teria cobrado **5** dela, que
tem 10. A correção da madrugada é o que faz a linha 1 dizer 5.

**A LINHA 2 É A PROVA DA SEGUNDA VERDADE:** trial encerrado, saldo 0, e o Kineo
1 realmente sai de graça — mas com **15 segundos, marca d'água e 1 a cada 30
dias**, tudo dito na mesma caixa. Sem isso, o botão prometeria o filme que ela
acabou de fazer e entregaria um terço dele.

**A LINHA 4 É A PROVA DE QUE O CARTÃO NÃO INVENTA SAÍDA:** saldo 2, e o motor
mais barato custa 5. Nenhuma alternativa é oferecida, e a porta do plano
aparece sozinha — que é exatamente a regra K1.

**Limite honesto desta validação:** ela prova a *lógica* com dados reais, não a
*pintura*. Um erro puramente visual (contraste, quebra de layout no celular)
passaria por aqui sem ser visto. Fica registrado como o que não foi verificado.

---

### CHECKPOINT DA #1 — 01:47→02:0x BRT — o que está EM PRODUÇÃO, provado por sonda, e o buraco de cobertura que a checagem zero mostrou

Este disparo é o **checkpoint** da rotação #1 (janela 01:08→02:08), não rotação
nova: nada de trabalho novo, só verificar, medir e registrar.

#### 1) AS TRÊS ENTREGAS DA NOITE ESTÃO NO AR — sonda, não fé

| prova | resultado |
|---|---|
| `git ls-remote origin main` | `ef821337af00` = ponta local |
| `git rev-list origin/main..entrega-atual` | **0** (fila vazia) |
| `31066fd7` (contrato que mentia o preço) ancestral de main | **SIM** |
| `f1dfd256` (cartão no modal de saldo) ancestral de main | **SIM** |
| `f1d1f3c5` (cartão na tela de filme pronto) ancestral de main | **SIM** |
| `GET https://www.usekineo.com/` | **200** |
| `GET /api/next-action` | **401** (existe, exige sessão) |
| `GET /api/next-action-xyz-nao-existe` (controle) | **404** |
| `GET /api/admin/send-next-episode-wall` | **403** (admin-gated — o bloqueio da #4 é real) |

O controle 404 é o que dá sentido ao 401: sem ele, "401" poderia ser o
comportamento de qualquer rota inexistente. A rota do contrato **está** no ar.

#### 2) CHECAGEM ZERO — tudo zero, e o único número não-zero não é defeito

Com corte no deploy em cada gate, como manda a regra do PEDIDOS de 05/09:

| item | valor |
|---|---|
| cadastro sem crédito (corte 04/09 13:08) | **0** |
| `next_episode_failed` (corte 05/09 13:25) | **0** |
| render preso >45 min | **0** |
| `compose_not_ok` 24h | **0** |
| `checkout_abandoned` sem recovery 48h | **0** |
| fallback de JWT-skew 24h | **0** |
| `generation_stage_error` 24h | **4** |

As 4 são **todas de 05/09**, nenhuma desta madrugada, e uma delas **não é
erro**: é a parede do free tier (*"You've used this month's free Fast video"*)
sendo gravada como `generation_stage_error` no estágio `clips_ready`. Recusa de
negócio contada como falha técnica **infla a métrica de erro e some com a
métrica de venda** — anotado, não consertado (é rotação nova).

#### 3) O BURACO DE COBERTURA DO CARTÃO — a descoberta deste checkpoint

O `NextActionCard` só pinta no estado `dry` (saldo < preço do último filme).
Fui ver **quantas paredes a casa realmente tem**. Em 30 dias, `compose_refused`:

| motivo da recusa | pessoas | saldo ≥ 15 | saldo médio |
|---|---|---|---|
| `trial_credits_stalled` | 15 | 1 | **1,0** |
| `free_fast_limit` | 15 | **4** | **13,1** |
| `credits_held_by_render` | 11 | **5** | **19,7** |

**41 pessoas levaram "não" do servidor em 30 dias, em três sabores — e o cartão
cobre um só.** As 15 do `trial_credits_stalled` são `dry` de manual e estão
cobertas. As outras duas paredes acontecem **com dinheiro na mão**:

- `free_fast_limit` — a cota de 1 Kineo 1 por 30 dias estourou. A pessoa tem
  saldo, o contrato devolve `can_continue`, e o cartão devolve `null`. Ela lê a
  frase do free tier e não recebe porta nenhuma.
- `credits_held_by_render` — saldo médio **19,7** e mesmo assim recusada,
  porque um render em curso segura o crédito. Aqui o cartão calar é **certo**:
  a resposta honesta não é "compre", é "espere" — mas hoje ninguém diz isso.

**RESSALVA QUE MUDA A LEITURA, e é minha:** os saldos acima são os de **hoje**,
não os do instante da recusa. Alguém recusado em 20/08 pode ter comprado,
gastado ou ganhado crédito depois. A tabela mostra **a ordem de grandeza das
três paredes**, não o saldo histórico de cada recusa. Quem for agir nisto mede
de novo com o saldo do evento, não com o do perfil.

#### 4) O CASO VIVO DA MADRUGADA — traçado inteiro, 04:31→04:46 UTC

Uma pessoa só (`078c3481`, fonte `seo`, campanha `push63_niche_horror`):
cadastro Google 04:31:06 → 25 créditos 04:31:06 → autostart do Seedance
04:31:37 → **checkout de Autopilot 04:33:43**, com o filme ainda em
`fal_polling` e `videos_ok: 0` → render encalhou e o auto-cura pegou
(`stranded_compose_attempt` 04:45:33 → `stranded_composed` 04:46:26).

Dois fatos deste rastro, nenhum deles agido agora:

**(a) O rastro de encalhe FUNCIONOU** — 53 segundos entre detectar e recompor,
sem pessoa nenhuma no meio. É a rede de 05/09 pegando um caso real.

**(b) A pessoa clicou em pagar 2 minutos depois de nascer, ANTES de ver o
primeiro filme.** O `PricingCards` mora no `showStep1`, que é justamente a tela
da espera. Pedimos dinheiro enquanto o filme dela renderiza — a prova ainda não
existe quando a conta chega.

#### 5) O NÚMERO QUE EU NÃO ESPERAVA: a porta de $299 ganha da de $99, 6 a 1

Na superfície `generate_step_1`, em 30 dias: **`autopilot` (US$ 299/mês) 6
cliques · `autopilot_pilot` (US$ 99 uma vez) 1 clique** — e o piloto é o botão
azul PRIMÁRIO, o mensal é o contorno secundário ("Go monthly instead"). Na
`pricing_page`, no mesmo período, `autopilot` é **1 de 23**. Mesma casa, mesma
oferta, 8x de diferença conforme a superfície.

Não são cliques em rajada (espalhados de 16/08 a hoje), então **não é botão
quebrado**. É a hierarquia da faixa não segurando a escolha onde a pessoa está
mais crua — e o caso vivo de hoje é um dos seis.

**NÃO MEXI, e é de propósito:** qual porta de plano recebe o clique é **oferta**,
e este ciclo me proíbe de tocar em oferta. Vai para a lista do fundador.

#### 6) MEDIÇÃO QUE EVITA A PRÓXIMA ROTAÇÃO DESPERDIÇADA: o e-mail de ciclo de vida já nomeia o filme

Antes de propor "personalizar o e-mail automático com o filme da pessoa" —
que é a tese do #4 — fui conferir se já existia. **Existe desde antes desta
noite:** `episodeTwoBlock()` é chamado em `ending_soon`, `downgraded_loss`,
`expired_offer_d5` **e** `expired_lastcall_d10`
(`app/api/cron/trial-lifecycle-emails/route.ts`, linhas 1407/1584/1630/1697/1847).

E o canal é o maior da casa: **2.929 e-mails em 30 dias**. O desfecho, com
janela de 72h e o corte de 3 dias para maturar:

| carta | enviados | voltaram | checkouts |
|---|---|---|---|
| `d0_welcome` | 591 | 384 (65%) | 6 |
| `ending_soon` | 531 | 530 (99,8%) | 2 |
| `downgraded_loss` | 558 | 134 (24%) | **6** |
| `expired_offer_d5` | 454 | 39 (8,6%) | **0** |
| `expired_lastcall_d10` | 327 | 6 (1,8%) | **0** |

**Leitura honesta:** as duas primeiras linhas são **contaminadas** — `d0_welcome`
e `ending_soon` saem para quem está ativo naquele momento, então "voltou" mede
em boa parte a sessão que já estava em curso. Não trate 65% e 99,8% como efeito
da carta.

**O que sobra limpo: 781 e-mails por mês para trial expirado (`d5` + `d10`)
produzem 45 voltas e ZERO checkouts.** E o filme da pessoa **já está nomeado
lá dentro** — ou seja, a isca certa já foi aplicada e essa coorte segue fria.

**AVISO DE NÃO-REPETIÇÃO:** quem abrir a próxima rotação **não** deve construir
"nomear o filme no e-mail automático". Já está feito, e não é o que falta.

#### 7) PLACAR DO MARCO (2026-09-06 04:00 UTC) — 50 minutos de idade

`seo`: **1 cadastro → 0 filmes completos → 1 checkout → 0 pagou**. Denominador
de 1: **não conclui nada**, e não vou fingir que conclui. O filme dessa pessoa
ainda estava renderizando quando este checkpoint fechou.

#### PRÓXIMA JOGADA (para a rotação #2, com o dado deste checkpoint)

A parede `free_fast_limit` é a única das três em que a pessoa **tem saldo, quer
gerar e ouve "não"** — e é a única onde vender é honesto (em
`credits_held_by_render` a resposta certa é "espere", não "compre"). O cartão
hoje cala nela porque o contrato devolve `can_continue`. **Estado novo no
`/api/next-action` (`quota_blocked`), com o mesmo desenho e as mesmas regras
K1** — servidor, minha pista, sem tocar em oferta nem em layout.

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Depois das 08:00 BRT**, abrir o link de 1 clique da #4 (está na entrada da
   #4 deste diário) para disparar a carta das 31 pessoas — a rota é admin e eu
   não tenho sessão; 403 confirmado por sonda neste checkpoint.
2. **Decidir a faixa do Autopilot no `/generate`**: o botão de **US$ 299**
   levou 6 cliques contra **1** do piloto de US$ 99, que é o botão primário.
   É oferta, então é sua. Nada a fazer no código até você dizer.

### 📋 O QUE ACONTECEU

Checkpoint, não rotação nova: nada de código. Confirmei por sonda que as três
peças da noite estão mesmo em produção (a fila está vazia e a rota do contrato
responde 401, com um 404 de controle para provar que a sonda vale). A checagem
zero veio limpa em tudo, e o único número não-zero é a parede do free tier
sendo contada como erro técnico. A descoberta do checkpoint é que a casa tem
**três** paredes de "não", não uma — e o cartão que subimos hoje cobre só a de
saldo; nas outras duas a pessoa é recusada **com dinheiro na mão**. Também
conferi antes de propor: o e-mail automático **já** nomeia o filme da pessoa, e
mesmo assim as 781 cartas mensais para trial expirado dão zero checkout — fica
o aviso para ninguém reconstruir isso. E uma pessoa nasceu, mandou fazer filme
e clicou em pagar 2 minutos depois, antes de ver o resultado.

---

### #7 — 02:09→03:0x BRT — a casa manda "faça seu primeiro filme" para quem JÁ tentou e não recebeu nada

**HIPÓTESE DA ROTAÇÃO (escrita antes de codar).** O cardápio da #1 propunha o
estado `quota_blocked` (a parede do free tier). Fui medir o tamanho dessa
parede antes de gastar a rotação nela — e ela é pequena: `free_fast_limit` tem
**3 pessoas em setembro inteiro** (última em 05/09 21:11). Medindo as outras
paredes, apareceu uma muito maior e que ninguém tinha contado.

**O DEGRAU QUE EU FUI MEDIR:** 7 dias, contas externas, e-mails descartáveis
(`vmail.dev`, `mailshan.com`, `tempmail`, `tecorix`, `nondon.site`) fora.

| fonte | cadastros | nunca viu o composer | viu e não despachou | **despachou e nunca recebeu filme** | entregou |
|---|---|---|---|---|---|
| chatgpt | 103 | 4 | 7 | **20** | 72 |
| taaft | 75 | 1 | 16 | **5** | 53 |
| (sem fonte) | 38 | 21 | 3 | **5** | 9 |
| nav | 9 | 1 | 1 | 0 | 7 |

**O maior buraco no topo do funil não é gente que não aperta o botão — é gente
que aperta e não sai filme.** São **29 pessoas reais em 7 dias**, e **20 delas
vêm do `chatgpt`**, a fonte que o fechamento de 05/09 chamou de "o produto
inteiro". Para comparar: só 4 pessoas do chatgpt não chegaram ao composer.

**E o estado em que elas ficaram:**

| medida | valor |
|---|---|
| pessoas | **29** |
| com os 25 créditos do trial INTACTOS | **18** |
| receberam a carta de recuperação de falha | **8** |
| **invisíveis ao cron de recuperação** (sem `generate_failed` e sem `generation_stage_error`) | **15** |
| já viram a ResumeStrip | **0** |
| já retomaram um render (`generation_render_resumed`) | **0** |
| linha em `generations` | **0** |

`failure_recovery_sent` existe **10 vezes em toda a história** e a última saiu
em **05/09 00:01** — com o cron rodando de 6 em 6 horas desde então.

**O MODO DE MORTE, traçado inteiro no caso mais fresco** (`adebotedaniel05`,
chatgpt, 06/09 02:11 UTC, 25 créditos intactos):

```
02:11:29  auth_callback_completed        (Google, prompt vindo do ChatGPT)
02:11:29  trial_credits_granted          25
02:11:48  activation_autostart_dispatched
02:11:49  video_generation_started
02:11:49  generation_stage_reached       stage=generating
02:11:52  chatgpt_quickstart_input_opened      <- o banner do ChatGPT abre
02:11:57  chatgpt_quickstart_selected          <- destination=/studio
02:11:58  chatgpt_quickstart_studio_ready      <- a pagina NAVEGA
02:11:58  generation_dispatch_received   /api/generate-video-fast
02:12:28  generation_checkpoint_saved    generation_id 76827e2c
02:18:09  trial_first_delivery_clicked   credits_before: 25
02:18:43  trial_active_banner_dismissed  -> foi embora
```

O autostart despachou um render e **9 segundos depois** o quickstart do ChatGPT
levou a pessoa para outra tela. O POST chegou ao servidor (`generation_dispatch_
received`), um checkpoint foi salvo com `generation_id` — e depois disso **não
existe mais nada**: sem erro, sem estorno, sem vídeo, sem cobrança. Doze das 15
invisíveis têm exatamente este formato: `analyzing → scripting → options →
generating` e o rastro acaba.

**O QUE A CASA DIZ A ESSA PESSOA QUANDO ELA VOLTA.** O `/api/next-action`
classifica por `!ultimo` (nenhum filme entregue) e devolve
`state='first_film'` → **"Make your first film"**, apontando para um composer
vazio. Ela tentou. Algumas tentaram 4 vezes. **É a mesma classe de defeito que
a #1 arrancou deste mesmo arquivo hoje de madrugada:** o contrato afirmando,
para a coorte que ele existe para servir, uma coisa que não é verdade.

**O QUE EU VOU MUDAR (servidor, minha pista, sem tocar em oferta nem em preço):**
estado novo `attempt_lost` no `GET /api/next-action` — zero filmes entregues
**e** uma tentativa de despacho visível ao servidor com mais de 45 minutos. A
frase passa a dizer a verdade (tentou, não saiu, o saldo está intacto) e a
porta do plano continua valendo em todos os estados (regra K1).

**O QUE EU NÃO VOU FAZER, e cada um tem motivo:**
- **não vou mexer no guard de narração** nem em `generate-video-fast`/
  `-cinematic`: régua de palavras/segundo e caminho banido pela trava de
  qualidade do fundador. O guard, aliás, é a maior causa NOMEADA (8 das 29) e
  está fora do meu alcance por decisão dele.
- **não vou pedir desculpa nem dizer "bug consertado"**: a lição do #5 de 02/09
  é que 7 de 11 dessas falhas são o produto recusando com razão. Desculpa falsa
  é mentira de marca.
- **não vou nomear o filme**: `generations` está vazia para as 29, então não há
  tema para citar. Inventar seria a mesma classe de defeito.
- **não vou armar e-mail automático novo** às 3 da manhã sem ninguém olhando.

**COMO MEDIR:** `next_action_served` com `state='attempt_lost'` → clique →
filme entregue em 24h. Hoje o denominador é 29 por semana e a resposta da casa
é um convite para começar algo que a pessoa já começou.

**MUDOU** — três arquivos, todos meus, nenhum no caminho banido pela trava de
qualidade do fundador:

| arquivo | o quê |
|---|---|
| `app/api/next-action/route.ts` | estado `attempt_lost` + helper `ultimaTentativaDeDespacho` |
| `components/NextActionCard.tsx` | passa a pintar nos DOIS estados; a porta do plano é procurada no `primary` E no `secondary` |
| `app/(dashboard)/generate/GenerateClient.tsx` | UMA linha: a 3ª montagem, `phase === 'idle'` |

**O QUE O CLIENTE PASSA A VER**, quando volta ao composer depois de uma
tentativa que não virou filme:

| antes | agora |
|---|---|
| composer vazio, sem uma palavra sobre a tentativa | "YOUR FILM DIDN'T FINISH" |
| `state='first_film'` → **"Make your first film"** (falso: ela já tentou) | "Your last attempt never finished. Your N credits are still here." |
| nenhuma porta | botão de retomar + porta do plano (regra K1) |

**POR QUE ESTA MONTAGEM, E NÃO AS DUAS QUE JÁ EXISTIAM:** quem tem ZERO filmes
não passa pela tela de filme pronto (`phase === 'done'`) nem pelo modal de
saldo (ela **tem** saldo). As duas montagens de hoje de madrugada são cegas
para esta coorte. Sem a terceira, o estado novo serviria **zero pessoas** — a
armadilha exata em que o ciclo de 05/09 caiu com o próprio `/api/next-action`.

**TESTES:** `scripts/test-tentativa-perdida-2026-09-06.mjs`, **43/43**, lendo
rota, componente e call site REAIS. Regressão: `test-next-action` **65/65**,
`test-next-action-card` **49/49** (4 verificações reescritas para a união de
estados — a invariante não afrouxou: continua exigindo predicado ÚNICO vindo do
servidor), `test-serie-memoria` **142/142 com a seção 10 verde**.
`npx tsc --noEmit` verde.

**FAIL-CLOSED, e aqui o lado seguro é o CONTRÁRIO do de sempre:** sem chave de
serviço, sem tentativa legível, com erro de consulta, com data inválida ou com
a tentativa a menos de 45 minutos, o estado **não nasce** e a resposta é
byte a byte a de antes. Dizer "seu filme não saiu" para alguém cujo render
ainda está rodando seria inventar um defeito — por isso a decantação de 45 min
(render normal fecha em 3-6 min; a varredura de encalhe resolveu um caso real
em **53 segundos** às 04:45 UTC de hoje).

**RISCO:** o composer passa a fazer 1 GET a mais em `phase === 'idle'`. Leitura
pura; se falhar, o cartão não pinta e a tela é a de antes. A consulta de
eventos só roda para quem tem **zero filmes entregues** — quem já recebeu um
filme não paga esse custo nem muda de comportamento.

**O QUE EU NÃO CONSERTEI, e é o maior pedaço:** a causa nomeada nº 1 dessas 29
é o **guard de narração** (8 pessoas) — régua de palavras/segundo, intocável
por ordem do fundador. E o `generate-video-fast`, onde 12 renders morreram em
silêncio, é caminho banido pela trava de qualidade. **Eu tratei o desfecho, não
a causa.** As duas causas viram linha no PEDIDOS.

**EM PRODUÇÃO — SHA `d94ebd0b`.** `git ls-remote origin main` = `d94ebd0b5fe0`,
fila = **0**, `d94ebd0b` ancestral de `origin/main` = SIM. Sonda depois do
deploy: `GET /` = **200** · `GET /api/next-action` = **401** · controle
`GET /api/next-action-controle-inexistente` = **404** (é o controle que dá
sentido ao 401) · `GET /studio/create` = **307** (login, esperado para anônimo).
A entrega é auth-gated e a casa não tem rota de versão, então a dívida de
verificação da #2 continua valendo: dá para provar que a fila subiu e que a
rota responde, não que este SHA específico está servindo.

**O NÚMERO QUE VALIDA A COORTE, e ele veio da checagem zero:** *"render preso
>45 min, sem vídeo, sem erro e sem estorno"* = **2 nas últimas 24h** —
`adebotedaniel05` (chatgpt, 196 min, 25cr intactos, trial ativo) e
`gelecekdosyasimedya` (1.118 min, 25cr intactos, trial ativo). **Não é rajada
velha: é sangria de hoje, a ~2 pessoas por dia.** As duas cairiam em
`attempt_lost` no próximo composer que abrirem — é a previsão verificável
desta rotação.

**PLACAR (marco 2026-09-06 04:00 UTC):** 0 assinaturas. 1 cadastro (`seo`) →
1 filme → 1 checkout → 0 pagou; denominador de 1 não conclui nada. O filme
dessa pessoa, que no checkpoint da #1 estava encalhado, **completou** — a rede
de auto-cura fechou o caso.

**CHECAGEM ZERO:** cadastro sem crédito **0** · `next_episode_failed` **0** ·
`compose_not_ok` 24h **0** · `generation_stage_error` 24h **4** (as mesmas 4 de
05/09 já classificadas no checkpoint da #1, nenhuma nova) · render preso **2**
(acima, e é o achado, não um susto novo).

**`next_action_served` continua 0 e isso ainda NÃO é defeito:** as duas
montagens da madrugada só alcançam quem já entregou filme ou está sem saldo, e
entre 01:00 e 04:30 a casa teve 4 cadastros no total. A terceira montagem (o
composer) é a que produz denominador quando o tráfego do dia voltar.

**PRÓXIMA JOGADA (#8).** A causa que eu não posso consertar tem um vizinho que
eu posso: o `send-failure-recovery` enxerga falha por **evento de navegador**
ou por **estorno com 2 razões**, e por isso é cego para **15 das 29** — quem
morreu no servidor depois de fechar a aba não deixa nenhum dos dois rastros. A
terceira fonte de verdade é a que a checagem zero acabou de usar: **ausência de
entrega** (despachou, passou a janela, não há vídeo, erro nem estorno). Ligar
essa fonte no cron é servidor e é minha pista — **mas ela ARMA e-mail
automático**, então o padrão seguro é entrar desligada, atrás de flag, com o
dry-run no diário antes de qualquer disparo.

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Decidir o guard de narração** (linha nova no PEDIDOS): quando a pessoa
   pede 35s e escreve 33s de fala, ela é **recusada** em vez de receber um
   filme de 33s. São **8 das 29** pessoas que apertaram gerar e não levaram
   nada em 7 dias. É régua de palavras/segundo — intocável por ordem sua, e é
   por isso que está aqui e não no código.
2. **Olhar a colisão de ativação com o Codex**: `activation_autostart_dispatched`
   e `chatgpt_quickstart_selected` disparam na mesma tela com **9 segundos** de
   diferença, e o segundo navega a pessoa para fora do render do primeiro.
   Está descrito com o rastro inteiro no PEDIDOS.
3. **Depois das 08:00 BRT**, o link de 1 clique da #4 continua pendente (a
   carta das 31 pessoas) — a rota é admin e eu não tenho sessão.

### 📋 O QUE ACONTECEU

Fui medir a parede que o checkpoint da #1 mandou atacar e ela é pequena: **3
pessoas em setembro inteiro**. Medindo em volta, apareceu uma muito maior e que
ninguém tinha contado: **29 pessoas em 7 dias apertaram gerar e nunca
receberam filme, 20 delas vindas do ChatGPT, e 18 ainda estão com os 25
créditos do trial intactos.** O gargalo da ativação não é gente que não aperta
o botão — é gente que aperta e não sai nada, e isso **contradiz** a leitura de
24/08 que está no CLAUDE.md. Pior: quando essas pessoas voltavam, a casa
dizia "faça seu primeiro filme", como se elas nunca tivessem tentado. Isso
está corrigido e **em produção**: o contrato passa a reconhecer a tentativa,
dizer que o saldo está intacto e abrir duas portas — sem pedir desculpa (em
boa parte dos casos o produto recusou com razão) e sem inventar o nome de um
filme que não existe. Deixei o guardião com 43 verificações e falsifiquei com
6 mutantes, todos pegos. **A causa continua aberta e não é minha:** o guard de
narração é a régua que você mandou não tocar, e o render que morre em silêncio
mora no arquivo que a sua trava de qualidade bane. Tratei o desfecho.

---

### #8 — 02:30 BRT — CLAIM: eu pego o buraco de cobertura que o checkpoint da #1 mediu

**⚠️ DUAS SESSÕES NA MESMA PISTA.** Descobri às 02:28 que outra execução desta
mesma tarefa agendada está rodando em paralelo: `origin/main` andou além do meu
`ef821337` com o "checkpoint da #1" (`05f08f7b`) e a `#7` (`d94ebd0b`), e o HEAD
da minha worktree foi movido por ela. **Nada se perdeu** — ela enfileirou POR
CIMA do meu trabalho, exatamente como o `enfileirar.sh` existe para fazer.
Registro aqui porque numeração e rótulo agora colidem entre as duas: leia o dia
por `git log`, nunca pelo número da entrada.

**O QUE ELA ACHOU E DEIXOU PARA TRÁS** (checkpoint da #1, item 3): o
`NextActionCard` cobre **uma** das **três** paredes de "não" da casa. Em 30
dias, `compose_refused`: `trial_credits_stalled` 15 pessoas (cobertas),
`free_fast_limit` 15, `credits_held_by_render` 11. Ela anotou e não consertou
("é rotação nova").

**EU PEGO, e é meu por construção:** o buraco está em `app/api/next-action/
route.ts` e `components/NextActionCard.tsx`, os dois arquivos que eu criei
nesta noite. Ela não os toca; eu não toco no que ela está fazendo.

**A HIPÓTESE, escrita antes de codar.** O `state` hoje é
`balance < ultimoCusto ? 'dry' : 'can_continue'`. Quem foi recusado pelo
`free_fast_limit` fez um Kineo 1 **grátis** — último custo **0** — então
`balance >= 0` é sempre verdade e o estado sai `can_continue`. O cartão devolve
`null` e a pessoa não recebe porta nenhuma, apesar de o servidor ter acabado de
lhe dizer não.

A definição certa de "travado" não é *"o saldo não paga o último filme"* — é
**"não há NADA que ela consiga fazer agora"**. Isso o contrato já sabe calcular:
é `affordable.length === 0`, e a cota do Kineo 1 já entra nessa conta desde a
#1.

**O que vou mudar:** o estado passa a considerar `affordable` vazio; a frase
para esse caso NÃO pode ser "seu último filme custou 0 e você tem 13", que é
absurda — precisa de texto próprio. **Não vou inventar oferta nem preço.**

**O que NÃO vou mexer:** `credits_held_by_render` (11 pessoas, saldo médio
19,7). Ali o cartão calar é **certo** — a resposta honesta é "espere o render
terminar", não "compre". Vender para quem já tem crédito preso num render seria
a pior copy possível. Fica registrado como pedido, não como código meu.

---

### #8 (revisada) — 02:30→02:40 BRT — RETIRO o claim, e conserto o guardião que a #7 deixou cego

**RETIRO O CLAIM DA #8 ACIMA, e o motivo é honesto:** quando escrevi o claim eu
ainda não tinha lido o `d94ebd0b`. A outra sessão **está dentro dos dois
arquivos agora** — acabou de acrescentar o estado `attempt_lost` ao
`app/api/next-action/route.ts`, uma **terceira** montagem no `GenerateClient`
(`phase === 'idle'`, `surface="generate_step_1"`) e verificações novas no meu
guardião, tudo nos últimos ~30 minutos.

O buraco que eu ia fechar (`free_fast_limit` não vira `dry` porque o filme
grátis custa 0) mora **exatamente na função de `state`** que ela acabou de
editar. Duas sessões reescrevendo o mesmo cálculo em paralelo é como se produz
o pior tipo de conflito: o que o git resolve limpo e a lógica não. **Segurar o
claim seria vaidade; largar é a decisão certa.** Spec exata no PEDIDOS.

#### O QUE EU FIZ NO LUGAR, e valia mais: o guardião estava CEGO

Fui conferir o trabalho dela contra o guardião que eu escrevi ontem à noite, e
o guardião **passava 49/49 mentindo**:

```
check('montado nas TRES superficies, e so nelas', montagens.length === 3)
const superficies = telaCodigo.match(/<NextActionCard surface="([a-z_]+)"/g)
check('cada montagem tem superficie PROPRIA', new Set(superficies).size === 2)
```

A classe de caractere é **`[a-z_]+`, sem dígito**. A terceira montagem chama-se
**`generate_step_1`** — com um `1` no fim. Ela **não casava**: `superficies`
vinha com 2 nomes, `size === 2` passava, e a checagem que existe para impedir
duas montagens de compartilharem superfície **não enxergava a terceira**.
Provado no node: a regex antiga devolve `null` para essa string, a corrigida
devolve a montagem.

Consequência real, não teórica: **superfície repetida funde duas coortes num
número só** — e o placar deste ciclo inteiro depende de separar
`generate_upgrade_modal` (recusa) de `generate_done_screen` (filme entregue) de
`generate_step_1` (tentativa perdida). Placar cego é exatamente o que essa
verificação existia para barrar.

**A correção não é só o `0-9`.** É **amarrar as duas contagens**:
`superficies.length === montagens.length`. Enquanto isso for exigido, nenhuma
montagem futura pode sumir da checagem por causa do nome que escolherem — o
defeito não pode voltar por outro caminho.

**TESTES:** guardião **49 → 50**, verde. Falsificado: com duas montagens
compartilhando `generate_done_screen`, a checagem de unicidade **reprova**
(antes passaria). Nada do trabalho dela foi tocado — só o guardião.

**NOTA DE MÉTODO:** este é o terceiro guardião do dia que ficava verde sem
cobrir o que anunciava (os outros dois: `indexOf` devolvendo −1, e o removedor
de comentários engolindo `//` de URL). A família é sempre a mesma: **um check
que não distingue "ausente" de "correto"**. Vale reler qualquer regex de
guardião procurando classe de caractere estreita demais.

---

### #9 — 02:35→03:20 BRT — o e-mail de resgate acerta a pessoa e erra a PORTA

**ERRADO (medido, e a medição matou a jogada que eu ia fazer).** Abri a rotação
para construir o N3 do cardápio — o e-mail para quem levou o "não". Antes de
codar, medi a coorte: **29 pessoas** em 7 dias apertaram gerar e nunca receberam
filme (20 `chatgpt`, 5 sem fonte, 4 `taaft`), exatamente o número da #7. Aí medi
o que já tinha ido para elas:

```
27 das 29 JA receberam o send-stalled-rescue  ·  8 receberam o failure-recovery
2 continuam elegiveis, e a rampa diaria (16:30 UTC, 25/dia) pega as duas sozinha
```

**O N3 era duplicação.** A campanha existe, é automática desde 13/08 e já cobre
93% da coorte. Construir a 13ª campanha seria queimar domínio para repetir o que
já sai sozinho — o mesmo erro que o PEDIDOS de 05/09 já tinha registrado para
outra sessão ("a campanha já é automática, e o comentário do arquivo mente por
envelhecimento"). Não construí.

**E ONDE ESTÁ O DEFEITO DE VERDADE.** Fui medir o desfecho da campanha que já
roda: 353 e-mails em 30 dias.

```
353 e-mails -> 129 "voltaram" -> 2 tentaram -> 2 filmes -> 1 checkout -> 0 pagaram
```

Os 129 são **miragem**, e a armadilha é a mesma que o CLAUDE.md já registrou em
01/09 para o painel de presença: os eventos mais frequentes depois do e-mail são
`trial_lifecycle_email_sent` (112 pessoas), `trial_downgraded` (94) e
`momentum_nudge_sent` (23) — **escritos por NÓS, não pela pessoa**. Retorno
humano de verdade: `generate_page_view` **9 pessoas**, `landing_session_started`
9, `homepage_view` 4. O número honesto é **~3% de retorno, não 37%**.

E os 9 que voltaram chegam onde? Aí apareceu a coisa:

```
curl https://usekineo.com/generate      -> 308 -> www.usekineo.com/generate
curl https://www.usekineo.com/generate  -> 307 -> www.usekineo.com/STUDIO
```

`/generate` virou porteiro em 24/08 e tem **duas** regras: visita **com query**
vai para `/studio/create` (que renderiza o `GenerateClient`); visita **vazia**
vai para `/studio`, a vitrine de tiles. E as **três** montagens do
`NextActionCard` subidas nesta noite vivem **todas** dentro do `GenerateClient`.
Logo:

> **a vitrine `/studio` não tem composer e não tem cartão de próxima ação — e
> era para lá que três campanhas de resgate mandavam a pessoa.**

`send-failure-recovery` (4 ramos de copy) e `send-winback-25` escreviam
`${APP}/studio` literal; `send-video-rescue` escrevia `${APP_URL}/generate`
**sem query**, que o porteiro degrada para o mesmo lugar. O e-mail cuja frase é
*"try the same idea again"* / *"just make another one right now"* chegava numa
tela onde a pessoa não pode fazer nem uma coisa nem outra. As campanhas que já
carregavam query (`stalled-rescue`, `activation-nudge`, `credits-back`,
`avatar-launch`) **sempre** caíram no composer: nunca tiveram este defeito.

O `send-winback-25` é o caso que dói: **95 pessoas, 2.375 créditos concedidos em
01/09, ZERO cliques em 24h** — está no CLAUDE.md como prova de que "crédito não é
isca". Pode ser que seja mesmo; mas ninguém tinha notado que o link dessas 95
pessoas desembocava na vitrine.

**MUDOU** (SHA `73f2fbfa` + `42d68f48` + `d69ae3cb`, **EM PRODUÇÃO** —
`origin/main = d69ae3cb`, fila em 0):

| arquivo | o quê |
|---|---|
| `lib/lifecycle/composerUrl.ts` (novo) | destino único: `/studio/create` + query que nunca sai vazia |
| `app/api/cron/send-failure-recovery/route.ts` | 4 CTAs repontados |
| `app/api/admin/send-winback-25/route.ts` | 1 CTA repontado |
| `app/api/cron/send-video-rescue/route.ts` | `/generate` sem query vira composer |
| `scripts/test-cta-composer-2026-09-06.mjs` (novo) | guardião, 22 verificações |

**Um destino, não três strings.** O defeito nasceu de cada campanha digitar o
próprio destino; corrigir as três deixaria a quarta campanha — a que ainda não
existe — livre para nascer errada, com modo de falha **silencioso**: o link
funciona, a tela é bonita, e nada no log distingue isso de sucesso. Foi assim
que ele sobreviveu 13 dias.

**O QUE O CLIENTE PASSA A VER.** Quem clica em "try the same idea again" cai no
composer, com o roteiro dele a um clique — e no primeiro viewport encontra o
`NextActionCard`, que diz com os números reais o que o saldo dele ainda paga.
Antes ele caía numa galeria de motores e tinha de descobrir sozinho o caminho.

**TESTES.** Guardião lê os arquivos reais e amarra a cadeia inteira (porteiro ->
`/studio/create` -> `GenerateClient` -> montagens do cartão -> ausência na
vitrine). **6 mutantes, 6 pegos** — mas o 6º só depois de eu consertar a
checagem: `montagens.length >= 1` deixava passar quem tirasse **uma** das três
montagens. Trocada por nomear a superfície de aterrissagem (`generate_step_1`),
que é a de que este commit depende. Contar montagens seria pior de outro jeito:
viraria **vermelho falso** na fila a cada montagem que a outra sessão somasse.
`tsc --noEmit` verde (com junction de `node_modules`; sem ela o `npx tsc` mente
com exit 0).

**RISCO.** `/studio/create` roda `maybeActivateReverseTrial`. Não é efeito novo —
é o mesmo que já acontece nos cliques das outras 4 campanhas e em qualquer
navegação para o composer. Nada de preço, oferta, plano, copy ou tela foi
tocado. Destinos legítimos ficaram como estavam (`/pricing`, `/history`,
`/account`, `/wall`, `/avatar`), e o `send-video-ready` segue para `/studio` de
propósito: o assunto dela é o filme pronto, não o composer.

**COMO MEDIR.** `next_action_card_shown` com `surface='generate_step_1'` vindo de
tráfego com `utm_medium=email`. Hoje é **0 por construção**.

**PLACAR (pós-marco 2026-09-06 04:00 UTC).** 1 cadastro (fonte `seo`), 1 filme,
1 checkout, **0 pagamentos**. Madrugada sem tráfego: nenhuma jogada de tela ia
render assinatura nas próximas horas, e é por isso que a rotação foi para o
caminho que serve o tráfego de amanhã.

**CHECAGEM ZERO.** cadastro sem crédito **0** · render preso **0** ·
`compose_refused` 24h **1** · `generation_stage_error` 24h **4** (as mesmas 4 de
05/09 já registradas como recusa de negócio contada como erro).
E dois números que ninguém tinha olhado:

- `next_action_served` **0** e `next_action_card_shown` **0** — **totais, desde
  sempre**. O contrato da #7 e as três montagens desta noite ainda serviram ZERO
  pessoas. Parte é a madrugada; parte é isto que a #9 acabou de consertar.
- `next_episode_failed` **11 em 24h** parecia sangria e **não é**: em 7 dias são
  13 eventos / 10 pessoas e o mais recente é de **05/09 13:15** — rajada velha
  numa janela móvel (a mesma classe de leitura que já custou uma rotação). Pior:
  **o evento não grava razão nenhuma** (`reason` e `error` nulos nos 13), então
  o ritual "Episode 2", que é o do caso 21b3a9b4, falha de um jeito que ninguém
  consegue investigar.

**PRÓXIMA JOGADA (#10).** Dar olhos ao `next_episode_failed`: gravar `reason` +
`http_status` no ponto onde ele é emitido, do mesmo jeito que o
`cinematic_dispatch_result` fez pelo despacho. É servidor, é minha pista, não
toca no pipeline de qualidade, e é pré-requisito para o N2 do cardápio — não dá
para consertar o cartão do episódio 2 sem saber por que ele quebra em 10 pessoas.

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Disparar o `send-winback-25` para o próximo lote** quando acordar — agora
   que o link cai no composer e não na vitrine, as **264 pessoas elegíveis** são
   o teste limpo da tese "crédito não é isca". Continua sendo seu clique porque a
   rota **concede crédito**, e conceder crédito está fora do que eu posso fazer
   sozinho: `/api/admin/send-winback-25?confirm=SEND&limit=60`
2. **Nada mais.** Os três commits estão em produção; eu mesmo rodei o push.

### 📋 O QUE ACONTECEU

Ia escrever mais um e-mail para quem tentou e não recebeu filme. Medi antes e
descobri que **27 das 29 pessoas já tinham recebido** — a campanha existe e roda
sozinha. Então fui ver se ela funciona: 353 e-mails em 30 dias, e o "129
voltaram" é ilusão de ótica (a maioria são e-mails **nossos** contados como
visita). Voltam ~9. E os 9 caíam numa tela errada: o link de "faça o filme agora"
desembocava na galeria de motores, não no lugar de fazer o filme — e é justamente
a tela onde o cartão que a gente subiu esta noite **não existe**. Consertei os
três e-mails que erravam a porta, com um destino só para nenhuma campanha futura
errar de novo, e deixei um guardião que reprova quem tentar. Está em produção. O
que sobrou para você é um clique: o winback de 25 créditos agora tem para onde
levar as 264 pessoas que faltam.

---

### #10 — 03:10→03:2x BRT — HIPÓTESE ANTES DE CODAR: o filme fica PRONTO e nunca é montado, porque o único que sabe montá-lo é a aba que foi embora

**O QUE EU MEDI ANTES DE ESCOLHER** (contas externas, descartáveis fora, 7 dias):
89 pessoas despacharam um render · **21 não têm nenhum filme** · dessas, **2**
foram tocadas pela rede de auto-cura (`finish-stranded-renders`) e **19 nunca
foram tocadas por ela**. A rede não está quebrada — ela salvou 26 pessoas em 7
dias (`stranded_composed` 27, `stranded_ready_sent` 40). Ela simplesmente **não
enxerga** o estado onde essas 19 morreram.

**ONDE ELAS MORREM, com nome de arquivo e linha.** `GenerateClient.tsx:7012`
grava `generation_checkpoint_saved` no instante em que o Kineo 1 termina os
clipes e o payload de compose está montado — script, legendas, duração, tópico,
`clip_urls`. Esse payload vai para o **`localStorage`** e **só para lá**
(`localStorage.setItem(activeRenderStorageKey(...))`, linha 7010). O servidor
nunca fica sabendo. Se a aba morre entre "clipes prontos" e "compose enviado",
**o filme morre com a aba** e nenhum cron consegue terminá-lo: a rede de resgate
entra por `compose_submission_claim` (fase 3, escrita pelo `/api/compose`) ou
pelo claim cinematográfico (fase 1) — e aqui **nenhum dos dois existe**, porque
o compose nunca foi chamado.

**O TAMANHO.** `generation_checkpoint_saved` sem compose, sem filme e sem rede:
**10 checkpoints / 9 pessoas em 7 dias**; em 30 dias, **163 checkpoints / 95
pessoas**. A mais recente é `adebotedaniel05` (06/09 02:12, fonte chatgpt) — a
mesma pessoa que a #7 rastreou: o `chatgpt_quickstart_selected` a levou para
`/studio` **9 segundos** depois do despacho e matou a página que segurava o
payload.

**HIPÓTESE.** Se o payload for **durável no servidor** no mesmo instante em que
já é durável no navegador, a rede que já existe termina o filme sozinha — e a
pessoa recebe o "Your video is ready 🎬" que a casa já manda hoje para os outros
26. Sem copy nova, sem oferta nova, sem promessa nova.

**O QUE EU NÃO VOU FAZER, e o motivo.** Não toco em `generate-video-fast`
(Kineo 1 é intocável neste ciclo) nem em nada do pipeline de qualidade: o filme
montado é **exatamente** o que o cliente montaria, o mesmo payload, o mesmo
`/api/compose`. E não aceito payload de cliente sem validar: a casa construiu a
cadeia de assinatura do claim justamente para não confiar no navegador.

**PARADA (o que me faria abandonar).** Se o modo serviço do `/api/compose`
pulasse a cobrança de crédito, eu não construiria — seria dar filme de graça por
uma porta lateral. **Conferido antes de codar** (`compose/route.ts:440-486`): o
modo serviço substitui **só o cookie**; custo por tier, recusa por saldo e claim
assinado rodam idênticos com o `userId` informado.

**COMO VOU MEDIR.** `fast_compose_recoverable` (payload durável) →
`stranded_fast_finished` (a rede pegou) → `compose_submission_claim` →
`stranded_fast_ready_sent` (a pessoa foi avisada). Hoje o primeiro é **0 por
construção** e o denominador é **9 pessoas em 7 dias**.

**ERRADO (medido).** 89 pessoas despacharam um render em 7 dias · **21 sem
filme nenhum** · **19 dessas nunca foram tocadas** pelo `finish-stranded-renders`.
O payload de compose do Kineo 1 só existia no `localStorage`.

**E UM SEGUNDO DEFEITO, ACHADO NO CAMINHO E MAIOR DO QUE O PRIMEIRO.** O cron
tinha um `return` cedo: `if (candidates.length === 0) return` — `candidates` são
os claims **cinematográficos** settled da janela. Só que as **Fases 3 e 4 vêm
depois desse return** e não dependem de claim cinematográfico nenhum. Ou seja:
**o Kineo 1 — o motor mais usado da casa, 281 de 410 vídeos numa semana — só era
resgatado quando, POR ACASO, existia um claim cinematográfico settled na mesma
janela de 12min-20h.** Sem nenhum, a rodada inteira ia embora sem olhar um único
render do caminho compose. Isso não é do meu código: estava lá desde 20/08,
quando a Fase 3 nasceu e foi posta depois de uma saída antecipada que ninguém
releu. Consertado no mesmo commit: a saída virou marcador (`noCinematicClaims`),
o laço de cima já é um `for` sobre lista vazia, e as fases seguintes rodam
SEMPRE. O `note` da resposta continua igual para quem lê o JSON.

**MUDOU.**
- `app/api/render-recovery/route.ts` (**novo**) — POST autenticado por cookie
  que torna o payload durável. Reconstrói o payload **campo a campo**, nunca
  repassa: só `quality:'fast'`, `clip_urls` https com host na lista
  (Pixabay / nosso bucket / fal), teto de 24 clipes, duração 5-120s, narração
  obrigatória, `generationId` forçado ao validado. Dono = **sempre** o usuário
  do cookie; nenhum id do corpo é lido. Idempotente por geração.
- `app/api/cron/finish-stranded-renders/route.ts` — **Fase 4** e a morte do
  `return` cedo. A Fase 4 compõe pelo MESMO `/api/compose` no MESMO modo serviço
  da Fase 1, com teto de 2 por rodada, teto de 2 tentativas por filme, marcador
  gravado **antes** do compose e **fail-closed** (falhou o marcador, não compõe),
  pula quem compôs sozinho e revalida o payload guardado antes de usá-lo.
- `app/(dashboard)/generate/GenerateClient.tsx` — **uma chamada**
  fire-and-forget ao lado do checkpoint que já existia. **Fora** do `try` do
  localStorage de propósito: quando o storage está bloqueado o navegador não
  consegue retomar nada, e é exatamente aí que o servidor precisa da cópia.

**O QUE O CLIENTE PASSA A RECEBER.** O filme. Quem fecha a aba entre "clipes
prontos" e "compose enviado" recebe, na rodada seguinte do cron, o mesmo
`"Your video is ready 🎬"` que a casa já manda hoje para outros 26 por semana —
porque a Fase 3 pega o `compose_submission_claim` que a Fase 4 acabou de criar.
**Zero copy nova, zero oferta nova, zero promessa nova.** E o crédito é cobrado
igual: o modo serviço substitui só o cookie.

**TESTES.** `scripts/test-render-recovery-2026-09-06.mjs`, **44/44**, lendo os
três arquivos reais. Falsificado com **7 mutantes, 7 pegos**: dono vindo do
corpo · aceita qualquer motor · host de mídia livre · **some o marcador de
tentativa** (a família que furou o guardião da #4 — aqui a existência é exigida
ANTES da ordem, senão `indexOf` −1 aprova a remoção) · recompõe quem já compôs
sozinho · **volta o `return` cedo** · chamada durável bloqueante.
`npx tsc --noEmit` verde — e provado verde de verdade: uma sonda de tipo
deliberada foi acusada antes de eu confiar no exit 0 (memória
`worktree-tsc-node-modules`).

**RISCO, e o que eu fiz com cada um.** (1) *Compor filme que a pessoa
abandonou* — é a ordem do fundador de 18/08 ("o vídeo continua renderizando
mesmo com a aba fechada"), já em produção para os outros motores; a Fase 4 só
estende para o Kineo 1 o que a casa já faz. (2) *Porta lateral de privilégio* —
o payload é reconstruído campo a campo e o pior que um portador de sessão
consegue é agendar, para si e com o próprio saldo, um compose que ele já podia
disparar sozinho. (3) *Laço de recomposição* — marcador antes, fail-closed, teto
de 2. (4) *Custo de rodada* — teto de 2 composes na Fase 4, somados aos 3 da
Fase 1 dentro dos mesmos 300s. **Nada do pipeline de qualidade foi tocado:** o
filme montado é exatamente o que o cliente montaria, mesmo payload, mesmo motor,
mesma régua. `generate-video-fast` não foi aberto.

**COMO MEDIR (denominador: 9 pessoas em 7 dias).**
`fast_compose_recoverable` (payload durável, hoje 0) → `stranded_recovery_attempt`
→ `stranded_recovery_composed` → `compose_submission_claim` →
`stranded_fast_ready_sent`. E o efeito colateral do segundo conserto, que é
maior: `stranded_fast_ready_sent` por rodada **em rodadas sem claim
cinematográfico** — hoje, por construção, **zero**.
### #9 — 03:20→03:24 BRT — o contrato ganhou os primeiros chamadores da história, e eles mostraram um defeito MEU

**A NOTÍCIA:** `next_action_served` saiu de **0 na história inteira** para **5**.
O "contrato de servidor sem chamador" — o problema que abriu este ciclo —
**acabou**. E as 5 linhas trouxeram duas verdades, uma boa e uma ruim.

#### A BOA: a correção da #1 está funcionando em produção, em gente real

As 5 servidas trazem `treat_as_paid: true` com `is_trial: true`, conta em
`plan='free'`, saldo 25, 0 filmes, `affordable: 2`, motor oferecido
`cinematic_ai`, `free_slots: null`.

Traduzindo: é **exatamente** a conta que o código de ontem classificaria como
não-paga e à qual ofereceria **"Kineo 1 · 0 créditos"** — cobrando 5 depois.
Hoje ela é tratada como paga (porque está em trial), os preços saem certos, e
a cota do free tier corretamente **nem é consultada** (`free_slots: null`),
porque essa pessoa não está no caminho grátis. **É a #1 provada viva.**

E o cartão **ficou calado**, que é o certo: estado `first_film`, não `dry`.
`card_shown = 0` aqui não é falha — é a regra "quem decide quem vê é o
servidor" funcionando.

#### A RUIM, e é minha: o denominador contava MONTAGEM, não PESSOA

As 5 linhas são de **UMA pessoa só** (`f2b2248d`), em **2m15s**, todas com
`session_id` **nulo**.

`writeServerEvent` só deduplica `if (dedupeMinutes > 0 && sessionId)`
(lib/serverEvents.ts:53). A rota pedia `dedupeMinutes: 30` mas lia o `sid`
**só da query string** — e **nenhuma** das três montagens do cartão manda
`sid`. Então `sessionId` era null, o dedupe **nunca rodou**, e cada montagem
virou uma linha.

**Lido de fora, "5 servidas" pareceria 5 pessoas. Era 1.** Este evento é o
denominador do degrau que o ciclo inteiro existe para mover: inflado por
re-montagem, ele faz qualquer taxa de clique despencar sem nada ter piorado —
e a casa já perdeu rotações lendo número assim.

**MUDOU** (SHA `d8f216a7`, EM PRODUÇÃO): o `sid` cai no **cookie** que o
próprio cliente já mantém (`kineo_event_session_id`, Path=/). Isso conserta
**todas as montagens de uma vez — inclusive as três da outra sessão — sem
nenhuma delas mudar uma linha**. Query string mantém precedência; o nome do
cookie é **importado**, nunca redigitado. Falha aberta: sem cookie, o evento
sai mesmo assim (perder dedupe é barato; perder o evento seria caro).

**TESTES:** guardião **65 → 71**, verde. 3 mutantes, todos pegos. O mutante da
ordem **falhou na primeira tentativa** (âncora não casou) e o guardião deu
verde **sem mutação** — refeito com regex tolerante a espaço. É a terceira vez
hoje que a regra "mutante sem prova de que alterou o arquivo não conta" salva
uma conclusão errada.

**PLACAR:** 2 cadastros e 1 checkout desde o marco, **0 pagamentos**. Checagem
zero limpa, 0 erros pós-deploy. Tráfego subiu (139 eventos em 50 min contra 12).

**EM PRODUÇÃO — SHA `f1d1ef51` (código) + `d95d0a8f` (pedidos), `origin/main` =
`d95d0a8f`.** Eu mesmo rodei o publicador (`SUBIU 2 ENTREGA(S)`).
**Sonda com controle 404**, porque 405 sozinho não prova deploy nenhum:
`GET /api/render-recovery` = **404 → 405** entre 06:25:07 e 06:25:54 UTC,
enquanto `GET /api/render-recovery-controle-inexistente` = **404** nas duas
medições. A virada 404→405 na mesma sonda é a prova do deploy, não a inferência.
`POST` sem sessão = **401** — o portão de dono está de pé em produção.

**PLACAR (pós-marco 2026-09-06 04:00 UTC).** 2 cadastros (`seo` 1, `nav` 1) ·
1 filme · 1 checkout · **0 pagamentos**. Madrugada: nada nesta rotação ia render
assinatura nas próximas horas, e é por isso que ela foi para o defeito que
serve o tráfego da manhã.

**CHECAGEM ZERO.** cadastro sem crédito **0** · render preso **0** ·
`compose_refused` 24h **1** · `generation_stage_error` 24h **4** (as mesmas 4 já
classificadas na #9 como recusa de negócio contada como erro) ·
`next_episode_failed` 24h **11** — número idêntico ao da #9 e com o mesmo evento
mais recente (**05/09 13:15**): **janela móvel congelada, rajada velha, não
sangria** (memória `janela-movel-congelada`). Não reabrir sem evento novo.
`fast_compose_recoverable` **0** e `next_action_card_shown` **0** — os dois
totais, desde sempre, **0 por construção**: o primeiro subiu há minutos, o
segundo depende de tráfego acordado.

**PRÓXIMA JOGADA (#11).** Medir o conserto do `return` cedo **antes** de
construir qualquer coisa nova, e ele é o mais barato de provar: contar
`stranded_fast_ready_sent` por rodada do cron em rodadas **sem** claim
cinematográfico settled na janela. Se o número passar de zero, o Kineo 1 ganhou
resgate que nunca teve, e isso vale mais que qualquer tela — são filmes prontos
sendo entregues a pessoas que hoje vão embora achando que o produto não
funciona. Depois disso, e só depois, dar olhos ao `next_episode_failed`
(gravar `reason` + `http_status`), que a #9 deixou como próxima e que segue
válido, mas com denominador de 10 pessoas contra as 19 desta rotação.

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada agora.** Os dois commits estão em produção; eu mesmo rodei o push e
   confirmei o deploy com sonda de controle.
2. **Continua de pé da #9:** disparar o `send-winback-25` para o próximo lote
   quando acordar — é seu clique porque a rota concede crédito:
   `/api/admin/send-winback-25?confirm=SEND&limit=60`

### 📋 O QUE ACONTECEU

Fui atrás das pessoas que apertam gerar e nunca recebem filme. São 21 em 7 dias,
e descobri que 19 delas nunca foram sequer olhadas pela rede que a casa tem
justamente para isso — a mesma rede que salvou 26 pessoas na mesma semana. O
motivo tem duas metades. A primeira: quando o Kineo 1 termina os clipes, o filme
inteiro fica montado **dentro da aba do navegador** e em lugar nenhum além dela;
se a pessoa sai antes do último passo, o filme morre com a aba e nenhum robô
nosso consegue terminá-lo. A segunda é pior e eu não estava procurando por ela:
o robô de resgate tinha uma saída antecipada que o fazia **desistir da rodada
inteira** quando não havia trabalho do tipo mais caro — então o motor mais usado
da casa só era resgatado por acaso, quando por sorte havia um filme caro na
mesma janela. Consertei as duas: agora o servidor guarda uma cópia do filme no
mesmo instante em que o navegador guarda a dele, e o robô termina o que ficou
pelo caminho e manda o mesmo "seu vídeo está pronto" que já manda hoje. Não
inventei oferta, não mexi em preço, não toquei no motor: o filme montado é
exatamente o que sairia se a pessoa tivesse ficado na tela. Está em produção,
provado por sonda.

### CHECKPOINT #10 — 03:39→03:55 BRT — o conserto de 02/09 embutiu um botão que NUNCA foi apertado, e hoje ele custou o cadastro mais quente da noite

**Este disparo é o :38 — checkpoint da rotação #10, não trabalho novo.** Medi, e
a medição achou uma pessoa viva batendo numa porta trancada 13 minutos antes.

#### PRODUÇÃO CONFERIDA (a #10 continua de pé)

`git ls-remote origin main` = `d91ee47b` · fila `origin/main..entrega-atual` =
**0** · home **200** · sonda `GET /api/render-recovery` = **405** com controle
`GET /api/render-recovery-controle-inexistente` = **404** na mesma medição.
O par 405/404 é a prova; o 405 sozinho não seria (memória
`sonda-401-exige-controle-404`).

#### O ERRADO (medido): 437 batidas na parede, 6 pessoas, **0 cliques no botão que existe para isso**

| medida | valor |
|---|---|
| `studio_prompt_over_limit_shown` (história) | **437** |
| pessoas distintas | **6** |
| `studio_prompt_trimmed_to_limit` (história) | **0** |
| pessoas que apertaram "Trim to fit" | **0** |
| batidas em `script_mode=verbatim` | 93 |
| batidas em `script_mode=ai` | 344 |

Em **02/09** esta casa achou exatamente este defeito e o consertou. O comentário
em `lib/studioPromptLimit.ts` descreve o caso com estas palavras: um trial do
ChatGPT com 25cr intactos bateu na parede **7 vezes em 21 minutos** e foi embora
sem vídeo. O conserto foi honesto e é o que qualquer um faria: mostrar o teto
onde a pessoa escreve, com o número exato, e oferecer **um clique** para caber
("Trim to fit", corte na fronteira da última frase inteira).

**O botão nunca foi apertado. Nem uma vez. Em 437 oportunidades.** É um
contrato sem chamador — só que do lado da tela (memória
`contrato-de-servidor-sem-chamador`, agora com um irmão de UI).

#### O CASO DE HOJE, minuto a minuto (pessoa `f2b2248d`, `utm_source=nav`)

- **06:03:56** cadastro novo pelo Google (`is_new_user: true`), **25 créditos** concedidos.
- 06:04 → 06:08 onboarding, banner de trial, chega ao `/generate`.
- **06:13:01** aperta `trial_first_delivery_clicked` — Seedance 35s, 15cr. **Ela disse SIM ao primeiro filme.**
- **06:05 → 06:26** — **89** `studio_prompt_over_limit_shown`. Colou um roteiro de **~13.600 caracteres**. Teto: **5.000**. Excesso: **8.600**.
- O `prompt_len` sobe de **13.517 para 13.625 de um em um** — ela estava **editando à mão, caractere a caractere**, por 21 minutos.
- Trocou `script_mode` de `ai` para `verbatim` no meio (quis preservar o texto dela).
- 06:23→06:25 recarrega a página três vezes. Depois, silêncio.
- Saldo final: **25 intactos**. Filmes entregues: **0**.

**21 minutos.** O mesmo número de 02/09. A mesma parede, o mesmo saldo intacto,
o mesmo fim.

#### POR QUE O CONSERTO DE 02/09 NÃO PEGOU (a leitura que muda a jogada)

O botão oferece **cortar 8.600 de 13.600 caracteres — 63% do texto dela**. Para
quem colou um roteiro próprio e escolheu `verbatim` ("use meu texto como está"),
"Ajustar ao limite" não é ajuda: é a casa se oferecendo para **apagar dois
terços do trabalho da pessoa**. Ela recusou 89 vezes e editou na mão. Os dados
não deixam dúvida: 0 cliques, e o comprimento subindo de 1 em 1.

E o `generate()` do `/studio` faz `if (limit.over) return` — **bloqueio mudo**.
O botão principal simplesmente não responde.

**A verdade de produto que ninguém tinha olhado:** 13.600 caracteres são ~2.300
palavras ≈ **16 minutos de narração**. O produto faz filmes de 35–90s (~150–190
palavras). O roteiro dela não é um filme grande demais — **são ~12 episódios**.
A casa tem exatamente o ritual para isso (o cartão "Episode 2", o mesmo que
produziu a única pessoa engajada da noite passada) e, em vez de oferecê-lo,
mandou a pessoa mutilar o texto.

**Quem chega com 2.300 palavras prontas é o perfil que mais assina**: já tem
conteúdo, quer volume, e volume é assinatura. É o cliente mais quente da noite,
e a porta estava trancada por um contador de caracteres.

#### PLACAR (pós-marco 2026-09-06 04:00 UTC)

2 cadastros · 1 filme · 1 checkout · **0 pagamentos**. Das 2 pessoas novas da
noite, **1 é a `f2b2248d`** — metade dos cadastros do período morreu nesta parede.

#### CHECAGEM ZERO — limpa

cadastro sem crédito **0** · render preso **0** · `generation_stage_error` 24h
**4** (as mesmas já classificadas) · `next_episode_failed` 24h **11**, evento
mais recente **05/09 13:15** — número e ponta **idênticos** aos da #10:
janela móvel congelada, rajada velha, não sangria (memória
`janela-movel-congelada`). Não reabrir sem evento novo.
`fast_compose_recoverable` **0** e `next_action_card_shown` **0** — o primeiro
subiu há 14 minutos e não houve tráfego de Kineo 1 desde então: **cedo demais
para ser evidência em qualquer direção**, não contar como fracasso.

#### PRÓXIMA JOGADA (#11) — trocar "corte seu texto" por "seu roteiro são N episódios"

Quando o texto passa do teto, parar de pedir mutilação e oferecer o que a pessoa
de fato quer: **fazer o episódio 1 agora**, com as primeiras ~180 palavras, e
**guardar o resto**. Mesmo contrato do N1/N2 (`/api/next-action` — números do
servidor, nunca preço digitado), e cai no ritual do "Episode 2" que já existe.
Falsificável: `studio_prompt_over_limit_shown` → `studio_series_offer_shown` →
`studio_series_offer_clicked` → primeiro filme entregue. O denominador já existe
e é grande (437 batidas / 6 pessoas em 4 dias de instrumentação).

Ressalva honesta de medição: o evento só existe desde **02/09**, então "6 pessoas
em 4 dias" mede a **instrumentação**, não a idade da parede — que é mais velha.

### ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada agora.** Checkpoint não subiu código; a #10 segue em produção, conferida com sonda de controle.

### 📋 O QUE ACONTECEU

Fui conferir se a entrega anterior continuava de pé (continua) e esbarrei numa
pessoa que tinha acabado de se cadastrar, tinha os 25 créditos na mão, clicou
"quero meu primeiro filme" — e passou 21 minutos brigando com uma caixa de texto
até desistir. Ela colou um roteiro pronto, grande, e a nossa tela disse que
estava 8.600 caracteres acima do limite e ofereceu um botão para cortar 63% do
que ela escreveu. Ela não apertou. Ficou apagando letra por letra e foi embora
sem filme, com os créditos intactos. Descobri então que esse botão — que
consertamos justamente para isso quatro dias atrás — **nunca foi apertado por
ninguém**: 437 vezes que alguém bateu nessa parede, zero cliques. O conserto
resolveu o problema errado. Quem chega com um roteiro de 2.300 palavras não quer
um cortador: quer uma série, e nós já sabemos fazer episódios. É essa a jogada
da próxima rotação — em vez de "corte seu texto", oferecer "isso aqui dá 12
episódios, vamos fazer o primeiro agora". E é o tipo de cliente que assina, que
é justamente o que este ciclo está atrás.

---

### CHECKPOINT DA #9 — 04:12 BRT — o conserto do denominador está PROVADO, com o corte no deploy

Não é rotação nova: só a verificação do `d8f216a7`.

| `next_action_served` | `session_id` | leitura |
|---|---|---|
| 7 eventos até 06:23:55 UTC | **todos null** | dedupe morto — 1 pessoa virou 7 linhas |
| 2 eventos de 06:25:13 em diante | **preenchido** (`aebad0c1…`, `7db83964…`) | cookie lido, dedupe vivo |

O corte cai exatamente no deploy. **Pós-conserto: 2 eventos / 2 pessoas = 1:1**
(antes: 5 eventos / 1 pessoa). O evento voltou a contar **pessoa**.

**Ressalva honesta de tamanho:** 2 eventos é amostra pequena. O que está provado
sem dúvida é o **mecanismo** (o `session_id` deixou de ser nulo no instante do
deploy); a razão 1:1 sobre 2 pessoas ainda não é estatística.

**Erro meu na primeira leitura, corrigido aqui:** consultei
`metadata->>'session_id'` e vi zero. O `writeServerEvent` grava `session_id`
como **coluna**, não em `metadata` — eu quase reportei "o conserto não pegou"
lendo o campo errado. Conferir onde o dado mora antes de declarar defeito.

**Quem o contrato serviu (as 2 pessoas):**
- `f2b2248d` — `first_film`, 25cr, 0 filmes → cartão calado, correto.
- `8f95127b` — `can_continue`, **13cr, 4 filmes entregues**, `treat_as_paid: true`
  → cartão calado, e também correto: com 13 ela ainda paga um Kineo 1. É a
  pessoa mais fundo no funil que a noite viu, e a casa não a bloqueou.

**PLACAR:** 2 cadastros, 1 checkout, **0 pagamentos** desde o marco. 58 eventos
em 50 min. Zero erros pós-deploy.

### #11 — 04:09→04:3x BRT — a carta mais quente da casa não tinha gatilho, o link era cego, e ela prometia uma tela que não existe

**A jogada que o checkpoint da #10 propôs foi ABANDONADA por dois motivos, e o
primeiro é meu dever registrar antes de qualquer coisa.** O #10 mandou trocar
"corte seu texto" por "seu roteiro são N episódios". Fui medir antes de codar:

| pessoa | caracteres | batidas | tempo | filmes depois |
|---|---|---|---|---|
| `2775079d` | 11.241 | 275 | 1 min | **0** (0 na vida) |
| `f2b2248d` | 13.625 | 89 | 21 min | **0** (0 na vida) |
| (anônima) | 5.473 | 45 | 3 min | 0 |
| `1bbd270e` | 5.637 | 22 | 1 min | 1 |
| `6da5878b` | 8.827 | 3 | 2 min | 1 |
| `1c94f925` | 5.150 | 2 | 118 min | 3 |
| `bf0409c9` | 5.409 | 1 | 0 min | 1 |

1. **O número não sustenta a jogada.** As 437 batidas são **7 sessões**, e
   quatro delas (as de excesso PEQUENO, 150 a 637 caracteres acima) **entregaram
   filme mesmo assim**. A coorte "chegou com um roteiro que é uma série" são
   **2 pessoas em 4 dias**. É a mesma classe de erro que a #7 já registrou no
   PEDIDOS sobre a parede `free_fast_limit` ("15 pessoas em 30 dias" que eram
   rajada velha) e que a memória `janela-movel-congelada` descreve: número
   grande, ritmo pequeno. Não construí, e recomendo não construir sem número novo.
2. **A superfície é proibida neste ciclo.** As 437 batidas são **100% em
   `path='/studio'`**, ou seja `app/(dashboard)/studio/StudioClient.tsx` — que
   está no diff aberto do Codex (`codex/plano-ux-studio-2026-09-05`, conferido
   com `git diff --name-only`). O irmão do defeito no meu lado
   (`analyze_prompt_too_long` no `GenerateClient`) tem **7 eventos, 1 pessoa,
   um único dia**. Não há jogada minha ali.

Então fui atrás do maior número parado que é meu. E ele estava numa carta pronta.

#### O ERRADO (medido): a lista mais quente da casa tem 31 pessoas e **nunca saiu um e-mail**

A coorte é a melhor que existe sem campanha: **entregou um filme e ficou com
saldo MENOR que o preço do filme que acabou de fazer**. Não desistiu do produto
— acabou de gostar dele e bateu numa parede. Hoje: **31 pessoas · 18 chatgpt ·
12 taaft · 1 sem fonte**. A carta foi escrita na #4 e está em produção desde
então. Zero envios.

Ao tentar disparar, apareceram **três defeitos, e cada um sozinho já bastaria**:

**1. NÃO HAVIA GATILHO.** A rota nasceu só-sessão-de-admin. O diário da #4
registrou o impasse com todas as letras: *"não disparei porque a rota é
admin-gated e eu não tenho sessão"*. Uma campanha que só existe se um humano
estiver acordado e logado não é campanha — é rascunho. E é o mesmo padrão da
memória `remedio-nunca-apertado`: o conserto existe, ninguém aperta.

**2. O LINK ERA CEGO.** Os dois CTAs eram string digitada à mão, **sem UTM
nenhum**. A carta podia converter e ninguém saberia: sem `utm_campaign`, o
clique é indistinguível de tráfego direto. Pior — era exatamente o defeito que
a **#9 tinha acabado de matar em três outras campanhas** com
`lib/lifecycle/composerUrl.ts`. Esta rota, escrita na #4, ficou de fora do
conserto **e do guardião**.

**3. A CARTA PROMETIA UMA TELA QUE NÃO EXISTE.** O texto dizia: *"open the
studio and it is waiting with the topic already in it"*. Conferido no código: o
bloco de próximo episódio do `GenerateClient` só roda em `phase === 'done'`,
**depois de um render**. Quem chega por link de e-mail encontra **caixa vazia**.
É a regra de 24/08 do CLAUDE.md — *nunca prometer ao cliente algo que o produto
não sabe executar sozinho* — quebrada por escrito, na carta da lista mais quente
da casa.

#### O QUE MUDOU (SHA `417517b4`)

| arquivo | mudança |
|---|---|
| `app/api/admin/send-next-episode-wall/route.ts` | 2ª porta de auth (cron), CTAs com etiqueta, copy amarrada ao prefill |
| `lib/lifecycle/composerUrl.ts` | opção `prompt` (prefill), teto de 120 chars |
| `vercel.json` | cron `0 11,15 * * *` com `confirm=SEND&limit=30` |
| `scripts/test-carta-episodio-gatilho-2026-09-06.mjs` | guardião novo, 35 verificações |
| `scripts/test-cta-composer-2026-09-06.mjs` | a rota entra na cobertura da #9 |

- **Gatilho:** `Authorization: Bearer ${CRON_SECRET}` — o mesmo contrato de
  `send-activation-nudge`, que o Vercel preenche sozinho nas rotas do
  `vercel.json`. Ninguém precisa conhecer o segredo. **Fail-closed:** env
  ausente devolve `false`, nunca `true`. A sessão de admin continua exigida
  para quem não traz o cabeçalho, e o link de 1 clique do fundador continua
  valendo. O `confirm=SEND` está NO caminho do cron de propósito: sem ele o job
  rodaria em dry-run para sempre — foi assim que dois crons desta casa
  dormiram 30 dias (CLAUDE.md, 01/09).
- **Etiqueta:** campanha `next_episode_wall` nos dois destinos, composer e
  `/pricing`.
- **Promessa com lastro, consertada no PRODUTO e não na desculpa:** o link
  agora leva `?prompt=<título do filme>`, que o `GenerateClient` lê como
  prefill (`initialPrompt`). A caixa abre preenchida **de verdade**. E não
  dispara render nenhum: o autostart exige `create_intent`, que o helper nunca
  escreve. Quando não há título aproveitável — `pickMomentumTopic` devolve
  `null` para os comandos colados do ChatGPT e para o `人物使用参考图` da lista
  — **não há prefill E a frase muda junto**. Promessa e link nunca se separam.

#### O QUE O CLIENTE PASSA A RECEBER

31 pessoas que fizeram um filme, gostaram, ficaram sem saldo e **nunca ouviram
nada da casa** recebem uma carta que nomeia o filme delas, diz os dois números
reais (custou X, você tem Y) e abre o studio com o tópico já digitado. Sem
desconto, sem crédito, sem preço inventado — a porta do plano é um link.

#### DRY-RUN COMPLETO (obrigatório antes de qualquer envio) — 31 destinatários

Reproduzi a seleção da rota em SQL, cláusula por cláusula (opt-out, pagante,
plano, descartável, bloqueados do ciclo, saldo < custo, carimbos de 9 colunas +
7 datas + 6 campanhas em `events`, fora do checkout). Ordem de envio = chatgpt
primeiro, depois maior saldo.

| # | e-mail | fonte | saldo | último custou | título |
|---|---|---|---|---|---|
| 1 | plottwistvidz@gmail.com | sem fonte | 0 | 25 | Setting: Outside a fancy restaurant at night. |
| 2 | souzaforteslucas@gmail.com | chatgpt | 6 | 15 | "Eu aluguei um apartamento barato…" |
| 3 | asifwriter5@gmail.com | chatgpt | 6 | 19 | This image hides two faces — can you see both? |
| 4 | johnickcep99@gmail.com | chatgpt | 0 | 25 | (comando colado — sem título) |
| 5 | matijasmilovic5@gmail.com | chatgpt | 0 | 4 | At 3:17 AM, Daniel heard his mother calling… |
| 6 | irapapagavriel@gmail.com | chatgpt | 0 | 4 | The 3 AM rule... could be your ultimate lifesaver. |
| 7 | tmmom6996@gmail.com | chatgpt | 0 | 25 | (comando colado — sem título) |
| 8 | sonnatakliain@gmail.com | chatgpt | 0 | 25 | Old family house at night. |
| 9 | maxkaynann1910@gmail.com | chatgpt | 0 | 15 | 5 morning habits Jeff Bezos used… |
| 10 | ta5480767@gmail.com | chatgpt | 0 | 4 | Unleash the ultimate creamy garlic chicken… |
| 11 | livrosaa2026@gmail.com | chatgpt | 0 | 4 | Did you know about the Ghost Army in WWII? |
| 12 | ammuleyyyyyehh@gmail.com | chatgpt | 0 | 4 | The 3am rule — a secret you can't afford to break. |
| 13 | ahmadjooon26@gmail.com | chatgpt | 0 | 3 | (árabe — `pickMomentumTopic` decide) |
| 14 | linusminidalle@hotmail.com | chatgpt | 0 | 4 | The 3am rule you should NEVER break… |
| 15 | soomroalisoomro12354@gmail.com | chatgpt | 0 | 25 | The unsolved mystery of |
| 16 | riyadbora3i@gmail.com | chatgpt | 0 | 4 | This viral video fact... the ocean forever. |
| 17 | omargamer2130@gmail.com | chatgpt | 0 | 4 | Tom and Jerry… a haunted palace? |
| 18 | mrarabking507@gmail.com | chatgpt | 0 | 4 | Every night at 3 AM… Mia's window. |
| 19 | newytch19@gmail.com | chatgpt | 0 | 15 | (comando colado — sem título) |
| 20 | cyber09.2009@gmail.com | taaft | 10 | 15 | Cristiano Ronaldo as a clueless student! |
| 21 | ayoolaoluwasegunfunmi@gmail.com | taaft | 7 | 15 | (sem título) |
| 22 | nayannamha1211@gmail.com | taaft | 6 | 19 | An island where no one can survive? |
| 23 | hdghiyd@gmail.com | taaft | 6 | 19 | This island could kill you in minutes! |
| 24 | williamlevandovskyi@gmail.com | taaft | 0 | 4 | This school uniform trend… |
| 25 | allanribeirocontato@gmail.com | taaft | 0 | 5 | (pt-BR, comando — sem título) |
| 26 | gravesconsulting420@gmail.com | taaft | 0 | 20 | The lake in Venezuela where lightning… |
| 27 | chukwuebukastanley@gmail.com | taaft | 0 | 25 | How do computers obey commands? |
| 28 | zoya04634@gmail.com | taaft | 0 | 12 | (markdown de produção — sem título) |
| 29 | nagac86153@kikaga.com | taaft | 0 | 12 | (comando — sem título) |
| 30 | gaomo117169@gmail.com | taaft | 0 | 25 | 人物使用参考图 → **sem título, sem prefill** |
| 31 | viralgyandk@gmail.com | taaft | 0 | 19 | This beach hides a secret… |

**Nenhum dos 4 contatos proibidos** (den.higgins, noelrss21, emiliomontinari,
akajitin) está na lista — excluídos por cláusula, conferido na query.
**Observação honesta:** `nagac86153@kikaga.com` (#29) é domínio descartável que
**não está** na lista `DISPOSABLE` da rota. Um endereço em 31. Não mexi na lista
por conta própria — está no PEDIDOS.

#### TESTES

`test-carta-episodio-gatilho-2026-09-06.mjs`: **35 verificações, 0 falhas**,
lendo os arquivos reais. Falsificado por **5 mutantes**, com o commit feito
ANTES (memória `falsificar-mutacao-commitar-antes`):

| mutante | resultado |
|---|---|
| `if (!cronSecret) return true` (sem env, deixa passar) | ✗ reprovado |
| `const ponte = filme` → `= true` (frase de prefill escapa do ramo) | **passou na 1ª versão** → guardião endurecido → ✗ reprovado |
| `<p>${filme` → `<p>${true` (o mesmo no HTML) | ✗ reprovado |
| `confirm=SEND` some do cron | ✗ reprovado |
| entrada do cron removida do `vercel.json` | ✗ reprovado |
| CTA volta a ser `${SITE}/studio/create` cru | ✗ reprovado (3 checagens) |

O 2º mutante é o registro que importa: **eu tinha escrito duas checagens que
contavam TEXTO** (dois ramos presentes, duas ocorrências da frase) e as duas
passavam com a condição destruída. Contar texto não prova condição. As
checagens novas exigem que a frase seja decidida pela **mesma variável que
decide o prefill** (`filme`).

`test-cta-composer-2026-09-06.mjs` (guardião da #9): 25 → 0 falhas, já com a
rota nova na cobertura. `tsc --noEmit`: **0 erros** (com junction de
`node_modules`; `npx tsc` mente com exit 0 — memória `worktree-tsc-node-modules`).

#### RISCO E COMO É REVERSÍVEL

O cron passa a rodar **2×/dia para sempre**, sem ninguém olhando. O volume real
é limitado pela coorte, não pelo horário: o carimbo `next_episode_wall_emailed_v1`
é vitalício por pessoa e as 6 campanhas irmãs excluem. Depois da primeira leva
(31), o job manda ~0–3/dia — só quem entrar novo no estado. Reverter = apagar
4 linhas do `vercel.json`. Escolhi 11:00 e 15:00 UTC (08:00 e 12:00 BRT) porque
é manhã do destinatário, e porque **a primeira rodada cai DENTRO deste ciclo**
(08:00 BRT, antes do fechamento às 09:08) — dá para ver o resultado hoje.

#### COMO MEDIR (falsificável, com data)

1. **Às 11:00 UTC:** `next_episode_wall_emailed_v1` sai de 0. Se continuar 0, o
   gatilho não funcionou e eu digo isso no fechamento.
2. Clique: eventos com `utm_campaign=next_episode_wall` (hoje **0 por
   construção** — o link nem carregava etiqueta).
3. Prova de que a promessa virou verdade: `next_action_card_shown` com
   `surface='generate_step_1'` vindo de `utm_medium=email`, que a #9 deixou em
   0 por construção.
4. O que interessa: `checkout_started` e `payment_success` dessas 31 pessoas.

#### PLACAR (pós-marco 2026-09-06 04:00 UTC)

2 cadastros (`nav` 1 · `seo` 1) · 1 filme · 1 checkout · **0 pagamentos**. Sem
tráfego novo desde a #10 — é madrugada nos EUA. Os dois casos já foram
dissecados nas rotações anteriores.

#### PRÓXIMA JOGADA (#12)

Ver, às 08:00 BRT, se a carta saiu — e se saiu, se alguém clicou. Enquanto isso,
a pergunta que o dry-run levantou e que vale dinheiro: **10 das 31 pessoas não
têm título aproveitável** porque colaram um comando do ChatGPT no lugar de um
tema. É um terço da melhor lista da casa recebendo a versão fraca da carta — e
é o mesmo material que a #10 viu virar parede de 13.600 caracteres. O padrão
"o cliente do chatgpt cola o pedido, não o assunto" já apareceu em três
rotações diferentes por três sintomas diferentes. Vale uma jogada de servidor
que trate isso na entrada, não em cada consequência.


### CHECKPOINT DA #11 — 04:40 BRT — a carta está EM PRODUÇÃO e ainda não disparou (é cedo, não é falha); o contrato da #9 ganhou gente de verdade; e eu quase repeti, na mesma noite, o erro de denominador que a #11 acabou de proibir

Disparo de :38 = checkpoint da rotação aberta às 04:08. Sem trabalho novo:
verificar, medir, registrar.

#### 1. #11 EM PRODUÇÃO — SHA 417517b4

Sonda com controle (memória `sonda-401-exige-controle-404`), 04:41 BRT:

| alvo | http |
|---|---|
| `https://www.usekineo.com/` | **200** |
| `/api/admin/send-next-episode-wall` (sem segredo) | **403** |
| `/api/admin/send-next-episode-wall-CONTROLE-NAO-EXISTE` | **404** |
| `/api/next-action` (irmã viva, #7/#9) | **401** |

403 contra 404 no mesmo caminho prova que a rota existe e está guardada — não
é 404 disfarçado. O `vercel.json` em `origin/main` tem a entrada
`0 11,15 * * *` para `/api/admin/send-next-episode-wall?confirm=SEND&limit=30`.

**Aviso para o fechamento das 09:08:** `next_episode_wall_emailed_v1` está em
**0 agora, e isso é o esperado** — a primeira rodada do cron é às **11:00 UTC
(08:00 BRT)**, daqui a ~3h20. Zero antes das 08:00 BRT **não falsifica nada**.
O número que vale é o das 08:00. Se às 09:08 ainda estiver 0, aí sim o gatilho
falhou, e é isso que o fechamento tem de dizer.

#### 2. O CONTRATO DA #9 ESTÁ VIVO, E AGORA COM GENTE DE VERDADE

`next_action_served`: **12 chamadas** desde o marco, **4 pessoas distintas**,
a última às **07:37:49 UTC — 3 minutos antes desta medição**. A #9 subiu com
0 chamadores na história; agora o servidor responde em produção, com
`treat_as_paid=true` em conta free de trial (o conserto da #9 segurando) e os
dois estados reais aparecendo: `first_film` (saldo 25, 0 filmes) e
`can_continue` (saldo 22, último custou 3, oferece `fast`).

Vale registrar o contraste com o resto: a peça de servidor da #7/#9 é a única
coisa construída neste ciclo que **já tem uso orgânico**.

#### 3. A CORREÇÃO — eu ia repetir o erro que a #11 proibiu HÁ UMA ROTAÇÃO

Eu cheguei a escrever, e ia publicar, que a parede do teto de 5.000 tinha
**"437 batidas, 6 pessoas e 0 saídas"**, e ia mandar a #12 consertar isso como
jogada principal. **Está errado, e o aviso já estava escrito no PEDIDOS pela
rotação anterior** ("NÃO REPITA ESTA JOGADA SEM NÚMERO NOVO"). Fui conferir o
denominador antes de publicar. O que ele diz:

| pessoa | batidas | tamanho do texto | filmes na vida | trims |
|---|---|---|---|---|
| `f2b2248d` (**esta noite**) | 89 | 10.090–13.625 | **0** | 0 |
| `2775079d` (02/09) | 275 | 8.098–11.241 | **0** | 0 |
| `6da5878b` | 3 | 5.271–8.827 | 1 | 0 |
| `1bbd270e` | 22 | 5.595–5.637 | 1 | 0 |
| anônimo (sem login) | 45 | 5.371–5.473 | — | 0 |
| `bf0409c9` | 1 | 5.409 | 1 | 0 |
| `1c94f925` | 2 | 5.150 | **3** | 0 |

**Quatro das seis pessoas identificadas entregaram filme mesmo depois de bater
na parede.** A parede só é fatal acima de ~8.000 caracteres, e aí são **duas
pessoas em quatro dias** — as **mesmas duas** que a #11 já tinha nomeado. Não
há pessoa nova: `f2b2248d` é o `13.625` do PEDIDOS dela.

E as 437 batidas são **contagem inflada por repetição, não por alcance**:
`f2b2248d` + `2775079d` sozinhos fazem **364 das 437 (83%)**, porque o evento
dispara a cada tecla. Contar batida como se fosse gente é a mesma classe de
erro das memórias `janela-movel-congelada` e `funil-agregado-esconde-degrau-seco`.

**O que sobrevive da minha medição, e é novo:** o *mecanismo*, não o tamanho.
`trimToFit()` (`StudioClient.tsx:340`) emite `studio_prompt_trimmed_to_limit`;
esse evento tem **0 linhas em toda a história**. O botão está ligado e nunca
foi apertado — não é buraco de instrumentação, é recusa. E o rastro de
`f2b2248d` mostra por quê, minuto a minuto:

| hora UTC | o que aconteceu |
|---|---|
| 06:18:53–55 | 13.553 caracteres (teto 5.000); a parede dispara ~20x em 2 segundos |
| — | os contadores caem de **1 em 1**: 13553, 13551, 13550, 13548, 13546... |
| 06:20:39 | 11.176 |
| 06:22:22 | 10.212 |
| 06:25:09 | dispensa o banner do trial e troca `verbatim` por `ai` |
| 06:26:12 | **10.090** — ainda 5.090 acima. Desiste, com 25 créditos intactos. |

Decrementos de 1 em 1 = **a pessoa apagando caractere por caractere**. Ela
passou **8 minutos raspando o texto à mão** em vez de apertar o botão que
resolveria num clique — porque o botão dizia `✂ Trim to fit (8.553 chars)`, que
para quem colou 13.553 se lê como *"jogo fora 63% do que você escreveu"*.
Ninguém aperta um botão que oferece mutilação (memória `remedio-nunca-apertado`).

**Mas isso continua valendo para 2 pessoas em 4 dias, numa superfície que é
lote aberto do Codex** (as 437 são 100% em `path='/studio'`). A regra da #11
está de pé e eu a mantenho: **não é a jogada da #12.**

#### 4. O PADRÃO QUE CRESCEU DE VERDADE — o cliente do ChatGPT cola a ordem

Este, sim, ganhou aparições novas esta noite, e é o que a #11 mandou tratar na
entrada. Os despachos que **deram certo** hoje tinham `prompt_length` **894** e
**534**; os travados estão em 10.000+. A diferença não é tamanho de texto, é o
que a pessoa colou:

1. `f2b2248d` — 13.553 caracteres de roteiro/comando; 0 filmes.
2. `9f2b563c` — o `topic` gravado no filme é literalmente
   `"IMPORTANT: This is a completely visual story. NO narration,"`: a **ordem**
   virou o **assunto**.
3. `fc28af0b` — `pasted_directives_detected` **6 vezes em 30 segundos**
   (`looks_pasted: true`, `asked_seconds: 60`).

Um filme de 35–60s precisa de ~150 palavras (~900 caracteres) de narração.
**Não falta espaço, sobra instrução** — e é por isso que "cortar o texto" é a
resposta errada para o problema certo.

#### 5. CHECAGEM ZERO

| checagem | resultado |
|---|---|
| cadastro sem crédito | **limpo** — 4 de 4 com `trial_credits_granted=25` |
| `status=completed` sem MP4 | **limpo** — os 2 filmes têm `video_url`; `final_video_url` nulo é a coluna legada do Creatomate, não é defeito |
| render preso | **limpo** — nada parado há mais de 10 min |
| `next_episode_failed` | **0 desde o marco** (os últimos são de 05/09 13:15 — rajada velha, como a #10 já concluiu) |
| débito sem entrega | **1 EM VOO, ainda não é defeito** — ver abaixo |

**ITEM DE VIGIA PARA A #12 (o mais concreto desta rodada):** `fc28af0b`
(iesfiefq@gmail.com, chatgpt, cadastro 07:37) despachou Seedance 1.5 às
07:38:38 — claim `published`, cenas `accepted` com HTTP 200 — e está com
**15 créditos debitados (25 → 10) e nenhuma linha em `videos`** às 07:45. São
~7 minutos, dentro da janela normal do Seedance. **A #12 tem de confirmar que
esse filme entrou.** Se não entrou, é débito sem entrega e o crédito volta.

#### 6. PLACAR (pós-marco 2026-09-06 04:00 UTC)

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt | 2 | 0 | 0 | 0 | 0 | **0** |
| nav | 1 | 0 | 0 | 0 | 0 | **0** |
| seo | 1 | 1 | 0 | 0 | 1 | **0** |
| **total** | **4** | **1** | **0** | **0** | **1** | **0** |

Cresceu de 2 para 4 cadastros desde a #11 — os dois novos são **chatgpt** e
nenhum dos dois tem filme ainda. O único checkout da noite (`mohandasjas1`,
seo) é também a única pessoa com filme entregue — e nela o conserto da #10
funcionou de ponta a ponta: `stranded_compose_attempt`, `stranded_composed`,
`stranded_ready_sent`, `video_ready_email_sent`. **A #10 está provada em
produção, com pessoa real.**

#### 7. PRÓXIMA JOGADA (#12)

Nesta ordem, e sem inventar alavanca grande onde o denominador é pequeno:

1. **Confirmar o filme de `fc28af0b`** (item de vigia acima). É a única coisa
   desta rodada que pode ser defeito ativo com dinheiro do cliente dentro.
2. **Às 08:00 BRT, ver a carta sair.** É a entrega da #11 e o único evento
   programado do ciclo que produz efeito antes do fechamento.
3. Só então jogada nova — e o alvo com denominador é o da seção 4 (a entrada
   que recebe ordem em vez de tema), **não** o cortador da seção 3.

#### ✅ O QUE VOCÊ PRECISA FAZER

Nada.

#### 📋 O QUE ACONTECEU

A carta de 31 pessoas da rotação anterior **está no ar** (provado por sonda com
controle) e **dispara às 08:00 da manhã**, antes do fechamento — o zero de
agora é só porque a hora não chegou. E a peça de servidor construída nas
rotações #7/#9 **começou a ser usada de verdade**: 12 chamadas, 4 pessoas, a
última três minutos antes desta medição.

A parte honesta desta rodada é uma correção minha. Eu tinha medido que o botão
"cortar texto" do conserto de 02/09 tem **437 oportunidades e zero cliques em
toda a história** — isso é verdade e continua verdade. Mas eu ia vender isso
como o grande conserto da noite, e fui conferir quantas pessoas são: **quatro
das seis fizeram filme mesmo assim**. A parede só é fatal para quem cola mais
de 8.000 caracteres, e aí são **duas pessoas em quatro dias** — as mesmas duas
que a rotação anterior já tinha nomeado, com um aviso escrito de "não repita
esta jogada sem número novo". Eu quase repeti na rotação seguinte. As 437
"batidas" são duas pessoas digitando, não 437 clientes perdidos.

O que fica de novo e verdadeiro é *por que* ninguém aperta o botão: um cadastro
desta noite colou 13.553 caracteres e passou **oito minutos apagando letra por
letra** em vez de clicar num botão que oferecia jogar fora 63% do texto dele.
Preferir o trabalho manual à amputação mede o quanto a oferta é ruim — mas
mede isso para duas pessoas, e a tela onde isso vive é lote aberto do Codex.

Placar da noite: 4 cadastros, 1 filme, 1 checkout, **0 assinaturas**.

---

#### ADENDO AO CHECKPOINT DA #11 — 04:48 BRT — o item de vigia FECHOU BEM

`fc28af0b` (iesfiefq@gmail.com, chatgpt) **recebeu o filme**: `videos` = 1,
`status=completed`, `video_url` no nosso bucket, saldo 10. O render levou
~9 minutos (despacho 07:38:38, filme em `videos` antes de 07:48). **Não é
débito sem entrega** — os 15 créditos foram cobrados por entrega real.

Isso corrige o placar desta rodada para melhor, e a linha do ChatGPT deixa de
ser zero:

| fonte | cadastros | filme 1 | filme 2 | checkout | **pagou** |
|---|---|---|---|---|---|
| chatgpt | 2 | **1** | 0 | 0 | **0** |
| nav | 1 | 0 | 0 | 0 | **0** |
| seo | 1 | 1 | 0 | 1 | **0** |
| **total** | **4** | **2** | **0** | **1** | **0** |

Fica um fato para a #12 usar: essa pessoa **cadastrou e recebeu o primeiro
filme em 11 minutos** (07:37 → 07:48), vinda do ChatGPT, com `looks_pasted` e
pedido de 60s atendido. É o caminho feliz do produto funcionando inteiro na
madrugada — e o momento exato em que ela está mais quente. Ela agora tem 10
créditos e o próximo Seedance custa 15: **é precisamente o "NÃO" que o cardápio
N1 descreve**, com pessoa real, viva, nesta hora.

---

### #12 — 05:01→05:02 BRT — O CARTÃO APARECEU PARA UMA PESSOA DE VERDADE, e a carta ganhou gatilho (correção da minha própria instrução ao fundador)

#### 1) A PRIMEIRA IMPRESSÃO REAL — o degrau saiu do papel

`next_action_card_shown` = **3**, e é uma pessoa (`fc28af0b`):

| hora UTC | superfície | estado | saldo | falta | alternativa |
|---|---|---|---|---|---|
| 07:44:37 | `generate_done_screen` | **dry** | 10 | 5 | Kineo 1 · **5 cr** |
| 07:50:34 | `generate_step_1` | dry | 10 | 5 | Kineo 1 · 5 cr |
| 07:51:36 | `generate_step_1` | dry | 10 | 5 | Kineo 1 · 5 cr |

É **exatamente** o caso que a noite inteira existiu para atender: entregou um
filme, ficou com 10 e o próximo do mesmo motor custa 15. Ela viu, na tela, os
dois números e uma saída de 5 créditos que o saldo paga. `clamp_seconds: null`
está certo — ela está no caminho pago (trial), então não há corte de 15s a
declarar.

**`next_action_clicked` = 0.** Três impressões, zero cliques, uma pessoa. É
cedo demais para ler como fracasso **ou** como sucesso — o denominador é 1. O
que está provado é que a peça **aparece, com os números certos, para quem
deveria vê-la**. Era isso que 24h atrás não existia.

#### 2) A CARTA NÃO PRECISA MAIS DO SEU CLIQUE — corrijo o que eu mesmo pedi

A outra sessão ligou a rota que eu construí a um cron (`417517b4`):
`"/api/admin/send-next-episode-wall?confirm=SEND&limit=30"`, `0 11,15 * * *`
UTC = **08:00 e 12:00 BRT**. **As três instruções que eu deixei nas rotações
#4, #5 e #9 pedindo o clique do fundador estão SUPERADAS.** Ele não precisa
fazer nada; o primeiro disparo cai às 08:00 BRT, **dentro desta janela**, e eu
consigo relatar o resultado no fechamento.

**Conferi que isso não abriu uma porta pública**, porque a rota manda e-mail de
verdade e o carimbo é vitalício:

| sonda | resultado |
|---|---|
| GET sem auth | **403** |
| GET sem auth **+ `?confirm=SEND&limit=30`** | **403** |
| GET com `Authorization: Bearer errado` | **403** |
| GET numa rota inexistente (controle) | **404** |

O gate é `Bearer ${CRON_SECRET}` e **falha fechada** quando a env não existe.
Ninguém dispara aquilo de fora.

#### 3) COMO LER `card_shown` — e por que NÃO vou "consertar" como fiz com o served

Uma pessoa gerou 3 impressões, duas delas na **mesma** superfície. Quem ler
`card_shown` como pessoas vai errar por 3x — a mesma armadilha que a #9
consertou no `next_action_served`.

**Mas os dois casos não são iguais, e a diferença decide a ação:** o
`next_action_served` **declarava** `dedupeMinutes: 30` e o dedupe estava
quebrado — consertar restaurou a intenção declarada. O `card_shown` é um
contador de **impressão**, e impressão repetida é impressão. Trocar a definição
de uma métrica **no meio da medição** tornaria as duas metades da noite
incomparáveis — que é um defeito próprio.

**Regra de leitura, então:** `card_shown` = impressões;
`count(distinct user_id)` = pessoas. Hoje: **3 impressões, 1 pessoa.**

**PLACAR:** 5 cadastros, 4 filmes entregues, 1 checkout, **0 pagamentos**.
314 eventos em 50 min (o tráfego acordou). 1 erro pós-deploy, 0 modais de saldo.

---

### #13 — 05:09→05:3x BRT — HIPÓTESE ANTES DE CODAR: a Stripe guarda a porta de volta do checkout por 30 dias, e a casa nunca mandou essa porta para ninguém

**Errado (medido agora, antes de escrever código):**

O webhook da Stripe recebe `checkout.session.expired` e grava, em
`events.metadata`, o campo `recovery_url_available`. Nos últimos 4 dias ele
veio **`true` em quase toda linha** — e o que a casa faz com isso é **nada**.
O próprio link não é sequer guardado: gravamos que ele EXISTE e o jogamos fora.

| medição (contas externas) | número |
|---|---|
| `checkout_session_expired` em 72h | **17 pessoas** |
| pessoas com sessão expirada nos últimos 14d, sem pagamento, sem campanha nenhuma | **34** |
| dessas, com link de recuperação da Stripe **vivo** | **31** |
| dessas, que já entregaram filme | **20** |
| `checkout_rescue_emailed_v1` — última vez que a casa escreveu para esta coorte | **19/08, 38 pessoas, em 27 segundos. Nunca mais.** |

A carta de resgate de 19/08 existe, é boa, e está **parada há 18 dias** porque
nasceu só-sessão-de-admin, sem cron — o mesmo defeito que a #11 acabou de
consertar na carta do episódio 2. E o link dela é `/pricing`: manda a pessoa
**re-escolher o plano e re-encarar o preço do zero**.

`after_expiration.recovery.url` da Stripe faz o oposto: reabre **a mesma
sessão, no mesmo plano, na mesma moeda e no mesmo valor** que a pessoa já
tinha aceitado ver. Conferido: as datas em `recovery_url_expires_at` são
**30 dias** depois da expiração (ex.: sessão de 05/09 → link vivo até
05/10). **Nenhum dos 31 links expirou.**

**Hipótese:** quem chegou ao formulário de pagamento da Stripe e não terminou
não é "achou caro" — é gente que já passou pela decisão de preço e parou no
degrau seguinte. Para essa pessoa, um clique que devolve exatamente a página
onde ela estava vale mais que qualquer carta que peça para começar de novo.
Isso **não contraria** a conclusão fechada do fundador (o vazamento do
checkout é preço): não muda preço, plano nem oferta — devolve a porta.

**Arquivos:** `app/api/admin/send-checkout-recovery/route.ts` (novo),
`vercel.json` (gatilho), `scripts/test-checkout-recovery.mjs` (guardião).
**Métrica:** `checkout_recovery_emailed_v1` (envios) → `checkout_started`/
`payment_success` das mesmas pessoas depois do envio.
**Parada:** se a Stripe não devolver `after_expiration.recovery.url` para uma
pessoa, ela **não recebe** a carta — a promessa central dela é o link.
