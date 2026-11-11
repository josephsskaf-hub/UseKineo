import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
function loader(over = {}) {
  const cache = new Map()
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports
    const module = { exports: {} }; cache.set(path, module)
    const req = (name) => {
      if (name.startsWith('node:')) return nativeRequire(name)
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
      const target = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
      assert(target, `dependência externa: ${name}`)
      return load(target)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}

// KINEO-PESSOA-DO-PEDIDO-1111 — 1º filme de cliente no formato de 4 planos (vídeo 24564d97, 11/11 09:16, Kling 4 grátis, nota 7,0): o pedido
// descrevia "a young blonde woman, approximately 25 years old, with natural makeup and a casual pastel pink outfit" e saiu uma morena de perfil.
// Trava (Node puro, fontes reais transpiladas, sem rede), com o PEDIDO e o ROTEIRO reais do despacho: (a) a pessoa do pedido é lida verbatim
// e para antes do lugar; (b) o formato que o roteiro curto deixava no faceless por padrão vira história com personagem; (c) a cena 1 sai com
// a moça descrita, sem silhueta, e o plano do Kling 4 (compactador de 512) ainda leva "blonde" e "pastel pink outfit"; (d) controles: tag
// [faceless], "sem apresentador", apresentador, pessoa nua e pedido ausente ficam como estavam; (e) a rota usa a pessoa nos 3 pontos.
const PEDIDO = "UGC MIARA — 15 segundos\n\nDiálogo de la chica (español de España, natural y entusiasta):\n\n«¿Pero cómo no había descubierto esto antes? 😍 Es un Gel Pen 3 en 1: base, color y top en un solo producto. ¡Y ahora compras uno y te llevas tres por 24,90 €! Mira qué bonitas quedan las uñas. Yo ya tengo mis favoritos».\n\nInstrucciones visuales para Kineo (en inglés):\n\nCreate a realistic 15-second vertical 9:16 UGC beauty video for MIARA.\n\nA young blonde woman, approximately 25 years old, with natural makeup and a casual pastel pink outfit, in a beautiful but realistic modern home with white furniture and subtle marble details.\n\nShe holds the EXACT black MIARA Gel Pen shown in the uploaded product reference. The product must remain black, with its original shape and proportions.\n\nShow a close-up of her perfectly manicured nails in a beautiful glossy soft pink shade. All five fingernails must have the same uniform pink finish.\n\nThe woman speaks naturally to the camera in European Spanish, like a real beauty enthusiast sharing an exciting discovery.\n\nShow the real pink hexagonal UV/LED lamp from the supplied reference image. Do not replace it with a different lamp.\n\nUse soft natural daylight, realistic skin texture, authentic handheld smartphone framing and minimal cuts.\n\nEnd with the offer clearly displayed:\n\n“COMPRA 1 Y LLÉVATE 2 GRATIS”\n\n“3 GEL PEN · 24,90 €”\n\n“MIARA”\n\nNo distorted hands, no extra fingers, no product redesign, no fake packaging, no incorrect branding."
const ROTEIRO = "HOOK (0-2s): [Pexels: young woman smiling] «¿Pero cómo no había descubierto esto antes?»\n\nMICRO REWARD 1: [Pexels: gel pen closeup] «Es un Gel Pen 3 en 1: base, color y top.»\n\nMICRO REWARD 2: [Pexels: manicured nails closeup] «Mira qué bonitas quedan las uñas.»\n\nPAYOFF: [Pexels: UV lamp and nails] «¡Compras uno y te llevas tres por 24,90 €! Ya tengo mis favoritos.»"
const CENA1 = "A young woman beams with joy, her eyes sparkling, as sunlight illuminates her face in a cozy room."
const PESSOA = "a young blonde woman, approximately 25 years old, with natural makeup and a casual pastel pink outfit"

function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let P, V, VP, S, K
  try { const load = loader(over); P = load("lib/cinematic/pessoaDoPedido.ts"); V = load("lib/cinematic/visualMode.ts"); VP = load("lib/cinematic/visualPromptPolicy.ts"); S = load("lib/cinematic/sceneStyle.ts"); K = load("lib/cinematic/cenaKling4.ts") } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const pessoa = P.pessoaDoPedido(PEDIDO)
  no(pessoa !== PESSOA, `(a) pessoa do pedido: ${JSON.stringify(pessoa)}`)
  const antes = V.decidirFormato(ROTEIRO, false)
  no(antes.modo !== "documentary_faceless", "premissa: o roteiro curto sozinho já não cai no faceless — reveja o guardião")
  const depois = P.formatoComPessoaDoPedido(antes, pessoa)
  no(depois.modo !== "character_story" || depois.apresentadorPedido, `(b) formato com a pessoa: ${depois.modo}`)
  const style = S.deriveStyleAnchor("photorealistic documentary")
  const cena = VP.buildClassicVisualPrompt(CENA1, { mode: depois.modo, style, character: P.fichaDaPessoa(S.deriveStoryCharacter(ROTEIRO), pessoa), aspect: "9:16" })
  no(!/blonde/.test(cena) || !/pastel pink outfit/.test(cena) || !/25 years old/.test(cena), `(c) a cena 1 não leva a moça descrita → ${cena.slice(0, 220)}`)
  no(/silhouette|faceless|no foreground human faces/i.test(cena), "(c) a cena 1 ainda apaga a pessoa (silhueta/faceless)")
  const plano = K.promptDaCenaKling4(cena, style, 0, true)
  no(Array.from(plano).length > 512 || !/blonde/.test(plano) || !/pastel pink outfit/.test(plano), `(c) o plano do Kling 4 perdeu a moça → ${plano}`)
  no(!plano.endsWith(" Mouth closed, no speaking."), "(c) o plano perdeu a cauda da boca")
  // a ficha do plano termina no ponto dela: antes levava o sufixo e o corte de 140 deixava "no readable text, letters, numbers, l."
  const ficha = /Identity: ([^]*?)\. /.exec(plano)?.[1] ?? ''
  no(!ficha.startsWith(PESSOA) || /no readable text|vertical framing/.test(ficha) || /numbers, l\.|vertical framing|subject framed/.test(plano) || (plano.match(/no readable text/g) ?? []).length > 1, `(c) a ficha do plano levou o sufixo ou foi cortada no meio → ${plano.slice(0, 260)}`)
  // controles
  const tag = V.decidirFormato(ROTEIRO, true)
  no(P.formatoComPessoaDoPedido(tag, pessoa) !== tag, "(d) tag [faceless] mudou")
  const sem = { modo: "documentary_faceless", motivo: "o roteiro pede explicitamente SEM apresentador", apresentadorPedido: false }
  no(P.formatoComPessoaDoPedido(sem, pessoa) !== sem, "(d) \"sem apresentador\" mudou")
  const ap = { modo: "presenter", motivo: "x", apresentadorPedido: true }
  no(P.formatoComPessoaDoPedido(ap, pessoa) !== ap, "(d) apresentador mudou")
  no(P.formatoComPessoaDoPedido(antes, null) !== antes, "(d) sem pessoa o formato mudou")
  for (const t of [undefined, "", "Explain how a man can save money.", "Mara, a young guard, enters.", "Uma mulher loira de 25 anos entra na loja.", "A young blonde woman holds the pen."].slice(0, 5))
    no(P.pessoaDoPedido(t) !== null, `(d) leu pessoa onde não há ficha sem nome: ${JSON.stringify(t)} → ${P.pessoaDoPedido(t)}`)
  no(P.pessoaDoPedido("A young blonde woman holds the pen.") !== "a young blonde woman", "(d) a ação entrou na ficha")
  no(P.pessoaDoPedido("A woman, 30 years old, wearing a red coat, walks home.") !== "a woman, 30 years old, wearing a red coat", "(d) pessoa nua com idade e roupa")
  // a rota
  const rota = over["app/api/generate-video-cinematic/route.ts"] ?? read("app/api/generate-video-cinematic/route.ts")
  no(!rota.includes('const pessoaPedida = pessoaDoPedido(pedidoDoCliente)') /* KINEO-PEDIDO-DO-CLIENTE-1111 */, "(e) a rota não lê a pessoa do pedido original")
  no(!rota.includes('formatoComEstrela(formatoComPessoaDoPedido(decidirFormato(prompt, tagFacelessPresente), pessoaPedida)'), "(e) o formato não usa a pessoa do pedido")
  no(!rota.includes('storyMode ? fichaDaPessoa(deriveStoryCharacter(prompt), pessoaPedida) : null'), "(e) a ficha da história não usa a pessoa do pedido")
  no(!rota.includes('?? fichaDaPessoa(deriveExplicitCharacter(prompt), pessoaPedida) ??'), "(e) a ficha do hollywood não usa a pessoa do pedido")
  no(!rota.includes('const pessoaNoElenco = elencoComPessoaDoPedido(pessoaPedida, personagemElenco.elenco)'), "(e) o elenco do filme não recebe a pessoa do pedido")
  no(!rota.includes('const pessoa15 = elencoComPessoaDoPedido(pessoaPedida, elencoDoAjuste)'), "(e) o elenco do filme de 15 s não recebe a pessoa do pedido")
  p.push(...ficha657(P, S, K, over))
  return p
}

// ── KINEO-PESSOA-DO-PEDIDO-1111 (2) — o filme 657ad797 (11/11 11:57, Kling 4 grátis, nota 6,5): o pedido descrevia "a beautiful 26-year-old
// South African woman with warm brown skin, expressive dark brown eyes and long neat black braids … She wears a cream blouse and elegant black
// trousers"; o plano levou só "…, with warm brown skin" (a 1ª oração) e o elenco sorteou "wavy hair … dark blue jacket over a grey t-shirt" —
// que foi o que saiu. Prova com o pedido e os 3 prompts REAIS do despacho, refeitos com o código de hoje (ensaio de US$ 0, sem rede).
const R657 = JSON.parse(readFileSync(join(root, "scripts/test-support/pedido-657ad797-1111.json"), "utf8"))
const PESSOA657 = "a beautiful 26-year-old South African woman, with warm brown skin, expressive dark brown eyes and long neat black braids, wearing a cream blouse and elegant black trousers"
function ficha657(P, S, K, over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let T, J
  try { const load = loader(over); T = load("lib/kling4Trial.ts"); J = load("lib/cinematic/juizFicha.ts") } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const pessoa = P.pessoaDoPedido(R657.original)
  no(pessoa !== PESSOA657, `(f) 657ad797: a pessoa do pedido não veio inteira → ${JSON.stringify(pessoa)}`)
  no(P.fichaDaPessoa(R657.derivada, pessoa) !== pessoa, "(f) a ficha da história ficou com a 1ª oração do roteiro")
  no(P.fichaDaPessoa("Mara, the guard", pessoa) !== "Mara, the guard" || P.fichaDaPessoa("an old fisherman", pessoa) !== "an old fisherman", "(f) a pessoa do pedido tomou a ficha de um nome próprio ou de outro papel")
  const el = P.elencoComPessoaDoPedido(pessoa, [{ nome: "the woman", tipo: "humano", origem: "deterministica", canonica: R657.sorteada }, { nome: "the man", tipo: "humano", origem: "deterministica", canonica: "the man, x" }])
  no(el.trocas.length !== 1 || el.elenco[0].origem !== "autor" || !el.elenco[0].canonica.includes("long neat black braids") || el.elenco[1].canonica !== "the man, x", `(f) o elenco sorteado não virou a pessoa do pedido → ${JSON.stringify(el.elenco.map((f) => f.canonica))}`)
  const style = S.deriveStyleAnchor("photorealistic documentary")
  const ficha = P.fichaDaPessoa(R657.derivada, pessoa)
  const prompts = R657.prompts.map((x) => J.trocarFichaNoPrompt(x.split(`consistent design: ${R657.derivada}.`).join(`consistent design: ${ficha}.`), el.trocas))
  const mp = T.buildKling4TrialInput(prompts.map((x, i) => K.promptDaCenaKling4(x, style, i, true)), [null, null, null], { voiceovers: R657.falas, wordsPerSecond: R657.wps }).input.multi_prompt
  for (const [i, m] of mp.entries()) {
    no(!/long neat black braids/.test(m.prompt) || !/cream blouse/.test(m.prompt) || !/black trousers/.test(m.prompt), `(g) plano ${i + 1}: tranças ou roupa fora da ficha → ${m.prompt.slice(0, 300)}`)
    no(/wavy hair|dark blue jacket|grey t-shirt/.test(m.prompt), `(g) plano ${i + 1}: o elenco sorteado voltou`)
    no(Array.from(m.prompt).length > 512 || !m.prompt.endsWith(" Mouth closed, no speaking."), `(g) plano ${i + 1}: passou de 512 ou perdeu a cauda`)
    // degrau 4: a origem já está na ficha ("South African woman"); os juízes leem a marca no prompt cheio da cena, que continua com ela
    no(!/South African woman/.test(m.prompt) || !/natural features of South African people/.test(prompts[i]), `(g) plano ${i + 1}: perdeu a origem`)
    no(/\s(?:the|a|an|of|to|into|in|with|and|as),?\s+no readable text/i.test(m.prompt), `(j) plano ${i + 1}: o corte da ação terminou em palavra solta → ${m.prompt.slice(-160)}`)
  }
  no(!mp[1].prompt.includes("Every screen glows with soft abstract light and colour.") || /writing out of focus/.test(mp[1].prompt), `(k) plano 2 (celular): a tela sem texto caiu do plano → ${mp[1].prompt.slice(-200)}`)
  no(P.pessoaDoPedido("A woman, 30 years old, wearing a red coat, walks home.") !== "a woman, 30 years old, wearing a red coat", "(h) a ação entrou na lista da roupa")
  // o corte por palavra (sem frase nem vírgula para cortar) não termina em artigo/preposição
  const FQ = loader(over)("lib/cinematic/filmQuality.ts")
  for (const lim of [88, 92, 96, 100, 104]) {
    const corte = FQ.cortaEmFronteira("A close-up shot of a woman's eyes in a quiet café as she slowly gazes into the distance through the tall window at the street", lim)
    no(/\s(?:the|a|an|of|to|into|in|at|with|and|as|through)$/i.test(corte), `(j) corte a ${lim}: terminou em palavra solta → …${corte.slice(-40)}`)
  }
  return p
}

const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log("ok  estado atual limpo (a moça do pedido chega à cena e ao plano do Kling 4)")
const pp = read("lib/cinematic/pessoaDoPedido.ts"), rt = read("app/api/generate-video-cinematic/route.ts")
const MUT = [
  ["M1 o formato ignora a pessoa", { "lib/cinematic/pessoaDoPedido.ts": pp.replace("if (!pessoa || decisao.modo", "if (true || decisao.modo") }],
  ["M2 a ficha para na cabeça", { "lib/cinematic/pessoaDoPedido.ts": pp.replace("if (IDADE_RE.test(p)) { aceitos.push(p); lista = ''; continue }", "if (IDADE_RE.test(p)) break") }],
  ["M3 a rota volta à ficha só do roteiro", { "app/api/generate-video-cinematic/route.ts": rt.replace("storyMode ? fichaDaPessoa(deriveStoryCharacter(prompt), pessoaPedida) : null", "storyMode ? deriveStoryCharacter(prompt) : null") }],
  ["M6 a lista de traços para na 1ª vírgula", { "lib/cinematic/pessoaDoPedido.ts": pp.replace("if (elo) lista = ELO_DE_LISTA_RE.exec(p)?.[0].toLowerCase() ?? ''", "if (elo) lista = ''") }],
  ["M7 a frase seguinte (a roupa) não é lida", { "lib/cinematic/pessoaDoPedido.ts": pp.replace("const s = FRASE_SEGUINTE_RE.exec(f.replace(/[.;!?]+$/u, ''))", "const s = null") }],
  ["M8 o compactador volta a pôr a ação antes e a cortar a ficha", { "lib/cinematic/filmQuality.ts": read("lib/cinematic/filmQuality.ts").replace("    if (identity && !cast) {", "    if (false) {") }],
  ["M9 o elenco de 15 s não recebe a pessoa", { "app/api/generate-video-cinematic/route.ts": rt.replace("const pessoa15 = elencoComPessoaDoPedido(pessoaPedida, elencoDoAjuste)", "const pessoa15 = elencoComPessoaDoPedido(null, elencoDoAjuste)") }],
  ["M10 a ficha da história fica com a derivada curta", { "lib/cinematic/pessoaDoPedido.ts": pp.replace("return papel && new RegExp(", "return false && new RegExp(") }],
  ["M5 a ficha do plano volta a ir até o fim da linha e ao corte no caractere", { "lib/cinematic/filmQuality.ts": read("lib/cinematic/filmQuality.ts").replace("${cortaEmFronteira(identity[1], budget).replace(/[.,;\\s]+$/, '')}", "${take(identity[1], budget)}").replace("consistent design: ([^\\n]+?)(?:\\.(?=\\s|$)|$)/i", "consistent design: ([^\\n]+)/i") }],
  ["M12 a tela sem texto volta a depender de sobra", { "lib/cinematic/filmQuality.ts": read("lib/cinematic/filmQuality.ts").replace("const textProtection = textProtectionBase && superficie && !textProtectionBase.includes(superficie)", "const textProtection = false") }],
  ["M14 a origem volta repetida no plano", { "lib/cinematic/filmQuality.ts": read("lib/cinematic/filmQuality.ts").replace("const origemNaFicha = !!identity && !cast", "const origemNaFicha = false && !cast") }],
  ["M15 o corte por palavra volta a terminar em artigo", { "lib/cinematic/filmQuality.ts": read("lib/cinematic/filmQuality.ts").replace(".replace(/(?:\\s+(?:the|a|an|of|to|into|onto|in|on|at|by|for|from|with|without|and|or|but|as|while|that|which|who|through|over|under|across|toward|towards|behind|near|upon|after|before|her|his|their|its|is|are|was|were))+$/iu, '')", "") }],
  ["M4 a pessoa nua vira ficha", { "lib/cinematic/pessoaDoPedido.ts": pp.replace("if (nua && aceitos.length === 0) continue", "if (false) continue") }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
