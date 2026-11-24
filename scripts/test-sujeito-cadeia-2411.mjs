// KINEO-SUJEITO-CADEIA-2411 — guardião que EXECUTA a cadeia real (lib/cinematic/sujeitoTodosMotores.ts → sujeitoObrigatorio.ts) com a medida
// nova (lib/cinematic/sujeitoCadeia2411.ts) e compara com a MESMA cadeia da base (origin/main c854849c8, sem a medida): planos, relato e as
// leituras pedidas ao modelo têm de ser idênticos; só o bloco cadeia_2411 é novo. Nada sai da máquina (o modelo é um fetch falso).
// Casos: os relatos reais de produção dos 7 filmes do replay 7af247b9d (scripts/test-support/sujeito-cadeia-2411-leituras.json; as falas vêm do
// replay por git show, sem copiar roteiro de cliente), os dois aviões, e Death Valley / Pompeia / Noé como visual_com_maiuscula.
// Uso: node scripts/test-sujeito-cadeia-2411.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const BASE = 'c854849c8'
const CADEIA = 'lib/cinematic/sujeitoTodosMotores.ts'
const MEDIDA = 'lib/cinematic/sujeitoCadeia2411.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const git = (ref) => execFileSync('git', ['show', ref], { encoding: 'utf8', maxBuffer: 8_000_000 })
const casosReplay = JSON.parse(git('7af247b9d:docs/filme-nota-9/entradas-replay-2311.json').replace(/^﻿/, ''))
const producao = JSON.parse(readFileSync('scripts/test-support/sujeito-cadeia-2411-leituras.json', 'utf8')).filmes
const baseCadeia = git(BASE + ':' + CADEIA)
const globals = { AbortController, AbortSignal, setTimeout, clearTimeout }

function congela(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) congela(v) } return o }
const zeraMs = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'ms' ? 0 : v)))

// ── o modelo falso: resposta por texto exato; o resto = "nada" ───────────────────────────────────────────────────────────────────────
const NADA = { reasoning: 'simulada', subject: null, head_noun: null, subject_visual_no_people: null, kind: 'none', real_person: false, has_human: false, mention_words: [], word_use: 'none', request_language: 'en' }
const lit = (subject, visual, head, kind, mention, extra = {}) => ({ reasoning: 'simulada', subject, head_noun: head, subject_visual_no_people: visual, kind, real_person: false, has_human: false, mention_words: [mention], word_use: 'literal', request_language: 'en', ...extra })
const resposta = (o) => (o === 429 ? { ok: false, status: 429, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(o) } }] }) })
const modelo = (tabela, lidos) => async (_url, init) => {
  const msgs = JSON.parse(String(init?.body ?? '{}')).messages ?? []
  const lido = String(msgs[msgs.length - 1]?.content ?? '').replace(/^Video request:\n/, '')
  lidos.push(lido)
  return resposta(Object.hasOwn(tabela, lido) ? tabela[lido] : NADA)
}
// o relato de produção como resposta crua do modelo (o sujeito descartado volta ao campo subject; a validação refaz o descarte)
const cru = (l) => ({ reasoning: 'producao', subject: l.subject ?? l.subject_visual_no_people, head_noun: l.head_noun, subject_visual_no_people: l.subject_visual_no_people, kind: l.kind, real_person: l.real_person, has_human: l.has_human, mention_words: l.mention_words, word_use: l.word_use, request_language: l.request_language })

function carregar(trocas = {}) {
  const load = createOfflineLoader({ globals, source: (file, src) => {
    const f = file.replaceAll('\\', '/')
    let t = (f === CADEIA && trocas.base ? baseCadeia : src).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10)) // CRLF ou LF no checkout: o mutante casa igual
    for (const [de, para] of trocas[f] ?? []) { assert.ok(t.includes(de), 'troca não aplicável em ' + f + ': ' + de.slice(0, 70)); t = t.split(de).join(para) }
    return t
  } })
  return { todos: load('@/' + CADEIA), medida: trocas.base ? null : load('@/' + MEDIDA), S: load('@/lib/cinematic/sujeitoObrigatorio') }
}

// ── os casos ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function casos(S) {
  const out = []
  for (const c of casosReplay) {
    const p = producao[c.id]
    const falas = c.scenes.map((s) => s.voice), planos = c.scenes.map((s) => s.action ?? s.hint)
    const tabela = {}
    let pedido = null, pronta = null
    if (p.motivo_do_pedido === 'ideia_original') {
      pedido = { pedido: 'IDEIA_ORIGINAL_NAO_GUARDADA', fonte: 'ideia_original', motivo: 'ideia_original' }
      pronta = { texto: 'IDEIA_ORIGINAL_NAO_GUARDADA', resultado: { ok: true, valor: { ...p.leitura, reasoning: '', appearance: null }, ms: 0, model: p.leitura.model, tentativas: 1 } }
    } else tabela[S.__primeira(falas[0])] = cru(p.leitura)
    out.push({ id: c.id, falas, planos, pedido, pronta, tabela, producao: p })
  }
  // os aviões: a frase seguinte que diz o avião, com o visual "com nome de lugar" (a hipótese do descarte) — resposta SIMULADA
  for (const id of ['3edd291a', '87a09b8c']) {
    const k = out.find((x) => x.id === id)
    for (const f of S.__seguintes(k.falas, S.__primeira(k.falas[0]))) if (/\bplane\b/.test(f)) k.tabela[f] = lit('a plane over the Bermuda Triangle', 'a plane over the Bermuda Triangle', 'plane', 'vehicle', 'plane')
  }
  const um = (id, fala, raw) => ({ id, falas: [fala, 'The end of the story.'], planos: ['A wide shot.', 'A close shot.'], pedido: null, pronta: null, tabela: { [fala]: raw }, producao: null })
  out.push(um('death-valley', 'Rocks move on their own in Death Valley.', lit('rocks moving in Death Valley', 'rocks moving in Death Valley', 'rocks', 'object', 'rocks')))
  out.push(um('pompeia', 'The ancient arena in Pompeii was filled with spectators.', lit('the ancient arena in Pompeii', 'the ancient arena in Pompeii filled with spectators', 'arena', 'object', 'arena')))
  out.push(um('noe', 'Noah gathered two of every animal species on the Ark.', lit("two of every animal species on Noah's Ark", "two of every animal species on Noah's Ark", 'animals', 'creature', 'animal')))
  out.push(um('nucleo-proprio', 'The Titanic sank in 1912.', lit('the Titanic', 'a large ocean liner', 'Titanic', 'vehicle', 'Titanic')))
  // controles: a frase seguinte acerta (degrau 3); o pedido não responde (429)
  out.push({ id: 'aviao-aceito', falas: ['Seventy years... no clues, no answers.', 'In 1950, a plane vanished.', 'Nobody knows.'], planos: ['A forest.', 'An ocean.', 'A tower.'], pedido: null, pronta: null,
    tabela: { 'In 1950, a plane vanished.': lit('a plane', 'a plane', 'plane', 'vehicle', 'plane') }, producao: null })
  out.push({ id: 'pedido-429', falas: ['A cat sleeps on the sofa.'], planos: ['A sofa.'], pedido: { pedido: 'a sleeping cat', fonte: 'ideia_solta', motivo: 'ideia_solta' }, pronta: null,
    tabela: { 'a sleeping cat': 429, 'A cat sleeps on the sofa.': lit('a sleeping cat', 'a sleeping cat', 'cat', 'creature', 'cat') }, producao: null })
  return out
}

async function rodar(mods, k) {
  const lidos = []
  const args = congela({ pedido: k.pedido, falas: [...k.falas], planos: [...k.planos], pessoaPermitida: true, estrada: 'classica' })
  const opts = { apiKey: 'offline', tentativasExtras: 0, fetchImpl: modelo(k.tabela, lidos), ...(k.pronta ? { leituraPronta: congela(structuredClone(k.pronta)) } : {}) }
  const r = await mods.todos.sujeitoEmTodosOsMotores(args, opts)
  return { r, lidos }
}

const CHAVES_DEGRAU = ['degrau', 'tentou', 'respondeu', 'uso', 'tipo', 'aceito', 'motivo_do_descarte', 'palavras_do_visual', 'tinha_maiuscula', 'tinha_nome_proprio_de_lugar', 'substantivo_central']
const CODIGO = /^[a-z0-9_:]+$/
function semTexto(c, k) { // só códigos, números, booleanos e UMA palavra comum
  const erros = []
  if (JSON.stringify(Object.keys(c).sort()) !== JSON.stringify(['degrau_que_valeu', 'degraus', 'erro', 'versao'])) erros.push('chaves do bloco')
  for (const d of c.degraus ?? []) {
    if (JSON.stringify(Object.keys(d)) !== JSON.stringify(CHAVES_DEGRAU)) erros.push('chaves do degrau: ' + Object.keys(d).join(','))
    for (const [kk, v] of Object.entries(d)) if (typeof v === 'string' && !CODIGO.test(v)) erros.push(`texto livre em ${kk}`)
    if (d.substantivo_central !== null && !/^\p{Ll}{3,}(?:-\p{Ll}+)?$/u.test(d.substantivo_central)) erros.push('substantivo não é palavra comum')
  }
  const tudo = JSON.stringify(c)
  for (const t of [...k.falas, ...k.planos, k.pedido?.pedido ?? '', ...Object.keys(k.tabela)]) if (t && t.length > 12 && tudo.includes(t.slice(0, 12))) erros.push('frase vazou')
  return erros
}

async function provas(trocas) {
  const falhas = []
  const f = (cond, msg) => { if (!cond) falhas.push(msg) }
  const novo = carregar(trocas), base = carregar({ base: true })
  const S = novo.S
  S.__primeira = novo.todos.primeiraFraseDaFala
  S.__seguintes = novo.todos.frasesSeguintesDaFala
  const lista = casos(S)
  const por = {}
  for (const k of lista) {
    const a = await rodar(novo, k), b = await rodar(base, k)
    f(JSON.stringify(zeraMs({ planos: a.r?.planos, relato: a.r?.relato })) === JSON.stringify(zeraMs({ planos: b.r?.planos, relato: b.r?.relato })), `${k.id}: planos/relato diferentes da base`)
    f(JSON.stringify(a.lidos) === JSON.stringify(b.lidos), `${k.id}: leituras diferentes da base (${a.lidos.length} × ${b.lidos.length})`)
    f(!!a.r && !!a.r.cadeia_2411 && a.r.cadeia_2411.erro === false, `${k.id}: sem bloco ou com erro`)
    if (a.r?.cadeia_2411) for (const e of semTexto(a.r.cadeia_2411, k)) f(false, `${k.id}: ${e}`)
    if (a.r?.cadeia_2411) f(a.r.cadeia_2411.degraus.filter((d) => d.tentou && d.degrau !== 'pedido').length === a.lidos.length - (k.pedido && !k.pronta ? 1 : 0), `${k.id}: degraus tentados não batem com as leituras feitas`)
    por[k.id] = { ...a, k }
  }
  const D = (id, n) => por[id].r?.cadeia_2411?.degraus?.[n] ?? {}
  // produção reproduzida: o relato da cadeia diz o mesmo motivo que o evento real
  for (const c of casosReplay) { const p = producao[c.id], r = por[c.id].r?.relato; f(r && (r.motivo_sem_sujeito ?? null) === (p.motivo_sem_sujeito ?? null) && (r.sujeito ?? null) === (p.sujeito ?? null), `${c.id}: não reproduz o relato de produção (${r?.motivo_sem_sujeito})`) }
  // aviões: pedido abstrato, 1ª frase sem nada, frase seguinte DESCARTADA por visual_com_maiuscula ("plane"), nada vale
  for (const id of ['3edd291a', '87a09b8c']) {
    f(D(id, 0).tentou && D(id, 0).respondeu && D(id, 0).uso === 'none' && D(id, 0).motivo_do_descarte === 'uso_none', `${id}: degrau do pedido`)
    f(D(id, 1).tentou && D(id, 1).motivo_do_descarte === 'uso_none', `${id}: 1ª frase`)
    f(D(id, 2).tentou && D(id, 2).respondeu && !D(id, 2).aceito && D(id, 2).motivo_do_descarte === 'visual_com_maiuscula' && D(id, 2).substantivo_central === 'plane' && D(id, 2).tinha_maiuscula === true && D(id, 2).palavras_do_visual === 6, `${id}: frase seguinte não ficou como descarte por maiúscula: ${JSON.stringify(D(id, 2))}`)
    f(por[id].r.cadeia_2411.degrau_que_valeu === null, `${id}: degrau_que_valeu`)
  }
  // Rex, adulto: nada em todos os degraus; palácio e Shiro: a 1ª frase valeu; Noé (replay): descarte por maiúscula na 1ª frase
  for (const id of ['6cce958f', 'aad3977f']) f(por[id].r.cadeia_2411.degrau_que_valeu === null && D(id, 0).tentou === false && D(id, 1).motivo_do_descarte === 'uso_none', `${id}: cadeia`)
  for (const id of ['c9272ee9', 'e3864c10']) f(por[id].r.cadeia_2411.degrau_que_valeu === 2 && D(id, 1).aceito && D(id, 1).motivo_do_descarte === null && D(id, 2).tentou === false && D(id, 3).tentou === false, `${id}: 1ª frase valeu, o resto não foi lido`)
  f(D('5301ea22', 1).motivo_do_descarte === 'visual_com_maiuscula' && D('5301ea22', 1).substantivo_central === 'animals' && D('5301ea22', 2).tentou === false, 'Noé (replay): descarte na 1ª frase')
  // Death Valley / Pompeia / Noé: descarte por maiúscula, núcleo comum, e a cadeia NÃO lê frase seguinte (trava de 17/11)
  for (const [id, nucleo] of [['death-valley', 'rocks'], ['pompeia', 'arena'], ['noe', 'animals']]) f(D(id, 1).motivo_do_descarte === 'visual_com_maiuscula' && D(id, 1).substantivo_central === nucleo && D(id, 1).tinha_maiuscula && D(id, 2).tentou === false && D(id, 0).tentou === false && por[id].lidos.length === 1, `${id}: ${JSON.stringify(D(id, 1))}`)
  f(D('nucleo-proprio', 1).substantivo_central === null, 'núcleo com maiúscula não pode sair como substantivo_central')
  f(por['aviao-aceito'].r.cadeia_2411.degrau_que_valeu === 3 && D('aviao-aceito', 2).aceito && D('aviao-aceito', 3).tentou === false, 'frase seguinte aceita = degrau 3')
  f(D('pedido-429', 0).tentou && !D('pedido-429', 0).respondeu && D('pedido-429', 0).motivo_do_descarte === 'leitura_falhou:http_429' && por['pedido-429'].r.cadeia_2411.degrau_que_valeu === 2, 'pedido sem resposta')
  // exceção dentro da medida: o resultado (planos, relato, leituras) sai igual e o bloco diz erro:true
  {
    const quebrado = carregar({ ...trocas, [MEDIDA]: [...(trocas[MEDIDA] ?? []), ['  if (!leitura) return naoTentou(degrau)', "  if (degrau) throw new Error('quebrou')"]] })
    const k = lista.find((x) => x.id === '3edd291a')
    let a = null
    try { a = await rodar(quebrado, k) } catch (e) { f(false, 'exceção da medida derrubou a cadeia: ' + e.message) }
    const b = por['3edd291a']
    f(a?.r && JSON.stringify(zeraMs({ p: a.r.planos, r: a.r.relato })) === JSON.stringify(zeraMs({ p: b.r.planos, r: b.r.relato })) && a.r.cadeia_2411?.erro === true && JSON.stringify(a.lidos) === JSON.stringify(b.lidos), 'exceção da medida: o evento antigo não saiu igual com erro:true')
  }
  // a rota grava o bloco depois do relato, nos dois eventos (clássico e hollywood), sem mudar o resto
  const rota = readFileSync(ROTA, 'utf8')
  f(rota.includes('...sujeitoClassico.relato, cadeia_2411: sujeitoClassico.cadeia_2411 ?? null') && rota.includes('...sujeitoH.relato, cadeia_2411: sujeitoH.cadeia_2411 ?? null'), 'a rota não grava cadeia_2411 nos dois eventos')
  return falhas
}

const falhas = await provas({})
if (falhas.length) { console.error('FAIL\n- ' + falhas.join('\n- ')); process.exit(1) }

const mutantes = [
  ['bloco gravando frase', { [MEDIDA]: [['    tinha_nome_proprio_de_lugar: null,\n    substantivo_central:', '    tinha_nome_proprio_de_lugar: null, visual: v.subject_visual_no_people,\n    substantivo_central:']] }],
  ['medida disparando leitura nova', { [CADEIA]: [['  const r = await cadeiaDoSujeito(args, opts, medida.anota)', "  const r = await cadeiaDoSujeito(args, opts, medida.anota)\n  if (r && !r.relato.sujeito && args.falas[0]) medida.anota('frase_seguinte', await lerSujeitoDoPedido(String(args.falas[0]) + ' ', opts))"]] }],
  ['exceção derrubando o evento (sem catch no fecha)', { [MEDIDA]: [['    } catch {\n      return { versao: SUJEITO_CADEIA_2411_VERSAO, degraus: [], degrau_que_valeu: null, erro: true }\n    }\n  }\n  return { anota, fecha }', '    } finally { /* sem catch */ }\n  }\n  return { anota, fecha }']] }],
  ['descarte sem o código', { [MEDIDA]: [['motivo_do_descarte: a.sujeito ? null : a.motivo,', "motivo_do_descarte: a.sujeito ? null : 'descartado',"]] }],
  ['medida mudando o sujeito escolhido', { [MEDIDA]: [['    } catch { erro = true }\n    return leitura\n  }', '    } catch { erro = true }\n    return leitura.ok ? { ...leitura, valor: { ...leitura.valor, subject_visual: null } } : leitura\n  }']] }],
  ['falha de leitura sem o código', { [MEDIDA]: [['motivo_do_descarte: `leitura_falhou:${leitura.erro}`', "motivo_do_descarte: 'leitura_falhou'"]] }],
  ['degrau que valeu = o 1º que respondeu', { [MEDIDA]: [['const k = degraus.findIndex((d) => d.aceito)', 'const k = degraus.findIndex((d) => d.respondeu)']] }],
  ['degrau não alcançado marcado como tentado', { [MEDIDA]: [['({ degrau, tentou: false, respondeu: false,', '({ degrau, tentou: true, respondeu: false,']] }],
  ['frase seguinte sem anotação', { [CADEIA]: [["const leitura = anota('frase_seguinte', await lerSujeitoDoPedido(seguinte, { ...opts, tentativasExtras: 0 }))", 'const leitura = await lerSujeitoDoPedido(seguinte, { ...opts, tentativasExtras: 0 })']] }],
  ['maiúscula nunca marcada', { [MEDIDA]: [["tinha_maiuscula: palavras.some((w, i) => /^\\p{Lu}/u.test(w) && !/\\d/.test(w) && !(i === 0 && /^(?:A|An|The)$/.test(w))),", 'tinha_maiuscula: false,']] }],
  ['núcleo próprio vira substantivo_central', { [MEDIDA]: [['  return comMaiuscula.test(escrito) ? null : h', '  return h']] }],
  ['palavras do visual contadas errado', { [MEDIDA]: [['palavras_do_visual: palavras.length,', 'palavras_do_visual: palavras.length ? 1 : 0,']] }],
]
const vivos = []
for (const [nome, trocas] of mutantes) {
  let fs2
  try { fs2 = await provas(trocas) } catch (e) { if (/troca não aplicável/.test(e.message)) throw e; fs2 = ['exceção: ' + e.message] } // mutante que não se aplica é erro do guardião, nunca 'morto'
  if (!fs2.length) vivos.push(nome)
}
if (vivos.length) { console.error('FAIL mutantes vivos: ' + vivos.join(' · ')); process.exit(1) }
console.log(`PASS KINEO-SUJEITO-CADEIA-2411 — ${casosReplay.length} filmes do replay + aviões + Death Valley/Pompeia/Noé: planos, relato e leituras idênticos à base ${BASE} (entradas congeladas); só códigos no bloco; exceção = erro:true com o evento igual; ${mutantes.length}/${mutantes.length} mutantes mortos por comportamento`)
