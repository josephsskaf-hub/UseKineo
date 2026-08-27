// KINEO — a vitrine nao pode mentir o custo (2026-08-27).
//
// Nasceu de um defeito visto pelo fundador no produto: a home dizia "Free"
// para o Kineo 1 e a tela de geracao cobrava 5 creditos. Promessa quebrada na
// porta de entrada — o tipo de coisa que tira credibilidade antes da venda.
//
// Zero rede, zero banco.
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
function acharTsc(base) {
  let dir = base
  for (let i = 0; i < 6; i++) {
    const t = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(t)) return t
    const pai = dirname(dir); if (pai === dir) break; dir = pai
  }
  console.error('typescript nao encontrado'); process.exit(1)
}
const out = mkdtempSync(join(tmpdir(), 'kineo-vitrine-'))
mkdirSync(join(out, 'src'), { recursive: true })
writeFileSync(join(out, 'src', 'engineCost.ts'), readFileSync(join(raiz, 'lib/credits/engineCost.ts'), 'utf8'))
execFileSync(process.execPath, [acharTsc(raiz), join(out, 'src', 'engineCost.ts'),
  '--outDir', join(out, 'o'), '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'], { stdio: 'pipe' })
writeFileSync(join(out, 'o', 'package.json'), JSON.stringify({ type: 'commonjs' }))
const EC = createRequire(join(out, 'x.cjs'))(join(out, 'o', 'engineCost.js'))

let total = 0, falhas = 0
const checa = (n, ok, d = '') => { total++; if (!ok) { falhas++; console.log(`  x ${n}${d ? ` — ${d}` : ''}`) } }

console.log('\nKINEO — credito da vitrine\n')

const landing = readFileSync(join(raiz, 'app/KineoLanding.tsx'), 'utf8')
const semComentarios = landing.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')

// 1. NENHUMA etiqueta de credito escrita a mao na vitrine.
const chumbados = semComentarios.match(/<span className="tcredits">(?!\{)[^<]*<\/span>/g) ?? []
checa('nenhuma etiqueta de credito chumbada', chumbados.length === 0, JSON.stringify(chumbados))

// 2. Todas derivam de creditCostFor via o helper.
const derivadas = semComentarios.match(/<span className="tcredits">\{creditLabel\('([a-z_0-9]+)'\)\}<\/span>/g) ?? []
checa('as 6 etiquetas de motor sao derivadas', derivadas.length === 6, `achei ${derivadas.length}`)
checa('a landing importa a fonte canonica de custo',
  /import \{ creditCostFor \} from '@\/lib\/credits\/engineCost'/.test(semComentarios))

// 3. O DEFEITO ESPECIFICO: "Free" nunca mais como etiqueta do Kineo 1.
checa('Kineo 1 nao e mais anunciado como "Free" na etiqueta',
  !/tcredits">Free/.test(semComentarios))
checa('e o mega-menu tambem parou de dizer "free"',
  !/Kineo’s own engine — free/.test(semComentarios))

// 4. Cada motor citado existe e tem custo > 0 na fonte canonica.
for (const m of derivadas) {
  const q = m.match(/creditLabel\('([a-z_0-9]+)'\)/)[1]
  const custo = EC.creditCostFor(q, true)
  checa(`${q}: custo real > 0 (${custo} cr)`, Number.isFinite(custo) && custo > 0, String(custo))
}

// 5. O CUSTO ESCALA COM A DURACAO — a razao do "4" que parecia erro no admin.
{
  const esperado = { 30: 3, 45: 4, 60: 5, 90: 8 }
  for (const [seg, cr] of Object.entries(esperado)) {
    const real = EC.creditCostForDuration('fast', true, Number(seg))
    checa(`Kineo 1 em ${seg}s custa ${cr} creditos`, real === cr, `real=${real}`)
  }
  checa('logo: ver "4" sozinho no admin nao e erro de cobranca, e um pedido de 45s',
    EC.creditCostForDuration('fast', true, 45) === 4)
}

// 6. O admin passou a mostrar custo E duracao juntos.
{
  const rota = readFileSync(join(raiz, 'app/api/admin/person-media/route.ts'), 'utf8')
  const tela = readFileSync(join(raiz, 'app/admin/people/PeopleClient.tsx'), 'utf8')
  checa('a rota do admin devolve os creditos', /credits: v\.credits_used/.test(rota))
  checa('a rota do admin devolve a duracao', /seconds: v\.duration \?\? null/.test(rota))
  checa('usa `duration` (preenchida) e nao `duration_seconds` (NULL em 248/248)',
    /created_at, credits_used, duration'\)/.test(rota))
  checa('a tela mostra os creditos', /\$\{v\.credits\} cr/.test(tela))
  checa('a tela mostra a duracao ao lado', /\$\{v\.seconds\}s/.test(tela))
}

console.log(falhas === 0
  ? `\n${total} VERIFICACOES OK — a vitrine diz o mesmo numero que o caixa cobra.\n`
  : `\n${falhas} FALHAS em ${total} verificacoes.\n`)
process.exit(falhas === 0 ? 0 : 1)
