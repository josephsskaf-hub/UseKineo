// KINEO-FORMATO-DA-IDEIA-1211 — guardião: o pedido explícito de pessoa falando para a câmera escrito na ideia original vale para o formato.
// Casos reais (claims de 14 dias, 12/11): 24564d97 caneta de gel ("UGC … speaks naturally to the camera") e a fruteira ("estética de vídeo UGC,
// como uma recomendação espontânea de uma cliente") viram presenter; "não mostrar apresentador ou pessoa falando para a câmera" (07/11) e
// "no on-screen presenter, no character speaking to camera" (09/11) NÃO; ideia de documentário não muda. Sem rede.
// Rodar: npx tsx scripts/test-formato-da-ideia-1211.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { decidirFormato } from '../lib/cinematic/visualMode.ts'
import { FORMATO_DA_IDEIA, formatoDaIdeiaLigado, formatoComFalaDaIdeia, pedidoDeFalaNaIdeia } from '../lib/cinematic/formatoDaIdeia.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }

const CANETA_ROTEIRO = 'HOOK (0-2s): [Pexels: young woman smiling] «¿Pero cómo no había descubierto esto antes?»\n\nMICRO REWARD 1: [Pexels: gel pen closeup] «Es un Gel Pen 3 en 1: base, color y top.»\n\nPAYOFF: [Pexels: UV lamp and nails] «¡Compras uno y te llevas tres por 24,90 €! Ya tengo mis favoritos.»'
const CANETA_IDEIA = 'UGC MIARA — 15 segundos\n\nDiálogo de la chica (español de España, natural y entusiasta): «Es un Gel Pen 3 en 1».\n\nCreate a realistic 15-second vertical 9:16 UGC beauty video for MIARA. A young blonde woman, approximately 25 years old, holds the EXACT black MIARA Gel Pen. The woman speaks naturally to the camera in European Spanish. No distorted hands, no extra fingers, no product redesign.'
const VIRAM = {
  caneta: CANETA_IDEIA,
  fruteira: 'Mostre uma mulher comum organizando frutas frescas na fruteira. Estética de vídeo UGC, como uma recomendação espontânea de uma cliente, com aparência real.',
  host: 'A host talking to the camera explains the three rules of saving money.',
}
const FICAM = {
  negado_pt: 'Música de suspense ao fundo. Não mostrar apresentador ou pessoa falando para a câmera. Cena 1 – a ligação.',
  negado_en: 'Modern suspense drama. No on-screen presenter, no character speaking to camera. The main character, Elena, opens the door.',
  italiano: 'Luca si trasferì in un nuovo palazzo. Il vicino non esisteva ancora, ma ogni notte alle 02:46 tre colpi.',
  porta: 'The door nobody has opened in 800 years',
  pompeia: 'Camera looks from inside the ancient Roman gladiatorial arena toward Mount Vesuvius. Thousands of spectators wear authentic Roman tunics.',
  documentario: 'Curiosidade que ninguém sabe\n\n[camera: gritty handheld documentary camera with subtle shake]',
  cafe: 'Create a 15-second ultra-realistic cinematic coffee commercial for a premium coffee shop called CAFE KOOK. Scene 1: Extreme close-up of roasted coffee beans.',
  sem_avatar: 'Product video without an avatar, only the bottle on a marble table.',
}

console.log('── pedido na ideia ──')
for (const [k, t] of Object.entries(VIRAM)) ok(!!pedidoDeFalaNaIdeia(t), `vira presenter: ${k} ("${pedidoDeFalaNaIdeia(t)}")`)
for (const [k, t] of Object.entries(FICAM)) ok(pedidoDeFalaNaIdeia(t) === null, `fica como está: ${k}`)
ok(pedidoDeFalaNaIdeia(null) === null && pedidoDeFalaNaIdeia('') === null && pedidoDeFalaNaIdeia(42) === null, 'sem ideia: null')

console.log('── decisão ──')
const base = decidirFormato(CANETA_ROTEIRO, false)
ok(base.modo !== 'presenter', `base: o roteiro sozinho não pede fala (${base.modo})`)
const nova = formatoComFalaDaIdeia({ ...base }, CANETA_IDEIA, false)
ok(nova.modo === 'presenter' && nova.apresentadorPedido === true && /ugc|to the camera/.test(nova.motivo), `caneta: ${base.modo} → presenter (${nova.motivo.slice(0, 80)}…)`)
ok(formatoComFalaDaIdeia({ ...base }, CANETA_IDEIA, true).modo === base.modo, 'tag [faceless] vence a ideia')
const pres = { modo: 'presenter', motivo: 'x', apresentadorPedido: true }
ok(formatoComFalaDaIdeia(pres, FICAM.negado_pt, false) === pres, 'quem já é presenter fica (mesmo objeto)')
for (const t of [null, undefined, '', FICAM.porta]) ok(JSON.stringify(formatoComFalaDaIdeia({ ...base }, t, false)) === JSON.stringify(base), `ideia sem pedido (${String(t).slice(0, 20)}): decisão idêntica`)

console.log('── interruptor e rota ──')
ok(FORMATO_DA_IDEIA === 'internal', `padrão 'internal' (é '${FORMATO_DA_IDEIA}')`)
ok(!formatoDaIdeiaLigado('internal', false) && formatoDaIdeiaLigado('internal', true) && formatoDaIdeiaLigado('all', false), 'internal = só a casa; all = todos')
const rota = readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8').replace(/\r\n/g, '\n')
const iDec = rota.indexOf('const formatoVisual = formatoComEstrela(formatoComPessoaDoPedido(decidirFormato(prompt, tagFacelessPresente), pessoaPedida)')
const iNova = rota.indexOf('if (formatoDaIdeiaLigado(FORMATO_DA_IDEIA, isInternalEmail(user.email))) Object.assign(formatoVisual, formatoComFalaDaIdeia({ ...formatoVisual }, pedidoDoCliente, tagFacelessPresente))')
const iRomance = rota.indexOf('const romanceAdulto = decidirRomanceAdulto(prompt)')
ok(iDec > 0 && iNova > iDec && iNova < iRomance, 'a rota aplica logo depois da decisão de formato, pela conta da casa, com o pedido do cliente (pedidoDoCliente) e a tag')
ok(rota.split('formatoComFalaDaIdeia(').length === 2, 'um único ponto de aplicação na rota')

console.log('── mutante ──')
const arq = 'lib/cinematic/formatoDaIdeia.ts'
const src = readFileSync(arq, 'utf8')
const mut = src.replace('if (!NEGA_ANTES.test(antes)) return true', 'return true')
ok(mut !== src, 'mutante aplicado (sem a negação na oração)')
const tmp = resolve('lib/cinematic/.formatoDaIdeia.mutante-1211.ts')
writeFileSync(tmp, mut)
try { const M = await import(pathToFileURL(tmp).href); ok(M.pedidoDeFalaNaIdeia(FICAM.negado_pt) !== null, 'mutante: "não mostrar apresentador ou pessoa falando para a câmera" viraria presenter (vermelho)') } finally { unlinkSync(tmp) }

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
