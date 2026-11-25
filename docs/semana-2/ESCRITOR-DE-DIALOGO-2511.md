# Escritor de diálogo · modo "personagens falam" · 25/11 (autora)

- **Pedido:** CEO, 25/11 à noite. Decisão em `docs/estrategia/DECISAO-PERSONAGEM-FALANDO-2511.md`.
- **Branch:** `codex/escritor-de-dialogo-2511`, sobre a `eb07dbd73`. O servidor do filme (o adaptador do Gemini e o compose) é do autor 3bbf48a0. Não toquei em `generate-video-cinematic/route.ts`, `lib/compose.ts` nem `geminiNaEsteira*`.

## O que faz
- **Quando roda:** o cliente usa "Let AI structure" (`script_mode 'ai'`) num filme curto (20 s ou menos), em inglês, com **`voice_mode: 'characters'`**. Nesse caso o `/api/generate-script` devolve o roteiro já com as falas.
- **Onde:** um bloco novo no começo do POST, depois da moderação do tema e antes do retorno dos marcadores.
- **Quem escreve:** `lib/cinematic/escritorDeDialogo2511.ts`, numa chamada só ao `gpt-4o` (o modelo do escritor de hoje). A saída é json_schema estrito, e o **código** confere a régua e monta o texto.
- **Fora da régua, falhou ou demorou:** segue o escritor de hoje, e o filme sai narrado. O rastro `dialogue_script_written` grava só números e o motivo.
- **`voice_mode` ausente ou `'narrator'`:** nenhuma linha nova roda. O guardião prova que a rota só GANHA linhas: o diff contra a base não tem nenhuma linha removida.
- **Chave:** `ESCRITOR_DE_DIALOGO_2511 = 'internal'`, só a lista exata da casa. Para abrir, `'public'`.

## O formato que sai
- **Cada seção:**
  - o cabeçalho de hoje do filme curto, `HOOK / MICRO REWARD 1 / MICRO REWARD 2 / PAYOFF: [Pexels: cue]`;
  - depois, em linhas próprias, 1 ou 2 falas `Nome: fala`.
- **As seções** são separadas por uma linha em branco.
- **O nome** fica como o personagem é chamado, sem caixa alta, por exemplo `Mara`.
- **Atenção, 3bbf48a0:**
  - o `parseUserScript` de hoje junta as linhas de cada seção com espaço; o `voiceover` da seção chega como `Mara: … Elias: …` numa linha só, e o nome continua lá;
  - se o nome estivesse em CAIXA ALTA, o parser de hoje o tiraria da fala;
  - o formato mora numa função só (`secaoDoDialogo2511`): se o seu parser pedir outro, é uma linha.

## A régua (no código; o que não passa = narrado de hoje)
- exatamente 4 seções, na ordem;
- de 1 a 2 falantes no filme inteiro, com nome próprio, e nunca narrador, voz de fora ou nome repetido;
- cada seção com 1 ou 2 falas, cada fala de 1 a 10 palavras, dita por quem foi declarado e sem o nome dentro;
- `cue` de 2 palavras ou mais, sem colchete nem dois-pontos;
- o filme com 16 a 60 palavras de fala; o pedido mira de 28 a 40.

## Por onde o `voice_mode` precisa viajar (pedidos)
- **Ao GPT (tela):**
  1. a escolha em /create/film chega ao `GenerateClient`;
  2. o `GenerateClient` manda `voice_mode` no POST `/api/generate-script`, nas DUAS chamadas: a do modo 'ai' (l. 8891) e a do `handleWriteFullScript` (l. 8300, a do 422 automático). Sem isso a 2ª reescreve como narração;
  3. o `GenerateClient` manda `voice_mode` no POST `/api/generate-video-cinematic`.
- **Ao 3bbf48a0:**
  - repassar `body.voice_mode` no corpo do `escritorMarcadoDoGenerateScript` (route.ts l. 2081). É o caminho da ideia solta escrita pelo servidor;
  - o portão de tamanho do filme curto precisa aceitar a fala: são de 28 a 40 palavras pedidas, contadas sem os nomes.

## Executado (sem rede)
- **Guardião `scripts/test-escritor-de-dialogo-2511.mjs`:** PASS, com 30 de 30 mutantes mortos.
  - Testa a chave e o `voice_mode`, o pedido (sem exemplo, a ideia só como dado), o esquema, 27 casos de régua furada e o formato exato.
  - Confere o que o parser de hoje faz com o roteiro e a chamada com a rede falsa.
  - Executa o trecho REAL da rota: casa, filme curto, inglês e ideia dão o roteiro falado e os dois rastros. Cliente, `narrator`, `voice_mode` ausente, `Characters`, português, 35 s e texto com marcadores não fazem chamada nenhuma. Régua furada e falha da chamada dão o narrado de hoje, com rastro.
- `tsc` limpo.
- `novos-vermelhos`: o resultado vai na mensagem de entrega.

## O ensaio (precisa de deploy, porque o escritor chama o gpt-4o no servidor)
- **Pacote:** `scripts/fixtures/escritor-de-dialogo-2511-ideias.json`, 10 ideias minhas (5 fotorreais e 5 de desenho).
- **Como rodar,** na conta da casa e depois do deploy só-casa:
  - POST `/api/generate-script` com `{ topic, language: 'en', targetSeconds: 15, engine: 'kling4', voice_mode: 'characters' }`, um por ideia;
  - guardar `[{ id, resposta, elenco? }]`;
  - rodar `node scripts/ensaio-escritor-de-dialogo-2511.mjs respostas.json`.
- **Régua escrita antes** (o conferidor aplica):
  - saiu falado;
  - 4 seções na ordem;
  - toda seção com 1 ou 2 falas válidas;
  - no máximo 2 falantes;
  - cada fala com até 10 palavras;
  - nada de narrador;
  - o parser de hoje lê 4 seções;
  - os falantes no elenco, quando o dry-run do filme der o elenco.
  - "A história é a do pedido" é olho humano.
- **Proposta para abrir a chave:** 9 de 10 falados dentro da régua, e nenhuma história trocada.
- **Custo:** 10 chamadas ao gpt-4o de texto, cerca de US$ 0,01 a 0,02 no total.

## Limites
- Só inglês: é a única língua provada.
- Só o filme curto de 20 s ou menos. O de 30 s ou mais segue narrado.
- O texto que já chega com marcadores segue como hoje.
- Os nomes que o escritor dá a quem não tem nome precisam ser lidos pelo leitor do elenco. É a linha "falantes no elenco" do ensaio.
