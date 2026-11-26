// KINEO-FALA-PARA-CLIENTE-2611 — guardião da lista do SERVIDOR para abrir a fala ao cliente (CEO 26/11; a lista 'public' da revisora 52b12696):
//   (1) a queda para o narrado não lê o rótulo "Nome:" (compose e voz do clique); (2) as falas passam pela moderação antes do pedido falado;
//   (3) o portão free15 não repara o filme falado (nem a legenda proporcional, nem a cena refeita muda); (4) o falado não gera nem guarda o TTS que não toca;
//   (5) cliente só com falante adulto pela régua única (adulto só por idade). Executa o código real (helpers, as fatias da rota e do compose, o portão).
// Rodar: node scripts/test-fala-para-cliente-2611.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const MOD = 'lib/cinematic/falaDosPersonagens2511.ts', GATE = 'lib/free15Gate.ts', GATE_SRV = 'lib/free15GateServer.ts', ROTA = 'app/api/generate-video-cinematic/route.ts', COMPOSE = 'app/api/compose/route.ts', CLIQUE = 'lib/audioNoCliqueServer.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const js = (codigo) => ts.transpileModule(codigo, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const fatia = (src, ini, fim, rotulo) => { const i = src.indexOf(ini), j = src.indexOf(fim, i); assert.ok(i > 0 && j > i, rotulo + ' (âncora)'); return src.slice(i, j + fim.length) }
const mundo = (muda = (_r, t) => t) => { const load = createOfflineLoader({ source: (rel, t) => muda(rel, t.replaceAll('\r\n', '\n')), globals: { AbortSignal } }); return { f: load('@/' + MOD), g: load('@/' + GATE), e: load('@/lib/cinematic/escritorDeDialogo2511.ts'), r: load('@/lib/cinematic/roteiroFalado2511.ts'), i: load('@/lib/meta95/ideiaNoEscritor.ts') } }
const MARCA = (modo, extra = {}) => ({ kling4_trial: { motor_do_clipe: 'gemini_omni_flash', fala_2511: { versao: 'fala_dos_personagens_2511_v1', pedida: 'characters', modo, motivo: modo === 'falado' ? null : 'gemini_caiu', ...(modo === 'falado' ? { falas: [[{ ref: 0, nome: 'Maria', texto: 'There is a boat out there in the storm.' }]] } : {}) }, ...extra } })
const GEMINI = 'google/gemini-omni-flash/v1.2/reference-to-video'
const ROTEIRO = 'Maria: There is a boat out there in the storm. Thomas: Then we give them light. Maria: They can see us now. Thomas: They always do, when someone watches.'

async function prova({ f, g, e, r, i }, ler) {
  const src = ler(ROTA)
  // ── (1) os helpers ──
  assert.equal(f.semRotulosDaFala2611(ROTEIRO), 'There is a boat out there in the storm. Then we give them light. They can see us now. They always do, when someone watches.', '1 sai o rótulo de cada fala')
  assert.equal(f.semRotulosDaFala2611('Captain Rosa: Hold the course.\nKeeper: The light is on.'), 'Hold the course.\nThe light is on.', '1 rótulo de duas palavras e pela linha')
  for (const t of ['At 10:30 the storm hit.', 'The ratio was 3:1 that night.', 'She said: run.', '']) assert.equal(f.semRotulosDaFala2611(t), t, '1 nada a tirar: ' + t)
  assert.equal(f.falaPedidaNoClaim2611(MARCA('narrado')), true); assert.equal(f.falaPedidaNoClaim2611(MARCA('falado')), true)
  for (const r of [null, {}, { kling4_trial: {} }, { kling4_trial: { fala_2511: { versao: 'outra' } } }]) assert.equal(f.falaPedidaNoClaim2611(r), false, '1 sem a fala pedida: ' + JSON.stringify(r))
  assert.equal(f.falaEnviadaNoClaim2611(MARCA('falado')), true); assert.equal(f.falaEnviadaNoClaim2611(MARCA('narrado')), false)
  // ── (1) e (4) no compose: a fatia logo depois de carregar o claim, executada ──
  const c = ler(COMPOSE)
  const tr = fatia(c, '    const falaPedida2611 = ', "voiceoverScript = semRotulosDaFala2611(voiceoverScript) || voiceoverScript\n", 'compose: a fatia do claim')
  const roda = (resposta, falModel, clips) => new Function('falaPedidaNoClaim2611', 'montagemFalada2511', 'semRotulosDaFala2611', 'cinematicBirthClaim', 'clipUrls', 'voiceoverScript0',
    js('let voiceoverScript = voiceoverScript0\n' + tr + '\nreturn { voiceoverScript, falaPedida2611, faladoPrevisto2611 }'))(f.falaPedidaNoClaim2611, f.montagemFalada2511, f.semRotulosDaFala2611, { response: resposta, falModels: [falModel] }, clips, ROTEIRO)
  const queda = roda({ ...MARCA('falado'), kling4_trial: { ...MARCA('falado').kling4_trial, gemini_queda: true } }, 'kling/v4/reference-to-video', ['https://x.test/c.mp4'])
  assert.equal(queda.voiceoverScript, f.semRotulosDaFala2611(ROTEIRO), '1 a queda do Gemini narra sem os rótulos'); assert.equal(queda.faladoPrevisto2611, false)
  const narrado = roda(MARCA('narrado'), 'kling/v4/reference-to-video', ['https://x.test/c.mp4'])
  assert.equal(narrado.voiceoverScript, f.semRotulosDaFala2611(ROTEIRO), '1 o pedido falado que nasce narrado narra sem os rótulos')
  const falado = roda(MARCA('falado'), GEMINI, ['https://x.test/c.mp4'])
  assert.equal(falado.faladoPrevisto2611, true, '4 o falado é previsto'); assert.equal(falado.voiceoverScript, ROTEIRO, '4 o falado guarda o texto (a legenda e a conferência leem as falas)')
  assert.equal(roda(MARCA('falado'), GEMINI, ['https://x.test/a.mp4', 'https://x.test/b.mp4']).faladoPrevisto2611, false, '4 dois clipes = não é o falado')
  const comum = roda({ kling4_trial: {} }, 'kling/v4/reference-to-video', ['https://x.test/c.mp4'])
  assert.equal(comum.voiceoverScript, ROTEIRO, '1 sem a fala pedida no claim: o texto de sempre, byte a byte'); assert.equal(comum.falaPedida2611, false)
  // (4) o TTS: os três pontos do compose leem o previsto, e a guarda devolve a recusa de voz (com estorno) quando a montagem não confirma
  assert.ok(c.includes("        if (!cachedVoiceover && (!audioBuffer || audioBuffer.length === 0) && !(typeof faladoPrevisto2611 !== 'undefined' && faladoPrevisto2611)) { // KINEO-FALA-PARA-CLIENTE-2611 (4)\n          audioBuffer = await generateTTS("), '4 o TTS não é gerado no falado')
  assert.ok(c.includes("      if (!cachedVoiceover && (!audioBuffer || audioBuffer.length === 0) && !(typeof faladoPrevisto2611 !== 'undefined' && faladoPrevisto2611)) { // KINEO-FALA-PARA-CLIENTE-2611 (4)\n        console.error('[compose] TTS produced an empty buffer"), '4 sem buffer no falado não é 502')
  assert.ok(c.includes("typeof faladoPrevisto2611 !== 'undefined' && faladoPrevisto2611 && !audioBuffer ? Promise.resolve({ url: '' }) : (avatarMode || hasUserVoice)"), '4 nada a guardar = sem o 502 do upload')
  assert.ok(/if \(typeof faladoPrevisto2611 !== 'undefined' && faladoPrevisto2611 && !falaMontada2511 && !voiceoverUrl\) \{[^\n]*\n      return rejectBeforeProviderSubmission\(/.test(c), '4 previsto falado sem montagem = a recusa de voz de sempre, nunca filme mudo')
  assert.ok(c.indexOf('const falaPedida2611 = ') < c.indexOf('audioBuffer = await generateTTS(scaledScript'), '4 o previsto nasce antes do TTS')
  // (1) e (4) na voz do clique: o mesmo texto sem rótulo (a mesma chave do cache) e nenhuma voz no enviado falado
  const q = ler(CLIQUE)
  assert.ok(q.includes('    const voiceoverScript = falaPedida2611 ? semRotulosDaFala2611(narracaoBruta) || narracaoBruta : narracaoBruta\n'), '1 a voz do clique sem os rótulos')
  assert.ok(q.includes('      if ((explicitSpeed != null || r.verbatim === true) && !falaEnviada2611) { // KINEO-FALA-PARA-CLIENTE-2611 (4)'), '4 o clique não aquece a voz do falado')

  // ── (2) a moderação, na cadeia real da rota ──
  const cadeia = fatia(src, "        if ('motivo' in lidas) fm2511.motivo = lidas.motivo\n", "          else { entrada2511 = g.entrada; falado2511 = lidas.falas }\n        }\n", 'rota: a cadeia da fala')
  const FALAS = [[{ ref: 0, nome: 'Maria', texto: 'There is a boat out there in the storm.' }], [{ ref: 1, nome: 'Thomas', texto: 'Then we give them light.' }]]
  const cad = async (moderar) => {
    const chamadas = { gemini: 0, moderar: [] }
    const r = await new Function('lidas', 'fm2511', 'mentionsRealPerson', 'falantes2511', 'moderateContent', 'user', 'generationId', 'fichas2511', 'vozDaFicha2511', 'estilizado2511', 'geminiFaladoDoKling4', 'wire', 'nome2511', 'ru', 'chamadas',
      '"use strict"; return (async () => { let entrada2511 = null, falado2511 = null;\n' + js(cadeia) + '\nreturn { fm2511, entrada2511, falado2511 } })()')(
      { falas: FALAS }, { motivo: 'sem_gemini' }, () => false, null, moderar === undefined ? undefined : async (a) => { chamadas.moderar.push(a); return moderar(a) }, { id: 'u1' }, 'g1', [null, null], () => 'v', false,
      () => { chamadas.gemini++; return { entrada: { prompt: 'p' } } }, { input: {} }, (n) => n, { nomes: ['Maria'], segundo: { nomes: ['Thomas'] } }, chamadas)
    return { ...r, chamadas }
  }
  const ok = await cad(async () => ({ ok: true }))
  assert.equal(ok.chamadas.gemini, 1, '2 moderação ok = o pedido falado'); assert.equal(ok.fm2511.motivo, 'sem_gemini')
  assert.equal(ok.chamadas.moderar.length, 1, '2 a moderação é chamada uma vez, antes do pedido falado'); assert.equal(ok.chamadas.moderar[0].surface, 'script'); assert.ok(ok.chamadas.moderar[0].text.includes('There is a boat') && ok.chamadas.moderar[0].text.includes('give them light'), '2 o texto moderado é o das falas')
  for (const [nome, m] of [['reprovada', async () => ({ ok: false, reason: 'flagged' })], ['fora do ar', async () => ({ ok: false, reason: 'unavailable' })], ['lança', async () => { throw new Error('x') }]]) {
    const r = await cad(m)
    assert.equal(r.fm2511.motivo, 'fala_moderada', '2 ' + nome + ' = narrado'); assert.equal(r.chamadas.gemini, 0, '2 ' + nome + ': nenhum pedido falado'); assert.equal(r.entrada2511, null)
  }

  // ── (3) o portão free15, executado ──
  const estado = () => ({ version: g.FREE15_GATE_VERSION, status: 'ready', source: { elements: [] }, captionElements: [{ type: 'text', track: 5, text: 'X' }], captionEvidence: { status: 'mismatch' }, attempted: false, reason: '', updatedAt: 0, minimumSeconds: 15 })
  const portao = async (falado) => {
    let s = estado(); const gastos = []
    const out = await g.advanceFree15Gate({ now: () => 1, read: async () => s, move: async (_p, n) => { s = n; return true }, judge: async () => null, scenes: () => [],
      submitScene: async () => { gastos.push('cena'); return 'r' }, pollScene: async () => ({ status: 'pending' }), submitRender: async () => { gastos.push('render'); return 'rr' }, pollRender: async () => ({ status: 'pending', url: null, snapshotUrl: null }),
      ...(falado === undefined ? {} : { falado: () => falado }) }, { url: 'https://x.test/f.mp4', snapshotUrl: null, durationSeconds: 15 })
    return { out, gastos, s }
  }
  const hoje = await portao(undefined)
  assert.equal(hoje.out.status, 'pending'); igual(hoje.gastos, ['render'], '3 hoje: a legenda é reparada (um render)')
  igual(await portao(false).then((x) => x.gastos), ['render'], '3 narrado = o de hoje')
  const fal = await portao(true)
  assert.equal(fal.out.status, 'failed', '3 falado: sem reparo'); assert.equal(fal.out.reason, 'caption_evidence_mismatch'); igual(fal.gastos, [], '3 falado: nenhum render nem cena')
  assert.ok(ler(GATE_SRV).includes("    falado: () => montagemFalada2511((a.claim.response?.kling4_trial ?? null) as Record<string, unknown> | null, a.claim.falModels?.[0]), // KINEO-FALA-PARA-CLIENTE-2611 (3)"), '3 o servidor do portão diz quando é falado')

  // ── (5) cliente só com falante adulto (adulto só por idade) ──
  const lidas = FALAS, nomes = [['Maria'], ['Thomas']]
  const fichas = (a, b) => [{ nome: 'Maria', nucleo: 'Maria', canonica: a }, { nome: 'Thomas', nucleo: 'Thomas', canonica: b }]
  assert.equal(f.admitirFalantes2511(lidas, fichas('Maria, a 28-year-old red-haired woman', 'Thomas, a 65-year-old gray-bearded man'), nomes, false), null, '5 dois adultos pela idade falam')
  for (const [a, b] of [['Maria, a red-haired woman', 'Thomas, a 65-year-old man'], ['Maria, aged 18 months', 'Thomas, a 65-year-old man'], ['Maria, a 28-year-old woman', 'Thomas, the old keeper']])
    assert.equal(f.admitirFalantes2511(lidas, fichas(a, b), nomes, false), 'falante_menor', '5 sem idade de adulto = narrado: ' + a + ' / ' + b)
  assert.equal(f.admitirFalantes2511(lidas, [null, null], nomes, false), 'falante_menor', '5 sem ficha = narrado (falha fechada)')
  // (5) quem fala = qual ficha: o núcleo do papel da ficha é o MESMO que o escritor grava no rótulo (corte na 1ª preposição)
  for (const papel of ['nurse in training', 'doctor on call', 'chef de cuisine', 'guard at the gate', 'lighthouse keeper', 'pirate captain', 'teacher from the village'])
    assert.equal(f.papelDaFicha2511({ nome: 'Rosa', canonica: 'Rosa, a ' + papel }), e.nucleoDoPapel2511(papel).toLowerCase(), '5 o leitor e o escritor cortam igual: ' + papel)
  { const fichasR = [{ nome: 'Rosa', nucleo: 'Rosa', canonica: 'Rosa, a 30-year-old nurse in training' }, { nome: 'Elias', nucleo: 'Elias', canonica: 'Elias, a 60-year-old lighthouse keeper' }]
    const nm = f.nomesDaFala2511([['Rosa'], ['Elias']], fichasR), lr = f.lerFalas2511(['Nurse: The storm is coming.', 'Keeper: Light the lamp.'], nm, 2)
    igual(lr.falas?.map((p) => p.map((l) => l.nome)), [['Rosa'], ['Elias']], '5 "Nurse:" (o rótulo do escritor) sai da boca da Rosa, "Keeper:" da do Elias') }

  // ── (6) decisão A [CEO 26/11]: o CLIENTE só fala com 29 palavras ditas ou mais (teto 45); abaixo, o 422 do narrado antes de despachar; a casa fica em 12 ──
  assert.equal(r.PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611, i.pisoDoPortao({ engine: 'seedance', seconds: 15, language: 'en' }), '6 o piso do cliente é o piso do narrado do grátis de 15 s')
  const secoes = (n) => { const ws = Array.from({ length: n }, (_, k) => 'word' + k); const a = ws.slice(0, Math.ceil(n / 2)), b = ws.slice(Math.ceil(n / 2)); return ['Maria: ' + a.join(' ') + '.', 'Thomas: ' + b.join(' ') + '.'] }
  const portaoFala = (n, piso) => r.roteiroFaladoNoPortao2511({ voiceMode: 'characters', ligada: true, ingles: true, secoes: secoes(n), ...(piso ? { piso } : {}) })
  for (const [n, casa, cli] of [[12, true, false], [25, true, false], [28, true, false], [29, true, true], [45, true, true], [46, false, false]]) {
    assert.equal(portaoFala(n), casa, `6 casa (piso 12), ${n} palavras`); assert.equal(portaoFala(n, r.PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611), cli, `6 cliente (piso 29), ${n} palavras`) }
  const trechoPiso = fatia(src, '    const faladoNoPortao2511 = ', '      }, { status: 422 })\n    }\n', 'rota: o portão do falado e o 422 do cliente')
  const naRota = (email, n, voz = 'characters') => new Function('roteiroFaladoNoPortao2511', 'falasDoRoteiroSemElenco2511', 'PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611', 'faladoPedido2511', 'body', 'parsedScript', 'contaDaCasaExata2511', 'user', 'NextResponse',
    js('return (() => {\n' + trechoPiso + '\nreturn { segue: faladoNoPortao2511 } })()'))(r.roteiroFaladoNoPortao2511, r.falasDoRoteiroSemElenco2511, r.PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611, voz === 'characters', { voice_mode: voz },
    { segments: secoes(n).map((v) => ({ voiceover: v })) }, (x) => x === 'casa@example.org', { email }, { json: (b, o) => ({ b, status: o?.status }) })
  for (const n of [12, 20, 28]) { const x = naRota('cliente@example.org', n); assert.equal(x.status, 422, '6 cliente com ' + n + ' palavras ditas = 422 antes de despachar'); assert.equal(x.b.reason, 'fala_curta_cliente'); assert.equal(x.b.missingWords, 29 - n); assert.equal(x.b.narrationTooShort, true) }
  for (const n of [29, 40]) assert.equal(naRota('cliente@example.org', n).segue, true, '6 cliente com ' + n + ' palavras = o falado segue')
  for (const n of [12, 25]) assert.equal(naRota('casa@example.org', n).segue, true, '6 a casa com ' + n + ' palavras = o falado segue (piso 12)')
  assert.equal(naRota('cliente@example.org', 20, 'narrator').status, undefined, '6 sem voice_mode characters: nada novo (o narrado de sempre decide)')
}
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)

await prova(mundo(), local)
console.log('ok  (1)–(5) no código de agora')
const MUTANTES = [
  [MOD, '  return t.replace(ROTULO_DA_FALA_2611, (_m, antes: string) => antes)\n', '  return t\n'],
  ['lib/cinematic/roteiroFalado2511.ts', "f.palavras >= (typeof a.piso === 'number' ? a.piso : PALAVRAS_MIN_NO_FILME_FALADO_2511)", 'f.palavras >= PALAVRAS_MIN_NO_FILME_FALADO_2511'], // o piso do cliente ignorado
  ['lib/cinematic/roteiroFalado2511.ts', 'export const PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611 = 29\n', 'export const PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611 = 24\n'], // o piso do cliente abaixo do narrado
  [ROTA, "      if (falas2611 && falas2611.palavras < PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611) return NextResponse.json({", "      if (false) return NextResponse.json({"], // o 422 do cliente some
  [ROTA, ", ...(typeof PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611 === 'number' && !contaDaCasaExata2511(user.email) ? { piso: PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611 } : {}) })", ' })'], // a rota não passa o piso do cliente
  [MOD, "  const oracao = ip2611 > 0 ? ws2611.slice(0, ip2611).join(' ') : antesDoOutro\n", '  const oracao = antesDoOutro\n'], // o corte na preposição
  [MOD, "(?:[\\p{L}\\p{N}'’-]+\\s+){0,3}", "(?:[\\p{L}'’-]+\\s+){0,3}"], // a idade escrita volta a matar o papel
  [MOD, '  return !!f && f.versao === FALA_DOS_PERSONAGENS_2511_VERSAO\n', '  return false\n'],
  [GATE, "  if (d.falado?.() === true) return finish('failed', decision.reason, media, decision.kind === 'fail' && decision.identity === true)\n", ''],
  [ROTA, ".catch(() => ({ ok: false }))).ok) fm2511.motivo = 'fala_moderada'", ".catch(() => ({ ok: true }))).ok) fm2511.motivo = 'fala_moderada'"],
  [ROTA, "        else if (typeof moderateContent === 'function' && !(await moderateContent(", "        else if (false && !(await moderateContent("],
  [COMPOSE, '    if (falaPedida2611 && !faladoPrevisto2611 && typeof semRotulosDaFala2611', '    if (falaPedida2611 && typeof semRotulosDaFala2611'],
  [COMPOSE, '    if (falaPedida2611 && !faladoPrevisto2611 && typeof semRotulosDaFala2611', '    if (false && typeof semRotulosDaFala2611'],
  [COMPOSE, " && clipUrls.filter((u) => typeof u === 'string' && u.trim()).length === 1\n    if (falaPedida2611", "\n    if (falaPedida2611"],
]
let mortos = 0
for (const [arq, de, para] of MUTANTES) {
  assert.equal(local(arq).split(de).length - 1, 1, 'mutante não aplica: ' + de.slice(0, 90))
  const muda = (rel, t) => (rel === arq ? t.replace(de, () => para) : t)
  try {
    await prova(mundo(muda), (x) => (x === arq ? local(x).replace(de, () => para) : local(x)))
    assert.fail('MUTANTE VIVO: ' + de.slice(0, 90))
  } catch (e) { if (String(e?.message).startsWith('MUTANTE VIVO')) throw e; if (e?.code !== 'ERR_ASSERTION') throw new Error('mutante sem AssertionError: ' + de.slice(0, 60) + ' · ' + e?.message); mortos++ }
}
console.log(`ok  ${mortos}/${MUTANTES.length} mutantes mortos por AssertionError`)
console.log('PASS KINEO-FALA-PARA-CLIENTE-2611')
