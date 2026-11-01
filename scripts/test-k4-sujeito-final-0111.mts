// KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — guardião das melhorias "vai tudo" do fundador (01/11), com os pedidos REAIS do revisor:
// (1) Kling 4 grátis: o sujeito central do pedido ("o avião C-54 que sumiu", "criança com caneta 3D", "vida sob o gelo") aparece em
//     pelo menos 1 cena do multi_prompt — checagem determinística antes do POST pago, corrige (não bloqueia), ≤ 512, relato no claim;
// (2) FINAL_FRACO: o escritor (modo IA) reprova fim em pergunta/eco do HOOK/promessa sem fato; a última cena mostra a revelação da última fala.
// v2 (revisão adversarial da leva 2): o sujeito sai SÓ do pedido original — no modo IA a rota recebe o ROTEIRO pronto (HOOK/PAYOFF com
// pistas [Pexels: …]) e a ideia vem em `original_idea`; sem pedido confiável, nada muda. Cada exemplo da revisão é um caso abaixo,
// com roteiros no FORMATO REAL do /api/generate-script ("HOOK (0-2s): [Pexels: …] fala").
// Controles: pedido sem objeto central, pessoa real, romance, "Use my script as is" intocado.
// Rodar: npx tsx scripts/test-k4-sujeito-final-0111.mts
import { readFileSync } from 'node:fs'
import { buildClassicVisualPrompt } from '@/lib/cinematic/visualPromptPolicy'
import { deriveStyleAnchor } from '@/lib/cinematic/sceneStyle'
import { promptDaCenaKling4, KLING4_ORCAMENTO_DA_CAMADA, KLING4_PROMPT_MAX } from '@/lib/cinematic/cenaKling4'
import { buildKling4TrialInput } from '@/lib/kling4Trial'
import { sujeitoObrigatorio, exigirSujeitoNoKling4, promptMostraOSujeito, comSujeitoNaCena, pedidoOriginalDoSujeito, pedidoCurto } from '@/lib/cinematic/sujeitoObrigatorio'
import { finalFracoDoRoteiro, ultimaFraseDoRoteiro, comRevelacaoNoFim, revelacaoDaFala, problemaDoFinal, revelacaoTemNomeDeGente } from '@/lib/cinematic/finalResposta'
import { ehIdeiaSolta } from '@/lib/meta95/ideiaNoEscritor'
import { parseUserScript } from '@/lib/scriptParser'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const len = (s: string) => Array.from(s).length
const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const k4De = (pedido: string, visuais: string[]) => {
  const style = deriveStyleAnchor(pedido, 'cinematic_ai')
  return visuais.map((v, i) => promptDaCenaKling4(buildClassicVisualPrompt(v, { mode: 'documentary_faceless', style, aspect: '9:16', opening: i === 0 } as never), style, i))
}
/** O que a ROTA faz: o pedido original a partir do body (prompt + script_mode + original_idea) e das falas finais. */
const pedidoDaRota = (body: { prompt: string; script_mode?: string; original_idea?: string }, falas: string[]) =>
  pedidoOriginalDoSujeito({ prompt: body.prompt, ideiaSolta: ehIdeiaSolta({ prompt: body.prompt, scriptMode: body.script_mode }), scriptMode: body.script_mode, originalIdea: body.original_idea, falas })
/** As falas como a rota as tem (o texto falado de cada seção, sem pistas). */
const falasDoRoteiro = (roteiro: string) => parseUserScript(roteiro).segments.map((s: { text?: string; voiceover?: string }) => String(s.voiceover ?? s.text ?? ''))
const sujeitoDaRota = (body: { prompt: string; script_mode?: string; original_idea?: string }, falas = falasDoRoteiro(body.prompt)) => {
  const ped = pedidoDaRota(body, falas)
  return ped.pedido ? sujeitoObrigatorio({ pedido: ped.pedido, falas }) : null
}
const idea = (texto: string, falas: string[] = []) => pedidoOriginalDoSujeito({ prompt: texto, ideiaSolta: true, scriptMode: 'ai', falas })

// ═══ (0) O FORMATO REAL: no modo IA a rota recebe o ROTEIRO (ALTA 1 da revisão) ═══
const roteiroCaneta = `HOOK (0-2s): [Pexels: 3d pen drawing plastic] This kid builds a car out of thin air.
PAYOFF: [Pexels: child toy car desk] Layer by layer, a 3D pen turned melted plastic into a toy car that actually rolls... in 40 minutes.`
const roteiroGelo = `HOOK (0-2s): [Pexels: antarctica ice sheet aerial] Under 3 kilometers of ice, something is moving.
PAYOFF: [Pexels: dark ocean water] In Lake Whillans, scientists found 4,000 kinds of microbes living in total darkness.`
const roteiroMarte = `HOOK (0-2s): [Pexels: mars surface rover] What did NASA never announce about Mars?
MICRO REWARD 1: [Pexels: mars rover dust] In 2014, Curiosity's sensors spiked tenfold in a single crater.
PAYOFF: [Pexels: red planet night] The spikes were methane... a gas that on Earth comes mostly from living things.`
const roteiroDinheiro = `HOOK (0-2s): [Pexels: luxury cars money] Rich people never do these 5 things with money.
MICRO REWARD 1: [Pexels: piggy bank coins] They pay themselves first, every single month.
PAYOFF: [Pexels: stock market chart] And they invest 20% before they spend a cent.`
const roteiroEinstein = `HOOK (0-2s): [Pexels: einstein portrait old photo] Einstein solved relativity by imagining a ride.
MICRO REWARD 1: [Pexels: steam train moving] He pictured himself on a train moving at the speed of light.
PAYOFF: [Pexels: clock tower] Time itself slowed down for the rider... that was special relativity.`
const roteiroAviao = `HOOK (0-2s): [Pexels: snowy mountains aerial] Vanished into thin air—70 years, zero leads.
PAYOFF: [Pexels: old airplane wreckage snow] In 1950, a C-54 Skymaster disappeared over the Yukon with 44 people aboard.`
ok(parseUserScript(roteiroCaneta).hasMarkers && !ehIdeiaSolta({ prompt: roteiroCaneta, scriptMode: 'ai' }), '(0) o roteiro do formato real tem marcadores: não é ideia solta')

// O DEFEITO: ler o roteiro como pedido (v1) tirava a criança, perdia o gelo e inventava rover/carro/trem. Agora sem original_idea: nada.
for (const [nome, roteiro] of [['caneta 3D', roteiroCaneta], ['gelo', roteiroGelo], ['Marte', roteiroMarte], ['dinheiro', roteiroDinheiro], ['Einstein', roteiroEinstein], ['avião', roteiroAviao]] as const) {
  const ped = pedidoDaRota({ prompt: roteiro, script_mode: 'ai' }, falasDoRoteiro(roteiro))
  ok(ped.pedido === null && ped.motivo === 'sem_pedido_original' && sujeitoDaRota({ prompt: roteiro, script_mode: 'ai' }) === null, `(0) roteiro "${nome}" SEM original_idea: sem pedido confiável, nenhum sujeito (fail-safe; nunca das pistas [Pexels])`)
}
// Com a ideia original que o /studio/create manda junto: o sujeito sai DELA.
ok(sujeitoDaRota({ prompt: roteiroCaneta, script_mode: 'ai', original_idea: 'criança com caneta 3D' })?.frase === 'a child holding a 3D printing pen', '(0) caneta 3D: com a ideia original, "a child holding a 3D printing pen" (a criança volta; a pista [Pexels: 3d pen] não manda)')
ok(sujeitoDaRota({ prompt: roteiroGelo, script_mode: 'ai', original_idea: 'vida sob o gelo' })?.frase === 'living creatures swimming beneath the ice', '(0) gelo: com a ideia original, a vida debaixo do gelo (antes: null)')
ok(sujeitoDaRota({ prompt: roteiroMarte, script_mode: 'ai', original_idea: 'O que a NASA nunca anunciou sobre Marte' }) === null, '(0) Marte: a pista [Pexels: mars surface rover] nunca vira "a rover" — o pedido não tem objeto central')
ok(sujeitoDaRota({ prompt: roteiroDinheiro, script_mode: 'ai', original_idea: '5 coisas que os ricos nunca fazem com dinheiro' }) === null, '(0) dinheiro: [Pexels: luxury cars money] nunca exige "a car"')
ok(sujeitoDaRota({ prompt: roteiroEinstein, script_mode: 'ai', original_idea: 'Como Albert Einstein descobriu a relatividade' }) === null, '(0) Einstein: o trem da fala/pista nunca vira "a train"')
ok(/C-54/.test(sujeitoDaRota({ prompt: roteiroAviao, script_mode: 'ai', original_idea: 'o avião C-54 que sumiu' })?.frase ?? ''), '(0) avião: com a ideia original, o avião C-54')
// Ideia solta crua (o servidor escreve o roteiro): ela mesma é o pedido.
ok(pedidoDaRota({ prompt: 'criança com caneta 3D', script_mode: 'ai' }, []).fonte === 'ideia_solta', '(0) ideia crua que chega sem marcadores: é o pedido original (fonte ideia_solta)')
// Fail-safes do pedido original
ok(pedidoDaRota({ prompt: roteiroAviao, script_mode: 'verbatim', original_idea: 'o avião C-54 que sumiu' }, falasDoRoteiro(roteiroAviao)).motivo === 'roteiro_da_pessoa', '(0) "Use my script as is": o texto é da pessoa, sem pedido separado — nada corrigido')
ok(pedidoDaRota({ prompt: roteiroCaneta, script_mode: 'ai', original_idea: roteiroCaneta }, falasDoRoteiro(roteiroCaneta)).motivo === 'ideia_original_invalida', '(0) original_idea que é um roteiro (marcadores/pistas): recusada')
ok(!pedidoCurto('HOOK: um avião') && !pedidoCurto('[Pexels: plane] o avião') && !pedidoCurto('a '.repeat(150)) && pedidoCurto('o avião C-54 que sumiu'), '(0) pedidoCurto: sem cabeçalho, sem colchete, ≤ 280 caracteres')
const falasVulcao = ['Mount Vesuvius erupted in the year 79 and buried Pompeii under meters of volcanic ash.', 'Thousands of Roman citizens were frozen in place, their bodies preserved as hollow molds.', 'Archaeologists poured plaster into the voids and recovered their final poses.']
ok(pedidoDaRota({ prompt: 'HOOK: [Pexels: volcano] x\nPAYOFF: [Pexels: ash] y', script_mode: 'ai', original_idea: 'five morning habits of Jeff Bezos billionaire routine' }, falasVulcao).motivo === 'ideia_original_discorda_da_fala', '(0) caixa velha de outro assunto (Bezos × Pompeia): discorda da narração, recusada')
const longaHistoria = 'Era uma vez um menino chamado Pipo que morava numa casa amarela perto do mar e todos os dias saía com o seu barco vermelho para pescar com o avô, até que numa manhã de neblina encontrou uma garrafa com um mapa antigo que apontava para uma ilha onde ninguém nunca tinha ido antes.'
ok(pedidoDaRota({ prompt: longaHistoria, script_mode: 'ai' }, []).motivo === 'ideia_longa', '(0) história longa colada (ideia solta > 280 caracteres): não é pedido curto, nada corrigido')

// ═══ (1a) o avião C-54 — narração real do filme (manobiayousaf, 1º filme, nota 5) ═══
const falasAviao = [
  'Vanished into thin air—70 years, zero leads. In 1950, a C-54 Skymaster disappeared over the Yukon wilderness.',
  'All 44 passengers were never seen again in those icy peaks.',
  'The mystery remains unsolved... a ghost flight... swallowed by time and nature.',
]
const visuaisAviao = [ // o que o descritor desenhou: 2 homens de terno, nenhum avião
  'Two men in dark suits study an old map in a dim 1950s office, cigarette smoke curling',
  'Snow-covered mountain peaks under a grey sky, slow aerial push-in',
  'Two men in suits stand at a window looking out at falling snow, somber mood',
]
const k4Aviao = k4De('o avião C-54 que sumiu', visuaisAviao)
for (const pedido of ['o avião C-54 que sumiu', 'A C-54 Skymaster disappeared over the Yukon wilderness in 1950']) {
  const s = sujeitoObrigatorio({ pedido, falas: falasAviao })
  ok(s?.tipo === 'veiculo' && /C-54/.test(s.frase) && /airplane/.test(s.frase), `(1a) "${pedido}" → sujeito veículo "${s?.frase}" (veículo, não pessoa)`)
}
ok(sujeitoObrigatorio({ pedido: 'A C-54 Skymaster disappeared over the Yukon wilderness in 1950', falas: falasAviao })?.frase === 'a C-54 Skymaster airplane', '(1a) o nome do modelo ("Skymaster") entra na frase')
ok(sujeitoObrigatorio({ pedido: 'o avião que sumiu no Yukon', falas: falasAviao })?.frase === 'a C-54 Skymaster airplane', '(1a) a fala só ENRIQUECE o avião que o pedido já pede (modelo C-54 Skymaster)')
ok(sujeitoObrigatorio({ pedido: 'o mistério do Yukon', falas: falasAviao }) === null, '(1a) modelo só na fala, pedido sem veículo: a fala nunca cria o sujeito')
ok(k4Aviao.every((p) => !promptMostraOSujeito(p, sujeitoObrigatorio({ pedido: 'o avião C-54 que sumiu', falas: falasAviao })!)), '(1a) caso real: nenhum dos 3 prompts mostrava o avião')
const stillsAviao = ['https://x/s1.png', 'https://x/s2.png', 'https://x/s3.png']
const corrAviao = exigirSujeitoNoKling4({ pedido: idea('o avião C-54 que sumiu', falasAviao), falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
ok(corrAviao.relato.corrigido && corrAviao.relato.cena !== null && corrAviao.relato.fonte_do_pedido === 'ideia_solta', `(1a) corrigido na cena ${corrAviao.relato.cena} (pedido: ${corrAviao.relato.fonte_do_pedido})`)
ok(corrAviao.relato.cena === 3, '(1a) a fala da cena 1 cita o avião mas ela tem imagem de abertura; a próxima que cita ("ghost flight") é a 3 — a abertura nunca perde a imagem')
ok(corrAviao.prompts.some((p) => /Main subject clearly visible in frame: an? C-54 airplane\./.test(p)), '(1a) a cena leva "Main subject clearly visible in frame: a C-54 airplane."')
ok(corrAviao.stills[0] === stillsAviao[0], '(1a) imagem de abertura intacta')
ok(corrAviao.stills[2] === null && corrAviao.relato.keyframe_removido, '(1a) a imagem-chave do meio desenhada sem o avião sai da cena corrigida')
ok(corrAviao.stills[1] === stillsAviao[1], '(1a) as outras imagens ficam')
ok(corrAviao.prompts.every((p) => len(p) <= KLING4_ORCAMENTO_DA_CAMADA), `(1a) todas dentro do orçamento da camada (${corrAviao.prompts.map(len).join(', ')} ≤ ${KLING4_ORCAMENTO_DA_CAMADA})`)
ok(corrAviao.prompts.every((p) => p.endsWith('Mouth closed, no speaking.')), '(1a) cauda "Mouth closed, no speaking." preservada')
const entradaAviao = buildKling4TrialInput(corrAviao.prompts, corrAviao.stills, { voiceovers: falasAviao, wordsPerSecond: 2.5 })
const shots = (entradaAviao.input.multi_prompt as Array<{ prompt: string }>)
ok(shots.every((s) => len(s.prompt) <= KLING4_PROMPT_MAX) && shots.some((s) => /C-54 airplane/.test(s.prompt)), '(1a) no corpo do POST (multi_prompt) o avião chega e todo shot ≤ 512')
ok(/text-directed shot/.test(shots[2].prompt) && !(entradaAviao.input.middle_image_urls as string[] | undefined)?.includes('https://x/s3.png'), '(1a) a cena corrigida vai dirigida por texto, sem a imagem antiga')
const semStill = exigirSujeitoNoKling4({ pedido: idea('o avião C-54 que sumiu', falasAviao), falas: falasAviao, prompts: k4Aviao })
ok(semStill.relato.cena === 1 && !semStill.relato.keyframe_removido, '(1a) sem imagens (texto puro): a cena cuja fala cita o avião (1) é a corrigida')
const semPedido = exigirSujeitoNoKling4({ pedido: pedidoDaRota({ prompt: roteiroAviao, script_mode: 'ai' }, falasAviao), falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
ok(!semPedido.relato.corrigido && semPedido.relato.sujeito === null && semPedido.relato.motivo_do_pedido === 'sem_pedido_original' && semPedido.prompts.every((p, i) => p === k4Aviao[i]) && semPedido.stills.every((s, i) => s === stillsAviao[i]), '(1a) roteiro sem original_idea: prompts e imagens byte a byte, relato diz por quê')

// ═══ (1b) a criança com a caneta 3D — pedido real (BG, 1º filme, nota 5) ═══
const pedidoCaneta = 'A child skillfully and enthusiastically crafts a colorful 3D car with a 3D pen, layer by layer, on a wooden desk'
const falasCaneta = ['Layer by layer, a tiny car is born from melted plastic.', 'Wheels, doors, a shiny roof — every line is drawn in the air.', 'And in the end, the little car is ready to roll!']
const k4Caneta = k4De(pedidoCaneta, ['Macro shot of melted colorful plastic strands forming a tiny car shape on a wooden desk', 'Close-up of tiny plastic wheels and doors taking shape in the air', 'A finished colorful 3D-printed toy car rolling across a wooden desk'])
const sCaneta = sujeitoObrigatorio({ pedido: pedidoCaneta, falas: falasCaneta })
ok(sCaneta?.tipo === 'pessoa' && sCaneta.frase === 'a child holding a 3D printing pen', `(1b) sujeito = "${sCaneta?.frase}" (a criança COM a caneta; o carro 3D é o que ela faz, não o sujeito)`)
ok(sujeitoObrigatorio({ pedido: 'criança com caneta 3D fazendo um carrinho', falas: [] })?.frase === 'a child holding a 3D printing pen', '(1b) o mesmo pedido em português')
const corrCaneta = exigirSujeitoNoKling4({ pedido: idea(pedidoCaneta, falasCaneta), falas: falasCaneta, prompts: k4Caneta })
ok(corrCaneta.relato.corrigido && corrCaneta.prompts.some((p) => promptMostraOSujeito(p, sCaneta!)), `(1b) a criança com a caneta entra (cena ${corrCaneta.relato.cena})`)
ok(corrCaneta.relato.cena === 3, '(1b) nenhuma fala cita a criança: vai para a última cena (o desfecho)')
ok(!promptMostraOSujeito('A child smiles at a toy car', sCaneta!), '(1b) só a criança sem a caneta não conta como presente')

// ═══ (1c) vida sob o gelo — pedido real (victorr, BR, 1º filme, nota 6) ═══
const falasGelo = ['Debaixo de três quilômetros de gelo, um oceano escuro espera.', 'Nenhuma luz chega lá embaixo, e a água nunca congela.', 'E mesmo assim, ali, a vida existe.']
const k4Gelo = k4De('vida sob o gelo', ['Aerial shot of an endless white ice sheet under a pale sky', 'Dark blue water beneath a thick ice ceiling, faint light', 'Aerial shot of an endless white ice sheet at dusk'])
const sGelo = sujeitoObrigatorio({ pedido: 'vida sob o gelo', falas: falasGelo })
ok(sGelo?.tipo === 'criatura' && /creatures swimming beneath the ice/.test(sGelo.frase), `(1c) sujeito = "${sGelo?.frase}"`)
const corrGelo = exigirSujeitoNoKling4({ pedido: idea('vida sob o gelo', falasGelo), falas: falasGelo, prompts: k4Gelo })
ok(corrGelo.relato.cena === 3 && /living creatures swimming beneath the ice/.test(corrGelo.prompts[2]), '(1c) o desfecho (a vida debaixo do gelo) entra na última cena')

// ═══ (1d) já presente / orçamento apertado ═══
const comAviao = ['Photoreal film. Low-angle shot. A silver C-54 airplane flies low over snowy peaks. Mouth closed, no speaking.', ...k4Aviao.slice(1)]
const jaTem = exigirSujeitoNoKling4({ pedido: idea('o avião C-54 que sumiu', falasAviao), falas: falasAviao, prompts: comAviao })
ok(jaTem.relato.ja_presente && !jaTem.relato.corrigido && jaTem.prompts.every((p, i) => p === comAviao[i]), '(1d) o avião já em cena: nada muda (só o relato)')
const longo = `Photoreal film. ${'Two men in dark suits argue over a crumpled map beside a rain-streaked window, '.repeat(5)}no readable text, letters, numbers, labels or signage Mouth closed, no speaking.`
const apertado = comSujeitoNaCena(longo, 'a C-54 Skymaster airplane', 0)
ok(len(apertado) <= KLING4_ORCAMENTO_DA_CAMADA && apertado.includes('Main subject clearly visible in frame: a C-54 Skymaster airplane.') && apertado.endsWith('no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'), `(1d) prompt cheio: o sujeito entra, o corpo encolhe e a cauda fica (${len(apertado)})`)

// ═══ (1e) léxico: fronteira de palavra e desambiguação (ALTA 2, MÉDIA 3 e BAIXA 6 da revisão) ═══
const nenhum: Array<[string, string]> = [
  ['O que Lula disse na ONU', 'Lula é pessoa, nunca "a giant squid"'],
  ['Como investir no Tesouro Direto', '"Tesouro Direto" é finanças, nunca "a treasure chest"'],
  ['Tesouro Selic ou CDB: onde render mais', 'Tesouro Selic é finanças'],
  ['Por que o corpo bebe tanta água', '"bebe" é o verbo beber, nunca "a child"'],
  ['5 things rich parents teach their kids about money', '"their kids": a criança é de quem fala'],
  ['5 things rich parents teach kids about money', 'conselho para pais: a criança não é a cena'],
  ['How to train your brain', '"train" verbo, nunca "a train"'],
  ['fight or flight response', '"fight or flight" não é avião'],
  ['A história secreta da SS Heinrich Himmler', 'SS nazista, nunca "a SS Heinrich Himmler ship"'],
  ['The SS Panzer divisions at Kursk', 'SS Panzer não é navio'],
  ['The I-95 crash that changed highway law', '"crash" de estrada, nunca "an I-95 airplane"'],
  ['Why loan sharks charge so much', 'loan shark não é tubarão'],
  ['Crypto whales are moving bitcoin', 'baleia de cripto não é baleia'],
  ['Rocket science explained simply', 'rocket science não é foguete'],
  ['O que a NASA nunca anunciou sobre Marte', 'sem objeto central'],
]
for (const [pedido, porque] of nenhum) ok(sujeitoObrigatorio({ pedido, falas: [] }) === null, `(1e) "${pedido}" → nenhum sujeito (${porque})`)
const certos: Array<[string, string]> = [
  ['the giant squid caught on camera', 'a giant squid'],
  ['a lula gigante filmada pela primeira vez', 'a giant squid'],
  ['O tesouro perdido dos piratas do Caribe', 'a treasure chest'],
  ['the ghost train of the Andes', 'a train'],
  ['Flight 19 vanished over the Bermuda Triangle', 'an airplane'],
  ['o bebê que fala', 'a child'],
  ['The SS Ourang Medan, the ship whose whole crew died at sea', 'an SS Ourang Medan ship'],
  ['The USS Thresher sank in 1963', 'a USS Thresher ship'],
  ['How the HMS Terror got lost in the Arctic ice', 'an HMS Terror ship'],
]
for (const [pedido, frase] of certos) ok(sujeitoObrigatorio({ pedido, falas: [] })?.frase === frase, `(1e) "${pedido}" → "${frase}" (artigo certo na sigla)`)
const sTesouro = sujeitoObrigatorio({ pedido: 'O tesouro perdido dos piratas do Caribe', falas: [] })!
ok(!promptMostraOSujeito('A pirate stands with one hand on his chest, looking at the sea', sTesouro) && promptMostraOSujeito('A wooden chest full of gold coins on the sand', sTesouro), '(1e) "hand on chest" não é baú do tesouro; "chest full of gold coins" é')
const sAviaoGen = sujeitoObrigatorio({ pedido: 'o avião que sumiu', falas: [] })!
ok(!promptMostraOSujeito('Jets of water burst from the geyser', sAviaoGen) && promptMostraOSujeito('A fighter jet streaks over the desert', sAviaoGen), '(1e) "jets of water" não é avião; "fighter jet" é')
ok(!promptMostraOSujeito('Two girls in their twenties laugh at a cafe', sCaneta!), '(1e) "girls" adultas não contam como a criança')

// ═══ controles ═══
for (const pedido of ['5 dicas para economizar dinheiro', 'Por que o céu é azul?', 'O que a NASA nunca anunciou sobre Marte']) {
  const c = exigirSujeitoNoKling4({ pedido: idea(pedido), falas: falasAviao.slice(0, 1).map(() => 'Some facts.'), prompts: k4Aviao })
  ok(c.relato.sujeito === null && !c.relato.corrigido && c.prompts.every((p, i) => p === k4Aviao[i]), `(controle) pedido sem objeto central "${pedido}": nada muda`)
}
for (const pedido of ['Como Albert Einstein descobriu a relatividade', 'A vida de Napoleão Bonaparte em Waterloo', 'Amelia Earhart, the pilot who vanished']) {
  ok(sujeitoObrigatorio({ pedido, falas: [] }) === null, `(controle) pessoa real "${pedido}": nunca vira "clearly visible" aqui (regra do elenco)`)
}
ok(sujeitoObrigatorio({ pedido: 'uma menina se apaixona por um vampiro', falas: [], pessoaPermitida: false }) === null, '(controle) romance (pessoaPermitida=false): criança nunca vira sujeito')
ok(sujeitoObrigatorio({ pedido: 'a girl falls in love with her best friend', falas: [] }) === null, '(controle) "girl" num pedido adulto não vira "a child"')

// ═══ (2) escritor: o fim entrega o que o gancho prometeu ═══
const nasaFraco = `HOOK (0-2s): [Pexels: mars surface rover] What did NASA never announce about Mars?
MICRO REWARD 1: [Pexels: mars rover dust] In 2014, Curiosity's sensors spiked tenfold in a single crater.
MICRO REWARD 2: [Pexels: lab data screens] The readings vanished weeks later, and came back every Martian summer.
PAYOFF: [Pexels: red planet night] Some secrets are bigger than one planet... and NASA is still watching.`
const nasaPergunta = nasaFraco.replace('and NASA is still watching.', 'so what is NASA really hiding?')
const nasaEco = nasaFraco.replace('Some secrets are bigger than one planet... and NASA is still watching.', "And that's what NASA never told you about Mars.")
const nasaBom = nasaFraco.replace('Some secrets are bigger than one planet... and NASA is still watching.', 'The spikes were methane... a gas that on Earth comes mostly from living things.\nFollow for more space secrets!')
const nasaCom = (fim: string) => nasaFraco.replace('Some secrets are bigger than one planet... and NASA is still watching.', fim)
ok(finalFracoDoRoteiro(nasaFraco) === 'clima', '(2) "…and NASA is still watching." = promessa sem fato novo (o caso real do Seedance 62 s; NASA já estava no HOOK)')
ok(finalFracoDoRoteiro(nasaPergunta) === 'pergunta', '(2) fim em pergunta solta reprova')
ok(finalFracoDoRoteiro(nasaEco) === 'repete_gancho', '(2) fim que só repete o HOOK reprova')
ok(finalFracoDoRoteiro(nasaBom) === null && /living things/.test(ultimaFraseDoRoteiro(nasaBom) ?? ''), '(2) revelação concreta passa; o CTA "Follow for more" depois dela não conta como última frase')
// MÉDIA 4 da revisão: frase concreta com fato, número ou lugar passa (cada falso positivo custava uma chamada a mais ao gpt-4o)
ok(finalFracoDoRoteiro(nasaCom('No one knew it then, but the spikes were methane, a gas made by living things.')) === null, '(2) "No one knew it then, but the spikes were methane…" passa (revelação depois do "but")')
ok(finalFracoDoRoteiro(nasaCom('The gold is still waiting in the hull, 3,800 meters down.')) === null, '(2) "The gold is still waiting in the hull, 3,800 meters down." passa (número)')
ok(finalFracoDoRoteiro(nasaCom('Buried in the Valley of the Kings, their tombs still remain unknown.')) === null, '(2) "…Valley of the Kings, their tombs still remain unknown" passa (lugar que o HOOK não tinha)')
ok(finalFracoDoRoteiro(nasaCom('Their tombs still remain unknown.')) === 'clima', '(2) a mesma promessa SEM fato nenhum continua reprovando')
ok(finalFracoDoRoteiro(nasaCom('The mystery remains unsolved... a ghost flight... swallowed by time and nature.')) === 'clima', '(2) a reticência é pausa: "The mystery remains unsolved… swallowed by time" é uma frase só e é clima')
ok(finalFracoDoRoteiro('GANCHO: O que existe debaixo do gelo?\nPAYOFF: O mistério continua.') === 'clima', '(2) português: "O mistério continua." reprova')
ok(finalFracoDoRoteiro('HOOK: ¿Qué hay bajo el hielo?\nPAYOFF: Bajo el hielo de Europa hay un océano con el doble de agua que la Tierra.') === null, '(2) espanhol com revelação concreta passa')
// BAIXA 7 da revisão: linha de fala que começa com "Ritmo…"/"Escalada…"/"Pagamento…" não é cabeçalho
const comRitmo = 'GANCHO: Por que o coração acelera no medo?\nPAYOFF: A adrenalina dispara em 2 segundos.\nRitmo de vida acelerado faz isso 40 vezes por dia.'
ok(ultimaFraseDoRoteiro(comRitmo) === 'Ritmo de vida acelerado faz isso 40 vezes por dia.', '(2) "Ritmo de vida…" (sem dois-pontos, minúscula) é fala, não cabeçalho: a última frase lida é ela')
ok(ultimaFraseDoRoteiro('HOOK: [Pexels: x] A pergunta.\nRITMO [Pexels: y] Rápido. Forte.\nPAYOFF: [Pexels: z] A resposta é 42.') === 'A resposta é 42.', '(2) "RITMO" em maiúsculas sem dois-pontos continua cabeçalho')
ok(/LAST sentence of the PAYOFF/.test(problemaDoFinal('clima')), '(2) o pedido de correção diz o que falta')
const escritor = rd('app/api/generate-script/route.ts')
ok(/KINEO-FINAL-RESPOSTA-0111: the LAST spoken sentence of the PAYOFF IS the concrete answer itself/.test(escritor), '(2) o prompt do escritor exige a revelação como última frase')
ok(/const finalFraco = colado\.pasted \? null : finalFracoDoRoteiro\(script\)/.test(escritor) && /\|\| leuADescricao\(script\) \|\| finalFraco\)/.test(escritor) && /problems\.push\(problemaDoFinal\(finalFraco\)\)/.test(escritor), '(2) fim fraco entra na MESMA nova tentativa do escritor (sem chamada a mais quando o roteiro é bom); roteiro colado da pessoa fica com o fim dela')
ok(/!payoffIsEmpty\(t\) && \(colado\.pasted \|\| !finalFracoDoRoteiro\(t\)\)/.test(escritor), '(2) entre as duas versões do filme curto, a que revela vence')

// ═══ (2) descritor: a última cena mostra a revelação ═══
const fimPrompt = 'Film visual medium: photorealistic live-action. Slow push-in on a red desert at dusk, thin haze over distant hills. Mouth closed, no speaking.'
const fim = comRevelacaoNoFim(fimPrompt, 'The spikes were methane... a gas that on Earth comes mostly from living things. Follow for more space secrets!', 'What did NASA never announce about Mars?')
ok(fim.aplicada && fim.prompt.startsWith('Film visual medium: photorealistic live-action. Final moment of the story, clearly shown: a gas that on Earth comes mostly from living things. Slow push-in'), `(2) a revelação entra logo depois da trava do meio ("${fim.revelacao}")`)
ok(revelacaoDaFala('Is it alive? The probe found water ice. Follow for more!') === 'The probe found water ice', '(2) a revelação ignora CTA e pergunta')
ok(!comRevelacaoNoFim('Film visual medium: photoreal. Macro shot of methane gas bubbles rising from living microbes in red soil.', 'The spikes were methane from living microbes.').aplicada, '(2) cena que já mostra a revelação fica como está')
ok(!comRevelacaoNoFim(fimPrompt, 'Os picos eram metano, um gás que na Terra vem de seres vivos.').aplicada, '(2) fala em outra língua: o código não mistura línguas no prompt (a regra do descritor cuida)')
ok(!comRevelacaoNoFim('Film visual medium: x. Final moment of the story, clearly shown: a party. Kids dance.', 'Then a slumber party with all her friends at home.').aplicada, '(2) o eixo de desfecho já aplicado (then/finally) não é duplicado')
// MÉDIA 5 da revisão: nunca crua com nome de gente, nunca frase de clima, sem o "And"
const musk = comRevelacaoNoFim(fimPrompt, 'And the man behind it all was Elon Musk.')
ok(!musk.aplicada && musk.motivo === 'nome_de_gente' && !musk.prompt.includes('Elon Musk'), '(2) "And the man behind it all was Elon Musk." NÃO entra no prompt (gente é do elenco/folha de personagem)')
ok(revelacaoTemNomeDeGente('the man behind it all was Elon Musk') && revelacaoTemNomeDeGente('it was Napoleon all along') && revelacaoTemNomeDeGente('a letter signed by President Lincoln') && !revelacaoTemNomeDeGente('a gas that on Earth comes mostly from living things'), '(2) nome completo, "was X" e título + nome = gente; "on Earth" não')
const fantasma = comRevelacaoNoFim(fimPrompt, falasAviao[2])
ok(!fantasma.aplicada && !fantasma.prompt.includes('swallowed by time'), '(2) fala fraca ("The mystery remains unsolved… swallowed by time and nature") não vira "clearly shown: swallowed by time and nature"')
const comE = comRevelacaoNoFim(fimPrompt, 'And the wreck was found 3,800 meters down, split in two.')
ok(comE.aplicada && comE.prompt.includes('clearly shown: the wreck was found 3,800 meters down, split in two.'), `(2) o "And" do começo sai da revelação ("${comE.revelacao}")`)
ok(revelacaoDaFala('No one knew it then, but the spikes were methane.') === 'the spikes were methane', '(2) a revelação é o que vem depois do "but"')

// ═══ a rota: descritor, última cena, checagem antes do POST e claim ═══
const rota = rd('app/api/generate-video-cinematic/route.ts')
ok(/- KINEO-FINAL-RESPOSTA-0111: when the opening narration promises an answer/.test(rota) && /- KINEO-K4-SUJEITO-0111: the central subject the topic asks for/.test(rota), '(rota) o descritor de cenas recebe as 2 regras novas')
const iFim = rota.indexOf('comRevelacaoNoFim(classicScenePrompts[ultima]'), iElenco = rota.indexOf('const elencoEpoca = prepararQualidadeDoFilme('), iRomance = rota.indexOf('if (romanceAdulto.ativo) { // KINEO-ROMANCE-ADULTO-2026-10-13'), iK4 = rota.indexOf('const kling4Prompts = classicScenePrompts.map')
ok(iFim > 0 && iFim < iElenco && iElenco < iRomance && iRomance < iK4, '(rota) a revelação entra ANTES do elenco/época (que a vê como qualquer cena), antes da moderação e dos prompts do Kling 4')
ok(/comRevelacaoNoFim\(classicScenePrompts\[ultima\], scenes\[ultima\]\?\.voiceover \?\? '', scenes\[0\]\?\.voiceover \?\? ''\)/.test(rota), '(rota) a revelação recebe o HOOK (cena 1) para medir fato novo')
const iSujeito = rota.indexOf('exigirSujeitoNoKling4({ pedido: pedidoOriginalDoSujeito('), iSubmit = rota.indexOf('submit: () => submitKling4TrialVideo({')
ok(iSujeito > iK4 && iSujeito < iSubmit, '(rota) a checagem do sujeito roda depois dos prompts do Kling 4 e ANTES do POST pago')
ok(!/exigirSujeitoNoKling4\(\{ pedido: intake\.text/.test(rota), '(rota) o roteiro (intake.text) nunca mais é passado como pedido')
ok(/pedidoOriginalDoSujeito\(\{ prompt: intake\.text, ideiaSolta: ehIdeiaSolta\(\{ prompt: intake\.text, scriptMode: body\.script_mode \}\) && !isSeriesContinuationPrompt\(intake\.text\), scriptMode: body\.script_mode, originalIdea: body\.original_idea, falas: kling4Timing\.voiceovers \}\)/.test(rota), '(rota) o pedido original = ideia solta crua ou body.original_idea (com as falas finais para a checagem de assunto)')
ok(/original_idea\?: string \}/.test(rota), '(rota) o contrato do body aceita original_idea (opcional; ausente = nada corrigido)')
ok(/kling4Prompts\[i\] = kling4Sujeito\.prompts\[i\]/.test(rota) && /kling4ApprovedStills\[i\] = kling4Sujeito\.stills\[i\] \?\? null/.test(rota), '(rota) o POST, o plano assinado e o refazer leem os MESMOS prompts/imagens corrigidos')
ok(/sujeito_obrigatorio: kling4Sujeito\?\.relato \?\? null/.test(rota), '(rota) o claim kling4_trial grava sujeito_obrigatorio (fonte do pedido e se foi corrigido)')
ok(/pessoaPermitida: !romanceAdulto\.ativo/.test(rota) && /kling4TrialCandidate && !desenhoInfantil\.ativo \? exigirSujeitoNoKling4/.test(rota), '(rota) romance não ganha criança; desenho infantil (o Leo) fica com a regra dele')

// ═══ o cliente: a ideia original só acompanha o roteiro que nasceu dela ═══
const cliente = rd('app/(dashboard)/generate/GenerateClient.tsx')
ok(/ideiaDoRoteiroRef\.current = \{ ideia: rawSource, roteiro: source \}/.test(cliente), '(cliente) o par ideia→roteiro é gravado quando o /api/generate-script devolve o roteiro')
ok(/\.\.\.\(ideiaDoRoteiroRef\.current && ideiaDoRoteiroRef\.current\.roteiro === trimmed \? \{ original_idea: ideiaDoRoteiroRef\.current\.ideia\.slice\(0, 600\) \} : \{\}\)/.test(cliente), '(cliente) original_idea só vai quando o roteiro despachado é EXATAMENTE o que nasceu da ideia (editou/trocou = vai sem ela)')

// ═══ "Use my script as is" continua literal ═══
ok(!ehIdeiaSolta({ prompt: falasAviao.join(' '), scriptMode: 'verbatim' }), '(as is) roteiro com "Use my script as is" nunca passa pelo escritor (o fim é o da pessoa)')
const antes = JSON.stringify(falasAviao)
exigirSujeitoNoKling4({ pedido: idea('o avião C-54 que sumiu', falasAviao), falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
comRevelacaoNoFim(fimPrompt, falasAviao[2])
ok(JSON.stringify(falasAviao) === antes, '(as is) nenhuma das duas camadas toca a fala — só o prompt da imagem')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
