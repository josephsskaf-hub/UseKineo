#!/usr/bin/env node
// KINEO-SEO-FAQ-SO-ONDE-VISIVEL-2026-09-07 — guardião do FAQPage.
//
// O QUE ELE AMARRA (a condição que decide, não contagem de texto):
//   1. O componente global (default export de components/StructuredData.tsx,
//      montado em app/layout.tsx para TODAS as páginas) NÃO emite o faqSchema.
//   2. O faqSchema só é emitido por FaqStructuredData, e FaqStructuredData só
//      é renderizado em app/page.tsx (a home), a única página onde as 13
//      perguntas existem como texto visível.
//   3. Cada pergunta do faqSchema aparece literalmente em app/KineoLanding.tsx
//      (o "visível na página de origem" que o Google exige).
//
// POR QUE: medido em 07/09 com as 189 URLs do sitemap baixadas como Googlebot:
// o bloco FAQPage saía em 187 páginas e só a home mostrava as 13 perguntas
// (/pricing 2/13, todas as outras 0/13). 121 páginas carregavam dois FAQPage.
//
// Estilo do repo que FUNCIONA: readFileSync + asserções, sem import com alias.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// CRLF normalizado na leitura — armadilha catalogada (checkout do Windows).
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Bloco de chaves balanceadas a partir de `open` (índice de um '{'). */
function balanced(src, open) {
  let depth = 0
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(open, i + 1) }
  }
  return ''
}

/** Corpo de uma função `export [default] function Nome(` até a chave que fecha. */
function functionBody(src, signatureRe) {
  const m = signatureRe.exec(src)
  if (!m) return ''
  const open = src.indexOf('{', m.index + m[0].length)
  return open >= 0 ? balanced(src, open) : ''
}

const structured = stripComments(read('components/StructuredData.tsx'))
const layout = stripComments(read('app/layout.tsx'))
const home = stripComments(read('app/page.tsx'))
const landing = read('app/KineoLanding.tsx')

// ── 1. O componente GLOBAL não emite o FAQ ────────────────────────────────────
const globalBody = functionBody(structured, /export default function StructuredData\s*\(/)
ok(globalBody.length > 0, 'default export StructuredData existe e tem corpo')
ok(globalBody.includes('jsonLd(organizationSchema)'), 'global emite Organization')
ok(globalBody.includes('jsonLd(softwareApplicationSchema)'), 'global emite SoftwareApplication')
equal(globalBody.includes('faqSchema'), false, 'global NÃO referencia faqSchema (o FAQ não pode sair em toda página)')
equal((globalBody.match(/application\/ld\+json/g) || []).length, 2, 'global emite exatamente 2 blocos ld+json')

// ── 2. O FAQ só sai por FaqStructuredData, e só a home o renderiza ────────────
const faqBody = functionBody(structured, /export function FaqStructuredData\s*\(/)
ok(faqBody.length > 0, 'export nomeado FaqStructuredData existe')
ok(faqBody.includes('jsonLd(faqSchema)'), 'FaqStructuredData emite o faqSchema')
equal((structured.match(/jsonLd\(faqSchema\)/g) || []).length, 1, 'faqSchema é emitido em UM só lugar do arquivo')

ok(/<StructuredData\s*\/>/.test(layout), 'layout monta <StructuredData /> (global) para todas as páginas')
equal(/FaqStructuredData/.test(layout), false, 'layout NÃO monta FaqStructuredData')

ok(/import \{[^}]*\bFaqStructuredData\b[^}]*\} from '@\/components\/StructuredData'/.test(home), 'home importa FaqStructuredData do componente')
ok(/<FaqStructuredData\s*\/>/.test(home), 'home renderiza <FaqStructuredData />')

// Nenhuma OUTRA página renderiza o FAQ global: varre app/**/page.tsx e layouts.
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(name)) out.push(p)
  }
  return out
}
const appFiles = walk(join(root, 'app')).map((p) => p.slice(root.length + 1).replace(/\\/g, '/'))
const homeFile = 'app/page.tsx'
const others = appFiles.filter((f) => f !== homeFile && /FaqStructuredData/.test(stripComments(read(f))))
equal(others.length, 0, `nenhum outro arquivo de app/ renderiza FaqStructuredData (achados: ${others.join(', ') || 'nenhum'})`)

// ── 3. Toda pergunta do faqSchema é texto visível na home ─────────────────────
const faqDecl = structured.indexOf('const faqSchema')
ok(faqDecl >= 0, 'faqSchema declarado')
const faqBlock = balanced(structured, structured.indexOf('{', faqDecl))
const questions = [...faqBlock.matchAll(/name:\s*'([^']+\?)'/g)].map((m) => m[1])
ok(questions.length >= 10, `faqSchema tem perguntas (${questions.length})`)
for (const q of questions) {
  ok(landing.includes(q), `pergunta visível em KineoLanding: "${q}"`)
}

console.log(`faq-schema-so-onde-visivel: ${checks} verificações passaram; 0 falharam.`)
