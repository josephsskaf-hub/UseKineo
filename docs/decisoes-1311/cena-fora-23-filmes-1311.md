# Div. 2 · CENA_FORA_DO_PEDIDO nos 23 filmes grátis do Kling 4 (14 dias) · 13/11 noite

**Fonte:** o defeito de cada filme vem da linha do revisor no relatório diário (`docs/revisao-videos/2026-11-*.md`, casado pelo render_id). O plano, os prompts que foram à fal e as falas vêm do claim (`cinematic_submission_claim.response`). O modo visual também vem do claim (`response.visual_mode`). Sem fal e sem OpenAI.

**Limite:** as imagens-chave não foram olhadas uma a uma, então (c) e (d) ficam juntas. A exceção é o gato, que a CEO olhou: lá foi a imagem-chave (c).

## Contagem por etapa
| etapa | filmes | quais |
|---|---|---|
| (a) o roteiro fugiu do pedido | 1 | 982a6aeb Milo (o roteiro automático perdeu "laranja" e "chuva"; a ficha nasceu do roteiro) — consertado hoje |
| (b) o plano ou a montagem do prompt pediu outra coisa que a fala/pedido | **10** | ver abaixo |
| (c)/(d) o prompt estava certo e a imagem ou o vídeo fugiu | 5 | d5f666ce Mara (elevador vira moderno) · 03d002f3 urso (homem barbudo não pedido) · 4134e784 ilha (barcos de passeio) · 82a809d0 fitness (peso de ferro no lugar das battle ropes) · 7f92fe17 gato (imagens-chave sem ficha: beco, casaco) |
| (e) pedido sem sujeito concreto, imagem genérica | 1 | 61944992 João 1:1 (metade do filme é pergaminho) |
| (f) outra | 6 | a ficha ignora a descrição do pedido: 1c770cb7 Emily, caed3456 moça do café · a regra "sem texto" apaga a mensagem pedida: c827ec0d (urdu) · a regra "boca fechada" contra a cobra que fala: 40543daf · número exato na tela (relógio 02:46 → 8:45): de85d652 · estilo errado (Minecraft fotorreal): 3eb34f6a |

### (b) por dentro (10)
- **b1 · cena fundida, só metade da fala vira imagem (2):**
  - 804e9f0b Vance: "he left… He launched into space" → só "stepping out of his home".
  - 80d9a38d planetas: paraíso + cidade futurista na mesma cena, e o plano ainda escreve "no futuristic city skyline".
- **b2 · a pista [Pexels] ou o plano literal no lugar do assunto do pedido (4):**
  - 32c93ee3 Gabriel: as metades saem "man walking in street" e "man waking up"; o supermercado nunca aparece.
  - d43f44b9 bunker: oficina, telhado com painel solar e prateleira; nenhum bunker.
  - bf8989ad álcool: a blitz e o mercado negro viram uma troca no deserto, sem bebida.
  - 4eb0c0c9 boneco de palito: o plano pede "comic bubbles" e os balões saem com letra.
- **b3 · modo sem rosto num pedido de pessoa (1):** 98063aa2, anúncio MIARA. "young woman seen in silhouette from behind", e a loira com a caneta nunca aparece.
- **b4 · a montagem do prompt quebra (3), confirmada nos prompts crus:**
  - 76b00b37 dinossauro (ru):
    - "Argentinosaurus" virou ficha de PESSOA ("a person in their thirties with curly black hair");
    - nos planos 2 e 3 a cláusula da ficha come o orçamento e NÃO sobra ação nenhuma.
  - 42bcd59f Pompeia (ru):
    - "Помпеях clearly visible as the subject" (o mesmo defeito do "Пиксар");
    - "Fiery" virou pessoa com ficha;
    - a ação do plano 3 foi cortada em "falling fr".
  - f133c184 Pompeia (en): "Setting: Mount Vesuvius … Never a different or generic place" travado nos 3 planos, e o anfiteatro não desaba.

### Os piores de cada etapa grande
- **(b):**
  - 76b00b37 (nota 7; planos sem ação nenhuma);
  - 42bcd59f (nota 6; nome falso vira pessoa, ação cortada);
  - 98063aa2 (nota 7; anúncio de pessoa vira silhueta).
- **(c)/(d):** d5f666ce (5,5), 03d002f3 (6,5), 7f92fe17 (7).
- **(f):** 1c770cb7 (6, Emily), caed3456 (6,5), de85d652 (6).

## O padrão que corta tudo: o modo visual
| modo (claim) | filmes | nota média | nota ≥ 8 | PERSONAGEM_TROCOU | CENA_FORA |
|---|---|---|---|---|---|
| documentary_faceless | 28 | 6,8 | 1 | **8 de 11** | **13 de 23** |
| character_story | 18 | 6,9 | 3 | 3 | 10 |
| presenter | 1 | 8,0 | 1 | 0 | 0 |

Os 8 PERSONAGEM_TROCOU em faceless NÃO tinham folha de personagem. No modo sem rosto não há ficha nem folha. Entre eles há histórias com protagonista: Daniel (ddd42436), Gabriel (32c93ee3), Luca (de85d652), a moça do anúncio (98063aa2), Harry Potter (1794140d) e o gato (7f92fe17). Os 3 PERSONAGEM_TROCOU com folha (Mara, Adão e Eva, boneco de palito) são outra causa: a folha existe e a imagem-chave ou o vídeo não a segue.
