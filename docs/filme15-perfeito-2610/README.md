# KINEO-FILME15-PERFEITO-2610

**FATO CONFIRMADO — PREPARADO, 26/10/2026:** base após fetch: origin/main em `2072944f17eab603bc40fcaa0d576d3b0ce9c78f`, contendo FILME15-FIEL e FILME15-ROSTO. Branch: `codex/filme15-perfeito-2610`. A implementação anterior de rosto desta branch foi retirada. Folha de personagem, personagemAjuste, textLanguage e o bloco META95-PERSONAGEM permanecem iguais à base; protagonista, elenco e voz ficam com o Claude.

**FATO CONFIRMADO — ESCOPO:** somente Seedance 1.5 / 15 s. O portão vale para novos nascimentos com versão no response assinado; filmes históricos não recebem reembolso retroativo por falta do contexto novo. 35/60/90 conservam o comportamento anterior. Sem deploy, render pago, leitura de .env ou escrita em banco. As medições de produção fizeram SELECT e GET de quadros históricos já existentes.

## Implementação

- **FATO CONFIRMADO — IMPLEMENTADO:** após os filtros da escrita, uma tentativa de acrescentar fala curta da IA conserva a linha aceita; verbatim não é reescrito (app/api/generate-video-cinematic/route.ts:6591). O compositor aplica piso de 14 s só com flag derivada do nascimento verificado, sem cortar a narração (lib/compose.ts:2116).
- **FATO CONFIRMADO — IMPLEMENTADO:** a versão do portão entra no hash/HMAC do nascimento (app/api/generate-video-cinematic/route.ts:7449). Claim encerrado é recusado antes de avaliar ou reparar. O portão precede liquidação, histórico, e-mail e URL (app/api/compose/status/[renderId]/route.ts:609); usa duração original do fornecedor, sem aprovar 13,96 por arredondamento.
- **FATO CONFIRMADO — IMPLEMENTADO:** estado assinado e compare-and-swap antes de julgar/gastar; uma tentativa total por filme. Reparo troca somente a cena localizada ou os elementos de legenda. Submissão ambígua não é repetida (lib/free15Gate.ts:111). FPS assinado e tempo preciso localizam a cena visível nos cortes com sobreposição; o padrão histórico da régua permanece igual.
- **FATO CONFIRMADO — IMPLEMENTADO:** falha persistente/evidência insuficiente entrega apenas depois da confirmação do estorno no ledger e de free15_gate_failed. O histórico usa zero crédito; a fonte reparada assinada impede que Refazer ressuscite o clipe rejeitado (lib/free15GateServer.ts:106). Eventos do portão são exclusivos do servidor (app/api/events/route.ts:24).
- **FATO CONFIRMADO — IMPLEMENTADO:** o fallback proporcional canônico passa pelo mesmo agrupador antes da primeira montagem; a refação altera apenas legendas (app/api/compose/route.ts:3562). A partição conserva repetições reais e protege número+unidade EN/PT/ES (lib/filmes/faceless15.ts:209). Tempos proporcionais são aproximados e nunca são apresentados como evidência de áudio.
- **FATO CONFIRMADO — IMPLEMENTADO:** antes do still/clipe, pedidos positivos de texto em papel, celular, caixa de pizza, latas/garrafas e neon viram variantes sem escrita. Atores, ação e negativos ficam preservados; voz não passa pelo helper (lib/cinematic/objetosSemTexto15.ts:14, app/api/generate-video-cinematic/route.ts:6797). O retry também saneia prompts legados. O juiz recebe a marca d’água esperada apenas quando o source assinado contém o texto exato no track 9; letras em objetos continuam defeito (lib/free15GateServer.ts:71).

## Medição e limites

**EVIDÊNCIA DE PRODUÇÃO — 26/10/2026:** janela fixa [2026-10-19T15:12Z, 2026-10-26T15:12Z), pela data de entrega, contas internas excluídas: 170 filmes de 170 pessoas. [caption-audit.json](caption-audit.json), [caption-visual-audit.json](caption-visual-audit.json), [duration-audit.json](duration-audit.json) e [text-audit.json](text-audit.json) conservam critérios, casos anônimos e limitações. Eventos nunca foram somados como novas pessoas.

**EVIDÊNCIA DE PRODUÇÃO — DURAÇÃO:** 162 sources disponíveis; 20 planejados abaixo de 14 s. Todos os 20 tinham áudio curto e 18/21 s de material aceito. Nove estavam gravados como 14 na coluna arredondada do histórico. Isso aponta montagem seguindo áudio curto, não falta de clipes; sem reouvir o MP3 não se prova qual etapa anterior encurtou a fala.

**EVIDÊNCIA DE PRODUÇÃO — LEGENDA:** 26 tetos, 25 sources; dois traces confirmam fallback cego de quatro palavras. A inspeção de 28 quadros de 14 casos restantes encontrou oclusão de rosto em cinco e divisão semântica em dois (nome composto e número+unidade). [caption-unit-rules.md](caption-unit-rules.md) explica a correção e a ausência de identificação confiável de nomes próprios. A remoção indevida de repetições foi reproduzida em testes; atribuí-la aos casos reais sem ASR bruto permanece desconhecido.

**EVIDÊNCIA DE PRODUÇÃO — TEXTO:** 21 tetos históricos, 127 quadros inspecionados: quatro com escrita clara em objetos; dois com legenda composta confundida com texto gerado; 13 sem texto extra confirmado além de overlays esperados; dois incidentais ambíguos. Todos os sources contêm a marca d’água e nenhum dos 21 registra evidence_status completo. Não se chama essa amostra de prova de filme perfeito nem se descarta defeito fora dos quadros.

**CONTRADIÇÃO DE COORTE:** 208 filmes/25 curtos/25 legendas do pedido não reproduzem nesta janela e nesses critérios. O número 21 de texto reproduz, mas a identidade dos casos originais não foi confirmada. Não se substitui uma coorte pela outra.

**QUESTÃO PENDENTE — QUALIDADE VISUAL:** a refação canônica conserva geometria/fonte e não garante remover oclusão de rosto; nomes compostos também não ganharam uma heurística insegura. Persistindo teto, o portão falha e devolve crédito. Nenhuma posição/layout novo foi declarado validado e nenhum filme pago foi renderizado para comprovar qualidade.

## Verificação e próximo passo

**TESTADO LOCALMENTE:** guardiões com código real, fornecedores falsos e mutantes: duração exata, texto/legenda, HMAC, versões históricas, concorrência, replay, estorno confirmado, fonte reparada e localização da cena em 24/30 fps. Desfaz exato da tarefa encadeado em desfaz-filme15-fiel-2610; manifests anteriores ficam imutáveis. Resultados finais da bateria e TypeScript em [qa-summary.json](qa-summary.json).

**SUGESTÃO — PRÓXIMO PASSO RECOMENDADO:** conferir a régua completa no resumo de QA antes de merge. Qualidade real de novos filmes e redução dos defeitos continuam sem validação em produção; esta branch prepara e testa o mecanismo, sem publicar.
