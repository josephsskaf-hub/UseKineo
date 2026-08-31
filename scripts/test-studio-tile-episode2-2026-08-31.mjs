// KINEO-SPRINT-V1V4-2026-08-31 (#8) — prova da rodada: as miniaturas
// "Your latest videos" do /studio deixam de ser beco sem saida (MP4 cru) e
// passam a levar ao episodio 2 DAQUELE tema, com rotulo permanente que
// funciona em telefone. Rodar: node scripts/test-studio-tile-episode2-2026-08-31.mjs
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8')
// Proibicao roda sobre CODIGO, nunca sobre comentario (regra de metodo das
// rodadas #4-#7: o teste ja reprovou quatro vezes o proprio comentario).
const semComentario = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

let ok = 0
const falhas = []
const eq = (nome, real, esperado) => {
  if (real === esperado) ok++
  else falhas.push(`${nome}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(real)}`)
}
const yes = (nome, cond) => eq(nome, Boolean(cond), true)
const no = (nome, cond) => eq(nome, Boolean(cond), false)

const SERIES = ler('lib/seriesContinuation.ts')
const STUDIO = ler('app/(dashboard)/studio/StudioClient.tsx')
const KIT = ler('components/studioKit.tsx')
const PAGE = ler('app/(dashboard)/studio/page.tsx')
const STUDIO_CODIGO = semComentario(STUDIO)
const KIT_CODIGO = semComentario(KIT)

// ── A. a fonte do tema aceita a origem nova ────────────────────────────────
yes('A1 union tem studio_video_tile', /\|\s*'studio_video_tile'/.test(SERIES))
yes('A2 origens antigas intactas', ['done_screen','history_milestone','studio_milestone','library_video_card','render_pill','done_footer','returning_ready_banner']
  .every((s) => SERIES.includes(`'${s}'`)))
yes('A3 href leva prompt+autoanalyze+series', /prompt,\s*\n?\s*autoanalyze: '1',\s*\n?\s*series: '1'/.test(SERIES.replace(/\r/g,'')))
yes('A4 titulo vazio nao inventa tema', /if \(!prompt\) return '\/generate'/.test(SERIES))

// ── B. a miniatura virou duas acoes com rotulo permanente ──────────────────
no('B1 miniatura nao e mais UM link unico', /<a key=\{v\.id\} className="vtile"/.test(STUDIO_CODIGO))
yes('B2 container e div.vtile', /<div key=\{v\.id\} className="vtile">/.test(STUDIO_CODIGO))
yes('B3 assistir continua existindo (.vtwatch)', /className="vtwatch"/.test(STUDIO_CODIGO))
yes('B4 assistir ainda abre em outra aba', /className="vtwatch"[\s\S]{0,400}target="_blank"[\s\S]{0,120}rel="noreferrer"/.test(STUDIO_CODIGO))
yes('B5 barra de acao permanente (.vtnext)', /className="vtnext"/.test(STUDIO_CODIGO))
yes('B6 rotulo visivel diz Episode 2', /Episode 2 →/.test(STUDIO_CODIGO))
yes('B7 href usa o tema DAQUELE video', /buildSeriesContinuationHref\(v\.title, 'studio_video_tile'\)/.test(STUDIO_CODIGO))
yes('B8 marco antigo segue no video mais recente', /buildSeriesContinuationHref\(myVids\[0\]\?\.title, 'studio_milestone'\)/.test(STUDIO_CODIGO))
yes('B9 clique grava series_continue_clicked', /source: 'studio_video_tile'/.test(STUDIO_CODIGO))
yes('B10 clique carrega a posicao na fileira', /position: idx/.test(STUDIO_CODIGO))
yes('B11 assistir tambem vira dado', /studio_tile_watch_clicked/.test(STUDIO_CODIGO))
yes('B12 leitor de tela sabe o que e o link', /aria-label=\{v\.title \? `Watch \$\{v\.title\}`/.test(STUDIO_CODIGO))
yes('B13 selo HD preservado', /✨ HD/.test(STUDIO_CODIGO))
yes('B14 titulo do video preservado', /className="vt">\{v\.title\}/.test(STUDIO_CODIGO))
yes('B15 seis videos no maximo, como antes', /\.slice\(0, 6\)/.test(STUDIO_CODIGO))

// ── C. exposicao antes de taxa (licao da #7) ───────────────────────────────
yes('C1 evento de exposicao existe', /studio_tiles_shown/.test(STUDIO_CODIGO))
yes('C2 grava quantos videos', /videos: myVids\.length/.test(STUDIO_CODIGO))
yes('C3 grava ambiente de toque', /is_touch: coarse/.test(STUDIO_CODIGO))
yes('C4 grava largura da tela', /viewport_w:/.test(STUDIO_CODIGO))
yes('C5 dispara UMA vez por carga', /tilesShownRef\.current = true/.test(STUDIO_CODIGO))
yes('C6 nao dispara com acervo vazio', /myVids\.length === 0\) return/.test(STUDIO_CODIGO))
yes('C7 toque medido por hover:none, nao por user-agent', /matchMedia\('\(hover: none\)'\)/.test(STUDIO_CODIGO))
yes('C8 nao quebra em SSR', /typeof window !== 'undefined'/.test(STUDIO_CODIGO))
// nenhum dado da pessoa viaja no evento de exposicao — recorte EXATO do bloco
const blocoExposicao = STUDIO_CODIGO.slice(
  STUDIO_CODIGO.indexOf("void trackEvent('studio_tiles_shown'"),
  STUDIO_CODIGO.indexOf("void trackEvent('studio_tiles_shown'") + 260,
)
no('C9 exposicao nao carrega titulo/email/id', /title|email|user_id|prompt/i.test(blocoExposicao))

// ── D. nada depende de :hover (o defeito que esta rodada mata) ─────────────
yes('D1 .vtnext existe em repouso', /\.stu \.vtile \.vtnext\{/.test(KIT_CODIGO))
yes('D2 .vtwatch existe em repouso', /\.stu \.vtile \.vtwatch\{/.test(KIT_CODIGO))
yes('D3 feedback de toque no botao', /\.vtnext\{[^}]*-webkit-tap-highlight-color/.test(KIT_CODIGO))
yes('D4 feedback de teclado', /\.vtnext:hover,\.stu \.vtile \.vtnext:focus-visible/.test(KIT_CODIGO))
yes('D5 estado :active para o toque', /\.vtnext:active\{/.test(KIT_CODIGO))
yes('D6 sinal de video tocavel permanente', /\.stu \.vtile \.vtplay\{/.test(KIT_CODIGO))
yes('D7 play badge nao rouba o clique', /\.vtplay\{[^}]*pointer-events:none/.test(KIT_CODIGO))
yes('D8 titulo nao rouba o clique', /\.stu \.vtile \.vt\{[^}]*pointer-events:none/.test(KIT_CODIGO))
yes('D9 titulo acima da camada de assistir', /\.stu \.vtile \.vt\{[^}]*z-index:2/.test(KIT_CODIGO))
yes('D10 titulo sobe para nao cobrir a barra', /\.stu \.vtile \.vt\{[^}]*bottom:34px/.test(KIT_CODIGO))
yes('D11 barra fica colada embaixo', /\.vtnext\{[^}]*bottom:0/.test(KIT_CODIGO))
yes('D12 barra acima de tudo na miniatura', /\.vtnext\{[^}]*z-index:3/.test(KIT_CODIGO))
// o CSS mora dentro de template literal: crase aqui quebrou o build uma vez
no('D13 nenhuma crase no bloco novo de CSS', KIT_CODIGO.slice(KIT_CODIGO.indexOf('.stu .vtile{'), KIT_CODIGO.indexOf('.vtnext:active')).includes('`'))

// ── E. a peca esta LIGADA (licao do sceneTruth: biblioteca morta) ──────────
yes('E1 /studio renderiza o StudioClient', /StudioClient/.test(PAGE))
yes('E2 StudioClient importa o helper de tema', /import \{ buildSeriesContinuationHref \} from '@\/lib\/seriesContinuation'/.test(STUDIO))
yes('E3 StudioClient importa a telemetria', /import \{ trackEvent \} from '@\/lib\/analytics'/.test(STUDIO))
yes('E4 StudioClient usa o CSS alterado', /STUDIO_KIT_CSS/.test(STUDIO))
yes('E5 useRef disponivel para a guarda', /useRef/.test(STUDIO.split('\n').find((l) => l.startsWith('import { useEffect')) ?? ''))

// ── F. fronteira com o Codex e com a curadoria do fundador ─────────────────
for (const proibido of ['price', 'credit', 'checkout', 'coupon', 'upgrade', 'stripe']) {
  no(`F-${proibido}: nao entrou no bloco novo da miniatura`,
    new RegExp(proibido, 'i').test(
      STUDIO_CODIGO.slice(STUDIO_CODIGO.indexOf('<div key={v.id} className="vtile">'), STUDIO_CODIGO.indexOf('Episode 2 →') + 400),
    ))
}
no('F1 nada de EngineCycleCard (curadoria do fundador)', /EngineCycleCard/.test(STUDIO_CODIGO))
no('F2 nada de engineWall (curadoria do fundador)', /engineWall/.test(STUDIO_CODIGO))

console.log(`${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { for (const f of falhas) console.log(' ✗ ' + f); process.exit(1) }
