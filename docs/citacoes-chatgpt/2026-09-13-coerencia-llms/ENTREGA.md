# CITACOES-01 — coerência comercial do llms.txt

**FATO CONFIRMADO · IMPLEMENTADO · 13/09/2026:** entrega parcial do pedido existente CITACOES-01, em worktree própria baseada em `ee5cbc52e802fffb864abf41a10860b2dc735ce1`. A reserva do Board cobre `app/llms.txt/route.ts`; esta entrega inclui um teste offline e este registro. A publicação depende da revisão do commit e da liberação da fila pelo Board.

**EVIDÊNCIA DE PRODUÇÃO · 13/09/2026, 16h29min58s BRT:** um GET público de `https://www.usekineo.com/llms.txt` retornou HTTP 200 e ainda serviu a afirmação de cobrança somente em USD e três entradas comerciais aposentadas. O texto corrente do trial coexistia com o histórico incompatível. Evidência privada: `w4-llms-before-20260913.json` e `.txt`, SHA-256 do corpo `13a4aeba22d272092952faf3477f084678069cb155c362d5494d3d5096563940`. O resultado da busca, rastreado dois dias antes, não foi usado como prova atual.

**HIPÓTESE:** retirar essas ambiguidades melhora a consistência da fonte consultada por pessoas e assistentes. Não há prova de que esse trecho causou a queda de cadastros ou as respostas antigas da bateria de 12/09. Uma publicação não prova nova citação, cadastro ou pagamento.

## Alteração contida

**FATO CONFIRMADO · IMPLEMENTADO:** em `app/llms.txt/route.ts:310`, a frase de moeda passa a ser:

> Published plan amounts are reference prices in USD. Customers in Brazil normally pay in BRL; check the checkout for the currency and amount.

**FATO CONFIRMADO:** a ressalva “normally” corresponde a `lib/settlementCurrency.ts:100`, que permite moeda forçada, e às regras seguintes para recusa anterior, país e idioma brasileiros. Nenhuma tabela ou política de cobrança é alterada.

**FATO CONFIRMADO · IMPLEMENTADO:** na seção histórica de `app/llms.txt/route.ts:381`, saem as entradas comerciais de 09/09 pela manhã, 08/09 e 19–20/08. Também saem a referência órfã às duas entradas seguintes e a frase histórica sobre o trial pago aposentado, dentro da entrada de 09/09 à noite. Essa entrada preserva a oferta restaurada. O import `videosPerMonth`, usado somente no histórico removido, deixa de existir.

**FATO CONFIRMADO · TESTADO LOCALMENTE:** a comparação da resposta antiga e candidata mantém todos os demais bytes, com relógio fixo e normalização limitada às linhas autorizadas. Mantém cabeçalhos, planos e créditos canônicos, acesso a motores, links, CTAs e parâmetros de campanha, incluindo os oito guias e as variantes existentes. O teste executa o GET real nos dois estados da flag declarada `KINEO_REVERSE_TRIAL_ENABLED`, com um carregador independente por estado e módulos comerciais reais, sem substitutos de preço ou entrada.

## Validação em 13/09/2026

**FATO CONFIRMADO · TESTADO LOCALMENTE:** resultados obtidos nesta worktree:

| Verificação | Resultado |
| --- | --- |
| `node scripts/test-llms-commercial-truth.mjs ee5cbc52e802fffb864abf41a10860b2dc735ce1` | PASS: GET, oferta por estado, moeda, histórico, links e comparação integral ON/OFF |
| Novo teste executado contra a worktree baseline limpa | Falha esperada: resposta antiga não distingue USD de referência e BRL na cobrança |
| `node scripts/test-llms-paginas-citadas.mjs` | PASS: 91 verificações |
| `node scripts/test-llms-affiliate-source.mjs` | PASS: GET real e derivação da comissão |
| `node scripts/test-restauracao-2026-09-09.mjs` | PASS: 21 verificações |
| `node scripts/test-moeda-local-2026-09-09.mjs` | PASS: 50 verificações; teste legado usa substituto local de preços, complementado pelo novo teste com módulos reais |
| `npx tsc --noEmit --incremental false` | PASS |
| `git diff --check` | PASS |
| `node scripts/test-checkout-currency-truth.mjs` | Falha preexistente reproduzida, descrita abaixo; não foi declarada verde |

**CONTRADIÇÃO · TESTADO LOCALMENTE:** o diagnóstico antigo `scripts/test-checkout-currency-truth.mjs:104` falha tanto na candidata quanto no baseline limpo `ee5cbc52`, exigindo o helper anterior na calculadora. Além disso, sua linha 162 ainda exige exatamente a frase de moeda removida desta rota. O arquivo não foi alterado. ` .github/workflows/guardiao.yml:1` separa contratos críticos dos diagnósticos legados manuais; esse teste antigo não integra os passos críticos declarados. Disposição dessa pendência entregue ao Board, sem mudar calculadora, FAQ, helper global ou política para satisfazer uma asserção antiga.

**FATO CONFIRMADO · TESTADO LOCALMENTE:** a primeira execução do novo teste falhou porque seu ambiente offline omitia a flag e selecionava a seção histórica de acesso gratuito. O harness foi corrigido para exercitar ambos os estados reais; a rota e os ramos condicionais não foram modificados para fazê-lo passar. Evidências completas ficam no registro privado `w4-llms-tests-20260913.json`.

## Pendências e critério de sucesso

**QUESTÃO PENDENTE / DESCONHECIDO:** nova resposta pública após deploy, nova medição de citações e efeito em cadastros ou pagamentos ainda não verificados no momento deste commit. Critério técnico: GET 200 com oferta vigente, frase correta de moeda e sem as três entradas comerciais aposentadas. Critério comercial: evolução nas baterias comparáveis e cadastros externos atribuídos, sem tratar posição na amostra como participação de mercado.

**EVIDÊNCIA DE PRODUÇÃO · BASELINE ANTERIOR À W4:** a bateria de 12/09 às 20h registrou 6 menções em 20 respostas, 4 respostas com informação comercial antiga e nenhum link aos oito guias. Fonte: [relatório de 12/09](../2026-09-12-20h/RELATORIO.md). Esses números não são resultado desta alteração.

**QUESTÃO PENDENTE / DESCONHECIDO:** CITACOES-01 continua parcial: o helper global/FAQ e comparativos têm outros responsáveis. CITACOES-02 continua com os responsáveis já registrados. Esta entrega não muda esses arquivos, não cria páginas ou variantes e não reabre contatos, submissões ou medições encerradas.
