// KINEO-PROMPT-DO-MOTOR-1411 · KINEO-LUGAR-DA-FALA-1411 (v) · KINEO-CENA-SEM-GENTE-1411 v5 [revisor independente 14/11, item D da CEO] — guardião.
// Prova OFFLINE, EXECUTANDO o código real:
//   (1) o ensaio de US$ 0 devolve o texto que vai ao MOTOR (prompt_do_motor): as mesmas funções da rota, na mesma ordem (eixos do grátis →
//       trava da folha → corte do Kling 4), sobre uma cópia; e a rota, depois do ensaio, segue com as mesmas três etapas na mesma ordem;
//   (2) deserto de passagem (o árido num plano só) não vira o lugar do filme; o Racetrack (2 planos) e Layla e Qais (2 planos) seguem;
//   (3) "the mechanics of the garage door" não é gente; "Mechanics of the garage work on a car" e "of the air force" seguem gente;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const PED = 'lib/cinematic/pessoaDoPedido.ts', AJ = 'lib/cinematic/personagemAjuste.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null, arq = PED) => createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout }, source: (rel, text) => (mutar && rel === arq ? mutar(lf(text)) : text) })

const RACETRACK_PLANOS = ['A wide shot of Racetrack Playa, showcasing heavy stones resting at the end of long, curving trails in the cracked mud.', 'A time-lapse perspective of heavy stones moving across the cracked lakebed at Racetrack Playa.', 'A close-up of a thin sheet of ice forming on the shallow water, sunlight glinting off the surface as it begins to crack.', 'A wide shot of floating ice panels gently pushing heavy rocks along the cracked lakebed.']
const LAYLA_PLANOS = ['A vast desert landscape stretches under a starry sky, two figures far apart.', 'A heartbroken man seen in silhouette from behind, standing alone in the desert, looking lost and desolate.', 'A close-up of two hands almost touching.']
const PASSAGEM = ['A caravan of trucks drives across the desert at dawn.', 'A close-up of a driver gripping the wheel.', 'A mechanic wipes his hands on a rag.', 'A phone buzzes on a dashboard.']

function provasLugar(L) {
  const erros = []
  const m = L(PED)
  if (m.lugarAridoDosPlanos(RACETRACK_PLANOS) !== 'the cracked lakebed') erros.push('2 Racetrack perdeu o leito: ' + m.lugarAridoDosPlanos(RACETRACK_PLANOS))
  if (m.lugarAridoDosPlanos(LAYLA_PLANOS) !== 'the desert') erros.push('2 Layla e Qais perdeu o deserto: ' + m.lugarAridoDosPlanos(LAYLA_PLANOS))
  if (m.lugarAridoDosPlanos(PASSAGEM) !== null) erros.push('2 o deserto de passagem foi para todas as cenas: ' + m.lugarAridoDosPlanos(PASSAGEM))
  return erros
}
function provasGente(L) {
  const erros = []
  const A = L(AJ)
  if (A.visualTemGenteDePapel('A close-up of the mechanics of the garage door, springs and cables in motion.')) erros.push('3 "the mechanics of the garage door" virou gente')
  if (!A.visualTemGenteDePapel('Mechanics of the garage work on a vintage car.') || !A.visualTemGenteDePapel('Mechanics of the air force repair a bomber.')) erros.push('3 os mecânicos de verdade deixaram de ser gente')
  if (A.visualTemGenteDePapel('The mechanics of an old watch.')) erros.push('3 "the mechanics of an old watch" virou gente')
  return erros
}

const l = provasLugar(carrega()), g = provasGente(carrega())
checa(`(2) deserto de passagem${l.length ? ': ' + l.join(' · ') : ''}`, l.length === 0)
checa(`(3) garage door${g.length ? ': ' + g.join(' · ') : ''}`, g.length === 0)

// (1) o texto do motor: a rota devolve prompt_do_motor com as etapas na ordem da rota, e a execução das mesmas funções bate com o depois do ensaio
const rota = lf(fs.readFileSync(ROTA, 'utf8'))
const iEnsaio = rota.indexOf('const motor1411 = ((): { prompts: string[]; kling4: string[] | null; etapas: string[] } => {')
const iRetorno = rota.indexOf("prompt_do_motor: { etapas: motor1411.etapas, cenas: motor1411.prompts.map((p, i) => ({ cena: i + 1, still_e_clipe: p, ...(motor1411.kling4 ? { kling4: motor1411.kling4[i] } : {}) })) }")
const corpo = iEnsaio >= 0 ? rota.slice(iEnsaio, rota.indexOf('})()', iEnsaio)) : ''
const ordem = ['eixosDoFilmeGratis(ps, styleAnchor)', 'garantirFichasNoPrompt(ps[c.indice]', 'promptDaCenaKling4(p, styleAnchor, i, true)'].map((s) => corpo.indexOf(s))
checa('(1) o ensaio devolve prompt_do_motor, montado ANTES do retorno, com eixos → trava da folha → corte do Kling 4', iEnsaio > 0 && iRetorno > iEnsaio && ordem.every((x) => x > 0) && ordem[0] < ordem[1] && ordem[1] < ordem[2] && !/classicScenePrompts\[[^\]]+\]\s*=/.test(corpo))
const iDepoisEixos = rota.indexOf('if (kling4TrialCandidate) classicScenePrompts.splice(0, classicScenePrompts.length, ...eixosDoFilmeGratis(classicScenePrompts, styleAnchor))')
const iDepoisTrava = rota.indexOf('for (const c of cenasTravaP) if (c.nomes.length > 0) classicScenePrompts[c.indice] = garantirFichasNoPrompt(classicScenePrompts[c.indice], elencoP.filter((f) => c.nomes.includes(f.nome)))')
const iDepoisK4 = rota.indexOf('if (kling4TrialCandidate) for (let i = 0; i < kling4Prompts.length; i++) kling4Prompts[i] = promptDaCenaKling4(classicScenePrompts[i], styleAnchor, i, true)')
checa('(1) a rota, depois do ensaio, aplica as mesmas três etapas na mesma ordem (se mudar lá, este guardião avisa)', iRetorno > 0 && iDepoisEixos > iRetorno && iDepoisTrava > iDepoisEixos && iDepoisK4 > iDepoisTrava)

const provaRota = (L, txt) => { const c = txt.slice(txt.indexOf('const motor1411'), txt.indexOf('})()', txt.indexOf('const motor1411'))); return c.includes('eixosDoFilmeGratis(ps, styleAnchor)') && !/classicScenePrompts\[[^\]]+\]\s*=/.test(c) ? [] : ['1 o ensaio perdeu uma etapa ou escreve no filme'] }
const MUTANTES = [
  [ROTA, null, '(1) o ensaio sem os eixos do grátis', (s) => s.replace("if (kling4TrialCandidate) { ps = eixosDoFilmeGratis(ps, styleAnchor); etapas.push('eixos_do_filme_gratis') }", '')],
  [ROTA, null, '(1) o ensaio escreve no vetor do filme', (s) => s.replace('let ps = [...classicScenePrompts]', 'let ps = classicScenePrompts; classicScenePrompts[0] = ps[0]')],
  [PED, provasLugar, '(2) o árido num plano só volta a valer', (s) => s.replace("tipoDoLugar(m[0]) === 'desert') }).length < 2) return null", "tipoDoLugar(m[0]) === 'desert') }).length < 1) return null")],
  [PED, provasLugar, '(2) a régua dos 2 planos conta qualquer plano', (s) => s.replace("return [...t.matchAll(lugarSoRe())].some((m) => !aridoComNomeProprio(t, m) && tipoDoLugar(m[0]) === 'desert') }).length < 2", 'return true }).length < 2')],
  [AJ, provasGente, '(3) "garage door" volta a ser gente', (s) => s.replace('(?!\\s+(?:doors?|openers?|gates?|locks?|windows?|roofs?|floors?|lifts?|walls?|lights?|shelf|shelves|tools?|machines?|engines?)(?![\\p{L}]))', '')],
]
for (const [arq, prova, nome, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(arq, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = prova ? prova(carrega(fn, arq)) : provaRota(null, fn(src)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
