// KINEO-CLIPE-NO-STUDIO-0311 + KINEO-EPOCA-SEM-GENTE-INVENTADA-0311 [TRAVA 8.2 — fundador 03/11: "quero consertar tudo agora"] —
// guardião da leva 1 do Canal do Revisor. Prova:
//   (A) decidirClipeNoStudio com os textos REAIS: "Vender este produto" (deruh14) → venda; o master prompt de 4.262 caracteres
//       (morongclarence9) → filme; pedido de venda nas 5 línguas → venda; casa/loja/música/gato → clipe;
//   (B) o modo clipe do Studio decide ANTES de gastar (antes de generateClip), troca para o Filme narrado no desvio de filme,
//       registra o evento e mostra os dois avisos FORA do bloco que só existe com clipe em andamento;
//   (C) o sufixo de época nunca manda pôr gente: "Any person the shot describes…" + "do not add people the shot does not
//       mention"; nunca escreve "no people" (não apaga multidão que o plano descreve);
//   (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-clipe-no-studio-0311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const F = { lib: 'lib/clips/clipNoStudio0311.ts', longo: 'lib/clips/clipTextoLongo.ts', studio: 'app/(dashboard)/studio/StudioClient.tsx', epoca: 'lib/cinematic/elencoEpoca.ts' }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

function load(over = {}) {
  const cache = {}
  const compile = (rel) => {
    if (cache[rel]) return cache[rel].exports
    const js = ts.transpileModule(over[rel] ?? read(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const mod = { exports: {} }
    cache[rel] = mod
    new Function('require', 'module', 'exports', js)((s) => { if (s === './clipTextoLongo') return compile(F.longo); throw new Error('import inesperado ' + s) }, mod, mod.exports)
    return mod.exports
  }
  return compile(F.lib)
}

const MASTER = 'MASTER PROMPT – MILITARY COUNTRY COMPARISON MAP ANIMATIONS\n\nAct as a professional AI video prompt engineer specializing in cinematic satellite map animations. ' + 'Create a sequence comparing the military power of China, Russia, the USA and India with flags, troop counts, aircraft and naval fleets on a rotating globe. '.repeat(25)

function checa(over = {}) {
  const erros = []
  const req = (c, m) => { if (!c) erros.push(m) }
  let L
  try { L = load(over) } catch (e) { return ['lib não compila: ' + e.message] }
  const d = (t) => L.decidirClipeNoStudio(t)
  // (A)
  req(d('Vender este produto') === 'venda', 'A deruh14 "Vender este produto" → venda')
  req(MASTER.length > 4000 && d(MASTER) === 'filme', 'A morongclarence9 master prompt (4.000+ caracteres) → filme')
  for (const t of ['sell my product', 'Promote this product on TikTok', 'vende mi producto', 'vendre ce produit', 'Dieses Produkt verkaufen', 'anunciar meu produto novo'])
    req(d(t) === 'venda', `A venda: ${t}`)
  for (const t of ['vender minha casa', 'Os produtos da feira', 'The man who sold the world', 'a cat jumping on a sofa', 'Uma loja de roupas à noite', ''])
    req(d(t) === 'clipe', `A clipe: ${t || '(vazio)'}`)
  req(L.CLIPE_VENDA_ADS_HREF.startsWith('/ads?') && L.CLIPE_NO_STUDIO_EVENTOS.venda === 'studio_clip_sale_to_ads' && L.CLIPE_NO_STUDIO_EVENTOS.filme === 'studio_clip_script_to_film', 'A porta do Anúncio e os eventos')
  // (B)
  const st = over[F.studio] ?? read(F.studio)
  const gen = st.slice(st.indexOf('  const generate = () => {'), st.indexOf('  const generate = () => {') + 1600)
  const iDesvio = gen.indexOf('const desvio = decidirClipeNoStudio(prompt)')
  const iClip = gen.indexOf('void generateClip()')
  req(iDesvio > 0 && iClip > iDesvio, 'B decide ANTES de gerar o clipe')
  req(/version: CLIPE_NO_STUDIO_VERSION \}\)\n\s*return\n\s*\}\n\s*void generateClip\(\)/.test(gen), 'B desvio nunca chama o motor (return logo depois do evento, antes do generateClip)')
  req(/if \(desvio === 'filme'\) setScriptMode\('ai'\)/.test(gen), 'B texto de filme troca para o Filme narrado')
  req(/trackEvent\(CLIPE_NO_STUDIO_EVENTOS\[desvio\]/.test(gen), 'B evento do desvio')
  const iAviso = st.indexOf('data-kineo="clipe-venda-ads"')
  const iBlocoClip = st.indexOf("{scriptMode === 'clip' && clipState.phase !== 'idle' && (")
  req(iAviso > 0 && iBlocoClip > iAviso && st.indexOf('data-kineo="clipe-vira-filme"') < iBlocoClip, 'B os avisos ficam FORA do bloco de clipe em andamento (senão nunca aparecem)')
  req(/href=\{CLIPE_VENDA_ADS_HREF\}/.test(st), 'B o aviso de venda leva ao Anúncio')
  // (C)
  const ep = over[F.epoca] ?? read(F.epoca)
  // só código: os comentários contam a história (e citam a frase antiga)
  const suf = ep.slice(ep.indexOf('export function sufixoDeEpoca('), ep.indexOf('export function trocarModernidades(')).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
  req(!/Every person in frame/.test(suf), 'C o sufixo não ordena "Every person in frame"')
  req(/Any person the shot describes wears/.test(suf) && /do not add people the shot does not mention/.test(suf), 'C quem a cena descreve veste a época; a cena sem gente não ganha gente')
  req(!/\bno people\b/i.test(suf), 'C nunca "no people" (não apaga multidão descrita)')
  return erros
}

const base = checa()
ok(base.length === 0, `todas as provas verdes (${base.length} erro(s))${base.length ? ': ' + base.join(' · ') : ''}`)
const lib = read(F.lib)
const st = read(F.studio)
const ep = read(F.epoca)
const MUTANTES = [
  ['venda vira clipe', { [F.lib]: lib.replace("if (pedeVendaDeProduto(t)) return 'venda'", '') }],
  ['texto longo vira clipe', { [F.lib]: lib.replace("if (pareceRoteiroDeFilme(t, { maxSegundos: CLIPE_NO_STUDIO_MAX_SEGUNDOS })) return 'filme'", '') }], // reancorado 14/11 KINEO-CLIPE-ROTEIRO-QUALQUER-LINGUA-1411 v2.1 (o Studio passa o seu teto de 12 s)
  ['casa vira venda', { [F.lib]: lib.replace("const PRODUTO = '(?:", "const PRODUTO = '(?:casa|") }],
  ['desvio ainda gasta', { [F.studio]: st.replace("        void trackEvent(CLIPE_NO_STUDIO_EVENTOS[desvio], { chars: prompt.trim().length, version: CLIPE_NO_STUDIO_VERSION })\n        return\n", "        void trackEvent(CLIPE_NO_STUDIO_EVENTOS[desvio], { chars: prompt.trim().length, version: CLIPE_NO_STUDIO_VERSION })\n") }],
  ['época volta a ordenar gente', { [F.epoca]: ep.replace('Any person the shot describes wears', 'Every person in frame wears') }],
]
for (const [nome, over] of MUTANTES) {
  const changed = Object.entries(over).every(([k, v]) => v !== read(k))
  const e = changed ? checa(over) : ['(mutante não aplicou)']
  ok(changed && e.length > 0, `mutante "${nome}" fica vermelho (${changed ? e.length + ' erro(s)' : 'NÃO APLICOU'})`)
}
console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
