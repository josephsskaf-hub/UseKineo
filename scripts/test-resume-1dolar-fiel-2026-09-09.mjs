// KINEO-RESUME-1DOLAR-FIEL-2026-09-09 — GUARDIÃO DO PRIMEIRO MINUTO PAGO.
//
// O QUE ELE PROTEGE. Na Versão B não existe filme grátis: a pessoa escreve a
// ideia, escolhe o MOTOR e a duração, aperta Generate, bate na cota zero, vê a
// porta de $1, paga, e volta para `/studio/create?resume=card_entry`, onde o
// filme deve disparar sozinho com 80 créditos. Esse é o único caminho pago da
// casa hoje, e na r4 de 09/09 ele foi lido linha a linha porque NINGUÉM ainda
// passou por ele (0 pagamentos desde 02/09 20:22 UTC) — a primeira pessoa a
// pagar seria a cobaia.
//
// TRÊS DEFEITOS ACHADOS NA LEITURA, os três silenciosos:
//
//  (1) O rascunho que atravessa o Stripe guardava `prompt`, `quality` e
//      `duration` — e NÃO `mode` nem `aiEngine`, que são as duas variáveis que
//      de fato escolhem o motor (`selectedCost` deriva o preço delas). Na volta,
//      `mode` renascia no padrão de fábrica `'fast'`. Quem escolheu um motor
//      cinematográfico, pagou por ele e voltou, recebia um Kineo 1 — sem aviso e
//      sem erro na tela. Medido na coorte da Versão B: de 9 pessoas que
//      despacharam, 7 estavam em `fast` e 2 em `cinematic` — ou seja, a troca
//      silenciosa atingiria ~1 em cada 5 compradores.
//
//  (2) A validação do `quality` restaurado era feita contra `QUALITY_OPTIONS`,
//      lista LEGADA de três entradas (`basic`/`basic_ai`/`pro`). Os dois valores
//      que o produto usa hoje — `'fast'` e `'cinematic_ai'` — não estão nela,
//      então o `quality` do rascunho era recusado em 100% dos casos vivos.
//
//  (3) E o disparo usava `credits > 0` enquanto o gerador exige
//      `credits >= selectedCost`. Duas réguas. Com 80 créditos e um motor de
//      150, o evento `card_entry_resume_autostart` afirmaria que o filme
//      começou, o rascunho seria APAGADO, e a pessoa levaria um modal de "sem
//      créditos" logo depois de pagar — sem o próprio texto para tentar de novo.
//
// As verificações amarram cada afirmação à VARIÁVEL/FUNÇÃO que decide, nunca à
// presença de uma string: um mutante que troque `outOfCredits()` por `false`
// mantém todo o texto do arquivo (memória `guardiao-contar-texto-nao-prova-condicao`).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const MODULO = 'lib/growth/cardEntryResumeDraft.ts'
const GENERATE = 'app/(dashboard)/generate/GenerateClient.tsx'
const SUCCESS = 'app/checkout/success/page.tsx'

const generateSrc = read(GENERATE)
const successSrc = read(SUCCESS)

// Sem comentários: um comentário que cite `setMode` não pode aprovar nada.
const semComentarios = (src) =>
  src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
const generateBody = semComentarios(generateSrc)
const successBody = semComentarios(successSrc)

let checks = 0
const check = (label, fn) => {
  fn()
  checks++
  console.log('OK ' + label)
}

// ── carrega o módulo REAL (sem alias @/ pendurado no node) ───────────────────
function loadModule(rel) {
  const box = { exports: {} }
  const js = ts.transpileModule(read(rel), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(js, { module: box, exports: box.exports, console }, { filename: rel })
  return box.exports
}
const M = loadModule(MODULO)

const AGORA = 1757000000000
const gravar = (over = {}) =>
  M.serializeCardEntryDraft({
    prompt: 'the battle of los angeles 1942',
    quality: 'cinematic_ai',
    duration: 60,
    mode: 'cinematic_ai',
    engine: 's25',
    at: AGORA,
    ...over,
  })

// ═══ 1. O RASCUNHO CARREGA O MOTOR (o defeito 1) ═════════════════════════════

check('(1) a ida-e-volta preserva o `mode` escolhido', () => {
  const d = M.readCardEntryDraft(gravar(), AGORA)
  assert.equal(d.mode, 'cinematic_ai', 'o modo escolhido nao sobreviveu ao Stripe')
})

check('(2) a ida-e-volta preserva o `aiEngine` escolhido', () => {
  const d = M.readCardEntryDraft(gravar(), AGORA)
  assert.equal(d.engine, 's25', 'o motor escolhido nao sobreviveu ao Stripe')
})

check('(3) os 8 motores atravessam, nenhum vira null', () => {
  for (const engine of ['seedance', 'kling', 'veo', 'sora', 'hollywood', 'h3', 'omni', 's25']) {
    const d = M.readCardEntryDraft(gravar({ engine }), AGORA)
    assert.equal(d.engine, engine, 'motor perdido: ' + engine)
  }
})

check('(4) os 4 modos atravessam, nenhum vira null', () => {
  for (const mode of ['fast', 'cinematic_ai', 'cinematic', 'creator']) {
    const d = M.readCardEntryDraft(gravar({ mode }), AGORA)
    assert.equal(d.mode, mode, 'modo perdido: ' + mode)
  }
})

// ═══ 2. A VALIDAÇÃO DO `quality` FALA DA UNIÃO VIVA (o defeito 2) ════════════

check('(5) `cinematic_ai` e `fast` — os dois valores VIVOS — sobrevivem', () => {
  for (const quality of ['fast', 'cinematic_ai']) {
    const d = M.readCardEntryDraft(gravar({ quality }), AGORA)
    assert.equal(d.quality, quality, 'quality viva recusada: ' + quality + ' (o defeito da lista legada)')
  }
})

check('(6) os 3 valores legados continuam aceitos', () => {
  for (const quality of ['basic', 'basic_ai', 'pro']) {
    assert.equal(M.readCardEntryDraft(gravar({ quality }), AGORA).quality, quality)
  }
})

check('(7) valor inventado em quality/mode/engine vira null, nunca um chute', () => {
  const d = M.readCardEntryDraft(gravar({ quality: 'ultra', mode: 'turbo', engine: 'gpt' }), AGORA)
  assert.equal(d.quality, null)
  assert.equal(d.mode, null)
  assert.equal(d.engine, null)
})

// ═══ 3. COMPATIBILIDADE: RASCUNHO DO BUNDLE QUE ESTÁ NO AR ═══════════════════

check('(8) a chave continua `_v1` — quem esta DENTRO do Stripe agora nao e orfanado', () => {
  assert.equal(M.CARD_ENTRY_DRAFT_KEY, 'kineo_studio_draft_v1')
})

check('(9) rascunho velho (sem mode/engine) le sem lancar e preserva o texto', () => {
  const velho = JSON.stringify({ prompt: '  pompeia  ', quality: 'cinematic_ai', duration: 35, at: AGORA })
  const d = M.readCardEntryDraft(velho, AGORA)
  assert.equal(d.prompt, 'pompeia')
  assert.equal(d.mode, null, 'rascunho velho nao pode INVENTAR um modo')
  assert.equal(d.engine, null)
})

check('(10) JSON quebrado / chave ausente / prompt vazio devolvem null sem lancar', () => {
  assert.equal(M.readCardEntryDraft('{nao e json', AGORA), null)
  assert.equal(M.readCardEntryDraft(null, AGORA), null)
  assert.equal(M.readCardEntryDraft(JSON.stringify({ prompt: '   ', at: AGORA }), AGORA), null)
})

// ═══ 4. FRESCOR ══════════════════════════════════════════════════════════════

check('(11) dentro do TTL o rascunho arma; fora dele, nao', () => {
  assert.equal(M.readCardEntryDraft(gravar(), AGORA + 60000).fresh, true)
  assert.equal(M.readCardEntryDraft(gravar(), AGORA + M.CARD_ENTRY_DRAFT_TTL_MS + 1).fresh, false)
})

check('(12) duracao fora da grade e recusada', () => {
  assert.equal(M.readCardEntryDraft(gravar({ duration: 45 }), AGORA).duration, 45)
  assert.equal(M.readCardEntryDraft(gravar({ duration: 33 }), AGORA).duration, null)
})

// ═══ 5. A FIAÇÃO NO GenerateClient ═══════════════════════════════════════════
// Recorta os DOIS efeitos pelo nome da funcao que cada um chama, e afirma sobre
// o recorte — nao sobre o arquivo inteiro, que tem 21 mil linhas e cita quase
// tudo em algum comentario.

const gravacao = generateBody.slice(
  generateBody.indexOf('serializeCardEntryDraft({'),
  generateBody.indexOf('const resumeArmedRef'),
)
assert.ok(gravacao.length > 40 && gravacao.length < 800, 'nao recortei o efeito de GRAVACAO')

check('(13) o efeito de gravacao escreve o `mode` e o `aiEngine` no rascunho', () => {
  assert.match(gravacao, /\bmode\b/, 'a gravacao nao passa o mode')
  assert.match(gravacao, /engine:\s*aiEngine/, 'a gravacao nao passa o aiEngine')
})

check('(14) a gravacao REAGE a troca de motor (mode e aiEngine nas dependencias)', () => {
  const deps = gravacao.slice(gravacao.lastIndexOf('}, ['))
  assert.match(deps, /\bmode\b/, 'trocar de modo nao regrava o rascunho')
  assert.match(deps, /\baiEngine\b/, 'trocar de motor nao regrava o rascunho')
})

const iRestore = generateBody.indexOf('readCardEntryDraft(')
const restauracao = generateBody.slice(iRestore, generateBody.indexOf('useEffect', iRestore + 10))
assert.ok(restauracao.length > 200 && restauracao.length < 2500, 'nao recortei o efeito de RESTAURACAO')

check('(15) a restauracao devolve o motor a tela (setMode + setAiEngine)', () => {
  assert.match(restauracao, /setMode\(\s*draft\.mode\s*\)/, 'o modo do rascunho nunca chega a tela')
  assert.match(restauracao, /setAiEngine\(\s*draft\.engine\s*\)/, 'o motor do rascunho nunca chega a tela')
})

check('(16) a restauracao so escreve o que EXISTE no rascunho (nulo nao vira chute)', () => {
  assert.match(restauracao, /if\s*\(\s*draft\.mode\s*\)\s*setMode/, 'setMode sem guarda de nulo')
  assert.match(restauracao, /if\s*\(\s*draft\.engine\s*\)\s*setAiEngine/, 'setAiEngine sem guarda de nulo')
})

// ═══ 6. O DISPARO PERGUNTA AO MESMO CAIXA (o defeito 3) ══════════════════════

const iAuto = generateBody.indexOf('card_entry_resume_autostart')
const disparo = generateBody.slice(
  generateBody.lastIndexOf('useEffect', iAuto),
  generateBody.indexOf('}, [credits, prompt', iAuto),
)
assert.ok(disparo.length > 200 && disparo.length < 2500, 'nao recortei o efeito de DISPARO')

check('(17) o disparo consulta `outOfCredits()` — a funcao que o botao consulta', () => {
  assert.match(disparo, /if\s*\(\s*outOfCredits\(\)\s*\)/, 'o disparo nao pergunta ao caixa')
})

check('(18) a regua paralela `credits <= 0` NAO governa mais o disparo', () => {
  assert.doesNotMatch(disparo, /credits\s*<=\s*0/, 'voltou a segunda regua de saldo')
})

check('(19) o caixa e consultado ANTES de armar e de apagar o rascunho', () => {
  const iGuarda = disparo.indexOf('outOfCredits()')
  const iArma = disparo.indexOf('resumeFiredRef.current = true')
  const iApaga = disparo.indexOf('removeItem')
  assert.ok(iGuarda > -1 && iArma > -1 && iApaga > -1, 'faltou um dos tres marcos')
  assert.ok(iGuarda < iArma, 'arma o disparo antes de saber se cabe')
  assert.ok(iGuarda < iApaga, 'apaga o rascunho antes de saber se cabe')
})

check('(20) bloqueado por saldo, o rascunho FICA e o evento nao mente', () => {
  const bloqueio = disparo.slice(
    disparo.indexOf('outOfCredits()'),
    disparo.indexOf('resumeFiredRef.current = true'),
  )
  assert.doesNotMatch(bloqueio, /removeItem/, 'o ramo bloqueado apaga o texto de quem acabou de pagar')
  assert.doesNotMatch(bloqueio, /card_entry_resume_autostart/, 'o ramo bloqueado afirma que o filme comecou')
  assert.match(bloqueio, /card_entry_resume_blocked/, 'o bloqueio nao deixa rastro medivel')
})

check('(21) o evento de disparo diz COM QUE MOTOR o filme comecou', () => {
  const evento = disparo.slice(disparo.indexOf('card_entry_resume_autostart'))
  assert.match(evento, /\bmode\b/, 'sem o modo no evento nao ha como separar quem voltou certo')
  assert.match(evento, /engine:\s*aiEngine/, 'sem o motor no evento a leitura futura nao tem denominador')
})

// ═══ 7. UMA CHAVE SÓ NA CASA ════════════════════════════════════════════════

check('(22) o /checkout/success le a chave do modulo, nao um literal proprio', () => {
  assert.match(successBody, /getItem\(\s*CARD_ENTRY_DRAFT_KEY\s*\)/, 'a tela do sucesso redigita a chave')
})

check('(23) o literal da chave nao sobrevive em nenhuma das duas telas', () => {
  for (const rel of [GENERATE, SUCCESS]) {
    assert.doesNotMatch(semComentarios(read(rel)), /'kineo_studio_draft_v1'/, 'literal duplicado em ' + rel)
  }
})

console.log('\n' + checks + ' verificacoes OK — o primeiro minuto pago entrega o filme que a pessoa comprou.')
