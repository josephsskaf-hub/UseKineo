// Guardião do KINEO-SAIDA-BARATA-2026-09-06 (sprint-assinaturas #16).
//
// O DEFEITO QUE ELE EXISTE PARA IMPEDIR (medido em produção, checkpoint da
// #15): a pessoa `940aa17d` viu a caixa da próxima ação DENTRO do modal de
// upgrade com saldo 7, faltando 8, e o servidor tinha gravado no próprio
// `next_action_served` que existia motor que aquele saldo pagava
// (`affordable: 1`, `engine_offered: "fast"`). Mesmo assim a caixa saiu só
// com "See plans": a oferta barata estava soldada ao link de série
// (`hrefContinuar`), que não existe quando o último filme não tem tema
// aproveitável. Na superfície mais perto do dinheiro, a alternativa gratuita
// sumiu e a resposta virou pedágio.
//
// E o defeito IRMÃO, que tornava a alternativa inútil mesmo quando aparecia:
// o `?engine=` saía no vocabulário do COBRADOR (`cinematic_ai`) e quem o lê
// na tela só aceita o vocabulário do DEEPLINK (`seedance`). Fora do `fast`,
// o desvio de motor era descartado em silêncio.
//
// COMO ELE PROVA (memória `guardiao-contar-texto-nao-prova-condicao`): as
// seções 3 e 4 não contam texto — elas EXTRAEM as expressões reais do arquivo
// publicado e as EXECUTAM com cenários. Um mutante que troque a condição por
// `true`, que devolva o requisito de `hrefContinuar`, ou que quebre o
// vocabulário do motor muda o RESULTADO EXECUTADO e reprova.
//
// Estilo readFileSync de propósito: guardião com import `@/` morre no import
// antes da 1ª verificação (memória `guardioes-com-alias-nao-rodam`).
// Toda leitura normaliza CRLF (memória `guardiao-crlf-falso-vermelho`).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const raiz = process.cwd()
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

let ok = 0
let falhas = 0
function checa(nome, condicao) {
  if (condicao) { ok++; return }
  falhas++
  console.error(`  x ${nome}`)
}

const ROTA = 'app/api/next-action/route.ts'
const TELA = 'app/(dashboard)/generate/GenerateClient.tsx'
const CARTAO = 'components/NextActionCard.tsx'
const rota = ler(ROTA)
const tela = ler(TELA)
const cartao = ler(CARTAO)

// -- 1. A VARIAVEL QUE DECIDE existe e nao depende mais do link de serie ----
checa('1.1 a rota calcula uma alternativa propria (hrefAlternativa)',
  /const hrefAlternativa =/.test(rota))
checa('1.2 a alternativa depende do MOTOR acessivel, nao do tema',
  /const hrefAlternativa = motorAcessivel \? \(hrefContinuar \?\? hrefBarato\) : null/.test(rota))
checa('1.3 o secundario passou a ler hrefAlternativa',
  /state === 'dry' && hrefAlternativa && motorAcessivel/.test(rota))
checa('1.4 o secundario NAO exige mais hrefContinuar',
  !/state === 'dry' && hrefContinuar && motorAcessivel/.test(rota))
checa('1.5 existe o link de compositor para quem nao tem tema (hrefBarato)',
  /const hrefBarato = deeplinkAcessivel/.test(rota))
checa('1.6 o link barato aponta para o compositor de sempre',
  /const DEEPLINK_PADRAO_COMPOSITOR = '\/studio\/create'/.test(rota)
  && /\$\{DEEPLINK_PADRAO_COMPOSITOR\}\?engine=/.test(rota))
checa('1.7 o link barato carrega o motor acessivel, escapado',
  /encodeURIComponent\(deeplinkAcessivel\)/.test(rota))
checa('1.8 o caminho novo tem src proprio, para o banco separar as duas pernas',
  /src=next_action_dry_cheap/.test(rota))

// -- 2. REGRA K1: a porta do plano NUNCA e bloqueada -----------------------
// O ciclo inteiro e sobre assinaturas; nada aqui pode fechar a porta de pagar.
checa('2.1 o primario do estado seco continua sendo a porta do plano',
  /state === 'dry'\s*\n\s*\? \{\s*\n\s*kind: 'see_plans' as const/.test(rota))
checa('2.2 a porta do plano do estado seco continua com href de pricing',
  /href: '\/pricing\?src=next_action_dry'/.test(rota))
checa('2.3 fora do estado seco o secundario continua sendo a porta do plano',
  /href: '\/pricing\?src=next_action_side'/.test(rota))

// -- 3. O VOCABULARIO DO MOTOR, provado CONTRA A TELA que o le -------------
// Esta secao e a unica prova possivel de que os dois lados falam a mesma
// lingua: o conjunto aceito e lido do arquivo REAL da tela, nao digitado aqui.
const mMotores = rota.match(/const MOTORES: ReadonlyArray<[^>]*> = \[([\s\S]*?)\n\]/)
checa('3.1 a lista de motores foi encontrada', !!mMotores)
const motores = []
if (mMotores) {
  const re = /\{ quality: '([^']+)', label: '([^']+)', deeplink: '([^']+)' \}/g
  let m
  while ((m = re.exec(mMotores[1])) !== null) motores.push({ quality: m[1], label: m[2], deeplink: m[3] })
}
checa('3.2 todo motor da lista tem deeplink', motores.length === 7)

// O conjunto que a TELA aceita, lido do proprio GenerateClient.
const mFast = /if \(engine === 'fast'\)/.test(tela)
const mLista = tela.match(/if \(\[([^\]]*)\]\.includes\(engine\)\)/)
checa('3.3 a tela ainda aceita o deeplink de motor', mFast && !!mLista)
const aceitos = new Set(mFast ? ['fast'] : [])
if (mLista) for (const t of mLista[1].split(',')) {
  const v = t.trim().replace(/^'|'$/g, '')
  if (v) aceitos.add(v)
}
for (const m of motores) {
  checa(`3.4 a tela aceita o deeplink de ${m.label} ('${m.deeplink}')`, aceitos.has(m.deeplink))
}
// O defeito original, nomeado: nenhum deeplink pode ser o nome do cobrador.
for (const m of motores) {
  checa(`3.5 ${m.label} NAO manda o nome do cobrador ('${m.quality}') para a tela`,
    m.quality === 'fast' || m.deeplink !== m.quality)
}

// A funcao de traducao, EXECUTADA (nao lida): extraida do arquivo publicado.
const mFn = rota.match(/function deeplinkDoMotor\(quality: Quality \| null\): string \| null \{([\s\S]*?)\n\}/)
checa('3.6 a funcao de traducao foi encontrada', !!mFn)
if (mFn) {
  const corpo = mFn[1].replace(/: Quality \| null/g, '').replace(/ as [A-Za-z]+/g, '')
  const traduz = new Function('MOTORES', 'quality', corpo)
  checa('3.7 EXECUTADA: cinematic_ai vira seedance', traduz(motores, 'cinematic_ai') === 'seedance')
  checa('3.8 EXECUTADA: fast continua fast', traduz(motores, 'fast') === 'fast')
  checa('3.9 EXECUTADA: cinematic_hollywood vira hollywood', traduz(motores, 'cinematic_hollywood') === 'hollywood')
  checa('3.10 EXECUTADA: motor desconhecido devolve null (link sai sem ?engine=)',
    traduz(motores, 'cinematic_s25') === null)
  checa('3.11 EXECUTADA: sem motor devolve null', traduz(motores, null) === null)
}

// -- 4. A DECISAO, EXECUTADA com cenarios ----------------------------------
// Extrai as DUAS expressoes reais do arquivo e as roda. E o que separa este
// guardiao de um contador de texto: mutante que mexa na condicao reprova aqui.
const mAlt = rota.match(/const hrefAlternativa = (.*)\n/)
const mCond = rota.match(/state === 'dry' && (hrefAlternativa && motorAcessivel)\n/)
checa('4.1 a expressao da alternativa foi extraida', !!mAlt)
checa('4.2 a condicao do secundario foi extraida', !!mCond)
if (mAlt && mCond) {
  // Recria a decisao com as expressoes REAIS do arquivo publicado.
  const decide = new Function('state', 'motorAcessivel', 'hrefContinuar', 'hrefBarato', `
    const hrefAlternativa = ${mAlt[1]}
    const oferece = state === 'dry' && ${mCond[1]}
    return { oferece: !!oferece, href: oferece ? hrefAlternativa : null }
  `)
  const SERIE = '/studio/create?prompt=x&engine=fast'
  const BARATO = '/studio/create?engine=fast&src=next_action_dry_cheap'

  const comTema = decide('dry', 'fast', SERIE, BARATO)
  checa('4.3 EXECUTADA: seco COM tema continua oferecendo a serie (comportamento antigo intacto)',
    comTema.oferece === true && comTema.href === SERIE)

  // ESTE E O CONSERTO. E o caso da pessoa 940aa17d.
  const semTema = decide('dry', 'fast', null, BARATO)
  checa('4.4 EXECUTADA: seco SEM tema passa a oferecer o compositor (era null antes)',
    semTema.oferece === true && semTema.href === BARATO)

  const semMotor = decide('dry', null, null, null)
  checa('4.5 EXECUTADA: seco sem motor acessivel nao inventa saida',
    semMotor.oferece === false && semMotor.href === null)

  // Sem motor a alternativa some MESMO tendo tema -- a condicao e o motor.
  const semMotorComTema = decide('dry', null, SERIE, null)
  checa('4.6 EXECUTADA: sem motor acessivel a alternativa nao sai nem com tema',
    semMotorComTema.oferece === false)

  const naoSeco = decide('can_continue', 'fast', SERIE, BARATO)
  checa('4.7 EXECUTADA: fora do estado seco o secundario nao e a saida barata',
    naoSeco.oferece === false)

  // -- O MUTANTE que este guardiao existe para matar ---------------------
  // Se alguem devolver o requisito de `hrefContinuar`, o caso 4.4 (a pessoa
  // sem tema) volta a ficar sem saida barata. Provado, nao afirmado.
  const mutante = new Function('state', 'motorAcessivel', 'hrefContinuar', 'hrefBarato', `
    const hrefAlternativa = motorAcessivel ? hrefContinuar : null
    const oferece = state === 'dry' && hrefContinuar && motorAcessivel
    return { oferece: !!oferece, href: oferece ? hrefAlternativa : null }
  `)
  checa('4.8 MUTANTE (volta a exigir o link de serie) seria REPROVADO pelo caso 4.4',
    mutante('dry', 'fast', null, BARATO).oferece === false)
  checa('4.9 e o mutante passaria no caso 4.3 -- por isso 4.4 e a verificacao que importa',
    mutante('dry', 'fast', SERIE, BARATO).oferece === true)
}

// -- 5. O DENOMINADOR: da para provar que a perna nova pegou ---------------
checa('5.1 o evento da rota diz por qual perna a alternativa saiu',
  /alternative_route:/.test(rota))
checa('5.2 a perna nova tem nome proprio no evento', /'composer'/.test(rota))
checa('5.3 a perna antiga continua distinguivel', /hrefContinuar \? 'series'/.test(rota))
checa('5.4 caixa sem saida barata e registrada como tal', /!motorAcessivel \? 'none'/.test(rota))
checa('5.5 o evento mostra o parametro que a tela recebe de fato',
  /engine_deeplink: deeplinkAcessivel/.test(rota))
// A impressao REAL continua sendo o denominador honesto (checkpoint da #15:
// `next_action_served` e trafego da rota, `next_action_card_shown` e a caixa).
checa('5.6 o cartao continua medindo a alternativa pelo kind que a rota devolve',
  /has_alternative: dados\?\.secondary\?\.kind === 'continue_cheaper'/.test(cartao))
checa('5.7 o cartao continua so aparecendo para quem bateu na parede',
  /const visivel = seco \|\| perdida/.test(cartao))

// -- 6. NADA DE PRECO, PLANO OU PROMESSA NOVA (limite do ciclo) ------------
checa('6.1 o custo da alternativa continua vindo da fonte unica do cobrador',
  /creditCostForDuration\(/.test(rota))

console.log(`\n${ok} ok - ${falhas} falhas`)
process.exit(falhas > 0 ? 1 : 0)
