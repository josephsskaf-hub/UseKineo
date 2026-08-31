// sprint-v1v4 #13 — O MOTOR QUE CABE.
// Verifica a biblioteca com os PARES REAIS DE PRODUÇÃO (14 dias, externos) e,
// no bloco E, PROVA que ela está LIGADA na tela — a lição do `sceneTruth`,
// que passou nos 24 testes sendo biblioteca morta.
import { execSync } from 'node:child_process'
import { readFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = mkdtempSync(join(tmpdir(), 'kineo-r13-'))
execSync(
  `"${process.execPath}" "${join(raiz, 'node_modules/typescript/bin/tsc')}" ` +
  `"${join(raiz, 'lib/engineAffordability.ts')}" "${join(raiz, 'lib/credits/engineCost.ts')}" ` +
  `--outDir "${out}" --module commonjs --target es2022 --moduleResolution node --skipLibCheck`,
  { stdio: 'pipe' },
)
const A = await import(pathToFileURL(join(out, 'engineAffordability.js')).href)
const E = await import(pathToFileURL(join(out, 'credits/engineCost.js')).href)

let ok = 0, bad = 0
const checa = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nome}`) }
  else { bad++; console.log(`  ✗ ${nome} ${extra}`) }
}

const DUR = [35, 60, 90]
const Q = { seedance: 'cinematic_ai', kling: 'cinematic_kling', veo: 'cinematic_veo', hollywood: 'cinematic_hollywood', h3: 'cinematic_h3' }
const custoDe = (m, d) => E.creditCostForDuration(Q[m], true, d)
const TODOS = ['seedance', 'hollywood', 'veo', 'kling', 'h3']
const plano = (motor, duracao, saldo, motores = TODOS) =>
  A.planoDeResgate({ motorAtual: motor, duracaoAtual: duracao, saldo, duracoes: DUR, custoDe, motoresDisponiveis: motores })

console.log('\n── A. a aritmética do custo (a mesma que o servidor cobra)')
checa('Seedance 60s = 25', custoDe('seedance', 60) === 25, `=${custoDe('seedance', 60)}`)
checa('Seedance 35s = 15 (o selo dizia 25 em toda duração)', custoDe('seedance', 35) === 15, `=${custoDe('seedance', 35)}`)
checa('Seedance 90s = 38', custoDe('seedance', 90) === 38, `=${custoDe('seedance', 90)}`)
checa('H3 60s = 45', custoDe('h3', 60) === 45)
checa('Kling 60s = 50', custoDe('kling', 60) === 50)
checa('Kling 3 60s = 150', custoDe('hollywood', 60) === 150)
checa('Kling 3 35s = 88 (nem encurtando cabe em 62)', custoDe('hollywood', 35) === 88, `=${custoDe('hollywood', 35)}`)

console.log('\n── B. saldo desconhecido NUNCA inventa recusa')
checa('null cabe em tudo', A.cabeNoSaldo(150, null) === true)
checa('null não gera falta', A.faltamCreditos(150, null) === 0)
checa('null devolve "cabe"', plano('hollywood', 60, null).tipo === 'cabe')
checa('grátis (custo 0) sempre cabe', A.cabeNoSaldo(0, 0) === true)
checa('custo exatamente igual ao saldo CABE', A.cabeNoSaldo(25, 25) === true)
checa('1 crédito a mais não cabe', A.cabeNoSaldo(26, 25) === false)
checa('falta é a diferença exata', A.faltamCreditos(38, 21) === 17)

console.log('\n── C. os 6 pares REAIS de recusa em produção (14d, externos)')
// hollywood 150 / saldo 62 → nem 35s cabe (88); a saída é outro motor: H3 a 60s (45)
const p1 = plano('hollywood', 60, 62)
checa('hollywood 150 × saldo 62 → outra câmera', p1.tipo === 'outra_camera', JSON.stringify(p1))
// Kling a 60s custa 50 e CABE em 62; H3 custa 45. A regra é "a mais cara que
// cabe", então a resposta certa é Kling — não o mais barato da lista, e não o
// que eu tinha chutado ao escrever este teste.
checa('  ...e a câmera é a MAIS CARA que cabe (Kling, 50) — não a mais barata', p1.alvo?.motor === 'kling' && p1.alvo?.custo === 50, JSON.stringify(p1.alvo))
checa('  ...e ela é de fato mais cara que a alternativa barata (H3, 45)', custoDe('kling', 60) > custoDe('h3', 60))
// kling 50 / saldo 25 → 35s custa 30, não cabe; outra câmera a 60s: seedance 25 (exato)
const p2 = plano('kling', 60, 25)
checa('kling 50 × saldo 25 → outra câmera', p2.tipo === 'outra_camera', JSON.stringify(p2))
checa('  ...Seedance a 60s por 25, o saldo exato', p2.alvo?.motor === 'seedance' && p2.alvo?.custo === 25)
// h3 45 / saldo 25
const p3 = plano('h3', 60, 25)
checa('h3 45 × saldo 25 → tem saída', p3.tipo !== 'nada_cabe' && p3.tipo !== 'cabe', JSON.stringify(p3))
// h3 27 (35s) / saldo 25 → não há duração menor; outra câmera a 35s: seedance 15
const p4 = plano('h3', 35, 25)
checa('h3 27 × saldo 25 (já no 35s) → Seedance a 35s por 15', p4.tipo === 'outra_camera' && p4.alvo?.motor === 'seedance' && p4.alvo?.custo === 15, JSON.stringify(p4))
// seedance 38 (90s) / saldo 21 → mesma câmera a 60s custa 25 (não cabe), a 35s custa 15 ✓
const p5 = plano('seedance', 90, 21)
checa('seedance 38 × saldo 21 → MESMA câmera, 35s', p5.tipo === 'mesma_camera' && p5.alvo?.duracao === 35 && p5.alvo?.custo === 15, JSON.stringify(p5))
// seedance 20 / saldo 19 — 1 crédito faltando
const p6 = plano('seedance', 60, 19)
checa('seedance 25 × saldo 19 → 35s por 15 (faltavam 6)', p6.tipo === 'mesma_camera' && p6.alvo?.custo === 15, JSON.stringify(p6))
checa('NENHUM dos 6 casos reais era "nada_cabe"',
  [p1, p2, p3, p4, p5, p6].every((p) => p.tipo === 'mesma_camera' || p.tipo === 'outra_camera'))

console.log('\n── D. a ordem de preferência não é arbitrária')
// seedance 90s / saldo 30: mesma câmera a 60s custa 25 ✓ — deve preferir isso a trocar de motor
const d1 = plano('seedance', 90, 30)
checa('preserva a CÂMERA escolhida antes de trocar de motor', d1.tipo === 'mesma_camera' && d1.alvo?.duracao === 60, JSON.stringify(d1))
checa('  ...e pega a MAIOR duração que cabe, não a menor', d1.alvo?.duracao === 60)
// saldo 5: nada cabe
const d2 = plano('hollywood', 60, 5)
checa('saldo 5 → nada_cabe (a tela não inventa saída)', d2.tipo === 'nada_cabe', JSON.stringify(d2))
// escolha que já cabe não gera aviso nenhum
checa('escolha que cabe → "cabe" (tela silenciosa)', plano('seedance', 35, 500).tipo === 'cabe')
// motor travado por PLANO nunca é oferecido como saída (fronteira com o Codex)
const d3 = plano('hollywood', 60, 62, ['hollywood'])
checa('motor trancado por plano NÃO vira saída', d3.tipo === 'nada_cabe', JSON.stringify(d3))
checa('nunca oferece o próprio motor atual como "outra câmera"',
  [p1, p2, p4].every((p) => p.alvo?.motor !== undefined && p.tipo !== 'outra_camera' || p.alvo?.motor !== p.alvo?.motorAtual))

console.log('\n── E. A PEÇA ESTÁ LIGADA NA TELA (a lição do sceneTruth)')
const cliente = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
checa('o cliente IMPORTA a biblioteca', /from '@\/lib\/engineAffordability'/.test(cliente))
checa('importa as três funções', /cabeNoSaldo,[\s\S]{0,60}faltamCreditos,[\s\S]{0,60}planoDeResgate,/.test(cliente))
checa('o cliente CHAMA planoDeResgate', /planoDeResgate\(\{/.test(cliente))
checa('o plano recebe o saldo REAL (credits), não uma constante', /saldo: credits,/.test(cliente))
checa('o plano recebe as durações DO SELETOR', /duracoes: duracoesDoSeletor,/.test(cliente))
checa('o custo vem de creditCostForDuration (a função que cobra)',
  /creditCostForDuration\(CUSTO_POR_MOTOR\[m\] \?\? 'cinematic_ai', true, d\)/.test(cliente))
checa('motores travados por PLANO ficam fora da lista de saída',
  /seedanceUnlocked \? \['seedance'\]/.test(cliente) && /cinematicUnlocked \? \['hollywood'/.test(cliente))
checa('o chip do motor mostra quanto FALTA', /\$\{m\.cr\} cr · \+\$\{faltamCreditos\(m\.cr, credits\)\}/.test(cliente))
checa('o chip do motor que não cabe fica apagado', /opacity: naoCabe && !active \? 0\.6 : 1/.test(cliente))
checa('o selo do Seedance passou a variar por DURAÇÃO', /\{custoDoMotor\('seedance', duration\)\} credits/.test(cliente))
checa('existe o botão de desvio de UM CLIQUE', /engine_downshift_clicked/.test(cliente))
checa('o desvio realmente troca o motor', /setAiEngine\(alvo\.motor as typeof aiEngine\)/.test(cliente))
checa('o desvio realmente troca a duração', /setDuration\?\.\(alvo\.duracao as Duration\)/.test(cliente))
checa('o ModeSelector RECEBE setDuration do pai', /setDuration=\{setDuration\}/.test(cliente))
checa('o ModeSelector RECEBE o rastreador do pai', /track=\{\(name, meta\) =>/.test(cliente))
checa('a caixa de desvio só aparece quando há saída',
  /resgateDeMotor\.tipo === 'mesma_camera' \|\| resgateDeMotor\.tipo === 'outra_camera'/.test(cliente))

console.log('\n── F. fronteira com o Codex: NADA de preço, plano ou oferta aqui')
const lib = readFileSync(join(raiz, 'lib/engineAffordability.ts'), 'utf8')
const codigo = lib.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n')
checa('a lib não fala em dólar', !/\$\d|USD|usd/.test(codigo))
// "plano" em português é `planoDeResgate` — o que não pode existir aqui é
// vocabulário de VENDA (SKU, preço, checkout).
checa('a lib não conhece SKU/preço/checkout', !/starter|creator|studio|\bprice\b|checkout|stripe|upsell|coupon/i.test(codigo))
checa('a lib não importa nada (módulo puro)', !/^import /m.test(codigo))
const caixa = cliente.slice(cliente.indexOf('O DESVIO DE UM CLIQUE'), cliente.indexOf('O DESVIO DE UM CLIQUE') + 3000)
checa('a caixa de desvio não escreve preço em dinheiro', !/\$\d/.test(caixa))
checa('a caixa de desvio não vende plano', !/upgrade|Upgrade|plan|Plan/.test(caixa.split('*/')[1] ?? caixa))

console.log(`\n${bad === 0 ? `${ok} VERIFICAÇÕES OK` : `${bad} de ${ok + bad} FALHARAM`} — o cardápio de motores agora sabe o que o saldo alcança.\n`)
process.exit(bad === 0 ? 0 : 1)
