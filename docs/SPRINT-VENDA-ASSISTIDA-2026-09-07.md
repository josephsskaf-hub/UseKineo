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
