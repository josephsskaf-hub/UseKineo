// KINEO-FALA-NO-ENSAIO-2611 — guardião da previsão do falado no dry_run da casa (CEO 26/11). O dry_run voltava antes do bloco da fala (que mora no envio)
// e só mostrava a régua do narrado. Agora, com voice_mode 'characters', a resposta leva fala_2511 { veredito, modo, motivo, falas, segundos_dos_planos,
// palavras } pelas MESMAS peças do envio. Prova, executando o código real:
//   A. a previsão: o roteiro da CEO (Mara/Elias, elenco vazio pela prova de gente) = FAIL sem_elenco; o corpo proposto (Maria/Thomas, elenco do
//      extrator real) = PASS falado, 15 s cheios; cada motivo (não pedido, chave, língua, sem Gemini, palavras fora, pessoa real, menor, fora do formato);
//   B. a rota: a fatia do dry_run executada — só com 'characters' há chave nova; a chave do motor 'kling4'/'reserva' = sem_gemini; a fatia mora dentro do
//      dry_run da casa, antes de devolver o crédito; a resposta espalha fala_2511 e o `verdict` do narrado continua;
//   C. mutantes, contados só por AssertionError.
// Rodar: node scripts/test-fala-no-ensaio-2611.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const MOD = 'lib/cinematic/falaDosPersonagens2511.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m) // os arrays do módulo vêm de outro realm (vm): compara pelo JSON
const mundo = (muda = (_r, t) => t) => {
  const load = createOfflineLoader({ source: (rel, t) => muda(rel, t.replaceAll('\r\n', '\n')), globals: { AbortSignal } })
  return { f: load('@/' + MOD), parser: load('@/lib/scriptParser.ts'), aj: load('@/lib/cinematic/personagemAjuste.ts'), ep: load('@/lib/cinematic/elencoEpoca.ts'), rp: load('@/lib/hollywood/realPeople.ts') }
}
const CEO = `HOOK: [Pexels: Mara, a 28-year-old red-haired radio operator in a green sweater, at the lighthouse radio during a storm] Mara: There is a boat out there, Elias.
MICRO REWARD 1: [Pexels: Elias, a 65-year-old gray-bearded lighthouse keeper in a navy coat, at the lamp lever] Elias: Then we give them light.
MICRO REWARD 2: [Pexels: Mara, the 28-year-old radio operator, watching the sea from the lighthouse window] Mara: They can see us now.
PAYOFF: [Pexels: Elias the lighthouse keeper and Mara the radio operator at the window at dawn, a fishing boat safe in the harbor] Elias: They always do, when someone watches.`
const PROPOSTO = `HOOK: [Pexels: Maria, a 28-year-old red-haired woman in a green sweater, at the lighthouse radio during a storm] Maria: There is a boat out there in the storm.
MICRO REWARD 1: [Pexels: Thomas, a 65-year-old gray-bearded man in a navy coat, at the lighthouse lamp lever] Thomas: Then we give them light.
MICRO REWARD 2: [Pexels: Maria at the lighthouse window, watching the sea] Maria: They can see us now.
PAYOFF: [Pexels: Thomas and Maria at the lighthouse window at dawn, a fishing boat safe in the harbor] Thomas: They always do, when someone watches.`
const tresPlanos = (parser, r) => { const v = parser.parseUserScript(r).segments.map((s) => s.voiceover); return [v[0], v[1], v[2] + ' ' + v[3]] } // 4 seções em 3 planos (como a rota)

function prova(w, rota) {
  const { f, parser, aj, ep, rp } = w
  const E = (o) => f.ensaioDaFala2611({ pedida: true, ligada: true, ingles: true, gemini: true, estilizado: false, mencionaPessoaReal: rp.mentionsRealPerson, ...o })
  // ── A ──
  const elencoCEO = aj.elencoDoRoteiro(CEO, { generoDoNome: ep.generoDoNome })
  igual(elencoCEO, [], 'A o roteiro da CEO perde o elenco na prova de gente (a causa)')
  const rCEO = E({ falasDosPlanos: tresPlanos(parser, CEO), elenco: elencoCEO })
  assert.equal(rCEO.veredito, 'FAIL'); assert.equal(rCEO.modo, 'narrado'); assert.equal(rCEO.motivo, 'sem_elenco', 'A o roteiro da CEO = sem_elenco')
  const elenco = aj.elencoDoRoteiro(PROPOSTO, { generoDoNome: ep.generoDoNome })
  igual(elenco.map((x) => x.nome).sort(), ['Maria', 'Thomas'], 'A o corpo proposto dá as 2 fichas')
  const ok = E({ falasDosPlanos: tresPlanos(parser, PROPOSTO), elenco })
  assert.equal(ok.veredito, 'PASS', 'A o corpo proposto = PASS: ' + ok.motivo); assert.equal(ok.modo, 'falado'); assert.equal(ok.motivo, null)
  assert.equal(ok.palavras, 25, 'A 25 palavras ditas (sem os rótulos)')
  assert.equal(ok.segundos_dos_planos.length, 3); assert.equal(ok.segundos_dos_planos.reduce((a, b) => a + b, 0), 15, 'A 15 s cheios')
  igual(ok.falas.map((p) => p.map((l) => l.nome)), [['Maria'], ['Thomas'], ['Maria', 'Thomas']], 'A quem fala em cada plano')
  assert.ok(ok.falas.flat().every((l) => !/^\s*(?:Maria|Thomas)\s*:/.test(l.texto)), 'A o rótulo não entra no texto da fala')
  const planos = tresPlanos(parser, PROPOSTO)
  for (const [o, motivo] of [
    [{ pedida: false }, 'nao_pedido'], [{ ligada: false }, 'chave_desligada'], [{ ingles: false }, 'lingua'], [{ gemini: false }, 'sem_gemini'],
    [{ falasDosPlanos: ['Maria: Go.', 'Thomas: Now.', 'Maria: Yes.'] }, 'palavras_fora'],
    [{ falasDosPlanos: ['Maria: Elon Musk is out there in the storm.', planos[1], planos[2]] }, 'fala_com_pessoa_real'],
    [{ elenco: elenco.map((x) => (x.nome === 'Thomas' ? { ...x, canonica: 'Thomas, a 9-year-old boy in a navy coat' } : x)) }, 'falante_menor'],
    [{ falasDosPlanos: ['There is a boat out there in the storm.', planos[1], planos[2]] }, null],
  ]) {
    const r = E({ falasDosPlanos: planos, elenco, ...o })
    if (motivo) { assert.equal(r.motivo, motivo, 'A motivo ' + motivo); assert.equal(r.veredito, 'FAIL'); assert.equal(r.modo, 'narrado') }
    else assert.equal(r.veredito, 'FAIL', 'A fala sem rótulo = fora do formato (' + r.motivo + ')')
  }
  assert.equal(E({ falasDosPlanos: planos, elenco: [{ nome: 'Ivo', tipo: 'animal', canonica: 'Ivo, a dog' }] }).motivo, 'sem_elenco', 'A só bicho = sem elenco humano')
  // ── B ──
  const ini = rota.indexOf('      const fala2611 = '), fim = rota.indexOf("      })() : null\n", ini)
  assert.ok(ini > 0 && fim > ini, 'B a fatia está na rota (âncora)')
  const dry = rota.lastIndexOf("    if (body.dry_run === true && isDryRunAccount(user.email)) {\n", ini), dev = rota.indexOf("      const refunded = await releaseBirthClaim('dry_run_no_charge')\n      return NextResponse.json({\n        dry_run: true,\n        ...(fala2611 ? { fala_2511: fala2611 } : {}),", fim)
  assert.ok(dry > 0 && dev > fim && dev - fim < 200, 'B a fatia mora no dry_run da casa, logo antes de devolver o crédito, e a resposta espalha fala_2511')
  const js = ts.transpileModule(rota.slice(ini, fim + "      })() : null\n".length) + '\nreturn fala2611', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const corre = (body, motor, chaveGemini) => new Function('ensaioDaFala2611', 'vozPedida2511', 'body', 'motorDoFilmeGratis2511', 'cinematicAdmin', 'geminiNaEsteiraLigado', 'GEMINI_NA_ESTEIRA_2511', 'user',
    'falaDosPersonagensLigada', 'FALA_DOS_PERSONAGENS_2511', 'narrationLanguage', 'isStylizedLook', 'styleAnchor', 'desenhoInfantil', 'scenes', 'personagemElenco', 'mentionsRealPerson',
    '"use strict"; return (async () => {' + js + '})()')(f.ensaioDaFala2611, f.vozPedida2511, body, async () => motor, {}, () => chaveGemini, 'internal', { email: 'casa@example.org' },
    () => true, 'internal', { language: 'en' }, () => false, '', { ativo: false }, planos.map((v) => ({ voiceover: v })), { elenco, casting: 'ajuste' }, rp.mentionsRealPerson)
  return (async () => {
    assert.equal(await corre({ voice_mode: 'narrator' }, null, true), null, 'B narrador = nenhuma chave nova')
    assert.equal(await corre({}, null, true), null, 'B sem voice_mode = nenhuma chave nova')
    const r = await corre({ voice_mode: 'characters' }, null, true)
    assert.equal(r.veredito, 'PASS', 'B characters + Gemini ligado = PASS'); assert.equal(r.casting, 'ajuste'); assert.equal(r.motor_da_chave, null)
    for (const m of ['kling4', 'reserva']) assert.equal((await corre({ voice_mode: 'characters' }, m, true)).motivo, 'sem_gemini', 'B a chave ' + m + ' = sem_gemini')
    assert.equal((await corre({ voice_mode: 'characters' }, 'gemini', false)).veredito, 'PASS', 'B a chave gemini liga mesmo com a constante desligada')
    assert.equal((await corre({ voice_mode: 'characters' }, null, false)).motivo, 'sem_gemini', 'B sem chave e constante desligada = sem_gemini')
  })()
}

await prova(mundo(), local(ROTA))
console.log('ok  A/B no código de agora')
const MUTANTES = [
  [MOD, "  if (!humanos.length) return nao('sem_elenco')\n", ''],
  [MOD, '  if (n < faixa[0] || n > faixa[1]) return nao(\'palavras_fora\', { falas, palavras: n })\n', ''],
  [MOD, '  if (quem) return nao(quem, { falas, palavras: n })\n', ''],
  [MOD, "  if (!a.gemini) return nao('sem_gemini')\n", ''],
  [MOD, "  if (a.mencionaPessoaReal(falas.flat().map((l) => l.texto).join(' '))) return nao('fala_com_pessoa_real', { falas, palavras: n })\n", ''],
  [ROTA, "motor !== 'kling4' && motor !== 'reserva' && (motor === 'gemini' || ", '('],
  [ROTA, "vozPedida2511(body) === 'personagens' ? await (async", 'true ? await (async'],
  [ROTA, "        ...(fala2611 ? { fala_2511: fala2611 } : {}),", '       '],
]
let mortos = 0
for (const [arq, de, para] of MUTANTES) {
  assert.equal(local(arq).split(de).length - 1, 1, 'mutante não aplica: ' + de.slice(0, 90))
  try { await prova(mundo((rel, t) => (rel === arq ? t.replace(de, () => para) : t)), arq === ROTA ? local(ROTA).replace(de, () => para) : local(ROTA)); assert.fail('MUTANTE VIVO: ' + de.slice(0, 90)) }
  catch (e) { if (String(e?.message).startsWith('MUTANTE VIVO')) throw e; if (e?.code !== 'ERR_ASSERTION') throw new Error('mutante sem AssertionError: ' + de.slice(0, 60) + ' · ' + e?.message); mortos++ }
}
console.log(`ok  ${mortos}/${MUTANTES.length} mutantes mortos por AssertionError`)
console.log('PASS KINEO-FALA-NO-ENSAIO-2611')
