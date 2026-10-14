// KINEO-ADS-CONSERTOS-TELA-1410 — guardião dos consertos de TELA do Studio Ads v2 (fundador 14/10: "pode consertar agora").
// Achados do QA de 14/10 (foto de perfume + "perfume num hotel com chuva"). Só readFileSync + funções puras transpiladas pelo
// carregador offline da casa (scripts/test-support/offline-ts-loader.mjs) + `git show` da base para o cartão final.
//
// O que prova:
//   1 (#8)  o saldo relido dispara `creditsChanged` (o contador da barra do topo escuta em components/TopBar.tsx);
//   2 (#4)  "Mover para o campo de cena" não é desligado pelo `locked` (o roteiro automático deixava o botão morto) e a
//           assinatura do plano inclui o texto e a cena (o plano em voo fica velho e o automático replaneja);
//   3 (#5)  perfume → product_closeup (fone → montagem, bebida → explosão); sem palavra reconhecida = a sugestão de sempre
//           em TODOS os setores; imóvel e app nunca mudam; tirando os trechos marcados, v2Styles volta a ser byte a byte o
//           arquivo da base (nenhuma função de preço/plano/débito mexida);
//   4 (#3)  detectShortTextLanguage("perfume num hotel com chuva") === 'pt'; null para curto ambíguo, inglês misturado e
//           "shop.com"; detectNarrationLanguage (régua dos filmes, TRAVA 8.2) byte a byte igual à base; a tela usa o novo
//           DEPOIS do detector de sempre e ANTES da interface;
//   5 (#6)  o aviso "cartão final sem chamada" existe nas 16 línguas (próprias, nenhuma cai no inglês) e aparece quando
//           cardCta === '' no cartão de revisão, com o atalho para o campo de contato;
//   6 (#1b) drawEndCard SEM productImage desenha EXATAMENTE como a base (mesma sequência de chamadas no canvas, gravada
//           por um contexto falso, para 4 entradas); COM productImage a foto entra (drawImage) acima do nome; a tela passa
//           a foto nos 3 desenhos;
//   7 (#10) no celular o formulário vem primeiro (order:1 para o palco e a vaga da prévia, CSS só do Ads, por
//           dangerouslySetInnerHTML); o resultado rola para o topo; Baixar/Abrir ficam ANTES do player;
//   M       mutantes (5): cada regra quebrada fica vermelha e cada mutante prova que aplicou (âncora única).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semReteste1510 } from './test-support/desfaz-reteste-1510.mjs' // reancorado KINEO-ADS-RETESTE-1510
import { semDemoUniverso1410 } from './test-support/desfaz-ads-demo-universo-1410.mjs' // reancorado KINEO-ADS-DEMO-UNIVERSO-1410

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const BASE = '99bc0edcb4041403217d146e0a56da4ca3e52804'
const base = (rel) => execFileSync('git', ['-C', ROOT, 'show', `${BASE}:${rel}`], { encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n')
const F = {
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  batch: 'app/(dashboard)/ads/v2/AdsV2Batch.tsx',
  styles: 'lib/ads/v2Styles.ts',
  short: 'lib/shortTextLanguage.ts',
  text: 'lib/textLanguage.ts',
  copy: 'lib/ads/v2TelaConsertos.ts',
  card: 'lib/ads/endCard.ts',
  topbar: 'components/TopBar.tsx',
}
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = (fn) => { try { return !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 70)); return src.split(de).join(para) }
const bloco = (src, inicio) => { const i = src.indexOf(inicio); if (i < 0) return ''; let d = 0; for (let j = src.indexOf('{', i + inicio.length - 1); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1) } } return '' }
const trecho = (s, a, b) => { const i = s.indexOf(a); const j = i < 0 ? -1 : s.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : s.slice(i, j) }

/** Carregador com textos trocados em memória (over[arquivo] = texto). */
const loader = (over = {}) => createOfflineLoader({ source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })

// ═══ 1. contador de créditos (#8) ═══════════════════════════════════════════════════════════════════════════════════
console.log('\n1. contador de créditos da barra do topo')
const creditosOk = (client) => {
  const b = bloco(client, 'const refreshBalance = useCallback(async () => {')
  return /setBalance\(r\.data\.credits\)/.test(b) && /window\.dispatchEvent\(new Event\('creditsChanged'\)\)/.test(b)
}
ok(creditosOk(read(F.client)), '1a refreshBalance (Ads v2) dispara creditsChanged depois de reler o saldo')
ok(/window\.addEventListener\('creditsChanged', fetchCredits\)/.test(read(F.topbar)), '1b a TopBar escuta creditsChanged (quem relê o contador)')

// ═══ 2. mover a cena (#4) ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('\n2. "mover para o campo de cena"')
const moverOk = (s) => {
  const linha = s.split('\n').find((l) => l.includes('{sc.scene.move}</button>')) || ''
  return /<button type="button"/.test(linha) && !/disabled=/.test(linha) && /setScene\(sceneSplit\.scene \?\? ''\)/.test(linha) &&
    /const draftKey = JSON\.stringify\(\{ text: sentence, scene: sceneFinal,/.test(s) && /const baseSig = JSON\.stringify\(\{ draftKey,/.test(s) &&
    /const baseAtStart = baseSig/.test(bloco(s, 'async function planAd()')) && /sig: JSON\.stringify\(\{ base: baseAtStart, facts: chosen \}\)/.test(bloco(s, 'async function planAd()')) &&
    /const planFresh = !!plan && plan\.sig === planSig/.test(s)
}
ok(moverOk(read(F.simple)), '2a o botão só mexe no estado local, sem disabled={locked}; a assinatura do plano tem texto e cena (plano em voo nasce velho → replaneja)')

// ═══ 3. estilo sugerido (#5) ════════════════════════════════════════════════════════════════════════════════════════
console.log('\n3. estilo sugerido pela palavra do produto')
const SETORES = ['restaurant', 'clinic', 'real_estate', 'gym', 'salon', 'store', 'app_service', 'other', null, undefined, 'xyz']
const estiloOk = (S) =>
  S.adsV2SuggestedStyle('store', 'perfume num hotel com chuva') === 'product_closeup' &&
  S.adsV2SuggestedStyle('store', 'LUME eau de parfum, a light floral scent') === 'product_closeup' &&
  S.adsV2SuggestedStyle('store', 'Parfüm für sie') === 'product_closeup' && S.adsV2SuggestedStyle('store', 'relógio de pulso dourado') === 'product_closeup' &&
  S.adsV2SuggestedStyle('store', 'fone de ouvido bluetooth') === 'mechanical_assembly' && S.adsV2SuggestedStyle('store', 'smartwatch fitness') === 'mechanical_assembly' &&
  S.adsV2SuggestedStyle('store', 'chocolate artesanal') === 'package_explosion' && S.adsV2SuggestedStyle('gym', 'energy drink sabor limão') === 'package_explosion' &&
  S.adsV2SuggestedStyle('store', 'come watch the game tonight') === 'giant_product' &&
  // sem palavra reconhecida: a sugestão de SEMPRE, em todos os setores
  SETORES.every((sec) => S.adsV2SuggestedStyle(sec, 'aulas de violão no centro') === S.adsV2SuggestedStyle(sec) && S.adsV2SuggestedStyle(sec, '') === S.adsV2SuggestedStyle(sec)) &&
  S.adsV2SuggestedStyle('store') === 'giant_product' && S.adsV2SuggestedStyle('restaurant') === 'package_explosion' &&
  // imóvel e app nunca mudam (sem produto / telas de app)
  S.adsV2SuggestedStyle('real_estate', 'perfume') === 'none' && S.adsV2SuggestedStyle('app_service', 'app de fones') === 'none'
ok(tenta(() => estiloOk(loader()(F.styles))), '3a perfume → product_closeup · fone → montagem · bebida → explosão; sem palavra = sugestão de sempre (11 setores); imóvel/app intocados')
const ESTILOS_BASE_SHA = 'ac0b9f5eda0d131004053558b8739fe66d376fbc82a287d2a0908ac2421bff3d' // v2Styles em 99bc0edc
const semConsertoEstilo = (s) => {
  const ini = s.indexOf('// KINEO-ADS-CONSERTOS-TELA-1410 — a palavra do PRODUTO na frase decide')
  const fim = s.indexOf('/**\n * O plano que recebe o efeito')
  if (ini < 0 || fim < ini) return null
  let t = s.slice(0, ini) + s.slice(fim)
  const ref = t.match(/ {2}\/\/ KINEO-ADS-CONSERTOS-TELA-1410 — QA 14\/10[\s\S]*?\n {2}\}\n/)
  if (!ref) return null
  t = t.replace(ref[0], '')
  return t.replace('export function adsV2SuggestedStyle(sector: AdsV2StyleSector | string | null | undefined, sentence?: string | null): AdsV2StyleChoice {', 'export function adsV2SuggestedStyle(sector: AdsV2StyleSector | string | null | undefined): AdsV2StyleChoice {')
}
// reancorado KINEO-ADS-RETESTE-1510 — o v2Styles perdeu o dolly_zoom (reteste 15/10): desfeito esse corte (diff reverso exato), vale a prova de sempre.
ok(sha(semConsertoEstilo(semReteste1510(F.styles, semDemoUniverso1410(F.styles, read(F.styles)))) ?? '') === ESTILOS_BASE_SHA, '3b v2Styles sem os 2 trechos marcados = o arquivo da base byte a byte (nada de preço/plano/débito mexido)')
const chamadaOk = (s) => /const styleSuggested: AdsV2StyleChoice = sentence && sector !== 'other' \? adsV2SuggestedStyle\(sector, sentence\) : 'none'/.test(s)
ok(chamadaOk(read(F.simple)), '3c a tela passa a frase à sugestão (só com setor reconhecido, como antes)')

// ═══ 4. língua da voz (#3) ═════════════════════════════════════════════════════════════════════════════════════════
console.log('\n4. língua da voz para frase curta')
const linguaOk = (T) =>
  T.detectShortTextLanguage('perfume num hotel com chuva') === 'pt' && T.detectShortTextLanguage('Perfume num hotel com chuva.') === 'pt' &&
  T.detectShortTextLanguage('café da manhã') === 'pt' && T.detectShortTextLanguage('zapatillas con diseño') === 'es' &&
  T.detectShortTextLanguage('Parfüm für sie') === 'de' && T.detectShortTextLanguage('духи для неё') === 'ru' && T.detectShortTextLanguage('nước hoa') === 'vi' &&
  // conservador: curto ambíguo, inglês misturado, só conteúdo, endereço
  T.detectShortTextLanguage('perfume hotel') === null && T.detectShortTextLanguage('perfume') === null &&
  T.detectShortTextLanguage('perfume The Body Shop com chuva') === null && T.detectShortTextLanguage('shop.com') === null &&
  T.detectShortTextLanguage('www.loja.com.br') === null && T.detectShortTextLanguage('vendas@loja.com') === null &&
  T.detectShortTextLanguage('perfume shop.com') === null && T.detectShortTextLanguage('') === null && T.detectShortTextLanguage(null) === null
ok(tenta(() => linguaOk(loader()(F.short))), '4a "perfume num hotel com chuva" = pt; null para curto ambíguo, inglês misturado e "shop.com"/domínio/e-mail')
ok(read(F.text) === base(F.text), '4b lib/textLanguage.ts (detectNarrationLanguage, régua dos filmes — TRAVA 8.2) byte a byte igual à base')
ok(!/^\s*import\s(?!type)/m.test(read(F.short)) && !/^\s*import\s(?!type)/m.test(read(F.copy)), '4c lib/shortTextLanguage.ts e lib/ads/v2TelaConsertos.ts são puras (só import type)')
const vozTelaOk = (s) => /const shortLang = detected \? null : detectShortTextLanguage\(`\$\{sentence\} \$\{scene\}`\)/.test(s) &&
  /const spoken: NarrationLanguage = voiceLang \?\? narrationLanguage\(detected\) \?\? shortLang \?\? narrationLanguage\(lang\) \?\? 'en'/.test(s) &&
  /\{voiceUnsure \? \(\s*<p className="adsw-hint adv2s-voiceask" role="status" data-kineo="ads-voice-ask">/.test(s) &&
  s.indexOf('data-kineo="ads-voice-ask"') > s.indexOf('<label className="adv2s-lang">') && s.indexOf('data-kineo="ads-voice-ask"') < s.indexOf('<details className="adv2s-more"')
ok(vozTelaOk(semDemoUniverso1410(F.simple, read(F.simple))), '4d a tela: escolha da pessoa → detector de sempre → frase curta → interface; sem certeza, o aviso ao lado do seletor "Voz em" (fora de "Mais")') // reancorado KINEO-ADS-DEMO-UNIVERSO-1410 — 3b e 4d leem o texto de ANTES da demo de 14/10 (a língua do LINK entra entre a frase curta e a interface; prova nova em scripts/test-ads-demo-universo-1410.mjs)

// ═══ 5. cartão sem chamada (#6) ════════════════════════════════════════════════════════════════════════════════════
console.log('\n5. aviso do cartão final sem chamada')
const copyOk = (C) => {
  const t = C.ADS_V2_TELA_CONSERTOS_COPY
  return Object.keys(t).length === 16 && LANGS.every((l) => t[l] && t[l].noCta && t[l].noCtaAdd && /\{lang\}/.test(t[l].voiceCheck)) &&
    new Set(LANGS.map((l) => t[l].noCta)).size === 16 && new Set(LANGS.map((l) => t[l].voiceCheck)).size === 16 &&
    LANGS.every((l) => /WhatsApp|واتساب|واٹس/.test(t[l].noCta)) && C.adsV2TelaConsertosCopy('xx') === t.en && C.adsV2TelaConsertosCopy('pt') === t.pt
}
ok(tenta(() => copyOk(loader()(F.copy))), '5a o aviso nas 16 línguas (cada uma a sua, nenhuma cai no inglês), cita site/WhatsApp; língua desconhecida = inglês')
const avisoOk = (s) => {
  const rev = trecho(s, 'data-kineo="ads-review-summary"', '{factsNow.length ? (')
  return /\{cardCta === '' && sentence \? \(\s*<p className="adsw-warn adv2s-nocta" role="status" data-kineo="ads-no-cta">\s*\{tc\.noCta\}/.test(rev) &&
    /setMoreOpen\(true\)[^\n]*contactInputRef\.current\?\.focus\(/.test(rev) && /<input ref=\{contactInputRef\} type="text" value=\{contact\}/.test(s) &&
    /const tc = adsV2TelaConsertosCopy\(lang\)/.test(s)
}
ok(avisoOk(read(F.simple)), '5b no cartão de revisão: sem chamada (cardCta vazio) = o aviso + "Adicionar contato" (abre Mais e foca o campo)')

// ═══ 6. foto real no cartão final (#1b) ════════════════════════════════════════════════════════════════════════════
console.log('\n6. cartão final: a foto real do produto')
/** Contexto 2D falso que GRAVA cada chamada e cada propriedade atribuída, na ordem. */
function gravador() {
  const log = []
  const num = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)
  const gradient = (tipo) => ({ addColorStop: (o, c) => log.push(`${tipo}.stop(${num(o)},${c})`) })
  const props = {}
  const ctx = new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return (t) => { const px = parseFloat(String(props.font || '10px').match(/(\d+)px/)?.[1] || '10'); return { width: String(t).length * px * 0.55 } }
      if (k === 'createLinearGradient') return (...a) => { log.push('linear(' + a.map(num).join(',') + ')'); return gradient('linear') }
      if (k === 'createRadialGradient') return (...a) => { log.push('radial(' + a.map(num).join(',') + ')'); return gradient('radial') }
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(48 * 48 * 4).fill(200) })
      if (k in props) return props[k]
      return (...a) => log.push(String(k) + '(' + a.map((x) => (x && typeof x === 'object' ? x.__id || 'obj' : num(x))).join(',') + ')')
    },
    set(_, k, v) { props[k] = v; log.push(`${String(k)}=${typeof v === 'object' ? 'grad' : v}`); return true },
  })
  const canvas = { width: 0, height: 0, getContext: () => ctx }
  return { canvas, log }
}
const documento = { createElement: () => ({ width: 0, height: 0, getContext: () => gravador().canvas.getContext() }) }
const cartaoLoader = (over = {}) => createOfflineLoader({ globals: { document: documento }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const ENTRADAS = [
  { logo: null, business: 'Perfume', offer: '', ctaLabel: '', contact: '', accent: '#7a4b2a', brandBg: true },
  { logo: null, business: 'LUME eau de parfum', offer: 'R$ 199', ctaLabel: 'Compre agora', contact: 'lume.com.br', accent: '#2997ff', brandBg: true },
  { logo: { __id: 'logo', width: 400, height: 200 }, business: 'Café Aurora — o melhor café da cidade com entrega em casa', offer: '2 por 1 toda terça', ctaLabel: 'Chame no WhatsApp', contact: '+55 11 99999-0000', accent: '#c0392b' },
  { logo: { __id: 'logo', width: 120, height: 600 }, business: 'X', offer: '', ctaLabel: 'Book now', contact: '', brandBg: false },
]
const desenha = (E, input) => { const g = gravador(); E.drawEndCard(g.canvas, input); return g.log.join('\n') }
const cartaoIgual = (novo, velho) => ENTRADAS.every((i) => { const a = desenha(novo, i); return a.length > 200 && a === desenha(velho, i) && a === desenha(novo, { ...i, productImage: null }) })
const VELHO = cartaoLoader({ [F.card]: base(F.card) })(F.card)
ok(tenta(() => cartaoIgual(cartaoLoader()(F.card), VELHO)), '6a SEM productImage (ausente ou null) o cartão desenha EXATAMENTE como a base — 4 entradas, chamada por chamada')
const comFoto = (E) => ENTRADAS.every((i) => {
  const log = desenha(E, { ...i, productImage: { __id: 'foto', width: 900, height: 1200 } })
  const foto = log.indexOf('drawImage(foto,')
  const nome = log.indexOf('fillText(' + String(i.business).slice(0, 1))
  return foto > 0 && (nome < 0 || foto < nome) && (!i.logo || log.indexOf('drawImage(logo,') < foto)
})
ok(tenta(() => comFoto(cartaoLoader()(F.card))), '6b COM productImage a foto entra (drawImage) acima do nome e abaixo do logo')
const fotoTelaOk = (s, batch) => (s.match(/ctaLabel: cardCta, contact: cardContact, accent: cardAccent, brandBg: true, productImage \}\)/g) || []).length === 3 &&
  (s.match(/const productImage = await loadCardProductPhoto\(firstPhotoUrl\)/g) || []).length === 3 && /lang: spoken, photo: firstPhotoUrl \}\)/.test(s) &&
  /async function loadCardProductPhoto\(url: string \| null\): Promise<HTMLImageElement \| null> \{\n {2}if \(!url\) return null\n {2}try \{ return await loadLogoImage\(url\) \} catch \{ return null \}\n\}/.test(s) &&
  /contact: host, brandBg: true, productImage \}\)/.test(batch) && /try \{ productImage = row\.photos\[0\] \? await loadLogoImage\(row\.photos\[0\]\.srcUrl\) : null \} catch \{ productImage = null \}/.test(batch)
ok(fotoTelaOk(read(F.simple), read(F.batch)), '6c a tela passa a 1ª foto nos 3 desenhos (prévia, prévia ao vivo, envio) e o lote também; foto que não carrega = cartão sem foto; trocar a foto = cartão novo')

// ═══ 7. celular (#10) ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\n7. celular: formulário primeiro, resultado à vista, Baixar antes do player')
const celularOk = (s) => {
  const m = s.match(/const TELA_CONSERTOS_CSS = `([\s\S]*?)`/)
  const css = m ? m[1] : ''
  const done = trecho(s, "{phase === 'delivered' && order ? (", "{phase === 'failed' && order ? (")
  const efeito = trecho(s, "if (phase !== 'delivered' && phase !== 'failed') return", '}, [phase])')
  return /@media\(max-width:900px\)\{\.adv2\.kps-page \.kps-grid>\.kps-stage,\.adv2\.kps-page \.kps-grid>\.adv2s-slot,\.adv2\.kps-page \.kps-grid>\.adv2s-slot:not\(:empty\)\{order:1\}\}/.test(css) &&
    /<style dangerouslySetInnerHTML=\{\{ __html: TELA_CONSERTOS_CSS \}\} \/>/.test(s) && !/<style>\s*\{\s*TELA_CONSERTOS_CSS/.test(s) &&
    /scrollIntoView\(\{ block: 'start', behavior: 'smooth' \}\)/.test(efeito) && /\.adv2 \.adv2s-result\{scroll-margin-top:\d+px\}/.test(css) &&
    done.indexOf('data-kineo="ads-done-actions"') > 0 && done.indexOf(': copy.done.download}') > done.indexOf('data-kineo="ads-done-actions"') &&
    done.indexOf('<video className="adv2-player"') > done.indexOf(': copy.done.download}') && done.indexOf('<video className="adv2-player"') > done.indexOf('{copy.done.open}')
}
ok(celularOk(read(F.simple)), '7a order:1 para palco e prévia no celular (CSS só do Ads, por dangerouslySetInnerHTML); resultado rola ao topo; Baixar/Abrir antes do player')
ok(read('components/ProductStage.tsx') === base('components/ProductStage.tsx') && read('components/ads/AdsFlow.tsx') === base('components/ads/AdsFlow.tsx'), '7b ProductStage e AdsFlow (compartilhados) intocados')

// ═══ M. mutantes ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Cada mutante é aplicado FORA da avaliação: âncora que não existe (ou repete) derruba o guardião em vez de virar um falso
// "vermelho". E cada um prova que aplicou (o texto mudou) antes de ser avaliado.
console.log('\nM. mutantes (precisam ficar vermelhos)')
const SRC = { client: read(F.client), simple: read(F.simple), styles: read(F.styles), short: read(F.short), card: read(F.card) }
const vermelho = (orig, mut, fn) => { if (mut === orig) throw new Error('mutante não aplicou'); try { return !fn(mut) } catch { return true } }
const m1 = trocar(SRC.client, "try { window.dispatchEvent(new Event('creditsChanged')) } catch {}", '')
ok(vermelho(SRC.client, m1, (t) => creditosOk(t)), 'M1 sem o creditsChanged → 1a vermelho')
const m2 = trocar(SRC.simple, 'className="adsw-btn ghost small" data-kineo="ads-scene-move" onClick=', 'className="adsw-btn ghost small" data-kineo="ads-scene-move" disabled={locked} onClick=')
ok(vermelho(SRC.simple, m2, (t) => moverOk(t)), 'M2 disabled={locked} de volta no botão de mover → 2a vermelho')
const m3 = trocar(SRC.styles, '    if (byWord) return byWord\n', '')
ok(vermelho(SRC.styles, m3, (t) => estiloOk(loader({ [F.styles]: t })(F.styles))), 'M3 a palavra do produto ignorada (perfume volta a Giant product) → 3a vermelho')
const m4 = trocar(SRC.short, '  if (hits.size !== 1) return null\n', '  if (hits.size === 0) return null\n')
ok(vermelho(SRC.short, m4, (t) => linguaOk(loader({ [F.short]: t })(F.short))), 'M4 detector não conservador (aceita duas línguas) → 4a vermelho')
const m5 = trocar(SRC.card, '  if (productBox) height += productBox.h + ', '  height += 40\n  if (productBox) height += productBox.h + ')
ok(vermelho(SRC.card, m5, (t) => cartaoIgual(cartaoLoader({ [F.card]: t })(F.card), VELHO)), 'M5 cartão sem foto com a altura do layout mudada → 6a vermelho')
// M6: o player volta para ANTES dos botões (a ordem antiga): recorta o bloco do player e o põe antes de "ads-done-actions".
const PLAYER = trecho(SRC.simple.slice(SRC.simple.indexOf("{phase === 'delivered' && order ? (")), '            {video?.video_url ? (\n              <video className="adv2-player"', '            )}\n') + '            )}\n'
const ACOES = '            <div className="adv2-actions adv2s-done-actions" data-kineo="ads-done-actions">'
const m6 = trocar(trocar(SRC.simple, PLAYER, ''), ACOES, PLAYER + ACOES)
ok(vermelho(SRC.simple, m6, (t) => celularOk(t)), 'M6 player de volta ANTES de Baixar/Abrir → 7a vermelho')
const m7 = trocar(SRC.simple, '.adv2.kps-page .kps-grid>.adv2s-slot:not(:empty){order:1}', '.adv2.kps-page .kps-grid>.adv2s-slot:not(:empty){order:-1}')
ok(vermelho(SRC.simple, m7, (t) => celularOk(t)), 'M7 a prévia volta para cima do formulário no celular → 7a vermelho')

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
