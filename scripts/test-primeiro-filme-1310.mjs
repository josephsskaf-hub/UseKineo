// KINEO-PRIMEIRO-FILME-2026-10-13 — guardião dos CONSERTOS 1 e 3 do diagnóstico do 1º filme
// (docs/DIAGNOSTICO-PRIMEIRO-FILME-2026-10-13.md; fundador 13/10: "tudo sim nos 3 consertos").
//
// CONSERTO 1 — pedido de 35/60/90 s que o saldo do teste (10 cr) / da região (14 cr) não paga, mas paga o filme grátis de
// 15 s do Seedance 1.5: DESCE para 15 s e gera (com nota honesta), em vez da parede de preço ou da prévia que leva ao
// /pricing. Prova EXECUTANDO lib/growth/descidaFilmeGratis.ts com a função que COBRA (lib/credits/engineCost.ts):
//   saldo 10/14 + pedido 60 s → 15 s (não parede) · saldo 0 → oferta como antes · blocked → como antes · pagante → como
//   antes · e lê os 4 pontos de chamada (servidor do /studio/create, prévia, guarda do autoanalyze, Gerar do /studio).
// CONSERTO 3 — o roteirista recusou um prompt-mestre colado: UMA nova tentativa só com a história, nunca com moderação
//   barrando, e só 1 vez. Prova EXECUTANDO lib/storyFromDirectives.ts e lendo a ordem na rota /api/generate-script.
// Mutantes no fim: cada um precisa ser pego.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { semMotor15s1510 } from './test-support/desfaz-motor-15s-1510.mjs' // reancorado KINEO-MOTOR-15S-1510
import { semRegua35a90_1410 } from './test-support/desfaz-regua-35-60-90-1410.mjs' // reancorado KINEO-REGUA-35-60-90-1410

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}
const ordem = (src, ...marcas) => { let at = -1; for (const m of marcas) { const i = src.indexOf(m, at + 1); if (i < 0 || i <= at) return false; at = i } return true }

const DESCIDA_SRC = read('lib/growth/descidaFilmeGratis.ts')
const HIST_SRC = read('lib/storyFromDirectives.ts')
const PREVIA_SRC = read('lib/scenePreview.ts')
const D = load(DESCIDA_SRC)
const H = load(HIST_SRC)
const P = load(PREVIA_SRC)
const COST = load(read('lib/credits/engineCost.ts'))
const DUR = load(read('lib/durationByEngine.ts'))
const custoSeedance = (s) => COST.creditCostForDuration('cinematic_ai', true, s)
const CURTO = DUR.SEEDANCE_SHORT_SECONDS
const CREATE = read('app/(dashboard)/studio/create/page.tsx')
const GEN = read('app/(dashboard)/generate/GenerateClient.tsx')
const STUDIO = read('app/(dashboard)/studio/StudioClient.tsx')
const SCRIPT = read('app/api/generate-script/route.ts')
const MOD = read('lib/safety/contentModeration.ts')

console.log('0 — régua de dinheiro (a função que cobra)')
ok(CURTO === 15, 'o filme curto do Seedance 1.5 é de 15 s')
ok(custoSeedance(15) <= 10 && custoSeedance(15) > 0, `15 s (${custoSeedance(15)} cr) cabe no teste de 10 e na região de 14`)
ok(custoSeedance(60) > 14 && custoSeedance(35) > 10, `60 s (${custoSeedance(60)} cr) e 35 s (${custoSeedance(35)} cr) NÃO cabem no teste`)

console.log('1 — CONSERTO 1: a decisão da descida')
const base = { engine: 'seedance', requestedSeconds: 60, balance: 10, paid: false, freeFilmEntitled: true, shortSeconds: CURTO, shortVisible: true, custoSeedance }
const dec = (over = {}) => D.decidirDescidaFilmeGratis({ ...base, ...over })
const teste60 = dec()
ok(teste60.descer === true && teste60.para === 15 && teste60.de === 60, 'teste (10 cr) + pedido 60 s → gera 15 s, não parede')
ok(dec({ balance: 14 }).descer === true, 'região (14 cr) + pedido 60 s → gera 15 s, não prévia')
ok(dec({ requestedSeconds: 35 }).descer && dec({ requestedSeconds: 90 }).descer, '35 s e 90 s também descem')
ok(dec({ engine: 'cinematic_ai' }).descer, "o motor na forma 'cinematic_ai' (o /studio/create) também")
ok(dec({ balance: 0 }).motivo === 'short_not_affordable' && !dec({ balance: 0 }).descer, 'saldo 0 → não desce: a oferta como antes')
ok(!dec({ balance: custoSeedance(15) - 1 }).descer, 'quem já usou o grátis (saldo abaixo dos 15 s) → oferta como antes')
ok(dec({ balance: custoSeedance(15) }).descer, 'saldo exatamente no custo dos 15 s desce')
ok(dec({ freeFilmEntitled: false }).motivo === 'not_entitled', "blocked/sem direito ao grátis → como antes (a regra de quem tem grátis não muda)")
ok(dec({ freeFilmEntitled: null }).descer === false, 'direito desconhecido não desce (falha fechada)')
ok(dec({ paid: true }).motivo === 'paid_or_unknown' && dec({ paid: null }).descer === false, 'pagante (ou plano não lido) → como antes')
ok(dec({ balance: 500 }).motivo === 'balance_pays_requested', 'saldo que paga o pedido → nada muda')
ok(dec({ balance: null }).motivo === 'balance_unknown', 'saldo desconhecido → nada muda')
ok(dec({ engine: 'kling' }).motivo === 'not_seedance' && dec({ engine: 'fast' }).descer === false, 'outro motor → nada muda')
ok(dec({ requestedSeconds: 15 }).motivo === 'not_longer', 'já em 15 s → nada muda')
ok(dec({ shortVisible: false }).motivo === 'short_hidden', 'sem o botão de 15 s para a conta → nada muda')
ok(D.lerDescidaDaUrl('60', 15) === 60 && D.lerDescidaDaUrl('15', 15) === null && D.lerDescidaDaUrl('<x>', 15) === null && D.lerDescidaDaUrl('9999', 15) === null, 'free_film_from lido só quando plausível')
ok(D.duracaoPedidaDaUrl('45') === 35 && D.duracaoPedidaDaUrl('60') === 60 && D.duracaoPedidaDaUrl(null) === null, 'duração da URL como o /studio/create a lê (45 → 35)')
ok(D.DESCIDA_FILME_GRATIS_EVENT === 'trial_downshift_to_free_film', 'evento trial_downshift_to_free_film')

console.log('2 — a nota honesta')
const nota = D.notaDaDescida({ language: 'en', shortSeconds: 15, fullSeconds: 60, price: { full: '$19.90', firstMonth: '$15.92' } })
ok(nota === 'Your free 15-second film — want the full 60 s version? Creator $15.92 first month.', 'nota em inglês com o 1º mês')
ok(/\$19\.90\/month/.test(D.notaDaDescida({ language: 'en', shortSeconds: 15, fullSeconds: 60, price: { full: '$19.90', firstMonth: null } })), 'sem 1º mês com desconto: preço cheio, nunca um desconto inventado')
ok(/grátis de 15 segundos/.test(D.notaDaDescida({ language: 'pt', shortSeconds: 15, fullSeconds: 60, price: { full: 'x', firstMonth: 'y' } })), 'pt')
ok(/gratis de 15 segundos/.test(D.notaDaDescida({ language: 'xx', shortSeconds: 15, fullSeconds: 60, price: { full: 'x', firstMonth: 'y' } })) === false, 'língua desconhecida cai no inglês')
ok(!/\$\d/.test(DESCIDA_SRC), 'nenhum preço digitado no módulo (vem de buyCreatorPrice)')
ok(/notaDaDescida\(\{ language, shortSeconds: SEEDANCE_SHORT_SECONDS, fullSeconds: BUY_CREATOR_FILM_SECONDS, price: buyCreatorPrice\(\) \}\)/.test(GEN), 'a tela usa buyCreatorPrice + BUY_CREATOR_FILM_SECONDS (o mesmo do bloco pós-filme)')
ok(/freeFilmFrom !== null && phase !== 'done' && phase !== 'failed' && mode === 'cinematic_ai' && aiEngine === 'seedance' && duration === SEEDANCE_SHORT_SECONDS/.test(GEN), 'a nota só aparece no filme de 15 s e some no filme pronto (lá fica o FilmReady60sUpsell)')

console.log('3 — os pontos de chamada')
// servidor do /studio/create: a descida vem DEPOIS da ativação do trial e ANTES da prévia
ok(ordem(CREATE, 'await maybeActivateReverseTrial({', 'decidirDescidaFilmeGratis({', 'redirect(`/studio/create?${descidaQuery.toString()}`)', 'shouldRouteGenerateToPreview({'), '/studio/create: ativação do trial → descida → prévia')
ok(/freeFilmEntitled: descidaPerfil \? isTrialActive\(descidaPerfil\) \|\| regionFreeFilmEligibility\(descidaPerfil\) === 'eligible' : null/.test(CREATE), 'o direito ao grátis é o MESMO do cinematic (isTrialActive | regionFreeFilmEligibility)')
ok(/!firstParam\(searchParams, 'create_intent'\) && !firstParam\(searchParams, 'resume'\)/.test(CREATE), 'criação automática e retomada não descem (decidem a própria duração)')
ok(/name: DESCIDA_FILME_GRATIS_EVENT, userId: user\.id/.test(CREATE), 'evento de servidor com user_id')
ok(/descidaQuery\.set\('duration', String\(descida\.para\)\)/.test(CREATE) && /descidaQuery\.set\(DESCIDA_FILME_GRATIS_PARAM, String\(descida\.de\)\)/.test(CREATE), 'a URL nova leva duration=15 e free_film_from=<pedido>')
ok(!/descidaQuery[^\n]*slice\(0, 2000\)/.test(CREATE), 'o prompt viaja inteiro no redirect (sem o corte de 2.000 do createPath)')
// prévia
const elig = { trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 14 }
const params = { studio: '1', autoanalyze: '1', prompt: 'the lost city under the ice' }
ok(P.shouldRouteGenerateToPreview({ profile: elig, params, filmCost: custoSeedance(60), freeShortFilmCost: custoSeedance(15) }) === false, 'prévia: região com 14 cr e pedido Seedance 60 s NÃO vai para a prévia')
ok(P.shouldRouteGenerateToPreview({ profile: { ...elig, video_credits: 5 }, params, filmCost: custoSeedance(60), freeShortFilmCost: custoSeedance(15) }) === true, 'prévia: quem já gastou o grátis (5 cr) segue na prévia como antes')
ok(P.shouldRouteGenerateToPreview({ profile: elig, params, filmCost: 88 }) === true, 'prévia: sem o custo do curto (outro motor), como antes')
ok(/freeShortFilmCost: engineParam === 'seedance' && seedance15sVisible\(user\.email\)/.test(CREATE), 'o /studio/create só passa o custo do curto em pedido Seedance')
// guarda do autoanalyze
ok(ordem(GEN, "} else if (outOfCredits()) {", 'decidirDescidaFilmeGratis({', 'setDuration(descida.para as Duration)', 'setAutoWaitTick((t) => t + 1)', "void trackEvent('wall_before_script'"), 'autoanalyze: a descida vem ANTES da parede wall_before_script')
ok(/freeFilmEntitled: trialActive === true/.test(GEN) && /paid: planTier === null \? null : hasPaid \|\| isStarter \|\| isCreator \|\| isStudio/.test(GEN), 'autoanalyze: só teste ativo e conta comprovadamente não pagante')
ok(GEN.includes("const uDur = freeFilmDownshiftRef.current ? duration : Number(searchParams?.get('duration') ?? '') // KINEO-PRIMEIRO-FILME-2026-10-13"),'o disparo do Studio não devolve a duração da URL por cima da descida')
// Gerar do /studio
ok(ordem(STUDIO, 'const generate = () => {', 'const q = new URLSearchParams({', 'decidirDescidaFilmeGratis({', "q.set('duration', String(descida.para)); q.set(DESCIDA_FILME_GRATIS_PARAM", "router.push(`/studio/create?${q.toString()}`)"), '/studio: o Gerar despacha 15 s com free_film_from')
ok(/estrelaLigada \? null : decidirDescidaFilmeGratis\(\{ engine, requestedSeconds: duration, balance, paid: contaPaga, freeFilmEntitled: trialOn === true/.test(STUDIO), '/studio: só teste ativo, não pagante; com a estrela, nada muda')

console.log('4 — CONSERTO 3: a história sem as diretivas')
const colado = `Create a cinematic vertical video (9:16), exact duration: 60 seconds.
Style: dark, moody, realistic
Camera: slow dolly in
SCENE 1 — 00:00–00:03: A lonely lighthouse keeper climbs the stairs during a storm.
SCENE 2 — 00:03–00:08: He finds a letter from his missing daughter on the lamp.
Voiceover: "Every night for twenty years, he lit the lamp for her."
Music: tense strings
Use my uploaded photo as the main character.`
const h = H.historiaSemDiretivas(colado)
ok(h.story === 'A lonely lighthouse keeper climbs the stairs during a storm.\nHe finds a letter from his missing daughter on the lamp.\n"Every night for twenty years, he lit the lamp for her."', 'só a história fica (cenas sem marcador, narração sem rótulo)')
ok(!/9:16|Style|Camera|SCENE|00:0|uploaded photo|Music/i.test(h.story), 'nenhuma diretiva sobra')
const pt = H.historiaSemDiretivas('Cena 1 (0-3s): Uma menina encontra um gato\n[00:03-00:06] O gato fala com ela\nDuração: 60 segundos\nFormato: 9:16')
ok(pt.story === 'Uma menina encontra um gato\nO gato fala com ela', 'português: marcadores e rótulos saem')
const t1 = H.decidirNovaTentativaDoRoteiro(colado)
ok(t1.tentar === true && t1.words >= H.HISTORIA_MIN_WORDS, 'prompt-mestre com história → tenta de novo')
ok(H.decidirNovaTentativaDoRoteiro('The story of the lost city of Atlantis and why it vanished').tentar === false, 'ideia sem diretiva → não tenta (a recusa era sobre o tema)')
ok(H.decidirNovaTentativaDoRoteiro('Style: dark\nCamera: fast').tentar === false, 'só diretiva, sem história → não tenta')
ok(H.SCRIPT_DECLINED_RETRY_EVENT === 'script_declined_retry', 'evento script_declined_retry')

console.log('5 — CONSERTO 3: a rota')
ok(ordem(SCRIPT, 'if (looksLikeModelRefusal(script)) {', 'decidirNovaTentativaDoRoteiro(topic)', 'await moderateContent({', 'openai.chat.completions.create(', "'Write a viral YouTube Short script about this topic:\\n\\n' + novaTentativa.story", 'return await recusar(422, { error: MODEL_REFUSAL_MESSAGE'), 'recusa → decide → moderação → UMA chamada só com a história → recusa original se falhar')
ok(/if \(!moderacao\.ok\) \{[^\n]*\n\s*await rastroDaTentativa\('skipped'/.test(SCRIPT), 'moderação barrando (ou fora do ar) → sem nova chamada')
const blocoRecusa = SCRIPT.slice(SCRIPT.indexOf('if (looksLikeModelRefusal(script)) {'), SCRIPT.indexOf('tentativaDaHistoria = true'))
ok((blocoRecusa.match(/chat\.completions\.create/g) || []).length === 1, 'só 1 nova tentativa no bloco da recusa')
ok(ordem(SCRIPT, 'if (!tentativaDaHistoria) { // KINEO-PRIMEIRO-FILME-2026-10-13', '    if (missing.length > 0 || payoffIsEmpty(script) || curtoParaOAlvo(script) || longoParaOFilmeCurto(script)) {', "console.warn('[generate-script] regenerate failed:'", '    } // KINEO-PRIMEIRO-FILME-2026-10-13 — fim do', '// KINEO-ROTEIRO-CURTO-15S-2026-09-29 — a trava final'), 'depois da tentativa da história, sem 3ª chamada (teto de 60 s da rota); o fecho determinístico do curto segue fora do bloco')
{
  // tiradas as linhas marcadas, a rota volta à base byte a byte (o padrão das levas de hoje)
  let base = ''
  try { base = (await import('node:child_process')).execFileSync('git', ['-C', ROOT, 'show', 'origin/main:app/api/generate-script/route.ts'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n') } catch { base = '' }
  const desfaz = (t) => semMotor15s1510(semRegua35a90_1410(t), 'route').split('\n').filter((l) => !l.includes('KINEO-PRIMEIRO-FILME-2026-10-13')).join('\n') // reancorado KINEO-MOTOR-15S-1510: o resgate de 15/10 sai antes (guardião próprio) · reancorado KINEO-REGUA-35-60-90-1410: a régua de 35/60/90 s sai antes
  ok(base !== '' && desfaz(SCRIPT) === desfaz(base), '/api/generate-script: tiradas as linhas marcadas, a rota é byte a byte a da base')
}
ok(/name: SCRIPT_DECLINED_RETRY_EVENT, userId: user\.id/.test(SCRIPT) && /rastroDaTentativa\(historiaAceita \? 'ok' : 'failed'/.test(SCRIPT), 'evento de servidor com ok/failed')
ok(/\| 'script' \/\/ KINEO-PRIMEIRO-FILME-2026-10-13/.test(MOD), "superfície 'script' na moderação")
ok(/\[TRAVA 8\.2 — vai do fundador 13\/10 'tudo sim nos 3 consertos'\]/.test(SCRIPT) && /\[TRAVA 8\.2 — vai do fundador 13\/10 'tudo sim nos 3 consertos'\]/.test(GEN), 'selo da trava nas mudanças do fluxo de geração')

console.log('6 — mutantes')
const mut = (src, de, para) => { if (!src.includes(de)) throw new Error('mutante não aplicou: ' + de.slice(0, 60)); return src.replace(de, para) }
{
  const M = load(mut(DESCIDA_SRC, "if (f.freeFilmEntitled !== true) return nao('not_entitled')", ''))
  ok(M.decidirDescidaFilmeGratis({ ...base, freeFilmEntitled: false }).descer === true, 'mutante pego: sem a trava do direito, conta sem grátis desceria')
}
{
  const M = load(mut(DESCIDA_SRC, "if (f.paid !== false) return nao('paid_or_unknown')", ''))
  ok(M.decidirDescidaFilmeGratis({ ...base, paid: true }).descer === true, 'mutante pego: sem a trava de pagante, assinante desceria')
}
{
  const M = load(mut(DESCIDA_SRC, 'custoCurto > f.balance', 'custoCurto > f.balance + 100'))
  ok(M.decidirDescidaFilmeGratis({ ...base, balance: 0 }).descer === true, 'mutante pego: sem a conta do saldo dos 15 s, saldo 0 desceria')
}
{
  const M = load(mut(PREVIA_SRC, 'balance >= args.freeShortFilmCost) return false', 'balance >= args.freeShortFilmCost) return balance < cost'))
  ok(M.shouldRouteGenerateToPreview({ profile: elig, params, filmCost: custoSeedance(60), freeShortFilmCost: custoSeedance(15) }) === true, 'mutante pego: sem a saída do curto, a região iria para a prévia')
}
{
  const M = load(mut(HIST_SRC, 'if (ROTULO_DIRETIVA_RE.test(l) || PEDIDO_DE_PRODUCAO_RE.test(l)) { removedLines++; continue }', ''))
  ok(/Style|Camera/.test(M.historiaSemDiretivas(colado).story), 'mutante pego: sem o filtro, as diretivas voltariam à história')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
