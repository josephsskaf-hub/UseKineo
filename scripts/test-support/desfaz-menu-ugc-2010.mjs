// KINEO-MENU-UGC-2010 — DESFAZ, em memória, o item "AI UGC Ads" no menu do topo (home: topo + celular; /examples; /trending) e as reâncoras
// dos guardiões que contavam os itens do menu, para os guardiões que conferem arquivos BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste.
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-MENU-UGC-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-menu-ugc-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes.
// ENCADEAMENTO: é a camada MAIS NOVA — semUgcAjustes2010 (a cabeça que as cadeias do Studio Ads e da home chamam primeiro: paginas-ugc → kit-bf-venda →
// apresentador-olhos/home-3-cards, e filmes-f1f3-publico → home-cards-botoes → home-3-cards) chama ESTE primeiro. Este não importa ninguém.
// O guardião scripts/test-menu-ugc-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (MENU_UGC_2010_BASE).
import { readFileSync } from 'node:fs'
import { semAvatarPreso2010 } from './desfaz-avatar-preso-2010.mjs' // KINEO-AVATAR-PRESO-2010 — a camada mais nova (20/10): a cabeça da cadeia chama este primeiro
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_MENU_UGC_2010 = 'KINEO-MENU-UGC-2010'

/** A base da entrega: origin/main de 20/10 (KINEO-UGC-AJUSTES-2010 sobre KINEO-PAGINAS-UGC-2010). */
export const MENU_UGC_2010_BASE = 'a0e8412c6f2aada899b80bea646ad75b9cd468ec'

/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_MENU_UGC_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-menu-ugc-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_MENU_UGC_2010 = {
  'app/KineoLanding.tsx': 3,
  'app/examples/page.tsx': 2,
  'app/trending/page.tsx': 2,
  'scripts/test-duas-portas-1310.mjs': 1,
  'scripts/test-examples-gallery.mjs': 0,
  'scripts/test-home-3-cards-1910.mjs': 0,
  'scripts/test-login-modal-1410.mjs': 0,
  'scripts/test-support/desfaz-ugc-ajustes-2010.mjs': 2,
  'scripts/test-ugc-ajustes-2010.mjs': 0,
}
export const MENU_UGC_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_MENU_UGC_2010))
/** Arquivos novos da entrega (não existiam na base). */
export const MENU_UGC_2010_NOVOS = [
  'components/NavUgcAdsLink.tsx',
  'lib/ui/menuUgc2010.ts',
  'scripts/test-menu-ugc-2010.mjs',
  'scripts/test-support/desfaz-menu-ugc-2010.mjs',
  'scripts/test-support/desfaz-menu-ugc-2010-trocas.json',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semMenuUgc2010(texto, p) {
  texto = semAvatarPreso2010(texto, p) // KINEO-AVATAR-PRESO-2010 — o conserto do avatar preso (20/10) veio depois: sai PRIMEIRO (encadeado; texto sem a marca passa igual)
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_MENU_UGC_2010) || !MENU_UGC_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_MENU_UGC_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_MENU_UGC_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_MENU_UGC_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-menu-ugc-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-menu-ugc-2010: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMenuUgc2010(p, texto) {
  return semMenuUgc2010(texto, p)
}
