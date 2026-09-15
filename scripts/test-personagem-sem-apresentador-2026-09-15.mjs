// KINEO-PERSONAGEM-SEM-APRESENTADOR-2026-09-15 — render Seedance d6e8e8b3 (fundador, 15/09,
// 25 cr): o pedido controlado dizia "No dialogue, no presenter talking to the camera" E "Keep
// the same keeper throughout: a middle-aged man with a short gray beard…". decidirFormato
// (lib/cinematic/visualMode.ts) devolvia documentary_faceless pela negacao de apresentador,
// ANTES de olhar se havia personagem; a ficha nunca entrou nas 7 cenas enviadas ao fal e o
// faroleiro sumiu do filme. Este guardiao executa o decidirFormato REAL (arquivo sem imports)
// e prova: (a) na origin/main os pedidos do fundador (faroleiro, trem) caem em faceless;
// (b) no candidato viram character_story com apresentadorPedido=false (pessoa muda);
// (c) "No presenter. Show only the city." continua faceless; documentario sem personagem
// (Lituya) continua faceless; primeira pessoa continua presenter; a tag [faceless] vence tudo.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console }); return exp }

const doc = rd('docs/coordination/motores/ROTEIROS-TESTE-2026-09-15.md')
const pedido = (titulo) => doc.split(titulo)[1].split('```')[1].trim()
const FAROLEIRO = pedido('## 1. Seedance 1.5')
const TREM = pedido('## 2. Kling 2.5')
const CRACO = pedido('## 3. Kineo 1')
const VULCAO = pedido('## 4. Veo 3.1')
const RELOJOEIRO = pedido('## 5. Kling 3')
const LITUYA = 'Create a 60-second historical documentary short in English about the 1958 Lituya Bay megatsunami in Alaska. Use third-person voiceover throughout. No dialogue, no presenter talking to the camera, no quoted testimony. Do not use real names of survivors.'
checa('os pedidos controlados foram lidos do doc (faroleiro, trem, Craco, vulcão, relojoeiro)', [FAROLEIRO, TREM, CRACO, VULCAO, RELOJOEIRO].every((p) => p.startsWith('Create a 60-second')))

const VM = roda(rd('lib/cinematic/visualMode.ts'))
const modo = (t) => VM.decidirFormato(t, VM.TAG_FACELESS.test(t))

console.log('== (a) reprodução na origin/main ==')
{
  let main = null
  try { main = execFileSync('git', ['show', 'origin/main:lib/cinematic/visualMode.ts'], { cwd: RAIZ, maxBuffer: 16 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch {}
  if (main && !main.includes('KINEO-PERSONAGEM-SEM-APRESENTADOR-2026-09-15')) {
    const M = roda(main)
    const f = M.decidirFormato(FAROLEIRO, false), t = M.decidirFormato(TREM, false)
    checa(`main: faroleiro → ${f.modo} e trem → ${t.modo} (a negação de apresentador vencia a ficha do personagem)`, f.modo === 'documentary_faceless' && t.modo === 'documentary_faceless')
  } else {
    checa('reprodução na main pulada (origin/main já traz o conserto, ou git indisponível)', true)
  }
}

console.log('== (b) candidato: ficha explícita + "sem apresentador" = personagem mudo ==')
{
  const f = modo(FAROLEIRO), t = modo(TREM), v = modo(VULCAO), r = modo(RELOJOEIRO)
  checa(`faroleiro → character_story, apresentadorPedido=false ("${f.motivo.slice(0, 60)}…")`, f.modo === 'character_story' && f.apresentadorPedido === false && /ficha explicita/.test(f.motivo))
  checa('trem (a protagonista é…) → character_story', t.modo === 'character_story' && t.apresentadorPedido === false)
  checa('vulcão (keep the same geologist throughout) → character_story', v.modo === 'character_story')
  checa('relojoeiro (keep the same watchmaker throughout) → character_story', r.modo === 'character_story')
  checa('a ficha explícita é reconhecida em PT/ES também', VM.FICHA_EXPLICITA_DE_PERSONAGEM.test('Sem apresentador. Mantenha o mesmo pescador em todas as cenas: um homem de 60 anos.') && VM.FICHA_EXPLICITA_DE_PERSONAGEM.test('Sin presentador. La protagonista es una mujer de 30 años.'))
}

console.log('== (c) o que NÃO muda ==')
{
  checa('"No presenter. Show only the city." continua faceless (sem personagem)', modo('No presenter. Show only the city at night, drones and streets.').modo === 'documentary_faceless')
  checa('documentário sem personagem (Lituya, "no presenter") continua faceless', modo(LITUYA).modo === 'documentary_faceless')
  checa('Craco (documentário de lugar, "no presenter, no invented characters") continua faceless', modo(CRACO).modo === 'documentary_faceless')
  checa('primeira pessoa continua presenter', modo('My name is Tomas, and I was the last lighthouse keeper. When I was young I never left the coast. I still remember the storms.').modo === 'presenter')
  checa('a tag [faceless] vence a ficha explícita', modo('[faceless] Keep the same keeper throughout: a man with a beard.').modo === 'documentary_faceless')
  checa('pedido explícito de apresentador continua presenter', modo('A presenter talking to the camera explains the history of Rome.').modo === 'presenter')
  checa('"No presenter" + "his story" (sinal antigo) → character_story pelo sinal, não pela ficha', (() => { const m = modo('No presenter. This is his story: a fisherman who lost his boat in 1958.'); return m.modo === 'character_story' && /his story/.test(m.motivo) })())
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
