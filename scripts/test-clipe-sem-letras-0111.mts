// KINEO-CLIPE-SEM-LETRAS-0111 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo.
// Caso real: cumiasammanis27, 01/11 17:36 BRT, Modo Clipe do Studio (/api/generate-clip → lib/cinematic/shotSpec.ts buildClipPrompt),
// Seedance 1.5 t2v, 5 s, 9:16, render clip-1ace03e5-29c3-47ea-a6b2-9385627cdc67: estilo 2D de terror bom, mas o juiz de pixel
// (pixel_score) marcou "texto inventado" em 3 quadros — tela do smartphone (t=0,6 e 1,3 s) e texto sobreposto no fim (t=5 s).
// O banco guarda só os 500 primeiros caracteres do pedido (1.282 no total); o teste usa esse trecho real, sem inventar o resto.
// 0111d (decisão depois de 2 revisões): sem extração do texto pedido e sem detector "o cliente já proibiu texto". Regra única:
// pediu texto explicitamente → prompt igual à base (nada acrescentado, nada cortado); senão → proteção genérica.
// 0111f (revisão de 858cc5ee4): o /clips NÃO manda negative_prompt (payload da fal = base em todo motor e todo pedido) e o corte
// do Studio em 1.800 é o da base (o cliente nunca perde mais texto que antes).
// Rodar: node --import ./scripts/alias-loader.mjs scripts/test-clipe-sem-letras-0111.mts
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildClipPrompt, detectShotSpec, pedeTextoExplicito as pedeStudio, FRASE_SEM_LETRAS as FRASE_STUDIO } from '../lib/cinematic/shotSpec'
import * as semLetras from '../lib/clips/clipSemLetras'
import { pedeTextoExplicito, FRASE_SEM_LETRAS, FECHO_DOS_EFEITOS } from '../lib/clips/clipSemLetras'
import { buildClipFalInput, CLIP_ENGINES, CLIP_ENGINE_ORDER, CLIPE_SEM_LETRAS, promptDoClipeSemLetras } from '../lib/clips/clipCatalog'
import { CLIP_EFFECTS } from '../lib/clips/clipEffects'
import { semLetras0111Exato } from './test-support/desfaz-clipe-sem-letras-0111.mjs'

let ok = 0, f = 0
const check = (n: string, c: boolean) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }
const lf = (t: string) => t.replace(/\r\n/g, '\n')
const MOLDURA = (frame: string) => `${frame}, cinematic, sharp focus, no readable text, no watermark, no logo, no subtitles`
/** buildClipPrompt de origin/main (cc94d9c44), byte a byte. */
const BASE = (p: string, frame = '9:16 vertical framing') => `${p}. ${MOLDURA(frame)}`.replace(/\.\s*\./g, '.').slice(0, 1800)
const studio = (p: string, aspect: '9:16' | '16:9' = '9:16') => buildClipPrompt({ ...detectShotSpec(p), prompt: p, seconds: 5 }, aspect)
const PHOTO = 'https://abc.supabase.co/storage/v1/object/public/avatars/11111111-2222-3333-4444-555555555555/foto.jpg'
const payloads = (prompt: string) => {
  const out: Array<{ engine: string; mode: string; model: string; pay: Record<string, unknown> }> = []
  for (const engine of CLIP_ENGINE_ORDER) for (const mode of ['t2v', 'i2v'] as const) {
    const model = mode === 'i2v' ? CLIP_ENGINES[engine].i2vModel : CLIP_ENGINES[engine].t2vModel
    if (!model) continue
    out.push({ engine, mode, model, pay: buildClipFalInput({ engine, mode, model, seconds: CLIP_ENGINES[engine].falSeconds[0], aspect: mode === 'i2v' ? 'image' : '9:16', prompt, imageUrl: mode === 'i2v' ? PHOTO : null }) })
  }
  return out
}

// ── 1. O caso real, no caminho que ele percorreu (Studio → generate-clip → buildClipPrompt → Seedance 1.5) ──
const CASO = 'Create a 2D animated horror storytelling video in vertical 9:16 format, inspired by dark Indonesian urban legends.\n\nVisual style:\n\n- Minimalist 2D cartoon animation.\n- Dark cinematic atmosphere.\n- Deep navy and black backgrounds.\n- Eerie flashlight lighting and dramatic shadows.\n- Simple but expressive cartoon characters.\n- Creepy supernatural entities with unsettling facial expressions.\n- Smooth transitions and subtle character movements.\n- Horror game visual aesthetic.\n\nStorytelling:\nCreate an'
const spec = detectShotSpec(CASO)
check('caso real segue texto livre (narrative), como no clip_submitted', spec.isShotSpec === false && spec.reason === 'narrative')
check('caso real não pede texto', !pedeTextoExplicito(CASO))
const finalCaso = buildClipPrompt({ ...spec, prompt: CASO, seconds: 5 }, '9:16')
check('caso real: texto do cliente intacto no começo', finalCaso.startsWith(CASO))
check('caso real: moldura antiga + frase curta no fim', finalCaso.endsWith(`${MOLDURA('9:16 vertical framing')}. ${FRASE_SEM_LETRAS}`))
check('a frase é a decidida', FRASE_SEM_LETRAS === 'Screens, signs and papers show no legible words.')
const comCelular = `${CASO} man walking alone at night, checking the map on his smartphone.`
check('com o smartphone que o juiz viu: frase curta no fim', studio(comCelular).endsWith(FRASE_SEM_LETRAS))
check('a régua não exporta mais nada de negative_prompt', !Object.keys(semLetras).some((k) => /NEGATIV|negative/i.test(k)))
const rota = lf(readFileSync(new URL('../app/api/generate-clip/route.ts', import.meta.url), 'utf8'))
check('a rota do Modo Clipe manda ao fal o prompt de buildClipPrompt, sem negative_prompt', rota.includes('const finalPrompt = buildClipPrompt(') && rota.includes('prompt: finalPrompt,') && !rota.includes('negative_prompt'))

// ── 2. Prompt longo: o corte em 1.800 é o da base — o cliente não perde nem um caractere a mais que antes ──
const LONGO = ('A girl walks through an abandoned hospital at night holding her phone. ').repeat(80)
check(`prompt de ${LONGO.length} caracteres: igual à base (corte da base, sem frase)`, studio(LONGO, '16:9') === BASE(LONGO, '16:9 widescreen framing'))
// faixa da revisão (1.650–1.800): o texto do cliente sai inteiro como na base; a cauda da casa é que encolhe
for (const n of [1650, 1700, 1760, 1798]) {
  const p = ('Rain falls on the empty pier at dawn ').repeat(60).slice(0, n).trimEnd()
  const fs = studio(p, '16:9')
  check(`prompt de ${p.length} caracteres: texto do cliente inteiro, como na base`, fs.length <= 1800 && fs.startsWith(p) && BASE(p, '16:9 widescreen framing').startsWith(fs.slice(0, Math.min(fs.length, BASE(p, '16:9 widescreen framing').length))))
}

// ── 3. Texto PEDIDO: nada acrescentado, nada cortado — igual à base nos dois caminhos (todos os exemplos das 2 revisões) ──
const PEDIDOS = [
  // revisão 1 (43e950aa5/3ad55a7d8)
  'a sign reading THE END', 'uma placa escrito O FIM', 'a banner that says A NEW ERA', 'the title card says THE END',
  'a sign that says Welcome Home', 'uma placa escrito Feliz Natal', 'a t-shirt that says I love NY', 'a menu that says Pizza 10 dollars',
  'a poster that reads Missing with a photo of a girl', 'a book titled The Shining',
  'she finds a note that says he is coming back tonight', 'a note that says she is gone', 'her phone says nothing, the screen stays black', 'the screen says loading',
  // revisão 2 (eaa42be2a)
  'a sign that says the end', 'uma placa escrito o fim', 'a sign that says a new beginning', 'a sign that says Welcome to hell',
  'a sign that says Beware of the dog', 'her phone screen says Incoming Call from Mom', 'a sign that says Paris, France', 'a menu that says Today: Soup',
  'a cake that says Happy Birthday', 'a mug that says Best Dad', 'a door with a plaque that reads Office', 'graffiti that says Rebel', 'a scroll that reads Beware',
  'a sign that says Free wifi inside', 'a note that says Run Now before it is too late', 'the billboard says Coca Cola is life', 'a phone screen that says Mom calling',
  // controles da 1ª rodada e das deixas da regra
  'uma placa escrito ABERTO na porta da padaria, de manhã', 'uma placa escrito aberto na porta', 'a neon sign that says open above the bar',
  'a neon sign "OPEN 24H" flickers in the rain', 'a birthday cake with the text "Feliz aniversário, Ana"', 'un cartel que dice SE VENDE frente a la casa',
  'a T-shirt reading SALE 50% on a mannequin', 'a book titled Romeo and Juliet on the shelf', 'a road sign that says No Parking', 'the letter says Maria is dead',
  'a note that says meet me at the bridge', 'a banner with the words grand opening', 'neon sign, text: open late', 'um cartaz que diz vende-se',
  'uma faixa dizendo bem-vindos', 'a wall with help me written in blood', 'a chalkboard with writing on it', "an exit sign 'EXIT' glowing green",
  'a sign that says welcome home on the door',
]
for (const p of PEDIDOS) {
  const fs = studio(p)
  const clips = payloads(p)
  check(`texto pedido, igual à base e inteiro: ${p}`, pedeTextoExplicito(p) && fs === BASE(p) && fs.startsWith(p) && !fs.includes(FRASE_SEM_LETRAS)
    && promptDoClipeSemLetras(p) === p && clips.every((c) => c.pay.prompt === p && !('negative_prompt' in c.pay)))
}

// ── 4. Qualquer outro caso: proteção genérica (Studio: frase; /clips: frase com superfície, nunca negative_prompt) ──
const SEM_PEDIDO = [
  CASO, comCelular, 'a cat jumps on a table', 'a girl looks at her phone in bed',
  // revisão 2: prosa com "no words/no letters" não desliga mais a proteção (o detector saiu)
  'The ghost speaks no words. Her phone screen flickers in the dark.', 'She has no words; she stares at the glowing laptop screen.',
  'He left no letters behind, only his phone glowing on the table.',
  // revisão 1: "no text messages" recebe a proteção
  'a video of a woman with no text messages on her phone',
  // apóstrofo não é aspas; pedido genérico de legenda não é texto pedido; "no text" do cliente não é mais atalho
  "Luffy's route directly toward Akainu's fist", 'short horror story with English subtitles, a woman looks at her phone in bed',
  'a sign with no text on it, rusty, in the desert',
]
for (const p of SEM_PEDIDO) {
  const fs = studio(p)
  const clips = payloads(p)
  const negOk = clips.every((c) => !('negative_prompt' in c.pay))
  check(`sem texto pedido, protegido: ${p.slice(0, 70)}`, !pedeTextoExplicito(p) && fs.startsWith(p.replace(/\.\s*$/, '')) && fs.endsWith(FRASE_SEM_LETRAS) && negOk
    && clips.every((c) => String(c.pay.prompt).startsWith(p)))
}
// limite conhecido da regra única (lado decidido): verbo de leitura/escrita em prosa conta como pedido → prompt igual à base, nada cortado
for (const p of ['a girl reads a message on her phone at night', 'a horror video, no writing desk, a smartphone on the bed']) {
  check(`limite: prosa com deixa fica igual à base (sem proteção, sem corte): ${p}`, pedeTextoExplicito(p) && studio(p) === BASE(p) && promptDoClipeSemLetras(p) === p)
}
// /clips: a frase só entra com superfície que carrega texto (contrato KINEO-CLIPE-LETRAS-3010) — pedido sem tela/placa fica igual
check('/clips: celular → frase no fim', promptDoClipeSemLetras('ele pega o celular no escuro') === `ele pega o celular no escuro${CLIPE_SEM_LETRAS}` && CLIPE_SEM_LETRAS === ' ' + FRASE_SEM_LETRAS)
check('/clips: "no words" + tela do celular → frase no fim (detector removido)', promptDoClipeSemLetras(SEM_PEDIDO[4]).endsWith(CLIPE_SEM_LETRAS))
check('/clips: "no text" do cliente com placa → frase no fim (detector removido)', promptDoClipeSemLetras('a sign with no text on it, rusty, in the desert').endsWith(CLIPE_SEM_LETRAS))
check('/clips: sem superfície, prompt igual', promptDoClipeSemLetras('a cat jumps on a table') === 'a cat jumps on a table' && promptDoClipeSemLetras(CASO) === CASO)
check('/clips: idempotente', promptDoClipeSemLetras(promptDoClipeSemLetras(comCelular)) === promptDoClipeSemLetras(comCelular))
check('/clips: o Seedance do caso real com celular leva a frase no payload', payloads(comCelular).filter((c) => c.engine === 'seedance').every((c) => String(c.pay.prompt).endsWith(FRASE_SEM_LETRAS)))
// 0111f — a revisão de 858cc5ee4: foto com rótulo/logo real (i2v) e texto pedido com outras palavras não podem ser combatidos
const REVISAO_0111F = [
  'my perfume bottle rotates slowly on a marble table', 'a neon sign spelling OPEN', 'a birthday cake that spells HAPPY BIRTHDAY',
  'fireworks forming the word 2027', 'subtitle at the bottom: hello world', 'a vintage movie title card THE END', 'a license plate ABC-1234',
  'a jersey with the number 10', 'my coffee brand logo appears with a glossy 3D shine', 'texto na tela: OI', 'a protester holds a sign: NO WAR',
]
for (const p of REVISAO_0111F) {
  check(`/clips sem negative_prompt em nenhum motor (t2v e i2v): ${p}`, payloads(p).every((c) => !('negative_prompt' in c.pay) && c.pay.prompt === promptDoClipeSemLetras(p) && String(c.pay.prompt).startsWith(p)))
}
const bloco0111f = (src: string) => { const t = lf(src); const a = t.indexOf('// ─── Payload da fal'); const b = t.indexOf("    case 'h3':", a); return a >= 0 && b > a ? t.slice(a, b) : null }
const catalogoBase = (() => { try { return execSync('git show cc94d9c44:lib/clips/clipCatalog.ts', { encoding: 'utf8', cwd: fileURLToPath(new URL('..', import.meta.url)) }) } catch { return '' } })()
check('buildClipFalInput (cabeçalho até o Veo) é byte a byte o da base cc94d9c44', bloco0111f(catalogoBase) !== null && bloco0111f(catalogoBase) === bloco0111f(readFileSync(new URL('../lib/clips/clipCatalog.ts', import.meta.url), 'utf8')))
// efeitos do catálogo: prompt da casa (fecho NO_TEXT), payload igual ao da base — sem frase, sem negative_prompt
const efeitosSrc = lf(readFileSync(new URL('../lib/clips/clipEffects.ts', import.meta.url), 'utf8'))
check('FECHO_DOS_EFEITOS = o NO_TEXT de lib/clips/clipEffects.ts', efeitosSrc.includes(`const NO_TEXT = '${FECHO_DOS_EFEITOS}'`))
for (const e of CLIP_EFFECTS.filter((x) => typeof x.prompt === 'string' && x.prompt.endsWith(FECHO_DOS_EFEITOS))) {
  check(`efeito ${e.key}: payload igual ao da base em todo motor`, payloads(e.prompt).every((c) => c.pay.prompt === e.prompt && !('negative_prompt' in c.pay)))
}
const recibo = JSON.parse(readFileSync(new URL('./test-support/desfaz-clipe-sem-letras-0111-fontes.json', import.meta.url), 'utf8'))
check('recibo da trava 8.2: shotSpec.ts de hoje = base + esta camada, exato', semLetras0111Exato(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'lib/cinematic/shotSpec.ts') && Object.keys(recibo.scope).join() === 'lib/cinematic/shotSpec.ts')

// ── 5. Plano JSON (Luffy, 11/09): moldura + frase ──
const LUFFY = '{"clip": "07", "duration": "10 seconds", "action": "Luffy rapidly dodges the descending magma fists.", "camera": "High-speed FPV drone weaving through falling magma."}'
const sl = detectShotSpec(LUFFY)
const fLuffy = buildClipPrompt(sl, '9:16')
check('plano JSON: 9:16 + no readable text + frase', sl.isShotSpec && /9:16 vertical framing/.test(fLuffy) && fLuffy.includes('no readable text') && fLuffy.endsWith(FRASE_SEM_LETRAS))

// ── 6. As duas cópias da régua são a mesma (o shotSpec roda isolado, sem require) ──
const bloco = (src: string) => { const t = lf(src); const a = t.indexOf('// INÍCIO-CÓPIA pedeTextoExplicito'); const b = t.indexOf('// FIM-CÓPIA pedeTextoExplicito'); return a >= 0 && b > a ? t.slice(a, b) : null }
const bClips = bloco(readFileSync(new URL('../lib/clips/clipSemLetras.ts', import.meta.url), 'utf8'))
const bStudio = bloco(readFileSync(new URL('../lib/cinematic/shotSpec.ts', import.meta.url), 'utf8'))
check('cópia da régua no shotSpec é idêntica à de lib/clips/clipSemLetras.ts', bClips !== null && bClips === bStudio && FRASE_STUDIO === FRASE_SEM_LETRAS)
check('as duas cópias dão a mesma resposta no corpus', [...PEDIDOS, ...SEM_PEDIDO, LUFFY, LONGO].every((p) => pedeStudio(p) === pedeTextoExplicito(p)))
check('a extração e o detector saíram', !/protecaoContraLetras|PL_JA_PROIBE|textos\.push/.test(bClips ?? '') && !/protecaoContraLetras|PL_JA_PROIBE/.test(lf(readFileSync(new URL('../lib/cinematic/shotSpec.ts', import.meta.url), 'utf8'))))

console.log(`${f ? '🔴' : '🟢'} clipe-sem-letras-0111: ${ok}/${ok + f}`)
if (f) process.exit(1)
