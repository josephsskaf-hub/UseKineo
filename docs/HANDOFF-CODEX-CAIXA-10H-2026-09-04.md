# CAIXA — janela de dez horas, 04–05/09/2026

INÍCIO CONFIRMADO: SIM — 04/09/2026 17:08 BRT.
TÉRMINO: 05/09/2026 03:08 BRT. Sem renovação automática.
Dez rotações de uma hora; checkpoint aos 30 minutos continua a mesma rotação.
A décima rotação é fechamento seguro. Claude: retenção; Codex: intenção → pagamento.

## Rotação 1 — 17:08–18:08 BRT — CONCLUÍDA

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
- **FATO CONFIRMADO / anti-repetição:** `checkout_entry_surface` foi introduzido em `19de5cb6` às 15:03 BRT de 04/09, depois dos três checkouts acima; campos nulos nesses casos não provam instrumentação quebrada. Os três callbacks confirmam destino `/api/stripe/checkout` e ponte de sessão presente. Não reconstruir atribuição por falta de amostra pós-publicação.
- **Revisão complementar da R1:** `fetchCache='force-no-store'` declarado explicitamente na rota nova para que a consulta Auth também dispense Data Cache (separado dos headers da resposta). Contrato atualizado para 108 verificações; sem mudança de política de compra, UX ou escrita no banco. Publicação desta linha acompanha o handoff, após repetir os gates.

### Próxima jogada

Patch e reconciliação inicial concluídos; a rotação 1 permanece aberta até 18:08 BRT. Checkpoint de 17:38 continua esta mesma entrada, sem nova hipótese ou rotação. Preservar o pixel corrigido e medir a próxima compra real; não fazer cobrança de teste. Depois avaliar exposição → clique de ofertas existentes entre quem já recebeu filme, sem repetir atribuição de entrada (sem amostra) nem a série do Claude.

### Estado consolidado às 17:34 BRT

- **VALIDADO EM PRODUÇÃO, 04/09/2026 20:34:30 UTC:** complemento `e06a5380f25b48b63dfdf487cef9f9ef4a4a4cff`, Guardião pré-integração `33916586818` success, deploy `dpl_E6pt74htki6NJxZFNhDrk8AodFk7` READY e `www.usekineo.com` aliasado. Negativos HTTP 400/401/no-store repetidos após READY. Positivos continuam TESTADOS LOCALMENTE, não compra real forçada.
- Código final: 108/108 contrato executável, 66/66 entitlement, 84/84 compatibilidade Autopilot; tsc exit 0. Árvore isolada limpa após commits; árvore principal e pista do Claude intocadas.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 20:31:37 UTC:** entre as 25 pessoas com filme criado/concluído do baseline, após o horário do respectivo filme e antes de 20:08 UTC: ponte de saldo 10 pessoas/13 eventos; CTA de assinatura no banner 5/5; oferta do primeiro filme no histórico 4/5; modal de upgrade 3/4; download confirmado 6/6. Nenhum `checkout_started` pós-filme nesse corte. Não somar públicos sobrepostos; ausência de evento não prova que ninguém viu interface.
- **SUGESTÃO para próxima rotação:** testar a hipótese de exposição/clareza do próximo passo de compra antes de atribuir tudo a preço. Inventariar quais versões cada pessoa viu e respeitar gate de amostra; nada de quarta porta de série, CTA obrigatório ou desconto novo.
- Janela segue até 03:08 BRT, sem renovação. Nenhuma comunicação externa iniciada.

### ✅ O que você precisa fazer

Nada nesta etapa.

### 📋 O que aconteceu

Correção de pixels publicada e validada nos limites descritos; baseline por pessoa registrado e compradores potenciais reconciliados. Não houve assinatura nova demonstrada nesta leitura inicial. O restante da rotação acompanha evidência, sem substituir a métrica final por contagem de tarefas.

## Rotação 2 — 18:08–19:08 BRT — EM EXECUÇÃO

- **FATO CONFIRMADO:** `fetch origin` na abertura confirmou base `ad7cef42f956300bd03a9ce6db41e3d9e6f75a7f`; worktree limpa própria `C:/tmp/usekineo-caixa-10h-r2`, branch `codex/caixa-10h-r2`. Nenhum commit novo da retenção no log de main nesse corte. O arquivo `docs/ESCOPO-CLAUDE-VS-CODEX-2026-08-31.md` não existe nesta base; fronteiras continuam as aprovadas no chat e registradas neste handoff. Não reconstruir documento ausente por memória.
- **EVIDÊNCIA DE PRODUÇÃO / fechamento R1:** deploy final documental `dpl_8tzS5m85ZsWk2iWPB6KEaQ6Xy5p8` READY, SHA `ad7cef42`, alias www, conferido 04/09 20:39:44 UTC. Negativo autenticado ausente novamente 401/no-store. Guardião PR39 `33916990519` success. Não houve teste de cobrança ao vivo.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 04/09 21:10:10.954155 UTC:** marco zero permanece 38 cadastros, 25 pessoas com filme, 3 no caixa, 0 primeiras assinaturas registradas e 0 compradores avulsos. Ciclo 20:08→21:10:10: 0 cadastros, 1 pessoa com filme, 0 no caixa, 0 primeiras assinaturas e 0 avulsos. Contagens independentes, não funil sequencial. Vigia de duas horas repetido às 21:14 UTC sem checkout externo.
- **HIPÓTESE escolhida:** descobrir uma objeção declarada por atendimento consentido pode remover fricção de compra; silêncio após checkout não identifica preço como causa. Mudança mínima desta rodada é preparar o piloto e sua elegibilidade, não uma campanha nem outra tela sem evidência.
- **ANTI-REPETIÇÃO:** a pergunta de objeção já vive em `app/checkout/cancelled/page.tsx:539–550`; evento correto `checkout_cancel_reason`. SELECT de sete dias às 21:14:40 UTC: 5 pessoas / 10 cancelamentos, nenhuma resposta nem impressão da pergunta registrada. Não inventar resposta, não reconstruir a pergunta. Os três checkouts do baseline precedem a instrumentação recente de entrada; preservar a variante sem amostra nova.
- **FATO CONFIRMADO:** exposições do `TrialActiveBanner` não têm definição idêntica: ponte de saldo registra interseção, CTA de assinatura exige um segundo contínuo visível (`components/TrialActiveBanner.tsx:355–515`). A diferença 10 versus 5 pessoas no baseline não prova que metade perdeu o botão. Nenhuma edição da hierarquia visual por essa comparação.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 04/09 21:15:25 UTC:** 27 pessoas externas com checkout B2C em sete dias e sem assinatura B2C paga no histórico webhook; 25 têm e-mail recente aceito pelo serviço. Só 2 passam a pré-seleção limitada, ainda sem consentimento/campanhas reconciliados. Sete tinham filme antes do primeiro checkout da janela. Zero nomes excluídos/opt-outs neste recorte não significa consentimento. Nenhum destinatário aprovado.
- **FATO CONFIRMADO:** `recordResendResponse` copia HTTP ok/status (`lib/email/quota.ts:244–258`), não entrega. Ledger best-effort: ausência de registro não prova ausência de envio. Nenhum endereço, conteúdo pessoal ou credencial exportado.
- **PREPARAÇÃO IMPLEMENTADA:** `docs/PILOTO-VENDA-ASSISTIDA-CAIXA-2026-09-04.md` + duas consultas somente SELECT agregadas. Proposta: no máximo duas pessoas após todos os gates, nenhuma sequência automática, resultado final primeira assinatura paga; amostra não sustenta causalidade. Consentimento, fontes de supressão e campanhas previstas pedidos ao Claude. Nenhum contato ou rascunho individual.
- **GATE DE PARADA:** falta de consentimento, cobertura de envios, exclusão, pagamento anterior, opt-out ou colisão impede contato. Preço, oferta, pipeline e crédito permanecem intocados. Nova edição de superfície só com fricção reproduzida/objeção observada, não por contagem baixa.
- **TESTADO LOCALMENTE:** TypeScript real exit 0; contrato de compra 108/108, entitlement 66/66 e compatibilidade Autopilot 84/84, todos sem chamadas externas. `git diff --check` limpo. SQL executado somente via SELECT. Alterações desta R2 limitadas a documentação/consultas, sem runtime ou UI nova.
- **QUESTÃO PENDENTE de publicação:** pacote documental desta R2 segue para branch própria e Guardião. SHA e estado de integração serão registrados após verificação; não declarar proposta como campanha ativa ou ganho de receita.

### Próxima jogada

Checkpoint de 18:38 continua R2. Reconciliar resposta do Claude sobre fonte de consentimento/campanhas e eventual intenção nova; sem resposta, manter piloto fechado e escolher apenas fricção comercial reproduzível para a próxima rotação. Não reeditar pixels sem erro nem criar uma quarta porta de episódio 2. Uso deve ser revisto após o fechamento da segunda rotação.

### ✅ O que você precisa fazer

Nada agora. O piloto não será executado sem autorização específica e elegibilidade comprovada; não é necessário aprovar disparo durante esta preparação.

### 📋 O que aconteceu

Preparada uma alternativa de venda assistida com trava contra repetição: 25 de 27 potenciais compradores já tiveram contato recente aceito pelo serviço. Nenhuma assinatura nova demonstrada, nenhum envio e nenhuma mudança visual. O resultado desta etapa é elegibilidade e proposta verificáveis, não venda atribuída.
