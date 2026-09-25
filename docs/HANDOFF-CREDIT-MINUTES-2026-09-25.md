# Créditos em minutos — 25/09/2026

**DECISÃO APROVADA:** pedido direto do fundador nesta tarefa e decisão “Tela: MINUTOS” em `docs/DECISIONS.md`: exibir equivalências por motor; moeda, preços e créditos atuais permanecem intactos até a virada de 09/10.

**IMPLEMENTADO / FATO CONFIRMADO:** `components/CreditMinutesSummary.tsx` usa `minutesLine` de `lib/credits/creditMinutes.ts`, que continua calculando pela mesma régua `creditCostForDuration`. Apenas foi acrescentado um formatador opcional à linha para acomodar as 16 línguas; filtro e arredondamento não mudaram. O saldo não é somado entre motores.

**IMPLEMENTADO:** linha abaixo dos créditos nos planos de `/pricing`, no bloco de passe, na revisão de preço de `/ads` e na barra de `CreditsTopupModal` (estado `amount`, atualização imediata e anúncio acessível). O popup admite rolagem em telas baixas. A descrição do passe enviada à Stripe inclui `minutesLine(ADS_PASS_CREDITS)`; a descrição também entra na assinatura de idempotência para não reutilizar uma chave com parâmetros diferentes após o deploy. Nenhum outro campo do checkout foi modificado.

**TESTADO LOCALMENTE:** typecheck bruto; guardiões de minutos, barra de créditos, fundação Ads, três blocos de preços, sharing safety e cinco melhorias. `scripts/test-credit-minutes-ui.mjs` valida JSX real, movimento da barra, 16 idiomas, mensal/anual, descrição do passe e igualdade das fontes financeiras com `d3c21742`. Navegador: barra React a 150 e 2.000, português, layout a 375 px sem overflow horizontal. Nenhuma compra, geração ou acesso ao banco foi executado.

**QUESTÃO PENDENTE PREEXISTENTE:** `test-checkout-currency-truth.mjs` falha no contrato de disclosure de `app/cheapest-ai-shorts-maker/page.tsx`; ambos são idênticos à base `d3c21742`. Não foi alterado para esconder a falha.

**COMPARAÇÃO VISUAL:** `scripts/preview-credit-minutes.mjs` gera o HTML autocontido antes/depois; artefato da tarefa em `C:/Users/josep/Documents/Codex/2026-09-21/kineo-ux-ui/outputs/credit-minutes-20260925/antes-depois.html`. A comparação contém as três superfícies e a descrição do checkout; pagamentos e rede real estão desativados na prévia. Validação da publicação deve usar SHA/deployment e leitura da produção, sem criar uma compra de teste.
