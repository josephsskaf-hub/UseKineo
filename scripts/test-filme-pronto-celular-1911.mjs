import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')

function problems(code) {
  const errors = []
  const check = (pass, description) => { if (!pass) errors.push(description) }
  const heading = code.indexOf('<div className="done-result-heading">')
  const download = code.indexOf('data-testid="done-download-top"', heading)
  const offer = code.indexOf('<div className="done-ready-offer">', heading)
  const player = code.indexOf('<div className="done-result-preview">', heading)

  check(heading >= 0 && download > heading && offer > download && player > offer, 'O download vem antes da oferta, ambos antes do player')
  check(code.includes("window.matchMedia('(max-width: 767px)')"), 'A promoção da oferta usa o breakpoint de celular')
  check(code.includes('fullVersionOfferEligible && !compactReadyResult'), 'O download em celular mantém destaque quando há oferta')
  check(code.includes('!compactReadyResult && firstFilmContinuation'), 'A continuação só fica no lugar anterior no computador')
  check(code.includes('!compactReadyResult && fullVersionOfferEligible && ('), 'A versão completa só fica abaixo do player no computador')
  check(code.includes('fullVersionOfferEligible ? <FilmReadyFullVersionUpsell videoId={publicVideoId} /> : firstFilmContinuation'), 'O celular recebe a oferta existente para a conta e o filme corretos')
  return errors
}

assert.deepEqual(problems(source), [])
const mutants = [
  ['<div className="done-ready-offer">', '<div className="done-ready-offer-lost">', 'O download vem antes da oferta, ambos antes do player'],
  ['!compactReadyResult && fullVersionOfferEligible && (', 'fullVersionOfferEligible && (', 'A versão completa só fica abaixo do player no computador'],
  ['!compactReadyResult && firstFilmContinuation', 'firstFilmContinuation', 'A continuação só fica no lugar anterior no computador'],
]
for (const [original, replacement, expected] of mutants) {
  assert.equal(source.split(original).length, 2, `Âncora única para ${expected}`)
  assert.ok(problems(source.replace(original, replacement)).includes(expected), expected)
}
console.log('Filme pronto em celular: 6 contratos, 3 mutações rejeitadas.')
