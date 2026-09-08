// sprint-ui #8 — prova que o card do Avatar existe no picker do /studio e é
// uma PORTA (router.push) e não um motor selecionável (não toca cobrança).
import { readFileSync } from 'node:fs'
const src = readFileSync('app/(dashboard)/studio/StudioClient.tsx', 'utf8')
let ok = 0, fail = 0
const check = (name, cond) => { cond ? ok++ : (fail++, console.error('FAIL: ' + name)) }

check('card Avatar existe no arquivo', src.includes('KINEO-SPRINT-UI8-2026-08-30'))
// KINEO-REANCORA-AVATAR-2026-09-07 — sexta ocorrencia do mesmo padrao hoje: a
// regra casava com a FORMA exata `<b>Avatar<span className="tag">Presenter
// </span></b>` e o rotulo ganhou um `<UiLabel>` por dentro. O NOME nao mudou —
// a regra do CLAUDE.md ("nomes reais dos motores no site: ... Avatar
// (ex-AI Presenter)") continua cumprida. Passa a exigir estrutura: o nome
// principal e `Avatar`, a etiqueta diz `Presenter`, e nenhum dos dois virou o
// nome antigo.
check(
  'nome do site: Avatar (par de nomes reais)',
  /<b>Avatar<span className="tag">[\s\S]{0,40}Presenter[\s\S]{0,20}<\/span><\/b>/.test(src),
)
check('o nome antigo "AI Presenter" nao voltou ao card', !/<b>AI Presenter/.test(src))
check('navega para /avatar', src.includes("router.push('/avatar')"))
check('fecha o picker ao clicar', src.includes('setPickerOpen(false); router.push'))
check('usa a mesma classe pk dos motores', /className="pk"\s*\n\s*onClick=\{\(\) => \{ setPickerOpen\(false\); router\.push\('\/avatar'\)/.test(src))
check('badge aponta o destino (Avatar Studio →)', src.includes('Avatar Studio →'))
check('descricao honesta de apresentador', src.includes('Talking AI presenter from a photo'))
// selo honesto: nada de "1080p" no card do Avatar (0 masters verificados)
const cardBlock = src.split('KINEO-SPRINT-UI8-2026-08-30')[1]?.split('</button>')[0] ?? ''
check('sem claim de resolucao no card do Avatar', !cardBlock.includes('1080p'))
// nao virou EngineKey — o fluxo de cobrança do Studio continua intocado
check("EngineKey continua sem 'avatar'", src.includes("type EngineKey = 'fast' | 'seedance' | 'kling' | 'veo' | 'hollywood' | 'h3' | 'omni'"))
check('card e depois do map dos motores (dentro do picker)', src.indexOf('KINEO-SPRINT-UI8-2026-08-30') > src.indexOf('{ENGINES.map((e) => ('))
console.log(`${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
