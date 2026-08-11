# INCIDENTES DE FORNECEDOR — a memória que impede a terceira vez

Marcador: `KINEO-SUPPLIER-ALARM-2026-08-11`

**A empresa ficou fora do ar DUAS vezes em 11 dias por saldo de fornecedor. Nas duas,
ninguém foi avisado. Nas duas, o código estava certo — o defeito era não ter olho.**

Este arquivo é a memória. Ele existe porque `docs/INCIDENTE-OPENAI-2026-07-31.md` já tinha
escrito, em 01/08, a lição exata que foi ignorada oito dias depois:

> "LIÇÃO PERMANENTE: TODO fornecedor pago do pipeline precisa de alarme de quota no DIA 1
> (OpenAI, Creatomate, FAL, Pixabay). Auditar os que faltam."

O alarme do Creatomate não foi feito. Em 09/08 o Creatomate zerou.

---

## Incidente #1 — OpenAI sem crédito · 31/07/2026

| | |
|---|---|
| **Início** | 31/07 ~11:07Z (última hora saudável: 10:00–11:00Z, 3 tentativas / 3 entregas) |
| **Fim** | 01/08 ~01:04Z (vídeo `completed` em produção após troca de chave) |
| **Duração** | **~14 horas** |
| **Causa** | `OPENAI_API_KEY` da Vercel apontava para a conta OpenAI ANTIGA (ex-ShortsForgeAI), que zerou. Resposta: `insufficient_quota` em toda chamada. |
| **Sintoma** | Script, cenas, b-roll, TTS e a demo pública da landing devolvendo 500 mudo. |
| **Atingidos** | **163 gerações, 116 falhas, 16% de sucesso.** 85 eventos `openai_quota_dead` / 24 pessoas. **65 cadastros vindos do TAAFT** no dia de maior tráfego pago da história caíram em produto quebrado. |
| **Como foi descoberto** | Investigação manual, horas depois. |

### A hora a hora que prova a detecção (contagem real de `events`)

| Hora UTC | tentativas | entregues | falhas | pessoas |
|---|---:|---:|---:|---:|
| 10:00 | 3 | 3 | 0 | 3 |
| **11:00** | **9** | **0** | **9** | **3** |
| 12:00 | 7 | 0 | 7 | 3 |
| 13:00 | 15 | 0 | 13 | 4 |
| 15:00 | 24 | 0 | 23 | 7 |
| 19:00 | 22 | 0 | 20 | 4 |

### O que teria detectado, e quando

A janela de 1 hora fechada às **12:07Z** vê 9 tentativas, 3 pessoas, 0 entregas.
Acendem **duas** regras ao mesmo tempo: (a) taxa de falha 100% ≥ 50% e (b) zero entregas
com ≥ 5 tentativas.

> **Alerta em ~60 minutos, em vez de 14 horas. 13 horas de produto quebrado a menos, e o
> pico do TAAFT preservado.**

---

## Incidente #2 — Creatomate sem cota · 09/08 → 11/08/2026

| | |
|---|---|
| **Início** | 09/08 ~17:00Z (último vídeo entregue: 09/08 16:21:08Z) |
| **Fim** | 11/08 ~02:00Z |
| **Duração** | **~33 horas** |
| **Causa** | Os **10.000 créditos** do plano Growth acabaram no dia 9 de um ciclo de 31. O fornecedor passou a recusar TODO job. |
| **Sintoma** | `"Render service rejected the job"` para o usuário; `generation_stage_error` com `reason='compose_not_ok'` (71 eventos só na janela do apagão). |
| **Atingidos** | **76 gerações num único dia, ZERO vídeos.** 173 eventos `generation_stage_error` no total, 30 cadastros novos durante o apagão, **23 dos 92 trials ativos queimaram prazo** sem conseguir um vídeo. |
| **Como foi descoberto** | **O fundador perguntou.** Não houve alarme. |

### A hora a hora que prova a detecção (contagem real de `events`)

| Hora UTC | tentativas | entregues | falhas |
|---|---:|---:|---:|
| 09/08 15:00 | 1 | 2 | 0 |
| **09/08 16:00** | **11** | **1** | **8** |
| 09/08 18:00 | 7 | 0 | 6 |
| 09/08 20:00 | 2 | 0 | 0 |
| 09/08 22:00 | 3 | 0 | 1 |
| 10/08 00:00 | 1 | 0 | 2 |
| 10/08 02:00 | 7 | 0 | 7 |
| 10/08 09:00 | 9 | 0 | 8 |

### O que teria detectado, e quando

A janela de 1 hora fechada às **17:07Z de 09/08** vê 11 tentativas e 8 falhas — **73% de
taxa de falha**. Acende a regra (a) na **primeira hora do apagão**.

> **Alerta em ~1 hora, em vez de 33. As 23 pessoas em trial não teriam queimado o prazo
> num produto que não renderizava.**

E teria chegado **antes ainda**: o ciclo de 31 dias queimava em ritmo de 8,6 dias de
autonomia. A camada de **projeção de estouro** (`lib/supplier/burn.ts`) teria gritado no
dia 2 do ciclo — **uma semana antes**, com o produto de pé e tempo de sobra para subir o
plano ou baixar o perfil de output.

### O buraco da madrugada, que este incidente expôs e o desenho fechou

Entre 20:00Z de 09/08 e 02:00Z de 10/08 o produto registrou 2, 0, 3, 2, 1 e 2 tentativas
por hora. **Nenhuma hora isolada chega ao mínimo de 5.** Um alarme que só olhasse 1 hora
ficaria mudo a noite inteira — exatamente quando ninguém está olhando. Somadas, essas seis
horas dão **10 tentativas e 0 entregas**, e é por isso que existe a segunda janela, de 6
horas, com mínimo de 8.

---

---

## BACKTEST — as regras rodadas contra 20 dias reais (22/07 → 11/08)

A pergunta que decide se um alarme presta não é "ele pega o incidente?" — é "ele fica
quieto no resto do tempo?". Regras (a) e (b) replicadas em SQL sobre **480 horas** de
`events`:

**24 horas acenderiam. 456 ficariam em silêncio (95%).** E as 24 não estão espalhadas —
elas se agrupam em quatro blocos:

| Bloco | Horas | O que era |
|---|---:|---|
| 31/07 11:00 → 01/08 04:00 | 14 | **Incidente #1** (OpenAI sem crédito) |
| 09/08 16:00 → 10/08 15:00 | 8 | **Incidente #2** (Creatomate sem cota) |
| 05/08 15:00 | 1 | **A queda do Pixabay** — 11 tentativas, **0 entregas**, 2 falhas registradas |
| 02/08 13:00 | 1 | 5 tentativas, 60% de falha, 2 pessoas — blip isolado |

Três achados que valem mais que o número:

1. **O alarme pega um TERCEIRO incidente que ninguém tinha catalogado.** 05/08 15:00Z é a
   queda do Pixabay documentada em `docs/CAPACIDADE-TAAFT-2026-08-08.md` §3 (61 timeouts
   de 120s, `fast_dispatch_not_ok` em 41 pessoas). Note o formato: **2 falhas registradas e
   11 tentativas sem entrega**. A taxa de falha era de 18% — a regra (a) NÃO pega. Quem
   pega é a regra (b), zero entregas. É a assinatura da classe "trava e o gateway mata a
   lambda", em que quase nenhum `video_generation_failed` chega a ser escrito. **As duas
   regras não são redundantes; cada uma cobre um incidente real que a outra perde.**
2. **A trava por incidente transforma 24 e-mails em ~4.** Sem ela, o bloco de 31/07 sozinho
   seriam 14 e-mails idênticos.
3. **Um único falso positivo plausível em 20 dias** (02/08 13:00) — e mesmo ele era 60% de
   falha em 5 tentativas de 2 pessoas, que é uma hora que vale um e-mail.

---

## O padrão comum aos dois

1. **Nenhum dos dois fornecedores expõe saldo por API.** Perguntar "quanto sobrou?" não
   era uma opção. O **sintoma**, esse, sempre esteve legível na nossa própria tabela
   `events` — e ninguém estava lendo.
2. **Os alarmes que existiam eram por-fornecedor e por-`catch`.** `lib/openaiAlert.ts`,
   `lib/falAlert.ts` e `lib/creatomateAlert.ts` só tocam quando um bloco de tratamento
   específico roda dentro de uma lambda. Modo de falha novo = silêncio.
3. **Os dois foram descobertos por um humano perguntando**, não por um sistema avisando.
4. **Os dois tinham a informação na base o tempo todo.** As tabelas acima foram
   reconstruídas com uma consulta de 8 linhas, depois. Podiam ter sido lidas na hora.

---

## O que ficou construído em 11/08 (o olho)

| Peça | Arquivo | O que faz |
|---|---|---|
| Detecção por sintoma | `lib/supplier/generationHealth.ts` | Taxa de falha em 2 janelas (1h e 6h). Regras (a) ≥5 tentativas e ≥50% de falha · (b) zero entregas com ≥5 tentativas · (c) mesmo motivo ≥10×. Todas exigem ≥2 pessoas distintas. |
| Tendência / projeção | `lib/supplier/burn.ts` | Consumo do ciclo, ritmo diário e **data projetada de estouro** por fornecedor. |
| Patamares de cota | `lib/creatomateQuota.ts` | Alerta em **70 / 80 / 95 / 100%**, um por patamar por ciclo. |
| Entrega do alerta | `lib/supplier/notify.ts` | E-mail (Resend) para o fundador **+** webhook opcional (`KINEO_ALERT_WEBHOOK_URL`) como segunda via independente. |
| O cron | `app/api/cron/supplier-watch/route.ts` | De hora em hora (`7 * * * *`), `CRON_SECRET` fail-closed. Um alerta por incidente + "voltou ao normal". |
| Trava de idempotência | `supabase/migrations/20260811090000_supplier_alarm_locks.sql` | Índices únicos parciais: um `supplier_alarm_fired` por incidente, um aviso de projeção por fornecedor por ciclo. |
| Painel | `/admin/supplier-health` | Uma linha por fornecedor: consumo do ciclo, ritmo diário, data de estouro. Read-only. |

### O que ainda depende do fundador (e não dá para automatizar daqui)

1. **Recarregar / subir plano.** O alarme aponta o painel certo; a ação é humana e custa
   dinheiro.
2. **`KINEO_ALERT_WEBHOOK_URL`** na Vercel — 2 minutos, sem deploy. Sem ela o alarme roda
   com **um canal só** (e-mail), e o plano Resend é de 100 e-mails/dia compartilhados com
   os crons de lifecycle: num pico o próprio alarme pode levar 429.
3. **`KINEO_FAL_BALANCE_USD`** na Vercel depois de cada recarga do fal. O fal é pré-pago e
   não expõe saldo; sem esse número o painel mostra o ritmo mas não a data de estouro.
4. **`KINEO_CREATOMATE_PLAN_CREDITS` / `_CYCLE_DAY`** quando o plano mudar de novo. Os
   defaults hoje são **30.000 / dia 10** (ciclo atual, renova 10/09). Um default velho é
   um alarme mentiroso — foi o que aconteceu quando o plano subiu de 2K para 10K.

---

## Regra permanente, escrita para a próxima sprint

> **Todo fornecedor pago do pipeline entra no painel `/admin/supplier-health` e no cron
> `supplier-watch` no DIA em que entra no produto.** Não existe fornecedor "pequeno demais
> para monitorar": o Creatomate custava $0,074 por render e derrubou a empresa por 33
> horas.

> **E o alarme que importa não pergunta pelo saldo — pergunta se o produto está
> entregando.** Saldo é legível às vezes; sintoma é legível sempre, e cobre a causa que
> ainda não aconteceu.
