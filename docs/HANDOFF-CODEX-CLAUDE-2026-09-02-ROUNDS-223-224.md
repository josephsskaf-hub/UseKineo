# HANDOFF CODEX → CLAUDE — 2026-09-02 — rodadas 223–224

**Workstream:** Growth · coorte internacional do Checkout e gate de Adaptive Pricing
**Horário das leituras:** 2026-09-02 10:59–11:12 BRT
**Escopo:** Stripe e Supabase somente leitura, agregados sem identificadores; nenhuma configuração, UI, oferta, preço, crédito, checkout, render, banco ou comunicação externa alterada

## Resultado executivo

**DECISÃO APROVADA preservada:** a Kineo lista seus preços em USD. O runtime continua USD-only e nenhuma copy local foi reintroduzida.

**RECOMENDAÇÃO ANTERIOR SUPERADA POR EVIDÊNCIA NOVA:** não desligar Adaptive Pricing agora. O handoff 221–222 registrou corretamente a contradição e propôs desligá-lo, mas a coorte internacional observada depois tornou essa execução arriscada antes de medir a moeda realmente apresentada.

## Evidência de produção

**EVIDÊNCIA DE PRODUÇÃO — Stripe Live desde 2026-08-19:** 65 Checkout Sessions observadas; 57 expiradas, 6 abertas e 2 concluídas. Todas as 65 têm adaptive_pricing.enabled = true. As duas concluídas são assinaturas pagas em moeda de integração USD. Os objetos de Session, PaymentIntent e Subscription não retornaram presentment_details.

**EVIDÊNCIA DE PRODUÇÃO — Supabase desde 2026-08-19, contas internas excluídas:** 32 pessoas externas abriram 38 Stripe Sessions de assinatura. Cinco pessoas têm país de perfil US e 27 têm país não-US. As 2 pessoas com payment_success são não-US: uma GB e uma SA. Isso não prova causalidade nem a moeda apresentada, mas contradiz a hipótese de que Adaptive Pricing impediu todos os compradores internacionais.

**EVIDÊNCIA DE PRODUÇÃO — coorte recurring_checkout_24h_v1:** 6 pessoas externas abriram 7 Sessions. Países de perfil: AZ, BR, GB, IN, JP e NG. Uma pessoa, GB, já pagou; as outras cinco Sessions ainda estavam abertas antes do prazo. Toda a coorte é não-US.

## Limites da leitura

**QUESTÃO PENDENTE / DESCONHECIDO:** last_country/signup_country descreve o perfil, não prova a localização do Checkout. currency = usd descreve a moeda de integração, não prova a moeda apresentada. Somente presentment_details do evento Stripe pode fechar essa pergunta.

**HIPÓTESE:** a consistência textual em USD pode aumentar confiança, mas a conversão local também pode reduzir fricção para a maioria internacional. Os dados atuais não separam os dois efeitos.

## Gate

**DECISÃO DE GATE:** não alterar Adaptive Pricing antes de (a) capturar presentment_details de pelo menos uma compra e uma expiração internacional, ou (b) o fundador ordenar explicitamente a mudança aceitando que toda a coorte atual é internacional. Não usar país, moeda da integração ou status da Session como substituto de presentment_details.

**B2C:** reconciliar a primeira Session madura após 2026-09-02 14:43 BRT. Se expirar, verificar o evento Stripe no Dashboard antes de editar o último metro.

**B2B:** briefing local, planner, proposta e afiliados continuam em seus gates; nenhuma nova UI foi aberta.

## Próxima ação

Após 14:43 BRT, reconciliar pessoas e receita da coorte. Em paralelo, obter no Stripe Dashboard o presentment_details do evento checkout.session.completed já pago e de uma Session internacional expirada, sem copiar e-mail, nome, ID completo ou dado de cartão para o handoff.
