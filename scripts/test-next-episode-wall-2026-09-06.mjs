// sprint-assinaturas #4 (06/09) — a carta de quem bateu na parede de saldo.
//
// Esta rota MANDA E-MAIL DE VERDADE para clientes reais, e o carimbo e
// VITALICIO (1 por pessoa, para sempre). Nao ha segunda chance com esta lista.
// Por isso o guardiao aqui nao verifica estilo: verifica as travas que, se
// caírem, queimam a coorte mais quente da casa sem campanha.
//
// ⚠ CRLF: normaliza antes de casar.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

const src = ler('app/api/admin/send-next-episode-wall/route.ts')
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
const codigo = semComentarios(src)

let ok = 0
const falhas = []
const check = (nome, cond) => { if (cond) ok += 1; else falhas.push(nome) }

// ── 1. NAO DISPARA SOZINHA ────────────────────────────────────────────────
check('dry-run e o padrao', /const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(codigo))
check('sem confirm devolve DRY_RUN e SAI', /if \(!confirm\) \{\s*return NextResponse\.json\(\{\s*mode: 'DRY_RUN'/.test(codigo))
// ⚠ Esta comparacao le `src` (com comentarios) DE PROPOSITO: `semComentarios`
// remove `//[^\n]*` e isso engole o `//` de qualquer URL — 'api.resend.com'
// some de `codigo` e o indexOf devolve -1, que faria a checagem passar ou
// falhar por motivo errado. Cabecalho deste arquivo nao cita a URL, entao
// `src` e seguro aqui.
check('o envio vem DEPOIS do return do dry-run',
  src.indexOf("mode: 'DRY_RUN'") > 0 &&
  src.indexOf('api.resend.com/emails') > src.indexOf("mode: 'DRY_RUN'"))
check('so admin passa', /ADMIN_EMAILS\.has\(\(user\.email \?\? ''\)\.toLowerCase\(\)\)/.test(codigo))
check('sem admin devolve 403', /return NextResponse\.json\(\{ error: 'Forbidden' \}, \{ status: 403 \}\)/.test(codigo))
check('rota e GET e nao tem POST', /export async function GET\(/.test(codigo) && !/export async function POST\(/.test(codigo))

// ── 2. TETO DE LOTE ───────────────────────────────────────────────────────
check('lote limitado a 30', /Math\.min\(limiteParam, 30\)/.test(codigo))
check('lote padrao 30', /: 30\b/.test(codigo))
check('o corte do lote e aplicado', /destinatarios\.slice\(0, lote\)/.test(codigo))

// ── 3. QUEM NUNCA PODE RECEBER ────────────────────────────────────────────
for (const proibido of ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']) {
  check(`contato proibido na lista: ${proibido}`, src.includes(`'${proibido}'`))
}
check('a lista de bloqueados e aplicada', /isJunk\(email\) \|\| isBloqueado\(email\)/.test(codigo))
check('isBloqueado compara em minusculas', /const e = email\.toLowerCase\(\)\s*\n\s*return BLOQUEADOS\.some/.test(codigo))
check('opt-out respeitado', /raw\.email_opted_out === true/.test(codigo))
check('pagante nao recebe', /raw\.has_paid === true/.test(codigo) && /PAGOS\.has/.test(codigo))
check('descartavel nao recebe', /DISPOSABLE\.some/.test(codigo))

// ── 4. UM E-MAIL POR PESSOA ───────────────────────────────────────────────
check('carimbo proprio existe', /const SENT_EVENT = 'next_episode_wall_emailed_v1'/.test(codigo))
check('carimbo do proprio envio exclui', /\.in\('name', \[SENT_EVENT, \.\.\.OTHER_CAMPAIGNS/.test(codigo))
check('carimbo de outras campanhas exclui', /if \(jaEmailado\.has\(id\)\) continue/.test(codigo))
check('carimbo booleano em profiles exclui', /STAMP_COLUMNS\.some\(\(c\) => raw\[c\] === true\)/.test(codigo))
check('carimbo de data em profiles exclui', /STAMP_DATES\.some\(\(c\) => raw\[c\] != null\)/.test(codigo))
check('quem tocou checkout fica com a outra campanha', /if \(tocouCheckout\.has\(id\)\) continue/.test(codigo))
// ⚠ ESTA CHECAGEM JA FOI FURADA UMA VEZ, no mutante M3 de 06/09: ela era
// `indexOf(throw) < indexOf(carimbo)`, e apagar o throw faz o indexOf devolver
// -1 — que e MENOR que qualquer indice, entao o guardiao aprovava exatamente a
// remocao que ele existia para pegar. Sem o throw, um Resend que responde 4xx
// segue para o carimbo e a pessoa fica QUEIMADA para sempre sem ter recebido
// nada. Agora a existencia e exigida ANTES da ordem.
const iThrow = codigo.indexOf('throw new Error(`resend')
const iCarimbo = codigo.indexOf('name: SENT_EVENT')
check('o throw de resposta ruim EXISTE', iThrow > 0)
check('o carimbo EXISTE', iCarimbo > 0)
check('CARIMBA SO NO SUCESSO (throw antes do carimbo)', iThrow > 0 && iCarimbo > 0 && iThrow < iCarimbo)
check('resposta nao-ok vira erro', /if \(!res\.ok\) throw new Error/.test(codigo))

// ── 5. SUPRESSAO DE 24H ───────────────────────────────────────────────────
check('supressao carregada', /loadLifecycleSuppression\(admin, candidatos\.map/.test(codigo))
check('supressao aplicada ao filtro', /!sup\.isSuppressed\(c\.id\)/.test(codigo))
check('o dry-run mostra quantos foram suprimidos', /suprimidos_24h: sup\.suppressedCount/.test(codigo))
check('o dry-run avisa se a supressao degradou', /supressao_degradada: sup\.degraded/.test(codigo))

// ── 6. A COORTE E A PAREDE DE SALDO, nao "todo mundo" ─────────────────────
check('so quem tem saldo MENOR que o ultimo filme', /saldo >= ultimo\.custo\) continue/.test(codigo))
check('filme sem custo conhecido nao entra', /ultimo\.custo <= 0/.test(codigo))
check('saldo ilegivel nao vira zero', /saldo < 0 \|\| /.test(codigo))
check('janela de 14 dias', /14 \* 24 \* 60 \* 60 \* 1000/.test(codigo))
check('so filme COMPLETO conta', /\.eq\('status', 'completed'\)/.test(codigo))

// ── 7. A CARTA NAO MENTE (a licao da #1 deste mesmo ciclo) ────────────────
// Nada de prometer motor, preco, credito ou desconto: o preco do Kineo 1
// depende de trial e de cota, e um e-mail nao reconsulta cota.
const copy = (src.match(/function corpoTexto[\s\S]*?^}/m) || [''])[0] + (src.match(/function corpoHtml[\s\S]*?^}/m) || [''])[0]
check('a carta nao nomeia motor', !/Kineo 1|Seedance|Kling|Veo|MiniMax|Omni/.test(copy))
check('a carta nao promete gratis', !/\bfree\b/i.test(copy))
check('a carta nao promete desconto', !/discount|% off|coupon|promo/i.test(copy))
check('a carta nao promete credito', !/we (added|gave)|bonus credits|extra credits/i.test(copy))
check('a carta nao escreve dinheiro', !/\$\d|USD|\/mo\b/.test(copy))
check('a carta nao promete conteudo de plano', !/(unlimited|forever|priority queue|every engine)/i.test(copy))
// O que ela PODE afirmar: os dois numeros, que vem do banco.
check('a carta diz o custo do ultimo filme', /cost.*\$\{custo\} credits|\$\{custo\} credits/.test(copy))
check('a carta diz o saldo', /\$\{saldo\}/.test(copy))
check('a carta manda a pessoa VER o numero no produto', /what your current balance\s*\n?\s*still covers|still covers/.test(copy))

// ── 8. HIGIENE DE E-MAIL ──────────────────────────────────────────────────
check('cabecalho de descadastro', /headers: unsubscribeHeaders\(d\.id\)/.test(codigo))
check('rodape de descadastro no texto', /emailFooterText\(userId\)/.test(src))
check('rodape de descadastro no html', /emailFooterHtml\(userId\)/.test(src))
check('titulo vindo do banco e escapado no html', /escaparHtml\(filme\)/.test(codigo))
// O teto de tamanho e a rejeicao de "titulo que e ordem" vem da funcao da casa
// (pickMomentumTopic: MAX_ANCHOR=90, rejeita verbo de ordem, rotulo, markdown e
// frase de regra). O que se verifica aqui e que a rota NAO tem regua propria.
check('titulo sai da funcao da casa', /pickMomentumTopic\(title\) \?\? pickMomentumTopic\(topic\)/.test(codigo))
check('sem regua de titulo propria na rota', !/\.slice\(0,\s*\d+\)\s*\}?…|length > 70/.test(codigo))
check('titulo nulo cai em assunto generico', /filme \? `Episode 2 of "\$\{filme\}"` : 'Your next episode is ready to write'/.test(codigo))
check('pacing entre envios', /setTimeout\(r, 600\)/.test(codigo))

// ── 9. NAO CONCEDE, NAO COBRA, NAO MUDA PRECO ─────────────────────────────
check('nao escreve em profiles', !/\.from\('profiles'\)[\s\S]{0,200}\.(update|insert|upsert)\(/.test(codigo))
check('nao concede credito', !/video_credits:\s*[a-zA-Z0-9]/.test(codigo.replace(/video_credits'/g, '')))
check('a unica escrita e o carimbo em events', (codigo.match(/\.insert\(/g) || []).length === 1)
check('nao toca stripe', !/stripe/i.test(codigo))

const total = ok + falhas.length
console.log(`\nnext-episode-wall: ${ok}/${total} verificacoes`)
if (falhas.length) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ tudo verde')
