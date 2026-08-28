// KINEO-JWT-SKEW-2026-08-28 — provas do resgate contra o relógio torto do
// Supabase (PGRST303 "JWT issued at future", incidente de 28/08 que derrubou
// 100% dos cadastros novos que tentaram gerar e mostrou "No videos yet" para
// o fundador com 327 vídeos no banco).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, falhou = 0
const check = (n, c, d = '') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { falhou++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`) } }
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8')
const codigo = (p) => ler(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')

console.log('\n═══ JWT SKEW — o produto sobrevive ao relógio torto do Supabase ═══\n')

console.log('1) O detector')
const helper = ler('lib/jwtSkewFallback.ts')
check('reconhece PGRST303 e "jwt issued at future"',
  helper.includes("'PGRST303'") && helper.includes('jwt issued at future'))
check('só dispara em erro de JWT — RLS quebrada continua estourando',
  helper.includes('if (!isJwtSkewError(originalError)) return null'))
check('toda ativação vira log ruidoso (sintoma de Supabase doente)',
  helper.includes('restart the project'))

console.log('\n2) As 5 superfícies protegidas')
for (const [arq, rotulo] of [
  ['app/api/compose/route.ts', 'compose (o caminho do dinheiro)'],
  ['app/api/footage/route.ts', 'footage'],
  ['app/api/credits/route.ts', 'credits (o saldo que virou 0)'],
  ['lib/plan.ts', 'plan (o pagante que virou free)'],
]) {
  const c = codigo(arq)
  check(`${rotulo} usa retryOwnReadOnSkew`, c.includes('retryOwnReadOnSkew('))
  check(`${rotulo} filtra pelo id verificado`, /\.eq\('id', user(Id|\.id)\)/.test(c))
}
const vids = codigo('app/api/videos/route.ts')
check('videos (o "sumiram todos") usa o fallback', vids.includes('isJwtSkewError(') && vids.includes('skewFallbackClient()'))
check('videos refiltra por user_id verificado no fallback',
  (vids.match(/\.eq\('user_id', userId\)/g) ?? []).length >= 3)

console.log('\n3) Segurança do fallback')
check('nenhuma ESCRITA passa pelo fallback (só select)',
  !/retryOwnReadOnSkew\([\s\S]{0,400}?\.(update|insert|delete|upsert)\(/.test(
    ['app/api/compose/route.ts','app/api/footage/route.ts','app/api/credits/route.ts','lib/plan.ts'].map(codigo).join('\n')))
check('o compose mantém o 503 quando o fallback também falha',
  codigo('app/api/compose/route.ts').includes('Your video access could not be verified'))

console.log(`\n═══ ${ok} passaram, ${falhou} falharam ═══\n`)
process.exit(falhou === 0 ? 0 : 1)
