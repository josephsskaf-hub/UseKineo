// KINEO-VERDADE-TRIAL-2026-10-05 — guardião da verdade do trial e do e-mail de boas-vindas (fundador 05/10).
// O que ele prova:
//   1. a promessa velha de motores ("every engine unlocked" / "all engines unlocked") não volta a NENHUM arquivo de
//      app/, lib/ ou components/ — nem em comentário: era assim que ela renascia copiada de um vizinho;
//   2. a frase única TRIAL_FIRST_FILM_PHRASE (lib/freeTierOffer.ts) é DERIVADA (grant ÷ custo do filme de 15 s) e os
//      chips do trial a usam; executado, não lido;
//   3. o e-mail de boas-vindas (app/api/send-welcome/route.ts) está na paleta clara (sem #000000/#161618), usa o
//      <img> do ícone real em URL absoluta, não tem flex/grid, nem "every engine", nem "Stock footage", nem a cota
//      velha de 3 Fast/24h, e tira os números das fontes de verdade;
//   4. cada bloco tem mutante em memória que PRECISA ficar vermelho.
// Só readFileSync + typescript + vm — sem alias @/, sem rede, sem banco.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }

// ── 1. varredura da frase velha ─────────────────────────────────────────────────────────────────────────────────────
const FRASE_VELHA = /every engine unlocked|all engines unlocked/i
const TEXTO = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.txt', '.css', '.html'])
function arquivos(dir, out = []) {
  for (const nome of readdirSync(join(root, dir))) {
    if (nome === 'node_modules' || nome.startsWith('.')) continue
    const rel = `${dir}/${nome}`
    const st = statSync(join(root, rel))
    if (st.isDirectory()) arquivos(rel, out)
    else if (TEXTO.has(extname(nome))) out.push(rel)
  }
  return out
}
const varre = (conteudos) => conteudos.filter(([, txt]) => FRASE_VELHA.test(txt)).map(([f]) => f)
const todos = ['app', 'lib', 'components'].flatMap((d) => arquivos(d)).map((f) => [f, rd(f)])
console.log('1. frase velha de motores')
checa(`varredura cobre app/, lib/ e components/ (${todos.length} arquivos de texto)`, todos.length > 500)
const achados = varre(todos)
checa('nenhum arquivo promete "every engine unlocked"/"all engines unlocked"' + (achados.length ? ` — achados: ${achados.join(', ')}` : ''), achados.length === 0)
// mutantes: a varredura enxerga a frase em maiúsculas, em comentário e no e-mail
checa('mutante: frase em caixa alta num comentário fica vermelha', varre([['x.ts', '// 10 FREE CREDITS · EVERY ENGINE UNLOCKED']]).length === 1)
checa('mutante: "all engines unlocked" em JSX fica vermelho', varre([['x.tsx', '<p>Free — all engines unlocked</p>']]).length === 1)

// ── 2. frase única derivada (executada) ─────────────────────────────────────────────────────────────────────────────
console.log('2. frase única do trial')
function carrega(arquivo, sobrescritas = {}) {
  const cache = new Map()
  const load = (rel) => {
    const file = rel.endsWith('.ts') ? rel : `${rel}.ts`
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const src = sobrescritas[file] ?? rd(file)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const req = (spec) => {
      if (!spec.startsWith('.')) throw new Error(`import inesperado em ${file}: ${spec}`)
      return load(join(dirname(file), spec).replace(/\\/g, '/'))
    }
    vm.runInNewContext(js, { exports: mod.exports, module: mod, require: req, process: { env: {} }, console })
    return mod.exports
  }
  return load(arquivo)
}
const offer = carrega('lib/freeTierOffer.ts')
const cost = carrega('lib/credits/engineCost.ts')
const custo15 = cost.creditCostForDuration('cinematic_ai', true, offer.TRIAL_FREE_FILM_SECONDS)
const cobre = Math.floor(offer.TRIAL_CREDITS_SHOWN / custo15) >= 1
checa(`grant (${offer.TRIAL_CREDITS_SHOWN}) ÷ custo do filme de ${offer.TRIAL_FREE_FILM_SECONDS} s (${custo15}) cobre o primeiro filme`, cobre)
checa('TRIAL_FIRST_FILM_PHRASE = "enough for your first <s>-second AI film" (derivada)',
  offer.TRIAL_FIRST_FILM_PHRASE === `enough for your first ${offer.TRIAL_FREE_FILM_SECONDS}-second AI film`)
checa('TRIAL_FIRST_FILM_SHORT = "first AI film, <s> s"', offer.TRIAL_FIRST_FILM_SHORT === `first AI film, ${offer.TRIAL_FREE_FILM_SECONDS} s`)
const on = offer.buildFreeTierOffer(true)
checa('chip/chipLower do trial carregam a frase única', on.copy.chip.includes(offer.TRIAL_FIRST_FILM_PHRASE) && on.copy.chipLower.includes(offer.TRIAL_FIRST_FILM_PHRASE))
checa('nenhuma copy do trial (ON) promete motor que o saldo não paga', !Object.values(on.copy).some((v) => /every engine|all engines/i.test(v)))
// mutante: grant que não paga o filme → a frase deixa de prometê-lo
const semSaldo = carrega('lib/freeTierOffer.ts', {
  'lib/freeTierOffer.ts': rd('lib/freeTierOffer.ts').replace(/export const TRIAL_CREDITS_SHOWN = [^\n]+/, 'export const TRIAL_CREDITS_SHOWN = 1'),
})
checa('mutante: grant de 1 crédito → a frase não promete o filme de 15 s', !/first \d+-second AI film/.test(semSaldo.TRIAL_FIRST_FILM_PHRASE))
const entry = carrega('lib/entryPolicy.ts')
checa('FREE_ENTRY_COPY (chip/headline/sentence) sem "every engine"', !/every engine/i.test(`${entry.FREE_ENTRY_COPY.chip} ${entry.FREE_ENTRY_COPY.headline} ${entry.FREE_ENTRY_COPY.sentence}`))
checa('espelho literal da entryPolicy bate com TRIAL_FIRST_FILM_PHRASE', entry.FREE_ENTRY_COPY.headline.includes(offer.TRIAL_FIRST_FILM_PHRASE))

// ── 3. e-mail de boas-vindas ────────────────────────────────────────────────────────────────────────────────────────
console.log('3. e-mail de boas-vindas')
function auditaEmail(src) {
  const r = []
  if (/#000000|#000\b|#161618/i.test(src)) r.push('fundo preto')
  if (!/const APP_URL = 'https:\/\/www\.usekineo\.com'/.test(src) || !/const ICON_URL = `\$\{APP_URL\}\/kineo-icon-512\.png`/.test(src)) r.push('URL absoluta do ícone')
  if (!/<img src="\$\{ICON_URL\}" width="40" height="40" alt="Kineo"/.test(src)) r.push('<img> do ícone 40×40 alt Kineo')
  if (/every engine/i.test(src)) r.push('every engine')
  if (/stock footage/i.test(src)) r.push('Stock footage')
  if (/3 (watermarked )?Fast videos|FAST VIDEOS \/ 24H/i.test(src)) r.push('cota velha de Fast')
  if (/display:\s*(inline-)?flex|display:\s*grid/i.test(src)) r.push('flex/grid')
  if (/<link[^>]+stylesheet|<style/i.test(src)) r.push('CSS externo/bloco')
  for (const cor of ['#F7F7F5', '#FFFFFF', '#E3E6EC', '#0E1116', '#5A5F67', '#0A5CFF']) if (!src.includes(cor)) r.push('paleta ' + cor)
  if (!/import \{[^}]*TRIAL_CREDITS_SHOWN[^}]*TRIAL_FIRST_FILM_PHRASE[^}]*\} from '@\/lib\/freeTierOffer'/.test(src)) r.push('números de lib/freeTierOffer')
  if (!/import \{ FREE_FILM_COUNTRY_CLAUSE \} from '@\/lib\/freeFilmPolicy'/.test(src)) r.push('cláusula de país de lib/freeFilmPolicy')
  if (/\b\d+ free credits/i.test(src)) r.push('número de créditos digitado')
  if (!src.includes("'/studio/create?welcome=1'")) r.push('CTA para o dashboard')
  return r
}
const email = rd('app/api/send-welcome/route.ts')
const defeitos = auditaEmail(email)
checa('e-mail de boas-vindas limpo' + (defeitos.length ? ` — defeitos: ${defeitos.join(', ')}` : ''), defeitos.length === 0)
checa('public/kineo-icon-512.png existe (o <img> aponta para arquivo real)', existsSync(join(root, 'public', 'kineo-icon-512.png')))
checa('texto puro usa a mesma promessa (OFFER_LINE) e os mesmos bullets do HTML', /Your free start: \$\{OFFER_LINE\}/.test(email) && /\$\{BULLETS\.map\(/.test(email))
// mutantes
checa('mutante: fundo #161618 fica vermelho', auditaEmail(email.replace('background-color:#F7F7F5', 'background-color:#161618')).includes('fundo preto'))
checa('mutante: "Stock footage library" fica vermelho', auditaEmail(email.replace("'Captions and music included'", "'Stock footage library'")).includes('Stock footage'))
checa('mutante: logo em div inline-flex fica vermelho', auditaEmail(email.replace('<img src="${ICON_URL}"', '<div style="display:inline-flex;"></div><img src="x"')).length >= 2)

console.log(falhas.length ? `\nFAIL ${falhas.length} de ${ok + falhas.length}` : `\nPASS ${ok} verificações (verdade do trial + e-mail de boas-vindas)`)
process.exit(falhas.length ? 1 : 0)
