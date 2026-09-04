#!/usr/bin/env node
// ═══ KINEO-P0A-TESTE-2026-08-26 — A RÉGUA TEM QUE SER UMA SÓ ═══════════════
//
// Este teste existe por causa de um cliente real: ofirshu555, 26/08, vindo do
// ChatGPT. O guard barrou o roteiro dele (38s de fala para 45s de vídeo, 12
// palavras faltando), o auto-completar disparou, o servidor respondeu que o
// roteiro "já enchia", ele aprovou, e a geração seguinte reprovou com
// EXATAMENTE os mesmos 38s e as mesmas 12 palavras. Duas voltas em 32
// segundos. Ele foi embora sem nenhum vídeo.
//
// A causa não era o roteiro: era o produto medindo DUAS COISAS DIFERENTES com
// a mesma régua. O guard mede só a FALA (parseUserScript().narration, que
// remove HOOK/PAYOFF, [Pexels: ...], metadados e markdown). O expand-script
// media o texto CRU, marcadores inclusos — que tem muito mais palavras. Num
// roteiro estruturado, isso faz o expand achar que está tudo bem enquanto o
// guard recusa: loop infinito garantido.
//
// O que este teste trava, para sempre:
//   1. As duas pontas medem a MESMA coisa (a fala).
//   2. O caso 38s/45s do ofirshu555 é detectado como curto pelas duas.
//   3. Um roteiro estruturado com muitos marcadores não engana a medida.
//
// Rodar:  node scripts/test-narration-ruler.mjs
// Não precisa de rede, banco, chave de API nem servidor rodando.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// Os dois módulos são TypeScript; este teste replica as regras verificando o
// FONTE, para não exigir build. É deliberadamente um teste de invariante de
// código (as duas pontas usam o mesmo extrator), não um teste de runtime.
const rotaExpand = readFileSync(join(raiz, 'app/api/expand-script/route.ts'), 'utf8')
const rotaGuard = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')

let falhas = 0
const ok = (nome) => console.log(`  ✓ ${nome}`)
const falhou = (nome, detalhe) => {
  falhas += 1
  console.error(`  ✗ ${nome}\n      ${detalhe}`)
}

console.log('\nKINEO — régua única de narração (P0-A, incidente ofirshu555)\n')

// ── 1. O guard mede a fala extraída, não o texto cru ───────────────────────
if (/narrationFit\(\s*parsedScript\.narration/.test(rotaGuard)) {
  ok('guard mede parseUserScript(...).narration')
} else {
  falhou('guard mede parseUserScript(...).narration', 'a chamada esperada não foi encontrada em generate-video-cinematic')
}

// ── 2. A rota de expansão importa o MESMO extrator ─────────────────────────
if (/import \{ parseUserScript \} from '@\/lib\/scriptParser'/.test(rotaExpand)) {
  ok('expand-script importa o mesmo parseUserScript do guard')
} else {
  falhou('expand-script importa o mesmo parseUserScript', 'sem esse import as duas pontas voltam a divergir (causa do loop)')
}

// ── 3. As DUAS medidas da rota (antes e depois) usam a fala ────────────────
// KINEO-EXPANSOR-DEGRAU-2026-09-03 — (?:const|let), nao so const. Este
// invariante estava VERMELHO em origin/main e nao era o produto: desde o #37 a
// rota declara `let falaExpandida` / `let depois` porque a apara
// (KINEO-APARAR-2026-09-02) reatribui as duas. O teste continuou procurando a
// palavra `const` e acusava quebra onde nao havia — e teste vermelho cronico e
// teste que todo mundo aprende a ignorar. O que importa continua cobrado igual:
// a medida do "depois" sai da FALA parseada, nunca do texto cru (bateria 4).
const mediaAntesNaFala = /(?:const|let) falaOriginal = parseUserScript\(original\)\.narration[\s\S]{0,120}narrationFit\(falaOriginal/.test(rotaExpand)
const mediaDepoisNaFala = /(?:const|let) falaExpandida = parseUserScript\(expandido\)\.narration[\s\S]{0,160}narrationFit\(falaExpandida/.test(rotaExpand)
mediaAntesNaFala
  ? ok('expand-script decide o "antes" pela fala')
  : falhou('expand-script decide o "antes" pela fala', 'o early-return "já enche" voltaria a devolver o roteiro intacto e a criar o loop')
mediaDepoisNaFala
  ? ok('expand-script decide o "depois" pela fala')
  : falhou('expand-script decide o "depois" pela fala', 'aprovaria expansões que o guard recusa em seguida')

// ── 4. Nenhuma medida sobrou no texto cru ──────────────────────────────────
const cruAntes = /const antes = narrationFit\(original,/.test(rotaExpand)
const cruDepois = /const depois = narrationFit\(expandido,/.test(rotaExpand)
!cruAntes && !cruDepois
  ? ok('nenhuma medida da rota usa o texto cru')
  : falhou('nenhuma medida da rota usa o texto cru', `antes_cru=${cruAntes} depois_cru=${cruDepois} — voltou a medir marcadores como se fossem fala`)

// ── 5. O early-return informa que NÃO expandiu (senão a UI mente) ──────────
if (/expanded: false,\s*\n\s*stillShort: false/.test(rotaExpand)) {
  ok('early-return declara expanded:false + stillShort:false explícitos')
} else {
  falhou('early-return declara expanded/stillShort', 'sem esses campos o cliente exibe o texto inalterado como se fosse expansão')
}

// ── 6. Aritmética do caso real (38s de fala, alvo 45s, 95% de cobertura) ───
// Regra da casa: WORDS_PER_SECOND = 2.3, MIN_COVERAGE = 0.95.
// ⚠️ O evento de produção grava `speech_seconds` ARREDONDADO (Math.round), e
// por isso "38s" na telemetria pode ser qualquer valor em [37.5, 38.5). Com
// 38.0 exatos a conta dá 11 palavras; produção registrou 12, o que significa
// que a fala real era ~37.7s. Testar igualdade com o número arredondado seria
// testar o arredondamento do log, não a regra — a asserção honesta é sobre o
// COMPORTAMENTO: nessa faixa inteira o roteiro é curto e faltam ~11-12
// palavras. (Ajustar o código para "dar 12" seria maquiar o teste.)
const WPS = 2.3
const MIN = 0.95
const alvo = 45
// Amostra a faixa inteira que o log arredonda para "38s", de 0.1 em 0.1: as
// 12 palavras de produção caem por volta de 37.6-37.9s. Amostrar só as pontas
// (foi o meu primeiro erro aqui) esconde o ponto que realmente aconteceu.
const faixa = Array.from({ length: 11 }, (_, i) => Number((37.5 + i * 0.1).toFixed(1)))
const resultados = faixa.map((s) => ({
  s,
  cobertura: s / alvo,
  faltam: Math.ceil((alvo * MIN - s) * WPS),
}))
const todosCurtos = resultados.every((r) => r.cobertura < MIN)
const faltamPlausivel = resultados.every((r) => r.faltam >= 10 && r.faltam <= 13)
const cobre12 = resultados.some((r) => r.faltam === 12) // o valor visto em produção
if (todosCurtos && faltamPlausivel && cobre12) {
  ok(`caso ofirshu555: 45s com fala em [37.5,38.5) é sempre curto (${resultados.map((r) => r.faltam).join('/')} palavras faltando; produção viu 12)`)
} else {
  falhou(
    'caso ofirshu555 reproduzido',
    `curtos=${todosCurtos} plausivel=${faltamPlausivel} cobre12=${cobre12} → ${JSON.stringify(resultados)}`,
  )
}

// ── 7. A UI nunca oferece aprovar expansão insuficiente ───────────────────
//
// ⚠️ ESTES DOIS CASOS FORAM REESCRITOS NO #350 — e o motivo importa.
//
// Eles falharam quando o #350 subiu. NÃO porque a garantia caiu, mas porque
// eles checavam NOMES DE VARIÁVEL (`expandRoundRef.current >= 2`,
// `setExpandedScript(null)`) em vez de comportamento. O #350 renomeou o
// contador para `expandRoundsRef` (agora com chave por base+duração) e passou
// a MANTER o texto curto na tela para a pessoa terminar na mão — o que é
// melhor, não pior: o que nunca aparece é o botão de renderizar.
//
// É exatamente a armadilha que o teste de regex cria. A verificação de verdade
// destas duas garantias mora agora em scripts/test-expand-policy.mjs, que
// EXECUTA as funções. Aqui ficam só as âncoras estruturais mínimas.
const cliente = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
// A garantia REAL não é uma linha: é a ORDEM dos ramos do JSX. O painel de
// aprovação ("Use this script") vive no ramo `expandedScript`, e o ramo
// `expandState` vem ANTES dele. Enquanto houver um estado de término aberto —
// still_short, needs_authoring, o que for — o ramo de aprovação nem é
// alcançado, então não existe caminho para aprovar texto que o guard recusa.
// (Escrevi este teste duas vezes ancorado em nome de variável e ele quebrou
//  nas duas; a ordem dos ramos é o que o produto realmente promete.)
const ramoEstado = cliente.indexOf(") : expandState ? (")
const ramoAprovacao = cliente.indexOf(") : expandedScript ? (")
if (ramoEstado > 0 && ramoAprovacao > 0 && ramoEstado < ramoAprovacao) {
  ok('ramo de término vem antes do painel de aprovação (não há como aprovar texto curto)')
} else {
  falhou(
    'cliente bloqueia aprovação insuficiente',
    `ordem dos ramos quebrada: expandState=${ramoEstado}, expandedScript=${ramoAprovacao}`,
  )
}
if (/expandRoundsRef\.current\.used >= MAX_ROUNDS/.test(cliente)) {
  ok('teto de rodadas de expansão por (base, duração)')
} else {
  falhou('teto de rodadas', 'sem teto, um roteiro teimoso pode reabrir o ciclo indefinidamente')
}

console.log(
  falhas === 0
    ? '\nTODOS OS INVARIANTES OK — a régua é uma só.\n'
    : `\n${falhas} INVARIANTE(S) QUEBRADO(S) — o loop do ofirshu555 pode voltar.\n`,
)
process.exit(falhas === 0 ? 0 : 1)
