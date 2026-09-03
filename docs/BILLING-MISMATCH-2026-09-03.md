# BILLING MISMATCH — INVESTIGAÇÃO FECHADA (03/09/2026)

> Pendência aberta no commit `8000825f` ("o billing mismatch de 34 pessoas sem
> entrega, que exige investigacao no banco antes de codar"). Investigação feita
> direto no Postgres de produção (`cqqukkvjjrguayiyjvhh`). Nada foi alterado.

---

## 1. A CAUSA, EM UMA FRASE

**O preço do filme é calculado DUAS VEZES, em dois momentos diferentes, e a
entrega é recusada quando os dois números não batem — mesmo com o filme pronto
e o crédito já estornado.**

`lib/cinematic/claim.ts:441-443` (`loadSettledCinematicClaimForRender`):

```ts
if (
  (!isDebited && !isRefunded) || birth.claim.quality !== quality ||
  birth.claim.creditCost !== cost ||                 // ← ESTA LINHA
  !birth.claim.resolutionReference.startsWith('cinematic-')
) {
  return { ok: false, error: 'cinematic birth/compose billing mismatch' }
}
```

Quem chama: `app/api/compose/status/[renderId]/route.ts:336-348`. Em `!prepaid.ok`
a rota devolve **503** e **sai antes de persistir o vídeo**. Como é essa rota que
grava a linha em `videos`, o filme nunca existe para o cliente. E o cron
`finish-stranded-renders` cutuca a MESMA rota — recebe 503 em todo ciclo, para
sempre. Não há caminho de recuperação automática.

## 2. POR QUE OS DOIS NÚMEROS DIFEREM — E O PONTO NÃO ÓBVIO

- Claim de nascimento (`cinematic_submission_claim`): preço pela duração
  **pedida** no início.
- Claim de compose (`compose_submission_claim`): preço pela duração
  **entregue**, via `creditCostForDuration(quality, true, duration)`.

O filme segue o áudio real e fecha onde a fala termina — a régua
"35/60/90 é norte, não camisa de força" (CLAUDE.md, fundador 02/09). Quando a
duração muda entre o nascimento e a montagem, o preço muda com ela, e o guarda
de cobrança lê isso como fraude.

**Ou seja: a flexibilidade de duração que faz o filme sair melhor é exatamente
o que bloqueia a entrega dele.** Quanto mais o produto honra o áudio, maior a
chance de o cliente não receber nada.

É o mesmo defeito de `KINEO-DURACAO-FIX-2026-08-20`, que foi consertado em
`app/api/compose/route.ts:687` (passou a comparar com a MESMA função) e
**não foi consertado no espelho de `/api/compose/status`**. Regra da casa
"mexeu num, mexe no outro" — este par ficou de fora.

## 3. PROVA NO BANCO

311 pares nascimento×compose na história · 200 pessoas.

| medida | valor |
|---|---|
| pares com custo divergente | **5** |
| pessoas | **4** |
| desses, filme perdido (URLs de cena existiam e `videos` ficou sem linha) | **5 de 5 = 100%** |
| primeiro caso | **2026-08-21 04:43 UTC** |

Taxa de divergência: 1,6%. Taxa de perda **dado** que divergiu: **100%**.

Os 4 casos (todos com as cenas prontas na fal, nenhum com vídeo entregue):

| pessoa | motor | nascimento | compose | cenas prontas |
|---|---|---|---|---|
| tsatsraljess@gmail.com (2×) | cinematic_h3 | 27cr | 45cr | 7 |
| ebnother.werner@gmail.com | cinematic_kling | 75cr | 50cr | 9 |
| yk5162690@gmail.com | cinematic_ai | 12cr | 20cr | 4 |
| wummm709@gmail.com | cinematic_ai | 19cr | 15cr | 5 |

`12 vs 20` é literalmente o preço de 35s contra o de 60s do `cinematic_ai`.

## 4. O GUARDA NÃO PROTEGE NADA

O risco que essa comparação alega evitar é a cobrança dobrada. Ela já é
impossível por dois outros meios, documentados em
`app/api/compose/status/[renderId]/route.ts:380-384`:

1. `debit_video_credits` é idempotente pela PK `render_id`;
2. o guarda da linha em `videos` barra o segundo débito.

E nos 4 casos o crédito **já havia sido estornado**
(`provider_abandoned_refunded`). O guarda cobrou 100% da entrega por 0% de
risco financeiro.

## 5. DÍVIDA IRMÃ NA MESMA LINHA

O regex de razões aceitas conhece 3 desfechos:

```ts
/^provider_(all_failed|failed|abandoned)_refunded$/
```

Produção emite pelo menos 7: `provider_rejected_refunded`,
`narration_too_short_no_charge_refunded`, `dry_run_no_charge_refunded`,
`explicit_pre_provider_failure_refunded` (+ os 3 conhecidos). Toda razão fora
da lista cai no mesmo 503. Ainda não custou cliente medido, mas está armado.

## 6. AS "34 PESSOAS" SÃO TRÊS PROBLEMAS, NÃO UM

Desde 21/08, **27 pessoas** pagaram um render e não receberam filme; **18 delas
nunca viram um vídeo na vida**. Por causa:

| causa | pessoas | estado |
|---|---|---|
| billing mismatch (este documento) | 4 | causa provada, conserto não escrito |
| `fast` (Kineo 1) com compose feito e sem linha em `videos` | 6 | janela de 20h do cron + Data Cache (#17) |
| estorno `cinematic_abandoned_no_delivery` | 20 | `no_authorized_urls` / Data Cache — diagnosticado no R31 |

**110 renders / 87 pessoas** na história inteira têm compose submetido sem
nenhuma linha em `videos`. **100% deles estão fora da janela de 20h**
(`MAX_AGE_MS`) do `finish-stranded-renders` — o cron não consegue olhar para
nenhum, nunca. Isso é um achado por si: o resgate só existe para as primeiras
20 horas de vida do problema.

## 7. O CONSERTO PROPOSTO (não escrito ainda)

Em `lib/cinematic/claim.ts:440-446`:

1. **Tirar** `birth.claim.creditCost !== cost` da condição de recusa. A
   autoridade do que foi cobrado é o claim de nascimento, não uma reconta.
2. Quando os dois números diferirem, **gravar evento `cinematic_cost_drift`**
   (nascimento, compose, duração dos dois lados) e **entregar o filme**.
   Divergência é sinal de observação, nunca de bloqueio.
3. **Manter duro** o que prova posse: `quality`, prefixo `cinematic-` da
   referência, assinatura do claim de compose, `composeId` derivado do usuário.
4. **Alargar o regex** para `/_refunded$/` com lista explícita das 7 razões
   terminais de produção.

Custo: ~15 linhas em 1 arquivo. Risco financeiro: nenhum (a idempotência do
débito continua sendo a única coisa que impedia cobrança dobrada — e continua).

Recuperar os 4 filmes antigos provavelmente não dá: URLs `v3b.fal.media` e
renders da Creatomate expiram, e os créditos já foram devolvidos. O valor do
conserto é o próximo caso, não estes.
