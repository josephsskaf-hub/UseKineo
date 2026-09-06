// sprint-assinaturas #2 (06/09) — o cartao da proxima acao, no instante do "nao".
//
// O QUE ESTE GUARDIAO EXISTE PARA IMPEDIR, em uma frase: que a tela volte a
// DECIDIR sozinha quem esta sem saldo ou quanto custa o proximo filme. As duas
// decisoes sao do servidor; a tela obedece. Cada predicado novo na tela e um
// terceiro predicado, que foi exatamente o defeito que a #1 deste ciclo
// arrancou da rota.
//
// Le os ARQUIVOS REAIS (componente + o call site em GenerateClient) — provar o
// caller e o ponto, nao uma copia.
//
// ⚠ CRLF: o checkout do Windows entrega \r\n; toda leitura normaliza antes de
// casar (licao da correcao da #3 do sprint de 05/09).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const card = ler('components/NextActionCard.tsx')
const tela = ler('app/(dashboard)/generate/GenerateClient.tsx')
const rota = ler('app/api/next-action/route.ts')

/** Codigo sem comentario nenhum. Um guardiao que le comentario reprova a
 *  explicacao em vez do comportamento. */
const semComentarios = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '').replace(/\/\/[^\n]*/g, '')
const cardCodigo = semComentarios(card)
const telaCodigo = semComentarios(tela)

let ok = 0
const falhas = []
const check = (nome, cond) => { if (cond) ok += 1; else falhas.push(nome) }

// ── (a) SO APARECE QUANDO O SALDO NAO COBRE — e quem decide e o SERVIDOR ────
check('o cartao so pinta no estado seco', /const seco = estado === 'dry'/.test(cardCodigo))
check('fora do seco nao renderiza nada', /if \(!seco \|\| !dados\) return null/.test(cardCodigo))
check('o estado vem da resposta do servidor', /const estado = dados\?\.state \?\? null/.test(cardCodigo))
// O predicado de "esta sem saldo" NAO pode ser reconstruido na tela.
check('a tela nao compara saldo com custo', !/balance\s*[<>]=?\s*|credits\s*[<>]=?\s*cost/.test(cardCodigo))
check('a tela nao le plano nem has_paid', !/has_paid|PAID_PLANS|isPaidUser|trial_status/.test(cardCodigo))
check('a tela nao decide trial', !/isTrial|treatAsPaid/.test(cardCodigo))

// ── (b) A PORTA DO PLANO EXISTE — regra K1 ─────────────────────────────────
check('a porta do plano e pintada', /plano && \(/.test(cardCodigo))
check('a porta do plano vem do primary see_plans', /dados\.primary\?\.kind === 'see_plans'/.test(cardCodigo))
// O caso que mais importa: SEM alternativa barata, o plano continua na tela.
check('sem alternativa o plano continua', /\{alternativa \? 'Or keep this engine — see plans →' : `\$\{plano\.label\} →`\}/.test(card))
check('o plano nao depende de haver alternativa', !/alternativa && plano|plano && alternativa &&/.test(cardCodigo))
check('a rota devolve porta de plano no estado seco', /\/pricing\?src=next_action_dry/.test(rota))

// ── (c) NADA BLOQUEIA QUEM QUER COMPRAR ────────────────────────────────────
check('o cartao nao e modal nem overlay', !/position: 'fixed'|inset: 0|zIndex/.test(cardCodigo))
check('o cartao nao intercepta clique da tela', !/onClick=\{onClose\}|stopPropagation|preventDefault/.test(cardCodigo))
check('o cartao nao esconde as linhas de plano', !/PLAN_LIST|setShowUpgradeModal|onClose\(/.test(cardCodigo))
check('falha de rede nao derruba nada', /\.catch\(\(\) => \{/.test(cardCodigo) && /r\.ok \? r\.json\(\) : null/.test(cardCodigo))
check('sem dados o cartao some, nao trava', /if \(!seco \|\| !dados\) return null/.test(cardCodigo))

// ── PRECO: a tela NUNCA recalcula ──────────────────────────────────────────
check('nenhum numero de credito digitado no cartao', !/\b(5|15|20|25|45|50|110|150)\s*(credits|cr)\b/.test(cardCodigo))
check('o custo exibido vem do servidor', /alternativa\.cost/.test(cardCodigo))
check('nao importa a tabela de custo', !/engineCost|creditCostFor/.test(card))
check('a frase dos dois numeros vem pronta do servidor', /dados\.primary\?\.sublabel/.test(cardCodigo))
check('o cartao nao escreve dinheiro', !/\$\d|USD|\/mo|month/.test(cardCodigo))

// ── A VERDADE DO FREE TIER (senao troca mentira de preco por mentira de entrega)
check('o corte de segundos vem do servidor', /dados\.freeTier\?\.clampSeconds/.test(cardCodigo))
check('so fala em segundos quando a alternativa e gratis', /\(alternativa\.cost \?\? 0\) === 0 && clamp != null/.test(cardCodigo))
check('a frase do gratis diz segundos E marca dagua', /Free films are \{clamp\} seconds and watermarked/.test(card))
check('o limite da janela vem do servidor', /dados\.freeTier\?\.limit/.test(cardCodigo) && /dados\.freeTier\?\.windowHours/.test(cardCodigo))

// ── O MONTE: UMA linha, no ponto certo, sem redesenho ──────────────────────
const montagens = telaCodigo.match(/<NextActionCard[^>]*\/>/g) || []
check('montado exatamente uma vez', montagens.length === 1)
check('montado atras da razao de falta de credito', /\{reasonHasCreditFit && <NextActionCard surface="generate_upgrade_modal" \/>\}/.test(telaCodigo))
check('importado por caminho de alias', /import NextActionCard from '@\/components\/NextActionCard'/.test(tela))
check('montado ANTES do bloco purchaseFit', telaCodigo.indexOf('<NextActionCard') < telaCodigo.indexOf('{purchaseFit && ('))
check('nao mexeu no bloco purchaseFit', /This video needs \{purchaseFit\.requiredCredits\} credits\. You have \{purchaseFit\.balance\}\./.test(tela))
check('nao mexeu na oferta de primeiro filme gratis', /firstFilmFree && onFirstFilmFree && \(/.test(tela))
check('as linhas de plano seguem intactas', /\{PLAN_LIST\.map\(\(plan\) => \{/.test(tela))

// ── TELEMETRIA: o degrau precisa de denominador ────────────────────────────
check('impressao vira evento', /next_action_card_shown/.test(cardCodigo))
check('clique vira evento com a escolha', /next_action_clicked/.test(cardCodigo) && /choice: escolha/.test(cardCodigo))
check('a escolha separa gratis de mais barato', /alternativa\.cost === 0 \? 'continue_free' : 'continue_cheaper'/.test(cardCodigo))
check('a impressao so conta no estado seco', /if \(!seco\) return\n\s*try \{\n\s*void trackEvent\('next_action_card_shown'/.test(cardCodigo))

// ── O QUE O CARTAO NAO PODE FAZER ──────────────────────────────────────────
check('nao concede credito', !/video_credits|grant|admin_credits/.test(cardCodigo))
check('nao envia e-mail', !/resend|sendEmail|mailto/i.test(cardCodigo))
check('nao faz POST em lugar nenhum', !/method:\s*'POST'/.test(cardCodigo))
check('nao promete conteudo de plano', !/(unlimited|forever|priority|premium|every engine)/i.test(cardCodigo))

const total = ok + falhas.length
console.log(`\nnext-action-card: ${ok}/${total} verificacoes`)
if (falhas.length) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ tudo verde')
