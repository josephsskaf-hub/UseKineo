# ROADMAP.md — Prioridades consolidadas

**Data:** 2026-07-27 · **Consolidado pelo CEO** a partir dos 4 relatórios do Ciclo 1, com as contradições entre especialistas já resolvidas.

Nada aqui está autorizado a executar. Ver `DECISIONS.md` §pendente.

---

## 0. CONTRADIÇÕES ENTRE ESPECIALISTAS — resolvidas antes de priorizar

| Contradição | Resolução | Base |
|---|---|---|
| **Dev** alertou possível exposição de `refresh_token` do YouTube. | **Descartado.** `023_channels_lockdown.sql` não declara pendência em lugar nenhum, e o commit HEAD afirma "Aplicado em producao e conferido: grants de anon/authenticated vazios". | Leitura direta do arquivo e da mensagem do commit, 27/07 |
| **Dev** disse "3 pagantes"; **Growth** apontou 3 vs 4; **Data** classificou 4 como confiança alta. | **Adota-se 4 compras avulsas e 0 assinaturas recorrentes.** Continua como Q9. | `push_102_msg.txt` vs `revive/page.tsx:25` |
| **Dev** priorizou segurança de cron; **Growth** priorizou provar o Autopilot; **Data** priorizou resolver a ativação. | **Não são concorrentes — são camadas.** Ordem definida abaixo: barato-e-decisivo primeiro, depois o que muda a estratégia. | — |
| **Design** recebeu ordem de refinar sobre `tailwind.config.js`. | **Ordem estava errada.** A home não usa Tailwind; roda em CSS escopado `.klp`. Registrado em `AGENTS.md` §6.2. | `app/KineoLanding.tsx` |

---

## 1. AGORA — custa minutos, muda a ordem de tudo

Nenhum destes escreve uma linha de código.

| # | Ação | Custo | O que destrava |
|---|---|---|---|
| ~~1.1~~ | ~~Confirmar `CRON_SECRET`~~ ✅ **RESPONDIDA 27/07 — está setada.** Riscos S1 e S2 fechados; os 4 endpoints **não** estão públicos. Correção das 4 linhas vira hardening, não urgência. | — | — |
| **1.1b** | Confirmar se a conta Vercel é **Pro ou Hobby** (Q-A1b) — *pergunta nova, gerada pela resposta de 1.1* | 1 min | Duas decisões de arquitetura foram tomadas para contornar limites do Hobby, e a evidência diz que não se aplicam mais. Se for Pro: o refund sweep sai da carona (mata o ponto único de falha R2), o `send-activation-nudge` volta de 30h para 6h, e há espaço para os 3 crons órfãos |
| **1.2** | 3 queries de schema (Q-A2) | segundos | Se `/revive` está morto e se o SKU de $99 pode cobrar |
| **1.3** | O **"Lote 1 measurement gate" já terminou?** (Q-A3) — a pausa do outbound é deliberada e documentada em código, não acidente. A pergunta é se ela venceu. | 1 pergunta | Se a recuperação de receita está pausada com razão ou por esquecimento |
| **1.4** | Perguntar ao Joseph **qual tela de métrica ele usa** (Q5) | 1 pergunta | Se `/api/admin/ceo` é o conserto de maior valor por linha do repo |

---

## 2. EM SEGUIDA — contar pessoas, não eventos

Com **4 pagantes e ~10 pessoas em checkout**, o volume é baixo o bastante para **contar à mão**. Estas três respostas mudam decisão mais que qualquer código.

| # | Pergunta | Muda o quê |
|---|---|---|
| **2.1** | Ativação real: 128 ou 194? (Q1) | Se o dinheiro vai para produto ou para aquisição — as respostas divergem 2× |
| **2.2** | Quantas **pessoas** abriram checkout? (Q2) | Se o abandono é 92% ou ~60%. Muda o gargalo de lugar |
| **2.3** | Os 4 pagantes: avulso ou assinatura? (Q9) | Se a empresa **já provou** que alguém paga recorrente |

---

## 3. A DECISÃO ESTRATÉGICA — provar antes de vender

**EXP-1 — Uma entrega Autopilot completa no canal do fundador, antes de qualquer venda.**

**Hipótese.** O Autopilot é hoje entregável ponta a ponta (conectar canal → gerar → compor → publicar, 1/dia, 7 dias) sem intervenção manual.

**O que muda.** Nada no código. Um canal controlado é conectado, uma `autopilot_schedule` é criada em 1/dia, e o cron horário roda 7 dias sem ninguém tocar.

**Métrica primária.** Shorts efetivamente publicados em 7 dias. Denominador = 7.
**Secundárias obrigatórias.** `youtube_connect_started → youtube_connected` = 1/1 · duplicatas em `autopilot_runs` = 0 · créditos ≤ 56 dos 60 concedidos · custo real por Short · falhas por causa nomeada.

**Sucesso.** ≥ 6 de 7 publicados, 0 duplicata, 0 estouro de crédito, nenhuma intervenção manual. ⇒ o piloto de $99 pode ser vendido honestamente.
**Fracasso.** ≤ 4 de 7, **ou** qualquer duplicata, **ou** estouro de crédito, **ou** intervenção manual necessária. ⇒ desligar o piloto de $99 e o CTA do `/revive`, e a prioridade da empresa volta para entrega, não aquisição.
**Zona cinza (5 de 7).** Fracasso para venda, sucesso para engenharia. Repete uma vez.

**Por que este e não outro.** É o único experimento cujo fracasso muda o que a empresa faz amanhã, e o único que não gasta um dólar nem um contato de prospect.

> **Vender o piloto de $99 antes disso é vender uma promessa que ninguém verificou. É a maior exposição comercial da empresa hoje.**

---

## 4. CORREÇÕES DE CÓDIGO — em ordem de dependência

| # | Ação | Depende de | Critério de conclusão | Gate |
|---|---|---|---|---|
| **4.1** | Fechar o fail-open de `CRON_SECRET` (4 linhas, `return true` → `return false`) | **1.1** — se a env estiver ausente, setá-la primeiro, senão o refund para | `curl` sem header nos 4 endpoints devolve 401; `send-reminders` continua logando o sweep | editar código + 1 deploy |
| **4.2** | Corrigir `/api/admin/ceo` (preço errado, `starter`/`autopilot` invisíveis, ativação sem filtro de status, sem filtro de interno) | **1.4** | Painel e scripts batem no mesmo número | editar código |
| **4.3** | Agendar **ou apagar** os 4 crons órfãos | **4.1** + decisão de cadência | Cada usuário recebe ≤ 1 e-mail de ciclo de vida por dia, comprovado por query; nenhuma rota de cron sem schedule | **decisão de negócio, não técnica** |
| **4.4** | Estender a medição aos SKUs `mode:'payment'` e ao Autopilot | — | Uma venda de $99 aparece em relatório | editar código |
| **4.5** | `tsc --noEmit` como bloqueio de deploy | árvore em 0 erros | PR com erro de tipo falha o deploy | ⚠️ **trava hotfix se a árvore não estiver limpa** |
| **4.6** | Alerta de falha de render (reusar o padrão do `falAlert`) | 4.1 | Render forçado a falhar produz e-mail em 24h | editar código |

---

## 5. AQUISIÇÃO — depois de EXP-1, nunca antes

| # | Oportunidade | Depende de |
|---|---|---|
| 5.1 | Dar ao **ICP C** (quem quer serviço, não ferramenta) uma porta indexável. Hoje ele só existe em `/pricing` e numa página `noindex`. | EXP-1 |
| 5.2 | Construir a metade que falta do `/revive`: scanner de prospects, renderizador, remetente, supressão. | EXP-1 + **autorização explícita para qualquer envio** |
| 5.3 | Fechar o gap em motor de resposta. O ChatGPT já manda 4× mais tráfego que o Google inteiro e foi a única fonte com checkout. | — (esforço baixo) |

---

## 6. NÃO FAZER AGORA

Registrado para ninguém gastar rodada com isso:

- **Refatoração ampla, limpeza da raiz, extração de módulos, suite de testes.** Feio, mas não custa dinheiro nem quebra usuário.
- **Redesign do site inteiro.** A home está em rodada 2 e o resto do site não é o gargalo.
- **Mídia paga.** Não existe medição de CAC em lugar nenhum do repo. Ligar tráfego pago sem denominador é queimar dinheiro sem aprender.
- **Mais instrumentação.** Já há 125 eventos e 88 sem leitor. A cura não é medir mais; é ler o que já existe e contar pessoas em vez de eventos.
