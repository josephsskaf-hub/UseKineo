// sprint-ui #9 — prova da busca de videos em /history e /my-videos.
// Nao roda app: verifica no FONTE que a busca existe, filtra e nao regride
// as licoes anteriores (16px anti-zoom do sprint #1, empty state com saida).
import { readFileSync } from 'node:fs'

const hist = readFileSync('app/(dashboard)/history/HistoryClient.tsx', 'utf8')
const mv = readFileSync('app/(dashboard)/my-videos/MyVideosClient.tsx', 'utf8')

let n = 0, fail = 0
function check(name, ok) {
  n++
  if (!ok) fail++
  console.log(`${ok ? '✅' : '❌'} ${name}`)
}

// /history
check('history: estado query existe', hist.includes("const [query, setQuery] = useState('')"))
check('history: visibleVideos filtra por extractTitle + topic', hist.includes('extractTitle(v.topic)') && hist.includes('visibleVideos = useMemo'))
check('history: grid renderiza visibleVideos (nao mais videos cru)', hist.includes('visibleVideos.map((video)') && !hist.includes('{videos.map((video)'))
check('history: input de busca com aria-label', hist.includes('aria-label="Search your videos by title or topic"'))
check('history: 16px anti-zoom iOS no input (licao sprint #1)', /type="search"[\s\S]{0,900}?fontSize: 16/.test(hist))
check('history: busca so aparece com acervo (>=6)', hist.includes('videos.length >= 6 && ('))
check('history: zero resultado tem saida (Clear search)', hist.includes('Clear search'))
check('history: stats continuam no acervo TOTAL (nao no filtrado)', hist.includes('String(videos.length), label:'))

// /my-videos
check('my-videos: estado query existe', mv.includes("const [query, setQuery] = useState('')"))
check('my-videos: filtro combina status + query (title+prompt)', mv.includes('`${v.title} ${v.prompt ?? \'\'}`.toLowerCase().includes(q)'))
check('my-videos: memo depende de query', mv.includes('[videos, filter, query]'))
check('my-videos: input de busca com aria-label', mv.includes('aria-label="Search your videos by title"'))
check('my-videos: 16px anti-zoom iOS no input', /type="search"[\s\S]{0,900}?fontSize: 16/.test(mv))
check('my-videos: zero resultado com busca mostra o termo + Clear search', mv.includes('No videos match &ldquo;') && mv.includes('Clear search'))
check('my-videos: contadores das abas seguem no acervo total', mv.includes('}, [videos])'))

console.log(`\n${n - fail}/${n} verificacoes passaram`)
process.exit(fail ? 1 : 0)
