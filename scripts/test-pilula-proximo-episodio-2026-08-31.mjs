// KINEO-SPRINT-V1V4-2026-08-31 (#3) — a pilula de "video pronto" ganha a
// terceira saida: o episodio 2 com o tema ja escrito.
//
// Le os arquivos como TEXTO. Nao roda React, nao chama rede, nao gasta credito.
import { readFileSync } from 'node:fs'

const pill = readFileSync(new URL('../components/ActiveRenderPill.tsx', import.meta.url), 'utf8')
const series = readFileSync(new URL('../lib/seriesContinuation.ts', import.meta.url), 'utf8')
const active = readFileSync(new URL('../app/api/compose/active/route.ts', import.meta.url), 'utf8')

let ok = 0
const fails = []
function check(nome, cond) {
  if (cond) { ok++; console.log(`  ok  ${nome}`) }
  else { fails.push(nome); console.log(`  FALHOU  ${nome}`) }
}

console.log('\n== lib/seriesContinuation.ts ==')
check('fonte render_pill existe no union', /\|\s*'render_pill'/.test(series))
check('fontes antigas preservadas', ["'done_screen'","'history_milestone'","'studio_milestone'","'library_video_card'"].every((f) => series.includes(f)))
check('helper de href continua unico', (series.match(/export function buildSeriesContinuationHref/g) || []).length === 1)

console.log('\n== app/api/compose/active/route.ts ==')
check('select passou a ler topic', /select\('id, video_url, thumbnail_url, title, topic, render_id, created_at'\)/.test(active))
check('resposta completed devolve series_seed', /series_seed:\s*seriesSeedFrom\(recentVideo\.title, recentVideo\.topic\)/.test(active))
check('helper seriesSeedFrom definido', /function seriesSeedFrom\(title: unknown, topic: unknown\)/.test(active))
check('topic multilinha e recusado (roteiro inteiro nao vira tema)', /rawTopic\.includes\('\\n'\)\)\s*return null/.test(active))
check('semente tem teto de 180 caracteres', /slice\(0, 180\)/.test(active) && /length > 180\) return null/.test(active))
check('nada de escrita nesta rota (segue so leitura)', !/\.insert\(|\.update\(|\.delete\(/.test(active))
check('title continua na resposta (nada foi removido)', /title:\s*typeof recentVideo\.title === 'string'/.test(active))

console.log('\n== components/ActiveRenderPill.tsx ==')
check('importa o helper compartilhado', /import \{ buildSeriesContinuationHref \} from '@\/lib\/seriesContinuation'/.test(pill))
check('probe completed carrega seriesSeed', /state: 'completed'; videoId: string \| null; title: string \| null; seriesSeed: string \| null/.test(pill))
check('seriesSeed cai no title quando o servidor nao mandar semente', /series_seed[\s\S]{0,400}?data\.title/.test(pill))
check('handleNextEpisode existe', /function handleNextEpisode\(seed: string\)/.test(pill))
check('mede com series_continue_clicked', /trackEvent\('series_continue_clicked'/.test(pill))
check('fonte declarada e render_pill', /source: 'render_pill'/.test(pill))
check('navega pelo helper, nao por URL escrita a mao', /router\.push\(buildSeriesContinuationHref\(seed, 'render_pill'\)\)/.test(pill))
check('escolher o episodio 2 dispensa o aviso do anterior', /handleNextEpisode[\s\S]{0,900}?setDismissedId\(probeIdentity\(probe\)\)/.test(pill))
// RODADA #9 (2026-09-03) — esta prova estava VERMELHA em origin/main desde a
// #15 (a fila global entrou na condicao do cartao) e nao era o produto: o
// cartao vertical continua exigindo video PRONTO; o que mudou foi ele passar a
// aparecer tambem quando ha ideia guardada sem semente de serie. A invariante
// que importa (nunca durante um render) segue cobrada na linha de baixo.
check('cartao so aparece com video pronto',
  pill.includes("if (probe.state === 'completed' && (nextSeed || (filaVisivel && fila)))"))
check('estado rendering nao ganhou botao de episodio', !/isRendering[\s\S]{0,200}Next episode/.test(pill))
check('botao Watch preservado no cartao novo', /onClick=\{handleAction\}[\s\S]{0,600}Watch/.test(pill))
check('dismiss preservado no cartao novo', /aria-label="Dismiss video ready notification"/.test(pill))
check('alvo de toque >= 40px nos dois botoes', (pill.match(/minHeight: 40/g) || []).length >= 2)
check('cartao cabe no telefone', /width: 'min\(300px, calc\(100vw - 24px\)\)'/.test(pill))
check('pilula original continua existindo para os outros estados', /Rendering… \$\{formatElapsedShort/.test(pill))
// Os checks abaixo olham o CODIGO, nao os comentarios: este arquivo e todo
// comentado em portugues por decisao de casa, e um comentario citando
// "compose/status" nao e uma chamada a compose/status.
const pillCode = pill
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n')
check('nada de preco, plano, credito ou checkout neste componente', !/(price|pricing|plan|credit|checkout|upgrade)/i.test(pillCode))
check('continua sem poller proprio (nao chama compose/status)', !/compose\/status/.test(pillCode))
check('texto do cartao esta em ingles', ['Your video is ready', 'Watch', 'Next episode'].every((t) => pillCode.includes(t)))
check('nenhum texto em portugues visivel ao cliente', !/(Seu v[ií]deo|Pr[oó]ximo epis[oó]dio|Assistir)/.test(pillCode))

console.log(`\n${ok} verificacoes ok, ${fails.length} falhas`)
if (fails.length) { fails.forEach((f) => console.log(`  - ${f}`)); process.exit(1) }
