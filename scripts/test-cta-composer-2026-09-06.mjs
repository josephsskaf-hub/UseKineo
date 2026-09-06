#!/usr/bin/env node
/**
 * KINEO-CTA-CAI-NA-VITRINE-2026-09-06 — guardião do destino dos e-mails de resgate.
 *
 * O QUE ELE PROVA, lendo os ARQUIVOS REAIS (nada de mock, nada de constante
 * copiada): que nenhum e-mail cuja frase promete "faça o filme agora" deposita
 * a pessoa numa tela onde não há composer nem cartão de próxima ação.
 *
 * A cadeia inteira é verificada aqui, elo por elo, porque cada elo sozinho é
 * inofensivo e só a junção é o defeito:
 *   1. o porteiro de /generate degrada visita SEM query para /studio;
 *   2. /studio/create é quem renderiza o GenerateClient;
 *   3. as três montagens do NextActionCard vivem dentro do GenerateClient;
 *   4. portanto /studio não tem cartão — e é para lá que 3 campanhas apontavam.
 *
 * Se um dia o produto montar o cartão no StudioClient, o elo 3 aqui muda e
 * este guardião passa a reprovar por motivo certo (premissa quebrada), em vez
 * de continuar verde defendendo uma verdade que envelheceu.
 */
import fs from 'node:fs'
import path from 'node:path'

const raiz = process.cwd()
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8')
let ok = 0, fail = 0
const check = (nome, cond, detalhe = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nome}`) }
  else { fail++; console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`) }
}

// ── 1. A PREMISSA: o porteiro degrada visita vazia ─────────────────────────
console.log('\n1. O porteiro de /generate (premissa do defeito)')
const porteiro = ler('app/(dashboard)/generate/page.tsx')
check('visita COM query vai para /studio/create', /redirect\(\s*query\s*\?\s*`\/studio\/create\?\$\{query\}`/.test(porteiro))
check('visita VAZIA cai na vitrine /studio', /:\s*'\/studio'\s*\)/.test(porteiro))

// ── 2. Quem renderiza o composer ───────────────────────────────────────────
console.log('\n2. Onde o composer e o cartao realmente moram')
const criar = ler('app/(dashboard)/studio/create/page.tsx')
check('/studio/create renderiza o GenerateClient', /<GenerateClient/.test(criar))
const tela = ler('app/(dashboard)/generate/GenerateClient.tsx')
const montagens = tela.match(/<NextActionCard\s+surface="[a-z0-9_]+"/g) ?? []
check('o NextActionCard e montado no GenerateClient', montagens.length >= 1, `montagens=${montagens.length}`)
// A vitrine e' a tela que a visita vazia recebe. Se ela ganhar o cartao um dia,
// esta checagem reprova de proposito: a premissa do guardiao mudou.
// A EXISTENCIA e verificada em separado: um arquivo que sumiu tornaria a
// checagem de ausencia VACUAMENTE verdadeira — a familia de defeito que ja
// deixou tres guardioes verdes nesta madrugada (check que nao distingue
// 'ausente' de 'correto').
const vitrinePath = 'app/(dashboard)/studio/StudioClient.tsx'
check('a vitrine existe onde o guardiao a procura', fs.existsSync(path.join(raiz, vitrinePath)), vitrinePath)
const vitrine = ler(vitrinePath)
check('a vitrine /studio NAO monta o cartao (premissa)', !/<NextActionCard/.test(vitrine))

// ── 3. O helper: destino unico, query nunca vazia ──────────────────────────
console.log('\n3. lib/lifecycle/composerUrl.ts')
const helper = ler('lib/lifecycle/composerUrl.ts')
check("COMPOSER_PATH e '/studio/create'", /COMPOSER_PATH\s*=\s*'\/studio\/create'/.test(helper))
check('a funcao sempre anexa query (senao o porteiro degrada)', /\?\$\{params\.toString\(\)\}/.test(helper))
check('utm_campaign e obrigatorio na assinatura', /readonly campaign:\s*string/.test(helper))
check('base com barra final nao gera // no caminho', helper.includes("base.replace("))

// ── 4. As campanhas de RESGATE nao podem apontar para a vitrine ────────────
// Lista explicita, e explicitamente PARCIAL: so campanha cuja copy promete
// "faca o filme". /pricing, /history, /account, /wall e /avatar sao destinos
// legitimos e nao entram aqui. send-video-ready aponta para /studio de
// proposito — o assunto dela e o filme pronto, nao o composer.
console.log('\n4. Campanhas de resgate: nenhuma cai na vitrine')
const RESGATE = [
  'app/api/cron/send-failure-recovery/route.ts',
  'app/api/admin/send-winback-25/route.ts',
  'app/api/cron/send-video-rescue/route.ts',
]
for (const arquivo of RESGATE) {
  const src = ler(arquivo)
  const nome = arquivo.split('/').slice(-2, -1)[0]
  check(`${nome}: usa o helper`, /composerUrl\(/.test(src) && /from '@\/lib\/lifecycle\/composerUrl'/.test(src))
  // CTA cru para a vitrine: `${BASE}/studio` que nao seja /studio/create.
  const vitrineCrua = src.match(/\$\{[A-Z_]+\}\/studio(?!\/create)/g) ?? []
  check(`${nome}: nenhum CTA cru para /studio`, vitrineCrua.length === 0, vitrineCrua.join(' · '))
  // /generate sem query e' o mesmo defeito por outro caminho.
  const generateSemQuery = src.match(/\$\{[A-Z_]+\}\/generate(?![?\w])/g) ?? []
  check(`${nome}: nenhum /generate sem query`, generateSemQuery.length === 0, generateSemQuery.join(' · '))
}

// ── 5. As campanhas que JA estavam certas continuam certas ────────────────
// Elas nunca tiveram o defeito (carregavam query). A checagem existe para que
// um "conserto" futuro nao as quebre em nome da uniformidade.
console.log('\n5. Nao-regressao das campanhas que ja caiam no composer')
for (const [arq, marca] of [
  ['app/api/admin/send-stalled-rescue/route.ts', /\/generate\?intent_campaign=stalled_rescue/],
  ['app/api/cron/send-activation-nudge/route.ts', /\/generate\?utm_source=/],
]) {
  const src = ler(arq)
  check(`${arq.split('/').slice(-2, -1)[0]}: CTA continua com query`, marca.test(src))
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} verificacoes ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
