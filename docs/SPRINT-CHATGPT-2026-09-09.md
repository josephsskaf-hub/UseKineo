# Sprint ChatGPT → dólar — 09/09/2026 (13:00 → 10/09 03:30 BRT)

Missão: o caminho ChatGPT → cadastro → filme → porta de $1 → pagamento, sem um
degrau quebrado, medido POR PESSOA. Território: `app/api/gpt*`, `lib/gpt*`,
`lib/growth/instructionPasteNotice.ts`, `gpt_handoffs` (leitura), a chegada do
handoff em `studio/` e `generate/`, e a porta de $1 vista por quem vem do ChatGPT.

---

## r1 (13:30–15:00 BRT) — RETRATO POR PESSOA

Base: `origin/main = 606bda28`, worktree `C:/kineo-wt/sprint-chatgpt`.
Corte da Versão B: **08/09 05:00 UTC**. Leitura feita às **16:37 UTC** (13:37 BRT).

### 1. A coorte da Versão B é de 15 pessoas — não das ~98 do briefing

O briefing da sprint fala em "98 cadastros com utm_source=chatgpt desde 02/09".
Verdade, mas esse número é do regime ANTIGO. Sob a Versão B a casa inteira
recebeu **15 cadastros**, dos quais **6 do ChatGPT**.

| Degrau (15 pessoas da Versão B) | Pessoas |
| --- | --- |
| cadastraram | **15** |
| nasceram `card_entry_required`, 0 créditos | **15 de 15 (100%)** |
| viram a faixa da porta (`card_entry_banner_shown`) | 11 |
| despacharam uma geração | 4 |
| **tiveram o filme MONTADO e depois recusado** | **3** |
| viram a porta cheia (`card_entry_door_shown`) | 4 |
| dispensaram a porta | 3 |
| `checkout_started` | 5 |
| **pagaram** | **0** |
| **têm ao menos um filme** | **0 de 15** |

`trial_status` das 15: `card_required` em **todas**. `video_credits`: **0 em
todas**. `has_paid`: **false em todas**. Nenhuma exceção.

Coorte ChatGPT inteira (383 perfis históricos), desde a Versão B: 8 viram a
porta · 5 clicaram · 4 falharam no cobrador · **0 pagaram**.

**A casa está sem um único `payment_success` desde 02/09 20:22 UTC** — 7 dias.
Zero pagamentos na Versão B inteira, de qualquer origem.

### 2. O degrau que mais seca: a casa MONTA o filme e só então recusa

História completa de `sovannara.nay` (ChatGPT, KH, cadastro hoje 13:58:49 UTC),
lida evento a evento. É o padrão, não a exceção:

```
13:58:50  auth_callback_completed   destino /studio/create, com prompt
13:58:51  card_entry_required       grant_credits: 0
13:59:02  activation_autostart_eligible     ← a casa DECIDE que ela pode gerar
13:59:23  activation_autostart_dispatched   ← e dispara sozinha
13:59:36  generation_dispatch_received      engine fast, prompt de 876 chars
14:00:00  fast_compose_recoverable          ← 13 CLIPES prontos, roteiro escrito
14:00:00  free_duration_clamped             35s → 15s
14:00:01  compose_refused  { used: 1, limit: 0 }   ← 402: o limite é ZERO
14:00:03  card_entry_door_shown             a porta de $1 aparece
14:00:06  card_entry_door_dismissed         ela fecha em 3 segundos
14:00:12  chatgpt_quickstart_selected       tenta de novo: roteiro pronto, 976 chars
14:15:36  compose_refused  { limit: 0 }     tentativa 2 — mesma parede
14:30:56  compose_refused  { limit: 0 }     tentativa 3 — mesma parede
```

**O defeito:** na Versão B `FREE_OFFER.limit` é **0**, mas o autostart continua
julgando a pessoa elegível e disparando. O servidor escreve o roteiro, busca 13
clipes no Pixabay e monta o trabalho — **e só depois** consulta a cota, que é
zero por construção. `used: 1, limit: 0`: o "1" é a reserva da própria pessoa.
A primeira tentativa da vida dela já nasce recusada.

Duas consequências, ambas caras:
1. **Custo real jogado fora** (chamada de roteiro + busca de clipes) por pessoa
   que nunca teve permissão de gerar — 3 vezes por pessoa, em média (12 recusas
   para 3 pessoas).
2. **A porta de $1 chega como interrupção, não como oferta.** A pessoa vê a
   barra andar até `clips_ready` e leva uma parede. Das 4 que viram a porta,
   **3 dispensaram** — a de hoje em 3 segundos.

Medição: 3 de 3 pessoas que chegaram a `fast_compose_recoverable` na Versão B
foram recusadas com `limit:0`. 12 recusas, 0 filmes.

### 3. A porta de $1 esteve quebrada até 14:58 UTC de HOJE

Confirmado independentemente desta sprint (rotina PORTA, PEDIDOS 09/09 02:50):
`add_invoice_items` não existe em `Checkout.SessionCreateParams.SubscriptionData`.
Conserto `040af511`, deploy `dpl_CKMQWXnwMcLhVLN4WdhdhVPub4KR`, **READY**.

O que isso significa para toda leitura anterior: **nenhuma medição de copy da
porta antes de 14:58 UTC de 09/09 vale** — os cliques morriam no cobrador.

Prova do tamanho do dano, uma pessoa só — `dinotinyyoutube` (ChatGPT, UA):
entre **08:53 e 09:04 UTC (11 minutos) ela apertou a porta 25 vezes**, em três
campanhas (`card_entry`, `trial_1usd`, `door_v2`). **25 `checkout_failed`.**
Quem insiste 25 vezes queria comprar. Ela não desistiu da oferta; foi expulsa
pelo cobrador.

Depois do conserto houve **1** `checkout_started` sem falha (15:09:04 UTC) — e é
do próprio fundador testando (`e92d81bf`). **Nenhum cliente tocou a porta
consertada ainda.** Não há tráfego na coorte desde 14:31 UTC.

### 4. `gpt_handoffs` está morto desde 07/09 de manhã

A tabela inteira tem **16 linhas**, todas entre **07/09 00:15 e 06:30 UTC**.
Depois disso: zero. Nenhuma tem `user_id` (0 de 16); 2 foram clicadas.

Ou seja: **o degrau "handoff recebido" do funil desta sprint não existe hoje.**
As 6 pessoas do ChatGPT da Versão B chegaram por link `utm_source=chatgpt`, não
por handoff. Quem constrói em cima de `gpt_handoffs` constrói sobre plateia zero
— o remédio da r2 tem de morar no caminho que a gente MEDIU vivo (a chegada em
`/studio/create` com prompt + o quickstart do ChatGPT), não no handoff.

### 5. ⚠ Fora do meu território: o cadastro caiu 3× com a Versão B

Mesma janela de relógio (00:00 → 16:37 UTC) em cada dia, para não comparar dia
cheio com dia parcial:

| dia | cadastros até 16:37 UTC | do ChatGPT |
| --- | --- | --- |
| 03/09 | 26 | 3 |
| 04/09 | 28 | 15 |
| 05/09 | 18 | 11 |
| 06/09 | 22 | 14 |
| 07/09 | 22 | 12 |
| **08/09** (Versão B às 05:00) | **8** | 4 |
| **09/09** | **7** | 3 |

Queda de ~22/dia para 7-8/dia, sustentada por dois dias. Isso é maior que
qualquer degrau interno: a Versão B pode estar convertendo melhor por pessoa e
ainda assim entregar menos dinheiro, porque entram 3× menos pessoas. **Não é
meu caminho** (`/signup`, `/ph` são da sprint irmã) — vai como PEDIDO.

### 6. Baseline da suíte (worktree limpa em 606bda28)

**111 vermelhos de 471** arquivos `scripts/test-*.mjs`. Lista em
`.scratchpad/baseline-r1.txt` da sessão. Qualquer entrega desta sprint compara
contra 111 e não pode acrescentar nenhum.

Três vermelhos ficam DENTRO do meu território e são candidatos de conserto:

| guardião | verificação vermelha |
| --- | --- |
| `test-gpt-handoff.mjs` | (B5) grava `sha256(salt\|ip)`, **nunca IP cru** |
| `test-gpt-handoff.mjs` | (C2) etiqueta de robô (sem UA = robô) |
| `test-chatgpt-paste-page.mjs` | (E7) nenhum crédito/preço digitado na página |

O (E7) importa agora: preço cravado na página de colar do ChatGPT vira mentira
com os planos V7 ($14/$29/$59). O (B5) é privacidade — IP cru no banco.

### O que fica para a r2

Consertar o degrau do item 2 — a casa não pode montar um filme para recusá-lo
em seguida. Duas metades, nesta ordem:
1. **Não gastar trabalho que a cota proíbe:** a decisão de cota tem de vir ANTES
   do despacho, não depois de `clips_ready`.
2. **A porta tem de nascer da coisa que a pessoa acabou de pedir**, com o tema
   dela em cima — não como interrupção genérica de um trabalho perdido.

E medir o (E7): preço cravado na página do ChatGPT.

**Números desta rotação:** 15 pessoas · 0 filmes · 0 pagamentos · 12 recusas com
`limit:0` para 3 pessoas · 25 falhas de checkout numa pessoa só · baseline 111.
