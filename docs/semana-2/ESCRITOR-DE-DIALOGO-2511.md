# Escritor de diálogo · modo "personagens falam" · 25/11 (autora)

- **Pedido:** CEO, 25/11 à noite. Decisão em `docs/estrategia/DECISAO-PERSONAGEM-FALANDO-2511.md`.
- **Branch:** `codex/escritor-de-dialogo-2511`, sobre a `eb07dbd73`. O servidor do filme (o adaptador do Gemini e o compose) é do autor 3bbf48a0. Não toquei em `generate-video-cinematic/route.ts`, `lib/compose.ts` nem `geminiNaEsteira*`.

## O que faz
- **Quando roda:** o cliente usa "Let AI structure" (`script_mode 'ai'`) num filme curto (20 s ou menos), em inglês, com **`voice_mode: 'characters'`**. Nesse caso o `/api/generate-script` devolve o roteiro já com as falas.
- **Onde:** um bloco novo no começo do POST, depois da moderação do tema e antes do retorno dos marcadores.
- **Quem escreve:** `lib/cinematic/escritorDeDialogo2511.ts`, numa chamada só ao `gpt-4o` (o modelo do escritor de hoje). A saída é json_schema estrito, e o **código** confere a régua e monta o texto.
- **Fora da régua, falhou ou demorou:** segue o escritor de hoje, e o filme sai narrado. O rastro `dialogue_script_written` grava só números e o motivo.
- **`voice_mode` ausente ou `'narrator'`:** nenhuma linha nova roda. O guardião prova que a rota só GANHA linhas: o diff contra a base não tem nenhuma linha removida.
- **Chave:** `QUEM_FALA_NO_ROTEIRO = 'internal'`, só a lista exata da casa. Para abrir, `'public'`.

## O formato que sai
- **Cada seção:**
  - o cabeçalho de hoje do filme curto, `HOOK / MICRO REWARD 1 / MICRO REWARD 2 / PAYOFF: [Pexels: cue]`;
  - depois, em linhas próprias, 1 ou 2 falas `Nome: fala`.
- **As seções** são separadas por uma linha em branco.
- **O nome** fica como o personagem é chamado, sem caixa alta, por exemplo `Mara`.
- **Volta 3: o FORMATO EXATO do leitor do 3bbf48a0** (`lerFalas2511`, topo de `docs/semana-2/PERSONAGENS-FALAM-2511.md`).
  - A seção é só de linhas `Nome: fala`, e cada fala termina em `.` `!` `?` `…` ou aspas de fecho. Se a fala vier sem isso, o código põe o ponto final.
  - Quem fala está na marca `[Pexels: …]` da seção.
  - **Conferido executando o leitor dele** (branch `codex/personagens-falam-2511` @ `a1b8f3588`, transpilado):
    - o roteiro que este escritor monta passa pelo `parseUserScript` e pelo `lerFalas2511` com as falas e os nomes certos, a 3,75 s e a 4 s por plano;
    - funciona com o nome do elenco só pelo núcleo e com o nome completo mais o núcleo.

## A régua (no código; o que não passa = narrado de hoje)
- exatamente 4 seções, na ordem;
- de 1 a 2 falantes no filme inteiro, com nome próprio, e nunca narrador, voz de fora ou nome repetido;
- sem título na frente do nome (Captain, Mr…), e nenhum dos dois nomes contido no outro;
- cada seção com 1 ou 2 falas de quem foi declarado, com **até 8 palavras SOMADAS** (contadas como o leitor conta, por espaço);
- quem fala está na **marca `[Pexels: …]`** da seção, o nome como palavra inteira, sem caixa;
- nenhuma rubrica (parênteses, colchete, asterisco) e nenhum outro `Palavra:` dentro da fala;
- toda fala termina em `.` `!` `?` `…` ou aspas de fecho; a que vem sem isso ganha o ponto final;
- `cue` de 2 palavras ou mais, sem colchete nem dois-pontos;
- o filme com **25 a 35 palavras** de fala; com 4 seções de até 8, o teto efetivo é 32. Com os nomes (uma fala por seção, no mínimo), o roteiro aceito sempre passa do piso de 29 palavras do `avaliarRoteiroEscrito`, que conta os nomes.

## Volta 4 (25/11): famoso, criança e tempo
Pedido da CEO depois da revisora 392f0a52 (`docs/revisoes-2311/CEO-ESCRITOR-DE-DIALOGO-2511.md`). Dois commits.
- **Commit A, independente:** T3, os campos do evento e os textos velhos.
- **Commit B, EMPILHADO sobre a `codex/famoso-sem-referencia-2511` @ `f9850c3b5`:** T1 e T2.
  - As funções da régua (`figuraNaReferencia2511`, `textoDizMenor2511`) **não estavam** na base `22aa694f4` nem na main `bae90ade5`.
  - Por isso o merge da `f9850c3b5`, e nenhuma lista copiada.
  - **O B só sobe junto com a famoso, ou depois dela.**

### T1 · Famoso, pessoa real, marca e obra não falam
- **O que barra:** a MESMA régua da admissão do filme, `mentionsRealPerson` mais `figuraNaReferencia2511` (a tabela de figuras, a de marca e a de obra).
- **Onde ela é aplicada:** no texto inteiro e em cada nome próprio que ele traz.
  - Na ideia: antes da chamada, que nem sai.
  - No roteiro que saiu: o nome que o escritor escolheu e o que a fala cita.
- **Resultado:** bateu = o narrado de hoje, motivo `figura` no rastro.
- **Os ataques da revisora:** "Elon Musk", "Musk", "elon musk" (minúscula), "Spider-Man", "spider-man", "Lara Croft" e "Napoleon" caem todos.
  - "Lara" sozinha não cai: é nome comum, e a régua da casa também não a pega.

### T2 · Criança e adolescente não falam
- **A régua:** a de menor das duas pessoas (`textoDizMenor2511`: palavra ou idade abaixo de 18), na ideia e no roteiro que saiu. Bateu = narrado, motivo `menor`.
- **Um passo mais dura que "sem sinal de adulto E com menor":** o sinal de adulto **não libera**, porque não diz QUEM fala.
  - "A seven-year-old girl talks to her grandmother" tem os dois sinais. Com o "E", a menina falaria.
  - Voltar ao "E" literal é uma linha (`menorNoDialogo2511`).
- **O custo medido nos 10 casos do ensaio:** só o f3 cai ("call his daughter", a filha do paciente). Os outros 9, incluindo bicho, robô, dragão e cacto, seguem falando.

### T3 · Tempo
- **Antes:** o diálogo (35 s) mais a 1ª chamada do narrado (35 s fixos) passavam do `maxDuration` 60.
- **Agora:** o diálogo leva só o que sobra de 60 − 3 de folga − 35 do narrado − o já gasto, **até 12 s**. Abaixo de 5 s, nem chama (motivo `sem_tempo`).
  - O narrado de hoje guarda os 35 s dele INTEIROS.
  - Nenhuma linha do narrado mudou: a rota continua só ganhando linhas.
- **Por que 12 s:** a saída é um JSON de 150 a 250 tokens.
  - As chamadas curtas do gpt-4o desta rota (`script_condense_retry`, 30 dias, 8 casos) deram 1,3 s na mediana, 3,7 s no p95 e 4,6 s no máximo.
  - Rever com o p95 de `ms` dos primeiros `dialogue_script_written` (o rastro grava `ms` e `prazo_ms`).

### Também
- **O `script_written` do falado** grava `pessoa_inventada`, `family`, `voice` e `words_per_second`, como o narrado.
- **O conferidor do ensaio conta `fala_longa`.** T4 é do 3bbf48a0.
  - O teto do leitor é `floor(2,2 × segundos do plano)`.
  - **A 3,75 s por plano:** 0 de 10 por construção (8 por seção).
  - **A 3 s:** 10 de 10 por construção, porque 25 > 4 × 6 e todo roteiro aceito tem uma seção de 7 ou 8.
  - O ensaio imprime a linha `FALA_LONGA`.

## O risco do caminho do servidor (conferido, executado)
O roteiro de diálogo passa intacto pelo que o caminho da ideia solta faz depois do escritor (`lib/meta95/ideiaNoEscritor.ts`):
- `roteiroSemMetaTexto` (l. 224) não remove nenhuma linha `Nome: fala`;
- `avaliarRoteiroEscrito` (l. 283) aprova com kling4, gemini e seedance a 15 s: 40 palavras contra o piso de 29, em 4 blocos;
- `promptComRoteiro` (l. 303) mantém a fala, e `mesmaFalaQueORoteiro` (l. 309) dá true.

O único cuidado é o piso, que conta os nomes. Daí o mínimo aceito de 26 palavras de fala.

## Por onde o `voice_mode` precisa viajar (pedidos)
- **Ao GPT (tela):**
  1. a escolha em /create/film chega ao `GenerateClient`;
  2. o `GenerateClient` manda `voice_mode` no POST `/api/generate-script`, nas DUAS chamadas: a do modo 'ai' (l. 8891) e a do `handleWriteFullScript` (l. 8300, a do 422 automático). Sem isso a 2ª reescreve como narração;
  3. o `GenerateClient` manda `voice_mode` no POST `/api/generate-video-cinematic`.
- **Ao 3bbf48a0:**
  - repassar `body.voice_mode` no corpo do `escritorMarcadoDoGenerateScript` (route.ts l. 2081). É o caminho da ideia solta escrita pelo servidor;
  - o portão de tamanho do filme curto precisa aceitar a fala: são de 25 a 35 palavras, contadas sem os nomes.

## Executado (sem rede)
- **Guardião `scripts/test-escritor-de-dialogo-2511.mjs`:** PASS, com todos os mutantes mortos (o número exato sai na última linha do guardião).
  - Testa a chave e o `voice_mode`, o pedido (sem exemplo, a ideia só como dado), o esquema, 27 casos de régua furada e o formato exato.
  - Confere o que o parser de hoje faz com o roteiro e a chamada com a rede falsa.
  - Executa o trecho REAL da rota: casa, filme curto, inglês e ideia dão o roteiro falado e os dois rastros. Cliente, `narrator`, `voice_mode` ausente, `Characters`, português, 35 s e texto com marcadores não fazem chamada nenhuma. Régua furada e falha da chamada dão o narrado de hoje, com rastro.
- `tsc` limpo.
- `novos-vermelhos`: o resultado vai na mensagem de entrega.

## O ensaio (precisa de deploy, porque o escritor chama o gpt-4o no servidor)
- **Pacote:** `scripts/fixtures/escritor-de-dialogo-2511-casos.json`, 10 ideias minhas (5 fotorreais e 5 de desenho). Cada caso traz o corpo PRONTO do POST, e a régua escrita antes vem no próprio arquivo.
- **Como rodar,** na conta da casa e depois do deploy só-casa:
  - POST `/api/generate-script` com `{ topic, language: 'en', targetSeconds: 15, engine: 'kling4', voice_mode: 'characters' }`, um por ideia;
  - guardar `[{ id, resposta, elenco? }]`;
  - rodar `node scripts/ensaio-escritor-de-dialogo-2511.mjs respostas.json`.
- **Régua escrita antes** (o conferidor aplica):
  - saiu falado;
  - 4 seções na ordem;
  - toda seção só de 1 ou 2 falas `Nome: fala`;
  - no máximo 2 falantes, sem título;
  - até 8 palavras por seção e de 25 a 35 no filme;
  - toda fala termina em pontuação;
  - quem fala está na marca da seção;
  - nenhum dois-pontos a mais nem rubrica;
  - nada de narrador;
  - o parser de hoje lê 4 seções;
  - os falantes no elenco, quando o dry-run do filme der o elenco.
  - "A história é a do pedido" é olho humano.
- **Proposta para abrir a chave:** 9 de 9 falados dentro da régua (o f3 sai narrado pelo T2, de propósito), e nenhuma história trocada.
- **Custo:** 10 chamadas ao gpt-4o de texto, cerca de US$ 0,01 a 0,02 no total.

## Limites
- Só inglês: é a única língua provada.
- Só o filme curto de 20 s ou menos. O de 30 s ou mais segue narrado.
- O texto que já chega com marcadores segue como hoje.
- Os nomes que o escritor dá a quem não tem nome precisam ser lidos pelo leitor do elenco. É a linha "falantes no elenco" do ensaio.
