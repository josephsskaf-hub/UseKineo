// KINEO-APRESENTADOR-V2-LIBERA-1910 — guardião da LIBERAÇÃO do apresentador v2 do Studio Ads para todos os clientes (nota 9 do fundador na R3, pedido
// 84a5d07f; docs/RESULTADO-T1-APRESENTADOR-V2-R3-2026-10-17.md; fora da TRAVA 8.2) e dos 3 acabamentos que a R3 pediu.
// Roda com `node scripts/test-apresentador-v2-libera-1910.mjs` da raiz do repo, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo
// typescript do repo e rodados com stubs (o arreio de scripts/test-apresentador-v2-ajuste-3-1710.mjs; o texto pelo carregador offline da casa).
//
// O que prova (1 seção por item):
//   L  LIBERADO: ADS_V2_PRESENTER_V2_MODE = 'all' (conta de cliente entra); o ESCOPO não muda: só Comercial, 9:16, sem estilo; 'internal'/'off' seguem
//      valendo como antes; o /plan decide pelo interruptor (sem outra trava interna); a tela do apresentador não diz "beta"/"interno";
//   T  FRASE DE TELA: "Perfume Atheeri — Perfumes" / "Perfume Atheeri Perfumes" → "Perfume Atheeri" (a categoria que o nome já contém não se repete
//      depois dele), em pt/es/en, sem maiúscula/minúscula, singular/plural; outra palavra fica; a narração não muda;
//   X  DISSOLVE: o close e o cartão do v2 usam EXATAMENTE o mesmo padrão de transição dos outros caminhos (enter_transition {type:'fade', duration},
//      o do Kling 3/hollywood e do Kineo 1 em lib/compose.ts) — nenhuma propriedade inventada —, e o registro de que esse padrão sai SECO em todos os
//      caminhos medidos (19/10, quadro a quadro) está no código;
//   F  TERÇO DE CIMA: o retângulo do inventário não é confiável → a frase do v2 vai direto para o terço de cima, com qualquer retângulo (inclusive o
//      genérico 0,4/0,6/0,2/0,8 da R3 e um retângulo baixo que antes empurrava a frase para baixo);
//   D  desfaz exato + ida + marca em todo bloco + encadeamento (a cadeia do apresentador tira esta camada primeiro) + diff só nos arquivos da lista;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs' // reancorado KINEO-CLOSE-REAL-1910 — a entrega de 19/10 sai primeiro, em memória
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semApresentadorV2Libera1910, comApresentadorV2Libera1910, desfazApresentadorV2Libera1910, APRESENTADOR_V2_LIBERA_1910_ARQUIVOS, APRESENTADOR_V2_LIBERA_1910_NOVOS, APRESENTADOR_V2_LIBERA_1910_BASE, MARCA_APRESENTADOR_V2_LIBERA_1910 } from './test-support/desfaz-apresentador-v2-libera-1910.mjs'
import { semFilmesF1F4_1910 } from './test-support/desfaz-filmes-f1f4-1910.mjs' // reancorado KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"]: as linhas marcadas do Faceless 15 s saem antes da comparação com a base
import { semFilmesF1Virgula1910 } from './test-support/desfaz-filmes-f1-virgula-1910.mjs' // KINEO-FILMES-F1-VIRGULA-1910 — reancorado: a camada mais nova sai primeiro
import { desfazApresentadorV2Ajuste3_1710, semApresentadorV2Ajuste3_1710 } from './test-support/desfaz-apresentador-v2-ajuste-3-1710.mjs'
import { desfazApresentadorV2Ajuste1710 } from './test-support/desfaz-apresentador-v2-ajuste-1710.mjs'
import { desfazApresentadorV2_1710 } from './test-support/desfaz-apresentador-v2-1710.mjs'
import { desfazJuizGrade1610 } from './test-support/desfaz-juiz-grade-1610.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT) // o carregador offline resolve '@/' a partir do cwd
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-APRESENTADOR-V2-LIBERA-1910'
const rd = (p) => semCloseReal1910(semFilmesF1F4_1910(semFilmesF1Virgula1910(readFileSync(join(ROOT, p), 'utf8'), p), p), p).replace(/\r\n/g, '\n') // o arquivo VIVO (esta é a camada mais nova) /* reancorado KINEO-CLOSE-REAL-1910: a entrega de 19/10 (Close do produto real) sai primeiro, em memória */ // reancorado KINEO-FILMES-F1-F4-1910: o Faceless 15 s (camada mais nova) sai primeiro, por dentro do Close real · KINEO-FILMES-F1-VIRGULA-1910 — reancorado: a fiação do Faceless 15 s no export limpo (a mais nova) sai PRIMEIRO
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const B = APRESENTADOR_V2_LIBERA_1910_BASE
const base = (p) => { try { return git('show', `${B}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e

const F = { v2: 'lib/ads/v2PresenterV2.ts', montage: 'lib/ads/adV2Montage.ts', brief: 'lib/ads/v2Brief.ts', plan: 'lib/ads/v2PlanCore.ts', presenter: 'lib/ads/v2Presenter.ts', compose: 'lib/compose.ts' }

// ── carregador: transpila TS → CJS, resolve '@/' (os arquivos reais); `over` = fonte mutante ─────────────────────────────────
function makeLoader(over = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const text = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && existsSync(join(ROOT, target))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
const L = (over = {}) => makeLoader(over)
const V2 = L()(F.v2)
const MO = L()(F.montage)
const PR = L()(F.presenter)
const MO_ANTES = L({ [F.montage]: base(F.montage) })(F.montage)
const comV2 = (a, b) => L({ [F.v2]: trocar(rd(F.v2), a, b) })(F.v2)
const comMO = (a, b) => L({ [F.montage]: trocar(rd(F.montage), a, b) })(F.montage)
const JSONS = Object.fromEntries(['lib/ui/refinementCopy.json'].map((rel) => ['@/' + rel, JSON.parse(rd(rel))]))
const BR = (over = {}) => createOfflineLoader({ mocks: { '@/lib/openai': { openai: {} }, ...JSONS }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })(F.brief)
const comBR = (a, b) => BR({ [F.brief]: trocar(rd(F.brief), a, b) })

// ═══ L. liberado para todos, mesmo escopo ═════════════════════════════════════════════════════════════════════════════
console.log('L. liberado para todos os clientes; escopo igual (Comercial, 9:16, sem estilo)')
const l1 = (v2 = V2) => {
  const on = v2.adsV2PresenterV2On, el = v2.adsV2PresenterV2Eligible
  const cliente = on(false), casa = on(true)
  const ok916 = { on: cliente, tier: 'commercial', format: '9:16', style: null }
  return v2.ADS_V2_PRESENTER_V2_MODE === 'all' && cliente === true && casa === true &&
    on(false, 'internal') === false && on(true, 'internal') === true && on(true, 'off') === false && on(false, 'off') === false &&
    el(ok916) === true && el({ ...ok916, format: null }) === true && el({ ...ok916, format: undefined }) === true &&
    el({ ...ok916, tier: 'premium' }) === false && el({ ...ok916, tier: 'motion' }) === false && el({ ...ok916, tier: 'photo_motion' }) === false &&
    el({ ...ok916, format: '1:1' }) === false && el({ ...ok916, format: '16:9' }) === false && el({ ...ok916, format: '4:5' }) === false &&
    el({ ...ok916, style: 'cinematic' }) === false && el({ ...ok916, on: false }) === false && JSON.stringify(v2.ADS_V2_PRESENTER_V2_TIERS) === '["commercial"]'
}
await check("L1 ADS_V2_PRESENTER_V2_MODE = 'all': conta de cliente (internal=false) entra; o escopo é o mesmo — só Comercial, 9:16 (ou sem formato), sem estilo; 'internal' e 'off' seguem valendo", () => l1())
const PLANO = { presenter: { productUrl: 'https://sb.test/footage/atheeri.jpg', v2: { v: 1, entryId: 'sofia', gender: 'woman', portraitUrl: 'https://www.usekineo.com/ads/presenters/sofia.webp', prompt: 'Uma pessoa segurando o produto perto do rosto.' } } }
const l2 = (v2 = V2) => !!v2.adsV2PresenterV2Of(PLANO) && v2.adsV2PresenterV2Of(PLANO).entryId === 'sofia' && v2.adsV2PresenterV2Of(PLANO, 'off') === null && v2.adsV2PresenterV2Of({ presenter: { productUrl: 'https://sb.test/x.jpg' } }) === null
await check('L2 o avanço reconhece o plano v2 gravado com o interruptor de agora (null só com "off" ou sem plano v2)', () => l2())
const l3 = (src = rd(F.plan)) => {
  const n = src.split('adsV2PresenterV2On(reason === \'internal\')').length - 1
  return n === 2 && !/adsV2PresenterV2On\([^)]*,\s*'internal'\)/.test(src) && !/ADS_V2_PRESENTER_V2_MODE/.test(src)
}
await check('L3 o /plan decide pelo interruptor (as 2 chamadas usam o modo padrão = a constante; nenhuma trava interna à parte)', () => l3())
const l4 = (pr = PR) => {
  const txt = JSON.stringify(pr.ADS_V2_PRESENTER_COPY)
  return txt.length > 200 && !/\bbeta\b|intern|interno|só para a casa|staff only|coming soon|em breve/i.test(txt) && pr.ADS_V2_PRESENTER_PUBLIC === true
}
await check('L4 a tela do apresentador (ADS_V2_PRESENTER_COPY, todas as línguas) não fala em "beta"/"interno"/"em breve"; o cartão é público (sem tela nova)', () => l4())

// ═══ T. a frase de tela sem a categoria repetida ═══════════════════════════════════════════════════════════════════════
console.log('\nT. a frase de tela sem a categoria repetida depois do nome')
const NOMES = ['Perfume Atheeri', 'Atheeri']
const t1 = (b = BR()) => {
  const fin = (ov, names = NOMES, lang = 'pt') => b.adsV2NameFinish({ narration: null, overlays: ov, sectorHint: null }, names, lang)
  const r3 = fin(['Perfume Atheeri — Perfumes', 'Experiência única em cada frasco'])
  const hifen = fin(['Perfume Atheeri - Perfumes'])
  const seco = fin(['Perfume Atheeri Perfumes'])
  const caixa = fin(['PERFUME ATHEERI perfume.'])
  const es = fin(['Crema Luna – Cremas'], ['Crema Luna', 'Luna'], 'es')
  const en = fin(['Candle Glow | Candles'], ['Candle Glow', 'Glow'], 'en')
  const serum = fin(['Sérum Vita Séruns'], ['Sérum Vita', 'Vita'], 'pt')
  return r3.copy.overlays[0] === 'Perfume Atheeri' && r3.copy.overlays[1] === 'Experiência única em cada frasco' && r3.fixes.includes('category_tail:perfumes') &&
    hifen.copy.overlays[0] === 'Perfume Atheeri' && hifen.fixes.includes('overlay_dash') && hifen.fixes.includes('category_tail:perfumes') &&
    seco.copy.overlays[0] === 'Perfume Atheeri' && caixa.copy.overlays[0] === 'PERFUME ATHEERI.' && es.copy.overlays[0] === 'Crema Luna' && en.copy.overlays[0] === 'Candle Glow' &&
    serum.copy.overlays[0] === 'Sérum Vita'
}
await check('T1 "Perfume Atheeri — Perfumes" (a R3), com hífen ou já sem travessão → "Perfume Atheeri"; sem diferenciar maiúscula; pt/es/en; singular/plural (perfume/Perfumes, Crema/Cremas, Candle/Candles, Sérum/Séruns)', () => t1())
const t2 = (b = BR()) => {
  const fin = (ov, names = NOMES) => b.adsV2NameFinish({ narration: 'Conheça Perfume Atheeri. Perfumes que marcam.', overlays: ov, sectorHint: null }, names, 'pt')
  const outra = fin(['Perfume Atheeri Fragrâncias'])
  const velas = fin(['Perfume Atheeri — Velas'])
  const meio = fin(['Perfume Atheeri perfumes para você'])
  const umaPalavra = fin(['Atheeri Perfumes'], ['Atheeri'])
  const semCategoria = fin(['Casa Atheeri Casas'], ['Casa Atheeri', 'Atheeri'])
  return outra.copy.overlays[0] === 'Perfume Atheeri Fragrâncias' && velas.copy.overlays[0] === 'Perfume Atheeri — Velas' && meio.copy.overlays[0] === 'Perfume Atheeri perfumes para você' &&
    umaPalavra.copy.overlays[0] === 'Atheeri Perfumes' && semCategoria.copy.overlays[0] === 'Casa Atheeri Casas' && outra.copy.narration === 'Conheça Perfume Atheeri. Perfumes que marcam.' &&
    !outra.fixes.some((f) => f.startsWith('category_tail'))
}
await check('T2 só sai a MESMA categoria no FIM: outra palavra (Fragrâncias, Velas), o meio da frase, nome de uma palavra e nome sem categoria ficam; a narração não muda', () => t2())
const t3 = (b = BR()) => b.adsV2SameCategoryWord('perfume', 'PERFUMES') && b.adsV2SameCategoryWord('Loção', 'loçao') && b.adsV2SameCategoryWord('loción', 'lociones') && !b.adsV2SameCategoryWord('perfume', 'perfumaria') &&
  JSON.stringify(b.adsV2NameCategoryWords('Perfume Atheeri')) === '["perfume"]' && b.adsV2NameCategoryWords('Atheeri').length === 0 &&
  b.adsV2NameCategoryWord('Perfume Atheeri') === 'perfume' // a régua da narração (adsV2CategoryRepeatFix / adsV2NameArticleRule) segue igual
await check('T3 a comparação ignora acento e maiúscula e aceita +s/+es; as categorias do nome vêm da MESMA lista de produtos da narração (ADS_V2_PRODUCT_WORDS)', () => t3())

// ═══ X. o padrão de transição dos outros caminhos (e o registro de que ele não sai) ═════════════════════════════════════
console.log('\nX. close e cartão com o padrão de transição dos outros caminhos; o registro do dissolve que não sai')
const PRODUCT = 'https://sb.test/footage/atheeri.jpg'
const montageInput = (v2extra = {}) => ({
  width: 1080, height: 1920, fontFamily: 'Inter', cardUrl: 'https://sb.test/card.png', cardSeconds: 2.5, musicUrl: 'https://sb.test/m.mp3', voiceUrl: null, voiceSeconds: null,
  overlays: [{ text: 'Perfume Atheeri', start: 0, end: 4 }, { text: 'Experiência única em cada frasco', start: 4, end: 8 }],
  shots: [{ url: PRODUCT, kind: 'text', packshot: true, cutStart: 0, cutSeconds: 4, measuredSeconds: null }, { url: 'https://sb.test/foto.jpg', kind: 'text', cutStart: 0, cutSeconds: 4, measuredSeconds: null }],
  presenter: { url: 'https://sb.test/ator.mp4', measuredSeconds: 8.892 + 0.612 + 0.096, insertOrder: [], v2: { speechSeconds: 8.892, closeUrl: PRODUCT, ...v2extra } },
})
const padrao = (e, d) => !!e && e.enter_transition && JSON.stringify(Object.keys(e.enter_transition)) === '["type","duration"]' && e.enter_transition.type === 'fade' && e.enter_transition.duration === d &&
  !(Array.isArray(e.animations) && e.animations.some((a) => a && (a.type === 'fade' || a.transition === true || a.fade === true)))
const x1 = (mo = MO) => {
  const src = mo.buildAdV2Source(montageInput())
  const close = src.elements.filter((e) => e.track === mo.ADS_V2_PRESENTER_V2_CLOSE_TRACK)
  const card = src.elements.find((e) => e.source === 'https://sb.test/card.png')
  const antes = MO_ANTES.buildAdV2Source(montageInput())
  const so = (s) => JSON.stringify(s.elements.filter((e) => e.type !== 'text'))
  return close.length === 3 && close.every((e) => padrao(e, mo.ADS_V2_PRESENTER_V2_DISSOLVE)) && padrao(card, mo.ADS_V2_MONTAGE_FADE) && so(src) === so(antes)
}
await check('X1 montagem EXECUTADA: close e cartão com enter_transition {type:"fade", duration} e NADA inventado (nenhuma animação "fade"/transition); tudo o que não é frase é idêntico à montagem de antes', () => x1())
const x2 = (montSrc = rd(F.montage), composeSrc = rd(F.compose)) =>
  composeSrc.includes("? { enter_transition: { type: 'fade', duration: fadeFor(clip) } }") && composeSrc.includes('const HOLLYWOOD_CROSSFADE = true') &&
  composeSrc.includes("? { enter_transition: { type: 'fade', duration: FAST_CROSSFADE_SECONDS } }") &&
  montSrc.includes("{ enter_transition: { type: 'fade', duration: ADS_V2_PRESENTER_V2_DISSOLVE } }") && montSrc.includes("enter_transition: { type: 'fade', duration: ADS_V2_MONTAGE_FADE } })") &&
  montSrc.includes('O DISSOLVE NÃO SAI, E NÃO É SÓ AQUI') && montSrc.includes('Nenhum caminho do código tem transição que funcione para copiar') && montSrc.includes('não inventar') &&
  !/type: 'fade', fade|transition: true/.test(montSrc)
await check('X2 o padrão é o MESMO do Kling 3/hollywood e do Kineo 1 (lib/compose.ts: enter_transition fade); o registro "o dissolve não sai em nenhum caminho medido — não inventar" está ao lado do close', () => x2())

// ═══ F. a frase do v2 direto no terço de cima ══════════════════════════════════════════════════════════════════════════
console.log('\nF. a frase do v2 direto no terço de cima (retângulo do inventário não confiável)')
const GENERICO = { x0: 0.4, x1: 0.6, y0: 0.2, y1: 0.8 } // o da R3
const BAIXO = { x0: 0.3, y0: 0.62, x1: 0.7, y1: 0.95 }
const f1 = (mo = MO) => {
  const sem = mo.buildAdV2Source(montageInput()).elements.filter((e) => e.type === 'text')
  const gen = mo.buildAdV2Source(montageInput({ productRect: GENERICO })).elements.filter((e) => e.type === 'text')
  const baixo = mo.buildAdV2Source(montageInput({ productRect: BAIXO })).elements.filter((e) => e.type === 'text')
  const baixoAntes = MO_ANTES.buildAdV2Source(montageInput({ productRect: BAIXO })).elements.filter((e) => e.type === 'text')
  const alvo = (t) => mo.adsV2PresenterV2OverlayGeometry(t, 1080, 1920, null)
  const y = (e) => parseFloat(e.y) / 100
  return sem.length === 2 && [sem, gen, baixo].every((list) => list.length === 2 && list.every((e) => e.y === alvo(e.text).y && y(e) < 1 / 3 && alvo(e.text).place.band === 'upper_third')) &&
    baixoAntes.some((e) => y(e) > 1 / 3) // antes: o retângulo baixo empurrava a frase para baixo
}
await check('F1 montagem EXECUTADA: com retângulo nenhum, o genérico da R3 (0,4/0,6/0,2/0,8) ou um baixo, as 2 frases ficam no terço de cima (antes: o retângulo baixo as empurrava para baixo)', () => f1())
const f2 = (mo = MO) => mo.ADS_V2_PRESENTER_V2_RECT_TRUSTED === false && mo.adsV2PresenterV2OverlayRect(GENERICO) === null && mo.adsV2PresenterV2OverlayRect(null) === null &&
  mo.adsV2PresenterV2OverlayRect(BAIXO, true) === BAIXO && mo.adsV2PresenterV2OverlayRect(null, true) === null && mo.adsV2PresenterV2OverlayGeometry('Perfume Atheeri', 1080, 1920, BAIXO).place.band === 'above_product'
await check('F2 o retângulo não é confiável (ADS_V2_PRESENTER_V2_RECT_TRUSTED = false → null); a geometria "acima do produto" continua lá para quando houver caixa confiável (true = volta a usá-la)', () => f2())

// ═══ D. desfaz, marca, encadeamento ══════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, diff só nos arquivos da lista')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-apresentador-v2-libera-1910.mjs), é EXATAMENTE a origin/main ${B.slice(0, 9)}; a ida devolve o vivo; os novos existem e não existiam`, () =>
  APRESENTADOR_V2_LIBERA_1910_ARQUIVOS.length >= 3 && APRESENTADOR_V2_LIBERA_1910_ARQUIVOS.every((f) => base(f) !== null && semApresentadorV2Libera1910(f, rd(f)) === base(f) && comApresentadorV2Libera1910(f, base(f)) === rd(f) && !semApresentadorV2Libera1910(f, rd(f)).includes(MARCA)) &&
  MARCA_APRESENTADOR_V2_LIBERA_1910 === MARCA && APRESENTADOR_V2_LIBERA_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null))
await check('D2 todo bloco do desfaz traz a marca; o diff contra a base só toca os arquivos da lista e os novos (cobrança, /start, /plan, avanço, visão, TTS, compose e o ator de antes fora)', () => {
  const src = rd('scripts/test-support/desfaz-apresentador-v2-libera-1910.mjs')
  const D = JSON.parse(src.split('\n').find((l) => l.startsWith('const DESFAZ = ')).slice('const DESFAZ = '.length))
  const blocos = Object.values(D).flat()
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  const TOPO = shas[0] || 'HEAD'
  const tocados = git('diff', '--name-only', B, TOPO).trim().split('\n').filter(Boolean).concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean))
  const permitidos = new Set([...APRESENTADOR_V2_LIBERA_1910_ARQUIVOS, ...APRESENTADOR_V2_LIBERA_1910_NOVOS])
  return blocos.length > 0 && blocos.every((h) => h.now.join('\n').includes(MARCA)) && tocados.length > 0 && tocados.every((f) => permitidos.has(f)) &&
    ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'lib/ads/v2PlanCore.ts', 'lib/ads/v2Advance.ts', 'lib/ads/v2LockVision.ts', 'lib/ttsFallback.ts', 'lib/compose.ts', 'lib/ads/v2Presenter.ts', 'lib/ads/producao.ts'].every((f) => !tocados.includes(f))
})
await check('D3 encadeamento: o desfaz do ajuste 3 (e, por ele, o ajuste, o v2, a grade do juiz e a cadeia toda) tira esta camada PRIMEIRO; texto sem a marca, arquivo fora da lista e null passam igual', () => {
  return APRESENTADOR_V2_LIBERA_1910_ARQUIVOS.filter((f) => f.startsWith('lib/')).every((f) => {
    const vivo = rd(f)
    const semEste = semApresentadorV2Libera1910(f, vivo)
    return desfazApresentadorV2Ajuste3_1710(f, vivo) === desfazApresentadorV2Ajuste3_1710(f, semEste) && desfazApresentadorV2Ajuste1710(f, vivo) === desfazApresentadorV2Ajuste1710(f, semEste) &&
      desfazApresentadorV2_1710(f, vivo) === desfazApresentadorV2_1710(f, semEste) && desfazJuizGrade1610(f, vivo) === desfazJuizGrade1610(f, semEste) && desfazApresentadorV2Libera1910(f, base(f)) === base(f)
  }) && semApresentadorV2Ajuste3_1710(F.v2, rd(F.v2)) === semApresentadorV2Ajuste3_1710(F.v2, semApresentadorV2Libera1910(F.v2, rd(F.v2))) &&
    desfazApresentadorV2Libera1910(F.plan, rd(F.plan)) === rd(F.plan) && desfazApresentadorV2Libera1910(F.v2, null) === null &&
    /desfazApresentadorV2Libera1910\(rel, String\(text\)\) \/\/ KINEO-APRESENTADOR-V2-LIBERA-1910/.test(rd('scripts/test-support/desfaz-apresentador-v2-ajuste-3-1710.mjs')) &&
    /text = desfazApresentadorV2Libera1910\(rel, text\) \/\/ KINEO-APRESENTADOR-V2-LIBERA-1910/.test(rd('scripts/test-support/desfaz-apresentador-v2-ajuste-3-1710.mjs'))
})
await check('D4 a lib do v2 continua PURA (só import type) e a montagem sem import', () => rd(F.v2).split('\n').filter((l) => /^import /.test(l)).every((l) => /^import type /.test(l)) && !/^import /m.test(rd(F.montage)))

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const mut = async (m, fn) => { let vermelho = false; try { vermelho = !(await fn()) } catch (e) { vermelho = !/mutante (não aplicou|sem efeito)/.test(String(e && e.message)) } ok(vermelho, 'mutante vermelho: ' + m) }
await mut("L: o interruptor volta a 'internal'", () => l1(comV2("export const ADS_V2_PRESENTER_V2_MODE: 'off' | 'internal' | 'all' = 'all'", "export const ADS_V2_PRESENTER_V2_MODE: 'off' | 'internal' | 'all' = 'internal'")))
await mut('L: o escopo abre para todo nível', () => l1(comV2('return i.on === true && ADS_V2_PRESENTER_V2_TIERS.includes(i.tier) &&', 'return i.on === true &&')))
await mut('L: o escopo abre para todo formato', () => l1(comV2("(i.format ?? '9:16') === '9:16' && !i.style", '!i.style')))
await mut('L: o escopo aceita estilo', () => l1(comV2("(i.format ?? '9:16') === '9:16' && !i.style", "(i.format ?? '9:16') === '9:16'")))
await mut("L: o /plan ganha uma trava interna à parte", () => l3(trocar(rd(F.plan), "on: presenterV2Lib.adsV2PresenterV2On(reason === 'internal')", "on: presenterV2Lib.adsV2PresenterV2On(reason === 'internal', 'internal')")))
await mut('T: o acabamento não chama a cauda', () => t1(comBR('const t = adsV2CategoryTailFix(d, names); fixes.push(...t.fixes); return t.text })', 'return d })')))
await mut('T: sem plural', () => t1(comBR("const forms = (w: string): string[] => [w, w + 's', w + 'es',", 'const forms = (w: string): string[] => [w,')))
await mut('T: diferencia maiúscula', () => t1(comBR("(\\\\s*[.!]?)\\\\s*$', 'iu')", "(\\\\s*[.!]?)\\\\s*$', 'u')")))
await mut('T: tira qualquer palavra do fim', () => t2(comBR('if (!m || !cats.some((c) => adsV2SameCategoryWord(c, m[3]))) continue', 'if (!m) continue')))
await mut('T: não exige estar no fim', () => t2(comBR("(\\\\s*[.!]?)\\\\s*$', 'iu')", "(\\\\s*[.!]?)', 'iu')")))
await mut('X: o close ganha uma animação fade inventada', () => x1(comMO("{ enter_transition: { type: 'fade', duration: ADS_V2_PRESENTER_V2_DISSOLVE } }", "{ animations: [{ time: 0, duration: ADS_V2_PRESENTER_V2_DISSOLVE, type: 'fade' }] }")))
await mut('X: o cartão perde o padrão', () => x1(comMO("enter_transition: { type: 'fade', duration: ADS_V2_MONTAGE_FADE } }) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710", "enter_transition: { type: 'pop', duration: ADS_V2_MONTAGE_FADE } }) // KINEO-APRESENTADOR-V2-AJUSTE-3-1710")))
await mut('X: o registro do dissolve some', () => x2(trocar(rd(F.montage), 'O DISSOLVE NÃO SAI, E NÃO É SÓ AQUI', 'o dissolve')))
await mut('F: o retângulo volta a ser confiável', () => f1(comMO('export const ADS_V2_PRESENTER_V2_RECT_TRUSTED: boolean = false', 'export const ADS_V2_PRESENTER_V2_RECT_TRUSTED: boolean = true')))
await mut('F: a montagem volta a passar o retângulo cru', () => f1(comMO('adsV2PresenterV2OverlayGeometry(text, width, height, adsV2PresenterV2OverlayRect(v2.productRect ?? null))', 'adsV2PresenterV2OverlayGeometry(text, width, height, v2.productRect ?? null)')))
await mut('F: o filtro ignora o "trusted"', () => f2(comMO('  return trusted === true && rect ? rect : null', '  return rect ?? null')))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
