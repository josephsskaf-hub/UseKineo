// ═══ KINEO-APARENCIA-DO-PEDIDO-1311 [CEO 13/11, "a aparência do sujeito não se mantém" no Kling 4 grátis] ═══════════════════════════════
//
// OS DOIS FILMES (13/11, Kling 4 grátis, 15 s, nota 7 nos dois):
//   (a) zacharysefiane927, 04:54 BRT, generation 982a6aeb: a ideia dizia "A tiny adorable fluffy orange kitten named Milo … during heavy
//       rain"; o filme saiu com um gatinho CINZA e quase sem chuva. Lido nos eventos: o roteiro despachado era EXATAMENTE o que o nosso
//       escritor (/api/generate-script) escreveu da ideia, mas a tela não mandou `original_idea` (o par exato do cliente falhou). Então a
//       ficha do Milo nasceu do NOSSO roteiro — `Milo, exactly as the author wrote: "duckling hugs Milo"` (origem 'autor', lixo) — e a
//       leitura do pedido (fichaDoPedido) nem rodou: ficha de "autor" fica, e "kitten named Milo" não é aposto. O still sorteou cinza e o
//       alinhamento cena-fala gravou "kitten: gray" nas 3 cenas.
//   (b) leonardodevenshi59, 15:51 BRT, generation 7f92fe17: "рыжий кот ниндзя … стиль пиксар". O look do filme só conhece "pixar" em
//       letras latinas: saiu FOTORREAL; "В стиле Пиксар" na última fala virou "Пиксар clearly visible as the subject of this shot" no plano
//       4 (o juiz do plano descartou a frase como "nome fora do texto"), e o "vibrant, animated style" do plano 4 fez o gato virar desenho
//       só nos últimos 6 s.
// O ALCANCE (7 dias até 13/11 19h UTC, filmes grátis do Kling 4): 37 filmes; 27 sem `original_idea`, e em 22 deles o roteiro despachado
// começa igual ao `script_written` do nosso escritor minutos antes. Coerência média 76,6 sem a ideia × 85,4 com a ideia (10 filmes).
//
// O CONSERTO, quatro peças, todas atrás de KINEO_APARENCIA_DO_PEDIDO_1311 ('off' = byte a byte o de antes):
//   1. ideiaDoRoteiroEscrito (lib/cinematic/ideiaDoEscritor1311, só servidor) — o servidor recupera a ideia quando a tela não a mandou: o
//      `script_written` da MESMA pessoa (até 6 h) cujo começo gravado (`script_head`, os 200 primeiros caracteres do roteiro do escritor)
//      é o começo do roteiro despachado, inteiro. Roteiro curto (≤ 200) = par exato; longo = os 200 primeiros iguais. 600 caracteres, como a
//      tela. Vale também para os roteiros já escritos (o evento existe desde 19/10); o /api/generate-script não muda.
//   2. ESTILO_CIRILICO_1311 — "пиксар/піксар/дисней/дісней" pedem o look desenhado como "pixar/disney" já pediam (lib/cinematic/sceneStyle).
//   3. marcaDeEstilo (sceneStyle) — nome de estúdio de estilo (Pixar, Disney, DreamWorks, Ghibli, Пиксар…) nunca é o assunto do plano (filmQuality).
//   4. nomeadoNoPedido (fichaDoPedido) — "a tiny adorable fluffy orange kitten named Milo" vira a ficha do Milo com as palavras do cliente;
//      e uma ficha de "autor" cuja frase NÃO está no pedido (foi escrita pelo nosso roteiro) cede para a do pedido.
// As peças 1 e 4 dependem da conta ('internal' = só a casa); 2 e 3 são regras de língua sem conta: ligam com 'all' e desligam com 'off'.
// O interruptor mora em lib/cinematic/sceneStyle.ts (arquivo sem import, de propósito) e é re-exportado aqui.
// Guardião: scripts/test-aparencia-do-pedido-1311.mjs (os dois filmes reais, com os eventos salvos).
import { KINEO_APARENCIA_DO_PEDIDO_1311, regrasDeLinguaLigadas, ESTILO_CIRILICO_1311, marcaDeEstilo, type ModoAparencia1311 } from '@/lib/cinematic/sceneStyle'
export { KINEO_APARENCIA_DO_PEDIDO_1311, regrasDeLinguaLigadas, ESTILO_CIRILICO_1311, marcaDeEstilo, type ModoAparencia1311 }
export const APARENCIA_1311_VERSAO = 'aparencia_do_pedido_1311_v1'

export const aparenciaLigada = (modo: ModoAparencia1311, interno: boolean): boolean => modo === 'all' || (modo === 'internal' && interno)
