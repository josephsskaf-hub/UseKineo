// KINEO-CLIPS-TELA-0511 — guardião do pedido do fundador 05/11: toda tela de criação segue o mesmo esqueleto (entrada primeiro, um botão
// principal, preço só nele, opcionais recolhidos, mesmas cores) e, em Clips, a galeria fica ABAIXO da caixa. Prova:
//   (A) a ordem no JSX: caixa → botão → Trending → Efeitos → Meus clipes;
//   (B) motor e ajustes recolhidos num <details> fechado de fábrica; o botão fica fora dele;
//   (C) preço só no botão: nada de crédito na grade nem no recolhido, sem a linha de saldo ao lado do botão;
//   (D) o que vai ao gerar e o que o cartão da grade faz não mudaram;
//   (E) sem Halloween: executa o filtro e o trendRowEffects DE VERDADE; o Natal fica; o efeito segue no catálogo, no ?effect= e em /effects;
//   (F) sem laço de render: setMaisOpcoes só no onToggle, nenhum useEffect novo, memo com dependência estável;
//   (G) mesma cor de botão da referência (/kids-cartoon), ligado e apagado, igual a /images;
//   (H) nenhum <style> com texto filho (o servidor escapa as aspas e o React refaz a página, #425 de 05/11);
//   (M) mutantes ficam vermelhos, cada um trocando a FONTE antes de checar.
// Rodar: node scripts/test-clips-tela-0511.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const CLIENTE = 'app/(dashboard)/clips/ClipsClient.tsx'
const TELA = 'lib/clips/clipsTela0511.ts'
const NOS2 = 'lib/clipesNos2Lugares.ts'
const ESTACAO = 'lib/clips/clipSeason.ts'
const MARCA = 'KINEO-CLIPS-TELA-0511'
/** useEffect( do arquivo na base 03b266b75: esta entrega não acrescenta nenhum. */
const USE_EFFECTS_NA_BASE = 14
const HALLOWEEN = ['witch', 'zombie', 'werewolf', 'catrina', 'catrina_pet', 'dust_away', 'figurine_3d']
const NATAL = ['snow_globe', 'santa_cartoon', 'pet_xmas_tree', 'pet_xmas_angel']
const OUTROS = ['product_360', 'hug', 'kiss', 'wings', 'pet_lion']

function carregaTs(fontes, rel) {
  const memo = new Map()
  const carrega = (r) => {
    if (memo.has(r)) return memo.get(r).exports
    const js = ts.transpileModule(fontes[r], { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const mod = { exports: {} }
    memo.set(r, mod)
    new Function('module', 'exports', 'require', js)(mod, mod.exports, (nome) => {
      if (nome === '@/lib/clipesNos2Lugares') return carrega(NOS2)
      throw new Error('import inesperado: ' + nome)
    })
    return mod.exports
  }
  return carrega(rel)
}

/** trendRowEffects é interno da tela: extrai o texto real e executa com o clipSeason real. */
function trendRowDaFonte(cliente, estacao) {
  const ini = cliente.indexOf('const TREND_ROW_TOTAL')
  const fim = cliente.indexOf('// KINEO-ROSTO-QUADRO-CHAVE-2810 — tira as barras PRETAS')
  if (ini < 0 || fim < ini) return null
  const js = ts.transpileModule(cliente.slice(ini, fim) + '\nmodule.exports = trendRowEffects', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'seasonalEffectKeys', js)(mod, mod.exports, estacao.seasonalEffectKeys)
  return mod.exports
}

function verifica(f) {
  const e = []
  const c = f[CLIENTE]
  const css = f[TELA]
  const exige = (cond, msg) => { if (!cond) e.push(msg) }
  const corpo = c.slice(c.indexOf('<h1>{t(\'title\')}</h1>'))

  // (A) ordem
  const grade = corpo.indexOf('grid creation-grid')
  const caixa = corpo.indexOf('<div className="card creation-input">')
  const botao = corpo.indexOf('id="clip-generation-review"')
  const emAlta = corpo.indexOf('id="clip-trends-title"')
  const efeitos = corpo.indexOf('id="clip-effects-title"')
  const estreia = corpo.indexOf('data-clip-premiere=')
  const meus = corpo.indexOf("t('myClips')")
  exige(grade >= 0 && caixa > grade, 'A a caixa de criar não está dentro da grade de criação')
  exige(botao > caixa, 'A o botão principal não vem depois da caixa')
  exige(emAlta > botao, 'A o Trending vem antes do botão de criar')
  exige(efeitos > emAlta, 'A os efeitos vêm antes do Trending')
  exige(estreia > botao && estreia < emAlta, 'A a estreia do clipe não fica colada na caixa')
  exige(meus > efeitos, 'A "Meus clipes" não vem depois da grade')
  exige(corpo.slice(0, grade).indexOf('fx-grid') < 0, 'A há grade de clipes antes da caixa')

  // (B) recolhido
  const abre = corpo.indexOf('<details className="clip-more"')
  const fecha = corpo.indexOf('</details>')
  const recolhido = abre >= 0 && fecha > abre ? corpo.slice(abre, fecha) : ''
  exige(!!recolhido, 'B sem <details> das opções')
  exige(/const \[maisOpcoes, setMaisOpcoes\] = useState\(false\)/.test(c), 'B as opções não nascem fechadas')
  exige(recolhido.includes('className="clip-engines"') && recolhido.includes('lockedEngines.map'), 'B o motor não está no recolhido')
  exige(recolhido.includes("t('length')") && recolhido.includes("t('format')"), 'B duração e formato não estão no recolhido')
  exige((corpo.match(/className="clip-engines"/g) ?? []).length === 1, 'B há cartões de motor fora do recolhido')
  exige(botao > fecha, 'B o botão principal ficou dentro do recolhido')
  exige(/\{opcoesAbertas && <div className="clip-engines"/.test(recolhido), 'B com as opções fechadas os vídeos de motor carregam mesmo assim')
  exige(/if \(loading \|\| effect \|\| !opcoesAbertas\) return/.test(c), 'B a impressão do card trancado conta sem ele aparecer')
  exige(corpo.includes('t(\'notLength\', { engine: engine.label, s: seconds })') && /opcoesAbertas = maisOpcoes \|\| \(!!engine && !engine\.seconds\.includes\(seconds\)\)/.test(c), 'B duração impossível deixa o botão apagado sem explicação')

  // (C) preço só no botão
  const vitrine = corpo.slice(emAlta, meus)
  exige(!/\.credits|t\('credits'\)|\bcost\b/.test(vitrine.replace(/\{\/\*[\s\S]*?\*\//g, '')), 'C preço na grade de clipes')
  exige(!/\.credits|t\('credits'\)|\bcost\b/.test(recolhido), 'C preço dentro do recolhido')
  exige(!corpo.includes('className="gnote"'), 'C saldo em créditos ao lado do botão')
  exige(/\{t\('generate'\)\} · \{cost \?\? '—'\} \{t\('credits'\)\}/.test(corpo), 'C o botão perdeu o preço')

  // (D) pedido e cartões iguais
  for (const linha of [
    "await send({ engine: engine.key, seconds, aspect: effectiveAspect === 'image' ? null : effectiveAspect, prompt: promptDoClipeComEstilo(prompt), image_url: photoUrl })",
    'await send({ effect: effect.key, image_url: photoUrl })',
    'await send({ remix: remix.id, image_url: photoUrl, consent: true, ...(faceUrl ? { face_image_url: faceUrl } : {}) })',
    "const res = await fetch('/api/clips', {",
    'onClick={() => applyTrend(tr)}',
    'onClick={() => chooseHouseRemix(rx.id)}',
    'onClick={() => chooseEffect(fx.key)}',
    'data-clip-action="select_season_effect"',
  ]) exige(c.includes(linha), 'D mudou: ' + linha.slice(0, 60))

  // (E) sem Halloween, executando de verdade
  const tela = carregaTs(f, TELA)
  const estacao = carregaTs(f, ESTACAO)
  const catalogo = [...OUTROS, ...HALLOWEEN, ...NATAL].map((key) => ({ key, preview: { video: 'x' } }))
  const naVitrine = tela.efeitosDaVitrineDoClipe(catalogo).map((x) => x.key)
  for (const k of HALLOWEEN) exige(!naVitrine.includes(k), 'E ' + k + ' segue na vitrine do /clips')
  for (const k of [...NATAL, ...OUTROS]) exige(naVitrine.includes(k), 'E ' + k + ' sumiu da vitrine do /clips')
  const row = trendRowDaFonte(c, estacao)
  exige(!!row, 'E trendRowEffects sumiu da tela')
  if (row) {
    const agora = Date.parse('2026-11-05T15:00:00Z')
    const realNow = Date.now
    Date.now = () => agora
    const fila = row(tela.efeitosDaVitrineDoClipe(catalogo), 5).map((x) => x.key)
    Date.now = realNow
    for (const k of HALLOWEEN) exige(!fila.includes(k), 'E ' + k + ' no Trending')
    exige(NATAL.every((k) => fila.includes(k)), 'E o Natal saiu do Trending')
  }
  exige(/trendRowEffects\(efeitosDaVitrine, CLIP_TRENDS/.test(corpo), 'E o Trending lê o catálogo sem o filtro')
  exige(/trendRowEffects\(efeitosDaVitrine, 0\)/.test(c), 'E a sugestão depois do clipe pronto pode ser Halloween')
  exige(/\{efeitosDaVitrine\.map\(\(fx\)/.test(corpo) && !/\{effects\.map\(\(fx\)/.test(corpo), 'E a grade de efeitos lê o catálogo sem o filtro')
  exige(/const effect = effects\.find\(\(fx\) => fx\.key === effectKey\)/.test(c), 'E o ?effect= deixaria de abrir o efeito fora de estação')
  exige(/effectKeys: effects\.map\(\(fx\) => fx\.key\)/.test(c), 'E a restauração do efeito deixou de ler o catálogo inteiro')
  exige(/effects\.find\(\(fx\) => fx\.key === c\.effect\)/.test(c), 'E "Meus clipes" perderia o nome do efeito')
  const efeitosLib = f['lib/clips/clipEffects.ts']
  for (const k of HALLOWEEN) exige(efeitosLib.includes(`key: '${k}'`), 'E ' + k + ' saiu do catálogo')
  exige(fs.existsSync(path.join(ROOT, 'app/ai-halloween-video/page.tsx')) && fs.existsSync(path.join(ROOT, 'public/previews/efeito-witch.mp4')), 'E página ou prévia de Halloween apagada')

  // (F) sem laço de render
  const usos = c.match(/setMaisOpcoes/g) ?? []
  exige(usos.length === 2 && /onToggle=\{\(e\) => setMaisOpcoes\(e\.currentTarget\.open\)\}/.test(c), 'F setMaisOpcoes fora do onToggle')
  exige((c.match(/\buseEffect\(/g) ?? []).length === USE_EFFECTS_NA_BASE, 'F useEffect novo na tela')
  exige(/useMemo\(\(\) => efeitosDaVitrineDoClipe\(effects\), \[effects\]\)/.test(c), 'F filtro da vitrine sem memo estável')

  // (G) mesmas cores
  exige(css.includes('--indigo:var(--accent,#0A5CFF)') && f['components/kidsCartoon/KidsCartoonTemplate.tsx'].includes('--blue:var(--accent,#0A5CFF)'), 'G o botão não usa o mesmo --accent do /kids-cartoon')
  // KINEO-HIDRATACAO-0511 — botão apagado igual ao de /images e /kids-cartoon: mesma cor do ligado, com a mesma transparência.
  const apagado = css.match(/^\.stu\.clips-workspace \.go\.no\{([^}]*)\}/m)?.[1] ?? ''
  const opacidade = (txt) => txt.match(/opacity:([.\d]+)/)?.[1] ?? null
  exige(/background:var\(--indigo\)/.test(apagado) && /color:var\(--on-accent,#fff\)/.test(apagado), 'G botão apagado sem a cor do botão ligado')
  const opacidadeImagens = opacidade(f['lib/images/telaImagens.ts'].match(/\.images-go \.go\.no\{([^}]*)\}/)?.[1] ?? '')
  exige(!!opacidadeImagens && opacidade(apagado) === opacidadeImagens && f['components/kidsCartoon/KidsCartoonTemplate.tsx'].includes(`.kkc-go[disabled]{opacity:${opacidadeImagens}`), 'G botão apagado com transparência diferente de /images e /kids-cartoon')
  exige(/\.go\.ok,\.stu\.clips-workspace \.go\.no\{border:1px solid var\(--indigo\)/.test(css), 'G o botão muda de tamanho ao ligar (borda só em um estado)')
  // KINEO-HIDRATACAO-0511 — <style> com texto filho: o servidor escapa aspas e o navegador não, e o React refaz a página (#425).
  exige(!/<style>\{/.test(c), 'H <style> com texto filho em /clips: use dangerouslySetInnerHTML')
  exige(corpo.indexOf('CLIPS_TELA_CSS') < 0 && c.indexOf('__html: CLIPS_TELA_CSS') < c.indexOf("<h1>{t('title')}</h1>") && c.indexOf('__html: CLIPS_TELA_CSS') > c.indexOf('.stu.clips-workspace{width:100%'), 'G o CSS da tela não vem depois das regras antigas')
  for (const lang of ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']) exige(!!tela.clipsTelaMaisOpcoes(lang) && (lang === 'en' || tela.clipsTelaMaisOpcoes(lang) !== 'More options'), 'G "More options" sem tradução: ' + lang)
  exige(c.includes(MARCA) && css.includes(MARCA), 'marca ausente')
  return e
}

const fontes = () => Object.fromEntries([CLIENTE, TELA, NOS2, ESTACAO, 'lib/clips/clipEffects.ts', 'lib/images/telaImagens.ts', 'components/kidsCartoon/KidsCartoonTemplate.tsx'].map((r) => [r, rd(r)]))

let pass = 0
let fail = 0
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) } }

const real = verifica(fontes())
ok(real.length === 0, 'A–G a tela real passa' + (real.length ? ': ' + real.join(' | ') : ''))

function mutante(nome, arquivo, troca) {
  const f = fontes()
  const antes = f[arquivo]
  f[arquivo] = troca(antes)
  if (f[arquivo] === antes) { ok(false, `M ${nome}: âncora não encontrada — reancore`); return }
  const erros = (() => { try { return verifica(f) } catch (err) { return ['quebrou: ' + err.message] } })()
  ok(erros.length > 0, `M ${nome} → vermelho${erros.length ? ` (${erros[0].slice(0, 70)})` : ''}`)
}

mutante('a grade volta para cima da caixa', CLIENTE, (s) => {
  const ini = s.indexOf('      {/* KINEO-EM-ALTA-2610 — vitrine "Em alta esta semana"')
  const fim = s.indexOf('      {/* KINEO-CLIPS-TELA-0511 — "Meus clipes" segue')
  const bloco = s.slice(ini, fim)
  const sem = s.slice(0, ini) + s.slice(fim)
  return sem.replace("<h1>{t('title')}</h1>", "<h1>{t('title')}</h1>\n" + bloco)
})
mutante('Halloween volta à lista (FORA_DE_ESTACAO vazia)', NOS2, (s) => s.replace("efeitos: ['witch', 'zombie', 'werewolf', 'catrina', 'catrina_pet', 'dust_away', 'figurine_3d'],", 'efeitos: [],'))
mutante('o filtro passa a tirar o Natal também', TELA, (s) => s.replace('!FORA_DE_ESTACAO.efeitos.includes(fx.key)', "!FORA_DE_ESTACAO.efeitos.includes(fx.key) && fx.key !== 'snow_globe'"))
mutante('a grade de efeitos ignora o filtro', CLIENTE, (s) => s.replace('{efeitosDaVitrine.map((fx)', '{effects.map((fx)'))
mutante('o Trending ignora o filtro', CLIENTE, (s) => s.replace('trendRowEffects(efeitosDaVitrine, CLIP_TRENDS', 'trendRowEffects(effects, CLIP_TRENDS'))
mutante('?effect=witch deixa de abrir', CLIENTE, (s) => s.replace('const effect = effects.find((fx) => fx.key === effectKey)', 'const effect = efeitosDaVitrine.find((fx) => fx.key === effectKey)'))
mutante('os motores saem do recolhido', CLIENTE, (s) => s.replace('</details>', '').replace('<details className="clip-more"', '<div className="clip-more"'))
mutante('as opções nascem abertas', CLIENTE, (s) => s.replace('const [maisOpcoes, setMaisOpcoes] = useState(false)', 'const [maisOpcoes, setMaisOpcoes] = useState(true)'))
mutante('preço na linha do recolhido', CLIENTE, (s) => s.replace('<strong>{clipsTelaMaisOpcoes(language)}</strong>', "<strong>{clipsTelaMaisOpcoes(language)} {cost}</strong>"))
mutante('preço no cartão da grade', CLIENTE, (s) => s.replace('<span className="tag">{fx.engine_label}</span>', "<span className=\"tag\">{fx.engine_label} {fx.credits}</span>"))
mutante('o pedido de gerar muda', CLIENTE, (s) => s.replace('prompt: promptDoClipeComEstilo(prompt), image_url: photoUrl })', 'prompt, image_url: photoUrl })'))
mutante('laço: setState em efeito sem dependência', CLIENTE, (s) => s.replace("useProductStage('clips')", "useProductStage('clips'); useEffect(() => { setMaisOpcoes((v) => !v) })"))
mutante('cor de botão diferente', TELA, (s) => s.replace('--indigo:var(--accent,#0A5CFF)', '--indigo:#2997ff'))
mutante('botão apagado volta a ser cinza', TELA, (s) => s.replace('.go.no{background:var(--indigo);color:var(--on-accent,#fff)', '.go.no{background:var(--card2);color:var(--muted)'))
mutante('botão apagado com outra transparência', TELA, (s) => s.replace('opacity:.55;cursor:not-allowed', 'opacity:.3;cursor:not-allowed'))
mutante('borda só num estado do botão', TELA, (s) => s.replace('.go.no{border:1px solid var(--indigo);border-radius:11px', '.go.no{border-radius:11px'))
mutante('<style> volta a ter texto filho', CLIENTE, (s) => s.replace('<style dangerouslySetInnerHTML={{ __html: `', '<style>{`').replace('` }} />', '`}</style>'))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
