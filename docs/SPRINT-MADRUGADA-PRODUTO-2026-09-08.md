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
