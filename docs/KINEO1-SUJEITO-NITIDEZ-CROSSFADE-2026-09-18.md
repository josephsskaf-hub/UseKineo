# KINEO 1 — SUJEITO, NITIDEZ E CROSSFADE (18/09/2026, 03:31-04:30 BRT)

## O que o fundador viu (dois filmes de clientes, 17/09 20:14Z e 20:18Z)
- **Boeing 737** (salswina, nota 85): "uns vídeos de carro no meio, não mostra só boeings… 85 é uma nota
  muito alta, devia ser no máximo 70… as imagens estão sem fade".
- **Amor** (lee2fin3, nota 93): "algumas imagens estavam borradas… no final um cara lavando a mão… urgente".

## O que o rastro mostrou (`fast_scene_plan`, `fast_compose_recoverable`, `fast_coherence`)
| Queixa | Causa medida |
|---|---|
| Carros num filme de Boeing | 4 cenas com a busca "boeing 737 engine closeup"; o portão de relevância exigia UM token em comum e **"engine"** bastava → trânsito de cidade (cenas 2-3, tags "cars, street, traffic") e uma **moto** (cena 4). |
| Cara lavando a mão | Busca "closeup of intertwined hands" → tags **"washing hands, coronavirus, covid 19"** casando "hands"; e um tabuleiro de xadrez. |
| Borrado | Os dois primeiros stocks eram `_medium` (1280×720, paisagem). Num Short o montador corta uma faixa de 405 px e amplia ~2,7×. O ranking só **penalizava** (−2), não proibia. |
| Nota 85 | O juiz viu as tags "engine" e deu **visual 100**; a regra dele não exigia o mesmo sujeito. |
| Sem fade | Cortes do Kineo 1 colados a seco (0,06 s de sobreposição, transição nenhuma). O fade por clipe tinha sido removido no #202 porque **sem sobreposição** virava mergulho no preto. |
| Mesmo trânsito nas cenas 2 e 3 | O dedupe de ontem, quando TUDO repetia, "ficava com o primeiro" — readmitia o repetido. |

## Os consertos (commit desta branch)
1. **`lib/pixabay.ts` — sujeito obrigatório**: a tag tem de bater com um token **específico** da busca (fora de
   `GENERIC_NOUNS`: engine, hands, interior, city…), direto ou por **família de sinônimo** (`SUBJECT_FAMILIES`:
   boeing → aircraft/airplane/jet/aviation…; couple/love/intertwined; rocket; ship; train; volcano; fauna;
   logística). Busca só de genéricos segue a regra antiga. Higiene/pandemia entrou na lista negra dura.
2. **`lib/pixabay.ts` — nitidez é proibição**: em 9:16, paisagem exige largura ≥ 1920 e retrato altura ≥ 1080
   (em 16:9, o inverso); rendição que borra no corte sai do pool (`reason=low_res`). Pool vazio → a cena vira
   still gerado (híbrido) — foto nítida > vídeo borrado.
3. **`app/api/generate-video-fast/route.ts`**: tudo repetido + cena com visual gerado → nenhum stock.
4. **`lib/fastCoherence.ts` — juiz**: SUBJECT RULE — palavra genérica não é match; carro para avião, covid para
   amantes, xadrez para mãos entrelaçadas = incoerência; 1 cena ≤ 60, 2+ ≤ 40; nomeia a cena.
5. **`lib/compose.ts` — crossfade** de 0,25 s entre os cortes do Kineo 1 com a **mesma receita do caminho
   hollywood** (clipe anterior fica 0,25 s a mais + `enter_transition: fade` no próximo — em produção no
   Kling 3). Interruptor `KINEO_FAST_CROSSFADE=off`.

Guardião: `scripts/test-kineo1-sujeito-nitidez-2026-09-18.mjs` (16) com as **tags reais** dos dois filmes;
falsificado por mutação (regra do sujeito → 3 vermelhos; sobreposição do crossfade → 1 vermelho).

## Validação a olho (o que o fundador confere no próximo Kineo 1)
- Cortes com fade suave, sem mergulho no preto (se aparecer escurecimento entre cortes: `KINEO_FAST_CROSSFADE=off`).
- Filme de avião sem carro/moto; filme de amor sem covid; nenhum clipe visivelmente borrado.
- Se o filme ficar com mais stills que antes, é o piso agindo (pool esvaziou) — é o desenho.

## Medir (48 h)
```sql
-- rejeições por motivo no log não existem em evento; medir pelo resultado:
select count(*) filmes, avg((metadata->>'narration_vs_visuals')::numeric) visual_medio,
  count(*) filter (where (metadata->>'narration_vs_visuals')::numeric <= 60) com_sujeito_errado
from events where name='fast_coherence' and coalesce(metadata->>'engine','fast')='fast' and created_at > '2026-09-18 08:00+00';
```
E `fast_scene_plan.scenes[].sources`: proporção de `aiStill` deve subir um pouco; `fallbackA` não deve subir.
