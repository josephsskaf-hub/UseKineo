# Prova paga C · conserto de cena e filmes com personagem · como rodar · Div. 2 · 20/11

**Sim do dono:** 19/11 23:5x, prova C nesta madrugada, teto de US$ 25 (ele recarrega a fal).
**Só roda com código na main em 'internal' e aprovado pelo revisor.** Item 1: o conserto de cena com as 6 condições (`codex/div2-cena-pub-1911`).
**A conta é a do fundador (isDryRunAccount).** Ela segue o caminho da casa: A1/A2 também nos filmes COM ficha, porque a guarda "só sem ficha" vale só para o cliente. Os 2 filmes SEM ficha mostram o que o cliente vai receber no modo `sem_ficha`. Os COM ficha mostram o caminho da casa com o código da main. A ficha reprovada (d73f38641, 'internal') está sendo publicada pela CEO em 20/11: com ela na main, os COM a exercitam (evento `kling4_ficha_reprovada`). A segunda leitura do leão segue 'off': o leão c92b352b serve de linha de base.

## Os 8 filmes, nesta ordem (para no primeiro PARA)
| # | Filme | Grupo | Por quê | Custo estimado (15 s) |
|---|---|---|---|---|
| 1 | 44d02f20 | SEM ficha | Bermuda 1950, "a plane vanished": as pistas "foggy forest path" e "old newspaper" fazem o filme sem avião (cena fora; com o molde da pista) | ≈ US$ 2,43 |
| 2 | 0a00868b | SEM ficha | Miami 1980 virou "city skyline with bright lights", uma cidade qualquer (cena fora; com o molde; o caso c4cb5ea7 do diagnóstico) | ≈ US$ 2,43 |
| 3 | 1c770cb7 | COM ficha | refazer: Natal 1997, a Emily age sob "Identity: Daniel" | ≈ US$ 3,16 (folha medida US$ 0,726) |
| 4 | 40543daf | COM ficha | refazer: Adão e Eva, o anjo vira a 3ª figura no último plano | ≈ US$ 2,87 (folha medida US$ 0,439) |
| 5 | c92b352b | COM ficha · bicho com cor | o leão Aaron (branco) e o Léon (azul), em francês: o leão vira menino | ≈ US$ 3,05 (folha estimada US$ 0,62, a média) |
| 6 | c06af33d | COM ficha · dois nomes na mesma frase | "Meet Jason and Lucia": dois nomes numa frase; e "Vice City" e "GTA 6" (marca e título de terceiro) testam a checagem de nome (condição 4) | ≈ US$ 3,05 |
| 7 | 150d7c4f | COM ficha · bicho com cor | o T-Rex Rex: a cor "green" está só na ficha, o texto não escreve cor. Nos 77 pedidos, o único bicho COM ficha com a cor escrita no texto é o leão (o gato ruivo 7f92fe17 não tem ficha) | ≈ US$ 3,05 |
| 8 | 193e4465 | COM ficha · pessoa com idade escrita | "Léo, 13 ans, cheveux châtains" (e "Professeur Pen, cheveux blancs", "Aquabulle et Floréa": dois nomes) | ≈ US$ 3,05 |
| | **Os 8** | | | **≈ US$ 23,1** |

O modo ensaio deixa o clipe ir a 20 s quando a voz medida passa de 15,5 s (até US$ 3,14 de clipe em vez de 2,355). Se os 8 fossem a 20 s, o total seria ≈ US$ 29,4 e passaria do teto. **Regra de parada pelo custo:** antes de cada filme, somar o custo real dos já rodados (coluna `clipe_usd` da consulta do passo 5, mais ~US$ 0,07 de texto e imagem, mais a folha nos COM). Se a soma passar de US$ 20, não rodar mais nenhum.

## Passo a passo (Chrome do fundador, logado em usekineo.com)
1. Confirmar que a main tem o conserto de cena (o claim novo traz `plano_da_fala`).
2. Rodar a consulta abaixo (só SELECT) e copiar a linha de cada filme (roteiro, ideia, engine, language):
```sql
select left(cl.session_id, 8) filme, cl.metadata->'response'->>'prompt' roteiro, cl.metadata->>'engine' engine, cl.metadata->'response'->>'language' language,
  (select w.metadata->>'original_idea' from events w where w.name = 'script_written' and w.user_id = cl.user_id and w.created_at <= cl.created_at
     and length(w.metadata->>'script_head') >= 40 and position(w.metadata->>'script_head' in cl.metadata->'response'->>'prompt') = 1 order by w.created_at desc limit 1) ideia
from events cl
where cl.name = 'cinematic_submission_claim' and left(cl.session_id, 8) in ('44d02f20','0a00868b','1c770cb7','40543daf','c92b352b','c06af33d','150d7c4f','193e4465')
order by array_position(array['44d02f20','0a00868b','1c770cb7','40543daf','c92b352b','c06af33d','150d7c4f','193e4465'], left(cl.session_id, 8));
```
3. No console, UM filme por vez, sem `dry_run`. O corpo é o mesmo para os 8: só a linha muda. Anotar o `generationId`:
```js
const l = { /* a linha do filme: roteiro, ideia, engine, language */ }
const generationId = crypto.randomUUID()
const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
  prompt: l.roteiro, original_idea: l.ideia ?? undefined, script_mode: 'verbatim',
  k4_gratis_ensaio: true, k4_roteiro_do_escritor: !!l.ideia,
  engine: l.engine ?? undefined, language: l.language ?? undefined,
  duration: 15, quality: 'cinematic_ai', generationId }) }).then((x) => x.json())
console.log(l.filme, 'generationId =', generationId, r.error ?? '')
```
4. Esperar o filme terminar (Library) antes de seguir.
5. **Conferência obrigatória antes do PRÓXIMO filme** (só SELECT). Troque os `generationId` e marque `tem_ideia` (se a linha do passo 2 tinha ideia) e `sem_ficha` (os 2 primeiros). Só roda o próximo se TODOS os já rodados saírem `PASSA`:
```sql
with prova(gen, tem_ideia, sem_ficha) as (values
  ('<generationId do 44d02f20>', null::boolean, true),
  ('<generationId do 0a00868b>', null::boolean, true),
  ('<generationId do 1c770cb7>', null::boolean, false),
  ('<generationId do 40543daf>', null::boolean, false),
  ('<generationId do c92b352b>', null::boolean, false),
  ('<generationId do c06af33d>', null::boolean, false),
  ('<generationId do 150d7c4f>', null::boolean, false),
  ('<generationId do 193e4465>', null::boolean, false)
), c as (
  select p.*, (select metadata->'response'->'kling4_trial' from events where name = 'cinematic_submission_claim' and session_id = p.gen order by created_at desc limit 1) k,
    (select metadata from events where name = 'kling4_descritor_forte' and session_id = p.gen order by created_at desc limit 1) a2,
    (select metadata from events where name = 'kling4_plano_da_fala_hoje' and session_id = p.gen order by created_at desc limit 1) hoje
  from prova p where p.gen not like '<%'
)
select gen, k->>'engine_used' motor, coalesce((k->>'clip_duration')::numeric, 15) clipe_s,
  coalesce((k->>'clip_cost_usd')::numeric, 2.355) clipe_usd,
  k->'plano_da_fala'->>'caminho' caminho, coalesce(k->'plano_da_fala'->>'motivo', hoje->>'motivo') motivo_do_hoje,
  k->'sujeito_obrigatorio'->>'motivo_do_pedido' sujeito, a2->'reescritas' reescritas, a2->'nomes_depois' nomes_depois,
  case
    when k is null then 'PARA: sem claim do Kling 4 grátis'
    when k->>'engine_used' is distinct from 'kling4' then 'PARA: caiu na reserva (não é Kling 4)'
    when k->>'ensaio_fundador' is distinct from 'true' then 'PARA: sem ensaio_fundador'
    when k->'plano_da_fala' is null then 'PARA: o claim não traz plano_da_fala (a main não tem o conserto de cena)'
    when coalesce((k->>'clip_duration')::numeric, 15) > 20 then 'PARA: clipe acima de 20 s (o modo ensaio vai até 20)'
    when k->'plano_da_fala'->>'caminho' = 'hoje' and coalesce(k->'plano_da_fala'->>'motivo', '') like 'prazo%' then 'PARA: estourou o prazo do A1/A2 (' || (k->'plano_da_fala'->>'motivo') || ')'
    when k->'plano_da_fala'->>'caminho' = 'hoje' then 'PASSA (caiu no caminho de hoje: ' || coalesce(k->'plano_da_fala'->>'motivo', '?') || ')'
    when jsonb_array_length(coalesce(a2->'nomes_depois', '[]'::jsonb)) > 0 then 'PARA: nome próprio persistiu e não voltou ao texto de hoje'
    when tem_ideia and coalesce(k->'sujeito_obrigatorio'->>'motivo_do_pedido', '') not like 'ideia%do_escritor' then 'PARA: o sujeito não recebeu a ideia (ideia_*_do_escritor)'
    else 'PASSA'
  end veredito
from c order by array_position(array(select gen from prova), gen);
```
6. Comparar em quadros com o filme original do mesmo roteiro: a cena do pedido (o avião, Miami), o sujeito no último plano, o desfecho e, nos COM, quem aparece em cada plano (a Emily e o Daniel, as 3 figuras no Éden, o leão, Jason e Lucia, o T-Rex verde, o Léo de 13 anos).
7. Os créditos saem da conta do fundador. A fal cobra pelo clipe e pelas imagens.

## O que cada um prova
- **44d02f20 e 0a00868b:** o caminho novo sem ficha (A2: a descrição da seção no lugar do molde da pista), que é o que o modo `sem_ficha` liga para o cliente.
- **1c770cb7 e 40543daf:** com ficha, com o código da main. Se a ficha reprovada (d73f38641) já estiver na main, a consulta abaixo mostra a ação dela: `select metadata from events where name = 'kling4_ficha_reprovada' and session_id = '<generationId>'` (acao nada | sem_ancoras | sem_ficha, e quantas imagens seguiram com a ficha).
- **c92b352b:** o leão com a segunda leitura 'off' (linha de base). Na versão nova, a pista precisa trazer o nome; as pistas dele não trazem, então nem ela muda este filme.
- **c06af33d:** a checagem de nome. Se ela falhar, o plano volta ao texto de hoje (`nome_sem_checagem`); se o nome persistir, `nome_persistiu`.
- **150d7c4f e 193e4465:** a cor da ficha e a idade escrita (B1(c) e a idade da folha seguem 'off' na main: linha de base).
