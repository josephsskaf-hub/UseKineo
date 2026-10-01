// KINEO-STUDIO-HEROI-2026-09-30 (+ KINEO-NAV-MCP / KINEO-NAV-MESMO-TOM) — guardião do Studio com o vídeo do motor e do
// topo do site.
// Fundador (30/09): "na lateral esquerda os ambientes de configuração, na direita o vídeo padrão do motor… não deixar
// uma tela em branco"; "tirar AI Presenter e Animate a Photo"; "colocar o MCP no menu"; "Spaces, Ads e Pricing não
// estão no mesmo tom de Vídeos e Imagens".
// Prova: (1) o servidor mapeia cada motor do seletor para os filmes DA CASA daquele motor (selo honesto: Kling 2.5 →
// cinematic_kling, nunca outro) e cada motor mapeado tem filme; (2) a direita mostra o vídeo do motor ESCOLHIDO (troca
// com o seletor; Clipe = Seedance 1.5) com "Made with <motor>"; (3) o "Revisar e gerar" fecha a coluna da esquerda;
// (4) abas só Film e Clip; (5) topo Video · Images · Spaces · Ads · MCP · Pricing, todos com a mesma cor; (6) mutantes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const PAGE = read('app/(dashboard)/studio/page.tsx')
const CLIENT = read('app/(dashboard)/studio/StudioClient.tsx')
const EXAMPLES = read('lib/publicExamples.ts')
const LAND = read('app/KineoLanding.tsx')
const THEME = read('app/kineoLandingTheme.ts')
const EXPECTED = { fast: 'fast', seedance: 'cinematic_ai', kling: 'cinematic_kling', veo: 'cinematic_veo', hollywood: 'cinematic_hollywood', h3: 'cinematic_h3', omni: 'cinematic_omni' }

function pageProblems(src) {
  const p = []
  const block = src.slice(src.indexOf('const HERO_ENGINE'), src.indexOf('}', src.indexOf('const HERO_ENGINE')) + 1)
  const pairs = Object.fromEntries([...block.matchAll(/^\s+(\w+): '([a-z_0-9]+)',$/gm)].map((m) => [m[1], m[2]]))
  for (const [k, v] of Object.entries(EXPECTED)) if (pairs[k] !== v) p.push(`${k} → ${pairs[k]} (deveria ${v}: selo do motor errado)`)
  for (const k of Object.keys(pairs)) if (!(k in EXPECTED)) p.push(`motor inesperado no herói: ${k}`)
  if (!/getHouseEngineExamples\(engine, 4\)/.test(src)) p.push('não usa os filmes da casa (getHouseEngineExamples)')
  if (/getEngineRenders|getTrending|customer/i.test(src.replace(/\/\/.*$/gm, ''))) p.push('herói lê vídeo de cliente')
  return p
}
function clientProblems(src) {
  const p = []
  // reancorado 30/09 (KINEO-STUDIO-MELHORES): a chave do palco ganhou o filme escolhido na vitrine, e a lista do motor
  // recebe esse filme na frente (withPick) — continua sendo a lista do MOTOR escolhido.
  if (!/<EngineHero key=\{`\$\{scriptMode === 'clip' \? 'seedance' : engine\}:[^`]*`\} name=\{scriptMode === 'clip' \? 'Seedance 1\.5' : eng\.name\} [^\n]*?videos=\{withPick\(engineHeroes\[scriptMode === 'clip' \? 'seedance' : engine\] \?\? \[\], heroPick, scriptMode === 'clip' \? 'seedance' : engine\)\}/.test(src)) p.push('o herói não segue o motor escolhido (ou o Clipe não é Seedance 1.5)')
  if (!/if \(!pick \|\| pick\.engine !== key\) return list/.test(src)) p.push('filme da vitrine entra no palco de outro motor')
  if (!/<span className="seh-badge"><UiLabel>Made with<\/UiLabel> \{name\}<\/span>/.test(src)) p.push('herói sem o selo "Made with <motor>"')
  const settings = src.indexOf('<section className="composer-proposal-settings"')
  const review = src.indexOf('<div id="studio-generation-review"')
  const hero = src.indexOf('<aside className="studio-engine-hero"')
  if (!(settings > 0 && review > settings && hero > review)) p.push('ordem errada: configuração → gerar → vídeo do motor')
  const modes = src.slice(src.indexOf('<nav className="studio-modes"'), src.indexOf('</nav>', src.indexOf('<nav className="studio-modes"')))
  if (/href="\/animate"|href="\/avatar"/.test(modes)) p.push('abas do Studio ainda levam a Animate/AI Presenter')
  if (!/>Film<|>Clip</.test(modes)) p.push('abas Film/Clip sumiram')
  if (!/\.studio-engine-hero\{grid-column:2;grid-row:1 \/ span 2;position:sticky/.test(src)) p.push('vídeo do motor não ocupa a direita fixa')
  // KINEO-STUDIO-MOTOR-PRIMEIRO-2026-09-30 — fundador: "a ideia tem que vir depois que você escolhe o motor"; "só o vídeo,
  // bem colocado no meio" (sem as laterais desfocadas).
  const idea = src.indexOf('<section className="composer-proposal-idea"')
  const pick = src.indexOf('<div className="studio-engine-pick"')
  const box = src.indexOf('<textarea', idea)
  if (!(idea > 0 && pick > idea && box > pick && pick < settings)) p.push('o motor não vem antes da ideia')
  if (/className="seh-bg"|\.seh-bg\{/.test(src)) p.push('vídeo do motor ainda tem laterais desfocadas')
  // reancorado 30/09 (KINEO-STUDIO-PALCO): o vídeo segue sozinho e inteiro (sem laterais desfocadas), agora num palco
  // com a cor do motor; centralizado no palco estreito e na coluna do meio no largo.
  if (!/\.seh\{display:grid;grid-template-columns:1fr;justify-items:center;/.test(src) || !/@container \(min-width:900px\)\{\.seh\{grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/.test(src)) p.push('vídeo do motor não está centralizado no palco')
  // KINEO-STUDIO-PALCO-2026-09-30 — fundador: "precisa ter mais cor… falta de acabamento". Cada motor do seletor tem a
  // sua cor, e a cor segue o motor escolhido (Clipe = Seedance), no fundo da página e no palco.
  for (const k of Object.keys(EXPECTED)) if (!new RegExp(`\\n  ${k}: \\['#[0-9A-F]{6}', '#[0-9A-F]{6}'\\],`).test(src)) p.push(`motor ${k} sem cor de palco`)
  // reancorado 30/09 (KINEO-STUDIO-TELA-COR): fundador — "isso que você fez para a tela toda". A cor sai do style inline
  // e vira data-stage; uma regra html:has por motor (gerada de STAGE_TINT) pinta o <main> inteiro do Studio.
  if (!/<div className="stu composer-proposal" data-stage=\{scriptMode === 'clip' \? 'seedance' : engine\}>/.test(src)) p.push('a cor do palco não segue o motor escolhido')
  if (!/const STAGE_CSS = Object\.entries\(STAGE_TINT\)\.map\(\(\[k, \[a, b\]\]\) => `html:has\(\.composer-proposal\[data-stage="\$\{k\}"\]\)\{--stage-a:\$\{a\};--stage-b:\$\{b\}\}`\)/.test(src) || !/<style dangerouslySetInnerHTML=\{\{ __html: STAGE_CSS \}\} \/>/.test(src)) p.push('regras de cor por motor ausentes')
  if (!/main:has\(\.stu\.composer-proposal\)\{background:[^}]*var\(--stage-a\)/.test(src)) p.push('a tela toda não ganha a cor do motor')
  if (!/\.studio-engine-hero::before\{[^}]*var\(--stage-a\)/.test(src) || !/\.composer-proposal::before\{[^}]*var\(--stage-a\)/.test(src)) p.push('palco ou fundo sem a cor do motor')
  // KINEO-STUDIO-MELHORES-2026-09-30 — vitrine dos melhores logo abaixo do painel (fora da grade, senão o palco fixo
  // passa por cima), antes dos vídeos da própria conta.
  const gridEnd = src.indexOf('</aside>')
  const best = src.indexOf('<section className="studio-best"')
  const cont = src.indexOf('<section className="composer-proposal-continuation"')
  const between = best > 0 ? src.slice(gridEnd, best) : ''
  if (!(gridEnd > 0 && best > gridEnd && cont > best && /\n {6}<\/div>\n/.test(between.replace(/\r\n/g, '\n')))) p.push('vitrine fora do lugar (depois do painel, fora da grade, antes dos vídeos da conta)')
  if (!/setEngine\(f\.engine as EngineKey\)\n\s+setHeroPick\(f\)/.test(src)) p.push('clique na vitrine não troca o motor nem mostra o filme')
  return p
}
function navProblems(land, theme) {
  const p = []
  const desk = land.slice(land.indexOf('<div className="nav-links"'), land.indexOf('<div className="nav-right">'))
  const order = ['<PublicNavDropdown item="video"', '<PublicNavDropdown item="image"', 'href="/spaces"', 'href="/ads/new"', 'href="/claude-connector"', 'href="/pricing"'].map((h) => desk.indexOf(h))
  if (order.some((x) => x < 0) || order.some((x, i) => i > 0 && x < order[i - 1])) p.push(`topo fora da ordem Video · Images · Spaces · Ads · MCP · Pricing (${order.join(',')})`)
  if (!/<Link href="\/claude-connector" data-nav-item="more:mcp"><UiLabel>MCP<\/UiLabel><\/Link>/.test(desk)) p.push('MCP fora do topo')
  if (!/\.klp \.nav-links>a,\.klp \.nav-links>\.nd>summary \{ color:var\(--txt\); \}/.test(theme) || !/html:not\(\[data-theme=dark\]\) \.klp \.nav-links>a,html:not\(\[data-theme=dark\]\) \.klp \.nav-links>\.nd>summary \{ color:#0E1116; \}/.test(theme)) p.push('itens do topo não têm a mesma cor')
  return p
}

const pp = pageProblems(PAGE)
ok(pp.length === 0, `(1) cada motor → filmes da casa do MESMO motor (${pp.join('; ') || 'ok'})`)
const counts = Object.fromEntries(Object.values(EXPECTED).map((e) => [e, (EXAMPLES.match(new RegExp(`engine: '${e}'`, 'g')) || []).length]))
ok(Object.values(counts).every((n) => n >= 1), `(1b) todo motor do seletor tem filme da casa (${JSON.stringify(counts)})`)
const cp = clientProblems(CLIENT)
ok(cp.length === 0, `(2-4) herói segue o motor, selo, gerar fecha a esquerda, abas só Film/Clip (${cp.join('; ') || 'ok'})`)
const np = navProblems(LAND, THEME)
ok(np.length === 0, `(5) topo na ordem com MCP e mesma cor (${np.join('; ') || 'ok'})`)

// (6) mutantes
ok(pageProblems(PAGE.replace("  kling: 'cinematic_kling',", "  kling: 'cinematic_veo',")).length > 0, '(M1) Kling 2.5 mostrando filme do Veo → vermelho')
ok(clientProblems(CLIENT.replace("videos={withPick(engineHeroes[scriptMode === 'clip' ? 'seedance' : engine] ?? [],", "videos={withPick(engineHeroes['seedance'] ?? [],")).length > 0, '(M2) herói preso num motor → vermelho')
ok(clientProblems(CLIENT.replace('        {/* KINEO-STUDIO-HEROI-2026-09-30 — fundador: tirar \"AI Presenter\" e \"Animate a Photo\" daqui (já têm porta própria). */}\n', '        <Link href="/animate"><UiLabel>Animate a Photo</UiLabel></Link>\n')).length > 0, '(M3) aba Animate de volta → vermelho')
ok(navProblems(LAND.replace('            <Link href="/claude-connector" data-nav-item="more:mcp"><UiLabel>MCP</UiLabel></Link>\n', ''), THEME).length > 0, '(M4) MCP fora do topo → vermelho')
{
  const a = CLIENT.indexOf('<div className="studio-engine-pick"')
  const b = CLIENT.indexOf('<div className="card">', a)
  const blk = CLIENT.slice(a, b)
  const back = CLIENT.slice(0, a) + CLIENT.slice(b)
  const set = back.indexOf('<section className="composer-proposal-settings"') + '<section className="composer-proposal-settings" aria-label={t(\'Settings and generation\', \'Ajustes y generación\')}>\n'.length
  ok(clientProblems(back.slice(0, set) + blk + back.slice(set)).length > 0, '(M6) motor de volta para depois da ideia → vermelho')
}
ok(clientProblems(CLIENT.replace('<video key={v.src} className="seh-main"', '<video className="seh-bg" /><video key={v.src} className="seh-main"')).length > 0, '(M7) laterais desfocadas de volta → vermelho')
ok(clientProblems(CLIENT.replace("data-stage={scriptMode === 'clip' ? 'seedance' : engine}>", "data-stage=\"fast\">")).length > 0, '(M8) cor presa num motor → vermelho')
ok(clientProblems(CLIENT.replace(/main:has\(\.stu\.composer-proposal\)\{background:[^}]*\}/, 'main:has(.stu.composer-proposal){}')).length > 0, '(M10) tela sem a cor do motor → vermelho')
ok(clientProblems(CLIENT.replace('setHeroPick(f)\n', '\n').replace('setHeroPick(f)\r\n', '\r\n')).length > 0, '(M11) vitrine que não mostra o filme no palco → vermelho')
{
  // vitrine: 8 filmes da casa já aprovados, 2 fileiras de 4, com mídia em public/, nenhum de motor em manutenção.
  const ids = [...(PAGE.match(/const BEST_FILM_IDS = \[([\s\S]*?)\] as const/)?.[1] ?? '').matchAll(/'([0-9a-f-]{36})'/g)].map((m) => m[1])
  const lines = ids.map((id) => EXAMPLES.split('\n').find((l) => l.includes(`id: '${id}'`) && l.includes('previewPath')) ?? '')
  const media = lines.flatMap((l) => [...l.matchAll(/(?:previewPath|posterPath): '\/([^']+)'/g)].map((m) => m[1]))
  const missing = media.filter((m) => !fs.existsSync(path.join(ROOT, 'public', m)))
  const omni = lines.filter((l) => /engine: 'cinematic_omni'/.test(l)).length
  ok(ids.length === 8 && new Set(ids).size === 8 && lines.every(Boolean) && media.length === 16 && missing.length === 0 && omni === 0,
    `(V) vitrine: 8 filmes da casa, mídia presente, sem motor em manutenção (ids ${ids.length}, mídia ${media.length}, faltando ${missing.join(',') || 0}, omni ${omni})`)
  ok(/\.studio-best-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(CLIENT), '(V2) duas fileiras de 4 no computador')
}
ok(clientProblems(CLIENT.replace(/\n  veo: \['#[0-9A-F]{6}', '#[0-9A-F]{6}'\],/, '')).length > 0, '(M9) motor sem cor → vermelho')
ok(navProblems(LAND, THEME.replace('.klp .nav-links>a,.klp .nav-links>.nd>summary { color:var(--txt); }', '')).length > 0, '(M5) tom diferente no topo → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
