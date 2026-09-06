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
