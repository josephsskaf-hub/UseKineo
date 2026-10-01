# Sprint MRR — corte inicial

**EVIDÊNCIA DE PRODUÇÃO — consulta SELECT em 01/10/2026.** Janela de eventos/cadastros [01/09/2026 06:00 UTC, 01/10/2026 06:00 UTC). Fonte: Supabase cqqukkvjjrguayiyjvhh, SQL e resultados agregados nesta pasta. Agregação no PostgreSQL, sem paginação/truncamento de 1.000 linhas, sem nomes/e-mails de clientes nos artefatos.

| Etapa | Pessoas da coorte de cadastro | Limite da régua |
|---|---:|---|
| Cadastro | 681 | profiles.id distintos; padrões internos de lib/internalAccounts.ts excluídos via NOT EXISTS |
| Abriu /studio | pelo menos 467 | algum evento de browser com session_id; não existe evento universal de abertura |
| Digitou ideia | desconhecido | nenhum evento histórico comprova este gesto; analyze_idea_clicked inclui outros caminhos |
| Abriu /studio/create | 542 | generate_page_view, não equivale a /studio |
| Apertou gerar | 444 | generate_started com session_id; não somar video_generation_started |
| Primeiro vídeo entregue | 372 | linha completed com URL válida; estado na leitura, criada na janela |
| Segundo vídeo entregue | 100 | duas linhas elegíveis de vídeos por user_id |
| checkout_started | 70 | user_id e session_id; qualquer modalidade |
| payment_success | 6 | pessoas, não os eventos nem tentativas |
| Primeira assinatura positiva | 6 | payment_success, checkout_mode=subscription, amount_total>0, nenhum pagamento anterior dessa modalidade |

**EVIDÊNCIA DE PRODUÇÃO.** Os conjuntos acima são etapas observadas na mesma coorte, não um funil artificialmente monotônico: 368 dos 444 que geraram têm vídeo; quatro pessoas com vídeo não têm generate_started registrado. Na janela completa, incluindo contas cadastradas antes, há sete compradores distintos e oito payment_success: seis assinaturas e uma pessoa com dois avulsos. Não somar esses sete aos seis da coorte. Seis compradores da janela pagaram antes do primeiro vídeo registrado. Não condicionar venda a já ter recebido vídeo.

**QUESTÃO PENDENTE / DESCONHECIDO.** videos não tem delivered_at. created_at delimita a linha, não prova instante exato de entrega; completed/URL é estado observado na leitura. MRR vigente, cancelamentos e retenção não foram inferidos desses eventos. Identidade é profiles.id/events.user_id; contas de uma mesma pessoa não ligadas pelo sistema continuam uma limitação.

**EVIDÊNCIA DE PRODUÇÃO.** Perdas observáveis: cadastro→gerar: 237/681 (34,8%); primeiro→segundo vídeo: 272/372 (73,1%), maior perda absoluta entre etapas consecutivas confiáveis; checkout→compra: 64/70 (91,4%), maior perda relativa. Compras podem anteceder vídeos: isso não é prova causal de onde a receita se perde. A coorte com pelo menos sete dias tem 537 cadastros, 388 geradores, 328 primeiros vídeos, 92 segundos vídeos e cinco compradores, reduzindo o viés dos recém-chegados.

**FATO CONFIRMADO.** studio_tiles_shown depende de myVids.length>0 (app/(dashboard)/studio/StudioClient.tsx); não mede quem tem zero vídeos. A fonte é COALESCE(NULLIF(signup_utm_source,''),NULLIF(utm_source,''),'unknown'). A campanha nominal está em signup_utm_campaign: o schema não possui uma segunda coluna profiles.utm_campaign; não inventá-la. Metadados de evento podem complementar campanha, nunca identidade.

## Alavancas e contas de cenário

**HIPÓTESE, não previsão/efeito medido.** A pedido explícito do fundador, estimativas transparentes usando o volume observado de 30 dias e fator 7/30. Os percentuais de recuperação abaixo são suposições de planejamento, não resultados de teste. Valores fracionários representam expectativa de cenário, não pessoas observadas.

1. Prova comercial + valor em filmes: recuperar 10% das 62 pessoas que abriram checkout de assinatura e não se tornaram novas assinantes → 62 × 0,10 × 7/30 = **1,45 novos pagantes/semana**. Implementação pequena no /showcase com provas já públicas e planos derivados; o tráfego desta rota nova é desconhecido, portanto 1,45 é cenário do problema de valor, não previsão atribuível à rota.
2. Ideia→gerar com custo visível: recuperar 20% dos 237 sem Generate e aplicar a taxa observada 6/444 de nova assinatura entre geradores → 237 × 0,20 × 6/444 × 7/30 = **0,15/semana**.
3. Segundo filme: recuperar 10% dos 272 sem segundo vídeo, com a mesma taxa-proxy 6/444 → 272 × 0,10 × 6/444 × 7/30 = **0,086/semana**. Menor prioridade: já há portas de episódio/continuação; não duplicar.

**DECISÃO APROVADA / execução do mandato.** Implementar as duas primeiras, instrumentar a origem /showcase e seu acesso na vitrine existente. Não há base para prometer 10–15 pagantes/dia com este volume. Não alterar preço, motores ou trilhos de pagamento. Porta de tema pronto adiada: preserva a ideia própria e evita competir com entradas já existentes sem régua.

## Régua depois

**IMPLEMENTADO, ainda não validado em produção.** Studio: mrr_studio_viewed → mrr_idea_entered → mrr_generate_clicked, metadata.version=mrr_studio_20261001_v1, variant=near_idea/control. Fonte do user_id é o sink autenticado, session_id é trackEvent; texto da ideia nunca entra na metadata. Repetições são deduplicadas por user_id na análise.

**IMPLEMENTADO, ainda não validado em produção.** Showcase: mrr_showcase_door_viewed/clicked, mrr_showcase_viewed/first_gesture/plans_clicked, version=mrr_showcase_20261001_v1. Preservar UTMs e engine no caminho Studio→cadastro; não confundir visitantes anônimos/session_id com pessoas distintas. Cadastros atribuídos exigem identidade resolvida; anônimos não resolvidos são reportados à parte.

**QUESTÃO PENDENTE / DESCONHECIDO.** Não existe amostra anterior dessa instrumentação nem rota /showcase no commit base. Não declarar melhora por comparar zero telemetria histórica com eventos novos. Comparação por pessoa exige versão de exposição e denominador comum, além de idade equivalente da coorte; sem isso, manter “amostra insuficiente”. Publicação/deploy e resultados posteriores ainda pendentes.
