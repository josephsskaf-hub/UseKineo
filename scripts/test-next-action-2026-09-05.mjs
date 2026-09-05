// sprint-assinaturas #7 (05/09) — verificacoes do contrato /api/next-action.
//
// O que este guardiao existe para impedir, em uma frase: que o contrato passe
// a ANUNCIAR um preco que a cobranca nao pratica. Ele le os ARQUIVOS REAIS de
// producao (rota + fonte unica de custo + seriesContinuation) — o objetivo e
// provar o caller, nunca uma copia.
//
// ⚠ CRLF: o checkout do Windows entrega \r\n e regex de duas linhas quebra com
// o codigo byte a byte correto (licao da correcao da #3 deste mesmo sprint).
// Toda leitura normaliza antes de casar.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const src = ler('app/api/next-action/route.ts')
const serie = ler('lib/seriesContinuation.ts')
const custo = ler('lib/credits/engineCost.ts')
const cobrador = ler('app/api/generate-video-cinematic/route.ts')

/** Codigo sem comentario NENHUM (bloco e linha). Um guardiao que le comentario
 *  reprova a explicacao em vez do comportamento — foi o que aconteceu na
 *  primeira execucao deste arquivo, com a linha que diz por que o Seedance 2.5
 *  fica de fora. */
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
const srcCodigo = semComentarios(src)

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond) ok += 1
  else falhas.push(nome)
}

// ── 1. REGRA 1: o preco nunca e inventado ──────────────────────────────────
check('custo do proximo vem de credits_used pago', /ultimoCusto\s*=\s*\n?\s*ultimo && typeof ultimo\.credits_used === 'number'/.test(src))
check('alternativas usam a fonte unica do cobrador', src.includes('creditCostForDuration(m.quality, isPaidUser, segundos)'))
check('creditCostForDuration existe na fonte unica', /export function creditCostForDuration/.test(custo))
check('nenhuma tabela de custo local na rota', !/cost:\s*\d+/.test(src.replace(/cost: acessiveis\[0\]\.cost/g, '')))
check('MOTORES so tem quality+label (sem preco)', !/\{\s*quality: '[a-z_]+', label: '[^']+', cost/.test(src))

// ── 2. o predicado de conta paga e ESPELHO do cobrador ─────────────────────
// Se divergirem, o contrato anuncia um preco de outra tabela — o defeito que
// a regra 1 existe para impedir.
const planosDaRota = (src.match(/const PAID_PLANS = new Set\(\[([\s\S]*?)\]\)/) || [])[1] || ''
const planosDoCobrador = (cobrador.match(/const PAID_PLANS = new Set\(\[([\s\S]*?)\]\)/) || [])[1] || ''
const normaliza = (s) => s.split(/[,\s]+/).map((x) => x.replace(/['"]/g, '').trim()).filter(Boolean).sort().join(',')
check('PAID_PLANS da rota nao esta vazio', normaliza(planosDaRota).length > 0)
check('PAID_PLANS identico ao do cobrador', normaliza(planosDaRota) === normaliza(planosDoCobrador))
check('isPaidUser usa has_paid OU plano pago', /has_paid === true \|\| PAID_PLANS\.has\(planVal\)/.test(src))

// ── 3. REGRA K1: a porta do plano nao depende de filme nem de roteiro ──────
check('porta do plano no estado seco', /kind: 'see_plans'[\s\S]{0,120}\/pricing\?src=next_action_dry/.test(src))
check('porta do plano tambem com saldo desconhecido', /\/pricing\?src=next_action_unknown/.test(src))
check('porta do plano no secundario de quem NAO esta seco', /\/pricing\?src=next_action_side/.test(src))
check('quem nunca fez filme recebe caminho proprio', /kind: 'make_first_film'/.test(src))
check('nenhuma porta de plano exige lastFilm', !/if \(!ultimo\)[\s\S]{0,200}see_plans/.test(src))

// ── 4. saldo desconhecido NAO e saldo zero (licao da #1 deste sprint) ──────
check('perfil ilegivel devolve state null', /if \(!profile \|\| typeof profile\.video_credits !== 'number'\)/.test(src))
check('resposta ignorante marca balanceKnown:false', /balanceKnown: false/.test(src))
check('nao classifica seco sem saldo lido', src.indexOf('balanceKnown: false') < src.indexOf("state: EstadoProximaAcao"))

// ── 5. o filtro de acessivel e honesto ─────────────────────────────────────
check('so entra motor que o saldo cobre', /\.filter\(\(m\) => m\.cost <= balance\)/.test(src))
check('compara na MESMA duracao do filme feito', /creditCostForDuration\(m\.quality, isPaidUser, segundos\)/.test(src))
check('segundos vem do filme real, com padrao 60', /duration_seconds === 'number' && ultimo\.duration_seconds > 0/.test(src))
check('melhor motor que cabe vem primeiro', /\.sort\(\(a, b\) => b\.cost - a\.cost\)/.test(src))
check('Seedance 2.5 (gated) fica fora da vitrine', !/s25|seedance 2\.5/i.test(srcCodigo))

// ── 6. o rebaixamento de motor so viaja COM prova de que o saldo nao cobre ─
check('engine so no estado seco', /engine: state === 'dry' \? motorAcessivel : null/.test(src))
check('buildSeriesContinuationHref aceita engine', /opts\?: \{ engine\?: string \| null \}/.test(serie))
check('fonte next_action existe no union', /\| 'next_action'/.test(serie))
check('rota usa a fonte propria', src.includes("'next_action'"))

// ── 7. denominador: o evento que faltava ───────────────────────────────────
check('emite next_action_served', src.includes("name: 'next_action_served'"))
check('evento carrega o estado', /next_action_served'[\s\S]{0,400}state,/.test(src))
check('evento carrega saldo e custo', /next_action_served'[\s\S]{0,400}last_cost: ultimoCusto/.test(src))
check('evento carrega o quanto falta', /next_action_served'[\s\S]{0,400}short_by: shortBy/.test(src))
check('dedupe para nao inflar denominador', /dedupeMinutes: 30/.test(src))
check('evento e best-effort (nao derruba a resposta)', /void writeServerEvent\(/.test(src))

// ── 8. REGRA 3: leitura pura — nao concede, nao cobra, nao envia ───────────
check('nenhum update em profiles', !/\.from\('profiles'\)[\s\S]{0,200}\.update\(/.test(src))
check('nenhum insert de credito', !/video_credits:\s*[a-zA-Z0-9]/.test(src.replace(/select\('video_credits[^']*'\)/g, '')))
check('nenhum envio de e-mail', !/resend|sendEmail|from\('emails'\)/i.test(src))
check('nenhuma escrita fora de events', src.split('.insert(').length - 1 === 0)
check('rota e GET (leitura)', /export async function GET\(/.test(src) && !/export async function POST\(/.test(src))

// ── 9. a frase mostrada nao promete nada que o plano nao garanta ───────────
const sublabel = (src.match(/const sublabel =[\s\S]*?: null\n/) || [''])[0]
check('a frase junta os DOIS numeros', /cost \$\{ultimoCusto\} credits[\s\S]{0,40}You have \$\{balance\}/.test(sublabel))
check('a frase nao promete conteudo de plano', !/(unlimited|forever|priority|premium|every engine)/i.test(sublabel))
check('a rota nao menciona preco em dinheiro', !/\$\d|USD|\/mo/.test(srcCodigo.replace(/\$\{[^}]*\}/g, '')))

const total = ok + falhas.length
console.log(`\nnext-action: ${ok}/${total} verificacoes`)
if (falhas.length) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ tudo verde')
