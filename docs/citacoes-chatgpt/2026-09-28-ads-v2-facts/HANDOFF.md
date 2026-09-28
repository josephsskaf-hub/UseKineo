# Ads atual e classic nas fontes citáveis

**CONTRADIÇÃO / EVIDÊNCIA DE PRODUÇÃO — 28/09/2026 10:36:58UTC:** /ads apresenta Photo motion, Commercial e Cinema; /api/facts ainda descreve apenas os modelos35/60s e revisão humana, sem qualificar classic. Consulta própria somente leitura não conta como aquisição.

**AUTORIZAÇÃO / ESCOPO:** mandato GPT-CITACOES-TRIPLICAR-2026-09-29.md atualizado em origin/main dcd38997 para PÚBLICO, com ADS_V2_PUBLIC=true. Continuação das fontes empresariais da pista Citações, sem implementação Ads, oferta, render, checkout ou nova página. Superfícies: studioAdsFacts, llms e schema GPT; dono de publicação é o fundador.

**HIPÓTESE:** empresa com fotos próprias precisa distinguir custo e entrega do anúncio atual e do clássico para escolher entre assinatura e passe. Mudança mínima reversível: projetar v2 com custos da fonte única e clássico em /ads/new?classic=1; benefícios clássicos não se estendem ao v2. Coorte = compradores externos que consultam essas fontes. Eventos existentes e transações canônicas; nenhuma UTM ou medição nova. Sucesso comercial permanece DESCONHECIDO; amostra só após deploy validado, até23UTC, sem causalidade presumida. Parar por conflito de fonte/dono, teste, fila ou corte.

**FATO CONFIRMADO / IMPLEMENTADO:** lib/growth/studioAdsFacts.ts deriva duração/fotos de v2Screen/v2Contract e custo/capacidade de v2Tiers/offer. O campo v2 fica null com flagfalse; desligar o passe remove o fato inteiro como antes. Campos legados do passe continuam; modelsScope identifica os modelos como classic. Clássico preserva sua própria descrição/benefícios. Roteamento continua separando self-service e serviço humano Empresas.

**TESTADO LOCALMENTE — 28/09 10:40UTC:** tsc --noEmit --incremental false exit0. Ads AEO41, GPT Loja33, fatosV31 40 e orientação paga30 verificações aprovadas. Ads AEO executa as rotas reais JSON/llms com gate ligado/desligado, acesso por plano e alteração controlada do custo canônico: a mudança aparece nas duas fontes, sem prometer capacidade que o passe não cobre. Teste integrado ao CI; CI remoto ainda não observado. Sem alteração visual, preview de layout não se aplica.

**ESTADO DESTE HANDOFF:** candidato LOCAL testado; fila e publicação devem ser registradas separadamente no diário/checkpoint após cada confirmação. Não prova leitura pelo GPT, citação, chegada ou compra. Candidatos visuais Seedance8ee6483c e pontesa0db28df não integram esta entrega.
