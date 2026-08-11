# PLACAR DAS SUPERFÍCIES QUE PEDEM ALGO — 11/08/2026 (sprint 13h)

**Por que este documento existe.** `PROMPT-DIARIO.md` fixa duas regras que nunca
tinham sido rodadas juntas: *"a razão view→ação de toda superfície que PEDE algo
entra no placar da sprint, não na memória"* e a **Regra de Morte** (*"se uma
alavanca não moveu o número dela em 7 dias, mate a alavanca"*). Este é o primeiro
placar completo. Fonte: `public.events`, janela = **vida inteira do evento**
(não 30 dias — quatro destas superfícies são mais novas que isso), contas
internas excluídas na leitura de 30 dias e irrelevantes nas de volume baixo.

**Unidade = pessoas** (`coalesce(user_id, session_id)`), nunca eventos. Duas das
linhas abaixo teriam parecido 2× maiores contadas por evento.

---

## 1. O placar

| superfície | pediu a (pessoas) | agiram | taxa | último sinal | veredito |
|---|---|---|---|---|---|
| `viral_onboarding` | 401 | 121 | **30,2%** | 11/08 | 🟢 viva, a melhor do produto |
| `home_prompt_first` → `analyze_idea` | 2.017 | 359 | **17,8%** | 11/08 | 🟢 viva |
| `active_render_pill` | 23 | 12 | 52% (n<30) | 11/08 | 🟢 viva |
| `video_share_prompt` | 153 | 20 | **13,1%** | 11/08 | 🟡 fraca |
| `exit_intent` | 277 | 21 | **7,6%** | 11/08 | 🟡 fraca |
| `checkout_resume_banner` | 30 | 2 clicaram · **20 dispensaram** | 6,7% | 11/08 | ⚠️ ver §2 |
| `next_shorts` | 179 | 5 | **2,8%** | 11/08 | 🔴 morrer ou inverter |
| `post_video_offer` | 132 | 3 | **2,3%** | 11/08 | 🔴 morrer ou inverter |
| `trial_active_banner` | 80 | **1** · 12 dispensaram | **1,3%** | 11/08 | 🔴 morrer ou inverter |
| `taaft_review_ask` | 88 | **0 (nunca)** | **0%** | **04/08** | ⚰️ MORTA |
| `history_repeat_offer` | 21 | **0 (nunca)** | 0% (n<30) | **09/08** | ⚰️ MORTA |
| `ph_welcome_banner` | 20 | **0 (nunca)** | 0% (n<30) | 10/08 | ⚰️ MORTA |
| `video_rating` | 14 | **0 (nunca)** | 0% (n<30) | 09/08 | ⚰️ MORTA |
| `video_share_card` | 143 | **não medível** | — | 11/08 | 👁️ CEGA |

> Percentis só publicados com n ≥ 30 (piso do PROMPT-DIARIO). As linhas com
> `n<30` levam o n ao lado e **não** entram em nenhuma decisão de escala.

---

## 2. Os quatro achados que decidem trabalho

### 2.1 ⚰️ Quatro superfícies pediram algo a 143 pessoas e nunca receberam UMA resposta

`taaft_review_ask`, `history_repeat_offer`, `ph_welcome_banner` e `video_rating`.
**Não é falta de instrumento** — os eventos de ação existem no código
(`taaft_review_ask_clicked`, `history_repeat_offer_clicked`,
`ph_welcome_banner_clicked`, `ph_welcome_banner_promo_clicked`,
`video_rating_reason`, `video_rating_dismissed`) e a tabela `events` **nunca**
registrou uma linha de nenhum deles. Zero absoluto, vida inteira.

Isso é o padrão que o PROMPT-DIARIO chama de *"fallback nunca exercitado não é
fallback — é dívida que se parece com seguro"*, aplicado a pedidos ao usuário.
Duas leituras possíveis e **eu não sei qual é**, porque nenhuma foi testada:
o pedido não convence, **ou** o botão não dispara o evento (ou não dispara nada).
Dado que são 4 superfícies independentes com zero absoluto, a segunda hipótese
merece ser eliminada primeiro — é uma checagem de minutos por componente.

**`taaft_review_ask` parou de aparecer em 04/08** (88 pessoas até lá, 0 cliques).
Não afirmo por quê: pode ser desligamento deliberado ligado ao gate do TAAFT.
Registrado para não virar "sumiu e ninguém viu".

### 2.2 👁️ `video_share_card`: 143 pessoas, medida só por exibição

O código tem `video_share_card_impression` e **nenhum evento de ação pareado**.
É o caso literal de *"componente medido só por exibição é instrumento cego"*:
a Regra de Morte não consegue correr sobre ela porque não há numerador. É a
superfície de compartilhamento — ou seja, o loop de distribuição documentado hoje
de manhã em `LOOP-DISTRIBUICAO-2026-08-11.md` depende dela e não a mede.
**Conserto: nasce com evento de ação, ou some.**

### 2.3 ⚠️ `checkout_resume_banner`: a superfície com a maior taxa de compra do negócio, e a mais dispensada

Este é o número que inverte a intuição, e é o motivo de eu **não** tê-la matado:

```
30 pessoas viram        →  2 clicaram (6,7%)  →  20 DISPENSARAM (67%)
mas: dos 3 que clicaram na vida inteira, 2 PAGARAM
e os 4 pagantes da história viram este banner
```

Nenhuma outra superfície do produto tem 2 pagantes atrás dela. A leitura honesta
não é "o banner é ruim" — é **"o banner é a coisa que mais converte quando
clicada e a que mais gente manda embora"**. Com n=3 cliques, a taxa de 67% não é
publicável como estatística (piso n≥30); vale como sinal, não como número.

O que o banner diz hoje: *"Your Creator checkout is saved"* + *"First charge
$9.90 · renews at $24.90/month"*. Ou seja, o título fala de uma conveniência
nossa e a única frase de valor **anuncia um aumento de 2,5×** a quem já hesitou.
Não há uma palavra sobre o que a pessoa recebe. **Isto é hipótese minha, não
medição** — e é a primeira coisa que eu testaria nessa superfície, uma variável
por vez, depois de o A/B do trial fechar (não se roda dois A/B no mesmo funil).

Não mexi na copy nesta sprint por dois motivos: o texto cita preço (e preço é
gate do fundador), e o A/B 3d×7d está aberto.

### 2.4 🔴 Três superfícies vivas mas abaixo de 3%

`next_shorts` (179 → 5), `post_video_offer` (132 → 3) e `trial_active_banner`
(80 → 1). As três seguem aparecendo hoje. A Regra de Morte manda matar ou
inverter; **inverter é mais barato que matar** aqui, porque as três ocupam o
momento certo (logo depois de um vídeo pronto) e erram o pedido. `post_video_offer`
é a única das três que pede dinheiro — 132 pessoas viram a oferta pós-vídeo e 3 agiram.

---

## 3. O que isto muda no plano

1. **Antes de escrever copy nova, provar que os botões disparam.** Quatro zeros
   absolutos em superfícies independentes é assinatura de instrumento quebrado,
   não de persuasão ruim. Checagem por componente, minutos cada.
2. **`video_share_card` ganha evento de ação ou sai do ar** — o loop de
   distribuição não pode depender de uma superfície cega.
3. **O banner de resgate não morre.** É a única superfície com pagantes atrás.
   O trabalho nela é de copy e entra depois do A/B do trial.
4. **Nada disto exige tráfego pago.** O gate do TAAFT ($347) segue com um
   argumento a mais: 445 pessoas já receberam pedidos nossos e 4 superfícies
   não souberam dizer se alguém respondeu.

---

## 4. Como reproduzir

```sql
-- Placar view→ação. Trocar os dois nomes de evento.
select name, count(*) eventos,
       count(distinct coalesce(user_id::text, session_id)) pessoas,
       min(created_at)::date desde, max(created_at)::date ate
from public.events
where name in ('<superficie>_shown', '<superficie>_clicked')
group by 1 order by pessoas desc;
```

Contas internas: `email ilike 'josephsskaf%' or ilike 'josephskaf%' or
ilike '%@shortsforgeai.com' or ilike '%@mailinator.com' or ilike '%@example.com'`.

⚠️ Armadilha encontrada nesta sprint: `NOT IN (subquery)` devolve **zero linhas**
se a subquery contiver um `NULL`. Uma medição minha deu `0` onde o certo era `17`
por causa de um `payment_success` sem `user_id`. Sempre `where user_id is not null`
dentro da subquery.
