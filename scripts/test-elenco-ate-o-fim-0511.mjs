// KINEO-ELENCO-ATE-O-FIM-0511 — guardião: filme longo mantém a mesma pessoa até o fim; a aparência escrita pelo autor entra na ficha;
// comparação com "ancient" ao lado de objeto de hoje não vira filme de época. Caso real: Roland (215e1fc0), 05/11.
// Rodar: node scripts/test-elenco-ate-o-fim-0511.mjs
import fs from 'node:fs'
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const F = lf('lib/cinematic/folhaDePersonagem.ts'), E = lf('lib/cinematic/elencoSemantico.ts'), R = lf('app/api/generate-video-cinematic/route.ts')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

// 1. teto
const teto = (t) => Number(/export const PERSONAGEM_MAX_STILLS = (\d+)/.exec(t)?.[1] ?? 0)
ok(teto(F) >= 11, 'o teto cobre o filme de 11 cenas')
ok(teto(F.replace('PERSONAGEM_MAX_STILLS = 14', 'PERSONAGEM_MAX_STILLS = 9')) < 11, 'mutante: teto 9 fica vermelho')

// 2. prazo do lote cresce com o filme e tem limite
const prazo = /const prazoP = Date\.now\(\) \+ (Math\.min\(110_000, Math\.max\(60_000, filaP\.length \* 8_000\)\))/.exec(R)
ok(!!prazo, 'o prazo do lote acompanha o número de cenas')
const calc = (n) => new Function('filaP', 'return ' + prazo[1])({ length: n })
ok(calc(3) === 60_000 && calc(11) === 88_000 && calc(14) === 110_000, 'filme curto segue em 60 s; 11 cenas = 88 s; 14 cenas = 110 s')

// 3. aparência colada, em cima do código real
const bloco = (ini, fim) => { const i = E.indexOf(ini); const j = E.indexOf(fim, i); return E.slice(i, j) }
const fonte = bloco('const APARENCIA_COLADA_RE', 'export function trechoDaPessoa').replace('export function aparenciaColada(texto: string, fim: number): string | null', 'function aparenciaColada(texto, fim)')
const aparenciaColada = new Function('limpa', fonte + '\nreturn aparenciaColada')((s) => String(s).replace(/\s+/g, ' ').trim())
const depois = (texto, trecho) => aparenciaColada(texto, texto.indexOf(trecho) + trecho.length)
const ROLAND = "Meet Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair. He's convinced"
ok(depois(ROLAND, 'a gruff old man') === 'with shoulder-length gray-brown hair', 'Roland: o cabelo do autor entra')
ok(depois('Ana, uma senhora com cabelos brancos e óculos, abriu', 'uma senhora') === 'com cabelos brancos e óculos', 'português entra')
ok(depois('Luz, una mujer con el pelo rojo, corre', 'una mujer') === 'con el pelo rojo', 'espanhol entra')
ok(depois('Sam, a farmer with a broken tractor, waits', 'a farmer') === null, 'o que não é aparência fica de fora')
ok(depois('Sam, a farmer. With gray hair she came', 'a farmer') === null, 'outra frase fica de fora')
const literal = E.includes('const aparencia = aparenciaColada(texto, Math.max(papel?.fim ?? 0, idade?.fim ?? 0))') && E.includes('if (aparencia) literal = `${literal} ${aparencia}`')
ok(literal, 'trechoDaPessoa usa a aparência colada')

// 4. época, em cima do código real da rota
const i = R.indexOf('const ERA_YEAR_RE'), j = R.indexOf('// #441', i)
const era = new Function(R.slice(i, j).replace('function eraLockSuffix(context: string): string', 'function eraLockSuffix(context)') + '\nreturn eraLockSuffix')()
ok(era("the fridge's manual, which he compared to ancient hieroglyphics. A new smart fridge") === '', 'Roland: geladeira inteligente não vira filme de época')
ok(era('Ancient Rome fell as the legions marched north').includes('period piece'), 'Roma antiga continua travada')
ok(era('In 1912 a smart phone was unthinkable').includes('the year 1912'), 'ano escrito continua travando')
const eraMutante = new Function(R.slice(i, j).replace('function eraLockSuffix(context: string): string', 'function eraLockSuffix(context)').replace(' || OBJETO_DE_HOJE_RE.test(ctx)', '') + '\nreturn eraLockSuffix')()
ok(eraMutante('ancient hieroglyphics and a smart fridge').includes('period piece'), 'mutante: sem a regra, volta o defeito')

// 5. a fala inteira cabe no filme
const C = lf('lib/compose.ts')
const fim = (t) => t.includes('let totalDuration = clamp(Math.ceil(masterDuration * 10) / 10, hasAvatar ? 3 : 5, hasAvatar ? 90 : 120)')
ok(fim(C), 'fora do avatar, a fala manda até 120 s')
ok(!fim(C.replace('hasAvatar ? 90 : 120)', '90)')), 'mutante: corte em 90 s fica vermelho')

console.log('\n' + pass + ' ok, ' + fail + ' falha(s)')
process.exit(fail ? 1 : 0)
