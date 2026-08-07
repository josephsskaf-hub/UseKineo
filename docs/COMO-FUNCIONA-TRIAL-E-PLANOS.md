# Como funciona o Reverse Trial e os planos pagos

Escrito em 07/08/2026, depois do primeiro teste real ponta a ponta em produção.
Este arquivo descreve o que ESTÁ RODANDO, não o que foi planejado.
Fonte da verdade no código: `lib/reverseTrial.ts`, `lib/freeTierOffer.ts`,
`lib/checkoutPricing.ts`. Se este doc divergir do código, o código ganha —
e o doc é que está com bug.

Tudo abaixo depende da flag `KINEO_REVERSE_TRIAL_ENABLED=true` (Vercel,
Production). Com ela OFF, o produto volta byte a byte ao modelo antigo
("3 free Shorts every 24h") sem desfazer nenhum dado.

---

## 1. Cadastro → trial automático

Conta nova recebe **trial Creator na hora**, sem cartão e sem clicar em nada:
**40 créditos** (`TRIAL_GRANT_CREDITS = TRIAL_CREDIT_CAP = 40`).

Prazo sorteado entre **3 e 7 dias** (`TRIAL_VARIANT_DAYS`), decidido por hash
FNV-1a do id do usuário — a mesma pessoa cai sempre no mesmo braço. É o teste
A/B que vai dizer qual prazo converte melhor.

A ativação roda em DOIS lugares independentes, de propósito:
- `POST /api/track-signup-source` (chamada do cliente), e
- o Server Component de `/generate` (primeiro ponto autenticado do servidor).

O segundo existe porque o primeiro falhou no primeiro teste real: aquela rota
tem trava de sessão (`sfa_src_sent`) e quem já tinha feito a chamada na aba
nunca a refazia — conta nova, zero crédito, silêncio. A função é idempotente
(perfil <24h, `trial_status` não-nulo nunca reativa, CAS na escrita), então
chamar dos dois lados não concede dois trials.

### Quem NÃO ganha trial (em ordem de checagem)
1. flag OFF;
2. perfil com mais de 24h de vida;
3. e-mail descartável (47 domínios/tokens em lista única);
4. `trial_status` não-nulo — **um trial por conta, para sempre**;
5. conta que já paga (denylist invertida: na dúvida, é pagante);
6. mesmo fingerprint de device/IP com 2 ativações em 30 dias.

O bloqueio por fingerprint é **silencioso por contrato**: a conta é criada
normal, sem mensagem acusatória. Falso positivo custa um brinde que ninguém
prometeu; falso negativo custa 40 créditos.

O fingerprint é hash SHA-256 salgado de (IP + user-agent + accept-language),
calculado na borda. **IP cru nunca é gravado.** Sem o
`KINEO_TRIAL_FINGERPRINT_SALT` a checagem concede (fail-open) mas grita:
`console.error` + evento `trial_fingerprint_salt_missing` + faixa vermelha em
`/admin/trial-abuse`.

---

## 2. Durante o trial: tratado como conta paga

`getEffectiveEntitlement()` é a ÚNICA resposta para "esta conta é tratada como
paga?". Durante o trial:

| | Trial |
|---|---|
| Fast | **1 crédito**, export limpo |
| Marca d'água | não |
| Corte de 15s | não |
| Cota do free tier | não consome |
| Vídeo de IA (Seedance) | **20 créditos** |
| Kling / Veo 3.1 / Hollywood | **bloqueados** (402 "Studio engines") |

40 créditos = 2 vídeos de IA, ou 40 Fasts, ou qualquer mistura.

⚠️ INVARIANTE: `allowsStudioEngines` é `isPaidAccount`, **nunca** `treatAsPaid`.
Trocar isso destrava Kling/Veo na tela e o servidor devolve 402 — tela que
mente. O mesmo cuidado vale para etiquetas de preço: o card do Fast usa
`fastCostsCredit` (que inclui trial), e não `anyPaid` (que destrava motores).

---

## 3. Fim do trial

Acaba pelo que vier primeiro: **40 créditos gastos** ou **prazo vencido**.

- No teto, expira **dentro da própria request** do vídeo — não espera cron.
- A contagem é **idempotente por render** (`trial_debit_ledger`), porque o RPC
  `debit_video_credits` é idempotente por `render_id` e devolve sucesso no
  replay. Sem isso, um replay somava de novo e o trial morria depois de UM
  vídeo com 20 créditos na conta (bug real, achado no primeiro teste).
- Estorno devolve ao teto e **ressuscita o trial** se foi o teto que o matou.

### Modal de fim de trial
Aparece **na hora** (fases `ending` e `downgraded`), com duas travas: nunca para
quem paga, nunca para quem não recebeu crédito. Mostra Creator × grátis e leva
ao `/pricing` — **sem preço fixo na tela e sem qualquer menção a desconto**.

Antes ele dependia do cron das :55 e podia chegar até 1h atrasado, ou seja,
depois de a pessoa já ter ido embora. Esse é o momento de maior intenção de
compra do produto.

### Cron `trial-downgrade` (:55 de cada hora)
Promove `active`/`expired` → `downgraded` e **revoga o saldo não gasto do
grant**. Nunca toca crédito comprado nem conta pagante.

✅ PENDÊNCIA FECHADA EM CÓDIGO (07/08 03:40) — `KINEO-DOWNGRADE-CRON-FIX-2026-08-07`

**O que aconteceu.** O cron rodou DUAS vezes com uma linha comprovadamente
elegível e não processou nenhuma: 01:55:17Z (perfil `84c9ddee` já `expired`,
40/40 desde 01:31:47Z) e 02:55:07Z (o mesmo perfil, `expired`, 41/40 desde
02:47:06Z). Nas duas o HTTP foi 200 e o console ficou **vazio** — enquanto o
`send-post-nudge` das 02:50:42Z, no MESMO deployment e com o MESMO cliente
service-role, logou normalmente. Ou seja: o problema não era permissão de
banco, não era a flag, não era `isPayingProfile` e não era coluna faltando no
SELECT (`trial_credits_used` sempre esteve lá).

**Causa raiz.** Duas linhas, e as duas na rota:

1. `app/api/cron/trial-downgrade/route.ts` — a coorte perguntava
   `.in('trial_status', ['active','expired'])`, uma SEGUNDA cópia em SQL da
   lista que `trialNeedsDowngrade()` já tinha em TypeScript. Uma GET **sem
   nenhum parâmetro variável** (a rota tirou o timestamp do SQL de propósito),
   portanto byte a byte idêntica em toda rodada — a única query deste projeto
   que um cache de `fetch` do App Router pode servir repetida. Nas horas em que
   ainda não existia trial nenhum a resposta era `[]`; as rodadas seguintes
   herdavam esse `[]`. Todos os outros crons escapam por acidente: as queries
   deles interpolam `now`, então a chave nunca repete.
2. `if (ids.length > 0) console.log(...)` (última linha do handler) — a rota era
   observável **exatamente quando funcionava** e muda **exatamente quando
   falhava**. Foi por isso que o smoke de 03:10Z fechou com "causa raiz não
   determinada": não havia o que ler.

**O que mudou.**
- A coorte não opina mais sobre elegibilidade: o SQL só pergunta "já teve
  trial?" e exclui os estados terminais — e a lista de terminais vem de
  `TRIAL_TERMINAL_STATUSES`, **a mesma constante** que `trialNeedsDowngrade`
  usa. Não existe mais uma segunda cópia da regra para envelhecer sozinha.
  `trialNeedsDowngrade` é o juiz único (e a releitura dentro de
  `downgradeExpiredTrial` é o segundo juiz, sobre dado fresco).
- O cliente do cron passa `cache: 'no-store'` explícito.
- O cron **sempre** loga e sempre responde com `cohort_rows`, `cohort_count`,
  `due`, `processed`, `deferred`, `skip_reasons` (agregado do porquê de cada
  descarte) e `tally`.
- `cohort_count` é uma contagem independente feita pelo banco com o mesmo
  predicado. Se ela vier > 0 e a leitura vier vazia em DUAS tentativas, a rota
  responde **500 `cohort_read_mismatch`** em vez de 200 mudo.

**Teste falsificável (o fundador confere).** Depois do deploy, na virada
das :55, o perfil `84c9ddee-1404-48d0-b7a6-163c860fad0a` tem que sair de
`trial_status='expired'` para `'downgraded'`, com `trial_downgraded_at`
preenchido e um evento `trial_downgraded` em `events`. `video_credits` continua
0 e `credits_revoked` vem 0 — esse perfil já gastou 41 de 40, não há saldo a
revogar; o que se prova aqui é o **processamento**, não a revogação. Se às HH:56
ele ainda estiver `expired`, o log do cron agora diz o motivo em uma linha.

---

## 4. Régua de e-mails (cron 16:30 UTC, 1x/dia)

| Momento | E-mail |
|---|---|
| D0 (<24h da ativação) | "Seu trial Creator está no ar — 40 créditos" |
| D2 (braço 3d) / D5 (braço 7d) | "Acaba amanhã" + o que se perde |
| Expirou com <10 dos 40 usados | **+3 dias automáticos**, uma vez por conta |
| D5 após o fim, sem converter | **50% off por 3 meses** (COMEBACK50) |
| D10 após o fim | Última chamada do mesmo cupom |

Idempotência por `trial_emails_log` com PK (user_id, email_kind) e reserva
ANTES do envio — envio duplicado é impossível. Quem converteu sai da régua na
hora (o webhook do Stripe carimba `converted`).

**O desconto de 50% só existe nesses e-mails.** Nenhuma superfície pública
menciona desconto — decisão do fundador, garantida por varredura.

---

## 5. Free tier residual (quem não tem trial)

**1 vídeo Fast por mês**, 15 segundos, com marca d'água `usekineo.com/free` —
**uma marca só**, desde 07/08 (antes eram três elementos dizendo a mesma coisa).

Toda a copy sai de `getFreeTierOffer()`, fonte única ligada à flag: ~190
ocorrências em 69 arquivos. Com a flag OFF, a copy antiga volta idêntica.

PENDÊNCIA: o **480p não saiu** — o builder do Creatomate é 1080x1920 fixo, sem
alavanca. O grátis sai marcado e curto, mas em alta resolução.

---

## 6. Planos pagos

| Plano | USD | BRL | Créditos/mês | Vídeos de IA |
|---|---|---|---|---|
| Starter | $9,90 | R$49,90 | 25 | 1 + Fasts |
| Creator (`basic`) | $24,90 | R$99,90 | 150 | ~7 |
| Studio (`pro`) | $37,90 | R$189,90 | 200 | 10 |

Qualquer plano pago destrava **todos** os motores, inclusive Veo e Hollywood.
Preço regional automático em 18 países (BR, IN, NG, PK…), primeiro mês
promocional, plano anual e 7 dias de garantia.

⚠️ Preço e moeda saem SEMPRE de `lib/checkoutPricing.ts`. Nunca escrever valor
em outro lugar: `priceLabel` em USD fixo já mentiu para 2 de 3 moedas uma vez.

### Conversão
O webhook do Stripe marca `trial_status='converted'` em 4 pontos
(pack avulso, assinatura, resume, `invoice.payment_succeeded`). Isso encerra
e-mails e modal. `downgraded` nunca vira `converted`, e um débito atrasado
nunca sobrescreve `converted` com `expired`.

---

## 7. O funil em uma frase

A pessoa entra, ganha 40 créditos sem cartão, faz 2 vídeos de IA de verdade,
bate no teto no momento de maior empolgação, vê o modal na hora, e se não
comprar recebe 50% off cinco dias depois.

---

## 8. Rollback

Uma variável: `KINEO_REVERSE_TRIAL_ENABLED=false` + redeploy. Nenhum dado
precisa ser desfeito. Os créditos já concedidos permanecem com quem recebeu.
