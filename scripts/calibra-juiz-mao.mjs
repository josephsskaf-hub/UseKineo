// KINEO-ADS-MAO-JUIZ-1610 — calibração do juiz do "produto na mão" com as ~21 fotos REAIS já salvas (sem render; ~US$ 0,02 por foto por
// repetição com o modelo de hoje, 3 repetições = ~US$ 1,3). Regra do fundador (16/10, "não pode errar"): nenhum render pago do plano novo sem
// esta calibração verde. docs/PESQUISA-SEM-ERRO-PRODUTO-NA-MAO-2026-10-16.md, regras 4 e 5 e o passo 1 de (b).
//
// Uso (o coordenador roda; esta sessão não tem chave):
//   1) node scripts/calibra-juiz-mao.mjs corpos [--raiz C:\kineo-wt\prints-1610] [--produto <https-url | arquivo.jpg>] [--saida <pasta>] [--jpeg] [--repeat 3]
//        → 1 corpo JSON por foto (data URL, 1 foto por corpo: cabe no limite de ~4,5 MB da Vercel) para POST /api/admin/ads-judge-calibrate.
//          No Windows as fotos vão em PNG reduzido a 1280 px (System.Drawing): o juiz só RECORTA o produto gerado quando a foto é PNG —
//          como no avanço, que pede PNG ao Nano Banana. --jpeg manda o JPEG original (a fidelidade compara as fotos inteiras).
//          Sem --produto usa <raiz>\atheeri-produto.jpg; prefira a URL original do pedido (ads_v2_orders.photos[0].original_url).
//   2) mande cada corpo logado como administrador interno (Chrome do fundador, console em usekineo.com):
//        await (await fetch('/api/admin/ads-judge-calibrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: <corpo> })).json()
//      e salve cada resposta em um arquivo .json.
//   3) node scripts/calibra-juiz-mao.mjs conferir resposta-*.json
//        → compara com o GABARITO; sai 1 se alguma foto firme divergir, faltar, ou se a maioria das 3 repetições não for estável.
//
// GABARITO (a resposta certa conhecida; "firme" = pass true/false; null = só as chaves afirmadas):
//   T1 (mao-T1-raw, pedido do 1º teste): p1 e p3 = frasco E caixa juntos (both_objects); p2 = frasco PRETO inventado (material/cores).
//   Ajuste 1 (mao2-raw): p0 e p2 limpos (um frasco, uma pessoa); p1 = frasco e caixa grudados (both_objects); p3 = homem sentado na cama ao fundo (extra_person).
//   Ajuste 3 (mao3-raw): 01,02,03,04,06,08,10 passam (relatório do T1); 05 = homem desfocado na janela (extra_person); 11 passa (olho);
//     07, 09 e 12 só nas chaves afirmadas: 07 frasco, uma pessoa, forma laranja no líquido; 09 caixa de lado, uma pessoa, frasco só pela
//     janela da própria caixa; 12 caixa fechada, uma mulher, um objeto dourado na cama.
//   Comparativo (compara-raw/input.jpg): mulher com o frasco na frente da caixa (both_objects).
//   O objeto de cada foto é o que o plano de hoje pediria naquele enquadramento (gancho/borrifo = frasco; rótulo/close = caixa).
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync } from 'node:fs'
import { join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const RAIZ = 'C:\\kineo-wt\\prints-1610'
export const PRODUTO_LOCAL = 'atheeri-produto.jpg'
/** pass: true/false = firme; null = não afirmado; mustFail = chaves que TÊM de reprovar; mustFailAny = pelo menos uma; keys = respostas afirmadas. */
export const GABARITO = {
  't1-p0': { file: 'mao-T1-raw/p0-a1-scene.jpg', object: 'bottle', pass: null, keys: { extra_person: false, both_objects: false }, fonte: 'olho: um homem com a caixa só (o plano pediria o frasco)' },
  't1-p1': { file: 'mao-T1-raw/p1-a1-scene.jpg', object: 'box', pass: false, mustFail: ['both_objects'], fonte: 'relatório T1: frasco na frente da caixa' },
  't1-p2': { file: 'mao-T1-raw/p2-a1-scene.jpg', object: 'bottle', pass: false, mustFailAny: ['material', 'colors'], fonte: 'relatório T1: frasco preto inventado (D1)' },
  't1-p3': { file: 'mao-T1-raw/p3-a1-scene.jpg', object: 'box', pass: false, mustFail: ['both_objects'], fonte: 'olho: caixa e frasco juntos na mão' },
  'mao2-p0': { file: 'mao2-raw/p0-a1-scene.jpg', object: 'bottle', pass: true, fonte: 'olho: um homem cheirando o frasco' },
  'mao2-p1': { file: 'mao2-raw/p1-a1-scene.jpg', object: 'box', pass: false, mustFail: ['both_objects'], fonte: 'relatório ajuste 1: frasco e caixa grudados (D3)' },
  'mao2-p2': { file: 'mao2-raw/p2-a1-scene.jpg', object: 'bottle', pass: true, fonte: 'olho: as duas mãos da mesma pessoa, frasco certo' },
  'mao2-p3': { file: 'mao2-raw/p3-a1-scene.jpg', object: 'box', pass: false, mustFail: ['extra_person'], fonte: 'relatório ajuste 1: homem na cama ao fundo (D4)' },
  'mao3-01': { file: 'mao3-raw/still-01.jpg', object: 'box', pass: true, fonte: 'relatório T1 ajuste 3' },
  'mao3-02': { file: 'mao3-raw/still-02.jpg', object: 'bottle', pass: true, fonte: 'relatório T1 ajuste 3' },
  'mao3-03': { file: 'mao3-raw/still-03.jpg', object: 'box', pass: true, fonte: 'relatório T1 ajuste 3' },
  'mao3-04': { file: 'mao3-raw/still-04.jpg', object: 'bottle', pass: true, fonte: 'relatório T1 ajuste 3' },
  'mao3-05': { file: 'mao3-raw/still-05.jpg', object: 'box', pass: false, mustFail: ['extra_person'], keys: { extra_person: true }, fonte: 'relatório T1 ajuste 3: homem desfocado na janela' },
  'mao3-06': { file: 'mao3-raw/still-06.jpg', object: 'bottle', pass: true, fonte: 'relatório T1 ajuste 3' },
  'mao3-07': { file: 'mao3-raw/still-07.jpg', object: 'bottle', pass: null, keys: { extra_person: false, both_objects: false }, fonte: 'olho: uma pessoa, frasco só; cor do líquido em dúvida' },
  'mao3-08': { file: 'mao3-raw/still-08.jpg', object: 'box', pass: true, fonte: 'relatório T1 ajuste 3' },
  'mao3-09': { file: 'mao3-raw/still-09.jpg', object: 'box', pass: null, keys: { extra_person: false, both_objects: false }, fonte: 'olho: caixa de lado, uma pessoa; forma em dúvida' },
  'mao3-10': { file: 'mao3-raw/still-10.jpg', object: 'bottle', pass: true, fonte: 'relatório T1 ajuste 3' },
  'mao3-11': { file: 'mao3-raw/still-11.jpg', object: 'bottle', pass: true, keys: { extra_person: false, both_objects: false }, fonte: 'olho: frasco, um homem, sem caixa' },
  'mao3-12': { file: 'mao3-raw/still-12.jpg', object: 'box', pass: null, keys: { extra_person: false }, fonte: 'olho: caixa fechada, uma mulher; objeto dourado na cama em dúvida' },
  'compara': { file: 'compara-raw/input.jpg', object: 'bottle', pass: false, mustFail: ['both_objects'], fonte: 'olho: frasco na frente da caixa' },
}
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

export function dataUrl(file) {
  const mime = MIME[extname(file).toLowerCase()]
  if (!mime) throw new Error('extensão sem tipo: ' + file)
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}
/** JPEG → PNG reduzido (lado maior ≤ max) pelo System.Drawing do Windows. null = não deu (fica o JPEG). */
export function pngVia(file, max = 1280) {
  if (process.platform !== 'win32') return null
  try {
    const out = join(mkdtempSync(join(tmpdir(), 'calib-')), 'f.png')
    const ps = `Add-Type -AssemblyName System.Drawing; $i=[System.Drawing.Image]::FromFile('${file.replace(/'/g, "''")}'); $s=[Math]::Min(1.0, ${max}/[Math]::Max($i.Width,$i.Height)); $w=[int]($i.Width*$s); $h=[int]($i.Height*$s); $b=New-Object System.Drawing.Bitmap $w,$h; $g=[System.Drawing.Graphics]::FromImage($b); $g.InterpolationMode='HighQualityBicubic'; $g.DrawImage($i,0,0,$w,$h); $b.Save('${out.replace(/'/g, "''")}',[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $b.Dispose(); $i.Dispose()`
    execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'ignore' })
    return existsSync(out) ? out : null
  } catch {
    return null
  }
}
/** O corpo da rota para estas fotos. Puro com as fontes já resolvidas. */
export function corpo(productUrl, fotos, repeat = 3) {
  return { product_image_url: productUrl, repeat, images: fotos.map(({ id, url }) => ({ url, object: GABARITO[id].object, label: id })) }
}

/** Confere as respostas da rota com o gabarito. Devolve { ok, linhas, faltando, instaveis }. Puro. */
export function conferir(respostas) {
  const porLabel = new Map()
  for (const r of respostas) for (const x of r?.results ?? []) if (x && x.label) porLabel.set(x.label, x)
  const linhas = []
  const faltando = []
  const instaveis = []
  let ok = true
  for (const [id, g] of Object.entries(GABARITO)) {
    const x = porLabel.get(id)
    if (!x) { faltando.push(id); continue }
    const erros = []
    const fails = x.verdict ? x.verdict.fails : []
    if (!x.verdict) erros.push('juiz sem resposta (verdict null)')
    else {
      if (g.pass === true && !x.verdict.ok) erros.push('devia PASSAR; reprovou em ' + fails.join(','))
      if (g.pass === false && x.verdict.ok) erros.push('devia REPROVAR; passou')
      for (const k of g.mustFail ?? []) if (!fails.includes(k)) erros.push('devia reprovar em ' + k)
      if (g.mustFailAny && !g.mustFailAny.some((k) => fails.includes(k))) erros.push('devia reprovar em ' + g.mustFailAny.join(' ou '))
    }
    for (const [k, v] of Object.entries(g.keys ?? {})) if (x.answers && x.answers[k] !== v) erros.push(`${k}: esperado ${v}, veio ${JSON.stringify(x.answers[k])}`)
    if (x.stable === false) { instaveis.push(id); erros.push('as repetições discordam') }
    const firme = g.pass !== null
    if (erros.length && (firme || x.stable === false)) ok = false
    const un = x.verdict?.unsure?.length ? ` [não sei: ${x.verdict.unsure.join(',')}]` : ''
    linhas.push(`${erros.length ? (firme ? 'ERRO ' : 'aviso') : 'ok   '} ${id} (${g.object}${x.verdict?.crop ? ', recorte' : ''}) ${x.verdict ? (x.verdict.ok ? 'passou' : 'reprovou: ' + fails.join(',')) : 'sem veredito'}${un}${erros.length ? ' — ' + erros.join('; ') : ''}`)
  }
  if (faltando.length) ok = false
  return { ok, linhas, faltando, instaveis }
}

function arg(name, def = null) { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def }

function main() {
  const cmd = process.argv[2]
  if (cmd === 'corpos') {
    const raiz = arg('--raiz', RAIZ)
    const saida = arg('--saida', join(process.cwd(), 'calibra-juiz-mao-corpos'))
    const repeat = Number(arg('--repeat', '3'))
    const prod = arg('--produto', join(raiz, PRODUTO_LOCAL))
    const productUrl = /^https:\/\//i.test(prod) ? prod : dataUrl(prod)
    const jpeg = process.argv.includes('--jpeg')
    mkdirSync(saida, { recursive: true })
    for (const [id, g] of Object.entries(GABARITO)) {
      const file = join(raiz, g.file)
      if (!existsSync(file)) { console.log('falta ' + file); continue }
      const png = jpeg ? null : pngVia(file)
      writeFileSync(join(saida, `corpo-${id}.json`), JSON.stringify(corpo(productUrl, [{ id, url: dataUrl(png ?? file) }], repeat)))
      console.log(`${id}: ${png ? 'PNG' : 'JPEG'}`)
    }
    console.log('corpos em ' + saida + ' (1 foto por corpo; mande cada um para POST /api/admin/ads-judge-calibrate)')
    return
  }
  if (cmd === 'conferir') {
    const files = process.argv.slice(3)
    if (!files.length) { console.log('uso: node scripts/calibra-juiz-mao.mjs conferir resposta.json [...]'); process.exit(2) }
    const r = conferir(files.map((f) => JSON.parse(readFileSync(f, 'utf8'))))
    for (const l of r.linhas) console.log(l)
    if (r.faltando.length) console.log('faltando: ' + r.faltando.join(', '))
    if (r.instaveis.length) console.log('instáveis (as 3 repetições discordam): ' + r.instaveis.join(', '))
    console.log(r.ok ? '\nCALIBRAÇÃO VERDE — o juiz bate com o gabarito firme, de forma estável.' : '\nCALIBRAÇÃO VERMELHA — NÃO rodar render pago.')
    process.exit(r.ok ? 0 : 1)
  }
  console.log('uso: node scripts/calibra-juiz-mao.mjs corpos|conferir … (ver o cabeçalho)')
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
