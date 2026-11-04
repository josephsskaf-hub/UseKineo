// KINEO-PISTA-NAO-MANDA-0411 — a fala manda, a pista [Pexels: …] só ajuda (motor gerativo).
//
// Caso real: mahrafariha2526, vídeo bcd18c51 (Seedance 1.5, 03/11 23:20 UTC, 1º filme, nota 4,5, não baixou). Roteiro do nosso próprio
// generate-script: "HOOK: [Pexels: foggy forest] A plane vanished—unsolved for 70 years!". Medido no claim e no evento scene_speech_alignment:
//   · a cena 1 nasceu com a pista "foggy forest, old archive flight documents"; o descritor #441 a recebeu em "visual hint:" E o roteiro com as marcas em "Topic:";
//   · o supervisor fala×imagem reprovou ("Does not show a plane") e reescreveu → "A foggy forest with tall trees…". Floresta, nenhum avião em 8 quadros.
// O que está errado é a LEITURA: os escritores tratam a pista como o pedido. Por isso eles recebem a regra e continuam vendo a pista.
//
// NÃO decidir em código se a pista serve. A 1ª versão descartava por palavra em comum e o revisor reprovou com filme real: "Eu sou o Léo!" não tem "leãozinho",
// "aconteceu algo terrível" não tem "brinquedo quebrado", "She sank" não tem "Titanic". A fala vaga, com pronome ou com nome próprio, depende da pista para ter assunto
// visual, e isso só quem lê o sentido sabe. Aqui não há portão nem descarte: a cena, a pista, o tópico e a fala ficam como estão.
// Kineo 1 não usa isto: lá a pista busca no banco de imagens.

/** O mesmo rótulo que lib/scriptParser.ts reconhece. Roteiro sem marca não recebe a regra: os prompts ficam byte a byte. */
export function temMarcaDeBusca(texto: string): boolean {
  return /\[\s*pexels/i.test(String(texto ?? ''))
}

// Cópia LITERAL em lib/cinematic/speechImageAlign.ts (módulo sem imports); o guardião scripts/test-pista-nao-manda-0411.mjs confere que as duas são idênticas.
export const REGRA_DA_PISTA =
  'KINEO-PISTA-NAO-MANDA-0411: a [Pexels: ...] tag or "visual hint" is a stock-footage search term, not the request. It may add to a shot but never replaces the narration. ' +
  'When the line names a concrete subject, the shot shows that subject doing that action, with the term at most as its surroundings ("A plane vanished" + "foggy forest" = the plane disappearing above the forest, never the forest alone). ' +
  'When the line is vague or only a pronoun or a name, the term says what it refers to, so use it ("She sank fast" + "old ship sinking" = the ship; "I am Tod!" + "fox cub waving" = Tod is a fox cub; "Something terrible happened!" + "broken toy" = the broken toy). ' +
  'Leave the term out only where it contradicts the line.'
