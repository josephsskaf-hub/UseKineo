// KINEO-ASSISTANT-DISCOVERY-2026-09-06 — guardião da DESCOBERTA do link de um
// clique (/make?script=…) pelos assistentes.
//
// O PROBLEMA QUE ELE VIGIA: o formato do link só existia em /llms.txt, um
// arquivo que os assistentes raramente pedem — seis semanas no ar (desde 26/07)
// e nenhuma evidência de um assistente agindo a partir dele. Três peças
// passaram a apontar para o link a partir de superfícies que os leitores de
// máquina JÁ consomem:
//   (A) `potentialAction` no schema SoftwareApplication que sai em TODAS as
//       páginas (components/StructuredData.tsx, montado em app/layout.tsx);
//   (B) `<link rel="alternate">` no <head> da raiz apontando para /llms.txt;
//   (C) robots.ts continua liberando os crawlers de IA e o /llms.txt.
//
// A ASSERÇÃO MAIS IMPORTANTE DESTE ARQUIVO é a (A3): o `result` do
// potentialAction NÃO PODE ser VideoObject. O link não produz vídeo — ele
// guarda o roteiro, abre uma página e ESPERA um clique humano dentro do
// Studio; nada é renderizado e nenhum crédito sai antes disso. Um schema que
// promete vídeo é a vitrine oferecendo o que o cobrador recusa (a armadilha
// que já custou duas rotações nesta casa): o assistente diria "este link gera
// o vídeo", a pessoa clicaria esperando um MP4 e receberia um formulário.
//
// COMO PROVA (lido × executado, explícito em cada bloco):
//   (A..C) LÊ o texto real (readFileSync) e amarra cada asserção à VARIÁVEL/
//       CONSTANTE que decide — literal no lugar da constante reprova.
//   (E) EXECUTA o componente de verdade: transpila o .tsx com o `typescript`
//       do repo, resolve `@/` e `./relativo` para os .ts reais (Node >= 22.6
//       despe os tipos), renderiza com react-dom/server e lê o JSON-LD que a
//       página serve. Assim a STRING FINAL do urlTemplate é provada com valor,
//       não com regex. Se o import falhar, o bloco reprova em voz alta.
//
// Este arquivo NÃO importa nada com alias `@/` diretamente (72 testes do repo
// morrem no resolver antes da 1ª verificação).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire, registerHooks } from 'node:module'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

let pass = 0
const fails = []
const check = (label, ok, detail) => {
  if (ok) {
    pass++
    return
  }
  fails.push(`${label}${detail ? ` — ${detail}` : ''}`)
}

// Sem comentários: o que importa é o CÓDIGO. Um comentário que cite a palavra
// proibida para explicá-la não pode contar como violação.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .map((l) => l.replace(/\s\/\/.*$/, ''))
    .join('\n')

/** Bloco `{ … }` com chaves balanceadas a partir do índice do `{` de abertura. */
const balanced = (src, openIdx) => {
  if (openIdx < 0 || src[openIdx] !== '{') return null
  let depth = 0
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return src.slice(openIdx, i + 1)
    }
  }
  return null
}

const STRUCTURED = 'components/StructuredData.tsx'
const LAYOUT = 'app/layout.tsx'
const ROBOTS = 'app/robots.ts'
const LIB = 'lib/gptHandoff.ts'
const LLMS_ROUTE = 'app/llms.txt/route.ts'

const structured = read(STRUCTURED)
const layout = read(LAYOUT)
const robots = read(ROBOTS)
const lib = read(LIB)
const llmsRoute = read(LLMS_ROUTE)

// ═══ (A) potentialAction DENTRO do softwareApplicationSchema ════════════════
check('(A0) StructuredData importa ASSISTANT_DEEP_LINK_FACT de @/lib/kineoFacts', /import \{ ASSISTANT_DEEP_LINK_FACT \} from '@\/lib\/kineoFacts'/.test(structured))
check('(A0) o fato é apelidado uma vez (const dl = ASSISTANT_DEEP_LINK_FACT)', /\nconst dl = ASSISTANT_DEEP_LINK_FACT\n/.test(structured))

const iApp = structured.indexOf('const softwareApplicationSchema = {')
check('(A1) existe o nó softwareApplicationSchema', iApp >= 0)
const appBlock = iApp >= 0 ? balanced(structured, structured.indexOf('{', iApp)) : null
check('(A1) o bloco do softwareApplicationSchema fecha com chaves balanceadas', Boolean(appBlock))
const appCode = appBlock ? stripComments(appBlock) : ''
const iPa = appCode.indexOf('potentialAction: {')
check('(A1) potentialAction está DENTRO do bloco do softwareApplicationSchema', iPa >= 0)
const pa = iPa >= 0 ? balanced(appCode, appCode.indexOf('{', iPa)) : ''
check('(A1) o bloco do potentialAction fecha com chaves balanceadas', Boolean(pa))
// Fora do nó de SoftwareApplication não há potentialAction — Organization e
// FAQPage não "fazem" nada; o link é da aplicação.
const outside = stripComments(structured).split('potentialAction').length - 1
check('(A1) potentialAction aparece UMA vez no código do arquivo (só no SoftwareApplication)', outside === 1, `ocorrências: ${outside}`)
check("(A1) o tipo da ação é CreateAction", /'@type':\s*'CreateAction'/.test(pa))

// (A2) target = EntryPoint com urlTemplate, e o verbo vem do fato
const iTarget = pa.indexOf('target: {')
const target = iTarget >= 0 ? balanced(pa, pa.indexOf('{', iTarget)) : ''
check("(A2) target.@type = 'EntryPoint'", /'@type':\s*'EntryPoint'/.test(target))
check('(A2) target tem urlTemplate', /\burlTemplate:/.test(target))
check('(A2) urlTemplate NÃO é string literal — vem de uma constante derivada', !/urlTemplate:\s*[`'"]/.test(target) && /urlTemplate:\s*assistantLinkUrlTemplate\b/.test(target))
check('(A2) httpMethod vem do fato (dl.method), não de literal', /httpMethod:\s*dl\.method\b/.test(target))

// (A3) ══ A MAIS IMPORTANTE ══ result NÃO é VideoObject.
// O link prepara uma sessão do Studio e espera o clique; não produz vídeo.
// Se um dia alguém "melhorar" o schema para prometer VideoObject, este
// guardião é o que impede a promessa de subir.
check('(A3) VideoObject NÃO aparece em lugar nenhum do potentialAction', !/VideoObject/.test(pa))
const iResult = pa.indexOf('result: {')
const result = iResult >= 0 ? balanced(pa, pa.indexOf('{', iResult)) : ''
check('(A3) result existe e é um CreativeWork (a sessão preenchida, não o filme)', /'@type':\s*'CreativeWork'/.test(result))
check('(A3) object é um CreativeWork (o roteiro)', /object:\s*\{\s*'@type':\s*'CreativeWork'/.test(pa))

// (A4) nenhum literal proibido no bloco: tudo vem de constante
const forbiddenWords = /\b(seedance|kling|veo|fast|hollywood|h3|omni)\b/i
// Não usa `\b` nos números: "60s" não tem fronteira de palavra entre o 0 e o s,
// e foi exatamente assim que o mutante M4b (name com "60s") passou verde na
// primeira falsificação. Aqui o número reprova colado a letra, só não colado a
// outro dígito.
const forbiddenNumbers = /(?<![\w])(35|60|90|5000|7)(?![\d])/
check("(A4) '/make' NÃO é digitado no potentialAction", !pa.includes('/make'))
check('(A4) nenhum nome de motor digitado no potentialAction', !forbiddenWords.test(pa), (pa.match(forbiddenWords) ?? [])[0])
check('(A4) nenhum número de régua/teto/prazo digitado no potentialAction (35/60/90/5000/7)', !forbiddenNumbers.test(pa), (pa.match(forbiddenNumbers) ?? [])[0])
check("(A4) 'script=' NÃO é digitado no potentialAction", !pa.includes('script='))
// A derivação do template (entre `const dl` e a const do template) também não
// digita nada: URL e chaves vêm de dl.url / dl.example / dl.params.
const iDl = structured.indexOf('\nconst dl = ASSISTANT_DEEP_LINK_FACT')
const iTpl = structured.indexOf('const assistantLinkUrlTemplate =')
const derivation = iDl >= 0 && iTpl > iDl ? stripComments(structured.slice(iDl, structured.indexOf('\n', iTpl))) : ''
check('(A4) a derivação do template existe e vem DEPOIS do apelido do fato', derivation.length > 0)
check("(A4) a derivação NÃO digita '/make', 'script=' nem '{script}'", derivation.length > 0 && !derivation.includes('/make') && !derivation.includes('script=') && !derivation.includes('{script}'))
check('(A4) a URL do template vem de dl.url', /\$\{dl\.url\}/.test(derivation))
check('(A4) as chaves do template vêm do fato (dl.example ∩ dl.params)', /new URL\(dl\.example\)\.searchParams\.keys\(\)/.test(derivation) && /\bk in dl\.params\b/.test(derivation))
check('(A4) nenhum motor/número digitado na derivação', !forbiddenWords.test(derivation) && !forbiddenNumbers.test(derivation))

// (A5) description é a frase de comportamento do fato, verbatim
check('(A5) description referencia dl.behavior (não é frase escrita à mão)', /description:\s*dl\.behavior\b/.test(pa))
check('(A5) a frase de comportamento do fato diz que o link NÃO gera nada sozinho', /does not generate anything on its own/.test(read('lib/kineoFacts.ts')))

// ═══ (B) <head> da raiz aponta para o /llms.txt por CONSTANTE ═══════════════
const linkTags = [...layout.matchAll(/<link\b[^>]*\/>/g)].map((m) => m[0])
const llmsLink = linkTags.find((t) => /rel="alternate"/.test(t) && /href=\{LLMS_TXT_PATH\}/.test(t))
check('(B1) app/layout.tsx tem <link rel="alternate" href={LLMS_TXT_PATH}>', Boolean(llmsLink))
check('(B1) o href do link vem da constante, não de literal', !/href="\/llms\.txt"/.test(layout) && !/href=\{'\/llms\.txt'\}/.test(layout))
check("(B1) o layout importa LLMS_TXT_PATH de '@/lib/gptHandoff'", /import \{ LLMS_TXT_PATH \} from '@\/lib\/gptHandoff'/.test(layout))
check('(B1) o link tem title="llms.txt"', Boolean(llmsLink) && /title="llms\.txt"/.test(llmsLink))
// O `type` do <link> espelha o Content-Type que a rota devolve de verdade.
const ct = llmsRoute.match(/'Content-Type':\s*'([^;']+)/)
const linkType = llmsLink ? llmsLink.match(/type="([^"]+)"/) : null
check('(B2) app/llms.txt/route.ts declara um Content-Type', Boolean(ct))
check('(B2) o type do <link> é o MIME que a rota /llms.txt devolve', Boolean(ct) && Boolean(linkType) && linkType[1] === ct[1], `link=${linkType && linkType[1]} rota=${ct && ct[1]}`)
// A constante é digitada UMA vez, na lib.
check("(B3) lib/gptHandoff.ts exporta LLMS_TXT_PATH = '/llms.txt'", /export const LLMS_TXT_PATH = '\/llms\.txt'/.test(lib))
check("(B3) LLMS_TXT_PATH vive ao lado de ASSISTANT_LINK_PATH (mesmo módulo puro)", /export const ASSISTANT_LINK_PATH = '\/make'/.test(lib))
// O RSS irmão continua único — o link novo não pode ter roubado o href dele.
check('(B4) o link de RSS continua presente e único', (layout.match(/href="\/shorts-ideas\.xml"/g) ?? []).length === 1)

// ═══ (C) robots.ts: crawlers de IA liberados, /llms.txt no Allow ════════════
const iCrawlers = robots.indexOf('const AI_CRAWLERS = [')
const crawlers = iCrawlers >= 0 ? robots.slice(iCrawlers, robots.indexOf(']', iCrawlers)) : ''
check('(C1) o array AI_CRAWLERS existe', iCrawlers >= 0)
for (const bot of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended']) {
  check(`(C1) AI_CRAWLERS inclui ${bot}`, crawlers.includes(`'${bot}'`))
}
check('(C1) AI_CRAWLERS é usado como userAgent de uma regra', /userAgent:\s*AI_CRAWLERS/.test(robots))
const allowLine = robots.match(/const ALLOW = \[([^\]]*)\]/)
check('(C2) ALLOW existe', Boolean(allowLine))
check('(C2) ALLOW inclui LLMS_TXT_PATH (pela constante)', Boolean(allowLine) && /\bLLMS_TXT_PATH\b/.test(allowLine[1]))
check("(C2) robots.ts importa LLMS_TXT_PATH de '@/lib/gptHandoff'", /import \{ LLMS_TXT_PATH \} from '@\/lib\/gptHandoff'/.test(robots))
check("(C2) robots.ts NÃO redigita '/llms.txt' no código", !stripComments(robots).includes('/llms.txt'))
check('(C2) o ponteiro no Host usa a constante', /\$\{BASE\}\$\{LLMS_TXT_PATH\}/.test(robots))
const disallowLine = robots.match(/const DISALLOW = \[([^\]]*)\]/)
check('(C3) DISALLOW existe', Boolean(disallowLine))
check("(C3) DISALLOW NÃO bloqueia '/make' nem '/go' — o link e a página do roteiro ficam rastreáveis", Boolean(disallowLine) && !/'\/make'/.test(disallowLine[1]) && !/'\/go\/?'/.test(disallowLine[1]))

// ═══ (E) EXECUÇÃO — o JSON-LD que a página realmente serve ══════════════════
const require = createRequire(path.join(ROOT, 'package.json'))
const withTs = (abs) => {
  for (const c of [abs, `${abs}.ts`, `${abs}.tsx`, path.join(abs, 'index.ts')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  return null
}
let ts = null
try {
  ts = require('typescript')
} catch (e) {
  check('(E0) `typescript` do repo disponível para transpilar o .tsx', false, e && e.message)
}
if (ts) {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) {
        const f = withTs(path.join(ROOT, specifier.slice(2)))
        if (f) return { url: pathToFileURL(f).href, shortCircuit: true }
      }
      if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL && context.parentURL.startsWith('file:')) {
        const f = withTs(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))
        if (f && /\.tsx?$/.test(f)) return { url: pathToFileURL(f).href, shortCircuit: true }
      }
      if (!/^(\.|\/|file:|node:)/.test(specifier)) {
        return nextResolve(specifier, { ...context, parentURL: pathToFileURL(path.join(ROOT, 'package.json')).href })
      }
      return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      if (url.endsWith('.tsx')) {
        const src = fs.readFileSync(fileURLToPath(url), 'utf8')
        const out = ts.transpileModule(src, {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
          fileName: url,
        }).outputText
        return { format: 'module', source: out, shortCircuit: true }
      }
      return nextLoad(url, context)
    },
  })

  let rendered = null
  let facts = null
  try {
    const { default: StructuredData } = await import(pathToFileURL(path.join(ROOT, STRUCTURED)).href)
    facts = await import(pathToFileURL(path.join(ROOT, 'lib/kineoFacts.ts')).href)
    const React = require('react')
    const { renderToStaticMarkup } = require('react-dom/server')
    const html = renderToStaticMarkup(React.createElement(StructuredData))
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
    rendered = { html, scripts }
  } catch (e) {
    check('(E0) components/StructuredData.tsx RENDERIZA neste Node', false, `${process.version}: ${e && e.stack}`)
  }
  if (rendered && facts) {
    const dl = facts.ASSISTANT_DEEP_LINK_FACT
    const { scripts } = rendered
    check('(E1) três blocos ld+json renderizados', scripts.length === 3, String(scripts.length))
    const app = scripts.find((o) => o['@type'] === 'SoftwareApplication')
    const pa = app && app.potentialAction
    check('(E1) SoftwareApplication renderizado tem potentialAction', Boolean(pa))
    check('(E1) NENHUM outro nó renderizado tem potentialAction', scripts.filter((o) => o.potentialAction).length === 1)
    if (pa) {
      const expected = `${dl.url}?script={script}&duration={duration}&engine={engine}`
      check('(E2) urlTemplate FINAL é exatamente https://www.usekineo.com/make?script={script}&duration={duration}&engine={engine}', pa.target && pa.target.urlTemplate === 'https://www.usekineo.com/make?script={script}&duration={duration}&engine={engine}', pa.target && pa.target.urlTemplate)
      check('(E2) urlTemplate == dl.url + as três chaves do exemplo publicado', pa.target && pa.target.urlTemplate === expected)
      const vars = [...(pa.target.urlTemplate || '').matchAll(/\{(\w+)\}/g)].map((m) => m[1])
      check('(E2) toda variável do template é um parâmetro que /make valida', vars.length > 0 && vars.every((v) => v in dl.params), vars.join(','))
      check('(E2) httpMethod renderizado = método do fato', pa.target.httpMethod === dl.method)
      check("(E2) target.@type renderizado = 'EntryPoint'", pa.target['@type'] === 'EntryPoint')
      check('(E3) description renderizada === dl.behavior (verbatim)', pa.description === dl.behavior)
      check('(E4) result.@type renderizado NÃO é VideoObject', pa.result && pa.result['@type'] !== 'VideoObject', pa.result && pa.result['@type'])
      check("(E4) result.@type renderizado = 'CreativeWork'", pa.result && pa.result['@type'] === 'CreativeWork')
      check("(E4) object.@type renderizado = 'CreativeWork'", pa.object && pa.object['@type'] === 'CreativeWork')
      check('(E5) o JSON-LD renderizado não contém "<" cru (escape do jsonLd preservado)', !rendered.html.replace(/<\/?script[^>]*>/g, '').includes('<'))
    }
  }
}

// ── (D) FRONTEIRA SERVIDOR/CLIENTE ─────────────────────────────────────────
// POR QUE ESTE BLOCO EXISTE: ao ganhar o potentialAction, StructuredData.tsx
// passou a importar ASSISTANT_DEEP_LINK_FACT, que arrasta lib/kineoFacts ->
// lib/gptHandoff -> node:crypto. Hoje o único importador é app/layout.tsx
// (servidor) e está tudo bem. No dia em que alguém importar este componente de
// um arquivo 'use client', o `tsc --noEmit` continua VERDE e o build da Vercel
// quebra — é lição registrada nesta casa, não hipótese.
//
// Por que a trava é ESTA e não um `import 'server-only'`: o pacote server-only
// NÃO está em node_modules deste projeto (só resolve dentro do bundler do
// Next), então aquela linha derrubaria o bloco (E) — que é a prova mais
// valiosa deste arquivo, a que renderiza o componente de verdade. Um guardião
// que desliga a própria prova para se proteger não protege nada.
{
  const raiz = process.cwd()
  const alvos = []
  const varrer = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      if (nome === 'node_modules' || nome === '.next' || nome === '.git') continue
      const full = path.join(dir, nome)
      const st = fs.statSync(full)
      if (st.isDirectory()) varrer(full)
      else if (/\.(ts|tsx)$/.test(nome)) alvos.push(full)
    }
  }
  for (const base of ['app', 'components', 'lib']) {
    const d = path.join(raiz, base)
    if (fs.existsSync(d)) varrer(d)
  }
  const importaStructuredData = (txt) =>
    /^\s*import\s[^\n]*from\s+['"](?:@\/components\/StructuredData|\.{1,2}\/(?:[\w./-]*\/)?StructuredData)['"]/m.test(txt)
  const ehUseClient = (txt) =>
    /^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/|\s)*['"]use client['"]/.test(txt)

  const importadores = []
  const clientesInfratores = []
  for (const f of alvos) {
    const txt = fs.readFileSync(f, 'utf8')
    if (!importaStructuredData(txt)) continue
    const rel = f.slice(raiz.length + 1).replace(/\\/g, '/')
    importadores.push(rel)
    if (ehUseClient(txt)) clientesInfratores.push(rel)
  }
  check('(D1) a varredura enxerga arquivos (o denominador não é zero)', alvos.length > 50, alvos.length + ' arquivos .ts/.tsx')
  check('(D2) alguém IMPORTA StructuredData (senão quem está quebrado é o regex, não o mundo)', importadores.length >= 1, importadores.join(', '))
  check("(D3) NENHUM arquivo 'use client' importa StructuredData", clientesInfratores.length === 0, clientesInfratores.join(', ') || 'nenhum')
  check('(D4) o importador é o layout raiz (servidor)', importadores.includes('app/layout.tsx'), importadores.join(', '))
}


console.log(`\ndescoberta-assistente: ${pass + fails.length} verificações, ${fails.length} falhas`)
for (const f of fails) console.log(`  ✗ ${f}`)
process.exit(fails.length ? 1 : 0)
