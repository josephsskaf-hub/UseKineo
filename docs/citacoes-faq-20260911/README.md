# [Citações] Correção de três FAQs de motores

**IMPLEMENTADO · 11/09/2026.** Patch isolado sobre `f6e4e3e69b4d87e94789575dfdd155074019d3b7`, branch `codex/citacoes-faq-20260911`. Somente as respostas `kling.faq[0]`, `veo.faq[0]` e `seedance.faq[2]` foram alteradas em `lib/growth/enginePageCatalog.ts`. O import direto de preço e a constante `STUDIO_USD` ficaram sem uso e foram removidos.

**FATO CONFIRMADO.** O grant exibido vem de `TRIAL_CREDITS_SHOWN` (`lib/freeTierOffer.ts:172`). Custos e duração usam `creditsPerReferenceVideo` e `MARKETING_REFERENCE_SECONDS` (`lib/marketingPrice.ts:86`). A cobertura é calculada com `trialFilmsForEngine` (`lib/freeTierOffer.ts:203`), sem congelar a relação entre o saldo e o custo.

**FATO CONFIRMADO · fontes lidas em 11/09/2026.** O trial atual tem 30 créditos; a referência de 60 segundos custa 25 em Seedance, 50 em Kling e 100 em Veo. A primeira cabe no grant; as outras duas não. `lib/entryPolicy.ts:33` desliga a entrada com cartão, e `lib/enginePlanGate.ts:19` coloca a exigência de Studio após 2099. Acesso ao motor e saldo suficiente são condições diferentes. A política de marca d’água está em `lib/kineoFacts.ts:673`; `/llms.txt` separa acesso e cobertura em `app/llms.txt/route.ts:122`.

**IMPLEMENTADO.** As três respostas explicam entrada sem cartão, motores desbloqueados, custo por referência, saldo necessário e download limpo com plano pago. A resposta comparativa de Seedance troca avaliações subjetivas por custo e adequação ao orçamento. Não se alterou oferta, preço, política de acesso, outra FAQ, tier, intro, CTA ou rota.

**TESTADO LOCALMENTE.** `node docs/citacoes-faq-20260911/verify-and-preview.cjs` passou com 12 checks: catálogo avaliado antes/depois com `S25_PUBLIC` falso e verdadeiro, igualdade de todos os campos exceto as três respostas, fixtures de crédito/cobertura, acesso atual, restrições antigas removidas, fontes protegidas intactas e renderização da seção real de FAQ. Foram zero tentativas de rede e zero vídeos gerados. Horário e hashes: [verification.json](verification.json).

**TESTADO LOCALMENTE.** `node C:/kineo/node_modules/typescript/bin/tsc --noEmit --incremental false` terminou com código 0. Incluiu os tipos Next disponíveis copiados apenas para esta worktree: layout, página dinâmica de motores, eventos, checkout/resume e comparação InVideo, além de `package.json`. Não foi feito build nem geração completa de tipos.

**IMPLEMENTADO.** [preview.html](preview.html) mostra as três FAQs antes/depois, desktop de 1100 px e mobile de 390 px. O gerador extrai o JSX e os estilos da seção real na rota intacta; não importa nem executa seu carregador de mídias. O HTML contém tudo para a visualização local, sem rede ou servidor. A cópia antiga aparece somente no lado histórico.

**QUESTÃO PENDENTE.** Os campos `tier`, intros e demais textos legados ficam fora deste patch delimitado; não se declara saneamento completo das páginas. A raiz fará QA no Next real e os gates da integração. Não houve publicação, enfileiramento, push, mudança em PEDIDOS ou checkpoint; transporte segue com o Board.
