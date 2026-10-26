# MCP — revisão de cenas sem reiniciar geração

DECISÃO APROVADA (26/10/2026): corrigir a interpretação do MCP para revisão explícita após débito, preservando recuperação de falhas transitórias. Autorizações do fundador e do root na tarefa video-fiel; sem nova regra financeira, status de banco ou migration.

FATO CONFIRMADO: `studioCreateVideo` tratava qualquer HTTP 503 como recuperação de despacho. A resposta `scene_description_requires_review`, `review_required:true`, `retryable:false`, devolução ainda não confirmada era salva como `processing` com o corpo de replay; `studioVideoStatus` enviava novamente a geração e dizia que continuava renderizando. A reprodução offline encontrou1 POST inicial e 2 após consulta. O claim pendente da rota impedia novo débito/render; gasto extra não foi demonstrado.

IMPLEMENTADO em `lib/mcp/studioTools.ts`:

- Aceita como revisão somente erro HTTP com motivo exato `scene_description_requires_review`, `qualityCheckFailed:true`, `review_required:true`, `retryable:false` e `generationId` igual à tentativa. Payload transitório/desconhecido continua no caminho anterior.
- Guarda o desfecho saneado no `dispatch` existente, sem prompt/corpo de replay. Usa `failed` enquanto devolução está pendente, `refunded` após confirmação; ambos já existem. Quantidade efetivamente debitada permanece desconhecida (`null`), sem converter estimativa em cobrança confirmada.
- `create` e `status` respondem `review_required`, `refund_pending`, `refund_confirmed`, `claim_released`, `retryable:false`. Não afirmam que está renderizando ou que houve devolução sem evidência.
- Consultas repetidas e a mesma chave de idempotência não enviam outro POST. Se a recuperação legítima de um timeout receber a revisão, grava o desfecho e remove o replay para os próximos status. Mesmo um replay antigo junto à revisão não é usado.
- A consulta de status continua lendo o claim e confirma o estorno por `credit_debits.refunded_at`, escopado à pessoa e à referência determinística da geração. Ausência, erro ou lançamento de outra pessoa não comprovam devolução. Confirmação já registrada em `refunded` não desaparece numa falha posterior de leitura.
- Não executa RPC de crédito nem reconcilia dinheiro por um novo despacho. Se o estorno continuar pendente, orienta suporte; não promete prazo nem devolução automática comprovada.

TESTADO LOCALMENTE (26/10/2026), sem rede, credenciais, banco real, geração ou custo:

- `node docs/video-fiel-2610/pedido-mcp-test.mjs`: 16 grupos e 2 mutantes comportamentais. Executa o módulo real em VM, I/O e tabelas em memória. Cobre criação, status repetido, idempotência, refund confirmado/pendente, evidência de outra pessoa, erro de leitura, replay residual e contrato de recuperação transitória.
- Revisão: criação + múltiplos status + mesma chave = 1 POST. Timeout, 503 comum, motivo desconhecido, generationId divergente e retryable:true continuam recuperando pela mesma geração. Pending 409 continua repetindo a mesma geração e finaliza.
- `node docs/video-fiel-2610/pedido-test.mjs`: 19 grupos passaram.
- TypeScript `--noEmit --incremental false`: passou.

LIMITES: teste offline do módulo real, não canário autenticado. Não cria novo serviço de estorno; confirmação pendente continua dependendo da recuperação financeira/suporte existente, sem reenvio de geração por este job. Dados desconhecidos não viram zero. Nenhuma validação/publicação em produção foi realizada. Os guardiões históricos e a integração final pertencem ao root.
