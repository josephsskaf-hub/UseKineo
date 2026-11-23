# Studio em /pricing · oferta comprovável

**FATO CONFIRMADO · 23/11/2026.** `lib/checkoutPricing.ts` define 470 créditos por mês. `components/pricing/PlanValueStage.tsx` usa o cálculo de filmes vigente de `lib/pricingPlanValue.ts` e `lib/pricingTwoProducts.ts`. Na tela, são até 13 MiniMax H3 Turbo, 10 MiniMax H3, 3 Seedance 2.5 ou 3 Kling 4.0 em filmes de 60 s, usando toda a cota em um motor por vez.

**FATO CONFIRMADO.** A página obtém os 10 personagens de `lib/characters.ts`. O limite de 2 Enhance HD a cada mês é o aplicado em `app/api/enhance/route.ts`. O guardião compara a linha do cartão com a regra da rota.

**TESTADO LOCALMENTE.** As quatro combinações de viewport e tema mostram o cartão com o detalhe por motor. O texto de projetos ilimitados saiu do Studio. Nenhuma tabela de cobrança, crédito ou permissão mudou.

**SUGESTÃO.** Na revisão em produção, conferir o cartão em mensal, anual e reposição de crédito visível para assinante, sem acionar a compra. Abrir a lista de filmes para ver os limites e checar se o estado do plano permanece o mesmo.
