# Algo que é seu — 26/10/2026

**IMPLEMENTADO / LOCAL.** Pedido do fundador encaminhado pela sessão principal: executar as três comparações visuais aprovadas. Este recorte implementa somente a segunda. Base: `563d7f30064cb0e7ee392490d0e9e48e95c4e1bc`, worktree `compra-entrada-2610`.

**HIPÓTESE / PARCIAL.** Quem chega ao Studio sem roteiro precisa reconhecer sua tarefa antes de escolher um exemplo. A mudança mínima troca os iniciadores genéricos junto ao campo por objetivo (canal/história/produto) e referências opcionais. Reaproveita o campo, os modos, o custo e a geração existentes; não acrescenta outro CTA de geração. A melhora comercial ainda é desconhecida: acompanhar pessoas externas que chegam, digitam e geram, e pagamentos confirmados na mesma janela; não atribuir causalidade sem comparação adequada. Os eventos existentes de digitação e geração não foram redefinidos.

**FATO CONFIRMADO.** Só dois blocos marcados de StudioClient mudaram: imports e faixa de iniciadores. O teste reverte esses blocos em memória e exige igualdade integral com a base. Motor, demonstração do barco, custos, elegibilidade e handlers financeiros/de geração permanecem byte a byte.

**FATO CONFIRMADO.** Referências são entradas públicas selecionadas pelo fundador nos catálogos existentes; os textos sugeridos não são apresentados como o prompt original dessas imagens. Campo preenchido não é sobrescrito, inclusive por callback antigo. ChatGPT/roteiro de chegada, Clip e Verbatim não recebem os novos iniciadores. O link de produto usa a entrada validada existente e só abre `/ads/v2?entry=product`; não recebe URL de produto, não importa mídia e não inicia anúncio.

**TESTADO LOCALMENTE.** `node docs/compra-clareza-2610/test-own-idea-start.mjs`: UI real, callback real, contexto, texto preservado, referências locais, link Ads e inversão exata; quatro mutantes recusados. Guardião vizinho `node scripts/test-mrr-studio-near-idea-2026-10-01.mjs`: PASS, sete mutantes. `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS. Nenhuma rede/banco/render nesses testes.

**PREPARADO.** `own-idea-start-preview.html` compara a faixa real antes/depois em computador e celular; referências abertas apenas para inspeção. O renderer SSR não representa uma sessão autenticada. Revisão visual final pela sessão principal permanece necessária. O guardião histórico de igualdade integral precisa consumir o inverso exato desta camada na integração; nenhum teste histórico foi modificado aqui.

**DESCONHECIDO.** Publicação, exposição e impacto em pagamento. Sem push, merge ou deploy neste recorte.
