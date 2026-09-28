// Guardião: o anúncio v2 (videos.quality_mode 'ads_v2') não entra nas cartas genéricas de "seu Short".
// KINEO-ADS-V2-2026-09-28 — send-video-ready já excluía; send-momentum-nudge e trial-lifecycle-emails passam a excluir
// (filtro em memória: .neq no banco descartaria as linhas com quality_mode nulo).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8')
let ok = 0, falhas = 0
const check = (nome, cond) => { if (cond) ok++; else { falhas++; console.log('  FAIL', nome) } }

const CARTAS = [
  'app/api/cron/send-video-ready/route.ts',
  'app/api/cron/send-momentum-nudge/route.ts',
  'app/api/cron/trial-lifecycle-emails/route.ts',
]
for (const p of CARTAS) {
  const s = rd(p)
  check(`${p}: pula quality_mode 'ads_v2' com continue`, /quality_mode\s*===\s*'ads_v2'\s*\)\s*continue/.test(s))
  check(`${p}: não filtra ads_v2 com .neq no banco (descartaria nulos)`, !/\.neq\(\s*'quality_mode'\s*,\s*'ads_v2'\s*\)/.test(s))
}
check('send-momentum-nudge lê quality_mode na mesma consulta', /\.select\('user_id, created_at, topic, quality_mode'\)/.test(rd('app/api/cron/send-momentum-nudge/route.ts')))
check('trial-lifecycle-emails lê quality_mode na mesma consulta', /\.select\('user_id, topic, created_at, credits_used, duration, quality_mode'\)/.test(rd('app/api/cron/trial-lifecycle-emails/route.ts')))

console.log(`test-ads-v2-cartas-2026-09-29: ${ok} ok · ${falhas} falhas`)
process.exit(falhas ? 1 : 0)
