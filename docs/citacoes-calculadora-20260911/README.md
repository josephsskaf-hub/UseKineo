# Citações · moeda e acesso na calculadora

**FATO CONFIRMADO · IMPLEMENTADO LOCALMENTE · 11/09/2026:** alteração sobre `fac4ec98573fd5a106d6861dffded8e53b5e733a`, em worktree própria `codex/citacoes-calculadora-20260911`. Único arquivo funcional: `app/cheapest-ai-shorts-maker/page.tsx`.

**HIPÓTESE:** quem chega à calculadora para comparar custos encontra uma frase que confunde moeda de referência com moeda cobrada e outra que apresenta motores como exclusividade paga. Corrigir esses fatos reduz a contradição antes da escolha de teste ou plano; efeito em pessoas e pagamentos permanece **DESCONHECIDO**.

**SUGESTÃO · contrato de execução:** visitantes da calculadora → informação contraditória de moeda/acesso → três frases corrigidas → mesma página e mesmos CTAs → eventos canônicos já existentes → intenção de teste/plano e pagamento atribuível → medição da pista nas janelas vigentes → parar após correção verificada, preservando V1/V2 → implementação pelo subagente Calculadora; integração, navegador e publicação pela pista Citações.

**CONTRADIÇÃO · fonte em 11/09/2026:** a antiga FAQ importava a divulgação global de USD de `lib/marketingPrice.ts:280`, enquanto `lib/settlementCurrency.ts:102` resolve BRL para país BR e `lib/settlementCurrency.ts:103` para pt-BR. A página passa a distinguir preços de referência em USD de cobrança em reais; não fixa nenhum valor em reais (`app/cheapest-ai-shorts-maker/page.tsx:62`).

**FATO CONFIRMADO · IMPLEMENTADO LOCALMENTE:** o import de `creditsPerReferenceVideo` foi preservado (`app/cheapest-ai-shorts-maker/page.tsx:18`). A primeira FAQ usa: “Prices shown here are in USD. Customers in Brazil pay in BRL (reais); check checkout for the amount in reais.” O chip usa “USD reference prices · Brazil pays in BRL” (`app/cheapest-ai-shorts-maker/page.tsx:97`).

**FATO CONFIRMADO · IMPLEMENTADO LOCALMENTE:** a FAQ final preserva integralmente o ramo `ft(OFFER, ..., OFFER.copy.sentence)` e termina com “Paid plans unlock clean exports.” (`app/cheapest-ai-shorts-maker/page.tsx:67`). A fonte de oferta descreve todos os motores abertos e exportação limpa no plano em `lib/freeTierOffer.ts:248`; a data vigente do gate é futura em `lib/enginePlanGate.ts:19`. Saldo e duração continuam sujeitos ao custo do motor; a mudança não altera acesso ou crédito.

**FATO CONFIRMADO · TESTADO LOCALMENTE · 11/09/2026 12:42 BRT:** a verificação estrutural confere que a diferença da página é exclusivamente o import e as três frases solicitadas. Não muda preço numérico, oferta, campanha, formulário, calculadora interativa, motores, catálogo, links, CTAs ou V1/V2. Fonte: `verification.json` e `render-preview.cjs` nesta pasta.

**FATO CONFIRMADO · TESTADO LOCALMENTE:** a FAQ visível (`app/cheapest-ai-shorts-maker/page.tsx:156`) e o JSON-LD (`app/cheapest-ai-shorts-maker/page.tsx:75`) usam o mesmo array. A renderização estática conferiu seis perguntas antes/depois com flag ON e OFF; texto de cada resposta visível coincide com a resposta estruturada. Helpers de oferta/crédito foram carregados do código real; componentes filhos alheios foram omitidos no SSR. Nenhuma chamada de rede, credencial, render de vídeo ou checkout foi executada. Fonte: `verification.json`, UTC `2026-09-11T15:42:38.164Z`.

**FATO CONFIRMADO · TESTADO LOCALMENTE · 11/09/2026 12:43 BRT:** `node node_modules/typescript/bin/tsc --noEmit --incremental false` terminou com código 0; `git diff --check` terminou com código 0. Esta worktree usa junction para as dependências existentes em `C:/kineo/node_modules`; não iniciou Next e não possui tipos de rota gerados em `.next/types`.

**FATO CONFIRMADO · IMPLEMENTADO LOCALMENTE:** [preview.html](preview.html) é autocontido, com pares antes/depois das três frases em desktop de 1100 px e mobile de 390 px. O chip deriva do JSX real; os cartões reproduzem os estilos existentes com as respostas reais da FAQ. A copy do preview usa flag ON, derivada dos helpers vigentes. A visualização histórica “ANTES” é apenas comparação e não oferta publicada por este artefato.

**FATO CONFIRMADO · revisão estática independente · 11/09/2026 12:41:03 BRT:** agente `citacoes01_http` informou GO restrito nas quatro linhas, FAQ/JSON-LD com origem comum e distinção USD/BRL coerente. SHA256 do arquivo funcional revisado: `DED53BD559F3C0A3943FFD9BA28EA18E44B187DB4FB3302819F70964488EA0F8`. Fonte: mensagem de revisão entregue à pista principal nesta data.

**QUESTÃO PENDENTE / DESCONHECIDO:** browser desktop/mobile, rota Next completa, types gerados, superfície pública, CI/deploy e impacto comercial serão verificados pela pista principal. Esta entrega é local, não está enfileirada ou publicada. O helper global de moeda permanece intacto, conforme escopo autorizado.
