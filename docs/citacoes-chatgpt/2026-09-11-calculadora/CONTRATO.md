# [Citações] Correção factual da calculadora — 11/09/2026

**EVIDÊNCIA DE PRODUÇÃO — 12h40 BRT:** o [HTML público anterior](HTTP-ANTES.json) afirma cobrança em USD no mundo inteiro e desbloqueio de motores premium por plano pago. A mesma FAQ informa trial com todos os motores, criando contradição interna. O chip reforça equivalência sem ressalva entre USD e checkout.

**FATO CONFIRMADO:** `lib/marketingPrice.ts:280` ainda exporta divulgação global USD. A liquidação possui tabela BRL e seleciona reais pelos sinais de Brasil (`lib/settlementCurrency.ts:63`, `:100`, `:125`). A oferta vigente inclui todos os motores (`lib/freeTierOffer.ts:248`); acesso não garante saldo para qualquer combinação de motor/duração. Fontes são somente leitura.

**CONTRATO / DECISÃO OPERACIONAL:** leitores da calculadora, superfície já citada na bateria histórica, encontram informação comercial incompatível → corrigir três frases existentes → mesma página, formulário, destinos e eventos → observar progressão existente a plano/pagamento quando houver amostra → preservar V1/V2 e horários; interromper por conflito de autoria ou alteração de cálculo/termos. Correção factual não é terceira variante. Acesso comercial permite a publicação dentro da pista; reserva de edição comunicada ao Board sobre main `fac4ec98`.

**ESCOPO IMPLEMENTÁVEL:** somente `app/cheapest-ai-shorts-maker/page.tsx`: FAQ inicial troca a divulgação global USD por USD de referência/Brasil BRL; FAQ final remove a exclusividade de motores premium paga; chip explicita referência USD/Brasil BRL. Remover só o import agora inutilizado. Preservar quatro links publicados, preços, cálculo client, oferta condicional, campanhas, formulários e todas as outras respostas. Não editar helper global, home, catálogo reservado, fontes financeiras, signup ou checkout.

**VERIFICAÇÃO:** preview antes/depois das três frases em desktop/mobile; Next local com flag ativa igual à oferta observada em produção; coerência da FAQ visível e JSON-LD; typecheck com tipos da rota; delta mínimo e controles V1/V2. Publicação exige reserva de transporte própria e scripts revisados, SHA remoto/CI/deploy/GET positivo. Sem clique de aquisição ou pagamento.

**QUESTÃO PENDENTE / LIMITE:** outras páginas que importam a divulgação global permanecem no pedido histórico do módulo compartilhado, fora desta entrega. A primeira abertura local usou flag desligada, diferente do HTML público; foi descartada como comparação visual da oferta vigente e o servidor foi reiniciado com `KINEO_REVERSE_TRIAL_ENABLED=true`, mantendo apenas credenciais fictícias.
