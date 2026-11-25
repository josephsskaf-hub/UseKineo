// KINEO-CAMERA-POR-SECAO-2511 — guardião (sem rede, sem custo). O 1º ensaio da câmera (CEO 25/11 16:33, 8 dry_runs da casa pelo caminho A2) deu 0 de 16 planos
// com deslocamento dizendo onde a câmera está. CAUSA provada no código: a regra da câmera chegava ao sistema da chamada POR SEÇÃO (a do filme grátis de 15 s), mas
// no meio; a regra do plano da fala vinha depois e mandava o contrário ("Do not name a camera move, lens or shot type … Describe only what is seen"). A conta do
// ensaio é a casa exata (o A2 só liga para isDryRunAccount = o e-mail do fundador, que está em INTERNAL_EXACT_EMAILS): a chave estava ligada.
// Prova:
//   A. a regra do plano da fala COM a câmera: a exceção escrita, sem "Describe only what is seen", a regra da câmera por último; sem exemplo nem lista de verbos;
//      sem a chave = REGRA_DO_PLANO_DA_FALA de sempre (a linha "Do not name a camera move…" inteira, byte a byte);
//   B. o descritor REAL da rota (generateCinematicDescriptions, executado com um openai falso): chamada por seção + política marcada = o sistema termina com a
//      regra COM a câmera e o carimbo conta 1; sem a marca = sistemaPorSecao + REGRA_DO_PLANO_DA_FALA (a main) e conta 0; chamada das cenas = o sistema de sempre;
//   C. o caminho do filme grátis de 15 s: a chamada por seção (descricoesDasSecoesK4) e o pedido de novo (completarDescricoes1911) levam a política DO PEDIDO,
//      marcada antes; o dry_run do ensaio devolve o carimbo camera_2511 (versão, chave, política marcada, chamadas com a regra);
//   D. o pacote do ensaio: generationId válido e novo em cada corpo; a fala cabe em 15 s (régua clássica e teto do filme curto); 40 seções, 20 com deslocamento.
// Rodar: node scripts/test-camera-por-secao-2511.mjs (ou npx tsx)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const K = 'lib/kling4PlanoDaFala1911.ts', R = 'app/api/generate-video-cinematic/route.ts', P = 'scripts/test-support/camera-no-deslocamento-2511-casos.mjs'
const lf = (t) => t.replace(/\r\n/g, '\n')
const local = (f) => lf(readFileSync(f, 'utf8'))
const LINHA_SEM_CAMERA = '\n- Do not name a camera move, lens or shot type: the editor sets the framing of every shot. Describe only what is seen: who, doing what, where.'

// O descritor REAL da rota, com as dependências de fora trocadas por dublês (o openai grava o sistema de cada chamada).
function descritor(rota, k, chamadas) {
  const ini = rota.indexOf('async function generateCinematicDescriptions('), fim = rota.indexOf('\n}\n', ini)
  assert.ok(ini > 0 && fim > ini, 'o trecho do descritor')
  const js = ts.transpile(rota.slice(ini, fim + 2), { target: ts.ScriptTarget.ES2022 })
  const marcadas = new WeakSet(), enviadas = new WeakMap()
  const escopo = {
    openai: { chat: { completions: { create: async (req) => { chamadas.push(req.messages[0].content); const n = (req.messages[1].content.match(/^Scene /gm) ?? []).length
      return { choices: [{ message: { content: JSON.stringify({ descriptions: Array.from({ length: n }, (_, i) => `A described shot number ${i + 1} for the test.`) }) } }] } } } } },
    sistemaPorSecao: k.sistemaPorSecao, REGRA_DO_PLANO_DA_FALA: k.REGRA_DO_PLANO_DA_FALA, REGRA_DO_PLANO_DA_FALA_COM_CAMERA_2511: k.REGRA_DO_PLANO_DA_FALA_COM_CAMERA_2511,
    REGRA_DA_CAMERA_2511: k.REGRA_DA_CAMERA_2511, CAMERA_NO_DESLOCAMENTO_POLITICAS_2511: marcadas, CAMERA_POR_SECAO_ENVIADA_2511: enviadas, PISTA_DE_CLIMA_2511: new WeakSet(),
    temMarcaDeBusca: () => false, REGRA_DA_PISTA: '', REGRA_DA_PISTA_CLIMA_2511: '', visualDescriptionDirection: () => 'photoreal.', aspectSpec: () => ({ promptFraming: 'vertical 9:16' }),
    NO_TEXT_OBJECT_DIRECTION: 'no text', REGRAS_DO_ESCRITOR_DE_CENAS: '- writer rules',
  }
  const proxy = new Proxy(escopo, { has: (o, p) => p in o, get: (o, p) => o[p] })
  // eslint-disable-next-line no-new-func
  const gerar = new Function('escopo', `with (escopo) { ${js}\n return generateCinematicDescriptions }`)(proxy)
  return { gerar, marcadas, enviadas }
}

async function suite(change) {
  const muda = (rel, t) => (change && rel === change[0] ? t.split(change[1]).join(change[2]) : t)
  const k = createOfflineLoader({ env: { OPENAI_API_KEY: 'k' }, source: (rel, t) => muda(rel, t) })('@/' + K)
  const rota = muda(R, local(R))

  // ── A. a regra ─────────────────────────────────────────────────────────────────────────────
  const com = k.REGRA_DO_PLANO_DA_FALA_COM_CAMERA_2511, sem = k.REGRA_DO_PLANO_DA_FALA
  assert.ok(sem.includes(LINHA_SEM_CAMERA), 'A sem a chave: a linha "Do not name a camera move" de sempre')
  assert.ok(!com.includes('Describe only what is seen'), 'A com a chave: sem "Describe only what is seen" (o que derrubava a regra)')
  assert.ok(com.includes('The one exception is where the camera stands, which the KINEO-CAMERA-NO-DESLOCAMENTO-2511 rule asks for.'), 'A a exceção escrita')
  const ultima = com.split('\n').pop()
  assert.ok(ultima.startsWith('- KINEO-CAMERA-POR-SECAO-2511: ') && ultima.includes(k.REGRA_DA_CAMERA_2511.replace(/^KINEO-CAMERA-NO-DESLOCAMENTO-2511: /, '')), 'A a regra da câmera é a ÚLTIMA linha')
  assert.ok(ultima.includes('in an item where nobody travels, say nothing about the camera'), 'A parado = nada de câmera')
  assert.equal(com.replace(/\n- KINEO-CAMERA-POR-SECAO-2511: [^\n]*$/, '').replace(/ Describe what is seen: who, doing what, where\. The one exception is where the camera stands, which the KINEO-CAMERA-NO-DESLOCAMENTO-2511 rule asks for\./, ' Describe only what is seen: who, doing what, where.'), sem, 'A tirando a exceção e a última linha = a regra de sempre')
  assert.ok(!/"|e\.g\.|for example|such as|stair|climb|walk|run\b|enter|exit|descend/i.test(ultima + ' The one exception is where the camera stands'), 'A sem exemplo e sem lista de verbos (o que é novo)')
  assert.equal(k.CAMERA_POR_SECAO_2511_VERSAO, 'camera_por_secao_2511_v1')

  // ── B. o descritor real ───────────────────────────────────────────────────────────────────────
  const secoes = [{ voiceover: 'Elias climbs the stairs.', stockSearchQuery: 'stairs', description: '' }, { voiceover: 'The lamp waits.', stockSearchQuery: 'lamp', description: '' }]
  { const chamadas = [], d = descritor(rota, k, chamadas), pol = { mode: 'character_story' }; d.marcadas.add(pol)
    await d.gerar(secoes, 'Topic', pol, undefined, null, true, true)
    assert.equal(chamadas.length, 1)
    assert.ok(chamadas[0].endsWith(com), 'B por seção + marcada: o sistema termina com a regra COM a câmera')
    assert.ok(!chamadas[0].includes('Describe only what is seen'), 'B por seção + marcada: nada manda calar a câmera')
    assert.ok(chamadas[0].lastIndexOf('KINEO-CAMERA-POR-SECAO-2511') > chamadas[0].lastIndexOf('Do not name a camera move'), 'B a câmera vem DEPOIS da linha do enquadramento')
    assert.equal(d.enviadas.get(pol), 1, 'B o carimbo conta a chamada') }
  { const chamadas = [], d = descritor(rota, k, chamadas), pol = { mode: 'character_story' }
    await d.gerar(secoes, 'Topic', pol, undefined, null, true, true)
    assert.ok(chamadas[0].endsWith(sem) && !chamadas[0].includes('KINEO-CAMERA'), 'B por seção sem a marca: a regra de sempre (a main)')
    assert.equal(d.enviadas.get(pol) ?? 0, 0, 'B sem a marca: carimbo 0') }
  { const chamadas = [], d = descritor(rota, k, chamadas), pol = { mode: 'character_story' }; d.marcadas.add(pol)
    await d.gerar(secoes, 'Topic', pol, undefined, null, true, false)
    assert.ok(!chamadas[0].includes('KINEO-PLANO-DA-FALA-1911') && !chamadas[0].includes('KINEO-CAMERA-POR-SECAO-2511'), 'B chamada das cenas: sem o plano da fala nem a câmera por seção')
    assert.equal(d.enviadas.get(pol) ?? 0, 0, 'B chamada das cenas: carimbo 0') }

  // ── C. o caminho do filme grátis de 15 s ──────────────────────────────────────────────────────────
  const iMarca = rota.indexOf("if (typeof cameraNoDeslocamento2511 !== 'undefined' && cameraNoDeslocamento2511) CAMERA_NO_DESLOCAMENTO_POLITICAS_2511.add(classicVisualPolicy)")
  const iSecao = rota.indexOf('? generateCinematicDescriptions(secoesParaODescritor(parsedScript.segments), kling4DescritorForte1911 ? topicoDoDescritorA2(body.original_idea, prompt) : topicoComoDado(prompt), classicVisualPolicy, undefined,')
  assert.ok(iMarca > 0 && iSecao > iMarca, 'C a política do pedido é marcada antes da chamada por seção, e a chamada leva ESSA política')
  assert.ok(rota.slice(iSecao, rota.indexOf('\n', iSecao)).includes(' : null, true, true, kling4DescritorForte1911 ? MODELO_DO_DESCRITOR_FORTE'), 'C a chamada do filme grátis é POR SEÇÃO (porSecao = true)')
  { const iPedir = rota.indexOf('const pedir = async (alvo: number[], nota: string) => { const novas = descricoesPorSecao(await prazo(generateCinematicDescriptions(secoesParaODescritor(alvo.map((j) => secoes[j])), ')
    const linha = rota.slice(iPedir, rota.indexOf('\n', iPedir))
    assert.ok(iPedir > 0 && linha.includes(', classicVisualPolicy, ') && /, true, true,/.test(linha), 'C o pedido de novo (completarDescricoes1911) também é por seção, com a política do pedido') }
  assert.ok(rota.includes("const camPorSecao2511 = porSecao === true && typeof cameraNoDeslocamento2511 !== 'undefined' && cameraNoDeslocamento2511 === true"), 'C a regra com câmera só com a chave e só por seção')
  { const iResp = rota.indexOf('        ...(a2Ensaio1911 ? { a2_ensaio: a2Ensaio1911 } : {}),\n'), bloco = rota.slice(iResp, iResp + 900)
    assert.ok(iResp > 0 && bloco.includes('...(k4GratisEnsaio ? { camera_2511: { versao: CAMERA_NO_DESLOCAMENTO_2511_VERSAO, versao_por_secao: CAMERA_POR_SECAO_2511_VERSAO, ligada: cameraNoDeslocamento2511 === true,')
      && bloco.includes('politica_marcada: CAMERA_NO_DESLOCAMENTO_POLITICAS_2511.has(classicVisualPolicy), chamadas_por_secao_com_a_regra: CAMERA_POR_SECAO_ENVIADA_2511.get(classicVisualPolicy) ?? 0 } } : {}),'), 'C o dry_run do ensaio devolve o carimbo camera_2511') }

  // ── D. o pacote do ensaio ──────────────────────────────────────────────────────────────────────
  const pacote = await import('data:text/javascript;base64,' + Buffer.from(muda(P, local(P)).replace("import { randomUUID } from 'node:crypto'", "import { randomUUID } from 'crypto'")).toString('base64'))
  const L = createOfflineLoader({ env: { OPENAI_API_KEY: 'k' } })
  const { validCinematicGenerationId } = L('@/lib/cinematic/claim.ts'), { parseUserScript } = L('@/lib/scriptParser.ts'), { narrationFitAt, speechRateFor } = L('@/lib/speechRate.ts'), { checarFalaDoFilmeCurto } = L('@/lib/durationByEngine.ts')
  const rate = speechRateFor({ family: 'classic', language: 'en' })
  assert.equal(pacote.CORPOS.length, 10)
  assert.equal(new Set(pacote.CORPOS.map((c) => c.corpo.generationId)).size, 10, 'D um generationId por corpo')
  for (const { id, corpo } of pacote.CORPOS) {
    assert.ok(validCinematicGenerationId(corpo.generationId), id + ': generationId válido (era 400)')
    const p = parseUserScript(corpo.prompt)
    assert.equal(p.segments.length, 4, id + ': 4 seções')
    assert.ok(narrationFitAt(p.narration, 15, rate).ok, id + ': a fala cobre 15 s (era 422)')
    assert.ok(checarFalaDoFilmeCurto({ engine: corpo.engine, seconds: 15, verbatim: true, narration: p.narration, language: 'en' }).ok, id + ': cabe no teto do filme curto')
    assert.deepEqual([corpo.engine, corpo.k4_gratis_ensaio, corpo.dry_run, corpo.script_mode, corpo.duration], ['seedance', true, true, 'verbatim', 15], id + ': os campos do ensaio')
  }
  const mov = pacote.CASOS.flatMap((c) => c.mov), sai = pacote.CASOS.flatMap((c) => c.sai)
  assert.deepEqual([mov.length, mov.filter(Boolean).length, sai.filter(Boolean).length], [40, 20, 3], 'D 40 seções, 20 com deslocamento, 3 "vai embora"')
}

await suite(null)
const mutantes = [
  [K, "The one exception is ' +\n  'where the camera stands, which the KINEO-CAMERA-NO-DESLOCAMENTO-2511 rule asks for.')", "The one ' +\n  'exception.')"],
  [K, "  '\\n- KINEO-CAMERA-POR-SECAO-2511: ' + REGRA_DA_CAMERA_2511.replace(/^KINEO-CAMERA-NO-DESLOCAMENTO-2511: /, '') +\n  ' In an item where the subject travels, this is one short sentence of that item; in an item where nobody travels, say nothing about the camera.'\n", "  ''\n"],
  [K, "export const REGRA_DO_PLANO_DA_FALA_COM_CAMERA_2511 = REGRA_DO_PLANO_DA_FALA.replace(LINHA_SEM_CAMERA_1911,", "export const REGRA_DO_PLANO_DA_FALA_COM_CAMERA_2511 = REGRA_DO_PLANO_DA_FALA.replace('nada',"],
  [R, '(camPorSecao2511 ? REGRA_DO_PLANO_DA_FALA_COM_CAMERA_2511 : REGRA_DO_PLANO_DA_FALA)', 'REGRA_DO_PLANO_DA_FALA'],
  [R, '(camPorSecao2511 ? REGRA_DO_PLANO_DA_FALA_COM_CAMERA_2511 : REGRA_DO_PLANO_DA_FALA)', 'REGRA_DO_PLANO_DA_FALA_COM_CAMERA_2511'],
  [R, "const camPorSecao2511 = porSecao === true && typeof cameraNoDeslocamento2511", "const camPorSecao2511 = typeof cameraNoDeslocamento2511"],
  [R, "    if (camPorSecao2511 && typeof CAMERA_POR_SECAO_ENVIADA_2511 !== 'undefined') CAMERA_POR_SECAO_ENVIADA_2511.set(", "    if (false) CAMERA_POR_SECAO_ENVIADA_2511.set("],
  [R, '...(k4GratisEnsaio ? { camera_2511:', '...(false ? { camera_2511:'],
  [P, ", generationId: randomUUID(),", ","],
  [P, "'Leo races into the school yard, laughing.'", "'Leo races in.'"],
]
let mortos = 0
for (const m of mutantes) {
  assert.ok(local(m[0]).split(m[1]).length === 2, 'mutante não aplica: ' + m[1].slice(0, 100))
  await assert.rejects(suite(m), (e) => e instanceof assert.AssertionError || e instanceof TypeError, 'SOBREVIVEU: ' + m[1].slice(0, 100))
  mortos++
}
console.log(`PASS KINEO-CAMERA-POR-SECAO-2511: a regra do plano da fala com a câmera (exceção escrita, a câmera por último, sem "Describe only what is seen", sem exemplo); o descritor REAL da rota: por seção + chave = a regra com a câmera e o carimbo conta; sem a chave = a de sempre; o filme grátis de 15 s chama por seção com a política do pedido; o dry_run devolve camera_2511; pacote do ensaio com generationId e fala que cabe em 15 s; ${mortos}/${mutantes.length} mutantes mortos.`)
