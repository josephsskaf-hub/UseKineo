# Handoff Codex → Claude — rodadas 165–166

**Data:** 2026-09-01  
**Workstream:** Growth / B2B descoberta → proposta → checkout → pagamento  
**Base auditada:** `1cc3fae8dbbf824cd070d06153ec668213a7be2b`

## Rodada 165 — caminho empresarial por entrada

**EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT em 2026-09-01; janela de sete dias; contas internas excluídas):** `agency_volume_bridge_viewed` permanece em 19 eventos, distribuídos entre cinco pessoas identificadas e 13 sessões anônimas. Não se somaram essas unidades como “18 pessoas”. Por entrada, os pares ator×entrada foram: `home=5`, `pricing=5`, `cost_page=4`, `state_report=4`, `kineo1_engine=1`. Nenhum par teve `agency_volume_bridge_clicked`, chegada posterior à página de agência, intenção de checkout ou pagamento.

**EVIDÊNCIA DE PRODUÇÃO:** o denominador complementar `pricing_business_path_viewed` registrou cinco exposições externas — quatro pessoas identificadas e uma sessão anônima — e zero `pricing_business_path_clicked`. Ele mede o mesmo bridge de agência na página de preços; não é uma segunda audiência e não pode ser somado ao evento geral.

**FATO CONFIRMADO EM CÓDIGO:** `components/PricingBusinessPathTelemetry.tsx:45-77` observa o alvo real com `IntersectionObserver` a 50%, delega o clique somente para o destino permitido, espera `trackEvent` confirmar gravação e deduplica por sessão e memória. O evento é mais forte que um mount, embora ainda não exija aba visível ou dwell. `app/pricing/PricingClient.tsx:1144-1147` mostra que o alvo é exatamente o `AgencyVolumeBridge entry="pricing"`; `lib/growth/pricingBusinessPath.ts` fixa o destino em `/ai-shorts-for-agencies?entry=pricing#agency-pack-heading`.

**GATE PRESERVADO:** o gate aprovado é 20 atores externos **por entrada**. `pricing` está em `5/20`; as demais entradas também estão abaixo. **NO-GO** para nova copy, CTA, landing, ponte, proposta ou checkout B2B.

## Rodada 166 — verdade monetária B2B

**FATO CONFIRMADO EM CÓDIGO / USD:** o caminho B2B está coerente com a decisão USD-only. `app/ai-shorts-for-agencies/page.tsx` deriva valores de `BULK_PACKS`, declara `priceCurrency: 'USD'` no dado estruturado e informa no FAQ que os packs são compras únicas em USD. `AgencyPacksClient.tsx` repete “paid once in USD”, e os eventos de pack/retomada usam `currency:'usd'`. Não foi encontrada promessa de moeda local nessas superfícies.

**FATO CONFIRMADO EM CÓDIGO / tipo de receita:** o produto empresarial público é deliberadamente avulso. `lib/growth/businessOfferFacts.ts` declara `purchaseType:'one_time'` e `subscriptionRequired:false`; a página e os cards dizem “no subscription” e “no recurring contract”. Portanto `bulk_purchase_completed` é receita B2B real, mas não é assinatura recorrente. Medir uma compra de pack como assinatura inflaria o placar.

**DECISÃO NECESSÁRIA ANTES DE QUALQUER MUDANÇA FUTURA:** se a meta estratégica passar a exigir assinatura B2B, será preciso aprovar uma oferta recorrente, entitlement, volume, preço, renovação e promessa próprios. Não existe autorização para transformar o pack atual em assinatura por copy ou reaproveitar silenciosamente um SKU de consumidor.

**ESTADO FINAL:** nenhuma alteração de runtime, preço, crédito, checkout, Stripe, banco ou render; nenhuma comunicação externa. USD-only preservado. A próxima rodada deve alternar para B2C em outra superfície, mantendo os gates ativos sem reeditar bridges subamostrados.
