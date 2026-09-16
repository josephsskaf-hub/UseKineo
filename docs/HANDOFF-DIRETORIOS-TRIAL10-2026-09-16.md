# Diretórios — correção TRIAL10 de 16/09/2026

**Estado:** LOCAL / candidato para integração. **Dono:** Diretórios. **Base:** `1fadb815e4e599fe0f94f776cce63ccbf5869723`. **Autorização:** ordem do fundador “Ajuste em todos os lugares”, transmitida pelo Board em 16/09/2026; reserva de arquivos comunicada a Board, Citações e Parcerias.

**SUGESTÃO — finalidade comercial:** remover promessa incompatível para quem chega por diretórios. Correção de comunicação não é aquisição nem receita; nenhum pagamento novo foi consultado ou comprovado nesta entrega.

## Entrega controlada

**EVIDÊNCIA DE PRODUÇÃO — registro operacional local, 16/09/2026 14:43 UTC:** catálogo atual com 78 pacotes (mesmos IDs e destinos), línguas já existentes EN/ES/PT, oferta derivada de `entryPolicy`/`reverseTrial`/`checkoutPricing`, água no trial, dois Kineo 1 de 60s, disponibilidade/acesso/saldo separados. Não havia pacote HI a substituir. URLs de atribuição mantidas; nenhum envio adicional. Arquivos históricos de texto/recibo ficaram byte a byte iguais (31 arquivos; hashes no catálogo).

**EVIDÊNCIA DE PRODUÇÃO — registro operacional local:** `docs/TAAFT-LISTING-2026-09-03.md` era um pacote ativo com oito motores e restrições antigas por plano. A versão atual remove esses trechos, a promessa irrestrita de todos os motores e o custo fixo desatualizado do roteiro de captura. Não altera home, curadoria, créditos, preços, render ou dados de clientes. O conteúdo anterior segue recuperável no Git.

**FATO CONFIRMADO — IMPLEMENTADO:** o teste existente exigia literalmente “eight video engines”; foi corrigido para confrontar o pacote atual com concessão/preço canônicos e rejeitar promessas incompatíveis. Fonte: `scripts/test-taaft-listing-package.mjs`.

## Matriz de superfícies

| Superfície / URL | Fonte / data | Problema ou estado | Correção e mecanismo | Estado / dono |
|---|---|---|---|---|
| Pacotes privados IDs1–78 | Catálogo e verificação locais,16/09 14:43Z | Texto preparado anterior anunciava trial30 | Catálogo atualTRIAL10; índice/checkpoint apontam para ele; snapshots enviados preservados | LOCAL / Diretórios |
| docs/TAAFT-LISTING-2026-09-03.md | Código base1fadb815,16/09 | Trial10 com oito motores e separação antiga de planos | Texto atual corrigido e teste do pacote atualizado | LOCAL / Diretórios; SHA da entrega informado ao Board |
| https://aisotools.com/tool/kineo | Navegador nativo,16/09 entre14:40–14:48Z | EVIDÊNCIA DE PRODUÇÃO: trial30 em curta/preço/About | Delta10 preparado; sem Edit/Save observado; correção depende do editor da conversa existente. Novos emails vedados nesta ordem | EXTERNO-PENDENTE / editor AISO |
| https://topai.tools/t/usekineo-com | Navegador nativo,16/09 entre14:46–14:48Z | EVIDÊNCIA DE PRODUÇÃO: Studio37.90 e MiniMax em Works with; trial sem número | DeltaStudio39.90/300cr, trial10 e manutenção preparado. /update-ai exige pagamento14.99 (moeda não explicitada) antes do formulário; sem gasto autorizado | EXTERNO-PENDENTE / TopAI |
| https://theresanaiforthat.com/ai/kineo/ | Relato do fundador viaBoard,16/09 | DescriçãoTRIAL10 já atualizada; leitura própria bloqueada | Não repetir submissão. Campos Models/USP sem nova confirmação independente | PUBLICADO-RELATADO; validaçãoDESCONHECIDA / fundador |
| ReleaseTAAFTv3.3.3 | Relato do fundador viaBoard,16/09 | Oferta anterior em release imutável | Preservar e separar da oferta atual; sem nova release paga | HISTÓRICO IMUTÁVEL / TAAFT |
| https://saasscout.org/product/kineo | Checkpoint histórico,11–14/09 | QUESTÃO PENDENTE: conteúdo atual desconhecido | Bloqueio não repetível; não contornado | EXTERNO-PENDENTE / plataforma |
| https://qevra.app/s/kineo | Checkpoint,12/09 | QUESTÃO PENDENTE: conteúdo atual desconhecido | Bloqueio não repetível; não contornado | EXTERNO-PENDENTE / plataforma |
| https://curlship.com/l/3052 | Checkpoint,11–14/09 | QUESTÃO PENDENTE: conteúdo atual desconhecido | Edição requer prova do dono por email/token; bloqueio não repetível | EXTERNO-PENDENTE / plataforma |
| https://www.saashub.com/kineo-ai-alternatives | Bloqueio comunicado peloBoard,12/09 | QUESTÃO PENDENTE: sem nova leitura | Não contornar; preservar pedido anterior sem reenviar | EXTERNO-PENDENTE / plataforma |

**QUESTÃO PENDENTE / DESCONHECIDO:** demais destinos do catálogo mantêm seu último estado operacional. Um pacote LOCAL não prova publicação nem atualização externa. Não foram realizadas novas submissões para “completar” a matriz.

## Caminhos privados para continuidade

**EVIDÊNCIA DE PRODUÇÃO — artefatos locais em 16/09/2026:** diretório `C:/Users/josep/.codex/visualizations/2026/09/10/01a088dd-6c44-7e21-aabe-482fc772f970/docs`.

- `PACOTES-ATUAIS-TRIAL-10-2026-09-16.json`: única copy operacional de diretórios; templates e pacotes completos, fontes e hashes dos snapshots.
- `DELTA-LISTAGENS-TRIAL10-2026-09-16.json`: evidências e substituições exatas AISO/TopAI, canal e impedimento.
- `VERIFICACAO-TRIAL10-2026-09-16.json`: validação dos textos, limites, preservação do histórico e agenda pausada.
- `checkpoint.json` e `submissoes-2026-09-10.json`: apontam ao catálogo atual; contagens de execução e recibos preservados.

**QUESTÃO PENDENTE / DESCONHECIDO:** caminhos privados não são publicação no Git nem mensagem recebida por Claude. Este handoff canônico permite localizar o material sem publicar identidades de contatos. Parcerias mantém a posse de partnerskit; não foi criado outro master compartilhado.

## Verificação e limites

**TESTADO LOCALMENTE — 16/09/2026:** testeTAAFT58/58; typecheck completo `tsc --noEmit --incremental false` passou; `git diff --check` passou. Verificação privada:78IDs únicos, tetos gerais60/160/600 e exceções conhecidas deAISO/Qevra/AIForest/TipSeason/AI Tools Directory;31snapshots preservados.

**QUESTÃO PENDENTE / DESCONHECIDO:** esta entrega não alterou interface de produto; não há nova UI/deploy ou filme para validar. GET/leitura nativa confirmou somente as discrepâncias externas descritas. Arquivo de pacote/teste pode ser integrado pela fila autorizada; isso não modifica as fichas em plataformas externas.

**EVIDÊNCIA DE PRODUÇÃO — registro local:** automação permanece PAUSED; nenhum gasto, envio, publicação externa, consulta financeira ou mudança de concessão. **SUGESTÃO:** próxima ação útil é a correção editorial única noAISO quando permitida; não multiplicar submissões sem medir pessoas e pagamento.
