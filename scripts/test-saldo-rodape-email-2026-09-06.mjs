#!/usr/bin/env node
// KINEO-SALDO-RODAPE-EMAIL-2026-09-06 (sprint-assinaturas #13, checkpoint)
//
// O DEFEITO. A rotação #1 de 05/09 criou `readyEmailCreditsFallback` em
// app/api/compose/status/[renderId]/route.ts para que o rodapé do e-mail "Your
// Short is ready" soubesse o saldo da pessoa mesmo quando o débito acontece na
// ABERTURA do job (todo motor cinemático). O comentário dela diz, literalmente,
// "este `planRow` já consulta `profiles` no mesmo ponto do fluxo: basta pedir a
// coluna junto". A coluna NUNCA foi pedida. O `select` ficou
// `has_paid, plan, ${TRIAL_ENTITLEMENT_COLUMNS}` — sem `video_credits` — então
// `saldoPerfil` vinha `undefined`, o fallback virava `null`, e o rodapé caía em
// `unknown_balance_episode2` exatamente para quem acabou de gastar o filme caro.
//
// PROVA DE PRODUÇÃO (06/09 05:4x BRT, contas externas):
//   · `credits_source='profile'` = ZERO linhas em toda a história do carimbo.
//   · 8 e-mails saíram com `credits_source='unknown'`, 8 pessoas distintas,
//     6 delas de utm_source=chatgpt.
//   · 7 das 8 TINHAM saldo na hora: 10, 7, 55, 5, 10, 10, 7 (só uma tinha 0).
//   · Caso nomeado: garrrrrgamel@gmail.com (chatgpt, DE, trial ativo) recebeu
//     o e-mail cego às 08:03:41 UTC com `cost=15` e saldo 7 — e no MESMO
//     segundo o /api/next-action sabia tudo: balance 7, short_by 8,
//     alternative_cost 5.
//
// POR QUE O GUARDIÃO DA #1 NÃO PEGOU. Ele testa a rota com
// `/has_paid, plan, video_credits, \$\{TRIAL_ENTITLEMENT_COLUMNS\}/` sobre o
// arquivo INTEIRO. A rota tem DOIS selects de profiles: o do débito (~linha
// 573), que já pedia `video_credits`, e o do rodapé (~linha 972), que não pedia.
// A regex casou com o primeiro e disse "ok" sobre uma linha que não é a que
// decide. Memória `guardiao-contar-texto-nao-prova-condicao`.
//
// ESTE GUARDIÃO amarra a verificação ao BLOCO que decide: recorta a rota entre
// a declaração de `readyEmailCreditsFallback` e a atribuição dela, e exige que
// o `select` DE DENTRO desse recorte peça a coluna. Mutante que tire
// `video_credits` da linha 972 morre; mutante que tire da linha 573 é pego pela
// verificação irmã, separada.
import { readFileSync } from 'node:fs'

let ok = 0
const falhas = []
const checa = (n, c, d = '') => {
  if (c) { ok++; console.log(`  ok  ${n}`) }
  else { falhas.push(n); console.log(`  XX  ${n}${d ? ' — ' + d : ''}`) }
}

const rota = readFileSync(
  new URL('../app/api/compose/status/[renderId]/route.ts', import.meta.url),
  'utf8',
)

console.log('\n== 1. o bloco que decide o rodapé pede o saldo ==')
// Ancorado no NOME EXATO (com os dois pontos do tipo): renomear a variavel
// derruba esta busca em vez de deslizar para um nome parecido.
const iDecl = rota.search(/let readyEmailCreditsFallback: number \| null = null/)
const iAtrib = iDecl < 0 ? -1 : rota.indexOf('readyEmailCreditsFallback =', iDecl + 10)
checa('a variável do fallback existe', iDecl > -1)
checa('e é atribuída depois da declaração', iAtrib > iDecl)

const bloco = iDecl > -1 && iAtrib > iDecl ? rota.slice(iDecl, iAtrib) : ''
const selectsDoBloco = bloco.match(/\.select\(`[^`]*`\)/g) ?? []
checa('há exatamente UM select de profiles nesse bloco', selectsDoBloco.length === 1,
  `achei ${selectsDoBloco.length}`)
const selectDoRodape = selectsDoBloco[0] ?? ''
checa('esse select pede video_credits (O CONSERTO)', /\bvideo_credits\b/.test(selectDoRodape),
  selectDoRodape)
checa('e continua pedindo has_paid e plan (o ramo assinante não pode cegar)',
  /\bhas_paid\b/.test(selectDoRodape) && /\bplan\b/.test(selectDoRodape))
checa('e continua pedindo as colunas de trial', /TRIAL_ENTITLEMENT_COLUMNS/.test(selectDoRodape))
checa('o bloco lê profiles, não outra tabela', /\.from\('profiles'\)/.test(bloco))

console.log('\n== 2. o valor lido chega mesmo ao rodapé (senão pedir a coluna não serve) ==')
checa('saldoPerfil sai do planRow deste bloco',
  /const saldoPerfil = \(planRow as \{ video_credits\?: number \| null \} \| null\)\?\.video_credits/.test(rota))
checa('o fallback só aceita número finito (null continua sendo desconhecido)',
  /typeof saldoPerfil === 'number' && Number\.isFinite\(saldoPerfil\) \? saldoPerfil : null/.test(rota))
checa('o rodapé recebe débito ?? perfil',
  /const readyCredits = creditsRemaining \?\? readyEmailCreditsFallback/.test(rota))
checa('e o e-mail é montado com esse valor', /creditsRemaining: readyCredits,/.test(rota))
const iReady = rota.indexOf('const readyCredits = creditsRemaining')
checa('a leitura acontece ANTES da montagem do rodapé', iAtrib > -1 && iAtrib < iReady)

console.log('\n== 3. o carimbo continua contável (é como medimos o conserto) ==')
checa('o evento grava credits_source', /credits_source:/.test(rota))
checa("e distingue as três origens", /'debit'/.test(rota) && /'profile'/.test(rota) && /'unknown'/.test(rota))
checa("'profile' vem do fallback, não de um literal solto",
  /readyEmailCreditsFallback !== null\s*\?\s*'profile'/.test(rota.replace(/\s+/g, ' ').replace(/ \? /g, ' ? ')) ||
  /readyEmailCreditsFallback !== null[\s\S]{0,40}'profile'/.test(rota))
checa('o carimbo grava o saldo efetivo', /credits_remaining: readyCredits,/.test(rota))

console.log('\n== 4. o OUTRO select (o do débito) não regrediu ==')
const iDebito = rota.indexOf(".select(`has_paid, plan, video_credits")
checa('o select do débito continua pedindo video_credits', iDebito > -1)
checa('e ele é ANTES do bloco do rodapé (são dois selects distintos)',
  iDebito > -1 && iDecl > -1 && iDebito < iDecl)
const quantosPedem = (rota.match(/\.select\(`has_paid, plan, video_credits/g) ?? []).length
checa('agora são DOIS selects pedindo a coluna (antes era um só)', quantosPedem === 2,
  `achei ${quantosPedem}`)

console.log('\n== 5. limites do ciclo: nada de preço, oferta ou promessa nova ==')
const blocoEmail = rota.slice(iDecl, rota.indexOf('[notify-video-ready] stamp failed'))
checa('nenhum preço digitado no bloco do e-mail', !/\$\d/.test(blocoEmail.replace(/\/\/.*$/gm, '')))
checa('nenhuma promessa de cupom/desconto/crédito grátis no bloco',
  !/(coupon|discount|free credits?)/i.test(blocoEmail.replace(/\/\/.*$/gm, '')))
checa('o rodapé continua vindo da biblioteca, não escrito inline aqui',
  /videoReadyFooter\(/.test(rota))

console.log(`\n${falhas.length ? 'FALHOU' : 'PASSOU'}: ${ok} verificações ok, ${falhas.length} falhas`)
if (falhas.length) { falhas.forEach((f) => console.log('  - ' + f)); process.exit(1) }
