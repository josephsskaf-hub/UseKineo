# Ensaio de texto do A2 · como rodar · Div. 2 · 19/11

**Autorização:** dono, 19/11, até US$ 3, só texto (registrado no quadro pela CEO).
**Branch:** `codex/div2-a1a2-pub-1911`. Ela contém o A1, o A2 e o eco do ensaio no `dry_run`.

## Antes de rodar
1. Publicar A1 + A2 com `KLING4_PLANO_DA_FALA_1911 = 'internal'` e `KLING4_DESCRITOR_FORTE_1911 = 'internal'`, depois do revisor. No `'internal'` só entram os 3 e-mails exatos do ensaio (`isDryRunAccount`, 2ª volta do revisor em 19/11: a régua larga `isInternalEmail` abria para e-mail parecido). Cliente fica fora, provado pelos testes F1 a F5 do guardião.
2. Rodar `docs/plano-da-fala-1911/ensaio-a2-lista.sql` (só SELECT). Ele devolve 51 filmes na ordem do ensaio:
   - 38 com defeito: 3 sem o molde, 12 com o molde, 23 sem planos registrados (anteriores a 12/11);
   - 13 bons (nota 8 ou mais).

   Cada linha traz o roteiro exato, a ideia do cliente (achada em 46 de 51) e os planos enviados naquele dia.

## O disparo (um por vez, na conta do fundador, no Chrome dele em usekineo.com)
```js
// cole as linhas do SQL em `linhas` (array de {gen, grupo, molde, roteiro, engine, language, ideia}); roda em sequência e para no teto
// BASE_POR_FILME = texto de sempre do dry_run + voz medida; SEM_USAGE_POR_FILME = o que a API não devolve (nome próprio ×2 e sujeito do eco ×até 4, gpt-4o-mini)
// TETO_POR_FILME = pior caso inteiro de um filme (revisor 19/11: ~US$ 0,036 com a checagem de nome): só começa um filme se ele cabe inteiro no teto
const linhas = [/* … */], TETO = 3, BASE_POR_FILME = 0.0145, SEM_USAGE_POR_FILME = 0.003, TETO_POR_FILME = 0.036
window.__a2 = []
for (const l of linhas) {
  const gasto = window.__a2.reduce((n, r) => n + (r.a2?.custo?.total_usd ?? 0) + BASE_POR_FILME + SEM_USAGE_POR_FILME, 0)
  if (gasto + TETO_POR_FILME > TETO) { console.log('teto: parei antes de', l.gen, 'gasto ~US$', gasto.toFixed(4)); break }
  const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    prompt: l.roteiro, original_idea: l.ideia ?? undefined, script_mode: 'verbatim', dry_run: true, k4_gratis_ensaio: true,
    engine: l.engine ?? undefined, language: l.language ?? undefined, // o motor e a língua do pedido daquele dia (roteiro em português medido na língua certa)
    duration: 15, quality: 'cinematic_ai', generationId: crypto.randomUUID() }) }).then((x) => x.json()).catch((e) => ({ erro: String(e) }))
  window.__a2.push({ gen: l.gen, grupo: l.grupo, molde: l.molde, a2: r.a2_ensaio ?? null, erro: r.erro ?? r.error ?? null })
  console.log(l.gen.slice(0, 8), l.grupo, l.molde, r.a2_ensaio?.custo?.total_usd, r.a2_ensaio?.reescritas)
}
copy(JSON.stringify(window.__a2)) // vai para a área de transferência; gravar em docs/plano-da-fala-1911/ENSAIO-A2.json
```
- `k4_gratis_ensaio: true` coloca o pedido da conta da casa no caminho do Kling 4 grátis (`isDryRunAccount`).
- `dry_run: true` devolve antes de qualquer imagem, reserva ou POST à fal, e libera o crédito (`dry_run_no_charge`).

## O que cada resposta traz (`a2_ensaio`)
- Os dois lados (hoje e novo) saem do MESMO `kling4PorSecao` do envio, com o injetor do sujeito do submit e o `buildKling4TrialInput` com o timing (2ª volta do revisor, 19/11). Ficam de fora só as imagens-chave (o `dry_run` não gera stills) e o encaixe da fala; `montagem` diz isso na resposta.
- `hoje.planos`: o montador de sempre, sem descrição por seção, com o molde onde ele roda hoje.
- `novo.planos`: o A2 (descrição por seção do gpt-4o, feita a partir do pedido e da fala).
- `final.planos`: depois da reescrita.
- O juiz de cada um: `hoje.juiz`, `novo.juiz` e `final.juiz`, com `d_sujeito_aparece`, falhas e `cenas_reescreveria`.
- `nomes_proprios` e `reescritas`: os planos e as seções apontados.
- `descricoes`.
- `ms`: espera do descritor, cada chamada do descritor, juiz, nome próprio, reescrita e juiz final.
- `custo`: tokens e US$ do descritor (pelo usage), US$ dos juízes e o total medido.

## Custo, com preço conferido em 19/11 na página do fornecedor
Fonte: developers.openai.com/api/docs/pricing, tabela Standard.

| Item | Preço |
|---|---|
| gpt-4o | US$ 2,50 de entrada e US$ 10,00 de saída por 1M tokens |
| gpt-4o-mini | US$ 0,15 e US$ 0,60 por 1M tokens |
| tts-1-hd | US$ 30,00 por 1M caracteres |
| Whisper | US$ 0,006 por minuto |

Custo por dry_run:

| Parte | Por filme | Como foi medido |
|---|---|---|
| Descritor por seção (gpt-4o) | US$ 0,0070 | pedido real medido: ~2.160 tokens de entrada, ~160 de saída |
| Reescrita (gpt-4o, só as seções apontadas) | ~US$ 0,004 quando há | proporcional às seções |
| Juiz × 2 ou 3 (hoje, novo e final) | US$ 0,0012 cada | média de 176 vereditos reais |
| Nome próprio (gpt-4o-mini, no novo e no final) | < US$ 0,0006 | estimado (a pergunta não devolve usage) |
| Sujeito do eco (gpt-4o-mini, uma leitura por montagem: hoje, novo e cada reescrita) | < US$ 0,0012 | estimado (sem usage devolvido) |
| Texto de sempre do dry_run (elenco, descritor de cenas, alinhamento, sujeito, juiz da ficha; tudo gpt-4o-mini) | ~US$ 0,004 | estimado: só o juiz grava US$ |
| Voz medida pelo `k4_gratis_ensaio` (tts-1-hd ~300 caracteres + 15 s de Whisper) | ≤ US$ 0,0105 | zero quando a voz já está no cache |
| **Teto por filme (pior caso do revisor, com a checagem de nome)** | **≤ US$ 0,036** | **51 filmes ≤ US$ 1,84** |

## Latência (estimada sobre números medidos)
- Hoje a rota leva p50 40,6 s, p90 98 s e no máximo 148 s até o envio, em 77 filmes do Kling 4 grátis. O teto é `maxDuration = 300`.
- O A2 soma o juiz (p50 6,1 s, p90 10,8 s, com teto de 12 s na espera e no fetch), a reescrita (~4 s, quando há) e, só no ensaio, o juiz final.
- A chamada por seção corre em paralelo com a das cenas.

## A conta que a CEO pediu
| Pergunta | Campo usado |
|---|---|
| Em quantos dos 38 o sujeito aparece no texto novo | `final.juiz.d_sujeito_aparece = 'sim'` sem `c_criatura`, contra `hoje.juiz` |
| Em quantos o juiz reprovou e a reescrita consertou | `novo.juiz.reprovado` e `final.juiz` aprovado |
| Em quantos dos 13 bons o novo ficou pior | `hoje.juiz` aprovado e `final.juiz` reprovado |

## 2º ensaio (depois da volta do 1º e da 4ª passada do revisor, 19/11)
**Autorização:** dono, 19/11, teto próprio de **US$ 1,50** (o 1º gastou US$ 1,52 dos US$ 3).
**Branch:** a de publicação desta volta. Ela leva o B1(a) com `PORTAO_DO_SUJEITO_1911 = 'internal'`: sem ele, o roteiro literal (`script_mode: 'verbatim'`) não tem pedido para o leitor do sujeito, e nem o sujeito obrigatório no último plano nem a reescrita por sujeito disparam.
**Lista:** `docs/plano-da-fala-1911/ensaio-a2-2-lista.sql` (só SELECT, 41 linhas na ordem): os 35 com defeito que tiveram `a2_ensaio` e os 4 bons que pioraram (47d66e48, 3505835b, b4de7d59, c968edac) = 39; no fim, se sobrar teto, os 2 de descrição nula (42bcd59f, caed3456).

Prova offline (código desta branch, ideias reais do `script_written`): dos 42 pedidos da lista atual, nenhum chegava ao leitor do sujeito; com o B1(a), **38 chegam**. Os 4 que não chegam: 3 roteiros colados pelo cliente, sem `script_written` (273c7774, 3eb34f6a, 4134e784), e 1 ideia que discorda da fala (44d02f20). O sujeito em si sai da leitura semântica, que é gpt-4o-mini, e só o ensaio mede: abstrato ("mystery") = sem sujeito obrigatório.

```js
// cole as linhas do SQL em `linhas` (array de {gen, grupo, molde, roteiro, engine, language, ideia}); em sequência; para antes de passar do teto
// k4_roteiro_do_escritor: a ideia veio do script_written casado = roteiro do nosso escritor (só o dry_run da conta do ensaio pode declarar isso)
// POR_FILME_MAX = pior caso de um filme: base 0,0175 (texto de sempre + voz) + descritor A2 0,0071 + 2 pedidos a mais 0,010 + 1 reescrita 0,005
//   + 4 juízes 0,0048 + nome próprio ×2 e sujeito 0,0009 ≈ US$ 0,045; só começa o filme que cabe inteiro no teto
const linhas = [/* … */], TETO = 1.5, BASE_POR_FILME = 0.0175, SEM_USAGE_POR_FILME = 0.0012, POR_FILME_MAX = 0.045
window.__a2b = []
for (const l of linhas) {
  const gasto = window.__a2b.reduce((n, r) => n + (r.a2?.custo?.total_usd ?? 0) + BASE_POR_FILME + SEM_USAGE_POR_FILME, 0)
  if (gasto + POR_FILME_MAX > TETO) { console.log('teto: parei antes de', l.gen, 'gasto ~US$', gasto.toFixed(4)); break }
  const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    prompt: l.roteiro, original_idea: l.ideia ?? undefined, script_mode: 'verbatim', dry_run: true, k4_gratis_ensaio: true, k4_roteiro_do_escritor: !!l.ideia,
    engine: l.engine ?? undefined, language: l.language ?? undefined,
    duration: 15, quality: 'cinematic_ai', generationId: crypto.randomUUID() }) }).then((x) => x.json()).catch((e) => ({ erro: String(e) }))
  window.__a2b.push({ gen: l.gen, grupo: l.grupo, molde: l.molde, a2: r.a2_ensaio ?? null, erro: r.erro ?? r.error ?? null })
  console.log(l.gen.slice(0, 8), l.grupo, r.a2_ensaio?.caminho, r.a2_ensaio?.custo?.total_usd, r.a2_ensaio?.reescritas, r.a2_ensaio?.ultimo_sem_sujeito, r.a2_ensaio?.sujeito_injetado_no_ultimo)
}
copy(JSON.stringify(window.__a2b)) // gravar em docs/decisoes-1911/tres-defeitos/ENSAIO-A2-2.json
```

O que muda na resposta (`a2_ensaio`, versão `a2_ensaio_1911_v2`):
- `caminho`: `a2`, ou `hoje` com `motivo`. O motivo é um destes: descrição nula ou sem espaço depois de pedir de novo, prazo dos pedidos a mais, nome próprio que persistiu, ou filme que o A2 não cobre (`sem_secoes`, `secoes_menos_que_cenas`).
- `pedidas_de_novo`: as seções pedidas de novo (no máximo 1 vez cada e 2 pedidos por filme, 60 s somados).
- `ultimo_sem_sujeito` e `sujeito_injetado_no_ultimo`: o sujeito obrigatório no último plano. `final.planos` é o que iria à fal, já com a injeção; `depois_da_reescrita.planos` é o que a revisão viu.
- `nomes_depois`: o nome próprio que persistiu depois da reescrita.

Custo estimado sobre o replay dos 47 (o corte da cláusula de estilo repetida faz caber 171 de 177 seções; só 6 seções, em 3 filmes, são pedidas de novo):
| Recorte | Filmes | Estimativa |
|---|---|---|
| A lista (39) | 39 | ≈ US$ 1,37 |
| + os 2 de descrição nula | 41 | ≈ US$ 1,44 (o laço para antes de US$ 1,50) |
