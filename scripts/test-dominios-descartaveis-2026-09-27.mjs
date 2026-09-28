#!/usr/bin/env node
// KINEO-DESCARTAVEIS-2026-09-27 — bloqueio de domínios descartáveis no cadastro.
//
// Pedido do fundador (27/09 21h30 BRT): "bloqueia esses domínios descartáveis
// no cadastro". Medido no banco em 27/09: omanarts.com (8 contas em 2 dias),
// pumpoly.com (7 em 1 dia), nixadrume40.asia e nodgwdg.eu.cc (nomes gerados) —
// 0 filmes, 0 pagantes.
//
// O defeito que este guardião trava: existiam DUAS listas que não conversavam.
//   (1) lib/emailValidation.ts DISPOSABLE_DOMAINS — só a página /signup olhava;
//   (2) lib/reverseTrial.ts DISPOSABLE_EMAIL_TOKENS — só o grant do trial olhava.
// O modal de cadastro (components/AuthModal.tsx) criava conta sem olhar
// nenhuma, e skyprofy.com/tabeebee.com (farm de 13/08, lista 1) ganhavam trial
// no servidor porque a lista 2 não os conhecia.
//
// Estilo: readFileSync + transpile em memória (sem alias @/, sem rede, sem
// banco). Roda os contratos na fonte REAL e depois em mutantes em memória —
// cada mutante tem de derrubar pelo menos uma verificação da seção que ele
// ataca, senão o guardião não prova nada.
//
// Rodar: node scripts/test-dominios-descartaveis-2026-09-27.mjs

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const R = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(R, 'package.json'))
const ts = requireFromRepo('typescript')
const CR = String.fromCharCode(13)
const ler = (p) => readFileSync(join(R, p), 'utf8').split(CR).join('')
/** Só código: sem linhas de comentário nem blocos — o teste não lê a explicação como se fosse o código. */
const semComentario = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')

const MENSAGEM = "Please use a permanent email address — disposable inboxes aren't allowed."
const NOVOS = ['omanarts.com', 'pumpoly.com', 'nixadrume40.asia', 'nodgwdg.eu.cc']
const NUNCA = [
  // provedores comuns
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'aol.com',
  'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.de', 'yandex.com', 'yandex.ru',
  'zoho.com', 'qq.com', '163.com', 'naver.com', 'uol.com.br', 'bol.com.br', 'terra.com.br',
  // alias/relay — clientes reais e pagantes usam (regra da casa em lib/reverseTrial.ts)
  'privaterelay.appleid.com', 'duck.com', 'simplelogin.com', 'simplelogin.co', 'slmail.me',
  'mozmail.com', 'addy.io', 'anonaddy.com', 'anonaddy.me',
  // relay com SUBDOMÍNIO por usuário (addy/anonaddy/simplelogin usam isso) —
  // é aqui que o casamento por subdomínio poderia virar falso positivo
  'joao.anonaddy.com', 'maria.addy.io', 'alias.simplelogin.com',
  // a casa e um corporativo inventado
  'usekineo.com', 'engenharia-acme-sp.com.br', 'mail.engenharia-acme-sp.com.br',
]

function transpilar(src) {
  return ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText
}

/** lib/emailValidation.ts é PURA: roda sem require nenhum. */
function carregarPura(src) {
  const mod = { exports: {} }
  new Function('module', 'exports', transpilar(src))(mod, mod.exports)
  return mod.exports
}

/**
 * O check do SERVIDOR, recortado da fonte real de lib/reverseTrial.ts (o
 * arquivo inteiro arrasta supabase/env). O import da lista pura é resolvido
 * pelo NOME que a própria fonte declara — se a fonte não importa, nada é
 * injetado e a união não existe.
 */
function carregarServidor(rtSrc, pura) {
  const imp = rtSrc.match(/^import \{ isDisposableEmail as (\w+) \} from '@\/lib\/emailValidation'$/m)
  const alias = imp ? imp[1] : null
  const ini = rtSrc.indexOf('const DISPOSABLE_EMAIL_TOKENS = [')
  const fimTok = rtSrc.indexOf('] as const', ini)
  const fnIni = rtSrc.indexOf('export function isDisposableEmail(')
  const fnFim = rtSrc.indexOf('\n}\n', fnIni)
  const domIni = rtSrc.indexOf('function dominioDoEmail(')
  const domFim = domIni >= 0 ? rtSrc.indexOf('\n}\n', domIni) : -1
  if (ini < 0 || fimTok < 0 || fnIni < 0 || fnFim < 0) throw new Error('recorte do servidor não achou as âncoras')
  const trecho = [
    rtSrc.slice(ini, fimTok + '] as const'.length),
    rtSrc.slice(fnIni, fnFim + 3),
    domIni >= 0 && domFim > domIni ? rtSrc.slice(domIni, domFim + 3) : '',
    "module.exports = { isDisposableEmail, dominioDoEmail: typeof dominioDoEmail === 'function' ? dominioDoEmail : null }",
  ].join('\n')
  const mod = { exports: {} }
  const nomes = ['module', 'exports']
  const valores = [mod, mod.exports]
  if (alias) { nomes.push(alias); valores.push(pura.isDisposableEmail) }
  new Function(...nomes, transpilar(trecho))(...valores)
  return mod.exports
}

/** Recorta o corpo de handleSignup até (e incluindo) a chamada do signUp. */
function ramoDoSignup(src) {
  const cod = semComentario(src)
  const h = cod.indexOf('async function handleSignup(')
  const s = h >= 0 ? cod.indexOf('supabase.auth.signUp(', h) : -1
  return { cod, h, s }
}

function checarPorta(nome, src, fail, pass) {
  const { cod, h, s } = ramoDoSignup(src)
  const c = h >= 0 && s > h ? cod.indexOf('if (isDisposableEmail(email)) {', h) : -1
  const ordem = c > h && c < s
  ;(ordem ? pass : fail)(`d. ${nome}: isDisposableEmail(email) roda ANTES de supabase.auth.signUp (índice ${c} < ${s})`)
  if (!ordem) return
  const ramo = cod.slice(c, cod.indexOf('\n    }', c) + 6)
  ;(ramo.includes('setLoading(false)') && /\breturn\b/.test(ramo) ? pass : fail)(`d. ${nome}: o ramo solta o loading e RETORNA (não segue para o signUp)`)
  ;(ramo.includes(MENSAGEM) ? pass : fail)(`d. ${nome}: mostra a MESMA frase da página /signup`)
  ;(/^import \{ isDisposableEmail \} from '@\/lib\/emailValidation'$/m.test(cod) ? pass : fail)(`d. ${nome}: a checagem vem da lista única (lib/emailValidation)`)
}

/**
 * Todos os contratos. Devolve a lista de falhas (por seção) — usada tanto na
 * fonte real (tem de dar zero) quanto nos mutantes (tem de dar > 0).
 */
function avaliar(f, verbose = false) {
  const falhas = []
  const fail = (m) => { falhas.push(m); if (verbose) console.log(`  ✗ ${m}`) }
  const pass = (m) => { if (verbose) console.log(`  ✓ ${m}`) }
  const chk = (m, c) => (c ? pass : fail)(m)

  // ── pureza ──────────────────────────────────────────────────────────────
  chk('0. lib/emailValidation.ts continua PURA (sem import, sem require) — é usada no cliente',
    !/^\s*import\s/m.test(f.pura) && !/\brequire\(/.test(f.pura))

  let pura, srv
  try { pura = carregarPura(f.pura) } catch (e) { fail(`0. lista pura não carregou: ${e.message}`); return falhas }
  try { srv = carregarServidor(f.rt, pura) } catch (e) { fail(`0. check do servidor não carregou: ${e.message}`); return falhas }
  const tenta = (fn, email) => { try { return fn(email) } catch { return 'THREW' } }

  // ── (a) os 4 domínios novos e subdomínios, nas duas listas ────────────────
  for (const d of NOVOS) {
    chk(`a. ${d} está em DISPOSABLE_DOMAINS`, pura.DISPOSABLE_DOMAINS instanceof Set && pura.DISPOSABLE_DOMAINS.has(d))
    chk(`a. tela recusa x@${d}`, tenta(pura.isDisposableEmail, `x@${d}`) === true)
    chk(`a. tela recusa subdomínio x@mail.${d}`, tenta(pura.isDisposableEmail, `x@mail.${d}`) === true)
    chk(`a. tela recusa caixa alta X@${d.toUpperCase()}`, tenta(pura.isDisposableEmail, `X@${d.toUpperCase()}`) === true)
    // (revisão) ponto final de FQDN entrega no mesmo domínio — tem de casar igual
    chk(`a. tela recusa ponto final de FQDN x@${d}.`, tenta(pura.isDisposableEmail, `x@${d}.`) === true)
    chk(`a. servidor recusa ponto final de FQDN x@${d}.`, tenta(srv.isDisposableEmail, `x@${d}.`) === true)
    chk(`a. servidor recusa x@${d}`, tenta(srv.isDisposableEmail, `x@${d}`) === true)
    chk(`a. servidor recusa subdomínio x@a.b.${d}`, tenta(srv.isDisposableEmail, `x@a.b.${d}`) === true)
  }
  chk('a. fronteira de rótulo: xomanarts.com NÃO casa omanarts.com', tenta(pura.isDisposableEmail, 'x@xomanarts.com') === false)
  chk('a. entrada ruim continua segura (sem @, vazio, null)',
    tenta(pura.isDisposableEmail, 'omanarts.com') === false && tenta(pura.isDisposableEmail, '') === false &&
    tenta(srv.isDisposableEmail, null) === false && tenta(srv.isDisposableEmail, undefined) === false)

  // ── (b) UNIÃO: todo domínio da lista da tela é recusado pelo servidor ─────
  const lista = pura.DISPOSABLE_DOMAINS instanceof Set ? Array.from(pura.DISPOSABLE_DOMAINS) : []
  chk(`b. a lista da tela tem corpo (${lista.length} domínios, todos com ponto)`, lista.length >= 140 && lista.every((d) => d.includes('.') && d === d.toLowerCase() && !d.startsWith('@')))
  const vazam = lista.filter((d) => tenta(srv.isDisposableEmail, `farmer@${d}`) !== true)
  chk(`b. servidor recusa TODOS os ${lista.length} domínios da lista da tela${vazam.length ? ` — vazam: ${vazam.slice(0, 6).join(', ')}${vazam.length > 6 ? '…' : ''}` : ''}`, lista.length > 0 && vazam.length === 0)
  chk('b. o caso histórico: skyprofy.com e tabeebee.com (farm 13/08) barrados no servidor',
    tenta(srv.isDisposableEmail, 'a@skyprofy.com') === true && tenta(srv.isDisposableEmail, 'a@tabeebee.com') === true)
  chk('b. nenhum token antigo do servidor foi removido (mailinator, yopmail, minitts.net, dysonc.com, fleckens.hu)',
    ['a@team.mailinator.net', 'a@yopmail.com', 'a@minitts.net', 'a@dysonc.com', 'a@fleckens.hu'].every((e) => tenta(srv.isDisposableEmail, e) === true))

  // ── (c) nunca bloqueados, nas duas listas ─────────────────────────────────
  for (const d of NUNCA) {
    const t = tenta(pura.isDisposableEmail, `cliente@${d}`)
    const s = tenta(srv.isDisposableEmail, `cliente@${d}`)
    chk(`c. ${d} passa (tela=${t}, servidor=${s})`, t === false && s === false)
  }

  // ── (d) as duas portas de cadastro por senha checam ANTES do signUp ──────
  checarPorta('components/AuthModal.tsx', f.modal, fail, pass)
  checarPorta('app/(auth)/signup/page.tsx', f.signup, fail, pass)
  const signUps = (semComentario(f.modal).match(/supabase\.auth\.signUp\(/g) || []).length +
    (semComentario(f.signup).match(/supabase\.auth\.signUp\(/g) || []).length
  chk(`d. só existem essas duas chamadas de signUp (achei ${signUps})`, signUps === 2)

  // ── (e) o ramo do servidor deixa rastro, com domínio e SEM e-mail ────────
  const rtc = semComentario(f.rt)
  const g = rtc.indexOf('export async function maybeActivateReverseTrial(')
  const b0 = rtc.indexOf('if (isDisposableEmail(args.email)) {', g)
  const b1 = b0 >= 0 ? rtc.indexOf("return { activated: false, reason: 'disposable_email' }", b0) : -1
  const ramo = b0 >= 0 && b1 > b0 ? rtc.slice(b0, b1) : ''
  chk('e. o grant consulta isDisposableEmail (a união) antes de qualquer outra guarda de escrita',
    g >= 0 && b0 > g && b1 > b0 && b1 < rtc.indexOf('if (CARD_ENTRY_ONLY) {', g) && b1 < rtc.indexOf('evaluateTrialFingerprint(db', g))
  chk("e. o ramo grava o evento trial_blocked_disposable_email", ramo.includes("name: 'trial_blocked_disposable_email'"))
  const meta = (ramo.match(/metadata:\s*\{([^}]*)\}/) || [])[1] ?? ''
  chk("e. metadata leva reason 'disposable_email' e o DOMÍNIO", meta.includes("reason: 'disposable_email'") && meta.includes('domain: dominioDoEmail(args.email)'))
  const metaSemDominio = meta.split('dominioDoEmail(args.email)').join('')
  chk('e. metadata NÃO leva o e-mail (nem args.email, nem campo email)',
    meta !== '' && !metaSemDominio.includes('args.email') && !/(^|[\s,{])e?mail\s*[:,}]|(^|[\s,{])email\s*$/.test(metaSemDominio) && !/user\.email|\bemail\s*:/.test(metaSemDominio))
  const logs = ramo.split('\n').filter((l) => l.includes('console.'))
  chk('e. os logs do ramo não imprimem o e-mail', logs.length > 0 && logs.every((l) => !l.includes('args.email')))
  chk("e. a marca espelha o ramo de digital: trial_status='blocked' com a guarda .is('trial_status', null)",
    /\.update\(\{ trial_status: 'blocked' \}\)[\s\S]{0,120}\.is\('trial_status', null\)/.test(ramo))
  chk('e. o evento sai na transição (ou se a marca falhar) — login repetido não duplica',
    /if \(marked \|\| marcaDescErr\) \{[\s\S]{0,80}writeServerEvent\(/.test(ramo) && ramo.includes('marcadas.length > 0'))
  const dom = srv.dominioDoEmail ? tenta(srv.dominioDoEmail, '  Joao.Silva@OmanArts.com ') : 'ausente'
  chk(`e. dominioDoEmail devolve só o domínio (${JSON.stringify(dom)})`, dom === 'omanarts.com')
  chk('e. o usuário não vê nada novo: o ramo continua devolvendo disposable_email em silêncio', b1 > b0 && !ramo.includes('throw '))

  // o evento é só-servidor: o sink público do navegador não pode cunhá-lo
  const ev = f.events
  const i = ev.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  const lit = i >= 0 ? ev.slice(ev.indexOf('[', i), ev.indexOf('])', i) + 1).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n') : '[]'
  let so = []
  try { so = Function(`"use strict"; return (${lit})`)() } catch { so = [] }
  chk('e. trial_blocked_disposable_email está em SERVER_ONLY_EVENTS (app/api/events/route.ts)', so.includes('trial_blocked_disposable_email'))

  // ── (f) toda porta de conta nova passa pelo grant (onde a união vive) ────
  const cb = semComentario(f.callback)
  chk('f. /auth/callback (OAuth + confirmação por e-mail) chama o grant com o e-mail do usuário',
    cb.includes('await maybeActivateReverseTrial({') && cb.includes('email: data.user.email ?? null,'))
  chk('f. /api/auth/activation-completed (cadastro por senha auto-confirmado) chama o grant',
    semComentario(f.activation).includes('await maybeActivateReverseTrial({'))

  return falhas
}

const real = {
  pura: ler('lib/emailValidation.ts'),
  rt: ler('lib/reverseTrial.ts'),
  modal: ler('components/AuthModal.tsx'),
  signup: ler('app/(auth)/signup/page.tsx'),
  events: ler('app/api/events/route.ts'),
  callback: ler('app/auth/callback/route.ts'),
  activation: ler('app/api/auth/activation-completed/route.ts'),
}

console.log('\n═══ DOMÍNIOS DESCARTÁVEIS — uma lista, três portas (tela, modal, servidor) ═══\n')
const falhasReais = avaliar(real, true)

// ── mutantes em memória: cada um TEM de derrubar a seção que ataca ─────────
function trocar(src, de, para) {
  const n = src.split(de).length - 1
  if (n !== 1) return null // mutante que não aplica não prova nada
  return src.split(de).join(para)
}
const mutantes = [
  {
    nome: 'servidor sem a lista pura (a união some)',
    secao: 'b.',
    f: { ...real, rt: trocar(real.rt, " || isDisposableEmailDaTela(email ?? '')", '') },
  },
  {
    nome: 'AuthModal sem o check',
    secao: 'd. components/AuthModal.tsx',
    f: { ...real, modal: trocar(real.modal, 'if (isDisposableEmail(email)) {', 'if (false && isDisposableEmail(email)) {') },
  },
  {
    nome: 'evento com o e-mail inteiro',
    secao: 'e.',
    f: { ...real, rt: trocar(real.rt, 'domain: dominioDoEmail(args.email), marked }', 'domain: dominioDoEmail(args.email), email: args.email, marked }') },
  },
  {
    nome: 'lista pura sem casamento de subdomínio',
    secao: 'a.',
    f: { ...real, pura: trocar(real.pura, "  return Array.from(DISPOSABLE_DOMAINS).some((d) => domain.endsWith('.' + d))", '  return false') },
  },
  {
    nome: 'lista pura sem tirar o ponto final de FQDN',
    secao: 'a.',
    f: { ...real, pura: trocar(real.pura, "    .replace(/\\.+$/, '')\n", '') },
  },
  {
    nome: 'relay entra na lista (duck.com)',
    secao: 'c.',
    f: { ...real, pura: trocar(real.pura, "  'omanarts.com',", "  'omanarts.com',\n  'duck.com',") },
  },
  {
    nome: 'marca sem a guarda de trial_status NULL (sobrescreveria trial real)',
    secao: 'e.',
    f: { ...real, rt: trocar(real.rt, "          .update({ trial_status: 'blocked' })\n          .eq('id', args.userId)\n          .is('trial_status', null)\n          .select('id')", "          .update({ trial_status: 'blocked' })\n          .eq('id', args.userId)\n          .select('id')") },
  },
]

console.log('\n── mutantes (cada um tem de ficar vermelho na seção que ataca) ──')
let mutantesFalhos = 0
for (const m of mutantes) {
  const aplicou = Object.keys(m.f).every((k) => m.f[k] !== null)
  const difere = aplicou && Object.keys(m.f).some((k) => m.f[k] !== real[k])
  const falhas = aplicou && difere ? avaliar(m.f) : []
  const morde = falhas.some((x) => x.startsWith(m.secao))
  if (aplicou && difere && morde) console.log(`  ✓ mutante "${m.nome}" → vermelho (${falhas.length} falha(s), ex.: ${falhas.find((x) => x.startsWith(m.secao))})`)
  else { mutantesFalhos++; console.log(`  ✗ mutante "${m.nome}" ${!aplicou ? 'NÃO APLICOU (âncora sumiu)' : !difere ? 'não mudou a fonte' : 'passou verde — o guardião não morde'}`) }
}

const total = falhasReais.length + mutantesFalhos
console.log(`\n═══ fonte real: ${falhasReais.length} falha(s) · mutantes: ${mutantes.length - mutantesFalhos}/${mutantes.length} mordidos ═══\n`)
process.exit(total === 0 ? 0 : 1)
