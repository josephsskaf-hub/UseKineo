import { PRESENTER_APPROVED_ENTRIES_2410 } from '../presenterCandidates2410' // KINEO-APRESENTADORES-2410
// KINEO-ADS-ESCOLHA-PUBLICO-2410 — translated previews preserve the Portuguese default.
// KINEO-ADS-ESCOLHA-2310 — public/isomorphic choice data; every preview is an illustration, never generated output.
import type { CenaCategory } from './catalog'
export const CENA_ESCOLHA_MARK = 'KINEO-ADS-ESCOLHA-2310'
export const CENA_ESCOLHA_TAKES = Object.freeze([
  { id: 'wide', seconds: 5, pt: 'Pessoa inteira', en: 'Full person' },
  { id: 'medium', seconds: 5, pt: 'Plano médio · uso', en: 'Medium shot · use' },
  { id: 'close', seconds: 5, pt: 'Close · produto em uso', en: 'Close-up · product in use' },
] as const)
export const CENA_ESCOLHA_PRESENTERS = Object.freeze([
  { id: 'sofia', name: 'Sofia', portrait: '/ads/presenters/sofia.webp' },
  { id: 'amara', name: 'Amara', portrait: '/ads/presenters/amara.webp' },
  { id: 'rahul', name: 'Rahul', portrait: '/ads/presenters/rahul.webp' },
  { id: 'kenji', name: 'Kenji', portrait: '/ads/presenters/kenji.webp' },
  { id: 'jade', name: 'Jade', portrait: '/ads/presenters/jade.webp' },
  { id: 'robert', name: 'Robert', portrait: '/ads/presenters/robert.webp' },
  ...PRESENTER_APPROVED_ENTRIES_2410.map(p => ({ id: p.id, name: p.name, portrait: p.portrait! })), // KINEO-APRESENTADORES-2410
] as const)
export const CENA_ESCOLHA_CATEGORY_LABELS: Record<CenaCategory, { pt: string; en: string }> = {
  wearable: { pt: 'Relógio e wearable', en: 'Watch and wearable' }, skincare: { pt: 'Skincare', en: 'Skincare' }, perfume: { pt: 'Perfume', en: 'Perfume' }, footwear: { pt: 'Tênis e calçado', en: 'Shoes' }, bag: { pt: 'Bolsa', en: 'Bag' }, bottle: { pt: 'Garrafa', en: 'Bottle' }, supplement: { pt: 'Suplemento', en: 'Supplement' }, tea: { pt: 'Chá', en: 'Tea' }, other: { pt: 'Outro produto', en: 'Other product' },
}
type SceneRow = readonly [id: string, pt: string, en: string, setting: string]
const ROWS: Record<CenaCategory, readonly SceneRow[]> = {
  wearable: [
    ['track', 'Pista ao amanhecer', 'Track at dawn', 'a premium athletics track at sunrise, warm coral sky, golden rim light and crisp cinematic contrast'], ['gym', 'Academia boutique', 'Boutique gym', 'a premium boutique gym, sculpted warm lighting, clean equipment and cinematic contrast'], ['desk', 'Escritório panorâmico', 'Panoramic office', 'an elegant panoramic office at golden hour, warm coral side light and cinematic contrast'], ['park', 'Parque na hora dourada', 'Golden-hour park', 'a landscaped park path at golden hour, warm backlight and rich natural greens'], ['poolside', 'Piscina de resort', 'Resort poolside', 'beside an elegant resort pool at golden hour, on dry ground, with no water touching the product'], ['studio', 'Estúdio de luz e sombra', 'Light-and-shadow studio', 'a premium studio with a coral light gradient and strong controlled light-and-shadow contrast'],
  ],
  skincare: [
    ['bathroom', 'Banheiro de luz natural', 'Natural-light bathroom', 'a luxurious clean bathroom in natural window light, warm ivory and coral tones, no dishes, clutter or reflecting mirror'], ['vanity', 'Penteadeira pela manhã', 'Morning vanity', 'an elegant morning vanity in golden natural light, clean sculptural decor, no dishes or reflecting mirror'], ['window', 'Janela na hora dourada', 'Golden-hour window', 'an airy premium room beside a large window, golden side light and warm coral highlights, no dishes'], ['studio', 'Estúdio de luxo', 'Luxury studio', 'a luxury skincare studio with a clean ivory backdrop, sculptural coral light and no dishes'], ['diffuse', 'Bancada sob luz difusa', 'Soft-light counter', 'a clean luxury bathroom under diffuse natural light, warm stone surfaces, no dishes or reflecting mirror'], ['bedroom', 'Suíte de manhã', 'Morning suite', 'an elegant airy suite in soft morning light, clean background, no dishes or reflecting mirror'],
  ],
  perfume: [
    ['vanity', 'Penteadeira dourada', 'Golden vanity', 'an elegant dressing room vanity in warm golden light, cinematic contrast, no reflecting mirror'], ['evening', 'Noite elegante', 'Elegant evening', 'an elegant hotel entrance at night, warm amber lights, deep navy shadows and cinematic contrast'], ['rooftop', 'Rooftop ao pôr do sol', 'Sunset rooftop', 'an elegant rooftop at sunset, coral sky and distant city lights'], ['studio', 'Estúdio de luxo', 'Luxury studio', 'a luxury fragrance studio with an amber-to-coral light gradient and deep cinematic contrast'], ['bedroom', 'Suíte ao entardecer', 'Evening suite', 'an elegant hotel suite at dusk with golden window light and a clean background'], ['citynight', 'Luzes da cidade', 'City lights', 'an elegant city sidewalk at night with warm bokeh lights and cinematic contrast'],
  ],
  footwear: [
    ['beach', 'Orla ao amanhecer', 'Beachfront at sunrise', 'a premium beachfront promenade at sunrise, coral sky, golden rim light and ocean in the distance'], ['track', 'Pista de atletismo', 'Athletics track', 'a professional athletics track at dawn, saturated coral lanes and cinematic golden side light'], ['night', 'Rua urbana à noite', 'City street at night', 'an aspirational city street at night with warm coral neon, wet-looking pavement in the background and dramatic contrast, safe dry walking surface'], ['gym', 'Academia boutique', 'Boutique gym', 'a premium boutique gym with warm directional light and clean contemporary equipment'], ['park', 'Parque na hora dourada', 'Golden-hour park', 'a landscaped park running path at golden hour with warm rim light and rich natural greens'], ['studio', 'Estúdio esportivo premium', 'Premium sports studio', 'a premium sports studio with a coral gradient, sculpted side light and crisp cinematic contrast'],
  ],
  bag: [
    ['office', 'Escritório panorâmico', 'Panoramic office', 'an elegant panoramic office at golden hour with warm coral light'], ['street', 'Avenida de fim de tarde', 'Golden-hour avenue', 'an elegant city avenue at golden hour with warm architectural stone and cinematic contrast'], ['wardrobe', 'Closet de suíte', 'Suite wardrobe', 'an elegant suite wardrobe with soft golden light and clean luxury textures'], ['hallway', 'Hall de hotel', 'Hotel hallway', 'an elegant hotel hallway with warm amber light and deep cinematic contrast'], ['cafe', 'Café de esquina', 'Corner cafe', 'a sophisticated corner cafe terrace at golden hour, uncluttered background and warm coral accents'], ['studio', 'Estúdio editorial', 'Editorial studio', 'a premium editorial studio with a warm coral gradient and sculpted side lighting'],
  ],
  bottle: [
    ['kitchen', 'Cozinha clara', 'Bright kitchen', 'a bright clean kitchen counter'], ['gym', 'Banco da academia', 'Gym bench', 'a tidy gym bench after a workout'], ['picnic', 'Mesa ao ar livre', 'Outdoor table', 'a clean outdoor picnic table in soft daylight'], ['studio', 'Bancada de estúdio', 'Studio counter', 'a neutral studio counter'], ['desk', 'Mesa de trabalho', 'Work desk', 'a tidy home-office desk in daylight'], ['park', 'Pausa no parque', 'Park break', 'a quiet park bench with a plain paved path behind it'],
  ],
  supplement: [
    ['kitchen', 'Bancada da cozinha', 'Kitchen counter', 'a bright clean kitchen counter'], ['gym', 'Perto da bolsa de treino', 'Workout bag corner', 'a clean counter beside a gym bag'], ['studio', 'Estúdio neutro', 'Neutral studio', 'a neutral studio table with soft light'], ['breakfast', 'Mesa de café da manhã', 'Breakfast table', 'a tidy breakfast table in daylight'], ['window', 'Luz da janela', 'Window light', 'a clean worktable beside a large daylight window'], ['bench', 'Banco de treino', 'Workout bench', 'a clean gym bench with an uncluttered background'],
  ],
  tea: [
    ['kitchen', 'Cozinha tranquila', 'Calm kitchen', 'a bright calm kitchen counter'], ['breakfast', 'Mesa do café', 'Breakfast table', 'a tidy breakfast table in morning light'], ['window', 'Perto da janela', 'By the window', 'a clean table beside a daylight window'], ['office', 'Pausa no escritório', 'Office break', 'a clean office break-room counter'], ['studio', 'Bancada neutra', 'Neutral counter', 'a neutral studio counter in warm soft light'], ['corner', 'Cantinho do chá', 'Tea corner', 'a calm home tea table with an uncluttered background'],
  ],
  other: [
    ['table', 'Mesa clara', 'Bright table', 'a bright tidy worktable'], ['studio', 'Estúdio neutro', 'Neutral studio', 'a neutral studio table with soft side light'], ['office', 'Escritório', 'Office', 'a tidy modern office desk'], ['shelf', 'Estante ao fundo', 'Shelf background', 'a clean table with a plain shelf in the background'], ['window', 'Luz da janela', 'Window light', 'a clean table beside a large daylight window'], ['entry', 'Bancada de casa', 'Home counter', 'a bright home entryway counter'],
  ],
}
const ACTION: Record<CenaCategory, string> = {
  wearable: 'keeps the actual watch fitted on their own LEFT wrist, taps its existing control with their own other hand and turns that wrist slightly',
  skincare: 'opens the actual jar, holds it with their own anatomically connected hand and applies a small amount to their own FACE using their own anatomically connected fingertips; the whole real jar remains visible, with no detached hand, extra person or extra arm',
  perfume: 'picks up the actual bottle and sprays once onto their own wrist, away from the face',
  footwear: 'ties the real shoes on their own feet with their own connected hands, then takes two steps',
  bag: 'lifts the actual bag by its real handle and places its existing strap on their own shoulder',
  bottle: 'holds the actual bottle with their own connected hands, opens its existing cap and turns it slightly to show the label, without adding liquid or inventing contents',
  supplement: 'opens the actual container with their own hands and prepares a serving in a shaker, without drinking or claiming a result',
  tea: 'opens the actual tea package with their own hands and prepares tea in an ordinary cup, without drinking on camera',
  other: 'picks up and turns the actual product with their own connected hands to show its real front and side',
}
const xml = (s: string) => s.replace(/[&<>"']/gu, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!))
function illustration(category: CenaCategory, id: string, label: string, n: number): string {
  const colors = ['#f2c7b3', '#e7cfad', '#dcbdad', '#ead0bd', '#e6c3a7', '#d4b6ad']
  const scenes: Record<string, string> = {
    track: '<path d="M0 137h360v72H0z" fill="#b96951"/><path d="M-40 205Q100 100 400 168M-35 230Q100 121 400 190M-20 250Q120 143 400 212" fill="none" stroke="#f8e6d7" stroke-width="3"/><circle cx="66" cy="61" r="22" fill="#ffe4ac"/>',
    gym: '<path d="M22 61v111M105 61v111M22 88h83M22 131h83" stroke="#526375" stroke-width="7"/><path d="M8 87h112M8 130h112" stroke="#8796a5" stroke-width="5"/><path d="M14 76v23M31 76v23M94 76v23M111 76v23" stroke="#364555" stroke-width="9"/>',
    desk: '<rect x="22" y="66" width="89" height="57" rx="5" fill="#415769"/><rect x="28" y="72" width="77" height="43" fill="#d6e7ec"/><path d="M67 123v21M45 145h44M12 151h105v41" fill="none" stroke="#897761" stroke-width="6"/>',
    park: '<path d="M0 135h360v73H0z" fill="#aac0a1"/><path d="M39 77v77M88 62v92" stroke="#947554" stroke-width="9"/><circle cx="39" cy="72" r="27" fill="#688a69"/><circle cx="88" cy="57" r="29" fill="#7d9b71"/><path d="M14 164h104M25 152v36M101 152v36" stroke="#826c54" stroke-width="8"/>',
    poolside: '<path d="M0 131h360v76H0z" fill="#d2c9b5"/><path d="M0 152h103v55H0z" fill="#78b8c6"/><path d="M4 165h95M4 187h95" stroke="#bde2e5" stroke-width="3"/><path d="M80 150v-35q0-16 15-16M98 151v-36q0-9 8-9" fill="none" stroke="#728b96" stroke-width="4"/>',
    studio: '<path d="M39 55l51 23-26 45-51-23z" fill="#f6f4e7" stroke="#8c918a" stroke-width="3"/><path d="M53 113v79M37 192l16-19 17 19" fill="none" stroke="#747c79" stroke-width="4"/><path d="M83 81l52 32-35 68" fill="#ffffff55"/>',
    bathroom: '<path d="M0 61h118M0 91h118M0 121h118M30 39v103M70 39v103M110 39v103" stroke="#d8b8a4" stroke-width="2"/><path d="M8 150h110v36H8z" fill="#f8f1e6"/><path d="M14 138h100" stroke="#b59b80" stroke-width="6"/><rect x="23" y="89" width="35" height="44" rx="4" fill="#fff6e9"/><path d="M29 96h22M29 104h22" stroke="#dfcdb3" stroke-width="3"/>',
    vanity: '<rect x="17" y="124" width="100" height="63" rx="5" fill="#b59a81"/><path d="M20 144h94M57 126v57" stroke="#866d58" stroke-width="3"/><circle cx="38" cy="154" r="3" fill="#ebd6b8"/><circle cx="87" cy="154" r="3" fill="#ebd6b8"/><path d="M31 122V87M16 88h31l-6-25H23z" fill="#eee0bb" stroke="#b0a083" stroke-width="3"/>',
    window: '<rect x="12" y="42" width="109" height="117" rx="5" fill="#bed7dd" stroke="#fff" stroke-width="7"/><path d="M66 45v112M15 98h102" stroke="#fff" stroke-width="6"/><path d="M0 162l112-35 41 74H0z" fill="#ffffff6b"/>',
    diffuse: '<ellipse cx="62" cy="85" rx="63" ry="48" fill="#fff8db"/><path d="M5 148h114v43H5z" fill="#e4ded3"/><path d="M10 140h106" stroke="#faf7eb" stroke-width="10"/><path d="M25 44v17M56 39v18M87 44v17" stroke="#e9d9af" stroke-width="4"/>',
    bedroom: '<rect x="11" y="130" width="108" height="57" rx="8" fill="#b6aea3"/><rect x="17" y="117" width="40" height="24" rx="7" fill="#fff8e9"/><path d="M83 122V89M67 89h32l-6-25H74z" fill="#ead7b2" stroke="#99856c" stroke-width="3"/>',
    evening: '<rect x="13" y="43" width="105" height="112" rx="4" fill="#344359"/><circle cx="82" cy="66" r="15" fill="#e9d5a4"/><path d="M17 146V108h19v38M46 146V91h24v55M80 146v-31h30v31" fill="#617084"/><path d="M2 175h114" stroke="#a58260" stroke-width="9"/>',
    street: '<path d="M0 128h360v80H0z" fill="#b6bab9"/><path d="M12 139V58h38v81M63 139V39h44v100" fill="#96abb2"/><path d="M21 76h19M21 97h19M74 61h22M74 85h22M74 109h22" stroke="#d6e7e8" stroke-width="6"/><path d="M0 176h115" stroke="#e7e9df" stroke-width="5"/>',
    beach: '<path d="M0 104h360v61H0z" fill="#76aeb5"/><path d="M0 144q55-23 117 0t243 0v64H0z" fill="#e6c8a0"/><path d="M0 126q40-9 99 0M0 137q60-9 112 0" fill="none" stroke="#e9f1dc" stroke-width="3"/><circle cx="60" cy="73" r="25" fill="#ffe2a0"/><path d="M12 183h105" stroke="#c19972" stroke-width="5"/>',
    night: '<path d="M0 39h360v167H0z" fill="#29354d"/><path d="M0 143h360v65H0z" fill="#48505c"/><path d="M8 140V56h35v84M59 140V37h49v103" fill="#525c70"/><path d="M16 73h20M16 96h20M70 59h27M70 84h27M70 109h27" stroke="#f4ac85" stroke-width="6"/><path d="M5 169h109M25 188h80" stroke="#d88975" stroke-width="3"/>',
    rooftop: '<path d="M0 39h360v119H0z" fill="#c88a7b"/><circle cx="67" cy="78" r="27" fill="#f8d696"/><path d="M4 153v-35h27v35M41 153v-54h28v54M79 153v-29h31v29" fill="#62576b"/><path d="M0 154h118M7 153v36M108 153v36" stroke="#8c756e" stroke-width="5"/>',
    citynight: '<path d="M0 39h360v168H0z" fill="#28364e"/><path d="M8 152V60h43v92M66 152V42h44v110" fill="#4a4d62"/><path d="M18 78h24M18 104h24M76 65h25M76 91h25M76 117h25" stroke="#d9a773" stroke-width="6"/><circle cx="38" cy="154" r="5" fill="#f4c59b"/><circle cx="91" cy="160" r="7" fill="#e9b48a"/><path d="M0 185h118" stroke="#8a7372" stroke-width="7"/>',
    door: '<rect x="24" y="44" width="76" height="137" rx="3" fill="#ac967e" stroke="#e8e1d3" stroke-width="7"/><circle cx="83" cy="115" r="4" fill="#675e51"/><path d="M8 182h106" stroke="#e1d2bc" stroke-width="12"/>',
    locker: '<rect x="8" y="45" width="104" height="136" rx="4" fill="#8da6aa"/><path d="M42 47v132M78 47v132M17 64h15M52 64h15M87 64h15M17 73h15M52 73h15M87 73h15" stroke="#c6d7d4" stroke-width="3"/>',
    wardrobe: '<rect x="11" y="42" width="101" height="146" rx="4" fill="#bca78b"/><path d="M60 44v142M48 101v23M72 101v23" stroke="#876f55" stroke-width="4"/>',
    hallway: '<path d="M5 188V44h105v144M17 188V56h81v132" fill="none" stroke="#b9b5a9" stroke-width="8"/><path d="M0 191l61-40 62 40" fill="#e4d7bf"/>',
    cafe: '<ellipse cx="61" cy="138" rx="53" ry="12" fill="#aa8769"/><path d="M61 149v42M20 152v37M105 152v37" stroke="#826b56" stroke-width="5"/><path d="M36 128v-20h23v20zM59 110q14 0 9 12h-9" fill="#fff4df" stroke="#b29a78" stroke-width="3"/>',
    picnic: '<path d="M0 135h360v73H0z" fill="#afc2a2"/><path d="M7 139h113M11 162h108M25 141l-9 49M97 141l12 49" stroke="#9c7f5e" stroke-width="7"/><path d="M30 57v69M72 65v60" stroke="#8c785a" stroke-width="6"/><circle cx="30" cy="58" r="23" fill="#7d9a6c"/><circle cx="72" cy="66" r="22" fill="#8daa76"/>',
    breakfast: '<path d="M0 144h121v47H0z" fill="#c4a98b"/><ellipse cx="52" cy="151" rx="34" ry="12" fill="#fff8e7"/><ellipse cx="52" cy="151" rx="25" ry="7" fill="none" stroke="#d6d0bd" stroke-width="2"/><rect x="87" y="115" width="24" height="31" rx="4" fill="#f4e8ce"/>',
    kitchen: '<path d="M0 116h118v76H0z" fill="#bcab94"/><path d="M0 118h120M39 122v66M80 122v66" stroke="#e8dfcd" stroke-width="5"/><path d="M11 48h93v48H11z" fill="#d2c7b4"/><path d="M58 49v45" stroke="#a79880" stroke-width="3"/>',
    shelf: '<path d="M11 69h103M11 111h103M11 155h103" stroke="#9c8468" stroke-width="6"/><path d="M25 44v22M40 39v27M55 47v19M77 87v21M93 82v26M37 131v21" stroke="#7e9186" stroke-width="12"/>',
    corner: '<path d="M10 150h105M25 151v38M102 151v38" stroke="#ab8e6b" stroke-width="7"/><path d="M25 143v-28h38v28zM63 121q19-5 15 12H63" fill="#eee6d5" stroke="#9caa8d" stroke-width="3"/><path d="M39 100q-9-8 0-15t0-15" fill="none" stroke="#bbc8b6" stroke-width="3"/>',
    bench: '<path d="M15 136h94M30 139v50M94 139v50" stroke="#657b80" stroke-width="9"/><path d="M6 79h106M16 63v32M30 63v32M89 63v32M104 63v32" stroke="#536673" stroke-width="7"/>',
    table: '<path d="M8 137h105M25 141v48M99 141v48" stroke="#a58e72" stroke-width="7"/><path d="M28 131l8-29h36l9 29z" fill="#e4ddcd" stroke="#afa58d" stroke-width="2"/><path d="M42 112h21M38 121h30" stroke="#acb4a2" stroke-width="3"/>',
  }
  const background = scenes[id] ?? scenes[id === 'office' ? 'desk' : id === 'bench' ? 'gym' : id === 'entry' ? 'door' : 'window']
  const products: Record<CenaCategory, string> = {
    bag: '<path d="M198 139h58l8 56h-74z" fill="#91785f"/><path d="M210 141v-13a17 17 0 0 1 34 0v13" fill="none" stroke="#6e5742" stroke-width="6"/>',
    wearable: '<rect x="216" y="113" width="23" height="88" rx="8" fill="#5d6570"/><rect x="207" y="137" width="42" height="43" rx="10" fill="#263345"/><rect x="212" y="142" width="32" height="33" rx="7" fill="#aed3c0"/>',
    footwear: '<path d="M186 169l19-29 23 24 39 10v18h-83z" fill="#f5f5f2" stroke="#687482" stroke-width="3"/><path d="M208 151l20 11M203 160l20 11" stroke="#929a9d" stroke-width="3"/>',
    skincare: '<rect x="199" y="150" width="55" height="42" rx="9" fill="#f5f4ee" stroke="#85968d" stroke-width="2"/><rect x="197" y="144" width="59" height="11" rx="4" fill="#425b4e"/><rect x="210" y="164" width="33" height="16" rx="3" fill="#d3dfd7"/>',
    perfume: '<rect x="202" y="143" width="52" height="49" rx="6" fill="#dbc59e" stroke="#9f8d6f" stroke-width="2"/><rect x="217" y="128" width="22" height="16" rx="3" fill="#52635d"/><rect x="214" y="158" width="28" height="19" rx="2" fill="#f5f0df"/>',
    bottle: '<path d="M214 127v-11h27v11l9 15v47h-45v-47z" fill="#a5c6c5" stroke="#6b9393" stroke-width="2"/><rect x="212" y="109" width="31" height="12" rx="3" fill="#415e5f"/><rect x="211" y="150" width="33" height="23" rx="3" fill="#e2efdf"/>',
    supplement: '<rect x="190" y="138" width="46" height="54" rx="7" fill="#eee8dc" stroke="#9cae9e" stroke-width="2"/><rect x="188" y="130" width="50" height="13" rx="3" fill="#465d52"/><path d="M245 147h24l-3 45h-18z" fill="#a3bdc1"/><path d="M245 145h25" stroke="#5f7c83" stroke-width="6"/>',
    tea: '<path d="M190 129h42v64h-42z" fill="#b7c4a1" stroke="#79916d" stroke-width="2"/><path d="M242 163v27h25v-27zM267 168q18-3 13 11h-13" fill="#f5f0dd" stroke="#a9af94" stroke-width="2"/><path d="M251 151q-6-8 0-14" fill="none" stroke="#b4c4aa" stroke-width="2"/>',
    other: '<path d="M199 140l28-12 29 13v47l-29 11-28-11z" fill="#d8c4a4" stroke="#a38f72" stroke-width="2"/><path d="M199 140l28 13 29-12M227 153v46" fill="none" stroke="#ad9677" stroke-width="2"/>',
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240" role="img" aria-label="${xml(label)} — prévia ilustrativa"><rect width="360" height="240" fill="${colors[n % colors.length]}"/>${background}<path d="M119 198h241v10H119z" fill="#b9937f"/><circle cx="159" cy="65" r="16" fill="#bd8a68"/><path d="M140 84q19-8 38 0l7 61h-53z" fill="#405d58"/><path d="M145 146l-4 44M170 146l6 44" fill="none" stroke="#414d58" stroke-width="15" stroke-linecap="round"/><path d="M141 190l-8 7M176 190l10 7" stroke="#f2e9db" stroke-width="10" stroke-linecap="round"/><path d="M139 93l-10 28 22 10M179 93l10 25 20 7" fill="none" stroke="#bd8a68" stroke-width="11" stroke-linecap="round"/>${products[category]}<rect x="13" y="12" width="129" height="19" rx="9" fill="#fff"/><text x="21" y="25" font-family="Arial,sans-serif" font-size="10" fill="#33483d">PRÉVIA ILUSTRATIVA</text><rect x="0" y="208" width="360" height="32" fill="#f8f8f0"/><text x="13" y="228" font-family="Arial,sans-serif" font-size="13" fill="#304239">${xml(label)}</text></svg>`
}
export type CenaEscolhaMusicMood = 'hustle' | 'emotional' | 'nature' | 'tech'
export interface CenaEscolhaScenario { id: string; category: CenaCategory; label: { pt: string; en: string }; setting: string; interaction: string; captionLane: 'top' | 'bottom'; previewSvg: string; musicMood: CenaEscolhaMusicMood }
function musicMood(id: string): CenaEscolhaMusicMood { return ['track', 'gym', 'bench', 'locker', 'night'].includes(id) ? 'hustle' : ['park', 'poolside', 'beach', 'picnic', 'kitchen', 'breakfast', 'corner'].includes(id) ? 'nature' : ['studio', 'desk', 'office'].includes(id) ? 'tech' : 'emotional' }
export const CENA_ESCOLHA_SCENARIOS: readonly CenaEscolhaScenario[] = Object.freeze((Object.keys(ROWS) as CenaCategory[]).flatMap(category => ROWS[category].map(([id, pt, en, setting], n) => Object.freeze({ id: `${category}_${id}`, category, label: { pt, en }, setting: `${setting}; premium aspirational advertising art direction, warm coral or golden-hour light where natural, intentional cinematic contrast, clean uncluttered setting`, interaction: ACTION[category], captionLane: 'top' as const, musicMood: musicMood(id), previewSvg: illustration(category, id, pt, n) }))))
export function escolhaPresenter(id: unknown) { return typeof id === 'string' ? CENA_ESCOLHA_PRESENTERS.find(p => p.id === id) ?? null : null }
export function escolhaScenario(id: unknown): CenaEscolhaScenario | null { return typeof id === 'string' ? CENA_ESCOLHA_SCENARIOS.find(s => s.id === id) ?? null : null }
export function escolhaScenarios(category: unknown): readonly CenaEscolhaScenario[] { return CENA_ESCOLHA_SCENARIOS.filter(s => s.category === category) }
export function escolhaPreviewDataUrl(id: unknown, language: 'pt' | 'en' = 'pt'): string {
  const scene = escolhaScenario(id)
  if (!scene) return ''
  const svg = language === 'en' ? scene.previewSvg.replaceAll(xml(scene.label.pt), xml(scene.label.en)).replaceAll('PRÉVIA ILUSTRATIVA', 'ILLUSTRATIVE PREVIEW').replaceAll('prévia ilustrativa', 'illustrative preview') : scene.previewSvg
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
