import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const arquivo = 'lib/cinematic/epocaVisual2411.ts'
const fonte = readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n')
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
  atual: m => {
    const secoes = [
      {voiceover:'In 1890 he boards.',pexelsQuery:'a wooden train'},
      {voiceover:'Today visitors see the camera made in 1888.',pexelsQuery:'present-day visitor in a modern museum'},
      {voiceover:'Today we tell his story.',pexelsQuery:'a man operating the camera in 1888'},
      {voiceover:'The inventor made the camera in 1888.',pexelsQuery:'present-day visitor in a modern museum'},
    ]
    const relato=m.prepararEpocaVisual({internal:true,pedido:'In 1890 he boards. Today visitors return.',secoes,falas:secoes.map(s=>s.voiceover)})
    assert.deepEqual([...relato.secoes],['1890','present day','1888','present day'])
  },
  acao: m => {
    const pista='A man in a suit holds the briefcase.'
    const base='Interior view of the cabin. '.repeat(13) + pista + ' Mouth closed, no speaking.'
    const p=m.aplicarEpocaVisual(base,'1971',false,pista)
    assert.ok(p.indexOf('briefcase') < 200)
    assert.ok(p.endsWith('Mouth closed, no speaking.'))
    assert.doesNotMatch(m.aplicarEpocaVisual(base,'1971',false,'A forbidden name by a bank.'),/forbidden name/)
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
  objeto: m => {
    const secoes = [
      {voiceover:'In 1888 he turns the camera.',pexelsQuery:'a man in an 1880s suit'},
      {voiceover:'The inventor made this camera in 1888.',pexelsQuery:'a visitor in a museum in 1920'},
      {voiceover:'In 1935 a visitor inspects the exhibit.',pexelsQuery:'a restored camera made in 1888'},
      {voiceover:'In 1888 the inventor opens the box.',pexelsQuery:'a visitor in the museum in 1920'},
    ]
    const relato=m.prepararEpocaVisual({internal:true,pedido:secoes.map(s=>s.voiceover+' '+s.pexelsQuery).join(' '),secoes,falas:secoes.map(s=>s.voiceover)})
    assert.deepEqual([...relato.secoes],['1888','1920','1935','1920'])
    assert.equal(m.prepararEpocaVisual({...entrada,pedido:'A visitor examines a camera manufactured in 1888.'}),null)
  },
  relogio: m => {
    const year = new Date().getUTCFullYear()
    for (const pedido of ['On November 24, ' + year + ', the train arrives.', 'In ' + (year + 58) + ', a train arrives.']) {
      assert.equal(m.prepararEpocaVisual({...entrada, pedido, secoes:[], falas:[pedido]}), null)
    }
  },
  museu: m => {
    for (const pedido of ['Inside a modern museum the curator displays an 1888 camera.', 'In the modern museum today, a visitor views a camera from 1888.', 'In a modern museum a visitor opens a drawer. The label reads: in 1888, the inventor patented the mechanism.']) {
      assert.equal(m.prepararEpocaVisual({...entrada, pedido, secoes:[], falas:[pedido]}), null)
    }
  },
  vazio: m => {
    assert.equal(m.aplicarEpocaVisual('', '1888'), '')
    assert.doesNotMatch(m.aplicarEpocaVisual('An empty room without people.', '1888'), /people in period-accurate clothing/i)
  },
  cabine: m => {
    for (const subject of ['airplane', 'jet']) assert.match(m.aplicarEpocaVisual('The '+subject+' passes.', '1971'), /cabin fittings/)
  },
  orcamento: m => {
    const autor = 'A jet passes. ' + '🌊'.repeat(375) + ' The last action.'
    const curtoa = 'Period setting: 1971. ' + autor
    const tamanho = Array.from(curtoa).length
    assert.equal(m.aplicarEpocaVisual(autor,'1971',false,undefined,tamanho),curtoa)
    assert.equal(m.aplicarEpocaVisual(autor,'1971',false,undefined,tamanho-1),autor)
    assert.match(m.aplicarEpocaVisual(autor,'1971',false,undefined,512),/period airframe and cabin fittings/)
  },
  variantes: m => {
    for (const [pedido, esperado] of [['London in the nineteenth century.','19th century'],['Uma rádio nos anos 70.','1970s'],["A radio in the '80s.",'1980s']]) {
      assert.equal(m.prepararEpocaVisual({...entrada,pedido,secoes:[],falas:['A radio.']})?.ficha,esperado)
    }
  },
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
 ['relogio','Number(ano[1]) < anoAtual', 'true'],
 ['museu',"agora(pedido) && !datas.some", "false && !datas.some"],
 ['vazio',"!epoca || !prompt.trim()", "!epoca"],
 ['vazio',"'authentic period materials for the described setting'","'People in period-accurate clothing'"],
 ['cabine','plane|airplane|aeroplane|airliner|jet|cabin|aircraft','plane|airliner|cabin|aircraft'],
 ['orcamento','return semMarca','return semMarca.slice(0,120)'],
 ['orcamento',"periodo = 'Period setting: ' + epoca + '.'","periodo = ''"],
 ['externo','!internal ||','false ||'],
 ['desligado',"modo !== 'internal'","false"],
 ['semData','if (!geral) return null','if (false) return null'],
 ['calendario','if (data) epoca = data','if (false) epoca = data'],
 ['fundida','sequencia[grupo[0]]','sequencia[0]'],
 ['anterior',"antes ? 'before ' + geral : geral",'geral'],
 ['seculo','return seculoValido ?','return false ?'],
 ['folha',"const design = folha ? tecido","const design = folha ? 'architecture'"],
 ['atual',"if (agora(s.pexelsQuery)) return 'present day'","if (false) return 'present day'"],
 ['objeto','      return visual\n','      return voz || visual\n'],
 ['variantes','WRITTEN_CENTURIES.indexOf(escrito[1].toLowerCase()) + 1','0'],
 ['acao','if (acao >= 0)','if (false)'],
 ['limite',"prompt.replace(MARCA, '')","prompt.replace(/IMPOSSIVEL/u, '')"],
]
for(const [alvo,de,para] of mutantes) {
  assert.equal(fonte.split(de).length,2,'mutação única: '+de)
  const mutant=carregar(fonte.replace(de,()=>para))
  assert.throws(()=>cases[alvo](mutant),{code:'ERR_ASSERTION'},alvo+' sobreviveu')
}
console.log(Object.keys(cases).length+' controles e '+mutantes.length+' mutantes mortos pela asserção designada.')
