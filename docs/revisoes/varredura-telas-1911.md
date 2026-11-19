# Varredura das telas de 19/11/2026

Fonte da auditoria original e das fotos de antes: `C:/kineo/docs/decisoes-1911/varredura-telas/RELATORIO.md`. A base da proposta contém a home limpa aprovada pelo dono.

| Item | Resultado |
| --- | --- |
| 1. Tabela da home escura | **VALIDADO EM PRODUÇÃO EM 19/11** pela CEO no quadro após `8323e6c56`. A seção `TrafficCitation2310` usa os tokens da home. |
| 2. Durações em `/ads` | **IMPLEMENTADO** em `app/ads/page.tsx`. A amostra de apresentador ganhou rótulo próprio; seu limite continua vindo da configuração de Ads. |
| 3. Preço na comparação | **IMPLEMENTADO** em `app/KineoLanding.tsx`. O formatador de `lib/checkoutPricing.ts` recebe o mesmo valor em centavos e inclui o cifrão. |
| 4. Menu entre páginas | **IMPLEMENTADO** em `components/PublicSiteHeader.tsx`. Galeria, preços, catálogo público do Recreate, desenhos e página de criadores exibem a mesma navegação com os nomes de `lib/ui/nomesDeProduto.ts` e a mesma engrenagem. A home mantém seu cabeçalho com o presente e as aberturas do login e do cadastro. O editor de Recreate mantém a barra que protege a saída com trabalho em curso. |
| 5. Selos da vitrine | **IMPLEMENTADO** em `components/home/HomeMosaic.tsx`. Cartões com prompt para Clips exibem “Use clip prompt”. Moldes do Recreate exibem “Recreate”. |
| 6. Ícone móvel de Recreate | **IMPLEMENTADO** em `app/appearance.css`. As duas variantes do menu público leem a máscara do ícone a partir do mesmo seletor. |
| 7. Legenda de desenhos | **IMPLEMENTADO** em `components/kidsCartoon/KidsCartoonPages.tsx`. A legenda descreve o curta em 3D. O motor desse exemplo não foi comprovado no material da vitrine. |
| 8. Moldes sazonais | **IMPLEMENTADO** em `lib/recreate/formats.ts`, nos catálogos e na grade do Recreate. Halloween e Dia dos Mortos ficam no fim. A partição preserva a ordem de cada grupo. |
| 9. Capa antes da reprodução | **IMPLEMENTADO** em `components/home/HomeMosaic.tsx` e `components/WallMedia.tsx`. As primeiras capas são solicitadas sem lazy loading e uma falha na reprodução revela a capa. |
| 10. Título da aba e do Google | **SUGESTÃO** para revisão da CEO: “Kineo AI — Faceless YouTube Shorts, AI Ads and Cartoons”. Preserva a expressão atual “Faceless YouTube Shorts” e acrescenta anúncios e desenhos. O título em produção continua em `app/layout.tsx`. |
