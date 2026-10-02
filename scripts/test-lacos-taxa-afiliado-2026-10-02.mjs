// KINEO-LACOS-TAXA-2026-10-02 — guardião (laços C1): a taxa de afiliado tem UMA fonte e nenhum texto de UI a digita.
// Achado: o menu lateral dizia "Affiliate — 40%" com a comissão em 30% desde 09/09 (lib/affiliateCommission.ts), e o
// cartão de momento do afiliado e a carta para pagantes (send-hotlead-blast) prometiam "40%". A taxa agora é
// AFFILIATE_COMMISSION_PCT em todo texto; este guardião varre app/, components/ e lib/ procurando a taxa (atual ou
// antiga) digitada perto de palavra de afiliado/comissão, fora de comentário. Exceções são nomeadas, com o motivo e com
// prova própria. Inclui mutantes. Estilo readFileSync + transpile (módulo puro).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const C = load(read('lib/affiliateCommission.ts'))
const PCT = C.AFFILIATE_COMMISSION_PCT
ok(PCT === `${Math.round(C.AFFILIATE_COMMISSION_RATE * 100)}%`, `fonte única: AFFILIATE_COMMISSION_PCT = ${PCT} derivado da taxa`)

// A taxa atual e a antiga (40%, morta em 09/09). Digitar qualquer uma delas num texto de afiliado é o defeito.
const NUMS = [...new Set([PCT.replace('%', ''), '40', '30'])]
const RATE_RE = new RegExp(`\\b(${NUMS.join('|')}) ?%`)
const CONTEXT_RE = /affiliat|commission|recurring|partner|referral|of every payment|on eligible|of eligible|of each eligible/i

/** Remove comentários (bloco, JSX e de linha). `//` só conta quando vem depois de início/espaço — URL tem `:` antes. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|\s)\/\/.*$/gm, '$1')
}

/** Linhas que digitam a taxa num contexto de afiliado. */
function typedRateHits(src) {
  const hits = []
  stripComments(src).split('\n').forEach((line, i) => {
    if (RATE_RE.test(line) && CONTEXT_RE.test(line)) hits.push({ line: i + 1, text: line.trim().slice(0, 140) })
  })
  return hits
}

// Exceções NOMEADAS — cada uma com motivo e prova abaixo; nenhuma é silenciosa.
const EXCEPTIONS = {
  // Módulo puro SEM import por contrato (scripts/test-affiliate-program-comparison.mjs o executa e lança em import);
  // a linha da Kineo é amarrada à fonte pela prova "comparação = fonte" abaixo.
  'lib/growth/affiliateProgramComparison.ts': 'puro sem import; amarrado à fonte por prova própria',
  // Outra sessão é dona do rodapé nesta rodada (02/10). O rótulo também é CHAVE dos dicionários lib/ui/interface*.
  // Pendente na integração: trocar por `Affiliate program - ${AFFILIATE_COMMISSION_PCT} recurring`.
  'components/Footer.tsx': 'dono = outra sessão (02/10); só o rótulo com a taxa ATUAL é tolerado',
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(rel, out) }
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel.split(path.sep).join('/'))
  }
  return out
}
// lib/ui/interface* são dicionários de tradução: a chave é o texto inglês do rodapé, não uma segunda fonte.
const SKIP = (f) => f === 'lib/affiliateCommission.ts' || /^lib\/ui\/interface/.test(f)
const files = [...walk('app'), ...walk('components'), ...walk('lib')].filter((f) => !SKIP(f))
const offenders = []
for (const f of files) {
  const hits = typedRateHits(read(f))
  if (!hits.length) continue
  if (f === 'components/Footer.tsx') {
    const bad = hits.filter((h) => !h.text.includes(`'Affiliate program - ${PCT} recurring'`))
    if (bad.length) offenders.push(...bad.map((h) => `${f}:${h.line} ${h.text}`))
    continue
  }
  if (EXCEPTIONS[f]) continue
  offenders.push(...hits.map((h) => `${f}:${h.line} ${h.text}`))
}
ok(offenders.length === 0, `nenhum texto de UI digita a taxa de afiliado (${files.length} arquivos varridos)${offenders.length ? '\n        ' + offenders.join('\n        ') : ''}`)

console.log('== a fonte chega aos textos ==')
const usa = (f, re) => re.test(read(f)) && /from '@\/lib\/affiliateCommission'/.test(read(f)) && /AFFILIATE_COMMISSION_PCT/.test(read(f))
ok(usa('components/Sidebar.tsx', /label=\{`Affiliate — \$\{AFFILIATE_COMMISSION_PCT\}`\}/), 'menu lateral: "Affiliate — <taxa>" derivado (era "40%")')
ok(!/label="Affiliate — \d+%"/.test(read('components/Sidebar.tsx')), 'menu lateral: nenhum rótulo com número digitado')
ok(usa('components/AffiliateMomentumCard.tsx', /earn \$\{AFFILIATE_COMMISSION_PCT\} on eligible subscription payments/), 'cartão de momento: promessa derivada (era "40%")')
ok(usa('app/(dashboard)/affiliate/page.tsx', /earn \{AFFILIATE_COMMISSION_PCT\} recurring/), 'painel do afiliado: título e texto derivados')
ok(usa('app/partners/page.tsx', /Earn \{AFFILIATE_COMMISSION_PCT\} Recurring<\/h1>/) && /title: `AI Video Affiliate Program — \$\{AFFILIATE_COMMISSION_PCT\} Recurring/.test(read('app/partners/page.tsx')), '/partners: título, metadados e CTAs derivados')
ok(usa('app/api/admin/send-hotlead-blast/route.ts', /pays <b>\$\{AFFILIATE_COMMISSION_PCT\} of every payment, recurring<\/b>/) && /`Want \$\{AFFILIATE_COMMISSION_PCT\} of every referral, forever\?`/.test(read('app/api/admin/send-hotlead-blast/route.ts')), 'carta aos pagantes: assunto e corpo derivados (era "40%")')
ok(!/label: 'Affiliate — /.test(read('components/MobileNav.tsx')), 'MobileNav: o par mostra "Affiliate" sem número (nada a derivar)')

console.log('== exceções provadas ==')
const comparison = load(read('lib/growth/affiliateProgramComparison.ts'))
const kineoRow = comparison.AFFILIATE_PROGRAM_COMPARISON.find((r) => r.kineo)
ok(kineoRow && kineoRow.commission === `${PCT} recurring`, `comparação = fonte: a linha da Kineo diz "${PCT} recurring"`)
ok(/'Affiliate program - \d+% recurring'/.test(read('components/Footer.tsx')) ? read('components/Footer.tsx').includes(`'Affiliate program - ${PCT} recurring'`) : true, 'rodapé (pendente de integração) não diverge da taxa atual')

console.log('== mutantes ==')
const sidebar = read('components/Sidebar.tsx')
const mutSidebar = sidebar.replace('label={`Affiliate — ${AFFILIATE_COMMISSION_PCT}`}', 'label="Affiliate — 40%"')
ok(mutSidebar !== sidebar && typedRateHits(mutSidebar).length > 0, 'mutante: "Affiliate — 40%" de volta no menu é pego')
const card = read('components/AffiliateMomentumCard.tsx')
const mutCard = card.replace('earn ${AFFILIATE_COMMISSION_PCT} on eligible', `earn ${PCT} on eligible`)
ok(mutCard !== card && typedRateHits(mutCard).length > 0, 'mutante: a taxa ATUAL digitada no cartão também é pega (fonte única, não só "40%")')
const mutComment = sidebar.replace('label={`Affiliate — ${AFFILIATE_COMMISSION_PCT}`}', 'label={`Affiliate — ${AFFILIATE_COMMISSION_PCT}`} /* era 40% recurring */')
ok(typedRateHits(mutComment).length === typedRateHits(sidebar).length, 'controle: comentário que cita a taxa antiga não é falso positivo')
const mutUrl = "const u = 'https://x.com/affiliate' // 40% recurring"
ok(typedRateHits(mutUrl).length === 0, 'controle: URL com // não é tratada como comentário e comentário de linha é ignorado')

console.log(`\n  ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
