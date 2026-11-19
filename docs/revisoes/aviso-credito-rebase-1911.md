# Aviso de crédito · volta de 19/11/2026

**IMPLEMENTADO.** Rebase de `codex/aviso-credito-1811` sobre `114018ade`. O layout preserva `InstallAppBanner`, `themeColor` e os demais metadados do site instalável. A única resolução de conflito foi em `app/layout.tsx`.

**FATO CONFIRMADO.** Os três arquivos de oferta, sessão Stripe e webhook são idênticos aos do SHA revisado `61a579d7e`. Valor, moeda, saldo, elegibilidade e origem mantêm o contrato anterior.

**IMPLEMENTADO.** O cartão de filme pronto passa a ocupar a área protegida junto com player e Generate. O teste acusa a remoção desse seletor, a inserção de moeda literal no texto e a aceitação de resposta do servidor sem `show === true`.

**FATO CONFIRMADO.** O aviso de compra continua elegível só para quem já tem direito à recarga de assinante. O CTA reutiliza essa recarga. O guardião comprova que uma conta grátis com saldo zero fica fora.

**SUGESTÃO.** Manter a conta grátis no fluxo atual quando zerar. A recarga de assinante seria uma ação indisponível para ela.

**FATO CONFIRMADO.** Nas migrações versionadas, o índice `events_user_created_idx` cobre usuário e data. Há também um índice de expressão para `generation_id`, sem correspondente para `metadata->>'stripe_subscription_id'`. Fonte `supabase/migrations/20261017110000_events_indices.sql:16`. A consulta do aviso restringe por usuário, evento e assinatura antes do limite.

**QUESTÃO PENDENTE.** O catálogo de índices de produção não foi consultado. As migrações versionadas não provam índices criados manualmente. A prova visual anterior em 390 e 1920 px, nos dois temas e saldos, está no quadro. A convivência com o cartão de filme pronto foi exercitada no guardião de posicionamento.
