# Refinamento visual e menu — 28/09/2026

IMPLEMENTADO · FATO CONFIRMADO: `app/appearance.css` e `app/kineoLandingTheme.ts` usam fundo grafite suave no light, superfícies separadas, metadados legíveis e foco de teclado. Dark permanece independente.

IMPLEMENTADO · FATO CONFIRMADO: `components/PublicNavDropdown.tsx` abre por clique/teclado, fecha por Escape e clique externo, e mantém apenas um menu aberto. `app/KineoLanding.tsx`, `lib/ui/workspaceNavigation.ts` e `components/Footer.tsx` retiram Viral Now/Scripts da navegação. As rotas existentes permanecem disponíveis para links antigos.

IMPLEMENTADO · FATO CONFIRMADO: os demais refinamentos aprovados abrangem referências ilustrativas identificadas em Imagens, referências de restaurante/produto na Home e Ads, ajuda recolhível em Ads v2, barra compacta da Biblioteca, minutos separados por motor, botões primários/secundários e avisos de render/pagamento com tokens do tema. Os modais de oferta já haviam sido entregues em `47dc92a3` e recebem a nova paleta compartilhada. Nenhuma fonte de preço, quantidade, checkout ou geração foi editada nesta rodada.

TESTADO LOCALMENTE · EVIDÊNCIA (28/09/2026): TypeScript sem erros; testes offline de minutos/créditos (87), telemetria da navegação (66), curadoria da Home (227), galeria (20), carregamento Imagens/Áudio (18) e comportamento do novo disclosure passaram. O teste antigo `test-ux-mobile-navigation.mjs` ainda espera a navegação anterior e falha ao importar o modelo compartilhado; não é apresentado como aprovado. A remoção das duas entradas na Sidebar/MobileNav está coberta pelo novo `test-public-nav-disclosure.mjs` e pela inspeção visual mobile.

TESTADO LOCALMENTE · EVIDÊNCIA (28/09/2026): prévias do JSX real em desktop e viewport de 390 px, light/dark; links de todos os motores e ferramentas do dropdown têm área de clique livre; Home e Biblioteca sem overflow horizontal no mobile. Prévia offline sem execução de efeitos, banco, geração, compra ou telemetria. Figuras de motores são ilustrações, não resultados gerados por eles. Conceitos comerciais são identificados como conceitos, não trabalhos de clientes.

Comparação autocontida: `C:/Users/josep/Documents/Codex/2026-09-21/kineo-ux-ui/outputs/refinement-complete-20260928/antes-depois.html`. Gerador: `scripts/preview-refinement-complete.mjs`, baseline `ec600bda`.
