# [Citações] Menor grant suficiente para Kling e Veo

**EVIDÊNCIA OPERACIONAL — 11/09/2026, rodada iniciada às 11h29 BRT:** main `9bf0525e`; fechamento FAQ local `c8b5e3e2` preservado. Não há delta remoto novo. AGENTS e skill receita-comprovada permanecem com as mesmas versões; diário e divisão Growth conferidos. Board solicitou executar primeiro o erro que induz comprador a escolher plano superior ao necessário e confirmou ausência de escritor no catálogo.

**CLASSIFICAÇÃO: PARCIAL / CORREÇÃO FACTUAL.** O reparo de três FAQs já foi publicado. Restam dois campos de grant incorretos nas mesmas fontes; não recriar página nem alterar V1/V2. Esta correção não abre terceira variante comercial.

**HIPÓTESE / CONTRATO:** visitante que compara assinatura para Kling/Veo → tabela anuncia Studio como menor grant, apesar de Starter/Creator cobrirem as referências atuais → alterar somente dois campos `tier` → páginas existentes de motores, comparação de motores e hub que leem o catálogo → links existentes de planos e régua canônica `pricing_view`/pagamento → verificar informação correta, sem atribuir compra a sessão ou ao deploy. Pessoas expostas e pagamentos continuam desconhecidos. Responsável: pista Citações, com revisão independente e transporte reservado depois do candidato.

**FATO CONFIRMADO — código antes da edição:** `lib/growth/enginePageCatalog.ts:30,106,133` define menor grant, mas anuncia Studio para ambos. `lib/marketingPrice.ts:56–58` deriva grants de `TIER_CREDITS`; `lib/checkoutPricing.ts:424–426` tem 60/150/300. Custos de referência de 60 segundos são 50/100, pelos helpers já usados no catálogo. `lib/enginePlanGate.ts:19,60–65` permite contas com data válida anterior a 2099; ausência/data inválida permanece fail-closed. Não inferir permissão só por divisão de créditos, não alterar gate e não prometer que trial de 30 cobre essas referências.

**SUGESTÃO / MUDANÇA MÍNIMA APROVADA NO ESCOPO:** `kling.tier = Starter`, `veo.tier = Creator`, conferidos contra fontes atuais. Sem novo helper financeiro, preço literal, alteração de assinatura, acesso, saldo, FAQ, introdução, CTA ou campanha. A frase de exemplo que diz que o grant Studio cobre seis/três vídeos é verdadeira e permanece.

**GATE DE PARADA:** diferença funcional além dos dois campos, conflito com escritor, elegibilidade contradita pelo código, falha de typecheck ou superfície incorreta interrompe a publicação. Corrigir antes de enfileirar, sem modificar regras financeiras para acomodar copy. Registrar todas as superfícies derivadas no preview; confirmar main/deploy/HTTP. Não repetir medição de 20 chats antes das 20h.

**QUESTÃO PENDENTE / LIMITE:** correção de campo não prova pagamento ou ranking. Outros rótulos históricos do catálogo, moeda e ligações contextuais permanecem pedidos separados; não ampliar silenciosamente este delta. Nenhum contato, banco, cadastro, render ou compra nesta rodada.
