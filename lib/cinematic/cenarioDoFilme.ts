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
  // KINEO-CENA-BATE-COM-FALA-0311 [TRAVA 8.2 — fundador 03/11, Canal do Revisor: "quero consertar tudo agora… inclusive daqueles
  // que baixaram"] — 6 defeitos da mesma família (cena que não mostra o que a fala diz), em filmes de 4 motores: "a family of
  // four" com 5 pessoas e uma mulher fora do roteiro (manobiayousaf, Seedance), "a waterproof bag" que nunca aparece (idem), o
  // fecho "céu da Europa claro à meia-noite" virando explosão (historyhideshere), os "três corações" como bolhas por fora do
  // polvo (Vinicius, Kling 4) e "set a budget" virando broto em moedas (raisajan626, Kling 4). Regra de ESCRITOR, uma vez, em
  // todo escritor (descritor clássico e planejador hollywood) — o motor só recebe a descrição já certa.
  '- KINEO-CENA-BATE-COM-FALA-0311 COUNT: when the narration line gives a number of people, animals or objects ("a family of four", "three hearts", "two ships"), the shot shows exactly that number and the description states the number in words ("exactly four people: a mother, a father and two children").',
  '- KINEO-CENA-BATE-COM-FALA-0311 NAMED OBJECT: an object the narration line names as its point ("a waterproof bag", "a first-aid kit") is the clear, visible main subject of that shot, described concretely (what it looks like, who holds it, where it is); never replace it with a generic table, papers or an unrelated object.',
  '- KINEO-CENA-BATE-COM-FALA-0311 NO EXTRA PEOPLE: never add a person the script does not describe (no narrator-character, detective, passer-by, woman or man "for atmosphere"); when a line has no person in it, show the place, object, animal or phenomenon itself. The film\'s own host or a character sheet you were given is not an extra person.',
  '- KINEO-CENA-BATE-COM-FALA-0311 ACTIONS: when a line tells the viewer to DO something ("set a budget", "cut expenses", "store water", "pack the bag"), show a person doing exactly that concrete action with the real objects involved, never a symbolic stand-in (coins with a sprout, a piggy bank, an abstract chart).',
  '- KINEO-CENA-BATE-COM-FALA-0311 INSIDE THE BODY: a fact about an internal organ or anatomy (hearts, lungs, brain, bones) shows the whole animal or body intact, with the organ suggested by a soft glow or a subtle x-ray view INSIDE the body; organs never appear outside, floating or growing out of the body.',
  '- KINEO-CENA-BATE-COM-FALA-0311 LAST SHOT: the final shot shows literally what the final narration line says (its subject, place, light and time of day); never a dramatic generic image that contradicts it, such as an explosion for a calm sky or night for a line that says daylight.',
].join('\n')
