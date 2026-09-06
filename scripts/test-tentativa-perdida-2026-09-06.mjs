// sprint-assinaturas #7 (06/09) — o estado `attempt_lost`: quem apertou gerar
// e NUNCA recebeu filme.
//
// O NUMERO: 7 dias, contas externas, e-mails descartaveis fora — 29 pessoas
// despacharam um render e nao receberam filme nenhum. VINTE vieram do
// `chatgpt`. DEZOITO ainda tem os 25 creditos do trial intactos. E ate este
// commit o contrato respondia a elas `first_film` -> "Make your first film",
// mandando comecar algo que elas ja tinham comecado (algumas quatro vezes).
//
// O QUE ESTE GUARDIAO EXISTE PARA IMPEDIR, em uma frase: que o estado novo
// nasca sem PROVA (fail-open), que ele minta sobre a culpa ou sobre o filme, e
// que a porta do plano suma de algum estado (regra K1 do ciclo).
//
// Le os ARQUIVOS REAIS — rota, componente e o call site. Provar o caller e o
// ponto: contrato de servidor sem chamador serve zero, e essa licao ja custou
// um ciclo inteiro nesta casa.
//
// ⚠ CRLF: o checkout do Windows entrega \r\n; toda leitura normaliza antes de
// casar.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const rota = ler('app/api/next-action/route.ts')
const card = ler('components/NextActionCard.tsx')
const tela = ler('app/(dashboard)/generate/GenerateClient.tsx')

/** Codigo sem comentario nenhum. Um guardiao que le comentario reprova a
 *  explicacao em vez do comportamento — e este arquivo tem muito comentario. */
const semComentarios = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '').replace(/\/\/[^\n]*/g, '')
const rotaCodigo = semComentarios(rota)
const cardCodigo = semComentarios(card)
const telaCodigo = semComentarios(tela)

let ok = 0
const falhas = []
const check = (nome, cond) => { if (cond) ok += 1; else falhas.push(nome) }

// ── (a) O ESTADO SO NASCE COM PROVA ────────────────────────────────────────
check('o estado existe no tipo', /'first_film' \| 'attempt_lost' \| 'dry' \| 'can_continue'/.test(rotaCodigo))
// So quem NAO tem filme entregue pode cair aqui. Quem ja recebeu um filme
// nunca muda de estado por causa deste commit — e o que mantem o blast radius
// no tamanho da coorte medida.
check('so quem esta em first_film e testado', /if \(state === 'first_film'\) \{/.test(rotaCodigo))
check('a promocao para attempt_lost exige uma tentativa lida',
  /const tentativa = await ultimaTentativaDeDespacho\(user\.id\)/.test(rotaCodigo)
  && /if \(tentativa\) \{/.test(rotaCodigo))
check('a promocao exige a janela de decantacao',
  /if \(minutos >= MINUTOS_ATE_PERDIDA\) \{\n\s*state = 'attempt_lost'/.test(rotaCodigo))
check('a janela e de 45 minutos', /const MINUTOS_ATE_PERDIDA = 45/.test(rotaCodigo))
// Renders normais fecham em 3-6 min e a varredura de encalhe resolve dentro da
// hora. Uma janela curta transformaria "ainda renderizando" em "nao saiu".
check('a janela nao e curta demais para um render', /MINUTOS_ATE_PERDIDA = (4[5-9]|[5-9]\d|\d{3,})/.test(rotaCodigo))

// ── (b) FAIL-CLOSED: SEM PROVA, NADA MUDA ──────────────────────────────────
// Cada caminho de ignorancia tem de devolver null, e null tem de significar
// "nao promove". O lado perigoso aqui e o oposto do de sempre: aqui o silencio
// e o seguro, porque dizer "seu filme nao saiu" para quem esta renderizando
// inventa um defeito.
const helper = rotaCodigo.slice(
  rotaCodigo.indexOf('async function ultimaTentativaDeDespacho'),
  rotaCodigo.indexOf('/** Nomes P') > 0 ? rotaCodigo.indexOf('const MOTORES') : rotaCodigo.length,
)
check('sem chave de servico devolve null', /if \(!url \|\| !key\) return null/.test(helper))
check('erro de consulta devolve null', /if \(error\) return null/.test(helper))
check('sem linha devolve null', /if \(!bruto\) return null/.test(helper))
check('data invalida devolve null', /Number\.isFinite\(quando\.getTime\(\)\) \? quando : null/.test(helper))
check('excecao devolve null', /\} catch \{\n\s*return null\n\s*\}/.test(helper))
// Minuto negativo = relogio do banco a frente do nosso (o JWT-skew de 28/08
// provou que acontece). `>=` faz negativo cair fora sozinho.
check('relogio adiantado nao promove', !/Math\.abs\(/.test(helper) && />= MINUTOS_ATE_PERDIDA/.test(rotaCodigo))

// ── (c) A LEITURA E DE SERVICO, PORQUE `events` E SERVICE-ROLE-ONLY ────────
// Com o cliente do usuario a consulta voltaria VAZIA — e vazio aqui significa
// "nunca tentou", exatamente a mentira que este commit corrige.
check('a tentativa e lida com o cliente de servico', /createServiceClient\(url, key/.test(helper))
check('le a tabela de eventos', /\.from\('events'\)/.test(helper))
check('le os tres eventos de despacho',
  /'video_generation_started',\n\s*'generation_dispatch_received',\n\s*'activation_autostart_dispatched',/.test(rotaCodigo))
check('pega a tentativa mais recente', /\.order\('created_at', \{ ascending: false \}\)/.test(helper) && /\.limit\(1\)/.test(helper))
check('a consulta e filtrada pela pessoa', /\.eq\('user_id', userId\)/.test(helper))

// ── (d) A PORTA DO PLANO EXISTE NO ESTADO NOVO (REGRA K1) ──────────────────
// No estado novo o `primary` e retomar, entao a porta do plano viaja no
// `secondary` — e o ramo que a produz e o de `state !== 'dry'`, que ja existia.
check('o primario do estado novo e retomar', /kind: 'retry_first_film' as const/.test(rotaCodigo))
check('o secundario de plano cobre todo estado que nao e seco',
  /: state !== 'dry'\n\s*\? \{\n\s*kind: 'see_plans' as const/.test(rotaCodigo))
check('a tela procura a porta do plano nos DOIS lugares',
  /dados\.primary\?\.kind === 'see_plans'\n\s*\? dados\.primary\n\s*: dados\.secondary\?\.kind === 'see_plans'/.test(cardCodigo))

// ── (e) A COPY NAO MENTE ───────────────────────────────────────────────────
// A licao do #5 de 02/09: 7 de 11 dessas falhas sao o produto RECUSANDO com
// razao. Desculpa falsa ("foi um bug nosso, ja consertamos") e mentira dupla —
// e quem clica falha de novo e aprende que a marca mente.
// Janela por INDICE, nao por regex preguicosa: o `}` de `${balance}` fecharia
// o casamento antes da frase e o guardiao aprovaria sem ler a copy inteira.
const iRetry = rota.indexOf(`kind: 'retry_first_film'`)
const copyDoEstado = iRetry >= 0 ? rota.slice(iRetry, iRetry + 600) : ''
check('nao pede desculpa', !/sorry|apolog|our fault|our side|we broke/i.test(copyDoEstado))
check('nao diz que foi consertado', !/fixed|resolved|working now|try again now it/i.test(copyDoEstado))
check('nao promete conteudo de plano', !/unlimited|forever|priority|premium|every engine/i.test(copyDoEstado))
check('nao inventa o nome do filme', !/topic|title|lastFilm/i.test(copyDoEstado))
// Os dois unicos fatos verdadeiros para TODA a coorte.
check('diz que a tentativa nao terminou', /never finished/i.test(copyDoEstado))
check('diz que o saldo continua la, com o numero do servidor', /\$\{balance\} credits are still here/.test(copyDoEstado))

// ── (f) NAO TOCA EM DINHEIRO, OFERTA NEM PRECO ─────────────────────────────
const diffAlvo = rotaCodigo.slice(rotaCodigo.indexOf('MINUTOS_ATE_PERDIDA'))
check('nao concede credito', !/update\(\{[^}]*video_credits/.test(rotaCodigo))
check('nao escreve na tabela de perfis', !/from\('profiles'\)[\s\S]{0,80}\.(update|insert|upsert)/.test(rotaCodigo))
check('nao envia e-mail', !/resend|sendEmail|@react-email/i.test(rotaCodigo))
check('nao redigita preco de plano', !/9\.90|19\.90|39\.90|\$299|\$99/.test(rotaCodigo))
check('o unico POST continua sendo evento', !/method:\s*'POST'/.test(rotaCodigo))

// ── (g) A MEDICAO EXISTE, SEPARADA POR ESTADO ──────────────────────────────
// Sem isto as duas coortes viram um numero so e o degrau fica impossivel de
// medir — foi o erro que este ciclo ja pagou uma vez.
check('o evento do servidor carrega a idade da tentativa', /last_attempt_minutes: tentativaMinutos/.test(rotaCodigo))
check('a resposta expoe a idade da tentativa', /lastAttemptMinutes: tentativaMinutos/.test(rotaCodigo))
check('a impressao da tela carrega o estado', /state: estado,/.test(cardCodigo))
check('o clique tem nome proprio', /clicar\('retry_first_film', retomar\.href\)/.test(cardCodigo))
check('o link do retomar e rastreavel na origem', /src=next_action_lost/.test(rotaCodigo))

// ── (h) O CHAMADOR EXISTE, E E O QUE A COORTE ALCANCA ──────────────────────
// Quem tem ZERO filmes nao passa pela tela de filme pronto (`phase === 'done'`)
// nem pelo modal de saldo (ela TEM saldo). Sem esta terceira montagem, o
// estado novo serviria zero pessoas — que e exatamente a armadilha que o
// ciclo de 05/09 caiu.
const montagens = telaCodigo.match(/<NextActionCard[^>]*\/>/g) || []
check('a tela monta o cartao tres vezes', montagens.length === 3)
check('a terceira montagem e o composer', /surface="generate_step_1"/.test(telaCodigo))
check('a montagem do composer e presa a fase ociosa',
  /\{phase === 'idle' && <NextActionCard surface="generate_step_1" \/>\}/.test(telaCodigo))
check('a montagem e UMA linha, sem redesenho', !/NextActionCard[\s\S]{0,40}<div|<section[^>]*>\s*<NextActionCard/.test(telaCodigo))

// ── (i) NADA BLOQUEIA QUEM QUER COMPRAR ────────────────────────────────────
check('o cartao nao e overlay', !/position:\s*'fixed'|z-?[Ii]ndex/.test(cardCodigo))
check('o cartao nao intercepta clique da tela', !/preventDefault|stopPropagation/.test(cardCodigo))
check('o cartao nao fecha nem esconde o que ja existia', !/setShowUpgradeModal|onClose\(|display:\s*'none'/.test(cardCodigo))

const total = ok + falhas.length
console.log(`\ntentativa-perdida: ${ok}/${total} verificacoes`)
if (falhas.length) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log('  x ' + f)
  process.exit(1)
}
console.log('OK tudo verde')
