# Escada universal + Empresas por caixa de prompt — mesa de decisão (25/09/2026)

Pedido do fundador (25/09, ~04h BRT, alinhando com o GPT): "começar a trabalhar no For Business já com a caixa de prompt, igual a gente faz nos vídeos — mais intuitivo, mais rápido, sem cara de site de trabalho tipo Upwork. Automatizar tudo, com elegância. Créditos universais. Me relembra a questão dos degraus de preço pra a gente definir de uma vez por todas."

Método: painel de 11 agentes (1 extrator de fatos do código, 3 propostas por lente — margem, mercado, fundador —, 6 céticos (contas e produto) e 1 síntese). Todo número refutado foi descartado ou marcado ESTIMATIVA. Base: escada B-ajustada aprovada em 25/09 (docs/DECISIONS.md) e a pesquisa da Research (25 concorrentes).

**Nada muda antes de 09/10/2026 (congelamento). Preço público é decisão do fundador; isto é proposta.**

## As 3 opções

| Linha | A — B-ajustada como aprovada (25/09) | B — B-ajustada UNIVERSAL · RECOMENDADA | C — Universal radical (só barra) |
|---|---|---|---|
| Planos (preço/créditos) | Starter 10,90/60 · Creator 24,90/150 · Studio 49,90/320 | idem A (a escada não muda) | idem A |
| US$ por crédito | 0,182 · 0,166 · 0,156 (degraus −8,6% e −6,1%) | idem | idem |
| Margem pior motor — coluna 1: Kineo 1 0,126 + Stripe EUA (números da pesquisa) | 26,5 · 20,8 · 16,3% (Studio c/ 2 Enhance: 11,3%) | idem; anúncio dentro do crédito não piora (ESTIMATIVA 0,09–0,11/cr; teto medido 0,156) | idem |
| Margem pior motor — coluna 2: Seedance all-in 0,132 + Stripe BR (ESTIMATIVA P×0,92−0,07, taxa nunca medida) | ~20 · ~13 · ~8% (Studio c/ 2 Enhance ≈ 3%) | idem; Studio c/ 1 Enhance ≈ 5% | idem |
| Anúncios por mês (60 s / 35 s) | 12/20 · 30/50 · 64/106 — só assinante ou passe; trial fora | idem + quem comprou na barra (crédito pago) + trial 1 c/ marca d'água (se SIM) | idem B |
| Anual | 11× OU 1 Enhance (aprovado) — no Studio não basta: 11× com 2 Enhance = 3,8% | 11× nos três (119,90 · 273,90 · 548,90) E Studio com 1 Enhance → 21,9 · 14,6 · 6,5% (col. 2: Studio ≈ 0, esconder se o Seedance confirmar 0,132) | idem B |
| Barra | piso 0,169 (50→9,90 · 100→19,90 · 300→57,90 · 1.000→168,90); packs seguem ao lado | piso 0,169 e ÚNICA escada de avulso: bulk10/20/30/50, pack 4,90/30, topups saem da vitrine (SKUs ficam no webhook) | idem B; é também a única porta sem assinatura |
| Express / Pro | seguem: US$35/75, briefing, 48/72 h — o "pedir aqui" (0 vendas, hello@ sem dono) | MORREM como SKU, só DEPOIS da caixa de prompt no ar; humano volta só ≥ US$99 com dono nomeado | morrem de vez, sem concierge |
| Passe Studio Ads | 19,90/60 cr = 0,332/cr (2× o Starter; 0 vendidos) | 19,90/100 cr = o ponto de 100 cr da barra (0,199/cr, 33,8%; 20 anúncios de 60 s) — nome fica, escada não | morre; barra a partir de 50 cr (9,90) assume; alarme do fundador muda de lugar |
| Porta do Studio Ads | passe ou plano da lista | qualquer crédito pago (has_paid) + saldo ≥ custo; trial 1 anúncio c/ marca (se SIM) | idem B |
| Sobra de "Upwork" | sim (brief + espera + e-mail) | zero: caixa → 0–1 pergunta → MP4 em minutos | zero |
| Risco principal | 4 escadas de US$/cr, passe 2× o Starter, promessa humana sem dono | tudo depende da caixa estar no ar (código novo em 3 pistas) e o Studio Ads nunca foi usado por cliente externo | perde "sem assinatura, 12 meses", a página /ads e o único alarme; porta vira US$9,90 uma vez |

## Recomendação

Opção B. A escada da B-ajustada fica exatamente como você aprovou (10,90 · 24,90 · 49,90 por 60 · 150 · 320) — é a única que segue positiva mesmo no cenário ruim (Seedance a 0,132 + taxa de Stripe brasileira). O que "Empresas por caixa de prompt + crédito universal" muda nela é só tirar o balcão: Express/Pro saem (0 vendas, sem dono, cara de Upwork), o passe vira o ponto de 100 créditos da barra (uma escada só, o nome pode ficar) e a porta do Studio Ads passa a ser "tem crédito pago", não "está na lista". Anual 11× nos três — 10×/10×/11× inverte a escada (Studio anual sai mais caro por crédito que o Creator anual) — e Studio com 1 Enhance grátis, não 2. Ordem obrigatória de execução: renovação e tabela BRL consertadas → caixa de prompt no ar → links do Express/Pro mortos. Duas medições antes de 09/10 decidem se a manchete de margem é 26/21/16 ou 20/13/8: um repasse real da Stripe e a fatura de setembro do Seedance.

## O anúncio pela caixa de prompt dentro do crédito universal

Regra de uma frase: anúncio custa o crédito do motor e da duração — não existe "preço de anúncio". Kineo 1: 35 s = 3 cr, 60 s = 5 cr (já é o que /api/ads/render cobra hoje). No Starter isso é US$0,55/0,91 por anúncio; no Studio US$0,47/0,78; na barra/passe US$0,60/1,00.
Custo nosso: ESTIMATIVA US$0,33 (35 s) / 0,46 (60 s) pela soma corrigida = 0,111/0,091 por crédito, abaixo do filme (0,126) — mas a única medição real (3 anúncios de vitrine, 9 cr, US$1,00–1,40 = 0,111–0,156/cr) inclui anúncios "de 35 s" que rodaram 37–46 s, e nenhum de 60 s foi renderizado. Por isso o 35 s fica em 3 cr com GATILHO: 20 anúncios medidos (10×35, 10×60, ao menos 5 de conta externa) antes de 09/10; média acima de US$0,38 → 4 cr (o filme Kineo 1 de 35 s vai junto).
O que a caixa ainda pergunta além do texto: logo + 2–6 fotos (obrigatório por modelo), confirmação de CONTATO e OFERTA (o validador aceita como fato tudo que estiver no brief), o carimbo de direitos sobre as fotos, e o idioma quando o detector não reconhece (10 das 16 línguas). Motor melhor no anúncio (Seedance 15/25 cr, Presenter 41/70 cr) é fase 2: o preço já existe no código, o pipeline não.

## Decisões de uma palavra (fundador, em ordem)

1. Escada 10,90 / 24,90 / 49,90 por 60 / 150 / 320 em 09/10: SIM ou NÃO?
2. Starter 10,90: DIRETO (conta nova, regra de parada no deploy) ou TESTE (blocos de 14 dias)?
3. Express/Pro: MATAR (só depois da caixa no ar) ou MANTER?
4. Passe 19,90: CEM (100 cr = ponto da barra, nome fica) ou BARRA (some)?
5. Studio Ads abre para qualquer crédito pago (barra/pack), não só plano: SIM ou NÃO?
6. Anual: ONZE (11× nos três) ou ESCONDER (até medir Stripe BR e Seedance)?
7. Enhance grátis no Studio: UM ou DOIS?
8. Piso da barra 0,149 → 0,169: SIM ou NÃO?
9. Anúncio de 35 s: TRÊS, QUATRO ou GATILHO (20 anúncios medidos)?
10. Revisão humana do 1º anúncio em 24 h: NOME (do dono) ou SOME (da copy e do teto)?
11. Trial faz 1 anúncio com marca d'água: SIM ou NÃO?
12. Packs, pack 4,90 e topups fora da vitrine (só barra): SIM ou NÃO?
13. Pagantes atuais ficam no preço antigo: SIM ou NÃO?
14. Motor no anúncio (Seedance / Presenter): AGORA ou DEPOIS?
15. Nome da porta: EMPRESAS ou STUDIO ADS?

## O que os céticos derrubaram (e vale como correção da pesquisa)

- "Margem no pior motor" com 0,126: é a MÉDIA de 12 filmes de 41 s, não o pior. O código guarda Seedance all-in 0,132/cr (fatura de agosto, motor aberto a todo plano), Kineo 1 de 35 s ≈ 0,130–0,136 e Enhance de 90 s 0,18. Margens vão à mesa em duas colunas.
- Líquido Stripe = P×0,971−0,30 é a tabela dos EUA; a conta é brasileira, 9 de 11 compradores fora dos EUA, taxa nunca medida. ESTIMATIVA P×0,92−0,07 tira 2,5–5 pp de cada linha.
- Anual 10×/10×/11× inverte a escada: Studio anual 549/3.840 = 0,143/cr fica MAIS CARO por crédito que Creator anual 249/1.800 = 0,138. Só 11× nos três passa. E Studio 11× = 548,90, não 549.
- Studio com 2 Enhance = 11,3% (não 11,9 — método errado); anual 11× com 2 Enhance = 3,8%. "11× OU 1 Enhance" não basta no Studio: é E.
- "renewalCreditsFor já protege quem assinou antes": falso para o Studio V5 — com pro = 4990, quem paga 39,90 cai na tabela LEGACY V6 e renova com 180 cr, não 300. Precisa de tabela por valor pago antes de tocar em TIER_PRICES.
- Tabela BRL é fixa (R$49,90/99,90/199,90) e o invariante exige BRL = fórmula do USD: guardião test-moeda-local fica vermelho, o Brasil não veria a subida e o Studio BR também cairia a 180 cr.
- "Guardião de 24%" não existe: o invariante só reprova líquido < custo (piso zero), com FAST 0,066 e H3 0,116 velhos. Tem que CRIAR o piso, não alimentá-lo.
- Custo do anúncio 0,30/0,41 contava TTS/Whisper/GPT em dobro (já vivem no 0,22/0,33). Soma literal 0,334/0,456 → 0,111/0,091 por cr — conclusão sobrevive, número não. Única medição: 3 anúncios, 9 cr, US$1,00–1,40 (0,111–0,156/cr), e 3 dos 4 renderizados passaram de 35 s (44, 46, 37 s). Anúncio de 60 s: nunca renderizado.
- "Passe 60→100 é uma constante": são 1 constante + 3 asserts do guardião test-ads-fundacao + comentário + reversão de decisão sua de 24/09; e 100 cr da barra já custa 1990 centavos = o passe (só a metadata distingue).
- "Qualquer avulso ≥ 50 cr abre o Studio Ads" faz a porta custar US$9,90 UMA vez (menos que o Starter mensal); e o pack 4,90/30 cr (0,163/cr) está LIGADO no desbloqueio de marca d'água — 10 anúncios por US$4,90 se has_paid abrir sem tratar.
- "A 1 revisão do Express já existe de graça no Studio Ads": existe um botão nunca clicado (0 na história, 4 pedidos do fundador vencidos na fila), sem alerta (só a compra do passe alerta o fundador), sem re-render, sem e-mail, e o teto de 5 revisões FECHA o botão de compra do passe.
- "Caixa de prompt: só pode faltar o contato": os 8 modelos exigem 1–3 campos extras, consentimento obrigatório, logo + 2–6 fotos; storyboard e cartão final são gestos no navegador (canvas, sem lib de imagem no servidor); idioma detecta 6 de 16; o validador de número/contato não roda no render; a regra de auto-modelo nunca escolhe 60 s; /ads/new?prefill não existe e sem acesso o texto se perde no redirect.
- "Entrega imediata": 'delivered' só é gravado quando a TELA do cliente consulta; aba fechada = pedido preso, fora da fila, sem cron e sem e-mail de pronto.
- Studio Ads nunca foi usado por cliente externo: 4 pedidos, 1 conta interna, 0 passes, 0 Express/Pro, 0 briefs. "Já entrega o escopo do Express" é validação da casa.
- Matar Express/Pro zerando as urls apaga o cartão inteiro do Studio — e o link para o Studio Ads mora dentro dele. Faltam 6+ superfícies (ads/page.tsx, business-video-ads, llms.txt, kineoFacts, StudioClient, admin). DFY_MAX_OPEN_ORDERS = 3 só é exibido, não aplicado.
- Trial com marca d'água: a marca mora no compose (não no render); o gate tem de ser por trial ATIVO (free com trial vencido cai no clamp de 15 s + cota semanal e corta a batida do contato); a marca é 'usekineo.com/free' em cima do negócio de terceiro; 10 cr = 3 anúncios, não 1.
- Presenter/Seedance no anúncio "pela mesma fórmula": preço existe, pipeline não (rota própria, sem consentimento de semelhança nem moderação de rosto); 3,37 é só o modelo; 'same characters' no Seedance não provado.
- Inventário de avulsos incompleto: além de packs e passe há pack 4,90/30 (vivo), starter290 2,90/25 (dormente, 0,116/cr — abaixo do custo) e topup40/100/120 (vivos no checkout/webhook/modal).
- "Studio Ads incluso em todos os planos" não é decisão nova — já é assim (access.ts). "Creator 0,3% mais caro que o Studio" está invertido. "~100% de consumo" do Studio foi medido em 2 contas de 180 cr, não serve para 320. VEED US$25 não serve de âncora (USD não confirmado). Cartão final 'no idioma' só em 8 de 16 línguas.

## O que muda no código depois do "vai" (ordem de execução)

- ANTES de qualquer commit (medições, não código): 1 repasse real da Stripe (Balance → Payouts, 2–3 vendas em USD com cartão estrangeiro) para fixar a taxa desta conta; fatura fal de setembro ÷ renders cinematic_ai para fechar o custo all-in do Seedance; 20 anúncios isolados (10×35 s, 10×60 s, ≥5 de conta externa) com duração renderizada e custo por componente.
- lib/checkoutPricing.ts — PRIMEIRO renewalCreditsFor: LEGACY por valor pago (3990→300, 2900→180, 1990→150, 990→60) + guardião que percorre os amountPaid históricos. SÓ ENTÃO TIER_PRICES 1090/2490/4990, TIER_CREDITS pro 300→320, ANNUAL_PRICES 11990/27390/54890. Mesmo commit: FAST/WORST_CASE → max(custo/cr) medido (0,126 ou 0,132), worstCaseCogsUsd reescrito como max(custo/cr)×créditos (WORST_ENGINE_CREDITS=45 sai), CRIAR piso mínimo de margem por SKU (24%) somando 1×1,20 de Enhance no Studio; exceção nominal para grandfathered (V6 US$29/180).
- lib/settlementCurrency.ts — BRL_PLAN_PRICES_MINOR → R$54,90/124,90/249,90 pela fórmula usdToBrlMinor (+ anuais); reancorar scripts/test-moeda-local-2026-09-09.mjs:45; decidir passe em BRL.
- lib/credits/creditSlider.ts:20 — RATE_FLOOR 0,149→0,169; mutante da linha 77 de scripts/test-barra-de-creditos-2026-09-23.mjs acompanha; guardião compara contra CADA plano (não só CHEAPEST_PLAN); grep pelo valor '0,149'/'0.149' em toda copy pública.
- lib/ads/offer.ts — ADS_PASS_CREDITS 60→100 (ticket 1990 fica) + comentário :36 + os 3 asserts de scripts/test-ads-fundacao-2026-09-25.mjs (:27-28, :35, :43) + registrar no cabeçalho a reversão da decisão de 24/09; guardião de colisão de centavos passa a varrer os degraus da barra (1990 = barra 100 cr, resolução só por metadata.pack); sessões de checkout abertas antes do deploy entregam 60.
- lib/ads/access.ts — porta 'credits': has_paid === true OU plano pago; ADS_ACCESS_SELECT lê has_paid; ads_access_until deixa de ser porta (fica só para honrar passes já vendidos); pack 4,90/30 e starter290 tratados (chip da barra ou morrem) para a porta não custar US$4,90; alinhar o predicado de marca d'água do compose (:3047-3051), que hoje não lê has_paid. Trial (se SIM): porta por trial ATIVO via getEffectiveEntitlement, cota de 1, confirmar a marca no caminho user_voiceover_url.
- Alarme e revisão — mover alertFounder para ads_delivered (ou cron diário lendo buildReviewQueue) ANTES de mexer no passe; retirar a promessa de revisão humana de offer.ts:80/:147, AdsWizardClient.tsx:87/2596, app/ads/page.tsx:45/251, business-video-ads/page.tsx:57 E desligar ADS_MAX_OPEN_REVIEWS/countOpenReviews (app/ads/page.tsx:94-115,173) — ou dono nomeado + re-render + e-mail ao cliente.
- Finalizador no servidor — cron que fecha ads_orders 'rendering' → 'delivered' quando videos.render_id existe + e-mail 'seu anúncio está pronto' (dar escritor ao ads_email_sent); 'Request a change' vira POST gravado no servidor e visível no /admin/ads, não mailto.
- Caixa de prompt (servidor = Claude, visual = Codex) — rota /api/ads/brief-from-prompt (gpt-4o-mini → AdsBrief + modelo, padrão AUTO-STRUCTURE #310); tela de confirmação de CONTATO e OFERTA antes do roteiro; extraFields dos 3 modelos-porta viram opcionais em models.ts + scriptPrompt; regra de auto-modelo inclui um 60 s; idioma: perguntar quando detectNarrationLanguage devolver null; storyboard round-robin + cartão desenhado e subido sem clique (código novo no cliente); inventedNumbers/contactOk rodam no render sobre as batidas finais; rascunho gravado via POST /api/ads/orders antes de qualquer redirect; ADS_SCRIPT_DAILY_CAP 20→10 e ADS_VOICE_PREVIEW_DAILY_CAP 40→20. Critério de aceite: parágrafo + logo + fotos → roteiro sem responder mais de UMA pergunta.
- Medição do anúncio — estender ads_render_requested (chars do TTS, segundos da linha do tempo `total`, música sim/não), não evento novo; gatilho 09/10: média de 10 anúncios de 35 s > US$0,38 → 4 cr (e o filme Kineo 1 de 35 s junto). Dizer na mesa que é tarifa unitária × medida, não fatura.
- Express/Pro (só depois da caixa no ar) — (1) DfyOfferCard passa a existir por adsPassLive(); (2) copy 'Make this ad now →' → rascunho → /ads/new; (3) DFY_TIERS urls → '' com linkIds em DFY_LEGACY para o webhook; (4) varrer app/ads/page.tsx:154,161,187,292-294, business-video-ads/page.tsx:31-35,57,69,70, app/llms.txt/route.ts:358-363,482, lib/kineoFacts.ts:1233/1295, StudioClient.tsx, admin/ads seção Empresas, dfyServiceFacts.ts:19; guardião 'nenhuma frase pública com human editor / Human-operated / made for you'; fundador desativa os 2 Payment Links na Stripe (desativar, não reprecificar); 4 rascunhos aos leads reescritos com a porta self-service.
- Avulsos — BULK_PACKS, PACK starter 4,90/30, starter290 e TOPUP_PRICES saem da vitrine (chips da barra ou morrem); SKUs ficam no webhook; guardião 'nenhum one-time fora de sliderPriceUsdMinor' varre TOPUP_PRICES e PACK_CREDITS; reconferir AMBIGUOUS_ONE_TIME com os anuais novos.
- Enhance — 2→1 grátis/mês no Studio (app/api/enhance/route.ts:104-126) e/ou proporcional à duração (15 cr a 90 s); guardião do Studio soma o Enhance.
- /pricing e /ads — 2 blocos: 'Assinar' (3 planos, 'Studio Ads incluso', 'N anúncios ou N filmes') + 'Créditos avulsos' (barra com o ponto de 100 cr etiquetado); FAQ 'crédito comprado não some na renovação' (nunca 'never expire'); CTA_LABELS do cartão final 8→16 línguas ou não prometer 'no idioma'.
- Admin — contador semanal passe × Starter × barra-50 (canibalização) e checkout_started por 100 cadastros por degrau, cortado no deploy da virada (marco, nunca 'últimos N dias').
- Stripe (fundador) — Prices novos dos 3 planos + anuais criados antes do deploy (env nova só vale em deploy novo); 2 Payment Links desativados no dia da virada.
- Opcional, +2 pp em todo Kineo 1: cache de trilha Lyria por humor (0,08 → ~0,01 por filme/anúncio) em lib/lyriaMusic.ts.

