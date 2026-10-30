// KINEO-PLANO-ANTES-DE-GASTAR-3010 + KINEO-REFAZER-1O-FILME-3010 — guardião sem rede (vai do fundador 30/10: C e D).
import { readFileSync } from 'node:fs'
import { cenasDoPlano, PLANO_EVENTOS } from '../lib/growth/planoDoFilme'
import { creditosDoRefazer, podeRefazer, ideiaDoVideo, hrefDoRefazer, REFAZER_TETO_CREDITOS, type VideoDoRefazer } from '../lib/growth/refazerPrimeiroFilme'
let ok = 0, f = 0
const check = (n: string, c: boolean) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }

console.log('C) o plano do filme aparece antes do crédito')
const ROTEIRO = 'HOOK: [Pexels: girl kitchen] Mia found a strange note on the fridge.\nMICRO REWARD 1: [Pexels: pet shop] She ran to the pet shop to buy squishies.\nPAYOFF: [Pexels: sleepover] That night, all her friends arrived for the slumber party.'
const cenas = cenasDoPlano(ROTEIRO)
check('C.1 3 blocos viram 3 cenas, na ordem', cenas.length === 3 && cenas[0].texto.startsWith('Mia found') && cenas[2].texto.includes('slumber party'))
check('C.2 só a última é o final do filme', cenas.map((c) => c.final).join() === 'false,false,true')
check('C.3 roteiro sem blocos não vira plano (cai na tela antiga)', cenasDoPlano('just an idea').length <= 1)
const gen = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
check('C.4 o filme do Studio passa pelo roteiro + plano (sem skipPreview)', gen.includes("handleAnalyze(sp, mode === 'cinematic_ai' ? { fromTopic: true, structureFirst: true } : { fromTopic: true, skipPreview: true })"))
check('C.5 a tela lista as cenas e destaca o final', gen.includes('cenasDoPlano(structuredScriptRef.current).map((c) =>') && gen.includes('data-film-ending'))
check('C.6 "Mudar minha ideia" volta com a ideia da pessoa (não apaga mais)', gen.includes("setPrompt(ideiaDoPlanoRef.current ?? '')") && gen.includes('ideiaDoPlanoRef.current = rawSource'))
check('C.7 visto, confirmado e editado são medidos', [PLANO_EVENTOS.shown, PLANO_EVENTOS.confirmed, PLANO_EVENTOS.edit].every((e) => e.startsWith('film_plan_')) && ['PLANO_EVENTOS.shown', 'PLANO_EVENTOS.confirmed', 'PLANO_EVENTOS.edit'].every((s) => gen.includes(s)))
check('C.8 a guarda de saldo continua antes do plano', gen.indexOf('if (credits !== null && outOfCredits()) {') < gen.indexOf("handleAnalyze(sp, mode === 'cinematic_ai'"))

console.log('D) refazer grátis o 1º vídeo (1 por conta)')
check('D.1 devolve exatamente o que o vídeo custou', creditosDoRefazer(9) === 9 && creditosDoRefazer(35) === 35)
check(`D.2 teto de ${REFAZER_TETO_CREDITOS}`, creditosDoRefazer(150) === REFAZER_TETO_CREDITOS)
check('D.3 filme grátis devolve o preço de um filme curto', creditosDoRefazer(0) === 9 && creditosDoRefazer(null) === 9)
const agora = Date.parse('2026-10-30T22:00:00Z')
const V: VideoDoRefazer = { id: 'v1', user_id: 'u1', status: 'completed', credits_used: 9, created_at: '2026-10-30T15:35:00Z', prompt: null, topic: '[Idea: a girl plans a slumber party]\nHOOK: …', quality_mode: 'cinematic_ai' }
check('D.4 1º vídeo pronto, do dono, em 72 h → pode', podeRefazer({ video: V, userId: 'u1', videosAntes: 0, jaRefez: false, agora }) === 'ok')
check('D.5 de outra conta → não', podeRefazer({ video: V, userId: 'u2', videosAntes: 0, jaRefez: false, agora }) === 'not_owner')
check('D.6 segundo vídeo → não', podeRefazer({ video: V, userId: 'u1', videosAntes: 1, jaRefez: false, agora }) === 'not_first_video')
check('D.7 já refez → não', podeRefazer({ video: V, userId: 'u1', videosAntes: 0, jaRefez: true, agora }) === 'already_used')
check('D.8 mais de 72 h → não', podeRefazer({ video: V, userId: 'u1', videosAntes: 0, jaRefez: false, agora: agora + 80 * 3600_000 }) === 'too_old')
check('D.9 vídeo que falhou → não', podeRefazer({ video: { ...V, status: 'failed' }, userId: 'u1', videosAntes: 0, jaRefez: false, agora }) === 'not_completed')
check('D.10 a ideia volta sem o roteiro do escritor', ideiaDoVideo(V) === 'a girl plans a slumber party')
check('D.11 filme volta ao Studio com a ideia', hrefDoRefazer(V).startsWith('/studio?prompt=a+girl+plans+a+slumber+party'))
check('D.12 clipe volta ao Clipe', hrefDoRefazer({ ...V, quality_mode: 'clip', topic: null, prompt: 'a storm over the sea' }).startsWith('/clips?prompt=a+storm'))
const rota = readFileSync(new URL('../app/api/first-film-redo/route.ts', import.meta.url), 'utf8')
check('D.13 a trava (PK da conta) vem ANTES do crédito', rota.indexOf("from('first_film_redos').insert(") > 0 && rota.indexOf("from('first_film_redos').insert(") < rota.indexOf("rpc('add_video_credits'"))
check('D.14 crédito pelo RPC atômico dos pagamentos', rota.includes("admin.rpc('add_video_credits', { p_user: user.id, p_amount: credits })"))
check('D.15 sem crédito, a refação não fica gasta', /creditErr\) \{\s*await admin\.from\('first_film_redos'\)\.delete\(\)\.eq\('user_id', user\.id\)/.test(rota))
check('D.16 defeito obrigatório e da lista', rota.includes('REFAZER_DEFEITOS as readonly string[]).includes('))
check('D.17 o cartão está na tela do filme pronto', gen.includes('<FirstFilmRedo videoId={publicVideoId} />'))

console.log(`\n${f === 0 ? '✅' : '❌'} ${ok} verdes, ${f} vermelhas`)
if (f) process.exit(1)
