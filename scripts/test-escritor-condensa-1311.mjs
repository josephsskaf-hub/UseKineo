// KINEO-ESCRITOR-CONDENSA-1311 — guardião da 3ª tentativa "condensar" do escritor (app/api/generate-script + lib/escritorCondensa.ts).
// Prova, EXECUTANDO a regra pura: só filme curto, nunca com conteúdo barrado, só com tempo no maxDuration de 60 s; o tema é o embrulho
// "Condense this whole story…" do caminho do servidor. E, na rota: a 3ª tentativa vem ANTES da recusa, só com a moderação aprovando (reusa
// a da 2ª tentativa ou modera de novo), recusa do modelo nunca vira roteiro, e a recusa de verdade continua lá depois. Mutantes.
// Rodar: node scripts/test-escritor-condensa-1311.mjs
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/escritorCondensa.ts', ROTA = 'app/api/generate-script/route.ts'
function carregar(src) {
  const mod = { exports: {} }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', js)((id) => {
    if (id === '@/lib/meta95/ideiaNoEscritor') return { temaParaOEscritor: ({ ideia, seconds }) => ideia.split(/\s+/).length >= 45 ? { condensada: true, tema: `Condense this whole story into a ${seconds}-second film of at most 40 spoken words — keep its beginning, its key facts and its ending; never cut it off midway:\n[${ideia}]` } : { condensada: false, tema: ideia } }
    throw new Error('import inesperado: ' + id)
  }, mod, mod.exports)
  return mod.exports
}

function bateria(lib, rota) {
  const p = []
  const check = (n, fn) => { try { fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const L = carregar(lib)
  check('só filme curto, sem conteúdo barrado, com texto', () => {
    if (!L.tentaCondensar({ conteudoBarrado: false, filmeCurto: true, topic: 'Les secrets de Madinina' })) throw new Error('não tentou o caso de hoje')
    if (L.tentaCondensar({ conteudoBarrado: true, filmeCurto: true, topic: 'x' })) throw new Error('tentou com conteúdo barrado')
    if (L.tentaCondensar({ conteudoBarrado: false, filmeCurto: false, topic: 'x' })) throw new Error('tentou fora do filme curto')
    if (L.tentaCondensar({ conteudoBarrado: false, filmeCurto: true, topic: '   ' })) throw new Error('tentou sem texto')
  })
  check('cabe no maxDuration', () => {
    if (L.prazoDaTerceiraTentativa(3_000, 35_000) !== 35_000) throw new Error('caso de hoje (3 s gastos) sem prazo cheio')
    if (L.prazoDaTerceiraTentativa(30_000, 35_000) !== 25_000) throw new Error('prazo não encolhe com o tempo gasto')
    if (L.prazoDaTerceiraTentativa(45_000, 35_000) !== null) throw new Error('tentou sem tempo (estouraria os 60 s)')
  })
  check('tema = embrulho "condensar" do servidor', () => {
    const longo = L.temaCondensado({ topic: Array(60).fill('palavra').join(' '), seconds: 15 })
    if (!/^Condense this whole story into a 15-second film of at most 40/.test(longo)) throw new Error('longo: ' + longo.slice(0, 60))
    const curto = L.temaCondensado({ topic: 'um [segredo] curto', seconds: 15 })
    if (!/^Condense this whole story into a 15-second film — /.test(curto) || /\[segredo\]/.test(curto) || !/\n\[um segredo curto\]$/.test(curto)) throw new Error('curto: ' + curto)
  })
  const r = rota.replace(/\/\/[^\n]*/g, '')
  const ini = r.indexOf('if (historiaAceita === null && tentaCondensar(')
  const recusa = r.indexOf("reason: 'model_refused_topic'")
  const bloco = ini >= 0 ? r.slice(ini, recusa) : ''
  check('na rota: 3ª tentativa antes da recusa', () => {
    if (ini < 0 || recusa < 0 || ini > recusa) throw new Error('bloco fora do lugar')
    if (r.indexOf('const moderacao = await moderateContent(') > ini) throw new Error('antes da moderação da 2ª tentativa')
  })
  check('na rota: só com moderação aprovando', () => {
    if (!/moderacaoAprovou = moderacao\.ok/.test(r)) throw new Error('não guarda a moderação da 2ª tentativa')
    if (!/const aprovado = moderacaoAprovou \?\? \(await moderateContent\(/.test(bloco)) throw new Error('não modera quando a 2ª não moderou')
    if (!/if \(!aprovado\) \{\s*await rastroCondensa\('skipped'/.test(bloco)) throw new Error('sem a trava da moderação')
  })
  check('na rota: recusa do modelo nunca vira roteiro; prazo respeitado; tema condensado', () => {
    if (!/if \(texto && !looksLikeModelRefusal\(texto\)\) historiaAceita = texto/.test(bloco)) throw new Error('aceita recusa como roteiro')
    if (!/if \(prazo === null\)/.test(bloco) || !/timeout: prazo/.test(bloco)) throw new Error('sem prazo')
    if (!/temaCondensado\(\{ topic, seconds: alvoSegundos/.test(bloco)) throw new Error('sem o tema condensado')
    if (!/ESCRITOR_CONDENSA_EVENT/.test(bloco)) throw new Error('sem rastro')
  })
  return p
}

const lib = lf(LIB), rota = lf(ROTA)
const real = bateria(lib, rota)
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['tenta com conteúdo barrado', lib.replace('return !a.conteudoBarrado && a.filmeCurto', 'return a.filmeCurto'), rota],
  ['tenta fora do filme curto', lib.replace('!a.conteudoBarrado && a.filmeCurto &&', '!a.conteudoBarrado &&'), rota],
  ['sem checar o tempo', lib.replace('return resta >= PRAZO_MINIMO_MS ?', 'return true ?'), rota],
  ['rota sem a trava da moderação', lib, rota.replace("          if (!aprovado) {\n            await rastroCondensa('skipped'", "          if (false) {\n            await rastroCondensa('skipped'")],
  ['rota aceita recusa como roteiro', lib, rota.replace('if (texto && !looksLikeModelRefusal(texto)) historiaAceita = texto', 'if (texto) historiaAceita = texto')],
]
let mortos = 0
for (const [n, l, r] of mutantes) {
  if (l === lib && r === rota) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if (bateria(l, r).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS escritor condensa: 3ª tentativa só em filme curto, com moderação aprovando e tempo no maxDuration, antes da recusa; recusa do modelo nunca vira roteiro; ${mortos}/${mutantes.length} mutantes mortos`)
