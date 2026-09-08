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

#### #4b — 19:00 — ADENDO MEDIDO: o eufemismo quase certamente não chegou a ninguém

Fui medir quantas pessoas já tinham recebido a versão sem o número e o
resultado é o melhor possível: **o carimbo `offer_with_film_1usd` tem ZERO
linhas em toda a história do banco.**

O que existe são **155 cartas `offer_with_film`** (o bundle anterior) entre
02/09 e **hoje 21:25 UTC** — vazão de ~23/dia no ramo de quem tem filme (13 D5
+ 10 D10 só hoje). O cron roda **de hora em hora no minuto :25**, e a #3 entrou
na `main` às **21:39 UTC — 14 minutos DEPOIS** da última rodada. A janela em
que o eufemismo esteve em produção não pegou nenhuma rodada do cron.

**Mas "quase certamente" não é medição.** As duas versões gravavam o mesmo
`body`, então se uma rodada tivesse escapado eu não teria como distinguir a
carta que esconde o valor da carta que o diz. Subi `c92e7e37`: a versão com o
número passa a carimbar **`offer_with_film_1usd_priced`**. Qualquer linha com o
carimbo **sem** o sufixo é a versão do eufemismo — e a medição passa a saber
qual carta cada pessoa leu sem depender do relógio.

**Estado:** `origin/main = c92e7e37`, fila vazia. A próxima rodada do cron
(22:25 UTC) deve ser a primeira a sair com o preço na cara.

---

### #5 — 19:22-19:45 — O E-MAIL QUE MAIS FALA COM CLIENTE PEDIA $7/MÊS, E TEVE ZERO CLIQUES EM CINCO DIAS

**O que eu ia fazer:** a V4 do cardápio — o cron de digest das respostas às
cartas V1/V3, com o SLA de 48h.

**Por que ela não sai: as cartas V1 e V3 não existem.** A #1 decidiu não
disparar a V1 (a coorte era um erro de contagem: 9 pessoas, não 104), e a #2
bloqueou a V3 (o trilho de afiliado não credita porque ninguém que clicou abriu
conta). Um digest de respostas a duas cartas que nunca saíram mede o silêncio de
uma sala vazia. E o MCP do Gmail está proibido nesta rotina, então a caixa do
fundador eu não leio de qualquer forma. **A V4 fica registrada como
não-aplicável, não como feita.**

Fui então atrás do que o cardápio chama de V6 — "o que os dados disserem".

**🔴 O ACHADO. A CASA TEM UMA SUPERFÍCIE DE DINHEIRO 13× MAIOR QUE A QUE AS DUAS
PISTAS ESTÃO DISPUTANDO, E ELA PEDIA A COISA ERRADA.**

A pista irmã passou o dia brigando pelo slot único da TELA de filme pronto, e
mediu (fv-r6b) que a pergunta comercial ganha **7 dos 105 slots em 7 dias** — 1
por dia. Enquanto isso, o **e-mail** de filme pronto:

| | |
|---|---|
| envios com pedido de dinheiro dentro, desde 02/09 | **187** |
| pessoas distintas | **132** |
| vazão | **~13/dia** |
| chegadas no link de plano que ele carrega | **0** |

**ZERO. Em toda a história do carimbo.** O `intent_campaign` do link de plano
(`video_ready_email_plan_truth_v1`) não tem uma linha.

**CONTROLE RODADO ANTES DE CHAMAR DE ZERO** (memórias
`zero-escritas-conte-as-oportunidades` e `provar-leitura-sem-trafego`): o campo
`intent_campaign` **é** escrito, e muito — 726 linhas para
`push69_home_one_click_starters`, 247 para `studio_v4`, 1.073 eventos com o
campo no total. Se alguém tivesse clicado, estaria lá. **O zero é real, não é
cegueira de instrumentação.**

E o pedido que essas 187 cartas carregavam era *"Plans from $7/month"* — uma
decisão mensal, no minuto em que a pessoa acabou de receber um filme. **A oferta
mais barata da casa, ligada hoje às 16:10 por ordem sua, não existia em
e-mail nenhum.**

**🟢 O QUE SUBIU (`7d3b0817`, EM PRODUÇÃO, fila 0).** A porta de entrada paga
entrou nos **três** remetentes de "seu filme está pronto", que compartilham um
único módulo (`lib/lifecycle/videoReadyFooter.ts`):

1. a rota de status — a de maior vazão, sai em todo render;
2. o cron `send-video-ready`;
3. o cron dos *stranded* — **o único ponto de contato dos ~7% de entregas que
   chegam só por e-mail** (medição fv-r5c: 33 só-e-mail + 27 sem tela em 30d).
   Essa gente não vê **nenhuma** superfície de oferta da tela; a pista irmã
   registrou que não ia atrás deles, e é exatamente a minha metade da casa.

**AS TRAVAS DE HONESTIDADE** (memória `vitrine-oferece-o-que-o-cobrador-recusa`):

- **A porta exige `has_paid === false` PROVADO — não `!isSubscriber`.** Esta é a
  decisão de projeto que mais importa aqui. O predicado vizinho é mais largo *e*
  nasce `false` quando a leitura do perfil falha: usá-lo abriria a porta
  justamente para quem a casa não sabe nada. **Desconhecido não vira `false`.**
  No banco `has_paid` nunca é nulo (1.824 false / 13 true), então exigir o
  `false` explícito **não custa alcance nenhum** e protege da leitura falha.
- **Nenhum número digitado.** Taxa, mensalidade, dias e créditos saem de
  `lib/lifecycle/trialEntryFee.ts` (a peça da #4) e de `lib/checkoutPricing.ts`
  — as mesmas constantes que a Stripe cobra. Se você mudar a taxa amanhã, os
  três e-mails mudam sozinhos.
- **O `tier` do link é lido da rota do cobrador pelo guardião**, não presumido.
- **O e-mail NÃO promete export limpo.** A caixa da tela pode dizer *"Get this
  film clean"* porque tem o `renderId` e o `/api/compose/unlock`. O e-mail **não
  tem esse caminho** — prometer ali seria vender o que o link não entrega
  (CLAUDE.md: nunca prometer o que o produto não sabe executar sozinho). Ela
  promete exatamente o que a Stripe faz no clique: os dias, os créditos que
  entram no ato, a mensalidade a partir do dia 8, e o cancelamento.
- **O plano continua visível** logo abaixo (sua ordem: nunca esconder o plano).
- **Com saldo, o episódio 2 continua vindo PRIMEIRO** — é a peça que melhor
  prevê pagamento (27 pessoas usaram o botão de série, 3 pagaram). A porta entra
  como linha, entre o episódio 2 e o plano cheio. Sem saldo, ela lidera: é o
  único ramo em que a pessoa não tem nada de graça para fazer a seguir.

**O CONTROLE DE REGRESSÃO QUE ME DEIXOU SUBIR ISTO SEM MEDO.** Sem `hasPaid`, o
rodapé sai **byte a byte** como saía antes — e a prova é que as **50
verificações do guardião irmão passaram sem eu editar uma asserção sequer**.

**GUARDIÃO:** `scripts/test-porta-1usd-no-email-de-entrega.mjs`, **57
verificações** rodando a função REAL (transpileModule), com **6 mutantes, todos
mortos**: trocar a trava pelo predicado largo · digitar o preço à mão · abrir a
porta para assinante · carimbar a porta sem pô-la no HTML · esconder o plano ·
prometer export limpo. **217 verificações verdes** na família inteira, `tsc`
limpo.

**⚠️ EU QUEBREI TRÊS ASSERÇÕES ALHEIAS E NÃO AFROUXEI NENHUMA.** O
`test-stranded-ready-footer` estava 42/42 na ponta e ficou 39/42 comigo. As três
causas, e o que fiz:

1. `!html.includes('0 credits')` ficou vermelha por **colisão de substring**: a
   porta diz *"80 credits now"*, e "8**0 credits**" contém "0 credits". A
   intenção da asserção (a casa nunca afirmar que a pessoa tem zero) continua
   valendo — **reancorei em fronteira de palavra e somei uma segunda** checando
   a frase inteira. Ficou mais estrita, não menos.
2. o carimbo do evento mudou de forma: atualizei a âncora e **somei** a
   verificação de que as **duas** fases carimbam.
3. a trava *"nenhum preço digitado neste trecho"* pegou o **valor citado num
   comentário meu**. Reescrevi o comentário. Afrouxar uma trava de preço para
   caber uma frase minha seria trocar proteção real por conforto de escrita.

**MEDIÇÃO (V5 do cardápio):** carimbo próprio `trial_door` + `has_paid` nos três
eventos de envio — o `footer` sozinho não separa a versão com porta da sem — e
um `intent_campaign` próprio no link, que a rota de checkout propaga até o
`payment_success`. Consultas em
`docs/queries/VENDA-ASSISTIDA-2026-09-07.sql` (V5.1 a V5.4), **cortadas pelo
campo novo e nunca pelo relógio** (memória `campo-novo-e-o-carimbo-do-deploy`).

**SONDA EM PRODUÇÃO, COM CONTROLE:** a URL da porta devolve **307** para
`/signup?reason=checkout&redirect=…` **preservando o `trial=1` e o
`intent_campaign`** através do login; rota irmã inexistente devolve **404**
(memória `sonda-401-exige-controle-404`), com User-Agent identificável e
não-`curl` (memória `sonda-com-ua-de-curl-cai-no-ramo-do-robo`). Conferi também
que a página de signup constrói o link de login **preservando o redirect** — os
destinatários todos já têm conta, e sem isso a porta morreria no primeiro clique
(memória `sondar-o-destino-do-link-antes-de-enviar`).

**QUEM RECEBEU: ninguém ainda, e o zero está medido honestamente.** O carimbo
novo tem **0 linhas** — mas **as entregas nos últimos 30 min também são 0**, e a
última de toda a casa é de 21:52 UTC, antes do deploy. **É zero-oportunidade,
não zero-entrega.** A próxima entrega carrega o carimbo.

**Nenhum e-mail novo foi criado, nenhuma lista nova, nenhum desconto, nenhum
crédito.** Mudou o que ~13 cartas/dia que já saíam passam a oferecer.

**PRÓXIMA ROTAÇÃO (#6):** ler a V5.1/V5.2 assim que houver entregas com o
carimbo, e — se a porta aparecer e ninguém clicar — a jogada não é uma sétima
carta, é olhar os **56 "nenhuma das três"** que a pista irmã achou sem dono.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada de código.** O `7d3b0817` já está em produção, fila 0, sonda com
   controle passada.
2. **Continua de pé o pedido da #2:** mandar da sua caixa os dois rascunhos da
   CAMADA 1 em `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`. É o único item da noite
   que só você pode executar.
3. **Continua de pé a decisão da #3:** as cartas D5/D10 mandam 785 e-mails a
   cada 14 dias para uma janela (dia 5-10) que nunca produziu um pagante
   orgânico — os pagantes compram no dia zero. Se quiser cortar essa esteira,
   me diga.

## 📋 O QUE ACONTECEU

Passei a rotação atrás de onde a casa ainda fala com cliente e achei um
desperdício grande: o e-mail de "seu filme está pronto" — o único que chega no
minuto em que a pessoa está mais feliz, e que saiu **187 vezes para 132 pessoas**
desde 02/09 — pedia *"assine por $7/mês"*, e esse pedido teve **zero cliques em
toda a sua história**. Enquanto isso as duas pistas gastavam o dia disputando um
espaço na tela que aparece **1 vez por dia**. O e-mail vale 13.

Pus ali dentro a oferta de entrada que você mandou ligar hoje, nos três
remetentes — incluindo o que fala com os ~7% de clientes que nunca veem a tela e
só recebem e-mail. O plano continua visível abaixo; quem já pagou nunca vê a
oferta de entrada, porque a Stripe recusaria e a casa não anuncia o que o
cobrador nega. Nenhum valor está escrito no código: todos são lidos das mesmas
constantes que a Stripe cobra, então se você mudar o preço amanhã os três
e-mails mudam sozinhos. E o e-mail **não** promete o filme sem marca d'água —
esse caminho só existe na tela, e prometer o que o link não entrega é como a
casa perdeu a confiança do Rick em agosto.

Ninguém recebeu ainda: não houve nenhuma entrega de filme na última meia hora.
A próxima já sai com a oferta e com carimbo próprio para eu medir.

---

### #6 — 19:52-20:10 — A PORTA DE UM DÓLAR NASCEU NAS DUAS CARTAS QUE FALAM FORA DA JANELA DE COMPRA

**O QUE ESTAVA ERRADO.** O fundador mandou ligar hoje a porta de entrada
paga — a oferta mais baixa que a casa tem. Ela foi instalada de tarde (va-r3,
va-r4) nas cartas **D5** e **D10**: as pessoas cujo trial morreu há cinco e há
dez dias. A rotação #3 já tinha avisado que essa janela nunca produziu um
pagante orgânico. Eu instalei a porta lá mesmo assim, porque eram as cartas
que eu estava lendo.

**A MEDIÇÃO QUE VIROU A DECISÃO** (60 dias, contas externas, campo
`utm_campaign` — e com **controle rodado**: o campo tem **1.073 chegadas** e
**25 campanhas distintas**, então um zero nele é zero de verdade, memória
`taxa-agregada-esconde-cta-morto`):

| carta | envios 60d | pessoas | visitantes que voltaram |
|---|---|---|---|
| `d0_welcome` | 719 | 718 | **10** — e não pede dinheiro nenhum |
| `downgraded_loss` | **686** | 676 | 4 no link de dinheiro + 2 nos temas |
| `ending_soon` | 671 | 670 | 8 |
| `expired_offer_d5` | 561 | 561 | ~4 |
| `expired_lastcall_d10` | 445 | 445 | ~2 |
| `trial_extended` | 54 | 53 | 3 |

**E a janela em que a casa realmente vende, medida de novo** (12 pagantes em
90 dias, conta do fundador fora): **DEZ pagaram em menos de 48 horas do
cadastro** — 0,0h · 0,1h · 0,4h · 0,5h · 1,0h · 4,2h · 7,4h · 24,3h · 41,4h ·
42,7h. Os outros dois: um no dia 10 (247h) e um no dia 16, e o do dia 16 é a
review que a casa cobrou duas vezes em agosto. **As duas cartas que ganharam a
porta hoje de tarde falam com a pessoa depois que a janela fechou.**

⚠️ **CORREÇÃO DE UM NÚMERO MEU DA #5.** Eu escrevi no diário e nos PEDIDOS que
o e-mail de entrega era "a maior superfície de dinheiro da casa, por ~13×".
Ele sai ~13 vezes por dia; **o cron de ciclo de trial sai 103 vezes por dia**
(3.137 em 60 dias). A frase valia para "superfície que pede dinheiro" e eu não
qualifiquei. A alocação da #5 continua certa, o superlativo não.

**O QUE MUDOU** — `e8b401c4`, **EM PRODUÇÃO** (ponta remota confere, fila 0,
sonda `401` na rota do cron contra `404` no irmão inexistente, com
User-Agent identificável e não-`curl`).

A carta `downgraded_loss` — a que dispara **no minuto em que o trial morre e
os créditos somem** — passa a oferecer a porta de entrada nos **dois ramos de
quem já recebeu alguma coisa**, antes do `/pricing`, com **campanha própria
por ramo** (`trial_1usd_loss_burned` e `trial_1usd_loss`; um campo que aparece
em duas superfícies nasce de uma variável por superfície, senão os cliques
caem no mesmo balde).

**O que eu NÃO fiz, e é a metade que importa:** nenhuma carta nova, nenhuma
lista nova, nenhum desconto, nenhum crédito, nenhum cupom tocado, nenhum preço
público mexido. `/pricing` continua no e-mail, a tabela de filmes por plano
continua byte a byte, o episódio 2 continua, a Library continua sendo o
primeiro link. E o ramo **`neverRan` não recebe porta nenhuma** — quem nunca
viu um filme sair não tem objeção de preço, tem objeção de prova. Trocar um
CTA provado em ~zero é estritamente melhor do que escrever a sétima carta
(memórias `carta-nova-so-depois-da-velha-mover` e
`medir-os-remedios-existentes-antes-do-setimo`).

**Nenhum valor está digitado.** A frase inteira sai de `TRIAL_ENTRY_LINE`, que
lê a constante do cobrador — se o fundador mudar a taxa amanhã, esta carta
muda sozinha. A trava "sem preço literal" dos guardiões antigos continua verde
e **não foi afrouxada uma vírgula**.

**MEDIÇÃO NO MESMO COMMIT:** carimbo `trial_door` no evento de envio, com
**falso explícito** no ramo deixado de fora — sem ele o denominador vira "as
linhas que têm o campo" e quem foi excluído de propósito some da conta
(memória `sentinela-lido-como-valor-real`). Linha sem o campo é de antes e não
se mistura (memória `campo-novo-e-o-carimbo-do-deploy`).

**GUARDIÃO:** `scripts/test-porta-1-dolar-no-momento-da-perda.mjs` — **37
verificações verdes**, 30 de contrato e **7 mutantes, todos pegos**, cada um
provando que **aplicou** antes de exigir o vermelho (memória
`mutacao-precisa-provar-que-aplicou`). **Falsificado:** o mesmo guardião
copiado para uma worktree pristina na ponta anterior dá **15 ok / 22 falhas**
— ele não é vacante. `npx tsc --noEmit` verde. Os 15 guardiões que leem esta
rota rodaram: **11 verdes**, e os **4 vermelhos são herdados** — rodei os
quatro numa worktree pristina em `b24bb8af` e eles dão exatamente o mesmo
vermelho lá (ver PEDIDOS).

**QUEM RECEBEU: ninguém ainda, e o zero está medido honestamente.** O cron
roda de hora em hora aos :25; o último tick foi **19:25 BRT** e o deploy
subiu às **20:02**. **O carimbo tem 0 linhas porque nenhum tick correu depois
do deploy** — o próximo é 20:25 — zero-oportunidade, não zero-entrega. O próximo tick carrega. Pelo
volume dos últimos 30 dias, `downgraded_loss` sai ~11 vezes por dia.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada de código.** `e8b401c4` está em produção, fila 0, sonda com
   controle passada.
2. **Continua de pé o pedido da #2:** mandar da sua caixa os dois rascunhos da
   CAMADA 1 em `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`. É o único item da
   noite que só você pode executar.
3. **Continua de pé a decisão da #3:** as cartas D5/D10 mandam 1.006 e-mails a
   cada 60 dias para uma janela que nunca produziu um pagante orgânico. Elas
   agora carregam a porta, então não custa nada mantê-las — mas se quiser
   cortar a esteira, me diga.

## 📋 O QUE ACONTECEU

Você mandou ligar a oferta de um dólar. Ela foi ligada hoje nas cartas que
falam com quem desistiu há cinco e há dez dias. Fui medir onde a casa
realmente vende e a resposta foi seca: **dez dos seus doze pagantes dos
últimos noventa dias pagaram nas primeiras 48 horas**. As duas cartas que
receberam a oferta chegam muito depois disso.

Então mudei a carta que chega na hora certa: a que sai **no minuto em que o
trial da pessoa morre e os créditos somem**. É a de maior alcance da casa —
686 e-mails para 676 pessoas em 60 dias — e até hoje o único caminho de
dinheiro que ela oferecia era a página de planos, que é exatamente onde você
já concluiu, em agosto, que as pessoas acham caro. Agora ela oferece primeiro
o caminho de um dólar, e a página de planos continua logo abaixo.

Quem **nunca** conseguiu ver um filme sair continua sem receber pedido de
dinheiro nenhum: essa pessoa não tem objeção de preço, tem objeção de prova, e
para ela a carta continua oferecendo o filme grátis de um clique.

Ninguém recebeu ainda — o cron roda de hora em hora e o próximo tick é o
primeiro depois do deploy. Ele já sai carimbado, então na próxima rotação eu
consigo separar quem recebeu a porta de quem recebeu a carta antiga.

---

### #7 — 20:22-20:55 — A PRIMEIRA CARTA DA CASA PROMETIA O ÚNICO MOTOR QUE O SALDO NÃO ALCANÇA

**O QUE EU IA FAZER, E POR QUE NÃO FIZ.** Entrei nesta rotação para pôr a
porta de $1 no `d0_welcome` — a carta que fala dentro da janela em que a casa
vende. A medição matou o plano antes do código, e o que apareceu no lugar é
pior (e mais barato de consertar).

**PRIMEIRO, A JANELA, MEDIDA DE NOVO E MAIS FUNDO.** A #6 provou que dez dos
doze pagantes de 90 dias pagaram em menos de 48h. Fui perguntar **quantos
filmes eles tinham visto** antes de pagar:

| horas até pagar | filmes ANTES de pagar |
|---|---|
| 0,01 · 0,08 · 0,54 · 7,37 | **0** |
| 0,38 · 0,96 · 24,3 · 41,4 · 247 · 400 | 1 |
| 4,20 | 2 |
| 42,7 | 5 |

**Dez dos doze pagaram depois de ZERO ou UM filme. Quatro pagaram sem nunca
ter visto um filme sair.** A decisão de compra desta casa não é construída ao
longo do trial — ela acontece na chegada. E `D0_MIN_AGE_MS` é **4 horas**:
oito dos doze pagantes **já tinham pagado antes desta carta poder sair**.

**DEPOIS, O TAMANHO DA COORTE — E FOI ELE QUE MATOU A PORTA.** Eu ia pôr a
oferta no ramo de quem já fez um filme. Esse ramo **nunca disparou**: das 720
cartas `d0_welcome` de 60 dias, **720 foram para contas com zero filmes**.
Controle rodado, porque um zero desses costuma ser campo quebrado e não fato
(memória `zero-por-chave-inexistente`): o campo `videos_made` existe em 156
das linhas do `d0`, e **nas outras cartas ele marca >0 normalmente** —
`downgraded_loss` 70, `expired_offer_d5` 65, `expired_lastcall_d10` 90. O
campo funciona. O zero do `d0` é real. **Eu ia construir a porta num ramo que
não tem plateia** (memória `peca-sem-superficie-nao-existe`, terceiro caso).

**O QUE ESTAVA ERRADO, E É MAIOR.** Lendo a carta para instalar a porta, achei
a frase que 719 pessoas leram como **primeira coisa que a casa lhes disse**:

> "EVERY engine is unlocked, **Kling 3 included**."

A aritmética, lida das constantes e não de um documento:

| | créditos |
|---|---|
| trial grátis (`TRIAL_CREDIT_CAP`) | **25** |
| Seedance 1.5 (`cinematic_ai`) | **25** |
| **Kling 3** (`cinematic_hollywood`) | **150** |
| trial de $1 (`CARD_TRIAL_GRANT_CREDITS`) | 80 |
| Creator (`TIER_CREDITS.basic`) | 90 |
| Studio (`TIER_CREDITS.pro`) | 180 |

**Kling 3 custa seis vezes o trial inteiro.** Não cabe nos 25 do trial, não
cabe nos 80 do trial de $1, **e não cabe nos 90 do Creator**: o único degrau
em que um filme Kling 3 cabe é o Studio. A pessoa lê o nome do motor mais
caro da vitrine na linha de boas-vindas, entra, escolhe ele, e leva um não.

E o detalhe que dói: o comentário `KINEO-D0-EMAIL-REVIEW-2026-08-07`, que fica
**quatro linhas acima da string**, AFIRMA ter corrigido exatamente isto ("a
frase passa a ser 'every engine except Studio'"). A string nunca mudou. Um
comentário de conserto não é o conserto. É o item 4 da auditoria de 28/08
("COPY QUE MENTE") vivo, dez dias depois, na carta de maior alcance da casa.

**O QUE NÃO CONSEGUI MEDIR, E DIGO EM VEZ DE INVENTAR.** Quantas pessoas
bateram nessa parede é **desconhecido**: a recusa por crédito insuficiente na
escolha de motor **não emite evento nenhum**. Varri os 20 nomes de evento de
parede/crédito de 30 dias e nenhum registra isso. A aritmética é certa; a
contagem de vítimas não existe (memória `zero-escritas-conte-as-oportunidades`).

**O QUE MUDOU** — `a9066e3c`. A cláusula do meio da carta passa a nascer de
`trialReachClause()` (`lib/lifecycle/trialReachLine.ts`), que **lê a tabela do
cobrador** (`creditCostFor`) e diz o que o saldo alcança: 25 créditos = **um
filme Seedance 1.5 inteiro**, que é desenho e não acaso (o comentário
`KINEO-V6.1-2026-08-25` diz "o trial de 25cr segue comprando EXATAMENTE 1
Seedance"). Nenhum número digitado. Plural derivado do número na mesma
expressão — a lição de `KINEO-TRIAL-25-2026-08-21`, que já publicou "1 films"
na primeira linha que um estrangeiro lê do produto. Abaixo do custo de um
render a função devolve `null` e a carta sai **sem conta nenhuma**, em vez de
publicar "0 films".

**O QUE EU NÃO FIZ, E É A METADE QUE IMPORTA.** A promessa pública "every
engine is unlocked" **continua inteira na carta**. Eu tirei o NOME do motor
fora de alcance e pus o que está dentro; não encolhi a oferta. Encolher a
promessa pública é decisão de preço, e preço é seu.

⚠️ **E É POR ISSO QUE ISTO SOBE PARA VOCÊ, NÃO PARA O CÓDIGO:** a MESMA
promessa vive em **`lib/freeTierOffer.ts` (ON_COPY)**, em **quatro strings de
vitrine pública** — `headline` ("Start free — every engine unlocked,
**including Kling 3**"), `sentence` ("every engine unlocked — **Kling 3
included**"), `planCardBody` ("every engine unlocked **including Kling 3**") e
os dois `chip`. Não toquei em nenhuma: são a cara do site e mexer nelas é
mexer na oferta. Consertar só o meu portador e fechar o caso deixaria a
mentira viva no arquivo que ninguém audita (memória
`regra-vive-em-varios-arquivos`).

**MEDIÇÃO no mesmo commit:** carimbo `reach_films` no evento de envio, só no
`d0_welcome`, com **zero explícito** para quem sair sem a conta — sem isso o
denominador vira "as linhas que têm o campo" (memória
`sentinela-lido-como-valor-real`).

**GUARDIÃO:** `scripts/test-d0-alcance-do-saldo.mjs` — **44 verificações
verdes**, 37 de contrato e **7 mutantes, todos pegos**, cada um provando que
**aplicou** antes de exigir vermelho. A trava está amarrada à **aritmética**,
não a uma palavra proibida: se um dia o Kling 3 couber no saldo, a proibição
de nomeá-lo cai sozinha. **Falsificado**: numa worktree pristina em
`3ccce5a1`, com só o módulo copiado, o mesmo guardião dá **30 ok / 14
falhas**. `npx tsc --noEmit` verde **na base antes de eu tocar** (memória
`ponta-da-main-pode-estar-vermelha`) e verde depois.

**QUEM RECEBEU:** ninguém ainda — o cron roda aos :25 e o deploy é depois do
tick das 20:25. O carimbo separa quem recebeu a carta nova.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **DECIDIR sobre as quatro strings públicas de `lib/freeTierOffer.ts`.** Elas
   prometem "every engine unlocked, including Kling 3" para um saldo de 25
   quando o Kling 3 custa 150. Não mexi porque é vitrine e é preço. As saídas:
   (a) trocar "including Kling 3" por "including Seedance 1.5" (verdade, e o
   motor é bom); (b) deixar como está e aceitar o não na cara do cliente;
   (c) baixar o Kling 3 para caber em algum degrau abaixo do Studio.
2. **SABER que Kling 3 não cabe no Creator.** 150cr num plano de 90cr. Quem
   assina o Creator por causa do Kling 3 não vai conseguir rodar um. Isso é
   posicionamento, e é seu.
3. **Continua de pé:** mandar da sua caixa os dois rascunhos da CAMADA 1 em
   `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`.

## 📋 O QUE ACONTECEU

Fui pôr a oferta de $1 na carta de boas-vindas e descobri duas coisas melhores
que a oferta.

A primeira: **seus clientes decidem na chegada, não no trial.** Dez dos doze
pagantes dos últimos noventa dias compraram depois de ver zero ou um filme, e
quatro compraram sem nunca ter visto um filme sair. Oito deles já tinham pagado
antes da primeira carta poder sair. Quem compra desta casa compra rápido — e
quem não compra rápido, a esteira de e-mail não está resgatando.

A segunda: **a primeira frase que a casa diz a uma conta nova é falsa.** Ela
anuncia o Kling 3, o motor de topo, para uma conta com 25 créditos — e um filme
Kling 3 custa 150. É o motor mais caro do catálogo oferecido como boas-vindas a
quem tem um sexto do preço dele. A pessoa entra animada, escolhe o motor que
foi prometido, e leva um não na primeira tentativa. Isso está no ar há meses e
o próprio código tem um comentário dizendo que foi consertado — nunca foi.

Consertei na carta: agora ela diz o que os 25 créditos realmente compram, que é
**um filme Seedance 1.5 inteiro**. O número não está escrito em lugar nenhum —
sai da mesma tabela que cobra o cliente, então no dia em que o preço mudar a
frase muda sozinha.

O que eu não fiz de propósito: **a mesma promessa está em quatro lugares da
vitrine pública**, e ali eu não mexo. Encolher o que o site promete é decisão de
preço, e essas são suas. Estão nomeadas lá em cima com as três saídas.

---

### #8 — 20:52-21:15 — A CARTA QUE A #1 CANCELOU EXISTE, ESTÁ NO AR E SAI SOZINHA ÀS 22:12

**O QUE EU IA FAZER.** Pôr a porta de $1 na carta de boas-vindas (`d0_welcome`),
seguindo a #7. Não fiz — e a razão está medida abaixo.

**PRIMEIRO, A CONTA DAS TRÊS ROTAÇÕES ANTERIORES.** #5, #6 e #7 fecharam com a
mesma frase: *"quem recebeu: ninguém ainda"*. Fui conferir antes de escrever a
quarta porta. Envios do cron de ciclo de trial nas últimas 30h, por carimbo:

| carta | envios | com carimbo da porta |
|---|---|---|
| `downgraded_loss` (porta da #6) | 24 | **1** |
| `d0_welcome` (cláusula da #7) | 13 | **0** |

**A porta da #6 alcançou UMA pessoa, e só na última hora.** A cláusula da #7
ainda não pegou um envio sequer — o deploy dela é mais novo que o tique das
23:25 UTC. Empilhar uma quarta porta agora seria a quarta rotação seguida
entregando código que ninguém leu (memória `carta-nova-so-depois-da-velha-mover`).

**E A QUINTA PORTA NÃO TINHA PLATEIA MESMO.** Continuando a medição da #7: as
720 cartas `d0_welcome` de 60 dias foram **todas** para contas com zero filmes.
A carta que eu ia enriquecer fala com quem ACABOU de chegar e ainda não viu o
produto rodar. Não é a coorte de quem hesitou no preço — é a de quem nem chegou
lá.

**ONDE ESTÁ A GENTE QUE JÁ QUIS PAGAR.** A #1 deixou uma frase que ninguém
pegou em seis rotações: *"a lista A honesta tem 9 pessoas… é o lead mais quente
do banco e ninguém falou com ela."* Fui medir a coorte inteira, com a definição
que sobrevive ao achado da #1 (sessão, não evento):

| corte | pessoas |
|---|---|
| não-pagantes com intenção de checkout na história | **129** |
| … com pelo menos **1 filme entregue** | 86 |
| … **e saldo zerado** | **68** |
| dessas, elegíveis depois de TODOS os filtros da casa | **67** |
| … fora da supressão de 24h agora | **54** |
| … com 2+ visitas medidas por SESSÃO | 8 |
| filmes que a casa já entregou a essa gente | **132** |

Essa é a única coorte da casa que provou as duas coisas ao mesmo tempo: **que o
produto entrega para ela** (132 filmes) **e que ela chegou a querer pagar**. E,
diferente das 104 da #1, o que a casa tem para dizer a ela hoje **não é o oitavo
pedido — é um fato novo**: até 16:10 BRT de hoje a porta mais barata daqui era o
mês cheio. Ela bateu num preço que **mudou depois que ela desistiu**.

**O QUE MUDOU** — `516373fb` + `ad32c1e2`, **EM PRODUÇÃO** (sonda: a rota
devolve **403** e o controle irmão inexistente devolve **404** na mesma medição
— memória `sonda-401-exige-controle-404`, com UA identificável e não-`curl`).

`app/api/admin/send-second-try-1usd` — carta nova, padrão da casa (admin,
dry-run por default, teto de 30, pacing 600ms, supressão de 24h das cinco
fontes, descadastro no rodapé e nos headers, 1× por pessoa para sempre,
proibidos e internos fora). Três coisas nela não são cópia:

1. **A PREMISSA É MEDIDA POR PESSOA.** A frase *"on N separate visits"* só
   existe no corpo quando o `count(distinct session_id)` daquela pessoa é ≥ 2.
   Quem foi uma vez lê a carta sem nenhuma afirmação sobre visitas. É a correção
   literal do achado da #1 — 8 das 67 vão receber a frase; 59 não.
2. **O ASSUNTO NÃO CARREGA O TÍTULO DO FILME**, e o cardápio pedia que
   carregasse. `videos.title` nesta casa é o **prompt cru truncado em 120
   caracteres**: a amostra da própria coorte traz malaiala, tailandês, frase
   cortada no meio (*"Use the uploaded Spider-Man reference image as the main
   character reference. Keep the"*) e **uma linha de conteúdo adulto
   explícito**. Assunto com esse campo seria vergonha em 67 caixas de entrada.
   O que entra é a **contagem de filmes**, que é dela e é verdadeira.
3. **NENHUM NÚMERO DIGITADO.** Taxa, mensalidade, dias e créditos saem de
   `trialEntryFee`/`checkoutPricing`; o alcance dos 80 créditos sai de
   `trialReachClause` (que lê `creditCostFor`). A carta sai hoje dizendo *"7 days
   of Creator for $1, then $15/mo… that covers 3 full Seedance 1.5 films"* — e
   se o fundador mudar a taxa, ela muda sozinha.

**E A METADE QUE QUASE FICOU FALTANDO.** A rota nasceu só com sessão de admin —
e **nenhuma sessão desta pista tem cookie de admin**. Uma carta que depende de um
clique humano para existir é uma carta que não existe (a lição de 24/08: *"faço
na mão depois"* é onde promessa morre). O `ad32c1e2` deu a ela o **mesmo gatilho
das outras campanhas da casa**: o cabeçalho de segredo que o Vercel manda pela
lista do `vercel.json`, fail-closed se a env sumir. Relógio `12 1,13,18 * * *` —
e o minuto foi **escolhido**: nenhum outro job compartilha minuto E hora com ele.
⚠️ A folga de 5 minutos da memória `cron-no-mesmo-minuto-nao-tem-ordem` é
**impossível nesta casa** (`demo-render` roda `*/5`, então nenhum minuto do
relógio fica a mais de 2 minutos de algum job); o guardião exige o que se pode
exigir — zero coincidência exata.

**DRY-RUN NOMINAL** (replicado em SQL contra a linha real, porque a rota exige
cookie que eu não tenho — memória `provar-leitura-sem-trafego`): **67 elegíveis,
54 fora da supressão agora, 8 com a frase das visitas, 132 filmes entregues à
coorte.** Primeiro disparo **01:12 UTC (22:12 BRT)**, até 30 pessoas; o resto
às 13:12 e 18:12 UTC. Com o carimbo de 1×-para-sempre, a coorte se esgota em
duas rodadas e a rota vira inerte sozinha.

**GUARDIÃO:** `scripts/test-segunda-tentativa-1usd.mjs` — **81 verificações
verdes**, 74 de contrato e **7 mutantes, todos pegos**, cada um provando que
**aplicou** antes de exigir vermelho (memória `mutacao-precisa-provar-que-aplicou`).
Um mutante troca a taxa por um valor **diferente** de propósito: trocar pelo
valor real de hoje seria indetectável por comportamento, e a trava precisa morder
o dia em que o preço mudar e a carta continuar dizendo o número velho. `npx tsc
--noEmit` verde **na base antes de eu tocar** e verde depois.

**QUEM RECEBEU:** ninguém ainda, e desta vez o zero tem hora marcada — 01:12
UTC. A próxima rotação mede `second_try_1usd_sent` contra
`intent_campaign='second_try_1usd'` no checkout.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada para esta carta sair.** Ela dispara sozinha às 22:12 BRT. Se quiser ver
   a lista antes, abra logado:
   `usekineo.com/api/admin/send-second-try-1usd` (sem `confirm` = dry-run, não
   manda nada).
2. **Continua de pé, e é o único item que só você pode fazer:** mandar da sua
   caixa os dois rascunhos da CAMADA 1 em
   `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`. São as 7 pessoas que abriram o
   checkout de $299 — a casa não manda e-mail automático para elas de propósito.
3. **Decisão que ficou da #7 e não venceu:** as quatro strings de
   `lib/freeTierOffer.ts` que prometem *"every engine unlocked, including Kling
   3"* para um saldo de 25 créditos, quando o Kling 3 custa 150.

## 📋 O QUE ACONTECEU

Antes de escrever a quarta porta de $1 do dia, fui conferir quem tinha lido as
três primeiras: **uma pessoa**. Então parei de empilhar e fui atrás de gente.

Achei a coorte que estava na sua cara desde a primeira rotação e ninguém tinha
falado com ela: **68 pessoas que já receberam filme da Kineo, gastaram tudo,
foram olhar os planos e não compraram** — 132 filmes entregues a elas no total.
Elas não desistiram do produto; desistiram do preço. E o preço mudou hoje.

A carta que fala com elas está no ar e sai sozinha às 22:12. Ela não repete a
frase que a rotação #1 provou ser falsa ("você voltou duas vezes"): quem voltou
duas vezes lê isso, e as outras 59 leem uma carta que não afirma nada que a casa
não mediu. E ela termina com a única pergunta que essa lista nunca ouviu: *se
não foi o preço, me diz o que travou*.

### #9 — 21:22-21:55 — TRÊS ALARMES QUE EU IA PUBLICAR, TODOS FALSOS. E A COORTE MAIS QUENTE DA CASA É 46% ÍNDIA+NIGÉRIA

**ESTA ROTAÇÃO NÃO ENTREGOU CÓDIGO, DE PROPÓSITO.** A carta da #8 dispara às
01:12 UTC (22:12 BRT) e ninguém a leu ainda. Empilhar uma quinta porta de $1
antes disso é a quarta rotação seguida entregando peça que ninguém abriu
(memória `carta-nova-so-depois-da-velha-mover`). Com 50 minutos até o disparo, o
trabalho certo era **conferir a carta que já está armada** — porque a coorte é
1×-para-sempre: se o disparo sair torto, 30 dos leads mais quentes do banco
queimam e não voltam.

Conferi quatro coisas. **Três eram alarmes meus, e os três morreram na medição.**

**ALARME 1 — a supressão de 24h ia calar a carta. NÃO IA.** Entre agora e 01:12
UTC disparam oito jobs de e-mail; um deles, o `send-checkout-hot-nudge`, roda
4× por hora e fala com **intenção de checkout** — a mesma gente. É o desenho
exato da memória `supressao-sem-precedencia-cala-a-carta-boa`. Medi a coorte
inteira contra as cinco fontes de supressão, na hora do disparo:

| corte, medido na hora do disparo (01:12 UTC) | pessoas |
|---|---|
| coorte elegível | **67** (132 filmes — bate com a #8) |
| suprimidas no disparo | 13 |
| **livres no disparo** | **54** |
| último e-mail que a coorte recebeu | 07/09 21:25 UTC |

Sai para 30 às 01:12 e para as 24 restantes às 13:12. **A carta não vai ser
calada.** A memória não mordeu aqui, e agora está medido em vez de temido.

**ALARME 2 — o link da carta manda cliente antigo para o CADASTRO. FALSO, e
quase publiquei.** Sondei o CTA da carta com UA identificável e não-`curl`
(memória `sonda-com-ua-de-curl-cai-no-ramo-do-robo`), com controle irmão
inexistente na mesma medição (memória `sonda-401-exige-controle-404`):

- alvo → **307** para `/signup?reason=checkout&redirect=<checkout com trial=1,
  intent_campaign e resumed=1 inteiros>`
- controle inexistente → **404**

Fui ler o `/signup` no HTML e o link "Already have an account?" apontava para
`/login?redirect=%2Fstudio%2Fcreate%3Fwelcome%3D1` — **o checkout de $1
desaparecido**. Era o defeito perfeito: 67 pessoas que JÁ TÊM CONTA mandadas
para uma página de cadastro que joga fora a oferta.

**Só que o HTML que o curl busca é o placeholder do SSR.** O `loginHref` é
calculado no cliente (`app/(auth)/signup/page.tsx:296`, a partir de
`activationRedirectFromSearch`, com `useState` inicial `/studio/create?welcome=1`
justamente para não quebrar a hidratação — o comentário na linha 144 diz isso
com todas as letras). Depois de hidratar, o link carrega o checkout inteiro. E
`normalizeInternalRedirect` (`lib/authRedirect.ts:9`) **aceita caminho `/api/…`**
— só recusa origem externa, `//`, `\` e caracteres de controle. A corrente
resiste inteira: checkout → signup → login → checkout → Stripe.

⚠️ **A LIÇÃO, que é nova e vai para a memória:** `curl` numa página client-side
não prova o link que a pessoa clica — prova o valor inicial do `useState`. Eu
tinha memórias sobre bundle e sobre impressão; nenhuma cobria *placeholder de
SSR que a hidratação substitui*. Faltavam 40 minutos para o disparo e eu ia
mexer no caminho de compra da casa por causa de uma string que nunca chega a
aparecer para ninguém.

**ALARME 3 — a carta diz "$1" e "$15/mo" para quem não paga em dólar. NÃO
MAIS.** É a memória `preco-literal-em-email-mente`. Fui conferir e o
`lib/checkoutPricing.ts` tem hoje `export type CheckoutCurrency = 'usd'` — moeda
única, o desconto regional foi enterrado em 19/08 por nunca ter vendido uma vez.
**O número literal da carta é verdadeiro para os 67.** A memória valia enquanto
existia preço regional; hoje não morde.

**ALARME 4 — a carta é EN e a casa fala três línguas.** Medido: **66 dos 67 não
têm nenhum sinal de idioma** no banco (1 tem `pt`). Não há em que ramificar.
EN-only está certo, e não é preguiça — é ausência de sinal.

---

**O QUE SOBROU DA MEDIÇÃO É O ACHADO DA ROTAÇÃO — e é de dono, não de código.**
Fui ver de onde é a coorte mais quente do banco (entregou filme + gastou tudo +
bateu no checkout):

| país | pessoas |
|---|---|
| **Índia** | **21** |
| **Nigéria** | **10** |
| Estados Unidos | 6 |
| Alemanha | 3 |
| França · Brasil · Canadá · Austrália · Argélia · Espanha · Paquistão | 2 cada |
| Tailândia · África do Sul · Zâmbia · Bangladesh · (cauda) | 1 cada |

**46% da gente que mais quis comprar nesta casa está na Índia e na Nigéria.** E
em 19/08 a casa matou o preço regional porque "nunca vendeu nem uma vez" — o que
era verdade, com a ressalva registrada no próprio arquivo de que **o preço
regional ficou invisível na vitrine** durante quase toda a vida dele.

Isso muda a leitura da conclusão fixa do `CLAUDE.md` ("o vazamento do checkout é
PREÇO"). Ela continua certa; o que estava faltando é **de quem** é o preço. Não
é que $15 seja caro em abstrato: é que a metade mais quente da fila mede $15 em
rúpia e naira. E a porta de $1 que nasceu hoje é **a primeira oferta da história
desta casa que funciona nessa aritmética** — sem tocar em preço público, sem
cupom, sem desconto regional novo.

**A PREVISÃO QUE ISSO DEIXA, e que a próxima rotação pode falsificar:** se a
porta de $1 converter, o primeiro pagante de $1 sai de **IN ou NG**. Se sair dos
EUA, a tese de que a barreira é aritmética regional está errada e eu quero saber
disso hoje, não semana que vem.

**PLACAR DA NOITE** (marco 2026-09-07 18:38 UTC, contas externas): 1 pessoa com
`checkout_started`, **0 pagamentos**, nenhum evento de porta de $1 ainda. Último
`payment_success` da casa: **02/09 20:22 UTC — jejum de 5 dias, inalterado.**

**QUEM RECEBEU:** ninguém ainda. 30 às 01:12 UTC, 24 às 13:12 UTC.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada para a carta sair** — ela dispara sozinha às 22:12 BRT, para 30
   pessoas. Conferido nesta rotação: a supressão não a cala e o link resolve
   até a Stripe.
2. **Continua de pé, e só você pode:** mandar da sua caixa os rascunhos da
   CAMADA 1 em `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md` — as 7 pessoas que
   abriram o checkout de $299. A casa não manda e-mail automático para elas de
   propósito.
3. **Decisão sua, herdada da #7 e ainda não vencida:** as quatro strings de
   `lib/freeTierOffer.ts` que prometem *"every engine unlocked, including Kling
   3"* para um saldo de 25 créditos, quando o Kling 3 custa 150.

## 📋 O QUE ACONTECEU

Não escrevi código nesta meia hora, e foi a escolha certa: a carta da rotação
anterior estava armada para disparar em 50 minutos, para uma lista que só pode
ser usada **uma vez na vida**. Gastei o tempo conferindo se ela ia sair inteira.

Achei três motivos para abortar e derrubei os três com medição. O mais perto de
custar caro: o link da carta *parecia* mandar cliente antigo para uma página de
cadastro que jogava a oferta de $1 fora. Era o HTML cru mentindo — a página monta
o link certo no navegador. Se eu tivesse "consertado" isso, teria mexido no
caminho de compra da casa 40 minutos antes de um disparo, para corrigir uma
string que nenhum cliente jamais vê.

O que sobrou foi o achado que vale mais que o código que eu não escrevi: **a
metade mais quente da nossa fila de compra é Índia e Nigéria (31 de 67).** A casa
enterrou o preço regional em agosto por falta de vendas, e essa gente vem batendo
no mês cheio em dólar desde então. A porta de $1 de hoje é a primeira coisa que a
casa oferece que cabe no bolso dela — e às 22:12 ela vai saber que existe.

---

### #10 — 21:52-22:25 — AS CINCO PORTAS DE $1 DA CASA TIVERAM QUATRO CLIQUES EM SEIS HORAS, E OS QUATRO SOMOS NÓS

**O que eu ia fazer:** a V4 do cardápio (o digest de respostas). **Não dá para
fazer como está escrita** — o cardápio pede um cron que liste *respostas de
e-mail*, e o MCP do Gmail está na lista de ferramentas proibidas desta tarefa.
Um cron não tem como ler a caixa do fundador. Registro isso como limite, não
como pendência: o que dá para medir de resposta é o **clique**, e é o que a
V5 já mede.

**Então usei os 20 minutos antes do disparo para conferir se a carta sai
inteira — e o que apareceu no meio do caminho vale mais que o cron.**

---

#### 🔴 O ACHADO DA ROTAÇÃO: A PORTA DE $1 EXISTE HÁ SEIS HORAS E NENHUM HUMANO A TOCOU

A pista irmã construiu hoje **cinco portas de $1** (`trial_1usd`,
`trial_1usd_first_film`, `trial_1usd_active_banner`, `trial_1usd_upgrade_modal`,
`trial_1usd_downgrade`) e a minha carta abriu a sexta
(`video_ready_email_trial_1usd_v1` + `second_try_1usd`). Fui medir o que passou
por elas desde que a primeira subiu (**18:30 UTC**), separando por **origem**, e
não pelo relógio (memória `separador-de-sonda-e-origem-nao-relogio`):

| clique em checkout desde 18:30 UTC | `intent_campaign` | `session_id` | superfície | chegou ao `checkout_started`? |
|---|---|---|---|---|
| 18:44 | `trial_1usd` | **nulo** | `missing` | ❌ `auth_required` |
| 18:56 · 18:57 · 18:57 | — | real | `home` | ✅ (mês cheio) |
| 19:40 | — | real | `home` | ✅ (mês cheio) |
| 20:24 | — | nulo | `missing` | ❌ |
| 22:35 | `video_ready_email_trial_1usd_v1` | **nulo** | `missing` | ❌ `auth_required` |
| 00:24 | `second_try_1usd` | **nulo** | `missing` | ❌ `auth_required` |
| 00:31 | `trial_1usd_upgrade_modal` | **nulo** | `missing` | ❌ `auth_required` |

**Os quatro cliques que carregam campanha de $1 têm `session_id` nulo e
`checkout_entry_surface = 'missing'` — a assinatura de quem bate direto na API
sem navegador. São as nossas próprias sondas** (a minha da #9 às 00:24; a da
pista irmã às 00:31; as outras duas, das rotações da tarde).

**Os únicos cliques humanos da janela — três sessões reais, com `session_id` e
`surface = 'home'` — vieram todos SEM campanha nenhuma, ou seja, das linhas de
mês cheio da home.** Nenhum ser humano encontrou uma porta de $1 hoje.

Isto não acusa a pista irmã de nada: as portas estão montadas, a tubulação de
atribuição está verificada, e o caminho do deslogado foi sondado. **O que falta
não é porta — é gente na frente dela.** Seis horas de tráfego real (124
visitantes nas últimas 12h) passaram pela casa e a oferta mais barata da
história dela não apareceu para ninguém que pudesse comprar.

**É exatamente a razão de existir desta pista.** Às 01:12 UTC a carta põe a
porta de $1 na frente de 30 pessoas escolhidas por terem feito filme, gastado
tudo e ido olhar o preço. Se o clique humano existir, **ele nasce da carta, não
da tela** — e isso é falsificável hoje, não semana que vem.

---

#### QUATRO ALARMES CONFERIDOS ANTES DO DISPARO — TRÊS FALSOS, UM É ARMADILHA DE MEDIÇÃO

**1. "A carta pede resposta para um endereço que não recebe." FALSO.** O corpo
diz *"hit reply… it comes to me, not a helpdesk"*, com
`reply_to = joseph@usekineo.com`. O MX de `usekineo.com` resolve para
`smtp.google.com` (Google Workspace), e o endereço é o mesmo de **18 outras
rotas** da casa. Não é risco novo introduzido por esta carta.

**2. "O link da carta não carrega campanha, então o disparo é imedível." FALSO —
e o erro foi meu, de ler `grep` truncado.** A URL é montada em três linhas
(`route.ts:134-136`) e carrega `intent_campaign` **e** `utm_source/medium/
campaign`. Provado no banco: o clique de sonda das 00:24 chegou com
`intent_campaign = second_try_1usd` **mesmo deslogado** — o elo sobrevive ao
`checkout_auth_required`, que é o degrau onde a carta vai perder gente.

**3. "O checkout pode recusar o $1 para esta coorte." FALSO.**
`CARD_TRIAL_ENABLED = true` está **no código**, não em env (então não depende de
deploy novo — memória `env-nova-so-vale-em-deploy-novo`), `TRIAL_TIER = 'basic'`
bate com o `tier=basic` da carta, e a única recusa é `has_paid === true`, que é
**estrita** e exclui exatamente quem a coorte já exclui.

**4. ⚠️ ARMADILHA REAL, E EU QUASE PUBLIQUEI O NÚMERO: "0 checkouts com trial em
24h".** Rodei `metadata->>'card_trial' = '1'` e deu **0** contra 4 checkouts.
Antes de escrever, rodei o denominador certo: **`metadata ? 'card_trial'`
devolve ZERO linhas na história inteira da tabela** — a chave nunca foi gravada
uma vez. O meu "0 de 4" era `zero-por-chave-inexistente`, não um defeito.
⚠️ E o zero **também não prova o contrário**: como nenhum clique de $1 passou do
`auth_required`, a linha 1113 do checkout (`checkoutMetadata.card_trial = '1'`)
**nunca teve oportunidade de rodar**. Fica registrado como *sem oportunidade*,
nunca como *verificado* — o primeiro `checkout_started` da carta é o que prova.

---

#### 🟢 O DISPARO ACONTECEU. 30 CARTAS, 01:12:43 → 01:13:03 UTC.

Fiquei acordado em cima do relógio para ver, porque toda rotação desta pista
desde a #5 fechou com *"quem recebeu: ninguém ainda"*. **Acabou.**

| o disparo, medido no banco | |
|---|---|
| `second_try_1usd_sent` | **30** |
| janela do envio | 01:12:43 → 01:13:03 UTC (20 segundos, pacing de 600ms) |
| filmes que a casa já entregou às 30 | **90** (de 1 a 18 por pessoa) |
| receberam a frase *"on N separate visits"* | **7** — as outras 23 leem uma carta que não afirma nada sobre visitas |
| restantes da coorte, para 13:12 UTC | 24 |

**E o país das 30 é o teste da tese da #9, mais afiado do que eu esperava:**

| país | cartas |
|---|---|
| **Índia** | **9** |
| **Nigéria** | **8** |
| Argélia | 2 |
| Camarões · Alemanha · Espanha · Macedônia · Paquistão · Arábia Saudita · EUA · Austrália · Zâmbia · Canadá · Suíça | 1 cada |

**17 das 30 (57%) estão na Índia ou na Nigéria** — a coorte inteira era 46%, e
o sorteio das 30 saiu ainda mais concentrado. A previsão da #9 continua de pé e
agora tem denominador: **se a porta de $1 converter, o primeiro pagante sai de
IN ou NG.** Se sair dos EUA (1 carta), a tese de que a barreira é aritmética
regional está errada — e essa é a única carta americana da leva.

---

#### O DIA INTEIRO, PARA O FUNDADOR LER DE UMA VEZ (07/09, contas externas)

| | |
|---|---|
| cadastros novos | **26** |
| filmes entregues | **27**, para **19** pessoas |
| e-mails que a casa mandou | **184** |
| pessoas que chegaram ao checkout | 3 sessões humanas, **todas no mês cheio** |
| cliques humanos em porta de $1 | **0** |
| **pagamentos** | **0** — último em 02/09 20:22 UTC, **jejum de 5 dias** |

A casa produziu 27 filmes e 184 e-mails hoje e não vendeu nada. As portas de $1
existem desde 18:30 UTC e nenhum humano as viu. **As 30 cartas de 01:12 são a
primeira vez no dia em que a oferta mais barata da casa foi posta na frente de
alguém que já provou que quer comprar.**

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada para a carta.** Saiu sozinha às 22:12 BRT para **30 pessoas**; as
   outras 24 saem às 10:12 BRT de amanhã. Com o carimbo de 1×-para-sempre, a
   coorte se esgota nessas duas rodadas e a rota vira inerte sozinha.
2. **Reserve 20 minutos amanhã para a caixa de entrada.** A carta termina com
   *"hit reply and tell me what actually stopped you"* e o `reply_to` é
   `joseph@usekineo.com` — as respostas caem na **sua** caixa, não na minha. A
   regra da casa é 48h (24/08: 5 clientes escreveram, 4 ficaram sem resposta).
   Me mande o texto de qualquer resposta e eu preparo o retorno.
3. **Continua de pé, e só você pode:** mandar da sua caixa os 7 rascunhos de
   `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md` — as pessoas que abriram o checkout
   de $299. A casa não manda e-mail automático para elas de propósito.
4. **Decisão sua, herdada da #7 e ainda não vencida:** as quatro strings de
   `lib/freeTierOffer.ts` que prometem *"every engine unlocked, including
   Kling 3"* para um saldo de 25 créditos, quando o Kling 3 custa 150.

## 📋 O QUE ACONTECEU

**A casa falou com 30 pessoas.** É a primeira vez hoje que essa frase é
verdadeira, e essas 30 não foram escolhidas por lista comprada nem por "quem
não abre e-mail há muito tempo": são gente que **fez filme aqui** (90 filmes
somados), **gastou tudo**, **foi olhar o preço** e não comprou. A carta diz o
que mudou hoje, sem desconto novo, e termina perguntando o que travou.

Antes de deixá-la sair, gastei os 20 minutos anteriores conferindo quatro
motivos de abortar. Três eram falsos — inclusive um que era erro meu de ler um
`grep` cortado. O quarto era uma armadilha de medição que eu ia publicar como
defeito: *"nenhum checkout carimbou o trial"* é verdade e não significa nada,
porque a chave nunca foi gravada uma vez na história da tabela e nenhum clique
chegou perto do ponto onde ela seria escrita.

E foi conferindo isso que apareceu o achado que importa mais que a carta: **as
cinco portas de $1 que a casa construiu hoje tiveram quatro cliques em seis
horas, e os quatro somos nós mesmos sondando.** Os únicos cliques humanos do
dia vieram da home, no mês cheio, sem passar perto do dólar. As portas estão
certas; o que faltava era alguém na frente delas. Às 22:12 passaram a ter 30.

---

### #11 — 22:35 BRT — os 15 sócios nunca tiveram motivo para postar, e o portão que a auditoria de 28/08 deixou aberto já estava fechado

**O que estava errado.** O cardápio (V3) mandava escrever para os afiliados
**só depois** de provar que o link deles atribui — porque a auditoria de 28/08
tinha registrado *"12 ativos, 17 cliques, 0 atribuições, 0 comissões; o cookie
`sf_aff` só é lido por rota chamada de dentro do (dashboard)"*. Convidar 14
pessoas a divulgar um link que não credita seria a promessa sem executor que
custou o e-mail *"Feeling forgotten"* em 22/08.

**Conferi os três degraus antes de escrever uma linha de e-mail, e os três
estão de pé:**

| degrau | como foi provado | resultado |
|---|---|---|
| **clique** | sonda em produção, UA de navegador, no código do afiliado **interno** (para não distorcer parceiro) | `307` + `sf_aff` + `sf_aff_click` + `sf_aff_hint`, e a linha gravada em `affiliate_clicks` |
| **controle da sonda** | mesma medição, código inexistente | `307` para a home e **nenhum** `Set-Cookie` |
| **cadastro** | `app/auth/callback/route.ts:171` | chama de verdade `finalizeAffiliateSignupAttribution` com os dois cookies, enquanto o OAuth ainda os carrega |
| **dinheiro** | `app/api/stripe/webhook/route.ts:613` | lança a linha em `affiliate_commissions` e marca o referral como `paid` |

**Então por que 0 atribuições na história? Não é defeito — é ausência de
tráfego.** Medido hoje:

| | |
|---|---|
| sócios ativos | **15** |
| cliques em 5 semanas | **25** |
| códigos que já receberam um clique | **5** de 15 |
| **sócios sem UM clique na vida** | **10** |
| cliques do maior deles | 10, no **mesmo dia**, de **3 IPs** (cara de auto-teste) |
| cliques com UA de robô | 6 |
| `affiliate_signup_attribution_result` na história | **0** — nenhum cadastro jamais chegou carregando o cookie |

Contar "0 escritas" sem contar as oportunidades teria virado um conserto
inventado. A máquina está inteira; **ninguém nunca foi convidado a clicar.**

**O que mudou (SHA `09f11484`, EM PRODUÇÃO — 403 na rota nova contra 404 no
controle, às 22:30 BRT).** `app/api/admin/send-affiliate-wakeup-1usd`, no padrão
da casa: admin/cron, dry-run por padrão, teto de lote, pacing de 600ms, 1× por
pessoa para sempre, supressão de 24h, descadastro, proibidos e internos fora.
Mais o carimbo em `LIFECYCLE_EMAIL_EVENT_NAMES` e o gatilho de cron no **mesmo
commit** — sem ele, os 5 sócios que a supressão segura hoje só receberiam se um
humano clicasse.

**O que a carta diz, e o que eu recusei escrever.** Ela leva o link dele, a
comissão dele **lida do banco por pessoa** (não os "40%" da página), a vitrine
`/examples` para pegar filmes, e o fato novo: até esta tarde ele precisava
convencer alguém a assinar um mês inteiro; agora a porta mais barata da casa é
a entrada de um dólar. **O pedido dele ao público mudou depois que ele parou de
postar.**

⚠️ **Recusei "seu link teve N cliques".** É verdade aritmética e mentira útil:
os 10 do maior vieram de 3 IPs no mesmo dia, há UA de robô no meio, e quando o
sócio perguntar quantos viraram conta a resposta é zero. A carta não cita
clique, conversão nem ganho acumulado — para ninguém. Cita o link, que é
verdadeiro para os 15.

**Dry-run nominal (predicado da rota replicado em SQL contra a linha real):**

| | |
|---|---|
| sócios elegíveis (14 = 15 − o interno) | **14** |
| opt-out | 0 |
| já receberam esta carta | 0 |
| **suprimidos 24h** (já receberam outra carta nossa hoje) | **5** |
| **saem no primeiro lote, 02:18 UTC** | **9** |
| saem no segundo lote, 14:18 UTC | 5 |

**Quem são os 14:** 9 nunca tiveram um clique; 7 também já fizeram filme aqui
(conhecem o produto); **nenhum é pagante**. E dois deles não são usuário avulso:
os domínios são **`colormango.com`** e **`toolriot.com`** — sites de diretório
de software. A casa tem dois parceiros de distribuição parados há semanas sem
nunca terem recebido material.

**Guardião:** `scripts/test-afiliados-acordam.mjs`, **60 verificações, 60
verdes**, rodando a função real por `transpileModule`, com mutante do `confirm`
que prova ter sido aplicado e duas travas anti-vacância (uma delas pegou um
vermelho legítimo meu: a checagem do código do sócio estava medindo a resposta
de dry-run em vez da metadata do evento).

**Quem recebeu até agora:** ninguém — o cron dispara às **02:18 UTC (23:18
BRT)**, dentro da janela. A rotação seguinte confere o envio pelo carimbo.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada para a carta dos sócios.** Ela sai sozinha às **23:18 BRT** para 9
   pessoas e às 11:18 de amanhã para as outras 5. Com o carimbo de 1×-para-
   sempre, a coorte de 14 se esgota nessas duas rodadas e a rota vira inerte.
2. **Reserve a caixa de entrada de amanhã para DUAS cartas, não uma.** A dos 30
   (segunda tentativa, saiu às 22:12) e a dos 9 sócios (23:18). As duas terminam
   com *"hit reply"* e as duas caem em `joseph@usekineo.com`. Me mande o texto
   de qualquer resposta e eu preparo o retorno.
3. **Continua de pé, e só você pode:** mandar da sua caixa os 7 rascunhos de
   `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md` (os que abriram o checkout de $299).
4. **Decisão sua, herdada da #7:** as quatro strings de `lib/freeTierOffer.ts`
   que prometem *"every engine unlocked, including Kling 3"* para 25 créditos,
   quando o Kling 3 custa 150.

## 📋 O QUE ACONTECEU

A casa tem **15 sócios comerciais** e nunca falou com nenhum deles. Não é que o
programa de afiliados esteja quebrado — eu conferi os três degraus (clique,
cadastro, comissão) em produção e os três funcionam. É que **10 dos 15 nunca
tiveram um único clique no link**, e o programa inteiro produziu 25 cliques em
cinco semanas, com robô e auto-teste dentro. Ninguém foi convidado a postar.

Hoje eles ganham um motivo que não existia ontem: o que eles pedem ao público
deles deixou de ser "assine um mês" e passou a ser "gaste um dólar". E dois dos
14 são sites de diretório de software — distribuição de verdade, parada.

**A próxima jogada, tirada do que a medição mostrou hoje:** os dois sócios de
diretório (`colormango`, `toolriot`) não deveriam receber a mesma carta que um
criador — para eles, o ativo não é o link, é a **ficha do produto atualizada**.
Nossa listagem no TAAFT ainda diz trial de 40cr e "from $9.90/mo", e agora
existe uma entrada de $1 que nenhum diretório do mundo sabe que existe. Um
"changelog de preço" enviado a diretórios é distribuição gratuita que não
depende de o sócio ter audiência — e é a única alavanca do dia que não pede
nada de ninguém além de um e-mail.

---

### #12 — 23:00 BRT — a carta funciona e ninguém clicou ainda; a caixa de respostas não existe; e dois sócios de diretório receberam o pedido errado

**O que eu vim conferir.** A carta das 22:12 saiu para 30 pessoas. A pergunta
da rotação não era "deu certo?" (40 minutos não respondem isso) e sim **"o
caminho está de pé para as 24 que ainda vão receber amanhã às 10:12?"** — porque
o carimbo é 1×-para-sempre: se o link estiver quebrado, a coorte inteira se
queima e não há segunda chance.

**Medição da carta, 46 minutos depois do envio:**

| | |
|---|---|
| `second_try_1usd_sent` | **30 pessoas**, 01:12–01:13 UTC |
| voltaram ao site (qualquer evento) | **0** |
| clicaram o link da carta | **0** |
| pagaram | **0** |

⚠️ **A primeira medição que eu fiz estava errada e eu a joguei fora.** Cruzei os
30 por `user_id` — e **clique de caixa de entrada chega deslogado**, sem cookie,
com `user_id` nulo (memória `clique-de-inbox-chega-sem-cookie`). Um clique
humano teria ficado invisível. Refiz por **campanha**, que é o campo que
sobrevive ao deslogado: `intent_campaign`/`utm_campaign` contendo `second_try`
ou `1usd`, sem join de usuário. **Continua zero, e agora o zero é confiável.**
Zero às 22h de um domingo, 46 minutos depois do disparo, é *cedo*, não é
veredito — a coorte tem gente em vários fusos e a rotação seguinte remede.

**O caminho da carta está PROVADO de ponta a ponta, e é o que importa para as
24 de amanhã.** Sondei a URL exata que saiu no e-mail, com UA de navegador
(nunca `curl` pelado — memória `sonda-com-ua-de-curl-cai-no-ramo-do-robo`):

| degrau | resultado |
|---|---|
| link da carta, deslogado | **307** para `/signup?reason=checkout&redirect=…` com **`trial=1`, `intent_campaign` e os três `utm` intactos** + `resumed=1` |
| **controle** (rota inexistente, mesma medição) | **404** — a sonda separa |
| a pessoa já tem conta e cai no `/signup` | a página oferece *"Already have an account? Sign in"* |
| esse "Sign in" preserva a porta? | **sim** — `loginHref = /login?redirect=<activationRedirect>`, e `activationRedirectFromSearch` devolve o redirect explícito antes de qualquer padrão |
| o `/login` honra? | **sim** — `resolveAuthRedirect(params.get('redirect'), '/')` |
| o normalizador não come a query? | **não** — `normalizeInternalRedirect` devolve `pathname + search + hash` |

Ou seja: **carta → porta de $1 → signup → sign in → de volta à porta de $1**.
A corrente está inteira nos cinco elos. O zero de hoje é ausência de clique,
não caminho quebrado.

**V4 (digest de respostas) É IMPOSSÍVEL COMO ESTÁ ESCRITO — e eu não construí.**
O cardápio pedia um cron que listasse as respostas às cartas. Conferi: `reply_to`
aparece **só na saída** (os 30+ remetentes em `app/api/admin/send-*`), não existe
nenhuma rota de cron com `inbox`/`reply`/`digest`, e **não há webhook de entrada
da Resend em lugar nenhum**. As respostas caem na caixa do fundador e **o
aplicativo nunca as vê**. Um cron construído assim imprimiria zero para sempre, e
"ninguém respondeu" se lê igual a "a casa é cega" (memória
`corrida-de-campanha-sem-linha`). **Não subi máquina de zero.** Quem quiser V4 de
verdade precisa antes de captura de entrada (webhook inbound), que é decisão de
infraestrutura do fundador — não de código meu.

**O erro que eu peguei tarde demais para consertar, e a escolha que fiz.** A
carta de sócios dispara às 23:18 BRT. Medindo quem está nela, achei que
**`colormango.com` e `toolriot.com` NÃO estão suprimidos** — ou seja, os dois
diretórios de software estão no primeiro lote e vão receber a carta escrita para
**criador** ("poste para o seu público"), gastando o único tiro do carimbo
1×-para-sempre no pedido errado. A va-r11 já tinha previsto isso na jogada final
dela; o que ela não viu é que eles cairiam no **primeiro** lote.

**Decidi NÃO mexer no cron, e o motivo é a régua da casa.** Faltavam 20 minutos:
código + `tsc` + fila + publicar + deploy (até 6 min) não cabe com segurança, e
um deploy pousando **no meio** do disparo pode derrubar a carta dos 9. A carta
genérica também **não é falsa** para um diretório — leva o link deles e leva a
notícia que interessa (a entrada de $1). Hotfix impulsivo em caminho de cron vivo
é exatamente o que o `CLAUDE.md` proíbe.

**O que mudou (arquivo novo, rotação sem código): `docs/RASCUNHOS-DIRETORIOS-2026-09-07.md`.**
Dois rascunhos individuais, para o fundador enviar da caixa dele — a mesma regra
da lista do Autopilot: **contato B2B merece pessoa, não campanha**. O pedido é o
que serve a um diretório e que a carta automática não faz: **atualizar a ficha
do produto**, com a tabela de preço conferida.

⚠️ **E foi conferindo a tabela que apareceu o achado que vale mais que os dois
e-mails: o `CLAUDE.md` publica preço errado.** Ele ainda descreve a tabela **V5**
(`$9.90 / $19.90 / $39.90`, trial de 50 créditos) como se fosse vigente. No
código (`lib/checkoutPricing.ts`, ponta de `origin/main`) a V6 de 19/08 mandou:
**Starter $7/40cr · Creator $15/90cr · Studio $29/160cr**, trial grátis de **25**
créditos (`TRIAL_GRANT_CREDITS_COPY = 25`), mais a entrada de **$1 por 7 dias
com 80 créditos**. **Qualquer sessão que escrever preço a partir do `CLAUDE.md`
vai publicar dois números que não existem mais** — e foi por pouco que eu não
mandei "$9.90" para dois diretórios. Não editei o `CLAUDE.md` porque ele não é
arquivo desta pista; fica registrado no PEDIDOS.

**Quem recebeu:** nenhum envio novo nesta rotação. A carta de sócios (9 pessoas)
dispara às 23:18 BRT, 20 minutos depois deste registro; a rotação seguinte
confere pelo carimbo `affiliate_wakeup_1usd_sent`.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Enviar os 2 rascunhos de `docs/RASCUNHOS-DIRETORIOS-2026-09-07.md`** —
   `john@colormango.com` e `hello@toolriot.com`. São os dois únicos sócios que
   são canal de distribuição de verdade, parados desde julho/agosto.
2. **Corrigir o preço da nossa ficha no TAAFT** (a página é sua): hoje ela
   anuncia "from $9.90/mo" e trial de 40 créditos — os dois números morreram.
   O texto pronto para colar está no mesmo arquivo.
3. **Continua de pé:** os 7 rascunhos de `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`
   (os que abriram o checkout de $299).
4. **Reserve a caixa de entrada de amanhã para DUAS cartas** (os 30 da segunda
   tentativa e os 9 sócios). As duas pedem resposta e as duas caem em
   `joseph@usekineo.com` — **e a casa não consegue lê-las sozinha** (não existe
   captura de entrada). Me mande o texto de qualquer resposta e eu preparo o
   retorno.
5. **Decisão sua, herdada da #7:** as quatro strings de `lib/freeTierOffer.ts`
   que prometem *"every engine unlocked, including Kling 3"* para 25 créditos,
   quando o Kling 3 custa 150.

## 📋 O QUE ACONTECEU

A carta saiu para 30 pessoas e **ninguém clicou em 46 minutos**. Antes de tratar
isso como fracasso, conferi a única coisa que ainda dá para salvar: o caminho.
Ele está inteiro nos cinco elos, do link do e-mail até a porta de $1, inclusive
no desvio de quem já tem conta e cai no cadastro. **As 24 de amanhã vão para um
caminho que funciona.** Zero às 22h de domingo, 46 minutos depois do envio, é
cedo demais para significar alguma coisa.

Duas descobertas valem mais que o placar de hoje. A primeira: **a casa é cega
para as respostas.** As cartas terminam pedindo "responde e me diz o que
travou", e não existe nenhum mecanismo que traga essas respostas para dentro —
o cron que o cardápio pedia imprimiria zero para sempre. Preferi não construir a
máquina de zero e dizer isso.

A segunda apareceu por acidente, conferindo preço para escrever a dois
diretórios: **o documento permanente da casa está anunciando a tabela de preço
antiga**. Eu ia mandar "$9.90/mo" para dois sites que publicam nossa ficha para
milhares de pessoas. O preço real é $7, e existe uma entrada de $1 que nenhum
diretório do mundo sabe que existe.

**A próxima jogada:** os 30 e os 9 são a lista inteira que a casa tem — ela
acaba amanhã. O que não acaba é a ficha: `colormango`, `toolriot` e o TAAFT
publicam para gente que nunca ouviu falar de nós, e os três estão anunciando um
preço que é **mais caro do que o real**. Corrigir três fichas é a única alavanca
do dia que traz gente nova sem depender de mais ninguém abrir e-mail.

**ADENDO à #12 (02:05 UTC) — os 2 eventos de campanha das 01:53 SÃO A MINHA
SONDA, não um cliente.** Quem medir a carta depois desta linha vai encontrar
`intent_campaign = 'second_try_1usd'` em **2 eventos** (`checkout_attempted` +
`checkout_auth_required`, 01:53:41 UTC) e pode lê-los como o primeiro clique
humano. Não são: `session_id` **nulo**, `user_id` **nulo**,
`checkout_entry_surface = 'missing'` — a assinatura de quem bate direto na API
sem navegador, que é exatamente o que eu fiz para provar os cinco elos do
caminho. Separar por **origem, nunca por relógio** (memória
`separador-de-sonda-e-origem-nao-relogio`). **Clique humano da carta continua
em ZERO.**

⚠️ **E uma consulta minha que quase virou número publicado:** contar "quantos
dos 30 voltaram" com corte `created_at > 01:12` devolve **30**, porque o corte
pega os próprios eventos `second_try_1usd_sent` (gravados 01:12:43–01:13:03).
O denominador se contava a si mesmo. A pergunta certa exclui os eventos de
envio, e a resposta continua **0**.

---

### #13 — 23:22-23:55 BRT — as duas cartas saíram inteiras e ninguém clicou; e a oferta mais barata da casa era invisível para o ChatGPT

**O placar honesto primeiro.** As duas cartas da janela saíram, no horário, sem
nenhuma falha de entrega:

| carta | pessoas | disparo (UTC) | voltaram ao site | chegaram ao checkout | pagaram |
|---|---|---|---|---|---|
| A — segunda tentativa | **30** | 08/09 01:12-01:13 | **0** | **0** | **0** |
| C — sócios | **9** | 08/09 02:18 | **0** | **0** | **0** |

Medido excluindo os próprios eventos `*_sent` do corte (memória
`corte-que-pega-o-proprio-envio`: contar com corte na hora do disparo devolve
100% porque o denominador se conta a si mesmo). A carta dos sócios tem **4
minutos de vida** neste registro — não significa nada ainda. A dos 30 tem 2h10.

**39 pessoas faladas hoje, zero retornos.** Não vou embrulhar isso: a lista que
a casa tinha para falar acabou, e ela não moveu ninguém.

---

**Foi por isso que eu parei de escrever carta e fui olhar de onde o crescimento
realmente vem.** A ordem da janela abre com a frase do fundador: *"visitante
cresce, três línguas, ótimos vídeos, **o GPT fala da gente** — e não converte."*
Eu tratei essa frase como um dado, não como desabafo, e fui ler **o que o GPT
lê**.

**O ERRADO — e ele é grande.** O trial pago de **$1 por 7 dias** (Creator, 80
créditos, download limpo) foi ligado hoje às 15:43. Contei **14 superfícies** que
já o anunciam: `PricingCards`, `TrialActiveBanner`, `TrialFirstFilmPayDoor`,
`UpgradeModalTrialDoor`, a caixa do filme pronto, as cartas de ciclo de vida.

**Todas as catorze falam com quem JÁ está no site ou JÁ está na nossa lista.
Nenhuma fala com quem ainda não nos conhece.**

Aí eu abri `https://www.usekineo.com/llms.txt` — 47 KB, o documento que os
motores de resposta usam para nos descrever, e que existe exatamente para que
sejamos citados com o número certo:

```
- **Starter** — $7.00 for the first month, then $7.00/month …
- **Creator** — $15.00 for the first month, then $15.00/month …
$7/month; there is also a watermarked free tier with no card.
```

**A porta de $1 não aparece em uma única linha.** A coisa mais barata que o
ChatGPT sabe dizer sobre a Kineo é **$7.00/month** — porque **$7 é o menor
número que nós contamos a ele**. E o módulo da outra pista já tinha registrado o
outro lado da mesma moeda: `pricing_trial_1usd_clicked` tem **ZERO linhas em
toda a história**. A oferta está no ar, custa 1/7 do que anunciamos, e é
invisível justamente no canal que está crescendo.

Isso não é tela mal desenhada. É **a oferta certa entregue ao público errado**:
quem vê a porta de $1 hoje é quem já decidiu nos visitar; quem precisa dela é
quem está decidindo, dentro do ChatGPT, se vale a pena clicar.

---

**O QUE MUDOU — SHA `90a82d72`.**

· `lib/kineoFacts.ts` — `CARD_TRIAL_FACT` novo. **Todo número vem de
  `lib/checkoutPricing.ts`**, o mesmo módulo que a rota do Stripe usa para
  cobrar; nenhuma string de dinheiro é digitada (memória
  `preco-literal-em-email-mente`). Descobri no caminho que a outra pista **já
  havia exportado** `CARD_TRIAL_ENTRY_FEE_MINOR`, `CARD_TRIAL_DAYS` e
  `CARD_TRIAL_GRANT_CREDITS` — então não dupliquei constante nenhuma, só
  importei. O que faltava era **alguém publicá-las**.
· `app/llms.txt/route.ts` — a porta abre a seção `## Pricing`, **antes** da
  tabela de planos. A ordem é a lição que este próprio arquivo já tinha
  aprendido em `FREE_TIER.allowance`: *um motor de resposta cita a oração
  principal e descarta o aposto*. Porta depois dos planos = a resposta continua
  sendo "$7/month".
· **As DUAS recusas do servidor saem na MESMA lista da oferta** — quem já
  assinou alguma vez, e faturamento anual (memória
  `vitrine-oferece-o-que-o-cobrador-recusa`). Citar "$1" sem elas seria a
  vitrine que promete o que o cobrador nega.
· **Uma dívida de 21/08 cobrada.** O comentário em `FREE_TIER.allowance` dizia:
  *"se o trial de $1 for religado um dia, ESTE comentário volta junto — e não
  antes."* Ele ainda afirmava `CARD_TRIAL_ENABLED = false`. Hoje é esse dia; a
  afirmação morta saiu.

**GUARDIÃO: `scripts/test-porta-1dolar-no-mapa.mjs`, 26 verificações, todas
verdes.** Ele amarra os números ao **módulo que cobra E à rota que cobra** — não
à prosa (memória `guardiao-contar-texto-nao-prova-condicao`). **Falsifiquei por
mutação, com o commit feito antes** (memória
`falsificar-mutacao-commitar-antes`), e cada mutante derrubou uma verificação
diferente:

| mutação | resultado |
|---|---|
| mover a porta para DEPOIS dos planos | 🔴 25/26 |
| `enabled: false` no fato com a rota ligada | 🔴 25/26 |
| trocar `formatCheckoutMoney(...)` por `'$1.00'` digitado | 🔴 25/26 |
| restaurado | ✅ 26/26 |

O guardião nasceu **vermelho por CRLF** na primeira execução (âncora em `\n`
contra `\r\n` do checkout do Windows) — memória `guardiao-crlf-falso-vermelho`,
normalizado na leitura. Vizinhos conferidos: `test-llms-paginas-citadas` 91/91 e
`test-clean-film-trial-door` 86/86, ambos verdes. `tsc` verde.

**Quem recebeu:** nenhum envio novo nesta rotação. Esta entrega não manda
e-mail — ela muda o que o ChatGPT responde quando alguém pergunta por nós.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada de novo daqui.** Esta entrega publica sozinha.
2. **Continua de pé, e agora vale mais:** os **2 rascunhos de diretório**
   (`docs/RASCUNHOS-DIRETORIOS-2026-09-07.md`, para `colormango` e `toolriot`) e
   a **ficha do TAAFT**, que ainda anuncia "from $9.90/mo" e trial de 40
   créditos — dois números que morreram. Agora há um terceiro número para pôr
   lá: **a entrada de $1**.
3. **Continua de pé:** os 7 rascunhos de `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`.
4. **Decisão sua, herdada da #7:** as quatro strings de `lib/freeTierOffer.ts`
   que prometem *"every engine unlocked, including Kling 3"* para 25 créditos,
   quando o Kling 3 custa 150.

## 📋 O QUE ACONTECEU

As duas cartas do dia saíram inteiras — 39 pessoas — e **ninguém voltou**. A
lista que a casa tinha para falar acabou hoje.

Então fui atrás da frase que abriu a janela: *"o GPT fala da gente e não
converte."* Fui ler o que o GPT lê sobre nós. **A coisa mais barata que ele sabe
dizer é $7/mês** — enquanto a porta de $1, ligada hoje, está anunciada em
catorze telas que só quem já nos visitou consegue ver. O canal que mais cresce
estava recebendo a versão mais cara da nossa oferta, e o clique na porta de $1
tem zero linhas em toda a história.

A partir deste deploy, quem perguntar ao ChatGPT *"qual é a forma mais barata de
testar o Kineo?"* recebe **$1 por 7 dias, com as duas recusas ditas na mesma
frase** — em vez de $7/mês.

**A próxima jogada.** Esta correção vale para todo motor de resposta que nos lê,
mas ela é **passiva**: só funciona quando alguém pergunta. As três fichas que
publicam a Kineo para quem nunca ouviu falar dela — `colormango`, `toolriot` e o
TAAFT — continuam anunciando **$9.90**, um preço 41% mais caro que o real e 10×
a entrada que existe hoje. **Corrigir três fichas é a única alavanca da noite
que traz gente nova sem depender de ninguém abrir e-mail** — e é a única que
ainda depende de você, porque as três páginas são suas.

**ADENDO à #13 — EM PRODUÇÃO, SHA `b3f7f5b6` (diário `486229e9`).**

`origin/main` = `486229e9`, fila = 0. Antes de enfileirar, `origin/main` já tinha
andado sob mim (a sessão A entregou `85b11b38` no meio da minha rotação) —
refetch antes do `enfileirar.sh`, que rebasou por cima (memória
`enfileirar-move-o-head-e-a-base-envelhece`).

**SUÍTE INTEIRA, 432 guardiões: 338 verdes / 94 vermelhos.** A ponta anterior
estava em **337/94** — ou seja, **+1 verde (o meu) e nenhum vermelho novo**.
Não aceitei isso por aritmética: três dos 94 vermelhos são de AEO
(`test-aeo-engine-destinations`, `test-gpt-handoff`,
`test-affiliate-destinations`) e AEO é exatamente o que eu toquei, então
devolvi meus dois arquivos à versão de `2ecbfc89` e rodei os três de novo:
**vermelhos ANTES da minha mudança**. São herdados (memória
`assercao-alheia-vermelha-se-reancora`), não meus. `test-llms-paginas-citadas`
seguiu verde nas duas pontas.

**ADENDO 2 à #13 — SONDADO NO AR ÀS 00:20 BRT. A PORTA DE $1 É A PRIMEIRA COISA
QUE UM MOTOR DE RESPOSTA LÊ SOBRE PREÇO.**

`/llms.txt` passou de **47.083 → 47.592 bytes** (HTTP 200, controle
`llms-nao-existe.txt` = **404** na mesma medição — a sonda separa; memória
`sonda-401-exige-controle-404`). UA identificável, não `curl` pelado (memória
`sonda-com-ua-de-curl-cai-no-ramo-do-robo`).

A seção `## Pricing` agora abre assim, textualmente:

```
- **Cheapest way to start: $1.00 for a 7-day Creator trial** ([start here](…trial=1)).
  Includes 80 credits and clean, watermark-free downloads. A card is required;
  it converts to $15.00/month after 7 days unless cancelled.
  - Not available to anyone who has subscribed to a paid Kineo plan before…
  - Not available to annual billing…
```

**E o link publicado funciona deslogado:** `307` para
`/signup?reason=checkout&redirect=…` com `tier=basic`, `billing=monthly`,
`trial=1` e `resumed=1` **preservados** — os mesmos cinco elos que a #12 já
tinha provado à mão.

**Antes:** a coisa mais barata que o ChatGPT sabia dizer sobre a Kineo era
`$7.00/month`. **Agora:** `$1.00` por 7 dias, com as duas recusas do servidor
na mesma frase.

**O que isto NÃO prova.** Não prova venda, nem tráfego, nem citação: motor de
resposta só repassa o número quando alguém pergunta, e a reindexação dos
motores leva dias. O que ficou provado hoje é o **caminho** — o número certo
está publicado, no lugar que é lido, com a URL que responde 307 e chega ao
checkout. A medição de efeito é da próxima janela.

---

### #14 — 23:52→00:50 BRT — FECHAMENTO DA JANELA: a casa falou com 39 pessoas, e escreveu para a coorte errada por construção

**Primeiro, um acerto de relógio.** A #13 datou a própria sonda de "00:20 BRT".
O commit dela diz `2026-09-07T23:38:23-03:00`. Não havia 00:20 ainda quando ela
escreveu — o carimbo do diário está adiantado em ~45 min. Nada mais dela muda;
só não use aquele horário para cruzar com log.

**O PLACAR DA JANELA (V5/V7), medido no banco de produção:**

| | |
|---|---|
| pessoas com quem a casa falou | **39** (30 da lista A + 9 afiliados) |
| voltaram ao site depois da carta | **0** |
| cliques na porta de $1 | **0 reais** (os 4 registrados são as minhas sondas: sem UA, sem `ip_hash`) |
| pagaram | **0** |
| responderam | **0** |
| rascunhos esperando você | **7** (Autopilot) + **2** (diretórios) |

**Uma honestidade sobre o zero:** a carta dos afiliados tinha **35 minutos de
vida** quando medi, e a dos 30 tinha **101 minutos**. Zero em 35 minutos não é
um resultado, é um relógio. O zero que vale é o da carta dos 30 — e mesmo esse
é jovem.

**ERRADO — e é o achado da noite.** Fui perguntar por que as 30 cartas não
moveram ninguém, e a resposta não estava na copy nem no preço. Estava em **para
quem elas foram**:

- a intenção de compra de quem recebeu tinha **mediana de 23,4 dias**;
- **zero** dos 30 estavam dentro de 48h. **Zero** dentro de 7 dias;
- a intenção mais antiga era de **02/08** — mais de um mês;
- e a casa já tinha provado, em 90 dias e 12 pagantes, que **10 pagaram em menos
  de 48h** e que **nenhum pagante orgânico nasceu depois do D2**.

Ou seja: a carta foi endereçada, por construção, à faixa onde a casa **nunca
fez uma venda**. Não era uma aposta ruim — era uma aposta fora da mesa.

**A causa, no código.** O seletor não tinha **nenhum** limite de recência. A
fila era ordenada por `b.films - a.films` — "quem mais entregou primeiro, é quem
mais tem a perder por ter parado". Soa certo, e é exatamente ao contrário do que
o próprio banco diz. E o custo foi medido: **25 pessoas com intenção mais nova
que 7 dias — 4 delas dentro de 48h — ficaram na fila**, preteridas por terem
feito **menos filmes**.

**MUDOU — SHA `4b7bf1dd` + `4c1a51eb`, `origin/main` = `4c1a51eb`, fila 0, EM
PRODUÇÃO:**

1. a fila ordena por **recência da intenção**; `films` vira desempate; quem não
   tem carimbo de intenção cai para o fim em vez de passar por recente;
2. o **dry-run passa a publicar `intent_age_days`** (mediana, dentro de 48h,
   dentro de 7d, acima de 30d, sem carimbo) medido sobre **o lote que vai sair**.
   Sem isso, a tela de aprovação mostrava 30 cartas para intenção de 23 dias sem
   dizer uma palavra sobre idade — que é justamente o número que decide.

**Guardião:** `scripts/test-second-try-ordem-recencia.mjs`, **26 verificações,
26 verdes**, amarradas ao comparador que decide a fila e à função que o dry-run
chama — não à prosa. `tsc` verde (exit 0).

**Falsifiquei por mutação, com o commit feito antes**, e os três mutantes
derrubaram verificações **diferentes**:

| mutação | resultado |
|---|---|
| voltar a ordenar por filmes primeiro | 🔴 22/26 |
| medir a idade da fila inteira, não do lote | 🔴 25/26 |
| data ilegível virando idade 0 | 🔴 25/26 |
| restaurado | ✅ 26/26 |

Duas armadilhas caíram no caminho e valem registro: **a primeira rodada de
mutação voltou VERDE porque o mutante nunca foi escrito** (alvo multi-linha com
`\n` contra o `\r\n` do checkout do Windows) — um mutante que não aplica se lê
como guardião resistindo; passei a exigir que a mutação **prove** que aplicou. E
uma das verificações estava **verde por substring**: procurar `Number.isFinite`
sobrevivia ao mutante que trocava o `.filter` por `.map(... ? d : 0)`. Endurecida
no `4c1a51eb`.

**O que investiguei e NÃO era defeito** (para ninguém gastar rotação nisso):
o link da carta leva a `/signup?reason=checkout`, e eu suspeitei que estivesse
mandando quem já tem conta para uma tela de cadastro. Não está: com
`?reason=checkout` a página **auto-dispara o Google de um clique** e preserva o
`redirect` até o checkout. O caminho está inteiro. E a rota de envio **só carimba
`_sent` quando o Resend responde ok** — as 39 saíram de verdade.

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Enviar os 7 rascunhos do Autopilot** — `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`.
   São os $299 e a única lista da noite que pede conversa humana, não e-mail.
2. **Enviar os 2 rascunhos de diretório** — `docs/RASCUNHOS-DIRETORIOS-2026-09-07.md`
   (`colormango`, `toolriot`).
3. **Corrigir a ficha do TAAFT** no dashboard: ela ainda anuncia "from $9.90/mo"
   e trial de 40 créditos. Os dois números morreram. O número de hoje é a
   **entrada de $1 por 7 dias**.
4. **Decisão sua, herdada:** as quatro strings de `lib/freeTierOffer.ts` que
   prometem *"every engine unlocked, including Kling 3"* para 25 créditos,
   quando o Kling 3 custa 150.

## 📋 O QUE ACONTECEU

A casa falou com **39 pessoas** hoje, uma a uma, com o que sabia de cada uma, e
**ninguém voltou**. Mas o zero não quer dizer que falar com as pessoas não
funcione — quer dizer que **falamos com as pessoas erradas**. As 30 cartas foram
para gente cuja vontade de comprar tinha **23 dias**, e a casa já sabia, pelos
seus próprios 12 pagantes, que **ninguém nunca comprou depois do segundo dia**.
A fila estava ordenada pelo número de filmes que a pessoa já tinha feito — o
passado dela — em vez do quão perto ela estava de comprar.

Isso está corrigido e no ar. A partir da próxima leva, a carta sai **para quem
tentou comprar mais recentemente**, e o dry-run mostra a idade da intenção do
lote antes de você aprovar — o número que faltava na tela.

**A próxima jogada, e ela é a mais barata da semana.** Existem **4 pessoas
dentro da janela de 48h** e **25 dentro de 7 dias** que ainda não receberam
carta nenhuma. Essa é a única coorte que se parece com todo pagante orgânico que
a Kineo já teve. Mas o ponto maior é outro: **uma varredura noturna sempre chega
tarde**. Se a compra acontece em horas, a carta tem que sair em horas — não numa
passagem diária. A jogada da próxima janela é transformar esta carta de
*campanha* em *gatilho*: dispara sozinha algumas horas depois de alguém abrir o
checkout e não pagar, enquanto a pessoa ainda quer. Antes de construir isso,
medir as rotas de resgate que já existem (`send-checkout-hot-nudge`,
`send-checkout-recovery`, `send-abandon-recovery`) — a casa tem seis remédios
para esta doença e nenhum deles foi medido; pode ser que o certo seja **ligar um
que já existe**, não escrever o sétimo.

---

### #15 — 00:22→00:55 BRT — METADE DE QUEM APERTA COMPRAR NÃO TEM NOME, E NENHUM DOS SEIS REMÉDIOS DA CASA ALCANÇA ESSA METADE

**Esta rotação não entregou código, de propósito.** A #14 fechou pedindo uma
coisa antes de qualquer construção nova: *"a casa tem seis remédios para esta
doença e nenhum deles foi medido; pode ser que o certo seja ligar um que já
existe, não escrever o sétimo."* Fui medir. O que achei muda o alvo.

**PRIMEIRO, O ALARME FALSO — e ele quase virou a entrega da noite.**
`send-checkout-hot-nudge` roda **a cada 15 minutos** (96×/dia) e tem **zero**
`checkout_hot_nudge_emailed_v1` no banco. Parece remédio morto. Não é: a rota
nasceu em `1b4f3d9a`, **07/09 17:22 BRT** — tinha **7 horas de vida** quando
medi. E o último `checkout_started` da casa é de **19:40 UTC**, *antes* do
deploy dela. O denominador honesto não é 30 dias: é **zero oportunidades**
(memórias `zero-escritas-conte-as-oportunidades` e `campo-novo-e-o-carimbo-do-deploy`).
Não há defeito aqui. Quem for medir essa rota de novo: corte a medição em
`2026-09-07 20:22 UTC`, não no relógio.

**O QUE ESTAVA ERRADO, e é estrutural.** Fui ver por que ninguém apertou
comprar em 7 horas — e a resposta é que **apertaram**. Sete vezes, das 20:24
UTC às 02:37 UTC, espalhadas, não em rajada. Todas as sete com **`user_id`
NULO e `session_id` NULO**. Não é uma noite atípica:

| dia | `checkout_attempted` | sem nome | % |
|---|---|---|---|
| 08/09 | 5 | 5 | 100% |
| 07/09 | 16 | 11 | 69% |
| 06/09 | 9 | 6 | 67% |
| 04/09 | 9 | 7 | 78% |
| **14 dias** | **136** | **64** | **47%** |

**Quase metade de toda a intenção de compra da casa chega sem nome.** E os
seis remédios — `checkout-hot-nudge`, `checkout-recovery`, `checkout-rescue`,
`abandon-recovery`, `card-declined`, `second-try-1usd` — **todos** selecionam
por `user_id`. Não é que estejam desligados: é que **a metade que aperta
comprar agora é invisível para os seis**, por construção. A casa escreve para
quem tem nome, e quem tem nome é justamente a metade velha — foi exatamente o
erro que a #14 achou por outro caminho (intenção de 23 dias).

**O SEGUNDO ACHADO, menor mas caro.** Entre as 99 pessoas COM nome que bateram
no checkout em 30 dias, **74 (75%) estão excluídas do hot-nudge para sempre**
pela lista `OUTRAS_CAMPANHAS` — dez campanhas, sem nenhum limite de tempo.
Quem recebeu uma `season_letter` em agosto nunca mais recebe a carta quente,
mesmo apertando comprar hoje. Sobram **25**. É a mesma doença da memória
`supressao-sem-precedencia-cala-a-carta-boa`: a carta genérica e antiga vence
a carta rara e quente. É conserto de uma linha, e não foi feito nesta rotação
porque a janela fecha às 01:00 — fica anotado, com o número medido.

**SQL de tudo isso:** `docs/queries/VENDA-ASSISTIDA-2026-09-07.sql`, com os
cortes já embutidos (janela de relógio, corte no deploy, funil de exclusão).

## ✅ O QUE VOCÊ PRECISA FAZER

1. **Enviar os 7 rascunhos do Autopilot** — `docs/RASCUNHOS-AUTOPILOT-2026-09-07.md`.
   São os $299 e continuam parados desde ontem.
2. **Enviar os 2 rascunhos de diretório** — `docs/RASCUNHOS-DIRETORIOS-2026-09-07.md`
   (`colormango`, `toolriot`).
3. **Corrigir a ficha do TAAFT** no dashboard: ainda anuncia "from $9.90/mo" e
   trial de 40 créditos. Hoje a entrada é **$1 por 7 dias**.
4. **Decisão sua:** as strings de `lib/freeTierOffer.ts` que prometem *"every
   engine unlocked, including Kling 3"* para 25 créditos (o Kling 3 custa 150).

## 📋 O QUE ACONTECEU

A noite falou com 39 pessoas e nenhuma voltou. A #14 descobriu que falamos com
gente cuja vontade de comprar tinha 23 dias, e consertou a ordem da fila. Esta
rotação foi atrás da pergunta seguinte — *por que a casa demora tanto a falar
com quem está quente* — e a resposta é pior e mais simples do que ordem de
fila: **na metade das vezes a casa não sabe com quem falar**. Sete pessoas
apertaram comprar entre ontem à noite e agora; nenhuma delas deixou nome. Os
seis mecanismos de resgate que a casa construiu só sabem procurar por nome.

Então o gargalo desta pista não é a carta, nem o preço, nem a hora do disparo.
É que **o botão de comprar aceita ser apertado por quem a casa não consegue
reconhecer** — e aí não sobra nem remédio, nem medição, nem culpado.

**A jogada da próxima janela, e ela é barata:** não escrever a sétima carta.
São duas coisas, nesta ordem. **(a)** Fazer o `checkout_attempted` anônimo
carregar pelo menos o `session_id` do navegador — hoje vem nulo também, então
nem dá para saber se foram 7 pessoas ou 2. Sem isso, nenhum número sobre essa
metade da casa é confiável, e a própria pergunta "quantos clientes perdemos
aqui?" não tem resposta. **(b)** Dar um limite de tempo à `OUTRAS_CAMPANHAS`
(por exemplo 7 dias): quem apertou comprar *hoje* merece a carta quente mesmo
tendo recebido a carta da temporada há um mês. Isso devolve ~74 pessoas ao
alcance do único remédio que fala em 30 minutos — sem escrever uma linha de
copy nova.
