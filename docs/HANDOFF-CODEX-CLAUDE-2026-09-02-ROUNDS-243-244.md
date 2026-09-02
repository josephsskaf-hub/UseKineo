# HANDOFF CODEX → CLAUDE — RODADAS 243–244

**Data:** 2026-09-02

**Workstream:** Growth / B2C

**Escopo:** diagnóstico de associação entre recuperar o mesmo primeiro arquivo em outro dia UTC e chegar à primeira Stripe Session recorrente; nenhuma alteração visual, de oferta, preço, crédito, Checkout, banco, e-mail ou render.

## Contrato implementado

**FATO CONFIRMADO:** scripts/first-file-later-day-retrieval-report.mjs conta somente pessoas externas cujo primeiro vídeo concluído é único, persistido, está dentro da janela e já possui sete dias completos de observação. Assinantes preexistentes são excluídos por todo o histórico financeiro.

**FATO CONFIRMADO:** o primeiro sinal de arquivo exige valores literais method=blob, surface=done_screen|history|my_videos, video_id igual ao primeiro vídeo e bytes numérico inteiro positivo. “Recuperação posterior” exige um segundo blob exato do mesmo video_id, em history|my_videos, em outra data UTC e estritamente antes da primeira Stripe Session recorrente.

**FATO CONFIRMADO:** a primeira Stripe Session continua sendo o anchor mesmo quando não paga. Uma Session posterior paga nunca limpa a primeira. Pessoas, Sessions, pagamentos e receita são unidades separadas; moedas nunca são somadas.

**FATO CONFIRMADO:** relógios nulos são ligados também pelo stripe_session_id; pagamentos inválidos preservam o Checkout, contam zero receita e bloqueiam inferência; conflitos, empates, cronologia arquivo/Checkout e perfis com relógio nulo são explícitos e fail-closed.

## Evidência de produção

**EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-02 19:39 UTC, contas internas excluídas:**

| Métrica | Pessoas / Sessions |
|---|---:|
| Pessoas maduras com primeiro vídeo elegível | 294 pessoas |
| Pessoas com primeiro blob exato | 110 pessoas |
| Cronologia analisável: blob antes da primeira Session | 108 pessoas |
| Recuperaram exatamente o mesmo vídeo em outro dia antes do Checkout | 2 pessoas |
| Não têm recuperação posterior confirmada | 106 pessoas |
| Checkout depois do blob, grupo com recuperação | 0 pessoas |
| Checkout depois do blob, grupo sem recuperação confirmada | 20 pessoas |
| Checkout antes do primeiro blob | 2 pessoas |
| Checkout no mesmo instante do primeiro blob | 0 pessoas |
| Sessions recorrentes exatas posteriores adicionais | 3 Sessions |

**EVIDÊNCIA DE PRODUÇÃO:** os campos críticos de qualidade estavam zerados: perfis com created_at nulo, vídeos concluídos com relógio nulo, vídeos elegíveis sem dono e eventos relevantes com relógio nulo.

**EVIDÊNCIA DE PRODUÇÃO:** entre os anchors de primeira Session analisáveis, uma pessoa pagou exatamente USD 490 minor (US$ 4,90). Existe outro comprador de USD 2.900 minor cuja compra ocorreu em uma Session recorrente posterior; esse pagamento permanece verdade financeira, mas não é atribuído ao desfecho da primeira Session.

## Retificação das rodadas 241–242

**CONTRADIÇÃO CORRIGIDA:** o handoff anterior registrou dois pagamentos como se ambos fossem o pagamento da primeira Stripe Session recorrente. A reconciliação atual prova que somente um foi pago na primeira Session; o outro foi pago em uma Session posterior. A sequência de cancelamento, retomada e pagamento da Session paga continua verdadeira, mas ela não era a primeira Session recorrente daquela pessoa.

**DECISÃO:** nenhuma Session posterior pode ser usada para maquiar uma primeira tentativa não paga. O total financeiro dos dois compradores continua US$ 33,90; a métrica de primeira Session passa a ser 1 pessoa, 1 Session e US$ 4,90.

## Gate e decisão comercial

**EVIDÊNCIA DE PRODUÇÃO:** o grupo de recuperação tem somente 2 pessoas, abaixo do piso pré-declarado de 5, e nenhuma chegou ao Checkout antes do corte. Isso não prova efeito positivo nem negativo.

**DECISÃO:** estado reconciled_small_sample. O relatório nunca autoriza mudança de produto. Não criar marcador, modal ou oferta de “seu vídeo continua disponível” a partir desta amostra; preservar as superfícies B2C já em coleta e alternar o próximo sprint para outra etapa do funil.

## Gates técnicos

- **TESTADO LOCALMENTE:** test-first-file-later-day-retrieval.mjs — 74/74.
- **TESTADO LOCALMENTE:** regressões canônicas — 173/173.
- **TESTADO LOCALMENTE:** total — 247/247; git diff --check limpo.
- **TESTADO LOCALMENTE:** typecheck pelo compilador local encontrou somente os mesmos 3 erros preexistentes em mrr.ts, me/subscription/route.ts e TrialDowngradeModal.tsx; nenhum arquivo desta rodada.
- **AUDITORIA ADVERSARIAL:** GO, P0=0, P1=0, P2=0, após quatro passes e correção de todos os casos encontrados.

## Arquivos

- scripts/first-file-later-day-retrieval-report.mjs
- scripts/measure-first-file-later-day-retrieval.mjs
- scripts/test-first-file-later-day-retrieval.mjs
- docs/HANDOFF-CODEX-CLAUDE-2026-09-02-ROUNDS-243-244.md

## Próximo sprint

**SUGESTÃO:** não gastar uma intervenção na recuperação posterior do arquivo enquanto o grupo tem n=2. Alternar para B2B e preservar o roteador de intenção já implementado até o fundador aprovar visualmente o preview obrigatório.
