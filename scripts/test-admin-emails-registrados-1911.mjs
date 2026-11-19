// KINEO-ADMIN-EMAILS-1911 [CEO 19/11, achado da Div. 5]: o cadastro confirma o e-mail sozinho (303 de 303 contas em 14 dias),
// então um endereço que está numa lista de ADMIN ou de ensaio e NÃO tem conta registrada é uma porta: quem o cadastrar vira admin
// (lê clientes, exporta afiliados, dispara e-mail em massa, roda motor pago). Em 19/11 havia dois assim em 56 arquivos:
// o Gmail do dono escrito com um "s" e uma conta de teste antiga. Este guardião trava a volta deles e limita as listas de
// privilégio aos endereços que EXISTEM no banco (conferidos por SELECT em 19/11). Endereço novo só entra aqui depois de registrado.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
let ok = 0, falha = 0
const checa = (c, m) => { if (c) { ok++; console.log('  ok  ', m) } else { falha++; console.log('  FALHA', m) } }
const PROIBIDOS = ['josephskaf@gmail.com', 'joseph-test@shortsforgeai.com']
const REGISTRADOS = new Set(['josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'joseph@usekineo.com', 'victoriaskaf96@gmail.com', 'ramonwilliamson@gmail.com'])
const arquivos = execFileSync('git', ['ls-files', 'app', 'lib', 'components', 'middleware.ts'], { encoding: 'utf8' }).split('\n').filter(f => /\.(ts|tsx|mjs|js)$/.test(f))
const fontes = new Map(arquivos.map(f => [f, readFileSync(f, 'utf8')]))
const comProibido = (mapa) => [...mapa].filter(([, s]) => PROIBIDOS.some(e => s.includes(e))).map(([f]) => f)
checa(comProibido(fontes).length === 0, 'nenhum endereço sem conta em app/, lib/ ou components/: ' + comProibido(fontes).slice(0, 3).join(', '))
// Toda lista de privilégio (ADMIN_EMAILS, DRY_RUN_EMAILS, dryRunEmails) só com endereço registrado.
const LISTA = /(?:ADMIN_EMAILS|DRY_RUN_EMAILS|dryRunEmails)\s*(?::[^=]+)?=\s*new Set\(\[([\s\S]*?)\]\)/g
const foraDaLista = (mapa) => { const ruins = []; for (const [f, s] of mapa) for (const m of s.matchAll(LISTA)) for (const e of m[1].matchAll(/'([^']+@[^']+)'/g)) if (!REGISTRADOS.has(e[1])) ruins.push(f + ': ' + e[1]); return ruins }
const listas = [...fontes].filter(([, s]) => LISTA.test(s) || (LISTA.lastIndex = 0, false)).length
checa(listas >= 20, 'as listas de privilégio foram achadas (' + listas + ' arquivos)')
checa(foraDaLista(fontes).length === 0, 'lista de privilégio só com endereço registrado: ' + foraDaLista(fontes).slice(0, 3).join(' | '))
// Mutantes: recolocar um endereço sem conta numa lista fica vermelho pelas duas regras.
const alvo = 'app/api/admin/_shared/db.ts'
const mutante = new Map(fontes); mutante.set(alvo, fontes.get(alvo).replace("'josephsskaf@gmail.com',", "'josephsskaf@gmail.com',\n  'josephskaf@gmail.com',"))
checa(mutante.get(alvo) !== fontes.get(alvo) && comProibido(mutante).includes(alvo), 'mutante: o Gmail com um "s" de volta ao admin fica vermelho')
const mutante2 = new Map(fontes); mutante2.set(alvo, fontes.get(alvo).replace("'josephsskaf@gmail.com',", "'josephsskaf@gmail.com',\n  'alguem.novo@gmail.com',"))
checa(foraDaLista(mutante2).some(x => x.includes('alguem.novo@gmail.com')), 'mutante: endereço novo sem registro numa lista de admin fica vermelho')
console.log('\n' + ok + ' ok, ' + falha + ' falha(s)'); process.exit(falha ? 1 : 0)
