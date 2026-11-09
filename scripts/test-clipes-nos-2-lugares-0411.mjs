// KINEO-CLIPES-NOS-2-LUGARES-0411 — guardião do pedido do fundador 05/11: "Aproveita para colocar uns clipes desse já trocando os do
// Halloween, já colocando sempre nas telas principais. Made by Kineo também. Sempre colocar nos dois lugares, embaralhar".
// Executa a vitrine DE VERDADE (components/home/HomeMosaic.tsx, a mesma da home e do /made-with-kineo) e prova:
//   (A) a lista: motor real de cada clipe, texto só em clipe de texto, arquivos no disco e leves;
//   (B) todo clipe nos dois lugares, com selo e destino honestos, no HTML renderizado;
//   (C) Halloween e Día de Muertos fora dos dois lugares, Natal dentro, nenhum arquivo apagado;
//   (D) embaralhado: mesma data = mesma ordem, outra data = outra ordem, sem sorteio nem relógio; misturado, não em bloco;
//   (E) carga: pôster preguiçoso, nenhum vídeo no HTML, os mesmos 3 vídeos na 1ª fileira de sempre;
//   (G) a grade fecha: não mais buracos que antes do pedido;
//   (M) mutantes ficam vermelhos, cada um trocando a FONTE de verdade antes de carregar.
// Rodar: node scripts/test-clipes-nos-2-lugares-0411.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Module = require('node:module')
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const LIB = 'lib/clipesNos2Lugares.ts'
const MOSAICO = 'components/home/HomeMosaic.tsx'
const PAGINA = 'app/made-with-kineo/page.tsx'
const norm = (f) => path.relative(ROOT, f).split(path.sep).join('/')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

// ─── carregador: @/ → raiz, TS/TSX transpilado na hora, CSS vazio, e a troca de fonte de cada mutante ──────────────────────────
let trocas = {}
const resolveOriginal = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) {
    const base = path.join(ROOT, request.slice(2))
    for (const c of ['', '.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) if (fs.existsSync(base + c) && fs.statSync(base + c).isFile()) return base + c
  }
  if (request === 'server-only' || request === 'client-only') return path.join(ROOT, 'package.json')
  return resolveOriginal.call(this, request, parent, ...rest)
}
const transpila = (module, filename) => {
  let src = fs.readFileSync(filename, 'utf8')
  const troca = trocas[norm(filename)]
  if (troca) src = troca(lf(src))
  module._compile(ts.transpileModule(src, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
}
Module._extensions['.ts'] = transpila
Module._extensions['.tsx'] = transpila
Module._extensions['.css'] = () => {}
function carrega(novasTrocas = {}) {
  trocas = novasTrocas
  for (const k of Object.keys(require.cache)) if (k.startsWith(ROOT) && !k.includes('node_modules')) delete require.cache[k]
  return { lib: require(path.join(ROOT, LIB)), mosaico: require(path.join(ROOT, MOSAICO)) }
}
const { renderToStaticMarkup } = require('react-dom/server')
const React = require('react')

// ─── a verdade de cada clipe (tabela `clips`, conferida em 05/11): clipe, motor, modo ─────────────────────────────────────────
const VERDADE = {
  'pet-barista': ['fal:01a1ae37-2f30-7d63-ab53-52234e4ed8c8', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'virada-natal': ['fal:01a1ae37-2ed6-7493-acb9-3b42c05aae15', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'adeus-2026': ['fal:01a1ae37-3613-75f0-9c89-7722df1bcb94', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'bebe-danca': ['fal:01a1ae37-3003-76e1-8031-e5613d253e39', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'glow-up': ['fal:01a1ae37-7f7f-7d42-a0d3-18662c36f1f1', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'ugc-homem-cafe': ['fal:01a1ae37-7de0-7b91-8927-ac13fd481ed5', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'ugc-idosa-creme': ['fal:01a1ae37-8225-7641-855d-7b77d62f0a06', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'ugc-indiano-fone': ['fal:01a1ae37-80fa-7e73-861a-ab40bb2e13c3', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'produto-tenis-rua': ['fal:01a1ae37-d069-7270-93f7-f0332a0e4d7c', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'produto-perfume-marmore': ['fal:01a1ae37-ca14-7463-8c1b-6bc50ab14e8b', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'produto-burger-mesa': ['fal:01a1ae37-cdde-74c1-acd8-a8dc4054634e', 'h3', 'foto', 'MiniMax H3'], // KINEO-CLIPES-E-CARDS-0511
  'flying-burger': ['b248db19-c3fb-4b08-878c-1d10d3b9af7b', 'seedance', 'texto', 'Seedance 1.5'],
  'spinning-headphones': ['6e6b1249-69c9-4036-b2b3-36e5c157dda1', 'seedance', 'texto', 'Seedance 1.5'],
  'perfume-splash': ['c9d321e0-0fe4-44b7-871b-2407a55bec91', 'hollywood', 'texto', 'Kling 3'],
  'iced-coffee-pour': ['a3576c28-47ba-4c19-a141-b5e8e196c9dd', 'seedance', 'texto', 'Seedance 1.5'],
  // KINEO-OUTFIT-MORPH-HOME-0911 [fundador 09/11] — feito com Kling 4.0 (kling/v4/image-to-video na fal, 2 pedidos unidos), que NÃO é motor
  // do /clips e não tem linha em `clips`: motor null, selo = o formato ("Trending format"), destino = /clips puro. clipId = as 2 saídas da fal.
  'outfit-morph': ['fal:0ab1d30e/bo9VslFC3Y8vO9Fk5QBwW+0ab1d315/oyRjMp3igUDfHE0rwpW9O', null, 'foto', 'Trending format'],
}
// KINEO-OUTFIT-MORPH-HOME-0911 — nomes de motor que um cartão de FORMATO nunca pode mostrar (nem em texto, nem no aria-label, nem no link).
const NOMES_DE_MOTOR = /Kling|Seedance|MiniMax|\bH3\b|Veo|Omni|Hailuo|Wan\b|Sora|Runway|Pika|Kineo 1/i
const INICIO = Date.parse('2026-11-05T12:00:00Z')
const DIA = 86400000
const NATAL = ['snow_globe', 'santa_cartoon', 'pet_xmas_tree', 'pet_xmas_angel']
const estilos = (n) => Array.from({ length: n }, (_, i) => ({ key: `est-${i}`, title: `Estilo ${i}`, engine: null, video: `/e${i}.mp4`, poster: null, href: `/e${i}` }))
// KINEO-HOME-DOIS-EIXOS-0611 — [fundador 06/11] a fileira dos vídeos de motion fica à parte (cheia, provada em test-home-dois-eixos-0611.mjs); estas regras valem para a grade que vem depois.
function semFileiraMotion0611(f) { return (...a) => f(...a).filter((t) => t.kind !== 'motion') }
const chave = (t) => t.kind === 'novo' ? 'novo:' + t.clip.id : t.kind === 'clip' ? 'clip:' + t.clip.id : t.kind === 'film' ? 'film:' + t.video : t.kind === 'motion' ? 'motion:' + t.video : t.kind === 'effect' ? 'effect:' + t.effect.key : t.kind === 'style' ? 'style:' + t.style.key : 'img:' + t.img.file

/** Todas as provas; devolve a lista de erros (vazia = verde). */
function checa({ lib, mosaico }, fontes = {}, existe = (rel) => fs.existsSync(path.join(ROOT, rel))) {
  const e = []
  const fonteMosaico = fontes.mosaico ?? rd(MOSAICO)
  const fontePagina = fontes.pagina ?? rd(PAGINA)
  const fonteLanding = rd('app/KineoLanding.tsx')
  const lista = lib.CLIPES_NOVOS
  // (A) a lista
  const ids = lista.map((c) => c.id)
  if (new Set(ids).size !== ids.length) e.push('A id repetido')
  if (ids.length !== Object.keys(VERDADE).length) e.push(`A ${ids.length} clipes ≠ ${Object.keys(VERDADE).length}`)
  let bytes = 0
  for (const [id, [clipId, motor, modo]] of Object.entries(VERDADE)) {
    const c = lista.find((x) => x.id === id)
    if (!c) { e.push(`A ${id} fora da lista`); continue }
    if (c.clipId !== clipId) e.push(`A ${id}: clipId ≠ tabela`)
    if (c.engine !== motor) e.push(`A ${id}: motor ${c.engine}, a tabela diz ${motor}`)
    if ((c.engine === null) !== (c.selo === 'Trending format') || (c.engine !== null && c.selo !== undefined)) e.push(`A ${id}: selo de formato só existe (e é obrigatório) quando não há motor do /clips`) // KINEO-OUTFIT-MORPH-HOME-0911
    if (modo === 'foto' && c.prompt !== null) e.push(`A ${id}: clipe de foto preenchendo texto de movimento`)
    if (modo === 'texto' && !(typeof c.prompt === 'string' && c.prompt.length > 80 && c.prompt.length <= 1000)) e.push(`A ${id}: clipe de texto sem o texto (ou além do teto do campo)`)
    if (/keep the same (woman|face)/i.test(c.prompt ?? '')) e.push(`A ${id}: texto que depende de foto`)
    if (!/^50% \d+%$/.test(c.focus)) e.push(`A ${id}: sem foco`)
    if (/\bads?\b/i.test(c.title)) e.push(`A ${id}: título fala em anúncio`)
    for (const rel of [`public${lib.clipeNovoVideo(c)}`, `public${lib.clipeNovoPoster(c)}`]) {
      if (!existe(rel)) { e.push(`A arquivo ausente: ${rel}`); continue }
      const sz = fs.existsSync(path.join(ROOT, rel)) ? fs.statSync(path.join(ROOT, rel)).size : 0
      bytes += sz
      if (rel.endsWith('.mp4') && sz > 600 * 1024) e.push(`A prévia pesada: ${id}`)
    }
  }
  if (bytes > 9 * 1024 * 1024) e.push(`A ${(bytes / 1048576).toFixed(1)} MB de mídia nova (> 9)`)
  // (B) nos dois lugares, de verdade
  if (!fonteLanding.includes('<HomeMosaic signedIn={isSignedIn} />')) e.push('B a home não monta a vitrine')
  if (!fontePagina.includes('<HomeMosaic signedIn={signedIn} full styles={adStyles} />')) e.push('B o /made-with-kineo não monta a vitrine')
  const lugares = { home: {}, galeria: { full: true, styles: estilos(17) }, 'galeria com 3 estilos': { full: true, styles: estilos(3) } } // 17 = os estilos de anúncio com vídeo hoje
  for (const [lugar, opts] of Object.entries(lugares)) {
    for (let d = 0; d < 7; d++) {
      const tiles = semFileiraMotion0611(mosaico.homeMosaicTiles)(INICIO + d * DIA, opts)
      const novos = tiles.filter((t) => t.kind === 'novo').map((t) => t.clip.id).sort()
      if (JSON.stringify(novos) !== JSON.stringify([...ids].sort())) { e.push(`B ${lugar} (dia ${d}): clipes ≠ lista (${novos.length} de ${ids.length})`); break }
      if (new Set(tiles.map(chave)).size !== tiles.length) { e.push(`B ${lugar} (dia ${d}): cartão repetido`); break }
    }
    const html = lf(renderToStaticMarkup(React.createElement(mosaico.default, { signedIn: false, ...opts })))
    for (const c of lista) {
      const i = html.indexOf(`data-clip-novo="${c.id}"`)
      if (i < 0) { e.push(`B ${lugar}: ${c.id} fora do HTML`); continue }
      const ini = html.lastIndexOf('<a ', i)
      const fim = html.indexOf('</a>', i)
      const cartao = html.slice(ini, fim)
      if (c.engine === null) { // KINEO-OUTFIT-MORPH-HOME-0911 — cartão de formato: o selo é o formato, e nenhum motor aparece em lugar nenhum do cartão
        if (!cartao.includes(`>${VERDADE[c.id]?.[3] ?? '?'}</`)) e.push(`B ${lugar}: ${c.id} sem o selo do formato`)
        if (/Clip<\/span> ·|Clip · /.test(cartao)) e.push(`B ${lugar}: ${c.id} (formato) mostra "Clip · motor"`)
        const achado = NOMES_DE_MOTOR.exec(cartao)
        if (achado) e.push(`B ${lugar}: ${c.id} (formato) mostra o motor "${achado[0]}"`)
      } else if (!cartao.includes(`Clip</span> · ${VERDADE[c.id]?.[3] ?? '?'}`) && !cartao.includes(`Clip · ${VERDADE[c.id]?.[3] ?? '?'}`)) e.push(`B ${lugar}: ${c.id} sem o selo real`)
      if (/\bAd\b|Ads\b/.test(cartao.replace(/href="[^"]*"/, ''))) e.push(`B ${lugar}: ${c.id} fala em anúncio`)
      const bruto = (/href="([^"]+)"/.exec(cartao)?.[1] ?? '').replace(/&amp;/g, '&')
      const destino = bruto.startsWith('/signup?') ? new URLSearchParams(bruto.split('?').slice(1).join('?')).get('redirect') ?? '' : ''
      const pedido = new URLSearchParams(destino.split('?').slice(1).join('?'))
      if (c.engine === null) { if (destino !== '/clips') e.push(`B ${lugar}: ${c.id} (formato) não leva ao /clips puro, sem motor e sem texto: ${bruto.slice(0, 80)}`) } // KINEO-OUTFIT-MORPH-HOME-0911 — exceção testada à regra de baixo
      else if (!destino.startsWith('/clips?') || pedido.get('engine') !== c.engine) e.push(`B ${lugar}: ${c.id} não leva ao /clips no motor: ${bruto.slice(0, 80)}`)
      if (c.prompt && pedido.get('prompt') !== c.prompt) e.push(`B ${lugar}: ${c.id} sem o texto no /clips`)
      if (!c.prompt && pedido.has('prompt')) e.push(`B ${lugar}: ${c.id} preenche texto que não tem`)
      if (!cartao.includes(`src="${lib.clipeNovoPoster(c)}"`)) e.push(`B ${lugar}: ${c.id} sem pôster`)
      if (!cartao.includes(`--kmz-focus:${c.focus}`)) e.push(`B ${lugar}: ${c.id} sem foco na janela`)
    }
    // (C) estação
    const proibido = /pumpkin|jack-o|werewolf|witch|zombie|catrina|day of the dead|skull/i
    const semLinks = html.replace(/href="[^"]*"/g, '').replace(/data-home-cta="[^"]*"/g, '')
    const achado = proibido.exec(semLinks)
    if (achado) e.push(`C ${lugar}: "${achado[0]}" no HTML`)
    if (proibido.test(html)) e.push(`C ${lugar}: fora de estação em link ou medição`)
    for (const k of ['dust_away', 'figurine_3d']) if (html.includes(k)) e.push(`C ${lugar}: ${k} (abóboras na cena) na vitrine`)
    for (const k of NATAL) if (!html.includes(`mosaic_effect_${k}"`)) e.push(`C ${lugar}: Natal sumiu (${k})`)
    // (E) carga
    if (/<video\b/.test(html)) e.push(`E ${lugar}: vídeo no HTML antes de aparecer na tela`)
    const novosHtml = html.split('data-clip-novo="').slice(1)
    for (const pedaco of novosHtml) {
      const cartao = pedaco.slice(0, pedaco.indexOf('</a>'))
      if (!/<img[^>]*loading="lazy"/.test(cartao)) e.push(`E ${lugar}: pôster não é preguiçoso`)
      if (/background-image/.test(cartao)) e.push(`E ${lugar}: pôster como fundo baixa antes da hora`)
    }
  }
  if (!rd('components/WallMedia.tsx').includes('preload="none"')) e.push('E WallMedia perdeu o preload none')
  if (!fonteMosaico.includes('<WallMedia src={clipeNovoVideo(c)} />')) e.push('E o clipe novo não usa WallMedia')
  // (C) o que saiu continua no disco e a lista é a combinada
  for (const rel of ['public/home-mosaic/pumpkin.webp', 'public/previews/galeria/werewolf.mp4', 'public/posters/galeria/werewolf.webp', 'public/posters/efeito-witch.webp', 'public/posters/efeito-zombie.webp', 'public/posters/efeito-catrina.webp', 'public/posters/efeito-dust_away.webp']) {
    if (!fs.existsSync(path.join(ROOT, rel))) e.push(`C arquivo apagado: ${rel}`)
  }
  // (D) embaralhado
  const ordem = (now, opts) => semFileiraMotion0611(mosaico.homeMosaicTiles)(now, opts).map(chave).join(',')
  const relogio = Date.now
  const sorteio = Math.random
  for (const [lugar, opts] of Object.entries(lugares)) {
    const manha = ordem(Date.parse('2026-11-05T00:00:01Z'), opts)
    if (manha !== ordem(Date.parse('2026-11-05T23:59:59Z'), opts)) e.push(`D ${lugar}: a ordem muda dentro do mesmo dia`)
    for (let i = 0; i < 5; i++) if (manha !== ordem(Date.parse('2026-11-05T12:00:00Z'), opts)) { e.push(`D ${lugar}: a mesma data dá ordens diferentes`); break }
    let anterior = null
    for (let d = 0; d < 30; d++) {
      const o = ordem(INICIO + d * DIA, opts)
      if (o === anterior) { e.push(`D ${lugar}: mesma ordem em dois dias seguidos (dia ${d})`); break }
      anterior = o
    }
    // variedade: nunca em bloco, sempre cedo, a pessoa nunca colada, a cadência da grade intacta
    for (let d = 0; d < 400; d++) {
      const tiles = semFileiraMotion0611(mosaico.homeMosaicTiles)(INICIO + d * DIA, opts)
      const primeiros = tiles.slice(0, 12).filter((t) => t.kind === 'novo').length
      if (primeiros < 2) { e.push(`D ${lugar}: só ${primeiros} clipes novos nos 12 primeiros cartões (dia ${d})`); break }
      const noTopo = tiles.slice(0, 15).filter((t) => t.kind === 'novo').length
      if (noTopo > 6) { e.push(`D ${lugar}: ${noTopo} clipes novos nos 15 primeiros cartões: virou bloco no topo (dia ${d})`); break }
      let seguidos = 0; let maior = 0
      let ultimaPessoa = -9; let colada = false
      tiles.forEach((t, i) => {
        seguidos = t.kind === 'novo' ? seguidos + 1 : 0
        maior = Math.max(maior, seguidos)
        if (t.kind === 'novo' && t.clip.pessoa) { if (i - ultimaPessoa < 2) colada = true; ultimaPessoa = i }
      })
      if (maior > 2) { e.push(`D ${lugar}: ${maior} clipes novos em bloco (dia ${d})`); break }
      if (colada) { e.push(`D ${lugar}: a mesma pessoa colada em si mesma (dia ${d})`); break }
      const grande = (t) => t.kind === 'clip' || t.kind === 'film' || (t.kind === 'novo' && t.grande)
      const pequeno = (t) => t.kind === 'effect' || t.kind === 'style' || (t.kind === 'novo' && !t.grande)
      if (!grande(tiles[0]) || !pequeno(tiles[1]) || !pequeno(tiles[2]) || tiles[3].kind !== 'image' || tiles[3].img.file !== 'puddle.webp' || tiles[4].kind !== 'image') { e.push(`E ${lugar}: a 1ª fileira mudou de desenho, e com ela os vídeos que nascem na 1ª tela (dia ${d})`); break }
    }
  }
  // a grade fecha: simula o row dense do CSS em 6 colunas (computador) e conta os buracos
  const larguraAltura = (t) => {
    const grande = t.kind === 'clip' || t.kind === 'film' || (t.kind === 'novo' && t.grande) || (t.kind === 'image' && t.img.file === 'puddle.webp')
    return grande ? [2, 4] : t.kind === 'image' && t.img.w > t.img.h ? [2, 2] : [1, 2]
  }
  const buracos = (tiles, cols = 6) => {
    const g = []
    const livre = (r, c, w, h) => { if (c + w > cols) return false; for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (g[y]?.[x]) return false; return true }
    for (const t of tiles) {
      const [w, h] = larguraAltura(t)
      let feito = false
      for (let r = 0; !feito; r++) for (let c = 0; c < cols && !feito; c++) if (livre(r, c, w, h)) { for (let y = r; y < r + h; y++) { g[y] = g[y] || []; for (let x = c; x < c + w; x++) g[y][x] = 1 } feito = true }
    }
    let n = 0
    for (let y = 0; y < g.length; y++) for (let x = 0; x < cols; x++) if (!g[y]?.[x]) n++
    return n
  }
  for (const [lugar, opts] of Object.entries({ home: lugares.home, galeria: lugares.galeria })) {
    for (let d = 0; d < 60; d++) {
      const n = buracos(semFileiraMotion0611(mosaico.homeMosaicTiles)(INICIO + d * DIA, opts))
      if (n > 6) { e.push(`G ${lugar}: ${n} células vazias na grade (dia ${d}); antes do pedido eram 6`); break }
    }
  }
  // função pura: não toca relógio nem sorteio
  Date.now = () => { throw new Error('relógio') }
  Math.random = () => { throw new Error('sorteio') }
  try {
    const a = JSON.stringify(lib.clipesNovosDoDia('2026-11-05'))
    if (a !== JSON.stringify(lib.clipesNovosDoDia('2026-11-05'))) e.push('D clipesNovosDoDia: mesma data, ordens diferentes')
    if (lib.diaDaVitrine(INICIO) !== '2026-11-05') e.push('D diaDaVitrine errado')
  } catch (err) { e.push('D função impura: usou ' + err.message) }
  Date.now = relogio
  Math.random = sorteio
  const vistos = new Set()
  let antes = null
  for (let d = 0; d < 400; d++) {
    const dia = lib.diaDaVitrine(INICIO + d * DIA)
    const { grandes, pequenos } = lib.clipesNovosDoDia(dia)
    const todos = [...grandes, ...pequenos].map((c) => c.id)
    if (new Set(todos).size !== lista.length) { e.push(`D ${dia}: perdeu clipe na escalação`); break }
    const o = todos.join(',')
    if (o === antes) { e.push(`D ${dia}: mesma escalação de ontem`); break }
    antes = o
    vistos.add(o)
  }
  if (vistos.size < 350) e.push(`D só ${vistos.size} ordens em 400 dias`)
  // (F) copy e marca
  if (/newest first/i.test(fontePagina)) e.push('F a página ainda promete "newest first"')
  for (const [nome, fonte] of [['mosaico', fonteMosaico], ['lib', fontes.lib ?? rd(LIB)]]) if (!fonte.includes('KINEO-CLIPES-NOS-2-LUGARES-0411')) e.push(`F ${nome} sem a marca`)
  return e
}

const vivo = carrega()
const erros = checa(vivo)
for (const m of erros) console.log('     →', m)
ok(erros.length === 0, `(A–F) lista, os 2 lugares, estação, ordem do dia e carga${erros.length ? `: ${erros.length} erro(s)` : ''}`)
ok(rd(LIB).split('\n').every((l) => !/^import\b/.test(l)), 'lista compartilhada é módulo puro, sem import')

const mutante = (nome, novasTrocas, fontes = {}, existe) => {
  let r
  try { r = checa(carrega(novasTrocas), fontes, existe) } catch (err) { r = ['quebrou: ' + err.message] }
  ok(r.length > 0, `M ${nome}: vermelho${r.length ? ' — ' + String(r[0]).slice(0, 90) : ' (passou batido)'}`)
}
const troca = (de, para) => (s) => { if (!s.includes(de)) throw new Error('mutante sem alvo: ' + de.slice(0, 60)); return s.replace(de, para) }
const NOVOS = 'const novos = clipesNovosDoDia(dia)'
mutante('clipe falta na home', { [MOSAICO]: troca(NOVOS, "const novos = opts.full ? clipesNovosDoDia(dia) : { grandes: clipesNovosDoDia(dia).grandes, pequenos: clipesNovosDoDia(dia).pequenos.slice(1) }") })
mutante('clipe falta na galeria', { [MOSAICO]: troca(NOVOS, "const novos = !opts.full ? clipesNovosDoDia(dia) : { grandes: clipesNovosDoDia(dia).grandes.slice(1), pequenos: clipesNovosDoDia(dia).pequenos }") })
mutante('uma lista por lugar', { [MOSAICO]: troca(NOVOS, 'const novos = opts.full ? clipesNovosDoDia(dia) : { grandes: [], pequenos: [] }') })
mutante('abóbora de volta', { [LIB]: troca("imagens: ['pumpkin.webp'],", 'imagens: [],') })
mutante('lobisomem de volta', { [LIB]: troca("clipes: ['werewolf'],", 'clipes: [],') })
mutante('bruxa de volta', { [LIB]: troca("efeitos: ['witch', 'zombie',", "efeitos: ['zombie',") })
mutante('Catrina de volta', { [LIB]: troca("'catrina', 'catrina_pet', ", '') })
mutante('Turn to dust de volta', { [LIB]: troca("'dust_away', 'figurine_3d'],", "'figurine_3d'],") })
mutante('3D figurine de volta', { [LIB]: troca("'dust_away', 'figurine_3d'],", "'dust_away'],") })
mutante('Natal some junto', { [LIB]: troca("efeitos: ['witch',", "efeitos: ['snow_globe', 'witch',") })
mutante('ordem não determinística na mesma data', { [LIB]: troca('return ((t ^ (t >>> 14)) >>> 0) / 4294967296', 'return Math.random()') })
mutante('mesma ordem em duas datas', { [LIB]: troca('let s = semente(`${dia}|${sal}`)', 'let s = semente(sal)') })
mutante('ordem muda com a hora', { [LIB]: troca('return new Date(now).toISOString().slice(0, 10)', 'return new Date(now).toISOString().slice(0, 16)') })
mutante('selo errado', { [LIB]: troca("{ id: 'perfume-splash', title: 'Perfume splash', engine: 'hollywood'", "{ id: 'perfume-splash', title: 'Perfume splash', engine: 'seedance'") })
mutante('texto de foto no /clips', { [LIB]: troca("focus: '50% 12%', pessoa: true, prompt: null", "focus: '50% 12%', pessoa: true, prompt: 'Keep the same woman, same face, same yellow jacket and same blank white cup, one continuous shot with no cuts, walking across the crosswalk.'") })
mutante('clipes em bloco no topo', { [LIB]: troca('const passo = Math.max(1, Math.floor(base.length / extras.length))', 'return [...extras, ...base]\n  const passo = 1'), [MOSAICO]: troca("const semBloco = afastaVizinhos(out, (t) => t.kind === 'novo', mesmoTamanho, 2)", 'const semBloco = out') })
mutante('a moça colada nela mesma', { [MOSAICO]: troca("return afastaVizinhos(semBloco, (t) => t.kind === 'novo' && t.clip.pessoa,", 'return afastaVizinhos(semBloco, () => false,') })
mutante('3 clipes novos seguidos', { [MOSAICO]: troca("const semBloco = afastaVizinhos(out, (t) => t.kind === 'novo', mesmoTamanho, 2)", 'const semBloco = out') })
mutante('imagem grande sai da 1ª fileira', { [MOSAICO]: troca('...imagensDaVitrine.filter((i) => HOME_GALLERY_BIG.has(i.file)), ...embaralhaDoDia(imagensDaVitrine.filter((i) => !HOME_GALLERY_BIG.has(i.file)), dia,', '...embaralhaDoDia(imagensDaVitrine, dia,') })
mutante('cartão grande demais abre buraco', { [LIB]: troca('const nGrandes = Math.ceil(lista.length / 4)', 'const nGrandes = Math.ceil(lista.length / 2)') })
// KINEO-OUTFIT-MORPH-HOME-0911 — desde o 16º clipe o fim da grade tem DUAS proteções (imagem larga fora da cauda + fechaOFim). Sem a 2ª, o
// mutante da 1ª passava batido: agora ele derruba as duas juntas, e cada uma tem o seu mutante sozinho.
const SEM_FECHAR = (s) => troca('const ordem = fechaOFim(ordem0, alto,', 'const ordem = ((x) => x)(ordem0, alto,')(s)
mutante('imagem larga no fim abre buraco', { [MOSAICO]: (s) => SEM_FECHAR(troca("(i) => i.w > i.h, 8)", "() => false, 8)")(s)) })
mutante('o fim da grade não fecha (16 clipes, degrau vazio)', { [MOSAICO]: SEM_FECHAR })
mutante('fechaOFim aceita arrumação que piora', { [LIB]: troca('if (c[0] < melhorCusto[0] && c.every((v, n) => v <= base[n]) && aceita(fila))', 'if (c[0] > melhorCusto[0])') })
mutante('pessoa colada no fim, sem busca para trás', { [LIB]: troca('for (const alvo of trocou ? [] : [i, i - run + 1]) {', 'for (const alvo of []) {') })
mutante('pôster baixa antes da hora', { [MOSAICO]: troca('alt="" loading="lazy" decoding="async" style={{ objectPosition', 'alt="" decoding="async" style={{ objectPosition') })
mutante('vídeo direto no cartão', { [MOSAICO]: troca('<WallMedia src={clipeNovoVideo(c)} />', '<video src={clipeNovoVideo(c)} autoPlay muted loop playsInline />') }, { mosaico: rd(MOSAICO).replace('<WallMedia src={clipeNovoVideo(c)} />', '') })
mutante('cartão chama de anúncio', { [MOSAICO]: troca('<i><UiLabel>Clip</UiLabel> · {motor}</i>', '<i><UiLabel>Ad</UiLabel> · {motor}</i>') })
mutante('cartão leva às Ads', { [MOSAICO]: troca('href={viaSignup(clipeNovoDestino(c), signedIn)}', "href={viaSignup('/ads/new', signedIn)}") })
// KINEO-OUTFIT-MORPH-HOME-0911 — o ramo do cartão de formato
mutante('formato mostra motor', { [MOSAICO]: troca('{c.selo ? <i><UiLabel>{c.selo}</UiLabel></i>', '{c.selo ? <i><UiLabel>Clip</UiLabel> · Kling 4.0</i>') })
mutante('formato perde o selo', { [MOSAICO]: troca('{c.selo ? <i><UiLabel>{c.selo}</UiLabel></i>', '{c.selo ? <i></i>') })
mutante('formato leva ao /clips com motor', { [LIB]: troca("if (c.engine === null) return '/clips'", "if (c.engine === null) return '/clips?engine=hollywood'") })
mutante('formato rotulado com motor errado', { [LIB]: troca("id: 'outfit-morph', title: 'Outfit morph', engine: null, selo: 'Trending format'", "id: 'outfit-morph', title: 'Outfit morph', engine: 'hollywood', selo: undefined") })
mutante('formato no aria-label com motor', { [MOSAICO]: troca('aria-label={`${c.title} — ${motor}`}', 'aria-label={`${c.title} — ${motor} · Kling 4.0`}') })
mutante('arquivo faltando',{}, {}, (rel) => !rel.includes('pet-barista.mp4') && fs.existsSync(path.join(ROOT, rel)))
mutante('pôster faltando', {}, {}, (rel) => !rel.endsWith('produto-tenis-rua.webp') && fs.existsSync(path.join(ROOT, rel)))
mutante('"newest first" de volta', {}, { pagina: rd(PAGINA) + '\nClips, newest first.' })

console.log(`${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
