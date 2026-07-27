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
| **4.3** | Agendar os 4 crons órfãos — **plano detalhado em §4.3-bis abaixo** | nada (é seguro com o flag desligado) | Os 4 aparecem no painel da Vercel executando e devolvendo `paused` | editar `vercel.json` + 1 deploy |
| **4.4** | Estender a medição aos SKUs `mode:'payment'` e ao Autopilot | — | Uma venda de $99 aparece em relatório | editar código |
| **4.5** | `tsc --noEmit` como bloqueio de deploy | árvore em 0 erros | PR com erro de tipo falha o deploy | ⚠️ **trava hotfix se a árvore não estiver limpa** |
| **4.6** | Alerta de falha de render (reusar o padrão do `falAlert`) | 4.1 | Render forçado a falhar produz e-mail em 24h | editar código |

---

---

## 4.3-bis — LIGAR A RECUPERAÇÃO DE RECEITA EM 4 PASSOS REVERSÍVEIS

Contexto: 713 cadastros, 4 pagantes. Três máquinas de recuperação existem no código e nunca dispararam. Conta Vercel é **Pro**, então não há limite de cron atrapalhando.

A sequência abaixo separa "colocar no ar" de "começar a enviar", para que nenhum passo mande e-mail antes de você decidir.

**Passo 1 — Agendar os 4 órfãos com o flag DESLIGADO. Risco zero.**
Os 3 crons de e-mail checam `KINEO_LIFECYCLE_EMAILS_ENABLED` e retornam cedo. Agendados com o flag off, eles rodam e devolvem `paused` — **nenhum e-mail sai**. Serve para provar que o agendamento funciona e aparecer no painel.
Cadências que o próprio código pede: `send-recovery` a cada 2h (`:10`) · `send-activation-nudge` de hora em hora (`:9`) · `send-video-rescue` diário · `refresh-viral-now` diário.

**Passo 2 — Desfazer os contornos de Hobby.** Cron próprio para o refund sweep (mata R2) e `send-activation-nudge` de 30h de volta para 6h.

**Passo 3 — Adicionar a única guarda que falta: supressão cruzada.**
Cada job já é "1 por usuário para sempre" com coluna própria, mas nenhum enxerga o do outro. Falta uma trava de "mínimo 24h entre qualquer dois e-mails de ciclo de vida por usuário". Sem isso, alguém que se encaixe em vários critérios recebe ~4 e-mails no mesmo dia.

**Passo 4 — Virar o flag.** Uma variável de ambiente. Reversível em segundos. **Só depois de responder se o "Lote 1 measurement gate" terminou** (Q-A3).

**Critério de conclusão:** nenhum usuário recebe mais de 1 e-mail de ciclo de vida por dia, comprovado por query em `events`; nenhuma rota de cron fica no repo sem schedule.

---

## 5. AQUISIÇÃO — depois de EXP-1, nunca antes

| # | Oportunidade | Depende de |
|---|---|---|
| **5.0** | **EXP-G2 — listar o pacote no marketplace. Ver §5-bis. É a prioridade de aquisição.** | licença TTS ✅ resolvida · autorização do fundador |
| 5.1 | Dar ao **ICP C** (quem quer serviço, não ferramenta) uma porta indexável. Hoje ele só existe em `/pricing` e numa página `noindex`. | EXP-1 |
| 5.2 | Construir a metade que falta do `/revive`: scanner de prospects, renderizador, remetente, supressão. | EXP-1 + **autorização explícita para qualquer envio** |
| 5.3 | Fechar o gap em motor de resposta. O ChatGPT já manda 4× mais tráfego que o Google inteiro e foi a única fonte com checkout. | — (esforço baixo) |

---

## 5-bis — EXP-G2: LISTAR NO MARKETPLACE ONDE A DEMANDA JÁ COMPRA

**Achado que motiva:** a compra de 10–50 Shorts em lote já acontece em Fiverr / Upwork / Kwork, com preço público de $5–35 e bundles de 20/35/60 por mês. **Não precisa criar demanda — precisa aparecer onde ela já está.**

**Hipótese.** Existe demanda real por 10–50 Shorts gerados por IA a $99–$379, encontrável **sem mandar nenhuma mensagem**. Nunca foi testado: nenhum cliente jamais pediu volume (confirmado pelo fundador, 27/07).

**O que muda.** Um anúncio em 3 níveis ($99 / $179 / $249 — o de 50 fica fora da rodada 1 por capacidade), com divulgação de IA no corpo, 3 amostras já renderizadas, entrega em 24h. **A Kineo não inicia nenhuma mensagem: o comprador chega sozinho.**

**Métrica primária.** **Pedidos pagos em 30 dias.** Não impressão, não clique, não mensagem — pedido pago. É a única métrica desta empresa que nunca foi inflada.

**Sucesso.** ≥ 1 pedido pago e entregue com avaliação positiva. **Um único pedido pago é mais evidência comercial do que 713 cadastros produziram.**

**Fracasso.** 0 pedidos em 30 dias com ≥ 500 impressões. ⇒ a $8,30/Short, com escrow e amostra visível, no lugar onde a demanda comprovadamente está, ninguém compra. A conclusão **não é** "mudar a copy" — é que **a tese de atacado está errada** e a empresa deve parar de investir nela. *Este é o valor do teste: ele mata a ideia por ~$0,15.*

**Zona cinza.** Mensagem de comprador > 0 e 0 pedidos ⇒ há interesse, e a barreira é oferta, confiança ou clareza. **Não conta como sucesso** — o histórico é 39 de 39 checkouts expirados.

**Pré-condições.** Licença de TTS ✅ (resolvida — ver `PRODUCT_AND_OFFER.md` §1.3.1) · 3 amostras de conta interna ou com consentimento · capacidade: 30 Shorts × 2,30 min ≈ 70 min de máquina, viável · entrega manual aceitável para 1–3 pedidos, acima disso o gargalo vira humano.

**Por que marketplace antes de e-mail frio.** O escrow e as avaliações substituem a reputação que a Kineo não tem, e **nenhuma quantidade de cold e-mail compra isso**. Listar não é contatar — respeita o gate de comunicação integralmente.

### 🔴 NUNCA usar `usekineo.com` para e-mail frio
`hello@` e `support@usekineo.com` são as identidades de envio de **4 crons de ciclo de vida + 8 rotas admin** via Resend. Queimar esse domínio derruba a máquina de recuperação de receita inteira. Se o volume um dia justificar frio: domínio **separado** (não subdomínio — alinhamento DMARC é organizacional), provedor separado do Resend transacional, SPF+DKIM+DMARC, aquecimento de 2–4 semanas a 10–20/dia.

---

## 6. NÃO FAZER AGORA

Registrado para ninguém gastar rodada com isso:

- **Refatoração ampla, limpeza da raiz, extração de módulos, suite de testes.** Feio, mas não custa dinheiro nem quebra usuário.
- **Redesign do site inteiro.** A home está em rodada 2 e o resto do site não é o gargalo.
- **Mídia paga.** Não existe medição de CAC em lugar nenhum do repo. Ligar tráfego pago sem denominador é queimar dinheiro sem aprender.
- **Mais instrumentação.** Já há 125 eventos e 88 sem leitor. A cura não é medir mais; é ler o que já existe e contar pessoas em vez de eventos.
