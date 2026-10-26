// KINEO-FILME15-PERFEITO-2610 — regressões locais, SEM rede/credenciais/render.
// Os casos de repetição são sintéticos; NÃO representam os 25 filmes citados pelo fundador.
// A fixture Carrington é evidência histórica real já versionada em 19/10.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const FILE = 'lib/filmes/faceless15.ts'
const source = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const load = (transform) => createOfflineLoader({ source: (p, s) => p === FILE && transform ? transform(s) : s })('@/lib/filmes/faceless15')
const F = load()
const W = (text) => text.split(/\s+/).map((word, i, a) => ({ word, start: i * 0.3, end: (i + 1) * 0.3, sentenceEnd: i === a.length - 1 || /[.!?]$/.test(word) }))
const normalized = (tokens) => tokens.map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean).join(' ')
const assertCoverage = (module, words) => {
  const blocks = module.agruparLegendaFaceless15(words, 99)
  assert.equal(normalized(blocks.flatMap((b) => b.words.map((w) => w.word))), normalized(words.map((w) => w.word)), 'cada palavra falada aparece uma vez, na ordem')
  assert.ok(blocks.every((b) => b.words.length >= 2 || b.fraseInteira), 'nenhuma órfã criada depois da partição')
  assert.ok(blocks.every((b) => b.words.length <= 5), 'o teto continua de cinco tokens')
  return blocks
}

const EMPHATIC = [
  'It was in the very very beginning',
  'Ele ficou com a mesma mesma roupa',
  'Eso pasó en la misma misma calle',
]
for (const text of EMPHATIC) {
  const blocks = assertCoverage(F, W(text))
  assert.deepEqual(Array.from(blocks, (b) => b.words.length), [5, 2], text)
}
for (const text of ['No. No one answered the door.', 'Não. Não havia ninguém naquela casa.', 'No. No quedaba nadie en casa.']) {
  const words = W(text)
  const blocks = assertCoverage(F, words)
  assert.equal(blocks[0].words.length, 1, 'uma frase verdadeira de uma palavra continua permitida')
  assert.ok(blocks[1].text.startsWith(words[1].word), 'a palavra repetida depois do ponto não desaparece')
}

// Corpus histórico: mesmo conteúdo, mesmas fronteiras; o reparo não muda legenda já correta.
const fixture = JSON.parse(fs.readFileSync('scripts/test-support/fixture-whisper-carrington-1910.json', 'utf8'))
const spelling = createOfflineLoader()('@/lib/captionScriptSpelling')
const words = spelling.alinharGrafiaDoRoteiro(fixture.words, fixture.narracao).words
const carrington = assertCoverage(F, words)
assert.equal(carrington.length, 11)
assert.ok(carrington.every((b) => b.words.length >= 2))

// Mutante aplicado: restabelece a deduplicação DEPOIS de escolher 2..5 palavras.
// Deve perder fala real nos três idiomas e voltar a criar a órfã final.
const anchor = '      i += tam\n'
assert.equal(source.split(anchor).length - 1, 1)
const mutant = load((s) => s.replace(anchor, anchor + "      const ant = blocos[blocos.length - 1]?.words.slice(-1)[0]\n      if (usados.length > 1 && ant && normPalavra(ant.word) !== '' && normPalavra(ant.word) === normPalavra(usados[0].word)) usados.splice(0, 1)\n"))
for (const text of EMPHATIC) {
  assert.throws(() => assertCoverage(mutant, W(text)), /cada palavra falada/)
  assert.ok(mutant.agruparLegendaFaceless15(W(text), 99).some((b) => b.words.length === 1 && !b.fraseInteira))
}
console.log('PASS: EN/PT/ES, repetição após ponto, 11 blocos Carrington, mutante aplicado e vermelho; offline.')
