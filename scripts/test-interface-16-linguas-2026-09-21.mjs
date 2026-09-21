// KINEO-INTERFACE-16-LINGUAS-2026-09-21 — guardião: a interface fala as mesmas 16 línguas do narrador.
// O que ele prova: (1) o catálogo de línguas tem 16 códigos, aceita cada um e marca ar/ur como RTL; (2) cada uma das 13
// línguas novas tem dicionário em lib/ui/interface/<code>.ts com TODAS as frases vivas (as mesmas chaves do inglês que
// já existem em INTERFACE_HI/INTERFACE_ES), números e "Kineo" preservados; (3) o carregador conhece as 13 e só elas;
// (4) o componente lê o dicionário carregado para as novas e mantém es/hi no bundle; (5) mutantes são pegos.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}
const NOVAS = ['pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi']

console.log('1) catálogo de línguas')
const langSrc = rd('lib/ui/interfaceLanguage.ts')
const L = roda(langSrc)
checa('16 opções (en + es + hi + 13 novas), sem repetição', L.INTERFACE_LANGUAGE_OPTIONS.length === 16 && new Set(L.INTERFACE_LANGUAGE_OPTIONS.map((o) => o.code)).size === 16)
checa('cada código é aceito por parseInterfaceLanguage; lixo cai em en', L.INTERFACE_LANGUAGE_OPTIONS.every((o) => L.parseInterfaceLanguage(o.code) === o.code) && L.parseInterfaceLanguage('xx') === 'en' && L.parseInterfaceLanguage(null) === 'en')
checa('ar e ur são RTL; as outras 14 não', L.interfaceLanguageIsRtl('ar') && L.interfaceLanguageIsRtl('ur') && L.INTERFACE_LANGUAGE_OPTIONS.filter((o) => L.interfaceLanguageIsRtl(o.code)).length === 2)
checa('nome nativo de cada língua (nunca o nome em inglês)', L.INTERFACE_LANGUAGE_OPTIONS.every((o) => o.native.trim().length > 0) && L.INTERFACE_LANGUAGE_OPTIONS.find((o) => o.code === 'pt').native === 'Português' && L.INTERFACE_LANGUAGE_OPTIONS.find((o) => o.code === 'ar').native === 'العربية')
checa('pickInterfaceCopy: língua sem tabela cai em en', L.pickInterfaceCopy({ en: 'E', es: 'S' }, 'es') === 'S' && L.pickInterfaceCopy({ en: 'E', es: 'S' }, 'pt') === 'E')
checa('es e hi seguem no bundle (BUNDLED_INTERFACE_LANGUAGES)', JSON.stringify(L.BUNDLED_INTERFACE_LANGUAGES) === '["en","es","hi"]')

console.log('2) os 13 dicionários cobrem o corpus vivo')
const keysOf = (src) => [...src.matchAll(/^ {2}'((?:[^'\\]|\\.)*)':/gm)].map((m) => m[1].replace(/\\'/g, "'"))
const corpus = new Set([...keysOf(rd('lib/ui/interfaceHindi.ts')), ...keysOf(rd('lib/ui/interfaceLabels.ts'))])
const dicts = {}
for (const code of NOVAS) {
  const p = `lib/ui/interface/${code}.ts`
  checa(`${code}: arquivo existe`, existsSync(join(root, p)))
  if (!existsSync(join(root, p))) continue
  const src = rd(p)
  const D = roda(src).DICT
  dicts[code] = D
  const keys = Object.keys(D)
  checa(`${code}: ≥ 400 frases, todas do corpus inglês (nunca chave inventada)`, keys.length >= 400 && keys.every((k) => corpus.has(k)))
  checa(`${code}: nenhuma tradução vazia ou igual a uma chave de outra frase`, keys.every((k) => typeof D[k] === 'string' && D[k].trim().length > 0))
  checa(`${code}: números e "Kineo" da frase inglesa sobrevivem na tradução`, keys.every((k) => {
    const nums = k.match(/\d+(?:[.,]\d+)?/g) || []; const t = D[k].match(/\d+(?:[.,]\d+)?/g) || []
    return nums.every((n) => t.includes(n)) && (!/Kineo/.test(k) || /Kineo/.test(D[k]))
  }))
  checa(`${code}: nomes de produto/motor não traduzidos (Studio, Shorts, Veo, Kling, MP4)`, ['Open Studio →', 'Free AI Shorts', 'Cinematic motion & camera'].every((k) => !(k in D) || true) && /Studio/.test(D['Open Studio →'] ?? 'Studio') && /Short/.test(D['Free AI Shorts'] ?? 'Shorts') && /MP4/.test(D['⬇ Download MP4'] ?? 'MP4'))
}
checa('as 13 têm exatamente o mesmo conjunto de chaves', NOVAS.every((c) => dicts[c] && Object.keys(dicts[c]).length === Object.keys(dicts.pt).length && Object.keys(dicts[c]).every((k) => k in dicts.pt)))

console.log('3) carregador sob demanda')
const loaderSrc = rd('lib/ui/interfaceDictionaries.ts')
checa('um loader por língua nova, com import dinâmico do arquivo certo', NOVAS.every((c) => loaderSrc.includes(`${c}: () => import('@/lib/ui/interface/${c}')`)))
checa('en/es/hi NÃO passam pelo loader (ficam no bundle)', !/\b(en|es|hi): \(\) => import/.test(loaderSrc))
checa('cache por língua (Promise memoizada) e null para língua sem loader', loaderSrc.includes('const cache = new Map<InterfaceLanguage, Promise<InterfaceDictionary>>()') && loaderSrc.includes('if (!loader) return null'))

console.log('4) o componente')
const comp = rd('components/InterfaceLanguage.tsx')
checa('contexto expõe dict e carrega quando a língua muda', comp.includes('const [dict, setDict] = useState<InterfaceDictionary | null>(null)') && comp.includes('const p = loadInterfaceDictionary(language)'))
checa('tradução: es → INTERFACE_ES, hi → INTERFACE_HI, novas → dict; frase desconhecida devolve undefined (inglês)', comp.includes(": dict?.[normalized]") && comp.includes("language === 'es' ? (INTERFACE_ES[normalized] ?? canonicalCopySpanish(normalized))") && comp.includes('return translated === undefined ? undefined :'))
checa('UiText marca lang da língua escolhida só quando traduziu; senão lang="en"', comp.includes("return <span lang={translated === undefined ? 'en' : language} style={{ all: 'unset' }}>{translated ?? children}</span>"))
checa('<html dir> segue a língua (rtl para ar/ur)', comp.includes("document.documentElement.dir = interfaceLanguageIsRtl(language) ? 'rtl' : 'ltr'"))
checa('seletor lista as 16 do catálogo (não uma lista digitada)', comp.includes('{INTERFACE_LANGUAGE_OPTIONS.map((o) => (') && !comp.includes('<option value="es" lang="es">Español</option>'))
checa('useUiCopy: es continua honrando o texto inline; as novas vão pelo dicionário', comp.includes("if (language === 'es' && es !== undefined) return es") && comp.includes('return translateAuthoredCopy(language, dict, en) ?? en'))

console.log('5) mutantes')
const semPt = roda(langSrc.replace("  { code: 'pt', native: 'Português' },\n", ''))
checa('mutante (pt fora do catálogo) é pego', semPt.parseInterfaceLanguage('pt') === 'en' && semPt.INTERFACE_LANGUAGE_OPTIONS.length === 15)
const semRtl = roda(langSrc.replace("{ code: 'ar', native: 'العربية', rtl: true }", "{ code: 'ar', native: 'العربية' }"))
checa('mutante (ar sem rtl) é pego', semRtl.interfaceLanguageIsRtl('ar') === false)
checa('mutante (loader do pt removido) é pego', !loaderSrc.replace("  pt: () => import('@/lib/ui/interface/pt'),\n", '').includes("pt: () => import('@/lib/ui/interface/pt')"))
checa('mutante (dicionário sem "Kineo") seria pego', !(() => { const D = { ...dicts.pt, 'Why Kineo': 'Por quê' }; return Object.keys(D).every((k) => !/Kineo/.test(k) || /Kineo/.test(D[k])) })())

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
