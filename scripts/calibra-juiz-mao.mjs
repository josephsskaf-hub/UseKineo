// KINEO-ADS-MAO-JUIZ-1610 — calibração do juiz do "produto na mão" com as 12 fotos REAIS do T1 a6144352 (sem render, ~US$ 0,12).
// Regra do fundador (16/10, "não pode errar"): nenhum render pago do plano novo sem esta calibração verde.
//
// Uso (o coordenador roda; esta sessão não tem chave):
//   1) node scripts/calibra-juiz-mao.mjs corpos [--dir C:\kineo-wt\prints-1610\mao3-raw] [--produto <https-url | arquivo.jpg>] [--saida <pasta>]
//        → escreve 1 corpo JSON por foto (data URL: cabe no limite de ~4,5 MB da Vercel) para POST /api/admin/ads-judge-calibrate.
//          Sem --produto usa C:\kineo-wt\prints-1610\atheeri-produto.jpg (a foto do Atheeri); prefira a URL original do pedido
//          (ads_v2_orders.photos[0].original_url) — é ela que o avanço manda como 1ª imagem.
//      Com --urls a.json (lista de 12 URLs https, na ordem still-01..12) escreve UM corpo só com as 12.
//   2) mande cada corpo logado como administrador (Chrome do fundador, console em usekineo.com):
//        await (await fetch('/api/admin/ads-judge-calibrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: <corpo> })).json()
//      e salve cada resposta em um arquivo .json.
//   3) node scripts/calibra-juiz-mao.mjs conferir resposta-01.json [resposta-02.json …]
//        → compara com o GABARITO abaixo; sai 1 se alguma foto do gabarito firme divergir.
//
// GABARITO (ordem da grade docs/RESULTADO-T1-MAO-AJUSTE-3: 1–4 = 1ª tentativa, 5–8 = 2ª, 9–12 = 3ª, enquadramento sem rótulo):
//   firme (do relatório do T1): 1, 2, 3, 4, 6, 8 e 10 PASSAM; 5 REPROVA em extra_person (homem desfocado na janela).
//   olho desta sessão (16/10, still-07/09/11/12.jpg abertas em resolução cheia):
//     7  frasco, UMA pessoa (as duas mãos têm a mesma manga de tricô): sem defeito de objeto/pessoa; fidelidade não afirmada (há uma forma
//        laranja dentro do líquido que o frasco real não tem — "colors" pode reprovar).
//     9  caixa de lado, só as mãos de uma pessoa (suéter bege); o frasco aparece só pela janela da própria caixa (não é objeto separado):
//        sem defeito de objeto/pessoa; fidelidade não afirmada (a caixa aparece aberta/inclinada — "shape" pode reprovar).
//     11 frasco nas mãos de um homem, sem caixa, ninguém mais: PASSA.
//     12 caixa fechada vista de lado, uma mulher; há um objeto dourado sobre a cama atrás das mãos (pode ser o frasco ou outro item):
//        sem pessoa extra; objeto/quantidade não afirmados.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { pathToFileURL } from 'node:url'

/** object = o objeto do plano (o que a foto deve mostrar); pass: true/false = firme; null = não afirmado; keys = chaves afirmadas. */
export const GABARITO = {
  1: { object: 'box', pass: true, fonte: 'relatório T1' },
  2: { object: 'bottle', pass: true, fonte: 'relatório T1' },
  3: { object: 'box', pass: true, fonte: 'relatório T1' },
  4: { object: 'bottle', pass: true, fonte: 'relatório T1' },
  5: { object: 'box', pass: false, mustFail: ['extra_person'], keys: { extra_person: true }, fonte: 'relatório T1 (homem desfocado na janela)' },
  6: { object: 'bottle', pass: true, fonte: 'relatório T1' },
  7: { object: 'bottle', pass: null, keys: { extra_person: false, both_objects: false }, fonte: 'olho da sessão: uma pessoa, frasco só; cor do líquido em dúvida' },
  8: { object: 'box', pass: true, fonte: 'relatório T1' },
  9: { object: 'box', pass: null, keys: { extra_person: false, both_objects: false }, fonte: 'olho da sessão: caixa de lado, uma pessoa; forma em dúvida' },
  10: { object: 'bottle', pass: true, fonte: 'relatório T1' },
  11: { object: 'bottle', pass: true, keys: { extra_person: false, both_objects: false }, fonte: 'olho da sessão: frasco, um homem, sem caixa' },
  12: { object: 'box', pass: null, keys: { extra_person: false }, fonte: 'olho da sessão: caixa fechada, uma mulher; objeto dourado na cama em dúvida' },
}
export const STILL_DIR = 'C:\\kineo-wt\\prints-1610\\mao3-raw'
export const PRODUTO_LOCAL = 'C:\\kineo-wt\\prints-1610\\atheeri-produto.jpg'
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

export const label = (n) => 'still-' + String(n).padStart(2, '0')
export function dataUrl(file) {
  const mime = MIME[extname(file).toLowerCase()]
  if (!mime) throw new Error('extensão sem tipo: ' + file)
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}
/** O corpo da rota para estas fotos (na ordem do gabarito). Puro com fontes já resolvidas. */
export function corpo(productUrl, fotos) {
  return { product_image_url: productUrl, images: fotos.map(({ n, url }) => ({ url, object: GABARITO[n].object, label: label(n) })) }
}

/** Confere as respostas da rota com o gabarito. Devolve { ok, linhas, faltando }. Puro. */
export function conferir(respostas) {
  const porLabel = new Map()
  for (const r of respostas) for (const x of r?.results ?? []) if (x && x.label) porLabel.set(x.label, x)
  const linhas = []
  let ok = true
  const faltando = []
  for (const [nStr, g] of Object.entries(GABARITO)) {
    const n = Number(nStr)
    const x = porLabel.get(label(n))
    if (!x) { faltando.push(label(n)); continue }
    const erros = []
    if (!x.verdict) erros.push('juiz sem resposta (verdict null)')
    else {
      if (g.pass === true && !x.verdict.ok) erros.push('devia PASSAR; reprovou em ' + x.verdict.fails.join(','))
      if (g.pass === false && x.verdict.ok) erros.push('devia REPROVAR; passou')
      for (const k of g.mustFail ?? []) if (!x.verdict.fails.includes(k)) erros.push('devia reprovar em ' + k)
    }
    for (const [k, v] of Object.entries(g.keys ?? {})) if (x.answers && x.answers[k] !== v) erros.push(`${k}: esperado ${v}, veio ${JSON.stringify(x.answers[k])}`)
    const firme = g.pass !== null
    if (erros.length && firme) ok = false
    linhas.push(`${erros.length ? (firme ? 'ERRO ' : 'aviso') : 'ok   '} ${label(n)} (${g.object}) ${x.verdict ? (x.verdict.ok ? 'passou' : 'reprovou: ' + x.verdict.fails.join(',')) : 'sem veredito'}${erros.length ? ' — ' + erros.join('; ') : ''}`)
  }
  if (faltando.length) ok = false
  return { ok, linhas, faltando }
}

function arg(name, def = null) { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def }

function main() {
  const cmd = process.argv[2]
  if (cmd === 'corpos') {
    const dir = arg('--dir', STILL_DIR)
    const saida = arg('--saida', join(process.cwd(), 'calibra-juiz-mao-corpos'))
    const prod = arg('--produto', PRODUTO_LOCAL)
    const productUrl = /^https:\/\//i.test(prod) ? prod : dataUrl(prod)
    mkdirSync(saida, { recursive: true })
    const urls = arg('--urls')
    if (urls) {
      const lista = JSON.parse(readFileSync(urls, 'utf8'))
      if (!Array.isArray(lista) || lista.length !== 12) throw new Error('--urls: uma lista com 12 URLs, na ordem still-01..12')
      writeFileSync(join(saida, 'corpo-12.json'), JSON.stringify(corpo(productUrl, lista.map((url, i) => ({ n: i + 1, url })))))
      console.log('escrito ' + join(saida, 'corpo-12.json'))
      return
    }
    for (const nStr of Object.keys(GABARITO)) {
      const n = Number(nStr)
      const file = join(dir, label(n) + '.jpg')
      if (!existsSync(file)) { console.log('falta ' + file); continue }
      writeFileSync(join(saida, `corpo-${String(n).padStart(2, '0')}.json`), JSON.stringify(corpo(productUrl, [{ n, url: dataUrl(file) }])))
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
    console.log(r.ok ? '\nCALIBRAÇÃO VERDE — o juiz bate com o gabarito firme.' : '\nCALIBRAÇÃO VERMELHA — NÃO rodar render pago.')
    process.exit(r.ok ? 0 : 1)
  }
  console.log('uso: node scripts/calibra-juiz-mao.mjs corpos|conferir … (ver o cabeçalho)')
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
