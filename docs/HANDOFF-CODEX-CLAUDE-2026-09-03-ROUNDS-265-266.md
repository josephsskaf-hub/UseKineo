# HANDOFF CODEX → CLAUDE — RODADAS 265–266

**Data da evidência:** 2026-09-03 02:15:45 UTC

**Base:** `ef31d340024bdf520a6b9a52218cb7d65c33452e`

**Commit funcional:** `3ad4556f577bbc6bd09b92db8e5ad480a2d14214`

**Workstream:** aquisição, fluxo e assinaturas B2B

**Escopo:** medição somente; nenhuma tela, oferta, preço, crédito, SKU, checkout, render ou migration alterados

## Resultado executivo

**FATO CONFIRMADO:** a interface já registra `agency_bulk_checkout_cancelled_return_viewed` e `agency_bulk_checkout_resume_clicked`, e o servidor já registra `bulk_checkout_started` e `bulk_purchase_completed`. O relatório comercial anterior mostrava esses quatro nomes apenas como estágios soltos; não respondia se uma pessoa externa voltou do Stripe, clicou para retomar, abriu uma Session válida e pagou.

**IMPLEMENTADO / TESTADO LOCALMENTE:** `scripts/b2b-commercial-funnel-report.mjs` sobe para `b2b_commercial_funnel_report_v2` e adiciona `checkoutRecovery`. A saída é somente agregada e separa:

- pessoas externas com retorno provado por uma Session bulk anterior;
- pessoas maduras individualmente por sete dias e pessoas ainda frescas;
- clique de retomada, nova emissão da mesma Stripe Session e nova Stripe Session;
- Session original ou recuperada ambígua/conflitante;
- corridas de persistência do retorno e do clique, sempre fora da atribuição;
- pagamento exato e receita em centavos por moeda, sem misturar moedas;
- pagamentos tardios, pack divergente e conflito de identidade somente como qualidade.

**FATO CONFIRMADO / CONTRATO FAIL-CLOSED:** a Session original e a Session recuperada só são exatas quando todas as suas linhas concordam em usuário externo, browser session não vazia e pack allow-listed. Um clique normal precisa preceder a nova Session em até cinco minutos. Eventos persistidos fora de ordem em até cinco segundos são diagnosticados como race, mas nunca viram recuperação. Mais de uma Session recuperada é ambígua. Pagamento só entra quando owner, pack e Stripe Session são exatos e ocorre até sete dias depois do retorno.

## Evidência de produção observada

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT somente leitura em 2026-09-03 02:15:45 UTC, janela de 30 dias, contas internas excluídas pela lista canônica de `lib/internalAccounts.ts`:**

- `bulk_checkout_started`: 2 eventos, 1 pessoa interna, 2 browser sessions;
- `agency_bulk_checkout_cancelled_return_viewed`: 0;
- `agency_bulk_checkout_resume_clicked`: 0;
- `bulk_purchase_completed`: 0;
- pessoas externas nos quatro estágios: 0;
- sessões anônimas nos quatro estágios: 0.

**DECISÃO DESTA RODADA:** não alterar a experiência B2B sobre denominador externo zero. O novo leitor fica congelado em `collecting` até cinco pessoas externas terem retorno individualmente maduro por sete dias. O primeiro pagamento exato abre `ready_for_reconciliation`, mas não prova causalidade nem autoriza declarar uplift.

## Verificação

- `test-b2b-commercial-funnel-report.mjs`: **167/167**;
- `test-agency-checkout-return.mjs`: **75/75**;
- `test-b2b-subscription-truth-report.mjs`: **101/101**;
- `test-subscription-revenue-ledger.mjs`: **31/31**;
- total executado: **374/374**;
- `git -c core.whitespace=cr-at-eol diff --check`: limpo;
- três auditorias independentes terminaram em **GO, P0=0, P1=0**, depois de os testes adversariais fecharem cronologia, boundary, múltiplas Sessions, conflitos de dono/browser/pack, browser nulo, pagamento antes do clique e pagamento depois de sete dias;
- o typecheck não pôde ser repetido nesta worktree porque não há compilador TypeScript instalado no repo nem no runtime local; nenhum arquivo TS/TSX foi alterado. O baseline mais recente, nas rodadas 263–264, continuava em três erros pré-existentes fora desta entrega;
- comparação visual não se aplica: nenhum JSX, CSS, texto visível, CTA ou destino foi alterado.

## Riscos e coordenação

**CONTRADIÇÃO COMERCIAL / NO-GO:** a promessa de quantidade dos packs continua incompatível com o custo atual do Fast documentado no handoff 261–262. Esta rodada não promoveu packs, não encurtou o caminho até o checkout e não mudou oferta. Claude/fundador precisam reconciliar créditos × quantidade antes de amplificar esse canal.

**RISCO P2 ACEITO:** a allowlist do relatório é duplicada em runtime, mas o teste lê `BulkPackId` diretamente de `lib/checkoutPricing.ts` e quebra se houver drift.

**PRÓXIMA ALTERNÂNCIA:** voltar ao B2C sem reeditar `TrialActiveBanner`: reconciliar outro estágio de primeiro vídeo → valor → checkout → pagamento que ainda não tenha gate ativo, ou executar diagnóstico se toda superfície estiver congelada.
