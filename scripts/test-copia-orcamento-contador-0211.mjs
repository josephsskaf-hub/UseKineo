// KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — guardião dos dois consertos da auditoria ao vivo de 02/11 (usekineo.com):
//   A. "The promotion has a shared US$100 daily fal budget" aparecia no /pricing, /studio e /ai-video-generator/kling-4 —
//      nome do fornecedor e orçamento da casa na cara do cliente, nas 16 línguas. Agora: "while today's capacity lasts".
//   B. Contadores de prova social se contradiziam (home 2,144 x 2,778 na mesma página; rodapé dos motores "0 Shorts created ·
//      0 this week · 0 accounts joined"; /pricing com uma terceira régua). Agora UMA leitura (lib/publicStatsServer.ts) e UMA
//      regra de exibição (lib/publicStats.ts); zero, indefinido ou abaixo do piso = nada na tela; sem contagem animada do zero.
// Roda offline: `node scripts/test-copia-orcamento-contador-0211.mjs` da raiz do repo. Cada regra tem mutante que precisa cair.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { root, offlineModules } from './gpt24h-offline-support.mjs'

const MARCA = 'KINEO-COPIA-ORCAMENTO-CONTADOR-0211'
const COPY = 'lib/ui/refinementCopy.json'
const K4 = 'lib/kling4PaidPresentation.ts'
const LIB = 'lib/publicStats.ts'
const SERVER = 'lib/publicStatsServer.ts'
const BADGE = 'components/LiveStatsBadge.tsx'
const BAND = 'components/LiveStatsBand.tsx'
const PROOF = 'components/checkout/ValorNoCheckout.tsx'
const STATS_ROUTE = 'app/api/stats/public/route.ts'
const FILMS_ROUTE = 'app/api/films-made/route.ts'
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const NEW_CAP = 'Free Kling 4.0 runs while today’s capacity lasts. When it is used up, regular credits apply; we tell you before you confirm.'

const read = (rel) => readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n')
const SRC = Object.fromEntries([COPY, K4, LIB, SERVER, BADGE, BAND, PROOF, STATS_ROUTE, FILMS_ROUTE].map((rel) => [rel, read(rel)]))

// Toda string de código de cliente (app/, components/, lib/) — comentários fora — para varrer a frase do orçamento.
function walk(dir, out = []) {
  for (const name of readdirSync(resolve(root, dir))) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const rel = join(dir, name).replace(/\\/g, '/')
    const st = statSync(resolve(root, rel))
    if (st.isDirectory()) walk(rel, out)
    else if (/\.(tsx?|json)$/.test(name)) out.push(rel)
  }
  return out
}
const CUSTOMER_FILES = ['app', 'components', 'lib'].flatMap((d) => walk(d)).filter((f) => !f.startsWith('app/api/') && !f.startsWith('app/admin') && !f.startsWith('app/(dashboard)/admin'))
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
const BUDGET_RE = /(orçamento|presupuesto|budget|budżet|бюджет)[^"'`\n]{0,20}\bfal\b|\bfal\b[^"'`\n]{0,40}\b(budget|bütçe|budżet|Budget|бюджет|بجٹ|ميزانية|बजट|anggaran|ngân sách|orçamento|presupuesto)|(daily|global|shared)[^"'`\n]{0,20}\bfal\b|US\$ ?100 (daily|per day)/iu
const LONE_FAL_RE = /(^|[^\p{L}\-_/.@])fal(?![\p{L}\-_./:])/iu

function problems(replacements = {}) {
  const p = []
  const src = (rel) => replacements[rel] ?? SRC[rel]

  // ── A. a frase do orçamento ──────────────────────────────────────────────────────────────────────────────────────────
  let dict
  try { dict = JSON.parse(src(COPY)) } catch (e) { return ['refinementCopy.json não é JSON: ' + e.message] }
  for (const lang of LANGS) {
    const table = dict[lang]
    if (!table) { p.push(`língua ${lang} sumiu do dicionário`); continue }
    for (const [k, v] of Object.entries(table)) {
      if (BUDGET_RE.test(k) || BUDGET_RE.test(String(v))) p.push(`A ${lang}: frase de orçamento do fornecedor: ${String(v).slice(0, 80)}`)
      else if (LONE_FAL_RE.test(String(v)) || LONE_FAL_RE.test(k)) p.push(`A ${lang}: "fal" na cara do cliente: ${String(v).slice(0, 80)}`)
    }
    const cap = table[NEW_CAP]
    if (typeof cap !== 'string' || !cap.trim()) p.push(`A ${lang}: linha neutra da capacidade sem tradução`)
    else if (lang !== 'en' && cap === NEW_CAP) p.push(`A ${lang}: linha neutra ficou em inglês`)
    else if (lang === 'en' && cap !== NEW_CAP) p.push('A en: tradução inglesa ≠ chave')
  }
  const k4 = src(K4)
  if (!k4.includes(`cap: '${NEW_CAP}'`)) p.push('A: KLING4_PAID_COPY.cap não é a linha neutra (a chave do dicionário não casa)')
  for (const f of CUSTOMER_FILES) {
    const s = stripComments(replacements[f] ?? (SRC[f] ?? read(f)))
    if (/daily fal budget|fal budget|orçamento fal|presupuesto fal/i.test(s)) p.push(`A: orçamento do fornecedor em ${f}`)
  }

  // ── B. a régua única dos contadores ──────────────────────────────────────────────────────────────────────────────────
  let lib
  try { lib = offlineModules({ replacements })(LIB) } catch (e) { return [...p, 'publicStats carrega: ' + String(e && e.message)] }
  const full = { ok: true, films: 2778, films7d: 123, films30d: 479, creators30d: 424, accounts: 3151 }
  const s = lib.parsePublicStats(full)
  if (!s || s.films !== 2778 || s.accounts !== 3151) p.push('B: parse da resposta boa falhou')
  if (lib.publicStatsBadgeLine(s) !== '2,778 Shorts created · 123 this week · 3,151 accounts joined') p.push(`B: selo: ${lib.publicStatsBadgeLine(s)}`)
  const band = lib.publicStatsBandItems(s)
  if (band.length !== 3 || band[0].n !== '2,778' || band[1].n !== '123' || band[2].n !== '3,151') p.push('B: faixa não diz os MESMOS números do selo')
  const zeros = { ok: true, films: 0, films7d: 0, films30d: 0, creators30d: 0, accounts: 0 }
  if (lib.publicStatsBadgeLine(lib.parsePublicStats(zeros)) !== null) p.push('B: selo pinta zeros')
  if (lib.publicStatsBandItems(lib.parsePublicStats(zeros)).length !== 0) p.push('B: faixa pinta zeros')
  for (const bad of [undefined, null, {}, { ok: false }, { ok: true }, { ...full, films: undefined }, { ...full, accounts: -1 }, { ...full, films7d: 'x' }, { ...full, ok: false }])
    if (lib.parsePublicStats(bad) !== null || lib.publicStatsBadgeLine(lib.parsePublicStats(bad)) !== null) p.push(`B: resposta ruim virou número: ${JSON.stringify(bad)}`)
  const low = lib.parsePublicStats({ ok: true, films: 2778, films7d: 0, films30d: 0, creators30d: 0, accounts: 3151 })
  if (/\b0 this week/.test(lib.publicStatsBadgeLine(low) ?? '')) p.push('B: "0 this week" apareceu')
  for (const item of lib.publicStatsItems(low)) if (item.n <= 0) p.push('B: item com zero')
  const thinWeek = lib.parsePublicStats({ ok: true, films: 2778, films7d: 50, films30d: 200, creators30d: 150, accounts: 3151 })
  if (lib.publicStatsBadgeLine(thinWeek) !== '2,778 Shorts created · 3,151 accounts joined') p.push(`B: semana abaixo do piso apareceu: ${lib.publicStatsBadgeLine(thinWeek)}`)
  const small = lib.parsePublicStats({ ok: true, films: 40, films7d: 3, films30d: 10, creators30d: 4, accounts: 12 })
  if (lib.publicStatsBadgeLine(small) !== null || lib.publicStatsBandItems(small).length !== 0) p.push('B: número abaixo do piso apareceu')

  // fiação: todo contador lê a mesma rota pela mesma régua, e as duas rotas pela mesma leitura
  for (const [rel, fn] of [[BADGE, 'publicStatsBadgeLine'], [BAND, 'publicStatsBandItems'], [PROOF, 'parsePublicStats']]) {
    const c = src(rel)
    if (!c.includes("from '@/lib/publicStats'") || !c.includes('fetch(PUBLIC_STATS_ENDPOINT)') || !c.includes(fn)) p.push(`B: ${rel} fora da régua única`)
    if (/['"`]\/api\/(stats\/public|films-made)['"`]/.test(stripComments(c))) p.push(`B: ${rel} chama rota de contagem por conta própria`)
    if (/requestAnimationFrame|setT\(/.test(stripComments(c))) p.push(`B: ${rel} voltou a animar a contagem a partir do zero`)
    if (/MIN_TOTAL_VIDEOS|MIN_CREATORS|toLocaleString/.test(stripComments(c))) p.push(`B: ${rel} tem piso/formato próprio`)
  }
  if (!/if \(!label\) return null/.test(src(BADGE))) p.push('B: selo não some sem linha')
  if (!/if \(items\.length < 2\) return null/.test(src(BAND))) p.push('B: faixa não some com menos de 2 números')
  if (!src(PROOF).includes('filmsMadeLine({ films: s.films30d, creators: s.creators30d })')) p.push('B: /pricing fora da janela de 30 dias da régua')
  for (const rel of [STATS_ROUTE, FILMS_ROUTE]) {
    const r = stripComments(src(rel))
    if (!r.includes('await readPublicStats()') || !r.includes("from '@/lib/publicStatsServer'")) p.push(`B: ${rel} não usa a leitura única`)
    if (/\.from\(|createServiceClient|count: 'exact'/.test(r)) p.push(`B: ${rel} conta por conta própria`)
  }
  const server = stripComments(src(SERVER))
  if (!server.includes("eq('status', 'completed')")) p.push('B: leitura conta filme que falhou')
  if (!server.includes('!internal.has(r.user_id)') || !server.includes('profiles.data.length - internal.size')) p.push('B: leitura conta a casa')
  if (!/readAll<[^>]*>\(\s*\(\) => admin\.from\('videos'\)/.test(server) || !/readAll<[^>]*>\(\s*\(\) => admin\.from\('profiles'\)/.test(server)) p.push('B: leitura sem paginação (corte de 1000)')
  if (!src(SERVER).includes(MARCA) || !src(LIB).includes(MARCA)) p.push('marca ausente')
  return p
}

let failed = 0
const base = problems()
console.log(base.length === 0 ? 'PASS copia-orcamento-contador (frase neutra nas 16 línguas, régua única, sem zeros)' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  const s = SRC[rel]
  if (!s.includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from}`)
  return { [rel]: s.replace(from, to) }
}
const ptLine = JSON.parse(SRC[COPY]).pt[NEW_CAP]
const MUTANTES = [
  ['orçamento volta ao pt', muta(COPY, JSON.stringify(ptLine), JSON.stringify('A promoção tem um orçamento fal global de US$ 100 por dia.'))],
  ['"fal" volta numa frase qualquer', muta(COPY, JSON.stringify(ptLine), JSON.stringify('Feito com a fal, grátis.'))],
  ['de sem tradução', muta(COPY, JSON.stringify(JSON.parse(SRC[COPY]).de[NEW_CAP]), JSON.stringify(NEW_CAP))],
  ['cap volta ao orçamento', muta(K4, `cap: '${NEW_CAP}'`, "cap: 'The promotion has a shared US$100 daily fal budget.'")],
  ['selo sem piso de semana', muta(LIB, 'if (stats.films7d >= MIN_WEEKLY)', 'if (stats.films7d >= 0)')],
  ['piso da semana zerado e sem o filtro de zero', { [LIB]: SRC[LIB].replace('return items.filter((i) => i.n > 0)', 'return items').replace('export const MIN_WEEKLY = 100', 'export const MIN_WEEKLY = 0') }],
  ['parse aceita campo faltando', muta(LIB, 'for (const k of KEYS) if (!whole(v[k])) return null', '')],
  ['selo volta a animar do zero', muta(BADGE, 'setLabel(publicStatsBadgeLine(parsePublicStats(raw)))', 'setLabel(publicStatsBadgeLine(parsePublicStats(raw))); requestAnimationFrame(() => {})')],
  ['faixa volta à rota própria', muta(BAND, 'fetch(PUBLIC_STATS_ENDPOINT)', "fetch('/api/stats/public')")],
  ['pricing volta ao films-made', muta(PROOF, 'fetch(PUBLIC_STATS_ENDPOINT)', "fetch('/api/films-made')")],
  ['rota pública conta sozinha', muta(STATS_ROUTE, 'const stats = await readPublicStats()', "const stats = await readPublicStats(); void admin.from('videos')")],
  ['leitura conta falha', muta(SERVER, ".eq('status', 'completed')", '')],
  ['leitura conta a casa', muta(SERVER, '!internal.has(r.user_id)', 'true')],
]
for (const [nome, repl] of MUTANTES) {
  const r = problems(repl)
  console.log(`${r.length ? 'PASS' : 'FAIL'} mutante "${nome}" ${r.length ? 'pego' : 'NÃO pego'}${r.length ? ' — ' + r[0] : ''}`)
  if (!r.length) failed++
}
if (failed) { console.log(`${failed} falha(s)`); process.exit(1) }
console.log(`OK — ${MUTANTES.length} mutantes pegos`)
