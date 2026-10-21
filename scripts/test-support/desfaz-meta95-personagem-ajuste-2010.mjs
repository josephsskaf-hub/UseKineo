// KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — DESFAZ, em memória, os 6 consertos da
// FOLHA DE PERSONAGEM (formato do still, reconferência da moderação da criatura, figura conhecida, elenco pela fala, janela da refação,
// cena sem gente) na rota do cinematic, no crítico do still e nos guardiões reancorados, para os guardiões que conferem esses arquivos
// BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Duas formas, e só elas — toda linha tocada carrega a marca KINEO-META95-PERSONAGEM-AJUSTE-2010:
//   · ACRÉSCIMO — linha nova: sai inteira (contagem EXATA por arquivo);
//   · TROCA — a linha da base foi reescrita: reconhecida INTEIRA, volta a ser o texto da base. Tabela em desfaz-meta95-personagem-ajuste-2010-trocas.json.
// Só age nos arquivos declarados; qualquer outro texto passa igual (idempotente). Preserva CRLF. A marca NÃO contém a de nenhuma camada de antes
// ("KINEO-META95-PERSONAGEM-2010" não é substring de "KINEO-META95-PERSONAGEM-AJUSTE-2010").
// ENCADEAMENTO: é a camada MAIS NOVA — semHomeCardsClaros2010 (que semBebeQueFala2010, e por ele semAvatarPreso2010/semMenuUgc2010, chama primeiro)
// e semMeta95Personagem2010 chamam ESTA primeiro, então toda cadeia (semMeta95Ideia1910, semMenuUgc2010, o guardião do conector) tira o ajuste sem mudar.
// Este não importa ninguém.
// As libs novas (lib/cinematic/personagemAjuste.ts, lib/cinematic/personagemAjusteServer.ts) não existem na base: guardião byte a byte não as lê.
// O guardião scripts/test-meta95-personagem-ajuste-2010.mjs prova que, desfeito isto, cada arquivo é EXATAMENTE a base (META95_PERSONAGEM_AJUSTE_2010_BASE).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MARCA_META95_PERSONAGEM_AJUSTE_2010 = 'KINEO-META95-PERSONAGEM-AJUSTE-2010'

/** A base da entrega: nasceu sobre fbe47c46 (20/10); INTEGRADA em 21/10 sobre origin/main f5373312 (KINEO-HOME-CARDS-CLAROS-2010 v2) — a tabela foi refeita contra esta. */
export const META95_PERSONAGEM_AJUSTE_2010_BASE = 'f53733122fbdd8393a9950444ab70e0695c3c9f1'

/** [linha nova (inteira), linha da base] por arquivo + a contagem exata de acréscimos (__acrescimos). */
export const TROCAS_META95_PERSONAGEM_AJUSTE_2010 = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'desfaz-meta95-personagem-ajuste-2010-trocas.json'), 'utf8'))
/** Arquivos que a entrega toca, com a contagem EXATA de acréscimos marcados (as trocas estão no JSON). */
export const ACRESCIMOS_META95_PERSONAGEM_AJUSTE_2010 = TROCAS_META95_PERSONAGEM_AJUSTE_2010.__acrescimos
export const META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS = Object.freeze(Object.keys(ACRESCIMOS_META95_PERSONAGEM_AJUSTE_2010))
/** Arquivos novos da entrega (não existiam na base). */
export const META95_PERSONAGEM_AJUSTE_2010_NOVOS = [
  'lib/cinematic/personagemAjuste.ts',
  'lib/cinematic/personagemAjusteServer.ts',
  'scripts/test-meta95-personagem-ajuste-2010.mjs',
  'scripts/test-support/desfaz-meta95-personagem-ajuste-2010.mjs',
  'scripts/test-support/desfaz-meta95-personagem-ajuste-2010-trocas.json',
  'docs/META95-PERSONAGEM-AJUSTE-2026-10-20.md',
  'docs/META95-PERSONAGEM-AJUSTE-COMPARACAO-2026-10-21.md',
]

/** O texto do arquivo sem a entrega (acréscimos fora, trocas desfeitas). Fora da lista ou sem linha marcada = devolve igual; contagem errada = erro. Preserva CRLF. */
export function semMeta95PersonagemAjuste2010(texto, p) {
  const rel = String(p ?? '').replace(/\\/g, '/')
  if (typeof texto !== 'string' || !texto.includes(MARCA_META95_PERSONAGEM_AJUSTE_2010) || !META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS.includes(rel)) return texto
  const crlf = texto.includes('\r\n')
  const trocas = new Map((TROCAS_META95_PERSONAGEM_AJUSTE_2010[rel] ?? []).map(([nova, base]) => [nova, base]))
  const fora = []
  let tiradas = 0
  let trocadas = 0
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (!linha.includes(MARCA_META95_PERSONAGEM_AJUSTE_2010)) { fora.push(linha); continue }
    if (trocas.has(linha)) { fora.push(trocas.get(linha)); trocadas++; continue }
    tiradas++
  }
  const esperadas = ACRESCIMOS_META95_PERSONAGEM_AJUSTE_2010[rel] ?? 0
  if (tiradas !== esperadas) throw new Error(`desfaz-meta95-personagem-ajuste-2010: ${rel} tem ${tiradas} acréscimo(s) marcado(s), esperava ${esperadas}`)
  if (trocadas !== trocas.size) throw new Error(`desfaz-meta95-personagem-ajuste-2010: ${rel} com ${trocadas} de ${trocas.size} troca(s) (conserto pela metade)`)
  const out = fora.join('\n')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}

/** Mesma coisa, com a ordem (arquivo, texto) que parte dos guardiões usa. */
export function desfazMeta95PersonagemAjuste2010(p, texto) {
  return semMeta95PersonagemAjuste2010(texto, p)
}
