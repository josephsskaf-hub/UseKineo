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

## Rotação 2 — 18:08–19:08 BRT — CONCLUÍDA

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
- **PUBLICADO / VALIDADO EM PRODUÇÃO, 04/09 21:22:56 UTC:** pacote documental `119187afa6d374b5b21039298035d56758208c79`, PR40, Guardião `33920566774` success, integração fast-forward; deploy `dpl_69tqyHiV2eFD5w7kcjzziW35TERp` READY e alias www correto. Negativo sem login repetido: 401/private no-store. Evidência pós-push registrada no PR40 sem provocar novo deploy apenas para registrar o anterior.
- **CHECKPOINT R2, mesma rotação, SELECT 04/09 21:39:37.856707 UTC:** ciclo = 1 cadastro, 1 pessoa com filme, 0 pessoas no checkout, 0 primeiras assinaturas e 0 avulsos. Vigia 2h vazio; main ainda `119187af`, sem resposta de consentimento incorporada. Nenhuma mudança ou contato por falta de amostra.

### Próxima jogada

Checkpoint de 18:38 continua R2. Reconciliar resposta do Claude sobre fonte de consentimento/campanhas e eventual intenção nova; sem resposta, manter piloto fechado e escolher apenas fricção comercial reproduzível para a próxima rotação. Não reeditar pixels sem erro nem criar uma quarta porta de episódio 2. Uso deve ser revisto após o fechamento da segunda rotação.

### ✅ O que você precisa fazer

Nada agora. O piloto não será executado sem autorização específica e elegibilidade comprovada; não é necessário aprovar disparo durante esta preparação.

### 📋 O que aconteceu

Preparada uma alternativa de venda assistida com trava contra repetição: 25 de 27 potenciais compradores já tiveram contato recente aceito pelo serviço. Nenhuma assinatura nova demonstrada, nenhum envio e nenhuma mudança visual. O resultado desta etapa é elegibilidade e proposta verificáveis, não venda atribuída.

## Rotação 3 — 19:08–20:08 BRT — CONCLUÍDA

- **FATO CONFIRMADO:** base atual `1ee5e384`; worktree `C:/tmp/usekineo-caixa-10h-r3`, branch `codex/caixa-10h-r3`. AGENTS, estado histórico, questões, Growth, handoff, diário Claude e pedidos lidos. A main incorporou série/memória/despacho vazio e seus testes. `git log origin/main..entrega-atual` vazio na abertura; não olhar apenas a main para anti-duplicação. Nenhum arquivo Claude editado.
- **EVIDÊNCIA OPERACIONAL, 04/09 22:08:51 UTC:** uso semanal Codex 31% consumido / 69% disponível; janela secundária indisponível. Leitura após duas rotações, nenhum reset ou compra.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 04/09 22:09:53.395866 UTC:** baseline fixo inalterado (38 cadastros, 25 pessoas com filme, 3 no caixa, 0 primeiras assinaturas e 0 avulsos). Ciclo desde 20:08: 1 cadastro, 1 pessoa com filme, 0 no caixa, 0 primeiras assinaturas, 0 avulsos. Vigia de duas horas vazio.
- **PEDIDO PRIORIZADO:** Claude pediu às 16:55 distinguir assinatura/pack em `payment_success`. Hipótese a falsificar antes de editar: o evento não teria esses campos. Gate: verificar gravador real e dados; se já existem, NÃO EXECUTAR um segundo gravador nem aliases redundantes.
- **CONTRADIÇÃO RESOLVIDA:** `docs/MEDICAO-DEGRAU-FILMES-2026-09-04.md` §6/8 procura `mode|plan|type` e diz que nenhum evento distingue compra. O gravador real `app/api/stripe/webhook/route.ts:507–515` usa `source=stripe_webhook`, `checkout_mode`, `tier`, `stripe_subscription_id`, `pack`. Campos já introduzidos no histórico de Git em `88eac903` (15/07); não é funcionalidade faltante nesta janela.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 04/09 22:10:11.863070 UTC:** no público externo canônico, 9 eventos com modo subscription, tier B2C, sessão e subscription_id, todos com valor positivo: basic 3, starter 4, pro 2. Outros 4 eventos externos legados (06–12/07) não têm source/mode/tier/sessão/valor canônicos. Legado fica desconhecido, não assinatura nem avulso inferidos.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 04/09 22:11:01.360737 UTC:** os 17 eventos totais se decompõem em 13 eventos / 12 pessoas externas canônicas; 3 eventos / 2 pessoas fora dessa seleção; 1 evento sem pessoa. Não chamar 17 eventos de 17 clientes, não somar grupos de pessoas por plano sem dedupe, não usar exclusão parcial por nome como se fosse a canônica.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 04/09 22:10:58.899384 UTC:** primeiras assinaturas B2C registradas por pessoa = 9 no histórico. Linhas de vídeo criadas antes dessa compra e hoje com status completed: zero → 3 pessoas; uma → 3; duas/três → 1; quatro ou mais → 2. Não são nove vendas desta sprint, nem nove assinaturas ativas hoje. Contagem usa `videos.created_at` e status atual completed, não timestamp histórico de entrega; uploads/Animate/Images/Audio não estão nesse indicador. Portanto não prova que a pessoa já havia recebido esses arquivos ao pagar.
- **LIMITE CAUSAL:** essa distribuição não demonstra que retenção causa compra nem que ela seja inútil. Não comparar taxa de quem pagou contando filmes só até o pagamento com não pagantes contando toda a vida da conta como se o tempo de observação fosse igual. Preservar as portas em amostragem; compra explícita continua sem pré-requisito de filme.
- **EXECUTADO, no âmbito da coordenação:** corrigida a leitura do evento e respondido o pedido com SQL agregado reproduzível em `docs/queries/CAIXA-10H-PAGAMENTOS-2026-09-04.sql`; reusar o placar canônico entregue na R1. **NÃO EXECUTAR** alteração redundante do webhook ou backfill inventado. Nenhuma mudança de runtime/UX, cobrança, preço, crédito, banco ou campanha nesta rotação.
- **QUESTÃO PENDENTE:** consentimento/campanhas do piloto ainda sem resposta incorporada; zero destinatários liberados. Publicação documental R3 aguarda gates; registrar SHA/CI/deploy após resultado, sem antecipar aprovação.
- **TESTADO LOCALMENTE na base nova:** TypeScript integral real exit 0; contrato de compra 108/108, entitlement 66/66 e compatibilidade Autopilot 84/84, offline. `git diff --check` limpo. Não confundir esses testes específicos com suíte integral verde do Guardião.
- **RECONCILIAÇÃO DE PUBLICAÇÃO:** primeiro push de integração rejeitado porque main avançou para `c40e3782` durante o gate. Nada sobrescrito. Essa ponta foi incorporada por merge na branch isolada, sem force/rebase de história pública; diff contra main contém somente os três arquivos documentais da R3. TypeScript e as três baterias repetidos, verdes. O diff da entrega completa identificou uma linha vazia extra no EOF do SQL novo que o diff de arquivos ainda não rastreados não mostrara; removida antes do novo gate. Guardião do SHA anterior não é usado para aprovar o novo.

### Próxima jogada

Checkpoint 19:38 continua R3. Reconciliar intenção nova e eventual resposta do Claude. Se houver objeção comercial declarada, escolher correção mínima na superfície existente; se não houver amostra, preservar a variante. Nenhuma quarta porta de série ou novo banner por padrão.

### ✅ O que você precisa fazer

Nada agora. Não há pedido para mudar cobrança nem liberar contato.

### 📋 O que aconteceu

O pedido de mudar o webhook foi desnecessário: assinatura e avulso já têm campos próprios. A entrega resolve uma contradição de medição entre as pistas e evita código duplicado. Placar da sprint segue sem primeira assinatura demonstrada.

## Rotação 4 — 20:08–21:08 BRT — EM EXECUÇÃO

- **EVIDÊNCIA DE PRODUÇÃO / fechamento R3:** SHA `c5c91f0c25c4f8e320130d1b182406aa3bc4e2d2`, Guardião `33924905894` success, deploy `dpl_D8mkrngu9KPv5u4mPUv9UKHGUQ9H` READY com alias www, conferido 04/09 22:20:56 UTC. Evidência pós-push no PR41, comentário 5547106655. Checkpoint 19:38 sem mudança nem nova execução de SQL.
- **FATO CONFIRMADO:** worktree isolada `C:/tmp/usekineo-caixa-10h-r4`, branch `codex/caixa-10h-r4`, base `c5c91f0c`; fetch repetido e fila `origin/main..entrega-atual` vazia às 20:17 BRT. Nenhuma alteração no gerador ou arquivo compartilhado.
- **EVIDÊNCIA DE PRODUÇÃO, SELECT 04/09 23:10:28.269354 UTC:** baseline fixo 38 cadastros, 25 pessoas com filme, 3 no caixa, 0 primeiras assinaturas B2C registradas, 0 avulsos. Ciclo desde 20:08 UTC: 1 cadastro, 1 pessoa com filme, 0 no caixa, 0 primeiras assinaturas, 0 avulsos. Vigia 2h vazio. Não há amostra de nova intenção nem objeção declarada que sustente trocar oferta.
- **FATO CONFIRMADO / fricção escolhida antes de editar:** `app/checkout/cancelled/page.tsx:358–386` oferece primeiro filme e diz que o plano está disponível, mas não renderiza botão para retomar compra nesse ramo. Os callers de `startSavedCheckout` estão no ramo irmão; o rodapé também leva ao Studio. O teste anterior verifica a existência da função, não sua acessibilidade nesta variante. Nenhuma perda de cliente atribuída sem trilha correspondente.
- **HIPÓTESE:** manter a criação como primário, mas restaurar uma saída secundária para o plano escolhido, permite compra explícita sem pré-requisito de filme. Mudança mínima reversível: somente esse ramo B2C da tela existente, usando `startSavedCheckout`/latch já existentes, fallback `/pricing`, pending e erro visíveis. Autopilot excluído. Nenhum preço, crédito, oferta ou promessa nova.
- **MÉTRICA / EVENTO:** reusar `checkout_cancelled_trial_delivery_offered`, retry por tier e `checkout_started`; resultado final primeira assinatura B2C confirmada no webhook, por pessoa externa. A exposição atual não garante impressão visual e não será vendida como tal. Diagnóstico de implementação terá teste executando a página/ramo e clique; não confundir clique mockado com cliente.
- **GATE DE PARADA / RISCO:** abortar se houver checkout disparado na montagem, duplicação de lançamento, perda de seleção/parâmetros ou alteração de Autopilot/CTA de filme. Antes/depois desktop/mobile obrigatório. Gate comercial: não reeditar por baixa amostra; aguardar pelo menos 20 pessoas externas expostas e 7 dias de observação para avaliação direcional, sem alegar significância estatística. Risco residual é distração do trial, mitigada por CTA secundário sem novo destaque comercial.
- **IMPLEMENTADO / TESTADO LOCALMENTE:** apenas 24 linhas adicionadas à página de cancelamento. O novo caller usa a função existente; metadata categórica `recovery_primary` permite separar esse ramo B2C sem identificador pessoal; demais ramos mantêm metadata anterior. `app/api/events/route.ts:152–177` aceita metadata existente, sem migration ou segundo gravador. O contrato foi RED antes da correção (saída ausente no ramo renderizado) e GREEN depois: 148/148 verificações. Inclui integração da página real com `useCheckoutLaunch` real, browser IO/timers simulados: duas chamadas de clique produzem uma navegação, um retry e um evento de supressão. Autopilot tem markup, lançamento e telemetria comparados ao baseline. Não é teste de cobrança ou sessão real.
- **REGRESSÕES:** deliver-first 39/39, objection-visibility 77/77, verified-checkout-purchase 108/108, checkout-success-entitlement 66/66, autopilot-checkout-return 36/36. TypeScript integral real exit 0. Nenhuma asserção anterior alterada. Nenhum preço/custo/tabela comercial modificado.
- **PREVIEW PREPARADO, NÃO VALIDADO VISUALMENTE:** `docs/previews/CAIXA-R4-CHECKOUT-CANCELLED-2026-09-04.html` contém antes/depois desktop (680px) e mobile (390px), gerados do JSX real por ReactDOMServer com estado controlado. Links ficam em frames sandbox sem scripts. A abertura do arquivo local no Chrome foi recusada pela política de segurança do navegador; nenhum proxy, CDP, outro navegador ou contorno foi tentado. A análise do markup não substitui inspeção visual.
- **BLOQUEIO DE PUBLICAÇÃO:** código e testes podem subir na branch isolada para revisão, mas **não integrar na main** enquanto a comparação visual estiver pendente. CI/preview de branch não serão chamados de validação em produção. Nenhuma alteração na main desta R4 até esse gate.

### Próxima jogada

Concluir pacote de branch e Guardião; preservar a variante de produção. Checkpoint 20:38 pertence a esta mesma rotação. Na próxima rotação, não reeditar esta superfície: conferir revisão visual e intenção nova, ou trabalhar outra fricção comprovada. Consentimento do piloto continua requisito, sem contato automático.

### ✅ O que você precisa fazer

Conferir o antes/depois preparado quando estiver disponível e confirmar a apresentação, caso a ferramenta de inspeção continue bloqueada. Não rodar batch nem pagamento de teste. Até lá, a main permanece intacta.

### 📋 O que aconteceu

Encontrada e corrigida localmente uma saída de compra escondida para quem tem trial intacto. O primeiro vídeo continua opcional. Testes verdes; comparação visual preparada, mas não inspecionada no navegador. Sem nova assinatura comprovada e sem publicação desta interface em produção.
