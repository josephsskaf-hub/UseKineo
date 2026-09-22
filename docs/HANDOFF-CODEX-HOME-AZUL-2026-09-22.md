# Home azul — etapa 01

**DECISÃO APROVADA (conversa, 22/09/2026):** implementar as cinco propostas por etapas, mantendo azul como cor principal e menta somente no ícone da marca. Primeiro a home. Vídeos e cards preservados. O pedido posterior de azul substitui a paleta menta integral do protótipo.

**IMPLEMENTADO:** título antes oculto agora visível; CTA respeitando visitante, conta e origem; quatro cards existentes; chamada do toolkit separada do catálogo; três atalhos (Video/Image/Audio); prova social agrupada abaixo da criação; catálogo existente preservado em três colunas. Fontes e contratos da oferta não alterados. Ícone #ABEDC9; ações #2997ff.

**FATO CONFIRMADO:** runtime modificado apenas em `app/KineoLanding.tsx` e `lib/ui/homePresentation.ts`. Regras de geração, curadoria, custo, checkout, indicação e continuação preservadas. Os novos atalhos abrem ferramentas; nenhum gera nem cobra automaticamente.

**TESTADO LOCALMENTE:** TypeScript completo, curadoria (227), checkout da home (36), indicação (72), navegação/idioma (23), locale readiness (2091) e cinco melhorias (640) passaram. Comparação renderizada do JSX real em desktop e 320/390 px, visitante/conta e alinhamento RTL. Estatísticas, saldos, efeitos e backend não são simulados como dados reais.

**QUESTÃO PENDENTE:** o teste `test-showcase-premium.mjs` da base cf0ab13e já falha ao carregar `@/lib/ui/interfaceLanguage`; a checagem do GitHub da própria main também falhou no passo Vitrine premium. Fonte: job 106875137070, execução 35765872477 em 22/09. O teste permaneceu intacto: não enfraquecer o gate para publicar esta mudança. Após reparar somente o import no diagnóstico temporário, também apareceram expectativas antigas de curadoria/posters; isso precisa de revisão própria antes de declarar a bateria completa verde.

**QUESTÃO PENDENTE:** a seção de planos preexistente transborda em espanhol a 320 px; os blocos novos de criação, provas e catálogo ficam dentro da largura. A revisão integral dos planos continua na etapa 05. Copy comercial de teste (incluindo “0 AI films”) vem da fonte existente e não foi alterada nesta etapa.

**SUGESTÃO operacional:** usar a comparação HTTPS `/home-blue/` no site de prévias. A página é estática, com pôsteres reais, e não testa geração/pagamentos. Menu, Studio, Biblioteca e planos ainda não implementados nesta branch.
