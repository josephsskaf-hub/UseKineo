// KINEO-KLP-RESET-2026-09-10 — o bloco "Who is this first Short for?" saía nu na
// home pós-cadastro (fundador viu ao criar a conta de teste do Dodo, 10/09).
//
// Causa medida num harness com o CSS de produção: a landing injeta um <style>
// inline dentro de <main class="klp"> com `.klp * { margin:0; padding:0 }`.
// Especificidade (0,1,0) = a de uma classe de CSS module, e o inline vem DEPOIS
// no documento → vence: shell sem padding e sem `margin:auto` (colado à
// esquerda), botões sem padding, seção sem padding lateral (`.klp section`).
//
// Conserto: toda regra do módulo vira `.section .x` (0,2,0) e a raiz vira
// `.section.section`. Este guardião trava isso e a premissa (o reset existe).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const css = rd('components/HomeWelcomeGoalRouter.module.css').replace(/\/\*[\s\S]*?\*\//g, '')
const landing = rd('app/KineoLanding.tsx')

console.log('== a premissa ==')
checa('a landing ainda tem o reset `.klp * { margin:0; padding:0 }` (se sumir, este guardião pode ser aposentado)', /\.klp \*\s*\{[^}]*margin:\s*0[^}]*padding:\s*0/.test(landing) || /\.klp \*\s*\{[^}]*padding:\s*0[^}]*margin:\s*0/.test(landing))
checa('a landing ainda tem `.klp section { padding: … 0 }` (zera o padding lateral da seção)', /\.klp section\s*\{\s*padding:\s*\d+px 0\s*\}/.test(landing))
checa('o roteador é montado DENTRO de <main class="klp">', /<main className="klp">/.test(landing) && /<HomeWelcomeGoalRouter \/>/.test(landing))

console.log('== o conserto ==')
// toda regra de nível de classe começa por `.section ` ou `.section.section`
const selectors = []
for (const m of css.matchAll(/^\s*(\.[^{\n]+?)\s*(\{|,)\s*$/gm)) selectors.push(m[1].trim())
checa('há regras para conferir (≥ 30 seletores)', selectors.length >= 30)
const nus = selectors.filter((s) => !/^\.section(\.section|\s)/.test(s))
checa('nenhum seletor solto `.x` — todos são `.section .x` ou `.section.section` (0,2,0)', nus.length === 0)
if (nus.length) console.log('   soltos:', nus.slice(0, 8).join(' | '))
checa('a raiz é `.section.section` (vence `.klp section` da landing)', /^\.section\.section \{/m.test(css))
checa('shell: padding e `margin: 0 auto` continuam na regra (o que a página perdia)', /\.section \.shell \{[^}]*margin:\s*0 auto[^}]*padding:/s.test(css))
checa('botão: padding 18px continua na regra', /\.section \.goalButton \{[^}]*padding:\s*18px/s.test(css))
checa('o TSX continua aplicando styles.section na raiz (o prefixo depende disso)', /<section id="first-win" className=\{styles\.section\}/.test(rd('components/HomeWelcomeGoalRouter.tsx')))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
