// KINEO-FILME-GRATIS-COMECA-0211 — guardião: "Make my free film" COMEÇA o filme, com o texto certo.
// [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
//
// Casos reais (02/11): noroutine2026 clicou às 17:22:47 BRT e nada aconteceu (o clique só fechava a caixa e trocava o
// motor); madsandreasen ficou com o roteiro de 197 palavras escrito pela IA para 60 s e o 15 s recusou ("reads for about
// 79 seconds").
//
// Prova, EXECUTANDO os trechos reais do GenerateClient (o clique e os dois efeitos), nunca uma cópia da regra:
//   A. a regra do texto (lib/growth/filmeGratisComeca): roteiro da IA sai, ideia original volta; roteiro dela nunca some;
//   B. o clique chama a MESMA análise do Generate (handleAnalyze, sem prévia, 15 s) e o MESMO despacho (handleGenerateGuarded), UMA vez;
//   C. qualquer motor de partida, qualquer língua; duplo clique não despacha dois; caixa vazia não começa nada;
//   D. (0211b) a duração do botão vence: "Make a 35-second video…" com saldo 21+ continua 15 s / custo do 15 s;
//      roteiro da IA já medido para a MESMA duração fica (não vira a ideia crua).
// Rodar: npx tsx scripts/test-filme-gratis-comeca-0211.mts   (sem rede, sem custo)
import fs from 'node:fs'
import ts from 'typescript'

let ok = 0
const falhas: string[] = []
function checa(nome: string, cond: unknown) {
  if (cond) { ok++; console.log('  ok  ' + nome) } else { falhas.push(nome); console.log('  XX  ' + nome) }
}
const lf = (t: string) => t.replace(/\r\n/g, '\n')
const GC = lf(fs.readFileSync('app/(dashboard)/generate/GenerateClient.tsx', 'utf8'))
function trecho(src: string, inicio: string, fim: string): string | null {
  const a = src.indexOf(inicio)
  if (a < 0) return null
  const b = src.indexOf(fim, a + inicio.length)
  return b < 0 ? null : src.slice(a + inicio.length, b)
}
const js = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
function roda(code: string, env: Record<string, unknown>) {
  const nomes = Object.keys(env)
  return new Function(...nomes, js(code))(...nomes.map((n) => env[n]))
}

type Helper = typeof import('../lib/growth/filmeGratisComeca')
let helper: Helper | null = null
try { helper = await import('../lib/growth/filmeGratisComeca') } catch { helper = null }
const { roteiroCabeNoFilmeCurto } = await import('../lib/growth/entradaSeedance15')
const { readPastedDirectives } = await import('../lib/pastedDirectives')
const { subidaQueOSaldoPaga } = await import('../lib/growth/motor15s')
const { creditCostForDuration } = await import('../lib/credits/engineCost')
const custoSeedance = (s: number) => creditCostForDuration('cinematic_ai', true, s)

// O roteiro de madsandreasen: ~197 palavras faladas, com os rótulos do escritor (60 s).
const frase = (n: number, p: string) => Array.from({ length: n }, (_, i) => `${p}${i % 7}`).join(' ') + '.'
const ROTEIRO_60 = [
  `HOOK (0-2s): ${frase(14, 'shock')}`, `MICRO REWARD 1: ${frase(30, 'fact')}`, `MICRO REWARD 2: ${frase(30, 'twist')}`,
  `MICRO REWARD 3: ${frase(30, 'detail')}`, `ESCALATION: ${frase(33, 'rise')}`, `RHYTHM: ${frase(20, 'beat')}`, `PAYOFF: ${frase(40, 'reveal')}`,
].join('\n')
const IDEIA = 'Why the Vikings vanished from Greenland'
const PREVIA = ROTEIRO_60.replace(/^[A-Z ]+\d?\s*(\([^)]*\))?:\s*/gm, '')
const ROTEIRO_PT_DELA = `Eu escrevi este roteiro inteiro sobre a minha avó e a fazenda dela no interior de Minas. ${frase(150, 'palavra')}`

// ─────────────────────────────────────────────────────────────────────────────
console.log('== A. a regra do texto ==')
checa('A0 lib/growth/filmeGratisComeca existe', helper !== null)
if (helper) {
  const { textoDoFilmeGratis } = helper
  const a1 = textoDoFilmeGratis({ prompt: PREVIA, estruturado: ROTEIRO_60, ideiaDoRoteiro: { ideia: IDEIA, roteiro: ROTEIRO_60, segundos: 60 }, scriptMode: 'ai', segundos: 15, curto: true, language: 'en' })
  checa('A1 madsandreasen: o roteiro de 60 s da IA sai, a ideia original volta, modo IA', a1.texto === IDEIA && a1.modo === 'ai' && a1.descartouRoteiro === true)
  const a2 = textoDoFilmeGratis({ prompt: PREVIA, estruturado: ROTEIRO_60, ideiaDoRoteiro: { ideia: IDEIA, roteiro: ROTEIRO_60, segundos: 60 }, scriptMode: 'verbatim', segundos: 15, curto: true, language: 'en' })
  checa('A2 roteiro da IA com a tela em "as is" também sai (nunca vai verbatim)', a2.texto === IDEIA && a2.modo === 'ai')
  const a3 = textoDoFilmeGratis({ prompt: ROTEIRO_60, estruturado: ROTEIRO_60, ideiaDoRoteiro: null, scriptMode: 'verbatim', segundos: 15, curto: true, language: 'en' })
  checa('A3 roteiro COLADO por ela, longo para 15 s: o texto dela fica, vira a ideia em modo IA (sem recusa)', a3.texto === ROTEIRO_60 && a3.modo === 'ai' && !a3.descartouRoteiro)
  const curto40 = `HOOK: ${frase(12, 'a')}\nMICRO REWARD 1: ${frase(10, 'b')}\nMICRO REWARD 2: ${frase(10, 'c')}\nPAYOFF: ${frase(8, 'd')}`
  checa('A4 (pré) o roteiro de ~40 palavras cabe no 15 s pela régua da guarda', roteiroCabeNoFilmeCurto(curto40, 15, 'en'))
  const a4 = textoDoFilmeGratis({ prompt: curto40, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'verbatim', segundos: 15, curto: true, language: 'en' })
  checa('A4 roteiro dela que CABE em 15 s segue verbatim, intacto', a4.texto === curto40 && a4.modo === 'verbatim')
  const a5 = textoDoFilmeGratis({ prompt: ROTEIRO_PT_DELA, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'verbatim', segundos: 15, curto: true, language: 'pt' })
  checa('A5 português: roteiro dela longo vira ideia em modo IA, texto preservado', a5.texto === ROTEIRO_PT_DELA && a5.modo === 'ai')
  const a6 = textoDoFilmeGratis({ prompt: 'a', estruturado: 'roteiro editado por ela', ideiaDoRoteiro: { ideia: IDEIA, roteiro: ROTEIRO_60, segundos: 60 }, scriptMode: 'ai', segundos: 15, curto: true })
  checa('A6 roteiro que ela editou (não é mais o da IA) não é descartado', a6.texto === 'roteiro editado por ela' && !a6.descartouRoteiro)
  const a7 = textoDoFilmeGratis({ prompt: '   ', estruturado: null, ideiaDoRoteiro: null, scriptMode: 'ai', segundos: 15, curto: true })
  checa('A7 caixa vazia = texto vazio (nada a filmar)', a7.texto === '')
  const a8 = textoDoFilmeGratis({ prompt: ROTEIRO_60, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'verbatim', segundos: 35, curto: false })
  checa('A8 Kineo 1 (não é o curto): o roteiro dela segue como está', a8.texto === ROTEIRO_60 && a8.modo === 'verbatim')
  // 0211b — roteiro da IA já medido para a MESMA duração do filme grátis: fica, sem reescrever.
  const a9 = textoDoFilmeGratis({ prompt: PREVIA, estruturado: ROTEIRO_60, ideiaDoRoteiro: { ideia: IDEIA, roteiro: ROTEIRO_60, segundos: 35 }, scriptMode: 'ai', segundos: 35, curto: false, language: 'en' })
  checa('A9 (0211b) Kineo 1 na duração da tela: o roteiro da IA de 35 s fica (não vira a ideia crua), sem passar pelo escritor', a9.texto === ROTEIRO_60 && !a9.descartouRoteiro && a9.estruturar === false && a9.modo === 'ai')
  const a10 = textoDoFilmeGratis({ prompt: PREVIA, estruturado: ROTEIRO_60, ideiaDoRoteiro: { ideia: IDEIA, roteiro: ROTEIRO_60, segundos: 35 }, scriptMode: 'ai', segundos: 15, curto: true, language: 'en' })
  checa('A10 (0211b) o mesmo roteiro de 35 s no filme de 15 s: sai, a ideia volta e passa pelo escritor', a10.texto === IDEIA && a10.descartouRoteiro && a10.estruturar === true)
  const a11 = textoDoFilmeGratis({ prompt: PREVIA, estruturado: ROTEIRO_60, ideiaDoRoteiro: { ideia: IDEIA, roteiro: ROTEIRO_60 }, scriptMode: 'ai', segundos: 15, curto: true })
  checa('A11 (0211b) roteiro da IA sem duração registrada conta como outra duração (sai)', a11.texto === IDEIA && a11.descartouRoteiro)
  checa('A12 o roteiro dela que cabe vai sem escritor; a ideia em modo IA passa pelo escritor', a4.estruturar === false && a3.estruturar === true && a1.estruturar === true)
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('== B/C. o clique, executado ==')
const cliqueSrc = trecho(GC, 'onFirstFilmFree={() => {', '\n          onClose={() => setShowUpgradeModal(false)}')
checa('B0 o clique onFirstFilmFree foi achado no GenerateClient', cliqueSrc !== null)
const corpoClique = cliqueSrc ? cliqueSrc.replace(/\}\}\s*$/, '') : ''
const efeitoAnalise = trecho(GC, 'useEffect(() => { // KINEO-FILME-GRATIS-COMECA-0211\n', '    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [filmeGratisTick])')
const efeitoDespacho = trecho(GC, "useEffect(() => { // KINEO-FILME-GRATIS-COMECA-0211 — despacho único depois da análise do filme grátis\n", '    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [phase, error]) // KINEO-FILME-GRATIS-COMECA-0211')
checa('B0b os dois efeitos (análise no render seguinte, despacho único) existem', efeitoAnalise !== null && efeitoDespacho !== null)

const PROCESSANDO = ['scripting', 'analyzing', 'broll_planning', 'generating', 'fal_polling', 'avatar_polling', 'clips_ready', 'composing']
interface Cena { prompt: string; estruturado: string | null; ideiaDoRoteiro: { ideia: string; roteiro: string } | null; scriptMode: 'ai' | 'verbatim'; trialActive: boolean | null; kineo1Shown: boolean; duration: number; language: string; mode: string; aiEngine: string }
function simula(c: Cena) {
  const s = {
    eventos: [] as Array<[string, Record<string, unknown>]>, analises: [] as Array<{ texto: string; opts: Record<string, unknown>; mode: string; aiEngine: string; duration: number }>,
    despachos: 0, analiseNoClique: false, ticks: 0, modal: true, prompt: c.prompt, scriptMode: c.scriptMode, mode: c.mode, aiEngine: c.aiEngine, duration: c.duration,
  }
  const refs = {
    filmeGratisDespachoRef: { current: null as unknown }, generationInFlightRef: { current: false },
    structuredScriptRef: { current: c.estruturado }, ideiaDoRoteiroRef: { current: c.ideiaDoRoteiro },
    studioOneClickFiredRef: { current: false }, studioAutoFirePendingRef: { current: true }, verbatimOrderHoldRef: { current: false },
  }
  let resolveAnalise: () => void = () => {}
  let dentroDoClique = false
  const handleAnalyze = (texto: string, opts: Record<string, unknown>) => {
    if (dentroDoClique) s.analiseNoClique = true
    s.analises.push({ texto, opts, mode: s.mode, aiEngine: s.aiEngine, duration: s.duration })
    return new Promise<void>((r) => { resolveAnalise = r })
  }
  const clique = () => {
    dentroDoClique = true
    try {
      roda(corpoClique, {
        ...refs, phase: 'options', isProcessingPhase: (p: string) => PROCESSANDO.includes(p),
        trackEvent: (n: string, m: Record<string, unknown>) => { s.eventos.push([n, m]) }, upgradeReason: 'trial_spent', credits: 10,
        trialActive: c.trialActive, kineo1Shown: c.kineo1Shown, SEEDANCE_SHORT_SECONDS: 15, duration: c.duration, language: c.language,
        prompt: s.prompt, scriptMode: s.scriptMode,
        setShowUpgradeModal: (v: boolean) => { s.modal = v }, setMode: (m: string) => { s.mode = m }, setAiEngine: (e: string) => { s.aiEngine = e },
        setDuration: (d: number) => { s.duration = d }, setScriptMode: (m: 'ai' | 'verbatim') => { s.scriptMode = m }, setPrompt: (p: string) => { s.prompt = p },
        setFilmeGratisTick: (f: (t: number) => number) => { s.ticks = f(s.ticks) },
        textoDoFilmeGratis: helper?.textoDoFilmeGratis, roteiroCabeNoFilmeCurto,
        handleAnalyze, handleGenerateGuarded: () => { s.despachos++ }, handleGenerate: () => { s.despachos++ },
      })
    } finally { dentroDoClique = false }
  }
  // O render seguinte: o efeito da análise enxerga motor/duração/modo novos (estado da simulação).
  const renderSeguinte = () => {
    if (!efeitoAnalise) return
    roda(efeitoAnalise, { ...refs, filmeGratisTick: s.ticks, handleAnalyze })
  }
  const fase = (phase: string, error: string | null = null) => {
    if (!efeitoDespacho) return
    roda(efeitoDespacho, { ...refs, phase, error, isProcessingPhase: (p: string) => PROCESSANDO.includes(p), handleGenerateGuarded: () => { s.despachos++ } })
  }
  return { s, refs, clique, renderSeguinte, fase, terminaAnalise: () => resolveAnalise() }
}

// B — madsandreasen: Seedance 15 s do trial, roteiro de 60 s da IA guardado.
{
  const t = simula({ prompt: PREVIA, estruturado: ROTEIRO_60, ideiaDoRoteiro: { ideia: IDEIA, roteiro: ROTEIRO_60, segundos: 60 }, scriptMode: 'ai', trialActive: true, kineo1Shown: false, duration: 60, language: 'en', mode: 'cinematic_ai', aiEngine: 'seedance' })
  t.clique()
  checa('B1 o evento first_film_free_offer_clicked continua saindo (variant trial_seedance15)', t.s.eventos.length === 1 && t.s.eventos[0][0] === 'first_film_free_offer_clicked' && t.s.eventos[0][1].variant === 'trial_seedance15')
  checa('B2 a caixa fecha e o motor vira Seedance 15 s', t.s.modal === false && t.s.mode === 'cinematic_ai' && t.s.aiEngine === 'seedance' && t.s.duration === 15)
  checa('B3 o roteiro velho de 60 s sai (structuredScriptRef limpo) e a caixa volta à ideia original', t.refs.structuredScriptRef.current === null && t.s.prompt === IDEIA)
  checa('B4 a análise NÃO roda dentro do clique (leria o motor antigo)', !t.s.analiseNoClique && t.s.analises.length === 0)
  t.renderSeguinte()
  const a = t.s.analises[0]
  checa('B5 o clique começa o filme: handleAnalyze(ideia) com 15 s, modo IA, escritor primeiro, sem prévia, duração fixa', t.s.analises.length === 1 && a.texto === IDEIA && a.opts.targetSeconds === 15 && a.opts.scriptModeOverride === 'ai' && a.opts.structureFirst === true && a.opts.skipPreview === true && a.opts.fixarDuracao === true)
  checa('B6 o texto analisado NÃO é o roteiro de 60 s (nem a prévia dele)', a && a.texto !== ROTEIRO_60 && a.texto !== PREVIA)
  checa('B7 a análise roda já com Seedance 15 s no estado', a && a.mode === 'cinematic_ai' && a.aiEngine === 'seedance' && a.duration === 15)
  t.renderSeguinte()
  checa('B8 re-render não analisa de novo', t.s.analises.length === 1)
  t.fase('options') // a fase de antes do clique ainda não conta
  checa('B9 nada despacha antes de a análise começar', t.s.despachos === 0)
  t.fase('scripting'); t.fase('analyzing'); t.fase('options')
  checa('B10 análise chegou em options: o MESMO despacho do Generate (handleGenerateGuarded), uma vez', t.s.despachos === 1)
  t.fase('options'); t.fase('generating'); t.fase('options')
  checa('B11 nunca despacha duas vezes', t.s.despachos === 1)
  checa('B12 o one-click do Studio não dispara por cima', t.refs.studioOneClickFiredRef.current === true && t.refs.studioAutoFirePendingRef.current === false)
}

// C1 — noroutine2026: duplo clique.
{
  const t = simula({ prompt: IDEIA, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'ai', trialActive: true, kineo1Shown: false, duration: 35, language: 'en', mode: 'cinematic_ai', aiEngine: 'seedance' })
  t.clique(); t.clique()
  t.renderSeguinte(); t.renderSeguinte()
  checa('C1 duplo clique: um evento, uma análise', t.s.eventos.length === 1 && t.s.analises.length === 1 && t.s.ticks === 1)
  t.fase('scripting'); t.fase('options')
  checa('C1b e um despacho só', t.s.despachos === 1)
}
// C2 — partindo do Kling 3, roteiro colado em português, longo, "as is".
{
  const t = simula({ prompt: ROTEIRO_PT_DELA, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'verbatim', trialActive: true, kineo1Shown: false, duration: 60, language: 'pt', mode: 'cinematic_ai', aiEngine: 'hollywood' })
  t.clique(); t.renderSeguinte()
  const a = t.s.analises[0]
  checa('C2 de Kling 3 em pt: Seedance 15 s, o texto DELA vira a ideia em modo IA (sem recusa), nada apagado', a && a.texto === ROTEIRO_PT_DELA && a.opts.scriptModeOverride === 'ai' && a.opts.targetSeconds === 15 && a.aiEngine === 'seedance' && t.s.prompt === ROTEIRO_PT_DELA && t.s.scriptMode === 'ai')
}
// C3 — Kineo 1 grátis (conta free): começa no Kineo 1, na duração da tela.
{
  const t = simula({ prompt: IDEIA, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'ai', trialActive: false, kineo1Shown: true, duration: 35, language: 'es', mode: 'cinematic_ai', aiEngine: 'veo' })
  t.clique(); t.renderSeguinte(); t.fase('analyzing'); t.fase('options')
  const a = t.s.analises[0]
  checa('C3 Kineo 1: evento variant free, mode fast, análise de 35 s e despacho', t.s.eventos[0]?.[1].variant === 'free' && a && a.mode === 'fast' && a.opts.targetSeconds === 35 && t.s.despachos === 1)
}
// C4 — caixa vazia: só deixa a tela no motor do filme grátis.
{
  const t = simula({ prompt: '', estruturado: null, ideiaDoRoteiro: null, scriptMode: 'ai', trialActive: true, kineo1Shown: false, duration: 35, language: 'en', mode: 'cinematic_ai', aiEngine: 'kling' })
  t.clique(); t.renderSeguinte(); t.fase('options')
  checa('C4 caixa vazia: Seedance 15 s na tela, nenhuma análise, nenhum despacho', t.s.aiEngine === 'seedance' && t.s.duration === 15 && t.s.analises.length === 0 && t.s.despachos === 0)
}
// C5 — a análise falha / para: não despacha, e o próximo clique é dela.
{
  const t = simula({ prompt: IDEIA, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'ai', trialActive: true, kineo1Shown: false, duration: 35, language: 'en', mode: 'cinematic_ai', aiEngine: 'seedance' })
  t.clique(); t.renderSeguinte(); t.fase('scripting'); t.fase('failed', 'boom')
  checa('C5 análise falhou: nenhum despacho, pedido liberado', t.s.despachos === 0 && t.refs.filmeGratisDespachoRef.current === null)
  const u = simula({ prompt: IDEIA, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'ai', trialActive: true, kineo1Shown: false, duration: 35, language: 'en', mode: 'cinematic_ai', aiEngine: 'seedance' })
  u.clique(); u.renderSeguinte(); u.terminaAnalise()
  await new Promise((r) => setTimeout(r, 0))
  checa('C5b análise parou antes de começar (portão/link): pedido liberado para o próximo clique', u.refs.filmeGratisDespachoRef.current === null && u.s.despachos === 0)
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('== D. a duração do botão vence (0211b) ==')
{
  // Kineo 1 com o roteiro da IA na mesma duração — o clique analisa o roteiro, sem escritor.
  const k = simula({ prompt: PREVIA, estruturado: ROTEIRO_60, ideiaDoRoteiro: { ideia: IDEIA, roteiro: ROTEIRO_60, segundos: 35 }, scriptMode: 'ai', trialActive: false, kineo1Shown: true, duration: 35, language: 'en', mode: 'fast', aiEngine: 'seedance' })
  k.clique(); k.renderSeguinte()
  const ka = k.s.analises[0]
  checa('D1 Kineo 1 na mesma duração: analisa o roteiro aprovado (não a ideia crua), sem escritor, caixa intacta', ka && ka.texto === ROTEIRO_60 && ka.opts.structureFirst === false && k.refs.structuredScriptRef.current === ROTEIRO_60 && k.s.prompt === PREVIA)

  // O trecho REAL da diretiva colada dentro do handleAnalyze, executado com saldo 25 e "Make a 35-second video…".
  const bloco = trecho(GC, '    const leituraColada = readPastedDirectives(', '\n\n    // ═══ KINEO-ORDEM-NARRADA-2026-09-07')
  checa('D2 o trecho da diretiva colada foi achado', bloco !== null)
  const IDEIA35 = 'Make a 35-second video about why the Vikings vanished from Greenland'
  const rodaBloco = (fixarDuracao: boolean) => {
    const duracoes: number[] = []
    if (!bloco) return { duracoes, alvo: -1 }
    const alvo = roda('let alvoAnalise = 15\nconst leituraColada = readPastedDirectives(' + bloco + '\nreturn alvoAnalise', {
      readPastedDirectives, subidaQueOSaldoPaga, expandBaseRef: { current: IDEIA35 }, opcoesDeDuracao: [15, 35, 60, 90].map((v) => ({ value: v })),
      duration: 15, credits: 25, contaPagaNaSubida: false, custoDaOpcao: custoSeedance, opts: { fixarDuracao, skipPreview: true, targetSeconds: 15 },
      setDuration: (d: number) => { duracoes.push(d) }, avisarSubidaSegura: () => {}, trackEvent: () => {}, scriptMode: 'ai',
    })
    return { duracoes, alvo }
  }
  const solto = rodaBloco(false)
  checa('D3 controle: sem a trava, "35-second" com saldo 25 sobe o filme (o defeito existe)', solto.duracoes.length > 0 && solto.alvo > 15)
  const preso = rodaBloco(true)
  checa('D4 com fixarDuracao: continua 15 s (nenhum setDuration, alvo 15) — custo ' + custoSeedance(15) + ' cr, o do botão', preso.duracoes.length === 0 && preso.alvo === 15)
  checa('D5 a subida do autofit do verbatim também respeita a trava', /const sobeParaBruto = vereditoAnalise\?\.kind === 'up' && !opts\?\.fixarDuracao/.test(GC))
  checa('D6 o roteiro da IA guarda a duração que o escritor recebeu (segundos: duracaoPedida)', GC.includes('ideiaDoRoteiroRef.current = { ideia: rawSource, roteiro: source, segundos: duracaoPedida }'))
  // fluxo inteiro: 35-second na ideia, saldo 25, trial Seedance → a análise vai a 15 s fixos.
  const t = simula({ prompt: IDEIA35, estruturado: null, ideiaDoRoteiro: null, scriptMode: 'ai', trialActive: true, kineo1Shown: false, duration: 60, language: 'en', mode: 'cinematic_ai', aiEngine: 'kling' })
  t.clique(); t.renderSeguinte()
  const a = t.s.analises[0]
  checa('D7 "35-second" na ideia, saldo 25: o clique pede 15 s fixos ao handleAnalyze', a && a.opts.targetSeconds === 15 && a.opts.fixarDuracao === true && t.s.duration === 15)
}

console.log(`\n${falhas.length === 0 ? '✅' : '❌'} ${ok} verdes, ${falhas.length} vermelhas`)
if (falhas.length) process.exit(1)
