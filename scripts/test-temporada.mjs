#!/usr/bin/env node
// ═══ KINEO-TEMPORADA-2026-09-06 — guardiao da temporada ══════════════════
//
// Duas metades, e as duas leem os ARQUIVOS REAIS:
//   (A) o COMPORTAMENTO de lib/temporada.ts, importada de verdade e exercitada
//       com os modos de falha que estes modelos realmente produzem (titulos
//       repetidos, lista curta, item sem seed, prosa em vez de JSON).
//   (B) o CONTRATO de app/api/season/route.ts lido como texto, amarrado as
//       variaveis que decidem — porque as promessas caras desta peca ("GET
//       nunca chama modelo", "nao cobra credito", "custo vem da fonte unica")
//       so podem ser provadas assim sem subir servidor.
//
// Rodar: node scripts/test-temporada.mjs   (sem rede, sem custo)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
// CRLF na arvore do Windows ja deu falso vermelho nesta casa.
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8').split('\r\n').join('\n')

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond) ok++
  else falhas.push(nome)
}

// ══ (A) COMPORTAMENTO — o ARQUIVO REAL e importado e executado ══════════
// Node >= 22.6 importa TypeScript direto (type stripping nativo). Isto NAO e
// uma copia nem um mock: o modulo abaixo E lib/temporada.ts, e as verificacoes
// desta secao EXECUTAM o codigo em vez de ler o texto dele.
const lib = await import('../lib/temporada.ts')
const { prepararTemporada, lerTemporada, temporadaAindaVale, TOTAL_EPISODIOS, TEMPORADA_TTL_MS } = lib
if (typeof prepararTemporada !== 'function') {
  console.error('lib/temporada.ts nao expos prepararTemporada — teste invalido, nao verde')
  process.exit(1)
}

const cinco = (pref = 'T') =>
  Array.from({ length: 5 }, (_, i) => ({ title: `${pref}itulo ${i + 1}`, seed: `assunto ${i + 1}` }))

check('1. cinco episodios validos viram temporada', prepararTemporada(cinco())?.episodes.length === 5)
check('2. TOTAL_EPISODIOS e 5 (Ep2..Ep6)', TOTAL_EPISODIOS === 5)
check(
  '3. a numeracao comeca no episodio 2 e termina no 6',
  JSON.stringify(prepararTemporada(cinco()).episodes.map((e) => e.n)) === '[2,3,4,5,6]',
)
check('4. aceita a forma {episodes:[...]} alem do array cru', prepararTemporada({ episodes: cinco() })?.episodes.length === 5)

// ── OS MODOS DE FALHA REAIS DO MODELO ────────────────────────────────────
check('5. lista curta (4 itens) NAO vira meia temporada — devolve null', prepararTemporada(cinco().slice(0, 4)) === null)
const repetidos = cinco()
repetidos[3] = { title: 'Titulo 1', seed: 'outro assunto' } // titulo repetido
check(
  '6. titulo repetido derruba a temporada em vez de duplicar linha',
  prepararTemporada(repetidos) === null,
)
check(
  '7. repeticao e case-insensitive (o modelo troca a caixa e acha que variou)',
  prepararTemporada([...cinco().slice(0, 4), { title: 'TITULO 1', seed: 'x' }]) === null,
)
const semSeed = cinco()
semSeed[2] = { title: 'Titulo 3' }
check(
  '8. item sem seed usa o proprio titulo como semente (nunca clique morto)',
  prepararTemporada(semSeed)?.episodes[2].seed === 'Titulo 3',
)
check('9. prosa em vez de lista devolve null', prepararTemporada('Episode 2: something') === null)
check('10. null/undefined/objeto vazio devolvem null', prepararTemporada(null) === null && prepararTemporada({}) === null)
check(
  '11. item vazio nao entra e derruba a contagem (nao ha episodio fantasma)',
  prepararTemporada([...cinco().slice(0, 4), { title: '   ', seed: '  ' }]) === null,
)
check(
  '12. sexto item excedente e descartado, nao vira Ep7',
  prepararTemporada([...cinco(), { title: 'sobra', seed: 'sobra' }])?.episodes.length === 5,
)

// ── recortes ─────────────────────────────────────────────────────────────
const longo = prepararTemporada([
  { title: 'x'.repeat(400), seed: 'y'.repeat(400) },
  ...cinco().slice(1),
])
check('13. titulo e semente sao recortados nos tetos declarados', longo.episodes[0].title.length === 120 && longo.episodes[0].seed.length === 180)
check(
  '14. aspas e espaco duplo saem do titulo (o modelo devolve "..." o tempo todo)',
  prepararTemporada([{ title: '  "Titulo   A"  ', seed: 'a' }, ...cinco().slice(1)]).episodes[0].title === 'Titulo A',
)

// ── ida e volta pela memoria ─────────────────────────────────────────────
const gravada = prepararTemporada(cinco(), 'O filme 1')
check('15. o titulo do filme 1 viaja junto', gravada.fromTitle === 'O filme 1')
check(
  '16. ler de volta o que foi gravado devolve a MESMA temporada',
  JSON.stringify(lerTemporada({ episodes: gravada.episodes, fromTitle: gravada.fromTitle })) === JSON.stringify(gravada),
)
check('17. metadata corrompida nao explode: devolve null', lerTemporada({ episodes: 'nada' }) === null && lerTemporada(null) === null)

// ── TTL ──────────────────────────────────────────────────────────────────
const agora = Date.parse('2026-09-06T14:00:00Z')
check('18. memoria de 1 dia vale', temporadaAindaVale('2026-09-05T14:00:00Z', agora) === true)
check('19. memoria de 15 dias NAO vale', temporadaAindaVale('2026-08-22T14:00:00Z', agora) === false)
check('20. data ilegivel e ausente NAO valem (fail-closed)', temporadaAindaVale('nao-e-data', agora) === false && temporadaAindaVale(null, agora) === false)
check('21. o TTL e o mesmo do episodio 2 (14 dias), por contrato', TEMPORADA_TTL_MS === 14 * 24 * 60 * 60 * 1000)

// ══ (B) CONTRATO DA ROTA — as promessas caras ════════════════════════════
const rota = ler('app/api/season/route.ts')
const iGet = rota.indexOf('export async function GET')
const iPost = rota.indexOf('export async function POST')
const corpoGet = iGet >= 0 && iPost > iGet ? rota.slice(iGet, iPost) : ''
const corpoPost = iPost >= 0 ? rota.slice(iPost) : ''

check('22. a rota existe com GET e POST', iGet > 0 && iPost > iGet)
// A promessa mais cara da peca. Se o GET ganhar uma chamada de modelo, uma
// varredura de leitura passa a queimar dinheiro sem ninguem perceber.
check('23. o GET NAO chama modelo nenhum', !/api\.openai\.com|gpt-4o|fetch\(/.test(corpoGet))
check('24. o GET NAO grava nada', !/insert\(|guardarTemporada\(/.test(corpoGet))
// ⚠ #19 — O ESCRITOR MUDOU DE ARQUIVO, NAO DE CONTRATO. Ele foi para
// lib/temporadaServer.ts para que a CARTA possa escrever para quem NAO esta
// logado (a coorte inteira das 64 tem filme anterior ao deploy de hoje, entao
// ninguem tem temporada gravada). As travas abaixo SEGUIRAM o codigo: sao as
// mesmas invariantes, lidas no arquivo onde o codigo agora mora. Nenhuma foi
// afrouxada, e tres nasceram (25b, 27b/27c, 29b).
const escritor = ler('lib/temporadaServer.ts')

// A REDUNDANCIA QUE SALVA A TEMPORADA DE UM TITULO REPETIDO. O preparador
// exige CINCO unicos; o modo de falha mais comum destes modelos e repetir
// um titulo. Pedindo 6, a repeticao e descartada e ainda sobram 5. Provado
// no comportamento (verificacoes 6 e 7) e amarrado aqui ao prompt real.
// `includes` e nao regex de proposito: o texto procurado contem `${...}`, e
// `$` dentro de regex e ancora de fim de linha — a primeira versao desta
// verificacao reprovou por isso, com o codigo correto do outro lado.
check(
  '24b. o escritor pede UM episodio a mais do que precisa',
  escritor.includes('Exactly ${TOTAL_EPISODIOS + 1} items') &&
    escritor.includes('Write the next ${TOTAL_EPISODIOS + 1} episodes'),
)

check('25. o escritor chama gpt-4o-mini e so ele', /model: 'gpt-4o-mini'/.test(escritor) && (escritor.match(/api\.openai\.com/g) ?? []).length === 1)
check('25b. a ROTA nao chama modelo por conta propria — so pelo escritor unico', !/api\.openai\.com|gpt-4o/.test(rota))
check(
  '26. o escritor le a memoria ANTES de chamar o modelo',
  escritor.indexOf('temporadaGravada(') > 0 && escritor.indexOf('temporadaGravada(') < escritor.indexOf('api.openai.com'),
)
check('27. memoria encontrada devolve sem gastar (return antes do fetch)', /const jaTem = await temporadaGravada\([\s\S]{0,120}?if \(jaTem\) return jaTem/.test(escritor))
// A promessa da metade de leitura: o modo so-leitura corta o gasto ANTES de a
// chave da OpenAI ser sequer lida.
check(
  '27b. o modo so-leitura corta o caminho do modelo antes de tudo',
  /if \(opts\?\.escrever === false\) return null/.test(escritor) &&
    escritor.indexOf('opts?.escrever === false') < escritor.indexOf('OPENAI_API_KEY'),
)
check('27c. o GET da rota usa exatamente esse modo de leitura', /garantirTemporada\(admin, userId, alvo, \{ escrever: false \}\)/.test(corpoGet))
// ⚠ ESTA VERIFICACAO SUMIU POR UM INSTANTE NESTA MESMA ROTACAO: o splice que
// mudou as travas 25-29 de arquivo levou a 28 junto, e o guardiao ficou verde
// SEM a trava do dinheiro. Foi pega relendo a lista de checks, nao pelo verde.
// Ela volta mais forte: vale para os DOIS arquivos, porque depois do #19 o
// escritor tem o admin na mao e um debito acidental caberia la tambem — onde
// ninguem estaria olhando.
const proibidoCobrar = /video_credits:\s|debit|fal\.run|fal\.ai|submitToFal/
check(
  '28. nem a rota nem o escritor debitam credito, chamam a fal ou renderizam',
  !proibidoCobrar.test(rota) && !proibidoCobrar.test(escritor),
)
// O TETO CURTO DO LOTE. A carta da parede escreve a temporada de ate 30
// pessoas numa execucao com maxDuration=300; 30 x 25s = 750s mataria o cron
// no meio. Quem chama em LOTE passa 10s; quem chama com alguem esperando na
// tela fica no padrao de 25s.
// `includes` e nao regex: o texto tem `?.`, `&&` e `?:`, e escapar tudo isso
// num regex e como se escreve uma trava que passa por acidente.
check(
  '28b. o escritor aceita teto de tempo e o padrao continua 25s',
  escritor.includes("typeof opts?.timeoutMs === 'number' && opts.timeoutMs > 0 ? opts.timeoutMs : 25_000"),
)
check('28c. as DUAS cartas em lote passam o teto curto', /timeoutMs: 10_000/.test(ler('app/api/admin/send-season-letter/route.ts')) && /timeoutMs: 10_000/.test(ler('app/api/admin/send-next-episode-wall/route.ts')))

check('29. o unico insert e o da memoria em events', (escritor.match(/\.insert\(/g) ?? []).length === 1 && /name: TEMPORADA_EVENT/.test(escritor) && !/\.insert\(/.test(rota))
check('29b. nem a rota nem o escritor fazem UPDATE em nada', !/\.update\(/.test(rota) && !/\.update\(/.test(escritor))
// Fonte unica de custo e de entitlement (memoria `predicado-do-cobrador-nao-se-redigita`).
check('30. o custo vem de creditCostForDuration, nao de numero digitado', /creditCostForDuration\(q, pago, seg\)/.test(rota))
check('31. free/pago vem de getEffectiveEntitlement().treatAsPaid', /getEffectiveEntitlement\(/.test(rota) && /ent\.treatAsPaid/.test(rota))
check('32. `affordable` e derivado do custo e do saldo, nunca digitado', /affordable: custo !== null && custo <= balance/.test(rota))
// Preco publico e do fundador: a rota nao pode conter cifrao nem nome de plano.
check(
  '33. a rota nao escreve preco nem nome de plano',
  !/\$\d|9\.90|19\.90|39\.90|'starter'|'creator'|'studio'/i.test(rota.replace(/^\s*\/\/.*$/gm, '')),
)
// Ausencia de temporada nao pode virar erro (senao a tela quebra por falta).
check('34. sem filme e sem temporada a rota responde 200 com season:null', /return resposta\(null, null, balance, null\)/.test(corpoGet) && !/status: 404/.test(rota))
check('35. so o 401 de nao-autenticado sai como erro', (rota.match(/status: \d+/g) ?? []).join() === 'status: 401')
// A rota so pode enxergar filme da propria pessoa.
// As duas leituras de `videos` filtram por dono — uma usa a variavel
// `userId`, a outra `user.id`. O teste aceita as duas formas e continua
// exigindo UMA clausula de dono por leitura: um `from('videos')` novo sem
// filtro desiguala a contagem e deixa isto vermelho.
check(
  '36. toda leitura de videos e filtrada pelo dono',
  (rota.match(/from('videos')/g) ?? []).length ===
    (rota.match(/.eq('user_id', (?:userId|user.id))/g) ?? []).length,
)

console.log(`\n${ok}/${ok + falhas.length} verificacoes passaram`)
if (falhas.length) {
  console.error('\nFALHOU:')
  for (const f of falhas) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ a temporada nasce inteira ou nao nasce, e a porta nao gasta o que nao deve')
