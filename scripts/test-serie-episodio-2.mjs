#!/usr/bin/env node
// ═══ A3 (2026-09-03) — o botao "Build the next episode" e a maquina da 2a compra ═══
//
// Medido no banco de producao (contas externas): 27 pessoas usaram o botao de
// serie e 3 pagaram (11,1%), contra 12 pagantes em 751 pessoas com filme
// (1,6%). Quem faz serie converte ~7x melhor — e 9 de 43 continuacoes (21%)
// nasceram com o ASSUNTO destruido: a ordem inteira do gerador virava
// `videos.topic`/`videos.title`, e o clique seguinte usava o TITLE como
// semente. A semente do episodio 3 era a ORDEM do episodio 2, cortada no meio
// da palavra, com `. Ke` colado no fim.
//
// Este teste roda o lib/seriesContinuation.ts REAL (compilado com o tsc do
// projeto — nada de reimplementar a regra aqui, senao nao prova nada) contra:
//   1. as 9 linhas reais do banco (verbatim), em duas metades cada: o andaime
//      SUMIU e o assunto SOBREVIVEU inteiro;
//   2. a versao de 120 chars (o `videos.title`), sem aspas de fechamento;
//   3. aninhamento triplo e idempotencia — o invariante que mata a classe do bug;
//   4. sementes boas intactas, degeneradas viram '' (nao gastar credito num
//      filme sobre um fragmento);
//   5. corte em 180 na fronteira de palavra;
//   6. laco finito com entrada patologica;
//   7. o prompt novo ainda casa com o PROMPT_SCAFFOLDING lido de
//      lib/publicVideos.ts (o porteiro do sitemap, incidente de 11/08);
//   8. href e URL de e-mail continuam com o mesmo contrato.
//
// Rodar: node scripts/test-serie-episodio-2.mjs   (sem rede, sem custo)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

function acharTsc(base) {
  const tentativas = []
  let dir = base
  for (let i = 0; i < 6; i++) {
    tentativas.push(join(dir, 'node_modules', 'typescript', 'bin', 'tsc'))
    const pai = dirname(dir)
    if (pai === dir) break
    dir = pai
  }
  for (const t of tentativas) if (existsSync(t)) return t
  console.error('Nao achei o typescript. Rode `npm install` na pasta do projeto.\nProcurei em:\n  ' + tentativas.join('\n  '))
  process.exit(1)
}
const TSC = acharTsc(raiz)

// seriesContinuation.ts nao importa nada: compila sozinho.
const saida = mkdtempSync(join(tmpdir(), 'kineo-serie-ep2-'))
const requerer = createRequire(join(saida, 'x.cjs'))
mkdirSync(join(saida, 'src'), { recursive: true })
writeFileSync(join(saida, 'src', 'seriesContinuation.ts'), readFileSync(join(raiz, 'lib/seriesContinuation.ts'), 'utf8'))
try {
  execFileSync(process.execPath, [
    TSC,
    join(saida, 'src', 'seriesContinuation.ts'),
    '--outDir', join(saida, 'out'), '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--strict', '--rootDir', join(saida, 'src'),
  ], { stdio: 'pipe' })
  writeFileSync(join(saida, 'out', 'package.json'), JSON.stringify({ type: 'commonjs' }))
} catch (e) {
  console.error('Nao consegui compilar:\n', e.stdout?.toString() || e.message)
  process.exit(1)
}
const S = requerer(join(saida, 'out', 'seriesContinuation.js'))
const { normalizeSeriesSeed: norm, buildSeriesContinuationPrompt: prompt, buildSeriesContinuationHref: href, buildSeriesContinuationEmailUrl: emailUrl } = S

let falhas = 0, total = 0
const checa = (nome, cond, det = '') => {
  total += 1
  if (!cond) { falhas += 1; console.error(`  x ${nome}${det ? ` — ${det}` : ''}`) }
}
const secao = (t) => console.log(`\n── ${t}`)
const j = (v) => JSON.stringify(v)

// O andaime das DUAS gerações de ordem (antiga e nova). Nenhum pedaco disso
// pode sobrar numa semente normalizada.
const ANDAIME = [
  /create the next episode/i,
  /keep the topic/i,
  /\. ke\b/i,
  /completely new hook/i,
  /do not repeat/i,
  /this is the next episode/i,
  /next episode in the same short series/i,
  /^topic:/i,
  /^title:/i,
]
const semAndaime = (s) => ANDAIME.every((re) => !re.test(s))

// Gerador da ORDEM ANTIGA (v1, ate 03/09) — e DADO de fixture, o formato que
// esta gravado no banco em 43 linhas; nao e a regra sob teste.
const ordemAntiga = (seed) =>
  `Create the next episode in the same Short series about "${seed}". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.`

console.log('\nKINEO serie / episodio 2 — a semente do episodio 3 nao pode ser a ORDEM do episodio 2\n')

// ── 1. As 9 linhas REAIS de producao ──────────────────────────────────────
secao('1. as 9 linhas reais do banco (verbatim)')
// Os assuntos esperados dos fixtures 1-3 e 5-6 sao FRAGMENTOS: o banco cortou
// o title em ~120 chars ANTES de o clique seguinte usar como semente, e esse
// pedaco perdido nao existe em lugar nenhum. O certo, entao, e devolver o
// fragmento LIMPO (sem `Create the next episode…` na frente, sem `. Keep…`
// atras): e o maximo de assunto que sobrou, e e o que o gerador precisa.
const FIXTURES = [
  { n: 1, data: '03/09', topic: 'Create the next episode in the same Short series about "Create the next episode in the same Short series about Every night at 3:17 AM, someone kn". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.', esperado: 'Every night at 3:17 AM, someone kn' },
  { n: 2, data: '21/08', topic: 'Create the next episode in the same Short series about "Create the next episode in the same Short series about A vanished crew... and a mystery u". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.', esperado: 'A vanished crew... and a mystery u' },
  { n: 3, data: '17/08', topic: 'Create the next episode in the same Short series about "Create the next episode in the same Short series about A detective\'s office — and a murde". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.', esperado: 'A detective\'s office — and a murde' },
  // `. Ke` colado no fim = inicio de ". Keep the topic", cortado pelo title.
  { n: 4, data: '03/08', topic: 'Create the next episode in the same Short series about "Create the next episode in the same Short series about AI Revolution: Are You Ready?. Ke". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.', esperado: 'AI Revolution: Are You Ready?' },
  { n: 5, data: '03/08', topic: 'Create the next episode in the same Short series about "Create the next episode in the same Short series about Want to know how billionaires buil". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.', esperado: 'Want to know how billionaires buil' },
  { n: 6, data: '01/08', topic: 'Create the next episode in the same Short series about "Create the next episode in the same Short series about The most astonishing undercover mi". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.', esperado: 'The most astonishing undercover mi' },
  // Sobra de marcador ("5 shocking facts about" — o assunto ficou do outro lado
  // do corte): nao e assunto, e a pessoa cairia num filme sobre nada.
  { n: 7, data: '03/09', topic: ordemAntiga('5 shocking facts about'), esperado: '' },
  { n: 8, data: '02/09', topic: ordemAntiga('Untitled Short'), esperado: '' },
  // Rotulo `Title:` grudado; os dois-pontos DE DENTRO do assunto sobrevivem.
  { n: 9, data: '18/08', topic: ordemAntiga('Title: La Frontera del Miedo: El Misterio del SS Ourang Medan y la Psicología del Terror'), esperado: 'La Frontera del Miedo: El Misterio del SS Ourang Medan y la Psicología del Terror' },
]
for (const f of FIXTURES) {
  const r = norm(f.topic)
  checa(`[fixture ${f.n} · ${f.data}] (i) o andaime SUMIU`, semAndaime(r), j(r))
  checa(`[fixture ${f.n} · ${f.data}] (ii) o assunto sobreviveu palavra por palavra`, r === f.esperado, `veio ${j(r)}, esperado ${j(f.esperado)}`)
  if (f.esperado) {
    const p = prompt(f.topic)
    checa(`[fixture ${f.n}] o prompt novo comeca pelo assunto`, p.startsWith(`Topic: "${f.esperado}". `), j(p.slice(0, 80)))
    checa(`[fixture ${f.n}] o prompt novo nao carrega a ordem antiga`, !/create the next episode/i.test(p) && !/keep the topic/i.test(p))
  } else {
    checa(`[fixture ${f.n}] semente degenerada nao gera prompt (nao gasta credito)`, prompt(f.topic) === '')
  }
}
checa('fixture 9: o dois-pontos DE DENTRO do assunto sobreviveu (so o do rotulo saiu)', (norm(FIXTURES[8].topic).match(/:/g) ?? []).length === 1)

// ── 2. A versao de 120 chars (o `videos.title`), sem aspas de fechamento ──
secao('2. o videos.title = topic cortado em 120, sem aspas de fechamento')
// O title nasce da ordem SIMPLES (1 nivel) cortada em 120 — foi assim que os
// fixtures 1-6 foram gerados: a pessoa clicou "next episode" no episodio 2,
// cujo title era a ordem do episodio 1 cortada.
const ASSUNTOS_INTEIROS = {
  1: 'Every night at 3:17 AM, someone knocks on the door of the lighthouse and nobody is ever there',
  4: 'AI Revolution: Are You Ready?',
  6: 'The most astonishing undercover missions of the Cold War that were only declassified last year',
  9: 'Title: La Frontera del Miedo: El Misterio del SS Ourang Medan y la Psicología del Terror',
}
for (const n of [1, 4, 6, 9]) {
  const f = FIXTURES[n - 1]
  const title = ordemAntiga(ASSUNTOS_INTEIROS[n]).slice(0, 120)
  // Assunto longo (1, 6, 9): o corte de 120 cai DENTRO do assunto, sem aspa de
  // fechamento. Assunto curto (4): as aspas fecham e o corte cai na cauda.
  if (n !== 4) checa(`[title ${n}] o fixture de 120 chars nao fecha as aspas`, (title.match(/"/g) ?? []).length % 2 === 1, j(title))
  const r = norm(title)
  checa(`[title ${n}] o andaime SUMIU`, semAndaime(r), j(r))
  checa(`[title ${n}] nao devolveu vazio (era assunto real)`, r.length >= 20, j(r))
  checa(`[title ${n}] o que sobrou e PREFIXO do assunto verdadeiro (o banco cortou, nos nao)`, ASSUNTOS_INTEIROS[n].replace(/^Title: /, '').startsWith(r), `veio ${j(r)}, assunto ${j(ASSUNTOS_INTEIROS[n])}`)
  checa(`[title ${n}] o que sobrou aqui e o fragmento do banco (fixture ${n}) sao prefixo um do outro`, !f.esperado || r.startsWith(f.esperado) || f.esperado.startsWith(r), `veio ${j(r)}, banco ${j(f.esperado)}`)
}
// Fixture 4 a 120: `...Are You Ready?". Keep the topic and format recog` — o
// fragmento da cauda muda de tamanho e tem de sumir do mesmo jeito.
{
  const t4 = ordemAntiga('AI Revolution: Are You Ready?').slice(0, 120)
  checa('[title 4] o title termina em `. Keep the topic and format recogn` (o corte cai na cauda)', t4.endsWith('. Keep the topic and format recogn'), j(t4))
  checa('[title 4] `. Keep the topic and format recogn` some inteiro', norm(t4) === 'AI Revolution: Are You Ready?', j(norm(t4)))
  // O title de uma ordem DUPLAMENTE aninhada so guarda 8 chars do assunto
  // ("Every nig"): o banco jogou o resto fora, nada a restaurar. O que da para
  // exigir e que o andaime suma e o resultado seja prefixo do assunto.
  const t1 = FIXTURES[0].topic.slice(0, 120)
  checa('[title 1 duplo] o andaime some', semAndaime(norm(t1)), j(norm(t1)))
  checa('[title 1 duplo] o que sobra e prefixo do assunto (ou vazio)', FIXTURES[0].esperado.startsWith(norm(t1)), j(norm(t1)))
}
// Outros tamanhos de fragmento da cauda, um por um.
for (const frag of ['. K', '. Ke', '. Keep', '. Keep the', '. Keep the topic and forma', '. Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh pay']) {
  const r = norm(`AI Revolution: Are You Ready?${frag}`)
  const ok = frag === '. K' ? r === 'AI Revolution: Are You Ready?. K' : r === 'AI Revolution: Are You Ready?'
  // `. K` (3 chars) fica de proposito: 4 e o minimo, para "The Story of Mr. K" nao perder o K.
  checa(`fragmento ${j(frag)} ${frag === '. K' ? 'fica (abaixo do minimo de 4)' : 'some'}`, ok, j(r))
}
checa('"The Story of Mr. K" nao perde o K', norm('The Story of Mr. K') === 'The Story of Mr. K')
checa('"Secrets You Should Keep" nao perde o Keep', norm('Secrets You Should Keep') === 'Secrets You Should Keep')
checa('"Do not repeat" (fragmento sem ponto, 13 chars) some', norm('The Boiling River Do not repeat') === 'The Boiling River', j(norm('The Boiling River Do not repeat')))

// ── 3. Aninhamento triplo e idempotencia ──────────────────────────────────
secao('3. aninhamento triplo e idempotencia (o invariante que mata a classe do bug)')
const BONS = [
  'The Boiling River of the Amazon',
  'Every night at 3:17 AM, someone knocks',
  'AI Revolution: Are You Ready?',
  'A detective\'s office — and a murder',
  'La Frontera del Miedo: El Misterio del SS Ourang Medan',
  'O lago que transforma animais em pedra',
  'Batalha de Los Angeles 1942',
  'Why billionaires wake up at 4 AM 🤯',
  'The 1972 Andes crash: 72 days of survival',
  'Pompeii\'s last day.',
  'What happened to Flight MH370?',
  'Chernobyl: the night the reactor exploded',
  '5 shocking facts about money',
  'El misterio del Triángulo de las Bermudas',
]
for (const x of BONS) {
  const p1 = prompt(x)
  const p2 = prompt(p1)
  const p3 = prompt(p2)
  checa(`[triplo] ${j(x)} → o assunto original sai no fim`, norm(p3) === norm(x), `veio ${j(norm(p3))}`)
  checa(`[triplo] ${j(x)} → sem "Create the next episode" nem "Topic: \\"Topic:"`, !/create the next episode/i.test(p3) && !p3.includes('Topic: "Topic:'), j(p3))
  checa(`[idempotencia] norm(prompt(x)) === norm(x) para ${j(x)}`, norm(p1) === norm(x), `${j(norm(p1))} vs ${j(norm(x))}`)
  checa(`[idempotencia] prompt(prompt(x)) === prompt(x) para ${j(x)}`, p2 === p1)
  // O aninhamento que esta no banco e o da ordem ANTIGA — triplo tambem.
  const a3 = ordemAntiga(ordemAntiga(ordemAntiga(x)))
  checa(`[triplo antigo] ${j(x)} → o assunto original sai no fim`, norm(a3) === norm(x), `veio ${j(norm(a3))}`)
  // E o misto (antiga dentro da nova dentro da antiga) que vai existir na transicao.
  const misto = ordemAntiga(prompt(ordemAntiga(x)))
  checa(`[triplo misto] ${j(x)} → o assunto original sai no fim`, norm(misto) === norm(x), `veio ${j(norm(misto))}`)
}
// Truncado no meio do aninhamento (title de 120 de uma ordem nova).
{
  const t = prompt('Every night at 3:17 AM, someone knocks').slice(0, 120)
  checa('title de 120 da ordem NOVA desaninha limpo', norm(t) === 'Every night at 3:17 AM, someone knocks', j(norm(t)))
}

// ── 4. Sementes boas intactas / degeneradas viram '' ──────────────────────
secao('4. semente boa passa intacta; degenerada vira \'\'')
for (const x of BONS) checa(`intacta: ${j(x)}`, norm(x) === x, j(norm(x)))
checa('espacos colapsados', norm('  The   Boiling\n\tRiver  ') === 'The Boiling River')
checa('aspas retas e curvas de fora somem', norm('"The Boiling River"') === 'The Boiling River' && norm('“The Boiling River”') === 'The Boiling River')
checa('rotulo Title: sai, conteudo fica', norm('Title: The Boiling River') === 'The Boiling River')
checa('rotulo Título: sai', norm('Título: O Rio que Ferve') === 'O Rio que Ferve')
checa('rotulo Titulo: sai', norm('Titulo: O Rio que Ferve') === 'O Rio que Ferve')
checa('rotulo Tema: sai', norm('Tema: O Rio que Ferve') === 'O Rio que Ferve')
checa('rotulo Topic: sai', norm('Topic: The Boiling River') === 'The Boiling River')
checa('rotulo em caixa alta sai', norm('TITLE: The Boiling River') === 'The Boiling River')
checa('rotulo aninhado (Topic: Topic: X) sai inteiro', norm('Topic: "Topic: "The Boiling River') === 'The Boiling River')
const DEGENERADAS = [
  '', '   ', null, undefined,
  'Untitled Short', 'untitled short', 'Untitled', 'Untitled Video', 'Sem título', 'Sem titulo',
  '5 shocking facts about', 'A história sobre', 'O mistério de', 'The secrets of the', 'Once upon a', 'Tale of an',
  'The rise of', 'Uma viagem com', 'Um guia para', 'Rock and', 'How to', 'The truth:', 'Facts,',
  'Keep the topic and format recognizable, but use a completely new hook',
  'Do not repeat the previous episode.',
  'next episode in the same Short series',
  ordemAntiga('   '),
  ordemAntiga('Untitled Short'),
  ordemAntiga(ordemAntiga('5 shocking facts about')),
]
for (const d of DEGENERADAS) checa(`degenerada → '': ${j(d == null ? d : String(d).slice(0, 40))}`, norm(d) === '', j(norm(d)))
// A3: MIN_SEED_WORDS = 1. Medido no banco em 03/09: so 9 dos 1.184 filmes
// entregues tem titulo de uma palavra — e sao assunto de serie legitimo. Quem
// pega a sobra de marcador e a regra da palavra pendurada, nao a contagem.
checa('"Chernobyl" (1 palavra) e assunto VALIDO', norm('Chernobyl') === 'Chernobyl')
checa('"Pompeii" (1 palavra) e assunto VALIDO', norm('Pompeii') === 'Pompeii')
checa('1 palavra gigante corta em 180 e continua valida', norm('x'.repeat(400)) === 'x'.repeat(180))
checa('"5 shocking facts about money" NAO e degenerada (o about tem complemento)', norm('5 shocking facts about money') === '5 shocking facts about money')
checa('"Deutsche Bank" NAO e degenerada (de e de dentro de palavra, nao ultima)', norm('The fall of Deutsche Bank') === 'The fall of Deutsche Bank')
checa('"Mad Max: Fury Road" NAO e degenerada (dois-pontos no meio)', norm('Mad Max: Fury Road') === 'Mad Max: Fury Road')

// ── 5. Corte em 180 na fronteira de palavra ───────────────────────────────
secao('5. corte em 180: fronteira de palavra, prefixo identico, nunca no meio')
{
  const longa = Array.from({ length: 60 }, (_, i) => `palavra${i}`).join(' ') // ~600 chars, sem pontuacao
  const r = norm(longa)
  checa('sai com <= 180', r.length <= 180, `${r.length}`)
  checa('sai com > 150 (nao cortou de menos)', r.length > 150, `${r.length}`)
  checa('e prefixo identico da entrada', longa.startsWith(r))
  checa('termina em palavra inteira (o char seguinte na entrada e espaco)', longa[r.length] === ' ', j(longa.slice(r.length - 5, r.length + 5)))
  checa('nao termina em espaco', !/\s$/.test(r))
  checa('normalizar de novo nao muda (estavel)', norm(r) === r)
  checa('exatamente 180 cabe intacta', norm('a'.repeat(89) + ' ' + 'b'.repeat(90)) === 'a'.repeat(89) + ' ' + 'b'.repeat(90))
  checa('181 chars cortam na fronteira', norm('a'.repeat(40) + ' ' + 'a'.repeat(48) + ' ' + 'b'.repeat(91)) === 'a'.repeat(40) + ' ' + 'a'.repeat(48))
  checa('181 chars com so 2 palavras: corta a 2a e a 1a SOBREVIVE', norm('a'.repeat(89) + ' ' + 'b'.repeat(91)) === 'a'.repeat(89))
}
{
  // Fronteira de FRASE dentro do limite tem prioridade sobre o ultimo espaco.
  const frase1 = 'The Boiling River of the Amazon is so hot that it cooks any animal that falls in, and nobody knew why until 2011.' // 113 chars
  const frase2 = ' Then a young geologist ignored every warning from his professors and went there anyway to measure it.'
  const r = norm(frase1 + frase2)
  checa('corta na ultima fronteira de frase dentro de 180', r === frase1, j(r))
  // Fronteira de frase cedo demais (< 90) NAO vale: senao "Mr." viraria a semente.
  const cedo = 'Mr. Smith and the two hundred and fifty thousand dollars that vanished from a locked bank vault in nineteen seventy three without a single alarm going off or a door being opened by anyone'
  const rc = norm(cedo)
  checa('fronteira de frase muito cedo ("Mr.") e ignorada', rc.length > 90 && cedo.startsWith(rc) && rc.length <= 180, j(rc))
  checa('...e o corte cai em espaco', cedo[rc.length] === ' ' || rc.length === cedo.length)
}
{
  // Depois do corte a semente nao pode terminar em preposicao pendurada.
  const base = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ') // 20 palavras
  const ate178 = (base + ' ' + 'y'.repeat(200)).slice(0, 178) // cabe "...word19 yyyy"
  const comOf = base.slice(0, 174) + ' of ' + 'z'.repeat(100)
  const r = norm(comOf)
  checa('corte nao deixa "of" pendurado', !/\bof$/i.test(r), j(r))
  checa('...e nao devolveu vazio (a entrada era longa e inteira)', r.length > 100, j(r))
  void ate178
  const comVirgula = 'The lake that turns animals to stone, the river that boils, the desert that sings, the island that appears and disappears with the tide, the forest where compasses spin,' + ' and the cave that breathes cold air every summer afternoon'
  const rv = norm(comVirgula)
  checa('corte nao termina em virgula', !/[,:]$/.test(rv), j(rv))
}

// ── 6. Laco finito ────────────────────────────────────────────────────────
secao('6. sem laco infinito')
{
  const head = 'Create the next episode in the same Short series about "'
  const tail = '". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.'
  const patologica = head.repeat(20) + 'Every night at 3:17 AM, someone knocks' + tail.repeat(20)
  const t0 = Date.now()
  let r = null, erro = null
  try { r = norm(patologica) } catch (e) { erro = e }
  const dt = Date.now() - t0
  checa('ordem repetida 20x nao explode', erro === null, String(erro))
  checa('ordem repetida 20x volta em < 500ms', dt < 500, `${dt}ms`)
  checa('ordem repetida 20x nao devolve andaime', r !== null && semAndaime(r), j(r))
  checa('ordem repetida 20x devolve o assunto', r === 'Every night at 3:17 AM, someone knocks', j(r))
  const novaPatologica = Array.from({ length: 20 }).reduce((acc) => prompt(acc), 'Every night at 3:17 AM, someone knocks')
  checa('prompt aplicado 20x sobre si mesmo continua igual ao 1o', novaPatologica === prompt('Every night at 3:17 AM, someone knocks'))
  const t1 = Date.now()
  const rr = norm('Topic: "'.repeat(20) + 'Every night at 3:17 AM, someone knocks' + '". This is the next episode in the same Short series: same subject, same format, a completely new hook, new facts and a fresh payoff. Do not repeat the previous episode.'.repeat(20))
  checa('ordem NOVA repetida 20x volta em < 500ms e limpa', Date.now() - t1 < 500 && rr === 'Every night at 3:17 AM, someone knocks', j(rr))
}

// ── 7. A trava dura: o prompt novo tem de casar com o porteiro do sitemap ──
secao('7. PROMPT_SCAFFOLDING lido de lib/publicVideos.ts (nao copiado a mao)')
{
  const src = readFileSync(join(raiz, 'lib/publicVideos.ts'), 'utf8')
  const m = src.match(/const PROMPT_SCAFFOLDING\s*=\s*\/(.+)\/([a-z]*)\s*$/m)
  checa('achei o PROMPT_SCAFFOLDING no arquivo real', !!m)
  if (m) {
    const re = new RegExp(m[1], m[2])
    const p = prompt('The Boiling River of the Amazon')
    checa('o prompt novo CASA com o PROMPT_SCAFFOLDING (senao andaime vaza para o Google)', re.test(p), j(p))
    const alternativas = m[1].replace(/^\(|\)$/g, '').split('|')
    const casadas = alternativas.filter((a) => new RegExp(a, m[2]).test(p))
    checa(`o prompt casa com pelo menos 3 das ${alternativas.length} alternativas (casou ${casadas.length}: ${casadas.join(' / ')})`, casadas.length >= 3)
    checa('a semente normalizada NAO casa (nao e andaime)', !re.test(norm(p)))
    // O prompt com fixture real aninhado tambem casa (a rota grava o prompt no topic).
    checa('prompt do fixture 1 casa com o porteiro', re.test(prompt(FIXTURES[0].topic)))
    checa('lib/scriptLibrary.ts continua importando o detector de publicVideos', /isPromptScaffolding/.test(readFileSync(join(raiz, 'lib/scriptLibrary.ts'), 'utf8')))
    // Espelho interno: se alguem mudar o regex do publicVideos, este arquivo
    // precisa acompanhar (ele e o que faz "sobra de andaime" virar '').
    const lib = readFileSync(join(raiz, 'lib/seriesContinuation.ts'), 'utf8')
    const mm = lib.match(/const RESIDUAL_SCAFFOLDING\s*=\s*\/(.+)\/([a-z]*)\s*$/m)
    checa('RESIDUAL_SCAFFOLDING (seriesContinuation.ts) e identico ao PROMPT_SCAFFOLDING (publicVideos.ts)', !!mm && mm[1] === m[1] && mm[2] === m[2], mm ? j(mm[1]) : 'nao achei')
  }
}

// ── 8. href e URL de e-mail ───────────────────────────────────────────────
secao('8. href e URL de e-mail mantem o contrato')
{
  for (const d of ['', 'Untitled Short', '5 shocking facts about', ordemAntiga('Untitled Short'), null]) {
    const h = href(d, 'history_video_card')
    checa(`href degenerado ${j(d)} → /studio (o Studio limpo, sem prompt)`, h === '/studio', j(h))
    checa(`href degenerado ${j(d)} nao leva prompt=`, !h.includes('prompt='))
    const e = emailUrl('https://www.usekineo.com/', d, 'momentum_email', { utm_source: 'lifecycle' })
    checa(`email degenerado ${j(d)} → /generate?utm só`, e === 'https://www.usekineo.com/generate?utm_source=lifecycle', j(e))
  }
  const h = href(FIXTURES[0].topic, 'history_video_card')
  checa('href bom aponta para /studio/create?', h.startsWith('/studio/create?'), j(h.slice(0, 40)))
  const u = new URL('https://x.test' + h)
  checa('href bom leva prompt=', (u.searchParams.get('prompt') ?? '').startsWith('Topic: "Every night at 3:17 AM, someone kn". '), j(u.searchParams.get('prompt')))
  checa('href bom leva autoanalyze=1', u.searchParams.get('autoanalyze') === '1')
  checa('href bom leva series=1', u.searchParams.get('series') === '1')
  checa('href bom leva continuation_source=', u.searchParams.get('continuation_source') === 'history_video_card')
  const e = emailUrl('https://www.usekineo.com', FIXTURES[3].topic, 'video_ready_email', { utm_source: 'lifecycle', utm_campaign: 'ready' })
  const ue = new URL(e)
  checa('email bom → /generate', ue.pathname === '/generate')
  checa('email bom leva o assunto desaninhado', (ue.searchParams.get('prompt') ?? '').startsWith('Topic: "AI Revolution: Are You Ready?". '))
  checa('email bom leva series=1 e a fonte', ue.searchParams.get('series') === '1' && ue.searchParams.get('continuation_source') === 'video_ready_email')
  checa('email bom: prompt vem ANTES dos utm', e.indexOf('prompt=') < e.indexOf('utm_source='))
}

console.log(`\n${total - falhas}/${total} verificacoes passaram${falhas ? ` — ${falhas} FALHARAM` : ''}\n`)
process.exit(falhas ? 1 : 0)
