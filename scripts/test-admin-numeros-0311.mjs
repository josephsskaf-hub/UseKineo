// KINEO-ADMIN-NUMEROS-0311 [fundador 03/11: "coloca todos esses dados também no admin na 1ª página, lado esquerdo as pessoas que entram, lado direito os números da empresa"] — guardião.
// Sem rede: formatação, permissão da rota, uso da RPC com a lista interna por parâmetro e a posição das duas colunas no painel. Mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }

const N = createOfflineLoader()('lib/admin/numerosEmpresa.ts')
checa('sem dado vira "—", nunca zero', N.formataValor(null) === '—' && N.formataValor(undefined, '%') === '—' && N.formataValor('') === '—')
checa('zero real continua zero', N.formataValor(0) === '0')
checa('decimal com vírgula e sufixo', N.formataValor(6.7) === '6,7' && N.formataValor('42', '%') === '42%')
checa('dia curto', N.diaCurto('2026-11-03') === '03/11')
checa('hora de Brasília', N.entrouEm('2026-11-04T01:15:55Z') === '03/11 22:15')
checa('as colunas pedidas estão na ordem', N.COLUNAS.map((c) => c.chave).join() === 'hoje,ontem,d7,d10,media7,media7antes')
checa('todas as medidas da tabela aprovada', ['nota','visitas','chatgpt','cadastros','pais_que_paga','pct_com_filme','pct_baixou_primeiro','downloads','pagantes'].every((c) => N.LINHAS.some((l) => l.campo === c)))

async function chamaRota({ email = 'admin@x.test', admin = true } = {}) {
  const chamadas = []
  const db = { rpc: async (nome, args) => { chamadas.push({ nome, args }); return { data: { periodos: [], nota_dias: [], cadastros: [] }, error: null } } }
  const rota = createOfflineLoader({ mocks: {
    'next/server': { NextResponse: { json: (body, o = {}) => ({ status: o.status ?? 200, body }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: email ? { email } : null } }) } }) },
    '../_shared/db': { isAdminEmail: () => admin, serviceClient: () => db },
    '@/lib/internalAccounts': { INTERNAL_EXACT_EMAILS: ['a@x'], INTERNAL_LIKE_PATTERNS: ['%@y'] },
  } })('app/api/admin/numeros-empresa/route.ts')
  return { r: await rota.GET(), chamadas }
}
const fora = await chamaRota({ admin: false })
checa('quem não é admin recebe 403 e a RPC nem roda', fora.r.status === 403 && fora.chamadas.length === 0)
const dentro = await chamaRota()
checa('admin recebe os dados; lista interna vai por parâmetro', dentro.r.status === 200 && dentro.chamadas[0]?.nome === 'admin_numeros_empresa' && dentro.chamadas[0].args.p_exact_emails[0] === 'a@x' && dentro.chamadas[0].args.p_like_patterns[0] === '%@y')

const painel = fs.readFileSync('components/LiveNowPanel.tsx', 'utf8')
const iPessoas = painel.indexOf('<UltimosCadastros'), iNumeros = painel.indexOf('<NumerosDaEmpresa')
const duasColunas = (t) => /\.lnp-duas\{display:grid/.test(t) && /@media \(min-width:1180px\)\{\.lnp-duas\{grid-template-columns:minmax\(0,1\.25fr\) minmax\(0,1fr\)/.test(t)
checa('pessoas à esquerda, números à direita', iPessoas > 0 && iNumeros > iPessoas && painel.indexOf('data.recentes') < iPessoas)
checa('duas colunas em tela larga, uma em tela estreita', duasColunas(painel))
checa('mutante sem as duas colunas fica vermelho', !duasColunas(painel.replace('.lnp-duas{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)', '.lnp-duas{grid-template-columns:1fr')))
const M = createOfflineLoader({ source: (rel, t) => (rel === 'lib/admin/numerosEmpresa.ts' ? t.replace("return '—'\n", "return '0'\n").replace("return '—'\r\n", "return '0'\r\n") : t) })('lib/admin/numerosEmpresa.ts')
checa('mutante "sem dado vira zero" fica vermelho', M.formataValor(null) !== '—')

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde')
process.exit(falhas ? 1 : 0)
