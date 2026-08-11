# O RESGATE MANDOU 377 E-MAILS E NUNCA FALOU COM QUEM QUEBROU

**Sprint 16h · 11/08/2026 · tarefa de aquisição (rotação: Funil / Analytics)**
Medido em produção (`cqqukkvjjrguayiyjvhh`), contas internas excluídas dos 5 padrões
de sempre (`josephsskaf%`, `josephskaf%`, `%@shortsforgeai.com`, `%@mailinator.com`,
`%@example.com`). Pessoas, nunca eventos.

---

## O número que abre o documento

**26 pessoas estão em trial ATIVO, tentaram gerar um vídeo, a geração falhou, e
nenhuma delas jamais recebeu uma única mensagem sobre isso.**

| medida | valor |
|---|---|
| trials ativos | 96 |
| trials com ZERO vídeo | **52** (54%) |
| desses, os que TENTARAM e a geração falhou | **26** |
| que receberam `video_rescue` | **0** |
| que receberam `stalled_rescue` | **0** |
| que receberam `credits_back` | **0** |
| que pediram opt-out de e-mail | **0** |
| créditos parados na conta deles | **1.040** (40 cada, intactos) |
| ativos no produto nas últimas 48h | **26 de 26** |
| com trial vencendo em 72h | **12** |

Os 40 créditos intactos são a prova de que o estorno automático funcionou. O
dinheiro voltou. **A pessoa não sabe.**

---

## A parte que não é óbvia

O instinto diz "trial que não gera vídeo é lead frio". Os dados dizem o
contrário, e por uma margem que não deixa dúvida.

Os 52 trials sem vídeo nenhum:

| etapa | pessoas (de 52) | eventos |
|---|---|---|
| chegaram em `/generate` | **52** | 148 |
| viram o onboarding | **52** | 96 |
| clicaram em "analisar ideia" | 43 | 144 |
| **começaram uma geração** | **35** | **90** |
| bateram em erro de estágio | 31 | 133 |
| geração falhou | **26** | 61 |

Ninguém sumiu. Ninguém ficou com preguiça. **Essas 52 pessoas produziram 90
tentativas de geração e receberam zero vídeos.** Elas não são um funil que
vazou — são um funil que quebrou na mão delas.

O estágio onde mais gente morre é `clips_ready` (24 das 52), que é o degrau do
Compose. O último erro nesse estágio é de **10/08 18:35Z** — dentro da janela do
apagão do fornecedor (09/08 16:21Z → 11/08 02:00Z). Ou seja: boa parte desta
coorte é a fatura do apagão, ainda aberta, com as pessoas ainda logadas.

---

## Por que ninguém falou com elas — a causa exata

Existe um cron de resgate. Ele **funciona**, e funciona todo dia:

```
vercel.json → "0 14 * * *"  /api/cron/send-video-rescue
profiles.video_rescue_sent_at não-nulo: 378
   · envios reais: 377
   · último envio real: 11/08/2026 14:01:09Z  (2 horas antes desta medição)
```

Não é gate desligado, não é `CRON_SECRET` faltando, não é flag de e-mail. A
máquina está no ar e disparou hoje.

O defeito está numa linha de definição — `app/api/cron/send-video-rescue/route.ts:222-224`:

```ts
const latest = latestVideoByUser.get(u.id) ?? 0
// No video yet → not activated; leave for later (do NOT mark).
if (latest === 0) { skipped++; continue }
```

O mapa vem de `select user_id, created_at from videos`, **sem filtro de status**.
Quer dizer: o único sinal de "esta pessoa se ativou" que o sistema de resgate
conhece é *existir uma linha em `videos`*. E a linha em `videos` só nasce no
checkpoint do Compose, isto é, **só no sucesso**.

> **Quem falhou não tem linha. Quem não tem linha é invisível. O sistema de
> resgate só sabe conversar com quem já teve sucesso.**

E ele nem carimba a conta ao pular (`do NOT mark`), então a mesma pessoa é
descartada de novo todo dia às 14:00Z, silenciosamente, para sempre. Foi o que
aconteceu com essas 26 hoje de manhã.

Nada disso aparece em lugar nenhum: `send-video-rescue` **não grava um único
evento**. O rastro é um `console.log`. A única forma de medir é a coluna
`video_rescue_sent_at` — que é exatamente a coluna que fica nula.

---

## Por que consertar a seleção sem mexer na copy seria PIOR

O corpo do e-mail de resgate abre assim (`route.ts:76-114`, assunto em `:246`):

> **"You made a Short 🎬 — here's 50% off to make more"**
> "You already did the hard part — you generated a real Short with AI: script,
> voiceover, captions and footage, all automatic. Nice work."

Para estas 26 pessoas isso é falso na primeira frase, e falso do pior jeito
possível: confirma para quem acabou de ver o produto quebrar que o produto nem
percebeu. E o CTA pede $4,90 a quem está com **40 créditos de trial intactos e
nunca viu o produto funcionar** — cobrança antes da entrega de valor.

Ampliar o público sem ramificar a copy troca "e-mail não enviado" por "e-mail
que mente". Não vale.

---

## A correção, em nível de linha (NÃO implementada nesta sprint)

Escopo pequeno, mas mexe num cron que dispara e-mail para fora — e o Send para
fora é gate do fundador. Fica escrito, pronto, para o GO.

1. **Novo sinal de ativação.** Depois do bloco `:153-163`, ler `events` com
   `.in('name', ['video_generation_failed','generate_failed'])` para um
   `latestFailByUser`.
2. **`:189-190` e `:222-226`** (os dois blocos andam juntos, o próprio arquivo
   avisa em `:181-183`): trocar `latest` por
   `Math.max(latestVideoByUser.get(id) ?? 0, latestFailByUser.get(id) ?? 0)`.
3. **`buildEmail(userId)` → `buildEmail(userId, mode)`**, com `mode` decidido por
   `latestVideoByUser.get(id) > 0`. O ramo `failed_attempt` tem que:
   - reconhecer a falha em vez de parabenizar;
   - afirmar que **os 40 créditos continuam lá** (é verdade, está medido);
   - mandar de volta para `/generate`, **sem pitch de pagamento nenhum**.
4. **Instrumentar:** `events.insert({ name: 'video_rescue_sent', metadata: { mode } })`
   logo após o envio. Hoje este cron é o único do lifecycle que não deixa rastro
   no banco.

O que **não** precisa mudar, porque já está certo:

- **Supressão cruzada de 24h** — os novos ids entram em `sendableIds` e passam
  por `loadLifecycleSuppression` como qualquer outro; os e-mails D1/D2/D3 do
  trial calam este cron automaticamente.
- **Colisão com `send-activation-nudge`** — impossível por construção: a coorte
  dele é `created_at` entre 1h e 6h; esta exige sinal com ≥24h. Disjuntas.

---

## O que isto vale

12 das 26 vencem o trial em 72 horas. Se nada acontecer, elas vão embora
acreditando que o produto não entrega — e são, medidas pelo comportamento, as
pessoas de maior intenção do banco: chegaram, tentaram 90 vezes, e ainda estavam
logadas nas últimas 48 horas.

Nenhuma delas pediu opt-out. Todas têm crédito. Nenhuma foi avisada.

**Este é o único lugar do funil onde a mensagem custa zero, o público está
quente, o saldo está pago e a janela fecha em três dias.**

---

## Regra Zero aplicada — o que já existia e não precisa ser construído

| coisa | estado |
|---|---|
| cron de resgate | **existe e roda** (377 envios, último hoje 14:01Z) |
| coluna de idempotência (`video_rescue_sent_at`) | existe |
| supressão cruzada de 24h | existe e está ligada |
| estorno automático dos créditos da falha | **existe e funcionou** (40/40 intactos) |
| `KINEO_LIFECYCLE_EMAILS_ENABLED` | ligada |
| segmentação da coorte | **é este documento** |
| ramo de copy para quem falhou | **não existe** ← o único trabalho novo |

Não há nada a construir além de uma definição e um parágrafo de texto.
