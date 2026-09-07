// KINEO-SLOT-PEDE-DINHEIRO-2026-09-07 — contrato de quem ocupa o slot unico da
// tela de filme pronto. Sem rede, sem banco, sem credencial, sem escrita.
//
// POR QUE ESTE GUARDIAO EXISTE: a pergunta comercial era a ULTIMA de tres
// superficies e passou a aparecer para ~1 pessoa por dia enquanto 13 a 31
// terminam um filme. As duas que a precediam sao gratis e nasceram entre
// 27/08 e 06/09. Este guardiao amarra a nova precedencia as VARIAVEIS que
// decidem (memoria: guardiao que conta texto nao prova condicao), e prova por
// mutacao que cada guarda tem dentes.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODULE_PATH = join(root, 'lib/growth/postDeliverySlot.ts')
const CLIENT_PATH = join(root, 'app/(dashboard)/generate/GenerateClient.tsx')

function findTsc(base) {
  let dir = base
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('TypeScript compiler not found')
}

// Compila o modulo REAL e o avalia. O arquivo e lido, nunca importado com
// alias `@/` — com alias ele morreria antes da 1a verificacao (memoria:
// guardioes-com-alias-nao-rodam).
function loadModule(source) {
  const temp = mkdtempSync(join(tmpdir(), 'kineo-slot-'))
  const sourceDir = join(temp, 'src')
  const outDir = join(temp, 'out')
  mkdirSync(sourceDir, { recursive: true })
  writeFileSync(join(sourceDir, 'postDeliverySlot.ts'), source)
  execFileSync(process.execPath, [
    findTsc(root),
    join(sourceDir, 'postDeliverySlot.ts'),
    '--outDir', outDir,
    '--rootDir', sourceDir,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--moduleResolution', 'node',
    '--strict',
    '--skipLibCheck',
  ], { stdio: 'pipe' })
  writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))
  const requireFromTemp = createRequire(join(outDir, 'runner.cjs'))
  return requireFromTemp(join(outDir, 'postDeliverySlot.js'))
}

// KINEO-CRLF-FALSO-VERMELHO-2026-09-07 — este guardiao nasceu VERDE na worktree
// de quem o escreveu e VERMELHO no checkout seguinte, sem que uma linha do
// modulo mudasse. Causa: o `.gitattributes` entrega o arquivo com CRLF no
// Windows, e o mutante `trocar a ordem bridge/episodio` ancora em DUAS linhas
// com `\n` — que nunca casa contra `\r\n`. O guardiao acusava corretamente
// "mutante NAO ANCOROU" e a mensagem se lia como defeito do produto.
// Normalizar na LEITURA e a cura registrada (memoria: guardiao-crlf-falso-vermelho).
const ORIGINAL = readFileSync(MODULE_PATH, 'utf8').replace(/\r\n/g, '\n')
const slot = loadModule(ORIGINAL)

let passed = 0
const failures = []
function check(label, condition) {
  if (condition) { passed += 1; return }
  failures.push(label)
  console.error('FAIL ' + label)
}

const base = {
  askEligible: true,
  deliveredFilmWatermarked: false,
  bridgeEligible: false,
  repeatEligible: false,
}
const decide = (over) => slot.decidePostDeliverySlot({ ...base, ...over })

// ─── 1. Sem slot, ninguem ocupa ────────────────────────────────────────────
check('sem askEligible devolve null', decide({ askEligible: false }) === null)
check(
  'sem askEligible o filme marcado NAO cria caixa do nada',
  decide({ askEligible: false, deliveredFilmWatermarked: true }) === null,
)
check(
  'sem askEligible o bridge elegivel nao ocupa',
  decide({ askEligible: false, bridgeEligible: true }) === null,
)

// ─── 2. A VIRADA: filme marcado = a pergunta comercial vem primeiro ────────
check(
  'filme marcado vence o bridge',
  decide({ deliveredFilmWatermarked: true, bridgeEligible: true }) === 'commercial_ask',
)
check(
  'filme marcado vence o episodio 2',
  decide({ deliveredFilmWatermarked: true, repeatEligible: true }) === 'commercial_ask',
)
check(
  'filme marcado vence os dois juntos',
  decide({ deliveredFilmWatermarked: true, bridgeEligible: true, repeatEligible: true })
    === 'commercial_ask',
)
check(
  'filme marcado sozinho ja da a pergunta',
  decide({ deliveredFilmWatermarked: true }) === 'commercial_ask',
)

// ─── 3. Filme LIMPO: a ordem antiga fica intacta ───────────────────────────
check(
  'filme limpo: bridge continua na frente da pergunta',
  decide({ bridgeEligible: true }) === 'balance_bridge',
)
check(
  'filme limpo: bridge na frente do episodio',
  decide({ bridgeEligible: true, repeatEligible: true }) === 'balance_bridge',
)
check(
  'filme limpo: episodio quando nao ha bridge',
  decide({ repeatEligible: true }) === 'repeat_episode',
)
check(
  'filme limpo e nada elegivel: a pergunta sobra, como antes',
  decide({}) === 'commercial_ask',
)

// ─── 4. Um slot: nunca dois donos ──────────────────────────────────────────
for (const wm of [false, true]) {
  for (const br of [false, true]) {
    for (const rp of [false, true]) {
      const owner = decide({ deliveredFilmWatermarked: wm, bridgeEligible: br, repeatEligible: rp })
      check(
        `um unico dono para wm=${wm} bridge=${br} repeat=${rp}`,
        owner === 'commercial_ask' || owner === 'balance_bridge' || owner === 'repeat_episode',
      )
    }
  }
}

// ─── 5. Pureza: a decisao nao muda o objeto de entrada ─────────────────────
const frozen = Object.freeze({ ...base, deliveredFilmWatermarked: true, bridgeEligible: true })
check('decisao nao muta a entrada', slot.decidePostDeliverySlot(frozen) === 'commercial_ask')

// ─── 6. O CALLER: a tela precisa mesmo consumir a decisao ──────────────────
// Sem isto o modulo seria biblioteca morta — a casa ja pagou esse preco uma
// vez (sceneTruth, 27/08: 24 verificacoes verdes e ZERO chamadores).
const client = readFileSync(CLIENT_PATH, 'utf8')
check(
  'a tela importa a decisao',
  // A fv-r7 somou `type PostDeliverySlotOwner` a este mesmo import (o ref que
  // leva o dono do slot ate o evento de impressao). A checagem continua exigindo
  // que a FUNCAO seja importada desta fonte — so deixou de exigir que ela venha
  // sozinha entre as chaves.
  /import\s*\{[^}]*\bdecidePostDeliverySlot\b[^}]*\}\s*from\s*'@\/lib\/growth\/postDeliverySlot'/.test(client),
)
check(
  'a tela calcula postDeliverySlotOwner',
  /const\s+postDeliverySlotOwner\s*=\s*decidePostDeliverySlot\(/.test(client),
)
check(
  'a decisao recebe a verdade do servidor sobre a marca d\'agua',
  /deliveredFilmWatermarked:\s*currentResultHasWatermark/.test(client),
)
check(
  'o bridge renderiza SO quando a decisao o elege',
  client.includes("{postDeliverySlotOwner === 'balance_bridge' && ("),
)
check(
  'a pergunta comercial renderiza SO quando a decisao a elege',
  client.includes("{postDeliverySlotOwner === 'commercial_ask' && ("),
)
check(
  'o episodio 2 passa a sair da decisao',
  /const\s+showTrialRepeatEpisode\s*=\s*postDeliverySlotOwner\s*===\s*'repeat_episode'/.test(client),
)
// As guardas ANTIGAS nao podem sobreviver ao lado das novas: duas fechaduras
// na mesma porta ja custaram uma rotacao inteira nesta casa.
check(
  'a guarda antiga do bridge nao sobreviveu',
  !client.includes('{showTrialPostVideoOffer && trialBalanceBridge.eligible && ('),
)
check(
  'a guarda antiga da pergunta nao sobreviveu',
  !client.includes('{showTrialPostVideoOffer && !trialBalanceBridge.eligible && !showTrialRepeatEpisode && ('),
)
// K1: o download gratis nao pode ter virado pedagio nesta mudanca.
check(
  'o download com marca continua na tela',
  /watermarkedDownloadConfirmed/.test(client),
)

// ─── 7. MUTACAO: cada guarda tem de ter dentes ─────────────────────────────
// Cada mutante PROVA QUE FOI ESCRITO comparando o conteudo antes/depois — um
// mutante que nao aplicou devolve verde e se le como guardiao resistindo
// (memoria: mutacao-precisa-provar-que-aplicou).
const mutants = [
  {
    label: 'apagar a virada do filme marcado',
    from: "  if (input.deliveredFilmWatermarked) return 'commercial_ask'",
    to: "  if (false) return 'commercial_ask'",
    expect: (m) => m.decidePostDeliverySlot({ ...base, deliveredFilmWatermarked: true, bridgeEligible: true }) === 'commercial_ask',
  },
  {
    label: 'inverter a virada',
    from: "  if (input.deliveredFilmWatermarked) return 'commercial_ask'",
    to: "  if (!input.deliveredFilmWatermarked) return 'commercial_ask'",
    expect: (m) => m.decidePostDeliverySlot({ ...base, bridgeEligible: true }) === 'balance_bridge',
  },
  {
    label: 'ignorar askEligible',
    from: '  if (!input.askEligible) return null',
    to: '  if (false) return null',
    expect: (m) => m.decidePostDeliverySlot({ ...base, askEligible: false }) === null,
  },
  {
    label: 'apagar o bridge',
    from: "  if (input.bridgeEligible) return 'balance_bridge'",
    to: "  if (false) return 'balance_bridge'",
    expect: (m) => m.decidePostDeliverySlot({ ...base, bridgeEligible: true }) === 'balance_bridge',
  },
  {
    label: 'apagar o episodio 2',
    from: "  if (input.repeatEligible) return 'repeat_episode'",
    to: "  if (false) return 'repeat_episode'",
    expect: (m) => m.decidePostDeliverySlot({ ...base, repeatEligible: true }) === 'repeat_episode',
  },
  {
    label: 'trocar a ordem bridge/episodio',
    from: "  if (input.bridgeEligible) return 'balance_bridge'\n  if (input.repeatEligible) return 'repeat_episode'",
    to: "  if (input.repeatEligible) return 'repeat_episode'\n  if (input.bridgeEligible) return 'balance_bridge'",
    expect: (m) => m.decidePostDeliverySlot({ ...base, bridgeEligible: true, repeatEligible: true }) === 'balance_bridge',
  },
]

for (const mutant of mutants) {
  if (!ORIGINAL.includes(mutant.from)) {
    failures.push(`mutante NAO ANCOROU: ${mutant.label}`)
    console.error(`FAIL mutante nao ancorou: ${mutant.label}`)
    continue
  }
  const mutated = ORIGINAL.replace(mutant.from, mutant.to)
  if (mutated === ORIGINAL) {
    failures.push(`mutante NAO FOI ESCRITO: ${mutant.label}`)
    console.error(`FAIL mutante nao foi escrito: ${mutant.label}`)
    continue
  }
  let survived = false
  try {
    survived = mutant.expect(loadModule(mutated))
  } catch {
    survived = false
  }
  check(`mutante morre: ${mutant.label}`, !survived)
}

console.log(`\npost-delivery-slot: ${passed} verificacoes OK, ${failures.length} falhas`)
if (failures.length) {
  console.error('\nFALHAS:\n' + failures.map((f) => ' · ' + f).join('\n'))
  process.exit(1)
}
