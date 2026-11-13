// KINEO-ETIQUETA-UNICA-1111 [CEO 11/11, tarefa 2 do fundador "design mais bonito"]: todo cartão da vitrine da home com nome, UM desenho de
// etiqueta (NEW · Recreate · Make your ad · Put your face in it) numa fileira que nunca sobrepõe, e a caixa fixa do celular saindo da frente
// enquanto a pessoa rola para baixo. Offline: renderiza o HomeMosaic real (home e vitrine inteira) e executa a regra da caixa.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(join(ROOT, 'node_modules/react-dom/server'))

const MOSAIC = 'components/home/HomeMosaic.tsx'
const PORTAS = 'components/home/HomePortasCelular.tsx'
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }
const link = { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { ...rest, href }, children) }
const stubs = {
  'next/link': link,
  '@/lib/analytics': { trackEvent: async () => true, trackClosedEvent: async () => 'stored' },
  'next/navigation': { usePathname: () => '/', useRouter: () => ({ push() {}, refresh() {} }), useSearchParams: () => new URLSearchParams() },
}
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim()
/** Os cartões (<a class="kmz-t…">…</a>) de um HTML renderizado, cada um com o nome visível. */
function cartoes(html) {
  const out = []
  for (const m of html.matchAll(/<a [^>]*class="kmz-t[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
    const corpo = m[1]
    const nome = (corpo.match(/<span class="kmz-copy"><b>([\s\S]*?)<\/b>/) || [])[1]
    out.push({ tag: m[0].slice(0, 200), corpo, nome: nome ? text(nome) : '' })
  }
  return out
}

function all(o = {}) {
  const src = p => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
  const load = loader(stubs, o)
  const M = load(MOSAIC.replace(/\.tsx$/, ''))
  // 1) Todo cartão tem nome — na home e na vitrine inteira (/made-with-kineo), visitante e logado.
  let fotos = 0, total = 0
  for (const full of [false, true]) {
    for (const signedIn of [false, true]) {
      const html = renderToStaticMarkup(React.createElement(M.default, { signedIn, full }))
      const d = full ? 'vitrine inteira' : 'home'
      const cs = cartoes(html)
      total += cs.length
      fotos += cs.filter(c => /data-home-cta="mosaic_image"/.test(c.tag)).length
      const mudos = cs.filter(c => c.nome.length < 3).map(c => c.tag.match(/aria-label="([^"]{0,50})/)?.[1])
      ok(mudos.length === 0, `${d}, ${signedIn ? 'logado' : 'visitante'}: cartão sem nome → ${mudos.join(' | ')}`)
      // 2) Etiquetas: todas com o mesmo desenho (.kmz-chip), dentro de UMA fileira (.kmz-chips), no máximo uma fileira por cartão.
      for (const c of cs) {
        const fileiras = (c.corpo.match(/class="kmz-chips"/g) || []).length
        ok(fileiras <= 1, `uma fileira de etiquetas por cartão (${fileiras})`)
        for (const e of c.corpo.matchAll(/<span class="([^"]*)"[^>]*>(?:<svg[\s\S]*?<\/svg>)?(?:⚡ NEW|<span>Recreate|Recreate|Make your ad|<span>Make your ad)/g)) ok(/\bkmz-chip\b/.test(e[1]), `etiqueta com desenho próprio: ${e[1]}`)
        const fileira = fileiras === 1 ? c.corpo.match(/<span class="kmz-chips">([\s\S]*?)<\/span><span class="kmz-shade"/) : null
        if (fileiras === 1) ok(fileira, 'a fileira de etiquetas é uma caixa só, antes da sombra')
        const soltas = (fileira ? c.corpo.replace(fileira[0], '') : c.corpo).match(/class="kmz-chip\b/g)
        ok(!soltas, 'nenhuma etiqueta fora da fileira (posição absoluta solta = sobreposição)')
      }
      const caras = [...html.matchAll(/<a [^>]*class="([^"]*)"[^>]*data-home-cta="face_remix"/g)]
      for (const f of caras) ok(/\bkmz-chip\b/.test(f[1]) && /\bkmz-face\b/.test(f[1]), '"Put your face in it" com o mesmo desenho das outras')
    }
  }
  ok(total > 60 && fotos >= 10, `o guardião viu a vitrine de verdade (${total} cartões, ${fotos} fotos)`)
  ok(Object.keys(M.MOSAIC_IMAGE_TITLE).length >= 36, 'as 36 fotos da vitrine têm nome curto escrito à mão')
  ok(M.mosaicImageTitle('nova.webp', 'A wooden canoe on a misty mountain lake at dawn') === 'wooden canoe', 'foto nova sem nome na lista ainda ganha nome (nunca cartão mudo)')
  // 3) CSS: um desenho só; nada das 4 formas antigas; fileira que quebra linha; com "Put your face in it" a fileira desce para baixo dela.
  const css = src(MOSAIC)
  ok(/\.klp \.kmz-chips\{position:absolute;[^}]*display:flex;flex-wrap:wrap;/.test(css), 'fileira de etiquetas que quebra linha')
  ok(!/\.klp \.kmz-new\{/.test(css) && !/\.klp \.kmz-re\{/.test(css) && !/\.klp \.kmz-face\{[^}]*background/.test(css) && !/#ff3b6b/.test(css), 'os desenhos antigos (rosa, vidro, branco grande, branco pequeno) saíram')
  const topoFace = Number((css.match(/\.klp \.kmz-cell \.kmz-t \.kmz-chips\{top:(\d+)px\}/) || [])[1])
  const altFace = Number((css.match(/\.klp \.kmz-chip\{[^}]*min-height:(\d+)px/) || [])[1])
  ok(topoFace >= 8 + altFace + 4, `computador: a fileira (${topoFace}px) começa abaixo do "Put your face in it" (8 + ${altFace}px)`)
  const cel = css.match(/@media\(max-width:700px\)\{([^\n]*)\}/)[1]
  const topoFaceCel = Number((cel.match(/\.klp \.kmz-cell \.kmz-t \.kmz-chips\{top:(\d+)px\}/) || [])[1])
  const altCel = Number((cel.match(/\.klp \.kmz-chip\{min-height:(\d+)px/) || [])[1])
  ok(topoFaceCel >= 6 + altCel + 4, `celular: a fileira (${topoFaceCel}px) começa abaixo do "Put your face in it" (6 + ${altCel}px)`)
  // 4) A caixa fixa do celular sai da frente rolando para baixo e volta rolando para cima; parada, fica como está.
  const P = load(PORTAS.replace(/\.tsx$/, ''))
  const f = P.caixaForaDaFrente
  ok(f(100, 120, false) === false, 'perto do topo a caixa fica')
  ok(f(400, 600, false) === true, 'rolando para baixo ela sai da frente')
  ok(f(600, 400, true) === false, 'rolando para cima ela volta')
  ok(f(600, 602, true) === true, 'parada (lendo o cartão) ela continua fora')
  const p = src(PORTAS)
  ok(/\.kpc-caixa\.kpc-caixa-fora\{transform:translateY\([^}]*pointer-events:none\}/.test(p), 'fora da frente = abaixo da tela e sem clique')
  ok(/className=\{caixaFora \? 'kpc-caixa kpc-caixa-fora' : 'kpc-caixa'\}/.test(p), 'a caixa liga a classe pelo rolar')
  // Defeito pego na prova do navegador: lida DENTRO do setFora, a posição anterior já era a nova (o React roda o updater depois) e a caixa nunca voltava.
  ok(/const antes = ultimo\.current[^\n]*\n\s*ultimo\.current = y\n\s*setFora\(\(f\) => caixaForaDaFrente\(antes, y, f\)\)/.test(p), 'a posição anterior é lida antes de trocar (senão a caixa nunca volta)')
}

all()
const real = passed
const s = p => read(p)
const mutants = [
  ['foto volta sem nome', { [MOSAIC]: s(MOSAIC).replace('<span className="kmz-copy"><b>{mosaicImageTitle(img.file, img.alt)}</b></span>', '') }],
  ['nome some de uma foto e a reserva também', { [MOSAIC]: s(MOSAIC).replace("'canoe.webp': 'Canoe on a misty lake',", '').replace("return MOSAIC_IMAGE_TITLE[file] ?? alt.replace", "return MOSAIC_IMAGE_TITLE[file] ?? ''.replace") }],
  ['NEW volta ao desenho rosa solto', { [MOSAIC]: s(MOSAIC).replace('<Chips novo={newKeys.has(e.key)} recreate={podeRecriar(t)} />', '{newKeys.has(e.key) ? <span className="kmz-new">⚡ NEW</span> : null}<Chips recreate={podeRecriar(t)} />') }],
  ['Recreate fora da fileira', { [MOSAIC]: s(MOSAIC).replace('<Chips recreate={podeRecriar(t)} ad={podeFazerAnuncio(t)} convite={convite} />', '{podeRecriar(t) ? <Recreate /> : null}<Chips ad={podeFazerAnuncio(t)} convite={convite} />') }],
  ['"Put your face in it" com desenho próprio', { [MOSAIC]: s(MOSAIC).replace('className="kmz-chip kmz-face"', 'className="kmz-face"') }],
  ['fileira não quebra linha (sobrepõe)', { [MOSAIC]: s(MOSAIC).replace('display:flex;flex-wrap:wrap;align-items:flex-start;gap:6px', 'display:flex;flex-wrap:nowrap;align-items:flex-start;gap:6px') }],
  ['no celular a fileira fica por baixo do "Put your face in it"', { [MOSAIC]: s(MOSAIC).replace('.klp .kmz-cell .kmz-t .kmz-chips{top:38px}', '.klp .kmz-cell .kmz-t .kmz-chips{top:6px}') }],
  ['caixa nunca sai da frente', { [PORTAS]: s(PORTAS).replace('  if (agora > antes + 4) return true\n', '').replace('  if (agora > antes + 4) return true\r\n', '') }],
  ['caixa lê a posição anterior tarde (nunca volta)', { [PORTAS]: s(PORTAS).replace(/const antes = ultimo\.current[^\r\n]*\r?\n(\s*)ultimo\.current = y\r?\n(\s*)setFora\(\(f\) => caixaForaDaFrente\(antes, y, f\)\)/, '$1setFora((f) => caixaForaDaFrente(ultimo.current, y, f))\n$2ultimo.current = y') }],
  ['caixa volta sozinha quando a pessoa para', { [PORTAS]: s(PORTAS).replace('  return foraAgora\n', '  return false\n').replace('  return foraAgora\r\n', '  return false\r\n') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  if (Object.entries(o).some(([p, v]) => v === s(p))) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-etiqueta-unica-1111: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
