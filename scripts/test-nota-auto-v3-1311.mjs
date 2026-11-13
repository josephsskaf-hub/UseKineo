// KINEO-NOTA-AUTO-V3-1311 — guardião do juiz da RÉGUA INTEIRA (lib/regua95/juizRegua19.ts), o juiz da nota automática em produção
// (sombra), com os consertos de 13/11 noite. OFFLINE (sem rede, chave ou custo). Provas:
//   V1  época só existe quando a história tem época (pedeEpoca); sem época, EPOCA_ERRADA nem é oferecida e o código a descarta;
//   V2  a marca da casa ("usekineo.com/free" no canto) nunca vira defeito;
//   V3  comparação entre cenas: ESTILO_MUDOU (central) e PERSONAGEM_TROCOU do protagonista, só com quadros de ≥ 2 cenas;
//       com personagem nomeado no plano, só entre os quadros dele;
//   V4  o prompt manda comparar as cenas entre si, diz que a marca é nossa e, sem época, que não julgue a época;
//   V5  DURACAO_CURTA fora quando o pipeline encurtou de propósito (autofit_down) ou sem alvo;
//   V6  produção: notaAutoFilme usa o juiz v3, a versão dele e o alvo de duração/língua do nascimento;
//   V7  NOTA_AUTO_TARIFA "entrada/saída" lida do ambiente;
//   M   mutantes.
// Rodar: npx tsx scripts/test-nota-auto-v3-1311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const ARQ = 'lib/regua95/juizRegua19.ts'
const FONTE = lf(fs.readFileSync(ARQ, 'utf8'))
const FILME = lf(fs.readFileSync('lib/regua95/notaAutoFilme.ts', 'utf8'))
const globals = { setTimeout: () => 0, clearTimeout() {}, AbortController }
const carregar = (f) => createOfflineLoader({ globals, env: {}, source: f ? (rel, text) => (rel.replace(/\\/g, '/').endsWith(ARQ) ? f(lf(text)) : text) : null })(ARQ)
const P = createOfflineLoader({ globals, env: { NOTA_AUTO_TARIFA: ' 2 / 10 ' } })('lib/regua95/visaoProvedor.ts')

// 3 cenas, 2 quadros cada; sem personagem nomeado (gato ninja) e com um nomeado (Ana nas cenas 1 e 3)
const mom = (nomes) => [1, 2, 3].map((m) => ({ m, cena: m, inicio: (m - 1) * 5, fim: m * 5, fala: 'A ninja cat jumps over the roof.', nomes: nomes[m - 1] ?? [] }))
const QUADROS = [1, 1, 2, 2, 3, 3].map((m, i) => ({ url: `https://x/${i}.jpg`, t: i * 2.5 + 1, m }))
const SEM_NOME = { plano: { segundos: 15, elenco: [], momentos: mom([]) }, quadros: QUADROS, pedido: 'a ninja cat in 3D animation', roteiro: null, produto: 'filme', motor: 'kling4', segundos: 15 }
const COM_NOME = { ...SEM_NOME, plano: { segundos: 15, elenco: ['Ana'], momentos: mom([['Ana'], [], ['Ana']]) } }
const def = (category, frames, evidence, severity = 'grave') => ({ category, severity, frames, evidence })

async function provas(J) {
  const falhas = []
  const checa = (n, c) => { if (!c) falhas.push(n) }
  // V1
  checa('V1 pedeEpoca: ano, período e povo antigo sim; gato ninja e 3D não', J.pedeEpoca('Hiroshima in 1945') && J.pedeEpoca('a Roman legion in ancient Rome') && J.pedeEpoca('século XVIII') && !J.pedeEpoca('a ninja cat in 3D animation jumps') && !J.pedeEpoca('a cute duck sneezes'))
  checa('V1 sem época, EPOCA_ERRADA não é oferecida; ESTILO_MUDOU sempre', !J.categoriasParaVisao(SEM_NOME).includes('EPOCA_ERRADA') && J.categoriasParaVisao(SEM_NOME).includes('ESTILO_MUDOU') && J.categoriasParaVisao({ ...SEM_NOME, pedido: 'a samurai in feudal Japan' }).includes('EPOCA_ERRADA'))
  const ep = J.normalizar19({ defects: [def('EPOCA_ERRADA', [0, 1], 'cartoon environment, not realistic at all')] }, SEM_NOME)
  checa('V1 EPOCA_ERRADA descartada quando a história não tem época', ep.defeitos.length === 0 && ep.descartados === 1)
  // V2
  const marca = J.normalizar19({ defects: [def('TEXTO_INVENTADO', [2], 'small text usekineo.com/free in the corner'), def('EPOCA_ERRADA', [0, 2, 4], 'Modern website text visible in every frame'), def('MARCA_DE_TERCEIRO', [3], 'watermark at the bottom right corner')] }, { ...SEM_NOME, pedido: 'a samurai in feudal Japan' })
  checa('V2 a marca da casa nunca vira defeito', marca.defeitos.length === 0 && marca.descartados === 3)
  // V3
  const estilo = J.normalizar19({ defects: [def('ESTILO_MUDOU', [0, 5], 'photorealistic cat in frame 0, flat cartoon cat in frame 5')] }, SEM_NOME)
  checa('V3 ESTILO_MUDOU entre cenas conta e é central (8 − 2 = 6)', estilo.defeitos.length === 1 && J.nota19(estilo.defeitos) === 6)
  const dupla = J.normalizar19({ defects: [def('ESTILO_MUDOU', [1, 5], 'photorealistic cat in frame 1, cartoon cat in frame 5'), def('PERSONAGEM_TROCOU', [1, 5], 'the cat becomes a big-headed cartoon kitten')] }, SEM_NOME)
  checa('V3 troca de personagem nos mesmos quadros da troca de estilo conta uma vez', dupla.defeitos.length === 1 && dupla.defeitos[0].categoria === 'ESTILO_MUDOU')
  const mesmaCena = J.normalizar19({ defects: [def('ESTILO_MUDOU', [0, 1], 'style shifts inside the same shot'), def('PERSONAGEM_TROCOU', [2, 3], 'the cat has another fur colour now')] }, SEM_NOME)
  checa('V3 troca de estilo/personagem dentro da MESMA cena não conta', mesmaCena.defeitos.length === 0)
  const prot = J.normalizar19({ defects: [def('PERSONAGEM_TROCOU', [1, 3], 'ginger cat in scene 1, grey cat in scene 2')] }, SEM_NOME)
  checa('V3 sem personagem nomeado: protagonista entre cenas diferentes conta', prot.defeitos.length === 1 && prot.defeitos[0].categoria === 'PERSONAGEM_TROCOU')
  const fora = J.normalizar19({ defects: [def('PERSONAGEM_TROCOU', [1, 3], 'woman in scene 1 differs from scene 2')] }, COM_NOME)
  const dentro = J.normalizar19({ defects: [def('PERSONAGEM_TROCOU', [0, 5], 'Ana has short blond hair in scene 3, long black in scene 1')] }, COM_NOME)
  checa('V3 com personagem nomeado: só entre os quadros dele', fora.defeitos.length === 0 && dentro.defeitos.length === 1)
  // V4
  const { system } = J.buildJuiz19(SEM_NOME)
  checa('V4 prompt compara cenas, marca é nossa, sem época não julga época', /compare the scenes WITH EACH OTHER/.test(system) && /usekineo\.com\/free"[^.]*OURS/.test(system) && /no specific era: do not judge the era/.test(system) && !/- EPOCA_ERRADA:/.test(system))
  checa('V4 com época, a categoria e a ordem de checar aparecem', /- EPOCA_ERRADA:/.test(J.buildJuiz19({ ...SEM_NOME, pedido: 'a samurai in feudal Japan' }).system))
  // V5
  checa('V5 alvo de duração: autofit_down = sem alvo; requested_duration = alvo', J.alvoDeDuracao({ requested_duration: 60, autofit_down: { from: 60, to: 30 } }) === null && J.alvoDeDuracao({ requested_duration: 60 }) === 60 && J.alvoDeDuracao({}) === null)
  checa('V5 sem alvo não há DURACAO_CURTA', J.defeitosDoCodigo({ ...SEM_NOME, segundos: 29, segundosPedidos: null }).length === 0 && J.defeitosDoCodigo({ ...SEM_NOME, segundos: 29, segundosPedidos: 60 }).some((d) => d.categoria === 'DURACAO_CURTA'))
  return falhas
}

function provasDaProducao() {
  const falhas = []
  const checa = (n, c) => { if (!c) falhas.push(n) }
  checa('V6 produção usa o juiz v3 e a versão dele', /juiz: juizV3ReguaInteira, versao: NOTA_AUTO_VERSAO_FILME/.test(FILME) && /export const NOTA_AUTO_VERSAO_FILME = JUIZ19_VERSION/.test(FILME) && (FILME.match(/NOTA_AUTO_VERSAO_FILME\)/g) ?? []).length === 2)
  checa('V6 alvo de duração e língua vêm do nascimento', /segundosPedidos: alvoDeDuracao\(response\)/.test(FILME) && /lingua: typeof response\?\.language === 'string'/.test(FILME))
  const t = P.lerProvedorNotaAuto({ NOTA_AUTO_TARIFA: ' 2 / 10 ' })
  checa('V7 NOTA_AUTO_TARIFA lida do ambiente; inválida = tabela', t.tarifa?.inPerM === 2 && t.tarifa?.outPerM === 10 && P.lerProvedorNotaAuto({ NOTA_AUTO_TARIFA: 'caro' }).tarifa === undefined)
  return falhas
}

let ok = 0, ruim = 0
const linha = (bom, nome) => { if (bom) { ok++; console.log('  ok  ' + nome) } else { ruim++; console.log('  XX  ' + nome) } }
const real = await provas(carregar(null))
linha(real.length === 0, `código real: V1–V5 verdes${real.length ? ' — falharam: ' + real.join(' | ') : ''}`)
const pr = provasDaProducao()
linha(pr.length === 0, `produção (V6–V7)${pr.length ? ' — falharam: ' + pr.join(' | ') : ''}`)

const MUTANTES = [
  ['M1 marca da casa não filtrada', (s) => s.replace("if (MARCA_DA_CASA.test(ev) && categoria !== 'PERSONAGEM_TROCOU' && categoria !== 'ESTILO_MUDOU') { descartados++; continue }", '')],
  ['M2 época oferecida sempre', (s) => s.replace("...(pedeEpoca(textoDaHistoria(e)) ? (['EPOCA_ERRADA'] as const) : [])", "'EPOCA_ERRADA'")],
  ['M3 troca dentro da mesma cena aceita', (s) => s.replace('if (momentos.size < 2) { descartados++; continue }', '')],
  ['M4 autofit ignorado', (s) => s.replace("if (af === true || (af && typeof af === 'object')) return null", '')],
  ['M5 ESTILO_MUDOU deixa de ser central', (s) => s.replace("'EPOCA_ERRADA', 'ESTILO_MUDOU'])", "'EPOCA_ERRADA'])")],
  ['M7 conta duas vezes estilo + personagem', (s) => s.replace('const final = estilo\n', 'const final = false\n')],
  ['M6 prompt sem comparar cenas', (s) => s.replace("'Step 2: compare the scenes WITH EACH OTHER.", "'Step 2: look again.")],
]
for (const [nome, f] of MUTANTES) {
  if (f(FONTE) === FONTE) { linha(false, `${nome}: o mutante NÃO aplicou (âncora sumiu)`); continue }
  let falhas
  try { falhas = await provas(carregar(f)) } catch (e) { falhas = ['carregar: ' + e.message] }
  linha(falhas.length > 0, `${nome} → vermelho (${falhas.slice(0, 2).join(' | ') || 'NENHUMA prova pegou'})`)
}
console.log(`\n${ruim === 0 ? '🟢' : '🔴'} nota-auto-v3-1311: ${ok}/${ok + ruim}`)
process.exit(ruim === 0 ? 0 : 1)
