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


---

## ### #19d — 12:45 BRT — A CARTA DA TEMPORADA SAIU. 11 pessoas, 11 temporadas escritas.

Primeiro disparo real, **2026-09-06 15:45:50 UTC**, automático pelo cron.

| | |
|---|---|
| Cartas enviadas | **11** |
| Temporadas escritas (Ep2–Ep6) | **11** |
| Por fonte | taaft **5** · chatgpt **5** · nav **1** |
| Saldo das pessoas | 17 a 27 créditos |
| Custo do episódio | 5 (todas em Kineo 1) |
| Episódios que o saldo delas paga | **3 a 5** |
| Custo do lote para a casa | ~11 × US$ 0,0003 ≈ **US$ 0,003** |

Alguns dos episódios 2 que saíram, escritos a partir do filme **que cada
pessoa fez**: *"The Mystery of Singing Sand Dunes"*, *"The Hidden Languages of
Nigeria"*, *"How a 9-Year-Old Invented an Eco-Friendly Rocket"*, *"Das
Abenteuer der verschwundenen Kappe"*, *"O poder do toque: como a pele sente
amor"*. O modelo escreveu **no idioma do tema de cada um** — alemão e português
apareceram sozinhos, como o prompt pede.

### A CONTABILIDADE DAS QUE NÃO SAÍRAM (22 elegíveis − 11 = 11)

Não arredondei para o meu lado. Fui atrás das 11:

- **8 foram retidas pela supressão de 24h** — receberam outra carta de ciclo de
  vida hoje. É a trava funcionando exatamente como desenhada, e elas **não
  foram carimbadas**: voltam ao lote das **16:45 BRT** ou de amanhã.
- **3 ficaram sem temporada** — ou a semente do filme não gera prompt
  utilizável, ou o modelo não devolveu cinco episódios únicos. Também **não
  foram carimbadas** (regra do #19: sem temporada não sai carta, e a pessoa
  continua elegível). Volta no próximo lote.

Ou seja: **nenhuma das 11 foi perdida**. As duas travas que as seguraram são as
que impedem carta duplicada e carta vazia.

### O QUE MEDIR AGORA

`season_letter_emailed_v1` (11 pessoas nomeadas no banco) →
`episode_link_clicked` → linha em `videos` das **mesmas** pessoas em 24h →
`payment_success`. Denominador é gente, não evento. **11 é uma amostra
pequena** e não vai provar nada sozinha hoje — o segundo lote sai às 16:45.

---

## ### #20b — 12:37 BRT — retratação: o pacote punha crédito da casa até no filme de quem PAGA

Encontrei isto lendo `lib/videoDescription.ts` **depois** de a #20 estar no ar —
e antes de ela alcançar uma única pessoa (`publish_pack_written` estava em 0).

**A casa já resolve isto e resolve ao contrário do que eu fiz:**
`buildBrandedYouTubeDescription` só acrescenta `KINEO_CREDIT_LINE` quando
`isFreePlan` é verdadeiro. Quem assina compra, entre outras coisas, **não ter
de anunciar a ferramenta** — e a página de preços promete "watermark-free".

Minha primeira versão fazia duas coisas erradas de uma vez:
1. creditava **todo mundo**, desfazendo pelas costas uma decisão deliberada;
2. inventava um texto de marca próprio, criando uma **segunda régua** de como a
   Kineo se apresenta.

**Consertado:** a linha creditada agora é a **canônica da casa** e vem de quem
chama; o crédito só entra no plano gratuito; e **fail-closed no sentido do
cliente** — sem informação de plano, o pacote sai limpo. Dos dois erros
possíveis, "deixei de anunciar" é o único reversível.

O plano vem de `isSubscriberProfile(prof)`, o **mesmo** predicado que o rodapé
daquele e-mail já usa. Não redigitei nenhum.

### UM DETALHE DE ENGENHARIA QUE VALE O REGISTRO

A primeira tentativa de conserto **importava** `KINEO_CREDIT_LINE` dentro de
`lib/publishPack.ts` — e **quebrou o guardião**, que executa esse arquivo
direto com o type-stripping do Node (o Node não resolve o alias `@/` do
tsconfig, e sem extensão não resolve nem o relativo). A dependência foi
**invertida**: o módulo continua **sem import nenhum** e recebe a linha de quem
chama. A régua continua uma só, e o módulo continua executável num teste.

**SHA `1f74e9e6`.** Guardião 38 → **44**.

---

## ### CORREÇÃO DE ALCANCE DA #20 — EU LIGUEI O PACOTE ONDE QUASE NINGUÉM ESTÁ

Medindo para provar o deploy, descobri que errei o alvo:

| e-mail | evento | 7 dias | pessoas |
|---|---|---|---|
| instantâneo, quando o render termina (`compose/status`) | `video_ready_email_sent` | **155** | **104** |
| de resgate, para quem fechou a aba (`cron/send-video-ready`) | `video_ready_nudge_sent` | **4** | **4** |

**Eu liguei o pacote no segundo.** Ele alcança **4 pessoas por semana**; o
primeiro alcança **104**. É a classe de erro da memória
`contrato-de-servidor-sem-chamador`: a peça funciona e está pendurada onde não
há gente.

**Por que eu não corrigi ainda, e é uma decisão, não esquecimento:** o e-mail
de alto alcance é enviado **inline, com `await`, dentro do
`/api/compose/status`** — a rota que o cliente fica *pollando* enquanto o filme
renderiza. Pendurar ali uma chamada de modelo de até 12s bloqueia um poll e
pode fazer a tela da pessoa parecer travada **no exato minuto em que o filme
fica pronto**. Trocar um risco de UX no pico de alegria por um ganho de
alcance exige um desenho diferente (escrever o pacote **antes**, quando o
render é despachado, e o e-mail só **ler** o que já está gravado — que é
exatamente para isso que o modo `escrever: false` existe).

Fica como a **primeira jogada da próxima rotação**, com o desenho já escrito.

---

## ### #22 — 12:52 BRT — a porta do pacote para a TELA, que é onde estão as 104

O parágrafo acima explica o erro de alcance; esta é a correção que **respeita a
divisão de pistas** em vez de atropelá-la.

Em vez de arriscar até 12s de modelo dentro do poll de render (a tela pareceria
travada no minuto em que o filme fica pronto), entreguei o **contrato**:
`GET /api/publish-pack` só lê, com **custo zero garantido**; `POST` escreve uma
vez e guarda. Ausência é `200 pack:null`, nunca 404 — a tela simplesmente não
mostra a caixa.

A montagem é **uma linha** do lado do Codex, e o PEDIDO já foi escrito com o
contrato inteiro, o evento sugerido (`publish_pack_copied`) e a regra que a
tela **não pode** violar: o crédito só existe no plano gratuito, e a resposta
traz `hasCredit` justamente para que a tela **não deduza o plano sozinha**.

**SHA `557f68e2`. EM PRODUÇÃO, provado no SHA:** `/api/publish-pack` foi
**404 → 401** com o controle irmão inexistente em **404**.

Guardião do pacote: 44 → **53** verificações.


---

## ### #23 — 13:05 BRT — o plano vira "o resto da sua temporada" para quem ficou SEM saldo

### PRESS RELEASE

1. A carta que fala com quem **acabou o crédito** dizia "os planos estão aqui"
   — uma unidade que ninguém sente.
2. Agora ela mostra os **episódios 3 a 6** que a casa escreveu a partir do
   filme que **aquela pessoa** fez, e o plano passa a ser o que **destrava**
   aquilo.
3. Junto com a #19, as duas metades de quem parou no filme 1 ficam cobertas:
   quem **tem** saldo recebe "a temporada cabe no seu saldo"; quem **não tem**
   recebe "a temporada existe, e é isso que o plano compra".
4. O carimbo cruzado garante que ninguém recebe as duas.
5. **Preço público: intocado.** Nenhum valor, plano, cupom ou promessa nasce
   aqui — é moldura, que foi exatamente o que o fundador pediu (B3).

### #23b — E O NÚMERO QUE APARECEU QUANDO FUI MEDIR: 11 → 43

O PEDIDOS da #19b pedia "medir antes de mexer em campanha viva". Medi, nesta
rota, com a coorte real:

| | pessoas |
|---|---|
| coorte antes dos carimbos | 81 |
| elegíveis com `raw[c] != null` (como estava) | **11** |
| elegíveis com `isRealSendStamp` (como ficou) | **43** |

**32 pessoas que nunca receberam carta nenhuma** estavam fora porque
`activation_nudge_sent_at` carrega `1970-01-01` — o carimbo de **pulo**, gravado
quando um job **pula** alguém, e o motivo mais comum do pulo é *"a pessoa já
fez um vídeo"*, que é a **definição** desta coorte.

Apliquei **só nesta rota**. `send-checkout-recovery` continua como está, com o
número dela ainda por medir — está no PEDIDOS.

**Disparo extra hoje:** `0 11,15 * * *` → `0 11,15,20 * * *` UTC. O lote das
15:00 saiu **antes** do #23, então sem essa linha a temporada na carta só
apareceria amanhã. O carimbo vitalício garante que ninguém recebe duas vezes —
o slot novo só processa a fila mais cedo.

### #23c — O RISCO QUE O #23b CRIOU, E QUE EU FECHEI NO MESMO CICLO

Ao passar de 11 para 43 elegíveis, a carta passa a escrever a temporada de até
**30 pessoas numa execução** com `maxDuration = 300`. Trinta chamadas de 25s
seriam **750s**: o cron morreria no meio, e quem ficasse para trás não seria
carimbado nem servido — desperdício de lote **sem sintoma visível**.

`garantirTemporada` ganhou `timeoutMs` (padrão 25s, intacto para
`/api/season`, onde há alguém esperando na tela). As duas cartas em lote passam
**10s**.

### GUARDIÃO ALHEIO: ATUALIZADO, NÃO AFROUXADO

A mudança de assinatura quebrou 3 verificações de um guardião que já existia, e
a do carimbo quebrou 1 de outro. **Não relaxei nenhuma:**

- as 3 continuam exigindo o episódio **na mesma posição e com o mesmo tipo** —
  só passaram a admitir o argumento novo depois dele — e ganharam **5 travas
  novas** (37 → 40);
- a do carimbo ficou **mais dura**: antes exigia literalmente `raw[c] != null`;
  agora exige que a época **não** exclua, que data ilegível **exclua**, e que o
  piso venha da lib da casa em vez de ser redigitado (58 → 61).

**SHAs `1ef575ff` + `f0fea5ae` + `c5a6a56e`.**

Guardiões do ciclo, somados: **43 + 60 + 61 + 40 + 53 + 28 + 17 = 302
verificações verdes**, `tsc` limpo na árvore combinada com o lote do Codex.

### PRÓXIMOS DISPAROS AUTOMÁTICOS DE HOJE (dentro da janela, para dar tempo de medir)

- **16:45 BRT** (19:45 UTC) — carta da temporada, lote 2 (as 8 retidas pela
  supressão de 24h + as 3 sem temporada + quem entrar).
- **17:00 BRT** (20:00 UTC) — carta da parede, agora com **43 elegíveis** e com
  o resto da temporada dentro.

---

## ### #19e e #24 — 13:30 BRT — as duas cartas de série mandavam quem JÁ TEM CONTA para o formulário de CRIAR CONTA

Isto saiu de uma sonda que eu fiz **depois** de as cartas já terem saído — e é
o achado mais direto do dia em termos de dinheiro perdido por clique.

### A SONDA, LADO A LADO, EM PRODUÇÃO

```
link das cartas    →  307  /signup?redirect=…    (CRIAR CONTA)
/api/episode-link  →  302  /login?redirect=…     (ENTRAR, tema preservado)
```

A carta é endereçada a alguém **cadastrado, com filme entregue**. Ela chega no
inbox e o botão leva a pessoa a um formulário de **criar conta**.

**E não é caso de borda — é o caminho da maioria.** O clique de inbox chega
**sem cookie de sessão por construção**: o Gmail do telefone abre em webview
própria, o link é aberto em outro aparelho, a aba é anônima. Quem tem sessão
viva é quem já está dentro do app, e essa pessoa não veio pelo e-mail.

### E A CASA JÁ TINHA CONSERTADO ISSO — EM 05/09

`/api/episode-link` existe exatamente para isso: **conta o clique** (o degrau
que nunca existiu entre "enviado" e "aterrissou") e manda para **`/login`** com
o destino inteiro preservado. Quatro famílias de e-mail já passaram a usar.

- **A carta da temporada (#19)** não usava porque **eu** a escrevi hoje com
  `composerUrl`. As **11 primeiras cartas foram para `/signup`**. Corrigido em
  `ee01b81e`.
- **A carta da parede** também não usava — e ficou de fora do conserto pela
  **segunda vez**: o próprio cabeçalho dela registra que já tinha ficado de
  fora do conserto anterior do `composerUrl`. **18 cartas hoje** foram por ali.
  Corrigido em `6eed4b8b`.

### O QUE ISSO DIZ SOBRE OS MEUS GUARDIÕES

O guardião da carta da temporada deu **60/60 com o defeito dentro**. Nenhuma
das 60 verificações olhava **para onde o clique ia** — todas olhavam o que a
carta *diz*, nenhuma o que ela *faz*. Guardião que não olha o destino não
guarda o clique.

Duas travas novas em cada guardião, e a falsificação confirma: voltar ao link
direto deixa vermelho. (carta da temporada 60 → **62**; carta da parede 40 →
**41**.)

### O QUE MEDIR AGORA

`episode_link_clicked` passa a existir para estas duas campanhas. Antes de
hoje, essa métrica tinha **1 linha em toda a história** e ela era uma sonda
minha. Agora as duas maiores cartas de série da casa passam por lá — então o
zero, se vier, vai ser um zero **medido**, não um zero por falta de contador.

---

## 🔎 O ACHADO ESTRATÉGICO DO DIA — 40% DO TRÁFEGO NUNCA PRODUZIU UM DÓLAR, E NÃO É POR FALTA DE INTENÇÃO

Isto não é uma entrega de código. É o número que eu recomendo que você olhe
antes de decidir o que a próxima semana faz.

### OS 6 PAGANTES DE 30 DIAS, UM POR UM

| pessoa | fonte | horas até pagar | filmes antes | plano |
|---|---|---|---|---|
| d51f2aac | **chatgpt** | **0,5 h** | **0** | starter |
| 62aa2fcc | **chatgpt** | 24 h | 1 | pro |
| e7f1a87c | **chatgpt** | 43 h | 5 | pro |
| 8164e50a | homepage | 247 h | 1 | basic |
| 7d4baa98 | taaft | 400 h | 1 | starter |
| 75f76a4c | sticky_cta | 7 h | **0** | basic |

Os **três pagantes mais recentes são todos do chatgpt**, e estão ficando mais
rápidos: 43 h → 24 h → **meia hora**. Dois dos seis pagaram com **zero filmes**
— compraram a promessa, não a demonstração.

### O FUNIL POR FONTE (30 dias, contas externas)

| fonte | cadastros | fez 1 filme | fez 2 | viu preços | **chegou ao checkout** | **pagou** |
|---|---|---|---|---|---|---|
| **chatgpt** | 332 | 204 | 60 | 60 | **40** | **3** |
| **taaft** | **296** | 163 | 47 | 38 | **41** | **0** |
| homepage | 42 | 35 | 5 | 6 | 2 | 1 |

### E AQUI ESTÁ A PARTE QUE ME FEZ PARAR

**O TAAFT chega ao checkout MAIS que o ChatGPT — 41 contra 40 — e paga zero.**

Isso derruba a explicação confortável ("é público errado, gente que só quer
ferramenta grátis"). Gente que só quer grátis **não abre o checkout 41 vezes**.

Fui mais fundo para tentar derrubar o próprio achado:

- **Escolhem os mesmos planos.** basic e starter dominam nos dois.
- **Insistem igual.** TAAFT: 26 pessoas → 56 tentativas no basic. ChatGPT: 20
  pessoas → 44 tentativas. ~2,2 tentativas por pessoa nos dois lados.
- **Fazem filme.** 163 dos 296 entregaram pelo menos um.

Ou seja: mesma intenção, mesmo plano, mesma insistência, mesma ativação —
**e um lado converte 7,5% dos que chegam ao checkout e o outro converte 0%.**

### ⚠️ O QUE ESTE NÚMERO **NÃO** PROVA

Com **6 pagantes no total**, quase nada aqui é estatisticamente conclusivo.
0 de 41 contra 3 de 40 dá algo em torno de p ≈ 0,24 — **não é significativo**.
Eu não vou dizer que está provado que o TAAFT está quebrado.

O que **é** fato, sem estatística nenhuma: **296 pessoas, 30 dias, 41
checkouts, R$ 0,00.** É a maior coisa inexplicada do negócio hoje, e ela vem de
~40% de todo o tráfego.

### POR QUE ISSO MUDA A PRIORIDADE

A meta de 10-15 pagantes/dia é uma meta de **aquisição** — a casa recebe ~30
cadastros/dia e converte 0,87%. Mas antes de comprar tráfego novo, vale saber
que **quase metade do tráfego atual não converte de jeito nenhum**. Otimizar
conversão em cima dele é empurrar corda.

### O QUE SÓ VOCÊ PODE FAZER (a resposta não está no nosso banco)

O CLAUDE.md já registra que **a verdade sobre recusa de pagamento só existe no
painel da Stripe** — `customer_country` vem null em 100% dos nossos eventos,
inclusive nos que pagaram. Então a pergunta "por que 41 pessoas do TAAFT
abriram o checkout e nenhuma pagou" tem uma única fonte: **o painel da Stripe,
filtrado por sessões dos últimos 30 dias que não completaram**.

Duas hipóteses testáveis lá, e as duas são decisão sua:
1. **Geografia / meio de pagamento** — se as recusas se concentram numa região,
   é trilho de pagamento, não preço.
2. **O que o listing do TAAFT promete** — o CLAUDE.md registra que ele está
   desatualizado (fala em trial de 40 créditos e "from $9.90/mo"). Se a pessoa
   chega esperando uma coisa e vê outra na página de preços, ela abre o
   checkout e desiste — exatamente o padrão de 2 tentativas por pessoa.

Eu **não mexi em preço, plano nem no listing** — é decisão sua, e está assim
registrado no CLAUDE.md.

---

## ### #26 e #26b — 13:20 BRT — a trava que impede dois e-mails no mesmo minuto não enxergava METADE das campanhas da casa

### PRESS RELEASE (o que muda para o cliente)

A partir de hoje, quem recebeu um e-mail nosso nas últimas 24 horas não recebe
um segundo — **de nenhuma campanha da casa**, não só das seis que a trava
enxergava. Antes desta entrega, sete campanhas de admin e cinco crons
carimbavam o envio num lugar que a trava nunca abria, e o resultado media-se
assim: **79 pares de e-mail para a mesma pessoa dentro de 30 minutos em 7 dias,
47 pessoas distintas, intervalo mínimo zero — o mesmo instante.** Uma pessoa
recebeu a carta da temporada às 15:45:50 e um outro e-mail às 15:50:12: **4
minutos e 22 segundos**. Isso não é um cliente irritado; é o domínio da casa
apanhando de filtro de spam com 1.798 pessoas na lista. E o pior par possível
já estava armado: o aviso da Stripe de que **o cartão vai ser cobrado** era
invisível para todo mundo — podia sair colado com um e-mail de venda.

### O QUE ESTAVA ERRADO (medido em produção, não deduzido)

`lib/lifecycle/suppression.ts` lia quatro fontes: colunas datadas de
`profiles`, `checkout_abandoned`, `trial_emails_log` e o ledger
`email_send_log`. **Nenhuma delas é `events`** — e carimbo em `events` é a
geração NOVA de carimbo, a que toda campanha de admin usa porque não exige
migração.

Varredura em produção (`name like '%emailed%' or '%_sent'`): **28 nomes de
evento** que significam "um e-mail saiu para esta pessoa". A trava não
conhecia nenhum.

| medida (janela de 24h, produção 06/09) | número |
|---|---|
| pessoas com e-mail registrado por evento | **215** |
| já visíveis pelas quatro fontes antigas | 182 |
| **novas — que a trava tratava como "nunca recebeu nada"** | **59** |

E os pares, que é o dano de verdade:

| janela | pares em ≤30 min | pessoas |
|---|---|---|
| 7 dias | **79** | **47** |
| só hoje (06/09, até 13:20) | **16** | **6** |

### O QUE MUDOU

- **`lib/lifecycle/emailEvents.ts` (NOVO)** — a lista canônica de **31**
  carimbos de e-mail que vivem em `events`. Ela existe porque `OTHER_CAMPAIGNS`
  estava **copiada à mão em três rotas e já divergente**: enquanto for cópia,
  campanha nova nasce invisível.
- **`lib/lifecycle/suppression.ts`** — quinta fonte, com leitura **paginada por
  `created_at`** e teto barulhento. Paginar não é zelo: PostgREST **trunca em
  1.000 linhas SEM ERRO** (é a mesma cegueira que fez o `/admin` mentir em
  28/08), e truncar aqui é **deixar de suprimir em silêncio**.
- **`scripts/test-cobertura-supressao-2026-09-04.mjs`** — o guardião de
  cobertura, atualizado. Ver o parágrafo seguinte, que é o achado bonito do dia.

**SHAs: `1fb64330` (#26) + `aaad46c4` (#26b). EM PRODUÇÃO — `origin/main =
aaad46c4`, fila vazia, `git ls-remote` confere.**

### A PROPRIEDADE QUE SEPARA ESTA FONTE DAS OUTRAS QUATRO: ELA FALHA **ABERTA**

O módulo inteiro é fail-closed por doutrina — se uma consulta falha, todo mundo
é suprimido. Está escrito no topo do arquivo: *"perder um e-mail é barato;
mandar e-mail repetido queima domínio"*.

**Esta fonte é a exceção, e é decisão, não esquecimento.** As quatro antigas
falham fechadas porque **sem elas a trava não existe**. Esta é aditiva: se a
consulta morrer, o comportamento degrada exatamente para o que estava em
produção ontem. Fechá-la junto transformaria um soluço de query numa **mordaça
de 24 horas sobre a base inteira** — e eu estaria fazendo isso **três horas
antes de dois lotes de e-mail**. Trocar um defeito conhecido por um risco pior
não é conserto. O sinal fica em `eventsDegraded`, separado de `degraded`, para
que ninguém confunda "a quinta fonte caiu" com "a trava fechou em cima de todo
mundo".

### O ACHADO QUE VEIO DE GRAÇA: UM CHECK QUE PREVIU A PRÓPRIA MORTE

O guardião de cobertura escrito em 04/09 tinha esta linha:

> `1.7 o modulo NAO le a tabela events` — *"se passar a ler events, os crons de
> STAMP em events viram visíveis e este inventário muda"*

Cumpriu-se na letra. Ao ligar a quinta fonte, a classificação `viaEvento`
esvaziou o inventário sem que **uma única rota de envio fosse tocada**:

| | 04/09 | **06/09** |
|---|---|---|
| rotas que enviam e ninguém vê | 19 | **7** |
| **crons ARMADOS e invisíveis** (a classe de risco mais alta do arquivo) | 5 | **ZERO** |

Um cron armado e invisível dispara sozinho, sem ninguém olhando, e nenhum outro
job sabe que ele mandou. Eram cinco. Agora são nenhum.

E o guardião pagou o próprio custo: ao rodá-lo, ele acusou **dois carimbos que
faltavam** na minha lista canônica —
- `trial_eve_notice_sent` (cron/send-trial-eve-notice);
- `card_trial_ending_emailed`, que **sai de dentro do webhook da Stripe** e diz
  *"seu cartão vai ser cobrado $X"*. É o e-mail mais sensível da casa para
  colidir com um nudge de venda no mesmo dia, e era invisível para todos.

O que **sobra** no inventário é uma classe só, e ela não se resolve lendo
tabela nenhuma: rota cujo único carimbo é **BOOLEAN**. Boolean carrega o "se",
nunca o "quando" — não dá para derivar 24h de um booleano. Fechar exige
migration. **Registrado, não feito.**

### TESTES

- `scripts/test-supressao-events-2026-09-06.mjs` — **43 verificações, verde.**
  Amarradas à variável que decide (`eventsDegraded`) e ao ramo que **não pode
  existir** (`closed(` dentro do bloco da quinta fonte), nunca a contagem de
  texto.
- **Falsificação por mutação, 6 mutantes, 6 vermelhos, controle verde:**
  fail-open→fail-closed · paginação removida · constante trocada por literal ·
  carimbo dominante removido da lista · evento de LEITURA colocado na lista ·
  retorno sem `eventsDegraded`.
- `scripts/test-cobertura-supressao-2026-09-04.mjs` — **estava vermelho antes
  desta entrega** (56 ok / 3 falhas, herdadas de rotações anteriores) e está
  **43 ok / 0 falhas** agora. Ele não foi afrouxado: 1.7 inverteu porque o fato
  que ele congelava mudou, e as 12 rotas saíram do inventário porque **passaram
  a ser visíveis de verdade**.
- `npx tsc --noEmit` verde — e **falsificado**: um `let eventsDegraded: number`
  deliberado fez o tsc acusar 3 erros, provando que ele estava mesmo rodando
  (junction de `node_modules` na worktree).
- Guardiões irmãos que tocam a supressão: ledger, carta da temporada, carta da
  parede (×2), checkout-recovery — **todos OK**.

### O ERRO QUE EU COMETI DENTRO DESTA ROTAÇÃO (registro)

A primeira versão do meu guardião ficou **vermelha pelo motivo errado**. Eu
recortei o "bloco da quinta fonte" ancorando no texto
`KINEO-SUPPRESSION-EVENTS-2026-09-06` — que aparece **duas vezes**: no bloco e
na **menção a ele**, lá em cima, na interface. A fatia engoliu o laço inteiro
das quatro fontes antigas, com os quatro `return closed(` dentro, e acusou
fail-closed onde não havia. É a memória `falsificar-mutacao-commitar-antes` em
ação: **regex solto casa com o próprio comentário.** A âncora virou uma linha
de **código** (`let eventsDegraded = false`), e o guardião ganhou um check a
mais provando que o bloco vem depois das quatro fontes antigas.

### RISCO, DITO SEM MAQUIAGEM

Até **59 pessoas** podem ter o próximo e-mail **adiado por 24h**. Nenhuma perde
e-mail para sempre — todo job reconsidera a coorte na execução seguinte. Em
troca, ninguém mais recebe dois e-mails da casa no mesmo minuto. Com 6 pagantes
em 30 dias e 1.798 pessoas na lista, o ativo a proteger é a **entregabilidade**,
não o volume de disparo.

### COMO MEDIR (e o que eu **não** posso provar hoje)

⚠️ **Esta entrega não cria rota nova, então não existe sonda HTTP que a prove.**
O `404→401 com controle` que eu usei nas rotações anteriores não se aplica
aqui, e eu não vou fingir que aplica. O que está provado é a **subida**
(`origin/main = aaad46c4`, fila 0, home 200, controle 404 = 404). A prova de
**comportamento** é a de baixo, e ela chega hoje mesmo:

- **Placar a bater:** hoje, até 13:20, **16 pares / 6 pessoas**. Sete dias:
  **79 pares / 47 pessoas**. Repetir a mesma consulta amanhã: se a quinta fonte
  está viva, os pares **nascidos depois de 16:30 UTC** têm de ser zero.
- **O vazamento exato que isto fecha, já medido:** no lote da carta da parede
  das 11:00 UTC, **1 das 18 pessoas** já tinha outro e-mail de ciclo de vida
  nas 24h anteriores. Sob o código novo, essa pessoa não teria entrado.
  ⚠️ Ressalva honesta: os lotes de hoje são pequenos (18 e 1), então **ausência
  de par nos próximos lotes é evidência fraca**. O número que decide é o de
  7 dias, medido amanhã.

### PRAXE — PLACAR E CHECAGEM ZERO (13:30 BRT)

**Placar desde o marco (2026-09-06 14:00 UTC), domingo:** 3 cadastros ·
3 pessoas gerando · **0 `checkout_started`** · **0 `payment_success`**.
Tráfego de domingo à tarde, e é o que é.

**Checagem zero — limpa:**
- cadastro sem crédito nas 24h: **2 — e nenhum é órfão.** Os dois receberam os
  25 do trial (`trial_credits_granted=25`, evento presente) e **gastaram**:
  `e8e8c415` fez **3 filmes** hoje, `16aa454a` fez 1. Zero é saldo consumido,
  não falha de concessão.
- render preso >45 min: **0** · `next_episode_failed`: **0** ·
  `generation_stage_error`: 4 (dentro do normal do dia).

**E uma leitura que quase virou uma mentira boa.** `episode_link_clicked`
marcou **5 hoje** — parece que a porta nova pegou. Abrindo linha a linha:

| hora UTC | origem | bot? | é gente? |
|---|---|---|---|
| 09:15 | `probe_claude_r14` | sim | não — sonda minha |
| 09:16 | `unknown`, deslogado | não | ambíguo, sem pessoa |
| **13:31** | **`video_ready_email`, logado, pessoa `53cef8ef`** | **não** | **SIM** |
| 16:09 | `lifecycle_loss_email` | **sim** | não |
| 16:12 | **`season_letter`** | **sim** | não |

**Um clique humano hoje**, e ele veio do e-mail de filme pronto, não da carta
da temporada. O clique da carta da temporada das 16:12 é **scanner de inbox**
(`bot:true`), não pessoa. Quem contar "a carta da temporada teve clique" está
contando um robô. A carta da temporada continua com **zero cliques humanos**
desde as 15:45.

### PRÓXIMA JOGADA

1. **A pessoa `e8e8c415` é o retrato do funil de hoje:** cadastrou-se às 11:27
   UTC, fez **três filmes** em duas horas e está em **zero crédito**. É a
   pessoa mais quente da casa neste momento, e o que ela vê é uma parede. A
   carta da parede sai de hora em hora — vale conferir na próxima rotação se
   ela entrou no lote e, se não entrou, **por qual filtro**.
2. **O par mais perigoso que este commit desarmou merece virar campanha, não
   só trava:** `card_trial_ending_emailed` é o único e-mail da casa que chega
   quando a pessoa está prestes a ser **cobrada**. É o momento de maior atenção
   do ciclo inteiro e hoje ele é puramente defensivo ("cancele em um clique").
   Não custa nada acrescentar uma linha dizendo **o que vem no próximo mês** —
   a temporada dela, pelos títulos que a casa já escreveu. Mesmo e-mail, mesmo
   disparo, zero custo novo.

---

## CHECKPOINT — 13:40 BRT (16:40 UTC) — A TRAVA DE 24h SILENCIOU 24 DAS 40 PESSOAS QUE A CARTA DA PAREDE EXISTE PARA ALCANÇAR

**Checkpoint, não rotação.** Nenhuma linha de produto foi escrita. O que segue é
verificação, praxe e um achado que a próxima rotação (14:08) deve abrir.

### 1. A SUBIDA DA #26/#26b ESTÁ PROVADA — O COMPORTAMENTO **NÃO**

`git ls-remote origin main` = `813ed26d` · fila `origin/main..entrega-atual` = **0** ·
home **200** · controle **404**. A subida está de pé.

⚠️ **O comportamento não foi exercitado uma única vez, e o número que eu poderia
publicar aqui é vazio.** Pares de e-mail em 30 min nascidos depois de 16:30 UTC:
**zero** — mas o **último envio da casa foi 16:25 UTC**, cinco minutos *antes* do
deploy. Zero pares sobre zero oportunidades não prova nada; é a memória
`zero-falhas-sem-denominador` inteira. A primeira oportunidade real é o cron de
`trial-lifecycle-emails`, que roda aos **:25** — ou seja, **17:25 UTC**. Antes
disso ninguém pode dizer que a quinta fonte funciona.
Placar do dia, para comparação amanhã: **8 pares / 4 pessoas** (a rotação
anterior leu 16/6 às 13:20 com uma lista de nomes maior; a minha usa a lista
canônica de `LIFECYCLE_EMAIL_EVENT_NAMES` — denominadores diferentes, registro
os dois para ninguém comparar maçã com laranja).

### 2. O ACHADO: 40 ELEGÍVEIS, **1** ENVIADA — E A MAIS QUENTE DA CASA ESTÁ ENTRE AS BARRADAS

A rotação anterior deixou uma pergunta: *a pessoa `e8e8c415` entrou no lote da
carta da parede e, se não entrou, por qual filtro?*

**Não entrou. E não foi por defeito da rota — foi pela trava que subiu hoje.**

Retrato dela: cadastro **11:27 UTC**, fonte **chatgpt**, **3 filmes** em 34 min
(11:37 · 11:49 · 12:01), **`pricing_view` às 11:55**, saldo **0**, trial
`downgraded`, **zero `checkout_started`**. É uma pessoa que fez três filmes,
foi olhar o preço e bateu na parede — o perfil exato que a carta da parede
existe para pegar.

Replicando **o predicado da própria rota** em SQL contra as linhas reais
(memória `provar-leitura-sem-trafego`), pessoa a pessoa:

| | |
|---|---|
| passam no predicado da rota **agora** | **40** (24 do chatgpt) |
| barradas pela supressão de 24h | **24** |
| **sobram para o próximo lote** | **16** (10 do chatgpt) |
| `e8e8c415` | **elegível pelo predicado · SUPRIMIDA pela trava** |

E o lote das **15:00 UTC** enviou **uma** pessoa (`c1d0ad6a`).

**A cadeia causal, sem suposição:**
1. A carta da parede **não sai de hora em hora** — `vercel.json` diz
   `"0 11,15,20 * * *"`. São **três lotes por dia**. A frase "sai de hora em
   hora" está escrita mais acima neste diário e **está errada**; corrijo aqui.
   `e8e8c415` bateu na parede às 12:01 e a próxima janela era 15:00.
2. Às 13:25 ela recebeu um `trial_lifecycle_email_sent` — o cron genérico que
   roda aos **:25 de toda hora** e que hoje tocou **103 pessoas**.
3. Esse carimbo agora está em `LIFECYCLE_EMAIL_EVENT_NAMES`. Resultado: o
   e-mail **genérico e horário** cala por 24h a carta **específica**, que
   nomeia o episódio 2 do filme que a pessoa acabou de fazer.

**A trava não está quebrada — a ORDEM DE PRECEDÊNCIA está.** Ela protege
entregabilidade, que é o ativo certo a proteger com 1.798 pessoas na lista. Mas
com 3 janelas/dia de um lado e 24 disparos/dia do outro, quem sempre chega
primeiro é o e-mail de menor valor. A #26 não criou esse desequilíbrio; ela o
tornou **visível e eficaz** — que era exatamente o objetivo dela.

⚠️ **Ressalva honesta:** as 24 barradas são a foto de **agora**. A trava é
móvel: quem foi tocado às 13:25 destrava às 13:25 de amanhã, e o lote das
**20:00 UTC** vai encontrar um número diferente — provavelmente melhor, porque
o cron das :25 não pega a mesma pessoa toda hora. Ninguém perde e-mail para
sempre. O que se perde é a **hora quente**: `e8e8c415` estava em `pricing_view`
às 11:55 e vai receber a carta da parede, na melhor das hipóteses, amanhã.

### 3. PRAXE — PLACAR E CHECAGEM ZERO (16:40 UTC)

**Placar desde o marco (2026-09-06 14:00 UTC):** 3 cadastros · 2 pessoas com
filme entregue · 2 filmes · **0 `checkout_started`** · **0 `payment_success`**.
Nas 24h: 33 cadastros, **0 pagamentos**. Domingo, e é o que é.
*(Denominador: linhas em `videos`. A leitura de 13:20 dizia "3 pessoas gerando"
— contava outra coisa. Registro a minha régua para a próxima sessão não achar
que o número caiu.)*

**Checagem zero — limpa:** cadastro sem crédito órfão nas 24h **0** (33
cadastros, todos com `trial_credits_granted`) · render preso >45 min **0** ·
`next_episode_failed` **0** · `generation_stage_error` **4** (normal do dia).

**Cliques — nenhum humano desde 16:00 UTC.** Três `episode_link_clicked`
(16:09, 16:12, 16:34), **os três com `bot:true`**. O único clique humano do dia
continua sendo o das 13:31, vindo do e-mail de filme pronto. A carta da
temporada segue com **zero cliques humanos** desde as 15:45.
*(Correção de detalhe: o clique das 16:12 carrega `source=lifecycle_loss_email`,
não `season_letter` como ficou registrado acima. Bot nos dois casos — não muda
a conclusão, muda a atribuição.)*

### 4. O QUE A ROTAÇÃO DAS 14:08 DEVE ABRIR

**Precedência entre cartas, não mais uma carta.** A casa tem 5 fontes de
supressão e nenhuma noção de que uma carta vale mais que a outra. O conserto
barato e mensurável: a carta da parede e a da temporada passam a **ignorar a
supressão quando o carimbo que barra é `trial_lifecycle_email_sent` e a pessoa
está com saldo 0 há menos de 6h** — a janela quente. Alternativa mais simples e
talvez melhor: **abrir mais janelas** no `vercel.json` (11,15,20 → de 2 em 2h),
que não mexe em trava nenhuma e reduz a distância entre bater na parede e
receber a carta de 3h para 1h. Decidir com o número das 20:00 UTC na mão, não
antes.

**Não fazer sem medir:** afrouxar a trava de forma geral. Ela subiu há 10
minutos e ainda não teve uma única oportunidade de agir.

---

### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada.** Nenhuma ação sua neste checkpoint — a fila está vazia, a #26/#26b
   já está em produção e o próximo lote de e-mail sai sozinho às 17:25 e 20:00 UTC.

### 📋 O QUE ACONTECEU
Conferi o que subiu às 13:38 e fui atrás da pergunta que a rotação anterior
deixou: a pessoa mais quente do dia — 3 filmes, olhou o preço, ficou sem saldo —
recebeu a carta da parede? **Não.** Ela é elegível, mas a trava anti-spam que
subiu hoje a calou por 24h, porque um e-mail genérico que sai de hora em hora
chegou primeiro. Medindo pessoa a pessoa: **40 pessoas estão prontas para essa
carta e 24 estão caladas pela mesma razão** — o lote das 15:00 enviou uma só. A
trava está certa e protege o domínio; o que está errado é a **ordem**: a carta
que nomeia o próximo episódio da pessoa perde para o aviso automático. Também
corrigi duas coisas escritas antes neste diário: a carta da parede sai **3× por
dia**, não de hora em hora, e o "zero pares de e-mail repetido" que provaria a
entrega das 13:38 **não prova nada ainda**, porque nenhum e-mail saiu depois
dela. A primeira prova real chega às 17:25 UTC. Checagem zero limpa; zero
pagamentos hoje; um único clique humano no dia, e ele veio do e-mail de filme
pronto.

---

### #27 — 14:08→15:08 BRT — O DONO GANHA O BOTÃO DE PUBLICAR O FILME DELE

#### PRESS RELEASE (6 linhas, escrito ANTES de codar)

> Até hoje, quem faz um filme na Kineo não tem como **mostrá-lo a ninguém**:
> baixa um MP4 e manda por anexo. A partir de agora, o e-mail de filme pronto
> traz um botão — *"Want a link instead of a file?"* — que cria, em um clique,
> uma **página pública daquele filme**, com player, título e a assinatura
> "made with usekineo.com". Um segundo link, no mesmo e-mail, devolve o filme
> para privado. O cliente ganha um link para mandar no WhatsApp, postar no
> perfil ou pôr na bio; a casa ganha, em cada filme publicado, um anúncio que
> ela não precisou comprar. Nada fica público sem o dono clicar.

**Hipótese:** o gargalo do dia não é conversão, é aquisição (aritmética da #20:
32 cadastros/dia não viram 10 pagantes em porcentagem nenhuma). O ativo de
aquisição mais barato que a casa tem são os **225 filmes entregues em 7 dias** —
e nenhum deles pode ser visto por um estranho.
**Métrica:** `video_published_v1` (e `video_unpublished_v1` como contrapeso
honesto: publicação que a pessoa desfaz é sinal de que a copy enganou).
**Parada:** se `video_unpublished_v1` passar de 20% de `video_published_v1`, a
frase do e-mail está prometendo errado e volta para a prancheta.

#### O QUE ESTAVA ERRADO (medido, não suposto)

`select count(*) from videos` = **1.638**. Linhas com página pública: **ZERO**.
E não por defeito — `lib/publicSurfacePolicy.ts` desliga a superfície pública
desde 27/08, **de propósito**, com a justificativa escrita no próprio arquivo:
o esquema não tem campo de consentimento *"versionado e auditável"*. A decisão
estava certa. O que ninguém tinha medido é o **preço** dela:

| | |
|---|---|
| filmes entregues em 7 dias | **225** (42 nas últimas 24h) |
| filmes que um estranho consegue ver | **0** |
| vezes que o e-mail de filme pronto diz "private by default" | **2** |

E a ironia que fechou o caso: o **pacote de publicação** (#20, hoje de manhã) já
escreve título, descrição e comentário fixado **com "made with usekineo.com"
dentro**. A casa escreve o anúncio e não dá ao cliente a parede onde pendurá-lo.

#### O QUE MUDOU

**SHA `cd765601` — EM PRODUÇÃO** (`git ls-remote origin main` = cd765601,
`rev-list origin/main..entrega-atual` = 0).

- **migration** — `videos.published_at` + `videos.published_via` + índice
  parcial. Aplicada: 1.638 linhas, **0 publicadas**. O padrão é privado por
  construção, não por regra de código.
- **`lib/videoShareLink.ts`** (novo) — token HMAC do id do filme. Sem segredo
  no ambiente devolve `null` e ninguém publica nada.
- **`app/api/video/publish/route.ts`** (novo) — publica UM filme, com token,
  só se `completed` e com URL de reprodução, idempotente. `&undo=1` despublica
  e **não** exige filme saudável: tirar do ar nunca pode ter porteiro.
- **`lib/publicVideos.ts`** — a trava global continua `false`. Ela ganhou um
  ramo: linha COM carimbo entra; sem carimbo, `missing`, byte a byte como
  antes. A allow-list de colunas públicas **não cresceu** (consulta separada).
- **`app/api/cron/send-video-ready/route.ts`** — o bloco no e-mail.

**Por que o link é assinado e não pede login:** a lição do `/api/episode-link`
(05/09). Clique de inbox **estruturalmente não tem sessão** — Gmail do telefone
abre em webview própria, o link chega em outro aparelho, a aba é anônima. Uma
rota com login mandaria o dono para um formulário em vez de publicar o filme
dele. Foi esse exato defeito que matou as 11 primeiras cartas de hoje (#19e).

**O que NÃO subiu, de propósito:** o sitemap e a indexação continuam atrás da
trava global. Link partilhável agora; entregar 1.638 páginas ao Google é outra
decisão (política de conteúdo em escala), e é do fundador.

#### PROVA EM PRODUÇÃO (sonda com controle 404)

| sonda | resposta |
|---|---|
| `/api/video/publish` | **302** → `/history?share=invalid` |
| `/api/video/publish-nao-existe` (controle) | **404** |
| `/api/video/publish?v=<uuid>&t=lixo` | **302** → `share=invalid` |
| `/v/19c162ed…` (filme REAL, `completed`, sem consentimento) | **404** |
| home | **200** |

A última linha é a que importa: um filme entregue de verdade **continua
invisível**. A trava de privacidade de 27/08 não foi afrouxada.

**Guardião:** `scripts/test-video-share-consent.mjs`, 30 verificações de
**ordem** (não de presença). Falsificado por mutação, com o commit feito antes:
trava global virada para `true` ✓ morto · gate aprovando linha sem carimbo ✓
morto · verificação de token removida ✓ morto · publicar filme não entregue ✓
morto · segredo curto aceito ✓ morto · bloco sumindo do e-mail ✓ morto.
**6 mutantes, 6 mortos.**

#### ⚠ O ERRO QUE EU MESMO ACABEI DE COMETER — E ELE TEM NOME

Liguei o botão no e-mail **errado**. Medido depois de publicar, 7 dias:

| e-mail de "filme pronto" | envios | pessoas |
|---|---|---|
| `video_ready_email_sent` (rota de status) | **158** | **107** |
| `stranded_ready_sent` | 42 | 27 |
| `stranded_fast_ready_sent` | 24 | 21 |
| **`video_ready_nudge_sent` ← onde eu liguei** | **4** | **4** |

O cron `send-video-ready` manda **1 por pessoa PARA SEMPRE**, e só para quem
nunca baixou: **4 pessoas em 7 dias**. O e-mail que 107 pessoas receberam sai
de `app/api/compose/status/[renderId]/route.ts`. É a **mesma forma de erro** da
#20 desta manhã ("liguei o pacote no e-mail de 4 pessoas/semana, não no de
104"). A peça está certa, correta e provada; o **alcance** dela hoje é
4/semana. Não vou maquiar: **a jogada só começa a valer na próxima rotação.**

#### PRAXE — PLACAR E CHECAGEM ZERO (17:1x UTC)

**Desde o marco (06/09 14:00 UTC):** 3 cadastros · 3 filmes · 3 pessoas com
filme · **0 `checkout_started`** · **0 `payment_success`** · 1 `pricing_view`.
**24h:** 32 cadastros · 9 pessoas em `pricing_view` · 2 em `checkout_started` ·
**0 pagamentos**. **7 dias: 2 pagamentos. 30 dias: 6.**

**Checagem zero — limpa:** cadastro sem crédito 0/32 · render preso >45min 0 ·
`next_episode_failed` 0 · `generation_stage_error` 4 (normal).

**E-mails da casa hoje:** carta da parede 19 · carta da temporada 11 · **porta
de volta do checkout 21** (11:30 UTC, a coorte mais quente da casa — gente com
link de recuperação da Stripe VIVO). Resultado até agora: **0 pagamentos**.

**Achado lateral, para não se perder:** 69 checkouts expirados em 30 dias, 54
com link de recuperação vivo. Recorte pessoa a pessoa: 21 receberam a carta ·
**20 têm link vivo, nunca pagaram, não estão em campanha nenhuma e não
receberam nada** · 11 estão barrados por outra campanha (todos de 17-22/08,
fora da janela de 14 dias da rota). Os 20 são o próximo lote óbvio — e o
motivo de eles terem ficado de fora **não está medido**.

#### PRÓXIMA JOGADA (a rotação das 15:08 abre por aqui)

1. **Levar o botão para o e-mail de 107 pessoas** —
   `app/api/compose/status/[renderId]/route.ts`. É a mesma dupla de linhas
   (`publishHref`/`unpublishHref`) já publicada e provada. Passa de 4 para ~107
   pessoas/semana. **15 minutos.**
2. **A caixa "Post it" na tela de filme pronto** — 130 pessoas viram
   `video_ready_viewed` em 7 dias, mais do que qualquer e-mail alcança. Isso é
   **PEDIDO ao Codex** (arquivo de tela), com o contrato pronto: rota, token,
   evento.
3. **Descobrir por que 20 pessoas com link vivo da Stripe ficaram de fora** do
   lote das 11:30 — é a coorte com maior intenção declarada da casa inteira.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada.** A entrega subiu sozinha (SHA `cd765601`), o deploy está provado em
   produção e nenhum filme de cliente ficou público — só ficará se o próprio
   dono clicar no botão do e-mail dele.

#### 📋 O QUE ACONTECEU
Descobri que a casa entrega ~42 filmes por dia e **nenhum deles pode ser
mostrado a ninguém**: a página pública de vídeo está desligada desde 27/08 por
uma razão boa (não existia consentimento no banco), e o efeito colateral é que
o cliente só consegue compartilhar mandando o arquivo por anexo. Em vez de
ligar a chave — o que publicaria 1.638 filmes de clientes sem eles pedirem —
construí **o consentimento que faltava**: um botão dentro do e-mail de filme
pronto que publica **um** filme, o dele, com carimbo de quem/quando/por onde, e
um segundo link que volta atrás. Está em produção e provado: um filme entregue
de verdade ainda responde 404, e só sai do 404 com o clique do dono. O valor
para a casa é que cada filme publicado carrega "made with usekineo.com" — é
aquisição de graça, que é onde o gargalo realmente está (32 cadastros/dia não
viram 10 pagantes por conversão nenhuma). **A ressalva, e ela é minha:** liguei
o botão no e-mail de menor alcance da casa (4 pessoas/semana) em vez do que 107
pessoas receberam. A peça está certa; o alcance começa na próxima rotação, que
já abre por aí. Placar do dia continua **0 pagamentos** — 7 dias: 2; 30 dias: 6.

---

### #28 — 15:08→16:08 BRT — O MESMO BOTÃO, NO E-MAIL QUE 107 PESSOAS RECEBEM

#### PRESS RELEASE

> A #27 deu ao dono do filme o botão de publicar. A #28 o coloca onde as
> pessoas estão: no **e-mail de entrega** — o que sai a cada render pronto, 158
> vezes para 107 pessoas nos últimos 7 dias. A partir de agora, quase todo
> filme entregue chega com um link de partilha ao lado do botão de download.

#### O QUE ESTAVA ERRADO (e o erro era meu, de uma hora antes)

Medido **depois** de publicar a #27 — que é o problema: eu devia ter medido
antes. Sete dias, só os e-mails de "filme pronto":

| e-mail | envios | pessoas |
|---|---|---|
| `video_ready_email_sent` (rota de status) | **158** | **107** |
| `stranded_ready_sent` | 42 | 27 |
| `stranded_fast_ready_sent` | 24 | 21 |
| **`video_ready_nudge_sent` ← onde a #27 ligou** | **4** | **4** |

O cron `send-video-ready` manda **1 por pessoa PARA SEMPRE** e só para quem
nunca baixou. É o e-mail de menor alcance da casa. Mesma forma de erro da #20
desta manhã, e a razão de a memória `contrato-de-servidor-sem-chamador`
existir: **rota publicada não é rota chamada**.

#### O QUE MUDOU

**SHA `de5d3509`** · `app/api/compose/status/[renderId]/route.ts` — a mesma
dupla de linhas já provada (`publishHref`/`unpublishHref`), com **fonte
própria** (`video_ready_delivery`, nunca o contador da #27 — medir peça nova
por dentro do contador da peça velha foi o defeito da #25).

Duas falhas fechadas novas: sem id de filme (insert duplicado que não devolveu
linha) e sem segredo de assinatura, o bloco é string vazia e o e-mail sai byte
a byte como saía antes.

**Guardião:** 37 verificações (7 novas). Falsificado: bloco removido do e-mail
de entrega ✓ morto · fonte colada na da peça velha ✓ morto.

#### ⚠ O QUE AINDA NÃO ESTÁ PROVADO — E NÃO VOU FINGIR QUE ESTÁ

A #27 tem sonda de produção (302 com controle 404, e o filme real ainda em
404). A **#28 não tem sonda possível**: a mudança vive dentro do corpo de um
e-mail, e não existe URL pública que a exponha. Ela só se prova quando **um
render de verdade terminar** depois do deploy e o e-mail sair.

Isto é `zero-falhas-sem-denominador` aplicado a mim mesmo: **subiu ≠
exercitado**. A casa entrega ~42 filmes/24h (um a cada ~35 min), então a
primeira oportunidade real deve aparecer dentro da próxima rotação.

Como conferir, sem ambiguidade:

```sql
-- o e-mail saiu depois do deploy?
select count(*), max(created_at) from events
where name='video_ready_email_sent' and created_at > '2026-09-06 18:30:00+00';
-- e alguém apertou o botão?
select name, count(*), count(distinct user_id), max(created_at) from events
where name in ('video_published_v1','video_unpublished_v1') group by 1;
```

#### PRÓXIMA JOGADA

1. **Conferir as duas consultas acima** na abertura da próxima rotação. Se
   `video_ready_email_sent` correu e `video_published_v1` continua zero por
   várias dezenas de e-mails, o problema passa a ser **a copy**, não o alcance
   — e aí a frase muda, não o encanamento.
2. **PEDIDO ao Codex já escrito** (`docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`):
   a caixa de partilha na tela de filme pronto — **130 pessoas em 7 dias**
   (`video_ready_viewed`), mais do que qualquer e-mail alcança.
3. **As 20 pessoas com link vivo da Stripe** que ficaram fora do lote das
   11:30 — a coorte de maior intenção da casa, e o motivo da exclusão ainda
   não está medido.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada.** As três entregas subiram sozinhas (`de5d3509` na ponta) e nenhum
   filme de cliente ficou público sem o dono clicar.

#### 📋 O QUE ACONTECEU
Uma hora depois de entregar o botão de partilha, medi o alcance dele e
descobri que o tinha pendurado no e-mail que a casa manda para **4 pessoas por
semana**. Corrigi: o botão agora vai no e-mail de entrega, que saiu 158 vezes
para 107 pessoas em 7 dias — quase todo filme pronto passa a chegar com um
link de partilha ao lado do download. O encanamento inteiro está provado em
produção; o que **não** está provado é este último passo, porque ele só existe
dentro de um e-mail e só se prova quando o próximo render terminar. Deixei as
duas consultas que respondem isso sem margem para interpretação.

---

### CHECKPOINT 14:38 BRT (17:38 UTC) — rotação #28 · sem trabalho novo

Este é o disparo de :38: confere o que a rotação das :08 deixou, mede, e não
abre frente nova. As duas consultas que a #28 deixou escritas estão
respondidas abaixo — as duas com resposta **negativa**, e nenhuma delas
maquiada.

#### 1. O e-mail de entrega SAIU depois do deploy da #28? **NÃO. Zero.**

```
video_ready_email_sent  > 2026-09-06 17:30 UTC (deploy)  →  0 envios
video_ready_email_sent  últimas 24h                      →  42 envios
último envio da casa                                     →  17:21:18 UTC
```

O último e-mail de entrega saiu às **17:21 UTC — três minutos ANTES** do
commit `de5d3509` (17:24) e cerca de nove minutos antes do deploy ficar de pé.
Ou seja: a #28 está no ar e **ainda não foi exercitada uma única vez**. Isto é
exatamente o que a própria #28 escreveu que aconteceria (`subiu ≠
exercitado`) — o registro aqui existe para que ninguém, inclusive eu na
próxima rotação, conte isso como entrega provada. A casa fecha ~42 filmes/24h,
um a cada ~35 min: a primeira prova real deve cair antes das 15:38.

#### 2. Alguém apertou o botão de partilha? **NÃO. Zero desde sempre.**

```
video_published_v1     → 0 eventos, em toda a história da tabela
video_unpublished_v1   → 0 eventos, em toda a história da tabela
```

Esperado, e não é sintoma de defeito: até 17:24 o botão só existia no e-mail
de **4 pessoas por semana** (`video_ready_nudge_sent`). O numerador é zero
porque o denominador é zero. Só a partir do próximo e-mail de entrega é que
esta contagem começa a significar alguma coisa — e é aí que a pergunta passa
a ser **copy**, não encanamento.

#### 3. O ACHADO DESTE CHECKPOINT — quem levou clique hoje foi a carta GENÉRICA

Não estava na lista de perguntas, apareceu ao medir. Todos os cliques em link
de episódio hoje, com a fonte que a #25 obrigou cada carta a carregar:

| fonte do clique | cliques |
|---|---|
| `lifecycle_loss_email` (campanha horária genérica) | **2** |
| `video_ready_email` | 1 |
| `unknown` (sem fonte — furo de instrumentação) | 2 |
| `season_letter` (a carta da temporada, escrita hoje) | **0** |
| `next_episode_wall` (a carta da parede) | **0** |

E os volumes do dia, lado a lado:

| carta | envios hoje | pessoas |
|---|---|---|
| ciclo de vida (5 campanhas, cron horário) | **108** | 108 |
| porta de volta do checkout | 22 | 22 |
| entrega de filme pronto | 28 | 21 |
| carta da parede | 19 | 19 |
| carta da temporada | 11 | 11 |
| momentum / post nudge | 22 | 22 |
| **TOTAL** | **~210 e-mails** | — |

**210 e-mails hoje. 0 pagamentos hoje.** As duas cartas caras e raras — as que
esta sessão construiu, com título de episódio escrito por modelo e link de
série — somaram **30 envios e 0 cliques**. A campanha automática, genérica e
horária somou 108 envios e os 2 únicos cliques atribuídos. É a memória
`supressao-sem-precedencia-cala-a-carta-boa` mostrando a outra face: não é só
que a genérica **cala** a boa por supressão — é que, medida de frente, a
genérica está **ganhando**. Isso não conclui que a carta boa é ruim (30 envios
é amostra pequena demais para concluir qualquer coisa), mas **inverte o ônus
da prova** para a próxima rotação: antes de escrever a carta nº 7, provar que
a nº 5 e a nº 6 tiram alguém do lugar.

Furo lateral, barato de fechar: **2 dos 5 cliques chegaram com
`source=unknown`**. Rota de episódio recebendo clique sem saber de onde veio
é medição que se perde.

#### PRAXE — PLACAR E CHECAGEM ZERO (17:38 UTC)

**Desde o marco (06/09 14:00 UTC):** 4 cadastros (`trial_credits_granted`) ·
4 filmes concluídos / 3 pessoas · 1 `pricing_view` · **0 `checkout_started`** ·
**0 `payment_success`**.

**24h:** 32 cadastros · 42 filmes entregues · 2 `checkout_started` ·
**0 pagamentos**. **7 dias: 2 pagamentos. 30 dias: 6.**

**Checagem zero — limpa:** cadastro sem crédito **0/32** · render preso >45 min
**0** · `next_episode_failed` **0** · `generation_stage_error` 4 em 24h (base
normal). Nenhum alarme.

#### PISTA DO CODEX — o site novo entrou

`origin/main` traz hoje `027e7996` (layout do Studio "idea-first", aprovado
pelo fundador), `25a0d164` (nav mobile acima dos avisos de instalação) e
`33737e95` (registro do preview verificado). **Nada meu encostou nesses
arquivos** e a fila (`entrega-atual`) está em 0 commits à frente da ponta —
sem conflito de pista.

#### O QUE A ROTAÇÃO DAS 15:08 ABRE

1. **Reconferir a consulta 1.** Se `video_ready_email_sent` correu depois de
   17:30 e `video_published_v1` continua zero após algumas dezenas de e-mails,
   o problema vira **a frase do botão**, não o alcance — e a jogada muda de
   encanamento para copy.
2. **As 20 pessoas com link de recuperação vivo da Stripe** que ficaram de fora
   do lote — coorte de maior intenção declarada da casa. Continua sem o motivo
   da exclusão medido. (Nota: a rota rodou de novo às 17:30 e alcançou 22
   pessoas hoje, não 21 — o lote não está parado.)
3. **Fechar o `source=unknown`** do clique de episódio: 2 de 5 cliques hoje
   chegaram sem fonte.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada.** Checkpoint de medição, sem código novo e sem e-mail disparado.

#### 📋 O QUE ACONTECEU
Confirmei que as duas entregas da rotação anterior estão no ar e que **nenhuma
das duas foi usada ainda** — o botão de partilha só passa a existir de verdade
no próximo e-mail de filme pronto, que ainda não saiu. Medindo isso, apareceu
o fato mais desconfortável do dia: a casa mandou cerca de **210 e-mails hoje** e
teve **0 pagamentos**; as duas cartas caras que esta sessão construiu somaram
30 envios e nenhum clique, enquanto a campanha automática genérica levou os
únicos 2. Não é veredito — 30 envios é pouco —, mas muda a ordem do que provar:
a próxima carta só se justifica depois que uma das que já existem mover alguém.
Produção está sadia: 42 filmes entregues em 24h, nenhum render preso, nenhum
cadastro sem crédito.

---

### #29 — 15:08→16:20 BRT — o produto OFERECIA uma compra que o próprio cobrador recusa

#### PRESS RELEASE

> A partir de hoje, a Kineo nunca mais pinta um botão de compra que a própria
> caixa registradora recusa. Quem chega sem plano e pede um filme maior do que
> o saldo cobre para de ver quatro pacotes de crédito que o servidor responde
> com erro, e passa a ver a única saída que a conta realmente tem — o plano das
> linhas de cima, dito em filmes: "Creator cobre este filme e mais 3 como ele
> este mês". O Starter, que era a única conta do produto sem NENHUMA saída
> comprável, passa a enxergar os planos acima do dele. O cliente paga por isso
> porque, pela primeira vez, o preço aparece no segundo em que ele quis pagar —
> e não um erro vermelho.

#### O QUE ESTAVA ERRADO (medido, não suposto)

Desde **17/08** — o commit `KINEO-TOPUP100-2026-08-17`, cujo próprio comentário
diz "o pop-up de créditos zerados agora mostra a escadinha pra TODOS (era só
assinante)" — o modal de crédito curto do `/studio/create` pintava os **quatro**
pacotes de recarga para qualquer conta. O portão no JSX era literalmente `{(`:
nenhuma condição.

O `/api/stripe/checkout` **nunca concordou com essa decisão**. `canPurchaseCreditTopup`
(lib/growth/topupEligibility) só aceita `basic`/`pro`; todo o resto leva
**403 `topup_requires_creator_plus`** e cai no `/pricing` com erro vermelho.
Por três semanas a vitrine e a caixa registradora disseram coisas opostas.

**60 dias, `limit_purchase_fit_viewed`: 18 pessoas viram a escadinha e ZERO
podiam comprar** — 17 `free` e 1 `starter`.

**O caso que fechou a conta — hoje, 06/09, conta vinda do TAAFT (Paquistão):**

| hora (UTC) | o que aconteceu |
|---|---|
| 12:15:17 | cadastro pelo Google, 25 créditos de trial concedidos |
| 12:18:55 | pede um filme de **90 segundos** (custo 38cr) |
| 12:19:07 | modal abre com `reason: trial_spent` — **com os 25 créditos INTACTOS** |
| 12:19:08 | clica em `topup100` (14,90 USD) — **4 minutos depois de chegar** |
| 12:19:08 | **403 `topup_requires_creator_plus`** |
| 12:22:35 | volta e **encolhe o próprio pedido de 90s para 35s** |
| 12:37 | filme entregue, baixado às 12:38 — e foi embora |

Uma pessoa sacou a carteira no minuto 4 e a casa disse não. Depois ela reduziu
a própria ambição para caber no que era grátis. Isto é uma venda perdida com
nome e horário, vinda da fonte que o diário das 13:17 apontou como **40% do
tráfego e ZERO pagamentos em 30 dias** — aqui está um motivo mecânico.

**O pior caso era o Starter**: assinante (logo `fittingPlanIds = []`) E sem
direito a recarga — saía de `calculateLimitPurchaseFit` com nenhum plano E um
pacote recomendado que o checkout recusa. **A única conta do produto que ficava
sem nenhuma saída comprável.**

#### O QUE MUDOU — SHA `a23ba06f` · EM PRODUÇÃO

- **`lib/growth/limitPurchaseFit.ts`** — o módulo puro passa a **ler a regra do
  cobrador** (`canPurchaseCreditTopup`, a mesma função da rota; memória
  `predicado-do-cobrador-nao-se-redigita`) em vez de nunca perguntar.
  `fittingTopupIds` vem vazio para quem não pode comprar, `recommended` nunca é
  um 403, e o assinante sem recarga recebe os planos **acima** do dele.
  Publica `topupPurchasable` no resultado e `topup_purchasable` na telemetria.
- **`components/TopupUnavailableNote.tsx` (novo)** — o espaço dos 4 botões
  mortos vira a saída real, dita em **filmes** e derivada de `TIER_CREDITS`.
  Nenhum número digitado (o divisor chumbado já mentiu 3x neste mesmo bloco).
- **`GenerateClient.tsx`** — uma condição (`topupPurchasable`) e uma linha de
  montagem. Nada de layout, nav ou home.

#### TESTES

`scripts/test-topup-offer-gate.mjs` — **24 verificações**, lendo os arquivos
reais (sem alias `@/`, que morre fora do bundler) e amarradas à **variável que
decide**, não a contagem de texto. `npx tsc --noEmit` verde.

**Falsificação por mutação** (commit ANTES, memória `falsificar-mutacao-commitar-antes`):

| mutante | resultado |
|---|---|
| escadinha volta a ser incondicional (`{true ? (`) | pegou |
| módulo puro deixa de perguntar ao cobrador | pegou |
| `fittingTopupIds` deixa de ser governada | pegou |
| alguém reabre recarga para Starter no servidor | pegou |

Uma verificação minha **falhou na 1a execução casando com a própria prosa** que
explicava a regra — corrigida para ler só o código, sem comentários.

#### SONDA — E O QUE ELA NÃO PROVA

`origin/main` = `a23ba06f` (`git ls-remote`), fila em 0. Home **200**, controle
**404**. Tentei provar a frase nova dentro do bundle publicado: **não encontrei
— e a frase ANTIGA da escadinha também não está lá**. O controle diz que a
sonda é **cega**, não que o deploy falhou: `/studio/create` sem sessão devolve o
HTML do login, cujos chunks não incluem o `GenerateClient`. Registro como
**não provado por sonda anônima**, não como provado.

#### PLACAR (praxe)

| janela | cadastros | fizeram filme | filmes | viram preço | checkout | **pagaram** |
|---|---|---|---|---|---|---|
| desde o marco (14:00 UTC) | 4 | 4 | 5 | 1 | 0 | **0** |
| 24 horas | 31 | 29 | 41 | 9 | 2 | **0** |
| 7 dias | 228 | 155 | 224 | 40 | 25 | **2** |

**Checagem zero — limpa.** Os 2 "cadastros sem crédito" das últimas 24h são
falso alarme: os dois **receberam** o grant e gastaram fazendo filme (1 e 3
filmes). Render preso 0 · `next_episode_failed` 0 · `generation_stage_error` 4
(base normal) · `checkout_failed` 1 (o caso acima, agora corrigido).

#### ACHADO QUE NÃO VIROU JOGADA — E POR QUÊ

`checkout_payment_failed` **passou a existir** (o CLAUDE.md diz que a tabela
nunca teve um). São **2 em 30 dias, ambos `stage: renewal`, `insufficient_funds`** —
renovação recusada de quem **já pagava**: 24,90 USD (visa débito AU, 04/09) e
9,90 USD (visa **pré-pago** NG, 03/09). Os dois voltaram a `plan: free` e a
última atividade de cada um é o próprio horário da recusa. Ninguém foi avisado;
não existe fluxo de dunning.

**Não construí o remédio, e a razão é a coorte** (memória
`dimensionar-a-coorte-antes-de-construir-o-remedio`): são 2 pessoas, uma é
`akajitin` — **contato proibido pela ordem do ciclo** — e a outra é de domínio
descartável com cartão pré-pago. Construir dunning hoje seria construir para
uma coorte inalcançável. Fica a **spec** abaixo.

#### COMO MEDIR ESTA ENTREGA

1. `checkout_failed` com `reason='topup_requires_creator_plus'` → **0** daqui
   para frente (era 1 hoje, 1 em 60 dias antes disso).
2. `limit_purchase_fit_clicked` com `choice_id` de pacote vindo de conta
   free/starter → **0**.
3. O número que importa: `limit_purchase_fit_viewed` (18 pessoas/60d) seguido
   de `checkout_started` **de plano** — hoje é 0 nesse balde.
4. `topup_purchasable:false` na telemetria = o tamanho real desta coorte por dia.

#### PRÓXIMA JOGADA

**A régua do pedido, não a régua do saldo.** O trace de hoje mostra o padrão
inteiro em 4 minutos: a pessoa pede **90s**, bate no paywall, e **volta pedindo
35s**. O comentário do próprio código já registrou isso em 22/08 ("6 pessoas
escolheram 90s com os 25 créditos INTACTOS"). Hoje o produto responde a um
pedido grande com um preço; a resposta que converte é **entregar o filme que a
pessoa pediu e cobrar por ele naquele segundo** — "seu filme de 90s está
pronto para renderizar: faltam 13 créditos". É a diferença entre vender uma
assinatura e vender **este filme**. Mensurável: `upgrade_modal_opened` seguido
de redução de duração no mesmo attempt — hoje, 27 pessoas em `trial_spent`,
**19 delas com o saldo cheio**.

#### SPEC PARA O FUNDADOR — DUNNING (decisão dele)

Renovação recusada hoje = cliente perdido em silêncio. A Stripe já tenta de
novo sozinha; o que não existe é **avisar a pessoa**. Custo: zero (e-mail).
Margem: recupera MRR já vendido — o cliente mais barato que existe. Só não
executei porque as 2 pessoas da coorte atual são inalcançáveis (uma proibida,
uma descartável). **Decisão dele:** ligar o aviso de renovação recusada para os
próximos, ou deixar como está.

#### ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada agora.** A entrega já subiu por mim (`a23ba06f`) e está em produção.
2. **Decidir, quando quiser:** ligar ou não o e-mail de renovação recusada
   (spec acima). É a única peça deste bloco que depende de você.

#### 📋 O QUE ACONTECEU

Achei, e consertei, um lugar onde a casa dizia **não** para quem queria pagar.
Desde 17/08 o pop-up que aparece quando falta crédito mostrava quatro botões de
compra de crédito para todo mundo — e o sistema de pagamento recusava todos eles
com erro, porque só quem já é Creator ou Studio pode comprar crédito avulso.
Dezoito pessoas viram esses botões em 60 dias e nenhuma podia clicar.
Hoje uma delas clicou: chegou pelo TAAFT, se cadastrou 12:15, pediu um filme de
90 segundos e às 12:19 — **quatro minutos depois de entrar** — tentou comprar
14,90 dólares em créditos. Levou erro. Aí ela mesma diminuiu o pedido para 35
segundos, fez um filme com o crédito grátis, baixou e foi embora. Agora, quem
não pode comprar crédito avulso não vê mais botão morto: vê o plano que cobre
exatamente o filme que acabou de pedir, escrito em filmes ("cobre este filme e
mais 3 este mês"). E o Starter — que era a única conta que ficava sem saída
nenhuma — passa a ver os planos acima do dele.
Descobri também que dois clientes que **já pagavam** tiveram a renovação
recusada por falta de saldo no cartão e ninguém os avisou. Não montei o aviso
porque, olhando quem são, um está na sua lista de contatos proibidos e o outro
usa e-mail e cartão descartáveis — deixei a proposta pronta para você decidir.
Produção sadia: 41 filmes em 24h, nenhum render preso, nenhum cadastro sem
crédito. Pagamentos hoje continuam em **zero**.

---

### CHECKPOINT — 15:38 BRT (18:38 UTC) — a #29 subiu e **não tem como se provar**; 181 cartas frias hoje, **2 retornos**

Checkpoint da rotação das 15:08 — sem trabalho novo, só verificação e medida.

#### ONDE ESTÁ A ENTREGA

`git ls-remote origin main` = **5a9c64c2** (inclui `a23ba06f`, a #29).
`git rev-list --count origin/main..entrega-atual` = **0**. Home 200.

**E aqui vai o registro honesto: a #29 NÃO tem sonda.** A mudança é 100% de
cliente (`GenerateClient.tsx` + `TopupUnavailableNote.tsx` + `limitPurchaseFit`),
dentro de rota **autenticada**, e **não emite nenhum evento novo**. Tentei os
dois caminhos e os dois falharam por construção:

| tentativa | resultado |
|---|---|
| par 404→401 (memória `sonda-401-exige-controle-404`) | **não se aplica** — a #29 não cria rota |
| achar a frase nova nos chunks JS de `/studio/create` | **0 de 22 chunks** — sem sessão essa URL devolve a *home pública* (`<title>Kineo — AI YouTube Shorts Generator</title>`), o bundle do dashboard não é servido |
| `Last-Modified` de asset estático | **inútil** — é hora de preenchimento do cache da CDN (38s atrás), não hora do build |

Então o que eu posso afirmar é só: **o commit está na ponta publicada**. Não
afirmo "em produção provado", e não afirmo "exercitada". A #29 só vai aparecer
no dado como uma **ausência** (`checkout_failed reason='topup_requires_creator_plus'`
→ 0), e ausência não prova deploy.

**Isto é um defeito de instrumentação da própria peça, e é a primeira coisa da
próxima rotação:** um evento `topup_offer_shown{purchasable:true|false, plan}`
no ponto onde o `topupPurchasable` decide. Custa 3 linhas, prova o deploy no
minuto seguinte e ainda dá o tamanho diário da coorte — que hoje eu só sei em
janela de 60 dias (18 pessoas).

#### PLACAR — desde o marco 2026-09-06 14:00 UTC (4h39 de janela)

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt | 3 | 3 | 1 | 0 | 0 | **0** |
| taaft | 1 | 1 | 0 | 0 | 0 | **0** |
| **total** | **4** | **4** | **1** | **0** | **0** | **0** |

Conversão cadastro→filme 1 de **4/4**. O degrau que não anda continua sendo o
mesmo: filme 2 (1 de 4) e checkout (**0**). Dia inteiro: **1** `checkout_started`,
às 04:33 UTC — antes de qualquer entrega deste ciclo.

#### CHECAGEM ZERO — limpa

24h: **30 cadastros · 41 filmes · 41 completos · 0 render não-terminal · 0
preso · 0 cadastro sem crédito e sem filme · `next_episode_failed` 0 ·
`generation_stage_error` 3 (2 pessoas, último 10:40 UTC)**. `checkout_failed` 1
— o caso do TAAFT das 12:19 que a #29 acabou de fechar.

#### O NÚMERO DO CHECKPOINT: 181 CARTAS FRIAS, 2 RETORNOS

Retorno medido do jeito certo (memória `retorno-pos-email-conta-email-nosso`):
só evento **com `session_id`** — navegador de gente — depois do carimbo de envio.

| campanha | enviados hoje | voltaram |
|---|---|---|
| `trial_lifecycle_email_sent` (genérica) | 108 | **2** |
| `checkout_recovery_emailed_v1` | 22 | **0** |
| `next_episode_wall_emailed_v1` | 19 | **0** |
| `season_letter_emailed_v1` | 11 | **0** |
| — frias, somadas | **160** | **2** |
| `video_ready_email_sent` (quente) | 21 | 21 ← *falso positivo: a pessoa já está na tela vendo o render quando essa carta sai; não medir por aqui* |

As **três cartas caras deste ciclo somam 52 envios e ZERO retornos**. A genérica,
que ninguém desenhou hoje, fez os 2. Isso é a memória
`carta-nova-so-depois-da-velha-mover` batendo pela segunda vez em 8 horas — e
agora com a coorte inteira do dia, não com uma amostra. A carta da temporada
saiu para 11 pessoas às **15:45 UTC**; já se passaram 2h53 e nenhuma voltou.

#### AS PEÇAS DO DIA QUE AINDA NÃO FORAM EXERCITADAS

| peça | evento de servidor | evento de tela |
|---|---|---|
| temporada (#23) | `season_written` **11** | `season_shown` **0** |
| pacote de publicação (#22/#27/#28) | rota 401 provada | `publish_pack_*` **0** |

O padrão é o mesmo dos dois checkpoints anteriores e tem nome na memória:
`contrato-de-servidor-sem-chamador`. **O servidor da casa está pronto e a tela
não montou.** As duas peças dependem do lote do Codex — que fez 4 commits hoje
e **nenhum nas últimas 3 horas**. Não é bloqueio meu, mas é o motivo pelo qual
três entregas seguidas não puderam ser medidas.

#### PRÓXIMA JOGADA (para a rotação das 16:08)

1. **3 linhas de telemetria na #29** — sem isso, a entrega das 15:21 é fé.
2. **Parar de escrever carta nova.** 160 cartas frias e 2 retornos hoje; o
   problema não é qual carta, é que **e-mail frio não está movendo ninguém**.
   O que moveu gente hoje foi a própria tela (`series_continue_seen` 108
   eventos / 19 pessoas; `next_action_served` 42 / 25). A jogada da 16:08 é
   **na tela de quem está dentro agora**, não na caixa de entrada de quem foi
   embora.

#### ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada.** Checkpoint é só medição; a #29 já estava publicada por mim.

#### 📋 O QUE ACONTECEU

A correção das 15:21 — a que tirou os quatro botões de compra que o sistema de
pagamento recusava — está publicada. Não consigo, porém, **provar** que ela
está no ar: é uma mudança que só existe dentro da tela de quem está logado e
não deixa rastro nenhum no banco. Anotei isso como erro meu de construção e a
primeira tarefa da próxima hora é dar a ela um rastro de três linhas.
A casa está sadia: 41 filmes em 24 horas, todos concluídos, nada preso, ninguém
nasceu sem crédito. Mas o número que importa continua teimoso — **181 e-mails
saíram hoje e duas pessoas voltaram**, e as duas vieram do e-mail mais velho e
mais genérico que temos; as três cartas novas e caras deste ciclo somaram 52
envios e não trouxeram ninguém. Pagamentos hoje: **zero**. Por isso a próxima
hora sai da caixa de entrada e vai para a tela de quem já está dentro do site
agora — que é onde as pessoas de fato estão clicando.

---

### #30 — 16:08 → 16:21 BRT — a temporada tinha servidor e não tinha tela; agora entra no instante de alegria máxima

#### PRESS RELEASE (o que o cliente consegue fazer às 16:21 que não conseguia às 16:08)

> Quando o seu filme fica pronto, a Kineo deixa de te entregar um arquivo e passa
> a te entregar **um canal começado**. Debaixo do vídeo aparece a sua temporada:
> o episódio 1 é o que você acabou de fazer, e os episódios 2 a 6 já estão
> escritos, com nome próprio, na mesma série. Cada um diz quanto custa e quais
> cabem no seu saldo de hoje. Um toque carrega o episódio no compositor — nada
> renderiza, nada é cobrado, e o filme que você já tem continua salvo.
> Os que não cabem no saldo não dizem "compre 60 créditos": dizem **"o resto da
> sua temporada"**. É a mesma assinatura, com a única moldura que a pessoa
> sente — porque ninguém assina uma fábrica de coisa que já terminou, mas quase
> todo mundo quer ver o fim de uma temporada que já começou.

#### O QUE ESTAVA ERRADO (medido, 06/09 19:00 UTC)

| evento de servidor | evento de tela |
|---|---|
| `season_written` **11 pessoas** | `season_shown` **0** |

A porta de servidor da temporada (#18/#19, `app/api/season`) subiu às 11h de hoje.
Ela escreve os títulos dos episódios 2 a 6, devolve o **custo** de cada um vindo de
`creditCostForDuration` e o **saldo** da pessoa. E **nenhuma tela do produto a
chamava**. As 11 temporadas escritas hoje só existiram dentro de um e-mail: 11
enviados, 0 retornos. É a memória `contrato-de-servidor-sem-chamador` batendo
pela **terceira vez em oito horas** — servidor da casa pronto, tela ausente.

**Por que a tela de filme pronto e não outra:** é o instante de alegria máxima
(~130 visitas/semana em `video_ready_viewed`) e é exatamente de lá que **109 das
145 pessoas ativadas saem para nunca mais voltar — 65 delas com saldo intacto**.
Elas não foram barradas. Foram embora **satisfeitas**, porque receberam o que
vieram buscar: UM vídeo. "Quer fazer outro?" é uma pergunta que exige uma ideia e
morre num formulário em branco. "O episódio 3 chama-se assim" é uma afirmação que
custa um clique.

#### O ACHADO DE APOIO: 21 DE 29 PESSOAS NUNCA VIRAM A OFERTA DE BOAS-VINDAS

Enquanto media, encontrei `welcome_offer_suppressed_before_first_film` a disparar
**agora, às 19:10 UTC**. A trava (CAIXA R17) adia a oferta até a pessoa ter o
primeiro filme — e adia para o **dashboard**, uma tela que a pessoa pode nunca
revisitar.

| desde 04/09 | pessoas |
|---|---|
| tiveram a oferta calada antes do 1º filme | **29** |
| viram a oferta **alguma vez depois** | **8** |
| **nunca viram a oferta, nem uma vez** | **21 (72%)** |
| pagaram | **0** |

**Todos os 29 são `utm_source: chatgpt.com`** — o canal que traz 3 dos 6 pagantes.
Não mexi na trava: ela foi construída de propósito e o próprio comentário do autor
regista que um comprador real usou o caminho pré-filme. Mas o número explica por
que a faixa da temporada é a resposta certa — **ela põe o pedido no instante de
alegria, em vez de o adiar para uma tela onde ninguém volta.** Fica como PEDIDO.

#### O QUE MUDOU — **EM PRODUÇÃO, SHA `f7634d06`**

- **`components/video/SeasonStrip.tsx` (novo)** — a faixa.
- **`app/(dashboard)/generate/GenerateClient.tsx`** — um import e **uma linha de
  montagem**, acima da prateleira "your next 3 shorts" (a prateleira diz "faça
  outro"; a faixa diz "o episódio 3 chama-se assim").
- **`components/TopupUnavailableNote.tsx`** — as **3 linhas de telemetria** que a
  rotação anterior pediu como primeira tarefa: `topup_unavailable_note_shown`.
  A #29 subiu às 15:21 sem **um** rastro no banco e às 15:38 não tinha como se
  provar. Agora tem.
- **`scripts/test-season-strip.mjs`** — 44 verificações.

**Três decisões que merecem registo:**

1. **POST, não GET.** O GET tem `escrever: false` e devolve `null` para quem ainda
   não tem temporada gravada — que é **toda a gente** no instante em que o filme 1
   fica pronto. Um GET aqui renderizaria nada para 100% das pessoas. O POST é o
   contrato desenhado para este momento: escreve **uma vez por filme**
   (`garantirTemporada` memoiza em `events`) e devolve a mesma temporada depois.
   Não cobra crédito, não chama a fal, não renderiza — escreve cinco títulos.
2. **A faixa não escreve preço.** Não existe **um cifrão** no componente. Custo,
   `affordable` e `affordableEpisodes` vêm **prontos da rota**, que os deriva do
   mesmo `creditCostForDuration` do cobrador (memória
   `predicado-do-cobrador-nao-se-redigita`). Quem não tem saldo lê "o resto da sua
   temporada" e vai para `/pricing`, onde o preço público do fundador vive.
3. **`season_shown` = VISTO, não "carregou".** Só dispara quando 35% da faixa
   entra no viewport. A lição do `next_shorts_shown`, que disparava quando o fetch
   resolvia: numa tela com vídeo + pacote de texto + prateleira + upsell, os dois
   números são muito diferentes.

#### TESTES

`npx tsc --noEmit` **verde (exit 0)** · guardião **44/44**.

**Falsificado por mutação** (commit ANTES, memória `falsificar-mutacao-commitar-antes`) —
as cinco foram ao vermelho e o verde voltou em todas:

| mutação | resultado |
|---|---|
| desmontar `<SeasonStrip/>` do JSX | ❌ "SeasonStrip está MONTADO em JSX" |
| `POST` → `GET` | ❌ "e chama por POST" |
| renomear `season_shown` | ❌ 2 verificações |
| escrever `$9.90` na faixa | ❌ "nenhum cifrão no componente" |
| remover a telemetria da #29 | ❌ 2 verificações |

**A primeira versão do guardião deu 3 falsos vermelhos** porque os regex casavam
com os **próprios comentários** do arquivo (`creditCostForDuration`, `season_shown`
e `<NextShortsSection/>` aparecem em prosa). O guardião passou a ler **código sem
comentários**. Vale a pena registar que um dos três parecia um defeito real de
ordem de montagem e não era — a única forma de saber foi imprimir os índices.

#### O RISCO, DITO

Uma chamada de `gpt-4o-mini` por filme concluído (~40/dia) que antes não existia.
Não gasta crédito do cliente nem toca na fal, e o pipeline de qualidade do filme
está intocado — título é texto **fora** do pipeline. Se a rota falhar de qualquer
maneira (401, JSON partido, fora do ar), a faixa renderiza `null`: a tela de filme
pronto **nunca** pode mostrar erro a quem já pagou um crédito pelo vídeo.

#### COMO MEDIR (e a sonda honesta)

Home **200**; `/api/season` **401** com controle **404** na mesma medição. Mas isso
prova a **rota**, que já existia — **não prova o meu commit**. Esta entrega é
React em rota autenticada (memória `entrega-so-de-cliente-nao-tem-sonda`), por isso
instrumentei no **mesmo commit**. A sonda real é:

```sql
select name, count(*) n, count(distinct user_id) pessoas
from events where name in ('season_shown','season_episode_clicked','season_plan_clicked',
                           'topup_unavailable_note_shown')
  and created_at > '2026-09-06 19:45:00+00' group by 1;
```

`season_shown` esteve em **0 o dia inteiro**. Qualquer número acima de zero é a
prova de que subiu **e** de que alguém a viu. O que interessa a seguir é a razão
`season_episode_clicked / season_shown` — e se os cliques se concentram nos
episódios que **cabem** no saldo ou nos **bloqueados** (se forem os bloqueados, a
moldura "o resto da sua temporada" está a funcionar e o passo seguinte é o
checkout).

#### PLACAR — desde 2026-09-06 14:00 UTC

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt | 4 | 3 | 1 | 0 | 0 | **0** |
| taaft | 1 | 1 | 0 | 0 | 0 | **0** |
| **total** | **5** | **4** | **1** | **0** | **0** | **0** |

#### CHECAGEM ZERO — limpa

24h: **31 cadastros · 40 filmes · 40 completos · 0 não-terminal · 0 preso · 0
cadastro sem crédito · `next_episode_failed` 0 · `generation_stage_error` 4 ·
`checkout_started` 1 · `payment_success` 0.**

#### E-MAILS: NENHUM DISPARADO NESTA ROTAÇÃO, DE PROPÓSITO

A rotação anterior fechou com o número: **160 cartas frias hoje, 2 retornos** — e
os 2 vieram da campanha **genérica** que ninguém desenhou. As três cartas caras do
ciclo somam 52 envios e **zero**. É a memória `carta-nova-so-depois-da-velha-mover`
a bater pela segunda vez em oito horas. Escrever uma quarta carta hoje seria
repetir o erro de propósito. **A hora foi gasta na tela de quem está dentro
agora** — que é onde as pessoas de facto clicam (`series_continue_seen`,
`next_action_served`). Volto a mandar carta quando uma carta mover alguém.

#### PRÓXIMA JOGADA (para a rotação das 17:08)

1. **Ler a sonda acima.** Se `season_shown` > 0 e `season_episode_clicked` = 0, o
   problema é a **oferta** (os títulos não convencem) e não a colocação — e isso
   muda tudo o que se faz a seguir.
2. **A faixa da temporada no e-mail de filme pronto** — `video_ready_email_sent`
   é a carta **quente** da casa (21 hoje, a única com leitura real). Ela já sai;
   hoje não nomeia a temporada. Custo: baixo. É a mesma peça, no único canal que
   ainda funciona.
3. **PEDIDO ao Codex:** os 21 de 29 que nunca viram a oferta de boas-vindas.

#### ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada.** A entrega está publicada por mim (SHA `f7634d06`, `origin/main`, fila
   zerada) e o site respondeu 200.
2. *(opcional, 30 segundos)* Abra `usekineo.com/studio`, faça um filme curto e
   **role para baixo do vídeo** — a faixa "Your season" com os episódios 2 a 6 é a
   mudança de hoje. É a primeira vez que ela aparece para alguém.

#### 📋 O QUE ACONTECEU

A casa tinha construído, esta manhã, a peça que escreve a **temporada** do cliente
— os nomes dos cinco próximos episódios da série que ele acabou de começar — e
**nenhuma tela do site a mostrava**. Onze temporadas foram escritas hoje e as onze
só existiram dentro de um e-mail que ninguém abriu. Essa era a terceira vez em oito
horas que a casa construiu um servidor sem tela.

Nesta hora a faixa entrou no lugar certo: **debaixo do vídeo, no segundo em que
ele fica pronto** — que é o momento de maior alegria e também o momento exato em
que 109 das 145 pessoas ativadas vão embora para nunca mais voltar, **65 delas com
saldo intacto e sem terem esbarrado em nada**. Elas não foram barradas; foram
embora satisfeitas, porque vieram buscar um vídeo e receberam um vídeo. A faixa
existe para mudar essa frase: **isto não é um vídeo, é o episódio 1.**

E é aí que está a monetização, sem tocar em preço: os episódios que não cabem no
saldo não pedem "compre 60 créditos" — dizem **"o resto da sua temporada"**. Não há
um cifrão no código; todos os números vêm da mesma conta que o cobrador faz.

Também fechei a dívida que eu próprio tinha deixado às 15:38: a correção das 15:21
tinha subido **sem deixar rastro nenhum no banco** e eu não tinha como provar que
estava no ar. Agora deixa.

Pagamentos hoje continuam em **zero**, e não escondo isso: 1 checkout em 24 horas.
A casa está sadia (40 filmes, todos concluídos, nada preso, ninguém sem crédito),
o produto entrega — o que ainda não acontece é alguém achar que vale a pena
continuar. É exatamente esse "continuar" que esta hora tentou comprar.

---

### #30b — 16:24 BRT — o rótulo do Ep 1 é o que a PESSOA escreveu, não um título curado

**EM PRODUÇÃO, SHA `05b01558`.** Ao provar que a faixa tinha conteúdo real para
mostrar (as 11 temporadas gravadas hoje têm 5 episódios cada, com semente e
títulos bons — *"The Hidden Languages of Nigeria"*, *"How a 9-Year-Old Invented
an Eco-Friendly Rocket"*), a mesma consulta mostrou o defeito que a faixa ia
tornar visível:

| nas 11 temporadas de hoje | |
|---|---|
| `fromTitle` acima de 70 caracteres | **5 de 11** |
| maior | **120 caracteres** |
| começa com marcador de roteiro colado | **1** (`*🎙️ COMPLETE VOICEOVER SCRIPT - ...`) |

O rótulo do episódio 1 é o **título do filme da pessoa** — e esse campo não é
curado: é o que ela escreveu na caixa. Numa linha de uma só altura, 120
caracteres e um marcador de roteiro quebram a faixa **logo na primeira linha**.

`rotuloDoEpisodio1()` é **só apresentação**: não reescreve o que está guardado,
não toca no filme, não mexe no pipeline. Tira o marcador do começo, colapsa
espaços e corta em **fronteira de palavra**.

**Duas notas honestas sobre o método:**
1. O guardião passou a **executar a função real**, extraída do próprio arquivo.
   Não criei um espelho `.mjs` de propósito — duas cópias da mesma regra divergem
   no primeiro ajuste (`predicado-do-cobrador-nao-se-redigita`).
2. **Uma das verificações novas nasceu errada.** Eu tinha escrito `!/\w…$/` para
   "não corta no meio da palavra" — mas `…wird…` é um corte **limpo** e casaria
   na mesma. O código estava certo e o teste é que estava errado. Passou a
   comparar o prefixo com o original e a exigir espaço no ponto de corte.

Guardião **51/51** · `tsc` verde · fila zerada · home 200.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada.**

#### 📋 O QUE ACONTECEU
Antes de dar a faixa por pronta, fui ver o que ela ia mostrar de verdade com os
dados que já existem — e descobri que em quase metade dos casos a primeira linha
sairia gigante, e num deles sairia com o roteiro colado da pessoa aparecendo como
"título". Corrigido na apresentação, sem mexer em nada do que está guardado.

---

### CHECKPOINT — 16:38 BRT — a faixa foi vista pela primeira vez, e a oferta não estava lá

Sem trabalho novo nesta meia hora, por regra. Só medição — e ela respondeu à
pergunta que a #30 deixou aberta, de um jeito mais duro do que a pergunta previa.

**Estado publicado:** `origin/main` = `28e7a163`, fila zerada
(`origin/main..entrega-atual` = 0), home 200, `/api/season` = **401** contra
controle **404** — a rota está no ar.

#### A SONDA DA #30 — a faixa foi vista, 1 vez

| evento (desde 14:00 UTC) | n | pessoas | último |
|---|---|---|---|
| `season_written` | 12 | 12 | 19:33 UTC |
| **`season_shown`** | **1** | **1** | **19:34 UTC** |
| `season_episode_clicked` | 0 | 0 | — |
| `series_continue_seen` | 48 | **5** | 19:35 UTC |
| `series_continue_clicked` | 2 | 2 | 17:22 UTC |
| `next_action_served` | 7 | 7 | 19:09 UTC |

A distância entre **12 temporadas escritas** e **1 mostrada** não é furo de
cobertura — é a hora do deploy. Recortando na subida da faixa: **1 filme
concluído · 1 temporada escrita · 1 faixa mostrada. Cobertura 1/1.** Quem
terminou um filme com a faixa no ar viu a faixa.

`season_episode_clicked` = 0 com **denominador 1** não prova nada em direção
nenhuma (memória `zero-falhas-sem-denominador`). A pergunta "os títulos
convencem?" continua sem resposta e não deve ser respondida com este número.

#### O ACHADO: a moldura de monetização não apareceu na única exposição real

O próprio `season_shown` trouxe o payload:

```
balance: 5 · episode_cost: 5 · episodes: 5 · affordable_episodes: 1 · locked: 0
```

`affordable_episodes: 1` e `locked: 0` **na mesma linha, no mesmo evento**. Com
5 créditos e 5 por episódio, 4 dos 5 deviam estar bloqueados. Os dois números
saem de contas diferentes:

- `app/api/season/route.ts:79` — `affordable: custo !== null && custo <= balance`.
  É a pergunta **"cabe UM episódio?"**, feita isoladamente para cada um dos
  cinco. Com `5 <= 5`, os cinco respondem **sim**.
- `app/api/season/route.ts:86` — `affordableEpisodes = floor(balance/custo)` = **1**.
  É a pergunta **"quantos cabem?"**, acumulada.

E `components/video/SeasonStrip.tsx:195` deriva `bloqueados` do flag por
episódio — logo **0** — e a moldura inteira está atrás de `bloqueados > 0`
(linha 279). Consequência: o bloco *"The remaining N episodes of your season
unlock with a plan"* + o link **"Finish the season →"** para `/pricing`
**não renderizou**. A pessoa viu os cinco episódios pintados como disponíveis,
sem cadeado e sem oferta.

Isto não é canto raro: **`bloqueados` é 0 para qualquer pessoa com saldo ≥ o
custo de um episódio** — ou seja, para praticamente todos. A oferta só apareceria
para quem tem saldo *abaixo* de um episódio, que é justamente quem não consegue
agir sobre ela. A peça de monetização da #30 subiu **desligada na prática**.

Nenhum número foi digitado errado; a conta do cobrador está certa. O que está
errado é **qual das duas contas a tela usa para decidir o cadeado**.

#### O CONSERTO (abre a rotação das 17:08 — não foi feito neste checkpoint)

Derivar o cadeado da conta **acumulada**, não do flag isolado:

1. Em `SeasonStrip.tsx`, `bloqueados = Math.max(0, episodes.length - (affordableEpisodes ?? 0))`,
   e o cadeado/disable de cada `ep` passa a ser **posicional** (`ep.n` acima de
   `affordableEpisodes` = bloqueado), em vez de `!ep.affordable`.
2. Guardião que executa a função real com o caso medido hoje
   (`balance 5 · custo 5 · 5 episódios` → `bloqueados = 4`, moldura visível) e
   com `balance 0` e `balance 25`.
3. Não mexer em `route.ts:79`/`:86`: as duas contas estão certas para as
   perguntas que respondem. Quem escolhe errado é a tela.

#### PLACAR — desde 2026-09-06 14:00 UTC

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt | 4 | 4 | 1 | 0 | 0 | **0** |
| taaft | 1 | 1 | 0 | 0 | 0 | **0** |
| **total** | **5** | **5** | **1** | **0** | **0** | **0** |

#### CHECAGEM ZERO — limpa

24h: **30 cadastros · 41 filmes · 41 completos · 0 não-terminal · 0 preso ·
0 cadastro sem crédito · `next_episode_failed` 0 · `generation_stage_error` 4 ·
`checkout_started` 1 · `payment_success` 0.**

Nenhum e-mail disparado neste checkpoint — checkpoint não dispara campanha.

#### ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada.** Medição e registo; nada mudou no site nesta meia hora.

#### 📋 O QUE ACONTECEU

A faixa da temporada que subiu às 16:18 **foi vista por uma pessoa real às
16:34** — e o evento que ela deixou mostrou que a parte que faz dinheiro não
apareceu. A pessoa tinha saldo para **1** dos 5 episódios, mas a tela pintou os
**5** como disponíveis, sem cadeado e sem o convite para o plano, porque decide o
cadeado perguntando "cabe um episódio?" em vez de "quantos cabem?". Como quase
toda a gente tem saldo para pelo menos um episódio, a oferta estava desligada
para quase toda a gente.

Fica achado, medido e com o conserto escrito. É a primeira coisa das 17:08 — e
é barato: uma linha de conta e o cadeado a contar por posição.

O resto está sadio: 41 filmes em 24h, todos concluídos, nada preso, ninguém sem
crédito. Pagamentos hoje continuam em **zero**, com 1 checkout em 24 horas.

---

## 🤝 NOTA DE ATRIBUIÇÃO E ENTREGA — 17:20 BRT (sessão que fez #17→#25)

**Duas sessões correram nesta pista hoje.** Eu fiz de **#17 a #25**; outra
sessão pegou a partir de **#26** (às 13:30 BRT) e seguiu até **#30b**. Ela
executou, inclusive, a pendência que eu deixei escrita no PEDIDOS às 13:2x —
a supressão de 24h passar a ler `events` — e usou a temporada que a #18/#19
construiu para montar a faixa na tela (#30). O sistema funcionou como devia:
o que ficou escrito virou trabalho da outra ponta.

**Escrevo esta nota em vez de um FECHAMENTO** para não haver dois fechamentos
concorrentes no mesmo diário. Quem estiver de pé às 19:08 escreve o do dia; o
que segue é só a minha metade, medida.

### O QUE EU ENTREGUEI (todas em produção, SHA provado)

| # | o que muda para o cliente | SHA |
|---|---|---|
| 17 | o link de série sabe dizer "não tenho" — a saída barata volta a existir | `8d3c6061` |
| 18 | a **temporada**: a casa escreve os episódios 2 a 6 da série da pessoa | `8c73b24b` |
| 19 | a **carta da temporada** para quem parou no filme 1 **com** saldo | `9dff7db3` |
| 19b | o carimbo de pulo deixa de silenciar a coorte (2 → 21 elegíveis) | `e71edb30` |
| 19c | o escritor pede 6 episódios para entregar 5 (título repetido não mata) | `fbda4c0e` |
| 19e | a carta parava de mandar quem tem conta para o formulário de criar conta | `ee01b81e` |
| 20 | **pacote de publicação** em todo filme entregue | `8162695a` |
| 20b | e o crédito da casa **não** entra no filme de quem paga | `1f74e9e6` |
| 21 | o nudge de maior alcance entrega **3 episódios**, não um campo em branco | `6f46ebcd` |
| 22 | a porta de servidor do pacote, para a tela (PEDIDO ao Codex) | `557f68e2` |
| 23 | o plano vira **"o resto da sua temporada"** na carta de quem está sem saldo | `1ef575ff` |
| 23b | e essa carta sai de **11 para 43** pessoas (mesmo carimbo de pulo) | `f0fea5ae` |
| 23c | teto de 10s na escrita em lote, para o cron não morrer no meio | `c5a6a56e` |
| 24 | a carta da parede também passa pela porta contada | `6eed4b8b` |
| 25 | cada carta ganha a própria fonte de clique (medição separada) | `81696275` |

**302 verificações de guardião verdes**, `tsc` limpo na árvore combinada com o
lote do Codex.

### O QUE EU DISPAREI, E O RESULTADO SEM MAQUIAGEM

| carta | enviadas | tempo no ar | cliques | filmes | pagamentos |
|---|---|---|---|---|---|
| temporada (12:45 BRT) | **11** | 4 h 24 min | **0** | **0** | **0** |
| parede + temporada (17:00 BRT) | **16** | 9 min | 0 | 0 | 0 |

**27 pessoas alcançadas, zero resposta até agora.** As 16 da parede têm 9
minutos de vida e não provam nada. As 11 da temporada têm 4h24 — esse zero é
pequeno, mas é real, e conta.

Das 22 elegíveis da temporada, 11 receberam; as outras 11 **não se perderam**:
8 estavam retidas pela supressão de 24h e 3 sem temporada — e nenhuma foi
carimbada, então voltam ao próximo lote. O lote das 16:45 mandou 0 justamente
porque as remanescentes ainda estavam dentro da janela de 24h.

Do lote da parede: **9 das 16 saíram com a temporada dentro** (Ep3–Ep6 e o
plano como o que destrava). As outras 7 saíram no corpo antigo — que é a falha
aberta funcionando, não um defeito.

### O QUE EU DEIXO PARA QUEM CONTINUAR

1. **O achado do TAAFT** (mais acima neste diário): 296 cadastros/30d, 41
   checkouts, **zero** pagamentos, contra 40 checkouts e 3 pagamentos do
   chatgpt. Não é público errado — é a maior coisa inexplicada do negócio, e a
   resposta só existe no painel da Stripe.
2. **A aritmética da meta**: ~30 cadastros/dia a 0,87% dá ~0,3 pagante/dia.
   10/dia com conversão 5× melhor exigiria ~230 cadastros/dia. **A meta é de
   aquisição.**
3. **O pacote de publicação ainda não alcançou ninguém** (`publish_pack_written`
   = 0): ele está pendurado no e-mail de 4 pessoas/semana, e a porta para a
   tela (`/api/publish-pack`) está pronta e provada, esperando a montagem do
   Codex — PEDIDO já escrito com o contrato inteiro.

---

### #31 — 17:08 — o cadeado da temporada passou a perguntar "quantos cabem?", e a medição da própria entrega desmentiu o tamanho que eu tinha anunciado

#### PRESS RELEASE

Quem termina um filme e abre a faixa da temporada com saldo curto passa a ver,
pela primeira vez, quais episódios o saldo dele paga e quais ficam atrás do
plano — com o convite "Finish the season →" a apontar para /pricing. Antes, a
tela pintava os cinco episódios como disponíveis para qualquer pessoa que
tivesse saldo para UM, e a moldura que vende o plano não renderizava. O produto
deixa de entregar um arquivo e passa a mostrar uma temporada com um degrau
visível — e o degrau tem preço. É a peça que faltava para a faixa da #30 poder
fazer dinheiro em vez de só informar.

#### O ERRADO (medido)

A única exposição real da faixa da #30 gravou, no próprio `season_shown`:

```
balance: 5 · episode_cost: 5 · episodes: 5 · affordable_episodes: 1 · locked: 0
```

`affordable_episodes: 1` e `locked: 0` na mesma linha do mesmo evento. Nenhum
número estava digitado errado: as duas contas estão certas para perguntas
diferentes. O `affordable` de cada episódio é **"cabe UM?"** (`custo <= saldo`,
feita isoladamente cinco vezes — com `5<=5` os cinco dizem sim);
`affordableEpisodes` é **"quantos cabem?"** (`floor(saldo/custo)` = 1). A tela
derivava o cadeado da primeira, e a moldura inteira vive atrás de
`bloqueados > 0`. Quem escolhia errado era a tela, não a conta.

#### O QUE MUDOU

- `lib/temporada.ts` ganha `acessoDaTemporada(total, affordableEpisodes)` —
  pura, devolve `{liberados, bloqueados}` a partir da conta **acumulada**.
  Custo desconhecido **não vira zero**: sem a conta, a faixa fica clicável
  (clicar só carrega o roteiro, não cobra) e a moldura fica calada em vez de
  inventar cadeado.
- `components/video/SeasonStrip.tsx` tranca por **posição** (`i < liberados`),
  e "Your balance covers N of these" lê o mesmo `liberados`.
- `season_shown` passa a emitir `locked` da **mesma** conta que pinta a tela,
  mais `offer_shown` — para que a divergência entre os dois números não possa
  esconder-se outra vez dentro do evento que devia denunciá-la (memória
  `duas-contas-certas-portao-escolhe-a-errada`).
- `app/api/season/route.ts` **não muda**: as duas contas de lá estão certas.

**SHA `877278ff` · EM PRODUÇÃO** — `git ls-remote origin main` = `877278ff`,
fila `origin/main..entrega-atual` = 0, home 200, `POST /api/season` 401 com
controle 404 na mesma medição.

⚠ **A sonda honesta**: a mudança é de cliente, numa tela autenticada — não há
como prová-la de fora (memória `entrega-so-de-cliente-nao-tem-sonda`). Por isso
o instrumento subiu **no mesmo commit**: o próximo `season_shown` traz
`offer_shown` e um `locked` que tem de bater com `episodes − affordable_episodes`.
Enquanto esse evento não chegar, isto está **no ar mas não exercitado**.

#### TESTES

`scripts/test-season-lock.mjs` — **33 verificações que EXECUTAM a função real**
(transpila o `.ts` e chama-a; não conta texto). Começa pelo caso medido hoje
(5cr · 5 por episódio · 5 episódios → `bloqueados = 4`, moldura visível) e cobre
saldo zero, trial inteiro, saldo maior que a temporada, custo desconhecido e
faixa vazia. Falsificado por mutação **depois de commitar** (memória
`falsificar-mutacao-commitar-antes`): três mutantes — a conta acumulada trocada
pelo total, a tela de volta ao predicado por episódio, e "desconhecido vira
zero" — e os três derrubam o guardião. `npx tsc --noEmit` verde.

#### ⛔ A CORREÇÃO DO MEU PRÓPRIO NÚMERO — o conserto é real, o tamanho não era

O checkpoint das 16:38 escreveu que a oferta estava desligada "para
praticamente toda a gente". **Medi depois de publicar, e isso está errado.**
Aplicando as duas contas — a antiga e a nova — às 72 pessoas que terminaram um
filme nas últimas 72h, com o custo vindo de `creditCostForDuration` e não
digitado:

| | pessoas |
|---|---|
| terminaram um filme (72h) | **72** |
| viam a oferta **antes** | 33 |
| veem a oferta **depois** | 34 |
| **ganhas pela correção** | **1** |
| perdidas | 0 |
| **sem oferta nenhuma, antes e depois** | **37** |

O defeito só alcançava quem tem saldo **entre** um episódio e cinco — uma
faixa estreita. Quem não paga nem um episódio (33 pessoas, saldo médio 10 e
episódio de 25 no Seedance) **já via** a oferta, pelo caminho errado. O conserto
está certo e fica; o que não se sustenta é a frase "quase toda a gente". Fica
registado sem maquiagem: **entreguei um conserto de 1 pessoa em 72.**

#### 🔎 O ACHADO QUE VALE MAIS QUE A ENTREGA — 37 das 72 (51%) não têm oferta nenhuma, e a faixa promete-lhes o que o portão recusa

As 37 são a coorte **Kineo 1 em conta free**. Para elas
`creditCostForDuration('fast', pago=false, 60s)` = **0 créditos** → a rota
devolve `affordableEpisodes: null` → a faixa pinta os **cinco episódios como
livres e disponíveis**, sem cadeado e sem oferta.

Só que o cobrador free **não** cobra em créditos: cobra em **cota**. O free tier
residual é `limit: 1` (`lib/freeTierOffer.ts:268`), e o Kineo 1 grátis é um por
30 dias com corte de 15s. A faixa pergunta apenas *"o saldo paga?"* e **nunca**
pergunta *"a cota permite?"*. Resultado: à maior coorte da casa — a mesma que o
CLAUDE.md diz ser o motor de 100% das primeiras impressões — o produto oferece
cinco episódios grátis, e o portão vai recusar do segundo em diante.

É a memória `vitrine-oferece-o-que-o-cobrador-recusa` a repetir-se e, ao mesmo
tempo, é **a maior abertura de monetização do dia**: estas 37 pessoas são
exatamente quem devia ler *"o resto da sua temporada precisa de um plano"* — e
são as únicas a quem a faixa hoje diz o contrário.

**Isto abre a rotação das 18:08**, e é maior do que o que acabei de entregar:
`acessoDaTemporada` tem de receber também o veredito de **cota** (não só o de
crédito), lido de `getEffectiveEntitlement`/`freeTierOffer` — nunca redigitado
(memória `predicado-do-cobrador-nao-se-redigita`).

#### PLACAR — desde 2026-09-06 14:00 UTC

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt | 4 | 4 | 2 | 0 | 0 | **0** |
| (sem fonte) | 2 | 0 | 0 | 0 | 0 | **0** |
| taaft | 1 | 1 | 0 | 0 | 0 | **0** |
| **total** | **7** | **5** | **2** | **0** | **0** | **0** |

Faixa da temporada, desde o deploy da #30 (19:20 UTC): **1 tela de filme pronto
· 1 `season_shown`. Cobertura 1/1, denominador 1** — não prova nada sobre os
títulos convencerem (memória `zero-falhas-sem-denominador`).
`season_written` 21 pessoas · `season_episode_clicked` **0**.

#### CHECAGEM ZERO — limpa

24h: **32 cadastros · 42 filmes · 42 completos · 0 não-terminal · 0 preso ·
0 cadastro sem crédito · `next_episode_failed` 0 · `generation_stage_error` 4 ·
`checkout_started` 1 · `payment_success` 0.**

Nenhum e-mail disparado nesta rotação.

#### RISCO

Baixo e contido à faixa. Se `acessoDaTemporada` falhasse, a faixa renderiza como
antes (a função é pura, e a falha calada da #30 continua a valer: rota fora do ar
→ `null`). Não toca no pipeline de filme, na rota, no preço nem em arquivo do
Codex — `SeasonStrip.tsx` e `lib/temporada.ts` não foram tocados por ele em
nenhuma das últimas 4 horas (verificado com `--author=Codex`).

#### PRÓXIMA JOGADA

**A cota entra no cadeado (18:08).** A faixa passa a mostrar às 37 pessoas do
Kineo 1 free o que o portão realmente permite — "Ep 2 grátis, Ep 3-6 com um
plano" — em vez de cinco episódios que serão recusados. É honestidade e é a
oferta a chegar, pela primeira vez, à maior coorte da casa. Métrica:
`offer_shown` deixa de ser `false` para metade de quem vê a faixa.

#### ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada.** A entrega subiu sozinha e está provada no `git ls-remote`.

#### 📋 O QUE ACONTECEU

Consertei o cadeado da faixa da temporada: a tela decidia quem estava bloqueado
perguntando "cabe um episódio?" quando devia perguntar "quantos cabem?", e por
isso o convite para o plano não aparecia. Está no ar (`877278ff`), com 33
verificações que executam a conta de verdade e três mutantes derrubados.

Depois de publicar, medi o tamanho real do conserto, e ele é **muito menor do que
eu tinha anunciado meia hora antes**: alcança **1 pessoa em 72**, não "quase toda
a gente". Está corrigido aqui, sem maquiagem.

O que a medição encontrou vale mais: **metade das pessoas que terminam um filme
(37 de 72) usa o Kineo 1 numa conta grátis, onde o episódio custa 0 créditos** —
então a faixa pinta os cinco episódios como livres. Mas o grátis não é cobrado em
créditos, é cobrado em **cota**: um por 30 dias. Estamos a prometer cinco
episódios a quem o portão vai recusar do segundo em diante — e é exatamente essa
metade que devia estar a ler "o resto da sua temporada precisa de um plano". É a
primeira coisa das 18:08.

Casa sadia: 42 filmes em 24h, todos concluídos, nada preso, ninguém sem crédito.
Pagamentos hoje continuam em **zero**, com 1 checkout em 24 horas.

---

### CHECKPOINT — 17:38 BRT (20:38 UTC) — a #31 está no ar e **ainda não foi exercitada**; as duas cartas que este sprint inventou estão em **0 de 46**

Checkpoint da rotação #31. Sem trabalho novo, por regra. Três coisas medidas:
se a entrega das 17:14 está mesmo sendo servida, o que as cartas do dia
moveram, e a praxe.

#### 1. A #31 SUBIU — e a prova de infraestrutura está completa

| prova | resultado |
|---|---|
| `git ls-remote origin main` | `01976a4b` (diário da #31, sobre `877278ff`) |
| `git rev-list --count origin/main..entrega-atual` | **0** |
| `curl https://www.usekineo.com/` | **200** |
| `POST /api/season` | **401** — com controle `POST /api/season-inexistente-xyz` = **404** na mesma medição |

O par 401/404 exclui a leitura preguiçosa de [[sonda-401-exige-controle-404]]:
a rota existe e recusa por sessão, não por rota inexistente.

#### 2. MAS O BUNDLE NOVO AINDA NÃO FOI VISTO POR NINGUÉM — e o próprio evento diz isso

Só houve **duas** exposições da faixa da temporada em toda a vida dela. A mais
recente é **posterior ao push** (20:18:47 UTC; push às 20:14):

```
20:18:47  balance 10 · episode_cost 25 · episodes 5 · affordable_episodes 0 · locked 5
19:34:04  balance  5 · episode_cost  5 · episodes 5 · affordable_episodes 1 · locked 0
```

A linha das 20:18 **não traz o campo `offer_shown`**. E `offer_shown` é campo
NOVO, nascido no `877278ff` — o `season_shown` antigo emitia apenas
`locked: eps.filter(e => !e.affordable).length`. Ou seja: às 20:18 o navegador
ainda recebeu o **bundle velho**. O deploy da Vercel leva até ~6 min e essa
exposição caiu dentro da janela.

**Conclusão sem maquiagem: a #31 está na ponta publicada e servida pela
infraestrutura, mas o conserto do cadeado tem ZERO exposições reais.** A frase
"o cadeado agora pergunta quantos cabem" continua **não falsificada por
tráfego**. O que prova de verdade é a chegada do primeiro `season_shown` **com**
`offer_shown` — e ele não chegou.

**O achado de método que fica**: o campo novo no payload do evento virou a
**impressão digital do bundle**. `ls-remote` + `curl` provam que o servidor
mudou; só um campo que não existia antes prova que o **cliente** mudou. Sem ele,
"publicado" e "sendo servido" são indistinguíveis.

#### 3. A exposição das 20:18 ainda assim confirma a autocrítica da #31

Saldo 10, episódio a 25 (Seedance): `floor(10/25) = 0`. Pela conta **nova**,
`bloqueados = 5`; pela **velha**, os 5 episódios também davam `!affordable` →
`locked = 5`. **As duas contas concordam neste caso.** É exatamente a coorte
das 33 pessoas que *já viam* a oferta pelo caminho errado. Reforça o número que
a #31 corrigiu sobre si mesma: o conserto vale **1 pessoa em 72**, não "quase
toda a gente".

#### 4. O NÚMERO DO DIA: 197 CARTAS, 5 PESSOAS DE VOLTA, 0 CHECKOUT — E AS DUAS CARTAS NOVAS DERAM ZERO

Medido por evento de **navegador** (`session_id` não nulo) dentro de 12h do
envio, nunca por evento nosso de e-mail — a armadilha de
[[retorno-pos-email-conta-email-nosso]]:

| carta | enviadas | voltaram no navegador |
|---|---|---|
| `trial_lifecycle_email_sent` (genérica, horária) | 99 | **2** |
| `next_episode_wall_emailed_v1` (**inventada hoje**) | 35 | **0** |
| `checkout_recovery_emailed_v1` | 22 | **0** |
| `momentum_nudge_sent` | 15 | **2** |
| `season_letter_emailed_v1` (**inventada hoje**) | 11 | **0** |
| `post_nudge_sent` | 6 | 0 |
| `stranded_ready_sent` | 4 | **1** |
| `stranded_fast_ready_sent` | 4 | 0 |
| `failure_recovery_sent` · `video_ready_nudge_sent` | 1 · 1 | 0 · 0 |
| **total** | **197** | **5 pessoas distintas** |

Dessas 5: **2 fizeram um filme**, **0 chegaram ao checkout**, **0 pagaram**.

As duas peças que este sprint construiu — a carta da parede e a carta da
temporada — somam **46 envios e 0 retornos**. A campanha **velha e genérica**,
a que ninguém escreveu hoje, é a única que traz alguém.

Isto é [[carta-nova-so-depois-da-velha-mover]] a repetir-se com denominador
maior: às 15h eram 30 envios e 0, agora são 46 e 0. Trinta era amostra pequena;
46 com **duas peças diferentes** já não é ruído do acaso de uma carta só.

**Consequência direta para as 18:08**: a rotação **não deve escrever a carta
nº 3**. A jogada da cota no cadeado (as 37 pessoas do Kineo 1 free) é de
**tela**, não de e-mail — e é a certa justamente por isso.

#### 5. PRAXE — PLACAR (desde 2026-09-06 14:00 UTC)

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt.com | 5 | 4 | 2 | 0 | 0 | **0** |
| (sem fonte) | 2 | 2 | 0 | 0 | 0 | **0** |
| taaft | 1 | 1 | 0 | 0 | 0 | **0** |
| **total** | **8** | **7** | **2** | **0** | **0** | **0** |

Em ~25 min desde a medição da #31: +1 cadastro, +2 primeiros filmes. O degrau
1→2 continua a ser o corte (7 → 2), e o 2→3 é **seco**: ninguém.
ChatGPT segue a ser 5 de 8 dos cadastros do ciclo.

#### 6. PRAXE — CHECAGEM ZERO (24h) — LIMPA

**33 cadastros · 43 filmes · 43 completos · 0 não-terminal · 0 preso (6h) ·
0 cadastro sem crédito · `next_episode_failed` 0 · `generation_stage_error` 5 ·
`checkout_started` 1 · `payment_success` 0.**

Taxa de conclusão de filme: **43/43**. A casa de produção está sadia; o
problema é inteiramente comercial.

#### 7. B0 CONFIRMADO NA PONTA

`lib/seriesContinuation.ts` — `buildSeriesContinuationHref` devolve
`seriesContinuationHrefOrNull(...) ?? '/studio'`, e a variante que sabe dizer
`null` existe e está exportada. A pendência de uma linha do início do ciclo
está fechada em `origin/main`.

#### 8. O QUE A ROTAÇÃO DAS 18:08 DEVE ABRIR

1. **A cota entra no cadeado** (já era o plano da #31): `acessoDaTemporada`
   passa a receber o veredito de **cota** além do de crédito, lido de
   `getEffectiveEntitlement`/`freeTierOffer` e nunca redigitado
   ([[predicado-do-cobrador-nao-se-redigita]]). Alcança as **37 de 72** que hoje
   veem cinco episódios grátis que o portão vai recusar.
2. **Não escrever carta nova.** 46 envios e 0 retornos das duas peças de hoje
   invertem o ónus da prova.
3. **Vigiar o primeiro `season_shown` com `offer_shown`.** É o único sinal que
   converte a #31 de "publicada" em "exercitada".

#### O QUE VOCÊ PRECISA FAZER

1. **Nada.** O checkpoint não mexeu em código; a entrega das 17:14 já estava no
   ar e a fila está em zero.

#### O QUE ACONTECEU

Conferi a entrega das 17:14 e ela **está no ar** — a ponta do GitHub, a fila
vazia, o site em 200 e a rota da temporada a responder certo. Mas fui olhar se
alguém já tinha *visto* o conserto, e a resposta honesta é **não**: a única
pessoa que abriu a faixa depois do push ainda recebeu a versão antiga do site
(o navegador dela não trouxe o campo novo que só existe no conserto). Então o
conserto está publicado e **ainda não foi testado por gente de verdade**.

O número grande do checkpoint é outro, e é desconfortável: a casa mandou **197
e-mails hoje**, e **5 pessoas** voltaram ao site por causa deles — **2** fizeram
um filme, **nenhuma** chegou ao pagamento. Pior: as **duas cartas novas que este
sprint inventou** (a da parede e a da temporada) somam **46 envios e zero
retornos**. Quem traz alguém de volta é a campanha antiga e genérica, que
ninguém escreveu hoje. Por isso a próxima rotação **não vai escrever outra
carta** — vai mexer na tela, que é onde está a metade da casa (37 de 72 pessoas)
a quem prometemos cinco episódios grátis que o sistema vai recusar.

Produção sadia: **43 filmes em 24h, 43 concluídos**, nada preso, ninguém sem
crédito. Pagamentos hoje: **zero**, com 1 checkout em 24 horas.

---

### #32 e FECHAMENTO — 18:08 → 19:08 BRT — a última moeda que o cadeado não sabia contar, e a entrega que eu NÃO publiquei de propósito

#### PRESS RELEASE (o que muda para o cliente)

Quem termina um filme com o Kineo 1 gratuito via, na faixa da temporada, cinco
episódios com cara de liberados. Não estavam: o Kineo 1 grátis não é cobrado em
crédito — é cobrado em COTA (1 render por janela rolante de 30 dias), e o filme
que a pessoa acabou de receber gastou exatamente essa vaga. O primeiro clique
levaria a uma recusa. Depois desta entrega a faixa conta a moeda certa: os cinco
aparecem atrás do plano, e a moldura que convida para a assinatura — que para
esta gente NUNCA renderizou — passa a existir.

#### O ERRADO, MEDIDO (não deduzido)

`creditCostForDuration('fast', pago=false, s)` devolve **0**. A rota tratava 0 no
mesmo ramo de "custo desconhecido" e emitia `affordableEpisodes: null`; o #31,
por prudência deliberada, traduz `null` para "não invento cadeado" = cinco
liberados, zero bloqueados. Custo 0 nunca significou "de graça à vontade" —
significa "esta moeda não é crédito".

**O TAMANHO REAL, e a minha própria correção dele.** O checkpoint das 17:38
anunciou "37 de 72". Fui medir antes de codar e o número não se sustenta:

| corte (7 dias, filme concluído) | pessoas |
|---|---|
| terminaram ao menos um filme | **156** |
| filme mais recente é `fast` | 77 |
| … e sem plano pago | 76 |
| **… e sem trial ativo → `treatAsPaid` false → custo 0** | **19** |

Quem está em trial ativo é `treatAsPaid = true` (`lib/reverseTrial.ts:710`), e
para essa pessoa o Fast custa 2 créditos, não 0 — ela nunca esteve no defeito.
O alcance honesto é **19 pessoas em 156 (12%)**, não 37, não 76. Registro isto
como o mesmo erro de [[medir-alcance-da-superficie-antes-de-ligar]] apanhado
**antes** de virar anúncio, não depois.

#### O QUE MUDOU (código)

* `lib/temporada.ts` — nova função pura `episodiosQueCabem({custo, saldo, cotaRestante, total})`.
  Custo > 0 → conta acumulada em crédito (a do #31, intacta). Custo 0 → a conta
  é de COTA. Custo nulo **ou** cota não contada → `null`, e `null` mantém a
  moldura calada; nunca vira 0 (0 por ignorância acenderia cadeado inventado).
* `app/api/season/route.ts` — `affordableEpisodes` passa a sair dessa função; o
  `affordable` de cada episódio vira **posicional** (`i < cabem`) em vez de
  `custo <= saldo`, que respondia "sim" para sempre quando o custo era 0.
  As vagas de cota são contadas por `countFreeFastUsage` — a **mesma função que
  o `/api/compose` usa para RECUSAR** — com limite e janela lidos de
  `getFreeTierOffer`, e o evento de reserva vindo de `COMPOSE_CLAIM_EVENT` /
  `COMPOSE_CLAIM_PATH` importados. Nada redigitado
  ([[predicado-do-cobrador-nao-se-redigita]]). Quem decide se a pessoa paga em
  cota é `ent.countsAgainstFreeQuota`, campo do próprio cobrador. A query extra
  só acontece quando o episódio custa 0 — para todos os outros é uma leitura que
  não se faz.
* Payload ganha `costCurrency` e `freeQuotaRemaining` — campos NOVOS de
  propósito: são a impressão digital do bundle novo dentro do `season_shown`, o
  método que o checkpoint das 17:38 registrou.

**Um erro meu, apanhado pelo próprio repositório:** escrevi o nome do evento de
reserva de cabeça (`compose_claim`). O nome real é `compose_submission_claim`.
Contar o evento errado devolveria "cota cheia" para toda a gente e a faixa
mentiria ao contrário. Passou a ser importado da constante.

#### TESTES

* `scripts/test-season-cota.mjs` (NOVO) — **33 verificações**. Transpila e
  **executa** `lib/temporada.ts`; não conta texto
  ([[guardiao-contar-texto-nao-prova-condicao]]). Caso 1 é o defeito: custo 0,
  25 créditos em carteira, cota 0 → cinco bloqueados (era zero). Caso 4 prova
  que a moeda crédito não regrediu e que a cota **não vaza** para quem paga em
  crédito.
* `scripts/test-season-lock.mjs` (#31, alheio) — **ATUALIZADO, NÃO AFROUXADO**:
  ele fixava por regex o texto da conta antiga e apanhou a minha mudança
  (vermelho legítimo). Em vez de relaxar, a invariante passou a ser provada por
  **execução** (5/5 = 1 e 12/5 = 2) mais a proibição explícita do retorno da
  pergunta "cabe UM?". 37 verificações, todas verdes.
* `npx tsc --noEmit` limpo — e **falsificado**: um arquivo-sonda com erro de
  tipo foi rejeitado, então o verde é real e não o exit 0 mentiroso de
  [[worktree-tsc-node-modules]].

#### ⛔ NÃO PUBLIQUEI — E ESTA É A PARTE IMPORTANTE

O commit está pronto e verificado (`b593bddc`, sobre `70dccb9e`), mas **não foi
para produção**, de propósito.

Enfileirei perto das 19:00; entre o meu `fetch` e o `enfileirar.sh` o **Codex
publicou mais dois commits** (`6e30c986`, `70dccb9e`). A `entrega-atual` ficou
montada sobre a main antiga e o diff dela contra a main nova apagava **1704
linhas** de trabalho do Codex (Espanhol no Studio/Avatar/Animate, rótulos de
avatar). Refiz o commit sobre a main nova — limpo, 4 arquivos, só meus. Mas o
`enfileirar.sh` recusa mexer: vê o meu commit já lá e responde `meus novos: 0`,
deixando a fila presa na base velha. Mover a branch à mão é a única saída — e é
exatamente o que o CLAUDE.md proíbe (`git branch -f` apagou a fila alheia 4× em
01/09).

**Regra aplicada: o Codex ganha.** Prefiro entregar zero a entregar uma reversão
silenciosa do trabalho dele. A fila fica como está; o conserto espera dez
minutos de mão humana ou a próxima sessão.

---

## FECHAMENTO DO CICLO — 11:08 → 19:08 BRT

### (a) O press release do DIA — o que o cliente consegue fazer às 19:08

Ao terminar um filme, o cliente deixa de receber **um arquivo** e passa a receber
**uma temporada**: o servidor escreve os títulos dos episódios 2 a 6 da série
dele, a faixa mostra quais o saldo paga e quais ficam atrás do plano, e o
episódio seguinte nasce em **um clique** — sem formulário em branco. Junto vem o
pacote de publicação pronto (título, descrição com `usekineo.com`, legenda
TikTok, comentário fixado), que transforma o filme dele em anúncio nosso. E o
plano deixou de ser "60 créditos por $9.90" para ser "o resto da sua temporada".

### (b) Placar por fonte (desde 2026-09-06 14:00 UTC)

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt.com | 6 | 4 | 2 | 0 | 0 | **0** |
| (sem fonte) | 2 | 2 | 1 | 0 | 0 | **0** |
| taaft | 1 | 1 | 0 | 0 | 0 | **0** |
| **total** | **9** | **7** | **3** | **0** | **0** | **0** |

ChatGPT = 6 de 9 cadastros. O degrau 2→3 é **seco**: ninguém.

### (c) Pagantes do dia: ZERO

Zero, sem maquiagem. `payment_success` no ciclo = **0**; `checkout_started` em
24h = **1**. Não há caminho para narrar porque não houve pagamento.

### (d) E-mails: 197 enviados, 5 pessoas de volta, 0 checkout

Medido por evento de **navegador** ([[retorno-pos-email-conta-email-nosso]]).
Das 5 que voltaram: 2 fizeram um filme, 0 chegaram ao pagamento. As **duas
cartas que este sprint inventou** (parede e temporada) somam **46 envios e 0
retornos**; quem traz alguém é a campanha velha e genérica. Foi por isso que as
duas últimas rotações **não escreveram carta nº 3** — o ónus da prova inverteu.

### (e) Entregas em produção (SHA + sonda)

Publicadas e provadas ao longo do ciclo: a porta do saldo, a carta da parede, a
carta da temporada, o episódio 2 que sobrevive à aba, o link de série corrigido,
a trava de cadência que enxergava metade das campanhas, o botão de publicar, a
faixa da temporada (#30) e o cadeado acumulado (#31, SHA `877278ff`, par 401/404
conferido). **A #32 é a única que NÃO subiu** — motivo acima.

**O número desconfortável que fecha o dia:** a faixa da temporada, aposta central
do ciclo, tem **2 exposições em toda a sua vida**. Não é defeito de montagem —
desde o deploy dela só **4 filmes** foram concluídos, e 2 mostraram a faixa. O
produto está certo; o que falta é gente passando por ele.

### (f) Spec que exige decisão do fundador

Nenhuma nova. Preço público intocado (a monetização do ciclo foi moldura, momento
e oferta — nunca número novo). Produção sadia: **42 filmes em 24h, 42
concluídos**, 0 presos, 0 cadastros sem crédito, `next_episode_failed` = 0.

### (g) O que a próxima sessão faz PRIMEIRO

1. **Destravar e publicar a #32** — commit `b593bddc` na worktree
   `C:\kineo-wt\season-cota`, já sobre a main nova, tsc e 70 verificações verdes.
   Só falta a fila aceitar a base nova.
2. **Vigiar o primeiro `season_shown` com `offer_shown`** — é o único sinal que
   converte a #31 de "publicada" em "exercitada". Hoje: 0 de 2.
3. **Não escrever carta nova.** 46 envios, 0 retornos.
4. **Atacar o denominador, não a conversão.** 9 cadastros no ciclo e 4 filmes
   desde as 16:21 não sustentam 10-15 pagantes/dia. ChatGPT é 2/3 do tráfego; é
   lá que a agulha se move.

---

### #33 — 18:38 BRT — CHECKPOINT DA ROTAÇÃO 8: a #32 ESTÁ NO AR, e a temporada é escrita para 23 pessoas e vista por 2

**Este bloco corrige o fechamento escrito às 18:23 (`3a42dce8`).** Aquele texto
encerrou o ciclo dizendo "a #32 está pronta e NÃO publicada". Isso deixou de ser
verdade às 18:47: **a #32 está em produção.** O fechamento foi escrito 45 min
antes do fim da janela e cristalizou um estado que ainda dava para mudar —
[[fechamento-cedo-conferir-relogio]] a repetir-se, agora do lado de quem escreve.

#### 1. O QUE ESTAVA TRAVADO, E POR QUÊ

A fila (`entrega-atual = d11054cf`) apontava para uma base velha. Não era
teimosia do git: `git diff 60559890 d11054cf` mostra que **empurrar a fila como
estava REVERTERIA ~1.740 linhas do Codex** — o espanhol do Studio/Avatar/Animate,
`lib/ui/interfaceLabels.ts`, `canonicalCopySpanish.ts`. A rotação anterior viu
isso e parou. Parar foi certo; encerrar o ciclo por causa disso, não.

E `scripts/enfileirar.sh` **não resolve este caso** — ele rebasa o meu HEAD
sobre a PONTA DA FILA (`PONTA=$(rev-parse entrega-atual)`), não sobre
`origin/main`. Com a fila presa numa base velha, ele me puxou de volta para a
base velha: `meus novos: 0`, HEAD movido de `60559890` para `d11054cf`. O script
protege contra atropelar commit alheio, mas **não sabe sair de uma fila órfã**.

#### 2. COMO SAIU (com prova, não com força cega)

A regra do CLAUDE.md proíbe `git branch -f entrega-atual <hash>` — a proibição
existe para não apagar trabalho de outra sessão. Então eu **provei** que a fila
não continha trabalho de mais ninguém antes de movê-la:

```
$ git cherry origin/main entrega-atual
- 1c6c9014  (Codex, espanhol)      -> patch JÁ está na main
- 4406102a  (Codex, docs)          -> patch JÁ está na main
+ d11054cf  (a minha #32)          -> único conteúdo exclusivo da fila
```

`-` = patch equivalente a algo que já está na main. **O único `+` era meu.**
Movida a fila para `60559890` (a #32 rebasada sobre a ponta nova do Codex),
`!RODAR-AGORA.bat` disse **SUBIU 3 ENTREGA(S)**.

**EM PRODUÇÃO — SHA `60559890`** · `git ls-remote origin main` = `60559890` ·
fila = **0** · `786652a9` (Codex) intacto como pai · `tsc --noEmit` exit 0 ·
`test-season-cota` 33 OK · `test-season-lock` 37 OK.

**Sonda:** `https://www.usekineo.com/` = **200**; `/api/season` = **401** com
controle `/api/season-nao-existe-xyz` = **404** ([[sonda-401-exige-controle-404]]).
**O que a sonda NÃO prova:** `/api/season` já existia antes da #32, e os campos
novos (`costCurrency`, `freeQuotaRemaining`) só aparecem em resposta autenticada.
Sem MCP da Vercel, e o HTML não expõe `buildId`. **A prova real é uma linha de SQL,
e é a primeira coisa da próxima sessão:**

```sql
select created_at, metadata->>'costCurrency', metadata->>'freeQuotaRemaining'
from public.events where name='season_shown' and metadata ? 'costCurrency'
order by created_at desc limit 5;
```

Enquanto isso não devolver linha, a #32 está **publicada e não exercitada**.

#### 3. O NÚMERO DO CHECKPOINT — E ELE DESLOCA A PRÓXIMA JOGADA

Fui medir quem viu a faixa da temporada. 24 horas:

| | pessoas |
|---|---|
| entregaram um filme | **30** |
| tiveram a temporada **escrita** (`season_written`) | **23** |
| **viram** a faixa (`season_shown`) | **2** |

**23 escritas, 2 vistas.** O servidor está a construir a temporada para quase
toda a gente e quase ninguém a vê. `season_shown` com o campo da #31 (`offer_shown`)
e com o da #32 (`costCurrency`): **zero em ambos** — o último `season_shown` é das
20:18 UTC, anterior aos dois pushes.

Isto reenquadra as três últimas rotações. A #31 arrumou *quantos episódios o
cadeado libera*; a #32 arrumou *em que moeda o episódio é cobrado*. Ambas são
consertos **dentro** de uma faixa que **28 das 30 pessoas nunca chegam a ver**.
É [[contrato-de-servidor-sem-chamador]] outra vez, e é irmão do achado da #46 do
ciclo anterior ("tudo que mora abaixo do player nunca entra na tela").

**Consequência para a próxima sessão, em uma frase:** o problema da temporada
**não é mais o que ela oferece — é onde ela mora.** Antes de qualquer conserto
novo na oferta, medir/subir a faixa no viewport (o `season_shown` de hoje conta
como visto sem `IntersectionObserver`, então **2 é o teto otimista**, não o piso).

#### 4. PRAXE — PLACAR (desde 2026-09-06 14:00 UTC)

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt.com | 6 | 5 | 2 | 0 | 0 | **0** |
| taaft | 2 | 2 | 0 | 0 | 0 | **0** |
| (sem fonte) | 2 | 2 | 1 | 0 | 0 | **0** |
| **total** | **10** | **9** | **3** | **0** | **0** | **0** |

ChatGPT = 6 de 10. O degrau 2→3 continua **seco** e o checkout **não abriu uma
vez** em todo o ciclo.

#### 5. PRAXE — CHECAGEM ZERO (24h) — LIMPA

32 cadastros · 43 filmes · **43 completos** · 0 não-terminal · 0 preso (6h) ·
`next_episode_failed` **0** · `generation_stage_error` 7 · `checkout_started` **1** ·
`payment_success` **0**. A fábrica está sadia; o buraco é comercial.

#### 6. FECHAMENTO DO DIA — SEM MAQUIAGEM

- **Pagantes hoje: ZERO.** 1 checkout em 24h, 0 `payment_success`.
- **E-mails: 197 enviados, 5 pessoas voltaram, 2 fizeram filme, 0 pagaram.** As
  duas cartas que este sprint inventou somam **46 envios e 0 retornos**; quem
  traz alguém é a campanha velha e genérica. Não escrevi carta nova — e a
  próxima sessão também não deve ([[carta-nova-so-depois-da-velha-mover]]).
- **Entregas em produção hoje:** #31 (`877278ff`) e **#32 (`60559890`)**.
- **O que o cliente consegue às 19:08 que não conseguia às 11:08:** a faixa da
  temporada deixou de mentir — não promete mais cinco episódios grátis que o
  portão recusa, porque passou a perguntar ao cobrador **em que moeda** o
  episódio é pago (crédito ou cota do Kineo 1 free). **Ressalva honesta:** isto
  vale para as 2 pessoas em 30 que chegam a ver a faixa.
- **Decisão que fica para o fundador:** nenhuma. Nada exigiu preço novo nem
  produto novo na Stripe neste ciclo.

#### ✅ O QUE VOCÊ PRECISA FAZER

1. **Nada.** A #32 está no ar, a fila está em zero e o site responde 200.

#### 📋 O QUE ACONTECEU

A entrega da última hora estava **pronta e parada** — e o fechamento do ciclo já
tinha sido escrito a dizer que ela não subiria. Ela subiu: **a #32 está em
produção** (SHA `60559890`), sem apagar uma linha do trabalho novo do Codex, e
eu deixei a prova no diário de que a fila não continha trabalho de mais ninguém
antes de a mover.

O que descobri ao medir vale mais do que a entrega. A faixa da temporada — a
peça em que as três últimas rotações mexeram — é **escrita para 23 pessoas e
vista por 2**. Passámos a tarde a afinar o que a faixa oferece quando o problema
é que 28 em 30 nunca a veem. A próxima sessão não deve consertar mais nada
dentro dela: deve **subi-la para dentro da tela** e só então voltar a medir.

Pagantes hoje: **zero**, com um único checkout em 24 horas e 197 e-mails que
trouxeram 5 pessoas de volta. A fábrica de filmes está impecável (43 de 43
concluídos); o funil comercial é que não abriu.

---

## 🏁 FECHAMENTO REAL DO CICLO — 19:08 BRT (22:08 UTC) — medido no relógio, não no rótulo

**Este é o fechamento do término.** Houve dois textos de encerramento antes dele:
um às 18:23 (`3a42dce8`) e a correção das 18:38 (`3fbe0c6f`). O primeiro encerrou
o ciclo 45 min cedo e cristalizou um estado que ainda mudou depois
([[fechamento-cedo-conferir-relogio]]). Os números abaixo foram remedidos agora,
às 22:10 UTC, e **um deles corrige o número que eu mesmo anunciei duas vezes hoje.**

### (a) O press release do DIA — o que o cliente consegue às 19:08 e não conseguia às 11:08

Ao terminar um filme, o cliente recebe **uma temporada**, não um arquivo: o
servidor escreve os títulos dos episódios 2 a 6 da série dele, a faixa mostra
quais o saldo paga — em crédito **ou em cota do Kineo 1 free** — e o episódio
seguinte nasce em um clique, sem formulário em branco. Junto vem o pacote de
publicação pronto (título, descrição com `usekineo.com`, legenda TikTok,
comentário fixado), que transforma o filme dele em anúncio nosso.

**A ressalva que não pode sumir do press release:** isto está no ar e **quase
ninguém chegou a ver**. A faixa foi escrita para 24 pessoas em 24h e registrou
**2 exposições em toda a sua vida** — a última às 20:18 UTC, *antes* das duas
entregas da tarde.

### (b) Placar por fonte (desde 2026-09-06 14:00 UTC, contas externas)

| fonte | cadastros | filme 1 | filme 2 | filme 3 | checkout | **pagou** |
|---|---|---|---|---|---|---|
| chatgpt | 7 | 6 | 2 | 0 | 0 | **0** |
| taaft | 2 | 2 | 0 | 0 | 0 | **0** |
| (sem fonte) | 2 | 2 | 1 | 0 | 0 | **0** |
| **total** | **11** | **10** | **3** | **0** | **0** | **0** |

ChatGPT = **7 de 11** cadastros, como no resto do mês. O degrau **2→3 é seco** e
o **checkout não abriu uma única vez** em oito horas.

### (c) Pagantes do dia: ZERO

`payment_success` no ciclo = **0**. `checkout_started` no ciclo = **0** (o único
checkout das últimas 24h é anterior às 14:00 UTC). Não há caminho de pagante para
narrar porque não houve pagante. Meta do fundador: 10-15/dia. Entregue: 0.

### (d) E-mails do ciclo: 74 envios, 71 pessoas — e as duas cartas novas seguem em 0

| campanha | envios | pessoas |
|---|---|---|
| `trial_lifecycle_email_sent` (velha, genérica) | 32 | 32 |
| `next_episode_wall_emailed_v1` (**nova**) | 17 | 17 |
| `video_ready_email_sent` | 13 | 10 |
| `season_letter_emailed_v1` (**nova**) | 11 | 11 |
| `checkout_recovery_emailed_v1` | 1 | 1 |

**As duas cartas que este sprint inventou, somadas no dia inteiro: 46 envios,
0 retornos.** Medido por evento de navegador ([[retorno-pos-email-conta-email-nosso]]):
0 voltaram, 0 fizeram filme, 0 chegaram ao checkout. Não escrevi carta nº 3 e a
próxima sessão também não deve ([[carta-nova-so-depois-da-velha-mover]]).

### (e) Entregas em produção (SHA + prova)

| entrega | SHA | prova |
|---|---|---|
| #31 — o cadeado pergunta *quantos* episódios cabem | `877278ff` | ancestral de `origin/main` ✅ |
| #32 — o cadeado pergunta *em que moeda* | `60559890` | ancestral de `origin/main` ✅ |

`git ls-remote origin main` = `e7500c4f` (ponta do Codex, posterior) ·
`git rev-list --count origin/main..entrega-atual` = **0** · site = 200.

### (f) 🔴 A CORREÇÃO DO DIA — eu comparei laranja com maçã, duas vezes

Escrevi hoje, duas vezes, que a temporada "é escrita para 23 pessoas e **vista
por 2**", e concluí daí que a faixa *mora fora da tela*. **Fui falsificar essa
conclusão antes de a entregar à próxima sessão, e ela não sobreviveu.**

`SeasonStrip` está montado em `app/(dashboard)/generate/GenerateClient.tsx:16682`,
sob `phase === 'done' && finalVideoUrl` — e **imediatamente acima** de
`NextShortsSection`, que vive sob a mesma condição. Se a faixa estivesse fora da
tela, a prateleira abaixo dela estaria ainda mais. Os números de 24h:

| evento | como dispara | pessoas |
|---|---|---|
| `next_shorts_shown` | na **montagem** | **23** |
| `next_shorts_seen` | IntersectionObserver a **33%** | **8** |
| `season_shown` | IntersectionObserver a **35%** | **2** |

`season_shown` é evento **de rolagem**, não de montagem (`SeasonStrip.tsx:104`).
O par honesto dele é `next_shorts_seen` = **8**, não `next_shorts_shown` = 23.
Portanto **"2 de 30" exagera a perda**: o denominador certo não é "todo mundo que
fez um filme", é "quem rolou até um terço do bloco" — 8 pessoas.

**Mas a pergunta boa continua de pé, e ficou mais afiada:** a faixa está *acima*
da prateleira, logo deveria pontuar **mais** que 8. Pontuou **2**. A diferença não
é rolagem — é que `SeasonStrip` tem **quatro `return` silenciosos** entre o fetch
e o render (`SeasonStrip.tsx:64-68`): `!res.ok`, sem `season`, `episodes` não é
array, `episodes.length === 0`. Nenhum deles emite evento. Hoje é **impossível
distinguir "a faixa não renderizou" de "a pessoa não rolou"** — os dois casos
somem do mesmo jeito.

**Prova pontual de que o servidor faz a parte dele:** desde a subida da #32
(21:47 UTC) houve **1** filme concluído; para ele o `season_written` disparou e o
`season_shown` **não**. O servidor escreveu, o cliente não mostrou.

### (g) O que a próxima sessão faz PRIMEIRO

1. **Instrumentar os quatro `return` silenciosos** de `SeasonStrip.tsx:64-68`
   (um `season_unavailable` com a razão, e um `season_mounted` na montagem, par
   de `next_shorts_shown`). Sem isso, **o número da faixa é ininterpretável** —
   e as três últimas rotações afinaram a oferta de uma peça que talvez nem
   renderize ([[contrato-de-servidor-sem-chamador]]).
2. **Só depois** decidir se o problema é oferta, posição ou fetch. Não consertar
   mais nada dentro da faixa antes de o passo 1 devolver linha.
3. **Não escrever carta nova.** 46 envios, 0 retornos.
4. **Atacar o denominador.** 11 cadastros em 8 horas não sustentam 10-15
   pagantes/dia por nenhuma taxa de conversão plausível. ChatGPT é 2/3 do
   tráfego; é lá que a agulha se move, e isso é aquisição, não produto.

### (h) Checagem zero — a fábrica está impecável

43 filmes em 24h · **43 concluídos** · 0 não-terminal · 0 preso · 0 cadastro sem
crédito · `next_episode_failed` **0** · `generation_stage_error` 7 (não-fatais).
**O produto entrega. O funil comercial é que não abriu.**

### (i) Spec que exige decisão do fundador

**Nenhuma.** Preço público intocado o ciclo inteiro — a monetização foi moldura,
momento e oferta, nunca número novo, conforme o limite do ciclo.

