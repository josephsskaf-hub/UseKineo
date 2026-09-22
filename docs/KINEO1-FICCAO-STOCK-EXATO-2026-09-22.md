# KINEO 1 — FICÇÃO: O BANCO SÓ ENTRA SE FOR DA CENA (22/09/2026)

Fundador (22/09): "tem esse também que deu 75 pontos" — stefanoszantis06@gmail.com, Kineo 1, 22/09 13:16Z, 62 s, 5 cr,
**75** (texto 90 · visual 60). História de terror: Emily, 3:00 AM, batidas na porta, a mãe morta, "Person detected
inside bedroom". Roteiro colado pela pessoa (script mode "verbatim").

## O que o rastro mostra
- A rota fez o certo no que já sabia: personagem "Emily" → 3 stills (cenas 1-3) + 3 clipes Seedance (1, 2, 6). Só que
  o teto de stills com clipes era 3: **cenas 4-6 ficaram só com banco**.
- E o banco entrou ERRADO onde entrou: `whispering voice` → um **pássaro** (tag "whisper" ⊂ "whispering": a regra de
  substring ≥ 5 do portão aceitou); `bedroom door` → um **homem estressado com contas na cama** (a busca alternativa
  da cena; "bed" nas tags). O juiz apontou exatamente as cenas 1, 2, 3 e 5.
- Medido (7 d, Kineo 1, juiz v5): 34 histórias com personagem, texto 92, **visual 54,7**, 12 abaixo de 70. Sem
  personagem: 44 filmes, visual 53,1. O visual é a dimensão fraca em todo o motor; em ficção o banco é a causa.

## Conserto (branch `codex/historia-sem-stock-errado-0922`)
- `lib/pixabay.ts`: `opts.strictSubject` → modo estrito por chamada. `tagsRelevantToQuery` em modo estrito exige que a
  CABEÇA da busca seja tag exata do clipe (igual ou ±s; sem substring, sem família); busca só de genéricos não traz
  stock. Fora do modo estrito nada muda (filmes de fatos/documentário seguem com a regra de 18-20/09).
- `app/api/generate-video-fast`: `strictSubject: !!personagem` (liga só em história com personagem nomeado); teto de
  stills com clipes = **6** para história (`CHARACTER_STORY_STILLS_WITH_CLIPS_MAX`, +US$ 0,08/filme).
- Guardião `scripts/test-kineo1-ficcao-stock-exato-2026-09-22.mjs`: reproduz o vazamento com as tags REAIS (o pássaro
  passa no modo normal, cai no estrito), hallway/notification seguem aceitos, 2 mutantes.

## O que fica para depois (anotado, não feito)
- **Verbatim que vira paráfrase**: o roteiro de 215 palavras não cabia em 60 s (+27 % > +25 %) e o escalador
  REESCREVEU a narração em 3ª pessoa e inventou "Emily resided in a peaceful suburban neighborhood". Para "Use my
  script as is" o certo é o filme seguir o roteiro (duração pelo texto, como o cinematic faz desde 19/09), não o
  roteiro seguir a duração. É o item A1 do plano de 21/09 e mexe em crédito por duração — decisão do fundador.
- Medir: nota visual das histórias com personagem com corte no deploy (alvo 54,7 → ≥ 65 em 20 filmes).
