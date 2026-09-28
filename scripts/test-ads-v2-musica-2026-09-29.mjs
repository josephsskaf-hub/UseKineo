// Guardião: a música do anúncio v2 começa onde a faixa TEM som e sobe quando a voz acaba.
// KINEO-ADS-V2-MUSICA-2026-09-29 — o 1º anúncio real (pedido 6dc2b61d) saiu mudo do segundo 8 ao 14: a reserva
// sorteou emotional-11.mp3, que tem 14 s de silêncio na abertura, e a montagem tocava a partir do zero.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8')
const imp = (p) => import(pathToFileURL(join(RAIZ, p)).href)
let ok = 0, falhas = 0
const check = (nome, cond) => { let v = false; try { v = typeof cond === 'function' ? cond() : cond } catch { v = false } if (v) ok++; else { falhas++; console.log('  FAIL', nome) } }

const Mu = await imp('lib/ads/v2Music.ts')
const M = await imp('lib/ads/adV2Montage.ts')
const LIB = 'https://x.supabase.co/storage/v1/object/public/music/'

// 1. toda faixa da biblioteca foi medida (aprovada com início, ou reprovada)
const biblioteca = [...new Set([...rd('lib/pixabayMusic.ts').matchAll(/SUPABASE_MUSIC_BASE\}\/([a-z]+-\d{2}\.mp3)/g)].map((m) => m[1]))]
check(`biblioteca lida (${biblioteca.length} faixas)`, biblioteca.length >= 50)
const semMedida = biblioteca.filter((t) => !(t in Mu.ADS_V2_MUSIC_STARTS) && !Mu.ADS_V2_MUSIC_EXCLUDED.includes(t))
check(`toda faixa da biblioteca tem início medido ou está fora (sem medida: ${semMedida.join(', ') || 'nenhuma'})`, semMedida.length === 0)
check('nenhuma faixa aprovada fora da biblioteca (tabela velha)', Object.keys(Mu.ADS_V2_MUSIC_STARTS).every((t) => biblioteca.includes(t)))
check('emotional-11 (a do 1º anúncio) começa no segundo 57,05', Mu.ADS_V2_MUSIC_STARTS['emotional-11.mp3'] === 57.05)
check('emotional-08 está fora e não serve', Mu.ADS_V2_MUSIC_EXCLUDED.includes('emotional-08.mp3') && !Mu.adsV2MusicUsable(LIB + 'emotional-08.mp3'))

// 2. funções
check('trim da biblioteca = início medido', Mu.adsV2MusicTrimStart(LIB + 'emotional-11.mp3') === 57.05 && Mu.adsV2MusicTrimStart(LIB + 'epic-01.mp3') === 0)
check('cópia do Lyria (fora da biblioteca) começa no zero e serve', Mu.adsV2MusicTrimStart('https://x.supabase.co/storage/v1/object/public/renders/u/adsv2-o-music.mp3') === 0 && Mu.adsV2MusicUsable('https://x.supabase.co/storage/v1/object/public/renders/u/adsv2-o-music.mp3'))
check('URL vazia não serve', !Mu.adsV2MusicUsable('') && !Mu.adsV2MusicUsable(null))
check('reserva: mesmo clima, aprovada e determinística', () => {
  const a = Mu.adsV2FallbackTrack('emotional', 'pedido-1'); const b = Mu.adsV2FallbackTrack('emotional', 'pedido-1')
  return a === b && a.startsWith('emotional-') && a in Mu.ADS_V2_MUSIC_STARTS
})
check('troca de faixa mantém o bucket', Mu.adsV2SwapLibraryTrack(LIB + 'emotional-08.mp3', 'emotional-01.mp3') === LIB + 'emotional-01.mp3')

// 3. montagem: começa no trim e sobe depois da voz, com a MESMA música continuando
const shots = [0, 1, 2, 3, 4, 5].map((i) => ({ url: `https://x.co/p${i}.mp4`, kind: 'product', cutStart: 0.25, cutSeconds: i === 2 ? 2.5 : 2, measuredSeconds: 3.042 }))
const base = { width: 1080, height: 1920, shots, overlays: [], fontFamily: 'Montserrat', cardUrl: 'https://x.co/card.png', cardSeconds: 2.5, musicUrl: LIB + 'emotional-11.mp3' }
const els = (s) => s.elements.filter((e) => e.type === 'audio' && e.track === 6)
check('com voz de 7,128 s: 2 trechos, 25% até 7,628 s e 70% depois, trim contínuo a partir de 57,05', () => {
  const a = els(M.buildAdV2Source({ ...base, musicTrimStart: 57.05, voiceUrl: 'https://x.co/v.mp3', voiceSeconds: 7.128 }))
  return a.length === 2 && a[0].time === 0 && a[0].duration === 7.628 && a[0].trim_start === 57.05 && a[0].volume === '25%' &&
    a[1].time === 7.628 && a[1].duration === 7.372 && a[1].trim_start === 64.678 && a[1].volume === '70%'
})
check('sem voz: 1 trecho a 70% começando no trim', () => {
  const a = els(M.buildAdV2Source({ ...base, musicTrimStart: 57.05, voiceUrl: null, voiceSeconds: null }))
  return a.length === 1 && a[0].trim_start === 57.05 && a[0].volume === '70%' && a[0].duration === 15
})
check('trim inválido é recusado', () => { try { M.buildAdV2Source({ ...base, musicTrimStart: -1 }); return false } catch (e) { return /bad_music_trim/.test(String(e)) } })

// 4. o motor usa: troca faixa reprovada e passa o trim à montagem
const adv = rd('lib/ads/v2Advance.ts')
check('v2Advance troca faixa que não serve por uma aprovada do mesmo clima', /if \(musicUrl && !adsV2MusicUsable\(musicUrl\)\) musicUrl = adsV2SwapLibraryTrack\(musicUrl, adsV2FallbackTrack\(mood, order\.id\)\)/.test(adv))
check('v2Advance passa musicTrimStart: adsV2MusicTrimStart(musicUrl) à montagem', /musicTrimStart: adsV2MusicTrimStart\(musicUrl\)/.test(adv))

console.log(`test-ads-v2-musica-2026-09-29: ${ok} ok · ${falhas} falhas`)
process.exit(falhas ? 1 : 0)
