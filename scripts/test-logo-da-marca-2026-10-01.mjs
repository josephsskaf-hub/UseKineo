// KINEO-LOGO-DA-MARCA-2026-10-01 — guardião do "Seu logo": o logo da empresa do cliente no canto de todo filme.
// Só readFileSync + transpile local (guardião com alias @/ não roda — ver memória "Alias @/").
import { readFileSync } from 'node:fs'
import ts from 'typescript'

let ok = 0, falhas = 0
function checa(nome, cond) { if (cond) { ok++; console.log('  ✓', nome) } else { falhas++; console.log('  ✗', nome) } }
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const compose = ler('lib/compose.ts')
const rota = ler('app/api/compose/route.ts')
const unlock = ler('app/api/compose/unlock/route.ts')
const lib = ler('lib/brandLogo.ts')
const api = ler('app/api/brand-logo/route.ts')
const studio = ler('app/(dashboard)/studio/StudioClient.tsx')
const picker = ler('components/BrandLogoPicker.tsx')

// ── o elemento, EXECUTADO ──
const m = compose.match(/export function brandLogoElement[\s\S]*?\n}\n/)
checa('L1 brandLogoElement existe em lib/compose.ts', !!m)
const js = m ? ts.transpileModule(m[0].replace('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText : ''
const brandLogoElement = m ? new Function(`${js}; return brandLogoElement`)() : () => null
const el = brandLogoElement('https://x.supabase.co/storage/v1/object/public/avatars/u/brand-logo.png?v=1', 42)
checa('L2 https vira imagem na faixa 10, do 0 ao fim, contain', !!el && el.type === 'image' && el.track === 10 && el.time === 0 && el.duration === 42 && el.fit === 'contain')
checa('L3 canto superior esquerdo (x ≤ 20%, y ≤ 10%)', !!el && parseFloat(el.x) <= 20 && parseFloat(el.y) <= 10)
checa('L4 sem URL / http / duração 0 = nenhum elemento', brandLogoElement(null, 30) === null && brandLogoElement('http://a/b.png', 30) === null && brandLogoElement('https://a/b.png', 0) === null)
checa('L5 faixa 10 é exclusiva do logo', (compose.match(/track: 10\b/g) || []).length === 1)

// ── os dois montadores ──
checa('L6 os DOIS builders recebem brandLogoUrl e empurram o elemento', (compose.match(/brandLogoUrl = null, \/\/ KINEO-LOGO-DA-MARCA/g) || []).length === 2 && (compose.match(/const logoEl = brandLogoElement\(brandLogoUrl, totalDuration\)/g) || []).length === 2)
checa('L7 compose resolve o logo da CONTA autenticada nos dois caminhos (hollywood + clássico)', (rota.match(/findBrandLogoUrl\(authenticatedUserId, composeAdmin\)/g) || []).length === 2 && rota.includes('brandLogoUrl: hollywoodBrandLogoUrl,') && /buildCreatomateSource\(\{\n\s+brandLogoUrl,/.test(rota))
checa('L8 a versão limpa (unlock) mantém o logo', unlock.includes('findBrandLogoUrl(user.id, admin)') && /buildCreatomateSource\(\{\n\s+brandLogoUrl,/.test(unlock))

// ── armazenamento e API ──
checa('L9 caminho fixo por conta: <uid>/brand-logo.(png|jpg)', lib.includes('`${userId}/${BRAND_LOGO_BASENAME}.${ext}`') && lib.includes("'image/png': 'png', 'image/jpeg': 'jpg'"))
checa('L10 busca nunca derruba o render (try/catch → null)', /export async function findBrandLogoUrl[\s\S]*?catch \(err\)[\s\S]*?return null/.test(lib))
checa('L11 API exige login, autorização de uso, PNG/JPG, ≤5 MB e moderação', api.includes("status: 401") && api.includes("form.get('rights')") && api.includes('BRAND_LOGO_TYPES[mime]') && api.includes('BRAND_LOGO_MAX_BYTES') && api.includes('moderateContent(') && api.includes('removeBrandLogo(userId)'))

// ── a tela ──
checa('L12 /studio mostra "Seu logo" fora do modo clipe', studio.includes("import BrandLogoPicker from '@/components/BrandLogoPicker'") && studio.includes("{scriptMode !== 'clip' && <BrandLogoPicker />}"))
checa('L13 o picker só sobe com a caixa marcada e envia rights=true', picker.includes("disabled={!consent || busy}") && picker.includes("form.append('rights', 'true')"))

console.log(`\ntest-logo-da-marca-2026-10-01: ${ok} ok · ${falhas} falhas`)
process.exit(falhas ? 1 : 0)
