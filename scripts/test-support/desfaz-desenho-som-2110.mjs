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

/** A base da entrega: a tela clara do desenho (KINEO-DESENHO-NOTA9-2110, já na fila), 9415fa5dd. */
export const DESENHO_SOM_2110_BASE = '9415fa5dd'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_DESENHO_SOM_2110 = {
  "scripts/test-cena-negacao-1510.mjs": [
    [
      "  relata('F toda linha nova/trocada da rota e do sceneTruth leva a marca', add.length > 0 && add.every((l) => l.includes(MARCA) || linhaDaTrilha15s1610(l) /* reancorado KINEO-TRILHA-15S */ || l.includes('KINEO-META95-ASSUNTO-1910') /* reancorado KINEO-META95-ASSUNTO-1910 */ || l.includes('KINEO-DESENHO-SOM-2110') /* reancorado KINEO-DESENHO-SOM-2110 — o som do desenho infantil (21/10) mexe na rota só com kids_cartoon */ || l.includes('KINEO-BEBE-QUE-FALA-2010') /* reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) também é de depois da base; provado em scripts/test-bebe-que-fala-2010.mjs */), add.filter((l) => !l.includes(MARCA) && !linhaDaTrilha15s1610(l) && !l.includes('KINEO-META95-ASSUNTO-1910') && !l.includes('KINEO-BEBE-QUE-FALA-2010')).slice(0, 2).join(' | '))",
      "  relata('F toda linha nova/trocada da rota e do sceneTruth leva a marca', add.length > 0 && add.every((l) => l.includes(MARCA) || linhaDaTrilha15s1610(l) /* reancorado KINEO-TRILHA-15S */ || l.includes('KINEO-META95-ASSUNTO-1910') /* reancorado KINEO-META95-ASSUNTO-1910 */ || l.includes('KINEO-BEBE-QUE-FALA-2010') /* reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) também é de depois da base; provado em scripts/test-bebe-que-fala-2010.mjs */), add.filter((l) => !l.includes(MARCA) && !linhaDaTrilha15s1610(l) && !l.includes('KINEO-META95-ASSUNTO-1910') && !l.includes('KINEO-BEBE-QUE-FALA-2010')).slice(0, 2).join(' | '))",
    ],
  ],
  "scripts/test-contrato-classicos-1410.mjs": [
    [
      "  return add.length > 0 && add.every((l) => l.includes(MARCA) || l.includes('KINEO-META95-ASSUNTO-1910') /* reancorado KINEO-META95-ASSUNTO-1910 */ || l.includes('KINEO-DESENHO-SOM-2110') /* reancorado KINEO-DESENHO-SOM-2110 — o som do desenho infantil (21/10) mexe na rota só com kids_cartoon */ || l.includes('KINEO-BEBE-QUE-FALA-2010') /* reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) também é de depois da base; provado em scripts/test-bebe-que-fala-2010.mjs */ || linhaDoParceiroEyebible2_1410(l) || linhaDaAncoraLegenda1410(l) /* KINEO-ANCORA-LEGENDA-1410 */ || linhaDoJuizStill1410(l) /* reancorado KINEO-JUIZ-STILL-1410 */ || linhaDaCenaNegacao1510(l) /* reancorado KINEO-CENA-NEGACAO-1510 */ || linhaDaTrilha15s1610(l) /* reancorado KINEO-TRILHA-15S */) // reancorado KINEO-PARCEIRO-EYEBIBLE-2-1410: as linhas da 2ª leva levam a marca DELA",
      "  return add.length > 0 && add.every((l) => l.includes(MARCA) || l.includes('KINEO-META95-ASSUNTO-1910') /* reancorado KINEO-META95-ASSUNTO-1910 */ || l.includes('KINEO-BEBE-QUE-FALA-2010') /* reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) também é de depois da base; provado em scripts/test-bebe-que-fala-2010.mjs */ || linhaDoParceiroEyebible2_1410(l) || linhaDaAncoraLegenda1410(l) /* KINEO-ANCORA-LEGENDA-1410 */ || linhaDoJuizStill1410(l) /* reancorado KINEO-JUIZ-STILL-1410 */ || linhaDaCenaNegacao1510(l) /* reancorado KINEO-CENA-NEGACAO-1510 */ || linhaDaTrilha15s1610(l) /* reancorado KINEO-TRILHA-15S */) // reancorado KINEO-PARCEIRO-EYEBIBLE-2-1410: as linhas da 2ª leva levam a marca DELA",
    ],
  ],
  "scripts/test-trilha-15s-1610.mjs": [
    [
      "  relata('F toda linha nova/trocada da rota e do visualPromptPolicy leva a marca', add.length > 0 && add.every((l) => linhaDaTrilha15s1610(l) || l.includes('KINEO-META95-ASSUNTO-1910') /* reancorado KINEO-META95-ASSUNTO-1910 */ || l.includes('KINEO-DESENHO-SOM-2110') /* reancorado KINEO-DESENHO-SOM-2110 — o som do desenho infantil (21/10) mexe na rota só com kids_cartoon */ || l.includes('KINEO-BEBE-QUE-FALA-2010') /* reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) também é de depois da base; provado em scripts/test-bebe-que-fala-2010.mjs */), add.filter((l) => !linhaDaTrilha15s1610(l) && !l.includes('KINEO-META95-ASSUNTO-1910') && !l.includes('KINEO-BEBE-QUE-FALA-2010')).slice(0, 2).join(' | '))",
      "  relata('F toda linha nova/trocada da rota e do visualPromptPolicy leva a marca', add.length > 0 && add.every((l) => linhaDaTrilha15s1610(l) || l.includes('KINEO-META95-ASSUNTO-1910') /* reancorado KINEO-META95-ASSUNTO-1910 */ || l.includes('KINEO-BEBE-QUE-FALA-2010') /* reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) também é de depois da base; provado em scripts/test-bebe-que-fala-2010.mjs */), add.filter((l) => !linhaDaTrilha15s1610(l) && !l.includes('KINEO-META95-ASSUNTO-1910') && !l.includes('KINEO-BEBE-QUE-FALA-2010')).slice(0, 2).join(' | '))",
    ],
    [
      "  const assuntos = git('log', '--format=%s', `${base}..HEAD`, '--', ROTA, VPP, LIB).split('\\n').map((s) => s.trim()).filter(Boolean).filter((s) => !s.includes('KINEO-FILME-RAPIDO-1710')).filter((s) => !s.includes('KINEO-META95-ASSUNTO-1910')).filter((s) => !s.includes('KINEO-DESENHO-SOM-2110')) /* reancorado KINEO-DESENHO-SOM-2110 — os commits do som do desenho levam a marca deles */.filter((s) => !s.includes('KINEO-BEBE-QUE-FALA-2010')) /* reancorado KINEO-BEBE-QUE-FALA-2010: os commits de 20/10 levam o selo deles */ // reancorado KINEO-FILME-RAPIDO-1710: os commits da entrega de 17/10 levam o selo deles · reancorado KINEO-META95-ASSUNTO-1910: os de 19/10 levam o selo \"Vai pra meta do 95\"",
      "  const assuntos = git('log', '--format=%s', `${base}..HEAD`, '--', ROTA, VPP, LIB).split('\\n').map((s) => s.trim()).filter(Boolean).filter((s) => !s.includes('KINEO-FILME-RAPIDO-1710')).filter((s) => !s.includes('KINEO-META95-ASSUNTO-1910')).filter((s) => !s.includes('KINEO-BEBE-QUE-FALA-2010')) /* reancorado KINEO-BEBE-QUE-FALA-2010: os commits de 20/10 levam o selo deles */ // reancorado KINEO-FILME-RAPIDO-1710: os commits da entrega de 17/10 levam o selo deles · reancorado KINEO-META95-ASSUNTO-1910: os de 19/10 levam o selo \"Vai pra meta do 95\"",
    ],
  ],
  'lib/musicDirection.ts': [
    [
      "  emotion: MusicEmotion | 'kids' // KINEO-DESENHO-SOM-2110 — 'kids' (trilha de programa infantil) não é emoção do roteiro: só o vertical do desenho infantil a pede",
      '  emotion: MusicEmotion',
    ],
  ],
  'scripts/test-bebe-que-fala-2010.mjs': [
    [
      "function wiringProblems(rota0 = rd(F.rota)) { const rota = semDesenhoSom2110(rota0, F.rota) // KINEO-DESENHO-SOM-2110 — reâncora: as 5 linhas do som do desenho (vertical infantil e claim) saem antes da conferência da fiação; era: function wiringProblems(rota = rd(F.rota)) {",
      "function wiringProblems(rota = rd(F.rota)) {",
    ],
  ],
  'scripts/test-desenho-nota9-2110.mjs': [
    [
      "  const semMarca = DESENHO_NOTA9_2110_ARQUIVOS.filter((f) => { const b = new Set((base(f) ?? '').split('\\n')); return !semDesenhoSom2110(rd(f), f).split('\\n').every((l) => b.has(l) || l.includes(MARCA)) }) // KINEO-DESENHO-SOM-2110 — reâncora: as linhas do som do desenho (camada mais nova) saem antes da conferência da marca; era: return !rd(f).split(...)",
      "  const semMarca = DESENHO_NOTA9_2110_ARQUIVOS.filter((f) => { const b = new Set((base(f) ?? '').split('\\n')); return !rd(f).split('\\n').every((l) => b.has(l) || l.includes(MARCA)) })",
    ],
    [
      "    if (semDesenhoSom2110(rd(f), f) !== b) p.push(`${f} mudou`) // KINEO-DESENHO-SOM-2110 — reâncora: as linhas do som do desenho (camada mais nova, só para kids_cartoon) saem antes; era: if (rd(f) !== b)",
      "    if (rd(f) !== b) p.push(`${f} mudou`)",
    ],
  ],
}
/** Arquivos que a entrega toca por linha, com a contagem EXATA de acréscimos marcados (as trocas estão acima). */
export const ACRESCIMOS_DESENHO_SOM_2110 = {
  'scripts/test-trilha-15s-1610.mjs': 0,
  'scripts/test-contrato-classicos-1410.mjs': 0,
  'scripts/test-cena-negacao-1510.mjs': 0,
  'app/api/compose/route.ts': 4,
  'app/api/generate-video-cinematic/route.ts': 5,
  'lib/musicDirection.ts': 2,
  'lib/narration/niche-mapping.ts': 2,
  'scripts/test-desenho-nota9-2110.mjs': 1,
  'scripts/test-bebe-que-fala-2010.mjs': 1,
  'scripts/test-mcp-studio-2010.mjs': 3,
  'scripts/test-mcp-studio-ajuste-2010.mjs': 3,
  'scripts/test-meta95-personagem-2010.mjs': 1,
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
