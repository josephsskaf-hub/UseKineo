// KINEO-RECUSA-BOTAO-3110 — guardião de "a recusa vira botão" (31/10). Prova:
//   (A) cada recusa REAL do gerador de filme devolve um `fix` estruturado — pelos campos que a rota manda (reason/code,
//       requested/selected/suggested_seconds, queued/parked) e, sem eles, pela própria frase (as frases conferidas na fonte);
//   (B) "high demand" com o filme ESTACIONADO (fila da queda da fal) NÃO ganha botão; sem estacionamento ganha "Retry in 2 min";
//   (C) a rota anexa o `fix` só em resposta de ERRO com conserto (sucesso / não-JSON / já com fix voltam como vieram);
//   (D) o cliente só oferece o que CABE: duração do motor, saldo (custo no rótulo), modo do texto, estrada crua;
//       sem saldo para "Make it 60s" → "Shorten to 15s for me", que reescreve SÓ o número e confere com o leitor da rota;
//   (E) a rota liga o anexador no POST; o cliente guarda o corpo da recusa, renderiza o botão nas DUAS telas de erro, reanalisa
//       com a duração/modo decididos e despacha uma vez só; o componente agenda o reenvio com Cancel;
//   (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-recusa-botao-3110.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const MARCA = 'KINEO-RECUSA-BOTAO-3110'
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const F = {
  lib: 'lib/recusaBotao.ts',
  diretrizes: 'lib/pastedDirectives.ts',
  fidelidade: 'lib/requestFidelity.ts',
  duracao: 'lib/durationByEngine.ts',
  recusaIa: 'lib/modelRefusal.ts',
  fila: 'lib/filaQuedaFal.ts',
  route: 'app/api/generate-video-cinematic/route.ts',
  client: 'app/(dashboard)/generate/GenerateClient.tsx',
  comp: 'components/RecusaBotao.tsx',
}

/** Compila lib/recusaBotao.ts (e o único import, lib/pastedDirectives.ts, que é puro). `over` troca fontes (mutantes). */
function load(over = {}) {
  const cache = {}
  const compile = (rel) => {
    if (cache[rel]) return cache[rel].exports
    const src = over[rel] ?? read(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache[rel] = mod
    const req = (spec) => {
      if (spec === './pastedDirectives') return compile(F.diretrizes)
      throw new Error(rel + ': import inesperado ' + spec)
    }
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return compile(F.lib)
}

// As frases de produção (events.metadata->>'error', 7 dias até 31/10) — conferidas contra a fonte em (A0).
const FRASES = {
  mismatch60: 'Your request asks for 60 seconds, but the selected duration is 15 seconds. Review the duration or change the request to match the shorter film before continuing. Nothing was charged.',
  mismatchPt: 'Seu pedido menciona 40 segundos, mas a duração selecionada é 15 segundos. Revise a duração ou ajuste o pedido para o filme mais curto antes de continuar. Nada foi cobrado.',
  longo: 'This script reads for about 141 seconds — too long for a 15-second film. Shorten it to about 56 words to keep the 15-second price, or pick 35 s (15 credits). Nothing was charged.',
  plano: 'This looks like a shot plan (camera), not a story to narrate. Kineo would read it out loud over the footage. Use "Just this clip (no narration)" in Studio to render exactly this shot (5 s), or write the story you want narrated.',
  pedido: 'This looks like a video request, not a finished narration. To keep your words, paste only the narration; to develop the idea, choose the AI structuring mode. Review before continuing. Nothing was charged.',
  recusouIa: 'The writer could not turn this idea into a script (the AI declined the topic). Nothing was charged — try rewording the idea, or paste your own script with "Use my script as is".',
  demanda: "We're experiencing high demand right now. Nothing started and your credits were refunded automatically.",
}

const CTX = (o = {}) => ({
  options: [15, 35, 60, 90], costFor: (d) => ({ 15: 7, 35: 15, 60: 25, 90: 35 })[d] ?? 99, credits: 100, duration: 15,
  scriptMode: 'verbatim', rawRoad: false, text: 'Create a 60-second video about the deepest cave on Earth.', ...o,
})

/** Todas as provas sobre um conjunto de fontes; devolve a lista de erros (vazia = verde). */
async function checa(over = {}) {
  const e = []
  const src = (k) => over[F[k]] ?? read(F[k])
  let L
  try { L = load(over) } catch (err) { return ['lib não compila: ' + err.message] }
  const { fixDaRecusa, anexarFixDaRecusa, resolverBotoesDaRecusa, trocarDuracaoNoTexto, textoDoConserto, SAFER_ANGLE_PREFIX, RETRY_LATER_SECONDS } = L
  const req = (c, m) => { if (!c) e.push(m) }

  // (A0) as frases que o cliente reconhece ainda são as que a fonte escreve
  req(src('fidelidade').includes('asks for ${asked} seconds, but the selected duration is ${selected} seconds'), 'A0 frase do pedido×duração mudou em lib/requestFidelity')
  req(src('fidelidade').includes('This looks like a video request, not a finished narration'), 'A0 frase do pedido-não-fala mudou')
  req(src('duracao').includes('reads for about ${Math.round(checagem.estSeconds)} seconds — too long for a ${seconds}-second film') && src('duracao').includes('or pick ${checagem.sugestao} s'), 'A0 frase do roteiro longo (motor) mudou')
  req(src('recusaIa').includes('could not turn this idea into a script (the AI declined the topic)'), 'A0 frase da IA que recusou mudou')
  req(src('route').includes('This looks like a shot plan (') && src('route').includes("reason: 'shot_spec_detected'"), 'A0 recusa do plano de câmera mudou na rota')
  req(src('route').includes("Nothing started and your credits were refunded automatically."), 'A0 frase da alta demanda mudou na rota')
  req(/requested_seconds: duration, est_speech_seconds: Math\.round\(falaCurtaDoMotor\.estSeconds\), suggested_seconds: falaCurtaDoMotor\.sugestao/.test(src('route')), 'A0 a recusa do roteiro longo não manda mais requested/suggested_seconds')
  req(src('fidelidade').includes('requested_seconds: requested, selected_seconds: selected'), 'A0 a recusa pedido×duração não manda mais requested/selected_seconds')

  // (A) estruturado
  const mm = fixDaRecusa({ error: FRASES.mismatch60, reason: 'request_duration_mismatch', code: 'request_duration_mismatch', requested_seconds: 60, selected_seconds: 15 })
  req(mm?.code === 'switch_duration' && mm.seconds === 60 && mm.alt?.code === 'match_text_duration' && mm.alt.seconds === 15 && mm.alt.askedSeconds === 60, 'A pedido 60 × escolhido 15 → Make it 60s (alt: reescrever para 15)')
  const lg = fixDaRecusa({ error: FRASES.longo, reason: 'script_too_long_for_short_film', requested_seconds: 15, est_speech_seconds: 141, suggested_seconds: 35 })
  req(lg?.code === 'shorten_for_me' && lg.seconds === 15 && lg.alt?.code === 'switch_duration' && lg.alt.seconds === 35, 'A roteiro longo → Shorten it for me (alt: 35 s)')
  req(fixDaRecusa({ error: FRASES.plano, reason: 'shot_spec_detected', clip_seconds: 5 })?.code === 'ai_structure', 'A plano de câmera → Turn this into a film')
  req(fixDaRecusa({ error: FRASES.pedido, reason: 'brief_requires_review', code: 'brief_requires_review' })?.code === 'ai_structure', 'A pedido de vídeo em "as is" → Turn this into a film')
  req(fixDaRecusa({ error: FRASES.recusouIa, reason: 'model_refused_topic' })?.code === 'safer_angle', 'A IA recusou o tema → Try a safer angle')
  req(fixDaRecusa({ error: 'x', reason: 'duration_not_offered', requested_seconds: 45, suggested_seconds: 60 })?.seconds === 60, 'A duração não oferecida → a sugerida')
  // (A) só a frase (tela que guarda o texto; servidor velho)
  const t1 = fixDaRecusa({ error: FRASES.mismatch60 })
  req(t1?.code === 'switch_duration' && t1.seconds === 60 && t1.alt?.seconds === 15, 'A frase pedido×duração (EN)')
  req(fixDaRecusa({ error: FRASES.mismatchPt })?.seconds === 40, 'A frase pedido×duração (PT)')
  const t2 = fixDaRecusa({ error: FRASES.longo })
  req(t2?.code === 'shorten_for_me' && t2.seconds === 15 && t2.alt?.seconds === 35, 'A frase do roteiro longo')
  req(fixDaRecusa({ error: FRASES.plano })?.code === 'ai_structure', 'A frase do plano')
  req(fixDaRecusa({ error: FRASES.pedido })?.code === 'ai_structure', 'A frase do pedido de vídeo')
  req(fixDaRecusa({ error: FRASES.recusouIa })?.code === 'safer_angle', 'A frase da IA que recusou')
  req(fixDaRecusa({ error: 'Something unrelated broke.' }) === null && fixDaRecusa(null) === null && fixDaRecusa('x') === null, 'A recusa sem conserto conhecido → null')
  req(fixDaRecusa({ error: FRASES.mismatch60, fix: { code: 'rm_rf', seconds: 1 } })?.code === 'switch_duration', 'A fix inválido do corpo é ignorado (cai no estruturado/frase)')

  // (B) fila
  const fila = src('fila')
  const parkedMsg = (fila.match(/export const PARKED_MESSAGE =\s*\n?\s*"([^"]+)"/) ?? [])[1] ?? ''
  req(parkedMsg.length > 40, 'B PARKED_MESSAGE legível em lib/filaQuedaFal')
  req(fixDaRecusa({ queued: true, parked: true, error: parkedMsg }) === null, 'B filme estacionado (parked:true) → sem botão')
  req(fixDaRecusa({ queued: true, error: parkedMsg }) === null && fixDaRecusa({ error: parkedMsg }) === null, 'B frase do estacionado → sem botão')
  const dq = fixDaRecusa({ queued: true, error: FRASES.demanda })
  req(dq?.code === 'retry_later' && dq.afterSec === RETRY_LATER_SECONDS && RETRY_LATER_SECONDS === 120, 'B alta demanda sem estacionar → Retry automatically em 120 s')
  req(fixDaRecusa({ error: FRASES.demanda })?.code === 'retry_later', 'B frase da alta demanda → retry_later')

  // (C) anexador
  const r422 = await anexarFixDaRecusa(new Response(JSON.stringify({ error: FRASES.plano, reason: 'shot_spec_detected' }), { status: 422, headers: { 'content-type': 'application/json', 'x-k': '1' } }))
  const b422 = await r422.json()
  req(r422.status === 422 && b422.fix?.code === 'ai_structure' && b422.reason === 'shot_spec_detected' && r422.headers.get('x-k') === '1', 'C 422 com conserto ganha fix (status, campos e cabeçalhos mantidos)')
  const r200 = new Response(JSON.stringify({ error: FRASES.plano }), { status: 200, headers: { 'content-type': 'application/json' } })
  req((await anexarFixDaRecusa(r200)) === r200, 'C sucesso volta a MESMA Response')
  const rTxt = new Response(FRASES.plano, { status: 422, headers: { 'content-type': 'text/plain' } })
  req((await anexarFixDaRecusa(rTxt)) === rTxt, 'C não-JSON volta igual')
  const rCom = new Response(JSON.stringify({ error: FRASES.plano, fix: null }), { status: 422, headers: { 'content-type': 'application/json' } })
  req((await anexarFixDaRecusa(rCom)) === rCom, 'C corpo que já tem fix volta igual')
  const rSem = new Response(JSON.stringify({ error: 'Cinematic mode is not configured.' }), { status: 500, headers: { 'content-type': 'application/json' } })
  req((await anexarFixDaRecusa(rSem)) === rSem, 'C erro sem conserto volta igual')
  const rPark = new Response(JSON.stringify({ queued: true, parked: true, error: parkedMsg }), { status: 503, headers: { 'content-type': 'application/json' } })
  req((await anexarFixDaRecusa(rPark)) === rPark, 'C estacionado volta igual (sem botão)')

  // (D) resolver
  const b1 = resolverBotoesDaRecusa(mm, CTX())
  req(b1?.primary.label === 'Make it 60s' && b1.primary.cost === 25 && b1.primary.fix.seconds === 60 && b1.secondary?.label === 'Shorten to 15s for me', 'D saldo paga → Make it 60s · 25 cr + Shorten to 15s')
  const b2 = resolverBotoesDaRecusa(mm, CTX({ credits: 10 }))
  req(b2?.primary.label === 'Shorten to 15s for me' && b2.secondary === null, 'D saldo NÃO paga 60 → o principal vira Shorten to 15s for me')
  req(resolverBotoesDaRecusa(mm, CTX({ credits: 10, text: 'A story about caves.' })) === null, 'D sem saldo e sem número no texto → nenhum botão (nunca um botão que repete a recusa)')
  req(resolverBotoesDaRecusa({ code: 'switch_duration', reason: 'request_duration_mismatch', seconds: 40 }, CTX())?.primary.fix.seconds === 60, 'D pediu 40 → a duração do seletor que cobre (60)')
  req(resolverBotoesDaRecusa({ code: 'switch_duration', reason: 'request_duration_mismatch', seconds: 60 }, CTX({ options: [35, 60, 90], duration: 60 })) === null, 'D alvo = duração atual → sem botão')
  const b3 = resolverBotoesDaRecusa(lg, CTX())
  req(b3?.primary.label === 'Shorten it for me' && b3.secondary?.label === 'Use 35s instead' && b3.secondary.cost === 15, 'D roteiro longo em "as is" → Shorten it for me + Use 35s instead · 15 cr')
  const b4 = resolverBotoesDaRecusa(lg, CTX({ scriptMode: 'ai' }))
  req(b4?.primary.label === 'Use 35s instead' && b4.secondary === null, 'D roteiro longo já em modo IA → só a duração maior')
  req(resolverBotoesDaRecusa(lg, CTX({ scriptMode: 'ai', credits: 7 })) === null, 'D roteiro longo em IA sem saldo → nenhum botão')
  req(resolverBotoesDaRecusa({ code: 'ai_structure', reason: 'shot_spec_detected' }, CTX())?.primary.label === 'Turn this into a film', 'D plano em "as is" → Turn this into a film')
  req(resolverBotoesDaRecusa({ code: 'ai_structure', reason: 'shot_spec_detected' }, CTX({ scriptMode: 'ai' })) === null, 'D plano já em modo IA → sem botão (repetiria)')
  req(resolverBotoesDaRecusa({ code: 'ai_structure', reason: 'shot_spec_detected' }, CTX({ rawRoad: true })) === null, 'D plano na estrada crua (Kling 3/H3) → sem botão (a rota recusa plano em qualquer modo)')
  req(resolverBotoesDaRecusa({ code: 'ai_structure', reason: 'brief_requires_review' }, CTX({ rawRoad: true }))?.primary.label === 'Turn this into a film', 'D pedido de vídeo na estrada crua → Turn this into a film (a rota aceita em modo IA)')
  req(resolverBotoesDaRecusa(fixDaRecusa({ error: FRASES.recusouIa }), CTX())?.primary.label === 'Try a safer angle', 'D IA recusou → Try a safer angle')
  req(resolverBotoesDaRecusa(dq, CTX())?.primary.label === 'Retry automatically in 2 min', 'D alta demanda → Retry automatically in 2 min')
  const novo = trocarDuracaoNoTexto('Create a 60-second video about the deepest cave on Earth.', 60, 15)
  req(typeof novo === 'string' && novo.includes('15 seconds') && !/60/.test(novo), 'D reescrita do número: 60-second → 15 seconds')
  req(trocarDuracaoNoTexto('Create a 60-second video about caves.', 45, 15) === null, 'D reescrita só quando o texto pede o número da recusa')
  req(textoDoConserto({ code: 'safer_angle', reason: 'x' }, 'Topic') === SAFER_ANGLE_PREFIX + 'Topic' && textoDoConserto({ code: 'safer_angle', reason: 'x' }, SAFER_ANGLE_PREFIX + 'Topic') === SAFER_ANGLE_PREFIX + 'Topic', 'D ângulo seguro: prefixo uma vez só')
  req(/respectful/i.test(SAFER_ANGLE_PREFIX), 'D ângulo seguro é honesto (respeitoso/factual, mesmo tema)')

  // (E) rota
  const route = src('route')
  const post = route.slice(route.indexOf('export async function POST('), route.indexOf('async function manipularPost('))
  req(/import \{ anexarFixDaRecusa \} from '@\/lib\/recusaBotao'/.test(route), 'E rota importa o anexador')
  req(post.indexOf('await finalizarDespacho(ctx, res)') >= 0 && post.indexOf('if (!res.ok) return await anexarFixDaRecusa(res)') > post.indexOf('await finalizarDespacho(ctx, res)') && post.indexOf('if (!res.ok) return await anexarFixDaRecusa(res)') < post.lastIndexOf('return res'), 'E POST: o finalizador lê a Response real ANTES; o fix entra só no erro, antes do return')
  // (E) cliente
  const cli = src('client')
  req(cli.includes("import RecusaBotao from '@/components/RecusaBotao'") && /fixDaRecusa, resolverBotoesDaRecusa/.test(cli), 'E cliente importa o botão e o resolvedor')
  const iFetch = cli.indexOf("res = await fetch('/api/generate-video-cinematic'")
  const iGuarda = cli.indexOf('setRecusaResposta(!res.ok ? data : null)', iFetch)
  req(iFetch > 0 && iGuarda > iFetch && iGuarda - iFetch < 2500, 'E cliente guarda o corpo da recusa logo depois do fetch do cinematic')
  req(/if \(!res\.ok\) setRecusaResposta\(data && typeof data === 'object' \? data : null\)[^\n]*\n\s*if \(!res\.ok\) \{\n\s*console\.error\('\[generate\] analyze failed:'/.test(cli), 'E cliente guarda o corpo da recusa da análise')
  const falha = cli.indexOf('{showGenericFailure && (')
  const falhaFim = cli.indexOf('View all your videos', falha)
  req(falha > 0 && cli.slice(falha, falhaFim).includes('{recusaBotaoNaTela'), 'E botão no cartão de falha (fase failed)')
  const idle = cli.indexOf("{error && phase !== 'failed' && (")
  req(idle > 0 && cli.slice(idle, idle + 600).includes('{recusaBotaoNaTela'), 'E botão no cartão de erro da análise (fase idle)')
  req(/resolverBotoesDaRecusa\(fixDaRecusa\(/.test(cli) && /costFor: \(d: number\) => costForDurationOption\(d as Duration\)/.test(cli) && /options: opcoesDeDuracao\.map/.test(cli), 'E resolvedor recebe o seletor do motor e a função que cobra')
  const ap = cli.slice(cli.indexOf('function aplicarConsertoDaRecusa('), cli.indexOf('// PUSH #38 — a live TAAFT signup'))
  req(/scriptModeOverride: 'ai', targetSeconds: segundos \}/.test(ap) && /scriptModeOverride: modo, targetSeconds: segundos \}/.test(ap),'E conserto reanalisa com a duração/modo DECIDIDOS (não o estado velho)')
  req(/structureFirst: true/.test(ap) && !/structureFirst: true, skipPreview: true/.test(ap), 'E modo IA passa pelo plano de sempre (sem skipPreview)')
  req(/if \(isProcessingPhase\(phase\)\) \{ p\.started = true; return \}/.test(ap) && /if \(phase === 'options' && !error\) handleGenerateGuarded\(\)/.test(ap) && /180_000/.test(ap), 'E despacho único: só depois da reanálise começar, só em options, expira em 3 min')
  req(/fix\.code === 'retry_later'\) \{ setError\(null\); handleGenerateGuarded\(\); return \}/.test(ap), 'E retry_later = o mesmo Retry, guardado')
  req(/refusal_fix_clicked/.test(ap) && /refusal_fix_shown/.test(cli), 'E eventos refusal_fix_shown / refusal_fix_clicked')
  // (E) componente
  const comp = src('comp')
  req(/setTimeout\(\(\) => \{\s*setAgendadoPara\(null\)\s*applyRef\.current\(primary\.fix\)/.test(comp) && /clearTimeout\(fire\)/.test(comp), 'E componente agenda o reenvio e limpa o timer ao sair')
  req(/>\s*Cancel\s*</.test(comp) && /Retrying automatically in \{relogio\}/.test(comp), 'E componente mostra o relógio e o Cancel')
  req(/onClick=\{\(\) => clique\(primary\)\}/.test(comp) && /applyRef\.current\(b\.fix\)/.test(comp), 'E clique no principal aplica o conserto')
  for (const k of ['lib', 'route', 'client', 'comp']) req(src(k).includes(MARCA), 'E marca em ' + F[k])
  return e
}

console.log('— fontes atuais —')
const erros = await checa()
for (const x of erros) ok(false, x)
ok(erros.length === 0, `todas as provas verdes (${erros.length} erro(s))`)

console.log('— mutantes (cada um precisa ficar vermelho) —')
const lib = read(F.lib)
const route = read(F.route)
const cli = read(F.client)
const comp = read(F.comp)
const MUTANTES = [
  ['rota sem anexador', { [F.route]: route.replace('    if (!res.ok) return await anexarFixDaRecusa(res)', '    // removido') }],
  ['plano de câmera sem conserto', { [F.lib]: lib.replace("if (reason === 'brief_requires_review' || reason === 'shot_spec_detected')", "if (reason === 'brief_requires_review')").replace('if (RE_PLANO_DE_CAMERA.test(err))', 'if (false)') }],
  ['estacionado ganha botão', { [F.lib]: lib.replace('if (b.parked === true) return null', 'if (false) return null').replace("if (b.queued === true && !RE_ESTACIONADO.test(err))", 'if (b.queued === true)') }],
  ['resolvedor ignora o saldo', { [F.lib]: lib.replace('if (ctx.credits !== null && Number.isFinite(cost) && cost > ctx.credits) return null', '') }],
  ['IA em modo IA (repete a recusa)', { [F.lib]: lib.replace("if (ctx.scriptMode !== 'verbatim') return null\n", '') }],
  ['reescrita sem conferir', { [F.lib]: lib.replace('if (depois !== undefined && depois > selectedSeconds) return null', '').replace('`${selectedSeconds} seconds`', '`${selectedSeconds} seconds and 60 seconds`') }],
  ['anexa em sucesso', { [F.lib]: lib.replace('if (res.ok || res.status < 400) return res', 'if (false) return res') }],
  ['cartão de falha sem botão', { [F.client]: cli.replace('              {recusaBotaoNaTela /* KINEO-RECUSA-BOTAO-3110 — a saída da recusa, em 1 clique, logo embaixo da frase */}', '') }],
  ['análise sem botão', { [F.client]: cli.replace('          {recusaBotaoNaTela /* KINEO-RECUSA-BOTAO-3110 — recusa da análise (fase idle): o mesmo botão de 1 clique */}', '') }],
  ['conserto com a duração velha', { [F.client]: cli.replace('scriptModeOverride: modo, targetSeconds: segundos }', 'scriptModeOverride: modo }') }],
  ['despacho sem esperar a reanálise', { [F.client]: cli.replace('if (!p.started) return // KINEO-RECUSA-BOTAO-3110', '// KINEO-RECUSA-BOTAO-3110').replace("if (isProcessingPhase(phase)) { p.started = true; return }", 'if (isProcessingPhase(phase)) { return }') }],
  ['componente sem Cancel', { [F.comp]: comp.replace(/>\s*Cancel\s*</, '><') }],
  ['frase da rota mudou sem o cliente', { [F.duracao]: read(F.duracao).replace(/reads for about \$\{Math\.round\(checagem\.estSeconds\)\} seconds/, 'is about ${Math.round(checagem.estSeconds)} seconds long') }],
]
for (const [nome, over] of MUTANTES) {
  const changed = Object.entries(over).every(([k, v]) => v !== read(k))
  const e = changed ? await checa(over) : ['(mutante não aplicou)']
  ok(changed && e.length > 0, `mutante "${nome}" fica vermelho (${changed ? e.length + ' erro(s)' : 'NÃO APLICOU'})`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
