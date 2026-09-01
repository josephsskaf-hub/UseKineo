// ═══════════════════════════════════════════════════════════════════════════
// sprint-v1v4 #36 — o aceite do roteiro completado emenda na analise
//
// O QUE ESTE TESTE PROVA (e por que le o arquivo em vez de rodar React):
// a mudanca e de FLUXO dentro de um componente de 12 mil linhas que so existe
// no browser. Nao ha como montar a arvore aqui. Entao o teste faz o que a
// licao da #14 mandou: le o codigo-fonte e prova as invariantes por ancoras
// de UMA LINHA, que sobrevivem a reformatacao e a mudanca de indentacao.
//
// A REGRESSAO QUE ELE PEGA: alguem devolver o `setPhase('idle')` como ponto
// final de acceptExpandedScript, ou apagar a chamada de handleAnalyze — a
// pessoa volta a ser largada no formulario depois de aprovar o texto.
import { readFileSync } from 'node:fs'

const ARQ = 'app/(dashboard)/generate/GenerateClient.tsx'
const src = readFileSync(new URL(`../${ARQ}`, import.meta.url), 'utf8')
const linhas = src.split(/\r?\n/)

let ok = 0
let falhou = 0
function checa(nome, condicao) {
  if (condicao) { ok++; console.log(`  ok  ${nome}`) }
  else { falhou++; console.log(`FALHOU  ${nome}`) }
}

// ── Recorta o corpo de acceptExpandedScript sem depender de indentacao ─────
const iIni = linhas.findIndex((l) => l.includes('function acceptExpandedScript'))
checa('acceptExpandedScript existe', iIni >= 0)
const iIrmao = linhas.findIndex((l) => l.includes('function acceptAuthoredScript'))
checa('acceptAuthoredScript (o irmao) existe', iIrmao >= 0)
// o corpo termina na proxima declaracao de funcao do componente
const iFim = linhas.findIndex((l, i) => i > iIni && /^\s{2}(async )?function /.test(l))
checa('fim do corpo localizado', iFim > iIni)
const corpo = linhas.slice(iIni, iFim).join('\n')
const corpoIrmao = (() => {
  const f = linhas.findIndex((l, i) => i > iIrmao && /^\s{2}(async )?function /.test(l))
  return linhas.slice(iIrmao, f).join('\n')
})()

// ── 1. O aceite emenda na analise (o coracao da rodada) ────────────────────
checa('aceite chama handleAnalyze', /void handleAnalyze\(/.test(corpo))
checa('e passa o texto aprovado, nao o state ja limpo',
  /void handleAnalyze\(aprovado,/.test(corpo))
checa('marcado como afterExpandAccept', /afterExpandAccept: true/.test(corpo))

// ── 2. Simetria com o irmao que ja funcionava ──────────────────────────────
checa('o irmao tambem emenda (a simetria e o ponto)', /void handleAnalyze\(/.test(corpoIrmao))

// ── 3. O texto vive numa const, nao no state que acabou de ser zerado ──────
const iConst = corpo.indexOf('const aprovado = expandedScript')
const iLimpa = corpo.indexOf('setExpandedScript(null)')
checa('const aprovado existe', iConst >= 0)
checa('a const e capturada ANTES da limpeza do state', iConst >= 0 && iLimpa > iConst)
checa('o evento conta as palavras do texto aprovado, nao do state limpo',
  /approved_words: aprovado\.split/.test(corpo))

// ── 4. O idle continua, como rede para as saidas curtas de handleAnalyze ───
checa("setPhase('idle') preservado antes da analise", corpo.includes("setPhase('idle')"))
const iIdle = corpo.indexOf("setPhase('idle')")
const iAnalise = corpo.indexOf('void handleAnalyze(')
checa('o idle vem ANTES da analise (senao sobrescreveria a fase certa)',
  iIdle >= 0 && iAnalise > iIdle)

// ── 5. Contrato C1: aprovar NAO pode disparar render nem debito ────────────
checa('o aceite nao chama handleGenerate', !/handleGenerate\(/.test(corpo))
checa('o aceite nao dispara compose', !/\/api\/compose/.test(corpo))
checa('o aceite nao dispara o motor cinematico',
  !/generate-video-cinematic/.test(corpo))

// ── 6. O evento que serve de juiz da rodada ────────────────────────────────
checa('script_expand_accepted continua sendo emitido',
  /trackEvent\('script_expand_accepted'/.test(corpo))
checa('e carrega auto_continued para separar do comportamento antigo',
  /auto_continued: true/.test(corpo))

// ── 7. O funil sabe distinguir a analise que emendou da que foi clicada ────
checa("handleAnalyze aceita a opcao afterExpandAccept",
  /afterExpandAccept\?: boolean/.test(src))
checa("e a traduz para source='expand_accepted'",
  /'expand_accepted'/.test(src))
checa("sem apagar os sources antigos ('topic' e 'manual')",
  /'topic'/.test(src) && /'manual'/.test(src))

// ── 8. Nada da pista do Codex foi tocado neste arquivo ─────────────────────
checa('nenhum preco/SKU/credito novo entrou no bloco do aceite',
  !/(price|sku|checkout|upgrade|credits_cost)/i.test(corpo))

console.log(`\n${ok} verificacoes ok, ${falhou} falharam`)
process.exit(falhou === 0 ? 0 : 1)
