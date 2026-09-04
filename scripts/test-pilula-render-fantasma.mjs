// TESTE — A PILULA FANTASMA (sprint-assinaturas #9, 2026-09-03)
//
// Sem rede, sem banco, sem credito. Executa a funcao pura DE VERDADE (lendo o
// .ts real e apagando so as anotacoes de tipo) e le os arquivos reais para
// provar quem a chama e onde.
// Roda: node scripts/test-pilula-render-fantasma.mjs
//
// O NUMERO QUE DOIA (14 dias, contas externas): 152 cliques na pilula, 95 em
// state='rendering', e 54 desses 95 (57%) com `render_id: null` — render que
// /studio/create nao sabe religar. 11 pessoas; 6 delas NUNCA tiveram um filme
// completo. Caso vivo: 03/09 22:59→23:00 BRT, 16 cliques em cinco minutos, de
// uma pessoa vinda do chatgpt.com renderizando a PARTE 2 de uma serie.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd()
const lerArquivo = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8')
const rota = lerArquivo('app/api/compose/active/route.ts')
const pill = lerArquivo('components/ActiveRenderPill.tsx')
// So codigo: os cabecalhos citam de proposito as coisas que juram NAO fazer.
const soCodigo = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
const pillCode = soCodigo(pill)
const rotaCode = soCodigo(rota)

let passou = 0
const falhas = []
function checa(nome, cond) {
  if (cond) { passou++; console.log('  ok  ' + nome) }
  else { falhas.push(nome); console.log('  XX  ' + nome) }
}
const conta = (t, s) => t.split(s).length - 1

console.log('\n  TESTE — render sem id para de ganhar uma porta que nao abre\n')

// ── a funcao pura, executada de verdade ───────────────────────────────────
// Sem loader de TypeScript no node: apaga as declaracoes de tipo (que nao
// existem em tempo de execucao) e importa o RESTO DO ARQUIVO REAL. Se alguem
// mudar a logica, este teste ve; se alguem mudar so um tipo, nao ve nada.
function paraJs(fonte) {
  const linhas = fonte.split('\n')
  const saida = []
  let pulandoBloco = false
  for (const linha of linhas) {
    if (pulandoBloco) {
      if (/^\}/.test(linha)) pulandoBloco = false
      continue
    }
    if (/^export type \w+ = \{/.test(linha)) { pulandoBloco = true; continue }
    if (/^export type \w+ =/.test(linha)) continue
    saida.push(linha)
  }
  return saida
    .join('\n')
    .replace(/export function alvoDaPilula\(entrada: \{[\s\S]*?\n\}\): AlvoDaPilula \{/, 'export function alvoDaPilula(entrada) {')
    // #10 (04/09) — o mesmo arquivo ganhou mesmaTela(); sem apagar estas duas
    // anotacoes o import quebrava e ESTE teste ficava vermelho sem defeito
    // nenhum no produto.
    .replace(/export function mesmaTela\(href: string, caminhoAtual: string \| null \| undefined\): boolean \{/, 'export function mesmaTela(href, caminhoAtual) {')
    .replace(/const normalizar = \(v: string\) =>/, 'const normalizar = (v) =>')
}

const fonteTs = lerArquivo('lib/renderPillTarget.ts')
const tmp = path.join(raiz, 'scripts', '.tmp-render-pill-target.mjs')
fs.writeFileSync(tmp, paraJs(fonteTs))
let alvoDaPilula = null
let FRASE = null
try {
  const m = await import(pathToFileURL(tmp).href + '?t=' + Date.now())
  alvoDaPilula = m.alvoDaPilula
  FRASE = m.FRASE_RENDER_NO_MOTOR
} catch (e) {
  console.log('  XX  a funcao pura nao carregou: ' + (e && e.message))
} finally {
  fs.rmSync(tmp, { force: true })
}
checa('a funcao pura carrega e e executavel', typeof alvoDaPilula === 'function')

if (typeof alvoDaPilula === 'function') {
  // O CASO DE PRODUCAO: cinematografico ainda no fal — a sonda responde
  // resumable:false e render_id null (documentado na propria rota desde 05/08).
  const cinema = alvoDaPilula({ state: 'rendering', renderId: null, resumable: false })
  checa('cinematografico sem id NAO vai para /studio/create', cinema.href !== '/studio/create')
  checa('cinematografico sem id vai para /history (onde o filme cai)', cinema.href === '/history')
  checa('cinematografico sem id nao se diz religavel', cinema.religavel === false)
  checa('o clique dele tem nome proprio na medicao', cinema.acao === 'track')
  checa('o rotulo nomeia o destino de verdade', cinema.badge === 'My Videos')

  // O OUTRO furo: a claim do compose nasce ANTES do id do Creatomate existir e
  // a rota respondia resumable:true. A fonte mais restritiva tem de vencer.
  const composePendente = alvoDaPilula({ state: 'rendering', renderId: null, resumable: true })
  checa('resumable:true com id nulo NAO vira porta de religacao', composePendente.href === '/history')
  checa('resumable:true com id nulo nao se diz religavel', composePendente.religavel === false)

  // O caminho que FUNCIONA continua igual — esta e a metade que nao pode quebrar.
  const vivo = alvoDaPilula({ state: 'rendering', renderId: 'abc-123', resumable: true })
  checa('render com id continua indo para /studio/create', vivo.href === '/studio/create')
  checa('render com id continua religavel', vivo.religavel === true)
  checa('render com id mantem o rotulo Open', vivo.badge === 'Open')
  checa('render com id mantem a acao resume', vivo.acao === 'resume')

  // Servidor calado sobre resumable (resposta de um deploy antigo): vale o id,
  // que e a evidencia dura.
  const semCampo = alvoDaPilula({ state: 'rendering', renderId: 'abc-123' })
  checa('sem o campo resumable, o id manda (religavel)', semCampo.religavel === true)
  const semCampoSemId = alvoDaPilula({ state: 'rendering', renderId: null })
  checa('sem o campo resumable e sem id, nao religa', semCampoSemId.religavel === false)

  // Os dois estados terminais nao podem ter mudado de destino.
  const pronto = alvoDaPilula({ state: 'completed', renderId: null, resumable: false })
  checa('video pronto continua indo para /history', pronto.href === '/history')
  checa('video pronto continua com Watch', pronto.badge === 'Watch' && pronto.acao === 'watch')
  const morto = alvoDaPilula({ state: 'failed', renderId: null, resumable: false })
  checa('render morto continua voltando ao compositor', morto.href === '/studio/create')
  checa('render morto continua com Try again', morto.badge === 'Try again' && morto.acao === 'retry')

  // Invariante de forma: nenhum destino inventado.
  const destinos = [cinema, composePendente, vivo, pronto, morto].map((a) => a.href)
  checa('so existem dois destinos possiveis',
    destinos.every((h) => h === '/history' || h === '/studio/create'))
  checa('a frase de apoio nao fala de credito/plano/preco (fronteira do Codex)',
    typeof FRASE === 'string' && !/credit|plan|price|upgrade|\$/i.test(FRASE))
  checa('a frase de apoio promete o que o produto cumpre (My Videos)',
    typeof FRASE === 'string' && FRASE.includes('My Videos'))
}

// ── o servidor ────────────────────────────────────────────────────────────
console.log('\n  — servidor (a sonda parou de prometer religacao sem id) —\n')
checa('a rota tem a marca da rodada', rota.includes('KINEO-PILULA-FANTASMA-2026-09-03'))
checa('o ramo compose NAO manda mais resumable:true fixo', !rotaCode.includes('resumable: true,'))
checa('resumable do ramo compose deriva do id usavel', rotaCode.includes('resumable: Boolean(idUsavel),'))
checa('render_id e o MESMO valor que decide resumable (nao ha duas contas)',
  rotaCode.includes('render_id: idUsavel,'))
checa('o ramo cinematografico continua resumable:false', conta(rotaCode, 'resumable: false,') >= 1)
checa('a sonda continua so lendo (nenhuma escrita nova)',
  !rota.includes('.insert(') && !rota.includes('.update(') && !rota.includes('.delete('))
checa('os dois returns de rendering continuam existindo', conta(rotaCode, "state: 'rendering',") === 2)
checa('o teto de 160 do id continua sendo cobrado', rotaCode.includes('renderId.length <= 160'))

// ── o cliente ─────────────────────────────────────────────────────────────
console.log('\n  — cliente (a pilula obedece a uma unica decisao) —\n')
checa('a pilula tem a marca da rodada', pill.includes('KINEO-PILULA-FANTASMA-2026-09-03'))
checa('a pilula importa a funcao pura', pillCode.includes("from '@/lib/renderPillTarget'"))
checa('o tipo Probe passou a carregar resumable',
  pillCode.includes("state: 'rendering'; renderId: string | null; resumable: boolean"))
checa('a pilula le resumable da resposta e cruza com o id',
  pillCode.includes('resumable: data.resumable !== false && Boolean(renderIdLido),'))
checa('o destino do clique vem da funcao (nao ha ternario solto)',
  pillCode.includes('router.push(alvo.href)') &&
  !pillCode.includes("router.push(probe.state === 'completed' ? '/history' : '/studio/create')"))
checa('o rotulo do botao vem da funcao', pillCode.includes('{alvo.badge}'))
checa('o rotulo antigo, fixo, sumiu', !pillCode.includes("isRendering ? 'Open' :"))
checa('a acao medida vem da funcao', pillCode.includes('action: alvo.acao,'))
checa('o evento de clique passa a dizer se era religavel', pillCode.includes('resumable: alvo.religavel,'))
checa('o evento de impressao passa a dizer se e religavel',
  pillCode.includes("resumable: probe.state === 'rendering' ? probe.resumable : null,"))
checa('o render no motor ganha a frase honesta no title', pillCode.includes('FRASE_RENDER_NO_MOTOR'))
checa('a pilula continua sem falar com /api/compose/status (um so poller)',
  !pillCode.includes('/api/compose/status'))
checa('a pilula continua sem tocar em credito/plano/preco',
  !/credits|upgrade|pricing|checkout/i.test(pillCode))
checa('a pilula continua sondando so /api/compose/active',
  conta(pillCode, "fetch('/api/compose/active'") === 1)

// ── a ponte com o outro lado ──────────────────────────────────────────────
const gc = lerArquivo('app/(dashboard)/generate/GenerateClient.tsx')
checa('a razao do conserto continua verdadeira: resumeServerActiveRender sai sem renderId',
  gc.includes("if (!probe || probe.state !== 'rendering' || !probe.renderId) return"))

console.log(`\n  ${passou} verificacoes ok, ${falhas.length} falhas\n`)
if (falhas.length) { falhas.forEach((f) => console.log('  FALHOU: ' + f)); process.exit(1) }
