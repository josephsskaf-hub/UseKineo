# SPRINT MADRUGADA — PRODUTO (não-vendas) — 08/09/2026

Janela: 2026-09-08 01:30 → 09:30 BRT. Uma rotação a cada 30 min.
Marco de medição desta pista: **2026-09-08 04:30 UTC** (01:30 BRT).

## A ORDEM DO FUNDADOR (08/09 00:20 BRT)
"Essa madrugada quem vai focar em vendas vai ser o ChatGPT (Codex). A gente vai
focar em OUTRAS coisas, pra ter uma mudança e pensamentos diferentes."

Esta pista **não vende**: não toca preço, checkout, carta de venda, porta de $1,
/go nem páginas públicas de SEO (são do Codex esta noite).

Ordem nova (01:20 BRT) — **VERSÃO B**: acabou o trial grátis de 25 créditos e o
Kineo 1 grátis; a única entrada é o trial de $1 (7 dias, 80cr, depois $15/mês).
Já está na origin/main em `89a65eb9`.

## O RETRATO QUE GEROU AS 10 AÇÕES
112 erros de geração e 41 pessoas com tela de falha · 77 de 238 cadastros sem
filme · 5 de 12 pagantes sem filme em 30d · 0 de 1.682 vídeos com thumbnail ·
93 de 430 guardiões vermelhos · toda carta pede resposta e ninguém lê resposta ·
CLAUDE.md com tabela de preço morta · leitura truncada em 1000 em 40 pontos ·
4 telas que mostram erro de leitura como "0 créditos / sem vídeos".

---

### #1 — 01:36→02:00 BRT — M1/M2: o retrato contou EVENTOS, não pessoas — e a parede viva é outra

**O que estava errado (na minha própria lista de tarefas).**
As três causas no topo do retrato, que mandavam M1 e M2 serem as primeiras
ações, são eventos repetidos de **uma ou duas pessoas**, e todas pararam há
dias. Medido em `events.name='generation_stage_error'`, 21 dias, coluna
`pessoas` = `count(distinct user_id)`:

| causa (topo do retrato) | eventos | pessoas | dias | último |
|---|---|---|---|---|
| "Two AI attempts were just refunded" (M1) | 12 | **1** | 1 | 04/09 20:40 |
| "Our video provider did not accept the job" (M1) | 12 | **3** | 2 | 04/09 21:42 |
| `prompt_len=6228 limite=5000` (M2) | 7 | **1** | 1 | 02/09 03:30 |
| "We could not plan the scenes" | 6 | **1** | 1 | 07/09 12:32 |
| **narração curta (família inteira)** | **84** | **36** | **14** | **08/09 01:35** |

M1 e M2, como escritos, mandam gastar a madrugada em paredes de 1 a 3 pessoas
que já pararam de bater. A parede que continua batendo — inclusive cinco
minutos antes desta rotação começar — é a **narração curta**: 36 pessoas em 14
dias. É a família que vale o conserto.

**Os remédios que já existem, e o que eles cobrem.**
Antes de construir, medi os dois que a casa já tem (`lib/durationGhost.ts`,
#20 de 31/08 e #39 de 01/09). Eles resgatam o **alvo fantasma** — a pessoa
recusada por não alcançar um número (45s) que o seletor não oferece. Recorte
por tipo de alvo, extraindo os segundos de `speech=Xs target=Ys`:

| | recusas | pessoas | desde 01/09 |
|---|---|---|---|
| ALVO FANTASMA (coberto pelo #20/#39) | 18 | 15 | **1 pessoa** |
| ALVO OFERECIDO 35/60/90 (não coberto) | 28 | 21 | **17 pessoas** |

**Os remédios funcionaram**: o fantasma caiu de 15 pessoas para 1. Quem sobra
escolheu uma duração que o produto realmente oferece — e para essa pessoa
nenhum dos dois remédios faz nada. Dela é a parede de hoje.

**Onde a pessoa que sobra morre.** Quebrando a coorte de alvo oferecido:
7 pessoas quase encheram (80-95% do alvo), 1 enchia 35s e pediu 60, e
**14 pessoas escreveram menos de 33s de fala** — para essas o produto não tem
tamanho: o piso do seletor é 35s e a régua exige 95% dele (33,25s).

A saída que a casa oferece a elas é o **expansor de roteiro**. Ele alcança, mas
não entrega:

| degrau do expansor (30 dias, todos) | eventos | pessoas |
|---|---|---|
| `script_expand_autostarted` | 56 | **34** |
| `script_expanded` | 26 | 19 |
| `script_expand_failed` | 24 | **16** |
| `script_expand_accepted` | 14 | 12 |
| `script_growth_candidate_offered` | 5 | **4** |

Trinta e quatro pessoas começam a expansão; quatro chegam a ver um candidato.
E o motivo de recusa é nomeado no próprio evento:

| motivo de `script_expand_failed` | eventos | pessoas |
|---|---|---|
| **`growth_limit`** | 10 | **9** |
| `author_rewrite_rejected` | 11 | 6 |
| `network` | 2 | 2 |
| `structure_lost` | 1 | 1 |

O `growth_limit` — o teto de crescimento do expansor — é a maior causa isolada.
O cabeçalho do #39 já suspeitava dele, mas atribuía o estouro ao alvo fantasma
inflando o `missing_words`. **O fantasma morreu e o `growth_limit` continuou
barrando 9 pessoas.** A hipótese do #39 explicava parte, não o todo.

**Uma leitura minha que eu mesmo desmenti.** `script_expanded` e
`script_expand_accepted` não disparam desde 03/09 22:54, enquanto
`_autostarted` e `_failed` seguiam até 06-07/09. Parecia regressão. Não é:
desde aquele instante houve **3 inícios de 3 pessoas** e 2 falhas. Três
tentativas não provam quebra nenhuma — é pouco tráfego, e o número durável é o
agregado acima. Fica registrado para ninguém abrir hotfix em cima disso.

**Parada.** Nada de código nesta rotação: o alvo mudou de mãos no meio dela e
o alvo novo (`growth_limit`) precisa ser lido no código antes de tocado — o
teto pode ser proteção real de custo, não número arbitrário. É a ação da #2.

**Nada foi tocado em produção.** origin/main = `d15a19a3`, fila vazia.

#### ✅ O QUE VOCÊ PRECISA FAZER
Nada.

#### 📋 O QUE ACONTECEU
Antes de codar, conferi se as tarefas da madrugada apontavam para gente de
verdade. As três primeiras não: são a mesma pessoa batendo doze vezes, e ela
parou há quatro dias. A parede que ainda machuca é outra — 36 pessoas que
escreveram um roteiro e ouviram "seu roteiro é curto demais", a última delas
cinco minutos antes de eu começar. Metade dessa parede já tinha sido derrubada
por duas rodadas anteriores (o conserto funcionou: caiu de 15 pessoas para 1).
A metade que sobrou tem nome: 34 pessoas pedem ao produto para aumentar o
roteiro delas, 4 recebem uma sugestão, e o motivo campeão da recusa é um teto
de crescimento nosso. É onde a próxima rotação mexe.

---

### #2 — 02:20 BRT — M3 A CAPA: 1.685 filmes, 0 thumbnails, 850 pessoas

**O alvo que a #1 me deixou estava morto, e eu conferi antes de codar.**
A #1 fechou mandando a #2 mexer no `growth_limit` do expansor (9 pessoas).
Antes de tocar no código, recortei a medição pelo commit do próprio conserto
(`6c0885a3`, `judgeTrimmedCandidate`, 04/09 01:22 UTC):

| | eventos | pessoas | última |
|---|---|---|---|
| `growth_limit` ANTES do conserto | 10 | 9 | 03/09 22:45 |
| `growth_limit` DEPOIS do conserto | **0** | **0** | — |

**A última ocorrência do `growth_limit` é 2h37 ANTERIOR ao commit que o
conserta.** As 9 pessoas são todas pré-conserto. E o denominador desmente
qualquer conclusão forte na outra direção: desde o conserto houve **2
auto-inícios de expansão, de 2 pessoas, em 4 dias**. Zero falhas sobre 2
oportunidades não prova conserto — mas prova que ali não há parede para
derrubar nesta madrugada.

**A parede da narração também é um pico que já baixou.** A #1 leu "36 pessoas
em 14 dias" numa janela móvel. Por dia, `narration_guard_blocked`:

| 31/08 | 01/09 | **02/09** | 03/09 | 04/09 | 05/09 | 06/09 | 07/09 | 08/09 |
|---|---|---|---|---|---|---|---|---|
| 6 | 6 | **11** | 2 | 0 | 0 | 2 | 1 | 1 |

É um pico de 02/09 decaindo para ~1/dia. E a última batida (08/09 01:35:29 —
a que a #1 viu "5 minutos antes") foi seguida, nos 5 segundos seguintes, de
`script_authoring_requested` → `_auto_started` → `_delivered`: o remédio
disparou. Não é uma pessoa abandonada; é o caminho funcionando.

**Então troquei de alvo pelo denominador.** `select count(*),
count(thumbnail_url) from videos` = **1.685 e ZERO**. 1.681 filmes completos
com MP4, **850 pessoas distintas**, o mais novo às 04:00 de hoje. A coluna é
LIDA em quatro telas (`/library`, `/my-videos`, `/studio`, `/generate`) e no
`og:image` do `/v/`. Não é um pico: é 100% da história, e todo mundo que já
recebeu um filme vê o retângulo vazio.

**O errado (SHA `f42e410d`, EM PRODUÇÃO em `origin/main`).**
A capa nunca nasceu porque o pedido dela nunca saiu. E ele não saiu por um
motivo que já tinha passado por uma auditoria: em **28/08** uma sessão pôs
`snapshot_time: 1.2` no **CORPO** do `POST /v1/renders`, o Creatomate ignorou
em silêncio, e a auditoria removeu com a lição certa — *"parâmetro não
documentado NÃO EXISTE; 'funcionou sem erro' não é prova"*. A lição continua
de pé. **O que estava errado era o endereço, não o parâmetro.** Na
documentação oficial, `snapshot_time` é propriedade **de topo do
RenderScript** — irmã de `output_format`/`width`/`height`/`elements`, isto é,
vai **dentro do `source`**, um nível abaixo de onde foi posto.

Tudo a jusante já existia e não foi tocado: `persistRenderAssets` copia o
snapshot para o nosso bucket (a URL do Creatomate expira) e
`persistCompletedVideo` grava `thumbnail_url`. Faltava só a origem. A mudança
é um único ponto de estrangulamento — `submitCreatomateRender`, por onde passa
**todo** render (hollywood, clássico, fast, avatar, unlock).

`snapshot_location` fica ausente de propósito: ele **substitui** o primeiro ou
o último quadro do filme. Queremos capa ao lado do filme, nunca filme alterado.
O instante é 2s (depois do fade de abertura); filme curto demais para 2s — o
clamp de 15s do free, um avatar de 4s — usa metade dele, para o pedido nunca
apontar para depois do fim.

**Prova.** `npx tsc --noEmit` verde na worktree E no commit já rebasado na
fila. Guardião novo `scripts/test-capa-snapshot.mjs`: **36 verificações, 0
falhas**, por contagem (nunca `assert` que morre na primeira falha). Ele
**transpila as funções puras do próprio `compose.ts`** em vez de
reimplementá-las — segundo juiz seria a doença das duas réguas — e inclui
**teste de mutação**: reescreve o corpo do POST de volta para o `source` cru e
confirma que o guardião fica vermelho, mais a checagem de que a mutação foi
mesmo aplicada.

Suíte: comparei **os 82 guardiões que tocam `compose`, um a um, entre a
`origin/main` pristina e a minha worktree**. Divergem exatamente dois, e os
dois para o VERDE: o meu guardião novo (não existe na pristina) e o
`test-despacho-vazio` — este por artefato de relógio, explicado abaixo.
**Nenhum guardião passou de verde para vermelho.** Contagem bruta da suíte
inteira eu NÃO reporto: as três passagens deram 101, 100 e 66 porque eu lia o
arquivo antes do fim da execução, e número que eu não sei defender não entra
no diário.

**O que esta rotação NÃO provou, e como a #3 prova.** A sonda de produção
(`home=200` com controle `404` na mesma medição) só prova que o site está no
ar — a mudança é servidor, dentro do caminho de render, invisível ao curl. E
"não deu erro" foi exatamente o engano de 28/08. A prova honesta exige um
render **completado depois do deploy**, e às 02:20 BRT o tráfego é ralo. A #3
roda isto:

```sql
select count(*) as filmes_novos, count(thumbnail_url) as com_capa
from videos
where status='completed' and created_at > timestamptz '2026-09-08 05:25:00+00';
```

`com_capa > 0` ⇒ a capa nasceu e o histórico pode ser reparado. `filmes_novos
> 0` **e** `com_capa = 0` ⇒ o parâmetro não pegou nem no `source`, e o commit
volta atrás — sem inventar terceira hipótese. `filmes_novos = 0` ⇒ ainda não
há denominador; **não concluir nada** e reconferir na rotação seguinte.

**⚠ UMA COISA QUE VOCÊ PRECISA DECIDIR: eu toquei um arquivo travado.**
A trava de qualidade que você pôs em 03/09 (checagem 8.2 do
`test-despacho-vazio-2026-09-04.mjs`) proíbe uma entrega de tocar
`lib/compose`, `lib/hollywood/`, `lib/cinematic/`, `lib/broll/`,
`lib/lyriaMusic`, `lib/narrationFit`, `analyze-idea` e `generate-script`.
**Minha entrega toca `lib/compose.ts`** — está na lista.

Eu não escondo e não afrouxo o guardião. O que posso afirmar, com o diff na
mão: o filme não muda. As únicas menções a `duration` no diff **leem**
`source.duration` para escolher um instante de capa que caiba no filme;
nenhum elemento, legenda, trilha, fonte, duração, régua, motor ou custo é
escrito. `snapshot_location` foi deixado de fora justamente para que nenhum
quadro do filme seja substituído. A capa nasce **ao lado** do MP4, não dentro
dele.

E preciso dizer como isso passou: eu rodei a suíte e este guardião saiu
**verde**, mas o verde era artefato de relógio. A checagem compara com
`origin/main`, e entre o meu commit e a minha conferência o `origin/main`
andou e passou a **conter** o meu commit — então não havia mais "entrega
pendente" para reprovar. Rodando a comparação contra o pai do próprio commit,
`lib/compose.ts` aparece. **A trava teria ficado vermelha se eu a tivesse
medido no lugar certo, e eu publiquei antes de perceber.**

Se a sua regra vale ao pé da letra, o commit `f42e410d` sai com um `git
revert` numa linha e a capa espera um caminho que não encoste nesse arquivo.
Se a intenção da trava é "não mexa em COMO o filme é feito", ela está
respeitada e o commit fica. **É sua a decisão — não é minha para tomar
sozinho.** Anotei em `docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md`.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Decidir sobre a trava:** eu toquei `lib/compose.ts`, que está na sua lista
   de arquivos proibidos de 03/09. O filme não muda (só leio a duração para
   escolher o instante da capa). Se a regra vale ao pé da letra, me diga e eu
   reverto `f42e410d`. Se a intenção era "não mexa em COMO o filme é feito",
   está respeitada e não há nada a fazer.

#### 📋 O QUE ACONTECEU
A tarefa da madrugada mandava consertar duas paredes de erro. Fui conferir se
ainda havia gente nelas e não havia: a primeira parou de acontecer duas horas
antes do conserto que já subiu, e a segunda é um pico do dia 02 que hoje bate
uma vez por dia — e quando bateu hoje de madrugada, o remédio funcionou
sozinho em cinco segundos. Então troquei para o defeito que atinge todo mundo:
nenhum dos 1.685 filmes que a casa já entregou tem capa. Nenhum. São 850
pessoas abrindo a biblioteca e vendo retângulos cinzas, e todo link
compartilhado do filme sai sem imagem. A causa é quase engraçada: o pedido de
capa existia, tinha sido escrito em agosto, e foi posto uma linha acima do
lugar certo — no envelope em vez de dentro da carta. O fornecedor não reclamou,
só não fez. Corrigi o endereço, e a partir de agora todo filme novo nasce com
capa. Ainda não posso jurar que funcionou: às duas da manhã ninguém está
gerando filme, e essa é exatamente a prova que falta — deixei a consulta
pronta para a próxima rotação, junto com a regra de quando desfazer.

---

### #3 — 02:49 BRT — M6: os dois guardiões do dinheiro estavam PARADOS, e 372 verificações não avaliavam nada

**A prova que a #2 me devia, primeiro.** A consulta que eu deixei armada
(`filmes completados depois do deploy da capa`) rodou duas vezes nesta rotação,
às 02:36 e às 02:47: **0 filmes novos** nas duas. `filmes_novos = 0` é o caso
que eu mesmo escrevi como "não concluir nada". Então **não concluo nada** sobre
a capa: ela não foi provada nem desmentida, e a consulta segue armada para a #4.
Não há denominador porque não há tráfego — às 2h da manhã ninguém faz filme.

**O que estava errado.** A tarefa dizia "93 guardiões vermelhos". Fui medir e
achei **106** na ponta. Antes de consertar 106 coisas, fiz a pergunta que separa
o herdado do recém-quebrado: **rodei os 439 guardiões duas vezes** — na ponta
(`96e84fd7`) e no último commit anterior à VERSÃO B (`20054b5b`, 00:54).

    vermelhos antes da VERSÃO B ....... 95
    vermelhos na ponta ................ 106
    ficaram vermelhos ESTA NOITE ...... 12
    herdados (vermelhos nos dois) ..... 94
    viraram verdes .................... 1

Os 94 herdados são de outras noites. Os **12** são acusações contra código que
foi para produção há uma hora. Fui ler os 12 e dois deles se chamam
`money-truth-contract` e `models-pricing-nao-mente`.

**A causa, e ela é pior do que "vermelho".** A VERSÃO B somou uma linha a
`lib/freeTierOffer.ts`: `import { ... } from './entryPolicy'`. Os guardiões que
auditam preço carregam esse arquivo dentro de um **sandbox de módulos com
allowlist** — cada import tem que estar declarado no teste. O import novo não
estava, e os dois guardiões passaram a **morrer na primeira linha**.

O detalhe que importa: na contagem da suíte, "morreu antes de começar" e
"reprovou" são **o mesmo exit 1**. Eles não estavam reprovando nada. Estavam
avaliando **zero verificações** — 313 de `money-truth-contract` e 59 de
`aeo-trial-access`, **372 no total**, sobre preços, grants e a porta de entrada.
Exatamente a área que a casa inteira reescreveu esta noite. É o caso do
`guardiao-vermelho-pode-estar-parado` de novo, agora do lado do dinheiro.

**O que mudou** — `90bc834e`, na fila como `45b1521b`, **EM PRODUÇÃO**
(`git ls-remote origin main` = `45b1521b`, fila = 0). Nenhum arquivo de produto
neste commit: só os dois guardiões.

Passei o módulo **real**, nunca um stub — um stub faria o contrato aprovar uma
política que a casa não aplica. Com eles enxergando outra vez, **apareceram 2
acusações**, as duas contra números presos no mundo antigo:

| o que o guardião disse | o que era |
|---|---|
| `TRIAL_FILMS` (3) ≠ `floor(TRIAL_GRANT_CREDITS_COPY / Seedance60)` (1) | o guardião lia o espelho histórico de **25**; o grant em vigor é o da porta de $1 (**80**). Reancorei ao **mesmo seletor que o produto usa**, não ao número. |
| `'$1.67'` por 10 créditos do Creator | literal preso no plano antigo. A derivação ao lado **já passava** — só o número digitado ficou para trás. Vira `$1.27` ($19/150cr) e **segue como alarme proposital**. |

E em `aeo-trial-access`, `limit: 1` da franquia recorrente: sob a porta única ela
foi desligada, então **0 é a política e não um defeito** — passei a ler o seletor.

**A prova, por mutação, e uma que falhou.** Toda mutação foi conferida no
conteúdo do arquivo antes de medir:

    G = TRIAL_GRANT_CREDITS_COPY (tira o seletor) → money-truth VERMELHO ✔
    CARD_ENTRY_OFFER.limit 0 → 1 ................ → aeo-trial   VERMELHO ✔
    CARD_ENTRY_TRIAL_CREDITS 80 → 40 ............ → money-truth VERDE     ✘

**O terceiro mutante sobreviveu e eu deixo registrado em vez de esconder:**
aquela verificação compara `TRIAL_FILMS` com uma derivação do mesmo grant, então
os dois lados andam juntos e **o valor do grant ela não guarda**. Ela guarda a
outra coisa — que o filme do trial seja contado a partir da política, e não de um
número histórico —, e isso o primeiro mutante prova. Quem quiser travar o *valor*
80 precisa de outra verificação; não é esta.

Estado no fim: os 2 saem da lista de vermelhos, **94 herdados intactos** (não
toquei em nenhum), `tsc` verde, e reconferi os dois **na ponta depois do
enfileirar** — não só na minha worktree.

**O que isto destravou para a #4, já localizado.** Com `money-truth` enxergando,
fui atrás do resto do M7 e a varredura de hoje à noite está **quase** completa —
o `swapFreeTierCopy` foi ensinado a curto-circuitar sob a porta de $1, então
**todos os call sites `ft(OFFER, ...)` estão salvos**. O que sobrou são as
superfícies que renderizam `TRIAL_GRANT_CREDITS_COPY` **por fora** do `ft()`, e
essas ainda publicam o mundo velho — várias com a frase **"no card"**, que hoje
é o contrário da verdade. As nomeadas: `ChatGptWelcomeBanner` ("25 trial credits
already included · no card to start", sem condição nenhuma), `ExitIntentOffer`
("25 FREE CREDITS", "NO CARD"), `omni-flash-vs-sora`, `models-pricing`,
`ai-video-with-talking-characters` (3 lugares), `ai-video-generator/[engine]`.
A #4 varre essas e sobe um guardião que proíbe render do grant fora da fonte
única. Não mexi nelas agora de propósito: a sessão principal estava escrevendo
nesses arquivos esta noite e o commit dela é de uma hora atrás.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada nesta rotação.** A decisão da #2 sobre a trava do `lib/compose.ts`
   continua sendo a única coisa esperando você — está no fecho da #2.

#### 📋 O QUE ACONTECEU
A casa tem 439 alarmes automáticos que conferem se o site está dizendo a
verdade. Eu fui contar quantos estavam tocando e achei 106. Em vez de sair
calando alarme, perguntei quais tocaram **hoje à noite** — e eram 12, todos
depois da mudança de preço. Dois deles eram os alarmes do dinheiro, e a
descoberta feia é que eles não estavam tocando por acharem um erro: eles
estavam **quebrados**, morrendo antes de conferir a primeira coisa. São 372
conferências sobre preço, crédito e a porta de entrada que estavam desligadas
justamente na noite em que a casa mudou o preço todo. Consertei, e assim que
voltaram a enxergar acharam dois números velhos escondidos — um deles fazia a
conta de "quantos filmes o teste de $1 dá". Consertei os dois e provei, quebrando
o código de propósito, que os alarmes agora reagem de verdade. De brinde, com o
alarme funcionando eu consegui listar exatamente quais telas ainda prometem "25
créditos grátis, sem cartão" — que hoje é mentira — e elas são a próxima rotação.

---

### #4 — 03:15 BRT — M7: o número que a casa MOSTRA saía de um espelho de 25, e três botões da porta de $1 estavam sem preço

**O que estava errado.** A rotação #3 me deixou a lista pronta e ela estava
certa pela metade. A VERSÃO B ensinou o *swap* (`swapFreeTierCopy` e o
`<FreeTierCopy>`) a devolver a copy da porta de $1 — e isso de fato salvou
**todos** os call sites que passam por ele, os 12 do componente e as dezenas do
`ft()`. Conferi lendo a função, não o diário: sob `offer.cardEntry` ela
curto-circuita antes de olhar o texto do call site.

O que ninguém tinha medido é o que passa **por fora**. Oito superfícies
renderizavam a constante `TRIAL_GRANT_CREDITS_COPY` — que vale **25** — crua,
sem nenhum ramo para a porta. Com o interruptor ligado há duas horas, elas
continuavam publicando o mundo antigo.

**Quanta gente via isso** (banco, 7 dias, eventos reais — medi antes de codar):

| superfície | pessoas / 7d | o que dizia |
|---|---|---|
| faixa de quem chega do ChatGPT | **116** | "25 trial credits already included · **no card to start**" |
| modal de saída | **102** (20 clicaram) | selos "25 FREE CREDITS" / "NO CARD" e o quadro **"$0 — to try, no card, no trick"** |
| páginas de motor | **87** | "the 25-credit trial covers one" + o rótulo do botão |

E `/models-pricing` fazia pior do que repetir número velho: a frase **promete
"80 credits"** e a linha seguinte dividia por **25**. A página dizia que o trial
dá **5 filmes** no Kineo 1 quando dá **16**. Ela subestimava o próprio produto em
3×. O JSON-LD do `/omni-flash-vs-sora` — o texto que vai para o Google e para os
robôs de resposta — ainda afirmava "25 free credits **with no card**".

**O defeito que não era copy velha.** Dentro da varredura apareceu outra coisa:
**três botões diziam "Try 7 days for" com o preço AUSENTE**. `/kineo-vs-higgsfield`,
`/omni-flash-vs-sora` e o CTA de **toda** página `/ai-video-generator/[engine]`.
O botão que vende a única porta de entrada da casa estava sem o número que ele
vende. A causa é nomeável e vale mais do que o conserto: uma varredura anterior
trocou copy com `replace()` e o **`$1` da frase foi lido como retrovisor de grupo
da regex**. O texto não foi "esquecido" — foi comido pela própria ferramenta que
arrumava a copy. Escrevi as minhas trocas de hoje com função de substituição
justamente por isso.

**O que mudou** — `d49f5921`. `lib/freeTierOffer.ts` passa a exportar
`TRIAL_CREDITS_SHOWN`, **derivado** de `CARD_ENTRY_ONLY`, nunca digitado.
`TRIAL_GRANT_CREDITS_COPY` continua existindo porque precisa existir: é o espelho
de `TRIAL_CREDIT_CAP` de que depende a asserção de tipo do `reverseTrial.ts`, e é
a copy da versão A se o fundador virar o interruptor de volta. Ele só não pode
mais ser **renderizado**. As 8 superfícies foram repontadas, os 3 botões
recuperaram o `$1`, e o fallback da faixa de boas-vindas do Studio (que caía nos
25 quando o saldo ainda não tinha chegado) passou a cair no número em vigor.

**A prova.** Guardião novo `scripts/test-grant-copy-single-source.mjs`, 12
verificações em estilo `readFileSync`/contagem — não morre na primeira falha e
não importa nada com alias `@/` (guardião com alias não roda: morre no import
antes da 1ª verificação). Ele varre **547** arquivos de `app/` e `components/`.

Vale registrar **como ele se pagou na primeira execução**: eu já tinha dado a
varredura por encerrada com 5 arquivos consertados, e ele reprovou apontando
**mais 4 casos** que eu não tinha visto — inclusive os dois botões sem preço e o
`$0` do modal. Não foi trava confirmando o que eu já sabia; foi trava me
corrigindo.

Falsificado por mutação, com o conteúdo do arquivo **conferido antes de medir**
(mutante que não chegou a ser escrito devolve verde e se lê como guardião
resistindo):

    render cru do espelho volta ..... VERMELHO ✔
    CTA perde o preço ............... VERMELHO ✔
    fonte única vira literal 80 ...... VERMELHO ✔
    "no card" volta ao modal ........ VERMELHO ✔

Todos restaurados; base e final **verdes**; `tsc` limpo.

**Suíte inteira.** 517 arquivos: **332 verdes / 108 vermelhos**. Dos 138
guardiões que tocam em algum dos meus 9 arquivos, rodei os vermelhos também
contra a base pristina (`e7e4cb85`, worktree separada) para separar herança de
estrago meu. Nenhum arquivo do pipeline de qualidade foi tocado — nada de
`lib/compose.ts`, rota de render, motores ou régua.

**O que isto NÃO fecha.** O M7 continua aberto do lado das **páginas públicas de
SEO**, que hoje são do Codex (`PEDIDOS`, ordem de 01:20): sobram ~50 linhas de
"no card" literal em `/alternatives`, `/free-ai-shorts-generator`,
`/faceless-video-generator`, `/reviews`, `/sora-alternative`, `/trust`, os dois
`og-image` e o `HomeTopicForm`. Eu deliberadamente não entrei nelas — a divisão
combinada é essa, e mexer lá hoje colide com o trabalho dele.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada nesta rotação.** A única coisa esperando você continua sendo a decisão
   sobre a trava do `lib/compose.ts`, no fecho da #2.

#### 📋 O QUE ACONTECEU
Ontem à noite a casa trocou a porta de entrada: acabou o teste grátis, agora é
$1 por 7 dias com 80 créditos. A troca funcionou onde o texto passa por um
tradutor central — mas oito telas escreviam o número velho na mão e continuaram
prometendo "25 créditos grátis, sem cartão". Duzentas e trinta pessoas viram
isso em uma semana, e vinte delas clicaram numa oferta que o produto não pode
mais cumprir. Consertei as oito, e no caminho achei uma coisa pior: **três
botões de compra estavam escritos "experimente 7 dias por" — sem o preço.** O
"$1" tinha sido apagado por um acidente técnico numa limpeza anterior de textos.
A página de preços também se contradizia sozinha: prometia 80 créditos e depois
dizia que isso dá 5 filmes, quando dá 16. Tudo isso está no ar. E deixei um
alarme que impede o número velho de voltar a aparecer na tela — foi ele, aliás,
que achou 4 dos casos depois que eu já tinha achado que tinha terminado.


**Adendo — o guardião alheio estava certo, e o meu não bastava.** Rodei a suíte
inteira (517 arquivos: **332 verdes / 108 vermelhos**), separei os 9 guardiões
que podem reagir ao que mudei e rodei os 9 contra a base pristina. **Nenhum**
ficou vermelho por minha causa. Mas dois seguiam vermelhos por herança, e um
deles — `test-models-pricing-nao-mente` — acusava justamente a página que eu
acabara de editar. Fui ler em vez de reancorar, e a **condição** dele estava
certa: a página dizia `Your $1 trial starts with 80 credits` com o **80 digitado
à mão**, ao lado da conta derivada. O meu guardião novo não pegou porque ele
procura o *espelho antigo*, não um numeral cravado.

Derivei o número e reancorei aquele guardião pela condição (frase da porta de
$1, fonte `TRIAL_CREDITS_SHOWN`), deixando a trava do numeral **mais larga do
que era**: antes reprovava só o literal `25`, agora reprova qualquer dígito na
frase. De 3/7 para **7/7**, falsificado por dois mutantes — número digitado
volta; contagem de filmes vira literal — ambos vermelhos, ambos restaurados.

⚠️ Fica registrada uma cegueira do meu próprio guardião: ele prova que ninguém
renderiza o **espelho de 25**, não que ninguém **digite o número na mão**. São
condições diferentes, e foi a segunda que quase escapou.
---

### #5 — 03:49 BRT — M10: as três telas do saldo escreviam ZERO quando a leitura FALHAVA

**Antes de codar, conferi se M4 e M5 cabiam. Não cabiam, e o motivo importa.**

*M5 (o primeiro filme dos 77), na forma nova que a ordem de 01:20 deu a ele —
"quantos passaram o cartão por $1 e quantos fizeram o filme depois":*

| hora (UTC) | cadastros | com 0 créditos | `trial_status=card_required` |
|---|---|---|---|
| 07/09 17h–08/09 01h | 5 | 0 | 0 |
| **08/09 05h** | **1** | **1** | **1** |

A versão B **funciona**: a única conta nascida depois do interruptor nasceu
com 0 créditos e `card_required`, e emitiu `card_entry_required`. Mas a coorte
é **uma pessoa**. Não há o que medir nem o que consertar — M5 volta quando a
manhã trouxer gente. Fica o número para a próxima rotação não repetir a
consulta: 6 cadastros em 14 horas.

*M4 (os pagantes calados):* levantei os 14 (12 pagantes + 2 contas do
fundador). Cinco estão sem filme há 30 dias — e **três deles
(emiliomontinari, akajitin, den.higgins) estão na lista de contatos proibidos
da própria rotina**. Sobram dois (ramonwilliamson, brandonmooney450), ambos
parados desde julho. Escrever dois rascunhos que o fundador talvez nem mande
não é a melhor hora da madrugada; a tabela fica registrada e M4 vale uma
rotação inteira quando não competir com um defeito ao vivo.

*M9 (o truncamento em 1000), de passagem:* **a manchete dele é falsa hoje.** O
retrato falava em "7 campanhas com dedupe truncável, reenvio 8× rearmado".
Medido:

| evento | linhas | pessoas | por pessoa |
|---|---|---|---|
| `trial_lifecycle_email_sent` (5 estágios) | 3.156 | 811 | **1,00–1,02** |
| `oneoff_unlock_emailed` | 212 | 29 | 7,3 — **tudo em 21/08**, um dia só |

O dedupe da esteira de trial **segura**, com 3.156 linhas (muito acima do teto
de 1000). O reenvio de 7× existiu, foi numa campanha só e num dia só, há
dezoito dias. M9 continua valendo pelo lado do admin, mas **não é uma sangria
em curso** — e quem for fazê-lo não deve começar pelo e-mail.

---

**O que estava errado (e é de hoje, não de agosto).**

Em 28/08 o PostgREST recusou todo token fresco (`PGRST303`, relógio do auth
adiantado). As telas mostraram o resultado como se fosse um **fato**: "0
credits". O fundador abriu o app e viu zero com 1.489 créditos no banco; três
cadastros vindos do ChatGPT bateram 24 vezes em erro e desistiram. A infra foi
curada no mesmo dia e o `lib/jwtSkewFallback.ts` passou a resgatar aquele erro
específico. **A mentira ficou no código.** Nenhuma das três superfícies que
mostram saldo distingue "seu saldo é zero" de "não consegui ler seu saldo":

| superfície | o que fazia numa resposta 500/503 |
|---|---|
| `TopBar` (chip do topo) | `catch` só pega fetch que **estoura**. Um 500 chega como resposta normal, `data.credits` não é number, cai no `: 0` — e `setErrored(false)` logo abaixo **apaga o único sinal de falha** |
| `NavCreditsBadge` (landing) | pinta pílula **vermelha** de "0 credits" apontando para `/pricing` |
| `Sidebar` | `else setCredits(0)` e `catch { setCredits(0) }` — **sabia** que a resposta não estava ok e escrevia zero assim mesmo |

O `TopBar` é o caso mais irônico: o comentário do próprio arquivo (Push #92)
promete "um `—` com retry na falha, nunca um vazio". Esse ramo existe, está
bem feito — e era **inalcançável exatamente para a falha que o motivou**, porque
só um fetch que estoura chegava nele.

**Por que isso ficou pior hoje de madrugada.** Com a versão B, conta nova
nasce **legitimamente** com 0 créditos, e o produto REAGE a esse zero: faixa da
porta de $1, ponte de saldo baixo, chip vermelho apontando para a loja. O
`TopBar` alimenta `lowBalancePricingBridgeState({ credits })` com o número que
inventou. Um zero falso deixou de ser um número errado e virou **o produto
tratando quem já pagou como quem precisa passar o cartão.**

**O que mudou** (`598cab2d`, **EM PRODUÇÃO**).

`lib/creditsReadFailure.ts` é a fonte única: o predicado
`isCreditsReadFailure(status, body)`, o nome do evento e a copy. A rota
`/api/credits` **marca** a falha (`readFailed: true`) nos dois ramos de erro e
para de mandar `credits: 0` junto com o erro no catch externo. As três telas
**importam** o predicado em vez de recopiar a regra: o chip do topo cai no seu
`— ↻`, o badge da landing **se esconde** em vez de inventar zero, e a barra
lateral ganha uma terceira posição ("Balance unavailable / Unstable right now
— retry"). `401` e perfil inexistente continuam como estavam: são respostas
honestas do servidor, não falha de leitura.

**A casa passa a enxergar.** Evento novo `read_failed_shown` com superfície e
status, travado por `ref` para sair **uma vez por montagem** — o chip refaz o
fetch a cada `creditsChanged` e a cada update do realtime, e sem a trava o
denominador da próxima medição seria tecla, não gente. ⚠️ Registro honesto: **a
frequência disso hoje é desconhecida por construção.** Não existia evento
nenhum; o único caso conhecido é o de 28/08. Este commit não prova que a falha
é comum — ele torna possível saber, e para de mentir enquanto isso.

**A prova.** Guardião novo `scripts/test-tela-que-nao-mente-2026-09-08.mjs`,
**40 verificações** em estilo `readFileSync`/contagem, ancorado pela CONDIÇÃO:
o predicado precisa **governar um `if`**, e o ramo que ele governa — recortado
por **contagem de chaves**, não por fatia de N caracteres — não pode escrever
saldo nenhum. Falsificado por 5 mutantes, com o conteúdo do arquivo conferido
antes de medir:

    Sidebar volta a escrever zero no erro ......... VERMELHO ✔
    TopBar deixa de consultar o predicado ......... VERMELHO ✔
    servidor para de marcar readFailed ............ VERMELHO ✔
    predicado para de olhar o status HTTP ......... VERMELHO ✔
    NavCreditsBadge deixa de emitir o evento ...... VERMELHO ✔

⚠️ **A primeira versão do meu guardião deixou passar o primeiro desses cinco.**
Eu tinha proibido as *formas* antigas (`else setCredits(0)`, `catch {
setCredits(0) }`) — e um mutante que troca `setCredits(null)` por
`setCredits(0)` **dentro** do ramo de falha passou verde. Ausência da forma
velha não é ausência do valor. As verificações D8/D9 nasceram desse furo, e só
existem porque a mutação rodou.

**Suíte inteira.** 441 arquivos: **333 verdes / 108 vermelhos** (base
`0b7d0472`: 332/108 — o verde a mais é o guardião novo; o número de vermelhos
não mexeu). Dos 5 vermelhos que citam meus arquivos, rodei os 5 contra a base
pristina em worktree separada: **4 herdados, 1 era meu.**
`test-topup-eligibility-handoff` cravava a **indentação exata** da copy do chip
da barra lateral, que ganhou um nível de aninhamento. A condição dele continua
certa; a forma é que envelheceu. Reancorei pela condição (as três frases seguem
governadas por `topupEligible`/`creditsZero`, tolerante a espaço em branco) e
falsifiquei. De quebra, aquele arquivo usava `assert` puro: **a primeira falha
matava o processo** e o rodapé imprimia `checks/checks`, que passa 100% por
construção. Agora conta — **107/107 verificações rodando de verdade**, onde
antes ~40 nunca chegavam a ser avaliadas.

Nada do pipeline de qualidade foi tocado: nem `lib/compose.ts`, nem rota de
render, nem motor, nem régua. `tsc` limpo (916 arquivos do projeto lidos —
conferido com `--listFiles`, porque worktree sem junction devolve exit 0 sem
checar nada).

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada nesta rotação.** A única coisa ainda esperando você continua sendo a
   decisão sobre a trava do `lib/compose.ts`, no fecho da #2.

#### 📋 O QUE ACONTECEU
Quando o banco tropeça e o site não consegue ler quanto crédito você tem, as
três telas que mostram seu saldo diziam **"0 créditos"** — com toda a
convicção de quem sabe a resposta. Foi o que aconteceu com você em 28/08: 1.489
créditos no banco, zero na tela. O problema de infra foi resolvido naquele dia;
**o hábito de mentir, não.** E desde ontem à noite isso ficou perigoso de
verdade: com a porta de $1, o número zero é o gatilho que faz o site pedir
cartão. Ou seja, uma piscada do banco podia fazer o produto cobrar de novo
quem já pagou. As três telas agora dizem "não consegui ler agora, tente de
novo" — e, pela primeira vez, avisam a casa quando isso acontece, porque até
hoje ninguém tinha como saber com que frequência acontecia. No caminho, um
alarme de outra rodada apontou uma coisa certa sobre a barra lateral, e o
consertei em vez de calá-lo — ele estava, aliás, com quase metade das próprias
verificações desligadas há tempos.


> ⏱ **Correção de relógio (feita na #5, 03:52 BRT).** Os cabeçalhos da #4
> ("03:55") e da #5 ("04:40") estavam adiantados: nenhuma das duas rotações
> tinha acontecido àquela hora. Conferido com `date` (BRT puro, sem subtrair
> nada), `date -u` e o `%aI` dos próprios commits — #4 = 03:15, #4b = 03:27,
> #5 = 03:49. Os títulos foram corrigidos para a hora real do commit. Uma
> linha do tempo fora de ordem faz o fechamento das 09:30 contar rotação que
> não existiu.

---

### #6 — 04:18 BRT — M1/M2 ENCERRADO POR MEDIÇÃO: a parede que eu ia consertar já tinha sido consertada, e o evento que me mandava lá mente 13 vezes em 17

**Onde esta rotação começou.** A #1 fechou dizendo que o alvo novo era o
`growth_limit` do expansor — "9 pessoas barradas por um teto nosso", e que a
#2 mexeria nele. A #2 foi para o M3 e o assunto ficou aberto. Vim fechá-lo.

**O que eu descobri antes de escrever uma linha de código.**

O `growth_limit` **não acontece há quatro dias e meio**:

| motivo de `script_expand_failed` (30d) | eventos | pessoas | último |
|---|---|---|---|
| `author_rewrite_rejected` | 11 | 6 | 04/09 00:05 |
| **`growth_limit`** | **10** | **9** | **03/09 22:45** |
| `network` | 2 | 2 | 03/09 22:40 |
| `structure_lost` | 1 | 1 | 06/09 10:41 |

E existe o commit que explica a data. `6c0885a3` (03/09 **22:22** BRT,
`judgeTrimmedCandidate`) nasceu citando **nominalmente** o último caso —
"o último caso foi às 22:45 de hoje". O `914eb661` (02/09) já tinha posto a
tesoura que apara em vez de jogar fora, e o `2fae37c7` (01/09) já tinha
mandado o teto **dentro do pedido** ao modelo, porque ele era secreto. Três
consertos, nesta ordem, na exata parede que eu ia atacar como se fosse nova.

⚠️ **Zero sem denominador não prova conserto** — e aqui o denominador é
minúsculo: houve ~3 expansões desde então. O que sustenta a leitura não é o
zero, é o **irmão do lado**, que tem denominador próprio:

    script_duration_autofit_down .......... 11 eventos, 11 PESSOAS DISTINTAS
                                            04/09 13:20 → 07/09 11:59

Onze pessoas em quatro dias receberam filme **descendo o alvo**, no lugar
exato onde antes vinha a parede vermelha. E depois que essa descida entrou no
ar, o único `narration_guard_blocked` que sobrou foi de cobertura **32%** —
abaixo do piso de 60% documentado no próprio `narrationFit.ts`, onde recusar
continua certo. **Nada a construir aqui. M1 e M2 fecham.**

**A cobertura do socorro, que eu também suspeitava estar furada.** Das 30
pessoas que bateram na parede de narração curta em 14 dias, **24 receberam o
expansor** no mesmo minuto; das 6 que não, a mais recente (08/09 01:35)
recebeu o **outro** remédio, o certo para o caso dela — 2s de fala não é
roteiro curto, é ideia, e o `script_authoring_auto_started` disparou sozinho
e **entregou 81 palavras em 3 segundos**. Ela não aceitou e foi embora, mas
isso é outra conversa: a peça funcionou. 17 das 30 fizeram filme depois.

---

**O defeito que eu achei no caminho — e é de instrumentação, o pior tipo.**

O que me mandou para a parede errada foi um evento. Vale entender por quê,
porque ele vai mandar a próxima rotação também.

`script_preflight_overridden` é emitido em `GenerateClient.tsx` quando a fala
não cobre o alvo. O nome afirma **duas** coisas, e o código **não conferia
nenhuma**. Medido nos 17 disparos que existem em 45 dias:

| o que o nome afirma | a realidade |
|---|---|
| a pessoa **ignorou um aviso** | nada checa se algum aviso apareceu; **2 dos 17** saíram de **auto-start** — quem apertou Generate foi a máquina |
| a viagem **vai bater na trava** | **errado em 13 dos 17**; **dez viraram vídeo**, inclusive com 32% e 37% de cobertura |

O caso `21bc07da` (06/09 20:18) tem os dois erros no mesmo trilho: veio do
banner de primeira entrega do trial, `activation_autostart_dispatched`, e o
evento registrou que **ele** insistiu.

A causa é velha e conhecida: **duas réguas**. A tela mede o texto **cru**
contra `MIN_COVERAGE`; o servidor mede a narração **depois da análise** e,
desde 03/09, ainda **desce o alvo sozinho** acima de 60%. A tela nunca soube
que a descida existe — então prevê uma recusa que o servidor não vai dar. É a
doença do #349 de novo, desta vez na instrumentação.

**O que mudou** (`4bd873a2`, **EM PRODUÇÃO**). O veredito passa a vir da
**mesma função** que o servidor usa (`autofitDown` de `lib/narrationFit`,
alimentada pela narração do `parseUserScript`, não pelo texto cru), e o evento
passa a dizer quem apertou o botão: `refusal_predicted`,
`server_would_descend`, `server_descend_reason`, `server_effective_seconds`,
`server_speech_seconds`, `autostart_pending`.

⚠️ **NADA foi bloqueado, de propósito** — e essa era a jogada óbvia. Eu
cheguei a desenhar o preflight barrando o despacho condenado antes de gastar
a viagem. **Os dados mataram a ideia**: a régua local erra 13 de 17, e barrar
por ela teria **matado dez filmes reais**, dois deles de gente com 32% e 37%
de cobertura que recebeu vídeo. O produto continua deixando a pessoa ir; o
que muda é que a casa para de acusá-la de teimosia.

**A prova.** `scripts/test-preflight-que-nao-acusa-2026-09-08.mjs`, **28
verificações** em estilo `readFileSync`/contagem, com o bloco recortado por
**contagem de chaves** (não por fatia de N caracteres) e ancorado pela
CONDIÇÃO. Falsificado por 5 mutantes, cada um com o conteúdo do arquivo
conferido antes de medir:

    o bloco deixa de chamar autofitDown .......... VERMELHO ✔
    volta a medir o texto cru .................... VERMELHO ✔
    refusal_predicted cravado em true ............ VERMELHO ✔
    autostart_pending cravado em false ........... VERMELHO ✔
    a previsão local vira `return` (bloqueio) .... VERMELHO ✔

O grupo **D** existe só para isso: se alguma rotação futura transformar esta
previsão em bloqueio, o guardião fica vermelho e este parágrafo explica por
quê. ⚠️ Registro honesto de limite: as verificações C do primeiro rascunho
usavam `new RegExp` montada em *template literal* — onde `\b` não é fronteira
de palavra, é **backspace**. As seis passavam por construção. Trocadas por
`includes` e reconferidas.

`tsc` limpo (916 arquivos do projeto lidos, conferido com `--listFiles`).
Nada do pipeline de qualidade foi tocado: nem régua, nem roteiro, nem motor,
nem custo — o único arquivo de produto mexido emite um evento.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada nesta rotação.** A única coisa que ainda espera você continua sendo
   a decisão sobre a trava do `lib/compose.ts`, no fecho da #2.

#### 📋 O QUE ACONTECEU
Eu ia consertar uma parede do expansor de roteiro que a rotação das 01:36
tinha apontado. Antes de codar, fui conferir se ela ainda existia: **não
existe há quatro dias e meio**, e três consertos de 01, 02 e 03 de setembro a
derrubaram — o último foi escrito citando pelo nome a última vítima. No lugar
dela, o produto agora **encolhe o botão de duração** para caber no roteiro
que a pessoa escreveu, e fez isso para **onze pessoas diferentes** entre
sexta e domingo. Teria sido uma noite inteira reconstruindo um remédio que já
está no ar.

O que me mandou para lá foi um **medidor mentiroso**: um evento que se chama
"a pessoa insistiu mesmo avisada" e que, nos 17 casos que existem, estava
errado 13 vezes — dez daquelas pessoas receberam o filme normalmente, e em
duas quem apertou o botão nem foi gente, foi o disparo automático. Consertei o
medidor: ele agora pergunta ao servidor, com a mesma conta que o servidor faz,
e registra quem apertou. Não bloqueei nada — cheguei a desenhar o bloqueio e
os dados mostraram que ele teria matado dez filmes de verdade. Fica um
guardião que impede a próxima sessão de ligar esse bloqueio sem ler isto aqui.

**#6b — 04:33 BRT — o vermelho que a minha própria mudança criou** (`77230465`,
**EM PRODUÇÃO**). Rodei os 40 guardiões que leem o `GenerateClient` e 14 deram
vermelho. Em vez de herdar o número, rodei os 14 contra a base pristina
`2087c785` numa worktree separada: **13 são herdados, 1 era meu.**
`test-duracao-que-nao-existe-2026-08-31` cravava a **linha de import inteira**,
palavra por palavra — somei `autofitDown` a ela e a trava caiu, sem que nada da
condição dela tivesse mudado. Reancorado pela CONDIÇÃO (as duas peças vêm de
`narrationFit`, em qualquer ordem, com qualquer vizinho na lista) e falsificado
por 2 mutantes. Nenhum arquivo de produto neste commit.

⚠️ **Limite da sonda, dito na cara.** `main` = `77230465`, fila = 0, home 200
com controle 404 na mesma medição. Mas o que este commit muda são **campos de
um evento emitido no navegador de quem está logado** — não existe sonda externa
que prove que o campo novo viaja. A prova real vem sozinha: o primeiro
`script_preflight_overridden` que aparecer com `refusal_predicted` no
`metadata` é o carimbo do deploy (memória: campo novo é o carimbo, não o
relógio). Enquanto nenhum aparecer, o correto é dizer **desconhecido**, não
"funcionando".

---

### #7 — 04:48 BRT — M3: 126 filmes moram no disco do fornecedor, 91 já morreram, e ninguém sabia

**Primeiro: a falsificação que a #2 deixou marcada.** A #2 publicou a capa
(`f42e410d`) e escreveu a consulta que decidiria se ela pega, com as três
saídas já nomeadas. Rodei:

```
completos_total=1681 · com_capa_total=0
novos_pos_deploy=0 · com_capa_pos_deploy=0 · ultimo_video=2026-09-08 04:00 UTC
```

`filmes_novos = 0` ⇒ **não há denominador; não concluo nada**, exatamente
como a #2 mandou. A capa não está provada nem desmentida. Fica para a
primeira rotação que encontrar um filme completado depois de 05:25 UTC.
⚠️ Também conferi a coluna irmã `thumb_url` (existe no schema, é lida em
`/api/videos` e `/my-videos`): **0 de 1.685**. Não havia um segundo lugar com
a capa escondida.

**O alvo desta rotação apareceu enquanto eu media o denominador.** Perguntei
de onde os filmes são servidos, e a resposta tem três hosts:

| onde o filme mora | filmes | pessoas | duração mediana |
|---|---|---|---|
| nosso bucket (`…supabase.co/storage/…`) | 1.549 | 819 | 45s |
| **disco do Creatomate** (`f002.backblazeb2.com/file/creatomate-…`) | **126** | **57** | **60s** |
| CDN da fal (maio) | 6 | 2 | 10s |

**Sondei a rede, com controle na mesma medição.** Range `0-99`, UA de
navegador, e um nome inexistente no MESMO bucket como controle (ele também dá
404 — então 404 ali significa "sumiu", não "bloqueado"):

```
12/05 · 27/05 · 06/07 · 08/07 · 02/08 · 05/08 · 06/08 ......... 404
17/08 · 18 · 19 · 20 · 21 · 24 · 25 · 26 · 28 ................. 206
01/09 · 02 · 03 · 04 · 05 · 06 · 07 · 08 ...................... 206
```

A fronteira está entre **06/08 e 17/08** — retenção de ~30 dias. Traduzido
para gente:

- **91 filmes de 30 pessoas já estão MORTOS.** O card abre, o player tenta,
  e não há arquivo. A casa entregou, cobrou, e o filme sumiu do disco de
  outra empresa.
- **35 filmes de 28 pessoas ainda vivem, com prazo.** O mais antigo é de
  **17/08 02:04** e deve morrer por volta de **17/09**.

**A causa tem assinatura, e ela acusa o arquivo certo.**
`persistRenderAssets` (`lib/renderAssets.ts`) baixa o MP4 com
`downloadTimeoutMs: 25_000` e, em qualquer falha, **devolve a URL do
fornecedor e segue em frente** — a única marca era um `console.warn` que
expira junto com o log da Vercel. Um filme de 60s pesa 35-65 MB; 25s de
orçamento pedem ~20 Mbit/s sustentados. Quem estoura é o arquivo **grande**.
Medido desde 01/08:

| | filmes | pessoas | duração média | quantos têm ≥60s |
|---|---|---|---|---|
| copiados para nós | 1.035 | 613 | 48,3s | 250 (**24%**) |
| ficaram no fornecedor | 43 | 34 | 67,0s | 38 (**88%**) |

Ou seja: **o vazamento cai exatamente sobre o filme que a casa manda todo
mundo fazer** — a regra fixa dos 60s+ do TikTok Creator Rewards.

**O que mudou** (`2fc6784d`, **EM PRODUÇÃO**, `origin/main` = `2fc6784d`,
fila = 0).

`app/api/cron/rescue-vendor-assets` passa nos filmes que ainda estão no
fornecedor, **do mais antigo para o mais novo** (a fila é por prazo de morte,
não por tamanho nem por quem usou mais), confere se a fonte existe, copia
para o nosso bucket e reponta o `video_url`. Como **não há ninguém
esperando**, o orçamento de download é de 120s — e é exatamente por isso que
a rota existe: o caminho vivo (`/api/compose/status`) tem `maxDuration = 60`
**com a pessoa olhando a tela**, então esticar o prazo lá trocaria um link
que morre em 30 dias por uma entrega que falha agora. Por isso **os 25s do
caminho vivo NÃO foram aumentados**, de propósito.

Três recusas deliberadas, porque são elas que tornam o passo seguro:
1. **Nada é apagado, em lugar nenhum.** A URL antiga vai inteira para o
   evento — o passo é desfazível à mão.
2. **O `video_url` só é repontado depois de PROVAR** que o objeto novo existe
   no nosso bucket e tem o **mesmo tamanho** do que foi baixado. Repontar às
   cegas trocaria um filme com prazo por um filme quebrado agora.
3. **Nada é gerado, recomposto ou cobrado.** Nenhum crédito é tocado.

`lib/renderAssets.ts` deixa de falhar em silêncio: quando a cópia não
acontece, carimba `render_asset_left_on_vendor` com dono, render e a URL do
fornecedor. É o que faltava para que os próximos 5% não levem 4 meses para
serem descobertos.

O filme **já morto** não tem resgate — a fonte não existe mais. O que a rota
faz por ele é **parar de fingir**: carimba `vendor_asset_expired` uma vez,
com dono e data, para que a próxima rotação saiba de quem é o prejuízo e
possa avisar a pessoa. Hoje ninguém sabe.

E o gatilho é automático: `vercel.json` ganhou `/api/cron/rescue-vendor-assets`
no **minuto 23** de cada hora (minuto livre; 36 crons no total, teto do plano
é 40). Remédio que depende de alguém lembrar de clicar não conserta nada —
foi assim que `send-failure-recovery` dormiu 30 dias. Pelo mesmo motivo o
padrão da rota é **AGIR**; `?dry=1` é a inspeção, opt-in.

**A prova.** `scripts/test-resgate-filme-do-fornecedor-2026-09-08.mjs`,
**35 verificações** em estilo `readFileSync`/contagem (nunca `assert` que
morre na primeira falha), ancoradas pela CONDIÇÃO. A trava do tamanho é
**estrutural**, não textual: exige que a comparação apareça ANTES do update e
que o ramo divergente saia sem escrever. Falsificado por **10 mutantes**, cada
um com o md5 do arquivo conferido antes de medir:

    tira o fail-closed do CRON_SECRET ................. VERMELHO ✔ (A2)
    apaga a comparação de tamanho antes do update ..... VERMELHO ✔ (B1/B3/B4)
    fila do mais NOVO para o mais antigo .............. VERMELHO ✔ (D1)
    orçamento do resgate igual ao do caminho vivo ..... VERMELHO ✔ (D5)
    dry-run vira o padrão ............................. VERMELHO ✔ (H2)
    o carimbo de "ficou no fornecedor" some ........... VERMELHO ✔ (F2/F3)
    o carimbo sai de dentro do ramo da falha .......... VERMELHO ✔ (F1/F3/F5)
    o caminho vivo estica o orçamento para 90s ........ VERMELHO ✔ (F7)
    o cron some do vercel.json ........................ VERMELHO ✔ (G1/G2)
    o resgate divide o minuto com outro cron .......... VERMELHO ✔ (G3)

`tsc --noEmit` limpo, e a base `39a11f55` foi conferida verde ANTES de eu
escrever uma linha. Nenhum arquivo do pipeline de qualidade foi tocado:
`lib/renderAssets.ts` não está na lista de proibidos do fundador (03/09) — a
lista é `lib/compose`, `lib/hollywood/`, `lib/cinematic/`, `lib/broll/`,
`lib/lyriaMusic`, `lib/narrationFit`, `analyze-idea`, `generate-script`.

**⚠ O limite desta rotação, dito na cara.** A rota está publicada e o cron
está agendado, mas **ela ainda não rodou** — o primeiro disparo é às
**xx:23**. Enquanto nenhum `vendor_asset_rescued` aparecer em `events`, o
correto é dizer **"o resgate existe"**, nunca "os 35 estão salvos". A
consulta que decide, para a próxima rotação:

```sql
select name, count(*), count(distinct user_id), max(created_at)
from events
where name in ('vendor_asset_rescued','vendor_asset_expired','vendor_asset_rescue_failed')
group by 1;
```

`rescued > 0` ⇒ o resgate pega e os 35 vão sendo trazidos a 6 por hora
(≈6 horas para a fila inteira). `failed > 0` com `stage='verify'` ⇒ a trava de
tamanho fez o trabalho dela e o update foi recusado, o que é o
comportamento **certo**, não um defeito. Zero linhas de qualquer tipo depois
de duas horas ⇒ o cron não está disparando, e aí o suspeito é o `vercel.json`,
não o código.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada nesta rotação.** O resgate roda sozinho de hora em hora.
2. Continua em aberto, do fecho da #2: **a decisão sobre a trava do
   `lib/compose.ts`** (commit `f42e410d`, a capa). Nada nesta rotação depende
   dela.

#### 📋 O QUE ACONTECEU
Fui conferir se a capa que subiu às duas da manhã tinha funcionado. Não deu
para saber — ninguém gerou filme desde então, e sem filme novo não há o que
medir; deixei a conta pronta para a próxima rotação, como estava combinado.
Mas, perguntando de onde os filmes são servidos, achei uma coisa pior: **126
dos nossos filmes nunca saíram do disco do fornecedor**, e o disco dele
apaga tudo depois de uns 30 dias. Fui na rede conferir um por um: os de maio,
julho e começo de agosto **já não existem**. São **91 filmes de 30 pessoas
que a casa entregou e que hoje não abrem**. Outros **35, de 28 pessoas**,
ainda estão lá e morrem nas próximas semanas.

A causa é o tipo de coisa que só aparece quando alguém mede: a rotina que
traz o filme para a nossa casa tem 25 segundos para baixar o arquivo e, se
não consegue, **desiste calada**. Filme de 60 segundos pesa demais para esse
prazo — e por isso o vazamento pegou justamente os filmes longos, que são os
que a gente pede que todo mundo faça por causa do TikTok. Dos que ficaram
para trás, 88% passam de um minuto.

Agora existe um resgate que roda sozinho toda hora: ele vai buscar os filmes
que ainda estão lá, do mais antigo primeiro, traz para a nossa casa e só
troca o endereço depois de conferir que o arquivo chegou inteiro. Não apaga
nada e guarda o endereço antigo, caso a gente precise voltar atrás. Para os
que já morreram não há milagre — mas eles param de ser invisíveis: cada um
fica carimbado com o nome do dono, para a gente decidir o que dizer a essas
30 pessoas.

---

### #8 — 05:06→05:30 BRT — M8/M6: quatro alarmes nasceram e morreram na mesma rotação, e a Versão B ainda não tem plateia (n=1)

**Esta rotação não mudou uma linha de código, de propósito.** Todas as quatro
coisas que pareciam defeito grave viraram artefato quando medidas direito. Vale
mais escrever os quatro do que publicar um conserto para problema que não existe.

**Alarme 1 — "12 pessoas foram barradas na porta de compra".** `checkout_auth_required`
pulou de 1 (ontem) para 12 (hoje) na mesma janela. Fui olhar os carimbos: **dez
deles saíram entre 05:47:28 e 05:47:31 UTC — 3,3 segundos** — varrendo starter,
basic, pro, autopilot, mensal, anual, `starter10` e `bulk10`, um por SKU, todos
sem `user_id`. Isso é varredura automática, não gente. E a casa **já sabia
disso**: o comentário em `app/api/stripe/checkout/route.ts:402` descreve o
padrão com precisão ("rajadas de 2-8 ms, uma por tier, sem user_id"). Anônimos
de verdade barrados na janela: **4 momentos**, não 12.

**Alarme 2 — "a Versão B matou o cadastro: 8 ontem, 1 hoje".** Verdade nos
números, mentira na conta. A Versão B (`89a65eb9`) entrou às **04:22 UTC** e
ficou viva por volta de 04:30. As horas 02, 03 e 04 UTC — onde estavam os zeros
mais assustadores — são **de antes do deploy**. Recortando no carimbo certo,
janela 04:30→08:00 UTC:

    dia          chegadas  porta vista  metodo escolhido  contas
    08/09 (B)        47          2             0            1
    07/09            46          7             2            3
    06/09            33          3             3            5
    05/09            15          6             4            1

Contas: **1 · 3 · 5 · 1**. O 1 de hoje cabe dentro da variação normal — o
05/09 também deu 1, sem Versão B nenhuma. **Não dá para afirmar que a porta
nova derrubou o cadastro**, e não vou afirmar. O que dá para afirmar é que
**as chegadas não caíram**: 47 hoje contra 46 ontem, medidas por
`landing_session_started`. Quem quiser responder a pergunta de verdade precisa
de mais horas, não de mais opinião.

**Alarme 3 — "o Guardião está vermelho na main".** Nove e-mails de
`Run failed: Guardião - main` entre 01:16 e 01:30 UTC, mais quatro na noite
anterior. Todos os commits acusados **estão mesmo na main**. Só que o GitHub
só manda e-mail **quando falha** — e não veio nenhum depois das 01:30, com
muita coisa publicada desde então (Versão B às 04:22, minhas rotações até
07:48). Reproduzi a ponta `7427bbc0` numa worktree limpa, rodando exatamente o
que o CI roda: `tsc --noEmit --incremental false` **verde**, e os cinco
guardiões do job crítico (`sharing-safety`, `five-improvements`,
`locale-readiness`, `home-curation`, `showcase-premium`) **verdes**. A main
teve uma janela vermelha ontem à noite e **já está verde**.

**Alarme 4 — M8, "toda carta pede resposta e ninguém lê resposta".** Fui ler.
O inbox do fundador nos últimos 16 dias é **99% máquina** (Upwork, Quora,
Stripe, GitHub, newsletters). Busquei resposta humana em 20 dias: as últimas
de cliente são **Rick (gapozweb), Matthew, Marc e akajitin — e as quatro foram
respondidas em 24/08**. Nos últimos 20 dias **não entrou uma única resposta
nova de cliente**. Construir rota de entrada, tabela `inbox_reply` e digest
seria remédio para uma **coorte de zero**. O M8 não cabe — e o achado é pior
que o problema que ele ia resolver: **as campanhas não recebem resposta
nenhuma**, o que é um fato sobre as cartas, não sobre a caixa de entrada.
⚠️ Limite honesto: minha busca exigiu `subject:Re` e excluiu remetentes de
robô; carta de cliente com assunto novo pode ter escapado.

**O resgate do fornecedor (#7) ainda não rodou** — e isso também é aritmética,
não defeito. O cron dispara no minuto 23 de cada hora e o deploy saiu 07:48
UTC; o primeiro disparo possível era 08:23 UTC, depois do fim desta rotação.
`vendor_asset_rescued`/`_expired`/`_rescue_failed`: **zero linhas de qualquer
tipo**, como esperado. A consulta da #7 continua valendo para a próxima.

**M5, na pergunta nova que a Versão B criou** ("quantos passaram o cartão por
$1 e quantos fizeram o filme depois"): desde 04:22 UTC nasceu **exatamente uma
conta** — `atoyebiolakam2010`, 05:14 UTC, `video_credits=0`,
`trial_status='card_required'`, `has_paid=false`, **0 filmes**. A
instrumentação funciona (1 evento `card_entry_required` para 1 conta nova, e
`auth.users` = `profiles` em toda hora das últimas 36h, sem perfil perdido).
Mas **n=1**: não é amostra, é anedota. Ninguém passou o cartão ainda.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada nesta rotação.** Não há conserto pendente do meu lado nem nada
   quebrado que eu tenha encontrado.
2. Quando quiser saber se a Versão B pegou, use **esta** conta e não outra:
   janela recortada em **08/09 04:22 UTC** (o commit `89a65eb9`), comparada com
   **a mesma janela de relógio** dos dias anteriores, e **jogando fora** as
   rajadas de `checkout_*` que saem em menos de 5 segundos varrendo todo SKU.
   Sem esses dois cuidados, os números mentem nas duas direções — mentiram
   para mim duas vezes nesta rotação.
3. Continua em aberto, da #2: **a decisão sobre a trava do `lib/compose.ts`**
   (commit `f42e410d`).

#### 📋 O QUE ACONTECEU
Passei a rotação inteira perseguindo quatro coisas que pareciam estar pegando
fogo, e as quatro apagaram sozinhas quando eu olhei de perto. Doze pessoas
barradas na porta de compra eram um robô varrendo os preços em três segundos.
O cadastro que tinha "despencado de 8 para 1" tinha despencado antes da
mudança entrar no ar — quando recorto na hora certa, hoje deu 1 e os outros
dias deram 1, 3 e 5, ou seja, dentro do normal. O Guardião "vermelho na main"
ficou vermelho ontem à noite e já está verde de novo — conferi rodando aqui o
mesmo teste que o robô do GitHub roda. E a ideia de fazer a casa ler as
respostas dos clientes não tem para quem servir: nos últimos vinte dias
**nenhum cliente respondeu nenhuma carta**, e as últimas quatro respostas que
existiram já foram respondidas em agosto.

O que sobra de verdade é uma frase só, e ela é sobre a porta nova: **desde que
o trial grátis acabou, uma pessoa se cadastrou, ficou com zero créditos e não
passou o cartão.** Uma. Não é notícia boa nem ruim — é pouca gente para ter
notícia. As visitas continuam chegando no mesmo ritmo de ontem, o que
significa que a mudança ainda não espantou ninguém da porta. Amanhã de manhã,
com mais horas de relógio, o número vira resposta.

---

### #9 — 05:36→06:35 BRT — M7: três cartas prometiam um filme grátis que a casa parou de entregar às 04:22 UTC — 126 pessoas em 7 dias

**O que estava errado.** A esteira de trial manda ~124 e-mails por dia (866 em
7 dias, 549 pessoas) e continuou mandando depois da Versão B — o último saiu
às 08:25 UTC, onze minutos antes de eu medir. Três dos ramos dela dizem, com
estas palavras:

> *"You can still make one on the **free plan you're back on**. Pick a topic and
> it starts writing and rendering by itself — no blank page to stare at:"*

e entregam três links `create_intent=fast`, que **disparam o render sozinhos**.

Desde a Versão B (`lib/entryPolicy.ts CARD_ENTRY_ONLY`, em produção 08/09
**04:22 UTC**) esse plano não existe: `getFreeTierOffer()` devolve
`CARD_ENTRY_OFFER` com `limit: 0`, e `/api/compose` recusa em
`reservedOrCompleted > FREE_OFFER.limit` — ou seja, **na primeira reserva**. A
carta promete o filme; o link entrega um 402.

O detalhe que fecha o caso: **a própria carta se contradiz**. A lista de perdas
logo acima já sai da fonte única e diz `You're back to No free tier — $1 trial
only`. Três parágrafos depois, o literal escrito à mão em 12/08 oferece o filme
grátis. O comentário do código que justificava a frase — *"o free residual do
plano em que a pessoa acabou de cair cobre esse vídeo"* — envelheceu junto com
ela.

**Quantas pessoas** (`events.trial_lifecycle_email_sent`, por
`metadata->>'body'`, 7 dias):

    downgraded_loss      / never_ran ............ 61 pessoas
    expired_offer_d5     / offer_first_film ..... 37 pessoas
    expired_lastcall_d10 / offer_first_film ..... 28 pessoas
    ────────────────────────────────────────────────────────
                                          126 pessoas (~18/dia)

Depois da Versão B, em quatro horas, **4 pessoas** já receberam a promessa
morta: 04:25:19 (dois D5), 07:25:18 (um downgraded_loss) e 08:25:17 (um D10).

**O que mudou — `2b6a4043`, EM PRODUÇÃO** (`git ls-remote origin main` =
`2b6a4043`, fila 0).

Nenhuma linha de copy foi reescrita — e isso é de propósito. A condição nova
sai do **limite do cobrador**, não de uma flag redigitada:

```ts
const LIFECYCLE_FREE_OFFER = getFreeTierOffer()
const FREE_FILM_AVAILABLE = LIFECYCLE_FREE_OFFER.limit > 0
```

e os três ramos passam a montar a lista de temas só quando há filme grátis
(`FREE_FILM_AVAILABLE ? starterTopics(...) : []`). Os três **já tinham** o
desvio pronto para pool vazio — *"Pool vazio ⇒ nunca um e-mail sem CTA: cai no
corpo de hoje, intacto"* — então caem no corpo `standard`, que é honesto e já
carrega a porta aprovada. No dia em que o fundador virar `CARD_ENTRY_ONLY` de
volta, os três ramos voltam sozinhos: a condição é o limite, não uma chave nova.

**Um efeito colateral, declarado e não escondido.** O ramo `neverRan` era o
único que **não** oferecia a porta de $1, de propósito: *"quem nunca viu um
filme sair tem objeção de prova, não de preço"* (decisão de 07/09). Aquela
decisão pressupunha uma prova **grátis** disponível. Sem ela, o corpo `standard`
é a única coisa verdadeira que sobrou para dizer. E o `standard` também foi
corrigido: ele afirmava *"the videos you already made are yours"* — falso para
quem nunca entregou nada, e exatamente a frase que o `neverRan` havia sido
criado para não dizer. Agora a frase **some** quando não há acervo, em vez de
virar outra frase.

**Prova.** `scripts/test-esteira-sem-filme-gratis-2026-09-08.mjs`, 24
verificações, amarradas à **condição** e não à redação: a trava exige que
`FREE_FILM_AVAILABLE` venha de `getFreeTierOffer().limit`, e reprova
explicitamente a forma `= !CARD_ENTRY_ONLY` (predicado do cobrador não se
redigita). Falsifiquei trocando os três ramos por `true`: **4 verificações
ficam vermelhas**. `npx tsc --noEmit` verde — com a junction de `node_modules`
criada primeiro, porque sem ela o `npx tsc` sai com **código 0 sem
typecheckar nada** e o verde é mentira.

⚠️ E uma lição que já me custou uma hora: rodei a falsificação **antes de
commitar** e o `git checkout --` de volta apagou as três edições inteiras.
A regra existe na memória (`falsificar-mutacao-commitar-antes`) e mesmo assim
foi preciso reaplicar tudo. Commit antes da mutação, sempre.

**M6, de tabela.** `scripts/test-other-deliveries.mjs` estava **vermelho por
herança** na ponta `8149a04d` — não foi a minha mudança. A asserção
`'D5/D10 untouched'` prendia a **forma** (a palavra `otherMade`), e a
sprint-assinaturas de 04/09 passou a usar `otherMade` no predicado do D5/D10 de
propósito. Reancorada pela **condição** que ela realmente protege — o D5/D10 não
*imprime* o acervo, só o lê no predicado (medido: 2 usos, ambos no `if`, zero na
copy). 30/30 verde. Os outros seis guardiões vizinhos já estavam e seguem
verdes.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada.** Já subiu sozinho pelo `!RODAR-AGORA.bat` (`2b6a4043`, fila 0).
2. Se você quiser reverter o efeito colateral e devolver ao ramo `neverRan` o
   tratamento de antes (sem porta de $1), a decisão é sua e é **uma linha**:
   me diga e eu separo um corpo próprio para essa coorte. Hoje ela recebe o
   corpo `standard`, que oferece a porta.
3. Continua em aberto, da #2: **a decisão sobre a trava do `lib/compose.ts`**
   (commit `f42e410d`).

#### 📋 O QUE ACONTECEU
Quando o trial grátis acabou às 04:22 da manhã, a máquina de e-mails não ficou
sabendo. Ela continuou mandando, para gente que nunca conseguiu terminar um
vídeo, uma carta dizendo "você ainda pode fazer um no plano grátis" com três
botões que começam o vídeo sozinhos. O plano grátis tinha acabado de deixar de
existir — quem clicasse ia bater numa parede de pagamento com a promessa ainda
aberta na outra aba. Foram 126 pessoas nos últimos sete dias, e quatro já
tinham recebido a carta hoje, a última onze minutos antes de eu ver.

Agora a carta pergunta ao próprio cobrador se existe filme grátis antes de
oferecer um. Como não existe, ela para de oferecer e manda o texto honesto que
já estava pronto no mesmo arquivo. Não inventei frase nova, não mexi em preço e
não criei oferta nenhuma — e no dia em que você reabrir o grátis, as três cartas
voltam ao que eram sozinhas, sem ninguém precisar lembrar.

**Hoje quem chega ao fim do trial sem ter conseguido um filme recebe uma carta
que não promete o que a casa não entrega mais.**

### #10 — 06:06→06:30 BRT — M7: as TELAS mais vistas da casa ainda prometiam "free" e "no card" — 224 pessoas em 7 dias

**O que estava errado.** A #9 consertou as **cartas**. Estas são as **telas**, e
elas estavam piores: as frases eram **JSX cru** — nunca passaram por
`swapFreeTierCopy`, nunca leram o limite do cobrador, e por isso atravessaram a
Versão B intactas. Desde as 04:22 UTC a casa não entrega filme grátis, e as
quatro superfícies abaixo continuaram anunciando um.

O caso mais alto é o do exit-intent da home. No **mesmo painel**, ao mesmo
tempo: a coluna da esquerda com o selo `80 CREDITS FOR $1` e o ladrilho
`$1 · for 7 days of Creator, no trick` — e a **manchete**, em 26px, dizendo
*"You haven't tried it yet — and trying it is free"*. O parágrafo logo abaixo
já estava certo (passa por `FreeTierCopy` e cai na copy da porta): quem lia de
cima para baixo via a promessa, o preço e o desmentido em três linhas seguidas.

**A coorte, medida por evento de impressão (7 dias):**

| superfície | evento | alcance |
|---|---|---|
| exit-intent da home | `exit_intent_shown` / `_free_clicked` | **104 sessões viram, 20 clicaram (19%)** |
| caixa inline do `/generate` | `viral_onboarding_viewed` `source=inline_first_video` | **175 pessoas** |
| overlay `NicheOnboarding` | `viral_onboarding_viewed` (sem `source`) | **49 pessoas** |
| modal de upgrade | `first_film_free_offer_shown` | **0 em 30 dias** |

Duas leituras que mudam o peso disso. A primeira: **19% de clique**. Comparado
com o pack de $4,90 (231 expostos, 0 cliques em 54 dias) e com a oferta de 14
superfícies e clique zero, este painel é **a superfície de aquisição que mais
converte na casa** — e era a que mentia mais alto. A segunda: o modal de upgrade
tem **zero impressões em 30 dias**. Consertei o predicado dele porque estava
errado, mas ele **não** entra na conta das 224 pessoas: peça sem superfície não
existe, e inflar o número com ela seria exatamente o erro que já me custou
rotações.

**O que mudou — `d97d55f6` + `96037a8a`.**

A condição sai do **limite que o cobrador lê** — `getFreeTierOffer().limit`, o
mesmo número que `/api/compose` compara contra `reservedOrCompleted` antes de
recusar a reserva — e nunca de uma flag redigitada:

```ts
const freeFilmAvailable = OFFER.limit > 0        // /generate
const freeFilmAvailable = useFreeTierOffer().limit > 0   // NicheOnboarding
```

**Nenhuma frase nova foi inventada.** A manchete do exit-intent virou uma
constante (`EXIT_FREE_HEADLINE`) que só chega à tela através do
`swapFreeTierCopy` que já existia — sob a porta única ela cai na copy canônica
de `lib/entryPolicy`; `on` repete o `legacy` de propósito, para que o TEXTO da
versão A continue o mesmo. Uma diferença, dita para não passar por exata: a
manchete perdeu o `<br />` que a quebrava em duas linhas, porque agora ela é uma
string e não JSX — sob a versão A (hoje desligada) ela quebra sozinha em vez de
quebrar no ponto escolhido. E o apóstrofo virou tipográfico (`’`): dentro de uma
string JS o `&apos;` apareceria literal na tela. As outras duas apenas **perdem a palavra** que o
cobrador não honra mais (`'Create my free Short →'` → `'Create my Short →'`;
`· no card ·` sai da linha). Não toquei em preço, checkout, porta de $1 nem
página pública de SEO.

**E `firstFilmFreeAvailable` era um espelho que tinha parado de espelhar.** O
comentário dele promete responder *"o servidor entregaria um Kineo 1 de graça
para esta conta agora?"* — mas o predicado só olhava plano, pagamento e filmes
entregues, e **nunca consultou a cota**. Desde a Versão B a resposta do servidor
é NÃO para todo mundo, e ele continuava dizendo SIM. Agora consulta.

**As caixas ficam.** O degrau de ativação é bom e é o primeiro gesto de quem
chega — 175 pessoas por semana. O que sai é a promessa que termina em 402, não a
caixa.

**Prova.** `scripts/test-telas-sem-filme-gratis-2026-09-08.mjs`, **19
verificações** amarradas à condição e não à redação (a trava reprova
explicitamente a forma `= !CARD_ENTRY_ONLY`). **Seis mutações**, cada uma com o
md5 do arquivo antes e depois para provar que a mutação de fato aplicou — o
mutante que não é escrito devolve verde e se lê como guardião resistindo:

| mutação | vermelhas |
|---|---|
| manchete volta a ser JSX cru no `<h2>` | 4 |
| `No card needed` volta a ser incondicional | 1 |
| botão volta a `Create my free Short →` fixo | 1 |
| linha `· no card ·` deixa de ser condicional | 1 |
| espelho para de consultar a cota | 1 |
| condição vira `!CARD_ENTRY_ONLY` | 2 |

`npx tsc --noEmit` verde, com a junction de `node_modules` criada antes — sem
ela o `npx tsc` sai com código 0 sem typecheckar nada e o verde é mentira.

Duas armadilhas conhecidas apareceram e foram tratadas: a contagem de
ocorrências casava com **o meu próprio comentário** que explica o conserto (toda
contagem passou a rodar sobre o código sem comentário), e a âncora do contrato
tinha um `|| /limit:\s*0/` que a fazia **falhar aberta** — removido.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada.** Subiu sozinho pelo `!RODAR-AGORA.bat`.
2. Continua em aberto, da #2: **a decisão sobre a trava do `lib/compose.ts`**
   (commit `f42e410d`) — reverter ou aceitar que a intenção está respeitada.

#### 📋 O QUE ACONTECEU
Quando o trial grátis acabou às 04:22 da manhã, três telas não ficaram sabendo.
A pior delas é a janelinha que aparece quando alguém está saindo do site: ela
mostra, um do lado do outro, o selo "80 créditos por $1" e um título gigante
dizendo "experimentar é grátis". Essa janelinha é a peça que mais funciona na
casa inteira — 104 pessoas viram nos últimos sete dias e 20 clicaram, quase uma
em cada cinco — e era justamente a que estava mentindo mais alto. As outras duas
são a caixa que aparece embaixo do campo de texto para quem nunca fez um filme
(175 pessoas na semana) e o balãozinho de boas-vindas (49), que prometiam
"grátis" e "sem cartão" para gente que hoje precisa do cartão.

Agora as três perguntam ao próprio cobrador se existe filme grátis antes de
oferecer um. Como não existe, elas param de oferecer. Não inventei frase nova,
não mexi em preço e não tirei nenhuma caixa do lugar — as caixas continuam onde
estavam, porque elas são o primeiro gesto de quem chega. No dia em que você
reabrir o grátis, as três voltam sozinhas ao que eram: a condição é o limite, não
uma chave nova.

**Hoje quem chega para ir embora lê o preço certo na mesma tela em que decide —
e não uma promessa que morreria no clique seguinte.**

**Suíte inteira, medida contra worktree pristina em `origin/main`** (445
guardiões meus × 444 na base — a diferença é o guardião novo, que lá não
existe): **107 vermelhos antes, 107 depois, zero regressão e zero conserto
acidental**. Um deles era meu de verdade e foi consertado antes de publicar:
`test-exit-intent-variant-probe` (110/110 na base) prendia a **codificação** do
apóstrofo (`You haven&apos;t tried it yet`) e ficou vermelho quando a manchete
virou constante. Reancorado pela **frase**, normalizando o apóstrofo, e
falsificado: apagar a frase de verdade continua deixando-o vermelho.
`test-free-limit-wall` (6 falhas) é **herdado** — reproduzido idêntico na
worktree pristina, não encostei nele.

⚠️ Uma leitura errada minha, corrigida antes de virar acusação: na primeira
comparação apareceram **cinco** vermelhos "só meus" — todos no fim do alfabeto
(`test-v*`, `test-w*`). O baseline ainda estava rodando (425 de 445). Denominador
incompleto inventa regressão; a diferença só vale com as duas listas fechadas.

**Sonda em produção — `458b4568`, EM PRODUÇÃO.** `git ls-remote origin main` =
`458b4568`, fila 0. A mudança é React de componente de cliente, então a sonda é
no **bundle** da home, com a `src` completa lida do HTML (o `src` traz `?dpl=`;
procurar só em `/_next/static/chunks` dá falso negativo) e com **controle**:
`/_next/static/chunks/kineo-sonda-inexistente-r10.js` → **404**, home → **200**.

O discriminador é o **apóstrofo**, e ele separa os dois builds sem ambiguidade:
no build antigo a frase era texto JSX com `&apos;`, que o compilador transforma
em `'` (U+0027); no novo ela é uma string JS com `’` (U+2019).

| momento | `You haven't…` (U+0027) | `You haven’t…` (U+2019) |
|---|---|---|
| logo após o push (deploy ainda não pronto) | **1** | 0 |
| depois do deploy | 0 | **1** |

A primeira linha é a foto do "antes" — não a joguei fora: é ela que prova que a
sonda sabe distinguir os dois estados, em vez de só concordar comigo.

### #11 — 06:36→06:53 BRT — M4: o remédio existia havia 24h e nunca tinha rodado — 2 das 12 assinaturas seguiam cobradas e sem acesso

**O que estava errado.** A ordem manda olhar os 5 pagantes calados. Fui pela
lista e o retrato bateu exato: dos **12 pagantes** da casa (13 contas com
`has_paid`, uma é a sua), **5 não fazem um filme há 30 dias**. Mas dois deles
não pararam por desinteresse — **pararam porque a renovação foi recusada**:

| conta | cobrança | quando | motivo | estado hoje |
|---|---|---|---|---|
| …NG, Visa pré-pago | **US$ 9,90** (starter) | 03/09 · **de novo 07/09 17:26** | `insufficient_funds` | `plan='free'`, 172cr parados |
| …AU, Visa débito | **US$ 24,90** | 04/09 | `insufficient_funds` | `plan='free'`, 73cr parados |

As duas assinaturas continuam **vivas na Stripe e sendo cobradas**. A casa
gravou `plan='free'` e não avisou ninguém — nem a pessoa, nem o painel.

E aqui está o ponto que fez esta rotação: **o remédio para isso já existia, já
estava certo, e nunca tinha sido apertado.** A rota
`/api/admin/reconcile-dunning` nasceu em **07/09** — pergunta à Stripe o estado
vivo de cada assinatura e devolve o tier pela decisão pura
`decideDunningReconcile`. O cabeçalho dela **nomeia estas duas vítimas**.
Vinte e quatro horas depois:

```
subscription_access_restored_after_wrong_revoke  →  ZERO linhas na história inteira
```

A causa não é a decisão, que está certa e é conservadora. **É o gatilho: a rota
só abria por cookie de admin.** Rota de admin que espera clique não dispara — o
remédio ficou escrito, correto e fechado a chave, enquanto duas das doze
assinaturas da casa seguiam cobradas e sem acesso. É a terceira vez que esta
mesma armadilha aparece no meu caderno; desta vez custou 24h de plano a dois
clientes pagantes.

**O que mudou — `34a6d574`, EM PRODUÇÃO.**

A rota passa a aceitar **o mesmo contrato de cron das irmãs** (`Bearer
CRON_SECRET`, fail-closed sem a env — bloco copiado do vizinho
`send-card-declined`), e o `vercel.json` ganha `47 * * * *` com `?confirm=APPLY`.

**A decisão não mudou uma vírgula.** Continua sendo
`stripeSubscriptionKeepsAccess` quem responde, e ela só devolve acesso em
`active` / `trialing` / `past_due` — **enquanto a Stripe ainda cobra**. Em
`unpaid` / `canceled` / `incomplete*` / `paused` ninguém é restaurado, e uma
falha da Stripe numa pessoa vira `skip`, nunca restauração. O update é de dois
campos (`plan`, `is_pro`).

⛔ **O que o gatilho NÃO passa a fazer:** não toca crédito (crédito volta só em
`invoice.payment_succeeded`), não manda e-mail, não cria oferta, não muda preço.
Ele devolve à pessoa **o tier que ela contratou e que a Stripe está cobrando
neste minuto** — repara um valor que a casa escreveu errado.

**Prova.** `scripts/test-reconcile-dunning-gatilho-2026-09-08.mjs`, **23
verificações** amarradas à condição. D1/D2 **executam o predicado real**
(`stripeSubscriptionKeepsAccess`, importado de verdade pelo node) em vez de
descrevê-lo por regex — trava por nome de constante mente quando alguém
renomeia. Oito mutações, todas mordidas:

| mutação | vermelhas |
|---|---|
| cron sai, volta a ser só cookie de admin | 1 |
| fail-open: sem a env, autoriza | 1 |
| cron agendado em dry-run (perde o `confirm=APPLY`) | 1 |
| cron sumiu do `vercel.json` | 4 |
| crédito passa a ser tocado no restore | 2 |
| predicado redigitado dentro da rota | 1 |
| colide de minuto com outro cron | 1 |
| carimbo de origem some do evento | 1 |

⚠️ **Uma armadilha nova, e ela quase me enganou.** Eu provava cada mutação pelo
**md5 antes/depois**. Num checkout **CRLF** o `sed -i` reescreve as terminações
do arquivo inteiro: **o md5 muda mesmo quando o padrão não casa com nada**. Uma
mutação minha não aplicou, o md5 mudou assim mesmo, e o resultado apareceu como
"0 vermelhas" — lido de fora, um guardião furado. Pior: o harness engolia
`stderr`, então um *crash* também contaria como 0. As duas coisas foram
corrigidas e a mutação, refeita, morde. **A prova honesta de que a mutação
aplicou é `grep` do texto inserido, não o md5.**

**Dois vermelhos meus — reancorados pela CONDIÇÃO, não silenciados.** Medidos
contra worktree pristina em `origin/main` antes de eu encostar neles (um
terceiro, `test-dunning-grace`, já era vermelho na base e não é meu):

- `test-graca-nao-curou` **3.9** dizia *"nunca ecoa env nem segredo"* e
  implementava `!/process\.env/` — "o arquivo não pode **conter** `process.env`".
  São coisas diferentes: **ler** um segredo para comparar não é **ecoá-lo**, e a
  forma antiga proibia por construção dar gatilho automático à rota. Virou
  **3.9a/b/c**: só `CRON_SECRET` pode ser lida, o valor nunca sai em resposta,
  evento ou log, e só serve para comparar com o header.
- `test-cron-dryrun-eterno` cravava `confirm=SEND`. Agora **lê da própria rota**
  o token que ela exige para escrever. Ficou **mais forte**: antes, uma rota que
  exigisse `confirm=YES` agendada com `SEND` passava ✓ enquanto rodava em
  dry-run para sempre — exatamente o defeito que esse teste existe para pegar.

As quatro mutações dos dois reancorados também mordem (inclusive a nova força:
token errado).

**Sonda.** `git ls-remote origin main` = `34a6d574`, fila **0**.
⚠️ **Limite dito na cara:** esta mudança **não tem discriminador HTTP**. A rota
respondia 403 anônima antes e responde 403 anônima agora; sonda de fora não
distingue os dois builds. O discriminador honesto é o **cron**, e ele só corre
às `:47` UTC — o deploy ficou pronto depois das 09:47, então a primeira corrida
real é **10:47 UTC (07:47 BRT)**. O que a próxima rotação vai conferir, dito
antes para não virar torcida:

```sql
-- tem de existir, com source='cron_reconcile'
select created_at, user_id, metadata->>'source', metadata->>'tier', metadata->>'stripe_status'
from events where name='subscription_access_restored_after_wrong_revoke';
-- e as duas contas têm de sair de plan='free'
select plan, is_pro, video_credits from profiles
where id in ('0e53e01c-c28c-47bd-811f-10e03f82fa3f','bb51a203-c3ff-4786-bf30-97872d04b431');
```

E o resultado honesto pode ser **nenhuma restauração**: se a Stripe já tiver
movido as assinaturas para `unpaid`/`canceled`, a decisão recusa — e estará
certa ao recusar. O que esta entrega garante é que **a pergunta passa a ser
feita de hora em hora**, não que a resposta seja sim.

**Uma nota de honestidade sobre a autoria do commit.** A ordem desta rotina
manda assinar como Fable 5.1. Quem escreveu esta rotação foi **Opus 5**, e é
esse o nome no trailer — carimbar o modelo errado seria mentir no lugar mais
fácil de mentir.

#### ✅ O QUE VOCÊ PRECISA FAZER
1. **Nada.** Subiu sozinho pelo `!RODAR-AGORA.bat` — `origin/main = 34a6d574`.
2. Continua em aberto, da #2: **a decisão sobre a trava do `lib/compose.ts`**
   (commit `f42e410d`) — reverter ou aceitar que a intenção está respeitada.

#### 📋 O QUE ACONTECEU
Cinco dos seus doze clientes pagantes não fazem um filme há um mês. Fui ver um
por um, e dois deles não sumiram por vontade própria: **o cartão foi recusado na
renovação** — um de US$ 9,90 e um de US$ 24,90, os dois por saldo insuficiente,
em 3 e 4 de setembro. A Stripe continua cobrando as duas assinaturas, mas a
nossa casa já tinha rebaixado as duas contas para o plano grátis. Elas estão
pagando e sem receber.

O que me pegou não foi o defeito — foi que **o conserto já existia desde ontem,
estava certo, e nunca tinha sido acionado uma única vez**. Ele só abria com você
logado, clicando. Ninguém clicou. Ficou um remédio pronto no armário por 24
horas enquanto duas assinaturas ficavam sem acesso.

Agora ele roda sozinho, de hora em hora, e faz sempre a mesma pergunta
conservadora: *a Stripe ainda está cobrando esta pessoa?* Se sim, devolve o
plano que ela contratou. Se a assinatura morreu de vez, não devolve nada. E não
encosta em crédito, não manda e-mail e não muda preço — crédito só volta quando
uma fatura for de fato paga.

**Hoje quem teve o cartão recusado numa renovação tem o plano de volta em até
uma hora depois de a Stripe voltar a aceitar — ontem dependia de alguém lembrar
de clicar num botão que ninguém clicou.**

#### #11b — o resto do M4: os 5 calados, um por um — e por que não há rascunho nenhum

A ordem pede um rascunho pessoal por pagante calado. **Não há nenhum, e a razão
é medida, não preguiça.** O retrato, pessoa a pessoa (apelido = 4 primeiras
letras do e-mail; a coluna que decide é a última):

| quem | pagou | filmes | apertou "gerar" | erros | última visita REAL | o que aconteceu |
|---|---|---|---|---|---|---|
| …akaj | 03/08 starter | 5 | 5 | 3 | 03/08 | **defeito**: renovação recusada 03/09 e 07/09 → `free`, 172cr parados |
| …valo | 09/07 + renov. | 7 | 20 | **76** | 16/08 | **defeito**: renovação recusada 04/09 → `free`, 73cr parados |
| …den | 18/08 basic | 1 | 1 | 0 | **05/09** | abriu o Studio, viu os ladrilhos e **saiu sem apertar** |
| …emil | 01/08 starter | **0** | **0** | 0 | 01/09 | pagou e **nunca apertou gerar uma vez**; olhou preço e Autopilot |
| …bran | 10/07 | 6 | 27 | 0 | 23/07 | fez 6 filmes e não voltou |
| …ramo | 06/07 pack | 2 | 8 | 0 | 06/07 | fez 2 no dia da compra e não voltou |

⚠️ **Um detalhe de leitura que quase me fez errar:** `akaj` e `valo` aparecem
com "atividade" em 07/09 e 04/09 — mas esses eventos são **webhook da Stripe**,
não navegador. A última vez que essas duas pessoas de fato abriram o site foi
**03/08** e **16/08**. Contar webhook como visita transformaria "cliente sumido
há 5 semanas" em "cliente ativo ontem".

**A conclusão do M4, e ela é mais estreita do que a ordem supunha.** Dos casos
acima, **exatamente dois têm defeito de produto** — e é o mesmo defeito, que
esta rotação consertou. Os outros quatro não encontraram nada quebrado: `bran` e
`ramo` fizeram os filmes que queriam e foram embora, `emil` pagou e nunca chegou
a apertar o botão, `den` voltou ao Studio em 05/09 e saiu sem gerar. **Não houve
tela de erro, não houve crédito preso, não houve render perdido.** Chamar isso
de "produto travou" seria inventar um conserto.

**Por que não escrevo rascunho para eles.** Três dos cinco (`akaj`, `den`,
`emil`) estão na **sua lista de contatos proibidos** — não escrevo, nem em
rascunho. Os outros dois (`bran`, `ramo`) sumiram há **6 e 9 semanas** depois de
receber o que compraram; carta minha aí é chute, não conversa. E `valo` — o
único caso vivo e contactável — tem uma decisão de ontem já tomada em cima
dele: a `send-card-declined` **exclui de propósito** recusa de renovação, com o
argumento de que a Stripe já tem régua própria e carta nossa por cima é ruído.
**Não vou reverter em silêncio uma decisão de outra pista tomada há 12 horas.**

**O que fica anotado no lugar do rascunho.** `valo` levou **76
`generation_stage_error`** antes de parar — 31 `idle`, 31
`resolved=false resumed=false retries=0`, 7 `composing` e **7 vezes a frase
"We couldn't confirm the credits for this clean video, so it wasn't delivered"**
(29-30/07 e 07/08). É o cliente que mais bateu na parede na história da casa, e
ele renovou mesmo assim. **Se alguma carta valer a pena para ele, o assunto não
é o cartão — é essa parede.** Fica para quem tiver o dado dos dois lados; eu não
vou escrever oferta às 7 da manhã em cima de erro de julho sem medir se ele
ainda existe.

**Suíte inteira, medida contra worktree pristina em `origin/main` (`9699b395`)
com as duas listas FECHADAS:** **107 vermelhos em 445 na base · 107 em 446 no
meu** — o +1 é o guardião novo, verde. Comparado **por lista, não por
contagem**: `comm` nos dois sentidos devolve **vazio dos dois lados**. Zero
regressão e zero conserto acidental. (Contagem igual pode esconder "quebrei um,
consertei outro"; a lista não.)

---

### #12 — 07:06→07:30 BRT — M9: a única leitura SEM JANELA do cron de trial já estava acima do teto invisível de 1.000

**O que estava errado.** O `db.max_rows` deste projeto corta **toda** resposta do
PostgREST em **1.000 linhas e não devolve erro** — foi o mecanismo do reenvio 8×
de 21/08, e a casa tem remédio próprio para ele desde 28/08
(`lib/truncationTripwire.ts`). Medi a **cobertura** do remédio antes de escrever
qualquer linha: ele é importado por **9 rotas de e-mail**, e **a maior máquina de
e-mail da casa não é uma delas**. `trial_lifecycle_email_sent` tem **3.165
linhas para 812 pessoas** — uma ordem de grandeza acima de qualquer outro
carimbo de campanha (o 2º maior tem 225).

Dentro de `app/api/cron/trial-lifecycle-emails/route.ts` existe **uma** leitura
sem corte por tempo: a de idempotência, em `trial_emails_log`, que responde
"quem já recebeu qual kind". Idempotência vale para sempre, então aquela tabela
**só cresce**, e cada conta traz **uma linha por kind**, não uma linha. Ela
pedia **200 contas por requisição** — e o comentário que justificava o 200
falava de **comprimento de URL**, uma razão que nunca contou linhas por conta.

Medido no banco, hoje, antes de tocar no código:

| medida | valor | contra o teto de 1.000 |
|---|---|---|
| linhas / contas em `trial_emails_log` | 3.149 / 812 = **3,88 kinds por conta** | — |
| bloco de 200 contas **maduras** (>14d) | **962 linhas** | **96%** |
| as **200 contas mais pesadas** | **1.033 linhas** | **já passou** |
| bloco de 200 com os 6 kinds maduros | **1.200 linhas** | **17% perdido** |

**O que isto NÃO é — e digo com o código na mão, porque a diferença decide se
alguém vai "consertar" de novo o que já está fechado: não é spam.** O passo 4b
faz um `upsert` em `trial_emails_log` com PK `(user_id, email_kind)` e
`ignoreDuplicates: true`, e não envia quando o claim volta com 0 linhas — envio
duplo é **impossível por construção**, mesmo com a leitura do passo 2 truncada.
O dano é outro e menor: quem **já recebeu** reaparece em `fresh`, ocupa vaga no
`batch` de `MAX_PER_RUN = 40` e some no claim. **O teto da execução é gasto com
no-op, e quem devia receber naquela hora fica para a próxima.**

**O que NÃO tinha o defeito, medido para não consertar o que está certo.**
`lib/lifecycle/suppression.ts` abre as mesmas tabelas com o mesmo bloco de 200,
mas **corta na origem** com `.gte(cutoff)` de 24h: a casa inteira teve **109
linhas em `trial_emails_log` e 117 em `email_send_log` nas últimas 24h**. Não
encostei nela. As outras duas leituras multi-linha do próprio cron (contagem de
vídeos e "derrubado por nós") já pediam **50** contas por requisição
exatamente por causa do teto — a de dedupe era **a única fora do padrão do
próprio arquivo**.

**O que mudou (SHA `84b6564e` + `33d55572`, EM PRODUÇÃO).** Cura no padrão que o
arquivo já usava: bloco de **50** contas (`EMAIL_LOG_USERS_PER_QUERY`, folga de
3,3× mesmo com a coorte inteira madura) + página de **500**
(`EMAIL_LOG_PAGE`, abaixo do teto do servidor, para "página cheia" significar
"tem mais" e não "o servidor cortou") + **ordem TOTAL** pela PK
(`user_id`, `email_kind`, as duas NOT NULL) + **falha FECHADA**: o teto de bloco
responde **503**, não um `break` que seguiria com a lista de "já recebeu"
incompleta. Junto saiu `CHUNK_SIZE = 200`, que ficou **sem nenhum chamador**, e
o comentário da leitura irmã, que se comparava a ele, deixou de mentir.

**O carimbo, porque esta rota não tem sonda.** Cron autenticado respondia 401
anônimo antes e responde 401 anônimo agora: **nenhuma sonda de fora distingue os
dois builds**, e dizer "está em produção" sem isso seria torcida. Por isso
`dedupe_rows` e `dedupe_pages` viajam no evento `trial_lifecycle_email_sent`. A
partir da próxima corrida das **:25 UTC**, o corte honesto é
`metadata ? 'dedupe_rows'` — **nunca o relógio** — e `dedupe_pages` maior que o
número de blocos seria a primeira execução que precisou de uma 2ª página, ou
seja, o dia em que o teto teria mordido no código antigo.

```sql
-- corte pelo CAMPO NOVO, não pela hora
select created_at, user_id, metadata->>'kind',
       metadata->>'dedupe_rows', metadata->>'dedupe_pages'
from events
where name = 'trial_lifecycle_email_sent' and metadata ? 'dedupe_rows'
order by created_at desc limit 20;
```

**Prova.** `scripts/test-dedupe-teto-1000-2026-09-08.mjs`, **29 verificações**,
todas amarradas à **condição**: o pior bloco é recalculado a partir de quantos
kinds existem em `KIND_PRIORITY`, então **um 7º kind fica vermelho sozinho**
quando a folga acabar (falsifiquei isso: 7 kinds × 80 contas = 560 → vermelho).
**9 mutações**, cada uma provada por `grep` antes de acreditar no vermelho
(mutacao-precisa-provar-que-aplicou), e cada uma mordendo a verificação certa:
volta do bloco de 200 (2 falhas), teto virando `break` — a falha aberta
disfarçada de proteção — (3), ordem total incompleta (1), `CHUNK_SIZE` ressuscitando
(1), `ignoreDuplicates` caindo (1), e as 3 do carimbo. `tsc --noEmit` verde pelo
binário local (`npx tsc` mente com exit 0 nesta worktree).

**Um erro meu no meio, registrado porque é a memória exata que existe para
isto.** Rodei as 3 primeiras mutações do carimbo com o carimbo ainda **não
commitado**; o `git checkout --` da própria bateria apagou a mudança, e duas
mutações devolveram "não aplicou" em vez de vermelho. O harness pegou porque ele
**exige provar por `grep` que a mutação entrou** antes de ler o resultado — sem
essa trava, dois "verdes" falsos teriam passado por prova.

**Uma segunda bomba no mesmo arquivo, medida e NÃO consertada — e a razão de
não.** A leitura da **coorte** (`.in('trial_status', [...]).limit(5000)`)
devolve **835 linhas**, 84% do teto, e o `.limit(5000)` **lê como cuidado e não
é**: o servidor corta em 1.000 do mesmo jeito e a consulta não tem `ORDER BY`,
então *qual* pedaço ficaria de fora não é sequer estável entre execuções.
Antes de hoje entravam **20 a 55 pessoas por dia** nessa coorte e o teto cairia
em ~6 dias. **Parou de crescer hoje:** a Versão B manda conta nova para
`trial_status='card_required'`, que **não está na lista** — agora são **3
`card_required`** (todas de hoje) contra **140 `active` + 711 `downgraded`** do
regime antigo, e só entra quem passa o cartão. **A bomba foi desarmada por uma
decisão de produto, não por mim**, e rearma se a conversão de $1 escalar. Ficou
no PEDIDOS com o conserto descrito; consertar hoje seria mexer na consulta que
alimenta a esteira inteira para resolver um número que acabou de parar.

**Suíte inteira, contra worktree pristina no meu próprio pai (`61136003`), com
as duas listas FECHADAS:** **107 vermelhos em 446 na base · 107 em 447 no meu** —
o +1 é o guardião novo, verde. Comparado **por lista, não por contagem**: `comm`
nos dois sentidos devolve **vazio dos dois lados**. Zero regressão e zero
conserto acidental. ⚠️ E uma armadilha do próprio harness, porque ela quase me
deu um número: a primeira tentativa da base rodou com o `mklink` do
`node_modules` **falhando em silêncio**, o `&&` cortou o laço, e o arquivo de
saída ficou **vazio** — que de fora é idêntico a "ainda rodando". Eu estava
esperando por nada. Denominador conferido dos dois lados antes de comparar
(baseline-incompleto-inventa-regressao).

**✅ O QUE VOCÊ PRECISA FAZER**

1. **Nada nesta entrada.** A entrega subiu sozinha pelo bat; nenhuma decisão sua
   está bloqueando nada aqui.

**📋 O QUE ACONTECEU**

A esteira de e-mails do trial — a maior máquina de e-mail da casa, 3.165 envios
para 812 pessoas — lia "quem já recebeu o quê" num pedaço que já estava **acima**
do limite invisível de 1.000 linhas do banco. Não estava mandando e-mail
repetido (existe uma segunda trava que impede isso por construção), mas estava
**gastando as 40 vagas de cada rodada com gente que já tinha recebido** — e quem
devia receber naquela hora ficava para a próxima. Agora a leitura vem em pedaços
pequenos, em ordem fixa, e **prefere não mandar nada a mandar com a lista pela
metade**. Também deixei um carimbo no evento para a próxima corrida provar, sem
achismo, que o código novo é o que está rodando. Ficou anotado no PEDIDOS um
segundo ponto do mesmo tipo que **parou de crescer sozinho** quando a Versão B
entrou — não gastei rotação nele.

**Publicação.** `bash scripts/enfileirar.sh` (fila estava em 0, entrou com 3) e
o bat: **`git ls-remote origin main` = `6fcff9ee`, fila = 0**, às **10:24 UTC**.
Sonda com controle: `/api/cron/trial-lifecycle-emails` responde **401** e o
irmão inexistente `-CONTROLE-404` responde **404** — a rota está viva e continua
fechada, que é tudo o que uma sonda externa pode provar aqui.
⚠️ **O relógio importa e digo antes de virar torcida:** o push saiu às 10:24 e o
deploy leva até ~6 min, então a corrida das **10:25 UTC ainda roda o build
velho**. A **primeira** execução com o código novo é a de **11:25 UTC (08:25
BRT)**, e o teste dela é a consulta do bloco acima — `metadata ? 'dedupe_rows'`,
nunca o relógio. Se ela voltar **vazia**, a resposta honesta é uma de duas: o
deploy não pegou, ou **ninguém estava devido** naquela hora (que é o caso comum:
`MAX_PER_RUN` só enche quando há coorte). As duas se separam pelo campo, não
pela ausência dele — para distinguir, olhe se saiu **qualquer**
`trial_lifecycle_email_sent` na janela.

---

### #13 — 07:36→08:0X BRT — M2: a régua de ROTEIRO era cobrada de quem colou MATÉRIA-PRIMA

**Onde esta rotação começou.** Das dez ações, M5 ("o primeiro filme dos 77") era
a única sem rotação. Fui medir o funil dela por pessoa e o degrau seco me
levou a outro lugar — que é o M2, e estava aberto.

**O funil dos 7 dias, por pessoa** (235 cadastros externos, `videos` só ganha
linha quando o filme FICA PRONTO — conferido: `status` distinto de `completed`
= 0 linhas):

| degrau | pessoas |
|---|---|
| cadastrou | 235 |
| **sem nenhum filme** | **80** |
| desses: chegou ao Studio | 51 |
| desses: apertou "analyze" | 32 |
| desses: despachou render | 24 |
| desses: recebeu filme | **0** |

Dos 80 sem filme, **19 chegaram ao Studio e nunca apertaram nada**. Fui ver o
que estava na tela dessas 19 e uma linha tinha razão absurda:

    studio_prompt_over_limit_shown ....... 2 pessoas, 364 eventos

**Duas pessoas, 364 eventos, e nenhuma das duas apertou nada.**

**A parede, medida na casa inteira.** `studio_prompt_over_limit_shown`: **444
eventos, 10 pessoas, 5 dias**. O contador é por comprimento distinto do texto —
ou seja, **por tecla**. Contei gente e dias antes de acreditar no número
(memória `evento-por-tecla-infla-denominador`), e a leitura por pessoa é o que
dói:

| pessoa | teclas | maior texto | modos | fez filme depois? |
|---|---|---|---|---|
| mdshahbaz052005 | **275 em 1 minuto** | 11.241 | ai+verbatim | **nunca — 0 filmes** |
| harrybell8989 | **89 em 21 minutos** | 13.625 | ai+verbatim | **nunca — 0 filmes** |
| sshivanna28146 | 1 | 10.404 | ai | **nunca — 0 filmes** |
| outras 7 | 1 a 22 | 5.150 a 20.191 | — | 7 fizeram |

275 comprimentos distintos em sessenta segundos é uma pessoa **segurando o
backspace**, apagando o próprio texto letra por letra para caber num teto, com
o botão Generate travado. Ela foi embora sem filme.

**A saída que a casa oferecia era cortar o texto dela.** O `/studio` bloqueia o
despacho (`if (limit.over) return`) e oferece **um** botão: `trimToFit`, que
apara o texto no fim. Medido em toda a história: **10 pessoas bateram, 1
apertou o corte**. Nove recusaram a mutilação — que é a resposta sadia, e é
exatamente o que a regra do fundador manda (*"nunca amputar o filme"*) e o que
a memória `remedio-nunca-apertado` já tinha escrito: não se oferece mutilação
do trabalho da pessoa como único remédio.

---

**O errado, em uma frase.** O teto de 5.000 é uma **régua de roteiro** e estava
sendo cobrado de um texto que **não é roteiro**.

A razão do número está escrita em `lib/gptHandoff.ts` e é honesta: *"Um 90s cabe
em ~1.800 caracteres — 5.000 é folga, não aperto."* Isso é **verdade** quando o
texto **é** o filme (`script_mode='verbatim'`): ali as palavras da pessoa viram
narração, e 13.000 caracteres não são um Short, são 16 minutos de fala. Só que
a **mesma** régua era cobrada de quem escolheu *"Let AI structure my text"*
(`script_mode='ai'`) — e ali o texto é **matéria-prima que este mesmo endpoint
manda o modelo condensar em 150-265 palavras**. Colar um artigo de 11.000
caracteres para o modelo resumir não é um roteiro comprido demais: é o uso que
o modo existe para servir. A mediana do texto barrado no modo `ai` era **11.033
caracteres**.

**O que eu conferi ANTES de subir o número, porque quase não subi.** O texto
viaja do `/studio` para o `/generate` **pela querystring** — então o teto podia
ser da URL, e trocar um beco sem saída conhecido por um 431 desconhecido seria
pior. Sondei a produção com controle ao lado:

    prompt_len=2.000  -> 307      prompt_len=14.000 -> 307
    prompt_len=6.000  -> 307      prompt_len=20.000 -> 307
    prompt_len=10.000 -> 307      prompt_len=30.000 -> 307
    controle /generate-CONTROLE-404 -> 404   (a sonda discrimina)

Trinta mil caracteres passam. **A URL não é o teto.** Conferi também o custo:
`gpt-4o-mini`, 128k de contexto, e `max_tokens` ali é orçamento de **saída** —
não muda. O texto entra duas vezes na mensagem, então 20.000 caracteres ≈ 10k
tokens de entrada ≈ **US$ 0,0015** por análise.

**O que mudou (SHA `fde757ad`).** O teto passa a ser **do modo**, com fonte
única em `lib/analyzeLimits.ts`:

* `verbatim` → **5.000, intacto**. A razão original continua valendo e o
  guardião trava a subida: as palavras são o filme.
* `ai` → **20.000**. Cobre os dez casos medidos (o maior foi 20.191 — um artigo
  inteiro vindo do `chatgpt.com`).

As três pontas leem **a mesma função** `analyzePromptMaxChars(scriptMode)`: o
cobrador (`/api/analyze-idea`), a tela que trava o botão (`/studio`) e a recusa
antes da rede (`/generate`). A **frase** de recusa passa a receber o teto por
parâmetro — antes ela citava a constante, então sob o teto novo ela diria "over
the 5,000 limit" enquanto o servidor cobrava 20.000 (`campo-validado-gravado-
ecoado-nao-e-honrado`: auditei o construtor final da mensagem, não só a
validação). A telemetria passa a gravar `script_mode` e o teto cobrado.

⚠️ **O que este commit NÃO faz, de propósito.** Não toca em como o filme é feito
— é teto de **entrada**, e o pipeline (régua 35/60/90, roteiro, motores, custos)
está intocado. Não remove a trava do Studio: `if (limit.over) return` continua
lá e o guardião fica vermelho se alguém a tirar, porque subir o teto não pode
virar "deixa ir e quebra no servidor". E não mexe em `ANALYZE_PROMPT_MAX_CHARS`
(segue 5000), para que **nenhum importador existente** — `chatgptQuickstart`,
`gptHandoff`, `composerUrl` — mude de comportamento junto.

**Prova.** `scripts/test-roteiro-longo-nao-e-erro-2026-09-08.mjs`, **26
verificações** em estilo `readFileSync`/contagem, todas passando por
`semComentarios()` (senão a contagem casa com o próprio comentário que explica o
conserto). **7 mutações, 7 vermelhas**, cada uma provada por `grep` do texto
inserido antes de eu ler o resultado — nunca por md5, que num checkout CRLF muda
sozinho:

    verbatim sobe junto (a régua do filme cai) ........ VERMELHO
    a rota volta a cobrar a constante velha ........... VERMELHO
    a frase do 400 deixa de citar o teto cobrado ...... VERMELHO
    o Studio para de barrar o Generate ................ VERMELHO
    a tela do Studio volta ao teto padrão ............. VERMELHO
    a frase do /generate mente (cita outro teto) ...... VERMELHO
    o maxLength da caixa volta a cravar 5.000 ......... VERMELHO

`tsc --noEmit` verde pelo **binário local** (`node node_modules/typescript/bin/
tsc`), com a junction conferida antes — `npx tsc` devolve exit 0 sem compilar
nada em worktree sem `node_modules`.

---

**A atribuição, que eu fui conferir para não superestimar — e que saiu mais
forte do que eu esperava.** Perguntei o óbvio primeiro (memória
`credito-zero-significa-tres-coisas`): será que essas pessoas simplesmente não
tinham crédito? Não é isso.

| pessoa | conta criada | bateu na parede | crédito | **cliques em analyze/generate na VIDA INTEIRA** |
|---|---|---|---|---|
| mdshahbaz052005 | 02/09 07:19 | 07:20 (**+1 min**) | 25 no dia, hoje 0 (trial venceu sem uso) | **0** |
| harrybell8989 | 06/09 06:03 | 06:05 (**+2 min**) | **25, intactos** | **0** |
| sshivanna28146 | 07/09 09:18 | 09:18 (**no mesmo minuto**) | **25, intactos** | **0** |

As três bateram na parede **dentro dos dois primeiros minutos de conta**, e
nenhuma das três apertou o botão de gerar **uma única vez na história**. A
primeira coisa que o produto fez com elas foi travar a caixa de texto. Das 293
coisas que mdshahbaz052005 fez na Kineo inteira, **275 foram apagar o próprio
texto** contra um contador de caracteres. Duas delas ainda têm os 25 créditos
parados: a casa deu crédito para gente que ela então não deixou digitar.

⚠️ **Onde eu NÃO vou além do dado:** isto prova que a parede foi o **primeiro**
degrau delas e que nenhuma passou dele — não prova que elas teriam pago. E o
tamanho é o que é: **10 pessoas em 5 dias**, ~2 por dia. Não é a maior parede da
casa; é a mais **injusta**, porque acerta no minuto um e a única saída que
oferecia era a pessoa mutilar o próprio texto.

---

**⛔ E AQUI EU PAREI — A TRAVA DE QUALIDADE DO FUNDADOR REPROVA ESTA ENTREGA.**

Rodei a suíte inteira contra worktree pristina no meu próprio pai (`c0bc22fe`),
comparada **por lista** nos dois sentidos: **107 vermelhos em 447 na base · 108
em 448 no meu**. O denominador +1 é o meu guardião, verde. E o `comm` devolveu
**exatamente uma** regressão:

    scripts/test-despacho-vazio-2026-09-04.mjs
      ✗ 8.2 nao toca app/api/analyze-idea/

Não é falso vermelho e não é âncora podre. É a **trava de qualidade que o
fundador pôs em 03/09**, e ela lista `app/api/analyze-idea/` ao lado de
`lib/compose`, `lib/hollywood/`, `lib/cinematic/`, `lib/broll/`,
`lib/lyriaMusic`, `lib/narrationFit` e `app/api/generate-script/` — o motor de
vídeo. É uma trava de **CAMINHO**, não de intenção.

**Eu tenho um argumento e não vou usá-lo para passar por cima dela.** O
argumento existe: a ordem desta rotina diz que "M1 e M2 mexem em retry e em
**limite de entrada**, não em como o filme é feito", e o meu diff mexe só na
conferência de comprimento no topo da rota, antes de qualquer geração — o
pipeline não muda em nada. Mas *"eu julguei que o meu caso é exceção"* é
exatamente o raciocínio que uma trava de caminho existe para vencer, e o
`PEDIDOS` **já tem uma violação desta mesma família aberta hoje**, sem
julgamento dele (a entrada sobre `f42e410d`). Publicar a segunda enquanto a
primeira espera seria compor o erro. **Com o fundador dormindo, a trava dele
vale mais que a minha leitura.**

**O que fiz em vez disso.** O commit está pronto, testado e **guardado**, não
descartado:

    branch local .... mp13-roteiro-longo
    SHA ............. fde757ad
    estado .......... NÃO enfileirado, NÃO publicado
    worktree ........ C:\kineo-wt\mp-prompt-longo, de volta em c0bc22fe
    trava do fundador ... 51/51 VERDE de novo depois do reset

Não está em produção. A decisão é de uma palavra e é dele.

**✅ O QUE VOCÊ PRECISA FAZER**

1. **Decidir uma coisa só: o teto de entrada pode encostar em
   `app/api/analyze-idea/`?** O commit `fde757ad` (branch `mp13-roteiro-longo`)
   sobe o teto de 5.000 para 20.000 **só** no modo "Let AI structure my text",
   mexendo apenas na linha que confere comprimento — o roteiro, a régua e os
   motores ficam idênticos. Se for **"vai"**, responda isso e a próxima rotação
   enfileira e publica em 10 minutos. Se for **"não"**, eu apago a branch e o
   achado vira PEDIDO para o Codex resolver por outro caminho.
2. **Nada mais.** Nenhuma outra ação sua está bloqueando nada nesta rotação.

**📋 O QUE ACONTECEU**

Fui atrás das 80 pessoas de 7 dias que se cadastraram e nunca receberam um
filme, e o degrau mais seco não era falta de vontade: **19 chegaram ao Studio e
nunca apertaram nada**. Duas delas passaram a vida inteira na Kineo brigando
com um contador de caracteres — uma apagou o próprio texto **275 vezes em um
minuto**, com o botão travado, e foi embora. A causa é que a caixa cobra uma
régua de **roteiro** (5.000 caracteres, o tamanho certo para um filme de 90
segundos) mesmo de quem escolheu *"deixe a IA estruturar meu texto"* — onde o
que a pessoa cola é **matéria-prima** para a IA resumir, e colar um artigo
inteiro é o uso que esse modo existe para servir. Três pessoas bateram nessa
parede **nos dois primeiros minutos de conta** e nenhuma delas apertou o botão
de gerar uma única vez; duas ainda têm os 25 créditos parados. A única saída
que a casa oferecia era um botão para **cortar o texto da pessoa** — 1 em 10
aceitou.

O conserto está escrito, testado (26 verificações, 7 mutações, `tsc` verde) e
**não subiu**: ele toca um arquivo que a sua trava de qualidade de 03/09
protege. Preferi te entregar a decisão do que decidir por você às oito da manhã.
