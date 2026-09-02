// sprint-assinaturas #23 — 02/09/2026 — a escada do momentum e o resgate.
// (A) lib/momentumLadder.ts: carimbo POR DEGRAU (1→2→3), folga de 7d,
//     falha fechada em carimbo antigo sem degrau, contagem que regride nao
//     manda; janela so alarga (96h..720h), nunca encurta.
// (B) a rota usa a escada (nao o Set por pessoa), aceita sessao de admin,
//     grava o degrau no carimbo e o cron do vercel.json NAO manda max_idle_h.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(R, 'package.json'))
const ts = require('typescript')
const out = mkdtempSync(join(tmpdir(), 'ladder-'))
const js = ts.transpileModule(readFileSync(join(R, 'lib/momentumLadder.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText
writeFileSync(join(out, 'ladder.mjs'), js)
const L = await import(pathToFileURL(join(out, 'ladder.mjs')).href)

let ok = 0, bad = 0
const t = (name, cond) => { if (cond) { ok++; console.log('  ✓', name) } else { bad++; console.log('  ✗', name) } }
const H = 3600_000, D = 24 * H
const now = Date.parse('2026-09-02T13:30:00Z')
const at = (daysAgo, videos) => ({ created_at: new Date(now - daysAgo * D).toISOString(), videos })

console.log('A) escada')
t('sem carimbo, 1 video → manda', L.momentumSkipReason([], 1, now) === null)
t('sem carimbo, 3 videos → manda', L.momentumSkipReason([], 3, now) === null)
t('sem carimbo, 4 videos → nao manda (fora da escada)', L.momentumSkipReason([], 4, now) === 'same_step')
t('sem carimbo, 0 videos → nao manda', L.momentumSkipReason([], 0, now) === 'same_step')
t('carimbo no degrau 1, ainda com 1 video → same_step (parado = silencio)', L.momentumSkipReason([at(10, 1)], 1, now) === 'same_step')
t('carimbo no degrau 1 ha 10d, subiu para 2 → manda', L.momentumSkipReason([at(10, 1)], 2, now) === null)
t('carimbo no degrau 1 ha 3d, subiu para 2 → too_soon (folga 7d)', L.momentumSkipReason([at(3, 1)], 2, now) === 'too_soon')
t('carimbo ha exatamente 7d, subiu → manda', L.momentumSkipReason([at(7, 1)], 2, now) === null)
t('carimbos 1 e 2 (8d e 15d), agora 3 → manda', L.momentumSkipReason([at(15, 1), at(8, 2)], 3, now) === null)
t('carimbos 1 e 2, agora 2 → same_step', L.momentumSkipReason([at(15, 1), at(8, 2)], 2, now) === 'same_step')
t('carimbo no degrau 2, contagem regrediu para 1 → same_step (nao e subida)', L.momentumSkipReason([at(20, 2)], 1, now) === 'same_step')
t('carimbo antigo sem degrau (videos null) → legacy_stamp (falha fechada)', L.momentumSkipReason([at(20, null)], 2, now) === 'legacy_stamp')
t('folga configuravel: 3d de gap com carimbo ha 3d → manda', L.momentumSkipReason([at(3, 1)], 2, now, 3) === null)
t('created_at invalido nao quebra: degrau diferente → manda', L.momentumSkipReason([{ created_at: 'x', videos: 1 }], 2, now) === null)
t('MOMENTUM_MAX_STEP = 3', L.MOMENTUM_MAX_STEP === 3)
t('MOMENTUM_MIN_GAP_DAYS = 7', L.MOMENTUM_MIN_GAP_DAYS === 7)

console.log('B) palavra')
t('1 → three', L.videosAwayWord(1) === 'three')
t('2 → two', L.videosAwayWord(2) === 'two')
t('3 → one', L.videosAwayWord(3) === 'one')
t('4 → null (nunca inventa)', L.videosAwayWord(4) === null)

console.log('C) janela')
const base = L.resolveIdleWindow(null)
t('padrao = 20-96h, rescue=false', base.minIdleH === 20 && base.maxIdleH === 96 && base.rescue === false)
t('vazio = padrao', JSON.stringify(L.resolveIdleWindow('')) === JSON.stringify(base))
t('lixo = padrao', JSON.stringify(L.resolveIdleWindow('abc')) === JSON.stringify(base))
t('menor que 96 NAO encurta (10 → 96)', L.resolveIdleWindow('10').maxIdleH === 96 && !L.resolveIdleWindow('10').rescue)
t('96 = padrao (nao e resgate)', !L.resolveIdleWindow('96').rescue)
t('720 → 720, rescue=true, min continua 20', (() => { const w = L.resolveIdleWindow('720'); return w.maxIdleH === 720 && w.rescue && w.minIdleH === 20 })())
t('99999 → teto 720 (30d)', L.resolveIdleWindow('99999').maxIdleH === 720)
t('negativo = padrao', !L.resolveIdleWindow('-5').rescue)
t('MOMENTUM_RESCUE_MAX_IDLE_H = 720', L.MOMENTUM_RESCUE_MAX_IDLE_H === 720)

console.log('D) rota')
const route = readFileSync(join(R, 'app/api/cron/send-momentum-nudge/route.ts'), 'utf8')
t('importa a escada', /from '@\/lib\/momentumLadder'/.test(route))
t('usa momentumSkipReason por candidato', /momentumSkipReason\(stampsByUser\.get\(id\) \?\? \[\], agg\.count, now\)/.test(route))
t('Set "already" por pessoa MORREU', !/const already = new Set/.test(route))
t('le created_at e metadata dos carimbos', /select\('user_id, created_at, metadata'\)\.eq\('name', STAMP\)/.test(route))
t('carimbo grava o degrau (videos: t.count)', /metadata: \{ videos: t\.count, rescue: window\.rescue/.test(route))
t('janela vem de resolveIdleWindow(max_idle_h)', /resolveIdleWindow\(req\.nextUrl\.searchParams\.get\('max_idle_h'\)\)/.test(route))
t('constantes 20/96 nao estao mais cravadas na rota', !/const MIN_IDLE_H = 20|const MAX_IDLE_H = 96/.test(route))
t('sessao de admin abre a rota (falha fechada no catch)', /isAdminSession\(\)/.test(route) && /catch \{\s*return false/.test(route))
t('cron por Bearer continua', /Bearer \$\{cronSecret\}/.test(route))
t('sem CRON_SECRET e sem admin = 401', /if \(!viaCron && !\(await isAdminSession\(\)\)\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/.test(route))
t('DRY_RUN continua o padrao (confirm=SEND exigido)', /searchParams\.get\('confirm'\) === 'SEND'/.test(route) && /if \(!confirm\) \{/.test(route))
t('DRY_RUN expõe skipped e window', /skipped,\s*eligible: targets\.length/.test(route) && /window,\s*via:/.test(route))
t('palavra "away" vem da escada', /videosAwayWord\(videosMade\)/.test(route) && !/videosMade === 1 \? 'three'/.test(route))
t('MAX_PER_RUN continua 40 (resgate de 25 cabe numa rodada)', /const MAX_PER_RUN = 40/.test(route))
t('fetchCache force-no-store continua (#17)', /export const fetchCache = 'force-no-store'/.test(route))
const vercel = readFileSync(join(R, 'vercel.json'), 'utf8')
t('vercel.json: cron diario SEM max_idle_h (96h no dia a dia)', /"\/api\/cron\/send-momentum-nudge\?confirm=SEND"/.test(vercel) && !/send-momentum-nudge[^"]*max_idle_h/.test(vercel))
t('rota do winback-25 e a mesma lista de admins', readFileSync(join(R, 'app/api/admin/send-winback-25/route.ts'), 'utf8').includes("new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])") && route.includes("new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com'])"))

console.log(`\n${ok} ok, ${bad} falhas`)
process.exit(bad ? 1 : 0)
