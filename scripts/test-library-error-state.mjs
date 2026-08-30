// Sprint UI #3 (29/08) — prova estatica: a Library nao mascara mais erro de
// leitura como "No videos yet" (divida do incidente JWT-skew de 28/08) e o
// loading e skeleton com a forma do resultado, nao texto.
import { readFileSync } from 'node:fs'
const src = readFileSync('app/(dashboard)/library/LibraryClient.tsx', 'utf8')
let fails = 0
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + name); if (!ok) fails++ }

check('estado loadFailed existe', src.includes('const [loadFailed, setLoadFailed] = useState(false)'))
check('fetch com falha resolve null (nao lista vazia)', src.includes("(r.ok ? r.json() : null)).catch(() => null)"))
check('qualquer null marca loadFailed', src.includes('if (v === null || i === null || a === null) setLoadFailed(true)'))
check('banner de erro com role=alert', src.includes('role="alert"'))
check('banner tranquiliza: dados salvos', src.includes('Your videos and credits are safe'))
check('botao Try again religa loadAll', src.includes('onClick={loadAll}'))
check('"No videos yet" so aparece sem falha', src.includes('loadFailed ? null : <p className="sub">No videos yet'))
check('"No images yet" so aparece sem falha', src.includes('loadFailed ? null : <p className="sub">No images yet'))
check('"No audio yet" so aparece sem falha', src.includes('loadFailed ? null : <p className="sub">No audio yet'))
check('skeleton shimmer no lugar do texto de loading', src.includes('@keyframes libsk') && !src.includes('Loading your library…</p>'))
check('skeleton em grade 9:16 (forma do resultado)', src.includes("aspectRatio: '9/16', borderRadius: 12"))

console.log(fails === 0 ? '\n11/11 OK' : `\n${fails} FALHAS`)
process.exit(fails === 0 ? 0 : 1)
