// KINEO-SEEDANCE-15S-2026-09-29 — guardião do filme de 15 s no Seedance 1.5 ("vai" nominal do fundador; E2a).
// O que ele prova, executando o código real (transpile, sem alias @/) ou lendo a linha INTEIRA da fonte:
//   1. o preço do 15 s sai da função que cobra (creditCostForDuration) e cabe no crédito do trial (ambos lidos do código);
//   2. checarDuracao: 15 s (ou < 35) fora do Seedance é recusa 'only_seedance_15s'; no Seedance, 15+ ok e < 15 (ou não
//      finito) é recusa 'duration_not_offered' (revisão E2a: duration 10 pagava 5 cr por 2 clipes);
//   3. na rota do cinematic a recusa e a guarda de roteiro longo vêm ANTES do custo e do débito (mutante: mover depois = vermelho);
//   4. /api/compose e /api/compose/unlock aceitam 15 e o export limpo espelha o compose (pula a reescala só com velocidade
//      explícita ou verbatim do filme de IA — nunca por `duration === 15`);
//   5. o interruptor SEEDANCE_15S_PUBLIC nasce false (mutante: true = vermelho) e é honrado nas DUAS telas (Studio e
//      /generate) e na flag do /api/me/credits;
//   6. DEFAULT_DURATION do /generate não é 15 (o 15 fica fora de DURATION_OPTIONS);
//   7. ?duration=15 no handoff só vale com ?engine=seedance (executado).
// Revisão E2a (29/09): toda âncora de fonte é LINHA INTEIRA (temLinha), não prefixo — um sufixo `|| true` ou `* 0` na
// mesma linha passava pelo `includes`. A seção 9 prova isso com os mutantes exatos da revisão (P1, P2, P3, M-D, M-J,
// M-K, M-L) e com um sufixo `|| true` em cada âncora.
// Cada bloco tem mutante em memória que PRECISA ficar vermelho — senão o guardião não guarda nada.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}
const linhas = (src) => src.split('\n').map((l) => l.trimEnd())
const idx = (src, linha) => linhas(src).indexOf(linha)
/** A linha existe INTEIRA na fonte (nada antes, nada depois). */
const temLinha = (src, linha) => idx(src, linha) >= 0
/** Troca uma linha inteira da fonte (mutante em memória). */
const trocaLinha = (src, linha, nova) => { const L = linhas(src); const a = L.indexOf(linha); if (a < 0) return null; L[a] = nova; return L.join('\n') }

const DUR_SRC = rd('lib/durationByEngine.ts')
const COST_SRC = rd('lib/credits/engineCost.ts')
const TRIAL_SRC = rd('lib/reverseTrial.ts')
const LAUNCH_SRC = rd('lib/engineLaunch.ts')
const HANDOFF_SRC = rd('lib/creationHandoff.ts')
const ROTA = rd('app/api/generate-video-cinematic/route.ts')
const COMPOSE = rd('app/api/compose/route.ts')
const UNLOCK = rd('app/api/compose/unlock/route.ts')
const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
const STUDIO = rd('app/(dashboard)/studio/StudioClient.tsx')
const ME = rd('app/api/me/credits/route.ts')

const D = roda(DUR_SRC)
const E = roda(COST_SRC)

console.log('1) preço do 15 s e crédito do trial (lidos do código)')
const custo15 = E.creditCostForDuration('cinematic_ai', true, D.SEEDANCE_SHORT_SECONDS)
const base60 = E.creditCostFor('cinematic_ai', true)
const cap = Number(/export const TRIAL_CREDIT_CAP = (\d+)/.exec(TRIAL_SRC)?.[1])
checa('TRIAL_GRANT_CREDITS é o próprio teto (derivado, não segundo literal)', TRIAL_SRC.includes('export const TRIAL_GRANT_CREDITS = TRIAL_CREDIT_CAP'))
checa(`15 s = ceil(base de 60 s × 15/60) pela função que cobra (base ${base60} → ${custo15})`, custo15 === Math.max(1, Math.ceil(base60 * (15 / 60))))
checa(`o filme de 15 s custa 7 cr (o número do canário) — lido: ${custo15}`, custo15 === 7)
checa(`15 s cabe no crédito do trial (${custo15} ≤ ${cap})`, Number.isFinite(cap) && cap > 0 && custo15 <= cap)
checa('35 s continua NÃO cabendo no trial (o motivo do 15 s existir)', E.creditCostForDuration('cinematic_ai', true, 35) > cap)
checa('o furo que a recusa < 15 fecha existe na função que cobra: Seedance a 10 s custaria menos que a 15 s', E.creditCostForDuration('cinematic_ai', true, 10) < custo15)

console.log('2) checarDuracao / supportedDurationsFor')
function provaDuracao(M) {
  const r = []
  for (const eng of ['hollywood', 'h3', 's25', 'omni', 'kling', 'veo', 'sora']) {
    const c = M.checarDuracao(eng, 15)
    r.push(c.ok === false && c.recusa === 'only_seedance_15s' && c.sugestao === 35)
    r.push(M.checarDuracao(eng, 35).ok === true)
  }
  r.push(M.checarDuracao('hollywood', 30).ok === false) // qualquer alvo < 35 fora do Seedance
  for (const eng of ['seedance', 'cinematic_ai', null, undefined]) r.push(M.checarDuracao(eng, 15).ok === true)
  r.push(JSON.stringify([...M.supportedDurationsFor('seedance')]) === '[15,35,60,90]')
  r.push(JSON.stringify([...M.supportedDurationsFor('kling')]) === '[35,60,90]')
  r.push(JSON.stringify([...M.supportedDurationsFor('hollywood')]) === '[35,60,90]')
  return r.every(Boolean)
}
function provaPisoSeedance(M) {
  const r = []
  for (const eng of ['seedance', 'cinematic_ai', null]) {
    for (const s of [10, 14, 1, 0, -5, Infinity, -Infinity]) {
      const c = M.checarDuracao(eng, s)
      r.push(c.ok === false && c.recusa === 'duration_not_offered' && c.sugestao === 15)
    }
    for (const s of [15, 35, 60, 90]) r.push(M.checarDuracao(eng, s).ok === true)
  }
  const inf = M.checarDuracao('kling', Infinity)
  r.push(inf.ok === false && inf.sugestao === 35)
  const rec = M.checarDuracao('seedance', 10)
  r.push(typeof M.mensagemDaRecusaDeDuracao === 'function' && M.mensagemDaRecusaDeDuracao(rec).includes('15, 35, 60, 90') && M.mensagemDaRecusaDeDuracao(M.checarDuracao('kling', 15)) === M.ONLY_SEEDANCE_15S_MESSAGE)
  return r.every(Boolean)
}
checa('15 s fora do Seedance recusa (hollywood/h3/s25/omni/kling/veo/sora); no Seedance aceita', provaDuracao(D))
checa('Seedance abaixo de 15 s (10, 1, 0, negativo) ou não finito recusa "duration_not_offered" sugerindo 15; 15/35/60/90 passam', provaPisoSeedance(D))
const mutIdentidade = DUR_SRC.replace(/export function checarDuracao\(([^)]*)\): ChecagemDeDuracao \{/, 'export function checarDuracao($1): ChecagemDeDuracao {\n  return { ok: true }')
checa('mutante: checarDuracao que sempre aprova fica VERMELHO', mutIdentidade !== DUR_SRC && !provaDuracao(roda(mutIdentidade)))
const mutSeedanceTodos = DUR_SRC.replace("if (k === '' || k === 'seedance' || k === 'cinematic_ai') return true", 'return true')
checa('mutante: "todo motor é Seedance" fica VERMELHO', mutSeedanceTodos !== DUR_SRC && !provaDuracao(roda(mutSeedanceTodos)))
const mutSemPiso = DUR_SRC.replace('  if (seconds < SEEDANCE_SHORT_SECONDS && seedance) {', '  if (false) {')
checa('mutante: sem o piso de 15 s no Seedance (duration 10 passa) fica VERMELHO', mutSemPiso !== DUR_SRC && !provaPisoSeedance(roda(mutSemPiso)))
const mutInfinito = DUR_SRC.replace(/  if \(!Number\.isFinite\(seconds\)\) \{\n    return \{ ok: false,[^\n]*\n  \}/, '  if (!Number.isFinite(seconds)) return { ok: true }')
checa('mutante: não finito volta a aprovar fica VERMELHO', mutInfinito !== DUR_SRC && !provaPisoSeedance(roda(mutInfinito)))

console.log('3) guarda de roteiro longo pedido como 15 s (B4)')
const palavras = (n) => Array.from({ length: n }, (_, i) => 'w' + i).join(' ')
function provaFala(M) {
  const s = (words, extra = {}) => M.checarFalaDoFilmeCurto({ engine: 'seedance', seconds: 15, verbatim: true, narration: palavras(words), ...extra })
  return [
    s(45).ok === true,
    s(56).ok === true, // 22,4 s ≤ 22,5 s (teto do roteirista para 15 s)
    s(57).ok === false && s(57).recusa === 'script_too_long_for_short_film' && s(57).sugestao === 35,
    s(150).ok === false,
    s(150, { verbatim: false }).ok === true, // modo IA: o roteirista escreve no tamanho
    s(150, { seconds: 35 }).ok === true,
  ].every(Boolean)
}
checa('Seedance 15 s verbatim: 45/56 palavras passam; 57/150 recusam sugerindo 35 s', provaFala(D))
const mutSemGuarda = DUR_SRC.replace('if (estSeconds > limitSeconds) {', 'if (false) {')
checa('mutante: guarda de fala desligada fica VERMELHO', mutSemGuarda !== DUR_SRC && !provaFala(roda(mutSemGuarda)))
checa('a régua da guarda é a MESMA do #442 da rota (2,5 pal/s)', D.VERBATIM_EST_WORDS_PER_SECOND === Number(/const WORDS_PER_SECOND = ([\d.]+) \/\/ ~ElevenLabs at speed 1\.05 \(conservative\)/.exec(ROTA)?.[1]))
const custo35 = E.creditCostForDuration('cinematic_ai', true, 35)
const msgLonga = D.scriptTooLongForShortFilmMessage(15, 30, custo35)
checa(`recusa do roteiro longo oferece primeiro a saída que cabe (encurtar para ${D.maxWordsForShortFilm(15)} palavras) e diz o custo real de 35 s (${custo35} cr)`, D.maxWordsForShortFilm(15) === 56 && msgLonga.includes('Shorten it to about 56 words') && msgLonga.includes(`(${custo35} credits)`) && msgLonga.includes('Nothing was charged'))
checa('sem custo, a frase não inventa número', !/credits\)/.test(D.scriptTooLongForShortFilmMessage(15, 30)))

console.log('4) ordem na rota do cinematic: recusa ANTES do custo e do débito')
const L_DUR = "      const checagemDuracao = checarDuracao(typeof body.engine === 'string' ? body.engine : null, duration)"
const L_FALA = "      const falaCurta = checarFalaDoFilmeCurto({ engine: typeof body.engine === 'string' ? body.engine : null, seconds: duration, verbatim, narration: parsedScript.narration })"
const L_HOLLY = '    const hollywoodPath = wantsHollywood || wantsH3 || wantsOmni || wantsS25'
const L_VERB = '    const verbatim = (parsedScript.hasMarkers && parsedScript.segments.length > 0) || (userSaysVerbatim && !briefDetected)'
const L_COST = '    const cost = creditCostForDuration(costQuality, true, duration)'
const L_CLAIM = '    activeBirthClaim = {'
const L_DEBIT = '    const upfrontDebit = await ensureCinematicDebit(cost)'
function provaOrdem(src) {
  const i = { dur: idx(src, L_DUR), fala: idx(src, L_FALA), holly: idx(src, L_HOLLY), verb: idx(src, L_VERB), cost: idx(src, L_COST), claim: idx(src, L_CLAIM), debit: idx(src, L_DEBIT) }
  const L = linhas(src)
  const bloco = (k) => L.slice(i[k], i[k] + 6).join('\n')
  return Object.values(i).every((v) => v >= 0) &&
    i.holly < i.dur && i.dur < i.cost && i.verb < i.fala && i.fala < i.cost && i.cost < i.claim && i.claim < i.debit &&
    /if \(!checagemDuracao\.ok\) \{[\s\S]*\{ status: 422 \}/.test(bloco('dur')) && /charged: false/.test(bloco('dur')) &&
    /if \(!falaCurta\.ok\) \{[\s\S]*\{ status: 422 \}/.test(bloco('fala'))
}
checa('recusa de 15 s fora do Seedance e guarda de roteiro longo: depois do hollywoodPath/verbatim, antes do custo, do claim e do débito', provaOrdem(ROTA))
const mover = (src, linha) => { const L = linhas(src); const a = L.indexOf(linha); if (a < 0) return src; L.splice(a, 1); const d = L.indexOf(L_DEBIT); L.splice(d + 1, 0, linha); return L.join('\n') }
checa('mutante: recusa de duração movida para depois do débito fica VERMELHO', !provaOrdem(mover(ROTA, L_DUR)))
checa('mutante: guarda de roteiro longo movida para depois do débito fica VERMELHO', !provaOrdem(mover(ROTA, L_FALA)))
const L_ROTA_RECUSA = "        return NextResponse.json({ error: mensagemDaRecusaDeDuracao(checagemDuracao), reason: checagemDuracao.recusa, engine: typeof body.engine === 'string' ? body.engine : null, requested_seconds: duration, suggested_seconds: checagemDuracao.sugestao, retryable: false, charged: false, refunded: false }, { status: 422 })"
const L_ROTA_LONGA = "        return NextResponse.json({ error: scriptTooLongForShortFilmMessage(duration, falaCurta.estSeconds, creditCostForDuration('cinematic_ai', true, falaCurta.sugestao)), reason: falaCurta.recusa, requested_seconds: duration, est_speech_seconds: Math.round(falaCurta.estSeconds), suggested_seconds: falaCurta.sugestao, retryable: false, charged: false, refunded: false }, { status: 422 })"
checa('a recusa usa a frase do módulo pela razão (sem subir para 35 em silêncio)', temLinha(ROTA, L_ROTA_RECUSA) && D.ONLY_SEEDANCE_15S_MESSAGE.startsWith('15-second films are available on Seedance 1.5; pick 35 s for this engine'))
checa('a recusa do roteiro longo passa o custo de 35 s calculado pela função que debita', temLinha(ROTA, L_ROTA_LONGA))
checa('nenhuma troca silenciosa de duração pelo módulo na rota (duration = …checarDuracao)', !/duration = [^\n]*checarDuracao/.test(ROTA))
const L_B10 = [
  "      const duracoesDoResgate: readonly number[] = motorPedido === 'seedance' && seedance15sVisible(user.email)",
  "        ? supportedDurationsFor('seedance')",
  '        : DURACOES_DO_SELETOR',
  '            duracoes: duracoesDoResgate,',
  '      const DURACOES_DO_SELETOR = [35, 60, 90] as const',
]
const provaB10 = (src) => L_B10.every((l) => temLinha(src, l)) && idx(src, L_B10[0]) + 1 === idx(src, L_B10[1]) && idx(src, L_B10[1]) + 1 === idx(src, L_B10[2])
checa('B10: a recusa por saldo oferece 15 s só no Seedance e só com o interruptor (linhas inteiras e contíguas)', provaB10(ROTA))

console.log('5) compose e export limpo aceitam 15; o export limpo espelha o compose')
const lista = (src) => JSON.parse(/\nconst SUPPORTED_DURATIONS = (\[[^\]]*\]) as const\n/.exec(src)?.[1] ?? 'null')
checa('/api/compose SUPPORTED_DURATIONS tem 15 (B7: sem ele o resgate montava a 45 s)', (lista(COMPOSE) ?? []).includes(15))
checa('/api/compose/unlock SUPPORTED_DURATIONS tem 15 (B6)', (lista(UNLOCK) ?? []).includes(15))
const L_PISO = "        const requiredCredits = creditCostForDuration('cinematic_ai', true, duration)"
checa('/api/compose: piso de saldo do cinematic_ai escala pela duração (linha inteira)', temLinha(COMPOSE, L_PISO))
const L_COMPOSE_SKIP = '    } else if (explicitSpeed != null || claimVerbatim) {'
const L_UNLOCK_VERB = "    const unlockVerbatim = body.verbatim === true && rebuildQuality === 'cinematic_ai'"
const L_UNLOCK_SKIP = '    if (explicitSpeed != null || unlockVerbatim) {'
const provaEspelho = (unlock) => temLinha(COMPOSE, L_COMPOSE_SKIP) && temLinha(unlock, L_UNLOCK_VERB) && temLinha(unlock, L_UNLOCK_SKIP) && idx(unlock, L_UNLOCK_VERB) + 1 === idx(unlock, L_UNLOCK_SKIP) && !/if \(explicitSpeed != null[^\n]*duration === 15/.test(unlock)
checa('export limpo: pula a reescala nas MESMAS condições do compose (velocidade explícita ou verbatim do filme de IA), nunca por duration === 15', provaEspelho(UNLOCK))
const mutUnlock15 = trocaLinha(UNLOCK, L_UNLOCK_SKIP, '    if (explicitSpeed != null || unlockVerbatim || duration === 15) {')
checa('mutante: o atalho `duration === 15` de volta no unlock fica VERMELHO', mutUnlock15 !== null && !provaEspelho(mutUnlock15))
checa('/generate: ingrediente do export limpo guarda o 15', temLinha(GEN, '  const safeDuration = requestedDuration === 15 || requestedDuration === 45 || requestedDuration === 60 || requestedDuration === 90 ? requestedDuration : 35 // KINEO-PRIMEIRO-VIDEO-2026-09-02 — era 45'))
checa('/generate: o ingrediente leva o verbatim do cinematic (data.verbatim) e o normalizador o preserva', temLinha(GEN, '            ...(narracaoVerbatimRef.current ? { verbatim: true } : {}), // KINEO-SEEDANCE-15S-2026-09-29 (revisão E2a)') && temLinha(GEN, '        narracaoVerbatimRef.current = data.verbatim === true // KINEO-SEEDANCE-15S-2026-09-29 (revisão E2a): o MESMO campo que o compose lê no claim') && temLinha(GEN, '    ...(input.verbatim === true ? { verbatim: true } : {}), // KINEO-SEEDANCE-15S-2026-09-29 (revisão E2a)') && COMPOSE.includes('const claimVerbatim = cinematicBirthClaim?.response?.verbatim === true'))

console.log('6) interruptor e botão (Studio, /generate e /api/me/credits)')
const stubInterno = (interno) => ({ '@/lib/internalAccounts': { isInternalEmail: () => interno } })
const provaInterruptor = (src) => {
  const pub = roda(src, stubInterno(false))
  const casa = roda(src, stubInterno(true))
  return pub.SEEDANCE_15S_PUBLIC === false && pub.seedance15sVisible('qualquer@exemplo.com') === false && casa.seedance15sVisible('casa@exemplo.com') === true
}
checa('SEEDANCE_15S_PUBLIC nasce false: público não vê o botão; a casa vê', provaInterruptor(LAUNCH_SRC))
const mutLigado = LAUNCH_SRC.replace('export const SEEDANCE_15S_PUBLIC = false', 'export const SEEDANCE_15S_PUBLIC = true')
checa('mutante: interruptor ligado fica VERMELHO', mutLigado !== LAUNCH_SRC && !provaInterruptor(mutLigado))
// Reancorado 29/09 na integração com a E1 (Kineo 1 fora): a mesma linha passou a devolver também `kineo1` (resolveKineo1Flag).
const L_ME = '  return NextResponse.json({ credits: (data?.video_credits as number) ?? 0, avatar: avatarVisible(user.email), seedance15: seedance15sVisible(user.email), internal: s25Visible(user.email), kineo1, plan })'
checa('/api/me/credits devolve a flag seedance15 pelo interruptor (linha inteira)', temLinha(ME, L_ME))
const ANCORAS_STUDIO = [
  ['Studio: botão de 15 s só com Seedance escolhido e com o interruptor', "              {engine === 'seedance' && (seedance15Ok || duration === SEEDANCE_SHORT_SECONDS) && ("],
  ['Studio: trocar de motor estando em 15 volta para 35', "    if (engine !== 'seedance' && duration === SEEDANCE_SHORT_SECONDS) setDuration(MIN_DURATION_ALL_ENGINES as 35)"],
  ['Studio: ?duration=15 só com ?engine=seedance', "    } else if (requestedDuration === SEEDANCE_SHORT_SECONDS && e === 'seedance') {"],
  ['Studio: aviso do Kineo 1 mostra o custo do Seedance na duração (não 25 fixo)', "              const copy = kineo1FitNoticeCopy(engineCostLabel('seedance')) // KINEO-SEEDANCE-15S-2026-09-29 (B8): custo do Seedance na duração escolhida, não o de 60 s fixo"],
  ['Studio: a flag seedance15 vem do /api/me/credits', "      .then((d) => { if (alive && typeof d?.credits === 'number') setBalance(d.credits); if (alive && d?.internal === true) setInternal(true); if (alive && d?.avatar === true) setAvatarOn(true); if (alive && d?.seedance15 === true) setSeedance15Ok(true); if (alive && typeof d?.plan === 'string') setPlan(d.plan) })"],
  ['Studio: degrau de 15 s só no Seedance e com o interruptor', "    const degraus: readonly (15 | 35 | 60)[] = key === 'seedance' && seedance15Ok ? [60, 35, 15] : [60, 35]"],
  ['Studio: os outros cards precificam em 35+ quando o Seedance está em 15 (revisão E2a)', "  const duracaoDoCard = (key: EngineKey): number => (key === 'seedance' ? duration : Math.max(duration, MIN_DURATION_ALL_ENGINES))"],
  ['Studio: o custo do card usa a duração do card', "    creditCostForDuration(ENGINE_QUALITY[key] ?? 'cinematic_ai', true, duracaoDoCard(key))"],
  ['Studio: o degrau compara com a duração do card', '      if (d >= duracaoDoCard(key)) continue'],
]
for (const [nome, l] of ANCORAS_STUDIO) checa(nome, temLinha(STUDIO, l))
const ANCORAS_GEN = [
  ['/generate: botão de 15 s só com o interruptor (ou já em 15) — M-D', '  return seedance && (seedance15Ok || current === SEEDANCE_SHORT_SECONDS) ? [SEEDANCE_SHORT_OPTION, ...DURATION_OPTIONS] : DURATION_OPTIONS'],
  ['/generate: a flag vem de d?.seedance15, não de d?.internal — M-L', "    fetch('/api/me/credits', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d?.internal === true) setS25Ok(true); if (alive && d?.seedance15 === true) setSeedance15Ok(true) }).catch(() => {})"],
  ['/generate: trocar de motor estando em 15 volta para 35 — M-K', "    if (antes === 'seedance' && motor !== 'seedance' && duration === SEEDANCE_SHORT_SECONDS) setDuration(35)"],
  ['/generate: resgate por saldo oferece 15 só no Seedance e com o interruptor — M-J', "  const duracoesDoSeletor: Duration[] = aiEngine === 'seedance' && seedance15Ok"],
  ['/generate: fora disso, a lista global', '    : DURATION_OPTIONS.map((o) => o.value)'],
  ['/generate: cinto do auto-disparo aceita 15 só com engine=seedance', "    if ((uDur === 35 || uDur === 45 || uDur === 60 || uDur === 90 || (uDur === SEEDANCE_SHORT_SECONDS && uEng === 'seedance')) && duration !== uDur) { setDuration(uDur); return } // KINEO-SEEDANCE-15S-2026-09-29: 15 s do Studio (só Seedance)"],
  ['/generate: chip "última configuração" não oferece 15 onde o seletor não tem 15 (revisão E2a)', '    if (lastSetup.duration === SEEDANCE_SHORT_SECONDS && !opcoesDeDuracao.some((o) => o.value === SEEDANCE_SHORT_SECONDS)) return null'],
  // B3 reaplicado sobre o STUDIO-CONTADOR-VOZ (merge de 29/09): a subida a partir de 15 só acontece se o saldo pagar.
  ['/generate: ajuste automático em verbatim a partir de 15 s só sobe se o saldo pagar (B3)', '        const sobeCabeNoSaldo = sobeParaBruto === undefined || duration !== SEEDANCE_SHORT_SECONDS || credits === null || costForDurationOption(sobeParaBruto) <= credits'],
  ['/generate: a subida usa o veredito já filtrado pelo saldo', '        const sobePara = sobeCabeNoSaldo ? sobeParaBruto : undefined'],
]
for (const [nome, l] of ANCORAS_GEN) checa(nome, temLinha(GEN, l))
checa('/generate: o 15 bloqueado pelo saldo fica registrado (script_duration_autofit_unaffordable)', GEN.includes("void trackEvent('script_duration_autofit_unaffordable', {"))

console.log('7) DEFAULT_DURATION do /generate não é 15')
const opcoes = /const DURATION_OPTIONS: \{ value: Duration; label: string \}\[\] = \[([\s\S]*?)\n\]/.exec(GEN)?.[1] ?? ''
const valores = [...opcoes.matchAll(/value: (\d+)/g)].map((m) => Number(m[1]))
checa(`DURATION_OPTIONS continua 35/60/90 (lido: ${JSON.stringify(valores)})`, JSON.stringify(valores) === '[35,60,90]')
checa('DEFAULT_DURATION = primeiro botão da lista global, que não é 15', temLinha(GEN, 'const DEFAULT_DURATION: Duration = DURATION_OPTIONS[0].value') && valores[0] !== 15)
checa('o 15 entra só pela opção do Seedance (derivada do módulo, nada digitado)', GEN.includes('const SEEDANCE_SHORT_OPTION: { value: Duration; label: string } = { value: SEEDANCE_SHORT_SECONDS as Duration,'))
checa('Studio: padrão continua 60 s', temLinha(STUDIO, '  const [duration, setDuration] = useState<15 | 35 | 60 | 90>(60)'))

console.log('8) handoff: ?duration=15 só com ?engine=seedance (executado)')
function provaHandoff(src) {
  const H = roda(src)
  const q = (s) => H.readCreationHandoff(new URLSearchParams(s)).duration
  return q('duration=15') === null && q('duration=15&engine=kling') === null && q('duration=15&engine=fast') === null &&
    q('duration=15&engine=seedance') === 15 && q('duration=15&engine=Seedance') === 15 &&
    q('duration=35') === 35 && q('duration=45') === 35 && q('duration=60') === 60 && q('duration=90') === 90 && q('duration=10') === null
}
checa('handoff: 15 sem motor / com Kling / com Kineo 1 cai no padrão; 15 com Seedance fica 15; 35/45/60/90 como antes', provaHandoff(HANDOFF_SRC))
const mutHandoff = HANDOFF_SRC.replace("(rawDuration === 15 && rawEngine === 'seedance')", 'rawDuration === 15')
checa('mutante: handoff aceita 15 para qualquer motor fica VERMELHO', mutHandoff !== HANDOFF_SRC && !provaHandoff(mutHandoff))

console.log('9) âncoras de linha inteira: sufixo na mesma linha fica VERMELHO (mutantes da revisão E2a)')
const mutantesDaRevisao = [
  ['P1: flag do /api/me/credits `|| true`', ME, L_ME, L_ME.replace('seedance15: seedance15sVisible(user.email),', 'seedance15: seedance15sVisible(user.email) || true,'), (s) => temLinha(s, L_ME)],
  ['P2: resgate da rota `|| true`', ROTA, L_B10[0], L_B10[0] + ' || true', provaB10],
  ['P3: piso de saldo do compose `* 0`', COMPOSE, L_PISO, L_PISO + ' * 0', (s) => temLinha(s, L_PISO)],
  ['M-D: botão de 15 s para todos no /generate', GEN, ANCORAS_GEN[0][1], ANCORAS_GEN[0][1].replace('(seedance15Ok || current', '(true || current'), (s) => temLinha(s, ANCORAS_GEN[0][1])],
  ['M-L: flag lida de d?.internal', GEN, ANCORAS_GEN[1][1], ANCORAS_GEN[1][1].replace('d?.seedance15 === true', 'd?.internal === true'), (s) => temLinha(s, ANCORAS_GEN[1][1])],
  ['M-K: reset 15→35 desligado', GEN, ANCORAS_GEN[2][1], '    if (false) setDuration(35)', (s) => temLinha(s, ANCORAS_GEN[2][1])],
  ['M-J: resgate do /generate sem o interruptor', GEN, ANCORAS_GEN[3][1], "  const duracoesDoSeletor: Duration[] = aiEngine === 'seedance'", (s) => temLinha(s, ANCORAS_GEN[3][1])],
  ['B3: subida sem olhar o saldo', GEN, ANCORAS_GEN[7][1], '        const sobeCabeNoSaldo = true', (s) => temLinha(s, ANCORAS_GEN[7][1])],
]
for (const [nome, src, linha, nova, prova] of mutantesDaRevisao) {
  const mut = trocaLinha(src, linha, nova)
  checa(`mutante ${nome} fica VERMELHO (e a original fica verde)`, prova(src) && mut !== null && !prova(mut))
}
const todasAncoras = [[ME, L_ME], [COMPOSE, L_PISO], [UNLOCK, L_UNLOCK_SKIP], [ROTA, L_ROTA_RECUSA], ...L_B10.map((l) => [ROTA, l]), ...ANCORAS_STUDIO.map(([, l]) => [STUDIO, l]), ...ANCORAS_GEN.map(([, l]) => [GEN, l])]
const sufixoPego = todasAncoras.every(([src, l]) => { const mut = trocaLinha(src, l, l + ' || true'); return mut !== null && !temLinha(mut, l) })
checa(`sufixo \`|| true\` em cada uma das ${todasAncoras.length} âncoras de linha inteira fica VERMELHO`, sufixoPego)

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) process.exit(1)
