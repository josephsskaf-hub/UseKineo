# HANDOFF CODEX → CLAUDE — ROUNDS 279–280

**Data:** 03/09/2026
**Workstream:** B2B · afiliado → briefing de cliente → atribuição observável
**Branch:** `codex/affiliate-client-brief-relay-v1`
**Base:** `468d786c436e424c236f5a5fec638d7e7be9abc7`
**Commit funcional:** `9156897505f38c89fd5943f95c221325e6a7e65d`
**Estado:** **VALIDADO EM PRODUÇÃO · RESULTADO COMERCIAL DESCONHECIDO**

## 1. Regra operacional adicionada pelo fundador

**EVIDÊNCIA INFORMADA PELO FUNDADOR — 03/09/2026, sem contagens exatas anexadas:** o fundador observou queda de tráfego, novas contas e Checkouts em relação ao período anterior.

**QUESTÃO PENDENTE:** não há, neste handoff, janelas alinhadas e contagens por pessoa externa que permitam atribuir a queda a uma entrega específica. O Answer-engine Hook Workbench anterior foi aditivo: não substituiu a home, os vídeos públicos nem uma rota existente.

**DECISÃO OPERACIONAL:** medir serve para escolher a próxima ação; a sprint só conta como entrega quando executa uma mudança nova e mensurável. Não repetir a mesma superfície antes do gate mínimo de amostra. Não transformar coincidência temporal em causa sem relógios alinhados.

## 2. Hipótese e ação publicada

**FATO CONFIRMADO — código:** `/client-video-brief-generator` já tinha um botão `Copy client intake link`, mas sempre copiava o link genérico. O programa de afiliados já tinha redirecionamento, cookie, first-touch e prova de clique em `/a/[code]`.

**HIPÓTESE:** permitir que um afiliado ativo entregue ao cliente uma ferramenta útil e gratuita pelo próprio link cria distribuição B2B mensurável sem nova landing, desconto, outreach ou anúncio.

**IMPLEMENTADO E VALIDADO EM PRODUÇÃO:** Affiliate-attributed client brief relay.

- afiliado ativo, confirmado por preload somente leitura, copia `/a/{CODE}?to=client_brief`;
- visitante anônimo, afiliado inativo, resposta pendente ou falha de rede copia imediatamente o link genérico já existente;
- o clique nunca espera rede e preserva o gesto de clipboard;
- o endpoint novo é somente leitura e não reutiliza `/api/affiliate/me`, porque esse GET possui efeito colateral de criação de cupom Stripe;
- o destino recebe exatamente `affiliate / partner / affiliate_client_brief`;
- somente a tríade completa é classificada como `affiliate_client_intake`;
- o evento fechado de cópia não inclui texto do cliente, código, URL, e-mail, UTM ou PII;
- o destino oculto não cria uma quinta campanha no dashboard de afiliados;
- não houve mudança visual, de copy, layout ou estilo.

## 3. Verdade comercial fail-closed

**IMPLEMENTADO / TESTADO LOCALMENTE:** coletor paginado somente leitura e relatório agregado de sete dias.

O relatório conta pessoas externas afiliadas, nunca eventos como pessoas. Um clique elegível exige prova server-side não-preview posterior à cópia e ligada ao mesmo afiliado. O seed de cópias começa sete dias antes da janela de 30 dias apenas para explicar cliques de fronteira; ele não entra no denominador nem no numerador da coorte.

**GATE:** coletar até cinco afiliados externos maduros por sete dias. Sucesso mínimo: ao menos uma prova de clique server-side elegível. Parar e redesenhar se cinco afiliados maduros produzirem zero prova. Pagamento permanece `unknown_for_this_relay`: esta entrega não atribui assinatura ao botão sem cadeia causal suficiente.

## 4. Verificação e auditoria

**TESTADO LOCALMENTE:** 807/807 verificações:

- relay, privacidade, classificação e bordas: 111/111;
- briefing curto: 107/107;
- destinos de afiliado: 272/272;
- atribuição: 91/91;
- relatório de funil: 45/45;
- assinatura business por afiliado: 118/118;
- missões do funil: 63/63.

**TESTADO LOCALMENTE:** três auditorias independentes terminaram GO, P0=0 e P1=0. Elas encontraram e fecharam antes da publicação: colisão com `app/api/admin/**`, classificação orgânica incorreta, espera de rede no gesto de clipboard, ausência de relatório executável e falso órfão na borda móvel de 30 dias.

`git diff --check` limpo. O typecheck preserva exatamente três erros preexistentes e fora do escopo: `app/api/admin/_shared/mrr.ts:113`, `app/api/me/subscription/route.ts:83` e `components/TrialDowngradeModal.tsx:334`.

**COMPARAÇÃO VISUAL:** não aplicável; zero linha visual foi alterada.

## 5. Deploy e smoke

**VALIDADO EM PRODUÇÃO — Vercel, 03/09/2026:**

- deployment `dpl_HyHp98aZi8jtdPh9yqo9m4eqNQTj`;
- target production, estado READY, alias `www.usekineo.com`, sem erro de alias;
- SHA servido `9156897505f38c89fd5943f95c221325e6a7e65d`;
- `/api/affiliate/client-brief-link` anônimo respondeu 200 com `eligible:false`;
- `/client-video-brief-generator` respondeu 200;
- Vercel Runtime Errors nas rotas do relay, uma hora: zero;
- nenhum link real de afiliado foi forçado, portanto nenhum clique, render, crédito, Checkout ou pagamento foi fabricado no smoke.

## 6. Arquivos

- `app/a/[code]/route.ts`
- `app/api/affiliate/client-brief-link/route.ts`
- `app/client-video-brief-generator/ClientVideoBriefGenerator.tsx`
- `lib/affiliateDestinations.ts`
- `lib/growth/affiliateClientBriefRelay.ts`
- `lib/growth/clientShortBrief.ts`
- `scripts/affiliate-client-brief-relay-report.mjs`
- `scripts/measure-affiliate-client-brief-relay.mjs`
- `scripts/test-affiliate-client-brief-relay.mjs`
- `scripts/test-affiliate-destinations.mjs`
- `scripts/test-client-short-brief.mjs`

**FORA DO ESCOPO:** render, cenas, voz, legenda, crédito, preço, SKU, Checkout, admin, banco, migration e comunicação externa.

## 7. Próxima alternância

Não reeditar o relay nem o Hook Workbench antes dos respectivos gates. A próxima ação deve atacar outro estágio do B2C ou uma superfície de distribuição ainda não usada, preservando home e aquisição ChatGPT. A queda relatada pelo fundador deve ser reconciliada por pessoas externas e janelas idênticas antes de qualquer rollback; até lá, é sinal operacional, não causa provada.
