# Prova paga do A1 + A2 + portão do sujeito · como rodar · Div. 2 · 19/11

**Precisa do sim do dono antes:** o gasto passa de US$ 5 (4 filmes ≈ US$ 10,85), e o caixa está apertado: todo gasto pede o sim.
**Branch:** a de publicação desta volta (o portão de nome, o sujeito coerente e a opção (a)), já publicada em `'internal'` e revista.

## Por que a opção (a)
- **(a) A conta exata do ensaio declara `k4_roteiro_do_escritor` também no render real, só no modo ensaio (`k4_gratis_ensaio: true`).** O filme sai do MESMO roteiro do cliente. Assim a prova compara o código novo com o filme do defeito, e só o código muda. É mudança de porta: só a conta exata entra e o cliente continua sem o parâmetro. O revisor confere.
- **(b) Refazer pela tela (ideia → nosso escritor → Generate).** Não precisa de código, porque o `script_written` passa a ser do fundador. Mas sai um roteiro NOVO, e a prova passa a medir o escritor junto. Serve de reserva se (a) não passar no revisor.

## Custo por filme (render real, Kling 4 grátis pela conta do fundador)
| Peça | Valor | De onde |
|---|---|---|
| Clipe Kling 4 de 15 s | US$ 2,355 | `KLING4_TRIAL_COST_USD` |
| Clipe de até 20 s (o modo ensaio permite, se a voz medida passar de 15,5 s) | até US$ 3,14 | `KLING4_TRIAL_MAX_SECONDS_ENSAIO` |
| Personagem: folhas, regeração do crítico e âncoras | medido no render original: 273c7774 US$ 0 · 1c770cb7 US$ 0,726 · 40543daf US$ 0,439 · d8bfd93d US$ 0 | `personagem.extra_usd` do claim |
| Imagem-chave (1 por filme) | ~US$ 0,03 | não fica no claim; conferir na fatura da fal |
| Texto OpenAI (base, descritor gpt-4o, juízes, pedidos a mais, reescrita) + voz (tts-1-hd + Whisper) | ≤ US$ 0,045 | o eco dos 2 ensaios |

| Filme | Por quê | Total estimado |
|---|---|---|
| 273c7774 | cena | ≈ US$ 2,43 |
| 1c770cb7 | personagem | ≈ US$ 3,16 |
| 40543daf | final | ≈ US$ 2,87 |
| d8bfd93d | final pela reescrita | ≈ US$ 2,43 |
| **Os 4** | | **≈ US$ 10,9** (até ~US$ 14 se os 4 forem a 20 s) |

c92b352b e b1ffe3ad entram depois desta volta (o portão de nome derrubava os dois por engano).

## Passo a passo (Chrome do fundador, logado em usekineo.com)
1. Ter o sim do dono para o valor da tabela.
2. Rodar `docs/plano-da-fala-1911/ensaio-a2-2-lista.sql` (só SELECT) e copiar as linhas dos 4 filmes (roteiro, ideia, engine, language). Ordem: 273c7774, 1c770cb7, 40543daf, d8bfd93d.
3. No console, UM filme por vez, sem `dry_run`. Anotar o `generationId` que o console imprime:
```js
const l = { /* a linha do filme */ }
const generationId = crypto.randomUUID()
const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
  prompt: l.roteiro, original_idea: l.ideia ?? undefined, script_mode: 'verbatim',
  k4_gratis_ensaio: true, k4_roteiro_do_escritor: !!l.ideia,
  engine: l.engine ?? undefined, language: l.language ?? undefined,
  duration: 15, quality: 'cinematic_ai', generationId }) }).then((x) => x.json())
console.log(l.gen.slice(0, 8), 'generationId =', generationId, r.error ?? '')
```
4. Esperar o filme terminar (Library) antes de seguir.
5. **Conferência obrigatória antes do PRÓXIMO filme** (só SELECT; troque os `generationId` anotados e `tem_ideia` = se a linha do SQL tinha ideia). Só roda o próximo filme se TODOS os já rodados saírem `PASSA`. Saiu `PARA`: não rodar mais nenhum e mandar à Div. 2 o `generationId` e o veredito.
```sql
with prova(gen, tem_ideia) as (values
  ('<generationId do 273c7774>', false),
  ('<generationId do 1c770cb7>', true),
  ('<generationId do 40543daf>', true),
  ('<generationId do d8bfd93d>', true)
), c as (
  select p.gen, p.tem_ideia, (select metadata->'response'->'kling4_trial' from events where name = 'cinematic_submission_claim' and session_id = p.gen order by created_at desc limit 1) k,
    (select metadata from events where name = 'kling4_descritor_forte' and session_id = p.gen order by created_at desc limit 1) a2
  from prova p where p.gen not like '<%'
)
select gen, k->>'engine_used' motor, coalesce((k->>'clip_duration')::numeric, 15) clipe_s, k->'sujeito_obrigatorio'->>'motivo_do_pedido' sujeito,
  a2->'reescritas' reescritas, a2->'nomes_depois' nomes_depois,
  case
    when k is null then 'PARA: sem claim do Kling 4 grátis'
    when k->>'engine_used' is distinct from 'kling4' then 'PARA: caiu na reserva (não é Kling 4)'
    when k->>'ensaio_fundador' is distinct from 'true' then 'PARA: sem ensaio_fundador'
    when a2 is null then 'PARA: o A2 não rodou (caminho de hoje)'
    when jsonb_array_length(coalesce(a2->'nomes_depois', '[]'::jsonb)) > 0 then 'PARA: nome próprio persistiu (caminho de hoje)'
    when coalesce((k->>'clip_duration')::numeric, 15) > 20 then 'PARA: clipe acima de 20 s (o modo ensaio vai até 20)'
    when tem_ideia and coalesce(k->'sujeito_obrigatorio'->>'motivo_do_pedido', '') not like 'ideia%do_escritor' then 'PARA: o sujeito não recebeu a ideia (ideia_*_do_escritor)'
    else 'PASSA'
  end veredito
from c order by gen;
```
O clipe de 16 a 20 s é legítimo: o modo ensaio mede a voz e vai até 20 s, ao custo de até US$ 3,14. O 273c7774 não tem ideia (roteiro colado pelo cliente), então não se exige o motivo `ideia_*_do_escritor` dele.
6. Comparar em quadros com o filme original do mesmo roteiro: a cena do pedido, o sujeito no último plano e o desfecho.
7. Os créditos saem da conta do fundador. A fal cobra pelo clipe e pelas imagens.
