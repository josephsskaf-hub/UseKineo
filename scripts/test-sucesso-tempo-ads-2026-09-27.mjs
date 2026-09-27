// KINEO-SUCESSO-TEMPO-ADS-2026-09-27 — guardião do item V (ciclo D da sprint de 16 h, dom 27/09, alvo MRR): a tela de
// sucesso do checkout redireciona sozinha para /studio com relógio de 15 s (useState(15)). O bloco do Studio Ads (item S)
// só aparece DEPOIS de /api/credits confirmar o plano (adsBlockShown), e 15 s eram pouco para ler e clicar. Agora, quando
// adsBlockShown vira true pela primeira vez, o relógio ganha CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS UMA vez (ref de guarda,
// adsBlockTimeAdded), nunca em loop, e nunca reinicia um relógio que já chegou a 0. Nada mais muda: useState(15) inicial,
// decremento, redirect em countdown <= 0 e a copy "Redirecting to the app in {countdown}…" seguem idênticos.
// Só readFileSync (sem alias @/, sem rede). O efeito novo é EXTRAÍDO da fonte e executado com dublês (bloco 4), e os
// mutantes em memória (bloco 5) provam que o auditor e a simulação pegam o que prometem pegar.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const count = (s, needle) => s.split(needle).length - 1
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

const PAGE = rd('app/checkout/success/page.tsx')

const INIT = 'const [countdown, setCountdown] = useState(15)'
const CONST_RE = /^const CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS = (\d+)$/m
const REF_LINE = 'const adsBlockTimeAdded = useRef(false)'
const SUM = 'setCountdown((c) => (c > 0 ? c + CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS : c))'
const EFFECT = /useEffect\(\(\) => \{\n    if \(!adsBlockShown \|\| adsBlockTimeAdded\.current\) return\n    adsBlockTimeAdded\.current = true\n    setCountdown\(\(c\) => \(c > 0 \? c \+ CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS : c\)\)\n  \}, \[adsBlockShown\]\)/g
const DECREMENT = 'const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)'
const REDIRECT_DEPS = '}, [countdown, destination, flow, isAutopilot, isSelfServe, router, selfServeState])'
const ADS_COND = "const adsBlockShown = selfServeReady && !packPurchase && accountPlan !== null && ADS_SUBSCRIBER_PLANS.includes(accountPlan) && adsPassLive()"
const GATE = '{adsBlockShown && (\n            <div\n              data-kineo="checkout-success-studio-ads"'
const COPY_REDIRECT = 'Redirecting to the app in ${countdown}…'
const COPY_CONFIRM = 'Confirming secure access · ${countdown}s'
const COPY_AUTOPILOT = 'Opening Autopilot setup in ${countdown}…'
const semComentarios = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')

// ── 1. a base fica idêntica: relógio inicial, decremento, redirect, condição do bloco e JSX ──
checa('1a. useState(15) inicial continua, uma vez', count(PAGE, INIT) === 1)
checa('1b. redirect intacto: "if (countdown <= 0) {" e "router.push(destination)" uma vez cada', count(PAGE, 'if (countdown <= 0) {') === 1 && count(PAGE, 'router.push(destination)') === 1)
checa('1c. decremento de 1 s intacto, uma vez', count(PAGE, DECREMENT) === 1)
checa('1d. as dependências do efeito de redirect não mudaram (adsBlockShown NÃO entrou nelas)', count(PAGE, REDIRECT_DEPS) === 1)
checa('1e. a condição do bloco (item S) é a mesma que o relógio lê: adsBlockShown, uma vez', count(PAGE, ADS_COND) === 1)
checa('1f. o JSX do bloco segue atrás de adsBlockShown, uma vez', count(PAGE, GATE) === 1)
checa('1g. os ramos pendentes seguem: autopilot_checkout_handoff_pending e checkout_success_entitlement_delayed, uma vez cada', count(PAGE, "'autopilot_checkout_handoff_pending'") === 1 && count(PAGE, "'checkout_success_entitlement_delayed'") === 1)
checa('1h. o CTA de retry segue preso ao relógio: disabled={countdown > 0} (2 botões)', count(PAGE, 'disabled={countdown > 0}') === 2)

// ── 2. a soma: única, condicionada a adsBlockShown, guardada por ref, derivada de uma constante ──
const constM = PAGE.match(CONST_RE)
const initM = PAGE.match(/useState\((\d+)\)\s*$/m) // a primeira useState(N) numérica é a do relógio
checa('2a. CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS declarada uma vez e igual à janela inicial do relógio (dobra os 15 s, não inventa outro número)', !!constM && count(PAGE, 'const CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS = ') === 1 && !!initM && Number(constM[1]) === Number(initM[1]) && Number(constM[1]) === 15)
checa('2b. ref de guarda adsBlockTimeAdded = useRef(false), uma vez', count(PAGE, REF_LINE) === 1)
checa('2c. o efeito existe exatamente uma vez: if (!adsBlockShown || guard) return; guard = true; soma; deps [adsBlockShown]', (PAGE.match(EFFECT) || []).length === 1)
checa('2d. a soma aparece uma vez, e setCountdown só é chamado 2 vezes no arquivo (decremento + soma)', count(PAGE, SUM) === 1 && count(PAGE, 'setCountdown(') === 2)
checa('2e. o guard é lido e escrito uma vez cada (nada mais o toca)', count(PAGE, 'adsBlockTimeAdded.current') === 2 && count(PAGE, 'adsBlockTimeAdded.current = true') === 1)
checa('2f. literal proibido = 0: nenhum reset do relógio (setCountdown(15|30|CONST), useState(30))', count(PAGE, 'setCountdown(15)') === 0 && count(PAGE, 'setCountdown(30)') === 0 && count(PAGE, 'setCountdown(CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS') === 0 && count(PAGE, 'useState(30)') === 0)
const iEffect = PAGE.search(EFFECT)
const iSecondEffect = PAGE.indexOf('useEffect(() => {', PAGE.indexOf('useEffect(() => {') + 1)
checa('2g. o efeito novo vem DEPOIS do efeito de impressão (}, [selfServeReady, adsBlockShown])) e nunca é o 1º nem o 2º useEffect (o guardião irmão executa effects[1] como observer)', iEffect > PAGE.indexOf('}, [selfServeReady, adsBlockShown])') && iEffect > iSecondEffect && iSecondEffect > 0)
checa('2h. a constante fica fora do componente (módulo), antes de export default', PAGE.search(CONST_RE) < PAGE.indexOf('export default function CheckoutSuccessPage()'))

// ── 3. copy: continua verdadeira (lê o estado) e não ganhou frase nova ──
const jsx = semComentarios(PAGE)
checa('3a. "Redirecting to the app in ${countdown}…" segue lendo o estado, uma vez', count(PAGE, COPY_REDIRECT) === 1)
checa('3b. as outras frases do relógio seguem: "Confirming secure access · ${countdown}s" ×2 e "Opening Autopilot setup in ${countdown}…" ×1', count(PAGE, COPY_CONFIRM) === 2 && count(PAGE, COPY_AUTOPILOT) === 1)
checa('3c. ${countdown} aparece exatamente 4 vezes no JSX (nenhuma frase nova com o relógio)', count(jsx, '${countdown}') === 4)
checa('3d. nenhuma frase nova sobre tempo extra fora de comentário (more time / extra seconds / extended / +15)', !/more time|extra second|extended|\+15 ?s|added 15/i.test(jsx))
checa('3e. nada de Markdown na copy (sem ** nem ](', !/\*\*|\]\(/.test(jsx))

// ── 4. EXECUTADO: o efeito extraído da fonte roda com dublês e prova a semântica ──
// Extrai o corpo do useEffect que USA a constante dentro do componente. Lê a fonte SEM comentários (o nome da constante
// também aparece no comentário explicativo acima do efeito) e só a partir de export default (a declaração fica fora).
const extractEffect = (src) => {
  const code = semComentarios(src)
  const iComp = code.indexOf('export default function CheckoutSuccessPage()')
  const iUse = iComp < 0 ? -1 : code.indexOf('CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS', iComp)
  if (iUse < 0) return null
  const start = code.lastIndexOf('useEffect(() => {', iUse)
  if (start < 0) return null
  const open = start + 'useEffect(() => {'.length
  const close = code.indexOf('\n  }', open)
  if (close < 0) return null
  return code.slice(open, close)
}
const simulate = (body, steps, extra = Number(constM ? constM[1] : 15)) => {
  const run = new Function('adsBlockShown', 'adsBlockTimeAdded', 'setCountdown', 'CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS', body)
  const ref = { current: false }
  let countdown = 15
  const set = (f) => { countdown = typeof f === 'function' ? f(countdown) : f }
  const out = []
  for (const st of steps) {
    if (typeof st === 'number') countdown = Math.max(0, countdown - st)
    else run(st, ref, set, extra)
    out.push(countdown)
  }
  return out
}
const body = extractEffect(PAGE)
checa('4a. o corpo do efeito foi extraído da fonte (não presumido)', typeof body === 'string' && body.includes('adsBlockTimeAdded') && body.includes('setCountdown'))
checa('4b. EXECUTADO: antes da confirmação (adsBlockShown=false) o relógio não ganha nada', !!body && simulate(body, [false, false, false]).join() === '15,15,15')
checa('4c. EXECUTADO: 3 s já passados (12) + bloco aparece → 27 (soma em cima do que restava, não reinicia em 15 nem 30)', !!body && simulate(body, [3, true]).join() === '12,27')
checa('4d. EXECUTADO: o efeito disparando de novo com adsBlockShown=true (re-render, StrictMode) não soma outra vez', !!body && simulate(body, [3, true, true, true, true, true]).join() === '12,27,27,27,27,27')
checa('4e. EXECUTADO: bloco pisca (true → false → true) e a soma continua única', !!body && simulate(body, [true, false, true]).join() === '30,30,30')
checa('4f. EXECUTADO: relógio já em 0 (redirect/delayed decidido) + bloco aparece → fica 0, nunca reinicia', !!body && simulate(body, [15, true, true]).join() === '0,0,0')
checa('4g. EXECUTADO: a soma usa a constante (extra=7 → 12+7=19), não um 15 digitado no efeito', !!body && simulate(body, [3, true], 7).join() === '12,19')

// ── 5. mutantes em memória: o auditor estático + a simulação pegam o que prometem pegar ──
const audit = (src) => {
  const p = []
  if (count(src, INIT) !== 1) p.push('init')
  const cm = src.match(CONST_RE)
  if (!cm || Number(cm[1]) !== 15 || count(src, 'const CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS = ') !== 1) p.push('const')
  if (count(src, REF_LINE) !== 1) p.push('ref')
  if ((src.match(EFFECT) || []).length !== 1) p.push('effect')
  if (count(src, SUM) !== 1 || count(src, 'setCountdown(') !== 2) p.push('sum')
  if (count(src, 'adsBlockTimeAdded.current') !== 2) p.push('guard')
  if (count(src, DECREMENT) !== 1 || count(src, REDIRECT_DEPS) !== 1) p.push('redirect')
  if (count(src, 'setCountdown(15)') + count(src, 'setCountdown(30)') + count(src, 'setCountdown(CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS') + count(src, 'useState(30)') !== 0) p.push('reset')
  return p
}
const behaves = (src) => {
  const b = extractEffect(src)
  if (!b) return false
  try {
    return simulate(b, [false, false]).join() === '15,15'
      && simulate(b, [3, true, true, true]).join() === '12,27,27,27'
      && simulate(b, [15, true]).join() === '0,0'
  } catch { return false }
}
checa('5a. o auditor aprova o arquivo real e a simulação aprova o efeito real', audit(PAGE).length === 0 && behaves(PAGE))

const mutNoGuard = PAGE.replace('    if (!adsBlockShown || adsBlockTimeAdded.current) return\n    adsBlockTimeAdded.current = true\n', '    if (!adsBlockShown) return\n')
checa('5b. MUTANTE soma sem guard (cada disparo do efeito soma de novo) fica vermelho no auditor E na simulação', mutNoGuard !== PAGE && audit(mutNoGuard).includes('effect') && audit(mutNoGuard).includes('guard') && !behaves(mutNoGuard))
const mutEveryRender = mutNoGuard.replace('    setCountdown((c) => (c > 0 ? c + CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS : c))\n  }, [adsBlockShown])', '    setCountdown((c) => (c > 0 ? c + CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS : c))\n  })')
checa('5c. MUTANTE soma sem guard E sem deps (a cada render) fica vermelho', mutEveryRender !== mutNoGuard && audit(mutEveryRender).includes('effect') && !behaves(mutEveryRender))
const mutUncond = PAGE.replace('    if (!adsBlockShown || adsBlockTimeAdded.current) return\n', '    if (adsBlockTimeAdded.current) return\n')
checa('5d. MUTANTE soma incondicional (sem adsBlockShown) fica vermelho no auditor E na simulação (soma antes da confirmação)', mutUncond !== PAGE && audit(mutUncond).includes('effect') && !behaves(mutUncond))
const mutNoDeps = PAGE.replace('  }, [adsBlockShown])\n\n  // KINEO-PAREDE-V1', '  })\n\n  // KINEO-PAREDE-V1')
checa('5e. MUTANTE efeito sem deps [adsBlockShown] fica vermelho', mutNoDeps !== PAGE && audit(mutNoDeps).includes('effect'))
const mutRestart = PAGE.replace(SUM, 'setCountdown((c) => c + CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS)')
checa('5f. MUTANTE sem o "c > 0" (reinicia relógio zerado) fica vermelho no auditor E na simulação', mutRestart !== PAGE && audit(mutRestart).includes('sum') && !behaves(mutRestart))
const mutReset = PAGE.replace(SUM, 'setCountdown(30)')
checa('5g. MUTANTE reset em vez de soma (setCountdown(30)) fica vermelho (reset + sum) e na simulação (12 → 30, não 27)', mutReset !== PAGE && audit(mutReset).includes('reset') && audit(mutReset).includes('sum') && !behaves(mutReset))
const mutInit = PAGE.replace(INIT, 'const [countdown, setCountdown] = useState(30)')
checa('5h. MUTANTE useState(30) (janela inicial maior em vez da soma condicionada) fica vermelho', mutInit !== PAGE && audit(mutInit).includes('init') && audit(mutInit).includes('reset'))
const mutConst = PAGE.replace('const CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS = 15', 'const CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS = 45')
checa('5i. MUTANTE constante diferente da janela inicial (45) fica vermelho', mutConst !== PAGE && audit(mutConst).includes('const'))
const mutTwice = PAGE.replace('  }, [adsBlockShown])\n', '  }, [adsBlockShown])\n  useEffect(() => {\n    if (!adsBlockShown) return\n    setCountdown((c) => (c > 0 ? c + CHECKOUT_SUCCESS_ADS_EXTRA_SECONDS : c))\n  }, [adsBlockShown])\n')
checa('5j. MUTANTE segunda soma noutro efeito fica vermelho (sum: 3 chamadas de setCountdown)', mutTwice !== PAGE && audit(mutTwice).includes('sum'))
const mutDeps = PAGE.replace(REDIRECT_DEPS, '}, [adsBlockShown, countdown, destination, flow, isAutopilot, isSelfServe, router, selfServeState])')
checa('5k. MUTANTE adsBlockShown enfiado nas deps do efeito de redirect fica vermelho', mutDeps !== PAGE && audit(mutDeps).includes('redirect'))
const mutRef = PAGE.replace(REF_LINE, 'let adsBlockTimeAdded = { current: false }')
checa('5l. MUTANTE guard sem useRef (recriado a cada render → soma em loop) fica vermelho', mutRef !== PAGE && audit(mutRef).includes('ref'))

console.log(`test-sucesso-tempo-ads-2026-09-27: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
