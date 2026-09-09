// GUARDIÃO — A ORDEM DA DOBRA DA /ph (sprint do tráfego frio, r4, 09/09/2026)
//
// POR QUE ELE EXISTE. Medido no bundle `ph_sep10_v3`, entre 13:15 e 15:37 BRT,
// 34 pessoas do Reddit (97% em celular) caíram na /ph: 23 delas (68%) NUNCA
// passaram de `depth: 25`, e ZERO clicaram o CTA — com o instrumento de clique
// provado vivo às 17:07 por sonda (`ph_cta_clicked`, position top, depth 18).
// A causa mais barata de mexer estava na ORDEM: em 375px o documento punha
// 175px de prosa densa (7 linhas, cinco motores nomeados) entre a manchete e o
// pedido de cartão, e só mostrava o FILME em 545px — a prova do produto vinha
// depois do preço.
//
// A ordem que este guardião trava: manchete → FILME → porta de $1 → letra
// miúda → prosa dos motores. Quem inverter de novo derruba estas verificações.
//
// Estilo readFileSync de propósito: guardião que importa de `@/` morre no
// import antes da primeira verificação e passa meses lido como verde.
import { readFileSync } from 'node:fs'

const PAGINA = readFileSync(new URL('../app/ph/page.tsx', import.meta.url), 'utf8')
const BEACON = readFileSync(new URL('../components/PhLandingBeacon.tsx', import.meta.url), 'utf8')

let falhas = 0
let total = 0
function check(nome, condicao) {
  total += 1
  if (!condicao) { falhas += 1; console.error('  ✗ ' + nome) }
}

// ── Âncoras. Cada uma tem de ser ÚNICA no arquivo, senão indexOf compara
// posições de coisas diferentes e o guardião vira ruído.
const ancoras = {
  h1: '<h1 style={{ fontSize: \'clamp(2rem, 4.6vw, 3.4rem)\'',
  grade: '<section style={{ marginTop: 22, display: \'grid\'',
  filme: 'data-testid="ph-hero-film"',
  copia: 'data-testid="ph-hero-copy"',
  video: '<video src={ROBOT}',
  cta: 'data-testid="ph-cta-trial"\n',
  prosa: 'Kineo writes the script, directs every shot',
  vitrine: 'Made with Kineo — real renders',
}
const pos = {}
for (const [nome, texto] of Object.entries(ancoras)) {
  const alvo = texto.replace(/\r\n/g, '\n')
  const corpo = PAGINA.replace(/\r\n/g, '\n')
  const n = corpo.split(alvo).length - 1
  check(`âncora "${nome}" aparece exatamente uma vez (achou ${n})`, n === 1)
  pos[nome] = corpo.indexOf(alvo)
}

// ── A ORDEM, que é a mudança inteira.
check('a manchete vem ANTES da grade (fora dela, para poder intercalar no celular)', pos.h1 >= 0 && pos.grade >= 0 && pos.h1 < pos.grade)
check('o FILME vem antes da coluna de texto dentro da grade', pos.filme >= 0 && pos.copia >= 0 && pos.filme < pos.copia)
check('o <video> mora dentro do bloco do filme', pos.video > pos.filme && pos.video < pos.copia)
check('o FILME vem antes da porta de $1 — a prova antes do preço', pos.filme < pos.cta)
check('a porta de $1 vem ANTES da prosa dos motores', pos.cta < pos.prosa)
check('a prosa continua na página (a mudança é de ordem, não amputação)', pos.prosa > 0)
check('a prosa fica acima da vitrine (não foi empurrada para o rodapé)', pos.prosa < pos.vitrine)

// ── O elo com o instrumento de clique. Se o testid do CTA mudar, o listener do
// beacon (`a[data-testid^="ph-cta-trial"]`) para de casar e a r5 mede zero
// clique achando que é a oferta — foi exatamente o erro que esta rotação teve
// de falsificar à mão antes de poder confiar no número.
check('o CTA de cima mantém o testid que o beacon procura', /data-testid="ph-cta-trial"/.test(PAGINA))
check('o CTA de baixo mantém o prefixo que o beacon procura', /data-testid="ph-cta-trial-bottom"/.test(PAGINA))
check('o beacon procura os dois pelo prefixo', BEACON.includes('a[data-testid^="ph-cta-trial"]'))

// ── O carimbo do bundle. Sem ele a r5 não separa a dobra nova da velha e volta
// a cortar por relógio, que inventa defeito quando dois deploys entram na hora.
const versao = (BEACON.match(/const VERSAO = '([^']+)'/) ?? [])[1]
check('o beacon declara uma VERSAO literal', Boolean(versao))
check('a VERSAO subiu para ph_sep10_v4 ou mais nova', Boolean(versao) && !['ph_sep10_v1', 'ph_sep10_v2', 'ph_sep10_v3'].includes(versao))

// ── Preço continua vindo da fonte única NO HERÓI, que é o bloco desta rotação.
// O escopo é o herói de propósito: a FAQ mais abaixo digita o preço à mão e
// `test-ph-landing-2026-09-08` EXIGE esse literal ("FAQ diz que não há free
// tier e que o $1 é real"). Uma varredura de arquivo inteiro derrubava a trava
// do vizinho — tentei, ficou vermelho, e a trava dele está certa: quem lê a
// pergunta "is the $1 real?" tem de ver o $1. Guardião novo não afrouxa
// vizinho; ele se limita ao que de fato governa.
const corpo = PAGINA.replace(/\r\n/g, '\n')
const heroi = corpo.slice(pos.h1, pos.vitrine)
const heroiSemComentarios = heroi.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
check('o recorte do herói não é vazio', heroi.length > 400)
check('nenhum preço digitado à mão no herói (só CARD_ENTRY_COPY / TIER_PRICES)', !/\$\s?\d/.test(heroiSemComentarios))
check('a porta usa o texto da fonte única', PAGINA.includes('{CARD_ENTRY_COPY.ctaLong}'))
check('a linha "sem plano grátis" usa a fonte única', PAGINA.includes('{CARD_ENTRY_COPY.noFreeTier}'))

if (falhas > 0) {
  console.error(`\n✗ test-ph-dobra: ${falhas} de ${total} verificações falharam`)
  process.exit(1)
}
console.log(`✓ test-ph-dobra: ${total} verificações verdes`)
