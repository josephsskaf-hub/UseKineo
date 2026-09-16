// KINEO-PRIMEIRO-FILME-2026-09-16 — guardião da decisão do fundador (16/09): "cadastros novos, 1 semana,
// 35 USD/dia". Prova: (a) a elegibilidade é uma função pura com todos os "não" nomeados; (b) o interruptor
// nasce ligado e desliga por env; a janela fecha sozinha em 7 dias; (c) o teto diário é número, com padrão
// 15 e sem "sem teto"; (d) a rota só lê, decide com a mesma função e FALHA FECHADA; (e) o Studio trava o
// motor sem tocar no cobrador nem no render, e emite os 4 eventos que medem o funil.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, env = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, process: { env } }); return exp }

console.log('== (a) elegibilidade pura ==')
const libSrc = rd('lib/primeiroFilme.ts')
const P = roda(libSrc, { NEXT_PUBLIC_KINEO_PRIMEIRO_FILME: 'on' }) // ligado só aqui, para provar a elegibilidade
const P0 = roda(libSrc)
const dentro = new Date('2026-09-18T12:00:00Z')
const base = { created_at: '2026-09-17T10:00:00Z', plan: 'free', has_paid: false, trial_status: 'active', video_credits: 30, filmes: 0 }
checa('cadastro novo, trial ativo, 30 cr, sem filme → elegível', P.elegivelPrimeiroFilme(base, dentro).elegivel === true)
checa('conta de antes de 16/09 08:00Z → conta_antiga', P.elegivelPrimeiroFilme({ ...base, created_at: '2026-09-15T23:00:00Z' }, dentro).motivo === 'conta_antiga')
checa('já pagou → ja_pagou', P.elegivelPrimeiroFilme({ ...base, has_paid: true }, dentro).motivo === 'ja_pagou')
checa('plano pago → plano_pago', P.elegivelPrimeiroFilme({ ...base, plan: 'basic' }, dentro).motivo === 'plano_pago')
checa('sem trial ativo → sem_trial_ativo', P.elegivelPrimeiroFilme({ ...base, trial_status: null }, dentro).motivo === 'sem_trial_ativo' && P.elegivelPrimeiroFilme({ ...base, trial_status: 'ended' }, dentro).motivo === 'sem_trial_ativo')
checa('24 créditos (menos que os 25 do Seedance 60 s) → saldo_insuficiente', P.elegivelPrimeiroFilme({ ...base, video_credits: 24 }, dentro).motivo === 'saldo_insuficiente')
checa('já tem um filme (qualquer estado que não falha) → ja_fez_o_primeiro', P.elegivelPrimeiroFilme({ ...base, filmes: 1 }, dentro).motivo === 'ja_fez_o_primeiro')
checa('created_at nulo → conta_antiga (nunca elegível por acidente)', P.elegivelPrimeiroFilme({ ...base, created_at: null }, dentro).motivo === 'conta_antiga')

console.log('== (b) interruptor e janela ==')
// 16/09 manhã — fundador pausou ("vamos esperar"): padrão DESLIGADO; só liga com env =on.
checa('DESLIGADO por padrão (sem env) e a elegibilidade diz "desligado"', P0.PRIMEIRO_FILME_ENABLED === false && P0.elegivelPrimeiroFilme(base, dentro).motivo === 'desligado')
checa('NEXT_PUBLIC_KINEO_PRIMEIRO_FILME=on liga; off/lixo não', roda(libSrc, { NEXT_PUBLIC_KINEO_PRIMEIRO_FILME: 'on' }).PRIMEIRO_FILME_ENABLED === true && roda(libSrc, { NEXT_PUBLIC_KINEO_PRIMEIRO_FILME: 'off' }).PRIMEIRO_FILME_ENABLED === false && roda(libSrc, { NEXT_PUBLIC_KINEO_PRIMEIRO_FILME: 'talvez' }).PRIMEIRO_FILME_ENABLED === false)
checa('janela de 7 dias: 16/09 08:00Z → 23/09 08:00Z', Date.parse(P.PRIMEIRO_FILME_ATE) - Date.parse(P.PRIMEIRO_FILME_DESDE) === 7 * 24 * 3600 * 1000)
checa('depois da janela ninguém trava (fora_da_janela)', P.elegivelPrimeiroFilme(base, new Date('2026-09-23T08:00:01Z')).motivo === 'fora_da_janela' && P.dentroDaJanela(new Date('2026-09-23T07:59:59Z')))
checa('motor, duração e créditos espelham o Seedance 60 s (25 cr)', P.PRIMEIRO_FILME_ENGINE === 'seedance' && P.PRIMEIRO_FILME_DURATION === 60 && P.PRIMEIRO_FILME_CREDITOS === 25 && /return 25/.test(rd('lib/credits/engineCost.ts')))

console.log('== (c) teto diário ==')
checa('padrão 15 filmes/dia (≈ 35 USD)', P.primeiroFilmeCapDia() === 15 && P.PRIMEIRO_FILME_CAP_DIA_PADRAO === 15)
checa('env KINEO_PRIMEIRO_FILME_CAP_DIA=8 vale; lixo cai no padrão; 0 fecha a porta; teto máximo 1000', roda(libSrc, { KINEO_PRIMEIRO_FILME_CAP_DIA: '8' }).primeiroFilmeCapDia() === 8 && roda(libSrc, { KINEO_PRIMEIRO_FILME_CAP_DIA: 'muito' }).primeiroFilmeCapDia() === 15 && roda(libSrc, { KINEO_PRIMEIRO_FILME_CAP_DIA: '0' }).primeiroFilmeCapDia() === 0 && roda(libSrc, { KINEO_PRIMEIRO_FILME_CAP_DIA: '99999' }).primeiroFilmeCapDia() === 1000)

console.log('== (d) rota: só lê, mesma função, falha fechada ==')
const rt = rd('app/api/first-film/route.ts')
checa('rota importa elegivelPrimeiroFilme e primeiroFilmeCapDia da fonte única', rt.includes("from '@/lib/primeiroFilme'") && rt.includes('elegivelPrimeiroFilme({') && rt.includes('const cap = primeiroFilmeCapDia()'))
checa('rota nunca grava (sem insert/update/upsert/delete)', !/\.(insert|update|upsert|delete)\(/.test(rt))
checa('falha fechada: todo caminho de erro devolve capReached: true (fechado())', rt.includes('capReached: true,') && (rt.match(/return NextResponse\.json\(fechado\(/g) || []).length >= 5 && rt.includes("catch {\n    return NextResponse.json(fechado('erro'))"))
checa('teto conta filmes cinematic_ai das contas da coorte (nascidas na janela, sem pagar) nas últimas 24 h', rt.includes(".gte('created_at', PRIMEIRO_FILME_DESDE)") && rt.includes(".eq('has_paid', false)") && rt.includes(".eq('quality_mode', PRIMEIRO_FILME_QUALITY)") && rt.includes(".in('user_id', ids)") && rt.includes('24 * 60 * 60 * 1000'))
checa('teto atingido → eligible false + reason teto_do_dia', rt.includes("reason: capReached ? 'teto_do_dia' : el.motivo") && rt.includes('eligible: !capReached'))
checa('sem sessão → 401; sem cache (force-no-store)', rt.includes("{ status: 401 }") && rt.includes("export const fetchCache = 'force-no-store'"))
checa('primeiro filme = qualquer vídeo que não falhou (status != failed)', rt.includes(".neq('status', 'failed')"))

console.log('== (e) Studio: trava sem tocar no cobrador ==')
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('Studio pergunta ao servidor (/api/first-film) e só trava com eligible && !capReached', gc.includes("fetch('/api/first-film', { cache: 'no-store' })") && gc.includes("if (cancelled || d.eligible !== true || d.capReached === true) return"))
checa('trava = Seedance · 60 s · roteiro IA', gc.includes("setMode('cinematic_ai'); setAiEngine('seedance'); setDuration(60); setScriptMode('ai')\n        setPrimeiroFilmeAtivo(true)"))
checa('ensaio interno (maint=1) nunca trava', gc.includes("if (searchParams?.get('maint') === '1') return\n    let cancelled = false"))
checa('a trava vence os defaults por plano enquanto o render não começou (phase idle)', gc.includes("if (!primeiroFilmeAtivo || phase !== 'idle') return") && gc.includes("if (aiEngine !== 'seedance') setAiEngine('seedance')"))
checa('o seletor de motor some só quando a trava está ativa (ModeSelector segue para todo o resto)', gc.includes("{mode !== 'creator' && !primeiroFilmeAtivo && (\n          <ModeSelector") && gc.includes('data-primeiro-filme="trava"'))
checa('entrega: faixa "Continue this series → Episode 2" com intent_campaign primeiro_filme_v1 para /pricing', gc.includes('data-primeiro-filme="entregue"') && gc.includes('Continue this series → Episode 2') && gc.includes('/pricing?intent_campaign=${PRIMEIRO_FILME_VERSION}#plans'))
checa('4 eventos do funil: locked_shown → started (1× por sessão) → delivered → cta_click', ['first_film_locked_shown', 'first_film_started', 'first_film_delivered', 'first_film_cta_click'].every((e) => gc.includes(`trackEvent('${e}'`)) && gc.includes('primeiroFilmeStartedRef.current = true'))
checa('a trava desarma na entrega (segundo filme volta ao Studio normal)', gc.includes("if (phase === 'done' && primeiroFilmeAtivo) {\n      setPrimeiroFilmeAtivo(false)\n      setPrimeiroFilmeEntregue(true)"))
checa('cobrador e render intactos: nada de primeiroFilme em generate-video-cinematic, compose ou engineCost', !/primeiroFilme|PRIMEIRO_FILME/.test(rd('app/api/generate-video-cinematic/route.ts')) && !/primeiroFilme|PRIMEIRO_FILME/.test(rd('app/api/compose/route.ts')) && !/primeiroFilme|PRIMEIRO_FILME/.test(rd('lib/credits/engineCost.ts')))
checa('nenhuma chave ou segredo no cliente (a rota usa SERVICE_ROLE, o cliente não)', !/SERVICE_ROLE/.test(gc) && !/SERVICE_ROLE/.test(libSrc))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
