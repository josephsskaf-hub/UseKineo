# Menu, Studio, Biblioteca e planos — etapas 02 a 05

**DECISÃO APROVADA (conversa, 22/09/2026):** Joseph autorizou todas as cinco propostas e o merge: “pode fazer todos ! aprovado para tudo. merge pra tudo.” Azul permanece nas ações; menta somente no ícone. A etapa 01 da home já integra a base ed7af50a.

**IMPLEMENTADO / FATO CONFIRMADO:** `lib/ui/workspaceNavigation.ts`, `components/Sidebar.tsx` e `components/MobileNav.tsx` organizam os destinos principais em Home, Video, Images, Audio e Library. Grow e Account são secundários. No celular, Images e Audio ficam em Tools. Histórico e ferramentas mantêm URLs; Avatar e Animate ficam nos modos do Studio.

**IMPLEMENTADO / FATO CONFIRMADO:** `app/(dashboard)/studio/StudioClient.tsx` reúne Film, Clip, AI Presenter e Animate a Photo no topo, custo e ação junto da ideia, detalhes de saída recolhidos. Clip usa CLIP_CREDITS da fonte existente e informa ausência de narração. Geração e pagamento não foram substituídos.

**IMPLEMENTADO / FATO CONFIRMADO:** `app/(dashboard)/library/LibraryClient.tsx` reúne All, Videos, Images e Audio, busca desde o primeiro item e projetos prontos, em processamento ou com falha. `app/api/videos/route.ts` aceita limite até 300, igual ao histórico existente, mantendo 48 por padrão e filtro pelo usuário autenticado em todas as consultas. Sem migração. Não é paginação ilimitada. Contagem de Shorts concluídos exclui falhas e processamentos. Links para histórico preservam download e ações existentes.

**IMPLEMENTADO / FATO CONFIRMADO:** `app/pricing/PricingClient.tsx` destaca preço e créditos, recolhe detalhamento de motores e move prova/contexto abaixo dos planos. Mensal/anual, checkout, descontos e créditos mantêm fontes existentes. `lib/freeTierOffer.ts` substitui a promessa calculada de zero filmes pela quantidade real de créditos e explica que custo varia. `lib/ui/homePresentation.ts` corrige largura mínima dos cards de planos na home.

**TESTADO LOCALMENTE (22/09/2026):** TypeScript bruto, todos os scripts críticos do Guardião, contratos de preço/checkout e novo teste de handlers reais/SSR/consulta autenticada. `scripts/test-app-blue-layout.mjs` exercita mudança de modo sem perda da ideia, filtros/busca, estados do acervo, mensal/anual e owner scope. Sem chamadas a provedores pagos, banco real ou compras.

**TESTADO LOCALMENTE:** comparativo gerado do JSX real por `scripts/preview-app-blue.mjs`, base ed7af50a; saldo e acervo demonstrativos, com títulos fictícios e pôsteres públicos. Revisão visual desktop e celular; comparativo estático não executa geração nem checkout. URL de entrega: https://kineo-ux-preview-0921.netlify.app/app-blue/ . O comparativo anterior da home permanece em /home-blue/.

**QUESTÃO PENDENTE no momento do commit:** CI remoto, build Vercel e confirmação de publicação após o push; validação local não substitui evidência de produção. Nenhum teste pago nem acervo de cliente foi usado para certificação.
