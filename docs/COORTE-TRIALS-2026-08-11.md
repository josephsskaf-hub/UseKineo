# COORTE DOS 92 TRIALS — segmentação, causa por grupo e sinal de conversão

`[KINEO-TRIAL-COHORT-2026-08-11]` · dados lidos em 2026-08-11 ~06:00Z · painel vivo: `/admin/trial-cohort`

> **Repo é público.** Nenhum e-mail, nome ou id de sessão aqui. Contas aparecem como
> prefixo de UUID (8 chars) + país. Os e-mails reais só existem no painel admin,
> que é renderizado em runtime atrás do allowlist.

---

## 0. TL;DR — o que muda a semana

1. **A causa nº 1 de trial parado não é desinteresse: é o produto ter quebrado.**
   Entre 2026-08-09 17:00Z e 2026-08-11 02:00Z (~33h) o compose devolveu **zero** vídeos.
   No dia 08-10 fechado: **76 gerações iniciadas, 0 concluídas, 63 falhas, 0 `compose_submission_claim`,
   0 linhas novas em `videos`**. **23 dos 92** trials ativos queimaram relógio nessa janela.
2. **"Gerou e não baixou" NÃO é falha de download.** Os 28 desse grupo **nunca clicaram
   em Download uma única vez** (`video_download_clicked` = 0, `video_download_failed` = 0).
   24 dos 28 viram o `video_ready_viewed`. Eles viram o vídeo e não quiseram o arquivo.
3. **O "comportamento-sinal" existe, mas é MUITO mais fraco do que parece.**
   Quem tem ≥2 `video_downloaded` paga 6,67% vs 0,28% de quem nunca gerou (24×) — porém
   com `is_pro` em vez de `has_paid` isso vira ~11×, **2 dos 3 pagantes baixaram DEPOIS de pagar**,
   e o balde é confundido por exposição. Detalhe e correções na §4. **Não transformar em meta
   sem ler as ressalvas.**
4. **25 trials vencem em 24h.** 39 em 48h. Os 92 em 7 dias.
5. **Este doc foi revisado adversarialmente e três afirmações da 1ª versão foram falsificadas**
   (o "17 atingidos", a direção da causalidade download→compra, e o "0 de 92 chegaram a 2 downloads").
   As correções estão marcadas em linha, não apagadas.

---

## 1. A coorte (92 contas com `trial_status = 'active'`)

| Grupo | n | Créditos usados (méd.) | Créditos parados | Vence 24h | 48h | Depois |
|---|---:|---:|---:|---:|---:|---:|
| **A · Nunca gerou** | **46** | 0,2 | 1830 | 8 | 11 | 27 |
| **B · Gerou e não baixou** | **28** | 4,6 | 990 | 13 | 1 | 14 |
| **C · Baixou e sumiu** | **1** | 1,0 | 39 | 0 | 1 | 0 |
| **D · Ativo e gastando** | **16** | 2,8 | 596 | 4 | 1 | 11 |
| **E · Bateu no teto / quase (≥30/40)** | **1** | 37,0 | 3 | 0 | 0 | 1 |
| **TOTAL** | **92** | 2,4 | **3458** | **25** | **14** | **53** |

Regra de corte (primeira que casar vence, então os cinco somam 92 sempre):
teto ≥30 → baixou **e** voltou noutro dia → baixou → gerou → resto.
Os 92 receberam 40 créditos cada = 3680 concedidos; **3458 (94%) nunca foram gastos**
e evaporam junto com o relógio.

**Origem de cadastro:** homepage 33 · chatgpt 28 · direct 16 · taaft 11 · outros 4.
Quem chega por `taaft` gasta mais (4,8 créditos médios) que quem chega pela homepage (1,5).

**País (grupos maiores):** A → US 9, BR 4, IN 3 · B → US 12, DE 3, GB 2 · D → AU 3, US 3, ES 2.
Cauda muito longa: o resto é 1 conta por país.

---

## 2. Causa provável de cada grupo — sustentada por evento

### A · Nunca gerou (46) — *não é apatia, é falha*
| Evidência | Valor |
|---|---|
| Viram o `/generate` (`generate_page_view`) | **46 de 46** |
| **Chegaram a apertar gerar** (`video_generation_started`) | **30 de 46** |
| Tiveram `video_generation_failed` / `generate_failed` | 19 de 46 |
| **Tiveram QUALQUER falha** (incluindo `generation_stage_error`) | **25 de 46** |
| Nunca iniciaram nada | 16 de 46 |
| Último `generation_stage_reached` = `failed` | 19 contas |

> **Nota de método:** os nomes de evento são **conjuntos de aliases**, não nomes únicos —
> `generate_failed` ≡ `video_generation_failed`, e `generation_stage_error` carrega o
> `compose_not_ok`. Contar só um nome subestimava as falhas (19 → **25**). `/api/admin/funnel`
> já fazia `Math.max` sobre o par pelo mesmo motivo; o painel novo agora também.

**Causa:** dois terços tentaram. O maior motivo de erro na coorte é
`compose_not_ok` no estágio `clips_ready` (56 eventos, 23 contas) — o vídeo monta os clipes
e morre na composição final. Só 16 das 46 são "olhou e não quis".
Chamar esse grupo de "não engajado" é ler errado o próprio log.

### B · Gerou e não baixou (28) — *hipótese de bug de download FALSIFICADA*
| Evidência | Valor |
|---|---|
| `video_download_clicked` | **0 de 28** |
| `video_download_failed` / `popup_blocked` | **0 de 28** |
| Viram o vídeo pronto (`video_ready_viewed`) | **24 de 28** |
| Vídeos por conta (méd.) | 1,3 |

**Causa:** não houve falha porque não houve tentativa. O vídeo ficou pronto, a pessoa
viu, e o arquivo não valeu o clique. Isso é qualidade/expectativa do primeiro vídeo —
não é entrega. É o grupo mais caro da coorte (4,6 créditos médios, 990 parados) e o mais
urgente (13 dos 28 vencem em 24h).

> **Nota de método (importante para não repetir o erro):** `video_downloaded` só é emitido
> no caminho blob (`lib/videoDownload.ts`). Um usuário mobile resgatado pelo link manual
> é entregue e aparece com 0. Por isso o corte honesto é `video_download_clicked = 0`
> (nunca tentou), não `video_downloaded = 0`. Nos 28, os dois são zero — a conclusão se sustenta.

### C · Baixou e sumiu (1)
Uma conta. Baixou 1 vídeo, não voltou há ~44h, vence em 48h.
**Causa:** amostra de 1 — não dá para concluir nada, e não merece campanha própria (ver §5).

### D · Ativo e gastando (16) — *o grupo que se parece com quem paga*
Baixaram ≥1 arquivo **e** voltaram em outro dia. 2,8 créditos médios, 1,6 vídeos,
596 créditos ainda na mão. 4 vencem em 24h.
**Causa de risco:** nada aqui está quebrado — o risco é o relógio, não o produto.
2 das 16 tiveram `video_download_failed`.

### E · Bateu no teto / quase (1)
Uma conta em 37/40, 18 vídeos, 78 sessões, ativa há 13h.
**Causa:** acabou a pista. Não consegue gerar de novo sem plano. É o lead mais quente
da base inteira e são 3 créditos de distância do bloqueio.

---

## 3. O incidente que contamina tudo (08-09 17:00Z → 08-11 02:00Z)

| Dia | Iniciadas | Concluídas | Falhas | `compose_submission_claim` | Linhas em `videos` |
|---|---:|---:|---:|---:|---:|
| 08-08 | 66 | 49 | 1 | 54 | 50 |
| 08-09 | 66 | 30 | 20 | 32 | 30 |
| **08-10** | **76** | **0** | **63** | **0** | **0** |
| 08-11 (6h) | 4 | 2 | 0 | 3 | 2 |

O último `compose_submission_claim` antes da queda foi às 08-09 16:xx; o primeiro depois,
às 08-11 02:00Z. **~33 horas sem produzir um único vídeo**, com 76 pessoas tentando no pico.

Dois efeitos que precisam entrar em qualquer leitura desta coorte:
- **23 dos 92** trials ativos têm falha dentro da janela completa (08-09 17:00Z → 08-11 02:00Z),
  contando o conjunto de aliases (`video_generation_failed` / `generate_failed` /
  `generation_stage_error`) — é este o número que o painel mostra.

  Todas as leituras, para não haver ambiguidade:

  | recorte | só `*_failed` | com aliases |
  |---|---:|---:|
  | dentro da janela do apagão | 20 | **23** |
  | em qualquer momento | 24 | 30 |
  | só no dia 08-10 | 17 | — |

  *(Correções da revisão adversarial: a 1ª versão dizia **17**, que é o dia 08-10 sozinho — contado
  num grão e rotulado com outro; a 2ª dizia 20, que é a janela certa mas sem o conjunto de aliases.)*
- A série `video_downloaded` para em **08-09 16:22** e não volta. Isso **não** é regressão
  de tracking: não havia vídeo para baixar. Conferido no código — `lib/videoDownload.ts`
  não mudou a semântica do evento no deploy mobile de 08/08 (o rescue adiciona eventos
  novos, não renomeia o antigo).

---

## 4. O que separa quem pagou de quem não pagou

Base: 1043 contas externas (internas de `lib/internalAccounts` excluídas), 7 pagantes reais.

| Balde | Contas | Pagaram | Taxa |
|---|---:|---:|---:|
| **≥2 `video_downloaded`** | 45 | 3 | **6,67%** |
| 1 download | 52 | 0 | 0,00% |
| Gerou, nunca baixou | 222 | 2 | 0,90% |
| Nunca gerou | 724 | 2 | 0,28% |

E por retorno:

| Dias distintos com atividade | Contas | Pagaram | Taxa |
|---|---:|---:|---:|
| 0 | 337 | 0 | 0,00% |
| 1 | 418 | 4 | 0,96% |
| 2–3 | 254 | 1 | 0,39% |
| **4+** | 34 | 2 | **5,88%** |

**Leitura ingênua:** o sinal seria "levar o arquivo embora e voltar", 6,67% vs 0,28% = 24×.
**Leitura correta:** ver as ressalvas — a maior parte desse 24× não sobrevive ao escrutínio.

### Ressalvas — o que este número NÃO prova

Isto é o que impede a métrica de virar superstição. **Duas destas ressalvas nasceram de uma
revisão adversarial que falsificou a primeira versão desta seção; o texto anterior estava errado.**

1. **n = 3.** Três pagantes no balde de ≥2 downloads. Um a mais ou a menos move a taxa em pontos inteiros.
2. **A CAUSALIDADE ESTÁ QUASE TODA INVERTIDA.** A primeira versão deste doc afirmava que os
   downloads antecediam a compra. Isso foi medido contra `checkout_started`, que é o evento errado.
   Contra `payment_success`:

   | pagante | `payment_success` | 1º `video_downloaded` | baixou antes de pagar? |
   |---|---|---|---|
   | `bb51a203`/AU | 2026-07-09 22:22:08Z | 2026-07-09 22:31:11Z | **não** (pagou 9 min antes) |
   | `a0aee4b4`/US | 2026-07-10 02:51:34Z | 2026-07-10 21:08:32Z | **não** (pagou 18h antes) |
   | `0e53e01c`/NG | 2026-08-03 09:25:27Z | 2026-08-03 05:22:36Z | sim (2 downloads antes) |

   **Só 1 dos 3 baixou antes de pagar.** Para os outros dois, o download é *consequência* de ter
   plano, não causa da compra. O "24×" é, em boa parte, causalidade reversa.
3. **Confundidor não controlado: exposição.** Os baldes são monotônicos em uso —
   média de dias ativos 0,72 → 1,81 → 2,40 → **3,09**; média de eventos 12,5 → 36,8 → 80,6 → **150,9**.
   "≥2 downloads" é em grande medida um proxy de "usou muito o produto", que é o preditor trivial
   de pagar. Nada aqui controla tenure ou sessões.
4. **A definição de "pagou" muda o resultado.** Com `has_paid`: 6,67% vs 0,28% = 24×.
   Com `is_pro` (assinatura ativa de verdade): **4,44% vs 0,41% = ~11×**. Dos 7 `has_paid`,
   **3 têm `plan='free'`** e 2 desses não têm assinatura nenhuma — são compradores de pacote avulso.
5. **Contraexemplo forte: 2 dos 7 pagantes nunca geraram nada.**
   - `c91aecfe`/IT fez checkout **2 segundos** depois do signup — comprou sem ver o produto.
   - `75f76a4c`/ZA, **a conversão de ontem**, é o caso mais desconfortável do relatório.
     Linha do tempo real (corrigida na revisão — a 1ª versão dizia "1 geração" e "10 créditos"):
     cadastrou 08-10 14:04 dentro do apagão · geração cinematográfica às 14:08 que **nunca entregou** ·
     **20 créditos** estornados pelo `refund-sweep` às 17:30 (`cinematic_abandoned_no_delivery`) ·
     mais 2 falhas às 21:24 e 21:25 (`Render service rejected the job`) ·
     **`payment_success` às 21:26:40, 34 segundos depois da segunda falha**, tier `basic` (= Creator) ·
     e então **mais 4 falhas já como cliente pagante** (21:29, 21:31, 21:38, 22:25).
     Total: **7 tentativas de geração — 1 abandonada sem entrega + 6 falhas registradas —
     0 vídeos, 0 downloads** e um cartão cobrado. (A cinematográfica das 14:08 não emitiu
     `video_generation_failed`: ela ficou pendurada e só apareceu no `refund-sweep`. Por isso
     "6 falhas" e "7 tentativas" são ambos corretos, em recortes diferentes.)

**Conclusão honesta:** a conversão de ontem **não** valida o funil de ativação — ela aconteceu
apesar de o produto não ter entregue nada, e o cliente continuou falhando *depois* de pagar.
Tratá-la como prova de que "o trial está funcionando" seria o erro mais caro possível esta semana.
É também o maior **risco de chargeback** da base.

**A métrica a perseguir:** `% de trials que baixam 2 vídeos antes do fim do relógio`.
Hoje, na coorte viva: **4 de 92** têm ≥2 eventos `video_downloaded` (**3 de 92** se exigir dois
vídeos *distintos*) — ou seja, ~3–4%.

> *Correção da revisão adversarial:* a primeira versão afirmava "**0 de 92**, nem uma conta chegou
> a dois downloads, é por isso que a coorte não converte". Era **falso** — o número saiu da mesma
> SQL de agrupamento da §1, onde essas contas são absorvidas pelos grupos D e E e nunca contadas
> como ≥2. A frase causal construída em cima dele foi removida. E a correção **enfraquece** a tese:
> 3–4 contas já exibiram o "comportamento-sinal" e mesmo assim não converteram.

---

## 5. Ordem de ataque (por dinheiro por hora restante)

| # | Alvo | n | Por quê |
|---|---|---:|---|
| 1 | **Consertar/confirmar o compose** | — | Nada abaixo importa se 08-10 se repetir. |
| 2 | **A · nunca gerou, com falha registrada** | 25 | Devemos um vídeo a eles. É desculpa + entrega, não venda. |
| 3 | **B · gerou e não baixou, vence em 24h** | 13 | 990 créditos parados, relógio no fim. |
| 4 | **E · no teto** | 1 | Único lead que já provou querer o produto 18 vezes. |
| 5 | **D · ativo, vence em 24h** | 4 | Só precisa saber que o relógio existe. |
| — | **C · baixou e sumiu** | 1 | **Não fazer campanha.** Ver §6. |

**Sem desconto em nenhum destes.** A política de 50% é exclusiva dos e-mails D5/D10 que já existem
(`trial_emails_log`: `expired_offer_d5`, `expired_lastcall_d10`). Rascunhos em
`docs/EMAILS-COORTE-TRIALS-2026-08-11.md` — **nada foi enviado**.

---

## 6. Grupo que não merece e-mail

**C · Baixou e sumiu (n = 1).** Uma conta não é um segmento. Escrever copy dedicada para 1 pessoa
custa mais do que vale, e o texto seria indistinguível do e-mail do grupo D. Ela já está coberta
pelo `ending_soon` automático. Quando o grupo passar de ~10 contas, vira campanha.

Também **não** se deve escrever para as **16 contas do grupo A que nunca iniciaram nada**
com o e-mail de desculpas: elas não sofreram falha nenhuma e mandar "desculpa pelo erro"
para quem não viu erro destrói a credibilidade do resto da campanha. Elas caem no
`ending_soon` normal.

---

## 7. Como reproduzir

Painel: **`/admin/trial-cohort`** (read-only, allowlist de `_shared/db`, ordenado por relógio).
Ele recalcula os cinco grupos com exatamente a regra da §1 a cada request.

```sql
-- Segmentação dos 5 grupos — ESPELHA o painel exatamente:
--   · "levou o arquivo" = video_downloaded OU video_download_clicked
--     (o resgate mobile entrega sem emitir video_downloaded)
--   · "gerou" usa o par de aliases completed
--   · vence_24h tem LIMITE INFERIOR: trial expirado não conta como "vence em 24h"
--   · crédito parado sai de trial_credits_granted, não da constante 40
with t as (
  select id, trial_credits_used, trial_credits_granted, trial_ends_at
  from profiles where trial_status = 'active'
),
ev as (
  select e.user_id,
    count(*) filter (where e.name in ('video_generation_completed','generate_completed')) gd,
    count(*) filter (where e.name in ('video_downloaded','video_download_clicked'))       tookfile,
    count(distinct date_trunc('day', e.created_at))                                       days
  from events e join t on t.id = e.user_id group by 1
),
v as (select user_id, count(*) vids from videos where user_id in (select id from t) group by 1)
select case
  when t.trial_credits_used >= 30                             then 'E_teto'
  when coalesce(ev.tookfile,0) > 0 and coalesce(ev.days,0) >= 2 then 'D_ativo'
  when coalesce(ev.tookfile,0) > 0                            then 'C_baixou_sumiu'
  when coalesce(ev.gd,0) > 0 or coalesce(v.vids,0) > 0        then 'B_gerou_nao_baixou'
  else 'A_nunca_gerou' end grp,
  count(*) n,
  round(avg(t.trial_credits_used),1) cred_medio,
  sum(greatest(coalesce(nullif(t.trial_credits_granted,0),40) - t.trial_credits_used, 0)) cred_parados,
  count(*) filter (
    where t.trial_ends_at > now() and t.trial_ends_at < now() + interval '24 hours'
  ) vence_24h
from t left join ev on ev.user_id = t.id left join v on v.user_id = t.id
group by 1 order by 1;
```

*Hoje os dois recortes de "levou o arquivo" dão o mesmo resultado (os 18 que clicaram são
exatamente os 18 que baixaram, e os 28 do grupo B têm zero dos dois), então a segmentação da §1
não muda. A diferença só aparece quando o resgate mobile for usado de verdade.*

```sql
-- O apagão do compose: iniciadas vs concluídas por dia
select date_trunc('day',created_at)::date d,
  count(*) filter (where name='video_generation_started')   iniciadas,
  count(*) filter (where name='video_generation_completed') concluidas,
  count(*) filter (where name='video_generation_failed')    falhas,
  count(*) filter (where name='compose_submission_claim')   compose
from events where created_at > now() - interval '9 days' group by 1 order by 1;
```

```sql
-- Sinal: taxa de pagamento por nº de downloads (internas excluídas)
with ext as (
  select p.id, p.has_paid from profiles p
  where not (lower(p.email) like 'josephsskaf%' or lower(p.email) like 'josephskaf%'
    or lower(p.email) like '<conta interna>' or lower(p.email) like '<conta interna>'
    or lower(p.email) like '<conta interna>' or lower(p.email) like 'test%'
    or lower(p.email) like '%mailinator%' or lower(p.email) like 'smoketest%'
    or lower(p.email) = '<conta interna>')
),
m as (select ext.id, ext.has_paid,
  (select count(*) from events e where e.user_id=ext.id and e.name='video_downloaded') dl,
  (select count(*) from events e where e.user_id=ext.id and e.name='video_generation_completed') gen
  from ext)
select case when dl>=2 then 'dl_2+' when dl=1 then 'dl_1'
            when gen>=1 then 'gerou_sem_baixar' else 'nunca_gerou' end balde,
  count(*) contas, count(*) filter (where has_paid) pagaram,
  round(100.0*count(*) filter (where has_paid)/nullif(count(*),0),2) taxa_pct
from m group by 1 order by taxa_pct desc;
```

---

## 8. O que este trabalho NÃO fez

- Não enviou e-mail, não mexeu em preço, crédito, plano ou entitlement — só `SELECT` e uma tela.
- Não estendeu o trial de ninguém, inclusive dos 23 atingidos pelo apagão. **Essa decisão é do
  fundador** e tem custo: 23 × até 40 créditos. `trial_extended` já existe no schema para isso.
- Não corrigiu `fetchAllRows` (`app/api/admin/_shared/db.ts`), que pagina com `.range()` **sem
  `.order()`** e devolve array PARCIAL em erro, sem sinalizar. Isso é infra compartilhada por
  todas as telas admin e mexer nela tem raio de explosão maior que esta tarefa. O painel novo se
  protege com um aviso ("não confie nestes números") quando a leitura de eventos volta vazia.
- Não investigou a causa-raiz do `compose_not_ok` — só provou que existe, quando, e quem atingiu.
