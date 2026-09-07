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
