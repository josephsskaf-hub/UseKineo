// sprint-ui #7 (2026-08-30) — prova: /images e /audio mostram a FORMA da
// galeria (shimmer) no primeiro carregamento, em vez de nada que "popa".
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
const ok = (name, cond) => { cond ? pass++ : (fail++, console.error('FAIL: ' + name)) }

for (const [label, file, kf] of [
  ['images', 'app/(dashboard)/images/ImagesClient.tsx', 'imgsk'],
  ['audio', 'app/(dashboard)/audio/AudioClient.tsx', 'audsk'],
]) {
  const s = readFileSync(file, 'utf8')
  ok(`${label}: estado galleryLoading existe (inicia true)`, s.includes('const [galleryLoading, setGalleryLoading] = useState(true)'))
  ok(`${label}: loadGallery liga o loading (Try again re-mostra skeleton)`, s.includes('setGalleryLoading(true)'))
  ok(`${label}: finally desliga o loading em sucesso E falha`, s.includes('.finally(() => setGalleryLoading(false))'))
  ok(`${label}: skeleton so aparece carregando, sem falha e sem itens`, s.includes('galleryLoading && !galleryFailed && items.length === 0'))
  ok(`${label}: keyframes proprios do shimmer`, s.includes(`@keyframes ${kf}`))
  ok(`${label}: acessibilidade aria-busy no bloco de loading`, s.includes('aria-busy="true"'))
  ok(`${label}: aviso ambar de falha continua intacto`, s.includes('galleryFailed && (') && s.includes('Try again'))
}
const img = readFileSync('app/(dashboard)/images/ImagesClient.tsx', 'utf8')
ok('images: skeleton usa a MESMA grade da estante real (sem salto)', img.includes("repeat(auto-fill,minmax(220px,1fr))") && img.split("repeat(auto-fill,minmax(220px,1fr))").length >= 3)
const aud = readFileSync('app/(dashboard)/audio/AudioClient.tsx', 'utf8')
ok('audio: skeleton em fileiras como os cards reais', aud.includes('height: 60, borderRadius: 12'))
ok('images: rotulo My Images ja aparece no skeleton', img.indexOf('My Images') < img.lastIndexOf('My Images'))
ok('audio: rotulo My Audio ja aparece no skeleton', aud.indexOf('My Audio') < aud.lastIndexOf('My Audio'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
