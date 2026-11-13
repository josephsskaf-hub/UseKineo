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
//   1. ideiaDoRoteiroEscrito (lib/cinematic/ideiaDoEscritor1311, só servidor: usa node:crypto) — o servidor recupera a ideia quando a tela não a mandou: o `script_written` da MESMA pessoa (até 6 h) cujo
//      `script_sha256` é o do roteiro despachado. Par EXATO (a mesma regra da tela, KINEO-K4-SUJEITO-0111), 600 caracteres como a tela.
//      O /api/generate-script passa a gravar o hash; evento antigo sem hash não casa (nada muda).
//   2. ESTILO_CIRILICO_1311 — "пиксар/піксар/дисней/дісней" pedem o look desenhado como "pixar/disney" já pediam (lib/cinematic/sceneStyle).
//   3. marcaDeEstilo — nome de estúdio de estilo (Pixar, Disney, DreamWorks, Ghibli, Пиксар…) nunca é o assunto do plano (filmQuality).
//   4. nomeadoNoPedido (fichaDoPedido) — "a tiny adorable fluffy orange kitten named Milo" vira a ficha do Milo com as palavras do cliente;
//      e uma ficha de "autor" cuja frase NÃO está no pedido (foi escrita pelo nosso roteiro) cede para a do pedido.
// As peças 1 e 4 dependem da conta ('internal' = só a casa); 2 e 3 são regras de língua sem conta: ligam com 'all' e desligam com 'off'.
// Guardião: scripts/test-aparencia-do-pedido-1311.mjs (os dois filmes reais, com os eventos salvos).
export type ModoAparencia1311 = 'off' | 'internal' | 'all'
/** Interruptor. Reverter: 'off' devolve o comportamento de antes para todo mundo. */
export const KINEO_APARENCIA_DO_PEDIDO_1311: ModoAparencia1311 = 'all'
export const APARENCIA_1311_VERSAO = 'aparencia_do_pedido_1311_v1'

export const aparenciaLigada = (modo: ModoAparencia1311, interno: boolean): boolean => modo === 'all' || (modo === 'internal' && interno)
/** As regras de língua (peças 2 e 3) não sabem de conta: valem só com 'all'. */
export const regrasDeLinguaLigadas = (modo: ModoAparencia1311 = KINEO_APARENCIA_DO_PEDIDO_1311): boolean => modo === 'all'

// ── 2. o pedido de desenho escrito em cirílico ──────────────────────────────────────────────────────────────────────────────────────
/** "в стиле пиксар", "стиль Пиксара", "як у Діснея": o mesmo pedido que "Pixar style" (o \b do JS não enxerga cirílico: substring). */
export const ESTILO_CIRILICO_1311 = /(пиксар|піксар|дисне[йяеюї]|дісне[йяю])/iu

// ── 3. estúdio de estilo não é o assunto do plano ───────────────────────────────────────────────────────────────────────────────────
const MARCA_DE_ESTILO_RE = /^(?:pixar|disney|dreamworks|ghibli|illumination|aardman|пиксар\p{L}*|піксар\p{L}*|дисне\p{L}*|дісне\p{L}*)$/iu
/** A palavra é nome de estúdio de estilo ("Pixar", "Пиксар", "Disney")? Nesse caso ela fala do LOOK, nunca de quem aparece. */
export const marcaDeEstilo = (palavra: string): boolean => MARCA_DE_ESTILO_RE.test(String(palavra ?? '').trim())
