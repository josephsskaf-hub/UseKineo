// KINEO-PLANO-SEM-LUGAR-2511 — guardião (rede falsa, nada sai da máquina; sem custo) do diagnóstico da "trilha na floresta" (CEO 25/11):
//   A. a pista que é só entorno nunca vira o plano inteiro: a regra nova vai ao descritor das cenas (o trecho REAL da rota, executado) e ao supervisor
//      fala×imagem SÓ com a chave e SÓ quando o roteiro tem marca [Pexels: …]; sem a chave, os dois textos são byte a byte os da origin/main;
//   B. a metade de cena fundida do molde da pista, sem "Setting:", fica no mesmo lugar do plano vizinho (planosPorSecao REAL): o plano 3 do 815dbef7
//      (paráfrase minha, sem texto do pedido) ganha o lugar; nenhuma ação da cena-mãe entra; cena de uma seção, metade com descrição, cena com
//      "Setting:", filme de uma cena e chave desligada = a origin/main byte a byte;
//   a chave: 'internal' = só a casa exata. Ao descritor ela chega pela política visual DO PEDIDO (WeakSet; as 5 chamadas ficam byte a byte as da main), ao
//   supervisor pelos 3 pedidos, e às metades por UMA linha nova logo depois da montagem (as 2 chamadas de planosPorSecao ficam as da main).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const Q = 'lib/kling4QuatroPlanos.ts', P = 'lib/cinematic/pistaNaoManda.ts', S = 'lib/cinematic/speechImageAlign.ts', R = 'app/api/generate-video-cinematic/route.ts'
const lf = (t) => t.replace(/\r\n/g, '\n')
const local = (f) => lf(readFileSync(f, 'utf8'))
const daBase = (f) => lf(execSync(`git show origin/main:${f}`, { encoding: 'utf8', maxBuffer: 64 << 20 }))
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const BASE = Object.fromEntries([Q, P, S, R].map((f) => [f, daBase(f)]))
const lb = createOfflineLoader({ env: { OPENAI_API_KEY: 'k' }, source: (rel, t) => BASE[rel] ?? t })
const Qb = lb('@/' + Q), Pb = lb('@/' + P), Sb = lb('@/' + S), { parseUserScript } = lb('@/lib/scriptParser.ts')

// o descritor REAL da rota (a lista, o sistema e a mensagem), recortado e executado com os nomes que ele lê
function descritorDe(rota) {
  const iLista = rota.indexOf('const list = scenes\n'), iUser = rota.indexOf('const userMsg = `Topic:', iLista), iFim = rota.indexOf('\n', iUser)
  assert.ok(iLista > 0 && iUser > iLista, 'o trecho do descritor')
  const corpo = rota.slice(iLista, iFim).replace(/\/\/ PEDIDO-FIEL-2610[^\n]*$/, '')
  return new Function('scenes', 'topic', 'lote', 'temMarcaDeBusca', 'REGRA_DA_PISTA', 'visualDescriptionDirection', 'visualPolicy', 'kling4Gratis', 'desenhoProtagonista', 'aspectSpec',
    'NO_TEXT_OBJECT_DIRECTION', 'REGRAS_DO_ESCRITOR_DE_CENAS', 'pistaDeClima2511', 'REGRA_DA_PISTA_CLIMA_2511', `${corpo}\nreturn { system, userMsg }`)
}
const AVIAO = 'HOOK: [Pexels: foggy forest path] A 70-year-old mystery, still unsolved.\n\nMICRO REWARD 1: [Pexels: vintage plane over ocean] In 1950 a plane left the coast and never landed.\n\nPAYOFF: [Pexels: empty control tower] Nobody ever found it.'
const PROSA = 'A plane vanished over the ocean in 1950. Nobody ever found it.'

async function suite(change) {
  const muda = (rel, t) => (change && rel === change[0] ? t.split(change[1]).join(change[2]) : t)
  const L = createOfflineLoader({ env: { OPENAI_API_KEY: 'k' }, globals: { AbortController, AbortSignal, setTimeout, clearTimeout }, source: (rel, t) => muda(rel, t) })
  const q = L('@/' + Q), p = L('@/' + P), s = L('@/' + S)
  const rota = muda(R, local(R)), rotaB = BASE[R]

  // ── a chave ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  assert.equal(q.PLANO_SEM_LUGAR_2511, 'internal')
  igual([q.planoSemLugarLigado('internal', true), q.planoSemLugarLigado('internal', false), q.planoSemLugarLigado('off', true), q.planoSemLugarLigado('public', false)], [true, false, false, true])
  assert.ok(rota.includes('const planoSemLugar2511 = planoSemLugarLigado(PLANO_SEM_LUGAR_2511, contaDaCasaExata2511(user.email))') && rota.includes("import { contaDaCasaExata as contaDaCasaExata2511 } from '@/lib/internalAccounts'"), 'a chave pela casa EXATA')
  { const linhas = (r, t) => r.split('\n').filter((l) => l.includes(t))
    igual(linhas(rota, 'generateCinematicDescriptions('), linhas(rotaB, 'generateCinematicDescriptions('), 'as chamadas ao descritor = a main (a chave não passa por elas)')
    igual(linhas(rota, 'planosPorSecao({'), linhas(rotaB, 'planosPorSecao({'), 'as 2 montagens = a main')
    const iAdd = rota.indexOf(`    if (typeof planoSemLugar2511 !== 'undefined' && planoSemLugar2511) PISTA_DE_CLIMA_2511.add(classicVisualPolicy)`), iPol = rota.indexOf('    const classicVisualPolicy: VisualPromptPolicy = {'), iDesc = rota.indexOf('generateCinematicDescriptions(secoesParaODescritor(parsedScript.segments)')
    assert.ok(iPol > 0 && iAdd > iPol && iDesc > iAdd, 'A: a política do pedido é marcada logo depois de nascer e antes do 1º pedido ao descritor')
    assert.ok(rota.includes('const PISTA_DE_CLIMA_2511 = new WeakSet<object>()') && rota.includes("  const pistaDeClima2511 = typeof PISTA_DE_CLIMA_2511 !== 'undefined' && PISTA_DE_CLIMA_2511.has(visualPolicy)"), 'A: o descritor lê a marca da política do seu pedido')
    const iQ = rota.indexOf('      const q = kling4PlanoPorSecao && verbatim && parsedScript.segments.length > scenes.length'), iB = rota.indexOf(`      if (q && typeof planoSemLugar2511 !== 'undefined' && planoSemLugar2511) q.prompts.splice(0, q.prompts.length, ...comLugarNasMetades2511(q.prompts, q.grupos, parsedScript.segments))`), iS = rota.indexOf('      if (q && sujeitoAparenciaLigada()', iQ)
    assert.ok(iQ > 0 && iB > iQ && iS > iB, 'B: a linha nova logo depois da montagem das metades do envio') }
  assert.equal(rota.split("...(typeof planoSemLugar2511 !== 'undefined' && planoSemLugar2511 ? { pistaDeClima: true } : {})").length - 1, 3, 'os 3 pedidos ao supervisor')

  // ── A. o descritor (o trecho REAL da rota) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  const cenas = (rot) => parseUserScript(rot).segments.map((x) => ({ description: x.pexelsQuery, voiceover: x.voiceover, stockSearchQuery: x.pexelsQuery }))
  const roda = (r, P2, rot, extra) => descritorDe(r)(cenas(rot), rot, undefined, P2.temMarcaDeBusca, P2.REGRA_DA_PISTA, () => 'look.', {}, false, null, () => ({ promptFraming: 'x' }), 'y', 'z', ...extra)
  const hojeAviao = roda(rotaB, Pb, AVIAO, []), hojeProsa = roda(rotaB, Pb, PROSA, [])
  const comChave = roda(rota, p, AVIAO, [true, p.REGRA_DA_PISTA_CLIMA_2511])
  assert.ok(comChave.system.includes(`\n- ${p.REGRA_DA_PISTA_CLIMA_2511}\n- Approved visual direction:`), 'A: com a chave e a marca, a regra vai ao descritor, logo depois da regra da pista')
  assert.ok(comChave.system.indexOf(p.REGRA_DA_PISTA) > 0 && comChave.system.indexOf(p.REGRA_DA_PISTA) < comChave.system.indexOf(p.REGRA_DA_PISTA_CLIMA_2511), 'a regra de sempre continua antes')
  igual(comChave.system.replace(`- ${p.REGRA_DA_PISTA_CLIMA_2511}\n`, ''), hojeAviao.system, 'A: tirando a linha nova, o resto do sistema = a main')
  for (const [nome, extra] of [['sem a chave (undefined)', []], ['chave false', [false, p.REGRA_DA_PISTA_CLIMA_2511]]]) {
    const x = roda(rota, p, AVIAO, extra); igual([x.system, x.userMsg], [hojeAviao.system, hojeAviao.userMsg], `A ${nome}: byte a byte a main`) }
  { const x = roda(rota, p, PROSA, [true, p.REGRA_DA_PISTA_CLIMA_2511]); igual([x.system, x.userMsg], [hojeProsa.system, hojeProsa.userMsg], 'A: roteiro sem marca [Pexels] = a main, mesmo com a chave') }
  igual(comChave.userMsg, hojeAviao.userMsg, 'A: a pista e a fala continuam chegando iguais (a regra muda, o dado não)')
  // a regra: decide quem lê o sentido, pela definição (não nomeia ninguém nem nada de que o Topic trata); sem exemplo, sem lista no código
  const regra = p.REGRA_DA_PISTA_CLIMA_2511
  assert.ok(regra.startsWith('KINEO-PISTA-DE-CLIMA-2511: ') && regra.includes('names no person, creature or object that the Topic is about') && regra.includes('never the whole shot') && regra.includes('the central subject of the Topic inside those surroundings'), 'A: a definição e a ação')
  assert.ok(!/"|e\.g\.|for example|such as|forest|fog/i.test(regra), 'A: sem exemplo e sem a palavra do caso')
  // o supervisor fala×imagem
  const msgs = (S2, extra) => S2.buildAlignMessages({ topic: AVIAO, scenes: [{ voiceover: 'A 70-year-old mystery, still unsolved.', shot: 'A foggy forest path at dawn.' }], ...extra })
  const supHoje = msgs(Sb, {}), supCom = msgs(s, { pistaDeClima: true })
  assert.ok(supCom[0].content.includes(regra + ' '), 'A: o supervisor lê a regra com a chave')
  igual(supCom[0].content.replace(regra + ' ', ''), supHoje[0].content, 'A: o resto do supervisor = a main')
  igual(msgs(s, {}), supHoje, 'A: supervisor sem a chave = a main')
  igual(s.buildAlignMessages({ topic: PROSA, scenes: [{ voiceover: 'x', shot: 'y' }], pistaDeClima: true }), Sb.buildAlignMessages({ topic: PROSA, scenes: [{ voiceover: 'x', shot: 'y' }] }), 'A: supervisor sem marca = a main')
  { const lit = /const REGRA_DA_PISTA_CLIMA_2511 =\n\s*('[\s\S]*?')\n/.exec(local(S)); assert.ok(lit, 'a cópia no supervisor')
    assert.equal(new Function(`return ${lit[1]}`)(), regra, 'A: as duas regras idênticas') }
  { const corpos = []; const fetchImpl = async (_u, o) => { corpos.push(JSON.parse(o.body)); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"scenes":[]}' } }] }) } }
    const cs = [{ voiceover: 'A 70-year-old mystery, still unsolved.', shot: 'A foggy forest path at dawn.' }]
    await s.alignShotsToSpeech({ topic: AVIAO, scenes: cs, pistaDeClima: true }, { fetchImpl }); await s.alignShotsToSpeech({ topic: AVIAO, scenes: cs }, { fetchImpl })
    assert.equal(corpos.length, 2, 'o supervisor chamou (rede falsa)')
    assert.ok(corpos[0].messages[0].content.includes(regra) && !corpos[1].messages[0].content.includes(regra), 'A: alignShotsToSpeech repassa a chave ao pedido (e só com ela)') }

  // ── B. a metade sem lugar (planosPorSecao REAL) ─────────────────────────────────────────────────────────────────────────────────────────────────
  const QUEM = 'Identity: the woman, a woman in her thirties with wavy chestnut hair in a dark blue jacket; a real person filmed in photorealistic live action.'
  const CAUDA = ', no readable text, letters, numbers, labels or signage anywhere in the frame Mouth closed, no speaking.'
  const cena = (acao, extra = '') => `Photoreal film. ${extra}${QUEM} ${acao}${CAUDA}`
  // o 815dbef7 em paráfrase minha: a cena 1 diz o lugar só dentro da ação; a cena 2 (fundida) não tem lugar nenhum; a cena 3, o rosto
  const F815 = { prompts: [cena('A woman stands ready in a high-tech robot factory, facing a sleek robot'), cena('A woman trains hard as a robotic arm swings toward her'), cena('A close-up of the woman, surprised')],
    stills: ['https://s/1', 'https://s/2', 'https://s/3'], falas: ['She came to fight a robot.', 'She warmed up. The machines kept building.', 'Then the twist.'],
    secoes: [{ pexelsQuery: 'robot factory', voiceover: 'She came to fight a robot.' }, { pexelsQuery: 'woman in jeans gym', voiceover: 'She warmed up.' }, { pexelsQuery: 'robotic arms assembling', voiceover: 'The machines kept building.' }, { pexelsQuery: 'surprised woman face', voiceover: 'Then the twist.' }],
    objetoConcreto: true }
  const comLugar = (F) => { const r = q.planosPorSecao(F); return r && { ...r, prompts: q.comLugarNasMetades2511(r.prompts, r.grupos, F.secoes) } }
  const hoje = Qb.planosPorSecao(F815), off = q.planosPorSecao(F815), on = comLugar(F815)
  assert.ok(hoje && off && on, 'montou')
  igual(off, hoje, 'B: sem a chave = a main byte a byte')
  igual(on.grupos, [[0], [1, 2], [3]], 'a cena 2 é a fundida')
  igual([on.prompts[0], on.prompts[3], on.stills, on.falas], [hoje.prompts[0], hoje.prompts[3], hoje.stills, hoje.falas], 'B: as cenas de uma seção, as imagens e as falas não mudam')
  assert.ok(/Main subject of this shot: robotic arms assembling, shown in motion\./.test(hoje.prompts[2]) && !/Setting: /.test(hoje.prompts[2]), 'na main o plano 3 vai sem lugar (o defeito reproduzido)')
  for (const k of [1, 2]) {
    assert.ok(on.prompts[k].includes(q.LUGAR_DO_ANTERIOR_2511), `B: o plano ${k + 1} fica no lugar do plano anterior`)
    igual(on.prompts[k].replace(q.LUGAR_DO_ANTERIOR_2511 + ' ', ''), hoje.prompts[k], `B: o plano ${k + 1} só ganha a cláusula`)
    assert.ok(!on.prompts[k].includes('swings toward her') && !on.prompts[k].includes('trains hard'), `B: nada da ação da cena-mãe entra no plano ${k + 1}`)
  }
  assert.equal(q.LUGAR_DO_ANTERIOR_2511, 'Setting: where this shot names no place, the same place as the previous shot.')
  // a 1ª cena fundida: o lugar do plano seguinte
  { const F = { ...F815, prompts: [F815.prompts[1], F815.prompts[0], F815.prompts[2]], falas: ['She warmed up. The machines kept building.', 'She came to fight a robot.', 'Then the twist.'],
      secoes: [F815.secoes[1], F815.secoes[2], F815.secoes[0], F815.secoes[3]] }
    const x = comLugar(F), h = Qb.planosPorSecao(F)
    igual(x.grupos, [[0, 1], [2], [3]]); assert.ok(x.prompts[0].includes(q.LUGAR_DO_SEGUINTE_2511) && x.prompts[1].includes(q.LUGAR_DO_SEGUINTE_2511), 'B: na 1ª cena, o lugar do plano seguinte')
    igual(x.prompts.slice(2), h.prompts.slice(2)) }
  // cena-mãe com "Setting:", metade com descrição, filme de uma cena: como hoje
  { const F = { ...F815, prompts: [F815.prompts[0], cena('A woman trains hard', 'Setting: a boxing gym. '), F815.prompts[2]] }
    igual(comLugar(F), Qb.planosPorSecao(F), 'B: a cena-mãe com Setting: = a main') }
  { const F = { ...F815, secoes: F815.secoes.map((x, j) => ({ ...x, descricao: j === 1 || j === 2 ? `A woman in a boxing gym does step ${j}.` : null })) }
    igual(comLugar(F), Qb.planosPorSecao(F), 'B: a metade com a descrição do descritor por seção = a main') }
  { const F = { prompts: [F815.prompts[1]], stills: ['https://s/1'], falas: ['She warmed up. The machines kept building.'], secoes: [F815.secoes[1], F815.secoes[2]], objetoConcreto: true }
    igual(comLugar(F), Qb.planosPorSecao(F), 'B: filme de uma cena só = a main') }
  // o molde da fala (objetoConcreto desligado) também
  { const F = { ...F815, objetoConcreto: false }; const x = comLugar(F), h = Qb.planosPorSecao(F)
    const cabe = (t) => Array.from(t).length + 1 + Array.from(q.LUGAR_DO_ANTERIOR_2511).length <= q.PLANO_DA_FALA_TETO // [§7] só onde cabe no teto da metade
    for (const k of [1, 2]) assert.equal(x.prompts[k].includes(q.LUGAR_DO_ANTERIOR_2511), cabe(h.prompts[k]), 'B: o molde "Shot focus" ganha o lugar onde cabe: metade ' + (k + 1))
    assert.ok(/Shot focus: /.test(x.prompts[2]) && x.prompts[1].includes(q.LUGAR_DO_ANTERIOR_2511), 'B: o molde "Shot focus" também ganha o lugar (a 1ª metade cabe)')
    igual(x.prompts.map((t) => t.replace(q.LUGAR_DO_ANTERIOR_2511 + ' ', '')), h.prompts) }
  // o teto da fal: o plano mais longo + a referência mais longa cabem em 512
  for (const t of on.prompts) assert.ok(Array.from('Scene 4: text-directed shot, no new keyframe for this scene. Wide shot. ' + t).length <= 512, 'cabe em 512: ' + t.length)
  // [revisora 25/11, §7] a METADE LONGA: com a cláusula ela passaria do teto da metade (PLANO_DA_FALA_TETO) e o corte do montador levaria a proteção do fim.
  // Agora ela fica a de hoje; a metade curta ganha a cláusula e cabe; e o envio (referência mais longa + escala + plano, pelo cabeNoTetoDoPlano REAL) mantém
  // "no readable text" em toda metade.
  { const kt = L('@/lib/kling4Trial.ts'), cp = (t) => Array.from(t).length
    const LONGO = 'Identity: the woman, a woman in her thirties with wavy chestnut hair, thick eyebrows and a warm smile, wearing a dark blue jacket over a grey t-shirt; a real person filmed in photorealistic live action.'
    const FL = { ...F815, prompts: F815.prompts.map((p) => p.replace(QUEM, LONGO)), secoes: F815.secoes.map((x, j) => (j === 2 ? { ...x, pexelsQuery: 'robotic arms assembling car parts' } : x)) }
    const h = Qb.planosPorSecao(FL), x = comLugar(FL)
    const longas = [1, 2].filter((k) => cp(h.prompts[k]) + 1 + cp(q.LUGAR_DO_ANTERIOR_2511) > q.PLANO_DA_FALA_TETO)
    assert.ok(longas.length >= 1 && cp(h.prompts[longas[0]]) >= 434 - 78 && cp(h.prompts[longas[0]]) <= 434, '§7: o caso tem uma metade longa (' + [1, 2].map((k) => cp(h.prompts[k])).join(', ') + ')')
    for (const k of [1, 2]) {
      if (longas.includes(k)) assert.equal(x.prompts[k], h.prompts[k], `§7: a metade longa ${k + 1} fica a de hoje (sem a cláusula)`)
      else assert.ok(x.prompts[k].includes(q.LUGAR_DO_ANTERIOR_2511) && cp(x.prompts[k]) <= q.PLANO_DA_FALA_TETO, `§7: a metade curta ${k + 1} ganha a cláusula e cabe no teto`)
      const envio = kt.cabeNoTetoDoPlano('Scene 12: text-directed shot, no new keyframe for this scene. Wide shot. ' + x.prompts[k])
      assert.ok(/no readable text, letters, numbers, labels or signage/.test(envio), `§7: o envio da metade ${k + 1} mantém a proteção do fim`) }
    for (const k of [1, 2]) assert.ok(/no readable text/.test(kt.cabeNoTetoDoPlano('Scene 12: text-directed shot, no new keyframe for this scene. Wide shot. ' + h.prompts[k])), 'na main a proteção ficava') }
  // a função direto
  igual([q.cenaComLugar2511('Photoreal film. Setting: a pier. A man waits.', 1, 3), q.cenaComLugar2511('Photoreal film. A man waits.', 1, 1)], ['Photoreal film. Setting: a pier. A man waits.', 'Photoreal film. A man waits.'])
  assert.equal(q.cenaComLugar2511('3D animated film. A duck waits.', 2, 3), '3D animated film. Setting: where this shot names no place, the same place as the previous shot. A duck waits.')
}

await suite(null)
const mutants = [
  [Q, "export const PLANO_SEM_LUGAR_2511: ModoPlanoSemLugar2511 = 'internal'", "export const PLANO_SEM_LUGAR_2511: ModoPlanoSemLugar2511 = 'public'"],
  [Q, "(modo === 'internal' && contaDaCasa === true)", "(modo === 'internal')"],
  [Q, '    for (let pos = 0; pos < g.length; pos++, k++) if (molde && k < saida.length) saida[k] = cenaComLugar2511(saida[k], i, grupos.length)', '    for (let pos = 0; pos < g.length; pos++, k++) {}'],
  [Q, ' && g.every((j) => (secoes[j] as { descricao?: unknown } | undefined)?.descricao === undefined)', ''],
  [Q, 'const molde = g.length > 1 && ', 'const molde = '],
  [Q, '  return cp1911(novo) <= PLANO_DA_FALA_TETO ? novo : promptDaCena\n', '  return novo\n'], // §7: sem o teto
  [Q, 'cenaComLugar2511(saida[k], i, grupos.length)', 'cenaComLugar2511(saida[k], k, saida.length)'],
  [R, `    if (typeof planoSemLugar2511 !== 'undefined' && planoSemLugar2511) PISTA_DE_CLIMA_2511.add(classicVisualPolicy)`, '    PISTA_DE_CLIMA_2511.add(classicVisualPolicy)'],
  [R, "  const pistaDeClima2511 = typeof PISTA_DE_CLIMA_2511 !== 'undefined' && PISTA_DE_CLIMA_2511.has(visualPolicy)", '  const pistaDeClima2511 = true'],
  [Q, "  if (/Setting: /.test(p) || total < 2) return promptDaCena\n", ''],
  [Q, ' || total < 2) return promptDaCena', ') return promptDaCena'],
  [Q, 'i === 0 ? LUGAR_DO_SEGUINTE_2511 : LUGAR_DO_ANTERIOR_2511', 'LUGAR_DO_ANTERIOR_2511'],
  [Q, "'Setting: where this shot names no place, the same place as the previous shot.'", "'Setting: the same place as the previous shot.'"],
  [P, "it is never the whole shot; ' +", "it may be the whole shot; ' +"],
  [S, "    (input.pistaDeClima === true && /\\[\\s*pexels/i.test(input.topic) ? REGRA_DA_PISTA_CLIMA_2511 + ' ' : '') + // KINEO-PLANO-SEM-LUGAR-2511 (A)\n", ''],
  [S, "input.pistaDeClima === true && /\\[\\s*pexels/i.test(input.topic) ? REGRA_DA_PISTA_CLIMA_2511", "/\\[\\s*pexels/i.test(input.topic) ? REGRA_DA_PISTA_CLIMA_2511"],
  [S, '...(input.pistaDeClima === true ? { pistaDeClima: true } : {})', ''],
  [R, "${temMarcaDeBusca(topic) && typeof pistaDeClima2511 !== 'undefined' && pistaDeClima2511 === true ? `- ${REGRA_DA_PISTA_CLIMA_2511}\n` : ''}", ''],
  [R, "${temMarcaDeBusca(topic) && typeof pistaDeClima2511 !== 'undefined' && pistaDeClima2511 === true ?", "${typeof pistaDeClima2511 !== 'undefined' && pistaDeClima2511 === true ?"],
  [R, 'planoSemLugarLigado(PLANO_SEM_LUGAR_2511, contaDaCasaExata2511(user.email))', 'planoSemLugarLigado(PLANO_SEM_LUGAR_2511, true)'],
  [R, `      if (q && typeof planoSemLugar2511 !== 'undefined' && planoSemLugar2511) q.prompts.splice(0, q.prompts.length, ...comLugarNasMetades2511(q.prompts, q.grupos, parsedScript.segments))`, '      if (false) q.prompts.splice(0, 0)'],
]
let mortos = 0
for (const m of mutants) {
  assert.ok(local(m[0]).includes(m[1]), 'mutante não aplica: ' + m[1].slice(0, 100))
  await assert.rejects(suite(m), (e) => e instanceof assert.AssertionError, 'SOBREVIVEU: ' + m[1].slice(0, 120))
  mortos++
}
console.log(`PASS KINEO-PLANO-SEM-LUGAR-2511: chave 'internal' (casa exata): o descritor pela política do pedido (as 5 chamadas e as 2 montagens = a main), o supervisor nos 3 pedidos, as metades por uma linha nova; A: a regra da pista de entorno no descritor (trecho real da rota) e no supervisor só com a chave e a marca, cópia literal, sem exemplo; sem a chave = a main byte a byte; B: o plano 3 do 815dbef7 (paráfrase) ganha o lugar do plano anterior, nenhuma ação da cena-mãe entra, 1ª cena = o seguinte, cena com Setting:, metade com descrição e filme de uma cena = a main; cabe em 512; ${mortos}/${mutants.length} mutantes mortos.`)
