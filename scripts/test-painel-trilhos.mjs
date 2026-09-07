// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO DO PAINEL DE TRILHOS — #11, 07/09/2026
// ═══════════════════════════════════════════════════════════════════════════
// O QUE ELE TRAVA, e por que cada trava existe:
//
//  1. O PORTÃO É ÚNICO. `localMethodFor` mora em lib/dodo.ts e é a ÚNICA
//     resposta para "esta pessoa vê o botão?". Se alguém recriar o mapa
//     país→método dentro de /api/geo (era assim até hoje), a tela e o painel
//     passam a discordar sem ninguém notar.
//  2. OS DOIS PORTÕES SÃO EXERCITADOS DE VERDADE. Este guardião IMPORTA
//     lib/dodo.ts (node 24 tira os tipos) e chama a função com env falsa —
//     não conta texto. Guardião que conta texto não prova condição: um mutante
//     que troca o `if` por `true` mantém a contagem intacta.
//  3. O PAINEL NUNCA ECOA VALOR DE CHAVE. Só nomes.
//  4. A VERDADE DO REDEPLOY ESTÁ ESCRITA onde o fundador lê (a resposta HTTP),
//     e não só num comentário. Esta é a razão da rotação existir.
//  5. O PAINEL É ADMIN-ONLY.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let ok = 0
const falhas = []
function checa(nome, cond) {
  if (cond) { ok++; console.log('  ok  ' + nome) }
  else { falhas.push(nome); console.log('  FALHA  ' + nome) }
}

const ler = (rel) => readFileSync(path.join(raiz, rel), 'utf8')
const dodoSrc = ler('lib/dodo.ts')
const geoSrc = ler('app/api/geo/route.ts')
const painelSrc = ler('app/api/admin/payment-rails/route.ts')
const packSrc = ler('components/RegionalFirstPack.tsx')

console.log('\n── 1. o portão é único (e vive em lib/dodo.ts) ──')
checa('lib/dodo.ts exporta localMethodFor', /export\s+function\s+localMethodFor\s*\(/.test(dodoSrc))
checa('lib/dodo.ts exporta METODO_LOCAL_POR_PAIS', /export\s+const\s+METODO_LOCAL_POR_PAIS\b/.test(dodoSrc))
// Amarrado à CHAMADA, não ao identificador solto: /localMethodFor/ casaria
// como substring dentro de um símbolo renomeado e não provaria nada.
checa('/api/geo CHAMA localMethodFor(', /\blocalMethodFor\s*\(/.test(geoSrc))
checa('/api/geo importa o portão de @/lib/dodo', /import\s*\{[^}]*\blocalMethodFor\b[^}]*\}\s*from\s*'@\/lib\/dodo'/.test(geoSrc))
checa('/api/geo NÃO guarda 2ª cópia do mapa', !/METODO_LOCAL_POR_PAIS\s*:\s*Record/.test(geoSrc) && !/const\s+METODO_LOCAL_POR_PAIS/.test(geoSrc))
checa('painel CHAMA localMethodFor(', /\blocalMethodFor\s*\(/.test(painelSrc))
checa('painel lê o mapa da fonte única', /\bMETODO_LOCAL_POR_PAIS\b/.test(painelSrc) && /from\s*'@\/lib\/dodo'/.test(painelSrc))

console.log('\n── 2. os dois portões, exercitados contra a variável que decide ──')
const dodo = await import(pathToFileURL(path.join(raiz, 'lib', 'dodo.ts')).href)
const SEM_CHAVE = {}
const COM_CHAVE = { DODO_API_KEY_TEST: 'sk_test_qualquer' }
checa('sem chave, Índia NÃO ganha método', dodo.localMethodFor('IN', SEM_CHAVE) === null)
checa('sem chave, Brasil NÃO ganha método', dodo.localMethodFor('BR', SEM_CHAVE) === null)
checa('com chave, Índia ganha upi', dodo.localMethodFor('IN', COM_CHAVE) === 'upi')
checa('com chave, Brasil ganha pix', dodo.localMethodFor('BR', COM_CHAVE) === 'pix')
// O 2º portão: país fora da lista não ganha método NEM com a chave. É a linha
// que impede a Nigéria de virar "outro processador do mesmo cartão".
checa('com chave, Nigéria NÃO ganha método', dodo.localMethodFor('NG', COM_CHAVE) === null)
checa('com chave, Paquistão NÃO ganha método', dodo.localMethodFor('PK', COM_CHAVE) === null)
checa('com chave, EUA NÃO ganha método', dodo.localMethodFor('US', COM_CHAVE) === null)
checa('país minúsculo normaliza (in → upi)', dodo.localMethodFor('in', COM_CHAVE) === 'upi')
checa('país nulo não explode', dodo.localMethodFor(null, COM_CHAVE) === null)
checa('isDodoEnabled é false sem chave', dodo.isDodoEnabled(SEM_CHAVE) === false)

console.log('\n── 3. o painel nunca ecoa valor de chave ──')
// Devolver process.env inteiro, ou qualquer fatia/comprimento de um valor,
// transformaria o painel num vazador de segredo.
checa('painel não serializa process.env inteiro', !/JSON\.stringify\(\s*process\.env/.test(painelSrc) && !/\.\.\.process\.env/.test(painelSrc))
checa('painel não devolve valor de env em campo', !/:\s*process\.env\[[^\]]+\]\s*[,}]/.test(painelSrc))
checa('painel não mede comprimento de chave', !/process\.env\[[^\]]*\]\s*\.length/.test(painelSrc) && !/\.length\s*\)\s*\/\/\s*chave/i.test(painelSrc))
checa('painel não fatia valor de chave', !/process\.env\[[^\]]*\]\s*[?.]*\.\s*slice/.test(painelSrc))
// Só as envs de identidade do deploy podem ser lidas por valor — elas são
// públicas por natureza (SHA, id do deploy, nome do ambiente).
const lidasPorValor = [...painelSrc.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1])
const permitidas = new Set(['VERCEL_GIT_COMMIT_SHA', 'VERCEL_DEPLOYMENT_ID', 'VERCEL_ENV'])
checa('só envs públicas do deploy são lidas por valor: ' + JSON.stringify(lidasPorValor.filter((n) => !permitidas.has(n))),
  lidasPorValor.every((n) => permitidas.has(n)))

console.log('\n── 4. a verdade do redeploy, onde o fundador lê ──')
// A rotação inteira existe porque esta frase estava ERRADA no código. Ela não
// pode voltar a ser "liga sozinho", e não pode viver só em comentário: tem de
// estar na RESPOSTA HTTP, que é o que o fundador abre às 21h.
checa('painel manda REDEPLOY na resposta', /passo_2[\s\S]{0,200}REDEPLOY/i.test(painelSrc))
checa('painel cita a regra da Vercel na resposta', /not applied to previous deployments/i.test(painelSrc))
checa('painel lista as envs que faltam por NOME', /envs_que_faltam/.test(painelSrc))
checa('lib/dodo.ts não promete mais "sem deploy novo"', !/liga sozinho\s*—\s*sem deploy novo/.test(dodoSrc))
checa('lib/dodo.ts registra a correção', /not applied to previous deployments/i.test(dodoSrc))
checa('RegionalFirstPack não promete mais "liga sozinho"', !/O botão nasce e liga sozinho quando a chave entrar/.test(packSrc))
checa('/api/geo avisa do redeploy', /deploy novo|deploys? NOVOS/i.test(geoSrc))

console.log('\n── 5. o painel é admin-only ──')
checa('painel checa isAdminEmail', /\bisAdminEmail\s*\(/.test(painelSrc))
checa('painel responde 403 a não-admin', /status:\s*403/.test(painelSrc))
checa('painel usa getUser (token verificado)', /auth\.getUser\s*\(/.test(painelSrc))
checa('painel é force-dynamic', /export const dynamic = 'force-dynamic'/.test(painelSrc))

console.log('\n══════════════════════════════════════════')
console.log(ok + ' verificações ok, ' + falhas.length + ' falhas')
if (falhas.length) { falhas.forEach((f) => console.log('  · ' + f)); process.exit(1) }
console.log('GUARDIÃO DO PAINEL DE TRILHOS: VERDE')
