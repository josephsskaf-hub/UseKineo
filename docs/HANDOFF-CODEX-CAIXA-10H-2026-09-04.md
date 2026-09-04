# CAIXA — janela de dez horas, 04–05/09/2026

INÍCIO CONFIRMADO: SIM — 04/09/2026 17:08 BRT.
TÉRMINO: 05/09/2026 03:08 BRT. Sem renovação automática.
Dez rotações de uma hora; checkpoint aos 30 minutos continua a mesma rotação.
A décima rotação é fechamento seguro. Claude: retenção; Codex: intenção → pagamento.

## Rotação 1 — 17:08–18:08 BRT — EM EXECUÇÃO

- **FATO CONFIRMADO:** base consultada `463fc378`, fila de retenção incorporada; worktree `C:/tmp/usekineo-caixa-10h-r1`, branch `codex/caixa-10h-r1`. Árvore principal intocada.
- **FATO CONFIRMADO:** `app/checkout/success/page.tsx:73` disparava pixels com amount/currency da URL, sem autenticar a sessão paga. Entitlement da conta não comprova pagamento dessa sessão.
- **HIPÓTESE:** remover falsos pixels torna aquisição mensurável; não é promessa de aumento imediato de assinaturas.
- Mudança mínima: leitura autenticada da sessão Stripe, propriedade por metadata canônica, pagamento real em modo live, valor/moeda do servidor, dedupe por sessão/provedor. Sem mudança de preço, crédito, webhook ou criação de pagamento.
- Gate: sessão falsa/alheia/pendente/gratuita/teste/interna não emite compra; assinatura e avulso pagos válidos emitem com valor real; remount/reload não duplica. Testes executáveis + tsc real + Guardião antes da main.
- **QUESTÃO PENDENTE:** placar comercial desta janela ainda não consultado. Não importar números do ciclo anterior como baseline atual.
- **EVIDÊNCIA OPERACIONAL:** ferramenta de uso às 20:09:54 UTC: Codex 29% usado na janela semanal, 71% disponível; segunda janela indisponível. Nenhum reset usado.
- **BLOQUEIO PARCIAL:** conector de documentação Stripe pede reautenticação; referência pública oficial foi consultada como alternativa. Nenhuma credencial exposta.
- Entrega de código publicada: `593b28a5ed51ce96a867c403c3c99f0d6552ff47`. A rotação continua na reconciliação, não abre uma segunda rotação por concluir o patch.

### Implementação e verificação local

- **IMPLEMENTADO:** `/api/stripe/checkout/verify` valida `auth.getUser()`, dono em `metadata.supabase_user_id`, `status=complete`, `payment_status=paid`, modo live e valor positivo. `client_reference_id` não é dono: o checkout usa esse campo para Rewardful (`app/api/stripe/checkout/route.ts:2110`). Contas internas e sessões gratuitas/teste não disparam conversão.
- **IMPLEMENTADO:** `observeCheckoutPurchase` consulta no máximo cinco vezes, cancela ao desmontar e permite SDK carregar por até 30s; `checkoutPurchasePixels` deduplica separadamente Google/TikTok em memória + sessionStorage, mantendo IDs para dedupe do fornecedor. Uma chamada aceita pelo SDK não prova entrega ao provedor nem receita.
- **LIMITAÇÃO EXPLÍCITA:** USD e BRL são as moedas suportadas na verificação desta entrega (atual e legado). Moeda desconhecida é excluída, nunca dividida por um expoente presumido. Não houve alteração de SKUs.
- **TESTADO LOCALMENTE:** tsc real (`node node_modules/typescript/lib/tsc.js --noEmit --pretty false`) exit 0; contrato executável de rota, política, observer, dispatcher e efeito real da página; regressões de entitlement 66/66 e Autopilot 84/84.
- Quatro asserções antigas por regex (duas em cada teste de regressão) exigiam pixels inline sem verificação. Foram invertidas para proibir o bypass; teste novo executa o caller, não só busca nomes.
- UI, navegação e polling de entitlement não alterados. **QUESTÃO PENDENTE distinta:** a política anterior de entitlement self-serve exige plano de assinatura, mesmo para comprador de pack. Esta correção aceita packs no pixel, mas não declara ter corrigido aquela apresentação; avaliar separadamente, com preview e prova de fulfillment antes de mudar.
- **EVIDÊNCIA DE PRODUÇÃO, 04/09, consulta inicial desta rotação:** deploy da base `dpl_E3ajaWXWAJchgB9AgbNir46Z5K5n` READY, alias `www.usekineo.com`, SHA `463fc3789e6348c67e2669e9042e9bd701165f37`. Confirma publicação da base do Claude, não a experiência de episódio 2. A hora 20:23 indicada na primeira versão foi retirada: não foi registrada pelo relógio naquele instante.

### Gates e deploy da entrega

- **TESTADO LOCALMENTE:** contrato novo 107/107; entitlement 66/66; Autopilot 84/84; TypeScript real exit 0. Markup JSX desde `<main` idêntico byte a byte à base. Não houve entrega visual nova.
- PR 37: https://github.com/josephsskaf-hub/UseKineo/pull/37. Guardião pré-integração `33915901472`, SHA `593b28a5`, conclusão success; etapa tsc também success. A suíte geral do repositório continua informativa, não equivale a todas as baterias verdes. Os testes acima foram executados localmente.
- Integração por fast-forward `463fc378` → `593b28a5`, sem tocar main local suja. **Nota de autoria:** o commit herdou a identidade global `Claude Sprint`; o trabalho é desta pista Codex e da branch `codex/caixa-10h-r1`. Não reescrever história publicada para corrigir metadata; próximos commits usam identidade Codex explícita.
- **VALIDADO EM PRODUÇÃO (limites abaixo), 04/09 20:27:17 UTC:** `dpl_4rPiE77UE4DPX7AK8Yg5Wfw7sSwq` READY, SHA `593b28a5`, alias `www.usekineo.com`. GET ID malformado → 400; GET ID sintaticamente válido sem autenticação → 401; ambos JSON `unavailable`, cache privado/no-store, sem dados de pagamento. Página HTTP 200; chunk HTTP 200 contém endpoint/version novos e não lê amount/currency da URL.
- **LIMITAÇÃO:** compra autenticada positiva, sessão alheia e dedupe de SDK foram validados com mocks executando código real, não com cobrança ao vivo. Nenhum render, débito, sessão de pagamento criada, grant, migration, e-mail ou contato.

### Marco zero e vigia — SELECT, contas internas excluídas

**EVIDÊNCIA DE PRODUÇÃO:** consulta em 04/09/2026 20:23:59.242234 UTC, projeto `cqqukkvjjrguayiyjvhh`; exclusão canônica de `lib/internalAccounts.ts`; receita somente `payment_success` de `stripe_webhook`, valor positivo e sessão distinta. Primeira assinatura B2C = primeiro evento histórico por pessoa com modo subscription, subscription_id e tier B2C. Avulso contado separadamente. Cobertura é o histórico desse evento Stripe, não conciliação bancária global.

| Janela UTC (fim exclusivo) | Cadastros | Pessoas com filme | Pessoas no caixa | Sessões Stripe | Primeira assinatura B2C registrada | Compradores avulsos |
|---|---:|---:|---:|---:|---:|---:|
| 03/09 20:08 → 04/09 20:08 | 38 | 25 | 3 | 3 | 0 | 0 |
| 04/09 20:08 → 20:23:59 | 0 | 0 | 0 | 0 | 0 | 0 |

Não dividir colunas como funil sequencial: as pessoas não são necessariamente as mesmas. Não usar `checkout_success_viewed` como assinatura, apesar do SQL antigo do programa chamar assim.

- Vigia de duas horas no corte desta rodada: nenhuma pessoa externa com `checkout_started`; não inventar um comprador vivo.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 20:25:48 UTC:** os três compradores potenciais do baseline tinham zero filmes antes do checkout. `4a926303`: Creator, 03/09 20:18:39, sessão depois expirada; `73bd3264`: Studio, 04/09 13:01:22; `9f2b563c`: Studio, 04/09 15:16:55. Nenhum `payment_success` posterior; nenhum motivo de cancelamento declarado nesta trilha.
- Reconciliação complementar: `73bd3264` voltou ao produto, dispensou banner de retomada às 13:21:10, tentou primeiro vídeo e chegou a `video_downloaded` às 14:16:06. Não classificar como render perdido, nem misturar 6 exposições do banner ChatGPT com seis pessoas. Os outros dois só têm callback/checkout (e expiração do primeiro) no corte. Evento de expiração é servidor, **não** retorno humano.
- **HIPÓTESE / próxima investigação:** distinguir intenção explícita pré-vídeo da conversão após uso. Três casos não demonstram preço errado nem sustentam bloquear checkout até gerar vídeo. Preservar o clique explícito de compra.

### Próxima jogada

Concluir testes do pixel e caller; publicar apenas após gates. Depois reconciliar quase-compradores por pessoa e primeira assinatura paga (SELECT), sem contatos.

### ✅ O que você precisa fazer

Nada nesta etapa.

### 📋 O que aconteceu

Rotação aberta sobre a fila publicada do Claude. Correção de medição em andamento, sem mexer na experiência de geração ou preço.
