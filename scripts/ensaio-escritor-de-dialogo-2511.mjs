// KINEO-ESCRITOR-DE-DIALOGO-2511 — o CONFERIDOR do ensaio (offline, não chama nada): lê as respostas do POST /api/generate-script que a CEO guardou e
// aplica a régua escrita ANTES (scripts/fixtures/escritor-de-dialogo-2511-casos.json, no formato do leitor lerFalas2511 do 3bbf48a0:
// docs/semana-2/PERSONAGENS-FALAM-2511.md). Uso:
//   node scripts/ensaio-escritor-de-dialogo-2511.mjs <respostas.json>
// <respostas.json> = [{ "id": "f1", "resposta": { ...o JSON da rota... }, "elenco": ["Elias Ward", ...] (opcional: o elenco do dry-run do filme) }]
// Imprime, por ideia, cada item da régua (true/false) e o placar. "A história é a do pedido" é a única linha de olho humano: vai como null.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const P = createOfflineLoader({})('@/lib/scriptParser.ts')
const SECOES = ['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'PAYOFF']
const NARRADOR = /^(?:narrator|narration|voice|voiceover|voice over|voice-over|vo|announcer|host)$/i
const TITULO = /^(?:captain|capt|mr|mrs|ms|miss|mister|dr|doctor|sir|lady|lord|king|queen|prince|princess|officer|detective|agent|professor|prof|uncle|aunt)\.?$/i
const palavras = (t) => String(t ?? '').trim().split(/\s+/u).filter(Boolean).length // como o leitor conta
const temNome = (texto, nome) => { const n = String(nome).trim().split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return !!n && new RegExp(`(?<![\\p{L}\\p{N}])${n}(?![\\p{L}\\p{N}])`, 'iu').test(texto) }

/** A régua de um roteiro, no formato do leitor do servidor do filme. */
export function conferirEnsaio(script, elenco = null) {
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
    falantes_no_elenco: Array.isArray(elenco) ? falantes.every((n) => elenco.some((e) => e.toLowerCase().split(/\s+/).includes(n.toLowerCase()) || e.toLowerCase() === n.toLowerCase())) : null,
    historia_do_pedido: null, // olho humano
  }
  return { ...r, falantes, palavras: total }
}

if (process.argv[2]) {
  const linhas = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  let passou = 0
  for (const l of linhas) {
    const voz = l.resposta?.voiceMode === 'characters'
    const c = voz ? conferirEnsaio(l.resposta.script, l.elenco ?? null) : null
    const ok = !!c && Object.entries(c).filter(([k]) => !['falantes', 'palavras', 'historia_do_pedido', 'falantes_no_elenco'].includes(k)).every(([, v]) => v === true) && c.falantes_no_elenco !== false
    if (ok) passou++
    console.log(JSON.stringify({ id: l.id, saiu_falado: voz, ...(c ?? {}), passa: ok }))
  }
  console.log(`PLACAR: ${passou}/${linhas.length} roteiros falados dentro da régua (a história do pedido: conferir à mão)`)
}
