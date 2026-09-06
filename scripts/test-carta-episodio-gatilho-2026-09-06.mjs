#!/usr/bin/env node
/**
 * KINEO-CARTA-SEM-GATILHO-2026-09-06 — guardião da #11 do ciclo noturno.
 *
 * O QUE ELE PROVA, lendo os ARQUIVOS REAIS (nada de mock, nada de constante
 * recopiada — a lição de `contrato-de-servidor-sem-chamador`: uma peça pode
 * estar perfeita e não ser chamada por ninguém):
 *
 *   1. a carta TEM GATILHO — existe auth de cron E ela está no `vercel.json`,
 *      com `confirm=SEND` (sem isso o cron roda em DRY-RUN para sempre, que é
 *      exatamente como dois crons desta casa dormiram 30 dias);
 *   2. o gatilho NÃO ABRIU A PORTA — a sessão de admin continua exigida para
 *      quem não traz o cabeçalho, e a falta da env fecha em vez de abrir;
 *   3. o link NÃO É CEGO — os dois CTAs carregam `utm_campaign`;
 *   4. a PROMESSA TEM LASTRO — a copy só afirma "já está digitado na caixa"
 *      dentro do ramo que de fato manda o prefill;
 *   5. os LIMITES DO CICLO seguem de pé — teto de 30, carimbo por pessoa,
 *      supressão, bloqueados, opt-out, e NENHUM preço/oferta nova na carta.
 *
 * Cada checagem foi escrita para reprovar um mutante concreto; onde o mutante
 * óbvio passaria, a checagem foi endurecida em vez de aceita.
 */
import fs from 'node:fs'
import path from 'node:path'

const raiz = process.cwd()
// Leitura normaliza CRLF: no Windows o checkout traz \r\n e um regex de duas
// linhas reprovaria por motivo errado (memória `guardiao-crlf-falso-vermelho`).
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0, fail = 0
const check = (nome, cond, detalhe = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nome}`) }
  else { fail++; console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`) }
}

const ROTA = 'app/api/admin/send-next-episode-wall/route.ts'
const rota = ler(ROTA)
const helper = ler('lib/lifecycle/composerUrl.ts')
const vercel = ler('vercel.json')

// ── 1. O GATILHO EXISTE ─────────────────────────────────────────────────────
console.log('\n1. A carta tem gatilho automatico')
check('a rota le CRON_SECRET', /process\.env\.CRON_SECRET/.test(rota))
check(
  'compara com o cabecalho Authorization: Bearer',
  /headers\.get\('authorization'\)\s*===\s*`Bearer \$\{cronSecret\}`/.test(rota),
)

// O caminho tem query, entao `JSON.parse` + busca por prefixo (uma comparacao
// de igualdade com a string inteira quebraria ao mudar o limite, que e ajuste
// legitimo). O que NAO pode mudar e o par path+confirm.
const crons = JSON.parse(vercel).crons ?? []
const entrada = crons.find((c) => typeof c?.path === 'string' && c.path.startsWith('/api/admin/send-next-episode-wall'))
check('a rota esta registrada no vercel.json', Boolean(entrada), `crons=${crons.length}`)
check(
  'o cron dispara de verdade (confirm=SEND), nao em dry-run eterno',
  Boolean(entrada) && /[?&]confirm=SEND(&|$)/.test(entrada.path),
  entrada?.path ?? '(ausente)',
)
check(
  'o cron tem schedule valido de 5 campos',
  Boolean(entrada) && typeof entrada.schedule === 'string' && entrada.schedule.trim().split(/\s+/).length === 5,
  entrada?.schedule ?? '(ausente)',
)

// ── 2. O GATILHO NAO ABRIU A PORTA ──────────────────────────────────────────
// Mutante que isto reprova: trocar `if (!cronSecret) return false` por
// `return true`, que e o atalho classico "sem env, deixa passar" e publicaria
// um disparador de e-mail em massa.
console.log('\n2. Nada foi aberto junto com o gatilho')
check(
  'fail-closed: sem CRON_SECRET a porta fecha',
  /const cronSecret = process\.env\.CRON_SECRET\s*\n\s*if \(!cronSecret\) return false/.test(rota),
)
check('a sessao de admin continua sendo exigida', /ADMIN_EMAILS\.has\(/.test(rota) && /status: 403/.test(rota))
check(
  'a checagem de admin so e pulada por quem passou pelo cron',
  /if \(!porCron\) \{[\s\S]{0,400}?ADMIN_EMAILS\.has\(/.test(rota),
)
// Mutante: apagar o `!` e deixar `if (porCron) { ...admin... }` — passaria numa
// checagem que so procurasse as duas palavras no arquivo.
check('nao existe ramo que dispense as duas portas', !/if \(porCron\)\s*\{[\s\S]{0,200}?ADMIN_EMAILS/.test(rota))

// ── 3. O LINK NAO E CEGO ────────────────────────────────────────────────────
console.log('\n3. Os dois CTAs sao rastreaveis')
check('a rota usa o helper unico de destino', /from '@\/lib\/lifecycle\/composerUrl'/.test(rota) && /composerUrl\(/.test(rota))
check('a campanha tem nome proprio', /const CAMPANHA = '[a-z0-9_]+'/.test(rota))
check('a porta do plano carrega utm_campaign', /\/pricing\?utm_source=[^`]*utm_campaign=\$\{CAMPANHA\}/.test(rota))
// O defeito original: `${SITE}/studio/create` digitado a mao, sem query.
const cruas = rota.match(/\$\{SITE\}\/studio(?!\/create\?)[^`"'\s]*/g) ?? []
check('nenhum CTA cru para o composer sobrou', cruas.length === 0, cruas.join(' · '))
const pricingCru = rota.match(/\$\{SITE\}\/pricing(?!\?)/g) ?? []
check('nenhum link de plano sem etiqueta', pricingCru.length === 0, pricingCru.join(' · '))

// ── 4. A PROMESSA TEM LASTRO ────────────────────────────────────────────────
// A regra de 24/08 do CLAUDE.md: nunca prometer o que o produto nao executa.
// A frase "ja digitado na caixa" so pode existir onde o prefill de fato viaja.
console.log('\n4. A copy nao promete tela que nao existe')
check('o helper aceita prefill', /readonly prompt\?: string \| null/.test(helper))
check('o prefill vira ?prompt= na URL', /params\.set\('prompt', prefill\)/.test(helper))
check('prefill vazio nao muda o link', /if \(prefill\) params\.set/.test(helper))
check('ha teto de tamanho no prefill', /COMPOSER_PREFILL_MAX_CHARS/.test(helper) && /slice\(0, COMPOSER_PREFILL_MAX_CHARS\)/.test(helper))
check('a rota manda o titulo como prefill', /composerUrl\(\{ base: SITE, campaign: CAMPANHA, prompt: filme \}\)/.test(rota))
// A promessa antiga, que era falsa para quem chega por e-mail: o bloco de
// proximo episodio do GenerateClient so roda em `phase === 'done'`.
check(
  'a frase antiga ("waiting with the topic already in it") sumiu',
  !/waiting with the topic already in it/.test(rota),
)
check('a frase antiga ("the sequel is already written") sumiu', !/the sequel is already written/.test(rota))
// Mutante que isto reprova: mover a frase do prefill para fora do ternario, o
// que a mandaria tambem para quem nao tem titulo (e recebe caixa vazia).
const semTitulo = rota.match(/:\s*(`|')The (link|button) below opens the studio straight on the composer/g) ?? []
check('quem nao tem titulo recebe frase propria, sem prefill', semTitulo.length === 2, `ramos=${semTitulo.length}`)
check(
  'a frase de prefill vive no ramo COM titulo (texto e html)',
  (rota.match(/already typed into the box/g) ?? []).length === 2,
)
// ⚠ AS DUAS CHECAGENS ACIMA NAO BASTAM, e o mutante provou: trocar
// `const ponte = filme` por `const ponte = true` deixa os DOIS ramos no
// arquivo (a contagem fica intacta) e mesmo assim manda a frase "ja digitado
// na caixa" para quem NAO tem titulo — exatamente quem vai encontrar caixa
// vazia. Contar texto nao prova condicao. O que precisa ser verdade e que a
// frase seja decidida pela MESMA variavel que decide o prefill: `filme`.
check(
  'a frase do texto e decidida por `filme`, o mesmo valor que decide o prefill',
  /const ponte = filme\n\s*\?/.test(rota),
)
check(
  'a frase do html tambem e decidida por `filme`',
  /<p>\$\{filme\n\s*\?/.test(rota),
)

// ── 5. OS LIMITES DO CICLO ──────────────────────────────────────────────────
console.log('\n5. Nada dos limites do ciclo foi afrouxado')
check('teto de 30 por disparo', /Math\.min\(limiteParam, 30\)/.test(rota))
check('carimbo vitalicio de 1 e-mail por pessoa', /if \(jaEmailado\.has\(id\)\) continue/.test(rota))
check('carimbo gravado SO no sucesso do envio', /res\.ok/.test(rota) && /name: SENT_EVENT/.test(rota))
check('supressao de 24h aplicada', /loadLifecycleSuppression/.test(rota) && /sup\.isSuppressed/.test(rota))
check('contatos bloqueados do ciclo continuam na lista', ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin'].every((c) => rota.includes(c)))
check('opt-out respeitado', /email_opted_out === true/.test(rota))
check('cabecalho de descadastro presente', /unsubscribeHeaders\(/.test(rota))
check('pagante nunca entra', /has_paid === true/.test(rota))
check('dry-run continua sendo o padrao sem confirm', /const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(rota) && /if \(!confirm\) \{/.test(rota))
// Nenhum preco/oferta nova: o ciclo proibe. Numero seguido de "% off",
// "$" ou "credits free" na copy reprova.
const ofertaNova = rota.match(/\d+% off|\$\d|\bfree credits\b|\bcredits free\b/g) ?? []
check('a carta nao inventa preco nem oferta', ofertaNova.length === 0, ofertaNova.join(' · '))

console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} verificacoes ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
