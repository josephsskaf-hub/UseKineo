// KINEO-CONSISTENCIA-SER-3010 — guardião sem rede: ser não humano (robô, dragão…) mantém o MESMO desenho em toda cena.
// Caso real: "The Robot Who Learned to Love" (nikolmishukov, 29/10) — o robô mudava de modelo a cada cena.
import { prepararQualidadeDoFilme } from '../lib/cinematic/filmQuality'
import { deriveStyleAnchor } from '../lib/cinematic/sceneStyle'
import { semDescricaoConcorrente, canonicaComDesenhoFixo } from '../lib/cinematic/juizFicha'
let ok = 0, falhas = 0
const check = (nome: string, cond: boolean) => { if (cond) { ok++; console.log(`ok   ${ok + falhas} ${nome}`) } else { falhas++; console.log(`FAIL ${ok + falhas} ${nome}`) } }
const R = `The Robot Who Learned to Love\n\nA tiny discarded robot collects broken toys and repairs them for lonely children. One day, its own battery begins to die. A little girl discovers it and gives it the one thing it never had: a home.\n\nEnding: The robot shuts down, but the little girl's teddy bear suddenly lights up with the robot's tiny heart-shaped LED`
const prompts = ['Opening shot: a small rusty robot sorting broken toys in a dim workshop', 'A shiny silver humanoid robot repairs a teddy bear on a workbench', 'A little girl finds the robot lying in the rain', 'Close-up of the robot battery light blinking red']
const falas = ['This robot had one day left to live.', 'It repaired toys for lonely children.', 'A little girl discovers it.', 'Its own battery begins to die.']
const q = prepararQualidadeDoFilme({ prompts, falas, contextoOriginal: R, contextoFiltro: R, modo: 'character_story', tagFaceless: false, style: deriveStyleAnchor(R) })
check('"small rusty robot" sai da cena 1', !/small rusty robot/i.test(q.prompts[0]))
check('"shiny silver humanoid robot" sai da cena 2', !/shiny silver humanoid robot/i.test(q.prompts[1]))
const clausulas = q.prompts.map((p) => /consistent design: (the robot[^.]*)\./.exec(p)?.[1] ?? '')
check('toda cena com o robô tem a MESMA ficha', clausulas.every((c) => c && c === clausulas[0]))
check('a ficha fixa a anatomia e o mesmo desenho', /metallic articulated body/.test(clausulas[0]) && /exact same design, size and colours/.test(clausulas[0]))
check('as palavras do cliente continuam na ficha', /"tiny discarded robot"/.test(clausulas[0]))
check('a menina (gente) não ganha anatomia de robô', !/consistent design: the little girl[^.]*metallic/.test(q.prompts[2]))
check('não come gente: "the little girl finds the robot" fica igual', semDescricaoConcorrente('the little girl finds the robot', 'robot') === 'the little girl finds the robot')
check('artigo sem adjetivo fica igual', semDescricaoConcorrente('a robot waves', 'robot') === 'a robot waves')
check('ficha comum (não literal) não muda', canonicaComDesenhoFixo({ tipo: 'criatura', nucleo: 'robot', canonica: 'Robo, a red robot' }) === 'Robo, a red robot')
check('gente nunca muda', canonicaComDesenhoFixo({ tipo: 'humano', nucleo: 'girl', canonica: 'the girl, exactly as the author wrote: "little girl"' }) === 'the girl, exactly as the author wrote: "little girl"')
console.log(`${falhas ? '🔴' : '🟢'} consistencia-ser-3010: ${ok}/${ok + falhas}`)
if (falhas) process.exit(1)
