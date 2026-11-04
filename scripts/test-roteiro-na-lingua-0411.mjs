// KINEO-ROTEIRO-NA-LINGUA-0411 [fundador 03/11: "já pode arrumar"] — guardião sem rede: o roteiro nasce na língua de quem escreveu, sem tocar em segundos nem motor.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const lf = (t) => t.replace(/\r\n/g, '\n')
const ARQ = 'lib/linguaDoRoteiro.ts'
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === ARQ ? mutar(t) : t) })(ARQ)
const m = carrega()
const L = (texto, extra = {}) => m.linguaDoRoteiro({ hint: 'en', texto, ...extra })

// Os pedidos reais de 04/11 e dos dias anteriores
const PT = 'Crie um vídeo infantil 3D ultrafofo, colorido e divertido, com estética de animação de cinema, em um mundo mágico cheio de arco-íris, doces gigantes, nuvens fofinhas e estrelas brilhantes. Um unicórnio bebê muito fofo pula e faz magia para as crianças.'
const ES = 'Crea un YouTube Short vertical 9:16 de 40 segundos sobre el Manuscrito Voynich. Estilo documental cinematográfico de misterio, con una narración que explica por qué nadie lo ha podido leer y lo que los expertos creen que es.'
const IT = 'Tommy e il cane magico. Crea un video animato di 15 secondi. Un bimbo simpatico gioca con il suo cane nel parco e poi trova una porta magica che lo porta in un mondo nuovo.'
const AR = 'اطفال يذهبون إلى المدرسة محمود وحسن'
const EN = 'The disappearance nobody solved in 70 years: a small town, a missing family and the letter that arrived decades later from nowhere.'
checa('português escrito → roteiro em português', L(PT).language === 'pt' && L(PT).trocou === true && L(PT).origem === 'texto')
checa('espanhol escrito → roteiro em espanhol', L(ES).language === 'es')
checa('italiano escrito → roteiro em italiano', L(IT).language === 'it')
checa('árabe escrito → roteiro em árabe', L(AR).language === 'ar')
checa('inglês continua inglês, sem troca', L(EN).language === 'en' && L(EN).trocou === false)
checa('texto curto fica como está', L('Los Angeles wildfires').language === 'en' && L('Menino na floresta').language === 'en')

// Escolha da pessoa e língua nomeada
checa('inglês escolhido à mão vence o texto em português', L(PT, { explicita: true }).language === 'en' && L(PT, { explicita: true }).origem === 'escolhida')
checa('língua da página (pt) segue valendo com texto inglês', m.linguaDoRoteiro({ hint: 'pt', texto: EN }).language === 'pt')
checa('"Crie um vídeo em inglês" continua inglês', L('Crie um vídeo em inglês sobre a história de um menino que perdeu o seu cachorro na praia e depois encontrou').language === 'en')
checa('"narration in Spanish" num pedido em inglês vira espanhol', L('Make a film about the ocean, narration in Spanish').language === 'es')
checa('"Spanish narration" também', L('A film about the ocean with Spanish narration').language === 'es')
checa('"in French Guiana" é lugar, não língua', m.linguaPedidaNoTexto('A video about a rocket launch in French Guiana') === null)
checa('língua fora da lista não inventa', m.linguaPedidaNoTexto('Narration in Burmese, word for word') === null)
checa('sem pedido, nada', m.linguaPedidaNoTexto(EN) === null && m.linguaPedidaNoTexto(null) === null)

// Os motores: voz própria só fala en/pt/es, e a rota recusaria outra língua
for (const motor of ['hollywood', 'h3', 'h3max', 'omni', 's25']) {
  checa(`${motor}: italiano segue em inglês (a rota recusaria)`, L(IT, { motor }).language === 'en' && L(IT, { motor }).origem === 'motor_segurou')
  checa(`${motor}: português passa`, L(PT, { motor }).language === 'pt')
}
for (const motor of ['cinematic_ai', 'seedance', 'kling', 'veo', 'fast']) checa(`${motor}: italiano passa (voz da casa)`, L(IT, { motor }).language === 'it')

// Costura: a porta manda a língua; nenhum arquivo de motor muda
const studio = lf(fs.readFileSync('app/(dashboard)/studio/StudioClient.tsx', 'utf8'))
checa('Studio completo resolve a língua do pedido', studio.includes('linguaDoRoteiro({ hint: language, explicita: linguaTocadaRef.current, texto: finalPrompt, motor: engine })') && studio.includes("q.set('language', lingua.language)"))
checa('Studio completo: a escolha da pessoa fica registrada', studio.includes('linguaTocadaRef.current = true'))
checa('a troca fica medida', studio.includes("trackEvent('script_language_resolved'"))
const caixa = lf(fs.readFileSync('components/studio/StudioSimples.tsx', 'utf8'))
checa('caixa: padrão é a língua do texto', caixa.includes("useState<string>('auto')") && caixa.includes('Same as my text'))
const lib = createOfflineLoader({})('lib/growth/studioSimples.ts')
const url = (lingua, texto, motor = 'seedance') => new URL(lib.pedidoDoStudioSimples({ motor, texto, duracao: 60, formato: '9:16', lingua, palavraPorPalavra: false, campanha: 'c' }), 'https://x.test').searchParams.get('language')
checa('caixa: texto em português vai com pt', url('auto', PT) === 'pt')
checa('caixa: texto em inglês não leva língua', url('auto', EN) === null)
checa('caixa: inglês escolhido à mão fica inglês', url('en', PT) === null)
checa('caixa: espanhol escolhido à mão vai com es', url('es', EN) === 'es')
checa('caixa: Kling com italiano segue como antes', url('auto', IT, 'hollywood') === null)

// Mutantes
const mutA = carrega((t) => t.replace('if (f.explicita === true && pedida) return', 'if (false) return'))
checa('mutante: sem respeitar a escolha, o inglês escolhido viraria português', mutA.linguaDoRoteiro({ hint: 'en', explicita: true, texto: PT }).language === 'pt')
const mutB = carrega((t) => t.replace("MOTORES_DE_VOZ_PROPRIA.has(f.motor)", 'false'))
checa('mutante: sem a trava do motor, Kling receberia italiano', mutB.linguaDoRoteiro({ hint: 'en', texto: IT, motor: 'hollywood' }).language === 'it')

console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
