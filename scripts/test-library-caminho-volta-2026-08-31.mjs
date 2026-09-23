// KINEO-SPRINT-V1V4-2026-08-31 (#1) — provas do caminho de volta na Library.
// A Library mostrava o acervo e so oferecia link de criacao no estado VAZIO:
// aparecia quando nao servia para retencao e sumia depois do 1o video.
// Roda: node scripts/test-library-caminho-volta-2026-08-31.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lib = readFileSync(join(root, 'app/(dashboard)/library/LibraryClient.tsx'), 'utf8')
const series = readFileSync(join(root, 'lib/seriesContinuation.ts'), 'utf8')
const events = readFileSync(join(root, 'app/api/events/route.ts'), 'utf8')

let ok = 0
let bad = 0
function check(name, cond) {
  if (cond) { ok++; console.log(`  ok  ${name}`) }
  else { bad++; console.log(`  X   ${name}`) }
}

console.log('\n1) A fonte library_video_card existe no contrato de serie')
check('union tem library_video_card', /\|\s*'library_video_card'/.test(series))
check('buildSeriesContinuationHref segue tipando a fonte', /source:\s*SeriesContinuationSource/.test(series))
check('prompt continua encapsulando o tema anterior', /next episode in the same Short series/.test(series))

console.log('\n2) O botao de criar deixou de depender do acervo vazio')
check('LibraryClient importa Link', /import Link from 'next\/link'/.test(lib))
// KINEO-REANCORA-SAIDA-DA-BIBLIOTECA-2026-09-07 — as quatro travas casavam com
// o RÓTULO literal `⚡ New video`. Ele virou `Create new video` (Codex,
// `58be2322`) e ganhou `<UiLabel>` por dentro (interface em espanhol, 06/09). A
// saída continua lá, no mesmo lugar e com o mesmo destino — o que este arquivo
// nasceu para impedir ("a Library deixa de ser beco") continua impedido.
//
// A identidade do CTA passa a ser o EVENTO que ele emite
// (`library_create_clicked` com `placement: 'header'`), que é o que o produto
// mede e o que nenhum renomeio de copy muda. O rótulo pode ser traduzido,
// reescrito ou trocado de emoji sem derrubar a trava; tirar a saída, mudá-la de
// destino ou enfiá-la dentro da aba de vídeos derruba.
// ⚠️ A ancora inclui a ASPA DE FECHAMENTO. Sem ela, procurar o nome do evento
// tambem casa com um nome RENOMEADO que so acrescenta sufixo — e o mutante do
// renomeio sobrevive por colisao de prefixo. Aconteceu comigo na primeira
// versao desta trava, hoje, e so a falsificacao mostrou.
const ctaIdx = lib.indexOf("library_create_clicked'")
check('existe o CTA de criar (identificado pelo evento que ele emite)', ctaIdx > -1)
check(
  'o CTA aponta para o Studio',
  /href="\/studio"[\s\S]{0,600}library_create_clicked'/.test(lib),
)
check("o CTA se declara no cabecalho (placement: 'header')", /placement: 'header'/.test(lib))
check('o CTA vive FORA da aba de videos (vale nas 3 abas)', (() => {
  const abaVideos = lib.indexOf("loaded && (tab === 'videos' || (tab === 'all' && vids.length > 0))")
  return ctaIdx > -1 && abaVideos > -1 && ctaIdx < abaVideos
})())
check('o estado vazio continua existindo, mas nao e mais a unica saida', (() => {
  const vazio = lib.indexOf('open the Studio')
  return ctaIdx > -1 && vazio > -1 && ctaIdx < vazio
})())
check('o CTA so aparece com a leitura OK (nao mascara erro)', /loaded && !loadFailed && \(/.test(lib))

console.log('\n3) Progresso honesto: conta o acervo, nao promete nada')
check('mostra "of your first 4 Shorts"', /of your first 4 Shorts/.test(lib))
check('acima de 4 troca para contagem pura', /Shorts made/.test(lib))
// e39b20c7 now lists unfinished/failed projects too. Counting all rows as
// completed would be a regression: progress must use the actual Ready policy.
check('a contagem usa apenas vídeos Ready', lib.includes("const completedCount = vids.filter((video) => libraryVideoState(video) === 'Ready').length") && /\$\{completedCount\} of your first 4 Shorts/.test(lib))
check('a barra de progresso satura em 4 prontos', /Math\.min\(completedCount, 4\)/.test(lib))
check('sem progresso quando não há filme pronto', /completedCount > 0 && \(/.test(lib))
const listing = { exports: {} }
new Function('exports', ts.transpileModule(readFileSync(join(root, 'lib/ui/libraryListing.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(listing.exports)
const mixed = [{ status: 'completed', video_url: '/ready.mp4' }, { status: 'processing' }, { status: 'failed', video_url: '/failed.mp4' }, { status: 'cancelled' }, { status: 'completed' }, { video_url: '/legacy.mp4' }]
const countReady = (items) => items.filter(v => listing.exports.libraryVideoState(v) === 'Ready').length
check('dados mistos: só 2 de 6 projetos são prontos', countReady(mixed) === 2)
check('zero concluídos não vira progresso', countReady(mixed.slice(1, 5)) === 0)
check('coorte mista: total de projetos não equivale a filmes concluídos', mixed.length !== countReady(mixed))

console.log('\n4) O card devolve o TEMA para o Studio')
// UX L2c 05/09: three source anchors named the old direct call. The new
// adapter still consumes that writer. These remain static wiring checks;
// test-archive-studio-review executes the actual JSX and Studio round trip.
check('card usa adaptador de revisao', /buildStudioSeriesReviewHref\(v\.title, 'library_video_card'\)/.test(lib))
check('import do adaptador presente', /from '@\/lib\/navigation\/studioSeriesReview'/.test(lib))
check('botao "Next episode" no card', /Next episode/.test(lib))
check('só oferece episódio com título e filme pronto', /v\.title && libraryVideoState\(v\) === 'Ready' && \(\s*<Link\s+href=\{buildStudioSeriesReviewHref/.test(lib))
check('o card deixou de ser <Link> externo (sem link aninhado)', !/<Link key=\{v\.id\} href=\{`\/history#v-/.test(lib))
check('o video ainda leva para /history', /href=\{`\/history#v-\$\{v\.id\}`\}/.test(lib))

console.log('\n5) Instrumentacao: da para medir se a Library vira 2o video')
check('emite library_create_clicked', /trackEvent\('library_create_clicked'/.test(lib))
check('emite series_continue_clicked com a fonte nova', /source: 'library_video_card'/.test(lib))
check('eventos sao fire-and-forget (void)', /void trackEvent\(/.test(lib))
check('library_create_clicked nao e server-only', !/library_create_clicked/.test(events))
check('series_continue_clicked nao e server-only', !/'series_continue_clicked'/.test(events))
check('o evento de continuação conta prontos, não todos os projetos', /completed_video_count: completedCount/.test(lib) && !/completed_video_count: vids\.length/.test(lib))
check('o clique do cabeçalho ainda informa o acervo total', /video_count: vids\.length/.test(lib))

console.log(`\n${ok} ok · ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
