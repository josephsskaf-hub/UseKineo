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
  return { A: load('@/' + ANTES), K: load('@/lib/cinematic/cenaKling4.ts'), P: load('@/lib/kling4PlanoDaFala1911.ts'), T: load('@/lib/cinematic/elencoTrava.ts') }
}
const velho = createOfflineLoader({ evaluationTimeoutMs: 120000, source: (rel, text) => ([ANTES, REPROV].includes(rel) ? lf(execFileSync('git', ['show', `${BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 64 << 20 })) : text) })('@/' + ANTES)

function prova(over = {}) {
  const e = []; const no = (c, m) => { if (c) e.push(m) }
  const { A, K, P, T } = mundo(over)
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
  // G · [revisor 20/11, rv21] o corte não volta: nem pela trava do elenco, nem pela folha; e o elenco recorrente da cena também sai
  { const canon = 'Daniel, exactly as the author wrote: "photos show Daniel"; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing white tank top, blue jeans; origin: an American woman'
    const elenco = [{ nome: 'Daniel', nucleo: 'Daniel', canonica: canon, tipo: 'humano', protagonista: true, genero: null, apelidos: [] }, { nome: 'Emily', nucleo: 'Emily', canonica: 'Emily, a woman in her twenties', tipo: 'humano', protagonista: false, genero: null, apelidos: [] }]
    const cena = `Film visual medium: photorealistic, ultra-detailed. A man opens the door of a vintage shop and smiles. The same main character appears in this scene, consistent design: ${canon}. no readable text, letters, numbers, labels or signage`
    const r = A.refazerPlanoDaFicha({ prompts: [cena], veredito: veredito(1, [1]), pessoaDaIdeia: null, cortarFicha: true })
    const cortada = A.novaFichaCortada(); A.guardarFichaCortada(cortada, [cena], r.relato.refeitos)
    no(!cortada.indices.has(0) || !cortada.trechos.some((t) => t.includes('Daniel, exactly as the author wrote')), `G1 o corte guarda o plano e o trecho cortado (${JSON.stringify([...cortada.indices])})`)
    // o perigo é real: a trava, sem a guarda, devolve a cláusula inteira ao plano cortado (rota:8085, "Daniel opens the shop door.")
    no(!T.garantirFichasNoPrompt(r.prompts[0], [elenco[0]]).includes('consistent design: Daniel'), 'G2 (o perigo) a trava sem a guarda devolve a ficha travada ao plano cortado')
    // a rota: plano cortado não passa pela trava; o elenco da folha perde quem teve a ficha cortada
    const depois = [r.prompts[0]]; for (const c of [{ indice: 0, nomes: ['Daniel'] }]) if (c.nomes.length > 0 && !cortada.indices.has(c.indice)) depois[c.indice] = T.garantirFichasNoPrompt(depois[c.indice], elenco.filter((f) => c.nomes.includes(f.nome)))
    no(/consistent design:|Daniel, exactly/u.test(depois[0]), `G3 depois da trava o plano cortado continua cortado (${depois[0]})`)
    const daFolha = A.elencoSemFichaCortada(elenco, cortada)
    no(daFolha.some((f) => f.nome === 'Daniel') || !daFolha.some((f) => f.nome === 'Emily'), `G4 a folha não é desenhada com a ficha reprovada: o Daniel sai do elenco da folha, a Emily fica (${daFolha.map((f) => f.nome)})`)
    const nada = A.elencoSemFichaCortada(elenco, A.novaFichaCortada())
    no(nada.length !== 2 || nada.some((f, i) => f !== elenco[i]), 'G5 nada cortado: o elenco da folha de sempre')
    no(A.elencoSemFichaCortada([{ nome: 'Dan' }], cortada).length !== 1, 'G5b nome por palavra inteira: "Dan" não é "Daniel"') }
  // [revisor 20/11, rv22] só o DONO da ficha cortada sai do elenco da folha (o nome que ABRE a ficha), nome mais longo primeiro, sem caixa
  { const pers = (nome, canonica) => ({ nome, nucleo: nome, canonica, tipo: 'humano', protagonista: false, genero: null, apelidos: [] })
    const CL = (c) => ` The same main character appears in this scene, consistent design: ${c}.`
    const Fp = (t, c) => `Film visual medium: photorealistic. ${t}${c ?? ''} no readable text`
    const folha = (cenas, elenco, quais) => { const fr = A.refazerPlanoDaFicha({ prompts: cenas, veredito: veredito(cenas.length, quais), pessoaDaIdeia: null, cortarFicha: true }); const fc = A.novaFichaCortada(); A.guardarFichaCortada(fc, cenas, fr.relato.refeitos); return { nomes: A.elencoSemFichaCortada(elenco, fc).map((f) => f.nome), fc } }
    const casos22 = [
      ['b1 Ana cortada: Ana Maria e Mariana ficam', [Fp('A woman waves.', CL('Ana, a woman in a red dress')), Fp('Two women talk.', CL('Ana Maria, an old woman')), Fp('A girl laughs.', CL('Mariana, a girl of 8'))], [pers('Ana', 'x'), pers('Ana Maria', 'y'), pers('Mariana', 'z')], [1], ['Ana Maria', 'Mariana']],
      ['b2 Ana Maria cortada: a Ana fica (nome mais longo primeiro)', [Fp('A woman waves.', CL('Ana, a woman in a red dress')), Fp('Two women talk.', CL('Ana Maria, an old woman'))], [pers('Ana', 'x'), pers('Ana Maria', 'y')], [2], ['Ana']],
      ['b3 Daniel cortado: o Dan fica', [Fp('A man walks.', CL('Daniel, a tall man')), Fp('A boy runs.', CL('Dan, a boy of 10'))], [pers('Daniel', 'x'), pers('Dan', 'y')], [1], ['Dan']],
      ['b4 caixa e acento: "LÉON" na ficha é o Léon do elenco', [Fp('A man sits.', CL('LÉON, a man in a grey coat'))], [pers('Léon', 'x')], [1], []],
      ["b5 só a Sarah cortada; a ficha dela cita \"Daniel's wife\": o Daniel fica", [Fp('A woman smiles.', CL("Sarah, Daniel's wife, a woman in her 30s")), Fp('A man walks.', CL('Daniel, a tall man in a coat'))], [pers('Sarah', 'x'), pers('Daniel', 'y')], [1], ['Daniel']],
      ['b6 elenco nomeado "Aaron…; Ben…" cortado num plano: o Ben fica (a ficha dele estava certa no outro)', [Fp('Named character in this shot: Aaron, a soldier; Ben, a medic — clearly visible in frame. They run.'), Fp('A medic kneels.', CL('Ben, a medic'))], [pers('Aaron', 'x'), pers('Ben', 'y')], [1], ['Ben']],
      ['b7 "the boy" no elenco recorrente: o dono com artigo', [Fp('A boy runs.', ' Recurring characters, identical face, hair and costume in every scene where they appear: the boy is exactly as the author wrote: "blocky boy"; appearance anchors: 8-12.')], [pers('boy', 'x'), pers('Emma', 'y')], [1], ['Emma']],
    ]
    for (const [nome, cenas, elenco, quais, fica] of casos22) { const r = folha(cenas, elenco, quais); no(JSON.stringify(r.nomes) !== JSON.stringify(fica), `G8 ${nome}: elenco da folha ${JSON.stringify(r.nomes)}, esperado ${JSON.stringify(fica)}`) }
    // o plano refeito SEM corte de ficha (só a ordem saiu) não é guardado como cortado
    const soOrdem = 'Film visual medium: photorealistic. The only person in this shot is the same main character (Daniel, a man in his thirties); any other person described below is replaced by this same character. Emily walks in the snow. no readable text'
    const ro = A.refazerPlanoDaFicha({ prompts: [soOrdem], veredito: veredito(1, [1]), pessoaDaIdeia: null, cortarFicha: true })
    const fo = A.novaFichaCortada(); A.guardarFichaCortada(fo, [soOrdem], [{ plano: 1, acao: 'sem_ordem' }, ...ro.relato.refeitos.filter((x) => x.ficha_cortada !== true)])
    no(fo.indices.size !== 0 || fo.trechos.length !== 0, `G9 plano refeito sem corte de ficha (sem_ordem): não é guardado como cortado (${[...fo.indices]})`)
    no(A.donoDaFicha('Identity: Mariana, a girl of 8', ['Ana', 'Mariana']) !== 'Mariana' || A.donoDaFicha('Identity: Sarah, Daniel\'s wife', ['Daniel']) !== null, 'G10 o dono é quem abre a ficha (palavra inteira), nunca quem aparece dentro') }
  no(!rota.includes('.filter((c) => c.nomes.length > 0 && !fichaCortada1311.indices.has(c.indice) /* KINEO-FICHA-POR-PLANO-2011 [rv22]: plano cortado = still de texto, sem folha */).slice(0, PERSONAGEM_MAX_STILLS)'), 'W6 o plano cortado não ganha still com folha (a folha de quem ficou no elenco não vai ao plano cuja ficha foi cortada)')
  for (const x of C.recorrentes) {
    const r = A.refazerPlanoDaFicha({ prompts: x.cenas, veredito: veredito(x.cenas.length, x.contradiz), pessoaDaIdeia: null, cortarFicha: true })
    const cortada = A.novaFichaCortada(); A.guardarFichaCortada(cortada, x.cenas, r.relato.refeitos)
    x.cenas.forEach((p, i) => {
      if (!x.contradiz.includes(i + 1)) { no(r.prompts[i] !== p, `G6 ${x.gen} plano ${i + 1} (não apontado): igual`); return }
      no(/Recurring characters|appearance anchors:/u.test(r.prompts[i]), `G6 ${x.gen} plano ${i + 1}: o elenco recorrente ficou (${r.prompts[i].slice(0, 200)})`)
      no(!r.prompts[i].includes('no readable text') || !r.prompts[i].includes('9:16 vertical framing'), `G6b ${x.gen} plano ${i + 1}: a moldura e a proteção ficam`)
    })
    no(A.elencoSemFichaCortada([{ nome: x.nome }], cortada).length !== 0, `G7 ${x.gen}: quem estava no elenco recorrente cortado ("${x.nome}") sai do elenco da folha`)
  }
  no(!rota.includes('const elencoDaFolha1311 = elencoSemFichaCortada(elencoDoAjuste, fichaCortada1311)') || !rota.includes('elencoDaFolha1311.length > 0) {') || !rota.includes('      const elencoP = elencoDaFolha1311 //'), 'W2 a folha nasce do elenco sem quem teve a ficha cortada')
  no(!rota.includes('if (c.nomes.length > 0 && !fichaCortada1311.indices.has(c.indice) /*'), 'W3 a trava do elenco não toca o plano cortado')
  no(!rota.includes('const elencoDoEnsaio1311 = elencoSemFichaCortada(elencoDoAjuste, fichaCortada1311)') || !rota.includes("if (c.nomes.length > 0 && !fichaCortada1311.indices.has(c.indice)) ps[c.indice] = garantirFichasNoPrompt(ps[c.indice], elencoDoEnsaio1311.filter("), 'W5 o ensaio de $0 (prompt_do_motor) segue a rota: o mesmo elenco da folha e a trava sem o plano cortado')
  { const iG = rota.indexOf('guardarFichaCortada(fichaCortada1311, classicScenePrompts, fichaAntes.relato.refeitos)'), iT = rota.indexOf('if (fichaRefez1311) for (let i = 0; i < classicScenePrompts.length; i++) classicScenePrompts[i] = fichaAntes.prompts[i]')
    no(!(iG > 0 && iT > iG), 'W4 o corte é guardado ANTES de trocar os prompts (os trechos saem do plano de antes)') }
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
  ['o elenco nomeado não sai', REPROV, (s) => s.replace('[...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE), ...achados(m, RECORRENTES_RE)]', '[...trechosDaFicha(m), ...achados(m, RECORRENTES_RE)]')], // [rv21] reancorado: a lista dos trechos mudou de lugar
  ['as feições saem junto', REPROV, (s) => s.replace('[...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE), ...achados(m, RECORRENTES_RE)]', '[...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE), ...achados(m, RECORRENTES_RE), ...achados(m, FEICOES_RE)]')],
  ['interruptor público no commit', ANTES, (s) => s.replace("export const FICHA_POR_PLANO_2011: ModoFichaPorPlano2011 = 'internal'", "export const FICHA_POR_PLANO_2011: ModoFichaPorPlano2011 = 'public'")],
  ['internal para todos', ANTES, (s) => s.replace("modo === 'public' || (modo === 'internal' && contaDoEnsaio === true)", "modo !== 'off'")],
  ['rota: régua larga da casa', ROTA, (s) => s.replace('cortarFicha: fichaPorPlanoLigada(FICHA_POR_PLANO_2011, isDryRunAccount(user.email))', 'cortarFicha: fichaPorPlanoLigada(FICHA_POR_PLANO_2011, isInternalEmail(user.email))')],
  ['rv21: o elenco recorrente não sai', REPROV, (s) => s.replace('const trechosDoPlano = (m: string): Trecho[] => [...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE), ...achados(m, RECORRENTES_RE)]', 'const trechosDoPlano = (m: string): Trecho[] => [...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE)]')],
  ['rv21: o corte não é guardado', ANTES, (s) => s.replace('    if (r.ficha_cortada !== true) continue\n', '    continue\n')],
  ['rv21: a folha com todo o elenco', ANTES, (s) => s.replace("  return elenco.filter((f) => !donos.has(String(f.nome ?? '')))", '  return [...elenco]')], // [rv22] reancorado: a regra do dono
  ['rv22: nome sem palavra inteira', ANTES, (s) => s.replace("'^' + escapaNome(semArtigo(nome.trim())) + '(?![\\\\p{L}\\\\p{N}])', 'iu'", "'^' + escapaNome(semArtigo(nome.trim())), 'iu'")],
  ['rv22: nome com caixa', ANTES, (s) => s.replace("'^' + escapaNome(semArtigo(nome.trim())) + '(?![\\\\p{L}\\\\p{N}])', 'iu'", "'^' + escapaNome(semArtigo(nome.trim())) + '(?![\\\\p{L}\\\\p{N}])', 'u'")],
  ['rv22: o nome em qualquer lugar da ficha', ANTES, (s) => s.replace("new RegExp('^' + escapaNome(semArtigo(nome.trim()))", "new RegExp('(?<![\\\\p{L}\\\\p{N}])' + escapaNome(semArtigo(nome.trim()))")],
  ['rv22: sem o nome mais longo primeiro', ANTES, (s) => s.replace('.sort((a, b) => semArtigo(b.trim()).length - semArtigo(a.trim()).length)', '')],
  ['rv22: guarda também o plano refeito sem corte de ficha', ANTES, (s) => s.replace('    if (r.ficha_cortada !== true) continue\n', "    if (r.acao === 'nada') continue\n")],
  ['rv22: sem tirar o rótulo da ficha', ANTES, (s) => s.replace("String(trecho ?? '').replace(ROTULO_DA_FICHA_RE, '').trimStart()", "String(trecho ?? '').trimStart()")],
  ['rv22 rota: still com folha no plano cortado', ROTA, (s) => s.replace('.filter((c) => c.nomes.length > 0 && !fichaCortada1311.indices.has(c.indice) /* KINEO-FICHA-POR-PLANO-2011 [rv22]: plano cortado = still de texto, sem folha */).slice(0, PERSONAGEM_MAX_STILLS)', '.filter((c) => c.nomes.length > 0).slice(0, PERSONAGEM_MAX_STILLS)')],
  ['rv21 rota: a trava toca o plano cortado', ROTA, (s) => s.replace('if (c.nomes.length > 0 && !fichaCortada1311.indices.has(c.indice) /* KINEO-FICHA-POR-PLANO-2011 [rv21]: o plano cortado fica cortado */)', 'if (c.nomes.length > 0)')],
  ['rv21 rota: a folha com o elenco de antes', ROTA, (s) => s.replace('      const elencoP = elencoDaFolha1311 //', '      const elencoP = elencoDoAjuste //')],
  ['rv21 rota: guardado depois da troca', ROTA, (s) => s.replace('        guardarFichaCortada(fichaCortada1311, classicScenePrompts, fichaAntes.relato.refeitos) // KINEO-FICHA-POR-PLANO-2011 [rv21] — antes de trocar os prompts\n        if (fichaRefez1311) for (let i = 0; i < classicScenePrompts.length; i++) classicScenePrompts[i] = fichaAntes.prompts[i] // KINEO-FICHA-ANTES-DO-RENDER-1311\n', '        if (fichaRefez1311) for (let i = 0; i < classicScenePrompts.length; i++) classicScenePrompts[i] = fichaAntes.prompts[i] // KINEO-FICHA-ANTES-DO-RENDER-1311\n        guardarFichaCortada(fichaCortada1311, classicScenePrompts, fichaAntes.relato.refeitos) // KINEO-FICHA-POR-PLANO-2011 [rv21] — antes de trocar os prompts\n')],
  ['rv21 rota: o ensaio devolve a ficha', ROTA, (s) => s.replace("if (c.nomes.length > 0 && !fichaCortada1311.indices.has(c.indice)) ps[c.indice] = garantirFichasNoPrompt(", 'if (c.nomes.length > 0) ps[c.indice] = garantirFichasNoPrompt(')],
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
