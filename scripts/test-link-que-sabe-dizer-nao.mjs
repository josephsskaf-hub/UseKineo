#!/usr/bin/env node
// ═══ KINEO-LINK-QUE-SABE-DIZER-NAO-2026-09-06 ════════════════════════════
//
// O CASO REAL: na madrugada de 06/09 o mecanismo da proxima acao teve o seu
// PRIMEIRO clique de verdade — e a pessoa caiu na home do /studio, sem prompt
// e sem motor. A causa nao foi a tela: `buildSeriesContinuationHref` devolve a
// string '/studio' quando o tema nao monta prompt, '/studio' e truthy, e o
// `hrefContinuar ?? hrefBarato` da rota morreu sem nunca rodar.
//
// Este guardiao le os ARQUIVOS REAIS (nada de mock) e amarra as verificacoes
// a variavel que decide, nao a contagem de texto.
//
// Rodar: node scripts/test-link-que-sabe-dizer-nao.mjs   (sem rede, sem custo)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
// CRLF na arvore do Windows ja deu falso vermelho nesta casa. Normalizar na
// LEITURA e a unica forma de um regex de mais de uma linha ser confiavel.
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8').split('\r\n').join('\n')

const lib = ler('lib/seriesContinuation.ts')
const rota = ler('app/api/next-action/route.ts')

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond) ok++
  else falhas.push(nome)
}

// ── A BIBLIOTECA ─────────────────────────────────────────────────────────
check('1. seriesContinuationHrefOrNull existe e e exportada', /export function seriesContinuationHrefOrNull\(/.test(lib))

const iOrNull = lib.indexOf('export function seriesContinuationHrefOrNull(')
const corpoOrNull = iOrNull < 0 ? '' : lib.slice(iOrNull, lib.indexOf('\n}\n', iOrNull) + 3)

check('2. a variante nova declara retorno `string | null`', /\n\): string \| null \{/.test(corpoOrNull))
check(
  '3. sem prompt, a variante nova devolve null (e NAO a string /studio)',
  /if \(!prompt\) return null/.test(corpoOrNull) && !corpoOrNull.includes("return '/studio'"),
)
check('4. a variante nova ainda monta o mesmo destino quando HA prompt', corpoOrNull.includes('/studio/create?'))
check(
  '5. a variante nova preserva os 4 parametros do contrato antigo + o motor',
  ['prompt,', "autoanalyze: '1'", "series: '1'", 'continuation_source: source'].every((p) => corpoOrNull.includes(p)) &&
    corpoOrNull.includes("params.set('engine', engine)"),
)

// A porta das TELAS nao pode mudar de comportamento: 10 chamadores dependem
// dela devolver string sempre, e dois deles (ResumeStrip, StudioClient) sao
// territorio do Codex nesta pista e nao podem ser tocados.
const iAntiga = lib.indexOf('export function buildSeriesContinuationHref(')
const corpoAntiga = iAntiga < 0 ? '' : lib.slice(iAntiga, lib.indexOf('\n}\n', iAntiga) + 3)
check('6. buildSeriesContinuationHref continua declarando retorno `string`', /\n\): string \{/.test(corpoAntiga))
check(
  '7. a porta das telas delega na variante nova e mantem /studio como piso',
  corpoAntiga.includes("return seriesContinuationHrefOrNull(value, source, opts) ?? '/studio'"),
)

// ── A ROTA ───────────────────────────────────────────────────────────────
check('8. a rota importa a variante que sabe dizer nao', /import \{ seriesContinuationHrefOrNull \} from '@\/lib\/seriesContinuation'/.test(rota))
check('9. a rota NAO chama mais a porta das telas (que nunca devolve null)', !rota.includes('buildSeriesContinuationHref('))
check("10. hrefContinuar e montado pela variante nova", /const hrefContinuar = tema\n\s*\? seriesContinuationHrefOrNull\(tema, 'next_action'/.test(rota))
// A LINHA QUE ESTA RODADA EXISTIA PARA CONSERTAR. Amarrada a variavel.
check('11. a saida barata segue pendurada em hrefContinuar ?? hrefBarato', rota.includes('const hrefAlternativa = motorAcessivel ? (hrefContinuar ?? hrefBarato) : null'))
check('12. o evento so rotula "series" quando hrefContinuar existe de verdade', /hrefContinuar \? 'series'\n\s*: 'composer'/.test(rota))

// ── A FRASE FALSA QUE O NULL PODERIA TER CRIADO ──────────────────────────
// Com hrefContinuar podendo ser null tendo filme entregue, o `primary` cairia
// em 'make_first_film' e diria "Make your first film" para quem JA tem filme.
//
// ⚠ AQUI JA ERREI UMA VEZ, NESTA MESMA RODADA: a primeira versao usava
// /: state === 'can_continue'[\s\S]*?make_next_film/ e o `[\s\S]*?` atravessava
// 20 linhas ate achar o OUTRO `state === 'can_continue'` que ja existia no
// arquivo — o mutante que trocava a guarda do ramo novo por `true` passava
// 16/16. Regex frouxo nao prova condicao. A guarda agora e lida do pedaco
// IMEDIATAMENTE antes do ramo, sem salto possivel.
const iRamoNovo = rota.indexOf("kind: 'make_next_film' as const")
const antes = iRamoNovo < 0 ? '' : rota.slice(Math.max(0, iRamoNovo - 900), iRamoNovo)
const guardas = antes.match(/\n\s*: [^\n]+\n\s*\? \{/g) ?? []
const guardaDoRamo = guardas.length ? guardas[guardas.length - 1] : ''

check('13. existe ramo proprio para can_continue sem tema aproveitavel', iRamoNovo > 0)
check(
  '14. esse ramo NAO promete episodio 2 nem chama a pessoa de estreante',
  /kind: 'make_next_film' as const,\n\s*href: '\/studio\/create\?src=next_action_no_seed',\n\s*label: 'Make your next film',/.test(rota),
)
check(
  '15. "Make your first film" continua existindo, mas agora DEPOIS do ramo novo',
  rota.includes("kind: 'make_first_film'") && iRamoNovo < rota.indexOf("kind: 'make_first_film'"),
)
check("16. a guarda IMEDIATA do ramo novo e o estado can_continue", /: state === 'can_continue'\n\s*\? \{$/.test(guardaDoRamo))
check('17. a guarda IMEDIATA do ramo novo nao e um literal verdadeiro', guardaDoRamo !== '' && !/: (true|1|!0)\n/.test(guardaDoRamo))

console.log(`\n${ok}/${ok + falhas.length} verificacoes passaram`)
if (falhas.length) {
  console.error('\nFALHOU:')
  for (const f of falhas) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ o link sabe dizer nao, e a saida barata volta a existir')
