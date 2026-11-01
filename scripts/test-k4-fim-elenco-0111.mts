// KINEO-K4-FIM-SEM-VOLTA-0111 + KINEO-ELENCO-AVIAO-LUGAR-0111 — guardião dos consertos da rodada "últimos 10 vídeos" do revisor (01/11):
// (1) o filme Kling 4 grátis com narração mais longa que 15 s não volta à cena de abertura (4 de 5 filmes terminavam no 1º plano);
// (2) "a C-54 Skymaster disappeared over the Yukon wilderness" não vira 2 pessoas, e "a ghost flight" não vira um fantasma protagonista.
// Rodar: npx tsx scripts/test-k4-fim-elenco-0111.mts
import fs from 'node:fs'
import { personagensNomeados } from '../lib/cinematic/elencoEpoca'
import { elencoDeterministico } from '../lib/cinematic/folhaDePersonagem'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// (1) a montagem do Kling 4 grátis
const compose = rd('lib/compose.ts')
const ramo = compose.slice(compose.indexOf("kling4TrialEngine === 'kling4' && cleanClips.length === 1"), compose.indexOf('} else if (signedClipSeconds)'))
ok(ramo.length > 0 && !/loop:\s*true/.test(ramo), '(1) o ramo do Kling 4 grátis não usa mais loop:true (que voltava ao quadro zero)')
ok(ramo.includes('trim_start: round3(K4_SEGUNDOS - len)'), '(1) a sobra repete o FIM do filme (últimos segundos), nunca o começo')
ok(/const K4_CAUDA = 3\b/.test(ramo), '(1) a cauda cabe na última cena (piso de cena de 3 s)')
// simulação da linha do tempo com os números reais do "planeta de gelo" (narração 17,7 s) e do avião (18,9 s)
const linha = (total: number) => {
  const out: Array<{ time: number; duration: number; trim: number }> = []
  const r3 = (v: number) => Math.round(v * 1000) / 1000
  const inteiro = r3(Math.min(total, 15)); out.push({ time: 0, duration: inteiro, trim: 0 })
  for (let t = inteiro; total - t > 0.05;) { const len = r3(Math.min(3, total - t)); out.push({ time: t, duration: len, trim: r3(15 - len) }); t = r3(t + len) }
  return out
}
for (const total of [15, 17.7, 18.9, 22.4]) {
  const l = linha(total)
  const cobre = Math.abs(l.reduce((s, e) => s + e.duration, 0) - total) < 0.01
  const nuncaAbertura = l.slice(1).every((e) => e.trim >= 12)
  const dentroDoClipe = l.every((e) => e.trim + e.duration <= 15.0001)
  ok(cobre && nuncaAbertura && dentroDoClipe, `(1) narração de ${total}s: cobre o filme inteiro, só repete os últimos 3 s e nunca passa do clipe`)
}

// (2) elenco: máquina e lugar não são gente; criatura como adjetivo não é personagem
const aviao = 'Vanished into thin air—70 years, zero leads. In 1950, a C-54 Skymaster disappeared over the Yukon wilderness. All 44 passengers were never seen again in those icy peaks. The mystery remains unsolved... a ghost flight... swallowed by time and nature.'
const nomes = personagensNomeados(aviao).map((p) => p.nome)
ok(!nomes.includes('Skymaster'), `(2) "C-54 Skymaster" é o avião, não uma pessoa (nomes: ${JSON.stringify(nomes)})`)
ok(!nomes.includes('Yukon'), '(2) "the Yukon wilderness" é lugar, não uma pessoa')
const ficha = elencoDeterministico(aviao)
ok(!ficha.some((f) => /ghost/i.test(f.nome) || /spectral/i.test(f.canonica)), `(2) "a ghost flight" não vira protagonista fantasma (elenco: ${JSON.stringify(ficha.map((f) => f.nome))})`)
for (const [txt, quem] of [
  ['In 1963 the USS Thresher sank in the Atlantic. Captain Harvey ordered the crew to surface.', 'Thresher'],
  ['A Boeing Stratocruiser vanished over the Pacific ocean in 1957.', 'Stratocruiser'],
] as const) ok(!personagensNomeados(txt).map((p) => p.nome).includes(quem), `(2) "${quem}" (navio/avião) não vira pessoa`)

// controles: gente continua sendo gente; fantasma de verdade continua personagem
const turner = personagensNomeados('In 1971 James Turner vanished near the airfield. Turner had flown a C-47 Skytrain the night before.').map((p) => p.nome)
ok(turner.some((n) => /Turner/.test(n)), `(2) controle: o piloto continua personagem mesmo com avião na frase (${JSON.stringify(turner)})`)
ok(!turner.includes('Skytrain'), '(2) e o "C-47 Skytrain" da mesma história não vira gente')
const amelia = personagensNomeados('In 1937 Amelia Earhart vanished over the Pacific. Amelia radioed her last position near Howland Island.').map((p) => p.nome)
ok(amelia.some((n) => /Amelia/.test(n)), `(2) controle: pessoa que some no avião continua personagem (${JSON.stringify(amelia)})`)
const fantasma = elencoDeterministico('A lonely ghost wanders the old castle every night. The ghost sings to the moon and waits for a friend.')
ok(fantasma.some((f) => /ghost/i.test(f.nome)), '(2) controle: "a lonely ghost wanders" continua o protagonista fantasma')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
