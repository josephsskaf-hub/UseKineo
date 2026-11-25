// KINEO-DESCRITOR-FORTE-1911 · A2 [CEO 19/11] — o descritor forte no plano do Kling 4 grátis + o juiz antes do envio.
// SEM bandeira (guardião, $0): executa a função REAL generateCinematicDescriptions extraída da rota, com o OpenAI de mentira que guarda o pedido;
// confere modelo, regra por seção e nota; executa secoesAReescrever/notaDaReescrita e o plano pleno (lib/kling4QuatroPlanos.ts); confere a
// ligação na rota; mede o tamanho do pedido REAL e imprime o custo por filme. Mutantes no fim. (A cena de uma seção só nasce da sua descrição por
// promptsDeCenaInteira; a nota do juiz vai junto do Topic da chamada de reescrita: nenhuma linha antiga do descritor muda.)
// O ENSAIO PAGO não é daqui: roda pela própria rota (dry_run na conta da casa, A2 em 'internal') — docs/plano-da-fala-1911/ENSAIO-A2-COMO-RODAR.md.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const ROTA = 'app/api/generate-video-cinematic/route.ts', LIB = 'lib/kling4PlanoDaFala1911.ts', QP = 'lib/kling4QuatroPlanos.ts', EVT = 'app/api/events/route.ts'
// preço público da OpenAI por token (US$), a conferir na página de preços antes do ensaio pago
const PRECO = { 'gpt-4o': { in: 2.5e-6, out: 10e-6 }, 'gpt-4o-mini': { in: 0.15e-6, out: 0.6e-6 } }
const JUIZ_USD_MEDIO = 0.00124 // juiz_plano_verdict, 176 vereditos em 7 dias (banco, 19/11): US$ 0,00124; p50 6,1 s, p90 10,8 s
const filmes = [...JSON.parse(read('docs/plano-da-fala-1911/replay-filmes-citados.json')).filmes, ...JSON.parse(read('docs/plano-da-fala-1911/replay-lista-completa.json')).filmes]

function descritor(over, openai) {
  const rota = over[ROTA] ?? read(ROTA)
  const i = rota.indexOf('async function generateCinematicDescriptions('), j = rota.indexOf('\n}\n', i)
  const js = ts.transpileModule(rota.slice(i, j + 3) + '\nexports.generateCinematicDescriptions = generateCinematicDescriptions', { compilerOptions: { module: 1, target: 9 } }).outputText
  const load = createOfflineLoader({ source: (rel, src) => over[rel] ?? src })
  const P = load('@/lib/cinematic/pistaNaoManda.ts'), C = load('@/lib/cinematic/cenarioDoFilme.ts'), L = load('@/' + LIB)
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { warn() {}, log() {} }, JSON, Math, Array, String, Number, openai,
    temMarcaDeBusca: P.temMarcaDeBusca, REGRA_DA_PISTA: P.REGRA_DA_PISTA, REGRAS_DO_ESCRITOR_DE_CENAS: C.REGRAS_DO_ESCRITOR_DE_CENAS, REGRA_DO_PLANO_DA_FALA: L.REGRA_DO_PLANO_DA_FALA, sistemaPorSecao: L.sistemaPorSecao,
    visualDescriptionDirection: () => 'faceless documentary b-roll, no presenter', aspectSpec: () => ({ promptFraming: '9:16 vertical framing' }), NO_TEXT_OBJECT_DIRECTION: 'No text-bearing objects.' })
  return exp.generateCinematicDescriptions
}
const fake = () => { const calls = []; return { calls, chat: { completions: { create: async (input) => { calls.push(input); const n = (input.messages[1].content.match(/^Scene \d+:/gm) ?? []).length; return { choices: [{ message: { content: JSON.stringify({ descriptions: Array.from({ length: n }, (_, k) => `The griffin lands on the summit in shot ${k + 1}`) }) } }] } } } } } }
const POL = { mode: 'documentary_faceless', style: { look: 'photoreal', lookPhrase: '', suffix: '' }, character: null, aspect: '9:16' }
const secoesDe = (load, f) => load('@/lib/scriptParser.ts').parseUserScript(f.roteiro).segments

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  const load = createOfflineLoader({ source: (rel, src) => over[rel] ?? src })
  let L, Q
  try { L = load('@/' + LIB); Q = load('@/' + QP) } catch (e) { return [`libs não carregam: ${e.message}`] }
  // ── A · a lib ──
  // [revisor 19/11, "pode com condição"] o modo novo 'sem_ficha' é aceito (o cliente só abre sem ficha nas cenas); 'public' continua só com revisor + prova paga + sim do dono
  no(!['internal', 'sem_ficha'].includes(L.KLING4_DESCRITOR_FORTE_1911) || !['internal', 'sem_ficha'].includes(L.KLING4_PLANO_DA_FALA_1911), 'A0 estado de publicação: os dois em internal (só a casa) ou sem_ficha (o cliente só sem ficha). public = só com revisor independente + prova paga + sim do dono')
  // [CEO 19/11] com os dois em 'internal', o cliente de fora recebe EXATAMENTE o caminho de hoje: as duas portas fecham para e-mail que não é da casa e
  // toda peça nova da rota está atrás delas (a descrição por seção, o eco do dry_run e a revisão do A2)
  no([L.KLING4_PLANO_DA_FALA_1911, L.KLING4_DESCRITOR_FORTE_1911].some((m) => (m === 'internal' ? L.planoDaFalaLigado(m, false) : !(L.planoDaFalaLigado(m, false) && L.soSemFicha(m, false)))), 'F1 cliente de fora: em internal as duas portas fecham (o caminho de hoje); em sem_ficha só abrem com a guarda da ficha')
  no(!L.planoDaFalaLigado(L.KLING4_PLANO_DA_FALA_1911, true) || !L.planoDaFalaLigado(L.KLING4_DESCRITOR_FORTE_1911, true), 'F2 conta da casa: as duas abrem (o ensaio)')
  { const rr = over[ROTA] ?? read(ROTA)
    no(!rr.includes('const kling4DescritorForte1911 = kling4TrialCandidate && verbatim && planoDaFalaLigado(KLING4_DESCRITOR_FORTE_1911, isDryRunAccount(user.email))') || !rr.includes('(kling4TrialCandidate && verbatim && planoDaFalaLigado(KLING4_PLANO_DA_FALA_1911, isDryRunAccount(user.email))'), 'F3 as portas da rota leem o e-mail da conta, pela régua EXATA do ensaio (isDryRunAccount)')
    no(!rr.includes('const descricoesDasSecoesK4: Promise<(string | null)[]> | null = kling4PlanoDaFala1911\n      ?') || !rr.includes("const a2Ensaio1911 = kling4DescritorForte1911 && descricoesDasSecoesK4 && motor1411.kling4 ?") || !rr.includes('if (kling4DescritorForte1911 && descricoesDasSecoesK4) promptsDeCenaInteira(') || !rr.includes('    if (descricoesDasSecoesK4) {\n      const soSemFicha1911 = soSemFicha('), /* [revisor 19/11] reancorado: o bloco da descrição começa pela guarda da ficha */ 'F4 toda peça nova está atrás das portas (porta fechada = nenhuma chamada, nenhuma mudança)') }
  // [revisor 19/11, 2ª volta, item 1] a régua larga da casa (isInternalEmail) abre para e-mail parecido: um render REAL de quem não é da casa entraria no A1/A2.
  // As portas usam isDryRunAccount (a lista exata do ensaio: hoje 1 e-mail, o do fundador): e-mail parecido NÃO abre.
  { let D, I
    try { D = load('@/lib/cinematic/classicDryRun'); I = load('@/lib/internalAccounts') } catch (e) { p.push(`F5 réguas não carregam: ${e.message}`) }
    if (D && I) {
      const parecidos = ['joseph+qualquer@evil.com', 'testando.ana@gmail.com', 'josephskaf.fake@outlook.com', 'victoriaskafxyz@yahoo.com', 'a@mailinator.com.br']
      const abre = parecidos.filter((e) => (over[ROTA] ?? read(ROTA)).includes('planoDaFalaLigado(KLING4_DESCRITOR_FORTE_1911, isInternalEmail(user.email))') ? I.isInternalEmail(e) : D.isDryRunAccount(e))
      no(abre.length > 0, `F5 e-mail parecido com o da casa NÃO abre as portas (${abre.join(', ')})`)
      no(D.isDryRunAccount(null) || D.isDryRunAccount(''), 'F5b sem e-mail não abre') } }
  no(L.MODELO_DO_DESCRITOR_FORTE !== 'gpt-4o', `A1 o modelo forte é AI_TEXT_MODELS.planner (${L.MODELO_DO_DESCRITOR_FORTE})`)
  const v = (o) => ({ status: 'JUDGED', falhas: ['d_sujeito'], cenas_reescreveria: [2], d_sujeito: 'a griffin', ...o })
  no(JSON.stringify(L.secoesAReescrever(v(), 4, 4)) !== '[1]', 'A2 plano 2 reprovado = seção 2 (índice 1)')
  no(L.secoesAReescrever(v({ status: 'UNVERIFIED' }), 4, 4).length || L.secoesAReescrever(null, 4, 4).length, 'A3 juiz sem veredito = nada')
  // [2º ensaio] a_ficha em PARTE dos planos reescreve só esses (3505835b, de85d652); em TODO plano é a ficha do elenco que está errada (1c770cb7): nada
  no(L.secoesAReescrever(v({ falhas: ['a_ficha'], cenas_reescreveria: [1, 2, 3, 4] }), 4, 4).length || JSON.stringify(L.secoesAReescrever(v({ falhas: ['a_ficha'], cenas_reescreveria: [4] }), 4, 4)) !== '[3]', 'A4 a ficha: só os planos apontados, nunca todos')
  no(JSON.stringify(L.secoesAReescrever(v({ falhas: ['e_final'], cenas_reescreveria: [] }), 4, 4)) !== '[3]', 'A5 final que não entrega = a última seção')
  no(L.secoesAReescrever(v(), 3, 4).length, 'A6 planos ≠ seções = nada (nunca desloca)')
  no(JSON.stringify(L.secoesAReescrever(v({ cenas_reescreveria: [0, 2, 9, 2] }), 4, 4)) !== '[1]', 'A7 índice fora e repetido descartados')
  const nota = L.notaDaReescrita(v({ falhas: ['d_sujeito', 'e_final'] }))
  no(!/central subject of the request was not clearly visible/.test(nota) || !/last shot did not deliver/.test(nota) || !/The central subject of the request is: a griffin/.test(nota), 'A8 a nota diz o que reprovou e o sujeito')
  // ── B · a cena de uma seção só nasce da descrição da sua seção (promptsDeCenaInteira); a fundida segue pelo A1 ──
  const C = load('@/lib/cinematic/cenaKling4.ts'), STYLE = { look: 'photoreal', suffix: '', lookPhrase: 'photorealistic, ultra-detailed' }
  for (const f of filmes.slice(0, 4)) {
    const base = secoesDe(load, f)
    const prompts = f.cenas.map((c, i) => C.promptDaCenaKling4(c, STYLE, i, true)), falas = f.grupos.map((g) => g.map((j) => base[j].voiceover).join(' '))
    const com = L.promptsDeCenaInteira(prompts, base.map((s, j) => ({ ...s, descricao: `The described subject acts in section ${j + 1} of this film clearly` })), falas)
    f.grupos.forEach((g, i) => {
      if (g.length === 1) no(!com[i].includes(`section ${g[0] + 1} of this film clearly`) || !/no readable text/.test(com[i]), `B1 ${f.gen} cena ${i + 1}: a cena de uma seção só nasce da descrição dela, com a proteção`)
      else no(com[i] !== prompts[i], `B2 ${f.gen} cena ${i + 1}: a cena fundida não muda aqui (o A1 faz as metades)`)
    })
    no(JSON.stringify(L.promptsDeCenaInteira(prompts, base, falas)) !== JSON.stringify(prompts), `B3 ${f.gen}: sem descrição, os prompts de sempre`)
    no(JSON.stringify(L.promptsDeCenaInteira(prompts, base.map((s) => ({ ...s, descricao: 'The griffin soars above the clouds at dawn' })), falas.map((x) => x + ' outra fala'))) !== JSON.stringify(prompts), `B4 ${f.gen}: fala que não casa com as seções = nada (nunca adivinha)`)
  }
  // ── C · o descritor REAL (extraído da rota) ──
  let gen
  try { gen = descritor(over, null) } catch (e) { return [...p, `C0 o descritor não transpila: ${e.message}`] }
  const f0 = filmes[0], sec0 = L.secoesParaODescritor(secoesDe(load, f0))
  let oa = fake(); gen = descritor(over, oa)
  await gen(sec0, f0.roteiro, POL, undefined, null, true)
  no(oa.calls[0]?.model !== 'gpt-4o-mini' || /KINEO-PLANO-DA-FALA-1911/.test(oa.calls[0]?.messages[0].content) || /A reviewer rejected/.test(oa.calls[0]?.messages[1].content), 'C1 sem o A2: gpt-4o-mini, sem regra por seção, sem nota (o de sempre)')
  oa = fake(); gen = descritor(over, oa)
  await gen(sec0, f0.roteiro, POL, undefined, null, true, true, L.MODELO_DO_DESCRITOR_FORTE)
  no(oa.calls[0]?.model !== 'gpt-4o' || !/KINEO-PLANO-DA-FALA-1911/.test(oa.calls[0]?.messages[0].content), 'C2 com o A2: gpt-4o e a regra por seção')
  const tamanho = oa.calls[0] ? oa.calls[0].messages.reduce((n, m) => n + m.content.length, 0) : 0
  oa = fake(); gen = descritor(over, oa)
  await gen(sec0.slice(1, 2), `${f0.roteiro}\n\n${nota}`, POL, { numeros: [2], total: sec0.length }, null, true, true, L.MODELO_DO_DESCRITOR_FORTE)
  no(!oa.calls[0]?.messages[1].content.includes(nota) || !/These are scenes 2 of a 4-scene film/.test(oa.calls[0]?.messages[1].content) || (oa.calls[0]?.messages[1].content.match(/^Scene \d+:/gm) ?? []).length !== 1, 'C3 a reescrita: só a seção reprovada, com a nota do juiz junto do Topic')
  // ── D · a ligação na rota ──
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes("const kling4DescritorForte1911 = kling4TrialCandidate && verbatim && planoDaFalaLigado(KLING4_DESCRITOR_FORTE_1911, isDryRunAccount(user.email)) && parsedScript.segments.length >= scenes.length && parsedScript.segments.length <= 5"), 'D1 o A2: só o Kling 4 grátis literal, pelo interruptor')
  no(!rota.includes('true, true, kling4DescritorForte1911 ? MODELO_DO_DESCRITOR_FORTE : undefined, (u) => { usosDoDescritorA2.push(u) })'), 'D2 a chamada por seção usa o modelo forte só com o A2 (e mede os tokens)')
  no(!rota.includes("if (kling4DescritorForte1911 && descricoesDasSecoesK4) promptsDeCenaInteira(kling4PromptsDasCenas1911, parsedScript.segments, scenes.map((s) => s.voiceover ?? '')).forEach((p, i) => { kling4Prompts[i] = p })"), 'D3 no A2 a cena de uma seção só nasce da sua descrição')
  no(!rota.includes('const kling4PromptsDasCenas1911 = [...kling4Prompts]') || (rota.match(/promptsDeCenaInteira\(kling4PromptsDasCenas1911,/g) ?? []).length !== 3, 'D4 a reescrita parte sempre dos prompts originais das cenas (e refaz depois da reescrita e da ficha reprovada, KINEO-FICHA-REPROVADA-1911)')
  const iEnvio = rota.indexOf('const kling4EnvioDoFilme = () =>'), iJuiz = rota.indexOf('revisarA2DoFilme(false, sujeitoA21911)') /* [revisor 19/11] reancorado: a revisão agora corre dentro do prazo */, iPago = rota.indexOf('kling4Trial = await orchestrateKling4Trial({')
  no(!(iEnvio > 0 && iJuiz > iEnvio && iPago > iJuiz), 'D5 o juiz do A2 roda depois de montar os planos e ANTES da reserva e do POST pago')
  const bloco = rota.slice(iJuiz, iPago)
  no(!rota.includes('A2_TETO_DO_JUIZ_MS)\n    const reescreverA2') || !rota.includes('nSecoes: parsedScript.segments.length, rejulgar, julgar: julgarA2, nomes: (planos) => planosComNomeProprio(planos, { hoje: hojeDoNome1911(), pedido:') || !rota.includes('`${topicoDoDescritorA2(body.original_idea, prompt)}\\n\\n${nota}`, classicVisualPolicy, { numeros: alvo.map((j) => j + 1), total: parsedScript.segments.length }'), 'D6 o juiz tem teto; revisão única (juiz + nome próprio); só as seções apontadas reescritas, pelo modelo forte, com a nota junto do Topic')
  no(!/catch \(err\) \{ voltaAoHoje1911\([^;]*\); console\.warn\('\[cinematic\] KINEO-DESCRITOR-FORTE-1911/.test(bloco), 'D7 erro no juiz ou na reescrita não derruba o filme: volta ao caminho de hoje (revisor 19/11: antes seguia com os planos meio revistos)')
  // ── E · o ensaio pelo dry_run, nome próprio, Topic, custo e 'internal' só para a casa ──
  const iDry = rota.indexOf('const a2Ensaio1911 = kling4DescritorForte1911 && descricoesDasSecoesK4 && motor1411.kling4 ?'), iRef = rota.indexOf("const refunded = await releaseBirthClaim('dry_run_no_charge')")
  no(!(iDry > 0 && iRef > iDry && rota.includes('...(a2Ensaio1911 ? { a2_ensaio: a2Ensaio1911 } : {}),')), 'E1 o dry_run devolve o ensaio do A2 (antes de liberar o crédito, sem POST)')
  const dry = rota.slice(iDry, iRef)
  no(/submitKling4TrialVideo|reserveKling4Trial|fal\.run|generateStill|orchestrateKling4Trial/.test(dry), 'E2 o ensaio não chama a fal, não reserva nem compra nada')
  // [revisor 19/11, 3ª volta] o eco nunca derruba o dry_run (erro vira campo) e não grava evento nenhum (o texto dos planos fica só na resposta da conta do ensaio)
  no(!dry.includes('})().catch((e) => ({ erro: String(e instanceof Error ? e.message : e).slice(0, 160) })) : null'), 'E21 erro no eco vira { erro } e o dry_run responde')
  no(/writeServerEvent|writeEvent\(|trackEvent|\.from\(['"]events['"]\)/.test(dry), 'E22 o eco não grava evento (nenhum texto de plano sai da resposta)')
  // [revisor 19/11, 3ª volta] a montagem do envio é DEFINIDA antes do dry_run: executa o kling4PorSecao da rota com a descrição posta nas seções DEPOIS da
  // definição (como a rota faz) — uma cópia das seções na definição faria o A1/A2 da casa perder a descrição sem ninguém notar
  { const rr = over[ROTA] ?? read(ROTA)
    const ini = rr.lastIndexOf('\n', rr.indexOf('const kling4PorSecao = (a:')) + 1, fim = rr.indexOf('    const kling4EnvioDoFilme', ini)
    let porSecao = null
    try {
      const js = ts.transpile(rr.slice(ini, fim) + '\nreturn kling4PorSecao', { target: ts.ScriptTarget.ES2022 })
      const cues = ['A boy finds a map in the attic', 'He follows it into the forest', 'A red door waits between two oaks', 'Behind it, his grandfather smiles']
      const parsedScript = { segments: cues.map((c) => ({ voiceover: `${c}.`, pexelsQuery: c })) }
      const scope = { papelVisual2411: null, epocaVisual: null, parsedScript, scenes: [{ description: 'a' }, { description: 'b' }, { description: 'c' }], verbatim: true, kling4PlanoPorSecao: true, kling4PlanoVariado: false, kling4PlanoFinal: false,
        planosPorSecao: Q.planosPorSecao, sujeitoAparenciaLigada: () => false, kling4Sujeito: { r: null }, comSujeitoNasMetades: (x) => x, comSuperficieNoPlano: (x) => x, garantirSujeitoNoUltimo1911: () => {} }
      const fn = Function(...Object.keys(scope), js)(...Object.values(scope))
      parsedScript.segments.forEach((s, j) => { Object.assign(s, { descricao: `DESCRICAO-DA-SECAO-${j + 1}: a boy with a lantern walks under tall oaks` }) })
      const r = fn({ prompts: ['First scene.', 'Second scene.', 'Last scene.'], approvedStills: [null, null, null], timing: { voiceovers: [`${cues[0]}.`, `${cues[1]}. ${cues[2]}.`, `${cues[3]}.`], wordsPerSecond: 2.5 } })
      porSecao = r.prompts.join(' | ')
    } catch (e) { porSecao = `erro: ${e.message}` }
    no(!/DESCRICAO-DA-SECAO-[23]/.test(porSecao ?? ''), `E23 a descrição posta DEPOIS da definição chega aos planos (a montagem lê as seções na hora da chamada) (${String(porSecao).slice(0, 160)})`) }
  no(!dry.includes('hoje: { planos: hoje.planos, juiz: vHoje }, novo: { planos: novo.planos, juiz: r.veredito }') || !dry.includes('rejulgar: true') || !dry.includes('custo: { descritor, juiz_usd') || !dry.includes('ms: { espera_do_descritor: esperaMs'), 'E3 hoje × novo, juiz dos dois, reescrita e juiz final, tempos e custo medido')
  no(!dry.includes('const hoje = await montar(parsedScript.segments.map((x) => ({ voiceover: x.voiceover, pexelsQuery: x.pexelsQuery })))'), 'E4 o HOJE é o montador de sempre (sem descrição por seção)')
  // [revisor 19/11, 2ª volta, item 2] o eco mostra o que IRIA à fal: o MESMO kling4PorSecao do envio e o injetor do sujeito do submit, nos dois lados
  no(!dry.includes('const e = kling4PorSecao({ prompts: ps, approvedStills: stills, timing: timingDoEco })') || !dry.includes('buildKling4TrialInput(e.prompts, e.approvedStills, e.timing)') || /planosPorSecao\(|comSuperficieNoPlano\(|planosComEscalaVariada\(/.test(dry), 'E16 o eco monta pelo kling4PorSecao do envio (sem montador próprio)')
  { const argsEnvio = (rota.match(/const kling4PedidoSujeito = kling4TrialCandidate && !desenhoInfantil\.ativo \? (pedidoOriginalDoSujeito(?:1911)?\(\{.*?)falas: kling4Timing\.voiceovers \}\)/) ?? [])[1] // o mesmo chamador do envio (com o portão do B1(a), o wrapper)
    no(!argsEnvio || !dry.includes(`const pedidoDoSujeitoEco = kling4TrialCandidate && !desenhoInfantil.ativo ? ${argsEnvio}falas: falasCena })`) || !dry.includes('const leituraDoEco = leituraPronta1311()') || !dry.includes('const rs = pedidoDoSujeitoEco ? await sujeitoNoKling4({ pedido: pedidoDoSujeitoEco, falas: falasCena, prompts: ps, stills, pessoaPermitida: !romanceAdulto.ativo }, leituraDoEco)') || !dry.includes('kling4Sujeito.r = rs'), 'E17 o eco aplica o sujeito do submit (mesmo pedido, mesma chamada), também nas metades') }
  { const iDef = rota.indexOf('    const kling4PorSecao = (a: {'), iD = rota.indexOf('    if (body.dry_run === true && isDryRunAccount(user.email)) {'), iFlags = ['    const kling4Sujeito: {', '    const kling4PlanoPorSecao = ', '    const kling4PlanoFinal = ', '    const kling4PlanoVariado = '].map((x) => rota.indexOf(x))
    no(!(iDef > 0 && iD > iDef && iFlags.every((i) => i > 0 && i < iDef)), 'E18 a montagem do envio é definida antes do dry_run (o eco e o envio usam a mesma)') }
  no(!dry.includes("timingDoEco.pelaVoz = { segundosDaVoz: k4EnsaioRelato.fala_segundos }") || !dry.includes('timingDoEco.fixedCharacter = reference') || !dry.includes('timingDoEco.clipSeconds = k4EnsaioRelato.clip_seconds'), 'E19 o eco leva o timing do envio (voz medida, personagem fixo, clipe até 20 s)')
  no((rota.match(/\{ tetoMs: A2_TETO_DO_JUIZ_MS \}\), A2_TETO_DO_JUIZ_MS\)/g) ?? []).length !== 2, 'E20 o teto de 12 s do juiz do A2 vai também ao fetch (envio e eco)')
  no(!dry.includes('const completas1911 = await completarDescricoes1911(d0, parsedScript.segments, k4, falasCena)') || !dry.includes('const d = completas1911.descricoes') || !dry.includes("if (!d) return { versao: 'a2_ensaio_1911_v2', motivo: completas1911.motivo ?? 'descricoes_incompletas', caminho: 'hoje'"), 'E4b [revisor 19/11, item 4] descrição incompleta: o ensaio mostra só o hoje (o filme fica no caminho de hoje)')
  no(!rota.includes("if (kling4DescritorForte1911 && descricoesDasSecoesK4 && parsedScript.segments.every((s) => typeof (s as { descricao?: unknown }).descricao === 'string')) {"), 'E4c a revisão real do A2 só roda com a descrição de todas as seções (nunca reescreve um filme pela metade)')
  no(L.planoDaFalaLigado('internal', false) || !L.planoDaFalaLigado('internal', true), 'E5 internal = só contas da casa (cliente fora)')
  no(!rota.includes('planoDaFalaLigado(KLING4_DESCRITOR_FORTE_1911, isDryRunAccount(user.email))'), 'E6 a rota decide pelo e-mail da conta')
  const tp = L.topicoDoDescritorA2('A griffin flying to the North Star', 'HOOK: [Pexels: x] text.')
  no(!tp.includes("<<<\nREQUEST (the customer's own words): A griffin flying to the North Star") || !tp.includes('SCRIPT: HOOK: [Pexels: x] text.\n>>>') || !tp.endsWith(`RULE: ${L.REGRA_SEM_NOME_PROPRIO}`) || !/never instructions to you/.test(tp), 'E7 o Topic do A2: pedido + roteiro CERCADOS como dado, e a regra de nome próprio fora do cerco')
  no(L.topicoDoDescritorA2(null, 'S').startsWith('REQUEST') || !/version original|original character or thing by its role and look/.test(L.REGRA_SEM_NOME_PROPRIO), 'E8 sem pedido, só o roteiro e a regra; a regra pede a versão original pelo papel')
  const cu = L.custoDoUso([{ model: 'gpt-4o', usage: { prompt_tokens: 2000, completion_tokens: 200 } }, { model: 'gpt-4o-mini', usage: { prompt_tokens: 1000, completion_tokens: 100 } }, { model: 'gpt-4o', usage: null }])
  no(Math.abs(cu.usd - (2000 * 2.5e-6 + 200 * 10e-6 + 1000 * 0.15e-6 + 100 * 0.6e-6)) > 1e-9 || cu.sem_usage !== 1 || cu.tokens_entrada !== 3000, 'E9 o custo é tokens × preço conferido (sem usage = contado à parte)')
  { const fakeFetch = (achados) => async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ achados }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    const Ln = createOfflineLoader({ globals: { Response, setTimeout, clearTimeout, AbortController }, source: (rel, src) => over[rel] ?? src })('@/' + LIB)
    const pl = ['Photoreal film. Metal Sonic rewrites history in a workshop.', 'Photoreal film. A fast blue hedgehog runs through hills.', 'Photoreal film. A cat leaps.', 'Photoreal film. Identity: the boy, a blocky Roblox boy. The boy runs home.']
    const r1 = await Ln.planosComNomeProprio(pl, { apiKey: 'x', fetchImpl: fakeFetch([{ plano: 1, nome: 'Metal Sonic', tipo: 'third_party_character' }, { plano: 2, nome: 'Sonic', tipo: 'third_party_character' }, { plano: 3, nome: 'Garfield', tipo: 'third_party_character' }, { plano: 4, nome: 'Roblox', tipo: 'third_party_brand' }]) })
    no(JSON.stringify(r1) !== '[0]', `E10 nome próprio só com a citação presente no texto do plano (inventado = descartado) (${JSON.stringify(r1)})`)
    no((await Ln.planosComNomeProprio(pl, { apiKey: 'x', fetchImpl: async () => { throw new Error('x') } })) !== null, 'E11 [revisor 19/11, condição 4] falha da pergunta = null (sem checagem: o plano volta ao texto de hoje), nunca "nenhum nome"') }
  { const chamadas = []; let seg = ['a', 'b', 'c', 'd']
    const r = await L.revisarPlanosA2({ planos: () => seg.map((x) => `plano ${x}`), falas: () => seg, nSecoes: 4, rejulgar: true,
      julgar: async (p) => { chamadas.push(['juiz', p.join('|')]); return chamadas.filter((c) => c[0] === 'juiz').length === 1 ? { status: 'JUDGED', falhas: ['d_sujeito'], cenas_reescreveria: [2], d_sujeito: 'x' } : { status: 'JUDGED', falhas: [], cenas_reescreveria: [] } },
      nomes: async () => [3], reescrever: async (alvo, nota) => { chamadas.push(['reescreve', alvo.join(','), nota]); seg = seg.map((x, j) => (alvo.includes(j) ? x + '2' : x)) } })
    no(JSON.stringify(r.reescritas) !== '[2,4]' || chamadas.filter((c) => c[0] === 'reescreve').length !== 1 || !/Also remove every brand/.test(chamadas.find((c) => c[0] === 'reescreve')?.[2] ?? ''), `E12 revisão: juiz + nome próprio, UMA reescrita só das seções apontadas, com a nota (${JSON.stringify(r.reescritas)})`)
    no(!r.vereditoFinal || chamadas.filter((c) => c[0] === 'juiz').length !== 2 || !chamadas[chamadas.length - 1][1].includes('plano b2'), 'E13 o ensaio julga de novo depois da reescrita')
    const semFalha = await L.revisarPlanosA2({ planos: () => ['p'], falas: () => ['f'], nSecoes: 1, rejulgar: false, julgar: async () => ({ status: 'JUDGED', falhas: [] }), nomes: async () => [], reescrever: async () => { throw new Error('não devia reescrever') } })
    no(semFalha.reescritas.length || semFalha.vereditoFinal !== null, 'E14 sem falha nem nome: nada reescrito, nada rejulgado')
    const quebra = await L.revisarPlanosA2({ planos: () => ['p'], falas: () => ['f'], nSecoes: 1, rejulgar: false, julgar: async () => { throw new Error('x') }, nomes: async () => { throw new Error('y') }, reescrever: async () => {} })
    no(quebra.veredito !== null || quebra.nomes.length, 'E15 erro do juiz ou da pergunta = peça vazia, nunca lança') }
  no(!rota.includes("model: modelo ?? 'gpt-4o-mini',"), 'D9 sem modelo = gpt-4o-mini, como sempre')
  { const ev = over[EVT] ?? read(EVT), i0 = ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), lista = i0 >= 0 ? ev.slice(i0, ev.indexOf('])', i0)) : ''
    no(!/^\s*'kling4_descritor_forte',/m.test(lista) || !ev.includes('if (SERVER_ONLY_EVENTS.has(name)) {'), 'D10 o evento do A2 é só do servidor (linha viva na lista SERVER_ONLY_EVENTS)') }
  no(!rota.includes("void writeServerEvent({ name: A2_EVENTO, userId: user.id, path: '/api/generate-video-cinematic', sessionId: generationId, metadata: { generation_id: generationId, juiz: (rA2.veredito as JuizPlanoVeredito | null)?.status ?? null, reprovado: (rA2.veredito as JuizPlanoVeredito | null)?.reprovado ?? null, falhas: (rA2.veredito as JuizPlanoVeredito | null)?.falhas ?? [], nomes: rA2.nomes.map((p) => p + 1), reescritas: rastro1911?.caminho === 'hoje' ? [] : rA2.reescritas, reescritas_descartadas: rastro1911?.caminho === 'hoje' ? rA2.reescritas : [], caminho: rastro1911?.caminho ?? null, ms: rA2.ms, /* [revisor 19/11, D4] no caminho de hoje, as reescritas não foram ao motor */ ultimo_sem_sujeito: rA2.ultimo_sem_sujeito ?? false, nomes_depois: rA2.nomes_depois ?? [] } }).catch(() => false)"), /* reancorado (D4): + o caminho e as reescritas descartadas, posições e nenhum texto */ 'D11 o evento do A2 grava só veredito, posições, caminho e tempo (nunca texto do plano nem do cliente)')
  return { p, tamanho }
}

const MUT = [
  ['A2 público', LIB, (s) => s.replace("KLING4_DESCRITOR_FORTE_1911: ModoPlanoDaFala = 'sem_ficha'", "KLING4_DESCRITOR_FORTE_1911: ModoPlanoDaFala = 'public'")], // [CEO 20/11] reancorado: o commit está em 'sem_ficha'
  ['A1 público', LIB, (s) => s.replace("KLING4_PLANO_DA_FALA_1911: ModoPlanoDaFala = 'sem_ficha'", "KLING4_PLANO_DA_FALA_1911: ModoPlanoDaFala = 'public'")],
  ['rota: A2 para todos', ROTA, (s) => s.replace('planoDaFalaLigado(KLING4_DESCRITOR_FORTE_1911, isDryRunAccount(user.email))', 'planoDaFalaLigado(KLING4_DESCRITOR_FORTE_1911, true)')],
  ['rota: A1 para todos', ROTA, (s) => s.replace('planoDaFalaLigado(KLING4_PLANO_DA_FALA_1911, isDryRunAccount(user.email))', 'planoDaFalaLigado(KLING4_PLANO_DA_FALA_1911, true)')],
  ['porta larga: A2 pela régua da casa', ROTA, (s) => s.replace('planoDaFalaLigado(KLING4_DESCRITOR_FORTE_1911, isDryRunAccount(user.email))', 'planoDaFalaLigado(KLING4_DESCRITOR_FORTE_1911, isInternalEmail(user.email))')],
  ['porta larga: A1 pela régua da casa', ROTA, (s) => s.replace('planoDaFalaLigado(KLING4_PLANO_DA_FALA_1911, isDryRunAccount(user.email))', 'planoDaFalaLigado(KLING4_PLANO_DA_FALA_1911, isInternalEmail(user.email))')],
  ['evento sai da lista só-servidor', EVT, (s) => s.replace("  'kling4_descritor_forte', // KINEO-DESCRITOR-FORTE-1911", "  // 'kling4_descritor_forte', // KINEO-DESCRITOR-FORTE-1911")],
  ['evento grava o texto dos planos', ROTA, (s) => s.replace('nomes_depois: rA2.nomes_depois ?? [] } })', 'nomes_depois: rA2.nomes_depois ?? [], planos: kling4Prompts, pedido: body.original_idea } })')],
  ['eco sem o sujeito', ROTA, (s) => s.replace('const rs = pedidoDoSujeitoEco ? await sujeitoNoKling4(', 'const rs = false ? await sujeitoNoKling4(')],
  ['eco com montador próprio', ROTA, (s) => s.replace('const e = kling4PorSecao({ prompts: ps, approvedStills: stills, timing: timingDoEco })', 'const e = { prompts: ps, approvedStills: stills, timing: timingDoEco }')],
  ['eco sem a voz medida', ROTA, (s) => s.replace('timingDoEco.pelaVoz = { segundosDaVoz: k4EnsaioRelato.fala_segundos }', 'void 0')],
  ['juiz do A2 sem teto no fetch', ROTA, (s) => s.replace("seconds: duration }, { tetoMs: A2_TETO_DO_JUIZ_MS }), A2_TETO_DO_JUIZ_MS)\n    const reescreverA2", "seconds: duration }), A2_TETO_DO_JUIZ_MS)\n    const reescreverA2")],
  ['juiz sem veredito reescreve', LIB, (s) => s.replace("  if (!v || v.status !== 'JUDGED') return [...alvo]", '  if (!v) return [...alvo]')],
  ['qualquer falha reescreve', LIB, (s) => s.replace("const falhas = (v.falhas ?? []).filter((f) => FALHAS_QUE_REESCREVEM.includes(f) && !(f === 'd_sujeito' && sujeitoDoJuizEscrito(v, extra.planos)) && !(f === 'a_ficha' && apontados.length >= nSecoes))", 'const falhas = [...(v.falhas ?? [])]')],
  ['final fraco não reescreve o fim', LIB, (s) => s.replace("if (falhas.includes('e_final')) alvo.add(nSecoes - 1)", '')],
  ['cena inteira sem a descrição', LIB, (s) => s.replace("g[i].length === 1 && typeof secoes[g[i][0]].descricao === 'string' ? promptDaSecao(p, secoes[g[i][0]]) : p", 'p')],
  ['cena fundida reescrita aqui', LIB, (s) => s.replace("g[i].length === 1 && typeof secoes[g[i][0]].descricao === 'string'", "typeof secoes[g[i][0]].descricao === 'string'")],
  ['mapa adivinhado', LIB, (s) => s.replace('if (!g || g.length !== promptsDasCenas.length) return [...promptsDasCenas]', 'if (!g) return promptsDasCenas.map((p, i) => promptDaSecao(p, secoes[i] ?? secoes[0]))')],
  ['rota: cena inteira não nasce da seção', ROTA, (s) => s.replace("if (kling4DescritorForte1911 && descricoesDasSecoesK4) promptsDeCenaInteira(kling4PromptsDasCenas1911,", 'if (false) promptsDeCenaInteira(kling4PromptsDasCenas1911,')],
  ['rota: sem o modelo forte', ROTA, (s) => s.replaceAll('true, true, kling4DescritorForte1911 ? MODELO_DO_DESCRITOR_FORTE : undefined, (u) =>', 'true, true, undefined, (u) =>')],
  ['rota: modelo forte sempre', ROTA, (s) => s.replace("model: modelo ?? 'gpt-4o-mini',", "model: 'gpt-4o',")],
  ['rota: reescrita sem a nota', ROTA, (s) => s.replace('`${topicoDoDescritorA2(body.original_idea, prompt)}\\n\\n${nota}`, classicVisualPolicy, { numeros: alvo.map((j) => j + 1), total: parsedScript.segments.length }', 'prompt, classicVisualPolicy, { numeros: alvo.map((j) => j + 1), total: parsedScript.segments.length }')],
  ['rota: sem a checagem de nome próprio', ROTA, (s) => s.replace('nomes: (planos) => planosComNomeProprio(planos, { hoje:', 'nomes: async () => [], _x: (planos) => planosComNomeProprio(planos, { hoje:')],
  ['rota: ensaio sem rejulgar', ROTA, (s) => s.replace('nSecoes: secoes.length, rejulgar: true, julgar,', 'nSecoes: secoes.length, rejulgar: false, julgar,')],
  ['rota: hoje com a descrição', ROTA, (s) => s.replace('const hoje = await montar(parsedScript.segments.map((x) => ({ voiceover: x.voiceover, pexelsQuery: x.pexelsQuery })))', 'const hoje = await montar(parsedScript.segments.map((x) => ({ voiceover: x.voiceover, pexelsQuery: x.pexelsQuery, descricao: x.pexelsQuery })))')],
  ['lib: nome sem conferir a citação', LIB, (s) => s.replace('  if (!re.test(acaoDoPlano(plano))) return false\n', '')],
  ['lib: revisão reescreve duas vezes', LIB, (s) => s.replace('if (a.rejulgar) vf = await cronometro', "if (a.rejulgar) await a.reescrever(alvo, ''); if (a.rejulgar) vf = await cronometro")],
  ['lib: nome sem a nota', LIB, (s) => s.replace('${comNome.length ? ` ${NOTA_DO_NOME_PROPRIO}` : \'\'}', '')],
  ['rota: ensaio aceita descrição incompleta', ROTA, (s) => s.replace('const d = completas1911.descricoes', 'const d = d0 as string[]')],
  ['rota: revisão com descrição incompleta', ROTA, (s) => s.replace(" && parsedScript.segments.every((s) => typeof (s as { descricao?: unknown }).descricao === 'string')) {", ') {')],
  ['eco sem o catch', ROTA, (s) => s.replace('})().catch((e) => ({ erro: String(e instanceof Error ? e.message : e).slice(0, 160) })) : null', '})() : null')],
  ['eco grava evento com os planos', ROTA, (s) => s.replace('        const juizes = [vHoje, r.veredito, r.vereditoFinal, vInjetado] as Array<JuizPlanoVeredito | null>', '        void writeServerEvent({ name: A2_EVENTO, userId: user.id, path: \'/x\', sessionId: generationId, metadata: { planos: atual.planos } })\n        const juizes = [vHoje, r.veredito, r.vereditoFinal, vInjetado] as Array<JuizPlanoVeredito | null>')],
  ['seções copiadas na definição', ROTA, (s) => s.replace('    const kling4PorSecao = (a: {', '    const secoesNaDefinicao1911 = parsedScript.segments.map((x) => ({ ...x })); const kling4PorSecao = (a: {').replace('secoes: parsedScript.segments, objetoConcreto: kling4PlanoVariado })', 'secoes: secoesNaDefinicao1911, objetoConcreto: kling4PlanoVariado })')],
  ['lib: preço errado', LIB, (s) => s.replace("'gpt-4o': { entrada: 2.5e-6, saida: 10e-6 }", "'gpt-4o': { entrada: 0.15e-6, saida: 0.6e-6 }")],
  ['lib: internal para todos', LIB, (s) => s.replace("return modo === 'public' || modo === 'sem_ficha' || (modo === 'internal' && contaDaCasa === true)", "return modo === 'public' || modo === 'sem_ficha' || modo === 'internal'")],
]

const r0 = await prova()
if (r0.p.length) { console.error('FAIL test-descritor-forte-1911:\n  ' + r0.p.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) {
  const orig = read(arq), mut = f(orig)
  if (mut === orig) { vivos.push(`${nome} (não pegou a fonte)`); continue }
  if (!(await prova({ [arq]: mut })).p.length) vivos.push(nome)
}
if (vivos.length) { console.error('FAIL test-descritor-forte-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
const tokIn = Math.ceil(r0.tamanho / 4), tokOut = 4 * 40
const porChamada = tokIn * PRECO['gpt-4o'].in + tokOut * PRECO['gpt-4o'].out
console.log(`PASS test-descritor-forte-1911 (${MUT.length} mutantes mortos)`)
console.log(`custo medido no pedido REAL do filme ${filmes[0].gen}: ~${tokIn} tokens de entrada e ~${tokOut} de saída → US$ ${porChamada.toFixed(4)} por chamada gpt-4o (preço conferido 19/11); A2 por filme com juiz e reescrita em ~1/4: ~US$ ${(porChamada + JUIZ_USD_MEDIO + porChamada * 0.6 * 0.25).toFixed(4)}`)
