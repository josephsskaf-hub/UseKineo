// KINEO-CRON-ORIGEM-2610 — DESFAZ, em memória, esta entrega nos arquivos que ela MODIFICOU, para guardiões que conferem arquivos BYTE A BYTE
// contra uma base anterior. Diff REVERSO exato (contexto 3): cada bloco de AGORA aparece UMA vez e volta a ser o de ANTES.
// Arquivo fora da lista ou sem a marca volta igual. É a camada mais nova destes arquivos — desfaça ESTA primeiro.
export const MARCA = 'KINEO-CRON-ORIGEM-2610'
export const BASE = 'a99db103f983ee6aaf9ff962e6455bafd0502670'
const DESFAZ = {"app/api/cron/autopilot-generate/route.ts":[{"before":["import { mintUserSession, type UserSession } from '@/lib/autopilot/session'","import { buildAutopilotPrompt, pickTopic, recentTopicsForSchedule } from '@/lib/autopilot/topics'","import { isInternalEmail } from '@/lib/internalAccounts'","import { kidsPass, type KidsPassSummary } from '@/lib/kidsVenda/cron' // KINEO-KIDS-VENDA-2010 — passe 3: os desenhos infantis vendidos (piloto/pack/amostra) no MESMO cron horário (nenhuma entrada nova de cron; mesma sessão-como-a-pessoa)","","export const dynamic = 'force-dynamic'"],"now":["import { mintUserSession, type UserSession } from '@/lib/autopilot/session'","import { buildAutopilotPrompt, pickTopic, recentTopicsForSchedule } from '@/lib/autopilot/topics'","import { isInternalEmail } from '@/lib/internalAccounts'","import { cronSelfOrigin } from '@/lib/cronSelfOrigin' // KINEO-CRON-ORIGEM-2610","import { kidsPass, type KidsPassSummary } from '@/lib/kidsVenda/cron' // KINEO-KIDS-VENDA-2010 — passe 3: os desenhos infantis vendidos (piloto/pack/amostra) no MESMO cron horário (nenhuma entrada nova de cron; mesma sessão-como-a-pessoa)","","export const dynamic = 'force-dynamic'"]},{"before":["","  // A origem da própria request: mantém preview deploys funcionando e evita","  // depender de NEXT_PUBLIC_APP_URL estar certo em cada ambiente.","  const baseUrl = req.nextUrl.origin","  const deadline = Date.now() + WALL_CLOCK_BUDGET_MS","  // Uma sessão por usuário por invocação, compartilhada pelos dois passes.","  const sessions = new Map<string, UserSession | null>()"],"now":["","  // A origem da própria request: mantém preview deploys funcionando e evita","  // depender de NEXT_PUBLIC_APP_URL estar certo em cada ambiente.","  // KINEO-CRON-ORIGEM-2610 — o cron da Vercel chega pelo endereço *.vercel.app, que tem a Proteção de Deploy (SSO) ligada","  // KINEO-CRON-ORIGEM-2610 — em \"todos menos domínios próprios\": toda chamada interna voltava 401 da própria Vercel","  // KINEO-CRON-ORIGEM-2610 — (kids_runs \"story_401: [object Object]\" desde 23/10). Em produção usa o domínio público.","  const baseUrl = cronSelfOrigin(req.nextUrl.origin, process.env.VERCEL_ENV) // KINEO-CRON-ORIGEM-2610","  const deadline = Date.now() + WALL_CLOCK_BUDGET_MS","  // Uma sessão por usuário por invocação, compartilhada pelos dois passes.","  const sessions = new Map<string, UserSession | null>()"]}]}
export function semCronOrigem2610(text, rel) {
  const original = String(text)
  const crlf = original.includes('\r\n')
  let s = original.replace(/\r\n/g, '\n')
  const hunks = DESFAZ[String(rel).replace(/\\/g, '/')]
  if (!hunks || !s.includes(MARCA)) return original
  for (const h of hunks) {
    const parts = s.split(h.now.join('\n'))
    if (parts.length !== 2) throw new Error('semCronOrigem2610: ' + rel + ' mudou fora da camada (' + (parts.length - 1) + 'x)')
    s = parts.join(h.before.join('\n'))
  }
  if (s.includes(MARCA)) throw new Error('semCronOrigem2610: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
export const ARQUIVOS = Object.keys(DESFAZ)
