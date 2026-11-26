// KINEO-ESCRITOR-DE-DIALOGO-2511 — o CONFERIDOR do ensaio (offline, não chama nada): lê as respostas do POST /api/generate-script que a CEO guardou e
// aplica a régua escrita ANTES (scripts/fixtures/escritor-de-dialogo-2511-casos.json, no formato do leitor lerFalas2511 do 3bbf48a0:
// docs/semana-2/PERSONAGENS-FALAM-2511.md). Uso:
//   node scripts/ensaio-escritor-de-dialogo-2511.mjs <respostas.json>
// <respostas.json> = [{ "id": "f1", "resposta": { ...o JSON da rota... }, "elenco": [["the lighthouse keeper", "keeper"], ...] (opcional: o elenco do dry-run
//   do filme, como o servidor passa ao leitor: [nome, núcleo] por personagem) }]
// Volta 7 (V1): quem fala é medido pelo PRÓPRIO lerFalas2511 do 3bbf48a0, nunca por cópia. O leitor vem de lib/cinematic/falaDosPersonagens2511.ts
// desta árvore, ou de outra pasta com --leitor <raiz> (a branch dele). Sem o elenco do dry-run, mede também com o elenco no formato de hoje do servidor
// (elencoComoOServidor2511: "the <papel>" / núcleo; o humano com nome na ideia = o nome), coluna à parte.
// Imprime, por ideia, cada item da régua (true/false) e o placar. "A história é a do pedido" é a única linha de olho humano: vai como null.
// Volta 4 (T4 é do 3bbf48a0; aqui só a CONTA): fala_longa = quantas seções passam do teto do leitor, floor(2,2 × segundos do plano), a 3,75 s (8 palavras)
// e a 3 s (6 palavras). O leitor devolve fala_longa para o filme INTEIRO, que sai narrado. Informativo: não entra no 'passa'.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const P = createOfflineLoader({})('@/lib/scriptParser.ts')
const SECOES = ['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'PAYOFF']
const NARRADOR = /^(?:narrator|narration|voice|voiceover|voice over|voice-over|vo|announcer|host)$/i
const TITULO = /^(?:captain|capt|mr|mrs|ms|miss|mister|dr|doctor|sir|lady|lord|king|queen|prince|princess|officer|detective|agent|professor|prof|uncle|aunt)\.?$/i
const palavras = (t) => String(t ?? '').trim().split(/\s+/u).filter(Boolean).length // como o leitor conta
export const TETO_DO_LEITOR = (segundos) => Math.floor(2.2 * segundos) // lerFalas2511: 2,2 palavras por segundo do plano
const temNome = (texto, nome) => { const n = String(nome).trim().split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return !!n && new RegExp(`(?<![\\p{L}\\p{N}])${n}(?![\\p{L}\\p{N}])`, 'iu').test(texto) }

/** A régua de um roteiro, no formato do leitor do servidor do filme. */
const temRotulo = (texto, rotulo) => new RegExp(`(?<![\\p{L}\\p{N}])${String(rotulo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}(?:s|es)?(?![\\p{L}\\p{N}])`, 'iu').test(String(texto ?? ''))
/** O elenco no formato de HOJE do servidor (o que a revisora 392f0a52 leu nos filmes reais): para cada rótulo, o papel da ideia que termina nele vira
 *  ["the <papel>", "<núcleo>"]; se a ideia dá nome a ele ("<papel> named X"), o elenco grava o nome: [X, X]. É SIMULAÇÃO do elenco; o leitor é o real. */
export function elencoComoOServidor2511(ideia, rotulos) {
  return rotulos.map((r) => {
    const n = String(r).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = new RegExp(`((?:[\\p{L}-]+\\s+){0,2}${n}(?:s|es)?)(?![\\p{L}])(?:\\s*,?\\s*(?:named|called)\\s+(\\p{Lu}[\\p{L}'’-]*))?`, 'iu').exec(String(ideia ?? ''))
    if (m?.[2]) return [m[2], m[2]]
    const ws = m ? m[1].toLowerCase().split(/\s+/) : [String(r).toLowerCase()]
    let k = ws.length - 1
    while (k > 0 && !/^(?:a|an|the|two|three|her|his|their|its|and|or|of|for|with|to)$/.test(ws[k - 1])) k--
    const papel = ws.slice(k).join(' ') // o papel começa depois do último artigo ou conector ("their friend the walrus" = "walrus")
    return [`the ${papel}`, papel.split(/\s+/).pop()]
  })
}
/** ideia (volta 6): mede se o rótulo de quem fala está escrito na ideia (informativo). opcoes.lerFalas (volta 7): o lerFalas2511 REAL; com ele e o elenco
 *  ([nome, núcleo] por personagem), falantes_no_elenco = o leitor leu as falas; sem leitor ou sem elenco = null (não medido, nunca por cópia). */
export function conferirEnsaio(script, elenco = null, ideia = null, opcoes = {}) {
  const s = String(script ?? '')
  const blocos = s.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  const cabecas = blocos.map((b) => /^([A-Z][A-Z0-9 ]+):\s*\[Pexels:\s*([^\]]+)\]\s*$/.exec(b.split('\n')[0]))
  const linhas = blocos.map((b) => b.split('\n').slice(1).map((l) => /^([^:\n]{1,40}):\s*(.+)$/.exec(l.trim())).map((m) => (m ? { nome: m[1].trim(), fala: m[2].trim() } : null)))
  const todas = linhas.flat()
  const falantes = [...new Set(todas.filter(Boolean).map((f) => f.nome))]
  const porSecao = linhas.map((l) => l.reduce((n, f) => n + (f ? palavras(f.fala) : 0), 0))
  const total = porSecao.reduce((a, b) => a + b, 0)
  const r = {
    quatro_secoes_na_ordem: JSON.stringify(cabecas.map((c) => c?.[1] ?? null)) === JSON.stringify(SECOES),
    so_falas_na_secao: linhas.length === 4 && linhas.every((l) => l.length >= 1 && l.length <= 2 && l.every(Boolean)),
    no_maximo_2_falantes_sem_titulo: falantes.length >= 1 && falantes.length <= 2 && falantes.every((n) => !TITULO.test(n.split(' ')[0])),
    ate_8_palavras_por_secao: porSecao.every((n) => n >= 1 && n <= 8),
    de_25_a_35_no_filme: total >= 25 && total <= 35,
    fala_termina_em_pontuacao: todas.every((f) => f && /[.!?…"”'’]$/u.test(f.fala)),
    quem_fala_esta_na_marca: linhas.every((l, i) => l.every((f) => f && cabecas[i] && temNome(cabecas[i][2], f.nome))),
    sem_dois_pontos_nem_rubrica: todas.every((f) => f && !/[\p{L}\p{N}]\s*:/u.test(f.fala) && !/[()[\]{}*]/.test(f.fala)),
    nada_de_narrador: falantes.every((n) => !NARRADOR.test(n)),
    o_parser_de_hoje_le_4_secoes: P.parseUserScript(s).segments.length === 4,
    falantes_no_elenco: null,
    rotulo_na_ideia: typeof ideia === 'string' ? falantes.every((n) => temRotulo(ideia, n)) : null,
    historia_do_pedido: null, // olho humano
  }
  const leitor = typeof opcoes.lerFalas === 'function' ? (el) => { const vo = P.parseUserScript(s).segments.map((x) => x.voiceover); const lido = opcoes.lerFalas(vo, el, vo.length); return 'falas' in (lido ?? {}) ? null : (lido?.motivo ?? 'sem_resposta') } : null
  let motivo_do_leitor = null, motivo_com_elenco_simulado = null
  if (leitor && Array.isArray(elenco)) { motivo_do_leitor = leitor(elenco.map((e) => (Array.isArray(e) ? e : [e, e]))); r.falantes_no_elenco = motivo_do_leitor === null }
  const falado_com_elenco_simulado = leitor && typeof ideia === 'string' ? (motivo_com_elenco_simulado = leitor(elencoComoOServidor2511(ideia, falantes))) === null : null
  const fala_longa = { a_3_75s: porSecao.filter((n) => n > TETO_DO_LEITOR(3.75)).length, a_3s: porSecao.filter((n) => n > TETO_DO_LEITOR(3)).length }
  return { ...r, falantes, palavras: total, fala_longa, motivo_do_leitor, falado_com_elenco_simulado, motivo_com_elenco_simulado }
}

if (process.argv[2] && !process.argv[2].startsWith('--')) {
  const linhas = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  // o leitor REAL: desta árvore (quando a branch do 3bbf48a0 estiver nela) ou de --leitor <raiz>
  let lerFalas = null, origem = 'ausente'
  const iL = process.argv.indexOf('--leitor')
  try {
    if (iL > 0) { const raiz = process.argv[iL + 1], c = process.cwd(); process.chdir(raiz); try { lerFalas = createOfflineLoader({})('@/lib/cinematic/falaDosPersonagens2511.ts').lerFalas2511 } finally { process.chdir(c) } origem = raiz }
    else { lerFalas = createOfflineLoader({})('@/lib/cinematic/falaDosPersonagens2511.ts').lerFalas2511; origem = 'esta árvore' }
  } catch { lerFalas = null }
  console.log(`LEITOR lerFalas2511: ${lerFalas ? origem : 'AUSENTE (rode com --leitor <pasta da branch do 3bbf48a0>)'}`)
  let leitorSim = 0, comSim = 0
  let passou = 0, longa375 = 0, longa3 = 0, falados = 0, comElenco = 0, noElenco = 0, naIdeia = 0
  const IDEIAS = Object.fromEntries(JSON.parse(readFileSync(new URL('./fixtures/escritor-de-dialogo-2511-casos.json', import.meta.url), 'utf8')).casos.map((c) => [c.id, c.corpo.topic]))
  for (const l of linhas) {
    const voz = l.resposta?.voiceMode === 'characters'
    const c = voz ? conferirEnsaio(l.resposta.script, l.elenco ?? null, l.ideia ?? IDEIAS[l.id] ?? null, { lerFalas }) : null
    const ok = !!c && Object.entries(c).filter(([k]) => !['falantes', 'palavras', 'historia_do_pedido', 'falantes_no_elenco', 'rotulo_na_ideia', 'fala_longa', 'motivo_do_leitor', 'falado_com_elenco_simulado', 'motivo_com_elenco_simulado'].includes(k)).every(([, v]) => v === true) && c.falantes_no_elenco !== false
    if (ok) passou++
    if (c) { falados++; if (c.fala_longa.a_3_75s > 0) longa375++; if (c.fala_longa.a_3s > 0) longa3++; if (c.falantes_no_elenco !== null) { comElenco++; if (c.falantes_no_elenco) noElenco++ } if (c.rotulo_na_ideia) naIdeia++; if (c.falado_com_elenco_simulado !== null) { comSim++; if (c.falado_com_elenco_simulado) leitorSim++ } }
    console.log(JSON.stringify({ id: l.id, saiu_falado: voz, ...(c ?? {}), passa: ok }))
  }
  console.log(`PLACAR: ${passou}/${linhas.length} roteiros falados dentro da régua (a história do pedido: conferir à mão)`)
  console.log(`FALA_LONGA (o filme inteiro sairia narrado no leitor): ${longa375}/${falados} a 3,75 s por plano; ${longa3}/${falados} a 3 s por plano`)
  console.log(`FALANTES_NO_ELENCO pelo lerFalas2511 (senão o servidor manda narrado): ${noElenco}/${comElenco} com o elenco do dry-run; ${leitorSim}/${comSim} com o elenco no formato de hoje do servidor (simulado); rótulo escrito na ideia: ${naIdeia}/${falados}`)
}
