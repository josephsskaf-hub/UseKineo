// KINEO-CENA-SEM-GENTE-1411 [CEO 14/11, lote 1 dos vídeos de teste da madrugada: casos C e D] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com planos REAIS do claim (30 dias):
//   (C) o plano que descreve gente de papel ("fourteen young airmen", "scientists on a boat", "a commanding officer") deixa de ganhar
//       "No people, no human figures and no faces anywhere in this shot."; o plano sem gente continua ganhando; referência e posse não contam;
//   (D) o plano que o código marcou sem gente perde a trava de época longa ("every person, building, street…") e ganha a curta; o plano com
//       gente fica com a longa; o Kling 4 tira as duas da ação, como sempre tirou a longa;
//   (E) a rota usa o ajuste do elenco; o interruptor desliga tudo;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/personagemAjuste.ts'
const globals = { AbortController, setTimeout, clearTimeout }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null, arq = ARQ) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === arq ? mutar(lf(text)) : text) })

const ERA = ', period piece set strictly in the year 1937: every person, building, street, vehicle and object belongs to that exact time — period clothing, period architecture and period transport only, as it really looked then'
const SEM = 'No people, no human figures and no faces anywhere in this shot.'
// planos reais (claim, 30 dias) que saíam "sem gente" e TÊM gente
const COM_GENTE = [
  'A low-angle shot captures fourteen young airmen in navy flight suits and leather helmets boarding five Avenger torpedo bombers under a bright sky.', // 2f34daf3, Flight 19
  'Close-up of scientists on a boat, equipped with satellite tags, scanning the calm waters of the Galápagos Islands with determination.',
  'Aerial shot revealing archaeologists carefully digging at an old cemetery in Pień, Poland, focused on grave number seventy-five, dirt flying in the air.',
  'Close-up of skeletal remains with a researcher examining them, highlighting the unknown cause of death.',
  'Close-up of astronauts filling out forms in microgravity, with the forms floating around them.',
  'A busy professional in a dimly lit room, looking at a dirty Range Rover through a window, with a sense of urgency.',
  'A wide shot of the fridge in the dimly lit kitchen, blaring classical music, with startled neighbors peering through their windows.',
  'A commanding officer stands with a serious expression, gesturing to close the landing zone as gunfire erupts in the background.',
  'A historical setting showing a group of veterans in military uniforms standing together, looking determined.',
  'A sweeping shot of a vast farmland in spring, showcasing farmers planting seeds in rich, dark soil under a clear sunny sky.',
  'A wide-angle shot of a farmer\'s market bustling with activity on a Tuesday, vendors shouting and exchanging goods.',
  'Close-up of the expert examining a fossil, with a blurred diagram of chemical echoes in the background.',
  // revisão independente 14/11 (v2, itens 1 e 3): o plano do roteiro de validação e os papéis que faltavam
  'Ten young mechanics in grey overalls push the silver twin-engine plane onto the runway.',
  'Mechanics of the air force repair the engine in a hangar.', // revisão 14/11: papel + "of" + GRUPO de gente é gente
  'Two clergymen walk slowly to the village church.',
  'Lumberjacks fell a giant pine in the snowy forest.',
  'Cowboys ride across the dusty plain at sunset.',
  'Laborers lay the railroad tracks under the hot sun.',
  'Pilots climb into their cockpits on the carrier deck.',
  'Dockworkers unload crates at the busy harbor.',
]
// planos reais sem gente (têm de continuar ganhando a cláusula) + as armadilhas da regra nova
const SEM_GENTE = [
  'Wide shot of Howland Island, a tiny sandy strip in the ocean, with the silver twin-engine plane flying above it.', // a7def2bc
  'A serene shot of a memorial honoring veterans, adorned with flags, under a clear sky, as the sun sets, inviting reflection on sacrifice and gratitude.',
  'A close-up of a digital display showing one candidate ahead by ten votes, with a tense atmosphere in a voting venue.',
  'Setting: the ruins of Pompeii, Italy (ancient Roman stone streets and ruined villas, Mount Vesuvius looming behind). A weathered wooden cupboard stands in a dimly lit room.',
  'Wide shot of the deserted deck of the Mary Celeste, sails fully raised, the sun casting long shadows on the empty space where the crew once stood.',
  'The supermarket entrance opens, and a potato in a manager\'s suit stands silhouetted, as all vegetables freeze in shock.',
  'Potato manager in suit at entrance; dramatic lighting, wide shot, authoritative presence.',
  'A wide shot of an empty farmer\'s market at dawn, stalls covered with tarps.',
  'A macro shot of a talisman and a specimen jar on a German oak table.',
  'A close-up of an ottoman beside a Doberman sleeping on the rug.',
  // revisão independente 14/11 (lote 1, item 5): o sufixo aberto -man/-men e os papéis largos tiravam o "No people" destes
  'A Sherman tank rolls through the empty ruined village.',
  'An ancient dolmen on a windswept hill.',
  'Cayman Islands coastline at sunset.',
  'A snowman in a quiet garden.',
  'A human skull on a wooden desk.',
  'An adult bald eagle perched on a branch.',
  'Native flowers bloom on the prairie.',
  'Rain on the streets of Bremen.',
  'A vintage Pullman car at the station.',
  'Mount Rushmore with four presidents carved into the granite.',
  'the General Sherman tree is older than you think', // do corpus
  'A marble bust of an emperor on a stone pedestal.', // ("emperor penguin" não serve: o pinguim já é "alguém" no detector de sempre)
  'A statue of a pharaoh in the desert.',
  'The mechanics of an old pocket watch.',
]
const plano = (acao, era = false) => `Film visual medium: photorealistic, ultra-detailed. ${acao}${era ? ERA : ''}, 9:16 vertical framing`

function provas(L) {
  const erros = []
  const m = L(ARQ), fq = L('lib/cinematic/filmQuality.ts'), st = L('lib/cinematic/sceneStyle.ts')
  const ajusta = (acao, era) => m.ajustarPromptsDoElenco({ prompts: [plano(acao, era)], visuals: [acao], falas: [''], elenco: [] })
  // (C)
  for (const a of COM_GENTE) {
    const r = ajusta(a, true)
    if (r.prompts[0].includes(SEM) || r.semGente.length) erros.push(`C plano com gente saiu "sem gente": ${a.slice(0, 60)}`)
    if (!r.prompts[0].includes(ERA)) erros.push(`C plano com gente perdeu a época longa: ${a.slice(0, 60)}`)
  }
  for (const a of SEM_GENTE) {
    const r = ajusta(a, false)
    if (!r.prompts[0].includes(SEM) || r.semGente.join() !== '1') erros.push(`C plano sem gente perdeu a cláusula: ${a.slice(0, 60)}`)
  }
  // (D)
  const ilha = ajusta(SEM_GENTE[0], true).prompts[0]
  if (/every person, building, street/.test(ilha) || !ilha.includes(`period piece set strictly in the year 1937: ${m.EPOCA_SEM_GENTE}`) || !ilha.includes(SEM)) erros.push('D a ilha sem gente ainda leva a época que lista gente e prédio: ' + ilha.slice(-260))
  if (m.epocaSemGente(m.epocaSemGente(plano('x', true))) !== m.epocaSemGente(plano('x', true)) || m.epocaSemGente(plano('x')) !== plano('x')) erros.push('D epocaSemGente não é idempotente ou mexe em plano sem época')
  // o Kling 4 tira a época curta da ação (a época vai curta na frente), como tira a longa
  const style = st.deriveStyleAnchor('photorealistic')
  const k4 = fq.promptCurtoDoFilmeKling4(ilha, style)
  if (k4.includes(m.EPOCA_SEM_GENTE) || !/1937/.test(k4)) erros.push('D o Kling 4 leva a frase curta inteira na ação ou perdeu o ano: ' + k4)
  // o interruptor
  if (m.cenaSemGenteLigada('off') || !m.cenaSemGenteLigada() || m.CENA_SEM_GENTE_1411 !== 'all') erros.push('interruptor')
  return erros
}

const base = provas(carrega())
checa(`C e D verdes nos planos reais${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
// desligado = byte a byte o de antes
{
  const L = carrega((s) => s.replace("export const CENA_SEM_GENTE_1411: ModoCenaSemGente = 'all'", "export const CENA_SEM_GENTE_1411: ModoCenaSemGente = 'off'"))
  const m = L(ARQ)
  const r1 = m.ajustarPromptsDoElenco({ prompts: [plano(COM_GENTE[0], true)], visuals: [COM_GENTE[0]], falas: [''], elenco: [] })
  const r2 = m.ajustarPromptsDoElenco({ prompts: [plano(SEM_GENTE[0], true)], visuals: [SEM_GENTE[0]], falas: [''], elenco: [] })
  checa('desligado: o airmen volta a ser "sem gente" e a ilha volta à época longa (byte a byte o de antes)', r1.prompts[0].includes(SEM) && r2.prompts[0].includes(ERA) && !r2.prompts[0].includes(m.EPOCA_SEM_GENTE))
}
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
checa('E a rota passa os prompts clássicos pelo ajuste do elenco (onde C e D moram)', rota.includes('ajustarPromptsDoElenco({ prompts: classicScenePrompts'))
const MUTANTES = [
  ['C: sem a gente de papel', ARQ, (s) => s.replace("if (cenaSemGenteLigada() && visualTemGenteDePapel(vDaCena)) return out", "if (false) return out")], // reancorado: KINEO-COMENTARIO-NAO-E-CENA-1411 lê o plano sem a oração de comentário
  ['C: "airmen" (composto em -men) não conta', ARQ, (s) => s.replace("const COMPOSTOS_DE_GENTE = 'airm[ae]n|", "const COMPOSTOS_DE_GENTE = '")],
  ['C: volta o sufixo aberto -man/-men (Sherman, dolmen, Bremen viram gente)', ARQ, (s) => s.replace('|${COMPOSTOS_DE_GENTE})(?![', '|${COMPOSTOS_DE_GENTE}|\\\\p{L}{2,}(?:man|men))(?![')],
  ['C: "mechanics" só no singular (os mecânicos do roteiro de validação saem "sem gente")', ARQ, (s) => s.replace('|mechanics?|pilots?|', '|mechanic|pilots?|')],
  ['C: "the mechanics of a watch" vira gente (sem a exceção do "of")', ARQ, (s) => s.replace('if (PAPEL_ABSTRATO_RE.test(m[0]) && /^\\s+of\\s/iu.test(v.slice((m.index ?? 0) + m[0].length)) && ', 'if (false && ')],
  ['C: "Mechanics of the air force" sai sem gente (sem a exceção do grupo)', ARQ, (s) => s.replace("&& !/^\\s+of\\s+(?:the\\s+)?(?:[\\p{L}-]+\\s+)?(?:force|", "&& !/^NUNCA(?:force|")],
  ['C: sem pilots, cowboys, lumberjacks, laborers, dockworkers', ARQ, (s) => s.replace('|pilots?|lumberjacks?|cowboys?|cowgirls?|labou?rers?|dockworkers?|dockers?|porters?', '')],
  ['C: voltam humans, adults, natives, presidents (caveira, águia, flores, Rushmore viram gente)', ARQ, (s) => s.replace("|refugees?|immigrants?|settlers?|colonists?'", "|refugees?|immigrants?|settlers?|colonists?|natives?|adults?|humans?|presidents?'")],
  ['C: a referência ("honoring veterans") conta como gente', ARQ, (s) => s.replace('if (REFERENCIA_ANTES_RE.test(v.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0))) continue', '')],
  ['C: a posse ("farmer\'s market") conta como gente', ARQ, (s) => s.replace("(?![\\\\p{L}\\\\p{N}])(?!['’]s)`, 'giu')", "(?![\\\\p{L}\\\\p{N}])`, 'giu')")],
  ['C: a negação de gente ("deserted") não vence', ARQ, (s) => s.replace("if (!v.trim() || SEM_GENTE_RE.test(v)) return false", "if (!v.trim()) return false")],
  ['D: a época longa fica no plano sem gente', ARQ, (s) => s.replace('if (cenaSemGenteLigada()) out = epocaSemGente(out)', '')],
  ['D: a época sai inteira (o ano some)', ARQ, (s) => s.replace("(_m, cabeca: string) => `${cabeca}: ${EPOCA_SEM_GENTE}`", "() => ''")],
  ['D: o Kling 4 não tira a frase curta', 'lib/cinematic/filmQuality.ts', (s) => s.replace('|only the things this shot describes, each exactly as it looked at that time)', ')')],
]
for (const [nome, arq, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(arq, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn, arq)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
