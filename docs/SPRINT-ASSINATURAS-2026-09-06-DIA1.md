# SPRINT ASSINATURAS — DIA 1 (06/09/2026, 11:08 → 19:08 BRT)

## A ORDEM DO FUNDADOR (06/09, 10:45 BRT)

> "Gostei muito. Mais uma rodada de 8 horas. Seja MAIS CRIATIVO ainda: pensa
> como JEFF BEZOS e faz alguma mudança para a gente ganhar mais assinaturas e
> mais segundos vídeos. Pensa no quanto a gente pode ser DIFERENTE de tudo que
> já vimos. Com os números na mão, mandando os e-mails, fazendo as praxes — mas
> INVENTANDO, criando alguma forma de MONETIZAR. Número alto na cabeça: 10 ou
> 15 pagantes por dia. Quero bater meta. O site novo entra AGORA pelo ChatGPT
> (Codex): não estranhe nada; conversem por Git."

**Marco de medição deste ciclo:** `created_at > '2026-09-06 14:00:00+00'::timestamptz`.
**Meta declarada:** 10-15 pagantes/dia. **Linha de base honesta:** 2 pagantes em
7 dias (230 pessoas externas).

## O SITE NOVO ENTROU — E A PISTA MUDOU DE FORMA NA PRIMEIRA HORA

O Codex publicou o lote UX aprovado pelo fundador entre 10:49 e 11:15 BRT:
`027e7996` (idea-first Studio layout), `25a0d164` (menu mobile acima dos avisos
de instalação), `33737e95` (registro). Território dele a partir de agora:
`app/(dashboard)/studio/StudioClient.tsx`, `components/MobileNav.tsx`,
`scripts/preview-studio-hierarchy.mjs`, `scripts/test-studio-hierarchy-runtime.mjs`,
`scripts/test-ux-mobile-navigation.mjs`. Não reverto, não conserto visual dele,
não estranho — e o meu commit desta rotação rebasou por cima dele sem conflito.

---

## ### #17 — 11:14 BRT — o link de série devolvia `'/studio'` em vez de `null`, e `'/studio'` é truthy

### PRESS RELEASE (o que muda para o cliente)

1. Ontem à noite o mecanismo da "próxima ação" teve o seu **primeiro clique
   real** — e a pessoa caiu na home do Studio, sem tema e sem motor escolhido.
2. Ela não desistiu: ela **apertou o botão certo** e a casa a largou numa tela
   em branco, que é exatamente o que essa caixa existe para nunca fazer.
3. A partir de agora, quando a casa não tem episódio 2 para oferecer, ela **diz
   que não tem** — e a saída barata (o filme que o saldo AINDA paga) aparece no
   lugar, em vez de ser engolida em silêncio.
4. E quem já tem filme entregue nunca mais lê "Make your first film".
5. Por que isso vale dinheiro: essa caixa é a única superfície da casa que
   aparece na hora em que a pessoa está sem saldo — o momento em que ela decide
   entre pagar e ir embora. Enquanto ela mandava a pessoa para uma tela vazia,
   toda a rotação anterior estava medindo um caminho que não existia.
6. Custo: uma função nova. Preço, oferta e pipeline de filme: intocados.

### O QUE ESTAVA ERRADO (medido, não suposto)

`lib/seriesContinuation.ts` — `buildSeriesContinuationHref()` devolve a string
`'/studio'` quando o tema não monta prompt utilizável. Para uma **tela**, isso é
um destino aceitável. Para quem **precisa decidir**, `'/studio'` é veneno: é um
valor *truthy*, então todo `?? alternativa` a jusante morre sem nunca rodar.

Em `app/api/next-action/route.ts` a linha era
`const hrefAlternativa = motorAcessivel ? (hrefContinuar ?? hrefBarato) : null`.
Com `hrefContinuar = '/studio'`, o `?? hrefBarato` **nunca** executava, e o
evento `next_action_served` ainda rotulava o caminho como `'series'` — ou seja,
o placar dizia que a porta de série tinha sido servida quando o que foi servido
era a home do Studio.

### O QUE MUDOU

- `lib/seriesContinuation.ts`: nasce `seriesContinuationHrefOrNull()`, que
  devolve `null` quando não há episódio 2 para oferecer.
  `buildSeriesContinuationHref()` passa a **delegar** nela com `?? '/studio'` —
  os **10 chamadores de tela ficam byte a byte iguais**. Isso é deliberado:
  dois deles (`ResumeStrip`, `StudioClient`) são território do Codex nesta
  pista e não podiam ser tocados hoje.
- `app/api/next-action/route.ts`: passa a usar a variante que sabe dizer não.
- **Efeito colateral tratado no mesmo commit:** com `hrefContinuar` podendo ser
  `null` tendo filme entregue, o `primary` caía em `make_first_film` e diria
  "Make your first film" para quem **já tem filme**. Frase falsa — e a casa
  proibiu frase falsa no #5 de 02/09. Ramo novo `make_next_film`: não promete
  episódio 2 que não existe e não chama de estreante quem não é.

**SHA `8d3c6061`** (rebasado por cima do lote do Codex). Fila 0. **EM PRODUÇÃO**
até onde a sonda alcança: home 200, `/studio` 200, `/api/next-action` 401 **com
controle irmão inexistente em 404** (memória `sonda-401-exige-controle-404`).

### TESTES

`scripts/test-link-que-sabe-dizer-nao.mjs` — **17 verificações** lendo os
arquivos reais, normalizando CRLF na leitura (memória `guardiao-crlf-falso-vermelho`).
Seis mutantes aplicados e mortos: (M1) a variante volta a devolver `'/studio'`;
(M2) a rota volta a chamar a porta das telas; (M3) o `?? hrefBarato` é removido;
(M4') a guarda do ramo novo vira `true`; (M5) o piso `'/studio'` some da porta
das telas; (M6) o rótulo volta a chamar de estreante quem já tem filme.

`npx tsc --noEmit` verde — e **falsificado**: um erro de tipo proposital foi
inserido e o tsc reprovou com `TS2322` (memória `worktree-tsc-node-modules`:
exit 0 sozinho não prova nada). Typecheck repetido na **árvore combinada com o
lote do Codex** — também verde.

### O ERRO QUE EU COMETI DENTRO DESTA MESMA ROTAÇÃO (registro)

A primeira versão do guardião tinha 16 verificações e o mutante M4 **sobrevivia**:
a checagem usava `/: state === 'can_continue'[\s\S]*?make_next_film/`, e o
`[\s\S]*?` atravessava 20 linhas até encontrar o **outro** `state ===
'can_continue'` que já existia no arquivo. Regex frouxo conta texto, não prova
condição (memória `guardiao-contar-texto-nao-prova-condicao`). A guarda agora é
lida do pedaço **imediatamente antes** do ramo, sem salto possível — e o M4'
morre.

### RISCO

Baixo e limitado a uma coorte pequena: quem tem filme entregue **e** tema
degenerado passa a ver "Make your next film" em vez de "Build the next episode"
apontando para lugar nenhum. Nenhuma tela mudou. Nenhum preço mudou.

### O QUE AINDA NÃO ESTÁ PROVADO

Que o **meu SHA** está servindo. A entrega é uma rota autenticada sem marcador
público; `curl` não alcança. A prova é comportamental e depende de tráfego:
`kind: 'make_next_film'` e `href` com `src=next_action_no_seed` não existiam no
repo antes deste commit. Fecha no checkpoint.


---

## ### #18 — 11:26 BRT — a casa passa a saber que o cliente tem uma TEMPORADA, não um vídeo

### PRESS RELEASE (o que muda para o cliente)

1. Hoje, quando o filme fica pronto, a casa pergunta "quer fazer outro?" —
   e entrega um **formulário em branco**. A pessoa teria que inventar um tema
   novo, do zero, com a empolgação já passando.
2. A partir de agora a casa **afirma** em vez de perguntar: os títulos dos
   episódios **2 a 6** da mesma série já estão escritos quando o filme 1 cai.
3. O cliente deixa de ter *um vídeo* e passa a ter *uma temporada* — e a
   diferença não é estética: ninguém assina uma fábrica de coisa que já
   terminou.
4. O plano deixa de ser "60 créditos por $9.90" (unidade que ninguém sente) e
   pode passar a ser **"o resto da sua temporada"** — a rota devolve quantos
   episódios o saldo de hoje paga, calculado da fonte única de custo.
5. Preço público: **intocado**. O que muda é a moldura, não o número.
6. Custo: uma chamada de `gpt-4o-mini` (~$0,0003) por filme entregue, escrita
   uma vez e lembrada. Pipeline de qualidade do filme: não encostei.

### O QUE ESTAVA ERRADO (medido hoje, 7 dias, contas externas)

**234 cadastros → 151 fizeram o filme 1 → 114 pararam em EXATAMENTE UM → 2
pagaram.** Das 114 que pararam: **70 ainda têm saldo** para outro filme agora,
e **64 nunca bateram na parede de crédito** (`upgrade_modal_opened` = 0).
Dessas 64, **33 vieram do chatgpt** e **25 fizeram o filme nas últimas 48h**.

Elas não foram barradas. Foram embora **satisfeitas**, ~30 min depois do filme.
Toda a máquina de porta-de-saldo construída na madrugada mira as **9** que
bateram na parede — 8% do problema. As 64 não são público de campanha nenhuma.

### O QUE MUDOU

- `lib/temporada.ts` (novo, puro, sem import): o que é uma temporada, o que
  vale ser gravado, TTL de 14 dias igual ao do episódio 2 (de propósito: as
  mesmas cartas leem as duas memórias, e validades diferentes produziriam uma
  carta que nomeia o Ep2 e não sabe mais o nome do Ep3).
- `app/api/season/route.ts` (novo). **GET só lê** — nunca chama modelo, nunca
  gasta; ausência de temporada é `200 season:null`, nunca 404. **POST escreve
  uma vez** e guarda em `events` (`season_written`, chaveado por `video_id`) —
  **sem migration, sem DDL**, reversível com um `delete`.
- **Ou os cinco episódios, ou nenhum.** Temporada com buracos ("Ep2 · Ep4 ·
  Ep6") lê como defeito, não como catálogo.
- A rota devolve `episodeCost` (de `creditCostForDuration`, fonte única),
  `balance` e `affordableEpisodes`. **Não escreve preço nem nome de plano** — e
  o guardião proíbe que passe a escrever.

**SHA `8c73b24b`. EM PRODUÇÃO, E DESTA VEZ PROVADO NO SHA.**

### A PROVA DE DEPLOY QUE FALTAVA — E COMO ELA FOI FEITA

A entrega da madrugada (#16) ficou sem prova de SHA porque era uma rota
autenticada que **já existia**: 401 antes e 401 depois (memória
`sonda-401-exige-controle-404`). A `/api/season` é **rota nova**, e isso dá o
par que decide:

| momento | `/api/season` | controle irmão inexistente |
|---|---|---|
| 14:28:45 UTC (antes) | **404** | 404 |
| 14:30:04 UTC (depois) | **401** | 404 |

O controle não se mexeu; a rota nova mudou de 404 para 401. Isso prova
`8c73b24b` servindo — e, por ancestralidade, prova também o **#17**.

### TESTES

`scripts/test-temporada.mjs` — **36 verificações**. Metade **executa**
`lib/temporada.ts` (import nativo de TS no Node 24 — o **arquivo real**, não
uma cópia nem um mock) contra os modos de falha que estes modelos realmente
produzem: título repetido (inclusive só trocando a caixa), lista de 4 itens,
item sem `seed`, prosa no lugar de JSON, item excedente. A outra metade amarra
as promessas caras da rota: GET sem modelo, POST lê a memória **antes** de
gastar, `insert` único, custo da fonte única, e nenhum preço escrito.

**O teste achou um bug meu antes do push:** `texto()` removia aspas **antes**
do `trim()`, então um título que chega como `  "Assim"  ` mantinha a aspa até a
tela — `^["…]` não casa quando a string começa com espaço.

`npx tsc --noEmit` verde na árvore combinada com o lote do Codex. Guardião do
#17 continua 17/17.

### RISCO

Baixo por construção: nada consome a rota ainda. Se a temporada não nascer, a
resposta é `season: null` e **nada na casa muda**. O gasto máximo é uma chamada
de `gpt-4o-mini` por filme, e só se alguém chamar o POST.

### PRAXE — CHECKPOINT 11:38 BRT

**Placar do marco (14:00 UTC):** a janela tem 30 minutos de vida — 0 cadastros,
0 filmes, 0 checkouts, 0 pagamentos. Número honesto, não conclusão.

**Checagem zero — e ela fechou TRÊS pendências abertas:**

- ✅ **Prova do #16 fechada.** `next_action_served` com `engine_deeplink` = **11
  linhas**. O campo não existia no repo antes daquele commit — o deploy da
  madrugada está provado.
- ✅ **`fc28af0b` não era débito sem entrega.** O filme entrou: `completed`
  com URL. O item de vigia da #11 pode ser riscado.
- ✅ **O botão do episódio 2 saiu do zero.** `episode_link_clicked` = **3 em
  8h**, contra 1 em toda a história (e aquela 1 era a minha sonda). Duas são
  anônimas (deslogadas, caem no `/login`); **uma é real**: pessoa `53cef8ef`,
  chatgpt, 13:31 UTC, saldo 12.
- ⚠️ **Mas o clique real não virou filme.** `53cef8ef` clicou há ~1h e tem
  **0 vídeos depois disso**. Com 12 créditos: o Kineo 1 cabe, o Seedance 1.5
  (15cr) **não**. É exatamente o beco que o **#17** acabou de fechar — mas
  **1 pessoa não é coorte** (memória `janela-movel-congelada`), e eu não vou
  construir jogada em cima disso. Fica como o primeiro caso a reconferir.
- Cadastro sem crédito: **1 de 17**, e não é trial órfão — `granted=25 used=25`
  com **3 filmes entregues**. É alguém que gastou tudo hoje. Render preso: 0.
  `next_episode_failed`: 0.
- Cartas de hoje: `trial_lifecycle_email_sent` 56 · `checkout_recovery_emailed_v1`
  21 · `video_ready_email_sent` 19 · `next_episode_wall_emailed_v1` 18.

### PRÓXIMA JOGADA (rotação #2)

**A carta da temporada, para as 64.** Coorte já dimensionada e reservada acima.
Assunto = o **título do episódio 2** que a casa escreveu para aquela pessoa;
corpo = a temporada inteira, Ep2 em um clique, e o resto da temporada como o
que o plano compra. É a única peça que alcança as 64 hoje — elas não voltam
sozinhas e não são público de campanha nenhuma. Dry-run nominal no diário antes
do disparo.


---

## ### #19 — 11:45 BRT — a carta da temporada, e o carimbo que quase a matou antes de sair

### PRESS RELEASE (o que muda para o cliente)

1. A maior coorte da casa — quem fez **um** filme, **ainda tem saldo** e nunca
   esbarrou em nada — nunca recebeu carta nenhuma. Toda carta da casa fala de
   crédito acabando, e **para essas pessoas isso é falso**.
2. Elas passam a receber uma carta que **não pede nada**. O assunto é o nome do
   **episódio 2** que a casa escreveu para aquela pessoa. O corpo é a temporada
   inteira do filme que ela mesma fez.
3. Um clique abre o compositor com o tema já dentro. Não é "volte e faça
   outro" (pedido, formulário em branco); é "a sua temporada existe" (entrega).
4. O rodapé diz quantos episódios o **saldo de hoje** paga — número real, do
   motor que a pessoa usou — e que o plano cobre o resto.
5. **"O resto da sua temporada"** em vez de "60 créditos". Preço público:
   intocado; o guardião proíbe valor, plano, cupom e desconto dentro da carta.
6. Disparo armado para **12:45 e 16:45 BRT**, 30 por vez, hoje — dentro da
   janela, para dar tempo de medir antes das 19:08.

### O QUE O DRY-RUN PEGOU — E É O ACHADO MAIS CARO DO DIA

Não consigo autenticar como admin sem navegador (proibido no ciclo), então o
dry-run nominal foi feito **replicando o predicado da rota em SQL contra as
linhas reais** (memória `provar-leitura-sem-trafego`). O funil:

| passo | pessoas |
|---|---|
| fez EXATAMENTE 1 filme (14d) | 163 |
| e-mail utilizável, não pagante | 162 |
| **saldo ainda paga outro filme** | 37 |
| sem parede, sem checkout, sem campanha | 36 |
| **carimbos de `profiles`** | **2** |

**36 → 2.** A campanha inteira morria no último passo — e eu teria concluído
"a coorte não existe" se tivesse armado o cron sem medir.

**O culpado:** `activation_nudge_sent_at` em **30 das 36**, com o valor
`1970-01-01`. Isso é o `LIFECYCLE_SKIP_STAMP` — o carimbo que
`send-activation-nudge` grava quando **PULA** alguém, e a razão do pulo é
literalmente *"a pessoa já fez um vídeo"*. Esta carta é dirigida **exatamente a
quem já fez um vídeo**. Lido como "já recebeu carta", o sentinela silencia a
coorte **por definição**.

A casa **já tinha escrito o leitor certo** para isso: `isRealSendStamp`
(`lib/lifecycle/skipStamp.ts`, KINEO-SKIP-STAMP-2026-08-05, que nasceu do
mesmo defeito em agosto). A supressão de 24h usa. As listas de campanha nunca
adotaram. Não é afrouxamento: a regra é "não escrever para quem **já recebeu**
carta", e a época significa que **nenhuma carta saiu**. Data ilegível conta
como envio — na dúvida, não escrever.

**O tamanho disso na casa inteira:** 1.285 perfis têm valor nessa família de
colunas e **623 são a época**. **35% da base está silenciado para toda campanha
da casa por carimbos que não registram envio nenhum.**

**Não mexi nas irmãs.** Alterar a coorte de campanha viva no meio do dia exige
o número na mão primeiro — está no PEDIDOS com a medição.

**Coorte depois do conserto: 21 elegíveis** (era 2), 10 do chatgpt, 11 com o
filme feito nas últimas 48h, todas em Kineo 1, todas com saldo para **2 a 9**
episódios.

### O QUE MUDOU

- `lib/temporadaServer.ts` (novo): o escritor sai da rota para ter **um dono**.
  A coorte não está logada e o filme dela é anterior ao deploy de hoje —
  ninguém tem temporada gravada, então a carta precisa saber escrever.
- `app/api/admin/send-season-letter/route.ts` (novo): a campanha.
- `app/api/season/route.ts`: passa a delegar no escritor único.
- **Carimbo cruzado nas duas irmãs, no mesmo commit** — o aviso da #13 vale nos
  dois sentidos, senão a mesma pessoa leva duas cartas no mesmo dia.
- `vercel.json`: `45 15,19 * * *` UTC.

**SHAs `9dff7db3` + `e71edb30`. EM PRODUÇÃO, provado no SHA:**
`/api/admin/send-season-letter` foi **404 → 403** enquanto o controle irmão
inexistente ficou em **404**.

### TESTES

`scripts/test-carta-temporada.mjs` — **60 verificações**. As 14 travas de
segurança são verificadas **nesta rota E na irmã** (é assim que "esqueci uma"
aparece). Seis mutantes mortos, incluindo o mais caro possível: **inverter o
sinal da coorte** mandaria esta carta para quem **não** tem saldo — a lista
mais quente da casa, carimbo vitalício, sem segunda chance.

Somados no ciclo: **60 + 40 + 17 = 117 verificações verdes**, `tsc` limpo na
árvore combinada com o lote do Codex.

### DOIS ERROS MEUS NESTA ROTAÇÃO (registro, porque os dois quase passaram)

1. **`git checkout` não restaura arquivo novo.** Rodei os mutantes num arquivo
   ainda **não rastreado**: as restaurações falharam em silêncio e os mutantes
   **empilharam** — cheguei a ter a coorte invertida, a supressão removida e um
   preço digitado, tudo ao mesmo tempo. Pior: o mutante da **irmã** era num
   arquivo rastreado, e o `git checkout` dela **reverteu junto o carimbo
   cruzado que eu ainda não tinha commitado**. A memória
   `falsificar-mutacao-commitar-antes` vale nos **dois** sentidos e eu só
   conhecia um. Reparado ponto a ponto e provado pelas 60 verificações.
2. **Um `splice` engoliu a verificação do dinheiro.** Ao mover as travas 25-29
   para o arquivo novo, a 28 (proíbe débito/fal/render) foi junto — e o
   guardião ficou **verde sem ela**. Foi pega relendo a lista de checks, não
   pelo verde. Voltou mais forte: agora vale para os dois arquivos.

### RISCO

O disparo é automático às 12:45 BRT. Se a temporada não nascer para alguém, a
carta **não sai** e a pessoa **não é carimbada** — continua elegível amanhã.
Teto de 30. Custo do lote: ~21 chamadas de `gpt-4o-mini` ≈ **US$ 0,006**.

### COMO MEDIR

`season_letter_emailed_v1` → `episode_link_clicked` / `series_continue_clicked`
→ linha em `videos` das **mesmas** pessoas em 24h → `payment_success`.
Denominador é gente, não evento.

---

## ### #20 — 11:56 BRT — cada filme entregue passa a sair com o anúncio dele dentro

### A ARITMÉTICA QUE MANDOU FAZER ISTO — e ela é desconfortável

Antes de escolher esta jogada eu medi o tamanho real da meta:

- A casa recebe **~30 cadastros/dia** (19 a 57, nos últimos 8 dias).
- Em 7 dias, **230 pessoas viraram 2 pagantes: 0,87%**.
- Para bater **10 pagantes/dia** com uma conversão **cinco vezes melhor**
  (4,3% — que ninguém nesta indústria tem), seriam precisos **~230 cadastros
  por dia**. Sete a oito vezes o tráfego de hoje.

**Portanto: todo o trabalho de conversão deste ciclo — o meu incluído — tem
teto de 1 a 2 pagantes por dia.** Não porque as peças sejam ruins, mas porque
não há gente suficiente entrando. A meta de 10-15/dia é uma meta de
**aquisição**, não de conversão, e nenhuma quantidade de aperto na base de 230
chega lá.

Eu prefiro escrever isso agora do que entregar oito horas de conversão às
19:08 e deixar a conta implícita.

### PRESS RELEASE (o que muda para o cliente)

1. Hoje o cliente recebe o MP4 e fica **sozinho com a parte chata**: inventar
   título, escrever descrição, achar hashtags, pensar num comentário fixado.
2. A partir de agora o e-mail de filme pronto vem com o **pacote inteiro**, no
   formato que o próprio fundador usa todo dia: título de YouTube, descrição,
   legenda de TikTok com #fyp/#ai e comentário fixado. Pronto para colar.
3. Para o cliente é trabalho a menos e mais chance de o vídeo dele render.
4. Para a casa é a **única alavanca de aquisição que ela puxa sozinha**: a
   descrição carrega "Made with AI at usekineo.com". A casa entrega ~20 filmes
   por dia; cada um publicado é um anúncio que não custa mídia.
5. **Não é marca escondida.** É texto sugerido, visível, que a pessoa pode
   apagar — e "feito com IA em usekineo.com" é literalmente verdade sobre como
   aquele arquivo nasceu.

### O DETALHE QUE DÁ SENTIDO À PEÇA

O modelo esquece a linha de crédito o tempo todo. Um pacote sem crédito é um
anúncio sem endereço: o vídeo circula e ninguém descobre a Kineo. Então a casa
**acrescenta** a linha em vez de rejeitar o pacote — e acrescenta **antes** do
corte por tamanho. Cortar por tamanho no fim de um texto que carrega a parte
importante na cauda foi exatamente como nasceu o **"menino da bolha"** em
27/08; o guardião tem uma verificação só para isso (descrição de 4.000
caracteres continua saindo com o crédito).

### FALHA ABERTA — e é o centro desta entrega

Este cron é o **único aviso** de que o filme ficou pronto. Um pacote de
publicação nunca pode impedir alguém de saber que o vídeo dela está lá.

- `garantirPacote` devolve `null` em **todo** caminho de erro (sem chave,
  modelo fora do ar, JSON torto, tempo esgotado) — nunca lança.
- Há `try/catch` por cima, como segunda rede.
- Sem pacote, o **texto do e-mail sai byte a byte igual ao de hoje** — provado
  por comparação de string.
- O **HTML** sai com **uma única linha contendo apenas espaços** a mais.
  Invisível no render, mas não é "byte a byte", e eu prefiro escrever o número
  certo a arredondar para o meu lado.
- Timeout de **12s** (os outros escritores da casa usam 25s) porque este roda
  em **lote**: 30 filmes × 25s estouraria o `maxDuration` do cron e mataria os
  e-mails seguintes.

### CUSTO

Uma chamada de `gpt-4o-mini` por filme **novo** (~US$ 0,0003), gravada em
`events` e reusada — o segundo e-mail do mesmo filme não paga de novo. A ~20
filmes/dia, **menos de US$ 0,01 por dia**.

### O QUE MUDOU

`lib/publishPack.ts` (novo, puro), `lib/publishPackServer.ts` (novo, o
escritor), `app/api/cron/send-video-ready/route.ts` (o bloco "Ready to post" e
a chamada com falha aberta). **SHA `8162695a`.**

### TESTES

`scripts/test-pacote-publicacao.mjs` — **38 verificações**, metade executando
o arquivo real. Sete mutantes mortos: crédito não acrescentado, corte
decapitando o crédito, escritor lançando em vez de devolver `null`, `try/catch`
removido do cron, denominador some do carimbo, conteúdo do cliente sem escape
(injeção de HTML), e timeout longo dentro do lote.

Total do ciclo: **38 + 60 + 40 + 17 = 155 verificações verdes**, `tsc` limpo.

### DENOMINADOR

O carimbo do e-mail passa a gravar `publish_pack: true/false`. Sem isso,
"ninguém publicou" seria indistinguível de "ninguém recebeu o pacote" — o erro
exato da memória `remedio-nunca-apertado`.

### COMO PROVAR O DEPLOY

Não é rota nova, então não há o par 404→401. A prova é comportamental: o campo
`publish_pack` **não existia no repo** antes deste commit. O cron roda aos
:10 e :40, então a primeira linha de `video_ready_email_sent` que trouxer o
campo fecha a questão.

---

## ### #21 — 12:05 BRT — a carta de maior alcance da casa parou de pedir uma ideia e passou a entregar três

### PRESS RELEASE (o que muda para o cliente)

1. Quem se cadastra e não faz o primeiro vídeo recebe hoje uma carta que diz
   **"digite qualquer ideia"** e dois exemplos entre parênteses que **ninguém
   pode clicar** — e um botão para um campo em branco.
2. A partir de agora ela chega com **três primeiros episódios concretos**, cada
   um abrindo o Studio com o tema **já dentro da caixa**.
3. O **assunto** passa a nomear o primeiro deles — a isca é o que a pessoa
   nunca viu, não um lembrete de que ela não fez nada.
4. Para quem trava na página em branco (que é a maioria: **77 de 201** dos
   cadastros de 7 dias nunca criaram nem uma linha de vídeo), a distância entre
   abrir o e-mail e ter um filme cai para **um clique**.
5. Custo: **zero**. O material já existia.

### POR QUE ESTA CARTA E NÃO OUTRA

`send-activation-nudge` é a **maior superfície da casa**: **249 envios em 30
dias**, contra 21 da campanha mais nova. E ela **já funciona** — dessas 249:

- **13 entregaram um filme depois** (5,2%), **9 em menos de 48h**;
- e **2 pagaram**. Numa casa com 6 pagantes em 30 dias, **um terço do dinheiro
  passou por esta carta**.

(É correlação, não causalidade — mas é a maior superfície que existe, e é a
única que já mostrou dinheiro do outro lado.)

### CUSTO ZERO, E ISSO NÃO É FIGURA DE LINGUAGEM

`lib/viralTopics` já existia: função **pura**, semente determinística de 4
horas, sem banco e sem modelo. Nenhuma chamada nova, nenhuma leitura de banco a
mais, nenhum centavo. Calculada **uma vez por execução**, fora do laço — se
fosse por pessoa, duas do mesmo lote poderiam receber listas diferentes caso a
janela de 4h virasse no meio do envio.

### A ARMADILHA QUE EU EVITEI DE PROPÓSITO

O pool tem um campo `prompt` que é um **roteiro estruturado inteiro**, com
marcadores `HOOK`/`PAYOFF`. `composerUrl` corta em **120 caracteres**. Mandar
esse campo no link cortaria o roteiro **no meio de um marcador** — que é
exatamente a classe de erro do **"menino da bolha"** (27/08). O prefill é o
**título** (31 a 45 caracteres, cabe inteiro), e a AUTO-STRUCTURE (#310) já
sabe transformar tema curto em roteiro. O guardião tem duas verificações só
para isso.

### FALHA ABERTA — PROVADA POR EXECUÇÃO, NÃO POR LEITURA

O guardião monta **os dois construtores de e-mail** — o de `origin/main` e o
desta árvore — e compara as strings geradas:

- sem episódios, o **texto sai byte a byte igual ao de produção**;
- o **HTML** é igual a menos de espaço em branco, e a lista de tags é
  **idêntica** (nenhuma tag some ou nasce).

### O DEFEITO QUE ESSE DIFF PEGOU ANTES DO PUSH

Na primeira versão eu tirava os dois exemplos entre parênteses **sempre**. No
caminho de falha aberta isso deixava a carta com **menos** concretude que a de
hoje — ou seja, a "proteção" **piorava** o e-mail. Só descobri porque comparei
com a produção de verdade em vez de confiar no meu próprio raciocínio. Agora os
exemplos só saem quando os três episódios reais ocupam o lugar deles.

**SHA `6f46ebcd`.** 28 verificações. Total do ciclo: **28 + 38 + 60 + 40 + 17 =
183 verificações verdes**, `tsc` limpo.

### COMO MEDIR

A campanha dos links é **própria** (`utm_campaign=d0_activation_topic`),
separável do botão genérico (`d0_activation`) no mesmo e-mail. Portanto dá para
comparar, dentro da MESMA carta, "clicou num episódio pronto" contra "clicou no
campo em branco" — que é a pergunta que a casa nunca conseguiu responder.

---

## A JOGADA QUE EU **NÃO** CONSTRUÍ, E O NÚMERO QUE A MATOU

O cardápio do dia trazia o **B6**: "para conta com 0 filmes e crédito intacto
há 24h, carta com **o roteiro que a própria home escreveu para ela**". Eu medi
antes de construir, e ela cai por dois motivos independentes:

1. **A matéria-prima não existe.** `sem_filme_mas_tem_tema_gravado = **0**`.
   Não há um único tema salvo para quem não entregou filme — o roteiro grátis
   da home não é persistido em lugar nenhum que uma carta alcance. A jogada
   supõe um dado que o banco não tem.
2. **A coorte já foi trabalhada e o remédio já falhou nela.** Das 45 pessoas
   com 0 filmes e crédito intacto, **31 já receberam o nudge de ativação de
   verdade**. Sobram **14** nunca contactadas. Construir campanha nova para 14
   pessoas, repetindo um remédio que já não pegou nas outras 31, é a classe de
   erro das memórias `janela-movel-congelada` e
   `dimensionar-a-coorte-antes-de-construir-o-remedio`.

**Por isso a #21 mexeu no nudge que já alcança as 249 em vez de criar a carta
nova das 14.** Mesma coorte, mesma intenção, superfície 18x maior e custo zero.

### UM ACHADO DE PASSAGEM (não é meu lote, não abri incidente)

`tentou_e_nao_saiu = **0**` nos últimos 7 dias: **ninguém** despachou e ficou
sem filme. As 77 pessoas sem filme **nunca criaram sequer uma linha em
`videos`**. Isso significa duas coisas: (a) o pipeline de render está saudável
hoje; (b) a leitura da memória `gargalo-e-apertar-e-nao-sair` ("29 pessoas
despacharam e não receberam filme") **era de outra janela e não vale mais** —
o gargalo voltou a ser "não apertou".

E um segundo, para quem pegar: a tabela `viral_now_topics` tem **0 linhas em
toda a história**, apesar de um cron diário (`refresh-viral-now`, 05:15 UTC).
Não quebra nada — a rota que serve lê de `lib/viralTopics`, não do banco — mas
é um cron que roda todo dia para não escrever nada.

### ⏳ PROVA DE DEPLOY DA #20 — AINDA ABERTA, E O ZERO É POR AUSÊNCIA

`video_ready_email_sent` com o campo `publish_pack`: **0 de 19 nas últimas 8h**.
Não é falha: o **último e-mail de filme pronto saiu às 13:35 UTC**, antes do
deploy do `8162695a`. O cron roda aos :10 e :40 mas só envia quando existe
filme concluído na janela de 30min-24h ainda não avisado — e não houve filme
novo desde então. A primeira linha com o campo fecha a questão.

