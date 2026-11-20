// KINEO-FICHA-REPROVADA-1911 [dono 19/11: "pode fechar o furo da ficha"; prova paga 8e83778f e 3df0553d] — ficha reprovada pelo juiz não vai ao motor.
// Node puro, sem rede: executa a lib REAL com os planos que FORAM à fal na prova paga (cinematic_dispatch_result) e confere a ligação na rota. Mutantes no fim.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/cinematic/fichaReprovada1911.ts', ROTA = 'app/api/generate-video-cinematic/route.ts', EVT = 'app/api/events/route.ts'
// 8e83778f (Natal): o plano 2 como foi à fal — a ficha do Daniel com as âncoras da folha (mulher de regata) e a origem "an American woman"
const NATAL = 'Scene 2: text-directed shot, no new keyframe for this scene. Photoreal film. Wide shot. Period setting: 1997 (1990s). Identity: Daniel, exactly as the author wrote: "photos show Daniel"; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing white tank top, blue jeans; origin: an American woman. In a vintage clothing shop, Emily discovers a photo strip tucked inside the pocket of a vibrant red wool coat. Mouth closed, no speaking.'
// 3df0553d (Adão e Eva): a ordem do protagonista + a cláusula da ficha travada
const EVA = 'Film visual medium: stylized 3D animated film look. Clear well-lit shot of the final moment. The only person in this shot is the same main character (Eve, exactly as the author wrote: "Eve in her own language"; appearance anchors: young adult (adult)); any other person described below is replaced by this same character. An angel with a flaming sword stands at the garden\'s entrance. The same main character appears in this scene, consistent design: Eve, exactly as the author wrote: "Eve in her own language"; appearance anchors: young adult. no readable text, letters, numbers, labels or signage'
const REPROVADA = { status: 'JUDGED', falhas: ['a_ficha'] }, APROVADA = { status: 'JUDGED', falhas: [] }
// [revisor 19/11, 9ª passada] planos reais (o plano do Kling 4 montado da cena do claim) e o filme do eco: scripts/fixtures/ficha-reprovada-1911-casos.json
const CASOS = JSON.parse(read('scripts/fixtures/ficha-reprovada-1911-casos.json'))
const real = createOfflineLoader({ evaluationTimeoutMs: 120000 })
const { parseUserScript } = real('@/lib/scriptParser.ts')
const Q = real('@/lib/kling4QuatroPlanos.ts'), C = real('@/lib/cinematic/cenaKling4.ts'), K = real('@/lib/kling4Trial.ts'), SUP = real('@/lib/cinematic/superficieSemTexto.ts'), V = real('@/lib/kling4PlanoVariado.ts')
const STYLE = { look: 'photoreal', suffix: '', lookPhrase: 'photorealistic, ultra-detailed' }
/** O envio como a fal recebe (o encadeamento do kling4PorSecao: plano por seção, superfície, escala, montador). */
function envio(f, cenas) {
  const secoes = parseUserScript(f.roteiro).segments, stills = f.stills ?? []
  const q = secoes.length > cenas.length ? Q.planosPorSecao({ prompts: cenas, stills, falas: f.falas, secoes, objetoConcreto: true }) : null
  const r = q ? { prompts: q.prompts, stills: q.stills, falas: q.falas } : { prompts: cenas, stills, falas: f.falas }
  const r3 = V.planosComEscalaVariada(r.prompts.map((p) => SUP.comSuperficieNoPlano(p)), r.stills).prompts
  return K.buildKling4TrialInput(r3, r.stills, { voiceovers: r.falas, wordsPerSecond: 2.5 }).input.multi_prompt.map((m) => m.prompt)
}
const ECO = { ...CASOS.eco, cenas: CASOS.eco.cenas.map((c, i) => C.promptDaCenaKling4(c, STYLE, i, true)) }

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  let F
  try { F = createOfflineLoader({ source: (rel, src) => over[rel] ?? src })('@/' + LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const rota = over[ROTA] ?? read(ROTA)
  no(F.FICHA_REPROVADA_1911 !== 'internal' || F.fichaReprovadaLigada('internal', false) || !F.fichaReprovadaLigada('internal', true) || F.fichaReprovadaLigada('off', true), "A0 'internal' = só a conta exata do ensaio; 'off' = nada")
  no((rota.match(/fichaReprovadaLigada\(FICHA_REPROVADA_1911, isDryRunAccount\(user\.email\)\)/g) ?? []).length !== 2, 'A1 o envio e o eco ligam pela régua EXATA do ensaio (isDryRunAccount)')
  // a lib nos planos reais
  const a1 = F.semAncorasDaFolha(NATAL)
  no(/appearance anchors|tank top|origin: an American woman/.test(a1) || !a1.includes('Identity: Daniel, exactly as the author wrote: "photos show Daniel".') || !a1.includes('Emily discovers a photo strip'), `F1 8e83778f: saem as âncoras da folha e a origem; o trecho do autor e a ação ficam (${a1.slice(0, 260)})`)
  const s1 = F.semFicha(NATAL)
  no(/Identity:|Daniel, exactly|tank top/.test(s1) || !s1.includes('Emily discovers a photo strip') || !s1.includes('Period setting: 1997 (1990s).'), `F2 sem ficha: a linha Identity sai inteira, a época e a ação ficam (${s1.slice(0, 200)})`)
  const s2 = F.semFicha(EVA)
  no(/The only person in this shot|consistent design|Eve, exactly/.test(s2) || !s2.includes('An angel with a flaming sword'), `F3 sem ficha: a ordem do protagonista e a cláusula da ficha travada saem (${s2})`)
  // [revisor 19/11, 9ª passada] os planos reais que a 1ª versão deixava passar (fixture: o plano do Kling 4 montado da cena do claim)
  { const p = CASOS.deb1ec95[0], s = F.semFicha(p)
    no(s !== 'Photoreal film. Medium shot, subject centered and clearly readable. Noël clearly visible as the subject of this shot. Mouth closed, no speaking.', `F4 deb1ec95 plano 1: a ORDEM cortada pelo teto (sem o ")") sai inteira até a proteção do fim; a ficha do pai não vai ao motor (${s})`) }
  { const p = CASOS['698974cc'][0], a = F.semAncorasDaFolha(p), s = F.semFicha(p)
    no(/appearance anchors|5-7|short black/.test(a) || !a.includes('Visible: the little girl, exactly as the author wrote: "l, no readable text'), `F5 698974cc: a aspa cortada pelo elenco não esconde as âncoras (${a.slice(200)})`)
    no(/Visible|little girl/.test(s) || !s.includes('curiosity. no readable text, letters'), `F5b 698974cc sem ficha (${s.slice(150)})`) }
  { const p = CASOS['21007cc3'][0], a = F.semAncorasDaFolha(p), s = F.semFicha(p)
    no(/natural features/.test(a) || !a.includes('Visible: Ann Hodges'), `F6 21007cc3: as feições da origem saem com a origem; a ficha do cliente fica (${a})`)
    no(s !== 'Photoreal film. Medium shot, subject centered and clearly readable. Period setting: 1954 (1950s). A cozy 1954 Alabama living room, sunlight filtering through curtains, as a large rock crashes through the ceiling, splintering wood and debris. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.', `F6b 21007cc3 sem ficha: sem ".," na junta, sem feições, a época e a ação ficam (${s})`) }
  { const p = CASOS['42bcd59f'][0], a = F.semAncorasDaFolha(p), s = F.semFicha(p)
    no(/origin:|natural features/.test(a) || !a.includes('wearing an olive jacket and plain trousers.'), `F7 42bcd59f: a origem depois de vírgula sai, a roupa fica (${a})`)
    no(/Visible|Fiery|natural features/.test(s) || !s.includes('Помпеях clearly visible as the subject of this shot. no readable text'), `F7b 42bcd59f sem ficha (${s})`) }
  for (const g of ['deb1ec95', '698974cc', '21007cc3', '42bcd59f']) for (const f of [F.semFicha, F.semAncorasDaFolha]) {
    const p = CASOS[g][0], s = f(p), ruim = /[^.]\.\s*[;,]|\(\s*\)|(?:^|\s)[,;](?:\s|$)/
    no(ruim.test(s) && !ruim.test(p), `F8 ${g}: nenhuma pontuação órfã nova (${s})`)
  }
  // ataques do revisor: o trecho do autor, o "1.80", a abreviação, e nada fora da ficha
  { const a = F.semAncorasDaFolha('Photoreal film. Identity: Daniel, exactly as the author wrote: "Daniel... the tall one; origin: Brazil"; appearance anchors: 20-30, brown; origin: an American woman. He walks into the shop.')
    no(a !== 'Photoreal film. Identity: Daniel, exactly as the author wrote: "Daniel... the tall one; origin: Brazil". He walks into the shop.', `F9 o trecho do autor fica byte a byte (o ";" e o "origin:" dele não são a ficha) (${a})`) }
  { const a = F.semAncorasDaFolha('Photoreal film. Identity: Daniel, exactly as the author wrote: "photos show Daniel"; appearance anchors: 1.80 m tall, brown hair; origin: an American woman. He walks.')
    no(a !== 'Photoreal film. Identity: Daniel, exactly as the author wrote: "photos show Daniel". He walks.', `F10 o valor da âncora não para no "1.80" (${a})`) }
  { const s = F.semFicha('Photoreal film. Identity: Dr. Ana Souza, a doctor with short grey hair; appearance anchors: 40-50, short grey. She runs. no readable text')
    no(s !== 'Photoreal film. She runs. no readable text', `F11 "Dr." não termina a ficha (${s})`) }
  { const t = 'Photoreal film. Identity: the miller, a tall man; origin: an American man. He walks past the river, origin: the old mill. no readable text', a = F.semAncorasDaFolha(t)
    no(a !== 'Photoreal film. Identity: the miller, a tall man. He walks past the river, origin: the old mill. no readable text', `F12 o corte age só dentro da ficha: o "origin:" da ação fica (${a})`) }
  { const a = F.semAncorasDaFolha(EVA)
    no(/appearance anchors|young adult/.test(a) || !a.includes('(Eve, exactly as the author wrote: "Eve in her own language"); any other person described below is replaced by this same character.'), `F13 3df0553d: a âncora dentro da ORDEM para no ")" que a fecha; a ORDEM fica inteira (${a})`) }
  // a referência do personagem fixo e o limite da imagem
  { // a frase de continuidade como kling4PersonagemFixo a monta (rosto, roupa lida da ficha, época, cenário)
    const ref = { imageUrl: 'https://x/a.png', continuity: 'Keep the face and outfit of @Image1. white tank top, blue jeans. Use 1997 clothing, architecture and props. A small vintage clothing shop' }, r = F.referenciaSemFicha(ref)
    no(r?.continuity !== 'Use 1997 clothing, architecture and props. A small vintage clothing shop' || r?.imageUrl !== ref.imageUrl || !ref.continuity.startsWith('Keep') || F.referenciaSemFicha(undefined) !== undefined, `L1 sem a ficha, a continuidade perde o rosto e a roupa da ficha; ficam a época e o cenário; a imagem fica (${r?.continuity})`)
    const r2 = F.referenciaSemFicha({ imageUrl: 'u', continuity: 'Keep the face and outfit of @Image1. a red coat. Match the clothing and setting of the story.' }), r3 = F.referenciaSemFicha({ imageUrl: 'u', continuity: 'Keep the face and outfit of @Image1.' })
    const tail = K.buildKling4ReferenceInput([{ prompt: 'A man walks. Mouth closed, no speaking.', duration: 5 }], { imageUrl: 'u', continuity: r3?.continuity ?? '' }).input.multi_prompt[0].prompt
    no(r2?.continuity !== 'Match the clothing and setting of the story.' || r3?.continuity !== 'Match the clothing and setting of the story.' || tail !== 'A man walks. Match the clothing and setting of the story. Mouth closed, no speaking.', `L2 nunca vazia (lib/kling4Trial.ts não muda, preso pelo recibo do test-k4-despacho-0211): ${tail}`) }
  { const l0 = F.limiteDaImagem({ acao: 'nada', imagens: ['u', null], referencia: true }), l1 = F.limiteDaImagem({ acao: 'sem_ficha', imagens: ['u', null, 'v'], referencia: false }), l2 = F.limiteDaImagem({ acao: 'sem_ancoras', imagens: null, referencia: true })
    no(l0.imagens_com_a_ficha !== 0 || l0.ficha_so_saiu_do_texto || l1.imagens_com_a_ficha !== 2 || !l1.ficha_so_saiu_do_texto || l1.referencia_com_a_ficha || l2.imagens_com_a_ficha !== null || !l2.referencia_com_a_ficha || !l2.ficha_so_saiu_do_texto, `L3 o limite honesto: imagens desenhadas com a ficha que vão ao motor (${JSON.stringify([l0, l1, l2])})`) }
  // o eco = o envio (4eb0c0c9 plano 3: depois que a ficha sai, a superfície cabe; cortar o plano já montado não a punha)
  { const real = envio(ECO, ECO.cenas.map(F.semFicha)), velho = envio(ECO, ECO.cenas).map(F.semFicha)
    no(!real[2].includes('Every page shows only aged texture') || real[2] === velho[2], `E1 4eb0c0c9: a ficha sai das CENAS e o plano é montado de novo (${real[2]})`) }
  // a decisão
  const juiz = (v) => { const c = []; return { c, f: async (ps) => { c.push(ps); if (v instanceof Error) throw v; return v } } }
  { const j = juiz(APROVADA); const r = await F.fichaQueVaiAoMotor({ veredito: APROVADA, prompts: [NATAL], julgarDeNovo: j.f })
    no(r.relato.acao !== 'nada' || r.prompts[0] !== NATAL || j.c.length, 'D1 ficha aprovada: nada muda, byte a byte, sem 2ª leitura') }
  { const j = juiz(APROVADA); const r = await F.fichaQueVaiAoMotor({ veredito: REPROVADA, prompts: [NATAL], julgarDeNovo: j.f })
    no(r.relato.acao !== 'sem_ancoras' || r.prompts[0] !== a1 || j.c.length !== 1 || j.c[0][0] !== a1, `D2 reprovada e aprovada sem as âncoras: vai a ficha sem âncoras (o juiz lê o texto novo) (${r.relato.acao})`) }
  for (const [nome, v] of [['reprovada de novo', REPROVADA], ['juiz sem veredito (prazo)', null], ['juiz com erro', new Error('x')], ['juiz não julgou', { status: 'UNVERIFIED', falhas: [] }]]) {
    const r = await F.fichaQueVaiAoMotor({ veredito: REPROVADA, prompts: [NATAL, EVA], julgarDeNovo: juiz(v).f })
    no(r.relato.acao !== 'sem_ficha' || r.prompts[0] !== s1 || r.prompts[1] !== s2, `D3 ${nome}: a ficha sai dos planos (o caminho sem ficha) (${r.relato.acao})`)
  }
  { const semAncora = 'Photoreal film. Identity: the man, a tall man in a grey coat. He walks. no readable text'
    const j = juiz(APROVADA); const r = await F.fichaQueVaiAoMotor({ veredito: REPROVADA, prompts: [semAncora], julgarDeNovo: j.f })
    no(r.relato.acao !== 'sem_ficha' || j.c.length !== 0 || /Identity/.test(r.prompts[0]), 'D4 sem âncora nossa para tirar: a reprovada sai direto (nenhuma 2ª leitura à toa)') }
  { const j = juiz(REPROVADA); const r = await F.fichaQueVaiAoMotor({ veredito: { status: 'UNVERIFIED', falhas: ['a_ficha'] }, prompts: [NATAL], julgarDeNovo: j.f })
    no(r.relato.acao !== 'nada' || r.relato.reprovada_antes || r.prompts[0] !== NATAL || j.c.length, 'D5 o juiz não julgou (status ≠ JUDGED), mesmo com a_ficha: nada muda') }
  for (const v of [null, undefined]) { const j = juiz(REPROVADA); const r = await F.fichaQueVaiAoMotor({ veredito: v, prompts: [NATAL], julgarDeNovo: j.f })
    no(r.relato.acao !== 'nada' || r.relato.reprovada_antes || r.prompts[0] !== NATAL || j.c.length, `D6 juiz sem veredito na 1ª leitura (${v}): nada muda, sem 2ª leitura`) }
  { const quebra = { toString() { throw new Error('plano ilegível') } }; let r = null, lancou = false
    try { r = await F.fichaQueVaiAoMotor({ veredito: REPROVADA, prompts: [quebra, NATAL], julgarDeNovo: juiz(REPROVADA).f }) } catch { lancou = true }
    no(lancou || !r || r.prompts[0] !== quebra || r.prompts[1] !== NATAL, 'D7 erro no passo de fora: os planos seguem como estavam e o filme não cai') }
  // a rota
  no(!rota.includes("const fr1911 = await fichaQueVaiAoMotor({ veredito: rA2.veredito as { status?: string; falhas?: readonly string[] } | null, prompts: [...kling4PromptsDasCenas1911], julgarDeNovo: async (ps) => { aplicarCenas1911(ps); const e = kling4EnvioDoFilme();") || !rota.includes('          aplicarCenas1911(fr1911.prompts)\n'), 'R1 o envio: o passo roda sobre as cenas (as metades e a cena inteira nascem delas), depois da revisão do A2, e o juiz lê os planos montados')
  { const iA = rota.indexOf('          const fr1911 = await fichaQueVaiAoMotor('), iP = rota.indexOf('kling4Trial = await orchestrateKling4Trial({')
    no(!(iA > 0 && iP > iA), 'R2 a ficha é decidida ANTES da reserva e do POST pago') }
  no(!rota.includes('final: { planos: fichaEco1911 ? fichaEco1911.prompts : vaiAFal.planos,') || !rota.includes('ficha_reprovada: fichaEco1911 ? { ...fichaEco1911.relato, ...fichaEco1911.limite, antes: vaiAFal.planos } : null,'), 'R3 o eco do dry_run mostra o texto que iria ao motor, antes e depois, com o limite da imagem')
  no(!rota.includes("prompts: k4, julgarDeNovo: async (ps) => { const m = await montarComCenas1911(ps); return julgar(m.planos, m.falas) } })") || !rota.includes("const m = fr.relato.acao === 'nada' ? vaiAFal : await montarComCenas1911(fr.prompts)") || !rota.includes("let ps = secoes.some((x) => typeof x.descricao === 'string') ? promptsDeCenaInteira(cenas, secoes, falasCena) : [...cenas]"), 'R3b o eco faz o passo do envio: nas cenas, e monta de novo (o eco é o texto que vai ao motor)')
  no(!rota.includes("if (fr1911.relato.acao === 'sem_ficha') kling4Timing.fixedCharacter = referenciaSemFicha(kling4Timing.fixedCharacter)") || !rota.includes("if (fr.relato.acao === 'sem_ficha') timingDoEco.fixedCharacter = referenciaSemFicha(timingDoEco.fixedCharacter)"), 'R5 sem a ficha, a referência do personagem fixo perde a continuidade no envio e no eco')
  { const ev = over[EVT] ?? read(EVT), i0 = ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), lista = i0 >= 0 ? ev.slice(i0, ev.indexOf('])', i0)) : ''
    no(!/^\s*'kling4_ficha_reprovada',/m.test(lista) || F.FICHA_REPROVADA_EVENTO !== 'kling4_ficha_reprovada' || !rota.includes('          if (fr1911.relato.reprovada_antes) void writeServerEvent({ name: FICHA_REPROVADA_EVENTO,') || !rota.includes('metadata: { generation_id: generationId, ...fr1911.relato, ...limiteDaImagem({ acao: fr1911.relato.acao, imagens: kling4ApprovedStills, referencia: !!kling4Timing.fixedCharacter }) } })'), 'R4 o evento é só do servidor, só quando a ficha foi reprovada, e grava a ação, os vereditos e o limite da imagem (nunca texto)') }
  return p
}

const MUT = [
  ['público', LIB, (s) => s.replace("export const FICHA_REPROVADA_1911: ModoFichaReprovada1911 = 'internal'", "export const FICHA_REPROVADA_1911: ModoFichaReprovada1911 = 'public'")],
  ['rota: régua larga', ROTA, (s) => s.replace('fichaReprovadaLigada(FICHA_REPROVADA_1911, isDryRunAccount(user.email))', 'fichaReprovadaLigada(FICHA_REPROVADA_1911, isInternalEmail(user.email))')],
  ['a origem fica', LIB, (s) => s.replace('const MARCA_DO_VALOR_RE = /[;,]\\s*(?:appearance anchors|origin):/gu', 'const MARCA_DO_VALOR_RE = /[;,]\\s*(?:appearance anchors):/gu')],
  ['as âncoras ficam', LIB, (s) => s.replace('const MARCA_DO_VALOR_RE = /[;,]\\s*(?:appearance anchors|origin):/gu', 'const MARCA_DO_VALOR_RE = /[;,]\\s*(?:origin):/gu')],
  ['a linha Identity fica', LIB, (s) => s.replace('  return [...t, ...achados(m, CLAUSULA_RE), ...achados(m, LINHA_RE)]', '  return [...t, ...achados(m, CLAUSULA_RE)]')],
  ['a cláusula da ficha travada fica', LIB, (s) => s.replace('  return [...t, ...achados(m, CLAUSULA_RE), ...achados(m, LINHA_RE)]', '  return [...t, ...achados(m, LINHA_RE)]')],
  ['a ORDEM fechada fica', LIB, (s) => s.replace('  const t = achados(m, ORDEM_FECHADA_RE)\n', '  const t: Trecho[] = []\n')],
  ['a ORDEM cortada pelo teto fica', LIB, (s) => s.replace('  for (let i = m.indexOf(ORDEM_ABRE); i >= 0; i = m.indexOf(ORDEM_ABRE, i + 1)) {', '  for (let i = m.indexOf(ORDEM_ABRE); i >= 0 && false; i = m.indexOf(ORDEM_ABRE, i + 1)) {')],
  ['as feições ficam', LIB, (s) => s.split('...achados(m, FEICOES_RE)').join('')],
  ['aspas sem máscara', LIB, (s) => s.replace('  const m = t.replace(ASPAS_RE, (x) => { q.push(x); return `\\u0001${q.length - 1}\\u0002` })', '  const m = t')],
  ['aspas abertas até o fim', LIB, (s) => s.replace("const ASPAS_RE = new RegExp('\"[^\"]*\"|\"(?:(?!;\\\\s*(?:appearance anchors|origin):|' + PROTECAO_DO_FIM + ')[^\"])*', 'gu')", 'const ASPAS_RE = /"[^"]*(?:"|$)/gu')],
  ['o valor para no ponto do 1.80', LIB, (s) => s.replace("    else if (c === '.' && (k + 1 >= m.length || /[\\s,]/u.test(m[k + 1])) && SEM_ABREVIACAO_NO_FIM_RE.test(m.slice(0, k))) return k", "    else if (c === '.') return k")],
  ['o valor passa do ")" da ORDEM', LIB, (s) => s.replace("    else if (c === ')') { if (fundo === 0) return k; fundo-- }", "    else if (c === ')') { if (fundo > 0) fundo-- }")],
  ['"Dr." termina a ficha', LIB, (s) => s.replace('const PONTO_FINAL = ABREVIACAO + String.raw`\\.(?=\\s|$)`', 'const PONTO_FINAL = String.raw`\\.(?=\\s|$)`')],
  ['corte no plano inteiro', LIB, (s) => s.replace('  for (const [a, b] of trechosDaFicha(m)) for (const x of m.slice(a, b).matchAll(MARCA_DO_VALOR_RE))', '  for (const [a, b] of [[0, m.length]]) for (const x of m.slice(a, b).matchAll(MARCA_DO_VALOR_RE))')],
  ['a junta não tira a vírgula órfã', LIB, (s) => s.replace("  if (/[.!?]$/u.test(l) && /^[,;]/u.test(r)) r = r.replace(/^[,;]+\\s*/u, '')\n", '')],
  ['sem a 2ª leitura', LIB, (s) => s.replace("      relato.reprovada_depois = v2 && v2.status === 'JUDGED' ? fichaReprovada(v2) : null\n", '      relato.reprovada_depois = false\n')],
  ['juiz que não julgou aprova', LIB, (s) => s.replace("relato.reprovada_depois = v2 && v2.status === 'JUDGED' ? fichaReprovada(v2) : null", 'relato.reprovada_depois = fichaReprovada(v2)')],
  ['reprovada segue como está', LIB, (s) => s.replace("    relato.acao = 'sem_ficha'; relato.ms = Date.now() - t0\n    return { prompts: base.map(semFicha), relato }", '    relato.ms = Date.now() - t0\n    return { prompts: base, relato }')],
  // os 5 vivos da 9ª passada do revisor
  ['qualquer status reprova', LIB, (s) => s.replace("!!v && v.status === 'JUDGED' && (v.falhas", '!!v && (v.falhas')],
  ['juiz que não julgou NA 1ª reprova', LIB, (s) => s.replace('reprovada_antes: fichaReprovada(a.veredito)', 'reprovada_antes: !a.veredito || fichaReprovada(a.veredito)')],
  ['erro externo lança', LIB, (s) => s.replace('    relato.ms = Date.now() - t0\n    return { prompts: base, relato }\n  }', "    throw new Error('x')\n  }")],
  ['rota: evento sempre', ROTA, (s) => s.replace('if (fr1911.relato.reprovada_antes) void writeServerEvent({ name: FICHA_REPROVADA_EVENTO', 'void writeServerEvent({ name: FICHA_REPROVADA_EVENTO')],
  ['a junta some (a arrumação da pontuação desaparece)', LIB, (s) => s.replace("  return partes.reduce((acc, p, i) => (i === 0 ? p : juntar(acc, p)), '')", "  return partes.join('')")],
  // rota, referência e limite
  ['rota: o passo não aplica', ROTA, (s) => s.replace('          aplicarCenas1911(fr1911.prompts)\n', '')],
  ['rota: eco mostra o de antes', ROTA, (s) => s.replace('final: { planos: fichaEco1911 ? fichaEco1911.prompts : vaiAFal.planos,', 'final: { planos: vaiAFal.planos,')],
  ['rota: eco corta os planos montados', ROTA, (s) => s.replace('prompts: k4, julgarDeNovo: async (ps) => { const m = await montarComCenas1911(ps)', 'prompts: vaiAFal.planos, julgarDeNovo: async (ps) => { const m = await montarComCenas1911(ps)')],
  ['rota: eco não monta de novo', ROTA, (s) => s.replace("const m = fr.relato.acao === 'nada' ? vaiAFal : await montarComCenas1911(fr.prompts)", 'const m = vaiAFal')],
  ['rota: montar ignora as cenas', ROTA, (s) => s.replace("let ps = secoes.some((x) => typeof x.descricao === 'string') ? promptsDeCenaInteira(cenas, secoes, falasCena) : [...cenas]", "let ps = secoes.some((x) => typeof x.descricao === 'string') ? promptsDeCenaInteira(k4, secoes, falasCena) : [...k4]")],
  ['rota: a referência mantém a continuidade', ROTA, (s) => s.replace("if (fr1911.relato.acao === 'sem_ficha') kling4Timing.fixedCharacter = referenciaSemFicha(kling4Timing.fixedCharacter)", "if (fr1911.relato.acao === 'sem_ficha') kling4Timing.fixedCharacter = kling4Timing.fixedCharacter")],
  ['rota: evento sem o limite da imagem', ROTA, (s) => s.replace('...fr1911.relato, ...limiteDaImagem({ acao: fr1911.relato.acao, imagens: kling4ApprovedStills, referencia: !!kling4Timing.fixedCharacter }) } })', '...fr1911.relato } })')],
  ['rota: evento com texto', ROTA, (s) => s.replace('...limiteDaImagem({ acao: fr1911.relato.acao, imagens: kling4ApprovedStills, referencia: !!kling4Timing.fixedCharacter }) } })', '...limiteDaImagem({ acao: fr1911.relato.acao, imagens: kling4ApprovedStills, referencia: !!kling4Timing.fixedCharacter }), planos: fr1911.prompts } })')],
  ['referência mantém a continuidade', LIB, (s) => s.replace('  return { ...r, continuity: i >= 0 ? r.continuity.slice(i) : ', '  return { ...r, continuity: i >= 0 ? r.continuity : ')],
  ['referência vazia', LIB, (s) => s.replace("r.continuity.slice(i) : 'Match the clothing and setting of the story.' }", "r.continuity.slice(i) : '' }")],
  ['limite conta zero', LIB, (s) => s.replace('imagens_com_a_ficha: mexeu ? desenhadas : 0', 'imagens_com_a_ficha: 0')],
  ['evento fora da lista', EVT, (s) => s.replace("  'kling4_ficha_reprovada', // KINEO", "  // 'kling4_ficha_reprovada', // KINEO")],
]
const p0 = await prova()
if (p0.length) { console.error('FAIL test-ficha-reprovada-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) { const o = read(arq), m = f(o); if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue } if (!(await prova({ [arq]: m })).length) vivos.push(nome) }
if (vivos.length) { console.error('FAIL test-ficha-reprovada-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-ficha-reprovada-1911 (planos reais da prova paga e da 9ª passada: deb1ec95, 698974cc, 21007cc3, 42bcd59f e o eco do 4eb0c0c9; a ficha reprovada sai sem as âncoras da folha ou inteira; ${MUT.length} mutantes mortos)`)
