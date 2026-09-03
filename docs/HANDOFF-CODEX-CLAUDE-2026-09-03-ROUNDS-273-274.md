# HANDOFF CODEX → CLAUDE — ROUNDS 273–274

**Data:** 03/09/2026
**Worktree:** `codex-daily-shorts-feed-v1`
**Branch:** `codex/daily-shorts-ideas-feed-v1`
**Base:** `6dc13ae3eb85c7d28a33ed6567d2cddc09879ed6`
**Estado final:** **VALIDADO EM PRODUÇÃO · RESULTADO COMERCIAL AINDA DESCONHECIDO**

**Commit funcional:** `4272b7fede9ac1b0027c24e9863102c2acb73248`

## 1. Sinal reconciliado e decisão desta rodada

**EVIDÊNCIA DE PRODUÇÃO — Supabase, SELECT somente leitura, 03/09/2026 04:13 UTC, contas internas excluídas:** na faixa equivalente de seis horas, comparada ao mesmo horário do dia anterior, sessões de landing caíram de 102 para 39, sessões atribuídas a ChatGPT de 16 para 5, novos perfis externos de 16 para 7 e pessoas externas com Checkout recorrente de 4 para 2. Pessoas externas com vídeo concluído subiram de 5 para 7.

**EVIDÊNCIA DE PRODUÇÃO — mesma fonte e data:** nas 24 horas móveis, sessões de landing subiram de 256 para 309, novos perfis externos de 32 para 47, pessoas externas com vídeo concluído de 18 para 37, pessoas externas com Checkout recorrente de 5 para 9 e pagamentos exatos de assinatura de 0 para 1. Sessões atribuídas a ChatGPT caíram de 48 para 35.

**CONCLUSÃO:** a desaceleração curta informada pelo fundador é real, mas não prova regressão causal nem queda do funil inteiro nas 24 horas. A ação desta rodada não reeditou home, Checkout, preço, trial nem o loop ChatGPT que ainda coleta amostra. Atacou uma superfície livre: distribuição passiva e recorrente.

**DECISÃO APROVADA PELO FUNDADOR:** observar sem agir não basta. Cada rodada precisa escolher uma hipótese causal nova e entregar uma ação reversível quando houver superfície livre; uma intervenção em coleta fica congelada até o gate.

## 2. Ação nova — Kineo Shorts Idea of the Day em RSS

**HIPÓTESE:** transformar o widget diário já existente em um feed RSS descobrível cria uma nova porta orgânica recorrente para criadores e automações, sem outra landing, desconto, anúncio ou comunicação externa. Cada item volta para o gerador gratuito com a ideia preenchida.

**IMPLEMENTADO LOCALMENTE:**

- nova rota pública `GET /shorts-ideas.xml`, com sete itens diários;
- autodiscovery RSS no `<head>` global;
- inventário e rotação agora compartilhados entre widget e feed;
- rotação contínua entre anos, preservando exatamente a programação de 2026 do widget;
- cada item abre `/free-script-generator` com o tópico exato preenchido;
- contrato UTM fechado: `utm_source=kineo_daily_feed`, `utm_medium=rss`, `utm_campaign=daily_shorts_ideas_v1`, `utm_content=YYYY-MM-DD`;
- feed e metadata descrevem cada ideia como **prompt de pesquisa** e exigem verificar fatos antes de publicar;
- rota dinâmica na origem e cache CDN de uma hora, sem `stale-while-revalidate` que atravesse a virada do dia;
- nenhum banco, fornecedor, segredo, render, e-mail, anúncio, IndexNow ou recrawl.

**SEM MUDANÇA VISUAL:** JSX, estilo e CTA do widget ficaram iguais; houve extração da lista, metadata mais honesta e link invisível no `<head>`. A exigência de comparação antes/depois não se aplica.

## 3. Medição fail-closed

**IMPLEMENTADO LOCALMENTE:** relatório manual agregado `daily_shorts_ideas_subscription_v1` e coletor separado.

Uma pessoa só entra na coorte quando:

1. a landing tem source, medium, campaign e path exatos;
2. a sessão do navegador resolve para exatamente um usuário externo;
3. o perfil tem a mesma primeira origem/campanha e nasceu no momento ou depois da primeira landing;
4. nenhuma evidência futura, sem relógio, conflituosa ou interna é usada.

Checkout terminal usa o contrato canônico de Stripe Session. `has_paid` isolado não significa assinatura; compra de pacote fica diagnóstico. Receita exige `payment_success` da mesma Stripe Session canônica de `checkout_started`, sem misturar moedas e sem expor ID, e-mail, browser session ou Stripe ID.

**GATE COMERCIAL:** pelo menos 20 pessoas externas maduras, 5 pessoas maduras com Checkout terminal e sete dias individuais de observação. Sessões de landing são diagnóstico, nunca pessoas. Até o gate, a classificação permitida é **IMPLEMENTADO/DESCOBRÍVEL**; tráfego, adoção, conversão ou assinatura permanecem **DESCONHECIDOS**.

**FREEZE:** não reeditar feed, widget, lista ou destino antes do gate. A próxima rodada deve atacar outro estágio do funil.

## 4. Gates técnicos e auditoria

**TESTADO LOCALMENTE:** 669/669 verificações executáveis:

- feed: 187/187;
- relatório feed → pessoa → Checkout → assinatura: 116/116;
- outcome canônico: 33/33;
- ledger de assinatura: 31/31;
- destinos de afiliado: 266/266;
- remix público: 36/36.

**TESTADO LOCALMENTE:** três auditorias independentes terminaram GO, P0=0 e P1=0. Um auditor encontrou look-ahead histórico em perfis; a publicação foi barrada, a query ganhou `created_at <= generatedAt`, o builder passou a rejeitar `profile_future`, e o caso adversarial foi adicionado antes do GO final.

**TESTADO LOCALMENTE:** `git -c core.whitespace=cr-at-eol diff --check` limpo. Typecheck preserva somente três erros do baseline fora do escopo: duas versões da API Stripe e `Promise<Promise<T>>` em `TrialDowngradeModal`.

**LIMITAÇÃO DE BUILD:** a compilação do Next concluiu; a coleta de dados falhou em `/api/generate-avatar` porque a worktree isolada não recebeu `OPENAI_API_KEY`. Nenhum segredo foi lido. O erro é de ambiente e está fora deste escopo.

## 5. Arquivos e fronteiras

- `app/layout.tsx`
- `app/widget/embed/page.tsx`
- `app/shorts-ideas.xml/route.ts`
- `lib/growth/dailyShortIdeas.ts`
- `scripts/daily-shorts-ideas-subscription-report.mjs`
- `scripts/measure-daily-shorts-ideas-subscription.mjs`
- `scripts/test-daily-shorts-ideas-feed.mjs`
- `scripts/test-daily-shorts-ideas-subscription-report.mjs`

**FORA DO ESCOPO:** render, cenas, voz, legendas, créditos, preço, trial, SKUs, Checkout, oferta, banco e comunicação externa.

**RISCO P2 NÃO BLOQUEANTE:** constantes do gate aparecem no módulo TypeScript e no relatório MJS; o coletor é manual e pagina o inventário histórico. Não existe caller ou cron, portanto não há custo de runtime.

## 6. Próxima rodada, sem repetição

**SUGESTÃO:** trocar deliberadamente de estágio e lado do funil. Não tocar novamente no RSS nem no loop ChatGPT. A próxima ação deve ser B2B ou ativação de afiliado, com entrega executável e métrica de assinatura canônica.

## 7. Validação pós-deploy

**VALIDADO EM PRODUÇÃO — `www.usekineo.com`, 03/09/2026:**

- `GET /shorts-ideas.xml` respondeu 200 e `application/rss+xml`;
- XML válido com exatamente sete itens;
- primeiro item contém topic preenchido e source, medium, campaign e data exatos;
- o destino do item respondeu 200;
- a home publicada contém autodiscovery para `/shorts-ideas.xml`;
- o cache observado no navegador HTTP foi `public, must-revalidate`; a Vercel consumiu `s-maxage` como diretiva da CDN.

**CLASSIFICAÇÃO:** a infraestrutura está **VALIDADA EM PRODUÇÃO** e o feed está **DESCOBRÍVEL**. Aquisição, adoção, Checkout e assinatura continuam **DESCONHECIDOS** até o gate comercial.
