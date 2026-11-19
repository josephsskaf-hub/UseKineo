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

## 2º ensaio (depois da volta do 1º, 19/11)
O 1º gastou US$ 1,52 em 51 pedidos: ~US$ 0,0175 de base por filme (texto de sempre + voz) e ~US$ 0,0134 do A2 medido por filme com A2.
O que a volta acrescenta por filme com A2 (estimado sobre o replay dos 47):
- seção pedida de novo (nula ou sem espaço): 35 seções em 14 filmes, UMA chamada gpt-4o por filme (~US$ 0,005) ≈ US$ 0,07 no total;
- reescrita da última seção (sujeito do pedido fora do último plano, ou reprovação por sujeito sem plano apontado) + juiz final: ~14 filmes × ~US$ 0,006 ≈ US$ 0,08;
- juiz do plano final com o sujeito injetado, só quando a injeção muda o último plano: ~10 × US$ 0,0012 ≈ US$ 0,01;
- nome próprio conferido de novo depois da reescrita: < US$ 0,0003 por filme que reescreveu por nome.

| Recorte | Filmes | Estimativa |
|---|---|---|
| Os 51 de novo | 51 | ≈ US$ 1,70 (passa uns US$ 0,22 dos US$ 1,48 que sobram dos US$ 3) |
| Os 35 com defeito + os 4 bons que pioraram (47d66e48, 3505835b, b4de7d59, c968edac) | 39 | ≈ US$ 1,35 (cabe) |
| Só os 35 com defeito | 35 | ≈ US$ 1,21 (cabe) |
