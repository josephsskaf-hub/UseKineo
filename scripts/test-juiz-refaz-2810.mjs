// KINEO-JUIZ-REFAZ-2810 [TRAVA 8.2 — vai do fundador 28/10 "o juiz tem de refazer até ficar bom; o mascote tem de morrer"] — guardião.
// Prova OFFLINE (sem fal, sem OpenAI), EXECUTANDO o código REAL transpilado, com os TEXTOS REAIS dos filmes defeituosos:
//   · Gênesis 28/10 (dc4ac291, mypopson): "Among the stars, Lucifer, the brightest angel, fell from grace" → "Among, a teal star" + "Lucifer,
//     a bright green angel with big round friendly eyes and a short tail"; crítico 20 FAIL → foto nova 30 FAIL → a 30 FOI ENTREGUE.
//   · Ghost Rider em Teerã 27/10 (sinabahrami095) e Krishna/Vishwaroop 27/10 (anishraj2967): o MESMO mascote roxo.
// O que fica provado:
//   A. SERES FIÉIS — anatomia por espécie; o fofo só no conto infantil; figura conhecida (Lucifer, Ghost Rider, Krishna) com a cara certa.
//   B. ELENCO (estrada clássica, todo cliente) — "Among" não é gente; Lucifer é anjo caído; Ghost Rider é motoqueiro de crânio em chamas;
//      a cláusula da cena 1 do Gênesis leva o Lucifer certo; Mishu (conto infantil) tem asas e escamas E o estilo fofo.
//   C. FOLHA — a ficha canônica REAL não inventa mais o mascote; "Krishna emerges" sem adjetivo cai na tabela (pele azul).
//   D. O LAÇO DO JUIZ (crítico REAL com fetch falso) — refaz, julga de novo, refaz a 2ª vez; 3 vereditos no máximo; fica a de maior nota;
//      instrução da 2ª vem do MOTIVO e é positiva; teto por filme; com folha 1 foto nova; prazo curto = para; relato com tentativas/notas.
//   E. RUBRICA — FAIL explícito de mascote e de personagem ausente; "mascot"/"missing" lidos como sujeito; o elenco do prompt vai ao crítico.
//   M. MUTANTES — cada regra fica vermelha quando quebrada.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const troca = (src, de, para) => { if (!src.includes(de)) throw new Error('mutante: trecho ausente — ' + de.slice(0, 70)); return src.replace(de, para) }

const roda = (src, mods = {}, escopo = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, module: { exports: exp }, require: (id) => { if (id in mods) return mods[id]; if (id === '@/lib/hollywood/realPeople') return mods['@/lib/hollywood/router'] ?? roda(rd('lib/hollywood/realPeople.ts')); if (id === '@/lib/cinematic/pessoasDaNarracao') return roda(rd('lib/cinematic/pessoasDaNarracao.ts')); throw new Error(`import inesperado ${id}`) }, console, process: { env: { OPENAI_API_KEY: 'k' } }, Intl, Date, setTimeout, clearTimeout, AbortController, JSON, Math, Promise, Error, Number, String, Array, Object, Set, Map, RegExp, ...escopo }) // KINEO-QUALIDADE-TODOS-MOTORES-2910 — sanitizador puro; asserções e mutantes continuam iguais.
  return exp
}
const ARQ = { seres: 'lib/cinematic/seresFieis.ts', elenco: 'lib/cinematic/elencoEpoca.ts', folha: 'lib/cinematic/folhaDePersonagem.ts', ajuste: 'lib/cinematic/personagemAjuste.ts', critico: 'lib/cinematic/criticoStill.ts' }
const SRC = Object.fromEntries(Object.entries(ARQ).map(([k, p]) => [k, rd(p)]))
function biblioteca(over = {}) {
  const seres = roda(over.seres ?? SRC.seres)
  const elenco = roda(over.elenco ?? SRC.elenco, { '@/lib/hollywood/router': { sanitizeRealPeople: (t) => t }, '@/lib/cinematic/seresFieis': seres })
  const folha = roda(over.folha ?? SRC.folha, { '@/lib/cinematic/sceneStyle': { deriveExplicitCharacter: () => null }, '@/lib/estrelaDoFilme': { ESTRELA_EDIT_SLUG: 'x', buildEstrelaEditInput: () => ({}) }, '@/lib/aiModels': { AI_TEXT_MODELS: { scenePlannerLight: 'gpt-4o-mini' } }, '@/lib/cinematic/seresFieis': seres })
  const ajuste = roda(over.ajuste ?? SRC.ajuste, { '@/lib/cinematic/folhaDePersonagem': folha, '@/lib/safety/moderationPolicy': { mentionsMinor: () => false }, '@/lib/cinematic/seresFieis': seres })
  const critico = roda(over.critico ?? SRC.critico, { '@/lib/hollywood/juizStill': { JUIZ_STILL_MODELO: 'gpt-4o-mini' } })
  return { seres, elenco, folha, ajuste, critico }
}
const B = biblioteca()

// ── os textos REAIS ──
const GENESIS_PEDIDO = "[Idea: Please make the story about How God created the earth , Lucifer fall , Adam and eve and seepent]\nHOOK (0-2s): [Pexels: cosmic galaxy swirl] In the beginning, God created Earth—then chaos unfolded.\n\nMICRO REWARD 1: [Pexels: starry sky timelapse] Among the stars, Lucifer, the brightest angel, fell from grace.\n\nMICRO REWARD 2: [Pexels: lush garden paradise] In Eden, God formed Adam and Eve, perfection in paradise.\n\nPAYOFF: [Pexels: snake slithering in grass] But a serpent whispered temptation... and humanity's journey changed forever."
const GENESIS_FALAS = ['In the beginning, God created Earth—then chaos unfolded. Among the stars, Lucifer, the brightest angel, fell from grace.', 'In Eden, God formed Adam and Eve, perfection in paradise.', "But a serpent whispered temptation... and humanity's journey changed forever."]
const GENESIS_PROMPTS = [
  'A vast cosmic galaxy swirl igniting in deep space, nebula light spreading, faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, 9:16 vertical, subject framed',
  'A slow push-in through a lush, vibrant garden, sunlight filtering through leaves, revealing Adam and Eve standing together in serene harmony., faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces',
  'A close-up of a serpent slithering through the grass, its scales glistening in the dappled sunlight, creating an atmosphere of tension and temptation., faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces',
]
const GENESIS_CTX = `${GENESIS_PEDIDO} ${GENESIS_FALAS.join(' ')}`
const GHOST = "Ever seen a ghost ride through neon-lit Tehran?\n\nTehran’s motorcycle culture dates back to the 1960s, thriving under the Pahlavi dynasty.\n\nIran is home to over 15 million registered motorcycles, making it one of the top countries for bikers!\n\nThat’s how the Ghost Rider appears... in the heart of Tehran's night!"
const KRISHNA_2810 = 'Under a deep indigo sky... a tiny blue-skinned Lord Krishna emerges.\n\nA glowing red-orange mandala... Sanskrit-style runes spinning behind him.\n\nColossal Vishwaroop rises... multiple serene faces and ornate armor.\n\nThe mandala flares brilliantly... Krishna stands small against the vast cosmic form.'
const KRISHNA_NU = 'Krishna emerges from the river at dawn. Krishna smiles and raises one hand. The demon army trembles.'
const URDU_EN = "Amna found a magical star, bright and mysterious. Mishu, the tiny dragon, tries to understand the star's power. With Baba Noor's help, Amna put the star back in the sky."
const MASCOTE_RE = /big round friendly eyes|short tail, no clothes|cream belly/i

console.log('== A. seres fiéis ==')
{
  const S = B.seres
  const luc = S.figuraFiel('Lucifer')
  checa('A1 Lucifer é figura conhecida: anjo caído de asas escuras em fogo e luz, não um bichinho', luc && luc.tipo === 'criatura' && /fallen angel/.test(luc.descricao) && /dark feathered wings/.test(luc.descricao) && !MASCOTE_RE.test(luc.descricao))
  const gr = S.figuraFiel('the Ghost Rider')
  checa('A2 Ghost Rider = equivalente genérico fiel (crânio em chamas numa moto, sem logotipo)', gr && /flaming skull/.test(gr.descricao) && /motorcycle/.test(gr.descricao) && /no logos/.test(gr.descricao))
  checa('A3 "Lord Krishna" e "krishna" caem na mesma figura (pele azul, pena de pavão)', S.figuraFiel('Lord Krishna')?.descricao === S.figuraFiel('krishna')?.descricao && /deep blue skin/.test(S.figuraFiel('Krishna')?.descricao ?? ''))
  checa('A4 nome desconhecido → null', S.figuraFiel('Zorblax') === null && S.figuraFiel('') === null)
  const anjo = S.descricaoFielDoSer({ nome: 'Zariel', tipo: 'criatura', especie: 'angel', corDita: null, corSorteada: 'bright green', pequeno: false, infantil: false })
  checa('A5 anjo genérico: asas de pena, túnica, rosto humano — nunca verde sorteado, nunca mascote', /feathered wings/.test(anjo) && !/bright green/.test(anjo) && !MASCOTE_RE.test(anjo))
  const anjoInfantil = S.descricaoFielDoSer({ nome: 'Zariel', tipo: 'criatura', especie: 'angel', corDita: null, corSorteada: 'bright green', pequeno: true, infantil: true })
  checa('A6 ser sagrado/sombrio nem no conto infantil fica fofo ou colorido', /feathered wings/.test(anjoInfantil) && !/cartoon style/.test(anjoInfantil) && !/bright green/.test(anjoInfantil))
  const fantasma = S.descricaoFielDoSer({ nome: 'Boo', tipo: 'criatura', especie: 'ghost', corDita: null, corSorteada: 'soft purple', pequeno: false, infantil: false })
  checa('A7 fantasma: figura espectral translúcida, não "a soft purple ghost with big round friendly eyes" (o Ghost Rider de 27/10)', /translucent/.test(fantasma) && !/soft purple/.test(fantasma) && !MASCOTE_RE.test(fantasma))
  const dragaoKids = S.descricaoFielDoSer({ nome: 'Mishu', tipo: 'criatura', especie: 'dragon', corDita: null, corSorteada: 'bright green', pequeno: true, infantil: true })
  checa('A8 dragãozinho de conto infantil: asas e escamas (anatomia) + estilo fofo + cor da casa', /wings/.test(dragaoKids) && /scaled/.test(dragaoKids) && /cartoon style/.test(dragaoKids) && /bright green/.test(dragaoKids) && !MASCOTE_RE.test(dragaoKids))
  const dragaoAdulto = S.descricaoFielDoSer({ nome: 'Smaug', tipo: 'criatura', especie: 'dragon', corDita: 'red', corSorteada: 'teal', pequeno: false, infantil: false })
  checa('A9 dragão fora do conto infantil: anatomia fiel, só a cor que o TEXTO disse (red), nada de teal', /wings/.test(dragaoAdulto) && /red in colour/.test(dragaoAdulto) && !/teal/.test(dragaoAdulto) && !/cartoon/.test(dragaoAdulto))
  const raposa = S.descricaoFielDoSer({ nome: 'Rusty', tipo: 'animal', especie: 'fox', corDita: null, corSorteada: 'sky blue', pequeno: false, infantil: false })
  checa('A10 bicho real fora do conto infantil: anatomia realista, cores naturais, sem cor sorteada', /realistic fox anatomy/.test(raposa) && !/sky blue/.test(raposa))
  const estrelaKids = S.descricaoFielDoSer({ nome: 'Twinkle', tipo: 'criatura', especie: 'star', corDita: null, corSorteada: 'sunny yellow', pequeno: true, infantil: true })
  checa('A11 coisa que vira personagem no conto infantil ainda tem a FORMA da coisa', /shaped like a star/.test(estrelaKids) && /cartoon style/.test(estrelaKids))
  checa('A12 determinístico: mesmo pedido → mesmo texto; dino → dinosaur; "dragons" → dragon', S.descricaoFielDoSer({ nome: 'X', tipo: 'criatura', especie: 'dino', corDita: null, corSorteada: 'teal', pequeno: false, infantil: false }) === S.descricaoFielDoSer({ nome: 'X', tipo: 'criatura', especie: 'dinosaur', corDita: null, corSorteada: 'teal', pequeno: false, infantil: false }) && S.especieCanonica('dragons') === 'dragon' && S.especieCanonica('octopus') === 'octopus')
  checa('A13 nenhuma anatomia da tabela carrega o mascote', Object.values(S.ANATOMIA_DO_SER).every((t) => !MASCOTE_RE.test(t)) && S.FIGURAS_FIEIS.every((f) => !MASCOTE_RE.test(f.descricao)))
}

console.log('== B. o elenco da estrada clássica (todo cliente) ==')
{
  const E = B.elenco
  const gen = E.personagensNomeados(GENESIS_CTX)
  const nomes = gen.map((p) => p.nome)
  checa(`B1 Gênesis REAL: "Among" NÃO é personagem (era "Among, a teal star") — elenco = ${JSON.stringify(nomes)}`, !nomes.includes('Among') && !nomes.some((n) => /^Among\b/.test(n)))
  const luc = gen.find((p) => p.nome === 'Lucifer')
  checa('B2 Gênesis REAL: Lucifer está no elenco como anjo caído (asas escuras, fogo e luz), tipo criatura, protagonista', luc && luc.tipo === 'criatura' && luc.protagonista === true && /fallen angel/.test(luc.descricao) && /dark feathered wings/.test(luc.descricao))
  checa('B3 Gênesis REAL: nenhuma descrição do elenco é o mascote ("big round friendly eyes and a short tail")', gen.every((p) => !MASCOTE_RE.test(p.descricao)) && gen.every((p) => !/bright green angel|teal star/.test(p.descricao)))
  const r = E.aplicarElencoEEpoca({ prompts: GENESIS_PROMPTS, falas: GENESIS_FALAS, contextoOriginal: GENESIS_CTX, contextoFiltro: GENESIS_CTX, modo: 'documentary_faceless', tagFaceless: false })
  checa('B4 a cláusula da cena 1 (a fala cita Lucifer) leva o anjo caído, e só ele', /^Named character in this shot: Lucifer, the fallen angel/.test(r.prompts[0]) && !/Among/.test(r.prompts[0]) && !MASCOTE_RE.test(r.prompts[0]))
  checa('B5 as cenas 2 e 3 (Éden, serpente) ficam byte a byte', r.prompts[1] === GENESIS_PROMPTS[1] && r.prompts[2] === GENESIS_PROMPTS[2])
  checa('B6 o relato do elenco diz 1 personagem (Lucifer), cena 1 pela fala', r.relato.elenco.length === 1 && r.relato.elenco[0].nome === 'Lucifer' && JSON.stringify(r.relato.elenco[0].cenas_pela_fala) === '[1]')
  const ghost = E.personagensNomeados(GHOST)
  const gr = ghost.find((p) => /ghost rider/i.test(p.nome))
  checa('B7 Ghost Rider REAL: motoqueiro de crânio em chamas, não "a soft purple ghost with big round friendly eyes"', gr && /flaming skull/.test(gr.descricao) && /motorcycle/.test(gr.descricao) && !MASCOTE_RE.test(gr.descricao))
  const krishnaElenco = E.personagensNomeados(KRISHNA_2810)
  const kr = krishnaElenco.find((p) => /krishna/i.test(p.nome))
  checa('B8 Krishna REAL (28/10, "Lord Krishna"): a iconografia (pele azul, pena de pavão, flauta), não um mascote nem "a man in his thirties"', kr && /deep blue skin/.test(kr.descricao) && /peacock feather/.test(kr.descricao) && !MASCOTE_RE.test(kr.descricao))
  const vish = krishnaElenco.find((p) => /vishwaroop/i.test(p.nome))
  checa('B8b "Colossal Vishwaroop" (o mesmo filme) é a forma cósmica de Vishnu, não "a person in their thirties"', vish && /cosmic universal form/.test(vish.descricao) && !/thirties/.test(vish.descricao))
  const urdu = E.personagensNomeados(URDU_EN, null, true)
  const mishu = urdu.find((p) => p.nome === 'Mishu')
  checa('B9 conto infantil REAL (Mishu): dragão com asas e escamas E estilo fofo — fofo sim, mascote genérico não', mishu && mishu.tipo === 'criatura' && /dragon/.test(mishu.descricao) && /wings/.test(mishu.descricao) && /cartoon style/.test(mishu.descricao) && !MASCOTE_RE.test(mishu.descricao))
  checa('B10 Amna e Baba Noor continuam gente (o conserto de 27/10 segue intacto)', urdu.find((p) => p.nome === 'Amna')?.tipo === 'humano' && /^Baba Noor, an elderly man/.test(urdu.find((p) => p.nome === 'Baba Noor')?.descricao ?? ''))
  const zariel = E.personagensNomeados('Zariel, the brightest angel, fell from the sky. Zariel wept.').find((p) => p.nome === 'Zariel')
  checa('B11 anjo nomeado que a tabela não conhece: anatomia de anjo (asas de pena), sem cor sorteada, sem mascote', zariel && zariel.tipo === 'criatura' && /feathered wings/.test(zariel.descricao) && !/bright green|sky blue|soft purple|teal|sunny yellow|warm orange/.test(zariel.descricao) && !MASCOTE_RE.test(zariel.descricao))
  const estrela = E.personagensNomeados('Behold the stars. Nova the star burned bright. Nova exploded.')
  checa('B12 fora do conto infantil, "Nova the star" é cenário, não personagem; "Behold" tampouco', !estrela.some((p) => p.nome === 'Nova' || p.nome === 'Behold'))
  checa('B12b preposição que abre a frase nunca vira personagem, nem no conto infantil ("Beyond the dragon lair" era "Beyond, a dragon")', !E.personagensNomeados('Beyond the dragon lair, Zariel waited in the dark. Zariel wept.', null, true).some((p) => p.nome === 'Beyond') && !E.personagensNomeados('Among the star dust, Zariel waited in the dark. Zariel wept.', null, true).some((p) => p.nome === 'Among'))
  const estrelaKids = E.personagensNomeados('Nova the star burned bright. Nova giggled.', null, true)
  checa('B13 no conto infantil, "Nova the star" É personagem, com a forma de estrela', estrelaKids.some((p) => p.nome === 'Nova' && /shaped like a star/.test(p.descricao)))
  const plural = E.personagensNomeados('Zorblax the stars twinkled. Zorblax laughed.', null, true)
  checa('B14 "<Nome> the stars" (plural) não é aposto de espécie ("Mishu the dragon" é singular)', !plural.some((p) => p.nome === 'Zorblax' && /star/.test(p.descricao)))
}

console.log('== C. a folha (ficha canônica REAL) ==')
{
  const zog = B.ajuste.elencoDoRoteiro('Zog, the little dragon, flew over the hills. Zog laughed and Zog hid behind a cloud.')
  const z = zog.find((f) => f.nome === 'Zog')
  checa('C1 ficha determinística REAL de um dragãozinho: asas e escamas + estilo fofo, sem "cream belly, big round friendly eyes, short tail"', z && /dragon/.test(z.canonica) && /wings/.test(z.canonica) && !MASCOTE_RE.test(z.canonica))
  const kr = B.ajuste.elencoDoRoteiro(KRISHNA_NU).find((f) => f.nome === 'Krishna')
  checa('C2 "Krishna emerges" sem adjetivo: cai na tabela (origem mítica, pele azul) — não é mais o demônio roxo sorteado', kr && kr.origem === 'mitica' && /deep blue skin/.test(kr.canonica) && !MASCOTE_RE.test(kr.canonica) && !/demon/.test(kr.canonica))
  const gr = B.ajuste.elencoDoRoteiro(GHOST).find((f) => /ghost rider/i.test(f.nome))
  checa('C3 Ghost Rider na folha: crânio em chamas numa moto (origem mítica)', gr && gr.origem === 'mitica' && /flaming skull/.test(gr.canonica))
  const fantasma = B.folha.elencoDeterministico('Boo the ghost haunted the hall. Boo moaned.').find((f) => f.nome === 'Boo')
  checa('C4 fantasma genérico na ficha: espectral translúcido, sem cor sorteada nem mascote', fantasma && /translucent/.test(fantasma.canonica) && !MASCOTE_RE.test(fantasma.canonica) && !/bright green|sky blue|soft purple|sunny yellow|warm orange|teal/.test(fantasma.canonica))
}

// ── o crítico REAL com fetch falso e relógio controlado ──
function fabrica({ respostas = {}, stillMs = 5_000, criticoMs = 3_000, falhaStill = new Set() } = {}) {
  const clock = { t: 1_000_000 }
  const pedidos = []
  const stills = []
  let n = 0
  const fetch = async (_url, init) => {
    const corpo = JSON.parse(init.body)
    const imgs = corpo.messages[1].content.filter((p) => p.type === 'image_url').map((p) => p.image_url.url)
    const img = imgs[imgs.length - 1]
    pedidos.push({ img, sistema: corpo.messages[0].content, texto: corpo.messages[1].content.find((p) => p.type === 'text').text })
    clock.t += criticoMs
    const r = respostas[img] ?? { verdict: 'PASS', issues: [], reason: '', score: 85 }
    if (typeof r === 'number') return { ok: false, status: r, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(r) } }], usage: { prompt_tokens: 3200, completion_tokens: 40 } }) }
  }
  const gerarStill = async (prompt, seed, janela) => { const k = n++; stills.push({ prompt, seed, janela }); clock.t += stillMs; return falhaStill.has(k) ? null : `novo://${k}` }
  return { clock, pedidos, stills, fetch, gerarStill }
}
const FAIL = (reason, score, issues = ['subject']) => ({ verdict: 'FAIL', issues, reason, score })
const PASS = (score = 90) => ({ verdict: 'PASS', issues: [], reason: '', score })
async function cena(C, { respostas, prazoMs = 60_000, referencia, maxRegeracoesCena, modo = 'enforce', filme, falhaStill, prompt = 'Named character in this shot: Lucifer, the fallen angel: a tall angelic figure with huge dark feathered wings — clearly visible in frame. A vast cosmic galaxy swirl igniting in deep space, nebula light spreading, 9:16 vertical' } = {}) {
  const f = fabrica({ respostas, falhaStill })
  const fl = filme ?? C.novoFilmeDoCritico(modo, { prazo: f.clock.t + prazoMs })
  const r = await C.criticarStill({ indice: 0, url: 'orig://0', mostra: 'A vast cosmic galaxy swirl igniting in deep space', fala: 'In the beginning, God created Earth. Among the stars, Lucifer, the brightest angel, fell from grace.', prompt, seed: 4242, ...(referencia ? { referencia } : {}) }, { filme: fl, gerarStill: f.gerarStill, fetchImpl: f.fetch, apiKey: 'k', agora: () => f.clock.t, ...(maxRegeracoesCena !== undefined ? { maxRegeracoesCena } : {}) })
  return { ...r, f, filme: fl }
}

console.log('== D. o laço do juiz (crítico REAL, fetch falso) ==')
{
  const C = B.critico
  // o caso REAL do Gênesis: 20 FAIL → 30 FAIL → (agora) 2ª foto nova → PASS
  const g = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20), 'novo://0': FAIL('Main subject is a cute star mascot, not a cosmic galaxy.', 30), 'novo://1': PASS(90) } })
  checa('D1 Gênesis: a foto nova reprovada NÃO é entregue — sai a 2ª foto nova, julgada de novo, aprovada, e é ela que segue', g.url === 'novo://1' && g.relato.escolhida === 'regerada' && g.relato.escolhida_tentativa === 2 && g.relato.regeracoes === 2 && g.relato.chamadas === 3 && g.f.stills.length === 2 && g.f.pedidos.length === 3)
  checa('D2 o relato grava TODAS as tentativas (original + 2 novas) com veredito, nota, motivo e instrução', g.relato.tentativas.length === 3 && JSON.stringify(g.relato.notas) === '[20,30,90]' && g.relato.tentativas[0].origem === 'original' && g.relato.tentativas[2].veredito === 'PASS' && g.relato.tentativas[1].instrucao && g.relato.tentativas[2].instrucao && g.relato.veredito_regerada === 'PASS' && g.relato.nota_regerada === 90)
  checa('D3 a 1ª instrução vem do MOTIVO e é positiva: "Required… a cosmic galaxy"', /Required, large and unmistakable in frame: a cosmic galaxy\./.test(g.f.stills[0].prompt) && !/\bnot\b|\bno\b/i.test(g.f.stills[0].prompt.replace(/^Named character in this shot: .*? — clearly visible in frame\. /, '')))
  checa('D4 a 2ª instrução é MAIS FORTE: a cena inteira ditada ("This frame shows exactly this and nothing else: …")', /This frame shows exactly this and nothing else: A vast cosmic galaxy swirl/.test(g.f.stills[1].prompt) && !/This frame shows exactly/.test(g.f.stills[0].prompt))
  checa('D5 cada foto nova tem semente própria (≠ filme, ≠ entre si); a 1ª é a semente de sempre', g.f.stills[0].seed === C.seedDaRegeracaoCritico(4242, 0) && g.f.stills[1].seed !== g.f.stills[0].seed && g.f.stills[1].seed !== 4242 && C.seedDaRegeracaoCritico(4242, 0, 1) === C.seedDaRegeracaoCritico(4242, 0))
  checa('D6 custo: 2 fotos novas × US$ 0,015 + 3 vereditos, tudo no relato', g.relato.custo_regeracoes_usd === 0.03 && g.relato.custo_usd > 0.03 && g.relato.custo_usd < 0.035)
  // as três reprovadas: fica a de MAIOR nota; nunca uma 3ª foto nova
  const t = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20), 'novo://0': FAIL('still a mascot', 55), 'novo://1': FAIL('still a mascot', 40) } })
  checa('D7 as três reprovadas (20/55/40): fica a de maior nota (a 1ª foto nova), e nunca sai uma 3ª foto', t.url === 'novo://0' && t.relato.escolhida_tentativa === 1 && t.relato.regeracoes === 2 && t.f.stills.length === 2 && t.relato.nota_regerada === 55 && t.relato.veredito_regerada === 'FAIL')
  const o = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 45), 'novo://0': FAIL('x', 30), 'novo://1': FAIL('x', 45) } })
  checa('D8 empate com a original (45/30/45) = a original (semente e paleta do filme)', o.url === 'orig://0' && o.relato.escolhida === 'original' && o.relato.escolhida_tentativa === 0)
  const p1 = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20), 'novo://0': PASS(85) } })
  checa('D9 aprovada na 1ª foto nova = para ali (1 foto nova, 2 vereditos)', p1.url === 'novo://0' && p1.relato.regeracoes === 1 && p1.relato.chamadas === 2 && p1.f.stills.length === 1)
  const pass = await cena(C, { respostas: { 'orig://0': PASS(85) } })
  checa('D10 PASS de cara = nada refeito; relato com 1 tentativa', pass.url === 'orig://0' && pass.relato.regeracoes === 0 && pass.relato.tentativas.length === 1 && pass.f.stills.length === 0)
  // teto por filme: 6
  const filme = C.novoFilmeDoCritico('enforce', { prazo: Infinity })
  const todas = { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20) }
  for (let i = 0; i < 20; i++) todas[`novo://${i}`] = FAIL('x', 25)
  let novasNoFilme = 0
  for (let c = 0; c < 5; c++) { const r = await cena(C, { respostas: todas, filme }); novasNoFilme += r.relato.regeracoes }
  checa(`D11 teto por filme = ${C.STILL_CRITIC_MAX_REGERACOES_FILME} fotos novas (5 cenas reprovadas 3× pediriam 10)`, C.STILL_CRITIC_MAX_REGERACOES_FILME === 6 && novasNoFilme === 6 && filme.regeracoesRestantes === 0)
  const semTeto = await cena(C, { respostas: todas, filme })
  checa('D12 filme sem orçamento: julga, não refaz, registra o teto', semTeto.relato.regerou === false && semTeto.relato.pulado_por === 'teto_regeracoes')
  // com folha: 1 foto nova (edit de US$ 0,15)
  const folha = await cena(C, { respostas: { 'orig://0': FAIL('Character differs from reference', 30, ['identity']), 'novo://0': FAIL('still differs', 25, ['identity']) }, referencia: { url: 'ref://1', descricao: 'Krishna, deep blue skin' } })
  checa('D13 com folha (referência): no máximo 1 foto nova — o edit custa US$ 0,15 (o caminho sem folha do juiz da ficha continua por cima)', folha.relato.regeracoes === 1 && folha.f.stills.length === 1 && folha.relato.escolhida === 'original' && C.STILL_CRITIC_MAX_REGERACOES_CENA_COM_FOLHA === 1)
  const zero = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20) }, maxRegeracoesCena: 0 })
  checa('D14 maxRegeracoesCena: 0 = julga e nunca refaz', zero.relato.regerou === false && zero.f.stills.length === 0)
  // prazo curto: a 2ª foto nova não cabe → para em silêncio, segue a melhor
  const curto = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20), 'novo://0': FAIL('x', 30), 'novo://1': PASS(90) }, prazoMs: 12_000 })
  checa('D15 prazo curto (12 s: 3 s juiz + 5 s foto + 3 s juiz = 11 s): a 2ª foto nova não cabe, segue a melhor que existe (30 > 20)', curto.relato.regeracoes === 1 && curto.f.stills.length === 1 && curto.url === 'novo://0')
  const falhou = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20) }, falhaStill: new Set([0]) })
  checa('D16 a foto nova não saiu: não insiste, a original segue, regeracao_ok=false, tentativa PULADA registrada', falhou.url === 'orig://0' && falhou.relato.regeracao_ok === false && falhou.relato.regeracoes === 1 && falhou.relato.tentativas[1].veredito === 'PULADO' && falhou.f.stills.length === 1)
  const log = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20) }, modo: 'log_only' })
  checa('D17 log_only continua medindo sem refazer', log.relato.regerou === false && log.relato.pulado_por === 'modo_log_only' && log.f.stills.length === 0)
  checa('D18 escolherTentativaCritico: aprovada > nova sem veredito > maior nota > original', C.escolherTentativaCritico([{ n: 0, url: 'a', veredito: 'FAIL', nota: 20 }, { n: 1, url: 'b', veredito: 'FAIL', nota: 50 }, { n: 2, url: 'c', veredito: 'PASS', nota: 70 }]) === 2 && C.escolherTentativaCritico([{ n: 0, url: 'a', veredito: 'FAIL', nota: 20 }, { n: 1, url: 'b', veredito: 'PULADO', nota: null }]) === 1 && C.escolherTentativaCritico([{ n: 0, url: 'a', veredito: 'FAIL', nota: 60 }, { n: 1, url: 'b', veredito: 'FAIL', nota: 50 }, { n: 2, url: null, veredito: 'PULADO', nota: null }]) === 0)
  const ex = C.exigenciaDoMotivo
  checa('D19 exigência do motivo (casos REAIS do banco): "is not a cosmic galaxy" / "a lion, not a bear" / "does not depict Mishu, the tiny dragon" / "Missing charcoal and bones as described" / "instead of an aerial view" / "does not show the required wardrobe and dolls"', ex('Main subject is not a cosmic galaxy.') === 'a cosmic galaxy' && ex('The character is a lion, not a bear.') === 'a bear' && ex('Image does not depict Mishu, the tiny dragon.') === 'Mishu, the tiny dragon' && ex('Missing charcoal and bones as described.') === 'charcoal and bones' && ex('Image shows a person instead of an aerial view.') === 'an aerial view' && ex('Image does not show the required wardrobe and dolls.') === 'wardrobe and dolls')
  checa('D20 motivo sem o que falta → null (anatomia, "does not match the description", português)', ex('Hand anatomy appears distorted or unnatural.') === null && ex('Main subject does not match the description.') === null && ex('mão com seis dedos') === null && ex('') === null)
  checa('D21 a exigência só entra para sujeito/identidade (texto embaralhado não pede letreiro); 2ª tentativa sempre dita a cena', !/Required/.test(C.instrucaoDaTentativa(['texto'], "Signpost says 'Ihord' instead of 'Fjord'", 'a signpost', 1)) && /This frame shows exactly/.test(C.instrucaoDaTentativa(['anatomia'], 'six fingers', 'a hand holding a cup', 2)) && C.instrucaoDaTentativa([], 'x', 'y', 1) === '')
}

console.log('== E. a rubrica e o pedido ao crítico ==')
{
  const C = B.critico
  checa('E1 a rubrica tem o FAIL explícito do mascote no lugar do personagem', /cute cartoon mascot, plush toy, chibi or generic smiling creature standing in for the requested person, deity, mythical figure or named character/.test(C.STILL_CRITIC_SISTEMA))
  checa('E2 a rubrica tem o FAIL explícito do personagem nomeado AUSENTE', /named character, person, god, angel, demon, hero, animal or creature who is MISSING from the frame/.test(C.STILL_CRITIC_SISTEMA))
  checa('E3 "mascot"/"missing" na resposta do modelo são lidos como SUJEITO (não viram "recusa sem critério")', JSON.stringify(C.lerRespostaDoCritico('{"verdict":"FAIL","issues":["mascot"],"reason":"a mascot","score":20}')?.problemas) === '["sujeito"]' && C.lerRespostaDoCritico('{"verdict":"FAIL","issues":["missing"],"reason":"Lucifer missing","score":20}')?.veredito === 'FAIL')
  const ped = C.montarPedidoAoCritico({ indice: 0, url: 'x', mostra: 'cosmic galaxy', fala: 'f', prompt: 'Named character in this shot: Lucifer, the fallen angel — clearly visible in frame. A galaxy', seed: 1 }, 'x')
  const txt = ped.messages[1].content.find((p) => p.type === 'text').text
  checa('E4 o elenco posto no prompt pela rota chega ao crítico ("who MUST appear … Lucifer, the fallen angel")', /Named character\(s\) who MUST appear in this shot, exactly as described: Lucifer, the fallen angel/.test(txt) && C.elencoNoPrompt('sem elenco') === '')
  const sem = C.montarPedidoAoCritico({ indice: 0, url: 'x', mostra: 'cosmic galaxy', fala: 'f', prompt: 'A galaxy', seed: 1 }, 'x').messages[1].content.find((p) => p.type === 'text').text
  checa('E5 sem elenco no prompt, o pedido é o de sempre (3 linhas)', sem.split('\n').length === 3 && !/MUST appear/.test(sem))
}

console.log('== M. mutantes ==')
const MUT = [
  ['M1 o laço some (só 1 foto nova)', 'critico', (s) => troca(s, "for (let n = 1; n <= maxCena && atual.veredito === 'FAIL'; n++) {", "for (let n = 1; n <= Math.min(1, maxCena) && atual.veredito === 'FAIL'; n++) {")],
  ['M2 a 2ª foto nova não é julgada de novo', 'critico', (s) => troca(s, 'const vN = await chamarCritico(e, urlNova,', "const vN = n >= 2 ? { ...v1, veredito: 'PASS', nota: 99 } : await chamarCritico(e, urlNova,")],
  ['M3 escolhe a última em vez da de maior nota', 'critico', (s) => troca(s, 'if ((t.nota ?? 0) > (melhor.nota ?? 0)) melhor = t', 'melhor = t')],
  ['M4 3 fotos novas por cena', 'critico', (s) => troca(s, 'export const STILL_CRITIC_MAX_REGERACOES_CENA = 2', 'export const STILL_CRITIC_MAX_REGERACOES_CENA = 3')],
  ['M5 a rubrica perde o mascote/ausente', 'critico', (s) => troca(s, "'this includes (3a) a requested named character", "'' + 'this excludes (3a) a requested named character")],
  ['M6 o elenco não chega ao crítico', 'critico', (s) => troca(s, '...(elenco ? [`Named character(s) who MUST appear', '...(false ? [`Named character(s) who MUST appear')],
  ['M7 a instrução da 2ª não é mais forte', 'critico', (s) => troca(s, 'if (tentativa >= 2) { const cena', 'if (false) { const cena')],
  ['M8 o mascote volta ao elenco', 'elenco', (s) => troca(s, 'return { descricao: descricaoFielDoSer({ nome, tipo, especie, corDita, corSorteada: cor, pequeno, infantil }), genero: null }', "return { descricao: `${nome}, a ${pequeno ? 'small and chubby' : 'medium-sized'} ${cor} ${especie ?? 'creature'} with big round friendly eyes and a short tail, no clothes`, genero: null }")],
  ['M9 preposição de abertura ("Beyond the dragon lair") volta a poder ser nome', 'elenco', (s) => troca(s, "'among|amongst|between|beyond|beneath|", "'among|amongst|between|beneath|")],
  ['M10 figura conhecida ignorada no elenco', 'elenco', (s) => troca(s, 'const fig = figuraFiel(c.nome) // KINEO-JUIZ-REFAZ-2810', 'const fig = null // KINEO-JUIZ-REFAZ-2810')],
  ['M11 coisa de cenário volta a ser personagem', 'elenco', (s) => troca(s, "if (!infantil && tipo === 'criatura' && especie !== null && COISA_DE_CENARIO_RE.test(especie)) return []", 'if (false) return []')],
  ['M12 aposto "the stars" (plural) volta', 'elenco', (s) => troca(s, '(${SER_RE.source.slice(3, -5)})\\b`, \'iu\').exec(depois) // KINEO-ELENCO-EPOCA-2710 — "Mishu the dragon" · KINEO-JUIZ-REFAZ-2810', '(${SER_RE.source.slice(3, -5)})s?\\b`, \'iu\').exec(depois) // KINEO-ELENCO-EPOCA-2710 — "Mishu the dragon" · KINEO-JUIZ-REFAZ-2810')],
  ['M13 o mascote volta à folha', 'folha', (s) => troca(s, 'return descricaoFielDoSer({ nome, tipo, especie, corDita, corSorteada: cor, pequeno: infantil, infantil })', "return `${nome}, a small and chubby ${cor} ${especie ?? 'creature'} with a cream belly, big round friendly eyes and a short tail, no clothes`")],
  ['M14 a tabela de figuras some do ajuste (Krishna nu volta à ficha sorteada)', 'ajuste', (s) => troca(s, '?? figuraFiel(nome) ?? null', '?? null')],
  ['M15 anjo ganha o estilo fofo no conto infantil', 'seres', (s) => troca(s, "const SAGRADO_OU_SOMBRIO = new Set(['angel', ", "const SAGRADO_OU_SOMBRIO = new Set([")],
]
// as verificações que os mutantes precisam derrubar, reexecutadas com a biblioteca mutada
async function verificacoes(Bm) {
  const v = []
  const C = Bm.critico
  const g = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20), 'novo://0': FAIL('mascot', 30), 'novo://1': PASS(90) } })
  v.push(['laço: 2 fotos novas, 3 vereditos, a 2ª segue', g.url === 'novo://1' && g.relato.regeracoes === 2 && g.relato.chamadas === 3 && g.f.pedidos.length === 3])
  v.push(['2ª instrução mais forte', /This frame shows exactly this and nothing else/.test(g.f.stills[1]?.prompt ?? '')])
  const t = await cena(C, { respostas: { 'orig://0': FAIL('Main subject is not a cosmic galaxy.', 20), 'novo://0': FAIL('x', 55), 'novo://1': FAIL('x', 40) } })
  v.push(['3 reprovadas: maior nota, nunca 3ª foto', t.url === 'novo://0' && t.f.stills.length === 2])
  v.push(['rubrica mascote/ausente', /cute cartoon mascot, plush toy/.test(C.STILL_CRITIC_SISTEMA) && /who is MISSING from the frame/.test(C.STILL_CRITIC_SISTEMA) && /this includes \(3a\)/.test(C.STILL_CRITIC_SISTEMA)])
  v.push(['elenco chega ao crítico', /MUST appear/.test(C.montarPedidoAoCritico({ indice: 0, url: 'x', mostra: 'm', fala: 'f', prompt: 'Named character in this shot: Lucifer, the fallen angel — clearly visible in frame. A', seed: 1 }, 'x').messages[1].content.find((p) => p.type === 'text').text)])
  const E = Bm.elenco
  const gen = E.personagensNomeados(GENESIS_CTX)
  v.push(['Gênesis: sem Among, Lucifer anjo caído', !gen.some((p) => p.nome === 'Among') && /fallen angel/.test(gen.find((p) => p.nome === 'Lucifer')?.descricao ?? '')])
  const zariel = E.personagensNomeados('Zariel, the brightest angel, fell from the sky. Zariel wept.').find((p) => p.nome === 'Zariel')
  v.push(['anjo genérico sem mascote', Boolean(zariel) && !MASCOTE_RE.test(zariel?.descricao ?? '') && /feathered wings/.test(zariel?.descricao ?? '')])
  v.push(['Nova the star é cenário', !E.personagensNomeados('Behold the stars. Nova the star burned bright. Nova exploded.').some((p) => p.nome === 'Nova')])
  v.push(['"Beyond the dragon lair" não faz de "Beyond" um dragão', !E.personagensNomeados('Beyond the dragon lair, Zariel waited in the dark. Zariel wept.', null, true).some((p) => p.nome === 'Beyond')])
  v.push(['<Nome> the stars não é aposto', !E.personagensNomeados('Zorblax the stars twinkled. Zorblax laughed.', null, true).some((p) => p.nome === 'Zorblax' && /star/.test(p.descricao))])
  const zog = Bm.ajuste.elencoDoRoteiro('Zog, the little dragon, flew over the hills. Zog laughed and Zog hid behind a cloud.').find((f) => f.nome === 'Zog')
  v.push(['folha sem mascote', Boolean(zog) && !MASCOTE_RE.test(zog?.canonica ?? '')])
  const kr = Bm.ajuste.elencoDoRoteiro(KRISHNA_NU).find((f) => f.nome === 'Krishna')
  v.push(['Krishna nu na tabela', Boolean(kr) && /deep blue skin/.test(kr?.canonica ?? '')])
  const anjoKids = Bm.seres.descricaoFielDoSer({ nome: 'Zariel', tipo: 'criatura', especie: 'angel', corDita: null, corSorteada: 'bright green', pequeno: true, infantil: true })
  v.push(['anjo nunca fofo', !/cartoon style/.test(anjoKids)])
  return v
}
const base = await verificacoes(B)
checa('M0 todas as verificações dos mutantes passam na versão atual', base.every(([, o]) => o))
for (const [nome, arq, mut] of MUT) {
  let Bm
  try { Bm = biblioteca({ [arq]: mut(SRC[arq]) }) } catch (e) { checa(`${nome}: aplicou`, false); console.log('     ' + e.message); continue }
  let res
  try { res = await verificacoes(Bm) } catch (e) { res = [['lançou: ' + e.message, false]] }
  const vermelhas = res.filter(([, o]) => !o).map(([r]) => r)
  checa(`${nome}: aplicou e ficou vermelho (${vermelhas.length}: ${vermelhas[0] ?? '-'})`, vermelhas.length > 0)
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log(falhas.map((f) => ' - ' + f).join('\n')); process.exit(1) }
