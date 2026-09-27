// GPT24H G1 — descriptive examples, not customer cases or generated-video proof.
// Claude owns filling exampleVideoUrl with an approved public /v/ link.
export type AdsSegment = {
  slug: string
  name: string
  shortName: string
  description: string
  pains: readonly string[]
  materials: string
  brief: string
  caution: string
  exampleVideoUrl: string | null
}

export const ADS_SEGMENTS: readonly AdsSegment[] = [
  {
    slug: 'restaurants', name: 'restaurants', shortName: 'Restaurants',
    description: 'Turn your menu, food photos and restaurant website into a narrated video ad with captions, music and your contact details. Make it in Kineo Studio Ads.',
    pains: ['Your best dish deserves more than a still photo.', 'Menus change faster than you can plan a shoot.', 'People need to know where and when to visit.'],
    materials: 'Your logo, dish and dining-room photos, current menu, opening hours and booking link.',
    brief: 'Introduce our lunch menu using these food photos. End with our address and reservation link.',
    caution: 'Check menu details, prices, allergens and opening hours before rendering. Only use photos you have permission to publish.',
    exampleVideoUrl: null,
  },
  {
    slug: 'dentists-and-clinics', name: 'dentists and clinics', shortName: 'Dentists & clinics',
    description: 'Introduce your clinic with your own photos and verified details. Kineo Studio Ads adds a script, narration, captions, music and a contact card.',
    pains: ['A clinic introduction should feel clear, not technical.', 'Your team and space matter more than generic stock.', 'Qualifications and treatment claims need careful checking.'],
    materials: 'Your logo, authorized clinic and team photos, verified professional details and appointment contact.',
    brief: 'Introduce our clinic and show the reception and treatment rooms. Close with the appointment contact we supply.',
    caution: 'Do not include patient images without permission or invent qualifications, treatments, testimonials or results. Verify every clinical claim yourself.',
    exampleVideoUrl: null,
  },
  {
    slug: 'real-estate', name: 'real estate', shortName: 'Real estate',
    description: 'Make a narrated property video ad from listing photos and your verified brief. Add captions, music and a contact card with Kineo Studio Ads.',
    pains: ['Listing photos need a story buyers can follow.', 'Property details change while editing takes time.', 'The next step should be obvious: request a viewing.'],
    materials: 'Authorized property photos or clips, your logo, verified listing details and viewing contact.',
    brief: 'Show this property using the supplied room photos and verified listing details. End with our viewing contact.',
    caution: 'Confirm availability, price, dimensions and location. Do not invent amenities, renovation results or investment returns.',
    exampleVideoUrl: null,
  },
  {
    slug: 'gyms-and-studios', name: 'gyms and studios', shortName: 'Gyms & studios',
    description: 'Create a gym or studio video ad from your space, class photos and brief. Kineo adds narration, captions, music and a booking card.',
    pains: ['A class timetable does not show the atmosphere.', 'Filming a new promotion can interrupt a busy studio.', 'Newcomers want to know which class fits them.'],
    materials: 'Your logo, authorized class or space photos, current class details and booking link.',
    brief: 'Introduce our beginner-friendly classes with the supplied studio photos. End with the booking link.',
    caution: 'Use images with permission and verify class availability. Do not promise weight loss, medical benefits or guaranteed fitness outcomes.',
    exampleVideoUrl: null,
  },
  {
    slug: 'salons-and-beauty', name: 'salons and beauty businesses', shortName: 'Salons & beauty',
    description: 'Show your salon, services and authorized work photos in a narrated video ad. Add captions, music and appointment details with Kineo Studio Ads.',
    pains: ['Your portfolio is scattered across individual photos.', 'A service menu needs a simple explanation.', 'Viewers need a clear route to book.'],
    materials: 'Your logo, salon and authorized work photos, current service details and booking contact.',
    brief: 'Introduce our salon using these space and work photos. Explain the supplied services and end with our booking contact.',
    caution: 'Get permission for client images. Keep results and service claims accurate; do not invent before-and-after transformations.',
    exampleVideoUrl: null,
  },
  {
    slug: 'online-stores', name: 'online stores', shortName: 'Online stores',
    description: 'Turn product photos, a store link and your brief into a narrated video ad. Kineo Studio Ads adds captions, music and a final shopping card.',
    pains: ['Product photos need context, not another slideshow.', 'A campaign needs one clear reason to click.', 'Stock, shipping and offer details must stay accurate.'],
    materials: 'Your store link, logo, product photos or clips, verified product details and destination link.',
    brief: 'Introduce this product using our own photos and the supplied features. End with the product page link.',
    caution: 'Verify availability, price, shipping and product claims. This uses your assets; it does not create an actor demonstrating your product.',
    exampleVideoUrl: null,
  },
  {
    slug: 'local-services', name: 'local services', shortName: 'Local services',
    description: 'Make a video ad for electrical, plumbing or cleaning services using your own photos and facts. Add narration, captions and a contact card in Kineo.',
    pains: ['It is hard to explain a practical service in a static post.', 'Trust depends on real work, not invented testimonials.', 'People need to know your service area and how to contact you.'],
    materials: 'Your logo, authorized work photos, verified services, service area and enquiry contact.',
    brief: 'Explain our local service using the supplied work photos. Mention our verified service area and end with our enquiry contact.',
    caution: 'Check certifications, service area and availability. Do not invent customer reviews or promise emergency response times you cannot meet.',
    exampleVideoUrl: null,
  },
  {
    slug: 'courses-and-events', name: 'courses and events', shortName: 'Courses & events',
    description: 'Introduce a course or event with your own materials and verified dates. Kineo Studio Ads adds a script, narration, captions and a registration card.',
    pains: ['An event flyer has more detail than a viewer can absorb.', 'The audience needs to know who the event is for.', 'Dates, places and registration links must be easy to find.'],
    materials: 'Your logo, authorized venue or course photos, verified schedule and registration link.',
    brief: 'Introduce this event and who it is for, using the supplied details and photos. End with the registration link.',
    caution: 'Verify dates, speakers and registration details. Do not invent attendance figures, qualifications or limited availability.',
    exampleVideoUrl: null,
  },
]

export const ADS_SEGMENT_SLUGS = ADS_SEGMENTS.map(({ slug }) => slug)
export const ADS_SEGMENTS_UPDATED = '2026-09-27'
export const adsSegmentPath = (slug: string) => `/ads/for/${slug}`
export const adsSegmentPoster = (slug: string) => `/og/ads-for-${slug}.png`
export const adsSegmentCta = (slug: string) => `/ads?utm_source=seo&utm_medium=ads_for&utm_campaign=gpt24h&utm_content=${encodeURIComponent(slug)}`
export const findAdsSegment = (slug: string) => ADS_SEGMENTS.find((segment) => segment.slug === slug)

// /v/ is a public watch PAGE, not an MP4 source. Never feed it to <video src>.
export function approvedSegmentExample(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value, 'https://www.usekineo.com')
    return url.origin === 'https://www.usekineo.com' && /^\/v\/[a-zA-Z0-9_-]+$/.test(url.pathname)
      && !url.search && !url.hash ? url.pathname : null
  } catch { return null }
}
