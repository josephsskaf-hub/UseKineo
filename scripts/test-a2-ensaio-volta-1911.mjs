// KINEO-DESCRITOR-FORTE-1911 · a volta do ENSAIO A2 [CEO 19/11: 51 pedidos por dry_run em produção, US$ 1,52; "melhora o meio, empata no fim"].
// Node puro, sem rede: replay OFFLINE dos 47 filmes do ensaio (docs/plano-da-fala-1911/ensaio-a2-replay.json, tirado de
// docs/decisoes-1911/tres-defeitos/ENSAIO-A2.json) e as peças da rota executadas com fetch/descritor falsos. Os quatro consertos:
//   A · "Aerial shot" abria o plano 1 em 34 de 47: o descritor por seção perde as 2 linhas de câmera da rota e não nomeia câmera.
//   B · frases cortadas e seções vazias: a descrição só se corta em frase; a seção nula ou que não coube é pedida de novo UMA vez (com o espaço do
//       plano); ainda faltando, o filme fica no caminho de hoje; os filmes que o A2 não cobre dizem o motivo.
//   C · o último plano perde o sujeito: o sujeito do pedido (o injetor) é exigido no último plano — a revisão reescreve a última seção, e o que faltar
//       entra pelo injetor depois da revisão.
//   D · a reescrita só rodava por nome: reprovação por sujeito sem plano apontado reescreve a última seção (com sujeito concreto); o juiz que se
//       contradiz (o sujeito dele escrito no plano) não vale; a nota mantém o que cada fala diz; nome que persiste = caminho de hoje.
// Mutantes no fim.
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const ROTA = 'app/api/generate-video-cinematic/route.ts', LIB = 'lib/kling4PlanoDaFala1911.ts', QP = 'lib/kling4QuatroPlanos.ts', SUJ = 'lib/cinematic/sujeitoObrigatorio.ts'
const REPLAY = JSON.parse(read('docs/plano-da-fala-1911/ensaio-a2-replay.json')).filmes
const COM_A2 = REPLAY.filter((f) => !f.sem_a2)
const norm = (t) => String(t ?? '').replace(/\s+/g, ' ').trim()
/** Extrai e executa um trecho da rota (do início da linha de `inicio` até o fim de `fim`) com o escopo dado; devolve `nome`. */
function daRota(rota, inicio, fim, nome, escopo) {
  const a = rota.lastIndexOf('\n', rota.indexOf(inicio)) + 1, b = rota.indexOf(fim, a)
  if (a <= 0 || b < 0) throw new Error(`trecho ${nome} não achado`)
  const js = ts.transpile(rota.slice(a, b + fim.length) + `\nreturn ${nome}`, { target: ts.ScriptTarget.ES2022 })
  return Function(...Object.keys(escopo), js)(...Object.values(escopo))
}

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  const load = createOfflineLoader({ globals: { Response, setTimeout, clearTimeout, AbortController }, source: (rel, src) => over[rel] ?? src })
  let L, Q, S
  try { L = load('@/' + LIB); Q = load('@/' + QP); S = load('@/' + SUJ) } catch (e) { return [`libs não carregam: ${e.message}`] }
  const rota = over[ROTA] ?? read(ROTA)

  // ── A · o "Aerial shot" ──
  no(COM_A2.filter((f) => /^\s*aerial\b/i.test(f.descricoes?.[0] ?? '')).length !== 34, 'A0 o defeito medido: "Aerial" abre a descrição 1 em 34 dos 47')
  const camera = rota.split('\n').filter((l) => /^- (?:Include a camera move|VARY the camera move)\b/.test(l))
  const sis = ['You are a cinematographer.', '- Anchor the shot on the subject.', ...camera, '- Keep the approved look.'].join('\n')
  const sp = L.sistemaPorSecao(sis)
  no(camera.length !== 2 || /aerial/i.test(sp) || !sp.includes('- Anchor the shot on the subject.') || !sp.includes('- Keep the approved look.'), `A1 o sistema por seção perde as 2 linhas de câmera da rota ("aerial" primeiro) e guarda o resto (${camera.length})`)
  no(!/Do not name a camera move, lens or shot type/.test(L.REGRA_DO_PLANO_DA_FALA) || /\baerial\b/i.test(L.REGRA_DO_PLANO_DA_FALA), 'A2 a regra por seção não nomeia câmera (o enquadramento é da montagem), sem trocar por outro vício')
  no(!/FIRST sentence of each item is a complete shot on its own/.test(L.REGRA_DO_PLANO_DA_FALA) || !/Never describe how a named or recurring character looks/.test(L.REGRA_DO_PLANO_DA_FALA), 'A3 a 1ª frase basta sozinha; a aparência do personagem é da ficha (c968edac: "small green" contra a ficha "warm orange")')
  no(!rota.includes("{ role: 'system', content: porSecao ? sistemaPorSecao(system) + REGRA_DO_PLANO_DA_FALA : system }"), 'A4 só a chamada por seção perde a câmera; a das cenas fica a de sempre')

  // ── B · cortes e seções vazias, no replay dos 47 ──
  const medir = (QQ) => {
    const conta = { inteira: 0, virgulaVelha: 0, falaVelha: 0, virgulaNova: 0, pedeDeNovo: 0, filmes: new Set() }
    for (const f of COM_A2) f.descricoes.forEach((d0, j) => {
      if (typeof d0 !== 'string') return
      const d = norm(d0).replace(/[\s.!?…]+$/u, ''), relato = {}
      const plano = QQ.promptDaSecao(f.hoje[j], { voiceover: f.falas[Math.min(j, f.falas.length - 1)] ?? '', pexelsQuery: '', descricao: d0 }, { relato })
      if (norm(plano).includes(d)) { conta.inteira++; return }
      const velho = QQ.cortaInteiro(d, relato.espaco + 1, false)
      if (!velho) conta.falaVelha++; else if (!/[.!?]$/.test(velho)) conta.virgulaVelha++
      if (relato.caiuNaFala) { conta.pedeDeNovo++; conta.filmes.add(f.gen); return }
      const novo = QQ.cortaInteiro(d, relato.espaco + 1, true)
      if (!novo || !/[.!?]$/.test(novo) || !norm(plano).includes(novo)) conta.virgulaNova++
    })
    return { ...conta, filmes: conta.filmes.size }
  }
  // a ficha com a cláusula de estilo inteira (o código do 1º ensaio) × sem ela no plano com descrição (o de agora)
  let Q0 = null
  try { Q0 = createOfflineLoader({ source: (rel, src) => (rel === QP ? (over[QP] ?? src).replace('    const quemA1 = quemSemEstilo(quem)', '    const quemA1 = quem') : over[rel] ?? src) })('@/' + QP) } catch (e) { p.push(`B0 variante sem o corte do estilo não carrega: ${e.message}`) }
  const com = Q0 ? medir(Q0) : null, sem = medir(Q)
  no(!com || com.virgulaVelha !== 32 || com.falaVelha !== 3 || com.pedeDeNovo !== 35 || com.filmes !== 11, `B0 o defeito medido no replay, com a ficha inteira: a régua velha cortava 32 seções na vírgula e jogava 3 na fala crua; seriam 35 seções pedidas de novo em 11 filmes (${JSON.stringify(com)})`)
  no(sem.virgulaNova !== 0 || (com && com.virgulaNova !== 0), `B1 nenhum corte fora de frase vai ao motor (${sem.virgulaNova})`)
  no(sem.pedeDeNovo !== 6 || sem.filmes !== 3 || sem.inteira !== 171, `B2 sem a cláusula de estilo repetida, 171 de 177 seções cabem inteiras; só 6 (em 3 filmes) são pedidas de novo (${JSON.stringify(sem)})`)
  { const f = COM_A2.find((x) => x.gen === '03d002f3'), relato = {}
    const pl = Q.promptDaSecao(f.hoje[0], { voiceover: f.falas[0], pexelsQuery: '', descricao: f.descricoes[0] }, { relato })
    no(/in a vibrant\./.test(pl) || !(pl.includes(norm(f.descricoes[0]).replace(/[\s.!?…]+$/u, '')) || relato.caiuNaFala), `B3 03d002f3: "in a vibrant." nunca mais; a descrição inteira ou pedida de novo (${relato.espaco} caracteres)`) }
  // a cláusula de estilo sai SÓ no plano com descrição (porta 'internal'); o plano de hoje (sem descrição) fica byte a byte
  { const quem = 'Identity: Léo, 13 ans, exactly as the author wrote; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic), the same character design in every scene.'
    no(Q.quemSemEstilo(quem) !== 'Identity: Léo, 13 ans, exactly as the author wrote.' || Q.quemSemEstilo('Identity: the boy, a boy with red hair; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing.') !== 'Identity: the boy, a boy with red hair.' || Q.quemSemEstilo('Identity: Rex, a dog; a real living dog filmed in photorealistic live action, natural fur and true-to-life dog size and proportions.') !== 'Identity: Rex, a dog.' || Q.quemSemEstilo('Identity: the bear, a bear; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors.') !== 'Identity: the bear, a bear.', 'B10 a cláusula de estilo (texto nosso, 4 formas, inteira ou cortada) sai; nome e descrição do autor ficam')
    const cena = `3D animated film. ${quem} A boy runs. no readable text, letters, numbers, labels or signage anywhere in the frame`
    no(!Q.promptDaSecao(cena, { voiceover: 'He runs.', pexelsQuery: 'boy running' }).includes('the same character design in every scene'), 'B11 sem descrição por seção (o caminho de hoje), a ficha do plano fica inteira') }
  // a rota: completarDescricoes1911 executada com um descritor falso
  const chamadas = []
  let respostas = []
  const escopo = {
    prazoDoA1A2: L.prazoDoA1A2, // [revisor 19/11, condição 1] o teto somado do A1/A2 é o parâmetro padrão de completarDescricoes1911
    descricoesPorSecao: L.descricoesPorSecao, secoesParaODescritor: L.secoesParaODescritor, kling4DescritorForte1911: true, topicoDoDescritorA2: L.topicoDoDescritorA2, topicoComoDado: L.topicoComoDado,
    body: { original_idea: 'A plane vanishes' }, prompt: 'HOOK: x', classicVisualPolicy: {}, desenhoInfantil: { ativo: false }, MODELO_DO_DESCRITOR_FORTE: 'gpt-4o', usosDoDescritorA2: [],
    descricoesCompletas: L.descricoesCompletas, secoesQueNaoCabem: L.secoesQueNaoCabem, notaDoEspaco: L.notaDoEspaco, DESCRICAO_DE_NOVO_TETO_MS: 60_000,
    generateCinematicDescriptions: async (secoes, topico, _p, lote) => { chamadas.push({ n: secoes.length, topico, lote }); return respostas.shift() ?? null },
  }
  let completar
  try { completar = daRota(rota, '    const completarDescricoes1911 = async', "'prazo_dos_pedidos_de_novo' : 'erro' } }\n    }", 'completarDescricoes1911', escopo) } catch (e) { p.push(`B4 completarDescricoes1911 não executa: ${e.message}`) }
  if (completar) {
    const longa = 'Photoreal film. Identity: the pilot, a man in his early thirties with short dark hair, a leather jacket and a silver watch; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing, with calm grey eyes and a thin scar on the chin, the same face in every scene, recognizable in every shot. Shot focus: plane. no readable text, letters, numbers, labels or signage anywhere in the frame Mouth closed, no speaking.'
    const secoes = [{ voiceover: 'A plane took off.', pexelsQuery: 'plane' }, { voiceover: 'It vanished.', pexelsQuery: 'sky' }, { voiceover: 'Nobody found it.', pexelsQuery: 'sea' }]
    const falas = secoes.map((x) => x.voiceover)
    // nula (caed3456, 42bcd59f) → pedida de novo, só ela
    chamadas.length = 0; respostas = [['A small plane lifts off a wet runway at dawn.']]
    const r1 = await completar([null, 'The plane fades into a grey cloud bank.', 'Searchers scan an empty sea from a boat.'], secoes, ['Photoreal film. Shot focus: a.', 'Photoreal film. Shot focus: b.', 'Photoreal film. Shot focus: c.'], falas)
    no(chamadas.length !== 1 || chamadas[0].n !== 1 || chamadas[0].lote?.numeros?.[0] !== 1 || r1.descricoes?.[0] !== 'A small plane lifts off a wet runway at dawn.' || JSON.stringify(r1.pedidas) !== '[0]', `B4 seção nula: pedida de novo UMA vez, só ela (${JSON.stringify({ chamadas, r1 })})`)
    chamadas.length = 0; respostas = [[null]]
    const r2 = await completar([null, 'The plane fades into a grey cloud bank.', 'Searchers scan an empty sea from a boat.'], secoes, ['Photoreal film. Shot focus: a.', 'Photoreal film. Shot focus: b.', 'Photoreal film. Shot focus: c.'], falas)
    no(r2.descricoes !== null || r2.motivo !== 'descricao_nula_depois_de_pedir_de_novo' || chamadas.length !== 1, `B5 ainda nula: nenhuma descrição (o caminho de hoje), sem 2ª insistência (${JSON.stringify(r2)})`)
    // não coube (o plano caía na fala crua, 193e4465) → pedida de novo com o espaço do plano
    const comprida = 'A small silver plane with a red stripe lifts off a rain-soaked runway at dawn, mist curling around the wheels, the control tower glowing behind it, a lone mechanic watching from the hangar door, the windsock snapping in the wind'
    chamadas.length = 0; respostas = [['The plane lifts off a wet runway.']]
    const r3 = await completar([comprida, 'The plane fades into clouds.', 'Searchers scan the sea.'], secoes, [longa, longa, longa], falas)
    no(chamadas.length !== 1 || !/no longer than \d+ characters for shot 1/.test(chamadas[0]?.topico ?? '') || r3.descricoes?.[0] !== 'The plane lifts off a wet runway.', `B6 sem espaço: pedida de novo com o espaço do plano no pedido (${JSON.stringify({ topico: chamadas[0]?.topico?.slice(-160), r3 })})`)
    chamadas.length = 0; respostas = [[comprida]]
    const r4 = await completar([comprida, 'The plane fades into clouds.', 'Searchers scan the sea.'], secoes, [longa, longa, longa], falas)
    no(r4.descricoes !== null || r4.motivo !== 'descricao_nao_cabe_depois_de_pedir_de_novo', `B7 ainda sem espaço: o caminho de hoje (${JSON.stringify(r4)})`)
    // [revisor 19/11, 4ª passada] UM pedido a mais por seção: a nula que voltou comprida não é pedida outra vez por espaço (2 pedidos na mesma seção)
    chamadas.length = 0; respostas = [[comprida]]
    const r5 = await completar([null, 'The plane fades into clouds.', 'Searchers scan the sea.'], secoes, [longa, longa, longa], falas)
    no(chamadas.length !== 1 || r5.descricoes !== null || r5.motivo !== 'descricao_nao_cabe_depois_de_pedir_de_novo', `B12 a mesma seção nunca é pedida 2 vezes (${JSON.stringify({ n: chamadas.length, r5 })})`)
    // 60 s somados: o pedido que não volta a tempo = o caminho de hoje (o teto vem de DESCRICAO_DE_NOVO_TETO_MS)
    let devagar
    try { devagar = daRota(rota, '    const completarDescricoes1911 = async', "'prazo_dos_pedidos_de_novo' : 'erro' } }\n    }", 'completarDescricoes1911', { ...escopo, DESCRICAO_DE_NOVO_TETO_MS: 40, generateCinematicDescriptions: () => new Promise(() => {}) }) } catch (e) { p.push(`B13 não executa: ${e.message}`) }
    if (devagar) { const t = Date.now(); let tm6 = null; const r6 = await Promise.race([devagar([null, 'The plane fades into clouds.', 'Searchers scan the sea.'], secoes, [longa, longa, longa], falas), new Promise((ok) => { tm6 = setTimeout(() => ok({ descricoes: null, motivo: 'pendurou' }), 2000) })]); clearTimeout(tm6)
      no(r6.descricoes !== null || r6.motivo !== 'prazo_dos_pedidos_de_novo' || Date.now() - t > 2000, `B13 o pedido a mais tem teto de tempo somado: passou, caminho de hoje (${JSON.stringify(r6)})`) }
    no(!rota.includes('    const DESCRICAO_DE_NOVO_TETO_MS = 60_000'), 'B14 o teto somado dos pedidos a mais é 60 s (148 s do pior filme + 60 < 300 do maxDuration)')
  }
  no(!rota.includes("if (!d) return { versao: 'a2_ensaio_1911_v2', motivo: completas1911.motivo ?? 'descricoes_incompletas', caminho: 'hoje'") || !rota.includes("const c1911 = await completarDescricoes1911(d0, parsedScript.segments, kling4Prompts, scenes.map((s) => s.voiceover ?? ''), prazo1911); const d = c1911.descricoes") || !rota.includes("else voltaAoHoje1911(c1911.motivo ?? 'descricao_incompleta')"), /* [revisor 19/11] reancorado: a espera do descritor tem prazo e a queda grava o motivo */ 'B8 o envio e o eco usam a mesma conclusão; sem descrição completa = caminho de hoje, dito no eco')
  no(!rota.includes("motivo: parsedScript.segments.length < 2 ? 'sem_secoes' : parsedScript.segments.length < scenes.length ? 'secoes_menos_que_cenas'"), 'B9 os filmes que o A2 não cobre (982a6aeb: 2 seções; 32cbb2d4: roteiro corrido) dizem o motivo no eco')

  // ── C · o sujeito no último plano ──
  const leitura = { ok: true, valor: { subject: 'a missing plane', subject_visual: 'a small plane', head_noun: 'plane', kind: 'vehicle', has_human: false, real_person: false, mention_words: ['plane'], descartado: null, appearance: null, word_use: 'literal', reasoning: '', request_language: 'en' }, ms: 1, model: 'x', tentativas: 1 }
  const aviao = S.avaliarSujeito({ leitura }).sujeito
  { const quem = []
    const r = await L.revisarPlanosA2({ planos: () => ['A plane takes off.', 'Clouds roll.', 'Ocean waves at dusk.'], falas: () => ['a', 'b', 'c'], nSecoes: 3, rejulgar: false,
      julgar: async () => ({ status: 'JUDGED', falhas: [] }), nomes: async () => [], reescrever: async (alvo, nota) => { quem.push([alvo, nota]) },
      sujeito: (pl) => ({ frase: aviao.frase, noUltimo: S.promptMostraOSujeito(pl[pl.length - 1], aviao) }) })
    no(!r.ultimo_sem_sujeito || JSON.stringify(quem[0]?.[0]) !== '[2]' || !/The LAST shot must clearly show a small plane/.test(quem[0]?.[1] ?? ''), `C1 último plano sem o sujeito do pedido: a revisão reescreve a última seção com o sujeito na nota (${JSON.stringify(quem)})`)
    const quem2 = []
    const r2 = await L.revisarPlanosA2({ planos: () => ['Clouds roll.', 'The sea.', 'A small plane skims the waves.'], falas: () => ['a', 'b', 'c'], nSecoes: 3, rejulgar: false,
      julgar: async () => ({ status: 'JUDGED', falhas: [] }), nomes: async () => [], reescrever: async (alvo, nota) => { quem2.push([alvo, nota]) },
      sujeito: (pl) => ({ frase: aviao.frase, noUltimo: S.promptMostraOSujeito(pl[pl.length - 1], aviao) }) })
    no(r2.ultimo_sem_sujeito || quem2.length, 'C2 com o sujeito no último plano, nada a reescrever') }
  { let garantir
    const segs = [{ voiceover: 'A small plane took off and vanished.', pexelsQuery: 'a', descricao: 'Clouds.' }]
    const flag = { ligado: false }
    try { garantir = daRota(rota, '    const garantirSujeitoNoUltimo1911 = ', '}\n', 'garantirSujeitoNoUltimo1911', { ultimoComSujeito1911: flag, kling4Sujeito: { r: { obrigatorio: aviao } }, parsedScript: { segments: segs }, promptMostraOSujeito: S.promptMostraOSujeito, comSujeitoNaCena: S.comSujeitoNaCena, sujeitoExigidoNoUltimo: S.sujeitoExigidoNoUltimo }) } catch (e) { p.push(`C3 garantirSujeitoNoUltimo1911 não executa: ${e.message}`) }
    if (garantir) {
      const um = { prompts: ['Photoreal film. Clouds roll.', 'Photoreal film. Ocean waves under a grey sky. no readable text, letters, numbers, labels or signage anywhere in the frame'] }
      garantir(um)
      no(um.prompts[1].includes('a small plane'), 'C3 desligado (durante a revisão) = nada injetado: a revisão vê o plano como ele é')
      flag.ligado = true; garantir(um)
      no(!um.prompts[1].includes('Main subject clearly visible in frame: a small plane.') || um.prompts[0].includes('plane'), `C4 ligado depois da revisão: o sujeito entra SÓ no último plano (${um.prompts[1]})`)
      const hoje = { prompts: ['Photoreal film. Clouds.', 'Photoreal film. Ocean waves.'] }; delete segs[0].descricao; garantir(hoje)
      no(hoje.prompts[1].includes('plane'), 'C5 sem descrição por seção (o caminho de hoje) = nada muda') }
    no(!rota.includes('    const ultimoComSujeito1911 = { ligado: false }') || !rota.includes('      garantirSujeitoNoUltimo1911(r3) // [ensaio A2 19/11]') || !rota.includes('        else ultimoComSujeito1911.ligado = !!sujeitoA21911 // [ensaio A2 19/11]') || !rota.includes('        ultimoComSujeito1911.ligado = !caiNoHoje1911 && sujeitoDoFilme(parsedScript.segments.map((x) => x.voiceover), atual.obrigatorio)') || !rota.includes('        const vaiAFal = caiNoHoje1911 ? hoje : await montar(secoes)\n        ultimoComSujeito1911.ligado = false'), 'C6 a rota: o sujeito no último plano só liga depois da revisão (envio) e só na montagem final (eco)') }

  // ── D · a reescrita ──
  const sel = (gen, extra) => { const f = COM_A2.find((x) => x.gen === gen); return L.secoesAReescrever(f.juiz, f.novo.length, f.descricoes.length, { planos: f.novo, ...extra }).map((x) => x + 1) }
  no(JSON.stringify(sel('876487b4', { sujeitoConcreto: true })) !== '[3]' || JSON.stringify(sel('44d02f20', { sujeitoConcreto: true })) !== '[4]' || JSON.stringify(sel('c827ec0d', { sujeitoConcreto: true })) !== '[4]', 'D1 reprovação por sujeito sem plano apontado (eram 5 sem reescrita): a última seção, com sujeito concreto')
  no(JSON.stringify(sel('44d02f20', {})) !== '[4]' || JSON.stringify(sel('1c770cb7', {})) !== '[]', 'D2 [2º ensaio] sem sujeito do leitor também reescreve a última seção (a nota pede o sujeito do juiz em forma concreta); a ficha reprovada em TODO plano (1c770cb7) não reescreve')
  no(JSON.stringify(sel('f133c184', { sujeitoConcreto: true })) !== '[]' || !L.sujeitoDoJuizEscrito(COM_A2.find((x) => x.gen === 'f133c184').juiz, COM_A2.find((x) => x.gen === 'f133c184').novo), 'D3 f133c184: o juiz diz "Mount Vesuvius" ausente com o Vesúvio escrito na ação: a falha não vale')
  // [revisor 19/11, 4ª passada] só a AÇÃO, com fronteira de palavra, sem negação; sujeito vazio nunca anula
  { const v = (d) => ({ status: 'JUDGED', falhas: ['d_sujeito'], cenas_reescreveria: [], d_sujeito: d }), j = L.sujeitoDoJuizEscrito
    no(j(v('plane'), ['Photoreal film. Clouds roll over the sea, with no plane anywhere. no readable text, letters']) || j(v('hikers'), ['Photoreal film. A dark forest without the hikers.']), 'D3b a menção negada não conta ("no plane", "without the hikers")')
    no(j(v('cat'), ['Photoreal film. An education center at dawn.']) || j(v('man'), ['Photoreal film. A woman walks home.']), 'D3c fronteira de palavra ("cat" ≠ "education", "man" ≠ "woman")')
    no(j(v('Sarah'), ['Photoreal film. Identity: Sarah, a woman with red hair. The last photo strip on a table. no readable text']) || j(v('Mount Vesuvius'), ['Photoreal film. Setting: Mount Vesuvius (the real landmark). An empty street at dawn.']), 'D3d o sujeito só na ficha (Identity:) ou no lugar (Setting:) é o sujeito escondido: o juiz vale')
    no(j(v(''), ['Photoreal film. A plane.']) || j(v('  '), ['x']) || JSON.stringify(L.secoesAReescrever({ ...v(''), cenas_reescreveria: [2] }, 3, 3, { planos: ['a', 'b', 'c'] })) !== '[1]', 'D3e sujeito vazio nunca anula o juiz (o mutante R14 do revisor)')
    no(!j(v('plane'), ['Photoreal film. Medium shot. A small plane skims the waves. no readable text']), 'D3f a menção na ação, sem negação, conta') }
  { const f = COM_A2.find((x) => x.gen === '804e9f0b'), nota = L.notaDaReescrita(f.juiz, {})
    no(!/Each shot keeps exactly who and what its own narration line says; add only what was missing/.test(nota) || /show that subject clearly, doing what each narration line says/.test(nota), 'D4 804e9f0b: a nota não manda pôr o sujeito do juiz em todo plano (a partida do pai virou o Victor no cockpit)') }
  { const r = await L.revisarPlanosA2({ planos: () => ['Metal Sonic runs.', 'b', 'c'], falas: () => ['a', 'b', 'c'], nSecoes: 3, rejulgar: false, julgar: async () => ({ status: 'JUDGED', falhas: [] }), nomes: async () => [0], reescrever: async () => {}, nomesDeNovo: true })
    no(JSON.stringify(r.nomes_depois) !== '[1]', `D5 nome que persiste depois da reescrita é apontado (ac9bb8f8: "Metal Sonic", "Green Hills") (${JSON.stringify(r.nomes_depois)})`) }
  // [revisor 19/11] reancorado: a volta ao caminho de hoje mora em voltaAoHoje1911 (sem descrição, as cenas originais, sem o sujeito no último plano, e o evento)
  no(!rota.includes("else if ((rA2.nomes_depois ?? []).length) voltaAoHoje1911('nome_persistiu')") || !rota.includes("parsedScript.segments.forEach((x) => { delete (x as { descricao?: unknown }).descricao }); kling4PromptsDasCenas1911.forEach((p, i) => { kling4Prompts[i] = p })") || !rota.includes("const caiNoHoje1911 = (r.nomes_depois ?? []).length > 0"), 'D6 nome que persiste = o filme volta ao caminho de hoje (envio e eco)')
  return p
}

const MUT = [
  ['câmera continua', LIB, (s) => s.replace(".filter((l) => !/^- (?:Include a camera move|VARY the camera move)\\b/.test(l))", '')],
  ['regra sem o "não nomeie câmera"', LIB, (s) => s.replace("'\\n- Do not name a camera move, lens or shot type: the editor sets the framing of every shot. Describe only what is seen: who, doing what, where.' +\n", '')],
  ['rota: câmera na chamada por seção', ROTA, (s) => s.replace('content: porSecao ? sistemaPorSecao(system) + REGRA_DO_PLANO_DA_FALA : system }', 'content: porSecao ? system + REGRA_DO_PLANO_DA_FALA : system }')],
  ['corte na vírgula volta', QP, (s) => s.replace('  if (soFrase) return null\n', '')],
  ['não aponta a que não cabe', QP, (s) => s.replace('opcoes.relato.caiuNaFala = cortaInteiro(dA1, maxAcao - 1, true) === null', 'opcoes.relato.caiuNaFala = false')],
  ['rota: nula não é pedida de novo', ROTA, (s) => s.replace("        if (nulas.length) { pedidas.push(...nulas); await pedir(nulas, '') }\n", '')],
  ['rota: sem espaço não é pedida de novo', ROTA, (s) => s.replace("        await pedir(fora.map((f) => f.secao), notaDoEspaco(fora.map((f) => ({ numero: f.secao + 1, espaco: f.espaco }))))\n", '')],
  ['rota: aceita a que não coube', ROTA, (s) => s.replace("        if (!c2 || secoesQueNaoCabem(promptsDasCenas, secoes.map((x, j) => ({ ...x, descricao: c2[j] })), falasDasCenas, kling4DescritorForte1911).length) return", '        if (!c2) return')],
  ['rota: injeção ligada na revisão', ROTA, (s) => s.replace('    const ultimoComSujeito1911 = { ligado: false }', '    const ultimoComSujeito1911 = { ligado: true }')],
  ['rota: injeção no caminho de hoje', ROTA, (s) => s.replace(" && parsedScript.segments.some((x) => typeof (x as { descricao?: unknown }).descricao === 'string') && !promptMostraOSujeito(r.prompts[k], s1911)", ' && !promptMostraOSujeito(r.prompts[k], s1911)')],
  ['revisão sem o sujeito no último', LIB, (s) => s.replace('  if (extra.ultimoSemSujeito) alvo.add(nSecoes - 1)', '  if (false) alvo.add(nSecoes - 1)')],
  ['sujeito sem plano não reescreve', LIB, (s) => s.replace("  if (falhas.includes('d_sujeito') && !(v.cenas_reescreveria ?? []).length && norm(v.d_sujeito).length >= 3) alvo.add(nSecoes - 1)", '  if (false) alvo.add(nSecoes - 1)')],
  ['estilo repetido fica no plano com descrição', QP, (s) => s.replace('    const quemA1 = quemSemEstilo(quem)', '    const quemA1 = quem')],
  ['estilo sai também do plano de hoje', QP, (s) => s.replace("  return norm(`${meio} ${luz} ${periodo} ${origem} ${quem} ${lugar} ${acao}", "  return norm(`${meio} ${luz} ${periodo} ${origem} ${quemSemEstilo(quem)} ${lugar} ${acao}")],
  ['juiz: o plano inteiro', LIB, (s) => s.replace('const a = acaoDoPlano(p); for', 'const a = norm(p); for')],
  ['juiz: sem fronteira', LIB, (s) => s.replace("const re = new RegExp(`(?<![\\\\p{L}\\\\p{N}])${", "const re = new RegExp(`${").replace("}(?![\\\\p{L}\\\\p{N}])`, 'giu')", "}`, 'giu')")],
  ['juiz: negação conta', LIB, (s) => s.replace('if (!NEGADO_ANTES.test(a.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0))) return true', 'return true')],
  ['juiz: sujeito vazio anula', LIB, (s) => s.replace("  if (!planos?.length || Array.from(d.replace(/[^\\p{L}\\p{N}]+/gu, '')).length < 3) return false\n", "  if (!planos?.length) return false\n")],
  ['rota: a mesma seção 2 vezes', ROTA, (s) => s.replace("        if (fora.some((f) => pedidas.includes(f.secao))) return { descricoes: null, pedidas, motivo: 'descricao_nao_cabe_depois_de_pedir_de_novo' }", '        if (false) return { descricoes: null, pedidas, motivo: \'x\' }')],
  ['rota: sem teto de tempo', ROTA, (s) => s.replace("if (resta <= 0) total.estourou = true; if (resta <= 0) return Promise.reject(new Error('prazo')); let tm: ReturnType<typeof setTimeout> | null = null; return Promise.race([p,", "return p; let tm: ReturnType<typeof setTimeout> | null = null; return Promise.race([p,")], // [revisor 19/11] reancorado: o prazo agora também respeita o teto somado do A1/A2
  ['juiz contraditório vale', LIB, (s) => s.replace(" && !(f === 'd_sujeito' && sujeitoDoJuizEscrito(v, extra.planos))", '')],
  ['a ficha em todo plano reescreve', LIB, (s) => s.replace(" && !(f === 'a_ficha' && apontados.length >= nSecoes))", ')')],
  ['nota antiga', LIB, (s) => s.replace(' Each shot keeps exactly who and what its own narration line says; add only what was missing.', ' Show that subject clearly, doing what each narration line says.')],
  ['nome não é conferido de novo', LIB, (s) => s.replace('    if (a.nomesDeNovo && comNome.length) {', '    if (false) {')],
  ['rota: nome que persiste segue', ROTA, (s) => s.replace("        else if ((rA2.nomes_depois ?? []).length) voltaAoHoje1911('nome_persistiu')", '        else if (false) {}')], // [revisor 19/11] reancorado: a volta mora em voltaAoHoje1911
]
const p0 = await prova()
if (p0.length) { console.error('FAIL test-a2-ensaio-volta-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) { const o = read(arq), m = f(o); if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue } if (!(await prova({ [arq]: m })).length) vivos.push(nome) }
if (vivos.length) { console.error('FAIL test-a2-ensaio-volta-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-a2-ensaio-volta-1911 (replay dos 47 do ensaio: "Aerial" 34/47 na descrição 1; vírgula 32 e fala crua 3 na régua velha → 0; sem a cláusula de estilo repetida, 6 seções pedidas de novo (eram 35); ${MUT.length} mutantes mortos)`)
