// KINEO-ADS-SIMPLES-ACABAMENTO-2026-09-29 — guardião dos TRÊS ACABAMENTOS do modo simples do /ads/v2, medidos em produção
// em 29/09 (~09:40 UTC) com a frase do fundador "Espaço comercial à venda ou para alugar no Edifício Villa Versace, em
// Moema, São Paulo" (pedido 1ddfcf25). Roda com `node scripts/test-ads-simples-acabamento-2026-09-29.mjs`, sem rede e sem
// banco. Todo item importante tem MUTANTE: a mesma verificação roda contra o código alterado e TEM de ficar vermelha.
//
//   N. NARRAÇÃO — o brief de produção era "Espaço comercial — à venda ou para alugar"; o pedido mandava "Say the business
//      name once" e a narração saiu "Conheça o Espaço comercial, à venda ou para alugar. Venha conferir as oportunidades
//      em Moema!" (sem o edifício, sem a cidade, "Espaço" com maiúscula no meio da frase). As partes determinísticas
//      (nomes da frase, substantivo comum, pós-processo de maiúscula, pedido, régua, título curto) são EXECUTADAS nas 4
//      frases do pedido; extractAdsV2Brief e a rota /plan rodam de verdade com uma OpenAI falsa.
//   F. FRASES NA TELA — o padrão (ligadas) e o texto da opção em pt; desligadas = plano sem frase e montagem REAL
//      (buildAdV2Source) sem nenhum elemento de texto.
//   H. ABA OCULTA — lib/ads/v2VideoFrames.ts EXECUTADA num DOM falso com relógio falso: aba oculta não conta o
//      tempo-limite, a leitura espera a aba voltar (até o teto) e o erro 'decode' só existe com a aba visível.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
let ok = 0
const falhas = []
const check = async (nome, condicao) => {
  let v = false
  try { v = typeof condicao === 'function' ? !!(await condicao()) : !!(await condicao) } catch (e) { falhas.push(`${nome} (lançou: ${e.message})`); return }
  if (v) ok++; else falhas.push(nome)
}
/** Troca exata; `n` = quantas vezes a âncora TEM de aparecer (senão o mutante não prova nada). */
const trocar = (src, de, para, n = 1) => {
  if (src.split(de).length !== n + 1) throw new Error(`mutante sem âncora (${n}x): ${de.slice(0, 70)}`)
  return src.split(de).join(para)
}
/** Corpo de função: do primeiro '{' de fim de linha depois do marcador até a chave que fecha. */
const bloco = (src, marcador) => {
  const i = src.indexOf(marcador)
  if (i < 0) return ''
  const a = src.indexOf('{\n', i)
  if (a < 0) return ''
  let n = 0
  for (let j = a; j < src.length; j++) {
    if (src[j] === '{') n++
    else if (src[j] === '}') { n--; if (n === 0) return src.slice(a, j + 1) }
  }
  return ''
}

// ── carregador: transpila TS → CJS e resolve '@/' e './'; `over` troca a fonte (mutantes) ─────────────────────────────
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const real = new Set(opts.real ?? [])
  const over = opts.over ?? {}
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const src = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && (real.has(target) || real.has('*'))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
const pura = (rel, src) => makeLoader({}, { over: src === undefined ? {} : { [rel]: src } })(rel)

const F = {
  simpleLib: 'lib/ads/v2Simple.ts',
  brief: 'lib/ads/v2Brief.ts',
  frames: 'lib/ads/v2VideoFrames.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  planRoute: 'app/api/ads/v2/plan/route.ts',
  montage: 'lib/ads/adV2Montage.ts',
  advance: 'lib/ads/v2Advance.ts',
  contract: 'lib/ads/v2Contract.ts',
}
for (const p of Object.values(F)) await check(`arquivo existe: ${p}`, existsSync(join(RAIZ, p)))
const SRC = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))
const S = pura(F.simpleLib)
const simpleCom = (src) => pura(F.simpleLib, src)
/** v2Brief com as libs REAIS (v2Simple, autoBrief, scriptPrompt…) e a OpenAI trocada por `openai`. */
const briefLoader = (openai = {}, over = {}) => makeLoader({ '@/lib/openai': { openai } }, { real: ['*'], over })(F.brief)
const BR = briefLoader()

// ═══ N. NARRAÇÃO: OS NOMES QUE A PESSOA ESCREVEU, SEM MAIÚSCULA NO MEIO DA FRASE ══════════════════════════════════════
// As 4 frases do pedido. A 1ª traz o brief e a narração REAIS de produção (ads_v2_orders 1ddfcf25, 29/09 08:46 UTC); nas
// outras o brief é o que o buildAutoBriefMessages pede ("<nome> — <o que vende>") quando a frase não tem nome de negócio.
const brief = (business, address, language) => ({ business, offer: '', cta: 'visit', contact: '', language, tone: 'warm', audience: '', extra: address ? { address } : {} })
const FRASES = [
  { sentence: 'Espaço comercial à venda ou para alugar no Edifício Villa Versace, em Moema, São Paulo', lang: 'pt', languageName: 'Brazilian Portuguese (pt-BR)',
    brief: brief('Espaço comercial — à venda ou para alugar', 'Edifício Villa Versace, em Moema, São Paulo', 'pt'),
    names: ['Edifício Villa Versace', 'Moema', 'São Paulo'], common: 'espaço comercial', title: 'Espaço comercial à venda ou para alugar',
    producao: 'Conheça o Espaço comercial, à venda ou para alugar. Venha conferir as oportunidades em Moema!',
    boa: 'Conheça o Espaço comercial à venda ou para alugar no Edifício Villa Versace, em Moema, São Paulo. Agende a sua visita.',
    boaDepois: 'Conheça o espaço comercial à venda ou para alugar no Edifício Villa Versace, em Moema, São Paulo. Agende a sua visita.' },
  { sentence: 'Casa com 3 quartos para alugar na Rua das Flores, bairro Jardim', lang: 'pt', languageName: 'Brazilian Portuguese (pt-BR)',
    brief: brief('Casa — 3 quartos para alugar', 'Rua das Flores, bairro Jardim', 'pt'),
    names: ['Rua das Flores', 'Jardim'], common: 'casa', title: 'Casa com 3 quartos para alugar',
    producao: 'Conheça a Casa com 3 quartos para alugar. Venha conferir essa oportunidade única e agende a sua visita hoje!',
    boa: 'Alugue esta Casa com 3 quartos na Rua das Flores, no bairro Jardim. Espaço para toda a família morar bem.',
    boaDepois: 'Alugue esta casa com 3 quartos na Rua das Flores, no bairro Jardim. Espaço para toda a família morar bem.' },
  { sentence: 'Corner bakery for sale in downtown Austin', lang: 'en', languageName: 'English',
    brief: brief('Corner bakery — for sale', 'downtown Austin', 'en'),
    names: ['Austin'], common: 'corner bakery', title: 'Corner bakery for sale in downtown',
    producao: 'Discover the Corner bakery, now for sale. Come and check out this great opportunity and book your visit today!',
    boa: 'Own the Corner bakery for sale in downtown Austin, ready for its next owner and the morning crowd.',
    boaDepois: 'Own the corner bakery for sale in downtown Austin, ready for its next owner and the morning crowd.' },
  { sentence: 'Local comercial en alquiler en el centro de Valencia', lang: 'es', languageName: 'Spanish',
    brief: brief('Local comercial — en alquiler', 'centro de Valencia', 'es'),
    names: ['Valencia'], common: 'local comercial', title: 'Local comercial en alquiler',
    producao: 'Descubre el Local comercial en alquiler. ¡Ven a conocer esta gran oportunidad y agenda tu visita hoy mismo!',
    boa: 'Alquila este Local comercial en el centro de Valencia, listo para abrir tu negocio donde pasa la gente.',
    boaDepois: 'Alquila este local comercial en el centro de Valencia, listo para abrir tu negocio donde pasa la gente.' },
]
const nomesCertos = (M) => FRASES.every((f) => JSON.stringify(M.simpleNames(f.sentence)) === JSON.stringify(f.names))
await check('N1 simpleNames EXECUTADA nas 4 frases: [Edifício Villa Versace, Moema, São Paulo] · [Rua das Flores, Jardim] · [Austin] · [Valencia]', nomesCertos(S))
const nomesBordas = (M) =>
  JSON.stringify(M.simpleNames('Casa À Venda No Bairro Jardim')) === '[]' && // "Título Assim": maiúscula não prova nome
  JSON.stringify(M.simpleNames('LOJA À VENDA NO CENTRO')) === '[]' &&
  JSON.stringify(M.simpleNames('Nike store in Austin. Open Monday to Friday, call on WhatsApp')) === '["Austin"]' && // dia, canal e começo de frase fora
  JSON.stringify(M.simpleNames('Loja no Shopping Iguatemi, Av. Paulista 1000, São Paulo')) === '["Shopping Iguatemi","Av. Paulista","São Paulo"]' && // "Av." não termina a frase
  JSON.stringify(M.simpleNames('Vendo espaço comercial na Rua 25 de Março')) === '["Rua 25 de Março"]' && // número dentro do nome
  JSON.stringify(M.simpleNames('Apartamento Vila Mariana 2 quartos')) === '["Vila Mariana"]' && // "Apartamento" diz o que é
  JSON.stringify(M.simpleNames('Loja à venda no Edifício Aurora, bairro Jardim, São Paulo')) === '["Edifício Aurora","Jardim","São Paulo"]' &&
  JSON.stringify(M.simpleNames('Vendo loja no Centro')) === '["Centro"]' && // "Vendo" é só o começo da frase
  JSON.stringify(M.simpleNames('Casa no Jardim América, SP')) === '["Jardim América"]' && // sigla solta não é exigida
  M.simpleNames('Um, Dois, Três, Quatro, Cinco e Seis').length <= 3 && JSON.stringify(M.simpleNames('')) === '[]'
await check('N2 simpleNames nas bordas: Título Assim/CAIXA ALTA = nenhum nome; dia, canal, "I" e começo de frase fora; "Av." e "Rua 25 de Março" inteiros; no máximo 3', nomesBordas(S))
// As 4 frases começam com palavra que diz "o que é" (também aparada por WHAT_IT_IS): o mutante é pego pelas bordas
// ("Vendo", "Nike", "Open" — começo de frase sem cara de tipo de imóvel/negócio).
await check('N1-mutante: palavra solta do começo da frase contando como nome ("Vendo", "Nike") fica vermelho', () => !((M) => nomesCertos(M) && nomesBordas(M))(simpleCom(trocar(SRC.simpleLib, '      if (atStart && caps === 1) continue\n', ''))))
await check('N2-mutante: sem a trava de "Título Assim" fica vermelho', () => !nomesBordas(simpleCom(trocar(SRC.simpleLib, '      if (FUNCTION_WORDS.has(w.toLowerCase()) && isCap(w)) return []', '      if (false) return []'))))

const comumCerto = (M) => FRASES.every((f) => M.simpleCommonNoun(f.brief.business.split(' — ')[0], f.sentence, f.lang) === f.common) &&
  M.simpleCommonNoun('Casa Bonita', 'Casa Bonita restaurante mexicano em Pinheiros', 'pt') === null && // nome de verdade
  M.simpleCommonNoun('Nike', 'Nike store in Austin', 'en') === null && // palavra só no começo, sem cara de "o que é": na dúvida, nada muda
  M.simpleCommonNoun('Espaço comercial', 'Vendo espaço comercial na Rua 25 de Março', 'pt') === 'espaço comercial' && // escrita em minúscula pela pessoa
  M.simpleCommonNoun('Padaria Central', 'Vendo a Padaria Central no Centro', 'pt') === null && // maiúscula no meio da frase = nome
  M.simpleCommonNoun('Café', 'Café am Markt zu verkaufen', 'de') === null && M.simpleCommonNoun('Café', 'Café na praça à venda', 'pt') === 'café' // alemão: todo substantivo é maiúsculo
await check('N3 simpleCommonNoun EXECUTADA: "espaço comercial" · "casa" · "corner bakery" · "local comercial"; Casa Bonita, Nike, Padaria Central e alemão ficam como estão', comumCerto(S))
await check('N3-mutante: maiúscula depois da 1ª palavra ignorada (Casa Bonita vira comum) fica vermelho', () => !comumCerto(simpleCom(trocar(SRC.simpleLib, "    if (written.slice(1).some((w) => isCap(w) && !NAME_JOINERS.has(w.toLowerCase()))) return null\n", ''))))
await check('N3-mutante: sem a trava de língua (alemão minusculizado) fica vermelho', () => !comumCerto(simpleCom(trocar(SRC.simpleLib, "if (!b || !LOWERCASE_NOUN_LANGS.has(String(language ?? '').toLowerCase().slice(0, 2))) return null", 'if (!b) return null'))))

const minuscula = (M) =>
  M.lowerMidSentence(FRASES[0].producao, 'espaço comercial', 'espaço comercial') === 'Conheça o espaço comercial, à venda ou para alugar. Venha conferir as oportunidades em Moema!' &&
  M.lowerMidSentence('Espaço comercial à venda. Espaço Comercial em Moema! Aluga-se Espaço comercial.', 'espaço comercial', 'espaço comercial') === 'Espaço comercial à venda. Espaço Comercial em Moema! Aluga-se espaço comercial.' &&
  M.lowerMidSentence('Um Casamento na Casa', 'casa', 'casa') === 'Um Casamento na casa' &&
  FRASES.every((f) => M.lowerMidSentence(f.boa, f.common, f.common) === f.boaDepois)
await check('N4 lowerMidSentence EXECUTADA: "Conheça o Espaço comercial" → "Conheça o espaço comercial"; começo de frase intacto; "Casamento" intacto; as 4 frases', minuscula(S))
await check('N4-mutante: sem a fronteira de palavra ("Casamento" → "casamento") fica vermelho', () => !minuscula(simpleCom(trocar(SRC.simpleLib, '    if (wordEdge && midSentence) {', '    if (midSentence) {'))))
await check('N4-mutante: minúscula também no começo da frase fica vermelho', () => !minuscula(simpleCom(trocar(SRC.simpleLib, '    if (wordEdge && midSentence) {', '    if (wordEdge) {'))))

const faltam = (M) =>
  JSON.stringify(M.missingNames(FRASES[0].producao, FRASES[0].names)) === '["Edifício Villa Versace","São Paulo"]' &&
  M.missingNames('Na Avenida Paulista, perto do metrô.', ['Av. Paulista']).length === 0 &&
  M.missingNames('fica na rua das flores', ['Rua das Flores']).length === 0 &&
  JSON.stringify(M.missingNames('Fica em Flores.', ['Rua das Flores'])) === '["Rua das Flores"]' &&
  FRASES.every((f) => M.missingNames(f.boa, f.names).length === 0 && M.missingNames(f.producao, f.names).length > 0)
await check('N5 missingNames EXECUTADA: a narração de produção não cita "Edifício Villa Versace" nem "São Paulo"; "Avenida Paulista" cita "Av. Paulista"; nome pela metade não conta', faltam(S))
await check('N5-mutante: nome contado por uma palavra só fica vermelho', () => !faltam(simpleCom(trocar(SRC.simpleLib, '    for (let i = 0; i + seq.length <= said.length; i++) if (seq.every((w, k) => said[i + k] === w)) return false', '    if (said.includes(seq[seq.length - 1])) return false'))))

// Pedido de texto (buildV2CopyMessages) e régua (checkV2Copy) do modo simples, nas 4 frases.
const voz = (M, f) => M.simpleVoiceFor(f.brief, f.sentence, f.lang)
const pedidoCerto = (M) => FRASES.every((f) => {
  const v = voz(M, f)
  const b = M.withCustomerNames(f.brief, v.names)
  const m = M.buildV2CopyMessages(b, f.languageName, { maxWords: 30, narration: true, overlays: false, simple: v })
  const antes = M.buildV2CopyMessages(f.brief, f.languageName, { maxWords: 30, narration: true, overlays: false })
  return JSON.stringify(v.names) === JSON.stringify(f.names) && v.commonNoun === f.common &&
    f.names.every((n) => m.system.includes(`"${n}"`)) && m.system.includes(`in lowercase, "${f.common}"`) && !m.system.includes('Say the business name once.') &&
    /never turn a name into a feature of what is advertised/.test(m.system) && /No empty filler/.test(m.system) &&
    m.user.includes(`- customer_names: ${f.names.join('; ')}`) &&
    // Sem `simple` (modo completo e antes do conserto): o pedido de sempre, sem nome nenhum.
    antes.system.includes('Say the business name once.') && !/customer_names|No empty filler|exactly as the customer wrote it/.test(antes.system + antes.user)
})
await check('N6 pedido EXECUTADO nas 4 frases: cita cada nome entre aspas, manda o substantivo comum em minúscula, nome não vira característica; os nomes entram como fato (customer_names); sem `simple` = o pedido de antes', pedidoCerto(BR))
await check('N6-mutante: pedido sem os nomes fica vermelho', () => !pedidoCerto(briefLoader({}, { [F.brief]: trocar(SRC.brief, '          ...(voice.names.length\n', '          ...(false\n') })))

const reguaCerta = (M) => FRASES.every((f) => {
  const v = voz(M, f)
  const b = M.withCustomerNames(f.brief, v.names)
  const o = { maxWords: 30, narration: true, overlays: false, simple: v }
  const prod = M.checkV2Copy(JSON.stringify({ narration: f.producao, overlays: [], sector: 'real_estate' }), b, o)
  const boa = M.checkV2Copy(JSON.stringify({ narration: f.boa, overlays: [], sector: 'real_estate' }), b, o)
  const inventada = M.checkV2Copy(JSON.stringify({ narration: f.boa.replace(/\.$/, ', com 300 m² de área.'), overlays: [], sector: 'real_estate' }), b, o)
  const completo = M.checkV2Copy(JSON.stringify({ narration: f.producao, overlays: [], sector: 'real_estate' }), f.brief, { maxWords: 30, narration: true, overlays: false })
  return !prod.ok && prod.why.some((w) => /exactly as the customer wrote/.test(w)) && f.names.filter((n) => !f.producao.includes(n)).every((n) => prod.why.join(' ').includes(`"${n}"`)) &&
    boa.ok && boa.copy.narration === f.boaDepois &&
    !inventada.ok && inventada.why.some((w) => /numbers that are not in the brief: 300/.test(w)) &&
    completo.ok && completo.copy.narration === f.producao
})
await check('N7 régua EXECUTADA nas 4 frases: a narração de produção é RECUSADA com os nomes que faltam; a boa passa com a maiúscula consertada; número inventado continua recusado; sem `simple` nada muda', reguaCerta(BR))
await check('N7-mutante: régua sem a cobrança dos nomes fica vermelho', () => !reguaCerta(briefLoader({}, { [F.brief]: trocar(SRC.brief, '    const missing = voice ? missingNames(narration, voice.names) : []', '    const missing: string[] = []') })))
await check('N7-mutante: sem o pós-processo de maiúscula fica vermelho', () => !reguaCerta(briefLoader({}, { [F.brief]: trocar(SRC.brief, '    if (voice?.commonNoun) narration = lowerMidSentence(narration, voice.commonNoun, voice.commonNoun)\n', '') })))
await check('N7b as frases de tela também perdem a maiúscula do substantivo comum no meio ("Aluga-se Espaço comercial" → "Aluga-se espaço comercial"); a 1ª continua com o nome', () => {
  const f = FRASES[0]
  const v = voz(BR, f)
  const r = BR.checkV2Copy(JSON.stringify({ narration: f.boa, overlays: ['Espaço comercial', 'Aluga-se Espaço comercial', 'Edifício Villa Versace'], sector: 'real_estate' }), BR.withCustomerNames(f.brief, v.names), { maxWords: 30, narration: true, simple: v })
  return r.ok && JSON.stringify(r.copy.overlays) === '["Espaço comercial","Aluga-se espaço comercial","Edifício Villa Versace"]'
})

// extractAdsV2Brief EXECUTADA com uma OpenAI falsa (1 extração + texto + 1 correção).
const openaiFalsa = (respostas) => {
  const log = []
  return {
    log,
    chat: { completions: { create: async (params) => { log.push(structuredClone(params)); const r = respostas.shift(); return { choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r) } }] } } } },
  }
}
const BRIEF_PRODUCAO = { business: 'Espaço comercial — à venda ou para alugar', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: { address: 'Edifício Villa Versace, em Moema, São Paulo' }, model_hint: '' }
const extrai = async (respostas, extra = {}, over = {}) => {
  const oa = openaiFalsa(respostas)
  const M = briefLoader(oa, over)
  const r = await M.extractAdsV2Brief({ text: FRASES[0].sentence, language: 'pt', languageName: 'Brazilian Portuguese (pt-BR)', maxWords: 30, narration: true, overlays: false, facts: [], sentence: FRASES[0].sentence, ...extra })
  return { r, log: oa.log }
}
const extracaoCerta = async (over) => {
  const a = await extrai([BRIEF_PRODUCAO, { narration: FRASES[0].producao, overlays: [], sector: 'real_estate' }, { narration: FRASES[0].boa, overlays: [], sector: 'real_estate' }], {}, over)
  const correcao = a.log[2]?.messages?.at(-1)?.content ?? ''
  return a.r.ok && a.r.attempts === 3 && a.r.copy.narration === FRASES[0].boaDepois && a.r.brief.extra.customer_names === 'Edifício Villa Versace; Moema; São Paulo' &&
    JSON.stringify(a.r.voice) === JSON.stringify({ names: FRASES[0].names, commonNoun: 'espaço comercial', namesMissing: [] }) &&
    /"Edifício Villa Versace", "São Paulo" exactly as the customer wrote them/.test(correcao) && a.log[1].messages[0].content.includes('"Edifício Villa Versace", "Moema", "São Paulo"')
}
await check('N8 extractAdsV2Brief EXECUTADA com o brief REAL de produção: a narração de produção volta com o motivo ("Edifício Villa Versace", "São Paulo"); a corrigida sai com os nomes e "espaço comercial" minúsculo', extracaoCerta())
await check('N8-mutante: extração sem as regras da voz (sentence ignorada) fica vermelho', async () => !(await extracaoCerta({ [F.brief]: trocar(SRC.brief, "const voice = typeof args.sentence === 'string' ? simpleVoiceFor(parsed.brief, args.sentence, args.language) : null", 'const voice = null as AdsV2SimpleVoice | null') })))
await check('N9 nome é acabamento, não honestidade: 2ª resposta limpa que ainda esquece um nome é ACEITA e o que faltou vai para voice.namesMissing (nunca 502 por um nome)', async () => {
  const semSP = FRASES[0].boa.replace(', São Paulo', '')
  const a = await extrai([BRIEF_PRODUCAO, { narration: FRASES[0].producao, overlays: [], sector: 'real_estate' }, { narration: semSP, overlays: [], sector: 'real_estate' }])
  return a.r.ok && JSON.stringify(a.r.voice.namesMissing) === '["São Paulo"]' && !a.r.copy.narration.includes('São Paulo') && a.r.copy.narration.startsWith('Conheça o espaço comercial')
})
await check('N10 honestidade continua dura: 2ª resposta com número inventado = recusa (stage copy), mesmo citando todos os nomes', async () => {
  const a = await extrai([BRIEF_PRODUCAO, { narration: FRASES[0].producao, overlays: [], sector: 'real_estate' }, { narration: FRASES[0].boa.replace('Agende a sua visita.', 'São 300 m² prontos.'), overlays: [], sector: 'real_estate' }])
  return !a.r.ok && a.r.stage === 'copy' && a.r.why.some((w) => /300/.test(w))
})
await check('N11 modo completo intocado: sem `sentence` a narração de produção passa como sempre, sem customer_names nem voice', async () => {
  const oa = openaiFalsa([BRIEF_PRODUCAO, { narration: FRASES[0].producao, overlays: ['Espaço comercial', 'À venda ou para alugar'], sector: 'real_estate' }])
  const r = await briefLoader(oa).extractAdsV2Brief({ text: FRASES[0].sentence, language: 'pt', languageName: 'Brazilian Portuguese (pt-BR)', maxWords: 30, narration: true })
  return r.ok && r.attempts === 2 && r.copy.narration === FRASES[0].producao && !('voice' in r) && !('customer_names' in r.brief.extra) && oa.log[1].messages[0].content.includes('Say the business name once.')
})

const titulos = (M) => FRASES.every((f) => M.simpleTitle(f.sentence) === f.title) &&
  M.simpleTitle('Loja à venda no Edifício Aurora, bairro Jardim, São Paulo') === 'Loja à venda no Edifício Aurora' &&
  M.simpleTitle('Vendo espaço comercial na Rua 25 de Março') === 'Vendo espaço comercial' && M.simpleTitle('x'.repeat(10) + ' ' + 'y'.repeat(50)).length <= 40
await check('N12 título curto (cartão final) EXECUTADO: não termina em nome pela metade ("…na Rua") nem em ligação solta ("…en el"); ≤ 40 e o de antes quando cabe', titulos(S))
await check('N12-mutante: sem aparar a ligação solta ("Local comercial en alquiler en el") fica vermelho', () => !titulos(simpleCom(trocar(SRC.simpleLib, '  while (words.length && FUNCTION_WORDS.has(words[words.length - 1].toLowerCase())) words.pop()\n', ''))))

// ═══ ROTA /plan EXECUTADA (banco falso + fornecedores falsos + v2Brief REAL com OpenAI falsa) ═════════════════════════
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'teste-sem-rede'
const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`
function db(tables) {
  const base = { tables }
  base.from = (name) => {
    tables[name] ??= []
    const get = (r, k) => (k.includes('->') ? k.split(/->>?/).reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), r) : r[k])
    const ctx = { op: 'select', filters: [], patch: null, head: false }
    const run = (single) => {
      const hit = tables[name].filter((r) => ctx.filters.every((f) => f(r)))
      if (ctx.op === 'select') {
        if (ctx.head) return { data: null, count: hit.length, error: null }
        const rows = hit.map((r) => structuredClone(r))
        return single ? { data: rows[0] ?? null, error: null } : { data: rows, error: null }
      }
      for (const r of hit) Object.assign(r, structuredClone(ctx.patch))
      return single ? { data: hit[0] ? structuredClone(hit[0]) : null, error: null } : { data: hit.map((r) => structuredClone(r)), error: null }
    }
    const api = {
      select(_c, o) { if (o && o.head) ctx.head = true; return api },
      eq(k, v) { ctx.filters.push((r) => get(r, k) !== undefined && get(r, k) !== null && String(get(r, k)) === String(v)); return api },
      in(k, v) { ctx.filters.push((r) => v.map(String).includes(String(get(r, k)))); return api },
      gte(k, v) { ctx.filters.push((r) => get(r, k) >= v); return api },
      update(p) { ctx.op = 'update'; ctx.patch = p; return api },
      maybeSingle() { return Promise.resolve(run(true)) },
      then(a, b) { return Promise.resolve(run(false)).then(a, b) },
    }
    return api
  }
  return base
}
const USER = U(9)
const ORDER = U(1)
const SENTENCA = 'Loja à venda no Edifício Aurora, bairro Jardim'
const BRIEF_LOJA = { business: 'Loja — à venda', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: { address: 'Edifício Aurora, bairro Jardim' }, model_hint: '' }
// O "modelo" manda frases de tela SEMPRE (mesmo com elas desligadas): quem decide é o código.
const COPY_LOJA = { narration: 'Conheça a Loja à venda no Edifício Aurora, no bairro Jardim, pronta para receber o seu negócio.', overlays: ['Loja à venda', 'Edifício Aurora', 'Bairro Jardim'], sector: 'real_estate' }
const pedido = (b = {}) => ({
  id: ORDER, user_id: USER, status: 'draft', tier: 'commercial', seconds: 15, sector: 'real_estate', language: 'pt', narration: true,
  brief: { sentence: SENTENCA, link: null, mode: 'simple', overlays: true, price: null, contact: null, research: { status: 'ok', at: new Date().toISOString(), facts: [] }, ...b },
  logo_footage_id: null, card_url: null, card_footage_id: null, photos: null, plan: null,
})
const PHOTOS = [0, 1, 2].map((i) => ({ footage_id: U(20 + i), kind: 'place' }))
const planBody = (extra = {}) => ({ mode: 'simple', order_id: ORDER, sector: 'real_estate', photos: PHOTOS, card_footage_id: U(30), facts: [], ...extra })
async function rodaPlano(order, body, { routeSrc, briefSrc, extractSpy = false } = {}) {
  const tables = { ads_v2_orders: [structuredClone(order)], events: [] }
  const admin = db(tables)
  const log = { events: [], extract: [] }
  const oa = openaiFalsa([BRIEF_LOJA, COPY_LOJA, COPY_LOJA])
  const BRm = briefLoader(oa, briefSrc ? { [F.brief]: briefSrc } : {})
  const briefStub = extractSpy ? { ...BRm, extractAdsV2Brief: async (args) => { log.extract.push(structuredClone(args)); return BRm.extractAdsV2Brief(args) } } : BRm
  const stubs = {
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: USER, email: 'teste@exemplo.com' } } }) } }) },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { log.events.push(e); tables.events.push({ id: `ev-${tables.events.length + 1}`, user_id: e.userId, name: e.name, created_at: new Date().toISOString() }) } },
    '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
    '@/lib/safety/moderationPolicy': { moderationRefusalMessage: () => 'blocked', moderationRefusalStatus: () => 422 },
    '@/lib/ads/serverAccess': { adsGate: () => 'ok', isMissingAdsTable: () => false, loadAdsAccess: async () => ({ admin, reason: 'internal' }) },
    '@/lib/ads/v2Access': { adsV2Visible: () => true },
    '@/lib/ads/v2Advance': { loadAdsV2Order: async (_a, id, uid) => { const o = tables.ads_v2_orders.find((r) => r.id === id && r.user_id === uid); return { order: o ? structuredClone(o) : null, error: null } } },
    '@/lib/ads/v2Server': {
      ownedFootage: async (_a, _u, ids) => new Map(ids.map((id) => [id, { url: `https://x.supabase.co/storage/v1/object/public/user-footage/${USER}/${id}.png`, isImage: true, isPng: true, isVideo: false }])),
      measureFootageVideo: async () => null,
      v2Fail: (error, status, more = {}) => ({ status, body: { error, ...more } }),
      v2Json: (b, status = 200) => ({ status, body: b }),
    },
    '@/lib/ads/v2Link': { adsV2LinkText: async () => null },
    '@/lib/ads/v2Brief': briefStub,
  }
  // KINEO-ESTILOS-PRODUTO-2026-10-09 — re-ancorado: a rota /plan importa o interruptor ADS_V2_STYLES_PUBLIC de lib/ads/v2Styles.ts (lib PURA).
  const route = makeLoader(stubs, { real: ['lib/textLanguage.ts', 'lib/ads/v2Contract.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2ShotLists.ts', 'lib/ads/v2Research.ts', 'lib/ads/v2Styles.ts'], over: routeSrc ? { [F.planRoute]: routeSrc } : {} })(F.planRoute)
  const res = await route.POST({ json: async () => body, nextUrl: { searchParams: new URLSearchParams() } })
  return { res, tables, log, openai: oa.log }
}
const rotaNomes = async (routeSrc) => {
  const r = await rodaPlano(pedido({ price: 'R$ 990 mil', contact: '(11) 90000-0000' }), planBody(), { routeSrc, extractSpy: true })
  const args = r.log.extract[0]
  const ev = r.log.events.find((e) => e.name === 'ads_v2_plan_served' && e.metadata.ok === true)
  const row = r.tables.ads_v2_orders[0]
  return r.res.status === 200 && args.sentence === SENTENCA && args.text.includes('Price: R$ 990 mil') && !args.sentence.includes('Price') &&
    row.brief.copy.narration === 'Conheça a loja à venda no Edifício Aurora, no bairro Jardim, pronta para receber o seu negócio.' &&
    r.res.body.narration === row.brief.copy.narration && row.brief.extracted.extra.customer_names === 'Edifício Aurora; Jardim' &&
    ev && ev.metadata.names_required === 2 && ev.metadata.names_missing === 0 && ev.metadata.common_noun === true && !JSON.stringify(ev.metadata).includes('Aurora')
}
await check('N13 /plan EXECUTADA: a frase EXATA (sem "Price:"/"Contact:") vai à extração; a narração gravada e devolvida cita os nomes com "loja" minúsculo; o evento leva só contagens (nenhum nome)', rotaNomes())
await check('N13-mutante: rota sem mandar a frase fica vermelho', async () => !(await rotaNomes(trocar(SRC.planRoute, ", sentence: typeof brief0.sentence === 'string' ? brief0.sentence.trim() : ''", ''))))
await check('N13-mutante: rota mandando o texto com preço/contato no lugar da frase fica vermelho', async () => !(await rotaNomes(trocar(SRC.planRoute, "sentence: typeof brief0.sentence === 'string' ? brief0.sentence.trim() : ''", 'sentence: text'))))

// ═══ F. FRASES NA TELA: PADRÃO LIGADO, TEXTO CLARO, DESLIGADAS = NENHUMA FRASE NA MONTAGEM ═══════════════════════════
const C = pura(F.contract)
const copyClaro = (M) => {
  const { pt, en, es } = M.ADS_V2_SIMPLE_COPY
  return pt.text.overlays === 'Frases na tela' && pt.text.onMany === 'ligadas' && pt.text.offMany === 'desligadas' && pt.plan.words === pt.text.overlays &&
    /Não são legenda da narração/.test(pt.text.overlaysHint) && /^2 ou 3 frases curtas/.test(pt.text.overlaysHint) &&
    es.text.overlays === 'Frases en pantalla' && es.text.onMany === 'activadas' && es.plan.words === es.text.overlays && /No son subtítulos/.test(es.text.overlaysHint) &&
    en.text.overlays === 'Phrases on screen' && en.plan.words === en.text.overlays && /not subtitles/.test(en.text.overlaysHint) &&
    pt.text.on === 'ligada' && pt.text.off === 'desligada' // "Narração: ligada" continua no singular
}
await check('F1 texto da opção claro em pt: "Frases na tela: ligadas/desligadas" (concordância), o MESMO nome do plano, e a dica "2 ou 3 frases curtas… Não são legenda da narração" (en/es iguais)', copyClaro(S))
await check('F1-mutante: "Frases curtas na tela" de volta fica vermelho', () => !copyClaro(simpleCom(trocar(SRC.simpleLib, "    overlays: 'Frases na tela',", "    overlays: 'Frases curtas na tela',"))))
const simplesCod = semComentarios(SRC.simple)
const telaClara = (src) => {
  const s = semComentarios(src)
  return /const \[overlaysOn, setOverlaysOn\] = useState\(true\)/.test(s) &&
    s.includes('{copy.text.overlays}: {overlaysOn ? copy.text.onMany : copy.text.offMany}') &&
    s.includes('{copy.text.narration}: {narrationOn ? copy.text.on : copy.text.off}') &&
    s.includes('<p className="adsw-hint">{copy.text.overlaysHint}</p>') &&
    /mode: 'simple',[\s\S]{0,400}overlays: overlaysOn,/.test(bloco(s, 'async function ensureDraft('))
}
await check('F2 tela: padrão LIGADO (useState(true)), rótulo no plural, dica visível ao lado da chave, e o pedido leva overlays: overlaysOn', telaClara(SRC.simple))
await check('F2-mutante: padrão virando desligado fica vermelho', () => !telaClara(trocar(SRC.simple, 'const [overlaysOn, setOverlaysOn] = useState(true)', 'const [overlaysOn, setOverlaysOn] = useState(false)')))
await check('F3 contrato: pedido simples sem o campo = frases ligadas; overlays:false chega como false', () => {
  const b = { mode: 'simple', tier: 'commercial', sentence: SENTENCA }
  return C.sanitizeCreateOrderBody(b).value.overlays === true && C.sanitizeCreateOrderBody({ ...b, overlays: false }).value.overlays === false
})
// v2Advance monta com ESTE filtro (leitura) — o guardião o reproduz para rodar a montagem REAL.
const FILTRO_ADVANCE = 'overlays: (plan.overlays ?? []).filter((o) => o && typeof o.text === \'string\' && o.text.trim()).map((o) => ({ text: o.text, start: o.start, end: o.end })),'
const montagem = (plan) => pura(F.montage).buildAdV2Source({
  width: 1080, height: 1920, fontFamily: 'Montserrat', cardUrl: 'https://x.test/card.png', musicUrl: null,
  shots: plan.shots.map((s) => ({ url: `https://x.test/${s.idx}.jpg`, kind: 'text', cutStart: 0, cutSeconds: s.cutSeconds, measuredSeconds: null })),
  overlays: (plan.overlays ?? []).filter((o) => o && typeof o.text === 'string' && o.text.trim()).map((o) => ({ text: o.text, start: o.start, end: o.end })),
})
const textos = (src) => src.elements.filter((e) => e.type === 'text')
const semFrases = async (routeSrc) => {
  const off = await rodaPlano(pedido({ overlays: false }), planBody(), { routeSrc })
  const on = await rodaPlano(pedido(), planBody(), { routeSrc })
  const planOff = off.tables.ads_v2_orders[0].plan
  const planOn = on.tables.ads_v2_orders[0].plan
  const sysOff = off.openai[1].messages[0].content
  return SRC.advance.includes(FILTRO_ADVANCE) && off.res.status === 200 && on.res.status === 200 &&
    /overlays: return \[\] \(the customer turned the on-screen phrases off\)\./.test(sysOff) &&
    planOff.overlays.length === 0 && off.res.body.overlays.length === 0 && off.tables.ads_v2_orders[0].brief.copy.overlays.length === 0 && textos(montagem(planOff)).length === 0 &&
    planOn.overlays.length >= 2 && textos(montagem(planOn)).length === planOn.overlays.length && textos(montagem(planOn))[0].text === 'Loja à venda'
}
await check('F4 EXECUTADO de ponta a ponta: frases desligadas → pedido manda [], o que o modelo mandar é ignorado, plano/resposta com 0 frases e a montagem REAL (buildAdV2Source) sem NENHUM elemento de texto; ligadas → 3 frases e 3 textos', semFrases())
// Duas travas independentes: a régua (checkV2Copy devolve [] com overlays:false) e a rota (!overlaysOn → []). Cada uma
// sozinha segura (as duas primeiras linhas); sem as duas, as frases vazam (o mutante tem de ficar vermelho).
const REGUA_VAZA = { from: 'if (opts.overlays === false) {\n    if (why.length)', to: 'if (false) {\n    if (why.length)' }
const ROTA_VAZA = { from: 'const overlays = !overlaysOn\n      ? []', to: 'const overlays = false\n      ? []' }
const semFrasesCom = async ({ rota, regua }) => {
  const routeSrc = rota ? trocar(SRC.planRoute, ROTA_VAZA.from, ROTA_VAZA.to) : undefined
  const briefSrc = regua ? trocar(SRC.brief, REGUA_VAZA.from, REGUA_VAZA.to) : undefined
  const off = await rodaPlano(pedido({ overlays: false }), planBody(), { routeSrc, briefSrc })
  return off.res.status === 200 && off.tables.ads_v2_orders[0].plan.overlays.length === 0 && textos(montagem(off.tables.ads_v2_orders[0].plan)).length === 0
}
await check('F4b só a trava da rota (régua vazando) já segura: 0 frases', semFrasesCom({ rota: false, regua: true }))
await check('F4c só a trava da régua (rota vazando) já segura: 0 frases', semFrasesCom({ rota: true, regua: false }))
await check('F4-mutante: rota E régua deixando passar as frases desligadas fica vermelho (3 textos na montagem)', async () => !(await semFrasesCom({ rota: true, regua: true })))

// ═══ H. ABA OCULTA: lib/ads/v2VideoFrames.ts EXECUTADA NUM DOM FALSO COM RELÓGIO FALSO ═══════════════════════════════
// Modelo de navegador: com a aba OCULTA o <video> não carrega (loadeddata só com a aba visível); o avanço ('seeked')
// termina mesmo oculto, mas o quadro desenhado oculto conta como QUADRO VAZIO (o que o conserto tem de evitar).
const clock = { now: 1_000_000, seq: 0, timers: new Map() }
const fakeWindow = {
  setTimeout: (fn, ms) => { const id = ++clock.seq; clock.timers.set(id, { at: clock.now + Math.max(0, Number(ms) || 0), fn }); return id },
  clearTimeout: (id) => { clock.timers.delete(id) },
}
const flush = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)) }
async function advance(ms) {
  const end = clock.now + ms
  await flush()
  for (;;) {
    let next = null
    for (const [id, t] of clock.timers) if (t.at <= end && (!next || t.at < next[1].at || (t.at === next[1].at && id < next[0]))) next = [id, t]
    if (!next) break
    clock.timers.delete(next[0])
    clock.now = next[1].at
    next[1].fn()
    await flush()
  }
  clock.now = end
  await flush()
}
const world = { decodes: true, videos: [], draws: 0, drawsHidden: 0, srcHidden: 0 }
const listeners = () => {
  const map = new Map()
  return {
    addEventListener(t, f) { if (!map.has(t)) map.set(t, new Set()); map.get(t).add(f) },
    removeEventListener(t, f) { map.get(t)?.delete(f) },
    fire(t) { for (const f of [...(map.get(t) ?? [])]) f() },
  }
}
const doc = {
  hidden: false,
  ...listeners(),
  setHidden(h) { this.hidden = h; this.fire('visibilitychange') },
  createElement(tag) { return tag === 'video' ? novoVideo() : novoCanvas() },
}
/** Roda `fn` depois de `ms` — e, se a aba estiver oculta nessa hora, só quando ela voltar. */
const quandoVisivel = (ms, fn) => fakeWindow.setTimeout(() => {
  if (!doc.hidden) { fn(); return }
  const on = () => { if (!doc.hidden) { doc.removeEventListener('visibilitychange', on); fn() } }
  doc.addEventListener('visibilitychange', on)
}, ms)
function novoVideo() {
  const ev = listeners()
  const v = {
    ...ev, muted: false, playsInline: false, preload: '', duration: NaN, videoWidth: 0, videoHeight: 0, _t: 0,
    removeAttribute() {}, load() {},
    set src(u) {
      if (!u) return
      world.videos.push(v)
      if (doc.hidden) world.srcHidden++
      if (world.decodes) quandoVisivel(120, () => { v.duration = 10; v.videoWidth = 1920; v.videoHeight = 1080; v.fire('loadeddata') })
    },
    get currentTime() { return v._t },
    set currentTime(t) { v._t = t; fakeWindow.setTimeout(() => v.fire('seeked'), 40) },
  }
  return v
}
function novoCanvas() {
  return {
    width: 0, height: 0,
    getContext() {
      return {
        drawImage() { world.draws++; if (doc.hidden) world.drawsHidden++ },
        getImageData(_x, _y, w, h) { return { data: new Uint8ClampedArray(w * h * 4).fill(128) } },
      }
    },
    toBlob(cb) { cb(new Blob(['x'], { type: 'image/jpeg' })) },
  }
}
const realNow = Date.now
const semDom = { window: globalThis.window, document: globalThis.document }
globalThis.window = fakeWindow
globalThis.document = doc
Date.now = () => clock.now
const reset = (decodes = true, hidden = false) => {
  clock.timers.clear()
  Object.assign(world, { decodes, videos: [], draws: 0, drawsHidden: 0, srcHidden: 0 })
  doc.hidden = hidden
}
const arquivo = () => new File([new Uint8Array(64)], 'tour.mp4', { type: 'video/mp4' })
const acompanha = (p) => {
  const st = { state: 'pending', value: null, error: null }
  p.then((v) => { st.state = 'ok'; st.value = v }, (e) => { st.state = 'err'; st.error = e })
  return st
}
const framesCom = (src) => pura(F.frames, src)
const FR = framesCom()
const lerUsuario = (M) => acompanha(M.readUserVideo(arquivo(), () => [1, 2, 3], () => 1))

const ocultaDesdeOInicio = async (M) => {
  reset(true, true)
  const st = lerUsuario(M)
  await advance(60_000)
  const esperou = st.state === 'pending' && world.srcHidden === 0 && world.videos.length === 0
  doc.setHidden(false)
  await advance(5_000)
  return esperou && st.state === 'ok' && st.value.seconds === 10 && st.value.width === 1920 && st.value.thumb instanceof File && world.drawsHidden === 0
}
await check('H1 aba OCULTA desde o início: 60 s sem erro nem carga (o <video> nem recebe o arquivo); a aba volta → a leitura termina (10 s, 1920×1080, miniatura)', ocultaDesdeOInicio(FR))
await check('H1-mutante: lib sem enxergar a aba oculta ("Seu navegador não abre" de novo) fica vermelho', async () => !(await ocultaDesdeOInicio(framesCom(trocar(SRC.frames, '    return typeof document !== \'undefined\' && document.hidden === true', '    return false')))))
await check('H1-mutante: carga começando com a aba oculta (sem esperar antes do src) fica vermelho', async () => !(await ocultaDesdeOInicio(framesCom(trocar(SRC.frames, '    await untilVisible(opts.signal)\n    video.src = url\n', '    video.src = url\n', 2)))))

const teto = async (M) => {
  reset(true, true)
  const st = lerUsuario(M)
  await advance(M.VIDEO_FRAME_HIDDEN_MAX_MS - 1_000)
  const antes = st.state === 'pending'
  await advance(2_000)
  return M.VIDEO_FRAME_HIDDEN_MAX_MS === 600_000 && antes && st.state === 'err' && st.error.code === 'hidden'
}
await check('H2 teto: oculta por mais de 10 min = VideoFramesError("hidden") — NUNCA "decode"', teto(FR))
await check('H2-mutante: teto virando "decode" fica vermelho', async () => !(await teto(framesCom(trocar(SRC.frames, "    timer = window.setTimeout(() => done(() => reject(new VideoFramesError('hidden'))), maxMs)", "    timer = window.setTimeout(() => done(() => reject(new VideoFramesError('decode'))), maxMs)")))))

const naoAbreDeVerdade = async (M) => {
  reset(false, false)
  const st = lerUsuario(M)
  await advance(14_000)
  const antes = st.state === 'pending'
  await advance(2_000)
  reset(true, false)
  const erro = lerUsuario(M)
  await flush()
  world.videos[0].fire('error')
  await flush()
  return antes && st.state === 'err' && st.error.code === 'decode' && erro.state === 'err' && erro.error.code === 'decode'
}
await check('H3 aba VISÍVEL e o vídeo de fato não abre: "decode" aos 15 s (e na hora com o evento error) — o erro verdadeiro continua existindo', naoAbreDeVerdade(FR))

const pausa = async (M) => {
  reset(false, false)
  const st = lerUsuario(M)
  await advance(10_000)
  doc.setHidden(true)
  await advance(60_000)
  const oculta = st.state === 'pending'
  doc.setHidden(false)
  await advance(4_000)
  const quase = st.state === 'pending'
  await advance(2_000)
  return oculta && quase && st.state === 'err' && st.error.code === 'decode'
}
await check('H4 o tempo-limite só corre com a aba visível: 10 s visível + 60 s oculta + 4 s = ainda esperando; +2 s (16 s visíveis) = "decode"', pausa(FR))
await check('H4-mutante: relógio que não pausa ao ocultar fica vermelho', async () => !(await pausa(framesCom(trocar(SRC.frames, '      if (now === hidden) return\n', '      return\n')))))

const quadroSoVisivel = async (M) => {
  reset(true, false)
  const st = lerUsuario(M)
  await advance(125) // carregou (120 ms) e pediu o 1º avanço
  doc.setHidden(true)
  await advance(60_000)
  const semQuadroOculto = world.drawsHidden === 0 && st.state === 'pending'
  doc.setHidden(false)
  await advance(5_000)
  return semQuadroOculto && st.state === 'ok' && world.drawsHidden === 0 && world.draws > 0
}
await check('H5 aba oculta no meio dos avanços: nenhum quadro é desenhado oculto (seria quadro vazio); volta → termina', quadroSoVisivel(FR))
await check('H5-mutante: desenhar logo depois do avanço, sem esperar a aba, fica vermelho', async () => !(await quadroSoVisivel(framesCom(trocar(SRC.frames, '        await seeked\n      }\n      await untilVisible(opts.signal)\n    }', '        await seeked\n      }\n    }')))))

const planoB = async (M) => {
  reset(true, true)
  const st = acompanha(M.grabVideoFrames(arquivo(), () => [2, 5, 8], {}))
  await advance(60_000)
  const esperou = st.state === 'pending' && world.videos.length === 0
  doc.setHidden(false)
  await advance(5_000)
  // E a aba oculta no meio dos avanços do plano B.
  reset(true, false)
  const meio = acompanha(M.grabVideoFrames(arquivo(), () => [2, 5, 8], {}))
  await advance(125)
  doc.setHidden(true)
  await advance(60_000)
  const semQuadroOculto = world.drawsHidden === 0 && meio.state === 'pending'
  doc.setHidden(false)
  await advance(5_000)
  return esperou && st.state === 'ok' && st.value.length === 3 && st.value.every((f) => f instanceof File && /tour-quadro-\d\.jpg/.test(f.name)) &&
    semQuadroOculto && meio.state === 'ok' && meio.value.length === 3 && world.drawsHidden === 0
}
await check('H6 plano B (quadros viram fotos) com a aba oculta: espera a aba voltar e tira os 3 quadros; oculta no meio = nenhum quadro desenhado oculto', planoB(FR))
await check('H6-mutante: plano B desenhando sem esperar a aba fica vermelho', async () => !(await planoB(framesCom(trocar(SRC.frames, '      await untilVisible(opts.signal)\n      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)\n      return meanLuma(canvas)', '      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)\n      return meanLuma(canvas)')))))
globalThis.window = semDom.window
globalThis.document = semDom.document
Date.now = realNow

// A tela: "Volte para esta aba…" com a aba oculta; o teto vira aviso próprio; "não abre" só quando não abre.
const copyAba = (M) => {
  const { pt, en, es } = M.ADS_V2_SIMPLE_COPY
  return pt.files.videoHidden === 'Volte para esta aba para terminarmos de ler o vídeo.' &&
    en.files.videoHidden === 'Come back to this tab so we can finish reading your video.' &&
    es.files.videoHidden === 'Vuelve a esta pestaña para que terminemos de leer el video.' &&
    [pt, en, es].every((c) => c.files.videoHiddenRetry.startsWith('{name}: ') && !/não abre|cannot open|no abre/i.test(c.files.videoHidden + c.files.videoHiddenRetry))
}
await check('U1 textos em pt/en/es: "Volte para esta aba para terminarmos de ler o vídeo." e o aviso do teto — nenhum acusa o navegador', copyAba(S))
const telaAba = (src) => {
  const s = semComentarios(src)
  const leitura = bloco(s, 'export async function readVideoForAd(')
  const itemOuQuadros = bloco(s, 'async function videoItemOrFrames(')
  const quadros = bloco(s, 'async function framesFromVideo(')
  return s.includes('{videoBusy > 0 ? <p className="adsw-hint" role="status">{tabHidden ? copy.files.videoHidden : copy.files.readingVideo}</p> : null}') &&
    /const sync = \(\) => setTabHidden\(pageHidden\(\)\)\n\s*sync\(\)\n\s*document\.addEventListener\('visibilitychange', sync\)\n\s*return \(\) => document\.removeEventListener\('visibilitychange', sync\)/.test(s) &&
    /if \(!\(videoBusy > 0 && tabHidden\)\) return\n\s*const before = document\.title\n\s*document\.title = copy\.files\.videoHidden\n\s*return \(\) => \{ document\.title = before \}/.test(s) &&
    /if \(e instanceof VideoFramesError && e\.code === 'hidden'\) return \{ kind: 'photos', verdict: 'unreadable', hidden: true \}/.test(leitura) &&
    /if \(read\.hidden\) \{\n\s*notes\.push\(fill\(copy\.files\.videoHiddenRetry, \{ name: f\.name \}\)\)\n\s*return \[\]\n\s*\}/.test(itemOuQuadros) &&
    itemOuQuadros.indexOf('if (read.hidden)') < itemOuQuadros.indexOf('return framesFromVideo(f, notes)') &&
    quadros.includes("code === 'hidden' ? fill(copy.files.videoHiddenRetry, { name: f.name }) : copy.files.videoDecode")
}
await check('U2 tela simples: aviso "Volte para esta aba…" (na tela e no título da aba) enquanto lê com a aba oculta; teto = aviso próprio e SEM plano B; "não abre" só no erro de verdade', telaAba(SRC.simple))
await check('U2-mutante: teto caindo em "Seu navegador não abre este vídeo" fica vermelho', () => !telaAba(trocar(SRC.simple, "code === 'hidden' ? fill(copy.files.videoHiddenRetry, { name: f.name }) : copy.files.videoDecode", 'copy.files.videoDecode')))
await check('U2-mutante: "Lendo o seu vídeo…" mesmo com a aba oculta fica vermelho', () => !telaAba(trocar(SRC.simple, '{tabHidden ? copy.files.videoHidden : copy.files.readingVideo}', '{copy.files.readingVideo}')))

// ═══ TRAVA 8.2: nada disto mora em caminho travado ═══════════════════════════════════════════════════════════════════
await check('T1 trava 8.2: todos os arquivos tocados estão fora dos caminhos travados', () => Object.values(F).concat(['scripts/test-ads-simples-acabamento-2026-09-29.mjs']).every((p) => !/^(lib\/compose|lib\/hollywood\/|lib\/cinematic\/|lib\/broll\/|lib\/lyriaMusic|lib\/narrationFit|app\/api\/analyze-idea\/|app\/api\/generate-script\/|app\/api\/generate-video-)/.test(p)))
await check('T2 v2Simple continua LIB PURA (nenhum import) e v2VideoFrames continua sem import', !/^import /m.test(SRC.simpleLib) && !/^import /m.test(SRC.frames))

console.log(`test-ads-simples-acabamento-2026-09-29: ${ok} verdes, ${falhas.length} vermelhos`)
if (falhas.length) {
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
