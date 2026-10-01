// KINEO-ESPACOS-2026-09-30 (+ KINEO-ESPACOS-LANCAMENTO-2026-09-30) — guardião do "Espaços" (Spaces).
// Fundador (30/09): foto do espaço vazio + "o que vai dentro" (Starbucks, Burger King, apartamento decorado) → espaço
// pronto em foto e vídeo antes → depois, com pesquisa de curadoria. No lançamento: aberto para todos, tela em 16 línguas,
// vídeo sem nenhuma fala de IA (a nota "Imagem ilustrativa" é opcional), sem campo de contato.
// Prova: (1) o prompt leva a régua "mantenha a arquitetura", a curadoria e os pedidos; (2) a montagem faz "Antes" →
// fusão → "Depois" por foto, rótulos na língua de quem gera, nota opcional que NUNCA fala de IA, assinatura só
// "Apresentado por"/"Presented by" (nunca "decorado por"), sem cartão vazio; (3) só propriedades do Creatomate já
// exercitadas; (4) posse da mídia; (5) curadoria limpa; (6) 16 línguas completas; (7) travas nas rotas, na página e
// no menu; (8) mutantes. Estilo readFileSync + transpile.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const SRC = read('lib/spaces/spaces.ts')
const COPY_SRC = read('lib/spaces/spacesCopy.ts')
const UID = 'e92d81bf-0068-46c3-8de7-1f67e2006756'
const ORIGIN = 'https://abc.supabase.co'
const pair = (i) => ({ beforeUrl: `${ORIGIN}/storage/v1/object/public/avatars/${UID}/antes-${i}.jpg`, clipUrl: `${ORIGIN}/storage/v1/object/public/renders/clips/${UID}/c${i}.mp4` })
const ALLOWED_KEYS = new Set(['type', 'track', 'time', 'duration', 'x', 'y', 'width', 'height', 'path', 'fill_color', 'source', 'fit', 'animations', 'enter_transition', 'loop', 'trim_start', 'volume', 'text', 'x_anchor', 'y_anchor', 'font_family', 'font_size', 'font_weight', 'background_color', 'background_x_padding', 'background_y_padding', 'border_radius'])
const AI_WORDS = /\b(IA|AI|KI|ИИ|ШІ)\b|inteligência artificial|artificial intelligence|intelig[eê]ncia|generated|gerad[ao] por/i

function problems(M, Cp) {
  const p = []
  // (1) prompt
  const pr = M.buildStagingPrompt({ description: 'Starbucks coffee shop', kind: 'food', brief: ['deep green accents', 'warm wood panels'], notes: 'counter on the left' })
  if (!pr.includes(M.SPACES_KEEP_RULE)) p.push('prompt sem a régua "mantenha a arquitetura"')
  if (!/EXACT same camera position/.test(M.SPACES_KEEP_RULE) || !/column/.test(M.SPACES_KEEP_RULE)) p.push('régua perdeu câmera/colunas')
  if (!pr.includes('deep green accents; warm wood panels') || !pr.includes('counter on the left') || !pr.includes('Starbucks coffee shop')) p.push('prompt perdeu curadoria, pedido ou descrição')
  if (!/no people/.test(M.buildStagingPrompt({ description: 'japandi apartment', kind: 'home', brief: [] }))) p.push('casa decorada ganhou gente')
  if (M.SPACE_KINDS.some((k) => /Loja|Escrit|Apartamento ou|Outro|restaurante/.test(M.buildSpaceResearchMessages('x', k).input))) p.push('pedido da pesquisa com rótulo em português')
  // (2)+(3) montagem — pt, com assinatura e nota
  const pt = Cp.spacesVideoLabels('pt')
  let src
  try { src = M.buildSpacesMontageSource({ pairs: [pair(1), pair(2), pair(3)], signature: 'Construtora X', contact: '', fontFamily: 'Montserrat', labels: pt, showSeal: true }) } catch (e) { return ['montagem quebrou: ' + e.message] }
  const els = src.elements
  const seal = els.filter((e) => e.type === 'text' && e.text === pt.seal)
  if (seal.length !== 1 || seal[0].time !== 0 || seal[0].duration !== src.duration) p.push('nota "Imagem ilustrativa" marcada não cobre o vídeo inteiro')
  if (seal.length && seal[0].track !== Math.max(...els.map((e) => e.track))) p.push('nota não está por cima de tudo')
  const befores = els.filter((e) => e.type === 'image')
  const clips = els.filter((e) => e.type === 'video')
  if (befores.length !== 3 || clips.length !== 3) p.push('não há um Antes e um clipe por foto')
  for (let i = 0; i < clips.length; i++) {
    const b = befores[i], c = clips[i]
    if (!c.enter_transition || c.enter_transition.type !== 'fade') p.push(`clipe ${i} sem fusão`)
    if (!(c.track > b.track)) p.push(`clipe ${i} não entra por cima do Antes`)
    if (!(b.time + b.duration > c.time)) p.push(`Antes ${i} some antes da fusão`)
    if (c.volume !== '0%') p.push(`clipe ${i} com som`)
  }
  if (els.filter((e) => e.text === 'ANTES').length !== 3 || els.filter((e) => e.text === 'DEPOIS').length !== 3) p.push('rótulos Antes/Depois (pt) faltando')
  if (!els.some((e) => e.text === 'Apresentado por Construtora X')) p.push('cartão final sem a assinatura em pt')
  for (const e of els) for (const k of Object.keys(e)) if (!ALLOWED_KEYS.has(k)) p.push(`propriedade nunca exercitada: ${k}`)
  if (!(src.duration > 20 && src.duration < 26)) p.push(`duração estranha ${src.duration}`)
  // sem nota, sem assinatura (padrão do lançamento): nenhum texto além de Antes/Depois, sem cartão vazio, nada de IA
  const en = Cp.spacesVideoLabels('en')
  const clean = M.buildSpacesMontageSource({ pairs: [pair(1), pair(2)], signature: '', contact: '', fontFamily: 'x', labels: en })
  const texts = clean.elements.filter((e) => e.type === 'text').map((e) => e.text)
  if (texts.some((t) => t !== 'BEFORE' && t !== 'AFTER')) p.push(`vídeo limpo com texto a mais: ${texts.filter((t) => t !== 'BEFORE' && t !== 'AFTER').join(' | ')}`)
  if (clean.elements.filter((e) => e.type === 'shape').length !== 1 || clean.duration !== 2 * (M.SPACES_BEFORE_SECONDS + M.SPACES_CLIP_SECONDS)) p.push('sem assinatura ainda gera cartão final vazio')
  if (clean.elements[0].duration !== clean.duration) p.push('fundo preto não acompanha a duração')
  if (AI_WORDS.test(JSON.stringify(src)) || AI_WORDS.test(JSON.stringify(clean))) p.push('o vídeo fala de IA')
  if (JSON.stringify(src).match(/decorad|projetad|designed by|decorated by/i)) p.push('montagem atribui autoria a terceiros')
  let threw = 0
  try { M.buildSpacesMontageSource({ pairs: [1, 2, 3, 4, 5].map(pair), signature: '', contact: '', fontFamily: 'x' }) } catch { threw++ }
  try { M.buildSpacesMontageSource({ pairs: [{ beforeUrl: 'http://x/a.jpg', clipUrl: pair(1).clipUrl }], signature: '', contact: '', fontFamily: 'x' }) } catch { threw++ }
  if (threw !== 2) p.push('montagem aceita mais de 4 fotos ou URL sem https')
  // (4) posse
  const own = (u) => M.isOwnedSpaceAssetUrl(u, UID, ORIGIN)
  if (!own(pair(1).beforeUrl) || !own(pair(1).clipUrl) || !own(`${ORIGIN}/storage/v1/object/public/renders/images/${UID}/x.png`)) p.push('recusa mídia da própria conta')
  const bad = [
    `${ORIGIN}/storage/v1/object/public/avatars/11111111-1111-1111-1111-111111111111/a.jpg`,
    `https://evil.test/storage/v1/object/public/avatars/${UID}/a.jpg`,
    `${pair(1).beforeUrl}?x=1`,
    `${ORIGIN}/storage/v1/object/public/avatars/${UID}/../11111111-1111-1111-1111-111111111111/a.jpg`,
    `${ORIGIN}/storage/v1/object/public/avatars/${UID}/`,
    `${ORIGIN}/storage/v1/object/public/renders/${UID}/a.mp4`,
  ]
  for (const u of bad) if (own(u)) p.push(`aceitou mídia de fora: ${u.slice(-50)}`)
  // (5) curadoria e assinatura
  const b = M.parseSpaceBrief('1. Deep green **siren** logo on the wall [site](https://x.com)\n- Warm wood panels\n- warm wood panels\n• ok\n' + Array.from({ length: 12 }, (_, i) => `- detail number ${i}`).join('\n'))
  if (b[0] !== 'Deep green siren logo on the wall site' || b[1] !== 'Warm wood panels' || b.length !== 8 || b.some((x) => /https?:|\*\*/.test(x))) p.push(`curadoria mal limpa ${JSON.stringify(b.slice(0, 3))}`)
  if (M.signatureLine('  ') !== '' || M.signatureLine('Ana') !== 'Presented by Ana' || M.signatureLine('Ana', 'Apresentado por {name}') !== 'Apresentado por Ana') p.push('assinatura errada')
  if (M.SPACES_PUBLIC !== true) p.push('Espaços fechado depois do "pode subir" do fundador')
  return p
}

function copyProblems(Cp) {
  const p = []
  const keys = Object.keys(Cp.SPACES_COPY_EN)
  const langs = Object.keys(Cp.SPACES_COPY)
  if (langs.length !== 15) p.push(`línguas além do inglês: ${langs.length} ≠ 15`)
  const marks = (s) => (s.match(/\{(n|name)\}/g) || []).sort().join(',')
  for (const l of langs) {
    for (const k of keys) {
      const v = Cp.SPACES_COPY[l][k]
      if (typeof v !== 'string' || !v.trim()) { p.push(`${l}.${k} vazio`); continue }
      if (marks(v) !== marks(Cp.SPACES_COPY_EN[k])) p.push(`${l}.${k} com marcadores diferentes`)
    }
    for (const k of Object.keys(Cp.SPACES_COPY[l])) if (!keys.includes(k)) p.push(`${l}.${k} sobrando`)
    if (AI_WORDS.test(Cp.SPACES_COPY[l].seal)) p.push(`${l}.seal fala de IA`)
    if (!Cp.SPACES_COPY[l].presentedBy.includes('{name}')) p.push(`${l}.presentedBy sem {name}`)
  }
  if (Cp.spacesCopy('xx', 'title') !== 'Spaces' || Cp.spacesCopy('pt', 'title') !== 'Espaços' || Cp.spacesCopy('pt', 'redo', { n: 5 }) !== 'Refazer esta · 5 créditos') p.push('spacesCopy não cai no inglês ou não preenche {n}')
  return p
}

const M = load(SRC)
const Cp = load(COPY_SRC)
const pr = problems(M, Cp)
ok(pr.length === 0, `(1-5) prompt, antes→depois, rótulos na língua, vídeo sem IA, assinatura, propriedades, posse, curadoria (${pr.join('; ') || 'ok'})`)
const cp = copyProblems(Cp)
ok(cp.length === 0, `(6) 16 línguas completas, mesmos marcadores, nota sem IA (${cp.slice(0, 4).join('; ') || 'ok'})`)
ok(!/^\s*import\s/m.test(SRC) && !/^\s*import\s(?!type\b)/m.test(COPY_SRC), '(0) libs puras (copy só com import de tipo)')
const brief = read('app/api/spaces/brief/route.ts')
const mont = read('app/api/spaces/montage/route.ts')
const page = read('app/(dashboard)/spaces/page.tsx')
const client = read('app/(dashboard)/spaces/SpacesClient.tsx')
ok(/spacesVisibleFor\(SPACES_PUBLIC, isAdsInternalEmail\(user\.email\)\)/.test(brief) && /spacesVisibleFor\(SPACES_PUBLIC, isAdsInternalEmail\(user\.email\)\)/.test(mont) && /spacesVisibleFor\(SPACES_PUBLIC, isAdsInternalEmail\(user\.email\)\)/.test(page), '(7a) interruptor na página e nas duas rotas')
ok(brief.indexOf('moderateContent(') > 0 && brief.indexOf('moderateContent(') < brief.indexOf('openai.responses.create('), '(7b) pedido moderado ANTES da pesquisa paga')
ok(/cap\.count \?\? 0\) >= SPACES_RESEARCH_DAILY_CAP/.test(brief) && brief.indexOf('SPACES_RESEARCH_DAILY_CAP') < brief.indexOf('openai.responses.create('), '(7c) teto diário antes da pesquisa')
ok(/!isOwnedSpaceAssetUrl\(p\?\.before_url[^)]*\) \|\| !isOwnedSpaceAssetUrl\(p\?\.clip_url/.test(mont), '(7d) montagem só aceita mídia da própria conta')
ok(/\.eq\('name', 'spaces_montage_submitted'\)\s*\n\s*\.eq\('metadata->>render_id', id\)/.test(mont) && mont.indexOf("'spaces_montage_submitted')") < mont.indexOf('pollCreatomateRender(id)'), '(7e) o GET só consulta render de quem enviou')
ok(/persistRenderAssets\(/.test(mont) && /labels: spacesVideoLabels\(language\), showSeal: body\?\.seal === true/.test(mont), '(7f) vídeo no nosso storage; rótulos na língua; nota só se pedida')
ok(/id="spaces-rights"/.test(client) && /canStage = !busy && rights/.test(client), '(7g) gerar exige a autorização das fotos')
ok(/useInterfaceLanguage\(\)/.test(client) && /signature, language, seal/.test(client) && !/spaces-contact|setContact/.test(client), '(7h) tela na língua do site, manda língua e nota; sem campo de contato')
ok(!/[ãõçáéíóú]/i.test(client.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), '(7i) tela sem texto fixo em português (tudo vem do dicionário)')
const nav = read('lib/ui/workspaceNavigation.ts'), side = read('components/Sidebar.tsx'), mob = read('components/MobileNav.tsx'), land = read('app/KineoLanding.tsx'), shell = read('app/(dashboard)/DashboardShell.tsx')
const labels = JSON.parse(read('lib/ui/refinementCopy.json'))
ok(/\{ href: '\/spaces', label: 'Spaces', icon: 'spaces' \}/.test(nav) && /\n  spaces: \(/.test(side) && /href: '\/spaces'/.test(mob) && /primaryLink\('\/spaces'\)/.test(mob) && /<Link href="\/spaces" data-nav-item="more:spaces"><UiLabel>Spaces<\/UiLabel><\/Link>/.test(land) && /'\/spaces': 'Spaces'/.test(shell), '(7j) Espaços em todos os pares do menu (lateral, celular, topo do site, título)')
ok(Object.keys(labels).length === 16 && Object.values(labels).every((d) => d['Spaces'] && d['Empty space in, finished space out']), '(7k) rótulo do menu nas 16 línguas')

// (8) mutantes
ok(problems(load(SRC.replace("    SPACES_KEEP_RULE,\n    brief.length", "    brief.length")), Cp).length > 0, '(M1) prompt sem a régua de arquitetura → vermelho')
ok(problems(load(SRC.replace('  if (args.showSeal === true) elements.push({', '  if (true) elements.push({')), Cp).length > 0, '(M2) nota sempre ligada → vermelho')
ok(problems(M, load(COPY_SRC.replace("    seal: 'Imagem ilustrativa',", "    seal: 'Imagem criada com IA',"))).length > 0 || copyProblems(load(COPY_SRC.replace("    seal: 'Imagem ilustrativa',", "    seal: 'Imagem criada com IA',"))).length > 0, '(M3) nota volta a falar de IA → vermelho')
ok(problems(load(SRC.replace("      enter_transition: { type: 'fade', duration: SPACES_REVEAL_SECONDS },", "      blend_mode: 'overlay',")), Cp).length > 0, '(M4) propriedade nunca exercitada → vermelho')
ok(problems(load(SRC.replace(' && p.length > prefix.length)', ')')), Cp).length > 0, '(M5) pasta sem arquivo aceita como mídia → vermelho')
ok(problems(load(SRC.replace('  const withCard = cardLines.length > 0', '  const withCard = true')), Cp).length > 0, '(M6) cartão final vazio sem assinatura → vermelho')
ok(problems(load(SRC.replace("    elements.push(label(cleanLine(L.before, 24),", "    elements.push(label(cleanLine('ANTES', 24),")), Cp).length > 0, '(M7) rótulo fixo em português → vermelho')
ok(copyProblems(load(COPY_SRC.replace("    presentedBy: 'Presentato da {name}',", "    presentedBy: 'Presentato da',"))).length > 0, '(M8) tradução perde o {name} → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
