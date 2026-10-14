// KINEO-ADS-PALCO-VOLTAR-1410 — guardião do conserto do PALCO do Studio Ads (/ads/v2, aba "Um anúncio"). Fundador, 14/10, print a
// 1918×950: o palco escuro do estilo ficava POR CIMA do quadro (link, fotos, frase, cena e a fileira de estilos) depois de abrir
// "Ver todos os 17" e clicar num estilo, sem caminho de volta. Medido (Edge sem cabeça, harness local): defeito de LAYOUT, não modo
// de propósito — o .adv2-main é grade com coluna implícita `auto`; o carrossel de 17 estilos (~2.500 px de largura mínima) esticava
// a coluna e o quadro inteiro vazava por baixo do palco (e criava rolagem lateral no celular). Prova, lendo o código real:
//   A. o quadro nunca fica mais largo que o painel: .adv2-main em minmax(0,1fr) e filhos com min-width:0 (por último na página);
//      o palco mora na coluna DELE da .kps-grid (contas a 1280/1440/1920) e nenhum CSS do Ads o tira da coluna;
//   B. o caminho de volta: "✕ Fechar estilos" e Esc fecham a escolha completa, o foco volta ao "Ver todos" e o estilo escolhido
//      continua escolhido; clicar num estilo continua trocando o palco; no celular o formulário segue primeiro;
//   C. o kit da marca: só fica enquanto a frase/o link não indicarem OUTRA marca (regra pura, casos reais), sai sozinho no
//      conflito (só o que a pessoa não mexeu), "Remover o kit deste anúncio" e "Usar o kit" — frases nas 16 línguas;
//   D. dinheiro intocado: desfeito este conserto, os 2 arquivos são EXATAMENTE os da base (pai do 1º commit com a marca), e
//      nenhum bloco deste conserto chama rota, mexe em crédito ou preço;
//   M. mutantes: cada regra quebrada fica vermelha (e cada mutante prova que aplicou).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semPalcoVoltar1410, PALCO_VOLTAR_1410_BASE, PALCO_VOLTAR_1410_ARQUIVOS } from './test-support/desfaz-ads-palco-voltar-1410.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const tenta = (fn) => { try { return !!fn() } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); return false } }
const troca = (src, a, b) => { if (src.split(a).length !== 2) throw Error('âncora não única: ' + a.slice(0, 70)); const s = src.split(a).join(b); if (s === src) throw Error('mutante não aplicou'); return s }
const trecho = (s, a, b) => { const i = s.indexOf(a); const j = i < 0 ? -1 : s.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : s.slice(i, j + b.length) }

const F = {
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  lib: 'lib/ads/v2PalcoVoltar.ts',
  stage: 'components/ProductStage.tsx',
  ux: 'app/(dashboard)/ads/v2/AdsV2SimpleUx.tsx',
  flow: 'components/ads/AdsFlow.tsx',
  quadro: 'app/(dashboard)/ads/v2/AdsV2Quadro.tsx',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, read(f)]))
const loader = (over = {}) => createOfflineLoader({ source: (rel, text) => (over[rel] !== undefined ? over[rel] : text) })
const lib = (over = {}) => loader(over)(F.lib)

// ═══ A. o quadro nunca vaza; o palco fica na coluna dele ═════════════════════════════════════════════════════════════
console.log('\nA. layout: o palco nunca cobre o quadro')
const layoutOk = (S) => {
  const css = lib({ [F.lib]: S.lib }).ADS_PALCO_VOLTAR_CSS
  const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), dec: m[2] }))
  const main = regras.find((r) => r.sel === 'html .stu.adv2.adv2q .adv2-main')
  const filhos = regras.find((r) => r.sel.split(',').includes('html .stu.adv2.adv2q .adv2-main>*'))
  const alvos = ['html .stu.adv2.adv2q .adv2-main>*', 'html .stu.adv2.adv2q .adv2q-opt', 'html .stu.adv2.adv2q .kst-pick']
  const styles = [...S.client.matchAll(/<style dangerouslySetInnerHTML=\{\{ __html: ([A-Z_ +]+) \}\} \/>/g)].map((m) => m[1])
  return !!main && /(^|;)grid-template-columns:minmax\(0,1fr\)(;|$)/.test(main.dec) &&
    !!filhos && alvos.every((a) => filhos.sel.split(',').includes(a)) && /min-width:0/.test(filhos.dec) && /max-width:100%/.test(filhos.dec) &&
    S.client.includes("import { ADS_PALCO_VOLTAR_CSS } from '@/lib/ads/v2PalcoVoltar'") &&
    styles[styles.length - 1] === 'ADS_PALCO_VOLTAR_CSS' && styles.indexOf('ADS_QUADRO_STUDIO_CSS') === styles.length - 2 &&
    /<div className="stu adsw adv2 kps-page adv2q">/.test(S.client)
}
ok(tenta(() => layoutOk(SRC)), 'A1 .adv2-main = minmax(0,1fr); .adv2-main>*, .adv2q-opt e .kst-pick com min-width:0/max-width:100%; injetado por dangerouslySetInnerHTML, ÚLTIMO <style> (depois do quadro), escopo .stu.adv2.adv2q na raiz')

const estruturaOk = (S) => {
  const iMain = S.simple.indexOf('<div className="adv2-main">')
  const iAll = S.simple.indexOf('<details id="adv2q-styles-all"')
  const iBoard = S.simple.indexOf('<div className="adv2q-board" data-kineo="ads-quadro-studio">')
  const grid = trecho(S.client, '<div className="kps-grid">', '<div ref={setPreviewSlot} className="adv2s-slot" />')
  return iMain > 0 && iBoard > iMain && iAll > iBoard && grid.includes('<div className="kps-panel">') &&
    grid.indexOf('<div className="kps-panel">') < grid.indexOf('adv2s-slot') &&
    S.simple.includes('<AdsStyleStage slot={previewSlot} data={stageData}')
}
ok(tenta(() => estruturaOk(SRC)), 'A2 a escolha completa de estilos (o carrossel largo) mora DENTRO do .adv2-main; o palco é portal na vaga .adv2s-slot, irmã do .kps-panel na .kps-grid')

// contas da grade (valores do CSS real; barra lateral de 248 px do DashboardShell): painel + 20 + palco = conteúdo, palco à direita
const colunasOk = (S) => {
  const g = S.stage.match(/\.kps-grid\{display:grid;grid-template-columns:minmax\((\d+)px,1fr\) minmax\(0,([\d.]+)fr\);gap:(\d+)px;/)
  const pad = S.quadro.match(/html \.stu\.adv2\.adv2q\{padding:\d+px (\d+)px \d+px\}/)
  if (!g || !pad) return false
  const [min, fr, gap, px] = [Number(g[1]), Number(g[2]), Number(g[3]), Number(pad[1])]
  return [1280, 1440, 1920].every((W) => {
    const conteudo = W - 248 - 2 * px
    const painel = Math.max(min, (conteudo - gap) / (1 + fr))
    const palco = conteudo - gap - painel
    const dirPainel = 248 + px + painel
    const esqPalco = dirPainel + gap
    return palco >= 300 && esqPalco > dirPainel && esqPalco + palco <= W - px + 0.5
  })
}
ok(tenta(() => colunasOk(SRC)), 'A3 a 1280, 1440 e 1920: painel e palco cabem lado a lado (palco ≥ 300 px, começa 20 px depois do painel, termina dentro da tela)')

const foraDaColunaNada = (S) => {
  const css = [S.ux, S.flow, S.quadro, S.client, S.simple, lib({ [F.lib]: S.lib }).ADS_PALCO_VOLTAR_CSS].join('\n')
  const ruins = []
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const partes = m[1].split(',').map((p) => p.trim())
    const alvo = partes.some((p) => !/adv2s-sheet/.test(p) && /^\.(adv2s-slot|kps-stage|adv2f-stage)(?![\w-])/.test(p.split(/[\s>+~]+/).pop() || ''))
    if (alvo && /position:(fixed|absolute)|grid-column|grid-area|margin-(left|inline-start):-|z-index:[1-9]|transform:/.test(m[2])) ruins.push(m[1].trim().slice(-60))
  }
  if (ruins.length) console.log('       (regras: ' + ruins.join(' | ') + ')')
  return ruins.length === 0
}
ok(tenta(() => foraDaColunaNada(SRC)), 'A4 nenhum CSS do Ads tira o palco/a vaga da coluna (sem fixed/absolute, grid-column, margem negativa, z-index ou transform) — a folha do celular fica de fora')

// ═══ B. o caminho de volta ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nB. o caminho de volta')
const voltaOk = (S) => {
  const all = trecho(S.simple, '<details id="adv2q-styles-all"', '</details>')
  const fecha = S.simple.match(/\n {2}const closeStyles = \(\) => \{ ([^\n]*) \} \/\/ KINEO-ADS-PALCO-VOLTAR-1410/)
  return all.includes('<button type="button" className="pill" data-kineo="ads-quadro-styles-close" onClick={closeStyles}>✕ {pv.closeStyles}</button>') &&
    all.includes("onKeyDown={(e) => { if (e.key === 'Escape' && stylesOpen) { e.stopPropagation(); closeStyles() } }}") &&
    !!fecha && fecha[1].includes('setStylesOpen(false)') && fecha[1].includes('stylesSeeAllRef.current?.focus()') &&
    !/setStyleChoice\(|setStyle\(|\bstyle\s*=/.test(fecha[1]) &&
    S.simple.includes('<button ref={stylesSeeAllRef} type="button" className="pill" data-kineo="ads-quadro-see-all"')
}
ok(tenta(() => voltaOk(SRC)), 'B1 "✕ Fechar estilos" dentro da escolha completa, Esc fecha, o foco volta ao "Ver todos"; fechar NÃO mexe no estilo escolhido')
const trocaPalcoOk = (S) =>
  /<QuadroStyleRow value=\{style\} suggested=\{styleSuggested\} onChange=\{setStyleChoice\}/.test(S.simple) &&
  /<AdsStylePicker\n\s+name="adv2s-style"\n\s+value=\{style\}\n\s+suggested=\{styleSuggested\}\n\s+onChange=\{setStyleChoice\}/.test(S.simple) &&
  /const stageData: AdsStyleStageData = \{\n\s+style,\n/.test(S.simple) &&
  S.simple.includes('@media(max-width:900px){.adv2.kps-page .kps-grid>.kps-stage,.adv2.kps-page .kps-grid>.adv2s-slot,.adv2.kps-page .kps-grid>.adv2s-slot:not(:empty){order:1}}')
ok(tenta(() => trocaPalcoOk(SRC)), 'B2 clicar num estilo (fileira ou escolha completa) segue trocando o palco (mesmo setStyleChoice → stageData.style); no celular o formulário segue primeiro (order:1)')

// ═══ C. o kit da marca ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. o kit da marca')
const regraOk = (L) => {
  const c = L.brandKitConflict
  return c(null, { sentence: 'Nike running shoes' }) === false &&
    c('  ', { sentence: 'Nike running shoes' }) === false &&
    c('Atheeri', {}) === false && c('Atheeri', { sentence: '  ', linkName: '', linkHost: '' }) === false &&
    c('Atheeri', { sentence: 'Nike running shoes on a wet street' }) === true &&
    c('Atheeri', { sentence: 'Atheeri amber perfume, 50ml' }) === false &&
    c('Atheeri', { sentence: 'perfume in the rain', linkHost: 'atheeri.com' }) === false &&
    c('Atheeri', { sentence: '', linkName: 'Cruncho Chips 200g', linkHost: 'shop.cruncho.com' }) === true &&
    c('Café Âmbar', { sentence: 'cafe ambar gelado no verão' }) === false &&
    c('Atheeri Perfumes', { linkHost: 'atheeri.com' }) === false &&
    c('The Body Shop', { linkHost: 'thebodyshop.com' }) === false &&
    c('Lu', { sentence: 'lumiere lamp' }) === true
}
ok(tenta(() => regraOk(lib())), 'C1 conflito = há evidência (frase / nome lido / domínio) e nenhuma cita a marca do kit; sem kit ou sem evidência = sem conflito; acento, domínio colado e 1ª palavra contam')
const tiraOk = (L) => {
  const filled = { business: 'Atheeri', price: '$49', contact: 'atheeri.com', color: '#aa3355', logoFootageId: 'f1' }
  const a = L.brandKitRetract(filled, { business: 'Atheeri', price: '$49', contact: 'atheeri.com', color: '#AA3355', logoFootageId: 'f1' }, { business: 'Cruncho Chips', price: '$3', defaultColor: '#2563eb' })
  const b = L.brandKitRetract(filled, { business: 'Minha Loja', price: '$49', contact: '+55 11 9999', color: '#000000', logoFootageId: 'f9' }, { business: '', price: '', defaultColor: '#2563eb' })
  const c = L.brandKitRetract({}, { business: 'Atheeri', price: '$49', contact: 'x', color: '#aa3355', logoFootageId: 'f1' }, { business: '', price: '', defaultColor: '#2563eb' })
  return a.business === 'Cruncho Chips' && a.price === '$3' && a.contact === '' && a.color === '#2563eb' && a.dropLogo === true &&
    b.business === 'Minha Loja' && b.price === '' && b.contact === '+55 11 9999' && b.color === '#000000' && b.dropLogo === false &&
    c.business === 'Atheeri' && c.price === '$49' && c.contact === 'x' && c.color === '#aa3355' && c.dropLogo === false
}
ok(tenta(() => tiraOk(lib())), 'C2 tirar o kit: sai SÓ o que o kit pôs e a pessoa não mexeu; nome/preço voltam ao que a página do link leu; logo só sai se for o do kit')
const fiacaoOk = (S) => {
  const carga = trecho(S.simple, "const r = await api<{ kit?: AdsBrandKit | null; logo_url?: string | null }>('/api/ads/brand-kit')", 'if (Object.keys(fillIn).length) setKitApplied(kit)')
  const efeito = S.simple.match(/\n {2}useEffect\(\(\) => \{\n {4}if \(!kitApplied\) return\n {4}if \(kitConflict && kitOff === null && !kitForcedRef\.current\) kitRetract\('conflict'\)\n {4}else if \(!kitConflict && kitOff === 'conflict'\) kitReapply\(false\)\n/)
  const chip = trecho(S.simple, '<p className="adv2s-kit" role="status" data-kineo="ads-brand-kit-chip">', '</p>')
  const off = trecho(S.simple, '<p className="adv2s-kitoff" role="status" data-kineo="ads-brand-kit-off" data-why={kitOff}>', '</p>')
  return carga.includes('if (brandKitConflict(kit.business, kitEvidenceRef.current)) {') &&
    carga.indexOf('brandKitConflict(kit.business') < carga.indexOf('brandKitPrefill(kit,') && !!efeito &&
    S.simple.includes('const kitEvidence = { sentence, linkName: linkPage?.name ?? null, linkHost } // KINEO-ADS-PALCO-VOLTAR-1410') &&
    S.simple.includes('const kitConflict = brandKitConflict(kitBusiness, kitEvidence) // KINEO-ADS-PALCO-VOLTAR-1410') &&
    S.simple.includes("{kitApplied && !kitOff ? (") &&
    chip.includes(`data-kineo="ads-brand-kit-remove" onClick={() => kitRetract('user')}>✕ {pv.removeKit}</button>`) &&
    off.includes("fill(pv.kitOffConflict, { name: kitBusiness ?? '' })") && off.includes('data-kineo="ads-brand-kit-use" onClick={() => kitReapply(true)}>{pv.useKit}</button>') &&
    S.simple.includes("setLinkPage({ name: pageName || '', price: pagePrice }) // KINEO-ADS-PALCO-VOLTAR-1410")
}
ok(tenta(() => fiacaoOk(SRC)), 'C3 a tela: o kit que chega já em conflito NÃO preenche; conflito depois = tira sozinho, sumiu o conflito = devolve; selo com "✕ Remover o kit deste anúncio"; aviso com "Usar o kit"; o nome lido do link é evidência')
const copyOk = (L) => {
  const T = L.ADS_PALCO_VOLTAR_COPY
  const langs = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
  const keys = ['closeStyles', 'removeKit', 'kitOffConflict', 'kitOffUser', 'useKit']
  return Object.keys(T).length === 16 && langs.every((l) => T[l] && keys.every((k) => typeof T[l][k] === 'string' && T[l][k].trim().length > 2)) &&
    langs.every((l) => T[l].kitOffConflict.includes('{name}')) &&
    langs.filter((l) => l !== 'en').every((l) => keys.every((k) => T[l][k] !== T.en[k])) &&
    L.adsPalcoVoltarCopy('xx') === T.en && L.adsPalcoVoltarCopy('pt') === T.pt
}
ok(tenta(() => copyOk(lib())), 'C4 as 5 frases novas nas 16 línguas (nenhuma cai no inglês), o aviso cita a marca ({name}); língua desconhecida = inglês')
const puraOk = (S) => { const imps = [...S.lib.matchAll(/^import[^\n]*$/gm)].map((m) => m[0]); return imps.length === 1 && /^import type \{ InterfaceLanguage \} from '@\/lib\/ui\/interfaceLanguage'$/.test(imps[0]) }
ok(tenta(() => puraOk(SRC)), 'C5 lib/ads/v2PalcoVoltar.ts é PURA: um único import, e só de tipo (cliente pode importar; servidor nenhum)')

// ═══ D. dinheiro intocado ═══════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. dinheiro intocado')
const base = (rel) => execFileSync('git', ['show', `${PALCO_VOLTAR_1410_BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n')
const desfeitoOk = (S) => PALCO_VOLTAR_1410_ARQUIVOS.length === 2 && semPalcoVoltar1410(F.simple, S.simple) === base(F.simple) && semPalcoVoltar1410(F.client, S.client) === base(F.client)
ok(tenta(() => desfeitoOk(SRC)), `D1 desfeito este conserto, AdsV2Simple.tsx e AdsV2Client.tsx são EXATAMENTE os da base (${PALCO_VOLTAR_1410_BASE}, pai do 1º commit com a marca)`)
const semDinheiroOk = (S) => {
  const novo = (rel, s) => { const a = base(rel).split('\n'); const conta = new Map(); for (const l of a) conta.set(l, (conta.get(l) || 0) + 1); return s.split('\n').filter((l) => { const n = conta.get(l) || 0; if (n) { conta.set(l, n - 1); return false } return true }) }
  const linhas = [...novo(F.simple, S.simple), ...novo(F.client, S.client), ...S.lib.split('\n')]
  return linhas.length > 20 && !linhas.some((l) => /\bapi\(|fetch\(|\/api\/|[Cc]redit|debit|adsV2Credits|checkout|stripe|price_id|engineCost/.test(l))
}
ok(tenta(() => semDinheiroOk(SRC)), 'D2 nenhuma linha nova (tela, invólucro e lib) chama rota/fetch nem mexe em crédito, débito, preço de plano ou checkout')

// ═══ M. mutantes ═══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (todos têm de ficar vermelhos)')
const mut = (nome, chave, de, para, checa) => {
  let S2
  try { S2 = { ...SRC, [chave]: troca(SRC[chave], de, para) } } catch (e) { ok(false, `${nome} — ${e.message}`); return }
  ok(!tenta(() => checa(S2)), `${nome} fica vermelho`)
}
const libDe = (S) => lib({ [F.lib]: S.lib })
mut('M1 a coluna do .adv2-main volta a `auto`', 'lib', 'html .stu.adv2.adv2q .adv2-main{grid-template-columns:minmax(0,1fr)}', 'html .stu.adv2.adv2q .adv2-main{gap:0}', layoutOk)
mut('M2 o <style> do conserto some do invólucro', 'client', '      <style dangerouslySetInnerHTML={{ __html: ADS_PALCO_VOLTAR_CSS }} />{/* KINEO-ADS-PALCO-VOLTAR-1410 — por último: a coluna do quadro é minmax(0,1fr) */}\n', '', layoutOk)
mut('M3 sem min-width:0 nos filhos do quadro', 'lib', '{min-width:0;max-width:100%}', '{max-width:100%}', layoutOk)
mut('M4 o palco ganha position:absolute', 'ux', '.adv2s-slot .kps-stage{position:relative;top:auto}', '.adv2s-slot .kps-stage{position:absolute;top:auto}', foraDaColunaNada)
mut('M5 sem o "✕ Fechar estilos"', 'simple', '<p className="adv2q-close"><button type="button" className="pill" data-kineo="ads-quadro-styles-close" onClick={closeStyles}>✕ {pv.closeStyles}</button></p>', '', voltaOk)
mut('M6 Esc não fecha', 'simple', "if (e.key === 'Escape' && stylesOpen)", "if (e.key === 'Enter' && stylesOpen)", voltaOk)
mut('M7 fechar zera o estilo escolhido', 'simple', 'const closeStyles = () => { setStylesOpen(false);', "const closeStyles = () => { setStylesOpen(false); setStyleChoice('none');", voltaOk)
mut('M8 o conflito nunca acontece (regra devolve false)', 'lib', '  return !evidence.some((e) => mentions(e, kit))', '  return false', (S) => regraOk(libDe(S)))
mut('M9 frase vazia vira conflito', 'lib', '  if (!evidence.length) return false', '  if (!evidence.length) return true', (S) => regraOk(libDe(S)))
mut('M10 tirar o kit apaga o que a pessoa digitou', 'lib', 'filled.business !== undefined && now.business === filled.business ? fallback.business : now.business', 'filled.business !== undefined ? fallback.business : now.business', (S) => tiraOk(libDe(S)))
mut('M11 o kit preenche mesmo em conflito na abertura', 'simple', 'if (brandKitConflict(kit.business, kitEvidenceRef.current)) {', 'if (false && brandKitConflict(kit.business, kitEvidenceRef.current)) {', fiacaoOk)
mut('M12 sem o "Remover o kit deste anúncio"', 'simple', `<button type="button" className="rm" disabled={locked} data-kineo="ads-brand-kit-remove" onClick={() => kitRetract('user')}>✕ {pv.removeKit}</button>`, '', fiacaoOk)
mut('M13 uma língua cai no inglês', 'lib', "pt: { closeStyles: 'Fechar estilos'", "pt: { closeStyles: 'Close styles'", (S) => copyOk(libDe(S)))
mut('M14 o conserto passa a chamar rota', 'lib', 'const compact = (s: string) => s.replace(/\\s+/g, \'\')', "const compact = (s: string) => s.replace(/\\s+/g, '') // fetch('/api/ads/brand-kit')", semDinheiroOk)
mut('M16 a lib passa a importar código', 'lib', "import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'", "import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'\nimport { adsV2Credits } from '@/lib/ads/v2Tiers'", puraOk)
mut('M15 mudança fora do conserto na tela', 'simple', '  const closeStyles = () =>', '  const closeStyles2 = 1\n  const closeStyles = () =>', desfeitoOk)

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
