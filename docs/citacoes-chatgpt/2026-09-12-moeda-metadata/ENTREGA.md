# [Citações] CITACOES-01 — moeda na descrição de pricing

**DECISÃO OPERACIONAL / PARCIAL — 12/09/2026:** cumprir a parte de metadata do pedido CITACOES-01 existente. A nova janela foi autorizada pelo fundador via Board, de 11/09 23h50 até 12/09 23h50 BRT. Sem nova variante, página, preço ou oferta.

**EVIDÊNCIA DE PRODUÇÃO:** a bateria de 11/09 às 20h citou /pricing em EN10; a contraprova HTTP preservada contém a oferta atual, mas a descrição de moeda continua contraditória. [Bateria e limites](../2026-09-11-20h/RELATORIO.md). Não atribuir a posição da resposta à frase de moeda.

**FATO CONFIRMADO — base 308c0a2e:** app/pricing/page.tsx:21, :26 e :43 dizem “charged in USD worldwide” em description, Open Graph e Twitter. lib/settlementCurrency.ts:100–104 permite override e escolhe BRL por recusa brasileira prévia, país BR ou idioma pt-BR; o restante usa USD. O texto “normally” preserva essas exceções.

**HIPÓTESE / CONTRATO:** pessoa que avalia planos a partir da fonte já citada → descrição promete uma moeda que pode divergir do checkout → corrigir somente as três descrições mantendo o preço derivado de STARTER_MONTH → mesma URL /pricing → eventos e pagamentos canônicos existentes, sem novo contador/campanha → reduzir contradição antes de uma escolha de plano. Exposição humana, impacto sobre citações e pagamento continuam desconhecidos; a publicação sozinha não demonstra efeito comercial.

**SUGESTÃO / TEXTO REVISADO PELO BOARD:** “Paid plans start at [STARTER_MONTH] (USD reference). Customers in Brazil normally pay in BRL; check the checkout for the amount. Paid plans unlock clean, watermark-free MP4 exports.” O colchete neste registro representa a interpolação existente, nunca um preço literal novo. A moeda vem antes do benefício de exportação.

**ESCOPO / PARADA:** só app/pricing/page.tsx. Preservar os outros campos de metadata, título, canonical, oferta derivada, componente cliente e lógica de checkout. Não tocar lib/checkoutPricing.ts, lib/entryPolicy.ts, lib/settlementCurrency.ts, catálogo, runtime de pagamento/render ou variantes V1/V2. Parar se houver escritor concorrente, mudança de base que invalide o candidato, falha de tipos ou metadata diferente fora das três descrições.

**TESTADO LOCALMENTE — 12/09 às 00h11m19s BRT:** depois da preparação virtual às 00h08, a exportação do arquivo efetivamente editado foi executada com dependências puras reais e dois valores declarados da flag de free tier; os três campos têm texto idêntico entre si e todos os demais campos são idênticos antes/depois. O arquivo corresponde ao delta textual exato revisado sobre 308c0a2e. O componente cliente não foi executado; nenhuma leitura de segredo, rede, checkout ou render. Isso verifica os ramos de código, não qual flag está configurada em produção.

**IMPLEMENTADO / TESTADO LOCALMENTE — 12/09:** Board concedeu reserva de edição para esse único arquivo; aplicadas somente as três descrições. Typecheck completo da worktree com `tsc --noEmit --incremental false` terminou com exit 0, sem saída; diff check passou. Revisão independente do diff real aprovou código e escopo. Não há mudança visual na interface; os textos revisados acima são metadata, não uma previsão de como um buscador exibirá o snippet.

**ESTADO:** candidato local, aguardando revisão de SHA/base e autorização nominal de transporte. Nenhum enfileiramento, BAT, publicação, nova consulta de produção ou pedido de indexação nesta etapa. A validação de CI/deploy e da metadata servida pertence à confirmação posterior da entrega, sem novo recrawl.

**QUESTÃO PENDENTE / DESCONHECIDO:** a FAQ e a declaração global de moeda continuam com seu dono no mesmo CITACOES-01. Este reparo parcial não encerra o pedido inteiro, não garante atualização de snippet/citação e não comprova receita.
