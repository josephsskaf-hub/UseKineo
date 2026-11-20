// KINEO-PLANO-DA-FALA-1911 / KINEO-DESCRITOR-FORTE-1911 [revisor independente 19/11 sobre cbc82fadc: "pode ligar o conserto de cena para todos? PODE COM CONDIÇÃO"]
// Guardião das 6 condições. Node puro, sem rede: executa a lib REAL (prazo com fetch pendurado, guarda da ficha nos planos reais da prova paga, checagem de
// nome que falha) e confere a ligação na rota. Mutantes no fim.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/kling4PlanoDaFala1911.ts', ROTA = 'app/api/generate-video-cinematic/route.ts', EVT = 'app/api/events/route.ts'
// planos reais (o plano do Kling 4 montado da cena do claim): 8e83778f (Natal, Identity), 3df0553d (Adão e Eva, a ORDEM), deb1ec95 (a ORDEM cortada pelo teto),
// 21007cc3 (Visible no fim) e um plano sem ficha (o polvo, b3491d1e)
const NATAL = 'Photoreal film. Wide shot. Period setting: 1997 (1990s). Identity: Daniel, exactly as the author wrote: "photos show Daniel"; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing white tank top, blue jeans; origin: an American woman. In a vintage clothing shop, Emily discovers a photo strip tucked inside the pocket of a vibrant red wool coat. Mouth closed, no speaking.'
const EVA = 'Film visual medium: stylized 3D animated film look. Clear well-lit shot of the final moment. The only person in this shot is the same main character (Eve, exactly as the author wrote: "Eve in her own language"; appearance anchors: young adult (adult)); any other person described below is replaced by this same character. An angel with a flaming sword stands at the garden\'s entrance. no readable text, letters, numbers, labels or signage'
const DEB = 'Photoreal film. Medium shot, subject centered and clearly readable. Noël clearly visible as the subject of this shot. The only person in this shot is the same main character (the father, a middle-aged human male with a sturdy build. He has short, dark hair with flecks of gray, warm brown eyes, and a kind smile. Mouth closed, no speaking.'
const VIS = 'Photoreal film. Medium shot. A cozy 1954 Alabama living room, as a large rock crashes through the ceiling.  Visible: Ann Hodges, a woman in her thirties with long dark braided hair, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'
const POLVO = 'Photoreal film. Close-up. An octopus with three hearts glowing faintly, drifting over a coral reef. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  let L
  try { L = createOfflineLoader({ globals: { Response, setTimeout, clearTimeout, AbortController }, source: (rel, src) => over[rel] ?? src })('@/' + LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const rota = over[ROTA] ?? read(ROTA)

  // ── condição 2 · o modo "só sem ficha" ──
  no(!['internal', 'sem_ficha'].includes(L.KLING4_PLANO_DA_FALA_1911) || !['internal', 'sem_ficha'].includes(L.KLING4_DESCRITOR_FORTE_1911), "M0 o commit: os dois em 'internal' (ou o modo novo); 'public' fica fora")
  no(L.KLING4_PLANO_DA_FALA_1911 !== 'internal' || L.KLING4_DESCRITOR_FORTE_1911 !== 'internal', "M0b [CEO 19/11] os interruptores seguem 'internal' NO COMMIT (a CEO troca para 'sem_ficha' depois do revisor)")
  no(!L.planoDaFalaLigado('sem_ficha', false) || !L.planoDaFalaLigado('sem_ficha', true) || !L.soSemFicha('sem_ficha', false) || L.soSemFicha('sem_ficha', true) || L.soSemFicha('internal', false) || L.soSemFicha('public', false), 'M1 sem_ficha abre para todos; a guarda vale só para o cliente (a casa segue como em internal)')
  for (const [nome, plano] of [['8e83778f Identity', NATAL], ['3df0553d ORDEM', EVA], ['deb1ec95 ORDEM cortada', DEB], ['21007cc3 Visible', VIS]]) no(!L.cenaTemFicha(plano), `M2 ${nome}: a cena tem ficha (caminho de hoje para o cliente)`)
  no(L.cenaTemFicha(POLVO) || L.cenaTemFicha('He is clearly visible: the octopus.') || L.cenaTemFicha(null), 'M3 sem ficha (o polvo; "visible" de outra frase) = o caminho novo')
  { const iG = rota.indexOf("      if (soSemFicha1911 && kling4Prompts.some(cenaTemFicha)) voltaAoHoje1911('com_ficha')"), iD = rota.indexOf('try { d0 = await prazo1911.corrida(descricoesDasSecoesK4, A1A2_ESPERA_DO_DESCRITOR_MS) }'), iA = rota.indexOf('if (d) parsedScript.segments.forEach((s, j) => { Object.assign(s, { descricao: d[j] }) })')
    no(!(iG > 0 && iD > iG && iA > iD), 'M4 a guarda roda ANTES de esperar e aplicar a descrição: com ficha, a :8287 não muda, a revisão do A2 não roda e o sujeito no último plano não liga')
    no(!rota.includes('const soSemFicha1911 = soSemFicha(kling4DescritorForte1911 ? KLING4_DESCRITOR_FORTE_1911 : KLING4_PLANO_DA_FALA_1911, isDryRunAccount(user.email))'), 'M5 a guarda segue o interruptor do caminho que abriu (A2 ou A1), pela régua EXATA da casa') }

  // ── condição 1 · o prazo, com fetch pendurado (que ignora o abort) ──
  no(L.A1A2_TETO_TOTAL_MS + 148_000 >= 300_000 || L.A1A2_TETO_TOTAL_MS > 90_000 || L.A1A2_ESPERA_DO_DESCRITOR_MS > L.A1A2_TETO_TOTAL_MS || L.A1A2_REESCRITA_MS > L.A1A2_TETO_TOTAL_MS || !/export const maxDuration = 300\b/.test(rota), `P0 o teto somado (${L.A1A2_TETO_TOTAL_MS} ms) + 148 s do resto fica bem abaixo dos 300 s do maxDuration`)
  { const pendura = () => new Promise(() => {})
    const z = L.prazoDoA1A2(1_000); const t0 = Date.now(); let erro = null
    try { await z.corrida(pendura(), 60) } catch (e) { erro = e }
    const ms = Date.now() - t0
    no(!erro || erro.message !== 'prazo' || !z.estourou || ms < 50 || ms > 400, `P1 a espera de um descritor pendurado solta no prazo dela (${ms} ms, estourou=${z.estourou})`)
    const t = L.prazoDoA1A2(80); const t1 = Date.now(); let e2 = null
    try { await t.corrida(pendura(), 10_000) } catch (e) { e2 = e }
    const ms2 = Date.now() - t1
    no(!e2 || !t.estourou || ms2 < 70 || ms2 > 450, `P2 o teto SOMADO manda sobre o prazo de cada uma (${ms2} ms)`)
    let e3 = null; try { await t.corrida(Promise.resolve(1), 10_000) } catch (e) { e3 = e }
    no(!e3, 'P3 com o teto gasto, a próxima espera nem começa (o caminho de hoje)')
    const v = L.prazoDoA1A2(1_000); const ok = await v.corrida(new Promise((r) => setTimeout(() => r('descrições'), 20)), 500)
    no(ok !== 'descrições' || v.estourou, 'P4 a resposta no prazo passa, sem estouro') }
  // a revisão do A2 com a REESCRITA pendurada: a rota cerca a reescrita (40 s) e a revisão inteira (o que resta); aqui em ms
  { const z = L.prazoDoA1A2(300); const t0 = Date.now(); let mexeu = false, err = null
    try {
      await z.corrida(L.revisarPlanosA2({ planos: () => ['a', 'b'], falas: () => ['x', 'y'], nSecoes: 2, rejulgar: false, julgar: async () => ({ status: 'JUDGED', falhas: ['e_final'] }), nomes: async () => [],
        reescrever: async () => { await z.corrida(new Promise(() => {}), 60); mexeu = true } }), z.resta())
    } catch (e) { err = e }
    const ms = Date.now() - t0
    no(!z.estourou || mexeu || ms > 400, `P5 reescrita pendurada: solta em ~60 ms, estourou=${z.estourou}, nada mexe nas seções depois (${ms} ms, ${err?.message ?? 'sem erro'})`) }
  { const iR = rota.indexOf('const novas = descricoesPorSecao(await prazo1911.corrida(generateCinematicDescriptions('), iV = rota.indexOf("      if (rastro1911?.caminho === 'hoje') return // o filme já voltou ao caminho de hoje: nada mexe nas seções"), iM = rota.indexOf("      alvo.forEach((j, k) => { if (novas[k]) Object.assign(parsedScript.segments[j], { descricao: novas[k] }) })")
    no(!(iR > 0 && iV > iR && iM > iV) || !rota.includes('MODELO_DO_DESCRITOR_FORTE, (u) => { usosDoDescritorA2.push(u) }), A1A2_REESCRITA_MS), alvo.length)'), 'P6 a reescrita tem prazo próprio e a perdedora tardia não mexe nas seções')
    no(!rota.includes('const rA2 = await prazo1911.corrida(revisarA2DoFilme(false, sujeitoA21911), prazo1911.resta())') || !rota.includes("        if (prazo1911.estourou) voltaAoHoje1911('prazo_da_revisao')"), 'P7 a revisão inteira (juiz, nome, reescrita) dentro do que resta; estourou = o caminho de hoje')
    no(!rota.includes("        if (!d0) voltaAoHoje1911('prazo_do_descritor')") || !rota.includes('const resta = Math.min(DESCRICAO_DE_NOVO_TETO_MS - (Date.now() - t0), total.resta());'), 'P8 a espera do descritor e os pedidos a mais respeitam o teto somado')
    no(!rota.includes("      parsedScript.segments.forEach((x) => { delete (x as { descricao?: unknown }).descricao }); kling4PromptsDasCenas1911.forEach((p, i) => { kling4Prompts[i] = p }); ultimoComSujeito1911.ligado = false"), 'P9 voltar ao caminho de hoje desfaz tudo: sem descrição, as cenas originais e sem o sujeito obrigatório no último plano') }

  // ── condição 3 · o rastro ──
  { const ev = over[EVT] ?? read(EVT), i0 = ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), lista = i0 >= 0 ? ev.slice(i0, ev.indexOf('])', i0)) : ''
    no(L.PLANO_DA_FALA_EVENTO !== 'kling4_plano_da_fala_hoje' || !/^\s*'kling4_plano_da_fala_hoje',/m.test(lista), 'R1 o evento do caminho de hoje é só do servidor')
    no(!rota.includes("metadata: { generation_id: generationId, versao: rastro1911.versao, motivo, a2: !!kling4DescritorForte1911 } }).catch(() => false) // só o motivo, nunca texto"), 'R2 o evento grava a versão, o motivo e se era o A2 (nunca texto)')
    for (const m of ["voltaAoHoje1911('com_ficha')", "voltaAoHoje1911('prazo_do_descritor')", "voltaAoHoje1911(c1911.motivo ?? 'descricao_incompleta')", "voltaAoHoje1911('prazo_da_revisao')", "voltaAoHoje1911('nome_sem_checagem')", "voltaAoHoje1911('nome_persistiu')", "voltaAoHoje1911(prazo1911.estourou ? 'prazo_da_revisao' : 'erro_da_revisao')"]) no(!rota.includes(m), `R3 cada queda grava o motivo: ${m}`)
    no(!rota.includes('...(rastro1911 ? { plano_da_fala: rastro1911 } : {}),'), 'R4 a versão do A1/A2 e o caminho vão ao claim')
    no(!rota.includes("reescritas: rastro1911?.caminho === 'hoje' ? [] : rA2.reescritas, reescritas_descartadas: rastro1911?.caminho === 'hoje' ? rA2.reescritas : [], caminho: rastro1911?.caminho ?? null,"), 'R5 [revisor 19/11, D4] o evento do A2 no caminho de hoje não diz que reescreveu: as reescritas vão como descartadas, com o caminho')
    no(!rota.includes('prazo1911.corrida(sujeitoNoKling4({ pedido: kling4PedidoSujeito, falas: kling4Timing.voiceovers, prompts: kling4Prompts, stills: kling4ApprovedStills, pessoaPermitida: !romanceAdulto.ativo }, leituraDoA21911), prazo1911.resta())'), 'P10 [revisor 19/11, D1] a leitura do sujeito antes da revisão do A2 também cabe no teto somado') }

  // ── condição 4 · nome próprio: a checagem que falha volta ao texto de hoje ──
  { const quebra = async () => { throw new Error('rede') }
    const n = await L.planosComNomeProprio(['A boy plays GTA 6 on a console.'], { apiKey: 'x', fetchImpl: quebra })
    no(n !== null, `N1 a checagem de nome que falha devolve null, nunca "nenhum nome" (${JSON.stringify(n)})`)
    const base = { planos: () => ['a', 'b'], falas: () => ['x', 'y'], nSecoes: 2, rejulgar: false, julgar: async () => null, reescrever: async () => {} }
    const r1 = await L.revisarPlanosA2({ ...base, nomes: async () => null })
    const r2 = await L.revisarPlanosA2({ ...base, nomes: async () => { throw new Error('x') } })
    const r3 = await L.revisarPlanosA2({ ...base, nomes: async () => [] })
    let k = 0; const r4 = await L.revisarPlanosA2({ ...base, nomesDeNovo: true, nomes: async () => (k++ === 0 ? [0] : null) })
    no(!r1.nomes_falhou || !r2.nomes_falhou || r3.nomes_falhou || !r4.nomes_falhou, `N2 nomes_falhou: null, erro e a 2ª checagem que falha marcam; lista vazia não (${[r1, r2, r3, r4].map((x) => !!x.nomes_falhou)})`)
    no(!rota.includes("        else if (rA2.nomes_falhou) voltaAoHoje1911('nome_sem_checagem')") || !rota.includes('const caiNoHoje1911 = (r.nomes_depois ?? []).length > 0 || !!r.nomes_falhou'), 'N3 o envio e o eco voltam ao texto de hoje quando a checagem falha') }

  // ── condição 6 · o portão do sujeito ──
  no(!rota.includes('Boolean(await Promise.race([recuperarIdeiaDoEscritor(user.id, body.prompt), new Promise<null>((ok) => setTimeout(() => ok(null), PORTAO_LEITURA_TETO_MS_1911))]))') || !rota.includes('const PORTAO_LEITURA_TETO_MS_1911 = 2_000'), 'G1 a leitura de events do portão solta em 2 s')
  return p
}

const MUT = [
  ['A1 público no commit', LIB, (s) => s.replace("export const KLING4_PLANO_DA_FALA_1911: ModoPlanoDaFala = 'internal'", "export const KLING4_PLANO_DA_FALA_1911: ModoPlanoDaFala = 'public'")],
  ['A2 sem_ficha no commit', LIB, (s) => s.replace("export const KLING4_DESCRITOR_FORTE_1911: ModoPlanoDaFala = 'internal'", "export const KLING4_DESCRITOR_FORTE_1911: ModoPlanoDaFala = 'sem_ficha'")],
  ['sem_ficha sem a guarda', LIB, (s) => s.replace("export const soSemFicha = (modo: ModoPlanoDaFala, contaDaCasa: boolean): boolean => modo === 'sem_ficha' && contaDaCasa !== true", 'export const soSemFicha = (modo: ModoPlanoDaFala, contaDaCasa: boolean): boolean => false')],
  ['a guarda vale para a casa', LIB, (s) => s.replace("modo === 'sem_ficha' && contaDaCasa !== true", "modo === 'sem_ficha'")],
  ['sem_ficha fecha para o cliente', LIB, (s) => s.replace("return modo === 'public' || modo === 'sem_ficha' || (modo === 'internal' && contaDaCasa === true)", "return modo === 'public' || (modo !== 'off' && contaDaCasa === true)")],
  ['ORDEM não é ficha', LIB, (s) => s.replace('|The only person in this shot is the same main character|', '|')],
  ['Visible não é ficha', LIB, (s) => s.replace('(?:Identity|Visible(?:, seen from behind)?):', '(?:Identity):')],
  ['"visible" solto é ficha', LIB, (s) => s.replace('/(?:^|[\\s.])(?:Identity|Visible(?:, seen from behind)?):', '/(?:Identity|Visible|visible)')],
  ['rota: guarda depois da espera', ROTA, (s) => s.replace("      if (soSemFicha1911 && kling4Prompts.some(cenaTemFicha)) voltaAoHoje1911('com_ficha')", "      if (false) voltaAoHoje1911('com_ficha')")],
  ['rota: guarda pela régua larga', ROTA, (s) => s.replace('const soSemFicha1911 = soSemFicha(kling4DescritorForte1911 ? KLING4_DESCRITOR_FORTE_1911 : KLING4_PLANO_DA_FALA_1911, isDryRunAccount(user.email))', 'const soSemFicha1911 = soSemFicha(kling4DescritorForte1911 ? KLING4_DESCRITOR_FORTE_1911 : KLING4_PLANO_DA_FALA_1911, isInternalEmail(user.email))')],
  ['teto somado de 200 s', LIB, (s) => s.replace('export const A1A2_TETO_TOTAL_MS = 90_000', 'export const A1A2_TETO_TOTAL_MS = 200_000')],
  ['corrida sem o teto somado', LIB, (s) => s.replace('      const ms = Math.min(capMs, fim - agora())', '      const ms = capMs')],
  ['corrida sem timer (só o SDK)', LIB, (s) => s.replace("      return Promise.race([x, new Promise<T>((_, rej) => { tm = setTimeout(() => { p.estourou = true; rej(new Error('prazo')) }, ms) })]).finally(() => { if (tm) clearTimeout(tm) })", '      return x')],
  ['estouro não marcado', LIB, (s) => s.replace("tm = setTimeout(() => { p.estourou = true; rej(new Error('prazo')) }, ms)", "tm = setTimeout(() => { rej(new Error('prazo')) }, ms)")],
  ['rota: reescrita sem prazo', ROTA, (s) => s.replace('const novas = descricoesPorSecao(await prazo1911.corrida(generateCinematicDescriptions(', 'const novas = descricoesPorSecao(await (generateCinematicDescriptions(').replace('MODELO_DO_DESCRITOR_FORTE, (u) => { usosDoDescritorA2.push(u) }), A1A2_REESCRITA_MS), alvo.length)', 'MODELO_DO_DESCRITOR_FORTE, (u) => { usosDoDescritorA2.push(u) })), alvo.length)')],
  ['rota: a perdedora tardia mexe', ROTA, (s) => s.replace("      if (rastro1911?.caminho === 'hoje') return // o filme já voltou ao caminho de hoje: nada mexe nas seções\n", '')],
  ['rota: revisão sem o teto', ROTA, (s) => s.replace('const rA2 = await prazo1911.corrida(revisarA2DoFilme(false, sujeitoA21911), prazo1911.resta())', 'const rA2 = await revisarA2DoFilme(false, sujeitoA21911)')],
  ['rota: estouro da revisão segue', ROTA, (s) => s.replace("        if (prazo1911.estourou) voltaAoHoje1911('prazo_da_revisao')\n        else if", '        if')],
  ['rota: espera do descritor sem prazo', ROTA, (s) => s.replace('try { d0 = await prazo1911.corrida(descricoesDasSecoesK4, A1A2_ESPERA_DO_DESCRITOR_MS) }', 'try { d0 = await descricoesDasSecoesK4 }')],
  ['rota: pedidos a mais sem o teto somado', ROTA, (s) => s.replace('const resta = Math.min(DESCRICAO_DE_NOVO_TETO_MS - (Date.now() - t0), total.resta());', 'const resta = DESCRICAO_DE_NOVO_TETO_MS - (Date.now() - t0);')],
  ['rota: voltar não desfaz as cenas', ROTA, (s) => s.replace('kling4PromptsDasCenas1911.forEach((p, i) => { kling4Prompts[i] = p }); ultimoComSujeito1911.ligado = false', 'ultimoComSujeito1911.ligado = false')],
  ['rota: motivo da descrição jogado fora', ROTA, (s) => s.replace("          else voltaAoHoje1911(c1911.motivo ?? 'descricao_incompleta')", '')],
  ['rota: evento com texto', ROTA, (s) => s.replace('versao: rastro1911.versao, motivo, a2: !!kling4DescritorForte1911 } })', 'versao: rastro1911.versao, motivo, a2: !!kling4DescritorForte1911, roteiro: prompt } })')],
  ['rota D4: evento grava as reescritas do caminho de hoje', ROTA, (s) => s.replace("reescritas: rastro1911?.caminho === 'hoje' ? [] : rA2.reescritas,", 'reescritas: rA2.reescritas,')],
  ['rota D1: sujeito fora do teto', ROTA, (s) => s.replace('prazo1911.corrida(sujeitoNoKling4({ pedido: kling4PedidoSujeito, falas: kling4Timing.voiceovers, prompts: kling4Prompts, stills: kling4ApprovedStills, pessoaPermitida: !romanceAdulto.ativo }, leituraDoA21911), prazo1911.resta())', '(sujeitoNoKling4({ pedido: kling4PedidoSujeito, falas: kling4Timing.voiceovers, prompts: kling4Prompts, stills: kling4ApprovedStills, pessoaPermitida: !romanceAdulto.ativo }, leituraDoA21911))')],
  ['rota: claim sem o caminho', ROTA, (s) => s.replace('          ...(rastro1911 ? { plano_da_fala: rastro1911 } : {}),', '')],
  ['evento fora da lista', EVT, (s) => s.replace("  'kling4_plano_da_fala_hoje', //", "  // 'kling4_plano_da_fala_hoje', //")],
  ['nome que falha = nenhum nome', LIB, (s) => s.replace("  }, { model: 'gpt-4o-mini', timeoutMs: 6_000, tentativasExtras: 0, ...opts })\n  if (!r.ok) return null", "  }, { model: 'gpt-4o-mini', timeoutMs: 6_000, tentativasExtras: 0, ...opts })\n  if (!r.ok) return []")],
  ['revisão: erro de nome vira lista vazia', LIB, (s) => s.replace("cronometro('nomes', () => a.nomes(planos), null as number[] | null)", "cronometro('nomes', () => a.nomes(planos), [] as number[] | null)")],
  ['revisão: 2ª checagem que falha passa', LIB, (s) => s.replace('const n2 = await a.nomes(a.planos()); if (n2 === null) nomesFalhou = true;', 'const n2 = await a.nomes(a.planos());')],
  ['rota: nome sem checagem segue', ROTA, (s) => s.replace("        else if (rA2.nomes_falhou) voltaAoHoje1911('nome_sem_checagem') //", '        //')],
  ['eco: nome sem checagem segue', ROTA, (s) => s.replace('const caiNoHoje1911 = (r.nomes_depois ?? []).length > 0 || !!r.nomes_falhou', 'const caiNoHoje1911 = (r.nomes_depois ?? []).length > 0')],
  ['portão: leitura sem prazo', ROTA, (s) => s.replace('Boolean(await Promise.race([recuperarIdeiaDoEscritor(user.id, body.prompt), new Promise<null>((ok) => setTimeout(() => ok(null), PORTAO_LEITURA_TETO_MS_1911))]))', 'Boolean(await recuperarIdeiaDoEscritor(user.id, body.prompt))')],
]
// um mutante sem prazo pendura a prova para sempre: o teto de 5 s conta como vermelho (e mantém o processo vivo)
const comTeto = (pr) => { let tm; return Promise.race([pr, new Promise((ok) => { tm = setTimeout(() => ok(['pendurou: a espera não solta']), 5_000) })]).finally(() => clearTimeout(tm)) }
const p0 = await comTeto(prova())
if (p0.length) { console.error('FAIL test-cena-publica-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) { const o = read(arq), m = f(o); if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue } if (!(await comTeto(prova({ [arq]: m }))).length) vivos.push(nome) }
if (vivos.length) { console.error('FAIL test-cena-publica-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-cena-publica-1911 (as 6 condições do revisor: só sem ficha, prazo com fetch pendurado, rastro, nome que falha, portão; ${MUT.length} mutantes mortos)`)
process.exit(0)
