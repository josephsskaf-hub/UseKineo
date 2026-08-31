// sprint-v1v4 #14 — A FILA DO PRÓXIMO EPISÓDIO.
// A espera do render (3-7 min) era tempo morto: a telemetria da #6 mostra a
// pessoa trocando de aba aos ~77s e VOLTANDO. Agora a espera produz o vídeo 2.
// O bloco E é o que importa mais: prova que a peça está LIGADA na tela — a
// lição do `sceneTruth`, que passou em 24 testes sendo biblioteca morta.
import { execSync } from 'node:child_process'
import { readFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = mkdtempSync(join(tmpdir(), 'kineo-r14-'))
execSync(
  `"${process.execPath}" "${join(raiz, 'node_modules/typescript/bin/tsc')}" ` +
  `"${join(raiz, 'lib/proximoEpisodioFila.ts')}" "${join(raiz, 'lib/seriesContinuation.ts')}" ` +
  `--outDir "${out}" --module commonjs --target es2022 --moduleResolution node --skipLibCheck`,
  { stdio: 'pipe' },
)
const F = await import(pathToFileURL(join(out, 'proximoEpisodioFila.js')).href)
const S = await import(pathToFileURL(join(out, 'seriesContinuation.js')).href)

let ok = 0, bad = 0
const checa = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nome}`) }
  else { bad++; console.log(`  ✗ ${nome} ${extra}`) }
}

const AGORA = 1_756_600_000_000 // epoch fixo — teste de relógio não pode depender do relógio

console.log('\n── A. a régua da semente é A MESMA do motor de série (senão a ideia muda de forma no meio do caminho)')
const AMOSTRAS = [
  'The Boiling River of the Amazon',
  '  espaços    colapsados  ',
  '"aspas retas" e “aspas curvas”',
  '',
  null,
  undefined,
  'x'.repeat(400),
  '\n\tquebras\tde\nlinha\n',
]
for (const a of AMOSTRAS) {
  const mine = F.normalizarIdeia(a)
  const theirs = S.normalizeSeriesSeed(a)
  checa(`normalizarIdeia ≡ normalizeSeriesSeed (${JSON.stringify(String(a).slice(0, 24))})`, mine === theirs, `${JSON.stringify(mine)} vs ${JSON.stringify(theirs)}`)
}
checa('teto de 180 é o mesmo dos dois lados', F.normalizarIdeia('y'.repeat(400)).length === 180)

console.log('\n── B. serializar: nunca grava fila fantasma')
checa('vazio → null', F.serializarIdeia('', AGORA) === null)
checa('só espaço → null', F.serializarIdeia('     ', AGORA) === null)
checa('só aspas → null', F.serializarIdeia('""', AGORA) === null)
checa('null → null', F.serializarIdeia(null, AGORA) === null)
checa('relógio inválido → null', F.serializarIdeia('tema', Number.NaN) === null)
const bruto = F.serializarIdeia('  The  Titanic   wreck ', AGORA, 'composing')
checa('tema válido → string', typeof bruto === 'string')
checa('grava o tema JÁ normalizado', JSON.parse(bruto).seed === 'The Titanic wreck', bruto)
checa('grava o estágio', JSON.parse(bruto).stage === 'composing')
const sujo = F.serializarIdeia('tema', AGORA, 'compo sing<script>;drop')
checa('estágio passa por whitelist [^a-zA-Z0-9_]', JSON.parse(sujo).stage === 'composingscriptdrop', sujo)
checa('sem estágio, o campo nem existe', !('stage' in JSON.parse(F.serializarIdeia('tema', AGORA))))
checa('NUNCA grava o prompt montado, só a semente', !bruto.includes('next episode'))

console.log('\n── C. ler: em toda dúvida devolve NADA (botão mentiroso no pico de alegria é pior que botão nenhum)')
checa('null → null', F.lerIdeiaSerializada(null, AGORA) === null)
checa('string vazia → null', F.lerIdeiaSerializada('', AGORA) === null)
checa('JSON quebrado → null', F.lerIdeiaSerializada('{nao é json', AGORA) === null)
checa('array → null', F.lerIdeiaSerializada('[1,2]', AGORA) === null)
checa('número → null', F.lerIdeiaSerializada('42', AGORA) === null)
checa('objeto sem seed → null', F.lerIdeiaSerializada(JSON.stringify({ savedAt: AGORA }), AGORA) === null)
checa('seed vazio → null', F.lerIdeiaSerializada(JSON.stringify({ seed: '   ', savedAt: AGORA }), AGORA) === null)
checa('sem savedAt → null', F.lerIdeiaSerializada(JSON.stringify({ seed: 'a' }), AGORA) === null)
checa('savedAt texto → null', F.lerIdeiaSerializada(JSON.stringify({ seed: 'a', savedAt: 'ontem' }), AGORA) === null)
checa('savedAt zero → null', F.lerIdeiaSerializada(JSON.stringify({ seed: 'a', savedAt: 0 }), AGORA) === null)
const lida = F.lerIdeiaSerializada(bruto, AGORA)
checa('ida e volta preserva o tema', lida && lida.seed === 'The Titanic wreck')
checa('ida e volta preserva o carimbo', lida && lida.savedAt === AGORA)

console.log('\n── D. o relógio: vence em 24h, tolera 5 min de adiantamento (lição do JWT-skew de 28/08)')
const em = (ms) => JSON.stringify({ seed: 'tema', savedAt: AGORA - ms })
checa('recém-salva vale', F.lerIdeiaSerializada(em(0), AGORA) !== null)
checa('23h59 ainda vale', F.lerIdeiaSerializada(em(23 * 3600e3 + 59 * 60e3), AGORA) !== null)
checa('24h em ponto ainda vale (limite inclusivo)', F.lerIdeiaSerializada(em(F.FILA_TTL_MS), AGORA) !== null)
checa('24h e 1ms venceu', F.lerIdeiaSerializada(em(F.FILA_TTL_MS + 1), AGORA) === null)
checa('3 dias venceu', F.lerIdeiaSerializada(em(3 * 24 * 3600e3), AGORA) === null)
checa('4 min no futuro é tolerado', F.lerIdeiaSerializada(em(-4 * 60e3), AGORA) !== null)
checa('6 min no futuro é recusado', F.lerIdeiaSerializada(em(-6 * 60e3), AGORA) === null)
checa('minutosNaFila conta inteiro', F.minutosNaFila({ seed: 'a', savedAt: AGORA - 185_000 }, AGORA) === 3)
checa('minutosNaFila nunca é negativo', F.minutosNaFila({ seed: 'a', savedAt: AGORA + 60_000 }, AGORA) === 0)

console.log('\n── E. está LIGADO na tela (a lição do sceneTruth: biblioteca viva ≠ produto vivo)')
const tela = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const semComentarios = tela
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
checa('a tela IMPORTA a fila', /from '@\/lib\/proximoEpisodioFila'/.test(semComentarios))
checa('importa salvar, ler e limpar', ['salvarIdeiaNaFila', 'lerIdeiaDaFila', 'limparFila'].every((f) => semComentarios.includes(f)))
checa('lê a fila ao montar a tela', /setIdeiaNaFila\(lerIdeiaDaFila\(\)\)/.test(semComentarios))
checa('o cartão da espera EXISTE', /function NextIdeaDuringWait\(/.test(semComentarios))
checa('o cartão da espera é RENDERIZADO', /<NextIdeaDuringWait/.test(semComentarios))
checa('o cartão fica no bloco da espera, colado na vitrine', /<WaitingShowcase \/>[\s\S]{0,900}<NextIdeaDuringWait/.test(tela))
checa('salvar está ligado no botão do cartão', /onSave=\{handleSalvarIdeiaDaEspera\}/.test(semComentarios))
checa('o botão do pico de alegria EXISTE', /handleUsarIdeiaDaFila\(ideiaNaFila\)/.test(semComentarios))
checa('o botão do pico de alegria só aparece com fila', /\{ideiaNaFila && \(/.test(semComentarios))
checa('usar a ideia LIMPA a fila (senão persegue a pessoa para sempre)', /function handleUsarIdeiaDaFila[\s\S]{0,1200}limparFila\(\)/.test(tela))
checa('usar a ideia escreve o prompt na tela', /function handleUsarIdeiaDaFila[\s\S]{0,1400}setPrompt\(seed\)/.test(tela))
checa('usar a ideia navega com rastro idea_source=wait_queue', /idea_source: 'wait_queue'/.test(semComentarios))
checa('a ideia vem ANTES do botão de série no rodapé', tela.indexOf('handleUsarIdeiaDaFila(ideiaNaFila)') < tela.indexOf("handleContinueSeries(analysis?.title ?? prompt, 'done_footer'"))

console.log('\n── F. telemetria: os três momentos existem e são nomeados')
for (const ev of ['next_idea_queued', 'next_idea_started', 'next_idea_cleared']) {
  checa(`emite ${ev}`, new RegExp(`trackEvent\\('${ev}'`).test(semComentarios))
}
checa('o evento de uso carrega quanto tempo a ideia esperou', /next_idea_started'[\s\S]{0,300}waited_s/.test(semComentarios))

console.log('\n── G. fronteira com o Codex: a fila não conhece dinheiro')
const libCodigo = readFileSync(join(raiz, 'lib/proximoEpisodioFila.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/**')).join('\n')
for (const proibida of ['stripe', 'checkout', 'price', 'credit', 'upgrade', 'plan', 'coupon', 'trial']) {
  checa(`a lib não menciona "${proibida}"`, !new RegExp(proibida, 'i').test(libCodigo))
}
checa('a lib não tem NENHUM import (é pura, testável isolada)', !/^\s*import\s/m.test(libCodigo))
checa('a lib não chama fetch/rede', !/fetch\(/.test(libCodigo))

console.log('\n── H. a espera NÃO dispara render nenhum (com render em voo o servidor recusaria — botão que recusa é mentira)')
const inicioCartao = tela.indexOf('function NextIdeaDuringWait(')
// ⚠ o marcador de fim aparece DUAS vezes no arquivo (um comentário antigo
// referencia o mesmo push) — buscar a partir do início, senão a fatia nasce vazia
// e o bloco H aprova por acidente, que é o pior tipo de teste verde.
const cartao = tela.slice(inicioCartao, tela.indexOf('// ─── Push #087', inicioCartao))
checa('o cartão existe e foi isolado', cartao.length > 400)
for (const proibida of ['handleGenerate', 'fetch(', 'router.push', 'trackEvent']) {
  checa(`o cartão não chama ${proibida}`, !cartao.includes(proibida))
}
checa('o cartão promete espera, não geração', /it&apos;ll be waiting/.test(cartao))
checa('a promessa "nada começa sem você" está escrita', /Nothing\s+starts until you say so/.test(cartao))
checa('o campo tem teto de 180 (mesmo da semente)', /maxLength=\{180\}/.test(cartao))
checa('o × de remover tem alvo de toque ≥40px', /minWidth: 40,\s*\n\s*minHeight: 40,/.test(cartao))
checa('o input tem altura de toque ≥40px', /minHeight: 40,/.test(cartao))
checa('nenhum beforeunload (o popup que faz fechar aba)', !cartao.includes('beforeunload'))
checa('o cartão não fala em preço/plano/crédito', !/(stripe|checkout|price|credit|upgrade|plan)/i.test(cartao.replace(/\/\*[\s\S]*?\*\//g, '')))

console.log(`\n${bad === 0 ? '✅' : '❌'} ${ok} ok · ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
