// KINEO-SHOPIFY-2026-10-13 (etapa 2) — DESFAZ a extração do /api/ads/v2/plan e do /api/ads/v2/start (módulo auxiliar dos
// guardiões; não é teste: o nome não começa com test-).
//
// O corpo das duas rotas foi movido, linha por linha, para lib/ads/v2PlanCore.ts (adsV2PlanFor) e lib/ads/v2StartCore.ts
// (adsV2StartFor). A rota ficou com o login (cookie) e o acesso do workspace, e chama o núcleo. Esta função remonta, a partir
// dos DOIS arquivos de hoje, o texto EXATO da rota de antes. As únicas costuras que ela desfaz são as da extração:
//   · o cabeçalho de 4 linhas KINEO-SHOPIFY da rota e o de 6 linhas do núcleo;
//   · os imports (o núcleo não lê cookie: sem createClient; recebe o acesso pronto: `type AdsAccessLoad`; o /start importa o
//     tipo AdsV2Caller do /plan);
//   · a assinatura da função e o `return await adsV2…For(user, access, () => req.json().catch(() => null), started)`;
//   · `await readBody()` ⇄ `await req.json().catch(() => null)`;
//   · no /plan, a linha do OPENAI_API_KEY e a desestruturação do acesso, que voltam ao lugar de antes.
// Qualquer outra diferença (uma vírgula no débito, uma trava a menos) muda a impressão digital do texto remontado: os guardiões
// que conferem o /start byte a byte (ator, estilos, ux-marca) e o de equivalência (test-shopify-app-1310) ficam vermelhos.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// reancorado KINEO-LEVA6-1310 — com a cena e os atores IA juntos no núcleo do /plan, o desfazer em memória tira AS DUAS levas de
// linhas marcadas (semCena + desfazAtoresIa: a chamada do ator volta à de antes e as 2 linhas KINEO-ATORES-IA-2026-10-13 saem).
// desfazAtoresIa é idempotente (sem a chamada nova, devolve o texto igual): quem ainda a aplica por fora segue igual.
import { desfazAtoresIa } from './desfaz-atores-ia-1310.mjs'
// reancorado KINEO-ADS-ROTEIROS-2026-10-13 — os 2 a 3 roteiros entraram no núcleo do /plan só por linhas inteiras marcadas;
// semRoteiros as tira (terceira leva, depois da cena e dos atores IA).
import { semRoteiros } from './desfaz-roteiros-1310.mjs'

const linhas = (s) => s.replace(/\r\n/g, '\n').split('\n')
const achar = (arr, pred, desc) => {
  const i = arr.findIndex(pred)
  if (i < 0) throw new Error(`desfazExtracao: sem ${desc}`)
  return i
}

// KINEO-ADS-CENA-2026-10-13 — a cena do anúncio de produto entrou no núcleo do /plan (e no /orders e /research) SÓ como
// linhas inteiras novas, cada uma com a marca: semCena tira EXATAMENTE essas linhas e o texto de antes volta byte a byte (o
// /start não tem nenhuma). scripts/test-ads-cena-1310.mjs confere que as linhas marcadas são só as esperadas.
export const MARCA_CENA = 'KINEO-ADS-CENA-2026-10-13'
export const semCena = (s) => String(s).replace(/\r\n/g, '\n').split('\n').filter((l) => !l.includes(MARCA_CENA)).join('\n')

/** O texto da rota de ANTES (LF), remontado de route.ts + núcleo. kind = 'plan' | 'start'. Lança se faltar uma costura. */
export function desfazExtracao(kind, routeText, coreText) {
  const R = linhas(semCena(routeText))
  const C = linhas(semRoteiros(desfazAtoresIa(semCena(coreText)))) // reancorado KINEO-LEVA6-1310 — as duas levas marcadas · reancorado KINEO-ADS-ROTEIROS-2026-10-13 — + os roteiros
  const marca = achar(R, (l) => l.startsWith('// KINEO-SHOPIFY-2026-10-13 (etapa 2) — o corpo foi EXTRAÍDO'), 'marca da rota')
  if (R[marca - 1] !== '//') throw new Error('desfazExtracao: linha // antes da marca')
  const header = R.slice(0, marca - 1)
  const rNextReq = achar(R, (l) => l === "import { NextRequest } from 'next/server'", 'NextRequest')
  const createClientLine = "import { createClient } from '@/lib/supabase/server'"
  const cTypeResp = achar(C, (l) => l === "import type { NextResponse } from 'next/server'", 'NextResponse no núcleo')
  const cImpEnd = C.indexOf('', cTypeResp)
  const imports = C.slice(cTypeResp + 1, cImpEnd)
    .filter((l) => l !== "import type { AdsV2Caller } from '@/lib/ads/v2PlanCore'")
    .map((l) => {
      if (!/from '@\/lib\/ads\/serverAccess'$/.test(l) || !l.includes(', type AdsAccessLoad')) return l
      const sem = l.replace(', type AdsAccessLoad', '')
      return sem.includes('loadAdsAccess') ? sem : sem.replace('isMissingAdsTable }', 'isMissingAdsTable, loadAdsAccess }')
    })
  imports.splice(kind === 'start' ? 1 : 0, 0, createClientLine)
  const rExport = achar(R, (l) => l.startsWith('export const runtime'), 'exports da rota')
  const rPost = achar(R, (l) => l === 'export async function POST(req: NextRequest) {', 'POST da rota')
  const exportsBlock = R.slice(rExport - 1, rPost) // '', 4 exports, ''
  const rTry = achar(R, (l) => l === '  try {', 'try da rota')
  const rAccess = achar(R, (l) => l === '    const access = await loadAdsAccess(user.id, user.email, { workspace: true })', 'acesso da rota')
  const rCall = R[rAccess + 1]
  const chamada = kind === 'plan'
    ? '    return await adsV2PlanFor(user, access, () => req.json().catch(() => null), started)'
    : '    return await adsV2StartFor(user, access, () => req.json().catch(() => null), started)'
  if (rCall !== chamada) throw new Error('desfazExtracao: chamada ao núcleo diferente')
  const assinatura = kind === 'plan'
    ? 'export async function adsV2PlanFor(user: AdsV2Caller, access: AdsAccessLoad, readBody: () => Promise<unknown>, started: number = Date.now()): Promise<NextResponse> {'
    : 'export async function adsV2StartFor(user: AdsV2Caller, access: AdsAccessLoad, readBody: () => Promise<unknown>, started: number = Date.now()): Promise<NextResponse> {'
  const cFn = achar(C, (l) => l === assinatura, 'assinatura do núcleo')
  const restore = (l) => l.split('await readBody()').join('await req.json().catch(() => null)')
  const out = [...header, R[rNextReq], ...imports, ...exportsBlock]
  if (kind === 'plan') {
    if (C[cFn + 1] !== '  try {' || C[cFn + 2] !== "    if (!process.env.OPENAI_API_KEY) return v2Fail('unavailable', 503)" || C[cFn + 3] !== '    const { admin, reason, ...ws } = access') throw new Error('desfazExtracao: cabeça do núcleo do /plan')
    out.push(...R.slice(rPost, rAccess), C[cFn + 2], '    const { admin, reason, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })', ...C.slice(cFn + 4).map(restore))
  } else {
    const budget = achar(C, (l) => l === '/** Prazo para abrir envios novos nesta chamada (o resto sai pelo avanço da tela/cron). */', 'prazo do /start')
    out.splice(out.length - 1, 0, '', C[budget], C[budget + 1])
    if (C[cFn + 3] !== '  try {') throw new Error('desfazExtracao: cabeça do núcleo do /start')
    out.push(R[rPost], R[rPost + 1], C[cFn + 1], C[cFn + 2], C[cFn + 3], ...R.slice(rTry + 1, rAccess + 1), ...C.slice(cFn + 4).map(restore))
  }
  return out.join('\n')
}

/** O mesmo, lendo os arquivos da árvore `raiz`. */
export function textoOriginalV2(kind, raiz) {
  const route = readFileSync(join(raiz, `app/api/ads/v2/${kind}/route.ts`), 'utf8')
  const core = readFileSync(join(raiz, kind === 'plan' ? 'lib/ads/v2PlanCore.ts' : 'lib/ads/v2StartCore.ts'), 'utf8')
  return desfazExtracao(kind, route, core)
}
