// KINEO-HISTORIA-REAL-1411 [CEO 13-14/11, item 3.3] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com as falas REAIS dos 3 filmes (fc6c1ffb Mona Lisa 1911, PAGO; b590f7b3 Ed Freeman 1965;
// ae1da6de faroleiros 1900):
//   (A) o objeto do elenco em filme não desenhado ganha a ficha do objeto REAL (pintura a óleo realista em moldura, inanimado), nunca a do
//       boneco antropomórfico; filme desenhado e comida que fala ficam;
//   (B) "The thief was Vincenzo Peruggia": o papel sem nome é a pessoa nomeada e não ganha ficha própria; papel de outra pessoa continua;
//   (C) o ano por extenso vira a época (1965 → 1960s; 1900) e a camada de época trava a roupa; "She was nineteen, sixty miles" não vira ano;
//   (D) a rota aplica (A) no elenco antes da folha e de toda estrada; as camadas (B) e (C) vivem em elencoEpoca;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/historiaReal1411.ts'
const globals = { AbortController, setTimeout, clearTimeout }
const carrega = (mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === ARQ ? mutar(text) : text) })

const MONA = "The Mona Lisa vanished on a Monday morning in 1911. And nobody at the Louvre noticed until the next day. The thief was Vincenzo Peruggia, an Italian handyman who had helped build the painting's glass case. On Sunday he hid in a storage closet. On Monday, with the museum closed, he lifted her off the wall, slipped her under his white work smock, and walked out. Paris panicked. The police questioned Pablo Picasso. Then, in 1913, he carried her to Florence and tried to sell her to an art dealer. The dealer called the police."
const FREEMAN = 'Why did one pilot fly back fourteen times? November fourteenth, nineteen sixty-five. The Ia Drang Valley, Vietnam. An American battalion steps off its helicopters into tall grass. Back at base, Captain Ed Freeman hears the news.'
const FAROL = 'Why did three lighthouse keepers vanish? December, nineteen hundred. A stone lighthouse on a rocky Scottish island.'
const FICHA_BONECO = 'Mona Lisa, an anthropomorphic painting character: a painting with big expressive cartoon eyes, eyebrows and a mouth, small arms and legs, still clearly shaped and textured like a real painting, not a human, no human body or human face'

function provas(L) {
  const erros = []
  const m = L(ARQ), ee = L('lib/cinematic/elencoEpoca.ts')
  // (A)
  const el = [{ nome: 'Mona Lisa', tipo: 'criatura', canonica: FICHA_BONECO }, { nome: 'Vincenzo Peruggia', tipo: 'humano', canonica: 'Peruggia, exactly as the author wrote: "Vincenzo Peruggia"' }]
  const r = m.objetoRealNoElenco(el, { estilizado: false })
  const f = r.elenco[0].canonica
  if (/anthropomorphic|cartoon eyes|arms and legs/.test(f) || !/realistic oil painting/.test(f) || !/carved wooden frame/.test(f) || !/inanimate/.test(f) || !f.startsWith('Mona Lisa, the real painting')) erros.push('A a ficha do quadro: ' + f)
  if (r.elenco[1].canonica !== el[1].canonica || r.trocados.join() !== 'Mona Lisa') erros.push('A mexeu na ficha de gente')
  if (m.objetoRealNoElenco(el, { estilizado: true }).elenco[0].canonica !== FICHA_BONECO) erros.push('A filme desenhado perdeu o personagem-objeto')
  const brocolis = [{ nome: 'Broccoli', canonica: 'Broccoli, an anthropomorphic broccoli character: a broccoli with big expressive cartoon eyes, eyebrows and a mouth' }]
  if (m.objetoRealNoElenco(brocolis, { estilizado: false, personificados: new Set(['broccoli']) }).trocados.length) erros.push('A a comida que fala virou objeto inanimado')
  if (/oil painting/.test(m.fichaDoObjetoReal('the trunk', 'trunk'))) erros.push('A todo objeto virou pintura')
  // (B)
  if (!m.papelEhONomeado(MONA, 'thief')) erros.push('B "The thief was Vincenzo Peruggia" não foi lido')
  if (m.papelEhONomeado(MONA, 'dealer')) erros.push('B o marchand virou o nomeado')
  if (!m.papelEhONomeado('Captain Ed Freeman, the pilot, hears the news.', 'pilot') || m.papelEhONomeado('A tired commuter waits. The commuter was late again.', 'commuter')) erros.push('B aposto ou falso positivo')
  const semNome = ee.protagonistaSemNome(MONA, null, false, true)
  if (semNome && /thief/.test(semNome.nome)) erros.push('B "the thief" ainda ganha ficha própria: ' + semNome.descricao)
  const comum = ee.protagonistaSemNome('A tired commuter waits on the platform. The commuter checks the clock.', null, false, true)
  if (!comum || !/commuter/.test(comum.nome)) erros.push('B o papel sem nome comum sumiu')
  // (C)
  const e65 = ee.epocaDaHistoria(FREEMAN), e00 = ee.epocaDaHistoria(FAROL)
  if (!e65 || e65.ano !== 1965 || e65.decada !== 1960) erros.push('C 1965 por extenso: ' + JSON.stringify(e65))
  if (!e00 || e00.ano !== 1900) erros.push('C 1900 por extenso: ' + JSON.stringify(e00))
  if (ee.epocaDaHistoria('She was nineteen, sixty miles from home, with two thousand soldiers.')) erros.push('C idade/quantidade virou ano')
  if (m.comAnosPorExtenso('She was nineteen, sixty miles away. Two thousand soldiers.') !== 'She was nineteen, sixty miles away. Two thousand soldiers.') erros.push('C "nineteen, sixty" ou "two thousand soldiers" virou ano')
  if (m.comAnosPorExtenso('Em mil novecentos e sessenta e cinco, o piloto') !== 'Em 1965, o piloto' || m.comAnosPorExtenso('In eighteen oh five') !== 'In 1805' || m.comAnosPorExtenso('It was two thousand and one') !== 'It was 2001') erros.push('C anos em pt / oh / 2000')
  const pistas = e65 ? ee.sufixoDeEpoca(e65) : ''
  if (!/196|period/i.test(pistas)) erros.push('C a época de 1965 não trava roupa/objetos: ' + pistas)
  return erros
}

const base = provas(carrega())
checa(`A, B e C verdes nas falas reais${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const iObj = rota.indexOf('objetoRealNoElenco(elencoDoPedido, { estilizado: isStylizedLook(styleAnchor) || desenhoInfantil.ativo')
const iFolha = rota.indexOf('const personagemElenco: { elenco: FichaDePersonagem[]; casting: string; ms: number } = qualidadeHerdada')
checa('D a rota troca a ficha do objeto no elenco ANTES da folha, do casting e de toda cena', iObj > 0 && iObj < iFolha)
const epoca = lf(fs.readFileSync('lib/cinematic/elencoEpoca.ts', 'utf8'))
checa('D a época lê o ano por extenso e o papel-que-é-o-nomeado não ganha ficha (atrás do interruptor)', epoca.includes('historiaRealLigada() ? comAnosPorExtenso(') && epoca.includes('if (historiaRealLigada() && papelEhONomeado(texto, nucleo)) return null'))
const MUTANTES = [
  ['a ficha do boneco fica no filme fotorreal', (s) => s.replace('if (o.estilizado) return { elenco: [...elenco], trocados }', 'if (true) return { elenco: [...elenco], trocados }')],
  ['a pintura perde o óleo e a moldura', (s) => s.replace("', a realistic oil painting on a flat canvas in a carved wooden frame'", "''")],
  ['o papel nunca é o nomeado', (s) => s.replace('].some((re) => re.test(t))', '].some(() => false)')],
  ['todo papel é o nomeado', (s) => s.replace('].some((re) => re.test(t))', '].some(() => true)')],
  ['ano por extenso não é lido', (s) => s.replace("    .replace(EN_RE, (_m, sec, hundred, teen, tens, un, oh) =>", "    .replace(/$^/, (_m, sec, hundred, teen, tens, un, oh) =>")],
  ['"nineteen, sixty" vira ano', (s) => s.replace("(sixteen|seventeen|eighteen|nineteen)[\\\\s-]+(?:(hundred)", "(sixteen|seventeen|eighteen|nineteen)[\\\\s,-]+(?:(hundred)")],
]
const src = lf(fs.readFileSync(ARQ, 'utf8'))
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
