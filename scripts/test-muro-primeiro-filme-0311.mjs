// KINEO-MURO-PRIMEIRO-FILME-0311 [TRAVA 8.2 — "vai" do fundador 03/11: "vamos melhorar esse muro de entrada"] — guardião. Prova:
//   (A) consertoAutomaticoDoPrimeiroFilme escolhe o botão que NÃO sobe o preço, com as frases REAIS de 7 d até 03/11:
//       "asks for 60, selected 15" sem saldo → reescreve o número (match_text_duration); "video request" → modo IA;
//       "AI declined" → ângulo seguro; "high demand" → nada (já tem relógio); duração mais cara → pula para a alternativa;
//   (B) o GenerateClient só aperta sozinho com filmsDelivered === 0, no máximo 2 por carga e 1 por frase, registra
//       refusal_auto_fixed e usa o MESMO aplicarConsertoDaRecusa do botão;
//   (C) sem oferta paga antes do 1º filme: o 2.5 trancado e o aviso do Kling 4 somem no Generate e no Studio só para conta
//       sem filme (e, no aviso, sem pagar); a página de preços não muda;
//   (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-muro-primeiro-filme-0311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = {
  lib: 'lib/recusaBotao.ts',
  diretrizes: 'lib/pastedDirectives.ts',
  client: 'app/(dashboard)/generate/GenerateClient.tsx',
  studio: 'app/(dashboard)/studio/StudioClient.tsx',
  pricing: 'components/Kling4PaidNotice.tsx',
}
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function load(over = {}) {
  const cache = {}
  const compile = (rel) => {
    if (cache[rel]) return cache[rel].exports
    const js = ts.transpileModule(over[rel] ?? read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache[rel] = mod
    const req = (spec) => { if (spec === './pastedDirectives') return compile(F.diretrizes); throw new Error(rel + ': import inesperado ' + spec) }
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return compile(F.lib)
}

// As frases de produção (events.metadata->>'error', contas sem filme, 7 d até 03/11).
const FRASES = {
  mismatch: 'Your request asks for 60 seconds, but the selected duration is 15 seconds. Review the duration or change the request to match the shorter film before continuing. Nothing was charged.',
  pedido: 'This looks like a video request, not a finished narration. To keep your words, paste only the narration; to develop the idea, choose the AI structuring mode. Review before continuing. Nothing was charged.',
  recusou: 'The writer could not turn this idea into a script (the AI declined the topic). Nothing was charged — try rewording the idea, or paste your own script with "Use my script as is".',
  demanda: "We're experiencing high demand right now. Nothing started and your credits were refunded automatically.",
}
const TEXTO_60 = 'Make a 60 seconds video about the rings of Saturn disappearing in 2025, cinematic, dramatic music.'
const custo = (s) => ({ 15: 9, 35: 21, 60: 35 })[s] ?? 99

function checa(over = {}) {
  const erros = []
  const req = (c, m) => { if (!c) erros.push(m) }
  let L
  try { L = load(over) } catch (e) { return ['lib não compila: ' + e.message] }
  const ctx = (o = {}) => ({ options: [15, 35, 60], costFor: custo, credits: 10, duration: 15, scriptMode: 'verbatim', rawRoad: false, text: TEXTO_60, ...o })
  const auto = (frase, o = {}) => {
    const c = ctx(o)
    return L.consertoAutomaticoDoPrimeiroFilme(L.resolverBotoesDaRecusa(L.fixDaRecusa({ error: frase }), c), custo(c.duration))
  }
  // (A)
  req(typeof L.consertoAutomaticoDoPrimeiroFilme === 'function' && L.MURO_PRIMEIRO_FILME_VERSION === 'muro_primeiro_filme_0311_v1', 'A função e a versão existem')
  const m = auto(FRASES.mismatch, { scriptMode: 'ai' })
  req(m && m.code === 'match_text_duration' && m.seconds === 15 && m.askedSeconds === 60, 'A "pediu 60, escolheu 15" sem saldo → reescreve o número no texto (mantém o preço do 15 s)')
  const mRico = auto(FRASES.mismatch, { scriptMode: 'ai', credits: 500 })
  req(mRico && mRico.code === 'match_text_duration', 'A com saldo para o 60 s, o automático NÃO sobe o preço sozinho (fica no 15 s)')
  const p = auto(FRASES.pedido)
  req(p && p.code === 'ai_structure', 'A "video request" em modo verbatim → modo IA com o mesmo texto')
  req(auto(FRASES.pedido, { scriptMode: 'ai' }) === null, 'A "video request" já em modo IA → nada (repetiria a recusa)')
  const r = auto(FRASES.recusou)
  req(r && r.code === 'safer_angle', 'A "AI declined" → ângulo seguro')
  req(auto(FRASES.demanda) === null, 'A "high demand" → nada (o retry já tem relógio)')
  const barato = L.consertoAutomaticoDoPrimeiroFilme({ primary: { fix: { code: 'switch_duration', reason: 'x', seconds: 15 }, label: '', cost: 9 }, secondary: null }, 21)
  req(barato && barato.code === 'switch_duration', 'A trocar para duração MAIS BARATA ou igual entra')
  const caro = L.consertoAutomaticoDoPrimeiroFilme({ primary: { fix: { code: 'switch_duration', reason: 'x', seconds: 60 }, label: '', cost: 35 }, secondary: null }, 9)
  req(caro === null, 'A trocar para duração MAIS CARA nunca entra sozinha')
  req(L.consertoAutomaticoDoPrimeiroFilme(null, 9) === null, 'A sem botões → nada')

  // (B)
  const cli = over[F.client] ?? read(F.client)
  req(/const consertoAuto = filmsDelivered === 0 && recusaBotoes \? consertoAutomaticoDoPrimeiroFilme\(recusaBotoes, costForDurationOption\(duration\)\) : null/.test(cli), 'B só conta com filmsDelivered === 0, com o custo da duração atual')
  const efeito = cli.slice(cli.indexOf('useEffect(() => { // KINEO-MURO-PRIMEIRO-FILME-0311'), cli.indexOf('}, [consertoAuto?.code, consertoAuto?.reason, error, phase])'))
  req(efeito.length > 50 && /feitos >= 2/.test(efeito) && /chaves\.has\(chave\)/.test(efeito), 'B no máximo 2 por carga e 1 por frase')
  req(/isProcessingPhase\(phase\)\) return/.test(efeito), 'B nunca dispara com render em curso')
  req(/refusal_auto_fixed/.test(efeito) && /aplicarConsertoDaRecusa\(consertoAuto\)/.test(efeito), 'B registra refusal_auto_fixed e usa o MESMO conserto do botão')
  req(/const consertoAutoRef = useRef<\{ feitos: number; chaves: Set<string> \}>/.test(cli), 'B o contador vive num ref (sobrevive a re-render, zera por carga)')

  // (C)
  req(/s25Ok=\{s25Ok && !\(s25Liberado !== true && filmsDelivered === 0\)\}/.test(cli), 'C Generate: o 2.5 trancado some só para conta sem filme')
  req(/primeiroFilme=\{filmsDelivered === 0 && !hasPaid\}/.test(cli) && /\{!primeiroFilme && <Kling4PaidNotice surface="generate"/.test(cli), 'C Generate: aviso do Kling 4 some só para conta sem filme e sem pagar')
  const st = over[F.studio] ?? read(F.studio)
  req(/const s25SomeNoPrimeiroFilme = firstFilmHistoryEmpty && s25Liberado !== true/.test(st) && /\(e\.key !== 's25' \|\| \(internal && !s25SomeNoPrimeiroFilme\)\)/.test(st), 'C Studio: o card trancado do 2.5 some do seletor para conta sem filme')
  req(/s25SomeNoPrimeiroFilme \/\* KINEO-MURO-PRIMEIRO-FILME-0311 \*\/ \|\| s25SeloVistoRef\.current/.test(st), 'C Studio: a impressão do selo não conta quem não viu o selo')
  req(/const semOfertaAntesDoFilme = \(firstFilmHistoryEmpty \|\| !historicoLido\) && contaPaga !== true/.test(st) && /\{!semOfertaAntesDoFilme && <Kling4PaidNotice surface="studio"/.test(st), 'C Studio: aviso do Kling 4 some só para conta sem filme e sem pagar')
  req(!/primeiroFilme|semOfertaAntesDoFilme/.test(over[F.pricing] ?? read(F.pricing)), 'C o componente do aviso não muda (preços/anúncios seguem mostrando)')
  return erros
}

const base = checa()
ok(base.length === 0, `todas as provas verdes (${base.length} erro(s))${base.length ? ': ' + base.join(' · ') : ''}`)

const lib = read(F.lib)
const cli = read(F.client)
const st = read(F.studio)
const MUTANTES = [
  ['automático sobe o preço', { [F.lib]: lib.replace("if (b.fix.code === 'switch_duration' && !(", "if (false && !(") }],
  ['retry_later entra no automático', { [F.lib]: lib.replace("if (!b || b.fix.code === 'retry_later') continue", 'if (!b) continue') }],
  ['dispara para quem já tem filme', { [F.client]: cli.replace('const consertoAuto = filmsDelivered === 0 && recusaBotoes', 'const consertoAuto = recusaBotoes') }],
  ['sem teto por carga', { [F.client]: cli.replace('consertoAutoRef.current.feitos >= 2 || ', '') }],
  ['2.5 some para todo mundo', { [F.client]: cli.replace('s25Ok={s25Ok && !(s25Liberado !== true && filmsDelivered === 0)}', 's25Ok={false}') }],
  ['aviso do Kling 4 volta no Studio', { [F.studio]: st.replace('{!semOfertaAntesDoFilme && <Kling4PaidNotice surface="studio" availability={kling4Availability} />}', '<Kling4PaidNotice surface="studio" availability={kling4Availability} />') }],
]
for (const [nome, over] of MUTANTES) {
  const changed = Object.entries(over).every(([k, v]) => v !== read(k))
  const e = changed ? checa(over) : ['(mutante não aplicou)']
  ok(changed && e.length > 0, `mutante "${nome}" fica vermelho (${changed ? e.length + ' erro(s)' : 'NÃO APLICOU'})`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
