# Frente 1 · menos quedas do filme grátis para a reserva · Div. 2 · 19/11

**Pedido da CEO (19/11):**
- (a) medir sempre a narração antes de decidir;
- (b) quando a fala passa de 15 s, encurtar em vez de trocar de motor;
- (c) uma nova tentativa no Kling 4, em falha do fornecedor ou tempo esgotado, antes de cair para a reserva.

**Branch:** `codex/div2-reserva-gratis-1911`, a partir de 114018ade.
**Guardião:** `scripts/test-reserva-gratis-1911.mjs`, com 16 mutantes.

## As 9 quedas de 12 a 18/11, conferidas no banco
Fontes: `kling4_trial_films` com `engine_used='seedance15_fallback'` e `cinematic_submission_claim.response.kling4_trial`.

| Filme | País | Motivo | O que estava por trás |
|---|---|---|---|
| 8ee1cd8d | US | narração não medida | roteiro não literal, sem `speed:` |
| e9cff0bd | DE | narração não medida | roteiro não literal, sem `speed:` |
| 4ff35049 | CZ | narração não medida | roteiro não literal, sem `speed:` |
| 5bc6d6b9 | BR | fala de 15,588 s | o encurtador desistiu na 2ª rodada (`encurtado_reprovado`) |
| defd272c | US | fala de 17,136 s | o encurtador desistiu na 1ª rodada (`encurtado_reprovado`) |
| 1794140d | DE | falha do fornecedor | o Kling 4 falhou na fal |
| eec8a2d3 | IT | falha do fornecedor | o Kling 4 falhou na fal |
| d43f44b9 | SG | tempo esgotado (8 min) | a reserva saiu sem consultar a fal |
| 5910c0e8 | FR | tempo esgotado (8 min) | a reserva saiu sem consultar a fal |

Para comparar, o Kling 4 grátis leva p50 4,6 min, p90 6,3 min e no máximo 7,8 min. É o tempo do envio até a montagem, em 77 filmes de 14 dias.

## O que foi construído
Três interruptores, todos ligados (`true`); `false` volta ao caminho de antes, byte a byte.

**(a) `K4_MEDIR_SEMPRE_1911`** (em `lib/kling4TrialReserva1911.ts`)
- Problema: com roteiro não literal e sem `speed:`, a montagem reescrevia o texto por um modelo antes da voz (`scaleVoiceoverScript`), então não havia o que medir.
- Agora a rota mede o texto como está, a 1,0. Se o filme for ao Kling 4, o claim assina `speed: 1`. A montagem lê isso como velocidade explícita e fala exatamente o que foi medido, sem reescrever e sem a ressíntese corretiva.
- Fala abaixo de 10 s fica no caminho de antes (a reserva reescreve e preenche os 15 s), com o motivo `narration_short_unscaled_kling4`.
- Se o filme cair para a reserva por qualquer motivo antes do POST, `speed` fica como era.

**(b) `K4_ENCAIXE_INSISTE_1911`** (em `lib/kling4TrialEncaixe.ts`)
- Uma resposta vazia ou reprovada do encurtador agora gasta uma das 3 rodadas, dentro dos 30 s, e o modelo é chamado de novo com o mesmo texto. Antes, desistia na 1ª.
- Quem decide continua sendo a régua (`encaixeServe`, sem mudança) e a voz medida.
- Na desistência, o evento `kling4_encaixe_falhou` passa a dizer qual regra reprovou (`porque`).
- Corrigi também o `palavras_antes` do evento, que contava pela letra "s" (`/s+/`) em vez de por espaço.

**(c) `K4_ESPERA_QUEM_RODA_1911`** (em `lib/kling4TrialAsyncStatus.ts`)
No prazo de 8 min, antes de comprar a reserva, sai uma consulta de status (grátis):

| Status na fal | O que acontece |
|---|---|
| pronto | entrega o Kling 4 |
| falhou | reserva, com o motivo "falha do fornecedor" |
| ainda rodando (IN_PROGRESS) | espera até 4 min a mais |
| na fila, sem resposta ou além de 12 min | reserva por tempo, como antes |

## O que NÃO foi construído e por quê: reenviar o Kling 4 (uma 2ª compra)
Construir isso hoje seria mexer na trava de "um envio só" sem poder provar com filme pago:
1. Hoje "nunca reenviar o Kling" é regra escrita do coordenador (`advanceKling4TrialStatus`). O id original (`original_request_id`) é a chave de 23 pontos do código, em 6 arquivos: o claim assinado, a troca para a reserva, a autorização da URL pronta, o casamento dos ids do navegador e a reserva do cron.
2. O id original também está em 9 migrations, com as RPCs `claim/finish/finalize_kling4_trial_fallback_*`. Trocar o id exige migration, que pede a revisão do outro CEO.
3. Custo: o razão diário (`reserve_kling4_trial`) aceita uma reserva de 2355 milésimos por filme. Um 2º envio é outra compra de US$ 2,355 fora do razão. Se for por tempo, o 1º ainda pode estar rodando e também ser cobrado.
4. Espera: uma 2ª tentativa depois de uma falha soma mais ~5 min (p50 do Kling 4) à espera da pessoa.

O que o (c) já cobre sem gastar: os 2 filmes por tempo esgotado podem ter terminado logo depois dos 8 min. Agora eles são entregues e a reserva não é comprada. Para as 2 falhas do fornecedor, o reenvio é a única saída. O desenho dele está abaixo, para quando o dono quiser.

**Desenho do reenvio (não construído):**
1. Migration nova: `kling4_trial_films.retry_request_id`, mais a RPC `claim_kling4_trial_retry(job, user, original)`, que só aceita uma vez por filme.
2. Marca no claim, pelo mesmo CAS de autoridade: `retry_started`, depois `retry_request_id`, com o original guardado.
3. Os pontos que leem `original_request_id` passam a aceitar o id do reenvio.
4. O reenvio é só na falha do fornecedor, nunca por tempo.
5. Interruptor próprio, desligado. Ligar pede o sim do dono e um filme pago de prova.

## Como provar sem pagar (já rodado)
- `scripts/test-reserva-gratis-1911.mjs` executa as libs reais, com medir, encurtar e poll de mentira, e confere a ligação na rota e na montagem. 16 mutantes mortos.
- `tests/kling4TrialAsync.test.mjs`: o teste 2 foi reancorado. No prazo agora sai 1 consulta (antes, nenhuma). Os testes 10 e 12 a 16 já são vermelhos na origin/main, e esta branch não muda isso.
- `scripts/test-k4-sempre-0511.mjs` (16 ok) e `scripts/test-k4-encaixe-motivo-1111.mjs` (3 ok) seguem verdes. Os mutantes antigos da régua continuam morrendo.

## O que só o filme pago prova
- (a) Que a montagem fala o texto medido a 1,0 sem cortar o fim, num filme grátis de roteiro não literal.
- (c) Que um Kling 4 que passa de 8 min chega pronto e é entregue.

Os dois acontecem sozinhos no próximo filme grátis que cair nesses casos. Nenhum render de teste é necessário, mas a primeira ocorrência merece ser assistida.
