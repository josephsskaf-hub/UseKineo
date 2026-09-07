# VENDA ASSISTIDA — 07/09/2026 (17:00 → 01:00 BRT)

> **A ORDEM DO FUNDADOR (07/09 16:40 BRT):** "Estamos há dois dias sem
> assinante novo. Visitante cresce, três línguas, ótimos vídeos, o GPT fala da
> gente — e não converte. Precisamos de um CAMINHO DIFERENTE para trazer
> cliente novo. Não adianta ficar em 7-8; tem que ir para 10, 15, 25."
>
> Esta pista cuida das **PESSOAS** (cartas, listas, respostas). A pista irmã
> (`docs/SPRINT-FECHAR-2026-09-07.md`) cuida das **TELAS**.

**MARCO DA PISTA: 2026-09-07 20:00 UTC.** Toda medição de eficácia daqui em
diante recorta em `created_at > '2026-09-07 20:00:00+00'::timestamptz`.
SQL da pista: `docs/queries/VENDA-ASSISTIDA-2026-09-07.sql`.

---

### #1 — 17:22-17:55 — AS TRÊS LISTAS MEDIDAS, E A LISTA A NÃO EXISTE DO JEITO QUE A CASA ACREDITA

**O que eu ia fazer:** a V1 do cardápio — carta nova para "as 44 pessoas que
abriram o checkout 2+ vezes sem pagar", com o trial de $1.

**O que eu medi antes de escrever uma linha dela.** Três achados, em ordem de
gravidade.

**🔴 1. "QUEM VOLTA DUAS VEZES" É UM ERRO DE CONTAGEM, NÃO UMA COORTE.**

A frase que sustenta a lista A desde 19/08 — e que está no `CLAUDE.md` — é
_"os 44 tentaram DUAS VEZES OU MAIS; quem volta ao checkout duas vezes quer
comprar"_. Fui contar de quatro jeitos diferentes, na mesma janela de 30 dias,
sobre as mesmas pessoas não-pagantes:

| como se conta "voltou 2+ vezes" | pessoas |
|---|---|
| por **evento** (o jeito de 19/08) | **104** |
| por **hora distinta** | 8 |
| por **sessão distinta** | **9** |
| por **dia distinto** | **2** |

O motivo: um único clique em "comprar" emite `checkout_cta_clicked` +
`checkout_started` + `checkout_attempted` quase juntos. A **mediana do intervalo
entre dois eventos de checkout consecutivos da mesma pessoa é 0,86 segundo**, e
297 dos 388 pares estão a menos de 5 segundos um do outro. Só 32 pares passam de
30 minutos.

Falsifiquei o número baixo antes de acreditar nele (memória
`evento-por-tecla-infla-denominador`): `session_id` é **não-nulo em 500 de 500
linhas**, então as 9 sessões são sessões de verdade, não um artefato de
`count(distinct)` engolindo nulo.

**Consequência prática:** a carta que a V1 pedia abre com _"vi que você abriu o
plano X duas vezes"_. Isso seria **falso para ~95 das 104 pessoas**. Seria a
casa mentindo na primeira linha, para uma lista inteira — exatamente o item 4
da auditoria de 28/08 ("COPY QUE MENTE"), só que desta vez escrito de propósito.

⚠️ **O que isto NÃO reabre:** a conclusão fechada do fundador de que o
vazamento do checkout é **PREÇO** continua de pé e não foi investigada aqui.
O que caiu foi só a *evidência do "voltaram duas vezes"* — a conclusão pode
seguir certa por outros motivos. Não gastar sessão re-investigando pagamento.

**🔴 2. A LISTA A JÁ FOI FALADA ATÉ CANSAR. 103 DE 104.**

| | pessoas |
|---|---|
| lista A (não pagantes, 2+ eventos de checkout, 30d) | 104 |
| **já receberam ao menos uma carta da casa** | **103** |
| nunca receberam nada | 1 |
| média de cartas por pessoa | **7,4** (3,6 de campanha + 3,8 automáticas) |
| com 10 cartas ou mais | 27 |
| recordista | **19 cartas** |

E o contraponto que decide tudo — **os 9 pagamentos dos últimos 45 dias**,
olhando quantas cartas cada pagante tinha recebido *antes* de pagar:

| cartas recebidas antes de pagar | quantos pagantes |
|---|---|
| **0 cartas** | **7 de 9** |
| 1 carta | 1 |
| 3 cartas (a última, 8 dias antes) | 1 |

**Todo mundo que pagou, a máquina de cartas mal tinha tocado.** As 104 pessoas
mais bombardeadas da casa pagaram **zero**. Escrever a 8ª carta para elas é
insistir no único gesto que já provou não funcionar (memórias
`carta-nova-so-depois-da-velha-mover` e
`medir-os-remedios-existentes-antes-do-setimo`).

**🔴 3. A V1 COLIDIRIA COM A PISTA IRMÃ, PUBLICADA HÁ POUCAS HORAS.**

O ciclo FECHAR A VENDA subiu hoje (`1b4f3d9a`) a
`checkout_hot_nudge_emailed_v1`: quem aperta comprar e não conclui é procurado
em **30 minutos**. É a mesma coorte da lista A, com carta melhor (chega quente,
não pede nova decisão de preço). Minha V1 chegaria por cima, fria, com uma
premissa falsa. A ordem diz explicitamente: *"não repita nem colida"*.

**DECISÃO DA ROTAÇÃO: a V1 não sai como escrita, e não sai hoje.** Não é
recusa da ordem do fundador — é a mesma ordem cumprida pelo lado que ainda
não foi tentado. O "caminho diferente" que ele pediu não pode ser *mais uma
carta para os mesmos*: esses são justamente os únicos que já ouviram tudo.

**O QUE MEDI DAS OUTRAS DUAS LISTAS**

**Lista B — Autopilot ($299): 7 pessoas em 30d** (10 em 90d, mas as 3 extras
são a conta do próprio fundador e dois e-mails descartáveis). Confirmada como a
melhor aposta da noite, e é a única que **não manda e-mail nenhum** — vira
rascunho para a caixa do fundador. Ressalva honesta que vai no arquivo: só
**uma** das 7 parece empresa de verdade; as outras são gmail pessoal com 1
filme. O `amount_total` é **nulo em todas**, então a casa **não sabe** que elas
viram $299 — sabe que clicaram no tier `autopilot`. O rascunho não pode afirmar
o valor.

**Lista C — afiliados: BLOQUEADA, e a auditoria de 28/08 continua de pé.**
15 afiliados, **25 cliques na história** (14 nos últimos 30d, o último em
05/09), **0 atribuições e 0 comissões — nunca, nem uma**. Mandar os 12 pedirem
divulgação hoje é pedir que trabalhem de graça num trilho que comprovadamente
não credita. **V3 só depois do conserto da atribuição** — que é código que
ninguém mais está tocando, e por isso vira a próxima rotação.

**SONDA QUE PASSOU:** o trial de $1 está no ar de verdade.
`/api/stripe/checkout?tier=basic&billing=monthly&trial=1` devolve **307** para
`/signup?...redirect=...trial%3D1` — o parâmetro **sobrevive ao login**.
Controle numa rota irmã inexistente: **404** (memória
`sonda-401-exige-controle-404`), com User-Agent identificável e não-`curl`
(memória `sonda-com-ua-de-curl-cai-no-ramo-do-robo`).

**ONDE ESTÁ A GENTE DE VERDADE.** Depois da correção, a lista A honesta tem
**9 pessoas** — e uma delas salta da página: **18 filmes entregues, 4 sessões
de checkout ao longo de 42,5 horas, saldo zerado, e a casa mandou para ela
UMA carta na vida.** É o lead mais quente do banco e ninguém falou com ela.
Essa é a matéria-prima da próxima rotação, junto do conserto de atribuição.

**PRÓXIMA ROTAÇÃO (#2):** consertar a atribuição de afiliado (25 cliques → 0
atribuições) com guardião e sonda em produção — é conserto de trilho de
receita, não carta, e destrava a V3.

---

## ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada nesta rotação.** Não há disparo esperando você. Os rascunhos do
   Autopilot ficam prontos em `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md` na
   rotação #2 — aí sim você copia e envia da sua caixa.
2. **Se discordar da decisão de não disparar a V1 hoje**, escreva uma linha no
   PEDIDOS que eu disparo na rotação seguinte — a rota é barata de escrever; o
   que eu não faço sozinho é mandar uma frase falsa para 104 pessoas.

## 📋 O QUE ACONTECEU
Fui escrever a carta das "44 que voltaram duas vezes" e descobri que essa
coorte **não existe**: contando por sessão em vez de por evento, são **9**
pessoas, não 104 — um clique em comprar dispara três eventos com menos de um
segundo entre eles. A carta abriria mentindo para quase todo mundo.
Descobri também que **103 dessas 104 já receberam carta nossa** (7,4 em média,
uma pessoa recebeu 19) e que **7 dos nossos 9 últimos pagantes nunca tinham
recebido carta nenhuma** — a máquina de e-mail não é o que traz assinante.
E a pista irmã acabou de publicar uma carta melhor para essa mesma gente.
Por isso a V1 não saiu. Em compensação achei onde tem gente de verdade: uma
pessoa com **18 filmes entregues** que voltou ao checkout 4 vezes em 42 horas e
recebeu **uma** carta na vida, e o trilho de afiliados, que tem 25 cliques e
**zero atribuições na história inteira** — receita que a casa deixa cair no
chão. É o que a próxima rotação conserta.

---

### #2 — 17:52-18:35 — O TRILHO DE AFILIADO NÃO ESTÁ QUEBRADO: ESTÁ VAZIO. E OS 7 RASCUNHOS DO AUTOPILOT ESTÃO PRONTOS

**O que eu ia fazer:** o que a rotação #1 mandou — consertar a atribuição de
afiliado (25 cliques → 0 atribuições), com guardião e sonda, para destravar a
V3. **Não consertei, e a razão desmonta a própria premissa da #1.**

**🔴 O CONSERTO JÁ EXISTE HÁ 9 DIAS. O QUE NÃO EXISTE É GENTE.**

A auditoria de 28/08 dizia que o cookie `sf_aff` só era lido por rota chamada
de dentro do `(dashboard)` — o caminho de compra não passava lá. Fui ver se
ainda é verdade **antes** de escrever código. Não é: `076ca7bb` (29/08,
"finalize affiliate attribution at signup") pôs
`finalizeAffiliateSignupAttribution()` dentro de `app/auth/callback/route.ts`,
que é o ponto por onde **toda** conta nova passa, lendo os dois cookies
enquanto o OAuth ainda os carrega.

Então medi a adoção em vez da existência (memória
`contrato-de-servidor-sem-chamador`): a função grava
`affiliate_signup_attribution_result` em **toda** finalização — sucesso ou
falha — e só volta cedo, sem gravar, quando **não há cookie nenhum**.

| desde o conserto (29/08) | |
|---|---|
| cadastros novos | **313** |
| cliques em link de afiliado | 8 |
| desses, **humanos** (fora bot/preview) | **6** |
| eventos `affiliate_signup_attribution_result` | **0** |

**Zero atribuições porque zero pessoas que clicaram num link de afiliado
criaram conta.** Não é o cadeado emperrado; é ninguém batendo na porta. Rodei
o denominador exatamente porque "0 escritas" mente sem ele (memória
`zero-escritas-conte-as-oportunidades`): aqui o denominador é **6**, não 313.

**E os "25 cliques da história" também encolhem quando se olha o user-agent:**

| | cliques | visitantes aprox. |
|---|---|---|
| bot / preview (SemrushBot, WhatsApp) | **10** | 10 |
| plausivelmente humano | 15 | **9** |

Dos 15 "humanos", **10 são uma rajada de 25 minutos no mesmo código
(`YDRP6UR5`, 04/08)** com o mesmo Android — é o próprio afiliado testando o
link dele. Sobra **um punhado de visitas reais em cinco semanas**, contra 313
cadastros no mesmo período: o canal de afiliados responde por
**arredondamento zero** da aquisição.

**DECISÃO: a V3 não sai, e a razão mudou.** A #1 bloqueou a V3 porque "o
trilho não credita". O motivo verdadeiro é outro e é mais duro: **pedir a 12
afiliados que divulguem mais é pedir esforço a um canal que produziu 6 visitas
humanas em 9 dias.** Construir a atribuição perfeita agora seria instalar uma
caixa registradora numa loja sem clientes (memórias
`medir-alcance-da-superficie-antes-de-ligar` e
`dimensionar-a-coorte-antes-de-construir-o-remedio`). ⚠️ Registro o que isto
**não** prova: a atribuição nunca foi exercitada por um caso real, então ela
não está *verificada* — está *sem oportunidade*. No dia em que houver tráfego,
o primeiro `affiliate_signup_attribution_result` é o que prova ou derruba ela.

**🟢 O QUE EU ENTREGUEI NO LUGAR: A V2 INTEIRA.**

`docs/RASCUNHOS-AUTOPILOT-2026-09-07.md` — **7 rascunhos individuais**,
assunto + corpo + destinatário, prontos para o fundador copiar da caixa dele.
Nenhum e-mail saiu da casa e nenhuma rota de envio foi criada: a ordem V2 pede
rascunho, e lista B é B2B.

O que a medição mudou nos rascunhos, e vale para qualquer carta futura:

1. **Nenhum diz "você voltou duas vezes".** Os 7 têm 2-3 eventos de checkout
   com **menos de 1 segundo** entre o primeiro e o último — são sete cliques
   únicos. É a mesma armadilha que matou a V1 hoje, e ela reaparece em toda
   lista construída por contagem de evento.
2. **Nenhum cita $299.** `amount_total` é **nulo nos 7**: a casa sabe o tier
   clicado, não o preço que apareceu na tela. Afirmar o número seria inventar.
3. **Nenhum promete crédito ou desconto.**

**A lista B, sem maquiagem:** 10 registros → menos a conta do fundador → menos
2 e-mails descartáveis = **7**. Destes, **1** parece empresa (`krk.infotech`),
**6** estão com saldo 0, **1 nunca fez um filme**. Não é uma lista de agências;
são 7 pessoas físicas que clicaram uma vez no plano do topo. **O upside é o
ticket, não a temperatura da lista** — o MRR de hoje é ~$109, e um Autopilot
sozinho quase triplica isso. É por isso que 7 e-mails à mão valem a noite.

**Os dois que eu marquei para hoje, e por quê:**
- **um deles colou um storyboard inteiro em russo, com marcação de tempo**
  (`0–8 сек`, cena a cena). Quem chega com decupagem por segundo produz para
  alguém. Esteve no site **hoje às 16:25**. Fiz uma versão RU do e-mail.
- **outro cadastrou ontem, fez o filme, clicou no Autopilot 2 minutos depois e
  voltou hoje às 13:30** — e **nunca recebeu carta nenhuma da casa**. Que é
  exatamente o perfil dos pagantes: 7 dos últimos 9 tinham recebido **zero**
  cartas antes de pagar (medido na #1).

**O contraste que resume a noite:** a pessoa mais bombardeada desta lista
recebeu **11 cartas** e não pagou; as duas que nunca receberam nenhuma são as
duas com sinal de compra. A casa vem gritando com quem já desistiu e ficando
muda para quem acabou de chegar.

**PRÓXIMA ROTAÇÃO (#3):** V4/V5 — a medição das cartas (`docs/queries/`) e a
varredura de respostas, que é onde o SLA de 48h da casa já falhou uma vez
(24/08: 5 clientes escreveram, 4 ficaram sem resposta). E, como o canal de
afiliado saiu do cardápio, a vaga livre vai para a **lista A honesta de 9
pessoas** — em especial a que tem 18 filmes entregues, 4 sessões de checkout
em 42,5 horas e **uma** carta na vida.

---

## ✅ O QUE VOCÊ PRECISA FAZER
1. **Abrir `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md` e mandar os dois da
   CAMADA 1 da sua caixa** (`popkamladencz@gmail.com` — tem versão em russo
   pronta — e `mohandasjas1@gmail.com`). São os dois que estiveram no site
   hoje. Assunto e corpo estão prontos para copiar.
2. **Os outros 5 (camadas 2 e 3) ficam para quando sobrar tempo** — o arquivo
   diz, um a um, o sinal de cada um e por que o #7 provavelmente não vale o
   e-mail.
3. **Nada mais.** Nenhum disparo automático esperando você; nenhuma rota de
   e-mail nova foi criada nesta rotação.

## 📋 O QUE ACONTECEU
Fui consertar a atribuição de afiliado e descobri que **ela já foi consertada
há 9 dias** — e que o número que assustava ("25 cliques, 0 atribuições") é
outro erro de denominador: 10 dos 25 cliques são robô, 10 são o próprio
afiliado testando o link dele, e **desde o conserto foram 6 cliques humanos
contra 313 cadastros novos**. Zero atribuições porque **zero** dessas pessoas
abriu conta. O trilho não está furado; está vazio — e mandar 12 afiliados
divulgarem mais seria pedir esforço a um canal que traz arredondamento zero.
Em vez disso entreguei a V2 inteira: **7 rascunhos individuais** para as
pessoas que abriram o plano Autopilot, prontos na sua caixa, com a verdade de
cada um. Dois valem hoje: alguém que trouxe um **storyboard em russo com
marcação de tempo** e esteve no site às 16:25, e alguém que **chegou ontem,
clicou no plano de cima e nunca recebeu uma carta nossa** — que é justamente
o perfil de quem paga. Um Autopilot fechado quase triplica o MRR da casa.

---

### #3 — 18:22-18:42 — O DINHEIRO DA CASA NASCE NO DIA ZERO, E A MAIOR VAZÃO DE E-MAIL APONTA PARA O DIA DEZ

**O que eu ia fazer:** V4/V5 — a medição das cartas e a varredura de respostas.
Fiz a V5, mas a medição virou outra coisa no meio do caminho e mandou a rotação
para um lugar melhor.

**🔴 A JANELA DE COMPRA DA KINEO TEM OITO HORAS.**

Fui medir "quantas cartas cada pagante tinha recebido antes de pagar" (o achado
da #1) por um eixo novo: **quanto tempo depois do cadastro cada um pagou.**
12 pagantes orgânicos em 90 dias, contas externas:

| horas do cadastro até pagar | quantos |
|---|---|
| menos de 1 hora | **5** |
| menos de 8 horas | **7** |
| menos de 48 horas | **10** |
| 247h e 399h | **2** — e são as **duas pessoas da campanha de review de agosto** |

**Nenhum pagante orgânico da história nasceu depois do D2.** A mediana é
**5,8 horas**. Os dois "pagantes tardios" que sobram compraram por acordo
(review paga), não por carta.

⚠️ **O que isto NÃO prova**, e eu não vou fingir que prova: que falar cedo faz
pagar. Quem paga em 30 minutos pode ter chegado já decidido — a carta não é a
causa, é só a testemunha. **O que está provado é o desencontro**, e ele é
grande.

**🔴 A CASA DÁ BOM-DIA 20 HORAS DEPOIS DA VENDA.**

| 380 cadastros em 14 dias | |
|---|---|
| receberam alguma carta (algum dia) | **380 de 380** |
| receberam alguma carta nas primeiras **8h** | **134** |
| **mediana até a primeira carta** | **25,3 h** |

E a maior vazão de e-mail da casa aponta para o outro lado do funil:

| carta | envios em 14 dias |
|---|---|
| `trial_expired_lastcall_d10` | **400** |
| `trial_expired_offer_d5` | **385** |
| `trial_downgraded_loss` | 323 |
| `trial_ending_soon` | 296 |
| `trial_d0_welcome` | **285** |

**785 cartas de pós-morte contra 285 de boas-vindas — 2,7 para 1 na direção da
janela onde nenhum pagante orgânico jamais nasceu.** E o CTA delas **já estava
medido em zero dentro do próprio código**, pelos comentários das sprints
#21/#22: 442 D5 + 276 D10 = **718 envios, 0 checkout, 0 pagante**.

**FALSIFIQUEI DUAS VEZES ANTES DE ACREDITAR.** (a) A `d0_welcome` tem uma
distribuição bimodal esquisita — 101 pessoas em ≤6h, **zero entre 6h e 24h**,
168 entre 24h e 48h. Testei se o meu eixo estava errado (o código conta idade a
partir do início do trial, não do cadastro): **não estava** — a mediana entre
cadastro e concessão do trial é **0,00h**. (b) Testei se era supressão engolindo
a carta: **também não** — `yielded` é 0 em 285 envios de welcome, e só 17 de 275
tinham recebido outra carta antes. O atraso é a guarda `D0_MIN_AGE_MS` somada à
janela de 24h que o "your video is ready" carimba — e isso é **decisão
deliberada e correta** do código (o e-mail transacional é melhor que o welcome
genérico). **Não há defeito no welcome. Não abri hotfix.**

**🟢 O QUE SUBIU (EM PRODUÇÃO, `6df8d833`, ponta da main confirmada).**

Em vez de escrever a sétima carta para quem já ouviu tudo, **o CTA provado em
zero ganhou ao lado a porta mais barata que o produto tem**: o trial pago de
7 dias, que a pista irmã ligou hoje. Nas duas cartas de maior vazão, **só no
ramo de quem TEM filme entregue**.

Antes de escrever uma linha, conferi **no código do cobrador** que a porta abre
para esta gente: o único gate de `?trial=1` é `profile.has_paid === true`, e
trial morto nunca pagou. Coorte elegível, caixa aberto.

O que **não** mudou, de propósito:

- **o cupom COMEBACK50** — código, prazo, porcentagem e URL idênticos. Ele é do
  Codex; o trial entra **antes** dele por ser a barreira menor, e o cupom
  continua no corpo como alternativa;
- **o ramo de quem NUNCA fez um filme** — byte a byte. A objeção dessa pessoa é
  **prova**, não preço; ela continua recebendo o filme grátis de 1 clique.

**🔴 E A CASA ME PEGOU MENTINDO SOBRE PREÇO — DUAS VEZES, NA MESMA ROTAÇÃO.**

Escrevi primeiro o texto do botão do /pricing, verbatim: *"$1, then $15/mo"*.
Três guardiões antigos ficaram vermelhos numa regra que eu não conhecia e que
está certa: **`sem preco literal` neste arquivo.** O motivo é que a taxa de
entrada é `TRIAL_ENTRY_FEE_CENTS` = **100 unidades menores na moeda DA PESSOA**,
e o plano tem preço regional. Medido, 30 dias: **696 pessoas em usd, 80 em inr,
19 em brl.** Escrever "$1" seria mentir para **99 pessoas, 12% da base** — que é
exatamente o item 4 da auditoria de 28/08, "COPY QUE MENTE".

Troquei por "1.00" achando que resolvia. **Os guardiões ficaram vermelhos de
novo.** E, quando consertei o assunto, corrigi só a frase do singular — a do
**plural é outra string** e escapou com o "$1" vivo dentro. O guardião pegou
essa também. **Não afrouxei a trava em nenhum momento; tirei o número.** O
e-mail agora diz *"a 7-day Creator trial with a token entry fee — the checkout
shows it in your own currency"*, que é verdade nas três moedas.

**A dívida honesta que fica:** a versão com o número — que é o que realmente
puxa o gatilho de quem achou caro — exige **resolver a moeda por pessoa dentro
do cron**. É a próxima jogada natural, e não cabia nesta rotação sem mentir.

**Guardiões:** 44 verificações novas em
`scripts/test-porta-1-dolar-d5-d10.mjs`, amarradas à **variável que decide o
ramo** (um mutante que troca `if (c.videosMade >= 1)` por `if (true)` é
reprovado) e à **ordem** entre a porta e o cupom. Rodei 4 mutantes: 3 morreram
de primeira; o 4º **sobreviveu e o guardião estava fraco de verdade** — apagava
o cupom do corpo HTML e continuava verde, porque a frase existia também no corpo
de texto. Apertei a verificação, e aí ela **pegou uma regressão minha**: o D10
tinha perdido o código do cupom no HTML. Total: **138 verificações verdes**
(44 novas + 94 reapontadas), `tsc` limpo.

**Medição:** `docs/queries/VENDA-ASSISTIDA-2026-09-07.sql`, com o corte pelo
**carimbo** (`body = 'offer_with_film_1usd'`), nunca pelo relógio, e uma
checagem zero que fica vermelha se a carta um dia oferecer a porta a quem o
caixa recusaria. Confirmei no banco que `kind` (1700/1700) e `intent_campaign`
(348 eventos, `trial_1usd` já entre eles) existem de verdade antes de escrever
a consulta.

**Alcance:** ~56 cartas por dia passam por esse ramo. **Nenhum e-mail novo foi
criado, nenhuma lista nova foi construída, nenhum desconto novo foi inventado.**

**PRÓXIMA ROTAÇÃO (#4):** a moeda por pessoa dentro do cron — é o que devolve o
número ao assunto sem mentir para 12% da base, e o número É o gatilho. Depois
dela, a V4 (varredura de respostas).

---

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada de código.** O `6df8d833` já está na ponta da `main` e o deploy sobe
   sozinho; a fila ficou vazia.
2. **Continua de pé o pedido da #2:** mandar da sua caixa os **dois rascunhos da
   CAMADA 1** em `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md` — são as duas pessoas
   do Autopilot que estiveram no site hoje.
3. **Uma decisão sua, quando quiser:** as cartas D5/D10 mandam **785 e-mails a
   cada 14 dias** para uma janela que em 90 dias **nunca produziu um pagante
   orgânico**. Eu coloquei a porta barata dentro delas em vez de desligá-las,
   porque desligar carta é decisão de dono. Se você quiser cortar essa esteira e
   jogar o esforço para as primeiras 8 horas, me diga e eu faço.

## 📋 O QUE ACONTECEU

Fui medir as cartas e descobri **onde o dinheiro da Kineo realmente acontece:
nas primeiras horas.** Dos 12 pagantes orgânicos dos últimos 90 dias, **5
pagaram na primeira hora, 7 em menos de 8 horas e 10 em menos de 2 dias** — e os
dois únicos que pagaram depois disso são as duas pessoas da campanha de review
de agosto. **Nenhum cliente orgânico nasceu depois do segundo dia.** Enquanto
isso, a maior vazão de e-mail da casa — 785 cartas a cada 14 dias — aponta
justamente para o dia 5 e o dia 10, e o botão dessas cartas já estava medido em
**718 envios com zero compras**. Em vez de escrever mais uma carta, coloquei
**dentro delas** a porta mais barata que o produto tem: o trial pago de 7 dias
que subiu hoje, antes do cupom, sem tocar no cupom e sem mexer na carta de quem
nunca conseguiu fazer um filme. E a casa me pegou: eu tinha escrito "$1" no
e-mail, e três guardiões antigos apitaram — **12% da nossa base não paga em
dólar**, então esse "$1" seria mentira para 99 pessoas. Tirei o número em vez de
afrouxar a regra, e anotei a dívida: para devolver o número ao assunto, o cron
precisa saber a moeda de cada pessoa. É a próxima jogada.

---

### #4 — 18:52-19:40 — EU TIREI O PREÇO DA CARTA POR UMA PREMISSA QUE ESTAVA MORTA HAVIA 18 DIAS

**ERRADO.** Na rotação #3, algumas horas atrás, eu tirei o "$1" do e-mail de
maior vazão da casa e escrevi no diário, com todas as letras, que dizer o
número **seria mentir para 99 pessoas, 12% da base**. Deixei no lugar *"a token
entry fee — the checkout shows it in your own currency"* e registrei como
dívida honesta "resolver a moeda por pessoa dentro do cron".

**A dívida não existia. A premissa estava morta desde 20/08.**

Fui abrir o cobrador para escrever o resolvedor de moeda e encontrei, em
`lib/checkoutPricing.ts`:

```ts
export type CheckoutCurrency = 'usd'                      // união de UM valor
export function resolveCheckoutCurrency(_country) { return 'usd' }   // ignora o país
```

É a V6 de 19/08 — **"preço global pra todo mundo, mais simples"**, decisão do
próprio fundador. O item avulso do trial é `unit_amount: 100` nessa moeda.
**Toda pessoa do planeta é cobrada US$ 1,00.** O tipo tem um valor só: um
`currency === 'brl'` em qualquer tela do produto é erro de compilação.

**FALSIFIQUEI NO BANCO ANTES DE ACREDITAR NO CÓDIGO.** Eventos com
`metadata.currency` nos últimos 30 dias: **usd 1121 · inr 143 · brl 70** — é
daqui que saiu o meu "12%". Mas o número que eu não tinha olhado é o
**relógio**: o último evento não-usd da história é de **20/08 10:38 UTC**. No
corte de 20/08 12:00 até agora: **751 eventos com moeda, 751 em usd, zero
exceções.** O `brl` inteiro era **uma pessoa**.

Eu li uma tabela de 30 dias que atravessa a mudança e herdei a conclusão sem
cortar no evento que a mudou — exatamente as memórias
`conferir-a-constante-antes-de-herdar-a-tabela` (limiar herdado é afirmação
sobre o código, não fato) e `cegueira-documentada-expira` (cegueira anotada tem
prazo; reconferir no banco antes de descartar a fonte).

**O QUE ISSO CUSTOU.** A conclusão fechada desta casa (fundador, 19/08,
estudada várias vezes) é que **o vazamento do checkout é PREÇO**. O número é o
gatilho de quem achou caro. Eu troquei o gatilho por um eufemismo para proteger
uma coorte que não existe mais — em **~56 cartas por dia**.

**🟢 O QUE SUBIU (`10ae69b4`).** O número voltou, e volta **derivado**:

- `lib/lifecycle/trialEntryFee.ts` (novo, puro): o rótulo sai de
  `formatCheckoutMoney` sobre `CARD_TRIAL_ENTRY_FEE_MINOR`, e a mensalidade de
  `getTierPrice('basic')` — as **mesmas** funções e constantes que a caixa do
  pós-vídeo da pista irmã e o cobrador usam. Nada digitado.
- **Corpo (D5 e D10):** *"the cheapest way back in is 7 days of Creator for $1,
  then $15/mo. Cancel anytime."*
- **Assunto (D5):** *"Your 62-second film is still in your Library — $1 gets
  Creator back for 7 days"*. **(D10):** *"Last call — your 62-second film is
  waiting, and $1 is the cheapest way back"*.
- **Intocados de propósito:** o cupom COMEBACK50 (código, prazo, porcentagem,
  URL — é do Codex) e o ramo de quem nunca fez um filme, byte a byte.

**🔴 E EU QUASE REPETI O ERRO DENTRO DO PRÓPRIO CONSERTO.** Dez minutos depois
de escrever o bloco que diz "dinheiro não se digita", escrevi `then $15/mo` à
mão. **Esse `$15` teria passado por TODOS os guardiões** — porque eles recortam
o *bloco* do D5/D10 e a constante mora fora do recorte (memória
`guardiao-que-conta-texto-nao-prova-condicao`). Trocado por `getTierPrice`.

**PROVA DE QUE DERIVA, NÃO DESCREVE.** Guardião que lê texto não prova
comportamento, então **compilei o módulo e rodei**. Saída real: `"7 days of
Creator for $1, then $15/mo"`. Mutando a constante para 250 em tempo de
execução, a mesma função devolve `"$2.50"` — e o centavo não-redondo **não** é
cortado, porque o corte é condicionado ao sufixo `.00` e nunca um `slice` cego
(lição do menino da bolha, 27/08).

**GUARDIÃO:** `scripts/test-preco-do-trial-derivado.mjs`, 28 verificações. A que
faltava na #3 é a **tripwire**: no dia em que `CheckoutCurrency` ganhar um
segundo valor, o teste fica **vermelho na hora**, porque aí o rótulo resolvido
sem país volta a ser mentira. Rodei 4 mutantes, cada um conferido como
**escrito em disco** antes de rodar (memória `mutacao-precisa-provar-que-aplicou`):
`$1` digitado no assunto, linha digitada à mão, multi-moeda de volta, e o
eufemismo da #3 reintroduzido — **os 4 morreram**.

A trava antiga `sem preco literal` continua **verde e não foi afrouxada**: ela
proíbe o número **digitado**, e o derivado não aparece no fonte. Corrigi só o
*motivo* escrito ao lado dela, que ainda dizia "/pricing resolve a moeda".

**206 verificações verdes** nos 6 guardiões da família, `tsc` limpo.

**Quem recebe:** ninguém novo. Nenhuma lista nova, nenhum e-mail novo, nenhum
desconto novo. Mudou o que as ~56 cartas/dia que já saíam passam a dizer.

**PRÓXIMA ROTAÇÃO (#5):** a V4 do cardápio — varredura de respostas às cartas,
com o SLA de 48h da casa.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada de código.** O `10ae69b4` está na fila e sobe sozinho.
2. **Continua de pé o pedido da #2:** mandar da sua caixa os **dois rascunhos da
   CAMADA 1** em `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`.
3. **Continua de pé a decisão da #3:** as cartas D5/D10 mandam 785 e-mails a
   cada 14 dias para uma janela que nunca produziu um pagante orgânico. Agora
   elas pelo menos dizem o preço. Se quiser cortar essa esteira, me diga.

## 📋 O QUE ACONTECEU

Eu me peguei mentindo — para você, no diário de algumas horas atrás. Tinha
escrito que não dava para pôr "$1" no e-mail porque 12% da nossa base não paga
em dólar. Fui construir a solução e descobri que **desde 19/08, por decisão sua
de preço global único, existe uma moeda só: todo mundo paga US$ 1,00**, e o
banco confirma — 751 eventos com moeda nos últimos 18 dias, 751 em dólar. Eu
tinha lido uma tabela de 30 dias que atravessa essa mudança e herdado o número
velho. Resultado: a carta que mais sai da casa passou horas dizendo *"uma taxa
simbólica, o checkout mostra na sua moeda"* em vez de **$1** — justamente para
quem foi embora achando caro. Voltei a pôr o número, mas nunca digitado: ele é
lido da mesma constante que a Stripe cobra, então se você mudar a taxa amanhã o
e-mail muda sozinho. E deixei um alarme: se um dia a moeda voltar a variar, o
teste fica vermelho antes de a carta mentir de novo.
