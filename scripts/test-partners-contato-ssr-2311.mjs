import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { offlineModules, React, renderToStaticMarkup, source } from './gpt24h-offline-support.mjs'

const require = createRequire(import.meta.url)
const { parse } = require('next/dist/compiled/node-html-parser')
const page = 'app/partners/page.tsx'
const offer = 'lib/affiliateViewsOffer.ts'
const mailbox = 'support@usekineo.com'
const approvalSubject = 'Kineo paid per views — approval request'
const questionSubject = 'Kineo affiliate program question'

// These client-only footer widgets require consent state and the current route.
// The page, offer, footer, affiliate CTAs and all mail links use their real modules.
const mocks = {
  'components/ConsentManager.tsx': { PrivacyChoicesLink: () => null },
  'components/CostCalculatorLink.tsx': { __esModule: true, default: () => null },
}

function checkLink(anchor, expectedSubject, label) {
  const url = new URL(anchor.getAttribute('href'), 'https://www.usekineo.com')
  assert.equal(url.protocol, 'mailto:', label + ': protocolo')
  assert.equal(url.pathname, mailbox, label + ': destinatário')
  assert.deepEqual([...url.searchParams], [['subject', expectedSubject]], label + ': assunto')
}

function check(replacements = {}) {
  const Partners = offlineModules({ mocks, replacements })(page).default
  const dom = parse(renderToStaticMarkup(React.createElement(Partners)))
  const links = dom.querySelectorAll('a')
  const approvals = dom.querySelectorAll('#paid-per-views a').filter(a => a.textContent.includes('Ask for approval at'))
  const questions = links.filter(a => a.textContent.trim() === 'Questions before applying? Email us.')
  assert.equal(approvals.length, 1, 'um pedido de aprovação')
  assert.equal(questions.length, 1, 'uma pergunta')
  checkLink(approvals[0], approvalSubject, 'aprovação')
  checkLink(questions[0], questionSubject, 'dúvida')
  assert.ok(approvals[0].textContent.endsWith(mailbox), 'destinatário visível na aprovação')
  const instructions = dom.querySelectorAll('#paid-per-views p').filter(p => p.textContent.includes('with your channel link'))
  assert.equal(instructions.length, 1, 'uma instrução de contato')
  assert.ok(instructions[0].textContent.includes('e-mail ' + mailbox + ' with your channel link'), 'destinatário visível nas instruções')
  const remaining = links.filter(a => a !== approvals[0] && a !== questions[0] && a.getAttribute('href')?.startsWith('mailto:'))
  assert.deepEqual(remaining.map(a => a.getAttribute('href')), ['mailto:' + mailbox, 'mailto:' + mailbox], 'dois contatos institucionais preservados')
}

function kill(file, original, mutation, reason) {
  const input = source(file)
  assert.equal(input.split(original).length, 2, 'alvo único do mutante: ' + original)
  assert.throws(() => check({ [file]: input.replace(original, mutation) }),
    e => e.code === 'ERR_ASSERTION' && e.message.startsWith(reason), 'mutante deve cair em: ' + reason)
  console.log('Morto · ' + reason)
}

check()
console.log('SSR verde · /partners · instruções, aprovação, dúvida e dois contatos institucionais')
kill(offer, 'mailto:${VIEWS_OFFER_CONTACT_EMAIL}', 'mailto:old@example.invalid', 'aprovação: destinatário')
kill(offer, approvalSubject, 'Kineo affiliate program question', 'aprovação: assunto')
kill(page, 'mailto:${VIEWS_OFFER_CONTACT_EMAIL}', 'mailto:old@example.invalid', 'dúvida: destinatário')
kill(page, 'Kineo%20affiliate%20program%20question', 'Pergunta%20errada', 'dúvida: assunto')
kill(page, 'href={VIEWS_OFFER_APPLY_MAILTO}', 'href={APPLY}', 'aprovação: protocolo')
kill(page, 'href={SUPPORT}', 'href={VIEWS_OFFER_APPLY_MAILTO}', 'dúvida: assunto')
kill(page, 'Ask for approval at {VIEWS_OFFER_CONTACT_EMAIL}', 'Ask for approval at hello@usekineo.com', 'destinatário visível na aprovação')
kill(page, 'then e-mail ${VIEWS_OFFER_CONTACT_EMAIL}', 'then e-mail hello@usekineo.com', 'destinatário visível nas instruções')

