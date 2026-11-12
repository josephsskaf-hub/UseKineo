// KINEO-PRONOME-DO-OBJETO-1212 [CEO 12/11 madrugada, "o conserto de US$ 0 do 'her' do Peruggia"] — guardião sem rede e sem custo, com o roteiro REAL.
// Caso: Mona Lisa 1911 (H3 Max, 6,5). No elenco determinístico (lib/cinematic/folhaDePersonagem.ts → elencoDoRoteiro), "Peruggia tried selling her in
// Florence" fazia do Peruggia "a woman in their early thirties": o "her" é o QUADRO. Trava: (a) Mona Lisa real → Peruggia homem; (b) "she" continua
// mulher; (c) navio ("sailed her past") não faz do Tom mulher; (d) possessivo ("raised her sword") continua mulher; (e) sem coisa feminina no roteiro, o
// "her" objeto ainda conta ("cheered her on" → Lena mulher). Mutantes: sem o filtro do objeto · sem o ofício "handyman" · filtro sem a guarda da coisa.
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const FOLHA = 'lib/cinematic/folhaDePersonagem.ts'
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === FOLHA ? mutar(t) : t) })('lib/cinematic/personagemAjuste.ts')

const MONA = ['The Mona Lisa vanished... and nobody noticed until the next day.', 'Vincenzo Peruggia, an Italian handyman, hid in a storage closet.', 'On Monday, he slipped the painting under his white work smock.', 'Crowds lined up to see... four empty iron hooks.', 'Paris panicked. Picasso questioned. Apollinaire jailed.', 'Two years. Hidden. In a trunk.', 'In 1913, Peruggia tried selling her in Florence... The dealer called the police.'].join(' ')
const CASOS = [
  ['(a) Mona Lisa real: Peruggia é homem', MONA, 'Peruggia', 'man'],
  ['(b) "she" continua mulher', 'Maria opened the old shop. She smiled at every customer. Maria counted the coins she earned. She closed the door at night.', 'Maria', 'woman'],
  ['(c) navio: Tom não vira mulher', 'Tom bought an old boat. He painted her blue. Tom sailed her past the harbour. Tom waved at the crowd from his deck.', 'Tom', 'man'],
  ['(d) possessivo continua mulher', 'Queen Anna rode into the city. Anna raised her sword. Anna spoke to the soldiers.', 'Anna', 'woman'],
  ['(e) sem coisa feminina, o "her" objeto conta', 'Lena ran onto the stage. The crowd cheered her on. Lena bowed to the crowd.', 'Lena', 'woman'],
]
function problemas(A) {
  const p = []
  for (const [nome, texto, quem, genero] of CASOS) {
    const f = A.elencoDoRoteiro(texto).find((x) => x.nome === quem)
    if (!f) { p.push(`${nome}: sem ficha`); continue }
    if (f.genero !== genero || !new RegExp(`^${quem}, an? (?:elderly )?${genero}\\b`).test(f.canonica)) p.push(`${nome}: ${f.genero} · ${f.canonica.slice(0, 60)}`)
  }
  return p
}
let ok = 0
const atual = problemas(carrega())
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
console.log(`ok  estado atual limpo (${CASOS.length} casos)`); ok++
const MUTANTES = [
  ['M1 sem o filtro do objeto', (t) => t.replace("return COISA_ELA_RE.test(roteiro) ? texto.replace(HER_OBJETO_RE, 'it') : texto", 'return texto')],
  ['M2 sem o ofício "handyman"', (t) => t.replace('prince|handyman|', 'prince|')],
  ['M3 filtro sem a guarda da coisa', (t) => t.replace("return COISA_ELA_RE.test(roteiro) ? texto.replace(HER_OBJETO_RE, 'it') : texto", "return texto.replace(HER_OBJETO_RE, 'it')")],
]
let falhas = 0
for (const [nome, mutar] of MUTANTES) {
  let alvoAchado = false
  const m = problemas(carrega((t) => { const n = mutar(t); alvoAchado = n !== t; return n }))
  if (!alvoAchado) { console.log(`FALHA ${nome}: alvo não encontrado`); falhas++; continue }
  if (!m.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++; continue }
  console.log(`ok  ${nome}: vermelho (${m[0]})`); ok++
}
console.log(`${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
