# Handoff Codex → Claude — rodadas 169–170

**Data:** 2026-09-01  
**Workstream:** Growth / B2B afiliados empresariais + B2C verdade USD no último metro  
**Base auditada:** `8e86642d4ce3d474634da4318d2b2bde58f5df4c`

## Rodada 169 — B2B: intenção empresarial não chega ao kit, mas o gate ainda manda esperar

**EVIDÊNCIA DE PRODUÇÃO (Supabase, `SELECT` em 2026-09-01; janela de sete dias; contas internas excluídas pela lista canônica):** `affiliate_business_recruitment_v1` teve uma sessão anônima com visão válida e zero clique. `enterprise_alternative_business_path_v1` e `examples_business_proof_bridge_v1` tiveram uma pessoa externa identificada cada e zero clique. A ponte de volume somou 19 eventos entre cinco pessoas identificadas e 13 sessões anônimas; cada entrada continua abaixo de 20 atores. O rodapé empresarial gerou 40 eventos porque cada ator pode ver quatro destinos, mas alcançou uma pessoa identificada e nove sessões anônimas, sem clique. Pessoas, sessões e eventos não foram somados como clientes.

**EVIDÊNCIA DE PRODUÇÃO / RESULTADO FINANCEIRO:** `agency_bulk_page_viewed`, `agency_margin_calculator_viewed` e `b2b_brief_viewed` alcançaram quatro sessões anônimas cada. Não apareceu `agency_margin_pack_selected`, `agency_bulk_pack_clicked`, `b2b_brief_submitted`, `bulk_checkout_started` ou `bulk_purchase_completed`. Houve um `payment_success` externo na janela, sem cadeia B2B; ele não é reivindicado por esta pista.

**FATO CONFIRMADO EM CÓDIGO / CONTRADIÇÃO SEMÂNTICA:** o card público promete `Apply and get the business campaign`, porém envia o mesmo `APPLY` genérico dos outros CTAs (`app/partners/page.tsx:86,238`; `components/AffiliateBusinessRecruitmentCard.tsx:92-116`). Ao chegar ao painel, `RECOMMENDED_AFFILIATE_DESTINATION` inicia em `script`, e a primeira missão também recomenda `script`, não `business` (`lib/affiliateDestinations.ts:61`; `app/(dashboard)/affiliate/page.tsx:141-149`; `lib/growth/affiliateNextMission.ts:74-85`). Nenhum parâmetro preserva a intenção empresarial entre recrutamento, login, aplicação e kit.

**FATO CONFIRMADO / CAMINHO FINANCEIRO VIVO:** `/a/[code]?to=business` valida o afiliado e leva ao planner allow-listed; o planner possui callers de visão, geração, cópia, ativação e packs. O checkout bulk cria Session Stripe e `bulk_checkout_started`; o webhook só emite `bulk_purchase_completed` depois da concessão e grava comissão inicial. O problema encontrado é o handoff semântico anterior, não um caller financeiro morto.

**FATO CONFIRMADO / USD:** `/partners` deriva valores de `TIER_PRICES` e informa cobrança mundial em USD. Packs B2B são compras únicas em USD; uma compra bulk referida gera comissão inicial e não deve ser contada como assinatura recorrente ou MRR.

**GATE PRESERVADO / NO-GO:** manter `affiliate_business_recruitment_v1` até dez exposições externas. Sinal mínimo já aprovado: dois clickers distintos e ao menos uma aplicação ou cópia business. Só depois disso a mudança mínima candidata é um parâmetro allow-listed que sobreviva a signup/login e inicialize o destino e a primeira missão em `business`. Não criar nova landing, CTA, evento, preço ou checkout; qualquer mudança visual exigirá preview antes/depois.

## Rodada 170 — B2C: a decisão USD está correta e ainda não tem amostra para nova otimização

**DECISÃO APROVADA:** a Kineo lista e cobra em USD mundialmente. Site, SEO/AEO, oferta, recuperação e Stripe devem coincidir em moeda, valor, periodicidade e benefícios; conversão e taxa bancária pertencem ao banco do comprador. A decisão já está registrada em `docs/DECISIONS.md` e a fonte única continua `lib/checkoutPricing.ts`.

**FATO CONFIRMADO EM CÓDIGO / PRODUÇÃO:** o complemento final da verdade USD é `1cc7f1e4fd6c394774f3cb22d79c787f25fe0a08`, criado em `2026-09-01T19:45:51Z` e validado no deployment `dpl_BZ4bqKa4soxFHeb1NBBxMsaKruqt`. A varredura publicada eliminou promessa ativa de moeda local e “same price worldwide”, preservando valores, cupons, Stripe e entitlement.

**EVIDÊNCIA DE PRODUÇÃO (Supabase, `SELECT` em 2026-09-01; somente depois de `2026-09-01T19:45:51Z`; contas internas excluídas):** duas pessoas externas identificadas emitiram `pricing_currency_resolved(currency=usd)`; uma era não americana. Não houve sessão anônima de pricing, Checkout Session, `payment_success` ou assinatura nessa coorte. A régua atual é **1/20 pessoas não americanas** e **0/10 Checkout Sessions** — não há base para outra copy, desconto, moeda, preço ou alteração do caixa.

**EVIDÊNCIA COMPLEMENTAR / OUTRO GATE PRESERVADO:** depois da fronteira de `video_rating_prompt_visibility_v1` (`2026-09-01T20:40:10Z`), uma pessoa externa baixou vídeo, mas nenhuma teve visão válida da caixa de avaliação. Isso é amostra zero do prompt, não rejeição; a superfície continua em 0/10 visões válidas e 0/5 respostas.

**VEREDITO:** **NO-GO para runtime nas duas rodadas.** A intervenção segura foi manter as variantes vivas, registrar a contradição B2B para o primeiro gate útil e preservar a verdade USD sem misturá-la com outra oferta. Nenhum código, UI, preço, crédito, trial, checkout, Stripe, banco, render, comunicação externa ou tráfego ativo foi alterado.

**PRÓXIMA RODADA:** alternar para um estágio B2C diferente que não esteja sob gate; voltar ao handoff `business → kit` somente após o primeiro clique externo ou o gate de dez exposições. Reconciliar sempre até `payment_success` e assinatura ativa, sem chamar evento, sessão, checkout ou compra avulsa de assinatura.
