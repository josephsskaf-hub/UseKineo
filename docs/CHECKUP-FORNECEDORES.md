# CHECK-UP DIÁRIO DE FORNECEDORES
# Ordem permanente do fundador (12/08/2026): capacidade e tendência ANTES do sintoma.
# Método: consumo real medido no Supabase (cqqukkvjjrguayiyjvhh). Creatomate pela fórmula
# do medidor oficial (lib/creatomateQuota.ts): px×fps×segundos/1e8 × overhead 1,115.
# Vereditos: VERDE >14 dias de folga · AMARELO 7–14 dias ou tendência de estouro · VERMELHO <7 dias ou falhando.
#
# ⚠ DECISÃO FECHADA DO FUNDADOR (16/08/2026) — NÃO REPROPOR:
# **E-mail de alerta está CANCELADO.** Nem nos amarelos, nem nos vermelhos. O canal oficial
# e único é a ENTREGA DIÁRIA AQUI NO CHAT, 1x por dia, SEMPRE COM A TABELA — mesmo que esteja
# tudo verde (não existe mais "se tudo verde, não incomodar": o fundador quer ver a tabela
# todo dia). Isso encerra a linha de alarmes externos: webhook Slack/Discord foi descartado
# em 14/08, e-mail em 16/08. Nada de sugerir canal novo — nem aqui, nem em outro relatório.

## 22/08/2026 — 🔴 O teste do auto-reload da OpenAI é HOJE (sábado, ninguém olhando) · fal: 6º dia no escuro, mas os sintomas ZERARAM · Creatomate: pela 1ª vez NENHUM ritmo fecha o ciclo · Storage devolveu em 24h tudo que o GC ganhou (+9,7 GB)

**Dia frio e limpo no produto (19 cadastros/24h, 16 entregues, ZERO falha de fornecedor em
48h — o cluster de poll-fails de ontem de manhã parou completamente), mas o calendário fez o
trabalho sujo: (1) se a recarga de 19/08 foi o auto-reload de $25, o ritmo medido de −$6,33/dia
coloca o saldo cruzando o gatilho de $10 HOJE, sábado — o teste que decide se a proteção existe
acontece num fim de semana, exatamente o cenário que o check-up de 21/08 avisou; (2) o
Creatomate cruzou uma linha nova: até ONTEM o ritmo de 24h ainda fechava o ciclo com margem
zero — hoje nem ele fecha (14,5 dias de cota para 19 dias de ciclo); (3) o Storage cresceu
+9,7 GB brutos em 24h — o maior salto desde o pico de 17/08 — e devorou os 6 GB que o GC tinha
devolvido ontem, com uma causa nova e identificável: 4 renders Hollywood no mesmo dia.**

| Fornecedor | Veredito | Medida (fonte) | Conta |
|---|---|---|---|
| **OpenAI** | 🔴 **VERMELHO — o gatilho de $10 é cruzado HOJE (projeção) e é SÁBADO** | Banco: **0 falhas quota/openai em 48h** · 16 entregues = 16 scriptings OK · falhas 24h todas de produto (ver nota) | Se a recarga de 19/08 (~22:00Z) foi o auto-reload, o alvo é $25; a −$6,33/dia medidos, hoje ~22:00Z o saldo está em ~$6 — **abaixo do gatilho**. Ou o auto-reload dispara nas próximas horas (primeira prova da história de que ele funciona), ou o incidente #5 acontece no fim de semana, sem ninguém no teclado. **Ação: conferir Billing history HOJE — 2 minutos separam "proteção provada" de "apagão de sábado". Se aparecer cobrança automática de ~$25 hoje/amanhã, anotar aqui e a classe de falha do 31/07 morre.** |
| **fal.ai** | 🔴 **VERMELHO até confirmação — 6º dia sem painel · mas sintomas ZERARAM (melhor sinal em 3 dias)** | Banco: **16 renders IA em 24h** (12 Seedance + **4 Hollywood**) ≈ **~$62/24h ESTIMADOS** (12×$1,97 + 4×$9,50; banco subconta ~1,9× → real pode ser ~$118) · 7d: 130 IA (106 Seedance + 16 Hollywood + 4 H3 + 2 Kling + 2 Veo) ≈ **~$377 ESTIMADOS** · sintomas 48h: **ZERO** `fal_poll_*` (ontem eram 4, com cluster de 3 em 18 min) | O cluster de ontem de manhã — que parecia o prelúdio de 13/08 — sumiu sem deixar rastro: era latência, não aperto. Mas a conta cega só cresce: consumo estimado desde a última leitura real (17/08, $27,67) já passa de **$240**, e os 4 Hollywood de hoje são o dia mais caro de fal da semana ($38 só deles, 61% do dia). **Ação: os mesmos 2 minutos, 6º dia — saldo ≥$200 E linha "Auto top-up" ATIVA no Credit activity.** |
| **Creatomate** | 🟡 **AMARELO forte — LINHA NOVA CRUZADA: nem o ritmo de 24h fecha mais o ciclo · decisão vencida há 2 dias** | Estimativa fórmula validada (razão 1,115): **ciclo ~13.194 de 30.000 (44%)** — 381 vídeos, 19.023s desde 10/08 · 24h: 28 vídeos, 1.667s ≈ **1.156 cr** · média 7d: 294 vídeos, 15.018s ≈ **1.488 cr/dia** | Restam ~16.806 cr para 19 dias de ciclo. Média 7d: **11,3 dias → estoura ~02/09, 8 dias ANTES da renovação (10/09)**. Ritmo de 24h: **14,5 dias → ~05/09 — TAMBÉM antes**. Ontem o ritmo de 24h ainda fechava com margem zero; hoje não existe MAIS NENHUMA hipótese medida em que a cota chega ao dia 10. **Ação: a decisão de plano está vencida desde 20/08 e deixou de ser aposta — é aritmética. Cada dia sem decidir encurta a data de estouro, não a adia.** |
| **Resend** | 🟡 **AMARELO fraco — 4º dia seguido acima de 100 ok sem UMA recusa (21/08 fechou em 184 ok, novo recorde)** | Ledger `email_send_log`: 24h = **187 tentativas, 163 ok** (24 "falhas" = throttle INTERNO hotlead, detail "yield 94/100 (limite 60)" — não é Resend) · por dia UTC: **18/08=116 · 19/08=126 ok · 20/08=163 ok · 21/08=184 ok (recorde) · 22/08=73 parcial, 100% ok** · quebra 24h: ending_soon 60 · downgraded_loss 36 · expired_d5 29 · d0_welcome 25 · hotlead 24 · outros 13 | 4 dias seguidos acima do teto free (100/dia) com **zero 429** — a inferência de plano pago está fechada na prática; só falta o painel dizer QUAL (entrada ~50k/mês; ritmo atual ~6k/mês = folga enorme). **Ação: o mesmo 1 minuto no painel pra riscar o item da lista de vez.** |
| **Supabase Storage** | 🟡 **AMARELO leve — +9,7 GB brutos em 24h, o maior salto fora do pico de 17/08: o ganho do GC durou UM dia** | Banco bruto **121,08 GB** (9.830 obj.) × 0,503 calibrado = **~60,9 GB de 100 GB (ESTIMATIVA)** · vs ontem 111,35 → **+9,7 GB/24h** (broll +5,8 · renders +3,3) | Folga ~39 GB cobrados. No ritmo de HOJE (~4,9 GB cobrados/dia): **~8 dias** — amarelo pela regra. No ritmo pré-pico (1,7/dia): ~23 dias. Um dia não é tendência — mas a causa é estrutural, não aleatória: **4 Hollywood + 12 Seedance no mesmo dia = masters grandes no `renders` + broll novo**, e cada dia bom de vendas repete isso. O GC de ontem provou que funciona; hoje provou que **rodar uma vez não basta**. **Ação: transformar o GC do broll em cron (o pedido de 17/08, agora com prova dos dois lados) — é a única alavanca $0 e ela precisa ser recorrente pra existir.** |

**Saúde do produto:** dia frio e o mais limpo da semana — 16 entregues/24h, 19 cadastros (7d:
286, ~41/dia firme), 17 falhas/24h TODAS de produto (gate trial 4, analyze_threw 3, sem reason 6,
resto pontual), **zero de quota/saldo em 48h e zero sintoma de fal**. Os 2 bugs de compose de
ontem quase sumiram: `compose_not_ok` apareceu 1× (21/08 16:43Z) e a trava C1 não rejeitou
nenhum compose em 24h — seguem merecendo sprint, mas não são incêndio.

**Ação recomendada (nenhuma compra feita por mim — dinheiro é a mão do fundador):**
1. **HOJE, sábado — OpenAI: Billing history + saldo.** O gatilho de $10 é cruzado HOJE pela projeção. É o teste de verdade do auto-reload — e se ele falhar, o apagão é de fim de semana.
2. **HOJE — Creatomate: a decisão vencida virou aritmética.** Nenhum ritmo medido fecha o ciclo; subir o plano ou aceitar estourar ~02-05/09.
3. **HOJE — fal: painel (6º dia).** Sintomas zeraram, mas >$240 estimados queimados desde a última leitura real.
4. **1 min — Resend: confirmar plano e riscar.**
5. **Sprint $0 — GC do broll vira cron.** Ontem ele devolveu 6 GB; hoje o crescimento devolveu o favor. Recorrência ou nada.

**O insight deste check-up:** os 4 Hollywood de hoje mostram que **o Kling 3 virou o maior
consumidor simultâneo de DOIS tanques** — 61% do gasto de fal do dia ($38 de $62) E o grosso do
salto de storage (masters enhanced grandes no `renders`). Isso liga duas pendências que estavam
em listas separadas: a decisão de preço do Kling 3 (150cr vs custo $11-12, parada desde 18/08)
não é só decisão de margem — é decisão de capacidade. Cada Hollywood vendido a preço de hoje
acelera fal E storage juntos. Quando o fundador for decidir 150/180cr/por-segundo, a conta de
fornecedor deveria estar na mesa: **o preço de um produto é também a válvula de vazão dos
tanques que ele consome.**

**E-mail:** não enviado, mesmo com amarelos/vermelhos — decisão fechada do fundador em
16/08/2026 (registrada no cabeçalho deste doc): canal oficial e único é esta entrega diária
com a tabela.

**Não consegui medir:** saldo fal.ai, saldo OpenAI (e se a recarga de 19/08 foi manual ou
auto), plano ativo do Resend — painéis exigem login; sessão agendada sem browser. Vereditos
deles são projeção + evidência indireta do banco, pela regra de 18/08.

## 21/08/2026 — 🔴 5º dia no escuro em fal (sintomas PIORANDO hoje de manhã) · Creatomate: o prazo de decisão VENCEU ontem e ninguém sabe o resultado · e uma boa notícia: o Storage ENCOLHEU 6 GB (alguém limpou)

**O dia esfriou (25 cadastros/24h vs 45; 23 entregues vs 51 — o dia 20 fechou normal após o
apagão), mas os dois pontos abertos continuam abertos: (1) fal segue sem leitura de painel pelo
5º dia E os sintomas cresceram — 4 `poll_retries_exhausted` em 24h, sendo TRÊS em 18 minutos
hoje de manhã (11:20–11:38Z), o pior cluster desde o incidente de 13-15/08; (2) o prazo de
decisão do Creatomate era ONTEM e este check-up não tem como saber se o plano subiu — a única
coisa que dá pra medir é que o ritmo desacelerou (906 cr/24h vs 1.873) e mesmo assim a média 7d
NÃO fecha o ciclo. Fato novo dos bons: o Storage caiu de 117,6 → 111,4 GB brutos em 24h
(broll −4,3 GB) — a primeira redução da história da série; o GC aparentemente rodou.**

| Fornecedor | Veredito | Medida (fonte) | Conta |
|---|---|---|---|
| **fal.ai** | 🔴 **VERMELHO até confirmação — 5º dia sem painel · sintomas PIORARAM hoje** | Banco: **14 renders IA em 24h** (10 Seedance + 3 H3 + 1 Kling) ≈ **~$28/24h ESTIMADOS** (10×$1,97 + 4×~$2; banco subconta ~1,9× → real pode ser ~$53) · 7d: 118 IA (98 Seedance + 12 Hollywood + 4 H3 + 2 Veo + 2 Kling) ≈ **~$339 ESTIMADOS** · sintomas 24h: **4 `poll_retries_exhausted`, 3 deles em 18 min hoje 11:20–11:38Z** (ontem eram 3 espalhados na madrugada) | Consumo estimado desde a última leitura real (17/08, $27,67): **>$180**. O cluster de poll-fails desta manhã é o padrão que precedeu o incidente de 13-15/08 (latência alta → deadline). Pode ser só latência do fal — mas com saldo ilegível há 5 dias, "pode ser" não protege nada. **Ação: os mesmos 2 minutos pedidos há 5 dias — saldo ≥$200 E linha "Auto top-up" ATIVA no Credit activity.** |
| **OpenAI** | 🔴 **VERMELHO até confirmação — a recarga de 19/08 segue sem auditoria e, se foi o auto-reload ($25), zera DE NOVO ~23/08** | Banco: **0 falhas quota/openai em 48h** · 23 entregues = 23 scriptings OK · falhas 24h todas de produto (ver nota) | A recarga de ~22:00Z de 19/08 ergueu o produto, mas ninguém olhou o Billing history: se foi auto-reload, o alvo é $25 — no ritmo medido de −$6,33/dia isso é **~4 dias de tanque → cruza o gatilho de $10 por volta de 22-23/08 e o teste de ontem se repete no fim de semana**. Se foi manual, idem, com a agravante de depender de alguém estar acordado. **Ação (mesma de ontem, agora com data): Billing history + saldo HOJE — o próximo cruzamento do gatilho é em ~2 dias.** |
| **Creatomate** | 🟡 **AMARELO — prazo de decisão VENCEU ontem (20/08) · a média 7d ainda NÃO fecha o ciclo** | Estimativa fórmula validada (razão 1,115): **ciclo ~12.036 de 30.000 (40%)** — 353 vídeos, 17.356s desde 10/08 · 24h: 26 vídeos, 1.306s ≈ **906 cr** (vs 1.873 ontem: −52%) · média 7d: 284 vídeos, 14.191s ≈ **1.406 cr/dia** | Restam ~17.964 cr. Média 7d: **12,8 dias → estoura ~03/09, 7 dias ANTES da renovação (10/09)**. Ritmo de 24h: 19,8 dias → fecha EXATAMENTE na renovação, com margem zero. A desaceleração de hoje é alívio de ritmo, não reposição de tanque (lição de 18/08). Sinal interno: **1 evento `creatomate_quota_hwm` em 48h** — o próprio alarme de high-water-mark do código acordou. **Ação: se o plano subiu ontem, anotar aqui e encerrar; se não subiu, a decisão está VENCIDA e a média 7d continua não fechando o ciclo.** |
| **Resend** | 🟡 **AMARELO fraco — 3º dia seguido acima de 100 sem UMA recusa (20/08 fechou em 163, recorde)** | Ledger `email_send_log`: **203 tentativas/24h, 203 ok, 0 falha** · por dia UTC: **18/08=116 · 19/08=151 (126 ok) · 20/08=163 ok (recorde) · 21/08=88 parcial** · quebra 24h: ending_soon 51 · d0_welcome 47 · expired_offer_d5 42 · downgraded_loss 29 · hotlead_watermark 24 · outros 10 | **163 aceitos num dia de teto free 100, zero 429, pelo 3º dia** — no free isso é impossível; a inferência de plano pago está praticamente fechada. Falta só o painel dizer QUAL plano (o pago de entrada tem teto ~50k/mês; 203/dia = ~6k/mês, folga enorme). **Ação: 1 minuto no painel pra riscar o item de vez.** hotlead_watermark segue em 24/dia — consumo já dimensionado dentro do novo teto se o plano for pago. |
| **Supabase Storage** | 🟢 **VERDE — e ENCOLHEU: −6,2 GB brutos em 24h (primeira queda da série)** | Banco bruto **111,35 GB** (9.636 obj.) × 0,503 calibrado = **~56,0 GB de 100 GB (ESTIMATIVA)** · vs ontem 117,55 → **−6,2 GB com +238 objetos** · broll: **71,82 GB** (4.306 obj., −4,25 GB) · renders: 33,63 GB | Folga ~44 GB. A queda com MAIS objetos = arquivos grandes deletados — o GC do broll (pedido desde 17/08) aparentemente rodou, devolvendo ~2,4 dias de folga só ontem. No ritmo pré-limpeza (~1,7 GB cobrados/dia) a folga é **~25 dias**; se o GC virar rotina, o item sai do radar. **Confirmar se foi o GC ou limpeza manual — se foi o GC, está funcionando e merece cron.** |

**Saúde do produto:** dia frio e limpo — 23 entregues/24h, 25 cadastros (7d: 282, ~40/dia
firme), 31 falhas/8 users, ZERO de quota/saldo. Mas o detalhe das falhas trouxe **2 bugs de
produto novos**: (1) `compose_not_ok: "ent is not defined"` — **ReferenceError em código** no
caminho de montagem, 3× em 20/08 17:40–17:47Z; (2) `"These AI clips do not match their signed
generation"` — a trava C1 do contrato-Hollywood REJEITANDO composes reais, 3× entre 20-21/08.
Os dois merecem sprint: o primeiro é typo que derruba render pago; o segundo pode ser a trava
funcionando (clipe trocado) ou falso positivo — e falso positivo ali bloqueia cliente que pagou.

**Ação recomendada (nenhuma compra feita por mim — dinheiro é a mão do fundador):**
1. **HOJE — fal: painel (5º dia).** O cluster de poll-fails desta manhã é o mesmo prelúdio de 13/08.
2. **HOJE — OpenAI: Billing history.** O próximo cruzamento do gatilho de $10 é em ~2 dias (fim de semana).
3. **HOJE — Creatomate: registrar a decisão** (o prazo venceu ontem; a média 7d não fecha o ciclo).
4. **1 min — Resend: confirmar plano e riscar o item.**
5. **Sprint — os 2 bugs de compose** (`ent is not defined` + falso positivo da trava C1).

**O insight deste check-up:** o Storage entregou a prova de que **a única alavanca que não
depende de cartão — deletar o que ninguém vê — é também a única que já funcionou sozinha**:
6 GB devolvidos em 24h sem decisão, sem painel, sem cartão. Enquanto isso, os quatro itens que
dependem de ALGUÉM ABRIR UM PAINEL acumulam 5, 3, 1 e 3 dias de fila. A lição operacional:
tudo que puder ser resolvido por código agendado (GC, ledger, medidor) sai da fila humana pra
sempre — e a fila humana deveria guardar só o que exige cartão. Vale inverter o esforço: em vez
de pedir painel 5 dias seguidos, gastar um sprint tornando cada leitura de painel DESNECESSÁRIA
(ex.: e-mail de recibo do fal/OpenAI cai numa caixa que o banco lê → saldo vira dado do banco).

**Não consegui medir:** saldo fal.ai, saldo OpenAI (e manual×auto da recarga de 19/08), plano
ativo do Resend — painéis exigem login; sessão agendada sem browser. Vereditos deles são
projeção + evidência indireta do banco, pela regra de 18/08.

## 20/08/2026 — 🔴 ACONTECEU: a OpenAI ZEROU ontem à noite — 4º incidente de fornecedor (2h20 fora), e a recuperação prova que a proteção automática NÃO disparou a tempo

**O que este check-up vinha avisando há 3 dias aconteceu: ontem 19/08, 19:31–21:50 UTC
(16:31–18:50 BRT), a OpenAI ficou sem saldo e o produto quebrou por 2h20 — ~130 eventos de
falha (27 `openai_quota_dead` + 18 degraded + 9 capacity_stop + ~52 cinematic_dispatch + 18
fast_dispatch + 9 script) atingindo 5–8 pessoas no horário de pico da tarde. Depois das 21:50Z,
recuperou de vez: 21 vídeos entregues, ZERO falha de OpenAI hoje. A conta que importa: se o
auto-reload funcionasse, ele dispararia no gatilho de $10 ANTES do zero — o saldo cruzou o
gatilho, zerou, e o produto caiu. Auto-reload que age depois do zero não é proteção. Fora isso:
45 cadastros/24h (268/7d — patamar ~38/dia firme), 51 entregues, e o Creatomate acelerou de
novo (1.873 cr/24h) no dia em que o prazo de decisão do fundador VENCE (hoje, 20/08).**

| Fornecedor | Veredito | Medida (fonte) | Conta |
|---|---|---|---|
| **OpenAI** | 🔴 **VERMELHO — ZEROU ontem (incidente #4, 2h20 fora) · auto-reload REPROVADO no teste real** | Banco: janela 19/08 19:31→21:50Z com 27 `openai_quota_dead` (3 users) + 18 `openai_quota_dead_degraded` + 9 `openai_capacity_stop_early` (5 users) + dispatches mortos em cascata · pós-21:50Z: **21 entregues, 0 falha openai hoje** (rabo de 8 eventos = 1 usuário retentando, não sistêmico) | O teste que o check-up de 16/08 esperava aconteceu sozinho: o gatilho de $10 foi cruzado e **nada segurou o zero** — quem reergueu (recarga ~22:00Z) chegou DEPOIS do apagão. 2h20 vs 14h do incidente 31/07: a diferença foi velocidade humana, não proteção. **Ação HOJE: abrir Billing history da OpenAI — (a) se houver cobrança automática de ~$25 entre 19–22h UTC de 19/08, o auto-reload existe mas dispara TARDE (gatilho $10 é baixo demais pro ritmo atual: subir pra $25+); (b) se a compra for manual/redonda, a proteção é decorativa — reconfigurar e salvar de verdade. E conferir o saldo atual: sem leitura, amanhã pode repetir.** |
| **fal.ai** | 🔴 **VERMELHO até confirmação — 4º dia sem painel · sintomas leves aparecendo** | Banco: **25 renders IA em 24h** (23 Seedance + 1 Hollywood + 1 H3) ≈ **~$57/24h ESTIMADOS** (23×$1,97+$9,50+~$2; banco subconta ~1,9× → real pode ser ~$105) · 7d: 108 IA (92 Seedance + 12 Hollywood + 2 Veo + 1 Kling + 1 H3) ≈ **~$300 ESTIMADOS** · sintomas 24h: **2 `fal_poll_retries_exhausted` (22:43Z e 06:00Z hoje) + 1 `fal_poll_deadline` (23:33Z)**, 1 usuário | Consumo estimado desde a última leitura real (17/08, $27,67): **>$150** — só está de pé com recarga que ninguém confirmou. Os 3 poll-fails da madrugada são o primeiro sintoma em dias — pode ser latência do fal, pode ser começo de aperto. **Ação: o mesmo pedido pelo 4º dia — 2 minutos no painel: saldo ≥$200 E linha "Auto top-up" ATIVA no Credit activity. Ontem a OpenAI mostrou o custo de não abrir o painel.** |
| **Creatomate** | 🟡 **AMARELO forte — o prazo de decisão VENCE HOJE (20/08) e o consumo acelerou** | Estimativa fórmula validada (6 acertos, razão 1,115): **ciclo ~11.132 de 30.000 (37%)** — 327 vídeos, 16.050s desde 10/08 · 24h: 54 vídeos, 2.700s ≈ **1.873 cr** (vs 1.311 ontem: +43%) · média 7d: 274 vídeos, 13.635s ≈ **1.351 cr/dia** | Restam ~18.868 cr. Média 7d: **14,0 dias → estoura ~03/09**. Ritmo de 24h: **10,1 dias → ~30/08**. Renovação 10/09: **faltam 6–11 dias de cota, e a margem só encolhe** (ontem eram 16-18 dias de folga; hoje 10-14). **Ação: a decisão é HOJE — o prazo é o que o próprio fundador fixou em 17/08 e manteve 3 vezes. O incidente de 09/08 (33h fora) foi exatamente esta curva deixada pra depois. Ontem a OpenAI deu o aviso de graça; o Creatomate está fazendo a mesma curva em câmera lenta.** |
| **Resend** | 🟡 **AMARELO — 2º dia seguido acima de 100 aceitos sem UMA recusa (a inferência de plano pago ganhou força; falta o painel confirmar)** | Ledger `email_send_log`: **140 tentativas/24h** · por dia UTC: **17/08=56 · 18/08=116 ok · 19/08=151 (126 ok, 25 "falhas") · 20/08=48 parcial** · quebra 24h: downgraded_loss 37 · d0_welcome 34 · **hotlead_watermark 24 (consumidor NOVO)** · expired_offer_d5 21 · ending_soon 20 · outros 4 | **As 25 "falhas" de ontem NÃO são do Resend**: detail = "yield 62/100 (limite 60)" — é o throttle INTERNO da campanha hotlead se auto-limitando. O Resend em si aceitou 126 num dia (teto free = 100) sem um 429, pelo 2º dia seguido. Free cap real não deixaria passar 116 e 126. **Ação: confirmar o plano no painel do Resend e riscar o item de vez — ou descobrir que estamos vivendo de uma janela de contagem generosa. E o hotlead_watermark é um consumidor novo de 24/dia que ninguém dimensionou.** |
| **Supabase Storage** | 🟢 VERDE — ~23 dias | Banco bruto **117,55 GB** (9.398 obj.) × 0,503 calibrado = **~59,1 GB de 100 GB (ESTIMATIVA)** · +3,5 GB brutos/24h ≈ +1,76 GB cobrados/dia | Folga ~41 GB ≈ **~23 dias no ritmo atual** (era ~33 ontem — o ritmo subiu 35%). Maior bucket: `broll` **76,07 GB brutos** (4.254 obj., +1,6 GB/24h). **Ação $0 segue: GC do broll — devolveria ~1,5 mês de folga sem cartão.** |

**Saúde do produto:** fora da janela do apagão, saudável — 51 entregues/24h, 45 cadastros,
patamar de ~38/dia firme. Mas o dia teve o pior evento de fornecedor desde 09/08: ~130 falhas
em 2h20, todas evitáveis com o saldo que este check-up pede pra conferir há 3 dias.

**Ação recomendada (nenhuma compra feita por mim — dinheiro é a mão do fundador):**
1. **HOJE — OpenAI: Billing history + saldo.** Separar auto×manual na recarga de ~22:00Z de ontem. Se foi manual, o auto-reload segue decorativo e o incidente #4 se repete no próximo ciclo.
2. **HOJE — Creatomate: decidir o plano.** O prazo é hoje e a cota não fecha o ciclo em nenhum ritmo medido.
3. **HOJE — fal: 2 min de painel** (4º dia do mesmo pedido; poll-fails da madrugada são o primeiro sintoma).
4. **HOJE — Resend: confirmar plano** (2 dias >100 aceitos = quase certeza de pago; "quase" não é veredito).
5. **Esta semana, $0 — Storage:** GC do `broll`.

**O insight deste check-up:** o incidente #4 é o primeiro que aconteceu COM o check-up olhando —
e ele mostra o limite exato desta camada: eu vejo a curva, aviso a data, e o apagão acontece
mesmo assim se o painel não for aberto. A camada preventiva detecta; quem protege é a recarga
automática BEM configurada (gatilho dimensionado pro ritmo novo, não pro de julho). O gatilho
de $10 da OpenAI era 5 dias de aviso no tráfego antigo; no atual é meio dia — mesmo funcionando,
dispararia tarde. Regra que fica: **gatilho de auto-recarga se mede em DIAS de consumo, não em
dólares** — e precisa ser re-dimensionado toda vez que o patamar de tráfego muda (é a mesma
lição do 17/08, agora provada com sangue).

**Não consegui medir:** saldo fal.ai, saldo OpenAI e plano ativo do Resend (painéis exigem
login; sessão sem browser) — e por isso não sei separar manual×auto na recarga de ontem: só o
Billing history separa.

## 19/08/2026 — 🔴🔴 3º dia no escuro em fal/OpenAI — e um fato NOVO no Resend: ontem passou de 100/dia SEM uma falha

**41 cadastros em 24h (243 em 7d — o patamar novo de ~35/dia assentou), 43 renders (11 de IA),
35 vídeos entregues, ZERO falha por quota/saldo em 48h. O dia da verdade da OpenAI era HOJE
(projeção de 17/08: zerava 18–19/08) e o scripting está rodando — ou o fundador recarregou, ou
o auto-reload finalmente disparou. Não consigo distinguir daqui (3º dia sem leitura de painel):
pela regra de 18/08, os dois seguem VERMELHOS-até-confirmação. E o Resend entregou um fato que
muda o veredito dele: 18/08 fechou com 116 envios, TODOS ok — acima do teto free de 100/dia
sem UMA recusa, o que só acontece se o plano já for pago (ou o teto não disparou).**

| Fornecedor | Veredito | Medida (fonte) | Conta |
|---|---|---|---|
| **fal.ai** | 🔴 **VERMELHO até confirmação — 3º dia sem painel** | Banco: **11 renders IA em 24h** (todos Seedance) ≈ **~$22/24h ESTIMADOS** (11×$1,97; o banco historicamente SUBCONTA ~1,9× → real pode ser ~$40) · 7d: 77 Seedance + 11 Hollywood + 2 Veo + 1 Kling ≈ **~$278 ESTIMADOS no acumulado** (>$100 → gatilho de conferir painel) · **zero `fal_poll_deadline` em 48h**, zero falha de quota | Ritmo caiu (11 IA vs 19 ontem, 41 no pico). Consumo estimado desde a última leitura real (17/08, $27,67): **>$100** — impossível estar de pé sem recarga. Evidência indireta segue boa (renders completando), mas evidência indireta não é saldo. **Ação: fundador abrir o painel HOJE — confirmar saldo ≥$200 E a linha "Auto top-up" ATIVA no Credit activity. 2 minutos encerram 3 dias de escuro.** |
| **OpenAI** | 🔴 **VERMELHO até confirmação — HOJE era o dia da projeção de zerar** | Banco: **0 falhas quota/openai em 48h** · 35 vídeos entregues = 35 scriptings OK · motivos de falha 24h todos de produto (gate studio 2, trial_stalled 2, threw 3, active_render 1 — total 8, benigno) | Projeção de 17/08: $8,86 a −$6,33/dia → **zeraria 18–19/08 = HOJE**. Está rodando → houve dinheiro novo. Se foi o auto-reload, é a PRIMEIRA vez que ele dispara — e provar isso vale mais que o saldo (encerra a classe de falha do incidente 31/07). **Ação: fundador conferir HOJE — se houver cobrança automática de ~$25 no Billing history, o auto-reload FUNCIONA (anotar aqui amanhã); se houver compra manual redonda, a proteção segue decorativa.** |
| **Creatomate** | 🟡 **AMARELO — estoura ~05-06/09, antes da renovação (10/09) · DECISÃO É AMANHÃ (20/08)** | Estimativa fórmula validada (6 acertos, razão 1,115): **ciclo ~9.260 de 30.000 (31%)** · 24h: 36 vídeos, 1.890s ≈ **1.311 cr** · média 7d: **~1.179 cr/dia** (241 vídeos) | Restam ~20.740 cr. Média 7d: **17,6 dias → estoura ~06/09**. Ritmo de 24h: **15,8 dias → ~04/09**. Os dois ritmos convergem no mesmo veredito de ontem: **o ciclo NÃO fecha em nenhuma hipótese** — falta 4-6 dias de cota antes do dia 10. **Ação: o prazo que o próprio fundador manteve é AMANHÃ, 20/08 — subir o plano. O incidente de 09/08 (33h fora) foi exatamente esta curva ignorada.** |
| **Resend** | 🟡 **AMARELO — mas com evidência de que o teto free JÁ NÃO se aplica (confirmar)** | Ledger `email_send_log`: **118 envios/24h, 118 ok, 0 falha** · por dia UTC: **17/08=56 · 18/08=116 (!) · 19/08=59 parcial** · quebra 24h: d0_welcome 48 · ending_soon 39 · downgraded_loss 12 · expired_offer_d5 10 · recovery 5 · outros 4 | **Fato novo: 18/08 fechou em 116 — 16 acima do teto free (100/dia) — e o ledger registra 116 aceites, zero recusa.** Resend em quota devolve 429 (ok=false no ledger). Duas leituras possíveis: (a) o fundador JÁ subiu o plano (não vejo o painel) → resolver o item de vez; (b) o teto não disparou por janela de contagem → sorte, não proteção. **Ação: fundador confirmar no painel do Resend qual plano está ativo. Se ainda for free, hoje já vai em 59 e o padrão de 116 repete.** |
| **Supabase Storage** | 🟢 VERDE — ~33 dias | Banco bruto **114,05 GB** (9.064 obj.) × 0,503 calibrado = **~57,4 GB de 100 GB (ESTIMATIVA)** · +2,6 GB brutos/24h ≈ +1,3 GB cobrados/dia | Folga ~43 GB ≈ **~33 dias no ritmo atual**. Maior bucket: `broll` **74,5 GB brutos** (4.177 obj., +1,4 GB/24h). **Ação $0 segue de pé: GC do broll — só ele devolveria ~2 meses de folga sem cartão.** |

**Saúde do produto:** impecável — 35 entregues/24h, 8 falhas todas de produto/gate, zero de
fornecedor em 48h. O patamar pós-recorde estabilizou em ~35-41 cadastros/dia (243/7d), 3-4× o
normal antigo — as contas acima já usam esse patamar.

**Ação recomendada (nenhuma compra feita por mim — dinheiro é a mão do fundador):**
1. **HOJE — fal e OpenAI: 2 minutos de painel cada** (3º dia pedindo o mesmo). No OpenAI, olhar o Billing history: cobrança automática de ~$25 = auto-reload FUNCIONA, primeira prova da história.
2. **AMANHÃ, 20/08 — Creatomate: decidir o plano.** É o prazo do próprio fundador; a média 7d não fecha o ciclo.
3. **HOJE — Resend: confirmar o plano no painel.** Se o 116-sem-falha de ontem foi upgrade, riscar o item; se foi sorte, pagar antes do próximo pico.
4. **Esta semana, $0 — Storage:** GC do bucket `broll`.

**O insight deste check-up:** o ledger do Resend virou, sem querer, um detector de plano — 116
aceites num dia de teto 100 é impossível no free, então o próprio comportamento do fornecedor
conta o que o painel esconde. Vale generalizar: quando não dá pra LER a configuração, dá pra
INFERI-la pelo que o fornecedor deixou passar. É o mesmo princípio do "evidência de disparo"
de 16/08, aplicado ao contrário — e continua valendo a ressalva: inferência boa vira veredito
só depois que o fundador confirma no painel.

**Não consegui medir:** saldo fal.ai, saldo OpenAI e plano ativo do Resend (painéis exigem
login; sessão sem browser) — vereditos deles são projeção + evidência indireta do banco.

## 18/08/2026 — 🔴🔴 O pico recuou pela metade, mas os dois tanques pequenos (fal e OpenAI) seguem no escuro — e o produto continua rodando, o que sugere que o fundador recarregou

**50 cadastros em 24h (metade do recorde de 97; ainda 2,5× o normal), 48 vídeos entregues,
19 renders de IA. Fato central do dia: NÃO consigo ler os painéis do fal e da OpenAI daqui
(sessão sem browser logado), e ontem os dois zeravam em horas. A evidência indireta é boa —
6 Hollywood + 12 Seedance renderizaram HOJE e zero falha por quota/saldo em 24h — o que só é
possível se houve recarga (ontem o fal tinha $27,67 e o banco estima ~$83 queimados desde
então). Mas "provavelmente recarregou" não é veredito: os dois ficam VERMELHOS até o fundador
confirmar visualmente saldo + auto-recarga LIGADA (é a 3ª vez que "ligado" não persiste).**

| Fornecedor | Veredito | Medida (fonte) | Conta |
|---|---|---|---|
| **fal.ai** | 🔴 **VERMELHO até confirmação — painel ilegível hoje** | Banco: **19 renders IA em 24h** (12 Seedance + 6 Hollywood + 1 Kling) ≈ **~$83/24h ESTIMADOS** (12×$1,97 + 6×$9,50 + Kling ~$2; lembrete: o banco historicamente SUBCONTA ~1,9×) · sintomas: 2 `fal_poll_deadline_exceeded` em 48h (madrugada de 17/08), nenhum novo hoje | Ontem: saldo $27,67 + auto top-up OFF. Consumo estimado desde então (~$83) > saldo de ontem → **ou houve recarga manual, ou está operando no vapor**. Renders IA seguem completando (8 hoje até agora), então não morreu. **Ação: fundador confirmar no painel HOJE — saldo ≥$200 e a linha "Auto top-up" ATIVA no Credit activity (evidência = a linha, não aritmética).** |
| **OpenAI** | 🔴 **VERMELHO até confirmação — projeção de ontem zera HOJE** | Banco: **0 falhas quota/openai em 24h** (motivos 24h: analyze_blocked_active_render_gate 31, failed 5, cinematic_dispatch_not_ok 3 — nenhum de saldo) · 48 vídeos = 48 scriptings OK | Ontem: $8,86 a −$6,33/dia + banner "Auto-reload is OFF" → **zeraria 18–19/08, ou seja, HOJE**. Scripting funcionando = ainda tem saldo, mas pode ser questão de horas. **Ação: fundador confirmar no painel HOJE — saldo ≥$50 e "Enable auto-reload" salvo (o banner de ontem dizia OFF).** |
| **Creatomate** | 🟡 **AMARELO — estoura ANTES da renovação até na média 7d** | Estimativa fórmula validada (6 acertos seguidos, razão 1,115): **ciclo ~7.949 de 30.000 (27%)** · 24h: 48 vídeos, 2.505s ≈ **1.738 cr** (vs 3.000 ontem) · média 7d: **~1.109 cr/dia** | Restam ~22.051 cr. Na média 7d: **19,9 dias → estoura ~07/09, 3 dias ANTES da renovação (10/09)**. No ritmo de ontem/hoje (1,7–3K/dia): **~13 dias → ~31/08**. A folga que existia na média morreu: **até na hipótese otimista o ciclo não fecha**. **Ação: decisão de plano até 20/08 (prazo de ontem, mantido) — o incidente de 09/08 foi exatamente isso, 33h fora do ar.** |
| **Resend** | 🟡 **AMARELO — 57 já enviados no dia UTC de hoje, e o dia não acabou** | **Ledger central `email_send_log` (novo, 17/08 — agora mede TUDO, incl. checkout_recovery): 113 envios/24h, 100% ok, 0 falha** · por dia UTC: **17/08 = 56 · 18/08 = 57 (parcial!)** · quebra 24h: d0_welcome 67 · ending_soon 14 · downgraded_loss 13 · expired_offer_d5 11 · checkout_recovery 8 | Ontem o limite free (100/dia) NÃO estourou (56). Hoje já vai em **57 com o dia UTC ainda rodando** — os d0_welcome dos 50 cadastros de hoje ainda estão saindo. Piso de 70% deve cruzar dentro do dia. **Ação: manter a decisão de ontem — plano pago (~$20/mês) resolve de vez; decidir antes do próximo dia de pico, porque e-mail recusado é falha silenciosa de conversão.** |
| **Supabase Storage** | 🟢 VERDE (pico normalizou) | Banco bruto **111,45 GB** (8.816 obj.) × 0,503 calibrado = **~56,1 GB de 100 GB (ESTIMATIVA)** · +3,1 GB brutos/24h (vs +12,6 no pico) ≈ +1,6 GB cobrados/dia | Folga ~44 GB ≈ **~28 dias no ritmo atual** (>14 = verde). Maior bucket: `broll` **73,1 GB brutos** (4.099 obj.). **Ação $0 de pé: GC do broll esta semana — é o alívio sem cartão.** |

**Saúde do produto:** zero falha de fornecedor em 24h. As 31 `analyze_blocked_active_render_gate`
são gate de concorrência (uso pesado), não defeito. 50 cadastros/24h, 214/7d — o pós-recorde
assentou num patamar 2–3× o antigo normal, e é ESSE patamar que as contas acima usam.

**Nota de segurança:** a tabela `trial_revive_backfill_20260811` apontada em 13/08 está com
RLS **ligado** hoje — achado resolvido.

**Ação recomendada (nenhuma compra feita por mim — dinheiro é a mão do fundador):**
1. **HOJE — fal e OpenAI: 2 minutos de painel cada.** Confirmar saldo E auto-recarga ativa. Se já fez ontem, só conferir que o botão persistiu.
2. **Até 20/08 — Creatomate:** subir plano. A média 7d já não fecha o ciclo; não é mais "se o pico durar".
3. **Antes do próximo pico — Resend:** plano pago ~$20/mês.
4. **Esta semana, $0 — Storage:** GC do bucket `broll`.

**O insight deste check-up:** o dia seguinte ao recorde é o dia mais perigoso do ciclo — o
consumo cai pela metade e a sensação de alívio desliga a urgência, mas os saldos foram
queimados NO pico e continuam queimados. Alívio de ritmo não repõe tanque. E a segunda lição:
quando o check-up não alcança o painel, o veredito honesto é VERMELHO-até-confirmação, não
"deve ter recarregado" — otimismo sem leitura foi exatamente o erro do "top-up provado" de 16/08.

**Não consegui medir:** saldo fal.ai e saldo OpenAI (painéis exigem login; sessão de hoje sem
browser) — vereditos deles são projeção de ontem + evidência indireta do banco; envios Resend
anteriores a 17/08 fora do ledger novo.

## 17/08/2026 — 🔴🔴🔴 O MELHOR DIA DA HISTÓRIA está queimando os fornecedores em ritmo de HORAS

**97 cadastros em 24h (recorde absoluto; o antigo era 69), 89 vídeos entregues, 61 pessoas
gerando, 30 delas com IA. A vitrine de 15/08 converteu — e é exatamente por isso que hoje é
o check-up mais urgente desde que ele existe: TRÊS fornecedores entram em vermelho ao mesmo
tempo, e dois deles zeram em horas, não dias. E as duas auto-recargas que salvariam o dia
aparecem DESLIGADAS nos painéis — inclusive a do fal, que ontem este check-up deu como
"provada". Foi um erro de leitura: a tabela de Credit activity hoje mostra uma compra
(Purchase) de $40 datada de 14/08 que ontem ainda não aparecia — os $40 eram compra manual
chegando com atraso na tabela, não top-up automático. Retrato corrigido: NENHUMA proteção
automática está ativa em NENHUM fornecedor.**

| Fornecedor | Veredito | Medida (fonte) | Conta |
|---|---|---|---|
| **fal.ai** | 🔴 **VERMELHO — HORAS de saldo · auto top-up OFF** | **Painel oficial: saldo $27,67** (ontem $54,13) · **uso do mês $320,56** (ontem $194,10 = **−$126,46 em 24h**, 10× a média) · **Auto top-up: "Off"/"Disabled"** · última entrada: Purchase $40 em 14/08 | 27,67 ÷ 126/dia = **~5 HORAS no ritmo do pico** (1,5 dia na média mensal $18,86 do próprio fal). 41 renders de IA em 24h (35 Seedance + 4 Hollywood + 2 Veo). Já há sintoma: 2 `fal_poll_deadline_exceeded` hoje 04:27–04:54Z. **Ação: HOJE, agora — comprar $200 e ligar auto top-up gatilho $50 / recarga $100, conferindo que o botão salvou (é a 3ª vez que "ligado" não persiste).** |
| **OpenAI** | 🔴 **VERMELHO — 1,4 dia · auto-reload OFF (banner do painel)** | **Painel oficial: saldo $8,86** (ontem $15,19 = −$6,33/24h, 4,6× o ritmo) · banner literal: **"Auto-reload is OFF"** + botão "Enable auto-reload" | 8,86 ÷ 6,33 = **1,4 dia → zera 18–19/08**. O teste que este check-up esperava para 19–20/08 já aconteceu: **o saldo cruzou o gatilho de $10 e NADA disparou — porque a recarga está OFF**, não configurada-e-falhando. OpenAI está no `scripting` de TODO vídeo (incidente 31/07: 116 falhas). **Ação: HOJE — comprar $50 e clicar "Enable auto-reload", conferindo que salvou.** |
| **Resend** | 🔴 **VERMELHO — estouro projetado HOJE** | **Ledger `trial_emails_log`: 72 e-mails em 24h (PISO; crons video-ready/recovery/reminders não registram)** · quebra: `downgraded_loss` 29 · `d0_welcome` 25 · `ending_soon` 9 · `expired_offer_d5` 8 · `trial_extended` 1 | 2º dia seguido acima de 70% do limite free (100/dia) com medição incompleta — e a onda de 97 cadastros ainda vai empurrar os `d0_welcome` de hoje (só 25 dos 97 saíram). **No ritmo de hoje o teto estoura DENTRO do dia, e e-mail que morre no Resend é justamente o de conversão — falha silenciosa, sem erro, sem gráfico.** **Ação: HOJE — subir para o plano pago do Resend (entrada ~US$20/mês; conferir preço no painel).** |
| **Creatomate** | 🟡 **AMARELO — 8 dias no ritmo do pico** | **Painel oficial: 6.0K de 30.0K (20%)** — ontem 3.0K = **3.000 cr em 24h** (estimativa pelo banco: 2.996 — **6ª validação seguida do fator 1,115**) | (30.000−6.000) ÷ 3.000 = **8 dias → estouro ~25/08, 16 dias ANTES da renovação (10/09)** se o pico virar o novo normal. Na média 7d (883/dia) ainda caberia (27 dias). **Ação: decidir até 20/08 — se o ritmo ≥2K/dia segurar por mais 2 dias, subir o plano ANTES do dia 25 (o incidente de 09/08 foi exatamente isso: cota estourada no meio do ciclo, 33h fora do ar).** |
| **Supabase Storage** | 🟡 **AMARELO — ~7 dias no ritmo do pico** | Banco bruto **108,34 GB** (8.477 obj.) × 0,503 calibrado = **~54,5 GB de 100 GB (ESTIMATIVA)** | Ontem 95,73 bruto → **+12,6 GB brutos em 24h** ≈ +6,3 GB cobrados/dia no pico (14× o ritmo de ontem). Folga ~45 GB ≈ **7 dias se o pico durar** (~2 meses se normalizar). Maior bucket: `broll` **71,69 GB** (4.014 obj.). **Ação $0: rodar o GC do bucket broll esta semana — é o único fornecedor que dá pra aliviar sem cartão.** |

**Saúde do produto (o contraste que define a urgência):** o produto está PERFEITO — 89 vídeos
em 24h, 86 `generate_completed`, **ZERO falhas por quota ou saldo**. As 138 `generation_stage_error`
de 24h são quase todas gate de concorrência (100 `analyze_blocked_active_render_gate`, de apenas
4 usuários gerando em rajada) — sintoma de USO PESADO, não de defeito. Os únicos eventos com cheiro
de fornecedor são 2 `fal_poll_deadline_exceeded` na madrugada. **É a foto exata de "antes do
sintoma": a demanda chegou, os tanques é que estão acabando.**

**Ação recomendada (tudo com data, nenhuma compra feita por mim — dinheiro é a mão do fundador):**
1. **HOJE, primeiro — fal.ai:** $200 + auto top-up $50/$100 **conferindo que salvou**. Zera em horas.
2. **HOJE — OpenAI:** $50 + "Enable auto-reload" (o banner diz OFF). Zera amanhã.
3. **HOJE — Resend:** plano pago (~$20/mês). Estouro silencioso projetado para dentro do dia.
4. **Até 20/08 — Creatomate:** se o ritmo segurar, subir plano antes de ~25/08.
5. **Esta semana, $0 — Storage:** GC do bucket `broll` (71,7 GB).

**O insight deste check-up:** todos os buffers da empresa foram dimensionados para o tráfego
de $12/dia — gatilho de $20 no fal era 1,6 dia de aviso; virou **4 horas** da noite pro dia.
**Buffer de fornecedor não é um número, é um número × o tráfego** — e o tráfego acabou de mudar
de década. A regra que fica: toda vez que o produto bater recorde de cadastros, os gatilhos de
recarga têm que ser re-dimensionados NO MESMO DIA, porque o recorde é exatamente o dia em que
os fornecedores morrem mais rápido — e morrer no recorde custa o recorde. (E a correção honesta:
o "top-up provado" de ontem era uma compra manual atrasada na tabela — evidência de disparo
agora exige a linha "Auto top-up" no Credit activity, não aritmética de saldo.)

**Não consegui medir:** total real de envios do Resend (painel exige login; crons fora do
ledger); se o Resend JÁ estourou ontem (o ledger não registra recusa); e o preço exato do
plano pago do Resend.

---

## 16/08/2026 — 🟡 A proteção PEGOU no fal, e o OpenAI foi salvo NA MÃO (não pelo auto-reload)

**Os dois vermelhos de ontem saíram do vermelho — mas por motivos diferentes, e a diferença
é a coisa mais importante deste check-up.** No fal, o auto top-up disparou sozinho (provado
pelo saldo). Na OpenAI, quem salvou foi o cartão do fundador às 09:29 de ontem — o auto-reload
continua **configurado e nunca visto disparar**. Um novo amarelo apareceu do lado que ninguém
estava olhando: **Resend**.

| Fornecedor | Veredito | Medida (fonte) | Conta |
|---|---|---|---|
| **fal.ai** | 🟡 **AMARELO — 4,5 dias de saldo, mas com recarga automática PROVADA** | **Painel oficial: saldo $54,13** (ontem $25,74) · **Auto top-up: Enabled — "$40 quando o saldo chegar a $20", cartão 8677** · uso do mês $194,10 (ontem $182,49) · média do próprio fal **$12,13/dia** | **O auto top-up funcionou — e dá pra provar:** 25,74 − 11,61 de consumo (194,10−182,49) = $14,13; o saldo está em $54,13, ou seja **entraram exatamente $40** no meio do caminho. Isso é a recarga automática disparando pela primeira vez. (A tabela "Credit activity" **não** registra o top-up automático — última linha ainda é 11/08, $40. Anotado: aquela tabela não serve de prova, o saldo serve.) Saldo bruto = 54,13 ÷ 12,13 = **4,5 dias**. **Por que amarelo e não verde:** o gatilho está em **$20 = 1,6 dia de aviso** e a recarga de **$40 = 3,3 dias**. Funciona, mas não sobra nada pra uma recusa de cartão. **Ação (não urgente, $0 de custo): mudar o gatilho para $50 e a recarga para $100** — mesma despesa por mês, só antecipada, e a folga vira 4 dias em vez de 1,6. |
| **OpenAI** | 🟡 **AMARELO — 11,1 dias · proteção AINDA NÃO PROVADA** | **Painel oficial: saldo $15,19** (ontem $1,56) · **Auto-reload: ON — "quando chegar a $10, recarregar para $25, limite mensal $100"** · **Billing history: fatura de $15,00 em 15/08 09:29** | 15,19 ÷ 1,37/dia (queda medida em 24h) = **11,1 dias → zera ~27/08**. **O ponto que importa: aquele $15,00 é compra manual, não o auto-reload.** O auto-reload recarregaria **para $25** (cobrança de ~$23,44 a partir de $1,56) — a fatura é de $15,00 exatos, valor de botão "Buy credits". Ou seja: ontem o saldo passou **mais de 24h abaixo do gatilho de $10 sem a recarga disparar**, e quem consertou foi a mão do fundador. **A proteção segue sem uma única evidência de que funciona.** Faturas de agosto: $10 (05/08) + $15 (15/08) = **$25 dos $100 de limite mensal — não é o limite que está travando**. **Ação: nenhuma compra hoje. O teste de verdade acontece sozinho quando o saldo cruzar $10, por volta de 19–20/08 — este check-up vai conferir naquele dia. Se não disparar de novo, o auto-reload da OpenAI é decorativo e a conta volta a ser manual todo mês.** |
| **Resend** | 🟡 **AMARELO — 74 de 100/dia (74%)** | **Ledger `trial_emails_log`: 74 e-mails em 24h** (ontem 48 = **+54%**). Quebra: `downgraded_loss` 36 · `ending_soon` 22 · `d0_welcome` 13 · `expired_offer_d5` 3 | **Este é o piso, não o total** — os crons send-video-ready/recovery/reminders não escrevem no ledger, então o número real está entre 74 e o teto. **74% do limite diário do plano free com medição incompleta = amarelo pela regra dos 70.** O que empurrou foi a leva de **36 `downgraded_loss`** (campanha, não tráfego orgânico): qualquer nova leva desse tamanho **estoura 100 no mesmo dia** e o Resend simplesmente para de entregar — sem erro visível pro usuário, e os e-mails que morrem primeiro são justamente os de conversão. **Ação: decidir até 18/08** — ou (a) subir para o plano pago do Resend (a faixa de entrada fica na casa de ~US$20/mês; **conferir o valor no painel, não consegui ler o preço daqui**), ou (b) $0: espalhar as campanhas em lotes de ≤30/dia e escrever os envios dos outros crons no ledger, que é o que falta pra este número deixar de ser um chute. |
| Creatomate | 🟢 VERDE — ~58 dias | **Painel oficial: 3.0K de 30.0K (10%)** | Ritmo 462 cr/dia no ciclo (24h estimadas: 406). Renova 10/09 (25 dias); projeção do ciclo ≈ **14.550 → sobra ~51%**. **Estimativa pelo banco deu 3.184 vs 3.0K do painel — 5ª validação seguida do fator 1,115.** O medidor está confiável; segue sendo a única cota que dá pra prever sem abrir painel. |
| Supabase Storage | 🟢 VERDE — ~110 dias | Banco bruto **95,73 GB** (7.854 obj.) × 0,503 calibrado = **~48,2 GB de 100 GB (ESTIMATIVA)** | Ontem 94,86 bruto → **+0,87 GB/dia** bruto ≈ 0,44 GB/dia cobrado (metade do ritmo de ontem, 1,58). Folga ~52 GB. Maior bucket: `broll` **64,40 GB** (3.870 obj.) — alvo do GC se apertar. |

**Saúde do produto (para calibrar a urgência):** 13 renders em 24h (9 fast + 3 cinematic_ai + 1 cinematic_hollywood), **12 vídeos concluídos, 12 de 12 com sucesso**, 8 cadastros. **20 `generation_stage_error` em 48h e ZERO por quota ou saldo de fornecedor.** Os motivos são todos de produto: 15 de "trial has 19 credits left and an AI video needs 20" (**e isso é UM único usuário tentando 10 vezes** — conferi: 10 eventos, 1 user distinto em 7 dias; não é padrão, é uma pessoa insistindo), 5 `cinematic_gate_trial_stalled`, 1 `broll_plan_threw_autopilot`. **Nenhum fornecedor derrubou nada nas últimas 48h.**

**Ação recomendada (nenhuma é urgente hoje — pela primeira vez em 3 dias):**
1. **Até 18/08 — Resend:** decidir entre plano pago e lotes de ≤30/dia. É o único item com data.
2. **19–20/08 — OpenAI:** este check-up confere sozinho se o auto-reload dispara quando o saldo cruzar $10. **Não comprar nada antes disso — o teste vale mais que os $50.**
3. **Quando der (custo $0) — fal.ai:** gatilho $20→$50 e recarga $40→$100.
4. Dinheiro é sempre a mão do fundador — não comprei nada.

**O insight deste check-up:** ontem a lição foi "ligar não é o mesmo que estar ligado". Hoje o
painel mostra a versão mais fina disso: **das duas proteções, uma disparou e a outra foi
substituída por um humano — e as duas parecem idênticas no painel.** Nos dois casos a tela diz
"ON"; só o extrato do saldo separa a que funciona da que não funciona. Isso muda o que este
check-up mede: **não basta ler a configuração, tem que ler a EVIDÊNCIA de disparo** (saldo que
sobe sem fatura = automático; fatura de valor redondo = mão humana). Fica como item fixo. E fica
a decisão de não comprar OpenAI hoje: com 11 dias de saldo, **deixar o gatilho ser cruzado é a
única forma barata de descobrir se a proteção existe** — testar agora custa $0 e um dia de
atenção; descobrir em setembro, com o saldo em $1, custa outro apagão.

**O amarelo novo veio do lado errado do mapa.** Os três incidentes da empresa (OpenAI 31/07,
Creatomate 09/08, fal 13–15/08) foram todos de **geração de vídeo**, e é pra lá que toda a
vigilância olha. O Resend não gera nada — ele só avisa. Mas o que ele entrega é
`ending_soon`, `expired_offer_d5`, `downgraded_loss`: **é literalmente o cano da conversão**.
Um teto estourado ali não derruba o produto, não gera erro, não aparece em nenhum gráfico —
só faz a receita cair sem motivo aparente. **É a falha mais barata de prevenir e a mais cara
de diagnosticar depois**, porque não deixa rastro. Por isso ele entra em amarelo a 74% em vez
de esperar os 100.

**Não consegui medir:** (a) total real de envios do Resend — o painel exige login e eu não faço
login; os crons fora do ledger de trial seguem invisíveis; (b) o preço exato do plano pago do
Resend (a página de preços está fora do que posso buscar daqui); (c) por que o auto-reload da
OpenAI não disparou em 15/08 — o motivo só aparece dentro de "Manage auto-reload", que é área
de cartão de crédito, e eu não entro.

---

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
