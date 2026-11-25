import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

function problems(code) {
  const errors = []
  const check = (pass, description) => { if (!pass) errors.push(description) }
  const heading = code.indexOf('<div className="done-result-heading">')
  const download = code.indexOf('data-testid="done-download-top"', heading)
  const exits = code.indexOf('<FilmReadyExits ', heading)
  const offer = code.indexOf('<div className="done-ready-offer">', heading)
  const player = code.indexOf('<div className="done-result-preview">', heading)

  check(heading >= 0 && download > heading && exits > download && offer > exits && player > offer, 'O download vem antes dos atalhos e da oferta, todos antes do player no HTML')
  check(/className="done-download-primary[^"\n]+"\s+style=\{\{ background: 'var\(--accent\)', color: 'var\(--on-accent\)'/.test(code), 'O download mantém destaque nos dois tamanhos')
  check(code.split('<FilmReadyFullVersionUpsell ').length === 2 && code.split(': firstFilmContinuation}').length === 2, 'Cada oferta tem uma só posição')
  check(/\{fullVersionOfferEligible\s*\? <FilmReadyFullVersionUpsell videoId=\{publicVideoId\} \/>\s*: deliveryOfferSlot === 'next_film'\s*\? <FilmDeliveryPlanOffer [^<>]+\/>\s*: firstFilmContinuation\}/.test(code), 'A oferta corresponde à conta e ao filme')
  return errors
}

assert.deepEqual(problems(source), [])
const mutants = [
  ['<FilmReadyExits videoId={publicVideoId} plan={commercialPlan} />', '', 'O download vem antes dos atalhos e da oferta, todos antes do player no HTML'],
  ['<div className="done-ready-offer">', '<div className="done-ready-offer"><FilmReadyFullVersionUpsell videoId={publicVideoId} />', 'Cada oferta tem uma só posição'],
  ['{fullVersionOfferEligible\n', '{!fullVersionOfferEligible\n', 'A oferta corresponde à conta e ao filme'],
  [": deliveryOfferSlot === 'next_film'\n", ": deliveryOfferSlot === 'full_version'\n", 'A oferta corresponde à conta e ao filme'],
]
for (const [original, replacement, expected] of mutants) {
  assert.equal(source.split(original).length, 2, `Âncora única para ${expected}`)
  assert.ok(problems(source.replace(original, replacement)).includes(expected), expected)
}
console.log('Filme pronto: 4 contratos, 4 mutações rejeitadas.')
