import { registerHooks } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
registerHooks({ resolve(specifier, context, next) {
  let target = specifier.startsWith('@/') ? resolve(root, specifier.slice(2))
    : specifier.startsWith('.') && context.parentURL?.startsWith('file:') ? resolve(dirname(fileURLToPath(context.parentURL)), specifier) : null
  if (target && !/\.[mc]?[jt]sx?$/.test(target)) {
    for (const suffix of ['.ts','.js','/index.ts']) if (existsSync(target + suffix)) return next(pathToFileURL(target + suffix).href, context)
  }
  return next(specifier, context)
} })
export const source = p => readFileSync(resolve(root,p),'utf8')
export const moduleAt = p => import(pathToFileURL(resolve(root,p)).href)
export function checks() {
  let failed = 0
  return { check(name, condition) { console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`); if (!condition) failed++ }, finish() { if (failed) process.exitCode = 1 } }
}
