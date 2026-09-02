import fs from 'node:fs'
import ts from 'typescript'

const INTERNAL_ACCOUNTS_SOURCE = new URL('../lib/internalAccounts.ts', import.meta.url)

function sourceFileFor(sourceUrl) {
  const source = fs.readFileSync(sourceUrl, 'utf8')
  return ts.createSourceFile(sourceUrl.pathname, source, ts.ScriptTarget.Latest, true)
}

function exportedInitializer(sourceUrl, exportName) {
  const sourceFile = sourceFileFor(sourceUrl)

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName) continue
      if (!declaration.initializer) throw new Error(`${exportName} has no initializer`)
      return declaration.initializer
    }
  }

  throw new Error(`${exportName} was not found in ${sourceUrl.pathname}`)
}

function unwrapLiteral(node) {
  let current = node
  while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) current = current.expression
  return current
}

function readCanonicalStringArray(exportName) {
  const initializer = exportedInitializer(INTERNAL_ACCOUNTS_SOURCE, exportName)
  if (!ts.isArrayLiteralExpression(initializer)) {
    throw new Error(`${exportName} must remain an array literal in lib/internalAccounts.ts`)
  }
  return initializer.elements.map((element) => {
    const literal = unwrapLiteral(element)
    if (!ts.isStringLiteralLike(literal)) {
      throw new Error(`${exportName} must contain string literals only`)
    }
    return literal.text
  })
}

export function readCanonicalStringConstant(sourceUrl, exportName) {
  const literal = unwrapLiteral(exportedInitializer(sourceUrl, exportName))
  if (!ts.isStringLiteralLike(literal)) {
    throw new Error(`${exportName} must remain a string literal in ${sourceUrl.pathname}`)
  }
  return literal.text
}

export function readCanonicalNumberConstant(sourceUrl, exportName) {
  const literal = unwrapLiteral(exportedInitializer(sourceUrl, exportName))
  if (!ts.isNumericLiteral(literal)) {
    throw new Error(`${exportName} must remain a numeric literal in ${sourceUrl.pathname}`)
  }
  return Number(literal.text)
}

function likeToRegExp(pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i')
}

const EXACT_INTERNAL_EMAILS = new Set(
  readCanonicalStringArray('INTERNAL_EXACT_EMAILS').map((email) => email.toLowerCase()),
)
const INTERNAL_EMAIL_PATTERNS = readCanonicalStringArray('INTERNAL_LIKE_PATTERNS').map(likeToRegExp)

export function isInternalMeasurementEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase()
  if (!email) return false
  return EXACT_INTERNAL_EMAILS.has(email) || INTERNAL_EMAIL_PATTERNS.some((pattern) => pattern.test(email))
}

export async function fetchAllPages(fetchPage, pageSize = 1000) {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('pageSize must be a positive integer')
  const rows = []
  for (let page = 0; page < 1000; page++) {
    const from = page * pageSize
    const batch = await fetchPage(from, from + pageSize - 1)
    if (!Array.isArray(batch)) throw new Error('page fetch must return an array')
    rows.push(...batch)
    if (batch.length < pageSize) return rows
  }
  throw new Error('pagination exceeded the 1000-page safety limit')
}
