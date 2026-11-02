// KINEO-SEM-INICIO-AUTOMATICO-0211 — guardião: depois de pagar, NADA começa sozinho; o filme sai no clique.
// [TRAVA 8.2 — aval permanente do fundador (proteção do cliente) 02/11]
//
// Caso real (manobiayousaf, Creator, 01/11): card_entry_resume_restored duration 35 às 13:16:15 →
// card_entry_resume_autostart duration 60 às 13:16:17 → Seedance de 60 s começou sozinho e debitou 35 cr.
//
// Prova, lendo e EXECUTANDO os trechos reais do GenerateClient (nunca uma cópia da regra):
//   A. restauração sem autostart — o efeito que disparava agora só mede; nenhum caminho do resume chama o render;
//      card_entry_resume_autostart deixou de ser emitido;
//   B. duração preservada — o rascunho devolve 15/30/35/45/60/90 exatos; o ramo de defaults do fetchCredits
//      (a causa do 35 → 60) não toca motor/duração quando houve restauração, e sem restauração ainda daria 60;
//   C. o clique dispara o render — confirmarPedidoRestaurado / confirmarPrimeiroFilme chamam o render UMA vez,
//      registram card_entry_resume_confirmed / activation_autostart_confirmed, e só existem atrás de onClick;
//   D. os outros caminhos — activation_autostart (create_intent) segura o 1º filme que custa crédito; /create?autostart
//      não gera mais; Studio só grava o token do 1 clique no clique; /checkout/success sem cards de tema nem OAuth
//      automático; o painel conta a confirmação.
// Rodar: npx tsx scripts/test-sem-inicio-automatico-0211.mts   (sem rede, sem custo)
import fs from 'node:fs'
import ts from 'typescript'
import {
  ACTIVATION_AUTOSTART_CONFIRMED_EVENT,
  ACTIVATION_AUTOSTART_HELD_EVENT,
  CARD_ENTRY_RESUME_CONFIRMED_EVENT,
  START_MY_FILM_CTA,
  defaultsDoPlanoPodemMexer,
  estadoDoPedidoRestaurado,
  inicioAutomaticoPedeClique,
  motorDoPedido,
  resumoDoPedido,
} from '../lib/growth/semInicioAutomatico'
import { readCardEntryDraft, serializeCardEntryDraft } from '../lib/growth/cardEntryResumeDraft'
import { duracaoDaUrlNaEntrada } from '../lib/growth/entradaSeedance15'
import { creditCostForDuration } from '../lib/credits/engineCost'
import { CHECKOUT_SUCCESS_TOPIC_CARDS_ENABLED } from '../lib/growth/checkoutSuccessFirstFilm'
import { CHECKOUT_OAUTH_AUTOSTART_ENABLED } from '../lib/growth/checkoutOauthAutostart'
import { funilVersaoB } from '../lib/admin/versaoBFunnel'

let ok = 0
const falhas: string[] = []
function checa(nome: string, cond: unknown) {
  if (cond) { ok++; console.log('  ok  ' + nome) } else { falhas.push(nome); console.log('  XX  ' + nome) }
}
const lf = (t: string) => t.replace(/\r\n/g, '\n')
const rd = (p: string) => lf(fs.readFileSync(p, 'utf8'))
const GC = rd('app/(dashboard)/generate/GenerateClient.tsx')
const semComentarios = (t: string) => t.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')

/** Trecho entre dois marcadores (o primeiro incluído). Falha alto se não achar — guardião cego não serve. */
function trecho(src: string, inicio: string, fim: string, de = 0): string {
  const a = src.indexOf(inicio, de)
  if (a < 0) throw Error('marcador ausente: ' + inicio.slice(0, 80))
  const b = src.indexOf(fim, a + inicio.length)
  if (b < 0) throw Error('fim ausente depois de: ' + inicio.slice(0, 80))
  return src.slice(a, b)
}
const js = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
function roda(code: string, env: Record<string, unknown>) {
  const nomes = Object.keys(env)
  return new Function(...nomes, js(code))(...nomes.map((n) => env[n]))
}
const custoSeedance = (s: number) => creditCostForDuration('cinematic_ai', true, s)

// ─────────────────────────────────────────────────────────────────────────────
console.log('== A. restauração sem autostart ==')
{
  checa('A1 card_entry_resume_autostart não é mais emitido (só sobra em comentário/histórico)', !/trackEvent\(\s*'card_entry_resume_autostart'/.test(GC) && !semComentarios(GC).includes("'card_entry_resume_autostart'"))
  const restauracao = trecho(GC, "if (searchParams?.get('resume') !== 'card_entry') return", '}, [])')
  checa('A2 a restauração do card_entry não chama render nem análise', !/handleGenerate|handleAnalyze/.test(restauracao))
  checa('A3 a restauração liga o cartão (setResumeAguardandoClique) e marca a escolha restaurada', restauracao.includes('setResumeAguardandoClique(draft.fresh)') && restauracao.includes('escolhaRestauradaRef.current = true'))
  const wall = trecho(GC, "if (searchParams?.get('resume') !== 'wall_v1') return\n    if (wallV1ResumeRanRef.current) return", '}, [])')
  checa('A4 a restauração do wall_v1 também marca a escolha restaurada e não gera', wall.includes('escolhaRestauradaRef.current = true') && !/handleGenerate|handleAnalyze/.test(wall))

  // O efeito que DISPARAVA: executado de verdade com saldo que paga e texto pronto — nada pode sair dele.
  const corpo = trecho(GC, '    if (!resumeArmedRef.current || !resumeAguardandoClique) return', '  }, [credits, prompt, quality, duration, phase, mode, aiEngine, resumeAguardandoClique])')
  checa('A5 o efeito do resume não contém chamada de render', !/handleGenerate|handleAnalyze/.test(semComentarios(corpo)))
  const eventos: Array<[string, unknown]> = []
  let renders = 0
  const env = (outOfCreditsResp: boolean, aguardando = true) => ({
    resumeArmedRef: { current: true }, resumeAguardandoClique: aguardando, credits: 165, prompt: 'What NASA found on Mars they never announced',
    phase: 'idle', isProcessingPhase: (p: string) => p !== 'idle' && p !== 'options' && p !== 'done' && p !== 'failed',
    outOfCredits: () => outOfCreditsResp, resumeBlockedReportedRef: { current: false },
    trackEvent: (n: string, m: unknown) => { eventos.push([n, m]) }, quality: 'cinematic_ai', duration: 35, mode: 'cinematic_ai', aiEngine: 'seedance',
    handleGenerateGuarded: () => { renders++ }, handleGenerate: () => { renders++ }, sessionStorage: { removeItem() {}, setItem() {}, getItem() { return null } },
  })
  roda(corpo, env(false))
  checa('A6 saldo que paga + texto pronto + crédito lido: o efeito NÃO dispara render nem evento de autostart', renders === 0 && !eventos.some(([n]) => n.includes('autostart')))
  roda(corpo, env(true))
  checa('A7 saldo que não paga: só registra card_entry_resume_blocked, sem render', renders === 0 && eventos.some(([n]) => n === 'card_entry_resume_blocked'))

  // Estado do cartão: nunca existe a saída "disparar".
  const estados = new Set<string>()
  for (const restaurado of [true, false]) for (const confirmado of [true, false]) for (const temTexto of [true, false]) for (const processando of [true, false]) for (const credits of [null, 0, 165]) for (const outOfCredits of [true, false]) {
    estados.add(estadoDoPedidoRestaurado({ restaurado, confirmado, temTexto, processando, credits, outOfCredits }))
  }
  checa('A8 estadoDoPedidoRestaurado só devolve nenhum/aguardando_saldo/sem_saldo/pronto_para_clique', [...estados].every((e) => ['nenhum', 'aguardando_saldo', 'sem_saldo', 'pronto_para_clique'].includes(e)))
  checa('A9 restaurado + saldo que paga = pronto_para_clique (espera o clique)', estadoDoPedidoRestaurado({ restaurado: true, confirmado: false, temTexto: true, processando: false, credits: 165, outOfCredits: false }) === 'pronto_para_clique')
  checa('A10 saldo ainda não lido = aguardando_saldo; sem saldo = sem_saldo; já confirmado = nenhum',
    estadoDoPedidoRestaurado({ restaurado: true, confirmado: false, temTexto: true, processando: false, credits: null, outOfCredits: false }) === 'aguardando_saldo' &&
    estadoDoPedidoRestaurado({ restaurado: true, confirmado: false, temTexto: true, processando: false, credits: 5, outOfCredits: true }) === 'sem_saldo' &&
    estadoDoPedidoRestaurado({ restaurado: true, confirmado: true, temTexto: true, processando: false, credits: 165, outOfCredits: false }) === 'nenhum')
  checa('A11 o cartão mostra motor · duração · custo e o botão "Start my film"', GC.includes('data-testid="start-my-film-card"') && GC.includes('{pedidoResumo}') && GC.includes('START_MY_FILM_CTA') && START_MY_FILM_CTA === 'Start my film')
  checa('A12 resumo do pedido = "Seedance 1.5 · 35 s · 15 credits"', resumoDoPedido({ mode: 'cinematic_ai', engine: 'seedance', duration: 35, cost: custoSeedance(35) }) === `Seedance 1.5 · 35 s · ${custoSeedance(35)} credits`)
  checa('A13 Kineo 1 grátis = "Kineo 1 · 35 s · Free"; Kling 3 nomeado', resumoDoPedido({ mode: 'fast', engine: 'seedance', duration: 35, cost: 0 }) === 'Kineo 1 · 35 s · Free' && motorDoPedido('cinematic_ai', 'hollywood') === 'Kling 3')
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('== B. duração preservada ==')
{
  const agora = Date.parse('2026-11-01T13:16:15Z')
  for (const d of [15, 30, 35, 45, 60, 90]) {
    const raw = serializeCardEntryDraft({ prompt: 'What NASA found on Mars they never announced', quality: 'cinematic_ai', duration: d, mode: 'cinematic_ai', engine: 'seedance', at: agora - 60_000 })
    const draft = readCardEntryDraft(raw, agora)
    checa(`B1 rascunho devolve ${d} s exatos (fresco, motor junto)`, draft?.duration === d && draft?.fresh === true && draft?.engine === 'seedance' && draft?.mode === 'cinematic_ai')
  }
  // A causa: o ramo de defaults do fetchCredits, executado de verdade.
  const ramo = trecho(GC, '            if (!defaultsDoPlanoPodemMexer(', '          }\n        }\n      } catch {')
  const rodaRamo = (restaurada: boolean) => {
    const sets: Array<[string, unknown]> = []
    roda(ramo, {
      defaultsDoPlanoPodemMexer, escolhaRestauradaRef: { current: restaurada }, urlPickedEngine: false, motorTraduzidoDoKineo1: false,
      entradaNoPlano: true, fromViralNow: false, trialDefaultsToCreatorEngine: false,
      data: { credits: 165, isCreator: true, isStarter: false, isStudio: false, hasPaid: true },
      setMode: (v: unknown) => sets.push(['mode', v]), setAiEngine: (v: unknown) => sets.push(['engine', v]), setDuration: (v: unknown) => sets.push(['duration', v]),
      duracaoDaUrlNaEntrada, readCreationHandoff: () => ({ duration: null }), searchParams: { get: (k: string) => (k === 'resume' ? 'card_entry' : null) }, custoSeedance,
    })
    return sets
  }
  const semRestauro = rodaRamo(false)
  checa('B2 reprodução da causa: sem restauração, o ramo entradaNoPlano manda 60 s a um Creator de 165 cr', semRestauro.some(([k, v]) => k === 'duration' && v === 60))
  checa('B3 a mesma régua isolada: duracaoDaUrlNaEntrada(sem ?duration, saldo 165) = 60', duracaoDaUrlNaEntrada({ durUrl: null, balance: 165, autoStart: false, custoSeedance }) === 60)
  const comRestauro = rodaRamo(true)
  checa('B4 com pedido restaurado: os defaults não tocam motor nem duração (os 35 s ficam)', comRestauro.length === 0)
  checa('B5 defaultsDoPlanoPodemMexer: restaurado ou motor da URL = não mexe; chegada de mão vazia = mexe',
    !defaultsDoPlanoPodemMexer({ escolhaRestaurada: true, motorExplicitoNaUrl: false }) && !defaultsDoPlanoPodemMexer({ escolhaRestaurada: false, motorExplicitoNaUrl: true }) && defaultsDoPlanoPodemMexer({ escolhaRestaurada: false, motorExplicitoNaUrl: false }))
  // Ordem: a marca da restauração acontece ANTES dos setters na montagem (o fetchCredits é assíncrono e lê a ref depois).
  const restauracao = trecho(GC, "if (searchParams?.get('resume') !== 'card_entry') return", '}, [])')
  checa('B6 a marca escolhaRestauradaRef vem antes do setDuration da restauração', restauracao.indexOf('escolhaRestauradaRef.current = true') < restauracao.indexOf('setDuration(draft.duration'))
  checa('B7 a ref é declarada antes do efeito do fetchCredits que a lê', GC.indexOf('const escolhaRestauradaRef = useRef(false)') > 0 && GC.indexOf('const escolhaRestauradaRef = useRef(false)') < GC.indexOf('if (!defaultsDoPlanoPodemMexer('))
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('== C. o clique dispara o render ==')
{
  const fn = trecho(GC, '  function confirmarPedidoRestaurado() {', '\n  }\n') + '\n  }\nconfirmarPedidoRestaurado()'
  const run = (o: { outOfCredits: boolean; phase?: string }) => {
    const r = { renders: 0, eventos: [] as Array<[string, Record<string, unknown>]>, removidos: [] as string[], cartao: [] as boolean[] }
    roda(fn, {
      phase: o.phase ?? 'idle', prompt: 'What NASA found on Mars they never announced', isProcessingPhase: (p: string) => p === 'generating',
      outOfCredits: () => o.outOfCredits, trackEvent: (n: string, m: Record<string, unknown>) => r.eventos.push([n, m]), quality: 'cinematic_ai', duration: 35, mode: 'cinematic_ai', aiEngine: 'seedance', credits: 165,
      handleGenerateGuarded: () => { r.renders++ }, setResumeAguardandoClique: (v: boolean) => r.cartao.push(v), sessionStorage: { removeItem: (k: string) => r.removidos.push(k) },
      CARD_ENTRY_DRAFT_KEY: 'kineo_studio_draft_v1', CARD_ENTRY_RESUME_CONFIRMED_EVENT, selectedCost: custoSeedance(35), SEM_INICIO_AUTOMATICO_VERSION: 'x',
    })
    return r
  }
  const a = run({ outOfCredits: false })
  const conf = a.eventos.find(([n]) => n === 'card_entry_resume_confirmed')
  checa('C1 clique com saldo: render UMA vez + card_entry_resume_confirmed com a duração escolhida (35)', a.renders === 1 && !!conf && conf[1].duration === 35 && conf[1].engine === 'seedance')
  checa('C2 clique com saldo: o rascunho sai e o cartão fecha', a.removidos.includes('kineo_studio_draft_v1') && a.cartao.includes(false))
  const b = run({ outOfCredits: true })
  checa('C3 clique sem saldo: cai na guarda do Generate (modal), o rascunho e o cartão ficam', b.renders === 1 && b.removidos.length === 0 && !b.cartao.includes(false) && !b.eventos.some(([n]) => n === 'card_entry_resume_confirmed'))
  const c = run({ outOfCredits: false, phase: 'generating' })
  checa('C4 clique durante uma geração em voo: nada', c.renders === 0)
  checa('C5 CARD_ENTRY_RESUME_CONFIRMED_EVENT = card_entry_resume_confirmed', CARD_ENTRY_RESUME_CONFIRMED_EVENT === 'card_entry_resume_confirmed')

  const chamadas = (nome: string) => (semComentarios(GC).match(new RegExp(`${nome}\\(\\)`, 'g')) ?? []).length
  checa('C6 confirmarPedidoRestaurado só é chamado pelo onClick do cartão', chamadas('confirmarPedidoRestaurado') === 2 && /onClick=\{\(\) => \{ if \(pedidoParaConfirmar === 'resume'\) confirmarPedidoRestaurado\(\); else confirmarPrimeiroFilme\(\) \}\}/.test(GC))
  checa('C7 confirmarPrimeiroFilme só é chamado pelo mesmo onClick', chamadas('confirmarPrimeiroFilme') === 2)

  // O 1º filme (activation): o clique rearma o rail e analisa (→ activation_autostart_dispatched), uma vez.
  const fn2 = trecho(GC, '  function confirmarPrimeiroFilme() {', '\n  }\n') + '\n  }\nconfirmarPrimeiroFilme()'
  const r2 = { analises: [] as unknown[], eventos: [] as string[], modal: 0 }
  const refs = { activationHeldRef: { current: { topic: 'the Roman city of Pompeii', structureFirst: true } as unknown }, activationAutoGenerateRef: { current: false }, activationAutostartSawProcessingRef: { current: true } }
  roda(fn2, {
    ...refs, phase: 'idle', isProcessingPhase: () => false, generationInFlightRef: { current: false }, outOfCredits: () => false, openOutOfCreditsModal: () => { r2.modal++ },
    setActivationAguardandoClique: () => {}, trackEvent: (n: string) => r2.eventos.push(n), activationAutostartContextRef: { current: { variant: 'activation_autostart_trial_best_v1' } },
    selectedCost: custoSeedance(15), duration: 15, mode: 'cinematic_ai', aiEngine: 'seedance', ACTIVATION_AUTOSTART_CONFIRMED_EVENT, SEM_INICIO_AUTOMATICO_VERSION: 'x',
    handleAnalyze: (...a: unknown[]) => { r2.analises.push(a) },
  })
  checa('C8 clique no 1º filme: análise UMA vez, rail rearmado, activation_autostart_confirmed', r2.analises.length === 1 && refs.activationAutoGenerateRef.current === true && refs.activationHeldRef.current === null && r2.eventos.includes('activation_autostart_confirmed'))
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('== D. os outros caminhos ==')
{
  // D1-D4 activation_autostart (create_intent): o 1º filme que custa crédito espera o clique.
  checa('D1 inicioAutomaticoPedeClique: custo > 0 (inclusive trial) pede clique; custo desconhecido pede clique; 0 (cota grátis) segue',
    inicioAutomaticoPedeClique({ custoCreditos: custoSeedance(15), confirmado: false }) && inicioAutomaticoPedeClique({ custoCreditos: null, confirmado: false }) && !inicioAutomaticoPedeClique({ custoCreditos: 0, confirmado: false }))
  const efeito2 = trecho(GC, '  // Commit the resolved activation engine before analysis so a prior dashboard', '  // Push #087 — Force Fast Mode for non-Pro users.')
  const iGate = efeito2.indexOf('inicioAutomaticoPedeClique({ custoCreditos: selectedCost')
  const iAnalyze = efeito2.indexOf('void handleAnalyze(topic, {')
  checa('D2 o rail do activation_autostart segura ANTES da análise (que é o que despacha)', iGate > 0 && iAnalyze > iGate)
  const gate = efeito2.slice(iGate, iAnalyze)
  checa('D3 ao segurar: desarma o rail, mostra o cartão, registra activation_autostart_held_for_click e sai', gate.includes('activationAutoGenerateRef.current = false') && gate.includes('setActivationAguardandoClique(true)') && gate.includes('ACTIVATION_AUTOSTART_HELD_EVENT') && /return\n/.test(gate) && ACTIVATION_AUTOSTART_HELD_EVENT === 'activation_autostart_held_for_click')
  // Execução do portão: custo do trial (Seedance 15 s) → nada analisado.
  const portao = efeito2.slice(iGate - 4, efeito2.indexOf('    }\n', iGate) + 6)
  const st = { analise: 0, held: null as unknown, eventos: [] as string[], aguardando: false }
  const autoRef = { current: true }
  roda(portao + '\nhandleAnalyze()', {
    inicioAutomaticoPedeClique, selectedCost: custoSeedance(15), activationCreationContractRef: { current: {} }, activationHeldRef: { set current(v: unknown) { st.held = v }, get current() { return st.held } },
    topic: 'the Roman city of Pompeii', activationContract: { structureFirst: true }, activationAutoGenerateRef: autoRef, setActivationAguardandoClique: (v: boolean) => { st.aguardando = v },
    trackEvent: (n: string) => st.eventos.push(n), metadata: {}, duration: 15, ACTIVATION_AUTOSTART_HELD_EVENT, SEM_INICIO_AUTOMATICO_VERSION: 'x', handleAnalyze: () => { st.analise++ },
  })
  checa('D4 portão executado com o custo do trial: nada analisado/despachado, cartão ligado, rail desarmado', st.analise === 0 && st.aguardando && autoRef.current === false && st.eventos.includes('activation_autostart_held_for_click'))

  // D5 /create?autostart=true não gera mais.
  const CC = rd('app/(dashboard)/create/CreateClient.tsx')
  const auto = trecho(CC, '  useEffect(() => {\n    if (!autostartParam) {', '  }, [autostartParam, creditsLoading, credits, initialNicheParam])')
  checa('D5 /create?autostart=true só preenche o tema: o efeito não chama handleGenerate', !/handleGenerate\(/.test(semComentarios(auto)) && auto.includes("create_autostart_held_for_click"))

  // D6 Studio: o token do 1 clique só nasce dentro do handler do botão Gerar.
  const SC = rd('app/(dashboard)/studio/StudioClient.tsx')
  const gerar = trecho(SC, '  const generate = () => {', "sessionStorage.setItem('kineo:studio:go:v1'")
  checa('D6 Studio grava kineo:studio:go:v1 só no clique (dentro de generate) e em nenhum outro ponto', (SC.match(/setItem\('kineo:studio:go:v1'/g) ?? []).length === 1 && gerar.length > 0)
  const umClique = trecho(GC, "    if (searchParams?.get('studio') !== '1') return", '  }, [phase, mode, aiEngine, duration])')
  checa('D7 o 1 clique do Studio exige o token do clique com até 120 s', umClique.includes("sessionStorage.getItem('kineo:studio:go:v1')") && umClique.includes('Date.now() - tok.t > 120_000'))

  // D8 /checkout/success: sem cards de tema e sem OAuth automático; destinos sem create_intent/autostart.
  const CS = rd('app/checkout/success/page.tsx')
  checa('D8 /checkout/success: cards de tema e OAuth automático desligados', CHECKOUT_SUCCESS_TOPIC_CARDS_ENABLED === false && CHECKOUT_OAUTH_AUTOSTART_ENABLED === false)
  // O único link create_intent da página é o dos cards de tema (first_win), que só renderizam atrás do interruptor desligado
  // — e, se um dia religar, cai no portão do activation_autostart (D2-D4), que pede o clique quando custa crédito.
  const codigoCS = semComentarios(CS)
  const linksCI = [...codigoCS.matchAll(/create_intent=|autostart=/g)].map((m) => m.index ?? -1)
  const guardaCards = codigoCS.indexOf('{CHECKOUT_SUCCESS_TOPIC_CARDS_ENABLED &&')
  checa('D9 /checkout/success: todo link create_intent/autostart mora atrás do interruptor desligado dos cards', guardaCards > 0 && linksCI.length > 0 && linksCI.every((i) => i > guardaCards) && !/autostart=/.test(codigoCS))
  checa('D10 links de retomada do resume não carregam create_intent/autostart', !/resume=card_entry[^'"`]*(create_intent|autostart)/.test(GC + CS + rd('app/pricing/PricingClient.tsx')))

  // D11 o painel conta a confirmação nova (e o histórico antigo).
  const ext = new Set(['u1', 'u2'])
  const f = funilVersaoB([
    { user_id: 'u1', name: 'card_entry_resume_confirmed', created_at: '2026-11-02T12:00:00Z', metadata: null },
    { user_id: 'u2', name: 'card_entry_resume_autostart', created_at: '2026-11-01T13:16:17Z', metadata: null },
  ] as never, 0, ext)
  checa('D11 funil versão B conta card_entry_resume_confirmed e o card_entry_resume_autostart histórico', f.autostart === 2)
  checa('D12 /admin/overview busca o evento novo', rd('app/admin/overview/page.tsx').includes("'card_entry_resume_confirmed'"))
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
