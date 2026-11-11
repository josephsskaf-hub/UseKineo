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
// KINEO-K4-PLANO-FINAL-1111 — alavanca 1 (CEO 11/11): na prova da alavanca 2 do 2120f018 (8,0) o último plano era um céu parado (os 2
// quadros iguais) e o planejador gastava o plano com "capturing the vastness of creation's beauty". Trava (Node puro, sem rede), com os
// prompts REAIS do 2120f018 e do 657ad797: (a) o último plano diz que a câmera se move, a luz muda e a ação se completa; a oração que só
// descreve sai; os planos 1–3 ficam byte a byte; (b) o fim do 657ad797 (close do rosto) sobe de escala; (c) com imagem-chave a escala fica;
// (d) a câmera parada do molde ("slow pull-back") sai; (e) teto de 512; (f) chave 'internal', a rota liga só o último plano e grava a versão.
const R2 = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-2120f018-1111.json'), 'utf8'))
const R6 = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-657ad797-1111.json'), 'utf8'))
const F = 'lib/kling4PlanoFinal.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const secoes2 = [...String(R2.roteiro).matchAll(/^(?:HOOK|MICRO REWARD \d|PAYOFF)[^:\n]*:\s*(?:\[Pexels:\s*([^\]]*)\])?\s*(.+)$/gmu)].map((m) => ({ pexelsQuery: (m[1] || '').trim(), voiceover: m[2].trim() }))
const semDeus = (p) => p
  .replace(/The only person in this shot is the same main character \((?:[^()]|\([^()]*\))*\); any other person described below is replaced by this same character\.\s*/g, '')
  .replace(/\s*The same main character appears in this scene, consistent design: God, exactly as the author wrote:[^\n]*?natural light\./g, '')
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let FF, K, S, Q, V, SU, P, J
  try { const load = loader(over); FF = load(F); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts'); Q = load('lib/kling4QuatroPlanos.ts'); V = load('lib/kling4PlanoVariado.ts'); SU = load('lib/cinematic/superficieSemTexto.ts'); P = load('lib/cinematic/pessoaDoPedido.ts'); J = load('lib/cinematic/juizFicha.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const fim = (prompts, stills) => { const u = prompts.length - 1; const ea = u > 0 ? (V.escalaDoPlano(prompts[u - 1])?.escala ?? null) : null; return prompts.map((x, i) => i === u ? FF.planoFinalEmMovimento(x, { comImagemChave: Boolean(stills[u]), escalaAnterior: ea }) : x) }
  // (a) 2120f018, como a rota: superfície, compactador, plano por seção, superfície no plano, escala, e o fim
  const style2 = S.deriveStyleAnchor('photorealistic documentary', ', mysterious, cinematic_dark, documentary, consistent color grade across all scenes')
  const c2 = R2.plan.map((x, i) => K.promptDaCenaKling4(SU.comSuperficieSemTexto(semDeus(x.prompt)), style2, i, true))
  const q = Q.planosPorSecao({ prompts: c2, stills: [null, null, null], falas: R2.plan.map((x) => x.text), secoes: secoes2, objetoConcreto: true })
  if (!q) return ['(a) 2120f018: não virou 4 planos']
  const antes = V.planosComEscalaVariada(q.prompts.map((x) => SU.comSuperficieNoPlano(x)), q.stills).prompts
  const depois = fim(antes, q.stills)
  no(!depois[3].includes(FF.FRASE_DO_FINAL) || /capturing the vastness/.test(depois[3]) || !/A wide shot of a star-filled night sky/.test(depois[3]), `(a) último plano → ${depois[3]}`)
  no(depois.slice(0, 3).some((x, i) => x !== antes[i]), '(a) um plano que não é o último mudou')
  for (const t of depois) no(Array.from(t).length > 512 || !t.endsWith(' Mouth closed, no speaking.'), `(a/e) tamanho ou cauda → ${t.slice(-80)}`)
  // (b) 657ad797: o fim é um close do rosto
  const style6 = S.deriveStyleAnchor('photorealistic documentary')
  const pessoa = P.pessoaDoPedido(R6.original), ficha = P.fichaDaPessoa(R6.derivada, pessoa)
  const el = P.elencoComPessoaDoPedido(pessoa, [{ nome: 'the woman', tipo: 'humano', origem: 'deterministica', canonica: R6.sorteada }])
  const c6 = R6.prompts.map((x, i) => K.promptDaCenaKling4(SU.comSuperficieSemTexto(J.trocarFichaNoPrompt(x.split(`consistent design: ${R6.derivada}.`).join(`consistent design: ${ficha}.`), el.trocas)), style6, i, true))
  const v6 = V.planosComEscalaVariada(c6, [null, null, null]).prompts
  const f6 = fim(v6, [null, null, null])
  no(V.escalaDoPlano(f6[2])?.escala === 'detalhe' || Array.from(f6[2]).length > 512 || !/transforms from anticipation to joy/.test(f6[2]), `(b) o fim do 657ad797 ficou em close ou perdeu a ação → ${f6[2].slice(-260)}`)
  // (c) com imagem-chave, a escala do fim é da imagem
  const comFoto = fim(v6, [null, null, 'https://x/still.png'])
  no(V.escalaDoPlano(comFoto[2])?.escala !== V.escalaDoPlano(v6[2])?.escala, '(c) a imagem-chave não protegeu a escala do fim')
  // (d) a câmera parada do molde sai
  const parado = FF.planoFinalEmMovimento('Photoreal film. Clear well-lit shot of the final moment, slow pull-back, a boy lifts the trophy over his head, no readable text Mouth closed, no speaking.')
  no(/slow pull-back/.test(parado) || !/a boy lifts the trophy over his head/.test(parado), `(d) → ${parado}`)
  // (e) teto: plano de 505 não ganha a frase e não passa de 512
  const cheio = 'Photoreal film. ' + 'A boy runs across the wide green field toward the river, '.repeat(9).slice(0, 462) + ' Mouth closed, no speaking.'
  no(Array.from(cheio).length !== 505 || Array.from(FF.planoFinalEmMovimento(cheio)).length > 512, '(e) passou de 512')
  // (f) chave, rota e claim
  no(FF.KLING4_PLANO_FINAL !== 'internal' || FF.planoFinalLigado('internal', false) || !FF.planoFinalLigado('internal', true), '(f) a chave não é internal')
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('return { ...r3, prompts: r3.prompts.map((p, i) => i === ultimo ? planoFinalEmMovimento(p, { comImagemChave: Boolean(r3.approvedStills[ultimo]), escalaAnterior }) : p) }') || !rota.includes('if (!kling4PlanoFinal || !r3.prompts.length) return r3') || !rota.includes('kling4_plano_final: KLING4_PLANO_FINAL_VERSAO') || !rota.includes('planoFinalLigado(KLING4_PLANO_FINAL, isInternalEmail(user.email))'), '(f) a rota não liga a alavanca 1')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (o último plano se move e se completa; o resto byte a byte; o fim não é close; teto; chave internal)')
const f = read(F), rota = read(ROTA)
const MUT = [
  ['M1 a oração que só descreve fica', { [F]: f.replace('let nova = acao.replace(ENCHIMENTO_RE, \'\')', 'let nova = acao') }],
  ['M2 a câmera parada fica', { [F]: f.replace(".replace(PARADO_RE, '')", '') }],
  ['M3 o fim fica em close', { [F]: f.replace("if (lida?.escala === 'detalhe')", 'if (false)') }],
  ['M4 a imagem-chave não protege', { [F]: f.replace('if (!opcoes.comImagemChave) {', 'if (true) {') }],
  ['M5 sem o teto', { [F]: f.replace('if (Array.from(final).length <= teto) return final', 'return final') }],
  ['M6 a chave abre ao público', { [F]: f.replace("export const KLING4_PLANO_FINAL: ModoPlanoFinal = 'internal'", "export const KLING4_PLANO_FINAL: ModoPlanoFinal = 'public'") }],
  ['M7 a rota não aplica', { [ROTA]: rota.replace('if (!kling4PlanoFinal || !r3.prompts.length) return r3', 'return r3') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
