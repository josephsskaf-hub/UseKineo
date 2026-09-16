# A2 — piloto comercial de ativação assistida do Autopilot Lite

Data:16/09/2026. Base:`d95c44b3`. Responsável:Board; integração:Claude; contato/antiduplicação:MMR.

## Resultado pretendido

SUGESTÃO APROVADA NA CONVERSA: acompanhar até três interessados reais, capazes de operar o próprio canal, da decisão de assinar até a primeira publicação semanal. Três é tamanho proposto do piloto, não número de clientes encontrados ou receita prevista. O piloto usa o plano existente, não cria SKU de piloto nem gratuidade.

## Produto que podemos demonstrar

FATO CONFIRMADO / IMPLEMENTADO na base: `lib/checkoutPricing.ts:118` define Autopilot Lite US$59/mês; `lib/autopilot/config.ts:88` identifica o plano semanal; `app/pricing/PricingClient.tsx:1477` tem o card e âncora `autopilot-lite`. A fonte de créditos é TIER_CREDITS, 160 nesta base. Reconferir antes de enviar material.

- Episódio automático usa Kineo1 (stock e imagens geradas quando aplicável), não Seedance/Veo automáticos. Motor e duração em `lib/autopilot/config.ts:29,42`.
- Créditos dos episódios saem do mesmo saldo: não anunciar «160 extras além dos automáticos».
- Canal conectado não prova token válido, autorização de publicação, atividade pública recente ou interesse comercial.
- Não prometer viralização, renda do YouTube, visualizações, retorno financeiro ou filme imediatamente após o pagamento.
- Cobrança/taxas/moeda e total devem ser os efetivamente exibidos no checkout; não mudar Stripe Tax, fiscalidade ou conta Stripe neste piloto.

## EVIDÊNCIA DE PRODUÇÃO — somente leitura

Supabase `cqqukkvjjrguayiyjvhh`, consulta de16/09/2026 às23:11:06Z e23:11:27Z. Filtro externo reproduz `lib/internalAccounts.ts`; nenhuma identidade é publicada aqui.

| Medida | Resultado | Limite |
| --- | ---: | --- |
| Pessoas externas com canal sem revogação registrada | 6 | Não prova capacidade atual de upload. |
| Dessas pessoas, perfil free / pro | 5 / 1 | Perfil não reconcilia sozinho histórico de pagamentos. |
| Conectadas com clique de intenção Autopilot nos últimos30dias | 1 | Eventos: connect_clicked, lite_checkout_clicked, upgrade_clicked; não é aceite. |
| Perfis externos com plan=autopilot_lite | 0 | Não substituir reconciliação Stripe por essa contagem. |
| Agendas interval_days=7, inclusive internas | 0 | Não há agenda semanal para provar a execução. |
| Runs semanais succeeded com youtube_video_id, inclusive internas | 0 | Não há prova final de publicação Lite na amostra completa consultada. |

## BLOQUEIO TÉCNICO antes de convidar compradores

CONTRADIÇÃO: o registro AUTOPILOT-LITE-R1 diz «primeira vez na próxima passada». No POST real (`app/api/autopilot/schedules/route.ts:425`), `next_run_at` nasce de `computeNextRunAt(...intervalDays:7)`. A função (`lib/autopilot/config.ts:248`) soma sete dias inclusive nessa primeira criação. O comentário sobre agenda com next_run_at nulo não descreve o POST, que nunca grava nulo.

TESTADO LOCALMENTE: `node scripts/test-autopilot-lite-2026-09-16.mjs`, 23 verificações, zero falhas na base. A prova executa a função real: criação simulada16/09 15:30Z, hora14 →23/09 14:00Z. O verde prova a espera, não o primeiro upload.

Pedido A2-FIRST-RUN ao Claude: reconciliar a intenção aprovada de primeira entrega com o POST real, distinguindo primeira agenda, retomada e próxima execução semanal; provar idempotência e horário sem gasto. Não editar DB nem antecipar cron manualmente para simular venda. Antes da venda assistida, fornecer uma prova real consentida do caminho (compra/entitlement, canal, agenda, render, URL persistida, publicação) e suas limitações. A hipótese de início imediato não está liberada como promessa enquanto isso faltar.

## Seleção do primeiro lote

Entrega executável pelo MMR, sem novo disparo automático:

1. Partir das seis pessoas conectadas, priorizando sinal de intenção recente. Se não houver três elegíveis, entregar lote menor, nunca preencher com e-mails frios aleatórios.
2. Excluir internos, proibidos permanentes, opt-out, endereço inválido, contato sem permissão e quem não demonstrou interesse em manter canal. Confirmar o canal diretamente com a pessoa; não inferir pelo cadastro.
3. Cruzar supressão canônica `lib/lifecycle/suppression.ts`, ledger real de e-mails, envios Gmail do FIRST50 e o lote de44 preparado. Falha na checagem = não enviar. Não duplicar cartas.
4. Separar primeira assinatura de upgrade de cliente existente. O perfil pro é candidato a upgrade, nunca «novo assinante» por mudar de plano.
5. Guardar destinatários/URLs de canal/consentimento apenas no registro privado do MMR. Git recebe agregados e estado.

## Abordagem pronta — NÃO ENVIADA

Usar somente após gate técnico, elegibilidade e revisão do destinatário. Rascunho de demonstração, sem cupom:

> Subject: Would a weekly publishing workflow fit your channel?
>
> Hi [first name],
>
> Would it help to set up a weekly Short for your YouTube channel? Kineo's Autopilot Lite is $59/month and uses Kineo1 for scheduled episodes. It includes 160 monthly credits; scheduled episodes use that same balance.
>
> We can walk through the setup together, check that the right channel is connected, and agree on the schedule and visibility before anything is published. This is a setup demonstration, not a promise of views or channel income.
>
> You can review the plan here: https://www.usekineo.com/pricing?utm_source=assisted_activation&utm_medium=email&utm_campaign=autopilot_lite_pilot_sep16&intent_campaign=autopilot_lite_pilot_sep16#autopilot-lite
>
> If this fits what you need, reply with your channel's topic and preferred time zone. No need to share your password.

Acrescentar identificação e descadastro pelo mecanismo da casa antes de qualquer envio. Não oferecer horário de atendimento não combinado nem usar nome do fundador como remetente sem autorização específica. Link acima é página de planos, não API que cria cobrança ao ser varrida por scanner.

## Roteiro da ativação consentida

1. Confirmar necessidade, canal e direitos sobre o conteúdo. Mostrar um resultado Kineo1 real aprovado, identificando motor e duração; não vender preview Veo como episódio automático.
2. Explicar cobrança mensal, créditos compartilhados e primeira data REAL de execução. Pessoa decide a assinatura e conclui seu próprio pagamento; nunca cobrar ou consentir por ela.
3. Confirmar pagamento no servidor e entitlement. Ajudar a pessoa a escolher o canal correto, inclusive conta de marca, sem pedir senha nem copiar token.
4. A pessoa escolhe nicho, fuso e visibilidade. Primeira prova preferencialmente privada/não listada, com autorização dela e somente se esse comportamento estiver confirmado na rota e no upload. Mostrar data antes de ativar.
5. Conferir a primeira execução: uma run, um débito legítimo, URL de filme persistida e YouTube ID no canal correto. Ela assiste, aprova ou relata defeito. Não converter automaticamente de privado para público.
6. Confirmar próxima data, como pausar e cancelar. Se houver falha, resolver suporte/estorno devido antes de qualquer upsell.

## Placar e critérios de parada

Usar eventos existentes: autopilot_lite_checkout_clicked → evento financeiro canônico → autopilot_schedule_created → autopilot_run_published e estado succeeded com ID YouTube. Fonte: `lib/autopilot/events.ts:18`. Não criar outro contador financeiro.

Registrar por pessoa: convite aprovado/enviado, resposta, pagamento externo, tipo primeira compra/upgrade, valor/moeda, estorno, agenda, primeira entrega, próxima data. Pagamento e entrega são colunas separadas. A primeira revisão ocorre após as três demonstrações realizadas ou72h depois do primeiro convite realmente enviado; isso não cria agendamento automático.

Parada imediata: total de cobrança divergente, canal incorreto, publicação sem consentimento, duplicidade de débito, ausência de supressão ou entrega incompatível. Poucas respostas não provam fracasso. Não aumentar desconto, verba ou lote por conta própria.

## Situação desta entrega

IMPLEMENTADO: plano existente. TESTADO LOCALMENTE: contrato atual23/23. PREPARADO: roteiro, abordagem e seleção. BLOQUEADO: convite/ativação por falta de prova final e decisão técnica sobre primeira agenda. ENVIADO: nenhum. NOVA RECEITA atribuída a A2: não comprovada.
