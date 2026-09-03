// KINEO-SPRINT-V1V4-2026-08-31 (#1) — provas do caminho de volta na Library.
// A Library mostrava o acervo e so oferecia link de criacao no estado VAZIO:
// aparecia quando nao servia para retencao e sumia depois do 1o video.
// Roda: node scripts/test-library-caminho-volta-2026-08-31.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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
check('existe CTA "New video"', /New video/.test(lib))
check('o CTA aponta para o Studio', /href="\/studio"[\s\S]{0,400}New video/.test(lib))
check('o CTA vive FORA da aba de videos (vale nas 3 abas)', (() => {
  const cta = lib.indexOf('⚡ New video')
  const abaVideos = lib.indexOf("loaded && tab === 'videos'")
  return cta > -1 && abaVideos > -1 && cta < abaVideos
})())
check('o estado vazio continua existindo, mas nao e mais a unica saida', (() => {
  const cta = lib.indexOf('⚡ New video')
  const vazio = lib.indexOf('open the Studio')
  return cta > -1 && vazio > -1 && cta < vazio
})())
check('o CTA so aparece com a leitura OK (nao mascara erro)', /loaded && !loadFailed && \(/.test(lib))

console.log('\n3) Progresso honesto: conta o acervo, nao promete nada')
check('mostra "of your first 4 Shorts"', /of your first 4 Shorts/.test(lib))
check('acima de 4 troca para contagem pura', /Shorts made/.test(lib))
check('a contagem sai de vids.length (dado real)', /\$\{vids\.length\} of your first 4 Shorts/.test(lib))
check('a barra de progresso satura em 4', /Math\.min\(vids\.length, 4\)/.test(lib))
check('nada de progresso quando o acervo esta vazio', /vids\.length > 0 && \(/.test(lib))

console.log('\n4) O card devolve o TEMA para o Studio')
check('card usa buildSeriesContinuationHref', /buildSeriesContinuationHref\(v\.title, 'library_video_card'\)/.test(lib))
check('import do helper presente', /from '@\/lib\/seriesContinuation'/.test(lib))
check('botao "Next episode" no card', /Next episode/.test(lib))
check('so oferece episodio quando ha titulo (sem prompt vazio)', /v\.title && \([\s\S]{0,200}buildSeriesContinuationHref/.test(lib))
check('o card deixou de ser <Link> externo (sem link aninhado)', !/<Link key=\{v\.id\} href=\{`\/history#v-/.test(lib))
check('o video ainda leva para /history', /href=\{`\/history#v-\$\{v\.id\}`\}/.test(lib))

console.log('\n5) Instrumentacao: da para medir se a Library vira 2o video')
check('emite library_create_clicked', /trackEvent\('library_create_clicked'/.test(lib))
check('emite series_continue_clicked com a fonte nova', /source: 'library_video_card'/.test(lib))
check('eventos sao fire-and-forget (void)', /void trackEvent\(/.test(lib))
check('library_create_clicked nao e server-only', !/library_create_clicked/.test(events))
check('series_continue_clicked nao e server-only', !/'series_continue_clicked'/.test(events))
check('o evento carrega o tamanho do acervo', /completed_video_count: vids\.length/.test(lib))

console.log(`\n${ok} ok · ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
