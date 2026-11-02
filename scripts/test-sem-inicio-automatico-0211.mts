// KINEO-SEM-INICIO-AUTOMATICO-0211 — guardião: depois de pagar, NADA começa sozinho; o filme sai no clique.
// [TRAVA 8.2 — aval permanente do fundador (proteção do cliente) 02/11]
//
// Caso real (manobiayousaf, Creator, 01/11): card_entry_resume_restored duration 35 às 13:16:15 →
// card_entry_resume_autostart duration 60 às 13:16:17 → Seedance de 60 s começou sozinho e debitou 35 cr.
//
// Prova, lendo e EXECUTANDO os trechos reais do GenerateClient (nunca uma cópia da regra):
//   A. restauração sem autostart — o efeito que disparava agora só mede; nenhum caminho do resume chama o render;
//      card_entry_resume_autostart deixou de ser emitido; card_entry e wall_v1 abrem o cartão "Start my film";
//   B. duração preservada — o rascunho devolve 15/30/35/45/60/90 exatos; o ramo de defaults do fetchCredits
//      (a causa do 35 → 60) não toca motor/duração quando houve restauração, e sem restauração ainda daria 60;
//   C. o clique dispara o render — guardas do Generate primeiro, depois a ref; assim que a fase sai de 'idle' (inclusive
//      'generating') o pedido é consumido: cartão fecha e não reabre, ?resume= sai, rascunho sai e não volta; throw →
//      idle "Still rendering…" não reabre; F5 depois do filme não reabre; só a recusa explícita (4xx antes de aceitar)
//      devolve o cartão; saldo não lido não trava o botão; selo do motor honesto (Kling 4.0, Cinematic);
//   D. os outros caminhos — activation_autostart (trial) IDÊNTICO à origin/main (fora do escopo, decisão de 02/11);
//      /create?autostart só preenche; Studio só grava o token do 1 clique no clique; /checkout/success sem cards de
//      tema nem OAuth automático; o painel conta a confirmação.
// Rodar: npx tsx scripts/test-sem-inicio-automatico-0211.mts   (sem rede, sem custo)
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import {
  CARD_ENTRY_RESUME_CONFIRMED_EVENT,
  START_MY_FILM_CTA,
  defaultsDoPlanoPodemMexer,
  despachoAceito,
  estadoDoPedidoRestaurado,
  motorDoPedido,
  recusaExplicitaAntesDeAceitar,
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
  checa('A4 a restauração do wall_v1 também marca a escolha restaurada, abre o mesmo cartão e não gera', wall.includes('escolhaRestauradaRef.current = true') && wall.includes('setResumeAguardandoClique(true)') && !/handleGenerate|handleAnalyze/.test(wall))

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
  checa('A13 Kineo 1 grátis = "Kineo 1 · 35 s · Free"; Kling 3 nomeado', resumoDoPedido({ mode: 'fast', engine: 'seedance', duration: 35, cost: 0 }) === 'Kineo 1 · 35 s · Free' && motorDoPedido('cinematic_ai', 'hollywood', false) === 'Kling 3')
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
  const PROMPT = 'What NASA found on Mars they never announced'
  // ── C1-C6: o clique. Guardas síncronas do Generate primeiro; só então arma a ref e despacha.
  const fn = trecho(GC, '  function confirmarPedidoRestaurado() {', '\n  }\n') + '\n  }\nconfirmarPedidoRestaurado()'
  const clique = async (o: { outOfCredits?: boolean; phase?: string; pacote?: boolean; qualidade?: boolean; saiDoIdle?: boolean }) => {
    const r = { gerou: 0, guardou: 0, eventos: [] as string[], removidos: [] as string[], cartao: [] as boolean[], ref: { current: null as number | null }, saiu: { current: false } }
    let fim: Promise<void> = Promise.resolve()
    roda(fn, {
      phase: o.phase ?? 'idle', prompt: PROMPT, isProcessingPhase: (p: string) => p === 'generating',
      outOfCredits: () => o.outOfCredits === true, qualityFailureRef: { current: o.qualidade === true }, wallV1PackSyncing: o.pacote === true,
      trackEvent: (n: string) => r.eventos.push(n), quality: 'cinematic_ai', duration: 35, mode: 'cinematic_ai', aiEngine: 'seedance', credits: 165,
      handleGenerateGuarded: () => { r.guardou++ },
      handleGenerate: () => { r.gerou++; if (o.saiDoIdle) r.saiu.current = true; fim = Promise.resolve(); return fim },
      setResumeAguardandoClique: (v: boolean) => r.cartao.push(v), sessionStorage: { removeItem: (k: string) => r.removidos.push(k) },
      resumeCliqueRef: r.ref, resumeSaiuDoIdleRef: r.saiu, SEM_INICIO_AUTOMATICO_VERSION: 'x',
    })
    const armada = r.ref.current
    await fim; await new Promise((ok) => setTimeout(ok, 0))
    return { ...r, armada }
  }
  const a = await clique({ saiDoIdle: true })
  checa('C1 clique com saldo: despacha UMA vez (handleGenerate) com a ref armada DEPOIS das guardas', a.gerou === 1 && a.guardou === 0 && typeof a.armada === 'number')
  checa('C2 o clique sozinho não fecha o cartão, não apaga o rascunho, não grava confirmed (quem fecha é o efeito)', a.cartao.length === 0 && a.removidos.length === 0 && !a.eventos.includes('card_entry_resume_confirmed'))
  const b = await clique({ outOfCredits: true })
  checa('C3 sem saldo: a guarda de sempre abre o modal, nada é armado nem despachado, card_entry_resume_blocked', b.guardou === 1 && b.gerou === 0 && b.armada === null && b.eventos.includes('card_entry_resume_blocked'))
  const c = await clique({ pacote: true }), q = await clique({ qualidade: true })
  checa('C4 pacote ainda caindo / falha de qualidade: guarda de sempre, nada armado nem despachado', c.guardou === 1 && c.gerou === 0 && c.armada === null && q.gerou === 0 && q.armada === null)
  checa('C5 clique durante uma geração em voo: nada', (await clique({ phase: 'generating' })).gerou === 0)
  const volta = await clique({ saiDoIdle: false })
  checa('C6 handleGenerate voltou por guarda dele SEM sair de idle: a ref é limpa (o cartão continua aberto)', volta.gerou === 1 && typeof volta.armada === 'number' && volta.ref.current === null)

  // ── C7-C16: o efeito "o pedido saiu do papel", executado de verdade numa sequência de fases (estado entre os passos).
  const corpo = trecho(GC, '    const clique = resumeConsumoPorCliqueRef.current\n', '    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [phase, resumeAguardandoClique, sinalDaFalha])')
  const novaPagina = (clicou: boolean) => {
    const st = {
      aguardando: true, url: 'https://usekineo.com/studio/create?resume=card_entry&intent_campaign=x', rascunho: 'rascunho' as string | null,
      eventos: [] as Array<[string, Record<string, unknown>]>, attempt: { current: 'att-1' as string | null },
      refs: { clique: { current: clicou ? Date.now() - 50 : null as number | null }, saiu: { current: false }, consumo: { current: null as { at: number; prompt: string; attemptId: string | null } | null }, aceito: { current: false }, consumido: { current: null as string | null } },
    }
    const passo = (phase: string, sinal: { reason: string; httpStatus: number | null; at: number } | null = null) => {
      roda(corpo, {
        resumeConsumoPorCliqueRef: st.refs.consumo, resumeAceitoRef: st.refs.aceito, resumeCliqueRef: st.refs.clique, resumeSaiuDoIdleRef: st.refs.saiu, resumeConsumidoRef: st.refs.consumido,
        phase, sinalDaFalha: sinal, resumeAguardandoClique: st.aguardando, despachoAceito, recusaExplicitaAntesDeAceitar, generationAttemptRef: st.attempt,
        isProcessingPhase: (p: string) => ['scripting', 'analyzing', 'broll_planning', 'generating', 'fal_polling', 'avatar_polling', 'clips_ready', 'composing'].includes(p),
        prompt: PROMPT, setResumeAguardandoClique: (v: boolean) => { st.aguardando = v },
        sessionStorage: { removeItem: () => { st.rascunho = null }, setItem: (_k: string, v: string) => { st.rascunho = v } }, CARD_ENTRY_DRAFT_KEY: 'kineo_studio_draft_v1', serializeCardEntryDraft,
        window: { get location() { return { href: st.url } }, history: { state: null, replaceState: (_s: unknown, _t: string, u: string) => { st.url = 'https://usekineo.com' + u } } }, URL,
        trackEvent: (n: string, m: Record<string, unknown>) => st.eventos.push([n, m]), CARD_ENTRY_RESUME_CONFIRMED_EVENT, SEM_INICIO_AUTOMATICO_VERSION: 'x',
        quality: 'cinematic_ai', duration: 35, credits: 165, mode: 'cinematic_ai', aiEngine: 'seedance', selectedCost: custoSeedance(35),
      })
    }
    return { st, passo }
  }
  const p1 = novaPagina(true)
  p1.passo('idle')
  checa('C7 ainda em idle depois do clique: nada consumido', p1.st.aguardando && p1.st.rascunho !== null && p1.st.url.includes('resume='))
  p1.passo('generating')
  const conf = p1.st.eventos.find(([n]) => n === 'card_entry_resume_confirmed')
  checa("C8 a fase saiu de idle ('generating'): cartão fecha, rascunho sai, ?resume= sai da URL (o resto fica), confirmed com 35 s",
    !p1.st.aguardando && p1.st.rascunho === null && !p1.st.url.includes('resume=') && p1.st.url.includes('intent_campaign=x') && !!conf && conf[1].duration === 35 && conf[1].stage === 'generating' && p1.st.refs.consumido.current === PROMPT)
  // O POST caiu no cliente (throw) DEPOIS de o servidor aceitar: aindaNoFornoAntesDeFalhar → idle "Still rendering…".
  p1.passo('idle')
  checa('C9 throw → idle "Still rendering…": o cartão NÃO reabre e o rascunho NÃO volta', !p1.st.aguardando && p1.st.rascunho === null)
  p1.passo('failed', { reason: 'cinematic_threw', httpStatus: null, at: Date.now() })
  checa('C10 throw de rede em failed (sem status): conta como aceito — não reabre', !p1.st.aguardando && p1.st.rascunho === null && !p1.st.eventos.some(([n]) => n === 'card_entry_resume_refused'))
  p1.passo('failed', { reason: 'cinematic_not_ok', httpStatus: 503, at: Date.now() })
  checa('C11 5xx em failed: conta como aceito (o servidor pode ter debitado) — não reabre', !p1.st.aguardando && p1.st.rascunho === null)
  // F5 depois do filme: a URL limpa não tem ?resume= e o rascunho sumiu — a restauração do card_entry nem começa.
  const restauracao = trecho(GC, "    if (searchParams?.get('resume') !== 'card_entry') return", '    // Mount-only.')
  let abriuNoF5 = false
  const urlF5 = new URL(p1.st.url)
  roda(restauracao, {
    searchParams: urlF5.searchParams, readCardEntryDraft, sessionStorage: { getItem: () => p1.st.rascunho }, CARD_ENTRY_DRAFT_KEY: 'kineo_studio_draft_v1', Date,
    escolhaRestauradaRef: { current: false }, setPrompt: () => {}, setQuality: () => {}, setDuration: () => {}, setMode: () => {}, setAiEngine: () => {},
    resumeArmedRef: { current: false }, setResumeAguardandoClique: (v: boolean) => { if (v) abriuNoF5 = true }, trackEvent: () => {}, SEM_INICIO_AUTOMATICO_VERSION: 'x',
  })
  checa('C12 F5 depois do filme: sem ?resume= e sem rascunho, o cartão não reabre (nenhum segundo filme pago)', !abriuNoF5 && urlF5.searchParams.get('resume') === null && p1.st.rascunho === null)
  // O mesmo F5 se o ?resume= tivesse ficado (o defeito da revisão): reabriria — prova que o teste enxerga o defeito.
  let abriria = false
  roda(restauracao, {
    searchParams: new URL('https://usekineo.com/studio/create?resume=card_entry').searchParams, readCardEntryDraft, sessionStorage: { getItem: () => serializeCardEntryDraft({ prompt: PROMPT, quality: 'cinematic_ai', duration: 35, mode: 'cinematic_ai', engine: 'seedance', at: Date.now() }) }, CARD_ENTRY_DRAFT_KEY: 'kineo_studio_draft_v1', Date,
    escolhaRestauradaRef: { current: false }, setPrompt: () => {}, setQuality: () => {}, setDuration: () => {}, setMode: () => {}, setAiEngine: () => {},
    resumeArmedRef: { current: false }, setResumeAguardandoClique: (v: boolean) => { if (v) abriria = true }, trackEvent: () => {}, SEM_INICIO_AUTOMATICO_VERSION: 'x',
  })
  checa('C13 controle: com ?resume= e rascunho a restauração reabriria (por isso os dois saem)', abriria)

  // Recusa explícita do servidor antes de aceitar: o cartão volta, do estado em memória.
  const p2 = novaPagina(true)
  p2.passo('generating')
  p2.passo('failed', { reason: 'cinematic_not_ok', httpStatus: 402, at: Date.now() + 1 })
  const rasc = p2.st.rascunho ? JSON.parse(p2.st.rascunho) : null
  checa('C14 recusa explícita (HTTP 402) antes de aceitar: o cartão volta e o rascunho é refeito da memória (mesmo texto, 35 s)',
    p2.st.aguardando && rasc?.prompt === PROMPT && rasc?.duration === 35 && p2.st.eventos.some(([n]) => n === 'card_entry_resume_refused') && p2.st.refs.consumido.current === null)
  const p3 = novaPagina(true)
  p3.passo('generating'); p3.passo('fal_polling'); p3.passo('failed', { reason: 'compose_not_ok', httpStatus: 422, at: Date.now() + 1 })
  checa('C15 falha 4xx DEPOIS de aceito (fal_polling): não reabre', !p3.st.aguardando && p3.st.rascunho === null)
  const p4 = novaPagina(true)
  p4.passo('options')
  checa("C16 guarda que leva a 'options' sem despachar (free limit): nada consumido, o pedido continua", p4.st.aguardando && p4.st.rascunho !== null && p4.st.url.includes('resume='))
  const p5 = novaPagina(false)
  p5.passo('composing')
  checa('C17 despacho pelo botão Generate de sempre: consome (rascunho/URL) mas NÃO grava confirmed', !p5.st.aguardando && p5.st.rascunho === null && !p5.st.url.includes('resume=') && !p5.st.eventos.some(([n]) => n === 'card_entry_resume_confirmed'))

  // 4ª leva — throw → "Still rendering…" → Generate normal → 4xx: a recusa é de OUTRA tentativa; o cartão NÃO reabre.
  const p6 = novaPagina(true)
  p6.passo('generating')                       // clique consumido (attempt att-1)
  p6.passo('idle')                             // POST caiu no cliente; aindaNoForno → idle "Still rendering…"
  checa('C27a fim da 1ª tentativa (throw → idle): a janela de reabrir fecha', p6.st.refs.consumo.current === null && !p6.st.aguardando)
  p6.st.attempt.current = 'att-1'              // o Generate normal pode até reaproveitar o attempt (idle não renova)
  p6.passo('generating')                       // Generate normal (cartão já fechado)
  p6.passo('failed', { reason: 'cinematic_not_ok', httpStatus: 402, at: Date.now() + 5 })
  checa('C27 throw → "Still rendering" → Generate normal → 4xx: o cartão NÃO reabre e o rascunho NÃO é regravado (1º filme no forno)',
    !p6.st.aguardando && p6.st.rascunho === null && !p6.st.eventos.some(([n]) => n === 'card_entry_resume_refused'))
  const p7 = novaPagina(true)
  p7.passo('generating')                       // consumido com att-1
  p7.st.attempt.current = 'att-2'              // a falha que chega é de outra tentativa
  p7.passo('failed', { reason: 'cinematic_not_ok', httpStatus: 402, at: Date.now() + 5 })
  checa('C28 4xx de OUTRO attempt em failed: não reabre e a janela fecha', !p7.st.aguardando && p7.st.rascunho === null && p7.st.refs.consumo.current === null)
  const p8 = novaPagina(true)
  p8.st.attempt.current = null
  p8.passo('scripting')                        // consumido antes de o attempt existir
  p8.st.attempt.current = 'att-9'
  p8.passo('generating')                       // o attempt é preso no 1º generating
  p8.passo('failed', { reason: 'cinematic_not_ok', httpStatus: 409, at: Date.now() + 5 })
  checa('C29 attempt preso no 1º generating: a recusa 4xx dessa mesma tentativa ainda reabre', p8.st.aguardando && p8.st.rascunho !== null)
  checa('C18 recusaExplicitaAntesDeAceitar: só 4xx em failed, depois do clique, antes de aceitar, sem throw',
    recusaExplicitaAntesDeAceitar({ phase: 'failed', sinal: { reason: 'x_not_ok', httpStatus: 409, at: 10 }, cliqueAt: 5, aceito: false }) &&
    !recusaExplicitaAntesDeAceitar({ phase: 'failed', sinal: { reason: 'x_not_ok', httpStatus: 409, at: 1 }, cliqueAt: 5, aceito: false }) &&
    !recusaExplicitaAntesDeAceitar({ phase: 'failed', sinal: { reason: 'fast_threw', httpStatus: null, at: 10 }, cliqueAt: 5, aceito: false }) &&
    !recusaExplicitaAntesDeAceitar({ phase: 'failed', sinal: { reason: 'x_not_ok', httpStatus: 500, at: 10 }, cliqueAt: 5, aceito: false }) &&
    !recusaExplicitaAntesDeAceitar({ phase: 'failed', sinal: { reason: 'x_not_ok', httpStatus: 402, at: 10 }, cliqueAt: 5, aceito: true }) &&
    !recusaExplicitaAntesDeAceitar({ phase: 'idle', sinal: { reason: 'x_not_ok', httpStatus: 402, at: 10 }, cliqueAt: 5, aceito: false }))

  // ── C19-C26: rascunho, cartão, selo.
  const salva = trecho(GC, '  useEffect(() => {\n    try {\n      const clean = prompt.trim()\n      if (!clean) return\n      if (resumeConsumidoRef', '  }, [prompt, quality, duration, mode, aiEngine])')
  const corpoSalva = salva.slice(salva.indexOf('{') + 1)
  const regravou = (consumido: string | null, texto: string) => {
    const set: string[] = []
    roda(corpoSalva.replace(/\}\s*$/, ''), {
      prompt: texto, resumeConsumidoRef: { current: consumido }, sessionStorage: { setItem: (k: string) => set.push(k) }, CARD_ENTRY_DRAFT_KEY: 'kineo_studio_draft_v1',
      serializeCardEntryDraft, quality: 'cinematic_ai', duration: 35, mode: 'cinematic_ai', aiEngine: 'seedance',
    })
    return set.length > 0
  }
  checa('C19 o texto que já virou filme não volta para o rascunho; texto novo volta', !regravou(PROMPT, PROMPT) && regravou(PROMPT, 'Outra ideia') && regravou(null, PROMPT))
  const cartao = trecho(GC, '      {pedidoParaConfirmar && (', '      )}\n')
  checa('C20 o botão "Start my film" nunca fica desabilitado (saldo não lido: a guarda e o servidor decidem)', !/disabled=/.test(cartao) && cartao.includes('onClick={() => confirmarPedidoRestaurado()}') && START_MY_FILM_CTA === 'Start my film')
  checa('C21 a cópia não promete edição e mostra motor · duração · custo', !/change the|text below|\bedit\b/i.test(cartao) && cartao.includes('{pedidoResumo}'))
  const copia = cartao.slice(cartao.indexOf("{wallV1PackSyncing\n"))
  checa('C22 pacote caindo: a cópia mostra só "Adding your credits…" (vence o "Your balance does not cover…")', copia.length > 0 && copia.indexOf("'Adding your credits…'") < copia.indexOf('Your balance does not cover'))
  checa('C23 confirmarPedidoRestaurado só é chamado pelo onClick do cartão', (semComentarios(GC).match(/confirmarPedidoRestaurado\(\)/g) ?? []).length === 2)
  checa('C24 selo honesto: Kling 4.0 com o Kling 4 pago no ar, Kling 3 sem; mesma condição do despacho',
    motorDoPedido('cinematic_ai', 'hollywood', true) === 'Kling 4.0' && motorDoPedido('cinematic_ai', 'hollywood', false) === 'Kling 3' &&
    resumoDoPedido({ mode: 'cinematic_ai', engine: 'hollywood', duration: 60, cost: 0, kling4PaidLive: true }) === 'Kling 4.0 · 60 s · Free' &&
    GC.includes('kling4PaidLive: kling4DispatchAvailability?.paidLive === true'))
  checa("C25 modo legado 'cinematic' tem nome (\"Cinematic\", como o seletor), nunca some do resumo", motorDoPedido('cinematic', 'seedance') === 'Cinematic' && resumoDoPedido({ mode: 'cinematic', engine: null, duration: 35, cost: 8 }) === 'Cinematic · 35 s · 8 credits')
  checa('C26 despachoAceito: generating/idle/options/failed = não; fal_polling/avatar_polling/clips_ready/composing/done = sim',
    ['generating', 'idle', 'options', 'failed', 'scripting', 'analyzing'].every((p) => !despachoAceito(p)) && ['fal_polling', 'avatar_polling', 'clips_ready', 'composing', 'done'].every((p) => despachoAceito(p)) && CARD_ENTRY_RESUME_CONFIRMED_EVENT === 'card_entry_resume_confirmed')
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('== D. os outros caminhos ==')
{
  // D1 activation_autostart (trial): fora do escopo — byte a byte como na origin/main.
  let base = ''
  try { base = lf(execFileSync('git', ['show', 'origin/main:app/(dashboard)/generate/GenerateClient.tsx'], { encoding: 'utf8', maxBuffer: 64 << 20 })) } catch { base = '' }
  const ini = '  // A prompt in the URL is normally just a prefill. Auto-start is reserved for'
  const fim = '  // Push #087 — Force Fast Mode for non-Pro users.'
  checa('D1 activation_autostart (create_intent do trial, um-clique do Studio, e-mails) idêntico à origin/main', base.length > 0 && trecho(GC, ini, fim) === trecho(base, ini, fim))
  const disparo = '  // Explicit public create intent and the onboarding CTA both promise a'
  checa('D2 o despacho pós-análise do activation_autostart idêntico à origin/main', base.length > 0 && trecho(GC, disparo, '\n  }, [\n') === trecho(base, disparo, '\n  }, [\n'))
  checa('D3 nenhum resto do portão do trial (held_for_click / confirmarPrimeiroFilme)', !/activation_autostart_held_for_click|confirmarPrimeiroFilme|activationAguardandoClique/.test(GC))

  // D4 /create?autostart=true não gera mais.
  const CC = rd('app/(dashboard)/create/CreateClient.tsx')
  const auto = trecho(CC, '  useEffect(() => {\n    if (!autostartParam) {', '  }, [autostartParam, creditsLoading, credits, initialNicheParam])')
  checa('D4 /create?autostart=true só preenche o tema: o efeito não chama handleGenerate', !/handleGenerate\(/.test(semComentarios(auto)) && auto.includes("create_autostart_held_for_click"))

  // D5 Studio: o token do 1 clique só nasce dentro do handler do botão Gerar.
  const SC = rd('app/(dashboard)/studio/StudioClient.tsx')
  const gerar = trecho(SC, '  const generate = () => {', "sessionStorage.setItem('kineo:studio:go:v1'")
  checa('D5 Studio grava kineo:studio:go:v1 só no clique (dentro de generate) e em nenhum outro ponto', (SC.match(/setItem\('kineo:studio:go:v1'/g) ?? []).length === 1 && gerar.length > 0)
  const umClique = trecho(GC, "    if (searchParams?.get('studio') !== '1') return", '  }, [phase, mode, aiEngine, duration])')
  checa('D6 o 1 clique do Studio exige o token do clique com até 120 s', umClique.includes("sessionStorage.getItem('kineo:studio:go:v1')") && umClique.includes('Date.now() - tok.t > 120_000'))

  // D7-D9 /checkout/success: sem cards de tema e sem OAuth automático; os links create_intent moram atrás do interruptor.
  const CS = rd('app/checkout/success/page.tsx')
  checa('D7 /checkout/success: cards de tema e OAuth automático desligados', CHECKOUT_SUCCESS_TOPIC_CARDS_ENABLED === false && CHECKOUT_OAUTH_AUTOSTART_ENABLED === false)
  const codigoCS = semComentarios(CS)
  const linksCI = [...codigoCS.matchAll(/create_intent=|autostart=/g)].map((m) => m.index ?? -1)
  const guardaCards = codigoCS.indexOf('{CHECKOUT_SUCCESS_TOPIC_CARDS_ENABLED &&')
  checa('D8 /checkout/success: todo link create_intent/autostart mora atrás do interruptor desligado dos cards', guardaCards > 0 && linksCI.length > 0 && linksCI.every((i) => i > guardaCards) && !/autostart=/.test(codigoCS))
  checa('D9 links de retomada do resume não carregam create_intent/autostart', !/resume=card_entry[^'"`]*(create_intent|autostart)/.test(GC + CS + rd('app/pricing/PricingClient.tsx')))

  // D10-D11 o painel conta a confirmação nova (e o histórico antigo).
  const ext = new Set(['u1', 'u2'])
  const f = funilVersaoB([
    { user_id: 'u1', name: 'card_entry_resume_confirmed', created_at: '2026-11-02T12:00:00Z', metadata: null },
    { user_id: 'u2', name: 'card_entry_resume_autostart', created_at: '2026-11-01T13:16:17Z', metadata: null },
  ] as never, 0, ext)
  checa('D10 funil versão B conta card_entry_resume_confirmed e o card_entry_resume_autostart histórico', f.autostart === 2)
  checa('D11 /admin/overview busca o evento novo', rd('app/admin/overview/page.tsx').includes("'card_entry_resume_confirmed'"))
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
