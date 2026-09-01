// KINEO-SPRINT-V1V4-2026-09-01 (#44) — prova, lendo os arquivos REAIS, que o
// botao "Generate Another Short" para de apagar a prateleira dos 3 episodios
// quando ela existe, e que nada de preco/plano/credito/SKU foi tocado.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const GC = readFileSync('app/(dashboard)/generate/GenerateClient.tsx', 'utf8')
const NS = readFileSync('components/video/NextShortsSection.tsx', 'utf8')
let ok = 0, bad = 0
const t = (nome, cond) => { if (cond) { ok++ } else { bad++; console.log('FALHOU:', nome) } }

// ── 1. A prateleira avisa o pai que esta cheia ──────────────────────────────
t('NSS declara onLoaded', /onLoaded\?: \(count: number\) => void/.test(NS))
t('NSS desestrutura onLoaded', /\{ topic, title, niche, hook, onPick, onEvent, onLoaded \}/.test(NS))
t('onLoaded chamado com o tamanho da lista', /onLoaded\?\.\(list\.length\)/.test(NS))
t('onLoaded protegido por try/catch', /try \{ onLoaded\?\.\(list\.length\)\) ?/.test(NS) || /try \{ onLoaded\?\.\(list\.length\) \} catch/.test(NS))
t('onLoaded so dispara com lista nao vazia (dentro do if list.length > 0)',
  /if \(list\.length > 0\) \{[\s\S]{0,400}?onLoaded\?\.\(list\.length\)/.test(NS))
t('next_shorts_shown continua intacto', /onEvent\?\.\('next_shorts_shown', \{ count: list\.length \}\)/.test(NS))
t('next_shorts_seen continua intacto', /onEvent\?\.\('next_shorts_seen'/.test(NS))
t('falha continua invisivel: catch ainda zera a lista', /catch \{\s*if \(!cancelled\) setIdeas\(\[\]\)/.test(NS))

// ── 2. O pai guarda o estado e a ancora ─────────────────────────────────────
t('estado nextIdeasCount existe', /const \[nextIdeasCount, setNextIdeasCount\] = useState\(0\)/.test(GC))
t('ancora de scroll existe', /const nextShortsAnchorRef = useRef<HTMLDivElement \| null>\(null\)/.test(GC))
t('flag de roteamento existe', /const anotherRoutedRef = useRef\(false\)/.test(GC))
t('secao embrulhada na ancora', /<div ref=\{nextShortsAnchorRef\}>\s*<NextShortsSection/.test(GC))
t('onLoaded ligado ao estado', /onLoaded=\{\(n\) => setNextIdeasCount\(n\)\}/.test(GC))
t('div da ancora fechada antes do fim do bloco', /<\/div>\s*\)\}/.test(GC))

// ── 3. O interceptador ──────────────────────────────────────────────────────
t('handleAnotherShort existe', /function handleAnotherShort\(\) \{/.test(GC))
t('so intercepta com prateleira carregada', /if \(nextIdeasCount > 0 && !anotherRoutedRef\.current\) \{/.test(GC))
t('marca que roteou antes de rolar', /anotherRoutedRef\.current = true[\s\S]{0,200}scrollIntoView/.test(GC))
t('evento de roteamento', /trackEvent\('another_short_routed_to_shelf', \{ ideas: nextIdeasCount \}\)/.test(GC))
t('evento do 2o clique', /trackEvent\('another_short_reset_after_shelf', \{ ideas: nextIdeasCount \}\)/.test(GC))
t('scrollIntoView protegido por try/catch', /try \{\s*nextShortsAnchorRef\.current\?\.scrollIntoView[\s\S]{0,120}?\} catch/.test(GC))
t('trackEvent protegido por try/catch', /try \{\s*void trackEvent\('another_short_routed_to_shelf'[\s\S]{0,120}?\} catch/.test(GC))
t('ESCAPE HATCH: sem prateleira cai no handleReset de sempre',
  /function handleAnotherShort\(\) \{[\s\S]*?\n    handleReset\(\)\n  \}/.test(GC))
t('o return so acontece no ramo que roteou', /scrollIntoView[\s\S]{0,160}?\n      return\n    \}/.test(GC))
t('nada gera video sozinho: sem handleGenerate no interceptador',
  !/function handleAnotherShort\(\)[\s\S]*?\n  \}/.exec(GC)[0].includes('handleGenerate'))
t('nao mexe em credito no interceptador',
  !/function handleAnotherShort\(\)[\s\S]*?\n  \}/.exec(GC)[0].match(/credits|setCredits|deduct/i))

// ── 4. handleReset volta ao zero ────────────────────────────────────────────
t('handleReset zera o contador', /function handleReset\(\) \{[\s\S]{0,400}?setNextIdeasCount\(0\)/.test(GC))
t('handleReset desarma a flag', /function handleReset\(\) \{[\s\S]{0,400}?anotherRoutedRef\.current = false/.test(GC))
t('handleReset continua fazendo tudo que fazia', /setPhase\('idle'\)[\s\S]{0,300}setAnalysis\(null\)/.test(GC))

// ── 5. Os dois botoes "another Short" foram religados, e SO eles ────────────
t('UpsellSection usa o interceptador', /onAnother=\{handleAnotherShort\}/.test(GC))
t('NextActionSection usa o interceptador', /<NextActionSection onAnother=\{handleAnotherShort\}/.test(GC))
t('nenhum onAnother sobrou com handleReset direto', !/onAnother=\{handleReset\}/.test(GC))
t('"Start something new" continua sendo reset de verdade',
  /onClick=\{\(\) => \{[\s\S]{0,400}?handleReset\(\)[\s\S]{0,600}?Start something new/.test(GC) ||
  /handleReset\(\)[\s\S]{0,900}?Start something new/.test(GC))
t('"Start over" continua sendo reset de verdade', /onClick=\{handleReset\}[\s\S]{0,600}?Start over/.test(GC))

// ── 6. Fronteira com o Codex: o diff nao toca preco/plano/SKU/oferta ────────
const diff = execSync('git diff -U0 -- "app/(dashboard)/generate/GenerateClient.tsx" components/video/NextShortsSection.tsx', { encoding: 'utf8' })
const add = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
t('o diff tem linhas adicionadas', add.length > 0)
const proibido = /\$\d|price|pricing|checkout|stripe|tier|plan_?tier|coupon|sku|upgrade|intro=1|trial/i
const rem = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1))
// Uma linha "suspeita" so conta se for NOVA de verdade. As duas linhas que
// eu religuei ja existiam: a unica diferenca permitida e handleReset ->
// handleAnotherShort. Se a linha, desfeita essa troca, aparece entre as
// removidas, entao preco/plano/SKU nao mudaram um byte.
const suja = add
  .filter((l) => proibido.test(l) && !/^\+\s*\/\//.test(l) && !/^\+\s*\*/.test(l))
  .filter((l) => !rem.includes(l.slice(1).replace('handleAnotherShort', 'handleReset')))
t('nenhuma linha de codigo adicionada fala de preco/plano/checkout/SKU/trial', suja.length === 0)
t('as linhas religadas so trocaram handleReset por handleAnotherShort',
  add.filter((l) => /onAnother=\{handleAnotherShort\}/.test(l))
     .every((l) => rem.includes(l.slice(1).replace('handleAnotherShort', 'handleReset'))))
t('duas e SO duas linhas de onAnother mudaram',
  add.filter((l) => /onAnother=/.test(l)).length === 2 && rem.filter((l) => /onAnother=/.test(l)).length === 2)
if (suja.length) console.log(suja.join('\n'))
t('nenhum arquivo do Codex foi tocado',
  execSync('git diff --name-only', { encoding: 'utf8' })
    .split('\n').filter(Boolean)
    .every((f) => !/^app\/api\/stripe\/|^lib\/(checkoutPricing|marketingPrice|growth)|UpgradeModal|OfferModal|OfferBanner/.test(f)))
t('so 2 arquivos de producao no diff',
  execSync('git diff --name-only', { encoding: 'utf8' }).split('\n').filter(Boolean).length === 2)
t('app/api/compose intacto', !execSync('git diff --name-only', { encoding: 'utf8' }).includes('api/compose'))
t('lib/engineWall e EngineCycleCard intactos',
  !execSync('git diff --name-only', { encoding: 'utf8' }).match(/engineWall|EngineCycleCard|public\/previews/))

console.log(`\n${ok} verificacoes OK, ${bad} falhas`)
process.exit(bad ? 1 : 0)
