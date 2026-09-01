// scripts/test-sticky-generate-2026-09-01.mjs — sprint-v1v4 #29
//
// Prova, lendo os ARQUIVOS REAIS, que a barra fixa de gerar existe, que ela
// está ligada na fase `options`, que ela repete o MESMO handler e o MESMO
// custo do botão original, e que ela não inventa preço nem gate.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bar = readFileSync(join(root, 'components/StickyGenerateBar.tsx'), 'utf8')
const gen = readFileSync(join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')

let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.log('  ✗ ' + nome) } }

// ── o componente ───────────────────────────────────────────────────────────
t('componente é client', bar.startsWith("'use client'"))
t('export default', /export default function StickyGenerateBar/.test(bar))
t('usa IntersectionObserver', bar.includes('new IntersectionObserver'))
t('desconecta o observer no cleanup', bar.includes('observer.disconnect()'))
t('estado inicial null (não pisca)', bar.includes('useState<boolean | null>(null)'))
t('só aparece com âncora fora de vista', bar.includes('const visible = anchorVisible === false'))
t('some quando âncora aparece', bar.includes('if (!visible) return null'))
t('navegador sem IO degrada para tela atual', bar.includes("typeof IntersectionObserver === 'undefined'"))
t('respeita safe-area do iPhone', bar.includes('safe-area-inset-bottom'))
t('trava com busy', bar.includes('disabled={busy}'))
t('telemetria de exibição é uma só vez', bar.includes('shownOnceRef'))
t('telemetria nunca engole o clique', /try \{\s*onClick\?\.\(\)\s*\} catch/.test(bar))
t('telemetria de exibição em try/catch', /try \{\s*onShown\?\.\(\)\s*\} catch/.test(bar))
t('chama onGenerate depois da telemetria', bar.indexOf('onClick?.()') < bar.indexOf('onGenerate()'))
t('rótulo grátis quando custo 0', bar.includes("cost === 0 ? ' · Free'"))
t('plural correto de credit', bar.includes("cost === 1 ? '' : 's'"))

// ── a barra NÃO decide preço nem plano (fronteira com a pista do Codex) ────
// A checagem roda sobre o CÓDIGO, sem os comentários — o cabeçalho do arquivo
// cita "upgrade" e "plano" justamente para dizer que não mexe neles.
const barCode = bar.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
for (const proibido of ['checkout', 'Stripe', 'upgrade', 'Upgrade', 'plan', 'PLAN_', 'pricing', 'credits_left', 'engineCost']) {
  t(`barra não fala de ${proibido}`, !barCode.includes(proibido))
}
t('cabeçalho declara a fronteira', bar.includes('fronteira com a pista do Codex'))
t('barra não faz fetch', !bar.includes('fetch('))
t('barra não lê supabase', !bar.includes('supabase'))
t('custo entra pronto, por prop', /cost: number/.test(bar))

// ── a ligação na tela ──────────────────────────────────────────────────────
t('import no GenerateClient', gen.includes("import StickyGenerateBar from '@/components/StickyGenerateBar'"))
t('ref declarada', gen.includes('const optionsGenerateBtnRef = useRef<HTMLButtonElement | null>(null)'))
t('ref presa no botão real', gen.includes('ref={optionsGenerateBtnRef}'))
t('barra renderizada', gen.includes('<StickyGenerateBar'))
t('barra recebe a mesma âncora', gen.includes('anchorRef={optionsGenerateBtnRef}'))
t('mesmo handler do botão original', gen.includes('onGenerate={handleGenerateGuarded}'))
t('mesmo custo do botão original', gen.includes('cost={selectedCost}'))
t('mesma trava de fase', gen.includes('busy={isProcessingPhase(phase)}'))
t('evento de exibição', gen.includes("'options_sticky_generate_shown'"))
t('evento de clique', gen.includes("'options_sticky_generate_clicked'"))

// a barra só pode existir DENTRO do bloco da fase options
const iShowStep2 = gen.indexOf('{showStep2 && analysis && (')
const iBar = gen.indexOf('<StickyGenerateBar')
const iRender = gen.indexOf('{/* ── Render / Done / Failed ── */}')
t('bloco options existe', iShowStep2 > 0)
t('barra depois da abertura do bloco options', iBar > iShowStep2)
t('barra antes do bloco de render', iBar < iRender && iRender > 0)

// o botão original continua exatamente onde estava, com o mesmo handler
t('botão original preservado', gen.includes('onClick={handleGenerateGuarded}'))
t('handler aparece 2x (botão + barra)',
  (gen.match(/handleGenerateGuarded/g) || []).length >= 3)
t('botão original ainda mostra o custo',
  gen.includes("`Generate${selectedCost === 0 ? ' · Free'"))

// nenhuma linha nova de preço/gate entrou junto
const trecho = gen.slice(iBar, iBar + 1400)
for (const proibido of ['checkout', 'upgrade', 'setPlan', 'PLAN_LIST']) {
  t(`trecho da barra não mexe em ${proibido}`, !trecho.includes(proibido))
}

console.log(`\n${ok}/${ok + fail} verificações`)
process.exit(fail ? 1 : 0)
