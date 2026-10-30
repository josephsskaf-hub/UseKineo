# Entrega fluxo + vídeos — 30/10/2026 (noite)

Pedido do fundador (30/10, ~19h30 BRT): "Vamos fazer todo sim. A, B, C e D … 1, 2, 3 e 4 … Estão todos autorizados."

## Decisões que valem daqui em diante
- **Refazer grátis o 1º vídeo (D):** 1 vez por conta, só no 1º vídeo pronto, até 72 h depois. Devolve exatamente o que o vídeo
  custou (`videos.credits_used`, teto 40 cr; filme grátis devolve 9 cr). A pessoa marca o defeito (final faltou / não mostrou o
  pedido / personagem mudou / letras estranhas / outro) e volta ao Studio com a ideia preenchida. Trava: tabela
  `public.first_film_redos` (PK = conta). Eventos: `first_film_redo_shown / _granted / _refused`.
- **Plano antes de gastar (C):** filme pedido pelo Studio em modo IA mostra o plano cena a cena, com o final em destaque, antes do
  crédito. Hollywood (Kling 3/H3/Omni/S25) e "usar meu roteiro" seguem direto. Eventos: `film_plan_shown / _confirmed / _edit`.
- **Clipe com história (A/B):** o botão principal vira "Fazer como filme narrado"; o clipe fica como opção pequena. Eventos:
  `clip_long_script_shown / _film_clicked / _clip_anyway`.

## O que entrou
| # | Defeito do revisor | Conserto |
|---|---|---|
| 1 | Narrador lê a instrução ("animais fofinhos em 3D… música infantil") | Pedido de produção (mesmo atrás de "aqui está prontinho pra copiar:") deixa de ser roteiro colado; o escritor inventa a história |
| 2 | Legenda: palavra longa sai da tela; frase partida; "silent" ganhou narração | Fonte encolhe só o bastante (piso 36); chunk não termina em artigo/preposição e a vírgula fecha; "silent video" no Filme ganha atalho para o Clipe |
| 3 | Anúncio sem a marca | Clipe que cita marca/empresa sem foto pede o logo |
| 4 | Escudo do Barcelona / Rakuten / Adidas | Pedido de clube/uniforme ganha "Plain unbranded shirts and kits" (frase positiva) |

## Como medir (só vídeos depois da publicação)
- A/B: `clip_long_script_film_clicked ÷ clip_long_script_shown` e quantos contos ainda viram clipe (`_clip_anyway`).
- C: `film_plan_confirmed ÷ film_plan_shown` (queda forte = o plano está atrapalhando; olhar `_edit`).
- D: `first_film_redo_granted` por dia, defeito mais marcado, e se quem refez baixou/pagou.

## Achado para a próxima leva
Em 7 dias: 63 `generate_failed` para 101 filmes entregues. Boa parte é o próprio site recusando: "roteiro longo demais para 15 s"
(~13), "pediu 40 s mas escolheu 15 s" (~10), "parece plano de câmera" (9) e fila cheia da fal (16). Próximo conserto: em vez de
recusar, oferecer "condensar para 15 s" ou "fazer em 35/60 s" com um clique.
