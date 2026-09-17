# KINEO 1 — VÍDEO, NÃO FOTO (17/09/2026, madrugada)

## O que o fundador viu
Dois primeiros filmes de contas novas (life2026dil 02:56Z, bekeecomedytv 02:48Z), nota 100 de
coerência no /admin/coerencia, e os dois **feios: fotos paradas, nenhum clipe de vídeo**.
"São dois clientes a menos que a gente tá perdendo."

## O que aconteceu (medido em `events`, `fast_ai_still` + `fast_scene_plan`)
- Os dois filmes: **7 cenas · 7 stills gerados · 0 clipe de Pixabay** (`sources: ["aiStill"]` em toda cena).
- Motivo registrado: `character_story`, personagem **"Chris"** (bartender — real) e **"Faster"**
  (de "Faster. Wilder. Boundless." — falso).

## As duas causas (as duas nasceram em 16/09)
1. **`KINEO-HISTORIA-COM-PERSONAGENS`** (panda do Johny): com personagem detectado, toda cena vira
   still **e o stock é excluído da cena** (`if (personagem) continue`). Resultado: slideshow.
2. **Detector contando em dobro**: a rota passava `${prompt} ${falas}` ao `characterStoryName`, mas o
   prompt do Kineo 1 **já é o roteiro com as falas**. Toda palavra capitalizada contava 2× e a regra
   "aparece 2×" era verdade para qualquer abertura de frase. Quase todo Kineo 1 desde 16/09 à noite
   virou "história com personagem".

E uma terceira regra da mesma noite, **`KINEO-PRIMEIRO-FILME-COM-STILLS`** (still em toda cena do
primeiro filme), nasceu de uma **leitura errada do pedido**. O fundador em 17/09: "não era imagem que
era para abrir. Era VÍDEO, era o vídeo que era para ser melhor."

## O conserto (este commit)
- `lib/fastAiScene.ts`
  - `characterStoryName`: cada frase conta **uma vez** (dedupe de frases idênticas).
  - `FIRST_FILM_STILLS_ENABLED` nasce **desligado**; só `KINEO_FIRST_FILM_STILLS=on` liga (ensaio).
- `app/api/generate-video-fast/route.ts`
  - Detector lê **só as falas** (`falas || prompt`).
  - História com personagem: o still **abre** a cena e o **vídeo de stock segue** nos cortes seguintes
    (mesmo padrão do híbrido R2 aprovado pelo fundador). O `continue` morreu.
- `scripts/test-historia-com-personagens-2026-09-16.mjs`: 24 verificações, com o texto REAL dos dois
  filmes de hoje (coelho → null mesmo em dobro; Chris → 'Chris'; Johny em dobro → história).
  Falsificado: mutante do `continue` e mutante do interruptor deixam o guardião vermelho.

O que **fica** como estava (aprovado em 16/09, "Vai! Já é uma melhora significativa"): híbrido R1/R2 —
still só onde o stock não cobre (nome próprio/lugar/ano, plano 'ai', relevância < 60), teto 3-4 por filme.

## Trade-off assumido
Na história com personagem, o stock volta ao lado do still → o "panda" pode reaparecer como 2º corte
da cena. Decisão do fundador: **filme de vídeo com um clipe imperfeito > slideshow de fotos**.

## O pedido real ainda está em aberto: "vídeo melhor no primeiro filme, até US$ 0,50"
Peça separada, a desenhar. Candidatos (custo fal por filme de 35 s):
- **Hook de IA já existe** (`aiHook`, Seedance 5 s na cena 1 do primeiro filme gratuito). Conferir se
  está disparando (`[ai-hook]` no log; `clipSources[0]==='aiHook'`).
- 2-3 cenas-chave em Seedance 1.5 5 s (~US$ 0,10-0,15 cada) no lugar do stock mais fraco
  (`relevance < 60`) — cabe em US$ 0,50 e é VÍDEO.
- Pixabay: exigir 1080p+ e ≥ 2 candidatos por cena antes de aceitar; hoje a penalidade de baixa
  resolução é só ranking.

## Medição
```sql
select date_trunc('hour', created_at) h, count(*) filmes,
  count(*) filter (where metadata->>'character' is not null) com_personagem,
  avg((metadata->>'used')::int) stills_medio
from events where name='fast_ai_still' and created_at > '2026-09-17 06:00+00'
group by 1 order by 1;
```
Esperado após o deploy: `com_personagem` cai para a minoria; `stills_medio` volta para ≤ 4; e
`fast_scene_plan.scenes[].sources` volta a ter `pixabay` em toda cena.
