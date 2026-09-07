// KINEO-TEMPORADA-SONDA-2026-09-07 (gpt-loja #12) — guardião da sonda da faixa
// "Your season" (components/video/SeasonStrip.tsx).
//
// O QUE ELE PROVA (e por que do jeito que prova):
//   1. O `videoId` viaja na QUERY STRING do POST /api/season — porque a rota lê
//      `req.nextUrl.searchParams.get('videoId')` e nunca chama `req.json()`.
//      A expressão real do `qs` e do template da URL são EXTRAÍDAS do arquivo e
//      EXECUTADAS numa tabela (memória `guardiao-contar-texto-nao-prova-condicao`).
//   2. O corpo `body: JSON.stringify(videoId ? { videoId } : {})` NÃO mudou.
//   3. `season_absent` sai nos QUATRO ramos de desistência — provado executando
//      o bloco async real com um `fetch` falso, ramo a ramo.
//   4. `season_served` dispara no efeito do `data`, uma vez (servedRef), ANTES do
//      IntersectionObserver; `season_shown` continua atrás de `>= 0.35`.
//   5. Telemetria nova dentro de try/catch; arquivo sem preço; rota ainda lê a
//      query (se a outra pista consertar a rota, o check da rota avisa que o
//      MOTIVO da mudança 1 mudou).
//
// Roda com: node scripts/test-temporada-sonda.mjs — Node puro, sem alias, sem
// React, sem dependências. Sai 1 se qualquer verificação falhar.

import { readFileSync } from 'node:fs'

const strip = readFileSync(new URL('../components/video/SeasonStrip.tsx', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/api/season/route.ts', import.meta.url), 'utf8')

let passes = 0
let falhas = 0
function check(descricao, condicao) {
  const ok = Boolean(condicao)
  if (ok) passes++
  else falhas++
  console.log(`${ok ? '✓' : '✗'} ${descricao}`)
  return ok
}
function secao(titulo) {
  console.log(`\n── ${titulo}`)
}
/** Executa `fn`; devolve o valor ou `undefined` (nunca lança) para o check ler. */
function tenta(fn) {
  try {
    return fn()
  } catch {
    return undefined
  }
}
/** Tira anotações TS simples (`x as Tipo`) de um trecho extraído para o Node executar. */
function semTipos(js) {
  // Só o nome do tipo — `\s` aqui já comeu uma quebra de linha e o `if` seguinte
  // uma vez, e o bloco inteiro virou erro de sintaxe (9 checks vermelhos).
  return js.replace(/\)\s+as\s+[A-Za-z_]\w*/g, ')')
}

// ───────────────────────────────────────────────────────────────────────────
secao('A · arquivo e marcador')
check('SeasonStrip.tsx lido e não vazio', strip.length > 1000)
check(
  'marcador KINEO-TEMPORADA-SONDA-2026-09-07 aparece ao menos 2× (cabeçalho dos eventos + fetch)',
  (strip.match(/KINEO-TEMPORADA-SONDA-2026-09-07/g) ?? []).length >= 2,
)

// ───────────────────────────────────────────────────────────────────────────
secao('B · qs e URL — expressão real extraída e executada')
const qsMatch = strip.match(/^\s*const qs = (.+)$/m)
const qsExpr = qsMatch?.[1]?.trim()
const fetchMatch = strip.match(/fetch\((`[^`]*`)\s*,/)
const urlTpl = fetchMatch?.[1]

check('`const qs = …` extraída do arquivo', Boolean(qsExpr))
check('template da URL do fetch extraído e interpola `${qs}`', Boolean(urlTpl) && urlTpl.includes('${qs}'))

const montarUrl = (videoId, enc = encodeURIComponent) =>
  tenta(() => {
    const qs = new Function('videoId', 'encodeURIComponent', `return (${qsExpr})`)(videoId, enc)
    return new Function('qs', `return ${urlTpl}`)(qs)
  })

const tabela = [
  ['abc-123', '/api/season?videoId=abc-123', 'id presente → `?videoId=<id>`'],
  [null, '/api/season', 'videoId null → exatamente `/api/season`, sem `?`'],
  ['', '/api/season', 'videoId vazio ("") → sem query (falsy)'],
  ['a b/c', '/api/season?videoId=a%20b%2Fc', 'id com espaço e barra → escapado (`a%20b%2Fc`)'],
  ['x&y=1', '/api/season?videoId=x%26y%3D1', 'id com `&` e `=` não injeta parâmetro (`%26`/`%3D`)'],
]
for (const [id, esperado, rotulo] of tabela) {
  const got = montarUrl(id)
  check(`${rotulo}  →  ${JSON.stringify(got)}`, got === esperado)
}
{
  // Espião: prova que a expressão de fato CHAMA encodeURIComponent com o id —
  // interpolação crua produziria a mesma saída para ids "limpos".
  const chamadas = []
  const spy = (v) => {
    chamadas.push(v)
    return `ENC(${v})`
  }
  const got = montarUrl('a b/c', spy)
  check(
    'encodeURIComponent é chamado com o próprio id (espião), não interpolação crua',
    chamadas.length === 1 && chamadas[0] === 'a b/c' && got === '/api/season?videoId=ENC(a b/c)',
  )
}

// ───────────────────────────────────────────────────────────────────────────
secao('C · corpo e opções do fetch — mudança aditiva')
check(
  'corpo intacto: `body: JSON.stringify(videoId ? { videoId } : {})`',
  strip.includes('body: JSON.stringify(videoId ? { videoId } : {}),'),
)
{
  const fetchOpts = tenta(() => strip.slice(strip.indexOf('fetch(`/api/season'), strip.indexOf('if (!res.ok)')))
  check(
    'opções do fetch intactas: POST · Content-Type json · same-origin · no-store',
    Boolean(fetchOpts) &&
      fetchOpts.includes("method: 'POST'") &&
      fetchOpts.includes("'Content-Type': 'application/json'") &&
      fetchOpts.includes("credentials: 'same-origin'") &&
      fetchOpts.includes("cache: 'no-store'"),
  )
}

// ───────────────────────────────────────────────────────────────────────────
secao('D · reportarAusencia — função real extraída e executada')
const fnMatch = strip.match(/function reportarAusencia\(([^)]*)\)[^{]*\{([\s\S]*?)\n\}/)
const reportar = tenta(() => {
  const params = fnMatch[1].split(',').map((p) => p.split(':')[0].trim())
  return new Function(...params, semTipos(fnMatch[2]))
})
check('função reportarAusencia extraída (3 parâmetros: onEvent, motivo, status)', typeof reportar === 'function')
{
  const eventos = []
  tenta(() => reportar((n, m) => eventos.push([n, m]), 'http_not_ok', 503))
  check(
    "emite `season_absent` com { reason, http_status }",
    eventos.length === 1 &&
      eventos[0][0] === 'season_absent' &&
      eventos[0][1]?.reason === 'http_not_ok' &&
      eventos[0][1]?.http_status === 503,
  )
  let lancou = false
  try {
    reportar(() => {
      throw new Error('rastreador quebrado')
    }, 'excecao', null)
  } catch {
    lancou = true
  }
  check('onEvent que LANÇA não derruba (try/catch dentro da função)', lancou === false)
  let lancouUndef = false
  try {
    reportar(undefined, 'sem_temporada', 200)
  } catch {
    lancouUndef = true
  }
  check('onEvent undefined não derruba (`onEvent?.`)', lancouUndef === false)
}
check(
  'corpo de reportarAusencia começa em try { … } catch',
  Boolean(fnMatch) && /^\s*try \{[\s\S]*\} catch \{/.test(fnMatch[2]),
)

// ───────────────────────────────────────────────────────────────────────────
secao('E · os quatro ramos de desistência — bloco async REAL com fetch falso')
const ini = strip.indexOf('void (async () => {')
const fim = strip.indexOf('})()', ini)
const blocoAsync = ini >= 0 && fim > ini ? strip.slice(ini + 'void ('.length, fim + 1) : null
check('bloco `void (async () => { … })()` do fetch extraído', Boolean(blocoAsync))

/**
 * Executa o bloco real com o ambiente que ele enxerga no componente:
 * fetch, reportarAusencia (a real, extraída acima), setData, onEvent, videoId,
 * cancelled. Devolve o que aconteceu.
 */
async function rodarBloco({ fetchImpl, videoId = 'vid-1', cancelled = false }) {
  const eventos = []
  const setDataChamadas = []
  const onEvent = (n, m) => eventos.push([n, m])
  const runner = new Function(
    'fetch',
    'reportarAusencia',
    'setData',
    'onEvent',
    'videoId',
    'cancelled',
    `return (${semTipos(blocoAsync)})()`,
  )
  await runner(fetchImpl, reportar, (p) => setDataChamadas.push(p), onEvent, videoId, cancelled)
  return { eventos, setDataChamadas }
}
const resposta = (status, json) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => json })
const absent = (r) => r.eventos.filter((e) => e[0] === 'season_absent')

if (blocoAsync && typeof reportar === 'function') {
  const r1 = await rodarBloco({ fetchImpl: resposta(500, {}) }).catch(() => null)
  check(
    'HTTP 500 → season_absent { reason: http_not_ok, http_status: 500 } e setData NÃO chamado',
    r1 &&
      absent(r1).length === 1 &&
      absent(r1)[0][1].reason === 'http_not_ok' &&
      absent(r1)[0][1].http_status === 500 &&
      r1.setDataChamadas.length === 0,
  )
  const r2 = await rodarBloco({ fetchImpl: resposta(200, { season: null, balance: 0 }) }).catch(() => null)
  check(
    '200 sem temporada → season_absent { reason: sem_temporada, http_status: 200 }',
    r2 && absent(r2).length === 1 && absent(r2)[0][1].reason === 'sem_temporada' && absent(r2)[0][1].http_status === 200 && r2.setDataChamadas.length === 0,
  )
  const r3 = await rodarBloco({
    fetchImpl: resposta(200, { season: { fromVideoId: 'vid-1', fromTitle: 't', episodes: [] }, balance: 0 }),
  }).catch(() => null)
  check(
    '200 com episodes [] → season_absent { reason: zero_episodios }',
    r3 && absent(r3).length === 1 && absent(r3)[0][1].reason === 'zero_episodios' && r3.setDataChamadas.length === 0,
  )
  const r4 = await rodarBloco({
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch')
    },
  }).catch(() => null)
  check(
    'fetch lança → season_absent { reason: excecao, http_status: null } e o bloco NÃO propaga o erro',
    r4 && absent(r4).length === 1 && absent(r4)[0][1].reason === 'excecao' && absent(r4)[0][1].http_status === null,
  )
  const payloadBom = { season: { fromVideoId: 'vid-1', fromTitle: 't', episodes: [{ n: 2, title: 'x', seed: 's', cost: 5, affordable: true }] }, balance: 10, episodeCost: 5, affordableEpisodes: 2 }
  const r5 = await rodarBloco({ fetchImpl: resposta(200, payloadBom) }).catch(() => null)
  check(
    'caminho feliz → setData(payload) e ZERO season_absent',
    r5 && absent(r5).length === 0 && r5.setDataChamadas.length === 1 && r5.setDataChamadas[0] === payloadBom,
  )
  const r6 = await rodarBloco({ fetchImpl: resposta(200, payloadBom), cancelled: true }).catch(() => null)
  check(
    'efeito cancelado (unmount) → nem setData nem season_absent',
    r6 && absent(r6).length === 0 && r6.setDataChamadas.length === 0,
  )
  const r7 = await rodarBloco({
    fetchImpl: async () => {
      throw new Error('x')
    },
    cancelled: true,
  }).catch(() => null)
  check('exceção com efeito cancelado → sem season_absent (não reporta tela que já morreu)', r7 && absent(r7).length === 0)
  {
    // O bloco REAL chama o fetch com a query E o corpo — os dois lugares.
    let url = null
    let init = null
    await rodarBloco({
      videoId: 'a b/c',
      fetchImpl: async (u, i) => {
        url = u
        init = i
        return { ok: true, status: 200, json: async () => payloadBom }
      },
    }).catch(() => null)
    check(
      'no bloco real: fetch("/api/season?videoId=a%20b%2Fc") E body {"videoId":"a b/c"} — id nos DOIS lugares',
      url === '/api/season?videoId=a%20b%2Fc' && init?.method === 'POST' && init?.body === JSON.stringify({ videoId: 'a b/c' }),
    )
    let url2 = null
    await rodarBloco({
      videoId: null,
      fetchImpl: async (u) => {
        url2 = u
        return { ok: true, status: 200, json: async () => payloadBom }
      },
    }).catch(() => null)
    check('no bloco real: videoId null → fetch("/api/season") sem query', url2 === '/api/season')
  }
} else {
  for (let i = 0; i < 9; i++) check('bloco async não extraído — ramo não executado', false)
}

// Os quatro literais de motivo existem, cada um como argumento de reportarAusencia.
for (const motivo of ['http_not_ok', 'sem_temporada', 'zero_episodios', 'excecao']) {
  const re = new RegExp(`reportarAusencia\\(onEvent, '${motivo}', `)
  check(`literal de motivo '${motivo}' passado a reportarAusencia`, re.test(strip))
}

// ───────────────────────────────────────────────────────────────────────────
secao('F · season_served — efeito do data, uma vez, antes do observer')
check('servedRef declarado como useRef(false)', /const servedRef = useRef\(false\)/.test(strip))
const servedGuard = /if \(!servedRef\.current\) \{\s*servedRef\.current = true\s*try \{\s*onEvent\?\.\('season_served',/
check('emissão guardada: `if (!servedRef.current) { servedRef.current = true; try { onEvent?.(season_served…`', servedGuard.test(strip))
check(
  'season_served dentro de try { … } catch { }',
  /try \{\s*onEvent\?\.\('season_served',[\s\S]*?\}\)\s*\} catch \{/.test(strip),
)
{
  const idxServed = strip.indexOf("'season_served'")
  const idxEffect = strip.lastIndexOf('useEffect(() => {', idxServed)
  const depsMatch = idxServed >= 0 && idxEffect >= 0 ? strip.slice(idxServed).match(/\n\s*\}, (\[[^\]]*\])\)/) : null
  check(
    `season_served vive no useEffect cujas deps são [data] (lidas: ${depsMatch?.[1] ?? 'n/a'})`,
    depsMatch?.[1] === '[data]' && idxEffect > strip.indexOf('}, [videoId])'),
  )
  const idxIO = strip.indexOf('new IntersectionObserver(')
  check('season_served é emitido ANTES de montar o IntersectionObserver', idxServed >= 0 && idxIO > idxServed)
  const meta = tenta(() => strip.slice(idxServed, strip.indexOf('})', idxServed)))
  check(
    'meta do season_served: episodes · affordable_episodes · asked_video_id',
    Boolean(meta) && meta.includes('episodes: eps.length') && meta.includes('affordable_episodes: data.affordableEpisodes') && meta.includes('asked_video_id: videoId ?? null'),
  )
  check("primeiro `'season_served'` do arquivo é o único (uma emissão, um lugar)", (strip.match(/'season_served'/g) ?? []).length === 1)
}

// ───────────────────────────────────────────────────────────────────────────
secao('G · season_shown — predicado real do observer extraído e executado')
const predMatch = strip.match(/if \((entry\.[^)]*)\) \{\s*marcarVisto\(\)/)
const pred = tenta(() => new Function('entry', `return (${predMatch[1]})`))
check(`predicado extraído: ${predMatch?.[1] ?? 'NÃO ENCONTRADO'}`, typeof pred === 'function')
const casosIO = [
  [{ isIntersecting: true, intersectionRatio: 0.35 }, true, 'ratio 0.35 visível → dispara'],
  [{ isIntersecting: true, intersectionRatio: 1 }, true, 'ratio 1 → dispara'],
  [{ isIntersecting: true, intersectionRatio: 0.34 }, false, 'ratio 0.34 → NÃO dispara'],
  [{ isIntersecting: true, intersectionRatio: 0.1 }, false, 'ratio 0.1 (um pixel na tela) → NÃO dispara'],
  [{ isIntersecting: false, intersectionRatio: 1 }, false, 'isIntersecting false → NÃO dispara'],
]
for (const [entry, esperado, rotulo] of casosIO) {
  const got = tenta(() => pred(entry))
  check(`${rotulo} (got ${got})`, got === esperado)
}
check('threshold do observer inclui 0.35', /threshold: \[[^\]]*0\.35[^\]]*\]/.test(strip))
check(
  'season_shown só via marcarVisto, guardado por seenRef (uma vez)',
  /const marcarVisto = \(\) => \{\s*if \(seenRef\.current\) return\s*seenRef\.current = true[\s\S]*?onEvent\?\.\('season_shown',/.test(strip) &&
    (strip.match(/'season_shown'/g) ?? []).length === 1,
)

// ───────────────────────────────────────────────────────────────────────────
secao('H · sem preço')
check('nenhum `$` seguido de dígito (ex.: $9.90)', !/\$\s?\d/.test(strip))
check('nenhum literal USD / dollar(s) / R$', !/\bUSD\b|\bdollars?\b|R\$/i.test(strip))
check(
  'custo exibido vem PRONTO da rota (`${ep.cost} cr`); nenhum "N cr" digitado no arquivo',
  strip.includes('`${ep.cost} cr`') && !/\b\d+ cr\b/.test(strip),
)

// ───────────────────────────────────────────────────────────────────────────
secao('I · a razão de existir da mudança 1 — a rota lê a QUERY')
check("app/api/season/route.ts lê `req.nextUrl.searchParams.get('videoId')`", route.includes("req.nextUrl.searchParams.get('videoId')"))
check(
  'a rota NUNCA chama req.json() / req.text() / req.formData() — se isto ficar vermelho, a outra pista passou a ler o corpo e o MOTIVO da query mudou (o guardião precisa de revisão, não o componente)',
  !/\breq(?:uest)?\.(?:json|text|formData)\(/.test(route),
)
check("o id da query é o que seleciona o filme: `.eq('id', pedido)`", /const pedido = req\.nextUrl\.searchParams\.get\('videoId'\)[\s\S]*?\.eq\('id', pedido\)/.test(route))

// ───────────────────────────────────────────────────────────────────────────
console.log(`\n${passes} passaram · ${falhas} falharam · ${passes + falhas} verificações`)
process.exit(falhas ? 1 : 0)
