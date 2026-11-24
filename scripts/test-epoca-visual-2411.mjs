import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const arquivo = 'lib/cinematic/epocaVisual2411.ts'
const fonte = readFileSync(arquivo, 'utf8')
function carregar(texto) {
  return createOfflineLoader({ source: (rel, original) => rel === arquivo ? texto : original })(arquivo)
}
const voices = ['In 1888, he turns the camera.', 'Two years later, he boards.', 'The train arrives.']
const hints = ['a man in an 1880s suit', 'a man in a long 1890 coat', 'an empty compartment']
const scenes = voices.map((voiceover, i) => ({voiceover, pexelsQuery:hints[i]}))
const pedido = scenes.map(s => s.pexelsQuery + ' ' + s.voiceover).join('\n')
const entrada = { internal:true, pedido, secoes:scenes, falas:[voices[0], voices.slice(1).join(' ')] }
const cases = {
  externo: m => assert.equal(m.prepararEpocaVisual({...entrada,internal:false}),null),
  desligado: m => assert.equal(m.prepararEpocaVisual({...entrada,modo:'off'}),null),
  semData: m => {
    for (const p of ['The figure turns in the rain.', 'An invoice for 1900 euros.', 'In 1920 x 1080 the frame looks sharp.', 'He checks model 1971.', 'In 1900 metres turn left.']) {
      assert.equal(m.prepararEpocaVisual({...entrada,pedido:p}),null,p)
    }
  },
  calendario: m => assert.deepEqual([...m.prepararEpocaVisual(entrada).secoes],['1888','1890','1890']),
  fundida: m => assert.deepEqual([...m.prepararEpocaVisual(entrada).cenas],['1888','1890']),
  anterior: m => {
    const falas=['He sails around the world.', 'In 1909, he sets out once more.']
    const r=m.prepararEpocaVisual({internal:true,pedido:falas.join(' '),secoes:falas.map(voiceover=>({voiceover,pexelsQuery:''})),falas})
    assert.deepEqual([r.ficha,...r.cenas],['before 1909','before 1909','1909'])
  },
  seculo: m => assert.equal(m.prepararEpocaVisual({...entrada,pedido:'A port in the 18th century.',secoes:[],falas:['A port.']})?.ficha,'18th century'),
  decada: m => assert.equal(m.prepararEpocaVisual({...entrada,pedido:'Uma estação nos anos 1970.',secoes:[],falas:['Um trem.']}).ficha,'1970s'),
  folha: m => {
    const r=m.aplicarEpocaVisual('Charcoal suit on a plain studio background.', '1971',true)
    assert.match(r,/1971.*lapel width/)
    assert.match(r,/plain studio background/)
    assert.doesNotMatch(r,/transport|architecture|airframe/)
  },
  limite: m => {
    const r=m.aplicarEpocaVisual('Period setting: 1888. An empty train rolls past.', '1890')
    assert.match(r,/^Period setting: 1890/)
    assert.doesNotMatch(r,/1888|dress|wears/)
    assert.equal(m.aplicarEpocaVisual(r,'1890'),r)
    assert.equal(m.aplicarEpocaVisual('  old bytes \\n',undefined),'  old bytes \\n')
  },
}
const normal=carregar(fonte)
for(const run of Object.values(cases)) run(normal)
const mutantes=[
 ['externo','!internal ||','false ||'],
 ['desligado',"modo !== 'internal'","false"],
 ['semData','if (!geral) return null','if (false) return null'],
 ['calendario','if (data) epoca = data','if (false) epoca = data'],
 ['fundida','sequencia[grupo[0]]','sequencia[0]'],
 ['anterior',"antes ? 'before ' + geral : geral",'geral'],
 ['seculo','return seculoValido ?','return false ?'],
 ['folha',"const design = folha ? tecido","const design = folha ? 'architecture'"],
 ['limite',"prompt.replace(MARCA, '')","prompt.replace(/IMPOSSIVEL/u, '')"],
]
for(const [alvo,de,para] of mutantes) {
  assert.equal(fonte.split(de).length,2,'mutação única: '+de)
  const mutant=carregar(fonte.replace(de,()=>para))
  assert.throws(()=>cases[alvo](mutant),{code:'ERR_ASSERTION'},alvo+' sobreviveu')
}
console.log(Object.keys(cases).length+' controles e '+mutantes.length+' mutantes mortos pela asserção designada.')
