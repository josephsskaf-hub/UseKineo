# N1 — trava de narração — 16/11/2026
**Estado:** TESTADO LOCALMENTE para a correção de falsa espiral. BLOQUEADO para replay integral dos três pagantes e qualquer liberação da regra textual. NÃO PUBLICADO.

**FATO CONFIRMADO:** branch `codex/trava-narracao-1611`, base `a7de932da`. A alteração de produto tem apenas a leitura do histórico movida para antes do próprio evento de recusa em `app/api/generate-video-cinematic/route.ts:3692`; a avaliação usa esse snapshot em `:3733`. Não modifica cobertura, duração, modo de roteiro, autoria, preço, débito ou aceitação do pedido.

## Evidência e método
**EVIDÊNCIA DE PRODUÇÃO — consultada 16/11/2026, entre 22:56:41 e 23:07:13 BRT:** conector Supabase, projeto de produção indicado em `docs/PROJECT_STATE.md`, exclusivamente SELECT. Janela fechada à esquerda e aberta à direita: 18/10/2026 01:56 UTC até 17/11/2026 01:56 UTC, equivalentes a 17/10 22:56 até 16/11 22:56 BRT. O diário abaixo respeita BRT; as duas datas das pontas são parciais. Perfis, pagamentos, pedidos e textos pessoais estão apenas no arquivo LOCAL não rastreado `C:\\kineo\\docs\\revisoes\\N1-PRIVADO-1611-corpus.json`. A fixture versionada usa pessoas P01…P24 e eventos E01…E30, sem identidade nem pedidos pessoais. A chave fica só no arquivo privado.

**EVIDÊNCIA DE PRODUÇÃO:** 30 bloqueios brutos de 24 pessoas; excluído 1 bloqueio de 1 conta interna conforme `lib/internalAccounts.ts:19` e `:37`: 29 bloqueios de 23 pessoas externas. Cinco bloqueios de três pessoas tinham pagamento real anterior ao bloqueio: `payment_success`, `stripe_livemode=true`, `stripe_payment_status=paid`. Isso comprova pagamento anterior, não uma consulta independente ao estado atual da assinatura na Stripe. Todos os 29 metadados externos dizem `charged=false` e `refunded=false`; os claims relacionados aos cinco pedidos pagos estão `released`, sem requisições fal e com motivo `narration_too_short_no_charge`.

**EVIDÊNCIA DE PRODUÇÃO:** os 29 bloqueios externos tinham evento de tentativa anterior no intervalo de cinco segundos, todos com `engine=seedance`. É o motor técnico do pedido; o nome comercial pode ter mudado.

| Dia BRT | Bloqueios | Pessoas distintas no dia | Bloqueios de pagante | Pagantes distintos no dia |
|---|---:|---:|---:|---:|
| 2026-10-17 (parcial) | 0 | 0 | 0 | 0 |
| 2026-10-18 | 0 | 0 | 0 | 0 |
| 2026-10-19 | 0 | 0 | 0 | 0 |
| 2026-10-20 | 5 | 4 | 0 | 0 |
| 2026-10-21 | 2 | 2 | 0 | 0 |
| 2026-10-22 | 0 | 0 | 0 | 0 |
| 2026-10-23 | 1 | 1 | 0 | 0 |
| 2026-10-24 | 1 | 1 | 0 | 0 |
| 2026-10-25 | 1 | 1 | 0 | 0 |
| 2026-10-26 | 2 | 2 | 0 | 0 |
| 2026-10-27 | 0 | 0 | 0 | 0 |
| 2026-10-28 | 3 | 3 | 0 | 0 |
| 2026-10-29 | 0 | 0 | 0 | 0 |
| 2026-10-30 | 0 | 0 | 0 | 0 |
| 2026-10-31 | 0 | 0 | 0 | 0 |
| 2026-11-01 | 0 | 0 | 0 | 0 |
| 2026-11-02 | 3 | 1 | 0 | 0 |
| 2026-11-03 | 1 | 1 | 1 | 1 |
| 2026-11-04 | 2 | 1 | 2 | 1 |
| 2026-11-05 | 0 | 0 | 0 | 0 |
| 2026-11-06 | 0 | 0 | 0 | 0 |
| 2026-11-07 | 1 | 1 | 1 | 1 |
| 2026-11-08 | 0 | 0 | 0 | 0 |
| 2026-11-09 | 1 | 1 | 0 | 0 |
| 2026-11-10 | 0 | 0 | 0 | 0 |
| 2026-11-11 | 0 | 0 | 0 | 0 |
| 2026-11-12 | 4 | 4 | 0 | 0 |
| 2026-11-13 | 0 | 0 | 0 | 0 |
| 2026-11-14 | 0 | 0 | 0 | 0 |
| 2026-11-15 | 1 | 1 | 0 | 0 |
| 2026-11-16 (parcial) | 1 | 1 | 1 | 1 |


**EVIDÊNCIA DE PRODUÇÃO:** pessoas não podem ser somadas entre dias. O total distinto da janela é 23 pessoas externas, com três pagantes distintos, independentemente da quantidade de eventos e de dias.

## Os três pagantes, sem identidade no Git
**EVIDÊNCIA DE PRODUÇÃO — P24/E30, 16/11 22:02:12 BRT:** evento de tentativa tem 90 caracteres e `topic_complete=false`; o aviso anterior registra `shape=command_to_chatbot`, `script_mode=verbatim`, 49 palavras e duração pedida de 60 segundos. A trava registrou estimativa de 20 segundos de fala, alvo 60, 91 palavras faltantes. O expansor, em outra régua/configuração não preservada integralmente, registrou 16 segundos e crescimento necessário 3,61, retornando `needs_authoring`. Não é evidência de uma narração pronta de 60 segundos; a evidência disponível indica um comando de criação tratado como fala. O texto completo desse pedido NÃO foi recuperado. Eventos com ideia/roteiro, `projects`, `gpt_handoffs` e `demo_render_jobs` não forneceram esse original. Um roteiro posterior sobre a mesma personagem não substitui o pedido bloqueado.

**FATO CONFIRMADO:** a escolha explícita verbatim faz a ideia não passar pelo escritor em `lib/meta95/ideiaNoEscritor.ts:55`; a rota mantém verbatim fora dos briefs reconhecidos em `app/api/generate-video-cinematic/route.ts:2029`. O aviso de instrução não troca o modo automaticamente, por decisão documentada no próprio código `lib/growth/instructionPasteNotice.ts:29`. O bloqueio evita cobrar uma narração insuficiente; a recuperação do comando para autoria continua uma proposta, pois faltam texto e configuração integrais.

**EVIDÊNCIA DE PRODUÇÃO — P15/E19, 03/11 04:27:22 BRT:** ideia original de preparação de comunicação recuperada completa; a narração gerada enviada à rota não foi recuperada completa. Há prefixo marcado, contagem do escritor de 73 palavras com `fits=true`; depois a trava registra fala de 30 segundos para alvo 35 e nove palavras faltantes. **CONTRADIÇÃO DE SINAIS:** o escritor anuncia `fits=true` e o guard reprova. **FATO CONFIRMADO:** o `fits` do escritor compara contagem com seu piso em `app/api/generate-script/route.ts:843`, enquanto a trava usa narração extraída e régua da voz (`lib/speechRate.ts:54`). Esses campos não demonstram a mesma medição. **QUESTÃO PENDENTE:** sem roteiro, voz e velocidade exatos não se identifica qual extração ou régua foi decisiva nesse pedido.

**EVIDÊNCIA DE PRODUÇÃO — P16/E20, 04/11 05:17:42 BRT:** único dos cinco bloqueios pagos com input integral confirmado por `topic_complete=true`; era um tópico curto de história factual, não narração pronta. Fala estimada de cinco segundos para 60; 128 palavras faltantes. Recebeu autoria automática, texto entregue, aprovação e nova tentativa. A recusa do texto curto como narração é coerente com a regra, mas o fluxo de autoria deveria ter sido a entrada útil.

**EVIDÊNCIA DE PRODUÇÃO — P16/E21 e E22, 04/11 20:28:45 e 07/11 15:13:24 BRT:** ideias originais completas recuperadas; roteiros enviados só em prefixos. Escritor produziu 79 e 77 palavras, ambos `fits=false`; guard mediu fala de 32 e 31 segundos para alvo 60, faltando 61 e 63 palavras. É evidência de textos da própria geração insuficientes para o alvo, não prova de roteiro próprio legítimo recusado indevidamente. O pedido original de E21 pedia 30–40 segundos, mas a duração aplicada foi 60. **TESTADO LOCALMENTE:** com a ideia original real, o parser atual `lib/pastedDirectives.ts:124` reproduz E21 (40 → botão 60) e E22 (um trecho de 30 minutos de um relógio da cena → 1800 segundos, `unsupported`); este último é um falso pedido de duração. Runner e resultado ficam apenas em `C:\kineo\docs\revisoes\N1-PRIVADO-1611-replay.cjs` e `N1-PRIVADO-1611-replay-result.json`. Não houve patch de regex.

**CONTRADIÇÃO — evidência consultada 16/11/2026 versus quadro local 16/11 20:55:** os três concluíram filmes depois do primeiro bloqueio da janela. P15: quatro, último 09/11 04:59:19 BRT. P16: quatro, último 07/11 15:44:12 BRT. P24: dois, último 16/11 22:33:35 BRT. Isso não nega a fricção, mas impede afirmar que cada um parou por causa desse bloqueio ou que saiu sem filme. O quadro é histórico; esta consulta o atualiza.

## Quantos eram roteiros legítimos
**EVIDÊNCIA DE PRODUÇÃO:** dos 29 inputs externos, 11 estão completos no evento da tentativa; os outros 18 estão truncados. Nos 11 completos, nove são temas/ideias curtas, um é um link e um é recusa textual do modelo. Nos truncados, dez têm prefixo de roteiro estruturado e oito têm outro prefixo. Prefixo de roteiro não comprova integridade, legitimidade ou suficiência de toda a narração.

**QUESTÃO PENDENTE / DESCONHECIDO:** quantidade de roteiros completos legítimos barrados indevidamente, no corpus inteiro. Não foram certificados roteiros completos legítimos suficientes para a duração pedida no subconjunto integral; isso NÃO significa que o total do corpus seja zero. Nos cinco eventos de pagante, apenas um input está completo; nos demais quatro faltam trechos. Não há três inputs completos dos três pagantes para cumprir o gate de replay. Não foram completados textos por inferência nem criados roteiros sintéticos.

**TESTADO LOCALMENTE — parser, não rota completa:** o runner privado executou `parseUserScript` nos 11 inputs reais completos: nenhum tem marcadores nem segmentos. Não força sua duração a coincidir com produção: a configuração integral de voz/velocidade não existe no evento, e alguns números diferem da régua base. Isso é parte do bloqueio, não um teste aprovado de render.

## Defeito corrigido e prova
**FATO CONFIRMADO — base `a7de932da`:** a rota inseria `narration_guard_blocked` em `:3696` e só depois chamava `historicoDeParedes` em `:3729`. O leitor inclui esse nome e deduplica irmãos em `lib/refusalSpiral.ts:227` e `:253`; a avaliação soma mais uma ocorrência atual em `:190`. Assim, a recusa conta duas vezes. Dos históricos reais exportados, 27 dos 30 brutos e 26 dos 29 externos não tinham outra recusa nos 15 minutos anteriores. Os três pagantes recebem posição 2 indevida nos respectivos primeiros bloqueios; `refusal_spiral` não prova repetição nesses casos.

**IMPLEMENTADO:** leitura do histórico anterior ao insert, preservando o mesmo helper best-effort e o release do claim como primeira operação. A recusa atual continua gravada uma vez; sua mensagem base permanece igual, e o sufixo só entra quando existe recusa anterior. O bloco de decisão da narração permanece intacto.

**TESTADO LOCALMENTE:** `ensaio-offline.cjs` transpila e executa o bloco terminal REAL da rota com a lib REAL de histórico. Banco é mock de transporte em memória, alimentado por 30 históricos reais anonimizados; tempos são deslocados preservando intervalos e baldes de cinco segundos. Não é execução da rota inteira, acesso real ao banco, áudio ou render.
- Base: RED, 30 posições incorretas; modo `--expect-original-bug` confirma o defeito.
- Candidato: GREEN, 30 posições corretas, 422 preservado, nenhum débito introduzido, mensagem base mais apenas o sufixo cabível.
- Histórico indisponível: mantém 422 e mensagem base, sem inventar recusa anterior.
- Mutante que volta a ler após o insert: RED, 30 erros, rejeitado.
- `npx tsc --noEmit --incremental false`: PASS, exit 0.
- `git diff --check`: PASS.
- Guardião legado `scripts/test-espiral-recusa-2026-09-01.mjs`: BLOQUEADO antes da rota por SyntaxError no `export type Parede`, pois a remoção de tipos por regex não cobre CRLF. Esse script e `lib/refusalSpiral.ts` são idênticos à base; não foi reancorado nem tratado como PASS.

## Proposta não aplicada à regra de narração
**FATO CONFIRMADO:** `SUPPORTED_DURATIONS=[35,60,90]` em `lib/expandPolicy.ts:52`; o Seedance oferece 15 em `lib/durationByEngine.ts:43` e `:93`. A recuperação, a mensagem e a sugestão final usam a lista global, não a lista do motor (`app/api/generate-video-cinematic/route.ts:3660`, `:3729`, `:3766`). Portanto a opção de 15 segundos some desses caminhos.

**TESTADO LOCALMENTE — sensibilidade sobre números arredondados, NÃO replay de roteiro:** usar as durações do motor na seleção devolve 15 segundos onde hoje devolve null em nove bloqueios externos, incluindo quatro bloqueios pagos de três pessoas (E19, E21, E22 e E30). Resultado estável para o intervalo de arredondamento de meio segundo. Não são nove resgates comprovados: oito reportam 26–32 segundos de fala e precisam também passar o limite de fala longa do filme curto; esse filtro não está neste ensaio. Também faltam autoria, intenção, montagem e débito. Todos os nove têm input incompleto.

**FATO CONFIRMADO / correção de hipótese da investigação:** o custo é selado antes do portão (`route.ts:2395`), mas existe estorno da diferença de duração em `:3816`. Logo, cobrar o alvo maior definitivamente não é consequência comprovada de uma futura troca de lista. **HIPÓTESE / risco concreto:** uma descida adicional precisa validar claim, débito, ajuste, eventual falha do ajuste e compatibilidade do texto com o filme curto. O estorno é best-effort com evento de falha em `:3834`; modificar só uma lista sem ensaio dessas partes seria insuficiente.

**SUGESTÃO — até três ações, por prioridade:**
1. Divisão 2 revisar o patch local de falsa espiral e seu RED→GREEN. Benefício verificável: primeira recusa volta a posição 1; não libera texto nem gasta crédito.
2. Recuperar, com o cliente ou fonte preservada já autorizada, os quatro inputs faltantes e configuração exata do guard; testar os três pedidos completos antes de mudar autoria/duração. Faltando fonte histórica, manter BLOQUEADO e planejar observabilidade mínima, sem copiar textos pessoais para Git.
3. Ensaiar uma recuperação explícita antes do custo: comando → autoria com consentimento/preview; narração pronta → duração do motor que comporte o texto, sem custo maior que o mostrado. Só liberar após corpus real completo, testes de preço/claim/estorno e revisão da Divisão 2. Nenhum gasto novo ou estimativa de ganho foi atribuído.

**QUESTÃO PENDENTE:** comparação com concorrentes não foi feita nesta correção de ordem interna; não há recomendação de oferta ou alegação concorrencial.

## Entrega e medidor
**TESTADO LOCALMENTE:** arquivos de prova no diretório `docs/revisoes/n1-trava-narracao-1611/`; dados pessoais só no arquivo privado fora da worktree. Nenhum push, deploy, mensagem, render, migration ou escrita de banco. O diagnóstico dos três é parcial quanto a input/configuração; a correção de falsa espiral está pronta para revisão. Não marca N1 integralmente resolvida.

**EVIDÊNCIA DE SESSÃO:** medidor global Codex 0% às 22:56:41 BRT, 0% às 23:07:13 BRT e 1% às 23:18:10 BRT, janela semanal com reset `1795483630`. Arredondamento global compartilhado com missões paralelas; não permite atribuir esse ponto percentual apenas à N1. Nenhum Full reset utilizado. SHA na mensagem de entrega ao líder.
