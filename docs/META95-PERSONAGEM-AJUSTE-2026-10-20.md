# KINEO-META95-PERSONAGEM-AJUSTE-2010

FATO CONFIRMADO / ESCOPO DO PEDIDO: branch `codex/meta95-personagem-ajuste-2010-codex`, base `origin/main` `9d4d0ffc1f71a34f9e4f56a05c55631908b925fc`, consulta Git em 20/10/2026 (America/Sao_Paulo). Só código e provas offline; push apenas da branch, sem PR/publicação/render ou acesso a serviços.

FATO CONFIRMADO / IMPLEMENTADO: o still com folha pede proporção explícita, composição contínua e fundo até a borda; proíbe painéis, colagem e faixa vazia. `lib/cinematic/folhaDePersonagem.ts:454`. O servidor só com opt-in `personagem` confere as dimensões devolvidas (tolerância relativa de 2% para arredondamento; ausentes/inválidas também recusadas) antes de aceitar o edit. `lib/estrelaServer.ts:49`, `lib/cinematic/personagemStill.ts:4`. URL nula conserva o FLUX já gerado na rota.

FATO CONFIRMADO / IMPLEMENTADO: a moderação continua recebendo a imagem e o contexto autoral (visual + fala). Em elenco inteiramente não humano e contexto benigno, idade adjacente a uma espécie explícita (como “child dinosaur” ou “dinossauro de nove anos”) vira fase de vida. Comparação técnica de tamanho com criança e “no clothes” na canônica viram descritores naturais. Nenhum limiar, categoria ou score é ignorado. `lib/cinematic/personagemStill.ts:27`, `lib/estrelaServer.ts:87`. Humano, humanoide, texto sensível ou idade solta permanece integral; o restante das ações/cena/fala é mantido.

QUESTÃO PENDENTE / DESCONHECIDO: o sinal exato que bloqueou o Dino real não foi consultado. A prova offline reproduz o falso positivo do reforço `minor_term` com score simulado; não afirma que uma resposta real `sexual/minors` deva ser aceita. Categoria/sinal proibido continua bloqueado. Não há alegação de validação em produção.

FATO CONFIRMADO / IMPLEMENTADO: Ravan/Ravana mantém a identidade de rei-demônio de dez cabeças do Ramayana; casting não pode substituir essa identidade. Figura mítica não catalogada conserva apenas o papel declarado pelo autor, sem aparência humana sorteada. `lib/cinematic/folhaDePersonagem.ts:131`. O crítico respeita anatomia mítica deliberada e recebe todas as folhas identificadas na mesma cena. `lib/cinematic/criticoStill.ts:117`.

FATO CONFIRMADO / IMPLEMENTADO: cenas usam a fala como fonte de identidade quando disponível, incluindo nome/papel e pronomes com antecedente único. A decisão é compartilhada entre política visual, ensaio, still e refação; “young man” genérico é alinhado à canônica “boy”. `lib/cinematic/folhaDePersonagem.ts:417`. Pronome ambíguo não atribui todos os personagens. Uma fala com nome direto e pronome concorrente continua conservadora: não resolve automaticamente a segunda identidade.

FATO CONFIRMADO / IMPLEMENTADO: a refação com folha usava janela FLUX de 9 segundos. Agora referência usa janela de polling de 45 segundos e teto de cena de 70 segundos, reservando tempo de moderação; não constitui teto absoluto de latência do submit. Retorno estruturado conserva `provider_timeout`, `moderation_blocked`, `format_invalid` ou outro motivo limitado, nos eventos do crítico e no relato do personagem. Sem referência continua a régua anterior. `lib/cinematic/criticoStill.ts:40`, `lib/cinematic/criticoStill.ts:375`.

FATO CONFIRMADO / IMPLEMENTADO: cena sem personagem citado não recebe ficha ou performance genérica de pessoa; usa o contexto narrado e descarta pessoa inventada pelo descritor, também no caminho seguro. `lib/cinematic/visualPromptPolicy.ts:258`, `app/api/generate-video-cinematic/route.ts:6663`, `app/api/generate-video-cinematic/route.ts:6978`, `lib/cinematic/folhaDePersonagem.ts:461`.

TESTADO LOCALMENTE: `scripts/test-meta95-personagem-ajuste-2010.mjs` executa os módulos TS e fatias reais da rota com casos manuais Dino/floresta/vagalumes, menino/Ravan, boy/his bike/he, girl/her/she, refação simulada de 25 segundos e fornecedores falsos. Prova recusa de dimensões, bloqueios de segurança, evento com motivo, ambiente sem pessoa, caminho desligado e desfaz exato/idempotente/CRLF. Quinze mutantes de comportamento foram executados e ficaram vermelhos, além do mutante estrutural do desfaz. O desfaz novo é a camada mais recente e os guardiões antigos conservam seus recortes em memória.

SUGESTÃO / PRÓXIMO PASSO: depois da revisão da branch pelo fundador, validar os mesmos casos reais sob uma autorização separada de render. O push desta branch não prova imagem entregue nem resultado em produção.

FATO CONFIRMADO / COORDENAÇÃO (20/10/2026): a branch remota com o nome original já existia no commit `1a8f1efa284f9df23dbebcb18be91c4f7cea4017`, com uma implementação do Claude. Após consulta, Joseph pediu entregar esta versão em outra branch com nome distinto. Esta entrega usa `codex/meta95-personagem-ajuste-2010-codex`, sem merge com a versão remota. Fonte: `git ls-remote` / `git show` do commit remoto e resposta direta do fundador neste pedido.

TESTADO LOCALMENTE — evidência consolidada em 10/21/2026 02:27:48 (UTC), fonte [registro por arquivo e hashes dos logs](qa/META95-PERSONAGEM-AJUSTE-2010-tests.json). Base Git: `9d4d0ffc1f71a34f9e4f56a05c55631908b925fc`; produto final: `303a92c44aff821dd3b2330d971676e949f40b7a`; reâncoras verificadas: `6b346ac8bf2a5924ad3012aa93bea457edca925d`.

| Execução offline | Scripts executados | Passaram | Vermelhos | TypeScript |
|---|---:|---:|---:|---:|
| origin/main fixada em 9d4d0ffc | 958 | 815 | 143 | 0 |
| codex/meta95-personagem-ajuste-2010-codex | 959 | 818 | 141 | 0 |

TESTADO LOCALMENTE: cada `scripts/test-*.mjs` foi executado individualmente, com rede bloqueada e ambiente sem credenciais. Comando de tipos, igual nos dois worktrees: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. Zero scripts recém-vermelhos e zero asserções novas falhando nos já vermelhos. O guardião novo fechou em **146 ok, 0 falhas, 15/15 mutantes de comportamento aplicados e vermelhos**, além do mutante estrutural do desfaz. O rollback exato, idempotente e CRLF cobre todos os 23 arquivos existentes tocados. Caminho desligado preservado nas provas de pedido/JSON/política visual e bloco real da rota.

TESTADO LOCALMENTE: os 143 logs vermelhos da base foram pareados e auditados integralmente; seis pares com impressão truncada receberam captura suplementar, com sete payloads completos equivalentes e integridade conferida. As diferenças de PID, pasta temporária e cleanup do Node estão discriminadas no JSON. Os dois verdes observados (`ads-cena` e `resgate-402`) não são atribuídos a este ajuste. Não há timeout de infraestrutura pendente; as tentativas anteriores permanecem no histórico local.

QUESTÃO PENDENTE / DESCONHECIDO: os vermelhos preservados incluem guardiões históricos e falhas de ambiente, como credencial ausente em `test-runway.mjs` e módulos ausentes. Esta execução não é uma contagem de falhas de produção. O sinal exato do bloqueio do Dino real e a qualidade de novas imagens continuam sem validação de produção, conforme o escopo offline autorizado.