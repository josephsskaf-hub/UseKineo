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
  proveniencia: m => {
    // No "today" or modern-museum cue. Only the item is dated, not the scene.
    const objetos = [
      'A curator examines the 1888 camera in a museum.',
      'A visitor studies a camera manufactured back in 1888.',
      'A scholar sees a camera first used in 1888.',
      'A guide holds a photograph taken in 1888.',
      'A visitor looks at a lens that dates from 1888.',
      'A conservator examines a violin that is from 1888.',
      'A vintage 1888 camera rests on the desk.',
      'The camera from the year 1888 is displayed behind glass.',
      'A student examines a coin minted in 1888.',
      'A visitor studies a manuscript illuminated in 1888.',
      'The sculpture carved in 1888 stands on the table.',
      'A porcelain vase, fired in 1888, is on display.',
      'A portrait dating from the early 1880s hangs on the wall.',
      'She visits the exhibition with a sketch from circa 1888.',
      'O visitante observa um instrumento de 1888.',
      'A collector admires a nineteenth-century telescope.',
    ]
    for (const voiceover of objetos) {
      const entrada = {internal:true, pedido:voiceover, secoes:[{voiceover,pexelsQuery:'a visitor looking at the exhibit'}],falas:[voiceover]}
      assert.equal(m.prepararEpocaVisual(entrada), null, voiceover)
      for (const pedido of [voiceover + ' In 1920 the museum opens.', 'In 1920 the museum opens. ' + voiceover]) {
        const epoca = m.prepararEpocaVisual({...entrada, pedido, secoes:[{voiceover,pexelsQuery:'the museum in 1920'}]})
        assert.deepEqual([epoca?.ficha,...(epoca?.cenas ?? [])], ['1920','1920'], pedido)
      }
    }
    for (const pedido of ['In 1888 a photographer opens his workshop.', 'A man operating the camera in 1888.', 'He picked the lock and escaped in 1888.']) {
      assert.equal(m.prepararEpocaVisual({internal:true,pedido, secoes:[],falas:[pedido]})?.ficha,'1888',pedido)
    }
  },
  periodosAtuais: m => {
    const ano = new Date().getUTCFullYear()
    const decada = Math.floor(ano/10)*10
    const seculo = Math.ceil(ano/100)
    for (const pedido of ['In the ' + decada + 's a visitor arrives.', 'Uma visita no século ' + seculo + '.', 'The 0th century.', 'The 00th century.']) {
      assert.equal(m.prepararEpocaVisual({internal:true,pedido,secoes:[],falas:[pedido]}), null, pedido)
    }
  },
  formatosDeProveniencia: m => {
    const referencias = [
      ['a coin minted in 79 AD', 'In 79 AD the courier departs.', '79 AD'],
      ['a sculpture carved in 300 BC', 'In 300 BC a sculptor walks to the quarry.', '300 BC'],
      ['a camera made on November 22, 1888', 'On November 22, 1888, a photographer opens her studio.', '1888'],
      ['a watch produced around 1888', 'Around 1888 a traveler boards the train.', '1888'],
      ['an amphora recovered around 137 BCE', 'In 137 BCE an envoy sets sail.', '137 BCE'],
      ['a map printed circa 72 CE', 'In 72 CE the scribe opens his workshop.', '72 CE'],
      ['a portrait painted during the 18th century', 'During the 18th century the workshop opens.', '18th century'],
      ["a ticket printed in the '80s", "The scene takes place in the '80s.", '1980s'],
      ['uma gravura produzida nos anos 1970', 'Uma estação nos anos 1970.', '1970s'],
    ]
    const ficha = (pedido) => m.prepararEpocaVisual({internal:true,pedido,secoes:[{voiceover:pedido,pexelsQuery:pedido}],falas:[pedido]})?.ficha ?? null
    for (const [objeto, acao, epoca] of referencias) {
      assert.equal(ficha('A visitor examines ' + objeto + '.'),null,objeto)
      assert.equal(ficha(objeto),null,objeto)
      assert.equal(ficha(acao),epoca,acao)
      assert.equal(ficha('A visitor examines ' + objeto + '. In 1920 a visitor opens the door.'),'1920',objeto)
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
  pontoDaAcao: m => {
    const pista = 'The visitor unfolds the ancient letter'
    const base = '🌊 '.repeat(180) + 'Wind moves outside. ' + pista
    const curto = 'Period setting: 1888. ' + base
    const teto = [...curto].length
    // With room for the date alone, moving the unpunctuated last sentence
    // adds punctuation. Keep the original order rather than displace a word.
    assert.equal(m.aplicarEpocaVisual(base,'1888',false,pista,teto),curto)
    const maisEspaco = m.aplicarEpocaVisual(base,'1888',false,pista,teto+1)
    assert.ok(maisEspaco.indexOf(pista)<50)
    assert.equal([...maisEspaco].length,teto+1)
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
 ['formatosDeProveniencia','new RegExp([ANO_COM_ERA, SECULO','new RegExp([SECULO'],
 ['formatosDeProveniencia',"contexto.replace(MES_ANTES_DO_ANO, '')",'contexto'],
 ['formatosDeProveniencia','|by|since|around|circa|about|desde)','|by|since|desde)'],
 ['proveniencia','semDatasDeObjeto(comAnosPorExtenso(texto))','comAnosPorExtenso(texto)'],
 ['proveniencia','if (origem &&','if (false &&'],
 ['proveniencia','if (participio || complemento || sujeito)','if (participio || sujeito)'],
 ['proveniencia','if (participio || complemento || sujeito)','if (participio || complemento)'],
 ['periodosAtuais','Number(inicio) + 9 < anoAtual','Number(inicio) < anoAtual'],
 ['periodosAtuais','numero < Math.ceil(anoAtual / 100)','numero <= Math.ceil(anoAtual / 100)'],
 ['pontoDaAcao','Array.from(movido).length <= teto','true'],
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
