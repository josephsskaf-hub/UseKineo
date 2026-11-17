// KINEO-SUJEITO-DA-FALA-SEGUINTE-1711 + KINEO-SUJEITO-NA-METADE-1711 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião.
// Caso real (revisor 17/11, filme 44d02f20, Kling 4 grátis de 15 s, 1º filme do cliente, nota 5): "In 1950, a plane vanished" e nenhum avião em
// 8 quadros (floresta, papel, torre, ondas). Duas causas no nosso código, provadas nos eventos do filme:
//   (A) cinematic_required_subject (aefd0488): a leitura do sujeito só olhava a 1ª frase da narração ("A 70-year-old mystery...") = kind none;
//       o avião estava na frase SEGUINTE. Agora a mesma leitura calibrada segue pelas próximas frases inteiras (no máximo 2).
//   (B) com o sujeito na cena 1 ("Main subject clearly visible in frame: a plane."), o pedido por seção do Kling 4 refaz as duas metades da
//       cena fundida só com a pista de cada seção e a frase ficava fora das duas. Agora ela vai à metade cuja fala cita o sujeito.
// Executa o código REAL offline (resposta do modelo gravada no fetch), com os textos REAIS do filme e controles que não podem mudar. Mutantes no fim.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { createHash } from 'node:crypto'
import { SUJEITO_FALA_SEGUINTE_1711, semSujeitoFalaSeguinte1711 } from './test-support/desfaz-sujeito-fala-seguinte-1711.mjs'
import { AVIAO_CARRO_0311, semAviaoCarro0311 } from './test-support/desfaz-aviao-carro-0311.mjs'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {}, process: { env: { OPENAI_API_KEY: 'teste' } } }
const SU = 'lib/cinematic/sujeitoTodosMotores.ts'
const QP = 'lib/kling4QuatroPlanos.ts'
const carrega = (arq, mutar = null) => createOfflineLoader({ globals, source: (rel, t) => (mutar && rel === arq ? mutar(t) : t) })
const lf = (t) => String(t).replace(/\r\n/g, '\n')

// ── os textos reais do filme 44d02f20 (claim fefa3a34: prompt, voiceover por cena, scene_plan) ──
const ROTEIRO = 'HOOK: [Pexels: foggy forest path] A 70-year-old mystery... unsolved and chilling.\n\nMICRO REWARD 1: [Pexels: old newspaper headline] In 1950, a plane vanished over the Bermuda Triangle.\n\nMICRO REWARD 2: [Pexels: empty control tower] It left no trace, not a single signal.\n\nPAYOFF: [Pexels: turbulent ocean waves] Most experts believe electromagnetic anomalies disrupted navigation. The mystery endures.'
const SECOES = [...ROTEIRO.matchAll(/^(?:HOOK|MICRO REWARD \d|PAYOFF)[^:\n]*:\s*(?:\[Pexels:\s*([^\]]*)\])?\s*(.+)$/gmu)].map((m) => ({ pexelsQuery: (m[1] || '').trim(), voiceover: m[2].trim() }))
const FALAS = ['A 70-year-old mystery... unsolved and chilling. In 1950, a plane vanished.', 'It left no trace, not a signal.', 'Most experts believe electromagnetic anomalies disrupted navigation. The mystery endures.']
const PLANOS = ['A foggy forest path leading into the Bermuda Triangle, evoking chilling mystery.', 'A cracked and dusty control tower overlooking the Bermuda Triangle, symbolizing silence.', 'Turbulent ocean waves crashing violently against each other, swirling with dark energy, hinting at the unseen forces at play beneath the surface.']
const CAUDA = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, mysterious, cinematic_dark, documentary, consistent color grade across all scenes, 9:16 vertical framing. Period setting: 1950 (1950s). People in the shot wear period-accurate 1950s clothing true to their own place and role, with period props.'
const FRENTE = ['Film visual medium: photorealistic, ultra-detailed. Medium shot, subject centered and clearly readable, slow push-in. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. ', 'Film visual medium: photorealistic, ultra-detailed. Close-up on a telling detail of the action, shallow depth of field, gentle rack focus. ', 'Film visual medium: photorealistic, ultra-detailed. Clear well-lit shot of the final moment with the subject fully recognizable, slow pull-back. ']
const CLAUSULA = 'Main subject clearly visible in frame: a plane.'
// o que foi de fato à fal (scene_fal_inputs do claim), sem o rótulo "Scene N: …" e sem a camada de superfície/escala, que entram depois
const METADE_1 = 'Photoreal film. Period setting: 1950 (1950s). Main subject of this shot: foggy forest path, shown in motion. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'
const METADE_2 = 'Photoreal film. Period setting: 1950 (1950s). Main subject of this shot: old newspaper headline, shown in motion. no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'

const resposta = (o) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(o) } }] }) })
const AVIAO = { reasoning: 'The sentence is about a plane that vanished.', subject: 'a plane', head_noun: 'plane', subject_visual_no_people: 'a plane', kind: 'vehicle', real_person: false, has_human: false, mention_words: ['plane'], word_use: 'literal', request_language: 'en' }
const NADA = { reasoning: 'An abstract concept; no concrete subject to visualize.', subject: null, head_noun: null, subject_visual_no_people: null, kind: 'none', real_person: false, has_human: false, mention_words: [], word_use: 'none', request_language: 'en' }
/** o modelo gravado: avião só quando a frase lida fala em avião; o resto, nada (como no evento aefd0488). Guarda o que foi lido. */
const modelo = (lidos) => async (_url, init) => { const msgs = JSON.parse(String(init?.body ?? '{}')).messages ?? []; const lido = String(msgs[msgs.length - 1]?.content ?? '').replace(/^Video request:\n/, ''); lidos.push(lido); return resposta(/\bplane\b/i.test(lido) ? AVIAO : NADA) }

async function provasLeitura(S) {
  const e = []
  const seg = S.frasesSeguintesDaFala(FALAS, S.primeiraFraseDaFala(FALAS[0]))
  if (S.primeiraFraseDaFala(FALAS[0]) !== 'A 70-year-old mystery...') e.push('a 1ª frase mudou: ' + S.primeiraFraseDaFala(FALAS[0]))
  if (JSON.stringify(seg) !== JSON.stringify(['In 1950, a plane vanished.', 'It left no trace, not a signal.'])) e.push('frases seguintes: ' + JSON.stringify(seg))
  // o caso real: sem pedido confiável (motivo ideia_original_discorda_da_fala no claim) → só a narração fala
  const lidos = []
  const r = await S.sujeitoEmTodosOsMotores({ pedido: null, falas: FALAS, planos: PLANOS, pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: modelo(lidos) })
  if (!r || !r.relato.corrigido || r.relato.sujeito !== 'a plane') e.push('caso real: o avião não virou sujeito: ' + JSON.stringify(r?.relato?.motivo_sem_sujeito))
  else {
    if (r.relato.cena !== 1 || r.planos[0] !== `${CLAUSULA} ${PLANOS[0]}`) e.push('caso real: o avião não entrou na frente da cena cuja fala o cita: cena ' + r.relato.cena + ' · ' + r.planos[0].slice(0, 80))
    if (r.planos[1] !== PLANOS[1] || r.planos[2] !== PLANOS[2]) e.push('caso real: outra cena mudou')
    if (r.relato.motivo_do_pedido !== 'fala_seguinte') e.push('caso real: o relato não diz que veio da frase seguinte')
  }
  if (JSON.stringify(lidos) !== JSON.stringify(['A 70-year-old mystery...', 'In 1950, a plane vanished.'])) e.push('caso real: leituras ' + JSON.stringify(lidos))
  // a mesma narração em 4 cenas (estrada hollywood: o HOOK sozinho na cena 1) → o avião entra na cena 2, a que o cita
  const quatro = ['A 70-year-old mystery... unsolved and chilling.', 'In 1950, a plane vanished over the Bermuda Triangle.', 'It left no trace, not a single signal.', 'The mystery endures.']
  const h = await S.sujeitoEmTodosOsMotores({ pedido: { pedido: 'an unsolved mystery', fonte: 'ideia_solta', motivo: 'ideia_solta' }, falas: quatro, planos: ['p1', 'p2', 'p3', 'p4'], pessoaPermitida: true, estrada: 'hollywood' }, { fetchImpl: modelo([]) })
  if (!h || h.relato.cena !== 2 || h.planos[1] !== `${CLAUSULA} p2` || h.planos[0] !== 'p1') e.push('4 cenas: o avião não entrou na cena 2')
  // ── controles: nada muda ──
  // (1) mahrafariha 03/11: o avião na 1ª frase — as mesmas 2 leituras de antes, motivo fala_de_abertura
  const l1 = []
  const m1 = await S.sujeitoEmTodosOsMotores({ pedido: { pedido: 'an unsolved mystery', fonte: 'ideia_solta', motivo: 'ok' }, falas: ['A plane vanished—unsolved for 70 years! In 1950, Northwest Flight 2501 vanished over Lake Michigan.', 'Despite searches, no wreckage was ever found.'], planos: ['A foggy forest', 'Search boats'], pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: modelo(l1), tentativasExtras: 0 })
  if (!m1 || m1.relato.motivo_do_pedido !== 'fala_de_abertura' || l1.length !== 2 || m1.relato.cena !== 1) e.push('controle 1ª frase mudou: ' + JSON.stringify(l1))
  // (2) pedido que já diz o sujeito: 1 leitura, a narração nem é lida
  const l2 = []
  const m2 = await S.sujeitoEmTodosOsMotores({ pedido: { pedido: 'a plane that vanished in 1950', fonte: 'ideia_solta', motivo: 'ideia_solta' }, falas: FALAS, planos: PLANOS, pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: modelo(l2) })
  if (!m2 || l2.length !== 1 || m2.relato.motivo_do_pedido !== 'ideia_solta' || !m2.relato.corrigido) e.push('controle pedido com sujeito mudou: ' + JSON.stringify(l2))
  // (3) narração sem sujeito nenhum: planos intactos e no máximo 1ª frase + 2 seguintes
  const l3 = []
  const semSujeito = ['Money is a lie they sold you for decades. Nobody tells you why. It was never about saving. It is about time. And time runs out.', 'Start now.']
  const m3 = await S.sujeitoEmTodosOsMotores({ pedido: null, falas: semSujeito, planos: ['A man counting bills', 'A clock'], pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: modelo(l3) })
  if (!m3 || m3.relato.corrigido || m3.planos[0] !== 'A man counting bills' || m3.planos[1] !== 'A clock') e.push('controle sem sujeito mexeu nos planos')
  if (JSON.stringify(l3) !== JSON.stringify(['Money is a lie they sold you for decades.', 'Nobody tells you why.', 'It was never about saving.'])) e.push('controle sem sujeito: leituras ' + JSON.stringify(l3))
  if (m3 && m3.relato.motivo_do_pedido !== 'fala_de_abertura') e.push('controle sem sujeito: o relato de sempre (1ª frase) mudou')
  // (4) narração de uma frase só: 1 leitura
  const l4 = []
  await S.sujeitoEmTodosOsMotores({ pedido: null, falas: ['Money is a lie they sold you for decades.'], planos: ['A man counting bills'], pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: modelo(l4) })
  if (l4.length !== 1) e.push('controle uma frase: leituras ' + l4.length)
  // (5) a leitura cai (rede): planos intactos, nunca lança
  const m5 = await S.sujeitoEmTodosOsMotores({ pedido: null, falas: FALAS, planos: PLANOS, pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: async () => { throw new Error('rede') }, tentativasExtras: 0 })
  if (m5 && m5.planos.some((p, i) => p !== PLANOS[i])) e.push('controle leitura caiu mexeu nos planos')
  // (6) pedaço em minúscula e frase curta não são frase; aspas e rótulo saem; teto de 2
  const f6 = S.frasesSeguintesDaFala(['[Pexels: x] “One two three four. and then more words here. No. Third real sentence here. Fourth real sentence here. Fifth one here.”'], 'One two three four.')
  if (JSON.stringify(f6) !== JSON.stringify(['Third real sentence here.', 'Fourth real sentence here.'])) e.push('frases seguintes (filtro): ' + JSON.stringify(f6))
  // ── volta 2 (revisão independente 17/11) ──
  // (b) a 1ª leitura que falha encerra o laço: a frase 2 cai (rede) e a frase 3, que traria o avião, nem é lida; planos intactos
  const lb = []
  const falasB = ['A mystery nobody could explain for decades. Nobody knows what happened that night. In 1950, a plane vanished.', 'The end.']
  const mb = await S.sujeitoEmTodosOsMotores({ pedido: null, falas: falasB, planos: ['p1', 'p2'], pessoaPermitida: true, estrada: 'classica' }, { fetchImpl: async (u, init) => { const r = await modelo(lb)(u, init); if (lb.length === 2) throw new Error('rede'); return r }, tentativasExtras: 0 })
  if (lb.length !== 2) e.push('(b) depois da leitura que falhou ainda leu: ' + JSON.stringify(lb))
  if (!mb || mb.relato.sujeito || mb.planos[0] !== 'p1' || mb.planos[1] !== 'p2') e.push('(b) leitura falhou e ainda assim houve sujeito ou plano mexido')
  // (c) abreviação e inicial não partem a frase
  const fc = S.frasesSeguintesDaFala(['A strange night in the old harbor town. Dr. Arthur Vance met Mr. F. Scott at the St. James dock. Then Mrs. Hale and Ms. Reed left with Tom Jr. that night. More here.'], 'A strange night in the old harbor town.')
  if (JSON.stringify(fc) !== JSON.stringify(['Dr. Arthur Vance met Mr. F. Scott at the St. James dock.', 'Then Mrs. Hale and Ms. Reed left with Tom Jr. that night.'])) e.push('(c) abreviação partiu a frase: ' + JSON.stringify(fc))
  // (c) o rabo de uma 1ª frase longa (lida só até 140) não vira frase
  const cabeca = 'On the cold morning of the second of July the famous pilot climbed into her silver twin-engine plane while ten young mechanics in grey suit' // 139 caracteres: a leitura corta aqui
  const longa = `${cabeca} Navy officers watched her go. Her radio went silent near the island. Nobody found her.`
  const primeiraLonga = S.primeiraFraseDaFala(longa)
  const fl = S.frasesSeguintesDaFala([longa], primeiraLonga)
  if (primeiraLonga !== cabeca || JSON.stringify(fl) !== JSON.stringify(['Her radio went silent near the island.', 'Nobody found her.'])) e.push('(c) rabo da 1ª frase longa virou frase: ' + JSON.stringify(fl))
  return e
}

// (a) o sujeito lido de uma frase SEGUINTE não alimenta a camada da ficha (sujeitoDoPedido1311 → refazerPlanoDaFicha). Baleias de Galápagos (58f63487): "satellite tags".
function provasFicha(L) {
  const e = []
  const S = L(SU), F = L('lib/cinematic/fichaAntesDoRender1311.ts')
  const ORDEM = 'The only person in this shot is the same main character (a marine biologist in a blue jacket); any other person described below is replaced by this same character. '
  const prompts = [`Film visual medium: photorealistic. ${ORDEM}A blue whale surfaces in open water off the Galápagos Islands.`, 'Film visual medium: photorealistic. A research boat on a calm sea.']
  const veredito = { status: 'JUDGED', reprovado: true, falhas: ['a_ficha'], nota: 60, cenas: 2, ms: 10, planos: [{ plano: 1, a: 'contradiz', b: 'nao', c: 'nao' }, { plano: 2, a: 'sem_ficha', b: 'nao', c: 'nao' }], defeitos: ['plano 1 · ficha contradiz a fala: "a marine biologist" × "Where did the Galápagos blue whales go?"'] }
  const refaz = (sujeitoDoPedido) => F.refazerPlanoDaFicha({ prompts, veredito, pessoaDaIdeia: null, sujeitoDoPedido })
  const semNada = refaz(null)
  if (semNada.relato.refeitos[0]?.acao !== 'sem_ordem') { e.push('(a) fixture: o plano 1 não perdeu a ordem: ' + JSON.stringify(semNada.relato.refeitos)); return e }
  const daSeguinte = S.sujeitoQueAlimentaAFicha({ sujeito: 'satellite tags', tipo: 'objeto', motivo_do_pedido: 'fala_seguinte' })
  if (daSeguinte !== null) e.push('(a) o sujeito da frase seguinte alimenta a ficha: ' + JSON.stringify(daSeguinte))
  const comSeguinte = refaz(daSeguinte)
  if (JSON.stringify(comSeguinte.prompts) !== JSON.stringify(semNada.prompts) || comSeguinte.prompts.join(' ').includes('satellite tags')) e.push('(a) baleias: o plano sem ordem mudou com "satellite tags": ' + comSeguinte.prompts[0].slice(0, 120))
  // controle: pedido e 1ª frase alimentam como sempre
  for (const motivo of ['ideia_solta', 'ideia_original', 'fala_de_abertura']) {
    const s = S.sujeitoQueAlimentaAFicha({ sujeito: 'a blue whale', tipo: 'criatura', motivo_do_pedido: motivo })
    if (!s || s.sujeito !== 'a blue whale' || s.tipo !== 'criatura' || !refaz(s).prompts[0].includes('Main subject clearly visible in frame: a blue whale.')) e.push('(a) controle: ' + motivo + ' deixou de alimentar a ficha')
  }
  if (S.sujeitoQueAlimentaAFicha({ sujeito: null, tipo: null, motivo_do_pedido: 'ideia_solta' }) !== null) e.push('(a) sem sujeito devia ser null')
  return e
}

function provasMetade(L) {
  const e = []
  const K = L('lib/cinematic/cenaKling4.ts'), Q = L(QP), ST = L('lib/cinematic/sceneStyle.ts')
  const anchor = ST.deriveStyleAnchor(ROTEIRO)
  const k4 = (comSujeito) => PLANOS.map((p, i) => K.promptDaCenaKling4(`${FRENTE[i]}${i === 0 && comSujeito ? `${CLAUSULA} ` : ''}${p}${CAUDA}`, anchor, i, true))
  const stills = ['s1', 's2', 's3']
  // controle: sem a frase do sujeito na cena, o pedido é byte a byte o que foi à fal em 16/11
  const antes = Q.planosPorSecao({ prompts: k4(false), stills, falas: FALAS, secoes: SECOES, objetoConcreto: true })
  if (!antes || JSON.stringify(antes.grupos) !== '[[0,1],[2],[3]]') { e.push('fixture: o filme não virou 4 planos'); return e }
  if (antes.prompts[0] !== METADE_1 || antes.prompts[1] !== METADE_2) e.push('controle sem sujeito: as metades mudaram: ' + antes.prompts[1])
  // o caso: a cena 1 traz o avião (sobrevive ao corte do Kling 4) e a metade cuja fala o cita passa a pedi-lo
  const cenas = k4(true)
  if (!cenas[0].includes(CLAUSULA)) { e.push('fixture: a frase do sujeito não sobreviveu ao corte da cena'); return e }
  const q = Q.planosPorSecao({ prompts: cenas, stills, falas: FALAS, secoes: SECOES, objetoConcreto: true })
  if (!q) { e.push('com sujeito: sem plano por seção'); return e }
  if (q.prompts[1] !== METADE_2.replace('Photoreal film. ', `Photoreal film. ${CLAUSULA} `)) e.push('a metade que fala do avião não o pede logo depois do meio: ' + q.prompts[1])
  if (q.prompts[0] !== METADE_1) e.push('a outra metade mudou: ' + q.prompts[0])
  if (q.prompts[2] !== antes.prompts[2] || q.prompts[3] !== antes.prompts[3]) e.push('plano de cena não fundida mudou')
  if (JSON.stringify(q.stills) !== JSON.stringify(antes.stills) || JSON.stringify(q.falas) !== JSON.stringify(antes.falas)) e.push('imagens-chave ou falas mudaram')
  if (Array.from(q.prompts[1]).length > 464) e.push('a metade passou do orçamento')
  // nenhuma metade cita → a última (sem imagem-chave); idempotente; nome com ponto fica inteiro
  const g = [[0, 1], [2]]
  const semCita = Q.comSujeitoDaCenaNaMetade(['Photoreal film. A.', 'Photoreal film. B.', 'C'], ['Photoreal film. Main subject clearly visible in frame: a U.S. Navy airplane. Fog.', 'C'], ['Nothing here.', 'Still nothing.', 'x'], g)
  if (semCita[0] !== 'Photoreal film. A.' || semCita[1] !== 'Photoreal film. Main subject clearly visible in frame: a U.S. Navy airplane. B.' || semCita[2] !== 'C') e.push('sem citação: ' + JSON.stringify(semCita))
  if (JSON.stringify(Q.comSujeitoDaCenaNaMetade(semCita, ['Photoreal film. Main subject clearly visible in frame: a U.S. Navy airplane. Fog.', 'C'], ['Nothing here.', 'Still nothing.', 'x'], g)) !== JSON.stringify(semCita)) e.push('não é idempotente')
  // cena de uma seção só com a frase: intocada
  const uma = Q.comSujeitoDaCenaNaMetade(['Photoreal film. A.', 'B'], ['Photoreal film. Main subject clearly visible in frame: a plane. A.', 'B'], ['a plane', 'x'], [[0], [1]])
  if (uma[0] !== 'Photoreal film. A.' || uma[1] !== 'B') e.push('cena não fundida foi mexida')
  // (d) volta 2 — a metade é escolhida pelo substantivo núcleo, nunca por adjetivo
  const NAVIO = ['Photoreal film. Main subject clearly visible in frame: an old wooden ship. Fog.']
  const d2 = Q.comSujeitoDaCenaNaMetade(['Photoreal film. A.', 'Photoreal film. B.'], NAVIO, ['An old man told this story.', 'The ship sank in one night.'], [[0, 1]])
  if (d2[0] !== 'Photoreal film. A.' || d2[1] !== 'Photoreal film. Main subject clearly visible in frame: an old wooden ship. B.') e.push('(d) navio: não foi à 2ª metade: ' + JSON.stringify(d2))
  const d3 = Q.comSujeitoDaCenaNaMetade(['Photoreal film. A.', 'Photoreal film. B.', 'Photoreal film. C.'], NAVIO, ['An old man told this story.', 'The ships sank in one night.', 'Nobody came back.'], [[0, 1, 2]])
  if (d3[0] !== 'Photoreal film. A.' || !d3[1].includes('an old wooden ship') || d3[2] !== 'Photoreal film. C.') e.push('(d) navio em 3 metades: o adjetivo decidiu: ' + JSON.stringify(d3))
  const nucleos = [['an old wooden ship', 'ship'], ['a plane', 'plane'], ['a ninja cat running on rooftops (ginger)', 'cat'], ['a child with a 3D pen', 'child'], ['a C-54 Skymaster airplane', 'airplane'], ['a U.S. Navy airplane', 'airplane']]
  for (const [frase, n] of nucleos) if (Q.nucleoDoSujeito(frase) !== n) e.push(`(d) núcleo de "${frase}": ${Q.nucleoDoSujeito(frase)}`)
  return e
}

const e1 = await provasLeitura(carrega(SU)(SU))
checa(`A a leitura segue pelas frases seguintes da narração; controles iguais${e1.length ? ': ' + e1.join(' · ') : ''}`, e1.length === 0)
const e2 = provasMetade(carrega(QP))
checa(`B a frase do sujeito sobrevive à cena fundida do Kling 4; controles iguais${e2.length ? ': ' + e2.join(' · ') : ''}`, e2.length === 0)
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
checa('C a rota continua chamando o passo nas duas estradas e o plano por seção no envio do Kling 4', (rota.match(/await sujeitoEmTodosOsMotores\(/g) ?? []).length === 2 && rota.includes('planosPorSecao({ prompts: a.prompts, stills: a.approvedStills, falas: a.timing.voiceovers, secoes: parsedScript.segments'))
const srcS = lf(fs.readFileSync(SU, 'utf8')), srcQ = lf(fs.readFileSync(QP, 'utf8'))
// R — recibo exato [TRAVA 8.2]: desfazer esta entrega devolve a base do recibo; edição desconhecida não é desfeita; a cadeia antiga (avião não vira carro, 03/11) volta a casar
const sha = (t) => createHash('sha256').update(lf(t)).digest('hex')
const R = SUJEITO_FALA_SEGUINTE_1711.scope
const ROTA = 'app/api/generate-video-cinematic/route.ts'
checa('R o recibo cobre os 3 arquivos e desfaz exato', Object.keys(R).sort().join() === [SU, QP, ROTA].sort().join() && sha(semSujeitoFalaSeguinte1711(srcS, SU)) === R[SU].beforeSha256 && sha(semSujeitoFalaSeguinte1711(srcQ, QP)) === R[QP].beforeSha256 && sha(semSujeitoFalaSeguinte1711(rota, ROTA)) === R[ROTA].beforeSha256)
// (a) volta 2 — a ficha não recebe o sujeito da frase seguinte: a função e a fiação na rota (depois de guardar o sujeito, antes de refazer o plano)
const e3 = provasFicha(carrega(SU))
checa(`(a) o sujeito da frase seguinte não alimenta a ficha; baleias iguais; pedido e 1ª frase como sempre${e3.length ? ': ' + e3.join(' · ') : ''}`, e3.length === 0)
const iGuarda = rota.indexOf('if (sujeitoClassico.relato.sujeito) sujeitoDoPedido1311 = { sujeito: sujeitoClassico.relato.sujeito, tipo: sujeitoClassico.relato.tipo ?? null }'), iFiltro = rota.indexOf('sujeitoDoPedido1311 = sujeitoDoPedido1311 && sujeitoQueAlimentaAFicha(sujeitoClassico.relato)'), iRefaz = rota.indexOf('sujeitoDoPedido: sujeitoDoPedido1311 })')
checa('(a) a rota filtra o sujeito antes de refazerPlanoDaFicha', iGuarda > 0 && iFiltro > iGuarda && iRefaz > iFiltro && (rota.match(/sujeitoDoPedido1311 = /g) ?? []).length === 2)
checa('R edição desconhecida não é desfeita', semSujeitoFalaSeguinte1711(`${srcS}// edição desconhecida`, SU) === `${srcS}// edição desconhecida`)
checa('R a camada de 03/11 sai depois desta (cadeia inteira)', R[SU].beforeSha256 === AVIAO_CARRO_0311.scope[SU].afterSha256 && sha(semAviaoCarro0311(srcS, SU)) === AVIAO_CARRO_0311.scope[SU].beforeSha256)
const MUT_S = [
  ['não lê a frase seguinte', (t) => lf(t).replace('for (const seguinte of frasesSeguintesDaFala(args.falas, frase)) {', 'for (const seguinte of [] as string[]) {')],
  ['sem teto de leituras', (t) => lf(t).replace('.slice(0, FRASES_SEGUINTES_MAX)', '')],
  ['pedaço em minúscula vira frase', (t) => lf(t).replace(' && !/^\\p{Ll}/u.test(f)', '')],
  ['(b) segue lendo depois da falha', (t) => lf(t).replace('if (!leitura.ok) break', '')],
  ['(c) abreviação fecha frase', (t) => lf(t).replace('if (out.length && ABREVIACAO_NO_FIM.test(out[out.length - 1]))', 'if (false)')],
  ['(c) rabo da 1ª frase vira frase', (t) => lf(t).replace('frasesInteiras(t).slice(1)', 'frasesInteiras(primeira && t.startsWith(primeira) ? t.slice(primeira.length) : t)')],
]
{
  const fn = (t) => lf(t).replace(' || relato.motivo_do_pedido === MOTIVO_FALA_SEGUINTE', '')
  const mudou = fn(srcS) !== srcS
  let e = []
  if (mudou) { try { e = provasFicha(carrega(SU, fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "(a) frase seguinte alimenta a ficha" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
for (const [nome, fn] of MUT_S) {
  const mudou = fn(srcS) !== srcS
  let e = []
  if (mudou) { try { e = await provasLeitura(carrega(SU, fn)(SU)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
const MUT_Q = [
  ['a metade não recebe o sujeito', (t) => lf(t).replace('prompts: comSujeitoDaCenaNaMetade(prompts, a.prompts, falas, grupos), stills', 'prompts, stills')],
  ['sempre a 1ª metade', (t) => lf(t).replace('const alvo = ini + (cita >= 0 ? cita : g.length - 1)', 'const alvo = ini')],
  ['mexe em cena não fundida', (t) => lf(t).replace('const m = g.length > 1 ? SUJEITO_DA_CENA_RE', 'const m = g.length > 0 ? SUJEITO_DA_CENA_RE')],
  ['(d) adjetivo decide a metade', (t) => lf(t).replace("return ws[ws.length - 1] ?? ''", "return ws[1] ?? ''")],
]
for (const [nome, fn] of MUT_Q) {
  const mudou = fn(srcQ) !== srcQ
  let e = []
  if (mudou) { try { e = provasMetade(carrega(QP, fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
