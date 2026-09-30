// KINEO-ESTRELA-DO-FILME-2026-09-29 — PROVA SEM GASTAR: o roteiro "Aquiles" de 35 s (pt e en) pela montagem real da estrada
// clássica do Kling 2.5 em verbatim, até o pedido ao edit — sem fal, sem OpenAI, sem banco, sem crédito.
//
// Roda o código de verdade (transpilado aqui): parseUserScript → decidirFormato + formatoComEstrela → deriveStyleAnchor /
// deriveStoryCharacter → fichaDaEstrela → kling25VerbatimPlan (planos de 5/10 s que cabem a fala) → kling25VisualHint (a pista
// da cena) → buildClassicVisualPrompt (character_story com a ficha) → kling25ApplyShotAxis → planoDaEstrela → buildEstrelaEditInput.
// O que NÃO roda aqui (precisa de rede): o supervisor fala×imagem (GPT, reescreve a pista em inglês antes do still) e o
// contrato de cena. Então isto é o caminho de RESERVA (supervisor fora do ar) — o pior caso para achar o protagonista.
// Uso: node scripts/prova-estrela-aquiles-2026-09-29.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8')
const cache = {}
function carrega(p) {
  if (cache[p]) return cache[p]
  const js = ts.transpileModule(rd(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  cache[p] = m.exports
  const mapa = {
    './imageReference': 'lib/imageReference.ts', '../aspect': 'lib/aspect.ts', './sceneStyle': 'lib/cinematic/sceneStyle.ts', './visualMode': 'lib/cinematic/visualMode.ts',
  }
  new Function('module', 'exports', 'require', 'process', js)(m, m.exports, (n) => { if (mapa[n]) return carrega(mapa[n]); throw new Error(`import inesperado em ${p}: ${n}`) }, process)
  cache[p] = m.exports
  return m.exports
}
const E = carrega('lib/estrelaDoFilme.ts')
const P = carrega('lib/scriptParser.ts')
const V = carrega('lib/cinematic/visualMode.ts')
const S = carrega('lib/cinematic/sceneStyle.ts')
const K = carrega('lib/cinematic/klingShots.ts')
const VP = carrega('lib/cinematic/visualPromptPolicy.ts')

const ROTEIROS = {
  pt: 'Meu amigo nunca tinha segurado uma lança. Mas na praia de Troia, ele virou Aquiles. O sol nasce sobre mil navios gregos. Ele veste a armadura de bronze, aperta o escudo e encara as muralhas. Os troianos gritam do alto das torres. Aquiles corre pela areia, mais rápido que qualquer flecha. Heitor sai pelo portão para enfrentar o maior guerreiro da Grécia. O duelo dura segundos. Quando a poeira baixa, só um continua de pé. E a lenda diz que o único ponto fraco dele estava no calcanhar.',
  en: 'My friend had never held a spear. But on the beach of Troy, he became Achilles. The sun rises over a thousand Greek ships. He straps on the bronze armor, grips his shield and stares at the walls. The Trojans shout from the towers. Achilles sprints across the sand, faster than any arrow. Hector walks out of the gate to face the greatest warrior of Greece. The duel lasts seconds. When the dust settles, only one is still standing. And the legend says his only weakness was his heel.',
}
const PEDIDO_TELA = { pt: 'Meu amigo lutando na guerra de Troia como Aquiles, forte, bolado.', en: 'My friend fighting in the Trojan War as Achilles, strong and fierce.' }
const FOTOS = ['https://<supabase>/storage/v1/object/sign/renders/images/<uid>/refs/<uuid-1>.jpg?token=…(15 min)']
const DURACAO = 35
const MOTOR = 'kling'

for (const [lingua, roteiro] of Object.entries(ROTEIROS)) {
  const historia = `${roteiro}`
  const parsed = P.parseUserScript(historia)
  const formatoSem = V.decidirFormato(historia, false)
  const formato = E.formatoComEstrela(formatoSem, true)
  const style = S.deriveStyleAnchor(historia, '')
  const storyChar = S.deriveStoryCharacter(historia)
  const ficha = E.fichaDaEstrela(`${PEDIDO_TELA[lingua]} ${historia}`, storyChar)
  const plano = K.kling25VerbatimPlan(parsed.narration, { durationSeconds: DURACAO, wordsPerSecond: 2.6 })
  const cenas = plano.chunks.map((fala, i) => ({ fala, visual: K.kling25VisualHint(fala), seconds: plano.seconds[i] }))
  const policy = { mode: formato.modo, style, character: ficha, aspect: '9:16' }
  const prompts = cenas.map((c, i) => K.kling25ApplyShotAxis(VP.buildClassicVisualPrompt(c.visual, { ...policy, eraSuffix: '', opening: i === 0 }), i))
  const pe = E.planoDaEstrela(cenas.map((c, i) => ({ prompt: prompts[i], visual: c.visual })), ficha, true, `${PEDIDO_TELA[lingua]} ${historia}`)
  const d = E.decideEstrelaRequest({ raw: { paths: ['images/11111111-2222-4333-8444-555555555555/refs/00000001-aaaa-4bbb-8ccc-dddddddddddd.jpg'], consent: true }, engine: MOTOR, userId: '11111111-2222-4333-8444-555555555555', visible: true, anchorEnabled: true })
  console.log(`\n══════ ${lingua.toUpperCase()} · Kling 2.5 · ${DURACAO} s · verbatim · ${parsed.narration.split(/\s+/).length} palavras ══════`)
  console.log(`pedido: ${d.ok && d.ativa ? 'ACEITO' : 'RECUSADO'} · sobretaxa +${E.estrelaSobretaxa(MOTOR, DURACAO)} cr (cobrada ANTES do débito, junto dos ${DURACAO} s do motor)`)
  console.log(`formato: ${formatoSem.modo} → ${formato.modo}`)
  console.log(`nomes do papel: ${JSON.stringify(E.nomesDoProtagonista(`${PEDIDO_TELA[lingua]} ${historia}`))}`)
  console.log(`ficha: ${ficha}`)
  console.log(`planos: [${plano.seconds.join(', ')}] s`)
  for (const [i, c] of cenas.entries()) {
    const p = pe[i]
    console.log(`\n  cena ${i + 1} (${c.seconds} s) → ${p.protagonista ? 'EDIT com a estrela (fal-ai/nano-banana-pro/edit)' : 'still de hoje (FLUX dev), sem rosto'}`)
    console.log(`    fala:   ${c.fala}`)
    if (p.protagonista) {
      const inp = E.buildEstrelaEditInput(p.prompt, FOTOS, '9:16')
      console.log(`    edit:   aspect=${inp.aspect_ratio} · image_urls=${inp.image_urls.length} foto(s) da própria conta · prompt=${inp.prompt.length} chars`)
      console.log(`    prompt: ${inp.prompt.replace(/\n+/g, ' ⏎ ').slice(0, 260)}…`)
      console.log(`            …${inp.prompt.slice(-230).replace(/\n+/g, ' ⏎ ')}`)
    }
  }
  const n = pe.filter((p) => p.protagonista).length
  console.log(`\n  resumo ${lingua}: ${n}/${pe.length} cenas vão ao edit com o rosto · custo fal da estrela ≈ US$ ${(n * 0.15).toFixed(2)} (a US$ 0,15/imagem) · cobrado +${E.estrelaSobretaxa(MOTOR, DURACAO)} cr`)
}
