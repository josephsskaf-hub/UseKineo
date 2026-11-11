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
// KINEO-K4-PLANO-VARIADO-1111 — alavanca 2 (CEO 11/11): na 2ª prova paga do 657ad797 (8,5) os 3 primeiros quadros eram o mesmo close de
// rosto; na prova do 2120f018 (7,5) as metades da cena fundida tinham como ação a própria fala abstrata ("This shot shows only this moment:
// This manifestation is God, not all of God."). Trava (Node puro, sem rede), com os prompts REAIS dos dois filmes: (a) 2120f018 — as metades
// levam o objeto concreto da seção e nenhuma fala abstrata; a escala muda de plano a plano (close → aberto → médio → aberto) e o "wide shot"
// do fim fica; (b) 657ad797 — o close da mão depois do close dos olhos vira plano MÉDIO (a mulher com o celular), não aberto, e a ficha fica
// inteira; (c) plano com imagem-chave não é tocado; (d) plano que passaria de 512 fica como estava; (e) chave 'internal', e desligada = o
// pedido de sempre, byte a byte; (f) a rota liga as duas partes e grava a versão no claim. Mutantes no fim.
const R2 = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-2120f018-1111.json'), 'utf8'))
const R6 = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-657ad797-1111.json'), 'utf8'))
const V = 'lib/kling4PlanoVariado.ts', QP = 'lib/kling4QuatroPlanos.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const secoes2 = [...String(R2.roteiro).matchAll(/^(?:HOOK|MICRO REWARD \d|PAYOFF)[^:\n]*:\s*(?:\[Pexels:\s*([^\]]*)\])?\s*(.+)$/gmu)].map((m) => ({ pexelsQuery: (m[1] || '').trim(), voiceover: m[2].trim() }))
const semDeus = (p) => p
  .replace(/The only person in this shot is the same main character \((?:[^()]|\([^()]*\))*\); any other person described below is replaced by this same character\.\s*/g, '')
  .replace(/\s*The same main character appears in this scene, consistent design: God, exactly as the author wrote:[^\n]*?natural light\./g, '')
const iguais = (e) => e.some((x, i) => i > 0 && x && x === e[i - 1])
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let K, S, Q, T, VV, SU, P, J
  try { const load = loader(over); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts'); Q = load(QP); T = load('lib/kling4Trial.ts'); VV = load(V); SU = load('lib/cinematic/superficieSemTexto.ts'); P = load('lib/cinematic/pessoaDoPedido.ts'); J = load('lib/cinematic/juizFicha.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const ligado = VV.planoVariadoLigado(VV.KLING4_PLANO_VARIADO, true)
  // (a) 2120f018: como a rota (superfície, depois compactador, plano por seção e escala)
  const style2 = S.deriveStyleAnchor('photorealistic documentary', ', mysterious, cinematic_dark, documentary, consistent color grade across all scenes')
  const c2 = R2.plan.map((x, i) => K.promptDaCenaKling4(SU.comSuperficieSemTexto(semDeus(x.prompt)), style2, i, true))
  const q = Q.planosPorSecao({ prompts: c2, stills: [null, null, null], falas: R2.plan.map((x) => x.text), secoes: secoes2, objetoConcreto: ligado })
  if (!q) return ['(a) 2120f018: não virou 4 planos']
  const v2 = VV.planosComEscalaVariada(q.prompts, q.stills)
  const mp2 = T.buildKling4TrialInput(v2.prompts, q.stills, { voiceovers: q.falas, wordsPerSecond: R2.wps }).input.multi_prompt.map((m) => m.prompt)
  no(!/Main subject of this shot: sunrise over mountains, shown in motion\./.test(mp2[1]) || !/Main subject of this shot: waves crashing on rocks, shown in motion\./.test(mp2[2]), `(a) as metades sem o objeto da seção → ${mp2[1].slice(0, 160)}`)
  no(mp2.some((t) => /This manifestation is God|It begins creating|This shot shows only this moment/.test(t)), '(a) a fala abstrata voltou como ação de um plano')
  const e2 = mp2.map((t) => VV.escalaDoPlano(t)?.escala ?? null)
  no(JSON.stringify(e2) !== '["detalhe","aberto","medio","aberto"]', `(a) escalas do 2120f018 ${JSON.stringify(e2)}`)
  no(!/A wide shot of a star-filled night sky/.test(mp2[3]), '(a) o wide shot do fim foi trocado')
  for (const [i, t] of mp2.entries()) no(Array.from(t).length > 512 || !t.endsWith(' Mouth closed, no speaking.'), `(a) plano ${i + 1}: tamanho ou cauda`)
  // (b) 657ad797: 3 cenas, sem plano por seção
  const style6 = S.deriveStyleAnchor('photorealistic documentary')
  const pessoa = P.pessoaDoPedido(R6.original), ficha = P.fichaDaPessoa(R6.derivada, pessoa)
  const el = P.elencoComPessoaDoPedido(pessoa, [{ nome: 'the woman', tipo: 'humano', origem: 'deterministica', canonica: R6.sorteada }])
  const c6 = R6.prompts.map((x, i) => K.promptDaCenaKling4(SU.comSuperficieSemTexto(P.comLuzDoPedido(J.trocarFichaNoPrompt(x.split(`consistent design: ${R6.derivada}.`).join(`consistent design: ${ficha}.`), el.trocas), P.luzDoPedido(R6.original))), style6, i, true))
  const v6 = VV.planosComEscalaVariada(c6, [null, null, null])
  const e6 = v6.prompts.map((t) => VV.escalaDoPlano(t)?.escala ?? null)
  no(iguais(e6) || e6.includes(null), `(b) 657ad797: escalas ${JSON.stringify(e6)}`)
  no(!/Medium shot of a woman's hand holding a smartphone/.test(v6.prompts[1]), `(b) o close da mão não virou plano médio → ${v6.prompts[1].slice(-200)}`)
  for (const [i, t] of v6.prompts.entries()) no(!/long neat black braids, wearing a cream blouse and elegant black trousers\./.test(t) || Array.from(t).length > 512, `(b) plano ${i + 1}: ficha ou tamanho`)
  // (c) plano com imagem-chave fica byte a byte
  const comFoto = VV.planosComEscalaVariada(c6, [null, 'https://x/still.png', null])
  no(comFoto.prompts[1] !== c6[1], '(c) o plano com imagem-chave foi reescrito')
  // (d) teto de 512
  const cauda = ', no readable text Mouth closed, no speaking.'
  const porta = 'Photoreal film. ' + 'An old wooden door in the hallway slowly opens, '.repeat(12).slice(0, 508 - 16 - cauda.length) + cauda
  const doTeto = VV.planosComEscalaVariada(['Photoreal film. A close-up of a brass key on the floor' + cauda, porta], [null, null])
  no(Array.from(porta).length !== 508 || doTeto.prompts[1] !== porta, `(d) o plano de 508 foi trocado e passou de 512 (${Array.from(doTeto.prompts[1]).length})`)
  // (g) a escala que o vizinho já escreveu não se repete: médio → (sem escala) → aberto escrito; o do meio não vira aberto e o aberto fica
  const viz = VV.planosComEscalaVariada(['Photoreal film. A medium shot of a man at his desk' + cauda, 'Photoreal film. Main subject of this shot: a river at dawn, shown in motion' + cauda, 'Photoreal film. A wide shot of the whole city at night' + cauda], [null, null, null])
  no(viz.escalas[1] === 'aberto' || viz.prompts[2] !== 'Photoreal film. A wide shot of the whole city at night' + cauda, `(g) vizinho: ${JSON.stringify(viz.escalas)}`)
  // (e) chave e o pedido de sempre
  no(VV.KLING4_PLANO_VARIADO !== 'public' || VV.planoVariadoLigado('internal', false) || !VV.planoVariadoLigado('internal', true) || !VV.planoVariadoLigado('public', false) || VV.planoVariadoLigado('off', true), '(e) a chave não está public (aberta pela CEO em 11/11 depois da prova paga = 8,0), ou a regra da chave mudou')
  const desligado = Q.planosPorSecao({ prompts: c2, stills: [null, null, null], falas: R2.plan.map((x) => x.text), secoes: secoes2 })
  no(!desligado || !/This shot shows only this moment: This manifestation is God, not all of God\./.test(desligado.prompts[1]), '(e) desligado, a metade mudou')
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('return kling4PlanoVariado ? { ...r, prompts: planosComEscalaVariada(r.prompts, r.approvedStills).prompts } : r') || !rota.includes('secoes: parsedScript.segments, objetoConcreto: kling4PlanoVariado })') || !rota.includes('kling4_plano_variado: KLING4_PLANO_VARIADO_VERSAO') || !rota.includes('planoVariadoLigado(KLING4_PLANO_VARIADO, isInternalEmail(user.email))'), '(f) a rota não liga a alavanca 2')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (objeto da seção nas metades, escala diferente de plano a plano, imagem-chave intocada, chave public)')
const v = read(V), qp = read(QP), rota = read(ROTA)
const MUT = [
  ['M1 saindo do close, a mão vai ao aberto', { [V]: v.replace("return ['medio', 'aberto', 'detalhe']", "return ORDEM") }],
  ['M2 sem olhar a escala do vizinho', { [V]: v.replace("const proxima = lidas[i + 1]?.escrita || stills[i + 1] ? (lidas[i + 1]?.escala ?? null) : null", 'const proxima = null') }],
  ['M3 a imagem-chave não protege o plano', { [V]: v.replace('const fixo = Boolean(stills[i])', 'const fixo = false') }],
  ['M4 a metade volta à fala abstrata', { [QP]: qp.replace('const acao = opcoes.objetoConcreto && norm(secao.pexelsQuery) ?', 'const acao = false ?') }],
  ['M5 sem o teto de 512', { [V]: v.replace('if (Array.from(troca).length <= KLING4_TETO_DO_PLANO) {', 'if (true) {') }],
  ['M6 a cauda ("Mouth closed") conta como rosto', { [V]: v.replace("    .replace(/,?\\s*no readable text[^]*$/u, (m) => ' '.repeat(m.length))\n    .replace(/Mouth closed, no speaking\\.\\s*$/u, (m) => ' '.repeat(m.length))", '') }],
  ['M7 a chave volta a desligado', { [V]: v.replace("export const KLING4_PLANO_VARIADO: ModoPlanoVariado = 'public'", "export const KLING4_PLANO_VARIADO: ModoPlanoVariado = 'off'") }],
  ['M8 a rota não aplica a escala', { [ROTA]: rota.replace('return kling4PlanoVariado ? { ...r, prompts: planosComEscalaVariada(r.prompts, r.approvedStills).prompts } : r', 'return r') }],
]
for (const [nome, over] of MUT) {
  const [k, val] = Object.entries(over)[0]
  if (val === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
