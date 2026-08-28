// KINEO-LEVA-CONFIABILIDADE-2026-08-28 — "ninguém mais tenta fazer vídeo e falha"
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c, d='') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { bad++; console.log(`  ✗ ${n}${d?' — '+d:''}`) } }
const ler = (p) => readFileSync(join(R, p), 'utf8')
const lineCod = (p) => ler(p).split('\n').filter(l=>!/^\s*(\/\/|\*)/.test(l)).join('\n')

console.log('\n═══ LEVA CONFIABILIDADE — 10 prioridades ═══\n')

const gen = ler('app/(dashboard)/generate/GenerateClient.tsx')
console.log('P1) Rede que pisca não é mais derrota (líder: 69 pessoas/30d)')
chk('helper fetchResilienteSemDinheiro existe', gen.includes('async function fetchResilienteSemDinheiro'))
chk('3 tentativas com backoff', gen.includes('const esperas = [0, 900, 2200]'))
chk('AbortError é respeitado, nunca insistido', gen.includes("e.name === 'AbortError') throw e"))
chk('os DOIS fetches do generate-script usam o helper', (lineCod('app/(dashboard)/generate/GenerateClient.tsx').match(/fetchResilienteSemDinheiro\('\/api\/generate-script'/g)??[]).length === 2)
chk('o kick do compose (dinheiro) NÃO passa pelo helper', !lineCod('app/(dashboard)/generate/GenerateClient.tsx').includes("fetchResilienteSemDinheiro('/api/compose'"))

console.log('\nP2) Entrega nunca mais some da biblioteca (caso omargamer)')
const cron = ler('app/api/cron/finish-stranded-renders/route.ts')
chk('passe de reconciliação existe', cron.includes('KINEO-LINHA-PERDIDA-2026-08-28'))
chk('varre generate_completed de 72h', cron.includes("'generate_completed'") && cron.includes('72 * 60 * 60 * 1000'))
chk('reusa o status route (insert canônico idempotente)', cron.includes('await composeStatusGet(statusReq, { params: { renderId } })'))
chk('recriação vira evento video_row_relinked', cron.includes("'video_row_relinked'"))
chk('relinked aparece na resposta do cron', cron.includes('fastReady, relinked, results'))

console.log('\nP3) Zero POSTs deixa de culpar o cliente (caso Joscha 6×)')
const cin = ler('app/api/generate-video-cinematic/route.ts')
chk('ramo zero-posts detectado', cin.includes('ctxDespacho().totalPosts === 0'))
chk('alarme ao fundador dispara sozinho', cin.includes('ZERO_POSTS user='))
chk('mensagem honesta: nosso lado, não cobrado, avisados', cin.includes('this is on our side, not yours'))

console.log('\nP4) O retry sai do dedo do cliente')
const comp = ler('app/api/compose/route.ts')
chk('auditoria da cota free tenta 2× antes do 503', comp.includes('auditarQuotaFree()') && comp.includes('setTimeout(r, 400)'))

console.log('\nP5) Avatar com prazo (fecha GATE #C)')
const av = ler('app/(dashboard)/avatar/AvatarStudioClient.tsx')
chk('deadline de 15min no poll', av.includes('AVATAR_POLL_DEADLINE_MS = 15 * 60 * 1000'))
chk('mensagem final honesta cita o estorno automático', av.includes('refunded automatically within a few hours'))

console.log('\nP6) O corte do free fala')
chk('servidor grava evento free_duration_clamped VIA composeAdmin (events e service_role-only)', comp.includes("void composeAdmin.from('events').insert({\n              user_id: user.id,\n              name: 'free_duration_clamped'"))
chk('resposta carrega free_duration_clamped', comp.includes('free_duration_clamped: freeDurationClamped'))
chk('cliente captura nos 2 kicks', (gen.match(/setFreeClampNotice\(\{ from: fc.from, to: fc.to \}\)/g)??[]).length === 2)
chk('aviso âmbar na tela de vídeo pronto', gen.includes('Free preview is limited to {freeClampNotice.to}s'))

console.log('\nP7) Selo do motor (pedido do fundador)')
const lab = ler('lib/engineLabel.ts')
chk('mapa único quality_mode→nome público', lab.includes("fast: 'Kineo 1'") && lab.includes("cinematic_hollywood: 'Kling 3'"))
chk('My Videos usa o selo honesto', ler('app/(dashboard)/my-videos/MyVideosClient.tsx').includes('engineLabelFor(v.quality_mode)'))
chk('o ADIVINHADOR por preço morreu', !lineCod('app/(dashboard)/my-videos/MyVideosClient.tsx').includes('credits <= 2'))
chk('Library também mostra o selo', ler('app/(dashboard)/library/LibraryClient.tsx').includes('engineLabelFor(v.quality_mode)'))
chk('/api/videos envia quality_mode', ler('app/api/videos/route.ts').includes('quality_mode: strOrNull(row.quality_mode)'))

console.log('\nP5-audit) snapshot_time inventado foi REMOVIDO (nao existe na API do Creatomate)')
const compose = ler('lib/compose.ts')
chk('o POST volta a mandar so { source }', compose.includes('body: JSON.stringify({ source }),'))
chk('nenhum snapshot_time sobrou no CODIGO (a mencao no comentario-licao fica)', !lineCod('lib/compose.ts').includes('snapshot_time'))

console.log('\nP8) Painel de saúde /api/admin/health')
const h = ler('app/api/admin/health/route.ts')
chk('sonda os 3 fornecedores', h.includes('queue.fal.run') && h.includes('api.creatomate.com') && h.includes('api.openai.com'))
chk('detecta a assinatura do relógio torto (token fresco)', h.includes('signInAnonymously') && h.includes('RELÓGIO TORTO'))
chk('admin only', h.includes('isAdminEmail(user.email)'))
chk('sonda tem prazo (nunca trava)', h.includes('fetchComPrazo'))
chk('resume falhas 1h e presos', h.includes('falhas_1h') && h.includes('presos'))

console.log('\nBÔNUS) Ideia minúscula vira roteiro SOZINHA (0 de 7 clicavam no botão)')
const g2 = ler('app/(dashboard)/generate/GenerateClient.tsx')
chk('o 422 de ≤12s dispara handleWriteFullScript automaticamente', g2.includes('script_authoring_auto_started') && g2.includes('void handleWriteFullScript({ speechSeconds: falaSeg, targetSeconds: duration })'))
chk('roteiro real (>12s) mantém o fluxo com aprovação (C1)', g2.includes('if (!ehIdeia) setError('))
chk('C1 preservado: o auto só ESCREVE — aprovação continua antes do render', g2.includes('setAuthoredScript(data.script.trim())'))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)
