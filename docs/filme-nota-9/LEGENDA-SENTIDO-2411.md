# Legenda por unidade de sentido · 24/11/2026

**TESTADO LOCALMENTE** sobre o Cooper da casa, filme de 15 s, registro `2b17bd7f`. A candidata reagrupa cartões no caminho F1 e no reparo canônico da montagem vertical de 15 s. O servidor habilita EN, PT e ES para contas da lista interna exata. O teste da rota rejeita um e-mail externo com prefixo de teste, mesmo que o perfil editável alegue ser da casa. Na finalização por serviço, uma conta com perfil interno precisa também ser confirmada pelo Auth. Indisponibilidade da confirmação mantém o resultado anterior.

| Pista | A · quebras/cartões | B · quebras/cartões | Quebras por 100, A → B |
|---|---:|---:|---:|
| Inglês do Cooper | 3/10 | 0/12 | 30,0 → 0 |
| Tradução PT do Cooper | 1/10 | 0/11 | 10,0 → 0 |
| Tradução ES do Cooper | 2/10 | 0/11 | 20,0 → 0 |

**EVIDÊNCIA DE PRODUÇÃO** de 24/11. Li os 60 quadros do MP4 em intervalos de 250 ms. Os dez cartões exibidos em inglês separam `black / tie`, `he / demanded` e `past / Seattle`. A sequência mostra `black` perto de 2 s e `he` perto de 5,25 s. A fonte é `C:/kineo/docs/canais/2026-11-24/1-cooper.mp4`. O MP4 comprova os cartões visíveis, não fornece os timestamps brutos do Whisper. Os pares examinados estão explicitamente anotados em `scripts/test-support/cooper-legenda-2411.json`.

**TESTADO LOCALMENTE** em cada idioma. O ramo A inglês usa os limites de cartão lidos no MP4. A candidata usa os tempos de palavra aproximados por amostragem desse vídeo. Rodando o algoritmo antigo nesses tempos aproximados, reproduzem-se duas das três quebras. Em PT e ES usei traduções do mesmo roteiro sobre esse vídeo, com um relógio proporcional idêntico para A e B. Os três ensaios preservam cada palavra e o início/fim de cada palavra de entrada com a mesma normalização do produto. A comparação usa como denominador todos os cartões de cada versão. O numerador conta fronteiras dentro dos pares anotados, incluindo nomes e expressões que já estavam corretos.

**TESTADO LOCALMENTE** nos sete controles de `7af247b9d:docs/filme-nota-9/entradas-replay-2311.json`. As falas originais de `scenes[].voice` receberam relógio proporcional para comparar A e B. Todos os cartões, palavras, destaques e tempos de saída ficaram idênticos. Cinco controles são em inglês, um em alemão e um em urdu. Os dois últimos verificam a exclusão de idiomas. A fixture real do Whisper do Carrington, de 19/10, também produziu saída idêntica com o relógio original.

| ID parcial | Palavras | Cartões A e B | SHA-256 da saída (prefixo) |
|---|---:|---:|---|
| 3edd291a | 32 | 9 | bf81f1950feb |
| 5301ea22 | 39 | 9 | a2cf81c75913 |
| 6cce958f | 30 | 8 | 6aeeb9e26eb7 |
| 87a09b8c | 24 | 7 | 097aee0041e9 |
| aad3977f | 36 | 10 | 8639bed2abd2 |
| c9272ee9 | 37 | 10 | 70d36b3faf68 |
| e3864c10 | 24 | 6 | 0a91b7532fe2 |

**FATO CONFIRMADO** no código da candidata. `lib/filmes/legendaSentido.ts` reconhece padrões locais de cor, nomes próprios e pronomes com verbos. `lib/filmes/faceless15.ts` ensaia uma nova partição apenas nas frases com quebra protegida e conserva a partição anterior se faltarem limites válidos. A conta externa recebe a partição antiga. A prova de comportamento roda com `node scripts/test-legenda-sentido-2411.mjs --replay` quando o objeto do replay está disponível. Os oito mutantes aplicados reproduzem falhas específicas de fronteira ou de exposição. A execução padrão é independente de histórico, rede e contas.

**QUESTÃO PENDENTE**. Um filme da casa não estima a taxa de defeito dos clientes. O candidato acrescentou dois cartões em inglês e um em cada tradução. Falta julgamento humano de ritmo e um recibo de ASR nativo em português e espanhol para confirmar alinhamento nesses idiomas. A régua não cobre todas as fronteiras possíveis da língua.

**SUGESTÃO**. O revisor pode alternar as três pistas no [comparador offline](file:///C:/Users/josep/.codex/visualizations/2026/11/09/01a1c25e-66b5-7bd2-ae9a-49bd77d9ee2d/legenda-2411/COOPER-AB.html), conferir o trecho de 1,5–3 s e ouvir com a velocidade normal. A mídia original segue com as legendas já gravadas. Os cartões A/B aparecem logo abaixo e compartilham um relógio.
