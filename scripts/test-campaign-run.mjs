// GUARDIÃO — KINEO-CORRIDA-DE-CAMPANHA-2026-09-07 (aquisição #17)
//
// Prova que toda corrida das duas campanhas em lote deixa rastro, e que o
// MOTIVO DO ZERO é derivado dos números do funil — nunca de um literal.
//
// ⚠️ ESTILO readFileSync DE PROPÓSITO. A memória `guardioes-com-alias-nao-rodam`
// registra 72 testes desta pasta que morrem no `import '@/...'` antes da
// primeira verificação: Node não resolve o alias do tsconfig. Aqui nada é
// importado do app — os arquivos são LIDOS e as afirmações são feitas sobre o
// texto real deles.
//
// ⚠️ E A LIÇÃO DE `guardiao-contar-texto-nao-prova-condicao`: contar ocorrência
// de `registrarCorrida` não prova nada — um mutante que troque `enviados` por
// `0` mantém a contagem intacta. Por isso as verificações abaixo amarram o
// argumento à VARIÁVEL que a rota usa para decidir, e o bloco de mutação no
// fim CONFERE QUE A MUTAÇÃO FOI ESCRITA antes de exigir vermelho
// (`mutacao-precisa-provar-que-aplicou`).

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8').split('\r\n').join('\n')

const LIB = 'lib/lifecycle/campaignRun.ts'
const ROTAS = [
  ['app/api/admin/send-season-letter/route.ts', 'season_letter', 'semTemporada'],
  ['app/api/admin/send-next-episode-wall/route.ts', 'next_episode_wall', null],
]

let ok = 0
const falhas = []
function checa(nome, cond) {
  if (cond) { ok++; return }
  falhas.push(nome)
}

// ── 1. a fonte única existe e o motivo é DERIVADO ─────────────────────────
const lib = ler(LIB)
checa('lib: exporta motivoDoZero', /export function motivoDoZero\(/.test(lib))
checa('lib: exporta registrarCorrida', /export async function registrarCorrida\(/.test(lib))
checa('lib: exporta corridaAbortada', /export function corridaAbortada\(/.test(lib))
checa('lib: o evento tem nome estável', lib.includes("CAMPAIGN_RUN_EVENT = 'campaign_run_v1'"))

// O corpo de motivoDoZero: cada resposta tem de nascer de uma COMPARAÇÃO com
// um campo do funil. Se alguém trocar as perguntas por `return 'desconhecido'`,
// estas caem.
const corpoMotivo = lib.slice(lib.indexOf('export function motivoDoZero('))
  .slice(0, lib.slice(lib.indexOf('export function motivoDoZero(')).indexOf('\n}\n') + 3)
for (const campo of ['enviados', 'coorte_bruta', 'candidatos', 'elegiveis', 'no_lote', 'pulados', 'falhas', 'supressao_degradada', 'parou_em', 'modo']) {
  checa(`motivoDoZero decide por c.${campo}`, corpoMotivo.includes(`c.${campo}`))
}
checa('motivoDoZero: envio bom nunca vira motivo', /c\.enviados > 0\) return null/.test(corpoMotivo))
checa('motivoDoZero: ensaio nunca vira motivo', /c\.modo === 'DRY_RUN'\) return null/.test(corpoMotivo))
checa('motivoDoZero: a ordem é a do funil (coorte antes de supressão)',
  corpoMotivo.indexOf('c.coorte_bruta === 0') < corpoMotivo.indexOf('c.elegiveis === 0'))
checa('registrarCorrida grava o motivo no metadata', /motivo_do_zero: motivoDoZero\(c\)/.test(lib))
checa('registrarCorrida nunca derruba o lote (catch mudo)',
  /} catch \{[\s\S]{0,120}\}\n\}/.test(lib.slice(lib.indexOf('export async function registrarCorrida'))))

// ── 2. as duas rotas registram em TODA saída que decide envio ─────────────
for (const [caminho, campanha, campoPulos] of ROTAS) {
  const r = ler(caminho)
  const n = caminho.split('/').slice(-2)[0]

  checa(`${n}: importa a fonte única`, r.includes("from '@/lib/lifecycle/campaignRun'"))

  // O `confirm` precisa ser lido ANTES do primeiro return, senão o zero de
  // coorte fechada sai rotulado como ensaio — que é o zero mais comum.
  const iConfirm = r.indexOf("const confirm = req.nextUrl.searchParams.get('confirm')")
  const iCoorteVazia = r.indexOf('ids.length === 0')
  checa(`${n}: lê confirm antes da saída de coorte vazia`, iConfirm > 0 && iConfirm < iCoorteVazia)
  checa(`${n}: confirm é lido UMA vez só`,
    r.split("const confirm = req.nextUrl.searchParams.get('confirm')").length === 2)
  checa(`${n}: modo sai de confirm, não de literal`, /const modo: CorridaDeCampanha\['modo'\] = confirm \?/.test(r))

  // As três saídas que decidem envio.
  checa(`${n}: registra na coorte vazia`, /corridaAbortada\(CAMPANHA, modo, 'coorte_vazia'\)/.test(r))
  checa(`${n}: registra na falha de query`, /corridaAbortada\(CAMPANHA, modo, 'query'/.test(r))
  checa(`${n}: registra no ensaio e no envio`, r.split('await registrarCorrida(').length === 5)

  // ⚠️ O CORAÇÃO: os números passados são as VARIÁVEIS que a rota usa para
  // decidir, não cópias nem literais. Um mutante que zere qualquer uma delas
  // muda estas linhas.
  const bloco = r.slice(r.lastIndexOf('await registrarCorrida(admin, {'))
  checa(`${n}: enviados vem da variável enviados`, /\benviados,/.test(bloco))
  checa(`${n}: falhas vem da variável falhas`, /\bfalhas,/.test(bloco))
  checa(`${n}: no_lote vem de batch.length`, /no_lote: batch\.length/.test(bloco))
  checa(`${n}: elegiveis vem de destinatarios.length`, /elegiveis: destinatarios\.length/.test(bloco))
  checa(`${n}: candidatos vem de candidatos.length`, /candidatos: candidatos\.length/.test(bloco))
  checa(`${n}: coorte_bruta vem de ids.length`, /coorte_bruta: ids\.length/.test(bloco))
  checa(`${n}: supressão vem do próprio leitor`,
    /suprimidos_24h: sup\.suppressedCount/.test(bloco) && /supressao_degradada: sup\.degraded/.test(bloco))
  checa(`${n}: campanha é a mesma constante do utm`, r.includes(`const CAMPANHA = '${campanha}'`) && /campanha: CAMPANHA/.test(bloco))
  if (campoPulos) {
    checa(`${n}: pulados vem de ${campoPulos}`, new RegExp(`pulados: ${campoPulos}`).test(bloco))
  }

  // E o envio continua sendo o trabalho: o registro vem DEPOIS do laço.
  checa(`${n}: registra depois do laço de envio`,
    r.lastIndexOf('await registrarCorrida(admin, {') > r.lastIndexOf('for (const d of batch)'))
}

// ── 3. MUTAÇÃO — e ela prova que foi escrita antes de exigir vermelho ─────
// Troca a decisão de motivoDoZero por um literal. Se o guardião continuar
// verde, ele estava contando texto, não amarrando condição.
{
  const p = join(RAIZ, LIB)
  const original = readFileSync(p, 'utf8')
  const alvo = 'if (c.enviados > 0) return null'
  if (!original.includes(alvo)) {
    falhas.push('mutação: não achei a linha alvo — o guardião não pode se provar')
  } else {
    const mutante = original.replace(alvo, 'if (true) return null')
    writeFileSync(p, mutante)
    const relido = readFileSync(p, 'utf8')
    const aplicou = relido.includes('if (true) return null') && !relido.includes(alvo)
    const guardiaoVeVermelho = !/c\.enviados > 0\) return null/.test(
      relido.split('\r\n').join('\n').slice(relido.indexOf('export function motivoDoZero(')),
    )
    writeFileSync(p, original)
    const restaurou = readFileSync(p, 'utf8') === original
    checa('mutação: foi realmente escrita no arquivo', aplicou)
    checa('mutação: o guardião a enxerga (ficaria vermelho)', guardiaoVeVermelho)
    checa('mutação: o arquivo foi restaurado byte a byte', restaurou)
  }
}

console.log(`\n${ok} verificações verdes${falhas.length ? `, ${falhas.length} VERMELHAS` : ''}`)
if (falhas.length) {
  for (const f of falhas) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ toda corrida das 2 campanhas deixa rastro, e o motivo do zero é derivado do funil')
