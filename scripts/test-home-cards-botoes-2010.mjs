// KINEO-HOME-CARDS-BOTOES-2010 — guardião da entrega "um botão diferente por card de anúncio" da home (fundador 20/10: "o botão do UGC e do Product
// ficou parecido") + os 3 cards 5% menores no computador. Roda com `node scripts/test-home-cards-botoes-2010.mjs` da raiz do repo, sem rede, sem banco.
// lib/ui/homeThreeCards.ts é MÓDULO PURO: transpilado pelo typescript do repo e executado. Fora da TRAVA 8.2 (copy + CSS da home).
//
// O que prova:
//   B  BOTÕES: as 16 línguas da interface, 4 rótulos cada, todos diferentes; o do card UGC diz "UGC", o do produto não; homeCardAdsCta escolhe o "grátis"
//      SÓ com ADS_SAMPLE_LIVE e cai no inglês em língua desconhecida; o componente passa o card e o ADS_SAMPLE_LIVE (nada de "grátis" digitado);
//   G  GRADE: no computador max-width 95% centralizada; no celular a faixa segue rolando de ponta a ponta (max-width:none); o resto do CSS = a base;
//   D  desfaz exato + marca em toda linha + encadeamento (olhos e 3 cards tiram esta camada PRIMEIRO) + novos + assunto dos commits;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semHomeCardsBotoes2010, desfazHomeCardsBotoes2010, diffSoHomeCardsBotoes2010, HOME_CARDS_BOTOES_2010_ARQUIVOS, HOME_CARDS_BOTOES_2010_NOVOS, HOME_CARDS_BOTOES_2010_BASE, MARCA_HOME_CARDS_BOTOES_2010, ACRESCIMOS_HOME_CARDS_BOTOES_2010 } from './test-support/desfaz-home-cards-botoes-2010.mjs'
import { semApresentadorOlhos1910 } from './test-support/desfaz-apresentador-olhos-1910.mjs'
import { semHome3Cards1910 } from './test-support/desfaz-home-3-cards-1910.mjs'
import { semKitBfVenda2010 } from './test-support/desfaz-kit-bf-venda-2010.mjs' // reancorado KINEO-KIT-BF-VENDA-2010 — o Kit Black Friday à venda (mesclado depois, por cima) sai antes, em memória

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MARCA = 'KINEO-HOME-CARDS-BOTOES-2010'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(semKitBfVenda2010(readFileSync(join(ROOT, p), 'utf8'), p)) // reancorado KINEO-KIT-BF-VENDA-2010 — o disco sem a camada do kit (mais nova)
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const B = HOME_CARDS_BOTOES_2010_BASE
const base = (p) => { try { return lf(git('show', `${B}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = (m, fn) => { let v = false; try { v = !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 60)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = { lib: 'lib/ui/homeThreeCards.ts', comp: 'components/home/HomeThreeCards.tsx', lang: 'lib/ui/interfaceLanguage.ts' }
function loadPure(text) {
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', 'require', js)(module, module.exports, (s) => { throw new Error('import inesperado: ' + s) })
  return module.exports
}
const LIB = loadPure(rd(F.lib))
// as 16 línguas da interface, lidas do tipo InterfaceLanguage (a mesma lista que o seletor oferece)
const LINGUAS = (/export type InterfaceLanguage = ([^\n]+)/.exec(rd(F.lang))?.[1] ?? '').match(/'([a-z]{2})'/g)?.map((s) => s.slice(1, -1)) ?? []
const GRATIS = /free|grátis|gratis|gratuit|darmow|ücretsiz|бесплатн|безкоштовн|مجاني|مفت|मुफ़्त|miễn phí/i

// ═══ B. botões ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('B. um botão diferente por card de anúncio, nas 16 línguas; "grátis" só com a amostra no ar')
const provaTabela = (lib = LIB) => {
  const T = lib.HOME_CARD_ADS_CTA
  return LINGUAS.length === 16 && Object.keys(T).length === 16 && LINGUAS.every((l) => {
    const t = T[l]
    return Array.isArray(t) && t.length === 4 && t.every((s) => typeof s === 'string' && s.trim().length >= 3 && s.length <= 34) && new Set(t).size === 4 &&
      t[1].includes('UGC') && t[3].includes('UGC') && !t[0].includes('UGC') && !t[2].includes('UGC') &&
      GRATIS.test(t[0]) && GRATIS.test(t[1]) && !GRATIS.test(t[2]) && !GRATIS.test(t[3])
  })
}
check('B1 16 línguas (as do InterfaceLanguage), 4 rótulos cada, todos diferentes; UGC só nos do card UGC; "grátis" só nos 2 primeiros', () => provaTabela())
const provaEscolha = (lib = LIB) => {
  const f = lib.homeCardAdsCta, T = lib.HOME_CARD_ADS_CTA
  return LINGUAS.every((l) => f('product_ads', l, true) === T[l][0] && f('ugc_ads', l, true) === T[l][1] && f('product_ads', l, false) === T[l][2] && f('ugc_ads', l, false) === T[l][3] &&
    f('product_ads', l, true) !== f('ugc_ads', l, true) && f('product_ads', l, false) !== f('ugc_ads', l, false)) &&
    f('ugc_ads', 'xx', true) === T.en[1] && f('product_ads', 'xx', false) === T.en[2] && f('ugc_ads', 'pt', true) === 'Anúncio UGC grátis' && f('product_ads', 'pt', true) === 'Anúncio de produto grátis'
}
check('B2 homeCardAdsCta: produto ≠ UGC sempre; "grátis" com ADS_SAMPLE_LIVE, "Criar…" sem; língua desconhecida cai no inglês', () => provaEscolha())
const provaComponente = (src = rd(F.comp)) =>
  src.includes('  const adsCta = (card: HomeCardId) => homeCardAdsCta(card, language, ADS_SAMPLE_LIVE)') &&
  src.includes("{card === 'films' ? <UiLabel>Make my film</UiLabel> : adsCta(card)}") && /^\s+homeCardAdsCta, \/\/ KINEO-HOME-CARDS-BOTOES-2010$/m.test(src) &&
  !src.includes('adsSampleCopy') && !GRATIS.test(src.replace(/\/\/[^\n]*|\/\*[^\n]*?\*\//g, '').replace(/HOME_THREE_CARDS_CSS = `[\s\S]*?`/, ''))
check('B3 o componente passa o card e o ADS_SAMPLE_LIVE; nenhum "grátis" digitado; o card de filmes segue "Make my film"', () => provaComponente())

// ═══ G. grade ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG. grade: 5% menor no computador, celular intacto')
const cssDe = (src) => (/HOME_THREE_CARDS_CSS = `([\s\S]*?)`/.exec(src) || [])[1] ?? ''
const provaGrade = (src = rd(F.comp)) => {
  const css = cssDe(src), cssBase = cssDe(base(F.comp))
  const semComent = (c) => c.split('\n').map((l) => l.replace(/ \/\* KINEO-HOME-CARDS-BOTOES-2010[^\n]*\*\/$/, '')).join('\n')
  const desk = '.k3c-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;max-width:95%;margin-inline:auto}'
  const mob = css.indexOf('@media (max-width:760px){')
  const linhaMob = css.indexOf('.k3c-grid{max-width:none}')
  const fimMob = css.indexOf('\n}', mob)
  return semComent(css).split('\n').includes(desk) && css.indexOf(desk) < css.indexOf('@media') && mob > 0 && linhaMob > mob && linhaMob < fimMob &&
    semComent(css).replace(desk, '.k3c-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}').replace('.k3c-grid{max-width:none}\n', '') === cssBase
}
check('G1 no computador a grade tem max-width:95% centralizada; no celular max-width:none (a faixa rola de ponta a ponta); todo o resto do CSS = a base', () => provaGrade())

// ═══ D. desfaz ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, novos')
const TOPO = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)[0] || 'HEAD'
const provaDesfaz = (sem = semHomeCardsBotoes2010) =>
  HOME_CARDS_BOTOES_2010_ARQUIVOS.length === 6 && HOME_CARDS_BOTOES_2010_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(sem(semKitBfVenda2010(readFileSync(join(ROOT, f), 'utf8'), f), f)) === b }) && // reancorado KINEO-KIT-BF-VENDA-2010 — o kit (mais novo) sai antes
  HOME_CARDS_BOTOES_2010_NOVOS.length === 3 && HOME_CARDS_BOTOES_2010_NOVOS.every((f) => existsSync(join(ROOT, f)) && statSync(join(ROOT, f)).size > 0 && base(f) === null) && MARCA_HOME_CARDS_BOTOES_2010 === MARCA
check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-home-cards-botoes-2010.mjs), é EXATAMENTE a base ${B}; os novos existem e não existiam lá`, () => provaDesfaz())
check('D2 toda linha nova traz a marca; o diff da base até o último commit da entrega só toca a lista e os novos; nada de cobrança, motor ou preço', () => {
  const tocados = git('diff', '--name-only', B, TOPO).trim().split('\n').concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter((f) => f && !diffSoHomeCardsBotoes2010(git('diff', '-U0', '--no-color', 'HEAD', '--', f), f))).filter(Boolean)
  const permitidos = new Set([...HOME_CARDS_BOTOES_2010_ARQUIVOS, ...HOME_CARDS_BOTOES_2010_NOVOS])
  const linhas = HOME_CARDS_BOTOES_2010_ARQUIVOS.every((f) => { const b = new Set(base(f).split('\n')); return rd(f).split('\n').every((l) => b.has(l) || l.includes(MARCA)) })
  return tocados.length > 0 && tocados.every((f) => permitidos.has(f)) && linhas && !/KINEO-HOME-3-CARDS|KINEO-APRESENTADOR/.test(MARCA) &&
    !tocados.some((f) => /engineCost|pricing|lib\/credits\/|lib\/ads\/|app\/api\//.test(f))
})
check('D3 encadeamento: semApresentadorOlhos1910 e semHome3Cards1910 tiram esta camada PRIMEIRO; sem a marca, fora da lista e null passam igual', () => {
  return HOME_CARDS_BOTOES_2010_ARQUIVOS.every((f) => {
    const raw = readFileSync(join(ROOT, f), 'utf8'), semEste = semHomeCardsBotoes2010(raw, f)
    return semApresentadorOlhos1910(raw, f) === semApresentadorOlhos1910(semEste, f) && semHome3Cards1910(raw, f) === semHome3Cards1910(semEste, f)
  }) && /export function semApresentadorOlhos1910\(texto, p\) \{\n  texto = semHomeCardsBotoes2010\(texto, p\)/.test(rd('scripts/test-support/desfaz-apresentador-olhos-1910.mjs')) &&
    /export function semHome3Cards1910\(texto, p\) \{\n  texto = semHomeCardsBotoes2010\(texto, p\)/.test(rd('scripts/test-support/desfaz-home-3-cards-1910.mjs')) &&
    semHomeCardsBotoes2010(base(F.lib), F.lib) === base(F.lib) && semHomeCardsBotoes2010(rd(F.lib), 'outro/arquivo.ts') === rd(F.lib) && desfazHomeCardsBotoes2010(F.lib, null) === null &&
    Object.values(ACRESCIMOS_HOME_CARDS_BOTOES_2010).every((n) => Number.isInteger(n) && n >= 0)
})
check('D4 todo commit da entrega traz a marca no assunto', () => {
  const assuntos = git('log', '--no-merges', '--format=%s', `${B}..${TOPO}`).trim().split('\n').filter(Boolean)
  return assuntos.length > 0 && assuntos.every((s) => s.includes(MARCA))
})

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const vermelho = (fn) => { try { return !fn() } catch { return true } }
const mLib = (a, b) => loadPure(trocar(rd(F.lib), a, b))
check('M1 o botão do UGC volta a ser igual ao do produto (pt) → B1 vermelho', () => { const m = mLib('"Anúncio UGC grátis","Criar', '"Anúncio de produto grátis","Criar'); return vermelho(() => provaTabela(m)) })
check('M2 uma língua some da tabela (vi) → B1 vermelho', () => { const m = mLib('  vi: [', '  vx: ['); return vermelho(() => provaTabela(m)) })
check('M3 "grátis" sem a amostra no ar (homeCardAdsCta ignora sampleLive) → B2 vermelho', () => { const m = mLib('return sampleLive ? (ugc ? t[1] : t[0])', 'return true ? (ugc ? t[1] : t[0])'); return vermelho(() => provaEscolha(m)) })
check('M4 o card UGC recebe o botão do produto → B2 vermelho', () => { const m = mLib("const ugc = card === 'ugc_ads'", "const ugc = card === 'films'"); return vermelho(() => provaEscolha(m)) })
check('M5 o componente passa true no lugar do ADS_SAMPLE_LIVE → B3 vermelho', () => { const m = trocar(rd(F.comp), 'homeCardAdsCta(card, language, ADS_SAMPLE_LIVE)', 'homeCardAdsCta(card, language, true)'); return vermelho(() => provaComponente(m)) })
check('M6 o componente volta ao botão único (adsCta sem o card) → B3 vermelho', () => { const m = trocar(rd(F.comp), ': adsCta(card)}', ': adsCta}'); return vermelho(() => provaComponente(m)) })
check('M7 a grade volta a 100% no computador → G1 vermelho', () => { const m = trocar(rd(F.comp), 'gap:20px;max-width:95%;margin-inline:auto}', 'gap:20px;margin-inline:auto}'); return vermelho(() => provaGrade(m)) })
check('M8 o celular herda o 95% (sem o max-width:none) → G1 vermelho', () => { const m = trocar(rd(F.comp), '.k3c-grid{max-width:none}', '.k3c-grid{}'); return vermelho(() => provaGrade(m)) })
check('M9 linha marcada a mais no componente → D1 vermelho (o desfaz lança na contagem)', () => {
  const extra = rd(F.comp) + '\n// sobra KINEO-HOME-CARDS-BOTOES-2010'
  return vermelho(() => provaDesfaz((t, f) => semHomeCardsBotoes2010(f === F.comp ? extra : t, f)))
})

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
