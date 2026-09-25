#!/usr/bin/env node
// KINEO-FLUXO-NOVO-2026-09-25 — guardião do nav_item_clicked (ordem do fundador 25/09, item 3: medir os cliques
// do menu de 4 itens para decidir o 5º). Sem rede, sem banco, sem React.
//
// O QUE ELE PROVA, EXECUTANDO lib/navTelemetry.ts num vm com um DOM falso (transpileModule, sem alias '@/'):
//   1. o payload sai só de atributos data-nav-* — o DOM falso EXPLODE se alguém ler textContent/innerText;
//   2. vale o [data-nav-item] mais interno acima de um a[href]/button; clique fora de link não grava;
//   3. item fora de NAV_ITEM_RE é descartado inteiro; superfície/área fora do enum viram 'unknown';
//   4. href_path nunca carrega query, e-mail nem esquema mailto/javascript;
//   5. o ouvinte é UM, na fase de CAPTURA, sobrevive a montagem dupla e trava duplicata em 400 ms;
//   6. o layout monta o componente logo depois do <SourceCapture /> sem quebrar o trecho fixado por
//      test-autopilot-pilot-resume; o nome NÃO está em SERVER_ONLY_EVENTS (o sink é lista de negação);
//   7. contrato do Codex: todo data-nav-* literal em app/ e components/ está no enum (0 até o lote dele subir).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(RAIZ, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }
const js = (v) => JSON.stringify(v)

// ── carregador: cada chamada devolve uma instância NOVA do módulo (estado de montagem zerado) ──────────
const LIB = 'lib/navTelemetry.ts'
function carrega() {
  const out = ts.transpileModule(readFileSync(join(RAIZ, LIB), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: LIB,
  }).outputText
  const mod = { exports: {} }
  // Sem `require` no contexto: se o módulo ganhar um import, o guardião cai aqui (tem que seguir puro).
  vm.runInNewContext(out, { module: mod, exports: mod.exports, URL }, { filename: LIB })
  return mod.exports
}

// ── DOM falso: closest/getAttribute de verdade, e qualquer leitura de TEXTO explode ────────────────────
const LEU_TEXTO = []
const textoProibido = (tag) => ({
  get textContent() { LEU_TEXTO.push(`${tag}.textContent`); throw new Error('leu textContent') },
  get innerText() { LEU_TEXTO.push(`${tag}.innerText`); throw new Error('leu innerText') },
  get innerHTML() { LEU_TEXTO.push(`${tag}.innerHTML`); throw new Error('leu innerHTML') },
  get outerHTML() { LEU_TEXTO.push(`${tag}.outerHTML`); throw new Error('leu outerHTML') },
  get nodeValue() { LEU_TEXTO.push(`${tag}.nodeValue`); throw new Error('leu nodeValue') },
})
function casa(el, seletor) {
  return seletor.split(',').some((parte) => {
    const m = parte.trim().match(/^([a-z]*)(?:\[([a-z-]+)\])?$/)
    if (!m || (!m[1] && !m[2])) throw new Error(`seletor fora do DOM falso: ${parte}`)
    if (m[1] && el.tag !== m[1]) return false
    if (m[2] && !Object.hasOwn(el.attrs, m[2])) return false
    return true
  })
}
function no(tag, attrs = {}, pai = null) {
  const el = Object.assign(textoProibido(tag), {
    tag,
    attrs,
    parentElement: pai,
    getAttribute(nome) { return Object.hasOwn(attrs, nome) ? String(attrs[nome]) : null },
    closest(sel) { for (let c = this; c; c = c.parentElement) if (casa(c, sel)) return c; return null },
  })
  return el
}
const noDeTexto = (pai) => Object.assign(textoProibido('#text'), { nodeType: 3, parentElement: pai })

const M = carrega()
const chama = (alvo, caminho) => {
  try { return { valor: M.navClickPayload(alvo, caminho), erro: null } } catch (e) { return { valor: undefined, erro: e } }
}

console.log('1) constantes do contrato')
ok(M.NAV_EVENT === 'nav_item_clicked', '1a. NAV_EVENT é nav_item_clicked')
ok(M.NAV_TELEMETRY_VERSION === 1, '1b. nav_v = 1 (corte da leitura dos 14 dias)')
ok(js([...M.NAV_SURFACES]) === js(['top', 'mobile', 'sidebar']), '1c. superfícies = top|mobile|sidebar (enum do fundador)')
ok(js([...M.NAV_AREAS]) === js(['public', 'app']), '1d. áreas = public|app (separa o hambúrguer da landing da barra do app)')
ok(typeof M.NAV_ITEM_RE?.test === 'function' && M.NAV_ITEM_RE.source === '^[a-z0-9_-]{1,24}(:[a-z0-9_-]{1,24})?$', '1e. NAV_ITEM_RE é exatamente o da ordem')
ok(js([...M.NAV_ITEM_IDS]) === js(['video', 'image', 'business', 'pricing', 'examples', 'ads', 'library', 'login']) && M.NAV_MORE_PREFIX === 'more:', '1f. ids do contrato com o Codex + more:<id>')
ok(M.NAV_DUPLICATE_WINDOW_MS === 400, '1g. trava de duplicata = 400 ms')

console.log('2) payload a partir de atributos')
const body = no('body')
const topo = no('nav', { 'data-nav-surface': 'top', 'data-nav-area': 'public' }, body)
const aVideo = no('a', { href: '/studio', 'data-nav-item': 'video' }, topo)
const rotulo = no('span', {}, aVideo)
const painel = no('div', { 'data-nav-item': 'video' }, topo)
const aExemplos = no('a', { href: '/examples?utm_source=x', 'data-nav-item': 'examples' }, painel)
const aSemMarca = no('a', { href: '/studio?engine=kling3#top' }, painel)
const paragrafo = no('p', {}, painel)
const aSolto = no('a', { href: '/pricing' }, body)

let r = chama(rotulo)
ok(r.valor && r.valor.item === 'video' && r.valor.surface === 'top' && r.valor.area === 'public' && r.valor.href_path === '/studio' && r.valor.current === false, `2a. clique no rótulo dentro do link Vídeo → video/top/public//studio (veio ${js(r.valor)})`)
ok(r.valor && js(Object.keys(r.valor).sort()) === js(['area', 'current', 'href_path', 'item', 'surface']), '2b. payload fechado: só item, surface, area, href_path, current')
r = chama(aExemplos)
ok(r.valor && r.valor.item === 'examples' && r.valor.href_path === '/examples', `2c. Exemplos dentro do painel de Vídeo conta como examples (o mais interno vence) e perde a query (veio ${js(r.valor)})`)
r = chama(aSemMarca)
ok(r.valor && r.valor.item === 'video' && r.valor.href_path === '/studio#top', `2d. sublink sem marca conta para o item que o contém (veio ${js(r.valor)})`)
ok(chama(paragrafo).valor === null, '2e. clique no vão do contêiner marcado (sem a[href]/button) não grava')
ok(chama(aSolto).valor === null, '2f. link sem data-nav-item acima não grava (a casa inteira fica muda até o Codex marcar)')
r = chama(noDeTexto(rotulo))
ok(r.valor && r.valor.item === 'video', '2g. clique que chega num nó de texto sobe para o elemento')
ok([null, undefined, {}, 'video', 42].every((t) => chama(t).valor === null && chama(t).erro === null), '2h. alvo nulo/estranho → null, sem exceção')

const comItem = (valor) => {
  const nav = no('nav', { 'data-nav-surface': 'sidebar' }, no('body'))
  return chama(no('a', { href: '/x', 'data-nav-item': valor }, nav)).valor
}
const itensRuins = ['Vídeo', 'Video', 'vídeo', 'video preços', 'a'.repeat(25), 'more:', ':x', 'a:b:c', '', 'more:Viral', 'imagem<b>', ' video', 'more:' + 'v'.repeat(25)]
const vazou = itensRuins.filter((v) => comItem(v) !== null)
ok(vazou.length === 0, `2i. item fora de NAV_ITEM_RE é descartado inteiro (vazaram: ${js(vazou)})`)
const itensBons = ['video', 'more:viral', 'more:animate', 'a'.repeat(24), 'pricing', 'x_1-y']
const perdidos = itensBons.filter((v) => comItem(v)?.item !== v)
ok(perdidos.length === 0, `2j. item válido passa intacto (perdidos: ${js(perdidos)})`)

const onde = (superficie, area) => {
  const attrs = {}
  if (superficie !== undefined) attrs['data-nav-surface'] = superficie
  if (area !== undefined) attrs['data-nav-area'] = area
  const v = chama(no('a', { href: '/x', 'data-nav-item': 'image' }, no('nav', attrs, no('body')))).valor
  return v ? `${v.surface}/${v.area}` : 'null'
}
ok(onde('footer') === 'unknown/unknown', `2k. superfície fora do enum vira unknown (veio ${onde('footer')})`)
ok(onde(undefined) === 'unknown/unknown', '2l. sem data-nav-surface → unknown')
ok(onde('sidebar') === 'sidebar/app', '2m. lateral sem área → app')
ok(onde('mobile') === 'mobile/unknown', '2n. mobile sem área NÃO é chutado (hambúrguer público ≠ barra do app)')
ok(onde('mobile', 'public') === 'mobile/public' && onde('mobile', 'app') === 'mobile/app', '2o. data-nav-area separa os dois "mobile"')
ok(onde('top', 'desktop') === 'top/unknown' && onde('TOP', 'public') === 'unknown/public', '2p. área/superfície fora do enum (ou maiúscula) viram unknown')

const destino = (href) => {
  const attrs = { 'data-nav-item': 'pricing' }
  if (href !== undefined) attrs.href = href
  const v = chama(no(href === undefined ? 'button' : 'a', attrs, no('nav', { 'data-nav-surface': 'top' }, no('body')))).valor
  return v ? v.href_path : 'SEM-PAYLOAD'
}
ok(destino('/pricing?utm_source=x&email=a%40b.com') === '/pricing', `2q. query some do href_path (veio ${destino('/pricing?utm_source=x&email=a%40b.com')})`)
ok(destino('/x?e=a@b.com#planos') === '/x#planos', '2r. âncora fica, query com e-mail não')
ok(destino('#pricing') === '#pricing', '2s. âncora pura da landing (#pricing) fica visível — é o achado lateral do Preços')
ok(destino('https://www.usekineo.com/ads?x=1') === '/ads', '2t. link absoluto vira só o caminho')
ok(['mailto:a@b.com', 'javascript:alert(1)', 'tel:+5511999999999', 'data:text/html,oi'].every((h) => destino(h) === null), '2u. mailto/javascript/tel/data → href_path null')
ok(destino('/' + 'a'.repeat(100)).length === M.NAV_HREF_MAX, '2v. href_path cortado em NAV_HREF_MAX')
ok(destino(undefined) === null, '2w. <button> marcado sem href grava com href_path null')

const atual = (href, aria, caminho) => {
  const attrs = { href, 'data-nav-item': 'video' }
  if (aria !== undefined) attrs['aria-current'] = aria
  return chama(no('a', attrs, no('nav', { 'data-nav-surface': 'sidebar' }, no('body'))), caminho).valor?.current
}
ok(atual('/studio', 'page') === true && atual('/studio', 'true') === true, '2x. aria-current=page|true → current (reclique, excluído na leitura)')
ok(atual('/studio', 'location', '/studio/create') === false && atual('/studio', 'false', '/studio') === false, '2y. aria-current=location|false não é reclique')
ok(atual('/studio/', undefined, '/studio') === true, '2z. sem aria-current, mesmo caminho (barra final ignorada) → current')
ok(atual('/#pricing', undefined, '/') === false && atual('/studio', undefined, '/pricing') === false && atual('/studio', undefined, undefined) === false, '2aa. âncora na mesma página, outra página ou sem caminho → não é reclique')
ok(LEU_TEXTO.length === 0, `2ab. nenhuma leitura de texto em nenhum caso (leu: ${js(LEU_TEXTO)})`)

console.log('3) trava de duplicata')
const L = M.createNavDuplicateLatch(400)
ok(L('k', 1000) === true && L('k', 1399) === false && L('k', 1400) === true && L('j', 1401) === true && L('k', 1500) === false, '3a. 400 ms por chave; outra chave passa')
const L2 = M.createNavDuplicateLatch()
ok(L2('k', 0) === true && L2('k', 399) === false && L2('k', 400) === true, '3b. janela padrão = NAV_DUPLICATE_WINDOW_MS')

console.log('4) ouvinte único no documento')
{
  const N = carrega()
  const reg = []
  const rem = []
  const doc = {
    addEventListener(tipo, fn, cap) { reg.push({ tipo, fn, cap }) },
    removeEventListener(tipo, fn, cap) { rem.push({ tipo, fn, cap }) },
  }
  const captura = (cap) => cap === true || (cap && typeof cap === 'object' && cap.capture === true)
  let relogio = 10_000
  const enviados = []
  const opts = { doc, now: () => relogio, currentPath: () => '/' }
  const d1 = N.attachNavClickTelemetry((m) => enviados.push(m), opts)
  ok(reg.length === 1 && reg[0].tipo === 'click' && captura(reg[0].cap), `4a. um ouvinte de click na fase de CAPTURA (cap=${js(reg[0]?.cap)})`)
  const d2 = N.attachNavClickTelemetry((m) => enviados.push(m), opts)
  ok(reg.length === 1, `4b. montagem dupla continua sendo UM ouvinte (registrados: ${reg.length})`)
  const dispara = (alvo) => { try { reg[0].fn({ target: alvo }); return true } catch { return false } }
  dispara(rotulo)
  ok(enviados.length === 1 && enviados[0].item === 'video' && enviados[0].surface === 'top' && enviados[0].area === 'public' && enviados[0].nav_v === N.NAV_TELEMETRY_VERSION, `4c. clique marcado envia payload + nav_v (veio ${js(enviados[0])})`)
  relogio += 100
  dispara(rotulo)
  ok(enviados.length === 1, '4d. repetição em 100 ms é descartada')
  relogio += 500
  dispara(rotulo)
  ok(enviados.length === 2, '4e. depois da janela o mesmo item volta a contar (sem dedupe por sessão)')
  dispara(aExemplos)
  ok(enviados.length === 3 && enviados[2].item === 'examples', '4f. outro item no mesmo instante conta')
  ok(dispara(aSolto) && dispara(null) && dispara(paragrafo) && enviados.length === 3, '4g. clique sem marca, nulo ou fora de link: nada enviado, nada lançado')
  d1()
  ok(rem.length === 0, '4h. desmontar UMA das duas montagens não tira o ouvinte')
  d1()
  d2()
  ok(rem.length === 1 && rem[0].fn === reg[0].fn && captura(rem[0].cap), '4i. última desmontagem remove o MESMO ouvinte, com a mesma captura (desmontar duas vezes não desconta)')
  const d3 = N.attachNavClickTelemetry((m) => enviados.push(m), opts)
  ok(reg.length === 2, '4j. monta de novo depois de tudo desmontado (ciclo do StrictMode)')
  d3()
  const semDoc = N.attachNavClickTelemetry(() => {}, { doc: null })
  ok(typeof semDoc === 'function' && reg.length === 2, '4k. sem document (SSR) não registra nada')
}
{
  const N = carrega()
  let fn = null
  N.attachNavClickTelemetry(() => { throw new Error('rede caiu') }, { doc: { addEventListener(_t, f) { fn = f }, removeEventListener() {} }, now: () => 0 })
  let lancou = false
  try { fn({ target: rotulo }) } catch { lancou = true }
  ok(fn && !lancou, '4l. falha no envio nunca sobe para a navegação')
}

console.log('5) componente, layout e fonte única')
const libCodigo = semComentarios(rd(LIB))
ok(!/^\s*import\s/m.test(libCodigo) && !/\brequire\(/.test(libCodigo), '5a. lib/navTelemetry.ts continua sem import (pura)')
ok(!/\.(textContent|innerText|innerHTML|outerHTML)\b/.test(libCodigo), '5b. o código da lib não toca em texto do DOM')
const comp = rd('components/NavClickTelemetry.tsx')
const compCodigo = semComentarios(comp)
ok(/^'use client'/.test(comp), '5c. componente é client')
ok(/import \{ trackEvent \} from '@\/lib\/analytics'/.test(comp) && /import \{ NAV_EVENT, attachNavClickTelemetry \} from '@\/lib\/navTelemetry'/.test(comp), '5d. componente usa trackEvent e a lib (nada redigitado)')
ok(/useEffect\(\s*\(\)\s*=>\s*attachNavClickTelemetry\(/.test(compCodigo) && /\[\s*\],?\s*\)/.test(compCodigo), '5e. o useEffect DEVOLVE a desmontagem da lib, com deps []')
ok(/trackEvent\(NAV_EVENT,\s*metadata\)/.test(compCodigo) && !/nav_item_clicked/.test(compCodigo), '5f. o nome sai da constante, não de literal')
ok(/return null/.test(compCodigo), '5g. componente não renderiza nada')
const layout = rd('app/layout.tsx')
ok(layout.includes("import NavClickTelemetry from '@/components/NavClickTelemetry'"), '5h. layout raiz importa o ouvinte')
ok(layout.includes('<SourceCapture /><NavClickTelemetry /><CheckoutResumeBanner />'), '5i. montado logo depois do <SourceCapture />')
ok(layout.includes('<CheckoutResumeBanner /><AutopilotPilotResumeBanner /><CheckoutStalledCta />'), '5j. trecho fixado por test-autopilot-pilot-resume intacto')

const varre = (dir, acc = []) => {
  for (const nome of readdirSync(join(RAIZ, dir))) {
    if (nome === 'node_modules' || nome.startsWith('.')) continue
    const rel = join(dir, nome)
    const st = statSync(join(RAIZ, rel))
    if (st.isDirectory()) varre(rel, acc)
    else if (/\.(tsx?|jsx?)$/.test(nome)) acc.push(rel.replace(/\\/g, '/'))
  }
  return acc
}
const arquivos = [...varre('app'), ...varre('components'), ...varre('lib')]
const montagens = []
const emissores = []
for (const f of arquivos) {
  const src = semComentarios(rd(f))
  const n = (src.match(/<NavClickTelemetry\b/g) ?? []).length
  if (n) montagens.push(`${f}×${n}`)
  if (/track(?:Closed)?Event\(\s*['"`]nav_item_clicked/.test(src)) emissores.push(f)
}
ok(arquivos.length > 300, `5k. denominador da varredura (${arquivos.length} arquivos)`)
ok(js(montagens) === js(['app/layout.tsx×1']), `5l. UMA montagem na casa inteira (achadas: ${js(montagens)})`)
ok(emissores.length === 0, `5m. ninguém emite nav_item_clicked por fora do ouvinte (achados: ${js(emissores)})`)

console.log('6) o sink aceita o evento do navegador')
{
  const rota = rd('app/api/events/route.ts')
  const ini = rota.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  const abre = rota.indexOf('[', ini)
  const fecha = rota.indexOf('])', abre)
  let lista = []
  try {
    const literal = rota.slice(abre, fecha + 1).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    lista = Function(`"use strict"; return (${literal})`)()
  } catch { lista = [] }
  const serverOnly = new Set(lista)
  ok(ini >= 0 && serverOnly.size > 20 && serverOnly.has('payment_success'), `6a. SERVER_ONLY_EVENTS lido de verdade (${serverOnly.size} nomes, inclui payment_success)`)
  ok(!serverOnly.has(M.NAV_EVENT), '6b. nav_item_clicked NÃO está em SERVER_ONLY_EVENTS (senão o sink descarta todo clique)')
}

console.log('7) contrato de atributos com o Codex')
{
  const literal = /data-nav-(item|surface|area)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*["'`]([^"'`$]*)["'`]\s*\})/g
  const emObjeto = /["']data-nav-(item|surface|area)["']\s*:\s*["'`]([^"'`$]*)["'`]/g
  const dinamico = /data-nav-item\s*=\s*\{(?!\s*["'`][^"'`$]*["'`]\s*\})([^}]*)\}/g
  const itemOk = (v) => M.NAV_ITEM_RE.test(v) && (M.NAV_ITEM_IDS.includes(v) || (v.startsWith(M.NAV_MORE_PREFIX) && v.length > M.NAV_MORE_PREFIX.length))
  const audita = (f, src, acc) => {
    const confere = (tipo, v) => {
      acc.conferidos++
      const bom = tipo === 'item' ? itemOk(v) : tipo === 'surface' ? M.NAV_SURFACES.includes(v) : M.NAV_AREAS.includes(v)
      if (!bom) acc.erros.push(`${f}: data-nav-${tipo}="${v}"`)
    }
    for (const m of src.matchAll(literal)) confere(m[1], m[2] ?? m[3] ?? m[4] ?? '')
    for (const m of src.matchAll(emObjeto)) confere(m[1], m[2])
    for (const m of src.matchAll(dinamico)) {
      acc.dinamicos++
      if (/\bt\(|\blabel\b|textContent|innerText|toLowerCase\(/.test(m[1])) acc.erros.push(`${f}: data-nav-item={${m[1].trim()}} parece vir do texto traduzido`)
    }
    return acc
  }
  // O varredor precisa provar que enxerga: sem isto, "0 fora do contrato" com 0 atributos na casa não prova nada.
  const amostra = audita('amostra', [
    '<nav data-nav-surface="top" data-nav-area="public">',
    '<a href="/studio" data-nav-item="video">', "<a data-nav-item='more:viral'>", '<a data-nav-item={"pricing"}>',
    '<a data-nav-item="Vídeo">', '<nav data-nav-surface="header">', '<div data-nav-area="desktop">', '<a data-nav-item="signin">',
    "{...{ 'data-nav-item': 'audio' }}", '<a data-nav-item={item.navId}>', '<a data-nav-item={label.toLowerCase()}>',
  ].join('\n'), { conferidos: 0, dinamicos: 0, erros: [] })
  ok(amostra.conferidos === 10 && amostra.dinamicos === 2 && amostra.erros.length === 6
    && ['"Vídeo"', '"header"', '"desktop"', '"signin"', '"audio"', 'label.toLowerCase()'].every((s) => amostra.erros.some((e) => e.includes(s))),
  `7a. o varredor enxerga bons e ruins na amostra (conferidos ${amostra.conferidos}, dinâmicos ${amostra.dinamicos}, erros ${js(amostra.erros)})`)
  const casa = { conferidos: 0, dinamicos: 0, erros: [] }
  for (const f of varre('app').concat(varre('components'))) {
    const src = rd(f)
    if (src.includes('data-nav-')) audita(f, src, casa)
  }
  ok(casa.erros.length === 0, `7b. todo data-nav-* do código está no contrato (fora: ${js(casa.erros)})`)
  console.log(`   contrato: ${casa.conferidos} atributo(s) literal(is) conferido(s), ${casa.dinamicos} dinâmico(s) — 0 é o esperado até o lote do menu do Codex`)
}

console.log(`nav_item_clicked: ${passou} ok, ${falhas.length} falha(s)`)
if (falhas.length) {
  for (const f of falhas) console.error(`x ${f}`)
  process.exit(1)
}
