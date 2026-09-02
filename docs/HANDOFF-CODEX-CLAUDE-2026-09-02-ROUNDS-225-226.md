# HANDOFF CODEX → CLAUDE — 2026-09-02 — rodadas 225–226

**Workstream:** Growth + Data · primeira entrada ChatGPT → vídeo concluído → Checkout de assinatura → pagamento
**Snapshot de produção:** 2026-09-02 11:28 BRT
**Escopo:** uma consulta `SELECT` agregada no Supabase de produção e implementação de medidor somente leitura; nenhuma UI, oferta, preço, crédito, Checkout, render, banco ou comunicação externa alterada

## Resultado executivo

**EVIDÊNCIA DE PRODUÇÃO — 30 dias, contas internas excluídas:** 289 pessoas externas foram ligadas de forma não ambígua a uma primeira entrada pelo ChatGPT. Dessas, 14 pessoas abriram 17 Stripe Sessions de assinatura **depois** de receber um vídeo concluído; 2 pessoas pagaram 2 Sessions, totalizando **US$58,00** em receita de assinatura na janela.

**EVIDÊNCIA DE PRODUÇÃO — diagnóstico separado:** outras 17 pessoas abriram 17 Stripe Sessions de assinatura antes de qualquer vídeo concluído, ou sem vídeo concluído; nenhuma pagou. Esses checkouts não entram no funil pós-vídeo.

**HIPÓTESE sustentada, não causalidade provada:** experimentar o produto antes do Checkout está associado ao pagamento. A amostra paga é apenas n=2; não autoriza reescrever oferta, preço ou Checkout por si só.

## Unidade e atribuição

**FATO CONFIRMADO:** o relatório conta pessoas distintas, não eventos. Uma sessão de navegador só vira pessoa quando resolve para exatamente um perfil externo; sessão anônima ou multiusuário permanece em bucket separado (`scripts/chatgpt-entry-subscription-report.mjs:74-114`).

**FATO CONFIRMADO:** o funil principal exige ordem temporal para a mesma pessoa: entrada ChatGPT → primeira linha `videos.status='completed'` → `checkout_started` de assinatura → `payment_success` exato da mesma Stripe Session (`scripts/chatgpt-entry-subscription-report.mjs:117-148`).

**FATO CONFIRMADO:** packs, conflitos de identidade/produto/valor/moeda/linha do tempo e pagamentos sem Session ligada continuam valendo zero receita de assinatura porque o relatório reutiliza `buildSubscriptionRevenueLedger` (`scripts/chatgpt-entry-subscription-report.mjs:127-148`).

**FATO CONFIRMADO:** checkouts anteriores ao vídeo são expostos separadamente e nunca inflam o funil pós-vídeo (`scripts/chatgpt-entry-subscription-report.mjs:142-148,185-198,232-245`).

## Aquisição por página de entrada

Todos os números abaixo usam a mesma janela móvel encerrada em 2026-09-02 11:28 BRT e excluem contas internas.

| Primeira página via ChatGPT | Pessoas externas | Com vídeo concluído | Pessoas em Checkout pós-vídeo | Pessoas pagas | Receita de assinatura |
|---|---:|---:|---:|---:|---:|
| `/` | 131 | 70 | 5 | 1 | US$29,00 |
| `/ai-video-generator/seedance` | 13 | 6 | 1 | 1 | US$29,00 |
| `/state-of-ai-shorts-2026` | 19 | 11 | 3 | 0 | US$0 |
| `/free-ai-shorts/horror` | 21 | 15 | 2 | 0 | US$0 |
| `/ai-video-generator/kineo-1` | 32 | 15 | 1 | 0 | US$0 |
| `/text-to-video-shorts` | 23 | 15 | 1 | 0 | US$0 |
| `/gerador-de-shorts-gratis` | 6 | 3 | 1 | 0 | US$0 |
| `/free-ai-shorts-generator` | 29 | 15 | 0 | 0 | US$0 |

**EVIDÊNCIA DE PRODUÇÃO:** somente a home e a página Seedance estão associadas a pagamento de assinatura nessa janela. Isso não prova que a copy dessas páginas causou a compra.

**EVIDÊNCIA DE PRODUÇÃO:** `/free-ai-shorts-generator` teve 3 pessoas em Checkout pré-vídeo e zero pós-vídeo. A home teve 9 pré-vídeo e 5 pós-vídeo. Esse corte mostra por que somar todo `checkout_started` mascarava dois comportamentos opostos.

## Sessões que não viraram pessoas

**EVIDÊNCIA DE PRODUÇÃO:** 795 sessões de landing carregaram sinal ChatGPT; 380 ficaram anônimas, 4 resolveram para mais de um usuário, 6 eram internas e 0 tinham perfil sem e-mail. Esses buckets não entram nas 289 pessoas externas e não entram em taxa de assinatura.

## Implementação e gates

**IMPLEMENTADO:** `scripts/chatgpt-entry-subscription-report.mjs`, `scripts/measure-chatgpt-entry-subscription.mjs` e `scripts/test-chatgpt-entry-subscription-report.mjs`.

**TESTADO LOCALMENTE:** 32/32 verificações do novo relatório + 31/31 do ledger canônico + 27/27 do relatório B2C existente = 90/90. `node --check` e `git diff --check` limpos.

**TESTADO LOCALMENTE:** TypeScript mantém exatamente os 3 erros preexistentes em `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`; zero erro novo.

**COMMIT:** `5579d59aaea98bee6e4c0b9d17518d9826e776ce` — `growth: measure ChatGPT entry subscription path`.

## Moeda

**DECISÃO APROVADA reafirmada pelo fundador em 2026-09-02:** informação comercial e cobrança devem permanecer em USD do início ao fim para não quebrar credibilidade no último segundo.

**FATO CONFIRMADO:** nenhuma mudança de Stripe ou Checkout entrou nestas rodadas. Adaptive Pricing continua ativo até uma autorização operacional explícita para desligá-lo e validar a apresentação do Checkout.

## Gates e próxima ação

**DECISÃO DE GATE:** preservar `/state-of-ai-shorts-2026`; ela já recebeu intervenção recente e sua janela histórica mistura antes/depois. Não reeditá-la antes da amostra da variante atual.

**SUGESTÃO B2C:** usar este relatório como baseline e concentrar o próximo experimento numa superfície sem gate ativo, mantendo Seedance e home como referências de caminho que já chegaram a pagamento. Não aumentar tráfego para `/free-ai-shorts-generator` antes de entender por que seus 3 checkouts ocorreram antes do vídeo.

**SUGESTÃO B2B:** alternar a próxima rodada para diagnóstico de descoberta → artefato → proposta → Checkout → pagamento, sem abrir uma nova UI enquanto os briefs e propostas atuais ainda aguardam seus gates.

**QUESTÃO PENDENTE:** o medidor local exige as variáveis de Supabase no ambiente do processo. A validação de produção desta rodada foi feita por SQL agregado equivalente, somente leitura e sem retornar identificadores; o runner não imprimiu nem leu segredo.
