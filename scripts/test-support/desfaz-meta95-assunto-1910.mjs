// KINEO-META95-ASSUNTO-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — DESFAZ, em memória, o conserto "o filtro anti-invenção não
// apaga o assunto" (pedido traduzido no contexto do filtro, comparação sem acento/plural, fala frase a frase sem buraco, restos do apagão de pessoa)
// para os guardiões que conferem a rota do cinematic, o visualPromptPolicy ou os desfaz anteriores BYTE A BYTE contra uma base antiga. Módulo
// auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-META95-ASSUNTO-1910:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-meta95-assunto-1910-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual. A marca NÃO contém a de nenhuma camada de antes. Encadeamento: é a camada
// MAIS NOVA na rota do cinematic e no visualPromptPolicy — sai PRIMEIRO (semFilmeRapido1710 e semTrilha15s1610 chamam esta antes de tudo).
// O guardião scripts/test-meta95-assunto-1910.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_META95_ASSUNTO_1910 = 'KINEO-META95-ASSUNTO-1910'

/** A base da entrega (origin/main de 19/10: a legenda menor do Close real). */
export const META95_ASSUNTO_1910_BASE = 'cc5c984cca785d0700361b05745835b34ed0a366'

/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_META95_ASSUNTO_1910 = {
  'app/api/generate-video-cinematic/route.ts': 22,
  'lib/cinematic/visualPromptPolicy.ts': 24,
  'scripts/test-support/desfaz-filme-rapido-1710.mjs': 2,
  'scripts/test-support/desfaz-trilha-15s-1610.mjs': 2,
  'scripts/test-trilha-15s-1610.mjs': 0,
  'scripts/test-cena-negacao-1510.mjs': 0,
  'scripts/test-contrato-classicos-1410.mjs': 0,
  'scripts/test-monumento-real-1310.mjs': 0,
  'scripts/test-s25-nota95-2026-10-06.mjs': 0,
  'scripts/test-fala-x-imagem-2026-09-16.mjs': 0,
  'scripts/test-qualidade-comprovada-2026-09-15.mjs': 0,
  'scripts/test-escritor-monumento-1310.mjs': 0,
  'scripts/test-visual-contract-2026-09-11.mjs': 0,
  'scripts/test-seedance-blocos-e-voz-2026-09-29.mjs': 0,
  'scripts/test-duracoes-curtas-todos-motores-2026-09-29.mjs': 0,
  'scripts/test-h3-palavras-2026-09-15.mjs': 0,
  'scripts/test-kling3-imagens-2026-09-17.mjs': 0,
  'scripts/test-seedance-15s-3x6-2026-09-29.mjs': 1,
  'scripts/test-veo-marcado-2026-09-29.mjs': 1,
  'scripts/test-veo-modo-ia-2026-09-29.mjs': 1,
  'scripts/test-voz-15s-mesma-da-montagem-2026-09-29.mjs': 1,
  'scripts/test-filmes-f1f4-1910.mjs': 1,
  'scripts/test-close-real-ajuste-1910.mjs': 1,
  'scripts/test-filmes-f1-virgula-1910.mjs': 1,
  'scripts/test-close-real-v3-1910.mjs': 1,
  'scripts/test-close-real-legenda-1910.mjs': 1,
  'scripts/test-filmes-f1f3-ajuste-1910.mjs': 1,
}
/** [linha nova (inteira), linha da base] por arquivo. */
export const TROCAS_META95_ASSUNTO_1910 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-meta95-assunto-1910-trocas.json'), 'utf8'))
export const META95_ASSUNTO_1910_ARQUIVOS = Object.keys(ACRESCIMOS_META95_ASSUNTO_1910)
/** Arquivos novos da entrega. */
export const META95_ASSUNTO_1910_NOVOS = [
  'lib/cinematic/assuntoTraduzido.ts',
  'lib/cinematic/falaSemBuraco.ts',
  'scripts/test-meta95-assunto-1910.mjs',
  'scripts/test-support/desfaz-meta95-assunto-1910.mjs',
  'scripts/test-support/desfaz-meta95-assunto-1910-trocas.json',
  'docs/META95-ASSUNTO-2026-10-19.md',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semMeta95Assunto1910(texto, p) {
  if (typeof texto !== 'string' || !texto.includes(MARCA_META95_ASSUNTO_1910) || !META95_ASSUNTO_1910_ARQUIVOS.includes(p)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_META95_ASSUNTO_1910[p] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_META95_ASSUNTO_1910)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_META95_ASSUNTO_1910[p] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-meta95-assunto-1910: ${p} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** As linhas da BASE que a entrega reescreveu em `p` (para os guardiões que contam linha removida no diff). */
export function linhasTrocadasMeta95Assunto1910(p) {
  return (TROCAS_META95_ASSUNTO_1910[p] ?? []).map(([, base]) => base)
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMeta95Assunto1910(p, texto) {
  return semMeta95Assunto1910(texto, p)
}
