#!/usr/bin/env node
// ═══ KINEO-PRIMEIRO-EPISODIO-PRONTO-2026-09-06 — guardiao ════════════════
//
// Esta e a carta de MAIOR ALCANCE da casa (249 envios em 30 dias) e ela JA
// FUNCIONA — 13 filmes e 2 pagantes vieram depois dela. Mexer aqui e mexer no
// que da dinheiro, entao o guardiao gasta a maior parte do esforco provando o
// que NAO pode mudar:
//
//   (A) EQUIVALENCIA: sem os tres episodios, o e-mail sai IGUAL ao de hoje.
//       Isto e provado EXECUTANDO os dois construtores — o de producao
//       (`git show origin/main:...`) e o desta arvore — e comparando o texto
//       gerado. Nao e leitura de regex: sao as duas strings, lado a lado.
//   (B) O QUE MUDA quando os episodios existem.
//   (C) As travas de custo e de seguranca.
//
// Rodar: node scripts/test-primeiro-episodio-pronto.mjs   (sem rede, sem custo)

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8').split('\r\n').join('\n')

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond) ok++
  else falhas.push(nome)
}

const ROTA = 'app/api/cron/send-activation-nudge/route.ts'
const atual = ler(ROTA)

// ── monta um modulo executavel a partir de um FONTE, com os stubs minimos ──
const CABECALHO = [
  "import { getViralNowTopics } from './lib/viralTopics.ts'",
  "import { composerUrl } from './lib/lifecycle/composerUrl.ts'",
  "const APP_URL='https://www.usekineo.com'",
  "const OFFER={copy:{headline:'3 free videos a day.'}}",
  'const ft=(_o,a)=>a',
  "const emailFooterHtml=()=>'<!--footer-->'",
  "const emailFooterText=()=>String.fromCharCode(10)+'[footer]'",
].join('\n')

function montar(src, arquivoSaida) {
  const s = src.split('\r\n').join('\n')
  const temNovo = s.includes('type EpisodioPronto')
  const i0 = temNovo ? s.indexOf('type EpisodioPronto') : s.indexOf('function buildEmail(')
  const i1 = s.indexOf('export async function GET')
  if (i0 < 0 || i1 < i0) return null
  const corpo = s
    .slice(i0, i1)
    .replace(/type EpisodioPronto = [^\n]*\n/, '')
    .replace(/: EpisodioPronto\[\]/g, '')
    .replace(/: EpisodioPronto/g, '')
    .replace(/\(v: string\)/g, '(v)')
    .replace(/function buildEmail\(userId: string, episodios = \[\]\)/, 'function buildEmail(userId, episodios = [])')
    .replace(/function buildEmail\(userId: string\)/, 'function buildEmail(userId, episodios = [])')
  const exporta = temNovo ? 'export { buildEmail, episodiosProntos }' : 'export { buildEmail }'
  writeFileSync(join(raiz, arquivoSaida), `${CABECALHO}\n${corpo}\n${exporta}`, 'utf8')
  return arquivoSaida
}

const F_ATUAL = '.guardiao-nudge-atual.mjs'
const F_PROD = '.guardiao-nudge-prod.mjs'
const limpar = () => {
  for (const f of [F_ATUAL, F_PROD]) if (existsSync(join(raiz, f))) unlinkSync(join(raiz, f))
}

let prodSrc = null
try {
  prodSrc = execFileSync('git', ['show', `origin/main:${ROTA}`], { cwd: raiz, encoding: 'utf8' })
} catch {
  prodSrc = null
}

montar(atual, F_ATUAL)
const modAtual = await import(`../${F_ATUAL}?v=${Date.now()}`)

// ══ (A) EQUIVALENCIA — a parte que protege o que ja da dinheiro ══════════
const semEp = modAtual.buildEmail('u1', [])
if (prodSrc) {
  montar(prodSrc, F_PROD)
  const modProd = await import(`../${F_PROD}?v=${Date.now()}`)
  const prod = modProd.buildEmail('u1')
  check('1. SEM episodios, o TEXTO e byte a byte o de producao', prod.text === semEp.text)
  // O HTML ganha uma linha so de espacos onde o bloco vazio e interpolado —
  // invisivel no render, e por isso a comparacao ignora espaco em branco.
  check(
    '2. SEM episodios, o HTML e o de producao ignorando espaco em branco',
    prod.html.replace(/\s+/g, ' ').trim() === semEp.html.replace(/\s+/g, ' ').trim(),
  )
  check('3. e a diferenca de HTML e SO espaco (nenhuma tag some ou nasce)',
    (prod.html.match(/<[a-z/][^>]*>/g) ?? []).join('') === (semEp.html.match(/<[a-z/][^>]*>/g) ?? []).join(''))
} else {
  falhas.push('1-3. nao consegui ler a versao de producao (git show falhou) — equivalencia NAO provada')
}
// A carta de hoje tem dois exemplos entre parenteses. Eles sao a UNICA
// concretude dela. Tirar isso no caminho de falha aberta faria a "protecao"
// piorar o e-mail — foi o defeito que o diff pegou antes do push.
check('4. SEM episodios, os dois exemplos de hoje continuam na carta', semEp.text.includes('Bermuda Triangle') && semEp.text.includes('Bezos'))
check('5. SEM episodios, nenhum bloco de episodio aparece', !semEp.text.includes('Three that are working right now') && !semEp.html.includes('Make this one'))

// ══ (B) O QUE MUDA quando os episodios existem ═══════════════════════════
const eps = modAtual.episodiosProntos()
check('6. o pool entrega exatamente 3 episodios', Array.isArray(eps) && eps.length === 3)
check('7. cada episodio tem titulo e link', eps.every((e) => e.titulo && e.href))
check('8. os tres titulos sao diferentes', new Set(eps.map((e) => e.titulo)).size === 3)
// O prefill e o TITULO, nao o `prompt` do pool: aquele campo e um roteiro
// estruturado inteiro e `composerUrl` corta em 120 caracteres — cortar um
// roteiro no meio de um marcador e a classe de erro do "menino da bolha".
check('9. o link leva o TITULO como prompt, inteiro (nada truncado)', eps.every((e) => {
  const u = new URL(e.href)
  return u.searchParams.get('prompt') === e.titulo
}))
check('10. o link nao carrega marcador de roteiro (HOOK/PAYOFF)', eps.every((e) => !/HOOK|PAYOFF|Pexels/i.test(e.href)))
check('11. o link tem campanha propria, separavel no placar', eps.every((e) => e.href.includes('utm_campaign=d0_activation_topic')))
check('12. o link aponta para o compositor da casa', eps.every((e) => e.href.startsWith('https://www.usekineo.com/studio/create?')))

const comEp = modAtual.buildEmail('u1', eps)
check('13. COM episodios, os tres titulos aparecem no texto', eps.every((e) => comEp.text.includes(e.titulo)))
check('14. COM episodios, os tres links aparecem no HTML', eps.every((e) => comEp.html.includes(e.href)))
check('15. COM episodios, os exemplos genericos SAEM (o lugar deles foi ocupado)', !comEp.text.includes('Bermuda Triangle'))
check('16. COM episodios, o botao principal continua existindo', comEp.html.includes('Make my first video'))
check('17. os titulos sao escapados no HTML', /\$\{esc\(e\.titulo\)\}/.test(atual))

// ══ (C) CUSTO, FALHA ABERTA E PLACAR ═════════════════════════════════════
check('18. o pool e funcao PURA: nenhuma chamada de modelo nesta rota', !/api\.openai\.com|gpt-4o/.test(atual))
check('19. e nenhuma leitura de banco a mais para montar os episodios', !/from\('viral_now_topics'\)/.test(atual))
check('20. episodiosProntos tem try/catch e devolve [] no erro', /function episodiosProntos\(\)[\s\S]{0,1200}?\} catch \{\n\s*return \[\]\n\s*\}/.test(atual))
check('21. ou os TRES, ou nenhum (nao sai carta com 1 exemplo torto)', /return out\.length === 3 \? out : \[\]/.test(atual))
check('22. o pool e calculado UMA vez por execucao, fora do laco', /const episodiosDoLote = episodiosProntos\(\)/.test(atual) && atual.indexOf('const episodiosDoLote') < atual.indexOf('buildEmail(u.id, episodiosDoLote)'))
check('23. o assunto nomeia o primeiro episodio quando ele existe', /episodiosDoLote\.length > 0\n\s*\? `Your first video: "\$\{episodiosDoLote\[0\]\.titulo\}"`/.test(atual))
check('24. e volta ao assunto de hoje quando nao existe', atual.includes("'Your first Fast video is a few minutes away'"))
// As travas que ja existiam na rota nao podem ter sumido.
check('25. o portao de cron continua FAIL-CLOSED', /if \(!cronSecret\) return false/.test(atual))
check('26. o interruptor de ciclo de vida continua respeitado', /if \(!LIFECYCLE_EMAILS_ENABLED\)/.test(atual))
check('27. o rodape de descadastro continua nos dois corpos', /emailFooterText\(userId\)/.test(atual) && /emailFooterHtml\(userId\)/.test(atual))
check('28. o carimbo de PULO continua sendo o sentinela, nao now()', /LIFECYCLE_SKIP_STAMP/.test(atual))

limpar()
console.log(`\n${ok}/${ok + falhas.length} verificacoes passaram`)
if (falhas.length) {
  console.error('\nFALHOU:')
  for (const f of falhas) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ com episodios a carta entrega tres; sem eles, ela e a de hoje letra por letra')
