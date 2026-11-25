# Escritor de diálogo · modo "personagens falam" · 25/11 (autora)

- **Pedido:** CEO, 25/11 à noite. Decisão em `docs/estrategia/DECISAO-PERSONAGEM-FALANDO-2511.md`.
- **Branch:** `codex/escritor-de-dialogo-2511`, sobre a `eb07dbd73`. O servidor do filme (o adaptador do Gemini e o compose) é do autor 3bbf48a0. Não toquei em `generate-video-cinematic/route.ts`, `lib/compose.ts` nem `geminiNaEsteira*`.

## O que faz
- **Quando roda:** o cliente usa "Let AI structure" (`script_mode 'ai'`) num filme curto (20 s ou menos), em inglês, com **`voice_mode: 'characters'`**. Nesse caso o `/api/generate-script` devolve o roteiro já com as falas.
- **Onde:** um bloco novo no começo do POST, depois da moderação do tema e antes do retorno dos marcadores.
- **Quem escreve:** `lib/cinematic/escritorDeDialogo2511.ts`, numa chamada só ao `gpt-4o` (o modelo do escritor de hoje). A saída é json_schema estrito, e o **código** confere a régua e monta o texto.
- **Fora da régua, falhou ou demorou:** segue o escritor de hoje, e o filme sai narrado. O rastro `dialogue_script_written` grava só números e o motivo.
- **`voice_mode` ausente ou `'narrator'`:** nenhuma linha nova roda. O guardião prova que a rota só GANHA linhas: o diff contra a base não tem nenhuma linha removida.
- **Chave:** `QUEM_FALA_NO_ROTEIRO = 'internal'`, só a lista exata da casa. O cliente tem chave própria, `CLIENTE_FALA_NO_ROTEIRO` (volta 5, nasce `'off'`), e sempre a régua positiva.

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

## Volta 5 (25/11): a régua POSITIVA, a do cliente
Pedido da CEO depois da revisora 52b12696. A v4 é feita de listas de proibição: 18 de 26 famosos e 10 de 14 crianças da revisora ganhavam fala. Ela fica **só para a casa**.

O cliente passa a ter **chave própria**, `CLIENTE_FALA_NO_ROTEIRO`, que nasce `'off'`. Com ela ligada, o cliente usa **sempre** a régua positiva: o padrão é o narrado de hoje, e só fala quem prova que pode.

### As chaves
- **`QUEM_FALA_NO_ROTEIRO`** (casa): `'off' | 'internal'`. O `'public'` saiu, então essa chave não abre mais ao cliente. A casa continua com a v4, sem mudança.
- **`CLIENTE_FALA_NO_ROTEIRO`** (cliente): `'off' | 'public'`, nasce `'off'`.
- **`reguaDoDialogo2511(email, dialogue_rule)`** decide qual régua vale:
  - a casa EXATA usa a v4;
  - a casa com `dialogue_rule: 'client'` no corpo usa a régua do cliente (é o ensaio dela);
  - o cliente só tem diálogo com a chave dele em `'public'`, e sempre na régua positiva.

### Quem pode falar
- **O papel vem da ideia.** O modelo devolve cada falante como `{ role, name }`.
  - `role` tem de ser 1 a 3 palavras que ESTÃO na ideia (aceita o plural).
  - O papel não pode estar escrito como nome próprio, com maiúscula fora do começo da frase: "Lady Gaga" e "Tesla CEO" não viram papel.
  - Se o papel não está na ideia: narrado, motivo `papel`.
- **O nome também vem da ideia.** `name` só vale se está escrito na ideia, sem título. Se a ideia não tem o nome: narrado, motivo `nome_inventado`.
  - O modelo não escolhe nome de gente: "Keanu", "Zuck", "Bey", "Sherlock", "Elsa" e "Barack" caem aqui.
- **Humano só fala com sinal de adulto DELE.** O sinal é lido no trecho da ideia que é dele: o papel e até 3 palavras antes, parando em pontuação, conector ou determinante. O sinal é um destes:
  - palavra de adulto da lista fechada da casa (`adultoProvado2511`), também no singular ("fishermen" vira "fisherman");
  - um ofício da lista curta `ADULTO_DE_OFICIO` (driver, baker, operator, mom, dad, cop, old, elderly…);
  - idade de 18 anos ou mais escrita ("a 40-year-old mechanic").
  - "Little", "tiny", "young" ou "small" no trecho de gente = menor.
  - Sem sinal de adulto: narrado, motivo `sem_adulto`.
- **Não humano fala sem idade.** Vale para bicho, criatura, máquina, planta, comida, objeto e natureza (lista fechada `NAO_HUMANO`), desde que o trecho dele não diga filhote ("puppy", "kitten", "cub", "baby"…) nem idade de menor.
- **Na ideia, antes da chamada:**
  - fora do inglês = narrado (`lingua`). Conta como fora do inglês: letra acentuada ou de outra escrita, ou poucas palavras de função do inglês;
  - número solto de 1 a 17, ou "thirteen" a "seventeen" = narrado (`menor`).
- **Continua valendo o que a casa tem:** famoso (`figura`) e menor, na ideia e no roteiro que saiu.
- **O rótulo no roteiro** é o nome da ideia, ou o papel com maiúscula ("Radio Operator", "Mom"). O rótulo que vem do papel não conta como título.

### Medido (offline, no escritor real com a rede falsa)
- **Os 10 casos do ensaio:**
  - com os DOIS personagens que cada ideia descreve falando, **7 de 10** falam: f1, f2 e d1 a d5;
  - se só o 1º personagem fala, **9 de 10**.
  - **Caem:**
    - f3, pelo "his daughter" na ideia;
    - f4, se o irmão Tomas fala (irmão não prova adulto);
    - f5, se o passageiro fala.
- **Os casos da revisora:** todos os famosos e todas as crianças vão ao narrado.
  - **Duas exceções no famoso:** em "Papa Francisco blesses a fisherman", "Leonardo Di Caprio orders coffee from a waiter" e "Spidey and a cop", o famoso não fala, porque não tem papel na ideia. Fala só o adulto comum (o pescador, o garçom, o policial). O rosto do famoso na tela é da régua da admissão do filme.
  - **O furo que resta:** um famoso com grafia torta mais um papel de adulto escrito na ideia ("the actor Leonardo Di Caprio"). O nome sai da ideia e só passa pela régua de figura da casa, como a CEO desenhou.
- **Falam:** os adultos de verdade (pescadores, enfermeira e médico, astronautas, marinheiro e capitã com nome, mecânico de 40 anos, mãe e pai) e os bichos e objetos.

### O ensaio real (precisa de deploy)
- O mesmo pacote de 10, com `dialogue_rule: 'client'` no corpo do POST, na conta da casa.
- A régua escrita antes vale igual.
- **A linha `falantes_no_elenco` pesa mais aqui.** O leitor do 3bbf48a0 e o elenco do filme precisam ler o rótulo de papel ("Radio Operator", "Mom") como personagem.
- A coluna "sem título" do conferidor marca "Captain" e "Doctor" como título, mesmo quando o rótulo vem do papel: na régua do cliente, ela é só informativa.

### Volta 5, parte 2: o ensaio da casa deu 0 de 10 (349efcff5, 25/11 19:43)
Os motivos foram curto ×7, falante_fora_da_marca ×2, nome ×1 e menor ×1 (o f3, de propósito). As mudanças abaixo valem para a casa e para o cliente.

- **"curto"**
  - **O que muda no pedido:** ele pede **7 a 8 palavras por seção** (28 a 32 no filme), acima do piso de 25 com folga. Antes pedia "até 8, de preferência 4 a 7", o que leva para baixo do piso.
  - **O esquema:** cada seção traz `words`, a contagem que o próprio modelo faz.
  - **A 2ª chamada:** se o tamanho sair da régua (`curto`, `longo`, `secao_longa`), sai **UMA 2ª chamada no mesmo prazo**. Ela leva a resposta e os números de cada seção ("HOOK 2, MICRO REWARD 1 2… Every shot needs 7 to 8 words").
  - **O tempo:** a 2ª só usa o que sobrou dos 12 s, e só com 3 s ou mais de sobra, então o T3 não muda. A 1ª chamada mediu 1,2 a 2,3 s.
  - **Outro motivo não ganha a 2ª.**
- **"falante_fora_da_marca"** (d1 e d3): o **código** monta a marca. Quem fala e não está na `[Pexels: …]` entra na frente dela, com a marca cortada em 80 caracteres. O relato conta `marcas_montadas`.
- **"nome"** (d4, os pinguins e a morsa):
  - o texto recusado não ficou gravado, então a causa exata não tem prova;
  - a hipótese é um rótulo em minúscula ou com artigo ("the walrus"), que a régua recusa;
  - agora o código tira o artigo e põe a maiúscula ("the walrus" vira "Walrus"). Narrador e título continuam fora depois disso.
- **O rastro da casa:** `dialogue_script_written` grava `rejected_text`, o texto de cada tentativa recusada (até 3.000 caracteres). **Só na conta da casa.** O cliente nunca. Grava também `tentativas` e `motivo_1a`.
- **O piso do falado:**
  - **O número que eu defendo para o portão do 3bbf48a0:** **24 palavras de fala** (6 por plano). A 2,2 palavras por segundo, isso enche ~2,7 s de cada plano de 3,75 s e deixa a reação e a pausa.
  - Hoje o escritor fica em 25, porque o portão do servidor pede 29 contando os nomes.
  - Se o portão baixar, é uma linha (`PALAVRAS_DO_FILME.min`).

## Volta 6 (25/11): as decisões da CEO sobre a régua do cliente
A revisora 392f0a52 liberou a v5 para a casa (`CLIENTE_FALA_NO_ROTEIRO` segue `'off'`). Esta volta mexe só na régua do cliente.

1. **Humano fala só pelo PAPEL.** O nome próprio sai do rótulo e da marca `[Pexels]`, onde vira o papel da ideia ("Rosa in the scene" vira "pirate captain in the scene"). O nome como rótulo fica só para o não humano: o cão Rex, o dragão Ember.
   - Fecha "Bernie Sanders", "Martin Luther King", "Di Caprio" e "Hwang" sem lista.
   - **Nome completo colado ao papel** = narrado, motivo `nome_de_gente`. Vale tanto "the senator Bernie Sanders" e "a pastor named Martin Luther King" quanto "Leonardo Di Caprio, the actor".
   - Nome de uma palavra ("Elias", "Rosa") não conta; esse personagem fala pelo papel.
2. **Papel de PESSOA ÚNICA = narrado,** motivo `pessoa_unica`. Entram:
   - president, pope, king, queen, prime minister, chancellor, emperor e semelhantes;
   - ceo, boss, founder, owner ou chairman com "of" depois;
   - ceo ou founder com qualquer qualificador;
   - o chefe com qualificador dentro do papel ("tesla boss");
   - todo papel com "of the …" ("the captain of the guard").
   - **Limite declarado desta abertura:** o epíteto solto passa ("iron lady", "the boss"). A lista não fecha epíteto.
3. **F4, título e hífen.**
   - No começo da frase, maiúscula seguida de outra maiúscula é nome ("Senator Sanders", "Nurse Rosa"), e o papel não vale.
   - O hífen não separa a palavra: "Iron-Man" não é "man".
4. **Filhote de bicho ou criatura FALA** (decisão da CEO: o dragãozinho e a raposinha são o produto do desenho).
   - "young", "small" e "little" diante de não humano não barram, e puppy, kitten, cub e os outros filhotes são não humanos.
   - Continua barrando: gente pequena ou jovem, palavra de criança e qualquer idade de 1 a 17 escrita, também no bicho ("a seven-year-old fox").
   - "baby" e "kid" na ideia ainda vão ao narrado, pela régua de menor da casa ("baby dragon" é limite).
5. **Fechar menos.**
   - **Papel com qualquer palavra não humana é não humano** ("robot assistant"), a não ser que a última palavra seja papel de gente: "radio operator" e "bus driver" são gente. Palavra de criança vem antes: "school bus kid" é menor.
   - Novos na lista de ofícios de adulto: passenger, customer, client, attendant, mate, steward, receptionist, coach, investor, butler e semelhantes.
   - "rock" saiu da lista de não humanos, porque "the rock" é epíteto.
6. **O conferidor do ensaio mede o rótulo de quem fala.**
   - `falantes_no_elenco` (com o elenco do dry-run) bate o rótulo com o personagem como frase inteira ("Radio Operator" em "the radio operator").
   - `rotulo_na_ideia` (sem o elenco) mede se o rótulo está escrito na ideia.
   - O ensaio imprime a linha `FALANTES_NO_ELENCO`.
   - **Sem o rótulo no elenco, o servidor do filme manda narrado.**

### Medido (offline, no escritor real; o modelo "obediente" da revisora)
- **F1** (famoso com papel de adulto): **0 de 15**.
- **Ataques:**
  - famosos da 52b12696: 0 de 16;
  - nomes escolhidos pelo modelo: 0 de 8;
  - crianças: 0 de 14;
  - título no começo da frase: 0 de 3.
- **F2:** 2 de 7 falam, "iron lady" e "the boss", o limite declarado.
- **F3:** os filhotes e bichos pequenos falam, por decisão: young fox, young wolf, small bear, puppy e little robot.
- **As 20 ideias comuns da revisora:** **20 de 20 com os dois personagens** (meta ≥ 17).
- **Os 10 casos do ensaio:** 8 de 10 com os dois; o passageiro do f5 agora fala. Com só o 1º, 9 de 10.

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
