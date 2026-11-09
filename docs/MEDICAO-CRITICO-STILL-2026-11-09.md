# Medição do crítico de imagem (still) — 09/11/2026

Item 1 da passagem CEO de 09/11. Nada foi mudado no produto. Material completo em `docs/benchmark/critico-still-0911/`
(cópia do crítico, scripts, casos, respostas, folhas de contato `sheet0/1/_def.png`).

## O que os dados do banco mostram (eventos `cinematic_still_critic`)
- Desde 04/11, **100% das reprovações trazem o problema "estilo"** (04/11: 79 de 79; 07/11: 79 de 79; 09/11: 35 de 35).
  Antes do critério de estilo (KINEO-JUIZ-PERGUNTAS-0311, 03/11), zero.
- Desde 06/11 21:00 UTC: 162 tentativas reprovadas contra 37 aprovadas, todas no Seedance (clássico e personagem).
- Os motivos se contradizem: "não é fotorrealista" em foto realista e "parece foto, não animação" em desenho 3D nítido.

## Teste fora do filme (mesmas imagens, gpt-4o-mini, temperatura 0)
Lote A: 36 imagens reais (12 filmes, cena 1 do caminho clássico, prompt guardado no pedido), com gabarito feito no olho:
5 reprovações merecidas (2 com origem errada, 3 com pessoa numa cena "sem gente") e 26 imagens boas.

| Variante | Reprova imagem boa | Deixa passar defeito | Acerto |
|---|---|---|---|
| Crítico atual (V0) | **22 de 26** | 0 de 5 | 9/31 |
| Atual sem os critérios extras | 30 de 36 reprovadas no total | — | — |
| Atual com imagem em alta resolução | 25 de 36 reprovadas | — | — |
| Atual no gpt-4.1-mini | 13 de 26 | 0 de 5 | 18/31 |
| **V7: o modelo descreve, o código decide** | **0 de 26** | 1 de 5 | **30/31** (igual em 2 rodadas) |

- O modelo **enxerga certo** quando a pergunta é simples ("é desenho 3D" / "é fotografia"). Quem erra é o formato do pedido:
  sistema longo + "ALSO FAIL the image for these checks…" faz o modelo inventar motivo para reprovar e listar "style" em tudo.
- A hipótese da FILA (o crítico lê o estilo do próprio prompt) está **certa na leitura e errada como causa**: o estilo lido
  é o certo (foto em filme fotorreal, desenho no Dino/Léo). O modelo é que responde ao contrário do que vê.

Lote B: 18 imagens antigas reprovadas por texto/anatomia (6 com letreiro embaralhado de verdade, 6 limpas).
| Variante | Reprova imagem boa | Pega letreiro embaralhado |
|---|---|---|
| Crítico atual | 0 de 6 | 3 de 6 |
| V7 | 0 de 6 | 2 de 6 |
| V7 em alta resolução | 0 de 6 | 3 de 5 (1 erro de resposta) |

Letreiro é fraco nos dois: em 512 px o modelo não lê a palavra. Não piora de forma relevante; é outra frente.

## V7 — como funciona
O modelo devolve só observações em JSON: o que a imagem mostra, o meio (`photo` / `3d_animation` / `2d_cartoon_or_anime` /
`painting_or_illustration`), pessoas visíveis, defeito de anatomia, texto embaralhado, artefato, se o TIPO do sujeito
bate (um carro no lugar de uma pessoa, um cão no lugar da galinha — nunca cabelo, roupa, pose ou nome), época e a
aparência da pessoa principal antes de comparar com a origem. **O código** decide a reprovação:
estilo pedido × meio visto, "sem gente" × pessoas visíveis, e os booleanos. Mesmo modelo, mesma imagem `low`,
~150 tokens de saída em vez de ~60 (≈ US$ 0,0001 a mais por foto).

## O que falta antes de ligar
1. **Caminho com folha de personagem (2 imagens, critério "identity")**: não testado. Precisa do mesmo formato
   (`same_character_as_reference` observado) e de um lote com folha.
2. **Trava 8.2**: `lib/cinematic/criticoStill.ts` é rota travada; mudar exige o "vai" nominal do fundador.
3. ~15 guardiões em `scripts/test-*` conferem o texto do pedido byte a byte (lista em `git grep criticoStill scripts`).
4. Achado paralelo: cenas com "No people…" no prompt e uma pessoa pedida na descrição ("A busy professional…") —
   o prompt se contradiz e o crítico reprova com razão. Conserto é no montador do prompt, não no crítico.
5. Item 2 da passagem (imagem reprovada entra no filme) só depois deste ligado.
