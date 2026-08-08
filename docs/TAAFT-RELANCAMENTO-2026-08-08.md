# TAAFT — PACOTE DE DECISÃO PARA AS 18h · 08/08/2026

Marcador: `KINEO-TAAFT-RELAUNCH-2026-08-08`
Para: fundador. Tempo de leitura: 3 minutos. Nenhum número aqui é chute — cada um tem
query (banco `cqqukkvjjrguayiyjvhh`) ou link com a data em que foi verificado.

> **⚠️ LEIA ISTO ANTES DE TUDO — o achado que muda a decisão de hoje.**
> **A ficha do Kineo JÁ ESTÁ PUBLICADA no TAAFT.** Verificado hoje em
> https://theresanaiforthat.com/ai/kineo/ — *"Released 8d ago"*, tarefa **Videos**,
> rank **#240** de 2026, contador **9.359**, nota **3.0 de UMA review**, e o status
> **`Owner tools locked`** (a ficha nunca foi reivindicada por você).
> Os $347 do TAAFT são a **taxa de submissão de uma ferramenta NOVA**. O Kineo não é
> nova — ela já está lá, e os 210 cadastros de 31/07 vieram **sem você pagar nada**.
> **Não confirmei** se o TAAFT aceita pagar $347 por uma ficha que já existe: o
> formulário pede a URL da ferramenta e eu não submeti nada. Antes do cartão, ver §4.

---

## 1. A PERGUNTA DO DINHEIRO, RESPONDIDA COM NÚMERO

### Os quatro números que decidem

| medida | valor | onde veio |
|---|---:|---|
| Cadastros com `signup_utm_source='taaft'` (histórico) | **293** | query A |
| Desses, viraram pagantes | **4** → **1,37%** | query A |
| Cadastros TAAFT desde 31/07 (o pico anterior) | **210** | query A |
| Desses, viraram pagantes | **2** → **0,95%** | query B |
| Conversão medida signup→pago da empresa (7d) | **1,38%** | `docs/BUGHUNT-2026-08-08.md:35` |
| ARPU Creator | **US$ 24,90/mês** | `docs/PRODUCT_AND_OFFER.md:15` |
| **Trials que viraram pagantes** | **0 de 17** | query B |
| Créditos de trial gastos por conta (média real) | **8,76** | query B |
| Custo de provedor por cadastro novo | **~$0,88** | 8,76 cr × ~$0,10/cr (`docs/CAPACIDADE-TAAFT-2026-08-08.md` §1) |

### A conta, em uma linha

**Cada cadastro que o TAAFT manda vale $0,34 de receita no primeiro mês
(1,38% × $24,90) e custa $0,88 de provedor no primeiro mês.**
Ou seja: hoje, **um cadastro do TAAFT dá prejuízo de $0,54 no mês 1** — antes de
contar os $347. Ele só empata quando o pagante fica **2,6 meses**.

### Quantos cadastros para os $347 se pagarem?

$347 ÷ $24,90 = **13,9 mensalidades Creator**. A 1,38%, isso são
**1.010 cadastros para pagar os $347 num único mês.**
O maior pico da história da empresa trouxe **66 cadastros num dia** e 210 em 8 dias.
**1.010 cadastros num mês nunca aconteceu.**

### CAC e payback nos três cenários (o TAAFT promete 700 a 10.000+ cliques)

Conversão clique→cadastro medida: **210 cadastros / 640 sessões TAAFT = 32,8%**
(`docs/PRELAUNCH-TAAFT-2026-08-08.md` §1.1).

| cliques entregues | cadastros | pagantes (1,38%) | receita/mês | caixa gasto ($347 + $0,88/cad.) | **CAC por pagante** | **payback** |
|---:|---:|---:|---:|---:|---:|---:|
| 700 (piso prometido) | 230 | 3,2 | $79 | $549 | **$173** | **7,0 meses** |
| 2.000 | 656 | 9,1 | $225 | $924 | **$102** | **4,1 meses** |
| 10.000 (teto prometido) | 3.280 | 45,3 | $1.127 | $3.233 | **$71** | **2,9 meses** |

CAC **por cadastro** no piso: $347 / 230 = **$1,51** — abaixo do gate de $3 que você
mesmo definiu na Ordem O (`docs/ORDENS-AQUISICAO-2026-08-02.md:316`).

### A RESPOSTA, COM TODAS AS LETRAS

**Na conversão de HOJE, os $347 NÃO se pagam em 30 dias em nenhum dos três cenários.**
No piso prometido (700 cliques) o payback é **7 meses**, e só se **ninguém cancelar** —
e eu **não confirmei churn**, porque só existem 6 assinaturas na história e a base é
pequena demais para medir.

E existe um número pior que todos os de cima: **0 de 17 trials viraram pagantes.**
O trial de 40 créditos entrou em 07/08; a conversão trial→pago da empresa é
literalmente **zero até agora**. Se ela continuar zero, **$347 não se pagam nunca** —
independente de quantos cadastros o TAAFT trouxer.

**A honestidade que vale mais que o otimismo:** este é um investimento em
*aprendizado*, não em *retorno*. O que $347 compra hoje com segurança são ~230 trials
para descobrir se o funil converte. Se você quer comprar retorno, o número não fecha.
Se você quer comprar a resposta de "o produto vende?", é caro mas é a única forma
rápida de saber. **E há uma alternativa de $0 na §4 que talvez compre parte disso de graça.**

---

## 2. O QUE MUDOU DESDE O ÚLTIMO PICO (31/07) — por que agora é diferente

Em 31/07 o produto FALHOU na cara de quem chegou: 163 tentativas, 116 falhas,
**16% de sucesso**, causa = **saldo de provedor zerado** (OpenAI às 11:07Z), não código
(`docs/PRELAUNCH-TAAFT-2026-08-08.md` §2). Isso é o que mudou desde então:

| estava quebrado em 31/07 | está agora | evidência |
|---|---|---|
| **Sem trial** — conta nova entrava sem crédito nenhum | **40 créditos** em todo cadastro, tratado como conta paga | 17 contas de trial criadas, 16 ativas (query B) |
| **Cofre de clips morto há 15 dias** — `clip_vault.score` INTEGER recebendo FLOAT; todo clip de stock era baixado e recusado, jogando toda cena de volta na Pixabay | **Corrigido** (`safeVaultScore()`), órfão apagado quando o índice recusa | `docs/BUGHUNT-2026-08-08.md` §1 — 60 timeouts de 504, 41 pessoas sem vídeo |
| **Pixabay sem timeout, sem retry, sem disjuntor** — lambda presa 120s, gateway devolvia 504 cru, 41 pessoas sem vídeo e sem aviso | **timeout 6s + 1 retry + disjuntor de instância**, tudo *fail-open* | `docs/CAPACIDADE-TAAFT-2026-08-08.md` §4.1 |
| **Download falhava em 1 de cada 3 celulares** (10 falhas / 5 pessoas no mobile; 0 no desktop) | **Resgate de download** no ar desde 08/08 09:19Z | `docs/PRELAUNCH-TAAFT-2026-08-08.md` §1.3 · **ainda sem um único caso medido a favor ou contra** |
| **Checkout:** quem clicava em comprar criava sessão Stripe e nunca chegava ao Stripe (`checkout_redirect_timeout`) | Corrigido | `docs/CHECKOUT-REDIRECT-2026-08-08.md` |
| **Conta em trial não via preço NENHUM** na tela do vídeo pronto — `post_video_offer_viewed` caiu 29→19→5→**0** | Caixa de oferta do trial no ar desde 08/08 09:19Z | `docs/BUGHUNT-2026-08-08.md` §1 defeito #2 |
| **Nenhum teto de gasto no produto inteiro** — nada entre 65 contas novas e a fatura do fal | **Teto global de 150 renders de IA/24h** (`KINEO_GLOBAL_DAILY_AI_RENDER_CAP`), desligável sem redeploy | `docs/CAPACIDADE-TAAFT-2026-08-08.md` §4.2 |
| **Home prometia "3 vídeos/dia"** — oferta que não existe, menor que a real | Agora diz **"40-credit trial"**; FAQ parou de se contradizer sobre marca d'água | `docs/PRELAUNCH-TAAFT-2026-08-08.md` §4.1–4.3 |
| **No celular, o banner de instalar app tapava a nav inteira** (inclusive "Pricing"), e 32px de toda tela ficavam sob a barra de baixo | Corrigido | `docs/PRELAUNCH-TAAFT-2026-08-08.md` §4.5–4.7 — **69% do tráfego TAAFT é celular** |

**O que NÃO mudou e você precisa saber:** o alarme de saldo avisa, mas **não recarrega**.
Se o saldo estiver baixo às 18h, o 31/07 se repete idêntico. É por isso que a §3 existe.

---

## 3. CHECKLIST DE 5 MINUTOS ANTES DE PAGAR

Os três primeiros são os que fizeram o dinheiro de 31/07 evaporar. **Nenhum é código.**

| # | Abrir | Conferir | Se estiver errado |
|---|---|---|---|
| 1 | [platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing) | Saldo > $0 | **Zerou às 11:07Z de 31/07 e matou 71 gerações.** Recarregar antes de pagar o anúncio. |
| 2 | [fal.ai/dashboard/billing](https://fal.ai/dashboard/billing) | **≥ $300** (teto de exposição medido: $269) | Seedance é pré-pago. Sem saldo, todo vídeo de IA morre. |
| 3 | [creatomate.com](https://creatomate.com) → Billing | Créditos > ~1.200 | **Entra em TODO render**, Fast ou IA. ~5,7 cr por Short. |
| 4 | [resend.com](https://resend.com) → Usage | Envios do dia < 100 | Free = **100/dia**. Um pico estoura o limite DIÁRIO, não o mensal. |
| 5 | [supabase.com/dashboard/project/cqqukkvjjrguayiyjvhh](https://supabase.com/dashboard/project/cqqukkvjjrguayiyjvhh) → Usage | Storage + egress | 251 dos 259 vídeos moram lá. |
| 6 | `https://www.usekineo.com/?utm_source=taaft` **no celular** | Carrega, diz "40-credit trial" (não "3 / day") | Conferido agora: **HTTP 200**. `/signup?utm_source=taaft` também **200**. |
| 7 | **Criar uma conta nova de verdade, no celular** | Nasce com `trial_status='active'` e **40 créditos**; o botão do onboarding **não** diz "watermarked" | Últimos dias: 17 cadastros, 17 com trial. O motor está ligado. |

**Não repito aqui o resto.** A lista completa de 10 itens (incluindo "este commit está no
ar" e "gerar 1 vídeo até o fim no celular") está em
`docs/PRELAUNCH-TAAFT-2026-08-08.md` §6. Os painéis com a justificativa de cada um estão
em `docs/CAPACIDADE-TAAFT-2026-08-08.md` §2.

> **Nota honesta:** eu **não consigo ver nenhum desses saldos**. O `.env.local` da máquina
> só tem placeholders e fal/Creatomate/Resend não expõem endpoint público de saldo.
> Os itens 1–5 são **obrigatoriamente olho seu**.

---

## 4. ONDE EXATAMENTE CLICAR NO TAAFT — e o preço confirmado HOJE

**Fonte:** https://theresanaiforthat.com/get-featured/ e https://theresanaiforthat.com/launch/
(`/submit/` redireciona para `/launch/`), **lidas em 08/08/2026**.

### O preço NÃO mudou. $347 está confirmado.

| pacote | preço vigente | o que entrega | prazo |
|---|---:|---|---|
| **Website only** | **$49** uma vez | Listagem permanente · 50–100 cliques na 1ª semana, 100+ no longo prazo · analytics básico · bônus PPC de $100 | 1–2 dias úteis |
| **Everything you need** (= "Maximum Exposure", o "Recommended") | **$347** uma vez | Tudo do anterior · **700–10.000+ cliques** · **vaga garantida na newsletter** · revisão prioritária · analytics ampliado · bônus PPC de $300 | 1–2 dias úteis |
| Highlight | **$99/mês** (recorrente) | Destaca a listagem orgânica, "até 4x mais cliques", fica na home enquanto pago | imediato |
| Featured (PPC) | lance por clique, **mínimo 1.000 cliques** (a tela abre com $2/clique = $4.000) | Anúncio na seção "Featured", posição pelo lance | imediato |
| Custom campaign | sob consulta | contato direto | — |

**Contradições da própria página, para você não ser vendido por elas:** o `/get-featured`
diz newsletter de **1,2M+** assinantes e valor de **$3k**; o `/launch` diz **2,5M+** e
**$1.000**. As duas páginas são do mesmo site, no mesmo dia. **Trate o valor da
newsletter como marketing, não como número.**

**Política de reembolso (a seu favor):** *"We guarantee a full, automatic refund if your
AI doesn't get published."* Ou seja: se o TAAFT recusar por já existir uma ficha,
**o dinheiro volta automaticamente**. O risco financeiro de tentar é baixo; o risco é de tempo.

### ⚠️ O bônus de $300 de PPC: você NÃO se qualifica

Texto literal da página: *"Launch on TAAFT first and get up to $300 PPC bonus. Your tool
**must not** appear on any other platform before the launch."*
O Kineo já aparece — **no próprio TAAFT**, desde 31/07. **Descarte os $300 da conta.**
Se você fez a matemática mentalmente como "$347 menos $300 de bônus = $47", ela está errada.

### A sequência de cliques

**PASSO 0 (GRÁTIS, faça ANTES de decidir qualquer coisa — 10 minutos):**
1. Abrir https://theresanaiforthat.com/ai/kineo/
2. Menu **AI Options → "Claim AI"**. A ficha está `Owner tools locked` — nunca foi sua.
   Reivindicar é grátis e a página diz: *"if your AI is verified, all updates are free and
   self-service."*
3. Depois de verificada, corrigir de graça: a ficha diz **`from $9.90/mo`** e o Q&A diz
   `$11.90/$24.90/$37.90`, e **nenhum dos dois menciona os 40 créditos de trial**.
4. A nota é **3.0 de UMA review** — é isso que trava o rank em #240. Uma review honesta
   a mais move mais o ranking do que $347 movem.

**PASSO 1 (se ainda quiser pagar):**
1. Abrir https://theresanaiforthat.com/launch/
2. Campo **Tool URL** → `https://www.usekineo.com`
3. **Select Package** → coluna **"Recommended · Maximum Exposure · $347"**
4. (Opcional) marcar *"I want to schedule my launch date"* + fuso. A Ordem O já decidia:
   **cair terça ou quarta**, que é quando o público pesquisa ferramenta
   (`docs/ORDENS-AQUISICAO-2026-08-02.md:299`).
5. **"Pay & Launch Tool"** → Stripe. **Este clique é seu, nunca meu.**

**O que eu NÃO confirmei e você descobre nesse passo:** se o formulário aceita a URL de
uma ferramenta já listada, ou se recusa/duplica. Não submeti nada. Se ele recusar, o
caminho é https://theresanaiforthat.com/contact-us/?reason=custom-campaign perguntando
**quanto custa só a menção na newsletter para uma ficha que já existe** — que é a única
coisa dos $347 que você ainda não tem.

---

## 5. COMO MEDIR SE DEU CERTO

### A UTM
**Você não controla o link.** Verificado no HTML da ficha hoje: o TAAFT reescreve todo
link de saída como
`https://www.usekineo.com/?ref=taaft&utm_source=taaft&utm_medium=referral`.
A boa notícia é que **isso já funciona** — é exatamente esse `utm_source=taaft` que
produziu os 293 cadastros medidos. **Não precisa fazer nada.**
**Não confirmei** se um `utm_campaign` próprio na URL cadastrada sobrevive à reescrita —
por isso não conte com `utm_campaign=relaunch_ago26` para separar este pico do anterior.
**Para separar, use a DATA**, não a campanha (query C abaixo).

### A query de 10 segundos
Já existe, testada, 8 linhas, roda no SQL Editor do Supabase:
**`docs/CAPACIDADE-TAAFT-2026-08-08.md` §6.** Não vou repetir aqui.
Ela responde: entrou gente? gerou? falhou? quanto custou? A leitura em 10 segundos está
logo abaixo dela ("A sobe e H parado = ninguém consegue gerar").

**Query C — a única coisa que a §6 não responde: cadastro virou dinheiro?**
```sql
select date_trunc('day', created_at)::date as dia,
       count(*) as cadastros_taaft,
       count(*) filter (where has_paid) as pagaram,
       count(*) filter (where trial_status='active') as em_trial
from public.profiles
where signup_utm_source = 'taaft' and created_at >= '2026-08-08'
group by 1 order by 1;
```

### Os 3 números, com o valor de corte

| quando | número | **funcionou** | **corta** |
|---|---|---|---|
| **24h** | cadastros TAAFT (query C, coluna `cadastros_taaft`) | **≥ 40** | **< 15.** O pico de 31/07 deu **66 num dia sem você pagar nada**. Se o pacote pago render menos de 15, ele não entregou o que vendeu. |
| **24h** | taxa de entrega = linha H ÷ linha A da query da §6 | **≥ 70%** | **< 50% → PARE E CONSERTE ANTES DE OLHAR VENDA.** Em 31/07 foi 16% e o dia inteiro virou pó. Ler a linha G para saber o motivo. |
| **72h** | pagantes (query C, coluna `pagaram`) | **≥ 1** | **0 com ≥150 cadastros = o problema é o funil, não o canal.** Vai para o Plano B. |
| **7d** | CAC por cadastro = 347 ÷ cadastros acumulados | **< $3** (o gate que você definiu) | **> $5 → morto, não repetir** (mesma regra que matou o Product Hunt e o Fazier). |

---

## 6. O PLANO B

### Se render cadastro mas não render venda (o cenário mais provável)
É o cenário mais provável porque **hoje é o que está acontecendo: 17 trials, 0 pagantes.**
Nesse caso os $347 **não foram perdidos, foram convertidos em amostra.** O que se faz
com ela, em ordem:

1. **Ligar a sequência de e-mails do trial.** `trial_emails_log` tem **0 linhas em toda a
   história** — a sequência nunca entregou uma mensagem
   (`docs/BUGHUNT-2026-08-08.md` §1 defeito #5). Com 200+ trials na mão, é o teste mais
   barato que existe. **Atenção:** os crons de e-mail estouram o limite de 2 req/s do
   Resend e o `send-cap-hit` **perde o e-mail para sempre** quando o Resend recusa
   (`docs/CAPACIDADE-TAAFT-2026-08-08.md` §5.1). Ligar **depois** do pico, não durante.
2. **Medir o degrau exato onde eles param.** Na janela limpa medida: 33 viram o vídeo
   pronto → **17 baixaram**. Metade some com o arquivo na tela. Com 200 pessoas em vez de
   33, esse número deixa de ser ruído e vira decisão.
3. **Perguntar o preço, não adivinhar.** 40 pessoas viram preço e 10 clicaram em comprar
   nos últimos 7 dias. Com volume, dá para testar oferta de verdade.

**A pergunta que os $347 respondem, e que $0 não responde:** o produto não vende porque o
funil quebra, ou porque a oferta não interessa? Hoje a amostra é pequena demais para
saber, e **essa é a decisão mais cara que você tem em aberto.**

### Se render nada em 72h — o sinal de corte
**Corte = menos de 50 cadastros acumulados em 72h.**
Nesse ponto: registrar o TAAFT como canal pago morto, **não repetir**, e pedir o reembolso
se a ficha não tiver sido publicada (a política deles garante automático).
É a mesma regra dos 7 dias da Ordem O, e a mesma que já matou PH e Fazier — a regra só
vale se você a aplicar quando dói.

### O que eu faria no seu lugar (e é só opinião, o número está na §1)
**Fazer o PASSO 0 hoje (grátis) e adiar os $347 até o primeiro trial virar pagante.**
Razão: os 210 cadastros de 31/07 vieram **de graça**, com a ficha travada, nota 3.0 e
preço errado na página. Destravar a ficha, corrigir o preço, mencionar os 40 créditos e
conseguir 2–3 reviews honestas move o rank #240 **sem gastar $1**. Se isso sozinho
recuperar o fluxo de cadastros, você economizou $347 e ainda respondeu a mesma pergunta.
Se não recuperar, os $347 continuam ali na quarta-feira — e aí você paga sabendo que
tentou o de graça primeiro.

---

## 7. AS QUERIES (para você conferir qualquer número acima)

**Query A — cadastros e pagantes por canal**
```sql
select coalesce(signup_utm_source,'(nulo)') as origem,
       count(*) as cadastros,
       count(*) filter (where has_paid) as pagos,
       round(100.0*count(*) filter (where has_paid)/nullif(count(*),0),2) as conv_pct
from public.profiles group by 1 order by 2 desc;
```
Resultado em 08/08/2026: `taaft` = **293 cadastros / 4 pagos / 1,37%** ·
`(nulo)` = 639 / 2 / 0,31% · `chatgpt` = 22 / 0 / 0% · `homepage` = 15 / 1 / 6,67%.

**Query B — o pico anterior e o estado do trial**
```sql
select
 (select count(*) from public.profiles where signup_utm_source='taaft' and created_at>='2026-07-31') as taaft_desde_3107,
 (select count(*) from public.profiles where signup_utm_source='taaft' and created_at>='2026-07-31' and has_paid) as taaft_pagos_desde_3107,
 (select count(*) from public.profiles where trial_status is not null) as trials_total,
 (select count(*) from public.profiles where trial_status='active') as trials_ativos,
 (select count(*) from public.profiles where trial_status is not null and has_paid) as trial_para_pago,
 (select round(avg(trial_credits_used),2) from public.profiles where trial_status is not null) as media_cr_trial_usados;
```
Resultado em 08/08/2026: **210 / 2 / 17 / 16 / 0 / 8,76**.

**Query C** — está na §5.

**Fontes da web, todas lidas em 08/08/2026:**
- https://theresanaiforthat.com/get-featured/ — preços $49 / $347 / Highlight $99/mo / PPC
- https://theresanaiforthat.com/launch/ — comparativo dos pacotes, bônus de $300, FAQ
- https://theresanaiforthat.com/ai/kineo/ — ficha do Kineo: *Released 8d ago*, rank #240,
  nota 3.0 (1 review), contador 9.359, `Owner tools locked`
- https://www.usekineo.com/?utm_source=taaft — **HTTP 200** · `/signup?utm_source=taaft` — **HTTP 200**

**O que eu NÃO confirmei (e por isso não estimei):**
- Saldo de fal, OpenAI, Creatomate, Resend e Supabase — sem acesso; é a §3, olho seu.
- Se o TAAFT aceita cobrar $347 por uma ferramenta já listada.
- Como a ficha atual do Kineo foi publicada (grátis, $49, ou submissão de terceiro).
  Todos os docs do repo dizem que o gate dos $347 **nunca foi liberado**, e a ficha está
  `Owner tools locked` — o que indica que não foi você.
- O que exatamente o contador "9.359" da ficha mede (impressões ou cliques). O nosso banco
  mediu **640 sessões** com `utm_source=taaft` — os dois números não batem e não são
  a mesma coisa.
- Churn / LTV: só 6 assinaturas na história. Amostra insuficiente. Por isso todo payback
  da §1 assume **zero cancelamento**, que é o cenário otimista.
