// KINEO-EDITOR-NO-MAPA-2026-09-07 — guardião: /tools/editor tem superfície.
//
// O DEFEITO: em 07/09 ~01:50 BRT, /tools/editor respondia 200 em produção
// (46 KB, título próprio, canonical, sem noindex, sem login) e não estava no
// app/sitemap.ts nem aparecia UMA vez no /llms.txt. Quarta reincidência do
// erro "peça publicada sem superfície" (memórias peca-sem-superficie-nao-existe
// e aviso-gravado-recurso-descartado). Página que buscador e motor de resposta
// não conseguem achar mede zero.
//
// O QUE ELE PROVA:
//   (a) /tools/editor está no array routes[] do sitemap, com prioridade igual à
//       das ferramentas gratuitas irmãs e nunca acima do hub /tools;
//   (b) /tools/editor está linkado no app/llms.txt/route.ts DENTRO da seção
//       "## Free public tools that need no account and no card" — a menção vem
//       DEPOIS desse heading e ANTES do próximo `## `;
//   (c) /tools continua nos dois (não regredimos o hub);
//   (d) LAST_MODIFIED do sitemap não é anterior à data da entrada nova;
//   (e) cada fato da linha do llms.txt tem dono no código: ferramentas e limites
//       importados de lib/videoEditing/settings.ts (módulo puro), "nada é
//       enviado" provado pela ausência de fetch/FormData/XHR no editor,
//       "1280 px" e "MP4 ou WebM" presentes no código, zero preço/crédito
//       digitado.
//
// O QUE ELE NÃO PROMETE: tráfego. Só prova que a página passou a ser achável.
//
// NÃO entra em STATIC_ROUTES de test-llms-paginas-citadas.mjs de propósito:
// aquela lista exige linha em "## Key pages" com "Cite this page for"; esta
// página vive na seção de ferramentas gratuitas, onde o formato é outro. Os
// dois guardiões não brigam: aquele nunca olha esta seção.
//
// Lê os arquivos com readFileSync (nunca import com alias `@/` — 72 testes de
// scripts/ morrem no resolver antes da primeira verificação). CRLF normalizado
// na leitura: o checkout do Windows já derrubou regex de duas linhas aqui.

import { existsSync, readFileSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
// Corpo sem comentários: uma rota citada num comentário não é um link.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')

const ROUTE = '/tools/editor'
const HUB = '/tools'
const TAG = 'KINEO-EDITOR-NO-MAPA'
const SITEMAP_PATH = 'app/sitemap.ts'
const LLMS_PATH = 'app/llms.txt/route.ts'
const SETTINGS_PATH = 'lib/videoEditing/settings.ts'
const EDITOR_LIB_PATH = 'lib/videoEditing/browserEditor.ts'
const EDITOR_UI_PATH = 'app/tools/editor/VideoEditor.tsx'
const PAGE_PATH = 'app/tools/editor/page.tsx'

const sitemapRaw = read(SITEMAP_PATH)
const sitemap = stripComments(sitemapRaw)
const llmsRaw = read(LLMS_PATH)
const llms = stripComments(llmsRaw)
const settingsRaw = existsSync(SETTINGS_PATH) ? read(SETTINGS_PATH) : ''
const settings = stripComments(settingsRaw)
const editorLib = existsSync(EDITOR_LIB_PATH) ? stripComments(read(EDITOR_LIB_PATH)) : ''
const editorUi = existsSync(EDITOR_UI_PATH) ? stripComments(read(EDITOR_UI_PATH)) : ''
const page = existsSync(PAGE_PATH) ? stripComments(read(PAGE_PATH)) : ''

let pass = 0
const fails = []
const check = (label, ok, detail) => {
  if (ok) { pass++; return }
  fails.push(`${label}${detail ? ` — ${detail}` : ''}`)
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ── 0. a página existe e é indexável ────────────────────────────────────────
check(`${ROUTE}: existe app${ROUTE}/page.tsx`, existsSync(PAGE_PATH))
check(`${ROUTE}: a página declara canonical https://www.usekineo.com${ROUTE}`, page.includes(`canonical: 'https://www.usekineo.com${ROUTE}'`))
check(`${ROUTE}: a página NÃO pede noindex`, !/noindex/i.test(page))

// ── (a) sitemap ─────────────────────────────────────────────────────────────
const routeEntry = (route) =>
  sitemap.match(new RegExp(`\\{\\s*path:\\s*'${esc(route)}'\\s*,\\s*priority:\\s*([\\d.]+)\\s*,\\s*freq:\\s*'(\\w+)'`))
const editorEntry = routeEntry(ROUTE)
check(`${ROUTE}: está no array routes[] do sitemap (fora de comentário)`, Boolean(editorEntry))
const hubEntry = routeEntry(HUB)
// (c) o hub continua lá
check(`${HUB}: continua no array routes[] do sitemap`, Boolean(hubEntry))
const siblingEntry = routeEntry('/free-hook-generator')
check('/free-hook-generator (ferramenta gratuita irmã) continua no sitemap — é a régua da prioridade', Boolean(siblingEntry))
if (editorEntry && hubEntry) {
  check(
    `${ROUTE}: prioridade (${editorEntry[1]}) não passa a do hub ${HUB} (${hubEntry[1]})`,
    Number(editorEntry[1]) <= Number(hubEntry[1]),
  )
}
if (editorEntry && siblingEntry) {
  check(
    `${ROUTE}: prioridade (${editorEntry[1]}) igual à da ferramenta gratuita irmã (${siblingEntry[1]})`,
    Number(editorEntry[1]) === Number(siblingEntry[1]),
  )
  check(`${ROUTE}: freq '${editorEntry[2]}' igual à da irmã ('${siblingEntry[2]}')`, editorEntry[2] === siblingEntry[2])
}
check(
  `${ROUTE}: a entrada do sitemap vem com o comentário de convenção ${TAG}-<DATA>`,
  new RegExp(`//\\s*${TAG}-\\d{4}-\\d{2}-\\d{2}[\\s\\S]{0,900}path:\\s*'${esc(ROUTE)}'`).test(sitemapRaw),
)

// ── (d) LAST_MODIFIED não é anterior à entrada nova ─────────────────────────
const tagDates = [...sitemapRaw.matchAll(new RegExp(`${TAG}-(\\d{4}-\\d{2}-\\d{2})`, 'g'))].map((m) => m[1])
check(`sitemap: a tag ${TAG}-<DATA> aparece pelo menos uma vez`, tagDates.length > 0)
const entryDate = tagDates.length ? tagDates.slice().sort().at(-1) : null
const lastModified = sitemap.match(/const LAST_MODIFIED = new Date\('(\d{4}-\d{2}-\d{2})T[^']*'\)/)
check('sitemap: LAST_MODIFIED é uma data ISO legível', Boolean(lastModified))
if (entryDate && lastModified) {
  check(
    `sitemap: LAST_MODIFIED (${lastModified[1]}) não é anterior à entrada nova (${entryDate})`,
    lastModified[1] >= entryDate,
  )
}

// ── (b) llms.txt: dentro da seção de ferramentas gratuitas ─────────────────
const HEADING = '## Free public tools that need no account and no card'
const headingAt = llms.indexOf(`\n${HEADING}\n`)
check(`llms.txt: a seção "${HEADING}" existe`, headingAt !== -1)
const section = llms.match(new RegExp(`${esc(HEADING)}\\n[\\s\\S]*?(?=\\n## )`))
check('llms.txt: a seção de ferramentas gratuitas termina num próximo "## " (é delimitável)', Boolean(section))
const sectionBody = section ? section[0] : ''

// A linha é montada numa constante (editorLine) e emitida na seção via
// ${editorLine}. Provar as duas pontas: a constante aponta para ${BASE}/tools/editor
// e a emissão está entre o heading e o próximo "## ".
const editorLineDef = llms.match(/const editorLine =\n([\s\S]*?)\n\n/)
check('llms.txt: existe a constante editorLine (fora de comentário)', Boolean(editorLineDef))
const editorLineSrc = editorLineDef ? editorLineDef[1] : ''
check(
  `llms.txt: editorLine é um link markdown para \${BASE}${ROUTE}`,
  new RegExp(`- \\[[^\\]]+\\]\\(\\$\\{BASE\\}${esc(ROUTE)}\\):`).test(editorLineSrc),
)
check('llms.txt: ${editorLine} é emitido DENTRO da seção de ferramentas gratuitas', sectionBody.includes('${editorLine}'))
if (headingAt !== -1 && sectionBody) {
  const emitAt = llms.indexOf('${editorLine}')
  const nextHeadingAt = llms.indexOf('\n## ', headingAt + 1)
  check('llms.txt: a emissão vem DEPOIS do heading da seção', emitAt > headingAt)
  check('llms.txt: a emissão vem ANTES do próximo "## "', nextHeadingAt !== -1 && emitAt < nextHeadingAt)
}
check(`llms.txt: ${ROUTE} aparece UMA vez fora de comentário (não digitado em dois lugares)`, (llms.match(new RegExp(esc(ROUTE), 'g')) || []).length === 1)
// (c) o hub continua linkado
check(`llms.txt: ${HUB} continua linkado (\${BASE}${HUB})`, new RegExp(`\\$\\{BASE\\}${esc(HUB)}\\)`).test(llms))
check('llms.txt: a fronteira "do not describe any of them as producing a video" segue intacta (guardião do planner exige)', llms.includes('do not describe\nany of them as producing a video'))
check('llms.txt: a fronteira nomeia o editor como exceção que devolve CÓPIA, não vídeo gerado', /browser video editor is the one\nexception[\s\S]{0,200}COPY/.test(llms))

// ── (e) cada fato da linha tem dono no código ───────────────────────────────
check(
  "llms.txt: importa EDITING_TOOLS, MAX_FILE_BYTES e MAX_CLIP_SECONDS de '@/lib/videoEditing/settings'",
  /import\s*\{\s*EDITING_TOOLS\s*,\s*MAX_FILE_BYTES\s*,\s*MAX_CLIP_SECONDS\s*\}\s*from\s*'@\/lib\/videoEditing\/settings'/.test(llms),
)
check(`${SETTINGS_PATH}: é módulo puro (sem import — a rota é force-static)`, settings.length > 0 && !/^import\s/m.test(settings))
check(`${SETTINGS_PATH}: não é client component ('use client')`, !/^['"]use client['"]/m.test(settingsRaw))
check('llms.txt: o número de ferramentas vem de EDITING_TOOLS.length, não digitado', editorLineSrc.includes('${EDITING_TOOLS.length}'))
check('llms.txt: os nomes das ferramentas vêm de EDITING_TOOLS.map(...name)', /EDITING_TOOLS\.map\(\(tool\)\s*=>\s*tool\.name\)/.test(editorLineSrc))
check('llms.txt: o limite em MB vem de MAX_FILE_BYTES', editorLineSrc.includes('MAX_FILE_BYTES / (1024 * 1024)'))
check('llms.txt: o limite em minutos vem de MAX_CLIP_SECONDS', editorLineSrc.includes('MAX_CLIP_SECONDS / 60'))
for (const id of ['trim', 'resize', 'speed', 'mute', 'text']) {
  check(`${SETTINGS_PATH}: EDITING_TOOLS tem a ferramenta '${id}'`, new RegExp(`id:\\s*'${id}'`).test(settings))
}
check(`${SETTINGS_PATH}: o teto de 1280 px na aresta longa existe (a linha o cita)`, /Math\.min\(1280,/.test(settings))
check(`${EDITOR_LIB_PATH}: exporta MP4 ou WebM conforme o navegador (a linha o cita)`, /video\/mp4/.test(editorLib) && /video\/webm/.test(editorLib))
check(`${EDITOR_LIB_PATH}: exporta com MediaRecorder + canvas (a linha o cita)`, /MediaRecorder/.test(editorLib) && /captureStream/.test(editorLib))
const uploadSignal = /\bfetch\s*\(|XMLHttpRequest|FormData|['"`]\/api\//
check(`${EDITOR_LIB_PATH}: NÃO envia nada a servidor (sem fetch/XHR/FormData//api/)`, editorLib.length > 0 && !uploadSignal.test(editorLib))
check(`${EDITOR_UI_PATH}: NÃO envia nada a servidor (sem fetch/XHR/FormData//api/)`, editorUi.length > 0 && !uploadSignal.test(editorUi))
check(`${EDITOR_UI_PATH}: a UI promete "No upload" ao cliente (a linha do llms.txt repete a promessa)`, editorUi.includes('No upload.'))
const price = editorLineSrc.match(/\$\s?\d[\d.,]*/)
check('llms.txt: nenhum preço em dólar digitado na linha', !price, price ? `achado "${price[0]}"` : undefined)
const credits = editorLineSrc.match(/\b\d+\s*credits?\b/i)
check('llms.txt: nenhum "N credits" digitado na linha', !credits, credits ? `achado "${credits[0]}"` : undefined)
check('llms.txt: a linha NÃO chama o editor de gerador (diz que não gera footage/voice/captions)', editorLineSrc.includes('does not generate footage, voice or captions'))

// ── resultado ──────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n❌ ${fails.length} REPROVAÇÃO(ÕES) — ${ROUTE} sem superfície:\n`)
  fails.forEach((f) => console.error(`   · ${f}`))
  console.error(`\n   ${pass} verificações passaram.\n`)
  process.exit(1)
}
console.log(`✅ test-editor-no-mapa: ${pass} verificações passaram.`)
