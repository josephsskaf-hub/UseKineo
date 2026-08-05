# 🔴 GATE #1 — `scripts\47-PUSH.bat` — **SUBSTITUI O 46, QUE NÃO FOI CLICADO** (05/08 19h)

**Clique só neste.** O 46 não foi clicado (`main` estava 2 commits à frente às 19:01Z). O 47 sobe
tudo o que está pendente de uma vez — nada se perde por pular o 46.

**O que vai junto:**

**1. Hotfix do incidente de hoje.** Às 15h36–16h42 o OpenAI parou de responder e matava a função
antes do nosso tratamento de erro: sem alarme, sem mensagem honesta, sem e-mail de recuperação —
um cadastro **novo, vindo do TAAFT**, falhou 4× em 20 min no primeiro dia dele. **O motor já
voltou sozinho** (11 vídeos `completed` desde 16h42, o último 18:58Z), então isto não é urgência
de produto parado: é a blindagem para a próxima vez, que hoje não existe no ar.

**2. O e-mail que vende na hora certa.** Quem bate no limite do plano free é a pessoa mais pronta
para comprar do funil inteiro — usou 3× hoje e pediu a 4ª. **Na história toda, 11 pessoas fizeram
isso e nenhuma comprou.** O cron que existe para esse momento procurava quem *terminou* 3 vídeos,
enquanto o limite conta *tentativas* — e quem bate no muro costuma ter 2 vídeos prontos. Ele era
cego por construção: **8 das 11 nunca receberam nada.** Agora lê o próprio limite; **3 pessoas
entram na fila na primeira rodada depois do push.** Corrigida também a frase que dizia "você
acabou de fazer seu 3º vídeo hoje — Nice run" para quem tinha recebido 2.

Enquanto não for clicado, nada disto está no ar.

---

<!-- gate 46 (substituído pelo 47) -->
# ~~GATE ANTIGO — `46-PUSH.bat`~~ (substituído)

**Este substitui o 45, que JÁ FOI CLICADO.** Sobe 1 commit (`2f1c441`).

Às 15h36–16h um cadastro **novo, vindo do TAAFT**, tentou gerar vídeo **4 vezes em 20 minutos e
falhou nas 4** — e o incidente ainda estava ativo quando o arquivo foi criado. Causa: o cliente
OpenAI não tinha limite de tempo (padrão do SDK = 10 minutos), então uma chamada lenta segurava a
função até a Vercel matá-la; com a função morta, o nosso tratamento de erro nunca rodava — sem
alarme, sem mensagem honesta e sem e-mail de recuperação. **Créditos estavam OK** (não é o
incidente de 31/07 de novo).

Enquanto não for clicado, o produto continua exposto ao mesmo modo de falha.

---

# GATES ABERTOS — só o fundador consegue destravar

> ## 🎯 METAS DA EMPRESA (fundador, 01/08): 500 pagantes → 1.000 pagantes
> ⚡ ORDENS ATIVAS: ORDENS-CONVERSAO (conversão) + ORDENS-AQUISICAO (aquisição) + **PESQUISA-CONCORRENTES (G1-G5)** + **ordem H (engajamento X/YouTube/Reddit/Quora — aprovada 03/08, regras de ouro no doc; X já executável na sessão logada)**
> Ver docs/METAS.md — toda sprint conecta o trabalho a uma das duas alavancas
> (volume de cadastros × conversão) e o placar reporta a distância. Baseline: 4 compradores.

> ## 🟢 01/08 01:10Z — INCIDENTE OPENAI RESOLVIDO. ENV JÁ TROCADA. MOTOR VALIDADO.
> Sprint: leia `docs/INCIDENTE-OPENAI-2026-07-31.md` ANTES de mencionar OpenAI/env.
> A chave foi trocada às 00:50Z, redeploy feito, vídeo `completed` às 01:04Z em produção.
> **NÃO pedir troca de env de novo. Este gate está FECHADO.**
>
> ## 🟢 01/08 05:06Z — INCIDENTE #2 (Creatomate 402) TAMBÉM RESOLVIDO
> Upgrade Growth 10K feito pelo fundador; vídeo de USUÁRIO REAL completed 05:06:21Z.
> Herança permanente pras sprints: construir lib/creatomateAlert.ts + monitor de % de
> créditos no placar (tarefas 2-3 do doc de incidente). Ambos os apagões da noite: FECHADOS.



## 🔴 05/08 14:30Z — SPRINT DAS 11h: **1 CLIQUE + 3 DECISÕES DE 2 MINUTOS**

### 1. `scripts\45-PUSH.bat` — **substitui o 44. Clique só neste.**
O 44 **não foi clicado** (`main` estava 2 commits à frente às 14:01Z). O 45 faz a mesma coisa e
sobe os **3 commits de hoje**: o estudo vivo + os aprendizados + a shortlist de micro-criadores.

### 2. Enviar o rascunho do **Conor Martin** ($100) — recomendação: **SIM**
Já está no Gmail, revisado. `@conormartinai`: 4,24k inscritos, mas **1,64M de views em 266
vídeos**, e o *"Revid AI Review (after 30 days)"* dele fez **15.134 views**. Quem procura review
de concorrente está comparando ferramenta com o cartão na mão — **$0,0066 por view qualificada**,
e o vídeo continua entregando daqui a um ano porque é busca, não feed.
⚠️ **Enviar DEPOIS do push.** O e-mail manda ele para `/state-of-ai-shorts-2026`; enquanto a
página velha estiver no ar, ela mostra 2,30 min onde o e-mail diz 4,2.

### 3. Enviar o rascunho do **Malva AI** — **não compromete nenhum dólar**
155k inscritos, e-mail de negócio público. O rascunho só pede a tabela de preço dele.

### 4. Criar no Stripe um **cupom de 100% off por 3 meses** (2 min no painel)
É o **único** jeito de entregar os "3 meses de Creator" que os dois e-mails prometem. Não existe
rota admin que conceda plano pago, e o caminho SQL entregaria Creator **vitalício** com crédito de
um mês só. O checkout já resolve `?promo=`.

> Contexto completo, com os canais medidos e o que foi **vetado** (Ai Titan: 91,7k inscritos e
> 117k views totais = audiência comprada): `docs/SHORTLIST-MICROCRIADORES-2026-08-05.md`

---

## 🔴 05/08 14:00Z — **`scripts\44-PUSH.bat` — O ESTUDO VIVO + O TEMPO REAL DE RENDER**
> ⬆️ **SUPERSEDIDO PELO 45-PUSH acima** (mesmo push, 3 commits em vez de 1). Se você já clicou
> no 44, clique no 45 mesmo assim — ele completa o que faltou.

Um clique. É o único gate desta sprint. 1 commit, para frente, não desfaz nada.

**O que está errado no ar agora e este push conserta:** a página pública
`/state-of-ai-shorts-2026` é um estudo "free to cite" com os números chumbados em 24/07 — e os
**cinco** estão errados hoje. O pior: publica **mediana de 2,30 min** de render contra **4,2 min
reais** (p90 6,6), a partir de uma amostra de DOZE renders.

E esse número não mora só ali: mora em `lib/kineoFacts.ts`, que alimenta o `/llms.txt` e o
`/facts` — os arquivos que servimos de bandeja para o ChatGPT e o Bing, o canal que já traz **4x
mais tráfego que o Google inteiro**. Ou seja, **estamos ensinando o ChatGPT a prometer, em nosso
nome, metade do tempo real de espera.** Quem chega por essa citação espera 2 min, o render leva
4–7, e vai embora antes do vídeo ficar pronto — o que explica direto o maior buraco do funil
(333 geraram, 69 baixaram).

Depois do push, confira no celular: `www.usekineo.com/state-of-ai-shorts-2026` deve dizer
"updated daily · last read August 5, 2026" e mostrar mediana **4.2 min**.

> As duas migrações do banco **já estão aplicadas** (`study_stats_functions`,
> `study_speed_fast_only`) e conferidas — a página não depende do push para não quebrar.

## ✅ 05/08 13:50Z — GATES ANTERIORES **FECHADOS** (conferido, não suposto)

| Item | Como conferi | Estado |
|---|---|---|
| 11 restantes do COMEBACK50 | `comeback50_emailed` = **21** · 12 eventos `comeback50_sent` hoje | ✅ **DISPARADO** |
| Rascunhos Waqas / pritikathar | `list_drafts` não devolve mais nenhum dos dois | ✅ **saíram** |
| `41-PUSH.bat` | `origin/main` = `ac791ec`, muito à frente | ✅ fechado |

**Não pedir nenhum dos três de novo.**

⏳ **NUDGE DIÁRIO ainda não disparou:** `credits_back_sent_at` = **0** às 13:50Z. O cron
`send-credits-back` roda **15:25Z**. A sprint das 13h confere e reporta.

## ✅ 05/08 00:22Z — **FECHADO. O `41-PUSH` FOI RODADO E A CORREÇÃO ESTÁ EM PRODUÇÃO.**

`origin/main = dc5a7ec`, deploy `dpl_8zinEF…` **READY às 00:22:42Z**. A versão com o
`location.href` ficou no ar **4 minutos e 36 segundos** (00:18:06 → 00:22:42Z). Não pedir de novo.
**Janela de medição do `KINEO-DOWNLOAD-TRUTH` começa em 05/08 00:22:42Z** — nada antes conta.
Rodar `docs/SQL-DOWNLOAD-TRUTH.sql` a partir de **06/08 00:30Z**.

## 🟠 05/08 00:50Z — OS DOIS E-MAILS **AINDA NÃO SAÍRAM** (conferido, não suposto)

O fundador reportou "já fiz isso" às 00:48Z. Conferi antes de aceitar — e o push realmente saiu,
mas os dois e-mails não:

| Item | Como conferi | Estado |
|---|---|---|
| 11 restantes do COMEBACK50 | `count(*) filter (where comeback50_emailed)` = **9** (seria 20) | ❌ não saiu |
| Rascunhos Waqas / pritikathar | `list_drafts` ainda devolve os dois (22:10Z), `in:sent` não tem | ❌ não saiu |

**Como fazer cada um, exato:**

1. **COMEBACK50** — logado como conta interna, abrir
   `https://www.usekineo.com/api/admin/send-comeback50` (dry run, mostra `remaining_unemailed`),
   conferir o número e então abrir a mesma URL com **`?confirm=SEND`**. A rota tem gate duro: se
   o cupom não estiver vivo no Stripe, nada sai.
2. **Os 2 rascunhos** — Gmail → Rascunhos → `thewaqaskhanofficial@gmail.com` e
   `pritikathar995@gmail.com` → Enviar. São leads de 04/08, esfriam rápido.

## (histórico) 05/08 00:35Z — pedido do `41-PUSH.bat`, já atendido

Você rodou o `40-PUSH.bat` **durante a sprint** (00:18Z, deploy `dpl_A4pgm6d8…` READY). Obrigado
— mas ele levou junto uma **versão anterior** da mudança de download, que uma revisão
adversarial derrubou **minutos depois** do commit. O `41-PUSH.bat` é a correção, e é **um commit
só, para frente** (não desfaz nada, não mexe no que você já subiu de resto).

**O que está errado no que está no ar (dois defeitos, ambos no caminho de fallback):**

1. **A aba do app pode ser sequestrada.** Quando o download por blob falha, o código atual
   navega a MESMA aba para o MP4. Se o Supabase não mandar `Content-Disposition: attachment`, a
   pessoa cai num player de vídeo e **perde a página** — e na tela de vídeo pronto isso mata
   justamente o upsell de marca d'água e o pedido de nota que rodam depois.
2. **O número mais importante da empresa passaria a mentir para cima.** O código atual conta
   `video_downloaded` também quando só *abriu uma aba* — sem prova de entrega. Esse evento é o
   que `send-comeback50` e o cron `send-video-ready` usam para decidir **quem NÃO precisa de
   e-mail de resgate**: inflá-lo faria a empresa parar de resgatar exatamente quem falhou.

**O que o 41 faz:** a entrega volta a ser **idêntica à de produção de ontem** (blob →
`window.open`), e fica só a parte boa — clique contado, falha com motivo, popup barrado visível.
Sem degrau novo, sem risco. A correção de verdade do mobile vira trabalho de sprint **depois**
que o número disser o tamanho do problema.

**Quanto tempo o defeito fica no ar:** ele só aparece quando o download por blob falha, que é o
caminho raro. Mas é o caminho de quem já estava com problema — por isso vale o clique hoje.

⚪ Nada mais mudou: os 11 do COMEBACK50 e os 2 rascunhos do Gmail continuam como estavam.

## ✅ 05/08 00:18Z — FECHADO PELO FUNDADOR: o `40-PUSH.bat` FOI RODADO (deploy READY)

**`scripts\40-PUSH.bat`** — 4 commits, e três deles já estavam prontos e parados no seu
computador desde ontem à noite:

| # | Commit | O quê | Estado |
|---|---|---|---|
| 1 | `249e172` | docs do replay | só documentação |
| 2 | `23bc1ac` | **NUDGE DIÁRIO** — e-mail "seus 3 vídeos free voltaram" | migração **conferida em produção** nesta sprint ✅ |
| 3 | `b1f05a7` | **POST TO EARN** — 3 créditos por Short publicado | tabela + trava anti-fraude **conferidas em produção** ✅ |
| 4 | novo | **A VERDADE SOBRE O DOWNLOAD** | `tsc` EXITCODE=0 ✅ |

Conferi as duas migrações no banco em vez de supor: **o único degrau que falta nos três é o
push.** Se tivessem subido sem a migração, o POST TO EARN pagaria crédito sem trava de
idempotência — dez contas colando o mesmo vídeo, dez pagamentos. Não é o caso.

**O item 4, em uma frase:** 327 pessoas geraram um vídeo na Kineo e só 67 baixaram (**20%** — o
maior buraco do funil), e esse número era **cego**: o evento só existia no caminho feliz e o
fallback era mudo. Além disso o fallback usava `window.open` **depois de um `await`**, o que no
celular é **popup bloqueado** — a pessoa fica sem arquivo e **sem mensagem de erro**, e o banco
não registrava nada disso. Agora registra, e o **clique** passa a ser contado.

**Risco baixo de propósito:** a **entrega** do arquivo continua idêntica à que já está em
produção. Quem já conseguia baixar não sente diferença nenhuma — o que muda é só o que passa a
ser contado. (Uma revisão adversarial derrubou a primeira versão desta mudança, que navegava a
mesma aba e teria destruído o upsell de marca d'água e o pedido de nota.)

**Depois de rodar:** 24h depois, colar `docs/SQL-DOWNLOAD-TRUTH.sql` no Supabase. São 5 queries
e elas dizem qual das três causas do buraco é a verdadeira — **antes** de gastarmos uma sprint
construindo a Medida 5 (CTA sticky), que só resolve uma das três.

⚪ O `39-PUSH.bat` (só docs) fica obsoleto: o 40 leva tudo o que ele levava.

## ✅ 04/08 22:28Z — GATE A DA SPRINT 19h JÁ FOI FECHADO PELO FUNDADOR

**PUSH FEITO DURANTE A SPRINT.** `origin/main = 6ea2180`, deploy `dpl_42nGKG…` **READY em
produção** (22:28Z, confirmado por `list_deployments` + o `dpl=` nos assets servidos).
O `37-PUSH.bat` virou no-op — **não pedir de novo**. Consequências:
   - o **bug de preço está corrigido em produção**: a tela de checkout cancelado não promete
     mais R$49,90 a quem vai pagar R$24,90;
   - o `KINEO-OBJECTION-HANDLER` está servindo. **Janela de medição de `checkout_cancel_reason`
     e dos 4 eventos novos começa em 22:28Z de 04/08** — nada antes disso conta.
   - ⚠️ O cabeçalho do `37-PUSH.bat` cita o SHA `5976d8b`; o commit que entrou foi `6ea2180`
     (mesmo conteúdo, refeito sobre o mesmo pai para caber o próprio .bat). Sem impacto —
     registrado só para quem for conferir SHA no histórico.

## 🟠 04/08 22:15Z (sprint 19h) — O QUE CONTINUA NA SUA MÃO

**1. Dois rascunhos de venda 1:1 no Gmail (só falta o Send).** Ambos são leads de HOJE:
   - **thewaqaskhanofficial@gmail.com** (TAAFT · 2 vídeos · 2 downloads · abriu 3 checkouts em
     18 min e cancelou os três). Assunto: *"Which Kineo plan you actually need (30 seconds)"*.
     **Sem desconto de propósito** — o comportamento dele foi confusão de catálogo, não preço.
   - **pritikathar995@gmail.com** (Índia/INR · 1 vídeo · **0 downloads** · 2 checkouts).
     Assunto: *"Download your Short before you pay us anything"*. Manda usar antes de pagar e
     pergunta se o checkout falhou.

**2. 🟠 Da 16h:** os **11 restantes** do COMEBACK50, a um `&confirm=SEND`.

**3. ⚪ Sem pressa (só docs):** `scripts\38-PUSH.bat` — 1 commit só de documentação
   (fechamento deste gate). Pode ir junto com o próximo push de código.

## ✅ 04/08 22:05Z — OS DOIS GATES DA SPRINT 16h FORAM FECHADOS PELO FUNDADOR

**A. PUSH FEITO.** `origin/main = 43e2a3b`, deploy **READY em produção** (22:00:42Z).
   Consequências que valem para as próximas sprints:
   - o **preço regional está no ar** — Brasil vê Starter R$24,90 (era R$49,90). A partir de
     agora, qualquer leitura de conversão de checkout no Brasil é sobre o preço NOVO;
   - `<VideoRatingAsk/>` está servindo. A janela de medição de `video_rated` /
     `video_rating_reason` / `taaft_review_ask_clicked` **começa em 22:00Z de 04/08** — não
     contar nada antes disso.

**B. OS 9 SENDS SAÍRAM** (22:00:55Z–22:01:16Z), confirmado em `in:sent`: os 8 rascunhos
   COMEBACK50 (kingtopman, obasindubuisi20, verifiedpee236, nooributter+1, ajiterumololuwa,
   kylajanae78, jatinnnnn078, agadac02) + o ToolRiot. A flag `comeback50_emailed=true` já
   estava marcada nos 9 antes do envio, então a rota automática **não vai duplicar**.
   Medir `utm_source=comeback50-personal` a partir de 22:01Z, separado do disparo Resend.
   **NÃO repetir este pedido.**

**C. 🟠 Continua aberto:** os **11 restantes** do COMEBACK50, a um `&confirm=SEND` na rota
   (que agora existe e está deployada). Disparo em massa irreversível — decisão sua.

## 📌 04/08 19:45Z (sprint 16h) — O QUE ESTAVA NA SUA MÃO (A e B FECHADOS ÀS 22h, ver acima)

**A. 🔴 PUSH — `scripts\36-PUSH.bat` (30s).** 6 commits parados localmente. Dois deles
   **não são meus**: `6ce3d9a` + `4e8af7a`, o **preço regional** (Starter/Creator mais baratos
   em países de menor renda; Brasil R$49,90 → R$24,90) que a sessão paralela commitou e
   **ainda não está em produção** — enquanto este push não sair, o brasileiro segue vendo
   R$49,90. Passei o `tsc` sobre tudo junto: **EXITCODE=0**. Os outros 4 são o
   `<VideoRatingAsk/>` desta sprint + docs. **Não toca em render.**

**B. 🔴 9 cliques de Send no Gmail — continuam parados.** Confirmei com `in:sent newer_than:1d`:
   só há 2 threads de hoje, ambas de 02:03Z (parceiros, campanha antiga). Os **8 rascunhos
   COMEBACK50** e o **rascunho do ToolRiot** seguem em Rascunhos, intactos. A flag
   `comeback50_emailed` já está marcada nos 9 (checado: boolean `= true`, exatamente 9), então
   a rota automática não vai duplicá-los — mas se você **não** apertar Send, essas 9 pessoas
   ficam sem receber nada, por ninguém. É o item de maior retorno por segundo que existe hoje.

**C. 🟠 Os 11 restantes do COMEBACK50** seguem a um clique de distância
   (`&confirm=SEND` na rota, que agora existe em produção). Deixei sem apertar de propósito:
   disparo em massa irreversível. Sua decisão.


## 📌 04/08 16:50Z (sprint 13h) — PENDENTES DE HOJE

**0. ✅ PUSH FEITO POR VOCÊ DURANTE ESTA SPRINT — está tudo no ar.**
   Deploy READY em produção com `66a0b86` (17:0xZ). Ou seja: o fix do desconto, a rota
   COMEBACK50 e a linha do PRODUCTHUNT **existem em produção agora**. Validei a cadeia
   inteira no ar, na sua sessão logada, com o dry run da rota:
   `{"promo_live":true,"promo_detail":"promotion_code promo_1U0jqT… active",
   "remaining_unemailed":11}` — o `promo_live:true` prova que o cupom resolve, e o
   `remaining_unemailed:11` prova que os 9 que eu já cobri por rascunho **não vão duplicar**.
   (Texto original do gate abaixo, mantido como registro.)

~~**0. 🔴 PUSH — `scripts\34-PUSH.bat` (30s). É O ÚNICO GARGALO DA CAMPANHA.**~~
   3 commits meus parados. O `33-PUSH` **não foi rodado**: produção ainda serve `0c988b4`,
   e por isso `/api/admin/send-comeback50` responde **404** — a ordem "sprint das 10h
   dispara os e-mails" era fisicamente impossível sem este clique. O 34 sobe:
   - o **fix `KINEO-PROMO-BEATS-INTRO`** (abaixo, item 1 — é o mais importante do dia);
   - a rota COMEBACK50 + a linha do cupom PRODUCTHUNT no banner de PH;
   - os docs das sprints 11h e 13h.
   **Não toca em render** — nada de `lib/compose.ts`; seu freeze de dia de lançamento
   segue intacto.

**1. 🟢 NADA A FAZER, SÓ SAIBA: a campanha ia sair com uma promessa quebrada.**
   O `/pricing` anexa `intro=1` sozinho em todo clique monthly de Starter/Creator, e o
   checkout aplicava o intro ANTES do `?promo=` — o `COMEBACK50` era descartado com um
   `console.warn`. As 19 pessoas leriam "50% off por 3 meses" e receberiam um mês com
   desconto menor, **sem nenhum erro aparecer**. Corrigido nesta sprint (tsc=0). Só existe
   em produção depois do item 0.

**1b. 🟠 O DISPARO DOS 11 RESTANTES — 1 clique, e eu deliberadamente NÃO apertei.**
   A rota está viva e testada; falta só o envio. Deixei para você porque é disparo em massa
   irreversível para 11 pessoas reais, e eu já cobri os 8 melhores por rascunho pessoal
   (que converte mais). Link direto, na sua sessão logada:
   https://www.usekineo.com/api/admin/send-comeback50?confirm=SEND
   Se preferir testar com 2 antes: acrescente `&limit=2`. Quem recebe são os de cauda —
   dabira4u (3 vídeos/4 downloads), farooqhumna93 (2/4), moiseshamester (3/3), rammarndi870
   (3/3), jeff.a.wiggins (2/3), safuras090 (3/2) e 5 com cartão e vídeo mas 0 downloads.

**2. 🟠 8 RASCUNHOS NO GMAIL — 8 cliques de Send, a melhor lista do banco.**
   Como o push travou o disparo automático, a campanha saiu por rascunho pessoal seu, um
   por pessoa, abrindo pelo que cada uma fez. São: kingtopman (6 vídeos/24 downloads),
   agadac02 (9/23), jatinnnnn078 (2/21 — pergunto se o export quebrou), kylajanae78 (6/20),
   ajiterumololuwa (1/12), nooributter+1 (7/8, dormente desde julho), verifiedpee236 (3/6),
   obasindubuisi20 (5/3). Sem preço no corpo; link com `utm_source=comeback50-personal`
   para separar o que a rota manual converteu.
   Os 8 já estão marcados com `comeback50_emailed=true`, então a rota automática (depois do
   push) **não duplica** e vai para os outros 11. **Se decidir NÃO enviar**, o SQL de
   rollback está na seção 3 do `docs/SPRINT-2026-08-04.md`.

**3. 🟢 RASCUNHO ToolRiot (`hello@toolriot.com`) — 1 clique, e não é uma venda.**
   Ele estava na fila para receber 50% off. Fui olhar quem é antes de mandar: **review lab**
   que testa ferramentas de IA e publica **Shorts de 60s no YouTube** (@ToolRiot). Rodou a
   Kineo em 01/08 (1 vídeo, 12 exports) e não publicou nada. O rascunho oferece conta cheia
   comped **sem contrapartida** e propõe o teste que só a gente permite: o Short sobre a
   Kineo, feito pela Kineo. Se você discordar de comped, é só não enviar — nada mais depende
   disso.

**4. ⏱️ 30 segundos, quando puder: confirmar o promotion code `PRODUCTHUNT`.**
   O dashboard da Stripe entrou em erro exatamente nessa página. Vi o **cupom** na lista
   (30% × 3 meses); não consegui ver o **código promocional**. O banner foi escrito para não
   mentir mesmo se ele não existir ("use code at checkout"), então não é urgente.
   Link: https://dashboard.stripe.com/coupons/PRODUCTHUNT

**5. 🟠 Product Hunt — veredito com número.** O banner de boas-vindas apareceu **9 vezes em
   24h** e o launch converteu **0**. 3 pontos, 0 comentários externos. Não é canal de
   aquisição; é troféu. Nada a fazer lá hoje — regra de morte corre até 11/08.

---

## 📌 04/08 15:00Z (sprint 11h) — HISTÓRICO (itens 0 e 1 RESOLVIDOS)

> ✅ **Item 1 (criar o cupom COMEBACK50) FECHADO** pela sessão CEO em 12:05 −0300 (`09956d5`).
> Conferido por mim no dashboard, não presumido do commit: `COMEBACK50` é cupom **e** código
> promocional ativo (`promo_1U0jqT…`, 50% por 3 meses, 0 resgates). `PRODUCTHUNT` idem como
> cupom (código promocional pendente de conferência — item 4 acima).
> O item 0 (push) segue aberto e virou o item 0 do bloco das 13h.


**0. PUSH — 1 commit meu parado** (a sandbox não tem credencial do GitHub; o push sai da sua
   máquina). Sobe a campanha COMEBACK50 + os docs desta sprint. **Não toca em render** —
   os fixes de `lib/compose.ts` (glow/base preta) já subiram na sua sessão paralela durante
   esta sprint, `origin/main` já está em `0c988b4`. Ou seja: nada aqui fura o seu freeze de
   dia de lançamento.

**1. 🔴 CRIAR O CUPOM `COMEBACK50` NA STRIPE — 2 minutos, destrava 19 e-mails prontos**
   A rota `/api/admin/send-comeback50` está construída, testada (tsc=0) e **se recusa a
   enviar** enquanto o código não existir (409), porque o checkout ignora promo inexistente
   em silêncio e as 19 pessoas cairiam no preço cheio depois de ler "50% off".
   Passo a passo (Stripe → Catálogo de produtos → Cupons → + Criar cupom):
   1. Desconto percentual **50%** · Duração **Vários meses → 3 meses**
   2. Aplicar a produtos específicos: **só Creator e Studio** (NUNCA o Starter)
   3. Salvar → abrir o cupom → **Códigos promocionais → + Novo → `COMEBACK50`**
   4. Me avisar: a próxima sprint roda o dry run e depois `&confirm=SEND`
   **Alternativa de 0 minuto:** já existem `FOUNDING50` (50% uma vez) e `FOUNDER50` (50%
   vitalício, 0/10 usados). Se preferir não criar nada, diga qual usar — eu troco o código
   na rota. A escolha é sua porque muda promessa de dinheiro.
   Quem recebe (19, os 6 primeiros por downloads): kingtopman (6 vídeos/24 downloads),
   agadac02 (9/23), jatinnnnn078 (2/21), kylajanae78 (6/20), hello@toolriot (1/12),
   ajiterumololuwa (1/12).

**2. 🟠 Product Hunt — o lançamento não pegou.** 3 pontos, 0 comentários, 0 cadastros em 8h
   (corte do top-17 do dia: 73 pontos). Não há nada para eu responder lá. Se você quiser
   dar uma última chance ao canal hoje, o único movimento legítimo é **compartilhar o link
   com sua rede** (X/WhatsApp) — nunca pedir upvote. Veredito completo no relatório das 22h.

## 📌 03/08 ~14:30Z (sprint 10h) — PENDENTES DE HOJE

1. ✅ ~~21/22/23/24/27/28-PUSH~~ — RODADOS (produção = 1cf2670: página EARN + og-card v2
   no ar; IndexNow 108 URLs rodado 19:04Z pela sprint 16h).
   → **NOVO: rodar `scripts\29-PUSH.bat`** (30s) — sobe ADMIN HQ consolidado
   (30cd789 + f812f06) + log engajamento X (dceea2c) + docs sprint 16h (pesquisa Whop).
1b. ✅ ~~Conta Whop~~ — **FEITA pelo fundador ~19:45Z 03/08** e whop montado POR MIM na
   sessão logada: **whop.com/kineoclippers** ("Kineo Clippers", descrição com free +
   40% afiliado, welcome post com utm_source=whop, indexável). Rota B (grátis) NO AR.
1c. ⏸️ Campanha Content Rewards paga — **ADIADA: fundador sem caixa agora** (03/08).
   Spec pronto em `docs/PESQUISA-WHOP-2026-08-03.md`; religar quando houver budget
   (dá pra testar com $50). Enquanto isso: Rota C grátis (outreach a donos de
   comunidade com afiliado 40%) — eu rascunho no Gmail.
2. ✅ ~~Fazier launch~~ — **NO AR, #1 DO DIA com 45 upvotes** (14:20Z). 3 comentários
   respondidos como maker na sua sessão. Só acompanhar; nada obrigatório seu.
3. (30s, ouro) **TAAFT review — akajitin@gmail.com**: comprou HOJE 25 min após cadastrar
   via TAAFT, 5 vídeos, viu o review-ask. Uma linha pessoal sua pedindo review =
   candidato nº 1 da história. Link: https://theresanaiforthat.com/ai/kineo/
4. 🗓️ Amanhã ter 04/08 12:01am PT — **PH LAUNCH DAY** (agendado, checklist 100%).

## 📌 02/08 ~22:20Z (atualizado sprint 19h) — PENDENTES DO DIA (2×30s)

1. ✅ ~~Send Emilio~~ — **FEITO 21:35Z** (verificado in:sent). Aguardando retorno dele.
2. ✅ ~~14-PUSH~~ — **FEITO** (origin/main=845c6b5; fast-retry + first-win em produção).
3. ✅ ~~16-PUSH~~ — **RODADO** (deploy sha 6a74621 READY; IndexNow 107 URLs HTTP 200 pós-deploy).
4. 🗓️ **Fazier launch AMANHÃ seg 03/08** — fazier.com/launches/kineo.
5. ✅ ~~Conta PH~~ — **2º LAUNCH AGENDADO: TERÇA 04/08 12:01am PT** (página refeita, galeria nova,
   first comment pronto). No dia: responder comentários; NÃO pedir upvotes (regra PH).
6. ✅ ~~17/18-PUSH~~ — **RODADO ~00:50Z 03/08** (deploy READY sha 75e5d04 em www.usekineo.com; PayPal-no-recovery + CTA Autopilot EM PRODUÇÃO).

**Regra:** eu nunca paro num gate. Anoto aqui, passo para a próxima coisa, e o Joseph resolve tudo de uma vez por dia.
**Não posso:** criar conta · digitar senha · resolver CAPTCHA · mover dinheiro.

---

## 🚨 00. DIAGNÓSTICO FECHADO (sprint 21h) — A RECARGA FOI PARA A CONTA ERRADA. Conserto: 5 min

**Verificado às ~00:05Z de 01/08 na SUA sessão logada do Chrome em platform.openai.com
(hipótese 3 era a certa — as outras duas caíram):**

- O blackout foi **UM SÓ, contínuo, 11:07Z → 23:52Z+** (último erro registrado antes deste
  relatório). 21 vítimas externas no dia, **0 vídeos entregues o dia inteiro**. Os "rounds"
  eram só janelas de observação — os erros nunca pararam (17h→23h: erros em TODAS as horas).
- A conta **josephsskaf@gmail.com tem UMA org só ("Personal")**: saldo **$18.98**, auto-reload
  LIGADO ($5→$10, teto $30/mês), spend limit $50/mês. E essa org gastou **$1.02 em 15 dias**
  (27 requests no período 17/07–01/08; única key "Aestivora Vora" `sk-...60kA`, last used
  **17/jul**, monthly spend $0.00).
- Conclusão inescapável: **a OPENAI_API_KEY da produção NÃO pertence a esta conta.** A
  produção consome de OUTRA conta OpenAI, que está sem créditos desde 11:07Z. A recarga das
  16:42Z caiu nesta conta (a errada) — por isso "não segurou": ela nunca teve efeito.
- Código confirma: `lib/openai.ts` = `new OpenAI({ apiKey })` sem baseURL (api.openai.com
  puro). `.env.local` local só tem placeholder `sk-...`; a chave real vive nos env vars da
  Vercel.

**CONSERTO (5 min) — não cace a conta antiga; traga a produção para a conta que você já monitora:**
1. https://platform.openai.com/api-keys (logado como josephsskaf@gmail.com) →
   **Create new secret key** → copiar.
2. https://vercel.com → projeto **kineo** → Settings → **Environment Variables** →
   editar `OPENAI_API_KEY` (Production) → colar a nova chave → Save.
3. Aba **Deployments** → menu ⋯ do deploy atual → **Redeploy** (env var nova só entra
   com deploy novo). Antes disso, rode o `scripts\13-PUSH.bat` — aí o próprio push já
   faz o deploy com a env nova.
4. Pronto: produção passa a consumir da org com $18.98 + auto-reload ligado. O win-back
   dispara SOZINHO na volta (45 min sem marker + 1 vídeo completado; cron hh:05/hh:35).
5. Na mesma sessão (2 min, https://platform.openai.com/settings/organization/limits):
   com a onda a 68 cadastros/24h, o colchão atual é fino → auto-reload **gatilho $10 /
   recarregar até $25**, teto mensal de auto-reload **$30 → $100** e spend limit da org
   **$50 → $200** (teto é permissão, não gasto — e o mês da OpenAI acabou de virar).

⚠️ Por regra dura eu não crio nem colo chaves/segredos em campo nenhum — por isso este
gate é seu. Teste de sucesso: gerar 1 vídeo → `videos.status='completed'` novo → win-back
sai sozinho para as 21 vítimas.

---

## ✅ 00-a. ROUND 1 (histórico) — recarga feita pelo fundador, fim às 16:42Z (31/07)

Duração total: **11:07Z → 16:42Z (5h35)**. Dano final: 15 vítimas externas / ~196 erros /
0 vídeos no período. Verificado em produção às 16:50Z: **zero erros desde 16:43Z** (antes,
~1/min). Timeline completa em SPRINT-2026-07-31 (§ sprints 11h e 13h).
Alarme (10-PUSH) e win-back (11-PUSH) ambos no ar — deploy `a81f6d8` READY.
O win-back dispara sozinho quando: 45 min sem erro de quota + 1 vídeo COMPLETADO depois
de 16:42Z (cron roda às hh:05/hh:35). Nenhuma ação pendente.

**Pós-mortem (16:55Z, screenshot do fundador):** saldo $18.98 e **auto-reload LIGADO**
(gatilho $5 → recarrega até $10, teto $30/mês) — a causa raiz está tratada. ⚠️ Ajuste
recomendado (2 min, botão Modify): colchão de $5 é fino para pico de onda (gatilho $10 →
até $25) e o **teto de $30/mês é o novo ponto único de falha** se o volume seguir
crescendo — subir para $100+ (teto é permissão, não gasto). Se o teto bater, o alarme
pega em segundos e o win-back recupera as vítimas — mas melhor não bater.

## ✅ 0. `scripts\11-PUSH.bat` — RODADO pelo fundador às ~16:44Z (deploy `a81f6d8` READY)

---

## ✅ SPRINT DE FLUXO 31/07 (3h) — o que EU já fiz sozinho, com a extensão viva

| Ação | Resultado |
|---|---|
| IndexNow (Bing/ChatGPT) | **107 URLs aceitas, HTTP 200** — inclui o case study novo |
| Google: reindex da HOME | **"Indexing requested"** — o título de marca novo entrou na fila prioritária |
| Google: index do case study | **"Indexing requested"** |
| Google: recrawl de /avatar | **"request rejected"** = o Google LEU o noindex — o snippet "ShortsForgeAI · $11.90" vai cair |
| **FutureTools (Matt Wolfe, ~700k subs)** | ✅ **"Tool Submitted!"** — 1ª submissão de diretório da história da empresa |
| **Insidr.ai** | ✅ **"Your submission was successful."** |
| aitoolsdirectory.com | ⏳ rascunho preenchido (Kineo + URL salvos no form); página com bug de render — terminar à mão leva 2 min |

## ❌ Diretórios que EU não consigo — precisam de VOCÊ logado (a extensão já permite eu dirigir depois do seu login)

Todos verificados em 31/07. Cada um pede conta/login:

| Diretório | Bloqueio | Link |
|---|---|---|
| **Fazier** (melhor dofollow da lista) | conta | fazier.com |
| **Microlaunch** | conta | microlaunch.net |
| **OpenAlternative** | conta | openalternative.co/submit |
| Dang.ai | magic link por e-mail | dang.ai/submit |
| Findly.tools | conta | findly.tools/submit |
| TinyLaunch (badge DR 72+) | conta | tinylaunch.com |
| ProductCool | magic link | productcool.com/submit |
| AIStage | login p/ ver o form | aistage.net/submit |
| Turbo0 | conta | turbo0.com/submit |
| StartupBase · BetaList · SaaSHub · Uneed | conta | — |

**Como destravar em lote (30 min, uma vez):** você loga nesses sites numa janela do Chrome e me fala — com a extensão conectada eu preencho e submeto todos na hora, igual fiz no FutureTools.

## ❌ Mortos ou pagos — riscar da lista para sempre

- **TAAFT rota grátis (tally.so/r/mRWbdK): FORMULÁRIO FECHADO** em 31/07 — "This form is now closed". A única rota grátis do TAAFT morreu; sobra a edição da ficha (já feita) e reviews.
- aitools.fyi/submit → virou serviço pago **$37**
- ToolsFine → formulário termina em **"Continue to PayPal – $10"**
- LaunchingNext → parede anti-bot infinita

---

## 🔴 0. (03/08 19h) Rodar `scripts\31-PUSH.bat` + enviar 3 outreach Whop — 6 min

- **31-PUSH** (substitui o 30): sobe as 4 iniciativas da sessão CEO (WALL /wall, SCRIPT
  LIBRARY /scripts, AEO 46 /vs, sitemap) + admin HQ + docs. 7 commits parados localmente.
- **3 rascunhos no Gmail** (Rota C Whop, afiliado 40%): o canal real é **Whop DM / IG DM**
  — abrir cada rascunho, copiar o CORPO e colar no destino que está no assunto:
  1. carlosdelzo (whop.com/cashclipslatino) — em espanhol
  2. @eugenelitman_ IG / whop.com/joinclipstudios
  3. @adan.maxwell IG / whop.com/vitaclips

## 🔴 1. TAAFT — pedir 5 avaliações reais — 15 min

Nota **3,0 com só 2 avaliações** governa o que todo LLM lê sobre a Kineo. O TAAFT segue sendo o canal nº 1 (81 cadastros, 32,1% de ativação, metade dos compradores da história) e está decaindo 48→16→9→5/semana. Mandar o link para 5 usuários reais é o item de maior retorno por minuto que existe: https://theresanaiforthat.com/ai/kineo/
Lista de candidatos (por vídeos concluídos) em `docs/SPRINT-2026-07-30-D.md` §7.
Bônus: **antonia@theresanaiforthat.com tem conta na Kineo com 5 vídeos** — contato mais valioso da empresa.

## 🔴 1.b Send no rascunho do pagante — 30 segundos (sprint 10h)

Rascunho novo no seu Gmail: **"Fixed — your videos will deliver now"** para
`valos87196@…` (o único plano pago ativo). Diagnóstico fechado hoje: 6 vídeos dele foram
renderizados e RECUSADOS na entrega por falha nossa de débito; o fix subiu no seu push desta
manhã e um débito real liquidou às 10:55Z. Ele não tenta desde 30/07 12:44Z — este e-mail é
o que o traz de volta. Só apertar Send.

## 🔴 2. E-mail de win-back — 12 pessoas, "pode mandar" seu

12 pessoas tiveram 25 vídeos prontos destruídos (23–30/07) por falha nossa. Rascunho pronto; só falta seu OK. O pagante `valos87196@…` merece contato direto.

## 🔴 3. Bing Webmaster Tools — 10 min

Import do GSC em 1 clique: bing.com/webmasters. O canal já está alimentado (IndexNow ×2); falta enxergar posições/consultas no índice que sustenta a busca do ChatGPT.

## 🟠 4. AlternativeTo — 20 min

Página da Kineo com 0 likes. "Suggest alternative" em OpusClip, Submagic, InVideo, Klap, Crayo, AutoShorts, Revid, Faceless.so, Syllaby, Pictory, HeyGen, Fliki, SendShort, Zebracat, Quso.

## 🟡 5. Computer-use nas tarefas agendadas — 1 min, mata o gate de push

Configurações da tarefa `kineo-sprint-diario` → adicionar **Explorador de Arquivos**. Aí as 4 sprints diárias empurram commits sozinhas.

## ✅ 6. KINEO_LIFECYCLE_EMAILS_ENABLED — LIGADO em 31/07 (nudges saindo em ritmo saudável: 502 às 16:02Z)

Auditoria de 31/07 (sessão B) concluiu os dois pré-requisitos:
- **Supressão cruzada de 24h: JÁ ESTAVA LIGADA** nos 4 crons + 2 rotas admin desde 27/07
  (`lib/lifecycle/suppression.ts` — os docs é que estavam atrasados).
- **Templates auditados um a um:** remetente certo (`hello@usekineo.com`), claims honestos.
  Único erro real — video-rescue prometia "25 Shorts por $4,90" quando o pack dá **30** —
  corrigido e amarrado à fonte de preço (commit da sessão B).
- A "falsidade documentada" ("first AI video is free, no credits") vive só num **comentário
  de código** e no doc morto EMAIL-HOT-LEAD.md — nenhum e-mail enviado a contém.

**Para ligar:** Vercel → kineo → Settings → Environment Variables → `KINEO_LIFECYCLE_EMAILS_ENABLED=true` → redeploy. Reversível em segundos. 721 contatos do outro lado, máx. 1 e-mail/24h por pessoa, 1 de cada tipo por vida.

## ✅ 7. Post do Reddit — FEITO POR MIM em 31/07 (autorizado)
Postado de u/ShortsforgeAI + 1º comentário. Filtro do Reddit segurou o post (conta nova sem karma) — está na fila dos mods. Modmail de revisão bloqueado ("You can't message that user" = restrição de conta nova). **Se você tiver conta Reddit PESSOAL com karma, o próximo post sai dela — resolve o filtro na raiz.**

## ~~🆕 7-antigo~~. Post do Reddit — PRONTO PARA COLAR — 5 min

`docs/REDDIT-POST-PRONTO.md`: título + corpo + primeiro comentário, para o r/YouTubeCreators
(98k membros, sem regras de autopromoção). É a distribuição do case study — thread viva que
se atualiza toda semana. Postar exige sua conta Reddit; o texto está pronto palavra por palavra.

## 🔴 INCIDENTE DE CREDITO — DESCOBERTO 05/08 03:40Z (fundador reportou "creditos abaixaram sem video")
CAUSA: modo cinematografico (seedance/veo/kling/hollywood) e avatar/presenter DEBITAM NO SUBMIT
(app/api/generate-video-cinematic/route.ts:798), nao na entrega. Reembolso existia SO AO VIVO
(dependia da aba aberta fazendo polling) e o sweep diario EXCLUIA cinematic-% de proposito.
Aba fechada / fal travado = credito perdido para sempre, em silencio.
A tela prometia "Credits are only charged on successful delivery" — VERDADE no fast, MENTIRA
em todos os motores de IA. Promessa falsa para cliente pagante = risco de reembolso/chargeback.
PROVA: 1 render abandonado de 22/07 com 150 creditos queimados que ninguem soube + os 2 do
fundador em 05/08 (20 seedance + 90 veo).
CORRIGIDO em e3ddf7a: sweepAbandonedCinematicDebits() no cron de refund (09:30), /api/compose/active
passa a enxergar cinematic em fal_polling (a pilula global era cega na fase mais longa e ja paga),
copy condicional por motor. Creditos do fundador devolvidos via refund_render_credits (397 -> 507).

### ⚠️ RISCO IRMAO AINDA ABERTO — avatar/presenter
avatar-% tem EXATAMENTE o mesmo buraco (debita no submit, refund so ao vivo, excluido do sweep).
Hoje nao ha linha presa, mas o proximo avatar abandonado queima creditos igual.
TAREFA PARA A PROXIMA SPRINT: estender sweepAbandonedCinematicDebits para avatar-% usando a
mesma cadeia de verificacao de entrega. Prioridade alta — e dinheiro do cliente.

### ⚠️ ETA MENTIROSA POR MOTOR (mesma familia: usuario no escuro)
A tela promete "usually 2-4 minutes" para TODOS os motores. Veo 60s = 7 clipes x 2-4 min = 15-25 min.
O fundador achou que tinha travado (05/08 03:30Z). TAREFA: ETA condicional por motor/duracao.
