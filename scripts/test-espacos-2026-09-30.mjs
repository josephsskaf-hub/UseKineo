// KINEO-ESPACOS-2026-09-30 — guardião do "Espaços" (lib/spaces/spaces.ts + rotas + tela).
// Fundador (30/09): foto do espaço vazio + "o que vai dentro" (Starbucks, Burger King, apartamento decorado) → espaço
// pronto em foto e vídeo antes → depois, com pesquisa de curadoria.
// Prova: (1) o prompt leva a régua "mantenha a arquitetura", a curadoria e os pedidos; (2) a montagem tem o selo de IA
// do primeiro ao último quadro, "Antes" → fusão → "Depois" por foto e assinatura "Apresentado por" (nunca "decorado
// por" terceiros); (3) só propriedades do Creatomate já exercitadas; (4) posse da mídia; (5) curadoria limpa;
// (6) interruptor e travas nas rotas e na página; (7) mutantes. Estilo readFileSync + transpile.
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
const UID = 'e92d81bf-0068-46c3-8de7-1f67e2006756'
const ORIGIN = 'https://abc.supabase.co'
const pair = (i) => ({ beforeUrl: `${ORIGIN}/storage/v1/object/public/avatars/${UID}/antes-${i}.jpg`, clipUrl: `${ORIGIN}/storage/v1/object/public/renders/clips/${UID}/c${i}.mp4` })
const ALLOWED_KEYS = new Set(['type', 'track', 'time', 'duration', 'x', 'y', 'width', 'height', 'path', 'fill_color', 'source', 'fit', 'animations', 'enter_transition', 'loop', 'trim_start', 'volume', 'text', 'x_anchor', 'y_anchor', 'font_family', 'font_size', 'font_weight', 'background_color', 'background_x_padding', 'background_y_padding', 'border_radius'])

function problems(M) {
  const p = []
  // (1) prompt
  const pr = M.buildStagingPrompt({ description: 'Starbucks coffee shop', kind: 'food', brief: ['deep green accents', 'warm wood panels'], notes: 'counter on the left' })
  if (!pr.includes(M.SPACES_KEEP_RULE)) p.push('prompt sem a régua "mantenha a arquitetura"')
  if (!/EXACT same camera position/.test(M.SPACES_KEEP_RULE) || !/column/.test(M.SPACES_KEEP_RULE)) p.push('régua perdeu câmera/colunas')
  if (!pr.includes('deep green accents; warm wood panels') || !pr.includes('counter on the left') || !pr.includes('Starbucks coffee shop')) p.push('prompt perdeu curadoria, pedido ou descrição')
  if (!/no people/.test(M.buildStagingPrompt({ description: 'japandi apartment', kind: 'home', brief: [] }))) p.push('casa decorada ganhou gente')
  // (2)+(3) montagem
  let src
  try { src = M.buildSpacesMontageSource({ pairs: [pair(1), pair(2), pair(3)], signature: 'Construtora X', contact: '(11) 9999-0000', fontFamily: 'Montserrat' }) } catch (e) { return ['montagem quebrou: ' + e.message] }
  const els = src.elements
  const seal = els.filter((e) => e.type === 'text' && e.text === M.SPACES_DISCLAIMER)
  if (seal.length !== 1 || seal[0].time !== 0 || seal[0].duration !== src.duration) p.push('selo de IA não cobre o vídeo inteiro')
  if (seal.length && seal[0].track !== Math.max(...els.map((e) => e.track))) p.push('selo de IA não está por cima de tudo')
  if (!/IA/.test(M.SPACES_DISCLAIMER) || !/sem vínculo com as marcas/.test(M.SPACES_DISCLAIMER)) p.push('selo perdeu "IA" ou "sem vínculo com as marcas"')
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
  if (els.filter((e) => e.text === 'ANTES').length !== 3 || els.filter((e) => e.text === 'DEPOIS').length !== 3) p.push('rótulos Antes/Depois faltando')
  if (!els.some((e) => e.text === 'Apresentado por Construtora X') || !els.some((e) => e.text === '(11) 9999-0000')) p.push('cartão final sem assinatura/contato')
  if (JSON.stringify(src).match(/decorad|projetad|designed by|decorated by/i)) p.push('montagem atribui autoria a terceiros')
  for (const e of els) for (const k of Object.keys(e)) if (!ALLOWED_KEYS.has(k)) p.push(`propriedade nunca exercitada: ${k}`)
  if (!(src.duration > 20 && src.duration < 26)) p.push(`duração estranha ${src.duration}`)
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
  // (5) curadoria
  const b = M.parseSpaceBrief('1. Deep green **siren** logo on the wall [site](https://x.com)\n- Warm wood panels\n- warm wood panels\n• ok\n' + Array.from({ length: 12 }, (_, i) => `- detail number ${i}`).join('\n'))
  if (b[0] !== 'Deep green siren logo on the wall site' || b[1] !== 'Warm wood panels' || b.length !== 8 || b.some((x) => /https?:|\*\*/.test(x))) p.push(`curadoria mal limpa ${JSON.stringify(b.slice(0, 3))}`)
  if (M.signatureLine('  ') !== '' || M.signatureLine('Ana') !== 'Apresentado por Ana') p.push('assinatura errada')
  if (M.SPACES_PUBLIC !== false) p.push('Espaços aberto para todos sem o ok do fundador')
  return p
}

const M = load(SRC)
const pr = problems(M)
ok(pr.length === 0, `(1-5) prompt, selo, antes→depois, assinatura, propriedades, posse, curadoria (${pr.join('; ') || 'ok'})`)
ok(!/^\s*import\s/m.test(SRC), '(0) lib pura')
const brief = read('app/api/spaces/brief/route.ts')
const mont = read('app/api/spaces/montage/route.ts')
const page = read('app/(dashboard)/spaces/page.tsx')
const client = read('app/(dashboard)/spaces/SpacesClient.tsx')
ok(/spacesVisibleFor\(SPACES_PUBLIC, isAdsInternalEmail\(user\.email\)\)/.test(brief) && /spacesVisibleFor\(SPACES_PUBLIC, isAdsInternalEmail\(user\.email\)\)/.test(mont) && /spacesVisibleFor\(SPACES_PUBLIC, isAdsInternalEmail\(user\.email\)\)/.test(page), '(6a) interruptor na página e nas duas rotas')
ok(brief.indexOf('moderateContent(') > 0 && brief.indexOf('moderateContent(') < brief.indexOf('openai.responses.create('), '(6b) pedido moderado ANTES da pesquisa paga')
ok(/cap\.count \?\? 0\) >= SPACES_RESEARCH_DAILY_CAP/.test(brief) && brief.indexOf('SPACES_RESEARCH_DAILY_CAP') < brief.indexOf('openai.responses.create('), '(6c) teto diário antes da pesquisa')
ok(/!isOwnedSpaceAssetUrl\(p\?\.before_url[^)]*\) \|\| !isOwnedSpaceAssetUrl\(p\?\.clip_url/.test(mont), '(6d) montagem só aceita mídia da própria conta')
ok(/\.eq\('name', 'spaces_montage_submitted'\)\s*\n\s*\.eq\('metadata->>render_id', id\)/.test(mont) && mont.indexOf("'spaces_montage_submitted')") < mont.indexOf('pollCreatomateRender(id)'), '(6e) o GET só consulta render de quem enviou')
ok(/persistRenderAssets\(/.test(mont), '(6f) vídeo final copiado para o nosso storage')
ok(/id="spaces-rights"/.test(client) && /disabled=\{!!busy \|\| !rights/.test(client), '(6g) gerar exige a autorização das fotos')
ok(/Apresentado por/.test(client) && !/decorado por|projetado por/i.test(client), '(6h) a tela só oferece "Apresentado por"')

// (7) mutantes
ok(problems(load(SRC.replace("    SPACES_KEEP_RULE,\n    brief.length", "    brief.length"))).length > 0, '(M1) prompt sem a régua de arquitetura → vermelho')
ok(problems(load(SRC.replace("type: 'text', track: 5, time: 0, duration: total, text: SPACES_DISCLAIMER,", "type: 'text', track: 5, time: 0, duration: shotsSeconds, text: SPACES_DISCLAIMER,"))).length > 0, '(M2) selo some no cartão final → vermelho')
ok(problems(load(SRC.replace("  return s ? `Apresentado por ${s}` : ''", "  return s ? `Decorado por ${s}` : ''"))).length > 0, '(M3) "Decorado por" → vermelho')
ok(problems(load(SRC.replace("      enter_transition: { type: 'fade', duration: SPACES_REVEAL_SECONDS },", "      blend_mode: 'overlay',"))).length > 0, '(M4) propriedade nunca exercitada → vermelho')
ok(problems(load(SRC.replace(' && p.length > prefix.length)', ')'))).length > 0, '(M5) pasta sem arquivo aceita como mídia → vermelho')
ok(problems(load(SRC.replace('export const SPACES_PUBLIC = false', 'export const SPACES_PUBLIC = true'))).length > 0, '(M6) aberto para todos sem ok → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
