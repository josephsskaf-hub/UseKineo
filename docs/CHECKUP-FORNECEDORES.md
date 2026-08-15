# CHECK-UP DIÁRIO DE FORNECEDORES
# Ordem permanente do fundador (12/08/2026): capacidade e tendência ANTES do sintoma.
# Método: consumo real medido no Supabase (cqqukkvjjrguayiyjvhh). Creatomate pela fórmula
# do medidor oficial (lib/creatomateQuota.ts): px×fps×segundos/1e8 × overhead 1,115.
# Vereditos: VERDE >14 dias de folga · AMARELO 7–14 dias ou tendência de estouro · VERMELHO <7 dias ou falhando.

## 15/08/2026 — 🔴🔴 A PROTEÇÃO NÃO PEGOU. Os dois vermelhos continuam vermelhos.

**Este é o primeiro check-up que existe para verificar a decisão do fundador de 14/08
(ligar auto-reload da OpenAI e auto top-up do fal). Fui conferir nos painéis: NENHUMA
das duas está protegendo a empresa hoje.** Uma não foi salva, a outra está configurada
e não disparou. Nenhuma recarga foi comprada — o saldo dos dois caiu mais um dia.

| Fornecedor | Veredito | Medida (fonte: painel oficial lido hoje) | Conta |
|---|---|---|---|
| **OpenAI** | 🔴 **VERMELHO — 0,8 DIA** | **Saldo $1,56** (ontem $3,07 = −$1,51/24h). **Auto-reload aparece CONFIGURADO: "quando o saldo chegar a $10, recarregar para $25, limite mensal $100"** | 1,56 ÷ 1,51 = **0,8 dia → zera hoje/amanhã**. **E aqui está o problema real: o saldo está ABAIXO do gatilho de $10 há mais de 24h e a recarga NÃO disparou.** Ou o cartão está recusando, ou o limite mensal de $100 já foi atingido, ou a configuração não foi salva de fato. Sem banner de erro no painel. OpenAI está no `scripting` de TODO vídeo → saldo zero = produto parado inteiro (incidente 31/07, 116 falhas). **Ação: comprar $50 manualmente AGORA e abrir "Manage auto-reload" para conferir cartão + limite mensal. Decidir HOJE, 15/08.** |
| **fal.ai** | 🔴 **VERMELHO — 2,4 DIAS** | **Saldo $25,74** (ontem $36,61 = **−$10,87/24h**) · mês $182,49 (ontem $171,61) · **Auto top-up: "Disabled"** | 25,74 ÷ 10,87 = **2,4 dias → zera 17–18/08**. **O auto top-up que o fundador ligou em 14/08 aparece DESABILITADO no painel — não foi salvo.** Última compra de crédito: **11/08, $40** — nada em 12, 13, 14 nem 15. O alerta por e-mail do fal segue em $10 = menos de 1 dia de aviso. **Ação: comprar $200 (≈66 vídeos Seedance) e ligar auto top-up (gatilho $50 / recarga $100), conferindo que o botão "Enable auto top-up" foi de fato salvo. Decidir até 17/08.** |
| Creatomate | 🟢 VERDE — ~59 dias | **Painel oficial: 2,6K de 30,0K (9%)** | Ritmo 464 cr/dia no ciclo (24h: 583). Renova 10/09 (26 dias); projeção do ciclo ≈ 14.700 → sobra ~51%. **Minha estimativa pelo banco deu 2.778 vs 2,6K do painel — 4ª validação seguida do fator 1,115.** |
| Supabase Storage | 🟢 VERDE — ~66 dias | Banco bruto **94,86 GB** (7.777 obj.) × 0,503 calibrado = **~47,7 GB de 100 GB (ESTIMATIVA)** | Ontem 93,28 bruto → +1,58 GB/dia bruto ≈ 0,79 GB/dia cobrado. Folga ~52 GB. Maior bucket segue `broll` — alvo do GC se apertar. |
| Resend | 🟢 VERDE (piso) | **48 e-mails** no ledger de trial em 24h, de 100/dia. 14 cadastros em 24h | **Não consegui medir o total real:** só `trial_emails_log` é mensurável; os crons send-video-ready/recovery/reminders não registram. Painel exige login. Total real entre 48 e ~100. |

**Saúde do produto agora (para calibrar a urgência):** 20 renders em 24h (16 fast + 4 cinematic_ai, 95 créditos), 18 vídeos concluídos, **11 erros de geração em 48h e ZERO por quota/saldo**. Os motivos são `analyze_threw`/`generate_script_threw` com `TypeError: Failed to fetch` (aborto de rede do cliente), `analyze_blocked_active_render_gate` e `compose_daily_free_limit` — todos esperados. **O produto está de pé. É exatamente por isso que este aviso vale: ainda dá tempo.**

**Ação recomendada (ordem de urgência):**
1. **HOJE, 15/08 — OpenAI $50 manual.** Não espere o auto-reload: ele já teve 24h para disparar e não disparou.
2. **Ainda hoje — abrir "Manage auto-reload" da OpenAI e confirmar cartão válido e limite mensal não estourado.** Se o limite de $100/mês foi atingido, é ele que está bloqueando a recarga.
3. **Até 17/08 — fal.ai $200 e ligar o auto top-up de novo, conferindo que salvou.**
4. Dinheiro é sempre a mão do fundador — não comprei nada.

**O insight deste check-up (e é diferente do de ontem):** ontem a conclusão foi "liga as
auto-recargas que essa classe de falha acaba". Hoje o painel mostra que **ligar não é o
mesmo que estar ligado** — uma das duas não salvou e a outra está configurada e não
dispara. Uma proteção que ninguém confere é uma proteção que a empresa *acredita* ter,
e acreditar ter é pior do que saber que não tem: some a vigilância e o saldo continua
caindo. **Por isso a verificação diária da configuração — não só do saldo — passa a ser
item fixo deste check-up.** O custo dessa verificação é uma leitura de painel por dia;
o custo de não fazer foram 33 horas fora do ar em 09–11/08.

**Não consegui medir:** total de envios do Resend fora do ledger de trial (painel exige
login, crons sem ledger); e a causa exata do auto-reload da OpenAI não disparar (o painel
não mostra o motivo sem abrir o modal de gestão, que é área de cartão de crédito — não entro).

---

## 14/08/2026 — 🔴🔴 DOIS VERMELHOS, e o pior deles é NOVO

**Mudança de método a partir de hoje: os painéis oficiais foram lidos direto no navegador
(fal.ai, Creatomate, OpenAI). Não são mais estimativas.** Foi assim que o item mais grave
apareceu — e ele não estava em nenhum radar nosso.

| Fornecedor | Veredito | Medida (fonte) | Conta |
|---|---|---|---|
| **OpenAI** | 🔴 **VERMELHO — 1,6 DIA** | **Painel oficial: saldo $3,07 · auto-reload OFF · gasto $30,92 em 30/07–14/08 = $1,93/dia** | 3,07 ÷ 1,93 = **1,6 dia → zera 15–16/08 (amanhã ou sábado)**. OpenAI está no estágio `scripting` de **TODO** vídeo: saldo zero = produto parado inteiro, que é literalmente o incidente de 31/07 (116 falhas). **Auto-reload OFF é a mesma configuração daquele dia.** Ainda de pé: 0 falhas de quota nas últimas 24h. **Ação: comprar $50 (~26 dias) e LIGAR auto-reload. Decidir HOJE, 14/08.** |
| **fal.ai** | 🔴 **VERMELHO — 3,0 DIAS** | **Painel oficial: saldo $36,61 · média do próprio fal $12,26/dia · mês $171,61** | 36,61 ÷ 12,26 = **3,0 dias → zera ~17/08 (domingo)**. Confere com ontem: $48,63 → $36,61 = **−$12,02 em 24h**. **A recarga recomendada ontem NÃO foi feita** (última compra: 11/08, $40). Auto top-up OFF. O alerta de e-mail do fal está em $10 — **menos de 1 dia de folga, toca tarde demais**. **Ação: comprar $200 (≈66 vídeos Seedance) ou ligar auto top-up (gatilho $50, recarga $100). Decidir até 16/08.** |
| Creatomate | 🟢 VERDE — ~56 dias | **Painel oficial: 2,1K de 30,0K (7%)** | Ritmo 467 cr/dia no ciclo (24h: 520). Renova 10/09 (27 dias); projeção do ciclo ≈ 15.600 → sobra ~48%. **Minha estimativa pelo banco deu 2.195 vs 2,1K do painel — o fator 1,115 acertou pela 3ª vez.** O medidor de cota está confiável. |
| Supabase Storage | 🟢 VERDE — ~78 dias | Banco bruto 93,28 GB (7.632 obj.) × 0,503 calibrado = **~46,9 GB de 100 GB (ESTIMATIVA)** | Ontem 91,92 bruto → +1,36 GB/dia bruto ≈ 0,68 GB/dia cobrado. Folga ~53 GB. Maior bucket: `broll` 62,86 GB (3.790 obj.) — alvo do GC se apertar. |
| Resend | 🟢 VERDE (piso) | 49 e-mails no ledger de trial em 24h, de 100/dia | **Não consegui medir o total real:** só `trial_emails_log` é mensurável; os crons send-video-ready/recovery/reminders não registram. Painel exige login — não faço login. Total real entre 49 e ~100. 12 cadastros em 24h. |

**Ação recomendada (ordem de urgência):**
1. **HOJE:** OpenAI — comprar $50 **e ligar auto-reload**. É o único fornecedor cuja queda para tudo.
2. **Até 16/08:** fal.ai — comprar $200 **e ligar auto top-up** (gatilho $50 / recarga $100).
3. Dinheiro é sempre a mão do fundador — não comprei nada.

**O insight que este check-up entrega, e que vale mais que os dois números:**
os dois vermelhos têm **auto-recarga DESLIGADA**, e é isso — não o saldo — que é a causa raiz
dos três incidentes (31/07 OpenAI, 09/08 Creatomate, e agora). Saldo baixo é um evento que
volta todo mês; recarga manual é uma decisão humana que precisa acontecer no dia certo, todo
mês, para sempre. **Ligar as duas auto-recargas aposenta esta classe inteira de falha** e vale
mais do que qualquer alarme que a gente escreva — inclusive este check-up. Os $250 de recarga
não são gasto novo: é o mesmo dinheiro que já seria gasto, pago antes do apagão em vez de depois.

**Correção de custo unitário (ESTIMATIVA, mas material para preço):** o painel do fal marca
**$171,61 no mês** contra ~$85 que os renders `cinematic_ai` do banco projetam a $2,07 cada —
**razão ~2,0×**, igual à de ontem (1,9×). Parte é Veo/Kling/voice-clone fora do Seedance, mas
o Seedance sozinho deu ~$3,21/render ontem contra $2,07 no `docs/UNIT-ECONOMICS-2026-08-03.md`.
**O custo real de um vídeo de IA está ~55% acima do que a nossa conta de margem usa.** Vale
refazer a conta antes da próxima decisão de preço.

**Não consegui medir:** total de envios do Resend (painel exige login; crons sem ledger).

## 13/08/2026

| Fornecedor | Veredito | Medida | Conta |
|---|---|---|---|
| **Supabase Storage** | 🟢 VERDE (corrigido 13/08) | **Painel oficial: 46,2 GB de 100 GB (46%)** | Minha soma de `storage.objects` dava 91,9 GB — o painel de billing (fonte oficial) mostra 46%. Folga ~54 GB; crescimento bruto ~3,1 GB/dia → **~17 dias** no pior caso. Maior bucket: `broll` 62 GB no banco (3.744 objetos) — é o alvo se precisar limpar. Discrepância banco×painel anotada para investigar. |
| Creatomate | 🟢 VERDE | ~1.675 de 30.000 cr no ciclo (desde 10/08) | Ritmo 7d ≈ 751 cr/dia → ~37 dias de folga; renova 10/09; projeção do ciclo ≈ 22K < 30K. Estimativa via fórmula validada (razão 1,115). |
| **fal.ai** | 🔴 **VERMELHO (painel conferido 13/08)** | **Saldo $48,63 · queima $12,71/dia → ~3,8 dias (zera ~17/08)** | Painel oficial: ciclo já em $159,59 (Seedance $131,49 + Veo $20 + voice-clone $6 + Kling $2,10). Minha estimativa pelo banco ($82,80) subconta ~2×: só vê renders Seedance concluídos — ajustar fator nos próximos check-ups (real ≈ 1,9× o estimado). **Ação: recarregar créditos (sugestão $150–200 ≈ ciclo inteiro) ou ligar auto-recharge. Decidir até 15/08.** Dinheiro = mão do fundador. |
| OpenAI | 🟢 VERDE | 0 falhas quota/openai em 24h | Motivos de falha 24h: analyze_blocked_active_render_gate (7), analyze_threw (3), compose_not_ok (2) — nenhum de saldo. Saldo não legível daqui. |
| Resend | 🟢 VERDE (c/ ressalva) | ≥50 e-mails em 24h (piso medido) de 100/dia | Só trial_emails_log é mensurável no banco; crons send-video-ready/recovery/reminders não registram → total real entre 50 e 100. 20 cadastros/24h; um dia de pico tipo TAAFT estoura o limite diário. |

**Ação recomendada:** nenhuma urgente após correção pelo painel (46%). Fundador confirmou visualmente o painel em 13/08. Manter vigilância diária: se o painel passar de 70%, limpar o bucket `broll` (62 GB medidos no banco) antes de pensar em plano.

**Discrepância banco × painel — explicada e tratada em código (sprint 10h, 13/08).**
Razão medida: **46,20 ÷ 91,92 = 0,503** — o banco lê ~2x o cobrado. A pista já
estava no repo: a §4 de `docs/BROLL-ORPHANS-2026-08-08.md` provou que
`storage.objects` é o **ÍNDICE** do arquivo, não a fonte da verdade dele (os
bytes vivem no S3, resolvidos por `bucket/name/version`), então índice e bytes
podem divergir. Hipótese não confirmada: linhas de índice cujos bytes não estão
mais no S3. **O alarme novo (`lib/supplier/storageCapacity.ts`) já nasce
calibrado por essa razão**, mostra os dois números em todo alerta e é
recalibrável pela env `KINEO_STORAGE_BILLED_RATIO` sem deploy. Regra que fica:
*medida de fonte não-oficial vira ESTIMATIVA declarada, nunca veredito.*

**Não consegui medir:** saldo fal.ai, saldo OpenAI, envios Resend fora do trial ledger (fontes sem API/da parte não logada). E-mail de alerta via Resend **não enviado**: RESEND_API_KEY local é placeholder (7 chars) — alerta entregue via notificação da tarefa + rascunho no Gmail.

**Achado de segurança (advisor Supabase):** tabela `public.trial_revive_backfill_20260811` está com **RLS desligado** — legível/gravável por qualquer um com a anon key. Corrigir com `ALTER TABLE public.trial_revive_backfill_20260811 ENABLE ROW LEVEL SECURITY;` (e policies, ou dropar se era só backfill).
