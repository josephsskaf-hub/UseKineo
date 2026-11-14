// KINEO-RECEITA-FORA-DO-JS-2-1411 [CEO 14/11: "swapNote (notas internas dos testes da troca): tire do que vai ao navegador"] — as notas dos testes pagos de cada molde de TROCA.
// Eram o campo swapNote do catálogo (lib/recreate/formats.ts, que vai no JavaScript do navegador). Só documentação: nenhum código as lê; nenhum módulo
// 'use client' importa este arquivo.
export const RECREATE_NOTAS_DA_TROCA: Readonly<Record<string, string>> = {
  'outfit-morph': '10/11: 0 of 4 paid swaps; provider returned the original',
  'elevador': '10/11: with 2 photos the man swapped 2 of 2 and the woman 0 of 3; founder 10/11 night: one photo, only the man is replaced. Paid test with 1 photo pending',
  'passarela': '10/11 paid tests: 2 of 2 swaps; site test: clip 2bccfb65 delivered (40 credits)',
  'escolha-o-favorito': '10/11 paid tests: 2 of 2 swaps; site test: clip 8e485eef delivered, check swapped 2/2; 8 s = 45 credits (fundador 10/11: "Cobra 45")',
  'duelo-de-danca': '10/11 paid test: 0 of 1 (full body, small face: does not swap)',
  'sueter-aconchegante': '13/11 paid test: 1 of 1 swap (invented face, 6 fps sheet: the photo face in all 48 frames, also looking down); sweater, tree, chair and gestures unchanged; output 768×1024 (3:4) from the 2:3 base',
  'selfie-confete': '13/11 paid test: the man swapped 1 of 1 (invented face, 6 fps sheet: the photo face in all 48 frames, also in profile with the fist up); the woman unchanged in all 48 frames (base × result sheet); output 768×1024 (3:4) from the 2:3 base',
}
