# Botão da versão completa · comparação de sete dias

**IMPLEMENTADO · 25/11, chave OFF.** Na tela de entrega, a variante troca o plano principal para Creator (SKU mensal `basic`). Starter continua disponível. O botão abre o checkout do filme guardado. Os preços são os mesmos de `lib/checkoutPricing.ts`, inclusive quando a interface mostra o primeiro mês promocional elegível. A cobrança continua a cargo das rotas existentes. As duas opções do teste levam sua variante até a página de retorno se a pessoa sair do checkout.

**EVIDÊNCIA DE PRODUÇÃO · relatório de 25/11.** Na coorte fixa de 26/10 a 24/11, seis dos sete compradores escolheram Creator. A oferta de versão completa registrou um pagamento entre 16 contas que abriram seu checkout. A preferência geral por Creator motivou o teste. A taxa de compra específica da nova tela só poderá ser medida após exposição externa. Fonte: `docs/semana-2/DO-FILME-AO-PAGAMENTO-2511.md`, seções 4 e 5.

**SUGESTÃO · leitura pela Div. 4 no sétimo dia de exposição externa.** Fixar início e término em Brasília, excluir a lista vigente de contas da casa e usar contas distintas. Registrar o tempo de acompanhamento dos pagamentos e repetir com sete dias completos de acompanhamento por conta no corte de 30 dias anterior e no teste.

1. Denominador do teste: contas com `checkout_started`, `metadata.intent_campaign = film15_full_version` e `metadata.film_offer_version = film_ready_creator_primary_2511`. Mostrar o total e os cortes por `metadata.tier` real. Uma mesma conta pode aparecer nos dois cortes e conta uma vez no total.
2. Numerador: contas desse denominador com recibo efetivo de pagamento positivo no mesmo checkout, unindo `user_id` e `metadata.stripe_session_id` do evento à venda em produção. Apresentar fornecedores separadamente se houver recibos com esquema distinto. Deduplicar reabertura da página, retentativas e webhooks. Excluir simulação, trial e clique.
3. Mostrar também quantas contas visualizaram a oferta (`film15_full_offer_viewed`, mesma versão), para dar contexto a quem entrou no checkout. O cancelamento retoma a opção original e leva o mesmo identificador de variante.
4. Para a base histórica, usar o mesmo filtro de superfície de tela e janela de acompanhamento. Os links de e-mail usam a mesma campanha; se faltar a origem histórica, separar essas contas como indeterminadas. O total histórico de 1/16 não deve ser rotulado como uma reconstrução exclusiva da tela sem esse cruzamento.

**QUESTÃO PENDENTE · espera do primeiro filme.** A seção 6 do relatório usa a data de criação de uma linha que hoje está concluída. Para separar compra durante a espera e compra após entrega, usar o carimbo de conclusão/entrega ou seu evento e mostrar quantas contas não têm esse carimbo. O relatório traz 67 e 73 contas com checkout em trechos distintos. Conservar o corte de cada extração até reconciliar as seis contas. Nenhum desses problemas altera o destino do botão.

**TESTADO LOCALMENTE.** O teste `scripts/test-versao-completa-creator-2511.mjs` cobre os dois planos nos 16 idiomas, os estados de promoção, os links históricos, a origem e a retomada com o mesmo filme. `scripts/test-versao-completa-starter-1111.mjs` preserva o contrato anterior. A prova visual usa o componente real, um filme de exemplo e sessão simulada. O aceite de produção permanece com a CEO.

