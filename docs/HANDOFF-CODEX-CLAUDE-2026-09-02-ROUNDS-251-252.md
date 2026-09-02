# HANDOFF CODEX → CLAUDE — RODADAS 251–252

**Data:** 2026-09-02 18:14 BRT
**Base verificada:** `origin/main = 33d1dc70f831555548ac58906e2eeda7365256c8`
**Pista:** Growth B2C — primeiro vídeo → indicação → novo cadastro → assinatura

## Resultado executivo

**EVIDÊNCIA DE PRODUÇÃO:** uma consulta agregada `SELECT` no Supabase de produção em 02/09/2026, cobrindo de 30/08/2026 00:00 UTC até o momento da leitura e excluindo as contas internas canônicas de `lib/internalAccounts.ts`, encontrou:

| estágio exato de `native_file_share_referral_v2` | pessoas externas | eventos |
|---|---:|---:|
| card privado visto | 22 | 27 |
| compartilhar arquivo clicado | 2 | 2 |
| arquivo compartilhado | 1 | 1 |
| compartilhamento cancelado | 1 | 1 |
| cadastro referido posterior ligado ao criador | 0 | 0 |
| primeiro vídeo qualificado do referido | 0 | 0 |
| sinal atual de assinatura do referido | 0 | 0 |

Evento repetido não virou pessoa adicional. Nenhum identificador, e-mail, prompt, URL ou conteúdo de vídeo saiu da consulta.

## Contrato confirmado no produto

**FATO CONFIRMADO:** o denominador humano é emitido somente quando pelo menos metade do card privado está visível em `app/(dashboard)/generate/GenerateClient.tsx:2924-2935`. O clique e o término real ficam separados em `app/(dashboard)/generate/GenerateClient.tsx:9411-9437`; o convite copiado tem evento próprio em `app/(dashboard)/generate/GenerateClient.tsx:9474-9481`.

**FATO CONFIRMADO:** o convite preserva o vídeo como arquivo privado e carrega o código de indicação canônico produzido por `/api/referral`; `lib/referral.ts` captura `?ref=` por first touch e `components/ReferralAutoTrigger.tsx` conclui a atribuição depois do login. `/api/referral/qualify` só concede a recompensa quando existe usuário referido e pelo menos um vídeo.

**LIMITAÇÃO DE ATRIBUIÇÃO:** o cadastro guarda `referred_by`, mas o link raiz `/?ref=CODE` não identifica qual superfície do criador originou o convite. Uma relação `share concluído antes → cadastro com referred_by depois` seria **assistência temporal**, não prova causal de que o card privado trouxe o cadastro.

## Decisão de gate

**SUGESTÃO / NO-GO:** não construir agora outro relatório completo nem alterar copy, posição ou CTA do card privado. Com apenas uma conclusão e nenhum cadastro ligado, toda a cauda até pagamento seria estruturalmente zero. A superfície publicada deve continuar coletando sem interferência.

**GATE:** reabrir a decisão quando houver pelo menos 25 pessoas externas expostas e cinco criadores externos com compartilhamento ou cópia do convite concluídos. Mesmo depois do gate, cadastro, primeiro vídeo, Checkout Session, pagamento e receita continuam estágios separados; só pagamento recorrente reconciliado pela mesma Session é assinatura.

## Hipótese entregue ao dono correto

**QUESTÃO PENDENTE / PISTA CLAUDE:** `/account` já recebe `generationsUsed` calculado de forma owner-scoped em `app/(dashboard)/account/page.tsx`, mas `AccountClient` descarta o valor e não há denominador humano `account_*`. A hipótese futura é medir se pessoas nunca assinantes com exatamente um vídeo concluído realmente visitam Profile antes de qualquer UI de “recibo de valor”. `/account` pertence à pista do Claude pelo acordo `docs/ESCOPO-CLAUDE-VS-CODEX-2026-08-31.md`; o Codex não editou essa árvore.

## Preservação de experimentos

**FATO CONFIRMADO:** first-file value, later-day retrieval, post-expiry distinct Session, oferta pós-vídeo, rating, pricing journey proof, inline pricing e private share continuam abaixo dos respectivos gates ou em observação. Nenhuma dessas superfícies foi reeditada nesta rodada.

**NÃO TOCADO:** render, cena, voz, legenda, qualidade, crédito, preço, SKU, Checkout, banco, migration, e-mail, outreach, anúncio ou arquivos do Claude.

## Próxima rodada

Alternar para B2B e escolher uma hipótese nova fora do `b2b_volume_fit_review_v1`, que segue sem exposição externa exata. Prioridade: um artefato útil e compartilhável que produza demanda de empresa/agência e tenha cadeia owner-safe até primeira Stripe Session recorrente, sem nova landing genérica e sem comunicação externa automática.
