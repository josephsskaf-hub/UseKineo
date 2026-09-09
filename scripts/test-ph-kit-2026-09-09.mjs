// KINEO-PH-2026-09-10 — GUARDIÃO DO KIT DO PRODUCT HUNT.
//
// Roda: node scripts/test-ph-kit-2026-09-09.mjs
//
// O QUE ELE IMPEDE, em ordem de dano:
//  1. Peça que não existe. "Está pronto" sem o arquivo no disco é a mentira
//     mais barata de contar num diário; aqui ela fica vermelha.
//  2. Preço no material que a fonte única não reconhece. O kit inteiro é
//     derivado de lib/checkoutPricing.ts e lib/entryPolicy.ts — se o fundador
//     repricar e ninguém rodar `node scripts/ph-galeria.mjs`, este teste acusa
//     o material velho ANTES de ele ir para uma página pública.
//  3. Contagem de motores digitada à mão. `VIDEO_ENGINE_COUNT_WORD` vale
//     'Eight' enquanto S25_PUBLIC=false; a /ph dizia "Nine" em três lugares,
//     dois deles na metadata que o Product Hunt puxa como prévia do link.
//  4. A marca do free tier na página que anuncia que não há free tier.
//  5. Link para uma ficha do Product Hunt que ainda não existe — o mesmo erro
//     que mandou duas reviews pagas para a página de um concorrente homônimo.
//
// Ele lê os valores da FONTE ÚNICA (via scripts/ph-fatos.mjs, que transpila e
// executa os módulos), nunca de literais repetidos aqui. Por isso fica verde
// sozinho no dia de uma mudança de preço legítima e nunca precisa ser editado.
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { fatos } from './ph-fatos.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const PH = join(RAIZ, 'docs', 'ph')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')

let ok = 0
const falhas = []
/** SEMPRE (nome, condicao) — trocar a ordem faz a trava passar sem avaliar. */
const checa = (nome, condicao) => {
  if (condicao === true) ok++
  else if (condicao === false) falhas.push(nome)
  else falhas.push(nome + ' [condicao nao booleana: ' + typeof condicao + ']')
}

const F = fatos()

console.log('== as pecas existem, com o tamanho certo ==')
const PNGS = ['gallery-01.png', 'gallery-02.png', 'gallery-03.png', 'gallery-04.png',
  'gallery-05.png', 'gallery-06.png', 'kineo-ph-thumb.png']
/** Largura e altura de um PNG: bytes 16..23 do chunk IHDR. */
const tamanhoPng = (caminho) => {
  const b = readFileSync(caminho)
  return { l: b.readUInt32BE(16), a: b.readUInt32BE(20) }
}
for (const nome of PNGS) {
  const caminho = join(PH, nome)
  const existe = existsSync(caminho)
  checa(`${nome} existe`, existe)
  if (!existe) continue
  const { l, a } = tamanhoPng(caminho)
  checa(`${nome} tem 1270x760`, l === 1270 && a === 760)
}

const MP4 = join(PH, 'kineo-ph-60s.mp4')
checa('kineo-ph-60s.mp4 existe', existsSync(MP4))
if (existsSync(MP4)) {
  const mb = statSync(MP4).size / 1024 / 1024
  checa(`o MP4 cabe no teto de 50 MB (tem ${mb.toFixed(2)})`, mb <= 50)
  checa('o MP4 nao esta vazio', mb > 0.5)
  // ffprobe está no PATH (o kit inteiro depende dele); se sumir, o teste diz.
  let dur = NaN
  try {
    dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', MP4]).toString().trim())
  } catch { /* fica NaN e reprova abaixo, dizendo por quê */ }
  checa(`o MP4 dura ~60 s (${Number.isFinite(dur) ? dur.toFixed(1) : 'ffprobe falhou'})`,
    Number.isFinite(dur) && dur >= 58 && dur <= 63)
}

const MD_REL = 'docs/ph/PH-TEXTOS-2026-09-10.md'
checa('PH-TEXTOS-2026-09-10.md existe', existsSync(join(RAIZ, MD_REL)))
const md = existsSync(join(RAIZ, MD_REL)) ? rd(MD_REL) : ''

console.log('== o texto nao inventa preco ==')
// A última seção do arquivo é a LISTA DE PROIBIÇÕES e, por definição, contém
// os preços mortos ($7/$15/$19) para mandar não usá-los. Ela fica de fora da
// varredura — e o corte é verificado, senão ele silenciosamente vira o arquivo
// inteiro e a varredura passa a não medir nada.
const MARCA_PROIBICOES = '## O QUE NÃO PODE APARECER'
const corte = md.indexOf(MARCA_PROIBICOES)
checa('o MD tem a secao de proibicoes (o corte da varredura existe)', corte > 0)
const corpo = corte > 0 ? md.slice(0, corte) : md
checa('a varredura cobre a maior parte do texto', corpo.length > md.length * 0.7)

const permitidos = new Set([
  1, // CARD_TRIAL_ENTRY_FEE_MINOR / 100 — a taxa da porta
  ...F.planos.map((p) => p.usd),
])
const achados = [...corpo.matchAll(/\$(\d+(?:[.,]\d{2})?)/g)].map((m) => Number(m[1].replace(',', '.')))
const forasteiros = [...new Set(achados)].filter((v) => !permitidos.has(v))
checa(`todo valor em dolar do texto sai da fonte unica (intrusos: ${forasteiros.join(', ') || 'nenhum'})`,
  forasteiros.length === 0)
checa('o texto encontrou pelo menos um preco (a varredura roda de verdade)', achados.length >= 3)
for (const p of F.planos) {
  checa(`o texto conhece ${p.nome} a $${p.usd}`, corpo.includes('$' + p.usd))
}

console.log('== o texto nao contradiz a casa ==')
// O que vai para o Product Hunt é o conteúdo dos BLOCOS DE CÓDIGO; a prosa em
// volta é instrução para o fundador e cita de propósito o que NÃO usar (o slug
// do concorrente homônimo, a proibição de pedir voto). Varrer a prosa junto é
// o erro conhecido de "regex solto casa com o próprio comentário": o guardião
// reprovaria o aviso que existe justamente para evitar o erro.
const colavel = [...md.matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n')
checa('achei os blocos colaveis (a varredura abaixo roda)', colavel.length > 2000)
checa('o texto diz a contagem de motores certa',
  colavel.toLowerCase().includes(F.motores.length === 8 ? 'eight engines' : `${F.motores.length} engines`))
checa('o colavel NAO promete nove motores', !/nine (video )?engines/i.test(colavel))
checa('o texto carrega a frase do sem-free-tier', md.includes(F.copy.noFreeTier) || /no free tier/i.test(colavel))
for (const m of F.motores) {
  // tolera quebra de linha entre o nome e o número (a lista quebra em duas)
  checa(`o texto cita ${m.nome} com ${m.cr60} creditos`,
    new RegExp(m.nome.replace('.', '\\.') + '[^\\d]{0,40}\\b' + m.cr60 + '\\b').test(colavel))
}
checa('o link do lancamento aponta para a /ph com a campanha do dia',
  md.includes('usekineo.com/ph?ref=producthunt&utm_source=producthunt'))
checa('o colavel NAO manda pedir upvote', !/upvote/i.test(colavel))
checa('o colavel NAO usa o slug do concorrente homonimo',
  !/producthunt\.com\/products\/kineo(?!-ai)/.test(colavel))
checa('a prosa AVISA sobre o slug do concorrente homonimo',
  /producthunt\.com\/products\/kineo(?!-ai)/.test(md))

console.log('== a /ph nao digita o que pode derivar ==')
const ph = rd('app/ph/page.tsx')
checa('a /ph importa VIDEO_ENGINE_COUNT_WORD', ph.includes("from '@/lib/engineLaunch'") && ph.includes('VIDEO_ENGINE_COUNT_WORD'))
checa('a /ph NAO digita a contagem de motores', !/\bnine (video )?engines\b/i.test(ph))
checa('a /ph segue noindex', /robots:\s*\{\s*index:\s*false/.test(ph))
checa('a /ph usa o CTA do CARD_ENTRY_COPY', ph.includes('CARD_ENTRY_COPY.ctaLong'))
checa('a /ph usa a frase do sem-free-tier', ph.includes('CARD_ENTRY_COPY.noFreeTier'))
// A ficha do Product Hunt não existe antes de quinta. O selo só pode aparecer
// atrás de uma constante que alguém preencheu de propósito.
checa('o selo do PH so renderiza atras de PH_LISTING_URL', /const PH_LISTING_URL/.test(ph) && /PH_LISTING_URL \? \(/.test(ph))
checa('a /ph NAO tem URL crua de ficha do Product Hunt no JSX',
  !/href="https:\/\/www\.producthunt\.com/.test(ph))

console.log('== a marca do free tier nao sobrevive em peca nova ==')
checa('a grade da /ph usa o poster cortado', ph.includes('/posters/ph/${v.id}.webp') || ph.includes('`/posters/ph/'))
const ids = (() => {
  const s = rd('lib/publicExamples.ts')
  const i = s.indexOf('export const FOUNDER_SHOWCASE')
  const bloco = s.slice(i, s.indexOf('] as const', i))
  return [...bloco.matchAll(/id: '([0-9a-f-]{36})'/g)].map((m) => m[1]).slice(0, 12)
})()
checa('achei os 12 ids da grade (o laco abaixo roda)', ids.length === 12)
for (const id of ids) {
  checa(`poster cortado existe: ${id.slice(0, 8)}`, existsSync(join(RAIZ, 'public', 'posters', 'ph', `${id}.webp`)))
}
checa('os geradores do kit estao versionados',
  ['scripts/ph-fatos.mjs', 'scripts/ph-galeria.mjs', 'scripts/ph-video.mjs', 'scripts/ph-quadros.sh',
    'scripts/ph-posters.sh'].every((p) => existsSync(join(RAIZ, p))))

console.log('== a porta que o kit anuncia precisa abrir ==')
// O kit inteiro (galeria, video, textos, /ph) tem UM botao: a porta de $1.
// Enquanto ela devolver erro, "kit completo" e a mentira mais cara da semana —
// o dia do Product Hunt manda centenas de pessoas para uma parede.
//
// A saude da porta NAO e redigitada aqui: quem define isso e o guardiao
// test-taxa-de-entrada-chega-na-stripe, e este teste apenas HERDA o veredito
// dele. Copiar o predicado criaria uma segunda regra que envelhece sozinha.
const PORTA = 'scripts/test-taxa-de-entrada-chega-na-stripe-2026-09-09.mjs'
checa('o guardiao da porta de $1 existe', existsSync(join(RAIZ, PORTA)))
const portaAbre = (() => {
  try {
    execFileSync(process.execPath, [join(RAIZ, PORTA)], { cwd: RAIZ, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
})()
checa('a porta de $1 que o kit anuncia e aceita pela Stripe (detalhe: node ' + PORTA + ')', portaAbre)

console.log('')
console.log(`  verificacoes: ${ok} · falhas: ${falhas.length}`)
if (falhas.length) {
  for (const f of falhas) console.log('  FALHOU: ' + f)
  process.exit(1)
}
console.log('OK — kit do Product Hunt completo, com os precos e a contagem de motores da fonte unica, e a porta de $1 abrindo')
