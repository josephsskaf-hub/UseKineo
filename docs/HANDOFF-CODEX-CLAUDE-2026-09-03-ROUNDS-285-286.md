# HANDOFF CODEX → CLAUDE — ROUNDS 285–286

**Data:** 2026-09-03 · **Trilha:** Growth (B2B → assinatura) · **Estado:** validado em produção

## Sinal e regra operacional

- **QUESTÃO PENDENTE / DESCONHECIDO (relato do fundador, 2026-09-03 09:15 BRT):** o fundador percebeu menos entradas e menos Checkouts no painel, mas não forneceu uma nova contagem em janelas alinhadas. Isso é sinal operacional, não prova de regressão causada por um deploy.
- **EVIDÊNCIA DE PRODUÇÃO (handoff 283–284, Supabase SELECT, 2026-09-03 06:37 BRT):** a queda curta então medida estava concentrada em TAAFT; ChatGPT ficou quase estável e Checkout não tinha caído naquela janela.
- **DECISÃO APROVADA:** Growth mede vitória por assinatura e receita reais. Observação deve terminar em ação; relatório, landing, CTA ou hipótese repetidos não contam como nova rodada. A regra está canônica em `docs/workstreams/GROWTH.md`.

## Anti-duplicação e hipótese

- **DUPLICADA / NÃO EXECUTAR:** calendário ICS B2B, mais uma landing informativa, formulário aberto de lead ou outra calculadora. Essas mecânicas já existem ou não provam passagem humana até pagamento.
- **NOVA:** ponte de decisão fechada entre quem avalia Kineo e quem precisa aprovar uma avaliação limitada.
- **HIPÓTESE:** parte do B2B não precisa de mais argumento público; precisa transformar avaliação informal em uma decisão explícita, devolvível e mensurável antes de abrir planos.

## Entrega

`/business-pilot-review` permite:

1. montar uma nota factual com três escolhas fechadas: uso, cadência e papel do revisor;
2. preparar o handoff por share nativo, clipboard ou fallback manual;
3. o revisor escolher `approve_limited_evaluation`, `needs_changes` ou `not_now`;
4. preparar uma resposta fechada de volta ao responsável;
5. abrir planos somente quando a decisão for aprovação limitada.

Limites visíveis e técnicos:

- não coleta nome, e-mail, empresa, briefing ou texto livre;
- não cria contrato, roteamento, certificação, SLA, ROI, portal, assentos ou white-label;
- não afirma que um asset preparado foi entregue;
- não toca em render, crédito, preço, plano, SKU, checkout ou comunicação externa;
- a ferramenta entrou como último card em `/tools`, sem reordenar experimentos congelados;
- entrou no sitemap e no catálogo factual usado por `/llms.txt`.

## Medição e verdade financeira

O relatório `b2b_subscription_truth_v8` exige a cadeia exata:

1. chegada válida no modo reviewer ou resposta aprovada;
2. decisão explícita de avaliação limitada;
3. persistência confirmada da chegada e, no reviewer, da decisão;
4. clique em planos;
5. `pricing_view` posterior na mesma browser session;
6. Checkout recorrente do mesmo dono externo;
7. pagamento pela mesma Stripe Session e mesmo dono.

Falha fechado para URL marcada aberta diretamente, ausência de chegada, ordem invertida, browser/dono diferentes, metadata inválida, clique do builder, `needs_changes`, `not_now`, decisão ausente e persistência em timeout.

**LIMITAÇÃO P2 DECLARADA:** sem token ou PII, o sistema não pareia remetente e destinatário. `response_received` prova que um asset de resposta foi aberto, não que uma pessoa específica o recebeu nem que a organização aprovou.

## Gates

- **TESTADO LOCALMENTE:** 458/458 verificações (85 + 192 + 14 + 167).
- **TESTADO LOCALMENTE:** typecheck com somente 3 erros preexistentes (`mrr.ts`, `me/subscription/route.ts`, `TrialDowngradeModal.tsx`); zero erro novo nos arquivos da entrega.
- **TESTADO LOCALMENTE:** build compilou anteriormente; a coleta local parou apenas pela ausência de `OPENAI_API_KEY` numa rota alheia. Nenhum segredo foi lido.
- **TESTADO VISUALMENTE:** preview autocontido desktop/mobile, fallback manual e resposta do revisor em `docs/previews/BUSINESS-PILOT-REVIEW-V1-2026-09-03.html`; captura Chrome isolada em `C:/Users/josep/AppData/Local/Temp/kineo-b2b-decision-bridge-preview.png`.
- **AUDITORIA INDEPENDENTE:** anti-duplicação, funil e multiformato deram GO; zero P0/P1 remanescente.

## Produção

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO:** commit funcional `865959653737f2e61cb59e16e8f5ec2db13c2607`; `origin/main` idêntico no push.
- **VALIDADO EM PRODUÇÃO (Vercel, 2026-09-03):** deploy `dpl_Hg9S5dZeEgJX1gNLNDVMKU5Sqxmf`, READY, Next.js, alvo production, alias `www.usekineo.com`, SHA exato e sem erro de alias.
- **VALIDADO EM PRODUÇÃO (HTTP, 2026-09-03):** `/business-pilot-review`, `/tools`, `/sitemap.xml` e `/llms.txt` respondem 200 e contêm as novas superfícies esperadas.
- **VALIDADO EM PRODUÇÃO (observabilidade, 2026-09-03):** zero grupo de erro runtime nas quatro rotas nos 30 minutos consultados.

## Freeze e próximo ataque

- Congelar `app/business-pilot-review/**`, `lib/growth/businessPilotReview.ts` e a campanha `business_pilot_review_pricing_v1` até 10 pessoas externas identificadas abrirem o modo reviewer, 7 dias completos ou a primeira Stripe Session recorrente exata, salvo P0/P1 comprovado.
- Próxima ação deve mudar de mecanismo e estágio: B2C pós-primeiro-vídeo ou recuperação de Checkout, não outra landing, calculadora, relatório ou CTA B2B.
- Reconciliar a queda relatada somente com janelas de relógio idênticas, pessoas externas e decomposição por fonte; sem isso, não atribuir culpa ao último deploy nem fazer rollback.
