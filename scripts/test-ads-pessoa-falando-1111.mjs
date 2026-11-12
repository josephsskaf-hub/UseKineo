import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
function loader(over = {}) {
  const cache = new Map()
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports
    const module = { exports: {} }; cache.set(path, module)
    const req = (name) => {
      if (name.startsWith('node:')) return nativeRequire(name)
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
      const target = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
      assert(target, `dependência externa: ${name}`)
      return load(target)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}
// KINEO-ADS-PESSOA-FALANDO-1111 — SPEC-ADS-PESSOA-FALANDO-2026-11-11 §2 e §4 (Div. 2): o pipeline do anúncio em que a pessoa FALA, puro e sem rede.
// Prova (Node puro, US$ 0): com as entradas dos 3 anúncios que a CEO rodou à mão em 11/11 (Halo/Sofia/carro, Orra/Rahul/rua, Veil/Amara/GRWM), o dry-run
// devolve os 3 JSON equivalentes: (a) foto-chave no nano-banana-pro/edit com [retrato, produto], 2 opções, 1K, jpeg, 9:16, boca fechada; (b) vídeo no
// bytedance/seedance-2.0/image-to-video (NÃO reference-to-video), 720p, 9:16, generate_audio, a fala INTEIRA entre aspas e um "On "<palavra>"" por
// gesto; (c) a régua do roteiro em código (22–31 palavras — a Veil aprovada, com 31, passa; clichê, número inventado, gesto sem palavra); (d) o juiz da fala: o Halo saiu "…and
// honestly, honestly, I'm buying two." e REPROVA; Orra e Veil saíram limpos e PASSAM; (e) a trava 'internal'. Mutantes no fim.
const P = 'lib/ads/pessoaFalando/prompts.ts', R = 'lib/ads/pessoaFalando/roteiro.ts', J = 'lib/ads/pessoaFalando/juizFala.ts', D = 'lib/ads/pessoaFalando/dryRun.ts', F = 'lib/ads/pessoaFalando/formatos.ts'
const FOTO = 'https://example.com/produto.jpg'
const CASOS = [
  { nome: 'Halo', e: { apresentadorId: 'sofia', formatoId: 'car_selfie', produto: 'Halo insulated tumbler, matte sage-green steel with a clear lid', frase: 'Ice stays from 7 am to the evening, fits cup holders, never leaks; people end up buying 2.', fotoDoProduto: FOTO },
    r: { fala: "Okay, I filled this at seven this morning, and look, the ice is still here. It fits my cup holder, it doesn't leak, and honestly? I'm buying two.", gestos: [{ palavra: 'look', gesto: 'tilts the cup toward the lens to show the ice' }, { palavra: 'two', gesto: 'raises two fingers with a grin' }] },
    ouvido: "Okay, I filled this at seven this morning, and look, the ice is still here. It fits my cup holder, it doesn't leak, and honestly, honestly, I'm buying two.", pedido: 12, clipe: 12.04, inicio: 0.32, aprova: false },
  { nome: 'Orra', e: { apresentadorId: 'rahul', formatoId: 'street_interview', produto: 'Orra Buds wireless earbuds, matte white case', frase: 'Earbuds for $40 that block out city noise, battery lasts a week.', fotoDoProduto: FOTO },
    r: { fala: "Wait, what's in my ears? These. Orra Buds. They were forty bucks, they block out this whole street, and the battery lasts my entire week.", gestos: [{ palavra: 'These', gesto: 'lifts the open case toward the lens' }, { palavra: 'street', gesto: 'glances at the busy street behind him' }] },
    ouvido: "Wait, what's in my ears? These. Orra Buds. They were forty bucks, they block out this whole street, and the battery lasts my entire week.", pedido: 10, clipe: 10.04, inicio: 0.21, aprova: true },
  { nome: 'Veil', e: { apresentadorId: 'amara', formatoId: 'get_ready', produto: 'Veil tinted SPF moisturizer, cream tube', frase: 'A tinted SPF that replaces foundation; one pump covers the face.', fotoDoProduto: FOTO },
    r: { fala: "Get ready with me, but I'm only using one thing today. This tinted SPF. One pump, blend it in, and I'm done. No foundation, and my skin still looks like this.", gestos: [{ palavra: 'pump', gesto: 'presses one pump onto her fingertips' }, { palavra: 'blend', gesto: 'blends it across her cheek' }] },
    ouvido: "Get ready with me, but I'm only using one thing today. This tinted SPF. One pump, blend it in, and I'm done. No foundation, and my skin still looks like this.", pedido: 12, clipe: 11.96, inicio: 0.4, aprova: true },
]
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let PR, RO, JU, DR, FO
  try { const load = loader(over); PR = load(P); RO = load(R); JU = load(J); DR = load(D); FO = load(F) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  for (const c of CASOS) {
    const d = DR.pessoaFalandoDryRun(c.e, c.r)
    const f = d.foto_chave, v = d.video
    no(f.endpoint !== 'fal-ai/nano-banana-pro/edit' || JSON.stringify(Object.keys(f.input).sort()) !== JSON.stringify(['aspect_ratio', 'image_urls', 'num_images', 'output_format', 'prompt', 'resolution']) || f.input.num_images !== 2 || f.input.resolution !== '1K' || f.input.output_format !== 'jpeg' || f.input.aspect_ratio !== '9:16' || f.input.image_urls[1] !== FOTO || !/presenters\/(sofia|rahul|amara)\.webp$/.test(f.input.image_urls[0]) || !/Mouth closed/.test(f.input.prompt), `(a) ${c.nome}: foto-chave ${JSON.stringify(f).slice(0, 200)}`)
    no(v.endpoint !== 'bytedance/seedance-2.0/image-to-video' || JSON.stringify(Object.keys(v.input).sort()) !== JSON.stringify(['aspect_ratio', 'duration', 'generate_audio', 'image_url', 'prompt', 'resolution']) || v.input.generate_audio !== true || v.input.resolution !== '720p' || v.input.aspect_ratio !== '9:16', `(b) ${c.nome}: vídeo ${JSON.stringify(v).slice(0, 200)}`)
    no(!v.input.prompt.includes(`"${c.r.fala.replace(/"/g, "'")}"`), `(b) ${c.nome}: a fala não vai inteira entre aspas`)
    for (const g of c.r.gestos) no(!v.input.prompt.includes(`On "${g.palavra}"`), `(b) ${c.nome}: falta o gesto de "${g.palavra}"`)
    no(!/One voice only: (hers|his)\. No music, no narrator, no text on screen\./.test(v.input.prompt), `(b) ${c.nome}: sem "uma voz só"`)
    no(d.roteiro.aprovado !== true, `(c) ${c.nome}: o roteiro aprovado reprovou na régua → ${d.roteiro.motivos.join(', ')}`)
    const j = JU.juizDaFala({ fala: c.r.fala, transcricao: { texto: c.ouvido, inicio: c.inicio }, segundosPedidos: c.pedido, segundosDoClipe: c.clipe })
    no(j.aprovado !== c.aprova, `(d) ${c.nome}: juiz ${j.aprovado ? 'aprovou' : 'reprovou'} (${j.motivos.join(', ')})`)
  }
  // (c) a régua pega o que a spec proíbe
  const base = CASOS[1]
  const ruins = [
    ['curta', { ...base.r, fala: 'These earbuds are great. Forty bucks. Buy them.' }],
    ['longa (34)', { ...base.r, fala: "Wait, what's in my ears? These. Orra Buds. They were forty bucks, they block out this whole street, and the battery lasts my entire week, every single day of it, even on long flights." }],
    ['clichê', { ...base.r, fala: "Wait, what's in my ears? These. Orra Buds are a total game-changer, forty bucks, they block out this whole street, and last a week." }],
    ['número inventado', { ...base.r, fala: "Wait, what's in my ears? These. Orra Buds. They were forty bucks, they block out this whole street, and the battery lasts ninety hours straight." }],
    ['gesto sem palavra', { ...base.r, gestos: [{ palavra: 'pocket', gesto: 'pats the pocket' }, { palavra: 'These', gesto: 'lifts the case' }] }],
  ]
  for (const [nome, r] of ruins) no(!RO.validarRoteiro(r, base.e).length, `(c) a régua deixou passar: ${nome}`)
  // (d) controles do juiz: começa tarde, dura errado, cobre pouco
  const o = CASOS[1]
  no(JU.juizDaFala({ fala: o.r.fala, transcricao: { texto: o.ouvido, inicio: 1.2 }, segundosPedidos: 10, segundosDoClipe: 10 }).aprovado, '(d) começou em 1,2 s e passou')
  no(JU.juizDaFala({ fala: o.r.fala, transcricao: { texto: o.ouvido, inicio: 0.2 }, segundosPedidos: 10, segundosDoClipe: 10.6 }).aprovado, '(d) durou 10,6 s e passou')
  no(JU.juizDaFala({ fala: o.r.fala, transcricao: { texto: 'Wait, these are Orra Buds.', inicio: 0.2 }, segundosPedidos: 10, segundosDoClipe: 10 }).aprovado, '(d) cobriu pouco e passou')
  // (e) a trava
  no(FO.KINEO_ADS_PESSOA_FALANDO !== 'internal' || FO.pessoaFalandoLigado('internal', false) || !FO.pessoaFalandoLigado('internal', true), '(e) a trava não é internal')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (os 3 aprovados viram os mesmos JSON; régua e juiz pegam o que a spec proíbe; Halo reprova pela repetição)')
const ju = read(J), pr = read(P), ro = read(R)
const MUT = [
  ['M1 o juiz não vê repetição', { [J]: ju.replace('for (const r of repeticoes(i.fala, i.transcricao.texto)) motivos.push(`repetiu_${r}`)', '') }],
  ['M2 a fala vai sem aspas', { [P]: pr.replace('with lips clearly synced to every word: "${fala}"`', 'with lips clearly synced to every word: ${fala}`') }],
  ['M3 o vídeo volta ao reference-to-video', { [P]: pr.replace("export const VIDEO_ENDPOINT = 'bytedance/seedance-2.0/image-to-video'", "export const VIDEO_ENDPOINT = 'bytedance/seedance-2.0/reference-to-video'") }],
  ['M4 a régua aceita clichê', { [R]: ro.replace('for (const c of CLICHES) if (baixo.includes(c)) m.push(`cliche_${c}`)', '') }],
  ['M5 a régua aceita número inventado', { [R]: ro.replace('if (!doCliente.has(x) && !(x === 1)) m.push(`numero_inventado_${x}`)', 'if (false) m.push(`numero_inventado_${x}`)') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
