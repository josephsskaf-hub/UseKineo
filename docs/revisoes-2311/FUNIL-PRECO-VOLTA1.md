# Funil de preço · volta 1

**IMPLEMENTADO · 23/11/2026.** O produto agora renderiza a entrada no `/pricing` real via `app/pricing/layout.tsx` e `app/pricing/PricingClient.tsx`. A rota de estudo foi retirada. O layout deixa o interruptor em `off`. O resumo segue a alternância de período existente e indica preço cheio, antes das ofertas. Clicar em See Creator registra a escolha e abre o cartão com a ação habitual.

**TESTADO LOCALMENTE.** O guardião executa o layout e o componente, incluindo a política de liberação, totais mensais e anuais, reais e o destino do clique. As oito mutações falharam pelas respectivas asserções. Conferido no navegador que o seletor anual atualiza o total e que o próprio cartão recebe o clique. Sem ação de pagamento.

**SUGESTÃO.** Após avaliação das imagens, ligar para a casa primeiro. Conferir mensal e anual, USD em país compatível e nota de BRL, chegada com cupom, os três destinos de cartão e preservação de ofertas na ação de compra. Medir clique de escolha, abertura e confirmação, deduplicando por pessoa. Usar um experimento de escolha de plano por vez.
