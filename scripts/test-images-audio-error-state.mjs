// Sprint UI #5 (29/08) — prova estatica: /images e /audio nao mascaram mais
// falha de leitura da galeria como galeria vazia (ultimas duas telas com a
// divida do incidente JWT-skew: r.ok ? json : [] + catch(() => {})).
import { readFileSync } from 'node:fs'
const img = readFileSync('app/(dashboard)/images/ImagesClient.tsx', 'utf8')
const aud = readFileSync('app/(dashboard)/audio/AudioClient.tsx', 'utf8')
let fails = 0
const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ' ' + name); if (!ok) fails++ }

for (const [tag, src, api] of [['images', img, '/api/images'], ['audio', aud, '/api/audio']]) {
  check(`${tag}: estado galleryFailed existe`, src.includes('const [galleryFailed, setGalleryFailed] = useState(false)'))
  check(`${tag}: mascara antiga morreu (r.ok ? json : vazio)`, !src.includes(`(r.ok ? r.json() : {`))
  check(`${tag}: catch silencioso do load morreu`, src.includes('.catch(() => setGalleryFailed(true))'))
  check(`${tag}: resposta nao-ok vira erro (throw)`, src.includes('if (!r.ok) throw new Error(String(r.status))'))
  check(`${tag}: banner com role=alert`, src.includes('role="alert"'))
  check(`${tag}: banner tranquiliza (safe)`, src.includes('credits are safe'))
  check(`${tag}: Try again religa loadGallery`, src.includes('onClick={loadGallery}'))
  check(`${tag}: retry limpa o estado antes (${api})`, src.includes('setGalleryFailed(false)') && src.includes(`fetch('${api}', { cache: 'no-store' })`))
}
check('banner aparece mesmo com galeria vazia (fora do items.length>0)', img.indexOf('galleryFailed && (') < img.indexOf('{items.length > 0 && (') && aud.indexOf('galleryFailed && (') < aud.indexOf('{items.length > 0 && ('))

console.log(fails === 0 ? '\n17/17 OK' : `\n${fails} FALHAS`)
process.exit(fails === 0 ? 0 : 1)
