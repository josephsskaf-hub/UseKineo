// [TRAVA 8.2 — vai do fundador 26/10 "tinha que seguir o menino depressivo"] KINEO-FILME15-ELENCO-2610 — guardião do elenco do 15 s.
// Prova, sem rede, com o código REAL (lib/filmes/filme15Elenco.ts + elencoDoRoteiro/cenasDoElenco reais de lib/cinematic):
//   A. pedido em português sem elenco → o elenco sai dos visuais em inglês: "a young girl" + "her grandfather" (2 papéis, a menina
//      é a protagonista); pedido com elenco → o do pedido, intocado; visual sem gente → elenco vazio.
//   B. protagonista em toda cena: a cena 3 "a woman by an open window with morning light" (o caso do rapaz deprimido) passa a ter o
//      protagonista na frente e entra em `forcadas`; cenas que já citam o elenco ficam como estão.
//   C. a rota liga tudo só no filme de 15 s com a folha (filme15RostoFixo) e usa o elenco do ajuste no bloco da folha.
//   D. desfaz exato + mutantes.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { semFilme15Elenco2610, FILME15_ELENCO_2610, MARCA_FILME15_ELENCO_2610 as MARCA } from './test-support/desfaz-filme15-elenco-2610.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 })
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const roda = (src, mods = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, module: { exports: exp }, require: (id) => (id in mods ? mods[id] : {}), console, process: { env: {} }, Intl })
  return exp
}
const modelos = new Proxy({}, { get: () => 'modelo-falso' })
const sceneStyle = roda(rd('lib/cinematic/sceneStyle.ts'), new Proxy({}, { get: () => ({}) }))
const FOLHA = roda(rd('lib/cinematic/folhaDePersonagem.ts'), { '@/lib/aiModels': { AI_TEXT_MODELS: modelos }, '@/lib/cinematic/sceneStyle': sceneStyle, '@/lib/estrelaDoFilme': { ESTRELA_EDIT_SLUG: 'x', buildEstrelaEditInput: () => ({}) } })
const AJUSTE = roda(rd('lib/cinematic/personagemAjuste.ts'), { '@/lib/cinematic/folhaDePersonagem': FOLHA, '@/lib/aiModels': { AI_TEXT_MODELS: modelos }, '@/lib/cinematic/sceneStyle': sceneStyle })
const E_SRC = rd('lib/filmes/filme15Elenco.ts')
const E = roda(E_SRC)
const extrair = AJUSTE.elencoDoRoteiro
const casa = (elenco) => (v) => AJUSTE.cenasDoElenco(v, v.map(() => ''), elenco)

const CHAVE_PT = 'Uma menina encontra uma chave azul escondida no jardim e entrega ao avô.'
const VIS_CHAVE = ['A young girl kneeling in a sunny garden, digging up a small blue key from the soil', 'The young girl hands the blue key to her grandfather, an elderly man with a white beard, in the garden', 'An ancient iron gate swings open revealing a glowing magical garden']
const VIS_NOITE = ['A tired young man sitting on his bed in a dark bedroom, staring at his phone', 'The tired young man lying awake, the phone light on his face', 'A woman standing by an open window with soft morning light pouring in']

console.log('== A. elenco ==')
if (typeof extrair === 'function' && typeof AJUSTE.cenasDoElenco === 'function') {
  checa('A0 o extrator real NÃO acha ninguém no pedido em português (o defeito)', extrair(CHAVE_PT).length === 0)
  const a = E.elencoDoFilme15({ elencoDoPedido: [], visuals: VIS_CHAVE, extrair })
  checa(`A1 elenco pelos visuais: origem cenas, 2 papéis (${a.elenco.map((f) => f.nome).join(' + ')})`, a.origem === 'cenas' && a.elenco.length === 2)
  checa('A2 a menina é a protagonista e o avô entra', a.elenco[0]?.protagonista === true && /girl/.test(a.elenco[0]?.nome ?? '') && a.elenco.some((f) => /grandfather|man/.test(f.nome)) && a.elenco[1]?.protagonista === false)
  const ped = [{ nome: 'the old lighthouse keeper', nucleo: 'keeper', tipo: 'humano', canonica: 'the old lighthouse keeper, x', origem: 'autor', protagonista: true, genero: null }]
  const b = E.elencoDoFilme15({ elencoDoPedido: ped, visuals: ['The old lighthouse keeper climbs the spiral stairs', 'A stormy sea at night'], extrair })
  checa('A3 com elenco do pedido e ninguém mais nas cenas: o do pedido, intocado', b.origem === 'pedido' && b.elenco.length === 1 && b.elenco[0].nome === 'the old lighthouse keeper' && b.elenco[0].protagonista === true)
  const menina = [{ nome: 'the young girl', nucleo: 'girl', tipo: 'humano', canonica: 'the young girl, x', origem: 'autor', protagonista: true, genero: 'feminino' }]
  const c = E.elencoDoFilme15({ elencoDoPedido: menina, visuals: VIS_CHAVE, extrair })
  checa(`A5 pedido com a menina + visuais com o avô: os dois (o teste chave azul 26/10 tinha só a menina) — ${c.elenco.map((f) => f.nome).join(' + ')}`, c.origem === 'pedido+cenas' && c.elenco.length === 2 && c.elenco[0].nome === 'the young girl' && c.elenco[0].protagonista === true && /man|grandfather/.test(c.elenco[1].nome) && c.elenco[1].protagonista === false)
  checa('A4 visual sem gente: elenco vazio', E.elencoDoFilme15({ elencoDoPedido: [], visuals: ['A stormy sea at night', 'Lightning over the cliffs'], extrair }).origem === 'nenhum')

  console.log('== B. protagonista em toda cena ==')
  const n = E.elencoDoFilme15({ elencoDoPedido: [], visuals: VIS_NOITE, extrair })
  checa(`B0 elenco do caso noturno: o rapaz (${n.elenco.map((f) => f.nome).join(' + ')})`, n.elenco.length >= 1 && /man/.test(n.elenco[0].nome))
  const p = E.protagonistaEmTodaCena({ visuals: VIS_NOITE, elenco: n.elenco })
  checa(`B1 a cena 3 (mulher na janela) é forçada (forcadas=${p.forcadas.join(',')})`, p.forcadas.includes(2))
  checa('B2 o visual forçado começa pelo protagonista e o casador real passa a achá-lo', p.visuals[2].startsWith(n.elenco[0].nome) && (casa(n.elenco)(p.visuals)[2]?.nomes ?? []).length > 0)
  checa('B3 cenas que já citam o rapaz ficam como estão', p.visuals[0] === VIS_NOITE[0] && !p.forcadas.includes(0))
  checa('B4 a ordem do prompt final diz que a única pessoa é o protagonista', /only person in this shot is the same main character/.test(E.ORDEM_DO_PROTAGONISTA('x')))
  checa('B5 sem elenco: nada é forçado', E.protagonistaEmTodaCena({ visuals: VIS_NOITE, elenco: [] }).forcadas.length === 0)
  checa('B6 "man" não casa "woman" (palavra inteira)', E.cenaCitaElenco('A woman by the window', n.elenco) === false && E.cenaCitaElenco('The young man by the window', n.elenco) === true)
} else checa('A00 módulos reais carregaram', false)

console.log('== C. rota ==')
const rota = rd('app/api/generate-video-cinematic/route.ts')
checa('C1 import do módulo', rota.includes("import { elencoDoFilme15, protagonistaEmTodaCena, ORDEM_DO_PROTAGONISTA } from '@/lib/filmes/filme15Elenco' " + '// ' + MARCA))
checa('C2 só no 15 s com a folha e história com personagem', rota.includes("const elencoFilme15 = filme15RostoFixo && personagem.ativo && !estrelaFicha && classicVisualMode === 'character_story' ? elencoDoFilme15("))
checa('C3 o ajuste dos prompts usa os visuais forçados e o elenco do ajuste', rota.includes('visuals: protagonista15 ? protagonista15.visuals : ') && rota.includes('elenco: elencoDoAjuste }) : null'))
checa('C4 o bloco da folha usa o elenco do ajuste', rota.includes('!estrelaAtiva && elencoDoAjuste.length > 0) {') && rota.includes('const elencoP = elencoDoAjuste '))
checa('C5 as cenas forçadas ganham ORDEM_DO_PROTAGONISTA antes do still e do clipe', rota.includes('classicScenePrompts[i] = ORDEM_DO_PROTAGONISTA(p15.canonica) + classicScenePrompts[i]'))
checa('C6 a ordem entra ANTES da moderação do texto final', rota.indexOf('ORDEM_DO_PROTAGONISTA(p15.canonica)') < rota.indexOf('KINEO-ROMANCE-ADULTO-2026-10-13 — a moderação lê o TEXTO FINAL'))

console.log('== D. desfaz exato ==')
const commits = git('log', '--format=%H', `--grep=${MARCA}`).trim().split('\n').filter(Boolean)
const base = commits.length ? `${commits[commits.length - 1]}^` : 'HEAD'
const baseSha = git('rev-parse', base).trim()
const f = 'app/api/generate-video-cinematic/route.ts'
const baseTxt = lf(git('show', `${baseSha}:${f}`))
checa(`D1 base da tabela = base real (${baseSha.slice(0, 9)})`, FILME15_ELENCO_2610.base === baseSha)
checa('D2 sem a camada a rota é byte a byte a base', semFilme15Elenco2610(rota, f) === baseTxt)
checa('D3 idempotente e preserva CRLF', semFilme15Elenco2610(baseTxt, f) === baseTxt && semFilme15Elenco2610(rota.replace(/\n/g, '\r\n'), f) === baseTxt.replace(/\n/g, '\r\n'))
checa('D4 todo trecho novo leva a marca', FILME15_ELENCO_2610.scope[f].hunks.every((h) => h.after.includes(MARCA)))

console.log('== mutantes ==')
const m1 = E_SRC.replace('if ((contagem.get(a.chave) ?? 0) >= 2 || comOProtagonista) elenco.push', 'if (false) elenco.push')
checa('M1 aplicado (o 2º papel nunca entra)', m1 !== E_SRC)
if (typeof extrair === 'function') checa('M1 → A1 e A5 vermelhos (o avô some)', roda(m1).elencoDoFilme15({ elencoDoPedido: [], visuals: VIS_CHAVE, extrair }).elenco.length === 1)
const m2 = E_SRC.replace('if (cenaCitaElenco(v, args.elenco)) return v', 'return v')
checa('M2 aplicado (nunca força o protagonista)', m2 !== E_SRC)
if (typeof extrair === 'function') { const n2 = roda(m2).elencoDoFilme15({ elencoDoPedido: [], visuals: VIS_NOITE, extrair }); checa('M2 → B1 vermelho', roda(m2).protagonistaEmTodaCena({ visuals: VIS_NOITE, elenco: n2.elenco }).forcadas.length === 0) }

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log(falhas.map((x) => ' - ' + x).join('\n')); process.exit(1) }
