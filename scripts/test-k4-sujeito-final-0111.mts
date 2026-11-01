// KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — guardião das melhorias "vai tudo" do fundador (01/11), com os pedidos REAIS do revisor:
// (1) Kling 4 grátis: o sujeito central do pedido ("o avião C-54 que sumiu", "criança com caneta 3D", "vida sob o gelo") aparece em
//     pelo menos 1 cena do multi_prompt — checagem determinística antes do POST pago, corrige (não bloqueia), ≤ 512, relato no claim;
// (2) FINAL_FRACO: o escritor (modo IA) reprova fim em pergunta/clima/eco do HOOK; a última cena mostra a revelação da última fala.
// Controles: pedido sem objeto central, pessoa real, romance, "Use my script as is" intocado.
// Rodar: npx tsx scripts/test-k4-sujeito-final-0111.mts
import { readFileSync } from 'node:fs'
import { buildClassicVisualPrompt } from '@/lib/cinematic/visualPromptPolicy'
import { deriveStyleAnchor } from '@/lib/cinematic/sceneStyle'
import { promptDaCenaKling4, KLING4_ORCAMENTO_DA_CAMADA, KLING4_PROMPT_MAX } from '@/lib/cinematic/cenaKling4'
import { buildKling4TrialInput } from '@/lib/kling4Trial'
import { sujeitoObrigatorio, exigirSujeitoNoKling4, promptMostraOSujeito, comSujeitoNaCena } from '@/lib/cinematic/sujeitoObrigatorio'
import { finalFracoDoRoteiro, ultimaFraseDoRoteiro, comRevelacaoNoFim, revelacaoDaFala, problemaDoFinal } from '@/lib/cinematic/finalResposta'
import { ehIdeiaSolta } from '@/lib/meta95/ideiaNoEscritor'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const len = (s: string) => Array.from(s).length
const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const k4De = (pedido: string, visuais: string[]) => {
  const style = deriveStyleAnchor(pedido, 'cinematic_ai')
  return visuais.map((v, i) => promptDaCenaKling4(buildClassicVisualPrompt(v, { mode: 'documentary_faceless', style, aspect: '9:16', opening: i === 0 } as never), style, i))
}

// ── (1a) o avião C-54 — narração real do filme (manobiayousaf, 1º filme, nota 5) ──
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
ok(k4Aviao.every((p) => !promptMostraOSujeito(p, sujeitoObrigatorio({ pedido: 'o avião C-54 que sumiu', falas: falasAviao })!)), '(1a) caso real: nenhum dos 3 prompts mostrava o avião')
const stillsAviao = ['https://x/s1.png', 'https://x/s2.png', 'https://x/s3.png']
const corrAviao = exigirSujeitoNoKling4({ pedido: 'o avião C-54 que sumiu', falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
ok(corrAviao.relato.corrigido && corrAviao.relato.cena !== null, `(1a) corrigido na cena ${corrAviao.relato.cena}`)
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
const semStill = exigirSujeitoNoKling4({ pedido: 'o avião C-54 que sumiu', falas: falasAviao, prompts: k4Aviao })
ok(semStill.relato.cena === 1 && !semStill.relato.keyframe_removido, '(1a) sem imagens (texto puro): a cena cuja fala cita o avião (1) é a corrigida')

// ── (1b) a criança com a caneta 3D — pedido real (BG, 1º filme, nota 5) ──
const pedidoCaneta = 'A child skillfully and enthusiastically crafts a colorful 3D car with a 3D pen, layer by layer, on a wooden desk'
const falasCaneta = ['Layer by layer, a tiny car is born from melted plastic.', 'Wheels, doors, a shiny roof — every line is drawn in the air.', 'And in the end, the little car is ready to roll!']
const k4Caneta = k4De(pedidoCaneta, ['Macro shot of melted colorful plastic strands forming a tiny car shape on a wooden desk', 'Close-up of tiny plastic wheels and doors taking shape in the air', 'A finished colorful 3D-printed toy car rolling across a wooden desk'])
const sCaneta = sujeitoObrigatorio({ pedido: pedidoCaneta, falas: falasCaneta })
ok(sCaneta?.tipo === 'pessoa' && sCaneta.frase === 'a child holding a 3D printing pen', `(1b) sujeito = "${sCaneta?.frase}" (a criança COM a caneta; o carro 3D é o que ela faz, não o sujeito)`)
ok(sujeitoObrigatorio({ pedido: 'criança com caneta 3D fazendo um carrinho', falas: [] })?.frase === 'a child holding a 3D printing pen', '(1b) o mesmo pedido em português')
const corrCaneta = exigirSujeitoNoKling4({ pedido: pedidoCaneta, falas: falasCaneta, prompts: k4Caneta })
ok(corrCaneta.relato.corrigido && corrCaneta.prompts.some((p) => promptMostraOSujeito(p, sCaneta!)), `(1b) a criança com a caneta entra (cena ${corrCaneta.relato.cena})`)
ok(corrCaneta.relato.cena === 3, '(1b) nenhuma fala cita a criança: vai para a última cena (o desfecho)')
ok(!promptMostraOSujeito('A child smiles at a toy car', sCaneta!), '(1b) só a criança sem a caneta não conta como presente')

// ── (1c) vida sob o gelo — pedido real (victorr, BR, 1º filme, nota 6) ──
const falasGelo = ['Debaixo de três quilômetros de gelo, um oceano escuro espera.', 'Nenhuma luz chega lá embaixo, e a água nunca congela.', 'E mesmo assim, ali, a vida existe.']
const k4Gelo = k4De('vida sob o gelo', ['Aerial shot of an endless white ice sheet under a pale sky', 'Dark blue water beneath a thick ice ceiling, faint light', 'Aerial shot of an endless white ice sheet at dusk'])
const sGelo = sujeitoObrigatorio({ pedido: 'vida sob o gelo', falas: falasGelo })
ok(sGelo?.tipo === 'criatura' && /creatures swimming beneath the ice/.test(sGelo.frase), `(1c) sujeito = "${sGelo?.frase}"`)
const corrGelo = exigirSujeitoNoKling4({ pedido: 'vida sob o gelo', falas: falasGelo, prompts: k4Gelo })
ok(corrGelo.relato.cena === 3 && /living creatures swimming beneath the ice/.test(corrGelo.prompts[2]), '(1c) o desfecho (a vida debaixo do gelo) entra na última cena')

// ── (1d) já presente / orçamento apertado ──
const comAviao = ['Photoreal film. Low-angle shot. A silver C-54 airplane flies low over snowy peaks. Mouth closed, no speaking.', ...k4Aviao.slice(1)]
const jaTem = exigirSujeitoNoKling4({ pedido: 'o avião C-54 que sumiu', falas: falasAviao, prompts: comAviao })
ok(jaTem.relato.ja_presente && !jaTem.relato.corrigido && jaTem.prompts.every((p, i) => p === comAviao[i]), '(1d) o avião já em cena: nada muda (só o relato)')
const longo = `Photoreal film. ${'Two men in dark suits argue over a crumpled map beside a rain-streaked window, '.repeat(5)}no readable text, letters, numbers, labels or signage Mouth closed, no speaking.`
const apertado = comSujeitoNaCena(longo, 'a C-54 Skymaster airplane', 0)
ok(len(apertado) <= KLING4_ORCAMENTO_DA_CAMADA && apertado.includes('Main subject clearly visible in frame: a C-54 Skymaster airplane.') && apertado.endsWith('no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'), `(1d) prompt cheio: o sujeito entra, o corpo encolhe e a cauda fica (${len(apertado)})`)

// ── controles ──
for (const pedido of ['5 dicas para economizar dinheiro', 'Por que o céu é azul?', 'O que a NASA nunca anunciou sobre Marte']) {
  const c = exigirSujeitoNoKling4({ pedido, falas: falasAviao.slice(0, 1).map(() => 'Some facts.'), prompts: k4Aviao })
  ok(c.relato.sujeito === null && !c.relato.corrigido && c.prompts.every((p, i) => p === k4Aviao[i]), `(controle) pedido sem objeto central "${pedido}": nada muda`)
}
for (const pedido of ['Como Albert Einstein descobriu a relatividade', 'A vida de Napoleão Bonaparte em Waterloo', 'Amelia Earhart, the pilot who vanished']) {
  ok(sujeitoObrigatorio({ pedido, falas: [] }) === null, `(controle) pessoa real "${pedido}": nunca vira "clearly visible" aqui (regra do elenco)`)
}
ok(sujeitoObrigatorio({ pedido: 'uma menina se apaixona por um vampiro', falas: [], pessoaPermitida: false }) === null, '(controle) romance (pessoaPermitida=false): criança nunca vira sujeito')
ok(sujeitoObrigatorio({ pedido: 'a girl falls in love with her best friend', falas: [] }) === null, '(controle) "girl" num pedido adulto não vira "a child"')

// ── (2) escritor: o fim entrega o que o gancho prometeu ──
const nasaFraco = `HOOK: [Pexels: mars surface rover] What did NASA never announce about Mars?
MICRO REWARD 1: [Pexels: mars rover dust] In 2014, Curiosity's sensors spiked tenfold in a single crater.
MICRO REWARD 2: [Pexels: lab data screens] The readings vanished weeks later, and came back every Martian summer.
PAYOFF: [Pexels: red planet night] Some secrets are bigger than one planet... and NASA is still watching.`
const nasaPergunta = nasaFraco.replace('and NASA is still watching.', 'so what is NASA really hiding?')
const nasaEco = nasaFraco.replace('Some secrets are bigger than one planet... and NASA is still watching.', "And that's what NASA never told you about Mars.")
const nasaBom = nasaFraco.replace('Some secrets are bigger than one planet... and NASA is still watching.', 'The spikes were methane... a gas that on Earth comes mostly from living things.\nFollow for more space secrets!')
ok(finalFracoDoRoteiro(nasaFraco) === 'clima', '(2) "…and NASA is still watching." = clima (o caso real do Seedance 62 s)')
ok(finalFracoDoRoteiro(nasaPergunta) === 'pergunta', '(2) fim em pergunta solta reprova')
ok(finalFracoDoRoteiro(nasaEco) === 'repete_gancho', '(2) fim que só repete o HOOK reprova')
ok(finalFracoDoRoteiro(nasaBom) === null && /living things/.test(ultimaFraseDoRoteiro(nasaBom) ?? ''), '(2) revelação concreta passa; o CTA "Follow for more" depois dela não conta como última frase')
ok(finalFracoDoRoteiro('GANCHO: O que existe debaixo do gelo?\nPAYOFF: O mistério continua.') === 'clima', '(2) português: "O mistério continua." reprova')
ok(finalFracoDoRoteiro('HOOK: ¿Qué hay bajo el hielo?\nPAYOFF: Bajo el hielo de Europa hay un océano con el doble de agua que la Tierra.') === null, '(2) espanhol com revelação concreta passa')
ok(/LAST sentence of the PAYOFF/.test(problemaDoFinal('clima')), '(2) o pedido de correção diz o que falta')
const escritor = rd('app/api/generate-script/route.ts')
ok(/KINEO-FINAL-RESPOSTA-0111: the LAST spoken sentence of the PAYOFF IS the concrete answer itself/.test(escritor), '(2) o prompt do escritor exige a revelação como última frase')
ok(/const finalFraco = finalFracoDoRoteiro\(script\)/.test(escritor) && /\|\| leuADescricao\(script\) \|\| finalFraco\)/.test(escritor) && /problems\.push\(problemaDoFinal\(finalFraco\)\)/.test(escritor), '(2) fim fraco entra na MESMA nova tentativa do escritor (sem chamada a mais quando o roteiro é bom)')
ok(/!payoffIsEmpty\(t\) && !finalFracoDoRoteiro\(t\)/.test(escritor), '(2) entre as duas versões do filme curto, a que revela vence')

// ── (2) descritor: a última cena mostra a revelação ──
const fimPrompt = 'Film visual medium: photorealistic live-action. Slow push-in on a red desert at dusk, thin haze over distant hills. Mouth closed, no speaking.'
const fim = comRevelacaoNoFim(fimPrompt, 'The spikes were methane... a gas that on Earth comes mostly from living things. Follow for more space secrets!')
ok(fim.aplicada && fim.prompt.startsWith('Film visual medium: photorealistic live-action. Final moment of the story, clearly shown: a gas that on Earth comes mostly from living things. Slow push-in'), `(2) a revelação entra logo depois da trava do meio ("${fim.revelacao}")`)
ok(revelacaoDaFala('Is it alive? Nobody can say. Follow for more!') === 'Nobody can say', '(2) a revelação ignora CTA e pergunta')
ok(!comRevelacaoNoFim('Film visual medium: photoreal. Macro shot of methane gas bubbles rising from living microbes in red soil.', 'The spikes were methane from living microbes.').aplicada, '(2) cena que já mostra a revelação fica como está')
ok(!comRevelacaoNoFim(fimPrompt, 'Os picos eram metano, um gás que na Terra vem de seres vivos.').aplicada, '(2) fala em outra língua: o código não mistura línguas no prompt (a regra do descritor cuida)')
ok(!comRevelacaoNoFim('Film visual medium: x. Final moment of the story, clearly shown: a party. Kids dance.', 'Then a slumber party with all her friends at home.').aplicada, '(2) o eixo de desfecho já aplicado (then/finally) não é duplicado')

// ── a rota: descritor, última cena, checagem antes do POST e claim ──
const rota = rd('app/api/generate-video-cinematic/route.ts')
ok(/- KINEO-FINAL-RESPOSTA-0111: when the opening narration promises an answer/.test(rota) && /- KINEO-K4-SUJEITO-0111: the central subject the topic asks for/.test(rota), '(rota) o descritor de cenas recebe as 2 regras novas')
const iFim = rota.indexOf('comRevelacaoNoFim(classicScenePrompts[ultima]'), iElenco = rota.indexOf('KINEO-ELENCO-EPOCA falhou, prompts seguem'), iK4 = rota.indexOf('const kling4Prompts = classicScenePrompts.map')
ok(iFim > iElenco && iFim < iK4, '(rota) a revelação entra depois do elenco/época e antes dos prompts do Kling 4 (e do POST)')
const iSujeito = rota.indexOf('exigirSujeitoNoKling4({ pedido: intake.text'), iSubmit = rota.indexOf('submit: () => submitKling4TrialVideo({')
ok(iSujeito > iK4 && iSujeito < iSubmit, '(rota) a checagem do sujeito roda depois dos prompts do Kling 4 e ANTES do POST pago')
ok(/kling4Prompts\[i\] = kling4Sujeito\.prompts\[i\]/.test(rota) && /kling4ApprovedStills\[i\] = kling4Sujeito\.stills\[i\] \?\? null/.test(rota), '(rota) o POST, o plano assinado e o refazer leem os MESMOS prompts/imagens corrigidos')
ok(/sujeito_obrigatorio: kling4Sujeito\?\.relato \?\? null/.test(rota), '(rota) o claim kling4_trial grava sujeito_obrigatorio (e se foi corrigido)')
ok(/pessoaPermitida: !romanceAdulto\.ativo/.test(rota) && /kling4TrialCandidate && !desenhoInfantil\.ativo \? exigirSujeitoNoKling4/.test(rota), '(rota) romance não ganha criança; desenho infantil (o Leo) fica com a regra dele')

// ── "Use my script as is" continua literal ──
ok(!ehIdeiaSolta({ prompt: falasAviao.join(' '), scriptMode: 'verbatim' }), '(as is) roteiro com "Use my script as is" nunca passa pelo escritor (o fim é o da pessoa)')
const antes = JSON.stringify(falasAviao)
exigirSujeitoNoKling4({ pedido: 'o avião C-54 que sumiu', falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
comRevelacaoNoFim(fimPrompt, falasAviao[2])
ok(JSON.stringify(falasAviao) === antes, '(as is) nenhuma das duas camadas toca a fala — só o prompt da imagem')

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
