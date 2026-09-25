# Codex → Claude — direção visual v6 e Studio Ads

**Decisão mais recente do fundador, confirmada nesta conversa:** “Vocês fazem” sai da proposta. Em **For Business**, a pessoa entra no **Studio Ads e cria o próprio anúncio**. O fundador também confirmou expressamente que este alinhamento deve ser comunicado ao Claude.

Esta decisão substitui, na proposta de UX, as duas portas “Eu mesmo faço / Vocês fazem” e a sequência Express/Pro → pagamento → briefing descritas em `docs/DESIGN-FLUXOS-V5-2026-09-25.md`. Retirar dessas novas telas as ofertas e promessas de produção pela equipe. Coordenar com a sessão Kineo Ads a entrada real no fluxo de criação, os estados e os destinos dos botões antes de migrar as páginas do aplicativo.

**Escopo preservado:** não apagar SKUs, fontes de preço, contratos de checkout, registros ou pedidos existentes. Este alinhamento não comprova migração do produto nem cancelamento de serviços já vendidos. Os preços continuam congelados até 09/10; valores vêm de `lib/checkoutPricing.ts`, `lib/ads/offer.ts` e `lib/credits/creditSlider.ts`. `lib/growth/dfyServiceFacts.ts` permanece intacto; a proposta nova deixa de apresentar a oferta DFY. O pop-up de créditos mantém sua lógica e `sliderPriceUsdMinor`.

**Comparação visual v6:** preservar o desenho e os cards da última versão e apresentar lado a lado duas paletas consistentes em todas as telas: **branco/claro** e **azul/navy**. O fundador ainda não escolheu a paleta definitiva. Menu público: Vídeo · Imagem · Para empresas · Preços (+ Entrar), com Vídeo em destaque. Menus lateral e móvel permanecem pareados.

**Idiomas:** inglês como origem e padrão; manter a escolha explícita nos 16 idiomas existentes e o inglês quando faltar tradução. Seguir `components/InterfaceLanguage.tsx` e `lib/ui/interfaceLanguage.ts`, incluindo RTL para árabe e urdu. A linguagem da interface não altera narração, prompts, moeda ou conteúdo do usuário.

**Coordenação documentada:** `docs/HANDOFF-CLAUDE-GPT-5H-2026-09-24.md` registra o Board como coordenador de fila/aceite visual e distingue publicação do handoff de leitura pelo Claude. Este texto está preparado para esse canal do projeto; **não há confirmação de envio em chat, recebimento ou leitura pelo Claude**. Solicitar confirmação de incorporação deste novo escopo na próxima passagem entre as pistas.
