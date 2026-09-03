# workstreams/GROWTH.md — Growth & Acquisition

**Leia antes:** `AGENTS.md` → `docs/PROJECT_STATE.md` → `docs/PRODUCT_AND_OFFER.md` → `docs/METRICS_AND_FUNNEL.md` → este arquivo.

---

## REGRA OPERACIONAL ATUAL — 03/09/2026

**DECISÃO APROVADA PELO FUNDADOR:** o placar de Growth é assinatura e receita real, em B2C e B2B. Tráfego, cadastro, vídeo, clique e Checkout são etapas; nenhum deles é vitória financeira sozinho.

**DECISÃO APROVADA PELO FUNDADOR:** observação precisa terminar em uma decisão executável. Uma rodada de trinta minutos deve entregar uma ação nova e reversível quando houver evidência e uma superfície livre. Quando um gate ainda não tem amostra, preserve a variante e ataque outro estágio do funil. Repetir relatório, landing, CTA ou hipótese já instrumentada não conta como uma nova ação.

**REGRA DE EXECUÇÃO:** antes de editar, declare hipótese, mudança mínima, evento, métrica, gate de parada e risco. Depois, publique e valide quando autorizado. Se a evidência contradizer a hipótese, registre a contradição e mude de direção; não fabrique atividade alterando a mesma tela novamente.

**DECISÃO APROVADA PELO FUNDADOR — 03/09/2026:** Growth precisa executar, não apenas observar. Um relatório só conta como rodada quando remove uma incerteza que bloqueava a ação e termina em `executar`, `não executar` ou `mudar de direção`. A rodada seguinte realiza essa decisão; repetir leitura, relatório ou variação cosmética não é progresso.

**REGRA ANTI-MESMICE:** antes de agir, classificar a mecânica e a superfície como `NOVA`, `PARCIAL` ou `DUPLICADA` contra os handoffs em gate. `DUPLICADA` não sobe. `PARCIAL` só sobe se acrescentar um mecanismo causal novo e mensurável, sem reiniciar o relógio de outro experimento. O portfólio alterna distribuição, ativação, retorno, oferta, checkout, afiliados e B2B; não transforma dez landings ou dez relatórios na aparência de dez estratégias.

**REGRA DE AÇÃO DISTRIBUÍDA — 03/09/2026:** uma entrega só conta como ação de Growth quando alcança uma superfície com pessoas reais ou executa uma mudança operacional autorizada. Rota, landing, relatório, card ou artefato sem caller, distribuição ou denominador humano é preparação — não ação. Cada rodada deve terminar com uma destas saídas explícitas: `EXECUTADO`, `NÃO EXECUTAR` ou `PIVOTAR PARA`; se terminar em diagnóstico, a mesma rodada precisa nomear a ação desbloqueada, seu dono e o gate. Superfícies em amostragem ficam congeladas, e o próximo ataque muda de mecanismo ou estágio do funil.

**REGRA DE QUEDA:** uma queda curta vira sinal operacional, não culpa automática do último deploy. Comparar janelas de relógio idênticas, pessoas externas e fonte antes de rollback. Confirmada a queda, a resposta deve reduzir a dependência encontrada ou corrigir a regressão provada — nunca apenas produzir outro painel.

**FOCO DO CICLO ATUAL:** 50% B2C no caminho primeiro vídeo → valor percebido → Checkout recorrente → pagamento; 50% B2B no caminho descoberta → proposta/escopo → Checkout → pagamento. Contar pessoas externas distintas e reconciliar receita pela mesma Stripe Session.

> As seções datadas de 27/07 abaixo são histórico do diagnóstico daquela data. Elas não substituem esta regra operacional nem os handoffs canônicos mais recentes.

---

## OS 4 PILARES
1. **ICP** — para quem vender, região, perfil, capacidade de pagar, sinais de necessidade, critérios de exclusão.
2. **Oferta e mensagem** — problema, valor, **promessa permitida**, diferenciais, objeções, CTA, copy.
3. **Aquisição** — outbound, e-mail, redes, Google, SEO, conteúdo, anúncios, parcerias, landing pages, afiliados.
4. **Métricas** — oportunidades, contatos, **respostas humanas**, respostas positivas, checkout, pagamento, receita, CAC, conversão entre etapas.

> Growth não existe para publicar conteúdo. Growth existe para descobrir um **caminho previsível e mensurável** de aquisição.

---

## GATE DE COMUNICAÇÃO — absoluto
**Nenhum e-mail, mensagem, outreach ou follow-up sai sem autorização explícita do Joseph. Nem rascunho.**

Os scripts `npm run growth:*` tocam produção via service-role. **Leia o código deles; não execute sem autorização.**

---

## O GARGALO ATUAL (consolidado, 27/07)

**Não há oferta viva para o público que já chega.**

O produto de maior margem (Autopilot $299 / piloto $99) **não é vendido em nenhuma superfície de aquisição** — a home não menciona Autopilot. As ~106 URLs do sitemap apontam todas para o funil self-serve, cujo histórico é 4 pagantes em 713 cadastros.

Diagnóstico do próprio fundador: *"o problema nunca foi o tráfego nem o preço: é que a Kineo vende uma FERRAMENTA para pessoas que não querem operar ferramenta nenhuma."*

**Descartado como gargalo principal:** falta de tráfego · ativação (18% concluem, latência 2,3 min não bloqueia).

---

## TRÊS ICPs INCOMPATÍVEIS
Ver `PROJECT_STATE.md` §6. O resumo: o ICP que paga ($99–299) é o único sem nenhuma porta indexável, e os ICPs A e C se anulam comercialmente — quem chega por "free AI shorts generator" tem disposição a pagar próxima de zero, por construção.

**Sinal de canal:** ChatGPT manda 4× mais tráfego que o Google inteiro e foi a **única fonte com checkout** (2 de 4 cadastros, contra TAAFT com 0 de 17).

---

## O QUE VOCÊ NÃO CONSEGUE MEDIR HOJE
Crítico, ver `METRICS_AND_FUNNEL.md` §3. Resumo:
- Nenhum script mede Autopilot, piloto $99, `/revive` ou conexão de YouTube
- Todo o funil comercial só conta `mode:'subscription'` — **uma venda de $99 é invisível**
- `measure-growth-funnel` para no PUSH #77; tudo de #78 a #103 não tem coorte
- Nenhuma medição de CAC em lugar nenhum

---

## REGRA DE NÚMERO
Ver `AGENTS.md` §5. O essencial: **conte pessoas, não eventos.** Nunca some janelas diferentes. Sem fonte e data, é hipótese. "Sem evidência" é resposta melhor que estimativa.

---

## PRÓXIMO EXPERIMENTO APROVADO PARA PROPOSTA
**EXP-1 — provar uma entrega Autopilot ponta a ponta antes de qualquer venda.** Detalhe completo em `ROADMAP.md` §3. Nenhuma ação de aquisição deve rodar antes dele.
