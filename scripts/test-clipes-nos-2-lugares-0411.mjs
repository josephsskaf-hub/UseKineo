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
// KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"] — o filme e o "Product ads" passam pela entrada única
// (lib/create/entry.ts): logado → a aba da tela nova; visitante (este render) → o /studio e o /ads/new de hoje (KINEO-ENTRADAS-SO-LOGADO-1011).
const ENTRADA = require('../docs/recreate-0911/test-recreate.cjs').loader()('lib/create/entry')
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
  // KINEO-VITRINE-10-1011 [fundador 10/11: "tá muito legal os 10… Pode colocar os 10 na tela inicial"] — nenhum tem linha em `clips`.
  // 3 filmes narrados feitos no Kineo Studio (Kling 4.0, 09/11): selo 'Narrated film', o cartão abre o Studio pelo MESMO link dos filmes da vitrine.
  'filme-mary-celeste': ['studio:772be5b8/9302d8c6', null, 'filme', 'Narrated film'],
  'filme-anticitera': ['studio:1b9e1d60/a451a9b4', null, 'filme', 'Narrated film'],
  'filme-porta-do-inferno': ['studio:9a3e5b44/1fcab375', null, 'filme', 'Narrated film'],
  // 7 clipes de uma cena (Nano Banana Pro + Kling 4.0 image-to-video, 09/11): como o outfit-morph — sem motor, 'Trending format', /clips puro.
  'passarela': ['fal:0ab1d89b/HbvScocR9LQY-FT8vl-CA', null, 'foto', 'Trending format'],
  'escolha-o-favorito': ['fal:0ab1d9f9/EnyKpFmu87NtPpo-kfujT', null, 'foto', 'Trending format'],
  'dinheiro': ['fal:0ab1d9f0/7vfzrcsW7He9IOli4H5Lk', null, 'foto', 'Trending format'],
  'duelo-de-danca': ['fal:0ab1d9f3/iLdN6Py4oNvS6P4yUAQlQ', null, 'foto', 'Trending format'],
  'kit-skincare': ['fal:0ab1da00/tKyNDXU7RAxwcmy_kF-BU', null, 'foto', 'Trending format'],
  'dragaozinho': ['fal:0ab1da07/LBX9mJqp4LXh5eUkA37kb', null, 'foto', 'Trending format'],
  'boneco-de-neve': ['fal:0ab1da01/aYq5oKWE2FXdjYSbpJnH0', null, 'foto', 'Trending format'],
  // KINEO-ADS-NATAL-VITRINE-1011 [fundador 10/11: "Pode colocar todos na página inicial como anúncios… Em vez de Recreate, a pessoa vai fazer o
  // anúncio dela"] — 6 anúncios de Natal feitos À MÃO em 10/11 (Nano Banana Pro + Kling 4.0 multi_prompt), FORA do produto de Ads: sem linha em
  // `clips` nem em `ads_v2_orders`. Modo 'anuncio': sem motor, sem texto, selo 'Ad example', o cartão convida ("Make your ad") e leva ao /ads/new.
  'anuncio-skincare': ['manual:ads-natal-1011/ad1-ugc-skincare.mp4', null, 'anuncio', 'Ad example'],
  'anuncio-relogio': ['manual:ads-natal-1011/ad2-relogio.mp4', null, 'anuncio', 'Ad example'],
  'anuncio-colar': ['manual:ads-natal-1011/ad3-colar.mp4', null, 'anuncio', 'Ad example'],
  'anuncio-caneca': ['manual:ads-natal-1011/ad4-caneca.mp4', null, 'anuncio', 'Ad example'],
  'anuncio-sueter-pet': ['manual:ads-natal-1011/ad5-pet.mp4', null, 'anuncio', 'Ad example'],
  'anuncio-manta': ['manual:ads-natal-1011/ad6-manta.mp4', null, 'anuncio', 'Ad example'],
}
// KINEO-ADS-NATAL-VITRINE-1011 — o que NENHUM cartão pode dizer nem insinuar (nem no texto, nem no aria-label): que o vídeo foi feito pela
// ferramenta de Ads. Os exemplos de anúncio foram feitos à mão; o convite "Make your ad" chama a pessoa, não atribui a autoria.
const ATRIBUI_AS_ADS = /\b(made|created|generated|built|produced)\s+(with|by|in|on|using)\s+(the\s+)?(Kineo\s+Ads|Studio\s+Ads|(the\s+)?ads?\s+(tool|maker|product|generator))|\bKineo\s+Ads\b|\bStudio\s+Ads\b|\bads?\s+tool\b/i
// KINEO-OUTFIT-MORPH-HOME-0911 — nomes de motor que um cartão de FORMATO nunca pode mostrar (nem em texto, nem no aria-label, nem no link).
const NOMES_DE_MOTOR = /\b(Kling|Seedance|MiniMax|H3|Veo|Omni|Hailuo|Wan|Sora|Runway|Pika|Kineo 1)\b/i
// KINEO-CARDS-SEM-MOTOR-0911 [fundador 09/11: "quero que você tire os nomes dos motores, porque eu não vejo em outros sites"] — nenhum cartão
// da vitrine mostra motor (texto visível nem aria-label). A regra vira: o motor GRAVADO no dado é o real (VERDADE) e o link abre nele.
const { CLIP_ENGINES, clipShowcaseLabel } = require(path.join(ROOT, 'lib/clips/clipCatalog.ts')) // KINEO-ROTULO-CLIPE-H3-1111: clipShowcaseLabel
// Founder 10/11: prepare public Recreate; preserve legacy destinations outside the approved catalog.
const { publicRecreatePath } = require(path.join(ROOT, 'lib/recreate/entry.ts'))
const escapa = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const motorNoTexto = new RegExp(`${NOMES_DE_MOTOR.source}|${Object.values(CLIP_ENGINES).map((m) => escapa(m.label)).join('|')}`, 'i')
const INICIO = Date.parse('2026-11-05T12:00:00Z')
const DIA = 86400000
const NATAL = ['snow_globe', 'santa_cartoon', 'pet_xmas_tree', 'pet_xmas_angel']
const estilos = (n) => Array.from({ length: n }, (_, i) => ({ key: `est-${i}`, title: `Estilo ${i}`, engine: i % 2 ? 'Seedance 1.5' : null /* KINEO-CARDS-SEM-MOTOR-0911 — estilo com motor no dado: o cartão não pode imprimir */, video: `/e${i}.mp4`, poster: null, href: `/e${i}` }))
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
    if ((c.engine === null) !== (c.selo !== undefined) || (c.engine === null && c.selo !== VERDADE[id][3])) e.push(`A ${id}: selo de formato só existe (e é obrigatório) quando não há motor do /clips, e é o da verdade (${VERDADE[id][3]})`) // KINEO-OUTFIT-MORPH-HOME-0911 · KINEO-VITRINE-10-1011 — 'Narrated film' só nos 3 filmes do Studio
    if (modo === 'filme' && c.prompt !== null) e.push(`A ${id}: filme preenchendo texto no /clips`) // KINEO-VITRINE-10-1011
    if (modo === 'anuncio' && c.prompt !== null) e.push(`A ${id}: exemplo de anúncio preenchendo texto`) // KINEO-ADS-NATAL-VITRINE-1011
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
  // KINEO-VITRINE-10-1011 [fundador 10/11: "Pode colocar os 10 na tela inicial"] — teto do total 9 → 11 MB, o menor que cabe (26 clipes = 10,8 MB;
  // eram 6,7 MB com 16). Seguro: o pôster é <img loading="lazy"> e cada vídeo só baixa quando o cartão aparece na tela (WallMedia, preload none,
  // provado em E abaixo); nada disso entra no 1º carregamento. O teto de 600 KB por prévia continua o mesmo.
  // KINEO-ADS-NATAL-VITRINE-1011 [fundador 10/11: "Pode colocar todos na página inicial como anúncios"] — teto do total 11 → 14 MB, o menor
  // redondo que cabe (32 clipes = 13,8 MB; eram 10,8 MB com 26). Mesmo motivo de segurança: pôster <img loading="lazy"> e vídeo só na tela
  // (WallMedia, preload none, provado em E); nada disso entra no 1º carregamento. O teto de 600 KB por prévia continua o mesmo.
  if (bytes > 14 * 1024 * 1024) e.push(`A ${(bytes / 1048576).toFixed(1)} MB de mídia nova (> 14)`)
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
      // KINEO-CARDS-SEM-MOTOR-0911 — o selo é só o TIPO: "Clip" (motor do /clips) ou o formato (KINEO-OUTFIT-MORPH-HOME-0911); motor nenhum no cartão
      // KINEO-CARDS-SEM-ETIQUETA-0911 [fundador 09/11: "Só a etiqueta"] — o tipo saiu da tela: vive só no aria-label (leitor de tela)
      const tipo = c.engine === null ? VERDADE[c.id]?.[3] ?? '?' : 'Clip'
      if (!cartao.includes(`aria-label="${c.title} — ${tipo}"`)) e.push(`B ${lugar}: ${c.id} sem o tipo "${tipo}" no aria-label`)
      if (cartao.includes(`>${tipo}</`)) e.push(`B ${lugar}: ${c.id} mostra a etiqueta "${tipo}" na tela`)
      if (/Clip<\/span> ·|Clip · /.test(cartao)) e.push(`B ${lugar}: ${c.id} mostra "Clip · motor"`)
      const achado = motorNoTexto.exec(cartao.replace(/href="[^"]*"/g, ''))
      if (achado) e.push(`B ${lugar}: ${c.id} mostra o motor "${achado[0]}"`)
      if (c.engine !== null && clipShowcaseLabel(c.engine) !== VERDADE[c.id]?.[3]) e.push(`B ${lugar}: ${c.id}: o motor gravado (${c.engine}) não é o da tabela`)
      // KINEO-ADS-NATAL-VITRINE-1011 [fundador 10/11: "como anúncios… em vez de Recreate, a pessoa vai fazer o anúncio dela"] — só o exemplo de
      // anúncio pode falar em anúncio (o tipo no aria-label e o convite "Make your ad"); nenhum cartão diz que a ferramenta de Ads fez o vídeo.
      if (VERDADE[c.id]?.[2] !== 'anuncio' && /\bAd\b|Ads\b/.test(cartao.replace(/href="[^"]*"/, ''))) e.push(`B ${lugar}: ${c.id} fala em anúncio`)
      const atribui = ATRIBUI_AS_ADS.exec(cartao.replace(/(href|data-home-cta)="[^"]*"/g, ''))
      if (atribui) e.push(`B ${lugar}: ${c.id} diz que a ferramenta de Ads fez o vídeo ("${atribui[0]}")`)
      const bruto = (/href="([^"]+)"/.exec(cartao)?.[1] ?? '').replace(/&amp;/g, '&')
      const destino = bruto.startsWith('/signup?') ? new URLSearchParams(bruto.split('?').slice(1).join('?')).get('redirect') ?? '' : ''
      const pedido = new URLSearchParams(destino.split('?').slice(1).join('?'))
      if (VERDADE[c.id]?.[2] === 'anuncio') { // KINEO-ADS-NATAL-VITRINE-1011 — exemplo de anúncio: o MESMO destino do "Product ads" do menu do topo, via signup
        const menuAntigo = /<Link href=\{createEntryHref\('ads', '([^']+)', isSignedIn\)\} data-nav-item="business" className="nav-primary"><UiLabel>Product ads<\/UiLabel><\/Link>/.exec(fonteLanding)?.[1]
        const menu = menuAntigo && ENTRADA.createEntryHref('ads', menuAntigo, false) // KINEO-ENTRADAS-TELA-NOVA-1011 — o destino que o menu abre hoje
        if (!menu || destino !== menu || bruto !== '/signup?' + new URLSearchParams({ redirect: menu }).toString()) e.push(`B ${lugar}: ${c.id} (exemplo de anúncio) não abre a criação de anúncio do menu "Product ads" (${menu}) via signup: ${bruto.slice(0, 80)}`)
        if (!/data-home-cta="mosaic_ad"/.test(cartao)) e.push(`B ${lugar}: ${c.id} (exemplo de anúncio) medido como outro tipo de cartão`)
      } else if (/data-home-cta="mosaic_ad"/.test(cartao) || destino.startsWith('/ads')) e.push(`B ${lugar}: ${c.id} não é exemplo de anúncio e leva às Ads: ${bruto.slice(0, 80)}`)
      else if (VERDADE[c.id]?.[2] === 'filme') { // KINEO-VITRINE-10-1011 — filme do Studio: o MESMO link dos filmes da vitrine, nunca o /clips
        const filme = /<a href="([^"]+)"[^>]*data-home-cta="mosaic_film"/.exec(html)?.[1]
        if (!bruto.startsWith('/signup?redirect=' + encodeURIComponent(new URL(ENTRADA.createEntryHref('film', '/studio', false), 'https://k').pathname)) || (filme && filme.replace(/&amp;/g, '&') !== bruto)) e.push(`B ${lugar}: ${c.id} (filme) não abre o Studio como os filmes da vitrine: ${bruto.slice(0, 80)}`)
      } else if (c.engine === null) { const esperado = publicRecreatePath(c.id) ?? '/clips'; if (destino !== esperado) e.push(`B ${lugar}: ${c.id} (formato) não leva ao catálogo aprovado ou fallback: ${bruto.slice(0, 80)}`) }
      else if (!destino.startsWith('/clips?') || pedido.get('engine') !== c.engine) e.push(`B ${lugar}: ${c.id} não leva ao /clips no motor: ${bruto.slice(0, 80)}`)
      if (c.prompt && pedido.get('prompt') !== c.prompt) e.push(`B ${lugar}: ${c.id} sem o texto no /clips`)
      if (!c.prompt && pedido.has('prompt')) e.push(`B ${lugar}: ${c.id} preenche texto que não tem`)
      if (!cartao.includes(`src="${lib.clipeNovoPoster(c)}"`)) e.push(`B ${lugar}: ${c.id} sem pôster`)
      if (!cartao.includes(`--kmz-focus:${c.focus}`)) e.push(`B ${lugar}: ${c.id} sem foco na janela`)
    }
    { // KINEO-CARDS-SEM-MOTOR-0911 — a vitrine INTEIRA (clipe, novo, multi-camera, filme, efeito, estilo, imagem): nenhum motor no texto nem no aria-label
      const visivel = html.replace(/(href|src|style|data-home-cta|data-clip-novo)="[^"]*"/g, '')
      const nome = motorNoTexto.exec(visivel)
      if (nome) e.push(`B ${lugar}: a vitrine mostra o motor "${nome[0]}" (…${visivel.slice(Math.max(0, nome.index - 60), nome.index + 20)}…)`)
      // KINEO-CARDS-SEM-ETIQUETA-0911 [fundador 09/11: "Só a etiqueta"] — nenhuma etiqueta de tipo aparece como texto em cartão nenhum
      const etiqueta = />\s*(Clip|Multi-camera|Narrated film|Effect|Ad style|Trending format|Ad example)\s*</.exec(html) // KINEO-ADS-NATAL-VITRINE-1011 — + Ad example
      if (etiqueta) e.push(`B ${lugar}: a vitrine mostra a etiqueta "${etiqueta[1]}" na tela`)
    }
    { // KINEO-RECREATE-SO-ONDE-RECRIA-1011 [fundador 10/11: "tem que colocar só os que recriam"] — o selo Recreate aparece EXATAMENTE nos
      // cartões cujo clique abre a criação pronta daquele vídeo: clipe com texto no link (/clips?…prompt=…), efeito e estilo de anúncio. Sem selo:
      // multicâmera, filme narrado, clipe sem texto (por foto, de formato) e imagem. Cada tipo tem de aparecer, para a regra não passar no vazio.
      const vistos = {}
      for (const m of html.matchAll(/<a [^>]*data-home-cta="(mosaic_[a-z_0-9-]+)"[^>]*>[\s\S]*?<\/a>/g)) {
        const [cartao, cta] = m
        const href = (/href="([^"]+)"/.exec(cartao)?.[1] ?? '').replace(/&amp;/g, '&')
        const destino = href.startsWith('/signup?') ? new URLSearchParams(href.split('?').slice(1).join('?')).get('redirect') ?? '' : href
        const formato = destino.startsWith('/recreate/') && publicRecreatePath(destino.slice('/recreate/'.length)) === destino
        const tipo = cta.startsWith('mosaic_effect_') ? 'efeito' : cta.startsWith('mosaic_style_') ? 'estilo' : cta === 'mosaic_clip' ? (formato ? 'formato Recreate' : /prompt(=|%3D)/.test(href) ? 'clipe com texto' : 'clipe sem texto') : cta.replace('mosaic_', '')
        const deve = tipo === 'efeito' || tipo === 'estilo' || tipo === 'clipe com texto' || tipo === 'formato Recreate'
        const tem = cartao.includes('class="kmz-re"')
        vistos[tipo] = (vistos[tipo] ?? 0) + 1
        if (tem !== deve) e.push(`R ${lugar}: ${tipo} ${deve ? 'sem' : 'com'} o selo Recreate (${(/aria-label="([^"]+)"/.exec(cartao)?.[1] ?? cta).slice(0, 60)})`)
        // KINEO-ADS-NATAL-VITRINE-1011 [fundador 10/11: "Em vez de Recreate, a pessoa vai fazer o anúncio dela"] — o convite "Make your ad" é um caso
        // à parte e explícito: EXATAMENTE nos exemplos de anúncio (cta mosaic_ad), nunca junto do Recreate, nunca em outro cartão.
        const convite = /class="kmz-re kmz-mkad"[^>]*>[\s\S]*?Make your ad/.test(cartao)
        if (convite !== (tipo === 'ad')) e.push(`R ${lugar}: ${tipo} ${tipo === 'ad' ? 'sem' : 'com'} o convite "Make your ad" (${(/aria-label="([^"]+)"/.exec(cartao)?.[1] ?? cta).slice(0, 60)})`)
      }
      for (const k of ['efeito', 'clipe com texto', 'clipe sem texto', 'ad', 'image', 'film', ...(opts.full ? ['estilo'] : ['motion'])]) if (!vistos[k]) e.push(`R ${lugar}: nenhum cartão "${k}" para provar a regra do selo`)
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
const COPIA_NOVO = '<span className="kmz-copy"><b><UiLabel>{c.title}</UiLabel></b><Views video={clipeNovoVideo(c)} />' // KINEO-ADS-NATAL-VITRINE-1011 — subiu para antes dos mutantes do anúncio
const injeta = (alvo, texto) => troca(alvo, alvo.replace('<span className="kmz-copy">', `<span className="kmz-copy">${texto}`)) // KINEO-ADS-NATAL-VITRINE-1011 — subiu para antes dos mutantes do anúncio
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
mutante('cartão grande demais abre buraco', { [LIB]: troca('const nGrandes = Math.min(4, Math.ceil(lista.length / 4))', 'const nGrandes = Math.ceil(lista.length / 2)') }) // KINEO-VITRINE-10-1011 — alvo novo: a conta ganhou o teto
mutante('sem o teto de 4 grandes (26 clipes, grandes sobrando no fim)', { [LIB]: troca('const nGrandes = Math.min(4, Math.ceil(lista.length / 4))', 'const nGrandes = Math.ceil(lista.length / 4)') }) // KINEO-VITRINE-10-1011
// KINEO-OUTFIT-MORPH-HOME-0911 — desde o 16º clipe o fim da grade tem DUAS proteções (imagem larga fora da cauda + fechaOFim). Sem a 2ª, o
// mutante da 1ª passava batido: agora ele derruba as duas juntas, e cada uma tem o seu mutante sozinho.
const SEM_FECHAR = (s) => troca('const ordem = fechaOFim(ordem0, alto,', 'const ordem = ((x) => x)(ordem0, alto,')(s)
// KINEO-ADS-NATAL-VITRINE-1011 — com 32 clipes o fim da grade de hoje fecha mesmo sem as duas proteções juntas, e este mutante passaria batido.
// As proteções continuam no código para a lista que encolher: ele passa a ser provado na lista de 26 clipes de 10/11 (a de quando era vermelho
// na lista inteira), olhando só a grade e a mistura (G e D). Primeiro a lista de 26 tem de ficar verde nelas.
const LISTA_N = (n) => (s) => troca('export const clipeNovoVideo', `export const CLIPES_NOVOS = _TODOS_1011.slice(0, ${n}); export const clipeNovoVideo`)(troca('export const CLIPES_NOVOS: readonly ClipeNovo[] = [', 'const _TODOS_1011: readonly ClipeNovo[] = [')(s))
const gradeN = (n, novasTrocas) => { const t = { ...novasTrocas, [LIB]: (s) => LISTA_N(n)(novasTrocas[LIB] ? novasTrocas[LIB](s) : s) }; let r; try { r = checa(carrega(t)) } catch (err) { r = ['G quebrou: ' + err.message] } return r.filter((x) => /^[DG] /.test(x)) }
{ const r = gradeN(26, {}); for (const m of r) console.log('     →', m); ok(r.length === 0, `lista de 26 clipes (10/11): grade e mistura verdes${r.length ? ': ' + r.length + ' erro(s)' : ''}`) }
{ const r = gradeN(26, { [MOSAICO]: (s) => SEM_FECHAR(troca("(i) => i.w > i.h, 8)", "() => false, 8)")(s)) }); ok(r.length > 0, `M imagem larga no fim abre buraco (lista de 26): vermelho${r.length ? ' — ' + String(r[0]).slice(0, 90) : ' (passou batido)'}`) }
// KINEO-VITRINE-10-1011 — com 26 clipes (teto de 4 grandes) o fim da grade de hoje fecha sem precisar do fechaOFim nem da busca para trás, e
// estes 3 mutantes passariam batido. As duas proteções continuam no código para a lista que encolher de novo: são provadas na lista de 16
// clipes de 09/11 (a mesma de quando nasceram), olhando só a grade e a mistura (G e D). Primeiro a lista de 16 tem de ficar verde nelas.
const LISTA_16 = (s) => troca('export const clipeNovoVideo', 'export const CLIPES_NOVOS = _TODOS_1011.slice(0, 16); export const clipeNovoVideo')(troca('export const CLIPES_NOVOS: readonly ClipeNovo[] = [', 'const _TODOS_1011: readonly ClipeNovo[] = [')(s))
const grade16 = (novasTrocas) => { const t = { ...novasTrocas, [LIB]: (s) => LISTA_16(novasTrocas[LIB] ? novasTrocas[LIB](s) : s) }; let r; try { r = checa(carrega(t)) } catch (err) { r = ['G quebrou: ' + err.message] } return r.filter((x) => /^[DG] /.test(x)) }
{ const r = grade16({}); for (const m of r) console.log('     →', m); ok(r.length === 0, `lista de 16 clipes (09/11): grade e mistura verdes${r.length ? ': ' + r.length + ' erro(s)' : ''}`) }
const mutante16 = (nome, novasTrocas) => { const r = grade16(novasTrocas); ok(r.length > 0, `M ${nome} (lista de 16): vermelho${r.length ? ' — ' + String(r[0]).slice(0, 90) : ' (passou batido)'}`) }
mutante16('o fim da grade não fecha (16 clipes, degrau vazio)', { [MOSAICO]: SEM_FECHAR })
mutante16('fechaOFim aceita arrumação que piora', { [LIB]: troca('if (c[0] < melhorCusto[0] && c.every((v, n) => v <= base[n]) && aceita(fila))', 'if (c[0] > melhorCusto[0])') })
mutante16('pessoa colada no fim, sem busca para trás', { [LIB]: troca('for (const alvo of trocou ? [] : [i, i - run + 1]) {', 'for (const alvo of []) {') })
mutante('pôster baixa antes da hora', { [MOSAICO]: troca('alt="" loading="lazy" decoding="async" style={{ objectPosition', 'alt="" decoding="async" style={{ objectPosition') })
mutante('vídeo direto no cartão', { [MOSAICO]: troca('<WallMedia src={clipeNovoVideo(c)} />', '<video src={clipeNovoVideo(c)} autoPlay muted loop playsInline />') }, { mosaico: rd(MOSAICO).replace('<WallMedia src={clipeNovoVideo(c)} />', '') })
mutante('cartão chama de anúncio', { [MOSAICO]: troca("const tipo = c.selo ?? 'Clip'", "const tipo = c.selo ?? 'Ad'") }) // KINEO-CARDS-SEM-MOTOR-0911 — alvo novo: o selo agora é o tipo
mutante('cartão leva às Ads', { [MOSAICO]: troca(': viaSignup(publicRecreatePath(c.id) ?? clipeNovoDestino(c), signedIn)}', ": viaSignup('/ads/new', signedIn)}") }) // KINEO-RECREATE-PUBLICO-PREPARO-1011
mutante('filme do Studio leva ao /clips', { [LIB]: troca("export const clipeNovoAbreStudio = (c: Pick<ClipeNovo, 'selo'>): boolean => c.selo === 'Narrated film'", "export const clipeNovoAbreStudio = (c: Pick<ClipeNovo, 'selo'>): boolean => false") }) // KINEO-VITRINE-10-1011
mutante('clipe de foto rotulado como filme', { [LIB]: troca("id: 'kit-skincare', title: 'Holiday skincare gift set', engine: null, selo: 'Trending format'", "id: 'kit-skincare', title: 'Holiday skincare gift set', engine: null, selo: 'Narrated film'") }) // KINEO-VITRINE-10-1011
mutante('anúncio de skincare leva às Ads', { [LIB]: troca("if (c.engine === null) return '/clips'", "if (c.engine === null) return '/ads/new'") }) // KINEO-VITRINE-10-1011
// KINEO-ADS-NATAL-VITRINE-1011 [fundador 10/11: "Pode colocar todos na página inicial como anúncios… Em vez de Recreate, a pessoa vai fazer o
// anúncio dela"] — o link às Ads agora é permitido SÓ no exemplo de anúncio; a AUTORIA continua proibida. Cada lado tem o seu mutante.
const ARIA_NOVO = 'aria-label={`${c.title} — ${tipo}`}'
// A autoria falsa tem de ficar vermelha PELA REGRA DA AUTORIA (não por tabela de outra regra): o mutante só passa se o erro "diz que a
// ferramenta de Ads fez o vídeo" aparecer.
const mutanteAutoria = (nome, novasTrocas) => { let r; try { r = checa(carrega(novasTrocas)) } catch (err) { r = ['quebrou: ' + err.message] } const m = r.find((x) => /diz que a ferramenta de Ads fez o vídeo/.test(x)); ok(!!m, `M ${nome}: vermelho pela regra da autoria${m ? ' — ' + m.slice(0, 90) : ' (passou batido)'}`) }
mutanteAutoria('exemplo de anúncio diz "made with Kineo Ads" (aria-label)', { [MOSAICO]: troca(ARIA_NOVO, "aria-label={`${c.title} — ${tipo}${podeFazerAnuncio(t) ? ', made with Kineo Ads' : ''}`}") })
mutanteAutoria('exemplo de anúncio diz "Made by the ad tool" (texto do cartão)', { [MOSAICO]: injeta(COPIA_NOVO, "{podeFazerAnuncio(t) ? <i><UiLabel>Made by the ad tool</UiLabel></i> : null}") })
mutanteAutoria('convite vira "Created with Studio Ads"', { [MOSAICO]: troca('<UiLabel>Make your ad</UiLabel>', '<UiLabel>Make your ad</UiLabel> <UiLabel>Created with Studio Ads</UiLabel>') })
mutante('exemplo de anúncio leva ao /clips', { [LIB]: troca("export const clipeNovoAnuncio = (c: Pick<ClipeNovo, 'selo'>): boolean => c.selo === 'Ad example'", "export const clipeNovoAnuncio = (c: Pick<ClipeNovo, 'selo'>): boolean => false") })
mutante('exemplo de anúncio sem passar pelo signup', { [MOSAICO]: troca(': viaSignup(clipeNovoDestino(c), signedIn)}', ": podeFazerAnuncio(t) ? '/ads/new' : viaSignup(clipeNovoDestino(c), signedIn)}") })
mutante('exemplo de anúncio leva a outro lugar das Ads', { [LIB]: troca("export const CRIAR_ANUNCIO_HREF = '/ads/new'", "export const CRIAR_ANUNCIO_HREF = '/ads/v2'") })
mutante('convite "Make your ad" some', { [MOSAICO]: troca('{podeFazerAnuncio(t) ? <MakeYourAd /> : null}', '') })
mutante('convite "Make your ad" em todo clipe novo', { [MOSAICO]: troca('{podeFazerAnuncio(t) ? <MakeYourAd /> : null}', '<MakeYourAd />') })
mutante('Recreate no exemplo de anúncio (em vez do convite)', { [MOSAICO]: troca("  if (t.kind === 'novo') return !!t.clip.prompt && !clipeNovoAnuncio(t.clip)", "  if (t.kind === 'novo') return !!t.clip.prompt || clipeNovoAnuncio(t.clip)") })
mutante('exemplo de anúncio medido como clipe', { [MOSAICO]: troca("data-home-cta={podeFazerAnuncio(t) ? 'mosaic_ad' : 'mosaic_clip'}", 'data-home-cta="mosaic_clip"') })
mutante('exemplo de anúncio rotulado como formato', { [LIB]: troca("id: 'anuncio-relogio', title: 'The gift watch', engine: null, selo: 'Ad example'", "id: 'anuncio-relogio', title: 'The gift watch', engine: null, selo: 'Trending format'") })
mutante('etiqueta "Ad example" na tela', { [MOSAICO]: injeta(COPIA_NOVO, '<i><UiLabel>{tipo}</UiLabel></i>') })
// KINEO-OUTFIT-MORPH-HOME-0911 — o ramo do cartão de formato
// KINEO-CARDS-SEM-ETIQUETA-0911 — os cartões não têm mais etiqueta: os mutantes de motor injetam o texto logo antes do título, onde ela ficava
const COPIA_CLIPE = '<span className="kmz-copy"><b><UiLabel>{c.title}</UiLabel></b><Views video={c.video} />'
mutante('etiqueta volta no clipe novo', { [MOSAICO]: injeta(COPIA_NOVO, '<i><UiLabel>{tipo}</UiLabel></i>') })
mutante('etiqueta volta no multi-camera', { [MOSAICO]: injeta('<span className="kmz-copy"><b>{t.title}</b>', '<i>Multi-camera</i>') })
mutante('etiqueta volta no efeito', { [MOSAICO]: injeta('<span className="kmz-copy"><b><UiLabel>{e.title}</UiLabel></b>', '<i><UiLabel>Effect</UiLabel></i>') })
mutante('tipo sai do aria-label', { [MOSAICO]: troca('aria-label={`${c.title} — ${tipo}`}', 'aria-label={c.title}') })
mutante('formato mostra motor', { [MOSAICO]: injeta(COPIA_NOVO, "<i>{c.selo ? 'Kling 4.0' : ''}</i>") })
mutante('formato perde o selo', { [MOSAICO]: troca("const tipo = c.selo ?? 'Clip'", "const tipo = 'Clip'") })
mutante('formato leva ao /clips com motor', { [LIB]: troca("if (c.engine === null) return '/clips'", "if (c.engine === null) return '/clips?engine=hollywood'") })
mutante('formato rotulado com motor errado', { [LIB]: troca("id: 'outfit-morph', title: 'Outfit morph', engine: null, selo: 'Trending format'", "id: 'outfit-morph', title: 'Outfit morph', engine: 'hollywood', selo: undefined") })
mutante('formato no aria-label com motor', { [MOSAICO]: troca('aria-label={`${c.title} — ${tipo}`}', 'aria-label={`${c.title} — ${tipo}${c.selo ? \' · Kling 4.0\' : \'\'}`}') })
// KINEO-CARDS-SEM-MOTOR-0911 — o motor não volta por nenhum tipo de cartão, nem pelo aria-label; e o dado segue honesto
mutante('motor volta no clipe novo', { [MOSAICO]: (s) => "import { CLIP_ENGINES as CE } from '@/lib/clips/clipCatalog'\n" + injeta(COPIA_NOVO, "<i>{c.engine ? CE[c.engine].label : ''}</i>")(s) })
mutante('motor no aria-label do clipe novo', { [MOSAICO]: (s) => "import { CLIP_ENGINES as CE } from '@/lib/clips/clipCatalog'\n" + troca('aria-label={`${c.title} — ${tipo}`}', 'aria-label={`${c.title} — ${c.engine ? CE[c.engine].label : tipo}`}')(s) })
mutante('motor volta no clipe grande', { [MOSAICO]: (s) => "import { CLIP_ENGINES as CE } from '@/lib/clips/clipCatalog'\n" + injeta(COPIA_CLIPE, '<i>{CE[c.engine].label}</i>')(s) })
mutante('motor volta no multi-camera', { [MOSAICO]: injeta('<span className="kmz-copy"><b>{t.title}</b>', '<i>Kling 3</i>') })
mutante('motor no aria-label do multi-camera', { [MOSAICO]: troca("aria-label={t.title + ' — multi-camera'}", "aria-label={t.title + ' — Kling 3'}") })
mutante('motor volta no filme', { [MOSAICO]: injeta('<span className="kmz-copy"><b><UiLabel>{t.title}</UiLabel></b>', '<i>{t.badge}</i>') })
mutante('motor volta no estilo', { [MOSAICO]: injeta('<span className="kmz-copy"><b><UiLabel>{st.title}</UiLabel></b>', "<i>{st.engine ?? ''}</i>") })
// KINEO-RECREATE-SO-ONDE-RECRIA-1011 — o selo nos dois sentidos
mutante('selo Recreate volta no multicâmera', { [MOSAICO]: troca("  if (t.kind === 'clip') return !!t.clip.prompt", "  if (t.kind === 'motion') return true\n  if (t.kind === 'clip') return !!t.clip.prompt") })
mutante('selo Recreate volta no filme narrado', { [MOSAICO]: troca("  if (t.kind === 'clip') return !!t.clip.prompt", "  if (t.kind === 'film') return true\n  if (t.kind === 'clip') return !!t.clip.prompt") })
mutante('selo Recreate some do clipe com texto', { [MOSAICO]: troca("  if (t.kind === 'clip') return !!t.clip.prompt", "  if (t.kind === 'clip') return false") })
mutante('selo Recreate some do clipe novo com texto', { [MOSAICO]: troca("  if (t.kind === 'novo') return !!publicRecreatePath(t.clip.id) || !!t.clip.prompt", "  if (t.kind === 'novo') return false") })
mutante('selo Recreate no formato fora do catálogo', { [MOSAICO]: troca("  if (t.kind === 'novo') return !!publicRecreatePath(t.clip.id) || !!t.clip.prompt", "  if (t.kind === 'novo') return true") })
mutante('selo Recreate some do efeito', { [MOSAICO]: troca("return t.kind === 'effect' || t.kind === 'style'", "return t.kind === 'style'") })
mutante('selo Recreate some do estilo de anúncio', { [MOSAICO]: troca("return t.kind === 'effect' || t.kind === 'style'", "return t.kind === 'effect'") })
mutante('selo Recreate em todo cartão de vídeo (regra antiga)', { [MOSAICO]: (s) => s.replaceAll('{podeRecriar(t) ? <Recreate /> : null}', '<Recreate />') })
mutante('arquivo faltando',{}, {}, (rel) => !rel.includes('pet-barista.mp4') && fs.existsSync(path.join(ROOT, rel)))
mutante('pôster faltando', {}, {}, (rel) => !rel.endsWith('produto-tenis-rua.webp') && fs.existsSync(path.join(ROOT, rel)))
mutante('"newest first" de volta', {}, { pagina: rd(PAGINA) + '\nClips, newest first.' })

// ─── KINEO-EFEITO-DIRETO-1011 [fundador 10/11: "Tá caindo nessa página aqui, que era anterior, acho que deveria não cair mais"] ──────────
// O cartão de EFEITO (vitrine da home + /made-with-kineo, e a faixa antiga "New effects") leva DIRETO ao /recreate/effect-<slug>; visitante
// passa pelo cadastro e volta para lá. Com o interruptor do Recreate em 'internal' volta à página pública do efeito; efeito fora do catálogo
// também. A medição (data-home-cta mosaic_effect_<key> / new_effect_<key>) não muda. Executa os componentes DE VERDADE, nos dois estados.
const RELEASE = 'lib/recreate/release.ts'
const NOVOS_EFEITOS = 'components/home/HomeNewEffects.tsx'
const FECHA_RECREATE = (s) => { const de = "export const RECREATE_RELEASE: InternalRelease = 'public'"; if (!s.includes(de)) throw new Error('interruptor do Recreate sumiu'); return s.replace(de, "export const RECREATE_RELEASE: InternalRelease = 'internal'") }
function checaEfeitos(novasTrocas = {}) {
  const e = []
  for (const aberto of [true, false]) {
    const tr = aberto ? novasTrocas : { ...novasTrocas, [RELEASE]: FECHA_RECREATE }
    const { mosaico } = carrega(tr)
    const novos = require(path.join(ROOT, NOVOS_EFEITOS))
    const { RECREATE_RELEASE } = require(path.join(ROOT, RELEASE))
    const estado = aberto ? 'Recreate público' : "Recreate 'internal'"
    if ((RECREATE_RELEASE === 'public') !== aberto) { e.push(`X ${estado}: interruptor não está no estado do teste (${RECREATE_RELEASE})`); continue }
    const telas = [
      ['vitrine da home', (signedIn) => React.createElement(mosaico.default, { signedIn }), 'mosaic_effect_', mosaico.homeMosaicTiles(Date.now(), {}).filter((t) => t.kind === 'effect').length],
      ['galeria', (signedIn) => React.createElement(mosaico.default, { signedIn, full: true, styles: estilos(3) }), 'mosaic_effect_', null],
      ['faixa "New effects"', (signedIn) => React.createElement(novos.default, { signedIn }), 'new_effect_', novos.homeNewEffects().length],
    ]
    for (const [tela, el, prefixo, esperados] of telas) {
      for (const signedIn of [false, true]) {
        const html = lf(renderToStaticMarkup(el(signedIn)))
        const cartoes = [...html.matchAll(new RegExp(`<a [^>]*data-home-cta="${prefixo}([a-z0-9_]+)"[^>]*>`, 'g'))]
        const quem = `${estado}, ${tela}, ${signedIn ? 'logado' : 'visitante'}`
        if (cartoes.length === 0) { e.push(`X ${quem}: nenhum cartão de efeito medido como ${prefixo}<key>`); continue }
        if (esperados !== null && cartoes.length !== esperados) e.push(`X ${quem}: ${cartoes.length} cartões medidos de ${esperados} efeitos`)
        for (const [tag, key] of cartoes) {
          const href = (/href="([^"]+)"/.exec(tag)?.[1] ?? '').replace(/&amp;/g, '&')
          const slug = key.replaceAll('_', '-')
          const recreate = `/recreate/effect-${slug}`
          const certo = aberto
            ? (signedIn ? recreate : '/signup?' + new URLSearchParams({ redirect: recreate }).toString())
            : `/effects/${slug}`
          if (href !== certo) e.push(`X ${quem}: ${key} leva a ${href.slice(0, 90)} (devia ${certo})`)
        }
      }
    }
    // efeito fora do catálogo do Recreate: o destino antigo, logado ou não, aberto ou fechado
    for (const signedIn of [false, true]) {
      const fora = mosaico.effectCardHref({ key: 'fora_do_catalogo_1011' }, signedIn)
      if (fora !== '/effects/fora-do-catalogo-1011') e.push(`X ${estado}: efeito fora do catálogo leva a ${fora}`)
    }
  }
  if (!rd(MOSAICO).includes('data-home-cta={`mosaic_effect_${e.key}`}')) e.push('X a medição mosaic_effect_<key> mudou na fonte')
  return e
}
const errosEfeito = checaEfeitos()
for (const m of errosEfeito) console.log('     →', m)
ok(errosEfeito.length === 0, `(X) cartão de efeito direto ao Recreate (visitante via cadastro), página do efeito com o interruptor fechado e fora do catálogo${errosEfeito.length ? `: ${errosEfeito.length} erro(s)` : ''}`)
const mutanteEfeito = (nome, novasTrocas) => {
  let r
  try { r = checaEfeitos(novasTrocas) } catch (err) { r = ['quebrou: ' + err.message] }
  ok(r.length > 0, `M ${nome}: vermelho${r.length ? ' — ' + String(r[0]).slice(0, 90) : ' (passou batido)'}`)
}
mutanteEfeito('cartão de efeito volta à página antiga', { [MOSAICO]: troca('href={effectCardHref(e, signedIn)}', 'href={effectPagePath(effectSlug(e))}') })
mutanteEfeito('faixa "New effects" volta à página antiga', { [NOVOS_EFEITOS]: troca('href={effectCardHref(effect, signedIn)}', "href={'/effects/' + effect.key.replaceAll('_', '-')}") })
mutanteEfeito('visitante pula o cadastro', { [MOSAICO]: troca('return recreate ? viaSignup(recreate, signedIn) :', 'return recreate ? recreate :') })
mutanteEfeito('ignora o interruptor do Recreate', { [MOSAICO]: troca('const recreate = publicRecreatePath(`effect-${effectSlug(e)}`)', 'const recreate = `/recreate/effect-${effectSlug(e)}`') })
mutanteEfeito('sem caminho de volta (interruptor fechado vai ao /clips)', { [MOSAICO]: troca(': effectPagePath(effectSlug(e))\n}', ": '/clips'\n}") })
mutanteEfeito('medição do efeito muda no cartão', { [MOSAICO]: troca('data-home-cta={`mosaic_effect_${e.key}`}', 'data-home-cta="mosaic_effect"') })
carrega()

console.log(`${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
