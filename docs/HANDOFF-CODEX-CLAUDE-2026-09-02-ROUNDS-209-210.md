# HANDOFF CODEX → CLAUDE — RODADAS 209–210

**Data da observação:** 2026-09-02 10:27 UTC

**Pista:** B2B · descoberta → artefato comercial → página de pacotes → checkout → compra

**Escopo da entrega:** medição somente leitura; nenhuma UI, oferta, preço, crédito, checkout, banco ou render alterado

## 1. Decisão comercial preservada

**DECISÃO APROVADA:** Kineo apresenta e cobra planos em USD em toda a jornada. A fonte continua sendo `lib/checkoutPricing.ts`. Esta rodada não alterou moeda, preço, Stripe Tax, SKU nem copy pública.

**DECISÃO APROVADA:** a consistência entre informação pública, oferta e cobrança em USD é um gate de credibilidade no último segundo da decisão. Nenhuma futura experiência pode prometer moeda local quando a cobrança real for em USD.

## 2. Hipótese e regra de leitura

**HIPÓTESE TESTADA:** os eventos atuais permitem medir conservadoramente o caminho B2B por pessoa externa e por sessão anônima, sem atribuir ao mesmo ator um clique, um artefato ou uma compra que pertencem a outro navegador.

**FATO CONFIRMADO:** `agency_volume_bridge_clicked` não é uma autoridade universal de navegação. A entrada `product_tool` não possui esse evento, e uma URL pode chegar compartilhada ou diretamente. O relatório usa `agency_bulk_page_viewed` válido como autoridade de chegada e mantém o clique anterior somente como diagnóstico.

**DECISÃO DE IMPLEMENTAÇÃO:** uma entrada progride de `collecting` apenas quando acumula 20 pessoas externas identificadas, ou 20 sessões anônimas, ou a primeira Stripe Session/compras server-side exata daquela entrada. Entradas diferentes não compartilham amostra.

## 3. Evidência de produção — amostra real, sem somar unidades

Consulta `SELECT` no Supabase de produção, janela independente de 30 dias, contas internas excluídas pela lista canônica de `lib/internalAccounts.ts`, observada em 2026-09-02 10:27 UTC:

- **EVIDÊNCIA DE PRODUÇÃO:** `agency_volume_bridge_viewed` alcançou 12 pessoas externas identificadas e 26 sessões anônimas; a contagem bruta de 47 inclui contas internas e não é usada como cliente.
- **EVIDÊNCIA DE PRODUÇÃO:** a página canônica de pacotes B2B recebeu 4 sessões anônimas válidas na versão atual e nenhuma pessoa externa identificada.
- **EVIDÊNCIA DE PRODUÇÃO:** as quatro chegadas válidas estão distribuídas em `direct` 1, `home` 1, `pricing` 1 e `product_tool` 1.
- **EVIDÊNCIA DE PRODUÇÃO:** `bulk_checkout_started` possui 2 eventos brutos, ambos pertencentes a 1 pessoa interna; portanto há 0 pessoas externas no checkout B2B.
- **EVIDÊNCIA DE PRODUÇÃO:** não há `bulk_purchase_completed` externo observado na janela; receita B2B externa confirmada no relatório = US$ 0.
- **EVIDÊNCIA DE PRODUÇÃO:** o calculador de margem teve 4 sessões anônimas e 0 pessoas externas identificadas.
- **EVIDÊNCIA DE PRODUÇÃO:** `business_content_plan_viewed` teve 1 sessão anônima, 1 pessoa interna e 0 pessoas externas; `client_short_brief_viewed` e `client_short_brief_generated` não tiveram pessoa externa.

**REGRA DE LEITURA:** pessoas, sessões anônimas, eventos e receita são unidades distintas e nunca são somadas.

**RESULTADO:** não existe amostra para afirmar que o checkout B2B está vazando. A evidência atual é de um funil B2B ainda imaturo antes do checkout. As quatro entradas da página de pacotes permanecem `collecting` e nenhuma UI deve ser reeditada com base nelas.

## 4. Entrega publicada

Arquivos:

- `scripts/b2b-commercial-funnel-report.mjs`
- `scripts/measure-b2b-commercial-funnel.mjs`
- `scripts/test-b2b-commercial-funnel-report.mjs`
- `scripts/measurement-helpers.mjs`

Garantias:

- pessoa externa exige `user_id`, e-mail presente e exclusão pela lista canônica de contas internas;
- sessão anônima é reportada separadamente e nunca vira pessoa;
- somente entradas permitidas em `lib/agencyDistribution.ts`, mais `direct`, entram no relatório;
- o emissor deve ser exatamente `agency_bulk_v2_2026_08_27`; entrada arbitrária é agregada como inválida e nunca ecoada no output;
- clique diagnóstico exige mesma sessão, entrada de destino correspondente, ordem temporal correta e até cinco minutos antes da chegada;
- o wrapper lê contexto adicional somente para resolver o limite esquerdo; denominadores e gates continuam na janela principal;
- artefato copiado e destinatário são estágios, nunca a mesma pessoa presumida;
- checkout externo exige `bulk_checkout_started` com Stripe Session exata;
- compra e receita exigem `bulk_purchase_completed`, Stripe Session exata, dono externo único, classe coerente, moeda e valor válidos;
- conflito entre donos internos/externos ou entre classes zera vínculo e receita e aparece como `identity_conflict`;
- `payment_success` genérico é excluído para não duplicar a mesma compra em lote.

**IMPLEMENTADO:** commit `4a256308eb6c4f8aabcb7848beb8e36cd9e2fcb1`.

**VALIDADO EM PRODUÇÃO:** deploy Vercel `dpl_H3VNBTKk4Tcsa96zhvABC1rto2US` READY, SHA exato `4a256308eb6c4f8aabcb7848beb8e36cd9e2fcb1`, aliasado em `www.usekineo.com`.

## 5. Gates técnicos e auditoria adversarial

- **TESTADO LOCALMENTE:** relatório novo 98/98.
- **TESTADO LOCALMENTE:** oito suítes, 726/726 verificações no total.
- **TESTADO LOCALMENTE:** `node --check` e whitespace limpos.
- **CONTRADIÇÃO PREEXISTENTE:** typecheck mantém exatamente 3 erros fora do escopo: Stripe API em `app/api/admin/_shared/mrr.ts`, Stripe API em `app/api/me/subscription/route.ts` e `Promise<Promise<T>>` em `components/TrialDowngradeModal.tsx`. Nenhum erro novo.
- **AUDITORIA INDEPENDENTE B2B:** GO final, zero P0/P1/P2.
- **AUDITORIA INDEPENDENTE B2C:** GO final, zero P0/P1/P2, depois de testar colisões entre dois donos externos e entre donos internos/externos na mesma Stripe Session.
- **EVIDÊNCIA DE PRODUÇÃO:** a varredura de erros após o deploy encontrou apenas grupos preexistentes em `/api/cron/finish-stranded-renders` e `/api/analyze-idea`, ambos ligados ao deploy anterior. Esta entrega é composta apenas por scripts de medição e não alterou runtime.

## 6. Próxima rodada

**SUGESTÃO:** alternar novamente para B2C e reconciliar os gates já publicados do primeiro vídeo até pagamento, sem reabrir uma superfície antes da amostra mínima. A próxima hipótese deve observar pessoa externa e receita real, preservando a decisão de USD único.

**QUESTÃO PENDENTE:** o relatório agora consegue dizer em qual entrada B2B existe progresso real; ainda não existe volume externo suficiente para escolher uma vencedora ou diagnosticar abandono no checkout B2B.
