# Depois do checkout · retomar plano salvo

**FATO CONFIRMADO · 23/11/2026.** A rota `app/checkout/cancelled/page.tsx` já lê plano e período e tem as ações de retomar e comparar um menor. Com `CHECKOUT_SAVED_PLAN_RELEASE`, a ordem do retorno destaca primeiro o plano salvo e oferece a alternativa abaixo. A ação segue o checkout existente.

**TESTADO LOCALMENTE.** Sete mutantes exercitam liberação, elegibilidade, ordem, período, carregamento e destinos no componente. O navegador confirmou as duas opções no retorno Studio anual em 390 e 1920 px, nos dois temas. O teste de rota usa serviços simulados e parou antes de abrir uma compra.

**SUGESTÃO.** Na casa, verificar Creator e Studio nos dois períodos, erro de resposta e a mensagem de plano indisponível. Antes de ampliar, medir a volta explícita, novo checkout e pagamento por pessoa. A amostra de 24 checkouts sem pagamento inclui quem nunca voltou a esta página.
