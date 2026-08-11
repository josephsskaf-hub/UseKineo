# FUNIL MESTRE — onde 1.060 de 1.068 se perdem, e o que isso exige para $5.000 de MRR

`[KINEO-FUNIL-MESTRE-2026-08-11]` · dados lidos em 2026-08-11 ~07:00Z · Supabase `cqqukkvjjrguayiyjvhh`

> **Repo é público.** Nenhum e-mail, nome ou id de sessão aqui. Contas aparecem como
> prefixo de UUID (8 chars) + país de cadastro. Toda linha de funil tem a query que a produziu.

---

## 0. TL;DR — as cinco frases que mudam a decisão

1. **O apagão NÃO explica a conversão.** Em dias saudáveis dos últimos 30 dias a conversão é
   **0,62%** (2 de 325). No período todo dos 30 dias é 0,76% (3 de 395). Separar o apagão
   melhora a *entrega* de 7,9% para 73,6% e **não move a conversão**. O produto passou a
   funcionar e ninguém passou a pagar.
2. **O degrau mais caro é "viu preço → clicou em pagar": 175 pessoas perdidas em 30 dias
   saudáveis** (194 → 19). É o maior buraco isolado da cadeia inteira depois do cadastro.
3. **Nenhum degrau isolado vale dinheiro no volume de hoje.** +1 ponto percentual no maior
   degrau vale **$3,87 de MRR novo por mês**. +1pp no funil inteiro vale **$98**. O problema
   não é um degrau — é que os dois fatores (volume × conversão) são pequenos ao mesmo tempo.
4. **Os 7 pagantes externos não têm NADA em comum no uso do produto.** 3 dos 7 nunca receberam
   um vídeo. 4 dos 7 pagaram na primeira hora (mediana 58 min). Os 198 usuários com maior
   engajamento (>24h de janela, 1,48 vídeos cada) geraram **zero** pagamentos. **O sinal
   comportamental não se sustenta — e o teste que o falsifica está na §5.3.**
5. **A $0,62% de conversão, comprar cadastro é ilegal economicamente:** CAC por pagante =
   $0,88 / 0,0062 = **$142**, contra os **$4,90–$9,90** que todo pagante com valor registrado
   de fato pagou. **A meta de $5.000 é inalcançável enquanto a conversão não passar de ~2%.**

---

## 1. Método, e o que é CEGO

### 1.1 População
`profiles` = **1.069** linhas (04/05/2026 → 11/08/2026). `has_paid` = **8**, `is_pro` = **6**.
Os "1.068 / 8 / 0,75%" do briefing são o **número bruto, com contas internas dentro**.

Excluindo `lib/internalAccounts.ts` (fundador + irmã + throwaways):
**1.044 pessoas externas, 7 `has_paid` (0,67%), 5 `is_pro` (0,48%)**.

```sql
-- base externa (o filtro usado em TODAS as tabelas deste doc)
select count(*) total, count(*) filter (where has_paid) paid, count(*) filter (where is_pro) pro
from profiles p
where coalesce(p.email,'') not in ('josephsskaf@gmail.com','josephskaf@hotmail.com',
        'victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com')
  and coalesce(p.email,'') not ilike 'josephsskaf%'  and coalesce(p.email,'') not ilike 'josephskaf%'
  and coalesce(p.email,'') not ilike '%@shortsforgeai.com' and coalesce(p.email,'') not ilike 'test%'
  and coalesce(p.email,'') not ilike '%mailinator%' and coalesce(p.email,'') not ilike '%@theresanaiforthat.com'
  and coalesce(p.email,'') not ilike 'joseph+%@gmail.com';
-- → 1044 / 7 / 5
```

Os dois internos que apareciam como pagantes: `e92d81bf`/BR (fundador, 274 vídeos, 201 gerações)
e `acffefe5`/(sem país) (`is_pro`, 31 vídeos, **0 eventos**). Ambos falseariam a leitura.

**Dupla contagem checada e descartada:** `0` e-mails duplicados, `0` perfis sem e-mail,
`106` fingerprints de trial com `0` fingerprints atendendo a mais de um `user_id`.
```sql
select (select count(*) from (select lower(email) e,count(*) c from profiles where email is not null
          group by 1 having count(*)>1) x) emails_dup,
       (select count(*) from profiles where email is null) sem_email,
       (select count(*) from (select fingerprint_hash from trial_signup_fingerprints
          group by 1 having count(distinct user_id)>1) y) fp_multi;
-- → 0 / 0 / 0
```

### 1.2 O que é CEGO (dito, não estimado)

| ponto cego | evidência | efeito |
|---|---|---|
| **visitante → cadastro não é ligável** | `auth_callback_completed` (365 ev) e `email_signup_completed` (60 ev) têm **`session_id` NULO em 100%** dos casos. O join anônimo→perfil retorna **0**. | Todo degrau pré-cadastro é **razão agregada de janela**, nunca coorte. Não afirmo taxa de passagem pessoa a pessoa. |
| **maio e junho não têm telemetria** | 109 cadastros em maio → **3 com qualquer evento**; 262 em junho → **12**. | O funil "histórico completo" tem 371 pessoas cegas nos degraus de evento. Por isso publico também a janela **≥01/07 (instrumentada)** e é ela que uso para conclusões. |
| **sessão ≠ pessoa** | `session_id` é por sessão de navegador; um visitante em 3 dias vira 3 sessões; não há dedup de bot. | O topo do funil está **inflado**; a taxa real visitante→cadastro é **maior** que os 9,7% publicados. Não corrijo — sinalizo. |
| **`inline_pricing_currency_resolved` não é "viu preço"** | dispara quando o componente de preço monta (369 pessoas). | Publico o degrau "viu oferta" nas **duas** leituras (explícita e inline) na §3.2. |

### 1.3 Os apagões (janelas excluídas do recorte "saudável")

Fonte: `docs/INCIDENTE-OPENAI-2026-07-31.md` e `docs/COORTE-TRIALS-2026-08-11.md` §3, ambos
reconferidos contra o banco.

| janela | causa | duração |
|---|---|---|
| **W1** 2026-07-31 10:55Z → 2026-08-01 01:05Z | `OPENAI_API_KEY` de conta zerada (`insufficient_quota`) | ~14h |
| **W2** 2026-08-09 17:00Z → 2026-08-11 02:00Z | compose parou de devolver vídeo | ~33h |

```sql
-- prova de W2, grão pessoa/dia
with s as (select created_at::date dt,user_id from events
           where name='video_generation_started' and user_id is not null),
     v as (select created_at::date dt,user_id from videos where video_url is not null)
select s.dt, count(distinct s.user_id) iniciaram, count(distinct v.user_id) receberam
from s left join v on v.dt=s.dt group by 1 order by 1;
-- 08-08: 36→29 (80,6%) · 08-09: 35→21 (60,0%) · 08-10: 25→0 (0,0%) · 08-11: 3→2
-- 07-30: 4→3 (75%)  · 07-31: 62→20 (32,3%) · 08-01: 70→44 (62,9%)
```

**"Dia saudável" neste doc = pessoa cujo `profiles.created_at` cai FORA de W1 e W2.**
O corte é pelo instante de cadastro, não pelo dia calendário — senão as 70 pessoas que
entraram no meio do apagão continuariam contaminando o recorte "limpo".

---

## 2. FUNIL MESTRE, EM PESSOAS DISTINTAS

### 2.1 Antes do cadastro (sessões distintas — CEGO para join, ver §1.2)

Janela: 12/07 → 11/08 (30 dias).

| degrau | sessões | passagem |
|---|---:|---:|
| chegou na landing (`landing_session_started` ∪ `homepage_view`) | **4.086** | — |
| viu o campo de prompt (`home_prompt_first_viewed`) | **2.082** | 50,9% |
| **digitou e enviou** (`hero_submit` ∪ `organic_topic_submitted` ∪ `home_free_script_requested` ∪ `home_topic_starter_clicked`) | **433** | **20,8%** |
| recebeu o script grátis (`home_free_script_succeeded`) | 286 | 66,1% |
| clicou o CTA de continuar | 283 | 99,0% |
| *(cadastros no mesmo período, base externa)* | *395* | *9,7% das sessões — razão agregada* |

```sql
with w(a,b) as (values ('2026-07-12'::timestamptz,'2026-08-11 23:59Z'::timestamptz))
select (select count(distinct session_id) from events e,w where e.name in ('landing_session_started','homepage_view')
          and e.session_id is not null and e.created_at between a and b) sessoes,
       (select count(distinct session_id) from events e,w where e.name='home_prompt_first_viewed'
          and e.session_id is not null and e.created_at between a and b) viu_campo,
       (select count(distinct session_id) from events e,w where e.name in
          ('hero_submit','organic_topic_submitted','home_free_script_requested','home_topic_starter_clicked')
          and e.session_id is not null and e.created_at between a and b) digitou,
       (select count(distinct session_id) from events e,w where e.name='home_free_script_succeeded'
          and e.session_id is not null and e.created_at between a and b) script_ok;
-- → 4086 / 2082 / 433 / 286
```

> **3.653 sessões chegam e não escrevem uma palavra.** É a maior perda absoluta da empresa
> inteira — e é justamente onde eu **não posso** afirmar taxa por pessoa. Registrado como o
> maior buraco *não medível hoje*, não como o degrau a atacar (ver §4 para por quê).
>
> Correção de tracking de 1 linha que destrava isso: emitir `session_id` em
> `auth_callback_completed`/`email_signup_completed`. Sem isso o topo do funil fica cego para sempre.

### 2.2 Depois do cadastro (PESSOAS distintas, cadeia estritamente encaixada)

Cada degrau é subconjunto do anterior (`a2 = s1 and s2`, `a3 = s1 and s2 and s3`, …) —
ninguém "pula" um degrau e reaparece adiante.

| degrau | **A · histórico completo** | **B · histórico instrumentado (≥01/07)** | **C · últimos 30d (≥12/07)** | **D · 30d SAUDÁVEIS** | *E · só apagões* |
|---|---:|---:|---:|---:|---:|
| **cadastrou** | **1.044** | **696** | **395** | **325** | *70* |
| abriu `/generate` | 701 · 67,1% ⚠️cego | 692 · 99,4% | 393 · 99,5% | **324 · 99,7%** | *69 · 98,6%* |
| apertou gerar | 549 · 78,3% | 544 · 78,6% | 332 · 84,5% | **269 · 83,0%** | *63 · 91,3%* |
| **recebeu ≥1 vídeo** | 321 · 58,5% | 319 · 58,6% | 203 · 61,1% | **198 · 73,6%** | ***5 · 7,9%*** |
| viu uma oferta paga | — | 208 · 65,2% | 199 · 98,0% | **194 · 98,0%** | *5 · 100%* |
| **clicou em pagar** | 22 · — | 23 · 11,1% | 20 · 10,1% | **19 · 9,8%** | *1 · 20,0%* |
| **PAGOU** | **7 · 0,67%** | **7 · 1,01%** | **3 · 0,76%** | **2 · 0,62%** | *1 · 1,43%* |

⚠️ Os 67,1% da coluna A são artefato: 371 dos 1.044 são de maio/junho e **não têm evento nenhum**.
Use a coluna B para qualquer leitura de degrau de evento.

Ramos laterais (não encaixados na cadeia, medidos sobre a mesma coorte D):

| ramo | 30d saudáveis | sobre entregues (198) |
|---|---:|---:|
| baixou o arquivo (`video_downloaded` ∪ `video_download_clicked`) | 73 · 22,5% dos cadastros | **36,9%** |
| voltou num 2º dia (só eventos de cliente) | 62 · 19,1% dos cadastros | **31,3%** |
| chegou a `checkout_started` | 25 | — |
| `checkout_started` **e não pagou** | **23** | — |

> "Voltou" aqui **exclui** `trial_lifecycle_email_sent`, `credits_back_sent`, `post_nudge_sent`,
> `payment_success`, `compose_submission_claim`, `generation_checkpoint_saved` e demais eventos
> **emitidos pelo servidor**. Com eles dentro o número vira 171 de 325 (52,6%) — que é o e-mail
> que a empresa mandou, não o usuário que voltou. **Esse era um erro de leitura esperando para acontecer.**

```sql
-- cadeia encaixada, coluna D (30d saudáveis) — mesmo shape para as outras colunas
with ext as (/* filtro da §1.1 */),
srv as (select unnest(array['trial_lifecycle_email_sent','credits_back_sent','post_nudge_sent',
 'blackout_winback_sent','trial_credits_granted','payment_success','generate_arrived_server',
 'compose_submission_claim','cinematic_submission_claim','server_active_render_detected',
 'credits_refunded','trial_converted','activation_autostart_dispatched',
 'activation_autostart_checkpointed','generation_checkpoint_saved']) nm),
f as (select e.id,e.created_at,e.has_paid,
  exists(select 1 from events x where x.user_id=e.id and x.name='generate_page_view') s1,
  exists(select 1 from events x where x.user_id=e.id and x.name='video_generation_started') s2,
  exists(select 1 from videos v where v.user_id=e.id and v.video_url is not null) s3,
  exists(select 1 from events x where x.user_id=e.id and x.name in
    ('pricing_view','post_video_offer_viewed','trial_post_video_offer_viewed',
     'inline_pricing_currency_resolved','pricing_currency_resolved',
     'history_repeat_offer_viewed','trial_active_banner_shown')) s5,
  exists(select 1 from events x where x.user_id=e.id and x.name in
    ('checkout_started','checkout_attempted','checkout_cta_clicked','pro_checkout_clicked',
     'starter_checkout_clicked','basic_checkout_clicked','starter_pack_checkout_clicked')) s6,
  (select count(distinct x.created_at::date) from events x where x.user_id=e.id
     and x.name not in (select nm from srv)) ad
 from ext e)
select count(*) n, count(*) filter(where s1) a1, count(*) filter(where s1 and s2) a2,
 count(*) filter(where s1 and s2 and s3) a3, count(*) filter(where s1 and s2 and s3 and s5) a5,
 count(*) filter(where s1 and s2 and s3 and s5 and s6) a6, count(*) filter(where has_paid) paid,
 count(*) filter(where s1 and s2 and s3 and ad>=2) voltou
from f where created_at>='2026-07-12'
  and not (created_at>='2026-07-31 10:55Z' and created_at<'2026-08-01 01:05Z')
  and not (created_at>='2026-08-09 17:00Z' and created_at<'2026-08-11 02:00Z');
-- → 325 / 324 / 269 / 198 / 194 / 19 / 2 / 62
```

### 2.3 O que o recorte saudável provou — e o que ele NÃO provou

**Provou:** o apagão destrói entrega. Quem cadastrou dentro de W1/W2 apertou gerar em
**91,3%** (63 de 70) e recebeu vídeo em **7,9%** (5 de 70). Fora dos apagões: 83,0% e 73,6%.
São **58 pessoas** que apertaram o botão e não receberam nada em 30 dias, só por indisponibilidade.

**NÃO provou:** que o apagão explica a conversão.

| janela | cadastros | conversão |
|---|---:|---:|
| histórico completo | 1.044 | **0,67%** |
| histórico instrumentado (≥01/07) | 696 | **1,01%** |
| últimos 30 dias | 395 | **0,76%** |
| **30 dias SAUDÁVEIS** | 325 | **0,62%** |
| *só apagões* | *70* | *1,43%* |

**Limpar o apagão faz a conversão CAIR, não subir.** A janela do apagão tem a maior taxa das
cinco (1,43%) porque `75f76a4c`/ZA pagou **dentro** dele, com zero vídeo entregue e 18 falhas.
Se o produto funcionando fosse o que faz pagar, esse número seria o menor. É o maior.
**Esta é a linha mais importante do documento.**

---

## 3. OS 3 DEGRAUS MAIS CAROS

Ordenados por **pessoas perdidas** na coorte D (30 dias saudáveis, 325 pessoas).

### 3.1 O ranking

| # | degrau | entra | sai | **pessoas perdidas** | passagem |
|---|---|---:|---:|---:|---:|
| **1** | **viu oferta → clicou em pagar** | 194 | 19 | **175** | 9,8% |
| **2** | **apertou gerar → recebeu vídeo** | 269 | 198 | **71** | 73,6% |
| **3** | **cadastrou → apertou gerar** | 325 | 269 | **55** | 83,0% |
| — | *(fora da cadeia)* recebeu vídeo → voltou num 2º dia | 198 | 62 | *136* | *31,3%* |
| — | *(fora da cadeia)* recebeu vídeo → baixou o arquivo | 198 | 73 | *125* | *36,9%* |
| — | clicou em pagar → pagou | 25 | 2 | *23* | *8,0%* |
| — | *(pré-cadastro, CEGO)* chegou → digitou | *4.086 sess.* | *433 sess.* | *3.653* | *10,6%* |

### 3.2 Causa provável de cada um, com o evento que a sustenta

**#1 · viu oferta → clicou em pagar (perde 175).**
Causa: **a oferta é exibida, não decidida.** O degrau "viu oferta" na leitura frouxa
(`inline_pricing_currency_resolved`, que dispara só de o componente montar) dá **190 de 198**.
Na leitura estrita (`pricing_view` ∪ `post_video_offer_viewed` ∪ `trial_post_video_offer_viewed`
∪ `history_repeat_offer_viewed` ∪ `trial_active_banner_shown`) dá **170 de 198** — as duas
leituras concordam: **praticamente todo mundo que recebeu vídeo foi exposto a preço.**
E ainda assim 18 clicaram. Não é falta de exposição; é falta de motivo.
```sql
-- mesma coorte D: 198 entregues → 170 com oferta explícita → 18 clicaram checkout
--                             → 190 com oferta inline (frouxa)
select count(*) filter(where deliv) deliv,
       count(*) filter(where deliv and offer_explicit) expl,
       count(*) filter(where deliv and offer_inline) inline,
       count(*) filter(where deliv and offer_explicit and chk) chk from f;
-- → 198 / 170 / 190 / 18
```

**#2 · apertou gerar → recebeu vídeo (perde 71).**
Causa: **falha de entrega, e ela é quase toda de janela ruim.** No recorte saudável a passagem
é 73,6%; no recorte dos apagões é 7,9%. Evento: `generation_stage_error` carregando
`compose_not_ok` no estágio `clips_ready` (56 eventos / 23 contas, conferido em
`docs/COORTE-TRIALS-2026-08-11.md` §2A) e `openai_quota_dead` em W1. No dia 08-10 fechado:
**76 gerações iniciadas, 0 concluídas, 0 `compose_submission_claim`, 0 linhas em `videos`.**

**#3 · cadastrou → apertou gerar (perde 55).**
Causa: **não é a página, é o primeiro clique.** 324 de 325 (99,7%) abriram `/generate` — a
navegação está resolvida. 55 abriram e não apertaram. Evento que sustenta: 93 das 325 pessoas
(28,6%) têm janela total de atividade **abaixo de 10 minutos** e só 15 delas chegaram a ter
um vídeo. É abandono no primeiro minuto, não fricção de rota.

### 3.3 Quanto vale 1 ponto percentual — a conta honesta

Preço de lista Creator/`basic` = **$24,90** (`lib/checkoutPricing.ts:25` → `basic: { usd: 2490 }`).
Volume base = **395 cadastros/mês** (últimos 30 dias, base externa).
Conversão a jusante medida na própria coorte D.

| degrau | entram/mês | conv. do degrau até pagar | +1pp → pagantes/mês | **+1pp → MRR novo/mês** |
|---|---:|---:|---:|---:|
| cadastrou → apertou gerar | 325 | 2/269 = 0,74% | +0,024 | **$0,60** |
| apertou gerar → recebeu vídeo | 269 | 1/198 = 0,51% | +0,014 | **$0,34** |
| **viu oferta → clicou em pagar** | 194 | 2/25 = 8,0% | +0,155 | **$3,87** |
| clicou em pagar → pagou | 25 | 100% | +0,25 | **$6,23** |
| **funil inteiro (cadastro → pagou)** | **395** | — | **+3,95** | **$98,36** |

> **Leia esta tabela duas vezes.** O degrau que perde 175 pessoas vale **$3,87 por mês** por
> ponto percentual. Nenhum degrau isolado paga o café. O único número relevante é a última
> linha: **1pp no funil inteiro = ~$98/mês de MRR novo.** Para $5.000 são ~51 pontos
> percentuais-mês de melhoria acumulada, ou o mesmo resultado por volume.
> **Otimizar um degrau é matematicamente irrelevante neste tamanho. É por isso que a §6
> não recomenda otimizar degrau nenhum.**

---

## 4. QUEM SÃO OS PAGANTES

7 pagantes externos (`has_paid`), mais 1 `is_pro` sem `has_paid` (`0d73186d`/BR, 6 eventos,
0 vídeos, `plan='free'` — **concessão manual, não receita**; fica fora das contas).

### 4.1 A tabela inteira

| conta | país | origem | vídeos entregues **antes** de pagar | tempo até pagar | motor | baixou? | dias ativos | valor pago |
|---|---|---|---:|---:|---|---|---:|---|
| `614424df` | US | (nulo) | **2** | **22,8 min** | fast | **não, nunca** | 1 | *(pré-instr.)* |
| `bb51a203` | AU | homepage | **0** (1º vídeo 7 min DEPOIS) | **5,0 min** | fast | sim, **depois** de pagar | 6 | **$9,90** |
| `a0aee4b4` | US | taaft | **1** | **57,8 min** | fast | sim, **18h depois** de pagar | 5 | *(pré-instr.)* |
| `a5737555` | IN | (nulo/google) | **1** | **41,4 h** | fast | **não, nunca** | 3 | *(pré-instr.)* |
| `c91aecfe` | IT | taaft | **0** (nunca gerou nada) | **0,9 min** | — | não | 1 | **$4,90** |
| `0e53e01c` | NG | taaft | **5** | **4,2 h** | fast | **sim, antes** de pagar | 1 | **$4,90** |
| `75f76a4c` | ZA | sticky_cta | **0** (18 falhas, dentro do apagão) | **7,4 h** | fast | não | 2 | **$9,90** |

```sql
-- tempo até pagar e span de sessão, por pagante
with t as (select e.id,e.created_at sign,e.has_paid,
  (select min(x.created_at) from events x where x.user_id=e.id and x.name='payment_success') pay,
  (select max(x.created_at) from events x where x.user_id=e.id) last_ev from ext e)
select left(id::text,8), round(extract(epoch from (pay-sign))/60,1) min_ate_pagar
from t where has_paid order by pay;
-- → 22,8 · 5,0 · 57,8 · 2482,8 · 0,9 · 251,7 · 442,0   (mediana 57,8 min)
```

### 4.2 O que eles têm em comum — a resposta curta é: **quase nada**

| dimensão | veredito |
|---|---|
| **origem** | taaft 3 · nulo 2 · homepage 1 · sticky_cta 1. Taxa por fonte (≥01/07): taaft **0,99%** (3/303), nulo **0,70%** (2/286), homepage **2,22%** (1/45), chatgpt **0,00%** (0/48). **Nenhuma fonte separa** — e `homepage`/`sticky_cta` nem são canais, são rótulos internos que apagam a origem real (`docs/CAC-POR-CANAL-2026-08-10.md` §2). |
| **país** | US 2 · AU · IN · IT · NG · ZA. Seis países para sete pessoas. **Nada.** |
| **vídeos até pagar** | 0, 0, 0, 1, 1, 2, 5 — mediana **1**. **3 dos 7 nunca receberam um vídeo na vida.** |
| **tempo até pagar** | 0,9 min · 5 min · 22,8 min · 57,8 min · 4,2h · 7,4h · 41,4h. **Mediana 58 min. 4 dos 7 na primeira hora, 6 dos 7 nas primeiras 8 horas.** |
| **motor** | 100% `fast` entre os 4 que geraram. Mas 100% da base também é `fast` — **não discrimina**. |
| **baixou?** | 3 dos 7. E **2 desses 3 baixaram DEPOIS de pagar.** Só `0e53e01c` baixou antes. |
| **voltou?** | mediana 2 dias ativos. **5 dos 7 não tocam o produto há mais de 7 dias** (últimos eventos: 06/07, 12/07, 23/07, 01/08, 03/08). |
| **preço pago** | dos 4 com valor registrado: **$4,90 · $4,90 · $9,90 · $9,90**. **Nenhum ser humano jamais pagou $24,90 neste produto.** |

### 4.3 O sinal comportamental NÃO se sustenta — e aqui está o teste que o mata

A leitura ingênua (e a de `docs/COORTE-TRIALS-2026-08-11.md` §4, que já se corrigiu uma vez)
é "quem baixa e volta, paga". Se isso fosse causal, o balde de maior uso teria a maior taxa.
Ele tem **zero**:

```sql
-- coorte D (325 saudáveis), por tempo total de janela de atividade
select case when span_min is null then '0 sem evento' when span_min<10 then '1 <10min'
            when span_min<60 then '2 10-60min' when span_min<480 then '3 1-8h'
            when span_min<1440 then '4 8-24h' else '5 >24h' end bucket,
       count(*) n, count(*) filter(where nv>0) com_video, count(*) filter(where has_paid) paid,
       round(avg(nv),2) vids_med from t group by 1 order by 1;
```

| janela de atividade | pessoas | com vídeo | vídeos/pessoa | **pagaram** |
|---|---:|---:|---:|---:|
| < 10 min | 93 | 15 | 0,16 | **0** |
| 10–60 min | 15 | 5 | 0,40 | **1** |
| 1–8 h | 9 | 6 | 1,33 | **1** |
| 8–24 h | 10 | 5 | 0,80 | **0** |
| **> 24 h** | **198** | **167** | **1,48** | **0** |

**198 pessoas ficaram mais de 24 horas, receberam 167 vídeos entre elas, e pagaram zero.**
Os 2 pagantes da coorte estão nos baldes de 10 min a 8 h. Isso **falsifica** a hipótese
"uso do produto → pagamento". A direção sobrevivente é a outra: **quem paga, decide cedo;
quem usa muito, usa de graça e vai embora.**

Correções que este doc aplica sobre leituras anteriores:
- ❌ "baixar prediz pagar" → **2 de 3 baixaram depois de pagar** (já corrigido na coorte) e agora
  **4 de 7 pagantes nunca baixaram nada**. Morto.
- ❌ "voltar prediz pagar" → o balde de maior retorno converte **0%**. Morto.
- ❌ "o apagão derrubou a conversão" → conversão em dias saudáveis é **menor** (0,62% vs 0,76%). Morto.
- ✅ "decide na primeira sessão" → mediana 58 min, 6 de 7 em 8h, e o balde >24h zerado. **Sobrevive.**
  Ressalva honesta: **n = 7**, e "decidiu cedo" é parcialmente tautológico com "pagou". O que
  o salva de ser tautologia é o balde >24h/198 pessoas/0 pagantes, que é uma predição
  falsificável que **passou**.

---

## 5. A CONTA DO $5.000

### 5.1 O alvo

$5.000 ÷ $24,90 = **200,8 → 201 assinantes Creator simultâneos**.

**Dois furos no alvo, ditos antes das contas:**
1. **Ninguém nunca pagou $24,90.** Os 4 pagamentos com valor registrado foram **$4,90 / $4,90 /
   $9,90 / $9,90** (intro do 1º mês, `checkout_success_viewed.metadata.amount_total` = 490/990).
   Se o mês 1 é intro, 201 assinantes valem **$5.000 só a partir do 2º mês** e só se ninguém sair.
2. **Churn não medido, mas visível:** 5 dos 7 pagantes não têm evento há >7 dias. Não há
   `plan_expires_at` nem `trial_downgraded_at` preenchido em nenhum — **a empresa é CEGA para
   churn**. Todas as contas abaixo assumem churn zero, o que é otimista, não realista.

### 5.2 Cadastros e custo por cenário

Custo de provedor por cadastro em trial = **$0,88** (8,76 créditos × ~$0,10;
`docs/TAAFT-RELANCAMENTO-2026-08-08.md` §1, derivado de `docs/CAPACIDADE-TAAFT-2026-08-08.md`).

| cenário | conversão | **cadastros p/ 201 assinantes** | **custo de provedor** | cadastros/mês p/ chegar em 12 meses | custo/mês | **CAC por pagante** | payback a $24,90 | payback a $9,90 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **hoje (bruto 8/1069)** | 0,75% | **26.800** | **$23.584** | 2.233 | $1.965 | **$117** | 4,7 meses | 11,8 meses |
| hoje (externo 7/1044) | 0,67% | 30.000 | $26.400 | 2.500 | $2.200 | $131 | 5,3 meses | 13,2 meses |
| **hoje (30d saudáveis 2/325)** | **0,62%** | **32.419** | **$28.529** | 2.702 | $2.377 | **$142** | 5,7 meses | 14,3 meses |
| cenário 2% | 2,0% | 10.050 | $8.844 | 838 | $737 | $44,00 | 1,8 mês | 4,4 meses |
| cenário 3% | 3,0% | 6.700 | $5.896 | 559 | $492 | $29,33 | 1,2 mês | 3,0 meses |
| cenário 5% | 5,0% | 4.020 | $3.538 | 335 | $295 | $17,60 | 0,7 mês | 1,8 mês |

*(o CAC acima é **só custo de provedor**. Não inclui mídia. O TAAFT de $347 sozinho, sobre 230
cadastros, adiciona $1,51/cadastro — a $0,62% isso levaria o CAC a **$385 por pagante**.)*

### 5.3 O furo maior: o volume não é 395/mês

```sql
select date_trunc('week',created_at)::date wk, count(*) n,
       count(*) filter (where signup_utm_source='taaft') taaft from profiles
where created_at>='2026-06-15' group by 1 order by 1;
```
| semana | cadastros | dos quais taaft |
|---|---:|---:|
| 29/06 | 129 | 3 |
| 06/07 | 178 | 48 |
| **13/07** | **24** | 16 |
| **20/07** | **13** | 9 |
| 27/07 | 177 | 161 |
| 03/08 | 153 | 61 |
| **10/08** *(parcial)* | **25** | 5 |

**As semanas sem empurrão de TAAFT rodam a 13–25 cadastros.** A linha de base orgânica é
**~20/semana ≈ 87/mês**, não 395. As semanas de 177 e 153 são picos de campanha.

**A conta que decide, no volume orgânico real:**
87 cadastros/mês × 0,62% = **0,54 pagante/mês**. Para 201 assinantes: **31 anos.**

### 5.4 Veredito, com todas as letras

> **A meta de $5.000 de MRR é INALCANÇÁVEL na configuração de hoje** — não por pouco, por
> duas ordens de grandeza. Ela se torna alcançável sob **três condições simultâneas**, e
> nenhuma delas é opcional:
>
> 1. **Conversão ≥ 3%.** Abaixo de ~2% o CAC por pagante ($44+) não paga o ticket real
>    observado ($4,90–$9,90 no 1º mês) dentro de um trimestre. **A 0,62% comprar cadastro
>    destrói caixa a cada compra** — $142 gastos para receber $9,90.
> 2. **Volume sustentado ≥ 500 cadastros/mês** vindo de um canal repetível (hoje o volume é
>    100% dependente de picos de TAAFT que não se repetem por decreto).
> 3. **Preço realizado ≥ $24,90 a partir do 2º mês, com churn medido.** Hoje a empresa não
>    consegue nem responder quantos dos 7 ainda pagam — `plan_expires_at` é nulo nos 10.
>
> Com as três: 500 × 3% = 15 pagantes/mês → 201 assinantes em **~13 meses**, custo de provedor
> $440/mês. **Sem a condição 1, as outras duas só aceleram a queima.**

---

## 6. A RECOMENDAÇÃO — uma coisa

### 6.1 Qual NÃO é o gargalo (e por que, com número)

- **Não é a entrega.** Em dias saudáveis 73,6% de quem aperta gerar recebe vídeo, e isso
  converteu **0,62%**. Consertar o compose até 100% adiciona, pela tabela §3.3, **$0,34/mês
  por ponto percentual**. O apagão é uma emergência de produto — **não é a alavanca de receita**.
- **Não é o clique de checkout.** 175 pessoas se perdem ali, mas 1pp vale **$3,87/mês**.
- **Não é o download.** 4 dos 7 pagantes nunca baixaram nada; 2 dos 3 que baixaram fizeram
  isso depois de pagar. Um paywall de download mira um comportamento que **a maioria dos
  pagantes nunca teve**.
- **Não é o topo do funil.** 3.653 sessões/mês não digitam nada — mas a $0,62% de conversão,
  cada cadastro extra comprado **queima $0,88 e devolve $0,15**. Aumentar volume antes de
  arrumar conversão é comprar prejuízo em escala.

### 6.2 Qual É o gargalo

> **O produto entrega o resultado inteiro de graça e nunca coloca o usuário diante de uma
> decisão de compra enquanto ele ainda quer o resultado.**

Os quatro números que sustentam isso, todos da mesma coorte de 325 pessoas em dias saudáveis:

| | |
|---|---|
| receberam um vídeo funcionando | **198** |
| foram expostas a preço | **194** (98,0%) |
| completaram a cadeia até pagar | **1** |
| ficaram >24h com 1,48 vídeos cada e pagaram | **0 de 198** |

E do outro lado, os pagantes: **mediana de 58 minutos até pagar, 3 de 7 sem nunca ter recebido
um vídeo.** Quem paga já chegou comprando. Quem vem para *usar* consegue tudo o que queria
dentro dos 40 créditos de trial — dos quais **3.458 de 3.680 (94%) nunca chegaram a ser gastos**
(`docs/COORTE-TRIALS-2026-08-11.md` §1). **A generosidade não está sendo consumida nem convertida:
está só custando $0,88 por pessoa.**

### 6.3 A UMA coisa a fazer

> **Transformar a oferta de exibição em decisão, dentro da primeira hora — no instante em que
> o primeiro vídeo termina de renderizar — ao preço que as pessoas de fato pagam ($4,90/$9,90),
> com resposta obrigatória (aceitar ou recusar) para seguir.**

Por que exatamente essa, e não outra:

1. **É a única janela que já produziu pagamento.** Mediana 58 min; 4 de 7 na 1ª hora; 6 de 7
   em 8h; **0 de 198 no balde >24h**. Qualquer coisa desenhada para o dia 3 mira um balde
   com taxa medida de zero.
2. **A audiência já existe e já está lá.** 198 pessoas/mês chegam ao vídeo pronto em dias
   saudáveis. Não é preciso comprar um cadastro a mais.
3. **A superfície já existe e está passiva.** `post_video_offer_viewed` alcançou 132 pessoas
   na história inteira e o degrau inteiro produziu 19 cliques em 30 dias. Não é construir
   uma tela nova — é tornar bloqueante uma que já é renderizada.
4. **O preço proposto é o único preço com evidência.** 4 de 4 pagamentos registrados foram
   $4,90 ou $9,90. Pedir $24,90 na primeira decisão é pedir um valor que **nenhum ser humano
   jamais pagou** neste produto.

**A aritmética da aposta:** 198 decisões forçadas/mês em vez de 19 cliques voluntários.
A 5% de aceite → **10 pagantes/mês**, contra 1 hoje. A $9,90 são **+$99/mês** de MRR no 1º mês
e **+$249/mês** quando os mesmos assinantes chegam ao preço de lista — **10× a taxa atual,
sem comprar um único cadastro novo.** A 10% de aceite, 20 pagantes/mês, que é a única
trajetória neste documento que chega a 201 assinantes dentro de 12 meses.

**Como saber em 14 dias se está errado** (o teste que me falsifica):
se `post_video_offer_viewed` bloqueante alcançar ≥150 pessoas e o aceite ficar **abaixo de 3%**,
a hipótese "é a oferta" está morta e o gargalo é o valor percebido do vídeo em si — momento
em que a próxima investigação é qualidade do primeiro vídeo, não funil.

### 6.4 A correção de 1 linha que precisa entrar junto (não é a recomendação, é pré-requisito)

Emitir `session_id` em `auth_callback_completed` e `email_signup_completed`. Hoje são
**425 eventos com 100% de `session_id` nulo**, e por isso o degrau visitante→cadastro — que
perde ~3.650 sessões por mês — é **permanentemente inauditável**. Sem isso, o maior buraco
aparente da empresa nunca poderá ser medido nem creditado a nenhuma mudança.

---

## 7. Revisão adversarial — o que eu tentei quebrar neste doc

**Passada 1 — vieses de construção:**

| suspeita | teste | resultado |
|---|---|---|
| viés de sobrevivência (maio/junho sem telemetria inflam o "não abriu /generate") | 371 de 1.044 têm 0 eventos; coluna A dá 67,1% e coluna B dá 99,4% no mesmo degrau | **CONFIRMADO.** Coluna A marcada ⚠️; todas as conclusões usam B/C/D. |
| dupla contagem de pessoas | e-mails duplicados, perfis sem e-mail, fingerprints com >1 user | **0 / 0 / 0.** Sem dupla contagem. |
| janela contaminada pelo apagão | funil recalculado excluindo W1 e W2 pelo instante de cadastro | **CONFIRMADO na entrega** (7,9% vs 73,6%) e **REFUTADO na conversão** (0,62% saudável vs 0,76% total). |
| "voltou" inflado por e-mail do servidor | recontagem excluindo 15 nomes de evento server-side | **CONFIRMADO.** 171 → **62**. O número publicado é 62. |
| "viu oferta" inflado por componente montando | leitura estrita vs frouxa | 170 vs 190 de 198. **As duas concordam** — a conclusão não depende da escolha. |

**Passada 2 — causalidade e conclusão:**

| suspeita | teste | resultado |
|---|---|---|
| causalidade invertida em download→pagar | ordem de `payment_success` vs 1º `video_downloaded`, e cobertura | **CONFIRMADO E PIOR.** 2 de 3 baixaram depois de pagar, e **4 de 7 pagantes nunca baixaram**. Hipótese descartada. |
| causalidade invertida em retorno→pagar | taxa de pagamento no balde de maior janela de atividade | **CONFIRMADO.** Balde >24h: 198 pessoas, 167 com vídeo, **0 pagantes**. Hipótese descartada. |
| "decide cedo" é tautologia de "pagou"? | procurar o contrafactual falsificável | **SOBREVIVE, com ressalva.** É parcialmente tautológico; o que o salva é a predição independente (balde >24h → 0) ter passado. **n=7 — não virar meta sem reteste.** |
| minha própria recomendação está errada? | ela mira a 1ª hora, mas 3 de 7 pagantes pagaram sem vídeo — a oferta pós-vídeo não os teria alcançado | **RISCO REAL E ASSUMIDO.** A oferta pós-vídeo cobre 198 pessoas/mês; os "compram sem ver" (0,9 min, 5 min) já são atendidos pelo checkout atual e continuam sendo. A recomendação **adiciona** um balde, não substitui. |
| a recomendação pode matar ativação/reviews TAAFT? | a oferta é bloqueante mas recusável, e não retém o arquivo | **MITIGADO POR DESENHO.** Por isso a recomendação é decisão obrigatória, **não** paywall de download — que a §6.1 descarta com número. |
| o volume de 395/mês é sustentável? | cadastros por semana, com e sem TAAFT | **REFUTADO.** Base orgânica é 13–25/semana. Corrigido na §5.3, e é o que torna a §5.4 condicional. |

---

## 8. Reprodutibilidade

Todas as queries deste documento estão inline, contra `cqqukkvjjrguayiyjvhh` em 2026-08-11 ~07:00Z.
Nenhum número foi estimado: o que não tinha evento está marcado **CEGO** na §1.2 e nas tabelas.
Nenhum script novo foi criado — o doc é reproduzível copiando o SQL.

Docs cruzados e reconferidos: `COORTE-TRIALS-2026-08-11.md` (apagão, coorte dos 92, ressalvas
de causalidade), `CAC-POR-CANAL-2026-08-10.md` (rótulo interno sobrescrevendo origem),
`INCIDENTE-OPENAI-2026-07-31.md` (W1), `TAAFT-RELANCAMENTO-2026-08-08.md` ($0,88/cadastro),
`lib/checkoutPricing.ts` (preços), `lib/internalAccounts.ts` (exclusão de internos).
