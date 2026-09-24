# Studio Ads — placar do juiz, decisões e resumo

> Saída bruta de um agente do workflow `studio-ads-pesquisa-e-plano` (24/09/2026 ~05h-06h BRT), guardada porque "o que só existe no chat some". Fatos com URL foram lidos naquele momento; file:line conferidos em `C:\kineo-wt\analise-0923` na main ed065b91. Origem: juiz.

# decisions
- 1. NOME: recomendo 'Studio Ads' (casa com /studio e com o tier Studio; upsell vira geografia). Alternativas: 'Kineo Ads' ou 'Kineo for Business'. Define título da página /ads, nome do SKU na Stripe e assunto do e-mail.
- 2. PREÇO/ACESSO (3 opções, centavos livres de colisão no webhook): (a) Passe Studio Ads US$19 = 1990 c + 60 cr (12-20 anúncios; margem 42-79% no pior caso, >85% no uso real de 2-4 anúncios) · (b) Passe US$29 = 2900 c + 100 cr (margem 38-76% pior caso) · (c) Por anúncio US$9 = 1200 c com 12 cr (2 renders; margem ~88%). RECOMENDAÇÃO: (a) — é literalmente 'paga para entrar', cabe nos 6 pedidos de Índia/Nigéria, e a recarga já existe pelo top-up de créditos. Código sobe com ADS_PASS_LIVE=false até a sua palavra.
- 3. QUEM ENTRA SEM PAGAR O PASSE: recomendo assinante pago (plan starter/basic/pro, via isPayingProfile) entra de graça; trial NÃO (trial é treatAsPaid mas não pagou). Alternativa: só quem compra o passe.
- 4. DEGRAUS DO DIA 1: só Kineo 1 (3 cr/35 s · 5 cr/60 s, mídia real, sem rótulo de IA na Meta). Semana 2: 'Product' = Seedance 1.5 i2v por foto (custo US$0,13/cena; sugiro 8 ou 10 cr por cena) e 'Presenter' = Kling Avatar v2 (70 cr). Faixas por DEGRAU, nunca por país (V6 morreu 19/08).
- 5. QA HUMANO: recomendo entrega IMEDIATA + revisão humana pós-entrega do 1º anúncio de cada empresa em até 24 h (tela diz isso; fila /admin/ads com teto de 5 pedidos abertos fecha sozinha). Alternativa: QA bloqueante antes do e-mail (mais seguro, exige plantão nomeado e converte menos). Em ambos: QUEM opera — você ou eu pela fila?
- 6. CONSENTIMENTO: dia 1 = checkbox obrigatório no passo Mídia ('I own or have rights to these files; people shown agreed') gravado como evento ads_consent_given. Semana 2 = aprovar texto do atestado de rosto (reaproveitar o do Avatar Studio) e de voz (novo), regra de recusa (pessoa pública/terceiro = operador recusa e estorna) e o aviso do rótulo 'Made with AI' antes do render com apresentador.
- 7. TRAVA 8.2 (lib/compose, generate-video-fast): 'vai' nominal para (1) piso de 20 s no roteiro próprio, (2) legendas fora da banda de 35% da UI de Reels, (3) vídeo do cliente com áudio original baixo sob a narração, (4) logo persistente no canto? Sem 'vai', o dia 1 sai com 35/60 s, vídeo mudo, legendas onde estão e logo só no cartão final — e a tela diz isso.
- 8. TERCEIRO BOTÃO NO CARTÃO DFY: manter Express US$35 / Pro US$75 ao lado do 'Do it yourself in Studio Ads' (recomendo sim: o balcão vira 'quer que a gente faça?' e topo da escada) ou o self-serve substitui o Express?
- 9. E-MAIL AOS 11 LEADS (5 Índia, 1 Nigéria, 5 EUA/EU/Jordânia): rascunho no Gmail no dia 25, envio no dia 26 só depois do 1º render limpo em produção, com o cartão final montado com o nome deles (isca = filme pronto sobre o tema que a pessoa já fez). Aprovar o rascunho.
- 10. COMPRA DE TESTE REAL: você faz 1 checkout real do passe às ~20 h (webhook → ads_access_until → e-mail; estorno pela Stripe depois) ou basta conta interna? Recomendo real — 'env nova só vale em deploy novo' e o dinheiro é a única prova.
- 11. CLIQUE DE PUBLICAÇÃO: SUBIR-SITE.bat às ~19h30 quando eu avisar 'hora de clicar', com o HTML antes/depois anexo. Nada de e-mail para cliente real antes do seu 'vai'.

# scorecard
Critérios (1-5): (i) cabe em 1 dia com blocos existentes · (ii) vende para os 11 pedidos reais · (iii) honestidade · (iv) risco técnico/legal · (v) mede o que importa.

PLANO A — "vende amanhã" (página /ads + wizard 6 passos + QA humano no 1º anúncio)
(i) 3 · (ii) 4 · (iii) 4 · (iv) 4 · (v) 5 = 20/25
+ Porta pública que vende sem login; 3 portas de entrada; checkout/webhook desenhados sobre o Path A com fail-closed (conferido: profileUpdate + RetryableEntitlementError); lista fechada de eventos com order_id; critério de 48 h.
− Carga do Codex (página pública + 6 passos + /admin/ads em 1 dia) é o gargalo; modelos de 15-20 s não têm porta na rota fast (floorSeconds:35 em generate-video-fast/route.ts:948, não citado); injetor de cartão final no JSON do Creatomate é o item mais arriscado do dia; "QA humano em 24 h" exige plantão que ninguém nomeou.

PLANO B — "produto real em 1 dia" (modo Ad dentro do /studio, entrega sem QA bloqueante)
(i) 4 · (ii) 3 · (iii) 5 · (iv) 3 · (v) 4 = 19/25
+ Único que leu o piso de 35 s e o `y:'6%'` do logo caindo dentro da banda de 14%; mapeamento por scene_id; estado no servidor; combinatória honesta; camada de marca idempotente no /api/render (POST confirmado em render/route.ts:328).
− Porta só pós-login no cockpit ("oferta anunciada só para quem já chegou"); hook em GenerateClient de 22.656 linhas com a cortina (risco real); zero olho humano antes do anúncio chegar numa empresa; sem /admin, leitura de problemas por SQL.

PLANO C — "diferenciação" (produto em i2v, dono apresenta, voz clonada; beta de 3)
(i) 2 · (ii) 3 · (iii) 3 · (iv) 2 · (v) 4 = 14/25
+ Cartão final em <canvas> → PNG → última cena via /api/footage: zero injeção, zero trava, fidelidade 100% (melhor ideia técnica dos três); consentimento vira evento; semana 2 com custos por peça; teto de pedidos abertos reaproveitado.
− Rota nova de i2v + canvas + consentimento + fila + 7 telas não cabem em 1 dia; dois fatos errados (avatar verbatim aceita 3-90 s em generate-avatar/route.ts:246-253; compose já aceita use_cloned_voice em compose/route.ts:434-437); rosto/voz/rótulo "Made with AI" da Meta e i2v que deforma produto são o maior risco legal e de reputação; beta de 3 não é "vender amanhã".

VEREDITO: base = A (porta, acesso, eventos) · correções e moldes = B (35/60 s, scene_id, camada de marca fora da trava, copy do que não sai) · cartão final em canvas + consentimento como evento + roteiro da semana 2 = C.

# summary
Julguei os três planos com as citações conferidas no código: A (vende amanhã) 20/25, B (produto real, só blocos existentes) 19/25, C (diferenciação: i2v, avatar, voz) 14/25. Fundi: porta e acesso de A, correções e moldes de B, cartão final em canvas e roteiro de semana 2 de C.
O Studio Ads do dia 1 é: página /ads → passe único (SKU ads_pass pelo checkout one-time, Path A do webhook, coluna ads_access_until fail-closed) → /ads/new em 6 passos (brief, mídia, modelo, roteiro com prévia de voz, storyboard, render) → Kineo 1 com a mídia real do cliente, cartão final desenhado no navegador e pinado à última cena, entrega imediata + revisão humana pós-entrega do 1º anúncio.
Fatos que corrigem os planos: a rota fast tem piso de 35 s (:948) — 15-20 s não sai no dia 1; o injetor no JSON do Creatomate é dispensável (canvas resolve o cartão sem trava); o Avatar em verbatim aceita 3-90 s e o compose já aceita voz clonada — semana 2 é mais barata do que C supôs.
Riscos maiores: migration antes da 1ª venda; MOV HEVC do iPhone nunca testado; plantão da fila; Codex com 6 passos + página + admin num dia; GenerateClient de 22.656 linhas (por isso a rota /api/ads/render monta o payload no servidor e NÃO toca o GenerateClient).
Preço não decidi: 3 opções com margem; recomendo passe US$19 + 60 cr, código sobe desligado até a sua palavra. 11 decisões suas estão numeradas no fim do documento.
Documento pronto em doc_markdown para virar docs/STUDIO-ADS-DIA-1-2026-09-25.md.
