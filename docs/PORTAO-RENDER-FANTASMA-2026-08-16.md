# O PORTÃO DO RENDER FANTASMA — 16/08/2026 (sprint 16h)

> **O dia em que o TAAFT finalmente entregou tráfego de graça (42 cadastros,
> recorde, 4× a média) e o produto trancou a porta na cara do cliente de maior
> intenção do dia — no meio do checkout.**

Medido em produção (`cqqukkvjjrguayiyjvhh`), contas internas de
`lib/internalAccounts.ts` excluídas.

---

## 1. O caso, minuto a minuto

Usuário `6819371a`, `utm_source=taaft`, tudo em 16/08:

| hora (UTC) | o que aconteceu |
|---|---|
| 16:30:04 | `email_signup_completed` + `trial_credits_granted` — chegou pelo TAAFT |
| 16:30:14 | clicou no onboarding viral, primeiro vídeo |
| 16:30:32 | `video_generation_started` → estágio `generating`, compose despachado |
| 16:31:10 | `generation_checkpoint_saved` (`fast_response`) — **grava snapshot `stage:'submitting'` SEM renderId** |
| — | **o compose nunca fechou.** Nenhum `video_generation_completed` |
| 16:33:18 | voltou, analisou de novo, chegou ao estágio `options` |
| 16:36:23 → 16:38:53 | **19× `analyze_blocked_active_render_gate`** em 2 min 30 |
| **16:36:48** | **`checkout_started` — abriu a sessão da Stripe NO MEIO da sequência de bloqueios** |
| 16:37:47 | dispensou o banner de retomada do checkout |
| 16:39–16:42 | circulou `viral_now` ↔ `generate` 3×, `activation_generate_firstrun` de novo |
| — | **não pagou, não gerou nada. Zero vídeos na conta.** |

### A prova de que não havia nada a proteger

Três tabelas, a conta inteira, não só o dia:

```sql
select … from render_jobs   where user_id='6819371a-…'  -- 0 linhas
select … from credit_debits where user_id='6819371a-…'  -- 0 linhas
select … from videos        where user_id='6819371a-…'  -- 0 linhas
```

**Nenhum render. Nenhum crédito debitado. Nenhum vídeo.** O portão existe para
não atropelar um render pago em voo. Não havia render, não havia pagamento, não
havia voo.

---

## 2. A causa: o snapshot que salva é o mesmo que tranca

`generation_checkpoint_saved` (L~5990) grava, **antes** do compose fechar:

```ts
const checkpoint: ActiveRenderSnapshot = {
  stage: 'submitting',   // ← sem renderId, por construção
  startedAt: Date.now(),
  composePayload: …,
}
```

Esse objeto é um **ponteiro de recuperação**: existe para que, se a aba morrer, a
pessoa reencontre o trabalho. Ele **não é prova de render vivo** — prova apenas
que um compose foi *tentado*, e o crédito só é debitado no servidor, depois.

Mas `classifyStoredActiveRender()` só olha o **relógio**:

```ts
if (age > ACTIVE_RENDER_TTL_MS)          return 'stale'
if (age > ACTIVE_RENDER_GATE_MAX_AGE_MS) return 'expired'
return 'live'                            // ← 5 minutos de idade cai aqui
```

Cinco minutos de idade ⇒ `'live'` ⇒ portão fechado. **O checkpoint escrito para
recuperar a pessoa foi exatamente o que trancou o produto na cara dela.**

### Por que os dois fail-opens anteriores não pegaram este caso

Os dois consertos anteriores abrem o portão em `absent` / `stale` / `expired`:

- **31/07** (`KINEO-GATE-FAILOPEN`) — abre quando **não há** snapshot.
- **07/08** (`KINEO-GATE-STALE-SNAPSHOT`) — abre quando o snapshot é **velho**.

Ambos interrogam **a mesma testemunha: o `localStorage`**. E os dois só sabem
responder *"faz quanto tempo?"*. Nenhum sabe responder **"e do outro lado,
existe alguma coisa?"** — que é a única pergunta que resolvia este caso, porque
aqui o snapshot era **recente e legítimo**, e mesmo assim não apontava para nada.

**A regra que isto deixa: um portão que protege um recurso do SERVIDOR não pode
decidir só com evidência do CLIENTE.** O relógio local mede idade, nunca
existência.

---

## 3. A correção (commit desta sprint)

Antes de declarar bloqueio, **perguntar ao servidor**.

`/api/compose/active` é a **mesma fonte que o lock do compose usa** — portanto
este portão nunca fica mais frouxo que a guarda do dinheiro: se a sonda diz que
nada está renderizando, o próprio `handleGenerate` já deixaria passar.

Cobre **todos** os caminhos em que o efeito de restore pendura (`!user`, efeito
cancelado, chave de storage divergente), porque não depende de descobrir *qual*
deles pendurou.

### Duas armadilhas mortas na revisão adversarial

**1/2 — `refreshServerActiveRender()` devolve `null` para duas coisas opostas.**
"O servidor respondeu e não há render" e "não consegui perguntar" (401, 500,
rede caída, JSON podre) saem os dois como `null`. Usar o retorno como prova
repetiria o erro do `looksOpenAiQuotaDead` registrado no PROMPT-DIARIO — **um
predicado servindo duas audiências**. Pior: a hipótese mais provável para o
efeito pendurar é justamente a **sessão do cliente quebrada**, que devolve
**401** aqui. Tratar 401 como ociosidade abriria o portão pelo motivo errado.
Por isso o `serverProbeProvesIdleRef` só vira `true` com **200 lido até o fim**;
qualquer falha o zera. **Silêncio nunca vira prova.**

**2/2 — a janela de corrida do compose aceito-mas-ainda-sem-linha.** Só abrimos
quando o snapshot **não tem renderId** (nada foi confirmado) **e**
`generationInFlightRef` é falso (esta aba não tem despacho no ar). Snapshot
`rendering` **com** renderId aponta para algo que existiu: ali a sonda pode estar
atrás do banco e o portão continua fechado, como hoje.

### A copy que competia com o botão de escape — e ganhava

O escape manual do 07/08 **estava na tela** (botão vermelho *"Nothing is
rendering — let me start a new video"*). O cliente **nunca clicou**. Não é falta
de botão: logo acima dele, a frase dizia

> *"Still checking for an in-progress render. **Please try again in a moment.**"*

Uma frase que, depois de o portão já ter se declarado bloqueado, **é falsa** —
esperar não resolve, só o botão resolve. Ela manda esperar; o botão manda agir.
**A copy ganhou 19 vezes.** É a regra 3 do PROMPT-DIARIO (*copy que manda
repetir multiplica a carga*) aplicada a um botão em vez de a um fornecedor.

No estado bloqueado a frase passa a apontar para o botão. O texto transitório
continua igual no caso transitório — que é de verdade transitório.

> Detalhe de implementação: `setError` roda no mesmo tick em que o portão decide,
> e o `activeRenderGateBlocked` de estado ainda vale o do render anterior nesse
> instante — a copy sairia errada em 100% das vezes. Daí o espelho em `ref`.

---

## 4. Tamanho do balde (denominador junto, regra 3)

`analyze_blocked_active_render_gate`, vida inteira, contas externas:

| medida | valor |
|---|---|
| pessoas bloqueadas | **20** |
| bloqueios totais | **193** |
| média por pessoa | **9,7** |
| pior caso | **60 cliques** |
| **nunca completaram vídeo depois do 1º bloqueio** | **8 de 20 (40%)** |
| pagaram | 1 |

Não é um balde grande em pessoas — é um balde **caro**: cada pessoa apanha ~10
vezes, e **4 em cada 10 nunca mais entregam um vídeo**. E hoje ele pegou um
visitante do TAAFT com a Stripe aberta.

---

## 5. Ponto não óbvio para o fundador

O 07/08 já tinha registrado que a **única conta paga ativa** (`valos87196`)
queimou 31 cliques bloqueados em 3h23. Hoje o mesmo portão pegou o cliente de
maior intenção do dia do TAAFT.

**Duas vezes seguidas, este portão escolheu exatamente a pessoa mais valiosa da
janela.** Não é coincidência: o portão só dispara em quem **já tentou gerar
antes** — ou seja, ele filtra, por construção, a favor de quem está mais
engajado. **Todo defeito que só atinge quem já usou o produto atinge, por
definição, a sua melhor coorte.**
