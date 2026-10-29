// [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"] KINEO-ELENCO-EPOCA-2710 — guardião do elenco nomeado, da época e dos falsos amigos.
// Prova, sem rede, com o código REAL (lib/cinematic/elencoEpoca.ts transpilado e executado) e as narrações REAIS dos defeitos de 27/10:
//   A. URDU (Amna, Mishu, Baba Noor): a menina e o velho entram nos prompts (o dragão já estava); a ordem "só o protagonista" sai da cena que os recebe.
//   B. 1953 (James Turner): toda cena ganha figurino/carro/objetos dos anos 1950; o moletom vira sobretudo; James Turner entra de costas (faceless).
//   C. GELI (geleia roxa): "jellyfish" vira criatura de gelatina; a ficha da Geli é gelatina, não água-viva.
//   D. "The last train": o passageiro sem nome entra na cena 1 quando nenhum prompt mostra gente.
//   E. Francisco Fernando e Sofia (PT + tradução): os dois saem do inglês; a Sofia entra.
//   F. narração moderna em inglês sem nome, sem ano, sem falso amigo: prompts byte a byte; resolução 1080×1920 e "1950 dollars" não são ano; época mista (1985 + 2024) não trava.
//   G. a rota liga tudo no lugar certo (depois da ordem do protagonista, antes da moderação) e a diretriz chega ao escritor/descritor.
//   H. mutantes: sem a tabela da década, sem o guarda da geleia, sem a inserção do elenco, sem a chamada na rota → o guardião tem de ficar vermelho.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const roda = (src, mods = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, module: { exports: exp }, require: (id) => (id in mods ? mods[id] : id === '@/lib/cinematic/pessoasDaNarracao' ? roda(rd('lib/cinematic/pessoasDaNarracao.ts')) : {}), console, process: { env: {} }, Intl }) // KINEO-ELENCO-MARCADOR-2910 — também nas execuções com sanitizeRealPeople mutado.
  return exp
}
const MARCA = 'KINEO-ELENCO-EPOCA-2710'
const LIB = 'lib/cinematic/elencoEpoca.ts'
const SRC = rd(LIB)
const mocks = { '@/lib/hollywood/router': { sanitizeRealPeople: (t) => t }, '@/lib/cinematic/seresFieis': roda(rd('lib/cinematic/seresFieis.ts')), '@/lib/cinematic/pessoasDaNarracao': roda(rd('lib/cinematic/pessoasDaNarracao.ts')) } // KINEO-ELENCO-MARCADOR-2910 — dependência pura real; as asserções anteriores continuam iguais.
const E = roda(SRC, mocks)
const troca = (src, de, para) => { if (!src.includes(de)) throw new Error('mutante: trecho ausente — ' + de.slice(0, 60)); return src.replace(de, para) }

// ── casos reais ───────────────────────────────────────────────────────────────────────────────────────────────────────
const URDU_FALAS = ['آمنہ کو ملا ایک جادوئی ستارہ جو آسمان سے گرا تھا۔', 'مشو، ننھا ڈریگن، اس کا دوست بن گیا۔', 'بابا نور کی مدد سے آمنہ نے ستارے کو دوبارہ آسمان پر سجایا۔']
const URDU = URDU_FALAS.join(' ')
const URDU_CTX = `${URDU} ${URDU_FALAS.join(' ')}`
// o que traduzirAssunto devolve (inglês + lista de nomes), como vocabularioDoAssunto o cola no contexto
const URDU_EN = "Amna found a magical star that had fallen from the sky. Mishu, the little dragon, became her friend. With Baba Noor's help, Amna put the star back in the sky. Amna found a magical star that had fallen from the sky. Mishu, the little dragon, became her friend. With Baba Noor's help, Amna put the star back in the sky. Amna Mishu Baba Noor"
const ORDEM = (c) => `The only person in this shot is the same main character (${c}); any other person described below is replaced by this same character. `
const MISHU = 'Mishu, a small and chubby bright green dragon with a cream belly'
const URDU_PROMPTS = [
  `${ORDEM(MISHU)}Opening shot: a glowing star falling from the night sky over a village, Mishu the tiny dragon watching, 3D animated style, 9:16 vertical, subject framed`,
  'Mishu the tiny green dragon curled beside a glowing star in a courtyard, 3D animated style, 9:16 vertical, subject framed',
  `${ORDEM(MISHU)}Mishu flying up carrying the star back to the sky, 3D animated style, 9:16 vertical, subject framed`,
]
const urdu = (lib = E) => lib.aplicarElencoEEpoca({ prompts: URDU_PROMPTS, falas: URDU_FALAS, contextoOriginal: URDU_CTX, contextoFiltro: `${URDU_CTX} ${URDU_EN}`, modo: 'character_story', tagFaceless: false })

const T_FALAS = ['In 1953, James Turner vanished without a trace.', 'His car was found running on a country road, headlights on, door open.', 'Nobody has seen him since.']
const T_CTX = `${T_FALAS.join(' ')} ${T_FALAS.join(' ')}`
const T_PROMPTS = ['Opening shot: a lone man in a hoodie walking down a foggy road at night, faceless cinematic b-roll, no foreground human faces, 9:16 vertical, subject framed', 'A modern car idling on an empty country road, headlights cutting through fog, driver door open, 9:16 vertical, subject framed', 'An empty road at dawn, mist drifting, 9:16 vertical, subject framed']
const turner = (lib = E) => lib.aplicarElencoEEpoca({ prompts: T_PROMPTS, falas: T_FALAS, contextoOriginal: T_CTX, contextoFiltro: T_CTX, modo: 'documentary_faceless', tagFaceless: false })

const G_FALAS = ['Geli, a geleia roxa, vivia numa geladeira.', 'Um dia Geli saiu para ver o sol.']
const G_CTX = `${G_FALAS.join(' ')} ${G_FALAS.join(' ')}`
const G_EN = 'Geli, the purple jelly, lived in a refrigerator. One day Geli went out to see the sun. Geli'
const G_PROMPTS = ['A cute purple jellyfish named Geli inside a glowing refrigerator, 3D animated style, 9:16 vertical, subject framed', 'A purple jellyfish floating out into warm sunlight, 3D animated style, 9:16 vertical, subject framed']
const geli = (lib = E) => lib.aplicarElencoEEpoca({ prompts: G_PROMPTS, falas: G_FALAS, contextoOriginal: G_CTX, contextoFiltro: `${G_CTX} ${G_EN}`, modo: 'character_story', tagFaceless: false })

const L_FALAS = ['The last train. A tired commuter boards the final train of the night.', 'A distorted announcement echoes his full name.', 'The doors close and the platform is empty.']
const L_CTX = `${L_FALAS.join(' ')} ${L_FALAS.join(' ')}`
const L_PROMPTS = ['Opening shot: an empty late-night train platform under flickering lights, 9:16 vertical, subject framed', 'A crackling station speaker on a tiled wall, 9:16 vertical, subject framed', 'Train doors sliding shut, platform empty, 9:16 vertical, subject framed']
const trem = (lib = E) => lib.aplicarElencoEEpoca({ prompts: L_PROMPTS, falas: L_FALAS, contextoOriginal: L_CTX, contextoFiltro: L_CTX, modo: 'documentary_faceless', tagFaceless: false })

const S_FALAS = ['Francisco Fernando e Sofia saíram de carro em Sarajevo em 1914.', 'Um tiro mudou a história.', 'Sofia morreu primeiro.']
const S_CTX = `${S_FALAS.join(' ')} ${S_FALAS.join(' ')}`
const S_EN = 'Franz Ferdinand and Sophie drove through Sarajevo in 1914. One shot changed history. Sophie died first. Franz Ferdinand Sophie Sarajevo'
const S_PROMPTS = ['Two military men in an open-top car in Sarajevo, 9:16 vertical, subject framed', 'A pistol firing in a crowd, 9:16 vertical, subject framed', 'A woman slumped in a car seat, 9:16 vertical, subject framed']
const sofia = (lib = E) => lib.aplicarElencoEEpoca({ prompts: S_PROMPTS, falas: S_FALAS, contextoOriginal: S_CTX, contextoFiltro: `${S_CTX} ${S_EN}`, modo: 'documentary_faceless', tagFaceless: false })

const M_FALAS = ['Why problems feel worse at night.', 'Your brain runs low on energy and every worry grows louder.', 'Morning light resets the scale.']
const M_CTX = `Resolution: 1080 x 1920. ${M_FALAS.join(' ')} ${M_FALAS.join(' ')}`
const M_PROMPTS = ['A dark bedroom at 3 a.m., a phone glowing on the nightstand, 9:16 vertical, subject framed', 'Close-up of tangled sheets and a ticking clock, 9:16 vertical, subject framed', 'Morning light pouring through a window onto a calm desk, 9:16 vertical, subject framed']
const moderno = (lib = E) => lib.aplicarElencoEEpoca({ prompts: M_PROMPTS, falas: M_FALAS, contextoOriginal: M_CTX, contextoFiltro: M_CTX, modo: 'documentary_faceless', tagFaceless: false })

console.log('== A. urdu: Amna e Baba Noor entram, o dragão fica ==')
{
  const r = urdu()
  const nomes = r.relato.elenco.map((e) => e.nome)
  checa(`A1 o elenco lido do inglês traz Amna, Mishu e Baba Noor (${nomes.join(' + ')})`, nomes.includes('Amna') && nomes.includes('Mishu') && nomes.includes('Baba Noor'))
  checa('A2 a lista de nomes do tradutor ("Amna Mishu Baba Noor") NÃO vira uma pessoa', !nomes.some((n) => n.split(' ').length > 2))
  checa('A3 Amna é a protagonista e é humana', r.relato.elenco.find((e) => e.nome === 'Amna')?.protagonista === true && r.relato.elenco.find((e) => e.nome === 'Amna')?.tipo === 'humano')
  checa('A4 Mishu já estava nos prompts: nada inserido para ele', r.relato.elenco.find((e) => e.nome === 'Mishu')?.ja_presente === true && r.relato.elenco.find((e) => e.nome === 'Mishu')?.cenas_inseridas.length === 0)
  checa('A5 Amna entra em pelo menos uma cena e Baba Noor também', r.relato.elenco.find((e) => e.nome === 'Amna')?.cenas_inseridas.length > 0 && r.relato.elenco.find((e) => e.nome === 'Baba Noor')?.cenas_inseridas.length > 0)
  checa('A6 o prompt que recebe Amna cita "Named character" + Amna, e Baba Noor é um homem velho', r.prompts.some((p) => /Named characters? in this shot: .*Amna/.test(p)) && /Baba Noor, an elderly man/.test(r.relato.elenco.find((e) => e.nome === 'Baba Noor')?.descricao ?? ''))
  checa('A7 a ordem "só o protagonista" (Mishu) sai de toda cena que recebe gente nova', r.relato.ordem_removida.length > 0 && r.prompts.every((p, i) => !(/Named character/.test(p) && /The only person in this shot/.test(p))))
  checa('A8 a inserção é só prefixo: o plano original de cada cena segue inteiro no fim do prompt', r.prompts.every((p, i) => p.endsWith(URDU_PROMPTS[i].replace(ORDEM(MISHU), ''))))
  checa('A9 texto marcado como traduzido', r.relato.texto === 'traduzido')
  // conto infantil (estrela mágica, dragãozinho, ننھا): nome humano sem idade dita é CRIANÇA, nunca "a woman in her thirties" (caso real: a Amna, 27/10) // KINEO-ELENCO-EPOCA-2710
  const amna = r.relato.elenco.find((e) => e.nome === 'Amna')?.descricao ?? ''
  checa(`A10 conto infantil reconhecido e Amna é uma menina de ~9 anos, não uma mulher de trinta (${amna.slice(0, 60)})`, r.relato.historia_infantil === true && /^Amna, a girl about nine years old/.test(amna) && !/thirties|woman/.test(amna))
  checa('A11 o título ainda manda: Baba Noor segue um homem velho no mesmo conto', /Baba Noor, an elderly man/.test(r.relato.elenco.find((e) => e.nome === 'Baba Noor')?.descricao ?? ''))
  const LENA_FALAS = ['Lena found the key.', 'Lena opened the door and smiled.']
  const lena = (kidsCartoon) => E.aplicarElencoEEpoca({ prompts: ['A key on a table, 9:16 vertical', 'A door opening, 9:16 vertical'], falas: LENA_FALAS, contextoOriginal: LENA_FALAS.join(' '), contextoFiltro: LENA_FALAS.join(' '), modo: 'character_story', tagFaceless: false, kidsCartoon })
  checa('A12 o template kids_cartoon sozinho (texto sem pista) faz Lena menina; sem o template e sem pista, Lena segue adulta', /^Lena, a (?:girl|child) about nine years old/.test(lena(true).relato.elenco[0]?.descricao ?? '') && lena(true).relato.historia_infantil === true && /thirties/.test(lena(false).relato.elenco[0]?.descricao ?? '') && lena(false).relato.historia_infantil === false)
  checa('A13 pistas em urdu (ننھا) e em inglês (magical star / little dragon) bastam por si; 1953/James Turner não é conto', E.historiaInfantil('مشو، ننھا ڈریگن', null) && E.historiaInfantil('', 'Amna found a magical star') && E.historiaInfantil('', 'Mishu, the little dragon, became her friend') && !E.historiaInfantil('In 1953, James Turner vanished without a trace.', 'In 1953, James Turner vanished without a trace.'))
}

console.log('== B. 1953: a época entra em toda cena ==')
{
  const r = turner()
  checa('B1 época lida: 1953 → 1950s', r.relato.epoca?.ano === 1953 && r.relato.epoca?.rotulo === '1950s')
  checa('B2 as 3 cenas ganham "Period setting: 1953 (1950s)"', r.relato.cenas_com_epoca.join(',') === '1,2,3' && r.prompts.every((p) => p.includes('Period setting: 1953 (1950s)')))
  checa('B3 figurino, carro e objetos da década no prompt (fedora, chrome, rotary)', r.prompts.every((p) => /fedora/.test(p) && /chrome/.test(p) && /rotary/.test(p)))
  checa('B4 o moletom do descritor vira sobretudo dos anos 1950 e o "modern car" vira carro da década', !/hoodie\b(?! or)/.test(r.prompts[0].replace(/no hoodies or modern streetwear/, '')) && /1950s wool overcoat/.test(r.prompts[0]) && /1950s car/.test(r.prompts[1]) && r.relato.modernidades.some((m) => m.startsWith('hoodie')))
  checa('B5 James Turner entra na cena 1 (a da fala), de costas (faceless), com roupa de época', r.relato.elenco[0]?.nome === 'James Turner' && r.relato.elenco[0]?.cenas_inseridas.join(',') === '1' && /James Turner, a man/.test(r.prompts[0]) && /seen from behind or in profile/.test(r.prompts[0]) && /period-accurate 1950s clothing/.test(r.prompts[0]))
  checa('B6 a época só é acrescentada uma vez (idempotente)', E.aplicarEpoca(r.prompts[0], r.relato.epoca).aplicada === 'ja_tinha')
  checa('B7 nenhum prompt passa do teto da fal (2500)', r.prompts.every((p) => p.length <= 2500))
  checa('B8 década em outras línguas: "anos 80" → 1980s, "années 50" → 1950s, "50er Jahre" → 1950s, ۱۹۵۳ → 1953', E.epocaDaHistoria('Nos anos 80 o Brasil parou.')?.rotulo === '1980s' && E.epocaDaHistoria('Dans les années 50, Paris…')?.rotulo === '1950s' && E.epocaDaHistoria('In den 50er Jahren…')?.rotulo === '1950s' && E.epocaDaHistoria('۱۹۵۳ میں جیمز غائب ہو گیا')?.ano === 1953)
}

console.log('== C. geleia ≠ jellyfish ==')
{
  const r = geli()
  checa('C1 "jellyfish" sai dos prompts; entra a criatura de gelatina', r.prompts.every((p) => !/\bjellyfish\b(?!\))/.test(p.replace(/not a sea jellyfish\)/g, ''))) && r.prompts.every((p) => /jelly blob creature/.test(p)))
  checa('C2 relato registra a troca', r.relato.falsos_amigos.includes('geleia→jellyfish'))
  checa('C3 a ficha da Geli é uma criatura de gelatina roxa, não água-viva', r.relato.elenco[0]?.nome === 'Geli' && r.relato.elenco[0]?.tipo === 'criatura' && /purple jelly blob creature/.test(r.relato.elenco[0]?.descricao ?? '') && /not a sea jellyfish/.test(r.relato.elenco[0]?.descricao ?? ''))
  checa('C4 com água-viva na história, "jellyfish" fica', E.corrigirFalsosAmigos('A purple jellyfish', 'Uma água-viva roxa flutua perto da geleia').prompt === 'A purple jellyfish')
  checa('C5 sem gatilho na história, nada muda', E.corrigirFalsosAmigos('A purple jellyfish', 'A purple jellyfish drifts in the dark sea').trocas.length === 0)
  checa('C6 idempotente', E.corrigirFalsosAmigos(r.prompts[0], G_CTX).prompt === r.prompts[0])
}

console.log('== D. o passageiro sem nome do último trem ==')
{
  const r = trem()
  checa('D1 sem nome e sem gente em prompt nenhum: "the tired commuter" entra na cena 1', r.relato.elenco[0]?.nome === 'the tired commuter' && r.relato.elenco[0]?.nomeado === false && r.relato.elenco[0]?.cenas_inseridas.join(',') === '1' && /Named character in this shot: the tired commuter, a man/.test(r.prompts[0]))
  checa('D2 as cenas 2 e 3 ficam byte a byte', r.prompts[1] === L_PROMPTS[1] && r.prompts[2] === L_PROMPTS[2])
  const comGente = E.aplicarElencoEEpoca({ prompts: ['A tired man in a coat seen from behind on a platform, 9:16 vertical, subject framed', L_PROMPTS[1], L_PROMPTS[2]], falas: L_FALAS, contextoOriginal: L_CTX, contextoFiltro: L_CTX, modo: 'documentary_faceless', tagFaceless: false })
  checa('D3 se algum prompt já mostra gente, o sem-nome não é forçado', comGente.relato.elenco.length === 0 && comGente.relato.motivo_sem_elenco === 'protagonista_sem_nome_ja_em_cena')
}

console.log('== E. Francisco Fernando e Sofia ==')
{
  const r = sofia()
  const nomes = r.relato.elenco.map((e) => e.nome)
  checa(`E1 os dois saem do inglês (${nomes.join(' + ')})`, nomes.includes('Franz Ferdinand') && nomes.includes('Sophie'))
  checa('E2 Sophie entra em pelo menos uma cena', (r.relato.elenco.find((e) => e.nome === 'Sophie')?.cenas_inseridas.length ?? 0) > 0 && r.prompts.some((p) => /Sophie/.test(p)))
  checa('E3 1914 → 1910s em toda cena', r.relato.epoca?.rotulo === '1910s' && r.relato.cenas_com_epoca.length === 3)
}

console.log('== F. nada a fazer = byte a byte ==')
{
  const r = moderno()
  checa('F1 narração moderna sem nome/ano/falso amigo: prompts idênticos', JSON.stringify(r.prompts) === JSON.stringify(M_PROMPTS) && r.relato.elenco.length === 0 && r.relato.epoca === null && r.relato.falsos_amigos.length === 0)
  checa('F2 resolução 1080 × 1920 e "1950 dollars" não são ano', E.epocaDaHistoria('Resolution: 1080 x 1920. A story of today.') === null && E.epocaDaHistoria('He paid 1950 dollars for it.') === null && E.epocaDaHistoria('1920px wide') === null)
  checa('F3 época mista (1985 + 2024) não trava nenhuma', E.epocaDaHistoria('Founded in 1985, the brand sells today in 2024.') === null)
  checa('F4 tag [faceless] = sem elenco (época continua)', (() => { const x = E.aplicarElencoEEpoca({ prompts: T_PROMPTS, falas: T_FALAS, contextoOriginal: T_CTX, contextoFiltro: T_CTX, modo: 'documentary_faceless', tagFaceless: true }); return x.relato.motivo_sem_elenco === 'tag_faceless' && x.relato.elenco.length === 0 && x.relato.cenas_com_epoca.length === 3 })())
  checa('F5 tradução que falhou (null) em língua não latina = sem elenco, motivo registrado', (() => { const x = E.aplicarElencoEEpoca({ prompts: URDU_PROMPTS, falas: URDU_FALAS, contextoOriginal: URDU_CTX, contextoFiltro: null, modo: 'character_story', tagFaceless: false }); return x.relato.motivo_sem_elenco === 'sem_traducao' && JSON.stringify(x.prompts) === JSON.stringify(URDU_PROMPTS) })())
  checa('F6 pessoa real famosa passa pelo sanitizador antes de virar elenco', (() => { const lib = roda(SRC, { '@/lib/hollywood/router': { sanitizeRealPeople: (t) => t.replace(/Napoleon/g, 'a fictional period-accurate figure') } }); return lib.personagensNomeados('Napoleon marched. Napoleon lost.').length === 0 })())
  checa('F7 determinístico: o mesmo texto dá a mesma ficha', JSON.stringify(urdu().relato) === JSON.stringify(urdu().relato))
}

console.log('== G. a rota e a diretriz ==')
{
  const rota = rd('app/api/generate-video-cinematic/route.ts')
  const policy = rd('lib/cinematic/visualPromptPolicy.ts')
  checa('G1 a rota importa aplicarElencoEEpoca de lib/cinematic/elencoEpoca', /import \{ aplicarElencoEEpoca, type RelatoElencoEpoca \} from '@\/lib\/cinematic\/elencoEpoca'/.test(rota))
  const chamada = rota.indexOf('aplicarElencoEEpoca({ prompts: classicScenePrompts')
  checa('G2 a chamada usa o vetor final das cenas, a fala por cena, o contexto traduzido (contextoDoFiltro), o modo e a tag', chamada > 0 && /contextoFiltro: await contextoDoFiltro\(contextoElencoEpoca\), modo: classicVisualMode, tagFaceless: tagFacelessPresente/.test(rota))
  checa('G3 roda DEPOIS da ordem do protagonista do 15 s e ANTES da moderação do texto final (if romanceAdulto.ativo) e do sanitizador do 15 s', chamada > rota.indexOf('classicScenePrompts[i] = ORDEM_DO_PROTAGONISTA(p15.canonica) + classicScenePrompts[i]') && chamada < rota.indexOf('if (romanceAdulto.ativo) { // KINEO-ROMANCE-ADULTO-2026-10-13') && chamada < rota.indexOf('classicScenePrompts[i] = sanitizarObjetos15('))
  checa('G4 o resultado volta para classicScenePrompts (still FLUX e clipe)', /classicScenePrompts\[i\] = elencoEpoca\.prompts\[i\]/.test(rota))
  checa('G5 relato vai ao despacho (named_cast_era) e ao ensaio de $0 (elenco_epoca)', /named_cast_era: ctx\.elencoEpoca \?\? null/.test(rota) && /elenco_epoca: elencoEpocaRelato/.test(rota))
  checa('G6 falha aberta: try/catch em volta', /catch \(e\) \{ console\.warn\('\[cinematic\] KINEO-ELENCO-EPOCA falhou/.test(rota))
  checa('G7 a diretriz do elenco/época/falso amigo entra em visualDescriptionDirection (escritor de cenas + descritor)', /ELENCO_EPOCA_DIRECTION/.test(policy) && /\$\{SCENE_FIDELITY_DIRECTION\} \$\{ELENCO_EPOCA_DIRECTION\}/.test(policy) && /never a jellyfish/.test(policy) && /1953 means 1950s/.test(policy))
  checa('G8 toda linha nova leva a marca', [LIB, 'app/api/generate-video-cinematic/route.ts', 'lib/cinematic/visualPromptPolicy.ts'].every((f) => rd(f).split('\n').filter((l) => /ELENCO-EPOCA|elencoEpoca|ElencoEpoca|ELENCO_EPOCA/.test(l)).every((l) => l.includes(MARCA) || l.includes('KINEO-ELENCO-MARCADOR-2910')))) // KINEO-ELENCO-MARCADOR-2910 — aceita a marca do conserto atual, mantendo a exigência de marca.
}

console.log('== H. mutantes ==')
{
  const semDecada = roda(troca(SRC, "1950: { roupa: '1950s dress:", "1951: { roupa: '1950s dress:"), mocks)
  checa('H1 sem a tabela da década de 1950, o prompt de 1953 perde fedora/chrome (mutante vermelho)', !turner(semDecada).prompts.every((p) => /fedora/.test(p) && /chrome/.test(p)))
  const semEpoca = roda(troca(SRC, 'if (epoca) for (let i = 0; i < n; i++) {', 'if (false) for (let i = 0; i < n; i++) {'), mocks)
  checa('H2 sem a aplicação da época, nenhuma cena ganha "Period setting"', turner(semEpoca).prompts.every((p) => !p.includes('Period setting')))
  const semGeleia = roda(troca(SRC, "gatilho: /(?<!\\p{L})(?:gel[ée]ias?|gelatinas?|jaleas?|gel[ée]es?|gelatine)(?!\\p{L})/iu", "gatilho: /\\bNUNCA_CASA\\b/iu"), mocks)
  checa('H3 sem o gatilho da geleia, "jellyfish" fica no prompt', geli(semGeleia).prompts.some((p) => /\bjellyfish\b/.test(p)) && geli(semGeleia).relato.falsos_amigos.length === 0)
  const semElenco = roda(troca(SRC, 'for (const i of alvo) if (!presente[i] && porCena[i].length < ELENCO_EPOCA_MAX_POR_CENA)', 'for (const i of []) if (!presente[i] && porCena[i].length < ELENCO_EPOCA_MAX_POR_CENA)'), mocks)
  checa('H4 sem a inserção, Baba Noor não entra (Amna ainda entra pela regra do protagonista)', !urdu(semElenco).prompts.some((p) => /Baba Noor/.test(p)))
  const semProtagonista = roda(troca(SRC, 'if (p.protagonista && inseridas.length === 0 && !jaPresente', 'if (false && inseridas.length === 0 && !jaPresente'), mocks)
  checa('H5 sem a regra do protagonista + sem a inserção, Amna some', !urdu(roda(troca(troca(SRC, 'for (const i of alvo) if (!presente[i] && porCena[i].length < ELENCO_EPOCA_MAX_POR_CENA)', 'for (const i of []) if (!presente[i] && porCena[i].length < ELENCO_EPOCA_MAX_POR_CENA)'), 'if (p.protagonista && inseridas.length === 0 && !jaPresente', 'if (false && inseridas.length === 0 && !jaPresente'), mocks)).prompts.some((p) => /Amna/.test(p)) && semProtagonista !== null)
  const semOrdem = roda(troca(SRC, 'if (ORDEM_PROTAGONISTA_RE.test(p)) { p = p.replace(ORDEM_PROTAGONISTA_RE, \'\'); relato.ordem_removida.push(i + 1) }', ''), mocks)
  checa('H6 sem tirar a ordem "só o protagonista", Amna e a ordem do Mishu coexistem no mesmo prompt (o defeito)', urdu(semOrdem).prompts.some((p) => /Named character/.test(p) && /The only person in this shot/.test(p)))
  const rotaSem = rd('app/api/generate-video-cinematic/route.ts').replace('classicScenePrompts[i] = elencoEpoca.prompts[i]', 'classicScenePrompts[i] = classicScenePrompts[i]')
  checa('H7 rota sem devolver o vetor: a verificação G4 fica vermelha', !/classicScenePrompts\[i\] = elencoEpoca\.prompts\[i\]/.test(rotaSem))
  const semInfantil = roda(troca(SRC, '|| (infantil && semPistaDeIdade) // KINEO-ELENCO-EPOCA-2710', '|| false // KINEO-ELENCO-EPOCA-2710'), mocks) // KINEO-ELENCO-EPOCA-2710
  checa('H8 sem a regra do conto infantil, Amna volta a ser "a woman in her thirties" (A10 vermelho)', /thirties/.test(urdu(semInfantil).relato.elenco.find((e) => e.nome === 'Amna')?.descricao ?? ''))
  checa('H9 a rota passa o template infantil (kidsCartoon: desenhoInfantil.ativo) na chamada marcada', /kidsCartoon: desenhoInfantil\.ativo \}\) \/\/ KINEO-ELENCO-EPOCA-2710/.test(rd('app/api/generate-video-cinematic/route.ts')))
}

console.log('== I. nome feminino/masculino quando o pronome não diz (28/10) ==') // KINEO-ELENCO-EPOCA-2710
{ // KINEO-ELENCO-EPOCA-2710 — caso real 28/10: a tradução urdu→inglês da Amna (آمنہ) sem pronome nenhum; ela saiu menino
  const SEM_PRONOME = 'Amna found a magical star in the garden. Amna and Baba Noor climbed the hill. Amna put the star back in the sky.' // KINEO-ELENCO-EPOCA-2710
  const COM_HE = 'Amna found a magical star in the garden. Amna walked with Baba Noor and he told a story. Amna put the star back in the sky.' // KINEO-ELENCO-EPOCA-2710
  const ficha = (lib, txt, nome, infantil = true) => lib.personagensNomeados(txt, null, infantil).find((p) => p.nome === nome) // KINEO-ELENCO-EPOCA-2710
  const a1 = ficha(E, SEM_PRONOME, 'Amna') // KINEO-ELENCO-EPOCA-2710
  checa(`I1 conto infantil sem pronome: Amna é menina de ~9 anos (${a1?.descricao.slice(0, 50)})`, a1?.genero === 'woman' && /^Amna, a girl about nine years old/.test(a1?.descricao ?? '')) // KINEO-ELENCO-EPOCA-2710
  const a2 = ficha(E, COM_HE, 'Amna') // KINEO-ELENCO-EPOCA-2710
  checa('I2 o "he" do Baba Noor na mesma frase não transforma a Amna em menino', a2?.genero === 'woman' && /^Amna, a girl/.test(a2?.descricao ?? '')) // KINEO-ELENCO-EPOCA-2710
  const ali = ficha(E, 'Ali found a kite in the market. Ali ran to the river with the kite.', 'Ali') // KINEO-ELENCO-EPOCA-2710
  checa('I3 nome masculino sem pronome: Ali é menino', ali?.genero === 'man' && /^Ali, a boy about nine years old/.test(ali?.descricao ?? '')) // KINEO-ELENCO-EPOCA-2710
  const maria = ficha(E, 'Maria opened the old bakery at dawn. Maria counted the coins twice.', 'Maria', false) // KINEO-ELENCO-EPOCA-2710
  checa('I4 fora do conto infantil, nome feminino é mulher adulta (não "a person")', maria?.genero === 'woman' && /^Maria, a woman in her thirties/.test(maria?.descricao ?? '')) // KINEO-ELENCO-EPOCA-2710
  checa('I5 tabela: escrita original e variações (آمنہ, عائشہ, فاطمہ, مریم, زارا; "Fatima Khan"; "Amna\'s") = feminino; Pedro, João, علی = masculino', ['آمنہ', 'عائشہ', 'فاطمہ', 'مریم', 'زارا', 'Fatima Khan', "Amna's", 'Priya', 'Sofia', 'Seo-yeon'].every((n) => E.generoDoNome(n) === 'woman') && ['Pedro', 'João', 'علی', 'Arjun', 'James', 'Min-jun'].every((n) => E.generoDoNome(n) === 'man')) // KINEO-ELENCO-EPOCA-2710
  checa('I6 unissex e desconhecido não decidem (Alex, Noor, Kim, Mishu → null)', ['Alex', 'Noor', 'Kim', 'Mishu', ''].every((n) => E.generoDoNome(n) === null)) // KINEO-ELENCO-EPOCA-2710
  checa('I7 título continua mandando: Baba Noor segue homem velho', /Baba Noor, an elderly man/.test(ficha(E, COM_HE, 'Baba Noor')?.descricao ?? '')) // KINEO-ELENCO-EPOCA-2710
  checa('I8 papel explícito continua vencendo o nome ("the boy Maria" = menino)', ficha(E, 'Once upon a time the boy Maria found a kite. Maria ran home.', 'Maria')?.genero === 'man') // KINEO-ELENCO-EPOCA-2710
  checa('I11 menina/mulher nunca sai com cabelo curto de menino (Amna, Maria, Priya, Sofia)', [a1, a2, maria, ficha(E, 'Priya found a kite. Priya ran home.', 'Priya'), ficha(E, 'Sofia found a kite. Sofia ran home.', 'Sofia')].every((x) => x && !/short dark hair|short reddish hair|neatly combed brown hair/.test(x.descricao))) // KINEO-ELENCO-EPOCA-2710
  const semNome = roda(troca(SRC, 'generoDe(papel) ?? generoDoNome(nome) ?? generoDe(contexto)', 'generoDe(papel) ?? generoDe(contexto)'), mocks) // KINEO-ELENCO-EPOCA-2710
  checa('I9 mutante: sem a tabela de nomes, a Amna sem pronome volta a não ser menina (I1 vermelho)', ficha(semNome, SEM_PRONOME, 'Amna')?.genero !== 'woman') // KINEO-ELENCO-EPOCA-2710
  checa('I10 mutante: o nome depois dos pronomes, o "he" do Baba Noor vence de novo (I2 vermelho)', ficha(roda(troca(SRC, 'generoDe(papel) ?? generoDoNome(nome) ?? generoDe(contexto)', 'generoDe(papel) ?? generoDe(contexto) ?? generoDoNome(nome)'), mocks), COM_HE, 'Amna')?.genero !== 'woman') // KINEO-ELENCO-EPOCA-2710
} // KINEO-ELENCO-EPOCA-2710

console.log(`\n${ok} ok, ${falhas.length} falha(s)${falhas.length ? ':\n  - ' + falhas.join('\n  - ') : ''}`)
if (falhas.length) process.exit(1)
