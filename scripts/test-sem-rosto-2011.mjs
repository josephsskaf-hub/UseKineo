// KINEO-SEM-ROSTO-2011 [revisor independente 20/11: "(1) cena 'sem_ficha' NÃO PODE ainda"] — guardião da descrição do A1/A2 no modo SEM ROSTO.
// O defeito: no filme sem rosto (documentary_faceless) a cena de hoje troca a pessoa por forma sem rosto (buildClassicVisualPrompt), mas a descrição
// por seção do A1/A2 ia ao motor como o descritor escreveu e o rosto voltava (98063aa2 "smiles enthusiastically at the camera"; 32c93ee3 "warmly
// greeting exactly five family members"). Aqui:
//  U · a régua do rosto e as duas funções da lib (a troca e a guarda), com casos escritos;
//  B · a troca da cena ficou BYTE A BYTE a de antes (buildClassicVisualPrompt da 7fda4c7d2, antes da extração), nos textos reais;
//  C · os 2 casos reais (descrições reais do 1º ensaio A2, gpt-4o);
//  R · replay dos 37 claims SEM ficha do Kling 4 grátis (32 sem rosto), no modo 'sem_ficha' de cliente: planos de costas não caem (hoje 9),
//      0 descrição com rosto, olhar ou sorriso no caminho novo de filme sem rosto, e fora do modo sem rosto nada muda;
//  W · a fiação da rota (a troca antes da conta do espaço, a guarda, a reescrita do A2);
//  e mutantes (cada um tem de ficar vermelho).
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
const LIB = 'lib/kling4PlanoDaFala1911.ts', POL = 'lib/cinematic/visualPromptPolicy.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const ANTES = '7fda4c7d2' // a main antes da extração (a troca da cena nascia dentro de buildClassicVisualPrompt)
const ler = (f) => lf(fs.readFileSync(f, 'utf8'))
const CASOS = JSON.parse(fs.readFileSync('scripts/test-support/sem-rosto-2011-casos.json', 'utf8')).filmes
const STYLE = { look: 'photoreal', suffix: '', lookPhrase: 'photorealistic, ultra-detailed' }
// a régua FIXA do guardião (a da lib pode ser mutada; esta não)
const ROSTO_FIXO = /\b(?:smil(?:e|es|ed|ing)|grin(?:s|ned|ning)?|laugh(?:s|ed|ing)?|faces?|facial|eyes?|gaz(?:e|es|ed|ing)|star(?:e|es|ed|ing) (?:at|into)|expressions?|portraits?|(?:at|to|toward|towards|into) the (?:camera|viewer|lens))\b/i
const DE_COSTAS = /seen from behind|silhouette|from behind|faceless|no face/i
let STATS = null

function mundo(over = {}) {
  const load = createOfflineLoader({ evaluationTimeoutMs: 120000, source: (rel, text) => (over[rel] ?? text) })
  return {
    parse: load('@/lib/scriptParser.ts').parseUserScript,
    Q: load('@/lib/kling4QuatroPlanos.ts'), C: load('@/lib/cinematic/cenaKling4.ts'), K: load('@/lib/kling4Trial.ts'),
    S: load('@/lib/cinematic/superficieSemTexto.ts'), V: load('@/lib/kling4PlanoVariado.ts'), L: load('@/' + LIB), P: load('@/' + POL),
  }
}

// a montagem do envio da rota (planos por seção + superfície + escala + build) — a mesma do replay do revisor (rv19)
function envio(W, prompts, stills, falas, secoes, nCenas) {
  const q = secoes.length > nCenas ? W.Q.planosPorSecao({ prompts, stills, falas, secoes, objetoConcreto: true }) : null
  const r = q ? { prompts: q.prompts, stills: q.stills, falas: q.falas } : { prompts, stills, falas }
  const r3 = W.V.planosComEscalaVariada(r.prompts.map((p) => W.S.comSuperficieNoPlano(p)), r.stills).prompts
  return W.K.buildKling4TrialInput(r3, r.stills, { voiceovers: r.falas, wordsPerSecond: 2.5 }).input.multi_prompt.map((m) => m.prompt)
}
/** O caminho do filme no modo 'sem_ficha' de cliente, como a rota: completarDescricoes1911 (a troca antes da conta do espaço) e a guarda do rosto. */
function caminho(W, f) {
  const base = f.cenas.map((p, i) => W.C.promptDaCenaKling4(p, STYLE, i, true)), stills = f.stills ?? base.map(() => null), falas = f.falas
  const segs = W.parse(f.roteiro).segments.map((s) => ({ voiceover: s.voiceover, pexelsQuery: s.pexelsQuery }))
  const nS = segs.length, nC = base.length, sr = f.modo === 'documentary_faceless'
  const hoje = envio(W, base, stills, falas, segs, nC)
  const comFicha = base.some(W.L.cenaTemFicha)
  if (comFicha) return { comFicha, hoje, out: hoje, caminho: 'hoje', motivo: 'com_ficha', sr }
  const a2 = nS >= nC && nS <= 5, a1 = !a2 && nS > nC
  if (!a1 && !a2) return { hoje, out: hoje, caminho: 'hoje', motivo: 'portao', sr }
  const D = f.descricoes_reais?.length === nS ? f.descricoes_reais : segs.map((s) => s.voiceover)
  const c1 = W.L.descricoesSemRosto(W.L.descricoesCompletas(W.L.descricoesPorSecao(D, nS), nS), sr)
  if (!c1) return { hoje, out: hoje, caminho: 'hoje', motivo: 'descricao_nula', sr }
  if (W.L.secoesQueNaoCabem(base, segs.map((x, j) => ({ ...x, descricao: c1[j] })), falas, a2).length) return { hoje, out: hoje, caminho: 'hoje', motivo: 'descricao_nao_cabe', sr }
  if (sr && c1.some(W.L.rostoNaDescricao)) return { hoje, out: hoje, caminho: 'hoje', motivo: W.L.SEM_ROSTO_MOTIVO, sr, d: c1 }
  const segsD = segs.map((s, j) => ({ ...s, descricao: c1[j] }))
  const prompts = a2 ? W.L.promptsDeCenaInteira(base, segsD, falas) : base
  return { hoje, out: envio(W, prompts, stills, falas, segsD, nC), caminho: a2 ? 'a2' : 'a1', motivo: null, sr, d: c1 }
}

async function prova(over = {}) {
  const e = []; const no = (c, m) => { if (c) e.push(m) }
  const W = mundo(over), L = W.L, P = W.P
  const rota = over[ROTA] ?? ler(ROTA)
  // ── U · a régua e as funções ──
  for (const t of ['A young blonde woman smiles enthusiastically at the camera.', 'her eyes sparkling in the light', 'Gabriel lying in bed, gazing thoughtfully at the ceiling', 'a man looks into the lens', 'a portrait of an old sailor', 'sunlight illuminates her face', 'a determined expression', 'she grinned', 'laughing children', 'a woman smiling warmly in the kitchen', 'the hiker stares at the stars', 'he turns toward the camera'])
    no(!L.rostoNaDescricao(t), `U1 rosto não visto: "${t}"`)
  for (const t of ['Aerial shot of a rocket launching from a space center.', 'The family seen from behind as distant silhouettes sees past events.', 'a ginger cat silhouetted against the moon', 'Close-up of a kettlebell swung by a muscular hand', 'a builder marking the ground with stakes'])
    no(L.rostoNaDescricao(t), `U1b falso rosto: "${t}"`)
  const comRosto = 'A young blonde woman in a pastel pink outfit smiles enthusiastically at the camera in a modern home setting.'
  const semRostoComGente = 'Wide shot of a woman walking along a foggy beach at dawn.'
  no(L.descricaoSemRosto(comRosto, true) !== null, 'U2 reescrita com rosto no modo sem rosto: não entra (null)')
  no(!/seen (?:in silhouette )?from behind/.test(String(L.descricaoSemRosto(semRostoComGente, true) ?? '')) || /\bwoman walking\b/.test(String(L.descricaoSemRosto(semRostoComGente, true))),`U2b reescrita com gente no modo sem rosto: a troca da cena (${L.descricaoSemRosto(semRostoComGente, true)})`)
  no(L.descricaoSemRosto(comRosto, false) !== comRosto || L.descricaoSemRosto(null, true) !== null || L.descricaoSemRosto('  ', true) !== null, 'U2c fora do modo sem rosto: a mesma; vazia ou nula: null')
  { const ds = [comRosto, semRostoComGente]; no(L.descricoesSemRosto(ds, false) !== ds || L.descricoesSemRosto(null, true) !== null, 'U3 fora do modo sem rosto: o mesmo vetor; nulo segue nulo')
    const t = L.descricoesSemRosto(ds, true); no(!t || t.length !== 2 || t.some((x) => //.test(x)) || !/seen (?:in silhouette )?from behind/.test(t[1]) || !t[0].includes('woman seen in silhouette from behind'), `U3b a troca de cada descrição, sem a marca interna (${JSON.stringify(t)})`) }
  no(L.SEM_ROSTO_MOTIVO !== 'sem_rosto_com_rosto', 'U4 o motivo no claim e no evento: sem_rosto_com_rosto')
  // ── B · a troca da cena byte a byte a de antes ──
  { const velho = createOfflineLoader({ evaluationTimeoutMs: 120000, source: (rel, text) => (rel === POL ? lf(execFileSync('git', ['show', `${ANTES}:${POL}`], { encoding: 'utf8', maxBuffer: 64 << 20 })) : text) })('@/' + POL)
    const textos = CASOS.flatMap((f) => [...f.cenas.slice(0, 2), ...(f.descricoes_reais ?? []), ...f.falas.slice(0, 2)]).concat([comRosto, semRostoComGente, 'Napoleon at Waterloo, General Grant beside a man and a woman holding a map', "a man's hands writing a letter"])
    let dif = 0, ex = ''
    for (const v of textos) for (const mode of ['documentary_faceless', 'character_story']) {
      const pol = { mode, style: STYLE, aspect: '9:16' }
      const a = velho.buildClassicVisualPrompt(v, pol), b = P.buildClassicVisualPrompt(v, pol)
      if (a !== b) { dif++; ex ||= `${a.slice(0, 120)} ≠ ${b.slice(0, 120)}` }
    }
    no(dif > 0, `B a cena sem rosto mudou em ${dif} de ${textos.length * 2} textos: ${ex}`)
    no(textos.length < 200,`B corpus pequeno (${textos.length})`) }
  // ── C e R · os casos reais e o replay ──
  const R = CASOS.map((f) => ({ f, r: caminho(W, f) })).filter((x) => !x.r.comFicha)
  const sr = R.filter((x) => x.r.sr)
  no(R.length !== 37 || sr.length !== 32, `R0 37 sem ficha (${R.length}), 32 no modo sem rosto (${sr.length})`)
  const por = Object.fromEntries(R.map((x) => [x.f.gen, x]))
  { const x = por['98063aa2']; no(!x || x.r.caminho !== 'hoje' || x.r.motivo !== 'sem_rosto_com_rosto' || JSON.stringify(x.r.out) !== JSON.stringify(x.r.hoje), `C1 98063aa2 ("smiles … at the camera"): o caminho de hoje, motivo sem_rosto_com_rosto (${x?.r.caminho} ${x?.r.motivo})`)
    no(!x || !String(x.r.d?.[0] ?? '').includes('woman seen in silhouette from behind'), `C1b 98063aa2: a 1ª descrição passa pela troca da cena (${x?.r.d?.[0]})`) }
  { const x = por['32c93ee3']; no(!x || x.r.caminho !== 'hoje' || x.r.motivo !== 'sem_rosto_com_rosto', `C2 32c93ee3 ("Gabriel", "gazing"): o caminho de hoje (${x?.r.caminho} ${x?.r.motivo})`)
    no(!x || !String(x.r.d?.[2] ?? '').includes('family seen from behind as distant silhouettes'), `C2b 32c93ee3: "five family members" vira a família de costas, como hoje (${x?.r.d?.[2]})`) }
  const costasHoje = sr.reduce((n, x) => n + x.r.hoje.filter((p) => DE_COSTAS.test(p)).length, 0)
  const costasNovo = sr.reduce((n, x) => n + x.r.out.filter((p) => DE_COSTAS.test(p)).length, 0)
  no(costasHoje !== 9, `R1 a régua: 9 planos de costas hoje nos 32 sem rosto (${costasHoje})`)
  no(costasNovo < costasHoje, `R2 planos de costas não caem no modo sem rosto: hoje ${costasHoje}, novo ${costasNovo}`)
  const novos = sr.filter((x) => x.r.caminho !== 'hoje')
  const comRostoNovo = novos.flatMap((x) => (x.r.d ?? []).filter((d) => ROSTO_FIXO.test(d)).map((d) => `${x.f.gen}: ${d.slice(0, 90)}`))
  no(comRostoNovo.length > 0, `R3 0 descrição com rosto, olhar ou sorriso no caminho novo do filme sem rosto: ${comRostoNovo.join(' · ')}`)
  no(novos.length < 20, `R4 o caminho novo segue para a maioria dos sem rosto (${novos.length} de ${sr.length}; o conserto não vira "tudo no de hoje")`)
  const voltas = sr.filter((x) => x.r.motivo === 'sem_rosto_com_rosto').length
  no(voltas > 6, `R5 no máximo 6 filmes sem rosto voltam por rosto (${voltas})`)
  if (!Object.keys(over).length) STATS = { costasHoje, costasNovo, novos: novos.length, voltas, sr: sr.length }
  // fora do modo sem rosto: as descrições e o envio iguais aos de sem o conserto
  for (const x of R.filter((y) => !y.r.sr && y.r.caminho !== 'hoje')) {
    const nS = W.parse(x.f.roteiro).segments.length, D = x.f.descricoes_reais?.length === nS ? x.f.descricoes_reais : null
    if (D && JSON.stringify(x.r.d) !== JSON.stringify(W.L.descricoesCompletas(W.L.descricoesPorSecao(D, nS), nS))) no(true, `R6 ${x.f.gen} fora do modo sem rosto: a descrição mudou`)
  }
  // ── W · a fiação da rota ──
  no(!rota.includes('const semRosto1911 = (): boolean => classicVisualPolicy.mode === \'documentary_faceless\''), 'W1 o modo sem rosto é o da cena (classicVisualPolicy.mode)')
  no(!rota.includes('const c1 = descricoesSemRosto(descricoesCompletas(d, n), semRosto1911())') || !rota.includes('const c2 = descricoesSemRosto(descricoesCompletas(d, n), semRosto1911())'), 'W2 a troca antes da conta do espaço (nos dois pontos de completarDescricoes1911)')
  no(!rota.includes('if (d && semRosto1911() && d.some(rostoNaDescricao)) voltaAoHoje1911(SEM_ROSTO_MOTIVO)') || !rota.includes('\n          else if (d) parsedScript.segments.forEach((s, j) => { Object.assign(s, { descricao: d[j] }) })'), 'W3 sobrou rosto: o caminho de hoje, antes de a descrição viajar na seção')
  no(!rota.includes('alvo.forEach((j, k) => { const nova = descricaoSemRosto(novas[k], semRosto1911()); if (nova) Object.assign(parsedScript.segments[j], { descricao: nova }) })'), 'W4 a reescrita do A2 passa pela troca e, com rosto, não entra')
  no((rota.match(/Object\.assign\([^)]*\{ descricao: /g) ?? []).length !== 3 || !rota.includes("parsedScript.segments.forEach((x, j) => { const d = secoes[j]?.descricao; if (typeof d === 'string') Object.assign(x, { descricao: d })"), 'W5 só 3 pontos gravam a descrição na seção: os 2 acima e o eco do ensaio, que lê as de completarDescricoes1911 (já trocadas)')
  return e
}

const MUT = [
  ['lib: a troca não roda', LIB, (s) => s.replace('  return ds && semRosto ? ds.map((d) => sujeitoSemRosto(d)) : ds', '  return ds')],
  ['lib: régua sem os olhos', LIB, (s) => s.replace('|facial|eyes?|gaz(?:e|es|ed|ing)|', '|facial|gaz(?:e|es|ed|ing)|')],
  ['lib: régua sem "para a câmera"', LIB, (s) => s.replace('|portraits?|(?:at|to|toward|towards|into) the (?:camera|viewer|lens))', '|portraits?)')],
  ['lib: régua sem o sorriso', LIB, (s) => s.replace('(?:smil(?:e|es|ed|ing)|grin', '(?:grin')],
  ['lib: reescrita com rosto entra', LIB, (s) => s.replace('  return rostoNaDescricao(s) ? null : s\n', '  return s\n')],
  ['lib: reescrita sem a troca', LIB, (s) => s.replace('  const s = sujeitoSemRosto(d)\n  return rostoNaDescricao(s)', '  const s = d\n  return rostoNaDescricao(s)')],
  ['lib: troca também fora do modo sem rosto', LIB, (s) => s.replace('  if (!semRosto) return d\n', '')],
  ['cena: a marca interna fica', POL, (s) => s.replace(".trim().split(ROSTO_PROTEGIDO).join('') // KINEO-TRILHA-15S — a marca das palavras mantidas sai aqui\n}", ".trim() // KINEO-TRILHA-15S — a marca das palavras mantidas sai aqui\n}")],
  ['cena: sem a pessoa de costas', POL, (s) => s.replace('    .replace(GRUPO_DE_PESSOAS_TEXTO_RE, pessoaSemRosto) // KINEO-TRILHA-15S — protagonista sem rosto, substantivo mantido\n    .replace(PERSON_NOUN_RE', '    .replace(PERSON_NOUN_RE')],
  ['rota: modo sem rosto sempre falso', ROTA, (s) => s.replace("const semRosto1911 = (): boolean => classicVisualPolicy.mode === 'documentary_faceless'", 'const semRosto1911 = (): boolean => false')],
  ['rota: troca depois da conta (c1 crua)', ROTA, (s) => s.replace('const c1 = descricoesSemRosto(descricoesCompletas(d, n), semRosto1911())', 'const c1 = descricoesCompletas(d, n)')],
  ['rota: 2º pedido sem a troca', ROTA, (s) => s.replace('const c2 = descricoesSemRosto(descricoesCompletas(d, n), semRosto1911())', 'const c2 = descricoesCompletas(d, n)')],
  ['rota: sem a guarda do rosto', ROTA, (s) => s.replace('          if (d && semRosto1911() && d.some(rostoNaDescricao)) voltaAoHoje1911(SEM_ROSTO_MOTIVO) // KINEO-SEM-ROSTO-2011 — sobrou rosto, olhar ou sorriso na descrição do filme sem rosto: o caminho de hoje\n          else if (d)', '          if (d)')],
  ['rota: reescrita do A2 crua', ROTA, (s) => s.replace('alvo.forEach((j, k) => { const nova = descricaoSemRosto(novas[k], semRosto1911()); if (nova) Object.assign(parsedScript.segments[j], { descricao: nova }) })', 'alvo.forEach((j, k) => { if (novas[k]) Object.assign(parsedScript.segments[j], { descricao: novas[k] }) })')],
]

const p0 = await prova()
if (p0.length) { console.error('FAIL test-sem-rosto-2011:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) {
  const o = ler(arq), m = f(o)
  if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue }
  let e; try { e = await prova({ [arq]: m }) } catch (x) { e = ['lançou: ' + (x?.message ?? x)] }
  if (!e.length) vivos.push(nome)
}
if (vivos.length) { console.error('FAIL test-sem-rosto-2011: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-sem-rosto-2011 (37 sem ficha, ${STATS.sr} sem rosto: de costas ${STATS.costasHoje} → ${STATS.costasNovo}, ${STATS.novos} no caminho novo, ${STATS.voltas} voltam por rosto, 0 rosto no caminho novo; 98063aa2 e 32c93ee3 no de hoje; a cena byte a byte a de antes; ${MUT.length} mutantes mortos)`)
process.exit(0)
