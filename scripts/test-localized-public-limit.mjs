#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }
const ok = (value, label) => { assert.ok(value, label); checks += 1 }

const compiled = ts.transpileModule(read('lib/studioPromptLimit.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const module = { exports: {} }
new Function('require', 'module', 'exports', compiled)(
  (id) => id === '@/lib/analyzeLimits' ? { ANALYZE_PROMPT_MAX_CHARS: 5000 } : null,
  module,
  module.exports,
)
const limit = module.exports
const over = limit.promptLimitState('a'.repeat(1228), 1000)

equal(limit.formatLimitCounter(over, 'pt'), '1.228 / 1.000 caracteres — 228 acima do limite', 'PT counter')
equal(limit.formatLimitCounter(over, 'es'), '1228 / 1000 caracteres — 228 por encima del límite', 'ES counter')
equal(limit.formatPromptLimitTrimAction(228, 'pt'), 'Ajustar ao limite (228)', 'PT trim action')
equal(limit.formatPromptLimitTrimAction(228, 'es'), 'Ajustar al límite (228)', 'ES trim action')
equal(limit.promptLimitPreservedMessage('pt'), 'Nada foi removido. Ajuste aqui ou edite o texto antes de continuar.', 'PT preserved message')
equal(limit.promptLimitPreservedMessage('es'), 'No se eliminó nada. Ajústalo aquí o edita el texto antes de continuar.', 'ES preserved message')
equal(limit.formatPromptLimitTrimNotice(228, 'pt'), '228 caracteres removidos. Confira o final antes de continuar.', 'PT trimmed message')
equal(limit.formatPromptLimitTrimNotice(228, 'es'), '228 caracteres eliminados. Revisa el final antes de continuar.', 'ES trimmed message')
equal(limit.formatLimitCounter(over), '1,228 / 1,000 characters — 228 over the limit', 'English default stays unchanged')

const form = read('app/youtube-shorts-from-topic/TopicGeneratorForm.tsx')
ok(form.includes("const limitLocale = language ?? 'en'"), 'form chooses copy from the existing language contract')
ok(form.includes('formatLimitCounter(limit, limitLocale)'), 'counter uses the chosen language')
ok(form.includes('formatPromptLimitTrimAction(limit.excess, limitLocale)'), 'trim action uses the chosen language')
ok(form.includes('promptLimitPreservedMessage(limitLocale)'), 'preserved-text alert uses the chosen language')
ok(form.includes('formatPromptLimitTrimNotice(result.removed, limitLocale)'), 'post-trim notice uses the chosen language')
ok(!form.includes('maxLength={1000}'), 'public paste still cannot be silently truncated')

const preview = read('docs/previews/FLUXO-R25-LOCALIZED-SCRIPT-LIMIT-2026-09-04.html')
ok(preview.includes('Antes · PT/ES') && preview.includes('Depois · português'), 'preview compares Portuguese before/after')
ok(preview.includes('Antes · mobile ES') && preview.includes('Depois · mobile español'), 'preview compares Spanish mobile before/after')

console.log(`localized public limit: ${checks}/${checks} checks passed`)
