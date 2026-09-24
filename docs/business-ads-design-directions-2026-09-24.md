# Kineo Empresas — four visual directions

DECISÃO DO USUÁRIO, 24/09/2026: prepare three or four page proposals using
Kineo's existing palette. This deliverable contains four proposals, not a
replacement of the live product page.

FATO CONFIRMADO: the live page at `/business-video-ads` uses an off-white/green
palette (`app/business-video-ads/businessAds.module.css`). The proposal renderer
reads the actual approved page, BusinessAdsOffers and DFY_SERVICE_FACT. Package
pricing, terms, scope, FAQs, source labels and copy remain from those modules.
The only product text addition describes the conceptual image and process labels.

SUGESTÃO: 01 Cinema leads with an illustrative commercial scene and balanced
copy. 02 Galeria centers the headline above three crops of the same concept.
03 Studio uses production panels and a compact process strip. 04 Editorial uses
large type, thin rules, restrained surfaces and less blue. All use the approved
blue lightning mark, blue #2997ff, charcoal backgrounds and cool neutral text.

IMPLEMENTADO: four complete HTML pages, the original page, and an interactive
comparison with mobile and before/after controls under
`public/design/business-ads-20260924/`. All are noindex/nofollow. Checkouts are
intercepted with a preview notice; no analytics, authentication or paid calls
are executed by these static pages. Existing app routes were not edited.

FATO CONFIRMADO: the restaurant image is AI-generated creative direction, not
a delivered customer video. It is explicitly labeled on all proposals. Built-in
image_gen was used; no external paid generation API or fallback CLI was used.
Asset: `public/design/business-ads-20260924/restaurant-concept.png`.

Final image prompt:
> Create one premium photographic website asset, landscape 3:2 aspect ratio.
> A cinematic restaurant advertising still: a chef's hand placing a beautiful
> contemporary ceramic plate of appetizing food onto a dark walnut table in a
> sophisticated intimate restaurant, two adults softly out of focus in the mid
> background enjoying conversation, warm amber pendant light with restrained
> cool blue window fill, foreground plate sharp with real food textures and
> subtle steam, rich charcoal shadows, filmic contrast, believable live action,
> restrained luxury, not glossy artificial CGI. Composition works both as wide
> full bleed website hero and portrait crop: foreground plate slightly right
> of center, chef's arm enters from upper right, people visible in upper center
> at natural proportions. No logos, no brands, no letters, no UI, no watermarks.
> This is a conceptual campaign photograph to illustrate a proposed website
> design, not an actual client result.

Rebuild offline: set KINEO_PREVIEW_RUNTIME to an existing package.json with
React/TypeScript, then run `node scripts/preview-business-ads-directions.cjs`.
No installation, Next build or development server is required.
