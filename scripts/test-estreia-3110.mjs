// KINEO-ESTREIA-3110 — guardião da "espera vira a estreia" (fundador 31/10: "para todos os lugares onde a pessoa vai
// gerar alguma coisa, a mesma UX… não vai ficar só nos filmes"). Confere que o componente único existe com as 3 peças e
// que CADA tela de geração usa ele — tela nova de geração que nascer sem a estreia quebra este teste.
// Rodar: node scripts/test-estreia-3110.mjs
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const P = read('components/premiere/Premiere.tsx')
for (const x of ['export function PremiereStage', 'export function PremiereResult', 'export function PremiereNotify', 'export function usePremiereBeacon', 'export function PremiereNextCard'])
  ok(P.includes(x), `componente: ${x}`)
ok(/Notification\.requestPermission\(\)/.test(P) && P.includes("onClick={async () =>"), 'permissão de aviso só no clique da pessoa')
for (const e of ['premiere_shown', 'premiere_first_reveal', 'premiere_notify_opted', 'premiere_ready_seen', 'premiere_next_clicked', 'premiere_download_clicked'])
  ok(P.includes(`'${e}'`), `evento ${e}`)
ok(!/credits?|cr\b/i.test(P.replace(/\/\/.*$/gm, '').replace(/o crédito sai/g, '')), 'o componente não mostra crédito nem custo')

const G = read('app/(dashboard)/generate/GenerateClient.tsx')
ok(G.includes("import { PremiereStage, type PremiereItem } from '@/components/premiere/Premiere'"), 'Filme importa a estreia')
ok(G.includes('setPremiereClips(data.clips.map('), 'Filme guarda o status de CADA cena que o poll já recebia')
ok(G.includes("useEffect(() => { if (phase === 'generating') setPremiereClips([]) }, [phase])"), 'filme novo começa com a sala vazia')
ok(G.includes('<PremiereStage') && G.includes('items={premiereItems}') && G.includes('now={premiereNow}'), 'Filme mostra a sala ao vivo')

// Todas as telas de geração ao vivo (as legadas /create e /video não têm link; /ads/producao é interna).
const SURFACES = [
  'app/(dashboard)/clips/ClipsClient.tsx',
  'app/(dashboard)/studio/StudioClient.tsx',
  'app/(dashboard)/animate/AnimateClient.tsx',
  'app/(dashboard)/avatar/AvatarStudioClient.tsx',
  'app/(dashboard)/images/ImagesClient.tsx',
  'app/(dashboard)/audio/AudioClient.tsx',
  'app/(dashboard)/thumbnail-generator/ThumbnailGeneratorClient.tsx',
  'app/(dashboard)/spaces/SpacesClient.tsx',
  'components/kidsCartoon/KidsCartoonTemplate.tsx',
  'components/kidsCartoon/BabyPodcastTemplate.tsx',
  'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
]
for (const f of SURFACES) {
  const s = read(f)
  ok(s.includes("from '@/components/premiere/Premiere'") && s.includes('<PremiereStage') && s.includes('<PremiereResult') && s.includes('usePremiereBeacon('), `${f.split('/').slice(-1)[0]}: sala + estreia + aviso`)
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
if (fail) process.exit(1)
