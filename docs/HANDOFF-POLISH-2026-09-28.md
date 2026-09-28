# Refinamento visual — 28/09/2026

**IMPLEMENTADO / FATO CONFIRMADO:** rodada local baseada em `799133fd`, no worktree `C:/kineo-wt/neutral-design-20260924`. Escopo: apresentação, sem novas ofertas, texto comercial, preços, rotas ou geração.

- **FATO CONFIRMADO:** `app/appearance.css:3` e `app/appearance.css:56` centralizam superfícies Light mais leves, controles, foco único, espaçamento e alinhamento dos planos. A camada `.stu` fica acima do efeito decorativo do body para o título ser legível no Dark.
- **FATO CONFIRMADO:** `app/kineoLandingTheme.ts:7` mantém a composição da Home e aproxima seus tokens/sombras da base compartilhada.
- **FATO CONFIRMADO:** `components/Sidebar.tsx:238` e `components/MobileNav.tsx:243` passam a usar os tokens do tema nos estados ativos. Destinos e eventos preservados no diff contra `799133fd`.
- **FATO CONFIRMADO:** `app/(dashboard)/ads/new/adsWizardTheme.ts:94` distingue painéis com campos dos painéis de status. Formulários alinham à esquerda; logo e mídia dividem o desktop e empilham no mobile; o campo URL ganha apresentação de campo. `AdsWizardClient.tsx` não foi alterado.

**TESTADO LOCALMENTE (28/09):** TypeScript sem emissão, 646 verificações de `test-five-improvements.mjs`, 66 de `test-nav-item-clicked-2026-09-25.mjs` e comparação no Chrome. Studio, Images, Ads input, Library e Pricing sem overflow horizontal na prévia a 390 px. Studio Light/Dark, planos e formulário Ads conferidos visualmente no desktop.

**QUESTÃO PENDENTE:** o harness `test-ux-mobile-navigation.mjs` falha ao importar `@/lib/ui/workspaceNavigation`; mesma falha reproduzida com o harness de `799133fd`. Não foi contabilizado como aprovado nem alterado nesta rodada.

**IMPLEMENTADO:** `scripts/preview-polish-20260928.mjs` gera comparação autocontida a partir de JSX real, com Manrope local e alternância desktop/mobile e Light/Dark. O harness histórico agora também lê o tema da Home na revisão base, evitando um antes com CSS do depois.

**LIMITAÇÃO:** prévia offline, sem efeitos React ou integrações. Biblioteca usa uma imagem de demonstração; saldo é fictício. Não valida checkout ou geração. As telas recebem os estilos compartilhados, mas não há alegação de validação exaustiva de todos os estados do produto.

**IMPLEMENTADO:** rodada de acabamento registrada em `cab1668b` após aprovação do fundador nesta conversa. Complemento solicitado: Light menos claro, com fundo `#e3e4e5`, cards `#f4f4f3`, bordas e texto secundário mais definidos (`app/appearance.css:4`, `app/kineoLandingTheme.ts:8`).

**TESTADO LOCALMENTE (28/09):** contraste calculado por luminância relativa dos nove pares de texto principal/secundário/muted2 sobre bg/card/card2: mínimo 5,15:1. Os blocos de tokens Dark são idênticos aos de `cab1668b`. Não equivale a certificação integral de acessibilidade.

**ESTADO:** publicação será confirmada pelo estado do deployment; este documento não afirma validação em produção. Comparação acumulada em `outputs/polish-20260928/`; contraste Light contra a rodada aprovada em `C:/Users/josep/Documents/Codex/2026-09-21/kineo-ux-ui/outputs/light-contrast-20260928/antes-depois.html`.

**VALIDADO EM PRODUÇÃO (28/09):** deployment `dpl_FypXC1s8Wh75iCvg4eTYpo4omiGU`, SHA `7f7a13e1`, READY. Chrome em `/studio`: `--bg:#e3e4e5`, `--card:#f4f4f3`, largura de conteúdo igual à viewport (1920 px). A conferência de foco mostrou uma separação entre borda e outline; ajuste final de `outline-offset:0` une o indicador sem remover o foco visível (`app/appearance.css:69`).
