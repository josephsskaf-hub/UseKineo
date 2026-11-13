// KINEO-APARENCIA-DO-PEDIDO-1311 [CEO 13/11, "a aparência do sujeito não se mantém" no Kling 4 grátis] — guardião sem rede e sem custo.
// Os dois filmes reais de 13/11 (textos copiados dos eventos salvos):
//   (a) 982a6aeb / Milo: a ideia "fluffy orange kitten named Milo … heavy rain" não chegou ao servidor (o roteiro despachado era o do nosso
//       escritor); a ficha ficou `Milo, exactly as the author wrote: "duckling hugs Milo"` e o gato saiu cinza.
//   (b) 7f92fe17 / gato ninja: "стиль пиксар" não pedia desenho (filme fotorreal) e "В стиле Пиксар" virou "Пиксар clearly visible as the
//       subject of this shot" no plano 4.
// Trava: (1) a ideia volta só quando o começo gravado do script_written (script_head, 200 caracteres) é, inteiro, o começo do roteiro
// despachado (até 6 h; roteiro curto = o mesmo texto); reescrito no começo, outro roteiro, cabeça curta ou fora da janela = nada; (2) a ficha do Milo leva as palavras do cliente ("tiny adorable fluffy orange kitten"); a frase de autor que ESTÁ no pedido
// fica; gente ("a tall man named Milo") não vira ficha de bicho; (3) "стиль пиксар" pede o look desenhado, e o inglês segue igual;
// (4) "Пиксар"/"Pixar" nunca é o assunto do plano, e "Venus" continua sendo; (5) a fiação: rota recupera ANTES da cópia estacionada, as
// duas leituras da ficha passam o interruptor; (6) 'off' = byte a byte o de antes. O interruptor mora em lib/cinematic/sceneStyle.ts.
// Mutantes: interruptor 'off' · começo ignorado · "named" desligado · ficha do roteiro não cede · cirílico fora · marca vira assunto ·
// rota sem recuperação.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const MOD = 'lib/cinematic/aparenciaDoPedido1311.ts'
const ESC = 'lib/cinematic/ideiaDoEscritor1311.ts'
const FICHA = 'lib/cinematic/fichaDoPedido.ts'
const ESTILO = 'lib/cinematic/sceneStyle.ts'
const QUAL = 'lib/cinematic/filmQuality.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const ler = (f) => readFileSync(f, 'utf8')

// (a) Milo — textos reais (videos.topic e script_written.original_idea de 13/11 07:45 UTC)
const MILO_ROTEIRO = 'HOOK (0-2s): [Pexels: heavy rain street puddle] A tiny kitten... witnesses a heartwarming rescue mission.\n\nPAYOFF: [Pexels: kitten saves duckling] Milo dives in, gently carrying the duckling to safety... and as the mother duck arrives, the duckling hugs Milo, sealing a newfound friendship.'
const MILO_IDEIA = 'Create a complete 15-second cinematic 3D animated animal film for YouTube Shorts.\n\nA tiny adorable fluffy orange kitten named Milo sees a frightened baby yellow duckling trapped in a puddle during heavy rain. Milo immediately runs toward the duckling, jumps into the water and gently carries it to safety. The mother duck arrives and happily reunites with her baby. End with the duckling affectionately hugging Milo.\n\nBeautiful high-quality 3D animation, adorable expressive animals, realistic running, jumping and body movements. All characters must physically move and interact naturally. Emotional cinematic background music, realistic rain and animal sound effects. No dialogue, no narration, no subtitles, no text. Six connected shots, automatically edited into one complete vertical 9:16 video.'
const MILO_FICHA = { nome: 'Milo', nucleo: 'Milo', tipo: 'animal', origem: 'autor', canonica: 'Milo, exactly as the author wrote: "duckling hugs Milo"', protagonista: true, genero: null }
// (b) gato ninja — textos reais (script_written.original_idea e videos.topic de 13/11 18:43 UTC)
const GATO_IDEIA = 'рыжий кот ниндзя бежит по крышам как профисиналный супер ниндзя стиль пиксар'
const GATO_ROTEIRO = 'HOOK (0-2s): [Pexels: cat rooftop silhouette] Рыжий кот — ниндзя на крыше.\n\nMICRO REWARD 1: [Pexels: cat jumping rooftop] Он прыгает через крыши, как профи.\n\nMICRO REWARD 2: [Pexels: cat stealthy movement] Двигается так тихо и ловко.\n\nPAYOFF: [Pexels: cat epic leap] В стиле Пиксар, этот кот — супер ниндзя.'
const GATO_FALA_4 = 'В стиле Пиксар, этот кот — супер ниндзя.'
const GATO_PLANO_4 = 'Photoreal film. In a vibrant, animated style, the cat performs an epic leap, embodying the essence of a superhero ninja in action.'

const AGORA = Date.parse('2026-11-13T07:45:38Z')

function problemas(mut = {}) {
  const p = []
  const L = createOfflineLoader({ source: (rel, t) => { const k = rel.replace(/\\/g, '/'); return mut[k] ? mut[k](t) : t } })
  const A = L(MOD), E = L(ESC), F = L(FICHA), S = L(ESTILO), Q = L(QUAL), T = L('lib/cinematic/elencoTrava.ts')
  const ligado = A.aparenciaLigada(A.KINEO_APARENCIA_DO_PEDIDO_1311, false)
  if (A.KINEO_APARENCIA_DO_PEDIDO_1311 !== 'all' || !ligado) p.push(`(0) interruptor = ${A.KINEO_APARENCIA_DO_PEDIDO_1311}, esperado 'all' para o cliente de fora`)
  if (A.aparenciaLigada('off', true) || A.aparenciaLigada('internal', false) || !A.aparenciaLigada('internal', true)) p.push("(0) 'off'/'internal' mudaram de sentido")

  // (1) a ideia volta só pelo começo gravado, inteiro (o evento como o /api/generate-script grava: script_head = script.slice(0, 200);
  // o roteiro real do Milo tem 290 caracteres)
  const ev = (texto, minutos, extra = {}) => ({ created_at: new Date(AGORA - minutos * 60_000).toISOString(), metadata: { original_idea: MILO_IDEIA, script_head: texto.slice(0, 200), ...extra } })
  const volta = E.ideiaDoRoteiroEscrito(MILO_ROTEIRO, [ev(MILO_ROTEIRO, 1)], AGORA)
  if (volta !== MILO_IDEIA.slice(0, 600)) p.push('(1) Milo: o começo do roteiro não devolveu a ideia (600 caracteres, como a tela)')
  if (E.ideiaDoRoteiroEscrito(MILO_ROTEIRO + '  \r\n', [ev(MILO_ROTEIRO, 1)], AGORA) !== MILO_IDEIA.slice(0, 600)) p.push('(1) espaço/quebra de linha nas pontas impediu o par')
  if (E.ideiaDoRoteiroEscrito(MILO_ROTEIRO.replace('A tiny kitten', 'A small kitten'), [ev(MILO_ROTEIRO, 1)], AGORA) !== null) p.push('(1) roteiro reescrito no começo devolveu a ideia')
  if (E.ideiaDoRoteiroEscrito('Milo, the brave kitten, saves a duckling in the rain today.', [ev(MILO_ROTEIRO, 1)], AGORA) !== null) p.push('(1) outro roteiro devolveu a ideia')
  const curto = 'HOOK: A tiny orange kitten saves a duckling in the rain.'
  if (E.ideiaDoRoteiroEscrito(curto, [ev(curto, 1)], AGORA) !== MILO_IDEIA.slice(0, 600)) p.push('(1) roteiro curto (< 200) idêntico não casou')
  if (E.ideiaDoRoteiroEscrito(curto + ' Then they become friends.', [ev(curto, 1)], AGORA) !== null) p.push('(1) roteiro curto com frase a mais casou (tem de ser o mesmo texto)')
  if (E.ideiaDoRoteiroEscrito(MILO_ROTEIRO, [{ created_at: new Date(AGORA - 60_000).toISOString(), metadata: { original_idea: MILO_IDEIA, script_head: 'HOOK (0-2s):' } }], AGORA) !== null) p.push('(1) cabeça curta demais casou')
  if (E.ideiaDoRoteiroEscrito(MILO_ROTEIRO, [ev(MILO_ROTEIRO, 7 * 60)], AGORA) !== null) p.push('(1) evento fora da janela de 6 h devolveu a ideia')
  const doisPares = E.ideiaDoRoteiroEscrito(MILO_ROTEIRO, [ev(MILO_ROTEIRO, 30, { original_idea: 'velha' }), ev(MILO_ROTEIRO, 2)], AGORA)
  if (doisPares !== MILO_IDEIA.slice(0, 600)) p.push('(1) com dois pares, não ficou o mais recente')

  // (2) a ficha do Milo
  const milo = F.elencoComFichaDoPedido(volta ?? '', [MILO_FICHA], { aparencia1311: ligado }).elenco[0].canonica
  if (!/orange kitten/.test(milo)) p.push(`(2) Milo: a ficha não leva as palavras do cliente (${milo})`)
  if (F.elencoComFichaDoPedido(volta ?? '', [MILO_FICHA]).elenco[0].canonica !== MILO_FICHA.canonica) p.push('(2) sem a opção, a ficha mudou (tem de ser byte a byte)')
  const fichaDoCliente = { ...MILO_FICHA, canonica: 'Milo, exactly as the author wrote: "tiny adorable fluffy orange kitten"' }
  if (F.elencoComFichaDoPedido(MILO_IDEIA, [fichaDoCliente], { aparencia1311: true }).elenco[0].canonica !== fichaDoCliente.canonica) p.push('(2) a frase de autor que ESTÁ no pedido não ficou')
  if (F.nomeadoNoPedido('A tall man named Milo walks in.', MILO_FICHA) !== null) p.push('(2) "a tall man named Milo" virou ficha de bicho')
  if (F.nomeadoNoPedido('The old fisherman named Milo sails.', MILO_FICHA) !== null) p.push('(2) "old fisherman named Milo" virou ficha de bicho')
  if (F.nomeadoNoPedido('A fluffy orange tiger named Milo roars.', MILO_FICHA) !== 'fluffy orange tiger') p.push('(2) "tiger" (termina em -er) não passou')

  // (3) o look do gato ninja
  const look = S.deriveStyleAnchor(T.textoDoLook(GATO_ROTEIRO, GATO_IDEIA)).look
  if (look !== 'animated3d') p.push(`(3) "стиль пиксар": look ${look}, esperado animated3d`)
  if (S.deriveStyleAnchor('A cat on the roof, Pixar style.').look !== 'animated3d') p.push('(3) "Pixar style" em inglês deixou de pedir desenho')
  if (S.deriveStyleAnchor('Рыжий кот на крыше ночью.').look !== 'photoreal') p.push('(3) texto russo sem pedido de estilo virou desenho')

  // (4) estúdio de estilo não é assunto
  const p4 = Q.comSujeitoDaFala(GATO_PLANO_4, GATO_FALA_4, [])
  if (/Пиксар clearly visible/.test(p4)) p.push('(4) "Пиксар" virou o assunto do plano 4')
  if (/Pixar clearly visible/.test(Q.comSujeitoDaFala('A cat leaps.', 'Made in the style of Pixar, the cat leaps.', []))) p.push('(4) "Pixar" virou o assunto')
  if (!/^Venus clearly visible/.test(Q.comSujeitoDaFala('A galaxy of stars.', 'On Venus, the year ends before a single day does!', []))) p.push('(4) "Venus" deixou de ser o assunto (controle)')

  // (5) a fiação
  const rota = mut[ROTA] ? mut[ROTA](ler(ROTA)) : ler(ROTA)
  const iRec = rota.indexOf('await recuperarIdeiaDoEscritor(user.id, body.prompt)'), iEst = rota.indexOf('const pedidoEstacionado = pedidoEstacionavel(body)')
  if (iRec < 0 || iEst < 0 || iRec > iEst) p.push('(5) a rota não recupera a ideia antes da cópia estacionada')
  if (!/if \(ideiaDoEscritor\) \{ body\.original_idea = ideiaDoEscritor;/.test(rota)) p.push('(5) a ideia recuperada não vira body.original_idea')
  if ((rota.match(/elencoComFichaDoPedido\(body\.original_idea, [A-Za-z.]+, \{ aparencia1311 \}\)/g) ?? []).length !== 2) p.push('(5) as duas leituras da ficha não passam o interruptor')
  return p
}

const atual = problemas()
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
console.log('ok  estado atual (Milo: a ideia volta pelo começo do roteiro e a ficha diz "orange kitten"; gato ninja: look desenhado e "Пиксар" fora do assunto; controles; fiação)')

// 'off' = byte a byte o de antes, nas peças puras
{
  const off = createOfflineLoader({ source: (rel, t) => (rel.replace(/\\/g, '/') === ESTILO ? t.replace("KINEO_APARENCIA_DO_PEDIDO_1311: ModoAparencia1311 = 'all'", "KINEO_APARENCIA_DO_PEDIDO_1311: ModoAparencia1311 = 'off'") : t) })
  const S = off(ESTILO), Q = off(QUAL), T = off('lib/cinematic/elencoTrava.ts')
  const fora = []
  if (S.deriveStyleAnchor(T.textoDoLook(GATO_ROTEIRO, GATO_IDEIA)).look !== 'photoreal') fora.push('look')
  if (!/Пиксар clearly visible/.test(Q.comSujeitoDaFala(GATO_PLANO_4, GATO_FALA_4, []))) fora.push('assunto')
  if (fora.length) { console.log(`FALHA 'off' não devolveu o comportamento de antes: ${fora.join(', ')}`); process.exit(1) }
  console.log("ok  'off' devolve o de antes (gato ninja fotorreal e \"Пиксар\" no plano 4, como no filme real)")
}

let ok = 2, falhas = 0
const troca = (de, para) => (t) => { const n = t.replace(de, para); return n }
const MUTANTES = [
  ["M1 interruptor 'off'", { [ESTILO]: troca("KINEO_APARENCIA_DO_PEDIDO_1311: ModoAparencia1311 = 'all'", "KINEO_APARENCIA_DO_PEDIDO_1311: ModoAparencia1311 = 'off'") }],
  ['M2 começo ignorado', { [ESC]: troca('return cabeca.length < CABECA_GRAVADA_CHARS ? texto === cabeca : texto.startsWith(cabeca)', 'return true') }],
  ['M3 "named" desligado', { [FICHA]: troca('?? (opcoes.aparencia1311 ? nomeadoNoPedido(pedido, f, nomes) : null)', '') }],
  ['M4 ficha do roteiro não cede', { [FICHA]: troca("(f.origem === 'autor' && !autorDoRoteiro)", "f.origem === 'autor'") }],
  ['M5 cirílico fora do look', { [ESTILO]: troca('...(regrasDeLinguaLigadas() ? [ESTILO_CIRILICO_1311] : []),', '') }],
  ['M6 marca de estilo vira assunto', { [QUAL]: troca('if (regrasDeLinguaLigadas() && marcaDeEstilo(m[0])) continue', '') }],
  ['M7 rota sem recuperação', { [ROTA]: troca('if (ideiaDoEscritor) { body.original_idea = ideiaDoEscritor;', 'if (ideiaDoEscritor) {') }],
]
for (const [nome, mut] of MUTANTES) {
  const alvo = Object.entries(mut).every(([arq, fn]) => fn(ler(arq)) !== ler(arq))
  if (!alvo) { console.log(`FALHA ${nome}: alvo não encontrado`); falhas++; continue }
  const m = problemas(mut)
  if (!m.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++; continue }
  console.log(`ok  ${nome}: vermelho (${m[0]})`); ok++
}
console.log(`${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
