// KINEO-CAIXA-UNICA-0411 [fundador 04/11: "1a"] — guardião sem rede: quem vê a caixa, qual motor, o pedido igual ao do Studio completo e sem venda na cara de visitante.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const lf = (t) => t.replace(/\r\n/g, '\n')
const ARQ = 'lib/growth/studioSimples.ts'
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === ARQ ? mutar(t) : t) })(ARQ)
const m = carrega()

checa('quem só chegou vê a caixa', m.usarCaixaUnica({}) && m.usarCaixaUnica({ engine: 'seedance', intent_campaign: 'home_card', utm_source: 'x', gclid: 'y' }))
for (const k of ['prompt', 'topic', 'avancado', 'resume', 'generationId', 'session_id', 'series_parent', 'mode', 'welcome', 'return']) checa(`com ${k}, segue para o Studio completo`, !m.usarCaixaUnica({ [k]: '1' }))
checa('motor sem escolha é o padrão', m.motorDaCaixa(undefined) === 'seedance' && m.motorDaCaixa('fast') === 'seedance' && m.motorDaCaixa('qualquer') === 'seedance' && m.motorDaCaixa(['kling']) === 'seedance')
checa('motor escolhido no link é mantido', m.motorDaCaixa('kling') === 'kling' && m.motorDaCaixa('hollywood') === 'hollywood')
checa('sem escolha diz Auto; escolhido diz o nome', m.nomeDoMotorEscolhido('seedance') === null && m.nomeDoMotorEscolhido('hollywood') === 'Kling 4.0')
checa('campanha estranha não passa', m.campanhaDaCaixa('home_card') === 'home_card' && m.campanhaDaCaixa('a b<c') === 'studio_simple' && m.campanhaDaCaixa(undefined) === 'studio_simple')

const u = new URL(m.pedidoDoStudioSimples({ motor: 'seedance', texto: 'A wave & more', duracao: 60, formato: '9:16', lingua: 'en', palavraPorPalavra: false, campanha: 'home_card' }), 'https://x.test')
checa('o pedido vai para a mesma porta', u.pathname === '/studio/create')
checa('o pedido tem os mesmos campos do Studio completo', ['engine', 'prompt', 'duration', 'script_mode', 'autoanalyze', 'studio', 'intent_campaign'].every((k) => u.searchParams.has(k)) && u.searchParams.get('prompt') === 'A wave & more' && u.searchParams.get('script_mode') === 'ai')
checa('padrões ficam fora da URL', !u.searchParams.has('aspect') && !u.searchParams.has('language'))
const u2 = new URL(m.pedidoDoStudioSimples({ motor: 'kling', texto: 'x', duracao: 35, formato: '16:9', lingua: 'pt', palavraPorPalavra: true, campanha: 'c' }), 'https://x.test')
checa('escolhas viajam', u2.searchParams.get('aspect') === '16:9' && u2.searchParams.get('language') === 'pt' && u2.searchParams.get('script_mode') === 'verbatim' && u2.searchParams.get('engine') === 'kling')

const completo = lf(fs.readFileSync('app/(dashboard)/studio/StudioClient.tsx', 'utf8'))
checa('o Studio completo monta os mesmos campos (se mudar lá, este guardião avisa)', completo.includes("new URLSearchParams({ engine, prompt: finalPrompt, duration: String(duration), script_mode: scriptMode, autoanalyze: '1', studio: '1', intent_campaign: campaignRef.current })"))
const comp = lf(fs.readFileSync('components/studio/StudioSimples.tsx', 'utf8'))
checa('grava o token que o /studio/create lê', comp.includes("sessionStorage.setItem('kineo:studio:go:v1'"))
checa('o funil do Studio segue medido', comp.includes("registrar('mrr_generate_clicked')") && comp.includes("registrar('mrr_idea_entered')"))
checa('o texto recusado não navega', comp.indexOf('sexual.refuse') < comp.indexOf('router.push(pedidoDoStudioSimples'))
checa('Studio completo a 1 clique', comp.includes('avancado') && comp.includes('More options'))
checa('nenhum preço na tela', !/[$€£]\s*\d|\d+\s*(?:cr\b|credits)/i.test(comp.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')))
const pag = lf(fs.readFileSync('app/(dashboard)/studio/page.tsx', 'utf8'))
checa('a página escolhe pela regra', pag.includes('usarCaixaUnica(searchParams') && pag.includes('<StudioSimples') && pag.includes('<StudioClient'))
const shell = lf(fs.readFileSync('app/(dashboard)/DashboardShell.tsx', 'utf8'))
checa('visitante não recebe oferta na cara', shell.includes('{isLoggedIn && <WelcomeOfferModal surface="dashboard" />}') && shell.includes('{isLoggedIn && <Creator30OfferModal />}'))
const mw = lf(fs.readFileSync('middleware.ts', 'utf8'))
checa('o desvio da home está ligado', mw.includes('destinoDoVisitanteQueEscreve('))
const mut = carrega((t) => t.replace('return Object.keys(params).every((k) => SO_CHEGOU.test(k))', 'return true'))
checa('mutante: caixa para todos perderia o texto do ChatGPT', mut.usarCaixaUnica({ prompt: 'x' }) === true)

console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
