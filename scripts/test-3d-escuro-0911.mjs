#!/usr/bin/env node
// KINEO-3D-ESCURO-0911 — guardião do 3D de tom escuro (puxada de 09/11, sgtoxic481, render 6b84079a, nota 4).
// O cliente pediu "Psychological horror … Dark, cinematic 3D animation … realistic environments" e o molde 3D único
// ("soft rounded shapes, bright saturated colors") + ", energetic" do plano entregaram desenho alegre num terror.
// Prova com os módulos reais (offline, sem rede, sem custo) e com MUTANTE: a lib/cinematic/sceneStyle.ts de origin/main
// (sem o conserto) tem de reprovar os casos escuros e aprovar os intocados.
// Rodar: node scripts/test-3d-escuro-0911.mjs
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const BASE = 'eb505e48d' // origin/main antes do conserto
const ALEGRE = 'stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic'

// Texto REAL do cliente (ficção, sem dado pessoal): a ideia colada do ChatGPT + o roteiro que a casa escreveu.
const IDEIA = 'THE LAST MESSAGE\n\nGenre: Psychological horror\nLength: 45–60 seconds\nFormat: Vertical 9:16\nVisual style: Dark, cinematic 3D animation. Consistent character and realistic environments.\n\nNarration:\n\nAt 2:13 AM, Daniel received a message from his own phone number.\n\nIt said: "Don\'t turn around."\n\nHe laughed, thinking it was a glitch.'
const ROTEIRO = 'HOOK: [Pexels: dark bedroom phone glow] At 2:13 AM, Daniel got a message from himself.\n\nMICRO REWARD 1: [Pexels: phone screen closeup] It said: "Don\'t turn around." He laughed, thinking it was a glitch.\n\nPAYOFF: [Pexels: phone camera pale face] He opened his camera, saw a face. Last message: "I was protecting you."'

function rodar(mutante) {
  const baseTexto = mutante ? execFileSync('git', ['show', `${BASE}:lib/cinematic/sceneStyle.ts`], { encoding: 'utf8' }) : null
  const load = createOfflineLoader({ source: (p, s) => (mutante && p.replace(/\\/g, '/').endsWith('lib/cinematic/sceneStyle.ts') ? baseTexto : s) })
  const SS = load('lib/cinematic/sceneStyle.ts')
  const casos = []
  const caso = (nome, ok) => casos.push({ nome, ok: !!ok })

  // ESCUROS — têm de sair do molde alegre
  const real = SS.deriveStyleAnchor(`${ROTEIRO}\n${IDEIA}`, ', energetic, natural, documentary')
  caso('E1 caso real: look 3D mantido', real.look === 'animated3d')
  caso('E2 caso real: sem "bright saturated"', !/bright saturated|soft rounded/.test(real.lookPhrase))
  caso('E3 caso real: luz baixa e sombra', /low-key|deep shadows/.test(real.lookPhrase))
  caso('E4 caso real: "energetic" sai do sufixo', !/energetic/i.test(real.suffix) && /suspenseful, moody/.test(real.suffix))
  caso('E5 caso real: o resto do estilo do cliente fica', /natural, documentary/.test(real.suffix))
  const es = SS.deriveStyleAnchor('Un cortometraje de animación 3D de terror: la casa abandonada.')
  caso('E6 espanhol "animación 3D de terror" escuro', es.look === 'animated3d' && !/bright saturated/.test(es.lookPhrase))
  const pt = SS.deriveStyleAnchor('Animação 3D sombria sobre um farol assombrado.')
  caso('E7 português "animação 3D sombria" escuro', pt.look === 'animated3d' && /low-key/.test(pt.lookPhrase))
  const tom = SS.deriveStyleAnchor('Pixar style short. Tone: dark. A robot alone in a ruined city.')
  caso('E8 "Tone: dark" escuro', /low-key/.test(tom.lookPhrase))

  // INTOCADOS — byte a byte o molde de sempre
  caso('I1 Pixar alegre segue alegre', SS.deriveStyleAnchor('Pixar style story of a happy robot who loves flowers').lookPhrase === ALEGRE)
  caso('I2 "dark hair" não é tom escuro', SS.deriveStyleAnchor('A 3D animated adventure of a girl with dark hair and a red kite').lookPhrase === ALEGRE)
  caso('I3 infantil com "scary" segue alegre', SS.deriveStyleAnchor('3D animated bedtime story for kids: a scary shadow turns out to be a kitten').lookPhrase === ALEGRE)
  caso('I4 "not scary" segue alegre', SS.deriveStyleAnchor('A cute 3D animation, not scary at all, about a dragon baking bread').lookPhrase === ALEGRE)
  const fotoTerror = SS.deriveStyleAnchor('A haunted lighthouse documentary, horror mood', ', energetic')
  caso('I5 terror fotorreal: intocado (outro conserto cuida)', fotoTerror.look === 'photoreal' && fotoTerror.suffix.endsWith(', energetic'))
  const pixarSuf = SS.deriveStyleAnchor('Pixar style story of a happy robot', ', energetic, bright')
  caso('I6 sufixo do 3D alegre intocado', pixarSuf.suffix.endsWith(', energetic, bright'))
  return casos
}

const real = rodar(false)
const mut = rodar(true)
let falhas = 0
for (const c of real) { console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.nome}`); if (!c.ok) falhas++ }
const escurosNoMutante = mut.filter((c) => c.nome.startsWith('E'))
const intocadosNoMutante = mut.filter((c) => c.nome.startsWith('I'))
const mutanteVermelho = escurosNoMutante.some((c) => !c.ok)
const intocadosIguais = intocadosNoMutante.every((c) => c.ok)
console.log(`  ${mutanteVermelho ? 'ok  ' : 'FAIL'} M mutante (sceneStyle de ${BASE}) reprova ${escurosNoMutante.filter((c) => !c.ok).length} de ${escurosNoMutante.length} casos escuros`)
console.log(`  ${intocadosIguais ? 'ok  ' : 'FAIL'} M casos intocados já passavam antes (o conserto não mudou nada neles)`)
if (!mutanteVermelho) falhas++
if (!intocadosIguais) falhas++
console.log(`${real.length + 2 - falhas} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
