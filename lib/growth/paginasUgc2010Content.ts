// KINEO-PAGINAS-UGC-2010 — o TEXTO das páginas do AI UGC Ads (pilar EN/PT, gerador, 12 nichos) e do Kit Black Friday (EN/PT).
//
// Regras do texto (conferidas pelo guardião scripts/test-paginas-ugc-2010.mjs):
//   · nenhum número de crédito ou dólar digitado: tudo que custa vem de `facts` (lib/growth/paginasUgc2010Facts.ts, que lê as
//     funções que cobram: adsV2Credits, getTierPrice, UGC_CREATOR_LINE);
//   · o apresentador NUNCA fala como cliente (lib/ads/v2Brief.ts: sem "I bought / I use / my skin", sem antes/depois) e não
//     pede ao espectador para cheirar/sentir (ADS_V2_PRESENTER_TALK_RULE) — os roteiros de exemplo seguem a mesma régua e têm
//     17 a 21 palavras, a faixa do apresentador v2 num anúncio de ~15 s (adsV2PresenterV2Words);
//   · produto dos exemplos = fictício, e a página diz isso; nada de nota, contagem de cliente, depoimento ou "#1";
//   · cada nicho tem ângulo, pergunta do comprador, formatos, roteiro, fotos, cuidado e FAQ PRÓPRIOS (similaridade baixa).
//
// MÓDULO PURO (só `import type`, apagado na transpilação): roda cru no guardião.
import type { UgcNicheSlug } from '../seo/paginasUgc2010'

/** Os números que as páginas mostram — SEMPRE calculados por quem chama (nunca digitados aqui). */
export type UgcFacts = {
  /** Créditos do anúncio UGC (o apresentador v2 vive no nível Comercial) por duração. */
  ugcCredits: { s15: number; s20: number; s30: number }
  /** Créditos do anúncio de 15 s no nível mais barato (cada variação do Kit Black Friday parte daqui). */
  minAdCredits15: number
  /** Preço mensal do plano de entrada, já formatado (o Studio Ads está em todo plano pago). */
  starterPrice: string
  /** O mesmo preço só com o número ("9.90"), para o Offer do JSON-LD. */
  starterPriceAmount: string
  /** A amostra grátis com a pessoa está no ar? (ADS_SAMPLE_LIVE + ADS_SAMPLE_PRESENTER_LIVE + ADS_V2_PRESENTER_PUBLIC) */
  freeUgcLive: boolean
  sampleSeconds: number
  /** Cadastro sem cartão? (lib/entryPolicy.ts CARD_ENTRY_ONLY) — o "sem cartão" só aparece se for verdade. */
  noCard: boolean
  narrationLanguages: number
  minPhotos: number
  maxPhotos: number
  /** A frase de mercado do criador UGC humano, com a fonte (lib/ads/ugcComparison.ts). */
  creatorLine: string
  /** A mesma frase em português (mesmos números, lib/ads/ugcComparison.ts UGC_CREATOR_PRICE_USD). */
  creatorLinePt: string
  creatorSource: string
  /** Quantas variações o kit oferece (lib/ads/v2KitBf.ts ADS_V2_KIT_BF_COUNTS) e o teto do campo Oferta. */
  kitCounts: readonly number[]
  offerMax: number
  /** O Kit Black Friday À VENDA (lib/ads/kitBfSale.ts, KINEO-KIT-BF-VENDA-2010): null = venda fechada (o texto volta ao "a partir de"). */
  kitSale: null | { price: string; credits: number; ads: number; perAd: number; saleEndsEn: string; saleEndsPt: string; accessUntilEn: string; accessUntilPt: string; includedPlan: string }
}

export type UgcQa = { q: string; a: string }
export type UgcPresenterId = 'sofia' | 'amara' | 'rahul' | 'kenji'

export type UgcNiche = {
  slug: UgcNicheSlug
  /** Nome curto (menu, links e llms). */
  name: string
  title: string
  description: string
  h1: string
  intro: string
  angle: { heading: string; body: string }
  shopperQuestion: string
  formats: readonly { name: string; why: string }[]
  script: { presenter: UgcPresenterId; product: string; lines: readonly string[] }
  photos: string
  check: string
  faqs: readonly UgcQa[]
  related: readonly UgcNicheSlug[]
}

export const UGC_NICHES: Readonly<Record<UgcNicheSlug, UgcNiche>> = {
  'beauty-skincare': {
    slug: 'beauty-skincare',
    name: 'Skincare & beauty',
    title: 'AI UGC Ads for Skincare & Beauty Brands | Kineo',
    description: 'An AI presenter holds your serum or cream and says where it fits in a routine. Vertical UGC-style ads from your product photos, no fake before/after.',
    h1: 'AI UGC ads for skincare and beauty brands',
    intro: 'Skincare shoppers scroll past glossy studio shots and stop for a person holding the bottle. Kineo puts your real packaging in the hands of an AI presenter who says what the product is, who it suits and where it goes in a routine.',
    angle: {
      heading: 'Lead with the routine step, not the miracle',
      body: 'Beauty ads that keep attention name one moment of the routine (the morning serum, the last step before makeup) and one ingredient the label actually lists. Medical words such as "cures" or "treats acne" get ads rejected; the script only uses the facts you give it, so leave those out of your brief.',
    },
    shopperQuestion: 'Will this suit my skin type, and where does it go in my routine?',
    formats: [
      { name: 'Routine slot', why: 'The presenter places the product in a morning or night routine, which is easy to follow on a phone.' },
      { name: 'Ingredient spotlight', why: 'One ingredient from your label, one cosmetic benefit, one line on who it is for.' },
      { name: 'Texture cut-ins', why: 'Your own photos of the texture or shade cut in between the presenter lines, so the color stays true.' },
    ],
    script: { presenter: 'amara', product: 'Lumen, a vitamin C serum', lines: ['Meet Lumen, a vitamin C serum.', 'Two drops after cleansing, before sunscreen, for brighter-looking mornings.', 'Tap to get yours.'] },
    photos: 'The bottle or jar with the label readable, one photo of the texture on a clean surface, and the box if it carries the brand.',
    check: 'Compare the label in the presenter shot with your real packaging, and keep claims cosmetic (brighter-looking, hydrated) unless you can document more.',
    faqs: [
      { q: 'Can the presenter say the serum cleared her skin?', a: 'No. The presenter is not a customer, and Kineo never writes first-person results, before-and-after lines or "I use it every day". That also keeps the ad clear of platform rules on health claims.' },
      { q: 'Which presenter fits a beauty brand?', a: 'Amara is the presenter tagged for beauty; Sofia reads more casual. Pick one, or let Kineo choose, and switch on the next ad.' },
    ],
    related: ['perfume', 'baby-products'],
  },
  perfume: {
    slug: 'perfume',
    name: 'Perfume & fragrance',
    title: 'AI UGC Ads for Perfume & Fragrance Brands | Kineo',
    description: 'A fragrance cannot be smelled through a phone. An AI presenter holds your bottle and names the notes and the occasion. Vertical ads from your photos.',
    h1: 'AI UGC ads for perfume and fragrance',
    intro: 'A fragrance cannot be smelled through a screen, so the ad has to sell the bottle, the occasion and the person holding it. Kineo’s AI presenter holds your real bottle and names the notes and the moment it is made for.',
    angle: {
      heading: 'Sell the notes and the occasion, never "smell this"',
      body: 'Kineo’s presenter rule forbids sensory instructions (no "smell this", "close your eyes" or "let it wrap around you") because they read as fake on camera. Fragrance ads land better naming the notes from your product card, the occasion (office, evening, gift) and the bottle size.',
    },
    shopperQuestion: 'What does it smell like, and when would I wear it?',
    formats: [
      { name: 'Notes in one sentence', why: 'Top, heart and base notes taken from your description and said once, plainly.' },
      { name: 'Gift for the season', why: 'The presenter frames the bottle as a present; your logo closes the ad.' },
      { name: 'Bottle hero', why: 'Your bottle photos alternate with the presenter, so the label and the cap stay exactly as they are.' },
    ],
    script: { presenter: 'sofia', product: 'Noir 9, an eau de parfum', lines: ['This is Noir 9, an amber and vanilla eau de parfum for evenings out.', 'Fifty milliliters, ready to gift.', 'Find yours.'] },
    photos: 'The bottle upright with the cap on and the name readable, plus the box. A photo on a dressing table or in a hand helps the presenter shot get the scale right.',
    check: 'Make sure the bottle size and cap shape in the presenter shot match yours; a generated hand can make a bottle look bigger or smaller.',
    faqs: [
      { q: 'Why does the presenter not ask people to smell it?', a: 'Lines like "smell this" or "close your eyes" sound staged when an AI presenter says them, so Kineo’s script rules leave them out. The ad names the notes and the occasion instead.' },
      { q: 'Can I name the notes and the concentration?', a: 'Yes. Notes, concentration (eau de parfum, eau de toilette) and size come from your sentence or product link. Kineo does not invent notes you did not give it.' },
    ],
    related: ['beauty-skincare', 'jewelry'],
  },
  supplements: {
    slug: 'supplements',
    name: 'Supplements',
    title: 'AI UGC Ads for Supplement Brands | Kineo',
    description: 'An AI presenter holds your tub or bottle and says what is in it and how to take it. No testimonials or cure claims. Vertical ads from your label photos.',
    h1: 'AI UGC ads for supplement brands',
    intro: 'Supplement ads live or die on compliance. Kineo’s presenter holds your real tub or bottle and says what is in it, how to take it and who it is for, and nothing your label does not support.',
    angle: {
      heading: 'Say what is in the scoop, never what it cures',
      body: 'Ad platforms restrict health claims for supplements, and in the US the FTC treats "it worked for me" as a claim you must be able to prove. Kineo’s presenter never speaks as a customer, so the strongest honest angle is the formula itself: serving size, main ingredient, flavor and when to take it.',
    },
    shopperQuestion: 'What is in it, how do I take it, and is it for someone like me?',
    formats: [
      { name: 'Label walk-through', why: 'Main ingredient and serving size, read from your supplement facts panel.' },
      { name: 'Daily ritual', why: 'Morning shake, scoop before training or capsule at night: the presenter places it in a day.' },
      { name: 'Flavor and format', why: 'Powder, gummy or capsule, and the flavor names you actually sell.' },
    ],
    script: { presenter: 'rahul', product: 'Daily Green, a greens powder', lines: ['Here’s Daily Green, a greens powder with spinach and spirulina.', 'One scoop in water each morning.', 'Order your first tub today.'] },
    photos: 'The front label and the supplement facts panel, both readable; a photo of the scoop or capsule; the tub next to a glass for scale.',
    check: 'Take disease, weight-loss and "clinically proven" claims out of your brief unless you hold the evidence, and check local rules for supplement ads before you run them.',
    faqs: [
      { q: 'Can the ad say the product helps you lose weight?', a: 'Kineo only writes what your brief states, and it never adds results, ratings or testimonials. Platforms review weight-loss claims closely, so leave them out unless you can prove them.' },
      { q: 'Does Kineo check that my claims are allowed?', a: 'No. Kineo keeps to the facts you give it and reminds you to label the AI presenter when you post, but compliance with health and advertising rules stays with the brand.' },
    ],
    related: ['fitness', 'food-beverage'],
  },
  fashion: {
    slug: 'fashion',
    name: 'Fashion & apparel',
    title: 'AI UGC Ads for Clothing & Fashion Brands | Kineo',
    description: 'An AI presenter shows your garment and gives one styling idea, while your own photos show fit and fabric. Vertical UGC-style ads with no model shoot.',
    h1: 'AI UGC ads for clothing and fashion brands',
    intro: 'Clothes are bought on fit and fabric, and a model shoot for every drop is slow and expensive. Kineo turns your product photos into a presenter ad: an AI person holds the piece and says what it is made of and how to wear it.',
    angle: {
      heading: 'One piece, one way to wear it',
      body: 'Fashion UGC that sells shows a single item with a single styling idea: a linen shirt for warm evenings, a puffer for the commute. The presenter holds the garment while your flat-lay and on-model photos cut in, so the cut, color and print stay accurate.',
    },
    shopperQuestion: 'How does it fit, and what do I wear it with?',
    formats: [
      { name: 'Styling tip', why: 'The presenter suggests one outfit pairing for the piece.' },
      { name: 'Fabric callout', why: 'Material and care instructions from your product page, said in plain words.' },
      { name: 'Size-guide nudge', why: 'The presenter points viewers to your size guide, a frequent reason shoppers hesitate.' },
    ],
    script: { presenter: 'sofia', product: 'the Harbor linen shirt', lines: ['Meet the Harbor linen shirt, cut loose for warm evenings.', 'Wear it open over a tee or buttoned.', 'Shop it today.'] },
    photos: 'A flat-lay of the garment, one photo on a model or a hanger, and a close-up of the fabric or print.',
    check: 'A generated hand can change how a garment drapes; compare color, print and length with your real photos before posting.',
    faqs: [
      { q: 'Can the presenter wear my clothes?', a: 'Not today. The presenter method was approved for a product held in the hand, so the presenter holds or shows the piece; your own on-model photos cut in to show the fit.' },
      { q: 'Can I get a 4:5 version for the feed?', a: 'Presenter ads come out vertical 9:16 for Reels, TikTok and Stories. For a 4:5 feed version, use the photo-based product ad in Studio Ads.' },
    ],
    related: ['jewelry', 'fitness'],
  },
  jewelry: {
    slug: 'jewelry',
    name: 'Jewelry & watches',
    title: 'AI UGC Ads for Jewelry & Watch Brands | Kineo',
    description: 'Jewelry is tiny on a phone. An AI presenter holds your piece for scale and names the metal and stone from your listing. Vertical ads from your photos.',
    h1: 'AI UGC ads for jewelry and watches',
    intro: 'Jewelry looks tiny on a phone screen, so the hand matters: a presenter holding the ring box or the watch gives viewers a sense of scale. Kineo builds that ad from your own product photos.',
    angle: {
      heading: 'Scale and material first',
      body: 'Shoppers want to know how big the piece is and what it is made of. Lead with the metal and stone exactly as your listing names them, show the piece in a hand for scale, and keep words like "solid gold" or "diamond" to what you can certify.',
    },
    shopperQuestion: 'How big is it, and is it real silver or gold?',
    formats: [
      { name: 'In-hand scale', why: 'The presenter holds the piece near the face or in the palm, so its size reads on a small screen.' },
      { name: 'Gift-box moment', why: 'The box and the piece together, presented as a gift.' },
      { name: 'Material callout', why: 'Metal, plating and stone named word for word from your listing.' },
    ],
    script: { presenter: 'kenji', product: 'the Orbit steel watch', lines: ['This is the Orbit steel watch, sapphire glass and a forty-millimeter case.', 'Built for daily wear.', 'See all straps today.'] },
    photos: 'Sharp close-ups on a plain background, the piece on a wrist, hand or neck for scale, and the gift box.',
    check: 'Small details (prongs, engraving, the clasp, the dial) are where generated images drift most, so zoom into the presenter shot before posting.',
    faqs: [
      { q: 'Will the AI keep the stone and the setting exact?', a: 'The presenter shot is made from your photos, but small details can drift; your real close-ups cut in to show the true piece. Review the ad before you post it.' },
      { q: 'Does it work for watches as well as jewelry?', a: 'Yes. Case size, glass and strap material come from your listing, and Kenji or Rahul suit a watch ad as well as Sofia or Amara suit a necklace.' },
    ],
    related: ['fashion', 'perfume'],
  },
  'pet-products': {
    slug: 'pet-products',
    name: 'Pet products',
    title: 'AI UGC Ads for Pet Product Brands | Kineo',
    description: 'An AI presenter holds your treat bag, toy or grooming tool and names the pet problem it solves. Your own pet photos cut in. Vertical UGC-style ads.',
    h1: 'AI UGC ads for pet product brands',
    intro: 'Pet owners trust someone who seems to know animals. Kineo’s AI presenter holds your treat bag, toy or grooming tool and explains what it is for, while your own photos of pets cut in between the lines.',
    angle: {
      heading: 'Name the pet problem the product solves',
      body: 'Chewed shoes, muddy paws, a picky eater: pet ads work when the first line names a moment owners recognize, then shows the product as the fix. Leave "vet approved" out unless a vet really backs it.',
    },
    shopperQuestion: 'Will my dog or cat actually use it, and is it safe?',
    formats: [
      { name: 'Problem, then fix', why: 'The first line names the daily annoyance; the presenter answers it with the product.' },
      { name: 'Breed and size fit', why: 'Which sizes, breeds or weights the product fits, taken from your listing.' },
      { name: 'Treat ingredients', why: 'The main protein and what the recipe leaves out, read from your bag.' },
    ],
    script: { presenter: 'rahul', product: 'PawRinse, a portable paw cleaner', lines: ['Muddy paws after every walk?', 'Meet PawRinse, a portable paw cleaner that clips to the leash.', 'Grab one today.'] },
    photos: 'The product alone, the packaging, and, if you have them, photos of a real pet with the product.',
    check: 'The presenter shot shows a person, not an animal. If a pet matters to the story, upload your own pet photos so a real animal appears.',
    faqs: [
      { q: 'Can the AI presenter hold my dog?', a: 'No. The presenter holds products. Upload real photos of pets with the product and they cut in between the presenter lines.' },
      { q: 'Can I say the product is vet recommended?', a: 'Only if it is true and you put it in your brief. Kineo never adds endorsements, ratings or reviews on its own.' },
    ],
    related: ['home-decor', 'baby-products'],
  },
  'home-decor': {
    slug: 'home-decor',
    name: 'Home & decor',
    title: 'AI UGC Ads for Home & Decor Brands | Kineo',
    description: 'An AI presenter holds your vase, candle or organizer and says the size and the room it is for. Your styled photos cut in. Vertical ads, no shoot.',
    h1: 'AI UGC ads for home and decor brands',
    intro: 'Home products sell on how they look in a real room. Kineo’s presenter holds the vase, the lamp or the organizer and says which spot it is made for, while your styled room photos cut in to show it in place.',
    angle: {
      heading: 'One spot in the house, one change',
      body: 'Decor ads that work pick a single spot (the entry table, the bathroom shelf) and say what the product changes there: more storage, warmer light, less clutter. Saying the dimensions in the script also saves returns.',
    },
    shopperQuestion: 'Will it fit my space and match my style?',
    formats: [
      { name: 'Dimensions up front', why: 'Height and width said plainly so buyers can picture the piece at home.' },
      { name: 'Styled room cut-ins', why: 'Your lifestyle photos alternate with the presenter.' },
      { name: 'The set', why: 'Two or three pieces shown together and named as a set.' },
    ],
    script: { presenter: 'sofia', product: 'the Dune ceramic vase', lines: ['This is the Dune vase, thirty centimeters of ceramic in sand or charcoal.', 'Made for a bare shelf.', 'Shop both colors.'] },
    photos: 'The product on a white background, one styled room photo, and a photo next to a hand or a common object for scale.',
    check: 'Check that the size reads correctly in the presenter shot; a generated hand can make a vase look smaller or larger than it is.',
    faqs: [
      { q: 'Can the ad show the product in a customer’s home?', a: 'Use your own lifestyle photos for that. The presenter shot is a generated person holding the product, and Kineo never presents it as a customer or a customer’s home.' },
      { q: 'Can I advertise several colors at once?', a: 'One ad presents one product. Name the colors in your sentence, or make one ad per color from that color’s photos.' },
    ],
    related: ['coffee-tea', 'pet-products'],
  },
  'electronics-gadgets': {
    slug: 'electronics-gadgets',
    name: 'Electronics & gadgets',
    title: 'AI UGC Ads for Electronics & Gadget Brands | Kineo',
    description: 'An AI presenter holds your charger, earbuds or tool and says the one spec that matters, from your listing. Vertical UGC-style ads from your photos.',
    h1: 'AI UGC ads for electronics and gadgets',
    intro: 'Gadget buyers want the one spec that matters and a sense of size. Kineo’s presenter holds your earbuds, charger or tool and names the feature from your listing, nothing more.',
    angle: {
      heading: 'One spec, in plain words',
      body: '"Thirty-hour battery" beats a list of five features. Pick the number from your spec sheet that answers the buyer’s main worry, have the presenter say it once, and let your product photos show the ports and buttons accurately.',
    },
    shopperQuestion: 'Does it work with my phone, and how long does the battery last?',
    formats: [
      { name: 'The spec in one line', why: 'Battery, wattage or range: the single number that sells, said once.' },
      { name: 'Compatibility check', why: 'Which phones, laptops or ports it works with, from your listing.' },
      { name: 'What is in the box', why: 'Cable, case and adapters named, so there are no surprises at delivery.' },
    ],
    script: { presenter: 'kenji', product: 'Volt Mini, a pocket charger', lines: ['Meet Volt Mini, a sixty-five watt charger that fits in a pocket and powers a laptop.', 'Order yours today.'] },
    photos: 'Product photos from the front and the side that show ports and buttons, the box, and one photo of the device in use.',
    check: 'A generated hand can blur ports and logos on small devices; compare the presenter shot with your photos and leave out specs you cannot document.',
    faqs: [
      { q: 'Can the presenter demo the gadget working?', a: 'The presenter holds it and talks to the viewer. To show it working, add your own in-use photos or a short clip of yours in Studio Ads.' },
      { q: 'Will Kineo invent features?', a: 'No. The script uses only what your sentence or product link says; a spec you did not give is simply left out.' },
    ],
    related: ['fitness', 'home-decor'],
  },
  fitness: {
    slug: 'fitness',
    name: 'Fitness gear',
    title: 'AI UGC Ads for Fitness Gear Brands | Kineo',
    description: 'An AI presenter holds your bands, bottle or mat and says which workout it is for. No transformation stories. Vertical UGC-style ads from your photos.',
    h1: 'AI UGC ads for fitness gear',
    intro: 'Fitness gear is bought by people picturing themselves training with it. Kineo’s AI presenter holds your resistance bands, bottle or mat and says which workout it is for, without invented transformation stories.',
    angle: {
      heading: 'The workout, not the transformation',
      body: 'Before-and-after bodies and "lost ten kilos" stories are what platforms flag first, and Kineo never writes them. Gear ads that run cleanly name the workout, the space it needs and the range of resistance or sizes.',
    },
    shopperQuestion: 'Is it good for home workouts at my level?',
    formats: [
      { name: 'Small-space workout', why: 'How much room it needs and which exercises it covers.' },
      { name: 'Level range', why: 'Beginner to advanced, light to heavy, from your product facts.' },
      { name: 'What the set includes', why: 'Number of bands, handles or accessories, so the bundle is clear.' },
    ],
    script: { presenter: 'rahul', product: 'Loop Bands, a resistance band set', lines: ['Here are the Loop Bands, five resistance levels for a full workout in a small apartment.', 'Start training today.'] },
    photos: 'The full set laid out, a close-up of the level markings, and one photo of the gear in use.',
    check: 'Leave body-result and weight-loss claims out, and check that the number of pieces in the presenter shot matches your set.',
    faqs: [
      { q: 'Can the ad show a fitness transformation?', a: 'No. Kineo does not write before-and-after or personal-result lines, and the presenter never speaks as someone who trained with the product.' },
      { q: 'Which presenter suits fitness gear?', a: 'Rahul and Sofia read naturally for home workouts. The full list of available presenters is on the AI UGC Ads page.' },
    ],
    related: ['supplements', 'fashion'],
  },
  'food-beverage': {
    slug: 'food-beverage',
    name: 'Food & drinks',
    title: 'AI UGC Ads for Food & Beverage Brands | Kineo',
    description: 'An AI presenter holds your pack and says the flavors and the occasion, with label facts copied exactly. Vertical UGC-style ads from your photos.',
    h1: 'AI UGC ads for food and beverage brands',
    intro: 'Food and drink ads need the pack to look exactly like the one on the shelf. Kineo’s presenter holds your real jar, can or bag and says the flavor, the size and the moment of the day it fits.',
    angle: {
      heading: 'Flavor first, occasion second, label exact',
      body: 'Snack and drink ads that work name the flavor in the first line and an occasion in the second: lunchbox, game night, after a run. Allergen, vegan or "no added sugar" wording must match your label exactly; Kineo copies only what you provide.',
    },
    shopperQuestion: 'Which flavors are there, and what is in it?',
    formats: [
      { name: 'Flavor lineup', why: 'Every flavor named, with your photos of each pack cutting in.' },
      { name: 'Occasion', why: 'One moment of the day the product is made for.' },
      { name: 'Label facts', why: 'Protein, sugar or vegan claims from your packaging, word for word.' },
    ],
    script: { presenter: 'amara', product: 'Crunch Lab chickpea crisps', lines: ['Meet Crunch Lab chickpea crisps, in sea salt and smoky paprika.', 'Baked, not fried, for the lunchbox.', 'Try both flavors.'] },
    photos: 'The front of the pack with the flavor readable, the nutrition panel, and one serving photo.',
    check: 'Check the logo, the flavor name and the allergen line in the presenter shot against your real pack; small label text is where images drift.',
    faqs: [
      { q: 'Can the presenter eat or drink the product on camera?', a: 'Not today. The presenter holds the product and talks to the viewer; your own serving photos cut in for the close-up of the food.' },
      { q: 'Can I mention a promotion?', a: 'Yes, if it is in your sentence. For Black Friday offers with a badge on screen and several variations, see the Black Friday kit.' },
    ],
    related: ['coffee-tea', 'supplements'],
  },
  'baby-products': {
    slug: 'baby-products',
    name: 'Baby products',
    title: 'AI UGC Ads for Baby Product Brands | Kineo',
    description: 'An AI presenter holds your bottle, carrier or cream and states the age range and certifications you hold. Calm, factual vertical ads from your photos.',
    h1: 'AI UGC ads for baby product brands',
    intro: 'Parents read every line before they buy for a baby. Kineo’s presenter holds your bottle, carrier or cream and explains what it is for and from what age, in a calm and factual tone.',
    angle: {
      heading: 'Age range and safety facts, never scare tactics',
      body: 'Baby product ads perform with the age range, the material and the certifications you actually hold, such as BPA-free or a named safety standard. Kineo writes only those facts and never adds "pediatrician recommended" on its own.',
    },
    shopperQuestion: 'Is it safe, and from what age can I use it?',
    formats: [
      { name: 'Age and stage', why: 'Newborn, six months, toddler: the age range from your packaging.' },
      { name: 'Material and certification', why: 'What it is made of and the marks printed on your box.' },
      { name: 'Gift for new parents', why: 'Baby shower and newborn gifts, presented plainly.' },
    ],
    script: { presenter: 'sofia', product: 'the Nest baby bottle', lines: ['This is the Nest bottle, anti-colic and BPA-free, for newborns up to twelve months.', 'Dishwasher safe.', 'Order a set today.'] },
    photos: 'The product and its packaging with certification marks readable. No photos of real babies are needed.',
    check: 'Make sure the certification marks in the presenter shot match your packaging, and keep safety claims to what you can document.',
    faqs: [
      { q: 'Will the ad show a baby?', a: 'No. The presenter is an adult holding the product. If you want a baby in the ad, use your own photos, with the parents’ permission.' },
      { q: 'Can the presenter talk like a parent who used it?', a: 'No. The presenter never speaks as a customer ("my baby loved it"), which keeps the ad clear of fake-testimonial rules.' },
    ],
    related: ['beauty-skincare', 'pet-products'],
  },
  'coffee-tea': {
    slug: 'coffee-tea',
    name: 'Coffee & tea',
    title: 'AI UGC Ads for Coffee & Tea Brands | Kineo',
    description: 'An AI presenter holds your bag or tin and says the origin, roast and brew method, like a barista tip. Vertical UGC-style ads from your photos.',
    h1: 'AI UGC ads for coffee and tea brands',
    intro: 'Coffee and tea brands compete on origin and ritual. Kineo’s presenter holds your bag or tin and says where it comes from, how it is roasted or blended and how to brew it.',
    angle: {
      heading: 'Origin, roast, brew method',
      body: 'Specialty buyers look for three facts: where it is from, how it is roasted or blended, and how to brew it. A presenter saying those over your real bag sounds like a barista’s tip; keep the tasting notes to the ones printed on your label.',
    },
    shopperQuestion: 'What does it taste like, and how should I brew it?',
    formats: [
      { name: 'Origin in a line', why: 'Farm, region or estate, said once, from your bag.' },
      { name: 'Brew guide', why: 'Grind, ratio or steeping time taken from your brewing card.' },
      { name: 'Subscription pitch', why: 'The presenter mentions your subscription, if you offer one.' },
    ],
    script: { presenter: 'kenji', product: 'Altura, a single-origin coffee', lines: ['Here’s Altura, a medium roast from Huila, Colombia, with notes of cocoa and orange.', 'Best as pour-over.', 'Order a bag today.'] },
    photos: 'The front of the bag with the origin readable, beans or leaves in a bowl, and the brewing gear you recommend.',
    check: 'Keep tasting notes and certifications (organic, fair trade) to exactly what is printed on your bag.',
    faqs: [
      { q: 'Can the ad show the coffee being brewed?', a: 'Your own brewing photos or clips can cut in; the presenter holds the bag and talks to the viewer.' },
      { q: 'Does it work for tea brands too?', a: 'Yes. Swap the roast for the blend and the steeping time; the script follows the facts you type.' },
    ],
    related: ['food-beverage', 'home-decor'],
  },
}

export const ugcScriptWords = (lines: readonly string[]) => lines.join(' ').split(/\s+/).filter(Boolean).length

// ── a pilar (EN e PT) ───────────────────────────────────────────────────────────────────────────────────────────────
export type UgcLang = 'en' | 'pt'
export type UgcPillarCopy = {
  title: string
  description: string
  eyebrow: string
  h1: string
  lead: string
  ctaFree: string
  ctaPaid: string
  ctaNote: string
  videoCaption: string
  summaryHeading: string
  summary: readonly string[]
  stepsHeading: string
  steps: readonly { title: string; body: string }[]
  facesHeading: string
  facesIntro: string
  faceTag: Record<string, string>
  voiceLabel: string
  examplesHeading: string
  examplesIntro: string
  examples: readonly { title: string; caption: string }[]
  rulesHeading: string
  rules: readonly string[]
  nichesHeading: string
  nichesIntro: string
  costHeading: string
  cost: readonly string[]
  notBestHeading: string
  notBest: readonly string[]
  faqHeading: string
  faqs: readonly UgcQa[]
  relatedHeading: string
  closingHeading: string
  closingText: string
  howToName: string
  reviewed: string
}

const FREE_ON = (f: UgcFacts) => f.freeUgcLive

export function ugcPillarCopy(lang: UgcLang, f: UgcFacts): UgcPillarCopy {
  if (lang === 'pt') {
    return {
      title: 'Anúncios UGC com IA: uma pessoa segura seu produto | Kineo',
      description: 'Uma pessoa de IA segura o seu produto e conta por que comprar, em anúncios verticais feitos com as suas fotos. O 1º anúncio UGC é grátis.',
      eyebrow: 'Anúncios UGC com IA',
      h1: 'Anúncios UGC com IA: uma pessoa de IA segura o seu produto e conta por que comprar',
      lead: `Envie as fotos do produto e uma frase sobre ele. O Kineo cria uma pessoa de IA segurando o seu produto, escreve um roteiro curto de apresentador e entrega um anúncio vertical com voz sincronizada, as suas fotos, música e o seu logo no fim.`,
      ctaFree: 'Fazer meu 1º anúncio UGC grátis',
      ctaPaid: 'Fazer meu anúncio UGC',
      ctaNote: FREE_ON(f) ? `1 anúncio grátis por conta · ${f.sampleSeconds} s · marca-d'água discreta${f.noCard ? ' · sem cartão' : ''}` : 'Incluído nos planos pagos do Studio Ads.',
      videoCaption: 'Resultado real do Studio Ads (17/10/2026): apresentadora de IA segurando um perfume. A voz é em português; aqui toca sem som.',
      summaryHeading: 'Em resumo',
      summary: [
        'Anúncio UGC ("conteúdo gerado pelo usuário") é o formato que parece gravado no celular por uma pessoa comum. No Kineo, quem aparece é um apresentador de IA, nunca um cliente de verdade, e o anúncio sai com o aviso de que foi feito com IA.',
        `Você manda de ${f.minPhotos} a ${f.maxPhotos} fotos reais do produto e uma frase (ou o link). O apresentador segura o seu produto, fala o que ele é, para quem é e por que comprar agora, e as suas fotos entram entre as falas.`,
        FREE_ON(f) ? `O primeiro anúncio UGC é grátis (1 por conta, ${f.sampleSeconds} s, com marca-d'água). Depois, um anúncio de 15 s usa ${f.ugcCredits.s15} créditos de qualquer plano pago.` : `Um anúncio de 15 s usa ${f.ugcCredits.s15} créditos de qualquer plano pago.`,
      ],
      stepsHeading: 'Como funciona, em 3 passos',
      steps: [
        { title: 'Mostre o produto', body: `Uma frase sobre o produto (ou o link da loja), o seu logo e de ${f.minPhotos} a ${f.maxPhotos} fotos reais. O roteiro usa só os fatos que você der.` },
        { title: 'Escolha quem apresenta', body: 'Escolha um dos apresentadores aprovados ou deixe o Kineo escolher. Você vê o plano e o roteiro antes de qualquer cobrança: planejar é grátis.' },
        { title: 'Receba o anúncio', body: 'O apresentador fala com voz sincronizada, as suas fotos entram entre as falas, com música por baixo e o seu logo no final. Baixe o MP4 vertical e poste onde quiser.' },
      ],
      facesHeading: 'Os apresentadores disponíveis',
      facesIntro: 'Cada um tem rosto e voz próprios, aprovados pelo nosso time depois de testes reais. Ouça a voz antes de escolher.',
      faceTag: { casual: 'Casual', beauty: 'Beleza', business: 'Negócios', fitness: 'Fitness', home: 'Casa' },
      voiceLabel: 'Ouvir a voz',
      examplesHeading: 'Resultados reais',
      examplesIntro: 'Saídas reais do Studio Ads e do motor de apresentador. Nada aqui é maquete.',
      examples: [
        { title: 'Anúncio com apresentadora · perfume', caption: 'Pedido real de 17/10/2026, voz em português (aqui sem som).' },
        { title: 'Sofia · trecho do motor', caption: 'Clipe de 4 s feito pelo próprio motor de apresentador.' },
        { title: 'Amara · trecho do motor', caption: 'Clipe de 4 s feito pelo próprio motor de apresentador.' },
      ],
      rulesHeading: 'O que o apresentador fala (e o que nunca fala)',
      rules: [
        'Fala COM quem assiste: o que é o produto, o principal benefício, para quem é e por que comprar agora.',
        'Nunca finge ser cliente: nada de "eu comprei", "eu uso", "minha pele" nem antes e depois.',
        'Nunca pede para cheirar, sentir ou fechar os olhos: no vídeo isso soa falso.',
        'Usa só os fatos que você deu: nenhuma nota, número de clientes ou prêmio inventado.',
        'TikTok, Meta e YouTube pedem que pessoas realistas feitas com IA sejam rotuladas: ao postar, ligue o rótulo de IA da plataforma.',
      ],
      nichesHeading: 'Anúncios UGC por nicho (páginas em inglês)',
      nichesIntro: 'Cada nicho tem o seu ângulo, um roteiro de exemplo e os formatos que funcionam nele.',
      costHeading: 'Quanto custa',
      cost: [
        FREE_ON(f) ? `O primeiro anúncio UGC é grátis: 1 por conta, ${f.sampleSeconds} s, com marca-d'água discreta, dentro de um limite diário. Não vale para e-mail descartável nem em todas as regiões.` : 'A amostra grátis está pausada no momento.',
        `Depois, o Studio Ads está incluído em todo plano pago, a partir de ${f.starterPrice} por mês (USD). Um anúncio UGC usa ${f.ugcCredits.s15} créditos (15 s), ${f.ugcCredits.s20} (20 s) ou ${f.ugcCredits.s30} (30 s); o preço aparece antes de gerar.`,
        `Para comparar: ${f.creatorLinePt} Fonte: ${f.creatorSource}.`,
      ],
      notBestHeading: 'Quando o Kineo não é a melhor escolha',
      notBest: [
        'Se você precisa de um avatar com o SEU rosto ou um clone da sua voz, ferramentas de avatar personalizado servem melhor: aqui você escolhe entre apresentadores prontos.',
        'Se o vídeo é de treinamento interno ou comunicação de empresa sem produto, ferramentas de avatar corporativo são feitas para isso.',
        'Se o produto precisa aparecer funcionando (montagem, demonstração), grave um clipe real e use-o no Studio Ads junto com as fotos.',
      ],
      faqHeading: 'Perguntas frequentes',
      faqs: [
        { q: 'O que é um anúncio UGC?', a: 'UGC é "conteúdo gerado pelo usuário": vídeo com cara de celular, com uma pessoa falando direto para a câmera. Como anúncio, costuma parecer menos publicidade do que um comercial de estúdio. No Kineo a pessoa é um apresentador de IA.' },
        { q: 'A pessoa do anúncio é um cliente real?', a: 'Não. É um apresentador de IA, e o roteiro nunca fala como cliente. Por isso o anúncio não traz depoimento, nota nem resultado pessoal, e você deve ligar o rótulo de IA da plataforma ao postar.' },
        { q: 'Quanto custa um anúncio UGC com IA?', a: `${FREE_ON(f) ? `O primeiro é grátis (1 por conta, ${f.sampleSeconds} s, com marca-d'água). ` : ''}Nos planos pagos, um anúncio de 15 s usa ${f.ugcCredits.s15} créditos; 20 s, ${f.ugcCredits.s20}; 30 s, ${f.ugcCredits.s30}. Planos a partir de ${f.starterPrice} por mês.` },
        { q: 'Posso usar o anúncio comercialmente? De quem é o vídeo?', a: 'Sim. Os termos do Kineo permitem uso pessoal ou comercial e dizem que o vídeo gerado é seu. A amostra grátis sai com marca-d\'água; os planos pagos baixam sem ela. As fotos e as afirmações sobre o produto precisam ser suas ou autorizadas.' },
        { q: 'Em quais línguas o apresentador fala?', a: `O roteiro e a voz seguem a língua em que você escreve, entre as ${f.narrationLanguages} línguas de narração do Kineo. Já revisamos anúncios de apresentador em inglês e português; nas outras línguas, ouça antes de postar.` },
        { q: 'Qual o formato e a duração?', a: `Vertical 9:16 (Reels, TikTok, Stories, Shorts). A amostra grátis tem ${f.sampleSeconds} s; nos planos pagos você escolhe 15, 20 ou 30 s.` },
        { q: 'O Kineo posta ou gerencia meus anúncios?', a: 'Não. Você baixa o MP4 e publica ou impulsiona na sua conta. O Kineo não compra mídia nem promete vendas.' },
      ],
      relatedHeading: 'Páginas relacionadas',
      closingHeading: 'Faça o seu primeiro anúncio UGC',
      closingText: FREE_ON(f) ? 'Fotos do produto, uma frase e um apresentador. O primeiro sai grátis, com marca-d\'água.' : 'Fotos do produto, uma frase e um apresentador.',
      howToName: 'Como fazer um anúncio UGC com IA no Kineo',
      reviewed: 'Revisado em',
    }
  }
  return {
    title: 'AI UGC Ads: an AI Person Holds Your Product | Kineo',
    description: 'An AI presenter holds your real product and tells viewers why to buy it, in vertical ads made from your photos. First AI UGC ad free.',
    eyebrow: 'AI UGC Ads',
    h1: 'AI UGC Ads: an AI person holds your product and tells why to buy',
    lead: 'Upload your product photos and one sentence about the product. Kineo creates an AI presenter holding your product, writes a short presenter script and delivers a vertical ad with lip-synced voice, your photos, music and your logo at the end.',
    ctaFree: 'Make my first UGC ad free',
    ctaPaid: 'Make my UGC ad',
    ctaNote: FREE_ON(f) ? `1 free ad per account · ${f.sampleSeconds} s · small watermark${f.noCard ? ' · no card' : ''}` : 'Included in Studio Ads on paid plans.',
    videoCaption: 'Real Studio Ads output (October 17, 2026): an AI presenter holding a perfume. The voice is in Portuguese; it plays muted here.',
    summaryHeading: 'In short',
    summary: [
      'A UGC ad ("user-generated content") is the format that looks filmed on a phone by an ordinary person. On Kineo the person on screen is an AI presenter, never a real customer, and the ad is delivered with a reminder to label it as AI.',
      `You send ${f.minPhotos} to ${f.maxPhotos} real photos of the product and one sentence (or the product link). The presenter holds your product and says what it is, who it is for and why to buy it now, while your photos cut in between the lines.`,
      FREE_ON(f) ? `The first UGC ad is free (one per account, ${f.sampleSeconds} seconds, watermarked). After that, a 15-second ad uses ${f.ugcCredits.s15} credits from any paid plan.` : `A 15-second ad uses ${f.ugcCredits.s15} credits from any paid plan.`,
    ],
    stepsHeading: 'How it works, in 3 steps',
    steps: [
      { title: 'Show your product', body: `One sentence about the product (or your store link), your logo and ${f.minPhotos} to ${f.maxPhotos} real photos. The script uses only the facts you give it.` },
      { title: 'Pick the presenter', body: 'Choose one of the approved presenters or let Kineo choose. You see the plan and the script before anything is charged: planning is free.' },
      { title: 'Get your ad', body: 'The presenter speaks with a lip-synced voice, your photos cut in between the lines, music plays underneath and your logo closes the ad. Download the vertical MP4 and post it anywhere.' },
    ],
    facesHeading: 'The presenters you can choose',
    facesIntro: 'Each one has a face and a voice of their own, approved by our team after real test renders. Play the voice before you choose.',
    faceTag: { casual: 'Casual', beauty: 'Beauty', business: 'Business', fitness: 'Fitness', home: 'Home' },
    voiceLabel: 'Play the voice',
    examplesHeading: 'Real output',
    examplesIntro: 'Real Studio Ads and presenter-engine output. Nothing on this page is a mock-up.',
    examples: [
      { title: 'Presenter ad · perfume', caption: 'Real order from October 17, 2026, voice in Portuguese (muted here).' },
      { title: 'Sofia · engine clip', caption: 'A 4-second clip made by the presenter engine itself.' },
      { title: 'Amara · engine clip', caption: 'A 4-second clip made by the presenter engine itself.' },
    ],
    rulesHeading: 'What the presenter says (and never says)',
    rules: [
      'Talks TO the viewer: what the product is, the main benefit, who it is for and why to get it now.',
      'Never poses as a customer: no "I bought", "I use it", "my skin", and no before-and-after.',
      'Never asks viewers to smell, feel or close their eyes: on camera that reads as fake.',
      'Uses only the facts you gave: no invented ratings, customer counts or awards.',
      'TikTok, Meta and YouTube ask for realistic AI people to be labeled: turn on the platform’s AI label when you post.',
    ],
    nichesHeading: 'AI UGC ads by store niche',
    nichesIntro: 'Each niche page has its own angle, an example presenter script and the formats that work there.',
    costHeading: 'What it costs',
    cost: [
      FREE_ON(f) ? `Your first UGC ad is free: one per account, ${f.sampleSeconds} seconds, with a small watermark, within a daily limit. It is not available for disposable email addresses or in every region.` : 'The free sample is paused right now.',
      `After that, Studio Ads is included in every paid plan, from ${f.starterPrice} per month. A UGC ad uses ${f.ugcCredits.s15} credits (15 s), ${f.ugcCredits.s20} (20 s) or ${f.ugcCredits.s30} (30 s); the price is shown before you generate.`,
      `For comparison: ${f.creatorLine} Source: ${f.creatorSource}.`,
    ],
    notBestHeading: 'When Kineo is not the best choice',
    notBest: [
      'If you need an avatar with YOUR face or a clone of your voice, custom-avatar tools fit better: here you choose from ready-made presenters.',
      'If the video is internal training or company communication with no product, corporate avatar tools are built for that.',
      'If the product has to be shown working (assembly, a demo), film a real clip and use it in Studio Ads next to your photos.',
    ],
    faqHeading: 'Frequently asked questions',
    faqs: [
      { q: 'What is a UGC ad?', a: 'UGC means "user-generated content": a phone-style video with a person talking straight to the camera. As an ad it usually feels less like advertising than a studio commercial. On Kineo the person is an AI presenter.' },
      { q: 'Is the person in the ad a real customer?', a: 'No. It is an AI presenter, and the script never speaks as a customer. That is why the ad carries no testimonial, rating or personal result, and why you should turn on the platform’s AI label when you post.' },
      { q: 'How much does an AI UGC ad cost?', a: `${FREE_ON(f) ? `The first one is free (one per account, ${f.sampleSeconds} seconds, watermarked). ` : ''}On paid plans a 15-second ad uses ${f.ugcCredits.s15} credits, 20 seconds ${f.ugcCredits.s20} and 30 seconds ${f.ugcCredits.s30}. Plans start at ${f.starterPrice} per month.` },
      { q: 'Can I use the ad commercially? Who owns the video?', a: 'Yes. Kineo’s terms allow personal or commercial use and say you retain ownership of the videos you generate. The free sample carries a watermark; paid plans download without it. Your product photos and claims must be yours or authorized.' },
      { q: 'Which languages can the presenter speak?', a: `The script and the voice follow the language you write in, across Kineo’s ${f.narrationLanguages} narration languages. We have reviewed presenter ads in English and Portuguese; in other languages, listen before you post.` },
      { q: 'What format and length do I get?', a: `Vertical 9:16 for Reels, TikTok, Stories and Shorts. The free sample is ${f.sampleSeconds} seconds; on paid plans you choose 15, 20 or 30 seconds.` },
      { q: 'Does Kineo post or run my ads?', a: 'No. You download the MP4 and publish or boost it from your own account. Kineo does not buy media or promise sales.' },
    ],
    relatedHeading: 'Related pages',
    closingHeading: 'Make your first AI UGC ad',
    closingText: FREE_ON(f) ? 'Product photos, one sentence and a presenter. The first one is free, with a watermark.' : 'Product photos, one sentence and a presenter.',
    howToName: 'How to make an AI UGC ad on Kineo',
    reviewed: 'Reviewed',
  }
}

// ── /ai-ugc-video-generator (termo alternativo; texto próprio, curto, aponta para a pilar) ─────────────────────────────
export function ugcGeneratorCopy(f: UgcFacts) {
  return {
    title: 'AI UGC Video Generator: What It Makes | Kineo',
    description: 'What an AI UGC video generator actually produces, the three kinds on the market, and where Kineo’s product-in-hand presenter ads fit.',
    eyebrow: 'AI UGC video generator',
    h1: 'AI UGC video generator: what it makes, and which kind you need',
    answer: [
      'An AI UGC video generator makes a phone-style video in which a person (generated by AI) talks to the camera. Under that one name the market sells three different things, and picking the wrong one is the most common reason people are disappointed with the result.',
      `Kineo makes the second kind below: a presenter who holds YOUR real product. You give it ${f.minPhotos} to ${f.maxPhotos} photos and one sentence; it returns a vertical ad of 15 to 30 seconds with a lip-synced voice, your photos cut in, music and your logo.`,
    ],
    kindsHeading: 'The three kinds of AI UGC generator',
    kinds: [
      { name: 'Talking-head avatar', what: 'A person reads your script in front of a plain or stock background. Best for explainers, training and messages with no physical product.', kineo: 'Not Kineo’s focus.' },
      { name: 'Product-in-hand presenter ad', what: 'The generated person holds your actual product and presents it, with your product photos cut in. Built for e-commerce and paid social.', kineo: 'This is what Kineo makes.' },
      { name: 'Faceless UGC-style video', what: 'No person at all: narration over generated scenes or footage, cut like a creator video.', kineo: 'Kineo makes these as narrated films in the Studio.' },
    ],
    ioHeading: 'Inputs and outputs on Kineo',
    io: [
      { k: 'You provide', v: `One sentence or a product link, your logo, ${f.minPhotos}–${f.maxPhotos} product photos.` },
      { k: 'You choose', v: 'One of the approved AI presenters (or let Kineo pick), and 15, 20 or 30 seconds on paid plans.' },
      { k: 'You get', v: 'A vertical 9:16 MP4: presenter with lip-synced voice, your photos as cut-ins, music, logo end card.' },
      { k: 'Cost', v: FREE_ON(f) ? `First ad free (one per account, ${f.sampleSeconds} s, watermarked); then ${f.ugcCredits.s15} credits for 15 seconds.` : `${f.ugcCredits.s15} credits for 15 seconds on any paid plan.` },
    ],
    limitsHeading: 'Limits worth knowing before you start',
    limits: [
      'You cannot upload your own face or clone your own voice; you pick a ready-made presenter.',
      'Presenter ads are vertical 9:16 only.',
      'The presenter holds and shows products; it does not wear clothes, eat, or operate a device on camera.',
      'Small details (label text, engravings, ports) can drift in the generated shot, so review before posting.',
    ],
    faqs: [
      { q: 'Is an AI UGC video generator the same as an AI avatar tool?', a: 'Not quite. Avatar tools center on a talking head; a UGC ad generator like Kineo’s centers on your product in the presenter’s hand.' },
      { q: 'Do I need to film anything?', a: 'No. Product photos are enough. If you have a short clip of the product in use, Studio Ads can use it too.' },
      { q: 'Where is the full guide?', a: 'The AI UGC Ads page covers the steps, the presenters, real output, cost, rights and languages in detail.' },
    ],
    cta: FREE_ON(f) ? 'Make my first UGC ad free' : 'Make my UGC ad',
    pillarLink: 'Read the full AI UGC Ads guide',
  }
}

// ── Kit Black Friday (EN e PT) ─────────────────────────────────────────────────────────────────────────────────────
export function bfCopy(lang: UgcLang, f: UgcFacts) {
  const counts = f.kitCounts.filter((n) => n > 1)
  const per = f.minAdCredits15
  if (lang === 'pt') {
    return {
      title: 'Anúncios de Black Friday com IA: oferta + variações | Kineo',
      description: 'Kit Black Friday no Studio Ads: a sua oferta na tela e 3 ou 5 variações de roteiro por produto, a partir das suas fotos. Calendário até 27/11.',
      eyebrow: 'Kit Black Friday',
      h1: 'Anúncios de Black Friday com IA: a sua oferta na tela e 3 a 5 variações por produto',
      lead: 'Uma foto do produto e a oferta ("−30%", "Frete grátis"). O Studio Ads monta o anúncio com a oferta em selo no começo e grande no cartão final, a voz fala a oferta uma vez, e você gera 3 ou 5 versões com ângulos diferentes para testar.',
      cta: f.kitSale ? `Comprar o kit — ${f.kitSale.price}` : 'Abrir o Studio Ads',
      studioLink: f.kitSale ? 'Já assina? Abrir o Studio Ads' : null,
      ctaNote: f.kitSale ? `Pagamento único · ${f.kitSale.ads} anúncios com a sua oferta · Studio Ads aberto até ${f.kitSale.accessUntilPt} · à venda até ${f.kitSale.saleEndsPt}. No plano ${f.kitSale.includedPlan}, já está incluído.` : `O kit está no Studio Ads dos planos pagos (a partir de ${f.starterPrice}/mês, USD). Cada variação é cobrada como um anúncio.`,
      sampleLink: FREE_ON(f) ? 'Ainda sem plano? Faça antes 1 anúncio UGC grátis' : null,
      calendarHeading: 'O calendário que as marcas estão seguindo',
      calendar: [
        { date: 'até 31/10', what: 'Criativos prontos e revisados. Depois disso a fila de produção e a aprovação das plataformas apertam.' },
        { date: '1 a 7/11', what: 'Testes: 3 a 5 variações por produto, no mesmo público, para ver qual gancho ganha.' },
        { date: '15 a 21/11', what: 'Escala: verba nas vencedoras. Na semana da Black Friday, nada de criativo novo, só as que já provaram.' },
        { date: '27/11', what: 'Black Friday (EUA e Brasil). A Cyber Monday é em 30/11.' },
      ],
      calendarSource: 'Calendário dos guias de UGC para Black Friday (influee.co, 21/09/2026). A Neotrust projeta R$ 13,3 bi de venda online no Brasil de 26 a 29/11 (Central do Varejo, 2026).',
      kitHeading: 'O que o kit faz',
      kit: [
        { title: 'Oferta na tela', body: `Campo "Oferta" de até ${f.offerMax} caracteres: aparece como selo no gancho e grande no cartão final, entre o nome e o botão. A voz fala a oferta uma vez. Vazio = anúncio sem oferta.` },
        { title: `${counts.join(' ou ')} variações`, body: 'Mesmo produto, fotos e oferta; cada variação muda o ângulo do roteiro e a ordem das fotos. É o que os guias de Black Friday pedem: testar ganchos, não só um anúncio.' },
        { title: 'Ângulos prontos', body: 'Oferta falada, problema → solução, ideia de presente, por que escolhem e novidade. Nenhum ângulo inventa preço, prazo, nota ou depoimento.' },
      ],
      priceHeading: 'Quanto custa',
      price: [
        ...(f.kitSale ? [`Kit Black Friday: ${f.kitSale.price}, pagamento único, sem assinatura. Ele soma ${f.kitSale.credits} créditos, que pagam ${f.kitSale.ads} anúncios "close do produto real" com a sua oferta, a ${f.kitSale.perAd} créditos cada (ex.: 2 produtos × 5 variações), e abre o Studio Ads até ${f.kitSale.accessUntilPt}. À venda até ${f.kitSale.saleEndsPt}. Assinante ${f.kitSale.includedPlan}: os créditos do mês já cobrem o kit, nada a comprar.`] : []),
        `Cada variação é cobrada como um anúncio do nível que você escolher, a partir de ${per} créditos (15 s). ${counts.map((n) => `${n} variações: a partir de ${n * per} créditos`).join('; ')}. Sem desconto escondido nem cobrança extra pelo kit.`,
        `O Studio Ads está incluído em todo plano pago, a partir de ${f.starterPrice} por mês (USD). O total aparece antes de gerar.`,
        FREE_ON(f) ? `A amostra grátis (1 por conta) é um anúncio único, sem oferta e sem variações.` : 'A amostra grátis está pausada no momento.',
      ],
      limitsHeading: 'O que o kit ainda não faz',
      limits: [
        'Sai em vertical 9:16; a versão 4:5 para o feed ainda não existe no kit.',
        'Funciona no formato "close do produto real". O anúncio com apresentador de IA é feito um de cada vez, sem o selo de oferta.',
        'Não publica nem compra mídia: você baixa os vídeos e sobe nas suas campanhas.',
      ],
      faqs: [
        { q: 'Posso colocar a data limite da promoção?', a: `Sim, se couber nos ${f.offerMax} caracteres do campo Oferta (ex.: "Só até 27/11"). O roteiro aceita exatamente esse número ou prazo e nenhum outro.` },
        { q: 'As variações repetem o mesmo texto?', a: 'Não. Cada uma recebe um ângulo diferente e uma ordem diferente das fotos, a partir do mesmo produto e da mesma oferta.' },
        { q: 'Funciona para lojas brasileiras?', a: 'Sim. Escreva a frase em português e o anúncio sai narrado em português. A Black Friday no Brasil também é em 27/11.' },
      ],
      relatedHeading: 'Páginas relacionadas',
      closingHeading: 'Os criativos de Black Friday fecham em 31/10',
      closingText: 'Produto, oferta e 3 ou 5 variações para testar de 1 a 7/11.',
      reviewed: 'Revisado em',
    }
  }
  return {
    title: 'AI Black Friday Video Ads: Offer + 3–5 Variations | Kineo',
    description: 'Black Friday kit in Studio Ads: your offer on screen and 3 or 5 script variations per product, made from your photos. Calendar to November 27.',
    eyebrow: 'Black Friday kit',
    h1: 'AI Black Friday video ads: your offer on screen and 3 to 5 variations per product',
    lead: 'One product photo and your offer ("30% off", "Free shipping"). Studio Ads builds the ad with the offer as a badge on the hook and big on the final card, the voice says it once, and you generate 3 or 5 versions with different angles to test.',
    cta: f.kitSale ? `Buy the kit — ${f.kitSale.price}` : 'Open Studio Ads',
    studioLink: f.kitSale ? 'Already subscribed? Open Studio Ads' : null,
    ctaNote: f.kitSale ? `One-time payment · ${f.kitSale.ads} ads with your offer · Studio Ads open until ${f.kitSale.accessUntilEn} · on sale until ${f.kitSale.saleEndsEn}. Included in the ${f.kitSale.includedPlan} plan.` : `The kit lives in Studio Ads on paid plans (from ${f.starterPrice}/month). Each variation is billed as one ad.`,
    sampleLink: FREE_ON(f) ? 'No plan yet? Make one free AI UGC ad first' : null,
    calendarHeading: 'The calendar brands are working to',
    calendar: [
      { date: 'By Oct 31', what: 'Creatives finished and reviewed. After that, production queues and platform review times get tight.' },
      { date: 'Nov 1–7', what: 'Testing: 3 to 5 variations per product, same audience, to find the hook that wins.' },
      { date: 'Nov 15–21', what: 'Scale: budget goes to the winners. In Black Friday week, no new creatives, only proven ones.' },
      { date: 'Nov 27', what: 'Black Friday (US and Brazil). Cyber Monday is November 30.' },
    ],
    calendarSource: 'Calendar from Black Friday UGC ad guides (influee.co, September 21, 2026). Accounts that ran 2–3× more distinct ads saw lower CPM and CPA on Meta (voluum.com, October 12, 2026).',
    kitHeading: 'What the kit does',
    kit: [
      { title: 'Offer on screen', body: `An "Offer" field of up to ${f.offerMax} characters: it shows as a badge on the hook and big on the final card, between the name and the button. The voice says it once. Leave it empty for an ad with no offer.` },
      { title: `${counts.join(' or ')} variations`, body: 'Same product, photos and offer; each variation changes the script angle and the photo order. That is what Black Friday guides ask for: testing hooks, not betting on one ad.' },
      { title: 'Ready-made angles', body: 'Spoken offer, problem → solution, gift idea, why people choose it, and discovery. No angle invents a price, deadline, rating or testimonial.' },
    ],
    priceHeading: 'What it costs',
    price: [
      ...(f.kitSale ? [`Black Friday Kit: ${f.kitSale.price}, one-time, no subscription. It adds ${f.kitSale.credits} credits, which pay for ${f.kitSale.ads} "real product close-up" ads with your offer at ${f.kitSale.perAd} credits each (for example 2 products × 5 variations), and opens Studio Ads until ${f.kitSale.accessUntilEn}. On sale until ${f.kitSale.saleEndsEn}. On the ${f.kitSale.includedPlan} plan, your monthly credits already cover it: nothing to buy.`] : []),
      `Each variation is billed as one ad at the level you choose, from ${per} credits (15 s). ${counts.map((n) => `${n} variations: from ${n * per} credits`).join('; ')}. No hidden discount and no extra charge for the kit.`,
      `Studio Ads is included in every paid plan, from ${f.starterPrice} per month. The total is shown before you generate.`,
      FREE_ON(f) ? 'The free sample (one per account) is a single ad, with no offer and no variations.' : 'The free sample is paused right now.',
    ],
    limitsHeading: 'What the kit does not do yet',
    limits: [
      'It comes out vertical 9:16; a 4:5 feed version is not in the kit yet.',
      'It works in the "close-up of your real product" format. The AI presenter ad is made one at a time, without the offer badge.',
      'It does not publish or buy media: you download the videos and upload them to your campaigns.',
    ],
    faqs: [
      { q: 'Can I add the deadline of the sale?', a: `Yes, if it fits in the ${f.offerMax}-character Offer field (for example "Until Nov 27"). The script accepts exactly that number or date and no other.` },
      { q: 'Do the variations repeat the same text?', a: 'No. Each one gets a different angle and a different photo order, from the same product and the same offer.' },
      { q: 'When should I make my Black Friday ads?', a: 'Guides recommend finished creatives by October 31 and tests from November 1 to 7, so the winners are known before Black Friday week.' },
    ],
    relatedHeading: 'Related pages',
    closingHeading: 'Black Friday creatives close on October 31',
    closingText: 'Product, offer and 3 or 5 variations to test from November 1 to 7.',
    reviewed: 'Reviewed',
  }
}

/** Rótulo de cada nicho no /llms.txt e nos links (o `name` do nicho). */
export const ugcNicheLabel = (slug: UgcNicheSlug) => `AI UGC ads for ${UGC_NICHES[slug].name.toLowerCase()}`
