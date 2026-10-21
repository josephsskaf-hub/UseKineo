// KINEO-DESENHO-SOM-2110 — DESFAZ, em memória, a entrega "o som do desenho infantil" (fundador 21/10, nota 9,5 aos curtas do Ollie: "o que
// KINEO-DESENHO-SOM-2110 — me incomodou foi a trilha, tem que ser diferente"): narrador contador de histórias, trilha de programa infantil
// KINEO-DESENHO-SOM-2110 — mais baixa e o botão de legenda — só para o filme com kids_cartoon. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-DESENHO-SOM-2110:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base (TROCAS_DESENHO_SOM_2110 abaixo).
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
//
// REESCRITOS (fora do desfaz por linha): components/kidsCartoon/KidsCartoonTemplate.tsx, components/kidsCartoon/KidsCartoonPages.tsx e lib/kidsCartoon/kidsCartoon.ts (a tela, as páginas e a lib
// do desenho, reescritas pela camada KINEO-DESENHO-NOTA9-2110 logo antes); o guardião scripts/test-desenho-som-2110.mjs prova o resto.
//
// ENCADEAMENTO: é a camada MAIS NOVA — semDesenhoNota9_2110 (que semHomeCardsClaros2010, semBebeQueFala2010 e a cabeça semMenuUgc2010 chamam
// primeiro) chama ESTE primeiro. Este não importa ninguém.

export const MARCA_DESENHO_SOM_2110 = 'KINEO-DESENHO-SOM-2110'

/** A base da entrega: a tela clara do desenho (KINEO-DESENHO-NOTA9-2110), d37a272bf. */
export const DESENHO_SOM_2110_BASE = 'd37a272bf'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_DESENHO_SOM_2110 = {
  'lib/musicDirection.ts': [
    [
      "  emotion: MusicEmotion | 'kids' // KINEO-DESENHO-SOM-2110 — 'kids' (trilha de programa infantil) não é emoção do roteiro: só o vertical do desenho infantil a pede",
      '  emotion: MusicEmotion',
    ],
  ],
  'scripts/test-desenho-nota9-2110.mjs': [
    [
      "    if (semDesenhoSom2110(rd(f), f) !== b) p.push(`${f} mudou`) // KINEO-DESENHO-SOM-2110 — reâncora: as linhas do som do desenho (camada mais nova, só para kids_cartoon) saem antes; era: if (rd(f) !== b)",
      "    if (rd(f) !== b) p.push(`${f} mudou`)",
    ],
  ],
}
/** Arquivos que a entrega toca por linha, com a contagem EXATA de acréscimos marcados (as trocas estão acima). */
export const ACRESCIMOS_DESENHO_SOM_2110 = {
  'app/api/compose/route.ts': 4,
  'app/api/generate-video-cinematic/route.ts': 5,
  'lib/musicDirection.ts': 2,
  'lib/narration/niche-mapping.ts': 2,
  'scripts/test-desenho-nota9-2110.mjs': 1,
  'scripts/test-support/desfaz-desenho-nota9-2110.mjs': 2,
}
export const DESENHO_SOM_2110_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_DESENHO_SOM_2110))
/** Arquivos que a entrega reescreve (fora do desfaz por linha; ver o cabeçalho). */
export const DESENHO_SOM_2110_REESCRITOS = ['components/kidsCartoon/KidsCartoonPages.tsx', 'components/kidsCartoon/KidsCartoonTemplate.tsx', 'lib/kidsCartoon/kidsCartoon.ts']
/** Arquivos novos da entrega (não existiam na base). */
export const DESENHO_SOM_2110_NOVOS = [
  'scripts/test-desenho-som-2110.mjs',
  'scripts/test-support/desfaz-desenho-som-2110.mjs',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semDesenhoSom2110(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_DESENHO_SOM_2110) || !DESENHO_SOM_2110_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_DESENHO_SOM_2110[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_DESENHO_SOM_2110)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_DESENHO_SOM_2110[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-desenho-som-2110: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-desenho-som-2110: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazDesenhoSom2110(p, texto) {
  return semDesenhoSom2110(texto, p)
}
