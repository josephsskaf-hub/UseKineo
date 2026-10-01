# Sprint MRR — balanço de sábado (em preparação)

**QUESTÃO PENDENTE / DESCONHECIDO.** Este arquivo conserva o nome pedido pelo fundador. Sábado é 03/10/2026; entrega prevista para 20h BRT, conforme docs/DECISIONS.md. Ainda não é balanço final nem declaração de publicação.

**EVIDÊNCIA DE PRODUÇÃO — 01/10/2026.** Corte [01/09 06:00 UTC, 01/10 06:00 UTC): 681 cadastros externos; pelo menos 467 aberturas de Studio; digitação desconhecida; 444 geradores; 372 primeiros vídeos; 100 segundos; 70 pessoas com checkout e seis com payment_success. Seis primeiras assinaturas positivas na mesma coorte. SQL e limites em [stage-mrr/MEASUREMENT.md](stage-mrr/MEASUREMENT.md).

**IMPLEMENTADO.** Botão junto da ideia + showcase de provas reais com preço em filmes. Branch inicial stage/sprint-mrr, branch de entrega codex/sprint-mrr-20261001. Candidato enfileirado: b0fef8ceabaf6b21ff53a137cd2268f5f293c797, base main 87825d3225af384ed4c887a7faf7bacbe4546c47, inclui fila Showcase 3aba3b0b7bbcbee9df0e66ad08b121a5a01acef9. Tsc limpo; 740 guardiões (538 verdes, mesmas 202 falhas da base, nenhum vermelho novo); 13 mutantes próprios e 20 capturas. Launcher C:/kineo/PUBLICAR-MRR-2026-10-01.bat pronto; não executado pelo agente. Enfileiramento não comprova deploy. [Comparação visual](stage-mrr/REVIEW.html), [entrega, validação e reversão](stage-mrr/DELIVERY.md).

| Entrega | Antes | Depois | Decisão por enquanto |
|---|---|---|---|
| Ideia → gerar | Sem evento histórico de digitação/exposição equivalente | Desconhecido; exige versão mrr_studio_20261001_v1 e 48 h maduras | Validar ingestão antes de atribuir conversão |
| /showcase → cadastro/compra | Rota ausente na base; zero comparável não existe | Desconhecido; versão mrr_showcase_20261001_v1 | Contar pessoas resolvidas, anônimos à parte |

**QUESTÃO PENDENTE / DESCONHECIDO.** Não há medição de MRR incremental, nem evidência de meta 10–15 pagantes/dia atingida. O balanço usará a mesma régua e idade de coorte; amostra insuficiente será declarada, sem transformar teste em venda.

## Para o fundador decidir

1. Publicar pelo launcher revisado após seus gates, quando entregue.
2. No balanço, manter ou desligar as alavancas conforme resultado comprovado. Nenhuma proposta de preço é aplicada automaticamente.

**IMPLEMENTADO / continuidade local.** Próximo item na branch codex/sprint-mrr-measurement-20261001: preparar e validar a consulta pós-versão sem alterar o candidato enfileirado. Resultados posteriores seguem desconhecidos até publicação e observação. Gates completos em stage-mrr/gates-2026-10-01.json e suites agregadas ao lado.
