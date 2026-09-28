// KINEO-VITRINE-SEM-CLIENTE-2026-09-28 — decisão do fundador em 28/09 ("B, vai para as duas"): o filme c87c3a25
// ("The world's untouched natural wonders", Kineo 1, 14/08) é de uma conta EXTERNA gratuita, marcado por engano como do
// fundador, e SAI de toda a vitrine. Entra no mesmo papel (exemplo de Kineo 1) o render do fundador 0ab3e871 (02/09, 40 s,
// "The town in Norway where the sun disappears for two months every winter"; dono conferido no banco em 28/09).
// Prova, por readFileSync + varredura e executando o catálogo:
//   1. nenhum arquivo de app/ lib/ components/ (nem os textos de public/) cita c87c3a25;
//   2. 0ab3e871 está em PUBLIC_ENGINE_EXAMPLES como engine 'fast', com posse do fundador e o MP4 completo dele;
//   3. o /arena resolve o card do Kineo 1 para 0ab3e871 (prévia leve já aprovada, local e < 2 MB).
// Cada regra tem mutante que prova o vermelho.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(RAIZ, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let verdes = 0
const vermelhos = []
function check(nome, cond) {
  let ok = false
  try { ok = typeof cond === 'function' ? Boolean(cond()) : Boolean(cond) } catch (e) { nome += ` (lançou: ${e && e.message})` }
  if (ok) verdes++
  else vermelhos.push(nome)
}
const trocar = (src, de, para) => {
  if (!src.includes(de)) throw new Error(`mutante não aplicou: ${de.slice(0, 60)}`)
  return src.split(de).join(para)
}

const CLIENTE = 'c87c3a25-c3b7-4a97-8429-eb0fc98b67bc'
// Só o prefixo também não pode aparecer (um id cortado num comentário ou num nome de arquivo ainda aponta para o filme).
const CLIENTE_PREFIXO = 'c87c3a25'
const FUNDADOR = '0ab3e871-2c99-4f6e-9f3c-59773208b12e'
const FUNDADOR_MP4 = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/e92d81bf-0068-46c3-8de7-1f67e2006756/e97ea42d-f63b-4197-9cd7-e12e9a57744d.mp4'

// ── 1. varredura ─────────────────────────────────────────────────────────────────────────────────────────────────────
const CODIGO = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.md', '.txt', '.html', '.xml', '.svg', '.webmanifest'])
function arquivos(dir, soTexto) {
  const out = []
  const abs = join(RAIZ, dir)
  if (!existsSync(abs)) return out
  for (const nome of readdirSync(abs)) {
    if (nome === 'node_modules' || nome === '.next') continue
    const rel = `${dir}/${nome}`
    const st = statSync(join(RAIZ, rel))
    if (st.isDirectory()) out.push(...arquivos(rel, soTexto))
    else if (!soTexto || CODIGO.has(extname(nome).toLowerCase())) out.push(rel)
  }
  return out
}
const ALVOS = [...arquivos('app', false), ...arquivos('lib', false), ...arquivos('components', false), ...arquivos('public', true)]
const citam = (conteudo) => ALVOS.filter((rel) => (conteudo(rel) ?? '').includes(CLIENTE_PREFIXO) || rel.includes(CLIENTE_PREFIXO))
const lerTexto = (rel) => { try { return readFileSync(join(RAIZ, rel), 'latin1') } catch { return '' } }
const achados = citam(lerTexto)
check(`1 nenhum arquivo de app/ lib/ components/ (e textos de public/) cita ${CLIENTE_PREFIXO} — varridos ${ALVOS.length}` + (achados.length ? `: ${achados.join(', ')}` : ''), ALVOS.length > 500 && achados.length === 0)
check('1-mutante: o id de volta em lib/engineWall.ts fica vermelho', () => {
  const alvo = 'lib/engineWall.ts'
  const falso = trocar(rd(alvo), FUNDADOR, CLIENTE)
  return citam((rel) => (rel === alvo ? falso : lerTexto(rel))).includes(alvo)
})

// ── 2. catálogo ──────────────────────────────────────────────────────────────────────────────────────────────────────
const catalogo = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('exports', 'require', 'module', js)(module.exports, (s) => { throw new Error(`publicExamples importou ${s}`) }, module)
  return module.exports
}
const PE_SRC = rd('lib/publicExamples.ts')
const noCatalogo = (src) => {
  const pe = catalogo(src)
  const e = pe.getPublicEngineExample(FUNDADOR)
  return !!e && e.engine === 'fast' && e.ownershipEvidence === 'founder_confirmed_owned' && e.videoPath === FUNDADOR_MP4 &&
    pe.PUBLIC_ENGINE_EXAMPLES.filter((x) => x.id === FUNDADOR).length === 1 && !pe.getPublicEngineExample(CLIENTE) &&
    pe.PUBLIC_ENGINE_EXAMPLES.some((x) => x.engine === 'fast')
}
check(`2 ${FUNDADOR} está em PUBLIC_ENGINE_EXAMPLES como 'fast', posse do fundador, MP4 completo dele; ${CLIENTE_PREFIXO} não resolve`, noCatalogo(PE_SRC))
check("2-mutante: 0ab3e871 com engine 'cinematic_ai' fica vermelho", () => !noCatalogo(trocar(PE_SRC, `    id: '${FUNDADOR}',\n    title: 'The town in Norway where the sun disappears for two months every winter',\n    engine: 'fast',`, `    id: '${FUNDADOR}',\n    title: 'The town in Norway where the sun disappears for two months every winter',\n    engine: 'cinematic_ai',`)))
check('2-mutante: o id do cliente de volta no catálogo fica vermelho', () => !noCatalogo(trocar(PE_SRC, `    id: '${FUNDADOR}',`, `    id: '${CLIENTE}',`)))

// ── 3. /arena e vitrines de motor ────────────────────────────────────────────────────────────────────────────────────
const arena = rd('app/arena/page.tsx')
const arenaKineo1 = (src) => {
  const i = src.indexOf("badge: 'KINEO 1',")
  const bloco = src.slice(i, src.indexOf('},', i))
  const pe = catalogo(PE_SRC)
  const e = pe.getPublicEngineExample(FUNDADOR)
  const prev = e && (e.arenaPreviewPath ?? e.videoPath)
  const arquivo = prev && prev.startsWith('/') ? join(RAIZ, 'public', prev.slice(1)) : ''
  return i > 0 && bloco.includes(`exampleId: '${FUNDADOR}'`) && !!arquivo && existsSync(arquivo) && statSync(arquivo).size < 2_000_000
}
check('3 /arena: o card KINEO 1 aponta para 0ab3e871, com prévia leve local (< 2 MB) já aprovada', arenaKineo1(arena))
check('3-mutante: card KINEO 1 com o id do cliente fica vermelho', () => !arenaKineo1(trocar(arena, `exampleId: '${FUNDADOR}'`, `exampleId: '${CLIENTE}'`)))
const ew = rd('lib/engineWall.ts')
check('3b engineWall: 0ab3e871 abre a curadoria do Kineo 1 (CURATED.fast) e está na lista dos 20 melhores', /\n  fast: \['0ab3e871-2c99-4f6e-9f3c-59773208b12e', /.test(ew) && /\n  '0ab3e871-2c99-4f6e-9f3c-59773208b12e', \/\/ KINEO 1 — /.test(ew))
// 28/09 (revisão do passe B): o título diz "Norway" — a prévia e a capa que o /arena, as páginas de motor e
// /ai-video-generator/for tocam (arenaPreviewPath/arenaPosterPath) têm de ser cortes DESTE render, não uma amostra de
// outro filme (a do Turcomenistão tocava a cratera sob o título da Noruega).
const midiaDoProprioFilme = (src) => {
  const e = catalogo(src).getPublicEngineExample(FUNDADOR)
  return !!e && [e.arenaPreviewPath, e.arenaPosterPath].every((p) => typeof p === 'string' && p.startsWith('/') && p.includes(FUNDADOR) && existsSync(join(RAIZ, 'public', p.slice(1))))
}
check('3c a prévia e a capa do Kineo 1 são cortes do próprio 0ab3e871 (título e imagem do mesmo filme), locais e existentes', midiaDoProprioFilme(PE_SRC))
check('3c-mutante: a amostra do Turcomenistão de volta sob o título da Noruega fica vermelho', () => !midiaDoProprioFilme(trocar(PE_SRC, `arenaPreviewPath: '/previews/curation-sep07/${FUNDADOR}-v.mp4',`, "arenaPreviewPath: '/videos/example-turkmenistan.mp4',")))

console.log(`test-vitrine-sem-filme-de-cliente-2026-09-28: ${verdes} verdes, ${vermelhos.length} vermelhos`)
for (const v of vermelhos) console.log('  ✗ ' + v)
process.exit(vermelhos.length ? 1 : 0)
