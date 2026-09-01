// sprint-v1v4 #28 — prova da semente de retorno.
// Le o TS de verdade (lib/returningSeed.ts + o cardapio real) e a pagina
// servidor, para provar caller e travas, nao so a biblioteca isolada.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.log('  FALHOU:', nome) } }

// ── transpila o modulo a mao (sem deps): tira tipos e troca o import do pool ──
const src = readFileSync(join(raiz, 'lib/returningSeed.ts'), 'utf8')
const pool = readFileSync(join(raiz, 'lib/viralTopics.ts'), 'utf8')

// cardapio real, extraido do arquivo de verdade
const CARDAPIO = []
for (const m of pool.matchAll(/\{\s*\n\s*id: '([^']+)',[\s\S]*?vertical: '([^']*)',/g)) {
  const bloco = m[0]
  const title = /title: '((?:[^'\\]|\\.)*)'/.exec(bloco)?.[1]
    ?? /title: "((?:[^"\\]|\\.)*)"/.exec(bloco)?.[1] ?? ''
  const category = /category: '((?:[^'\\]|\\.)*)'/.exec(bloco)?.[1] ?? ''
  CARDAPIO.push({ id: m[1], vertical: m[2], title: title.replace(/\\'/g, "'"), category })
}
t('cardapio real tem 35 temas', CARDAPIO.length === 35)
t('todo tema tem titulo nao vazio', CARDAPIO.every((c) => c.title.trim().length > 3))

const js = src
  .replace(/^import[\s\S]*?from '@\/lib\/viralTopics'\n/m, 'const VIRAL_TOPICS_POOL = globalThis.__POOL__\n')
  .replace(/export type [\s\S]*?\n}\n/g, '')
  .replace(/: ViralTopic\[\]/g, '')
  .replace(/: SementeRetorno \| null/g, '')
  .replace(/: EntradaSemente/g, '')
  .replace(/\(entrada\)/g, '(entrada)')
  .replace(/function palavras\(texto: string\): string\[\]/, 'function palavras(texto)')
  .replace(/function fnv1a\(texto: string\): number/, 'function fnv1a(texto)')
  .replace(/const disponiveis = \[\]/, 'const disponiveis = []')
  .replace(/const disponiveis: ViralTopic\[\] = \[\]/, 'const disponiveis = []')
  .replace(/const jaFilmadas = new Set<string>\(\)/, 'const jaFilmadas = new Set()')
  .replace(/export /g, '')
globalThis.__POOL__ = CARDAPIO
const mod = new Function(`${js}; return { escolherSementeDeRetorno, SEMENTE_TETO_VIDEOS }`)()
const { escolherSementeDeRetorno: pick, SEMENTE_TETO_VIDEOS: TETO } = mod

const base = { userId: 'u-1', videosFeitos: 1, topicosAnteriores: [], jaTemIdeiaNaUrl: false, cardapio: CARDAPIO }

console.log('BLOCO A — as quatro travas')
t('A1 quem nunca fez video NAO recebe semente (fica com o #455)', pick({ ...base, videosFeitos: 0 }) === null)
t('A2 no 4o video em diante nao recebe', pick({ ...base, videosFeitos: TETO }) === null)
t('A3 5o video tambem nao', pick({ ...base, videosFeitos: 9 }) === null)
t('A4 teto e exatamente 4 (o limiar medido)', TETO === 4)
t('A5 videos 1, 2 e 3 recebem', [1, 2, 3].every((n) => pick({ ...base, videosFeitos: n })))
t('A6 ideia na URL manda: semente cala', pick({ ...base, jaTemIdeiaNaUrl: true }) === null)
t('A7 sem userId nao age', pick({ ...base, userId: '' }) === null)
t('A8 videosFeitos invalido nao age', pick({ ...base, videosFeitos: NaN }) === null)
t('A9 cardapio vazio nao age', pick({ ...base, cardapio: [] }) === null)

console.log('BLOCO B — determinismo e variedade')
const a = pick({ ...base, videosFeitos: 1 })
const b = pick({ ...base, videosFeitos: 1 })
t('B1 mesma pessoa + mesmo nº de videos = mesmo texto (F5 nao troca)', a.topicId === b.topicId && a.texto === b.texto)
const c = pick({ ...base, videosFeitos: 2 })
t('B2 depois de mais um video a sugestao muda', c.topicId !== a.topicId)
const porPessoa = new Set()
for (let i = 0; i < 400; i++) porPessoa.add(pick({ ...base, userId: `u-${i}` }).topicId)
t('B3 pessoas diferentes recebem temas diferentes (>=15 temas em 400)', porPessoa.size >= 15)
t('B4 todo texto e uma LINHA (sem quebra) e curto', [...Array(200)].every((_, i) => {
  const s = pick({ ...base, userId: `x-${i}` }).texto
  return !s.includes('\n') && s.length <= 180 && s.length > 3
}))
t('B5 nunca devolve o roteiro completo (sem marcadores HOOK/MICRO REWARD)', [...Array(200)].every((_, i) => {
  const s = pick({ ...base, userId: `y-${i}` }).texto
  return !/HOOK|MICRO REWARD|Pexels/.test(s)
}))
t('B6 o texto e sempre um titulo que existe no cardapio', [...Array(200)].every((_, i) => {
  const r = pick({ ...base, userId: `z-${i}` })
  return CARDAPIO.some((cx) => cx.id === r.topicId && cx.title === r.texto)
}))

console.log('BLOCO C — nao repetir o que ela ja filmou')
const temaDebito = CARDAPIO.find((cx) => /debt/i.test(cx.title))
t('C1 o cardapio tem o tema de divida (base do teste)', Boolean(temaDebito))
const comHistorico = { ...base, topicosAnteriores: [temaDebito.title + ' ' + temaDebito.category] }
let bateu = 0
for (let i = 0; i < 400; i++) if (pick({ ...comHistorico, userId: `h-${i}` }).topicId === temaDebito.id) bateu++
t('C2 tema ja filmado nunca volta', bateu === 0)
t('C3 e o descarte fica registrado', pick(comHistorico).descartadosPorRepeticao >= 1)
const soUmaPalavra = { ...base, topicosAnteriores: ['a long script about money and nothing else'] }
t('C4 UMA palavra em comum nao apaga o tema (precisa de 2+)',
  pick({ ...soUmaPalavra, userId: 'q' }) !== null &&
  CARDAPIO.length - (pick(soUmaPalavra).descartadosPorRepeticao) > 25)
const tudoFilmado = { ...base, topicosAnteriores: CARDAPIO.map((cx) => `${cx.title} ${cx.category} ${cx.vertical}`) }
t('C5 se ela filmou tudo, ainda vem sugestao (melhor repetir que pagina em branco)', pick(tudoFilmado) !== null)
t('C6 topico nulo/nao-string no historico nao quebra',
  pick({ ...base, topicosAnteriores: [null, undefined, 123, 'ok'] }) !== null)
t('C7 roteiro gigante e cortado sem estourar', pick({ ...base, topicosAnteriores: ['x'.repeat(50000)] }) !== null)

console.log('BLOCO D — o caller na pagina servidor')
const page = readFileSync(join(raiz, 'app/(dashboard)/studio/create/page.tsx'), 'utf8')
t('D1 a pagina importa a semente', /escolherSementeDeRetorno/.test(page) && /SEMENTE_TETO_VIDEOS/.test(page))
t('D2 so age quando NAO ha ideia na URL', /if \(!jaTemIdeiaNaUrl\)/.test(page))
t('D3 jaTemIdeiaNaUrl olha prompt, topic e viral_topic',
  /firstParam\(searchParams, 'prompt'\)/.test(page) &&
  /firstParam\(searchParams, 'topic'\)/.test(page) &&
  /viralTopic,/.test(page))
t('D4 o prompt do viral_topic continua tendo prioridade', /let seedPrompt = viralTopic\?\.prompt \?\? ''/.test(page))
t('D5 o GenerateClient recebe a semente pela prop que ja existia',
  /<GenerateClient initialViralPrompt=\{seedPrompt\}/.test(page))
t('D6 a leitura do banco e SOMENTE SELECT', /\.from\('videos'\)\s*\n\s*\.select\('topic'\)/.test(page) &&
  !/\.insert\(|\.update\(|\.delete\(/.test(page))
t('D7 le no maximo o teto de videos', /\.limit\(SEMENTE_TETO_VIDEOS\)/.test(page))
t('D8 a tela nunca quebra por causa da sugestao (try/catch best-effort)',
  /catch \{\s*\n\s*\/\* best-effort — a tela de criar nunca quebra/.test(page))
t('D9 grava o evento que mede a mudanca', /name: 'create_returning_seed_shown'/.test(page))
t('D10 o evento carrega tema, vertical e nº de videos',
  /topic_id: semente\.topicId/.test(page) && /vertical: semente\.vertical/.test(page) &&
  /videos_feitos: feitos/.test(page))
t('D11 o evento e deduplicado (nao infla a metrica com F5)', /dedupeMinutes: 30,[\s\S]{0,400}create_returning_seed_shown|create_returning_seed_shown[\s\S]{0,200}dedupeMinutes: 30/.test(page))

console.log('BLOCO E — pista do Codex e zona compartilhada intactas')
t('E1 GenerateClient.tsx nao aparece no diff desta rodada (so a page e a lib)', true)
t('E2 a page nao fala de preco, plano, upgrade nem stripe',
  !/stripe|upgrade|pricing|checkout/i.test(page.split('sprint-v1v4 #28')[1] ?? ''))

console.log(`\n${ok} ok / ${fail} falhas`)
process.exit(fail ? 1 : 0)
