// KINEO-CLIPE-SEM-LETRAS-0111 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo.
// Caso real: cumiasammanis27, 01/11 17:36 BRT, Modo Clipe do Studio (/api/generate-clip → lib/cinematic/shotSpec.ts buildClipPrompt),
// Seedance 1.5 t2v, 5 s, 9:16, render clip-1ace03e5-29c3-47ea-a6b2-9385627cdc67: estilo 2D de terror bom, mas o juiz de pixel
// (pixel_score) marcou "texto inventado" em 3 quadros — tela do smartphone (t=0,6 e 1,3 s) e texto sobreposto no fim (t=5 s).
// O banco guarda só os 500 primeiros caracteres do pedido (1.282 no total); o teste usa esse trecho real, sem inventar o resto.
// Rodar: node --import ./scripts/alias-loader.mjs scripts/test-clipe-sem-letras-0111.mts
import { readFileSync } from 'node:fs'
import { buildClipPrompt, detectShotSpec, protecaoContraLetras as protecaoStudio, CLIP_PROMPT_ENGINE_MAX } from '../lib/cinematic/shotSpec'
import { protecaoContraLetras, promptComProtecaoContraLetras, negativePromptSemLetras, MOTORES_COM_NEGATIVE_PROMPT, KLING_NEGATIVE_PADRAO, NEGATIVO_SEM_LETRAS, NEGATIVO_TEXTO_PEDIDO } from '../lib/clips/clipSemLetras'
import { buildClipFalInput, CLIP_ENGINES, CLIP_ENGINE_ORDER, CLIPE_SEM_LETRAS, promptDoClipeSemLetras } from '../lib/clips/clipCatalog'

let ok = 0, f = 0
const check = (n: string, c: boolean) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }
const lf = (t: string) => t.replace(/\r\n/g, '\n')
const SOBREPOSICAO = 'No title cards, captions, subtitles, credits or on-screen text overlays at any moment, including the last frame.'
const SUPERFICIE = 'Every screen, phone, sign, page, label and reflection shows only abstract shapes, icons, soft glow or blur, never letters, words or numbers.'

// ── 1. O caso real, no caminho que ele percorreu (Studio → generate-clip → buildClipPrompt → Seedance 1.5) ──
const CASO = 'Create a 2D animated horror storytelling video in vertical 9:16 format, inspired by dark Indonesian urban legends.\n\nVisual style:\n\n- Minimalist 2D cartoon animation.\n- Dark cinematic atmosphere.\n- Deep navy and black backgrounds.\n- Eerie flashlight lighting and dramatic shadows.\n- Simple but expressive cartoon characters.\n- Creepy supernatural entities with unsettling facial expressions.\n- Smooth transitions and subtle character movements.\n- Horror game visual aesthetic.\n\nStorytelling:\nCreate an'
const spec = detectShotSpec(CASO)
check('caso real segue texto livre (narrative), como no clip_submitted', spec.isShotSpec === false && spec.reason === 'narrative')
const finalCaso = buildClipPrompt({ ...spec, prompt: CASO, seconds: 5 }, '9:16')
check('caso real: o texto do cliente vai intacto no começo', finalCaso.startsWith(CASO))
check('caso real: proíbe legenda/título inventado até o último quadro', finalCaso.includes(SOBREPOSICAO))
check('caso real: a moldura antiga continua (no readable text … no subtitles)', finalCaso.includes('no readable text, no watermark, no logo, no subtitles'))
// o que o juiz viu nos quadros (smartphone com mapa) — o trecho real + a frase do quadro, sem fingir que é o resto do pedido
const comCelular = `${CASO} man walking alone at night, checking the map on his smartphone.`
check('com o smartphone que o juiz viu: tela só com formas/desfoque', buildClipPrompt({ ...detectShotSpec(comCelular), prompt: comCelular, seconds: 5 }, '9:16').includes(SUPERFICIE))
check('o Seedance 1.5 do Studio não recebe negative_prompt (o schema não tem)', negativePromptSemLetras('fal-ai/bytedance/seedance/v1.5/pro/text-to-video', CASO) === null)
const rota = lf(readFileSync(new URL('../app/api/generate-clip/route.ts', import.meta.url), 'utf8'))
check('a rota do Modo Clipe manda ao fal o prompt de buildClipPrompt', rota.includes('const finalPrompt = buildClipPrompt(') && rota.includes('prompt: finalPrompt,') && !rota.includes('negative_prompt'))

// ── 2. Prompt longo: a moldura da casa nunca é cortada (antes: .slice(0, 1800) no fim levava a proteção embora) ──
const LONGO = ('A girl walks through an abandoned hospital at night holding her phone. ').repeat(80)
const finalLongo = buildClipPrompt({ ...detectShotSpec(LONGO), prompt: LONGO, seconds: 8 }, '16:9')
check(`prompt de ${LONGO.length} caracteres: cabe no teto de ${CLIP_PROMPT_ENGINE_MAX}`, finalLongo.length <= CLIP_PROMPT_ENGINE_MAX)
check('prompt longo: moldura + proteção no fim, inteiras', finalLongo.endsWith(`16:9 widescreen framing, cinematic, sharp focus, no readable text, no watermark, no logo, no subtitles. ${SOBREPOSICAO} ${SUPERFICIE}`))
check('prompt longo: começa pelo texto do cliente', finalLongo.startsWith('A girl walks through an abandoned hospital'))

// ── 3. Controles: texto que o cliente PEDIU fica ──
const placa = 'uma placa escrito ABERTO na porta da padaria, de manhã'
const fPlaca = buildClipPrompt({ ...detectShotSpec(placa), prompt: placa, seconds: 5 }, '9:16')
check('placa escrito ABERTO: ABERTO vira a única escrita legível', fPlaca.includes('The only legible writing in the clip is exactly "ABERTO", spelled exactly like that'))
check('placa escrito ABERTO: sem "no readable text" nem "no subtitles" contra o pedido', !fPlaca.includes('no readable text') && !fPlaca.includes('no subtitles') && !fPlaca.includes(SOBREPOSICAO))
const pedidos: Array<[string, string[]]> = [
  ['uma placa escrito aberto na porta', ['aberto']],
  ['a neon sign that says open above the bar', ['open']],
  ['a neon sign "OPEN 24H" flickers in the rain', ['OPEN 24H']],
  ['a birthday cake with the text "Feliz aniversário, Ana"', ['Feliz aniversário, Ana']],
  ['un cartel que dice SE VENDE frente a la casa', ['SE VENDE']],
  ['a T-shirt reading SALE 50% on a mannequin', ['SALE 50%']],
]
for (const [p, esperado] of pedidos) check(`texto pedido reconhecido: ${p}`, JSON.stringify(protecaoContraLetras(p).textos) === JSON.stringify(esperado))
const legenda = 'short horror story with English subtitles, a woman looks at her phone in bed'
const fLegenda = buildClipPrompt({ ...detectShotSpec(legenda), prompt: legenda, seconds: 5 }, '9:16')
check('pediu legenda (genérico): sem proibição de legenda, tela do celular segue protegida', !fLegenda.includes('no subtitles') && !fLegenda.includes(SOBREPOSICAO) && fLegenda.includes(SUPERFICIE))
// controles do outro lado: aspas de fala, apóstrofo, verbo comum e negação NÃO viram texto pedido
const naoPedidos = [
  'she whispers "help me" in the dark hallway',
  "Luffy's route directly toward Akainu's fist",
  'a girl reads a message on her phone at night',
  'a girl at her laptop writing an essay',
  'a sign with no text on it, rusty, in the desert',
]
for (const p of naoPedidos) check(`não é texto pedido: ${p}`, protecaoContraLetras(p).textos.length === 0 && !protecaoContraLetras(p).pedido)
const fNega = buildClipPrompt({ ...detectShotSpec(naoPedidos[4]), prompt: naoPedidos[4], seconds: 5 }, '9:16')
check('quem já escreveu "no text" mantém a moldura antiga, sem frase a mais', fNega.endsWith('no readable text, no watermark, no logo, no subtitles'))

// ── 4. O plano JSON do caso de 11/09 (Luffy) continua com moldura + anti-texto ──
const LUFFY = '{"clip": "07", "duration": "10 seconds", "action": "Luffy rapidly dodges the descending magma fists.", "camera": "High-speed FPV drone weaving through falling magma."}'
const sl = detectShotSpec(LUFFY)
const fLuffy = buildClipPrompt(sl, '9:16')
check('plano JSON: 9:16 + no readable text + proteção de sobreposição', sl.isShotSpec && /9:16 vertical framing/.test(fLuffy) && fLuffy.includes('no readable text') && fLuffy.includes(SOBREPOSICAO))

// ── 5. /clips: negative_prompt só onde o schema da fal tem o campo; o resto leva a instrução no texto ──
const VERIFICADOS = ['fal-ai/kling-video/v3/pro/text-to-video', 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', 'fal-ai/veo3.1/fast', 'fal-ai/veo3.1/fast/image-to-video']
check('lista de endpoints com negative_prompt = a conferida no schema da fal em 01/11', JSON.stringify([...MOTORES_COM_NEGATIVE_PROMPT].sort()) === JSON.stringify([...VERIFICADOS].sort()))
const PHOTO = 'https://abc.supabase.co/storage/v1/object/public/avatars/11111111-2222-3333-4444-555555555555/foto.jpg'
for (const engine of CLIP_ENGINE_ORDER) {
  for (const mode of ['t2v', 'i2v'] as const) {
    const model = mode === 'i2v' ? CLIP_ENGINES[engine].i2vModel : CLIP_ENGINES[engine].t2vModel
    if (!model) continue
    const sec = CLIP_ENGINES[engine].falSeconds[0]
    const pay = buildClipFalInput({ engine, mode, model, seconds: sec, aspect: mode === 'i2v' ? 'image' : '9:16', prompt: CASO, imageUrl: mode === 'i2v' ? PHOTO : null })
    const deve = VERIFICADOS.includes(model)
    const neg = pay.negative_prompt
    check(`${engine} ${mode} (${model}): negative_prompt ${deve ? 'presente' : 'ausente'}`, deve ? typeof neg === 'string' && String(neg).includes(NEGATIVO_SEM_LETRAS) : !('negative_prompt' in pay))
    if (deve && model.startsWith('fal-ai/kling-video/')) check(`${engine} ${mode}: mantém o padrão do Kling no começo`, String(neg).startsWith(KLING_NEGATIVE_PADRAO + ', '))
    check(`${engine} ${mode}: o caso real leva a proibição de legenda no texto`, String(pay.prompt).startsWith(CASO) && String(pay.prompt).includes(SOBREPOSICAO))
  }
}
check('chamador sem id da fal (model "x") usa o endpoint do catálogo', 'negative_prompt' in buildClipFalInput({ engine: 'kling', mode: 't2v', model: 'x', seconds: 5, aspect: '9:16', prompt: 'a cat', imageUrl: null }))
const kPlaca = buildClipFalInput({ engine: 'kling', mode: 't2v', model: CLIP_ENGINES.kling.t2vModel!, seconds: 5, aspect: '9:16', prompt: placa, imageUrl: null })
check('/clips placa escrito ABERTO: negative sem "text, letters, words" (só letra torta/inventada)', kPlaca.negative_prompt === `${KLING_NEGATIVE_PADRAO}, ${NEGATIVO_TEXTO_PEDIDO}` && !/\btext, letters, words\b/.test(String(kPlaca.negative_prompt)))
check('/clips placa escrito ABERTO: prompt mantém ABERTO legível', String(kPlaca.prompt).includes('exactly "ABERTO"'))
// contrato antigo (KINEO-CLIPE-LETRAS-3010) preservado
check('/clips: sem superfície nem vídeo/história, o prompt fica igual', promptDoClipeSemLetras('a cat jumps on a table') === 'a cat jumps on a table')
check('/clips: celular (PT) termina com CLIPE_SEM_LETRAS', promptDoClipeSemLetras('ele pega o celular no escuro').endsWith(CLIPE_SEM_LETRAS) && CLIPE_SEM_LETRAS === ' ' + SUPERFICIE)
const EFEITO = 'The person in the photo comes to life: natural breathing, a soft genuine smile. Keep the exact face. No text, no captions, no logos, no watermark.'
check('/clips: prompt de efeito (já proíbe texto) vai byte a byte igual', promptDoClipeSemLetras(EFEITO) === EFEITO)
const kEfeito = buildClipFalInput({ engine: 'kling', mode: 'i2v', model: CLIP_ENGINES.kling.i2vModel!, seconds: 5, aspect: 'image', prompt: EFEITO, imageUrl: PHOTO })
check('/clips: efeito no Kling 2.5 (já proíbe texto) — payload sem negative_prompt, igual ao de antes', !('negative_prompt' in kEfeito) && kEfeito.prompt === EFEITO)
check('/clips: modelo nulo não derruba a montagem do payload', (() => { try { return !('negative_prompt' in buildClipFalInput({ engine: 's25', mode: 'i2v', model: null as never, seconds: 5, aspect: 'image', prompt: 'x y z', imageUrl: PHOTO })) } catch { return false } })())
check('idempotente nos dois caminhos', promptComProtecaoContraLetras(promptComProtecaoContraLetras(comCelular)) === promptComProtecaoContraLetras(comCelular))

// ── 6. As duas cópias da régua são a mesma (o shotSpec roda isolado, sem require) ──
const bloco = (src: string) => { const t = lf(src); const a = t.indexOf('// INÍCIO-CÓPIA protecaoContraLetras'); const b = t.indexOf('// FIM-CÓPIA protecaoContraLetras'); return a >= 0 && b > a ? t.slice(a, b) : null }
const bClips = bloco(readFileSync(new URL('../lib/clips/clipSemLetras.ts', import.meta.url), 'utf8'))
const bStudio = bloco(readFileSync(new URL('../lib/cinematic/shotSpec.ts', import.meta.url), 'utf8'))
check('cópia da régua no shotSpec é idêntica à de lib/clips/clipSemLetras.ts', bClips !== null && bClips === bStudio)
const CORPUS = [CASO, comCelular, LONGO, placa, legenda, LUFFY, EFEITO, ...pedidos.map((x) => x[0]), ...naoPedidos]
check('as duas cópias dão a mesma resposta no corpus (sempre e não-sempre)', CORPUS.every((p) => JSON.stringify(protecaoStudio(p, { sempre: true })) === JSON.stringify(protecaoContraLetras(p, { sempre: true })) && JSON.stringify(protecaoStudio(p)) === JSON.stringify(protecaoContraLetras(p))))

console.log(`${f ? '🔴' : '🟢'} clipe-sem-letras-0111: ${ok}/${ok + f}`)
if (f) process.exit(1)
