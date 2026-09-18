# Receita — concluir a intenção mensal, 18/09/2026

## Decisão e escopo

**DECISÃO DO FUNDADOR (mensagem desta sessão):** "Preciso de receita, pensa, le, olha nossos concorrentes olha coisas novas e faz, executa me traz mais mmr". Execução pontual da A1 previamente aprovada em `BOARD-TRES-ACOES-2026-09-16.md`, não renovação de automação nem autorização de contato. Não foi criada outra campanha, preço, desconto, promessa, cron ou render.

**FATO CONFIRMADO / anti-repetição:** A1 já existia localmente em 153866ed e não estava na main 71b29094. A entrega desta rodada é destravar sua verificação/publicação, não anunciar a ideia como nova. Cherry-pick isolado em `codex/board-receita-20260918`, worktree `C:/kineo-wt/board-receita-20260918`, commit de produto ff55b5306bf818e40f68984a3c5db0d0548e5d11. Não trouxe TRIAL10 nem o pacote visual de Citações.

**FATO CONFIRMADO:** `app/pricing/page.tsx:49` resolve a modalidade antes do HTML; `lib/growth/pricingPlanChoiceAttribution.ts:15` reconhece as duas campanhas mensais existentes e o parâmetro billing; `app/pricing/PricingClient.tsx:411` inicializa a seleção e `:620` preserva o billing no destino. Entrada comum continua anual; o comprador pode mudar depois. Cupom, desconto efetivo e elegibilidade continuam pertencendo ao servidor.

## Evidência que orientou a escolha

**EVIDÊNCIA DE PRODUÇÃO — leitura de events/profiles em 18/09, janela fechada [17/09 04:30Z, 18/09 04:30Z):** 7 pessoas externas identificadas com pricing_view; 3 com checkout_started; 4 com download; nenhum payment_success nessa janela. Contas internas excluídas pelo catálogo real de `lib/internalAccounts.ts`. São contagens independentes por etapa, não uma coorte encadeada nem uma taxa de conversão; visitantes anônimos não viram pessoas identificadas por inferência.

**EVIDÊNCIA DE PRODUÇÃO:** 1 subscription_invoice_paid de USD 990 centavos às 17/09 17:30:48.918317Z, billing_reason=subscription_cycle. É renovação, não novo assinante ou aumento de MRR. Uma falha de cobrança observada era renovação recusada por insufficient_funds; não é prova de falha técnica no checkout de aquisição. Sem reconciliação integral de Stripe, estornos e todas as assinaturas nesta rodada, não se declara MRR total nem receita líquida.

**HIPÓTESE:** corrigir campanha mensal que chega ao anual reduz surpresa no último passo. Não há prova de que esses 3 checkouts tenham sofrido este defeito, nem promessa de que A1 gerará vendas.

## Concorrentes consultados, sem copiar oferta

**FATO PÚBLICO OBSERVADO EM 18/09:** [Fliki](https://fliki.ai/pricing) e [OpusClip](https://www.opus.pro/pricing) destacam exportação sem marca e benefícios de plano; [InVideo](https://invideo.io/pricing/) relaciona capacidade a tipos de vídeo e oferece orientação de plano. Não comparar clipe bruto com filme pronto, nem atribuir conversão superior sem dados.

**SUGESTÃO / escolha aplicada:** a Kineo já possui comparações de saída, prova de vídeo, Plan Fit e retomada. Criar outra camada seria duplicação; a prioridade segura foi fazer a intenção comercial existente chegar intacta ao pagamento. A2 (piloto Lite) permanece dependente de entrega comprovada e A3 de parceiro concreto; nenhuma proposta antiga foi vendida como resultado.

## Verificação de 18/09

**TESTADO LOCALMENTE em ff55b530:** 354/354 campanha mensal; 26/26 atribuição; 39/39 tier handoff; 29/29 sticky mobile; 68/68 public promo truth; 36/36 home pricing checkout; `npx tsc --noEmit --incremental false` código 0; diff check limpo. Não se alega suíte inteira verde.

**TESTADO LOCALMENTE / navegador Next real:** 1280×900 desktop e 390×844 mobile. FIRST50 e COMEBACK50 chegaram em mensal; alternância manual para anual e retorno mensal funcionaram; `/pricing` sem query manteve anual. Clique Starter local produziu `/api/stripe/checkout?tier=starter&billing=monthly&promo=COMEBACK50&intro=1`, confirmado no log HTTP. A rota recusou por chave Stripe ausente, intencionalmente: não se criou sessão Stripe nem pagamento. Supabase local fictício, sem ler `.env.local`, sem credenciais produtivas.

**LIMITES DA VERIFICAÇÃO:** houve um SyntaxError no chunk de desenvolvimento durante a troca de servidor local; não se repetiu depois de recarregar, quando botões e navegação funcionaram. Aviso TikTok de content_id e 503 do resume local sem credencial foram registrados, não ocultados como sucesso financeiro. A verificação não comprova desconto real ou compra autenticada na Stripe.

**TESTADO LOCALMENTE / comparação visual:** HTML autocontido do JSX real, com seis pares (duas campanhas + entrada comum, desktop/mobile), regenerado com CSS local. Inspeção lado a lado dos seletores e preços antes/depois, sem desalinhamento introduzido. Artefato final em `C:/Users/josep/Documents/Codex/2026-09-18/board-receita/comparacao-campanhas-mensais.html`. Fixture histórica isola efeitos/mídia, usa fonte de fallback e free-tier OFF; não é mock de toda a oferta atual. A navegação Next foi adicionalmente conferida com reverse trial ON e 10 créditos. Não foi alterado design.

**FATO CONFIRMADO / segurança:** MMR esclareceu que a recusa anterior de browser pertencia a outro arquivo de Citações (prova Seedance). A1 nunca tinha sido aberta. Não foi reaberto, hospedado ou contornado o artefato recusado; o navegador aceitou a aplicação Next e a comparação A1 local. Nenhuma restrição global foi desativada.

## Resultado, risco e próximo gate

**IMPLEMENTADO / publicação:** usar enfileirar + bat com os dois SHAs completos depois da conferência final da fila. SHA de deploy e evidência do domínio serão acrescentados após READY; neste registro pré-publicação ainda não são fatos.

**RISCO:** a rota passa a depender da query no servidor; validar HTML do deploy, cache por modalidade e hidratação. Rollback limitado aos três arquivos de produto deste patch, preservando alterações posteriores. WELCOME20 citando motor pausado e divergências antigas da tabela/moeda são pendências separadas já conhecidas; não foram corrigidas nem agravadas deliberadamente por A1.

**MÉTRICA / próximo gate:** preservar esta variante até 20 pessoas externas identificadas expostas a campanhas mensais ou revisão em 7 dias, o que ocorrer primeiro; amostra menor fica inconclusiva. Medir por pessoa pricing_view → clique com billing mensal → checkout_started → primeiro pagamento confirmado, respeitando janela temporal e atribuição disponível. Se campanha não for identificável no evento, classificar desconhecido; não atribuir toda receita ao patch. Parada imediata para modalidade incorreta, regressão de navegação/hidratação ou cobrança divergente. Nenhum novo evento foi fabricado.

**RECEITA NOVA ATRIBUÍDA À ENTREGA:** ainda não demonstrada. Correção publicada não equivale a venda. Nenhum e-mail, mensagem de venda ou compra foi executado.

## Fechamento de publicação — 18/09 04:42–04:44 UTC

**VALIDADO EM PRODUÇÃO:** fila segura e bat publicaram `bda79eb69acbff2519ea47b320a99572be643e9e` sobre `71b290942cd084b57a68cccd66ee82fb4ca35a6e`. Vercel `dpl_H1CAW5ovdEowgGXuxwnikcuQo8S5` READY; SHA exato e alias `www.usekineo.com` conferidos pela integração. Build completou em 53 s conforme log da Vercel; não equivale ao tempo total de deploy.

**VALIDADO EM PRODUÇÃO / navegador:** `/pricing?promo=FIRST50` abriu em mensal no desktop; troca manual para anual mostrou o total anual; `/pricing?promo=COMEBACK50` abriu em mensal a 390 px; `/pricing` comum manteve anual. Sem overlay de erro e sem erro/aviso de console observado no recorte desses testes de produção. Nenhum botão de compra foi acionado em produção; sessão Stripe, desconto e pagamento final não foram testados. Não se afirma ausência global de erro no site.

**COORDENAÇÃO:** MMR avisado da tomada de A1; diário e PEDIDOS registram que não deve reaplicar 153866ed/271cf295. Servidor de desenvolvimento encerrado, comparação autocontida mantida fora do produto. Não se renovou rotina nem se enviou contato externo. Próxima avaliação comercial usa o gate acima; não reabrir A1 só porque faltou amostra nos primeiros minutos.

**MÉTODO:** skill `kineo-receita-comprovada` guiou anti-duplicação e separação entre renovação/primeira compra; revisão React/Next preservou estado inicial de servidor e escolha manual; verificação de navegador e deployment exigiu evidência visual/READY antes de declarar a entrega no ar.
