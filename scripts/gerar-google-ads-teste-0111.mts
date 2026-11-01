// KINEO-GOOGLE-ADS-TESTE-0111 — escreve o bloco de grupos/palavras-chave/anúncios/negativas em
// docs/GOOGLE-ADS-TESTE-2026-11-01.md, com os números lidos das fontes únicas e a contagem de caracteres calculada.
// Uso: node scripts/gerar-google-ads-teste-0111.mts   (falha sem escrever se algum título/descrição estourar o limite)
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { blocoDoDoc, montarGrupos, car } from './test-support/google-ads-teste-0111-anuncios.mts'
import { carregar, numerosDasFontes, RAIZ, DOC, INICIO, FIM } from './test-support/google-ads-teste-0111-fontes.mts'

const n = numerosDasFontes()
const gs = carregar(path.join(RAIZ, 'lib', 'growth', 'googleAdsTeste0111.ts'))
const urlFinal = (key: string) => {
  const g = gs.GS_GRUPOS.find((x: { key: string }) => x.key === key)
  return { base: gs.gsFinalUrlBase(g), sufixo: gs.GS_FINAL_URL_SUFFIX, clique: gs.gsFinalUrl(g) }
}

const estouros: string[] = []
for (const g of montarGrupos(n)) for (const a of g.anuncios) {
  a.titulos.forEach((t) => { if (car(t) > 30) estouros.push(`${g.key} título "${t}" = ${car(t)}`) })
  a.descricoes.forEach((d) => { if (car(d) > 90) estouros.push(`${g.key} descrição "${d}" = ${car(d)}`) })
  a.caminho.forEach((c) => { if (car(c) > 15) estouros.push(`${g.key} caminho "${c}" = ${car(c)}`) })
}
if (estouros.length) { console.error(estouros.join('\n')); process.exit(1) }

const doc = readFileSync(DOC, 'utf8')
const i = doc.indexOf(INICIO), f = doc.indexOf(FIM)
if (i < 0 || f < i) { console.error('marcadores do bloco gerado não encontrados no doc'); process.exit(1) }
const novo = doc.slice(0, i + INICIO.length) + '\n\n' + blocoDoDoc(n, urlFinal) + '\n\n' + doc.slice(f)
writeFileSync(DOC, novo)
console.log(`bloco gerado: ${JSON.stringify(n)}`)
