# [Citações] QA da correção factual da calculadora

**IMPLEMENTADO / TESTADO LOCALMENTE — 11/09/2026, 12h45–12h48 BRT:** fonte `1478114456efbefe9d521f2669aa35f302baae0a`, integrada como `ec358289`. Único arquivo funcional distinto da main `fac4ec98`: `app/cheapest-ai-shorts-maker/page.tsx`. Removido um import e corrigidas três frases. Alterações anteriores de render/voz e pedido AF-LEGACY foram preservados por merge `d09cd00e`.

**TESTADO LOCALMENTE:** [verificação do agente](../../citacoes-calculadora-20260911/verification.json) renderizou o corpo real da página e os helpers reais, omitindo filhos alheios, com flag ativa/inativa antes/depois. Seis FAQs visíveis e estruturadas coincidem; quatro respostas intermediárias e restante do código permanecem intactos. Typecheck do agente passou, sem tipos Next naquela worktree.

**TESTADO LOCALMENTE — raiz:** [três GETs Next](LOCAL.json) positivos com `KINEO_REVERSE_TRIAL_ENABLED=true`: calculadora com seis FAQs, moeda corrigida, benefício de exportação limpa, chip revisado e um link para cada guia; controles custo V1 e comparação V2 respondem 200 e mantêm suas campanhas. Typecheck completo `--noEmit --incremental false` terminou 0 com o tipo da calculadora gerado, 3.562 bytes. Nenhuma suíte histórica inteira foi declarada executada nesta correção textual.

**TESTADO LOCALMENTE / VISUAL:** Next real inspecionado em desktop de 1280 px e mobile de 390 px. Chip antes/depois, FAQ de moeda e FAQ de trial foram inspecionados; o texto corrigido cabe no mobile, com largura de documento de 390 px. [Preview autocontido](../../citacoes-calculadora-20260911/preview.html) inclui as três seções em pares antes/depois, desktop de 1100 px/mobile de 390 px, com oferta ativa. Artefato encaminhado ao painel e imagens da página real emitidas nesta tarefa. Não houve mudança de CSS, cálculo, formulário, CTA ou campanha.

**TESTADO LOCALMENTE / PROBE CORRIGIDO:** a primeira comparação DOM da raiz procurou respostas em `p` e retornou false; a página usa `div`. A verificação refeita nos elementos reais encontrou exatamente uma resposta visível igual a cada uma das seis respostas JSON-LD. Era erro do seletor de teste, sem alteração adicional do produto. Console consultado sem avisos/erros naquele momento. Os requests locais automáticos dos componentes globais não são aquisição; foram usadas somente credenciais fictícias.

**FATO CONFIRMADO / REVISÃO INDEPENDENTE:** agente HTTP deu GO restrito em 11/09 às 12h41m03s BRT, SHA256 funcional `DED53BD559F3C0A3943FFD9BA28EA18E44B187DB4FB3302819F70964488EA0F8`. A moeda descreve a regra padrão Brasil; não certifica todo fluxo antigo ou override explícito de moeda. O helper compartilhado global permanece incorreto e fora do escopo desta página, conforme pedido histórico.

**QUESTÃO PENDENTE:** publicação, CI/deploy e GET público posterior. V1/V2 e janelas de medição preservadas. Não atribuir receita, crescimento de cadastros ou citações a esta correção.
