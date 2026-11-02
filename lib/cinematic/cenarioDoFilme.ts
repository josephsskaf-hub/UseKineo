// KINEO-CASA-FICHA-SEM-LETRAS-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — revisão dos 20 vídeos do dia
// da casa (Seedance 1.5, 60 s, "Use my script as is", nota média 5,4): (1) a palavra solta virava a imagem ("3D models" → trem de
// brinquedo, "winged shoe" → salto alto dourado, "Earhart" → homem); (2) época e lugar errados (Basílica de São Pedro em 392,
// Capitólio dos EUA na posse do JK, poste elétrico em Pompeia); (3) letra e número inventados na tela (placar, "11.350 × 11.450",
// "Erik's Ihord") e o Trump na cena final sem estar no roteiro.
// 0211b (revisão de f496d9a3e, simplificação): SÓ regra de ESCRITOR. Saíram a leitura de "um cenário do filme" (um "<lugar>, <era>"
// forçado quebrava roteiro de várias épocas: Lídia 600 a.C. → Bitcoin) e a cauda no prompt de difusão (brigava com garantirAcaoCentral,
// nomeava "placar"/"político" em motor sem negative_prompt e podia passar do teto de 2.500 do Veo/Kling 3). Os escritores (descritor
// clássico e planejador hollywood) já leem o roteiro inteiro: aqui fica UMA constante que todos importam. Nomear o proibido para o GPT
// que escreve a cena é seguro — ele não é um modelo de difusão.

/** Regras para quem ESCREVE a descrição visual de cada cena (linhas "- ..."), iguais em todo escritor de filme. */
export const REGRAS_DO_ESCRITOR_DE_CENAS = [
  "- KINEO-CASA-FICHA-0211 MEANING: show what each narration line MEANS in the context of the whole script, never a loose word taken literally: a real person named in the script keeps that person's gender, age and era; a technical or figurative term is shown as what it means in the story, never as a toy, a prop or an unrelated object; never add people, couples or events the script does not mention.",
  '- KINEO-CASA-FICHA-0211 ERA AND PLACE PER SCENE: each scene happens in the era and place the narration is talking about AT THAT MOMENT (when the narration moves to another time or place, the scene moves with it; when it does not, keep the same setting as the previous scene). Architecture, clothing, vehicles, tools, light sources, religious symbols, plants and landscape must exist in that scene\'s era and place — nothing built or invented later, nothing from another country, climate or religion.',
  '- KINEO-CASA-FICHA-0211 NO TEXT, NO PUBLIC FIGURES: never write on-screen text, letters, numbers, signs, posters, inscriptions or scoreboards into a shot description, and never describe a recognisable real public figure (politician, celebrity) that the narration does not name.',
].join('\n')
