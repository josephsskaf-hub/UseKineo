// KINEO-EPISODIO2-NO-ASSUNTO-2026-10-13 [TRAVA 8.2 — vai do fundador 13/10 'tudo sim' (episódio 2 no assunto)]
//
// O DEFEITO, medido em produção (`events.next_episode_written`, 13/10): o episódio 2 que /api/next-episode
// escreve saía sobre OUTRO assunto — Milo, a caixinha de leite → "The Last Pizza Slice"; Mila no Rainbow
// Valley → "The Whispering Forest"; dinossauro dançarino → "The Great Jellyfish Migration"; janela redonda de
// avião → "The Secret of Honey's Longevity"; Lumi e Pipo (PT) → "The Ocean's Mysterious Abyss".
// CAUSA: o `sistema` da rota mandava "a different story in the same subject area" e "Same curiosity, new
// subject", num "knowledge/curiosity channel" com "no invented people". O EPISODE 1 chegava certo; a ORDEM é
// que mandava sair dele.
//
// ESTE GUARDIÃO EXECUTA A ROTA DE VERDADE, OFFLINE: transpila app/api/next-episode/route.ts e os módulos puros
// que ela usa (lib/episodeContinuity.ts, nextEpisodeMarkers, nextEpisodeMemoria, textLanguage, seriesContinuation)
// com Supabase e OpenAI FALSOS — o `fetch` falso grava o prompt que iria para o escritor. Nada sai para a rede.
// Fixtures = textos REAIS dos filmes de origem (encurtados), lidos em produção em 13/10.
//
// MUTANTES (cada um prova que se aplicou antes de exigir o vermelho):
//   M1 devolve a FONTE ANTIGA do desvio (o `sistema` de antes: "new subject");
//   M2 tira o assunto do prompt (o bloco de continuidade some);
//   M3 alimenta a âncora com o "ALREADY COVERED" (outro filme) em vez do filme de origem;
//   M4 a lib ignora a narração real e a âncora volta a ser a ordem crua com andaime.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(join(raiz, 'package.json'))('typescript')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const ROTA = 'app/api/next-episode/route.ts'
const LIB = 'lib/episodeContinuity.ts'
const MARCA = 'KINEO-EPISODIO2-NO-ASSUNTO-2026-10-13'

let total = 0
const falhasTopo = []
const secao = (t) => console.log(`\n── ${t}`)

function transpilar(caminho, fonte, mocks) {
  const out = ts.transpileModule(fonte, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: caminho,
  }).outputText
  const mod = { exports: {} }
  const req = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${caminho}: import inesperado ${id}`)
  }
  new Function('require', 'module', 'exports', out)(req, mod, mod.exports)
  return mod.exports
}

// ── Fixtures reais (textos de origem de 13/10, encurtados) ───────────────────
const U = (n) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`
const V = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`
const OUTRO_FILME = 'The Dancing Plague of 1518 in Strasbourg' // filme ANTERIOR da mesma pessoa (vai em ALREADY COVERED)

const CASOS = [
  {
    nome: 'Milo, a caixinha de leite (antes: "The Last Pizza Slice")',
    antigo: 'pizza',
    topic: 'Generate a continuous visual story with CONSISTENT characters throughout the entire video.\n\nEvery shot must look like part of the same animated movie.\n\nDo not randomly change character design, colors, size, clothing, or environment.\n\nThe story must be understandable even WITHOUT narration.\n\nA tiny cute blue milk carton named MILO.\n\nHe has small arms and legs, huge expressive brown eyes, tiny white sneakers, and a slightly crushed corner on the top of his carton.',
    script: "Nobody wanted Milo, the tiny blue milk carton, as he stood all alone on the supermarket's bottom shelf, surrounded by mocking glass bottles that towered above him. As customers happily picked the expensive glass bottles, Milo remained alone on the shelf.",
    previousTopic: '',
    precisa: [/Milo/i, /milk carton/i],
    formato: 'story',
  },
  {
    nome: 'Mila no Rainbow Valley (antes: "The Whispering Forest")',
    antigo: 'Whispering Forest',
    topic: 'A little girl named Mila, with turquoise hair and a star-shaped yellow backpack, enters Rainbow Valley, where the grass glows like neon and the clouds resemble animals. Suddenly, the ground gently trembles, and a mini vortex of light opens before Mila.',
    script: 'In Rainbow Valley, Mila, with her turquoise hair and star-shaped backpack, discovers a world where the grass glows like neon. Suddenly, a dazzling mini vortex of brilliant light opens up, revealing Skoczuś, a pastel-colored creature.',
    previousTopic: '',
    precisa: [/Mila/, /Rainbow Valley/],
    formato: 'story',
  },
  {
    nome: 'dinossauro dançarino, user 791e1703, 12/10 (antes: "The Great Jellyfish Migration")',
    antigo: 'jellyfish',
    topic: 'Concept: A little dinosaur hears music and starts dancing. It tries to stop, but the music keeps coming back.\n\n"STOP! Dinosaur, don\'t dance! 😂"\n\nSequence: 3 increasingly funny dance moves.\n\nDuration: 10–20 seconds.',
    script: null,
    previousTopic: '',
    precisa: [/little dinosaur/i, /dancing/i],
    formato: 'story',
  },
  {
    nome: 'janela redonda de avião (antes: "The Secret of Honey\'s Longevity")',
    antigo: 'honey',
    topic: 'Explore the surprising reason why airplane windows are round: a design choice born from past crashes that enhances safety and structural integrity.',
    script: "Two tragic crashes exposed a critical design flaw in the square airplane windows used in the aircraft's construction. This significant development resulted in a groundbreaking design change that would transform aviation safety.",
    previousTopic: '',
    precisa: [/airplane windows/i],
    formato: 'same as episode 1',
  },
  {
    nome: 'Lumi e Pipo, história infantil em PT (antes: "The Ocean\'s Mysterious Abyss")',
    antigo: 'Mariana',
    topic: 'Era uma vez Lumi e Pipo, dois amigos muito curiosos que decidiram aprender a contar até dez em inglês.\n\nDurante o passeio, Lumi encontrou o número 1 e descobriu que em inglês se fala ONE.',
    script: 'Era uma vez Lumi e Pipo, dois amigos muito curiosos, que decidiram aprender a contar até dez em inglês. Durante o passeio, Lumi encontrou o número 1.',
    previousTopic: '',
    precisa: [/Lumi e Pipo/],
    formato: 'story',
  },
  {
    nome: 'cliente manda a narração (sem fromVideoId): porta das 3:17',
    antigo: 'echo',
    topic: null,
    script: null,
    previousTopic: 'Every night at 3:17 AM, an abandoned house door opens by itself. Nobody lives there. For years, people ignored it. Then one man recorded it.',
    precisa: [/3:17 AM/, /abandoned house door/],
    formato: 'same as episode 1',
    semId: true,
  },
]

function fakeSupabase(linhas) {
  const builder = () => {
    const q = { eqs: [], single: false, limit: null, count: null }
    const self = {
      select: (_c, o) => { q.count = o?.count ?? null; return self },
      eq: (c, v) => { q.eqs.push([c, v]); return self },
      order: () => self,
      limit: (n) => { q.limit = n; return self },
      maybeSingle: () => { q.single = true; return self },
      then: (resolve) => {
        let rows = linhas.filter((r) => q.eqs.every(([c, v]) => r[c] === v))
        rows = rows.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        const n = rows.length
        if (q.single) return resolve({ data: rows[0] ?? null, error: null })
        if (q.limit) rows = rows.slice(0, q.limit)
        return resolve({ data: rows, error: null, count: q.count ? n : null })
      },
    }
    return self
  }
  return (uid) => ({ auth: { getUser: async () => ({ data: { user: { id: uid } } }) }, from: () => builder() })
}

const RESPOSTA = `TITLE: Next Episode
HOOK
Something happened next that nobody expected at all.
MICRO REWARD
It started small, with one quiet moment that changed the day.
ESCALATION
Then it grew, and grew, until everyone could see it clearly now.
PAYOFF
And that is how the loop finally closed, right where it began.`

delete process.env.SUPABASE_SERVICE_ROLE_KEY
delete process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.OPENAI_API_KEY = 'test-key-offline'
let capturado = null
globalThis.fetch = async (url, init) => {
  if (!String(url).includes('api.openai.com')) throw new Error('rede proibida: ' + url)
  capturado = JSON.parse(init.body)
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: RESPOSTA } }] }) }
}
const consoleOriginal = { warn: console.warn, info: console.info, error: console.error }

/** Carrega a rota (com as fontes dadas) e roda a bateria. Devolve as falhas. */
async function bateria(fonteRota, fonteLib, { silencioso = false } = {}) {
  const falhas = []
  const checa = (rotulo, cond) => {
    total += 1
    if (!cond) { falhas.push(rotulo); if (!silencioso) console.error('  x ' + rotulo) } else if (!silencioso) console.log('  ok ' + rotulo)
  }
  const puros = {
    '@/lib/seriesContinuation': transpilar('lib/seriesContinuation.ts', ler('lib/seriesContinuation.ts'), {}),
    '@/lib/nextEpisodeMarkers': transpilar('lib/nextEpisodeMarkers.ts', ler('lib/nextEpisodeMarkers.ts'), {}),
    '@/lib/nextEpisodeMemoria': transpilar('lib/nextEpisodeMemoria.ts', ler('lib/nextEpisodeMemoria.ts'), {}),
    '@/lib/textLanguage': transpilar('lib/textLanguage.ts', ler('lib/textLanguage.ts'), {}),
    '@/lib/episodeContinuity': transpilar(LIB, fonteLib, {}),
  }
  let supabaseDe = null
  let uidAtual = null
  const NextResponse = { json: (body, init) => ({ status: init?.status ?? 200, body }) }
  const rota = transpilar(ROTA, fonteRota, {
    'next/server': { NextRequest: class {}, NextResponse },
    '@supabase/supabase-js': { createClient: () => { throw new Error('service key proibida no teste') } },
    '@/lib/supabase/server': { createClient: () => supabaseDe(uidAtual) },
    ...puros,
  })
  console.warn = () => {}; console.info = () => {}; console.error = () => {}
  const resultados = []
  try {
    let seq = 0
    for (const c of CASOS) {
      seq += 1
      uidAtual = U(seq)
      const linhas = [
        { id: V(seq), user_id: uidAtual, status: 'completed', created_at: '2026-10-12T17:00:00Z', title: (c.topic ?? '').slice(0, 120), topic: c.topic, script: c.script },
        { id: V(seq + 100), user_id: uidAtual, status: 'completed', created_at: '2026-10-11T12:00:00Z', title: OUTRO_FILME, topic: OUTRO_FILME, script: 'In July 1518, a woman stepped onto a street in Strasbourg and began to dance.' },
      ]
      supabaseDe = fakeSupabase(linhas)
      capturado = null
      const corpo = { previousTopic: c.previousTopic, language: 'en', ...(c.semId ? {} : { fromVideoId: V(seq) }) }
      const res = await rota.POST({ json: async () => corpo })
      resultados.push({ c, res, sistema: capturado?.messages?.[0]?.content ?? '', prompt: capturado?.messages?.[1]?.content ?? '' })
    }
    // Fallback: filme sem assunto utilizável → prompt de antes, byte a byte, e o episódio sai igual.
    uidAtual = U(99)
    supabaseDe = fakeSupabase([])
    capturado = null
    const resFallback = await rota.POST({ json: async () => ({ previousTopic: 'ok', language: 'en' }) })
    resultados.push({ fallback: true, res: resFallback, prompt: capturado?.messages?.[1]?.content ?? '' })
  } finally {
    Object.assign(console, consoleOriginal)
  }

  for (const r of resultados) {
    if (r.fallback) {
      if (!silencioso) console.log('  · fallback (previousTopic "ok", sem filme)')
      checa('fallback: 200 com roteiro (nunca vazio/quebrado)', r.res.status === 200 && typeof r.res.body?.script === 'string' && r.res.body.script.length > 40)
      checa('fallback: sem âncora o prompt é o de antes, byte a byte', r.prompt === 'EPISODE 1 (just produced):\nok\n\n\n\nWrite EPISODE 2.')
      continue
    }
    const { c, res, sistema, prompt } = r
    if (!silencioso) console.log(`  · ${c.nome}`)
    const linhaAssunto = (prompt.match(/^SUBJECT TO CONTINUE \(stay on it\): (.*)$/m) ?? [])[1] ?? ''
    const linhaFormato = (prompt.match(/^FORMAT: (.*)$/m) ?? [])[1] ?? ''
    checa(`[${c.nome}] 200 e o escritor foi chamado`, res.status === 200 && Boolean(prompt))
    checa(`[${c.nome}] o prompt traz a linha SUBJECT TO CONTINUE`, linhaAssunto.length >= 12)
    for (const re of c.precisa) checa(`[${c.nome}] a âncora carrega ${re}`, re.test(linhaAssunto))
    checa(`[${c.nome}] a âncora NÃO puxa o outro filme da pessoa (${OUTRO_FILME.slice(0, 22)}…)`, !/Dancing Plague|Strasbourg/i.test(linhaAssunto))
    checa(`[${c.nome}] a âncora não carrega andaime ("Generate a continuous", "Duration:", "[Pexels")`, !/Generate a continuous|Duration:|\[Pexels|Every shot must/i.test(linhaAssunto))
    checa(`[${c.nome}] a âncora não fala do episódio 2 antigo ("${c.antigo}")`, !new RegExp(c.antigo, 'i').test(linhaAssunto))
    checa(`[${c.nome}] FORMAT = ${c.formato}`, linhaFormato.toLowerCase().includes(c.formato))
    checa(`[${c.nome}] o assunto vem DEPOIS do EPISODE 1 e ANTES do "Write EPISODE"`, prompt.indexOf('EPISODE 1 (just produced):') < prompt.indexOf('SUBJECT TO CONTINUE') && prompt.indexOf('SUBJECT TO CONTINUE') < prompt.indexOf('Write EPISODE'))
    checa(`[${c.nome}] sistema manda CONTINUAR (mesmo assunto, mesmos personagens)`, /same subject, same characters, same world/.test(sistema) && /STAY ON THE SUBJECT/.test(sistema) && /Never switch to an unrelated topic/.test(sistema))
    checa(`[${c.nome}] sistema não manda trocar de assunto`, !/new subject|DIFFERENT story|different story in the same subject area|knowledge\/curiosity channel/i.test(sistema))
    checa(`[${c.nome}] contrato 150-165 e marcadores intactos`, sistema.includes('150 to 165 words of narration total. This is a contract: shorter fails.') && sistema.includes('OUTPUT SHAPE (copy this shape exactly'))
  }
  return falhas
}

console.log('\nKINEO episódio 2 no assunto — a rota real, offline, com os filmes reais de 13/10\n')
const rotaReal = ler(ROTA)
const libReal = ler(LIB)

secao('0. estrutura: marca, sem tendência/momentum no caminho')
{
  const chk = (rot, cond) => { total += 1; if (!cond) { falhasTopo.push(rot); console.error('  x ' + rot) } else console.log('  ok ' + rot) }
  chk('a rota importa a lib de continuidade com a marca', rotaReal.includes(`import { blocoDeContinuidade } from '@/lib/episodeContinuity' // ${MARCA}`))
  chk('a rota não importa momentum/trending/viral (o assunto não vem de fora do filme)', !/momentumTopic|viralNow|viral-now|trending|TOPIC_POOL|VIRAL_STARTER_TOPICS/i.test(rotaReal))
  chk('a lib é pura (zero imports)', !/^\s*import\s/m.test(libReal))
  chk('a lib carrega a marca', libReal.includes(MARCA))
  chk('a leitura do filme de origem traz a narração (script), restrita ao dono', /\.select\('id, title, topic, script'\)[^\n]*\n\s*\.eq\('id', origemId\)\n\s*\.eq\('user_id', userId\)/.test(rotaReal))
}

secao('1. pura: assuntoDoFilme / formatoDoFilme')
{
  const L = transpilar(LIB, libReal, {})
  const chk = (rot, cond) => { total += 1; if (!cond) { falhasTopo.push(rot); console.error('  x ' + rot) } else console.log('  ok ' + rot) }
  const supra = L.assuntoDoFilme('HOOK (0-2s): [Pexels: toyota supra mk4 closeup] ¿Conoces la leyenda del Toyota Supra MK4?\n\nMICRO REWARD 1: [Pexels: 2jz-gte engine details] Equipado con el motor 2JZ-GTE.')
  chk('tira [Pexels: …] e "HOOK (0-2s):" e guarda o assunto (Toyota Supra MK4)', /Toyota Supra MK4/.test(supra) && !/Pexels|HOOK/.test(supra))
  chk('narração vem antes da ordem', L.assuntoDoFilme('Nobody wanted Milo, the tiny blue milk carton.', 'Generate a continuous visual story.').startsWith('Nobody wanted Milo'))
  chk('ordem com assunto fica ("Create a video about the Titanic")', /Titanic/.test(L.assuntoDoFilme('Create a video about the Titanic.')))
  chk('nada utilizável → "" (a rota cai no prompt de antes)', L.assuntoDoFilme('', null, undefined, 'ok') === '')
  chk('âncora ≤ MAX_ASSUNTO_CHARS', L.assuntoDoFilme('word '.repeat(400)).length <= L.MAX_ASSUNTO_CHARS)
  chk('episódio que já nasceu de continuação: só o pedido original', L.assuntoDoFilme('Topic: "The Boiling River". This is the next episode in the same Short series: same subject.') === 'The Boiling River')
  chk('história com personagem nomeado → historia', L.formatoDoFilme('A tiny cute blue milk carton named MILO.') === 'historia')
  chk('factual → livre (nunca chuta documentário nem ficção)', L.formatoDoFilme('Why airplane windows are round.') === 'livre')
  chk('blocoDeContinuidade vazio sem assunto', L.blocoDeContinuidade({ anterior: 'ok', narracaoOrigem: '' }) === '')
}

secao('2. a rota REAL, executada, com os filmes reais')
const falhasReais = await bateria(rotaReal, libReal)

// ── Mutantes ────────────────────────────────────────────────────────────────
secao('3. mutantes — cada um precisa APLICAR e ficar VERMELHO')
const SIS_NOVO = "You write short-form video scripts for a creator's ongoing series.\nYou will be given the episode the creator JUST made. Write the NEXT EPISODE of that\nsame series: same subject, same characters, same world, same voice, same format."
const SIS_VELHO = 'You write short-form video scripts for a knowledge/curiosity channel.\nYou will be given the script of an episode the creator JUST made. Write EPISODE 2:\na different story in the same subject area, same voice, same format.'
const STAY_INI = '- STAY ON THE SUBJECT of episode 1.'
const STAY_FIM = 'any real-world fact in it must still be true.'
const REGRA_VELHA = "- It must be a DIFFERENT story, not a rephrasing of episode 1. Same curiosity, new subject.\n- Only real, verifiable facts. No invented statistics, no invented quotes, no invented\n  people. If you are not certain a detail is true, leave it out. The creator will publish\n  this publicly and a false claim damages them."
const INSERCAO = "${continuidade ? `\\n${continuidade}\\n` : ''}"
const FONTE_ANCORA = 'blocoDeContinuidade({ anterior, narracaoOrigem: memoria.narracaoOrigem })'
const LIB_ESCOLHA = 'const assunto = assuntoDoFilme(entrada.narracaoOrigem, entrada.anterior)'

const MUTANTES = [
  {
    nome: 'M1 devolve a fonte antiga do desvio (o `sistema` "new subject")',
    rota: (s) => {
      const t = s.split(SIS_NOVO).join(SIS_VELHO)
      const i = t.indexOf(STAY_INI), f = t.indexOf(STAY_FIM)
      if (i < 0 || f < 0) return t
      return t.slice(0, i) + REGRA_VELHA + t.slice(f + STAY_FIM.length)
    },
    prova: (s) => s.includes('Same curiosity, new subject.') && s.includes('knowledge/curiosity channel') && !s.includes('STAY ON THE SUBJECT'),
  },
  {
    nome: 'M2 tira o assunto do prompt (bloco de continuidade some)',
    rota: (s) => s.split(INSERCAO).join("${''}"),
    prova: (s) => !s.includes(INSERCAO) && s.includes("${anterior}\n${''}\n${jaFeitosFinal.length"),
  },
  {
    nome: 'M3 âncora alimentada pelo ALREADY COVERED (outro filme), não pelo filme de origem',
    rota: (s) => s.split(FONTE_ANCORA).join("blocoDeContinuidade({ anterior: jaFeitosFinal.join(' ') || anterior, narracaoOrigem: '' })"),
    prova: (s) => !s.includes(FONTE_ANCORA) && s.includes("anterior: jaFeitosFinal.join(' ') || anterior"),
  },
  {
    nome: 'M4 a lib ignora a narração e a ordem crua (com andaime) vira a âncora',
    lib: (s) => s.split(LIB_ESCOLHA).join("const assunto = (entrada.anterior || entrada.narracaoOrigem || '').replace(/\\s+/g, ' ').trim().slice(0, 280)"),
    prova: (_r, l) => !l.includes(LIB_ESCOLHA) && l.includes("const assunto = (entrada.anterior || entrada.narracaoOrigem || '')"),
  },
]
const mutFalhas = []
for (const m of MUTANTES) {
  const r = m.rota ? m.rota(rotaReal) : rotaReal
  const l = m.lib ? m.lib(libReal) : libReal
  const aplicou = (r !== rotaReal || l !== libReal) && m.prova(r, l)
  total += 1
  if (!aplicou) { mutFalhas.push(`${m.nome}: NÃO aplicou`); console.error(`  x ${m.nome}: a mutação NÃO se aplicou`); continue }
  let f
  const antes = total // as checagens da bateria do mutante não entram na contagem do guardião
  try { f = await bateria(r, l, { silencioso: true }) } catch (e) { f = ['explodiu: ' + (e instanceof Error ? e.message : String(e))] }
  total = antes
  if (f.length === 0) { mutFalhas.push(`${m.nome}: ficou VERDE`); console.error(`  x ${m.nome}: aplicou e a bateria ficou VERDE`) } else console.log(`  ok ${m.nome}: aplicou e ficou vermelho (${f.length} falhas; 1ª: ${f[0]})`)
}

const todas = [...falhasTopo, ...falhasReais, ...mutFalhas]
console.log(`\n${total - todas.length} ok · ${todas.length} falhas`)
if (todas.length) process.exit(1)
