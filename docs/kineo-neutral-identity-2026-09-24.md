# Kineo: neutral identity across video markets

DECISÃO DO USUÁRIO, 24/09/2026: resume this design workstream and prepare a
complete remodeling, including a more neutral palette for the whole Kineo site,
so business video and ads sit alongside narrative Shorts. No schedules resumed.

IMPLEMENTADO: a reviewable prototype, not a global production theme change.
`public/design/neutral-20260924/index.html` compares Light, Graphite and Adaptive
across Home, Business, Studio Ads, Library, Examples and an identity guide.
Home and Business include read-only current-production before snapshots captured
anonymously on 24/09/2026, with JavaScript removed. No customer data is included.

SUGESTÃO: choose Light for the public/commercial identity. Background #F7F7F5,
panels #FFFFFF, text #181B20, secondary #606773, borders #DFE2E5 and signature
blue #2463EB. Primary buttons are graphite; brand, selection and keyboard focus
retain blue. Keep Manrope, the approved lightning glyph and large visual cards.
Remove atmospheric blue gradients as a requirement of the brand. Adaptive is
an alternative: public pages light, creation and library graphite.

FATO CONFIRMADO: the research does not establish a preferred ad-buyer color or
a conversion improvement. Official sites observed on 24/09/2026:
- https://www.synthesia.io/ — white base, dark text and restrained blue.
- https://www.heygen.com/ — white base, people/videos and cyan accents.
- https://runway.com/ — neutral frame around cinematic work.
- https://creatify.ai/ — strong colors despite its advertising focus.
- https://www.adobe.com/express/create/video/advertisement — light page and
  examples organized around practical needs.

SUGESTÃO: the transferable pattern is a clear deliverable, useful examples,
one obvious next step and verified proof. Present two creation paths early:
Studio Ads self-service vs. Express/Pro human-operated production. The draft
home copy broadens beyond Shorts; it remains explicitly proposed copy.

FATO CONFIRMADO, baseline c3201afc:
- `lib/growth/dfyOffer.ts` / `dfyServiceFacts.ts` own Express/Pro price, revisions,
  deadline and scope. The generator imports these facts; no new prices created.
- `lib/ads/offer.ts` owns the self-service pass, credits and access period.
- `/business-video-ads` already links to `/ads`. The proposal retains the two
  products' distinction. Existing auth, attribution and checkout code is untouched.
- Self-service does not currently include avatars, cloned voices, product
  placement into generated scenes, 15-second, square or landscape exports.

FATO CONFIRMADO: concept product photography generated with the built-in
image_gen tool, no external paid generation API. Output asset:
`public/design/neutral-20260924/product-concept.png`. Restaurant image is the
existing labeled concept. Narrative films use existing clean home preview media.
The mock library and brief form contain demonstration data only. Buttons never
charge, upload, publish or generate. Video buttons play existing public clips.

Final image prompt:
> Use case: product-mockup. Asset: a premium illustrative advertising photograph
> for an AI video platform website redesign, not an actual customer result.
> Create a single editorial commercial photo landscape 3:2. Three unbranded
> skincare objects, a pale frosted glass serum bottle with a soft charcoal
> dropper, a matte ivory cosmetic jar and its rounded lid, arranged sculpturally
> on a sunlit warm limestone plinth. A flowing translucent sand-colored fabric
> catches sunlight behind them, subtle terracotta curved architectural backdrop,
> crisp beautiful tactile shadows, slightly off-center product placement with
> enough breathing room for cropping vertically. Very refined authentic studio
> art direction, luxe cosmetic campaign, warm porcelain and sand palette with a
> tiny muted peach tone; no blue tech lights, no gradients as graphics. Realistic
> materials, clean glass reflections, photo-quality detail. No logos, no letters,
> no writing, no text, no watermark, no UI. Use natural photography rather than CGI.

SUGESTÃO — implementation sequence after choosing the visual direction:
1. Introduce semantic surface/text/action/focus/status tokens and temporary
   aliases for the old globals. Do not replace hex codes across the repository.
2. Business and `/ads`, including unavailable/full/review states; then home.
3. Dashboard shell, Sidebar/MobileNav as a pair, Studio, generation/result,
   Studio Ads and Library, including loading, error and empty states.
4. Examples, pricing, account, image/audio tools and acquisition pages.
5. Check keyboard focus, contrast and responsive layouts on each surface.
   Measure completed checkout and brief completion without treating visits or
   preview clicks as buyers.

FATO CONFIRMADO — implementation risks:
`app/globals.css`, home `.klp`, `components/studioKit.tsx`, Examples CSS Modules,
Studio/Library overrides and Pricing styles are separate systems. Global token
edits alone do not recolor them. The dashboard has decorative blue orbs, native
selects force dark color-scheme, and KineoBolt has an inline blue. Migrate those
explicitly. Do not recolor exported client media or `lib/ads/endCard.ts`.

Offline rebuild: `node scripts/preview-neutral-kineo-20260924.cjs`, using existing
dependencies only. Current-production snapshots are frozen captures, not rebuilt
by that generator. All proposal routes have noindex/nofollow.
