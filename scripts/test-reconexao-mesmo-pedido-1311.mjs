// KINEO-RECONEXAO-MESMO-PEDIDO-1311 — guardião do 409 "generation id belongs to a different cinematic request" (caso de 13/11 23:03Z).
// A tela reenvia o MESMO pedido quando a 1ª resposta demora; o servidor reescreve a ideia solta com a IA a cada chamada; se a impressão
// digital do pedido (claimFingerprint) usar esse roteiro, a reconexão vira "outro pedido" e a pessoa vê a tela de falha com o filme saindo.
// Prova: (1) a impressão digital usa promptDoPedido (o que a pessoa pediu), (2) promptDoPedido é tirado ANTES do escritor e nunca muda,
// (3) EXECUTANDO a regra de "mesmo pedido" do claim (sameIntent de lib/cinematic/claim.ts) com dois roteiros diferentes do escritor para o
// mesmo pedido: mesma intenção → 'pending' (a tela espera), e não 'conflict'. Mutantes. Rodar: node scripts/test-reconexao-mesmo-pedido-1311.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'

const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const ROTA = 'app/api/generate-video-cinematic/route.ts'

function bateria(src) {
  const p = []
  const check = (n, fn) => { try { fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const declara = src.indexOf('    const promptDoPedido = prompt\n')
  const escritor = src.indexOf('    const ideiaNoEscritor = await escreverIdeiaNoServidor({')
  const reescreve = src.indexOf('    if (ideiaNoEscritor.usar) prompt = ideiaNoEscritor.prompt')
  const fpIni = src.indexOf('    const claimFingerprint = cinematicRequestFingerprint({')
  const fp = fpIni >= 0 ? src.slice(fpIni, src.indexOf('    })', fpIni)) : ''
  check('pedido da pessoa tirado ANTES do escritor', () => {
    if (declara < 0 || escritor < 0 || reescreve < 0) throw new Error('âncoras sumiram')
    if (!(declara < escritor && escritor < reescreve)) throw new Error('ordem')
    if (/[^.\w]promptDoPedido\s*=[^=]/.test(src.slice(declara + 35))) throw new Error('promptDoPedido reatribuído')
  })
  check('impressão digital usa o pedido da pessoa', () => {
    if (!fp) throw new Error('bloco da impressão digital sumiu')
    if (!/\n\s*prompt: promptDoPedido,/.test(fp)) throw new Error('não usa promptDoPedido')
    if (/\n\s*prompt,\n/.test(fp) || /\n\s*prompt: prompt\b/.test(fp)) throw new Error('usa o roteiro reescrito')
    if (fpIni < reescreve) throw new Error('impressão digital antes do escritor (âncora mudou)')
  })
  check('reconexão com outro roteiro do escritor = mesmo pedido (executado)', () => {
    // A mesma conta do claim: a impressão digital é um hash do valor, e sameIntent compara impressão + custo + qualidade + motor.
    const claim = lf('lib/cinematic/claim.ts')
    const m = /function sameIntent\([\s\S]*?\n}\n/.exec(claim)
    if (!m) throw new Error('sameIntent sumiu do claim')
    const sameIntent = new Function(`${m[0].replace(/: [A-Za-z{][^,)=]*?(?=[,)])/g, '').replace(/\):\s*boolean\s*{/, ') {')}; return sameIntent`)()
    const hash = (v) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')
    const pedido = 'Les secrets de Madinina — épisode 1 (briefing longo colado)'
    const roteiros = ['HOOK: A ilha guarda um segredo…', 'HOOK: Ninguém em Madinina fala disso…'] // o escritor muda a cada chamada
    const fpDe = (roteiro) => hash({ prompt: fp.includes('prompt: promptDoPedido') ? pedido : roteiro, duration: 15, engine: 'kling4' })
    const primeiro = { fingerprint: fpDe(roteiros[0]), creditCost: 0, quality: 'cinematic_ai', engine: 'kling4' }
    const reconexao = { fingerprint: fpDe(roteiros[1]), creditCost: 0, quality: 'cinematic_ai', engine: 'kling4' }
    if (!sameIntent(primeiro, reconexao)) throw new Error('a reconexão vira "different cinematic request" (409 na tela)')
  })
  return p
}

const fonte = lf(ROTA)
const real = bateria(fonte)
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const mutantes = [
  ['impressão digital volta ao roteiro reescrito', fonte.replace('      prompt: promptDoPedido, // KINEO-RECONEXAO', '      prompt, // KINEO-RECONEXAO')],
  ['pedido tirado DEPOIS do escritor', fonte.replace('    const promptDoPedido = prompt\n', '').replace('    if (ideiaNoEscritor.usar) prompt = ideiaNoEscritor.prompt', '    if (ideiaNoEscritor.usar) prompt = ideiaNoEscritor.prompt; const promptDoPedido = prompt')],
]
let mortos = 0
for (const [n, src] of mutantes) {
  if (src === fonte) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if (bateria(src).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS reconexão do mesmo pedido: a impressão digital usa o pedido da pessoa (tirado antes do escritor), a reconexão com outro roteiro é o mesmo pedido; ${mortos}/${mutantes.length} mutantes mortos`)
