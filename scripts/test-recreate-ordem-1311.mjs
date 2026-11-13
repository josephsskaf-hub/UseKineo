// KINEO-RECREATE-ORDEM-1311 [dono 13/11: "Todo recreate que a gente comprar ou fizer tem que vir na lista por ordem na página dos
// templates"] — guardião sem rede e sem custo. Trava: (1) todo modelo do catálogo tem `desde` (AAAA-MM-DD, data real); (2) a data é a
// da história do git, nunca chute: troca = 1º commit que pôs o id em lib/recreate/formats.ts; efeito = o dia mais tardio entre o
// nascimento do catálogo (1º commit com o mapeamento dos efeitos) e o 1º commit com o pôster do efeito em lib/clips/clipEffects.ts;
// modelo ainda sem commit = hoje; (3) RECREATE_FORMATS, a grade pública e a grade logada (visibleRecreateFormats) do mais novo para o
// mais antigo; no mesmo dia, a ordem em que o catálogo foi escrito (estável); (4) mutantes: troca sem data, efeito novo sem data, data
// chutada, ordem invertida, ordenação removida, desempate instável, grade pública reordenada — todos vermelhos.
// Uso: node scripts/test-recreate-ordem-1311.mjs
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const FORMATS = 'lib/recreate/formats.ts'
const PUBLICO = 'lib/recreate/catalogPublic.ts'
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 << 20 }).trim()
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const primeiroDia = (busca, arquivo) => git('log', '--reverse', '--format=%ad', '--date=short', '-S' + busca, '--', arquivo).split('\n')[0] || null
const DIA_RX = /^\d{4}-\d{2}-\d{2}$/

// A história real, calculada uma vez (o mutante não reescreve o git).
const NASCIMENTO = primeiroDia('CLIP_EFFECTS.filter(e => e.preview', FORMATS)
const memo = new Map()
const historia = (f) => {
  if (memo.has(f.id)) return memo.get(f.id)
  let d
  if (f.type === 'swap') d = primeiroDia(`id: '${f.id}'`, FORMATS) ?? hoje
  else {
    const poster = primeiroDia(f.poster.replace(/^\/posters\//, '/posters/') + "'", 'lib/clips/clipEffects.ts') ?? hoje
    d = [NASCIMENTO, poster].sort().at(-1)
  }
  memo.set(f.id, d)
  return d
}

const crescente = (lista) => lista.findIndex((f, i) => i > 0 && lista[i - 1].desde < f.desde)

function problemas(mut = {}) {
  const p = []
  const L = createOfflineLoader({ source: (rel, t) => (mut[rel.replace(/\\/g, '/')] ? mut[rel.replace(/\\/g, '/')](t) : t) })
  const F = L(FORMATS), C = L(PUBLICO), A = L('lib/recreate/access.ts'), I = L('lib/internalAccounts.ts'), E = L('lib/clips/clipEffects.ts')
  const todos = F.RECREATE_FORMATS
  // (1) todo modelo tem data válida
  for (const f of todos) {
    if (typeof f.desde !== 'string' || !DIA_RX.test(f.desde) || Number.isNaN(Date.parse(f.desde + 'T12:00:00Z'))) { p.push(`(1) ${f.id} sem data de entrada (desde=${JSON.stringify(f.desde)})`); continue }
    if (f.desde > hoje) p.push(`(1) ${f.id} entra no futuro (${f.desde})`)
  }
  if (p.length) return p
  // (2) a data é a da história
  if (!NASCIMENTO) p.push('(2) não achei no git o nascimento do catálogo')
  for (const f of todos) { const h = historia(f); if (f.desde !== h) p.push(`(2) ${f.id}: desde ${f.desde}, a história diz ${h}`) }
  // (3) ordem
  const i = crescente(todos)
  if (i > 0) p.push(`(3) catálogo fora de ordem: ${todos[i - 1].id} (${todos[i - 1].desde}) antes de ${todos[i].id} (${todos[i].desde})`)
  const pub = C.publicRecreateCatalog().map((x) => todos.find((f) => f.id === x.id))
  const j = crescente(pub)
  if (j > 0) p.push(`(3) grade pública fora de ordem: ${pub[j - 1].id} antes de ${pub[j].id}`)
  const casa = I.INTERNAL_EXACT_EMAILS?.[0]
  if (casa) { const k = crescente(A.visibleRecreateFormats(casa)); if (k > 0) p.push('(3) grade logada fora de ordem') }
  // desempate estável: efeitos do mesmo dia na ordem de CLIP_EFFECTS; trocas do mesmo dia na ordem em que foram escritas
  const efeitos = todos.filter((f) => f.type === 'effect')
  const ordemEfeitos = E.CLIP_EFFECTS.filter((e) => e.preview?.poster).map((e) => `effect-${e.key.replaceAll('_', '-')}`)
  const dias = [...new Set(efeitos.map((f) => f.desde))]
  for (const d of dias) {
    const a = efeitos.filter((f) => f.desde === d).map((f) => f.id), b = ordemEfeitos.filter((id) => a.includes(id))
    if (JSON.stringify(a) !== JSON.stringify(b)) p.push(`(3) efeitos de ${d} fora da ordem de CLIP_EFFECTS (desempate instável)`)
  }
  const ids = todos.map((f) => f.id)
  if (ids.indexOf('sueter-aconchegante') > ids.indexOf('selfie-confete')) p.push('(3) desempate instável nas trocas de 13/11')
  if (ids.indexOf('passarela') > ids.indexOf('escolha-o-favorito')) p.push('(3) desempate instável nas trocas de 10/11')
  // função de ordem num caso sintético (estável e decrescente)
  const s = F.recreateNewestFirst([{ id: 'a', desde: '2026-01-01' }, { id: 'b', desde: '2026-03-01' }, { id: 'c', desde: '2026-01-01' }, { id: 'd', desde: '2026-03-01' }]).map((x) => x.id).join('')
  if (s !== 'bdac') p.push(`(3) recreateNewestFirst sintético = ${s}, esperado bdac`)
  return p
}

const atual = problemas()
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
const L0 = createOfflineLoader()
const pub = L0(PUBLICO).publicRecreateCatalog().map((x) => x.id)
console.log(`ok  estado atual: ${L0(FORMATS).RECREATE_FORMATS.length} modelos datados pela história; grade pública começa por ${pub.slice(0, 4).join(', ')}`)
let ok = 1, falhas = 0
const troca = (de, para) => (t) => t.replace(de, para)
const MUTANTES = [
  ['M1 troca nova sem data', { [FORMATS]: troca("title: 'Selfie with the crowd', desde: '2026-11-13', ", "title: 'Selfie with the crowd', ") }],
  ['M2 efeito novo sem data', { [FORMATS]: troca("hug: '2026-11-09', kiss: '2026-11-09',", "hug: '2026-11-09',") }],
  ['M3 data chutada', { [FORMATS]: troca("title: 'Cozy sweater flip', desde: '2026-11-13'", "title: 'Cozy sweater flip', desde: '2026-11-12'") }],
  ['M4 ordem invertida', { [FORMATS]: troca('(a.f.desde < b.f.desde ? 1 : a.f.desde > b.f.desde ? -1 : a.i - b.i)', '(a.f.desde < b.f.desde ? -1 : a.f.desde > b.f.desde ? 1 : a.i - b.i)') }],
  ['M5 ordenação removida', { [FORMATS]: troca('= recreateNewestFirst(RECREATE_CATALOG)', '= RECREATE_CATALOG') }],
  ['M6 desempate instável', { [FORMATS]: troca(': a.i - b.i))', ': b.i - a.i))') }],
  ['M7 grade pública reordenada', { [PUBLICO]: troca('return recreateNewestFirst(RECREATE_FORMATS.filter(f => publicRecreatePath(f.id) !== null)).map(', 'return [...RECREATE_FORMATS.filter(f => publicRecreatePath(f.id) !== null)].reverse().map(') }],
]
const L1 = (await import('node:fs')).readFileSync
for (const [nome, mut] of MUTANTES) {
  const alvo = Object.entries(mut).every(([arq, fn]) => { const t = L1(arq, 'utf8'); return fn(t) !== t })
  if (!alvo) { console.log(`FALHA ${nome}: alvo não encontrado`); falhas++; continue }
  const m = problemas(mut)
  if (!m.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++; continue }
  console.log(`ok  ${nome}: vermelho (${m[0]})`); ok++
}
console.log(`${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
