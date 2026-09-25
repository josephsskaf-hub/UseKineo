# Pista visual — refinamento 05

DECISÃO APROVADA — instrução do fundador nesta tarefa, 25/09: preservar a direção mista aprovada, ordenar o menu em Vídeo, Imagem, Para empresas, Preços e Entrar; destacar Vídeo; desenhar os fluxos até os próximos passos; manter preços e lógica comercial.

IMPLEMENTADO — prévia isolada em `public/design/polished-v5-20260925/index.html`, gerada por `scripts/preview-kineo-polished-v5.cjs`. A navegação pública e os menus lateral/móvel estão pareados no protótipo. As páginas reais de navegação, Studio, Imagens, empresas e preços NÃO foram substituídas por este lote.

IMPLEMENTADO — única mudança no app real: literais de cor em `components/CreditsTopupModal.tsx`. Estrutura, textos, hooks, elegibilidade, quantidade, `sliderPriceUsdMinor` e chamada de checkout preservados. Nenhuma fonte de preço foi editada. Snapshot fiel do componente real antes/depois, com CSS real e hooks controlados, em `public/design/topup-colors-20260925/index.html`.

FATO CONFIRMADO — caminhos desenhados na prévia:

- Vídeo (`create.html`) → Studio (`video.html`) → filme pronto (`film-ready.html`): próximo filme, mais créditos e assinar. Download usa aviso de demonstração.
- Imagem (`image.html`) → resultado (`image-ready.html`) → referência no Studio (`animate.html`). Imagem fixa ilustrativa, sem transmissão ou persistência.
- Empresas (`business.html`): eu mesmo faço → Studio Ads; vocês fazem → Express/Pro → resumo de compra → demonstração explícita da confirmação → briefing. Não existem checkout real, upload ou envio de briefing na prévia.
- Preços (`pricing.html`): Mensal/Anual somente; criação, anúncios e créditos avulsos permanecem visíveis. Anual explicita o total cobrado e mantém créditos mensais.

FATO CONFIRMADO — preços do protótipo são resolvidos durante a geração a partir de `lib/checkoutPricing.ts`, `lib/ads/offer.ts`, `lib/growth/dfyServiceFacts.ts` e `lib/credits/creditSlider.ts`. O cliente consulta uma tabela calculada por `sliderPriceUsdMinor`, sem duplicar a fórmula. O layout usa identificadores de plano e campos de dados, permitindo futura troca de valores sem redesenho. `pricing-source.json` registra os dados usados. Regenerar a prévia quando as fontes mudarem; este snapshot não é uma API de preços em tempo real.

TESTADO LOCALMENTE — typecheck sem incremental; guardião `test-barra-de-creditos-2026-09-23.mjs` com 28 verificações aprovadas; revisão de links e âncoras; scripts embutidos analisados; navegação no navegador; alternância anual; sequência Imagem → resultado → referência; confirmação demonstrativa → briefing; navegação móvel e menu Mais; extremo da barra conferido com a fonte; console sem erros nos fluxos inspecionados. Comparação do TSX normalizando cores confirmou ausência de alterações fora das cores.

IMPLEMENTADO — comparação com a v4 para telas existentes; estado anterior real do pop-up; comparação original da home e empresas; alternância desktop/celular. Pacote autocontido produzido com `scripts/package-kineo-mixed-refined.cjs`. Imagens e fontes embutidas; os vídeos mantêm URLs públicos da Kineo.

QUESTÃO PENDENTE — a sessão Kineo Ads integra a passagem real da imagem e o briefing liberado por pagamento confirmado. A pista visual fornece os estados e o caminho; não cria contratos de API nem modifica autenticação, geração ou cobrança. A migração das páginas reais e da navegação continua em lote de implementação separado para coordenar com Claude.

QUESTÃO PENDENTE — `docs/ANALISE-ESTRUTURA-E-ATAQUES-2026-09-24.md` ainda não estava disponível no commit remoto lido durante este lote. As decisões explícitas enviadas pelo fundador foram a referência de escopo.
