// KINEO-DESENHO-NOTA9-2110 — DESFAZ, em memória, a entrega "o desenho infantil inteiro na tela clara" (fundador 21/10: "experiência
// KINEO-DESENHO-NOTA9-2110 — do cliente no mínimo nota 9"; o "Make my cartoon" caía no /generate antigo e escuro) nos arquivos que
// KINEO-DESENHO-NOTA9-2110 — guardiões de camadas antigas conferem BYTE A BYTE contra uma base antiga (reâncoras e o elo da cadeia).
// Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-DESENHO-NOTA9-2110:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base (TROCAS_DESENHO_NOTA9_2110 abaixo).
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
//
// REESCRITOS (fora do desfaz por linha, de propósito): components/kidsCartoon/KidsCartoonTemplate.tsx e lib/kidsCartoon/kidsCartoon.ts nasceram
// NOVOS na camada KINEO-BEBE-QUE-FALA-2010 (nenhum guardião antigo os compara byte a byte) e esta entrega reescreve a tela inteira; o guardião
// scripts/test-desenho-nota9-2110.mjs prova o diff contra a base: só estes arquivos, e o /generate, engineWall e homeVideoCuration intocados.
//
// ENCADEAMENTO: é a camada MAIS NOVA — semHomeCardsClaros2010 (que semBebeQueFala2010, a cabeça semMenuUgc2010 e as cadeias da home chamam
// primeiro) chama ESTE primeiro. Este não importa ninguém.

import { semAdsNota92110 } from './desfaz-ads-nota9-2110.mjs' // KINEO-ADS-NOTA9-2110 — o Studio Ads nota 9 (21/10) veio depois: sai PRIMEIRO (encadeado; texto sem a marca passa igual)
export const MARCA_DESENHO_NOTA9_2110 = 'KINEO-DESENHO-NOTA9-2110'

/** A base da entrega: origin/main de 21/10 manhã (f53733122, KINEO-HOME-CARDS-CLAROS-2010 v2). */
export const DESENHO_NOTA9_2110_BASE = 'f53733122'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_DESENHO_NOTA9_2110 = {
  'scripts/test-bebe-que-fala-2010.mjs': [
    [
      "  const fichas = L.KIDS_CHARACTERS.every((c) => c.sheet.startsWith(`${c.name}, `) && c.sheet.length > 60 && c.kind.en && c.kind.pt && c.kind.es && c.portrait === `/kids-cartoon/${c.id}.webp`) // KINEO-DESENHO-NOTA9-2110 — reâncora: os 6 retratos existem (public/kids-cartoon/<id>.webp); era: c.portrait === ''",
      "  const fichas = L.KIDS_CHARACTERS.every((c) => c.sheet.startsWith(`${c.name}, `) && c.sheet.length > 60 && c.kind.en && c.kind.pt && c.kind.es && c.portrait === '')",
    ],
  ],
  'scripts/test-home-cards-claros-2010.mjs': [
    [
      "  const semMarca = HOME_CARDS_CLAROS_2010_ARQUIVOS.filter((f) => { const b = new Set(base(f).split('\\n')); return !semDesenhoNota9_2110(rd(f), f).split('\\n').every((l) => b.has(l) || l.includes(MARCA)) }) // KINEO-DESENHO-NOTA9-2110 — reâncora: as linhas da camada mais nova saem antes; era: return !rd(f).split(...)",
      "  const semMarca = HOME_CARDS_CLAROS_2010_ARQUIVOS.filter((f) => { const b = new Set(base(f).split('\\n')); return !rd(f).split('\\n').every((l) => b.has(l) || l.includes(MARCA)) })",
    ],
  ],
}
/** Arquivos que a entrega toca por linha, com a contagem EXATA de acréscimos marcados (as trocas estão acima). */
export const ACRESCIMOS_DESENHO_NOTA9_2110 = {
  'scripts/test-bebe-que-fala-2010.mjs': 0,
  'scripts/test-home-cards-claros-2010.mjs': 1,
  'scripts/test-mcp-studio-2010.mjs': 2,
  'scripts/test-mcp-studio-ajuste-2010.mjs': 3,
  'scripts/test-support/desfaz-home-cards-claros-2010.mjs': 2,
}
export const DESENHO_NOTA9_2110_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_DESENHO_NOTA9_2110))
/** Arquivos que a entrega reescreve (fora do desfaz por linha; ver o cabeçalho). */
export const DESENHO_NOTA9_2110_REESCRITOS = ['components/kidsCartoon/KidsCartoonTemplate.tsx', 'lib/kidsCartoon/kidsCartoon.ts']
/** Arquivos novos da entrega (não existiam na base). */
export const DESENHO_NOTA9_2110_NOVOS = [
  'public/kids-cartoon/bibi.webp',
  'public/kids-cartoon/dino.webp',
  'public/kids-cartoon/leo.webp',
  'public/kids-cartoon/mia.webp',
  'public/kids-cartoon/ollie.webp',
  'public/kids-cartoon/pip.webp',
  'scripts/test-desenho-nota9-2110.mjs',
  'scripts/test-support/desfaz-desenho-nota9-2110.mjs',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semDesenhoNota9_2110(texto, p) {
  texto = semAdsNota92110(texto, p) // KINEO-ADS-NOTA9-2110 — a camada mais nova sai primeiro
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_DESENHO_NOTA9_2110) || !DESENHO_NOTA9_2110_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_DESENHO_NOTA9_2110[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_DESENHO_NOTA9_2110)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_DESENHO_NOTA9_2110[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-desenho-nota9-2110: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-desenho-nota9-2110: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazDesenhoNota9_2110(p, texto) {
  return semDesenhoNota9_2110(texto, p)
}
