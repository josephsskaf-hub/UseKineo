// KINEO-FICHA-POR-PLANO-2011 [CEO 20/11, (ii) "a ficha antes da imagem, com o corte por plano"] — guardião.
// O furo: o juiz de antes das imagens (juiz_plano_ficha_antes) aponta o plano cuja ficha contradiz o pedido, mas só a ORDEM "The only person in this
// shot…" era refeita; a ficha na cláusula travada ou no elenco nomeado (Identity:/Visible: no Kling 4) ficava 'nada' (30 dias: 18 de 188 filmes, 26
// planos; o Natal 8e83778f, planos 2 e 3). Aqui:
//  F1 · desligado (o valor do commit para cliente): byte a byte a lib da 7977337f9, prompts e relato;
//  F2 · o Natal: os planos apontados perdem "Identity: Daniel … an American woman."; a época e a ação da Emily ficam; o plano não apontado, igual;
//  F3 · 3 dos 18 filmes, com os prompts de CENA reais: o plano apontado perde a sua ficha (cláusula, elenco nomeado, a repetida no fim); feições,
//       moldura e proteção do fim ficam; no Kling 4 o plano sai sem Identity:/Visible: e mais curto (o espaço da descrição volta);
//  F4 a F6 · a pessoa da ideia não é cortada; acusação não verificada e índice incerto não cortam nada;
//  F7 e W · o interruptor ('internal' = só a conta exata do ensaio) e a fiação da rota; e mutantes.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
const ANTES = 'lib/cinematic/fichaAntesDoRender1311.ts', REPROV = 'lib/cinematic/fichaReprovada1911.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const BASE = '7977337f9' // a main antes do corte por plano
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
const C = JSON.parse(fs.readFileSync('scripts/test-support/ficha-por-plano-2011-casos.json', 'utf8'))
const STYLE = { look: 'photoreal', suffix: '', lookPhrase: 'photorealistic, ultra-detailed' }
const cp = (s) => Array.from(String(s)).length
const veredito = (n, contradiz, verificados = contradiz) => ({ status: 'JUDGED', falhas: ['a_ficha'], reprovado: true, nota: 75, ms: 1, cenas: n,
  planos: Array.from({ length: n }, (_, i) => ({ plano: i + 1, a: contradiz.includes(i + 1) ? 'contradiz' : 'bate', b: 'nao', c: 'nao' })),
  defeitos: verificados.map((p) => `plano ${p} · ficha contradiz "x": "y"`) })
const FICHA_RE = /consistent design:|in this shot: |(?:^|[\s.])(?:Identity|Visible(?:, seen from behind)?): /u

function mundo(over = {}) {
  const load = createOfflineLoader({ evaluationTimeoutMs: 120000, source: (rel, text) => (over[rel] ?? text) })
  return { A: load('@/' + ANTES), K: load('@/lib/cinematic/cenaKling4.ts'), P: load('@/lib/kling4PlanoDaFala1911.ts') }
}
const velho = createOfflineLoader({ evaluationTimeoutMs: 120000, source: (rel, text) => ([ANTES, REPROV].includes(rel) ? lf(execFileSync('git', ['show', `${BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 64 << 20 })) : text) })('@/' + ANTES)

function prova(over = {}) {
  const e = []; const no = (c, m) => { if (c) e.push(m) }
  const { A, K, P } = mundo(over)
  const rota = over[ROTA] ?? ler(ROTA)
  const casos = [{ gen: C.natal.gen, prompts: C.natal.planos, contradiz: C.natal.contradiz }, ...C.cenas.map((f) => ({ gen: f.gen, prompts: f.cenas, contradiz: f.contradiz }))]
  // F1 · desligado = a lib de antes, byte a byte (prompts e relato)
  for (const x of casos) for (const cortar of [undefined, false]) {
    const a = { prompts: x.prompts, veredito: veredito(x.prompts.length, x.contradiz), pessoaDaIdeia: null, ...(cortar === undefined ? {} : { cortarFicha: cortar }) }
    const v0 = velho.refazerPlanoDaFicha(a), v1 = A.refazerPlanoDaFicha(a)
    no(JSON.stringify(v0) !== JSON.stringify(v1), `F1 ${x.gen} desligado (cortarFicha ${cortar}): diferente da ${BASE}`)
  }
  // F2 · o Natal
  { const x = casos[0], r = A.refazerPlanoDaFicha({ prompts: x.prompts, veredito: veredito(4, [1, 2, 3]), pessoaDaIdeia: null, cortarFicha: true })
    for (const i of [0, 1, 2]) {
      no(/Identity:|Daniel, exactly|an American woman/u.test(r.prompts[i]), `F2 Natal plano ${i + 1}: a ficha do Daniel ficou (${r.prompts[i].slice(0, 200)})`)
      no(!r.prompts[i].includes('Period setting: 1997 (1990s).') || !r.prompts[i].includes('Mouth closed, no speaking.'), `F2b Natal plano ${i + 1}: a época e o fim ficam`)
    }
    no(!r.prompts[1].includes('Emily discovers a photo strip tucked inside the pocket of a vibrant red wool coat.') || !r.prompts[2].includes('Emily holds the photo strip beside an antique mirror'), 'F2c Natal: a ação da Emily fica inteira')
    no(r.prompts[3] !== x.prompts[3], 'F2d Natal plano 4 (não apontado): igual')
    no(JSON.stringify(r.relato.refeitos) !== JSON.stringify([1, 2, 3].map((p) => ({ plano: p, acao: 'sem_ficha_do_plano', ficha_cortada: true }))) || r.relato.ficha_por_plano !== true, `F2e Natal: o relato diz o corte (${JSON.stringify(r.relato.refeitos)})`)
    const ganho = [0, 1, 2].map((i) => cp(x.prompts[i]) - cp(r.prompts[i]))
    no(ganho.some((g) => g < 180), `F2f Natal: o plano ganha o espaço da ficha (${ganho.join(', ')} caracteres; ela tinha ~200)`) }
  // F3 · os prompts de cena reais
  for (const x of casos.slice(1)) {
    const r = A.refazerPlanoDaFicha({ prompts: x.prompts, veredito: veredito(x.prompts.length, x.contradiz), pessoaDaIdeia: null, cortarFicha: true })
    x.prompts.forEach((p, i) => {
      const n = i + 1, q = r.prompts[i]
      if (!x.contradiz.includes(n)) { no(q !== p, `F3 ${x.gen} plano ${n} (não apontado): igual`); return }
      no(FICHA_RE.test(q), `F3 ${x.gen} plano ${n}: a ficha ficou (${q.slice(0, 220)})`)
      no(/natural features of/u.test(p) !== /natural features of/u.test(q), `F3b ${x.gen} plano ${n}: as feições da origem ficam`)
      no(!q.includes('no readable text') || !q.includes('9:16 vertical framing'), `F3c ${x.gen} plano ${n}: a moldura e a proteção do fim ficam`)
      const k0 = K.promptDaCenaKling4(p, STYLE, i, true), k1 = K.promptDaCenaKling4(q, STYLE, i, true)
      // no Kling 4 o plano é enchido até o teto: o espaço da ficha volta para a AÇÃO (o que o descricao_nao_cabe media)
      const a0 = cp(P.acaoDoPlano(k0)), a1 = cp(P.acaoDoPlano(k1))
      no(/(?:^|[\s.])(?:Identity|Visible(?:, seen from behind)?): /u.test(k1) || !/(?:^|[\s.])(?:Identity|Visible(?:, seen from behind)?): /u.test(k0) || a1 - a0 < 60, `F3d ${x.gen} plano ${n}: no Kling 4 sem Identity:/Visible: e com mais ação (ação ${a0} → ${a1} caracteres)`)
    })
  }
  // F4 · a pessoa da ideia não é cortada
  { const ordem = 'Film visual medium: photorealistic, ultra-detailed. The only person in this shot is the same main character (Daniel, a man in his thirties); any other person described below is replaced by this same character. Emily walks in the snow. The same main character appears in this scene, consistent design: a 24-year-old woman with curly black hair. no readable text, letters, numbers, labels or signage'
    const a = { prompts: [ordem], veredito: veredito(1, [1]), pessoaDaIdeia: 'a 24-year-old woman with curly black hair' }
    const on = A.refazerPlanoDaFicha({ ...a, cortarFicha: true }), off = A.refazerPlanoDaFicha(a)
    no(on.prompts[0] !== off.prompts[0] || on.relato.refeitos[0].acao !== 'ideia', `F4 a pessoa da ideia (acao ideia) não é cortada (${on.relato.refeitos[0].acao})`) }
  // F5 e F6 · acusação não verificada; índice incerto
  { const x = casos[1]
    const nv = A.refazerPlanoDaFicha({ prompts: x.prompts, veredito: veredito(x.prompts.length, x.contradiz, []), pessoaDaIdeia: null, cortarFicha: true })
    no(nv.prompts.some((p, i) => p !== x.prompts[i]), 'F5 acusação que o juiz não verificou: nada cortado')
    const inc = A.refazerPlanoDaFicha({ prompts: x.prompts, veredito: veredito(x.prompts.length + 1, x.contradiz), pessoaDaIdeia: null, cortarFicha: true })
    no(inc.prompts.some((p, i) => p !== x.prompts[i]), 'F6 o juiz julgou outro número de planos: nada cortado') }
  // F7 e W · o interruptor e a rota
  no(A.FICHA_POR_PLANO_2011 !== 'internal', "F7 o commit nasce 'internal' (só a conta exata do ensaio)")
  no(A.fichaPorPlanoLigada('internal', false) || !A.fichaPorPlanoLigada('internal', true) || !A.fichaPorPlanoLigada('public', false) || A.fichaPorPlanoLigada('off', true), 'F7b a régua: off | internal (só a casa) | public')
  no(!rota.includes('sujeitoDoPedido: sujeitoDoPedido1311, cortarFicha: fichaPorPlanoLigada(FICHA_POR_PLANO_2011, isDryRunAccount(user.email)) })'), 'W1 a rota liga o corte pelo interruptor e pela régua EXATA do ensaio (isDryRunAccount)')
  return e
}

const MUT = [
  ['sem o corte', ANTES, (s) => s.replace("    const cortado = args.cortarFicha === true && r.acao !== 'ideia' ? semFichaDoPlano(prompts[i]) : prompts[i]", '    const cortado = prompts[i]')],
  ['corta a pessoa da ideia', ANTES, (s) => s.replace("args.cortarFicha === true && r.acao !== 'ideia' ? semFichaDoPlano", 'args.cortarFicha === true ? semFichaDoPlano')],
  ['corta desligado', ANTES, (s) => s.replace("args.cortarFicha === true && r.acao !== 'ideia' ? semFichaDoPlano", "r.acao !== 'ideia' ? semFichaDoPlano")],
  ['relato sempre com ficha_por_plano', ANTES, (s) => s.replace('...(args.cortarFicha === true ? { ficha_por_plano: true as const } : {}),', 'ficha_por_plano: true as const,')],
  ['acao velha no relato', ANTES, (s) => s.replace("acao: r.acao === 'nada' ? 'sem_ficha_do_plano' : r.acao, ficha_cortada: true", 'acao: r.acao')],
  ['o elenco nomeado não sai', REPROV, (s) => s.replace('  const cortes = [...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE)]', '  const cortes = [...trechosDaFicha(m)]')],
  ['as feições saem junto', REPROV, (s) => s.replace('  const cortes = [...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE)]', '  const cortes = [...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE), ...achados(m, FEICOES_RE)]')],
  ['interruptor público no commit', ANTES, (s) => s.replace("export const FICHA_POR_PLANO_2011: ModoFichaPorPlano2011 = 'internal'", "export const FICHA_POR_PLANO_2011: ModoFichaPorPlano2011 = 'public'")],
  ['internal para todos', ANTES, (s) => s.replace("modo === 'public' || (modo === 'internal' && contaDoEnsaio === true)", "modo !== 'off'")],
  ['rota: régua larga da casa', ROTA, (s) => s.replace('cortarFicha: fichaPorPlanoLigada(FICHA_POR_PLANO_2011, isDryRunAccount(user.email))', 'cortarFicha: fichaPorPlanoLigada(FICHA_POR_PLANO_2011, isInternalEmail(user.email))')],
  ['rota: sempre ligado', ROTA, (s) => s.replace('cortarFicha: fichaPorPlanoLigada(FICHA_POR_PLANO_2011, isDryRunAccount(user.email))', 'cortarFicha: true')],
]

const p0 = prova()
if (p0.length) { console.error('FAIL test-ficha-por-plano-2011:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) {
  const o = ler(arq), m = f(o)
  if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue }
  let e; try { e = prova({ [arq]: m }) } catch (x) { e = ['lançou: ' + (x?.message ?? x)] }
  if (!e.length) vivos.push(nome)
}
if (vivos.length) { console.error('FAIL test-ficha-por-plano-2011: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-ficha-por-plano-2011 (Natal 8e83778f e 3 dos 18 filmes reais: o plano apontado perde a sua ficha antes das imagens; desligado = ${BASE} byte a byte; ${MUT.length} mutantes mortos)`)
process.exit(0)
