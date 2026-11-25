// KINEO-ESCRITOR-DE-DIALOGO-2511 — o CONFERIDOR do ensaio (offline, não chama nada): lê as respostas do POST /api/generate-script que a CEO guardou e
// aplica a régua escrita ANTES (docs/semana-2/ESCRITOR-DE-DIALOGO-2511.md). Uso:
//   node scripts/ensaio-escritor-de-dialogo-2511.mjs <respostas.json>
// <respostas.json> = [{ "id": "f1", "resposta": { ...o JSON da rota... }, "elenco": ["Elias Ward", ...] (opcional: o elenco do dry-run do filme) }]
// Imprime, por ideia, cada item da régua (true/false) e o placar. "A história é a do pedido" é a única linha de olho humano: vai como null.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const P = createOfflineLoader({})('@/lib/scriptParser.ts')
const SECOES = ['HOOK', 'MICRO REWARD 1', 'MICRO REWARD 2', 'PAYOFF']
const NARRADOR = /^(?:narrator|narration|voice|voiceover|voice over|voice-over|vo|announcer|host)$/i
const palavras = (t) => (String(t ?? '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length

/** A régua de um roteiro: as seções, as falas por seção, os falantes, o tamanho, o narrador e o elenco (quando veio). */
export function conferirEnsaio(script, elenco = null) {
  const s = String(script ?? '')
  const blocos = s.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  const cabecalhos = blocos.map((b) => (/^([A-Z][A-Z0-9 ]+):\s*\[Pexels:[^\]]+\]\s*$/m.exec(b.split('\n')[0]) ?? [])[1] ?? null)
  const falas = blocos.map((b) => b.split('\n').slice(1).map((l) => /^([^:\n]{1,40}):\s*(.+)$/.exec(l.trim())).map((m) => (m ? { nome: m[1].trim(), fala: m[2].trim() } : null)))
  const todas = falas.flat()
  const falantes = [...new Set(todas.filter(Boolean).map((f) => f.nome))]
  const r = {
    quatro_secoes_na_ordem: JSON.stringify(cabecalhos) === JSON.stringify(SECOES),
    toda_secao_tem_fala_valida: falas.length === 4 && falas.every((l) => l.length >= 1 && l.length <= 2 && l.every(Boolean)),
    no_maximo_2_falantes: falantes.length >= 1 && falantes.length <= 2,
    cada_fala_ate_10_palavras: todas.every((f) => f && palavras(f.fala) >= 1 && palavras(f.fala) <= 10),
    nada_de_narrador: falantes.every((n) => !NARRADOR.test(n)),
    o_parser_de_hoje_le_4_secoes: P.parseUserScript(s).segments.length === 4,
    falantes_no_elenco: Array.isArray(elenco) ? falantes.every((n) => elenco.some((e) => e.toLowerCase().split(/\s+/).includes(n.toLowerCase()) || e.toLowerCase() === n.toLowerCase())) : null,
    historia_do_pedido: null, // olho humano
  }
  return { ...r, falantes, palavras: todas.reduce((n, f) => n + (f ? palavras(f.fala) : 0), 0) }
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
