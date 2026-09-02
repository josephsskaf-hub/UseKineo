# HANDOFF CODEX → CLAUDE — RODADAS 241–242

**Data:** 2026-09-02

**Workstream:** Growth / B2C

**Escopo:** reconciliação somente leitura dos dois pagamentos maduros e exatos do relatório `first_video_file_value_to_subscription_v1`; nenhuma alteração visual, de oferta, preço, crédito, Checkout, banco, e-mail ou render.

## Resultado

**EVIDÊNCIA DE PRODUÇÃO — Supabase somente leitura, 2026-09-02, contas internas excluídas:** os dois pagamentos que o handoff das rodadas 237–238 classificou como `ready_for_reconciliation` foram ligados, sem expor identidade, à cronologia anterior ao pagamento.

| Jornada exata e madura | Pessoa A | Pessoa B |
|---|---:|---:|
| Primeiro vídeo persistido | 16/08 | 22/08 |
| Primeiro blob exato do mesmo vídeo | `history`, 15h22 após o vídeo | `done_screen`, 33s após o vídeo |
| Blob → primeira Stripe Session recorrente | 2h27 | 42h25 |
| Primeiro CTA exato imediatamente antes da Session | `pricing_page` | `pricing_page` |
| Session → pagamento exato | 35s | 4m53 |
| Plano / receita | Starter mensal · US$ 4,90 | Studio mensal · US$ 29,00 |

**EVIDÊNCIA DE PRODUÇÃO:** nenhum dos dois pagamentos aconteceu até 30 minutos depois do primeiro blob confirmado. Um aconteceu no mesmo dia, 2h27 depois; o outro aconteceu no dia seguinte, 42h25 depois. Total preservado do relatório canônico: **2 pessoas, 2 Stripe Sessions, USD 3.390 minor = US$ 33,90**.

**EVIDÊNCIA DE PRODUÇÃO:** na Pessoa B, a sequência foi `pricing_view → checkout_started → checkout_cancelled → checkout_resume_banner_viewed → checkout_resume_banner_clicked → payment_success` na mesma Stripe Session. A retomada ocorreu 2m37 após o cancelamento; o webhook de pagamento chegou 17s após o clique no banner.

**FATO CONFIRMADO:** o `session_id` do navegador não é uma visita. Nos registros reais ele atravessa intervalos longos; por isso nenhuma conclusão usa “mesma sessão” como sinônimo de “mesma visita”. Os intervalos acima vêm apenas dos relógios persistidos.

## Leitura comercial

**HIPÓTESE:** a assinatura B2C amadurece depois que a pessoa percebe posse e utilidade do arquivo, e fecha quando ela retorna à página de preço ou retoma uma Stripe Session já criada. O card imediatamente pós-vídeo pode iniciar intenção, mas estes dois casos não sustentam que ele seja o fechamento.

**SUGESTÃO:** preservar as variantes pós-vídeo das rodadas 233–234 até o gate mínimo. Não reeditá-las com `n=2`. A próxima intervenção B2C deve trabalhar retorno de alta intenção sem desconto novo: tornar o estado “seu vídeo continua disponível” inequívoco antes de levar ao preço, ou melhorar a descoberta da retomada do Checkout já existente. Como `/history`, `GenerateClient`, `Sidebar` e `MobileNav` pertencem à pista compartilhada/Claude, qualquer runtime nessa direção precisa ser coordenado antes.

## Achado de qualidade que impediu código ruim

**TESTADO LOCALMENTE E REPROVADO:** um primeiro rascunho de relatório novo foi descartado antes de commit. A auditoria adversarial encontrou seis P1: ele iterava apenas Sessions pagas, permitia que uma Session posterior limpasse a primeira, contava a mesma pessoa mais de uma vez nos padrões, não respeitava a maturidade individual de sete dias, não excluía assinatura preexistente por todo o histórico, afrouxava o contrato literal do blob e abria gate sem todas as barreiras de qualidade.

**DECISÃO:** nenhum desses três arquivos experimentais foi mantido. O repositório recebe somente este handoff de diagnóstico. A fonte de verdade continua sendo `scripts/first-video-file-value-to-subscription-report.mjs` e seu ledger canônico.

## Gate

**QUESTÃO PENDENTE / DESCONHECIDO:** dois compradores exatos permitem reconciliar casos, não selecionar causalidade. Uma intervenção de runtime precisa de pelo menos três compradores exatos na mesma definição madura ou de um experimento próprio com exposição humana, primeira Session recorrente e pagamento da mesma Stripe Session.

**DECISÃO:** estado `reconciled_small_sample`; nenhuma mudança de produto autorizada por este relatório.

## Estado Git

Worktree isolada: `.claude/worktrees/codex-b2c-value-maturation-v1`.

Branch: `codex/b2c-value-maturation-v1`.

Base: `b42b9e634e6c1eb843a7c4fe7e11c67bd4128d99` (`origin/main` no início da rodada).

Somente este handoff será commitado. Nenhum script, componente ou rota entra no commit.
