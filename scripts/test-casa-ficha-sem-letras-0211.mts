// KINEO-CASA-FICHA-SEM-LETRAS-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo.
// Revisão dos 20 vídeos do dia da casa (Seedance 1.5, 60 s, "Use my script as is", nota 5,4): palavra solta virando imagem, época e lugar
// errados (São Pedro em 392, Capitólio na posse do JK, poste elétrico em Pompeia), placar/número inventado e o Trump na cena final.
// Prova: (1) a leitura do cenário (mock da chamada) é saneada e falha segura; (2) o prompt FINAL de uma cena clássica (o construtor real
// do Seedance 1.5) e de uma cena hollywood (H3/S25, sufixo real do router) leva o cenário e a proibição de letra/número/placar/figura
// pública; (3) o Kling 4 só recebe a versão compacta se couber nos 512; (4) a rota liga tudo isso nos pontos certos (leitura do arquivo).
// Em origin/main este arquivo nem carrega (lib/cinematic/cenarioDoFilme.ts não existe) e as leituras da rota reprovam.
// Rodar: node --import ./scripts/alias-loader.mjs scripts/test-casa-ficha-sem-letras-0211.mts
import { readFileSync } from 'node:fs'
import {
  lerCenarioDoFilme, cenarioSaneado, comCenarioDoFilme, semCenarioDoFilme, comCenarioNoKling4, regrasDoCenarioDoFilme,
  SEM_LETRAS_NEM_FIGURAS, SEM_NUMEROS_NEM_FIGURAS,
} from '../lib/cinematic/cenarioDoFilme'
import { buildClassicVisualPrompt } from '../lib/cinematic/visualPromptPolicy'
import { deriveStyleAnchor } from '../lib/cinematic/sceneStyle'
import { KLING4_ORCAMENTO_DA_CAMADA, promptDaCenaKling4 } from '../lib/cinematic/cenaKling4'

let ok = 0, falhas = 0
const check = (nome: string, cond: boolean) => { if (cond) { ok++; console.log(`ok   ${ok + falhas} ${nome}`) } else { falhas++; console.log(`FAIL ${ok + falhas} ${nome}`) } }
const lf = (t: string) => t.replace(/\r\n/g, '\n')
const len = (s: string) => Array.from(s).length

// ── 1. A leitura do cenário (UMA chamada, mock), saneada, com falha segura ──
const POMPEIA = 'In 79 AD, the people of Pompeii watched Vesuvius smoke for days. Bakers kept baking. Then the sky turned black, and the city was buried in ash for 1,700 years.'
const resposta = (content: string, status = 200) => (async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })) as unknown as typeof fetch
let corpo: any = null
const espiao = (async (_u: unknown, init: any) => { corpo = JSON.parse(init.body); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ setting: '  "Pompeii, Roman Empire, 79 AD; Roman townspeople."  ' }) } }] }), { status: 200 }) }) as unknown as typeof fetch
const lida = await lerCenarioDoFilme(POMPEIA, { apiKey: 'k', fetchImpl: espiao })
check('leitura devolve o cenário saneado (sem aspas e sem ponto final)', lida.cenario === 'Pompeii, Roman Empire, 79 AD; Roman townspeople' && lida.erro === null)
check('a chamada leva o roteiro INTEIRO e pede json_schema com temperatura 0', !!corpo && corpo.messages[1].content.includes('1,700 years') && corpo.response_format?.type === 'json_schema' && corpo.temperature === 0)
check('sem chave = null, sem chamada', (await lerCenarioDoFilme(POMPEIA, { apiKey: '', fetchImpl: (() => { throw Error('não devia chamar') }) as any })).cenario === null)
check('http 500 = null (falha segura)', (await lerCenarioDoFilme(POMPEIA, { apiKey: 'k', fetchImpl: resposta('x', 500), prazoTotalMs: 1500 })).cenario === null)
check('JSON inválido = null', (await lerCenarioDoFilme(POMPEIA, { apiKey: 'k', fetchImpl: resposta('isto não é json'), prazoTotalMs: 1500 })).cenario === null)
const pendura = ((_u: unknown, init: any) => new Promise((_r, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(Error('abort'), { name: 'AbortError' }))))) as unknown as typeof fetch
const lenta = await lerCenarioDoFilme(POMPEIA, { apiKey: 'k', fetchImpl: pendura, prazoMs: 500, prazoTotalMs: 900 })
check('prazo estourado = null, erro timeout', lenta.cenario === null && lenta.erro === 'timeout')
check('"unknown"/vazio não vira cenário', cenarioSaneado('unknown') === null && cenarioSaneado('') === null)
check('cenário longo é cortado em fronteira de palavra (≤ 180)', (cenarioSaneado('word '.repeat(80)) ?? '').length <= 180)

// ── 2. Estrada clássica: o prompt final de uma cena do Seedance 1.5 (construtor real) ──
const CENARIO = 'Pompeii, Roman Empire, 79 AD; Roman townspeople'
const style = deriveStyleAnchor(POMPEIA)
const classico = buildClassicVisualPrompt('Slow push-in on a bakery street at dusk as ash begins to fall', { mode: 'documentary_faceless', style, character: null, aspect: '9:16', opening: false })
const finalClassico = comCenarioDoFilme(classico, CENARIO)
check('clássico: o cenário do filme vai no prompt final', finalClassico.includes(`Setting of the whole film: ${CENARIO} — architecture, clothing, objects and technology true to that era and place.`))
check('clássico: a ação da cena continua sendo a 1ª frase', finalClassico.startsWith(classico.replace(/[\s,.]+$/, '')))
check('clássico: proíbe texto/letras/números/sinalização (sufixo de sempre) + placar e figura pública (novo)', /no readable text, letters, numbers, labels or signage/i.test(finalClassico) && finalClassico.includes(SEM_NUMEROS_NEM_FIGURAS) && /scoreboards/.test(finalClassico) && /never a recognisable politician or celebrity/.test(finalClassico))
check('idempotente (rodar 2x = mesmo texto)', comCenarioDoFilme(finalClassico, CENARIO) === finalClassico)
check('sem leitura (null): só a regra, nada de cenário inventado', !comCenarioDoFilme(classico, null).includes('Setting of the whole film') && comCenarioDoFilme(classico, null).includes(SEM_NUMEROS_NEM_FIGURAS))
check('prompt sem proibição de texto ganha a frase completa', comCenarioDoFilme('A wide shot of the stadium crowd', null).endsWith(SEM_LETRAS_NEM_FIGURAS) && /No text, letters, numbers, signs or scoreboards/.test(SEM_LETRAS_NEM_FIGURAS))

// ── 3. Estrada hollywood: H3/Omni/S25 (sem negative_prompt) e Kling 3, com o sufixo REAL do router ──
const router = lf(readFileSync(new URL('../lib/hollywood/router.ts', import.meta.url), 'utf8'))
const NO_TEXT_ROUTER = / No readable text anywhere in the scene: no phone[^']+/.exec(router)?.[0] ?? ''
check('router ainda tem o NO_TEXT_SUFFIX de sempre (base do caso hollywood)', NO_TEXT_ROUTER.length > 40)
const h3 = `Wide shot of a Roman street as ash falls, mouth closed, silent. Cinematography (match exactly): shot on 35mm.${NO_TEXT_ROUTER}`.replace(NO_TEXT_ROUTER, ' No readable text or lettering anywhere in the frame; period-accurate clothing and objects only.')
const finalH3 = comCenarioDoFilme(h3, CENARIO)
check('hollywood (H3/S25): cenário + número/placar + figura pública no prompt (motor sem negative_prompt)', finalH3.includes(`Setting of the whole film: ${CENARIO}`) && finalH3.includes(SEM_NUMEROS_NEM_FIGURAS))
const kling3 = `Medium shot, the host says: "Pompeii had no warning." Cinematography (match exactly): shot on 35mm.${NO_TEXT_ROUTER}`
check('hollywood (Kling 3): a proibição de texto do router não é duplicada, só completada', comCenarioDoFilme(kling3, CENARIO).split('No readable text').length === 2 && comCenarioDoFilme(kling3, CENARIO).includes(SEM_NUMEROS_NEM_FIGURAS))
check('planejador hollywood lê as MESMAS regras (helper compartilhado)', router.includes("import { regrasDoCenarioDoFilme } from '@/lib/cinematic/cenarioDoFilme'") && router.includes('${regrasDoCenarioDoFilme(null)}'))
const regras = regrasDoCenarioDoFilme(CENARIO)
check('regras do escritor: cenário, sentido (não a palavra solta), época/lugar, sem letras/figura pública', regras.includes(CENARIO) && /MEANS in the context of the whole script/.test(regras) && /never as a toy/.test(regras) && /keeps that person's gender, age and era/.test(regras) && /nothing built or invented later/.test(regras) && /scoreboards/.test(regras) && /politician or celebrity who is not named/.test(regras))

// ── 4. Kling 4 (512 por cena): compacto só se couber, com folga para o sujeito do pedido ──
const k4 = promptDaCenaKling4(semCenarioDoFilme(finalClassico, CENARIO), style, 0)
check('semCenarioDoFilme devolve exatamente o prompt de antes', semCenarioDoFilme(finalClassico, CENARIO) === classico.replace(/[\s,.]+$/, '') || semCenarioDoFilme(finalClassico, CENARIO) === classico)
const k4c = promptDaCenaKling4(finalClassico, style, 0) // a rota passa o prompt final (com a cauda longa) e o adaptador do Kling 4 a recompacta
check('Kling 4: o adaptador tira a cauda longa antes do corte (nada da frase longa nem da regra longa)', !k4c.includes('Setting of the whole film') && !k4c.includes(SEM_NUMEROS_NEM_FIGURAS) && k4c.startsWith(k4.replace(/ Mouth closed, no speaking.$/, '').replace(/[s,.]+$/, '')))
check('Kling 4: prompt sem a cauda segue byte a byte', promptDaCenaKling4(classico, style, 0) === k4)
check('Kling 4: dentro do orçamento (com folga de 60)', len(k4c) <= KLING4_ORCAMENTO_DA_CAMADA - 60 || k4c === k4)
check('Kling 4: o cenário entra quando cabe, antes da cauda "Mouth closed"', k4c.includes(`Setting: ${CENARIO}.`) && k4c.endsWith(' Mouth closed, no speaking.'))
const cheio = 'Photoreal film. ' + 'a crowded Roman street with bakers and carts, '.repeat(9) + 'Mouth closed, no speaking.'
check('Kling 4: prompt sem espaço fica igual (nunca corta a ação)', comCenarioNoKling4(cheio, CENARIO, KLING4_ORCAMENTO_DA_CAMADA) === cheio)

// ── 5. A rota liga a camada nos pontos certos ──
const rota = lf(readFileSync(new URL('../app/api/generate-video-cinematic/route.ts', import.meta.url), 'utf8'))
const iLeitura = rota.indexOf('const leituraDoCenario = lerCenarioDoFilme(prompt)')
const iHollywood = rota.indexOf('const hollywoodPath = wantsHollywood')
const iBuild = rota.indexOf('    // Build scenes\n')
check('rota: UMA leitura do roteiro, antes das duas estradas montarem cenas', iLeitura > 0 && rota.split('lerCenarioDoFilme(').length === 2 && iLeitura < iBuild && iHollywood < iLeitura)
check('rota: o descritor clássico (Seedance/Veo/Kling 2.5/Sora/Kling 4 grátis) lê as regras do cenário e o sujeito pelo sentido', rota.includes('- ${NO_TEXT_OBJECT_DIRECTION}\n${regrasDoCenarioDoFilme(null)}\n- Output ONLY valid JSON') && rota.includes('as MEANT in the context of the whole script') && !rota.includes('Anchor the shot on the LITERAL subject'))
const iSuperficie = rota.indexOf('classicScenePrompts[i] = comSuperficieSemTexto(classicScenePrompts[i])')
const iCenarioClassico = rota.indexOf('classicScenePrompts[i] = comCenarioDoFilme(classicScenePrompts[i], cenarioDoFilme)')
const iDryRunClassico = rota.indexOf('KINEO-DRYRUN-CLASSICO-2026-09-12 — O VALIDADOR DE $0 COBRE OS CLÁSSICOS')
const iStillClassico = rota.indexOf('const julgado = await julgarStillDoFilme({ indice: idx')
check('rota clássica: a cauda entra no vetor final, depois da superfície e antes do ensaio de $0, do still e do clipe', iSuperficie > 0 && iCenarioClassico > iSuperficie && iCenarioClassico < iDryRunClassico && iCenarioClassico < iStillClassico)
const iCenarioH = rota.indexOf('for (const cena of plan.scenes) cena.prompt = comCenarioDoFilme(cena.prompt, cenarioH)')
const iLacoH = rota.indexOf('      for (const [idx, hs] of plan.scenes.entries()) {')
const iSubmitH = rota.indexOf('() => submitToFal(scenePrompt, sceneModel, false, true, hs.seconds')
check('rota hollywood (Kling 3/H3/H3 Max/Omni/S25): a cauda entra no plano de cada cena logo antes do laço do despacho (still, contrato e POST nascem dele)', iCenarioH > 0 && iLacoH > iCenarioH && iLacoH - iCenarioH < 1200 && iSubmitH > iLacoH && rota.split('comCenarioDoFilme(').length === 4)
check('rota Kling 4: grátis/ensaio usam o vetor clássico (já com a cauda); o pago hollywood ganha a cauda antes do adaptador', rota.includes('const kling4Prompts = classicScenePrompts.map((p, i) => promptDaCenaKling4(p, styleAnchor, i))') && rota.includes('for (const s of paidScenes) s.prompt = comCenarioDoFilme(s.prompt, cenarioK4)') && rota.indexOf('s.prompt = comCenarioDoFilme(s.prompt, cenarioK4)') < rota.indexOf('const chunks = prepareKling4PaidFilm('))
check('rota: nenhum negative_prompt novo (Seedance 1.5/H3/Omni/S25 não têm o campo)', !/negative_prompt[^\n]*(?:cenario|Cenario|SEM_LETRAS)/.test(rota))

console.log(`${falhas ? '🔴' : '🟢'} casa-ficha-sem-letras-0211: ${ok}/${ok + falhas}`)
if (falhas) process.exit(1)
