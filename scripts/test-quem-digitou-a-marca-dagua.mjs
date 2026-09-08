#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// GUARDIÃO — QUEM DIGITOU A MARCA D'ÁGUA (07/09/2026)
//
// A marca d'água queimada em todo render grátis (`usekineo.com/free`) é a única
// superfície de distribuição que a casa POSSUI: ela viaja em cada Short que um
// usuário publica. Medido em 07/09: `watermark_landing` = 45 chegadas / 30 dias
// / 14 países, e `profiles.signup_utm_source='watermark'` = **0** em 832
// cadastros. Só 2 visitantes de 30 dias carregam `utm_source=watermark` em
// qualquer evento.
//
// O 45 mistura duas coisas que exigem decisões OPOSTAS: gente que digitou a URL
// e não se cadastrou (problema de página) × varredores que não executam JS
// (denominador de ficção). Este guardião protege os dois campos que separam as
// duas, e — mais importante — protege o CONTRATO da rota, que vale mais que a
// medição: o redirect tem de acontecer sempre, o cookie de first-touch tem de
// ser gravado, e nada de PII pode entrar na tabela.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const rota = read('app/free/route.ts')

let ok = 0
let bad = 0
const check = (c, m) => { if (c) { ok += 1; console.log(`  ✓ ${m}`) } else { bad += 1; console.log(`  ✗ ${m}`) } }

console.log('\n[1] Os dois campos que separam gente de varredor')
check(/browser_session: hasEventSession/.test(rota), 'a chegada carimba se o navegador ja executou nosso JS')
check(/client_class: clientClass/.test(rota), 'a chegada carimba a CLASSE do cliente')
check(
  /const hasEventSession = Boolean\(req\.cookies\.get\('kineo_event_session_id'\)\?\.value\)/.test(rota),
  'a prova de navegador vem do cookie do proprio analytics, nao de heuristica',
)
check(
  /'browser' \| 'bot' \| 'unknown'/.test(rota),
  'a classe tem TRES valores — "nao sei" e um resultado, nao um chute',
)

console.log('\n[2] Nada de PII entra na tabela')
// O user-agent pode ser LIDO para derivar a classe; o que não pode é ser
// GRAVADO. A trava olha só o objeto de metadata do evento.
const meta = rota.slice(rota.indexOf("name: 'watermark_landing'"), rota.indexOf('new Promise<boolean>'))
check(meta.length > 0, 'o objeto de metadata da chegada foi encontrado')
check(!/user_agent|userAgent|\bua\b\s*[,:]/.test(meta), 'o user-agent NAO e gravado — so a classe derivada')
check(!/\bip\b|x-forwarded-for|x-real-ip/.test(meta), 'nenhum IP entra na tabela')
check(/country: country\.slice\(0, 4\)/.test(meta), 'o pais continua truncado')
check(/referrer_host: referrer/.test(meta), 'o referer continua reduzido ao host')

console.log('\n[3] O contrato da rota, que vale mais que a medicao')
check(/const res = NextResponse\.redirect|NextResponse\.redirect\(/.test(rota), 'a rota redireciona')
check(
  rota.indexOf('NextResponse.redirect') < rota.indexOf("name: 'watermark_landing'"),
  'o redirect e montado ANTES da escrita — nenhuma falha de analytics tira a pessoa do produto',
)
check(/res\.cookies\.set\(/.test(rota) && /httpOnly: true/.test(rota), 'o cookie de first-touch continua sendo gravado')
check(/EVENT_TIMEOUT_MS/.test(rota) && /Promise\.race/.test(rota), 'a escrita continua com timeout')
check(/catch \(err\)/.test(rota), 'o catch externo continua garantindo o redirect')

console.log('\n[M] Mutantes')
const MUT = [
  {
    nome: 'a classe vira binaria (perde o "nao sei")',
    de: "'browser' | 'bot' | 'unknown'",
    para: "'browser' | 'bot'",
    trava: (t) => /'browser' \| 'bot' \| 'unknown'/.test(t),
  },
  {
    nome: 'a prova de navegador vira heuristica de user-agent',
    de: "const hasEventSession = Boolean(req.cookies.get('kineo_event_session_id')?.value)",
    para: 'const hasEventSession = ua.length > 0',
    trava: (t) => /const hasEventSession = Boolean\(req\.cookies\.get\('kineo_event_session_id'\)\?\.value\)/.test(t),
  },
  {
    nome: 'o user-agent cru passa a ser gravado',
    de: 'client_class: clientClass,',
    para: 'client_class: clientClass,\n              user_agent: ua,',
    trava: (t) => {
      const m = t.slice(t.indexOf("name: 'watermark_landing'"), t.indexOf('new Promise<boolean>'))
      return !/user_agent|userAgent/.test(m)
    },
  },
]

const CAMINHO = join(ROOT, 'app/free/route.ts')
for (const m of MUT) {
  const original = readFileSync(CAMINHO, 'utf8')
  const normal = original.replace(/\r\n/g, '\n')
  if (!normal.includes(m.de)) { bad += 1; console.log(`  ✗ mutante NAO ANCOROU: ${m.nome}`); continue }
  const mutado = normal.replace(m.de, m.para)
  if (mutado === normal) { bad += 1; console.log(`  ✗ mutante NAO ALTEROU: ${m.nome}`); continue }
  readFileSync // no-op para deixar claro que a leitura abaixo e nova
  const fs = await import('node:fs')
  fs.writeFileSync(CAMINHO, mutado, 'utf8')
  try {
    const relido = read('app/free/route.ts')
    if (relido === normal) { bad += 1; console.log(`  ✗ mutante NAO FOI ESCRITO: ${m.nome}`); continue }
    if (m.trava(relido)) { bad += 1; console.log(`  ✗ mutante SOBREVIVEU: ${m.nome}`) }
    else { ok += 1; console.log(`  ✓ mutante morto: ${m.nome}`) }
  } finally {
    fs.writeFileSync(CAMINHO, original, 'utf8')
  }
}

console.log('\n[R] Restauracao')
check(/browser_session: hasEventSession/.test(read('app/free/route.ts')), 'a rota voltou ao original')

console.log(`\n${ok} ok / ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
