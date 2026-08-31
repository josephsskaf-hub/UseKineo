// KINEO-SPRINT-V1V4-2026-08-31 (#4) — prova o botao de episodio 2 no cartaz
// "seu video ficou pronto enquanto voce estava fora", o unico que pega a
// pessoa na VOLTA depois do video 1 (160 pessoas em 30 dias).
import { readFileSync } from 'node:fs'

const gc = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
const sc = readFileSync(new URL('../lib/seriesContinuation.ts', import.meta.url), 'utf8')

let ok = 0, fail = 0
const check = (nome, cond) => { if (cond) { ok++ } else { fail++; console.error('  ✗ ' + nome) } }

// ── a fonte nova existe e e do tipo certo ────────────────────────────────
check('fonte returning_ready_banner no union', /\|\s*'returning_ready_banner'/.test(sc))
check('fonte documentada com o numero das 160 pessoas', /160\s*\n?\s*\/\/\s*pessoas|160/.test(sc))
check('helper de prompt de serie intacto', sc.includes('buildSeriesContinuationPrompt'))
check('helper de href de serie intacto', sc.includes('buildSeriesContinuationHref'))

// ── o bloco do cartaz de volta ───────────────────────────────────────────
const i = gc.indexOf("serverActiveRender?.state === 'completed'")
check('cartaz de volta existe', i > 0)
// O bloco vai do inicio do cartaz ate o fim da sua barra de acoes — delimitado
// pelo texto do ultimo botao, nao por um numero de caracteres (que vazava para
// codigo vizinho e dava falso positivo na checagem da pista do Codex).
const fim = gc.indexOf('Open My Videos', i)
const bloco = gc.slice(i, fim + 120)

check('botao de episodio 2 no cartaz', bloco.includes('Build episode 2'))
check('botao usa handleContinueSeries', /handleContinueSeries\(\s*\n?\s*serverActiveRender\.title/.test(bloco))
check('botao usa a fonte nova', bloco.includes("'returning_ready_banner'"))
check('botao leva o video_id junto', bloco.includes('serverActiveRender.videoId'))
check('botao so aparece com tema', /serverActiveRender\.title\s*&&/.test(bloco))
check('e um <button>, nao um link que sai da tela', /type="button"/.test(bloco))

// ── nada foi removido: as duas acoes antigas continuam ───────────────────
check('Watch now preservado', bloco.includes('Watch now'))
check('Open My Videos preservado', bloco.includes('Open My Videos'))
check('link do MP4 preservado', bloco.includes('serverActiveRender.videoUrl'))
check('target=_blank do Watch preservado', bloco.includes('target="_blank"'))

// ── PISTA DO CODEX: o bloco novo nao encosta em dinheiro ─────────────────
// A checagem roda sobre o CODIGO do bloco, com os comentarios removidos: a
// primeira versao deste teste reprovava a propria frase "sem checkout" escrita
// no comentario que explica que nao ha checkout. Comentario nao e codigo.
const blocoCodigo = bloco.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const proibidos = ['checkout', 'Checkout', 'Upgrade', 'upgrade', 'pricing', 'Pricing', 'Stripe', 'plan_fit', 'PlanFit', 'credit', 'Credit', 'USD', 'price']
for (const t of proibidos) {
  check(`bloco do cartaz sem "${t}" (pista do Codex)`, !blocoCodigo.includes(t))
}
check('bloco sem cifrao de preco no codigo', !/\$\d/.test(blocoCodigo))

// ── o compositor logo abaixo continua sendo o destino ────────────────────
check('handleContinueSeries ainda existe', /function handleContinueSeries\(/.test(gc))
check('handleContinueSeries emite series_continue_clicked', /trackEvent\('series_continue_clicked'/.test(gc))
check('o cartaz so aparece em idle (nao atropela render)', gc.slice(i - 40, i).includes("phase === 'idle'"))
check('copy avisa que o compositor esta pronto', bloco.includes('ready for episode 2'))

// ── as fontes antigas nao foram perdidas ─────────────────────────────────
for (const f of ['done_screen', 'history_milestone', 'history_video_card', 'library_video_card', 'studio_milestone', 'render_pill', 'done_footer', 'generate_recent_video']) {
  check(`fonte ${f} preservada`, sc.includes(`'${f}'`))
}

console.log(`\n${ok} verificacoes ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
