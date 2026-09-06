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
